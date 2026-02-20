# 기술사업계획서 [2. 기술사업 내용] - 기술성 상세 기술서 (Advanced Technical Specification)

본 기술서는 **"하이브리드 LLM 기반 실시간 생체신호 분석 및 지능형 응급 관제 플랫폼"**의 시스템 아키텍처, 핵심 알고리즘, 데이터 파이프라인 및 보안 설계를 엔지니어링 관점에서 구체적으로 기술합니다.

---

## 1. 시스템 아키텍처 및 기술 스택 (System Architecture & Tech Stack)

본 시스템은 **Edge-to-Cloud** 4계층 아키텍처로 구성되어 있으며, 초저지연(Ultra-low Latency) 데이터 처리와 고가용성(High Availability)을 보장합니다.

### 1.1 Backend Core (Node.js Environment)
*   **Runtime**: Node.js v18.0.0+ (V8 Engine v10.x, Event-Driven Architecture)
*   **Framework**: Express.js v4.x (RESTful API, Middleware Chain)
*   **Real-time Engine**: Socket.IO v4.7.2
    *   **Protocol**: WebSocket (RFC 6455) with HTTP Long-polling fallback.
    *   **Concurrency**: Cluster Mode 미사용(Single Thread Event Loop), Redis Adapter를 통한 Scale-out 구조 설계 가능.
*   **Database**:
    *   **Primary**: MongoDB v7.x (Driver: Mongoose v7.5.0) - Schema-based Document Store.
    *   **Cache/Queue**: Redis (In-Memory Data Structure Store) - *설계상 포함*.

### 1.2 Frontend Core (React Ecosystem)
*   **Framework**: React v19.2.3 (Concurrent Mode 활성화)
*   **Build Tool**: Vite v5.x (ESBuild 기반 초고속 번들링)
*   **GIS Engine**: Leaflet v1.9.4
    *   **Optimization**: React Virtual DOM 우회를 위한 `useRef` 기반 Direct DOM Manipulation 적용.
*   **State Management**: Context API + Custom Hooks (`useBiosignal`, `useWebSocket`).

### 1.3 AI Intelligence Layer
*   **On-Premise Inference**: Ollama v0.4.0
    *   **Base Model**: Meta Llama 3.1 8B Instruct (Quantization: Q4_K_M 권장)
    *   **Fine-tuning**: PEFT (Parameter-Efficient Fine-Tuning) / LoRA (Low-Rank Adaptation)
*   **Cloud API**: Google Gemini Pro (Fallback 및 비식별 데이터 심층 분석용)

---

## 2. 핵심 알고리즘 및 로직 상세 (Core Algorithms & Logic Details)

### 2.1 Real-time Biosignal Engine (`backend/services/realtimeBiosignalEngine.js`)
시계열 데이터의 실시간 분석을 위해 **슬라이딩 윈도우(Sliding Window)** 기반의 파이프라인을 구축하였습니다.

*   **Data Structure**: **Ring Buffer (Circular Buffer)**
    *   메모리 재할당 오버헤드 없는 고정 크기 배열 사용 (최근 5분 데이터 유지).
    *   `Array.push()` / `Array.shift()` 대신 인덱스 포인터 연산으로 O(1) 삽입 구현.

*   **Analysis Window Configuration**:
    | Signal Type | Window Size | Purpose |
    | :--- | :--- | :--- |
    | **Heart Rate** | 10 sec | 순간적 빈맥(Tachycardia)/서맥(Bradycardia) 포착 |
    | **HRV** | 60 sec | 자율신경계 균형 분석 (RMSSD/SDNN 계산용 최소 구간) |
    | **Arrhythmia** | 30 sec | 불규칙 심박 패턴(Afib 등) 탐지 |
    | **Activity/Fall** | 2~5 sec | 3축 가속도 센서 급변화(Impact) 감지 |

*   **Emergency Decision Logic (Thresholds)**:
    *   **Critical Condition (즉시 알림)**:
        *   `HR < 30` OR `HR > 180` (BPM)
        *   `SpO2 < 85` (%)
        *   `BodyTemp > 40.0` (°C)
    *   **Warning Condition (주의)**:
        *   `HR < 40` OR `HR > 150`
        *   `SpO2 < 90`

