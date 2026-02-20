/**
 * 정교한 의료 가중치 계산 서비스
 * 다중 요소 기반 위험도 스코어링
 */

const logger = require('../utils/logger');

class MedicalWeightingService {
  
  constructor() {
    // 의료 가중치 테이블 (실제 의료 가이드라인 기반)
    this.weightingTables = {
      // 연령별 가중치 (Young Adult = 1.0 기준)
      ageWeights: {
        '0-17': 1.3,    // 소아: 높은 위험
        '18-30': 1.0,   // 청년: 기준
        '31-50': 1.1,   // 중년: 약간 높음
        '51-65': 1.3,   // 장년: 높음  
        '66-80': 1.6,   // 고령: 매우 높음
        '80+': 2.0      // 초고령: 극도로 높음
      },

      // 성별 가중치 (질환별 차이)
      genderWeights: {
        cardiac: { male: 1.2, female: 1.0 },      // 심장: 남성 높음
        respiratory: { male: 1.0, female: 1.1 },  // 호흡: 여성 약간 높음  
        trauma: { male: 1.1, female: 0.9 },       // 외상: 남성 높음
        neurological: { male: 1.0, female: 1.0 }  // 신경: 동일
      },

      // 기저질환별 가중치
      comorbidityWeights: {
        diabetes: 1.4,           // 당뇨: 40% 증가
        hypertension: 1.3,       // 고혈압: 30% 증가
        heart_disease: 1.8,      // 심장병: 80% 증가
        copd: 1.6,              // COPD: 60% 증가
        kidney_disease: 1.5,     // 신장병: 50% 증가
        cancer: 2.0,            // 암: 100% 증가
        immunocompromised: 1.7   // 면역저하: 70% 증가
      },

      // 시간대별 가중치 (응급실 통계 기반)
      timeWeights: {
        'dawn': 1.2,      // 새벽 (00-06): 20% 높음
        'morning': 1.0,   // 아침 (06-12): 기준
        'afternoon': 0.9, // 오후 (12-18): 10% 낮음
        'evening': 1.1,   // 저녁 (18-24): 10% 높음
        'weekend': 1.3,   // 주말: 30% 높음
        'holiday': 1.4    // 공휴일: 40% 높음
      },

      // 지역별 가중치 (의료 접근성)
      locationWeights: {
        urban: 1.0,       // 도시: 기준
        suburban: 1.2,    // 교외: 20% 높음
        rural: 1.5,       // 시골: 50% 높음
        remote: 2.0       // 오지: 100% 높음
      }
    };

    // 생체신호 정상범위 (연령별)
    this.vitalRanges = {
      heartRate: {
        '0-17': { min: 70, max: 120, optimal: 90 },
        '18-30': { min: 60, max: 100, optimal: 75 },
        '31-50': { min: 60, max: 100, optimal: 72 },
        '51-65': { min: 60, max: 100, optimal: 70 },
        '66-80': { min: 60, max: 100, optimal: 68 },
        '80+': { min: 60, max: 100, optimal: 65 }
      },
      bloodPressure: {
        systolic: { min: 90, max: 140, optimal: 120 },
        diastolic: { min: 60, max: 90, optimal: 80 }
      },
      oxygenSaturation: {
        healthy: { min: 95, max: 100, optimal: 98 },
        copd: { min: 88, max: 95, optimal: 92 }
      }
    };
  }

