/**
 * 골든타임 시스템 모니터링 API 연동 서비스
 * 실시간 대시보드를 위한 백엔드 API 호출
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003';

export interface SystemOverview {
  systemStatus: 'OPERATIONAL' | 'WARNING' | 'CRITICAL';
  timestamp: string;
  uptime: number;
  overallHealth: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    score: number;
    criticalAlerts: number;
    warningAlerts: number;
  };
  emergencyCases: {
    active: number;
    level4Plus: number;
    todayTotal: number;
  };
  keyMetrics: {
    apiResponseTime: string;
    systemUptime: string;
    hospitalConnections: number;
    availableBeds: number;
    activeParamedics: number;
  };
  shadowMonitoring?: {
    status: 'OK' | 'MISMATCH';
    totalGap: number;
    realtimeGap: number;
    workflowGap: number;
    summaryLevel: 'info' | 'warning' | 'critical';
    bannerTone: 'neutral' | 'warning' | 'danger';
    actionPriority: 'low' | 'medium' | 'high';
    summaryMessage: string;
    recommendedAction: string;
    inconsistentScopes: string[];
  };
}

export interface SystemEngine {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CONNECTED' | 'MONITORING' | 'TRACKING' | 'DISABLED' | 'DISCONNECTED' | 'ERROR';
  icon: string;
  metrics: Record<string, any>;
}

export interface EngineStatus {
  engines: SystemEngine[];
  totalEngines: number;
  activeEngines: number;
  timestamp: string;
}

export interface PerformanceMetrics {
  apiMetrics: {
    responseTime: string;
    throughput: string;
    errorRate: string;
    activeRequests: number;
  };
  systemResources: {
    cpuUsage: any;
    memoryUsage: any;
    uptime: number;
    nodeVersion: string;
  };
  database: {
    connectionStatus: string;
    queryTime: string;
    activeConnections: number;
    cacheHitRate: string;
  };
  externalAPIs: {
    nedcAPI: {
      status: string;
      responseTime: string;
      successRate: string;
      lastCall: string;
    };
    ollamaLLM: {
      status: string;
      responseTime: string;
      successRate: string;
      modelLoaded: string;
    };
  };
}

export interface SystemAlert {
  id: string;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
}

export interface AlertSummary {
  alerts: SystemAlert[];
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
}

class SystemMonitoringService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5000; // 5초 캐시

  /**
   * 캐시된 데이터가 유효한지 확인
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  /**
   * 캐시에서 데이터 가져오기
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  /**
   * 캐시에 데이터 저장
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * API 호출 헬퍼
   */
  private async apiCall<T>(endpoint: string, useCache = true): Promise<T> {
    const cacheKey = endpoint;
    
    if (useCache && this.isCacheValid(cacheKey)) {
      const cachedData = this.getFromCache<T>(cacheKey);
      if (cachedData) return cachedData;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      const data = result.data || result;
      
      if (useCache) {
        this.setCache(cacheKey, data);
      }
      
      return data;
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      
      // 캐시된 데이터가 있으면 그것을 반환 (stale-while-revalidate)
      const staleData = this.getFromCache<T>(cacheKey);
      if (staleData) {
        console.warn(`Returning stale data for ${endpoint}`);
        return staleData;
      }
      
      throw error;
    }
  }

  /**
   * 시스템 전체 개요 조회
   */
  async getSystemOverview(): Promise<SystemOverview> {
    return this.apiCall<SystemOverview>('/api/system-monitoring/overview');
  }

  /**
   * 모든 엔진 상태 조회
   */
  async getEngineStatus(): Promise<EngineStatus> {
    return this.apiCall<EngineStatus>('/api/system-monitoring/engines');
  }

  /**
   * 성능 지표 조회
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return this.apiCall<PerformanceMetrics>('/api/system-monitoring/performance');
  }

  /**
   * 시스템 알림 조회
   */
  async getSystemAlerts(): Promise<AlertSummary> {
    return this.apiCall<AlertSummary>('/api/system-monitoring/alerts');
  }

  /**
   * 실시간 데이터 스트리밍을 위한 폴링 설정
   */
  startRealtimeMonitoring(
        /**
     * onUpdate 관련 처리를 수행합니다.
     */
onUpdate: (data: {
      overview: SystemOverview;
      engines: EngineStatus;
      performance: PerformanceMetrics;
      alerts: AlertSummary;
    }) => void,
        /**
     * onError 관련 처리를 수행합니다.
     */
onError: (error: Error) => void,
    interval: number = 5000 // 5초마다 업데이트
  ): () => void {
    let isActive = true;

        /**
     * updateData 관련 처리를 수행합니다.
     */
const updateData = async () => {
      if (!isActive) return;

      try {
        const [overview, engines, performance, alerts] = await Promise.allSettled([
          this.getSystemOverview(),
          this.getEngineStatus(),
          this.getPerformanceMetrics(),
          this.getSystemAlerts()
        ]);

        // 성공한 요청들의 결과만 추출
        const results = {
          overview: overview.status === 'fulfilled' ? overview.value : null,
          engines: engines.status === 'fulfilled' ? engines.value : null,
          performance: performance.status === 'fulfilled' ? performance.value : null,
          alerts: alerts.status === 'fulfilled' ? alerts.value : null
        };

        // 적어도 하나의 API 호출이 성공했으면 업데이트
        if (results.overview || results.engines || results.performance || results.alerts) {
          onUpdate(results as any);
        }

        // 실패한 요청들에 대해 에러 로그
        [overview, engines, performance, alerts].forEach((result, index) => {
          if (result.status === 'rejected') {
            const endpoints = ['overview', 'engines', 'performance', 'alerts'];
            console.warn(`${endpoints[index]} API 호출 실패:`, result.reason.message);
          }
        });

      } catch (error) {
        console.error('실시간 모니터링 데이터 가져오기 실패:', error);
        onError(error instanceof Error ? error : new Error('Unknown error'));
      }

      // 다음 업데이트 스케줄
      if (isActive) {
        setTimeout(updateData, interval);
      }
    };

    // 즉시 한 번 실행
    updateData();

    // cleanup 함수 반환
    return () => {
      isActive = false;
    };
  }

  /**
   * 연결 상태 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * API 기본 URL 가져오기
   */
  getApiBaseUrl(): string {
    return API_BASE_URL;
  }
}

