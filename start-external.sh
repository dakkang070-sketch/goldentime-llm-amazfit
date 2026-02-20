#!/bin/bash

echo "🚀 Golden Time LLM 외부 접속 모드 시작"
echo ""

# 포트 확인
echo "📡 사용 가능한 포트 확인 중..."
if lsof -ti:3000 > /dev/null; then
    echo "⚠️  포트 3000이 사용 중입니다. 포트를 변경하겠습니다."
    export PORT=3002
else
    export PORT=3000
fi

echo "🔧 백엔드 서버 시작 (포트: $PORT)"
echo ""

# 환경변수 설정
export NODE_ENV=development
export HOST=localhost

# 백그라운드에서 백엔드 실행
npm start &
BACKEND_PID=$!

# 잠시 대기
sleep 3

echo ""
echo "🎨 프론트엔드 서버 시작 (포트: 3001)"
echo ""

# 프론트엔드 실행
npm run dev:frontend &
FRONTEND_PID=$!

echo ""
echo "✅ 서버 시작 완료!"
echo ""
echo "📱 로컬 접속:"
echo "   - 백엔드: http://localhost:$PORT"
echo "   - 프론트엔드: http://localhost:3001"
echo ""
echo "🌐 외부 접속:"
echo "   Cloudflare Tunnel이 실행 중이어야 합니다."
echo "   - 모바일: https://mobile.goldentime.sbs"
echo "   - 관리자: https://admin.goldentime.sbs"
echo ""
echo "❌ 종료하려면 Ctrl+C를 누르세요"

# 종료 시 모든 프로세스 정리
trap "echo '🛑 서버 종료 중...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT

# 대기
wait
