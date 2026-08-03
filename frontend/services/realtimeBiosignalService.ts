/**
 * 실시간 생체신호 분석 엔진 프론트엔드 서비스
 */

import { API_BASE_URL, buildApiUrl } from './runtimeConfig';

/**
 * 실시간 스트림 시작 시 필요한 사용자/디바이스/센서 구성입니다.
 */
export interface BiosignalStreamConfig {
  userId: string;
  deviceId: string;
  signalTypes: ('ecg' | 'ppg' | 'accelerometer' | 'temperature' | 'spo2')[];
}

/**
 * 실시간 카드에 표시할 최신 생체값과 품질 정보를 담습니다.
 */
export interface RealtimeVitals {
  timestamp: number;
  heartRate: number | null;
  spo2: number | null;
  bloodPressure: { systolic: number; diastolic: number } | null;
  temperature: number | null;
  activity: string;
  hrv: number | null;
  status: 'normal' | 'caution' | 'warning' | 'emergency' | 'critical';
  quality: {
    overall: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
    scores: Record<string, number>;
    issues: string[];
  };
  alerts: EmergencyAlert[] | null;
}

/**
 * 실시간 엔진이 감지한 개별 경보 이벤트 구조입니다.
 */
export interface EmergencyAlert {
  type: string;
  value: any;
  severity: number;
  message: string;
  timestamp: number;
  confidence?: number;
}

/**
 * 실시간 분석 엔진의 가동 상태와 성능 메트릭 요약입니다.
 */
export interface EngineStatus {
  engineStatus: 'active' | 'idle';
  activeStreams: number;
  performance: {
    samplesPerSecond: number;
    averageLatency: number;
    emergencyDetectionRate: number;
    uptime: number;
  };
  resources: {
    memoryUsage: {
      buffers: number;
      windows: number;
    };
    totalStreamsStarted: number;
  };
  lastUpdated: string;
}

/**
 * 현재 구독 중인 사용자별 스트림 요약 정보입니다.
 */
export interface ActiveStream {
  userId: string;
  deviceId: string;
  signalTypes: string[];
  startTime: string;
  status: 'active' | 'stopped';
}

/**
 * 기간별 응급 감지 이력과 집계 통계를 함께 반환합니다.
 */
export interface EmergencyHistory {
  period: string;
  stats: {
    totalEmergencies: number;
    resolvedCount: number;
    severityDistribution: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    averageResponseTime: string;
  };
  emergencies: Array<{
    id: string;
    userId: string;
    detectedAt: string;
    severity: number;
    alertType: string;
    description: string;
    resolved: boolean;
    responseTime: string;
  }>;
}

/**
 * 센서 품질과 시스템 전체 품질 분포를 표현하는 구조입니다.
 */
export interface SignalQuality {
  userId?: string;
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  signals?: {
    ecg?: { quality: string; score: number; issues: string[] };
    ppg?: { quality: string; score: number; issues: string[] };
    accelerometer?: { quality: string; score: number; issues: string[] };
  };
  batteryLevel?: number;
  connectionStrength?: number;
  lastUpdated: string;
  
  // 전체 시스템 품질 요약
  totalActiveStreams?: number;
  qualityDistribution?: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  commonIssues?: Array<{ issue: string; frequency: number }>;
}

/**
 * 샘플링, 윈도우, 임계치, 품질 기준을 포함한 엔진 설정 구조입니다.
 */
export interface EngineConfig {
  samplingRates: {
    ecg: number;
    ppg: number;
    accelerometer: number;
    temperature: number;
    spo2: number;
  };
  windowSizes: {
    heartRate: number;
    hrv: number;
    arrhythmia: number;
    activity: number;
    fall: number;
  };
  emergencyThresholds: {
    heartRate: { min: number; max: number; criticalMin: number; criticalMax: number };
    spo2: { min: number; critical: number };
    temperature: { min: number; max: number; critical: number };
    movement: { fallThreshold: number; inactivityMinutes: number };
    hrv: { lowThreshold: number; criticalThreshold: number };
  };
  qualityThresholds: {
    snr: number;
    artifactRatio: number;
    continuity: number;
  };
}

