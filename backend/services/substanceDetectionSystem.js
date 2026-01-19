/**
 * 물질 남용 탐지 시스템 - 마스터 컨트롤러
 * 4개 독립 LLM (의료 + 음주 + 마약 + 향정신성) 병렬 구조
 * 
 * 시스템 구성:
 * 1. Medical LLM (기존) - 일반 의료 분석
 * 2. Alcohol LLM (새로움) - 음주 상태 탐지
 * 3. Drug LLM (새로움) - 마약/약물 탐지  
 * 4. Psychoactive LLM (새로움) - 향정신성약물 탐지
 */

const logger = require('../utils/logger');
const AlcoholDetectionService = require('./alcoholDetectionService');
const DrugDetectionService = require('./drugDetectionService');
const PsychoactiveDetectionService = require('./psychoactiveDetectionService');
const MedicalAnalysisService = require('./ollamaService'); // 기존 의료 LLM

class SubstanceDetectionSystem {
  constructor() {
    this.services = {
      medical: new MedicalAnalysisService(),
      alcohol: new AlcoholDetectionService(),
      drug: new DrugDetectionService(),
      psychoactive: new PsychoactiveDetectionService()
    };
    
    this.isInitialized = false;
    logger.info('🧠 물질 남용 탐지 시스템 초기화');
  }

  /**
   * 시스템 초기화 - 모든 모델 로드
   */
  async initialize() {
    try {
      logger.info('⚡ 4개 독립 LLM 병렬 로딩 시작...');
      
      // 병렬로 모든 서비스 초기화
      await Promise.all([
        this.services.alcohol.initialize(),
        this.services.drug.initialize(), 
        this.services.psychoactive.initialize()
      ]);
      
      this.isInitialized = true;
      logger.info('✅ 모든 물질 탐지 LLM 로딩 완료');
      
    } catch (error) {
      logger.error('❌ 물질 탐지 시스템 초기화 실패', error);
      throw error;
    }
  }

  /**
   * 통합 분석 - 4개 LLM 병렬 실행
   * @param {Object} biometricData - Amazfit 생체데이터
   * @param {Object} userBaseline - 사용자 베이스라인
   * @returns {Object} 통합 분석 결과
   */
  async analyzeSubstanceUse(biometricData, userBaseline) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info('🔍 4개 독립 LLM 병렬 물질 분석 시작');
      
      // 1단계: 병렬 독립 분석
      const [medicalResult, alcoholResult, drugResult, psychoactiveResult] = await Promise.all([
        this.services.medical.analyzeHealth(biometricData, userBaseline),
        this.services.alcohol.detectAlcohol(biometricData, userBaseline),
        this.services.drug.detectDrug(biometricData, userBaseline), 
        this.services.psychoactive.detectPsychoactive(biometricData, userBaseline)
      ]);

      // 2단계: 결과 통합 및 복합 분석
      const integratedResult = this.integrateResults({
        medical: medicalResult,
        alcohol: alcoholResult,
        drug: drugResult,
        psychoactive: psychoactiveResult
      });

      // 3단계: 복합 상호작용 분석 (필요시)
      const complexAnalysis = this.analyzeComplexInteractions(integratedResult);

      return {
        timestamp: new Date().toISOString(),
        individual_analysis: {
          medical: medicalResult,
          alcohol: alcoholResult,
          drug: drugResult,
          psychoactive: psychoactiveResult
        },
        integrated_result: integratedResult,
        complex_interactions: complexAnalysis,
        confidence_scores: this.calculateConfidenceScores(integratedResult),
        risk_assessment: this.assessOverallRisk(integratedResult)
      };

    } catch (error) {
      logger.error('❌ 물질 분석 실패', error);
      throw error;
    }
  }

  /**
   * 결과 통합 로직
   */
  integrateResults(results) {
    const detected_substances = [];
    
    if (results.alcohol.detected) detected_substances.push('alcohol');
    if (results.drug.detected) detected_substances.push('drug');
    if (results.psychoactive.detected) detected_substances.push('psychoactive');

    return {
      substance_detected: detected_substances.length > 0,
      detected_substances,
      primary_concern: this.identifyPrimaryConcern(results),
      medical_status: results.medical.emergency_level || 1,
      combined_risk_score: this.calculateCombinedRisk(results)
    };
  }

  /**
   * 복합 상호작용 분석
   */
  analyzeComplexInteractions(result) {
    const interactions = [];
    
    if (result.detected_substances.includes('alcohol') && result.detected_substances.includes('drug')) {
      interactions.push({
        type: 'alcohol_drug_interaction',
        severity: 'high',
        description: '음주와 약물의 복합 사용으로 심각한 상호작용 위험'
      });
    }
    
    if (result.detected_substances.includes('alcohol') && result.detected_substances.includes('psychoactive')) {
      interactions.push({
        type: 'alcohol_psychoactive_interaction', 
        severity: 'critical',
        description: '음주와 향정신성약물의 복합 사용으로 극심한 중추신경계 억제 위험'
      });
    }

    return interactions;
  }

  /**
   * 신뢰도 점수 계산
   */
  calculateConfidenceScores(result) {
    return {
      overall_confidence: Math.min(...Object.values(result).map(r => r.confidence || 0.8)),
      individual_confidences: result.detected_substances.reduce((acc, substance) => {
        acc[substance] = 0.85; // 실제로는 각 모델의 confidence 사용
        return acc;
      }, {})
    };
  }

  /**
   * 전체 위험도 평가
   */
  assessOverallRisk(result) {
    let risk_level = 'low';
    
    if (result.detected_substances.length >= 2) {
      risk_level = 'critical';
    } else if (result.detected_substances.length === 1) {
      risk_level = 'high';  
    }

    return {
      level: risk_level,
      score: result.combined_risk_score,
      recommendations: this.generateRecommendations(result)
    };
  }

  /**
   * 권장사항 생성
   */
  generateRecommendations(result) {
    const recommendations = [];
    
    if (result.substance_detected) {
      recommendations.push('즉시 응급의료진 호출 필요');
      recommendations.push('환자 의식 수준 지속 모니터링');
    }
    
    if (result.detected_substances.length >= 2) {
      recommendations.push('중독 전문 치료센터 이송 고려');
      recommendations.push('독성학 전문의 자문 요청');
    }

    return recommendations;
  }

  /**
   * 실시간 모니터링 시작
   */
  async startRealTimeMonitoring(userId) {
    logger.info(`🔍 사용자 ${userId} 실시간 물질 모니터링 시작`);
    
    // 실시간 생체데이터 스트림 연결
    return this.services.alcohol.startStream(userId);
  }
}

module.exports = SubstanceDetectionSystem;