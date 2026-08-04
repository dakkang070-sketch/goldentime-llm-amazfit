const axios = require('axios');
const cacheService = require('./cacheService');
const {
  buildTemperaturePromptRules,
  buildTemperaturePromptBlock,
  buildNonDiagnosticSummaryPrompt,
} = require('./bioToTextEngine');

const MODEL_CACHE_TTL_MS = 60 * 1000;
const CONTROL_LABELS = ['위험도', '핵심근거', '복합상황', '권고'];
const CONTROL_RISK_LABELS = ['낮음', '주의', '높음', '매우 높음'];
const CONTROL_TERM_REPLACEMENTS = [
  [/저혈압 증세|저혈압 가능성|저혈압/gi, '심박수 저하 경향'],
  [/고혈압/gi, '혈압 관련 위험 신호'],
  [/빈맥/gi, '심박수 빠름'],
  [/서맥/gi, '심박수 느림'],
  [/심정지/gi, '심박 신호 소실'],
  [/쇼크/gi, '급격한 위험 신호'],
  [/발작/gi, '급격한 이상 반응'],
  [/저산소증/gi, '산소포화도 저하'],
  [/호흡부전/gi, '호흡 관련 위험 신호'],
  [/실신/gi, '무반응'],
  [/의식저하/gi, '반응 저하'],
  [/저체온증/gi, '체온 저하 경향'],
  [/\bstationary\b/gi, '정지 상태'],
  [/\bwalking\b/gi, '걷는 상태'],
  [/\brunning\b/gi, '달리는 상태'],
  [/\bresponsive\b/gi, '응답 있음'],
  [/\bdelayed\b/gi, '응답 지연'],
  [/\bno_response\b/gi, '무응답'],
  [/\bfall_detected\b/gi, '낙상 감지'],
];

/**
 * 관제 분석용 Ollama 프롬프트 생성과 응답 정규화 함수를 묶은 서비스 모듈입니다.
 */
/**
 * 숫자 결과를 지정 범위 안으로 제한하고 유효하지 않으면 null을 반환합니다.
 */
function clampNumber(n, min, max) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

/**
 * 비교와 후처리에 쓰기 쉽도록 공백과 줄바꿈을 정리합니다.
 */
function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 관제 입력 라인에서 특정 라벨의 값을 읽어옵니다.
 */
function readControlField(rawInput, label) {
  const regex = new RegExp(`- ${label}:\\s*(.+)`, 'i');
  const match = String(rawInput || '').match(regex);
  return match ? match[1].trim() : '';
}

/**
 * 문자열 숫자값을 읽어 유효하면 숫자로, 아니면 null로 반환합니다.
 */
function parseOptionalNumber(value, suffixPattern) {
  const normalized = String(value || '')
    .replace(suffixPattern || /$/g, '')
    .replace(/,/g, '')
    .trim();
  if (!normalized || normalized === 'unknown' || normalized === '미확인' || normalized === 'none') {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 평가/후처리 공용으로 관제 입력 텍스트를 생체 컨텍스트 구조로 변환합니다.
 */
function parseControlInputContext(rawInput, emergencyLevelOverride) {
  const input = String(rawInput || '');
  const levelFromInput = parseOptionalNumber(readControlField(input, '규칙기반 응급레벨'));
  const movementStatus = readControlField(input, '움직임') || 'unknown';
  const responseState = readControlField(input, '반응상태') || 'unknown';
  const locationText = readControlField(input, '위치');

  return {
    biometric: {
      baselineHeartRate: parseOptionalNumber(readControlField(input, '기초선 심박수'), /\s*bpm$/i),
      heartRate: parseOptionalNumber(readControlField(input, '현재 심박수'), /\s*bpm$/i),
      spO2: parseOptionalNumber(readControlField(input, '산소포화도'), /\s*%$/i),
      stressLevel: parseOptionalNumber(readControlField(input, '스트레스')),
      movementStatus,
      responseState,
      ageRiskWeight: parseOptionalNumber(readControlField(input, '연령가중치')),
      location: locationText
        ? { address: locationText }
        : undefined,
      fallFeatures: {
        postImpactImmobilitySec: parseOptionalNumber(
          readControlField(input, '후충격 무움직임'),
          /\s*sec$/i
        ),
        fallMagnitude: parseOptionalNumber(readControlField(input, '낙상 크기')),
      },
    },
    ruleResult: {
      level: Number.isFinite(Number(emergencyLevelOverride))
        ? Number(emergencyLevelOverride)
        : levelFromInput,
    },
    rawInput: input,
  };
}

/**
 * 의료 표현과 영문 토큰을 관제용 중립 문구로 치환합니다.
 */
function sanitizeControlText(text) {
  let next = String(text || '');
  CONTROL_TERM_REPLACEMENTS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });
  next = next.replace(/응답 있음로/gi, '응답 있음으로');
  next = next.replace(/정지 상태으로/gi, '정지 상태로');
  next = next.replace(/걷는 상태으로/gi, '걷는 상태로');
  next = next.replace(/응답 있음함/gi, '응답 있음');
  next = next.replace(/무반응·무반응/gi, '무반응');
  next = next.replace(/상태 상태/gi, '상태');
  next = next.replace(/중등스러운/gi, '중간');
  next = next.replace(/[一-龥]/g, '');
  next = next.replace(/\s+([%])/g, '$1');
  return normalizeWhitespace(next);
}

