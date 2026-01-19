/**
 * 자동 학습 시스템 프론트엔드 서비스
 */

export interface AutoLearningStatus {
  isTraining: boolean;
  lastTrainingTime: string | null;
  totalTrainingRuns: number;
  averageAccuracy: number;
  recentHistory: TrainingHistory[];
  config: {
    autoLearningEnabled: boolean;
    autoDeployEnabled: boolean;
    minDataThreshold: number;
    cronSchedule: string;
  };
}

export interface TrainingHistory {
  timestamp: string;
  dataCount: number;
  accuracy: number;
  deployed: boolean;
}

export interface NewDataCount {
  newDataCount: number;
  threshold: number;
  readyForTraining: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

/**
 * 자동 학습 시스템 상태 조회
 */
export const getAutoLearningStatus = async (): Promise<AutoLearningStatus> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auto-learning/status`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('자동 학습 상태 조회 실패:', error);
    throw error;
  }
};

/**
 * 새로운 훈련 데이터 개수 조회
 */
export const getNewDataCount = async (): Promise<NewDataCount> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auto-learning/data-count`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('새 데이터 개수 조회 실패:', error);
    throw error;
  }
};

/**
 * 배치 학습 수동 트리거
 */
export const triggerBatchLearning = async (): Promise<{ message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auto-learning/trigger-batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('배치 학습 트리거 실패:', error);
    throw error;
  }
};

/**
 * 증분 학습 수동 트리거
 */
export const triggerIncrementalLearning = async (): Promise<{ message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auto-learning/trigger-incremental`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('증분 학습 트리거 실패:', error);
    throw error;
  }
};

/**
 * 모델 롤백
 */
export const rollbackModel = async (): Promise<{ message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auto-learning/rollback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('모델 롤백 실패:', error);
    throw error;
  }
};

/**
 * 자동 학습 상태를 실시간으로 모니터링하는 훅
 */
export const useAutoLearningStatus = (pollingInterval: number = 30000) => {
  const [status, setStatus] = useState<AutoLearningStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        setError(null);
        const statusData = await getAutoLearningStatus();
        setStatus(statusData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus(); // 즉시 실행
    
    intervalId = setInterval(fetchStatus, pollingInterval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pollingInterval]);

  return { status, loading, error };
};

// React Hook 임포트 추가
import { useState, useEffect } from 'react';