const mongoose = require('mongoose');

/**
 * Zepp 콘솔 앱 등록 후, 사용자별 OAuth/토큰(또는 API Key 기반 자격)을 저장
 * - 실제 필드명/플로우는 Zepp 콘솔/문서 확정 후 조정
 */
const zeppCredentialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // OAuth 계정 식별자(Zepp 측 user/openId 등)
    zeppUserId: { type: String, index: true },

    // 토큰류 (암호화 저장 권장: 추후 KMS/필드 암호화 추가)
    accessToken: { type: String },
    refreshToken: { type: String },
    tokenType: { type: String },
    scope: { type: String },
    expiresAt: { type: Date },

    // 상태
    status: {
      type: String,
      enum: ['connected', 'revoked', 'error'],
      default: 'connected',
      index: true,
    },

    lastError: { type: String },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ZeppCredential', zeppCredentialSchema);

