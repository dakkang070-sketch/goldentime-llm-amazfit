const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  decryptStructuredValue,
  encryptStructuredValue,
} = require('../utils/personalDataCrypto');

const SENSITIVE_USER_PATHS = [
  'name',
  'medicalHistory',
  'emergencyContact',
  'affiliation',
  'emergencySettings.emergencyContacts',
];

/**
 * 지정된 사용자 문서 경로에 재귀 변환 함수를 적용합니다.
 */
function transformSensitivePaths(doc, transformer) {
  if (!doc) {
    return;
  }

  SENSITIVE_USER_PATHS.forEach((path) => {
    const currentValue = doc.get(path);
    if (currentValue === undefined || currentValue === null) {
      return;
    }
    doc.set(path, transformer(currentValue));
  });
}

/**
 * 응급 사용자앱 계정, 보호자/의료 정보, 워치 연동 상태를 함께 저장하는 사용자 스키마입니다.
 */
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
  gender: {
    type: String,
    enum: ['male', 'female'],
    default: 'male'
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

  // 지역 소속 및 담당 복지사
  affiliation: {
    city: {
      type: String,
      trim: true,
      default: ''
    },
    district: {
      type: String,
      trim: true,
      default: ''
    },
    dong: {
      type: String,
      trim: true,
      default: ''
    },
    welfareName: {
      type: String,
      trim: true,
      default: ''
    }
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
  
  // 웨어러블(워치) 기기 정보 (응급 사용자앱 전용)
  wearableDevice: {
    deviceId: String,           // BLE 기기 고유 ID
    deviceName: String,         // 워치 모델명
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
    manualBloodPressure: {      // 앱 수동 입력 혈압(표시용)
      systolic: Number,
      diastolic: Number,
      updatedAt: Date
    },
    batteryLevel: Number,       // 배터리 잔량 (0-100)
    firmwareVersion: String,    // 펌웨어 버전
    lastKnownLocation: {        // 폰(위치서비스) 기반 보조 위치
      lat: Number,
      lng: Number,
      accuracyM: Number,
      provider: String,
      source: {
        type: String,
        enum: [
          'watch',
          'phone',
          'phone_gps',
          'wifi_position',
          'cell_position',
          'mobile_app',
          'phone_fallback',
          'recent_cache',
          'last_biometric',
          'unavailable',
          'unknown',
        ],
        default: 'unknown'
      },
      updatedAt: Date
    }
  },

  // 응급 사용자앱 전용 플래그
  isEmergencyAppUser: {
    type: Boolean,
    default: true,
    index: true
  },

  // 계정 상태 (승인 대기, 활성, 정지, 해지, 반려)
  accountStatus: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'withdrawn', 'rejected'],
    default: 'pending',
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
    },
    guardianAccess: {
      code: String,
      codeIssuedAt: Date,
      codeExpiresAt: Date,
      verifiedAt: Date,
      verifiedGuardianPhone: String,
      guardianEmail: {
        type: String,
        trim: true,
        lowercase: true
      },
      guardianPasswordHash: String,
      guardianPasswordResetCode: String,
      guardianPasswordResetCodeExpiresAt: Date,
      guardianRegisteredAt: Date,
      guardianLastLoginAt: Date
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
    // 워치/모바일 수집 주기와 센서 on/off 기본값을 사용자별로 저장합니다.
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
    // 입원 중에는 일반 관제 흐름과 구분하기 위해 병원 체류 상태를 별도 보관합니다.
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
    // 현재 담당 중인 관제사를 사용자 문서에 직접 연결해 빠른 조회에 사용합니다.
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
  },
  
  // 비밀번호 재설정 SMS 인증코드
  passwordResetCode: {
    type: String,
    default: null
  },
  passwordResetCodeExpiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

/**
 * 비밀번호가 변경된 저장 시점에만 해시를 다시 생성합니다.
 */
userSchema.pre('save', async function(next) {
  // 기존 해시를 반복 변환하지 않도록 password 변경 시에만 bcrypt를 적용합니다.
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  if (
    this.isNew ||
    SENSITIVE_USER_PATHS.some((path) => this.isModified(path))
  ) {
    transformSensitivePaths(this, encryptStructuredValue);
  }

  next();
});

/**
 * MongoDB에서 읽은 직후 민감 필드를 앱에서 사용할 수 있는 복호화 상태로 복원합니다.
 */
userSchema.post('init', function(doc) {
  transformSensitivePaths(doc, decryptStructuredValue);
});

/**
 * 저장 직후에도 현재 문서 인스턴스는 복호화 상태를 유지해 후속 응답 구성 시 평문 접근을 보장합니다.
 */
userSchema.post('save', function(doc) {
  transformSensitivePaths(doc, decryptStructuredValue);
});

/**
 * 로그인 시 입력 비밀번호와 저장된 해시를 비교합니다.
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  // 인증 흐름에서는 원문 비밀번호를 저장하지 않고 비교 결과만 반환합니다.
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * 응급 사용자 계정 모델을 Mongoose 컬렉션으로 등록해 외부에 제공합니다.
 */
module.exports = mongoose.model('User', userSchema);
