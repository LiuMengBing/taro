/* eslint-disable camelcase */
import { parse as parseFile } from '@babel/parser'
import traverse, { NodePath, Visitor } from '@babel/traverse'
import * as t from '@babel/types'
import {
  printLog,
  processTypeEnum
} from '@tarojs/helper'
import { parse } from 'himalaya-wxml'
import { camelCase, cloneDeep } from 'lodash'

import { getCacheWxml, saveCacheWxml } from './cache'
import { reserveKeyWords } from './constant'
import { specialEvents } from './events'
import { errors, globals, THIRD_PARTY_COMPONENTS, usedComponents } from './global'
import { parseModule, parseTemplate } from './template'
import { buildBlockElement, buildImportStatement, buildTemplate, codeFrameError, DEFAULT_Component_SET, isValidVarName, parseCode } from './utils'

const { prettyPrint } = require('html')

const allCamelCase = (str: string) =>
  str.charAt(0).toUpperCase() + camelCase(str.substr(1))

function buildSlotName (slotName: string) {
  return `render${slotName[0].toUpperCase() + slotName.replace('-', '').slice(1)}`
}

export enum NodeType {
  Element = 'element',
  Comment = 'comment',
  Text = 'text'
}

export interface Element {
  type: NodeType.Element
  tagName: string
  children: AllKindNode[]
  attributes: Attribute[]
}

export interface Attribute {
  key: string
  value: string | null
}

export interface Comment {
  type: NodeType.Comment
  content: string
}

export interface Text {
  type: NodeType.Text
  content: string
}

export interface WXS {
  module: string
  src: string
}

export type AllKindNode = Element | Comment | Text
export type Node = Element | Text
interface Condition {
  condition: string
  path: NodePath<t.JSXElement>
  tester: t.JSXExpressionContainer
}

export type AttrValue =
  | t.StringLiteral
  | t.JSXElement
  | t.JSXExpressionContainer
  | null

export interface Imports {
  ast: t.File
  name: string
  wxs?: boolean
}

export interface Wxml {
  wxses: WXS[]
  wxml?: t.Node
  imports: Imports[]
  refIds: Set<string>
}

export const WX_IF = 'wx:if'
export const WX_ELSE_IF = 'wx:elif'
export const WX_FOR = 'wx:for'
export const WX_FOR_ITEM = 'wx:for-item'
export const WX_FOR_INDEX = 'wx:for-index'
export const WX_KEY = 'wx:key'
export const WX_ELSE = 'wx:else'
export const WX_SHOW = 'wx:show'

export const wxTemplateCommand = [
  WX_IF,
  WX_ELSE_IF,
  WX_FOR,
  WX_FOR_ITEM,
  WX_FOR_INDEX,
  WX_KEY,
  'wx:else'
]

function buildElement (
  name: string,
  children: Node[] = [],
  attributes: Attribute[] = []
): Element {
  return {
    tagName: name,
    type: NodeType.Element,
    attributes,
    children
  }
}