/**
 * 모델이 만든 4항목 응답을 라벨별 텍스트로 분해합니다.
 */
function extractStructuredControlSections(rawText) {
  const sections = {};
  let currentLabel = null;
  const lines = String(rawText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    const matchedLabel = CONTROL_LABELS.find((label) => line.startsWith(`${label}:`));
    if (matchedLabel) {
      currentLabel = matchedLabel;
      sections[currentLabel] = line.slice(matchedLabel.length + 1).trim();
      return;
    }
    if (currentLabel) {
      sections[currentLabel] = normalizeWhitespace(`${sections[currentLabel]} ${line}`);
    }
  });

  return sections;
}

/**
 * 위험도 표현을 운영용 4단계 라벨 중 하나로 정규화합니다.
 */
function normalizeRiskLabel(value) {
  const text = String(value || '');
  if (text.includes('매우')) return '매우 높음';
  if (text.includes('높')) return '높음';
  if (text.includes('주의') || text.includes('경계')) return '주의';
  return '낮음';
}

/**
 * 치명 신호 여부를 확인해 규칙기반 레벨보다 우선하는 즉시 대응 조건을 잡습니다.
 */
function hasCriticalSignals(biometric) {
  const immobility = biometric?.fallFeatures?.postImpactImmobilitySec;
  return (
    biometric?.heartRate === 0 ||
    biometric?.spO2 === 0 ||
    biometric?.responseState === 'no_response' ||
    (Number.isFinite(immobility) && immobility >= 20)
  );
}

/**
 * 규칙기반 레벨과 치명 신호를 기준으로 최종 위험도 라벨을 결정합니다.
 */
function resolveTargetRiskLabel(ruleResult, biometric) {
  if (hasCriticalSignals(biometric)) return '매우 높음';
  const level = Number(ruleResult?.level);
  if (level >= 5) return '매우 높음';
  if (level === 4) return '높음';
  if (level === 3) return '주의';
  return '낮음';
}

/**
 * 생체 컨텍스트를 바탕으로 부족한 핵심근거 문구를 보수적으로 생성합니다.
 */
function buildFallbackEvidence(biometric) {
  const parts = [];
  const baselineHeartRate = biometric?.baselineHeartRate;
  if (typeof biometric?.heartRate === 'number') {
    if (biometric.heartRate === 0) {
      parts.push('심박수 0 bpm이 확인됨');
    } else if (typeof baselineHeartRate === 'number') {
      const diff = biometric.heartRate - baselineHeartRate;
      if (biometric.heartRate <= 45 || diff <= -25) {
        parts.push(`현재 심박수가 기초선 ${baselineHeartRate} bpm 대비 크게 낮음`);
      } else if (biometric.heartRate >= 130 || diff >= 35) {
        parts.push(`현재 심박수가 기초선 ${baselineHeartRate} bpm 대비 크게 상승함`);
      } else if (Math.abs(diff) <= 5) {
        parts.push(`현재 심박수가 기초선 ${baselineHeartRate} bpm과 유사함`);
      } else {
        parts.push(`현재 심박수가 기초선 ${baselineHeartRate} bpm 대비 변동됨`);
      }
    } else if (biometric.heartRate <= 45) {
      parts.push(`현재 심박수 ${biometric.heartRate} bpm으로 크게 낮음`);
    } else if (biometric.heartRate >= 130) {
      parts.push(`현재 심박수 ${biometric.heartRate} bpm으로 크게 높음`);
    } else {
      parts.push(`현재 심박수 ${biometric.heartRate} bpm이 확인됨`);
    }
  }
  if (typeof biometric?.spO2 === 'number') {
    if (biometric.spO2 === 0) parts.push('산소포화도 0 %가 확인됨');
    else if (biometric.spO2 < 90) parts.push(`산소포화도 ${biometric.spO2} %로 저하됨`);
    else if (biometric.spO2 < 94) parts.push(`산소포화도 ${biometric.spO2} %로 주의 구간임`);
    else parts.push(`산소포화도 ${biometric.spO2} %가 유지됨`);
  }
  if (parts.length === 0) return '현재 데이터 기준 이상 징후를 보수적으로 확인할 필요가 있음';
  return sanitizeControlText(parts.slice(0, 2).join(', '));
}

