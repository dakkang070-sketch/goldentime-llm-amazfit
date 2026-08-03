process.env.JWT_SECRET = 'test-jwt-secret-key-with-32-characters!!';

const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  /**
   * 테스트용 관제사 토큰을 읽어 최소 payload를 주입합니다.
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
   * 테스트에서는 요청 role이 기대 role과 일치하는지만 단순 검사합니다.
   */
  requireRole: (role) => (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    return next();
  },
}));

jest.mock('../middleware/cache', () => ({
  /**
   * 테스트에서는 캐시 미들웨어를 우회합니다.
   */
  cacheMiddleware: () => (req, res, next) => next(),
}));

jest.mock('../services/matchingService', () => ({
  /**
   * 관제사 목록 테스트에서는 자동 매칭을 사용하지 않습니다.
   */
  autoMatchParamedicForCase: jest.fn(),
}));

jest.mock('../services/hospitalService', () => ({
  /**
   * 관제사 목록 테스트에서는 병원 자동 매칭을 사용하지 않습니다.
   */
  autoMatchHospitalForCase: jest.fn(),
}));

jest.mock('../services/socketService', () => ({
  /**
   * 테스트에서는 소켓 전파를 사용하지 않습니다.
   */
  emitParamedicMatched: jest.fn(),
  emitHospitalMatched: jest.fn(),
}));

jest.mock('../services/smsService', () => ({
  /**
   * 테스트에서는 문자 발송을 사용하지 않습니다.
   */
  sendVerificationSms: jest.fn(),
}));

jest.mock('../models/User', () => ({}));
jest.mock('../models/EmergencyCase', () => ({}));
jest.mock('../models/Paramedic', () => ({}));
jest.mock('../models/Hospital', () => ({}));

jest.mock('../models/Controller', () => {
  const MockController = jest.fn();
  MockController.findById = jest.fn();
  return MockController;
});

const Controller = require('../models/Controller');
const controllerRouter = require('../api/controllers');

/**
 * `.populate()` 체인만 필요한 관제사 조회 쿼리를 단순 모킹합니다.
 */
function mockControllerQuery(doc) {
  return {
    populate: jest.fn().mockResolvedValue(doc),
  };
}

describe('관제사 배정 회원 조회 테스트', () => {
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
   * 관제 JWT가 sub만 넣는 현재 구조에서도 배정 회원 조회가 성공하는지 검증합니다.
   */
  test('관제사 토큰의 sub로 /me/users 조회가 가능하다', async () => {
    Controller.findById.mockReturnValueOnce(
      mockControllerQuery({
        _id: 'controller-1',
        assignedUsers: [
          { _id: 'user-1', name: '김회원', phone: '01012345678', status: '정상' },
        ],
      }),
    );

    const res = await request(app)
      .get('/api/controllers/me/users')
      .set('Authorization', 'Bearer controller-token');

    expect(Controller.findById).toHaveBeenCalledWith('controller-1');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users[0].name).toBe('김회원');
  });
});
