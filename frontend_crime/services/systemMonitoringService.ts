/**
 * 시스템 모니터링 서비스
 * 실시간 대시보드를 위한 API 호출
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api";

export interface SystemOverview {
  systemStatus: "OPERATIONAL" | "WARNING" | "CRITICAL";
  timestamp: string;
  uptime: number;
  overallHealth: {
    status: "HEALTHY" | "WARNING" | "CRITICAL";
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
}

export interface SystemEngine {
  id: string;
  name: string;
  status:
    | "ACTIVE"
    | "CONNECTED"
    | "MONITORING"
    | "TRACKING"
    | "DISABLED"
    | "DISCONNECTED"
    | "ERROR";
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
  level: "CRITICAL" | "WARNING" | "INFO";
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
  /**
   * 시스템 전체 개요 조회
   */
  async getSystemOverview(): Promise<SystemOverview> {
    const response = await fetch(
      `${API_BASE_URL}/api/system-monitoring/overview`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch system overview");
    }
    const data = await response.json();
    return data.data;
  }

  /**
   * 모든 엔진 상태 조회
   */
  async getEngineStatus(): Promise<EngineStatus> {
    const response = await fetch(
      `${API_BASE_URL}/api/system-monitoring/engines`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch engine status");
    }
    const data = await response.json();
    return data.data;
  }

  /**
   * 성능 지표 조회
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const response = await fetch(
      `${API_BASE_URL}/api/system-monitoring/performance`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch performance metrics");
    }
    const data = await response.json();
    return data.data;
  }

  /**
   * 시스템 알림 조회
   */
  async getSystemAlerts(): Promise<AlertSummary> {
    const response = await fetch(
      `${API_BASE_URL}/api/system-monitoring/alerts`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch system alerts");
    }
    const data = await response.json();
    return data.data;
  }

  /**
   * 실시간 데이터 스트리밍을 위한 폴링 설정
   */
  startRealtimeMonitoring(
    onUpdate: (data: {
      overview: SystemOverview;
      engines: EngineStatus;
      performance: PerformanceMetrics;
      alerts: AlertSummary;
    }) => void,
    interval: number = 5000, // 5초마다 업데이트
  ): () => void {
    const updateData = async () => {
      try {
        const [overview, engines, performance, alerts] = await Promise.all([
          this.getSystemOverview(),
          this.getEngineStatus(),
          this.getPerformanceMetrics(),
          this.getSystemAlerts(),
        ]);

        onUpdate({ overview, engines, performance, alerts });
      } catch (error) {
        console.error("실시간 모니터링 데이터 가져오기 실패:", error);
      }
    };

    // 즉시 한 번 실행
    updateData();

    // 정기적으로 업데이트
    const intervalId = setInterval(updateData, interval);

    // cleanup 함수 반환
    return () => {
      clearInterval(intervalId);
    };
  }
}

export const systemMonitoringService = new SystemMonitoringService();

// React hooks for easy integration
import { useState, useEffect } from "react";

export function useSystemOverview(
  autoRefresh: boolean = true,
  interval: number = 5000,
) {
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
        setError(err instanceof Error ? err.message : "Unknown error");
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

export function useEngineStatus(
  autoRefresh: boolean = true,
  interval: number = 5000,
) {
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
        setError(err instanceof Error ? err.message : "Unknown error");
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

export function usePerformanceMetrics(
  autoRefresh: boolean = true,
  interval: number = 10000,
) {
  const [data, setData] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const metrics = await systemMonitoringService.getPerformanceMetrics();
        setData(metrics);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
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

export function useSystemAlerts(
  autoRefresh: boolean = true,
  interval: number = 30000,
) {
  const [data, setData] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const alerts = await systemMonitoringService.getSystemAlerts();
        setData(alerts);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
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

export function useRealtimeMonitoring(interval: number = 5000) {
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [engines, setEngines] = useState<EngineStatus | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(
    null,
  );
  const [alerts, setAlerts] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cleanup = systemMonitoringService.startRealtimeMonitoring((data) => {
      setOverview(data.overview);
      setEngines(data.engines);
      setPerformance(data.performance);
      setAlerts(data.alerts);
      setLoading(false);
      setError(null);
    }, interval);

    return cleanup;
  }, [interval]);

  return {
    overview,
    engines,
    performance,
    alerts,
    loading,
    error,
  };
}
