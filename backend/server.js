require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/database');
const { initializeSocket } = require('./services/socketService');
const { validateEnv } = require('./utils/validateEnv');
const logger = require('./utils/logger');

// 환경변수 검증
validateEnv();

// 데이터베이스 연결
connectDB();

// 서버 시작 체크 (비동기로 실행)
const { performStartupChecks } = require('./utils/startupCheck');
setTimeout(async () => {
  await performStartupChecks();
}, 2000); // DB 연결 후 2초 대기

// 완전 자동 학습 시스템 시작
if (process.env.ENABLE_AUTO_LEARNING === 'true') {
  const autoLearningService = require('./services/autoLearningService');
  setTimeout(() => {
    autoLearningService.start();
    logger.info('🤖 완전 자동 학습 시스템 활성화됨');
  }, 5000); // DB 연결 및 초기화 완료 후 5초 대기
}

// 응급 워크플로우 자동화 시스템 시작
if (process.env.ENABLE_EMERGENCY_WORKFLOW === 'true') {
  const emergencyWorkflowService = require('./services/emergencyWorkflowService');
  const realtimeTrackingService = require('./services/realtimeTrackingService');
  const resourceManagementService = require('./services/resourceManagementService');
  
  setTimeout(async () => {
    try {
      // 리소스 풀 초기화
      await resourceManagementService.initializeResourcePool();
      
      // 시스템 모니터링 시작
      emergencyWorkflowService.startSystemMonitoring();
      
      logger.info('🚨 응급 워크플로우 자동화 시스템 활성화됨');
    } catch (error) {
      logger.error('응급 워크플로우 시스템 시작 실패', error);
    }
  }, 6000); // 자동 학습 시스템 후 1초 대기
}

// 종합적인 피드백 및 품질 관리 시스템 시작
if (process.env.ENABLE_QUALITY_MANAGEMENT === 'true') {
  const qualityManagementService = require('./services/qualityManagementService');
  setTimeout(async () => {
    try {
      await qualityManagementService.start();
      logger.info('🎯 종합 품질 관리 시스템 활성화됨');
    } catch (error) {
      logger.error('품질 관리 시스템 시작 실패', error);
    }
  }, 7000); // 워크플로우 시스템 후 1초 대기
}

// 실시간 생체신호 분석 엔진 시작
if (process.env.ENABLE_REALTIME_BIOSIGNAL === 'true') {
  const realtimeBiosignalEngine = require('./services/realtimeBiosignalEngine');
  setTimeout(async () => {
    try {
      // 실시간 엔진 이벤트 리스너 설정
      realtimeBiosignalEngine.on('emergency_detected', (eventData) => {
        logger.warn('🚨 실시간 응급상황 감지:', {
          userId: eventData.userId,
          severity: eventData.emergencyDetection.maxSeverity,
          alerts: eventData.emergencyDetection.alerts.length
        });
      });

      logger.info('🔬 실시간 생체신호 분석 엔진 활성화됨');
    } catch (error) {
      logger.error('실시간 생체신호 엔진 시작 실패', error);
    }
  }, 8000); // 품질 관리 시스템 후 1초 대기
}

// 지능형 병원 매칭 및 국립중앙의료원 API 자동 갱신 시스템 시작
if (process.env.ENABLE_HOSPITAL_MATCHING === 'true' && process.env.NEDC_API_SERVICE_KEY) {
  const nedcApiService = require('./services/nedcApiService');
  setTimeout(async () => {
    try {
      // 국립중앙의료원 API 자동 갱신 스케줄러 시작
      nedcApiService.startAutoRefreshScheduler();
      
      // 초기 병원 데이터 동기화 (서버 시작 30초 후)
      setTimeout(async () => {
        try {
          logger.info('🔄 초기 병원 데이터 동기화 시작');
          await nedcApiService.syncHospitalData(1, 100);
          logger.info('✅ 초기 병원 데이터 동기화 완료');
        } catch (error) {
          logger.warn('⚠️  초기 병원 데이터 동기화 실패 (스케줄러에서 재시도 예정)', { error: error.message });
        }
      }, 30000);

      logger.info('🏥 지능형 병원 매칭 시스템 및 NEDC API 자동 갱신 활성화됨');
    } catch (error) {
      logger.error('❌ 병원 매칭 시스템 시작 실패', { error });
    }
  }, 9000);
}

const app = express();
const server = http.createServer(app);

// Socket.IO 초기화
initializeSocket(server);

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 성능 모니터링
const performanceMonitor = require('./middleware/performanceMonitor');
app.use(performanceMonitor);

// Rate Limiting
const { apiLimiter } = require('./middleware/rateLimiter');
app.use('/api', apiLimiter);

// 인입(워치/미니앱/클라우드) 수집 API
app.use('/api/ingest', require('./api/ingest'));
app.use('/api/zepp', require('./api/zepp'));
app.use('/api/users', require('./api/users'));
app.use('/api/paramedics', require('./api/paramedics'));
app.use('/api/emergency', require('./api/emergency'));
app.use('/api/controllers', require('./api/controllers'));
app.use('/api/hospital-mode', require('./api/hospitalMode'));
app.use('/api/emergency-hospital', require('./api/emergencyHospital'));
app.use('/api/stats', require('./api/stats'));
app.use('/api/auto-learning', require('./api/autoLearning'));
app.use('/api/medical-labeling', require('./api/medicalLabeling'));
app.use('/api/emergency-workflow', require('./api/emergencyWorkflow'));
app.use('/api/feedback', require('./api/feedback'));
app.use('/api/quality', require('./api/qualityManagement'));
app.use('/api/realtime-biosignal', require('./api/realtimeBiosignal'));
app.use('/api/hospital-matching', require('./api/hospitalMatching'));
app.use('/api/system-monitoring', require('./api/systemMonitoring'));

// Swagger API 문서
if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  logger.info('Swagger API 문서 활성화: /api-docs');
}

// Health check
/**
 * @swagger
 * /health:
 *   get:
 *     summary: 서버 상태 확인
 *     tags: [System]
 *     responses:
 *       200:
 *         description: 서버가 정상 작동 중
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 memory:
 *                   type: object
 *                 database:
 *                   type: object
 */
app.get('/health', async (req, res) => {
  const mongoose = require('mongoose');
  const memoryUsage = process.memoryUsage();
  
  const healthData = {
    status: 'ok',
    message: '골든타임 LLM 서버가 정상 작동 중입니다.',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      name: mongoose.connection.name
    },
    environment: process.env.NODE_ENV || 'development'
  };

  // 데이터베이스 연결 상태에 따라 상태 코드 결정
  const statusCode = mongoose.connection.readyState === 1 ? 200 : 503;
  res.status(statusCode).json(healthData);
});

// API 라우트
// app.use('/api/users', require('./api/users'));
// app.use('/api/biometric', require('./api/biometric'));
// app.use('/api/emergency', require('./api/emergency'));
// app.use('/api/paramedic', require('./api/paramedic'));
// app.use('/api/hospital', require('./api/hospital'));
// app.use('/api/controller', require('./api/controller'));

// 에러 핸들링
const { createErrorResponse } = require('./utils/errorHandler');
app.use((err, req, res, next) => {
  logger.error('서버 오류 발생', err, {
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  const { statusCode, response } = createErrorResponse(err, req);
  res.status(statusCode).json(response);
});

// 404 핸들링
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.'
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info('서버 시작', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    websocket: '활성화됨'
  });
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📡 WebSocket 실시간 통신 활성화됨`);
});

module.exports = { app, server };
