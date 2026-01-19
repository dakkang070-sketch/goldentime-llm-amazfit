const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // 본인인증 정보 (추후 연동)
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // 기본 정보
  birthDate: {
    type: Date,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  height: {
    type: Number, // cm
    required: true
  },
  weight: {
    type: Number, // kg
    required: true
  },
  bloodType: {
    type: String,
    enum: ['A', 'B', 'AB', 'O'],
    required: true
  },
  
  // 의료 히스토리
  medicalHistory: {
    medications: [{
      name: String,
      dosage: String,
      frequency: String
    }],
    allergies: [{
      substance: String,
      severity: String
    }],
    chronicDiseases: [{
      disease: String,
      diagnosisDate: Date,
      notes: String
    }]
  },
  
  // 비상 연락처
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  
  // 동의 항목
  consents: {
    emergencyAutoReport: {
      type: Boolean,
      default: false
    },
    personalInfoCollection: {
      type: Boolean,
      default: false
    },
    preciseLocation: {
      type: Boolean,
      default: false
    },
    emergencyAlgorithm: {
      type: Boolean,
      default: false
    }
  },
  
  // Amazfit Watch 정보
  watchInfo: {
    deviceId: String,
    deviceName: String,
    syncedAt: Date,
    lastSyncAt: Date,
    isInitialSyncComplete: {
      type: Boolean,
      default: false
    }
  },
  
  // 기초 생체 데이터 (초기 2분 수집 데이터)
  baselineBiometric: {
    heartRate: {
      avg: Number,
      min: Number,
      max: Number,
      collectedAt: Date
    },
    stressLevel: {
      avg: Number,
      min: Number,
      max: Number,
      collectedAt: Date
    },
    movement: {
      avg: Number,
      collectedAt: Date
    }
  },
  
  // 설정
  settings: {
    biometricCollectionInterval: {
      type: Number,
      default: 60 // 초 단위
    },
    enableHeartRate: {
      type: Boolean,
      default: true
    },
    enableAcceleration: {
      type: Boolean,
      default: true
    },
    enableStress: {
      type: Boolean,
      default: true
    },
    enableLocation: {
      type: Boolean,
      default: true
    }
  },
  
  // 병원 입원 모드
  hospitalMode: {
    isActive: {
      type: Boolean,
      default: false
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital'
    },
    enteredAt: Date,
    exitedAt: Date,
    location: {
      lat: Number,
      lng: Number
    }
  },
  
  // 관제사 배정
  assignedController: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Controller'
  },
  
  // 상태
  status: {
    type: String,
    enum: ['active', 'inactive', 'hospitalized', 'suspended'],
    default: 'active'
  },
  
  // 마지막 활동
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 비밀번호 해싱
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 비밀번호 검증 메서드
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
