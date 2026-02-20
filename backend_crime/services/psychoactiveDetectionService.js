/**
 * 향정신성약물 탐지 서비스
 * STARMAX 생체데이터 기반 향정신성약물 사용 상태 실시간 분석
 * Time-series Transformer + LoRA 파인튜닝 LLM
 *
 * 향정신성약물 특징:
 * - 중추신경계 억제 (CNS Depression)
 * - 점진적 심박수 감소
 * - 움직임 활동성 급감
 * - 호흡 억제 경향
 * - 인지/반응 능력 저하
 */

const tf = require("@tensorflow/tfjs-node");
const axios = require("axios");
const logger = require("../utils/logger");
const BiometricData = require("../models/BiometricData");
const PsychoactiveBaseline = require("../models/PsychoactiveBaseline");
const User = require("../models/User");

class PsychoactiveDetectionService {
  constructor() {
    this.model = null;
    this.ollamaModel = "goldentime-psychoactive:latest";
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.isModelLoaded = false;

    // 향정신성약물 특화 임계값
    this.thresholds = {
      hr_decrease: 15, // 심박수 15% 이상 감소
      hr_gradual_decline: 0.8, // 점진적 감소 패턴 감지
      movement_reduction: 70, // 움직임 활동 70% 이상 감소
      respiratory_depression: 25, // 호흡수 25% 이상 감소
      response_delay: 2.0, // 반응시간 2배 이상 지연
      cognitive_impairment: 0.6, // 인지능력 저하 지수
    };

    // 향정신성약물 분류별 패턴
    this.psychoactivePatterns = {
      benzodiazepines: {
        // 벤조디아제핀 (자낙스, 아티반 등)
        hr_pattern: "gradual_decrease_moderate",
        movement_pattern: "significant_reduction",
        cognitive_pattern: "moderate_impairment",
        respiratory_pattern: "mild_depression",
      },
      barbiturates: {
        // 바르비튜레이트
        hr_pattern: "severe_decrease",
        movement_pattern: "severe_reduction",
        cognitive_pattern: "severe_impairment",
        respiratory_pattern: "severe_depression",
      },
      z_drugs: {
        // 졸피뎀, 조피클론 등 수면제
        hr_pattern: "mild_decrease",
        movement_pattern: "moderate_reduction",
        cognitive_pattern: "sedation_focused",
        respiratory_pattern: "mild_depression",
      },
      antipsychotics: {
        // 항정신병약
        hr_pattern: "variable_decrease",
        movement_pattern: "motor_suppression",
        cognitive_pattern: "psychomotor_retardation",
        respiratory_pattern: "minimal_depression",
      },
    };

    logger.info("🧠 향정신성약물 탐지 서비스 초기화");
  }

  /**
   * 서비스 초기화
   */
  async initialize() {
    try {
      logger.info("⚡ 향정신성약물 탐지 Transformer 모델 로딩...");

      await this.loadPsychoactiveTransformerModel();
      await this.checkPsychoactiveLLM();

      this.isModelLoaded = true;
      logger.info("✅ 향정신성약물 탐지 시스템 준비 완료");
    } catch (error) {
      logger.error("❌ 향정신성약물 탐지 초기화 실패", error);
      throw error;
    }
  }

  /**
   * 향정신성약물 특화 Transformer 모델 로드
   */
  async loadPsychoactiveTransformerModel() {
    try {
      const modelPath = "./weights/psychoactive_transformer.json";

      try {
        this.model = await tf.loadLayersModel(modelPath);
        logger.info("✅ 기존 향정신성약물 탐지 모델 로드");
      } catch {
        logger.info("🔧 새로운 향정신성약물 탐지 모델 생성");
        this.model = this.createPsychoactiveTransformerModel();
      }
    } catch (error) {
      logger.error("❌ 향정신성약물 Transformer 모델 로드 실패", error);
      throw error;
    }
  }

