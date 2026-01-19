const express = require('express');
const validator = require('validator');
const User = require('../models/User');
const { signUserToken } = require('../services/jwtService');
const { assignUserToController } = require('../services/controllerAssignmentService');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

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

