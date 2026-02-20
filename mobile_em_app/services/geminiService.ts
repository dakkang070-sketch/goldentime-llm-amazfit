import { GoogleGenAI } from "@google/genai";
import { Incident, Member } from "../types";

const apiKey = process.env.VITE_GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;

try {
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }
} catch (error) {
  console.error("Gemini SDK Initialization Error:", error);
}

export const generateIncidentReport = async (incident: Incident, member?: Member): Promise<string> => {
  if (!ai || !apiKey) return "AI 서비스가 비활성화되어 있거나 API 키가 설정되지 않았습니다.";

  try {
    const prompt = `
      당신은 응급 대응 센터의 전문 의료 AI 어시스턴트입니다.
      다음 사고 데이터와 환자 프로필을 분석하여 관제 요원을 위한 간결한 상황 보고서를 작성하세요.
      
      **사고 데이터:**
      - 유형: ${incident.type}
      - 심각도: ${incident.severity}
      - 발생 시각: ${incident.timestamp}
      - AI 신뢰도: ${incident.aiConfidence}%
      - 심박수 (해당 시): ${incident.heartRate || '정보 없음'} bpm
      
      **환자 프로필 (정보가 있는 경우):**
      - 나이: ${member?.age || '알 수 없음'}
      - 기저 질환: ${member?.medicalConditions.join(', ') || '기록 없음'}
      - 위험 등급: ${member?.riskLevel || '알 수 없음'}

      **지시 사항:**
      1. 사고 유형과 환자 병력을 바탕으로 잠재적인 위험성을 요약하세요.
      2. 관제 요원이 취해야 할 즉각적인 조치 사항을 제안하세요.
      3. 전문적이고 긴급하며 간결하게 작성하세요 (150자 이내, 한국어).
    `;

    const model = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const response = await model;
    return response.text || "분석 내용이 생성되지 않았습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 분석 중 오류가 발생했습니다. 시스템 로그를 확인하세요.";
  }
};

export const analyzeMemberRisk = async (member: Member): Promise<string> => {
  if (!ai || !apiKey) return "AI 서비스가 비활성화되어 있거나 API 키가 설정되지 않았습니다.";

  try {
    const bio = member.biometrics;
    const prompt = `
      이 환자의 실시간 생체 데이터를 분석하고 건강 상태 요약 및 예방 조치를 제안하세요.
      
      **환자 정보:**
      - 이름: ${member.name} (${member.age}세, ${member.gender})
      - 기저 질환: ${member.medicalConditions.join(', ') || '없음'}
      - 현재 위험 등급: ${member.riskLevel}

      **실시간 생체 데이터:**
      1. 심박수: ${bio.heartRate} bpm
      2. 혈압: ${bio.bloodPressure} mmHg
      3. 산소포화도: ${bio.bloodOxygen}%
      4. 체온: ${bio.temperature}°C
      5. 혈당: ${bio.bloodGlucose} mg/dL
      6. 스트레스 지수: ${bio.stress}
      7. 심박변이도(HRV): ${bio.hrv} ms
      8. 심전도(ECG): ${bio.ecg}
      9. 수면: ${bio.sleep}시간
      10. 움직임: ${bio.gyroscope}

      **요청 사항:**
      이 데이터를 종합하여 현재 환자의 건강 상태가 안정적인지, 주의가 필요한지 판단하고,
      응급 상황 예방을 위해 필요한 구체적인 관리 방법 3가지를 제안하세요 (한국어).
    `;

    const model = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const response = await model;
    return response.text || "분석 내용이 생성되지 않았습니다.";
  } catch (error) {
    console.error(error);
    return "회원 위험 분석에 실패했습니다.";
  }
};