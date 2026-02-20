const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true, // '낙상 감지', '심박 이상', 'SOS 호출', '미활동', '안심존 이탈' 등
    index: true
  },
  severity: {
    type: String,
    enum: ['위험', '주의', '정보'],
    default: '주의'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  aiAnalysis: {
    type: String, // Gemini 분석 내용
    default: ''
  },
  aiConfidence: {
    type: Number, // 분석 신뢰도 (0~100)
    default: 0
  },
  status: {
    type: String,
    enum: ['발생', '확인 중', '조치 완료', '오작동'],
    default: '발생'
  },
  biometricsSnapshot: {
    heartRate: Number,
    bloodPressure: String,
    bloodOxygen: Number,
    temperature: Number,
    stress: Number,
    ecg: String
  },
  deviceInfo: {
    modelName: String,
    batteryLevel: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('Alert', AlertSchema);