### 2.2 LLM Inference Pipeline (`backend/services/ollamaService.js`)
생체 데이터를 텍스트 프롬프트로 변환하여 LLM에 주입하는 **Bio-to-Text** 전처리기와 추론 파라미터 최적화가 적용되었습니다.

*   **Model Parameters**:
    *   **Temperature**: `0.2` (Deterministic Output 보장, 환각 최소화)
    *   **Top-P**: `0.9` (Nucleus Sampling)
    *   **System Prompt**: 의료 법적 리스크 회피를 위한 "Safety Guardrail" 적용.
        > *"You are an emergency response AI. Do NOT provide medical diagnosis. Only suggest possible conditions and recommend immediate actions based on the provided biosignals."*

*   **Fine-tuned Models**:
    *   `goldentime-emergency:latest`: 복합 생체 신호 해석 특화.
    *   `goldentime-psychoactive:latest`: 약물 반응 패턴 탐지 특화.

### 2.3 Intelligent Map Visualization (`frontend/components/CrimeMap.tsx`)
대규모 마커 렌더링 성능 최적화를 위한 **Imperative DOM Management** 기법을 적용했습니다.

*   **Marker Management Strategy**:
    *   React의 `re-render` 사이클과 분리된 `markersRef` 객체 관리.
    *   상태 업데이트 시 컴포넌트 전체를 다시 그리지 않고, Leaflet API (`marker.setLatLng()`, `marker.setIcon()`)만 직접 호출하여 **Zero-Layout-Thrashing** 달성.
*   **Animation**:
    *   CSS3 Hardware Acceleration(`transform: translate3d`)을 활용한 Pulse Animation (`.leaflet-marker-icon` 클래스 커스텀).
    *   `map.flyTo()` 메서드 사용 시 `duration: 1.5`, `easeLinearity: 0.25` 설정으로 부드러운 시점 이동 구현.

---

## 3. 보안 아키텍처 (Security Architecture)

### 3.1 Authentication & Authorization (`backend/middleware/auth.js`)
*   **Standard**: JWT (JSON Web Token) RFC 7519 준수.
*   **Algorithm**: **HS256** (HMAC using SHA-256).
*   **Expiration**: `expiresIn: '7d'` (Access Token), Refresh Token Rotation 전략(설계 반영).
*   **Access Control**: 미들웨어 체이닝을 통한 RBAC (Role-Based Access Control) 구현.
    ```javascript
    router.post('/alert', authRequired, requireRole('controller'), alertController.create);
    ```

### 3.2 Data Protection
*   **Encryption**: 사용자 비밀번호는 `bcryptjs` (Salt Rounds: 10 이상)를 사용하여 단방향 해싱 저장.
*   **Input Validation**: API 요청 본문(Body)에 대한 엄격한 타입 검증 수행 (Mongoose Schema Validation).

---

## 4. API 명세 요약 (Key API Endpoints)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| **POST** | `/api/realtime-biosignal/start` | 실시간 생체신호 분석 세션 시작 (WebSocket Room Join) | YES |
| **POST** | `/api/emergency/cases` | 신규 응급 상황 케이스 수동/자동 생성 | YES |
| **GET** | `/api/emergency/cases/:id` | 특정 응급 케이스의 상세 정보 및 AI 분석 리포트 조회 | YES |
| **GET** | `/api/users/me` | 현재 로그인한 사용자의 프로필 및 의료 정보 조회 | YES |
| **POST** | `/api/auth/login` | 사용자 로그인 및 JWT 토큰 발급 | NO |

---

## 5. 개발 환경 및 배포 (DevOps)
*   **Version Control**: Git
*   **Package Management**: npm
*   **Proxy Configuration**:
    *   개발 환경: Vite Proxy (`/api` -> `localhost:3000`)
    *   운영 환경(예정): Nginx Reverse Proxy (SSL Termination, Load Balancing)
