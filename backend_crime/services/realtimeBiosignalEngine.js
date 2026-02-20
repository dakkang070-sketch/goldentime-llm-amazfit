/**
 * 실시간 생체신호 분석 엔진 (Real-time Biosignal Analysis Engine)
 * 연속적인 생체신호 스트리밍 데이터 실시간 분석 및 응급상황 즉시 감지
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');
const { emitEmergencyAlert, emitBiosignalAlert } = require('./socketService');

class RealtimeBiosignalEngine extends EventEmitter {
  
  constructor() {
    super();
    
    // 활성 스트림 관리
    this.activeStreams = new Map(); // userId -> StreamProcessor
    this.signalBuffer = new Map();   // userId -> RingBuffer (최근 데이터)
    this.analysisWindows = new Map(); // userId -> AnalysisWindow
    
    // 분석 설정
    this.config = {
      // 샘플링 주파수 (Hz)
      samplingRates: {
        ecg: 250,        // ECG: 250Hz
        ppg: 100,        // PPG: 100Hz 
        accelerometer: 50, // 가속도계: 50Hz
        temperature: 1,   // 체온: 1Hz
        spo2: 1          // SpO2: 1Hz
      },
      
      // 분석 윈도우 크기
      windowSizes: {
        heartRate: 10,    // 10초 윈도우
        hrv: 60,         // 1분 윈도우 (HRV)
        arrhythmia: 30,  // 30초 윈도우 (부정맥)
        activity: 5,     // 5초 윈도우 (활동)
        fall: 2          // 2초 윈도우 (낙상)
      },
      
      // 임계치 설정
      emergencyThresholds: {
        heartRate: { min: 40, max: 150, criticalMin: 30, criticalMax: 180 },
        spo2: { min: 90, critical: 85 },
        temperature: { min: 35.0, max: 38.5, critical: 40.0 },
        movement: { fallThreshold: 2.5, inactivityMinutes: 30 },
        hrv: { lowThreshold: 20, criticalThreshold: 10 }
      },
      
      // 신호 품질 기준
      qualityThresholds: {
        snr: 10,           // Signal-to-Noise Ratio (dB)
        artifactRatio: 0.1, // 10% 이하 artifacts
        continuity: 0.95    // 95% 이상 연속성
      }
    };
    
    // 분석 알고리즘 모듈
    this.algorithms = {
      ecg: new ECGAnalyzer(this.config),
      ppg: new PPGAnalyzer(this.config),
      bloodPressure: new BloodPressureAnalyzer(this.config),
      bloodGlucose: new BloodGlucoseAnalyzer(this.config),
      bodyTemperature: new BodyTemperatureAnalyzer(this.config),
      activity: new ActivityAnalyzer(this.config),
      fusion: new SensorFusionAnalyzer(this.config)
    };
    
    // 성능 모니터링
    this.performanceMetrics = {
      totalStreams: 0,
      processedSamples: 0,
      detectedEvents: 0,
      averageLatency: 0,
      lastResetTime: Date.now()
    };
    
    logger.info('🔬 실시간 생체신호 분석 엔진 초기화 완료');
  }

  /**
   * 사용자 생체신호 스트림 시작
   */
  async startUserStream(userId, deviceId, signalTypes = ['ecg', 'ppg', 'accelerometer']) {
    try {
      if (this.activeStreams.has(userId)) {
        await this.stopUserStream(userId);
      }

      // 스트림 프로세서 생성
      const streamProcessor = new BiosignalStreamProcessor(userId, deviceId, signalTypes, this.config);
      
      // 링 버퍼 초기화 (최근 5분간 데이터 유지)
      const bufferSize = Math.max(...Object.values(this.config.samplingRates)) * 300; // 5분
      this.signalBuffer.set(userId, new RingBuffer(bufferSize));
      
      // 분석 윈도우 초기화
      this.analysisWindows.set(userId, new AnalysisWindowManager(this.config));

      // 이벤트 리스너 설정
      streamProcessor.on('data', (signalData) => {
        this.processRealtimeData(userId, signalData);
      });
      
      streamProcessor.on('emergency', (emergencyEvent) => {
        this.handleEmergencyDetection(userId, emergencyEvent);
      });
      
      streamProcessor.on('quality', (qualityMetrics) => {
        this.handleSignalQuality(userId, qualityMetrics);
      });
      
      streamProcessor.on('error', (error) => {
        logger.error(`스트림 처리 오류 [${userId}]:`, error);
        this.handleStreamError(userId, error);
      });

      this.activeStreams.set(userId, streamProcessor);
      this.performanceMetrics.totalStreams++;

      // 스트림 시작
      await streamProcessor.start();

      logger.info(`실시간 생체신호 스트림 시작: ${userId}`, {
        deviceId,
        signalTypes,
        samplingRates: signalTypes.map(type => `${type}:${this.config.samplingRates[type]}Hz`)
      });

      return {
        success: true,
        userId,
        deviceId,
        signalTypes,
        message: '실시간 생체신호 모니터링이 시작되었습니다.'
      };

    } catch (error) {
      logger.error('생체신호 스트림 시작 실패', error, { userId, deviceId });
      throw error;
    }
  }

  /**
   * 실시간 데이터 처리 (핵심 엔진)
   */
  async processRealtimeData(userId, signalData) {
    try {
      const startTime = Date.now();
      
      // 1. 데이터 버퍼에 저장
      const buffer = this.signalBuffer.get(userId);
      if (!buffer) return;
      
      buffer.push({
        timestamp: signalData.timestamp,
        signals: signalData.signals,
        metadata: signalData.metadata
      });

      // 2. 분석 윈도우 업데이트
      const windowManager = this.analysisWindows.get(userId);
      windowManager.addData(signalData);

      // 3. 신호별 실시간 분석 수행
      const analysisResults = {};

      // ECG 분석
      if (signalData.signals.ecg) {
        analysisResults.ecg = await this.algorithms.ecg.analyzeRealtime(
          windowManager.getWindow('heartRate'), 
          signalData.signals.ecg
        );
      }

      // PPG 분석
      if (signalData.signals.ppg) {
        analysisResults.ppg = await this.algorithms.ppg.analyzeRealtime(
          windowManager.getWindow('heartRate'),
          signalData.signals.ppg
        );
      }

      // 혈압 분석 (새로 추가)
      if (signalData.signals.bloodPressure) {
        analysisResults.bloodPressure = await this.analyzeBloodPressure(
          signalData.signals.bloodPressure
        );
      }

      // 혈당 분석 (새로 추가)
      if (signalData.signals.bloodGlucose) {
        analysisResults.bloodGlucose = await this.analyzeBloodGlucose(
          signalData.signals.bloodGlucose
        );
      }

      // 체온 분석 (새로 추가)
      if (signalData.signals.bodyTemperature) {
        analysisResults.bodyTemperature = await this.analyzeBodyTemperature(
          signalData.signals.bodyTemperature
        );
      }

      // 활동 분석
      if (signalData.signals.accelerometer) {
        analysisResults.activity = await this.algorithms.activity.analyzeRealtime(
          windowManager.getWindow('activity'),
          signalData.signals.accelerometer
        );
      }

      // 4. 센서 융합 분석
      const fusionResult = this.algorithms.fusion.analyze(analysisResults, signalData);

      // 5. 응급상황 검출
      const emergencyDetection = this.detectEmergencyConditions(userId, fusionResult, analysisResults);

      // 6. 실시간 결과 브로드캐스트
      this.broadcastRealtimeResults(userId, {
        timestamp: signalData.timestamp,
        vitals: this.extractVitalSigns(analysisResults),
        status: emergencyDetection.status,
        alerts: emergencyDetection.alerts,
        quality: this.assessSignalQuality(signalData),
        fusion: fusionResult
      });

      // 7. 성능 메트릭 업데이트
      this.performanceMetrics.processedSamples++;
      this.performanceMetrics.averageLatency = 
        (this.performanceMetrics.averageLatency + (Date.now() - startTime)) / 2;

      // 8. 응급상황 즉시 처리
      if (emergencyDetection.isEmergency) {
        await this.triggerEmergencyResponse(userId, emergencyDetection);
      }

    } catch (error) {
      logger.error(`실시간 데이터 처리 실패 [${userId}]:`, error);
    }
  }

  /**
   * 응급상황 조건 검출
   */
  detectEmergencyConditions(userId, fusionResult, analysisResults) {
    const alerts = [];
    let maxSeverity = 0;
    let isEmergency = false;

    const thresholds = this.config.emergencyThresholds;

    // 1. 심박수 이상
    if (analysisResults.ecg?.heartRate || analysisResults.ppg?.heartRate) {
      const hr = analysisResults.ecg?.heartRate || analysisResults.ppg?.heartRate;
      
      if (hr < thresholds.heartRate.criticalMin || hr > thresholds.heartRate.criticalMax) {
        alerts.push({
          type: 'critical_heart_rate',
          value: hr,
          severity: 5,
          message: `심각한 심박수 이상: ${hr}bpm`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 5);
        isEmergency = true;
      } else if (hr < thresholds.heartRate.min || hr > thresholds.heartRate.max) {
        alerts.push({
          type: 'abnormal_heart_rate',
          value: hr,
          severity: 3,
          message: `심박수 이상: ${hr}bpm`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 3);
      }
    }

    // 2. 부정맥 감지
    if (analysisResults.ecg?.arrhythmia) {
      const arrhythmia = analysisResults.ecg.arrhythmia;
      
      if (arrhythmia.type !== 'normal') {
        const severity = this.getArrhythmiaSeverity(arrhythmia.type);
        alerts.push({
          type: 'arrhythmia',
          value: arrhythmia.type,
          severity,
          message: `부정맥 감지: ${arrhythmia.type}`,
          confidence: arrhythmia.confidence,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, severity);
        if (severity >= 4) isEmergency = true;
      }
    }

    // 3. 산소포화도 이상
    if (analysisResults.ppg?.spo2) {
      const spo2 = analysisResults.ppg.spo2;
      
      if (spo2 < thresholds.spo2.critical) {
        alerts.push({
          type: 'critical_hypoxia',
          value: spo2,
          severity: 5,
          message: `심각한 저산소증: ${spo2}%`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 5);
        isEmergency = true;
      } else if (spo2 < thresholds.spo2.min) {
        alerts.push({
          type: 'hypoxia',
          value: spo2,
          severity: 3,
          message: `저산소증: ${spo2}%`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 3);
      }
    }

    // 4. 낙상 감지
    if (analysisResults.activity?.fallDetected) {
      alerts.push({
        type: 'fall_detected',
        value: analysisResults.activity.fallMagnitude,
        severity: 4,
        message: `낙상 감지 (강도: ${analysisResults.activity.fallMagnitude.toFixed(2)}g)`,
        confidence: analysisResults.activity.fallConfidence,
        timestamp: Date.now()
      });
      maxSeverity = Math.max(maxSeverity, 4);
      isEmergency = true;
    }

    // 5. 무활동 감지 (장시간)
    if (analysisResults.activity?.prolongedInactivity) {
      const inactivityMinutes = analysisResults.activity.inactivityDuration;
      if (inactivityMinutes > thresholds.movement.inactivityMinutes) {
        alerts.push({
          type: 'prolonged_inactivity',
          value: inactivityMinutes,
          severity: 2,
          message: `장시간 무활동: ${inactivityMinutes}분`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 2);
      }
    }

    // 6. 혈압 이상 감지
    if (analysisResults.bloodPressure) {
      const bp = analysisResults.bloodPressure;
      
      if (bp.systolic >= 180 || bp.diastolic >= 110) {
        alerts.push({
          type: 'critical_hypertension',
          value: `${bp.systolic}/${bp.diastolic}`,
          severity: 5,
          message: `고혈압 위기: ${bp.systolic}/${bp.diastolic} mmHg`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 5);
        isEmergency = true;
      } else if (bp.systolic >= 140 || bp.diastolic >= 90) {
        alerts.push({
          type: 'hypertension',
          value: `${bp.systolic}/${bp.diastolic}`,
          severity: 3,
          message: `고혈압: ${bp.systolic}/${bp.diastolic} mmHg`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 3);
      } else if (bp.systolic <= 90 || bp.diastolic <= 60) {
        alerts.push({
          type: 'hypotension',
          value: `${bp.systolic}/${bp.diastolic}`,
          severity: 2,
          message: `저혈압: ${bp.systolic}/${bp.diastolic} mmHg`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 2);
      }
    }

    // 7. 혈당 이상 감지
    if (analysisResults.bloodGlucose) {
      const glucose = analysisResults.bloodGlucose;
      
      if (glucose >= 250) {
        alerts.push({
          type: 'critical_hyperglycemia',
          value: glucose,
          severity: 5,
          message: `위험한 고혈당: ${glucose} mg/dL`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 5);
        isEmergency = true;
      } else if (glucose >= 126) {
        alerts.push({
          type: 'hyperglycemia',
          value: glucose,
          severity: 3,
          message: `고혈당: ${glucose} mg/dL`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 3);
      } else if (glucose <= 70) {
        alerts.push({
          type: 'hypoglycemia',
          value: glucose,
          severity: 4,
          message: `저혈당: ${glucose} mg/dL`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 4);
        isEmergency = true;
      }
    }

    // 8. 체온 이상 감지
    if (analysisResults.bodyTemperature) {
      const temp = analysisResults.bodyTemperature;
      
      if (temp >= 40.0) {
        alerts.push({
          type: 'critical_hyperthermia',
          value: temp,
          severity: 5,
          message: `위험한 고열: ${temp.toFixed(1)}°C`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 5);
        isEmergency = true;
      } else if (temp >= 38.0) {
        alerts.push({
          type: 'hyperthermia',
          value: temp,
          severity: 3,
          message: `고열: ${temp.toFixed(1)}°C`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 3);
      } else if (temp <= 35.0) {
        alerts.push({
          type: 'hypothermia',
          value: temp,
          severity: 4,
          message: `저체온: ${temp.toFixed(1)}°C`,
          timestamp: Date.now()
        });
        maxSeverity = Math.max(maxSeverity, 4);
        isEmergency = true;
      }
    }

    // 6. 융합 분석 기반 위험도
    if (fusionResult.riskLevel >= 4) {
      alerts.push({
        type: 'high_risk_pattern',
        value: fusionResult.riskLevel,
        severity: fusionResult.riskLevel,
        message: `고위험 패턴 감지 (위험도: ${fusionResult.riskLevel}/5)`,
        patterns: fusionResult.detectedPatterns,
        timestamp: Date.now()
      });
      maxSeverity = Math.max(maxSeverity, fusionResult.riskLevel);
      if (fusionResult.riskLevel === 5) isEmergency = true;
    }

    return {
      isEmergency,
      maxSeverity,
      alerts,
      status: this.getHealthStatus(maxSeverity),
      riskLevel: fusionResult.riskLevel || 1,
      confidence: fusionResult.confidence || 0.5
    };
  }

  /**
   * 응급상황 즉시 대응 트리거
   */
  async triggerEmergencyResponse(userId, emergencyDetection) {
    try {
      logger.warn(`🚨 응급상황 감지 [${userId}]:`, {
        severity: emergencyDetection.maxSeverity,
        alertCount: emergencyDetection.alerts.length,
        alerts: emergencyDetection.alerts.map(a => a.type)
      });

      // 1. 즉시 Socket.IO 알림
      emitEmergencyAlert(userId, {
        type: 'realtime_emergency',
        severity: emergencyDetection.maxSeverity,
        alerts: emergencyDetection.alerts,
        detectedAt: new Date(),
        source: 'realtime_biosignal_engine'
      });

      // 2. 응급 케이스 자동 생성 (analyzerService 연동)
      const analyzerService = require('./analyzerService');
      
      // 최근 생체 데이터 추출
      const recentData = this.extractRecentBiometricData(userId);
      
      // 실시간 응급상황 처리 (전용 함수 사용)
      await analyzerService.processRealtimeEmergencyDetection(
        userId, 
        emergencyDetection.alerts, 
        recentData
      );

      // 3. 성능 메트릭 업데이트
      this.performanceMetrics.detectedEvents++;

      // 4. 이벤트 발생
      this.emit('emergency_detected', {
        userId,
        emergencyDetection,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error(`응급상황 대응 트리거 실패 [${userId}]:`, error);
    }
  }

  /**
   * 실시간 결과 브로드캐스트
   */
  broadcastRealtimeResults(userId, results) {
    try {
      // Socket.IO로 실시간 생체신호 데이터 전송
      emitBiosignalAlert(userId, {
        type: 'realtime_vitals',
        data: {
          timestamp: results.timestamp,
          heartRate: results.vitals.heartRate,
          spo2: results.vitals.spo2,
          bloodPressure: results.vitals.bloodPressure,
          temperature: results.vitals.temperature,
          activity: results.vitals.activity,
          hrv: results.vitals.hrv,
          status: results.status,
          quality: results.quality,
          alerts: results.alerts.length > 0 ? results.alerts : null
        },
        source: 'realtime_biosignal_engine'
      });

    } catch (error) {
      logger.warn(`실시간 결과 브로드캐스트 실패 [${userId}]:`, error);
    }
  }

  /**
   * 생체신호 품질 평가
   */
  assessSignalQuality(signalData) {
    const quality = {
      overall: 'good',
      scores: {},
      issues: []
    };

    try {
      const thresholds = this.config.qualityThresholds;

      // ECG 품질
      if (signalData.signals.ecg) {
        const ecgQuality = this.algorithms.ecg.assessQuality(signalData.signals.ecg);
        quality.scores.ecg = ecgQuality.score;
        
        if (ecgQuality.score < thresholds.snr) {
          quality.issues.push('ECG 신호 품질 저하');
        }
      }

      // PPG 품질
      if (signalData.signals.ppg) {
        const ppgQuality = this.algorithms.ppg.assessQuality(signalData.signals.ppg);
        quality.scores.ppg = ppgQuality.score;
        
        if (ppgQuality.score < thresholds.snr) {
          quality.issues.push('PPG 신호 품질 저하');
        }
      }

      // 전체 품질 등급 결정
      const avgScore = Object.values(quality.scores).reduce((sum, score) => sum + score, 0) / Object.keys(quality.scores).length;
      
      if (avgScore >= 8) quality.overall = 'excellent';
      else if (avgScore >= 6) quality.overall = 'good';
      else if (avgScore >= 4) quality.overall = 'fair';
      else quality.overall = 'poor';

      // 품질 저하 시 알림
      if (quality.overall === 'poor' || quality.issues.length > 0) {
        logger.warn(`신호 품질 저하 감지`, { 
          quality: quality.overall, 
          issues: quality.issues 
        });
      }

    } catch (error) {
      logger.warn('신호 품질 평가 실패', error);
      quality.overall = 'unknown';
    }

    return quality;
  }

  /**
   * 사용자 스트림 중단
   */
  async stopUserStream(userId) {
    try {
      const streamProcessor = this.activeStreams.get(userId);
      
      if (streamProcessor) {
        await streamProcessor.stop();
        streamProcessor.removeAllListeners();
        this.activeStreams.delete(userId);
      }

      // 버퍼 및 분석 윈도우 정리
      this.signalBuffer.delete(userId);
      this.analysisWindows.delete(userId);

      logger.info(`실시간 생체신호 스트림 중단: ${userId}`);

      return { success: true, message: '생체신호 모니터링이 중단되었습니다.' };

    } catch (error) {
      logger.error(`스트림 중단 실패 [${userId}]:`, error);
      throw error;
    }
  }

  /**
   * 시스템 성능 모니터링
   */
  getPerformanceMetrics() {
    const now = Date.now();
    const elapsedSeconds = (now - this.performanceMetrics.lastResetTime) / 1000;

    return {
      activeStreams: this.activeStreams.size,
      totalStreamsStarted: this.performanceMetrics.totalStreams,
      samplesPerSecond: Math.round(this.performanceMetrics.processedSamples / elapsedSeconds),
      averageLatency: Math.round(this.performanceMetrics.averageLatency),
      emergencyDetectionRate: Math.round(this.performanceMetrics.detectedEvents / elapsedSeconds * 60), // per minute
      memoryUsage: {
        buffers: this.signalBuffer.size,
        windows: this.analysisWindows.size
      },
      uptime: elapsedSeconds,
      status: this.activeStreams.size > 0 ? 'active' : 'idle'
    };
  }

  /**
   * 헬퍼 메서드들
   */
  getArrhythmiaSeverity(type) {
    const severityMap = {
      'normal': 0,
      'pac': 1,          // Premature Atrial Contraction
      'pvc': 2,          // Premature Ventricular Contraction  
      'afib': 4,         // Atrial Fibrillation
      'vtach': 5,        // Ventricular Tachycardia
      'vfib': 5,         // Ventricular Fibrillation
      'asystole': 5      // Cardiac Arrest
    };
    return severityMap[type] || 2;
  }

  getHealthStatus(severity) {
    if (severity >= 5) return 'critical';
    if (severity >= 4) return 'emergency';
    if (severity >= 3) return 'warning';
    if (severity >= 2) return 'caution';
    return 'normal';
  }

  extractVitalSigns(analysisResults) {
    return {
      heartRate: analysisResults.ecg?.heartRate || analysisResults.ppg?.heartRate || null,
      spo2: analysisResults.ppg?.spo2 || null,
      bloodPressure: analysisResults.bloodPressure || null,
      bloodGlucose: analysisResults.bloodGlucose || null,
      bodyTemperature: analysisResults.bodyTemperature || null,
      temperature: analysisResults.temperature || null,
      hrv: analysisResults.ecg?.hrv || analysisResults.ppg?.hrv || null,
      activity: analysisResults.activity?.level || 'unknown'
    };
  }

  extractRecentBiometricData(userId) {
    const buffer = this.signalBuffer.get(userId);
    if (!buffer || buffer.length === 0) return null;

    // 최근 30초 데이터 추출
    const recentData = buffer.getRecent(30000); // 30초
    
    if (recentData.length === 0) return null;

    // 평균값 계산
    const vitals = {
      heartRate: this.calculateAverage(recentData, 'heartRate'),
      spo2: this.calculateAverage(recentData, 'spo2'),
      temperature: this.calculateAverage(recentData, 'temperature'),
      timestamp: new Date()
    };

    return vitals;
  }

  calculateAverage(data, field) {
    const values = data.filter(d => d.signals && d.signals[field]).map(d => d.signals[field]);
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
  }
}

/**
 * 생체신호 스트림 프로세서
 */
class BiosignalStreamProcessor extends EventEmitter {
  constructor(userId, deviceId, signalTypes, config) {
    super();
    this.userId = userId;
    this.deviceId = deviceId;
    this.signalTypes = signalTypes;
    this.config = config;
    this.isRunning = false;
    this.dataBuffer = [];
  }

  async start() {
    this.isRunning = true;
    logger.info(`스트림 프로세서 시작 [${this.userId}]`);
    
    // 실제 구현에서는 웹소켓이나 다른 실시간 프로토콜로 연결
    // 여기서는 시뮬레이션
    this.simulateDataStream();
  }

  async stop() {
    this.isRunning = false;
    logger.info(`스트림 프로세서 중단 [${this.userId}]`);
  }

  simulateDataStream() {
    // 개발/테스트용 시뮬레이션
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }

      const mockData = this.generateMockBiosignalData();
      this.emit('data', mockData);
      
    }, 100); // 100ms마다 (10Hz 기준)
  }

  generateMockBiosignalData() {
    const now = Date.now();
    const signals = {};

    if (this.signalTypes.includes('ecg')) {
      signals.ecg = 75 + Math.sin(now / 1000) * 5 + Math.random() * 2; // 70-80 bpm
    }

    if (this.signalTypes.includes('ppg')) {
      signals.ppg = 75 + Math.cos(now / 1200) * 4 + Math.random() * 2;
      signals.spo2 = 97 + Math.random() * 2; // 97-99%
    }

    // 혈압 데이터 (새로 추가)
    if (this.signalTypes.includes('bloodPressure')) {
      signals.bloodPressure = {
        systolic: 120 + Math.sin(now / 5000) * 10 + Math.random() * 5, // 115-125
        diastolic: 80 + Math.cos(now / 6000) * 5 + Math.random() * 3  // 77-83
      };
    }

    // 혈당 데이터 (새로 추가)
    if (this.signalTypes.includes('bloodGlucose')) {
      signals.bloodGlucose = 90 + Math.sin(now / 10000) * 15 + Math.random() * 5; // 80-100
    }

    // 체온 데이터 (새로 추가)
    if (this.signalTypes.includes('bodyTemperature')) {
      signals.bodyTemperature = 36.5 + Math.sin(now / 8000) * 0.3 + Math.random() * 0.1; // 36.2-36.8
    }

    if (this.signalTypes.includes('accelerometer')) {
      signals.accelerometer = {
        x: Math.random() * 0.2 - 0.1,
        y: Math.random() * 0.2 - 0.1,
        z: 1 + Math.random() * 0.1 - 0.05
      };
    }

    return {
      timestamp: now,
      userId: this.userId,
      deviceId: this.deviceId,
      signals,
      metadata: {
        signalQuality: 0.85 + Math.random() * 0.1,
        batteryLevel: 85,
        connectionStrength: -45
      }
    };
  }
}

/**
 * 링 버퍼 (순환 버퍼)
 */
class RingBuffer {
  constructor(size) {
    this.size = size;
    this.buffer = new Array(size);
    this.head = 0;
    this.tail = 0;
    this.length = 0;
  }

  push(item) {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.size;
    
    if (this.length < this.size) {
      this.length++;
    } else {
      this.head = (this.head + 1) % this.size;
    }
  }

  getRecent(timeWindowMs) {
    const now = Date.now();
    const cutoffTime = now - timeWindowMs;
    const recent = [];

    for (let i = 0; i < this.length; i++) {
      const idx = (this.head + i) % this.size;
      const item = this.buffer[idx];
      
      if (item && item.timestamp >= cutoffTime) {
        recent.push(item);
      }
    }

    return recent;
  }
}

/**
 * 분석 윈도우 관리자
 */
class AnalysisWindowManager {
  constructor(config) {
    this.config = config;
    this.windows = {};
    
    // 각 분석 타입별 윈도우 초기화
    Object.keys(config.windowSizes).forEach(type => {
      this.windows[type] = [];
    });
  }

  addData(signalData) {
    const now = Date.now();
    
    Object.keys(this.windows).forEach(type => {
      this.windows[type].push(signalData);
      
      // 오래된 데이터 제거
      const windowSizeMs = this.config.windowSizes[type] * 1000;
      const cutoffTime = now - windowSizeMs;
      
      this.windows[type] = this.windows[type].filter(data => 
        data.timestamp >= cutoffTime
      );
    });
  }

  getWindow(type) {
    return this.windows[type] || [];
  }
}

// 분석 알고리즘 클래스들 (Mock 구현)
class ECGAnalyzer {
  constructor(config) { this.config = config; }
  async analyzeRealtime(window, currentSample) {
    return {
      heartRate: 75 + Math.random() * 10,
      hrv: 45 + Math.random() * 10,
      arrhythmia: { type: 'normal', confidence: 0.95 }
    };
  }
  assessQuality(signal) { return { score: 8.5 }; }
}

class PPGAnalyzer {
  constructor(config) { this.config = config; }
  async analyzeRealtime(window, currentSample) {
    return {
      heartRate: 75 + Math.random() * 8,
      spo2: 97 + Math.random() * 2,
      bloodPressure: { systolic: 120, diastolic: 80 }
    };
  }
  assessQuality(signal) { return { score: 7.8 }; }
}

class ActivityAnalyzer {
  constructor(config) { this.config = config; }
  async analyzeRealtime(window, currentSample) {
    return {
      level: 'moderate',
      fallDetected: false,
      fallMagnitude: 0.8,
      fallConfidence: 0.1,
      prolongedInactivity: false,
      inactivityDuration: 5
    };
  }
}

class SensorFusionAnalyzer {
  constructor(config) { this.config = config; }
  analyze(analysisResults, signalData) {
    return {
      riskLevel: 2,
      confidence: 0.8,
      detectedPatterns: ['normal_sinus_rhythm']
    };
  }
}

/**
 * 혈압 분석기
 */
class BloodPressureAnalyzer {
  constructor(config) { this.config = config; }
  
  async analyzeRealtime(bloodPressureData) {
    // 실제 구현에서는 PPG 신호로부터 추정
    // 여기서는 직접 입력된 값 사용
    return {
      systolic: bloodPressureData.systolic || 120,
      diastolic: bloodPressureData.diastolic || 80,
      pulsePressure: (bloodPressureData.systolic || 120) - (bloodPressureData.diastolic || 80),
      quality: 0.85
    };
  }
}

/**
 * 혈당 분석기
 */
class BloodGlucoseAnalyzer {
  constructor(config) { this.config = config; }
  
  async analyzeRealtime(glucoseData) {
    // 실제 구현에서는 연속혈당측정기(CGM) 데이터
    return {
      value: glucoseData.value || glucoseData || 90,
      trend: glucoseData.trend || 'stable',
      quality: 0.9
    };
  }
}

/**
 * 체온 분석기
 */
class BodyTemperatureAnalyzer {
  constructor(config) { this.config = config; }
  
  async analyzeRealtime(tempData) {
    return {
      value: tempData.value || tempData || 36.5,
      trend: tempData.trend || 'stable',
      quality: 0.95
    };
  }
}

// RealtimeBiosignalEngine 인스턴스 생성
const realtimeBiosignalEngine = new RealtimeBiosignalEngine();

module.exports = realtimeBiosignalEngine;