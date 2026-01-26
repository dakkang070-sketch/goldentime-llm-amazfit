/**
 * 음주 탐지 서비스
 * Amazfit 생체데이터 기반 음주 상태 실시간 분석
 * Time-series Transformer + LoRA 파인튜닝 LLM
 */

const tf = require("@tensorflow/tfjs-node");
const axios = require("axios");
const logger = require("../utils/logger");
const BiometricData = require("../models/BiometricData");
const AlcoholBaseline = require("../models/AlcoholBaseline");
const User = require("../models/User");

class AlcoholDetectionService {
  constructor() {
    this.model = null;
    this.ollamaModel = "goldentime-alcohol:latest";
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.isModelLoaded = false;

    // 음주 탐지 임계값 설정
    this.thresholds = {
      hr_increase: 20, // 평균 심박수 대비 +20 이상
      hrv_decrease: 30, // HRV 30% 이상 감소
      stress_increase: 25, // 스트레스 지수 +25 이상
      temp_increase: 0.8, // 체온 0.8도 이상 상승
    };

    logger.info("🍷 음주 탐지 서비스 초기화");
  }

  /**
   * 서비스 초기화 - Transformer 모델 로드
   */
  async initialize() {
    try {
      logger.info("⚡ 음주 탐지 Transformer 모델 로딩...");

      // Time-series Transformer 모델 로드
      await this.loadTransformerModel();

      // 음주 전용 LLM 상태 확인
      await this.checkAlcoholLLM();

      this.isModelLoaded = true;
      logger.info("✅ 음주 탐지 시스템 준비 완료");
    } catch (error) {
      logger.error("❌ 음주 탐지 초기화 실패", error);
      throw error;
    }
  }

  /**
   * Time-series Transformer 모델 로드
   */
  async loadTransformerModel() {
    try {
      // 사전 훈련된 모델이 있으면 로드, 없으면 새로 생성
      const modelPath = "./weights/alcohol_transformer.json";

      try {
        this.model = await tf.loadLayersModel(modelPath);
        logger.info("✅ 기존 음주 탐지 모델 로드");
      } catch {
        logger.info("🔧 새로운 음주 탐지 모델 생성");
        this.model = this.createTransformerModel();
      }
    } catch (error) {
      logger.error("❌ Transformer 모델 로드 실패", error);
      throw error;
    }
  }

