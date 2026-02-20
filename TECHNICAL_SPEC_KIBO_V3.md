# 기술사업계획서 [2. 기술사업 내용] - AI 및 데이터 파이프라인 상세 기술서

본 기술서는 **"하이브리드 LLM 기반 실시간 생체신호 분석 및 지능형 응급 관제 플랫폼"**의 핵심인 AI 학습 데이터 구축 전략, 파인튜닝(Fine-tuning) 파이프라인, 그리고 추론 엔진의 세부 구현 내용을 **AI 엔지니어링 관점**에서 기술합니다.

---

## 1. AI 학습 및 최적화 전략 (AI Training & Optimization Strategy)

범용 LLM의 한계를 극복하고, 생체신호 해석 및 응급 상황 판단의 정확도를 극대화하기 위해 **PEFT (Parameter-Efficient Fine-Tuning)** 기반의 **LoRA (Low-Rank Adaptation)** 기술을 적용했습니다.

### 1.1 도메인 특화 모델 개발 (Domain-Specific Models)
각기 다른 응급 상황에 최적화된 복수의 경량화 모델(sLLM)을 개발하여 운영합니다.

#### A. 학교 폭력 및 위기 상황 감지 모델 (`School-Violence-Detector`)
*   **Base Model**: `TinyLlama/TinyLlama-1.1B-Chat-v1.0` (1.1B Parameters)
    *   선정 사유: 엣지 디바이스(Edge Device) 탑재를 고려한 초경량 모델.
*   **LoRA Configuration** (`backend/finetuning/train_school_violence.py`):
    *   **Rank (`r`)**: **8** (학습 파라미터 수 최소화)
    *   **Alpha (`lora_alpha`)**: **32** (가중치 업데이트 스케일링)
    *   **Dropout**: **0.1** (과적합 방지)
    *   **Target Task**: `CAUSAL_LM`
*   **Hyperparameters**:
    *   Learning Rate: `2e-4`
    *   Batch Size: `4`
    *   Epochs: `3`
    *   Optimizer: `AdamW`

#### B. 약물 및 알코올 이상 반응 탐지 모델 (`Substance-Abuse-Detector`)
*   **Base Model**: `microsoft/DialoGPT-medium`
    *   선정 사유: 대화형 맥락(Context) 유지 및 시계열 패턴의 서사적 해석에 강점.
*   **LoRA Configuration** (`backend/finetuning/loraFineTuning.py`):
    *   **Rank (`r`)**: **16** (표현력 증대)
    *   **Target Modules**: `["c_attn", "c_proj"]` (Transformer Attention Layer 집중 학습)

### 1.2 데이터 전처리 및 파이프라인 (Data Preprocessing Pipeline)
MongoDB에 축적된 원시 데이터를 LLM 학습용 Instruction Dataset으로 변환하는 자동화 파이프라인(`scripts/prepare-fine-tuning-data.js`)을 구축했습니다.

*   **Bio-to-Text Conversion Logic**:
    *   단순 수치 나열이 아닌, **"기초선(Baseline) 대비 변화량"**을 텍스트로 서술화하여 모델의 이해도 향상.
    *   **Input Example**:
        > "기초선 심박수: 75 bpm, 현재 심박수: 120 bpm (급상승), HRV 스트레스 지수: 80 (고위험)"
    *   **Output Example**:
        > "경고: 심각한 생체신호 이탈이 감지되었습니다. 즉각적인 의료 개입이 필요합니다."
*   **Dataset Structure**: `Alpaca` 포맷 호환 JSON (`instruction`, `input`, `output`).

---

## 2. 추론 엔진 및 Context 주입 (Inference Engine & Context Injection)

RAG(Retrieval-Augmented Generation)의 높은 구축 비용과 지연 시간(Latency) 문제를 해결하기 위해, **"Dynamic Context Injection (동적 맥락 주입)"** 아키텍처를 독자 개발했습니다.

### 2.1 Vector DB-Free Context Awareness
별도의 벡터 데이터베이스(Vector DB) 없이도 개인화된 맥락을 인지할 수 있도록 설계했습니다.

*   **Baseline Retrieval**:
    *   MongoDB에서 해당 사용자의 최근 30일간 생체 데이터 평균(심박수, 수면 패턴 등)을 실시간 조회.
*   **Prompt Engineering**:
    *   조회된 Baseline 데이터와 실시간 측정값을 프롬프트 템플릿에 동적으로 바인딩(Binding).
    *   **System Prompt Template**:
        ```text
        [Role]: Emergency Response AI
        [Context]:
        - User Baseline HR: {userBaseline.hr} bpm
        - Current HR: {current.hr} bpm
        [Task]: Analyze the deviation and suggest actions.
        ```

### 2.2 생체신호 임베딩 (Biosignal Embedding)
텍스트가 아닌 시계열 생체신호 자체의 패턴을 분석하기 위해 별도의 Transformer 인코더를 구현했습니다.

*   **Signal Transformer** (`backend/transformers/alcoholTransformer.py`):
    *   **Input Dimension**: `(Batch, 20, 6)` (20초 윈도우, 6개 생체 Feature)
    *   **Architecture**: PyTorch `nn.TransformerEncoder` (4 Layers, 8 Heads)
    *   **Embedding Output**: `128-dim` 벡터
    *   **활용**: LLM 입력 전, 생체 신호의 이상 패턴을 1차적으로 분류(Classification)하여 프롬프트에 "힌트"로 제공.

---

## 3. 검증 및 성능 평가 (Validation & Metrics)

*   **평가 지표 (Metrics)**:
    *   **F1-Score**: 불균형한 응급 데이터(응급 상황이 드묾) 특성을 고려하여 정확도(Accuracy) 대신 F1-Score를 주 지표로 활용.
    *   **Latency**: 센서 데이터 수신 후 LLM 응답까지 **2초 이내** (On-Device 기준) 목표 달성.

*   **Safety Guardrail**:
    *   의료적 진단(Diagnosis) 용어 사용을 원천 차단하는 후처리(Post-processing) 필터 적용.
    *   Ollama `temperature: 0.2` 설정으로 환각(Hallucination) 현상 억제.
