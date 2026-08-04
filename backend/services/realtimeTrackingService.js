/**
 * 실시간 추적 및 상태 관리 시스템
 * GPS 추적, 상태 업데이트, 자동 알림
 */

const Paramedic = require('../models/Paramedic');
const EmergencyCase = require('../models/EmergencyCase');
const { emitLocationUpdate, emitStatusUpdate } = require('./socketService');
const { calculateDistance, calculateETA } = require('./geoService');
const logger = require('../utils/logger');
const {
  setTrackingStatusSnapshot,
  setTrackingHistory,
  deleteTrackingHistory,
} = require('./realtimeTrackingCacheService');

/**
 * 구조사 위치 추적, ETA 재계산, 도착 감지를 담당하는 실시간 추적 서비스 클래스입니다.
 */
class RealtimeTrackingService {
  
  /**
   * 활성 추적 세션, 위치 이력, ETA 계산 캐시를 초기화합니다.
   */
  constructor() {
    this.trackingIntervals = new Map();  // 활성 추적 세션
    this.locationHistory = new Map();    // 위치 기록
    this.etaCalculations = new Map();    // ETA 계산 캐시
  }

  /**
   * 현재 인메모리 추적 상태 요약을 shared cache에도 병행 기록합니다.
   */
  syncTrackingStatusToCache() {
    const snapshot = this.buildTrackingStatusSnapshot();
    setTrackingStatusSnapshot(snapshot).catch((error) => {
      logger.warn('실시간 추적 상태 cache 동기화 실패', { error: error.message });
    });
    return snapshot;
  }

  /**
   * 현재 인메모리 추적 상태를 외부 조회용 스냅샷 구조로 만듭니다.
   */
  buildTrackingStatusSnapshot() {
    const activeTrackings = [];

    for (const [key, tracking] of this.trackingIntervals) {
      activeTrackings.push({
        trackingKey: key,
        paramedicId: tracking.paramedicId,
        startTime: tracking.startTime,
        duration: new Date() - tracking.startTime,
        lastUpdate: tracking.lastUpdate,
      });
    }

    return {
      totalActiveTrackings: activeTrackings.length,
      trackings: activeTrackings,
      locationHistorySize: this.locationHistory.size,
    };
  }

  /**
   * 응급구조사 실시간 추적 시작
   */
  async startParamedicTracking(emergencyCaseId, paramedicId) {
    try {
      logger.info(`응급구조사 실시간 추적 시작: ${paramedicId}`);

      // 동일 케이스의 중복 interval을 막기 위해 기존 추적 세션은 먼저 정리합니다.
      this.stopTracking(emergencyCaseId);

      // 5초마다 위치 업데이트
      const intervalId = setInterval(async () => {
        await this.updateParamedicLocation(emergencyCaseId, paramedicId);
      }, 5000);

      this.trackingIntervals.set(emergencyCaseId, {
        intervalId,
        paramedicId,
        startTime: new Date(),
        lastUpdate: new Date()
      });
      this.syncTrackingStatusToCache();

      // 초기 위치 조회
      await this.updateParamedicLocation(emergencyCaseId, paramedicId);

    } catch (error) {
      logger.error('응급구조사 추적 시작 실패', error);
    }
  }

  /**
   * 응급구조사 위치 업데이트
   */
  async updateParamedicLocation(emergencyCaseId, paramedicId) {
    try {
      // 응급구조사 현재 위치 조회
      const paramedic = await Paramedic.findById(paramedicId)
        .select('currentLocation status lastLocationUpdate')
        .lean();

      if (!paramedic || !paramedic.currentLocation) {
        return;
      }

      // 응급 케이스 정보 조회
      const emergencyCase = await EmergencyCase.findById(emergencyCaseId)
        .select('locations userId')
        .lean();

      if (!emergencyCase) {
        this.stopTracking(emergencyCaseId);
        return;
      }

      const targetLocation = emergencyCase.locations.current;
      const paramedicLocation = paramedic.currentLocation;

      // 거리 및 ETA 계산
      const distance = calculateDistance(paramedicLocation, targetLocation);
      const eta = calculateETA(paramedicLocation, targetLocation, 'emergency');

      // 위치 기록 저장
      this.recordLocationHistory(emergencyCaseId, {
        timestamp: new Date(),
        paramedicLocation,
        targetLocation,
        distance,
        eta,
        paramedicStatus: paramedic.status
      });

      // 실시간 위치 업데이트 전송
      emitLocationUpdate(emergencyCaseId, {
        paramedicId,
        location: paramedicLocation,
        distance: Math.round(distance),
        eta: Math.round(eta),
        status: paramedic.status,
        lastUpdate: new Date()
      });

      // 현장 도착은 GPS 오차를 감안해 50m 이내에서 자동 판정합니다.
      if (distance < 50 && paramedic.status !== 'arrived') {
        await this.handleArrivalDetection(emergencyCaseId, paramedicId);
      }

      // ETA 지연 감지
      await this.checkETADelay(emergencyCaseId, eta);

    } catch (error) {
      logger.warn('위치 업데이트 실패', error, { emergencyCaseId, paramedicId });
    }
  }

