# Zepp 콘솔(앱 등록) 연동 가이드 (초안)

## 전제
- Zepp 콘솔에서 **앱 등록/승인** 후에야 API 사용 키(또는 OAuth 클라이언트)가 발급됩니다.
- 발급된 정보(예: `client_id`, `client_secret`, `redirect_uri`, `api base url`)를 서버 환경변수로 설정합니다.

## 서버에 추가된 엔드포인트

### 1) OAuth 연결 시작 URL 생성(개발 편의용)
- **GET** `/api/zepp/oauth/authorize-url?userId=...`
- 반환: `authorizeUrl`
- 주의: 현재는 Zepp 문서 확정 전이라 authorize URL/스코프가 “TODO” 상태입니다.

### 2) OAuth 콜백
- **GET** `/api/zepp/oauth/callback?code=...&state=...`
- 동작: code → token 교환 후 `ZeppCredential`(MongoDB)에 저장

## 환경변수
`config/env.example`에 추가되어 있습니다.
- `ZEPP_CLIENT_ID`
- `ZEPP_CLIENT_SECRET`
- `ZEPP_REDIRECT_URI`
- `ZEPP_API_BASE_URL`

## 다음 해야 할 일(문서/콘솔 승인 후)
- Zepp 문서 기준으로 아래를 확정해 코드에 반영
  - authorize endpoint / token endpoint
  - scope 목록
  - 토큰 응답 필드명
  - 요청 서명 방식(있다면) 및 검증 방식
- `/api/ingest/zepp`에 다음 중 하나를 적용
  - (권장) **Zepp 미니앱/폰이 우리 서버로 업로드**할 때 사용자 토큰 검증
  - (대안) Zepp Cloud 폴링/웹훅이면 해당 방식의 인증/서명 검증

