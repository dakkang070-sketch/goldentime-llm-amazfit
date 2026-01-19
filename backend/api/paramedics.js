const express = require('express');
const validator = require('validator');
const Paramedic = require('../models/Paramedic');
const { signParamedicToken } = require('../services/jwtService');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { updateRouteForCase } = require('../services/routeService');
const { emitParamedicLocationUpdated } = require('../services/socketService');

const router = express.Router();

router.post('/signup', async (req, res, next) => {
  try {
    const { name, phone, email, password, licenseNumber } = req.body || {};
    if (!name || !phone || !email || !password || !licenseNumber) {
      return res.status(400).json({ success: false, message: '필수 입력값이 누락되었습니다.' });
    }
    if (!validator.isEmail(String(email))) {
      return res.status(400).json({ success: false, message: '이메일 형식이 올바르지 않습니다.' });
    }

    const exists = await Paramedic.findOne({
      $or: [{ email: String(email).toLowerCase() }, { phone: String(phone) }, { licenseNumber: String(licenseNumber) }],
    })
      .select('_id')
      .lean();
    if (exists) return res.status(409).json({ success: false, message: '이미 등록된 계정입니다.' });

    // MVP: 위치는 필수라 기본값을 0,0으로 넣고, 앱에서 즉시 업데이트하도록 유도
    const p = await Paramedic.create({
      name,
      phone,
      email,
      password,
      licenseNumber,
      status: 'off_duty',
      currentLocation: { lat: 0, lng: 0 },
    });

    const token = signParamedicToken(p);
    res.status(201).json({ success: true, paramedicId: p._id, token });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'email/password가 필요합니다.' });

    const p = await Paramedic.findOne({ email: String(email).toLowerCase() });
    if (!p) return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const ok = await p.comparePassword(String(password));
    if (!ok) return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const token = signParamedicToken(p);
    res.json({ success: true, paramedicId: p._id, token });
  } catch (err) {
    next(err);
  }
});

router.patch('/me/status', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const allowed = ['available', 'on_duty', 'off_duty', 'in_transit', 'handling_case'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'status 값이 올바르지 않습니다.' });

    const updated = await Paramedic.findByIdAndUpdate(
      req.user.sub,
      { status, lastActivity: new Date() },
      { new: true }
    ).select('_id status');
    if (!updated) return res.status(404).json({ success: false, message: '응급구조사를 찾을 수 없습니다.' });

    res.json({ success: true, status: updated.status });
  } catch (err) {
    next(err);
  }
});

router.patch('/me/location', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const { lat, lng, address } = req.body || {};
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ success: false, message: 'lat/lng(number)가 필요합니다.' });
    }

    const updated = await Paramedic.findByIdAndUpdate(
      req.user.sub,
      {
        currentLocation: {
          lat,
          lng,
          address,
          updatedAt: new Date(),
        },
        lastActivity: new Date(),
      },
      { new: true }
    ).select('_id currentLocation status currentCase');
    if (!updated) return res.status(404).json({ success: false, message: '응급구조사를 찾을 수 없습니다.' });

    // 현재 처리 중인 케이스가 있으면 경로 재계산
    if (updated.currentCase) {
      try {
        await updateRouteForCase(updated.currentCase, { lat, lng });
        // Socket.IO로 위치 업데이트 알림
        emitParamedicLocationUpdated(
          req.user.sub,
          { lat, lng, address },
          updated.currentCase
        );
      } catch (err) {
        console.warn('경로 재계산 실패:', err.message);
      }
    } else {
      // 케이스가 없어도 위치 업데이트 알림 (관제사용)
      emitParamedicLocationUpdated(req.user.sub, { lat, lng, address }, null);
    }

    res.json({ success: true, currentLocation: updated.currentLocation, status: updated.status });
  } catch (err) {
    next(err);
  }
});

router.get('/me/pending-cases', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const p = await Paramedic.findById(req.user.sub).select('pendingCases currentCase status').lean();
    if (!p) return res.status(404).json({ success: false, message: '응급구조사를 찾을 수 없습니다.' });
    res.json({ success: true, pendingCases: p.pendingCases || [], currentCase: p.currentCase || null, status: p.status });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

