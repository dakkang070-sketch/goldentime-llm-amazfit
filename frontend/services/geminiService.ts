
import { GoogleGenAI, Type } from "@google/genai";
import { Patient, TriageResult } from "../types";

// Always use process.env.API_KEY and named parameters.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePatientData = async (patient: Patient): Promise<TriageResult> => {
  // Gemini API 일시 비활성화 - 로컬 분석으로 대체
  console.log('환자 분석 요청:', patient.name);
  
  try {
    const { vitals } = patient;
    
    // 안전한 데이터 접근 (undefined 방지)
    const heartRate = vitals?.heartRate || 70;
    const oxygenLevel = vitals?.oxygenLevel || 98;
    const fallDetected = vitals?.fallDetected || false;
    const ecgPattern = vitals?.ecgPattern || 'Normal';
    const activityContext = vitals?.activityContext || 'Unknown';

    // 간단한 로컬 분석 로직
    let severity = 1; // 1-5 점수
    let priority = 'low';
    let summary = '정상 범위 내 생체 징후';

    if (heartRate > 120 || oxygenLevel < 90 || fallDetected) {
      severity = 4;
      priority = 'critical';
      summary = '긴급 상황 감지 - 즉시 대응 필요';
    } else if (heartRate > 100 || oxygenLevel < 95) {
      severity = 3;
      priority = 'high';
      summary = '주의 필요 - 모니터링 강화';
    } else if (heartRate > 90) {
      severity = 2;
      priority = 'medium';
      summary = '경미한 이상 징후 관찰';
    }

    return {
      severityScore: severity,
      priority: priority as any,
      analysisSummary: summary,
      recommendations: [`심박수: ${heartRate}bpm`, `SpO2: ${oxygenLevel}%`]
    };
    
  } catch (error) {
    console.warn('환자 분석 에러 (기본값 사용):', error);
    
    // 에러 시 안전한 기본값 반환
    return {
      severityScore: 2,
      priority: 'medium',
      analysisSummary: '분석 중 - 기본 모니터링',
      recommendations: ['데이터 분석 중']
    };
  }
};