  /**
   * Time-series Transformer 모델 생성
   * 입력: (batch, 20, 6) → 출력: (batch, 128) embedding
   */
  createTransformerModel() {
    const input = tf.input({ shape: [20, 6], name: "biometric_sequence" }); // 20 timesteps, 6 features

    // Positional Encoding
    const posEncoded = tf.layers
      .dense({
        units: 128,
        activation: "linear",
        name: "positional_encoding",
      })
      .apply(input);

    // Multi-head Attention Layers (8 heads, 4 layers)
    let attention = posEncoded;

    for (let i = 0; i < 4; i++) {
      const multiHeadAttention = tf.layers.multiHeadAttention({
        numHeads: 8,
        keyDim: 16,
        name: `multi_head_attention_${i}`,
      });

      attention = multiHeadAttention.apply([attention, attention]);

      // Add & Norm
      const norm = tf.layers.layerNormalization({ name: `layer_norm_${i}` });
      attention = norm.apply(tf.layers.add().apply([posEncoded, attention]));

      // Feed Forward
      const ff = tf.layers.dense({
        units: 256,
        activation: "relu",
        name: `feed_forward_${i}_1`,
      });

      const ff2 = tf.layers.dense({
        units: 128,
        name: `feed_forward_${i}_2`,
      });

      let feedForward = ff2.apply(ff.apply(attention));
      attention = norm.apply(tf.layers.add().apply([attention, feedForward]));
    }

    // Global Average Pooling
    const pooled = tf.layers
      .globalAveragePooling1d({ name: "global_avg_pooling" })
      .apply(attention);

    // Classification Head
    const dense1 = tf.layers
      .dense({ units: 64, activation: "relu", name: "classifier_1" })
      .apply(pooled);
    const dropout = tf.layers
      .dropout({ rate: 0.3, name: "dropout" })
      .apply(dense1);
    const output = tf.layers
      .dense({ units: 2, activation: "softmax", name: "alcohol_prediction" })
      .apply(dropout);

    const model = tf.model({ inputs: input, outputs: output });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    });

    logger.info("🏗️ 음주 탐지 Transformer 모델 생성 완료");
    return model;
  }

  /**
   * 음주 전용 LLM 상태 확인
   */
  async checkAlcoholLLM() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      const models = response.data.models || [];

      const hasAlcoholModel = models.some((m) =>
        m.name.includes("goldentime-alcohol"),
      );

      if (!hasAlcoholModel) {
        logger.warn("⚠️ 음주 전용 LLM 미발견, 기본 모델 사용");
        this.ollamaModel = "llama3.1:8b";
      } else {
        logger.info("✅ 음주 전용 LLM 연결 완료");
      }
    } catch (error) {
      logger.warn("⚠️ LLM 상태 확인 실패, 기본 설정 사용");
    }
  }

  /**
   * 음주 상태 탐지 메인 함수
   * @param {Object} biometricData - 실시간 생체데이터
   * @param {Object} userBaseline - 사용자 베이스라인
   */
  async detectAlcohol(biometricData, userBaseline) {
    try {
      logger.info("🍷 음주 상태 분석 시작");

      // 사용자 의료 정보 조회
      const user = await User.findById(biometricData.userId).select(
        "medicalHistory age gender",
      );
      const medicalHistory = user ? user.medicalHistory : null;

      // 1단계: 베이스라인 대비 생체데이터 변화 분석
      const deviationAnalysis = await this.analyzeBaselineDeviation(
        biometricData,
        userBaseline,
      );

      // 2단계: Time-series Transformer 예측
      const transformerPrediction =
        await this.runTransformerAnalysis(biometricData);

      // 3단계: LLM 기반 종합 분석
      const llmAnalysis = await this.runLLMAnalysis(
        biometricData,
        userBaseline,
        deviationAnalysis,
        medicalHistory,
      );

      // 4단계: 최종 결과 통합
      const finalResult = this.integratePredictions({
        deviation: deviationAnalysis,
        transformer: transformerPrediction,
        llm: llmAnalysis,
      });

      // 5단계: 신뢰도 및 설명 생성
      const confidence = this.calculateConfidence(finalResult);
      const explanation = this.generateExplanation(
        finalResult,
        biometricData,
        userBaseline,
      );

      // 위험/응급 단계일 때만 관제 모니터링 알림
      const requires_emergency_response =
        finalResult.alcohol_level === "danger" ||
        finalResult.alcohol_level === "critical";

      return {
        detected: finalResult.alcohol_detected,
        confidence: confidence,
        severity: finalResult.alcohol_level, // 'normal', 'caution', 'warning', 'danger', 'critical'
        requires_emergency_response: requires_emergency_response, // 관제 모니터링 및 출동 필요 여부
        evidence: finalResult.evidence,
        explanation: explanation,
        recommendation: this.generateRecommendation(finalResult),
        timestamp: new Date().toISOString(),
        raw_data: {
          baseline_deviation: deviationAnalysis,
          transformer_score: transformerPrediction,
          llm_analysis: llmAnalysis,
        },
      };
    } catch (error) {
      logger.error("❌ 음주 탐지 분석 실패", error);
      throw error;
    }
  }

  /**
   * 베이스라인 대비 편차 분석
   */
  async analyzeBaselineDeviation(biometricData, userBaseline) {
    const deviations = {
      hr_change: 0,
      hrv_change: 0,
      stress_change: 0,
      temp_change: 0,
      motion_change: 0,
    };

    // 심박수 변화율 계산
    if (userBaseline.hr_mean) {
      deviations.hr_change =
        ((biometricData.heartRate - userBaseline.hr_mean) /
          userBaseline.hr_mean) *
        100;
    }

    // HRV 변화율 계산
    if (userBaseline.hrv_mean && biometricData.hrv) {
      deviations.hrv_change =
        ((biometricData.hrv - userBaseline.hrv_mean) / userBaseline.hrv_mean) *
        100;
    }

    // 스트레스 변화
    if (userBaseline.stress_mean) {
      deviations.stress_change =
        biometricData.stressLevel - userBaseline.stress_mean;
    }

    // 체온 변화
    if (userBaseline.temp_mean && biometricData.bodyTemperature) {
      deviations.temp_change =
        biometricData.bodyTemperature - userBaseline.temp_mean;
    }

    // 음주 징후 플래그 설정
    const flags = {
      hr_elevated: deviations.hr_change > this.thresholds.hr_increase,
      hrv_decreased: deviations.hrv_change < -this.thresholds.hrv_decrease,
      stress_elevated:
        deviations.stress_change > this.thresholds.stress_increase,
      temp_elevated: deviations.temp_change > this.thresholds.temp_increase,
    };

    const flagCount = Object.values(flags).filter(Boolean).length;

    return {
      deviations,
      flags,
      anomaly_score: flagCount / Object.keys(flags).length, // 0-1 스케일
      likely_alcohol: flagCount >= 2, // 2개 이상 징후시 음주 의심
    };
  }

  /**
   * Transformer 기반 시계열 분석
   */
  async runTransformerAnalysis(biometricData) {
    if (!this.model) {
      logger.warn("⚠️ Transformer 모델 없음, 기본 점수 반환");
      return { alcohol_probability: 0.5, confidence: 0.3 };
    }

    try {
      // 시계열 데이터 준비 (최근 20개 timesteps)
      const sequenceData = await this.prepareSequenceData(biometricData);

      if (sequenceData.length < 20) {
        logger.warn("⚠️ 시계열 데이터 부족, 단일 시점 분석");
        return { alcohol_probability: 0.4, confidence: 0.2 };
      }

      // Tensor 변환
      const inputTensor = tf.tensor3d([sequenceData], [1, 20, 6]);

      // 예측 실행
      const prediction = this.model.predict(inputTensor);
      const probabilities = await prediction.data();

      // 메모리 정리
      inputTensor.dispose();
      prediction.dispose();

      return {
        alcohol_probability: probabilities[1], // 음주 확률
        normal_probability: probabilities[0], // 정상 확률
        confidence: Math.max(...probabilities),
      };
    } catch (error) {
      logger.error("❌ Transformer 분석 실패", error);
      return { alcohol_probability: 0.5, confidence: 0.1 };
    }
  }

  /**
   * LLM 기반 종합 분석
   */
  async runLLMAnalysis(
    biometricData,
    userBaseline,
    deviationAnalysis,
    medicalHistory,
  ) {
    // 의료 정보 포맷팅
    let medicalContext = "특이사항 없음";
    if (medicalHistory) {
      const medications =
        medicalHistory.medications
          ?.map((m) => `${m.name}(${m.dosage})`)
          .join(", ") || "없음";
      const diseases =
        medicalHistory.chronicDiseases?.map((d) => d.disease).join(", ") ||
        "없음";
      medicalContext = `
- 복용 약물: ${medications}
- 기저 질환: ${diseases}
- 알레르기: ${medicalHistory.allergies?.map((a) => a.substance).join(", ") || "없음"}
`.trim();
    }

    const prompt = `
음주 상태 분석 요청:

=== 사용자 베이스라인 ===
평균 심박수: ${userBaseline.hr_mean || "N/A"}bpm
평균 HRV: ${userBaseline.hrv_mean || "N/A"}ms  
평균 스트레스: ${userBaseline.stress_mean || "N/A"}/100
평균 체온: ${userBaseline.temp_mean || "N/A"}°C

=== 사용자 의료 정보 ===
${medicalContext}

=== 현재 생체데이터 ===
심박수: ${biometricData.heartRate}bpm (변화: ${deviationAnalysis.deviations.hr_change.toFixed(1)}%)
스트레스: ${biometricData.stressLevel}/100 (변화: +${deviationAnalysis.deviations.stress_change})
체온: ${biometricData.bodyTemperature || "N/A"}°C (변화: +${deviationAnalysis.deviations.temp_change.toFixed(1)}°C)
움직임: ${biometricData.movementStatus}

=== 음주 징후 분석 ===
심박수 증가: ${deviationAnalysis.flags.hr_elevated ? "✓ 감지됨" : "✗ 정상"}
HRV 감소: ${deviationAnalysis.flags.hrv_decreased ? "✓ 감지됨" : "✗ 정상"}  
스트레스 증가: ${deviationAnalysis.flags.stress_elevated ? "✓ 감지됨" : "✗ 정상"}
체온 상승: ${deviationAnalysis.flags.temp_elevated ? "✓ 감지됨" : "✗ 정상"}

위 생체데이터와 의료 정보를 종합하여 의학적 기준에 따라 5단계로 음주 상태를 판정해주세요.

판정 기준:
1. 정상 (Normal): 특이사항 없음, 베이스라인 범위 내
2. 주의 (Caution): 경미한 생체신호 변화, 초기 음주 징후 (추정 혈중알코올농도 0.03-0.08%)
3. 경고 (Warning): 뚜렷한 음주 징후, 판단력 저하 예상 (추정 혈중알코올농도 0.08-0.15%)
4. 위험 (Danger): 심각한 생체신호 이탈, 운동능력 상실 (추정 혈중알코올농도 0.15-0.25%)
5. 응급 (Critical): 생명 위협 가능성, 의식 소실 위험, 급성 알코올 중독 (추정 혈중알코올농도 > 0.25%)

응답 형식: "음주상태: [정상/주의/경고/위험/응급] | 근거: [상세분석] | 신뢰도: [0.0-1.0]"
`;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.2,
          top_p: 0.9,
          num_predict: 150,
        },
      });

      const analysis = response.data.response;
      return this.parseAlcoholAnalysis(analysis);
    } catch (error) {
      logger.error("❌ 음주 LLM 분석 실패", error);
      return {
        alcohol_level: "unknown",
        reasoning: "분석 실패",
        confidence: 0.1,
      };
    }
  }

  /**
   * LLM 응답 파싱
   */
  parseAlcoholAnalysis(analysis) {
    const result = {
      alcohol_level: "normal",
      reasoning: analysis,
      confidence: 0.5,
    };

    // 음주 상태 추출 (5단계)
    if (analysis.includes("응급") || analysis.includes("Critical")) {
      result.alcohol_level = "critical";
      result.confidence = 0.95;
    } else if (
      analysis.includes("위험") ||
      analysis.includes("Danger") ||
      analysis.includes("심각")
    ) {
      result.alcohol_level = "danger";
      result.confidence = 0.9;
    } else if (
      analysis.includes("경고") ||
      analysis.includes("Warning") ||
      analysis.includes("중등도")
    ) {
      result.alcohol_level = "warning";
      result.confidence = 0.8;
    } else if (
      analysis.includes("주의") ||
      analysis.includes("Caution") ||
      analysis.includes("경미")
    ) {
      result.alcohol_level = "caution";
      result.confidence = 0.7;
    } else if (analysis.includes("정상") || analysis.includes("Normal")) {
      result.alcohol_level = "normal";
      result.confidence = 0.9;
    }

    // 신뢰도 추출
    const confidenceMatch = analysis.match(/신뢰도:\s*([0-9]\.[0-9])/);
    if (confidenceMatch) {
      result.confidence = parseFloat(confidenceMatch[1]);
    }

    return result;
  }

  /**
   * 시계열 데이터 준비
   */
  async prepareSequenceData(currentData) {
    try {
      // 최근 20개 timesteps의 생체데이터 조회
      const recentData = await BiometricData.find({
        userId: currentData.userId,
      })
        .sort({ collectedAt: -1 })
        .limit(20);

      return recentData
        .reverse()
        .map((data) => [
          data.heartRate || 72,
          data.stressLevel || 20,
          data.bodyTemperature || 36.5,
          data.movementStatus === "stationary" ? 0 : 1,
          data.hrv || 45,
          data.oxygenLevel || 98,
        ]);
    } catch (error) {
      logger.error("❌ 시계열 데이터 준비 실패", error);
      return [];
    }
  }

  /**
   * 예측 결과 통합
   */
  integratePredictions({ deviation, transformer, llm }) {
    const weights = {
      deviation: 0.4,
      transformer: 0.35,
      llm: 0.25,
    };

    // 각 모델의 음주 확률 계산
    const deviationScore = deviation.anomaly_score;
    const transformerScore = transformer.alcohol_probability;
    const llmScore =
      llm.alcohol_level === "critical"
        ? 1.0
        : llm.alcohol_level === "danger"
          ? 0.9
          : llm.alcohol_level === "warning"
            ? 0.7
            : llm.alcohol_level === "caution"
              ? 0.4
              : 0.1; // normal

    // 가중 평균 계산
    const combinedScore =
      deviationScore * weights.deviation +
      transformerScore * weights.transformer +
      llmScore * weights.llm;

    // 임계값 기반 최종 판정 (의학적 5단계 기준)
    const alcohol_detected = combinedScore > 0.3; // 주의 단계 이상이면 감지로 판단

    let alcohol_level = "normal";
    if (combinedScore > 0.85) {
      alcohol_level = "critical";
    } else if (combinedScore > 0.7) {
      alcohol_level = "danger";
    } else if (combinedScore > 0.55) {
      alcohol_level = "warning";
    } else if (combinedScore > 0.3) {
      alcohol_level = "caution";
    }

    return {
      alcohol_detected,
      alcohol_level,
      combined_score: combinedScore,
      evidence: {
        baseline_flags: deviation.flags,
        transformer_confidence: transformer.confidence,
        llm_reasoning: llm.reasoning,
      },
    };
  }

  /**
   * 신뢰도 계산
   */
  calculateConfidence(result) {
    // 여러 모델의 일치도 기반 신뢰도 계산
    let confidence = 0.5;

    if (result.combined_score > 0.8 || result.combined_score < 0.2) {
      confidence = 0.9; // 명확한 결과
    } else if (result.combined_score > 0.7 || result.combined_score < 0.3) {
      confidence = 0.8; // 비교적 명확
    } else {
      confidence = 0.6; // 애매한 경계
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 설명 생성
   */
  generateExplanation(result, biometricData, userBaseline) {
    if (!result.alcohol_detected) {
      return "생체데이터가 정상 범위 내에 있으며 음주 징후가 발견되지 않았습니다.";
    }

    const explanations = [];

    if (result.evidence.baseline_flags.hr_elevated) {
      explanations.push(
        `심박수가 평상시보다 ${(((biometricData.heartRate - userBaseline.hr_mean) / userBaseline.hr_mean) * 100).toFixed(1)}% 증가`,
      );
    }

    if (result.evidence.baseline_flags.stress_elevated) {
      explanations.push(`스트레스 지수가 평상시보다 높게 측정`);
    }

    if (result.evidence.baseline_flags.temp_elevated) {
      explanations.push("체온 상승 감지");
    }

    return `음주 징후 감지: ${explanations.join(", ")}. ${result.alcohol_level} 수준의 음주 상태로 분석됩니다.`;
  }

  /**
   * 권장사항 생성
   */
  generateRecommendation(result) {
    if (!result.alcohol_detected) {
      return ["계속 모니터링 중", "정상 상태 유지"];
    }

    const recommendations = [];

    switch (result.alcohol_level) {
      case "critical":
        recommendations.push(
          "🚨 [응급] 중추신경계(CNS) 심각한 억제 및 호흡 부전 위험",
        );
        recommendations.push("즉시 119 신고 및 응급실 이송 필수");
        recommendations.push("기도 확보(Aspiration 방지) 및 체온 유지");
        break;

      case "danger":
        recommendations.push("🚨 [위험] 운동 실조(Ataxia) 및 인지 기능 마비");
        recommendations.push("보호자 호출 및 귀가 조치");
        recommendations.push("낙상 및 사고 위험 극도로 높음, 절대 운전 금지");
        break;

      case "warning":
        recommendations.push("⚠️ [경고] 판단력 저하 및 반응속도 지연");
        recommendations.push("추가 음주 즉시 중단 권고");
        recommendations.push("대중교통 이용 및 수분 섭취 필요");
        break;

      case "caution":
        recommendations.push(
          "⚠️ [주의] 경미한 생체신호 변화 및 초기 억제 반응",
        );
        recommendations.push("상태 변화 지속 모니터링");
        break;

      case "normal":
        recommendations.push("✅ 정상 상태");
        break;
    }

    return recommendations;
  }

  /**
   * 사용자 베이스라인 업데이트
   */
  async updateUserBaseline(userId, biometricData) {
    try {
      // 정상 상태의 데이터만 베이스라인에 포함
      const isNormalState =
        biometricData.heartRate >= 50 &&
        biometricData.heartRate <= 100 &&
        biometricData.stressLevel <= 30;

      if (!isNormalState) return;

      await AlcoholBaseline.findOneAndUpdate(
        { userId },
        {
          $push: {
            normal_data: {
              heartRate: biometricData.heartRate,
              stressLevel: biometricData.stressLevel,
              bodyTemperature: biometricData.bodyTemperature,
              timestamp: new Date(),
            },
          },
        },
        { upsert: true },
      );

      // 베이스라인 통계 재계산
      await this.recalculateBaseline(userId);
    } catch (error) {
      logger.error("❌ 베이스라인 업데이트 실패", error);
    }
  }

  /**
   * 베이스라인 통계 재계산
   */
  async recalculateBaseline(userId) {
    const baseline = await AlcoholBaseline.findOne({ userId });
    if (!baseline || !baseline.normal_data.length) return;

    const recentData = baseline.normal_data.slice(-100); // 최근 100개

    const stats = {
      hr_mean: this.calculateMean(recentData, "heartRate"),
      hr_std: this.calculateStd(recentData, "heartRate"),
      stress_mean: this.calculateMean(recentData, "stressLevel"),
      stress_std: this.calculateStd(recentData, "stressLevel"),
      temp_mean: this.calculateMean(recentData, "bodyTemperature"),
      temp_std: this.calculateStd(recentData, "bodyTemperature"),
      last_updated: new Date(),
    };

    await AlcoholBaseline.updateOne({ userId }, { $set: stats });
  }

  /**
   * 통계 계산 헬퍼 함수들
   */
  calculateMean(data, field) {
    const values = data.map((d) => d[field]).filter((v) => v != null);
    return values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0;
  }

  calculateStd(data, field) {
    const values = data.map((d) => d[field]).filter((v) => v != null);
    if (values.length < 2) return 0;

    const mean = this.calculateMean(data, field);
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

module.exports = AlcoholDetectionService;
