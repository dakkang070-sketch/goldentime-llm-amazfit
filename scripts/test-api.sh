#!/bin/bash

# API 테스트 스크립트

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🧪 골든타임 LLM API 테스트 시작..."
echo "서버 URL: $BASE_URL"
echo ""

# Health check
echo "1️⃣ Health Check..."
curl -s "$BASE_URL/health" | jq '.' || echo "❌ 서버가 실행되지 않았습니다."
echo ""

# 사용자 가입
echo "2️⃣ 사용자 가입 테스트..."
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "테스트 사용자",
    "phone": "01012345678",
    "email": "test@example.com",
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

echo "$USER_RESPONSE" | jq '.' || echo "$USER_RESPONSE"
USER_TOKEN=$(echo "$USER_RESPONSE" | jq -r '.token // empty')

if [ -z "$USER_TOKEN" ] || [ "$USER_TOKEN" = "null" ]; then
    echo "⚠️ 사용자 가입 실패 또는 이미 존재하는 계정"
    echo "로그인 시도..."
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/login" \
      -H "Content-Type: application/json" \
      -d '{"email": "test@example.com", "password": "test1234"}')
    USER_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')
fi

if [ -n "$USER_TOKEN" ] && [ "$USER_TOKEN" != "null" ]; then
    echo "✅ 사용자 토큰 획득: ${USER_TOKEN:0:20}..."
    
    # 생체 데이터 업로드 테스트
    echo ""
    echo "3️⃣ 생체 데이터 업로드 테스트..."
    BIOMETRIC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mobile/biometric" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $USER_TOKEN" \
      -d '{
        "heartRate": 75,
        "bloodPressureSys": 120,
        "bloodPressureDia": 78,
        "spO2": 98,
        "temperature": 36.7,
        "stress": 30,
        "location": {
          "lat": 37.5665,
          "lng": 126.9780
        }
      }')
    echo "$BIOMETRIC_RESPONSE" | jq '.' || echo "$BIOMETRIC_RESPONSE"
    
    # 응급 데이터 테스트 (심박수 낮음)
    echo ""
    echo "4️⃣ 응급 상황 데이터 테스트 (낮은 심박수)..."
    EMERGENCY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mobile/biometric" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $USER_TOKEN" \
      -d '{
        "heartRate": 40,
        "bloodPressureSys": 180,
        "bloodPressureDia": 110,
        "spO2": 89,
        "temperature": 39.0,
        "stress": 85,
        "location": {
          "lat": 37.5665,
          "lng": 126.9780
        }
      }')
    echo "$EMERGENCY_RESPONSE" | jq '.' || echo "$EMERGENCY_RESPONSE"
else
    echo "❌ 사용자 인증 실패"
fi

echo ""
echo "✅ API 테스트 완료!"
