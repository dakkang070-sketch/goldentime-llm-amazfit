/**
 * 자동 의료 라벨링 서비스
 * 정교한 다중 라벨 분류 및 검증
 */

const MedicalLabeling = require('../models/MedicalLabeling');
const BiometricData = require('../models/BiometricData');
const EmergencyCase = require('../models/EmergencyCase');
const logger = require('../utils/logger');

class AutoLabelingService {
  
  /**
   * 응급 케이스에 대한 완전한 라벨링 생성
   */
  async generateMedicalLabels(emergencyCaseId, biometricDataId) {
    try {
      logger.info(`의료 라벨링 시작: ${emergencyCaseId}`);

      // 데이터 조회
      const emergencyCase = await EmergencyCase.findById(emergencyCaseId)
        .populate('userId', 'age gender medicalHistory baselineBiometric');
      const biometricData = await BiometricData.findById(biometricDataId);

      if (!emergencyCase || !biometricData) {
        throw new Error('필수 데이터를 찾을 수 없습니다.');
      }

      // 라벨링 생성
      const labels = {
        emergencyCaseId,
        biometricDataId,
        vitalSignLabels: this.analyzeVitalSigns(biometricData, emergencyCase.userId),
        activityLabels: this.analyzeActivity(biometricData),
        emergencyClassification: this.classifyEmergency(emergencyCase, biometricData),
        temporalPatterns: this.analyzeTemporalPatterns(biometricData, emergencyCase),
        riskAssessment: this.assessRisk(emergencyCase, biometricData),
        responseLabels: this.determineResponseLevel(emergencyCase, biometricData),
        qualityMetrics: this.calculateQualityMetrics(emergencyCase, biometricData),
        metadata: {
          labelingMethod: 'automatic',
          labelingSource: 'ai_model',
          dataVersion: '1.0',
          tags: this.generateTags(emergencyCase, biometricData),
          createdBy: 'auto-labeling-service'
        }
      };

      // 데이터베이스에 저장
      const medicalLabeling = new MedicalLabeling(labels);
      await medicalLabeling.save();

      logger.info(`의료 라벨링 완료: ${emergencyCaseId}`, {
        primaryCategory: labels.emergencyClassification.primaryCategory,
        triageLevel: labels.emergencyClassification.triageLevel,
        responseUrgency: labels.responseLabels.responseUrgency
      });

      return medicalLabeling;

    } catch (error) {
      logger.error('의료 라벨링 실패', error, { emergencyCaseId, biometricDataId });
      throw error;
    }
  }

  /**
   * 생체 신호 분석 및 라벨링
   */
  analyzeVitalSigns(biometricData, user) {
    const heartRate = biometricData.heartRate || 0;
    const baselineHR = user?.baselineBiometric?.heartRate?.avg || 70;
    const stressLevel = biometricData.stressLevel || 0;

    // 심박수 이상 분류
    let heartRateAbnormality = 'normal';
    if (heartRate < 40) heartRateAbnormality = 'severe_bradycardia';
    else if (heartRate < 60) heartRateAbnormality = 'bradycardia';
    else if (heartRate > 150) heartRateAbnormality = 'severe_tachycardia';
    else if (heartRate > 100) heartRateAbnormality = 'tachycardia';

    // 심박수 변화 패턴
    let heartRatePattern = 'stable';
    const hrChange = ((heartRate - baselineHR) / baselineHR) * 100;
    if (Math.abs(hrChange) > 50) {
      heartRatePattern = hrChange > 0 ? 'sudden_spike' : 'sudden_drop';
    } else if (Math.abs(hrChange) > 20) {
      heartRatePattern = hrChange > 0 ? 'gradual_increase' : 'gradual_decrease';
    }

    // 스트레스 수준 분류
    let stressLevelClass = 'low';
    if (stressLevel > 95) stressLevelClass = 'crisis';
    else if (stressLevel > 80) stressLevelClass = 'severe';
    else if (stressLevel > 60) stressLevelClass = 'high';
    else if (stressLevel > 30) stressLevelClass = 'moderate';

    return {
      heartRateAbnormality,
      heartRatePattern,
      stressLevel: stressLevelClass
    };
  }

