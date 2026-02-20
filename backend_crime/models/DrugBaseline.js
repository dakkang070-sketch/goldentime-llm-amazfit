const mongoose = require('mongoose');

/**
 * 마약 탐지용 사용자 베이스라인 모델
 * 정상 상태와 불규칙 패턴 데이터 수집 및 분석
 */
const drugBaselineSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // 정상 상태 생체데이터 (베이스라인용)
  normal_data: [{
    heartRate: { type: Number, min: 40, max: 200 },
    hrv: { type: Number, min: 0, max: 200 },
    stressLevel: { type: Number, min: 0, max: 100 },
    bodyTemperature: { type: Number, min: 35, max: 40 },
    movementStatus: { 
      type: String, 
      enum: ['stationary', 'walking', 'running', 'unknown'],
      default: 'stationary'
    },
    respiratoryRate: { type: Number, min: 8, max: 40 },
    acceleration: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      z: { type: Number, default: 0 }
    },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // 계산된 베이스라인 통계
  hr_mean: { type: Number, default: 72 },
  hr_std: { type: Number, default: 10 },
  hr_volatility_baseline: { type: Number, default: 0.08 }, // 정상 변동성
  
  hrv_mean: { type: Number, default: 45 },
  hrv_std: { type: Number, default: 12 },
  
  stress_mean: { type: Number, default: 20 },
  stress_std: { type: Number, default: 8 },
  
  temp_mean: { type: Number, default: 36.5 },
  temp_std: { type: Number, default: 0.3 },
  temp_volatility_baseline: { type: Number, default: 0.05 },
  
  resp_rate_mean: { type: Number, default: 16 },
  resp_rate_std: { type: Number, default: 3 },
  
  movement_baseline: {
    change_frequency: { type: Number, default: 0.3 },
    acceleration_variance: { type: Number, default: 25 }
  },
  
  // 마약 탐지 특화 메트릭
  drug_detection_config: {
    sensitivity: { 
      type: String, 
      enum: ['conservative', 'standard', 'aggressive'], 
      default: 'standard' 
    },
    pattern_thresholds: {
      hr_volatility_threshold: { type: Number, default: 0.25 }, // 25% 이상 변동성
      hr_spike_threshold: { type: Number, default: 40 }, // +40 bpm 급상승
      hrv_drop_threshold: { type: Number, default: 50 }, // 50% 이상 감소
      temp_fluctuation_threshold: { type: Number, default: 1.2 }, // ±1.2°C
      movement_disruption_threshold: { type: Number, default: 0.7 }
    },
    drug_type_preferences: {
      stimulant_weight: { type: Number, default: 1.0 },
      depressant_weight: { type: Number, default: 1.0 },
      hallucinogen_weight: { type: Number, default: 1.0 }
    }
  },
  
  // 불규칙 패턴 히스토리 (마약 특화)
  irregularity_events: [{
    detected_at: { type: Date },
    pattern_type: { 
      type: String, 
      enum: ['hr_volatility', 'hr_spike', 'hrv_crash', 'temp_chaos', 'movement_disruption'],
      required: true
    },
    severity_score: { type: Number, min: 0, max: 1 },
    duration_minutes: { type: Number },
    associated_vitals: {
      hr_at_peak: { type: Number },
      hrv_at_trough: { type: Number },
      temp_range: { min: Number, max: Number }
    },
    suspected_drug_type: { 
      type: String, 
      enum: ['stimulant', 'depressant', 'hallucinogen', 'unspecified'] 
    },
    confirmed: { type: Boolean, default: false },
    notes: { type: String }
  }],
  
  // 데이터 품질 및 패턴 분석
  pattern_analysis: {
    total_irregularities_detected: { type: Number, default: 0 },
    confirmed_drug_events: { type: Number, default: 0 },
    false_positive_rate: { type: Number, default: 0 }, // 0-1
    pattern_consistency_score: { type: Number, default: 0.5 }, // 0-1
    last_analysis_date: { type: Date }
  },
  
  // 학습 및 모델 관련
  training_metadata: {
    is_ready_for_training: { type: Boolean, default: false },
    min_normal_samples: { type: Number, default: 100 },
    min_drug_samples: { type: Number, default: 10 },
    data_balance_ratio: { type: Number, default: 0 }, // drug_events / normal_events
    last_model_update: { type: Date },
    model_performance: {
      accuracy: { type: Number, min: 0, max: 1 },
      precision: { type: Number, min: 0, max: 1 },
      recall: { type: Number, min: 0, max: 1 },
      f1_score: { type: Number, min: 0, max: 1 }
    }
  },
  
  last_updated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// 인덱스 설정
drugBaselineSchema.index({ userId: 1, 'normal_data.timestamp': -1 });
drugBaselineSchema.index({ 'irregularity_events.detected_at': -1 });
drugBaselineSchema.index({ 'training_metadata.is_ready_for_training': 1 });
drugBaselineSchema.index({ 'pattern_analysis.confirmed_drug_events': -1 });

// 자동 베이스라인 재계산
drugBaselineSchema.pre('save', async function(next) {
  if (this.normal_data && this.normal_data.length >= 20) {
    this.recalculateDrugBaselines();
    this.updatePatternAnalysis();
    this.checkDrugTrainingReadiness();
  }
  next();
});

// 마약 특화 베이스라인 재계산
drugBaselineSchema.methods.recalculateDrugBaselines = function() {
  if (!this.normal_data || this.normal_data.length < 10) return;
  
  const recentData = this.normal_data.slice(-200); // 더 많은 데이터로 안정적 베이스라인
  
  // 기본 생체신호 통계
  this.calculateBasicVitalStats(recentData);
  
  // 마약 탐지 특화 메트릭
  this.calculateDrugSpecificMetrics(recentData);
  
  this.last_updated = new Date();
};

// 기본 생체신호 통계 계산
drugBaselineSchema.methods.calculateBasicVitalStats = function(data) {
  // 심박수
  const hrValues = data.map(d => d.heartRate).filter(hr => hr > 0);
  if (hrValues.length > 0) {
    this.hr_mean = this.calculateMean(hrValues);
    this.hr_std = this.calculateStd(hrValues);
    this.hr_volatility_baseline = this.calculateVolatility(hrValues);
  }
  
  // HRV
  const hrvValues = data.map(d => d.hrv).filter(hrv => hrv > 0);
  if (hrvValues.length > 0) {
    this.hrv_mean = this.calculateMean(hrvValues);
    this.hrv_std = this.calculateStd(hrvValues);
  }
  
  // 스트레스
  const stressValues = data.map(d => d.stressLevel).filter(s => s >= 0);
  if (stressValues.length > 0) {
    this.stress_mean = this.calculateMean(stressValues);
    this.stress_std = this.calculateStd(stressValues);
  }
  
  // 체온
  const tempValues = data.map(d => d.bodyTemperature).filter(t => t > 30);
  if (tempValues.length > 0) {
    this.temp_mean = this.calculateMean(tempValues);
    this.temp_std = this.calculateStd(tempValues);
    this.temp_volatility_baseline = this.calculateVolatility(tempValues);
  }
  
  // 호흡수
  const respValues = data.map(d => d.respiratoryRate).filter(r => r > 0);
  if (respValues.length > 0) {
    this.resp_rate_mean = this.calculateMean(respValues);
    this.resp_rate_std = this.calculateStd(respValues);
  }
};

// 마약 탐지 특화 메트릭 계산
drugBaselineSchema.methods.calculateDrugSpecificMetrics = function(data) {
  // 움직임 패턴 베이스라인
  this.movement_baseline.change_frequency = this.calculateMovementChangeFreq(data);
  
  const accelerations = data.map(d => 
    Math.sqrt(d.acceleration.x**2 + d.acceleration.y**2 + d.acceleration.z**2)
  ).filter(acc => acc >= 0);
  
  if (accelerations.length > 0) {
    this.movement_baseline.acceleration_variance = this.calculateVariance(accelerations);
  }
};

// 패턴 분석 업데이트
drugBaselineSchema.methods.updatePatternAnalysis = function() {
  const totalIrregularities = this.irregularity_events.length;
  const confirmedEvents = this.irregularity_events.filter(e => e.confirmed).length;
  
  this.pattern_analysis.total_irregularities_detected = totalIrregularities;
  this.pattern_analysis.confirmed_drug_events = confirmedEvents;
  
  if (totalIrregularities > 0) {
    this.pattern_analysis.false_positive_rate = 
      Math.max(0, (totalIrregularities - confirmedEvents) / totalIrregularities);
  }
  
  // 패턴 일관성 점수 계산
  this.pattern_analysis.pattern_consistency_score = this.calculatePatternConsistency();
  this.pattern_analysis.last_analysis_date = new Date();
};

// 학습 준비 상태 확인
drugBaselineSchema.methods.checkDrugTrainingReadiness = function() {
  const normalSamples = this.normal_data.length;
  const drugSamples = this.pattern_analysis.confirmed_drug_events;
  
  this.training_metadata.data_balance_ratio = 
    normalSamples > 0 ? drugSamples / normalSamples : 0;
  
  this.training_metadata.is_ready_for_training = (
    normalSamples >= this.training_metadata.min_normal_samples &&
    drugSamples >= this.training_metadata.min_drug_samples &&
    this.pattern_analysis.pattern_consistency_score > 0.6
  );
};

// 불규칙 이벤트 추가
drugBaselineSchema.methods.addIrregularityEvent = function(eventData) {
  this.irregularity_events.push({
    detected_at: eventData.detected_at || new Date(),
    pattern_type: eventData.pattern_type,
    severity_score: eventData.severity_score || 0.5,
    duration_minutes: eventData.duration_minutes,
    associated_vitals: eventData.associated_vitals || {},
    suspected_drug_type: eventData.suspected_drug_type || 'unspecified',
    confirmed: eventData.confirmed || false,
    notes: eventData.notes
  });
  
  // 자동으로 패턴 분석 업데이트
  this.updatePatternAnalysis();
};

// 마약 탐지 학습 데이터셋 생성
drugBaselineSchema.methods.generateDrugTrainingDataset = function() {
  if (!this.training_metadata.is_ready_for_training) {
    throw new Error('마약 탐지 데이터가 학습 준비 상태가 아닙니다');
  }
  
  // 정상 데이터 (라벨: 0)
  const normalData = this.normal_data.slice(-100).map(d => ({
    features: [
      d.heartRate, d.hrv || 45, d.stressLevel, d.bodyTemperature,
      d.respiratoryRate || 16, 
      Math.sqrt(d.acceleration.x**2 + d.acceleration.y**2 + d.acceleration.z**2),
      d.movementStatus === 'stationary' ? 0 : d.movementStatus === 'walking' ? 1 : 2
    ],
    label: [1, 0, 0, 0], // [normal, stimulant, depressant, hallucinogen]
    timestamp: d.timestamp
  }));
  
  // 불규칙 패턴 데이터 (라벨: 1-3)
  const drugData = this.irregularity_events.filter(e => e.confirmed).map(event => {
    const label = [0, 0, 0, 0];
    switch (event.suspected_drug_type) {
      case 'stimulant': label[1] = 1; break;
      case 'depressant': label[2] = 1; break;
      case 'hallucinogen': label[3] = 1; break;
      default: label[0] = 1; // 미분류는 normal로
    }
    
    return {
      features: [], // 실제로는 해당 시점의 생체데이터 시퀀스
      label,
      timestamp: event.detected_at,
      metadata: {
        pattern_type: event.pattern_type,
        severity: event.severity_score,
        drug_type: event.suspected_drug_type
      }
    };
  });
  
  return {
    normal: normalData,
    drug_patterns: drugData,
    baseline_stats: this.getBaselineStats(),
    training_config: this.drug_detection_config
  };
};

// 베이스라인 통계 반환
drugBaselineSchema.methods.getBaselineStats = function() {
  return {
    hr_mean: this.hr_mean,
    hr_std: this.hr_std,
    hr_volatility_baseline: this.hr_volatility_baseline,
    hrv_mean: this.hrv_mean,
    hrv_std: this.hrv_std,
    stress_mean: this.stress_mean,
    stress_std: this.stress_std,
    temp_mean: this.temp_mean,
    temp_std: this.temp_std,
    temp_volatility_baseline: this.temp_volatility_baseline,
    resp_rate_mean: this.resp_rate_mean,
    resp_rate_std: this.resp_rate_std,
    movement_baseline: this.movement_baseline
  };
};

// 통계 계산 헬퍼 메소드들
drugBaselineSchema.methods.calculateMean = function(values) {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
};

drugBaselineSchema.methods.calculateStd = function(values) {
  if (values.length < 2) return 0;
  const mean = this.calculateMean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

drugBaselineSchema.methods.calculateVariance = function(values) {
  if (values.length < 2) return 0;
  const mean = this.calculateMean(values);
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
};

drugBaselineSchema.methods.calculateVolatility = function(values) {
  if (values.length < 3) return 0;
  
  const changes = [];
  for (let i = 1; i < values.length; i++) {
    changes.push(Math.abs(values[i] - values[i-1]) / values[i-1]);
  }
  
  return this.calculateMean(changes);
};

drugBaselineSchema.methods.calculateMovementChangeFreq = function(data) {
  if (data.length < 2) return 0;
  let changes = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i].movementStatus !== data[i-1].movementStatus) {
      changes++;
    }
  }
  return changes / data.length;
};

