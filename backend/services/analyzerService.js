const EmergencyCase = require('../models/EmergencyCase');
const { generateNonDiagnosticSummary } = require('./ollamaService');
const { autoMatchParamedicForCase } = require('./matchingService');
const { autoMatchHospitalForCase } = require('./hospitalService');
const { emitEmergencyCaseCreated, emitParamedicMatched, emitHospitalMatched } = require('./socketService');
const { notifyEmergencyToGuardian } = require('./notificationService');
const medicalWeightingService = require('./medicalWeightingService');
const logger = require('../utils/logger');

/**
 * MVP용 “규칙 기반 + LLM 연결 준비” 분석기
 * - 지금 단계에서는 즉시 동작 가능한 규칙 기반으로 emergencyLevel(1~5)을 산출합니다.
 * - 다음 단계에서 Ollama(로컬 Llama 3.1)로 “설명 텍스트/근거/추천 액션”을 붙입니다.
 *
 * 의료기기 회피 원칙:
 * - “진단” 대신 “이상 징후 가능성/권고” 수준으로만 텍스트를 생성합니다.
 */
function ruleBasedEmergencyLevel({ user, doc }) {
  const hr = doc.heartRate;
  const stress = doc.stressLevel;
  const movementStatus = doc.movementStatus;

  // 기초선이 있으면 활용 (없으면 보수적으로)
  const baselineHrAvg = user?.baselineBiometric?.heartRate?.avg;

  // 기본: 정상
  let level = 1;
  const anomalies = [];

  // 심박수 기반 (매우 단순 MVP 규칙)
  if (hr !== undefined && hr !== null) {
    if (hr <= 35) {
      level = Math.max(level, 5);
      anomalies.push({ type: 'heart_rate', description: `심박수 매우 낮음(${hr} bpm)`, severity: 'critical' });
    } else if (hr <= 45) {
      level = Math.max(level, 4);
      anomalies.push({ type: 'heart_rate', description: `심박수 낮음(${hr} bpm)`, severity: 'high' });
    } else if (hr >= 160) {
      level = Math.max(level, 4);
      anomalies.push({ type: 'heart_rate', description: `심박수 높음(${hr} bpm)`, severity: 'high' });
    } else if (hr >= 130) {
      level = Math.max(level, 3);
      anomalies.push({ type: 'heart_rate', description: `심박수 상승(${hr} bpm)`, severity: 'medium' });
    }

    if (baselineHrAvg && hr >= baselineHrAvg * 1.6) {
      level = Math.max(level, 3);
      anomalies.push({ type: 'heart_rate', description: `기초선 대비 심박 급상승(기초 ${baselineHrAvg} → 현재 ${hr})`, severity: 'medium' });
    }
  }

  // 낙상/움직임 기반
  if (movementStatus === 'fall_detected') {
    level = Math.max(level, 4);
    anomalies.push({ type: 'fall', description: '낙상 가능 신호 감지', severity: 'high' });
  }

  // 스트레스 지수 (참고용)
  if (stress !== undefined && stress !== null) {
    if (stress >= 90) {
      level = Math.max(level, 3);
      anomalies.push({ type: 'stress', description: `스트레스 지수 높음(${stress})`, severity: 'medium' });
    }
  }

  // 입원 모드면 “응급 출동” 레벨 상향을 제한 (관제만)
  if (user?.hospitalMode?.isActive) {
    // 입원중에도 완전한 위급(5)은 유지 가능하나, 3~4는 관제로만 유도하는 정책 등은 추후 조정
  }

  return { level, anomalies };
}

