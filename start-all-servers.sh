#!/bin/bash

echo "🚀 Golden Time LLM 전체 시스템 시작"
echo "===================================="

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")"

echo "📁 현재 디렉토리: $(pwd)"

# 기존 프로세스 정리
echo "🔧 기존 프로세스 정리 중..."
pkill -f "node.*3000" 2>/dev/null || true
pkill -f "node.*3001" 2>/dev/null || true
sleep 2

# 백엔드 시작 (백그라운드)
echo "🔥 백엔드 서버 시작 (포트: 3000)"
npm start > backend.log 2>&1 &
BACKEND_PID=$!
echo "   백엔드 PID: $BACKEND_PID"

# 백엔드가 시작될 때까지 대기
echo "⏳ 백엔드 서버 시작 대기 중..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ 백엔드 서버 시작 완료!"
        break
    fi
    echo "   대기 중... ($i/30)"
    sleep 1
done

# 프론트엔드 시작 (백그라운드)
echo "🎨 프론트엔드 서버 시작 (포트: 3001)"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   프론트엔드 PID: $FRONTEND_PID"
cd ..

# 프론트엔드가 시작될 때까지 대기
echo "⏳ 프론트엔드 서버 시작 대기 중..."
for i in {1..30}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo "✅ 프론트엔드 서버 시작 완료!"
        break
    fi
    echo "   대기 중... ($i/30)"
    sleep 1
done

echo ""
echo "🎉 모든 서버 시작 완료!"
echo "===================================="
echo "📡 백엔드:     http://localhost:3000"
echo "🎨 프론트엔드: http://localhost:3001"
echo ""
echo "🌐 ngrok URL이 있다면 그 주소로도 접속 가능합니다!"
echo ""
echo "❌ 종료하려면 다음 명령어 사용:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📋 로그 확인:"
echo "   tail -f backend.log    (백엔드 로그)"
echo "   tail -f frontend.log   (프론트엔드 로그)"

# 종료 시 정리 함수
cleanup() {
    echo ""
    echo "🛑 서버 종료 중..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# 신호 처리
trap cleanup SIGINT SIGTERM

echo ""
echo "🎮 서버가 실행 중입니다. Ctrl+C로 종료하세요."
echo "===================================="

# 무한 대기 (Ctrl+C로 종료하기 전까지)
wait