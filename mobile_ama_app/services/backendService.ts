import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

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

interface GuardianLoginResponse {
  success: boolean;
  token?: string;
  data?: {
    token: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
      guardian?: any;
      wearableDevice?: any;
      status?: string;
      accountStatus?: string;
    };
  };
  message?: string;
}

const EMERGENCY_BACKEND_PORT = 4003;
const EMERGENCY_REMOTE_API_BASE = 'https://mobile-ama.goldentime.sbs/api';
const EMERGENCY_NATIVE_CANDIDATES = [
  `http://127.0.0.1:${EMERGENCY_BACKEND_PORT}/api`,
  `http://10.0.2.2:${EMERGENCY_BACKEND_PORT}/api`,
  `http://10.0.3.2:${EMERGENCY_BACKEND_PORT}/api`,
  `http://192.168.45.74:${EMERGENCY_BACKEND_PORT}/api`,
] as const;

const getInitialBaseURL = (): string => {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // ADB Reverse를 사용해 응급 백엔드 4003으로 우선 연결합니다.
    return `http://localhost:${EMERGENCY_BACKEND_PORT}/api`;
  }

  const envBaseUrl = (import.meta as any).env?.VITE_MOBILE_API_BASE_URL as string | undefined;

  if (envBaseUrl && envBaseUrl.length > 0) {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const isLocalHost = host === 'localhost' || host === '127.0.0.1';
      const envIsLocal = /localhost|127\.0\.0\.1/.test(envBaseUrl);

      if (!envIsLocal || isLocalHost) {
        return envBaseUrl;
      }
    } else {
      return envBaseUrl;
    }
  }

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.origin}/api`;
  }

  return '/api';
};

class BackendService {
  private baseURL: string;
  private token: string | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private offlineQueue: Array<{ endpoint: string; options: RequestInit; timestamp: number }> = [];
  private queueStorageKey: string = 'mobile_offline_queue';
  private loginCacheKey: string = 'mobile_last_login';
  private baseUrlStorageKey: string = 'mobile_base_url';

    /**
   * constructor 관련 처리를 수행합니다.
   */
constructor() {
    this.baseURL = getInitialBaseURL();

    const isNative = Capacitor.isNativePlatform();
    console.log('Backend Service Initialized:', {
      isNative,
      baseURL: this.baseURL
    });
    
    // 비동기 초기화 작업 안전하게 실행
    this.initAsync();
  }

    /**
   * initAsync 관련 처리를 수행합니다.
   */
private async initAsync() {
    try {
      this.loadQueueFromStorage();
      this.startNetworkMonitor();
      
      // 베이스 URL 자동 감지 시도 (Native only)
      if (Capacitor.isNativePlatform()) {
        const candidates = [...EMERGENCY_NATIVE_CANDIDATES];

        console.log('Detecting backend server...');
        for (const url of candidates) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2초 타임아웃
            
            const res = await fetch(`${url.replace('/api', '')}/health`, { 
              method: 'GET',
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              console.log(`Backend found at: ${url}`);
              this.baseURL = url;
              this.baseUrlStorageKey && localStorage.setItem(this.baseUrlStorageKey, url);
              break;
            }
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (e) {
      console.warn('Backend Service Init Warning:', e);
    }
  }

  /**
   * 백엔드 URL 설정
   */
  setBaseURL(url: string) {
    this.baseURL = url;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.baseUrlStorageKey, url);
      }
    } catch {}
  }

  /**
   * 인증 토큰 설정
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * 현재 세션 토큰만 제거하고 캐시된 회원 로그인 정보는 유지합니다.
   */
  clearToken() {
    this.token = null;
    this.isConnected = false;
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
    
    console.log(`[API Request] ${options.method || 'GET'} ${url}`);

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

      console.log(`[API Response] ${url} - Status: ${response.status}`);

      let result: any = { success: false };
      try {
        const text = await response.text();
        console.log(`[API Body] ${text.substring(0, 200)}...`); // Log first 200 chars
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
      
      // 오프라인 큐에 저장 대상
      const shouldQueue = endpoint === '/mobile/biometric' || endpoint === '/mobile/emergency';
      if (shouldQueue) {
        this.enqueueOffline(endpoint, {
          ...options,
          headers,
        });
      }
      
      return {
        success: false,
        message: shouldQueue ? '오프라인 상태로 데이터를 저장했습니다.' : (error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.'),
        error: error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.'
      };
    }
  }

  private async fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs: number = 1500): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  }

  private async detectBaseURL(): Promise<void> {
    const isNative = Capacitor.isNativePlatform();
    
    // 네이티브 환경에서는 복잡한 감지 로직 대신 설정된 초기값(PC IP)을 그대로 사용
    // (불필요한 네트워크 요청으로 인한 지연 및 오류 방지)
    if (isNative) {
      console.log('Native environment detected, using initial Base URL:', this.baseURL);
      this.isConnected = true;
      return;
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.baseUrlStorageKey);
        if (saved) {
          this.baseURL = saved;
          return;
        }
      }
    } catch {}

    // const isNative = Capacitor.isNativePlatform(); (위에서 이미 선언됨)
    const envBaseUrl = (import.meta as any).env?.VITE_MOBILE_API_BASE_URL as string | undefined;
    const candidates: string[] = [];
    if (envBaseUrl) candidates.push(envBaseUrl);
    if (isNative) {
      candidates.push(...EMERGENCY_NATIVE_CANDIDATES);
      candidates.push(`http://localhost:${EMERGENCY_BACKEND_PORT}/api`);
    } else if (typeof window !== 'undefined') {
      candidates.push(`${window.location.origin}/api`);
    }
    candidates.push(EMERGENCY_REMOTE_API_BASE);

    for (const base of candidates) {
      const root = base.replace(/\/api$/, '');
      const probes = [`${base}/health`, `${root}/health`, `${root}/`];
      for (const url of probes) {
        try {
          const res = await this.fetchWithTimeout(url, {}, 1200);
          if (res.ok) {
            this.setBaseURL(base);
            this.isConnected = true;
            return;
          }
        } catch {}
      }
    }
  }

    /**
   * loadQueueFromStorage 관련 처리를 수행합니다.
   */
private loadQueueFromStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(this.queueStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.offlineQueue = parsed;
        }
      }
    } catch {}
  }

    /**
   * saveQueueToStorage 관련 처리를 수행합니다.
   */
private saveQueueToStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this.queueStorageKey, JSON.stringify(this.offlineQueue));
    } catch {}
  }

    /**
   * enqueueOffline 관련 처리를 수행합니다.
   */
private enqueueOffline(endpoint: string, options: RequestInit) {
    const item = { endpoint, options, timestamp: Date.now() };
    this.offlineQueue.push(item);
    // 최대 큐 길이 제한
    if (this.offlineQueue.length > 500) {
      this.offlineQueue = this.offlineQueue.slice(-500);
    }
    this.saveQueueToStorage();
  }

  async flushOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;
    // 연결 확인
    const ok = await this.testConnection();
    if (!ok) return;
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveQueueToStorage();
    for (const item of queue) {
      try {
        await this.request(item.endpoint, item.options);
        await new Promise(r => setTimeout(r, 100));
      } catch {
        // 실패 시 다시 큐에 적재
        this.enqueueOffline(item.endpoint, item.options);
      }
    }
    this.saveQueueToStorage();
  }

    /**
   * startNetworkMonitor 관련 처리를 수행합니다.
   */
private startNetworkMonitor() {
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          this.flushOfflineQueue();
        });
      }
    } catch {}
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
  async login(email: string, password: string, shouldCache: boolean = true): Promise<LoginResponse> {
    const response = await this.request('/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      this.isConnected = true;
      
      if (shouldCache) {
        try {
          if (Capacitor.isNativePlatform()) {
            // 비동기 작업이 완료될 때까지 기다리지 않고 백그라운드에서 실행
            // 로그인 응답 속도 향상 및 UI 블로킹 방지
            this.setCachedLoginAsync(email, response.data.token, response.data.user).catch(e => {
               console.warn('Failed to cache login', e);
            });
          } else if (typeof localStorage !== 'undefined') {
            // ... (기존 로컬스토리지 로직 유지)
            let user = response.data.user;
            try {
              const raw = localStorage.getItem(this.loginCacheKey);
              if (raw) {
                const cached = JSON.parse(raw);
                if (cached && cached.user && cached.user.starmaxDevice && !user.starmaxDevice) {
                  user = { ...user, starmaxDevice: cached.user.starmaxDevice };
                }
              }
            } catch {}
            localStorage.setItem(this.loginCacheKey, JSON.stringify({
              email,
              token: response.data.token,
              user,
              timestamp: Date.now()
            }));
          }
        } catch {}
      }
      return response as LoginResponse;
    }
    return response as LoginResponse;
  }

  /**
   * 보호자 읽기 전용 로그인
   */
  async guardianLogin(email: string, guardianPhone: string): Promise<GuardianLoginResponse> {
    const response = await this.request('/mobile/guardian/login', {
      method: 'POST',
      body: JSON.stringify({ email, guardianPhone })
    });

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      this.isConnected = true;
    }

    return response as GuardianLoginResponse;
  }

  getCachedLogin(): { email: string; token: string; user: any } | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(this.loginCacheKey);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || !cached.token || !cached.user) return null;
      this.token = cached.token;
      this.isConnected = true;
      return cached;
    } catch {
      return null;
    }
  }

  async getCachedLoginAsync(): Promise<{ email: string; token: string; user: any } | null> {
    if (!Capacitor.isNativePlatform()) return this.getCachedLogin();
    try {
      // Preferences 초기화 전 호출 방지 및 에러 핸들링 강화
      const stored = await Preferences.get({ key: this.loginCacheKey }).catch(() => ({ value: null }));
      if (!stored || !stored.value) return null;
      
      const cached = JSON.parse(stored.value);
      if (!cached || !cached.token || !cached.user) return null;
      
      this.token = cached.token;
      this.isConnected = true;
      return cached;
    } catch (e) {
      console.warn('Login cache read failed, clearing cache:', e);
      // 캐시가 깨졌을 경우 안전하게 삭제 시도
      try { await Preferences.remove({ key: this.loginCacheKey }); } catch {}
      return null;
    }
  }

    /**
   * setCachedLoginAsync 관련 처리를 수행합니다.
   */
