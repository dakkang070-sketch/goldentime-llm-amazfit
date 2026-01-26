#!/bin/bash

echo "🚀 골든타임 LLM 관제센터 프론트엔드 시작 중..."

# npm 권한 문제 해결 시도
if [ -d ~/.npm ] && [ ! -w ~/.npm ]; then
    echo "⚠️  npm 권한 문제가 감지되었습니다."
    echo "다음 명령어를 실행해주세요:"
    echo "   sudo chown -R \$(whoami) ~/.npm"
    echo ""
    read -p "지금 실행하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo chown -R $(whoami) ~/.npm
    fi
fi

# 프론트엔드 디렉토리로 이동 (goldentime-dashboard 사용)
cd "$(dirname "$0")/frontend"

# 의존성 확인
if false; then
    echo "📦 의존성 설치 중..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 의존성 설치 실패"
        exit 1
    fi
fi

# 서버 실행
echo "✅ 프론트엔드 서버 시작 중..."
echo "🌐 브라우저에서 http://localhost:5173 접속하세요"
echo ""
npm run dev
