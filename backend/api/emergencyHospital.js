const express = require("express");
const router = express.Router();
const emergencyHospitalService = require("../services/emergencyHospitalService");
const { authRequired: requireAuth } = require("../middleware/auth");
const logger = require("../utils/logger");

/**
 * @swagger
 * /api/emergency-hospital/list:
 *   get:
 *     summary: 응급의료기관 목록 조회
 *     tags: [Emergency Hospital]
 *     parameters:
 *       - in: query
 *         name: sido
 *         schema:
 *           type: string
 *         description: "시도명 (예: 서울특별시)"
 *       - in: query
 *         name: sigungu
 *         schema:
 *           type: string
 *         description: "시군구명 (예: 강남구)"
 *       - in: query
 *         name: hname
 *         schema:
 *           type: string
 *         description: 기관명
 *       - in: query
 *         name: pageNo
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: numOfRows
 *         schema:
 *           type: integer
 *           default: 100
 *         description: 한 페이지 결과 수
 *     responses:
 *       200:
 *         description: 응급의료기관 목록 조회 성공
 */
router.get("/list", requireAuth, async (req, res) => {
  try {
    const { sido, sigungu, hname, pageNo, numOfRows } = req.query;

    const result = await emergencyHospitalService.getEmergencyHospitals({
      sido,
      sigungu,
      hname,
      pageNo: pageNo ? parseInt(pageNo) : 1,
      numOfRows: numOfRows ? parseInt(numOfRows) : 100,
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        totalCount: result.totalCount,
        pageNo: result.pageNo,
        numOfRows: result.numOfRows,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: [],
      });
    }
  } catch (error) {
    logger.error("응급의료기관 목록 조회 오류:", error);
    res.status(500).json({
      success: false,
      message: "응급의료기관 목록 조회 중 오류가 발생했습니다.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/emergency-hospital/info/{hpid}:
 *   get:
 *     summary: 응급의료기관 기본 정보 조회
 *     tags: [Emergency Hospital]
 *     parameters:
 *       - in: path
 *         name: hpid
 *         required: true
 *         schema:
 *           type: string
 *         description: 기관ID
 *     responses:
 *       200:
 *         description: 응급의료기관 기본 정보 조회 성공
 */
router.get("/info/:hpid", requireAuth, async (req, res) => {
  try {
    const { hpid } = req.params;

    const result =
      await emergencyHospitalService.getEmergencyHospitalInfo(hpid);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: null,
      });
    }
  } catch (error) {
    logger.error("응급의료기관 정보 조회 오류:", error);
    res.status(500).json({
      success: false,
      message: "응급의료기관 정보 조회 중 오류가 발생했습니다.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/emergency-hospital/status/{hpid}:
 *   get:
 *     summary: 응급실 실시간 가용 병상 정보 조회
 *     tags: [Emergency Hospital]
 *     parameters:
 *       - in: path
 *         name: hpid
 *         required: true
 *         schema:
 *           type: string
 *         description: 기관ID
 *     responses:
 *       200:
 *         description: 응급실 실시간 가용 병상 정보 조회 성공
 */
router.get("/status/:hpid", requireAuth, async (req, res) => {
  try {
    const { hpid } = req.params;

    const result = await emergencyHospitalService.getEmergencyRoomStatus(hpid);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: null,
      });
    }
  } catch (error) {
    logger.error("응급실 실시간 가용 병상 정보 조회 오류:", error);
    res.status(500).json({
      success: false,
      message: "응급실 실시간 가용 병상 정보 조회 중 오류가 발생했습니다.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/emergency-hospital/severe-disease/{hpid}:
 *   get:
 *     summary: 중증질환 수용 가능 정보 조회
 *     tags: [Emergency Hospital]
 *     parameters:
 *       - in: path
 *         name: hpid
 *         required: true
 *         schema:
 *           type: string
 *         description: 기관ID
 *     responses:
 *       200:
 *         description: 중증질환 수용 가능 정보 조회 성공
 */
router.get("/severe-disease/:hpid", requireAuth, async (req, res) => {
  try {
    const { hpid } = req.params;

    const result =
      await emergencyHospitalService.getSevereDiseaseAvailability(hpid);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: null,
      });
    }
  } catch (error) {
    logger.error("중증질환 수용 가능 정보 조회 오류:", error);
    res.status(500).json({
      success: false,
      message: "중증질환 수용 가능 정보 조회 중 오류가 발생했습니다.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
