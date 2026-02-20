# 기술사업계획서 [2. 기술사업 내용] - 기술성 상세 기술서 (통합본)

본 문서는 **"하이브리드 LLM 기반 실시간 생체신호 분석 및 지능형 응급 관제 플랫폼"**의 시스템 아키텍처, 핵심 알고리즘, AI 파이프라인, 데이터 보안 설계를 망라한 최종 기술 명세서입니다.

---

## 1. 시스템 개요 및 아키텍처 (System Overview & Architecture)

본 시스템은 **초저지연(Ultra-low Latency) 생체 데이터 처리**와 **의료/법적 리스크를 최소화한 AI 추론**을 목표로 설계된 4계층 하이브리드 아키텍처를 채택하였습니다.

### 1.1 기술 스택 (Tech Stack)
*   **Backend Core**: Node.js v18+ (Event-Driven I/O), Express.js v4.x
*   **Real-time Protocol**: Socket.IO v4.7.2 (WebSocket with Redis Adapter Scalability)
*   **Database**:
    *   **Primary**: MongoDB v7.x (Time-series Optimized Schema)
    *   **Cache**: Redis (Session & Stream Caching)
*   **AI Engine**:
    *   **On-Premise**: Ollama v0.4.0 (Llama 3.1 8B, TinyLlama 1.1B)
    *   **Cloud API**: Google Gemini Pro (Complex Reasoning)
*   **Frontend**: React v19.2.3, Vite v5.x, Leaflet v1.9.4 (Web GIS)

---

## 2. 핵심 구현 기술 (Core Technologies)

### 2.1 실시간 생체신호 분석 엔진 (Real-time Biosignal Engine)
웨어러블 디바이스의 연속적인 데이터 스트림을 처리하기 위해 **Ring Buffer 기반 슬라이딩 윈도우 알고리즘**을 독자 구현했습니다. (`RealtimeBiosignalEngine.js`)

*   **분석 윈도우 및 임계치 (Window & Thresholds)**:
    | 신호 유형 | 윈도우 크기 | 위험 임계치 (Critical) | 주의 임계치 (Warning) |
    | :--- | :--- | :--- | :--- |
    | **Heart Rate** | 10 sec | < 30 or > 180 bpm | < 40 or > 150 bpm |
    | **HRV** | 60 sec | RMSSD < 20ms (Stress) | RMSSD < 30ms |
    | **Arrhythmia** | 30 sec | Irregular R-R Interval | - |
    | **SpO2** | N/A | < 85% (Hypoxia) | < 90% |

*   **신호 품질 관리 (Quality Control)**:
    *   **SNR Check**: 신호 대 잡음비(Signal-to-Noise Ratio) 10dB 미만 데이터 자동 기각.
    *   **Sensor Fusion**: 가속도 센서와 PPG 센서의 교차 검증을 통해 낙상(Fall) 오탐지 최소화.

### 2.2 도메인 특화 AI 및 Fine-tuning (Domain-Specific AI)
범용 LLM의 한계를 극복하기 위해 **LoRA (Low-Rank Adaptation)** 기술을 적용하여 특정 응급 상황에 최적화된 경량화 모델(sLLM)을 개발했습니다.

*   **학교 폭력 감지 모델 (`School-Violence-Detector`)**:
    *   **Base Model**: `TinyLlama-1.1B-Chat` (Edge Device 최적화)
    *   **Hyperparameters**: Rank(`r`)=8, Alpha=32, Dropout=0.1
    *   **특징**: STT로 변환된 대화 텍스트에서 "장난"과 "실제 위협"의 뉘앙스 차이 식별 학습.

*   **약물/알코올 탐지 모델 (`Substance-Abuse-Detector`)**:
    *   **Base Model**: `DialoGPT-medium`
    *   **Hyperparameters**: Rank(`r`)=16, Target Modules=`["c_attn", "c_proj"]`
    *   **특징**: 시계열 생체신호 패턴을 언어적 맥락으로 변환하여 약물 반응 탐지.

### 2.3 RAG 대체 기술: 동적 컨텍스트 주입 (Dynamic Context Injection)
구축 비용이 높은 Vector DB(RAG) 대신, **MongoDB 기반의 실시간 컨텍스트 바인딩 기술**을 적용하여 비용 효율성과 정확도를 동시에 확보했습니다.

*   **Bio-to-Text Conversion**:
    *   수치 데이터(Time-series)를 LLM이 이해 가능한 자연어 요약문으로 실시간 변환.
    *   *예시: "기초선 대비 심박수 45% 급증, HRV 20% 감소 -> 교감신경 과활성화 상태 감지"*
*   **Prompt Engineering**:
    *   **System Prompt**: "Safety Guardrail" 적용으로 의료적 확진(Diagnosis) 용어 사용 원천 차단.
    *   **Dynamic Binding**: 사용자별 Baseline(평소 건강 데이터)을 프롬프트에 실시간 주입하여 개인화된 분석 제공.

### 2.4 지능형 관제 시각화 (Intelligent Visualization)
대규모 동시 접속 상황에서도 끊김 없는 관제를 위해 **React Virtual DOM을 우회하는 Direct DOM Manipulation** 기법을 적용했습니다.

*   **Leaflet 최적화**:
    *   `useRef`를 활용한 마커 인스턴스 재사용(Object Pooling)으로 메모리 누수 방지.
    *   CSS3 `transform: translate3d`를 활용한 하드웨어 가속 펄스 애니메이션 구현.
*   **스파크라인(Sparkline)**:
    *   SVG 기반의 초경량 실시간 그래프를 팝업 내에 렌더링하여 최근 30초간의 생체 변화 추이를 직관적으로 시각화.

---

## 3. 보안 및 데이터 보호 (Security & Data Protection)

### 3.1 인증 및 접근 제어 (Auth & RBAC)
*   **Standard**: JWT (RFC 7519), **HS256** 알고리즘 서명.
*   **Access Token**: 유효기간 7일(`7d`), Bearer 인증 방식.
*   **RBAC**: `admin`, `controller`, `paramedic` 역할별 엄격한 API 엔드포인트 격리 (`backend/middleware/auth.js`).

### 3.2 데이터 암호화
*   **At Rest**: 사용자 비밀번호 및 민감 정보는 **bcryptjs** (Salt Rounds 10+) 단방향 해싱 저장.
*   **In Transit**: 모든 데이터 전송 구간(WebSocket, REST API)에 SSL/TLS 암호화 적용(설계 기준).

---

## 4. API 명세 요약 (Key API Specifications)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/realtime-biosignal/start` | 실시간 생체신호 분석 스트림 시작 |
| **GET** | `/api/emergency/cases/:id` | AI 분석 리포트 및 생체 데이터 상세 조회 |
| **POST** | `/api/alert` | 수동 응급 알림 생성 (관제 요원용) |
| **GET** | `/api/users/me/baseline` | 사용자별 건강 기초선(Baseline) 데이터 조회 |
