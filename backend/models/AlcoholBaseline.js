const mongoose = require('mongoose');

/**
 * 음주 탐지용 사용자 베이스라인 모델
 * 정상 상태의 생체데이터 수집 및 통계 관리
 */
const alcoholBaselineSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // 정상 상태 생체데이터 수집
  normal_data: [{
    heartRate: { type: Number, min: 40, max: 200 },
    stressLevel: { type: Number, min: 0, max: 100 },
    bodyTemperature: { type: Number, min: 35, max: 40 },
    hrv: { type: Number, min: 0, max: 200 },
    movementStatus: { 
      type: String, 
      enum: ['stationary', 'walking', 'running', 'unknown'],
      default: 'stationary'
    },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // 계산된 베이스라인 통계
  hr_mean: { type: Number, default: 72 },
  hr_std: { type: Number, default: 10 },
  hr_percentile_95: { type: Number },
  hr_percentile_5: { type: Number },
  
  hrv_mean: { type: Number, default: 45 },
  hrv_std: { type: Number, default: 12 },
  
  stress_mean: { type: Number, default: 20 },
  stress_std: { type: Number, default: 8 },
  
  temp_mean: { type: Number, default: 36.5 },
  temp_std: { type: Number, default: 0.3 },
  
  movement_change_freq: { type: Number, default: 0.3 }, // 움직임 변화 빈도
  
  // 음주 탐지 특화 메타데이터
  alcohol_detection_config: {
    sensitivity: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    },
    custom_thresholds: {
      hr_increase_threshold: { type: Number, default: 20 }, // %
      hrv_decrease_threshold: { type: Number, default: 30 }, // %
      stress_increase_threshold: { type: Number, default: 25 },
      temp_increase_threshold: { type: Number, default: 0.8 } // °C
    }
  },
  
  // 데이터 품질 지표
  data_quality: {
    total_samples: { type: Number, default: 0 },
    valid_samples: { type: Number, default: 0 },
    last_quality_check: { type: Date },
    quality_score: { type: Number, min: 0, max: 1, default: 0.5 }
  },
  
  // 학습 관련
  last_updated: { type: Date, default: Date.now },
  model_version: { type: String, default: '1.0' },
  is_training_ready: { type: Boolean, default: false }, // 최소 데이터 확보 여부
  
  // 음주 이벤트 히스토리 (라벨링용)
  alcohol_events: [{
    detected_at: { type: Date },
    confirmed_by_user: { type: Boolean, default: false },
    severity_level: { 
      type: String, 
      enum: ['mild', 'moderate', 'severe'],
      default: 'mild'
    },
    duration_minutes: { type: Number },
    recovery_time_minutes: { type: Number },
    notes: { type: String }
  }]
}, {
  timestamps: true
});

// 인덱스 설정
alcoholBaselineSchema.index({ userId: 1, 'normal_data.timestamp': -1 });
alcoholBaselineSchema.index({ 'data_quality.quality_score': -1 });
alcoholBaselineSchema.index({ is_training_ready: 1 });

// 베이스라인 통계 자동 계산 미들웨어
alcoholBaselineSchema.pre('save', async function(next) {
  if (this.normal_data && this.normal_data.length >= 10) {
    this.recalculateBaselines();
    this.updateDataQuality();
    this.checkTrainingReadiness();
  }
  next();
});

// 베이스라인 재계산 메소드
alcoholBaselineSchema.methods.recalculateBaselines = function() {
  if (!this.normal_data || this.normal_data.length < 5) return;
  
  // 최근 100개 데이터만 사용
  const recentData = this.normal_data.slice(-100);
  
  // 심박수 통계
  const hrValues = recentData.map(d => d.heartRate).filter(hr => hr > 0);
  if (hrValues.length > 0) {
    this.hr_mean = this.calculateMean(hrValues);
    this.hr_std = this.calculateStd(hrValues);
    this.hr_percentile_95 = this.calculatePercentile(hrValues, 95);
    this.hr_percentile_5 = this.calculatePercentile(hrValues, 5);
  }
  
  // HRV 통계
  const hrvValues = recentData.map(d => d.hrv).filter(hrv => hrv > 0);
  if (hrvValues.length > 0) {
    this.hrv_mean = this.calculateMean(hrvValues);
    this.hrv_std = this.calculateStd(hrvValues);
  }
  
  // 스트레스 통계
  const stressValues = recentData.map(d => d.stressLevel).filter(s => s >= 0);
  if (stressValues.length > 0) {
    this.stress_mean = this.calculateMean(stressValues);
    this.stress_std = this.calculateStd(stressValues);
  }
  
  // 체온 통계
  const tempValues = recentData.map(d => d.bodyTemperature).filter(t => t > 30);
  if (tempValues.length > 0) {
    this.temp_mean = this.calculateMean(tempValues);
    this.temp_std = this.calculateStd(tempValues);
  }
  
  // 움직임 변화 빈도
  this.movement_change_freq = this.calculateMovementChangeFreq(recentData);
  
  this.last_updated = new Date();
};

