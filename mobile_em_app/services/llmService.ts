import { backendService } from './backendService';

export interface WeeklyHealthData {
  avgHeartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
  avgSteps: number;
  avgSleep: number;
  anomalies: string[];
}

const normalizeAiText = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
};

export const llmService = {
  /**
   * 주간 건강 통계 분석 요청
   */
  generateWeeklyAnalysis: async (data: WeeklyHealthData): Promise<string> => {
    try {
      const response = await backendService.apiRequest('/stats/weekly-analysis', {
        method: 'POST',
        body: JSON.stringify({ weeklyData: data }),
      });

      if (response.success && response.data?.report) {
        return normalizeAiText(response.data.report);
      } else {
        throw new Error(response.message || '리포트 생성 실패');
      }
    } catch (error) {
      console.error('LLM Analysis Error:', error);
      
      const fallback =
        `[서버 연결 불가] 현재 AI 서버와 연결할 수 없습니다.\n\n` +
             `📊 기본 분석:\n` +
             `- 평균 심박수: ${data.avgHeartRate} BPM\n` +
             `- 활동량: ${data.avgSteps > 7000 ? '양호' : '부족'}\n` +
             `- 수면: ${data.avgSleep > 6 ? '적절' : '부족'}`;
      return normalizeAiText(fallback);
    }
  },

  /**
   * 실시간 건강 코멘트 요청
   * - 백엔드 AI 분석 API를 호출하여 실시간 코멘트를 받습니다.
   */
  generateRealtimeComment: async (biometricData: any): Promise<string> => {
    try {
      const response = await backendService.apiRequest('/ai-analysis/realtime-comment', {
        method: 'POST',
        body: JSON.stringify(biometricData),
      });

      if (response.success && response.data?.comment) {
        return normalizeAiText(response.data.comment);
      } else {
        throw new Error('코멘트 생성 실패');
      }
    } catch (error) {
      console.warn('Realtime Comment API Error, using local fallback:', error);
      
      // 백엔드 호출 실패 시 로컬 폴백 로직
      const { heartRate, stress } = biometricData;
      if (heartRate > 100) {
        return "심박수가 다소 높습니다. 잠시 휴식을 취하며 심호흡을 해보세요.";
      }
      if (stress > 50) {
        return "스트레스 지수가 높게 감지됩니다. 가벼운 스트레칭이 도움이 될 수 있습니다.";
      }
      return "현재 생체 신호는 안정적입니다. 좋은 컨디션을 유지하고 계시네요!";
    }
  }
};
