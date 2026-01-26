
import json

class BiometricToTextConverter:
    """생체 데이터를 텍스트 프롬프트로 변환"""
    
    def __init__(self):
        pass
        
    def convert_biometric_to_prompt(self, data, substance_type, substance_class, medical_history=None):
        """생체 데이터를 LLM 프롬프트 형식으로 변환"""
        
        medical_context = "특이사항 없음"
        if medical_history:
            medical_context = f"""
- 복용 약물: {medical_history.get('medications', '없음')}
- 기저 질환: {medical_history.get('diseases', '없음')}
- 알레르기: {medical_history.get('allergies', '없음')}
""".strip()

        prompt = f"""
[생체 신호 분석 요청]
다음 생체 데이터를 분석하여 {substance_type} ({substance_class}) 가능성을 판단하고 요약해주세요.

- 심박수: {data.get('heartRate', 'N/A')} bpm
- 스트레스: {data.get('stressLevel', 'N/A')}
- 체온: {data.get('bodyTemperature', 'N/A')} °C
- HRV: {data.get('hrv', 'N/A')} ms
- 산소포화도: {data.get('oxygenSaturation', 'N/A')} %
- 움직임: {data.get('movementStatus', 'N/A')}

[사용자 의료 정보]
{medical_context}

분석 요청 사항:
1. 생체 신호의 비정상 패턴 식별
2. {substance_type} 섭취/사용 가능성 평가 (의료 정보 고려)
3. 의학적 기준에 따른 5단계 상태 판정 (정상/주의/경고/위험/응급)
4. 응급구조사를 위한 행동 권고

판정 기준:
- 정상 (Normal): 특이사항 없음
- 주의 (Caution): 경미한 징후
- 경고 (Warning): 뚜렷한 징후, 판단력 저하
- 위험 (Danger): 심각한 이탈, 운동능력 상실
- 응급 (Critical): 생명 위협, 의식 소실 위험
"""
        return prompt.strip()

    def generate_response_template(self, substance_type, substance_class, severity):
        """학습용 정답 템플릿 생성"""
        
        # 5단계 매핑
        level_map = {
            'none': '정상',
            'normal': '정상',
            'mild': '주의',
            'moderate': '경고',
            'severe': '위험', # 기존 severe는 danger로 매핑
            'critical': '응급'
        }
        
        # severity가 이미 한글이거나 5단계 영어면 그대로 사용
        mapped_severity = level_map.get(severity, severity)
        if severity == 'severe' and substance_class != 'normal':
             # 만약 substance_class가 심각한 약물이면 critical로 격상 가능
             pass

        if substance_class == 'none' or substance_class == 'normal':
            return f"""
[분석 요약]
현재 생체 신호는 정상 범위 내에 있습니다. {substance_type} 사용 징후는 발견되지 않았습니다.
음주상태: 정상
신뢰도: 0.95
권고: 지속적인 모니터링을 권장합니다.
"""
        else:
            return f"""
[분석 요약]
{substance_type} 사용이 의심되는 비정상 패턴이 감지되었습니다.
심박수와 스트레스 수치가 평소보다 높으며, HRV가 저하되어 있습니다.
의료 정보를 고려할 때 {mapped_severity} 수준의 상태로 판단됩니다.

음주상태: {mapped_severity}
신뢰도: 0.9
권고: 현장 확인 및 활력 징후 지속 모니터링이 필요합니다.
"""
