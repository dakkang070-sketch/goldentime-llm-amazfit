const mongoose = require('mongoose');

/**
 * 향정신성약물 탐지용 사용자 베이스라인 모델
 * CNS 억제 패턴과 점진적 변화 추적 특화
 */
const psychoactiveBaselineSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // 정상 상태 생체데이터 (CNS 기능 베이스라인)
  normal_data: [{
    heartRate: { type: Number, min: 40, max: 200 },
    hrv: { type: Number, min: 0, max: 200 },
    stressLevel: { type: Number, min: 0, max: 100 }, // 각성도 지표
    bodyTemperature: { type: Number, min: 35, max: 40 },
    movementStatus: { 
      type: String, 
      enum: ['stationary', 'walking', 'running', 'unknown'],
      default: 'stationary'
    },
    respiratoryRate: { type: Number, min: 8, max: 40 },
    sleepStatus: {
      type: String,
      enum: ['awake', 'light_sleep', 'deep_sleep', 'rem_sleep', 'unknown'],
      default: 'awake'
    },
    cognitiveIndicators: { // 간접적 인지 기능 지표
      reactionTime: { type: Number, min: 0 }, // ms (있는 경우)
      attentionSpan: { type: Number, min: 0, max: 100 }, // 0-100 점수
      alertnessLevel: { type: Number, min: 0, max: 100 } // 0-100 점수
    },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // CNS 기능 베이스라인 통계
  cns_baseline: {
    hr_mean: { type: Number, default: 72 },
    hr_std: { type: Number, default: 10 },
    hr_gradual_decline_threshold: { type: Number, default: 15 }, // % 감소 임계값
    
    hrv_mean: { type: Number, default: 45 },
    hrv_std: { type: Number, default: 12 },
    hrv_depression_threshold: { type: Number, default: 30 }, // % 감소
    
    stress_mean: { type: Number, default: 20 }, // 각성 수준
    stress_std: { type: Number, default: 8 },
    arousal_suppression_threshold: { type: Number, default: 40 }, // % 감소
    
    temp_mean: { type: Number, default: 36.5 },
    temp_std: { type: Number, default: 0.3 },
    thermoregulation_threshold: { type: Number, default: 0.8 }, // °C 변화
    
    resp_rate_mean: { type: Number, default: 16 },
    resp_rate_std: { type: Number, default: 3 },
    respiratory_depression_threshold: { type: Number, default: 25 }, // % 감소
    
    movement_baseline: {
      activity_level_mean: { type: Number, default: 0.5 }, // 0-1 활동도
      change_frequency: { type: Number, default: 0.3 },
      suppression_threshold: { type: Number, default: 70 } // % 활동 감소
    }
  },
  
  // 향정신성약물 탐지 설정
  psychoactive_detection_config: {
    sensitivity_mode: { 
      type: String, 
      enum: ['conservative', 'balanced', 'sensitive'], 
      default: 'balanced' 
    },
    cns_depression_thresholds: {
      mild_suppression: { type: Number, default: 0.3 },
      moderate_suppression: { type: Number, default: 0.6 },
      severe_suppression: { type: Number, default: 0.8 }
    },
    temporal_analysis_config: {
      trend_window_minutes: { type: Number, default: 120 }, // 2시간 추세 분석
      gradual_change_sensitivity: { type: Number, default: 0.1 },
      pattern_consistency_weight: { type: Number, default: 0.3 }
    },
    drug_category_weights: {
      benzodiazepines: { type: Number, default: 1.0 },
      barbiturates: { type: Number, default: 1.2 }, // 더 위험
      z_drugs: { type: Number, default: 0.8 },
      antipsychotics: { type: Number, default: 0.9 }
    }
  },
  
  // CNS 억제 이벤트 히스토리
  cns_depression_events: [{
    detected_at: { type: Date },
    event_type: {
      type: String,
      enum: ['gradual_hr_decline', 'movement_suppression', 'respiratory_depression', 
             'cognitive_impairment', 'arousal_reduction', 'thermoregulation_impact'],
      required: true
    },
    severity_level: { 
      type: String, 
      enum: ['mild', 'moderate', 'severe'],
      default: 'mild'
    },
    depression_score: { type: Number, min: 0, max: 1 }, // CNS 억제 점수
    duration_minutes: { type: Number },
    onset_pattern: {
      type: String,
      enum: ['immediate', 'gradual', 'delayed'],
      default: 'gradual'
    },
    recovery_time_minutes: { type: Number },
    peak_suppression_vitals: {
      hr_nadir: { type: Number }, // 최저 심박수
      resp_rate_nadir: { type: Number }, // 최저 호흡수
      activity_level_nadir: { type: Number }, // 최저 활동도
      temp_change: { type: Number } // 체온 변화
    },
    suspected_drug_category: { 
      type: String, 
      enum: ['benzodiazepines', 'barbiturates', 'z_drugs', 'antipsychotics', 'unspecified'],
      default: 'unspecified'
    },
    confirmed_by_user: { type: Boolean, default: false },
    confirmed_by_medical: { type: Boolean, default: false },
    toxicology_result: { type: String }, // 독성학 검사 결과 (있는 경우)
    clinical_notes: { type: String }
  }],
  
  // 패턴 분석 및 학습 메타데이터
  pattern_learning: {
    total_cns_events: { type: Number, default: 0 },
    confirmed_psychoactive_events: { type: Number, default: 0 },
    false_positive_rate: { type: Number, default: 0 },
    detection_accuracy: { type: Number, default: 0.5 },
    
    // 약물 카테고리별 검출 성능
    category_performance: {
      benzodiazepines: { detected: Number, confirmed: Number, accuracy: Number },
      barbiturates: { detected: Number, confirmed: Number, accuracy: Number },
      z_drugs: { detected: Number, confirmed: Number, accuracy: Number },
      antipsychotics: { detected: Number, confirmed: Number, accuracy: Number }
    },
    
    temporal_pattern_consistency: { type: Number, default: 0.5 }, // 시간적 패턴 일관성
    last_pattern_analysis: { type: Date }
  },
  
  // 개인화된 모델 매개변수
  personalized_model: {
    baseline_adaptation_rate: { type: Number, default: 0.1 }, // 베이스라인 적응 속도
    individual_sensitivity_factors: {
      hr_sensitivity: { type: Number, default: 1.0 },
      movement_sensitivity: { type: Number, default: 1.0 },
      respiratory_sensitivity: { type: Number, default: 1.0 },
      cognitive_sensitivity: { type: Number, default: 1.0 }
    },
    personalized_thresholds: {
      cns_depression_threshold: { type: Number, default: 0.65 },
      confidence_threshold: { type: Number, default: 0.8 }
    },
    model_version: { type: String, default: '1.0' },
    last_personalization_update: { type: Date }
  },
  
  // 훈련 데이터 준비 상태
  training_readiness: {
    is_ready: { type: Boolean, default: false },
    normal_data_count: { type: Number, default: 0 },
    cns_event_count: { type: Number, default: 0 },
    data_quality_score: { type: Number, default: 0.5 },
    temporal_coverage_hours: { type: Number, default: 0 },
    minimum_requirements_met: {
      normal_samples: { type: Boolean, default: false }, // 최소 200개
      cns_events: { type: Boolean, default: false }, // 최소 5개
      temporal_span: { type: Boolean, default: false }, // 최소 72시간
      data_quality: { type: Boolean, default: false } // 품질 80% 이상
    }
  },
  
  last_updated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// 인덱스 설정
psychoactiveBaselineSchema.index({ userId: 1, 'normal_data.timestamp': -1 });
psychoactiveBaselineSchema.index({ 'cns_depression_events.detected_at': -1 });
psychoactiveBaselineSchema.index({ 'training_readiness.is_ready': 1 });
psychoactiveBaselineSchema.index({ 'pattern_learning.confirmed_psychoactive_events': -1 });

// 자동 베이스라인 업데이트
psychoactiveBaselineSchema.pre('save', async function(next) {
  if (this.normal_data && this.normal_data.length >= 30) {
    this.recalculateCNSBaselines();
    this.updatePatternLearning();
    this.checkTrainingReadiness();
    this.personalizeModel();
  }
  next();
});

// CNS 기능 베이스라인 재계산
psychoactiveBaselineSchema.methods.recalculateCNSBaselines = function() {
  if (!this.normal_data || this.normal_data.length < 20) return;
  
  const recentNormalData = this.normal_data.slice(-300); // 최근 300개 정상 데이터
  
  // 기본 생체신호 통계
  this.calculateCNSVitalStats(recentNormalData);
  
  // 움직임/활동 베이스라인
  this.calculateCNSActivityBaseline(recentNormalData);
  
  // 개인화된 임계값 조정
  this.adjustPersonalizedThresholds();
  
  this.last_updated = new Date();
};

// CNS 관련 생체신호 통계 계산
psychoactiveBaselineSchema.methods.calculateCNSVitalStats = function(data) {
  // 심박수 (CNS 억제 시 감소)
  const hrValues = data.map(d => d.heartRate).filter(hr => hr > 0);
  if (hrValues.length > 0) {
    this.cns_baseline.hr_mean = this.calculateMean(hrValues);
    this.cns_baseline.hr_std = this.calculateStd(hrValues);
  }
  
  // HRV (자율신경계 지표)
  const hrvValues = data.map(d => d.hrv).filter(hrv => hrv > 0);
  if (hrvValues.length > 0) {
    this.cns_baseline.hrv_mean = this.calculateMean(hrvValues);
    this.cns_baseline.hrv_std = this.calculateStd(hrvValues);
  }
  
  // 각성 수준 (스트레스 레벨로 근사)
  const stressValues = data.map(d => d.stressLevel).filter(s => s >= 0);
  if (stressValues.length > 0) {
    this.cns_baseline.stress_mean = this.calculateMean(stressValues);
    this.cns_baseline.stress_std = this.calculateStd(stressValues);
  }
  
  // 체온 (체온조절중추 기능)
  const tempValues = data.map(d => d.bodyTemperature).filter(t => t > 30);
  if (tempValues.length > 0) {
    this.cns_baseline.temp_mean = this.calculateMean(tempValues);
    this.cns_baseline.temp_std = this.calculateStd(tempValues);
  }
  
  // 호흡수 (호흡중추 기능)
  const respValues = data.map(d => d.respiratoryRate).filter(r => r > 0);
  if (respValues.length > 0) {
    this.cns_baseline.resp_rate_mean = this.calculateMean(respValues);
    this.cns_baseline.resp_rate_std = this.calculateStd(respValues);
  }
};

// CNS 활동성 베이스라인 계산
psychoactiveBaselineSchema.methods.calculateCNSActivityBaseline = function(data) {
  // 움직임 활동도 계산
  const activityLevels = data.map(d => {
    switch (d.movementStatus) {
      case 'stationary': return 0;
      case 'walking': return 0.5;
      case 'running': return 1.0;
      default: return 0.25;
    }
  });
  
  this.cns_baseline.movement_baseline.activity_level_mean = this.calculateMean(activityLevels);
  this.cns_baseline.movement_baseline.change_frequency = this.calculateMovementChangeFreq(data);
  
  // 인지 기능 지표 (있는 경우)
  const cognitiveScores = data.map(d => d.cognitiveIndicators?.alertnessLevel || 50)
    .filter(score => score > 0);
  
  if (cognitiveScores.length > 0) {
    this.cns_baseline.cognitive_mean = this.calculateMean(cognitiveScores);
    this.cns_baseline.cognitive_std = this.calculateStd(cognitiveScores);
  }
};

// 개인화된 임계값 조정
psychoactiveBaselineSchema.methods.adjustPersonalizedThresholds = function() {
  // 개인의 베이스라인 변동성에 따른 임계값 조정
  const hrCV = this.cns_baseline.hr_std / this.cns_baseline.hr_mean;
  const stressCV = this.cns_baseline.stress_std / this.cns_baseline.stress_mean;
  
  // 변동성이 높은 사람은 임계값을 높게 설정
  if (hrCV > 0.15) {
    this.cns_baseline.hr_gradual_decline_threshold *= 1.2;
  }
  
  if (stressCV > 0.4) {
    this.cns_baseline.arousal_suppression_threshold *= 1.3;
  }
};

// 패턴 학습 업데이트
psychoactiveBaselineSchema.methods.updatePatternLearning = function() {
  const totalEvents = this.cns_depression_events.length;
  const confirmedEvents = this.cns_depression_events.filter(e => 
    e.confirmed_by_user || e.confirmed_by_medical
  ).length;
  
  this.pattern_learning.total_cns_events = totalEvents;
  this.pattern_learning.confirmed_psychoactive_events = confirmedEvents;
  
  if (totalEvents > 0) {
    this.pattern_learning.false_positive_rate = 
      Math.max(0, (totalEvents - confirmedEvents) / totalEvents);
    this.pattern_learning.detection_accuracy = 
      confirmedEvents / totalEvents;
  }
  
  // 카테고리별 성능 업데이트
  this.updateCategoryPerformance();
  
  // 시간적 패턴 일관성 계산
  this.pattern_learning.temporal_pattern_consistency = this.calculateTemporalConsistency();
  this.pattern_learning.last_pattern_analysis = new Date();
};

// 약물 카테고리별 성능 업데이트
psychoactiveBaselineSchema.methods.updateCategoryPerformance = function() {
  const categories = ['benzodiazepines', 'barbiturates', 'z_drugs', 'antipsychotics'];
  
  categories.forEach(category => {
    const categoryEvents = this.cns_depression_events.filter(e => 
      e.suspected_drug_category === category
    );
    
    const confirmedCategoryEvents = categoryEvents.filter(e => 
      e.confirmed_by_user || e.confirmed_by_medical
    );
    
    if (!this.pattern_learning.category_performance[category]) {
      this.pattern_learning.category_performance[category] = {};
    }
    
    this.pattern_learning.category_performance[category].detected = categoryEvents.length;
    this.pattern_learning.category_performance[category].confirmed = confirmedCategoryEvents.length;
    this.pattern_learning.category_performance[category].accuracy = 
      categoryEvents.length > 0 ? confirmedCategoryEvents.length / categoryEvents.length : 0;
  });
};

// 훈련 준비 상태 확인
psychoactiveBaselineSchema.methods.checkTrainingReadiness = function() {
  const normalCount = this.normal_data.length;
  const eventCount = this.pattern_learning.confirmed_psychoactive_events;
  const qualityScore = this.calculateDataQuality();
  const temporalSpan = this.calculateTemporalSpan();
  
  this.training_readiness.normal_data_count = normalCount;
  this.training_readiness.cns_event_count = eventCount;
  this.training_readiness.data_quality_score = qualityScore;
  this.training_readiness.temporal_coverage_hours = temporalSpan;
  
  // 최소 요구사항 확인
  this.training_readiness.minimum_requirements_met.normal_samples = normalCount >= 200;
  this.training_readiness.minimum_requirements_met.cns_events = eventCount >= 5;
  this.training_readiness.minimum_requirements_met.temporal_span = temporalSpan >= 72;
  this.training_readiness.minimum_requirements_met.data_quality = qualityScore >= 0.8;
  
  this.training_readiness.is_ready = Object.values(
    this.training_readiness.minimum_requirements_met
  ).every(req => req === true);
};

// 개인화 모델 업데이트
psychoactiveBaselineSchema.methods.personalizeModel = function() {
  // 검출 성능 기반 민감도 팩터 조정
  const accuracy = this.pattern_learning.detection_accuracy;
  const fpRate = this.pattern_learning.false_positive_rate;
  
  // 정확도가 낮으면 민감도 증가, FP가 높으면 민감도 감소
  if (accuracy < 0.7 && fpRate < 0.2) {
    this.personalized_model.individual_sensitivity_factors.hr_sensitivity *= 1.1;
    this.personalized_model.individual_sensitivity_factors.movement_sensitivity *= 1.1;
  } else if (fpRate > 0.3) {
    this.personalized_model.individual_sensitivity_factors.hr_sensitivity *= 0.9;
    this.personalized_model.individual_sensitivity_factors.movement_sensitivity *= 0.9;
  }
  
  // 임계값 개인화
  if (accuracy > 0.8 && fpRate < 0.15) {
    this.personalized_model.personalized_thresholds.cns_depression_threshold *= 0.95;
  } else if (fpRate > 0.25) {
    this.personalized_model.personalized_thresholds.cns_depression_threshold *= 1.05;
  }
  
  this.personalized_model.last_personalization_update = new Date();
};

// CNS 억제 이벤트 추가
psychoactiveBaselineSchema.methods.addCNSDepressionEvent = function(eventData) {
  this.cns_depression_events.push({
    detected_at: eventData.detected_at || new Date(),
    event_type: eventData.event_type,
    severity_level: eventData.severity_level || 'mild',
    depression_score: eventData.depression_score || 0.5,
    duration_minutes: eventData.duration_minutes,
    onset_pattern: eventData.onset_pattern || 'gradual',
    recovery_time_minutes: eventData.recovery_time_minutes,
    peak_suppression_vitals: eventData.peak_suppression_vitals || {},
    suspected_drug_category: eventData.suspected_drug_category || 'unspecified',
    confirmed_by_user: eventData.confirmed_by_user || false,
    confirmed_by_medical: eventData.confirmed_by_medical || false,
    toxicology_result: eventData.toxicology_result,
    clinical_notes: eventData.clinical_notes
  });
  
  this.updatePatternLearning();
};

// 향정신성약물 학습 데이터셋 생성
psychoactiveBaselineSchema.methods.generatePsychoactiveTrainingDataset = function() {
  if (!this.training_readiness.is_ready) {
    throw new Error('향정신성약물 데이터가 학습 준비 상태가 아닙니다');
  }
  
  // 정상 데이터 시퀀스 생성
  const normalSequences = this.generateNormalDataSequences();
  
  // CNS 억제 이벤트 시퀀스 생성
  const cnsEventSequences = this.generateCNSEventSequences();
  
  return {
    normal_sequences: normalSequences,
    cns_event_sequences: cnsEventSequences,
    baseline_stats: this.getCNSBaselineStats(),
    personalization_config: this.personalized_model,
    detection_config: this.psychoactive_detection_config
  };
};

// 정상 데이터 시퀀스 생성 (20 timesteps)
psychoactiveBaselineSchema.methods.generateNormalDataSequences = function() {
  const sequences = [];
  const data = this.normal_data.slice(-200);
  
  for (let i = 20; i < data.length; i++) {
    const sequence = data.slice(i-20, i).map(d => [
      d.heartRate || this.cns_baseline.hr_mean,
      d.stressLevel || this.cns_baseline.stress_mean,
      d.bodyTemperature || this.cns_baseline.temp_mean,
      d.movementStatus === 'stationary' ? 0 : d.movementStatus === 'walking' ? 1 : 2,
      d.hrv || this.cns_baseline.hrv_mean,
      d.respiratoryRate || this.cns_baseline.resp_rate_mean,
      d.sleepStatus === 'awake' ? 0 : d.sleepStatus === 'light_sleep' ? 1 : 2,
      d.cognitiveIndicators?.alertnessLevel || 50
    ]);
    
    sequences.push({
      features: sequence,
      label: [1, 0, 0, 0, 0], // [normal, benzodiazepines, barbiturates, z_drugs, antipsychotics]
      timestamp: data[i].timestamp
    });
  }
  
  return sequences;
};

// CNS 이벤트 시퀀스 생성
psychoactiveBaselineSchema.methods.generateCNSEventSequences = function() {
  return this.cns_depression_events
    .filter(event => event.confirmed_by_user || event.confirmed_by_medical)
    .map(event => {
      const label = [0, 0, 0, 0, 0];
      switch (event.suspected_drug_category) {
        case 'benzodiazepines': label[1] = 1; break;
        case 'barbiturates': label[2] = 1; break;
        case 'z_drugs': label[3] = 1; break;
        case 'antipsychotics': label[4] = 1; break;
        default: label[0] = 1;
      }
      
      return {
        features: [], // 실제로는 이벤트 시점 전후의 생체데이터 시퀀스
        label,
        timestamp: event.detected_at,
        metadata: {
          event_type: event.event_type,
          severity: event.severity_level,
          depression_score: event.depression_score,
          drug_category: event.suspected_drug_category
        }
      };
    });
};

// 통계 계산 및 유틸리티 메소드들
psychoactiveBaselineSchema.methods.calculateMean = function(values) {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
};

psychoactiveBaselineSchema.methods.calculateStd = function(values) {
  if (values.length < 2) return 0;
  const mean = this.calculateMean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

psychoactiveBaselineSchema.methods.calculateMovementChangeFreq = function(data) {
  if (data.length < 2) return 0;
  let changes = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i].movementStatus !== data[i-1].movementStatus) {
      changes++;
    }
  }
  return changes / data.length;
};

