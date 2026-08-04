const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface SystemOverview {
  systemStatus: 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'DEGRADED';
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

export interface ShadowConsistencySummary {
  status: 'OK' | 'MISMATCH';
  totalGap: number;
  selectedScopes: string[];
  inconsistentScopes: string[];
  summaryLevel: 'info' | 'warning' | 'critical';
  bannerTone: 'neutral' | 'warning' | 'danger';
  actionPriority: 'low' | 'medium' | 'high';
  summaryMessage: string;
  recommendedAction: string;
  realtimeTrend: {
    totalMismatchCount: number;
    consecutiveMismatchCount: number;
    lastMismatchAt: string | null;
    lastResolvedAt?: string | null;
    currentGap: number;
    status: 'OK' | 'MISMATCH';
  };
  workflowTrend: {
    totalMismatchCount: number;
    consecutiveMismatchCount: number;
    lastMismatchAt: string | null;
    lastResolvedAt?: string | null;
    currentGap: number;
    status: 'OK' | 'MISMATCH';
  };
}

export interface ShadowConsistencyResponse {
  scope: 'all' | 'realtime-biosignal' | 'emergency-workflow' | string;
  summary: ShadowConsistencySummary;
  trend: {
    realtimeBiosignal: ShadowConsistencySummary['realtimeTrend'];
    emergencyWorkflow: ShadowConsistencySummary['workflowTrend'];
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
 * 인증 토큰이 있으면 Authorization 헤더를 구성합니다.
 */
function buildSystemMonitoringHeaders(token?: string): HeadersInit | undefined {
  if (!token) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * 관리자 공통 상단에서 시스템 개요를 읽을 때 사용하는 최소 서비스입니다.
 */
export const systemMonitoringService = {
  /**
   * shadow 배너를 포함한 시스템 overview를 조회합니다.
   */
  async getOverview(): Promise<SystemOverview> {
    const response = await fetch(`${API_BASE_URL}/api/system-monitoring/overview`);
    if (!response.ok) {
      throw new Error('시스템 개요를 불러오지 못했습니다.');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * 관리자 인증 토큰으로 shadow consistency 상세 요약을 조회합니다.
   */
  async getShadowConsistency(token: string, scope?: 'realtime-biosignal' | 'emergency-workflow'): Promise<ShadowConsistencyResponse> {
    const search = scope ? `?scope=${encodeURIComponent(scope)}` : '';
    const response = await fetch(`${API_BASE_URL}/api/system-monitoring/shadow-consistency${search}`, {
      headers: buildSystemMonitoringHeaders(token),
    });
    if (!response.ok) {
      throw new Error('shadow consistency를 불러오지 못했습니다.');
    }

    const result = await response.json();
    return result.data;
  },
};
