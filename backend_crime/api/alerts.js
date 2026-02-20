const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const User = require('../models/User');

// 모든 알림 조회 (관리자용)
router.get('/', async (req, res, next) => {
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

// 알림 상세 조회
router.get('/:id', async (req, res, next) => {
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

// 알림 상태 업데이트 (조치 완료 등)
router.put('/:id', async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status, $push: { adminNotes: { note: adminNote, date: new Date() } } }, // adminNotes 필드는 스키마에 없지만 일단 유연하게 처리하거나 스키마 수정 필요. 일단 status만.
      { new: true }
    );
    
    if (!alert) return res.status(404).json({ success: false, message: '알림을 찾을 수 없습니다.' });
    
    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
});

// 테스트용 알림 생성 (개발 편의성)
router.post('/test', async (req, res, next) => {
  try {
    const newAlert = new Alert(req.body);
    await newAlert.save();
    res.json({ success: true, data: newAlert });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
