/**
 * 국립중앙의료원 API 기반 지능형 병원 매칭 서비스
 */

import { API_BASE_URL } from './api';

export interface HospitalBedInfo {
  hospitalId: string;
  hospitalName: string;
  emergencyBeds: {
    total: number;
    available: number;
    occupied: number;
    occupancyRate: number;
  };
  icu: {
    general: { total: number; available: number };
    neonatal: { total: number; available: number };
    cardiac: { total: number; available: number };
  };
  operatingRooms: {
    total: number;
    available: number;
  };
  specialties: {
    neurosurgery: boolean;
    cardiothoracic: boolean;
    burn: boolean;
    newborn: boolean;
    trauma: boolean;
  };
  status: {
    emergency: string;
    lastUpdated: string;
    isAvailable: boolean;
  };
}

export interface HospitalMatchingResult {
  hospitalId: string;
  hospitalName: string;
  confirmed: boolean;
  confirmationId?: string;
  distance: number;
  suitabilityScore: number;
  estimatedArrival: string;
  backupCount: number;
}

export interface HospitalAvailability {
  hospitalId: string;
  available: boolean;
  confidence: number;
  reasons: string[];
  recommendations: string[];
  assignedBed?: string;
  assignedDepartment?: string;
  specialInstructions?: string;
  checkedAt: string;
}

export interface OptimalHospital {
  hospitalId: string;
  hospitalName: string;
  distance: number;
  suitabilityScore: number;
  available: boolean;
  confidence: number;
  emergencyBeds: {
    total: number;
    available: number;
    occupancyRate: number;
  };
  icu: {
    general: { total: number; available: number };
  };
  specialties: Record<string, boolean>;
  estimatedTravelTime: number;
}

export interface MatchingStatistics {
  period: string;
  summary: {
    totalCases: number;
    matchedCases: number;
    confirmedCases: number;
    rematchedCases: number;
    matchingRate: number;
    confirmationRate: number;
    rematchRate: number;
    averageMatchingTime: number;
  };
  generatedAt: string;
}

export interface AdmissionConfirmation {
  confirmed: boolean;
  confirmationId?: string;
  hospitalId: string;
  hospitalName: string;
  assignedBed?: string;
  assignedDepartment?: string;
  estimatedArrival: string;
  validUntil?: string;
  specialInstructions?: string;
  reason?: string;
  message: string;
}

class HospitalMatchingService {