  /**
   * 도착 자동 감지
   */
  async handleArrivalDetection(emergencyCaseId, paramedicId) {
    logger.info(`도착 자동 감지: ${paramedicId}`);

    try {
      // 응급구조사 상태 업데이트
      await Paramedic.findByIdAndUpdate(paramedicId, {
        status: 'arrived',
        arrivedAt: new Date()
      });

      // 응급 케이스 상태 업데이트
      await EmergencyCase.findByIdAndUpdate(emergencyCaseId, {
        'paramedic.status': 'arrived',
        'paramedic.arrivedAt': new Date()
      });

      // 워크플로우 서비스에 도착 알림
      const emergencyWorkflowService = require('./emergencyWorkflowService');
      await emergencyWorkflowService.handleParamedicArrival(emergencyCaseId, paramedicId);

      // 추적 중단
      this.stopTracking(emergencyCaseId);

    } catch (error) {
      logger.error('도착 처리 실패', error);
    }
  }

  /**
   * ETA 지연 감지
   */
  async checkETADelay(emergencyCaseId, currentETA) {
    const tracking = this.trackingIntervals.get(emergencyCaseId);
    if (!tracking) return;

    const elapsedMinutes = (new Date() - tracking.startTime) / (1000 * 60);
    const expectedArrival = 8; // 8분 골든타임

    if (elapsedMinutes > expectedArrival && currentETA > 3) {
      logger.warn(`ETA 지연 감지: ${emergencyCaseId}`, {
        elapsedMinutes: Math.round(elapsedMinutes),
        currentETA: Math.round(currentETA)
      });

      // 골든타임을 넘겼는데도 ETA가 남아 있으면 대체 구조사 검토 경고를 띄웁니다.
      emitStatusUpdate(emergencyCaseId, {
        type: 'eta_delay_warning',
        message: `예상 도착이 ${Math.round(currentETA)}분 지연되고 있습니다.`,
        delayMinutes: Math.round(currentETA - expectedArrival),
        recommendAction: '대체 응급구조사 검토 권고'
      });
    }
  }

  /**
   * 이송 중 실시간 추적
   */
  async startTransportTracking(emergencyCaseId) {
    logger.info(`이송 추적 시작: ${emergencyCaseId}`);

    const emergencyCase = await EmergencyCase.findById(emergencyCaseId)
      .populate('paramedic.paramedicId', 'currentLocation')
      .lean();

    if (!emergencyCase?.paramedic?.paramedicId) return;

    const paramedicId = emergencyCase.paramedic.paramedicId._id;
    const hospitalLocation = emergencyCase.hospital?.location;

    if (!hospitalLocation) return;

    // 현장 추적과 별도로 병원 목적지 기준 transport 세션을 따로 유지합니다.
    const transportIntervalId = setInterval(async () => {
      await this.updateTransportProgress(emergencyCaseId, paramedicId, hospitalLocation);
    }, 10000); // 10초마다 업데이트

    this.trackingIntervals.set(`${emergencyCaseId}_transport`, {
      intervalId: transportIntervalId,
      paramedicId,
      destination: hospitalLocation,
      startTime: new Date()
    });
  }

