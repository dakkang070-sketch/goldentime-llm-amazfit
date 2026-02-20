/**
 * 의료 라벨링 프론트엔드 서비스
 */

export interface MedicalLabeling {
  _id: string;
  emergencyCaseId: string;
  biometricDataId: string;
  vitalSignLabels: {
    heartRateAbnormality: string;
    heartRatePattern: string;
    stressLevel: string;
  };
  activityLabels: {
    movementType: string;
    fallRisk: string;
    mobilityStatus: string;
  };
  emergencyClassification: {
    primaryCategory: string;
    subCategory: string;
    triageLevel: string;
  };
  temporalPatterns: {
    onsetSpeed: string;
    progressionTrend: string;
    durationEstimate: string;
  };
  riskAssessment: {
    mortalityRisk: string;
    hospitalAdmissionRisk: string;
    deteriorationRisk: string;
  };
  responseLabels: {
    responseUrgency: string;
    resourceLevel: string;
    hospitalLevel: string;
  };
  qualityMetrics: {
    labelingAccuracy: number;
    medicalValidation: {
      validated: boolean;
      validatedBy?: string;
      validatedAt?: string;
      validationScore?: number;
      validationNotes?: string;
    };
    aiConfidence: {
      overall: number;
      categoryConfidence: {
        vitalSigns: number;
        emergency: number;
        response: number;
      };
    };
  };
  metadata: {
    labelingMethod: string;
    labelingSource: string;
    dataVersion: string;
    tags: string[];
    notes?: string;
    createdBy: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LabelingStats {
  totalLabels: number;
  validatedLabels: number;
  averageAccuracy: number;
  averageConfidence: number;
  categoryDistribution: Record<string, number>;
  urgencyDistribution: Record<string, number>;
  validationRate: number;
  timeRange: string;
}

export interface SearchCriteria {
  primaryCategory?: string;
  triageLevel?: string;
  responseUrgency?: string;
  validated?: boolean;
  minAccuracy?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * 특정 라벨링 조회
 */
export const getMedicalLabeling = async (
  id: string,
): Promise<MedicalLabeling> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/medical-labeling/labels/${id}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("라벨링 조회 실패:", error);
    throw error;
  }
};

/**
 * 응급 케이스의 라벨링 목록 조회
 */
export const getCaseLabelings = async (
  caseId: string,
): Promise<MedicalLabeling[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/medical-labeling/case/${caseId}/labels`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("케이스 라벨링 조회 실패:", error);
    throw error;
  }
};

/**
 * 라벨링 통계 조회
 */
export const getLabelingStats = async (
  days: number = 7,
): Promise<LabelingStats> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/medical-labeling/stats?days=${days}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("라벨링 통계 조회 실패:", error);
    throw error;
  }
};

/**
 * 라벨링 검색
 */
export const searchLabelings = async (
  criteria: SearchCriteria,
): Promise<MedicalLabeling[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/medical-labeling/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(criteria),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("라벨링 검색 실패:", error);
    throw error;
  }
};

/**
 * 라벨링 검증
 */
export const validateLabeling = async (
  id: string,
  validationData: {
    score: number;
    notes?: string;
    corrections?: Record<string, any>;
  },
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/medical-labeling/validate/${id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validationData),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || `HTTP error! status: ${response.status}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("라벨링 검증 실패:", error);
    throw error;
  }
};

/**
 * 배치 라벨링
 */
export const batchLabel = async (
  emergencyCaseIds: string[],
  concurrency: number = 5,
): Promise<{ success: boolean; message: string; data: any }> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/medical-labeling/batch-label`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emergencyCaseIds, concurrency }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || `HTTP error! status: ${response.status}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("배치 라벨링 실패:", error);
    throw error;
  }
};

/**
 * 라벨링 데이터 내보내기
 */
export const exportLabelings = async (
  format: "csv" | "json" = "csv",
  days: number = 30,
): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/medical-labeling/export?format=${format}&days=${days}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 파일 다운로드
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `medical_labelings_${new Date().toISOString().split("T")[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("라벨링 내보내기 실패:", error);
    throw error;
  }
};

/**
 * 라벨링 카테고리 상수
 */
export const LABELING_CATEGORIES = {
  PRIMARY_CATEGORIES: {
    cardiac_event: "심장 관련",
    respiratory_distress: "호흡 곤란",
    neurological_event: "신경학적 이벤트",
    trauma_injury: "외상",
    metabolic_crisis: "대사 위기",
    psychiatric_emergency: "정신과적 응급",
    environmental_exposure: "환경적 노출",
    medication_reaction: "약물 반응",
    infectious_disease: "감염병",
    other_medical: "기타 의료적",
  },

  TRIAGE_LEVELS: {
    level_1_resuscitation: "1단계 - 소생술",
    level_2_emergent: "2단계 - 응급",
    level_3_urgent: "3단계 - 긴급",
    level_4_less_urgent: "4단계 - 준긴급",
    level_5_non_urgent: "5단계 - 비긴급",
  },

  RESPONSE_URGENCY: {
    immediate: "즉시 (0-5분)",
    urgent: "긴급 (5-15분)",
    prompt: "신속 (15-30분)",
    delayed: "지연 가능 (30-60분)",
    routine: "일반 (60분+)",
  },

  RISK_LEVELS: {
    very_low: "매우 낮음",
    low: "낮음",
    moderate: "보통",
    high: "높음",
    very_high: "매우 높음",
  },
};

/**
 * 라벨링 색상 유틸리티
 */
export const getLabelColor = (
  category: string,
  type: "category" | "triage" | "urgency" | "risk",
): string => {
  const colorMaps = {
    category: {
      cardiac_event: "#ef4444",
      respiratory_distress: "#f97316",
      neurological_event: "#8b5cf6",
      trauma_injury: "#dc2626",
      metabolic_crisis: "#eab308",
      default: "#6b7280",
    },
    triage: {
      level_1_resuscitation: "#dc2626",
      level_2_emergent: "#ea580c",
      level_3_urgent: "#d97706",
      level_4_less_urgent: "#65a30d",
      level_5_non_urgent: "#16a34a",
      default: "#6b7280",
    },
    urgency: {
      immediate: "#dc2626",
      urgent: "#ea580c",
      prompt: "#d97706",
      delayed: "#65a30d",
      routine: "#16a34a",
      default: "#6b7280",
    },
    risk: {
      very_high: "#dc2626",
      high: "#ea580c",
      moderate: "#d97706",
      low: "#65a30d",
      very_low: "#16a34a",
      default: "#6b7280",
    },
  };

  return colorMaps[type][category] || colorMaps[type]["default"];
};