  /**
   * 국립중앙의료원 API 병원 데이터 동기화
   */
  async syncHospitalData(): Promise<{ success: boolean; message: string; syncedCount?: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospital-matching/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      return await response.json();
    } catch (error) {
      console.error('병원 데이터 동기화 실패:', error);
      throw error;
    }
  }

  /**
   * 실시간 응급실 가용 병상 현황 조회
   */
  async getRealTimeBedStatus(hospitalIds?: string[], forceRefresh = false): Promise<{
    success: boolean;
    data: HospitalBedInfo[];
    totalHospitals: number;
    lastUpdated: string;
  }> {
    try {
      const params = new URLSearchParams();
      if (hospitalIds && hospitalIds.length > 0) {
        params.append('hospitalIds', hospitalIds.join(','));
      }
      if (forceRefresh) {
        params.append('forceRefresh', 'true');
      }

      const response = await fetch(`${API_BASE_URL}/hospital-matching/realtime-beds?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      const result = await response.json();
      return result.success ? result : { success: false, data: [], totalHospitals: 0, lastUpdated: new Date().toISOString() };
    } catch (error) {
      console.error('실시간 병상 현황 조회 실패:', error);
      return { success: false, data: [], totalHospitals: 0, lastUpdated: new Date().toISOString() };
    }
  }

  /**
   * 응급 케이스 병원 매칭
   */
  async matchHospital(emergencyCaseId: string, options: {
    forceRematch?: boolean;
    requiredSpecialties?: string[];
  } = {}): Promise<{ success: boolean; message: string; data?: HospitalMatchingResult }> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospital-matching/match`, {
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
      console.error('병원 매칭 실패:', error);
      throw error;
    }
  }

  /**
   * 병원 재매칭
   */
  async rematchHospital(emergencyCaseId: string, reason?: string): Promise<{
    success: boolean;
    data: {
      rematched: boolean;
      reason: string;
      previousHospital?: string;
      newHospital?: string;
      improvement?: number;
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospital-matching/rematch`, {
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
      console.error('병원 재매칭 실패:', error);
      throw error;
    }
  }

  /**
   * 병원 수용 확약 상태 확인
   */
  async getConfirmationStatus(emergencyCaseId: string): Promise<{
    success: boolean;
    data: {
      updated: boolean;
      statusChanged: boolean;
      previousStatus?: string;
      newStatus?: string;
      rematchAttempted?: boolean;
      rematchResult?: any;
      availability?: any;
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospital-matching/confirmation-status?emergencyCaseId=${emergencyCaseId}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      return await response.json();
    } catch (error) {
      console.error('확약 상태 확인 실패:', error);
      throw error;
    }
  }

  /**
   * 특정 병원의 수용 가능성 확인
   */
  async checkHospitalAvailability(hospitalId: string, patientInfo: {
    emergencyLevel?: number;
    age?: number;
    gender?: string;
    medicalHistory?: string[];
  } = {}): Promise<{ success: boolean; data?: HospitalAvailability }> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospital-matching/hospital-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({
          hospitalId,
          patientInfo
        })
      });

      return await response.json();
    } catch (error) {
      console.error('병원 수용 가능성 확인 실패:', error);
      throw error;
    }
  }

  /**
   * 병원 수용 확약 요청
   */
  async requestAdmissionConfirmation(hospitalId: string, emergencyCaseId: string, estimatedArrival?: string): Promise<{
    success: boolean;
    data?: AdmissionConfirmation;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospital-matching/request-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({
          hospitalId,
          emergencyCaseId,
          estimatedArrival
        })
      });

      return await response.json();
    } catch (error) {
      console.error('병원 확약 요청 실패:', error);
      throw error;
    }
  }

  /**
   * 최적 병원 후보 검색
   */
  async findOptimalHospitals(location: { lat: number; lng: number }, patientInfo: {
    emergencyLevel?: number;
    age?: number;
    gender?: string;
    symptoms?: string[];
  } = {}, maxResults = 5): Promise<{
    success: boolean;
    data?: {
      hospitals: OptimalHospital[];
      totalFound: number;
      searchLocation: { lat: number; lng: number };
      searchCriteria: any;
      searchedAt: string;
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospital-matching/optimal-hospitals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({
          location,
          patientInfo,
          maxResults
        })
      });

      return await response.json();
    } catch (error) {
      console.error('최적 병원 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 병원 매칭 통계 조회
   */
  async getMatchingStatistics(period: '24h' | '7d' | '30d' = '24h'): Promise<{
    success: boolean;
    data?: MatchingStatistics;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospital-matching/statistics?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      return await response.json();
    } catch (error) {
      console.error('병원 매칭 통계 조회 실패:', error);
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
   * 병상 가용률 색상
   */
  getBedOccupancyColor(occupancyRate: number): string {
    if (occupancyRate >= 90) return '#dc2626'; // red-600 (위험)
    if (occupancyRate >= 80) return '#ea580c'; // orange-600 (주의)
    if (occupancyRate >= 70) return '#ca8a04'; // yellow-600 (보통)
    if (occupancyRate >= 50) return '#65a30d'; // lime-600 (여유)
    return '#16a34a'; // green-600 (충분)
  }

  /**
   * 적합성 점수 등급
   */
  getSuitabilityGrade(score: number): { grade: string; color: string } {
    if (score >= 90) return { grade: 'S급', color: '#7c3aed' }; // purple-600
    if (score >= 80) return { grade: 'A급', color: '#16a34a' }; // green-600
    if (score >= 70) return { grade: 'B급', color: '#65a30d' }; // lime-600
    if (score >= 60) return { grade: 'C급', color: '#ca8a04' }; // yellow-600
    if (score >= 50) return { grade: 'D급', color: '#ea580c' }; // orange-600
    return { grade: 'F급', color: '#dc2626' }; // red-600
  }

  /**
   * 확약 상태 텍스트 및 색상
   */
  getConfirmationStatusDisplay(status: string): { text: string; color: string } {
    const statusMap: Record<string, { text: string; color: string }> = {
      'confirmed': { text: '확약 완료', color: '#16a34a' },      // green-600
      'pending': { text: '확약 대기', color: '#ca8a04' },        // yellow-600
      'expired': { text: '확약 만료', color: '#ea580c' },        // orange-600
      'capacity_exceeded': { text: '용량 초과', color: '#dc2626' }, // red-600
      'rejected': { text: '확약 거부', color: '#dc2626' },       // red-600
      'matched': { text: '매칭 완료', color: '#65a30d' }        // lime-600
    };

    return statusMap[status] || { text: status, color: '#6b7280' }; // gray-500
  }

  /**
   * 거리 포맷팅
   */
  formatDistance(distanceInMeters: number): string {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`;
    }
    return `${(distanceInMeters / 1000).toFixed(1)}km`;
  }

  /**
   * 시간 포맷팅 (분)
   */
  formatTravelTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}분`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}시간 ${remainingMinutes}분`;
  }

  /**
   * 전문 진료과 한국어 변환
   */
  getSpecialtyDisplayName(specialty: string): string {
    const specialtyMap: Record<string, string> = {
      'neurosurgery': '뇌신경외과',
      'cardiothoracic': '흉부외과',
      'burn': '화상센터',
      'newborn': '신생아실',
      'trauma': '외상센터',
      'pediatric': '소아과',
      'cardiac': '심장내과',
      'emergency': '응급의학과'
    };

    return specialtyMap[specialty] || specialty;
  }

  /**
   * 병원 타입 아이콘
   */
  getHospitalTypeIcon(hospitalName: string): string {
    if (hospitalName.includes('대학병원') || hospitalName.includes('의료원')) {
      return '🏥'; // 대형병원
    }
    if (hospitalName.includes('센터')) {
      return '🚑'; // 전문센터
    }
    if (hospitalName.includes('병원')) {
      return '🏨'; // 일반병원
    }
    return '⚕️'; // 의료기관
  }
}

