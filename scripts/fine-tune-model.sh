#!/bin/bash

# 골든타임 LLM 파인튜닝 스크립트
# Ollama를 사용한 커스텀 모델 생성

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 골든타임 LLM 파인튜닝 시작${NC}"

# Ollama 설치 확인
if ! command -v ollama &> /dev/null; then
    echo -e "${RED}❌ Ollama가 설치되어 있지 않습니다.${NC}"
    echo "설치 방법: https://ollama.ai"
    exit 1
fi

echo -e "${GREEN}✅ Ollama 확인됨${NC}"

# Ollama 서버 상태 확인
echo -e "${YELLOW}🔍 Ollama 서버 상태 확인 중...${NC}"
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama 서버 실행 중${NC}"
else
    echo -e "${RED}❌ Ollama 서버가 실행 중이지 않습니다.${NC}"
    echo -e "${YELLOW}다음 명령으로 Ollama 서버를 시작하세요:${NC}"
    echo "  ollama serve"
    echo ""
    echo -e "${YELLOW}또는 백그라운드에서 실행:${NC}"
    echo "  ollama serve > /dev/null 2>&1 &"
    exit 1
fi

# 기본 모델 확인
echo -e "${YELLOW}📥 기본 모델 확인 중...${NC}"
MODEL_LIST=$(ollama list 2>/dev/null || echo "")
if echo "$MODEL_LIST" | grep -q "llama3.1:8b"; then
    echo -e "${GREEN}✅ llama3.1:8b 모델 확인됨${NC}"
else
    echo -e "${YELLOW}📥 llama3.1:8b 모델 다운로드 중...${NC}"
    if ollama pull llama3.1:8b; then
        echo -e "${GREEN}✅ 모델 다운로드 완료${NC}"
    else
        echo -e "${RED}❌ 모델 다운로드 실패${NC}"
        exit 1
    fi
fi

# Modelfile 경로 확인
MODELFILE_PATH="$(pwd)/backend/data/Modelfile"
if [ ! -f "$MODELFILE_PATH" ]; then
    echo -e "${RED}❌ Modelfile을 찾을 수 없습니다: $MODELFILE_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Modelfile 확인됨${NC}"

# 커스텀 모델 생성
MODEL_NAME="goldentime-emergency:latest"
echo -e "${YELLOW}🔨 커스텀 모델 생성 중: $MODEL_NAME${NC}"

cd "$(dirname "$MODELFILE_PATH")"
ollama create "$MODEL_NAME" -f Modelfile

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 모델 생성 완료: $MODEL_NAME${NC}"
    echo ""
    echo -e "${GREEN}사용 방법:${NC}"
    echo "1. 환경변수 설정: OLLAMA_MODEL=$MODEL_NAME"
    echo "2. 또는 .env 파일에 추가: OLLAMA_MODEL=$MODEL_NAME"
    echo ""
    echo -e "${YELLOW}모델 테스트:${NC}"
    echo "ollama run $MODEL_NAME '기초선 심박수: 70 bpm, 현재 심박수: 45 bpm, 스트레스: 85'"
else
    echo -e "${RED}❌ 모델 생성 실패${NC}"
    exit 1
fi
