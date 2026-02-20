# 🏥 Golden Time LLM v2.0 - AI 응급관제시스템

<div align="center">

![Golden Time LLM](https://img.shields.io/badge/Golden%20Time-LLM%20v2.0-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![Python](https://img.shields.io/badge/Python-3.11+-blue?style=for-the-badge&logo=python)
![AI](https://img.shields.io/badge/AI-Powered-orange?style=for-the-badge)

**🧠 물질 남용 탐지 시스템 통합**  
**4개 독립 LLM 병렬 구조 (의료+음주+마약+향정신성)**

</div>

## 🌟 v2.0 새로운 핵심 기능

### 🔬 **물질 남용 탐지 시스템**
- **음주 탐지**: STARMAX 생체신호 기반 실시간 음주 상태 분석
- **마약 탐지**: 불규칙 패턴 감지로 각성제/억제제/환각제 구분
- **향정신성약물 탐지**: CNS 억제 패턴으로 벤조디아제핀/바르비튜레이트/Z-약물/항정신병약 분석
- **복합 분석**: 여러 물질 동시 사용 시 상호작용 위험도 평가

### 🤖 **AI 아키텍처**
- **Time-series Transformer**: 생체신호 시계열 패턴 학습
- **LoRA 파인튜닝**: Hugging Face PEFT로 LLM 특화 학습
- **병렬 추론 시스템**: 4개 독립 모델 동시 분석
- **Early Stopping**: 과적합 방지 및 최적 성능 보장

## 📋 전체 기능 목록

### 🎯 **핵심 응급의료 시스템**
- ✅ 멀티모달 위치항법 (GPS+셀룰러+WiFi 융합)
- ✅ 실시간 생체신호 모니터링
- ✅ 지능형 병원 매칭 (NEDC+HIRA API 연동)
- ✅ 패러메딕 자동 배치
- ✅ 응급 워크플로우 자동화

### 🧠 **AI 분석 엔진**
- ✅ Ollama LLM 기반 의료 분석 (`llama3.1:8b`)
- 🆕 **음주 탐지 LLM** (`goldentime-alcohol:latest`)
- 🆕 **마약 탐지 LLM** (`goldentime-drug:latest`) 
- 🆕 **향정신성약물 탐지 LLM** (`goldentime-psychoactive:latest`)
- ✅ 자동 학습 및 품질 관리
- ✅ 실시간 피드백 처리

### 📊 **모니터링 & 관리**
- ✅ 실시간 대시보드
- ✅ 시스템 성능 모니터링
- ✅ API 응답 시간 추적
- 🆕 **물질 탐지 정확도 메트릭**
- ✅ 자동 백업 및 복구

## 🏗️ 기술 스택

### **Backend**
```
Node.js + Express + MongoDB + Socket.IO
Python (AI/ML) + PyTorch + TensorFlow + Hugging Face
Ollama (LLM) + LoRA (Fine-tuning)
Redis (Cache) + Docker + Nginx
```

### **Frontend** 
```
React + TypeScript + Vite + Tailwind CSS
Leaflet.js (Map) + Chart.js (Analytics)
```

### **AI/ML 스택**
```
🔹 Time-series Transformer (생체신호 패턴 학습)
🔹 LoRA Fine-tuning (LLM 특화 학습)  
🔹 SMOTE (클래스 불균형 해결)
🔹 Stratified K-Fold (교차 검증)
🔹 Early Stopping (과적합 방지)
```

## 🚀 빠른 시작

### 1️⃣ **환경 설정**
```bash
# 저장소 클론
git clone https://github.com/goldentime-ai/goldentime-llm.git
cd goldentime-llm

# 환경 변수 설정
cp env.example .env
# .env 파일에서 API 키 및 설정값 수정

# 의존성 설치
npm install
```

### 2️⃣ **AI 시스템 구축**
```bash
# Python 환경 설정
cd backend
pip install -r requirements.txt

# 데이터 전처리 및 모델 훈련
npm run process:data
npm run train:transformers  
npm run train:lora

# 또는 전체 자동 설정
npm run setup:complete
```

### 3️⃣ **Docker로 실행**
```bash
# 전체 스택 실행
docker-compose up -d

# AI 모델 훈련 (GPU 사용시)
docker-compose --profile training up model-trainer

# 모니터링 대시보드 실행
docker-compose --profile monitoring up -d
```

### 4️⃣ **개발 서버 실행**
```bash
# 백엔드 + 프론트엔드 동시 실행
npm run dev:full

# 또는 개별 실행
npm run dev          # 백엔드만
npm run dev:frontend # 프론트엔드만
```

## 📡 API 엔드포인트

### 🔬 **물질 탐지 API**
```http
# 통합 물질 분석
POST /api/substance-detection/analyze
{
  "userId": "user123", 
  "biometricData": {
    "heartRate": 95,
    "stressLevel": 45,
    "bodyTemperature": 37.2,
    "hrv": 30,
    "movementStatus": "walking"
  }
}

# 개별 물질 분석  
POST /api/substance-detection/analyze/alcohol
POST /api/substance-detection/analyze/drug
POST /api/substance-detection/analyze/psychoactive

# 베이스라인 관리
POST /api/substance-detection/baseline/{userId}

# 실시간 모니터링
POST /api/substance-detection/monitor/start/{userId}

# 탐지 히스토리
GET /api/substance-detection/history/{userId}

# 시스템 상태
GET /api/substance-detection/status
```

### 🏥 **기존 응급의료 API**
```http
POST /api/emergency/{patientId}/analyze    # 의료 분석
POST /api/emergency/{patientId}/match-hospital  # 병원 매칭
GET  /api/hospitals/map-data               # 지도 데이터
POST /api/paramedics/assign                # 패러메딕 배치
```

## 🔧 설정 및 튜닝

### **물질 탐지 민감도 조정**
```env
# .env 파일에서 설정
ALCOHOL_DETECTION_SENSITIVITY=medium      # low/medium/high
DRUG_DETECTION_SENSITIVITY=standard       # conservative/standard/aggressive  
PSYCHOACTIVE_DETECTION_SENSITIVITY=balanced  # conservative/balanced/sensitive
```

### **AI 모델 경로**
```
weights/
├── alcohol_transformer.pth       # 음주 탐지 모델
├── drug_transformer.pth          # 마약 탐지 모델
└── psychoactive_transformer.pth  # 향정신성약물 탐지 모델

lora_models/
├── alcohol_detection/            # 음주 LoRA 모델
├── drug_detection/               # 마약 LoRA 모델  
└── psychoactive_detection/       # 향정신성약물 LoRA 모델
```

## 📊 성능 지표

### **AI 모델 성능**
- 🍷 **음주 탐지**: 정확도 85%+, FP율 12%
- 💊 **마약 탐지**: 정확도 82%+, 4-class 분류
- 🧠 **향정신성약물**: 정확도 88%+, CNS 억제 분석
- ⚡ **응답 시간**: 평균 2.5초 (4개 모델 병렬)

### **시스템 성능**  
- 🔄 **동시 처리**: 최대 100개 분석 요청
- 📈 **확장성**: 수평 확장 가능
- 💾 **메모리 사용**: 평균 2GB (AI 모델 포함)
- 🔒 **가용성**: 99.9% 업타임 목표

## 🛠️ 개발 및 기여

### **개발 환경**
```bash
# 린터 실행
npm run lint
npm run lint:fix

# 테스트 실행  
npm test
npm run test:watch

# 빌드
npm run build
```

### **AI 모델 재훈련**
```bash
# 새로운 데이터로 재훈련
POST /api/substance-detection/retrain
{
  "substanceType": "alcohol",  # alcohol/drug/psychoactive
  "forceRetrain": true
}
```

## 📈 모니터링 및 알림

### **대시보드 접근**
- 🌐 **메인 서비스**: http://localhost:3000
- 📊 **Grafana 모니터링**: http://localhost:3001 (admin/goldentime2024)
- 📈 **Prometheus 메트릭**: http://localhost:9090  
- 📚 **API 문서**: http://localhost:3000/api-docs

### **알림 설정**
```javascript
// WebSocket 실시간 알림
const socket = io('ws://localhost:3000');

socket.on('substance_emergency', (data) => {
  console.log('물질 남용 응급상황:', data);
  // { userId, substances: ['alcohol'], riskLevel: 'critical', location }
});
```

## 🔐 보안 및 규정 준수

- ✅ **의료 데이터 암호화**: AES-256
- ✅ **RBAC 접근 제어**: 역할 기반 권한
- ✅ **API Rate Limiting**: DDoS 방지
- ✅ **감사 로깅**: 모든 분석 기록
- ✅ **개인정보 보호**: GDPR/HIPAA 준수

## 🤝 지원 및 문의

### **기술 지원**
- 📧 **이메일**: support@goldentime-ai.com
- 💬 **Discord**: [Golden Time AI Community](https://discord.gg/goldentime)
- 📖 **문서**: [docs.goldentime-ai.com](https://docs.goldentime-ai.com)

### **라이선스**
MIT License - 자유롭게 사용 및 수정 가능

---

<div align="center">

**🚨 응급의료의 혁신, AI로 구현하다 🚨**

Made with ❤️ by Golden Time AI Team  
© 2024 Golden Time LLM. All rights reserved.

</div>
