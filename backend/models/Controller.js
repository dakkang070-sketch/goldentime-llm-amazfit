const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DEFAULT_ADMIN_MENU_PERMISSIONS = ['controllers', 'welfare', 'members', 'guardians', 'history', 'settings', 'admins'];

/**
 * 관제센터 운영자 계정과 담당 사용자/응급 케이스를 저장하는 관제사 스키마입니다.
 */
const controllerSchema = new mongoose.Schema({
  // 기본 정보
  name: {
    type: String,
    required: true
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
  phone: String,
  passwordResetCode: String,
  passwordResetCodeExpiresAt: Date,

  // 소속 지역 권한
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
    }
  },

  // 복지사 소속 변경 승인 대기
  pendingAffiliationChange: {
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
    requestedAt: {
      type: Date,
      default: null
    }
  },
  
  // 권한
  role: {
    type: String,
    enum: ['controller', 'supervisor', 'admin', 'medical'],
    default: 'controller'
  },

  menuPermissions: [{
    type: String,
    enum: DEFAULT_ADMIN_MENU_PERMISSIONS,
  }],

  // 계정 승인 상태
  accountStatus: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'withdrawn', 'rejected'],
    default: 'pending',
    index: true
  },
  
  // 현재 담당 중인 사용자 목록
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 한 관제사가 동시에 담당할 수 있는 최대 사용자 수
  maxUsers: {
    type: Number,
    default: 50
  },
  
  // 현재 모니터링/처리 중인 응급 케이스 목록
  activeCases: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyCase'
  }],
  
  // 상태
  status: {
    // 온라인/오프라인/업무과부하 상태를 기준으로 배정 가능 여부를 판별합니다.
    type: String,
    enum: ['online', 'offline', 'busy'],
    default: 'offline',
    index: true
  },
  
  // 마지막 활동
  lastActivity: {
    // 최근 활동 시각은 무응답 관제사 감지와 화면 표시용으로 재사용합니다.
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

/**
 * 관제사 비밀번호가 변경된 경우 저장 전에 해시를 갱신합니다.
 */
controllerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/**
 * 로그인 시 입력 비밀번호와 저장된 해시를 비교합니다.
 */
controllerSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * 온라인 상태와 담당 사용자 기준 조회를 빠르게 하기 위한 인덱스입니다.
 */
controllerSchema.index({ status: 1 });
controllerSchema.index({ accountStatus: 1 });
controllerSchema.index({ 'assignedUsers': 1 });

/**
 * 관리자 계정은 기본적으로 전체 백오피스 메뉴 권한을 갖도록 저장 전 보정합니다.
 */
controllerSchema.pre('save', function (next) {
  if (this.role === 'admin') {
    this.menuPermissions = Array.isArray(this.menuPermissions) && this.menuPermissions.length > 0
      ? this.menuPermissions
      : DEFAULT_ADMIN_MENU_PERMISSIONS;
  } else {
    this.menuPermissions = [];
  }
  next();
});

/**
 * 관제사 계정 컬렉션에 연결되는 Controller 모델을 export 합니다.
 */
module.exports = mongoose.model('Controller', controllerSchema);
