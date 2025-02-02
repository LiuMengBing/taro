export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/component/index/index',
    'pages/component/cover-image/cover-image',
    'pages/component/cover-view/cover-view',
    'pages/component/view/view',
    'pages/component/scroll-view/scroll-view',
    'pages/component/swiper/swiper',
    'pages/component/text/text',
    'pages/component/icon/icon',
    'pages/component/progress/progress',
    'pages/component/button/button',
    'pages/component/checkbox/checkbox',
    'pages/component/form/form',
    'pages/component/input/input',
    'pages/component/label/label',
    'pages/component/picker/picker',
    'pages/component/picker-view/picker-view',
    'pages/component/radio/radio',
    'pages/component/switch/switch',
    'pages/component/textarea/textarea',
    'pages/component/navigator/navigator',
    'pages/component/audio/audio',
    'pages/component/camera/camera',
    'pages/component/image/image',
    'pages/component/video/video',
    'pages/component/map/map',
    'pages/component/canvas/canvas',
    'pages/component/slider/slider',
    'pages/component/grid-view/grid-view',
    'pages/component/list-view/list-view',
    'pages/component/page-container/page-container',
    'pages/component/radio-group/radio-group',
    'pages/component/checkbox-group/checkbox-group',
    'pages/component/match-media/match-media',
    'pages/component/movable-view/movable-view',
    'pages/component/sticky-header/sticky-header',
    'pages/component/root-portal/root-portal',
    'pages/component/editor/editor',
    'pages/component/share-element/share-element',
    'pages/api/index/index',
    'pages/api/advertising/index',
    'pages/api/ai/inference/index',
    'pages/api/ai/visionAlgorithms/index',
    'pages/api/ai/faceRecognition/index',
    'pages/api/alipay/index',
    'pages/api/analysis/index',
    'pages/api/basics/basics/index',
    'pages/api/basics/debug/index',
    'pages/api/basics/encryption/index',
    'pages/api/basics/miniProgram/index',
    'pages/api/basics/performance/index',
    'pages/api/basics/system/index',
    'pages/api/basics/update/index',
    'pages/api/cache/index',
    'pages/api/canvas/index',
    'pages/api/cloudServices/index',
    'pages/api/device/bluetoothGeneral/index',
    'pages/api/device/bluetoothLowCenter/index',
    'pages/api/device/bluetoothLowPerpherals/index',
    'pages/api/device/bluetoothBeacon/index',
    'pages/api/device/nfc/index',
    'pages/api/device/wifi/index',
    'pages/api/device/calendar/index',
    'pages/api/device/contact/index',
    'pages/api/device/accessibility/index',
    'pages/api/device/bettery/index',
    'pages/api/device/clipBoard/index',
    'pages/api/device/network/index',
    'pages/api/device/screen/index',
    'pages/api/device/keyboard/index',
    'pages/api/device/phoneCall/index',
    'pages/api/device/accelerometer/index',
    'pages/api/device/compass/index',
    'pages/api/device/deviceOrientation/index',
    'pages/api/device/gyroscope/index',
    'pages/api/device/memory/index',
    'pages/api/device/scan/index',
    'pages/api/device/sms/index',
    'pages/api/device/vibration/index',
    'pages/api/file/index',
    'pages/api/forward/index',
    'pages/api/framework/index',
    'pages/api/interface/interaction/index',
    'pages/api/interface/navigationBar/index',
    'pages/api/interface/background/index',
    'pages/api/interface/tabBar/index',
    'pages/api/interface/font/index',
    'pages/api/interface/pullDownRefresh/index',
    'pages/api/interface/scroll/index',
    'pages/api/interface/animation/index',
    'pages/api/interface/setTop/index',
    'pages/api/interface/customizedComponents/index',
    'pages/api/interface/menu/index',
    'pages/api/interface/windows/index',
    'pages/api/location/index',
    'pages/api/media/map/index',
    'pages/api/media/image/index',
    'pages/api/media/video/index',
    'pages/api/media/audio/index',
    'pages/api/media/backgroundAudio/index',
    'pages/api/media/realtimeAudioAndVideo/index',
    'pages/api/media/recording/index',
    'pages/api/media/camera/index',
    'pages/api/media/richText/index',
    'pages/api/media/audioOrVideoCompose/index',
    'pages/api/media/realtimeVoice/index',
    'pages/api/media/screenRecorder/index',
    'pages/api/media/videoDecoder/index',
    'pages/api/network/request/index',
    'pages/api/network/download/index',
    'pages/api/network/upload/index',
    'pages/api/network/webSocket/index',
    'pages/api/network/mDNS/index',
    'pages/api/network/TCPCommunications/index',
    'pages/api/network/UDPCommunications/index',
    'pages/api/openAPIS/login/index',
    'pages/api/openAPIS/accountInfomation/index',
    'pages/api/openAPIS/userInfomation/index',
    'pages/api/openAPIS/authorization/index',
    'pages/api/openAPIS/setting/index',
    'pages/api/openAPIS/recipientAddress/index',
    'pages/api/openAPIS/cardsAndOffers/index',
    'pages/api/openAPIS/invoice/index',
    'pages/api/openAPIS/biometricAuthorization/index',
    'pages/api/openAPIS/weRun/index',
    'pages/api/openAPIS/subscribeNews/index',
    'pages/api/openAPIS/wechatRedRacket/index',
    'pages/api/openAPIS/collection/index',
    'pages/api/openAPIS/mineMiniProgram/index',
    'pages/api/openAPIS/licensePlate/index',
    'pages/api/openAPIS/wechatVideoChannel/index',
    'pages/api/openAPIS/deviceVoip/index',
    'pages/api/openAPIS/wechatGroup/index',
    'pages/api/openAPIS/wechatCustomerService/index',
    'pages/api/payment/index',
    'pages/api/qq/index',
    'pages/api/redirection/index',
    'pages/api/routing/index',
    'pages/api/swan/index',
    'pages/api/taro/expand/index',
    'pages/api/taro/hooks/index',
    'pages/api/thirdParty/index',
    'pages/api/worker/index',
    'pages/api/wxml/index',
  ],
  tabBar: {
    color: '#7A7E83',
    selectedColor: '#1F69FF',
    borderStyle: 'black',
    backgroundColor: 'F7F7F7',
    list: [
      {
        pagePath: 'pages/component/index/index',
        iconPath: 'assets/tab/component.png',
        selectedIconPath: 'assets/tab/component_select.png',
        text: '组件',
      },
      {
        pagePath: 'pages/index/index',
        iconPath: 'assets/tab/home.png',
        selectedIconPath: 'assets/tab/home_select.png',
        text: '首页',
      },
      {
        pagePath: 'pages/api/index/index',
        iconPath: 'assets/tab/api.png',
        selectedIconPath: 'assets/tab/api_select.png',
        text: '接口',
      },
    ],
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F7F7F7',
    navigationBarTitleText: 'Harmony',
    navigationBarTextStyle: 'black',
  },
})
