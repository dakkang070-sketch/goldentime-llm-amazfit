/**
 * 마약 탐지 서비스  
 * Amazfit 생체데이터 기반 마약/약물 사용 상태 실시간 분석
 * Time-series Transformer + LoRA 파인튜닝 LLM
 */

const tf = require('@tensorflow/tfjs-node');
const axios = require('axios');
const logger = require('../utils/logger');
const BiometricData = require('../models/BiometricData');
const DrugBaseline = require('../models/DrugBaseline');

class DrugDetectionService {
  constructor() {
    this.model = null;
    this.ollamaModel = 'goldentime-drug:latest';
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.isModelLoaded = false;
    
    // 마약 탐지 특화 임계값 (음주와 다른 패턴)
    this.thresholds = {
      hr_volatility: 25,      // 심박수 변동성 (불규칙 패턴)
      hr_spike_threshold: 40, // 급격한 심박수 증가 +40 이상
      hrv_drop_severe: 50,    // HRV 50% 이상 급감
      temp_fluctuation: 1.2,  // 체온 급격한 변화 ±1.2도
      movement_disruption: 0.7, // 움직임 패턴 교란 지수
      respiratory_irregularity: 30 // 호흡수 불규칙성 임계값
    };

    // 마약별 생체신호 패턴 정의
    this.drugPatterns = {
      stimulants: { // 각성제 (메스암페타민, 코카인 등)
        hr_pattern: 'spike_sustained', // 급상승 후 지속
        temp_pattern: 'increase',      // 체온 상승
        movement_pattern: 'hyperactive', // 과다활동
        hrv_pattern: 'severe_decrease'   // HRV 심각한 감소
      },
      depressants: { // 억제제 (헤로인, 오피오이드 등)
        hr_pattern: 'gradual_decrease', // 점진적 감소
        temp_pattern: 'decrease',       // 체온 하강
        movement_pattern: 'reduced',    // 활동 감소
        hrv_pattern: 'moderate_decrease' // HRV 중등도 감소
      },
      hallucinogens: { // 환각제 (LSD, PCP 등)
        hr_pattern: 'erratic',         // 불규칙 변동
        temp_pattern: 'fluctuating',   // 변동성 체온
        movement_pattern: 'irregular', // 불규칙 움직임
        hrv_pattern: 'chaotic'         // 혼돈적 HRV
      }
    };

    logger.info('💊 마약 탐지 서비스 초기화');
  }

  /**
   * 서비스 초기화
   */
  async initialize() {
    try {
      logger.info('⚡ 마약 탐지 Transformer 모델 로딩...');
      
      await this.loadDrugTransformerModel();
      await this.checkDrugLLM();
      
      this.isModelLoaded = true;
      logger.info('✅ 마약 탐지 시스템 준비 완료');
      
    } catch (error) {
      logger.error('❌ 마약 탐지 초기화 실패', error);
      throw error;
    }
  }

  /**
   * 마약 특화 Transformer 모델 로드
   */
  async loadDrugTransformerModel() {
    try {
      const modelPath = './weights/drug_transformer.json';
      
      try {
        this.model = await tf.loadLayersModel(modelPath);
        logger.info('✅ 기존 마약 탐지 모델 로드');
      } catch {
        logger.info('🔧 새로운 마약 탐지 모델 생성');
        this.model = this.createDrugTransformerModel();
      }
      
    } catch (error) {
      logger.error('❌ 마약 Transformer 모델 로드 실패', error);
      throw error;
    }
  }

