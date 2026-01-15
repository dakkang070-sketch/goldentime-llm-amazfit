# 생체 데이터 → LLM 분석 → 관제 모니터링 흐름

## 전체 데이터 흐름

```
1. 생체 데이터 수집
   ↓
2. LLM 분석 (규칙 기반 + Ollama)
   ↓
3. 분석 결과 저장
   ↓
4. 응급 케이스 생성 (레벨 4~5)
   ↓
5. 관제센터 조회
   ↓
6. 프론트엔드 표시
```

## 상세 흐름

### 1. 생체 데이터 수집
**엔드포인트**: `POST /api/ingest/zepp` 또는 `POST /api/ingest/mock`

```javascript
// 생체 데이터 전송
{
  userId: "user_id",
  heartRate: 45,
  stressLevel: 85,
  movementStatus: "normal",
  location: { lat: 37.5665, lng: 126.9780 }
}
```

**처리**: `ingestService.js` → `BiometricData` 생성

### 2. LLM 분석
**서비스**: `analyzerService.js` → `analyzeBiometricAndMaybeOpenCase()`

**분석 과정**:
1. **규칙 기반 분석** (항상 실행)
   - 심박수, 스트레스, 낙상 감지
   - 응급도 1~5단계 판정
   - 이상 징후 목록 생성

2. **Ollama LLM 분석** (ENABLE_OLLAMA=true일 때)
   - Ollama 서버 호출
   - 파인튜닝된 모델 사용 (USE_FINETUNED_MODEL=true)
   - "상황 요약" 텍스트 생성
   - 의료 진단 회피 (가능성/권고 표현만)

**분석 결과 저장**:
```javascript
BiometricData.analysis = {
  isAnomaly: true,
  emergencyLevel: 4,
  analysisResult: "심박수가 기초선 대비 현저히 낮아진 상황입니다...",
  analyzedAt: new Date()
}
```

### 3. 응급 케이스 생성 (레벨 4~5)
**조건**: `emergencyLevel >= 4` && `!hospitalMode.isActive`

**생성되는 데이터**:
```javascript
EmergencyCase {
  userId: ObjectId,
  emergencyLevel: 4,
  detectedAnomalies: [
    { type: 'heart_rate', description: '심박수 낮음(45 bpm)', severity: 'high' }
  ],
  llmAnalysis: {
    analysisText: "심박수가 기초선 대비 현저히 낮아진 상황입니다...",
    confidence: 0.5,
    analyzedAt: Date,
    model: 'rule-based-mvp' // 또는 'goldentime-emergency:latest'
  },
  status: 'detected'
}
```

### 4. 관제센터 조회
**엔드포인트**: `GET /api/controllers/emergency-cases`

**응답 데이터**:
- `llmAnalysis.analysisText`: LLM 분석 텍스트
- `detectedAnomalies`: 감지된 이상 징후 목록
- `emergencyLevel`: 응급도 (1~5)
- `status`: 케이스 상태

### 5. 프론트엔드 표시
**위치**: `frontend/src/App.jsx`

**표시되는 정보**:
1. **LLM 분석 결과 섹션**
   - 분석 텍스트 (llmAnalysis.analysisText)
   - 사용 모델 (llmAnalysis.model)
   - 분석 시간 (llmAnalysis.analyzedAt)

2. **감지된 이상 징후 섹션**
   - 이상 징후 목록 (detectedAnomalies)
   - 심각도별 색상 구분

3. **기본 정보**
   - 응급도 (emergencyLevel)
   - 상태 (status)
   - 위치 정보

## 실시간 업데이트

**Socket.IO 이벤트**:
- `emergency_case_created`: 새 케이스 생성 시
- `case_updated`: 케이스 상태 변경 시
- `biometric_data_updated`: 생체 데이터 업데이트 시 (관제사용)

## 예시 시나리오

### 시나리오 1: 정상 데이터
```
생체 데이터 (심박수 72, 정상)
  → 규칙 기반: 레벨 1 (정상)
  → LLM 분석: "정상 범위로 보입니다..."
  → 케이스 생성 안됨
  → 관제센터: 표시 안됨 (정상이므로)
```

### 시나리오 2: 응급 상황
```
생체 데이터 (심박수 45, 스트레스 85)
  → 규칙 기반: 레벨 4 (위급)
  → Ollama LLM: "심박수가 기초선 대비 현저히 낮아진 상황입니다..."
  → 케이스 생성: EmergencyCase 생성
  → Socket.IO: emergency_case_created 이벤트
  → 관제센터: 실시간으로 케이스 표시
  → 프론트엔드: LLM 분석 결과와 이상 징후 표시
```

## 확인 방법

### 1. 생체 데이터 전송 테스트
```bash
curl -X POST http://localhost:3000/api/ingest/mock \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id",
    "heartRate": 45,
    "stressLevel": 85,
    "location": {"lat": 37.5665, "lng": 126.9780}
  }'
```

### 2. 관제센터에서 확인
1. 관제센터 로그인
2. 응급 상황 목록 확인
3. 케이스 클릭 → 상세 정보 모달
4. "LLM 분석 결과" 섹션 확인

## 현재 상태

✅ **코드 구현**: 완료
- 생체 데이터 수집 → LLM 분석 → 케이스 생성 → 관제센터 표시 흐름 완성

⚠️ **실행 필요**:
- Ollama 서버 실행 및 모델 생성
- 환경변수 설정 (ENABLE_OLLAMA=true)
- 실제 데이터로 테스트

## 결론

**네, 생체 데이터를 기준으로 LLM과 Ollama에서 분석한 데이터가 관제 모니터링에 나올 수 있습니다!**

전체 흐름이 구현되어 있으며, Ollama 서버를 실행하고 환경변수를 설정하면 바로 사용할 수 있습니다.
