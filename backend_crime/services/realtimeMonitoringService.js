/**
 * 실시간 모니터링 시스템
 * STARMAX BLE 데이터 실시간 처리 및 응급 상황 모니터링
 */

const WebSocket = require('ws');
const starmaxDataService = require('./starmaxDataService');
const { autoMatchParamedicForCase } = require('./matchingService');
const logger = require('../utils/logger');

class RealtimeMonitoringService {
  constructor() {
    this.activeMonitors = new Map(); // userId -> monitorInfo
    this.wsClients = new Map(); // userId -> WebSocket client
    this.monitoringInterval = 30000; // 30초마다 체크
    this.emergencyCheckInterval = 10000; // 10초마다 응급 체크
    this.isRunning = false;
  }

  /**
   * 실시간 모니터링 시작
   */
  startMonitoring() {
    if (this.isRunning) {
      logger.warn('실시간 모니터링이 이미 실행 중입니다.');
      return;
    }

    this.isRunning = true;
    logger.info('실시간 모니터링 시스템 시작');

    // 주기적 모니터링
    this.monitoringTimer = setInterval(() => {
      this.performMonitoring();
    }, this.monitoringInterval);

    // 응급 상황 체크
    this.emergencyTimer = setInterval(() => {
      this.checkEmergencySituations();
    }, this.emergencyCheckInterval);
  }

  /**
   * 실시간 모니터링 중지
   */
  stopMonitoring() {
    this.isRunning = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    if (this.emergencyTimer) {
      clearInterval(this.emergencyTimer);
      this.emergencyTimer = null;
    }

    logger.info('실시간 모니터링 시스템 중지');
  }

  /**
   * 사용자 모니터링 등록
   */
  registerUser(userId, wsClient = null) {
    if (!this.activeMonitors.has(userId)) {
      this.activeMonitors.set(userId, {
        userId,
        startTime: new Date(),
        lastDataTime: new Date(),
        emergencyLevel: 1,
        alertCount: 0,
        wsClient
      });

      if (wsClient) {
        this.wsClients.set(userId, wsClient);
      }

      logger.info(`사용자 모니터링 등록: ${userId}`);
    }
  }

  /**
   * 사용자 모니터링 해제
   */
  unregisterUser(userId) {
    this.activeMonitors.delete(userId);
    this.wsClients.delete(userId);
    logger.info(`사용자 모니터링 해제: ${userId}`);
  }

  /**
   * STARMAX 데이터 수신 처리
   */
  async processRealtimeData(userId, data) {
    try {
      // 실시간 데이터 처리
      const result = await starmaxDataService.processStarmaxData(userId, data);
      
      if (result.success) {
        // 모니터링 정보 업데이트
        const monitorInfo = this.activeMonitors.get(userId);
        if (monitorInfo) {
          monitorInfo.lastDataTime = new Date();
          monitorInfo.emergencyLevel = result.data.emergencyLevel;
          
          // WebSocket으로 실시간 데이터 전송
          this.sendRealtimeData(userId, {
            type: 'biometric_update',
            data: result.data
          });
        }

        // 응급 상황 알림
        if (result.data.emergencyLevel >= 3) {
          this.handleEmergencyAlert(userId, result.data);
        }
      }

      return result;
    } catch (error) {
      logger.error(`실시간 데이터 처리 오류: ${userId}`, error);
      throw error;
    }
  }

  /**
   * 주기적 모니터링 수행
   */
  async performMonitoring() {
    try {
      const now = new Date();
      
      for (const [userId, monitorInfo] of this.activeMonitors) {
        // 데이터 수신 시간 체크 (5분 이상 미수신 시 경고)
        const timeSinceLastData = now - monitorInfo.lastDataTime;
        if (timeSinceLastData > 5 * 60 * 1000) {
          logger.warn(`데이터 수신 중단: ${userId} - ${Math.floor(timeSinceLastData / 1000 / 60)}분 경과`);
          
          this.sendAlert(userId, {
            type: 'data_timeout',
            message: '기기에서 데이터가 수신되지 않습니다. 기기 연결 상태를 확인해주세요.',
            severity: 'warning'
          });
        }

        // 배터리 상태 체크 (STARMAX 기기)
        // TODO: STARMAX 기기 배터리 정보 수신
        
        // 건강 상태 종합 평가
        await this.assessHealthStatus(userId, monitorInfo);
      }
    } catch (error) {
      logger.error('주기적 모니터링 오류:', error);
    }
  }

  /**
   * 응급 상황 체크
   */
  async checkEmergencySituations() {
    try {
      for (const [userId, monitorInfo] of this.activeMonitors) {
        if (monitorInfo.emergencyLevel >= 3) {
          // 활성 응급 상황 확인
          const EmergencyCase = require('../models/EmergencyCase');
          const activeEmergency = await EmergencyCase.findOne({
            userId,
            status: { $in: ['detected', 'matched', 'in_progress'] }
          }).sort({ createdAt: -1 });

          if (activeEmergency) {
            // 응급 상황 업데이트
            this.updateEmergencyStatus(userId, activeEmergency);
          }
        }
      }
    } catch (error) {
      logger.error('응급 상황 체크 오류:', error);
    }
  }

