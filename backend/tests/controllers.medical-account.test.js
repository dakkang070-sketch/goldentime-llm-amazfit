const express = require('express');
const request = require('supertest');

jest.mock('../middleware/rateLimiter', () => ({
  authLimiter: (req, res, next) => next(),
}));

jest.mock('../services/smsService', () => ({
  sendVerificationSms: jest.fn(async () => ({ delivered: true })),
}));

jest.mock('../middleware/auth', () => ({
  authRequired: (req, res, next) => next(),
}));

jest.mock('../middleware/requireRole', () => ({
  requireRole: () => (req, res, next) => next(),
}));

jest.mock('../middleware/cache', () => ({
  cacheMiddleware: () => (req, res, next) => next(),
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

jest.mock('../models/User', () => ({}));
jest.mock('../models/EmergencyCase', () => ({}));
jest.mock('../models/Paramedic', () => ({}));
jest.mock('../models/Hospital', () => ({}));

jest.mock('../models/Controller', () => {
  const MockController = jest.fn();
  MockController.findOne = jest.fn();
  return MockController;
});

const Controller = require('../models/Controller');
const { sendVerificationSms } = require('../services/smsService');
const controllerRouter = require('../api/controllers');

describe('복지사 계정 전용 API 테스트', () => {
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
   * 복지사 이메일 중복확인은 Controller(role=medical) 저장소만 조회해야 합니다.
   */
  test('복지사 이메일 중복확인은 medical 계정만 조회한다', async () => {
    Controller.findOne.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'medical-1' }),
      }),
    });

    const res = await request(app)
      .post('/api/controllers/check-email')
      .send({ email: 'welfare@example.com', role: 'medical' });

    expect(Controller.findOne).toHaveBeenCalledWith({
      email: 'welfare@example.com',
      role: 'medical',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.available).toBe(false);
  });

  /**
   * 복지사 비밀번호 재설정 인증코드는 medical 계정과 전화번호가 일치할 때만 발송합니다.
   */
  test('복지사 비밀번호 재설정 인증코드는 medical 계정 기준으로 발송된다', async () => {
    const save = jest.fn(async () => true);
    Controller.findOne.mockResolvedValueOnce({
      role: 'medical',
      email: 'welfare@example.com',
      phone: '01012345678',
      save,
    });

    const res = await request(app)
      .post('/api/controllers/reset-password/send-code')
      .send({
        email: 'welfare@example.com',
        phone: '010-1234-5678',
      });

    expect(Controller.findOne).toHaveBeenCalledWith({
      role: 'medical',
      email: 'welfare@example.com',
      phone: { $regex: '01012345678' },
    });
    expect(save).toHaveBeenCalled();
    expect(sendVerificationSms).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