export const createWxmlVistor = (
  loopIds: Set<string>,
  refIds: Set<string>,
  dirPath: string,
  wxses: WXS[] = [],
  imports: Imports[] = []
) => {
  const jsxAttrVisitor = (path: NodePath<t.JSXAttribute>) => {
    const name = path.node.name as t.JSXIdentifier
    const jsx = path.findParent(p => p.isJSXElement()) as NodePath<
    t.JSXElement
    >

    // 把 hidden 转换为 wxif
    if (name.name === 'hidden') {
      const value = path.get('value') as NodePath<t.JSXExpressionContainer>
      if (t.isJSXExpressionContainer(value) && !t.isJSXEmptyExpression(value.node.expression)) {
        const exclamation = t.unaryExpression('!', value.node.expression)
        path.set('value', t.jSXExpressionContainer(exclamation))
        path.set('name', t.jSXIdentifier(WX_IF))
      }
    }

    const valueCopy = cloneDeep(path.get('value').node) 
    
    if (typeof valueCopy === 'undefined' || t.isJSXFragment(valueCopy)) {
      return
    }

    transformIf(name.name, path, jsx, valueCopy)
    const loopItem = transformLoop(name.name, path, jsx, valueCopy)
    if (loopItem) {
      if (loopItem.index && !refIds.has(loopItem.index)) {
        loopIds.add(loopItem.index)
      }
      if (loopItem.item && !refIds.has(loopItem.item)) {
        loopIds.add(loopItem.item)
      }
    }
  }

  const renameJSXKey = (path: NodePath<t.JSXIdentifier>) => {
    const nodeName = path.node.name
    if (path.parentPath.isJSXAttribute()) {
      if (nodeName === WX_KEY) {
        path.replaceWith(t.jSXIdentifier('key'))
      }
      if (nodeName === WX_SHOW) {
        path.replaceWith(t.jSXIdentifier(WX_IF)) // wx:show转换后不支持，不频繁切换的话wx:if可替代
        // eslint-disable-next-line no-console
        console.log(`属性  ${nodeName}不能编译,会被替换为wx:if`)
      }
      else if (nodeName.startsWith('wx:') && !wxTemplateCommand.includes(nodeName)) {
        // eslint-disable-next-line no-console
        console.log(`未知 wx 作用域属性： ${nodeName}，该属性会被移除掉。`)
        path.parentPath.remove()
      }
    }
  }

  return {
    JSXAttribute: jsxAttrVisitor,
    JSXIdentifier: renameJSXKey,
    JSXElement: {
      enter (path: NodePath<t.JSXElement>) {
        const openingElement = path.get('openingElement')
        const jsxName = openingElement.get('name')
        const attrs = openingElement.get('attributes')
        if (!jsxName.isJSXIdentifier()) {
          return
        }
        path.traverse({
          Identifier (p) {
            if (!p.isReferencedIdentifier()) {
              return
            }
            const jsxExprContainer = p.findParent(p => p.isJSXExpressionContainer())
            if (!jsxExprContainer || !jsxExprContainer.isJSXExpressionContainer()) {
              return
            }
            if (isValidVarName(p.node.name)) {
              refIds.add(p.node.name)
            }
          },
          JSXAttribute: jsxAttrVisitor,
          JSXIdentifier: renameJSXKey
        })
        const slotAttr = attrs.find(a => t.isJSXAttribute(a.node) && a.node?.name.name === 'slot')
        if (slotAttr && t.isJSXAttribute(slotAttr.node)) {
          const slotValue = slotAttr.node.value
          let slotName = ''
          if (slotValue && t.isStringLiteral(slotValue)) {
            slotName = slotValue.value
          } else {
            slotName = 'taroslot'
          }
          const parentComponent = path.findParent(p => p.isJSXElement() && t.isJSXIdentifier(p.node.openingElement.name) && !DEFAULT_Component_SET.has(p.node.openingElement.name.name))
          if (parentComponent && parentComponent.isJSXElement()) {
            slotAttr.remove()
            path.traverse({
              JSXAttribute: jsxAttrVisitor
            })
            const block = buildBlockElement()
            block.children = [cloneDeep(path.node)]
            parentComponent.node.openingElement.attributes.push(
              t.jSXAttribute(
                t.jSXIdentifier(buildSlotName(slotName)),
                t.jSXExpressionContainer(block)
              )
            )
            path.remove()
          }
          /* } else {
            throw codeFrameError(slotValue, 'slot 的值必须是一个字符串')
          } */
        }
        const tagName = jsxName.node.name
        if (tagName === 'Slot') {
          const nameAttr = attrs.find(a =>  t.isJSXAttribute(a.node) && a.node.name.name === 'name')
          let slotName = ''
          if (nameAttr && t.isJSXAttribute(nameAttr.node)) {
            if (nameAttr.node.value && t.isStringLiteral(nameAttr.node.value)) {
              slotName = nameAttr.node.value.value
            } else {
              throw codeFrameError(jsxName.node, 'slot 的值必须是一个字符串')
            }
          }
          const children = t.memberExpression(
            t.memberExpression(t.thisExpression(), t.identifier('props')),
            t.identifier(slotName ? buildSlotName(slotName) : 'children')
          )
          try {
            path.replaceWith(path.parentPath.isJSXElement() ? t.jSXExpressionContainer(children) : children)
          } catch (error) {
            //
          }
        }
        if (tagName === 'Wxs') {
          wxses.push(getWXS(attrs.map(a => a.node as t.JSXAttribute), path, imports))
        }
        if (tagName === 'Template') {
          // path.traverse({
          //   JSXAttribute: jsxAttrVisitor
          // })
          const template = parseTemplate(path, dirPath)
          if (template) {
            const { ast: classDecl, name } = template
            const taroComponentsImport = buildImportStatement('@tarojs/components', [
              ...usedComponents
            ])
            const taroImport = buildImportStatement('@tarojs/taro', [], 'Taro')
            const reactImport = buildImportStatement('react', [], 'React')
            // const withWeappImport = buildImportStatement(
            //   '@tarojs/with-weapp',
            //   [],
            //   'withWeapp'
            // )
            const ast = t.file(t.program([]))
            ast.program.body.unshift(
              taroComponentsImport,
              reactImport,
              taroImport,
              // withWeappImport,
              t.exportDefaultDeclaration(classDecl)
            )
            const usedTemplate = new Set<string>()

            traverse(ast, {
              JSXIdentifier (path) {
                const node = path.node
                if (node.name.endsWith('Tmpl') && node.name.length > 4 && path.parentPath.isJSXOpeningElement()) {
                  usedTemplate.add(node.name)
                }
              }
            })
            usedTemplate.forEach(componentName => {
              if (componentName !== classDecl.id.name) {
                ast.program.body.unshift(
                  buildImportStatement(`./${componentName}`, [], componentName)
                )
              }
            })
            imports.push({
              ast,
              name
            })
          }
        }
        if (tagName === 'Import') {
          const mods = parseModule(path, dirPath, 'import')
          if (mods) {
            imports.push(...mods)
          }
        }
        if (tagName === 'Include') {
          parseModule(path, dirPath, 'include')
        }
      },
      exit (path: NodePath<t.JSXElement>) {
        const openingElement = path.get('openingElement')
        const jsxName = openingElement.get('name')
        if (!jsxName.isJSXIdentifier({ name: 'Block' })) {
          return
        }
        const children = path.node.children
        if (children.length === 1) {
          const caller = children[0]
          if (t.isJSXExpressionContainer(caller) && t.isCallExpression(caller.expression) && !path.parentPath.isExpressionStatement()) {
            try {
              path.replaceWith(caller)
            } catch (error) {
              //
            }
          }
        }
      }
    }
  } as Visitor
}

