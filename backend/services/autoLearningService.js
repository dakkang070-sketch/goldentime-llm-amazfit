/**
 * 완전 자동 학습 서비스
 * 실시간 데이터 수집 → 자동 재훈련 → 성능 검증 → 자동 배포
 */

const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

const {
  collectBatchTrainingData,
  validateTrainingData,
} = require("./fineTuningService");
const EmergencyCase = require("../models/EmergencyCase");
const logger = require("../utils/logger");

// 설정
const AUTO_LEARNING_CONFIG = {
  // 재훈련 임계치
  MIN_NEW_DATA_THRESHOLD: 50, // 최소 50개 새 데이터
  MAX_DATA_THRESHOLD: 1000, // 최대 1000개로 제한

  // 자동 실행 스케줄
  CRON_SCHEDULE: "0 2 * * *", // 매일 새벽 2시

  // 성능 검증 임계치
  MIN_ACCURACY_THRESHOLD: 0.8, // 최소 80% 정확도

  // 모델 백업 보관 수
  MAX_MODEL_BACKUPS: 5,

  // 안전 장치
  ENABLE_AUTO_DEPLOY: process.env.ENABLE_AUTO_DEPLOY === "true", // 자동 배포 활성화
  ENABLE_ROLLBACK: true, // 자동 롤백 활성화
};

class AutoLearningService {
  constructor() {
    this.isTraining = false;
    this.newDataCounter = 0;
    this.lastTrainingTime = null;
    this.modelPerformanceHistory = [];
  }

  /**
   * 외부 파일에서 학습 데이터 로드 (랜덤 생성 데이터 등)
   */
  loadExternalTrainingData() {
    const externalPath = path.join(
      process.cwd(),
      "backend/processed_data/alcohol/llm_training_data.jsonl",
    );
    if (!fs.existsSync(externalPath)) {
      return [];
    }

    try {
      const fileContent = fs.readFileSync(externalPath, "utf8");
      const lines = fileContent.split("\n").filter((line) => line.trim());

      // 데이터가 너무 많으면 최신 데이터 위주로 일부만 로드 (예: 1000개)
      const recentLines = lines.slice(-1000);

      const externalData = recentLines
        .map((line) => {
          try {
            const item = JSON.parse(line);
            return {
              input: item.prompt,
              output: item.response,
              source: "external_random_data",
            };
          } catch (e) {
            return null;
          }
        })
        .filter((item) => item !== null);

      logger.info(
        `📄 외부 데이터 ${externalData.length}개 로드됨 (총 ${lines.length}개 중)`,
      );
      return externalData;
    } catch (error) {
      logger.error("외부 데이터 로드 실패", error);
      return [];
    }
  }

  /**
   * 자동 학습 시스템 시작
   */
  start() {
    logger.info("🚀 완전 자동 학습 시스템 시작");

    // 1. 스케줄링된 배치 학습
    this.scheduleBatchLearning();

    // 2. 실시간 증분 학습 모니터링 시작
    this.startIncrementalLearningMonitor();

    logger.info(`📅 배치 학습 스케줄: ${AUTO_LEARNING_CONFIG.CRON_SCHEDULE}`);
    logger.info(
      `📊 실시간 학습 임계치: ${AUTO_LEARNING_CONFIG.MIN_NEW_DATA_THRESHOLD}개`,
    );
  }

  /**
   * 매일 자정 배치 학습 스케줄링
   */
  scheduleBatchLearning() {
    cron.schedule(AUTO_LEARNING_CONFIG.CRON_SCHEDULE, async () => {
      try {
        await this.executeBatchLearning();
      } catch (error) {
        logger.error("배치 학습 실패", error);
      }
    });
  }