/**
 * systemMonitoringService 관련 처리를 수행합니다.
 */
export const systemMonitoringService = new SystemMonitoringService();

// React hooks for easy integration
import { useState, useEffect } from 'react';

/**
 * useSystemOverview 관련 처리를 수행합니다.
 */
export function useSystemOverview(autoRefresh: boolean = true, interval: number = 5000) {
  const [data, setData] = useState<SystemOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const overview = await systemMonitoringService.getSystemOverview();
        setData(overview);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (autoRefresh) {
            /**
       * intervalId 관련 처리를 수행합니다.
       */
const intervalId = setInterval(fetchData, interval);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, interval]);

  return { data, loading, error };
}

/**
 * useEngineStatus 관련 처리를 수행합니다.
 */
export function useEngineStatus(autoRefresh: boolean = true, interval: number = 5000) {
  const [data, setData] = useState<EngineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const engines = await systemMonitoringService.getEngineStatus();
        setData(engines);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (autoRefresh) {
      const intervalId = setInterval(fetchData, interval);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, interval]);

  return { data, loading, error };
}

/**
 * useRealtimeMonitoring 관련 처리를 수행합니다.
 */
export function useRealtimeMonitoring(interval: number = 5000) {
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [engines, setEngines] = useState<EngineStatus | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    let cleanup: (() => void) | null = null;

        /**
     * startMonitoring 관련 처리를 수행합니다.
     */
const startMonitoring = async () => {
      // 연결 테스트
      const isConnected = await systemMonitoringService.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');

      if (!isConnected) {
        setError('백엔드 서버에 연결할 수 없습니다.');
        setLoading(false);
        return;
      }

      cleanup = systemMonitoringService.startRealtimeMonitoring(
        (data) => {
          if (data.overview) setOverview(data.overview);
          if (data.engines) setEngines(data.engines);
          if (data.performance) setPerformance(data.performance);
          if (data.alerts) setAlerts(data.alerts);
          
          setLoading(false);
          setError(null);
          setConnectionStatus('connected');
        },
        (err) => {
          setError(err.message);
          setConnectionStatus('disconnected');
        },
        interval
      );
    };

    startMonitoring();

    return () => {
      if (cleanup) cleanup();
    };
  }, [interval]);

  return {
    overview,
    engines,
    performance,
    alerts,
    loading,
    error,
    connectionStatus
  };
}