export function parseWXML (dirPath: string, wxml?: string, parseImport?: boolean): Wxml {
  let parseResult = getCacheWxml(dirPath)
  if (parseResult) {
    return parseResult
  }
  try {
    wxml = prettyPrint(wxml, {
      max_char: 0,
      indent_char: 0,
      unformatted: ['text', 'wxs']
    })
  } catch (error) {
    //
  }
  if (!parseImport) {
    errors.length = 0
    usedComponents.clear()
  }
  usedComponents.add('Block')
  const wxses: WXS[] = []
  const imports: Imports[] = []
  const refIds = new Set<string>()
  const loopIds = new Set<string>()
  if (!wxml) {
    return {
      wxses,
      imports,
      refIds,
      wxml: t.nullLiteral()
    }
  }
  const nodes = removEmptyTextAndComment(parse(wxml.trim()))
  const ast = t.file(
    t.program(
      [
        t.expressionStatement(parseNode(
          buildElement('block', nodes as Node[])
        ) as t.Expression)
      ],
      []
    )
  )

  traverse(ast, createWxmlVistor(loopIds, refIds, dirPath, wxses, imports))

  refIds.forEach(id => {
    if (loopIds.has(id) || imports.filter(i => i.wxs).map(i => i.name).includes(id)) {
      refIds.delete(id)
    }
  })
  parseResult = {
    wxses,
    imports,
    wxml: hydrate(ast),
    refIds
  }
  saveCacheWxml(dirPath, parseResult)
  return parseResult
}

