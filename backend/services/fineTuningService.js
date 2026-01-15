/**
 * 파인튜닝 서비스
 * 학습 데이터 수집 및 관리
 */

const BiometricData = require('../models/BiometricData');
const EmergencyCase = require('../models/EmergencyCase');
const logger = require('../utils/logger');

/**
 * 학습 데이터 수집 (응급 상황 발생 시 자동 수집)
 */
async function collectTrainingData(emergencyCaseId) {
  try {
    const emergencyCase = await EmergencyCase.findById(emergencyCaseId)
      .populate('userId', 'baselineBiometric name')
      .lean();

    if (!emergencyCase || !emergencyCase.llmAnalysis) {
      return null;
    }

    // 해당 케이스의 생체 데이터 조회
    const biometricData = await BiometricData.findOne({
      userId: emergencyCase.userId._id,
      'analysis.emergencyLevel': emergencyCase.emergencyLevel,
      collectedAt: {
        $gte: new Date(emergencyCase.detectedAt).getTime() - 60000, // 1분 전
        $lte: new Date(emergencyCase.detectedAt).getTime() + 60000  // 1분 후
      }
    }).lean();

    if (!biometricData) {
      return null;
    }

    const user = emergencyCase.userId;
    const baselineHr = user?.baselineBiometric?.heartRate?.avg || 'unknown';

    const trainingData = {
      instruction: "응급구조사가 참고할 상황 요약을 작성하세요. 의료적 진단은 하지 마세요.",
      input: `기초선 심박수: ${baselineHr} bpm, 현재 심박수: ${biometricData.heartRate ?? 'unknown'} bpm, 스트레스: ${biometricData.stressLevel ?? 'unknown'}, 움직임: ${biometricData.movementStatus ?? 'unknown'}, 위치: ${biometricData.location?.address || `${biometricData.location?.lat}, ${biometricData.location?.lng}`}`,
      output: emergencyCase.llmAnalysis.analysisText || '',
      emergencyLevel: emergencyCase.emergencyLevel,
      caseId: emergencyCase._id.toString(),
      collectedAt: new Date()
    };

    // 학습 데이터 저장 (추후 파인튜닝에 사용)
    // 실제로는 별도 컬렉션이나 파일에 저장할 수 있음
    logger.info('학습 데이터 수집', {
      caseId: emergencyCaseId,
      emergencyLevel: emergencyCase.emergencyLevel
    });

    return trainingData;
  } catch (error) {
    logger.error('학습 데이터 수집 실패', error, { emergencyCaseId });
    return null;
  }
}

/**
 * 학습 데이터 품질 검증
 */
function validateTrainingData(trainingData) {
  if (!trainingData || !trainingData.input || !trainingData.output) {
    return { valid: false, reason: '필수 필드 누락' };
  }

  if (trainingData.output.length < 20) {
    return { valid: false, reason: '출력 텍스트가 너무 짧음' };
  }

  if (trainingData.output.length > 500) {
    return { valid: false, reason: '출력 텍스트가 너무 김' };
  }

  // 의료 진단 표현 검사
  const diagnosticKeywords = ['진단', '질병', '병', '확정', '반드시', '무조건'];
  const hasDiagnostic = diagnosticKeywords.some(keyword => 
    trainingData.output.includes(keyword)
  );

  if (hasDiagnostic) {
    return { valid: false, reason: '의료 진단 표현 포함' };
  }

  return { valid: true };
}

/**
 * 배치 학습 데이터 수집 (과거 데이터)
 */
async function collectBatchTrainingData(limit = 1000) {
  try {
    const cases = await EmergencyCase.find({
      'llmAnalysis.analysisText': { $exists: true, $ne: null },
      emergencyLevel: { $gte: 3 }
    })
      .populate('userId', 'baselineBiometric')
      .sort({ detectedAt: -1 })
      .limit(limit)
      .lean();

    const trainingDataList = [];

    for (const emergencyCase of cases) {
      const biometricData = await BiometricData.findOne({
        userId: emergencyCase.userId._id || emergencyCase.userId,
        'analysis.emergencyLevel': emergencyCase.emergencyLevel,
        collectedAt: {
          $gte: new Date(emergencyCase.detectedAt).getTime() - 60000,
          $lte: new Date(emergencyCase.detectedAt).getTime() + 60000
        }
      }).lean();

      if (!biometricData) continue;

      const user = emergencyCase.userId;
      const baselineHr = user?.baselineBiometric?.heartRate?.avg || 'unknown';

      const trainingData = {
        instruction: "응급구조사가 참고할 상황 요약을 작성하세요. 의료적 진단은 하지 마세요.",
        input: `기초선 심박수: ${baselineHr} bpm, 현재 심박수: ${biometricData.heartRate ?? 'unknown'} bpm, 스트레스: ${biometricData.stressLevel ?? 'unknown'}, 움직임: ${biometricData.movementStatus ?? 'unknown'}, 위치: ${biometricData.location?.address || `${biometricData.location?.lat}, ${biometricData.location?.lng}`}`,
        output: emergencyCase.llmAnalysis.analysisText,
        emergencyLevel: emergencyCase.emergencyLevel
      };

      const validation = validateTrainingData(trainingData);
      if (validation.valid) {
        trainingDataList.push(trainingData);
      } else {
        logger.warn('학습 데이터 검증 실패', {
          caseId: emergencyCase._id,
          reason: validation.reason
        });
      }
    }

    logger.info('배치 학습 데이터 수집 완료', {
      total: cases.length,
      valid: trainingDataList.length
    });

    return trainingDataList;
  } catch (error) {
    logger.error('배치 학습 데이터 수집 실패', error);
    return [];
  }
}

module.exports = {
  collectTrainingData,
  validateTrainingData,
  collectBatchTrainingData
};