  /**
   * 종합 위험도 스코어 계산 (0-100점)
   */
  calculateRiskScore(patientData, biometricData, contextData = {}) {
    try {
      // 기본 생체신호 스코어 (0-40점)
      const vitalScore = this.calculateVitalSignsScore(patientData, biometricData);
      
      // 개인적 요소 스코어 (0-30점)
      const personalScore = this.calculatePersonalFactorsScore(patientData);
      
      // 상황적 요소 스코어 (0-20점)
      const contextualScore = this.calculateContextualScore(contextData);
      
      // 시간적 변화 스코어 (0-10점)
      const temporalScore = this.calculateTemporalScore(biometricData);

      const baseScore = vitalScore + personalScore + contextualScore + temporalScore;
      
      // 복합 가중치 적용
      const weightedScore = this.applyCompositeWeights(baseScore, patientData, contextData);
      
      // 0-100 범위로 정규화
      const finalScore = Math.max(0, Math.min(100, Math.round(weightedScore)));

      logger.info('위험도 스코어 계산 완료', {
        patientId: patientData.id,
        vitalScore,
        personalScore,
        contextualScore,
        temporalScore,
        baseScore,
        finalScore
      });

      return {
        totalScore: finalScore,
        breakdown: {
          vitalSigns: vitalScore,
          personalFactors: personalScore,
          contextual: contextualScore,
          temporal: temporalScore
        },
        riskLevel: this.getRiskLevel(finalScore),
        confidence: this.calculateConfidence(patientData, biometricData)
      };

    } catch (error) {
      logger.error('위험도 스코어 계산 실패', error);
      return {
        totalScore: 50, // 기본값
        breakdown: { vitalSigns: 20, personalFactors: 15, contextual: 10, temporal: 5 },
        riskLevel: 'moderate',
        confidence: 0.5
      };
    }
  }

  /**
   * 생체신호 기반 스코어 계산 (0-40점)
   */
  calculateVitalSignsScore(patientData, biometricData) {
    const age = patientData.age || 35;
    const ageGroup = this.getAgeGroup(age);
    const normalRange = this.vitalRanges.heartRate[ageGroup];
    
    let score = 0;

    // 심박수 스코어 (0-15점)
    if (biometricData.heartRate) {
      const hr = biometricData.heartRate;
      const baseline = patientData.baselineBiometric?.heartRate?.avg || normalRange.optimal;
      
      // 절대값 기준 스코어
      if (hr < 35) score += 15;           // 매우 위험
      else if (hr < 45) score += 12;      // 위험
      else if (hr < normalRange.min) score += 8;    // 낮음
      else if (hr > 180) score += 15;     // 매우 위험
      else if (hr > 150) score += 12;     // 위험  
      else if (hr > normalRange.max) score += 8;    // 높음
      
      // 기초선 대비 변화 스코어
      const changePercent = Math.abs((hr - baseline) / baseline) * 100;
      if (changePercent > 60) score += 5;        // 극심한 변화
      else if (changePercent > 40) score += 3;   // 심한 변화
      else if (changePercent > 25) score += 2;   // 중간 변화
    }

    // 산소포화도 스코어 (0-10점)
    if (biometricData.oxygenLevel) {
      const spo2 = biometricData.oxygenLevel;
      const hasLungDisease = patientData.medicalHistory?.includes('copd') || 
                            patientData.medicalHistory?.includes('asthma');
      
      const minNormal = hasLungDisease ? 88 : 95;
      
      if (spo2 < 85) score += 10;         // 생명위험
      else if (spo2 < minNormal) score += 6;    // 위험
      else if (spo2 < 92) score += 3;     // 주의
    }

    // 스트레스 지수 스코어 (0-10점)
    if (biometricData.stressLevel) {
      const stress = biometricData.stressLevel;
      if (stress > 95) score += 10;       // 극도 스트레스
      else if (stress > 85) score += 7;   // 높은 스트레스
      else if (stress > 70) score += 4;   // 중간 스트레스
      else if (stress > 50) score += 2;   // 약간 스트레스
    }

    // 움직임 이상 스코어 (0-5점)  
    if (biometricData.movementStatus) {
      switch (biometricData.movementStatus) {
        case 'fall_detected':
          score += 5;
          break;
        case 'irregular_movement':
          score += 3;
          break;
        case 'no_movement':
          score += 2;
          break;
      }
    }

    return Math.min(40, score);
  }