/**
 * 실시간 생체신호 엔진 API 호출과 화면용 표시 유틸을 묶는 프론트 서비스 클래스입니다.
 */
class RealtimeBiosignalService {

  /**
   * 사용자와 디바이스 기준으로 실시간 생체신호 모니터링을 시작합니다.
   */
  async startMonitoring(config: BiosignalStreamConfig): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime-biosignal/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        // 시작 요청은 user/device/signalTypes를 그대로 넘겨 엔진 쪽 스트림 구성을 프런트에서 재해석하지 않게 합니다.
        body: JSON.stringify(config)
      });

      return await response.json();
    } catch (error) {
      console.error('실시간 모니터링 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 특정 사용자 스트림의 실시간 생체신호 모니터링을 중단합니다.
   */
  async stopMonitoring(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime-biosignal/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({ userId })
      });

      return await response.json();
    } catch (error) {
      console.error('실시간 모니터링 중단 실패:', error);
      throw error;
    }
  }

  /**
   * 실시간 분석 엔진의 현재 상태와 성능 지표를 조회합니다.
   */
  async getEngineStatus(): Promise<EngineStatus | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime-biosignal/status`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('엔진 상태 조회 실패:', error);
      return null;
    }
  }

  /**
   * 현재 활성화된 생체신호 스트림 목록을 조회합니다.
   */
  async getActiveStreams(): Promise<{ totalActiveStreams: number; streams: ActiveStream[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime-biosignal/active-streams`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      // 활성 스트림 패널은 배열과 총건수를 항상 기대하므로 실패 시 빈 구조를 유지합니다.
      return result.success ? result.data : { totalActiveStreams: 0, streams: [] };
    } catch (error) {
      console.error('활성 스트림 조회 실패:', error);
      return { totalActiveStreams: 0, streams: [] };
    }
  }

  /**
   * 기간별 응급상황 감지 이력과 통계를 조회합니다.
   */
  async getEmergencyHistory(period: '1h' | '6h' | '24h' | '7d' = '24h', userId?: string): Promise<EmergencyHistory | null> {
    try {
      // 기간은 필수, 사용자 ID는 선택으로 붙여 전체 통계와 사용자 상세 조회를 같은 API로 처리합니다.
      const params = new URLSearchParams({ period });
      if (userId) params.append('userId', userId);

      const response = await fetch(`${API_BASE_URL}/realtime-biosignal/emergency-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('응급상황 기록 조회 실패:', error);
      return null;
    }
  }

  /**
   * 사용자별 또는 전체 신호 품질 상태를 조회합니다.
   */
  async getSignalQuality(userId?: string): Promise<SignalQuality | null> {
    try {
      // userId가 있으면 특정 사용자 품질, 없으면 전체 품질 요약을 같은 엔드포인트로 조회합니다.
      const params = userId ? `?userId=${userId}` : '';
      const response = await fetch(`${API_BASE_URL}/realtime-biosignal/signal-quality${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('신호 품질 조회 실패:', error);
      return null;
    }
  }

  /**
   * 실시간 분석 엔진의 현재 설정값을 조회합니다.
   */
  async getEngineConfig(): Promise<EngineConfig | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime-biosignal/config`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('엔진 설정 조회 실패:', error);
      return null;
    }
  }

  /**
   * 응급 임계치와 품질 임계치를 부분 업데이트합니다.
   */
  async updateEngineConfig(updates: Partial<Pick<EngineConfig, 'emergencyThresholds' | 'qualityThresholds'>>): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime-biosignal/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        // 설정 화면은 전체 config를 다시 보내지 않고 임계치 섹션만 부분 업데이트합니다.
        body: JSON.stringify(updates)
      });

      return await response.json();
    } catch (error) {
      console.error('엔진 설정 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 테스트용 응급 알림을 강제로 발생시킵니다.
   */
  async triggerTestAlert(userId: string, alertType: string, severity: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime-biosignal/test-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({ userId, alertType, severity })
      });

      return await response.json();
    } catch (error) {
      console.error('테스트 알림 발생 실패:', error);
      throw error;
    }
  }

  /**
   * 프론트 저장소에서 API 인증 토큰을 읽어옵니다.
   */
  private getToken(): string {
    // 관리자/관제 서비스와 같은 저장소 키를 재사용해 인증 기준을 통일합니다.
    return localStorage.getItem('token') || '';
  }

  /**
   * 상태 코드를 화면용 한글 문구와 색상으로 변환합니다.
   */
  getStatusDisplayText(status: string): { text: string; color: string } {
    const statusMap: Record<string, { text: string; color: string }> = {
      'normal': { text: '정상', color: '#16a34a' },     // green-600
      'caution': { text: '주의', color: '#ca8a04' },    // yellow-600
      'warning': { text: '경고', color: '#ea580c' },    // orange-600
      'emergency': { text: '응급', color: '#dc2626' },  // red-600
      'critical': { text: '위험', color: '#991b1b' }    // red-800
    };

    return statusMap[status] || { text: status, color: '#6b7280' }; // gray-500
  }

  /**
   * 심각도 숫자에 맞는 화면 색상을 반환합니다.
   */
  getSeverityColor(severity: number): string {
    if (severity >= 5) return '#991b1b'; // red-800
    if (severity >= 4) return '#dc2626'; // red-600
    if (severity >= 3) return '#ea580c'; // orange-600
    if (severity >= 2) return '#ca8a04'; // yellow-600
    return '#16a34a'; // green-600
  }

  /**
   * 품질 등급 문자열에 맞는 색상을 반환합니다.
   */
  getQualityColor(quality: string): string {
    const qualityColors: Record<string, string> = {
      'excellent': '#16a34a',  // green-600
      'good': '#65a30d',       // lime-600
      'fair': '#ca8a04',       // yellow-600
      'poor': '#dc2626',       // red-600
      'unknown': '#6b7280'     // gray-500
    };

    return qualityColors[quality] || '#6b7280';
  }

  /**
   * 알림 타입 코드를 화면용 한글 문구로 변환합니다.
   */
  getAlertTypeDisplayText(type: string): string {
    const typeMap: Record<string, string> = {
      'critical_heart_rate': '심각한 심박수 이상',
      'abnormal_heart_rate': '심박수 이상',
      'arrhythmia': '부정맥',
      'critical_hypoxia': '심각한 저산소증',
      'hypoxia': '저산소증',
      'fall_detected': '낙상 감지',
      'prolonged_inactivity': '장시간 무활동',
      'high_risk_pattern': '고위험 패턴'
    };

    return typeMap[type] || type;
  }

  /**
   * 초 단위 시간을 읽기 쉬운 한글 형식으로 포맷합니다.
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    } else if (minutes > 0) {
      return `${minutes}분 ${remainingSeconds}초`;
    } else {
      return `${remainingSeconds}초`;
    }
  }
}

/**
 * 화면 전역에서 재사용하는 실시간 생체신호 서비스 싱글톤 인스턴스입니다.
 */
export const realtimeBiosignalService = new RealtimeBiosignalService();

/**
 * 실시간 분석 엔진 상태를 주기적으로 조회하는 훅입니다.
 */
export function useEngineStatus() {
  const [status, setStatus] = React.useState<EngineStatus | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    /**
     * 엔진 상태를 다시 읽어 현재 화면 상태를 갱신합니다.
     */
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const engineStatus = await realtimeBiosignalService.getEngineStatus();
        setStatus(engineStatus);
      } catch (err) {
        console.error('엔진 상태 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    // 첫 진입 즉시 1회 조회하고 이후에만 주기 polling으로 최신 상태를 유지합니다.
    fetchStatus();
    
    // 엔진 상태는 초단위 급변보다 분 단위 추세 확인이 중요해 15초 간격 polling이면 충분합니다.
    const interval = setInterval(fetchStatus, 15000);
    
    return () => clearInterval(interval);
  }, []);

  return { status, loading, refetch: () => {
    // 수동 refetch는 interval을 기다리지 않고 현재 상태만 즉시 다시 읽습니다.
    realtimeBiosignalService.getEngineStatus().then(setStatus);
  }};
}

/**
 * 활성 스트림 목록을 주기적으로 조회하는 훅입니다.
 */
export function useActiveStreams() {
  const [activeStreams, setActiveStreams] = React.useState<{ totalActiveStreams: number; streams: ActiveStream[] }>({ totalActiveStreams: 0, streams: [] });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    /**
     * 활성 스트림 목록을 다시 조회해 화면 데이터를 갱신합니다.
     */
    const fetchStreams = async () => {
      setLoading(true);
      try {
        const result = await realtimeBiosignalService.getActiveStreams();
        setActiveStreams(result);
      } catch (err) {
        console.error('활성 스트림 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    // 화면 진입 직후 활성 스트림을 먼저 채우고 이후 주기적으로 갱신합니다.
    fetchStreams();
    
    // 활성 스트림 수는 운영 화면에서 더 자주 체감되는 값이라 엔진 상태보다 약간 짧은 주기로 갱신합니다.
    const interval = setInterval(fetchStreams, 10000);
    
    return () => clearInterval(interval);
  }, []);

  return { activeStreams, loading, refetch: () => {
    // 수동 refetch는 현재 활성 스트림 목록만 즉시 다시 조회합니다.
    realtimeBiosignalService.getActiveStreams().then(setActiveStreams);
  }};
}

/**
 * 사용자 기준 실시간 생체신호 표시 상태를 관리하는 훅입니다.
 */
export function useRealtimeVitals(userId: string | null) {
  const [vitals, setVitals] = React.useState<RealtimeVitals | null>(null);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    if (!userId) {
      setVitals(null);
      setConnected(false);
      return;
    }

    let cancelled = false;

    /**
     * monitored-users 최신 응답에서 선택 회원 1명의 실시간 카드 수치를 추출합니다.
     */
    const fetchRealtimeVitals = async () => {
      try {
        const token =
          typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '';
        const response = await fetch(buildApiUrl('/api/controllers/monitored-users?windowMinutes=10'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success || !Array.isArray(json?.users) || cancelled) {
          return;
        }

        const target = json.users.find((row: any) => String(row?._id || row?.id || '') === String(userId));
        const latest = target?.latestBiometric || {};
        const bp =
          typeof latest?.bloodPressure?.systolic === 'number' &&
          typeof latest?.bloodPressure?.diastolic === 'number'
            ? {
                systolic: latest.bloodPressure.systolic,
                diastolic: latest.bloodPressure.diastolic,
              }
            : null;
        const emergencyScore =
          typeof latest?.emergencyScore === 'number' && Number.isFinite(latest.emergencyScore)
            ? latest.emergencyScore
            : 0;
        const status: RealtimeVitals['status'] =
          emergencyScore >= 90
            ? 'critical'
            : emergencyScore >= 70
              ? 'emergency'
              : emergencyScore >= 50
                ? 'warning'
                : emergencyScore >= 25
                  ? 'caution'
                  : 'normal';

        setVitals({
          timestamp: latest?.collectedAt ? new Date(latest.collectedAt).getTime() || Date.now() : Date.now(),
          heartRate: typeof latest?.heartRate === 'number' ? latest.heartRate : null,
          spo2: typeof latest?.spO2 === 'number' ? latest.spO2 : null,
          bloodPressure: bp,
          temperature: typeof latest?.bodyTemperature === 'number' ? latest.bodyTemperature : null,
          activity: String(latest?.movementStatus || latest?.rawData?.activityContext || 'unknown'),
          hrv: typeof latest?.hrv === 'number' ? latest.hrv : null,
          status,
          quality: {
            overall: target?.isOnline ? 'good' : 'unknown',
            scores: {},
            issues: [],
          },
          alerts: null,
        });
        setConnected(Boolean(target?.isOnline));
      } catch {
        if (!cancelled) {
          setConnected(false);
        }
      }
    };

    fetchRealtimeVitals();
    const interval = window.setInterval(fetchRealtimeVitals, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId]);

  return { vitals, connected };
}

/**
 * 실시간 생체신호 서비스 싱글톤을 기본 export로 제공합니다.
 */
export default realtimeBiosignalService;