  /**
   * 활동 및 움직임 분석
   */
  analyzeActivity(biometricData) {
    const movement = biometricData.movementStatus || 'unknown';
    
    // 움직임 타입 매핑
    const movementTypeMapping = {
      'stationary': 'resting',
      'walking': 'normal_walking',
      'running': 'running',
      'fall_detected': 'fall_detected',
      'unknown': 'irregular_movement'
    };

    const movementType = movementTypeMapping[movement] || 'irregular_movement';

    // 낙상 위험도
    let fallRisk = 'none';
    if (movement === 'fall_detected') fallRisk = 'imminent';
    else if (movement === 'irregular_movement') fallRisk = 'high';
    else if (biometricData.stressLevel > 80) fallRisk = 'moderate';

    // 이동 능력 상태
    let mobilityStatus = 'mobile';
    if (movement === 'fall_detected') mobilityStatus = 'immobile';
    else if (movement === 'stationary' && biometricData.heartRate < 50) mobilityStatus = 'limited';

    return {
      movementType,
      fallRisk,
      mobilityStatus
    };
  }

  /**
   * 응급 상황 분류
   */
  classifyEmergency(emergencyCase, biometricData) {
    const heartRate = biometricData.heartRate || 0;
    const movement = biometricData.movementStatus || 'unknown';
    const stressLevel = biometricData.stressLevel || 0;
    const emergencyLevel = emergencyCase.emergencyLevel;

    // 주요 응급 카테고리 결정
    let primaryCategory = 'other_medical';
    let subCategory = 'unknown';

    // 심장 관련 이벤트
    if (heartRate < 40 || heartRate > 150) {
      primaryCategory = 'cardiac_event';
      if (heartRate < 40) subCategory = 'cardiac_arrest';
      else if (heartRate > 150) subCategory = 'arrhythmia';
    }
    // 외상 관련
    else if (movement === 'fall_detected') {
      primaryCategory = 'trauma_injury';
      subCategory = 'fall_injury';
    }
    // 신경학적 이벤트
    else if (stressLevel > 95 && emergencyLevel >= 4) {
      primaryCategory = 'neurological_event';
      subCategory = 'altered_mental_status';
    }

    // 응급도 정밀 분류
    let triageLevel = 'level_5_non_urgent';
    if (emergencyLevel === 5) triageLevel = 'level_1_resuscitation';
    else if (emergencyLevel === 4) triageLevel = 'level_2_emergent';
    else if (emergencyLevel === 3) triageLevel = 'level_3_urgent';
    else if (emergencyLevel === 2) triageLevel = 'level_4_less_urgent';

    return {
      primaryCategory,
      subCategory,
      triageLevel
    };
  }

  /**
   * 시간적 패턴 분석
   */
  analyzeTemporalPatterns(biometricData, emergencyCase) {
    const detectedAt = emergencyCase.detectedAt || new Date();
    const collectedAt = biometricData.collectedAt || new Date();
    const timeDiff = Math.abs(detectedAt - collectedAt) / (1000 * 60); // 분 단위

    // 발병 속도
    let onsetSpeed = 'gradual';
    if (timeDiff < 5) onsetSpeed = 'sudden';
    else if (timeDiff < 60) onsetSpeed = 'rapid';

    // 진행 추세 (임시로 응급도 기반)
    let progressionTrend = 'stable';
    if (emergencyCase.emergencyLevel >= 4) progressionTrend = 'worsening';
    else if (emergencyCase.emergencyLevel <= 2) progressionTrend = 'improving';

    // 지속 시간 추정
    let durationEstimate = 'minutes';
    if (timeDiff > 60) durationEstimate = 'hours';
    else if (timeDiff > 1440) durationEstimate = 'days';

    return {
      onsetSpeed,
      progressionTrend,
      durationEstimate
    };
  }

