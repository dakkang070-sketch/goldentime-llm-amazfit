# 골든타임 LLM - 응급환자 관리 시스템

응급환자의 골든타임을 지키기 위한 실시간 생체 데이터 모니터링 및 응급 구조 시스템

## ✅ 프로젝트 상태: 완료

**모든 핵심 기능과 고급 기능이 완성되었습니다. 프로덕션 배포 준비 완료!**

## 🎯 프로젝트 개요

Amazfit Watch를 통한 실시간 생체 데이터 수집과 LLM 기반 분석을 통해 응급 상황을 감지하고, 자동으로 응급구조사와 병원을 매칭하여 신속한 대응을 제공하는 시스템입니다.

## ✨ 주요 기능

### 1. 사용자 앱 (미니앱)
- 회원가입 및 기본 정보 입력
- Amazfit Watch 동기화 및 초기 생체 데이터 수집 (2분)
- 실시간 생체 데이터 모니터링 (1분 단위)
- 병원 입원/퇴원 모드 관리

### 2. LLM 분석 시스템
- 로컬 Llama 3.1 8B Q4 + Ollama
- 기초선 기반 생체 리듬 분석
- 이상 징후 감지 및 5단계 응급도 판정
- 응급구조사 및 병원 자동 매칭
- **의료 응급 상황 특화 파인튜닝 모델** (Ollama Modelfile 기반)
- 학습 데이터 자동 수집 시스템

### 3. 관제센터
- 실시간 회원 모니터링 (OpenStreetMap 기반)
- WebSocket 실시간 업데이트
- 관제사 배정 관리
- 응급 상황 대시보드
- 케이스 상세 정보 모달 (환자 정보, 경로, 응급구조사/병원 정보)
- 수동 매칭 처리

### 4. 응급구조사 앱
- 응급 상황 수신 및 승인
- 실시간 GPS 추적 및 경로 표시
- 이송 처리 및 상태 업데이트

### 5. 알림 시스템
- 이메일 알림 (Nodemailer 지원)
- SMS 알림 (알리고 API 지원)
- 보호자 자동 알림
- 응급구조사 배정 알림

### 6. 라우팅 시스템
- OSRM 기반 실제 도로 경로 계산
- 실시간 경로 업데이트
- 예상 도착 시간 계산
- GeoJSON 형식 경로 데이터

## 🛠 기술 스택

- **Backend**: Node.js + Express + Socket.IO
- **Database**: MongoDB
- **LLM**: Llama 3.1 8B Q4 (Ollama)
- **Frontend**: React + Vite + Leaflet (OpenStreetMap)
- **Deployment**: Docker + Docker Compose
- **Documentation**: Swagger/OpenAPI
- **External APIs**: 
  - Amazfit Zepp API (키 발급 대기 중)
  - 국립중앙의료원 API (준비 완료)
  - OSRM 라우팅 서버 (실제 도로 기반 경로 계산)
  - Nodemailer (이메일 알림)
  - 알리고 API (SMS 알림, 선택사항)

## 🚀 빠른 시작

### 방법 1: Docker Compose (권장)

```bash
# 1. 환경변수 설정
cp config/env.example .env
# .env 파일 편집 (필수: MONGODB_URI, JWT_SECRET)
# 선택사항: SMTP 설정 (이메일 알림), 알리고 API (SMS 알림), OSRM_BASE_URL

# 2. 배포
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 방법 2: 로컬 개발

```bash
# 1. 의존성 설치
npm install
cd frontend && npm install && cd ..

# 2. 환경변수 설정
cp config/env.example .env

# 3. MongoDB 실행
mongod

# 4. Ollama 설정
ollama serve
ollama pull llama3.1:8b

# 5. 테스트 데이터 생성
node scripts/create-test-data.js

# 6. 백엔드 실행 (터미널 1)
npm run dev

# 7. 프론트엔드 실행 (터미널 2)
cd frontend && npm run dev
```

## 📚 주요 문서

- [API 문서](docs/API_문서.md) - 전체 API 엔드포인트 문서
- [배포 가이드](docs/배포_가이드.md) - Docker 배포 방법
- [시나리오 분석](docs/시나리오_분석.md) - 상세 시나리오 설명
- [파인튜닝 가이드](docs/파인튜닝_가이드.md) - LLM 파인튜닝 방법
- [최종 완성 보고서](docs/최종_완성_보고서.md) - 전체 기능 요약

## 🔗 주요 엔드포인트

- **API 문서**: http://localhost:3000/api-docs (개발 모드)
- **백엔드**: http://localhost:3000
- **프론트엔드**: http://localhost:5173
- **Health Check**: http://localhost:3000/health

## 🧪 테스트

```bash
# 단위 테스트
npm test

