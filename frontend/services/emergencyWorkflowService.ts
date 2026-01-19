/**
 * 응급 워크플로우 자동화 시스템 프론트엔드 서비스
 */

import { API_BASE_URL } from './api';

export interface WorkflowStatus {
  caseId: string;
  state: string;
  startTime: string;
  elapsedTime: number;
  timeline: TimelineEvent[];
  resources: {
    paramedic: string | null;
    hospital: string | null;
    ambulance: string | null;
    route: RouteInfo | null;
  };
  slaStatus: {
    onTrack: boolean;
    violations: string[];
  };
  escalationLevel: number;
  isOnTrack: boolean;
  nextMilestone: string;
}

export interface TimelineEvent {
  timestamp: string;
  eventType: string;
  description: string;
  state: string;
  elapsedMinutes?: number;
  relativeTime?: string;
}

export interface RouteInfo {
  distance: number;
  duration: number;
  route: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    waypoints: Array<{ lat: number; lng: number; name: string }>;
  };
  traffic: {
    level: string;
    delayMinutes: number;
  };
  emergencyOptimized: boolean;
}

export interface ActiveWorkflow {
  caseId: string;
  state: string;
  startTime: string;
  elapsedMinutes: number;
  escalationLevel: number;
  resources: {
    paramedic: string | null;
    hospital: string | null;
  };
  isOnTrack: boolean;
}

export interface PerformanceReport {
  totalCases: number;
  averageResponseTime: number;
  slaCompliance: {
    paramedicResponse: number;
    paramedicArrival: number;
    totalResponse: number;
  };
  escalationRate: number;
  backupUsageRate: number;
  successRate: number;
}

export interface SystemStatus {
  workflow: {
    activeWorkflows: number;
    escalationQueue: number;
    slaViolations: number;
  };
  tracking: {
    totalActiveTrackings: number;
    locationHistorySize: number;
  };
  resources: {
    paramedics: {
      available: number;
      dispatched: number;
      utilization: number;
    };
    hospitals: {
      available: number;
      totalCapacity: number;
      currentLoad: number;
    };
  };
  systemHealth: {
    uptime: number;
    memoryUsage: any;
    timestamp: string;
  };
}

class EmergencyWorkflowService {

