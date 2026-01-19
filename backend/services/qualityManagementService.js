/**
 * 종합적인 품질 관리 및 지속적 개선 시스템
 * KPI 모니터링, 품질 지표 추적, 개선 사항 관리
 */

const logger = require('../utils/logger');
const EmergencyCase = require('../models/EmergencyCase');
const feedbackService = require('./feedbackService');
const cron = require('node-cron');

class QualityManagementService {
  
  constructor() {
    this.qualityMetrics = new Map(); // 실시간 품질 지표
    this.improvementQueue = [];       // 개선 작업 대기열
    this.kpiTargets = {
      // AI 분석 품질 목표
      aiAnalysisAccuracy: 0.87,      // 87% 정확도
      medicalValidationScore: 0.90,   // 90% 의료진 검증 점수
      
      // 응급 대응 품질 목표
      responseTimeCompliance: 0.85,   // 85% 골든타임 준수
      workflowEfficiency: 0.90,       // 90% 워크플로우 효율성
      
      // 사용자 만족도 목표
      userSatisfaction: 4.0,          // 5점 만점 4.0점
      medicalStaffSatisfaction: 4.2,  // 의료진 만족도 4.2점
      
      // 시스템 성능 목표
      systemUptime: 0.999,            // 99.9% 가동률
      averageResponseTime: 200,       // 평균 200ms 응답시간
      errorRate: 0.01,                // 1% 미만 오류율
      
      // 데이터 품질 목표
      dataCompleteness: 0.95,         // 95% 데이터 완전성
      labelingAccuracy: 0.92          // 92% 라벨링 정확도
    };
  }

  /**
   * 품질 관리 시스템 시작
   */
  async start() {
    try {
      logger.info('🎯 품질 관리 시스템 시작');

      // 실시간 품질 모니터링 (10분마다)
      cron.schedule('*/10 * * * *', async () => {
        await this.collectQualityMetrics();
      });

      // 일일 품질 리포트 생성 (매일 오전 9시)
      cron.schedule('0 9 * * *', async () => {
        await this.generateDailyQualityReport();
      });

      // 주간 품질 분석 (매주 월요일 오전 10시)
      cron.schedule('0 10 * * 1', async () => {
        await this.generateWeeklyQualityAnalysis();
      });

      // 개선 작업 처리 (매시간)
      cron.schedule('0 * * * *', async () => {
        await this.processImprovementQueue();
      });

      // 초기 품질 지표 수집
      await this.collectQualityMetrics();

      logger.info('✅ 품질 관리 시스템 활성화 완료');

    } catch (error) {
      logger.error('품질 관리 시스템 시작 실패', error);
    }
  }