async function analyzeBiometricAndMaybeOpenCase({ user, biometricDoc }) {
  const rule = ruleBasedEmergencyLevel({ user, doc: biometricDoc });
  const { level, anomalies } = rule;

  let analysisText = (() => {
    if (level === 1) return '정상 범위로 보입니다. 계속 모니터링합니다.';
    if (level === 2) return '약간의 이상 징후 가능성이 있습니다. 추적 모니터링이 필요합니다.';
    if (level === 3) return '이상 징후 가능성이 높습니다. 관제 확인을 권고합니다.';
    if (level === 4) return '위급 가능성이 있습니다. 신속한 확인/대응이 필요합니다.';
    return '응급 가능성이 매우 높습니다. 즉시 대응이 필요합니다.';
  })();

  // Ollama가 준비되어 있으면 “비진단 요약”을 덧붙임 (실패해도 규칙 기반은 유지)
  if ((process.env.ENABLE_OLLAMA || '').toLowerCase() === 'true') {
    try {
      const llmText = await generateNonDiagnosticSummary({
        userBaseline: { baselineHrAvg: user?.baselineBiometric?.heartRate?.avg },
        biometric: {
          collectedAt: biometricDoc.collectedAt?.toISOString?.() || String(biometricDoc.collectedAt),
          heartRate: biometricDoc.heartRate,
          stressLevel: biometricDoc.stressLevel,
          movementStatus: biometricDoc.movementStatus,
          location: biometricDoc.location,
        },
        ruleResult: rule,
      });
      if (llmText) analysisText = llmText;
    } catch (e) {
      // 조용히 무시: 로컬 Ollama가 아직 없을 수 있음
    }
  }

  // BiometricData.analysis 업데이트
  const conflictDetected = detectAiConflict(level, analysisText);
  
  biometricDoc.analysis = {
    isAnomaly: level >= 3,
    emergencyLevel: level,
    analysisResult: analysisText,
    analyzedAt: new Date(),
    conflictDetected: conflictDetected
  };
  await biometricDoc.save();

  if (conflictDetected) {
    logger.warn(`⚠️ AI 분석 갈등 감지 [User: ${biometricDoc.userId}]: Rule Level ${level} vs LLM Text Analysis`);
  }

/**
 * Rule 기반 결과와 LLM 분석 결과 간의 모순 검출
 */
function detectAiConflict(ruleLevel, llmText) {
  if (!llmText) return false;
  
  const text = llmText.toLowerCase();
  const isLlmNormal = text.includes('정상') || text.includes('안정') || text.includes('excellent') || text.includes('stable');
  const isLlmCritical = text.includes('위험') || text.includes('응급') || text.includes('critical') || text.includes('emergency');

  // Rule은 위급한데 LLM은 정상이라고 하는 경우
  if (ruleLevel >= 4 && isLlmNormal) return true;
  
  // Rule은 정상인데 LLM은 매우 위험하다고 하는 경우 (과잉 탐지)
  if (ruleLevel <= 2 && isLlmCritical) return true;

  return false;
}

  // 케이스 생성 조건 (MVP): level >= 4 인 경우 자동 케이스 생성
  // - level 3은 관제 알림만(추후 구현)으로 두는 편이 안전
  let createdCaseId = null;
  if (level >= 4 && !user?.hospitalMode?.isActive) {
    const created = await EmergencyCase.create({
      userId: biometricDoc.userId,
      emergencyLevel: level,
      detectedAnomalies: anomalies,
      llmAnalysis: {
        analysisText,
        confidence: 0.5,
        analyzedAt: new Date(),
        model: 'rule-based-mvp',
      },
      locations: {
        detectedAt: {
          lat: biometricDoc.location.lat,
          lng: biometricDoc.location.lng,
        },
        current: {
          lat: biometricDoc.location.lat,
          lng: biometricDoc.location.lng,
          updatedAt: new Date(),
        },
      },
      status: 'detected',
      matchingType: 'auto',
    });
    createdCaseId = created._id;

    // Socket.IO로 응급 케이스 생성 알림
    try {
      const caseData = await EmergencyCase.findById(created._id)
        .populate('userId', 'name phone')
        .lean();
      emitEmergencyCaseCreated(caseData);
      
      // 보호자에게 알림 (SMS)
      if (user.consents?.emergencyAutoReport) {
        notifyEmergencyToGuardian(userId, created).catch(err => {
          console.warn('보호자 알림 실패:', err.message);
        });
      }

      // 학습 데이터 수집 (비동기)
      const { collectTrainingData } = require('./fineTuningService');
      collectTrainingData(created._id).catch(err => {
        logger.warn('학습 데이터 수집 실패:', err.message);
      });

      // 자동 의료 라벨링 생성 (비동기)
      const autoLabelingService = require('./autoLabelingService');
      autoLabelingService.generateMedicalLabels(created._id, biometricDoc._id).catch(err => {
        logger.warn('자동 라벨링 실패:', err.message);
      });

      // 응급 워크플로우 자동 시작 (Level 4 이상)
      if (level >= 4 && process.env.ENABLE_EMERGENCY_WORKFLOW === 'true') {
        const emergencyWorkflowService = require('./emergencyWorkflowService');
        emergencyWorkflowService.initiateEmergencyWorkflow(created._id, {
          priority: level === 5 ? 'critical' : 'high',
          autoEscalation: true,
          notifyGuardian: true,
          isRealtimeDetection: options?.isRealtimeDetection || false,
          detectionSource: options?.detectionSource || 'batch_analysis'
        }).catch(err => {
          logger.warn('응급 워크플로우 시작 실패:', err.message);
        });
      }

      // 실시간 생체신호 모니터링 시작 (Level 3 이상)
      if (level >= 3 && process.env.ENABLE_REALTIME_BIOSIGNAL === 'true') {
        const realtimeBiosignalEngine = require('./realtimeBiosignalEngine');
        
        // 기존에 모니터링 중이 아닐 때만 시작
        if (!realtimeBiosignalEngine.activeStreams.has(userId)) {
          realtimeBiosignalEngine.startUserStream(userId, 'auto_device', ['ecg', 'ppg', 'accelerometer']).catch(err => {
            logger.warn('실시간 생체신호 모니터링 시작 실패:', err.message);
          });
        }
      }
    } catch (e) {
      console.warn('Socket 알림 실패:', e.message);
    }

    // MVP: 케이스 생성 즉시 자동 응급구조사 매칭 시도 (실패해도 케이스는 유지)
    try {
      const matchResult = await autoMatchParamedicForCase(created._id);
      if (matchResult.matched) {
        const caseData = await EmergencyCase.findById(created._id).lean();
        emitParamedicMatched(created._id, matchResult.paramedicId, caseData);
      }
    } catch (e) {
      // 무시: 관제 수동 매칭으로 fallback
    }

    // 병원 매칭도 자동으로 시도
    try {
      const matchResult = await autoMatchHospitalForCase(created._id);
      if (matchResult.matched) {
        const hospitalData = await require('../models/Hospital').findById(matchResult.hospitalId).lean();
        emitHospitalMatched(created._id, matchResult.hospitalId, hospitalData);
      }
    } catch (e) {
      // 무시: 나중에 수동 매칭 가능
    }
  }

  return {
    emergencyLevel: level,
    isAnomaly: level >= 3,
    anomalies,
    summary: analysisText,
    createdCaseId,
  };
}