  /**
   * 워크플로우 시작
   */
  async startWorkflow(emergencyCaseId: string, options: {
    priority?: 'low' | 'normal' | 'high' | 'critical';
    autoEscalation?: boolean;
    notifyGuardian?: boolean;
  } = {}): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-workflow/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({
          emergencyCaseId,
          ...options
        })
      });

      return await response.json();
    } catch (error) {
      console.error('워크플로우 시작 실패:', error);
      throw error;
    }
  }

  /**
   * 워크플로우 상태 조회
   */
  async getWorkflowStatus(caseId: string): Promise<WorkflowStatus | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-workflow/status/${caseId}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('워크플로우 상태 조회 실패:', error);
      return null;
    }
  }

  /**
   * 실시간 추적 상태 조회
   */
  async getTrackingStatus(caseId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-workflow/tracking/${caseId}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('추적 상태 조회 실패:', error);
      return null;
    }
  }

  /**
   * 수동 에스컬레이션
   */
  async escalate(emergencyCaseId: string, escalationType: 'paramedic' | 'hospital' | 'air_ambulance' | 'regional_support', reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-workflow/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({
          emergencyCaseId,
          escalationType,
          reason
        })
      });

      return await response.json();
    } catch (error) {
      console.error('에스컬레이션 실패:', error);
      throw error;
    }
  }

  /**
   * 활성 워크플로우 목록
   */
  async getActiveWorkflows(): Promise<{ totalActive: number; workflows: ActiveWorkflow[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-workflow/active`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      return result.success ? result.data : { totalActive: 0, workflows: [] };
    } catch (error) {
      console.error('활성 워크플로우 조회 실패:', error);
      return { totalActive: 0, workflows: [] };
    }
  }

  /**
   * 워크플로우 타임라인
   */
  async getWorkflowTimeline(caseId: string): Promise<{ timeline: TimelineEvent[]; currentState: string } | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-workflow/timeline/${caseId}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('타임라인 조회 실패:', error);
      return null;
    }
  }

  /**
   * 성능 리포트
   */
  async getPerformanceReport(period: '24h' | '7d' | '30d' = '24h'): Promise<PerformanceReport | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-workflow/performance?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('성능 리포트 조회 실패:', error);
      return null;
    }
  }

  /**
   * 시스템 전체 상태
   */
  async getSystemStatus(): Promise<SystemStatus | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-workflow/system-status`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('시스템 상태 조회 실패:', error);
      return null;
    }
  }

  /**
   * 백업 매칭 실행
   */
  async executeBackupMatching(emergencyCaseId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-workflow/backup-matching`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({
          emergencyCaseId,
          reason
        })
      });

      return await response.json();
    } catch (error) {
      console.error('백업 매칭 실패:', error);
      throw error;
    }
  }

  /**
   * 워크플로우 완료 처리
   */
  async completeWorkflow(emergencyCaseId: string, completionNotes?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-workflow/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({
          emergencyCaseId,
          completionNotes
        })
      });

      return await response.json();
    } catch (error) {
      console.error('워크플로우 완료 처리 실패:', error);
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
   * 워크플로우 상태 텍스트 변환
   */
  getStateDisplayText(state: string): string {
    const stateTexts: Record<string, string> = {
      'initiated': '시작됨',
      'paramedic_matching': '응급구조사 매칭 중',
      'paramedic_dispatched': '응급구조사 출동',
      'paramedic_enroute': '현장으로 이동 중',
      'paramedic_arrived': '현장 도착',
      'patient_stabilized': '응급처치 완료',
      'hospital_matching': '병원 매칭 중',
      'hospital_notified': '병원 통보 완료',
      'transport_started': '병원 이송 중',
      'hospital_arrived': '병원 도착',
      'patient_admitted': '환자 인수인계',
      'completed': '완료',
      'escalated': '에스컬레이션',
      'failed': '실패'
    };

    return stateTexts[state] || state;
  }

  /**
   * 응급도별 우선순위 색상
   */
  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      'critical': '#dc2626',  // red-600
      'high': '#ea580c',      // orange-600
      'normal': '#ca8a04',    // yellow-600
      'low': '#16a34a'        // green-600
    };

    return colors[priority] || '#6b7280'; // gray-500
  }

  /**
   * SLA 상태 색상
   */
  getSLAStatusColor(isOnTrack: boolean, violations: string[]): string {
    if (violations.length > 0) return '#dc2626'; // red-600
    if (!isOnTrack) return '#ea580c'; // orange-600
    return '#16a34a'; // green-600
  }

  /**
   * 에스컬레이션 레벨 텍스트
   */
  getEscalationLevelText(level: number): string {
    const levels: Record<number, string> = {
      0: '정상',
      1: '1차 에스컬레이션',
      2: '2차 에스컬레이션',
      3: '최고 단계 에스컬레이션'
    };

    return levels[level] || `에스컬레이션 Level ${level}`;
  }

  /**
   * 경과 시간 포맷
   */
  formatElapsedTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}분`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}시간 ${remainingMinutes}분`;
  }
}

// 싱글톤 인스턴스
export const emergencyWorkflowService = new EmergencyWorkflowService();

/**
 * React Hook for real-time workflow monitoring
 */
export function useWorkflowStatus(caseId: string | null) {
  const [status, setStatus] = React.useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!caseId) return;

    const fetchStatus = async () => {
      setLoading(true);
      try {
        const workflowStatus = await emergencyWorkflowService.getWorkflowStatus(caseId);
        setStatus(workflowStatus);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '상태 조회 실패');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    
    // 30초마다 업데이트
    const interval = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(interval);
  }, [caseId]);

  return { status, loading, error, refetch: () => {
    if (caseId) {
      emergencyWorkflowService.getWorkflowStatus(caseId).then(setStatus);
    }
  }};
}

/**
 * React Hook for active workflows monitoring
 */
export function useActiveWorkflows() {
  const [activeWorkflows, setActiveWorkflows] = React.useState<{ totalActive: number; workflows: ActiveWorkflow[] }>({ totalActive: 0, workflows: [] });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchActive = async () => {
      setLoading(true);
      try {
        const result = await emergencyWorkflowService.getActiveWorkflows();
        setActiveWorkflows(result);
      } catch (err) {
        console.error('활성 워크플로우 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActive();
    
    // 15초마다 업데이트
    const interval = setInterval(fetchActive, 15000);
    
    return () => clearInterval(interval);
  }, []);

  return { activeWorkflows, loading, refetch: () => {
    emergencyWorkflowService.getActiveWorkflows().then(setActiveWorkflows);
  }};
}

export default emergencyWorkflowService;