#!/bin/bash

# PM2로 프로덕션 서버 중지

set -e

echo "🛑 PM2로 골든타임 LLM 서버 중지..."

pm2 stop goldentime-backend || echo "서버가 실행 중이 아닙니다."

echo "✅ 서버가 중지되었습니다."
