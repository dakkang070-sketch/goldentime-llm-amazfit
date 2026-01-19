# 파인튜닝 모델 생성 빠른 시작 가이드

## 현재 상태
- ✅ Ollama 설치됨: `/opt/homebrew/bin/ollama`
- ✅ 학습 데이터셋 준비됨: 21개 샘플
- ✅ Modelfile 준비됨: `backend/data/Modelfile`
- ⚠️ Ollama 서버 미실행

## 실행 방법

### 1단계: Ollama 서버 시작

**새 터미널 창에서 실행:**

```bash
ollama serve
```

서버가 시작되면 다음과 같은 메시지가 표시됩니다:
```
2024/01/14 16:00:00 routes.go:1008: INFO server config env="map[OLLAMA_HOST:0.0.0.0:11434]"
2024/01/14 16:00:00 routes.go:1014: INFO starting server...
```

**또는 백그라운드 실행:**

```bash
ollama serve > /dev/null 2>&1 &
```

### 2단계: 기본 모델 다운로드 (처음 한 번만)

```bash
ollama pull llama3.1:8b
```

다운로드가 완료되면 약 4.7GB의 모델이 설치됩니다.

### 3단계: 파인튜닝 모델 생성

**원래 터미널로 돌아와서:**

```bash
cd /Users/jace/Downloads/goldentime-llm
./scripts/fine-tune-model.sh
```

또는 수동으로:

```bash
cd /Users/jace/Downloads/goldentime-llm/backend/data
ollama create goldentime-emergency:latest -f Modelfile
```

### 4단계: 모델 확인

```bash
ollama list
```

다음과 같이 표시되어야 합니다:
```
NAME                        SIZE
llama3.1:8b                 4.7 GB
goldentime-emergency:latest  4.7 GB
```

### 5단계: 모델 테스트

```bash
ollama run goldentime-emergency:latest "기초선 심박수: 70 bpm, 현재 심박수: 45 bpm, 스트레스: 85"
```

### 6단계: 환경변수 설정

`.env` 파일에 추가:

```env
USE_FINETUNED_MODEL=true
OLLAMA_FINETUNED_MODEL=goldentime-emergency:latest
ENABLE_OLLAMA=true
```

## 한 번에 실행 (스크립트)

```bash
# 터미널 1: Ollama 서버 시작
ollama serve

# 터미널 2: 모델 생성
cd /Users/jace/Downloads/goldentime-llm
./scripts/fine-tune-model.sh
```

## 문제 해결

### "connection refused" 오류
- Ollama 서버가 실행 중인지 확인: `curl http://localhost:11434/api/tags`
- 서버를 시작: `ollama serve`

### 모델 다운로드 실패
- 인터넷 연결 확인
- 수동 다운로드: `ollama pull llama3.1:8b`

### 모델 생성 실패
- Modelfile 경로 확인: `ls backend/data/Modelfile`
- Ollama 서버 로그 확인

## 완료 확인

모든 단계가 완료되면:
1. ✅ `ollama list`에 `goldentime-emergency:latest` 표시
2. ✅ 모델 테스트 성공
3. ✅ 환경변수 설정 완료

이제 시스템이 파인튜닝된 모델을 사용합니다!
