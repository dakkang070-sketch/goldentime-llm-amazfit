import { Capacitor } from '@capacitor/core';

/**
 * 응급 사용자앱 백엔드 연동 서비스
 * STARMAX BLE 데이터를 백엔드 API로 전송
 */

interface BackendResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    starmaxDevice?: any;
    emergencySettings?: any;
  };
}

class BackendService {
  private baseURL: string;
  private token: string | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor() {
    // 개발 환경에서는 Vite Proxy 사용 (/api), 프로덕션/네이티브는 도메인 사용
    // Vite proxy를 통해 요청 (상대 경로 사용)
    this.baseURL = '/api';
    
    // 로컬 환경일 경우 (모바일 네이티브 앱 등에서만 절대 경로 필요)
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // 실제 기기 또는 에뮬레이터에서 외부 도메인 사용
      this.baseURL = 'https://mobile.goldentime.sbs/api';
    } else {
      // 웹 브라우저 접속 시 현재 호스트를 기준으로 설정 (터널링 대응)
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        this.baseURL = `${window.location.origin}/api`;
      }
    }

    console.log('Backend Service Initialized:', { 
      isNative, 
      baseURL: this.baseURL
    });
  }

  /**
   * 백엔드 URL 설정
   */
  setBaseURL(url: string) {
    this.baseURL = url;
  }

  /**
   * 인증 토큰 설정
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * 인증 토큰 가져오기
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 연결 상태 확인
   */
  isBackendConnected(): boolean {
    return this.isConnected;
  }

  /**
   * API 요청 (Public Wrapper)
   */
  public async apiRequest(endpoint: string, options: RequestInit = {}): Promise<BackendResponse> {
    return this.request(endpoint, options);
  }

  /**
   * API 요청 (Internal)
   */
  private async request(endpoint: string, options: RequestInit = {}): Promise<BackendResponse> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      let result: any = { success: false };
      try {
        const text = await response.text();
        result = text ? JSON.parse(text) : { success: response.ok };
      } catch (e) {
        // JSON 파싱 실패 시
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        // OK인데 JSON이 아님
        result = { success: true };
      }

      if (!response.ok) {
        if (response.status === 401) {
          // 인증 실패 - 토큰 제거
          this.token = null;
          throw new Error(result?.message || '인증이 만료되었습니다. 다시 로그인해주세요.');
        }
        throw new Error(result?.message || result?.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // 결과에 success가 없으면 response.ok를 기준으로 설정
      if (result && typeof result === 'object' && result.success === undefined) {
        result.success = response.ok;
      }
      
      return result;
    } catch (error) {
      this.isConnected = false;
      console.error(`API 요청 실패: ${endpoint}`, error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 회원가입
   */
  async signup(userData: any): Promise<BackendResponse> {
    return this.request('/mobile/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  /**
   * 로그인
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request('/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      this.isConnected = true;
    }

    return response as LoginResponse;
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
      body: JSON.stringify(profileData)
    });
  }

  /**
   * STARMAX 기기 연결
   */
  async connectStarmaxDevice(deviceData: {
    deviceId: string;
    deviceName: string;
    deviceType: 'watch' | 'band';
    firmwareVersion?: string;
  }): Promise<BackendResponse> {
    return this.request('/mobile/starmax/connect', {
      method: 'POST',
      body: JSON.stringify(deviceData)
    });
  }

  /**
   * STARMAX 기기 연결 해제
   */
  async disconnectStarmaxDevice(): Promise<BackendResponse> {
    return this.request('/mobile/starmax/disconnect', {
      method: 'POST'
    });
  }

  /**
   * 실시간 생체 데이터 전송
   */
  async sendBiometricData(data: {
    heartRate: number;
    bloodPressureSys: number;
    bloodPressureDia: number;
    spO2: number;
    temperature: number;
    steps?: number;
    sleep?: number;
    stress?: number;
    respiratoryRate?: number;
    hrv?: number;
    location?: {
      lat: number;
      lng: number;
    };
    timestamp?: string;
  }): Promise<BackendResponse> {
    return this.request('/mobile/biometric', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * 응급 상황 수동 신고
   */
  async reportEmergency(emergencyData: {
    emergencyLevel?: number;
    description?: string;
    location?: {
      lat: number;
      lng: number;
    };
  }): Promise<BackendResponse> {
    return this.request('/mobile/emergency', {
      method: 'POST',
      body: JSON.stringify(emergencyData)
    });
  }

  /**
   * 응급 상황 이력 조회
   */
  async getEmergencyHistory(limit: number = 20, status?: string): Promise<BackendResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (status) params.append('status', status);
    
    return this.request(`/mobile/emergency/history?${params.toString()}`);
  }

  /**
   * 최근 생체 데이터 조회
   */
  async getRecentBiometricData(limit: number = 50, hours: number = 24): Promise<BackendResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (hours) params.append('hours', hours.toString());
    
    return this.request(`/mobile/biometric/recent?${params.toString()}`);
  }

  /**
   * 로그아웃
   */
  logout() {
    this.token = null;
    this.isConnected = false;
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.request('/health');
      this.isConnected = response.success;
      return response.success;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 자동 재연결
   */
  async autoReconnect(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('최대 재연결 시도 횟수 초과');
      return false;
    }

    this.reconnectAttempts++;
    console.log(`재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    const connected = await this.testConnection();
    if (connected) {
      console.log('백엔드 연결 복구됨');
      this.reconnectAttempts = 0;
      return true;
    }

    // 지수 백오프
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    console.log(`${delay}ms 후 재시도...`);
    
    return new Promise((resolve) => {
      setTimeout(async () => {
        resolve(await this.autoReconnect());
      }, delay);
    });
  }

  /**
   * 배치 데이터 전송 (오프라인 대응)
   */
  async sendBatchData(dataArray: any[]): Promise<BackendResponse> {
    const results: BackendResponse[] = [];
    
    for (const data of dataArray) {
      const result = await this.sendBiometricData(data);
      results.push(result);
      
      // 너무 빠른 전송 방지
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      success: failureCount === 0,
      message: `배치 전송 완료: 성공 ${successCount}, 실패 ${failureCount}`,
      data: {
        total: dataArray.length,
        success: successCount,
        failure: failureCount,
        results
      }
    };
  }
}

// 싱글톤 인스턴스
export const backendService = new BackendService();
export default backendService;