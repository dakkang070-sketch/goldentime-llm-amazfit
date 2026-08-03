process.env.JWT_SECRET = 'test-jwt-secret-key-with-32-characters!!';

const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  /**
   * 테스트용 Authorization 헤더를 읽어 회원/보호자 토큰을 간단히 주입합니다.
   */
  authenticateToken: (req, res, next) => {
    const header = String(req.headers.authorization || '');
    if (header === 'Bearer user-token') {
      req.user = { sub: 'user-1', role: 'user' };
      return next();
    }
    if (header === 'Bearer guardian-token') {
      req.user = { sub: 'user-1', role: 'guardian' };
      return next();
    }
    return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
  },
}));

jest.mock('../middleware/rateLimiter', () => ({
  /**
   * 테스트에서는 속도 제한 대신 즉시 다음 핸들러로 넘깁니다.
   */
  authLimiter: (req, res, next) => next(),
}));

jest.mock('../services/jwtService', () => ({
  /**
   * 테스트에서는 고정 사용자 토큰을 반환합니다.
   */
  signUserToken: jest.fn(() => 'signed-user-token'),
  signGuardianToken: jest.fn(() => 'signed-guardian-token'),
}));

jest.mock('../services/matchingService', () => ({
  /**
   * 회원관리 테스트에서는 구조사 자동 매칭을 비활성화합니다.
   */
  autoMatchParamedicForCase: jest.fn(),
}));

jest.mock('../services/analyzerService', () => ({
  /**
   * 회원관리 테스트에서는 생체 분석 엔진을 호출하지 않습니다.
   */
  analyzeBiometricAndMaybeOpenCase: jest.fn(),
}));

jest.mock('../services/emergencyCaseSnapshotService', () => ({
  /**
   * 회원관리 테스트에서는 응급 스냅샷 생성을 비활성화합니다.
   */
  buildEmergencyCaseBiometricSnapshot: jest.fn(),
}));

jest.mock('../services/ollamaService', () => ({
  /**
   * 회원관리 테스트에서는 AI 요약 호출을 비활성화합니다.
   */
  generateNonDiagnosticSummary: jest.fn(),
}));

jest.mock('../services/socketService', () => ({
  /**
   * 회원관리 테스트에서는 소켓 방송을 모킹 처리합니다.
   */
  emitEmergencyCaseCreated: jest.fn(),
  emitCaseStatusUpdated: jest.fn(),
  emitBiometricDataUpdated: jest.fn(),
}));

