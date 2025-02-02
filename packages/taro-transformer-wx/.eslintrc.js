module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint'
  ],
  parserOptions: { },
  extends: [
    'eslint:recommended',
    'standard',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/ban-ts-comment': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/explicit-module-boundary-types': 0,
    '@typescript-eslint/indent': [2, 2],
    '@typescript-eslint/member-delimiter-style': [1, { multiline: { delimiter: 'none' }, singleline: { delimiter: 'comma' } }],
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-namespace': 0,
    '@typescript-eslint/no-non-null-assertion': 0,
    '@typescript-eslint/no-this-alias': 0,
    '@typescript-eslint/no-unused-vars': 0,
    '@typescript-eslint/no-use-before-define': [1, { functions: false, classes: false }],
    '@typescript-eslint/no-var-requires': 0,
    '@typescript-eslint/ban-types': 0,
    'no-restricted-globals': 'off',
    'no-cond-assign': 'off',
    'no-inner-declarations': 'off',
    'no-unmodified-loop-condition': 'off',
    'no-return-assign': 'off',
    'no-console': 'off',
    'no-self-compare': 'off',
    'no-control-regex': 'off',
    'no-new-func': 'off',
    'no-new': 'off',
    'prefer-const': 'off',
    'no-empty': 'off',
    'no-unsafe-optional-chaining': 'off', 
    'no-prototype-builtins': 'off',
    camelcase: 'off'
  }
}
