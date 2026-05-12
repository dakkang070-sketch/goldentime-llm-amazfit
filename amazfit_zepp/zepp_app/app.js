import './shared/device-polyfill'
import { MessageBridge } from './shared/simple-message'
import { getPackageInfo } from '@zos/app'
import * as ble from '@zos/ble'

App({
  globalData: {
    bridge: null,
  },
  onCreate() {
    const { appId } = getPackageInfo()
    const bridge = new MessageBridge({ appId, appDevicePort: 20, appSidePort: 0, ble })
    this.globalData.bridge = bridge
    bridge.connect()
    bridge.listen()
  },

  onDestroy() {
    const bridge = this.globalData.bridge
    if (bridge) bridge.disconnect()
  },
})
