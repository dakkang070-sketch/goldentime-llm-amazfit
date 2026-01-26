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
      const input = (data && data.data) ? data.data : (data || {});
      const { 
        transcript, 
        location, 
        studentId, 
        audioUrl, 
        preComputedAnalysis, 
        audioFeatures, 
        biometrics 
      } = input;

      const cleanedTranscript = this._normalizeTranscript(transcript);

      logger.info(
        `[SchoolViolence] Analyzing transcript: ${cleanedTranscript.substring(0, 50)}...`,
      );
      
      // 1. LLM Analysis
      // Use pre-computed analysis if available to save time (avoid double inference)
      let analysis;
      if (preComputedAnalysis && preComputedAnalysis.category && preComputedAnalysis.reasoning) {
        logger.info("[SchoolViolence] Using pre-computed analysis from STT service");
        analysis = preComputedAnalysis;
        
        // Fix for [object Object] issue: Ensure reasoning is a string
        if (typeof analysis.reasoning === 'object') {
             logger.warn("[SchoolViolence] Reasoning is an object, converting to string");
             // If it has specific fields, join them
             if (analysis.reasoning.situation || analysis.reasoning.psychology) {
                 analysis.reasoning = `[상황 분석]: ${analysis.reasoning.situation || ''}\n[심리 분석]: ${analysis.reasoning.psychology || ''}\n[위험 요소]: ${analysis.reasoning.danger || ''}`;
             } else {
                 analysis.reasoning = JSON.stringify(analysis.reasoning, null, 2);
             }
        }
      } else {
        if (preComputedAnalysis) {
          logger.warn("[SchoolViolence] Pre-computed analysis invalid or missing fields, re-analyzing...");
        }
        analysis = await this._callLLMOrHeuristic(cleanedTranscript, biometrics);
      }

      // Merge audio features if provided
      if (audioFeatures) {
        analysis.audioFeatures = audioFeatures;
        
        // Map audio feature intensity to a simple emotion ONLY if primaryEmotion is missing or "Unknown"
        if (!analysis.primaryEmotion || analysis.primaryEmotion === "Unknown") {
             if (audioFeatures.intensity === "High") analysis.primaryEmotion = "격앙됨/흥분";
             else if (audioFeatures.intensity === "Low") analysis.primaryEmotion = "위축됨/불안";
             else analysis.primaryEmotion = "평이함";
        }
      }

      // 2. Atmosphere & Tone Enhancement (New)
      // If the LLM didn't provide tone/atmosphere, try to infer or set defaults
      if (!analysis.tone) analysis.tone = "Neutral";
      if (!analysis.atmosphere) analysis.atmosphere = "Unknown";
      
      // Update reasoning with atmosphere if available (Ensure reasoning is string first)
      if (typeof analysis.reasoning === 'object') {
          if (analysis.reasoning.situation || analysis.reasoning.psychology) {
              analysis.reasoning = `[상황 분석]: ${analysis.reasoning.situation || ''}\n[심리 분석]: ${analysis.reasoning.psychology || ''}\n[위험 요소]: ${analysis.reasoning.danger || ''}`;
          } else {
              analysis.reasoning = JSON.stringify(analysis.reasoning, null, 2);
          }
      } else if (typeof analysis.reasoning !== 'string') {
          analysis.reasoning = String(analysis.reasoning || "");
      }

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

      if (isSeriousExtortion && analysis.category !== "금품 갈취") {
        analysis.category = "금품 갈취";
        analysis.severity = "Critical";
        // Append warning instead of replacing, and remove "(기존 분석 보완)"
        const warningMsg = `[시스템 긴급 진단]: 대화 내용 중 '${foundExtortion.join("', '")}' 등 금품 갈취와 관련된 치명적 키워드가 검출되었습니다. 이에 따라 위험 등급을 '긴급'으로 상향합니다.`;
        analysis.reasoning = analysis.reasoning ? `${analysis.reasoning}\n\n${warningMsg}` : warningMsg;
        analysis.keywords = [...new Set([...(analysis.keywords || []), ...foundExtortion])];
        analysis.primaryEmotion = "위협/공포";
        analysis.confidence = 99;
      } else if (isSeriousThreat && analysis.category !== "협박 및 강요") {
        analysis.category = "협박 및 강요";
        analysis.severity = "Critical";
        // Append warning instead of replacing, and remove "(기존 분석 보완)"
        const warningMsg = `[시스템 긴급 진단]: 특정 장소 유인 및 신체적 위협 키워드('${foundThreat.join("', '")}')가 검출되었습니다. 2차 피해 위험이 높아 즉각적인 개입이 필요합니다.`;
        analysis.reasoning = analysis.reasoning ? `${analysis.reasoning}\n\n${warningMsg}` : warningMsg;
        analysis.keywords = [...new Set([...(analysis.keywords || []), ...foundThreat])];
        analysis.primaryEmotion = "공포/절박함";
        analysis.confidence = 99;
      }

      if (analysis.reasoning && typeof analysis.reasoning === "string") {
        analysis.reasoning = this._sanitizeReasoning(analysis.reasoning);
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
        transcript: cleanedTranscript,
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
      // User Request: Remove biometrics from context analysis
      const llmResult = await this._callOllama(transcript);
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
    let category = "일상 대화";
    let severity = "Normal";
    let reasoning = "특이사항 없음";

    // Simple keyword matching for demo purposes
    const foundViolenceKeywords = violenceKeywords.filter((k) => transcript.includes(k));
    const foundPrankKeywords = prankKeywords.filter((k) => transcript.includes(k));
    
    const hasViolence = foundViolenceKeywords.length > 0;
    const hasPrank = foundPrankKeywords.length > 0;

    if (hasViolence) {
      if (hasPrank) {
        category = "장난";
        severity = "Caution";
        reasoning = `[상황 분석]: 폭력적인 단어('${foundViolenceKeywords.join("', '")}')가 사용되었으나, 장난을 암시하는 표현('${foundPrankKeywords.join("', '")}')이 함께 감지되었습니다.\n[심리 분석]: 친구 사이의 거친 장난이나 농담 상황으로 추정됩니다.\n[위험 요소]: 즉각적인 위험은 낮으나, 언어 습관에 대한 주의가 필요합니다.`;
        score = 40;
      } else {
        category = "신체 폭력";
        severity = "Critical";
        reasoning = `[상황 분석]: 대화 중 폭력 및 위협과 관련된 직접적인 표현('${foundViolenceKeywords.join("', '")}')이 다수 감지되었습니다.\n[심리 분석]: 발화자의 공격적인 태도와 상대방에 대한 위협 의도가 뚜렷합니다.\n[위험 요소]: 신체적 폭력이나 강압적인 행위가 발생하고 있을 가능성이 매우 높아 즉각적인 개입이 필요합니다.`;
        score = 95;
      }
    } else if (hasPrank) {
      category = "장난";
      severity = "Normal";
      reasoning = `[상황 분석]: 친구 간의 일상적인 대화나 가벼운 농담('${foundPrankKeywords.join("', '")}')이 감지되었습니다.\n[심리 분석]: 긍정적이고 우호적인 관계가 형성되어 있습니다.\n[위험 요소]: 학교 폭력 위험 징후는 발견되지 않았습니다.`;
      score = 10;
    } else {
      // Default case for no keywords
      reasoning = `[상황 분석]: 특이한 폭력 징후나 위험 키워드가 발견되지 않은 일상적인 대화입니다.\n[심리 분석]: 발화자들 간의 평이한 감정 상태가 유지되고 있습니다.\n[위험 요소]: 없음`;
    }

    // Return structured result
    return {
      category,
      severity,
      confidence: score,
      reasoning,
      keywords: foundViolenceKeywords,
      primaryEmotion: category === "신체 폭력" ? "분노/공포" : "즐거움/평이함"
    };
  }

  _normalizeTranscript(transcript) {
    const value = typeof transcript === "string" ? transcript : String(transcript || "");
    return value
      .replace(/<\|.*?\|>/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\|{2,}/g, " ")
      .replace(/(팟캐스트|인터페이스)/g, "")
      .replace(/[_=~\-]{3,}/g, " ")
      .replace(/[^0-9a-zA-Z가-힣\s.,?!'"()%]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  _sanitizeReasoning(reasoning) {
    if (typeof reasoning !== "string") return "";
    const lines = reasoning
      .replace(/<\|.*?\|>/g, "")
      .replace(/\[keywords\]\s*:\s*.*$/gim, "")
      .replace(/\[키워드\]\s*:\s*.*$/gim, "")
      .replace(/\|{2,}/g, " ")
      .split("\n")
      .map((line) => {
        const hasUiNoise = /(팟캐스트|인터페이스|\|\|\|)/.test(line);
        let cleaned = line.replace(/(팟캐스트|인터페이스|\|\|\|)/g, "");
        if (hasUiNoise) {
          cleaned = cleaned.replace(/프로그램/g, "");
        }
        return cleaned.replace(/\s+/g, " ").trim();
      })
      .filter((line) => line);
    return lines
      .join("\n")
      .replace(/\bCritical\b/g, "긴급")
      .replace(/\bWarning\b/g, "주의")
      .replace(/\bCaution\b/g, "주의")
      .replace(/\bNormal\b/g, "정상")
      .replace(/\bUncertain\b/g, "불확실")
      .trim();
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

  async _callOllama(transcript) {
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

      // User Request: Biometrics removed from context analysis
      // const biometricContext = ... (Removed)

      const prompt = `
      You are an expert in detecting school violence from audio transcripts (involving 2-4 speakers).
      Analyze the conversation flow, power dynamics, and interaction between speakers to distinguish between playful banter and actual violence/harassment.
      Use only the transcript content. Do not speculate about UI, interfaces, sound effects, or metadata.
      If information is insufficient or ambiguous, clearly say "정보 부족" and avoid assumptions.
      
      ${fewShotExamples}
      
      Target Transcript: "${transcript}"
      
      Determine if this is "일상 대화", "장난", "언어 폭력", "협박 및 강요", "금품 갈취", "따돌림", "사이버 폭력", "성희롱", or "신체 폭력".
      Assess severity as "Normal", "Caution", or "Critical".
      
      Analyze the situation in detail:
      1. Situation Analysis: What is happening? Who is doing what?
      2. Psychological Analysis: What are the speakers feeling? What is the power dynamic?
      3. Risk Factors: What are the specific threats or dangerous elements?
      4. Primary Emotion: What is the dominant emotion (e.g., Fear, Anger, Joy, Sadness, Neutral)? Provide in Korean.
      Keep sentences short and natural in Korean.
      
      Respond in JSON format:
      {
        "category": "String (Korean)",
        "severity": "String",
        "confidence": Number,
        "reasoning": {
            "situation": "String (Korean, detailed)",
            "psychology": "String (Korean, detailed)",
            "danger": "String (Korean, detailed)"
        },
        "primaryEmotion": "String (Korean)"
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
        
        // Format structured reasoning into string for frontend compatibility
        let formattedReasoning = "";
        if (typeof result.reasoning === 'object') {
            formattedReasoning = `[상황 분석]: ${result.reasoning.situation || ''}\n[심리 분석]: ${result.reasoning.psychology || ''}\n[위험 요소]: ${result.reasoning.danger || ''}`;
        } else {
            formattedReasoning = result.reasoning;
        }
        formattedReasoning = this._sanitizeReasoning(String(formattedReasoning || ""));

        return {
          category: result.category,
          severity: result.severity,
          confidence: result.confidence,
          reasoning: formattedReasoning,
          primaryEmotion: result.primaryEmotion,
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