  /**
   * 위험도 평가
   */
  assessRisk(emergencyCase, biometricData) {
    const emergencyLevel = emergencyCase.emergencyLevel;
    const heartRate = biometricData.heartRate || 0;
    const movement = biometricData.movementStatus || 'unknown';

    // 사망 위험도
    let mortalityRisk = 'very_low';
    if (emergencyLevel === 5 || heartRate < 35) mortalityRisk = 'very_high';
    else if (emergencyLevel === 4 || heartRate < 45) mortalityRisk = 'high';
    else if (emergencyLevel === 3) mortalityRisk = 'moderate';
    else if (emergencyLevel === 2) mortalityRisk = 'low';

    // 입원 위험도
    let hospitalAdmissionRisk = 'very_low';
    if (emergencyLevel >= 4) hospitalAdmissionRisk = 'very_high';
    else if (emergencyLevel === 3) hospitalAdmissionRisk = 'high';
    else if (emergencyLevel === 2) hospitalAdmissionRisk = 'moderate';

    // 악화 위험도
    let deteriorationRisk = 'very_low';
    if (movement === 'fall_detected' && emergencyLevel >= 3) deteriorationRisk = 'high';
    else if (emergencyLevel >= 4) deteriorationRisk = 'very_high';
    else if (emergencyLevel === 3) deteriorationRisk = 'moderate';

    return {
      mortalityRisk,
      hospitalAdmissionRisk,
      deteriorationRisk
    };
  }

  /**
   * 대응 수준 결정
   */
  determineResponseLevel(emergencyCase, biometricData) {
    const emergencyLevel = emergencyCase.emergencyLevel;
    const heartRate = biometricData.heartRate || 0;
    const movement = biometricData.movementStatus || 'unknown';

    // 대응 긴급도
    let responseUrgency = 'routine';
    if (emergencyLevel === 5 || heartRate < 35) responseUrgency = 'immediate';
    else if (emergencyLevel === 4) responseUrgency = 'urgent';
    else if (emergencyLevel === 3) responseUrgency = 'prompt';
    else if (emergencyLevel === 2) responseUrgency = 'delayed';

    // 필요한 자원 수준
    let resourceLevel = 'basic_emt';
    if (emergencyLevel === 5) resourceLevel = 'mobile_icu';
    else if (emergencyLevel === 4) resourceLevel = 'paramedic';
    else if (emergencyLevel === 3) resourceLevel = 'advanced_emt';

    // 병원 수준
    let hospitalLevel = 'primary_care';
    if (emergencyLevel === 5 || movement === 'fall_detected') hospitalLevel = 'trauma_center';
    else if (emergencyLevel === 4) hospitalLevel = 'tertiary_care';
    else if (emergencyLevel === 3) hospitalLevel = 'secondary_care';

    return {
      responseUrgency,
      resourceLevel,
      hospitalLevel
    };
  }

  /**
   * 품질 지표 계산
   */
  calculateQualityMetrics(emergencyCase, biometricData) {
    // 데이터 완성도 기반 정확도 계산
    let dataCompleteness = 0;
    const requiredFields = ['heartRate', 'stressLevel', 'movementStatus'];
    const completedFields = requiredFields.filter(field => biometricData[field] != null);
    dataCompleteness = completedFields.length / requiredFields.length;

    // AI 신뢰도 계산
    const overallConfidence = Math.min(0.9, 0.5 + (dataCompleteness * 0.4));
    
    return {
      labelingAccuracy: dataCompleteness,
      medicalValidation: {
        validated: false,
        validationScore: 0
      },
      aiConfidence: {
        overall: overallConfidence,
        categoryConfidence: {
          vitalSigns: Math.min(0.95, overallConfidence + 0.1),
          emergency: Math.max(0.7, overallConfidence - 0.1),
          response: overallConfidence
        }
      }
    };
  }

