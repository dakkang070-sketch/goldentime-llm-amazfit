const EmergencyCase = require('../models/EmergencyCase');
const BiometricData = require('../models/BiometricData');
const { generateNonDiagnosticSummary, generateStressLevel, generateBehaviorAnalysis } = require('./ollamaService');
const { autoMatchParamedicForCase } = require('./matchingService');
const { autoMatchHospitalForCase } = require('./hospitalService');
const { emitEmergencyCaseCreated, emitParamedicMatched, emitHospitalMatched, emitCaseStatusUpdated } = require('./socketService');
const { notifyEmergencyToGuardian } = require('./notificationService');
const { buildEmergencyCaseBiometricSnapshot } = require('./emergencyCaseSnapshotService');
const {
  getAnalysisThrottleTimestamp,
  setAnalysisThrottleTimestamp,
} = require('./analysisThrottleCacheService');
const medicalWeightingService = require('./medicalWeightingService');
const logger = require('../utils/logger');

/**
 * 생체 데이터 분석, 케이스 생성, 알림 전파를 오케스트레이션하는 서비스 모듈입니다.
 */
/**
 * 숫자형 입력을 지정 범위 안으로 제한하고, 유효하지 않으면 null을 반환합니다.
 */
function clampNumber(n, min, max) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

/**
 * LLM 응답이 없을 때 현재 생체값과 기준선 차이로 스트레스 지수를 추정합니다.
 */