  /**
   * 마약 탐지 특화 Transformer 모델 생성
   * 불규칙한 패턴 탐지에 특화된 구조
   */
  createDrugTransformerModel() {
    const input = tf.input({ shape: [20, 7], name: 'drug_biometric_sequence' }); // 7 features for drugs
    
    // Enhanced Positional Encoding for irregular patterns
    const posEncoded = tf.layers.dense({
      units: 128,
      activation: 'relu',
      name: 'positional_encoding_drug'
    }).apply(input);
    
    // Specialized attention for detecting erratic patterns
    let attention = posEncoded;
    
    for (let i = 0; i < 4; i++) {
      // Multi-head attention with different head sizes for pattern diversity
      const multiHeadAttention = tf.layers.multiHeadAttention({
        numHeads: 8,
        keyDim: 16,
        dropout: 0.2, // Higher dropout for regularization
        name: `drug_attention_${i}`
      });
      
      attention = multiHeadAttention.apply([attention, attention]);
      
      // Layer normalization
      const norm = tf.layers.layerNormalization({ name: `drug_layer_norm_${i}` });
      attention = norm.apply(tf.layers.add().apply([posEncoded, attention]));
      
      // Feed Forward with wider hidden layer for complex patterns
      const ff1 = tf.layers.dense({
        units: 512,
        activation: 'gelu', // GELU activation for better gradient flow
        name: `drug_ff_${i}_1`
      });
      
      const ff2 = tf.layers.dense({
        units: 128,
        name: `drug_ff_${i}_2`
      });
      
      let feedForward = ff2.apply(ff1.apply(attention));
      attention = norm.apply(tf.layers.add().apply([attention, feedForward]));
    }
    
    // Pattern-aware pooling (max + avg for capturing spikes and trends)
    const maxPooled = tf.layers.globalMaxPooling1d({ name: 'drug_max_pooling' }).apply(attention);
    const avgPooled = tf.layers.globalAveragePooling1d({ name: 'drug_avg_pooling' }).apply(attention);
    const pooled = tf.layers.concatenate({ name: 'drug_combined_pooling' }).apply([maxPooled, avgPooled]);
    
    // Multi-class classification head (4 classes: normal, stimulant, depressant, hallucinogen)
    const dense1 = tf.layers.dense({ units: 128, activation: 'relu', name: 'drug_classifier_1' }).apply(pooled);
    const dropout1 = tf.layers.dropout({ rate: 0.4, name: 'drug_dropout_1' }).apply(dense1);
    const dense2 = tf.layers.dense({ units: 64, activation: 'relu', name: 'drug_classifier_2' }).apply(dropout1);
    const dropout2 = tf.layers.dropout({ rate: 0.3, name: 'drug_dropout_2' }).apply(dense2);
    const output = tf.layers.dense({ units: 4, activation: 'softmax', name: 'drug_prediction' }).apply(dropout2);
    
    const model = tf.model({ inputs: input, outputs: output });
    
    model.compile({
      optimizer: tf.train.adam(0.0005), // Lower learning rate for stability
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy', 'precision', 'recall']
    });
    
    logger.info('🏗️ 마약 탐지 Transformer 모델 생성 완료 (4-class)');
    return model;
  }

  /**
   * 마약 전용 LLM 확인
   */
  async checkDrugLLM() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      const models = response.data.models || [];
      
      const hasDrugModel = models.some(m => m.name.includes('goldentime-drug'));
      
