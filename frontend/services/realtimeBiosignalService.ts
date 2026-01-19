/**
 * 실시간 생체신호 분석 엔진 프론트엔드 서비스
 */

import { API_BASE_URL } from './api';

export interface BiosignalStreamConfig {
  userId: string;
  deviceId: string;
  signalTypes: ('ecg' | 'ppg' | 'accelerometer' | 'temperature' | 'spo2')[];
}

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

export interface EmergencyAlert {
  type: string;
  value: any;
  severity: number;
  message: string;
  timestamp: number;
  confidence?: number;
}

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

export interface ActiveStream {
  userId: string;
  deviceId: string;
  signalTypes: string[];
  startTime: string;
  status: 'active' | 'stopped';
}

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

class RealtimeBiosignalService {

  /**
   * 실시간 생체신호 모니터링 시작
   */
  async startMonitoring(config: BiosignalStreamConfig): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime-biosignal/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify(config)
      });

      return await response.json();
    } catch (error) {
      console.error('실시간 모니터링 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 실시간 생체신호 모니터링 중단
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
   * 엔진 상태 조회
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
   * 활성 스트림 목록 조회
   */
  async getActiveStreams(): Promise<{ totalActiveStreams: number; streams: ActiveStream[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime-biosignal/active-streams`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      return result.success ? result.data : { totalActiveStreams: 0, streams: [] };
    } catch (error) {
      console.error('활성 스트림 조회 실패:', error);
      return { totalActiveStreams: 0, streams: [] };
    }
  }

  /**
   * 응급상황 감지 기록 조회
   */
  async getEmergencyHistory(period: '1h' | '6h' | '24h' | '7d' = '24h', userId?: string): Promise<EmergencyHistory | null> {
    try {
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
   * 신호 품질 조회
   */
  async getSignalQuality(userId?: string): Promise<SignalQuality | null> {
    try {
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
   * 엔진 설정 조회
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
   * 엔진 설정 업데이트
   */
  async updateEngineConfig(updates: Partial<Pick<EngineConfig, 'emergencyThresholds' | 'qualityThresholds'>>): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime-biosignal/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify(updates)
      });

      return await response.json();
    } catch (error) {
      console.error('엔진 설정 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 테스트 알림 발생
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
   * 토큰 조회
   */
  private getToken(): string {
    return localStorage.getItem('token') || '';
  }

  /**
   * 상태 텍스트 변환
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
   * 심각도 색상 조회
   */
  getSeverityColor(severity: number): string {
    if (severity >= 5) return '#991b1b'; // red-800
    if (severity >= 4) return '#dc2626'; // red-600
    if (severity >= 3) return '#ea580c'; // orange-600
    if (severity >= 2) return '#ca8a04'; // yellow-600
    return '#16a34a'; // green-600
  }

  /**
   * 품질 등급 색상
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
   * 알림 타입 한국어 변환
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
   * 시간 포맷팅
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

// 싱글톤 인스턴스
export const realtimeBiosignalService = new RealtimeBiosignalService();

/**
 * React Hook for real-time engine status monitoring
 */
export function useEngineStatus() {
  const [status, setStatus] = React.useState<EngineStatus | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
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

    fetchStatus();
    
    // 15초마다 업데이트
    const interval = setInterval(fetchStatus, 15000);
    
    return () => clearInterval(interval);
  }, []);

  return { status, loading, refetch: () => {
    realtimeBiosignalService.getEngineStatus().then(setStatus);
  }};
}

/**
 * React Hook for active streams monitoring
 */
export function useActiveStreams() {
  const [activeStreams, setActiveStreams] = React.useState<{ totalActiveStreams: number; streams: ActiveStream[] }>({ totalActiveStreams: 0, streams: [] });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
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

    fetchStreams();
    
    // 10초마다 업데이트
    const interval = setInterval(fetchStreams, 10000);
    
    return () => clearInterval(interval);
  }, []);

  return { activeStreams, loading, refetch: () => {
    realtimeBiosignalService.getActiveStreams().then(setActiveStreams);
  }};
}

/**
 * React Hook for real-time vitals monitoring
 */
export function useRealtimeVitals(userId: string | null) {
  const [vitals, setVitals] = React.useState<RealtimeVitals | null>(null);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    if (!userId) return;

    // Socket.IO 연결을 통한 실시간 생체신호 수신
    // 실제 구현에서는 Socket.IO 클라이언트 연결
    
    const mockVitals: RealtimeVitals = {
      timestamp: Date.now(),
      heartRate: 75,
      spo2: 98,
      bloodPressure: { systolic: 120, diastolic: 80 },
      temperature: 36.5,
      activity: 'moderate',
      hrv: 45,
      status: 'normal',
      quality: {
        overall: 'good',
        scores: { ecg: 8.5, ppg: 7.2 },
        issues: []
      },
      alerts: null
    };

    setVitals(mockVitals);
    setConnected(true);

    // Mock 데이터 업데이트 (실제로는 Socket.IO 이벤트)
    const interval = setInterval(() => {
      setVitals(prev => prev ? {
        ...prev,
        timestamp: Date.now(),
        heartRate: (prev.heartRate || 75) + (Math.random() - 0.5) * 4,
        spo2: (prev.spo2 || 98) + (Math.random() - 0.5) * 1
      } : null);
    }, 2000);

    return () => clearInterval(interval);
  }, [userId]);

  return { vitals, connected };
}

export default realtimeBiosignalService;