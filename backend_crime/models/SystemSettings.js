const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // 데이터 전송 주기 (초 단위 또는 문자열)
  transmissionInterval: {
    realtime: { type: String, default: '10초' }, // 권장 (10초), 고성능 (5초), 배터리 절약 (30초)
    healthStats: { type: String, default: '5분' } // 1분, 5분, 10분
  },

  // 위험 감지 임계치
  thresholds: {
    highHeartRate: { type: Number, default: 120 },
    lowHeartRate: { type: Number, default: 45 },
    lowOxygen: { type: Number, default: 90 },
    highTemperature: { type: Number, default: 38.0 },
    fallSensitivity: { type: String, default: '보통 (권장)' } // 높음 (민감), 보통 (권장), 낮음 (둔감)
  },

  // 권한 및 개인정보 기본값
  privacy: {
    locationCollection: { type: Boolean, default: true },
    dataAnalysis: { type: Boolean, default: true },
    autoReport: { type: Boolean, default: true }
  },

  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