function heuristicStressLevel({ user, doc }) {
  const hr = asNum(doc.heartRate) ?? 0;
  const spO2 = asNum(doc.spO2);
  const temp = asNum(doc.bodyTemperature);
  const baseline = asNum(user?.baselineBiometric?.heartRate?.avg) ?? 70;
  const movement = String(doc.movementStatus || 'unknown');
  const tempAssessment = buildTemperatureAssessment({ user, doc });

  let score = 20;
  const hrDelta = hr > 0 ? hr - baseline : 0;
  if (hrDelta > 0) score += Math.min(40, hrDelta * 1.2);

  if (movement === 'running') score += 10;
  if (movement === 'fall_detected') score += 20;

  if (typeof spO2 === 'number' && spO2 > 0 && spO2 < 95) score += (95 - spO2) * 1.5;
  if (tempAssessment.temperatureMeasurementType === 'wrist_skin') {
    if (typeof tempAssessment.bodyTemperatureDelta === 'number' && tempAssessment.bodyTemperatureDelta >= 1.5) {
      score += 8;
    } else if (typeof tempAssessment.bodyTemperatureDelta === 'number' && tempAssessment.bodyTemperatureDelta >= 1.0) {
      score += 4;
    } else if (typeof temp === 'number' && temp > 0 && temp >= 36.1 && movement !== 'running') {
      score += 2;
    }
  } else if (typeof temp === 'number' && temp > 0 && temp >= 37.6) {
    score += Math.min(15, (temp - 37.5) * 10);
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * 최근 생체 데이터 묶음을 평균, 표준편차, 움직임 분포 형태로 요약합니다.
 */
function summarizeRecentBiometrics(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const hr = [];
  const spo2 = [];
  const temp = [];
  const steps = [];
  const movement = { stationary: 0, walking: 0, running: 0, fall_detected: 0, unknown: 0 };

  for (const r of list) {
    const vHr = asNum(r.heartRate);
    if (vHr != null && vHr > 0) hr.push(vHr);
    const vSp = asNum(r.spO2);
    if (vSp != null && vSp > 0) spo2.push(vSp);
    const vT = asNum(r.bodyTemperature);
    if (vT != null && vT > 0) temp.push(vT);
    const vSteps = asNum(r.steps);
    if (vSteps != null && vSteps >= 0) steps.push(vSteps);
    const mv = String(r.movementStatus || 'unknown');
    if (Object.prototype.hasOwnProperty.call(movement, mv)) movement[mv] += 1;
    else movement.unknown += 1;
  }

  // 최근 이력 전체를 LLM/규칙 공통 컨텍스트로 쓰기 위해 평균과 분산값을 함께 구합니다.
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  /**
   * `std` 기능을 수행합니다.
   */
  const std = (arr) => {
    if (arr.length < 2) return null;
    const m = avg(arr);
    const v = arr.reduce((acc, x) => acc + (x - m) * (x - m), 0) / (arr.length - 1);
    return Math.sqrt(v);
  };

  const firstAt = list.length ? new Date(list[list.length - 1].collectedAt).getTime() : null;
  const lastAt = list.length ? new Date(list[0].collectedAt).getTime() : null;
  const spanMin = firstAt && lastAt ? Math.max(0, Math.round((lastAt - firstAt) / 60000)) : null;

  return {
    count: list.length,
    spanMin,
    hrAvg: avg(hr),
    hrStd: std(hr),
    spO2Avg: avg(spo2),
    bodyTempAvg: avg(temp),
    stepsLast: steps.length ? steps[0] : null,
    movement,
  };
}

/**
 * 현재 시점 이전의 생체 이력과 최근 응급 케이스를 함께 읽어 분석 컨텍스트를 구성합니다.
 */
async function loadAnalysisContext({ userId, collectedAt }) {
  const at = collectedAt instanceof Date ? collectedAt : new Date(collectedAt || Date.now());
  const recentRows = await BiometricData.find({ userId, collectedAt: { $lt: at } })
    .sort({ collectedAt: -1 })
    .limit(120)
    .select('collectedAt heartRate spO2 bodyTemperature steps movementStatus stressLevel')
    .lean();

  const caseRows = await EmergencyCase.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('createdAt status emergencyLevel detectedAnomalies')
    .lean();

  const summary = summarizeRecentBiometrics(recentRows);
  // 최근 30건 이상이면서 최소 30분 범위를 덮으면 개인 baseline 비교에 쓸 수 있는 컨텍스트로 봅니다.
  const dataSufficient = summary.count >= 30 && (summary.spanMin == null || summary.spanMin >= 30);

  return {
    dataSufficiency: dataSufficient ? 'sufficient' : 'insufficient',
    biometricSummary: summary,
    previousBiometric: recentRows[0]
      ? {
          heartRate: asNum(recentRows[0].heartRate),
          spO2: asNum(recentRows[0].spO2),
          bodyTemperature: asNum(recentRows[0].bodyTemperature),
          steps: asNum(recentRows[0].steps),
          movementStatus: recentRows[0].movementStatus || 'unknown',
          collectedAt: recentRows[0].collectedAt,
        }
      : null,
    recentCaseCount: caseRows.length,
    recentCases: caseRows.slice(0, 5).map((c) => ({
      createdAt: c.createdAt,
      status: c.status,
      emergencyLevel: c.emergencyLevel,
      anomalies: Array.isArray(c.detectedAnomalies)
        ? c.detectedAnomalies.slice(0, 3).map((a) => a?.description).filter(Boolean)
        : [],
    })),
  };
}

/**
 * 문자열 기반 seed 계산에 사용할 간단한 정수 해시를 만듭니다.
 */
function hashString(input) {
  const s = String(input || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * 같은 seed에 대해 항상 같은 문구 variant를 고르도록 결정합니다.
 */
function pickVariant(seed, variants) {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const idx = hashString(seed) % variants.length;
  return variants[idx];
}

/**
 * 유효한 숫자만 추려 null-safe 비교에 쓰기 위한 공용 헬퍼입니다.
 */
function asNum(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Amazfit 손목 피부온도는 중심체온과 분리해서 해석하기 위한 메타데이터를 만듭니다.
 */
function buildTemperatureAssessment({ user, doc, context }) {
  const temp = asNum(doc?.bodyTemperature);
  const source = String(doc?.rawData?.source || doc?.source || '').toLowerCase();
  const measurementType = source === 'amazfit' ? 'wrist_skin' : 'unspecified';
  const baseline =
    asNum(user?.baselineBiometric?.wristTemperature?.avg) ??
    asNum(context?.biometricSummary?.bodyTempAvg);
  const delta =
    typeof temp === 'number' && typeof baseline === 'number'
      ? Math.round((temp - baseline) * 100) / 100
      : null;
  const temperatureConfidence =
    typeof temp === 'number' && doc?.rawData?.isWear === true
      ? baseline !== null
        ? 'medium'
        : 'low'
      : 'low';

  return {
    bodyTemperatureRaw: temp,
    temperatureMeasurementType: measurementType,
    bodyTemperatureBaseline: baseline,
    bodyTemperatureDelta: delta,
    temperatureConfidence,
  };
}

/**
 * 벡터형 센서 데이터를 합성 크기로 정규화합니다.
 */
function getVectorMagnitude(vec) {
  if (!vec || typeof vec !== 'object') return null;
  const x = asNum(vec.x) ?? 0;
  const y = asNum(vec.y) ?? 0;
  const z = asNum(vec.z) ?? 0;
  const magnitude = Math.sqrt((x * x) + (y * y) + (z * z));
  if (!Number.isFinite(magnitude)) return null;
  return magnitude > 20 ? Math.round((magnitude / 1000) * 100) / 100 : Math.round(magnitude * 100) / 100;
}

/**
 * 고령자 여부에 따라 응급 가중치를 산정합니다.
 */
function computeAgeRiskWeight(user) {
  const age = asNum(user?.age);
  if (age == null) return 0;
  if (age >= 85) return 10;
  if (age >= 75) return 8;
  if (age >= 65) return 5;
  return 0;
}

/**
 * 낙상/응급 판단에 필요한 score와 근거 feature를 현재 문서와 직전 데이터로부터 계산합니다.
 */
function buildFallAssessment({ user, doc, context }) {
  const isWear = doc?.rawData?.isWear;
  const movementStatus = String(doc?.movementStatus || 'unknown');
  const rawFeatures = doc?.fallFeatures || doc?.rawData?.fallFeatures || {};
  const previous = context?.previousBiometric || null;
  const heartRate = asNum(doc?.heartRate);
  const spO2 = asNum(doc?.spO2);
  const previousHr = asNum(previous?.heartRate);
  const previousSpO2 = asNum(previous?.spO2);
  const ageRiskWeight = computeAgeRiskWeight(user);
  const responseState =
    typeof doc?.responseState === 'string'
      ? doc.responseState
      : typeof doc?.rawData?.responseState === 'string'
        ? doc.rawData.responseState
        : 'unknown';

  if (isWear === false) {
    return {
      fallScore: 0,
      emergencyScore: 0,
      responseState,
      ageRiskWeight,
      // 탈착 상태에서는 낙상 관련 파생값을 모두 비워 가짜 응급 상승을 막습니다.
      fallFeatures: {
        fallMagnitude: null,
        fallConfidence: 0,
        orientationChangeDeg: null,
        postImpactImmobilitySec: null,
        stepResumeWithin20s: null,
        hrDelta30s: null,
        spo2Delta30s: null,
      },
    };
  }

  const fallMagnitude =
    asNum(rawFeatures.fallMagnitude) ??
    asNum(doc?.rawData?.fallMagnitude) ??
    getVectorMagnitude(doc?.acceleration);
  const orientationChangeDeg =
    asNum(rawFeatures.orientationChangeDeg) ??
    asNum(doc?.rawData?.orientationChangeDeg) ??
    getVectorMagnitude(doc?.gyroscope);
  const postImpactImmobilitySec =
    asNum(rawFeatures.postImpactImmobilitySec) ??
    asNum(doc?.rawData?.postImpactImmobilitySec) ??
    null;
  const stepResumeWithin20s =
    typeof rawFeatures.stepResumeWithin20s === 'boolean'
      ? rawFeatures.stepResumeWithin20s
      : typeof doc?.rawData?.stepResumeWithin20s === 'boolean'
        ? doc.rawData.stepResumeWithin20s
        : null;
  const hrDelta30s =
    asNum(rawFeatures.hrDelta30s) ??
    (heartRate != null && previousHr != null ? Math.round((heartRate - previousHr) * 100) / 100 : null);
  const spo2Delta30s =
    asNum(rawFeatures.spo2Delta30s) ??
    (spO2 != null && previousSpO2 != null ? Math.round((spO2 - previousSpO2) * 100) / 100 : null);

  let fallScore = asNum(doc?.fallScore) ?? 0;
  if (fallScore === 0) {
    if (movementStatus === 'fall_detected') fallScore += 25;

    if (typeof fallMagnitude === 'number') {
      if (fallMagnitude >= 3.0) fallScore += 25;
      else if (fallMagnitude >= 2.4) fallScore += 18;
      else if (fallMagnitude >= 2.0) fallScore += 10;
    }

    if (typeof orientationChangeDeg === 'number') {
      if (orientationChangeDeg >= 60) fallScore += 20;
      else if (orientationChangeDeg >= 35) fallScore += 12;
      else if (orientationChangeDeg >= 20) fallScore += 6;
    }

    if (typeof postImpactImmobilitySec === 'number') {
      if (postImpactImmobilitySec >= 30) fallScore += 20;
      else if (postImpactImmobilitySec >= 15) fallScore += 14;
      else if (postImpactImmobilitySec >= 5) fallScore += 6;
    }

    if (stepResumeWithin20s === false) fallScore += 10;
    if (typeof hrDelta30s === 'number' && Math.abs(hrDelta30s) >= 20) fallScore += 5;
    if (typeof spo2Delta30s === 'number' && spo2Delta30s <= -3) fallScore += 5;

    if (movementStatus === 'fall_detected' && fallScore < 45) fallScore = 45;
    if (typeof postImpactImmobilitySec === 'number' && postImpactImmobilitySec >= 15 && fallScore < 60) fallScore = 60;
    fallScore = Math.round(Math.min(100, Math.max(0, fallScore)));
  }

  let fallConfidence =
    clampNumber(asNum(rawFeatures.fallConfidence) ?? asNum(doc?.rawData?.fallConfidence), 0, 1);
  if (fallConfidence == null) {
    fallConfidence = clampNumber(Math.round((fallScore / 100) * 100) / 100, 0, 1) ?? 0;
  }

  let emergencyScore = asNum(doc?.emergencyScore) ?? 0;
  if (emergencyScore === 0) {
    if (fallScore >= 85) emergencyScore += 35;
    else if (fallScore >= 70) emergencyScore += 28;
    else if (fallScore >= 50) emergencyScore += 18;

    if (typeof heartRate === 'number') {
      if (heartRate <= 35 || heartRate >= 160) emergencyScore += 20;
      else if (heartRate <= 45 || heartRate >= 130) emergencyScore += 12;
      else if (typeof previousHr === 'number' && Math.abs(heartRate - previousHr) >= 15) emergencyScore += 8;
    }

    if (typeof spO2 === 'number' && spO2 > 0) {
      if (spO2 < 90) emergencyScore += 20;
      else if (spO2 <= 91) emergencyScore += 14;
      else if (spO2 <= 94) emergencyScore += 8;
    }

    if (responseState === 'no_response') emergencyScore += 20;
    else if (responseState === 'delayed') emergencyScore += 10;

    if (typeof postImpactImmobilitySec === 'number') {
      if (postImpactImmobilitySec >= 30) emergencyScore += 10;
      else if (postImpactImmobilitySec >= 15) emergencyScore += 5;
    }

    emergencyScore += ageRiskWeight;
    emergencyScore = Math.round(Math.min(100, Math.max(0, emergencyScore)));
  }

  return {
    fallScore,
    emergencyScore,
    responseState,
    ageRiskWeight,
    fallFeatures: {
      fallMagnitude,
      fallConfidence,
      orientationChangeDeg,
      postImpactImmobilitySec,
      stepResumeWithin20s,
      hrDelta30s,
      spo2Delta30s,
    },
  };
}

/**
 * 정상 또는 경미 상태일 때 사용자에게 보여줄 비응급 요약 문구를 조합합니다.
 */
function buildNormalCoachingText({ user, doc, prevDoc }) {
  const hr = asNum(doc.heartRate);
  const spo2 = asNum(doc.spO2);
  const stress = asNum(doc.stressLevel);
  const baselineHrAvg = asNum(user?.baselineBiometric?.heartRate?.avg);
  const prevHr = asNum(prevDoc?.heartRate);
  const hrDelta = hr != null && prevHr != null ? hr - prevHr : null;

  const evidence = [];
  if (hr != null) {
    if (baselineHrAvg != null) evidence.push(`심박 ${hr}bpm (기초 ${Math.round(baselineHrAvg)}bpm)`);
    else evidence.push(`심박 ${hr}bpm`);
  }
  if (hrDelta != null && hrDelta !== 0) evidence.push(`직전 대비 ${Math.abs(hrDelta)}bpm ${hrDelta > 0 ? '상승' : '하락'}`);
  if (spo2 != null) evidence.push(`산소포화도 ${spo2}%`);
  if (stress != null) evidence.push(`스트레스 ${Math.round(stress)}`);
  evidence.push(`움직임 ${doc.movementStatus || 'unknown'}`);

  return [
    '위험도: 정상',
    `핵심근거: ${evidence.join(', ')}`,
    '복합상황: 현재 수집된 데이터에서는 급성 위험을 강하게 시사하는 복합 징후가 제한적입니다.',
    '권고: 지속 모니터링',
  ].join('\n');
}

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
  const fallScore = asNum(doc.fallScore) ?? 0;
  const emergencyScore = asNum(doc.emergencyScore) ?? 0;
  const responseState = String(doc.responseState || 'unknown');
  const postImpactImmobilitySec = asNum(doc?.fallFeatures?.postImpactImmobilitySec);
  const fallMagnitude = asNum(doc?.fallFeatures?.fallMagnitude);

  // 기초선이 있으면 활용 (없으면 보수적으로)
  const baselineHrAvg = user?.baselineBiometric?.heartRate?.avg;

  // 기본: 정상
  let level = 1;
  const anomalies = [];

  // 워치 탈착은 별도 critical 케이스로 올려 관제에서 즉시 경고가 보이게 합니다.
  if (doc?.rawData?.isWear === false) {
    level = 5;
    anomalies.push({
      type: 'other',
      description: '워치 탈착 감지',
      severity: 'critical',
    });
    return { level, anomalies };
  }

  // 낙상/응급 점수 기반 상향
  if (emergencyScore >= 85) {
    level = Math.max(level, 5);
    anomalies.push({
      type: 'fall',
      description: `중증 응급 의심 (낙상 ${fallScore}, 응급 ${emergencyScore}${responseState === 'no_response' ? ', 무응답' : ''})`,
      severity: 'critical',
    });
  } else if (emergencyScore >= 70) {
    level = Math.max(level, 4);
    anomalies.push({
      type: 'fall',
      description: `낙상 고위험 (낙상 ${fallScore}, 응급 ${emergencyScore})`,
      severity: 'high',
    });
  } else if (fallScore >= 50 || emergencyScore >= 50) {
    level = Math.max(level, 3);
    anomalies.push({
      type: 'fall',
      description: `낙상 의심 (낙상 ${fallScore}, 응급 ${emergencyScore})`,
      severity: 'medium',
    });
  }

  if (responseState === 'no_response') {
    level = Math.max(level, 4);
    anomalies.push({ type: 'response', description: '사용자 무응답 상태', severity: 'high' });
  } else if (responseState === 'delayed') {
    level = Math.max(level, 3);
    anomalies.push({ type: 'response', description: '사용자 응답 지연', severity: 'medium' });
  }

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
    const hasStrongFallEvidence =
      (typeof fallScore === 'number' && fallScore >= 50) ||
      (typeof fallMagnitude === 'number' && fallMagnitude >= 2.4) ||
      (typeof postImpactImmobilitySec === 'number' && postImpactImmobilitySec >= 5) ||
      responseState === 'delayed' ||
      responseState === 'no_response';

    level = Math.max(level, hasStrongFallEvidence ? 4 : 2);
    anomalies.push({
      type: 'fall',
      description: `${hasStrongFallEvidence ? '낙상 가능 신호 감지' : '충격/낙상 후보 신호 감지'}${typeof fallMagnitude === 'number' ? ` (${fallMagnitude.toFixed(2)}g)` : ''}${typeof postImpactImmobilitySec === 'number' ? `, 무움직임 ${postImpactImmobilitySec}초` : ''}`,
      severity: hasStrongFallEvidence ? 'high' : 'medium',
    });
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

/**
 * 생체 문서를 분석해 요약/행동/스트레스 정보를 저장하고 필요 시 응급 케이스를 엽니다.
 */
async function analyzeBiometricAndMaybeOpenCase({ user, biometricDoc, options = {} }) {
  try {
    const isWear = biometricDoc?.rawData?.isWear;
    const hr = typeof biometricDoc?.heartRate === 'number' ? biometricDoc.heartRate : 0;
    const spo2 = typeof biometricDoc?.spO2 === 'number' ? biometricDoc.spO2 : 0;
    const looksRecovered = hr > 0 || spo2 > 0;
    if (isWear === true && looksRecovered) {
      const activeWearRelated = await EmergencyCase.findOne({
        userId: biometricDoc.userId,
        status: { $in: ['detected', 'matched', 'in_progress', 'transporting'] },
        detectedAnomalies: {
          $elemMatch: {
            description: {
              $regex: '(워치\\s*탈착\\s*감지|심박수\\s*매우\\s*낮음\\(0\\s*bpm\\))',
              $options: 'i',
            },
          },
        },
      }).sort({ createdAt: -1 });

      if (activeWearRelated) {
        activeWearRelated.status = 'cancelled';
        activeWearRelated.cancelledAt = new Date(biometricDoc.collectedAt || Date.now());
        activeWearRelated.cancelledReason = 'watch_worn_again';
        await activeWearRelated.save();
        emitCaseStatusUpdated(String(activeWearRelated._id), 'cancelled', { userId: String(biometricDoc.userId) });
      }
    }
  } catch {}

  let latestContext = null;
  try {
    latestContext = await loadAnalysisContext({ userId: biometricDoc.userId, collectedAt: biometricDoc.collectedAt });
  } catch {}

  const fallAssessment = buildFallAssessment({ user, doc: biometricDoc, context: latestContext });
  biometricDoc.fallScore = fallAssessment.fallScore;
  biometricDoc.emergencyScore = fallAssessment.emergencyScore;
  biometricDoc.fallFeatures = fallAssessment.fallFeatures;
  biometricDoc.responseState = fallAssessment.responseState;
  biometricDoc.ageRiskWeight = fallAssessment.ageRiskWeight;

  let rule = ruleBasedEmergencyLevel({ user, doc: biometricDoc });
  if (typeof options?.precomputedLevel === 'number' && options.precomputedLevel > rule.level) {
    const extraAnomalies = Array.isArray(options?.precomputedAnomalies) ? options.precomputedAnomalies : [];
    rule = {
      level: options.precomputedLevel,
      anomalies: [...rule.anomalies, ...extraAnomalies],
    };
  }
  const { level, anomalies } = rule;

  let behaviorActivity = 'unknown';
  let behaviorConfidence = 0;
  let behaviorSummary = null;
  let dataSufficiency = null;
  const isWear = biometricDoc?.rawData?.isWear;
  let computedStressLevel = clampNumber(asNum(biometricDoc.stressLevel), 0, 100);
  let stressReason = null;
  let stressModel = 'heuristic';

  if (isWear === false) {
    computedStressLevel = 0;
  }

  if (computedStressLevel === null) {
    computedStressLevel = heuristicStressLevel({ user, doc: biometricDoc });
  }

  if (isWear !== false && (process.env.ENABLE_OLLAMA || '').toLowerCase() === 'true') {
    const userIdKey = String(user?._id || biometricDoc.userId || '');
    const nowMs = Date.now();
    const lastMs = await getAnalysisThrottleTimestamp('stress', userIdKey);
    if (userIdKey && nowMs - lastMs >= 15000) {
      await setAnalysisThrottleTimestamp('stress', userIdKey, nowMs, 60 * 1000);
      try {
        const context = latestContext || await loadAnalysisContext({ userId: biometricDoc.userId, collectedAt: biometricDoc.collectedAt });
        latestContext = context;
        const temperatureAssessment = buildTemperatureAssessment({ user, doc: biometricDoc, context });
        const llm = await generateStressLevel({
          userBaseline: { baselineHrAvg: asNum(user?.baselineBiometric?.heartRate?.avg) },
          biometric: {
            collectedAt: biometricDoc.collectedAt?.toISOString?.() || String(biometricDoc.collectedAt),
            isWear,
            heartRate: biometricDoc.heartRate,
            spO2: biometricDoc.spO2,
            bodyTemperature: biometricDoc.bodyTemperature,
            steps: biometricDoc.steps,
            movementStatus: biometricDoc.movementStatus,
            fallScore: biometricDoc.fallScore,
            emergencyScore: biometricDoc.emergencyScore,
            fallFeatures: biometricDoc.fallFeatures,
            responseState: biometricDoc.responseState,
            ageRiskWeight: biometricDoc.ageRiskWeight,
            acceleration: biometricDoc.acceleration,
            gyroscope: biometricDoc.gyroscope,
            barometer: biometricDoc.barometer,
            ...temperatureAssessment,
          },
          context,
        });
        const llmStress = clampNumber(Number(llm?.stressLevel), 0, 100);
        if (llmStress !== null) {
          computedStressLevel = llmStress;
          stressReason = typeof llm?.reason === 'string' ? llm.reason : null;
          stressModel = 'ollama';
        }
      } catch {
        await setAnalysisThrottleTimestamp('stress', userIdKey, nowMs - 45000, 60 * 1000);
      }
    }
  }

  biometricDoc.stressLevel = computedStressLevel;

  const behaviorEnabled = (process.env.ENABLE_LLM_BEHAVIOR || '').toLowerCase() === 'true';
  if (behaviorEnabled) {
    const mv = String(biometricDoc.movementStatus || 'unknown');
    behaviorActivity = mv === 'walking' ? 'walking' : mv === 'running' ? 'running' : mv === 'stationary' ? 'resting' : 'unknown';
    behaviorConfidence = 0.35;
    behaviorSummary =
      behaviorActivity === 'walking'
        ? '걷는 중으로 보입니다.'
        : behaviorActivity === 'running'
          ? '달리기/격한 활동 중으로 보입니다.'
          : behaviorActivity === 'resting'
            ? '휴식 또는 정지 상태로 보입니다.'
            : '행동 패턴이 불명확합니다.';
  }
  if (behaviorEnabled) {
    try {
      const userIdKey = String(user?._id || biometricDoc.userId || '');
      const nowMs = Date.now();
      const lastMs = await getAnalysisThrottleTimestamp('behavior', userIdKey);
      if (userIdKey && nowMs - lastMs >= 60000) {
        await setAnalysisThrottleTimestamp('behavior', userIdKey, nowMs, 2 * 60 * 1000);

        const context = latestContext || await loadAnalysisContext({ userId: biometricDoc.userId, collectedAt: biometricDoc.collectedAt });
        latestContext = context;
        dataSufficiency = context.dataSufficiency;

        if ((process.env.ENABLE_OLLAMA || '').toLowerCase() === 'true') {
          const temperatureAssessment = buildTemperatureAssessment({ user, doc: biometricDoc, context });
          const llm = await generateBehaviorAnalysis({
            userBaseline: { baselineHrAvg: asNum(user?.baselineBiometric?.heartRate?.avg) },
            biometric: {
              collectedAt: biometricDoc.collectedAt?.toISOString?.() || String(biometricDoc.collectedAt),
              isWear,
              heartRate: biometricDoc.heartRate,
              spO2: biometricDoc.spO2,
              bodyTemperature: biometricDoc.bodyTemperature,
              steps: biometricDoc.steps,
              movementStatus: biometricDoc.movementStatus,
              fallScore: biometricDoc.fallScore,
              emergencyScore: biometricDoc.emergencyScore,
              fallFeatures: biometricDoc.fallFeatures,
              responseState: biometricDoc.responseState,
              ageRiskWeight: biometricDoc.ageRiskWeight,
              acceleration: biometricDoc.acceleration,
              gyroscope: biometricDoc.gyroscope,
              barometer: biometricDoc.barometer,
              stressLevel: computedStressLevel,
              ...temperatureAssessment,
            },
            context,
          });

          if (llm) {
            behaviorActivity = llm.activity;
            behaviorConfidence = llm.confidence;
            behaviorSummary = llm.summary;
          }
        }
      }
    } catch {}
  }

  /**
   * `analysisText` 기능을 수행합니다.
   */
  let analysisText = (() => {
    if (level === 1) return '정상 범위로 보입니다. 계속 모니터링합니다.';
    if (level === 2) return '약간의 이상 징후 가능성이 있습니다. 추적 모니터링이 필요합니다.';
    if (level === 3) return '이상 징후 가능성이 높습니다. 관제 확인을 권고합니다.';
    if (level === 4) return '위급 가능성이 있습니다. 신속한 확인/대응이 필요합니다.';
    return '응급 가능성이 매우 높습니다. 즉시 대응이 필요합니다.';
  })();

  if (level <= 2) {
    const BiometricData = require('../models/BiometricData');
    const prevDoc = await BiometricData.findOne({
      userId: biometricDoc.userId,
      collectedAt: { $lt: biometricDoc.collectedAt },
    })
      .sort({ collectedAt: -1 })
      .select('heartRate spO2 steps stressLevel bloodPressure rawData collectedAt')
      .lean();
    analysisText = buildNormalCoachingText({ user, doc: biometricDoc, prevDoc });
  }

  // Ollama가 준비되어 있으면 “비진단 요약”을 덧붙임 (실패해도 규칙 기반은 유지)
  if ((process.env.ENABLE_OLLAMA || '').toLowerCase() === 'true') {
    const userIdKey = String(user?._id || biometricDoc.userId || '');
    const nowMs = Date.now();
    const lastMs = await getAnalysisThrottleTimestamp('analysis', userIdKey);
    if (userIdKey && nowMs - lastMs >= 30000) {
      await setAnalysisThrottleTimestamp('analysis', userIdKey, nowMs, 90 * 1000);
      try {
        const temperatureAssessment = buildTemperatureAssessment({ user, doc: biometricDoc, context: latestContext });
        const commonPayload = {
          collectedAt: biometricDoc.collectedAt?.toISOString?.() || String(biometricDoc.collectedAt),
          heartRate: biometricDoc.heartRate,
          stressLevel: computedStressLevel,
          movementStatus: biometricDoc.movementStatus,
          fallScore: biometricDoc.fallScore,
          emergencyScore: biometricDoc.emergencyScore,
          fallFeatures: biometricDoc.fallFeatures,
          responseState: biometricDoc.responseState,
          ageRiskWeight: biometricDoc.ageRiskWeight,
          location: biometricDoc.location,
          spO2: biometricDoc.spO2,
          bodyTemperature: biometricDoc.bodyTemperature,
          steps: biometricDoc.steps,
          distance: biometricDoc?.rawData?.distance,
          ...temperatureAssessment,
        };

        const llmText = await generateNonDiagnosticSummary({
          userBaseline: { baselineHrAvg: user?.baselineBiometric?.heartRate?.avg },
          biometric: commonPayload,
          ruleResult: rule,
        });
        if (llmText) analysisText = llmText;
      } catch (e) {
        await setAnalysisThrottleTimestamp('analysis', userIdKey, nowMs - 25000, 90 * 1000);
      }
    }
  }

  // BiometricData.analysis 업데이트
  const conflictDetected = detectAiConflict(level, analysisText);
  
  biometricDoc.analysis = {
    isAnomaly: level >= 3,
    emergencyLevel: level,
    analysisResult: analysisText,
    analyzedAt: new Date(),
    conflictDetected: conflictDetected,
    stressReason: stressReason,
    llmModel: stressModel,
    dataSufficiency: dataSufficiency
  };

  if (behaviorEnabled) {
    biometricDoc.analysis.behavior = behaviorActivity;
    biometricDoc.analysis.behaviorConfidence = behaviorConfidence;
    biometricDoc.analysis.behaviorSummary = behaviorSummary;
    if (typeof behaviorSummary === 'string') {
      biometricDoc.analysis.analysisResult = `${analysisText}\n행동 추정: ${behaviorSummary}`;
    }
  }
  await biometricDoc.save();

  if (conflictDetected) {
    logger.warn(`⚠️ AI 분석 갈등 감지 [User: ${biometricDoc.userId}]: Rule Level ${level} vs LLM Text Analysis`);
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
        confidence: calculateRuleConfidence({
          level,
          anomalies,
          summary: analysisText,
        }),
        analyzedAt: new Date(),
        model: 'rule-based-mvp',
      },
      biometricSnapshot: buildEmergencyCaseBiometricSnapshot({
        source: 'biometric_doc',
        biometric: biometricDoc,
      }),
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
    stressLevel: computedStressLevel,
    stressReason,
    fallScore: biometricDoc.fallScore,
    emergencyScore: biometricDoc.emergencyScore,
    responseState: biometricDoc.responseState,
    createdCaseId,
  };
}

/**
 * Rule 레벨과 LLM 문구가 서로 반대 의미를 내는지 간단히 감지합니다.
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

/**
 * 규칙 기반 응급 레벨과 이상 징후 수를 사용해 0~1 신뢰도를 계산합니다.
 */
function calculateRuleConfidence({ level, anomalies = [], summary }) {
  const boundedLevel = Math.min(Math.max(Number(level) || 1, 1), 5);
  const anomalyFactor = Math.min((Array.isArray(anomalies) ? anomalies.length : 0) / 3, 1);
  const summaryFactor =
    typeof summary === 'string' && summary.trim().length > 0 ? 1 : 0;
  const confidence =
    0.35 +
    ((boundedLevel - 1) / 4) * 0.35 +
    anomalyFactor * 0.2 +
    summaryFactor * 0.1;

  return Number(Math.min(Math.max(confidence, 0), 1).toFixed(3));
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
    
    return {
      level,
      anomalies,
      riskScore: level * 20,
      confidence: calculateRuleConfidence({
        level,
        anomalies,
        summary: anomalies.map((anomaly) => anomaly.description).join(' '),
      }),
    };
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
    
    const responseState =
      emergencyAlerts.some((a) => a.type === 'no_response')
        ? 'no_response'
        : emergencyAlerts.some((a) => a.type === 'delayed_response')
          ? 'delayed'
          : 'unknown';
    const biometricDoc = new BiometricData({
      userId,
      collectedAt: new Date(),
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
      heartRate: recentVitals?.heartRate || null,
      spO2: recentVitals?.spo2 || null,
      bodyTemperature: recentVitals?.temperature || null,
      movementStatus: emergencyAlerts.some(a => a.type === 'fall_detected') ? 'fall_detected' : 'unknown',
      responseState,
      isRealtimeDetection: true,
      realtimeAlerts: emergencyAlerts
    });

    await biometricDoc.save();

    // 실시간 응급 레벨 결정
    const emergencyLevel = determineRealtimeEmergencyLevel(emergencyAlerts);
    
    // 실시간 이상징후 생성
    const anomalies = generateRealtimeAnomalies(emergencyAlerts, recentVitals);

    // 응급 케이스 분석 및 생성
    const User = require('../models/User');
    const user = await User.findById(userId).select('_id status hospitalMode settings baselineBiometric wearableDevice age consents');
    if (!user) throw new Error('실시간 응급 사용자 조회 실패');

    return await analyzeBiometricAndMaybeOpenCase({
      user,
      biometricDoc,
      options: {
        isRealtimeDetection: true,
        emergencyAlerts,
        detectionSource: 'realtime_biosignal_engine',
        precomputedLevel: emergencyLevel,
        precomputedAnomalies: anomalies
      }
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

/**
 * 실시간 분석, 고급 분석, 이상 징후 생성 함수를 다른 관제 흐름에서 재사용할 수 있도록 export 합니다.
 */
module.exports = {
  analyzeBiometricAndMaybeOpenCase,
  advancedMedicalAnalysis,  // 새로운 고급 분석 함수 노출
  processRealtimeEmergencyDetection,
  determineRealtimeEmergencyLevel,
  generateRealtimeAnomalies
};
