process.env.JWT_SECRET = 'test-jwt-secret-key-with-32-characters!!';

const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  /**
   * 테스트용 운영자 토큰을 읽어 최소 payload를 주입합니다.
   */
  authRequired: (req, res, next) => {
    const header = String(req.headers.authorization || '');
    if (header === 'Bearer medical-token') {
      req.user = { sub: 'medical-1', role: 'medical' };
      return next();
    }
    if (header === 'Bearer admin-token') {
      req.user = { sub: 'admin-1', role: 'admin' };
      return next();
    }
    return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
  },
}));

jest.mock('../middleware/requireRole', () => ({
  /**
   * 테스트에서는 요청 role이 기대 role과 일치하는지만 검사합니다.
   */
  requireRole: (role) => (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    return next();
  },
}));

jest.mock('../middleware/cache', () => ({
  cacheMiddleware: () => (req, res, next) => next(),
}));

jest.mock('../middleware/rateLimiter', () => ({
  authLimiter: (req, res, next) => next(),
}));

jest.mock('../services/matchingService', () => ({
  autoMatchParamedicForCase: jest.fn(),
}));

jest.mock('../services/hospitalService', () => ({
  autoMatchHospitalForCase: jest.fn(),
}));

jest.mock('../services/socketService', () => ({
  emitParamedicMatched: jest.fn(),
  emitHospitalMatched: jest.fn(),
}));

jest.mock('../services/smsService', () => ({
  sendVerificationSms: jest.fn(async () => ({ delivered: true })),
}));

jest.mock('../models/User', () => ({}));
jest.mock('../models/EmergencyCase', () => ({}));
jest.mock('../models/Paramedic', () => ({}));
jest.mock('../models/Hospital', () => ({}));

jest.mock('../models/Controller', () => {
  const MockController = jest.fn();
  MockController.findById = jest.fn();
  MockController.findOne = jest.fn();
  return MockController;
});

const Controller = require('../models/Controller');
const { sendVerificationSms } = require('../services/smsService');
const controllerRouter = require('../api/controllers');

describe('운영자 자기 휴대폰 인증 테스트', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/controllers', controllerRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 복지사 본인은 새 전화번호 인증을 완료해야만 자기 계정 번호를 저장할 수 있습니다.
   */
  test('복지사는 본인 번호 변경 시 발송-확인-저장 순서로 완료한다', async () => {
    const save = jest.fn(async function saveController() {
      return this;
    });
    const controllerDoc = {
      _id: 'medical-1',
      role: 'medical',
      email: 'welfare@example.com',
      phone: '010-1111-2222',
      affiliation: {
        city: '서울특별시',
        district: '영등포구',
        dong: '여의동',
      },
      menuPermissions: [],
      save,
    };

    const sendRes = await request(app)
      .post('/api/controllers/me/phone-verification/request')
      .set('Authorization', 'Bearer medical-token')
      .send({ phone: '010-9999-8888' });

    expect(sendRes.statusCode).toBe(200);
    expect(sendVerificationSms).toHaveBeenCalledWith('01099998888', expect.any(String));

    const sentCode = sendVerificationSms.mock.calls[0][1];
    const verifyRes = await request(app)
      .post('/api/controllers/me/phone-verification/verify')
      .set('Authorization', 'Bearer medical-token')
      .send({ phone: '010-9999-8888', code: sentCode });

    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body.verificationToken).toBeTruthy();

    Controller.findById.mockResolvedValueOnce(controllerDoc);
    Controller.findOne.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    const patchRes = await request(app)
      .patch('/api/controllers/medical-1')
      .set('Authorization', 'Bearer medical-token')
      .send({
        email: 'welfare@example.com',
        phone: '010-9999-8888',
        role: 'medical',
        affiliation: {
          city: '서울특별시',
          district: '영등포구',
          dong: '여의동',
        },
        phoneVerificationToken: verifyRes.body.verificationToken,
      });

    expect(patchRes.statusCode).toBe(200);
    expect(controllerDoc.phone).toBe('010-9999-8888');
    expect(save).toHaveBeenCalled();
  });
});
