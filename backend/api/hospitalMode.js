const express = require('express');
/**
 * 사용자 입원 모드 진입/해제와 병원 상태 조회 엔드포인트를 묶는 Express 라우터입니다.
 */
const router = express.Router();
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const { authRequired: requireAuth } = require('../middleware/auth');

/**
 * 인증된 사용자 payload에서 회원 식별자를 우선순위대로 추출합니다.
 */
function getAuthenticatedUserId(req) {
  return req.user?.sub || req.user?.userId || null;
}

/**
 * 입원 모드 활성화
 * POST /api/hospital-mode/enter
 */
/**
 * 사용자를 입원 상태로 전환하고 병원 위치 정보를 기록합니다.
 */
router.post('/enter', requireAuth, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
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

    // hospitalId가 있으면 병원 좌표를 우선 쓰고, 없으면 직접 전달된 위치를 사용합니다.
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

    // 입원 플래그와 병원 위치를 함께 저장해 이후 모바일/관제 화면이 같은 상태를 참조하게 합니다.
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
/**
 * 현재 입원 모드를 종료하고 사용자 상태를 일반 상태로 되돌립니다.
 */
router.post('/exit', requireAuth, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

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

    // 퇴원 시 입원 기록은 남기고 isActive만 내려 일반 사용자 상태로 되돌립니다.
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
/**
 * 로그인한 사용자의 입원 모드 활성 여부와 병원 정보를 조회합니다.
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    // 상태 조회는 병원 기본 정보까지 populate 해 앱이 추가 조회 없이 바로 렌더링하게 합니다.
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

/**
 * 입원 모드 API 라우터를 외부 앱 서버에 등록할 수 있도록 export 합니다.
 */
module.exports = router;