// 싱글톤 인스턴스
export const hospitalMatchingService = new HospitalMatchingService();

/**
 * React Hook for real-time bed status monitoring
 */
export function useRealTimeBedStatus(hospitalIds?: string[], refreshInterval = 30000) {
  const [bedStatus, setBedStatus] = React.useState<{
    success: boolean;
    data: HospitalBedInfo[];
    totalHospitals: number;
    lastUpdated: string;
  }>({ success: false, data: [], totalHospitals: 0, lastUpdated: new Date().toISOString() });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchBedStatus = async () => {
      setLoading(true);
      try {
        const result = await hospitalMatchingService.getRealTimeBedStatus(hospitalIds);
        setBedStatus(result);
      } catch (err) {
        console.error('실시간 병상 현황 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBedStatus();
    
    // 정기적으로 업데이트
    const interval = setInterval(fetchBedStatus, refreshInterval);
    
    return () => clearInterval(interval);
  }, [hospitalIds?.join(','), refreshInterval]);

  return { bedStatus, loading, refetch: () => {
    hospitalMatchingService.getRealTimeBedStatus(hospitalIds, true).then(setBedStatus);
  }};
}

/**
 * React Hook for hospital matching statistics
 */
export function useMatchingStatistics(period: '24h' | '7d' | '30d' = '24h') {
  const [statistics, setStatistics] = React.useState<MatchingStatistics | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      try {
        const result = await hospitalMatchingService.getMatchingStatistics(period);
        if (result.success && result.data) {
          setStatistics(result.data);
        }
      } catch (err) {
        console.error('매칭 통계 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
    
    // 5분마다 업데이트
    const interval = setInterval(fetchStatistics, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [period]);

  return { statistics, loading, refetch: () => {
    hospitalMatchingService.getMatchingStatistics(period).then(result => {
      if (result.success && result.data) {
        setStatistics(result.data);
      }
    });
  }};
}

export default hospitalMatchingService;