const User = require('../models/User');
const BiometricData = require('../models/BiometricData');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');
const ollamaService = require('./ollamaService');

class AiAnalysisService {
  constructor() {
    // Local LLM does not require API keys
  }

  async generateMemberReport(memberId) {
    try {
      // 1. 회원 정보 조회
      const user = await User.findById(memberId).lean();
      if (!user) throw new Error('회원을 찾을 수 없습니다.');

      // 2. 최근 생체 데이터 조회 (최근 1시간 내 데이터 10개)
      const recentBiometrics = await BiometricData.find({ userId: memberId })
        .sort({ collectedAt: -1 })
        .limit(10)
        .lean();

      // 3. 최근 응급 이력 조회 (최근 7일)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentAlerts = await Alert.find({
        userId: memberId,
        createdAt: { $gte: oneWeekAgo }
      }).sort({ createdAt: -1 }).lean();

      // 4. 데이터 전처리
      const currentBio = recentBiometrics[0] || {};
      const signalQuality = currentBio.deviceInfo?.signalQuality || 1.0;
      const qualityGrade = signalQuality > 0.8 ? '우수' : signalQuality > 0.5 ? '보통' : '불량';

      const bioSummary = recentBiometrics.length > 0 ? {
        currentHeartRate: currentBio.heartRate,
        avgHeartRate: Math.round(recentBiometrics.reduce((acc, cur) => acc + (cur.heartRate || 0), 0) / recentBiometrics.length),
        bloodPressure: currentBio.bloodPressure,
        oxygen: currentBio.bloodOxygen,
        stress: currentBio.stress,
        recentMovement: currentBio.gyroscope ? '감지됨' : '미미함',
        signalQuality: qualityGrade
      } : '데이터 없음';

      const alertSummary = recentAlerts.map(a => 
        `- [${new Date(a.createdAt).toLocaleDateString()}] ${a.type} (${a.severity})`
      ).join('\n') || '특이사항 없음';

      // 5. 프롬프트 구성
      const prompt = `
        당신은 응급 대응 센터의 전문 의료 AI 분석가입니다.
        아래 회원의 실시간 생체 데이터와 최근 응급 이력을 종합적으로 분석하여 건강 리포트를 작성해주세요.

        **CRITICAL SAFETY INSTRUCTION:**
        - 데이터의 '신호 품질'이 '불량'인 경우, 분석 결과에 반드시 "신호 노이즈로 인한 오판 가능성"을 명시하십시오.
        - 수치가 정상 범위를 크게 벗어나더라도 신호 품질이 낮다면 즉각적인 응급 상황보다는 '재측정 권고'를 우선하십시오.

        **회원 프로필:**
        - 이름: ${user.name} (${user.age}세, 성별: ${user.gender || '정보 없음'})
        - 기저질환: ${user.medicalHistory?.chronicDiseases?.map(d => d.disease).join(', ') || '없음'}
        - 복용약물: ${user.medicalHistory?.medications?.map(m => m.name).join(', ') || '없음'}

        **생체 데이터 요약 (최근 1시간):**
        - 데이터 신뢰도(SQI): ${bioSummary.signalQuality}
        - 현재 심박수: ${bioSummary.currentHeartRate || '-'} bpm (평균: ${bioSummary.avgHeartRate || '-'} bpm)
        - 혈압: ${bioSummary.bloodPressure || '-'}
        - 산소포화도: ${bioSummary.oxygen || '-'}%
        - 스트레스 지수: ${bioSummary.stress || '-'}
        - 활동 상태: ${bioSummary.recentMovement}

        **최근 7일간 응급 이력:**
        ${alertSummary}

        **분석 요청 사항:**
        1. **현재 상태 평가**: 생체 신호, 이력, 그리고 신호 신뢰도를 바탕으로 현재 건강 상태를 '안정', '주의', '위험' 중 하나로 판단하고 그 이유를 설명하세요.
        2. **데이터 신뢰도 분석**: 감지된 이상 징후가 실제 생리적 변화인지, 아니면 기기 오작동이나 노이즈(Artifact)일 가능성이 있는지 평가하세요.
        3. **주요 위험 요인**: 실제 위험이 의심되는 패턴이 있다면 지적하세요.
        4. **관리 조치 제안**: 관리자나 보호자가 취해야 할 구체적인 행동 3가지를 제안하세요. (신호 불량 시 '착용 상태 확인' 포함)

        **출력 형식:**
        마크다운 형식으로 작성하고, 전문적이고 간결한 어조(한국어)를 사용하세요. 불필요한 서두나 결어는 생략하세요.
      `;