/**
 * 생체 컨텍스트를 바탕으로 부족한 복합상황 문구를 생성합니다.
 */
function buildFallbackCompound(biometric) {
  const parts = [];
  const immobility = biometric?.fallFeatures?.postImpactImmobilitySec;
  if (biometric?.movementStatus === 'fall_detected') parts.push('낙상 신호가 감지됨');
  if (Number.isFinite(immobility) && immobility >= 10) parts.push(`후충격 무움직임이 ${immobility}초 지속됨`);
  else if (Number.isFinite(immobility) && immobility >= 3) parts.push(`후충격 무움직임이 ${immobility}초 관찰됨`);
  if (biometric?.responseState === 'no_response') parts.push('사용자 무응답 상태가 함께 확인됨');
  else if (biometric?.responseState === 'delayed') parts.push('사용자 응답 지연이 관찰됨');
  if (typeof biometric?.stressLevel === 'number' && biometric.stressLevel >= 80) {
    parts.push(`스트레스 ${biometric.stressLevel}로 높게 유지됨`);
  }
  if (typeof biometric?.ageRiskWeight === 'number' && biometric.ageRiskWeight >= 5) {
    parts.push('연령 위험가중치가 반영된 상태임');
  }
  if (!parts.length) return '현재 수집 신호 기준 추가 이상 징후를 함께 모니터링할 필요가 있음';
  return sanitizeControlText(parts.slice(0, 3).join(', '));
}

/**
 * 고위험 응답에서 즉시 출동까지 올려야 하는 치명 신호 조합을 판정합니다.
 */
function shouldDispatchImmediately(biometric) {
  const immobility = biometric?.fallFeatures?.postImpactImmobilitySec;
  const severeHeartRate =
    typeof biometric?.heartRate === 'number' &&
    (biometric.heartRate === 0 || biometric.heartRate <= 40 || biometric.heartRate >= 140);
  const severeSpO2 =
    typeof biometric?.spO2 === 'number' && (biometric.spO2 === 0 || biometric.spO2 < 90);
  const fallDetected = biometric?.movementStatus === 'fall_detected';
  const delayedOrWorse =
    biometric?.responseState === 'delayed' || biometric?.responseState === 'no_response';

  if (biometric?.responseState === 'no_response') return true;
  if (severeHeartRate) return true;
  if (severeSpO2 && (fallDetected || delayedOrWorse || (Number.isFinite(immobility) && immobility >= 8))) {
    return true;
  }
  if (Number.isFinite(immobility) && immobility >= 10) return true;
  if (fallDetected && Number.isFinite(immobility) && immobility >= 8) {
    return true;
  }
  return false;
}

/**
 * 즉시 출동은 아니지만 보호자/주변인 확인까지는 올려야 하는 조합을 판정합니다.
 */
function shouldRequireGuardianConfirmation(biometric) {
  const immobility = biometric?.fallFeatures?.postImpactImmobilitySec;
  const elevatedStress = typeof biometric?.stressLevel === 'number' && biometric.stressLevel >= 85;
  const cautionSpO2 = typeof biometric?.spO2 === 'number' && biometric.spO2 < 94;
  const elevatedHeartRate =
    typeof biometric?.heartRate === 'number' && (biometric.heartRate <= 50 || biometric.heartRate >= 125);

  if (biometric?.movementStatus === 'fall_detected' && Number.isFinite(immobility) && immobility >= 3) return true;
  if (biometric?.movementStatus === 'fall_detected' && cautionSpO2) return true;
  if (biometric?.responseState === 'delayed' && Number.isFinite(immobility) && immobility >= 3) return true;
  if (biometric?.responseState === 'delayed' && elevatedStress) return true;
  if (biometric?.responseState === 'delayed' && cautionSpO2) return true;
  if (Number.isFinite(immobility) && immobility >= 3) return true;
  if (cautionSpO2 && elevatedHeartRate) return true;
  if (elevatedStress && elevatedHeartRate) return true;
  return false;
}

/**
 * 최종 위험도와 생체 컨텍스트를 기준으로 관제 권고를 강제 정규화합니다.
 */
