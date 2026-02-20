const express = require('express');
const validator = require('validator');
const User = require('../models/User');
const BiometricData = require('../models/BiometricData');
const { signUserToken } = require('../services/jwtService');
const { assignUserToController } = require('../services/controllerAssignmentService');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 전체 사용자 목록 조회 (관리자용)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: 사용자 목록 및 최신 상태
 */
router.get('/', async (req, res, next) => {
  try {
    // 1. 모든 사용자 조회
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();

    // 2. 각 사용자의 최신 생체 데이터 조회
    const usersWithStatus = await Promise.all(users.map(async (user) => {
      const latestData = await BiometricData.findOne({ userId: user._id })
        .sort({ collectedAt: -1 })
        .lean();

      // 간단한 위험도 분석 (예시)
      let healthStatus = '정상';
      if (latestData) {
        if (latestData.heartRate > 120 || latestData.heartRate < 40) healthStatus = '위험';
        else if (latestData.heartRate > 100) healthStatus = '주의';
      }

      // 계정 상태가 비활성이면 전체 상태도 비활성으로 표시할 수 있음
      // 하지만 프론트엔드에서 분리해서 처리하도록 데이터는 그대로 전달
      const accountStatus = user.accountStatus || 'active';

      return {
        ...user,
        status: healthStatus, // 기존 호환성을 위해 healthStatus를 status로 전달
        healthStatus,
        accountStatus,
        latestHealth: latestData || null
      };
    }));

    res.json({ success: true, data: usersWithStatus });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: 사용자 정보 수정 (관리자용)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               birthDate:
 *                 type: string
 *               height:
 *                 type: number
 *               weight:
 *                 type: number
 *               bloodType:
 *                 type: string
 *     responses:
 *       200:
 *         description: 수정 성공
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // 비밀번호 수정은 별도 API로 분리하거나 여기서 처리하지 않음
    delete updateData.password;

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: 사용자 삭제 (관리자용)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 삭제 성공
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    // 관련 생체 데이터도 함께 삭제 (선택 사항이나 데이터 무결성을 위해 권장)
    await BiometricData.deleteMany({ userId: id });

    res.json({ success: true, message: '사용자가 삭제되었습니다.' });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/signup:
 *   post:
 *     summary: 사용자 회원가입
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 잘못된 요청
 */
router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      birthDate,
      age,
      height,
      weight,
      bloodType,
      medicalHistory,
      emergencyContact,
      consents,
    } = req.body || {};

    if (!name || !phone || !email || !password || !birthDate || !age || !height || !weight || !bloodType) {
      return res.status(400).json({ success: false, message: '필수 입력값이 누락되었습니다.' });
    }
    if (!validator.isEmail(String(email))) {
      return res.status(400).json({ success: false, message: '이메일 형식이 올바르지 않습니다.' });
    }

    const exists = await User.findOne({ $or: [{ email: String(email).toLowerCase() }, { phone: String(phone) }] })
      .select('_id')
      .lean();
    if (exists) {
      return res.status(409).json({ success: false, message: '이미 가입된 이메일 또는 전화번호입니다.' });
    }

    const user = await User.create({
      name,
      phone,
      email,
      password,
      birthDate,
      age,
      height,
      weight,
      bloodType,
      medicalHistory: medicalHistory || undefined,
      emergencyContact: emergencyContact || undefined,
      consents: consents || undefined,
    });

    // 관제사 자동 배정 (실패해도 가입은 성공)
    try {
      await assignUserToController(user._id);
    } catch (err) {
      console.warn('관제사 배정 실패 (가입은 성공):', err.message);
    }

    const token = signUserToken(user);
    res.status(201).json({ success: true, userId: user._id, token });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: 사용자 로그인
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       401:
 *         description: 인증 실패
 */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'email/password가 필요합니다.' });

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const ok = await user.comparePassword(String(password));
    if (!ok) return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const token = signUserToken(user);
    res.json({ success: true, userId: user._id, token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

