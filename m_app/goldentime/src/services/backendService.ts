// 회원 모바일 앱 백엔드 통신 서비스

export interface BackendResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface LoginResponse extends BackendResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    dob?: string;
    age?: number;
    gender?: string;
    bloodType?: string;
    height?: number;
    weight?: number;
    status?: string;
    wearableDevice?: any;
    medicalHistory?: any;
    guardian?: {
      name?: string;
      phone?: string;
      relationship?: string;
    };
  };
}

// 백엔드 기본 URL 결정
function getBaseURL(): string {
  if (typeof window === 'undefined') return '/api';
  const { hostname } = window.location;
  if (hostname === 'appassets.androidplatform.net') {
    return 'https://mobile-ama.goldentime.sbs/api';
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4003/api';
  }
  return `${window.location.origin}/api`;
}

class MemberBackendService {
  private token: string | null = null;
  private baseURL: string;
  private loginCacheKey = 'member_last_login';

  /**
   * 생성자 - 백엔드 URL 초기화
   */
  constructor() {
    this.baseURL = getBaseURL();
  }

  /**
   * 공통 HTTP 요청 처리
   */
  private async request(endpoint: string, options: RequestInit = {}): Promise<BackendResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, { ...options, headers });
    let payload: BackendResponse;
    try {
      payload = await response.json();
    } catch {
      payload = { success: false, message: '응답을 읽을 수 없습니다.' };
    }
    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }
    return payload;
  }

  /**
   * 로그인 - 자동 로그인 캐싱 포함
   */
  async login(email: string, password: string, shouldCache: boolean = true): Promise<LoginResponse> {
    const response = await this.request('/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      if (shouldCache && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(this.loginCacheKey, JSON.stringify({
            email,
            token: response.data.token,
            user: response.data.user,
            timestamp: Date.now(),
          }));
        } catch {}
      }
    }
    return response as LoginResponse;
  }

  /**
   * 캐시된 로그인 정보 가져오기
   */
  getCachedLogin(): { email: string; token: string; user: any } | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(this.loginCacheKey);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || !cached.token || !cached.user) return null;
      this.token = cached.token;
      return cached;
    } catch {
      return null;
    }
  }

  /**
   * 로그인 캐시 삭제
   */
  clearCachedLogin() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.loginCacheKey);
      }
      this.token = null;
    } catch {}
  }

  /**
   * 회원가입
   */
  async signup(userData: any): Promise<BackendResponse> {
    return this.request('/mobile/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * 프로필 조회
   */
  async getProfile(): Promise<BackendResponse> {
    return this.request('/mobile/profile');
  }

  /**
   * 프로필 수정
   */
  async updateProfile(profileData: any): Promise<BackendResponse> {
    return this.request('/mobile/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  /**
   * 비밀번호 재설정 - 인증코드 발송
   */
  async sendResetCode(email: string, phone: string): Promise<BackendResponse> {
    return this.request('/mobile/reset-password/send-code', {
      method: 'POST',
      body: JSON.stringify({ email, phone }),
    });
  }

  /**
   * 비밀번호 재설정 - 코드 확인 후 변경
   */
  async resetPassword(email: string, phone: string, code: string, newPassword: string): Promise<BackendResponse> {
    return this.request('/mobile/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, phone, code, newPassword }),
    });
  }

  /**
   * 회원 탈퇴
   */
  async deleteAccount(): Promise<BackendResponse> {
    return this.request('/mobile/account', {
      method: 'DELETE',
    });
  }

  /**
   * 로그아웃
   */
  logout() {
    this.clearCachedLogin();
  }
}

export const memberBackendService = new MemberBackendService();
