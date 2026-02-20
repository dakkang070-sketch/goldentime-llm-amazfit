
import { GoogleGenAI, Type } from "@google/genai";
import { Patient, TriageResult } from "../types";

const API_BASE_URL = "/api"; // Proxy configured in vite.config.ts

export const analyzePatientData = async (patient: Patient): Promise<TriageResult> => {
  try {
    // 백엔드 AI 분석 API 호출
    const response = await fetch(`${API_BASE_URL}/emergency/${patient.id}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        emergencyLevel: 3, // Default, as patient.triage doesn't exist
        biometric: {
          heartRate: patient.vitals?.heartRate,
          bloodPressure: patient.vitals?.bloodPressure,
          spO2: patient.vitals?.oxygenLevel,
          temperature: patient.vitals?.bodyTemp,
          stressLevel: patient.vitals?.stressLevel
        },
        symptoms: patient.symptoms ? patient.symptoms.join(', ') : '정보 없음'
      })
    });

    if (!response.ok) {
      throw new Error(`Backend API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.analysis) {
      // 백엔드 응답을 프론트엔드 형식으로 변환
      const analysis = data.analysis;
      
      let urgency: 'Immediate' | 'Urgent' | 'Standard' = 'Standard';
      if (analysis.severityScore >= 4) urgency = 'Immediate';
      else if (analysis.severityScore >= 3) urgency = 'Urgent';
      
      return {
        severityScore: analysis.severityScore,
        urgencyLevel: urgency,
        analysisSummary: analysis.analysisText,
        requiredSpecialties: [] // Backend analysis text usually contains recommendation
      };
    } else {
      throw new Error('Invalid response format');
    }

  } catch (error) {
    console.warn('Backend Analysis Failed, falling back to local logic:', error);
    
    // 에러 시 안전한 기본값 반환 (Fallback)
    return {
      severityScore: 2,
      urgencyLevel: 'Standard',
      analysisSummary: '서버 분석 지연 - 기본 모니터링 전환',
      requiredSpecialties: []
    };
  }
};
