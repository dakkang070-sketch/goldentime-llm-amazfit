const express = require('express');
const request = require('supertest');

jest.mock('../middleware/rateLimiter', () => ({
  authLimiter: (req, res, next) => next(),
}));

jest.mock('../services/notificationService', () => ({
  sendSMS: jest.fn(async () => true),
}));

jest.mock('../models/User', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
}));

const User = require('../models/User');
const { sendSMS } = require('../services/notificationService');
const mobileRouter = require('../api/mobile');

describe('보호자 계정 전용 API 테스트', () => {
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
   * 보호자 이메일 중복확인은 회원 이메일이 아닌 guardianAccess.guardianEmail 기준이어야 합니다.
   */
  test('보호자 이메일 중복확인은 guardianAccess 필드를 조회한다', async () => {
    User.findOne.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'user-1' }),
      }),
    });

    const res = await request(app)
      .post('/api/mobile/guardian/check-email')
      .send({ guardianEmail: 'guardian@example.com' });

    expect(User.findOne).toHaveBeenCalledWith({
      isEmergencyAppUser: true,
      'emergencySettings.guardianAccess.guardianEmail': 'guardian@example.com',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.available).toBe(false);
  });

  /**
   * 보호자 비밀번호 재설정 인증코드는 guardianAccess 전화번호와 이메일로 발송되어야 합니다.
   */
  test('보호자 비밀번호 재설정 인증코드는 guardianAccess 계정으로 발송된다', async () => {
    const save = jest.fn(async () => true);
    User.findOne.mockResolvedValueOnce({
      emergencySettings: {
        guardianAccess: {
          guardianEmail: 'guardian@example.com',
          verifiedGuardianPhone: '01012345678',
        },
      },
      emergencyContact: {
        phone: '010-1234-5678',
      },
      save,
    });

    const res = await request(app)
      .post('/api/mobile/guardian/reset-password/send-code')
      .send({
        guardianEmail: 'guardian@example.com',
        guardianPhone: '010-1234-5678',
      });

    expect(User.findOne).toHaveBeenCalledWith({
      isEmergencyAppUser: true,
      'emergencySettings.guardianAccess.guardianEmail': 'guardian@example.com',
      $or: [
        { 'emergencySettings.guardianAccess.verifiedGuardianPhone': '01012345678' },
        { 'emergencyContact.phone': { $regex: '01012345678' } },
      ],
    });
    expect(save).toHaveBeenCalled();
    expect(sendSMS).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  /**
   * 보호자 이메일 찾기는 암호화된 비상연락처 필드를 직접 조건으로 조회하지 않고,
   * 복호화된 문서 값을 기준으로 이름/전화번호를 비교해야 합니다.
   */
  test('보호자 이메일 찾기는 복호화된 이름과 전화번호로 계정을 찾는다', async () => {
    User.find.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue([
        {
          emergencyContact: {
            name: 'Guardian',
            phone: '010-1234-5678',
          },
          emergencySettings: {
            guardianAccess: {
              guardianEmail: 'guardian@example.com',
              verifiedGuardianPhone: '01012345678',
            },
          },
        },
      ]),
    });

    const res = await request(app)
      .post('/api/mobile/guardian/find-email')
      .send({
        name: 'Guardian',
        phone: '010-1234-5678',
      });

    expect(User.find).toHaveBeenCalledWith({
      isEmergencyAppUser: true,
      'emergencySettings.guardianAccess.guardianEmail': { $exists: true, $ne: '' },
      $or: [
        { 'emergencySettings.guardianAccess.verifiedGuardianPhone': '01012345678' },
        { 'emergencyContact.phone': { $exists: true, $ne: null } },
      ],
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.email).toContain('@example.com');
  });
});