/**
 * 고급 의료 가중치 기반 분석 (새로운 시스템)
 * 기존 ruleBasedEmergencyLevel을 대체할 수 있는 정교한 분석
 */
function advancedMedicalAnalysis({ user, doc }) {
  try {
    // 환자 데이터 구조화
    const patientData = {
      id: user._id,
      age: user.age || 35,
      gender: user.gender || 'unknown', 
      medicalHistory: user.medicalHistory || [],
      baselineBiometric: user.baselineBiometric
    };

    // 상황적 데이터
    const contextData = {
      location: user.location?.type || 'urban',
      weather: doc.environmentalData?.weather || 'normal',
      isIsolated: user.isIsolated || false
    };

    // 정교한 위험도 스코어 계산 (0-100점)
    const riskAnalysis = medicalWeightingService.calculateRiskScore(
      patientData, 
      doc, 
      contextData
    );

    // 위험도 스코어를 응급도 레벨로 변환
    let level = 1;
    const score = riskAnalysis.totalScore;
    
    if (score >= 85) level = 5;        // 85-100: 응급
    else if (score >= 70) level = 4;   // 70-84: 위급  
    else if (score >= 50) level = 3;   // 50-69: 긴급
    else if (score >= 30) level = 2;   // 30-49: 주의
    else level = 1;                    // 0-29: 정상

    // 세부 이상 징후 생성
    const anomalies = generateAdvancedAnomalies(doc, patientData, riskAnalysis);

    logger.info('고급 의료 분석 완료', {
      userId: user._id,
      level,
      riskScore: score,
      confidence: riskAnalysis.confidence
    });

    return { 
      level, 
      anomalies,
      riskScore: score,
      confidence: riskAnalysis.confidence,
      breakdown: riskAnalysis.breakdown
    };

  } catch (error) {
    logger.warn('고급 분석 실패, 기본 분석 사용', error);
    
    // 에러 시 기본 분석 사용
    const hr = doc.heartRate || 70;
    let level = 1;
    const anomalies = [];
    
    if (hr < 40 || hr > 160) {
      level = hr < 40 ? 5 : 4;
      anomalies.push({ 
        type: 'heart_rate', 
        description: `심박수 이상 (${hr} bpm)`, 
        severity: hr < 40 ? 'critical' : 'high' 
      });
    }
    
    if (doc.movementStatus === 'fall_detected') {
      level = Math.max(level, 4);
      anomalies.push({ type: 'fall', description: '낙상 감지', severity: 'high' });
    }
    
    return { level, anomalies, riskScore: level * 20, confidence: 0.7 };
  }
}

