process.env.JWT_SECRET = 'test-jwt-secret-key-with-32-characters!!';

const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  /**
   * 테스트용 관리자 토큰을 읽어 최소 payload를 주입합니다.
   */
  authRequired: (req, res, next) => {
    const header = String(req.headers.authorization || '');
    if (header === 'Bearer admin-token') {
      req.user = { sub: 'admin-1', role: 'admin' };
      return next();
    }
    return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
  },
}));

jest.mock('../middleware/requireRole', () => ({
  /**
   * 테스트에서는 관리자 권한 여부만 단순 검사합니다.
   */
  requireRole: (role) => (req, res, next) => {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    return next();
  },
}));

jest.mock('../middleware/rateLimiter', () => ({
  /**
   * 테스트에서는 속도 제한을 우회합니다.
   */
  authLimiter: (req, res, next) => next(),
}));

jest.mock('../services/jwtService', () => ({
  /**
   * 관리자 승인 테스트에서는 JWT 발급을 사용하지 않습니다.
   */
  signUserToken: jest.fn(),
}));

jest.mock('../services/controllerAssignmentService', () => ({
  /**
   * 회원 정보수정 승인 테스트에서는 관제 배정을 호출하지 않습니다.
   */
  assignUserToController: jest.fn(),
}));

jest.mock('../services/notificationService', () => ({
  /**
   * 회원 정보수정 승인 테스트에서는 SMS 발송을 호출하지 않습니다.
   */
  sendSMS: jest.fn(),
}));

jest.mock('../models/BiometricData', () => ({}));
jest.mock('../models/EmergencyCase', () => ({}));

jest.mock('../models/User', () => {
  const MockUser = jest.fn();
  MockUser.find = jest.fn();
  MockUser.findOne = jest.fn();
  MockUser.findById = jest.fn();
  MockUser.findByIdAndUpdate = jest.fn();
  return MockUser;
});

const User = require('../models/User');
const usersRouter = require('../api/users');

/**
 * `.select().sort().lean()` 체인이 필요한 목록 조회 쿼리를 간단히 모킹합니다.
 */
function mockListQuery(rows) {
  return {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(rows),
  };
}

/**
 * `.select()` 체인이 필요한 단건 조회 쿼리를 간단히 모킹합니다.
 */
function mockSelectable(doc) {
  return {
    select: jest.fn().mockResolvedValue(doc),
  };
}

/**
 * 회원 정보수정 승인 테스트에서 공통으로 사용할 사용자 문서 모킹입니다.
 */
function createMockUser(overrides = {}) {
  return {
    _id: 'user-1',
    name: '김회원',
    email: 'member@example.com',
    phone: '01012345678',
    birthDate: new Date('1990-01-02T00:00:00.000Z'),
    age: 35,
    gender: 'male',
    height: 175,
    weight: 70,
    bloodType: 'A+',
    affiliation: {
      city: '서울특별시',
      district: '강남구',
      dong: '역삼동',
      welfareName: '강남복지센터',
    },
    medicalHistory: {
      medications: [{ name: '혈압약' }],
      allergies: [{ substance: '갑각류' }],
      chronicDiseases: [{ disease: '고혈압' }],
    },
    emergencyContact: {
      name: '보호자',
      phone: '01099998888',
      relationship: '딸',
    },
    emergencySettings: {
      emergencyContacts: [],
      guardianAccess: {},
    },
    wearableDevice: {
      deviceId: 'AA:BB:CC:DD:EE:11',
      deviceName: 'T-Rex 3',
    },
    pendingProfileChange: {
      name: '김회원수정',
      email: 'member-updated@example.com',
      phone: '01077776666',
      birthDate: new Date('1991-05-10T00:00:00.000Z'),
      age: 34,
      gender: 'female',
      height: 166,
      weight: 58,
      bloodType: 'B+',
      affiliation: {
        city: '광주광역시',
        district: '북구',
        dong: '중흥동',
        welfareName: '빛고을복지관',
      },
      medicalHistory: {
        medications: [{ name: '당뇨약' }],
        allergies: [{ substance: '견과류' }],
        chronicDiseases: [{ disease: '당뇨' }],
      },
      emergencyContact: {
        name: '새보호자',
        phone: '01055554444',
        relationship: '아들',
      },
      emergencyContacts: [
        {
          name: '새보호자',
          phone: '01055554444',
          relationship: '아들',
          priority: 1,
        },
      ],
      requestedAt: new Date('2026-08-03T10:00:00.000Z'),
    },
    save: jest.fn(async function save() {
      return this;
    }),
    ...overrides,
  };
}

describe('회원 정보수정 승인 관리 테스트', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/users', usersRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 관리자 승인 화면이 회원 정보수정 요청 목록을 정상적으로 반환하는지 검증합니다.
   */
  test('관리자는 회원 정보수정 승인 대기 목록을 조회할 수 있다', async () => {
    User.find.mockReturnValueOnce(
      mockListQuery([createMockUser()]),
    );

    const res = await request(app)
      .get('/api/users/pending-profile-approvals')
      .set('Authorization', 'Bearer admin-token');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].requestedProfile.phone).toBe('01077776666');
    expect(res.body.data[0].wearableDevice.deviceId).toBe('AA:BB:CC:DD:EE:11');
  });

  /**
   * 관리자 승인 시 대기 중인 회원 정보수정 요청이 실제 프로필에 반영되는지 검증합니다.
   */
  test('관리자는 회원 정보수정 요청 승인 시 실제 회원 프로필에 반영한다', async () => {
    const user = createMockUser();
    User.findById.mockResolvedValueOnce(user);
    User.findOne
      .mockReturnValueOnce(mockSelectable(null))
      .mockReturnValueOnce(mockSelectable(null));

    const res = await request(app)
      .patch('/api/users/user-1/profile-approval')
      .set('Authorization', 'Bearer admin-token')
      .send({ decision: 'approved' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('회원 정보수정 요청이 승인되었습니다.');
    expect(user.name).toBe('김회원수정');
    expect(user.email).toBe('member-updated@example.com');
    expect(user.phone).toBe('01077776666');
    expect(user.affiliation.city).toBe('광주광역시');
    expect(user.emergencySettings.emergencyContacts[0].phone).toBe('01055554444');
    expect(user.emergencySettings.guardianAccess).toEqual({});
    expect(user.pendingProfileChange).toBeUndefined();
    expect(user.save).toHaveBeenCalled();
  });
});
