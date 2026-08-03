process.env.JWT_SECRET = 'test-jwt-secret-key-with-32-characters!!';

const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  /**
   * 테스트용 관제 토큰만 허용합니다.
   */
  authRequired: (req, res, next) => {
    const header = String(req.headers.authorization || '');
    if (header === 'Bearer controller-token') {
      req.user = { sub: 'controller-1', role: 'controller' };
      return next();
    }
    return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
  },
}));

jest.mock('../middleware/requireRole', () => ({
  /**
   * 테스트에서는 controller 권한만 허용합니다.
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
  sendVerificationSms: jest.fn(),
}));

jest.mock('../models/Paramedic', () => ({}));
jest.mock('../models/Hospital', () => ({}));

jest.mock('../models/Controller', () => {
  const MockController = jest.fn();
  MockController.findById = jest.fn();
  return MockController;
});

jest.mock('../models/User', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../models/EmergencyCase', () => ({
  find: jest.fn(),
}));

jest.mock('../models/BiometricData', () => ({
  aggregate: jest.fn(),
  findOne: jest.fn(),
}));

const Controller = require('../models/Controller');
const User = require('../models/User');
const EmergencyCase = require('../models/EmergencyCase');
const controllerRouter = require('../api/controllers');

describe('관제 대시보드 인증/권한 테스트', () => {
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
   * 관제사이트 대시보드 핵심 조회는 로그인 없이 접근되면 안 됩니다.
   */
  test('무인증 emergency-cases 조회는 401을 반환한다', async () => {
    const res = await request(app).get('/api/controllers/emergency-cases');
    expect(res.statusCode).toBe(401);
  });

  /**
   * 현재 관제사의 소속 범위에 맞는 회원 케이스만 반환합니다.
   */
  test('관제사 소속 범위 밖 회원 케이스는 emergency-cases에서 제외한다', async () => {
    Controller.findById.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'controller-1',
          role: 'controller',
          affiliation: {
            city: '광주광역시',
            district: '북구',
            dong: '운암동',
          },
          assignedUsers: [],
        }),
      }),
    });

    User.find.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'user-in-range',
            affiliation: { city: '광주광역시', district: '북구', dong: '운암동' },
          },
          {
            _id: 'user-out-range',
            affiliation: { city: '광주광역시', district: '서구', dong: '치평동' },
          },
        ]),
      }),
    });

    EmergencyCase.find.mockReturnValueOnce({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });

    const res = await request(app)
      .get('/api/controllers/emergency-cases')
      .set('Authorization', 'Bearer controller-token');

    expect(res.statusCode).toBe(200);
    expect(EmergencyCase.find).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: { $in: ['user-in-range'] },
      }),
    );
  });
});