/**
 * 고급 이상 징후 생성
 */
function generateAdvancedAnomalies(biometricData, patientData, riskAnalysis) {
  const anomalies = [];
  const breakdown = riskAnalysis.breakdown;

  // 심박수 이상 (연령/성별/기저질환 고려)
  if (biometricData.heartRate) {
    const hr = biometricData.heartRate;
    const age = patientData.age;
    
    if (hr < 40) {
      anomalies.push({ 
        type: 'heart_rate', 
        description: `심각한 서맥 (${hr} bpm, ${age}세 ${patientData.gender})`,
        severity: 'critical'
      });
    } else if (hr > 160) {
      const hasCardiac = patientData.medicalHistory?.includes('heart_disease');
      anomalies.push({ 
        type: 'heart_rate', 
        description: `심각한 빈맥 (${hr} bpm${hasCardiac ? ', 심장질환 병력' : ''})`,
        severity: 'critical'
      });
    }
  }

  // 산소포화도 (폐질환 고려)
  if (biometricData.oxygenLevel && biometricData.oxygenLevel < 90) {
    const hasLungDisease = patientData.medicalHistory?.includes('copd') || 
                          patientData.medicalHistory?.includes('asthma');
    anomalies.push({ 
      type: 'oxygen', 
      description: `산소포화도 저하 (${biometricData.oxygenLevel}%${hasLungDisease ? ', 폐질환 병력' : ''})`,
      severity: 'high'
    });
  }

  // 낙상 (연령별 위험도)
  if (biometricData.movementStatus === 'fall_detected') {
    const isElderly = patientData.age >= 65;
    anomalies.push({ 
      type: 'fall', 
      description: `낙상 감지${isElderly ? ' (고령자 고위험)' : ''}`,
      severity: isElderly ? 'critical' : 'high'
    });
  }

  // 복합 위험 요소
  if (breakdown.personalFactors > 15) {
    const risks = [];
    if (patientData.age > 80) risks.push('초고령');
    if (patientData.medicalHistory?.includes('diabetes')) risks.push('당뇨');
    if (patientData.medicalHistory?.includes('heart_disease')) risks.push('심장질환');
    
    if (risks.length > 0) {
      anomalies.push({ 
        type: 'comorbidity', 
        description: `복합 위험요소: ${risks.join(', ')}`,
        severity: 'medium'
      });
    }
  }

  // 시간적 위험 (야간/새벽)
  if (breakdown.contextual > 8) {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) {
      anomalies.push({
        type: 'temporal',
        description: '새벽시간 응급상황 (의료진 접근성 제한)',
        severity: 'medium'
      });
    }
  }

  return anomalies;
}

/**
 * 실시간 생체신호 엔진에서 감지된 응급상황 처리
 */