function getWXS (attrs: t.JSXAttribute[], path: NodePath<t.JSXElement>, imports: Imports[]): WXS {
  let moduleName: string | null = null
  let src: string | null = null

  for (const attr of attrs) {
    if (t.isJSXIdentifier(attr.name)) {
      const attrName = attr.name.name
      const attrValue = attr.value
      let value: string | null = null
      if (attrValue === null) {
        throw new Error('WXS 标签的属性值不得为空')
      }
      if (t.isStringLiteral(attrValue)) {
        value = attrValue.value
      } else if (
        t.isJSXExpressionContainer(attrValue) &&
        t.isStringLiteral(attrValue.expression)
      ) {
        value = attrValue.expression.value
      }
      if (attrName === 'module') {
        moduleName = value
      }
      if (attrName === 'src') {
        src = value
      }
    }
  }

  if (!src) {
    const { children: [script] } = path.node
    if (!t.isJSXText(script)) {
      throw new Error('wxs 如果没有 src 属性，标签内部必须有 wxs 代码。')
    }
    src = './wxs__' + moduleName
    const ast = parseCode(script.value)
    traverse(ast, {
      CallExpression (path) {
        // wxs标签中getRegExp转换为new RegExp
        if (t.isIdentifier(path.node.callee, { name: 'getRegExp' })) {
          const arg = path.node.arguments[0]
          if (t.isStringLiteral(arg)) {
            const regex = arg.extra?.raw as string
            const regexWithoutQuotes = regex.replace(/^'(.*)'$/, '$1')
            const newExpr = t.newExpression(t.identifier('RegExp'), [t.stringLiteral(regexWithoutQuotes), t.stringLiteral('g')])
            path.replaceWith(newExpr)
          }
        }
      }
    })
    imports.push({
      ast,
      name: moduleName as string,
      wxs: true
    })
  }

  if (!moduleName || !src) {
    throw new Error('一个 WXS 需要同时存在两个属性：`wxs`, `src`')
  }

  path.remove()

  return {
    module: moduleName,
    src
  }
}

function hydrate (file: t.File) {
  const ast = file.program.body[0]
  if (ast && t.isExpressionStatement(ast) && t.isJSXElement(ast.expression)) {
    const jsx = ast.expression
    if (jsx.children.length === 1) {
      const children = jsx.children[0]
      return t.isJSXExpressionContainer(children)
        ? children.expression
        : children
    } else {
      return jsx
    }
  }
}

function transformLoop (
  name: string,
  attr: NodePath<t.JSXAttribute>,
  jsx: NodePath<t.JSXElement>,
  value: AttrValue
) {
  const jsxElement = jsx.get('openingElement')
  if (!jsxElement.node) {
    return
  }
  const attrs = jsxElement.get('attributes').map(a => a.node)
  const wxForItem = attrs.find(a => t.isJSXAttribute(a) && a.name.name === WX_FOR_ITEM)
  const hasSinglewxForItem = wxForItem && t.isJSXAttribute(wxForItem) && wxForItem.value && t.isJSXExpressionContainer(wxForItem.value)
  if (hasSinglewxForItem || name === WX_FOR || name === 'wx:for-items') {
    if (!value || !t.isJSXExpressionContainer(value)) {
      throw new Error('wx:for 的值必须使用 "{{}}"  包裹')
    }
    attr.remove()
    let item = t.stringLiteral('item')
    let index = t.stringLiteral('index')
    jsx
      .get('openingElement')
      .get('attributes')
      .forEach(p => {
        const node = p.node as t.JSXAttribute
        if (node.name.name === WX_FOR_ITEM) {
          if (!node.value || !t.isStringLiteral(node.value)) {
            throw new Error(WX_FOR_ITEM + ' 的值必须是一个字符串')
          }
          item = node.value
          p.remove()
        }
        if (node.name.name === WX_FOR_INDEX) {
          if (!node.value || !t.isStringLiteral(node.value)) {
            throw new Error(WX_FOR_INDEX + ' 的值必须是一个字符串')
          }
          index = node.value
          p.remove()
        }
      })

    jsx
      .get('openingElement')
      .get('attributes')
      .forEach(p => {
        const node = p.node as t.JSXAttribute
        if (node.name.name === WX_KEY && t.isStringLiteral(node.value)) {
          if (node.value.value === '*this') {
            node.value = t.jSXExpressionContainer(t.identifier(item.value))
          } else {
            node.value = t.jSXExpressionContainer(t.memberExpression(t.identifier(item.value), t.identifier(node.value.value)))
          }
        }
      })

    if (t.isJSXEmptyExpression(value.expression)) {
      printLog(processTypeEnum.WARNING, 'value.expression', 'wxml.ts -> t.isJSXEmptyExpression(value.expression)')
      return
    }
    const replacement = t.jSXExpressionContainer(
      t.callExpression(
        t.memberExpression(value.expression, t.identifier('map')),
        [
          t.arrowFunctionExpression(
            [t.identifier(item.value), t.identifier(index.value)],
            t.blockStatement([t.returnStatement(jsx.node)])
          )
        ]
      )
    )

    const block = buildBlockElement()
    block.children = [replacement]
    try {
      jsx.replaceWith(block)
    } catch (error) {
      //
    }

    return {
      item: item.value,
      index: index.value
    }
  }
}

