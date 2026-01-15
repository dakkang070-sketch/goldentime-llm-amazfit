#!/bin/bash

# 골든타임 LLM 배포 스크립트

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 골든타임 LLM 배포 시작${NC}"
echo ""

# 환경 확인
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env 파일이 없습니다.${NC}"
    echo "   config/env.example을 참고하여 .env 파일을 생성하세요."
    exit 1
fi

# Docker 확인
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker가 설치되어 있지 않습니다.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose가 설치되어 있지 않습니다.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Docker 이미지 빌드 중...${NC}"
docker-compose build

echo -e "${YELLOW}🛑 기존 컨테이너 중지 중...${NC}"
docker-compose down

echo -e "${YELLOW}🚀 컨테이너 시작 중...${NC}"
docker-compose up -d

echo -e "${YELLOW}⏳ 서비스 시작 대기 중...${NC}"
sleep 5

# 헬스체크
echo -e "${YELLOW}🏥 헬스체크 중...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null; then
        echo -e "${GREEN}✅ 백엔드 서버가 정상 작동 중입니다.${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ 백엔드 서버가 시작되지 않았습니다.${NC}"
        docker-compose logs backend
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}✅ 배포 완료!${NC}"
echo ""
echo "서비스 접속:"
echo "  - 백엔드 API: http://localhost:3000"
echo "  - 프론트엔드: http://localhost:5173"
echo "  - API 문서: http://localhost:3000/api-docs"
echo ""
echo "컨테이너 상태 확인:"
echo "  docker-compose ps"
echo ""
echo "로그 확인:"
echo "  docker-compose logs -f"