function resolveRecommendation(riskLabel, biometric) {
  if (riskLabel === '매우 높음') return '응급구조사 출동 권고';
  if (riskLabel === '높음') {
    if (shouldDispatchImmediately(biometric)) return '응급구조사 출동 권고';
    if (shouldRequireGuardianConfirmation(biometric)) return '보호자 확인';
    return '관제 확인';
  }
  if (riskLabel === '주의') {
    if (biometric?.responseState === 'delayed') return '관제 확인';
    if (typeof biometric?.stressLevel === 'number' && biometric.stressLevel >= 85) return '관제 확인';
    return '지속 모니터링';
  }
  return '지속 모니터링';
}

/**
 * 섹션 문구가 현재 생체 컨텍스트와 맞지 않게 과장되었는지 확인합니다.
 */
function isSectionOverstated(text, riskLabel, biometric) {
  const normalized = String(text || '');
  const immobility = biometric?.fallFeatures?.postImpactImmobilitySec;
  if (!normalized) return true;

  if (riskLabel === '낮음') {
    const severeKeywords = ['즉시', '출동', '매우 높음', '매우 위급', '긴급', '무응답', '낙상'];
    if (severeKeywords.some((keyword) => normalized.includes(keyword))) return true;
  }

  if (riskLabel === '주의') {
    const forbiddenKeywords = ['매우 높음', '즉시 출동', '응급구조사 출동 권고'];
    if (forbiddenKeywords.some((keyword) => normalized.includes(keyword))) return true;
  }

  if (normalized.includes('심박수 0') && biometric?.heartRate !== 0) return true;
  if (normalized.includes('산소포화도 0') && biometric?.spO2 !== 0) return true;
  if (normalized.includes('무응답') && biometric?.responseState !== 'no_response') return true;
  if (normalized.includes('낙상') && biometric?.movementStatus !== 'fall_detected') return true;
  if (normalized.includes('무움직임') && !(Number.isFinite(immobility) && immobility >= 3)) return true;
  if (/낙상 점수|응급 점수|[0-9]+\s*sec\b/i.test(normalized)) return true;

  return false;
}

/**
 * 복합상황 문구가 현재 입력 신호를 빠뜨리지 않았는지 확인합니다.
 */
function isCompoundSectionIncomplete(text, biometric) {
  const normalized = String(text || '').replace(/\s+/g, ' ');
  const immobility = biometric?.fallFeatures?.postImpactImmobilitySec;
  const requiredPatterns = [];
  const forbiddenPatterns = [];

  if (biometric?.movementStatus === 'fall_detected') {
    requiredPatterns.push(/낙상/);
  } else {
    forbiddenPatterns.push(/낙상/);
  }

  if (biometric?.responseState === 'no_response') {
    requiredPatterns.push(/무응답|응답 없음/);
  } else {
    forbiddenPatterns.push(/무응답|응답 없음/);
  }

  if (biometric?.responseState === 'delayed') {
    requiredPatterns.push(/응답 지연|반응 지연|반응 상태.*지연/);
  } else {
    forbiddenPatterns.push(/응답 지연|반응 지연|반응 상태.*지연/);
  }

  if (Number.isFinite(immobility) && immobility >= 3) {
    requiredPatterns.push(/무움직임|움직임 감소|정지 상태/);
  } else {
    forbiddenPatterns.push(/무움직임/);
  }

  if (typeof biometric?.stressLevel === 'number' && biometric.stressLevel >= 80) {
    requiredPatterns.push(/스트레스/);
  }

  if (typeof biometric?.ageRiskWeight === 'number' && biometric.ageRiskWeight >= 5) {
    requiredPatterns.push(/연령 위험가중치/);
  }

  if (requiredPatterns.length === 0) return false;

  const hasAllRequired = requiredPatterns.slice(0, 3).every((pattern) => pattern.test(normalized));
  const hasForbidden = forbiddenPatterns.some((pattern) => pattern.test(normalized));

  return !hasAllRequired || hasForbidden;
}

/**
 * 최종 카드 문장을 일정한 톤으로 정리합니다.
 */
