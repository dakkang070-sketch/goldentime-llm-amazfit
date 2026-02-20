const mongoose = require('mongoose');

const biometricDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 수집 시간
  collectedAt: {
    type: Date,
    required: true,
    index: true
  },
  
  // 심박수 (bpm)
  heartRate: {
    type: Number,
    min: 0,
    max: 250
  },
  
  // 가속도 및 움직임 상태
  acceleration: {
    x: Number,
    y: Number,
    z: Number
  },
  movementStatus: {
    type: String,
    enum: ['stationary', 'walking', 'running', 'fall_detected', 'unknown'],
    default: 'unknown'
  },
  
  // 스트레스 지수
  stressLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // 혈압 (수축기/이완기)
  bloodPressure: {
    systolic: {
      type: Number,
      min: 60,
      max: 250
    },
    diastolic: {
      type: Number,
      min: 40,
      max: 150
    }
  },
  
  // 혈당 (mg/dL)
  bloodGlucose: {
    type: Number,
    min: 50,
    max: 400
  },
  
  // 혈중 산소 포화도 (%)
  spO2: {
    type: Number,
    min: 70,
    max: 100
  },
  
  // 체온 (섭씨)
  bodyTemperature: {
    type: Number,
    min: 30,
    max: 45
  },
  
  // 위치 정보
  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    accuracy: Number, // 미터 단위
    altitude: Number,
    timestamp: Date
  },
  
  // 기타 데이터
  steps: Number,
  calories: Number,
  sleepStatus: {
    type: String,
    enum: ['awake', 'light_sleep', 'deep_sleep', 'rem_sleep', 'unknown']
  },
  
  // 분석 결과
  analysis: {
    isAnomaly: {
      type: Boolean,
      default: false
    },
    emergencyLevel: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      default: 1
    },
    analysisResult: String,
    analyzedAt: Date
  },
  
  // 원본 데이터 (디버깅용)
  rawData: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// 인덱스 설정
biometricDataSchema.index({ userId: 1, collectedAt: -1 });
biometricDataSchema.index({ collectedAt: -1 });
biometricDataSchema.index({ 'analysis.emergencyLevel': 1 });

module.exports = mongoose.model('BiometricData', biometricDataSchema);
