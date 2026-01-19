
export enum PatientStatus {
  CRITICAL = 'Critical',
  SERIOUS = 'Serious',
  STABLE = 'Stable',
  PENDING = 'Pending',
  TRANSPORTED = 'Transported'
}

export enum AmbulanceStatus {
  AVAILABLE = 'Available',
  DISPATCHED = 'Dispatched',
  BUSY = 'Busy'
}

export interface Ambulance {
  id: string;
  unitName: string;
  lat: number;
  lng: number;
  status: AmbulanceStatus;
  type: 'ALS' | 'BLS';
  path?: [number, number][];
  pathStep?: number;
  // 상세 활동 상태 추가
  activity?: 'heading_to_patient' | 'transporting_to_hospital' | 'returning';
  targetHospitalId?: string;
  targetPatientId?: string;
}

export interface Vitals {
  heartRate: number;
  bloodPressure: string;
  oxygenLevel: number;
  bodyTemp: number;
  lastUpdated: string;
  history: { time: string; hr: number; spo2: number }[];
  ecgPattern?: 'Normal' | 'Atrial Fibrillation' | 'Sinus Tachycardia' | 'Arrhythmia';
  fallDetected?: boolean;
  activityContext?: 'Resting' | 'Walking' | 'Running' | 'Sudden Stop';
  stressLevel?: number;
}

export interface LocationData {
  gpsLocation?: {
    lat: number;
    lng: number;
    accuracy: number; // 미터 단위
    timestamp: string;
    source: 'smartwatch' | 'mobile_gps';
  };
  cellularLocation?: {
    lat: number;
    lng: number;
    accuracy: number; // 미터 단위
    timestamp: string;
    cellTowerId: string;
    signalStrength: number;
  };
  wifiLocation?: {
    lat: number;
    lng: number;
    accuracy: number; // 미터 단위
    timestamp: string;
    connectedBssid: string;
    nearbyAPs: number;
  };
  fusedLocation: {
    lat: number;
    lng: number;
    accuracy: number; // 융합된 최종 정확도
    confidence: number; // 0-100% 신뢰도
    algorithm: 'multimodal_fusion';
    timestamp: string;
  };
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  birthDate: string;
  bloodType: string;
  imageUrl: string;
  gender: 'M' | 'F' | 'O';
  status: PatientStatus;
  location: string;
  detailAddress?: string;
  lat: number;
  lng: number;
  locationData?: LocationData; // 멀티모달 위치 데이터
  vitals: Vitals;
  symptoms: string[];
  aiAnalysis?: string | null;
  llmModel?: string | null;
  recommendedHospitalId?: string;
  matchedAmbulanceId?: string;
  severityScore?: number;
  hospitalMatchReason?: string;
  hospitalMatchedAt?: string;
}

export interface Hospital {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  availableBeds?: number;
  totalBeds?: number;
  icuBeds: { available: number; total: number };
  erBeds: { available: number; total: number };
  operatingRooms?: { available: number; total: number };
  specialties: string[];
  surgicalCapabilities?: { name: string; isAvailable: boolean }[];
  bloodSupply?: 'Normal' | 'Low' | 'Critical';
  distance: string | number;
  isEROpen: boolean;
  activeTraumaLevel: number;
  phone?: string;
  emergencyPhone?: string;
  equipment?: any;
  lastUpdated?: string;
}

export interface FireStation {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
}

export interface FireStation {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
}

export interface TriageResult {
  severityScore: number;
  analysisSummary: string;
  requiredSpecialties: string[];
  urgencyLevel: 'Immediate' | 'Urgent' | 'Standard';
}
