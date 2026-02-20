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
    required: false,
    unique: true,
    sparse: true,
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
    required: true
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
    enum: ['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
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
  
  // STARMAX BLE 기기 정보 (응급 사용자앱 전용)
  starmaxDevice: {
    deviceId: String,           // STARMAX BLE 기기 고유 ID
    deviceName: String,         // STARMAX WATCH ULTRA G1 등
    deviceType: {               // 기기 종류 (watch/band)
      type: String,
      enum: ['watch', 'band', 'unknown'],
      default: 'unknown'
    },
    connectedAt: Date,          // BLE 연결 시각
    lastSyncAt: Date,           // 마지막 데이터 동기화 시각
    connectionStatus: {         // 연결 상태
      type: String,
      enum: ['connected', 'disconnected', 'syncing', 'error'],
      default: 'disconnected'
    },
    batteryLevel: Number,       // 배터리 잔량 (0-100)
    firmwareVersion: String     // 펌웨어 버전
  },

  // 응급 사용자앱 전용 플래그
  isEmergencyAppUser: {
    type: Boolean,
    default: true,
    index: true
  },

  // 계정 상태 (활성, 정지, 해지)
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'withdrawn'],
    default: 'active',
    index: true
  },

  // 응급 상활 설정
  emergencySettings: {
    autoReportEnabled: {        // 자동 응급 신고 활성화
      type: Boolean,
      default: true
    },
    emergencyContacts: [{      // 응급 연락처 (최대 3개)
      name: String,
      phone: String,
      relationship: String,
      priority: {               // 1: 주연락처, 2: 보조, 3: 제3
        type: Number,
        min: 1,
        max: 3
      }
    }],
    alertSensitivity: {         // 민감도 (1:낮음, 2:보통, 3:높음)
      type: Number,
      enum: [1, 2, 3],
      default: 2
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
