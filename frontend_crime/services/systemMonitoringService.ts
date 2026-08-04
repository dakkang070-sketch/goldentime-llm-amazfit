/**
 * 시스템 모니터링 서비스
 * 실시간 대시보드를 위한 API 호출
 */

/**
 * 시스템 모니터링 API를 호출할 기본 백엔드 경로입니다.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * 운영 개요 카드에서 사용하는 시스템 전체 상태 요약 구조입니다.
 */
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
  shadowMonitoring?: {
    status: "OK" | "MISMATCH";
    totalGap: number;
    realtimeGap: number;
    workflowGap: number;
    summaryLevel: "info" | "warning" | "critical";
    bannerTone: "neutral" | "warning" | "danger";
    actionPriority: "low" | "medium" | "high";
    summaryMessage: string;
    recommendedAction: string;
    inconsistentScopes: string[];
  };
}

/**
 * 개별 모니터링 엔진의 연결/활동 상태와 메트릭 구조입니다.
 */
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

/**
 * 전체 엔진 목록과 활성 개수 집계를 담는 구조입니다.
 */
export interface EngineStatus {
  engines: SystemEngine[];
  totalEngines: number;
  activeEngines: number;
  timestamp: string;
}

/**
 * API, 시스템 자원, DB, 외부 API 성능 지표를 묶은 구조입니다.
 */
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

/**
 * 시스템 대시보드에 노출할 개별 경보 메시지 구조입니다.
 */
export interface SystemAlert {
  id: string;
  level: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  message: string;
  timestamp: string;
}

/**
 * 경보 목록과 심각도별 개수 집계를 함께 담는 구조입니다.
 */
export interface AlertSummary {
  alerts: SystemAlert[];
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
}

/**
 * 시스템 모니터링 API 호출과 폴링 기반 실시간 갱신을 담당합니다.
 */
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
    // 백엔드 공통 래퍼에서 실제 payload는 data 필드 아래에 담겨 내려옵니다.
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
    // 엔진 목록도 동일 응답 래퍼를 사용하므로 화면 훅에서는 바로 data.data만 소비합니다.
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
    // 성능 지표 카드 역시 공통 response envelope을 벗겨낸 값만 넘깁니다.
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
    // 경보 패널도 summary와 alerts를 같이 가진 payload만 그대로 받도록 정규화합니다.
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
    /**
     * 개요, 엔진, 성능, 알림 데이터를 한 번에 다시 조회합니다.
     */
    const updateData = async () => {
      try {
        // 대시보드 상단 카드와 표가 한 틱에서 같이 갱신되도록 4개 API를 병렬 조회합니다.
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

    // 첫 진입에서 interval 한 주기를 기다리지 않도록 즉시 한 번 먼저 채웁니다.
    updateData();

    // 같은 조회 함수를 주기적으로 실행해 최신 모니터링 상태를 유지합니다.
    const intervalId = setInterval(updateData, interval);

    // 훅/컴포넌트 해제 시 polling 타이머를 정리하는 cleanup 함수를 반환합니다.
    return () => {
      clearInterval(intervalId);
    };
  }
}

/**
 * 화면 전역에서 재사용하는 시스템 모니터링 서비스 싱글톤입니다.
 */
export const systemMonitoringService = new SystemMonitoringService();

// 시스템 모니터링 훅 구현에 필요한 React 기본 훅을 함께 가져옵니다.
import { useState, useEffect } from "react";

/**
 * 시스템 개요 대시보드 데이터를 주기적으로 새로 불러오는 훅입니다.
 */
export function useSystemOverview(
  autoRefresh: boolean = true,
  interval: number = 5000,
) {
  const [data, setData] = useState<SystemOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /**
     * 시스템 개요 데이터를 다시 조회해 훅 상태를 갱신합니다.
     */
    const fetchData = async () => {
      try {
        setLoading(true);
        const overview = await systemMonitoringService.getSystemOverview();
        setData(overview);
        setError(null);
      } catch (err) {
        // 실패 시 마지막 성공 데이터는 유지하고, 화면에는 오류 문자열만 따로 노출합니다.
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (autoRefresh) {
      // 개요 카드만 따로 쓰는 화면도 같은 polling 패턴을 재사용합니다.
      const intervalId = setInterval(fetchData, interval);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, interval]);

  return { data, loading, error };
}

/**
 * 엔진 상태 목록을 주기적으로 새로 불러오는 훅입니다.
 */
export function useEngineStatus(
  autoRefresh: boolean = true,
  interval: number = 5000,
) {
  const [data, setData] = useState<EngineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /**
     * 엔진 상태 목록을 다시 조회해 훅 상태를 갱신합니다.
     */
    const fetchData = async () => {
      try {
        setLoading(true);
        const engines = await systemMonitoringService.getEngineStatus();
        setData(engines);
        setError(null);
      } catch (err) {
        // 엔진 표도 동일하게 마지막 성공 스냅샷은 남기고 에러 상태만 갱신합니다.
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (autoRefresh) {
      // 엔진 상태 표도 개요 카드와 같은 단순 interval 패턴으로 주기 갱신합니다.
      const intervalId = setInterval(fetchData, interval);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, interval]);

  return { data, loading, error };
}

/**
 * 성능 지표를 주기적으로 새로 불러오는 훅입니다.
 */
export function usePerformanceMetrics(
  autoRefresh: boolean = true,
  interval: number = 10000,
) {
  const [data, setData] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /**
     * 성능 지표를 다시 조회해 훅 상태를 갱신합니다.
     */
    const fetchData = async () => {
      try {
        setLoading(true);
        const metrics = await systemMonitoringService.getPerformanceMetrics();
        setData(metrics);
        setError(null);
      } catch (err) {
        // 성능 차트 역시 빈 화면으로 흔들리지 않도록 기존 data는 건드리지 않습니다.
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (autoRefresh) {
      // 성능 지표는 변동 폭이 상대적으로 작아 기본 간격을 더 길게 둡니다.
      const intervalId = setInterval(fetchData, interval);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, interval]);

  return { data, loading, error };
}

/**
 * 시스템 알림 목록을 주기적으로 새로 불러오는 훅입니다.
 */
export function useSystemAlerts(
  autoRefresh: boolean = true,
  interval: number = 30000,
) {
  const [data, setData] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /**
     * 시스템 알림 목록을 다시 조회해 훅 상태를 갱신합니다.
     */
    const fetchData = async () => {
      try {
        setLoading(true);
        const alerts = await systemMonitoringService.getSystemAlerts();
        setData(alerts);
        setError(null);
      } catch (err) {
        // 경보 목록도 실패 시 직전 목록을 유지해 운영자가 최근 알림 맥락을 잃지 않게 합니다.
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (autoRefresh) {
      // 알림 목록은 카드성 지표보다 느리게 변하므로 가장 긴 기본 polling 간격을 사용합니다.
      const intervalId = setInterval(fetchData, interval);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, interval]);

  return { data, loading, error };
}

/**
 * 개요, 엔진, 성능, 알림을 한 번에 묶어 실시간 대시보드 상태로 제공합니다.
 */
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
    // 묶음 훅은 개별 훅 4개를 따로 돌리지 않고 서비스의 통합 polling cleanup을 그대로 사용합니다.
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

/**
 * 모듈 기본 export로도 동일한 시스템 모니터링 서비스 인스턴스를 제공합니다.
 */
export default systemMonitoringService;