  /**
   * 실시간 증분 학습 모니터링
   */
  startIncrementalLearningMonitor() {
    // 5분마다 새 데이터 확인
    cron.schedule("*/5 * * * *", async () => {
      if (this.isTraining) return;

      try {
        const newDataCount = await this.getNewDataCount();

        if (newDataCount >= AUTO_LEARNING_CONFIG.MIN_NEW_DATA_THRESHOLD) {
          logger.info(`🔄 증분 학습 트리거: ${newDataCount}개 새 데이터`);
          await this.executeIncrementalLearning();
        }
      } catch (error) {
        logger.error("증분 학습 모니터링 실패", error);
      }
    });
  }

  /**
   * 새로운 데이터 개수 확인
   */
  async getNewDataCount() {
    const lastTrainingTime =
      this.lastTrainingTime || new Date(Date.now() - 24 * 60 * 60 * 1000);

    const count = await EmergencyCase.countDocuments({
      "llmAnalysis.analysisText": { $exists: true },
      emergencyLevel: { $gte: 3 },
      detectedAt: { $gte: lastTrainingTime },
    });

    return count;
  }

  /**
   * 배치 학습 실행
   */
  async executeBatchLearning() {
    if (this.isTraining) {
      logger.warn("⚠️ 이미 훈련 중입니다. 건너뜁니다.");
      return;
    }

    logger.info("🎯 배치 학습 시작");
    this.isTraining = true;

    try {
      // 1. 데이터 수집 및 전처리
      const trainingData = await this.prepareTrainingData();

      if (trainingData.length < AUTO_LEARNING_CONFIG.MIN_NEW_DATA_THRESHOLD) {
        logger.info(
          `📊 데이터 부족: ${trainingData.length}개 (최소: ${AUTO_LEARNING_CONFIG.MIN_NEW_DATA_THRESHOLD}개)`,
        );
        return;
      }

      // 2. 모델 백업
      await this.backupCurrentModel();

      // 3. 재훈련 실행
      const newModelName = await this.trainNewModel(trainingData);

      // 4. 성능 검증
      const performance = await this.validateModelPerformance(newModelName);

      // 5. 자동 배포 또는 롤백
      if (performance.accuracy >= AUTO_LEARNING_CONFIG.MIN_ACCURACY_THRESHOLD) {
        if (AUTO_LEARNING_CONFIG.ENABLE_AUTO_DEPLOY) {
          await this.deployNewModel(newModelName);
          logger.info(
            `✅ 배치 학습 완료 및 자동 배포: 정확도 ${performance.accuracy * 100}%`,
          );
        } else {
          logger.info(
            `✅ 배치 학습 완료 (수동 배포 대기): 정확도 ${performance.accuracy * 100}%`,
          );
        }
      } else {
        await this.rollbackModel();
        logger.warn(
          `❌ 성능 기준 미달 (${performance.accuracy * 100}% < ${AUTO_LEARNING_CONFIG.MIN_ACCURACY_THRESHOLD * 100}%). 롤백 완료.`,
        );
      }

      this.lastTrainingTime = new Date();
      this.modelPerformanceHistory.push({
        timestamp: new Date(),
        dataCount: trainingData.length,
        accuracy: performance.accuracy,
        deployed:
          performance.accuracy >= AUTO_LEARNING_CONFIG.MIN_ACCURACY_THRESHOLD &&
          AUTO_LEARNING_CONFIG.ENABLE_AUTO_DEPLOY,
      });
    } catch (error) {
      logger.error("배치 학습 실패", error);
      if (AUTO_LEARNING_CONFIG.ENABLE_ROLLBACK) {
        await this.rollbackModel();
      }
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * 증분 학습 실행 (더 가벼운 버전)
   */
  async executeIncrementalLearning() {
    this.isTraining = true;

    try {
      logger.info("⚡ 증분 학습 시작");

      // 증분 학습은 기존 모델에 새 데이터만 추가 학습
      const newData = await this.getNewTrainingData();

      if (newData.length >= AUTO_LEARNING_CONFIG.MIN_NEW_DATA_THRESHOLD) {
        const newModelName = await this.trainIncrementalModel(newData);
        const performance = await this.validateModelPerformance(newModelName);

        if (
          performance.accuracy >= AUTO_LEARNING_CONFIG.MIN_ACCURACY_THRESHOLD
        ) {
          if (AUTO_LEARNING_CONFIG.ENABLE_AUTO_DEPLOY) {
            await this.deployNewModel(newModelName);
            logger.info(
              `⚡ 증분 학습 완료 및 배포: 정확도 ${performance.accuracy * 100}%`,
            );
          }
        }

        this.lastTrainingTime = new Date();
      }
    } catch (error) {
      logger.error("증분 학습 실패", error);
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * 훈련 데이터 준비
   */
  async prepareTrainingData() {
    logger.info("📊 훈련 데이터 수집 중...");

    let data = await collectBatchTrainingData(
      AUTO_LEARNING_CONFIG.MAX_DATA_THRESHOLD,
    );

    // 외부 데이터(랜덤 생성 데이터) 추가
    const externalData = this.loadExternalTrainingData();
    if (externalData.length > 0) {
      data = [...data, ...externalData];
      // 최대 개수 제한 다시 적용 (랜덤 샘플링)
      if (data.length > AUTO_LEARNING_CONFIG.MAX_DATA_THRESHOLD) {
        data = data
          .sort(() => 0.5 - Math.random())
          .slice(0, AUTO_LEARNING_CONFIG.MAX_DATA_THRESHOLD);
      }
    }

    // 데이터 품질 검증
    const validData = [];
    for (const item of data) {
      const validation = validateTrainingData(item);
      if (validation.valid) {
        validData.push(item);
      } else {
        logger.warn("데이터 품질 문제", {
          reason: validation.reason,
          input: item.input?.substring(0, 50),
        });
      }
    }

    logger.info(
      `📊 유효한 훈련 데이터: ${validData.length}개 (전체: ${data.length}개)`,
    );

    // 업데이트된 데이터셋 저장
    const outputPath = path.join(
      process.cwd(),
      "backend/data/fine-tuning-dataset-auto.json",
    );
    fs.writeFileSync(outputPath, JSON.stringify(validData, null, 2), "utf8");

    return validData;
  }

  /**
   * 새로운 모델 훈련
   */
  async trainNewModel(trainingData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const newModelName = `goldentime-emergency:auto-${timestamp}`;

    logger.info(`🔨 새 모델 훈련 시작: ${newModelName}`);

    try {
      // 새 Modelfile 생성 (데이터에 맞춰 최적화)
      await this.generateOptimizedModelfile(trainingData);

      // Ollama를 통한 모델 생성
      const { stdout, stderr } = await execAsync(
        `cd backend/data && ollama create ${newModelName} -f Modelfile`,
        { timeout: 600000 }, // 10분 타임아웃
      );

      logger.info("모델 생성 완료", { stdout: stdout.substring(0, 200) });

      return newModelName;
    } catch (error) {
      logger.error("모델 훈련 실패", error);
      throw error;
    }
  }

  /**
   * 증분 모델 훈련 (기존 모델 기반)
   */
  async trainIncrementalModel(newData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const incrementalModelName = `goldentime-emergency:incr-${timestamp}`;

    logger.info(`⚡ 증분 모델 훈련: ${incrementalModelName}`);

    // 기존 데이터와 새 데이터 결합
    const existingDataPath = path.join(
      process.cwd(),
      "backend/data/fine-tuning-dataset-combined.json",
    );
    let existingData = [];

    if (fs.existsSync(existingDataPath)) {
      existingData = JSON.parse(fs.readFileSync(existingDataPath, "utf8"));
    }

    const combinedData = [...existingData, ...newData];

    // 중복 제거
    const uniqueData = combinedData.filter(
      (item, index, array) =>
        array.findIndex((i) => i.input === item.input) === index,
    );

    // 업데이트된 데이터셋 저장
    fs.writeFileSync(
      existingDataPath,
      JSON.stringify(uniqueData, null, 2),
      "utf8",
    );

    return await this.trainNewModel(uniqueData);
  }

  /**
   * 모델 성능 검증
   */
  async validateModelPerformance(modelName) {
    logger.info(`🧪 모델 성능 검증: ${modelName}`);

    try {
      // 테스트 케이스 실행
      const testCases = [
        {
          input:
            "기초선 심박수: 70 bpm, 현재 심박수: 45 bpm, 스트레스: 85, 움직임: 정상, 위치: 서울시 강남구",
          expectedKeywords: ["심박수", "낮", "권고", "확인"],
        },
        {
          input:
            "기초선 심박수: 70 bpm, 현재 심박수: 160 bpm, 스트레스: 95, 움직임: 낙상 감지, 위치: 서울시 서초구",
          expectedKeywords: ["낙상", "급격", "즉시", "출동"],
        },
      ];

      let correctPredictions = 0;

      for (const testCase of testCases) {
        const { stdout } = await execAsync(
          `ollama run ${modelName} "${testCase.input}"`,
          { timeout: 30000 },
        );

        const output = stdout.toLowerCase();
        const keywordMatches = testCase.expectedKeywords.filter((keyword) =>
          output.includes(keyword.toLowerCase()),
        ).length;

        if (keywordMatches >= testCase.expectedKeywords.length * 0.7) {
          correctPredictions++;
        }
      }

      const accuracy = correctPredictions / testCases.length;

      logger.info(
        `🧪 성능 검증 결과: ${accuracy * 100}% (${correctPredictions}/${testCases.length})`,
      );

      return { accuracy, correctPredictions, totalTests: testCases.length };
    } catch (error) {
      logger.error("성능 검증 실패", error);
      return { accuracy: 0, error: error.message };
    }
  }

  /**
   * 현재 모델 백업
   */
  async backupCurrentModel() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `goldentime-emergency:backup-${timestamp}`;

    try {
      await execAsync(`ollama cp goldentime-emergency:latest ${backupName}`);
      logger.info(`💾 모델 백업 완료: ${backupName}`);

      // 오래된 백업 삭제
      await this.cleanupOldBackups();
    } catch (error) {
      logger.warn("모델 백업 실패", error);
    }
  }

  /**
   * 새 모델 배포
   */
  async deployNewModel(newModelName) {
    logger.info(`🚀 새 모델 배포: ${newModelName}`);

    try {
      // 기존 latest 태그를 백업으로 이동
      await execAsync(
        `ollama cp goldentime-emergency:latest goldentime-emergency:previous`,
      );

      // 새 모델을 latest로 태그
      await execAsync(`ollama cp ${newModelName} goldentime-emergency:latest`);

      logger.info("✅ 모델 배포 완료");

      // 애플리케이션 재시작 필요 시 여기에 추가
      // await this.restartApplication();
    } catch (error) {
      logger.error("모델 배포 실패", error);
      throw error;
    }
  }

  /**
   * 모델 롤백
   */
  async rollbackModel() {
    if (!AUTO_LEARNING_CONFIG.ENABLE_ROLLBACK) {
      logger.warn("롤백이 비활성화되어 있습니다.");
      return;
    }

    logger.warn("🔄 모델 롤백 시작");

    try {
      await execAsync(
        `ollama cp goldentime-emergency:previous goldentime-emergency:latest`,
      );
      logger.info("✅ 모델 롤백 완료");
    } catch (error) {
      logger.error("모델 롤백 실패", error);
    }
  }

  /**
   * 최적화된 Modelfile 생성
   */
  async generateOptimizedModelfile(trainingData) {
    const modelfilePath = path.join(process.cwd(), "backend/data/Modelfile");

    // 데이터 특성에 맞춰 동적 프롬프트 생성
    const emergencyLevels = this.analyzeDataDistribution(trainingData);

    const optimizedModelfile = `# 골든타임 LLM 자동 최적화 모델 - 생성시각: ${new Date().toISOString()}
FROM llama3.1:8b

SYSTEM """너는 응급구조사가 참고할 "상황 요약"을 작성하는 전문가입니다.

학습된 데이터 통계:
- 총 케이스: ${trainingData.length}개
- 위급 케이스: ${emergencyLevels.critical}개
- 주의 케이스: ${emergencyLevels.warning}개

중요 규칙:
1. 절대 의료적 진단/확정/질병명 단정 금지
2. '가능성', '의심', '권고', '추가 확인 필요' 같은 표현 사용
3. 행동 권고는 "관제 확인/보호자 확인/응급구조사 출동 권고" 수준으로 제한
4. 결과는 한국어로, 3~6문장 이내
5. 기초선 데이터와 현재 데이터를 비교하여 변화를 분석
6. 심박수, 스트레스, 움직임 상태를 종합적으로 고려
7. 응급도에 따라 적절한 대응 수준을 제시

응급도 판정 기준:
- 1단계: 정상 범위, 계속 모니터링
- 2단계: 약간의 이상 징후, 추적 모니터링 필요
- 3단계: 이상 징후 가능성 높음, 관제 확인 권고
- 4단계: 위급 가능성, 신속한 확인/대응 필요
- 5단계: 응급 가능성 매우 높음, 즉시 대응 필요

항상 객관적이고 신중한 표현을 사용하며, 확정적인 진단을 피하세요."""

PARAMETER temperature 0.2
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx 4096`;

    fs.writeFileSync(modelfilePath, optimizedModelfile, "utf8");
    logger.info("📝 최적화된 Modelfile 생성 완료");
  }

  /**
   * 데이터 분포 분석
   */
  analyzeDataDistribution(trainingData) {
    let critical = 0;
    let warning = 0;

    trainingData.forEach((item) => {
      const output = item.output.toLowerCase();
      if (
        output.includes("즉시") ||
        output.includes("위급") ||
        output.includes("생명")
      ) {
        critical++;
      } else if (output.includes("권고") || output.includes("확인")) {
        warning++;
      }
    });

    return {
      critical,
      warning,
      normal: trainingData.length - critical - warning,
    };
  }

  /**
   * 새로운 훈련 데이터 조회
   */
  async getNewTrainingData() {
    const lastTrainingTime =
      this.lastTrainingTime || new Date(Date.now() - 60 * 60 * 1000);

    const newCases = await EmergencyCase.find({
      "llmAnalysis.analysisText": { $exists: true },
      emergencyLevel: { $gte: 3 },
      detectedAt: { $gte: lastTrainingTime },
    })
      .populate("userId", "baselineBiometric")
      .limit(100);

    return await collectBatchTrainingData(100);
  }

  /**
   * 오래된 백업 정리
   */
  async cleanupOldBackups() {
    try {
      const { stdout } = await execAsync(
        'ollama list | grep "goldentime-emergency:backup-"',
      );
      const backupModels = stdout
        .split("\n")
        .filter((line) => line.includes("goldentime-emergency:backup-"))
        .map((line) => line.split(/\s+/)[0])
        .sort()
        .reverse();

      if (backupModels.length > AUTO_LEARNING_CONFIG.MAX_MODEL_BACKUPS) {
        const modelsToDelete = backupModels.slice(
          AUTO_LEARNING_CONFIG.MAX_MODEL_BACKUPS,
        );

        for (const model of modelsToDelete) {
          await execAsync(`ollama rm ${model}`);
          logger.info(`🗑️ 오래된 백업 삭제: ${model}`);
        }
      }
    } catch (error) {
      logger.warn("백업 정리 실패", error);
    }
  }

  /**
   * 학습 통계 조회
   */
  getTrainingStats() {
    return {
      isTraining: this.isTraining,
      lastTrainingTime: this.lastTrainingTime,
      totalTrainingRuns: this.modelPerformanceHistory.length,
      averageAccuracy:
        this.modelPerformanceHistory.length > 0
          ? this.modelPerformanceHistory.reduce(
              (sum, h) => sum + h.accuracy,
              0,
            ) / this.modelPerformanceHistory.length
          : 0,
      recentHistory: this.modelPerformanceHistory.slice(-10),
    };
  }
}

// 싱글톤 인스턴스
const autoLearningService = new AutoLearningService();

module.exports = autoLearningService;