  /**
   * 실시간 품질 지표 수집
   */
  async collectQualityMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        ai: await this.collectAIQualityMetrics(),
        workflow: await this.collectWorkflowQualityMetrics(),
        user: await this.collectUserSatisfactionMetrics(),
        system: await this.collectSystemQualityMetrics(),
        data: await this.collectDataQualityMetrics()
      };

      // 품질 지표 저장
      this.qualityMetrics.set(Date.now(), metrics);

      // 임계치 위반 확인
      await this.checkQualityThresholds(metrics);

      logger.info('품질 지표 수집 완료', {
        aiAccuracy: metrics.ai.accuracy,
        workflowEfficiency: metrics.workflow.efficiency,
        userSatisfaction: metrics.user.satisfaction,
        systemUptime: metrics.system.uptime
      });

    } catch (error) {
      logger.error('품질 지표 수집 실패', error);
    }
  }

  /**
   * AI 분석 품질 지표 수집
   */
  async collectAIQualityMetrics() {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // 최근 24시간 AI 분석 케이스들
      const aiCases = await EmergencyCase.find({
        detectedAt: { $gte: last24h },
        'llmAnalysis.analysisText': { $exists: true }
      }).lean();

      // 의료진 검증이 완료된 케이스들
      const validatedCases = aiCases.filter(c => 
        c.medicalValidation?.validated === true
      );

      // 정확도 계산
      const accuracy = validatedCases.length > 0 
        ? validatedCases.filter(c => c.medicalValidation.score >= 4).length / validatedCases.length
        : 0;

      // 평균 신뢰도
      const averageConfidence = aiCases.length > 0
        ? aiCases.reduce((sum, c) => sum + (c.llmAnalysis.confidence || 0), 0) / aiCases.length
        : 0;

      // AI 모델 성능 (최근 자동 학습 결과)
      const modelPerformance = await this.getLatestModelPerformance();

      return {
        totalAnalyses: aiCases.length,
        validatedAnalyses: validatedCases.length,
        accuracy,
        averageConfidence,
        modelPerformance,
        target: this.kpiTargets.aiAnalysisAccuracy,
        status: accuracy >= this.kpiTargets.aiAnalysisAccuracy ? 'good' : 'needs_improvement'
      };

    } catch (error) {
      logger.warn('AI 품질 지표 수집 실패', error);
      return { accuracy: 0, status: 'error' };
    }
  }

  /**
   * 워크플로우 품질 지표 수집
   */
  async collectWorkflowQualityMetrics() {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // 최근 24시간 완료된 응급 케이스들
      const completedCases = await EmergencyCase.find({
        detectedAt: { $gte: last24h },
        status: 'completed',
        'paramedic.arrivedAt': { $exists: true }
      }).lean();

      // 골든타임 준수율 (8분 내 현장 도착)
      const goldenTimeCompliant = completedCases.filter(c => {
        const responseTime = new Date(c.paramedic.arrivedAt) - new Date(c.detectedAt);
        return responseTime <= 8 * 60 * 1000; // 8분
      });

      const responseTimeCompliance = completedCases.length > 0 
        ? goldenTimeCompliant.length / completedCases.length
        : 0;

      // 평균 응답 시간 (분)
      const averageResponseTime = completedCases.length > 0
        ? completedCases.reduce((sum, c) => {
            const responseTime = new Date(c.paramedic.arrivedAt) - new Date(c.detectedAt);
            return sum + (responseTime / (1000 * 60));
          }, 0) / completedCases.length
        : 0;

      // 에스컬레이션 비율
      const escalatedCases = completedCases.filter(c => c.escalationLevel > 0);
      const escalationRate = completedCases.length > 0 
        ? escalatedCases.length / completedCases.length
        : 0;

      // 워크플로우 효율성 (자동화 비율)
      const automatedCases = completedCases.filter(c => c.matchingType === 'auto');
      const efficiency = completedCases.length > 0 
        ? automatedCases.length / completedCases.length
        : 0;

      return {
        totalCases: completedCases.length,
        responseTimeCompliance,
        averageResponseTime: Math.round(averageResponseTime),
        escalationRate,
        efficiency,
        target: this.kpiTargets.responseTimeCompliance,
        status: responseTimeCompliance >= this.kpiTargets.responseTimeCompliance ? 'good' : 'needs_improvement'
      };

    } catch (error) {
      logger.warn('워크플로우 품질 지표 수집 실패', error);
      return { efficiency: 0, status: 'error' };
    }
  }

  /**
   * 사용자 만족도 지표 수집
   */
  async collectUserSatisfactionMetrics() {
    try {
      // 최근 7일간 피드백 데이터
      const feedbackAnalytics = await feedbackService.getFeedbackAnalytics('7d');
      
      if (!feedbackAnalytics.success) {
        return { satisfaction: 0, status: 'error' };
      }

      const data = feedbackAnalytics.data;
      
      // 전체 만족도
      const overallSatisfaction = data.basicStats.averageRating || 0;
      
      // 역할별 만족도
      const roleSatisfaction = {};
      data.roleDistribution.forEach(role => {
        roleSatisfaction[role._id] = role.averageRating;
      });

      // 의료진 만족도 (의사, 간호사, 응급구조사)
      const medicalStaffSatisfaction = ['doctor', 'nurse', 'paramedic']
        .map(role => roleSatisfaction[role] || 0)
        .reduce((sum, rating) => sum + rating, 0) / 3;

      // 감정 분석
      const sentimentDistribution = {};
      data.sentimentAnalysis.forEach(sentiment => {
        sentimentDistribution[sentiment._id] = sentiment.count;
      });

      const positiveRatio = sentimentDistribution.positive || 0;
      const totalSentiment = Object.values(sentimentDistribution).reduce((sum, count) => sum + count, 0);
      const positivityRate = totalSentiment > 0 ? positiveRatio / totalSentiment : 0;

      return {
        totalFeedbacks: data.basicStats.totalFeedbacks,
        satisfaction: overallSatisfaction,
        medicalStaffSatisfaction,
        roleSatisfaction,
        positivityRate,
        sentimentDistribution,
        target: this.kpiTargets.userSatisfaction,
        status: overallSatisfaction >= this.kpiTargets.userSatisfaction ? 'good' : 'needs_improvement'
      };

    } catch (error) {
      logger.warn('사용자 만족도 지표 수집 실패', error);
      return { satisfaction: 0, status: 'error' };
    }
  }

  /**
   * 시스템 품질 지표 수집
   */
  async collectSystemQualityMetrics() {
    try {
      // 시스템 가동 시간
      const uptime = process.uptime();
      const totalTime = 24 * 60 * 60; // 24시간
      const uptimeRatio = Math.min(1, uptime / totalTime);

      // 메모리 사용량
      const memoryUsage = process.memoryUsage();
      const memoryUtilization = memoryUsage.heapUsed / memoryUsage.heapTotal;

      // CPU 사용량 (근사치)
      const cpuUsage = process.cpuUsage();
      const cpuUtilization = cpuUsage.system / (cpuUsage.system + cpuUsage.user);

      // 응답 시간 (평균 - Mock 데이터)
      const averageResponseTime = 180; // ms

      // 오류율 (Mock 데이터)
      const errorRate = 0.008; // 0.8%

      return {
        uptime: uptimeRatio,
        memoryUtilization,
        cpuUtilization,
        averageResponseTime,
        errorRate,
        targets: {
          uptime: this.kpiTargets.systemUptime,
          responseTime: this.kpiTargets.averageResponseTime,
          errorRate: this.kpiTargets.errorRate
        },
        status: (uptimeRatio >= this.kpiTargets.systemUptime && 
                averageResponseTime <= this.kpiTargets.averageResponseTime &&
                errorRate <= this.kpiTargets.errorRate) ? 'good' : 'needs_improvement'
      };

    } catch (error) {
      logger.warn('시스템 품질 지표 수집 실패', error);
      return { uptime: 0, status: 'error' };
    }
  }

  /**
   * 데이터 품질 지표 수집
   */
  async collectDataQualityMetrics() {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // 최근 24시간 생성된 응급 케이스
      const recentCases = await EmergencyCase.find({
        detectedAt: { $gte: last24h }
      }).lean();

      // 데이터 완전성 검사
      let completeDataCount = 0;
      recentCases.forEach(case_ => {
        const hasRequiredFields = case_.userId && case_.emergencyLevel && case_.detectedAnomalies;
        const hasLocationData = case_.locations?.detectedAt?.lat && case_.locations?.detectedAt?.lng;
        const hasBiometricData = case_.vitals || case_.activity;
        
        if (hasRequiredFields && hasLocationData && hasBiometricData) {
          completeDataCount++;
        }
      });

      const dataCompleteness = recentCases.length > 0 
        ? completeDataCount / recentCases.length
        : 0;

      // 라벨링 품질 (의료 라벨링 서비스에서)
      const autoLabelingService = require('./autoLabelingService');
      const labelingStats = await autoLabelingService.getLabelingStats();
      
      const labelingAccuracy = labelingStats.averageAccuracy || 0;
      const validationRate = labelingStats.validationRate || 0;

      // 데이터 품질 점수 계산
      const qualityScore = (dataCompleteness * 0.4) + (labelingAccuracy * 0.3) + (validationRate * 0.3);

      return {
        totalCases: recentCases.length,
        completeDataCount,
        dataCompleteness,
        labelingAccuracy,
        validationRate,
        qualityScore,
        targets: {
          completeness: this.kpiTargets.dataCompleteness,
          labelingAccuracy: this.kpiTargets.labelingAccuracy
        },
        status: qualityScore >= 0.85 ? 'good' : 'needs_improvement'
      };

    } catch (error) {
      logger.warn('데이터 품질 지표 수집 실패', error);
      return { qualityScore: 0, status: 'error' };
    }
  }

  /**
   * 품질 임계치 위반 확인
   */
  async checkQualityThresholds(metrics) {
    try {
      const violations = [];

      // AI 분석 정확도 체크
      if (metrics.ai.accuracy < this.kpiTargets.aiAnalysisAccuracy) {
        violations.push({
          type: 'ai_accuracy',
          current: metrics.ai.accuracy,
          target: this.kpiTargets.aiAnalysisAccuracy,
          severity: 'medium',
          message: 'AI 분석 정확도가 목표치 미만입니다.'
        });
      }

      // 골든타임 준수율 체크
      if (metrics.workflow.responseTimeCompliance < this.kpiTargets.responseTimeCompliance) {
        violations.push({
          type: 'response_time',
          current: metrics.workflow.responseTimeCompliance,
          target: this.kpiTargets.responseTimeCompliance,
          severity: 'high',
          message: '골든타임 준수율이 목표치 미만입니다.'
        });
      }

      // 사용자 만족도 체크
      if (metrics.user.satisfaction < this.kpiTargets.userSatisfaction) {
        violations.push({
          type: 'user_satisfaction',
          current: metrics.user.satisfaction,
          target: this.kpiTargets.userSatisfaction,
          severity: 'medium',
          message: '사용자 만족도가 목표치 미만입니다.'
        });
      }

      // 시스템 성능 체크
      if (metrics.system.errorRate > this.kpiTargets.errorRate) {
        violations.push({
          type: 'error_rate',
          current: metrics.system.errorRate,
          target: this.kpiTargets.errorRate,
          severity: 'high',
          message: '시스템 오류율이 목표치를 초과했습니다.'
        });
      }

      // 위반사항이 있으면 개선 작업 큐에 추가
      if (violations.length > 0) {
        await this.addImprovementTasks(violations);
        
        logger.warn(`품질 임계치 위반 감지: ${violations.length}건`, {
          violations: violations.map(v => v.type)
        });
      }

    } catch (error) {
      logger.error('품질 임계치 확인 실패', error);
    }
  }

  /**
   * 개선 작업 큐에 추가
   */
  async addImprovementTasks(violations) {
    try {
      for (const violation of violations) {
        const improvementTask = {
          id: `improvement_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: violation.type,
          severity: violation.severity,
          description: violation.message,
          currentValue: violation.current,
          targetValue: violation.target,
          createdAt: new Date(),
          status: 'pending',
          suggestedActions: this.getSuggestedActions(violation.type)
        };

        this.improvementQueue.push(improvementTask);
      }

      logger.info(`개선 작업 ${violations.length}건 추가됨`);

    } catch (error) {
      logger.error('개선 작업 추가 실패', error);
    }
  }

  /**
   * 개선 작업 제안 생성
   */
  getSuggestedActions(violationType) {
    const actionMap = {
      ai_accuracy: [
        '학습 데이터 품질 검토',
        '모델 파라미터 조정',
        '추가 전문 데이터셋 확보',
        '의료진 피드백 강화'
      ],
      response_time: [
        '응급구조사 배치 최적화',
        '에스컬레이션 규칙 조정',
        '교통 경로 알고리즘 개선',
        '백업 리소스 확보'
      ],
      user_satisfaction: [
        '사용자 인터페이스 개선',
        '피드백 대응 프로세스 강화',
        '교육 프로그램 제공',
        '개인화 기능 추가'
      ],
      error_rate: [
        '코드 품질 검토',
        '시스템 모니터링 강화',
        '부하 분산 최적화',
        '예외 처리 개선'
      ]
    };

    return actionMap[violationType] || ['상세 분석 필요'];
  }

  /**
   * 일일 품질 리포트 생성
   */
  async generateDailyQualityReport() {
    try {
      const metrics = await this.collectQualityMetrics();
      
      const report = {
        date: new Date().toISOString().split('T')[0],
        summary: {
          overallScore: this.calculateOverallQualityScore(metrics),
          aiAccuracy: metrics.ai.accuracy,
          workflowEfficiency: metrics.workflow.efficiency,
          userSatisfaction: metrics.user.satisfaction,
          systemUptime: metrics.system.uptime,
          dataQuality: metrics.data.qualityScore
        },
        details: metrics,
        improvements: this.improvementQueue.filter(task => 
          task.createdAt >= new Date(Date.now() - 24 * 60 * 60 * 1000)
        ),
        recommendations: this.generateRecommendations(metrics)
      };

      logger.info('일일 품질 리포트 생성 완료', {
        overallScore: report.summary.overallScore,
        totalImprovements: report.improvements.length
      });

      return report;

    } catch (error) {
      logger.error('일일 품질 리포트 생성 실패', error);
      return null;
    }
  }

  /**
   * 전체 품질 점수 계산
   */
  calculateOverallQualityScore(metrics) {
    try {
      const weights = {
        ai: 0.25,      // AI 분석 품질 25%
        workflow: 0.30, // 워크플로우 효율성 30%
        user: 0.20,     // 사용자 만족도 20%
        system: 0.15,   // 시스템 성능 15%
        data: 0.10      // 데이터 품질 10%
      };

      const scores = {
        ai: Math.min(1, metrics.ai.accuracy),
        workflow: Math.min(1, metrics.workflow.efficiency),
        user: Math.min(1, metrics.user.satisfaction / 5), // 5점 만점을 1로 정규화
        system: metrics.system.uptime,
        data: metrics.data.qualityScore
      };

      let overallScore = 0;
      Object.keys(weights).forEach(key => {
        overallScore += (scores[key] || 0) * weights[key];
      });

      return Math.round(overallScore * 100); // 0-100 점수

    } catch (error) {
      logger.warn('전체 품질 점수 계산 실패', error);
      return 0;
    }
  }

  /**
   * 개선 권고사항 생성
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    // AI 분석 개선
    if (metrics.ai.accuracy < 0.85) {
      recommendations.push({
        area: 'AI 분석 품질',
        priority: 'high',
        action: '의료진 피드백 기반 모델 재훈련 수행',
        expectedImpact: '+5% 정확도 향상'
      });
    }

    // 워크플로우 최적화
    if (metrics.workflow.efficiency < 0.9) {
      recommendations.push({
        area: '워크플로우 자동화',
        priority: 'medium',
        action: '에스컬레이션 규칙 조정 및 백업 매칭 강화',
        expectedImpact: '+10% 자동화율 향상'
      });
    }

    // 사용자 경험 개선
    if (metrics.user.satisfaction < 4.0) {
      recommendations.push({
        area: '사용자 만족도',
        priority: 'medium',
        action: 'UI/UX 개선 및 피드백 대응 프로세스 강화',
        expectedImpact: '+0.3점 만족도 향상'
      });
    }

    return recommendations;
  }

  /**
   * 품질 대시보드 데이터 조회
   */
  async getQualityDashboard() {
    try {
      const latestMetrics = Array.from(this.qualityMetrics.values()).pop();
      
      if (!latestMetrics) {
        await this.collectQualityMetrics();
        return this.getQualityDashboard();
      }

      return {
        success: true,
        data: {
          overallScore: this.calculateOverallQualityScore(latestMetrics),
          metrics: latestMetrics,
          activeImprovements: this.improvementQueue.filter(task => task.status !== 'completed').length,
          lastUpdated: latestMetrics.timestamp,
          trends: this.calculateTrends()
        }
      };

    } catch (error) {
      logger.error('품질 대시보드 데이터 조회 실패', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 품질 트렌드 계산
   */
  calculateTrends() {
    const recentMetrics = Array.from(this.qualityMetrics.values()).slice(-7); // 최근 7개
    
    if (recentMetrics.length < 2) return null;

    const first = recentMetrics[0];
    const last = recentMetrics[recentMetrics.length - 1];

    return {
      aiAccuracy: last.ai.accuracy - first.ai.accuracy,
      workflowEfficiency: last.workflow.efficiency - first.workflow.efficiency,
      userSatisfaction: last.user.satisfaction - first.user.satisfaction,
      systemUptime: last.system.uptime - first.system.uptime
    };
  }
}

// 싱글톤 인스턴스
const qualityManagementService = new QualityManagementService();

module.exports = qualityManagementService;