function transformIf (
  name: string,
  attr: NodePath<t.JSXAttribute>,
  jsx: NodePath<t.JSXElement>,
  value: AttrValue
) {
  if (name !== WX_IF) {
    return
  }
  if (jsx.node.openingElement.attributes.some(a => t.isJSXAttribute(a) && a.name.name === 'slot')) {
    return
  }
  const conditions: Condition[] = []
  let siblings: NodePath<t.Node>[] = []
  try {
    siblings = jsx.getAllNextSiblings().filter(s => !(s.isJSXExpressionContainer() && t.isJSXEmptyExpression(s.get('expression')))) as any
  } catch (error) {
    return
  }
  if (value === null || !t.isJSXExpressionContainer(value)) {
    console.error('wx:if 的值需要用双括号 `{{}}` 包裹它的值')
    if (value && t.isStringLiteral(value)) {
      value = t.jSXExpressionContainer(buildTemplate(value.value))
    }
  }
  conditions.push({
    condition: WX_IF,
    path: jsx,
    tester: value as t.JSXExpressionContainer
  })
  attr.remove()
  for (let index = 0; index < siblings.length; index++) {
    const sibling = siblings[index] as NodePath<t.JSXElement>
    const next = cloneDeep(siblings[index + 1]) as NodePath<t.JSXElement>
    const currMatches = findWXIfProps(sibling) 
    const nextMatches = findWXIfProps(next)
    if (currMatches === null) {
      break
    }
    conditions.push({
      condition: currMatches.reg.input as string,
      path: sibling as any,
      tester: currMatches.tester as t.JSXExpressionContainer
    })
    if (nextMatches === null) {
      break
    }
  }
  handleConditions(conditions)
}

function handleConditions (conditions: Condition[]) {
  if (conditions.length === 1) {
    const ct = conditions[0]
    if (!t.isJSXEmptyExpression(ct.tester.expression)) {
      try {
        ct.path.replaceWith(
          t.jSXExpressionContainer(
            t.logicalExpression('&&', ct.tester.expression, cloneDeep(ct.path.node))
          )
        )
      } catch (error) {
        //
      }
    }
  }
  if (conditions.length > 1) {
    const lastLength = conditions.length - 1
    const lastCon = conditions[lastLength]
    let lastAlternate: t.Expression = cloneDeep(lastCon.path.node)
    try {
      if (lastCon.condition === WX_ELSE_IF && !t.isJSXEmptyExpression(lastCon.tester.expression)) {
        lastAlternate = t.logicalExpression(
          '&&',
          lastCon.tester.expression,
          lastAlternate
        )
      }
      const node = conditions
        .slice(0, lastLength)
        .reduceRight((acc: t.Expression, condition) => {
          if (t.isJSXEmptyExpression(condition.tester.expression)) {
            printLog(processTypeEnum.WARNING, 'condition.tester.expression', 't.isJSXEmptyExpression(condition.tester.expression)')
            return null
          }
          return t.conditionalExpression(
            condition.tester.expression,
            cloneDeep(condition.path.node),
            acc
          )
        }, lastAlternate)
      if (node != null) {
        conditions[0].path.replaceWith(t.jSXExpressionContainer(node))
        conditions.slice(1).forEach(c => c.path.remove())
      }
    } catch (error) {
      console.error('wx:elif 的值需要用双括号 `{{}}` 包裹它的值')
    }
  }
}