drugBaselineSchema.methods.calculatePatternConsistency = function() {
  if (this.irregularity_events.length < 3) return 0.5;
  
  // 패턴 유형별 분포의 일관성 계산
  const patternTypes = {};
  this.irregularity_events.forEach(event => {
    patternTypes[event.pattern_type] = (patternTypes[event.pattern_type] || 0) + 1;
  });
  
  const total = this.irregularity_events.length;
  const entropy = Object.values(patternTypes).reduce((sum, count) => {
    const p = count / total;
    return sum - (p * Math.log2(p));
  }, 0);
  
  const maxEntropy = Math.log2(Object.keys(patternTypes).length);
  return maxEntropy > 0 ? 1 - (entropy / maxEntropy) : 0.5;
};

// 마약 유형별 패턴 매칭 스코어 계산
drugBaselineSchema.methods.calculateDrugTypeScore = function(biometricData) {
  const scores = {
    stimulant: 0,
    depressant: 0,
    hallucinogen: 0
  };
  
  // 각성제 패턴 점수
  if (biometricData.heartRate > this.hr_mean + 2 * this.hr_std) scores.stimulant += 0.3;
  if (biometricData.bodyTemperature > this.temp_mean + this.temp_std) scores.stimulant += 0.2;
  if (biometricData.stressLevel > this.stress_mean + 2 * this.stress_std) scores.stimulant += 0.2;
  
  // 억제제 패턴 점수
  if (biometricData.heartRate < this.hr_mean - this.hr_std) scores.depressant += 0.3;
  if (biometricData.respiratoryRate < this.resp_rate_mean - this.resp_rate_std) scores.depressant += 0.2;
  
  // 환각제 패턴 점수 (불규칙성 기반)
  const hrDeviation = Math.abs(biometricData.heartRate - this.hr_mean) / this.hr_std;
  const tempDeviation = Math.abs(biometricData.bodyTemperature - this.temp_mean) / this.temp_std;
  if (hrDeviation > 1.5 || tempDeviation > 1.5) scores.hallucinogen += 0.4;
  
  return scores;
};

module.exports = mongoose.model('DrugBaseline', drugBaselineSchema);