  /**
   * 이송 진행상황 업데이트
   */
  async updateTransportProgress(emergencyCaseId, paramedicId, hospitalLocation) {
    try {
      const paramedic = await Paramedic.findById(paramedicId)
        .select('currentLocation')
        .lean();

      if (!paramedic?.currentLocation) return;

      const distance = calculateDistance(paramedic.currentLocation, hospitalLocation);
      const eta = calculateETA(paramedic.currentLocation, hospitalLocation, 'emergency');

      // 실시간 이송 상태 전송
      emitLocationUpdate(emergencyCaseId, {
        type: 'transport_progress',
        paramedicLocation: paramedic.currentLocation,
        hospitalLocation,
        distance: Math.round(distance),
        eta: Math.round(eta),
        progress: Math.max(0, Math.min(100, (1 - (distance / 10000)) * 100)) // 10km 기준 진행률
      });

      // 병원 건물/진입로 오차를 고려해 병원 도착은 100m 임계값을 사용합니다.
      if (distance < 100) {
        await this.handleHospitalArrival(emergencyCaseId, paramedicId);
      }

    } catch (error) {
      logger.warn('이송 진행상황 업데이트 실패', error);
    }
  }

  /**
   * 병원 도착 처리
   */
  async handleHospitalArrival(emergencyCaseId, paramedicId) {
    logger.info(`병원 도착 감지: ${emergencyCaseId}`);

    try {
      // 이송 추적 중단
      this.stopTracking(`${emergencyCaseId}_transport`);

      // 상태 업데이트
      await EmergencyCase.findByIdAndUpdate(emergencyCaseId, {
        'hospital.arrivedAt': new Date(),
        status: 'hospital_arrived'
      });

      // 워크플로우 서비스에 알림
      const emergencyWorkflowService = require('./emergencyWorkflowService');
      await emergencyWorkflowService.handleHospitalArrival(emergencyCaseId);

    } catch (error) {
      logger.error('병원 도착 처리 실패', error);
    }
  }

  /**
   * 위치 기록 저장
   */
  recordLocationHistory(emergencyCaseId, locationData) {
    if (!this.locationHistory.has(emergencyCaseId)) {
      this.locationHistory.set(emergencyCaseId, []);
    }
    
    const history = this.locationHistory.get(emergencyCaseId);
    history.push(locationData);
    
    // 최근 100개 기록만 유지
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    setTrackingHistory(emergencyCaseId, history).catch((error) => {
      logger.warn('실시간 추적 위치 기록 cache 저장 실패', {
        emergencyCaseId,
        error: error.message,
      });
    });
  }

  /**
   * 추적 중단
   */
  stopTracking(trackingKey) {
    const tracking = this.trackingIntervals.get(trackingKey);
    if (tracking) {
      clearInterval(tracking.intervalId);
      this.trackingIntervals.delete(trackingKey);
      this.locationHistory.delete(trackingKey);
      deleteTrackingHistory(trackingKey).catch((error) => {
        logger.warn('실시간 추적 위치 기록 cache 삭제 실패', {
          trackingKey,
          error: error.message,
        });
      });
      this.syncTrackingStatusToCache();
      logger.info(`추적 중단: ${trackingKey}`);
    }
  }

  /**
   * 전체 추적 상태 조회
   */
  getTrackingStatus() {
    return this.buildTrackingStatusSnapshot();
  }

  /**
   * 응급 상황별 추적 우선순위 조정
   */
  adjustTrackingFrequency(emergencyCaseId, emergencyLevel) {
    const tracking = this.trackingIntervals.get(emergencyCaseId);
    if (!tracking) return;

    // 응급도에 따라 추적 주기 조정
    let newInterval = 5000; // 기본 5초

    switch (emergencyLevel) {
      case 5:
        newInterval = 2000; // 2초 (최고 우선순위)
        break;
      case 4:
        newInterval = 3000; // 3초
        break;
      case 3:
        newInterval = 5000; // 5초
        break;
      default:
        newInterval = 10000; // 10초
    }

    // 응급도 변경 시 같은 trackingKey를 유지한 채 interval만 교체합니다.
    clearInterval(tracking.intervalId);
    
    const newIntervalId = setInterval(async () => {
      await this.updateParamedicLocation(emergencyCaseId, tracking.paramedicId);
    }, newInterval);

    tracking.intervalId = newIntervalId;
    this.syncTrackingStatusToCache();
    
    logger.info(`추적 주기 조정: ${emergencyCaseId}`, {
      emergencyLevel,
      intervalMs: newInterval
    });
  }
}

/**
 * 서버 전역에서 재사용하는 실시간 추적 싱글톤 인스턴스입니다.
 */
const realtimeTrackingService = new RealtimeTrackingService();

module.exports = realtimeTrackingService;
