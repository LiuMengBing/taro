import Taro from '@tarojs/taro'
import { shouldBeObject } from 'src/utils'
import { MethodHandler } from 'src/utils/handler'

export const getConnectedBluetoothDevices: typeof Taro.getConnectedBluetoothDevices = (options) => {
  const name = 'getConnectedBluetoothDevices'

  return new Promise((resolve, reject) => {
    // options must be an Object
    const isObject = shouldBeObject(options)
    if (!isObject.flag) {
      const res = { errMsg: `${name}:fail ${isObject.msg}` }
      console.error(res.errMsg)
      reject(res)
    }
    const {
      services,
      success,
      fail,
      complete
    } = options as Exclude<typeof options, undefined>

    const handle = new MethodHandler<{
      devices?: object
      errMsg?: string
    }>({ name, success, fail, complete })

    // @ts-ignore
    native.getConnectedBluetoothDevices({
      services: services,
      success: (res: any) => {
        handle.success(res, { resolve, reject })
      },
      fail: (err: any) => {
        handle.fail(err, { resolve, reject })
      }
    })
  })
}