function finalizeControlSentence(text) {
  let next = sanitizeControlText(text);
  next = next.replace(/\.\s*$/g, '');
  next = next.replace(/현재 산소포화도가\s*([0-9]+)\s*%로 정상 범위 내에 있음/gi, '산소포화도 $1 %가 유지됨');
  next = next.replace(/현재 산소포화도가\s*([0-9]+)\s*%로 정상 범위 내에 있고/gi, '산소포화도 $1 %가 유지되고');
  next = next.replace(/현재 심박수는?\s*([0-9]+)\s*bpm로/gi, '현재 심박수 $1 bpm으로');
  next = next.replace(/현재 심박수는?\s*([0-9]+)\s*bpm이 확인됨/gi, '현재 심박수 $1 bpm이 확인됨');
  next = next.replace(/기초선보다\s*([0-9]+)\s*bpm 증가하고/gi, '기초선 대비 $1 bpm 상승하고');
  next = next.replace(/기초선보다\s*([0-9]+)\s*bpm 높아지고/gi, '기초선 대비 $1 bpm 상승하고');
  next = next.replace(/기초선보다\s*([0-9]+)\s*bpm 빠르게 증가하고/gi, '기초선 대비 $1 bpm 크게 상승하고');
  next = next.replace(/기초선보다\s*([0-9]+)\s*bpm 낮아지고/gi, '기초선 대비 $1 bpm 하락하고');
  next = next.replace(/현재 심박수가 기초선보다\s*([0-9]+)\s*bpm 상승하고/gi, '현재 심박수가 기초선 대비 $1 bpm 상승하고');
  next = next.replace(/현재 심박수가 기초선보다\s*([0-9]+)\s*bpm 증가하고/gi, '현재 심박수가 기초선 대비 $1 bpm 상승하고');
  next = next.replace(/현재 심박수가 기초선보다\s*([0-9]+)\s*bpm 낮아지고/gi, '현재 심박수가 기초선 대비 $1 bpm 하락하고');
  return normalizeWhitespace(next);
}

/**
 * 위험도 구간에 따라 모델 원문보다 고정형 문구를 우선할지 결정합니다.
 */
function shouldPreferCanonicalSection(sectionName, riskLabel) {
  if (sectionName === '핵심근거') return true;
  if (sectionName === '복합상황' && (riskLabel === '높음' || riskLabel === '매우 높음')) return true;
  if (riskLabel === '낮음') return true;
  return false;
}

/**
 * 모델 원문을 실제 운영 카드 기준으로 후처리해 위험도 상한, 권고, 금칙어를 정규화합니다.
 */
function postprocessNonDiagnosticSummary(rawText, { biometric, ruleResult, rawInput } = {}) {
  const parsed = rawInput ? parseControlInputContext(rawInput, ruleResult?.level) : null;
  const resolvedBiometric = biometric || parsed?.biometric || {};
  const resolvedRuleResult = ruleResult || parsed?.ruleResult || {};
  const sections = extractStructuredControlSections(rawText);
  const targetRiskLabel = resolveTargetRiskLabel(resolvedRuleResult, resolvedBiometric);
  const rawEvidence = sanitizeControlText(sections['핵심근거'] || '');
  const rawCompound = sanitizeControlText(sections['복합상황'] || '');
  const fallbackEvidence = buildFallbackEvidence(resolvedBiometric);
  const fallbackCompound = buildFallbackCompound(resolvedBiometric);
  const evidenceBase = shouldPreferCanonicalSection('핵심근거', targetRiskLabel)
    ? fallbackEvidence
    : isSectionOverstated(rawEvidence, targetRiskLabel, resolvedBiometric)
      ? fallbackEvidence
      : rawEvidence || fallbackEvidence;
  const compoundBase = shouldPreferCanonicalSection('복합상황', targetRiskLabel)
    ? fallbackCompound
    : isSectionOverstated(rawCompound, targetRiskLabel, resolvedBiometric) ||
        isCompoundSectionIncomplete(rawCompound, resolvedBiometric)
      ? fallbackCompound
      : rawCompound || fallbackCompound;
  const evidence = finalizeControlSentence(evidenceBase);
  const compound = finalizeControlSentence(compoundBase);
  const recommendation = resolveRecommendation(targetRiskLabel, resolvedBiometric);

  return [
    `위험도: ${targetRiskLabel}`,
    `핵심근거: ${evidence}`,
    `복합상황: ${compound}`,
    `권고: ${recommendation}`,
  ].join('\n');
}

/**
 * 환경변수 기준으로 Ollama base URL과 사용할 모델 이름을 결정합니다.
 */
function getOllamaConfig() {
  // 운영 토글이 켜진 경우에만 파인튜닝 모델을 사용하고, 아니면 기본 모델로 안전하게 fallback 합니다.
  const fineTunedModel = process.env.OLLAMA_FINETUNED_MODEL || 'goldentime-emergency:latest';
  const defaultModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  
  // 파인튜닝 모델 사용 여부 확인
  const useFineTuned = process.env.USE_FINETUNED_MODEL === 'true';
  
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    fineTunedModel,
    defaultModel,
    useFineTuned,
    model: useFineTuned ? fineTunedModel : defaultModel,
  };
}

/**
 * Ollama `/api/tags`를 조회해 현재 서버에 존재하는 모델 이름 목록을 캐시와 함께 반환합니다.
 */
