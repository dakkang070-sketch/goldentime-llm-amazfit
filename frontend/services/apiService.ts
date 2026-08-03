import { buildApiUrl } from "./runtimeConfig";

/**
 * API 요청 성공 시 실제 payload를 감싸는 공통 응답 구조입니다.
 */
type ApiOk<T> = { success: true; data: T }
/**
 * API 요청 실패 시 오류 문자열만 전달하는 공통 응답 구조입니다.
 */
type ApiFail = { success: false; error: string }

/**
 * 숫자형 필드를 안전하게 읽어 API 응답 정규화에 사용합니다.
 */
const asNumber = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined

/**
 * 문자열 필드를 안전하게 읽어 API 응답 정규화에 사용합니다.
 */
const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

/**
 * 관제 severity 값을 응급 단계(emergencyLevel) 범위로 보정합니다.
 */
const mapSeverityToEmergencyLevel = (severity: unknown) => {
  const n = asNumber(severity) ?? 0
  // 과거 severity 스케일을 1~5 emergencyLevel 범위로 대략 맞춰 화면 분기 로직을 유지합니다.
  const lvl = Math.round(n / 2)
  return Math.min(5, Math.max(1, lvl || 1))
}

/**
 * 관제 프론트에서 쓰는 최소 fetch 래퍼와 응답 정규화를 담당하는 서비스 클래스입니다.
 */
class ApiService {
  /**
   * 관제사이트 공통 조회 요청에 사용할 Authorization 헤더를 구성합니다.
   */
  private getAuthHeaders(): HeadersInit {
    const token =
      typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : ''
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  /**
   * 관제센터 응급 케이스 목록을 받아 프론트에서 바로 쓰는 형태로 정규화합니다.
   */
  async getEmergencyCases(): Promise<ApiOk<{ cases: any[] }> | ApiFail> {
    try {
      const res = await fetch(buildApiUrl('/api/controllers/emergency-cases'), {
        headers: this.getAuthHeaders(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!json?.success || !Array.isArray(json?.cases)) throw new Error('응답 형식 오류')

      // 컨트롤러 응답을 프론트 변환 유틸이 바로 받을 수 있는 케이스 배열로 평탄화합니다.
      const cases = json.cases.map((c: any) => {
        const user = c.userId || {}
        const detectedAt = c.detectedAt || c.createdAt
        // detected/current 좌표를 분리해 두어 관제 화면이 사고 시점과 현재 위치를 둘 다 참조할 수 있게 합니다.
        const locDetected = c.locations?.detectedAt || {}
        const locCurrent = c.locations?.current || {}

        return {
          ...c,
          id: c._id || c.id,
          _id: c._id || c.id,
          // 관제 화면에서는 populate된 user 문서 형태를 그대로 유지해 후속 변환에서 재사용합니다.
          userId: user,
          // 구버전 severity 응답도 emergencyLevel로 흡수해 화면 분기 로직을 단일화합니다.
          emergencyLevel: asNumber(c.emergencyLevel) || mapSeverityToEmergencyLevel(c.severity),
          locations: {
            detectedAt: {
              lat: asNumber(locDetected.lat),
              lng: asNumber(locDetected.lng),
              address: asString(locDetected.address),
            },
            current: {
              lat: asNumber(locCurrent.lat),
              lng: asNumber(locCurrent.lng),
              address: asString(locCurrent.address),
            },
          },
          detectedAt,
          createdAt: c.createdAt,
        }
      })

      return { success: true, data: { cases } }
    } catch (e) {
      // 화면 훅에서는 예외 throw보다 실패 객체가 다루기 쉬워 공통 ApiFail 형태로 되돌립니다.
      // 케이스 목록도 동일 실패 래퍼를 써 호출부가 try/catch 없이 분기만 처리하게 맞춥니다.
      return { success: false, error: e instanceof Error ? e.message : '요청 실패' }
    }
  }

  /**
   * 최근 모니터링 중인 사용자 목록을 지정 시간창 기준으로 조회합니다.
   */
  async getMonitoredUsers(params: { windowMinutes?: number } = {}): Promise<ApiOk<{ users: any[] }> | ApiFail> {
    try {
      const windowMinutes =
        typeof params.windowMinutes === 'number' && Number.isFinite(params.windowMinutes)
          ? params.windowMinutes
          : 10

      // 파라미터가 없으면 최근 10분 창을 기본값으로 써 실제 워치 수집 간격이 조금 느린 경우도 놓치지 않게 합니다.
      // 너무 짧은 창 때문에 실사용자가 목록에서 사라지지 않도록 관제 기본 범위를 조금 넓게 유지합니다.
      const res = await fetch(
        buildApiUrl(`/api/controllers/monitored-users?windowMinutes=${encodeURIComponent(String(windowMinutes))}`),
        {
          headers: this.getAuthHeaders(),
        },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!json?.success || !Array.isArray(json?.users)) throw new Error('응답 형식 오류')

      // monitored-users는 추가 가공 없이 상위 변환 유틸로 넘길 최소 구조만 유지합니다.
      // 세부 착용/위치 보정은 dataTransform 경로가 맡고 이 서비스는 원문 보존에 집중합니다.
      return { success: true, data: { users: json.users } }
    } catch (e) {
      // 모니터링 목록도 동일한 실패 래퍼를 써 호출부가 분기 로직을 재사용할 수 있게 맞춥니다.
      return { success: false, error: e instanceof Error ? e.message : '요청 실패' }
    }
  }

  /**
   * 지정 좌표 주변의 CCTV 후보 목록을 조회합니다.
   */
  async getNearbyCctvCameras(params: {
    lat: number
    lng: number
    radiusMeters?: number
  }): Promise<ApiOk<{ source: string; message?: string; cameras: any[] }> | ApiFail> {
    try {
      const radiusMeters =
        typeof params.radiusMeters === 'number' && Number.isFinite(params.radiusMeters)
          ? params.radiusMeters
          : 800

      const query = new URLSearchParams({
        lat: String(params.lat),
        lng: String(params.lng),
        radiusMeters: String(radiusMeters),
      })

      const res = await fetch(buildApiUrl(`/api/controllers/cctv/nearby?${query.toString()}`), {
        headers: this.getAuthHeaders(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!json?.success || !json?.data || !Array.isArray(json?.data?.cameras)) {
        throw new Error('응답 형식 오류')
      }

      return { success: true, data: json.data }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '요청 실패' }
    }
  }
}

/**
 * 화면 전역에서 재사용하는 API 서비스 싱글톤 인스턴스입니다.
 * 목록 조회는 이 한 인스턴스로만 모아 호출부가 fetch 옵션을 직접 알지 않게 합니다.
 */
export const apiService = new ApiService()