      // 6. Local LLM (Ollama) 호출
      return await ollamaService.generateText(prompt, { temperature: 0.3, timeout: 60000 });

    } catch (error) {
      logger.error(`Error generating report for member ${memberId}:`, error);
      throw error;
    }
  }

  async generateIncidentReport(incidentData) {
    try {
      const prompt = `
        당신은 응급 대응 센터의 전문 의료 AI 어시스턴트입니다.
        다음 사고 데이터와 환자 프로필을 분석하여 관제 요원을 위한 간결한 상황 보고서를 작성하세요.
        
        **CRITICAL SAFETY CHECK:**
        - 'AI 신뢰도'가 60% 미만이거나 데이터 누락이 있는 경우, 보고서 서두에 [주의: 낮은 데이터 신뢰도]를 표시하십시오.
        - 수치 데이터(심박수 등)가 생리적으로 불가능한 수준이라면 기기 오류 가능성을 언급하십시오.

        **사고 데이터:**
        - 유형: ${incidentData.type}
        - 심각도: ${incidentData.severity}
        - 발생 시각: ${incidentData.timestamp}
        - AI 신뢰도: ${incidentData.aiConfidence}%
        - 심박수: ${incidentData.heartRate || '정보 없음'} bpm
        
        **환자 정보:**
        - 이름: ${incidentData.memberName || '알 수 없음'}
        
        **지시 사항:**
        1. 사고 유형과 데이터를 바탕으로 잠재적인 위험성을 요약하세요. (신뢰도 포함)
        2. 관제 요원이 취해야 할 즉각적인 조치 사항을 제안하세요. (데이터 확인 절차 포함)
        3. 전문적이고 긴급하며 간결하게 작성하세요 (150자 이내, 한국어).
      `;

      return await ollamaService.generateText(prompt, { temperature: 0.2, timeout: 30000 });
    } catch (error) {
      logger.error('Error generating incident report:', error);
      throw error;
    }
  }

  async generateRealtimeComment(biometricData) {
    try {
      const prompt = `
        당신은 사용자의 실시간 건강 상태를 모니터링하는 AI 건강 코치입니다.
        아래 생체 데이터를 바탕으로 사용자에게 전달할 짧고 친절한 한 문장 코멘트를 작성해주세요.

        **실시간 생체 데이터:**
        - 심박수: ${biometricData.heartRate || '-'} bpm
        - 스트레스 지수: ${biometricData.stress || '-'}
        - 활동량: ${biometricData.steps || '-'} 걸음
        - 수면: ${biometricData.sleep || '-'} 시간

        **작성 가이드:**
        1. 데이터가 정상이면 격려의 말을 해주세요.
        2. 수치가 높거나 낮으면 부드러운 조언을 해주세요 (예: 심호흡, 휴식 등).
        3. 어조는 친근하고 따뜻하게 유지하세요.
        4. 50자 이내로 짧게 작성하세요.
      `;

      return await ollamaService.generateText(prompt, { temperature: 0.7, timeout: 15000 });
    } catch (error) {
      logger.error('Error generating realtime comment:', error);
      // 에러 발생 시 로컬 폴백 메시지 반환 (서비스 중단 방지)
      if (biometricData.heartRate > 100) return "심박수가 조금 높습니다. 잠시 휴식을 취해보세요.";
      if (biometricData.stress > 50) return "스트레스가 감지됩니다. 심호흡을 한번 해보세요.";
      return "건강한 상태를 유지하고 계시네요! 오늘도 좋은 하루 보내세요.";
    }
  }
}

module.exports = new AiAnalysisService();
