process.env.JWT_SECRET = 'test-jwt-secret-key-with-32-characters!!';

const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  /**
   * 테스트용 보호자 토큰을 읽어 최소 payload를 주입합니다.
   */
  authenticateToken: (req, res, next) => {
    const header = String(req.headers.authorization || '');
    if (header === 'Bearer guardian-token') {
      req.user = { sub: 'user-1', role: 'guardian' };
      return next();
    }
    return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
  },
}));

jest.mock('../middleware/rateLimiter', () => ({
  authLimiter: (req, res, next) => next(),
}));

jest.mock('../services/jwtService', () => ({
  signUserToken: jest.fn(() => 'signed-user-token'),
}));

jest.mock('../services/matchingService', () => ({
  autoMatchParamedicForCase: jest.fn(),
}));

jest.mock('../services/analyzerService', () => ({
  analyzeBiometricAndMaybeOpenCase: jest.fn(),
}));

jest.mock('../services/emergencyCaseSnapshotService', () => ({
  buildEmergencyCaseBiometricSnapshot: jest.fn(),
}));

jest.mock('../services/ollamaService', () => ({
  generateNonDiagnosticSummary: jest.fn(),
}));

jest.mock('../services/socketService', () => ({
  emitEmergencyCaseCreated: jest.fn(),
  emitCaseStatusUpdated: jest.fn(),
  emitBiometricDataUpdated: jest.fn(),
}));

jest.mock('../services/notificationService', () => ({
  sendSMS: jest.fn(async () => true),
}));

jest.mock('../models/BiometricData', () => ({}));
jest.mock('../models/EmergencyCase', () => ({}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));

const User = require('../models/User');
const { sendSMS } = require('../services/notificationService');
const mobileRouter = require('../api/mobile');

/**
 * 보호자 전용 라우트 테스트에 사용할 기본 회원 문서를 생성합니다.
 */
function createGuardianOwner(overrides = {}) {
  return {
    _id: 'user-1',
    isEmergencyAppUser: true,
    accountStatus: 'active',
    status: 'active',
    emergencyContact: {
      name: '기존 보호자',
      relationship: '자녀',
      phone: '01011112222',
    },
    emergencySettings: {
      guardianAccess: {
        verifiedGuardianPhone: '01011112222',
      },
    },
    save: jest.fn(async function saveUser() {
      return this;
    }),
    ...overrides,
  };
}

describe('보호자 정보 수정 휴대폰 인증 테스트', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/mobile', mobileRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 보호자는 새 전화번호 인증을 완료해야만 자신의 보호자 연락처를 저장할 수 있습니다.
   */
  test('보호자 정보 수정은 발송-확인-저장 순서로 전화번호를 변경한다', async () => {
    User.find.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue([]),
    });

    const sendRes = await request(app)
      .post('/api/mobile/guardian/profile/phone-verification/request')
      .set('Authorization', 'Bearer guardian-token')
      .send({ phone: '010-9999-8888' });

    expect(sendRes.statusCode).toBe(200);
    expect(sendSMS).toHaveBeenCalledWith('01099998888', expect.stringContaining('인증번호'));

    const sentMessage = sendSMS.mock.calls[0][1];
    const sentCode = String(sentMessage).match(/\[(\d{6})\]/)?.[1];
    expect(sentCode).toBeTruthy();

    const verifyRes = await request(app)
      .post('/api/mobile/guardian/profile/phone-verification/verify')
      .set('Authorization', 'Bearer guardian-token')
      .send({ phone: '010-9999-8888', code: sentCode });

    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body.verificationToken).toBeTruthy();

    const ownerDoc = createGuardianOwner();
    User.findById.mockResolvedValueOnce(ownerDoc);

    const saveRes = await request(app)
      .put('/api/mobile/guardian/profile')
      .set('Authorization', 'Bearer guardian-token')
      .send({
        name: '새 보호자',
        relationship: '배우자',
        phone: '010-9999-8888',
        phoneVerificationToken: verifyRes.body.verificationToken,
      });

    expect(saveRes.statusCode).toBe(200);
    expect(ownerDoc.emergencyContact.name).toBe('새 보호자');
    expect(ownerDoc.emergencyContact.relationship).toBe('배우자');
    expect(ownerDoc.emergencyContact.phone).toBe('01099998888');
    expect(ownerDoc.emergencySettings.guardianAccess.verifiedGuardianPhone).toBe('01099998888');
    expect(ownerDoc.save).toHaveBeenCalled();
  });
});
