export interface Biometrics {
  heartRate: number; // bpm
  bloodPressure: string; // systolic/diastolic
  bloodOxygen: number; // %
  sleep: number; // hours
  temperature: number; // Celsius
  bloodGlucose: number; // mg/dL
  stress: number; // 0-100
  hrv: number; // ms
  ecg: '정상' | '비정상' | '노이즈';
  gyroscope: '안정' | '미세 움직임' | '활발함' | '낙상 감지';
}

export interface Guardian {
  name: string;
  relationship: string;
  phone: string;
}

export interface ConnectedDevice {
  modelName: string;
  serialNumber: string;
  lastSyncTime: string;
  batteryEfficiency: string; // e.g., "48시간 예상"
  signalQuality: string; // e.g., "양호 (98%)"
  image?: string;
}

export interface MemberSettings {
  autoReportEnabled: boolean;
  locationCollectionEnabled: boolean;
  healthAnalysisEnabled: boolean;
  transmissionInterval: string; // e.g. "10초"
}

export interface DailyStat {
  name: string; // '월', '화' etc.
  value: number;
}

export interface HealthStats {
  averageHeartRate: number;
  heartRateRange: { min: number; max: number };
  heartRateHistory: DailyStat[];
  averageBloodPressure: string;
  averageSPO2: number;
  minSPO2: number;
  averageTemperature: number;
  feverCount: number;
  healthScore: number;
  
  stepsHistory: DailyStat[];
  stepGoalAchievement: number; // %
  
  averageSleep: number;
  sleepQuality: '양호' | '보통' | '나쁨';
  averageStress: number; // 0-100
  caloriesBurned: number; // kcal
  
  incidentSummary: {
    total: number;
    fall: number;
    arrhythmia: number;
    lowOxygen: number;
    avgResponseTime: string;
  };

  weeklyPrediction: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  birthDate: string; // YYYY-MM-DD
  age: number;
  gender: '남' | '여';
  height: number; // cm
  weight: number; // kg
  bloodType: string; // e.g., A+, B-
  phone: string;
  address: string;
  guardian: Guardian;
  connectedDevice?: ConnectedDevice | null;
  appSettings: MemberSettings;
  healthStats: HealthStats;
  riskLevel: '저위험' | '중위험' | '고위험';
  medicalConditions: string[];
  medications: string; // text description
  allergies: string; // text description
  lastActive: string;
  deviceBattery: number;
  status: '정상' | '비활성' | '위험' | '주의';
  accountStatus: 'active' | 'suspended' | 'withdrawn';
  biometrics: Biometrics;
}

export interface SystemSettings {
  transmissionInterval: {
    realtime: string;
    healthStats: string;
  };
  thresholds: {
    highHeartRate: number;
    lowHeartRate: number;
    lowOxygen: number;
    highTemperature: number;
    fallSensitivity: string;
  };
  privacy: {
    locationCollection: boolean;
    dataAnalysis: boolean;
    autoReport: boolean;
  };
}

export interface Incident {
  id: string;
  memberId: string;
  memberName: string;
  timestamp: string;
  type: '낙상 감지' | '심박 이상' | 'SOS 호출' | '미활동' | '안심존 이탈';
  severity: '위험' | '주의' | '정보';
  status: '신규' | '처리 중' | '완료' | '오작동';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  aiConfidence: number; // 0-100
  aiAnalysis?: string;
  heartRate?: number;
  biometricsSnapshot?: Partial<Biometrics>;
  deviceSnapshot?: {
    modelName: string;
    modelNumber?: string;
    manufacturer?: string;
    firmwareVersion?: string;
    batteryLevel: number;
  };
}

export interface SystemStats {
  totalMembers: number;
  activeAlerts: number;
  systemHealth: number;
  aiAccuracy: number;
}

export enum Page {
  MEMBERS = 'members',
  HISTORY = 'history',
  SETTINGS = 'settings'
}