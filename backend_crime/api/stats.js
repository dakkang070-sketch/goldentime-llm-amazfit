const express = require('express');
const router = express.Router();
const User = require('../models/User');
const EmergencyCase = require('../models/EmergencyCase');
const Paramedic = require('../models/Paramedic');
const BiometricData = require('../models/BiometricData');
const { authRequired: requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { cacheMiddleware } = require('../middleware/cache');
const { statsLimiter } = require('../middleware/rateLimiter');
const { generateWeeklyHealthReport } = require('../services/ollamaService');

/**
 * @swagger
 * /api/stats/weekly-analysis:
 *   post:
 *     summary: AI 주간 건강 분석 리포트 생성
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 분석 성공
 */
router.post('/weekly-analysis', requireAuth, statsLimiter, async (req, res) => {
  try {
    const { weeklyData } = req.body;
    const user = req.user; // auth 미들웨어에서 설정됨

    if (!weeklyData) {
      return res.status(400).json({ success: false, message: '분석할 데이터가 없습니다.' });
    }

    // 사용자 프로필 구성
    const userProfile = {
      age: user.age || 30, // 기본값
      gender: user.gender || '알 수 없음',
      diseases: user.diseases || ''
    };

    // AI 분석 요청
    const report = await generateWeeklyHealthReport({
      userProfile,
      weeklyData
    });

    res.json({
      success: true,
      data: {
        report
      }
    });

  } catch (error) {
    console.error('Weekly analysis error:', error);
    res.status(500).json({ success: false, message: '분석 중 오류가 발생했습니다.' });
  }
});

/**
 * @swagger
 * /api/stats/overview:
 *   get:
 *     summary: 전체 통계 조회
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 통계 조회 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 없음
 */
router.get('/overview', requireAuth, requireRole(['controller', 'admin']), statsLimiter, cacheMiddleware(60), async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalCases,
      activeCases,
      totalParamedics,
      availableParamedics,
      totalBiometricData,
      recentCases
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      EmergencyCase.countDocuments(),
      EmergencyCase.countDocuments({ status: { $in: ['detected', 'matched', 'in_progress', 'transporting'] } }),
      Paramedic.countDocuments(),
      Paramedic.countDocuments({ status: 'available' }),
      BiometricData.countDocuments(),
      EmergencyCase.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name')
        .lean()
    ]);

    // 응급도별 통계
    const emergencyLevelStats = await EmergencyCase.aggregate([
      {
        $group: {
          _id: '$emergencyLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    // 상태별 통계
    const statusStats = await EmergencyCase.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 최근 24시간 케이스
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const casesLast24h = await EmergencyCase.countDocuments({
      createdAt: { $gte: last24Hours }
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers
        },
        cases: {
          total: totalCases,
          active: activeCases,
          last24Hours: casesLast24h,
          byLevel: emergencyLevelStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          byStatus: statusStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        paramedics: {
          total: totalParamedics,
          available: availableParamedics
        },
        biometric: {
          totalRecords: totalBiometricData
        },
        recentCases
      }
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '통계 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 사용자별 통계
 * GET /api/stats/user/:userId
 */
router.get('/user/:userId', requireAuth, requireRole(['controller', 'admin']), async (req, res) => {
  try {
    const { userId } = req.params;

    const [
      user,
      totalCases,
      biometricDataCount,
      recentBiometricData
    ] = await Promise.all([
      User.findById(userId).select('name email phone status').lean(),
      EmergencyCase.countDocuments({ userId }),
      BiometricData.countDocuments({ userId }),
      BiometricData.find({ userId })
        .sort({ collectedAt: -1 })
        .limit(10)
        .select('collectedAt heartRate stressLevel movementStatus analysis.emergencyLevel')
        .lean()
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        user,
        cases: {
          total: totalCases
        },
        biometric: {
          totalRecords: biometricDataCount,
          recent: recentBiometricData
        }
      }
    });
  } catch (error) {
    console.error('사용자 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '통계 조회 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
