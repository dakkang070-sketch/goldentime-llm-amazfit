const axios = require('axios');

function getOllamaConfig() {
  // 파인튜닝된 모델이 있으면 우선 사용
  const fineTunedModel = process.env.OLLAMA_FINETUNED_MODEL || 'goldentime-emergency:latest';
  const defaultModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  
  // 파인튜닝 모델 사용 여부 확인
  const useFineTuned = process.env.USE_FINETUNED_MODEL === 'true';
  
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: useFineTuned ? fineTunedModel : defaultModel,
  };
}

/**
 * Ollama로 “설명/권고” 텍스트를 생성합니다.
 * - 의료기기 회피를 위해: 진단/확정 표현 금지, 권고/가능성 중심으로만 생성하도록 프롬프트에 강제합니다.
 */
async function generateNonDiagnosticSummary({ userBaseline, biometric, ruleResult }) {
  const { baseUrl, model } = getOllamaConfig();

  const prompt = `
너는 응급구조사가 참고할 “상황 요약”을 작성한다.
중요 규칙:
- 절대 의료적 진단/확정/질병명 단정 금지
- '가능성', '의심', '권고', '추가 확인 필요' 같은 표현 사용
- 행동 권고는 “관제 확인/보호자 확인/응급구조사 출동 권고” 수준으로 제한
- 결과는 한국어로, 3~6문장 이내

기초선(가능하면 참고):
- baseline_hr_avg: ${userBaseline?.baselineHrAvg ?? 'unknown'}

현재 데이터:
- collectedAt: ${biometric.collectedAt}
- heartRate: ${biometric.heartRate ?? 'unknown'}
- stressLevel: ${biometric.stressLevel ?? 'unknown'}
- movementStatus: ${biometric.movementStatus ?? 'unknown'}
- location: ${biometric.location?.lat}, ${biometric.location?.lng}

규칙 기반 판정:
- emergencyLevel: ${ruleResult.level}
- anomalies: ${ruleResult.anomalies.map((a) => `${a.type}:${a.description}`).join(' | ') || 'none'}

요약을 작성해라.
`.trim();

  const resp = await axios.post(
    `${baseUrl}/api/generate`,
    {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.2,
      },
    },
    { timeout: 30000 }
  );

  // Ollama 응답 구조: { response: "..." }
  const text = resp?.data?.response;
  return typeof text === 'string' ? text.trim() : null;
}

/**
 * 주간 건강 리포트 생성 (사용자 앱용)
 * - 의료적 진단이 아닌 건강 관리 조언 중심
 */
async function generateWeeklyHealthReport({ userProfile, weeklyData }) {
  const { baseUrl, model } = getOllamaConfig();

  const prompt = `
당신은 GOLDENTIME 스마트워치의 수석 의료 AI 어시스턴트입니다.
사용자의 지난 7일간 건강 데이터를 분석하여 주간 건강 리포트를 작성해주세요.

사용자 정보:
- 나이/성별: ${userProfile.age}세 / ${userProfile.gender}
- 기저질환: ${userProfile.diseases || '없음'}

주간 데이터 요약:
- 평균 심박수: ${weeklyData.avgHeartRate} bpm (최저 ${weeklyData.minHeartRate} - 최고 ${weeklyData.maxHeartRate})
- 평균 걸음수: ${weeklyData.avgSteps} 보
- 평균 수면시간: ${weeklyData.avgSleep} 시간
- 특이사항: ${weeklyData.anomalies ? weeklyData.anomalies.join(', ') : '특이사항 없음'}

작성 규칙:
1. 한국어로 작성하며, 전문적이면서도 친절한 어조를 사용하세요.
2. 절대 '진단', '확진' 등의 단정적인 의료 용어는 피하고 '관찰됩니다', '권장됩니다' 등의 표현을 사용하세요.
3. 다음 3가지 항목으로 구성하여 요약하세요:
   - 📊 주간 건강 요약 (전반적인 상태 평가)
   - 🔍 주요 관찰 사항 (데이터 기반의 구체적 발견점)
   - 💡 다음 주 건강 팁 (구체적인 행동 제안)

답변은 마크다운 형식을 사용하지 말고 일반 텍스트로 작성하세요.
`.trim();

  try {
    const resp = await axios.post(
      `${baseUrl}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7, // 창의적인 조언을 위해 약간 높임
        },
      },
      { timeout: 45000 } // 분석이므로 타임아웃 넉넉하게
    );

    const text = resp?.data?.response;
    return typeof text === 'string' ? text.trim() : "AI 분석을 완료할 수 없습니다.";
  } catch (error) {
    console.error("Ollama API Error:", error.message);
    // 폴백(Fallback) 메시지
    return "현재 AI 서비스 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.";
  }
}

/**
 * 범용 텍스트 생성 (다른 서비스에서 호출용)
 */
async function generateText(prompt, options = {}) {
  const { baseUrl, model } = getOllamaConfig();

  try {
    const resp = await axios.post(
      `${baseUrl}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
        },
      },
      { timeout: options.timeout || 60000 }
    );

    const text = resp?.data?.response;
    return typeof text === 'string' ? text.trim() : "분석 내용을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Ollama API Error:", error.message);
    throw new Error("Local LLM (Ollama) 연결 실패");
  }
}

module.exports = {
  generateNonDiagnosticSummary,
  generateWeeklyHealthReport,
  generateText
};

