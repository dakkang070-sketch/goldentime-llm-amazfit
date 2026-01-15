#!/usr/bin/env bash
set -euo pipefail

# 사용법:
#   USER_ID=... ./scripts/send_mock_biometric.sh
#   TOKEN=... USER_ID=... ./scripts/send_mock_biometric.sh
#   USER_ID=... SERVER=http://localhost:3000 ./scripts/send_mock_biometric.sh

SERVER="${SERVER:-http://localhost:3000}"
USER_ID="${USER_ID:-}"
TOKEN="${TOKEN:-}"

if [[ -z "${USER_ID}" ]]; then
  echo "USER_ID 환경변수가 필요합니다. 예) USER_ID=65... ./scripts/send_mock_biometric.sh" >&2
  exit 1
fi

NOW_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

curl -sS "${SERVER}/api/ingest/mock" \
  -H "Content-Type: application/json" \
  ${TOKEN:+ -H "Authorization: Bearer ${TOKEN}"} \
  -d "{
    \"userId\": \"${USER_ID}\",
    \"collectedAt\": \"${NOW_ISO}\",
    \"heartRate\": 38,
    \"stressLevel\": 92,
    \"movementStatus\": \"fall_detected\",
    \"location\": { \"lat\": 37.5665, \"lng\": 126.9780, \"accuracy\": 15 }
  }" | jq .