async function fetchAvailableModels(baseUrl) {
  const cacheKey = `ollama:model-availability:${String(baseUrl || '').trim()}`;
  const cached = await cacheService.get(cacheKey);
  if (cached?.models) {
    return new Set(Array.isArray(cached.models) ? cached.models : []);
  }

  try {
    const resp = await axios.get(`${baseUrl}/api/tags`, { timeout: 5000 });
    const models = [
      ...new Set(
        Array.isArray(resp?.data?.models)
          ? resp.data.models
              .map((item) => item?.name)
              .filter((name) => typeof name === 'string' && name.trim())
          : []
      ),
    ];
    await cacheService.set(cacheKey, { models }, Math.ceil(MODEL_CACHE_TTL_MS / 1000));
    return new Set(models);
  } catch {
    return null;
  }
}

/**
 * 요청 직전에 실제 사용 가능한 Ollama 모델을 확인해 파인튜닝 모델 부재 시 기본 모델로 안전하게 fallback 합니다.
 */
async function resolveOllamaRequestConfig(modelOverride) {
  const config = getOllamaConfig();
  const requestedModel = modelOverride || config.model;
  const availableModels = await fetchAvailableModels(config.baseUrl);

  if (!availableModels) {
    return {
      baseUrl: config.baseUrl,
      model: requestedModel,
      requestedModel,
      fallbackApplied: false,
      availabilityChecked: false,
    };
  }

  if (availableModels.has(requestedModel)) {
    return {
      baseUrl: config.baseUrl,
      model: requestedModel,
      requestedModel,
      fallbackApplied: false,
      availabilityChecked: true,
    };
  }

  if (requestedModel !== config.defaultModel && availableModels.has(config.defaultModel)) {
    return {
      baseUrl: config.baseUrl,
      model: config.defaultModel,
      requestedModel,
      fallbackApplied: true,
      availabilityChecked: true,
    };
  }

  return {
    baseUrl: config.baseUrl,
    model: requestedModel,
    requestedModel,
    fallbackApplied: false,
    availabilityChecked: true,
  };
}

/**
 * Ollama로 관제용 정밀 분석 텍스트를 생성합니다.
 * - 의료기기 회피를 위해: 진단/확정 표현 금지, 위험 근거와 대응 수준만 구조화합니다.
 */
async function generateNonDiagnosticSummary({ userBaseline, biometric, ruleResult, modelOverride }) {
  const { baseUrl, model } = await resolveOllamaRequestConfig(modelOverride);
  const prompt = buildNonDiagnosticSummaryPrompt({
    userBaseline,
    biometric,
    ruleResult,
    profile: 'structured_monitoring',
    audience: '관제요원',
  });

  // 관제 카드 응답은 한 번에 완성된 4줄이 필요하므로 stream=false 고정으로 호출합니다.
  const resp = await axios.post(
    `${baseUrl}/api/generate`,
    {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
      },
    },
    { timeout: 30000 }
  );

  // Ollama 응답 구조: { response: "..." }
  const text = resp?.data?.response;
  if (typeof text !== 'string') return null;
  return postprocessNonDiagnosticSummary(text.trim(), { biometric, ruleResult });
}

/**
 * 현재 생체값과 최근 컨텍스트를 바탕으로 스트레스 지수를 JSON 형식으로 생성합니다.
 */
async function generateStressLevel({ userBaseline, biometric, context }) {
  /**
   * 스트레스 지수는 “원시 생체데이터 기반 파생 지표”이므로,
   * 최근 구간 요약(분산/추세)을 함께 제공해 안정적인 산출을 유도합니다.
   */
  const { baseUrl, model } = await resolveOllamaRequestConfig();

  const prompt = `
너는 스마트워치 기반 생체 데이터를 바탕으로 “스트레스 지수”를 산출한다.
중요 규칙:
- 절대 의료적 진단/확정/질병명 단정 금지
- 결과는 JSON만 출력 (설명 텍스트 금지)

출력 스키마:
{"stressLevel": number(0~100), "reason": string}

기초선(가능하면 참고):
- baseline_hr_avg: ${userBaseline?.baselineHrAvg ?? 'unknown'}

현재 데이터:
- collectedAt: ${biometric.collectedAt}
- isWear: ${biometric.isWear}
- heartRate: ${biometric.heartRate ?? 'unknown'}
- spO2: ${biometric.spO2 ?? 'unknown'}
- bodyTemperature: ${biometric.bodyTemperature ?? 'unknown'}
- steps: ${biometric.steps ?? 'unknown'}
- movementStatus: ${biometric.movementStatus ?? 'unknown'}
- acceleration: ${biometric.acceleration ? JSON.stringify(biometric.acceleration) : 'unknown'}
- gyroscope: ${biometric.gyroscope ? JSON.stringify(biometric.gyroscope) : 'unknown'}
- barometer: ${biometric.barometer ? JSON.stringify(biometric.barometer) : 'unknown'}

최근 요약(없으면 null):
${context ? JSON.stringify(context) : 'null'}

판단 지침:
- 착용이 아니면 stressLevel은 0
- 값이 누락되거나 신뢰도가 낮으면 과장하지 말고 중립적으로
- 손목 피부온도면 bodyTemperature보다 bodyTemperatureDelta를 우선 반영할 것
${buildTemperaturePromptRules(biometric)}
`.trim();

  // 스트레스 산출은 기계가 다시 파싱해야 하므로 반드시 JSON 응답만 받도록 강하게 제한합니다.
  const resp = await axios.post(
    `${baseUrl}/api/generate`,
    {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.2,
      },
    },
    { timeout: 30000 },
  );

  const text = resp?.data?.response;
  if (typeof text !== 'string') return null;

  try {
    const parsed = JSON.parse(text.trim());
    const stressLevel = clampNumber(Number(parsed?.stressLevel), 0, 100);
    const reason = typeof parsed?.reason === 'string' ? parsed.reason.trim() : null;
    if (stressLevel === null) return null;
    return { stressLevel, reason: reason || null };
  } catch {
    return null;
  }
}