function findWXIfProps (
  jsx: NodePath<t.JSXElement>
): { reg: RegExpMatchArray, tester: AttrValue } | null {
  let matches: { reg: RegExpMatchArray, tester: AttrValue } | null = null
  jsx &&
    jsx.isJSXElement() &&
    jsx
      .get('openingElement')
      .get('attributes')
      .some(path => {
        const attr = path.node as any
        if (t.isJSXIdentifier(attr.name) && attr != null) {
          const name = attr.name.name
          if (name === WX_IF) {
            return true
          }
          const match = name.match(/wx:else|wx:elif/)
          if (match) {
            path.remove()
            matches = {
              reg: match,
              tester: attr.value
            }
            return true
          }
        }
        return false
      })

  return matches
}

function parseNode (node: AllKindNode, tagName?: string) {
  if (node.type === NodeType.Text) {
    return parseText(node, tagName)
  } else if (node.type === NodeType.Comment) {
    const emptyStatement = t.jSXEmptyExpression()
    emptyStatement.innerComments = [{
      type: 'CommentBlock',
      value: ' ' + node.content + ' '
    }] as any[]
    return t.jSXExpressionContainer(emptyStatement)
  }
  return parseElement(node)
}

function parseElement (element: Element): t.JSXElement {
  const tagName = t.jSXIdentifier(THIRD_PARTY_COMPONENTS.has(element.tagName) ? element.tagName : allCamelCase(element.tagName))
  if (DEFAULT_Component_SET.has(tagName.name)) {
    usedComponents.add(tagName.name)
  }
  let attributes = element.attributes
  if (tagName.name === 'Template') {
    let isSpread = false
    attributes = attributes.map(attr => {
      if (attr.key === 'data') {
        const value = attr.value || ''
        const content = parseContent(value)
        if (content.type === 'expression') {
          isSpread = true
          const str = content.content
          const strLastIndex = str.length - 1
          if (str.includes('...') && str.includes(',')) {
            attr.value = `{{${str.slice(1, strLastIndex)}}}`
          } else {
            if (str.includes('...')) {
              // (...a) => {{a}}
              attr.value = `{{${str.slice(4, strLastIndex)}}}`
            } else if (/^\(([A-Za-z]+)\)$/.test(str)) {
              // (a) => {{a:a}}
              attr.value = `{{${str.replace(/^\(([A-Za-z]+)\)$/, '$1:$1')}}}`
            } else {
              // (a:'a') => {{a:'a'}}
              attr.value = `{{${str.slice(1, strLastIndex)}}}`
            }
          }
        } else {
          attr.value = content.content
        }
      }
      return attr
    })
    if (isSpread) {
      attributes.push({
        key: 'spread',
        value: null
      })
    }
  }
  return t.jSXElement(
    t.jSXOpeningElement(tagName, attributes.map(parseAttribute)),
    t.jSXClosingElement(tagName),
    removEmptyTextAndComment(element.children).map((el) => parseNode(el, element.tagName)),
    false
  )
}

export function removEmptyTextAndComment (nodes: AllKindNode[]) {
  return nodes.filter(node => {
    return node.type === NodeType.Element ||
      (node.type === NodeType.Text && node.content.trim().length !== 0) ||
      node.type === NodeType.Comment
  }).filter((node, index) => !(index === 0 && node.type === NodeType.Comment))
}

function parseText (node: Text, tagName?: string) {
  if (tagName === 'wxs') {
    return t.jSXText(node.content)
  }
  const { type, content } = parseContent(node.content)
  if (type === 'raw') {
    const text = content.replace(/([{}]+)/g, "{'$1'}")
    return t.jSXText(text)
  }
  return t.jSXExpressionContainer(buildTemplate(content))
}

// 匹配{{content}}
const handlebarsRE = /\{\{((?:.|\n)+?)\}\}/g

function singleQuote (s: string) {
  return `'${s}'`
}

export function parseContent (content: string, single = false): { type: 'raw' | 'expression', content: string } {
  content = content.trim()
  if (!handlebarsRE.test(content)) {
    return {
      type: 'raw',
      content
    }
  }
  const tokens: string[] = []
  let lastIndex = (handlebarsRE.lastIndex = 0)
  let match
  let index
  let tokenValue
  while ((match = handlebarsRE.exec(content))) {
    index = match.index
    // push text token
    if (index > lastIndex) {
      tokenValue = content.slice(lastIndex, index)
      tokens.push(single ? singleQuote(tokenValue) : JSON.stringify(tokenValue))
    }
    // tag token
    const exp = match[1].trim()
    tokens.push(`(${exp})`)
    lastIndex = index + match[0].length
  }
  if (lastIndex < content.length) {
    tokenValue = content.slice(lastIndex)
    tokens.push(single ? singleQuote(tokenValue) : JSON.stringify(tokenValue))
  }
  return {
    type: 'expression',
    content: tokens.join('+')
  }
}

