# 골든타임 LLM API 문서

## 인증

대부분의 API는 JWT 토큰 기반 인증이 필요합니다. 요청 헤더에 다음을 포함하세요:

```
Authorization: Bearer <token>
```

## 사용자 API

### 회원가입
- **POST** `/api/users/signup`
- **Body**: `{ name, phone, email, password, birthDate, age, height, weight, bloodType, medicalHistory?, emergencyContact?, consents? }`
- **Response**: `{ success: true, userId, token }`

### 로그인
- **POST** `/api/users/login`
- **Body**: `{ email, password }`
- **Response**: `{ success: true, userId, token }`

## 생체 데이터 수집 API

### Zepp 데이터 업로드
- **POST** `/api/ingest/zepp`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ userId, heartRate?, stressLevel?, acceleration?, movementStatus?, location: { lat, lng }, collectedAt? }`
- **Response**: `{ success: true, biometricId, analysis: { emergencyLevel, isAnomaly, summary } }`

### Mock 데이터 (개발용)
- **POST** `/api/ingest/mock`
- **Body**: `{ userId, heartRate?, stressLevel?, movementStatus?, location: { lat, lng } }`

## 입원/퇴원 모드 API

### 입원 모드 활성화
- **POST** `/api/hospital-mode/enter`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ hospitalId?, lat?, lng?, address? }`
- **Response**: `{ success: true, hospitalMode }`

### 퇴원 모드 활성화
- **POST** `/api/hospital-mode/exit`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, hospitalMode }`

### 입원 모드 상태 조회
- **GET** `/api/hospital-mode/status`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, hospitalMode, status }`

## 응급구조사 API

### 가입
- **POST** `/api/paramedics/signup`
- **Body**: `{ name, phone, email, password, licenseNumber }`
- **Response**: `{ success: true, paramedicId, token }`

### 로그인
- **POST** `/api/paramedics/login`
- **Body**: `{ email, password }`
- **Response**: `{ success: true, paramedicId, token }`

### 상태 업데이트
- **PATCH** `/api/paramedics/me/status`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ status: 'available' | 'on_duty' | 'off_duty' | 'in_transit' | 'handling_case' }`
- **Response**: `{ success: true, status }`

### 위치 업데이트
- **PATCH** `/api/paramedics/me/location`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ lat, lng, address? }`
- **Response**: `{ success: true, currentLocation, status }`

### 대기 중인 케이스 조회
- **GET** `/api/paramedics/me/pending-cases`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, pendingCases: [{ caseId, receivedAt, distance }], currentCase, status }`

## 응급 상황 API

### 케이스 수락
- **POST** `/api/emergency/:caseId/accept`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, case }`

### 도착 확인
- **POST** `/api/emergency/:caseId/arrive`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, case }`

### 이송 시작
- **POST** `/api/emergency/:caseId/transport`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ hospitalId? }`
- **Response**: `{ success: true, case }`

### 완료 처리
- **POST** `/api/emergency/:caseId/complete`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, case }`

### 자동 매칭 재시도
- **POST** `/api/emergency/:caseId/auto-match`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, matched, paramedicId?, hospitalId? }`

## 관제센터 API

### 관제사 가입
- **POST** `/api/controllers/signup`
- **Body**: `{ name, email, password, phone?, role? }`
- **Response**: `{ success: true, controller: { id, name, email, role } }`

### 관제사 로그인
- **POST** `/api/controllers/login`
- **Body**: `{ email, password }`
- **Response**: `{ success: true, token, controller }`

### 배정된 회원 목록
- **GET** `/api/controllers/me/users`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, users: [...] }`

### 활성 응급 상황 목록
- **GET** `/api/controllers/emergency-cases?status=&emergencyLevel=`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, cases: [...] }`

### 수동 응급구조사 매칭
- **POST** `/api/controllers/emergency-cases/:caseId/match-paramedic`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ paramedicId? }` (없으면 자동 매칭)
- **Response**: `{ success: true, message, case }`

### 수동 병원 매칭
- **POST** `/api/controllers/emergency-cases/:caseId/match-hospital`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ hospitalId? }` (없으면 자동 매칭)
- **Response**: `{ success: true, message, case }`

## Zepp OAuth API (준비 중)

### 인증 URL 생성
- **GET** `/api/zepp/oauth/authorize-url?userId=...`
- **Response**: `{ authorizeUrl }`

### 콜백 처리
- **GET** `/api/zepp/oauth/callback?code=...&state=...`
- **Response**: `{ success: true, message }`