jest.mock('../models/BiometricData', () => ({}));
jest.mock('../models/EmergencyCase', () => ({}));
jest.mock('../utils/logger', () => ({
  /**
   * 테스트 출력 노이즈를 줄이기 위해 로거를 no-op으로 대체합니다.
   */
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../models/User', () => {
  const MockUser = jest.fn(function MockUser(data = {}) {
    Object.assign(this, data);
    this.save = jest.fn(async () => this);
    this.comparePassword = jest.fn(async (password) => password === 'secret123!');
  });

  MockUser.findOne = jest.fn();
  MockUser.findById = jest.fn();
  MockUser.exists = jest.fn();

  return MockUser;
});

const User = require('../models/User');
const BiometricData = require('../models/BiometricData');
const EmergencyCase = require('../models/EmergencyCase');
const mobileRouter = require('../api/mobile');

/**
 * 회원 문서 모킹에 공통으로 사용할 기본 구조를 생성합니다.
 */
function createMockUser(overrides = {}) {
  return {
    _id: 'user-1',
    name: '김골든',
    email: 'member@example.com',
    phone: '01012345678',
    password: 'hashed-password',
    birthDate: new Date('1990-01-02T00:00:00.000Z'),
    age: 35,
    gender: 'male',
    height: 175,
    weight: 70,
    bloodType: 'A',
    medicalHistory: {
      chronicDiseases: [{ disease: '고혈압' }],
      medications: [{ name: '혈압약' }],
      allergies: [{ substance: '갑각류' }],
    },
    emergencyContact: {
      name: '보호자',
      phone: '01098765432',
      relationship: '배우자',
    },
    emergencySettings: {
      emergencyContacts: [],
      autoReportEnabled: true,
      alertSensitivity: 2,
      guardianAccess: {},
    },
    affiliation: {
      city: '서울특별시',
      district: '강남구',
      dong: '역삼동',
      welfareName: '강남복지센터',
    },
    consents: {
      emergencyAutoReport: true,
      personalInfoCollection: true,
      preciseLocation: true,
      emergencyAlgorithm: true,
    },
    wearableDevice: null,
    isEmergencyAppUser: true,
    accountStatus: 'active',
    status: 'active',
    lastActivity: new Date('2026-07-30T00:00:00.000Z'),
    comparePassword: jest.fn(async (password) => password === 'secret123!'),
    save: jest.fn(async function save() {
      return this;
    }),
    ...overrides,
  };
}

/**
 * `.select()` 체인이 필요한 쿼리를 간단히 모킹합니다.
 */
function mockSelectable(doc) {
  return {
    select: jest.fn().mockResolvedValue(doc),
  };
}

describe('모바일 회원관리 통합 테스트', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/mobile', mobileRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    BiometricData.find = jest.fn();
    EmergencyCase.find = jest.fn();
  });

  /**
   * 승인 전 계정은 로그인 자체를 차단하는지 확인합니다.
   */
  test('승인 대기 계정 로그인은 403과 안내 메시지를 반환한다', async () => {
    const pendingUser = createMockUser({
      accountStatus: 'pending',
      comparePassword: jest.fn(async () => true),
    });
    User.findOne.mockResolvedValueOnce(pendingUser);

    const res = await request(app).post('/api/mobile/login').send({
      email: 'member@example.com',
      password: 'secret123!',
    });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('어드민 승인 대기 중입니다.');
  });

  /**
   * 활성 계정 로그인 시 회원앱이 즉시 필요한 핵심 프로필 필드를 함께 받는지 확인합니다.
   */
  test('활성 계정 로그인은 토큰과 확장 프로필 정보를 반환한다', async () => {
    const activeUser = createMockUser({
      comparePassword: jest.fn(async () => true),
    });
    User.findOne.mockResolvedValueOnce(activeUser);

    const res = await request(app).post('/api/mobile/login').send({
      email: 'member@example.com',
      password: 'secret123!',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('signed-user-token');
    expect(res.body.data.user.gender).toBe('male');
    expect(res.body.data.user.birthDate).toBe('1990-01-02T00:00:00.000Z');
    expect(res.body.data.user.medicalMemo).toEqual({
      medicalConditions: '고혈압',
      medications: '혈압약',
      allergies: '갑각류',
    });
  });

  /**
   * 회원정보 수정 시 이메일 중복을 감지해 안전하게 차단하는지 검증합니다.
   */
  test('회원정보 수정은 중복 이메일을 409로 차단한다', async () => {
    const activeUser = createMockUser();
    User.findById
      .mockResolvedValueOnce(activeUser)
      .mockResolvedValueOnce(activeUser);
    User.findOne.mockReturnValueOnce(mockSelectable({ _id: 'user-2' }));

    const res = await request(app)
      .put('/api/mobile/profile')
      .set('Authorization', 'Bearer user-token')
      .send({
        name: '김골든',
        email: 'duplicated@example.com',
        phone: '01012345678',
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('이미 가입된 이메일입니다.');
  });

  /**
   * 회원정보 수정은 현재 프로필을 바로 바꾸지 않고 승인 대기 요청으로 저장하는지 검증합니다.
   */
  test('회원정보 수정은 승인 대기용 pendingProfileChange에 저장한다', async () => {
    const activeUser = createMockUser();
    User.findById
      .mockResolvedValueOnce(activeUser)
      .mockResolvedValueOnce(activeUser);
    User.findOne
      .mockReturnValueOnce(mockSelectable(null))
      .mockReturnValueOnce(mockSelectable(null));

    const res = await request(app)
      .put('/api/mobile/profile')
      .set('Authorization', 'Bearer user-token')
      .send({
        name: '김골든수정',
        email: 'member-updated@example.com',
        phone: '010-1111-2222',
        birthDate: '1991-05-10',
        gender: '여성',
        height: 166,
        weight: 58,
        bloodType: 'B+',
        affiliation: {
          city: '광주광역시',
          district: '북구',
          dong: '중흥동',
          welfareName: '빛고을복지관',
        },
        emergencyContacts: [
          {
            name: '새보호자',
            phone: '010-3333-4444',
            relationship: '딸',
          },
        ],
        medicalHistory: {
          medications: [{ name: '혈압약 변경' }],
          allergies: [{ substance: '견과류' }],
          chronicDiseases: [{ disease: '당뇨' }],
        },
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('회원 정보 수정 요청이 관리자 승인 대기로 접수되었습니다.');
    expect(activeUser.name).toBe('김골든');
    expect(activeUser.pendingProfileChange.name).toBe('김골든수정');
    expect(activeUser.pendingProfileChange.phone).toBe('01011112222');
    expect(activeUser.pendingProfileChange.affiliation.city).toBe('광주광역시');
    expect(activeUser.save).toHaveBeenCalled();
  });

  /**
   * 다른 회원에게 등록된 워치를 현재 회원 계정으로 강제로 연결하지 못하는지 검증합니다.
   */
  test('웨어러블 연결은 다른 회원 소유 워치를 409로 차단한다', async () => {
    const activeUser = createMockUser();
    User.findById
      .mockResolvedValueOnce(activeUser)
      .mockResolvedValueOnce(activeUser);
    User.findOne.mockResolvedValueOnce(createMockUser({ _id: 'user-2' }));

    const res = await request(app)
      .post('/api/mobile/wearable/connect')
      .set('Authorization', 'Bearer user-token')
      .send({
        deviceId: 'AA-BB-CC-DD-EE-11',
        deviceName: 'T-Rex 3',
        deviceType: 'watch',
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('이미 다른 회원에게 등록된 워치입니다.');
  });

  /**
   * 회원탈퇴 시 비밀번호 확인 후 상태가 해지/비활성으로 바뀌는지 검증합니다.
   */
  test('회원탈퇴는 계정 상태를 withdrawn과 inactive로 전환한다', async () => {
    const user = createMockUser({
      comparePassword: jest.fn(async (password) => password === 'secret123!'),
    });
    User.findById
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(user);

    const res = await request(app)
      .delete('/api/mobile/profile')
      .set('Authorization', 'Bearer user-token')
      .send({
        password: 'secret123!',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(user.accountStatus).toBe('withdrawn');
    expect(user.status).toBe('inactive');
    expect(user.save).toHaveBeenCalled();
  });

  /**
   * 승인 전 회원 토큰은 보호된 프로필 API에 접근할 수 없는지 검증합니다.
   */
  test('승인 대기 회원 토큰은 프로필 API에서 403으로 차단된다', async () => {
    User.findById.mockResolvedValueOnce(
      createMockUser({
        accountStatus: 'pending',
      }),
    );

    const res = await request(app)
      .get('/api/mobile/profile')
      .set('Authorization', 'Bearer user-token');

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.accountStatus).toBe('pending');
    expect(res.body.message).toBe('어드민 승인 후 이용할 수 있습니다.');
  });

  /**
   * 보호자 토큰은 연결된 회원 프로필을 읽기 전용으로 조회할 수 있어야 합니다.
   */
  test('보호자 토큰은 프로필 조회 API에 접근할 수 있다', async () => {
    const activeUser = createMockUser();
    User.findById
      .mockReturnValueOnce(mockSelectable(activeUser))
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(activeUser),
        }),
      });

    const res = await request(app)
      .get('/api/mobile/profile')
      .set('Authorization', 'Bearer guardian-token');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe('김골든');
    expect(res.body.data.user.emergencyContact.name).toBe('보호자');
  });

  /**
   * 보호자 토큰은 연결된 회원의 최근 생체 데이터 조회도 통과해야 합니다.
   */
  test('보호자 토큰은 최근 생체 데이터 조회 API에 접근할 수 있다', async () => {
    const activeUser = createMockUser();
    User.findById
      .mockReturnValueOnce(mockSelectable(activeUser))
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            name: '김골든',
            wearableDevice: {
              lastSyncAt: new Date('2026-08-03T09:00:00.000Z'),
            },
          }),
        }),
      });
    BiometricData.find.mockReturnValueOnce({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: 'bio-1',
              collectedAt: '2026-08-03T09:00:00.000Z',
              heartRate: 72,
              spO2: 98,
              bodyTemperature: 36.4,
              steps: 1234,
              stressLevel: 22,
              batteryLevel: 88,
            },
          ]),
        }),
      }),
    });

    const res = await request(app)
      .get('/api/mobile/biometric/recent?limit=24&hours=24')
      .set('Authorization', 'Bearer guardian-token');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.biometricData[0].heartRate).toBe(72);
  });

  /**
   * 보호자 토큰은 연결된 회원의 응급 이력 조회도 통과해야 합니다.
   */
  test('보호자 토큰은 응급 이력 조회 API에 접근할 수 있다', async () => {
    const activeUser = createMockUser();
    User.findById.mockReturnValueOnce(mockSelectable(activeUser));
    EmergencyCase.find.mockReturnValueOnce({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([
                {
                  _id: 'case-1',
                  emergencyLevel: 2,
                  status: 'detected',
                  detectedAt: '2026-08-03T09:10:00.000Z',
                  detectedAnomalies: [{ type: 'fall', description: '낙상 의심' }],
                  locations: {
                    detectedAt: { address: '광주광역시 북구' },
                  },
                },
              ]),
            }),
          }),
        }),
      }),
    });

    const res = await request(app)
      .get('/api/mobile/emergency/history?limit=20')
      .set('Authorization', 'Bearer guardian-token');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.emergencyCases[0].status).toBe('detected');
  });
});
