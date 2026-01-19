#!/bin/bash

echo "🚀 골든타임 LLM 백엔드 서버 시작 스크립트"
echo ""

# 프로젝트 루트로 이동
cd "$(dirname "$0")"

# .env 파일 확인 및 생성
if [ ! -f .env ]; then
    echo "📝 .env 파일이 없습니다. 생성 중..."
    if [ -f config/env.example ]; then
        cp config/env.example .env
        echo "✅ .env 파일 생성 완료 (config/env.example 복사)"
    else
        echo "❌ config/env.example 파일을 찾을 수 없습니다."
        exit 1
    fi
else
    echo "✅ .env 파일 존재 확인"
fi

# MongoDB 실행 확인
echo ""
echo "🔍 MongoDB 실행 확인 중..."
if command -v brew &> /dev/null; then
    if brew services list | grep -q "mongodb.*started"; then
        echo "✅ MongoDB 실행 중"
    else
        echo "⚠️  MongoDB가 실행되지 않았습니다."
        read -p "MongoDB를 시작하시겠습니까? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            brew services start mongodb-community || brew services start mongodb
        fi
    fi
else
    echo "⚠️  brew를 찾을 수 없습니다. MongoDB가 실행 중인지 수동으로 확인해주세요."
fi

# 의존성 확인
if [ ! -d node_modules ]; then
    echo ""
    echo "📦 의존성 설치 중..."
    npm install
fi

# 컨트롤러 계정 확인 및 생성
echo ""
echo "👮 컨트롤러 계정 확인 중..."
node scripts/create-controller-only.js 2>&1 | grep -E "(✅|❌|이메일|비밀번호)" || echo "계정 확인 완료"

# 백엔드 서버 실행
echo ""
echo "🌐 백엔드 서버 시작 중..."
echo "   서버가 시작되면 http://localhost:3000 에서 접근 가능합니다."
echo "   종료하려면 Ctrl+C를 누르세요."
echo ""

npm run dev