  /**
   * 응급 상황 처리
   */
  async handleEmergencyAlert(userId, data) {
    try {
      logger.warn(`응급 상황 감지: ${userId} - 레벨 ${data.emergencyLevel}`);

      // WebSocket으로 응급 알림 전송
      this.sendAlert(userId, {
        type: 'emergency_detected',
        message: `응급 상황이 감지되었습니다. (레벨 ${data.emergencyLevel})`,
        severity: data.emergencyLevel >= 4 ? 'critical' : 'high',
        data: data
      });

      // 추가 응급 처리 로직
      if (data.emergencyLevel >= 4) {
        // 즉시 응급 조치
        this.triggerEmergencyResponse(userId, data);
      }
    } catch (error) {
      logger.error(`응급 상황 처리 오류: ${userId}`, error);
    }
  }

  /**
   * 응급 대응 트리거
   */
  async triggerEmergencyResponse(userId, data) {
    try {
      // 자동 매칭 시작
      const EmergencyCase = require('../models/EmergencyCase');
      const recentEmergency = await EmergencyCase.findOne({
        userId,
        status: { $in: ['detected', 'matched', 'in_progress'] }
      }).sort({ createdAt: -1 });

      if (recentEmergency) {
        autoMatchParamedicForCase(recentEmergency._id);
        logger.info(`자동 매칭 시작: ${userId} - ${recentEmergency._id}`);
      }

      // 추가 응급 대응 로직 추가 가능
      // - 보호자 알림
      // - 119 신고
      // - 위치 정보 전송
      
    } catch (error) {
      logger.error(`응급 대응 트리거 오류: ${userId}`, error);
    }
  }

  /**
   * 건강 상태 종합 평가
   */
  async assessHealthStatus(userId, monitorInfo) {
    try {
      // 최근 생체 데이터 조회
      const starmaxDataService = require('./starmaxDataService');
      const recentData = await starmaxDataService.getRecentBiometricData(userId, 10, 1);
      
      if (recentData.success && recentData.data.biometricData.length > 0) {
        const data = recentData.data.biometricData[0];
        
        // 트렌드 분석
        const trendAnalysis = this.analyzeHealthTrend(recentData.data.biometricData);
        
        if (trendAnalysis.hasConcerningTrend) {
          this.sendAlert(userId, {
            type: 'health_trend',
            message: trendAnalysis.message,
            severity: 'medium',
            data: trendAnalysis
          });
        }
      }
    } catch (error) {
      logger.error(`건강 상태 평가 오류: ${userId}`, error);
    }
  }

  /**
   * 건강 트렌드 분석
   */
  analyzeHealthTrend(data) {
    if (data.length < 3) {
      return { hasConcerningTrend: false };
    }

    // 심박수 트렌드 분석
    const heartRates = data.map(d => d.heartRate).filter(hr => hr != null);
    if (heartRates.length >= 3) {
      const avgHR = heartRates.reduce((a, b) => a + b, 0) / heartRates.length;
      const recentHR = heartRates.slice(0, 3);
      const avgRecentHR = recentHR.reduce((a, b) => a + b, 0) / recentHR.length;
      
      if (avgRecentHR > avgHR * 1.2) {
        return {
          hasConcerningTrend: true,
          message: '심박수가 지속적으로 증가하고 있습니다.',
          type: 'heart_rate_increase',
          data: { avgHR, avgRecentHR }
        };
      }
    }

    return { hasConcerningTrend: false };
  }

  /**
   * 실시간 데이터 WebSocket 전송
   */
  sendRealtimeData(userId, data) {
    const wsClient = this.wsClients.get(userId);
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(JSON.stringify(data));
    }
  }

  /**
   * 알림 WebSocket 전송
   */
  sendAlert(userId, alert) {
    const wsClient = this.wsClients.get(userId);
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(JSON.stringify({
        type: 'alert',
        alert: alert,
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * 응급 상황 상태 업데이트
   */
  async updateEmergencyStatus(userId, emergencyCase) {
    try {
      this.sendRealtimeData(userId, {
        type: 'emergency_status',
        data: {
          emergencyId: emergencyCase._id,
          status: emergencyCase.status,
          emergencyLevel: emergencyCase.emergencyLevel,
          paramedic: emergencyCase.paramedic,
          hospital: emergencyCase.hospital,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error(`응급 상황 상태 업데이트 오류: ${userId}`, error);
    }
  }

  /**
   * 통계 정보 제공
   */
  getStatistics() {
    return {
      activeUsers: this.activeMonitors.size,
      wsConnections: this.wsClients.size,
      emergencyCases: Array.from(this.activeMonitors.values()).filter(m => m.emergencyLevel >= 3).length,
      isRunning: this.isRunning,
      uptime: process.uptime()
    };
  }
}

// 싱글톤 인스턴스
const realtimeMonitoringService = new RealtimeMonitoringService();

module.exports = realtimeMonitoringService;