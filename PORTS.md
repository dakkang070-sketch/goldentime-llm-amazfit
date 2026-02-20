# 프로젝트 포트 구성 정보 (Project Port Configuration)

골든타임 프로젝트는 사용자의 요청에 따라 **응급관제(3000번대)**와 **범죄관제(5000번대)**로 포트 대역을 분리하여 운영합니다.

---

## 🚑 1. 응급관제 시스템 (Emergency Control System) - 3000 Series
응급 상황 모니터링, 환자 이송, 병원 매칭 및 관리자 기능을 포함합니다.
모든 서비스가 **3000번대** 포트를 사용합니다.

| 구분 | 프로젝트명 | 디렉토리 | **포트 (Port)** | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **App** | **Mobile App** | `mobile_em_app` | **3000** | 응급 사용자용 모바일 앱 |
| **Web** | **Backoffice** | `backoffice_admin` | **3001** | 통합 관리자 및 시스템 운영 |
| **Web** | **Emergency Control** | `frontend` | **3002** | 응급상황 관제 대시보드 |
| **Server** | **Backend (Emergency)** | `backend` | **3003** | 응급 시스템 전용 API 서버 |

> **연결 구조**: Mobile App(3000), Backoffice(3001), Emergency Control(3002) ➡️ **Backend(3003)**

---

## 🚓 2. 범죄관제 시스템 (Crime Control System) - 5000 Series
학교 폭력 감지, 범죄 예방 및 모니터링 기능을 포함합니다.
모든 서비스가 **5000번대** 포트를 사용합니다.

| 구분 | 프로젝트명 | 디렉토리 | **포트 (Port)** | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **Web** | **Crime Control** | `frontend_crime` | **5000** | 범죄 예방 관제 대시보드 |
| **Server** | **Backend (Crime)** | `backend_crime` | **5001** | 범죄 시스템 전용 API 서버 |

> **연결 구조**: Crime Control(5000) ➡️ **Backend(5001)**

---

## 🔄 실행 명령어 요약

### 응급관제 실행
```bash
# 터미널 1: 백엔드 (3003)
cd backend && npm start

# 터미널 2: 모바일 앱 (3000)
cd mobile_em_app && npm run dev

# 터미널 3: 관리자 페이지 (3001)
cd backoffice_admin && npm run dev

# 터미널 4: 응급 관제 화면 (3002)
cd frontend && npm run dev
```

### 범죄관제 실행
```bash
# 터미널 1: 백엔드 (5001)
cd backend_crime && npm start

# 터미널 2: 범죄 관제 화면 (5000)
cd frontend_crime && npm run dev
```
