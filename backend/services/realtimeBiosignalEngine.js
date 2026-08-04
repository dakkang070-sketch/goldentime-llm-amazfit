/**
 * 실시간 생체신호 분석 엔진 (Real-time Biosignal Analysis Engine)
 * 연속적인 생체신호 스트리밍 데이터 실시간 분석 및 응급상황 즉시 감지
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');
const { emitEmergencyAlert, emitBiosignalAlert } = require('./socketService');
const { setShadowState, deleteShadowState } = require('./shadowStateCacheService');

/**
 * 스트리밍 생체 신호를 분석 윈도우와 알고리즘 묶음으로 처리하는 엔진 클래스입니다.
 */
class RealtimeBiosignalEngine extends EventEmitter {
  
  /**
   * 인스턴스를 초기화합니다.
   */
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
   * 사용자 스트림 상태를 공용 캐시에 남길 수 있는 직렬화 가능한 요약본으로 변환합니다.
   */
  async shadowWriteStreamState(userId, summary = {}) {
    const buffer = this.signalBuffer.get(userId);
    const windowManager = this.analysisWindows.get(userId);
    await setShadowState('realtime-biosignal', userId, {
      userId,
      active: this.activeStreams.has(userId),
      updatedAt: new Date().toISOString(),
      bufferSize: typeof buffer?.size === 'number' ? buffer.size : undefined,
      hasAnalysisWindow: Boolean(windowManager),
      ...summary,
    }, 2 * 60 * 60);
  }

