import { MessageBuilder, MessagePayloadType, MessagePayloadDataTypeOp, MessageType } from './message'

export class MessageBridge {
  /**
   * 기존 검증된 MessageBuilder 프로토콜을 현재 event/data 브리지 인터페이스로 감쌉니다.
   */
  constructor(options) {
    this._builder = new MessageBuilder(options)
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

  /**
   * 워치 측 BLE 연결과 프로토콜 handshake를 시작합니다.
   */
  connect() {
    if (!this._callBound) {
      this._builder.on('call', this._boundCall)
      this._callBound = true
    }
    this._builder.connect()
  }

  /**
   * 폰 app-side가 보내는 ACK notify를 수신합니다.
   */
  listen() {
    if (!this._callBound) {
      this._builder.on('call', this._boundCall)
      this._callBound = true
    }
    this._builder.listen()
  }

  /**
   * 워치 측 BLE 연결을 종료합니다.
   */
  disconnect() {
    this._builder.disConnect()
  }

  /**
   * event 이름으로 핸들러를 등록합니다.
   */
  on(event, handler) {
    this._handlers.set(event, handler)
  }

  /**
   * event 이름 기준으로 핸들러를 해제합니다.
   */
  off(event) {
    this._handlers.delete(event)
  }

  /**
   * event/data 구조를 검증된 MessageBuilder notify로 전송합니다.
   */
  call(event, data) {
    /**
     * 워치 BLE -> 폰 peerSocket 경로에서 외곽 App 헤더가 한 겹 벗겨지는 경우가 있어
     * notify 데이터만 App 헤더를 한 번 더 감싸서 보냅니다.
     */
    if (this._builder?.isDevice) {
      return this._builder.waitingShakePromise.then(() => {
        const jsonBin = this._builder.json2Buf({ event, data })
        const payloadBin = this._builder.buildPayload({
          traceId: 0,
          spanId: 0,
          seqId: 1,
          totalLength: jsonBin.byteLength,
          type: MessagePayloadType.Notify,
          opCode: 1,
          payload: jsonBin,
          contentType: MessagePayloadDataTypeOp.JSON,
          dataType: MessagePayloadDataTypeOp.EMPTY,
        })
        const inner = this._builder.buildData(payloadBin, { type: MessageType.Data })
        const outer = this._builder.buildData(inner, { type: MessageType.Data })
        this._builder.sendMsg(outer)
      })
    }
    return this._builder.call({ event, data })
  }

  /**
   * 현재 handshake 상태를 페이지 진단용으로 노출합니다.
   */
  getDebugState() {
    return {
      appSidePort: this._builder?.appSidePort || 0,
    }
  }
}
