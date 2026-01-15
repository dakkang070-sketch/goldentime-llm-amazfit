
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
  lat: number;
  lng: number;
  vitals: Vitals;
  symptoms: string[];
  aiAnalysis?: string | null;
  llmModel?: string | null;
  recommendedHospitalId?: string;
  matchedAmbulanceId?: string;
  severityScore?: number;
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
