# 🌐 Golden Time LLM 외부 접속 가이드

## ✅ 현재 상태
- 백엔드 서버: http://localhost:3000 (✅ 정상 실행 중)
- 프론트엔드: http://localhost:3001 (✅ 정상 실행 중)

## 🚀 즉시 실행 - 3가지 방법

### 방법 1: ngrok (가장 안정적) ⭐
```bash
# 1단계: 설치
brew install ngrok

# 2단계: 회원가입 및 토큰 설정
# https://dashboard.ngrok.com/signup
ngrok config add-authtoken YOUR_TOKEN_HERE

# 3단계: 터널 생성 (새 터미널에서)
ngrok http 3001
```
**결과**: `https://abc123.ngrok.io` 같은 공개 URL 생성

### 방법 2: Cloudflare Tunnel (무료, 빠름) ⚡
```bash
# 1단계: 설치
brew install cloudflared

# 2단계: 즉시 터널 생성
cloudflared tunnel --url http://localhost:3001
```
**결과**: `https://xyz.trycloudflare.com` 같은 즉시 사용 가능한 URL

### 방법 3: localtunnel (npm 권한 수정 필요) 🛠️
```bash
# 1단계: npm 권한 수정
sudo chown -R $(whoami) ~/.npm

# 2단계: 설치
npm install -g localtunnel

# 3단계: 터널 생성
lt --port 3001
```

## 🎯 추천 실행 순서

1. **가장 빠름**: Cloudflare (방법 2)
2. **가장 안정적**: ngrok (방법 1)
3. **백업**: localtunnel (방법 3)

## 📱 모바일/태블릿에서 접속

생성된 공개 URL로 어디서든 접속 가능:
- 스마트폰 브라우저
- 태블릿
- 다른 컴퓨터
- 전세계 어디서든

## 🔗 로그인 정보
```
이메일: controller@test.com
비밀번호: test1234
```

## 🆘 문제 해결

**터널이 끊어지면**: 터미널에서 Ctrl+C로 중지 후 다시 실행
**접속이 안되면**: 서버 재시작 → `./start-external.sh`