// 데이터 품질 업데이트
alcoholBaselineSchema.methods.updateDataQuality = function() {
  const totalSamples = this.normal_data.length;
  const validSamples = this.normal_data.filter(d => 
    d.heartRate > 40 && d.heartRate < 200 &&
    d.stressLevel >= 0 && d.stressLevel <= 100 &&
    d.bodyTemperature > 35 && d.bodyTemperature < 40
  ).length;
  
  this.data_quality.total_samples = totalSamples;
  this.data_quality.valid_samples = validSamples;
  this.data_quality.quality_score = totalSamples > 0 ? validSamples / totalSamples : 0;
  this.data_quality.last_quality_check = new Date();
};

// 학습 준비 상태 확인
alcoholBaselineSchema.methods.checkTrainingReadiness = function() {
  const minSamples = 50; // 최소 50개 정상 데이터 필요
  const minQuality = 0.8; // 80% 이상 품질
  
  this.is_training_ready = (
    this.normal_data.length >= minSamples &&
    this.data_quality.quality_score >= minQuality
  );
};

// 통계 계산 헬퍼 메소드들
alcoholBaselineSchema.methods.calculateMean = function(values) {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
};

alcoholBaselineSchema.methods.calculateStd = function(values) {
  if (values.length < 2) return 0;
  const mean = this.calculateMean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

alcoholBaselineSchema.methods.calculatePercentile = function(values, percentile) {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
};

alcoholBaselineSchema.methods.calculateMovementChangeFreq = function(data) {
  if (data.length < 2) return 0;
  let changes = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i].movementStatus !== data[i-1].movementStatus) {
      changes++;
    }
  }
  return changes / data.length;
};

// 음주 이벤트 추가 메소드
alcoholBaselineSchema.methods.addAlcoholEvent = function(eventData) {
  this.alcohol_events.push({
    detected_at: eventData.detected_at || new Date(),
    confirmed_by_user: eventData.confirmed_by_user || false,
    severity_level: eventData.severity_level || 'mild',
    duration_minutes: eventData.duration_minutes,
    recovery_time_minutes: eventData.recovery_time_minutes,
    notes: eventData.notes
  });
};

// 학습용 데이터셋 생성 메소드
alcoholBaselineSchema.methods.generateTrainingDataset = function() {
  if (!this.is_training_ready) {
    throw new Error('베이스라인 데이터가 학습 준비 상태가 아닙니다');
  }
  
  const normalData = this.normal_data.slice(-100).map(d => ({
    features: [d.heartRate, d.stressLevel, d.bodyTemperature, d.hrv || 45],
    label: 0, // 정상 (음주 없음)
    timestamp: d.timestamp
  }));
  
  const alcoholData = this.alcohol_events.map(event => ({
    // 실제로는 해당 시점의 생체데이터를 찾아야 함
    features: [], // 음주 시점의 생체데이터
    label: 1, // 음주 상태
    timestamp: event.detected_at,
    metadata: {
      severity: event.severity_level,
      confirmed: event.confirmed_by_user
    }
  }));
  
  return {
    normal: normalData,
    alcohol: alcoholData,
    baseline_stats: {
      hr_mean: this.hr_mean,
      hr_std: this.hr_std,
      stress_mean: this.stress_mean,
      stress_std: this.stress_std,
      temp_mean: this.temp_mean,
      temp_std: this.temp_std
    }
  };
};

module.exports = mongoose.model('AlcoholBaseline', alcoholBaselineSchema);