private async setCachedLoginAsync(email: string, token: string, user: any) {
    try {
      let mergedUser = user;
      const stored = await Preferences.get({ key: this.loginCacheKey });
      if (stored.value) {
        const cached = JSON.parse(stored.value);
        if (cached && cached.user && cached.user.starmaxDevice && !mergedUser.starmaxDevice) {
          mergedUser = { ...mergedUser, starmaxDevice: cached.user.starmaxDevice };
        }
      }
      await Preferences.set({
        key: this.loginCacheKey,
        value: JSON.stringify({ email, token, user: mergedUser, timestamp: Date.now() })
      });
    } catch {
    }
  }

  updateCachedStarmaxDevice(deviceData: {
    deviceId: string;
    deviceName: string;
    deviceType: 'watch' | 'band';
    firmwareVersion?: string;
  }) {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(this.loginCacheKey);
      if (!raw) return;
      const cached = JSON.parse(raw);
      if (!cached || !cached.user) return;
      cached.user.starmaxDevice = {
        deviceId: deviceData.deviceId,
        deviceName: deviceData.deviceName,
        deviceType: deviceData.deviceType,
        firmwareVersion: deviceData.firmwareVersion || '1.0.0'
      };
      localStorage.setItem(this.loginCacheKey, JSON.stringify(cached));
    } catch {
    }
  }

  async updateCachedStarmaxDeviceAsync(deviceData: {
    deviceId: string;
    deviceName: string;
    deviceType: 'watch' | 'band';
    firmwareVersion?: string;
  }) {
    if (!Capacitor.isNativePlatform()) {
      this.updateCachedStarmaxDevice(deviceData);
      return;
    }
    try {
      const stored = await Preferences.get({ key: this.loginCacheKey });
      if (!stored.value) return;
      const cached = JSON.parse(stored.value);
      if (!cached || !cached.user) return;
      cached.user.starmaxDevice = {
        deviceId: deviceData.deviceId,
        deviceName: deviceData.deviceName,
        deviceType: deviceData.deviceType,
        firmwareVersion: deviceData.firmwareVersion || '1.0.0'
      };
      await Preferences.set({ key: this.loginCacheKey, value: JSON.stringify(cached) });
    } catch {
    }
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
    // 1. 서버 요청 (실패하더라도 로컬 삭제는 진행해야 함)
    let response: BackendResponse = { success: false, message: 'Network error' };
    try {
      response = await this.request('/mobile/starmax/disconnect', {
        method: 'POST'
      });
    } catch (e) {
      console.warn('Server disconnect failed, proceeding to local cleanup', e);
    }

    // 2. 로컬 캐시의 사용자 정보에서 기기 정보 무조건 제거
    try {
      if (Capacitor.isNativePlatform()) {
        const stored = await Preferences.get({ key: this.loginCacheKey });
        if (stored.value) {
          const cached = JSON.parse(stored.value);
          if (cached && cached.user) {
            delete cached.user.starmaxDevice; // undefined 할당 대신 delete 사용
            await Preferences.set({
              key: this.loginCacheKey,
              value: JSON.stringify(cached),
            });
          }
        }
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.loginCacheKey);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached && cached.user) {
            delete cached.user.starmaxDevice;
            localStorage.setItem(this.loginCacheKey, JSON.stringify(cached));
          }
        }
      }
    } catch (e) {
      console.error('Local cache cleanup failed', e);
    }
    
    return response;
  }

  /**
   * 로그아웃
   */
  logout() {
    this.token = null;
    this.isConnected = false;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.loginCacheKey);
        localStorage.removeItem(this.baseUrlStorageKey);
      }
    } catch {}
    if (Capacitor.isNativePlatform()) {
      Preferences.remove({ key: this.loginCacheKey }).catch(() => {});
    }
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
    bloodSugar?: number;
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
   * 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      const root = this.baseURL.replace(/\/api$/, '');
      const res = await this.fetchWithTimeout(`${root}/health`, {}, 1200);
      this.isConnected = res.ok;
      return res.ok;
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