      if (!hasDrugModel) {
        logger.warn('⚠️ 마약 전용 LLM 미발견, 기본 모델 사용');
        this.ollamaModel = 'llama3.1:8b';
      } else {
        logger.info('✅ 마약 전용 LLM 연결 완료');
      }
      
    } catch (error) {
      logger.warn('⚠️ 마약 LLM 상태 확인 실패');
    }
  }

  /**
   * 마약 사용 탐지 메인 함수
   */
  async detectDrug(biometricData, userBaseline) {
    try {
      logger.info('💊 마약 사용 상태 분석 시작');
      
      // 1단계: 불규칙 패턴 분석
      const irregularityAnalysis = await this.analyzeIrregularPatterns(biometricData, userBaseline);
      
      // 2단계: Transformer 기반 패턴 분류
      const transformerPrediction = await this.runDrugTransformerAnalysis(biometricData);
      
      // 3단계: 시계열 변동성 분석
      const volatilityAnalysis = await this.analyzeVolatilityPatterns(biometricData);
      
      // 4단계: LLM 기반 종합 해석
      const llmAnalysis = await this.runDrugLLMAnalysis(biometricData, userBaseline, irregularityAnalysis);
      
      // 5단계: 마약 유형 특정 및 최종 결과
      const finalResult = this.integrateDrugPredictions({
        irregularity: irregularityAnalysis,
        transformer: transformerPrediction,
        volatility: volatilityAnalysis,
        llm: llmAnalysis
      });

      return {
        detected: finalResult.drug_detected,
        drug_type: finalResult.suspected_drug_type, // 'stimulant', 'depressant', 'hallucinogen'
        confidence: this.calculateDrugConfidence(finalResult),
        severity: finalResult.drug_severity,
        evidence: finalResult.evidence,
        explanation: this.generateDrugExplanation(finalResult, biometricData, userBaseline),
        recommendation: this.generateDrugRecommendation(finalResult),
        timestamp: new Date().toISOString(),
        pattern_analysis: {
          irregularity_score: irregularityAnalysis.overall_score,
          volatility_score: volatilityAnalysis.volatility_index,
          transformer_classification: transformerPrediction,
          llm_interpretation: llmAnalysis
        }
      };

    } catch (error) {
      logger.error('❌ 마약 탐지 분석 실패', error);
      throw error;
    }
  }

  /**
   * 불규칙 패턴 분석 (마약 사용의 핵심 지표)
   */
  async analyzeIrregularPatterns(biometricData, userBaseline) {
    // 최근 시계열 데이터 가져오기
    const recentSequence = await this.getRecentBiometricSequence(biometricData.userId, 20);
    
    if (recentSequence.length < 5) {
      return { overall_score: 0.1, patterns: {}, insufficient_data: true };
    }

    const patterns = {};

    // 1. 심박수 변동성 분석
    patterns.hr_volatility = this.calculateHeartRateVolatility(recentSequence);
    
    // 2. 급격한 변화 탐지 (Spike detection)
    patterns.hr_spikes = this.detectHeartRateSpikes(recentSequence);
    
    // 3. HRV 급격한 변화 분석
    patterns.hrv_disruption = this.analyzeHRVDisruption(recentSequence, userBaseline);
    
    // 4. 체온 변동 패턴
    patterns.temp_irregularity = this.analyzeTempIrregularity(recentSequence, userBaseline);
    
    // 5. 움직임 패턴 교란
    patterns.movement_disruption = this.analyzeMovementDisruption(recentSequence);

    // 6. 호흡 불규칙성 (가능한 경우)
    patterns.respiratory_irregularity = this.analyzeRespiratoryIrregularity(recentSequence);

    // 종합 불규칙성 점수 계산
    const irregularityScores = [
      patterns.hr_volatility.score,
      patterns.hr_spikes.severity,
      patterns.hrv_disruption.score,
      patterns.temp_irregularity.score,
      patterns.movement_disruption.score,
      patterns.respiratory_irregularity.score
    ].filter(score => score > 0);

    const overall_score = irregularityScores.length > 0 
      ? irregularityScores.reduce((sum, score) => sum + score, 0) / irregularityScores.length
      : 0;

    return {
      overall_score,
      patterns,
      red_flags: this.identifyDrugRedFlags(patterns),
      likely_drug_type: this.predictDrugType(patterns)
    };
  }

  /**
   * 심박수 변동성 계산
   */
  calculateHeartRateVolatility(sequence) {
    const hrValues = sequence.map(d => d.heartRate).filter(hr => hr > 0);
    if (hrValues.length < 3) return { score: 0, volatility: 0 };

    // 연속된 심박수 변화율 계산
    const changes = [];
    for (let i = 1; i < hrValues.length; i++) {
      changes.push(Math.abs(hrValues[i] - hrValues[i-1]) / hrValues[i-1]);
    }

    const volatility = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const score = Math.min(volatility * 10, 1.0); // 0-1 스케일로 정규화

    return {
      score,
      volatility,
      is_abnormal: volatility > 0.15 // 15% 이상 변동시 비정상
    };
  }

  /**
   * 심박수 급등 탐지
   */
  detectHeartRateSpikes(sequence) {
    const hrValues = sequence.map(d => d.heartRate).filter(hr => hr > 0);
    if (hrValues.length < 5) return { severity: 0, spikes: [] };

    const spikes = [];
    const window = 3; // 3-point 윈도우로 스파이크 탐지

    for (let i = window; i < hrValues.length - window; i++) {
      const before = hrValues.slice(i-window, i).reduce((sum, v) => sum + v, 0) / window;
      const current = hrValues[i];
      const after = hrValues.slice(i+1, i+window+1).reduce((sum, v) => sum + v, 0) / window;

      // 급등 조건: 현재값이 전후 평균보다 20% 이상 높음
      if (current > before * 1.2 && current > after * 1.2) {
        spikes.push({
          timestamp: i,
          magnitude: (current - Math.max(before, after)) / Math.max(before, after),
          baseline: (before + after) / 2
        });
      }
    }

    const severity = Math.min(spikes.length * 0.2 + 
      spikes.reduce((sum, spike) => sum + spike.magnitude, 0) / Math.max(spikes.length, 1), 1.0);

    return {
      severity,
      spikes,
      is_concerning: spikes.length >= 2 || severity > 0.4
    };
  }

  /**
   * HRV 급격한 변화 분석
   */
  analyzeHRVDisruption(sequence, userBaseline) {
    const hrvValues = sequence.map(d => d.hrv || d.stressLevel).filter(hrv => hrv > 0);
    if (hrvValues.length < 3) return { score: 0, disruption: false };

    const baselineHRV = userBaseline.hrv_mean || 45;
    const currentAvgHRV = hrvValues.reduce((sum, v) => sum + v, 0) / hrvValues.length;
    
    const disruption_percentage = (baselineHRV - currentAvgHRV) / baselineHRV;
    const score = Math.max(0, Math.min(disruption_percentage * 2, 1.0)); // 50% 감소시 최고점

    return {
      score,
      baseline_hrv: baselineHRV,
      current_avg_hrv: currentAvgHRV,
      disruption_percentage,
      disruption: disruption_percentage > 0.3 // 30% 이상 감소시 이상
    };
  }

  /**
   * 체온 변동 패턴 분석
   */
  analyzeTempIrregularity(sequence, userBaseline) {
    const tempValues = sequence.map(d => d.bodyTemperature).filter(t => t > 30 && t < 45);
    if (tempValues.length < 3) return { score: 0, irregular: false };

    const baselineTemp = userBaseline.temp_mean || 36.5;
    const tempChanges = tempValues.map(temp => Math.abs(temp - baselineTemp));
    const maxChange = Math.max(...tempChanges);
    const avgChange = tempChanges.reduce((sum, change) => sum + change, 0) / tempChanges.length;

    // 급격한 체온 변화 또는 지속적인 변동성
    const score = Math.min((maxChange + avgChange * 2) / 3, 1.0);

    return {
      score,
      max_change: maxChange,
      avg_change: avgChange,
      baseline_temp: baselineTemp,
      irregular: maxChange > 1.0 || avgChange > 0.5
    };
  }

  /**
   * 움직임 패턴 교란 분석
   */
  analyzeMovementDisruption(sequence) {
    const movementData = sequence.map(d => ({
      status: d.movementStatus,
      acceleration: d.acceleration || { x: 0, y: 0, z: 0 }
    }));

    if (movementData.length < 5) return { score: 0, disrupted: false };

    // 움직임 상태 변화 빈도 계산
    let statusChanges = 0;
    for (let i = 1; i < movementData.length; i++) {
      if (movementData[i].status !== movementData[i-1].status) {
        statusChanges++;
      }
    }

    const changeFrequency = statusChanges / movementData.length;
    
    // 가속도 변동성 계산 (있는 경우)
    const accelerations = movementData.map(d => 
      Math.sqrt(d.acceleration.x**2 + d.acceleration.y**2 + d.acceleration.z**2)
    );
    
    const accelVariance = this.calculateVariance(accelerations);
    const score = Math.min((changeFrequency * 2 + accelVariance * 0.1), 1.0);

    return {
      score,
      change_frequency: changeFrequency,
      accel_variance: accelVariance,
      disrupted: changeFrequency > 0.3 || accelVariance > 50
    };
  }

  /**
   * 호흡 불규칙성 분석
   */
  analyzeRespiratoryIrregularity(sequence) {
    const respiratoryData = sequence.map(d => d.respiratoryRate).filter(r => r > 0);
    if (respiratoryData.length < 5) return { score: 0, irregular: false };

    // 호흡수 변동성 계산
    const mean = respiratoryData.reduce((sum, r) => sum + r, 0) / respiratoryData.length;
    const variance = this.calculateVariance(respiratoryData);
    const cv = variance > 0 ? Math.sqrt(variance) / mean : 0; // 변동계수

    const score = Math.min(cv * 5, 1.0); // 변동계수 0.2 이상시 최고점

    return {
      score,
      coefficient_variation: cv,
      mean_rate: mean,
      variance,
      irregular: cv > 0.15 // 변동계수 15% 이상시 불규칙
    };
  }

  /**
   * Transformer 기반 마약 패턴 분석
   */
  async runDrugTransformerAnalysis(biometricData) {
    if (!this.model) {
      return { drug_probability: 0.3, drug_type: 'unknown', confidence: 0.2 };
    }

    try {
      const sequenceData = await this.prepareDrugSequenceData(biometricData);
      
      if (sequenceData.length < 20) {
        return { drug_probability: 0.2, drug_type: 'unknown', confidence: 0.1 };
      }

      const inputTensor = tf.tensor3d([sequenceData], [1, 20, 7]);
      const prediction = this.model.predict(inputTensor);
      const probabilities = await prediction.data();

      inputTensor.dispose();
      prediction.dispose();

      // 4-class 결과: [normal, stimulant, depressant, hallucinogen]
      const classes = ['normal', 'stimulant', 'depressant', 'hallucinogen'];
      const maxIndex = probabilities.indexOf(Math.max(...probabilities));

      return {
        drug_probability: 1 - probabilities[0], // 비정상 확률
        drug_type: classes[maxIndex],
        confidence: Math.max(...probabilities),
        class_probabilities: {
          normal: probabilities[0],
          stimulant: probabilities[1],
          depressant: probabilities[2],
          hallucinogen: probabilities[3]
        }
      };

    } catch (error) {
      logger.error('❌ 마약 Transformer 분석 실패', error);
      return { drug_probability: 0.3, drug_type: 'unknown', confidence: 0.1 };
    }
  }

  /**
   * 마약용 시계열 데이터 준비 (7 features)
   */
  async prepareDrugSequenceData(currentData) {
    try {
      const recentData = await BiometricData.find({
        userId: currentData.userId
      })
      .sort({ collectedAt: -1 })
      .limit(20);

      return recentData.reverse().map(data => [
        data.heartRate || 72,
        data.stressLevel || 20,
        data.bodyTemperature || 36.5,
        data.movementStatus === 'stationary' ? 0 : data.movementStatus === 'walking' ? 1 : 2,
        data.hrv || 45,
        data.oxygenLevel || 98,
        data.respiratoryRate || 16
      ]);

    } catch (error) {
      logger.error('❌ 마약 시계열 데이터 준비 실패', error);
      return [];
    }
  }

  /**
   * LLM 기반 마약 분석
   */
  async runDrugLLMAnalysis(biometricData, userBaseline, irregularityAnalysis) {
    const prompt = `
마약 사용 상태 분석 요청:

=== 사용자 베이스라인 ===
평균 심박수: ${userBaseline.hr_mean || 'N/A'}bpm
평균 HRV: ${userBaseline.hrv_mean || 'N/A'}ms
평균 체온: ${userBaseline.temp_mean || 'N/A'}°C

=== 현재 생체데이터 ===
심박수: ${biometricData.heartRate}bpm
스트레스/HRV: ${biometricData.stressLevel}/100
체온: ${biometricData.bodyTemperature || 'N/A'}°C
움직임: ${biometricData.movementStatus}
호흡수: ${biometricData.respiratoryRate || 'N/A'}회/분

=== 불규칙 패턴 분석 ===
심박수 변동성: ${irregularityAnalysis.patterns?.hr_volatility?.volatility?.toFixed(3) || 'N/A'} (${irregularityAnalysis.patterns?.hr_volatility?.is_abnormal ? '비정상' : '정상'})
급격한 심박수 변화: ${irregularityAnalysis.patterns?.hr_spikes?.spikes?.length || 0}회 감지
HRV 교란: ${irregularityAnalysis.patterns?.hrv_disruption?.disruption_percentage ? (irregularityAnalysis.patterns.hrv_disruption.disruption_percentage * 100).toFixed(1) + '%' : 'N/A'}
체온 변동: ${irregularityAnalysis.patterns?.temp_irregularity?.max_change?.toFixed(1) || 'N/A'}도 변화
움직임 교란: ${irregularityAnalysis.patterns?.movement_disruption?.disrupted ? '감지됨' : '정상'}

=== 마약 분류별 패턴 매칭 ===
각성제 패턴 (메스암페타민, 코카인): 심박수 급상승 + 체온 상승 + 과다활동
억제제 패턴 (헤로인, 오피오이드): 심박수 감소 + 체온 하강 + 활동 감소  
환각제 패턴 (LSD, PCP): 불규칙한 변동 + 체온 변동 + 불규칙 움직임

위 생체데이터 패턴을 분석하여 마약 사용 가능성과 유형을 판단해주세요.
응답 형식: "마약사용: [없음/각성제/억제제/환각제] | 심각도: [없음/경미/중등도/심각] | 근거: [상세분석] | 신뢰도: [0.0-1.0]"
    `;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1, // 더 일관된 분석을 위해 낮은 temperature
          top_p: 0.8,
          num_predict: 200
        }
      });

      return this.parseDrugAnalysis(response.data.response);

    } catch (error) {
      logger.error('❌ 마약 LLM 분석 실패', error);
      return {
        drug_type: 'unknown',
        severity: 'none',
        reasoning: '분석 실패',
        confidence: 0.1
      };
    }
  }

  /**
   * LLM 마약 분석 결과 파싱
   */
  parseDrugAnalysis(analysis) {
    const result = {
      drug_type: 'none',
      severity: 'none',
      reasoning: analysis,
      confidence: 0.3
    };

    // 마약 유형 추출
    if (analysis.includes('각성제')) {
      result.drug_type = 'stimulant';
    } else if (analysis.includes('억제제')) {
      result.drug_type = 'depressant';
    } else if (analysis.includes('환각제')) {
      result.drug_type = 'hallucinogen';
    }

    // 심각도 추출
    if (analysis.includes('심각')) {
      result.severity = 'severe';
      result.confidence = 0.9;
    } else if (analysis.includes('중등도')) {
      result.severity = 'moderate';
      result.confidence = 0.8;
    } else if (analysis.includes('경미')) {
      result.severity = 'mild';
      result.confidence = 0.7;
    }

    // 신뢰도 추출
    const confidenceMatch = analysis.match(/신뢰도:\s*([0-9]\.[0-9])/);
    if (confidenceMatch) {
      result.confidence = parseFloat(confidenceMatch[1]);
    }

    return result;
  }

  /**
   * 마약 예측 결과 통합
   */
  integrateDrugPredictions({ irregularity, transformer, volatility, llm }) {
    const weights = {
      irregularity: 0.4,  // 불규칙성이 마약 탐지의 핵심
      transformer: 0.3,   // 패턴 분류
      volatility: 0.2,    // 변동성 분석
      llm: 0.1            // LLM 해석
    };

    // 각 분석의 점수 정규화
    const irregularityScore = irregularity.overall_score;
    const transformerScore = transformer.drug_probability;
    const volatilityScore = volatility?.volatility_index || 0.2;
    const llmScore = llm.severity === 'severe' ? 0.9 :
                     llm.severity === 'moderate' ? 0.7 :
                     llm.severity === 'mild' ? 0.5 : 0.1;

    // 가중 평균 계산
    const combinedScore = (
      irregularityScore * weights.irregularity +
      transformerScore * weights.transformer +
      volatilityScore * weights.volatility +
      llmScore * weights.llm
    );

    // 최종 판정 (마약은 더 엄격한 기준 적용)
    const drug_detected = combinedScore > 0.7;
    
    // 마약 유형 결정 (Transformer와 LLM 결과 종합)
    let suspected_drug_type = 'none';
    if (drug_detected) {
      if (transformer.drug_type !== 'normal' && transformer.drug_type !== 'unknown') {
        suspected_drug_type = transformer.drug_type;
      } else if (llm.drug_type !== 'none' && llm.drug_type !== 'unknown') {
        suspected_drug_type = llm.drug_type;
      } else {
        suspected_drug_type = irregularity.likely_drug_type || 'unspecified';
      }
    }

    // 심각도 결정
    const drug_severity = combinedScore > 0.85 ? 'severe' :
                         combinedScore > 0.75 ? 'moderate' :
                         combinedScore > 0.65 ? 'mild' : 'none';

    return {
      drug_detected,
      suspected_drug_type,
      drug_severity,
      combined_score: combinedScore,
      evidence: {
        irregularity_flags: irregularity.red_flags,
        transformer_classification: transformer.class_probabilities,
        volatility_indicators: volatility,
        llm_reasoning: llm.reasoning
      }
    };
  }

  /**
   * 유틸리티 함수들
   */
  calculateVariance(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  async getRecentBiometricSequence(userId, limit = 20) {
    try {
      return await BiometricData.find({ userId })
        .sort({ collectedAt: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      logger.error('❌ 최근 생체데이터 조회 실패', error);
      return [];
    }
  }

  identifyDrugRedFlags(patterns) {
    const flags = [];
    
    if (patterns.hr_volatility?.is_abnormal) {
      flags.push('심박수_극심한_변동성');
    }
    
    if (patterns.hr_spikes?.is_concerning) {
      flags.push('심박수_급등_패턴');
    }
    
    if (patterns.hrv_disruption?.disruption) {
      flags.push('HRV_급격한_감소');
    }
    
    if (patterns.temp_irregularity?.irregular) {
      flags.push('체온_불규칙_변동');
    }
    
    if (patterns.movement_disruption?.disrupted) {
      flags.push('움직임_패턴_교란');
    }

    return flags;
  }

  predictDrugType(patterns) {
    // 패턴 기반 마약 유형 예측 로직
    const scores = {
      stimulant: 0,
      depressant: 0,
      hallucinogen: 0
    };

    // 각성제 패턴
    if (patterns.hr_spikes?.spikes?.length > 2) scores.stimulant += 0.3;
    if (patterns.temp_irregularity?.max_change > 1.0) scores.stimulant += 0.2;
    if (patterns.movement_disruption?.change_frequency > 0.4) scores.stimulant += 0.2;

    // 억제제 패턴 (낮은 활동성)
    if (patterns.hr_volatility?.volatility < 0.1) scores.depressant += 0.2;
    if (patterns.movement_disruption?.change_frequency < 0.2) scores.depressant += 0.3;

    // 환각제 패턴 (불규칙성)
    if (patterns.hr_volatility?.volatility > 0.2) scores.hallucinogen += 0.3;
    if (patterns.respiratory_irregularity?.irregular) scores.hallucinogen += 0.2;

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore < 0.4) return 'unspecified';

    return Object.keys(scores).find(type => scores[type] === maxScore);
  }

  calculateDrugConfidence(result) {
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

  generateDrugExplanation(result, biometricData, userBaseline) {
    if (!result.drug_detected) {
      return '생체신호가 정상 범위 내에 있으며 마약 사용 징후가 발견되지 않았습니다.';
    }

    const explanations = [];
    
    result.evidence.irregularity_flags.forEach(flag => {
      switch (flag) {
        case '심박수_극심한_변동성':
          explanations.push('심박수가 극도로 불규칙한 패턴을 보임');
          break;
        case '심박수_급등_패턴':
          explanations.push('심박수의 급격한 상승이 반복적으로 감지됨');
          break;
        case 'HRV_급격한_감소':
          explanations.push('심박변이도가 평상시보다 현저히 감소');
          break;
        case '체온_불규칙_변동':
          explanations.push('체온의 비정상적인 변동 패턴 관찰');
          break;
        case '움직임_패턴_교란':
          explanations.push('움직임 패턴의 급격한 변화 감지');
          break;
      }
    });

    const typeExplanation = result.suspected_drug_type === 'stimulant' ? '각성제 사용 패턴' :
                           result.suspected_drug_type === 'depressant' ? '억제제 사용 패턴' :
                           result.suspected_drug_type === 'hallucinogen' ? '환각제 사용 패턴' : 
                           '마약 사용 패턴';

    return `${typeExplanation} 감지: ${explanations.join(', ')}. ${result.drug_severity} 수준의 마약 사용이 의심됩니다.`;
  }

  generateDrugRecommendation(result) {
    if (!result.drug_detected) {
      return ['계속 모니터링 중', '정상 상태 유지'];
    }

    const recommendations = [];

    switch (result.drug_severity) {
      case 'severe':
        recommendations.push('🚨 즉시 응급의료진 호출 필요');
        recommendations.push('💊 중독 치료 전문의 상담 긴급 요청');
        recommendations.push('🏥 가까운 응급실 즉시 이송');
        recommendations.push('👁️ 의식 수준 지속적 모니터링');
        break;

      case 'moderate':
        recommendations.push('⚠️ 의료진 연락 권장');
        recommendations.push('🔍 정밀 검사 필요');
        recommendations.push('🏠 안전한 환경에서 관찰');
        recommendations.push('📞 중독 상담 핫라인 연결');
        break;

      case 'mild':
        recommendations.push('👀 면밀한 관찰 필요');
        recommendations.push('📊 추가 생체신호 모니터링');
        recommendations.push('💬 상담사와 대화 권장');
        break;
    }

    // 마약 유형별 특별 권장사항
    if (result.suspected_drug_type === 'stimulant') {
      recommendations.push('💧 수분 섭취 및 체온 조절 중요');
    } else if (result.suspected_drug_type === 'depressant') {
      recommendations.push('🫁 호흡 상태 특별 모니터링');
    } else if (result.suspected_drug_type === 'hallucinogen') {
      recommendations.push('🛡️ 안전한 환경 확보 및 자해 방지');
    }

    return recommendations;
  }
}

module.exports = DrugDetectionService;