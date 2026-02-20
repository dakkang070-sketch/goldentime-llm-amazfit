# 기술사업계획서 [2. 기술사업 내용] - 기술성 상세 기술서

본 기술서는 **"하이브리드 LLM 기반 실시간 생체신호 분석 및 지능형 응급 관제 플랫폼"**의 핵심 구현 기술과 아키텍처를 상세히 기술합니다.

---

## 1. 전체 시스템 아키텍처 (System Architecture)

본 시스템은 **센서 데이터 수집(Edge) → 실시간 분석(Backend) → AI 추론(Intelligence) → 통합 관제(Frontend)**로 이어지는 4단계 파이프라인 구조를 갖추고 있습니다.

### 1.1 기술 스택 (Tech Stack)
*   **Backend Runtime**: Node.js (V8 Engine) 기반의 비동기 이벤트 처리 환경
*   **Web Framework**: Express.js (REST API 및 미들웨어 관리)
*   **Real-time Communication**: Socket.IO (WebSocket 프로토콜, Room 기반 멀티캐스팅)
*   **AI Engine**:
    *   **Serving**: Ollama (On-Premise LLM Inference Server)
    *   **Models**: Meta Llama 3.1 8B (General), Custom Fine-tuned LoRA Models (Specific Tasks)
*   **Database**: MongoDB (Document-Oriented, 시계열 데이터 저장), Redis (In-Memory Caching)
*   **Frontend**: React.js, Vite, Leaflet.js (Web GIS), TailwindCSS

---

## 2. 핵심 기술 세부 명세 (Core Technology Specifications)

### 2.1 실시간 생체신호 분석 엔진 (Real-time Biosignal Engine)
웨어러블 디바이스로부터 수집된 Raw Data를 정제하고 이상 징후를 감지하는 독자적인 엔진(`RealtimeBiosignalEngine.js`)을 구축하였습니다.

*   **슬라이딩 윈도우 알고리즘 (Sliding Window Algorithm)**
    *   데이터의 연속성을 보장하고 노이즈를 제거하기 위해 센서별 최적화된 윈도우 크기를 적용하여 실시간 스트림을 처리합니다.
    *   **Window Sizes**:
        *   `Heart Rate`: **10초** (순간적인 심박 변화 포착)
        *   `HRV (심박변이도)`: **60초** (자율신경계 균형 분석을 위한 최소 시간 확보)
        *   `Arrhythmia (부정맥)`: **30초** (불규칙 패턴 탐지)
        *   `Activity/Fall`: **2~5초** (낙상 및 충격 감지의 즉시성 확보)

*   **센서 퓨전 및 임계치 제어 (Sensor Fusion & Threshold Control)**
    *   단일 센서의 오작동을 방지하기 위해 다중 센서 데이터를 융합하여 판단합니다.
    *   **Dynamic Thresholds**:
        *   **Critical**: HR < 30 or > 180 bpm, SpO2 < 85%
        *   **Warning**: HR < 40 or > 150 bpm, SpO2 < 90%
        *   **Signal Quality Check**: SNR 10dB 미만 또는 Artifact 비율 10% 이하 시 데이터 자동 기각 (False Alarm 방지)

### 2.2 하이브리드 AI 및 모델 최적화 (Hybrid AI & Model Optimization)
개인정보 보호와 추론 속도 최적화를 위해 클라우드와 온디바이스 모델을 결합한 하이브리드 전략을 사용합니다.

*   **Dual-Model Strategy**
    *   **Cloud (Google Gemini Pro)**: 비식별화된 텍스트 데이터의 복합 맥락 분석 및 초기 트리아지(Triage) 리포트 생성.
    *   **On-Device (Ollama + Llama 3.1)**: 민감한 생체 데이터 및 즉각적인 대응이 필요한 학교 폭력 감지 로직 수행.

*   **LoRA (Low-Rank Adaptation) 파이프라인**
    *   거대 모델 전체를 재학습하는 대신, 어댑터 레이어(Adapter Layer)만을 학습시켜 효율성을 극대화했습니다. (`backend/finetuning/` 모듈)
    *   **Custom Models**:
        *   `goldentime-psychoactive`: 약물/환각 상태 탐지 특화 모델
        *   `goldentime-emergency`: 복합 응급 상황(낙상+심정지 등) 판단 특화 모델
    *   **Data Pipeline**: MongoDB에 축적된 `EmergencyCase` 데이터를 `prepare-fine-tuning-data.js` 스크립트를 통해 자동으로 JSON 학습 데이터셋으로 변환하고, 주기적으로 모델을 업데이트하는 MLOps 체계 구축.

### 2.3 지능형 관제 및 시각화 (Intelligent Monitoring & Visualization)
대용량 관제 데이터를 지연 없이 브라우저에 렌더링하기 위한 고성능 프론트엔드 아키텍처를 적용했습니다.

*   **Leaflet.js 최적화 렌더링**
    *   React의 가상 DOM 오버헤드를 줄이기 위해 지도 인스턴스(`mapRef`)와 마커 객체(`markersRef`)를 `useRef`로 직접 관리(Imperative Manipulation)하여 렌더링 성능을 300% 이상 향상시켰습니다.
    *   **Custom Overlay**: 단순 이미지가 아닌 HTML/CSS Animation이 포함된 `L.divIcon`을 사용하여 상태(위급, 주의, 정상)에 따른 펄스 애니메이션을 구현했습니다.

*   **OSRM 기반 동적 라우팅 (Dynamic Routing)**
    *   별도의 유료 API 의존 없이 자체 호스팅 가능한 OSRM(Open Source Routing Machine) 서버와 연동하여, 환자-구급차-병원을 잇는 최적 경로를 실시간으로 계산하고 폴리라인(`L.polyline`)으로 시각화합니다.

---

## 3. 보안 및 데이터 관리 (Security & Data Management)

*   **인증 및 권한 관리 (Auth & RBAC)**
    *   **JWT (JSON Web Token)** 기반의 Stateless 인증 체계를 구축하여 서버 확장성을 보장합니다. (`middleware/auth.js`)
    *   **Role-Based Access Control**: `admin`, `controller`, `paramedic` 등 역할별로 API 접근 권한을 엄격히 제어합니다.
    *   **Rate Limiting**: `rateLimiter.js` 미들웨어를 통해 비정상적인 트래픽 폭주 및 DDoS 공격을 차단합니다.

*   **데이터 스키마 설계 (Data Schema)**
    *   **Mongoose Schema**:
        *   `EmergencyCase`: 생체신호 이상, AI 분석 결과, 매칭된 구조사 정보를 하나의 트랜잭션 단위로 관리하여 데이터 무결성 보장.
        *   `User`: 의료 이력(Medical History)과 동의(Consents) 정보를 암호화하여 저장.