  /**
   * 향정신성약물 탐지 특화 Transformer 모델 생성
   * CNS 억제 패턴 탐지에 특화
   */
  createPsychoactiveTransformerModel() {
    const input = tf.input({ shape: [20, 8], name: "psychoactive_sequence" }); // 8 features

    // Temporal Encoding for gradual change detection
    const temporalEncoded = tf.layers
      .dense({
        units: 128,
        activation: "tanh", // tanh for smooth gradual patterns
        name: "temporal_encoding_psychoactive",
      })
      .apply(input);

    // Specialized attention layers for depression pattern detection
    let attention = temporalEncoded;

    for (let i = 0; i < 4; i++) {
      // Multi-head attention with focus on temporal dependencies
      const multiHeadAttention = tf.layers.multiHeadAttention({
        numHeads: 6, // 6 heads for balanced complexity
        keyDim: 21, // Divisible by 3 for stability
        dropout: 0.15, // Lower dropout for subtle pattern detection
        name: `psychoactive_attention_${i}`,
      });

      attention = multiHeadAttention.apply([attention, attention]);

      // Layer normalization
      const norm = tf.layers.layerNormalization({
        name: `psychoactive_norm_${i}`,
      });
      attention = norm.apply(
        tf.layers.add().apply([temporalEncoded, attention]),
      );

      // Feed Forward specialized for gradual pattern detection
      const ff1 = tf.layers.dense({
        units: 256,
        activation: "swish", // Swish for smooth gradients
        name: `psychoactive_ff_${i}_1`,
      });

      const ff2 = tf.layers.dense({
        units: 128,
        name: `psychoactive_ff_${i}_2`,
      });

      let feedForward = ff2.apply(ff1.apply(attention));
      attention = norm.apply(tf.layers.add().apply([attention, feedForward]));
    }

    // Trend-aware pooling (weighted toward recent timesteps)
    const timeWeights = tf.layers.dense({
      units: 20,
      activation: "softmax",
      name: "time_attention_weights",
    });

    const reshapedAttention = tf.layers
      .reshape({
        targetShape: [20, 128],
        name: "reshape_for_weighting",
      })
      .apply(attention);

    // Weighted pooling based on temporal importance
    const weightedPooled = tf.layers
      .dot({ axes: [1, 1], name: "weighted_temporal_pooling" })
      .apply([timeWeights.apply(input), reshapedAttention]);

    const flattened = tf.layers
      .flatten({ name: "flatten_pooled" })
      .apply(weightedPooled);

    // Classification head for 5 classes: [normal, benzodiazepines, barbiturates, z_drugs, antipsychotics]
    const dense1 = tf.layers
      .dense({
        units: 96,
        activation: "relu",
        name: "psychoactive_classifier_1",
      })
      .apply(flattened);

    const dropout1 = tf.layers
      .dropout({
        rate: 0.35,
        name: "psychoactive_dropout_1",
      })
      .apply(dense1);

    const dense2 = tf.layers
      .dense({
        units: 48,
        activation: "relu",
        name: "psychoactive_classifier_2",
      })
      .apply(dropout1);

    const dropout2 = tf.layers
      .dropout({
        rate: 0.25,
        name: "psychoactive_dropout_2",
      })
      .apply(dense2);

    const output = tf.layers
      .dense({
        units: 5,
        activation: "softmax",
        name: "psychoactive_prediction",
      })
      .apply(dropout2);

    const model = tf.model({ inputs: input, outputs: output });

    model.compile({
      optimizer: tf.train.adam(0.0003), // Lower learning rate for subtle patterns
      loss: "categoricalCrossentropy",
      metrics: ["accuracy", "precision", "recall"],
    });

    logger.info("🏗️ 향정신성약물 탐지 Transformer 모델 생성 완료 (5-class)");
    return model;
  }

  /**
   * 향정신성약물 전용 LLM 확인
   */
  async checkPsychoactiveLLM() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      const models = response.data.models || [];

      const hasPsychoactiveModel = models.some((m) =>
        m.name.includes("goldentime-psychoactive"),
      );

