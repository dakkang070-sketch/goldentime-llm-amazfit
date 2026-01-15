# 골든타임 LLM 백엔드 Dockerfile

FROM node:18-alpine

WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 애플리케이션 코드 복사
COPY backend/ ./backend/
COPY config/ ./config/

# 로그 디렉토리 생성
RUN mkdir -p logs

# 포트 노출
EXPOSE 3000

# 환경변수
ENV NODE_ENV=production
ENV PORT=3000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 서버 실행
CMD ["node", "backend/server.js"]