function parseAttribute (attr: Attribute) {
  let { key, value } = attr
  let jsxValue: null | t.JSXExpressionContainer | t.StringLiteral = null
  if (value) {
    if (key === 'class' && value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, value.length - 1).replace(',', '')
      // eslint-disable-next-line no-console
      console.log(codeFrameError(attr, 'Taro/React 不支持 class 传入数组，此写法可能无法得到正确的 class'))
    }
    const { type, content } = parseContent(value)

    if (type === 'raw') {
      jsxValue = t.stringLiteral(content.replace(/"/g, '\''))
    } else {
      let expr: t.Expression
      try {
        expr = buildTemplate(content)
      } catch (error) {
        const pureContent = content.slice(1, content.length - 1)
        if (reserveKeyWords.has(pureContent)) {
          const err = `转换模板参数： \`${key}: ${value}\` 报错: \`${pureContent}\` 是 JavaScript 保留字，请不要使用它作为值。`
          if (key === WX_KEY) {
            expr = t.stringLiteral('')
          } else {
            throw new Error(err)
          }
        } else if (content.includes(':') || (content.includes('...') && content.includes(','))) {
          const file = parseFile(`var a = ${attr.value!.slice(1, attr.value!.length - 1)}`, { plugins: ['objectRestSpread'] })
          expr = (file.program.body[0] as any).declarations[0].init
        } else {
          const err = `转换模板参数： \`${key}: ${value}\` 报错`
          throw new Error(err)
        }
      }
      if (t.isThisExpression(expr)) {
        console.error('在参数中使用 `this` 可能会造成意想不到的结果，已将此参数修改为 `__placeholder__`，你可以在转换后的代码查找这个关键字修改。')
        expr = t.stringLiteral('__placeholder__')
      }
      jsxValue = t.jSXExpressionContainer(expr)
    }
  }

  const jsxKey = handleAttrKey(key)
  if (/^on[A-Z]/.test(jsxKey) && !(/^catch/.test(key)) && jsxValue && t.isStringLiteral(jsxValue)) {
    jsxValue = t.jSXExpressionContainer(
      t.memberExpression(t.thisExpression(), t.identifier(jsxValue.value))
    )
  }

  if (key.startsWith('catch') && value) {
    if (value === 'true' || value.trim() === '') {
      jsxValue = t.jSXExpressionContainer(
        t.memberExpression(t.thisExpression(), t.identifier('privateStopNoop'))
      )
      globals.hasCatchTrue = true
    } else if (t.isStringLiteral(jsxValue)) {
      jsxValue = t.jSXExpressionContainer(
        t.callExpression(
          t.memberExpression(t.memberExpression(t.thisExpression(), t.identifier('privateStopNoop')), t.identifier('bind')),
          [t.thisExpression(), t.memberExpression(t.thisExpression(), t.identifier(jsxValue.value))]
        )
      )
    }
  }
  return t.jSXAttribute(t.jSXIdentifier(jsxKey), jsxValue)
}

function handleAttrKey (key: string) {
  if (
    key.startsWith('wx:') ||
    key.startsWith('wx-') ||
    key.startsWith('data-')
  ) {
    return key
  } else if (key === 'class') {
    return 'className'
  } else if (/^(bind|catch)[a-z|:]/.test(key)) {
    if (specialEvents.has(key)) {
      return specialEvents.get(key)!
    } else {
      key = key.replace(/^(bind:|catch:|bind|catch)/, 'on')
      key = camelCase(key)
      if (!isValidVarName(key)) {
        throw new Error(`"${key}" 不是一个有效 JavaScript 变量名`)
      }
      return key.substr(0, 2) + key[2].toUpperCase() + key.substr(3)
    }
  }

  return camelCase(key)
}
