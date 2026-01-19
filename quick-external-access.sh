#!/bin/bash

echo "🌐 Golden Time LLM 외부 접속 활성화 스크립트"
echo "=================================================="
echo ""

# 서버 상태 확인
echo "🔍 서버 상태 확인 중..."

# 백엔드 확인
if curl -s -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ 백엔드 서버: http://localhost:3000 (정상)"
    BACKEND_RUNNING=true
else
    echo "❌ 백엔드 서버가 실행되지 않았습니다."
    BACKEND_RUNNING=false
fi

# 프론트엔드 확인
if curl -s -f http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ 프론트엔드 서버: http://localhost:3001 (정상)"
    FRONTEND_RUNNING=true
else
    echo "❌ 프론트엔드 서버가 실행되지 않았습니다."
    FRONTEND_RUNNING=false
fi

echo ""
echo "🌐 외부 접속 방법 안내:"
echo "=================================================="

# 현재 IP 주소 확인 시도
echo "📍 현재 컴퓨터의 네트워크 정보:"
echo ""

# 네트워크 인터페이스별 IP 확인
echo "🔗 같은 네트워크 내 접속 가능한 IP:"
ifconfig 2>/dev/null | grep -E "inet [0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" | grep -v "127.0.0.1" | awk '{print "   - http://"$2":3001"}' | head -3

echo ""
echo "🚀 외부 인터넷 접속을 위한 방법들:"
echo ""
echo "방법 1 - ngrok 사용 (추천):"
echo "   1. 터미널에서: brew install ngrok"
echo "   2. 회원가입: https://dashboard.ngrok.com/signup"
echo "   3. 토큰 설정: ngrok config add-authtoken YOUR_TOKEN"
echo "   4. 터널 생성:"
echo "      - 백엔드: ngrok http 3000"
echo "      - 프론트엔드: ngrok http 3001"
echo ""
echo "방법 2 - Cloudflare Tunnel:"
echo "   1. 설치: brew install cloudflared"
echo "   2. 터널: cloudflared tunnel --url http://localhost:3001"
echo ""
echo "방법 3 - localtunnel (npm 권한 수정 후):"
echo "   1. 권한 수정: sudo chown -R \$(whoami) ~/.npm"
echo "   2. 설치: npm install -g localtunnel"
echo "   3. 터널: lt --port 3001"
echo ""

if [ "$BACKEND_RUNNING" = true ] && [ "$FRONTEND_RUNNING" = true ]; then
    echo "✨ 모든 서버가 정상 실행 중입니다!"
    echo "🎯 로컬 테스트: http://localhost:3001"
    echo ""
    echo "🌐 외부 접속을 원하시면 위의 방법 중 하나를 선택하세요!"
else
    echo ""
    echo "⚠️  서버가 실행되지 않았습니다. 먼저 서버를 시작하세요:"
    echo "   ./start-external.sh"
fi

echo ""
echo "=================================================="
echo "🎮 Happy Monitoring! 🏥"