      if (!hasPsychoactiveModel) {
        logger.warn("⚠️ 향정신성약물 전용 LLM 미발견, 기본 모델 사용");
        this.ollamaModel = "llama3.1:8b";
      } else {
        logger.info("✅ 향정신성약물 전용 LLM 연결 완료");
      }
    } catch (error) {
      logger.warn("⚠️ 향정신성약물 LLM 상태 확인 실패");
    }
  }

  /**
   * 향정신성약물 사용 탐지 메인 함수
   */
  async detectPsychoactive(biometricData, userBaseline) {
    try {
      logger.info("🧠 향정신성약물 사용 상태 분석 시작");

      // 1단계: CNS 억제 패턴 분석
      const cnsDepressionAnalysis = await this.analyzeCNSDepression(
        biometricData,
        userBaseline,
      );

      // 2단계: 점진적 변화 추세 분석
      const trendAnalysis = await this.analyzeGradualTrends(
        biometricData,
        userBaseline,
      );

      // 3단계: Transformer 기반 패턴 분류
      const transformerPrediction =
        await this.runPsychoactiveTransformerAnalysis(biometricData);

      // 4단계: 인지/움직임 억제 분석
      const cognitiveMotorAnalysis =
        await this.analyzeCognitiveMotorSuppression(
          biometricData,
          userBaseline,
        );

      // 5단계: LLM 기반 종합 해석
      const llmAnalysis = await this.runPsychoactiveLLMAnalysis(
        biometricData,
        userBaseline,
        cnsDepressionAnalysis,
        trendAnalysis,
      );

      // 6단계: 최종 결과 통합
      const finalResult = this.integratePsychoactivePredictions({
        cns_depression: cnsDepressionAnalysis,
        trend: trendAnalysis,
        transformer: transformerPrediction,
        cognitive_motor: cognitiveMotorAnalysis,
        llm: llmAnalysis,
      });

      // 위험/응급 단계일 때만 관제 모니터링 알림
      const requires_emergency_response =
        finalResult.severity_level === "danger" ||
        finalResult.severity_level === "critical";

      return {
        detected: finalResult.psychoactive_detected,
        drug_category: finalResult.suspected_category, // 'benzodiazepines', 'barbiturates', etc.
        confidence: this.calculatePsychoactiveConfidence(finalResult),
        severity: finalResult.severity_level,
        requires_emergency_response: requires_emergency_response, // 관제 모니터링 및 출동 필요 여부
        cns_depression_level: finalResult.cns_depression_score,
        evidence: finalResult.evidence,
        explanation: this.generatePsychoactiveExplanation(
          finalResult,
          biometricData,
          userBaseline,
        ),
        recommendation: this.generatePsychoactiveRecommendation(finalResult),
        timestamp: new Date().toISOString(),
        detailed_analysis: {
          cns_depression: cnsDepressionAnalysis,
          temporal_trends: trendAnalysis,
          transformer_classification: transformerPrediction,
          cognitive_motor_impact: cognitiveMotorAnalysis,
          llm_interpretation: llmAnalysis,
        },
      };
    } catch (error) {
      logger.error("❌ 향정신성약물 탐지 분석 실패", error);
      throw error;
    }
  }

  /**
   * CNS(중추신경계) 억제 패턴 분석
   */
  async analyzeCNSDepression(biometricData, userBaseline) {
    const recentSequence = await this.getRecentBiometricSequence(
      biometricData.userId,
      20,
    );

    if (recentSequence.length < 5) {
      return {
        cns_depression_score: 0.1,
        indicators: {},
        insufficient_data: true,
      };
    }

    const indicators = {};

    // 1. 심박수 점진적 감소 패턴 분석
    indicators.hr_gradual_decline = this.analyzeGradualHeartRateDecline(
      recentSequence,
      userBaseline,
    );

    // 2. 움직임 활동성 억제 분석
    indicators.movement_suppression = this.analyzeMovementSuppression(
      recentSequence,
      userBaseline,
    );

    // 3. 호흡 억제 패턴 분석
    indicators.respiratory_depression = this.analyzeRespiratoryDepression(
      recentSequence,
      userBaseline,
    );

    // 4. 반응성 저하 분석 (간접적)
    indicators.responsiveness_decline =
      this.analyzeResponsivenessDecline(recentSequence);

    // 5. 체온 조절 기능 변화
    indicators.thermoregulation_impact = this.analyzeThermoregulationImpact(
      recentSequence,
      userBaseline,
    );

    // CNS 억제 종합 점수 계산
    const scores = [
      indicators.hr_gradual_decline.score * 0.25, // 25%
      indicators.movement_suppression.score * 0.3, // 30% (주요 지표)
      indicators.respiratory_depression.score * 0.2, // 20%
      indicators.responsiveness_decline.score * 0.15, // 15%
      indicators.thermoregulation_impact.score * 0.1, // 10%
    ];

    const cns_depression_score = scores.reduce((sum, score) => sum + score, 0);

    return {
      cns_depression_score,
      indicators,
      severity:
        cns_depression_score > 0.7
          ? "severe"
          : cns_depression_score > 0.5
            ? "moderate"
            : cns_depression_score > 0.3
              ? "mild"
              : "none",
      red_flags: this.identifyPsychoactiveRedFlags(indicators),
    };
  }

  /**
   * 점진적 심박수 감소 분석
   */
  analyzeGradualHeartRateDecline(sequence, userBaseline) {
    const hrValues = sequence.map((d) => d.heartRate).filter((hr) => hr > 0);
    if (hrValues.length < 5) return { score: 0, declining: false };

    const baselineHR = userBaseline.hr_mean || 72;

    // 시간에 따른 감소 추세 계산 (선형 회귀)
    const timePoints = hrValues.map((_, i) => i);
    const slope = this.calculateLinearSlope(timePoints, hrValues);

    // 현재 평균 vs 베이스라인 비교
    const recentAvgHR = hrValues.slice(-5).reduce((sum, hr) => sum + hr, 0) / 5;
    const decreasePercentage = (baselineHR - recentAvgHR) / baselineHR;

    // 점진적 감소 패턴 점수
    const slopeScore = Math.min(Math.abs(slope) * 0.1, 0.5); // 음의 기울기일 때 높은 점수
    const decreaseScore = Math.max(0, decreasePercentage * 2); // 감소율 기반 점수

    const score = (slopeScore + decreaseScore) / 2;

    return {
      score: Math.min(score, 1.0),
      slope,
      decrease_percentage: decreasePercentage,
      baseline_hr: baselineHR,
      recent_avg_hr: recentAvgHR,
      declining: slope < -0.5 && decreasePercentage > 0.1,
    };
  }

  /**
   * 움직임 억제 분석
   */
  analyzeMovementSuppression(sequence, userBaseline) {
    const movementData = sequence.map((d) => ({
      status: d.movementStatus,
      stationaryTime: d.movementStatus === "stationary" ? 1 : 0,
    }));

    if (movementData.length < 5) return { score: 0, suppressed: false };

    // 정적 상태 비율 계산
    const stationaryRatio =
      movementData.reduce((sum, m) => sum + m.stationaryTime, 0) /
      movementData.length;

    // 움직임 패턴 변화 빈도 (감소 = 억제 징후)
    let movementChanges = 0;
    for (let i = 1; i < movementData.length; i++) {
      if (movementData[i].status !== movementData[i - 1].status) {
        movementChanges++;
      }
    }

    const changeFrequency = movementChanges / movementData.length;
    const baselineChangeFreq = userBaseline.movement_change_freq || 0.3;

    // 억제 점수 계산
    const stationaryScore = stationaryRatio; // 정적 상태가 많을수록 높은 점수
    const changeReductionScore = Math.max(
      0,
      (baselineChangeFreq - changeFrequency) / baselineChangeFreq,
    );

    const score = stationaryScore * 0.6 + changeReductionScore * 0.4;

    return {
      score: Math.min(score, 1.0),
      stationary_ratio: stationaryRatio,
      change_frequency: changeFrequency,
      baseline_change_freq: baselineChangeFreq,
      suppressed:
        stationaryRatio > 0.8 && changeFrequency < baselineChangeFreq * 0.5,
    };
  }

  /**
   * 호흡 억제 분석
   */
  analyzeRespiratoryDepression(sequence, userBaseline) {
    const respiratoryValues = sequence
      .map((d) => d.respiratoryRate)
      .filter((r) => r > 0);
    if (respiratoryValues.length < 3) return { score: 0, depressed: false };

    const baselineRespRate = userBaseline.resp_rate_mean || 16;
    const currentAvgRespRate =
      respiratoryValues.reduce((sum, r) => sum + r, 0) /
      respiratoryValues.length;

    // 호흡수 감소율 계산
    const depressionPercentage =
      (baselineRespRate - currentAvgRespRate) / baselineRespRate;

    // 호흡 패턴의 규칙성 분석 (너무 규칙적이어도 억제 징후)
    const variance = this.calculateVariance(respiratoryValues);
    const cv = variance > 0 ? Math.sqrt(variance) / currentAvgRespRate : 0;

    // 억제 점수 (감소율 + 낮은 변동성)
    const depressionScore = Math.max(0, depressionPercentage * 3);
    const regularityScore = cv < 0.1 ? 0.3 : 0; // 너무 규칙적이면 억제 의심

    const score = Math.min(depressionScore + regularityScore, 1.0);

    return {
      score,
      depression_percentage: depressionPercentage,
      baseline_resp_rate: baselineRespRate,
      current_avg_resp_rate: currentAvgRespRate,
      coefficient_variation: cv,
      depressed: depressionPercentage > 0.15 && currentAvgRespRate < 12,
    };
  }

  /**
   * 반응성 저하 분석 (간접적 지표)
   */
  analyzeResponsivenessDecline(sequence) {
    // 생체신호의 변동성 감소를 반응성 저하의 간접 지표로 사용
    const hrValues = sequence.map((d) => d.heartRate).filter((hr) => hr > 0);
    const stressValues = sequence
      .map((d) => d.stressLevel)
      .filter((s) => s >= 0);

    if (hrValues.length < 5 && stressValues.length < 5) {
      return { score: 0, declined: false };
    }

    // 심박수 변동성 (HRV 대체 지표)
    const hrVariability =
      hrValues.length > 1 ? this.calculateVariance(hrValues) : 0;
    const hrCV =
      hrValues.length > 1
        ? Math.sqrt(hrVariability) /
          (hrValues.reduce((sum, hr) => sum + hr, 0) / hrValues.length)
        : 0;

    // 스트레스 반응성
    const stressVariability =
      stressValues.length > 1 ? this.calculateVariance(stressValues) : 0;

    // 낮은 변동성 = 반응성 저하
    const hrResponsiveness = 1 - Math.min(hrCV * 10, 1); // CV가 낮을수록 반응성 저하
    const stressResponsiveness = 1 - Math.min(stressVariability * 0.01, 1);

    const score = hrResponsiveness * 0.6 + stressResponsiveness * 0.4;

    return {
      score: Math.min(score, 1.0),
      hr_cv: hrCV,
      stress_variability: stressVariability,
      declined: hrCV < 0.05 || stressVariability < 5,
    };
  }

  /**
   * 체온 조절 기능 영향 분석
   */
  analyzeThermoregulationImpact(sequence, userBaseline) {
    const tempValues = sequence
      .map((d) => d.bodyTemperature)
      .filter((t) => t > 30 && t < 45);
    if (tempValues.length < 3) return { score: 0, impacted: false };

    const baselineTemp = userBaseline.temp_mean || 36.5;
    const currentAvgTemp =
      tempValues.reduce((sum, t) => sum + t, 0) / tempValues.length;

    // 체온 변화 및 조절 능력 분석
    const tempChange = Math.abs(currentAvgTemp - baselineTemp);
    const tempVariability = this.calculateVariance(tempValues);

    // 향정신성약물은 보통 체온을 약간 낮춤
    const coolingEffect = baselineTemp - currentAvgTemp;
    const coolingScore =
      coolingEffect > 0 ? Math.min(coolingEffect * 2, 0.5) : 0;

    // 체온 조절 능력 저하 (변동성 감소)
    const regulationScore = tempVariability < 0.1 ? 0.3 : 0;

    const score = coolingScore + regulationScore;

    return {
      score: Math.min(score, 1.0),
      temp_change: tempChange,
      cooling_effect: coolingEffect,
      temp_variability: tempVariability,
      baseline_temp: baselineTemp,
      current_avg_temp: currentAvgTemp,
      impacted: coolingEffect > 0.3 || tempVariability < 0.1,
    };
  }

  /**
   * 점진적 변화 추세 분석
   */
  async analyzeGradualTrends(biometricData, userBaseline) {
    const extendedSequence = await this.getRecentBiometricSequence(
      biometricData.userId,
      30,
    );

    if (extendedSequence.length < 10) {
      return { trend_detected: false, trends: {}, insufficient_data: true };
    }

    const trends = {};

    // 각 생체신호의 시간별 추세 계산
    const timePoints = extendedSequence.map((_, i) => i);

    // 심박수 추세
    const hrValues = extendedSequence
      .map((d) => d.heartRate)
      .filter((hr) => hr > 0);
    trends.hr_trend = {
      slope: this.calculateLinearSlope(
        timePoints.slice(0, hrValues.length),
        hrValues,
      ),
      r_squared: this.calculateRSquared(
        timePoints.slice(0, hrValues.length),
        hrValues,
      ),
    };

    // 움직임 활동도 추세 (수치화)
    const movementScores = extendedSequence.map((d) =>
      d.movementStatus === "stationary"
        ? 0
        : d.movementStatus === "walking"
          ? 1
          : 2,
    );
    trends.movement_trend = {
      slope: this.calculateLinearSlope(timePoints, movementScores),
      r_squared: this.calculateRSquared(timePoints, movementScores),
    };

    // 스트레스/각성 수준 추세
    const stressValues = extendedSequence
      .map((d) => d.stressLevel)
      .filter((s) => s >= 0);
    trends.stress_trend = {
      slope: this.calculateLinearSlope(
        timePoints.slice(0, stressValues.length),
        stressValues,
      ),
      r_squared: this.calculateRSquared(
        timePoints.slice(0, stressValues.length),
        stressValues,
      ),
    };

    // 점진적 억제 패턴 감지
    const gradual_suppression =
      trends.hr_trend.slope < -0.3 &&
      trends.movement_trend.slope < -0.1 &&
      trends.stress_trend.slope < -0.5;

    return {
      trend_detected: gradual_suppression,
      trends,
      pattern_consistency: this.calculatePatternConsistency(trends),
      time_to_effect: this.estimateTimeToEffect(extendedSequence),
    };
  }

  /**
   * Transformer 기반 향정신성약물 분석
   */
  async runPsychoactiveTransformerAnalysis(biometricData) {
    if (!this.model) {
      return {
        psychoactive_probability: 0.3,
        drug_category: "unknown",
        confidence: 0.2,
      };
    }

    try {
      const sequenceData =
        await this.preparePsychoactiveSequenceData(biometricData);

      if (sequenceData.length < 20) {
        return {
          psychoactive_probability: 0.2,
          drug_category: "unknown",
          confidence: 0.1,
        };
      }

      const inputTensor = tf.tensor3d([sequenceData], [1, 20, 8]);
      const prediction = this.model.predict(inputTensor);
      const probabilities = await prediction.data();

      inputTensor.dispose();
      prediction.dispose();

      // 5-class 결과: [normal, benzodiazepines, barbiturates, z_drugs, antipsychotics]
      const categories = [
        "normal",
        "benzodiazepines",
        "barbiturates",
        "z_drugs",
        "antipsychotics",
      ];
      const maxIndex = probabilities.indexOf(Math.max(...probabilities));

      return {
        psychoactive_probability: 1 - probabilities[0],
        drug_category: categories[maxIndex],
        confidence: Math.max(...probabilities),
        category_probabilities: {
          normal: probabilities[0],
          benzodiazepines: probabilities[1],
          barbiturates: probabilities[2],
          z_drugs: probabilities[3],
          antipsychotics: probabilities[4],
        },
      };
    } catch (error) {
      logger.error("❌ 향정신성약물 Transformer 분석 실패", error);
      return {
        psychoactive_probability: 0.3,
        drug_category: "unknown",
        confidence: 0.1,
      };
    }
  }

  /**
   * 향정신성약물용 시계열 데이터 준비 (8 features)
   */
  async preparePsychoactiveSequenceData(currentData) {
    try {
      const recentData = await BiometricData.find({
        userId: currentData.userId,
      })
        .sort({ collectedAt: -1 })
        .limit(20);

      return recentData.reverse().map((data) => [
        data.heartRate || 72,
        data.stressLevel || 20,
        data.bodyTemperature || 36.5,
        data.movementStatus === "stationary"
          ? 0
          : data.movementStatus === "walking"
            ? 1
            : 2,
        data.hrv || 45,
        data.oxygenLevel || 98,
        data.respiratoryRate || 16,
        data.sleepStatus === "awake"
          ? 0
          : data.sleepStatus === "light_sleep"
            ? 1
            : 2, // 각성 수준
      ]);
    } catch (error) {
      logger.error("❌ 향정신성약물 시계열 데이터 준비 실패", error);
      return [];
    }
  }

  /**
   * 인지/움직임 억제 분석
   */
  async analyzeCognitiveMotorSuppression(biometricData, userBaseline) {
    // 간접적 인지 기능 평가 (생체신호 기반)
    const cognitiveIndicators = {
      reaction_sluggishness: this.assessReactionSluggishness(
        biometricData,
        userBaseline,
      ),
      motor_coordination: this.assessMotorCoordination(biometricData),
      attention_span: this.assessAttentionSpan(biometricData, userBaseline),
      processing_speed: this.assessProcessingSpeed(biometricData, userBaseline),
    };

    const suppression_score =
      Object.values(cognitiveIndicators).reduce(
        (sum, indicator) => sum + indicator.score,
        0,
      ) / 4;

    return {
      suppression_score,
      cognitive_indicators: cognitiveIndicators,
      motor_suppression_level:
        suppression_score > 0.7
          ? "severe"
          : suppression_score > 0.5
            ? "moderate"
            : suppression_score > 0.3
              ? "mild"
              : "none",
    };
  }

  /**
   * LLM 기반 향정신성약물 분석
   */
  async runPsychoactiveLLMAnalysis(
    biometricData,
    userBaseline,
    cnsAnalysis,
    trendAnalysis,
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
향정신성약물 사용 상태 분석 요청:

=== 사용자 베이스라인 ===
평균 심박수: ${userBaseline.hr_mean || "N/A"}bpm
평균 움직임 빈도: ${userBaseline.movement_change_freq || "N/A"}
평균 호흡수: ${userBaseline.resp_rate_mean || "N/A"}회/분
평균 체온: ${userBaseline.temp_mean || "N/A"}°C

=== 사용자 의료 정보 ===
${medicalContext}

=== 현재 생체데이터 ===
심박수: ${biometricData.heartRate}bpm
움직임: ${biometricData.movementStatus}
호흡수: ${biometricData.respiratoryRate || "N/A"}회/분
체온: ${biometricData.bodyTemperature || "N/A"}°C
스트레스/각성: ${biometricData.stressLevel}/100

=== CNS 억제 분석 ===
전체 억제 점수: ${(cnsAnalysis.cns_depression_score * 100).toFixed(1)}%
심박수 점진적 감소: ${cnsAnalysis.indicators?.hr_gradual_decline?.declining ? "감지됨" : "정상"}
움직임 억제: ${cnsAnalysis.indicators?.movement_suppression?.suppressed ? "감지됨" : "정상"}
호흡 억제: ${cnsAnalysis.indicators?.respiratory_depression?.depressed ? "감지됨" : "정상"}
반응성 저하: ${cnsAnalysis.indicators?.responsiveness_decline?.declined ? "감지됨" : "정상"}

=== 시간적 추세 분석 ===
점진적 변화 패턴: ${trendAnalysis.trend_detected ? "감지됨" : "없음"}
심박수 추세: ${trendAnalysis.trends?.hr_trend?.slope < -0.3 ? "하향" : "안정"}
움직임 활동 추세: ${trendAnalysis.trends?.movement_trend?.slope < -0.1 ? "감소" : "안정"}
각성 수준 추세: ${trendAnalysis.trends?.stress_trend?.slope < -0.5 ? "저하" : "안정"}

=== 향정신성약물 분류별 패턴 매칭 ===
벤조디아제핀류 (자낙스, 아티반): 점진적 CNS 억제 + 중등도 호흡억제
바르비튜레이트류: 심각한 CNS 억제 + 현저한 호흡억제  
Z-약물류 (수면제): 경미한 억제 + 주로 진정 효과
항정신병약물: 운동억제 + 정신운동 지연

위 생체데이터와 패턴을 분석하여 향정신성약물 사용 가능성과 의학적 심각도를 5단계로 판정해주세요.

판정 기준:
1. 정상 (Normal): 특이사항 없음
2. 주의 (Caution): 경미한 억제 징후, 초기 반응 의심
3. 경고 (Warning): 뚜렷한 CNS 억제, 인지/운동 기능 저하 시작
4. 위험 (Danger): 심각한 기능 저하, 호흡 억제 징후
5. 응급 (Critical): 생명 위협, 혼수 상태 위험, 호흡 부전 의심

응답 형식: "향정신성약물: [없음/벤조디아제핀/바르비튜레이트/Z약물/항정신병약] | 심각도: [정상/주의/경고/위험/응급] | 근거: [상세분석] | 신뢰도: [0.0-1.0]"
    `;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.8,
          num_predict: 250,
        },
      });

      return this.parsePsychoactiveAnalysis(response.data.response);
    } catch (error) {
      logger.error("❌ 향정신성약물 LLM 분석 실패", error);
      return {
        drug_category: "unknown",
        severity: "none",
        reasoning: "분석 실패",
        confidence: 0.1,
      };
    }
  }

  /**
   * 유틸리티 함수들
   */
  calculateLinearSlope(xValues, yValues) {
    if (xValues.length !== yValues.length || xValues.length < 2) return 0;

    const n = xValues.length;
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  calculateRSquared(xValues, yValues) {
    if (xValues.length < 2) return 0;

    const slope = this.calculateLinearSlope(xValues, yValues);
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;
    const intercept =
      yMean - slope * (xValues.reduce((sum, x) => sum + x, 0) / xValues.length);

    const ssRes = yValues.reduce((sum, y, i) => {
      const predicted = slope * xValues[i] + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);

    const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);

    return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  }

  calculateVariance(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return (
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );
  }

  async getRecentBiometricSequence(userId, limit = 20) {
    try {
      return await BiometricData.find({ userId })
        .sort({ collectedAt: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      logger.error("❌ 최근 생체데이터 조회 실패", error);
      return [];
    }
  }

  identifyPsychoactiveRedFlags(indicators) {
    const flags = [];

    if (indicators.hr_gradual_decline?.declining) {
      flags.push("점진적_심박수_감소");
    }

    if (indicators.movement_suppression?.suppressed) {
      flags.push("심각한_움직임_억제");
    }

    if (indicators.respiratory_depression?.depressed) {
      flags.push("호흡_억제_패턴");
    }

    if (indicators.responsiveness_decline?.declined) {
      flags.push("반응성_현저한_저하");
    }

    if (indicators.thermoregulation_impact?.impacted) {
      flags.push("체온조절_기능_저하");
    }

    return flags;
  }

  // 간접적 인지 평가 함수들
  assessReactionSluggishness(biometricData, userBaseline) {
    // 스트레스 반응성 기반 간접 평가
    const currentStress = biometricData.stressLevel;
    const baselineStress = userBaseline.stress_mean || 20;

    const sluggishness = Math.max(
      0,
      (baselineStress - currentStress) / baselineStress,
    );
    return { score: Math.min(sluggishness * 2, 1.0) };
  }

  assessMotorCoordination(biometricData) {
    // 움직임 패턴의 일관성 기반 평가
    const movementConsistency =
      biometricData.movementStatus === "stationary" ? 0.7 : 0.3;
    return { score: movementConsistency };
  }

  assessAttentionSpan(biometricData, userBaseline) {
    // HRV 변동성 기반 간접 주의력 평가
    const currentHRV = biometricData.hrv || biometricData.stressLevel;
    const baselineHRV = userBaseline.hrv_mean || 45;

    const attentionDeficit = Math.max(
      0,
      (baselineHRV - currentHRV) / baselineHRV,
    );
    return { score: Math.min(attentionDeficit * 1.5, 1.0) };
  }

  assessProcessingSpeed(biometricData, userBaseline) {
    // 심박수 변동성 기반 간접 처리 속도 평가
    const currentHR = biometricData.heartRate;
    const baselineHR = userBaseline.hr_mean || 72;

    const processingSlowdown = Math.max(
      0,
      (baselineHR - currentHR) / baselineHR,
    );
    return { score: Math.min(processingSlowdown * 2, 1.0) };
  }

  calculatePatternConsistency(trends) {
    const rSquaredValues = Object.values(trends)
      .map((t) => t.r_squared)
      .filter((r) => r > 0);
    return rSquaredValues.length > 0
      ? rSquaredValues.reduce((sum, r) => sum + r, 0) / rSquaredValues.length
      : 0;
  }

  estimateTimeToEffect(sequence) {
    // 효과 발현 시간 추정 (첫 번째 유의한 변화 감지 시점)
    if (sequence.length < 5) return null;

    const hrValues = sequence.map((d) => d.heartRate);
    const baseline = hrValues.slice(0, 3).reduce((sum, hr) => sum + hr, 0) / 3;

    for (let i = 3; i < hrValues.length; i++) {
      if (Math.abs(hrValues[i] - baseline) / baseline > 0.15) {
        return i * 5; // 5분 간격으로 가정
      }
    }

    return null;
  }

  parsePsychoactiveAnalysis(analysis) {
    const result = {
      drug_category: "none",
      severity: "none",
      reasoning: analysis,
      confidence: 0.3,
    };

    // 약물 분류 추출
    if (analysis.includes("벤조디아제핀")) {
      result.drug_category = "benzodiazepines";
    } else if (analysis.includes("바르비튜레이트")) {
      result.drug_category = "barbiturates";
    } else if (analysis.includes("Z약물")) {
      result.drug_category = "z_drugs";
    } else if (analysis.includes("항정신병약")) {
      result.drug_category = "antipsychotics";
    }

    // 심각도 추출 (5단계)
    if (analysis.includes("응급") || analysis.includes("Critical")) {
      result.severity = "critical";
      result.confidence = 0.95;
    } else if (
      analysis.includes("위험") ||
      analysis.includes("Danger") ||
      analysis.includes("심각")
    ) {
      result.severity = "danger";
      result.confidence = 0.9;
    } else if (
      analysis.includes("경고") ||
      analysis.includes("Warning") ||
      analysis.includes("중등도")
    ) {
      result.severity = "warning";
      result.confidence = 0.8;
    } else if (
      analysis.includes("주의") ||
      analysis.includes("Caution") ||
      analysis.includes("경미")
    ) {
      result.severity = "caution";
      result.confidence = 0.7;
    } else if (analysis.includes("정상") || analysis.includes("Normal")) {
      result.severity = "normal";
      result.confidence = 0.9;
    }

    // 신뢰도 추출
    const confidenceMatch = analysis.match(/신뢰도:\s*([0-9]\.[0-9])/);
    if (confidenceMatch) {
      result.confidence = parseFloat(confidenceMatch[1]);
    }

    return result;
  }

  integratePsychoactivePredictions({
    cns_depression,
    trend,
    transformer,
    cognitive_motor,
    llm,
  }) {
    const weights = {
      cns_depression: 0.35, // CNS 억제가 핵심
      trend: 0.25, // 점진적 변화 패턴
      transformer: 0.25, // 패턴 분류
      cognitive_motor: 0.15, // 인지/운동 기능
    };

    // 각 분석의 점수 정규화
    const cnsScore = cns_depression.cns_depression_score;
    const trendScore = trend.trend_detected ? 0.8 : 0.2;
    const transformerScore = transformer.psychoactive_probability;
    const cognitiveScore = cognitive_motor.suppression_score;

    // 가중 평균 계산
    const combinedScore =
      cnsScore * weights.cns_depression +
      trendScore * weights.trend +
      transformerScore * weights.transformer +
      cognitiveScore * weights.cognitive_motor;

    // 최종 판정 (의학적 5단계 기준)
    const psychoactive_detected = combinedScore > 0.3; // 주의 단계 이상이면 감지로 판단

    // 약물 분류 결정
    let suspected_category = "none";
    if (psychoactive_detected) {
      if (
        transformer.drug_category !== "normal" &&
        transformer.drug_category !== "unknown"
      ) {
        suspected_category = transformer.drug_category;
      } else if (
        llm.drug_category !== "none" &&
        llm.drug_category !== "unknown"
      ) {
        suspected_category = llm.drug_category;
      } else {
        suspected_category = "unspecified";
      }
    }

    // 심각도 결정 (5단계)
    let severity_level = "normal";
    if (combinedScore > 0.85) {
      severity_level = "critical";
    } else if (combinedScore > 0.7) {
      severity_level = "danger";
    } else if (combinedScore > 0.55) {
      severity_level = "warning";
    } else if (combinedScore > 0.3) {
      severity_level = "caution";
    }

    return {
      psychoactive_detected,
      suspected_category,
      severity_level,
      combined_score: combinedScore,
      cns_depression_score: cnsScore,
      evidence: {
        cns_depression_flags: cns_depression.red_flags,
        trend_indicators: trend.trends,
        transformer_classification: transformer.category_probabilities,
        cognitive_motor_impact: cognitive_motor.cognitive_indicators,
        llm_reasoning: llm.reasoning,
      },
    };
  }

  calculatePsychoactiveConfidence(result) {
    let confidence = 0.5;

    if (result.combined_score > 0.8) {
      confidence = 0.95;
    } else if (result.combined_score > 0.7) {
      confidence = 0.85;
    } else if (result.combined_score > 0.6) {
      confidence = 0.75;
    } else {
      confidence = 0.6;
    }

    return Math.min(confidence, 1.0);
  }

  generatePsychoactiveExplanation(result, biometricData, userBaseline) {
    if (!result.psychoactive_detected) {
      return "생체신호가 정상 범위 내에 있으며 향정신성약물 사용 징후가 발견되지 않았습니다.";
    }

    const explanations = [];

    result.evidence.cns_depression_flags.forEach((flag) => {
      switch (flag) {
        case "점진적_심박수_감소":
          explanations.push("심박수가 점진적으로 감소하는 패턴 관찰");
          break;
        case "심각한_움직임_억제":
          explanations.push("신체 활동성이 현저히 감소");
          break;
        case "호흡_억제_패턴":
          explanations.push("호흡수 감소 및 호흡 패턴 변화 감지");
          break;
        case "반응성_현저한_저하":
          explanations.push("생체신호 반응성이 현저히 저하됨");
          break;
        case "체온조절_기능_저하":
          explanations.push("체온 조절 기능의 변화 관찰");
          break;
      }
    });

    const categoryExplanation =
      result.suspected_category === "benzodiazepines"
        ? "벤조디아제핀계 약물 사용 패턴"
        : result.suspected_category === "barbiturates"
          ? "바르비튜레이트계 약물 사용 패턴"
          : result.suspected_category === "z_drugs"
            ? "Z-약물(수면제) 사용 패턴"
            : result.suspected_category === "antipsychotics"
              ? "항정신병약물 사용 패턴"
              : "향정신성약물 사용 패턴";

    return `${categoryExplanation} 감지: ${explanations.join(", ")}. ${result.severity_level} 수준의 CNS 억제가 관찰됩니다.`;
  }

  generatePsychoactiveRecommendation(result) {
    if (!result.psychoactive_detected) {
      return ["계속 모니터링 중", "정상 상태 유지"];
    }

    const recommendations = [];

    switch (result.severity_level) {
      case "critical":
        recommendations.push("🚨 [응급] 즉시 119 신고 및 응급실 이송 필수");
        recommendations.push("🫁 호흡 상태 지속 모니터링 (호흡 부전 위험)");
        recommendations.push("💊 과다복용(Overdose) 의심, 해독제 투여 필요");
        recommendations.push("👁️ 의식수준 저하, 기도 확보 유지");
        break;

      case "danger":
        recommendations.push("🚨 [위험] 보호자 호출 및 절대 안정");
        recommendations.push("🧠 인지/운동 기능 심각한 저하, 낙상 주의");
        recommendations.push("🏥 정신건강의학과 전문의 긴급 상담");
        break;

      case "warning":
        recommendations.push("⚠️ [경고] 약물 복용 중단 및 의료진 연락");
        recommendations.push("😴 과도한 진정 상태, 운전 및 기계 조작 금지");
        recommendations.push("🔍 약물 농도 및 대사 상태 확인 필요");
        break;

      case "caution":
        recommendations.push("⚠️ [주의] 약물 초기 반응 또는 부작용 의심");
        recommendations.push("👀 수면 및 행동 패턴 변화 관찰");
        recommendations.push("💬 처방 용량 준수 여부 재확인");
        break;

      case "normal":
        recommendations.push("✅ 정상 상태");
        break;
    }

    // 약물 분류별 특별 권장사항
    if (result.suspected_category === "benzodiazepines") {
      recommendations.push("⚠️ 갑작스러운 중단 금지 (금단 위험)");
    } else if (result.suspected_category === "barbiturates") {
      recommendations.push("🫁 호흡억제 특별 주의");
    } else if (result.suspected_category === "z_drugs") {
      recommendations.push("😴 수면 패턴 모니터링");
    } else if (result.suspected_category === "antipsychotics") {
      recommendations.push("🧠 정신상태 변화 관찰");
    }

    return recommendations;
  }
}

module.exports = PsychoactiveDetectionService;
