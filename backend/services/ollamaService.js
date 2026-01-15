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

module.exports = {
  generateNonDiagnosticSummary,
};