/**
 * 행동 상태와 데이터 충분성을 JSON 형식으로 요약해 반환합니다.
 */
async function generateBehaviorAnalysis({ userBaseline, biometric, context }) {
  const { baseUrl, model } = await resolveOllamaRequestConfig();

  const prompt = `
너는 스마트워치 기반 데이터를 바탕으로 “착용자의 행동/컨디션 요약”을 만든다.
중요 규칙:
- 절대 의료적 진단/확정/질병명 단정 금지
- 결과는 JSON만 출력(설명 텍스트 금지)

출력 스키마:
{"activity": "resting"|"walking"|"running"|"sleeping"|"driving"|"unknown", "confidence": number(0~1), "summary": string, "needsMoreData": boolean, "missingSignals": string[]}

기초선(가능하면 참고):
- baseline_hr_avg: ${userBaseline?.baselineHrAvg ?? 'unknown'}

최근 컨텍스트 요약(없으면 null):
${context ? JSON.stringify(context) : 'null'}

현재 데이터:
${JSON.stringify(biometric)}

판단 지침:
- 착용이 아니면 activity는 "unknown", confidence는 0, summary는 짧게
- 데이터가 적거나 신호가 부족하면 needsMoreData=true로 하고 missingSignals에 필요한 신호를 넣어
- 손목 피부온도면 bodyTemperature는 중심체온이 아니라 컨디션/환경 변화 신호로만 약하게 반영할 것
${buildTemperaturePromptRules(biometric)}

온도 메타데이터:
${buildTemperaturePromptBlock(biometric)}
`.trim();

  // 행동 요약도 후속 코드가 구조화 필드를 직접 읽기 때문에 JSON 전용 응답을 강제합니다.
  const resp = await axios.post(
    `${baseUrl}/api/generate`,
    {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.2,
      },
    },
    { timeout: 30000 },
  );

  const text = resp?.data?.response;
  if (typeof text !== 'string') return null;

  try {
    const parsed = JSON.parse(text.trim());
    const activity = typeof parsed?.activity === 'string' ? parsed.activity : null;
    const confidence = clampNumber(Number(parsed?.confidence), 0, 1);
    const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : null;
    const needsMoreData = Boolean(parsed?.needsMoreData);
    const missingSignals = Array.isArray(parsed?.missingSignals)
      ? parsed.missingSignals.filter((v) => typeof v === 'string').slice(0, 8)
      : [];

    const allowed = new Set(['resting', 'walking', 'running', 'sleeping', 'driving', 'unknown']);
    if (!activity || !allowed.has(activity) || confidence === null || !summary) return null;

    return { activity, confidence, summary, needsMoreData, missingSignals, model };
  } catch {
    return null;
  }
}

/**
 * 사용자 앱용 웰니스 코칭 문구를 자연어 요약으로 생성합니다.
 */
