const express = require('express');
const EmergencyCase = require('../models/EmergencyCase');
const Paramedic = require('../models/Paramedic');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { autoMatchParamedicForCase } = require('../services/matchingService');
const { emitCaseStatusUpdated } = require('../services/socketService');
const { generateNonDiagnosticSummary } = require('../services/ollamaService');
const BiometricData = require('../models/BiometricData');
const User = require('../models/User');

const router = express.Router();

// (관제/관리자용으로 확장 예정) 케이스 조회: MVP는 사용자 본인만
router.get('/my', authRequired, requireRole('user'), async (req, res, next) => {
  try {
    const cases = await EmergencyCase.find({ userId: req.user.sub })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, cases });
  } catch (err) {
    next(err);
  }
});

// 응급구조사: 내가 매칭된 케이스 목록(최근)
router.get('/paramedic/my', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const cases = await EmergencyCase.find({ 'paramedic.paramedicId': req.user.sub })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, cases });
  } catch (err) {
    next(err);
  }
});

// AI 환자 분석 API (관제센터용)
router.post('/:patientId/analyze', async (req, res, next) => {
  try {
    const patientId = req.params.patientId;
    
    // 환자 ID로 가장 최근 응급 케이스 조회 (MongoDB ObjectId가 아닌 경우)
    let emergencyCase;
    
    // MongoDB ObjectId 형식인지 확인
    if (patientId.match(/^[0-9a-fA-F]{24}$/)) {
      emergencyCase = await EmergencyCase.findById(patientId).populate('userId').lean();
    } else {
      // ObjectId가 아니면 환자를 찾을 수 없으므로 가상 환자 데이터 생성
      const mockUser = {
        _id: patientId,
        name: req.body.name || '환자',
        age: req.body.age || 35,
        baselineBiometric: { heartRate: { avg: 70 } }
      };
      
      emergencyCase = {
        _id: patientId,
        userId: mockUser,
        emergencyLevel: req.body.emergencyLevel || 3,
        detectedAnomalies: req.body.anomalies || []
      };
    }
    
    if (!emergencyCase) {
      return res.status(404).json({ success: false, message: '케이스를 찾을 수 없습니다.' });
    }

    // 환자 정보
    const user = emergencyCase.userId;
    
    // 최근 생체 데이터 조회 (가상 환자인 경우 가상 데이터 생성)
    let recentBiometric;
    
    if (patientId.match(/^[0-9a-fA-F]{24}$/)) {
      recentBiometric = await BiometricData.findOne({ 
        userId: user._id 
      }).sort({ collectedAt: -1 }).lean();
    } else {
      // 가상 환자의 경우 가상 생체 데이터 생성
      recentBiometric = {
        userId: user._id,
        collectedAt: new Date(),
        heartRate: req.body.heartRate || 85,
        stressLevel: req.body.stressLevel || 45,
        movementStatus: req.body.movementStatus || 'normal',
        vitals: {
          heartRate: req.body.heartRate || 85,
          spo2: req.body.oxygenLevel || 95,
          temperature: req.body.bodyTemperature || 36.5
        },
        location: { lat: 37.5665, lng: 126.9780 }
      };
    }

    let analysisText = '현재 생체 데이터가 없어 분석할 수 없습니다.';
    let severityScore = emergencyCase.emergencyLevel || 3;

    if (recentBiometric) {
      // 규칙 기반 분석
      const ruleResult = {
        level: emergencyCase.emergencyLevel,
        anomalies: emergencyCase.detectedAnomalies || []
      };

      // Ollama AI 분석 (활성화된 경우)
      if ((process.env.ENABLE_OLLAMA || '').toLowerCase() === 'true') {
        try {
          const llmText = await generateNonDiagnosticSummary({
            userBaseline: { baselineHrAvg: user?.baselineBiometric?.heartRate?.avg },
            biometric: {
              collectedAt: recentBiometric.collectedAt?.toISOString?.() || String(recentBiometric.collectedAt),
              heartRate: recentBiometric.heartRate || recentBiometric.vitals?.heartRate,
              stressLevel: recentBiometric.stressLevel,
              movementStatus: recentBiometric.movementStatus || recentBiometric.activity?.movement,
              location: recentBiometric.location,
              oxygenLevel: recentBiometric.oxygenLevel || recentBiometric.vitals?.spo2,
              bodyTemperature: recentBiometric.bodyTemperature || recentBiometric.vitals?.temperature
            },
            ruleResult
          });
          if (llmText) analysisText = llmText;
        } catch (e) {
          console.warn('Ollama 분석 실패, 기본 분석 사용:', e.message);
        }
      }

      // 기본 분석 (Ollama 실패 시)
      if (analysisText === '현재 생체 데이터가 없어 분석할 수 없습니다.') {
        const hr = recentBiometric.heartRate || recentBiometric.vitals?.heartRate || 0;
        const spo2 = recentBiometric.oxygenLevel || recentBiometric.vitals?.spo2 || 0;
        const movement = recentBiometric.movementStatus || recentBiometric.activity?.movement;
        
        if (emergencyCase.emergencyLevel >= 5) {
          analysisText = `응급 상황 감지: 심박수 ${hr}bpm${spo2 ? `, 산소포화도 ${spo2}%` : ''}${movement === 'fall_detected' ? ', 낙상 감지' : ''}. 즉시 응급실 이송이 필요합니다.`;
        } else if (emergencyCase.emergencyLevel >= 4) {
          analysisText = `위급 상황 가능성: 심박수 ${hr}bpm${spo2 ? `, 산소포화도 ${spo2}%` : ''}. 신속한 의료진 확인과 대응이 필요합니다.`;
        } else if (emergencyCase.emergencyLevel >= 3) {
          analysisText = `이상 징후 감지: 심박수 ${hr}bpm${spo2 ? `, 산소포화도 ${spo2}%` : ''}. 지속적인 모니터링과 관제 확인이 권고됩니다.`;
        } else {
          analysisText = `현재 생체징후는 안정적입니다: 심박수 ${hr}bpm${spo2 ? `, 산소포화도 ${spo2}%` : ''}. 계속 모니터링하겠습니다.`;
        }
      }
    }

    // 케이스에 분석 결과 저장 (실제 DB 케이스가 있는 경우에만)
    if (patientId.match(/^[0-9a-fA-F]{24}$/)) {
      await EmergencyCase.findByIdAndUpdate(patientId, {
        'llmAnalysis.analysisText': analysisText,
        'llmAnalysis.analyzedAt': new Date(),
        'llmAnalysis.model': (process.env.ENABLE_OLLAMA === 'true') ? 'ollama-llama3.1' : 'rule-based'
      });
    }

    res.json({ 
      success: true, 
      analysis: {
        analysisText,
        severityScore,
        emergencyLevel: emergencyCase.emergencyLevel,
        analyzedAt: new Date(),
        model: (process.env.ENABLE_OLLAMA === 'true') ? 'ollama-llama3.1' : 'rule-based'
      }
    });

  } catch (err) {
    console.error('AI 분석 실패:', err);
    next(err);
  }
});

