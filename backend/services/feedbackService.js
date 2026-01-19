/**
 * 종합적인 피드백 수집 및 품질 관리 시스템
 * 사용자, 의료진, 시스템 성능에 대한 다각도 피드백 관리
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// 피드백 스키마 정의
const feedbackSchema = new mongoose.Schema({
  // 기본 정보
  feedbackId: { type: String, unique: true, required: true },
  feedbackType: { 
    type: String, 
    enum: ['user_experience', 'medical_accuracy', 'system_performance', 'workflow_efficiency', 'ai_analysis'], 
    required: true 
  },
  category: {
    type: String,
    enum: ['emergency_response', 'ai_analysis', 'hospital_matching', 'paramedic_dispatch', 'user_interface', 'data_quality'],
    required: true
  },
  
  // 피드백 제공자
  submitter: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['patient', 'guardian', 'paramedic', 'doctor', 'nurse', 'controller', 'admin'] },
    name: String,
    isAnonymous: { type: Boolean, default: false }
  },

  // 연관 케이스/데이터
  relatedCase: {
    emergencyCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyCase' },
    biometricDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'BiometricData' },
    medicalLabelingId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalLabeling' }
  },

  // 피드백 내용
  feedback: {
    rating: { type: Number, min: 1, max: 5 }, // 1-5점 평가
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    tags: [String], // 검색 및 분류용
    
    // 구체적 평가 항목
    detailed: {
      accuracy: Number,        // 정확도 (1-5)
      speed: Number,          // 응답속도 (1-5)
      usability: Number,      // 사용편의성 (1-5)
      reliability: Number,    // 신뢰도 (1-5)
      satisfaction: Number    // 전체만족도 (1-5)
    }
  },

  // 개선 제안
  suggestions: {
    hasImprovementSuggestion: { type: Boolean, default: false },
    improvementAreas: [String], // ['ui', 'algorithm', 'workflow', 'training', 'documentation']
    specificSuggestions: String,
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    implementationComplexity: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }
  },

  // 처리 상태
  processing: {
    status: { 
      type: String, 
      enum: ['submitted', 'under_review', 'in_progress', 'completed', 'rejected'], 
      default: 'submitted' 
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: String,
    resolvedAt: Date,
    resolution: String,
    
    // 처리 우선순위 (자동 계산)
    priority: {
      score: { type: Number, default: 0 }, // 0-100 점수
      level: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
      factors: {
        severityWeight: Number,
        frequencyWeight: Number,
        impactWeight: Number,
        roleWeight: Number
      }
    }
  },

  // 품질 메트릭
  qualityMetrics: {
    helpfulness: { type: Number, min: 0, max: 1 }, // 다른 사용자들의 유용성 평가
    verification: {
      isVerified: { type: Boolean, default: false },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verificationMethod: String, // 'manual', 'automated', 'peer_review'
      verifiedAt: Date
    },
    followUp: {
      hasFollowUp: { type: Boolean, default: false },
      followUpCount: { type: Number, default: 0 },
      lastFollowUpAt: Date
    }
  },

  // 메타데이터
  metadata: {
    submissionSource: String, // 'web', 'mobile', 'api', 'system'
    userAgent: String,
    ipAddress: String,
    sessionId: String,
    systemVersion: String,
    
    // 시스템 상태 (제출 당시)
    systemState: {
      activeUsers: Number,
      systemLoad: Number,
      responseTime: Number,
      errorRate: Number
    }
  },

  // 자동 분석
  aiAnalysis: {
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
    sentimentScore: { type: Number, min: -1, max: 1 },
    keyTopics: [String],
    urgency: { type: String, enum: ['low', 'medium', 'high', 'immediate'] },
    category: [String], // AI가 자동 분류한 카테고리
    duplicateScore: Number, // 유사한 피드백과의 중복도
    actionableScore: Number // 실행 가능성 점수
  }
}, {
  timestamps: true,
  collection: 'feedbacks'
});

// 인덱스 설정
feedbackSchema.index({ feedbackType: 1, category: 1 });
feedbackSchema.index({ 'submitter.role': 1, createdAt: -1 });
feedbackSchema.index({ 'processing.status': 1, 'processing.priority.score': -1 });
feedbackSchema.index({ 'relatedCase.emergencyCaseId': 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

class FeedbackService {
  
  constructor() {
    this.priorityWeights = {
      severity: { low: 1, medium: 2, high: 3, critical: 4 },
      role: { patient: 1, guardian: 1, paramedic: 3, doctor: 4, nurse: 3, controller: 2, admin: 2 },
      category: { emergency_response: 4, ai_analysis: 3, hospital_matching: 3, paramedic_dispatch: 4, user_interface: 1, data_quality: 2 }
    };
  }

  /**
   * 피드백 제출
   */
  async submitFeedback(feedbackData) {
    try {
      const feedbackId = this.generateFeedbackId();
      
      // 우선순위 점수 계산
      const priority = this.calculatePriority(feedbackData);
      
      // AI 분석 수행
      const aiAnalysis = await this.performAIAnalysis(feedbackData);
      
      // 중복 검사
      const duplicateScore = await this.checkForDuplicates(feedbackData);
      
      const feedback = new Feedback({
        feedbackId,
        ...feedbackData,
        processing: {
          ...feedbackData.processing,
          priority
        },
        aiAnalysis: {
          ...aiAnalysis,
          duplicateScore
        },
        metadata: {
          ...feedbackData.metadata,
          systemState: await this.getCurrentSystemState()
        }
      });

      const savedFeedback = await feedback.save();
      
      // 즉시 처리가 필요한 경우 알림
      if (priority.level === 'critical' || priority.score > 80) {
        await this.sendUrgentNotification(savedFeedback);
      }

      // 유사한 피드백들과 연결
      await this.linkSimilarFeedbacks(savedFeedback);

      logger.info(`피드백 등록 완료: ${feedbackId}`, {
        type: feedbackData.feedbackType,
        priority: priority.level,
        score: priority.score
      });

      return {
        success: true,
        feedbackId,
        priority: priority.level,
        message: '피드백이 성공적으로 등록되었습니다.'
      };

    } catch (error) {
      logger.error('피드백 제출 실패', error);
      throw error;
    }
  }

  /**
   * 피드백 목록 조회
   */
  async getFeedbackList(filters = {}, options = {}) {
    try {
      const {
        feedbackType,
        category,
        status,
        priority,
        role,
        dateFrom,
        dateTo,
        searchText
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // 쿼리 빌드
      const query = {};
      
      if (feedbackType) query.feedbackType = feedbackType;
      if (category) query.category = category;
      if (status) query['processing.status'] = status;
      if (priority) query['processing.priority.level'] = priority;
      if (role) query['submitter.role'] = role;
      
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      if (searchText) {
        query.$or = [
          { 'feedback.title': { $regex: searchText, $options: 'i' } },
          { 'feedback.description': { $regex: searchText, $options: 'i' } },
          { 'feedback.tags': { $in: [new RegExp(searchText, 'i')] } }
        ];
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const feedbacks = await Feedback.find(query)
        .populate('submitter.userId', 'name email')
        .populate('processing.assignedTo', 'name')
        .populate('relatedCase.emergencyCaseId', 'emergencyLevel detectedAt')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await Feedback.countDocuments(query);

      return {
        success: true,
        data: {
          feedbacks,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNext: page * limit < totalCount,
            hasPrev: page > 1
          }
        }
      };

    } catch (error) {
      logger.error('피드백 목록 조회 실패', error);
      throw error;
    }
  }

  /**
   * 피드백 상세 조회
   */
  async getFeedbackDetail(feedbackId) {
    try {
      const feedback = await Feedback.findOne({ feedbackId })
        .populate('submitter.userId', 'name email phone role')
        .populate('processing.assignedTo processing.reviewedBy', 'name email')
        .populate('relatedCase.emergencyCaseId')
        .populate('relatedCase.biometricDataId')
        .populate('relatedCase.medicalLabelingId')
        .lean();

      if (!feedback) {
        return { success: false, message: '피드백을 찾을 수 없습니다.' };
      }

      // 연관된 피드백들 조회
      const relatedFeedbacks = await this.getRelatedFeedbacks(feedback);
      
      // 처리 이력 조회
      const processingHistory = await this.getProcessingHistory(feedbackId);

      return {
        success: true,
        data: {
          ...feedback,
          relatedFeedbacks,
          processingHistory
        }
      };

    } catch (error) {
      logger.error('피드백 상세 조회 실패', error);
      throw error;
    }
  }

  /**
   * 피드백 처리 상태 업데이트
   */
  async updateFeedbackStatus(feedbackId, statusUpdate, updatedBy) {
    try {
      const updateData = {
        'processing.status': statusUpdate.status,
        'processing.reviewNotes': statusUpdate.reviewNotes,
        'processing.reviewedBy': updatedBy,
        updatedAt: new Date()
      };

      if (statusUpdate.status === 'completed') {
        updateData['processing.resolvedAt'] = new Date();
        updateData['processing.resolution'] = statusUpdate.resolution;
      }

      if (statusUpdate.assignedTo) {
        updateData['processing.assignedTo'] = statusUpdate.assignedTo;
      }

      const updatedFeedback = await Feedback.findOneAndUpdate(
        { feedbackId },
        { $set: updateData },
        { new: true }
      );

      if (!updatedFeedback) {
        return { success: false, message: '피드백을 찾을 수 없습니다.' };
      }

      // 처리 완료 시 제출자에게 알림
      if (statusUpdate.status === 'completed' && updatedFeedback.submitter.userId) {
        await this.sendResolutionNotification(updatedFeedback);
      }

      logger.info(`피드백 상태 업데이트: ${feedbackId}`, {
        status: statusUpdate.status,
        updatedBy
      });

      return {
        success: true,
        message: '피드백 상태가 업데이트되었습니다.',
        data: updatedFeedback
      };

    } catch (error) {
      logger.error('피드백 상태 업데이트 실패', error);
      throw error;
    }
  }

  /**
   * 피드백 통계 및 분석
   */
  async getFeedbackAnalytics(period = '7d') {
    try {
      const dateFrom = this.getDateFromPeriod(period);
      
      // 기본 통계
      const basicStats = await Feedback.aggregate([
        { $match: { createdAt: { $gte: dateFrom } } },
        {
          $group: {
            _id: null,
            totalFeedbacks: { $sum: 1 },
            averageRating: { $avg: '$feedback.rating' },
            criticalCount: {
              $sum: { $cond: [{ $eq: ['$processing.priority.level', 'critical'] }, 1, 0] }
            },
            resolvedCount: {
              $sum: { $cond: [{ $eq: ['$processing.status', 'completed'] }, 1, 0] }
            }
          }
        }
      ]);

      // 카테고리별 분포
      const categoryDistribution = await Feedback.aggregate([
        { $match: { createdAt: { $gte: dateFrom } } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            averageRating: { $avg: '$feedback.rating' },
            averagePriority: { $avg: '$processing.priority.score' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // 역할별 피드백
      const roleDistribution = await Feedback.aggregate([
        { $match: { createdAt: { $gte: dateFrom } } },
        {
          $group: {
            _id: '$submitter.role',
            count: { $sum: 1 },
            averageRating: { $avg: '$feedback.rating' }
          }
        }
      ]);

      // 시간별 트렌드
      const timelyTrends = await Feedback.aggregate([
        { $match: { createdAt: { $gte: dateFrom } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 },
            averageRating: { $avg: '$feedback.rating' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // 감정 분석
      const sentimentAnalysis = await Feedback.aggregate([
        { $match: { createdAt: { $gte: dateFrom } } },
        {
          $group: {
            _id: '$aiAnalysis.sentiment',
            count: { $sum: 1 },
            averageScore: { $avg: '$aiAnalysis.sentimentScore' }
          }
        }
      ]);

      // 개선 제안 분석
      const suggestionAnalysis = await Feedback.aggregate([
        { $match: { 
          createdAt: { $gte: dateFrom },
          'suggestions.hasImprovementSuggestion': true 
        }},
        { $unwind: '$suggestions.improvementAreas' },
        {
          $group: {
            _id: '$suggestions.improvementAreas',
            count: { $sum: 1 },
            avgComplexity: {
              $avg: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$suggestions.implementationComplexity', 'easy'] }, then: 1 },
                    { case: { $eq: ['$suggestions.implementationComplexity', 'medium'] }, then: 2 },
                    { case: { $eq: ['$suggestions.implementationComplexity', 'hard'] }, then: 3 }
                  ],
                  default: 2
                }
              }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        success: true,
        data: {
          period,
          basicStats: basicStats[0] || {},
          categoryDistribution,
          roleDistribution,
          timelyTrends,
          sentimentAnalysis,
          suggestionAnalysis,
          generatedAt: new Date()
        }
      };

    } catch (error) {
      logger.error('피드백 분석 실패', error);
      throw error;
    }
  }

  /**
   * 우선순위 점수 계산
   */
  calculatePriority(feedbackData) {
    let score = 0;
    const factors = {};

    // 심각도 가중치
    const severityWeight = this.priorityWeights.severity[feedbackData.feedback.severity] * 20;
    score += severityWeight;
    factors.severityWeight = severityWeight;

    // 역할 가중치
    const roleWeight = this.priorityWeights.role[feedbackData.submitter.role] * 15;
    score += roleWeight;
    factors.roleWeight = roleWeight;

    // 카테고리 가중치
    const categoryWeight = this.priorityWeights.category[feedbackData.category] * 10;
    score += categoryWeight;
    factors.impactWeight = categoryWeight;

    // 빈도 가중치 (유사한 피드백의 개수)
    // TODO: 실제 구현에서는 DB 조회를 통해 계산
    factors.frequencyWeight = 0;

    // 최종 점수와 레벨 결정
    let level = 'medium';
    if (score >= 80) level = 'critical';
    else if (score >= 60) level = 'high';
    else if (score >= 30) level = 'medium';
    else level = 'low';

    return {
      score,
      level,
      factors
    };
  }

  /**
   * AI 분석 수행
   */
  async performAIAnalysis(feedbackData) {
    try {
      const text = `${feedbackData.feedback.title} ${feedbackData.feedback.description}`;
      
      // 감정 분석 (Mock - 실제로는 NLP 서비스 연동)
      const sentiment = this.analyzeSentiment(text);
      
      // 키워드 추출
      const keyTopics = this.extractKeyTopics(text);
      
      // 긴급도 판단
      const urgency = this.determineUrgency(feedbackData);
      
      // 자동 카테고리 분류
      const category = this.categorizeAutomatically(text, feedbackData);
      
      // 실행 가능성 점수
      const actionableScore = this.calculateActionableScore(feedbackData);

      return {
        sentiment: sentiment.label,
        sentimentScore: sentiment.score,
        keyTopics,
        urgency,
        category,
        actionableScore
      };

    } catch (error) {
      logger.warn('AI 분석 실패', error);
      return {
        sentiment: 'neutral',
        sentimentScore: 0,
        keyTopics: [],
        urgency: 'medium',
        category: [],
        actionableScore: 0.5
      };
    }
  }

  /**
   * 감정 분석 (간단한 키워드 기반)
   */
  analyzeSentiment(text) {
    const positiveWords = ['좋은', '훌륭한', '만족', '빠른', '정확한', '도움', '감사'];
    const negativeWords = ['나쁜', '느린', '부정확한', '불만족', '문제', '오류', '실패'];
    
    let score = 0;
    positiveWords.forEach(word => {
      if (text.includes(word)) score += 0.1;
    });
    negativeWords.forEach(word => {
      if (text.includes(word)) score -= 0.1;
    });
    
    let label = 'neutral';
    if (score > 0.2) label = 'positive';
    else if (score < -0.2) label = 'negative';
    
    return { label, score: Math.max(-1, Math.min(1, score)) };
  }

  /**
   * 피드백 ID 생성
   */
  generateFeedbackId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `FB-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * 현재 시스템 상태 조회
   */
  async getCurrentSystemState() {
    try {
      // 실제 구현에서는 모니터링 서비스에서 데이터 수집
      return {
        activeUsers: 0, // 실제 활성 사용자 수
        systemLoad: process.cpuUsage().system,
        responseTime: 150, // ms
        errorRate: 0.01 // 1%
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * 기간별 날짜 계산
   */
  getDateFromPeriod(period) {
    const now = new Date();
    switch (period) {
      case '24h': return new Date(now - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now - 90 * 24 * 60 * 60 * 1000);
      default: return new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
  }
}

// 싱글톤 인스턴스
const feedbackService = new FeedbackService();

module.exports = feedbackService;