  /**
   * 개인적 요소 스코어 계산 (0-30점)
   */
  calculatePersonalFactorsScore(patientData) {
    let score = 0;

    // 연령 스코어 (0-10점)
    const age = patientData.age || 35;
    if (age < 1) score += 8;           // 신생아
    else if (age < 18) score += 5;     // 소아
    else if (age > 80) score += 10;    // 초고령
    else if (age > 65) score += 6;     // 고령
    else if (age > 50) score += 3;     // 장년

    // 성별 및 질환 조합 (0-5점)
    const gender = patientData.gender;
    const medicalHistory = patientData.medicalHistory || [];
    
    if (medicalHistory.includes('heart_disease')) {
      score += gender === 'male' ? 5 : 4;  // 남성 심장질환 더 위험
    }

    // 기저질환 스코어 (0-15점)
    let comorbidityScore = 0;
    medicalHistory.forEach(condition => {
      const weight = this.weightingTables.comorbidityWeights[condition] || 1.0;
      comorbidityScore += (weight - 1.0) * 10; // 가중치를 점수로 변환
    });
    score += Math.min(15, comorbidityScore);

    return Math.min(30, score);
  }

  /**
   * 상황적 요소 스코어 계산 (0-20점)
   */
  calculateContextualScore(contextData) {
    let score = 0;

    // 시간대 스코어 (0-8점)
    const timeOfDay = this.getTimeOfDay();
    const dayType = this.getDayType();
    
    const timeWeight = this.weightingTables.timeWeights[timeOfDay] || 1.0;
    const dayWeight = this.weightingTables.timeWeights[dayType] || 1.0;
    
    score += (timeWeight - 1.0) * 20;  // 시간대 영향
    score += (dayWeight - 1.0) * 20;   // 요일 영향

    // 위치 스코어 (0-8점)
    const location = contextData.location || 'urban';
    const locationWeight = this.weightingTables.locationWeights[location] || 1.0;
    score += (locationWeight - 1.0) * 8;

    // 환경적 요소 (0-4점)
    if (contextData.weather === 'extreme_cold') score += 2;
    if (contextData.weather === 'extreme_heat') score += 2;
    if (contextData.airQuality === 'poor') score += 1;
    if (contextData.isIsolated) score += 3;

    return Math.min(20, score);
  }

  /**
   * 시간적 변화 스코어 계산 (0-10점)
   */
  calculateTemporalScore(biometricData) {
    // 실제로는 시계열 데이터 필요, 여기서는 단순화
    let score = 0;

    const history = biometricData.history || [];
    if (history.length >= 2) {
      const recent = history[history.length - 1];
      const previous = history[history.length - 2];
      
      // 심박수 변화율
      if (recent.heartRate && previous.heartRate) {
        const changeRate = Math.abs(recent.heartRate - previous.heartRate) / previous.heartRate;
        if (changeRate > 0.3) score += 5;      // 30% 이상 변화
        else if (changeRate > 0.2) score += 3;  // 20% 이상 변화
        else if (changeRate > 0.1) score += 1;  // 10% 이상 변화
      }

      // 추세 분석 (향후 구현)
      // - 지속적 악화: +3점
      // - 급격한 변화: +2점  
      // - 불규칙 패턴: +1점
    }

    return Math.min(10, score);
  }

  /**
   * 복합 가중치 적용
   */
  applyCompositeWeights(baseScore, patientData, contextData) {
    const age = patientData.age || 35;
    const ageGroup = this.getAgeGroup(age);
    const ageWeight = this.weightingTables.ageWeights[ageGroup] || 1.0;

    // 연령별 가중치 적용
    let weightedScore = baseScore * ageWeight;

    // 기저질환별 추가 가중치
    const medicalHistory = patientData.medicalHistory || [];
    let comorbidityMultiplier = 1.0;
    
    medicalHistory.forEach(condition => {
      const weight = this.weightingTables.comorbidityWeights[condition] || 1.0;
      comorbidityMultiplier *= weight;
    });

    weightedScore *= comorbidityMultiplier;

    // 상황별 가중치  
    const timeOfDay = this.getTimeOfDay();
    const timeWeight = this.weightingTables.timeWeights[timeOfDay] || 1.0;
    weightedScore *= timeWeight;

    return weightedScore;
  }

