import Taro from '@tarojs/taro'
import { shouldBeFunction } from 'src/utils'

export const offBluetoothDeviceFound: typeof Taro.offBluetoothDeviceFound = (callback) => {
  const name = 'offBluetoothDeviceFound'

  // callback must be an Function
  const isFunction = shouldBeFunction(callback)
  if (!isFunction.flag) {
    const res = { errMsg: `${name}:fail ${isFunction.msg}` }
    console.error(res.errMsg)
    return Promise.reject(res)
  }

  // @ts-ignore
  native.offBluetoothDeviceFound((res: any) => {
    const result: Taro.onBluetoothDeviceFound.CallbackResult = {
      /** 新搜索到的设备列表 */
      devices: res
    }
    callback(result)
  })
}