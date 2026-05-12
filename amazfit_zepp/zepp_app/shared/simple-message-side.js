import { MessageBuilder } from './message-side'

export class MessageBridgeSide {
  /**
   * 기존 검증된 MessageBuilder 프로토콜을 현재 event/data 브리지 인터페이스로 감쌉니다.
   */
  constructor() {
    this._builder = new MessageBuilder()
    this._handlers = new Map()
    this._callBound = false
    this._boundCall = (fullPayload) => {
      try {
        const msg = this._builder.buf2Json(fullPayload.payload)
        const h = this._handlers.get(msg?.event)
        if (typeof h === 'function') h(msg?.data)
      } catch (e) {}
    }
  }

  listen() {
    if (!this._callBound) {
      this._builder.on('call', this._boundCall)
      this._callBound = true
    }
    this._builder.listen()
  }

  on(event, handler) {
    this._handlers.set(event, handler)
  }

  /**
   * 폰 app-side 상태를 워치로 다시 보내 ACK를 표시합니다.
   */
  send(event, data) {
    return this._builder.call({ event, data })
  }
}