// (MVP) 자동 매칭 재시도: 관제/관리자용으로 확장 예정, 지금은 임시로 user도 허용
router.post('/:caseId/auto-match', authRequired, async (req, res, next) => {
  try {
    const result = await autoMatchParamedicForCase(req.params.caseId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// 응급구조사: 케이스 수락
router.post('/:caseId/accept', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const ec = await EmergencyCase.findById(req.params.caseId);
    if (!ec) return res.status(404).json({ success: false, message: '케이스를 찾을 수 없습니다.' });
    if (String(ec.paramedic?.paramedicId || '') !== String(req.user.sub)) {
      return res.status(403).json({ success: false, message: '본인에게 배정된 케이스가 아닙니다.' });
    }
    if (ec.paramedic.status !== 'pending') {
      return res.status(400).json({ success: false, message: '수락 가능한 상태가 아닙니다.' });
    }

    ec.paramedic.status = 'accepted';
    ec.paramedic.acceptedAt = new Date();
    ec.status = 'in_progress';
    await ec.save();

    await Paramedic.findByIdAndUpdate(req.user.sub, {
      status: 'handling_case',
      currentCase: ec._id,
      lastActivity: new Date(),
      $pull: { pendingCases: { caseId: ec._id } },
    });

    // Socket.IO 알림
    emitCaseStatusUpdated(ec._id, 'in_progress', {
      userId: ec.userId,
      paramedicId: ec.paramedic.paramedicId,
      status: 'accepted'
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 응급구조사: 도착
router.post('/:caseId/arrive', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const ec = await EmergencyCase.findById(req.params.caseId);
    if (!ec) return res.status(404).json({ success: false, message: '케이스를 찾을 수 없습니다.' });
    if (String(ec.paramedic?.paramedicId || '') !== String(req.user.sub)) {
      return res.status(403).json({ success: false, message: '본인에게 배정된 케이스가 아닙니다.' });
    }
    ec.paramedic.status = 'arrived';
    ec.paramedic.arrivalTime = new Date();
    await ec.save();
    
    // Socket.IO 알림
    emitCaseStatusUpdated(ec._id, 'in_progress', {
      userId: ec.userId,
      paramedicId: ec.paramedic.paramedicId,
      status: 'arrived',
      arrivalTime: ec.paramedic.arrivalTime
    });
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 응급구조사: 이송 시작
router.post('/:caseId/transport', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const ec = await EmergencyCase.findById(req.params.caseId);
    if (!ec) return res.status(404).json({ success: false, message: '케이스를 찾을 수 없습니다.' });
    if (String(ec.paramedic?.paramedicId || '') !== String(req.user.sub)) {
      return res.status(403).json({ success: false, message: '본인에게 배정된 케이스가 아닙니다.' });
    }
    ec.paramedic.status = 'transporting';
    ec.paramedic.transportStartTime = new Date();
    ec.status = 'transporting';
    await ec.save();
    await Paramedic.findByIdAndUpdate(req.user.sub, { status: 'in_transit', lastActivity: new Date() });
    
    // Socket.IO 알림
    emitCaseStatusUpdated(ec._id, 'transporting', {
      userId: ec.userId,
      paramedicId: ec.paramedic.paramedicId,
      status: 'transporting',
      transportStartTime: ec.paramedic.transportStartTime
    });
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 응급구조사: 종료(이송 완료)
router.post('/:caseId/complete', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const ec = await EmergencyCase.findById(req.params.caseId);
    if (!ec) return res.status(404).json({ success: false, message: '케이스를 찾을 수 없습니다.' });
    if (String(ec.paramedic?.paramedicId || '') !== String(req.user.sub)) {
      return res.status(403).json({ success: false, message: '본인에게 배정된 케이스가 아닙니다.' });
    }

    ec.paramedic.status = 'completed';
    ec.status = 'completed';
    ec.completedAt = new Date();
    await ec.save();

    await Paramedic.findByIdAndUpdate(req.user.sub, {
      status: 'available',
      currentCase: null,
      lastActivity: new Date(),
      $inc: { 'stats.totalCases': 1, 'stats.completedCases': 1 },
    });

    // Socket.IO 알림
    emitCaseStatusUpdated(ec._id, 'completed', {
      userId: ec.userId,
      paramedicId: ec.paramedic.paramedicId,
      status: 'completed',
      completedAt: ec.completedAt
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

