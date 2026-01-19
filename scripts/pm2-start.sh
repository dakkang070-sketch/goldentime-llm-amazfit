#!/bin/bash

# PM2로 프로덕션 서버 시작

set -e

echo "🚀 PM2로 골든타임 LLM 서버 시작..."

# PM2 설치 확인
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2가 설치되어 있지 않습니다."
    echo "설치: npm install -g pm2"
    exit 1
fi

# 환경변수 확인
if [ ! -f ".env" ]; then
    echo "⚠️  .env 파일이 없습니다."
    echo "config/env.example을 참고하여 .env 파일을 생성하세요."
    exit 1
fi

# PM2로 시작
pm2 start ecosystem.config.js --env production

echo "✅ 서버가 시작되었습니다."
echo ""
echo "명령어:"
echo "  - 상태 확인: pm2 status"
echo "  - 로그 확인: pm2 logs"
echo "  - 재시작: pm2 restart goldentime-backend"
echo "  - 중지: pm2 stop goldentime-backend"
echo "  - 삭제: pm2 delete goldentime-backend"