async function processRealtimeEmergencyDetection(userId, emergencyAlerts, recentVitals) {
  try {
    logger.info(`실시간 응급상황 처리 시작: ${userId}`, {
      alertCount: emergencyAlerts.length,
      alertTypes: emergencyAlerts.map(a => a.type)
    });

    // 실시간 응급 정보를 바탕으로 BiometricData 생성
    const BiometricData = require('../models/BiometricData');
    
    const biometricDoc = new BiometricData({
      userId,
      timestamp: new Date(),
      vitals: {
        heartRate: recentVitals?.heartRate || null,
        spo2: recentVitals?.spo2 || null,
        bloodPressure: recentVitals?.bloodPressure || null,
        temperature: recentVitals?.temperature || null,
        respiratoryRate: null
      },
      activity: {
        steps: null,
        movement: recentVitals?.activity || 'unknown',
        fallDetected: emergencyAlerts.some(a => a.type === 'fall_detected')
      },
      location: {
        lat: null,  // 실제 구현에서는 GPS 데이터
        lng: null
      },
      deviceInfo: {
        deviceId: 'realtime_engine',
        batteryLevel: 100,
        signalQuality: 0.9
      },
      isRealtimeDetection: true,
      realtimeAlerts: emergencyAlerts
    });

    await biometricDoc.save();

    // 실시간 응급 레벨 결정
    const emergencyLevel = determineRealtimeEmergencyLevel(emergencyAlerts);
    
    // 실시간 이상징후 생성
    const anomalies = generateRealtimeAnomalies(emergencyAlerts, recentVitals);

    // 응급 케이스 분석 및 생성
    return await analyzeBiometricAndMaybeOpenCase(userId, biometricDoc, {
      isRealtimeDetection: true,
      emergencyAlerts,
      detectionSource: 'realtime_biosignal_engine',
      precomputedLevel: emergencyLevel,
      precomputedAnomalies: anomalies
    });

  } catch (error) {
    logger.error('실시간 응급상황 처리 실패', error, { userId });
    throw error;
  }
}

/**
 * 실시간 알림 기반 응급 레벨 결정
 */
function determineRealtimeEmergencyLevel(emergencyAlerts) {
  if (!emergencyAlerts || emergencyAlerts.length === 0) return 1;

  // 최고 심각도를 응급 레벨로 사용
  const maxSeverity = Math.max(...emergencyAlerts.map(alert => alert.severity));
  
  // 특정 알림 타입에 대한 가중치 적용
  let level = maxSeverity;
  
  emergencyAlerts.forEach(alert => {
    switch (alert.type) {
      case 'critical_heart_rate':
      case 'critical_hypoxia':
      case 'asystole':
      case 'vfib':
        level = Math.max(level, 5); // 최고 응급
        break;
      case 'arrhythmia':
      case 'fall_detected':
        level = Math.max(level, 4); // 고위험
        break;
      case 'abnormal_heart_rate':
      case 'hypoxia':
        level = Math.max(level, 3); // 중위험
        break;
    }
  });

  return Math.min(5, Math.max(1, level));
}

/**
 * 실시간 알림 기반 이상징후 생성
 */
function generateRealtimeAnomalies(emergencyAlerts, recentVitals) {
  const anomalies = [];

  emergencyAlerts.forEach(alert => {
    let anomaly = {
      type: alert.type,
      severity: alert.severity,
      description: alert.message,
      detectedAt: new Date(alert.timestamp),
      confidence: alert.confidence || 0.9,
      value: alert.value,
      source: 'realtime_engine'
    };

    // 알림 타입별 추가 정보
    switch (alert.type) {
      case 'critical_heart_rate':
      case 'abnormal_heart_rate':
        anomaly.type = 'heart_rate';
        anomaly.vitalSign = 'heartRate';
        anomaly.threshold = alert.severity >= 5 ? 'critical' : 'warning';
        break;
        
      case 'arrhythmia':
        anomaly.type = 'heart_rhythm';
        anomaly.arrhythmiaType = alert.value;
        anomaly.confidence = alert.confidence;
        break;
        
      case 'critical_hypoxia':
      case 'hypoxia':
        anomaly.type = 'oxygen_saturation';
        anomaly.vitalSign = 'spo2';
        anomaly.threshold = alert.severity >= 5 ? 'critical' : 'warning';
        break;
        
      case 'fall_detected':
        anomaly.type = 'fall';
        anomaly.fallMagnitude = alert.value;
        anomaly.confidence = alert.confidence;
        break;
        
      case 'high_risk_pattern':
        anomaly.type = 'pattern_recognition';
        anomaly.patterns = alert.patterns || [];
        anomaly.riskScore = alert.value;
        break;
    }

    anomalies.push(anomaly);
  });

  return anomalies;
}

module.exports = {
  analyzeBiometricAndMaybeOpenCase,
  advancedMedicalAnalysis,  // 새로운 고급 분석 함수 노출
  processRealtimeEmergencyDetection,
  determineRealtimeEmergencyLevel,
  generateRealtimeAnomalies
};

