import { MessageBridgeSide } from '../shared/simple-message-side'

const apiBase = 'http://192.168.45.227:4003'
const userId = '69eaf3b7535aedea7e0385c6'

const bridge = new MessageBridgeSide()
const INGEST_INTERVAL_MS = 1000
let lastIngestMs = 0
let lastSentWear = null

/**
 * 움직임 상태를 서버 허용값으로 정규화합니다.
 */
const normalizeMovementStatus = (v, fallDetected) => {
  const allowed = new Set(['stationary', 'walking', 'running', 'fall_detected', 'unknown'])
  if (typeof v === 'string' && allowed.has(v)) return v
  if (fallDetected === true) return 'fall_detected'
  return 'unknown'
}

/**
 * 위치값이 비어 있으면 서울 기본 좌표를 사용합니다.
 */
const normalizeLocation = (v) => {
  if (v && typeof v.lat === 'number' && typeof v.lng === 'number') return v
  return { lat: 37.5665, lng: 126.978 }
}

/**
 * 워치에서 받은 생체 페이로드를 로컬 ingest API로 전송합니다.
 */
const postIngest = async (data) => {
  const movementStatus = normalizeMovementStatus(data.movementStatus, data.fallDetected)
  const location = normalizeLocation(data.location)
  const body = {
    userId,
    source: 'amazfit',
    collectedAt: data.collectedAt,
    heartRate: data.heartRate,
    isWear: data.isWear,
    spO2: data.spO2,
    bodyTemperature: data.bodyTemperature,
    steps: data.steps,
    batteryLevel: data.batteryLevel,
    stressLevel: data.stressLevel,
    movementStatus,
    acceleration: data.acceleration,
    gyroscope: data.gyroscope,
    barometer: data.barometer,
    location,
    raw: data.raw,
  }

  const url = `${apiBase}/api/ingest/amazfit`
  const headers = { 'Content-Type': 'application/json' }
  const bodyStr = JSON.stringify(body)

  /**
   * fetch가 불안정한 런타임을 위해 XMLHttpRequest 기반 POST를 마지막 폴백으로 제공합니다.
   */
  const postWithXhr = () =>
    new Promise((resolve, reject) => {
      try {
        if (typeof XMLHttpRequest !== 'function') {
          reject(new Error('NO_XHR'))
          return
        }
        const xhr = new XMLHttpRequest()
        xhr.open('POST', url)
        Object.keys(headers).forEach((key) => {
          try {
            xhr.setRequestHeader(key, headers[key])
          } catch (e) {}
        })
        xhr.onreadystatechange = () => {
          try {
            if (xhr.readyState !== 4) return
            const status = typeof xhr.status === 'number' ? xhr.status : 0
            if (status >= 200 && status < 300) {
              let result = {}
              try {
                result = xhr.responseText ? JSON.parse(xhr.responseText) : {}
              } catch (e) {}
              resolve({
                ok: true,
                status,
                json: async () => result,
              })
              return
            }
            reject(new Error(`HTTP ${status || 0}`))
          } catch (e) {
            reject(e)
          }
        }
        xhr.onerror = () => reject(new Error('XHR_ERROR'))
        xhr.send(bodyStr)
      } catch (e) {
        reject(e)
      }
    })

  /**
   * Zepp 런타임 차이를 고려해 객체형 fetch와 표준 fetch를 순서대로 시도합니다.
   */
  let res = null
  try {
    res = await fetch({ url, method: 'POST', headers, body: bodyStr })
  } catch (e) {}

  if (!res) {
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyStr,
      })
    } catch (e) {}
  }

  if (!res) {
    res = await postWithXhr()
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

AppSideService({
  onInit() {
    bridge.listen()
    bridge.send('ack', { stage: 'INIT' })
    bridge.on('ingest', async (payload) => {
      if (!payload || payload.type !== 'biometric') return
      bridge.send('ack', { stage: 'RECV', wear: payload?.isWear === true, hr: payload?.heartRate || 0 })

      const now = Date.now()
      const isWear = typeof payload?.isWear === 'boolean' ? payload.isWear : false
      const hr = typeof payload?.heartRate === 'number' && Number.isFinite(payload.heartRate) ? payload.heartRate : 0

      if (isWear === false) {
        if (lastSentWear === false) return
        lastSentWear = false
        try {
          await postIngest({ ...payload, isWear: false, heartRate: 0 })
          bridge.send('ack', { stage: 'POST_R_OK' })
        } catch (e) {
          bridge.send('ack', { stage: `POST_R_${String(e && e.message ? e.message : e).slice(0, 10)}` })
        }
        return
      }

      if (hr <= 0) return
      if (now - lastIngestMs < INGEST_INTERVAL_MS) return

      lastSentWear = true
      lastIngestMs = now
      try {
        await postIngest({ ...payload, isWear: true, heartRate: hr })
        bridge.send('ack', { stage: 'POST_OK' })
      } catch (e) {
        bridge.send('ack', { stage: `POST_${String(e && e.message ? e.message : e).slice(0, 10)}` })
      }
    })
  },
})
