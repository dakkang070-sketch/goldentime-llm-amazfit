import * as hmUI from '@zos/ui'
import { getPackageInfo } from '@zos/app'
import { pauseDropWristScreenOff, resetDropWristScreenOff, resetPageBrightTime, setPageBrightTime, setWakeUpRelaunch } from '@zos/display'

Page({
  onInit() {
    this._status = null
    this._value = null
    this._details = null
    this._flowDebug = 'FLOW:INIT'
    this._networkDebug = 'NET:INIT'
    this._bridgeCallCb = null
    this._networkAckUntilMs = 0
    this._hr = null
    this._hrCb = null
    this._tick = null
    this._lastHr = 0
    this._lastHrAtMs = 0
    this._hrPositiveCount = 0
    this._wearOkCount = 0
    this._wearOffSinceMs = null
    this._wearCandidateHrFirst = null
    this._wearCandidateHrChanged = false
    this._wearCandidateStartedAtMs = 0
    this._wear = null
    this._wearCb = null
    this._isWear = false
    this._step = null
    this._battery = null
    this._acc = null
    this._gyro = null
    this._baro = null
    this._geo = null
    this._geoCb = null
    this._lastLocation = null
    this._spo2 = null
    this._spo2Cb = null
    this._lastSpO2 = 0
    this._lastSpO2AtMs = 0
    this._spo2Measuring = false
    this._spo2MeasureStartedAtMs = 0
    this._bodyTemp = null
    this._bodyTempStartedAtMs = 0
    this._bodyTempSource = ''
    this._bodyTempKey = ''
    this._bodyTempRetCode = null
    this._permBgStatus = 0
    this._permTempStatus = 0
    this._lastBodyTemp = 0
    this._lastBodyTempAtMs = 0
    this._lastStress = 0
    this._lastStressAtMs = 0
    this._wearDebounce = { displayed: null, candidate: null, count: 0 }
    this._removedSinceMs = null
    this._sentRemovedAtMs = 0
    this._sentRemovedOnce = false
    this._zeroHrSinceMs = null
    this._wearLockUntilMs = 0
    this._wearUnlockCount = 0
    this._lastSentWear = null
    this._lastSentAtMs = 0
  },
  build() {
    /**
     * 앱 패키지에서 버전 문자열을 가져오고, 런타임에서 제공되지 않으면 app.json 기준 값을 사용합니다.
     */
    const getAppVersionName = () => {
      try {
        const info = getPackageInfo()
        const v = info?.version?.name ?? info?.versionName ?? info?.version_name
        if (typeof v === 'string' && v.trim()) return v.trim()
      } catch (e) {}
      return '1.6.75'
    }

    try {
      setWakeUpRelaunch(true)
    } catch (e) {}
    try {
      setPageBrightTime({ brightTime: 30 * 60 * 1000 })
    } catch (e) {}
    try {
      pauseDropWristScreenOff({ duration: 0 })
    } catch (e) {}

    const getScreen = () => {
      try {
        const mod = require('@zos/device')
        const fn = mod?.getDeviceInfo || mod?.default?.getDeviceInfo
        const info = typeof fn === 'function' ? fn() : null
        const w = info?.width ?? info?.screenWidth
        const h = info?.height ?? info?.screenHeight
        const screenShape = info?.screenShape
        const deviceSource = info?.deviceSource
        if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
          return { width: w, height: h, screenShape, deviceSource }
        }
      } catch (e) {}
      return { width: 390, height: 450, screenShape: 'unknown', deviceSource: 'unknown' }
    }
    const dmsToDd = (dms) => {
      if (!dms || typeof dms !== 'object') return null
      const deg = Number(dms.degrees)
      const min = Number(dms.minutes)
      const sec = Number(dms.seconds)
      if (!Number.isFinite(deg) || !Number.isFinite(min) || !Number.isFinite(sec)) return null
      const sign = dms.direction === 'S' || dms.direction === 'W' ? -1 : 1
      return sign * (Math.abs(deg) + min / 60 + sec / 3600)
    }

    /**
     * 현재 워치 페이지 런타임에서는 fetch 경로를 쓰지 않고 bridge 결과만 표시합니다.
     */
    const postBiometricToServer = () => {}

    const { width, height } = getScreen()

    this._appVersionName = getAppVersionName()
    const side = Math.min(width, height)
    const x0 = Math.floor((width - side) / 2)
    const y0 = Math.floor((height - side) / 2)
    const yShift = Math.floor(side * 0.06)
    const titleY = y0 + Math.floor(side * 0.22) - yShift
    const statusY = y0 + Math.floor(side * 0.32) - yShift
    const valueY = y0 + Math.floor(side * 0.40) - yShift
    const titleSize = Math.min(42, Math.max(26, Math.floor(side * 0.085)))
    const statusSize = Math.min(22, Math.max(14, Math.floor(side * 0.045)))
    const valueSize = Math.min(92, Math.max(56, Math.floor(side * 0.18)))
    const detailsSize = Math.min(18, Math.max(12, Math.floor(side * 0.04)))
    const valueH = Math.floor(side * 0.26)

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: width,
      h: height,
      color: 0x1b1b1b,
    })

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: x0,
      y: titleY,
      w: side,
      h: 60,
      color: 0xffffff,
      text_size: titleSize,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE,
      text: 'GOLDENLink',
    })

    this._status = hmUI.createWidget(hmUI.widget.TEXT, {
      x: x0,
      y: statusY,
      w: side,
      h: 40,
      color: 0xffffff,
      text_size: statusSize,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE,
      text: '(주)SK플레이',
    })

    const renderDebugLine = () => {
      if (!this._details) return
      const current = typeof this._details.text === 'string' ? this._details.text : ''
      const lines = current ? current.split('\n') : []
      const base = lines.slice(0, 4)
      while (base.length < 4) base.push('')
      base.push(`${this._flowDebug} ${this._networkDebug} V:${this._appVersionName || '--'}`)
      this._details.text = base.join('\n')
    }
    /**
     * 워치 화면에 현재 실행 단계와 네트워크 상태를 분리해서 표시합니다.
     */
    const setFlowDebug = (text) => {
      this._flowDebug = text
      renderDebugLine()
    }
    const setNetworkDebug = (text) => {
      this._networkDebug = text
      renderDebugLine()
    }
    /**
     * app-side ACK는 주기적 BRIDGE_OK 표시에 덮이지 않도록 짧게 우선 노출합니다.
     */
    const setNetworkAckDebug = (text) => {
      this._networkAckUntilMs = Date.now() + 5000
      setNetworkDebug(text)
    }

    this._value = hmUI.createWidget(hmUI.widget.TEXT, {
      x: x0,
      y: valueY,
      w: side,
      h: valueH,
      color: 0xffffff,
      text_size: valueSize,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE,
      text: '--',
    })

    this._details = hmUI.createWidget(hmUI.widget.TEXT, {
      x: x0,
      y: valueY + valueH + Math.floor(side * 0.03),
      w: side,
      h: Math.floor(side * 0.26),
      color: 0xbdbdbd,
      text_size: detailsSize,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE,
      text: `O2:--  T:--.-  S:--\nST:--  B:--\nA:--  G:--\nP:--  L:--\nV:${this._appVersionName}`,
    })
    renderDebugLine()

    let bridge = null
    try {
      const app = typeof getApp === 'function' ? getApp() : null
      bridge = app && app.globalData ? app.globalData.bridge : null
    } catch (e) {
      bridge = null
    }
    if (this._status) this._status.text = '(주)SK플레이'
    setFlowDebug(bridge ? 'FLOW:BUILD' : 'FLOW:NO_BRIDGE')
    if (bridge && typeof bridge.getDebugState === 'function') {
      try {
        const st = bridge.getDebugState()
        const p = st && typeof st.appSidePort === 'number' ? st.appSidePort : 0
        if (p > 0) setNetworkDebug(`NET:PORT_${String(p)}`)
      } catch (e) {}
    }

    this._bridgeCallCb = null
    if (bridge && typeof bridge.on === 'function') {
      /**
       * app-side가 살아 있는지, 수신했는지, 업로드까지 갔는지를 워치 화면에 ACK로 표시합니다.
       */
      this._bridgeCallCb = (data) => {
        const stage = data && typeof data.stage === 'string' ? data.stage : 'ACK'
        setNetworkAckDebug(`NET:${stage.slice(0, 16)}`)
      }
      bridge.on('ack', this._bridgeCallCb)
    }

    try {
      let HeartRateCtor = null
      try {
        const mod = require('@zos/sensor')
        HeartRateCtor = mod && mod.HeartRate ? mod.HeartRate : null
      } catch (e) {
        HeartRateCtor = null
      }

      if (!HeartRateCtor) {
        setFlowDebug('FLOW:NO_HR')
        if (this._status) this._status.text = '(주)SK플레이'
        return
      }
      setFlowDebug('FLOW:HR_CTOR')

      try {
        const mod = require('@zos/sensor')
        const WearCtor = mod && mod.Wear ? mod.Wear : null
        if (WearCtor) {
          const wear = new WearCtor()
          this._wear = wear
          const wearCb = () => {}
          this._wearCb = wearCb
          wear.onChange(wearCb)
          wearCb()
        }
      } catch (e) {}

      try {
        const mod = require('@zos/sensor')
        const BloodOxygenCtor = mod && mod.BloodOxygen ? mod.BloodOxygen : null
        if (BloodOxygenCtor) {
          const spo2 = new BloodOxygenCtor()
          this._spo2 = spo2
          const cb = () => {
            try {
              const cur = spo2.getCurrent ? spo2.getCurrent() : null
              const value =
                cur && typeof cur.value === 'number'
                  ? cur.value
                  : cur && typeof cur.current === 'number'
                    ? cur.current
                    : typeof cur === 'number'
                      ? cur
                      : null
              const retCode = cur && typeof cur.retCode === 'number' ? cur.retCode : null

              if (retCode === 1) return

              if (typeof value === 'number' && value >= 70 && value <= 100) {
                this._lastSpO2 = value
                this._lastSpO2AtMs = Date.now()
              }

              this._spo2Measuring = false
              try {
                if (spo2.stop) spo2.stop()
              } catch (e) {}
            } catch (e) {}
          }
          this._spo2Cb = cb
          if (spo2.onChange) spo2.onChange(cb)
        }
      } catch (e) {}

      try {
        const mod = require('@zos/sensor')
        const tryCtor = (Ctor, key) => {
          try {
            if (!Ctor) return false
            const bodyTemp = new Ctor()
            this._bodyTemp = bodyTemp
            this._bodyTempSource = '@zos/sensor'
            this._bodyTempKey = key || 'unknown'
            if (typeof bodyTemp.onChange === 'function') {
              bodyTemp.onChange(() => {
                try {
                  const cur = typeof bodyTemp.getCurrent === 'function' ? bodyTemp.getCurrent() : bodyTemp.current
                  const retCode = cur && typeof cur.retCode === 'number' ? cur.retCode : null
                  this._bodyTempRetCode = retCode
                  const raw =
                    cur && typeof cur.current === 'number'
                      ? cur.current
                      : cur && typeof cur.value === 'number'
                        ? cur.value
                        : typeof cur === 'number'
                          ? cur
                          : null
                  const normalizeTemp = (v) => {
                    if (typeof v !== 'number' || !Number.isFinite(v)) return null
                    if (v >= 20 && v <= 45) return v
                    if (v >= 200 && v <= 450) return v / 10
                    if (v >= 2000 && v <= 4500) return v / 100
                    if (v >= 20000 && v <= 45000) return v / 1000
                    return null
                  }
                  const temp = normalizeTemp(raw)
                  if (typeof temp === 'number') {
                    this._lastBodyTemp = temp
                    this._lastBodyTempAtMs = Date.now()
                  }
                } catch (e) {}
              })
            }
            if (typeof bodyTemp.start === 'function') {
              bodyTemp.start()
              this._bodyTempStartedAtMs = Date.now()
            }
            return true
          } catch (e) {
            return false
          }
        }

        const direct =
          (mod && mod.BodyTemperature) ||
          (mod && mod.SkinTemperature) ||
          (mod && mod.Temperature) ||
          null
        if (tryCtor(direct, direct === (mod && mod.BodyTemperature) ? 'BodyTemperature' : direct === (mod && mod.SkinTemperature) ? 'SkinTemperature' : direct === (mod && mod.Temperature) ? 'Temperature' : 'unknown')) {
          // ok
        } else {
          try {
            const keys = mod && typeof mod === 'object' ? Object.keys(mod) : []
            const k = keys.find((x) => /temp/i.test(x) && typeof mod[x] === 'function')
            if (k) tryCtor(mod[k], k)
          } catch (e) {}
        }
      } catch (e) {}

      if (!this._bodyTemp) {
        try {
          const hmSensor = globalThis && globalThis.hmSensor ? globalThis.hmSensor : null
          const pickHmTempId = () => {
            if (!hmSensor || typeof hmSensor.createSensor !== 'function') return null
            const ids = hmSensor.id
            if (!ids || typeof ids !== 'object') return null
            const preferred = ['BODY_TEMP', 'BODY_TEMPERATURE', 'SKIN_TEMP', 'TEMP', 'TEMPERATURE']
            for (const k of preferred) {
              if (Object.prototype.hasOwnProperty.call(ids, k)) return { key: k, id: ids[k] }
            }
            const keys = Object.keys(ids)
            const k = keys.find((x) => /temp/i.test(x))
            if (k) return { key: k, id: ids[k] }
            return null
          }

          const picked = pickHmTempId()
          if (picked) {
            const sensor = hmSensor.createSensor(picked.id)
            this._bodyTemp = sensor
            this._bodyTempSource = 'hmSensor'
            this._bodyTempKey = picked.key
            try {
              const changeEvent = hmSensor?.event?.CHANGE
              if (sensor && typeof sensor.addEventListener === 'function' && changeEvent !== undefined) {
                sensor.addEventListener(changeEvent, () => {
                  try {
                    const temp = typeof sensor.current === 'number' ? sensor.current : null
                    if (typeof temp === 'number' && temp >= 20 && temp <= 45) {
                      this._lastBodyTemp = temp
                      this._lastBodyTempAtMs = Date.now()
                    }
                  } catch (e) {}
                })
              }
              if (sensor && typeof sensor.start === 'function') {
                sensor.start()
                this._bodyTempStartedAtMs = Date.now()
              }
            } catch (e) {}
          }
        } catch (e) {}
      }

      try {
        const mod = require('@zos/sensor')
        const StepCtor = mod && mod.Step ? mod.Step : null
        if (StepCtor) this._step = new StepCtor()
      } catch (e) {}

      try {
        const mod = require('@zos/sensor')
        const BatteryCtor = mod && mod.Battery ? mod.Battery : null
        if (BatteryCtor) this._battery = new BatteryCtor()
      } catch (e) {}

      try {
        const mod = require('@zos/sensor')
        const AccCtor = mod && mod.Accelerometer ? mod.Accelerometer : null
        if (AccCtor) {
          const acc = new AccCtor()
          this._acc = acc
          if (typeof mod?.FREQ_MODE_NORMAL === 'number' && typeof acc.setFreqMode === 'function') {
            acc.setFreqMode(mod.FREQ_MODE_NORMAL)
          }
          if (typeof acc.start === 'function') acc.start()
        }
      } catch (e) {}

      try {
        const mod = require('@zos/sensor')
        const GyroCtor = mod && mod.Gyroscope ? mod.Gyroscope : null
        if (GyroCtor) {
          const gyro = new GyroCtor()
          this._gyro = gyro
          if (typeof mod?.FREQ_MODE_NORMAL === 'number' && typeof gyro.setFreqMode === 'function') {
            gyro.setFreqMode(mod.FREQ_MODE_NORMAL)
          }
          if (typeof gyro.start === 'function') gyro.start()
        }
      } catch (e) {}

      try {
        const mod = require('@zos/sensor')
        const BaroCtor = mod && mod.Barometer ? mod.Barometer : null
        if (BaroCtor) this._baro = new BaroCtor()
      } catch (e) {}

      try {
        const mod = require('@zos/sensor')
        const GeoCtor = mod && mod.Geolocation ? mod.Geolocation : null
        if (GeoCtor) {
          const geo = new GeoCtor()
          this._geo = geo
          const cb = () => {
            try {
              const lat = geo.getLatitude ? geo.getLatitude() : null
              const lng = geo.getLongitude ? geo.getLongitude() : null
              const latDd = typeof lat === 'number' ? lat : dmsToDd(lat)
              const lngDd = typeof lng === 'number' ? lng : dmsToDd(lng)
              const inKorea =
                typeof latDd === 'number' &&
                typeof lngDd === 'number' &&
                Number.isFinite(latDd) &&
                Number.isFinite(lngDd) &&
                !(latDd === 0 && lngDd === 0) &&
                latDd >= 33.0 &&
                latDd <= 38.9 &&
                lngDd >= 124.0 &&
                lngDd <= 132.0
              if (inKorea) {
                this._lastLocation = { lat: latDd, lng: lngDd }
              }
            } catch (e) {}
          }
          this._geoCb = cb
          if (geo.onChange) geo.onChange(cb)
          if (geo.start) geo.start()
          cb()
        }
      } catch (e) {}


      const hr = new HeartRateCtor()
      this._hr = hr
      try {
        if (typeof hr.start === 'function') hr.start()
      } catch (e) {}
      setFlowDebug('FLOW:HR_ON')

      const cb = () => {
        const v = hr.getCurrent()
        if (typeof v === 'number' && v > 0) {
          this._lastHr = v
          this._lastHrAtMs = Date.now()
        }
      }
      this._hrCb = cb
      hr.onCurrentChange(cb)

      if (this._tick) clearInterval(this._tick)
      setFlowDebug('FLOW:TIMER')
      this._tick = setInterval(() => {
        const now = Date.now()
        if (!this._tickAliveAtMs || now - this._tickAliveAtMs >= 3000) {
          this._tickAliveAtMs = now
          setFlowDebug(`FLOW:TICK_${this._isWear ? 'W1' : 'W0'}`)
        }

        const setWearState = (nextWear) => {
          if (this._isWear === nextWear) return
          if (nextWear === true) {
            this._isWear = true
            this._removedSinceMs = null
            this._zeroHrSinceMs = null
            this._hrPositiveCount = 0
            this._wearCandidateHrFirst = null
            this._wearCandidateHrChanged = false
            this._wearCandidateStartedAtMs = 0
            this._sentRemovedAtMs = 0
            this._sentRemovedOnce = false
            this._wearLockUntilMs = 0
            this._wearUnlockCount = 0
            try {
              if (this._hr && typeof this._hr.start === 'function') this._hr.start()
            } catch (e) {}
            return
          }

          this._isWear = false
          this._zeroHrSinceMs = null
          this._wearLockUntilMs = 0
          this._wearUnlockCount = 0
          this._wearOkCount = 0
          this._wearOffSinceMs = now
          this._hrPositiveCount = 0
          this._wearCandidateHrFirst = null
          this._wearCandidateHrChanged = false
          this._wearCandidateStartedAtMs = 0
          this._lastHr = 0
          this._lastHrAtMs = now
          this._lastSpO2 = 0
          this._lastSpO2AtMs = now
          this._lastStress = 0
          this._lastLocation = { lat: 0, lng: 0 }
          try {
            if (this._hr && typeof this._hr.stop === 'function') this._hr.stop()
          } catch (e) {}
          if (this._spo2Measuring && this._spo2 && this._spo2.stop) {
            try {
              this._spo2.stop()
            } catch (e) {}
          }
          this._spo2Measuring = false

          if (this._value) this._value.text = '0'
          if (this._details) {
            this._details.text = `O2:0  T:--.-  S:0\nST:0  B:0\nA:0,0,0  G:0,0,0\nP:0/0  L:0.0,0.0\n${this._flowDebug} ${this._networkDebug} V:${this._appVersionName || '--'}`
          }

          if (!this._sentRemovedOnce) {
            this._sentRemovedOnce = true
            this._sentRemovedAtMs = now
            this._lastSentWear = false
            this._lastSentAtMs = now
            const removedPayload = {
              type: 'biometric',
              collectedAt: new Date().toISOString(),
              heartRate: 0,
              isWear: false,
              spO2: 0,
              bodyTemperature: 0,
              stressLevel: 0,
              steps: 0,
              batteryLevel: 0,
              acceleration: { x: 0, y: 0, z: 0 },
              gyroscope: { x: 0, y: 0, z: 0 },
              barometer: { airPressure: 0, altitude: 0 },
              location: { lat: 0, lng: 0 },
            }
            if (bridge && typeof bridge.call === 'function') {
              try {
                bridge.call('ingest', removedPayload)
                if ((this._networkAckUntilMs || 0) < Date.now()) {
                  let nextNet = 'NET:BRIDGE_R_OK'
                  try {
                    if (typeof bridge.getDebugState === 'function') {
                      const st = bridge.getDebugState()
                      const p = st && typeof st.appSidePort === 'number' ? st.appSidePort : 0
                      nextNet = p > 0 ? `NET:PORT_${String(p)}` : 'NET:PORT_0'
                    }
                  } catch (e) {}
                  setNetworkDebug(nextNet)
                }
              } catch (e) {
                setNetworkDebug(`NET:BRIDGE_R ${String(e && e.message ? e.message : e).slice(0, 8)}`)
              }
            } else {
              setNetworkDebug('NET:NO_BRG')
            }
            postBiometricToServer(removedPayload)
          }
        }

        let wearOk = false
        if (this._wear && typeof this._wear.getStatus === 'function') {
          try {
            const s = this._wear.getStatus()
            wearOk = s === 1 || s === 2
          } catch (e) {
            wearOk = false
          }
        }

        const rawHr = hr.getCurrent()
        const hrOk = typeof rawHr === 'number' && rawHr > 0

        if (wearOk) {
          this._wearOffSinceMs = null
          this._wearOkCount = (this._wearOkCount || 0) + 1
        } else {
          if (this._wearOffSinceMs === null) this._wearOffSinceMs = now
          this._wearOkCount = 0
        }

        const wearStable = (this._wearOkCount || 0) >= 6

        if (wearStable && hrOk) {
          this._zeroHrSinceMs = null
          const nextCount = (this._hrPositiveCount || 0) + 1
          this._hrPositiveCount = nextCount
          this._lastHr = rawHr
          this._lastHrAtMs = now

          if (nextCount === 1) {
            this._wearCandidateHrFirst = rawHr
            this._wearCandidateHrChanged = false
            this._wearCandidateStartedAtMs = now
          } else {
            if (
              typeof this._wearCandidateHrFirst === 'number' &&
              typeof rawHr === 'number' &&
              rawHr !== this._wearCandidateHrFirst
            ) {
              this._wearCandidateHrChanged = true
            }
          }

          const candidateAgeMs = this._wearCandidateStartedAtMs ? now - this._wearCandidateStartedAtMs : 0
          if (nextCount >= 3 && (this._wearCandidateHrChanged === true || candidateAgeMs >= 10000)) {
            setWearState(true)
          }
        } else {
          this._hrPositiveCount = 0
          this._wearCandidateHrFirst = null
          this._wearCandidateHrChanged = false
          this._wearCandidateStartedAtMs = 0

          if (this._isWear === true) {
            if (!hrOk) {
              if (this._zeroHrSinceMs === null) this._zeroHrSinceMs = now
            } else {
              this._zeroHrSinceMs = null
            }

            const wearOffForMs = this._wearOffSinceMs !== null ? now - this._wearOffSinceMs : 0
            const hrZeroForMs = this._zeroHrSinceMs !== null ? now - this._zeroHrSinceMs : 0

            if (!wearOk && wearOffForMs >= 6000 && hrZeroForMs >= 6000) {
              setWearState(false)
              return
            }
          } else {
            this._zeroHrSinceMs = null
          }
        }

        if (this._isWear === false) {
          if (!this._tickIdleAtMs || now - this._tickIdleAtMs >= 3000) {
            this._tickIdleAtMs = now
            setFlowDebug(`FLOW:IDLE_${wearOk ? 'W' : '-'}${hrOk ? 'H' : '-'}`)
          }
          this._zeroHrSinceMs = null
          this._lastHr = 0
          this._lastHrAtMs = now
          if (this._value) this._value.text = '0'
          try {
            if (
              this._bodyTemp &&
              typeof this._bodyTemp.start === 'function' &&
              ((this._bodyTempStartedAtMs || 0) === 0 || now - (this._bodyTempStartedAtMs || 0) >= 30000) &&
              (this._lastBodyTempAtMs || 0) === 0
            ) {
              this._bodyTemp.start()
              this._bodyTempStartedAtMs = now
            }
            if (this._bodyTemp && typeof this._bodyTemp.getCurrent === 'function') {
              const cur = this._bodyTemp.getCurrent()
              const temp =
                cur && typeof cur.current === 'number'
                  ? cur.current
                  : cur && typeof cur.value === 'number'
                    ? cur.value
                    : typeof cur === 'number'
                      ? cur
                      : null
              if (typeof temp === 'number' && temp >= 20 && temp <= 45) {
                if (this._lastBodyTemp <= 0 || Math.abs(temp - this._lastBodyTemp) <= 1.5) {
                  this._lastBodyTemp = temp
                  this._lastBodyTempAtMs = now
                }
              }
            } else if (this._bodyTemp && typeof this._bodyTemp.current !== 'undefined') {
              const temp = typeof this._bodyTemp.current === 'number' ? this._bodyTemp.current : null
              if (typeof temp === 'number' && temp >= 20 && temp <= 45) {
                if (this._lastBodyTemp <= 0 || Math.abs(temp - this._lastBodyTemp) <= 1.5) {
                  this._lastBodyTemp = temp
                  this._lastBodyTempAtMs = now
                }
              }
            }
          } catch (e) {}
          if (this._details) {
            const spo2AtMs = typeof this._lastSpO2AtMs === 'number' ? this._lastSpO2AtMs : 0
            const spo2Fresh = spo2AtMs > 0 && now - spo2AtMs <= 10 * 60 * 1000
            const spo2Text =
              spo2Fresh && typeof this._lastSpO2 === 'number' && Number.isFinite(this._lastSpO2) && this._lastSpO2 > 0
                ? String(this._lastSpO2)
                : '--'
            const lastAtMs = typeof this._lastBodyTempAtMs === 'number' ? this._lastBodyTempAtMs : 0
            const isFresh = lastAtMs > 0 && now - lastAtMs <= 5 * 60 * 1000
            const tempText =
              isFresh && typeof this._lastBodyTemp === 'number' && this._lastBodyTemp > 0
                ? `${this._lastBodyTemp.toFixed(1)}°C`
                : '--.-°C'
            const stressAtMs = typeof this._lastStressAtMs === 'number' ? this._lastStressAtMs : 0
            const stressFresh = stressAtMs > 0 && now - stressAtMs <= 10 * 60 * 1000
            const stressText =
              stressFresh && typeof this._lastStress === 'number' && Number.isFinite(this._lastStress)
                ? String(Math.round(this._lastStress))
                : '--'
            this._details.text = `O2:${spo2Text}  T:${tempText}  S:${stressText}\nST:--  B:--\nA:--  G:--\nP:--  L:--\n${this._flowDebug} ${this._networkDebug} V:${this._appVersionName || '--'}`
          }
          if (this._spo2 && (wearOk || hrOk)) {
            const intervalMs = 30000
            const since = this._spo2MeasureStartedAtMs ? now - this._spo2MeasureStartedAtMs : Number.POSITIVE_INFINITY
            const due = now - (this._lastSpO2AtMs || 0) > intervalMs
            if (this._spo2Measuring && since > 45000) {
              this._spo2Measuring = false
              try {
                if (this._spo2.stop) this._spo2.stop()
              } catch (e) {}
            }
            if (!this._spo2Measuring && due) {
              this._spo2Measuring = true
              this._spo2MeasureStartedAtMs = now
              try {
                if (this._spo2.stop) this._spo2.stop()
                if (this._spo2.start) this._spo2.start()
              } catch (e) {
                this._spo2Measuring = false
              }
            }
          }
          if (this._lastSentWear !== false) {
            this._lastSentWear = false
            this._lastSentAtMs = now
            const removedPayload = {
              type: 'biometric',
              collectedAt: new Date().toISOString(),
              heartRate: 0,
              isWear: false,
              spO2: 0,
              bodyTemperature: 0,
              steps: 0,
              batteryLevel: 0,
              acceleration: { x: 0, y: 0, z: 0 },
              gyroscope: { x: 0, y: 0, z: 0 },
              barometer: { airPressure: 0, altitude: 0 },
              location: { lat: 0, lng: 0 },
            }
            if (bridge && typeof bridge.call === 'function') {
              try {
                bridge.call('ingest', removedPayload)
                if ((this._networkAckUntilMs || 0) < Date.now()) {
                  let nextNet = 'NET:BRIDGE_R_OK'
                  try {
                    if (typeof bridge.getDebugState === 'function') {
                      const st = bridge.getDebugState()
                      const p = st && typeof st.appSidePort === 'number' ? st.appSidePort : 0
                      nextNet = p > 0 ? `NET:PORT_${String(p)}` : 'NET:PORT_0'
                    }
                  } catch (e) {}
                  setNetworkDebug(nextNet)
                }
              } catch (e) {
                setNetworkDebug(`NET:BRIDGE_R ${String(e && e.message ? e.message : e).slice(0, 8)}`)
              }
            } else {
              setNetworkDebug('NET:NO_BRG')
            }
            postBiometricToServer(removedPayload)
          }
          return
        }

        if (this._bodyTemp && typeof this._bodyTemp.getCurrent === 'function') {
          try {
            if (
              typeof this._bodyTemp.start === 'function' &&
              ((this._bodyTempStartedAtMs || 0) === 0 || now - (this._bodyTempStartedAtMs || 0) >= 30000) &&
              (this._lastBodyTempAtMs || 0) === 0
            ) {
              this._bodyTemp.start()
              this._bodyTempStartedAtMs = now
            }
            const cur = this._bodyTemp.getCurrent()
            const raw =
              cur && typeof cur.current === 'number'
                ? cur.current
                : cur && typeof cur.value === 'number'
                  ? cur.value
                  : typeof cur === 'number'
                    ? cur
                    : null
            const normalizeTemp = (v) => {
              if (typeof v !== 'number' || !Number.isFinite(v)) return null
              if (v >= 20 && v <= 45) return v
              if (v >= 200 && v <= 450) return v / 10
              if (v >= 2000 && v <= 4500) return v / 100
              if (v >= 20000 && v <= 45000) return v / 1000
              return null
            }
            const temp = normalizeTemp(raw)
            if (typeof temp === 'number') {
              if (this._lastBodyTemp <= 0 || Math.abs(temp - this._lastBodyTemp) <= 1.5) {
                this._lastBodyTemp = temp
                this._lastBodyTempAtMs = now
              }
            }
          } catch (e) {}
        }

        if (this._bodyTemp && typeof this._bodyTemp.current !== 'undefined') {
          const raw = typeof this._bodyTemp.current === 'number' ? this._bodyTemp.current : null
          const normalizeTemp = (v) => {
            if (typeof v !== 'number' || !Number.isFinite(v)) return null
            if (v >= 20 && v <= 45) return v
            if (v >= 200 && v <= 450) return v / 10
            if (v >= 2000 && v <= 4500) return v / 100
            if (v >= 20000 && v <= 45000) return v / 1000
            return null
          }
          const temp = normalizeTemp(raw)
          if (typeof temp === 'number') {
            if (this._lastBodyTemp <= 0 || Math.abs(temp - this._lastBodyTemp) <= 1.5) {
              this._lastBodyTemp = temp
              this._lastBodyTempAtMs = now
            }
          }
        }

        if (this._spo2) {
          const intervalMs = 30000
          const since = this._spo2MeasureStartedAtMs ? now - this._spo2MeasureStartedAtMs : Number.POSITIVE_INFINITY
          const due = now - (this._lastSpO2AtMs || 0) > intervalMs

          if (this._spo2Measuring && since > 45000) {
            this._spo2Measuring = false
            try {
              if (this._spo2.stop) this._spo2.stop()
            } catch (e) {}
          }

          if (!this._spo2Measuring && due) {
            this._spo2Measuring = true
            this._spo2MeasureStartedAtMs = now
            try {
              if (this._spo2.stop) this._spo2.stop()
              if (this._spo2.start) this._spo2.start()
            } catch (e) {
              this._spo2Measuring = false
            }
          }
        }

        let v = 0
        if (typeof rawHr === 'number' && rawHr > 0) v = rawHr

        if (this._value) this._value.text = v > 0 ? String(v) : '0'
        if (!(v > 0)) return
        if (now - (this._lastSentAtMs || 0) < 1000) return
        setFlowDebug(`FLOW:SEND_${String(v)}`)

        const readNumber = (val) => {
          if (typeof val === 'number' && Number.isFinite(val)) return val
          if (val && typeof val === 'object') {
            const candidates = [val.current, val.value, val.level, val.steps]
            for (const c of candidates) {
              if (typeof c === 'number' && Number.isFinite(c)) return c
            }
          }
          return undefined
        }

        let steps = undefined
        try {
          if (this._step && typeof this._step.getCurrent === 'function') steps = readNumber(this._step.getCurrent())
        } catch (e) {}

        let batteryLevel = undefined
        try {
          if (this._battery && typeof this._battery.getCurrent === 'function') batteryLevel = readNumber(this._battery.getCurrent())
        } catch (e) {}

        let acceleration = undefined
        try {
          if (this._acc && typeof this._acc.getCurrent === 'function') acceleration = this._acc.getCurrent()
        } catch (e) {}

        let gyroscope = undefined
        try {
          if (this._gyro && typeof this._gyro.getCurrent === 'function') gyroscope = this._gyro.getCurrent()
        } catch (e) {}

        let barometer = undefined
        try {
          if (this._baro) {
            const airPressure = typeof this._baro.getAirPressure === 'function' ? this._baro.getAirPressure() : undefined
            const altitude = typeof this._baro.getAltitude === 'function' ? this._baro.getAltitude() : undefined
            if (typeof airPressure === 'number' || typeof altitude === 'number') {
              barometer = { airPressure, altitude }
            }
          }
        } catch (e) {}

        const location = this._lastLocation ? this._lastLocation : { lat: 37.5665, lng: 126.978 }

        if (this._details) {
          const spo2AtMs = typeof this._lastSpO2AtMs === 'number' ? this._lastSpO2AtMs : 0
          const spo2Fresh = spo2AtMs > 0 && now - spo2AtMs <= 10 * 60 * 1000
          const spo2Text =
            spo2Fresh && typeof this._lastSpO2 === 'number' && Number.isFinite(this._lastSpO2) && this._lastSpO2 > 0
              ? String(this._lastSpO2)
              : '--'
          const lastAtMs = typeof this._lastBodyTempAtMs === 'number' ? this._lastBodyTempAtMs : 0
          const isFresh = lastAtMs > 0 && now - lastAtMs <= 5 * 60 * 1000
          const tempText =
            isFresh && typeof this._lastBodyTemp === 'number' && this._lastBodyTemp > 0
              ? this._lastBodyTemp.toFixed(1)
              : '--.-'
          const computeLocalStress = () => {
            const hr = typeof v === 'number' && Number.isFinite(v) ? v : 0
            if (!(hr > 0)) return null
            const baseline = 70
            const hrDelta = hr - baseline
            const spO2 = spo2Fresh && typeof this._lastSpO2 === 'number' && Number.isFinite(this._lastSpO2) ? this._lastSpO2 : null
            const temp = isFresh && typeof this._lastBodyTemp === 'number' && Number.isFinite(this._lastBodyTemp) ? this._lastBodyTemp : null

            let score = 20
            if (hrDelta > 0) score += Math.min(40, hrDelta * 1.2)
            if (typeof spO2 === 'number' && spO2 > 0 && spO2 < 95) score += (95 - spO2) * 1.5
            if (typeof temp === 'number' && temp > 0 && temp >= 37.6) score += Math.min(15, (temp - 37.5) * 10)
            return Math.round(Math.min(100, Math.max(0, score)))
          }

          const stressAtMs = typeof this._lastStressAtMs === 'number' ? this._lastStressAtMs : 0
          const stressFresh = stressAtMs > 0 && now - stressAtMs <= 10 * 60 * 1000
          const stressFromServer =
            stressFresh && typeof this._lastStress === 'number' && Number.isFinite(this._lastStress)
              ? Math.round(this._lastStress)
              : null
          const stressFromLocal = computeLocalStress()
          const stressText =
            typeof stressFromServer === 'number'
              ? String(stressFromServer)
              : typeof stressFromLocal === 'number'
                ? String(stressFromLocal)
                : '--'
          const stepsText = typeof steps === 'number' ? String(steps) : '--'
          const battText = typeof batteryLevel === 'number' ? String(batteryLevel) : '--'
          const accText =
            acceleration && typeof acceleration.x === 'number' && typeof acceleration.y === 'number' && typeof acceleration.z === 'number'
              ? `${Math.round(acceleration.x)},${Math.round(acceleration.y)},${Math.round(acceleration.z)}`
              : '--'
          const gyroText =
            gyroscope && typeof gyroscope.x === 'number' && typeof gyroscope.y === 'number' && typeof gyroscope.z === 'number'
              ? `${Math.round(gyroscope.x)},${Math.round(gyroscope.y)},${Math.round(gyroscope.z)}`
              : '--'
          const baroText =
            barometer && (typeof barometer.airPressure === 'number' || typeof barometer.altitude === 'number')
              ? `${typeof barometer.airPressure === 'number' ? barometer.airPressure.toFixed(0) : '--'}hPa/${typeof barometer.altitude === 'number' ? barometer.altitude.toFixed(0) : '--'}m`
              : '--'
          const gpsText =
            location && typeof location.lat === 'number' && typeof location.lng === 'number'
              ? `${location.lat.toFixed(3)},${location.lng.toFixed(3)}`
              : '--'
          const ver = this._appVersionName || '--'
          this._details.text = `O2:${spo2Text}  T:${tempText}  S:${stressText}\nST:${stepsText}  B:${battText}\nA:${accText}  G:${gyroText}\nP:${baroText}  L:${gpsText}\n${this._flowDebug} ${this._networkDebug} V:${ver}`
        }

        const payload = {
          type: 'biometric',
          collectedAt: new Date().toISOString(),
          heartRate: v,
          isWear: this._isWear === true,
          spO2: typeof this._lastSpO2 === 'number' && Number.isFinite(this._lastSpO2) ? this._lastSpO2 : 0,
          bodyTemperature: typeof this._lastBodyTemp === 'number' && Number.isFinite(this._lastBodyTemp) ? this._lastBodyTemp : 0,
          steps: typeof steps === 'number' && Number.isFinite(steps) ? steps : 0,
          batteryLevel: typeof batteryLevel === 'number' && Number.isFinite(batteryLevel) ? batteryLevel : 0,
          acceleration,
          gyroscope,
          barometer,
          location,
        }
        this._lastSentWear = true
        this._lastSentAtMs = now
        if (bridge && typeof bridge.call === 'function') {
          try {
            bridge.call('ingest', payload)
            if ((this._networkAckUntilMs || 0) < Date.now()) {
              let nextNet = 'NET:BRIDGE_OK'
              try {
                if (typeof bridge.getDebugState === 'function') {
                  const st = bridge.getDebugState()
                  const p = st && typeof st.appSidePort === 'number' ? st.appSidePort : 0
                  nextNet = p > 0 ? `NET:PORT_${String(p)}` : 'NET:PORT_0'
                }
              } catch (e) {}
              setNetworkDebug(nextNet)
            }
          } catch (e) {
            setNetworkDebug(`NET:BRIDGE ${String(e && e.message ? e.message : e).slice(0, 8)}`)
          }
        } else {
          setNetworkDebug('NET:NO_BRG')
        }
        postBiometricToServer(payload)
      }, 1000)

      if (this._status) this._status.text = '(주)SK플레이'
    } catch (e) {
      setFlowDebug(`FLOW:CATCH_${String(e && e.message ? e.message : e).slice(0, 10)}`)
      if (this._status) this._status.text = '(주)SK플레이'
    }
  },
  onDestroy() {
    if (this._tick) clearInterval(this._tick)
    if (this._hr && this._hrCb) this._hr.offCurrentChange(this._hrCb)
    try {
      if (this._hr && typeof this._hr.stop === 'function') this._hr.stop()
    } catch (e) {}
    try {
      resetPageBrightTime()
    } catch (e) {}
    try {
      resetDropWristScreenOff()
    } catch (e) {}
    try {
      setWakeUpRelaunch(false)
    } catch (e) {}
    if (this._wear && this._wearCb) this._wear.offChange(this._wearCb)
    const bridge = getApp().globalData.bridge
    if (bridge && this._bridgeCallCb && typeof bridge.off === 'function') bridge.off('ack', this._bridgeCallCb)
    if (this._spo2 && this._spo2Cb && this._spo2.offChange) this._spo2.offChange(this._spo2Cb)
    if (this._spo2 && this._spo2.stop) this._spo2.stop()
    if (this._geo && this._geoCb && this._geo.offChange) this._geo.offChange(this._geoCb)
    if (this._geo && this._geo.stop) this._geo.stop()
    if (this._acc && this._acc.stop) this._acc.stop()
    if (this._gyro && this._gyro.stop) this._gyro.stop()
  },
})
