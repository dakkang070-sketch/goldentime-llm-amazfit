const express = require('express');
const SystemSettings = require('../models/SystemSettings');
const { authRequired: requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
/**
 * 시스템 전역 설정 조회/저장 엔드포인트를 묶는 Express 라우터입니다.
 */
const router = express.Router();

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: 시스템 설정 조회
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: 시스템 설정 정보
 */
/**
 * 현재 시스템 설정 문서를 조회하고 없으면 기본 설정을 생성합니다.
 */
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      // 단일 설정 문서 패턴이라 첫 조회에서 비어 있으면 기본 문서를 즉시 만들어 둡니다.
      // 초기 설정이 없으면 생성
      settings = await SystemSettings.create({});
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: 시스템 설정 수정
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: 수정된 시스템 설정 정보
 */
/**
 * 단일 시스템 설정 문서를 갱신하거나 없으면 새로 생성합니다.
 */
router.put('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const updateData = req.body;
    updateData.updatedAt = Date.now();
    
    // 부분 patch도 별도 병합 없이 그대로 저장해 호출 측이 보낸 최종 설정을 기준으로 맞춥니다.
    // upsert: true 옵션으로 문서가 없으면 생성, 있으면 수정
    const settings = await SystemSettings.findOneAndUpdate(
      {}, 
      updateData, 
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

/**
 * 설정 API 라우터를 외부 앱 서버에 등록할 수 있도록 export 합니다.
 */
module.exports = router;
