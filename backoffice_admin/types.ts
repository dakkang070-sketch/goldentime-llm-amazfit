/**
 * 관리자 회원 상세 패널에서 표시하는 최신 생체 요약 구조입니다.
 */
export interface Biometrics {
  heartRate: number; // bpm
  bloodPressure: string; // systolic/diastolic
  bloodOxygen: number; // %
  sleep: number; // hours
  steps: number; // steps
  temperature: number; // Celsius
  bloodGlucose: number; // mg/dL
  stress: number; // 0-100
  hrv: number; // ms
  fallScore: number; // 0-100
  emergencyScore: number; // 0-100
  ecg: '정상' | '비정상' | '노이즈';
  gyroscope: '안정' | '미세 움직임' | '활발함' | '낙상 감지';
}

/**
 * 회원과 연결된 보호자 기본 연락 정보 구조입니다.
 */
export interface Guardian {
  name: string;
  relationship: string;
  phone: string;
}

/**
 * 계정별 소속 지역과 담당 복지사명을 함께 표현하는 공통 구조입니다.
 */
export interface RegionAffiliation {
  city: string;
  district: string;
  dong: string;
  welfareName?: string;
}

/**
 * 회원 계정에 연결된 웨어러블 기기 요약 정보 구조입니다.
 */
export interface ConnectedDevice {
  modelName: string;
  serialNumber: string;
  lastSyncTime: string;
  batteryEfficiency: string; // e.g., "48시간 예상"
  signalQuality: string; // e.g., "양호 (98%)"
  image?: string;
}

/**
 * 회원 단위 앱 설정과 수집 정책 상태를 담는 구조입니다.
 */
export interface MemberSettings {
  autoReportEnabled: boolean;
  locationCollectionEnabled: boolean;
  healthAnalysisEnabled: boolean;
  transmissionInterval: string; // e.g. "10초"
}

/**
 * 일별 차트에서 공통으로 사용하는 이름/값 쌍 데이터입니다.
 */
export interface DailyStat {
  name: string; // '월', '화' etc.
  value: number;
}

/**
 * 회원 상세의 건강 통계 카드와 차트에서 사용하는 집계 구조입니다.
 */
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
  llmRealtimeInterpretation: string;
  llmAnalyzedAt?: string;
  llmModel?: string;
}

/**
 * 관리자 앱 전역에서 사용하는 회원 상세 뷰모델 구조입니다.
 */
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
  assignedControllerName?: string;
  assignedControllerPhone?: string;
  affiliation: RegionAffiliation;
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
  accountStatus: 'pending' | 'active' | 'suspended' | 'withdrawn' | 'rejected';
  biometrics: Biometrics;
}

/**
 * 승인 화면에서 사용하는 회원 가입 신청 요약 구조입니다.
 */
export interface PendingMemberApproval {
  id: string;
  name: string;
  email: string;
  phone: string;
  affiliation: RegionAffiliation;
  guardianName: string;
  guardianPhone: string;
  createdAt: string;
  accountStatus: 'pending' | 'active' | 'suspended' | 'withdrawn' | 'rejected';
}

/**
 * 승인 화면에서 사용하는 관제요원/복지담당자 가입 신청 요약 구조입니다.
 */
export interface PendingStaffApproval {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'controller' | 'medical' | 'admin';
  affiliation: RegionAffiliation;
  createdAt: string;
  accountStatus: 'pending' | 'active' | 'suspended' | 'withdrawn' | 'rejected';
}

/**
 * 승인 화면에서 사용하는 복지사 소속 변경 요청 요약 구조입니다.
 */
export interface PendingStaffAffiliationApproval {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'medical';
  affiliation: RegionAffiliation;
  requestedAffiliation: RegionAffiliation;
  requestedAt: string;
}

/**
 * 관리자 계정이 접근 가능한 백오피스 메뉴 식별자입니다.
 */
export type AdminMenuPermission = 'controllers' | 'welfare' | 'members' | 'guardians' | 'history' | 'settings' | 'admins';

/**
 * 보호자 관리 페이지에서 연결 회원 요약으로 사용하는 구조입니다.
 */
export interface GuardianLinkedMember {
  memberId: string;
  memberName: string;
  memberPhone: string;
  memberStatus: Member['status'];
  accountStatus: Member['accountStatus'];
  affiliationLabel: string;
}

/**
 * 보호자 관리 페이지에서 한 보호자 묶음을 표현하는 구조입니다.
 */
export interface GuardianDirectoryEntry {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  linkedMembers: GuardianLinkedMember[];
  memberCount: number;
  activeMemberCount: number;
  regionSummary: string;
}

/**
 * 관리자 목록/상세에서 사용하는 계정 구조입니다.
 */
export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin';
  affiliation: RegionAffiliation;
  createdAt: string;
  accountStatus: 'pending' | 'active' | 'suspended' | 'withdrawn' | 'rejected';
  menuPermissions: AdminMenuPermission[];
}

/**
 * 회원 수동 등록 화면에서 입력받는 최소 필드 구조입니다.
 */
export interface ManualMemberRegistrationInput {
  name: string;
  phone: string;
  email: string;
  password: string;
  birthDate: string;
  age: number;
  gender: '남' | '여';
  height: number;
  weight: number;
  bloodType: string;
  city: string;
  district: string;
  dong: string;
  welfareName: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelationship: string;
}

/**
 * 관제요원/복지사 수동 등록 화면에서 입력받는 최소 필드 구조입니다.
 */
export interface ManualStaffRegistrationInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  district: string;
  dong: string;
  phoneVerificationToken?: string;
}

/**
 * 관제요원/복지사 상세 패널에서 수정 가능한 계정 정보 입력 구조입니다.
 */
export interface StaffAccountUpdateInput {
  email: string;
  phone: string;
  role: 'controller' | 'medical' | 'admin';
  city: string;
  district: string;
  dong: string;
}

/**
 * 관리자 수동 등록 화면에서 입력받는 최소 필드 구조입니다.
 */
export interface ManualAdminRegistrationInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  menuPermissions: AdminMenuPermission[];
  phoneVerificationToken?: string;
}

/**
 * 관리자 상세 패널에서 수정 가능한 기본 정보와 메뉴 권한 구조입니다.
 */
export interface AdminAccountUpdateInput {
  email: string;
  phone: string;
  menuPermissions: AdminMenuPermission[];
}

/**
 * 관리자 설정 화면에서 편집하는 시스템 전역 설정 구조입니다.
 */
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

/**
 * 라이브 모니터와 이력 화면에 표시할 사고/알림 이벤트 구조입니다.
 */
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
  // 사고 당시 핵심 생체/기기 값만 부분 스냅샷으로 남겨 상세 패널에서 근거 카드로 재사용합니다.
  biometricsSnapshot?: Partial<Biometrics>;
  deviceSnapshot?: {
    modelName: string;
    modelNumber?: string;
    manufacturer?: string;
    firmwareVersion?: string;
    batteryLevel: number;
  };
}

/**
 * 관리자 대시보드 상단 요약 카드에 쓰는 전체 통계 구조입니다.
 */
export interface SystemStats {
  totalMembers: number;
  activeAlerts: number;
  systemHealth: number;
  aiAccuracy: number;
}

/**
 * 관리자 앱 사이드바에서 전환 가능한 페이지 식별자 enum입니다.
 */
export enum Page {
  CONTROLLERS = 'controllers',
  WELFARE = 'welfare',
  MEMBERS = 'members',
  GUARDIANS = 'guardians',
  HISTORY = 'history',
  SETTINGS = 'settings',
  ADMINS = 'admins',
}