  /**
   * 사용자별 실시간 생체신호 스트림과 분석 버퍼를 초기화해 모니터링을 시작합니다.
   */
  async startUserStream(userId, deviceId, signalTypes = ['ecg', 'ppg', 'accelerometer']) {
    try {
      if (this.activeStreams.has(userId)) {
        // 같은 사용자 스트림은 1개만 유지하고 재시작 시 기존 버퍼/리스너를 먼저 정리합니다.
        await this.stopUserStream(userId);
      }

      // 스트림 프로세서 생성
      const streamProcessor = new BiosignalStreamProcessor(userId, deviceId, signalTypes, this.config);
      
      // 고주파 센서까지 포함해도 최근 5분 이력을 다시 꺼낼 수 있게 최대 샘플링률 기준으로 잡습니다.
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
      await this.shadowWriteStreamState(userId, {
        deviceId,
        signalTypes,
        phase: 'started',
      });

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
   * 새로 들어온 실시간 신호를 버퍼링하고 분석, 감지, 브로드캐스트까지 한 번에 처리합니다.
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

      // 개별 센서 결과를 하나의 위험도와 패턴 묶음으로 다시 합칩니다.
      const fusionResult = this.algorithms.fusion.analyze(analysisResults, signalData);

      // 5. 응급상황 검출
      const emergencyDetection = this.detectEmergencyConditions(userId, fusionResult, analysisResults, signalData);

      // 관제 화면은 원시 파형 대신 현재 활력징후/상태/품질 요약만 받습니다.
      this.broadcastRealtimeResults(userId, {
        timestamp: signalData.timestamp,
        vitals: this.extractVitalSigns(analysisResults),
        status: emergencyDetection.status,
        alerts: emergencyDetection.alerts,
        quality: this.assessSignalQuality(signalData),
        fusion: fusionResult
      });
      await this.shadowWriteStreamState(userId, {
        phase: 'streaming',
        lastSignalAt: signalData.timestamp,
        lastStatus: emergencyDetection.status,
        alertCount: Array.isArray(emergencyDetection.alerts) ? emergencyDetection.alerts.length : 0,
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
   * 개별 센서 결과와 융합 점수를 합쳐 응급 조건과 경보 목록을 계산합니다.
   */
  detectEmergencyConditions(userId, fusionResult, analysisResults, signalData) {
    const alerts = [];
    let maxSeverity = 0;
    let isEmergency = false;

    const thresholds = this.config.emergencyThresholds;
    const fallFeatures = this.buildFallFeatures(analysisResults, signalData);
    const fallScore = this.computeFallScore(fallFeatures, signalData?.metadata?.isWear !== false);
    const emergencyScore = this.computeEmergencyScore({ analysisResults, fallScore, fallFeatures, responseState: 'unknown', ageRiskWeight: 0 });

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
    if (analysisResults.activity?.fallDetected || fallScore >= 50) {
      const fallSeverity = fallScore >= 85 ? 5 : fallScore >= 70 ? 4 : 3;
      alerts.push({
        type: 'fall_detected',
        value: fallFeatures.fallMagnitude ?? analysisResults.activity?.fallMagnitude,
        severity: fallSeverity,
        message: `낙상 감지 (점수: ${fallScore}${typeof fallFeatures.fallMagnitude === 'number' ? `, 충격 ${fallFeatures.fallMagnitude.toFixed(2)}g` : ''})`,
        confidence: fallFeatures.fallConfidence ?? analysisResults.activity?.fallConfidence,
        timestamp: Date.now()
      });
      maxSeverity = Math.max(maxSeverity, fallSeverity);
      if (fallSeverity >= 4 || emergencyScore >= 70) isEmergency = true;
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
      const temp = analysisResults.bodyTemperature?.value ?? analysisResults.bodyTemperature;
      
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
      confidence: fusionResult.confidence || 0.5,
      fallScore,
      emergencyScore,
      fallFeatures,
      responseState: 'unknown',
      ageRiskWeight: 0,
    };
  }

  /**
   * 응급상황 감지 결과를 소켓과 분석 서비스로 즉시 전달합니다.
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

      // 실시간 엔진 경보를 기존 analyzerService 파이프라인으로 넘겨 케이스 생성 규칙을 재사용합니다.
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
   * 계산된 실시간 활력징후와 경보를 소켓 채널로 전송합니다.
   */
  broadcastRealtimeResults(userId, results) {
    try {
      // 실시간 엔진 결과도 소켓 payload 구조를 맞춰 프론트 대시보드가 동일하게 소비하게 합니다.
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
   * 입력 신호 품질을 평가해 등급과 품질 이슈 목록을 반환합니다.
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

      // 센서별 점수를 평균내 단일 품질 배지로 축약합니다.
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
   * 사용자 스트림과 관련 버퍼, 윈도우를 모두 정리하고 모니터링을 중단합니다.
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
      await deleteShadowState('realtime-biosignal', userId);

      logger.info(`실시간 생체신호 스트림 중단: ${userId}`);

      return { success: true, message: '생체신호 모니터링이 중단되었습니다.' };

    } catch (error) {
      logger.error(`스트림 중단 실패 [${userId}]:`, error);
      throw error;
    }
  }

  /**
   * 현재 엔진의 스트림 수와 처리 성능 요약값을 반환합니다.
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
   * 부정맥 타입을 응급 심각도 숫자로 변환합니다.
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

  /**
   * 최대 심각도 숫자를 화면용 건강 상태 코드로 변환합니다.
   */
  getHealthStatus(severity) {
    if (severity >= 5) return 'critical';
    if (severity >= 4) return 'emergency';
    if (severity >= 3) return 'warning';
    if (severity >= 2) return 'caution';
    return 'normal';
  }

  /**
   * 낙상 판단에 필요한 충격, 자세 변화, 무활동 지표를 한 객체로 정리합니다.
   */
  buildFallFeatures(analysisResults, signalData) {
    const activity = analysisResults.activity || {};
    const accel = signalData?.signals?.accelerometer || {};
    const gyro = signalData?.signals?.gyroscope || {};
    const accelMagnitude = Math.sqrt(((accel.x || 0) ** 2) + ((accel.y || 0) ** 2) + ((accel.z || 0) ** 2));
    const gyroMagnitude = Math.sqrt(((gyro.x || 0) ** 2) + ((gyro.y || 0) ** 2) + ((gyro.z || 0) ** 2));
    const hr = analysisResults.ecg?.heartRate || analysisResults.ppg?.heartRate || null;
    const spo2 = analysisResults.ppg?.spo2 || null;
    const inactivityMinutes = typeof activity.inactivityDuration === 'number' ? activity.inactivityDuration : 0;
    const postImpactImmobilitySec = Math.round(inactivityMinutes * 60);

    return {
      fallMagnitude: typeof activity.fallMagnitude === 'number' ? activity.fallMagnitude : accelMagnitude,
      fallConfidence: typeof activity.fallConfidence === 'number' ? activity.fallConfidence : null,
      orientationChangeDeg: gyroMagnitude,
      postImpactImmobilitySec,
      stepResumeWithin20s: activity.prolongedInactivity ? false : null,
      hrDelta30s: typeof hr === 'number' ? hr - 70 : null,
      spo2Delta30s: typeof spo2 === 'number' ? spo2 - 97 : null,
    };
  }

  /**
   * 낙상 특징값을 가중 합산해 0~100 범위 낙상 점수로 변환합니다.
   */
  computeFallScore(fallFeatures, isWear) {
    if (isWear === false) return 0;
    let score = 0;
    const magnitude = typeof fallFeatures?.fallMagnitude === 'number' ? fallFeatures.fallMagnitude : null;
    const orientation = typeof fallFeatures?.orientationChangeDeg === 'number' ? fallFeatures.orientationChangeDeg : null;
    const immobility = typeof fallFeatures?.postImpactImmobilitySec === 'number' ? fallFeatures.postImpactImmobilitySec : null;

    if (typeof magnitude === 'number') {
      if (magnitude >= 3.0) score += 25;
      else if (magnitude >= 2.4) score += 18;
      else if (magnitude >= 2.0) score += 10;
    }
    if (typeof orientation === 'number') {
      if (orientation >= 60) score += 20;
      else if (orientation >= 35) score += 12;
      else if (orientation >= 20) score += 6;
    }
    if (typeof immobility === 'number') {
      if (immobility >= 30) score += 20;
      else if (immobility >= 15) score += 14;
      else if (immobility >= 5) score += 6;
    }
    if (fallFeatures?.stepResumeWithin20s === false) score += 10;
    if (typeof fallFeatures?.hrDelta30s === 'number' && Math.abs(fallFeatures.hrDelta30s) >= 20) score += 5;
    if (typeof fallFeatures?.spo2Delta30s === 'number' && fallFeatures.spo2Delta30s <= -3) score += 5;
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * 낙상, 무응답, 심박, 산소포화도 등을 합쳐 종합 응급 점수를 계산합니다.
   */
  computeEmergencyScore({ analysisResults, fallScore, fallFeatures, responseState, ageRiskWeight }) {
    let score = 0;
    const hr = analysisResults.ecg?.heartRate || analysisResults.ppg?.heartRate || null;
    const spo2 = analysisResults.ppg?.spo2 || null;
    const immobility = typeof fallFeatures?.postImpactImmobilitySec === 'number' ? fallFeatures.postImpactImmobilitySec : null;

    if (fallScore >= 85) score += 35;
    else if (fallScore >= 70) score += 28;
    else if (fallScore >= 50) score += 18;

    if (typeof hr === 'number') {
      if (hr <= 35 || hr >= 160) score += 20;
      else if (hr <= 45 || hr >= 130) score += 12;
    }

    if (typeof spo2 === 'number') {
      if (spo2 < 90) score += 20;
      else if (spo2 <= 91) score += 14;
      else if (spo2 <= 94) score += 8;
    }

    if (responseState === 'no_response') score += 20;
    else if (responseState === 'delayed') score += 10;

    if (typeof immobility === 'number') {
      if (immobility >= 30) score += 10;
      else if (immobility >= 15) score += 5;
    }

    score += ageRiskWeight || 0;
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * 분석 결과에서 화면 전송용 핵심 활력징후만 추려냅니다.
   */
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

  /**
   * 최근 버퍼 데이터에서 평균 활력징후를 계산해 응급 대응 입력으로 사용합니다.
   */
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
      temperature: this.calculateAverage(recentData, 'bodyTemperature'),
      timestamp: new Date()
    };

    return vitals;
  }

  /**
   * 최근 데이터 배열에서 지정 필드의 평균값을 계산합니다.
   */
  calculateAverage(data, field) {
    const values = data.filter(d => d.signals && d.signals[field]).map(d => d.signals[field]);
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
  }
}

/**
 * 생체신호 스트림 프로세서
 */
class BiosignalStreamProcessor extends EventEmitter {
  /**
   * 인스턴스를 초기화합니다.
   */
  constructor(userId, deviceId, signalTypes, config) {
    super();
    this.userId = userId;
    this.deviceId = deviceId;
    this.signalTypes = signalTypes;
    this.config = config;
    this.isRunning = false;
    this.dataBuffer = [];
  }

  /**
   * `start` 기능을 수행합니다.
   */
  async start() {
    this.isRunning = true;
    logger.info(`스트림 프로세서 시작 [${this.userId}]`);
    
    // 실제 구현에서는 웹소켓이나 다른 실시간 프로토콜로 연결
    // 여기서는 시뮬레이션
    this.simulateDataStream();
  }

  /**
   * `stop` 기능을 수행합니다.
   */
  async stop() {
    this.isRunning = false;
    logger.info(`스트림 프로세서 중단 [${this.userId}]`);
  }

  /**
   * `simulateDataStream` 기능을 수행합니다.
   */
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

  /**
   * `generateMockBiosignalData` 기능을 수행합니다.
   */
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
  /**
   * 인스턴스를 초기화합니다.
   */
  constructor(size) {
    this.size = size;
    this.buffer = new Array(size);
    this.head = 0;
    this.tail = 0;
    this.length = 0;
  }

  /**
   * `push` 기능을 수행합니다.
   */
  push(item) {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.size;
    
    if (this.length < this.size) {
      this.length++;
    } else {
      this.head = (this.head + 1) % this.size;
    }
  }

  /**
   * `getRecent` 기능을 수행합니다.
   */
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
  /**
   * 인스턴스를 초기화합니다.
   */
  constructor(config) {
    this.config = config;
    this.windows = {};
    this.maxSamplingRate = Math.max(...Object.values(config.samplingRates));
    
    // 각 분석 타입별 윈도우를 ring buffer로 초기화합니다.
    Object.keys(config.windowSizes).forEach(type => {
      const windowSizeSeconds = config.windowSizes[type];
      const bufferSize = Math.max(1, Math.ceil(this.maxSamplingRate * windowSizeSeconds));
      this.windows[type] = new RingBuffer(bufferSize);
    });
  }

  /**
   * `addData` 기능을 수행합니다.
   */
  addData(signalData) {
    Object.keys(this.windows).forEach(type => {
      this.windows[type].push(signalData);
    });
  }

  /**
   * `getWindow` 기능을 수행합니다.
   */
  getWindow(type) {
    const window = this.windows[type];
    if (!window) {
      return [];
    }

    return window.getRecent(this.config.windowSizes[type] * 1000);
  }
}

/**
 * 신호 분석에 공통으로 쓰는 보조 함수들입니다.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * 숫자 배열의 평균을 계산합니다.
 */
function averageOf(values) {
  if (!values.length) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * 숫자 배열의 표준편차를 계산합니다.
 */
function standardDeviation(values) {
  if (values.length < 2) {
    return 0;
  }
  const mean = averageOf(values);
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * 윈도우에서 지정한 필드의 숫자 값을 추출합니다.
 */
function extractWindowValues(window, primaryField, secondaryField = null) {
  return window
    .map((item) => {
      const signals = item?.signals || {};
      const primaryValue = signals[primaryField];
      if (typeof primaryValue === 'number' && Number.isFinite(primaryValue)) {
        return primaryValue;
      }
      if (secondaryField) {
        const secondaryValue = signals[secondaryField];
        if (typeof secondaryValue === 'number' && Number.isFinite(secondaryValue)) {
          return secondaryValue;
        }
      }
      return null;
    })
    .filter((value) => value !== null);
}

/**
 * 가속도 벡터의 크기를 계산합니다.
 */
function calculateAccelerationMagnitude(accelerometer = {}) {
  const x = Number(accelerometer.x) || 0;
  const y = Number(accelerometer.y) || 0;
  const z = Number(accelerometer.z) || 0;
  return Math.sqrt((x ** 2) + (y ** 2) + (z ** 2));
}

/**
 * 윈도우 데이터와 현재 샘플을 함께 묶어 심박 관련 값을 정리합니다.
 */
function resolveHeartMetrics(window, currentSample, fallbackField) {
  const series = extractWindowValues(window, fallbackField);
  if (typeof currentSample === 'number' && Number.isFinite(currentSample)) {
    series.push(currentSample);
  }
  const heartRate = averageOf(series) ?? (typeof currentSample === 'number' ? currentSample : 75);
  const hrv = series.length >= 2 ? standardDeviation(series) * 10 : 35;
  return {
    heartRate: clamp(heartRate, 35, 220),
    hrv: clamp(hrv, 5, 120),
    variability: standardDeviation(series),
    series,
  };
}

// 분석 알고리즘 클래스들
class ECGAnalyzer {
  /**
   * 인스턴스를 초기화합니다.
   */
  constructor(config) { this.config = config; }
  /**
   * `analyzeRealtime` 기능을 수행합니다.
   */
  async analyzeRealtime(window, currentSample) {
    const metrics = resolveHeartMetrics(window, currentSample, 'ecg');
    let arrhythmiaType = 'normal';
    let arrhythmiaConfidence = 0.65;

    if (metrics.heartRate >= 140) {
      arrhythmiaType = 'tachycardia';
      arrhythmiaConfidence = 0.7 + Math.min(0.25, (metrics.heartRate - 140) / 120);
    } else if (metrics.heartRate <= 45) {
      arrhythmiaType = 'bradycardia';
      arrhythmiaConfidence = 0.7 + Math.min(0.25, (45 - metrics.heartRate) / 45);
    } else if (metrics.variability >= 8) {
      arrhythmiaType = 'irregular_rhythm';
      arrhythmiaConfidence = 0.68 + Math.min(0.22, (metrics.variability - 8) / 20);
    }

    return {
      heartRate: Number(metrics.heartRate.toFixed(1)),
      hrv: Number(metrics.hrv.toFixed(1)),
      arrhythmia: {
        type: arrhythmiaType,
        confidence: Number(clamp(arrhythmiaConfidence, 0.5, 0.95).toFixed(2)),
      },
    };
  }
  /**
   * `assessQuality` 기능을 수행합니다.
   */
  assessQuality(signal) {
    const isValid = typeof signal === 'number' && Number.isFinite(signal);
    return { score: isValid ? 8.2 : 4.0 };
  }
}

class PPGAnalyzer {
  /**
   * 인스턴스를 초기화합니다.
   */
  constructor(config) { this.config = config; }
  /**
   * `analyzeRealtime` 기능을 수행합니다.
   */
  async analyzeRealtime(window, currentSample) {
    const metrics = resolveHeartMetrics(window, currentSample, 'ppg');
    const spo2Values = extractWindowValues(window, 'spo2');
    const spo2 = averageOf(spo2Values) ?? 97;
    const systolic = clamp(110 + ((metrics.heartRate - 70) * 0.6), 85, 190);
    const diastolic = clamp(70 + ((metrics.heartRate - 70) * 0.25), 50, 120);

    return {
      heartRate: Number(metrics.heartRate.toFixed(1)),
      spo2: Number(clamp(spo2, 70, 100).toFixed(1)),
      hrv: Number(metrics.hrv.toFixed(1)),
      bloodPressure: {
        systolic: Math.round(systolic),
        diastolic: Math.round(diastolic),
      },
    };
  }
  /**
   * `assessQuality` 기능을 수행합니다.
   */
  assessQuality(signal) {
    const isValid = typeof signal === 'number' && Number.isFinite(signal);
    return { score: isValid ? 7.9 : 4.0 };
  }
}

class ActivityAnalyzer {
  /**
   * 인스턴스를 초기화합니다.
   */
  constructor(config) { this.config = config; }
  /**
   * `analyzeRealtime` 기능을 수행합니다.
   */
  async analyzeRealtime(window, currentSample) {
    const magnitudes = window
      .map((item) => calculateAccelerationMagnitude(item?.signals?.accelerometer))
      .filter((value) => Number.isFinite(value));
    const currentMagnitude = calculateAccelerationMagnitude(currentSample);
    magnitudes.push(currentMagnitude);

    const baselineMagnitude = averageOf(magnitudes) ?? 1;
    const maxMagnitude = magnitudes.length ? Math.max(...magnitudes) : currentMagnitude;
    const variance = standardDeviation(magnitudes);
    const inactivitySamples = magnitudes.filter((value) => Math.abs(value - 1) < 0.08).length;
    const inactivityRatio = magnitudes.length ? inactivitySamples / magnitudes.length : 0;
    const fallDetected = currentMagnitude >= 2.2 || maxMagnitude >= 2.4;
    const prolongedInactivity = !fallDetected && magnitudes.length >= 10 && inactivityRatio >= 0.85;

    let level = 'low';
    if (baselineMagnitude >= 1.6 || variance >= 0.45) {
      level = 'high';
    } else if (baselineMagnitude >= 1.15 || variance >= 0.2) {
      level = 'moderate';
    }

    return {
      level,
      fallDetected,
      fallMagnitude: Number(maxMagnitude.toFixed(2)),
      fallConfidence: Number(clamp((maxMagnitude - 1) / 1.8, 0.05, 0.98).toFixed(2)),
      prolongedInactivity,
      inactivityDuration: Math.round((window.length / (this.config.samplingRates.accelerometer || 1)) / 60),
    };
  }
}

class SensorFusionAnalyzer {
  /**
   * 인스턴스를 초기화합니다.
   */
  constructor(config) { this.config = config; }
  /**
   * `analyze` 기능을 수행합니다.
   */
  analyze(analysisResults, signalData) {
    let riskLevel = 1;
    const detectedPatterns = [];

    const heartRate = analysisResults.ecg?.heartRate || analysisResults.ppg?.heartRate || null;
    const spo2 = analysisResults.ppg?.spo2 || signalData?.signals?.spo2 || null;
    const arrhythmiaType = analysisResults.ecg?.arrhythmia?.type;
    const activity = analysisResults.activity || {};

    if (arrhythmiaType && arrhythmiaType !== 'normal') {
      detectedPatterns.push(arrhythmiaType);
      riskLevel = Math.max(riskLevel, arrhythmiaType === 'irregular_rhythm' ? 3 : 4);
    } else if (heartRate) {
      detectedPatterns.push('normal_sinus_rhythm');
    }

    if (typeof heartRate === 'number') {
      if (heartRate >= 150 || heartRate <= 40) {
        detectedPatterns.push('critical_heart_rate');
        riskLevel = Math.max(riskLevel, 5);
      } else if (heartRate >= 120 || heartRate <= 50) {
        detectedPatterns.push('abnormal_heart_rate');
        riskLevel = Math.max(riskLevel, 3);
      }
    }

    if (typeof spo2 === 'number') {
      if (spo2 < 90) {
        detectedPatterns.push('critical_hypoxia');
        riskLevel = Math.max(riskLevel, 5);
      } else if (spo2 < 94) {
        detectedPatterns.push('hypoxia');
        riskLevel = Math.max(riskLevel, 3);
      }
    }

    if (activity.fallDetected) {
      detectedPatterns.push('fall_detected');
      riskLevel = Math.max(riskLevel, 5);
    } else if (activity.prolongedInactivity) {
      detectedPatterns.push('prolonged_inactivity');
      riskLevel = Math.max(riskLevel, 3);
    }

    const uniquePatterns = [...new Set(detectedPatterns)];
    const confidenceBase = 0.55 + (uniquePatterns.length * 0.08) + ((riskLevel - 1) * 0.05);

    return {
      riskLevel,
      confidence: Number(clamp(confidenceBase, 0.55, 0.98).toFixed(2)),
      detectedPatterns: uniquePatterns.length ? uniquePatterns : ['normal_sinus_rhythm'],
    };
  }
}

/**
 * 혈압 분석기
 */
class BloodPressureAnalyzer {
  /**
   * 인스턴스를 초기화합니다.
   */
  constructor(config) { this.config = config; }
  
  /**
   * `analyzeRealtime` 기능을 수행합니다.
   */
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
  /**
   * 인스턴스를 초기화합니다.
   */
  constructor(config) { this.config = config; }
  
  /**
   * `analyzeRealtime` 기능을 수행합니다.
   */
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
  /**
   * 인스턴스를 초기화합니다.
   */
  constructor(config) { this.config = config; }
  
  /**
   * `analyzeRealtime` 기능을 수행합니다.
   */
  async analyzeRealtime(tempData) {
    return {
      value: tempData.value || tempData || 36.5,
      trend: tempData.trend || 'stable',
      quality: 0.95
    };
  }
}

/**
 * 서버 전역에서 재사용하는 실시간 생체신호 분석 엔진 싱글톤 인스턴스입니다.
 */
const realtimeBiosignalEngine = new RealtimeBiosignalEngine();

module.exports = realtimeBiosignalEngine;
