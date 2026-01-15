const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  // 기본 정보
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    unique: true
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
    address: {
      type: String,
      required: true
    },
    postalCode: String
  },
  
  // 병원 정보
  type: {
    type: String,
    enum: ['general', 'university', 'specialty', 'clinic'],
    default: 'general'
  },
  level: {
    type: String,
    enum: ['tertiary', 'secondary', 'primary']
  },
  
  // 응급실 정보
  emergencyRoom: {
    isAvailable: {
      type: Boolean,
      default: true,
      index: true
    },
    totalBeds: Number,
    availableBeds: Number,
    waitTime: Number, // 분 단위
    lastUpdated: Date
  },
  
  // 이송 가능 여부
  canAcceptTransfer: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // 전문 분야
  specialties: [{
    type: String
  }],
  
  // 연락처
  contact: {
    phone: String,
    emergencyPhone: String,
    fax: String
  },
  
  // 국립중앙의료원 API 데이터
  medicalCenterData: {
    hospitalId: String,
    lastSyncedAt: Date,
    rawData: mongoose.Schema.Types.Mixed
  },
  
  // 운영 시간
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  
  // 상태
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

// 인덱스 설정
hospitalSchema.index({ 'location.lat': 1, 'location.lng': 1 });
hospitalSchema.index({ canAcceptTransfer: 1, 'emergencyRoom.isAvailable': 1, status: 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);
