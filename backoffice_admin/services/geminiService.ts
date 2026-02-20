import { Incident, Member } from "../types";

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const generateIncidentReport = async (incident: Incident, member?: Member): Promise<string> => {
  try {
    const response = await fetch(`${API_URL}/ai-analysis/incident-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...incident,
        memberName: member?.name,
        memberAge: member?.age,
        memberConditions: member?.medicalConditions,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Analysis API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.report || "분석 내용이 생성되지 않았습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 분석 중 오류가 발생했습니다. 시스템 로그를 확인하세요.";
  }
};

export const analyzeMemberRisk = async (member: Member): Promise<string> => {
  try {
    const response = await fetch(`${API_URL}/ai-analysis/member-report/${member.id}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`AI Analysis API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.report || "분석 내용이 생성되지 않았습니다.";
  } catch (error) {
    console.error("Member Risk Analysis Error:", error);
    return "회원 위험 분석에 실패했습니다. (백엔드 연결 오류)";
  }
};
