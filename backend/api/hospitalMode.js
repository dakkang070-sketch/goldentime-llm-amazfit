const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const { authRequired: requireAuth } = require('../middleware/auth');

/**
 * 입원 모드 활성화
 * POST /api/hospital-mode/enter
 */
router.post('/enter', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { hospitalId, lat, lng, address } = req.body;

    if (!hospitalId && (!lat || !lng)) {
      return res.status(400).json({
        success: false,
        message: '병원 ID 또는 위치 정보가 필요합니다.'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 병원 정보 확인
    let hospital = null;
    if (hospitalId) {
      hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: '병원을 찾을 수 없습니다.'
        });
      }
    }

    // 입원 모드 활성화
    user.hospitalMode = {
      isActive: true,
      hospitalId: hospitalId || null,
      enteredAt: new Date(),
      location: {
        lat: lat || hospital?.location?.lat,
        lng: lng || hospital?.location?.lng
      }
    };

    user.status = 'hospitalized';
    await user.save();

    res.json({
      success: true,
      message: '입원 모드가 활성화되었습니다.',
      hospitalMode: user.hospitalMode
    });
  } catch (error) {
    console.error('입원 모드 활성화 오류:', error);
    res.status(500).json({
      success: false,
      message: '입원 모드 활성화 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 퇴원 모드 활성화
 * POST /api/hospital-mode/exit
 */
router.post('/exit', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    if (!user.hospitalMode?.isActive) {
      return res.status(400).json({
        success: false,
        message: '입원 모드가 활성화되어 있지 않습니다.'
      });
    }

    // 퇴원 처리
    user.hospitalMode.isActive = false;
    user.hospitalMode.exitedAt = new Date();
    user.status = 'active';
    await user.save();

    res.json({
      success: true,
      message: '퇴원 모드가 활성화되었습니다.',
      hospitalMode: user.hospitalMode
    });
  } catch (error) {
    console.error('퇴원 모드 활성화 오류:', error);
    res.status(500).json({
      success: false,
      message: '퇴원 모드 활성화 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 입원 모드 상태 조회
 * GET /api/hospital-mode/status
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId)
      .select('hospitalMode status')
      .populate('hospitalMode.hospitalId', 'name location');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      hospitalMode: user.hospitalMode,
      status: user.status
    });
  } catch (error) {
    console.error('입원 모드 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '입원 모드 상태 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
