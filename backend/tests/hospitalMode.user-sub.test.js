const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  /**
   * 테스트용 회원 토큰을 읽어 sub 기반 payload를 주입합니다.
   */
  authRequired: (req, res, next) => {
    const header = String(req.headers.authorization || '');
    if (header === 'Bearer user-token') {
      req.user = { sub: 'user-1', role: 'user' };
      return next();
    }
    return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
  },
}));

jest.mock('../models/Hospital', () => ({
  findById: jest.fn(),
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
}));

const User = require('../models/User');
const Hospital = require('../models/Hospital');
const hospitalModeRouter = require('../api/hospitalMode');

/**
 * `.select().populate()` 체인만 필요한 상태 조회 쿼리를 단순 모킹합니다.
 */
function mockStatusQuery(doc) {
  return {
    select: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(doc),
    }),
  };
}

describe('입원 모드 회원 식별자 테스트', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/hospital-mode', hospitalModeRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 회원 JWT가 sub만 가지더라도 입원 모드 상태 조회가 정상 동작하는지 검증합니다.
   */
  test('회원 토큰의 sub로 입원 모드 상태를 조회할 수 있다', async () => {
    User.findById.mockReturnValueOnce(
      mockStatusQuery({
        _id: 'user-1',
        status: 'hospitalized',
        hospitalMode: {
          isActive: true,
          hospitalId: {
            _id: 'hospital-1',
            name: '골든타임병원',
          },
        },
      }),
    );

    const res = await request(app)
      .get('/api/hospital-mode/status')
      .set('Authorization', 'Bearer user-token');

    expect(User.findById).toHaveBeenCalledWith('user-1');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('hospitalized');
    expect(res.body.hospitalMode.isActive).toBe(true);
  });
});
