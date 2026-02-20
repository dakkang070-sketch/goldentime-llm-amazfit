#!/bin/bash

echo "🌐 Golden Time LLM 외부 접속 정보"
echo "=================================================="
echo ""

# 서버 상태 확인
echo "🔍 서버 상태 확인 중..."

# 백엔드 확인 (포트 3003)
if curl -s -f http://localhost:3003/health > /dev/null 2>&1; then
    echo "✅ 응급 백엔드 (3003): 정상"
    BACKEND_RUNNING=true
else
    echo "❌ 응급 백엔드 (3003): 실행되지 않음"
    BACKEND_RUNNING=false
fi

# 프론트엔드 확인
if curl -s -f http://localhost:3002 > /dev/null 2>&1; then
    echo "✅ 응급 관제 (3002): 정상"
    FRONTEND_RUNNING=true
else
    echo "❌ 응급 관제 (3002): 실행되지 않음"
    FRONTEND_RUNNING=false
fi

echo ""
echo "🌐 외부 접속 도메인 (Cloudflare Tunnel):"
echo "=================================================="
echo "1. 📱 모바일 앱:   https://mobile.goldentime.sbs"
echo "2. 👑 관리자:     https://admin.goldentime.sbs"
echo "3. 📡 응급 관제:   https://control.goldentime.sbs"
echo "4. 👮 범죄 관제:   https://crime.goldentime.sbs"
echo ""
echo "💡 위 주소로 접속이 안 된다면 Cloudflare Tunnel이 실행 중인지 확인하세요."
echo "   명령어: pgrep -fl cloudflared"
echo ""
echo "=================================================="
echo "🎮 Happy Monitoring! 🏥"