  /**
   * 태그 생성
   */
  generateTags(emergencyCase, biometricData) {
    const tags = [];
    
    if (biometricData.heartRate < 50) tags.push('bradycardia');
    if (biometricData.heartRate > 120) tags.push('tachycardia');
    if (biometricData.stressLevel > 80) tags.push('high-stress');
    if (biometricData.movementStatus === 'fall_detected') tags.push('fall-risk');
    if (emergencyCase.emergencyLevel >= 4) tags.push('critical');
    
    return tags;
  }

  /**
   * 배치 라벨링 (여러 케이스 동시 처리)
   */
  async batchLabel(emergencyCaseIds, options = {}) {
    const results = [];
    const { concurrency = 5 } = options;

    logger.info(`배치 라벨링 시작: ${emergencyCaseIds.length}개 케이스`);

    // 동시 처리 제한
    const chunks = [];
    for (let i = 0; i < emergencyCaseIds.length; i += concurrency) {
      chunks.push(emergencyCaseIds.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (emergencyCaseId) => {
        try {
          // 연관된 생체 데이터 찾기
          const biometricData = await BiometricData.findOne({
            'analysis.emergencyLevel': { $gte: 3 },
            // emergencyCase와 연결된 데이터 찾기 로직
          }).sort({ collectedAt: -1 }).limit(1);

          if (biometricData) {
            const result = await this.generateMedicalLabels(emergencyCaseId, biometricData._id);
            return { success: true, emergencyCaseId, labelingId: result._id };
          } else {
            return { success: false, emergencyCaseId, error: '생체 데이터 없음' };
          }
        } catch (error) {
          return { success: false, emergencyCaseId, error: error.message };
        }
      });

      const chunkResults = await Promise.allSettled(chunkPromises);
      results.push(...chunkResults.map(r => r.value || { success: false, error: r.reason }));
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`배치 라벨링 완료: ${successCount}/${results.length} 성공`);

    return results;
  }

  /**
   * 라벨 품질 검증
   */
  async validateLabeling(labelingId, validatorId, validationData) {
    try {
      const labeling = await MedicalLabeling.findById(labelingId);
      if (!labeling) {
        throw new Error('라벨링 데이터를 찾을 수 없습니다.');
      }

      // 검증 정보 업데이트
      labeling.qualityMetrics.medicalValidation = {
        validated: true,
        validatedBy: validatorId,
        validatedAt: new Date(),
        validationScore: validationData.score,
        validationNotes: validationData.notes
      };

      // 검증자의 피드백으로 라벨링 수정
      if (validationData.corrections) {
        Object.keys(validationData.corrections).forEach(key => {
          if (labeling[key]) {
            Object.assign(labeling[key], validationData.corrections[key]);
          }
        });
      }

      await labeling.save();
      
      logger.info(`라벨링 검증 완료: ${labelingId}`, {
        validator: validatorId,
        score: validationData.score
      });

      return labeling;
    } catch (error) {
      logger.error('라벨링 검증 실패', error, { labelingId, validatorId });
      throw error;
    }
  }

  /**
   * 라벨링 통계 조회
   */
  async getLabelingStats(timeRange = 7) {
    const startDate = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));

    const stats = await MedicalLabeling.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalLabels: { $sum: 1 },
          validatedLabels: {
            $sum: { $cond: ['$qualityMetrics.medicalValidation.validated', 1, 0] }
          },
          averageAccuracy: { $avg: '$qualityMetrics.labelingAccuracy' },
          averageConfidence: { $avg: '$qualityMetrics.aiConfidence.overall' },
          categoryDistribution: {
            $push: '$emergencyClassification.primaryCategory'
          },
          urgencyDistribution: {
            $push: '$responseLabels.responseUrgency'
          }
        }
      }
    ]);

    return stats[0] || {
      totalLabels: 0,
      validatedLabels: 0,
      averageAccuracy: 0,
      averageConfidence: 0,
      categoryDistribution: [],
      urgencyDistribution: []
    };
  }
}

// 싱글톤 인스턴스
const autoLabelingService = new AutoLabelingService();

module.exports = autoLabelingService;