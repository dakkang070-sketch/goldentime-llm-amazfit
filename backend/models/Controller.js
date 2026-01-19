const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
  
  // 권한
  role: {
    type: String,
    enum: ['controller', 'supervisor', 'admin'],
    default: 'controller'
  },
  
  // 배정된 회원 수
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 최대 관리 가능 회원 수
  maxUsers: {
    type: Number,
    default: 50
  },
  
  // 현재 모니터링 중인 응급 상황
  activeCases: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyCase'
  }],
  
  // 상태
  status: {
    type: String,
    enum: ['online', 'offline', 'busy'],
    default: 'offline',
    index: true
  },
  
  // 마지막 활동
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

controllerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

controllerSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 인덱스 설정
controllerSchema.index({ status: 1 });
controllerSchema.index({ 'assignedUsers': 1 });

module.exports = mongoose.model('Controller', controllerSchema);
