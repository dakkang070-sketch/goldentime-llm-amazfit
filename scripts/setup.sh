#!/bin/bash

# 골든타임 LLM 프로젝트 초기 설정 스크립트

set -e

echo "🚀 골든타임 LLM 프로젝트 설정을 시작합니다..."

# Node.js 버전 확인
echo "📦 Node.js 버전 확인..."
node --version || { echo "❌ Node.js가 설치되어 있지 않습니다."; exit 1; }

# npm 의존성 설치
echo "📦 npm 의존성 설치 중..."
npm install

# Python 의존성 설치 (있는 경우)
if [ -f "requirements.txt" ]; then
    echo "🐍 Python 의존성 설치 중..."
    pip3 install -r requirements.txt || echo "⚠️ Python 의존성 설치 실패 (선택사항)"
fi

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo "⚙️ .env 파일 생성 중..."
    if [ -f "config/env.example" ]; then
        cp config/env.example .env
        echo "✅ .env 파일이 생성되었습니다. 필요한 값들을 수정해주세요."
    else
        echo "⚠️ config/env.example 파일을 찾을 수 없습니다."
    fi
else
    echo "✅ .env 파일이 이미 존재합니다."
fi

# MongoDB 확인
echo "🗄️ MongoDB 확인 중..."
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB가 설치되어 있습니다."
    # MongoDB 실행 확인
    if pgrep -x "mongod" > /dev/null; then
        echo "✅ MongoDB가 실행 중입니다."
    else
        echo "⚠️ MongoDB가 실행되지 않았습니다. 'mongod' 명령어로 실행해주세요."
    fi
else
    echo "⚠️ MongoDB가 설치되어 있지 않습니다."
    echo "   설치 방법: https://www.mongodb.com/try/download/community"
fi

# Ollama 확인 및 설치
echo "🤖 Ollama 확인 중..."
if command -v ollama &> /dev/null; then
    echo "✅ Ollama가 설치되어 있습니다."
    
    # Llama 3.1 8B 모델 확인
    echo "📥 Llama 3.1 8B 모델 확인 중..."
    if ollama list | grep -q "llama3.1:8b"; then
        echo "✅ Llama 3.1 8B 모델이 이미 다운로드되어 있습니다."
    else
        echo "📥 Llama 3.1 8B 모델 다운로드 중..."
        ollama pull llama3.1:8b || echo "⚠️ 모델 다운로드 실패"
    fi
else
    echo "⚠️ Ollama가 설치되어 있지 않습니다."
    echo "   설치 방법: https://ollama.ai/download"
    echo "   macOS: brew install ollama"
fi

# 디렉토리 권한 설정
echo "🔐 스크립트 실행 권한 설정 중..."
chmod +x scripts/*.sh 2>/dev/null || true

echo ""
echo "✅ 설정이 완료되었습니다!"
echo ""
echo "다음 단계:"
echo "1. .env 파일을 열어 필요한 값들을 설정하세요"
echo "2. MongoDB를 실행하세요 (아직 실행하지 않았다면)"
echo "3. 'npm start' 또는 'npm run dev'로 서버를 실행하세요"
