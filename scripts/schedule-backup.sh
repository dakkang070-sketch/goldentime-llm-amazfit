#!/bin/bash

# 정기 백업 스크립트 (cron용)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# 환경변수 로드
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 백업 실행
"$SCRIPT_DIR/backup.sh"

# 로그 기록
echo "$(date): 백업 완료" >> logs/backup.log