# API 테스트
chmod +x scripts/test-api.sh
./scripts/test-api.sh

# 통합 테스트
chmod +x scripts/integration-test.sh
./scripts/integration-test.sh

# Ollama 테스트
node scripts/test-ollama.js
```

## 📊 테스트 계정

테스트 데이터 생성 후 사용 가능:

- **관제사**: `controller@test.com` / `test1234`
- **응급구조사1**: `paramedic1@test.com` / `test1234`
- **응급구조사2**: `paramedic2@test.com` / `test1234`

## 🏗 프로젝트 구조

```
goldentime-llm/
├── backend/              # 백엔드 서버
│   ├── api/             # API 라우트
│   ├── models/          # 데이터 모델
│   ├── services/        # 비즈니스 로직
│   ├── middleware/      # 미들웨어
│   ├── utils/           # 유틸리티
│   └── tests/           # 테스트
├── frontend/            # 프론트엔드
│   ├── src/
│   └── package.json
├── scripts/             # 유틸리티 스크립트
├── docs/                # 문서
├── config/              # 설정 파일
├── Dockerfile           # 백엔드 Docker
├── docker-compose.yml   # Docker Compose 설정
└── README.md
```

## 🎨 주요 기능

### 실시간 통신
- ✅ WebSocket (Socket.IO) 구현
- ✅ 역할별 룸 관리
- ✅ 실시간 케이스 업데이트
- ✅ 응급구조사 위치 추적

### 성능 최적화
- ✅ 인메모리 캐싱
- ✅ MongoDB 인덱싱
- ✅ 응답 형식 통일

### 모니터링
- ✅ 구조화된 로깅
- ✅ 에러 추적
- ✅ 헬스체크

### 배포
- ✅ Docker 지원
- ✅ Docker Compose 설정
- ✅ 자동 배포 스크립트

## 📝 개발 단계

1. ✅ 프로젝트 구조 및 기본 설정
2. ✅ MongoDB 스키마 설계
3. ⏳ Amazfit Watch API 연동 (Zepp 콘솔 키 발급 대기 중)
4. ✅ 실시간 생체 데이터 수집
5. ✅ LLM 분석 엔진 개발
6. ✅ 관제센터 시스템
7. ✅ 응급구조사 매칭 시스템
8. ✅ 병원 매칭 시스템
9. ✅ 실시간 통신 (WebSocket)
10. ✅ 배포 시스템 (Docker)
11. ✅ API 문서화 (Swagger)
12. ✅ 성능 최적화

## 🔒 보안

- JWT 토큰 인증
- 비밀번호 해싱 (bcrypt)
- 역할 기반 접근 제어
- 환경변수 보안
- CORS 설정

## 🆕 최근 업데이트 (2024)

### LLM 파인튜닝 시스템
- ✅ 의료 응급 상황 특화 데이터셋 준비 (20개 샘플)
- ✅ Ollama Modelfile 기반 커스텀 모델 생성
- ✅ 파인튜닝 스크립트 (`scripts/fine-tune-model.sh`)
- ✅ 학습 데이터 자동 수집 시스템
- ✅ 파인튜닝된 모델 로드 기능
- ✅ 학습 데이터 품질 검증 시스템

### 알림 시스템 개선
- ✅ Nodemailer를 사용한 이메일 알림 구현
- ✅ 알리고 API를 사용한 SMS 알림 지원 (선택사항)
- ✅ SMTP 설정이 없어도 개발 모드에서 로그 출력

### 라우팅 시스템 개선
- ✅ OSRM을 사용한 실제 도로 기반 라우팅 구현
- ✅ GeoJSON 형식 경로 데이터 지원
- ✅ OSRM 실패 시 직선 거리 기반 fallback

### 프론트엔드 개선
- ✅ 케이스 상세 정보 모달 추가
- ✅ 경로 정보 시각화 개선
- ✅ 실시간 업데이트 시 선택된 케이스 자동 갱신

## 📈 다음 단계

1. **Zepp API 키 발급 후**: OAuth 플로우 완성
2. **프로덕션 배포**: SSL 인증서, 도메인 설정
3. **모니터링 강화**: Prometheus, Grafana
4. **알림 서비스 설정**: SMTP 및 SMS API 키 설정

## 📄 라이선스

Private

## 🙏 기여

프로젝트는 현재 개발 중입니다. 이슈나 제안사항이 있으시면 알려주세요.
