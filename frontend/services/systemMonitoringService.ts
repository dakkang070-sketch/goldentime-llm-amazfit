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
 * shadow consistency 상세 응답에서 공통으로 쓰는 요약 구조입니다.
 */
export interface ShadowConsistencySummary {
  status: "OK" | "MISMATCH";
  totalGap: number;
  selectedScopes: string[];
  inconsistentScopes: string[];
  summaryLevel: "info" | "warning" | "critical";
  bannerTone: "neutral" | "warning" | "danger";
  actionPriority: "low" | "medium" | "high";
  summaryMessage: string;
  recommendedAction: string;
  realtimeTrend: {
    totalMismatchCount: number;
    consecutiveMismatchCount: number;
    lastMismatchAt: string | null;
    lastResolvedAt?: string | null;
    currentGap: number;
    status: "OK" | "MISMATCH";
  };
  workflowTrend: {
    totalMismatchCount: number;
    consecutiveMismatchCount: number;
    lastMismatchAt: string | null;
    lastResolvedAt?: string | null;
    currentGap: number;
    status: "OK" | "MISMATCH";
  };
}

/**
 * shadow consistency 보호 API 응답 전체 구조입니다.
 */
export interface ShadowConsistencyResponse {
  scope: "all" | "realtime-biosignal" | "emergency-workflow" | string;
  summary: ShadowConsistencySummary;
  trend: {
    realtimeBiosignal: ShadowConsistencySummary["realtimeTrend"];
    emergencyWorkflow: ShadowConsistencySummary["workflowTrend"];
  };
  snapshot: {
    realtimeBiosignal?: {
      memoryCount: number;
      shadowCount: number;
      consistent: boolean;
      onlyInMemory: string[];
      onlyInShadow: string[];
    };
    emergencyWorkflow?: {
      memoryCount: number;
      shadowCount: number;
      consistent: boolean;
      onlyInMemory: string[];
      onlyInShadow: string[];
    };
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
 * 시스템 상태, 엔진, 성능 지표 조회를 담당하는 프론트 서비스 클래스입니다.
 */
class SystemMonitoringService {
  /**
   * 보호된 모니터링 API 호출에 사용할 인증 헤더를 구성합니다.
   */
  private buildAuthHeaders(): HeadersInit | undefined {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("token") || "" : "";
    if (!token) {
      return undefined;
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * 대시보드 상단에 표시할 시스템 전체 개요를 조회합니다.
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
   * 각 모니터링 엔진의 현재 상태 목록을 조회합니다.
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
   * API, 시스템 자원, 외부 연동 성능 지표를 조회합니다.
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
   * 시스템 경고와 알림 요약 목록을 조회합니다.
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
   * 보호된 shadow consistency 상세 요약을 조회합니다.
   */
  async getShadowConsistency(
    scope?: "realtime-biosignal" | "emergency-workflow",
  ): Promise<ShadowConsistencyResponse> {
    const search = scope ? `?scope=${encodeURIComponent(scope)}` : "";
    const response = await fetch(
      `${API_BASE_URL}/api/system-monitoring/shadow-consistency${search}`,
      {
        headers: this.buildAuthHeaders(),
      },
    );
    if (!response.ok) {
      throw new Error("Failed to fetch shadow consistency");
    }
    const data = await response.json();
    return data.data;
  }

  /**
   * 주요 시스템 데이터를 묶어서 주기적으로 다시 조회하는 폴링을 시작합니다.
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
     * 개요, 엔진, 성능, 알림 데이터를 한 번에 다시 조회해 콜백으로 전달합니다.
     */
    const updateData = async () => {
      try {
        // 개별 카드 시점이 어긋나지 않도록 4개 리소스를 한 번에 병렬 조회해 같은 스냅샷처럼 맞춥니다.
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

    // 첫 화면에서 interval 한 주기만큼 빈 상태로 기다리지 않도록 즉시 한 번 실행합니다.
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
 * 화면 전역에서 재사용하는 시스템 모니터링 서비스 싱글톤 인스턴스입니다.
 */
export const systemMonitoringService = new SystemMonitoringService();

// 시스템 모니터링 훅 구현에 필요한 React 기본 훅을 함께 가져옵니다.
import { useState, useEffect } from "react";

/**
 * 시스템 개요를 주기적으로 조회하는 훅입니다.
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
     * 시스템 개요 데이터를 다시 조회해 화면 상태를 갱신합니다.
     */
    const fetchData = async () => {
      try {
        setLoading(true);
        const overview = await systemMonitoringService.getSystemOverview();
        setData(overview);
        setError(null);
      } catch (err) {
        // 실패해도 직전 성공 데이터는 유지하고 오류 문구만 별도로 갱신합니다.
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (autoRefresh) {
      // autoRefresh가 켜진 화면만 주기 polling을 유지하고, 아니면 1회 조회로 끝냅니다.
      const intervalId = setInterval(fetchData, interval);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, interval]);

  return { data, loading, error };
}

/**
 * 엔진 상태 목록을 주기적으로 조회하는 훅입니다.
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
     * 엔진 상태 데이터를 다시 조회해 화면 상태를 갱신합니다.
     */
    const fetchData = async () => {
      try {
        setLoading(true);
        const engines = await systemMonitoringService.getEngineStatus();
        setData(engines);
        setError(null);
      } catch (err) {
        // 엔진 표도 마지막 성공 목록을 남겨 운영자가 연결 현황 맥락을 잃지 않게 합니다.
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (autoRefresh) {
      // 엔진 상태도 필요 화면에서만 interval을 유지해 불필요한 트래픽을 줄입니다.
      const intervalId = setInterval(fetchData, interval);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, interval]);

  return { data, loading, error };
}

/**
 * 성능 지표를 주기적으로 조회하는 훅입니다.
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
     * 성능 지표 데이터를 다시 조회해 화면 상태를 갱신합니다.
     */
    const fetchData = async () => {
      try {
        setLoading(true);
        const metrics = await systemMonitoringService.getPerformanceMetrics();
        setData(metrics);
        setError(null);
      } catch (err) {
        // 성능 차트 역시 실패 때 null로 비우지 않고 이전 측정치를 유지합니다.
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (autoRefresh) {
      // 성능 지표는 상대적으로 비싸므로 autoRefresh일 때만 반복 조회합니다.
      const intervalId = setInterval(fetchData, interval);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, interval]);

  return { data, loading, error };
}

/**
 * 시스템 알림 목록을 주기적으로 조회하는 훅입니다.
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
     * 시스템 알림 데이터를 다시 조회해 화면 상태를 갱신합니다.
     */
    const fetchData = async () => {
      try {
        setLoading(true);
        const alerts = await systemMonitoringService.getSystemAlerts();
        setData(alerts);
        setError(null);
      } catch (err) {
        // 경보 목록은 최근 상태 맥락이 중요하므로 조회 실패 시에도 직전 목록을 보존합니다.
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (autoRefresh) {
      // 알림 훅은 필요 화면에서만 30초 polling을 유지합니다.
      const intervalId = setInterval(fetchData, interval);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, interval]);

  return { data, loading, error };
}

/**
 * 시스템 개요, 엔진, 성능, 알림을 한 번에 구독하듯 묶어 쓰는 훅입니다.
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
    // 개별 훅 여러 개를 두지 않고 서비스의 묶음 polling 결과를 한 번에 받아 화면 상태를 맞춥니다.
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
