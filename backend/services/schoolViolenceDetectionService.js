const SchoolViolenceCase = require("../models/SchoolViolenceCase");
const logger = require("../utils/logger");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { emitSchoolViolenceCaseCreated } = require("./socketService");

class SchoolViolenceDetectionService {
  constructor() {
    this.audioDir = path.join(__dirname, "../../uploads/audio");
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }

    this.ollamaBaseUrl =
      process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.inferenceServerUrl =
      process.env.INFERENCE_SERVER_URL || "http://localhost:5001/analyze";
    this.model = "goldentime-violence:latest"; // Dedicated model name

    // Load dataset for few-shot prompting
    try {
      const dataPath = path.join(
        __dirname,
        "../data/school_violence_dataset.json",
      );
      if (fs.existsSync(dataPath)) {
        this.dataset = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      } else {
        this.dataset = [];
        logger.warn(
          "[SchoolViolence] Dataset file not found, running without few-shot examples.",
        );
      }
    } catch (e) {
      logger.error("[SchoolViolence] Failed to load dataset:", e);
      this.dataset = [];
    }
  }

  /**
   * Analyzes audio transcript for school violence indicators
   * @param {Object} data - { transcript, location, studentId, audioUrl, preComputedAnalysis }
   */
  async analyzeSituation(data) {
    try {
      const { transcript, location, studentId, audioUrl, biometrics, preComputedAnalysis, audioFeatures } = data;
      logger.info(
        `[SchoolViolence] Analyzing transcript: ${transcript.substring(0, 50)}...`,
      );
      
      // 1. LLM Analysis
      // Use pre-computed analysis if available to save time (avoid double inference)
      let analysis;
      if (preComputedAnalysis) {
        logger.info("[SchoolViolence] Using pre-computed analysis from STT service");
        analysis = preComputedAnalysis;
      } else {
        analysis = await this._callLLMOrHeuristic(transcript, biometrics);
      }

      // Merge audio features if provided
      if (audioFeatures) {
        analysis.audioFeatures = audioFeatures;
        
        // Map audio feature intensity to a simple emotion if primaryEmotion is missing
        if (!analysis.primaryEmotion) {
             if (audioFeatures.intensity === "High") analysis.primaryEmotion = "격앙됨/흥분";
             else if (audioFeatures.intensity === "Low") analysis.primaryEmotion = "위축됨/불안";
             else analysis.primaryEmotion = "평이함";
        }
      }

      // 2. Atmosphere & Tone Enhancement (New)
      // If the LLM didn't provide tone/atmosphere, try to infer or set defaults
      if (!analysis.tone) analysis.tone = "Neutral";
      if (!analysis.atmosphere) analysis.atmosphere = "Unknown";
      
      // Update reasoning with atmosphere if available
      if (analysis.tone !== "Neutral" || analysis.atmosphere !== "Unknown") {
        analysis.reasoning = `${analysis.reasoning} (분위기: ${analysis.atmosphere}, 어조: ${analysis.tone})`;
      }

      // 3. Heuristic Override for High-Confidence Misclassifications
      // If the LLM misses or misclassifies obvious extortion or threat keywords, override it.
      const extortionKeywords = ["돈", "만원", "천원", "가져와", "내놔", "뺏", "빌려줘", "상납"];
      const threatKeywords = ["옥상", "따라와", "죽여", "뒤져", "가만 안", "튀어와"];
      
      const foundExtortion = extortionKeywords.filter(kw => transcript.includes(kw));
      const foundThreat = threatKeywords.filter(kw => transcript.includes(kw));
      
      const isSeriousExtortion = foundExtortion.length > 0 && (transcript.includes("가져와") || transcript.includes("내놔") || transcript.includes("뺏"));
      const isSeriousThreat = foundThreat.length > 0 && (transcript.includes("옥상") || transcript.includes("따라와") || transcript.includes("죽여"));

      if (isSeriousExtortion && analysis.category !== "Extortion") {
        analysis.category = "Extortion";
        analysis.severity = "Critical";
        analysis.reasoning = "금전 요구 및 갈취 의심 키워드가 검출되어 긴급 분석되었습니다. (시스템 보정)";
        analysis.keywords = [...new Set([...(analysis.keywords || []), ...foundExtortion])];
        analysis.confidence = 99;
      } else if (isSeriousThreat && analysis.category !== "Threat/Coercion") {
        analysis.category = "Threat/Coercion";
        analysis.severity = "Critical";
        analysis.reasoning = "특정 장소 유인 및 신체적 위협 키워드가 검출되어 긴급 분석되었습니다. (시스템 보정)";
        analysis.keywords = [...new Set([...(analysis.keywords || []), ...foundThreat])];
        analysis.confidence = 99;
      }

      // 3. Sanitize severity to ensure it matches schema
      const validSeverities = [
        "Critical",
        "Warning",
        "Caution",
        "Normal",
        "Uncertain",
      ];
      if (!validSeverities.includes(analysis.severity)) {
        logger.warn(
          `[SchoolViolence] Invalid severity '${analysis.severity}' detected, defaulting to 'Caution'`,
        );
        analysis.severity = "Caution";
      }

      // 2. Save Case
      // Ensure location is an object
      let safeLocation = location;
      if (typeof location === "string") {
        safeLocation = {
          lat: 37.5665,
          lng: 126.978,
          address: location,
        };
      } else if (!location) {
        safeLocation = {
          lat: 37.5665,
          lng: 126.978,
          address: "Unknown Location",
        };
      }

      const newCase = new SchoolViolenceCase({
        studentId,
        location: safeLocation,
        transcript,
        audioUrl,
        biometrics,
        analysisResult: analysis,
        status: "Reported", // Always report to dashboard for review, even if Normal
      });

      logger.info("[SchoolViolence] Saving new case to DB...");
      await newCase.save();
      logger.info(
        `[SchoolViolence] Case saved successfully. ID: ${newCase._id}`,
      );

      // Emit socket event for real-time dashboard update
      emitSchoolViolenceCaseCreated(newCase.toObject());

      // 3. Trigger Police Alert if Critical
      // NOTE: 경찰청 연동 협의 전이므로 자동 출동 기능 비활성화 (2025-01-23)
      // if (analysis.severity === "Critical") {
      //   await this._triggerPoliceAlert(newCase);
      // }

      return newCase;
    } catch (error) {
      logger.error("[SchoolViolence] Analysis failed", error);
      throw error;
    }
  }

  async _callLLMOrHeuristic(transcript, biometrics) {
    try {
      // 1. Try Local Inference Server (Python / LoRA)
      const localResult = await this._callLocalInferenceServer(transcript);
      if (localResult) return localResult;
    } catch (e) {
      logger.debug(
        "[SchoolViolence] Local inference server not available, trying Ollama...",
      );
    }

    try {
      // 2. Try Ollama (if configured)
      const llmResult = await this._callOllama(transcript, biometrics);
      if (llmResult) {
        return llmResult;
      }
    } catch (error) {
      logger.warn(
        "[SchoolViolence] LLM call failed, falling back to heuristic:",
        error.message,
      );
    }

    // 3. Fallback to heuristic
    const violenceKeywords = [
      "때려",
      "죽여",
      "돈내놔",
      "싸움",
      "피나",
      "맞을래",
      "옥상",
      "찐따",
      "병신",
      "씨발",
      "묶어",
      "동영상",
      "칼",
      "상납",
      "빌려줘",
      "내놔",
      "갚을게",
      "뒤진다",
      "따라와",
    ];

    const prankKeywords = ["ㅋㅋㅋ", "장난", "미안", "쏘리", "뻥이야"];

    let score = 0;
    let category = "Normal";
    let severity = "Normal";
    let reasoning = "특이사항 없음";

    // Simple keyword matching for demo purposes
    const hasViolence = violenceKeywords.some((k) => transcript.includes(k));
    const hasPrank = prankKeywords.some((k) => transcript.includes(k));

    // Biometric Analysis
    const isHighStress =
      biometrics && (biometrics.heartRate > 100 || biometrics.stressLevel > 60);

    if (hasViolence) {
      if (hasPrank && !isHighStress) {
        category = "Prank";
        severity = "Caution";
        reasoning =
          "폭력적인 언어가 감지되었으나, 장난스러운 문맥과 안정적인 생체신호가 감지됨.";
        score = 40;
      } else {
        category = "Physical Violence";
        severity = "Critical";
        reasoning = isHighStress
          ? "폭력적 언어와 함께 급격한 스트레스 상승이 감지됨. 실제 위협 상황으로 판단."
          : "직접적인 폭력 행사 및 위협적인 언어 감지됨. 즉각적인 개입 필요.";
        score = 95;
      }
    } else if (isHighStress) {
      // No obvious violence keywords but high stress
      category = "Conflict";
      severity = "Warning";
      reasoning =
        "명확한 폭력 언어는 감지되지 않았으나, 비정상적인 생체 신호(높은 스트레스/심박수)가 감지되어 주의가 필요함.";
      score = 75;
    } else if (hasPrank) {
      category = "Prank";
      severity = "Normal";
      reasoning = "친구 간의 일상적인 장난으로 판단됨.";
      score = 10;
    }

    // Return structured result
    return {
      category,
      severity,
      confidence: score,
      reasoning,
      keywords: violenceKeywords.filter((k) => transcript.includes(k)),
    };
  }

  async _callLocalInferenceServer(transcript) {
    try {
      const response = await axios.post(
        this.inferenceServerUrl,
        { transcript },
        { timeout: 60000 }, // 60s timeout
      );

      if (response.data && response.data.category) {
        logger.info("[SchoolViolence] Local Inference Success:", response.data);
        return {
          category: response.data.category,
          severity: response.data.severity,
          reasoning: response.data.reasoning,
          primaryEmotion: response.data.primaryEmotion,
          tone: response.data.tone,
          atmosphere: response.data.atmosphere,
          keywords: response.data.keywords || [],
          confidence: response.data.confidence || 80,
        };
      }
    } catch (error) {
      // Don't log full error to avoid noise if server is just offline
      throw new Error("Local inference server unreachable");
    }
    return null;
  }

  async _callOllama(transcript, biometrics) {
    try {
      // Construct Few-Shot Prompt
      let fewShotExamples = "";
      if (this.dataset && this.dataset.length > 0) {
        // Select a few diverse examples
        const examples = this.dataset
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
        fewShotExamples =
          "Reference Examples:\n" +
          examples
            .map(
              (ex) =>
                `- Text: "${ex.text}" -> Category: "${ex.category}" (${ex.description})`,
            )
            .join("\n") +
          "\n";
      }

      let biometricContext = "";
      if (biometrics) {
        biometricContext = `
        Biometric Data:
        - Heart Rate: ${Math.round(biometrics.heartRate)} bpm
        - Stress Level: ${Math.round(biometrics.stressLevel)}/100
        - Movement Intensity: ${biometrics.movementIntensity.toFixed(1)}/10
        
        Consider these biometrics. High heart rate (>100) and stress (>60) usually indicate real danger, fear, or excitement.
        Normal levels with aggressive language might indicate a prank or game.
        `;
      }

      const prompt = `
      You are an expert in detecting school violence from audio transcripts (involving 2-4 speakers) and biometric data.
      Analyze the conversation flow, power dynamics, and interaction between speakers to distinguish between playful banter and actual violence/harassment.
      
      ${fewShotExamples}
      ${biometricContext}
      
      Target Transcript: "${transcript}"
      
      Determine if this is "Normal", "Prank", "Verbal Abuse", "Threat/Coercion", "Extortion", "Bullying", "Cyber Bullying", "Sexual Harassment", or "Physical Violence".
      Assess severity as "Normal", "Caution", or "Critical".
      Provide a confidence score (0-100) and a brief reasoning in Korean, mentioning speaker dynamics if relevant.
      
      Respond in JSON format:
      {
        "category": "String",
        "severity": "String",
        "confidence": Number,
        "reasoning": "String (Korean)"
      }
      `;

      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        format: "json",
      });

      if (response.data && response.data.response) {
        const result = JSON.parse(response.data.response);
        return {
          category: result.category,
          severity: result.severity,
          confidence: result.confidence,
          reasoning: result.reasoning,
          keywords: [], // LLM might not return keywords easily without more complex prompting
        };
      }
    } catch (error) {
      logger.warn(
        `[SchoolViolence] Failed to connect to Ollama (${this.model}): ${error.message}`,
      );
      // Don't throw, just return null to trigger fallback
      return null;
    }
    return null;
  }

  async _triggerPoliceAlert(caseData) {
    logger.warn(
      `[SchoolViolence] 🚨 POLICE ALERT TRIGGERED for Case ${caseData._id}`,
    );
    // Simulate API call to Police Department
    // await axios.post('https://api.police.go.kr/v1/report', { ... });

    caseData.status = "Police Dispatched";
    caseData.policeReportedAt = new Date();
    caseData.policeResponse = "Dispatching unit from nearby station.";
    await caseData.save();
  }

  async getRecentCases() {
    return await SchoolViolenceCase.find().sort({ detectedAt: -1 }).limit(50);
  }
}

module.exports = new SchoolViolenceDetectionService();
