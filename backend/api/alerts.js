const express = require('express');
/**
 * 알림 목록 조회와 상태 변경 엔드포인트를 묶는 Express 라우터입니다.
 */
const router = express.Router();
const Alert = require('../models/Alert');
const User = require('../models/User');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

/**
 * 조건별로 알림 목록을 조회해 프런트 표시 형식으로 변환합니다.
 */
router.get('/', cacheMiddleware(15), async (req, res, next) => {
  try {
    const { userId, severity, status, startDate, endDate } = req.query;
    
    let query = {};
    
    if (userId) query.userId = userId;
    if (severity) query.severity = severity;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const alerts = await Alert.find(query)
      .populate('userId', 'name phone email birthDate')
      .sort({ timestamp: -1 })
      .lean();

    // populate 된 사용자/디바이스 정보를 프런트 알림 리스트 카드 형태로 평탄화합니다.
    // 프론트엔드 포맷에 맞게 변환
    const formattedAlerts = alerts.map(alert => ({
      id: alert._id,
      memberId: alert.userId._id,
      memberName: alert.userId.name,
      timestamp: alert.timestamp,
      type: alert.type,
      severity: alert.severity,
      status: alert.status,
      location: alert.location,
      aiConfidence: alert.aiConfidence,
      aiAnalysis: alert.aiAnalysis,
      biometricsSnapshot: alert.biometricsSnapshot,
      deviceSnapshot: alert.deviceInfo
    }));

    res.json({ success: true, data: formattedAlerts });
  } catch (err) {
    next(err);
  }
});

/**
 * 단일 알림의 상세 정보와 연결된 사용자 정보를 조회합니다.
 */
router.get('/:id', cacheMiddleware(15), async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('userId', 'name phone')
      .lean();
      
    if (!alert) return res.status(404).json({ success: false, message: '알림을 찾을 수 없습니다.' });

    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
});

/**
 * 관리자가 알림 처리 상태와 메모를 갱신합니다.
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    // 상태 변경과 메모 추가를 한 번에 처리해 관제 후속 기록 입력 왕복을 줄입니다.
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status, $push: { adminNotes: { note: adminNote, date: new Date() } } }, // adminNotes 필드는 스키마에 없지만 일단 유연하게 처리하거나 스키마 수정 필요. 일단 status만.
      { new: true }
    );
    
    if (!alert) return res.status(404).json({ success: false, message: '알림을 찾을 수 없습니다.' });

    invalidateCache('^cache:/api/alerts');

    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
});

/**
 * 개발 확인용 테스트 알림을 직접 생성합니다.
 */
router.post('/test', async (req, res, next) => {
  try {
    const newAlert = new Alert(req.body);
    await newAlert.save();
    invalidateCache('^cache:/api/alerts');
    res.json({ success: true, data: newAlert });
  } catch (err) {
    next(err);
  }
});

/**
 * 알림 API 라우터를 외부 앱 서버에 등록할 수 있도록 export 합니다.
 */
module.exports = router;
