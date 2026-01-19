#!/bin/bash

echo "🚀 골든타임 LLM 관제센터 대시보드 시작 중..."

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

# 프론트엔드 디렉토리로 이동
cd "$(dirname "$0")/frontend"

# 환경 변수 파일 확인
if [ ! -f ".env" ]; then
    echo "📝 .env 파일 생성 중..."
    cat > .env << EOF
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
EOF
    echo "✅ .env 파일이 생성되었습니다."
fi

# 의존성 확인
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 의존성 설치 실패"
        exit 1
    fi
fi

# 서버 실행
echo "✅ 대시보드 서버 시작 중..."
echo "🌐 브라우저에서 http://localhost:5173 접속하세요"
echo "📧 로그인: controller@test.com / test1234"
echo ""
npm run dev
