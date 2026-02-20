const express = require('express');
const SystemSettings = require('../models/SystemSettings');
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
router.get('/', async (req, res, next) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
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
router.put('/', async (req, res, next) => {
  try {
    const updateData = req.body;
    updateData.updatedAt = Date.now();
    
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

module.exports = router;
