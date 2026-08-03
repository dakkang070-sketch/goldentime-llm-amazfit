export interface BackendResponse {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * 현재 실행 환경에 맞는 보호자앱 백엔드 주소를 결정합니다.
 */
export function resolveGuardianBackendBase() {
  try {
    const { hostname, origin, protocol } = window.location;
    if (hostname === 'appassets.androidplatform.net') {
      return 'https://app.goldentime.sbs/api';
    }
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0'
    ) {
      return 'http://localhost:4003/api';
    }
    if ((protocol === 'http:' || protocol === 'https:') && origin) {
      return `${origin}/api`;
    }
  } catch {}
  return 'https://app.goldentime.sbs/api';
}

/**
 * 보호자 모바일의 백엔드 통신과 인증 토큰 관리를 담당합니다.
 */
class GuardianBackendService {
  private token: string | null = null;

  /**
   * 공통 HTTP 요청을 수행하고 JSON 응답을 반환합니다.
   */
  private async request(endpoint: string, options: RequestInit = {}): Promise<BackendResponse> {
    const baseURL = resolveGuardianBackendBase();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    let payload: BackendResponse;
    try {
      payload = await response.json();
    } catch (error) {
      payload = {
        success: false,
        message: error instanceof Error ? error.message : '응답을 읽을 수 없습니다.',
      };
    }

    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }

    return payload;
  }

  /**
   * 보호자 전용 읽기 전용 로그인을 수행하고 토큰을 저장합니다.
   */
  async guardianLogin(email: string, guardianPhone: string, accessCode: string): Promise<BackendResponse> {
    const response = await this.request('/mobile/guardian/login', {
      method: 'POST',
      body: JSON.stringify({ email, guardianPhone, accessCode }),
    });

    const token = response.data?.token;
    if (response.success && typeof token === 'string') {
      this.token = token;
    }

    return response;
  }

  /**
   * 보호자 인증코드 기준으로 회원가입을 수행하고 토큰을 저장합니다.
   */
  async guardianSignup(
    accessCode: string,
    guardianEmail: string,
    password: string,
  ): Promise<BackendResponse> {
    const response = await this.request('/mobile/guardian/signup', {
      method: 'POST',
      body: JSON.stringify({ accessCode, guardianEmail, password }),
    });

    const token = response.data?.token;
    if (response.success && typeof token === 'string') {
      this.token = token;
    }

    return response;
  }

  /**
   * 보호자 이메일/비밀번호로 로그인하고 토큰을 저장합니다.
   */
  async guardianAccountLogin(guardianEmail: string, password: string): Promise<BackendResponse> {
    const response = await this.request('/mobile/guardian/account-login', {
      method: 'POST',
      body: JSON.stringify({ guardianEmail, password }),
    });

    const token = response.data?.token;
    if (response.success && typeof token === 'string') {
      this.token = token;
    }

    return response;
  }

  /**
   * 보호자 정보 수정에 사용할 새 휴대폰 번호로 인증번호를 발송합니다.
   */
  async requestGuardianProfilePhoneVerification(phone: string): Promise<BackendResponse> {
    return this.request('/mobile/guardian/profile/phone-verification/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  /**
   * 보호자 정보 수정 휴대폰 인증번호를 확인하고 검증 토큰을 반환받습니다.
   */
  async verifyGuardianProfilePhoneVerification(phone: string, code: string): Promise<BackendResponse> {
    return this.request('/mobile/guardian/profile/phone-verification/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }

  /**
   * 보호자 계정이 자신의 보호자 정보를 수정합니다.
   */
  async updateGuardianProfile(payload: {
    name: string;
    relationship: string;
    phone: string;
    phoneVerificationToken?: string;
  }): Promise<BackendResponse> {
    return this.request('/mobile/guardian/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * 현재 로그인 토큰을 직접 주입합니다.
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * 현재 로그인 토큰을 제거합니다.
   */
  clearToken() {
    this.token = null;
  }

  /**
   * 연결된 회원의 기본 프로필을 조회합니다.
   */
  async getProfile(): Promise<BackendResponse> {
    return this.request('/mobile/profile');
  }

  /**
   * 연결된 회원의 최근 생체 데이터 목록을 조회합니다.
   */
  async getRecentBiometricData(limit: number = 24, hours: number = 24): Promise<BackendResponse> {
    const params = new URLSearchParams({
      limit: String(limit),
      hours: String(hours),
    });
    return this.request(`/mobile/biometric/recent?${params.toString()}`);
  }

  /**
   * 연결된 회원의 응급 이력을 조회합니다.
   */
  async getEmergencyHistory(limit: number = 20): Promise<BackendResponse> {
    const params = new URLSearchParams({
      limit: String(limit),
    });
    return this.request(`/mobile/emergency/history?${params.toString()}`);
  }

  /**
   * 관제에서 현재 가장 최근에 연결된 워치 1건을 공통 실시간 소스로 조회합니다.
   */
  async getCurrentWatch(windowMinutes: number = 10): Promise<BackendResponse> {
    const params = new URLSearchParams({
      windowMinutes: String(windowMinutes),
    });
    return this.request(`/controllers/current-watch?${params.toString()}`);
  }
}

export const backendService = new GuardianBackendService();
