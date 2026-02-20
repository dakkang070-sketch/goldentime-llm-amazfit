const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const paramedicSchema = new mongoose.Schema({
  // 기본 정보
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  
  // 자격 정보
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  certificationDate: Date,
  expirationDate: Date,
  
  // 현재 상태
  status: {
    type: String,
    enum: ['available', 'on_duty', 'off_duty', 'in_transit', 'handling_case'],
    default: 'off_duty',
    index: true
  },
  
  // 현재 위치
  currentLocation: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    address: String
  },
  
  // 현재 처리 중인 케이스
  currentCase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyCase'
  },
  
  // 대기 중인 케이스 (거부된 케이스는 제외)
  pendingCases: [{
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyCase'
    },
    receivedAt: Date,
    distance: Number
  }],
  
  // 통계
  stats: {
    totalCases: {
      type: Number,
      default: 0
    },
    completedCases: {
      type: Number,
      default: 0
    },
    averageResponseTime: Number, // 초 단위
    averageTransportTime: Number // 초 단위
  },
  
  // 마지막 활동
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // 알림 설정
  notificationSettings: {
    enablePush: {
      type: Boolean,
      default: true
    },
    enableSound: {
      type: Boolean,
      default: true
    },
    maxDistance: {
      type: Number,
      default: 10000 // 미터, 기본 10km
    }
  }
}, {
  timestamps: true
});

paramedicSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

paramedicSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 인덱스 설정
paramedicSchema.index({ status: 1, 'currentLocation.lat': 1, 'currentLocation.lng': 1 });
paramedicSchema.index({ 'currentLocation.lat': 1, 'currentLocation.lng': 1 });

module.exports = mongoose.model('Paramedic', paramedicSchema);