async function generateWellnessCoachingSummary({ userBaseline, biometric }) {
  const { baseUrl, model } = await resolveOllamaRequestConfig();

  const prompt = `
너는 스마트워치 기반 “건강 모니터링 코치”다.
중요 규칙:
- 절대 의료적 진단/확정/질병명 단정 금지
- 위험을 과장하지 말고, “관리/습관/컨디션 점검” 중심으로 안내
- 결과는 한국어로, 5~10문장 이내
- 문장은 단조롭지 않게, 비유/설명(예: 엔진/호흡/리듬) 사용 가능
- 마지막에 오늘 할 수 있는 작은 행동 2~3가지를 bullet(•)로 제안
${buildTemperaturePromptRules(biometric)}

기초선(가능하면 참고):
- baseline_hr_avg: ${userBaseline?.baselineHrAvg ?? 'unknown'}

현재 데이터:
- collectedAt: ${biometric.collectedAt}
- heartRate: ${biometric.heartRate ?? 'unknown'}
- spO2: ${biometric.spO2 ?? 'unknown'}
- steps: ${biometric.steps ?? 'unknown'}
- distance: ${biometric.distance ?? 'unknown'}
- stressLevel: ${biometric.stressLevel ?? 'unknown'}
- movementStatus: ${biometric.movementStatus ?? 'unknown'}
${buildTemperaturePromptBlock(biometric)}

위 정보를 바탕으로 “오늘의 컨디션 요약 + 가이드”를 작성해라.
`.trim();

  const resp = await axios.post(
    `${baseUrl}/api/generate`,
    {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.8,
      },
    },
    { timeout: 30000 }
  );

  const text = resp?.data?.response;
  return typeof text === 'string' ? text.trim() : null;
}

/**
 * 주간 건강 리포트 생성 (사용자 앱용)
 * - 의료적 진단이 아닌 건강 관리 조언 중심
 */
async function generateWeeklyHealthReport({ userProfile, weeklyData }) {
  const { baseUrl, model } = await resolveOllamaRequestConfig();

  const prompt = `
당신은 GOLDENTIME 스마트워치의 수석 의료 AI 어시스턴트입니다.
사용자의 지난 7일간 건강 데이터를 분석하여 주간 건강 리포트를 작성해주세요.

사용자 정보:
- 나이/성별: ${userProfile.age}세 / ${userProfile.gender}
- 기저질환: ${userProfile.diseases || '없음'}

주간 데이터 요약:
- 평균 심박수: ${weeklyData.avgHeartRate} bpm (최저 ${weeklyData.minHeartRate} - 최고 ${weeklyData.maxHeartRate})
- 평균 걸음수: ${weeklyData.avgSteps} 보
- 평균 수면시간: ${weeklyData.avgSleep} 시간
- 특이사항: ${weeklyData.anomalies ? weeklyData.anomalies.join(', ') : '특이사항 없음'}

작성 규칙:
1. 한국어로 작성하며, 전문적이면서도 친절한 어조를 사용하세요.
2. 절대 '진단', '확진' 등의 단정적인 의료 용어는 피하고 '관찰됩니다', '권장됩니다' 등의 표현을 사용하세요.
3. 다음 3가지 항목으로 구성하여 요약하세요:
   - 📊 주간 건강 요약 (전반적인 상태 평가)
   - 🔍 주요 관찰 사항 (데이터 기반의 구체적 발견점)
   - 💡 다음 주 건강 팁 (구체적인 행동 제안)

답변은 마크다운 형식을 사용하지 말고 일반 텍스트로 작성하세요.
`.trim();

  try {
    const resp = await axios.post(
      `${baseUrl}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7, // 창의적인 조언을 위해 약간 높임
        },
      },
      { timeout: 45000 } // 분석이므로 타임아웃 넉넉하게
    );

    const text = resp?.data?.response;
    return typeof text === 'string' ? text.trim() : "AI 분석을 완료할 수 없습니다.";
  } catch (error) {
    console.error("Ollama API Error:", error.message);
    // 폴백(Fallback) 메시지
    return "현재 AI 서비스 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.";
  }
}

/**
 * 범용 텍스트 생성 (다른 서비스에서 호출용)
 */
async function generateText(prompt, options = {}) {
  const { baseUrl, model } = await resolveOllamaRequestConfig(options.modelOverride);

  try {
    const resp = await axios.post(
      `${baseUrl}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
        },
      },
      { timeout: options.timeout || 60000 }
    );

    const text = resp?.data?.response;
    return typeof text === 'string' ? text.trim() : "분석 내용을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Ollama API Error:", error.message);
    throw new Error("Local LLM (Ollama) 연결 실패");
  }
}

/**
 * 관제 분석용 Ollama 호출 유틸 함수를 외부 서비스에서 재사용할 수 있도록 노출합니다.
 */
module.exports = {
  getOllamaConfig,
  parseControlInputContext,
  extractStructuredControlSections,
  normalizeRiskLabel,
  postprocessNonDiagnosticSummary,
  resolveTargetRiskLabel,
  resolveRecommendation,
  resolveOllamaRequestConfig,
  generateNonDiagnosticSummary,
  generateWeeklyHealthReport,
  generateWellnessCoachingSummary,
  generateStressLevel,
  generateBehaviorAnalysis,
  generateText,
};