  /**
   * 위험도 등급 결정
   */
  getRiskLevel(score) {
    if (score >= 85) return 'critical';      // 85-100: 매우 높음
    if (score >= 70) return 'high';          // 70-84: 높음
    if (score >= 50) return 'moderate';      // 50-69: 보통
    if (score >= 30) return 'low';           // 30-49: 낮음
    return 'very_low';                       // 0-29: 매우 낮음
  }

  /**
   * 신뢰도 계산
   */
  calculateConfidence(patientData, biometricData) {
    let confidence = 0.5; // 기본값

    // 데이터 완성도
    const requiredFields = ['heartRate', 'oxygenLevel', 'stressLevel', 'movementStatus'];
    const availableFields = requiredFields.filter(field => biometricData[field] != null);
    const completeness = availableFields.length / requiredFields.length;

    // 개인 기초선 데이터 가용성
    const hasBaseline = patientData.baselineBiometric ? 1.0 : 0.5;

    // 의료 이력 데이터 가용성  
    const hasMedicalHistory = (patientData.medicalHistory?.length || 0) > 0 ? 1.0 : 0.7;

    confidence = (completeness * 0.4) + (hasBaseline * 0.3) + (hasMedicalHistory * 0.3);

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * 연령 그룹 결정
   */
  getAgeGroup(age) {
    if (age < 18) return '0-17';
    if (age <= 30) return '18-30';
    if (age <= 50) return '31-50';
    if (age <= 65) return '51-65';
    if (age <= 80) return '66-80';
    return '80+';
  }

  /**
   * 시간대 결정
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 6) return 'dawn';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  /**
   * 요일 타입 결정
   */
  getDayType() {
    const day = new Date().getDay();
    if (day === 0 || day === 6) return 'weekend';
    // 공휴일 체크는 별도 라이브러리 필요
    return 'weekday';
  }

  /**
   * 가중치 테이블 업데이트 (의료진 피드백 기반)
   */
  updateWeightingTable(category, updates) {
    if (this.weightingTables[category]) {
      Object.assign(this.weightingTables[category], updates);
      logger.info(`가중치 테이블 업데이트: ${category}`, updates);
    }
  }

  /**
   * 개인별 가중치 학습 (머신러닝 기반)
   */
  async learnPersonalWeights(patientId, historicalData) {
    // 개인별 패턴 학습
    // 실제로는 ML 모델 훈련 필요
    
    logger.info(`개인별 가중치 학습 시작: ${patientId}`);
    
    // 임시 구현: 개인 기초선 기반 조정
    const personalWeights = {
      heartRateVariability: this.calculatePersonalHRVariability(historicalData),
      stressBaseline: this.calculatePersonalStressBaseline(historicalData),
      recoveryRate: this.calculateRecoveryRate(historicalData)
    };

    return personalWeights;
  }

  /**
   * 개인 심박수 변동성 계산
   */
  calculatePersonalHRVariability(historicalData) {
    const hrValues = historicalData
      .filter(d => d.heartRate)
      .map(d => d.heartRate);
    
    if (hrValues.length < 10) return 1.0; // 기본값

    const mean = hrValues.reduce((a, b) => a + b) / hrValues.length;
    const variance = hrValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / hrValues.length;
    const stdDev = Math.sqrt(variance);

    // 표준편차가 낮으면 작은 변화도 중요하게 여김
    return stdDev < 10 ? 1.3 : (stdDev > 20 ? 0.8 : 1.0);
  }

  /**
   * 개인 스트레스 기준선 계산
   */
  calculatePersonalStressBaseline(historicalData) {
    const stressValues = historicalData
      .filter(d => d.stressLevel)
      .map(d => d.stressLevel);
    
    if (stressValues.length < 5) return 50; // 기본값

    return stressValues.reduce((a, b) => a + b) / stressValues.length;
  }

  /**
   * 회복률 계산
   */
  calculateRecoveryRate(historicalData) {
    // 스트레스나 심박수가 높은 상태에서 정상으로 돌아오는 속도
    // 실제로는 시계열 분석 필요
    return 1.0; // 임시 기본값
  }
}

// 싱글톤 인스턴스
const medicalWeightingService = new MedicalWeightingService();

module.exports = medicalWeightingService;