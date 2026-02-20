# 🌐 Golden Time LLM 외부 접속 가이드

## ✅ 현재 상태: Cloudflare Tunnel 활성화됨
모든 시스템이 **Cloudflare Tunnel**을 통해 안전하게 외부에서 접속 가능합니다.
별도의 `ngrok`이나 터널링 프로그램을 실행할 필요가 없습니다. (서버 시작 시 자동으로 연결됨)

## 🚀 접속 주소 (Domain)

| 시스템 | 역할 | 접속 주소 | 로컬 포트 |
| :--- | :--- | :--- | :--- |
| **모바일 앱** | 일반 시민용 신고/제보 | [https://mobile.goldentime.sbs](https://mobile.goldentime.sbs) | :3000 |
| **관리자** | 전체 시스템 관리 (백오피스) | [https://admin.goldentime.sbs](https://admin.goldentime.sbs) | :3001 |
| **응급 관제** | 응급 상황 모니터링 (메인) | [https://control.goldentime.sbs](https://control.goldentime.sbs) | :3002 |
| **범죄 관제** | 범죄 상황 모니터링 | [https://crime.goldentime.sbs](https://crime.goldentime.sbs) | :5000 |

> **참고**: 위 주소는 전 세계 어디서나 접속 가능합니다.

## 🔗 로그인 정보
```
이메일: controller@test.com
비밀번호: test1234
```

## 🆘 문제 해결

### 1. 접속이 안 될 때
터널 프로그램이 실행 중인지 확인하세요.
```bash
pgrep -fl cloudflared
```
만약 아무것도 안 나온다면, 터널을 다시 실행해야 합니다.

### 2. 터널 재실행 방법
```bash
# 새 터미널에서 실행
cloudflared tunnel run --token [토큰]
```
(토큰은 Cloudflare Zero Trust 대시보드에서 확인 가능)

### 3. ngrok은 삭제되었나요?
네, 더 이상 사용하지 않으므로 관련 설정과 파일은 정리되었습니다.
Cloudflare Tunnel이 훨씬 안정적이고 속도가 빠르며, 고정 도메인을 제공합니다.