psychoactiveBaselineSchema.methods.calculateDataQuality = function() {
  const validData = this.normal_data.filter(d => 
    d.heartRate > 40 && d.heartRate < 200 &&
    d.stressLevel >= 0 && d.stressLevel <= 100 &&
    d.bodyTemperature > 35 && d.bodyTemperature < 40
  ).length;
  
  return this.normal_data.length > 0 ? validData / this.normal_data.length : 0;
};

psychoactiveBaselineSchema.methods.calculateTemporalSpan = function() {
  if (this.normal_data.length < 2) return 0;
  
  const timestamps = this.normal_data.map(d => new Date(d.timestamp)).sort();
  const spanMs = timestamps[timestamps.length - 1] - timestamps[0];
  return spanMs / (1000 * 60 * 60); // hours
};

psychoactiveBaselineSchema.methods.calculateTemporalConsistency = function() {
  if (this.cns_depression_events.length < 3) return 0.5;
  
  // 이벤트 타입별 시간 간격의 일관성 계산
  const eventsByType = {};
  this.cns_depression_events.forEach(event => {
    if (!eventsByType[event.event_type]) {
      eventsByType[event.event_type] = [];
    }
    eventsByType[event.event_type].push(new Date(event.detected_at));
  });
  
  let consistencyScores = [];
  Object.values(eventsByType).forEach(timestamps => {
    if (timestamps.length >= 2) {
      timestamps.sort();
      const intervals = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i-1]);
      }
      const avgInterval = this.calculateMean(intervals);
      const stdInterval = this.calculateStd(intervals);
      const cv = stdInterval / avgInterval;
      consistencyScores.push(1 - Math.min(cv, 1)); // 변동계수가 낮을수록 일관성 높음
    }
  });
  
  return consistencyScores.length > 0 ? this.calculateMean(consistencyScores) : 0.5;
};

psychoactiveBaselineSchema.methods.getCNSBaselineStats = function() {
  return {
    cns_baseline: this.cns_baseline,
    pattern_learning: this.pattern_learning,
    personalized_model: this.personalized_model
  };
};

module.exports = mongoose.model('PsychoactiveBaseline', psychoactiveBaselineSchema);