#!/bin/bash

# 전체 시스템 통합 테스트 스크립트

BASE_URL="${BASE_URL:-http://localhost:3000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 골든타임 LLM 전체 시스템 통합 테스트"
echo "=========================================="
echo ""

# 1. 서버 상태 확인
echo "1️⃣ 서버 상태 확인..."
if curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ 서버가 실행 중입니다.${NC}"
else
    echo -e "${RED}❌ 서버가 실행되지 않았습니다.${NC}"
    echo "   'npm start' 또는 'npm run dev'로 서버를 실행하세요."
    exit 1
fi
echo ""

# 2. 사용자 가입 및 로그인
echo "2️⃣ 사용자 가입 및 로그인 테스트..."
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "통합테스트사용자",
    "phone": "01099998888",
    "email": "integration@test.com",
    "password": "test1234",
    "birthDate": "1990-01-01",
    "age": 34,
    "height": 170,
    "weight": 70,
    "bloodType": "A",
    "consents": {
      "emergencyAutoReport": true,
      "personalInfoCollection": true,
      "preciseLocation": true,
      "emergencyAlgorithm": true
    }
  }')

USER_TOKEN=$(echo "$USER_RESPONSE" | jq -r '.token // empty' 2>/dev/null)

if [ -z "$USER_TOKEN" ] || [ "$USER_TOKEN" = "null" ]; then
    echo -e "${YELLOW}⚠️ 사용자 가입 실패 또는 이미 존재. 로그인 시도...${NC}"
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/login" \
      -H "Content-Type: application/json" \
      -d '{"email": "integration@test.com", "password": "test1234"}')
    USER_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty' 2>/dev/null)
fi

if [ -n "$USER_TOKEN" ] && [ "$USER_TOKEN" != "null" ]; then
    echo -e "${GREEN}✅ 사용자 인증 성공${NC}"
else
    echo -e "${RED}❌ 사용자 인증 실패${NC}"
    exit 1
fi
echo ""

# 3. 정상 생체 데이터 업로드
echo "3️⃣ 정상 생체 데이터 업로드 테스트..."
NORMAL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mobile/biometric" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "heartRate": 72,
    "bloodPressureSys": 118,
    "bloodPressureDia": 76,
    "spO2": 98,
    "temperature": 36.6,
    "stress": 25,
    "location": {
      "lat": 37.5665,
      "lng": 126.9780
    }
  }')

EMERGENCY_LEVEL=$(echo "$NORMAL_RESPONSE" | jq -r '.data.biometricData.emergencyLevel // empty' 2>/dev/null)
if [ "$EMERGENCY_LEVEL" = "1" ]; then
    echo -e "${GREEN}✅ 정상 데이터 처리 성공 (응급도: $EMERGENCY_LEVEL)${NC}"
else
    echo -e "${YELLOW}⚠️ 응급도: $EMERGENCY_LEVEL${NC}"
fi
echo ""

# 4. 응급 상황 데이터 업로드 (낮은 심박수)
echo "4️⃣ 응급 상황 데이터 업로드 테스트 (낮은 심박수)..."
EMERGENCY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mobile/biometric" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "heartRate": 38,
    "bloodPressureSys": 185,
    "bloodPressureDia": 115,
    "spO2": 88,
    "temperature": 39.2,
    "stress": 90,
    "location": {
      "lat": 37.5665,
      "lng": 126.9780
    }
  }')

EMERGENCY_LEVEL=$(echo "$EMERGENCY_RESPONSE" | jq -r '.data.biometricData.emergencyLevel // empty' 2>/dev/null)
if [ "$EMERGENCY_LEVEL" = "4" ] || [ "$EMERGENCY_LEVEL" = "5" ]; then
    echo -e "${GREEN}✅ 응급 데이터 처리 성공 (응급도: $EMERGENCY_LEVEL)${NC}"
else
    echo -e "${YELLOW}⚠️ 응급도: $EMERGENCY_LEVEL${NC}"
fi
echo ""

# 5. 관제사 로그인
echo "5️⃣ 관제사 로그인 테스트..."
CONTROLLER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/controllers/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "controller@test.com", "password": "test1234"}')

CONTROLLER_TOKEN=$(echo "$CONTROLLER_RESPONSE" | jq -r '.token // empty' 2>/dev/null)

if [ -n "$CONTROLLER_TOKEN" ] && [ "$CONTROLLER_TOKEN" != "null" ]; then
    echo -e "${GREEN}✅ 관제사 로그인 성공${NC}"
else
    echo -e "${YELLOW}⚠️ 관제사 로그인 실패 (테스트 데이터가 생성되지 않았을 수 있음)${NC}"
    echo "   'node scripts/create-test-data.js' 실행 권장"
fi
echo ""

# 6. 응급구조사 로그인
echo "6️⃣ 응급구조사 로그인 테스트..."
PARAMEDIC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/paramedics/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "paramedic1@test.com", "password": "test1234"}')

PARAMEDIC_TOKEN=$(echo "$PARAMEDIC_RESPONSE" | jq -r '.token // empty' 2>/dev/null)

if [ -n "$PARAMEDIC_TOKEN" ] && [ "$PARAMEDIC_TOKEN" != "null" ]; then
    echo -e "${GREEN}✅ 응급구조사 로그인 성공${NC}"
else
    echo -e "${YELLOW}⚠️ 응급구조사 로그인 실패 (테스트 데이터가 생성되지 않았을 수 있음)${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}✅ 통합 테스트 완료!${NC}"
echo ""
echo "다음 단계:"
echo "1. 프론트엔드 실행: cd frontend && npm install && npm run dev"
echo "2. 관제센터 접속: http://localhost:5173"
echo "3. Ollama 테스트: node scripts/test-ollama.js"
