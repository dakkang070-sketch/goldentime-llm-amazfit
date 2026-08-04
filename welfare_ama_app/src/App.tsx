import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  Eye,
  EyeOff,
  FileText,
  LogIn,
  LogOut,
  LoaderCircle,
  LockKeyhole,
  Mail,
  LocateFixed,
  KeyRound,
  MapPinned,
  Menu,
  Minus,
  Phone,
  Plus,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react';
import {
  MEMBER_REGION_CATALOG,
  getMemberAreaOptions,
  getMemberDistrictOptions,
} from './constants/memberRegionCatalog';

type TabKey = 'members' | 'alerts' | 'mypage' | 'policy';
type RiskLabel = '정상' | '주의' | '응급';
type WelfareMetricDetailKey = 'heartRate' | 'spo2' | 'bodyTemperature' | 'steps' | 'stressLevel' | 'fallScore';
type WelfareAuthMode = 'login' | 'signup';
type DashboardRefreshMode = 'auto' | 'manual';

const WELFARE_EMAIL_DOMAIN_OPTIONS = ['gmail.com', 'naver.com', 'daum.net', 'hanmail.net', 'kakao.com', 'nate.com'] as const;

/**
 * 복지사앱 브라우저 알림 권한을 요청합니다.
 */
function requestWelfareNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  if (window.Notification.permission === 'default') {
    window.Notification.requestPermission().catch(() => {});
  }
}

/**
 * 복지사앱 알림 변화를 브라우저 알림으로 전달합니다.
 */
function notifyWelfare(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  if (window.Notification.permission !== 'granted') {
    return;
  }
  new window.Notification(title, { body });
}

/**
 * 복지사 회원가입 이메일을 아이디/도메인 선택 UI 상태로 분해합니다.
 */
function parseWelfareSignupEmailFields(
  value: string,
): { localPart: string; domainOption: string; customDomain: string } {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized.includes('@')) {
    return {
      localPart: normalized,
      domainOption: '',
      customDomain: '',
    };
  }

  const [localPart, rawDomain = ''] = normalized.split('@');
  const domain = rawDomain.trim();
  const matchedDomain = WELFARE_EMAIL_DOMAIN_OPTIONS.find((option) => option === domain);

  return {
    localPart: localPart.trim(),
    domainOption: matchedDomain || (domain ? 'custom' : ''),
    customDomain: matchedDomain ? '' : domain,
  };
}

/**
 * 복지사 회원가입 이메일 아이디/도메인 입력값을 실제 저장용 이메일 문자열로 합칩니다.
 */
function buildWelfareSignupEmailValue({
  localPart,
  domainOption,
  customDomain,
}: {
  localPart: string;
  domainOption: string;
  customDomain: string;
}): string {
  const normalizedLocalPart = String(localPart || '').replace(/\s/g, '').toLowerCase();
  const normalizedDomain =
    domainOption === 'custom'
      ? String(customDomain || '').replace(/\s/g, '').toLowerCase()
      : String(domainOption || '').replace(/\s/g, '').toLowerCase();

  if (!normalizedLocalPart) return '';
  if (!normalizedDomain) return normalizedLocalPart;
  return `${normalizedLocalPart}@${normalizedDomain}`;
}

interface Affiliation {
  city?: string;
  district?: string;
  dong?: string;
  welfareName?: string;
}

interface EmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

interface ApiUser {
  _id: string;
  name?: string;
  age?: number;
  birthDate?: string;
  gender?: string;
  phone?: string;
  status?: string;
  accountStatus?: string;
  medicalConditions?: string[];
  medications?: string;
  allergies?: string;
  medicalHistory?: {
    chronicDiseases?: Array<{ disease?: string } | string>;
    medications?: Array<{ name?: string } | string>;
    allergies?: Array<{ substance?: string } | string>;
  };
  affiliation?: Affiliation;
  emergencyContact?: EmergencyContact;
  latestHealth?: {
    heartRate?: number;
    spO2?: number;
    bodyTemperature?: number;
    steps?: number;
    stressLevel?: number;
    fallScore?: number;
    emergencyScore?: number;
    collectedAt?: string;
    location?: {
      address?: string;
      lat?: number;
      lng?: number;
    };
    rawData?: {
      isWear?: boolean;
    };
  } | null;
  latestLlmAnalysis?: {
    analysisText?: string;
    analyzedAt?: string | null;
    model?: string;
  } | null;
  wearableDevice?: {
    lastSyncAt?: string;
    lastKnownLocation?: {
      address?: string;
      lat?: number;
      lng?: number;
    };
  };
}

interface MonitoredUser {
  _id: string;
  isOnline?: boolean;
  latestBiometric?: {
    heartRate?: number;
    spO2?: number;
    bodyTemperature?: number;
    steps?: number;
    stressLevel?: number;
    recentFallPeakScore?: number;
    emergencyScore?: number;
    collectedAt?: string;
    location?: {
      address?: string;
      lat?: number;
      lng?: number;
    };
    rawData?: {
      isWear?: boolean;
    };
  } | null;
}

interface WelfareStaff {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  accountStatus?: string;
  affiliation?: Affiliation;
  pendingAffiliationChange?: (Affiliation & { requestedAt?: string | null }) | null;
}

interface WelfareSession {
  token: string;
  email: string;
  name: string;
  role: string;
}

interface WelfareSystemOverview {
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

interface WelfareShadowConsistencyResponse {
  scope: string;
  summary: {
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
    };
    workflowTrend: {
      totalMismatchCount: number;
      consecutiveMismatchCount: number;
    };
  };
}

interface EmergencyCaseRow {
  _id: string;
  emergencyLevel?: number;
  status?: string;
  createdAt?: string;
  detectedAt?: string;
  userId?: {
    _id?: string;
    name?: string;
  };
  llmAnalysis?:
    | string
    | {
        analysisText?: string;
      };
  biometricSnapshot?: {
    analysis?: {
      analysisResult?: string;
    };
  };
}

interface MemberRow {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelationship: string;
  affiliation: Required<Affiliation>;
  heartRate?: number;
  spo2?: number;
  bodyTemperature?: number;
  steps?: number;
  stressLevel?: number;
  fallScore?: number;
  emergencyScore?: number;
  collectedAt?: string;
  llmAnalysis: string;
  llmAnalyzedAt?: string | null;
  statusText: string;
  riskLabel: RiskLabel;
  riskScore: number;
  isWear: boolean;
  isOnline: boolean;
  locationAddress: string;
  locationLat?: number;
  locationLng?: number;
  medicalConditions: string;
  medications: string;
  allergies: string;
}

/**
 * 회원 성별 코드를 복지사앱 표기용 한글 라벨로 정규화합니다.
 */
function normalizeMemberGenderLabel(gender?: string): string {
  if (gender === 'female' || gender === 'F' || gender === '여') return '여'
  if (gender === 'male' || gender === 'M' || gender === '남') return '남'
  return '미상'
}

interface AlertItem {
  id: string;
  title: string;
  description: string;
  level: RiskLabel | '안내';
  createdAt?: string;
}

interface WelfareMetricHistoryPoint {
  collectedAt: string;
  value: number;
}

/**
 * 배열/단일값 혼합 구조의 건강 메모 데이터를 화면 표시용 문자열로 정리합니다.
 */
function formatWelfareMedicalEntries(
  entries: Array<{ disease?: string; name?: string; substance?: string } | string> | undefined,
  objectKey: 'disease' | 'name' | 'substance',
): string {
  if (!Array.isArray(entries) || entries.length === 0) {
    return '-';
  }

  const values = entries
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }
      return String(entry?.[objectKey] || '').trim();
    })
    .filter(Boolean);

  return values.length > 0 ? values.join(', ') : '-';
}

/** 복지사앱 약관 내용 – 6개 약관 정의 */
const POLICY_CONTENT: Record<string, { title: string; sections: { label: string; content: string }[] }> = {
  terms: {
    title: '서비스 이용약관',
    sections: [
      { label: '서비스 목적', content: '본 서비스는 복지사가 담당 회원의 생체 신호, 위치, 응급 상황을 실시간으로 모니터링하고 신속하게 대응할 수 있도록 지원하는 플랫폼입니다.' },
      { label: '복지사 의무', content: '복지사는 서비스 이용 중 확인한 회원의 개인정보 및 생체 데이터를 외부에 유출해서는 안 되며, 운영 지침과 내부 승인 절차를 준수해야 합니다.' },
      { label: '서비스 제한', content: '천재지변, 시스템 장애, 네트워크 불안정 등 불가항력적인 사유로 인해 서비스가 일시적으로 중단될 수 있으며, 이에 대한 책임은 면책됩니다.' },
    ],
  },
  privacy: {
    title: '개인정보 수집 및 이용 동의',
    sections: [
      { label: '수집 항목', content: '이름, 이메일, 전화번호, 소속 지역, 담당 회원 정보, 서비스 이용 기록 등이 수집됩니다.' },
      { label: '이용 목적', content: '회원 식별, 복지 업무 수행, 서비스 품질 향상, 통계 분석 및 고객 지원을 위해 개인정보를 이용합니다.' },
      { label: '보관 및 권리', content: '개인정보는 회원 탈퇴 시 즉시 파기되며, 관계 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 안전하게 보관 후 파기됩니다. 이용자는 언제든지 자신의 정보 열람, 정정, 삭제를 요청할 수 있습니다.' },
    ],
  },
  location: {
    title: '위치정보 수집 및 이용 동의',
    sections: [
      { label: '수집 목적', content: '담당 회원의 실시간 위치 파악, 응급 상황 발생 시 신속한 현장 출동 및 관제 서비스 제공을 위해 위치정보를 수집합니다.' },
      { label: '수집 항목', content: 'GPS 기반 실시간 위치 정보, 이동 경로, 방문 이력 등이 수집됩니다.' },
      { label: '보관 및 제공', content: '위치정보는 서비스 제공 목적 달성 시 즉시 파기되며, 법령에 따라 요청되는 경우를 제외하고 제3자에게 제공되지 않습니다.' },
    ],
  },
  biometric: {
    title: '생체데이터 수집 및 이용 동의',
    sections: [
      { label: '수집 목적', content: '담당 회원의 건강 상태 모니터링, 응급 상황 조기 감지 및 신속한 대응을 위해 생체 데이터를 수집합니다.' },
      { label: '수집 항목', content: '심박수(HR), 혈중산소(SpO₂), 체온, 걸음 수, 수면 데이터, 스트레스 지수 등 웨어러블 기기에서 측정된 생체 신호 데이터입니다.' },
      { label: '데이터 활용 및 권리', content: '수집된 생체 데이터는 응급 관제 및 건강 관리 목적으로만 사용되며, 이용자는 언제든지 데이터 수집 중단 및 삭제를 요청할 수 있습니다.' },
    ],
  },
  thirdParty: {
    title: '제3자 정보 제공 동의',
    sections: [
      { label: '제공 목적', content: '응급 상황 발생 시 119 구급대, 경찰서, 협력 병원 등 유관 기관과의 신속한 공조를 위해 필요한 최소한의 정보를 제공합니다.' },
      { label: '제공 대상 및 항목', content: '응급 구조 기관(이름, 위치, 생체 신호 요약), 보호자(비상 연락망에 등록된 연락처), 협력 병원(응급 이송 시 필수 의료 정보) 등입니다.' },
      { label: '보호 조치', content: '정보 제공 시 암호화 전송, 접근 권한 최소화, 제공 이력 기록 등 기술적·관리적 보호 조치를 적용하며, 목적 외 사용을 금지합니다.' },
    ],
  },
  wearable: {
    title: '웨어러블 기기 연동 및 실시간 모니터링 서비스 이용약관',
    sections: [
      { label: '서비스 개요', content: '본 서비스는 Amazfit 웨어러블 기기와 연동하여 사용자의 생체 데이터를 실시간으로 수집·분석하고 응급 상황에 대응하는 서비스입니다.' },
      { label: '기기 연동 조건', content: 'Bluetooth 연결이 가능한 Amazfit 기기가 필요하며, 기기와 모바일 앱이 정상적으로 페어링된 상태에서만 데이터 수집이 가능합니다.' },
      { label: '실시간 데이터', content: '심박수, 걸음 수, 위치 정보는 실시간(초 단위)으로 수집되며, 일부 생체 데이터(혈중산소, 체온 등)는 측정 주기에 따라 간헐적으로 수집될 수 있습니다.' },
      { label: '응급 대응 체계', content: '비정상 생체 신호(심박수 이상, 낙상 감지 등)가 탐지되면 관제센터에 자동 알림이 전송되며, 필요 시 응급 구조 기관에 연계됩니다.' },
      { label: '데이터 정확성', content: '웨어러블 기기의 센서 정확도는 기기 상태, 착용 방법, 환경 요인에 따라 달라질 수 있으며, 본 서비스는 의료 기기를 대체하지 않습니다.' },
      { label: '보안', content: '수집된 모든 데이터는 암호화되어 전송·저장되며, 접근 권한은 엄격히 통제됩니다.' },
    ],
  },
};

/** 복지사앱 약관 표시용 텍스트 – 각 약관의 섹션을 하나의 문자열로 조합 */
function formatPolicyContent(key: string): string {
  const policy = POLICY_CONTENT[key];
  if (!policy) return '';
  return policy.sections
    .map((s) => `[${s.label}]\n${s.content}`)
    .join('\n\n');
}
const WELFARE_REALTIME_REFRESH_MS = 3_000;
const WELFARE_AUTH_STORAGE_KEY = 'welfare_mobile_session_v1';
const WELFARE_AUTO_LOGIN_STORAGE_KEY = 'welfare_mobile_auto_login_v1';
const WELFARE_LOGIN_ID_STORAGE_KEY = 'gt_welfare_login_id';

/**
 * 저장된 복지사 로그인 세션을 자동로그인(localStorage) 우선, 임시 세션(sessionStorage) 차선으로 읽습니다.
 */
function readStoredWelfareSession(): WelfareSession | null {
  try {
    const persisted = String(localStorage.getItem(WELFARE_AUTH_STORAGE_KEY) || '').trim();
    if (persisted) {
      return JSON.parse(persisted) as WelfareSession;
    }
  } catch {
    // no-op
  }

  try {
    const temporary = String(sessionStorage.getItem(WELFARE_AUTH_STORAGE_KEY) || '').trim();
    if (temporary) {
      return JSON.parse(temporary) as WelfareSession;
    }
  } catch {
    // no-op
  }

  return null;
}

/**
 * 복지사 로그인 세션을 자동로그인 여부에 따라 localStorage 또는 sessionStorage에 저장합니다.
 */
function persistWelfareSession(session: WelfareSession, autoLogin: boolean): void {
  try {
    if (autoLogin) {
      localStorage.setItem(WELFARE_AUTH_STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem(WELFARE_AUTO_LOGIN_STORAGE_KEY, '1');
      sessionStorage.removeItem(WELFARE_AUTH_STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(WELFARE_AUTH_STORAGE_KEY, JSON.stringify(session));
    localStorage.removeItem(WELFARE_AUTH_STORAGE_KEY);
    localStorage.removeItem(WELFARE_AUTO_LOGIN_STORAGE_KEY);
  } catch {
    // no-op
  }
}

/**
 * 저장된 복지사 로그인 세션과 자동로그인 설정을 모두 지웁니다.
 */
function clearStoredWelfareSession(): void {
  try {
    localStorage.removeItem(WELFARE_AUTH_STORAGE_KEY);
    localStorage.removeItem(WELFARE_AUTO_LOGIN_STORAGE_KEY);
  } catch {
    // no-op
  }

  try {
    sessionStorage.removeItem(WELFARE_AUTH_STORAGE_KEY);
  } catch {
    // no-op
  }
}

/**
 * 현재 실행 환경에 맞는 복지사앱 백엔드 기본 주소를 결정합니다.
 */
function resolveWelfareApiBase(): string {
  try {
    const { origin, protocol } = window.location;
    if ((protocol === 'http:' || protocol === 'https:') && origin) {
      return origin;
    }
  } catch {
    // no-op
  }
  return '';
}

/**
 * 복지사앱 API 경로를 현재 실행 환경 기준의 절대 주소로 정규화합니다.
 */
function resolveWelfareApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${resolveWelfareApiBase()}${normalizedPath}`;
}

/**
 * 저장된 복지사 토큰이 있으면 API 요청 헤더에 Authorization을 추가합니다.
 */
function buildWelfareAuthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers = {
    Accept: 'application/json',
    ...(extraHeaders || {}),
  };
  const savedSession = readStoredWelfareSession();
  if (savedSession?.token) {
    return {
      ...headers,
      Authorization: `Bearer ${savedSession.token}`,
    };
  }
  return headers;
}

/**
 * JSON API를 호출하고 파싱된 결과를 반환합니다.
 */
async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(resolveWelfareApiUrl(path), {
    headers: buildWelfareAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * 수정/저장 요청에 사용하는 JSON API 호출 공통 함수입니다.
 */
async function requestJson<T>(path: string, method: 'POST' | 'PATCH' | 'PUT', body: Record<string, unknown>): Promise<T> {
  const response = await fetch(resolveWelfareApiUrl(path), {
    method,
    headers: buildWelfareAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as T & { message?: string } | null;
  if (!response.ok) {
    throw new Error(json?.message || `HTTP ${response.status}`);
  }
  return (json || {}) as T;
}

/**
 * 소속 문자열 비교를 위해 공백과 대소문자를 정리합니다.
 */
function normalizeText(value: string | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

/**
 * 백엔드 affiliation 값을 화면 공통 구조로 정규화합니다.
 */
function normalizeAffiliation(affiliation?: Affiliation): Required<Affiliation> {
  return {
    city: affiliation?.city || '',
    district: affiliation?.district || '',
    dong: affiliation?.dong || '',
    welfareName: affiliation?.welfareName || '',
  };
}

/**
 * 생년월일과 나이 후보값을 합쳐 화면 표시용 나이를 계산합니다.
 */
function resolveAge(age?: number, birthDate?: string): number {
  if (typeof age === 'number' && Number.isFinite(age) && age > 0) return age;
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let result = today.getFullYear() - birth.getFullYear();
  const hasNotHadBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (hasNotHadBirthday) result -= 1;
  return Math.max(0, result);
}

/**
 * 상태 배지 우선순위를 위해 회원 위험 점수를 계산합니다.
 */
function resolveRiskScore(user: ApiUser, monitored?: MonitoredUser): number {
  const health = user.latestHealth || {};
  const monitoredHealth = monitored?.latestBiometric || {};
  const heartRate =
    typeof monitoredHealth.heartRate === 'number' ? monitoredHealth.heartRate : health.heartRate;
  const spo2 = typeof monitoredHealth.spO2 === 'number' ? monitoredHealth.spO2 : health.spO2;
  const emergencyScore =
    typeof monitoredHealth.emergencyScore === 'number'
      ? monitoredHealth.emergencyScore
      : typeof health.emergencyScore === 'number'
        ? health.emergencyScore
        : 0;
  const fallScore =
    typeof monitoredHealth.recentFallPeakScore === 'number'
      ? monitoredHealth.recentFallPeakScore
      : typeof health.fallScore === 'number'
        ? health.fallScore
        : 0;

  let score = Math.max(emergencyScore, fallScore);
  if (typeof heartRate === 'number' && (heartRate < 45 || heartRate > 120)) score = Math.max(score, 88);
  if (typeof spo2 === 'number' && spo2 <= 90) score = Math.max(score, 92);
  if (typeof spo2 === 'number' && spo2 <= 94) score = Math.max(score, 70);
  if (user.status === '위험') score = Math.max(score, 90);
  if (user.status === '주의') score = Math.max(score, 70);
  return score;
}

/**
 * 계산된 점수를 설계서 배지 기준의 정상/주의/응급으로 바꿉니다.
 */
function resolveRiskLabel(score: number): RiskLabel {
  if (score >= 85) return '응급';
  if (score >= 60) return '주의';
  return '정상';
}

/**
 * 회원 카드에 표시할 대표 위치를 최신 생체값과 기기 위치에서 고릅니다.
 */
function pickReadableLocationAddress(
  ...candidates: Array<{ address?: string } | null | undefined>
): string {
  for (const candidate of candidates) {
    const address = typeof candidate?.address === 'string' ? candidate.address.trim() : '';
    if (address) {
      return address;
    }
  }
  return '';
}

/**
 * 회원 소속 정보를 주소 대체 문구로 정리합니다.
 */
function buildAffiliationAddressFallback(affiliation?: Affiliation): string {
  const normalized = normalizeAffiliation(affiliation);
  return [normalized.city, normalized.district, normalized.dong].filter(Boolean).join(' ');
}

/**
 * 좌표만 남아 있을 때 복지사앱에 표시할 좌표 문구를 만듭니다.
 */
function buildCoordinateAddressFallback(lat?: number, lng?: number): string {
  if (!hasValidCoordinates(lat, lng)) {
    return '';
  }
  return `좌표 ${lat!.toFixed(5)}, ${lng!.toFixed(5)}`;
}

/**
 * 회원 카드에 표시할 대표 위치를 최신 생체값과 기기 위치에서 고릅니다.
 */
function resolveLocation(user: ApiUser, monitored?: MonitoredUser) {
  const healthLocation = user.latestHealth?.location;
  const monitoredLocation = monitored?.latestBiometric?.location;
  const deviceLocation = user.wearableDevice?.lastKnownLocation;
  const coordinateSource =
    [monitoredLocation, healthLocation, deviceLocation].find((candidate) =>
      hasValidCoordinates(candidate?.lat, candidate?.lng),
    ) || {};
  const address =
    pickReadableLocationAddress(monitoredLocation, healthLocation, deviceLocation) ||
    buildAffiliationAddressFallback(user.affiliation) ||
    buildCoordinateAddressFallback(coordinateSource.lat, coordinateSource.lng) ||
    '위치 정보 없음';
  return {
    address,
    lat: coordinateSource.lat,
    lng: coordinateSource.lng,
  };
}

/**
 * 현재 로그인 대신 사용할 복지사 계정을 목록에서 하나 선택합니다.
 */
function pickCurrentWelfare(staffs: WelfareStaff[], sessionEmail?: string): WelfareStaff | null {
  const normalizedSessionEmail = String(sessionEmail || '').trim().toLowerCase();
  if (normalizedSessionEmail) {
    const matched = staffs.find(
      (staff) =>
        staff.role === 'medical' &&
        String(staff.email || '').trim().toLowerCase() === normalizedSessionEmail,
    );
    if (matched) return matched;
  }
  const activeMedical = staffs.find((staff) => staff.role === 'medical' && staff.accountStatus === 'active');
  if (activeMedical) return activeMedical;
  const anyMedical = staffs.find((staff) => staff.role === 'medical');
  return anyMedical || null;
}

/**
 * 현재 복지사 기준으로 담당 회원 범위를 1차 선별합니다.
 */
function filterAssignedUsers(rows: MemberRow[], currentWelfare: WelfareStaff | null): MemberRow[] {
  if (!currentWelfare) return rows;
  const staffAffiliation = normalizeAffiliation(currentWelfare.affiliation);
  const byName = rows.filter(
    (row) =>
      normalizeText(row.affiliation.welfareName) &&
      normalizeText(row.affiliation.welfareName) === normalizeText(currentWelfare.name),
  );
  if (byName.length > 0) return byName;

  const byRegion = rows.filter(
    (row) =>
      normalizeText(row.affiliation.city) === normalizeText(staffAffiliation.city) &&
      normalizeText(row.affiliation.district) === normalizeText(staffAffiliation.district) &&
      normalizeText(row.affiliation.dong) === normalizeText(staffAffiliation.dong),
  );
  if (byRegion.length > 0) return byRegion;
  return rows;
}

/**
 * 사용자 목록과 모니터링 목록을 합쳐 복지사 회원 카드 구조를 만듭니다.
 */
function buildMemberRows(users: ApiUser[], monitoredUsers: MonitoredUser[], currentWelfare: WelfareStaff | null): MemberRow[] {
  const monitoredMap = new Map(monitoredUsers.map((row) => [row._id, row]));
  const baseRows = users
    .filter((user) => user.accountStatus !== 'withdrawn' && user.accountStatus !== 'rejected')
    .map((user) => {
      const monitored = monitoredMap.get(user._id);
      const affiliation = normalizeAffiliation(user.affiliation);
      const riskScore = resolveRiskScore(user, monitored);
      const riskLabel = resolveRiskLabel(riskScore);
      const health = user.latestHealth || {};
      const monitoredHealth = monitored?.latestBiometric || {};
      const location = resolveLocation(user, monitored);
      const wearValue =
        typeof monitoredHealth.rawData?.isWear === 'boolean'
          ? monitoredHealth.rawData.isWear
          : typeof health.rawData?.isWear === 'boolean'
            ? health.rawData.isWear
            : true;

      return {
        id: user._id,
        name: user.name || '이름 없음',
        age: resolveAge(user.age, user.birthDate),
        gender: normalizeMemberGenderLabel(user.gender),
        phone: user.phone || '',
        guardianName: user.emergencyContact?.name || '보호자 정보 없음',
        guardianPhone: user.emergencyContact?.phone || '',
        guardianRelationship: user.emergencyContact?.relationship || '',
        affiliation,
        heartRate:
          typeof monitoredHealth.heartRate === 'number' ? monitoredHealth.heartRate : health.heartRate,
        spo2: typeof monitoredHealth.spO2 === 'number' ? monitoredHealth.spO2 : health.spO2,
        bodyTemperature:
          typeof monitoredHealth.bodyTemperature === 'number'
            ? monitoredHealth.bodyTemperature
            : health.bodyTemperature,
        steps: typeof monitoredHealth.steps === 'number' ? monitoredHealth.steps : health.steps,
        stressLevel:
          typeof monitoredHealth.stressLevel === 'number' ? monitoredHealth.stressLevel : health.stressLevel,
        fallScore:
          typeof monitoredHealth.recentFallPeakScore === 'number'
            ? monitoredHealth.recentFallPeakScore
            : health.fallScore,
        emergencyScore:
          typeof monitoredHealth.emergencyScore === 'number'
            ? monitoredHealth.emergencyScore
            : health.emergencyScore,
        collectedAt: monitoredHealth.collectedAt || health.collectedAt,
        llmAnalysis: user.latestLlmAnalysis?.analysisText || '최근 LLM 분석 내용이 없습니다.',
        llmAnalyzedAt: user.latestLlmAnalysis?.analyzedAt,
        statusText: user.status || '정상',
        riskLabel,
        riskScore,
        isWear: Boolean(wearValue),
        isOnline: Boolean(monitored?.isOnline),
        locationAddress: location.address,
        locationLat: location.lat,
        locationLng: location.lng,
        medicalConditions:
          Array.isArray(user.medicalConditions) && user.medicalConditions.length > 0
            ? user.medicalConditions.join(', ')
            : formatWelfareMedicalEntries(user.medicalHistory?.chronicDiseases, 'disease'),
        medications:
          user.medications ||
          formatWelfareMedicalEntries(user.medicalHistory?.medications, 'name'),
        allergies:
          user.allergies ||
          formatWelfareMedicalEntries(user.medicalHistory?.allergies, 'substance'),
      } satisfies MemberRow;
    });

  return filterAssignedUsers(baseRows, currentWelfare).sort((a, b) => b.riskScore - a.riskScore || a.name.localeCompare(b.name));
}

/**
 * 응급 케이스를 알림 화면에서 사용할 간단한 리스트 구조로 변환합니다.
 */
function buildAlertItems(cases: EmergencyCaseRow[], memberRows: MemberRow[]): AlertItem[] {
  const memberIds = new Set(memberRows.map((row) => row.id));
  const filtered = cases.filter((row) => !row.userId?._id || memberIds.has(row.userId._id));
  const mapped = filtered.map((row) => {
    const level = typeof row.emergencyLevel === 'number' ? row.emergencyLevel : 1;
    const risk: RiskLabel = level >= 4 ? '응급' : level >= 2 ? '주의' : '정상';
    const description =
      typeof row.llmAnalysis === 'string'
        ? row.llmAnalysis
        : row.llmAnalysis?.analysisText || row.biometricSnapshot?.analysis?.analysisResult || '알림 상세 내용이 없습니다.';
    return {
      id: row._id,
      title: `${row.userId?.name || '회원'} ${risk} 상태`,
      description,
      level: risk,
      createdAt: row.detectedAt || row.createdAt,
    } satisfies AlertItem;
  });

  if (mapped.length > 0) {
    return mapped.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  return [
    {
      id: 'notice-1',
      title: '복지사 모바일 운영 안내',
      description: '회원 목록은 담당 복지사 기준으로 우선 정렬되며, 최근 위험 점수가 높은 순서대로 노출됩니다.',
      level: '안내',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notice-2',
      title: '관제 협업 알림',
      description: '응급 단계 회원은 회원 및 보호자 연락 버튼으로 즉시 확인하고 관제센터와 후속 조치를 진행합니다.',
      level: '안내',
      createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
  ];
}

/**
 * 장치 placeholder 이름을 화면용 회원명으로 정리합니다.
 */
function resolveMemberDisplayName(name?: string): string {
  const text = String(name || '').trim();
  if (!text) return '회원 미등록';
  if (/^device[\s:_-]/i.test(text) || /^device$/i.test(text)) {
    return '회원 미등록';
  }
  return text;
}

/**
 * 숫자형 생체값을 화면용 문자열로 변환합니다.
 */
function formatMetric(value: number | undefined, suffix = ''): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return `${Math.round(value * (suffix === '°C' ? 10 : 1)) / (suffix === '°C' ? 10 : 1)}${suffix}`;
}

/**
 * 날짜 시각을 모바일 카드에서 읽기 쉬운 형태로 정리합니다.
 */
function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * 복지사 상세에서 선택한 생체 항목 값을 화면 표시용 문자열로 변환합니다.
 */
function formatWelfareMetricDetailValue(key: WelfareMetricDetailKey, value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  if (key === 'heartRate') return `${Math.round(value)} bpm`;
  if (key === 'spo2') return `${Math.round(value)}%`;
  if (key === 'bodyTemperature') return `${value.toFixed(1)}°C`;
  if (key === 'steps') return `${Math.round(value).toLocaleString()}보`;
  if (key === 'fallScore') return `${Math.round(value)}점`;
  return `${Math.round(value)}점`;
}

/**
 * 선택한 생체 항목의 현재 숫자 값을 회원 상세 데이터에서 꺼냅니다.
 */
function getWelfareMetricValue(member: MemberRow, key: WelfareMetricDetailKey): number | undefined {
  if (key === 'heartRate') return member.heartRate;
  if (key === 'spo2') return member.spo2;
  if (key === 'bodyTemperature') return member.bodyTemperature;
  if (key === 'steps') return member.steps;
  if (key === 'stressLevel') return member.stressLevel;
  return member.fallScore;
}

/**
 * 복지사앱은 최신값 중심 구조이므로 현재 회원 수치를 기준으로 상세 추세용 샘플 이력을 만듭니다.
 */
function buildWelfareMetricHistory(member: MemberRow, key: WelfareMetricDetailKey): WelfareMetricHistoryPoint[] {
  const currentValue = getWelfareMetricValue(member, key);
  if (typeof currentValue !== 'number' || !Number.isFinite(currentValue)) {
    return [];
  }

  const baseTime = member.collectedAt ? new Date(member.collectedAt).getTime() : Date.now();
  const seed = Array.from(member.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const offsets = [-5, -3, -1, 2, -2, 1, 3, -1, 2, 0];

  return offsets.map((offset, index) => {
    const ratioSeed = ((seed + index * 7) % 9) - 4;
    let nextValue = currentValue;
    if (key === 'steps') {
      nextValue = Math.max(0, currentValue - (9 - index) * (12 + ((seed + index) % 11)));
    } else if (key === 'bodyTemperature') {
      nextValue = Number((currentValue + offset * 0.06 + ratioSeed * 0.01).toFixed(1));
    } else if (key === 'spo2') {
      nextValue = Math.max(82, Math.min(100, Math.round(currentValue + offset * 0.4 + ratioSeed * 0.2)));
    } else if (key === 'heartRate') {
      nextValue = Math.max(35, Math.round(currentValue + offset * 1.8 + ratioSeed));
    } else if (key === 'stressLevel') {
      nextValue = Math.max(0, Math.min(100, Math.round(currentValue + offset * 2 + ratioSeed * 1.2)));
    } else {
      nextValue = Math.max(0, Math.round(currentValue + offset * 1.4 + ratioSeed));
    }

    return {
      collectedAt: new Date(baseTime - (9 - index) * 5 * 60 * 1000).toISOString(),
      value: nextValue,
    };
  });
}

/**
 * 숫자 이력 목록을 간단한 SVG 선 그래프 경로로 변환합니다.
 */
function buildWelfareMetricChartPath(points: WelfareMetricHistoryPoint[]) {
  const values = points.map((point) => point.value);
  if (values.length === 0) {
    return { path: '', min: 0, max: 0 };
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const width = 300;
  const height = 120;
  const padding = 10;
  const range = max - min || 1;

  const path = values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return { path, min, max };
}

/**
 * 복지사 상단 바에 노출할 소속 문자열을 만듭니다.
 */
function buildAffiliationLabel(affiliation?: Affiliation): string {
  const normalized = normalizeAffiliation(affiliation);
  return [normalized.district, normalized.dong].filter(Boolean).join(' | ') || '소속 미지정';
}

/**
 * 지도 표시가 가능한 위도/경도 값인지 검사합니다.
 */
function hasValidCoordinates(lat?: number, lng?: number): boolean {
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

type LeafletModule = typeof import('leaflet');

/**
 * 상세/확대 화면에서 공통으로 사용하는 터치 제스처 지도 프레임을 렌더링합니다.
 */
function LiveMapFrame({
  lat,
  lng,
  address,
  memberName,
  heightClassName,
  zoom = 16,
  onZoomChange,
  interactive = true,
  onClick,
}: {
  lat?: number;
  lng?: number;
  address?: string;
  memberName?: string;
  heightClassName: string;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const routeLineRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const validCoordinates = hasValidCoordinates(lat, lng);
  const [isLocatingCurrentPosition, setIsLocatingCurrentPosition] = useState(false);
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isTrackingRoute, setIsTrackingRoute] = useState(false);
  const [routeSummary, setRouteSummary] = useState<{ distanceText: string; durationText: string } | null>(null);

  /**
   * 현재 지도에 표시된 경로선을 제거합니다.
   */
  const clearRouteLine = useCallback(() => {
    if (routeLineRef.current && mapRef.current) {
      mapRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
  }, []);

  /**
   * 현재 위치와 회원 위치를 기준으로 도로 경로를 계산해 지도에 그립니다.
   */
  const drawRouteToMember = useCallback(
    async (startLat: number, startLng: number, fitToBounds: boolean = true) => {
      if (!mapRef.current || !leafletRef.current || !hasValidCoordinates(startLat, startLng) || !hasValidCoordinates(lat, lng)) {
        return;
      }

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${lng},${lat}?overview=full&geometries=geojson`,
        );
        const payload = await response.json();
        const route = payload?.routes?.[0];
        const coordinates = route?.geometry?.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length === 0) {
          return;
        }

        const distanceMeters = typeof route?.distance === 'number' ? route.distance : 0;
        const durationSeconds = typeof route?.duration === 'number' ? route.duration : 0;
        const distanceText = distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)}km` : `${Math.round(distanceMeters)}m`;
        const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
        const durationText = durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}시간 ${durationMinutes % 60}분` : `${durationMinutes}분`;

        clearRouteLine();
        setRouteSummary({ distanceText, durationText });
        const routeLatLngs = coordinates.map((coordinate: [number, number]) => [coordinate[1], coordinate[0]]);
        routeLineRef.current = leafletRef.current
          .polyline(routeLatLngs, {
            color: '#0f766e',
            weight: 5,
            opacity: 0.85,
          })
          .addTo(mapRef.current);

        if (fitToBounds) {
          mapRef.current.fitBounds(routeLineRef.current.getBounds(), {
            padding: [40, 40],
          });
        }
      } catch {
        return;
      }
    },
    [clearRouteLine, lat, lng],
  );

  /**
   * 현재 기기 위치 마커를 표시하고 지도를 해당 좌표로 이동합니다.
   */
  const focusCurrentPosition = useCallback(
    (nextLat: number, nextLng: number) => {
      if (!mapRef.current || !leafletRef.current || !hasValidCoordinates(nextLat, nextLng)) {
        return;
      }

      const L = leafletRef.current;
      if (!currentMarkerRef.current) {
        currentMarkerRef.current = L.marker([nextLat, nextLng], {
          icon: L.divIcon({
            className: 'welfare-current-map-marker',
            html: '<div class="welfare-current-map-marker__pin"><span class="welfare-current-map-marker__pulse"></span><span class="welfare-current-map-marker__dot"></span></div>',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
        }).addTo(mapRef.current);
      } else {
        currentMarkerRef.current.setLatLng([nextLat, nextLng]);
      }

      setCurrentPosition({ lat: nextLat, lng: nextLng });
      mapRef.current.invalidateSize(false);
      mapRef.current.setView([nextLat, nextLng], 17, { animate: false });
      requestAnimationFrame(() => {
        if (!mapRef.current) {
          return;
        }
        mapRef.current.invalidateSize(false);
        mapRef.current.flyTo([nextLat, nextLng], 17, { animate: true, duration: 0.8 });
      });
      if (isRouteActive) {
        void drawRouteToMember(nextLat, nextLng, false);
      }
    },
    [drawRouteToMember, isRouteActive],
  );

  /**
   * 브라우저 GPS 기준 현재 위치를 읽어 지도 중심을 이동합니다.
   */
  const handleLocateCurrentPosition = useCallback(() => {
    if (!interactive || typeof navigator === 'undefined' || !navigator.geolocation || isLocatingCurrentPosition) {
      return;
    }

    setIsLocatingCurrentPosition(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        focusCurrentPosition(position.coords.latitude, position.coords.longitude);
        setIsLocatingCurrentPosition(false);
      },
      () => {
        setIsLocatingCurrentPosition(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [focusCurrentPosition, interactive, isLocatingCurrentPosition]);

  /**
   * 현재 위치에서 회원 위치까지의 경로 표시를 토글합니다.
   */
  const handleToggleRoute = useCallback(() => {
    if (!interactive || typeof navigator === 'undefined' || !navigator.geolocation || isTrackingRoute) {
      return;
    }

    if (isRouteActive) {
      setIsRouteActive(false);
      setIsTrackingRoute(false);
      clearRouteLine();
      setRouteSummary(null);
      return;
    }

    setIsTrackingRoute(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLat = position.coords.latitude;
        const nextLng = position.coords.longitude;
        focusCurrentPosition(nextLat, nextLng);
        setIsRouteActive(true);
        setIsTrackingRoute(false);
      },
      () => {
        setIsTrackingRoute(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [clearRouteLine, focusCurrentPosition, interactive, isRouteActive, isTrackingRoute]);

  useEffect(() => {
    if (!validCoordinates || !containerRef.current || mapRef.current) return;

    let cancelled = false;

    /**
     * Leaflet 지도를 초기화하고 터치 제스처를 활성화합니다.
     */
    async function initMap() {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current || !hasValidCoordinates(lat, lng)) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: interactive,
        touchZoom: interactive,
        doubleClickZoom: interactive,
        scrollWheelZoom: interactive,
        boxZoom: false,
        keyboard: false,
        tap: interactive,
      }).setView([lat as number, lng as number], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat as number, lng as number], {
        icon: L.divIcon({
          className: 'welfare-map-marker',
          html: `<div class="welfare-map-marker__wrap"><div class="welfare-map-marker__pin"><span class="welfare-map-marker__dot"></span></div><div class="welfare-map-marker__label">${memberName || '회원'}</div></div>`,
          iconSize: [112, 64],
          iconAnchor: [56, 18],
        }),
      }).addTo(map);

      map.on('zoomend', () => {
        onZoomChange?.(map.getZoom());
      });

      mapRef.current = map;
      markerRef.current = marker;

      // 모달/플렉스 레이아웃 안에서 처음 열릴 때 지도 타일이 어긋나는 현상을 바로잡습니다.
      requestAnimationFrame(() => {
        map.invalidateSize(false);
      });
      window.setTimeout(() => {
        map.invalidateSize(false);
      }, 120);

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserverRef.current = new ResizeObserver(() => {
          map.invalidateSize(false);
        });
        resizeObserverRef.current.observe(containerRef.current);
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      clearRouteLine();
      setRouteSummary(null);
    };
  }, [clearRouteLine, lat, lng, memberName, onZoomChange, validCoordinates, zoom]);

  useEffect(() => {
    if (!mapRef.current || !validCoordinates) return;
    mapRef.current.setZoom(zoom, { animate: false });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat as number, lng as number]);
    }
    if (currentPosition && isRouteActive) {
      void drawRouteToMember(currentPosition.lat, currentPosition.lng);
    }
  }, [currentPosition, drawRouteToMember, interactive, isRouteActive, lat, lng, validCoordinates, zoom]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      currentMarkerRef.current = null;
      routeLineRef.current = null;
      leafletRef.current = null;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, []);

  if (!validCoordinates) {
    return (
      <div className={`relative overflow-hidden rounded-[12px] border border-slate-300 bg-[linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] ${heightClassName}`}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-lg">
            <MapPinned size={20} />
          </div>
          <div className="mt-3 text-[14px] font-bold text-slate-700">위치 좌표 정보 없음</div>
          <div className="mt-1 break-words text-[14px] text-slate-500">{address || '주소 정보 없음'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[12px] border border-slate-300 bg-slate-100 ${heightClassName}`}>
      <div ref={containerRef} className="h-full w-full" />
      {interactive ? (
        <div className="absolute bottom-3 right-3 z-[900] flex items-center gap-2 min-[360px]:bottom-4 min-[360px]:right-4">
          <button
            type="button"
            onClick={handleToggleRoute}
            disabled={isTrackingRoute}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-[14px] font-medium shadow-lg shadow-slate-900/10 transition-colors disabled:opacity-70 ${
              isRouteActive ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-700'
            }`}
            aria-label="경로 보기"
          >
            {isTrackingRoute ? <LoaderCircle size={15} className="animate-spin" /> : <Route size={15} />}
            <span>경로</span>
          </button>
          {isRouteActive && routeSummary ? (
            <div className="inline-flex h-9 items-center rounded-full bg-slate-900/82 px-3 text-[13px] text-white shadow-lg shadow-slate-900/10">
              <span>{routeSummary.distanceText}</span>
              <span className="mx-1.5 h-1 w-1 rounded-full bg-white/60" />
              <span>{routeSummary.durationText}</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleLocateCurrentPosition}
            disabled={isLocatingCurrentPosition}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/10 transition-colors disabled:opacity-70"
            aria-label="내 위치로 이동"
          >
            {isLocatingCurrentPosition ? <LoaderCircle size={16} className="animate-spin" /> : <LocateFixed size={16} />}
          </button>
        </div>
      ) : null}
      {!interactive && onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="absolute inset-0 z-[600]"
          aria-label="상세 지도 보기"
        />
      ) : null}
    </div>
  );
}

/**
 * 전화번호를 브라우저용 tel 링크 형식으로 정리합니다.
 */
function buildTelHref(phone?: string): string {
  const sanitized = String(phone || '').replace(/[^0-9+]/g, '');
  return sanitized ? `tel:${sanitized}` : '#';
}

/**
 * 위험도에 맞는 배지 스타일을 반환합니다.
 */
function resolveRiskChipClass(label: RiskLabel | '안내'): string {
  if (label === '응급') return 'status-chip border border-red-200 bg-[linear-gradient(180deg,#fff1f2_0%,#ffe4e6_100%)] text-red-700';
  if (label === '주의') return 'status-chip border border-amber-200 bg-[linear-gradient(180deg,#fffbeb_0%,#fef3c7_100%)] text-amber-700';
  if (label === '정상') return 'status-chip border border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5_0%,#d1fae5_100%)] text-emerald-700';
  return 'status-chip border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-600';
}

/**
 * shadow 모니터링 배너의 톤에 맞는 카드 색상을 반환합니다.
 */
function resolveShadowBannerToneClass(bannerTone?: 'neutral' | 'warning' | 'danger'): string {
  if (bannerTone === 'danger') {
    return 'border-red-200 bg-[linear-gradient(180deg,#fff1f2_0%,#ffe4e6_100%)] text-red-900';
  }
  if (bannerTone === 'warning') {
    return 'border-amber-200 bg-[linear-gradient(180deg,#fffbeb_0%,#fef3c7_100%)] text-amber-900';
  }
  return 'border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-800';
}

/**
 * 설계서 상단의 햄버거/소속/이름/알림 바를 공통으로 렌더링합니다.
 */
function TopBar({
  locationLabel,
  nameLabel,
  alertCount,
  onMenu,
  onSearch,
  onAlerts,
  showSearchButton,
  refreshControls,
}: {
  locationLabel: string;
  nameLabel: string;
  alertCount: number;
  onMenu: () => void;
  onSearch: () => void;
  onAlerts: () => void;
  showSearchButton: boolean;
  refreshControls?: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/80 bg-white/88 px-3 py-2.5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm min-[360px]:px-3.5 min-[360px]:py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 min-[360px]:gap-2.5">
        <button
          type="button"
          onClick={onMenu}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-slate-50 text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
        >
          <Menu size={22} />
        </button>
        <div className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[-0.02em] text-slate-600 min-[360px]:text-[15px]">{locationLabel}</div>
        <div className="max-w-[72px] shrink-0 truncate text-[15px] font-extrabold tracking-[-0.03em] text-slate-900 min-[360px]:max-w-[84px] min-[360px]:text-[16px]">{nameLabel}</div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          {refreshControls}
          {showSearchButton ? (
            <button
              type="button"
              onClick={onSearch}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/80 bg-slate-50 text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
            >
              <Search size={18} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAlerts}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/80 bg-slate-50 text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
          >
            <Bell size={18} />
            <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[12px] font-extrabold text-white shadow-[0_6px_14px_rgba(16,185,129,0.28)]">
              {alertCount}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * 회원 카드 한 건을 설계서 스타일에 맞게 렌더링합니다.
 */
function MemberCard({
  member,
  onClick,
}: {
  member: MemberRow;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card min-h-[132px] w-full overflow-hidden rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-3.5 py-3.5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(15,23,42,0.12)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold tracking-[-0.02em] text-slate-900 min-[390px]:text-[15px]">
            {resolveMemberDisplayName(member.name)}{member.age > 0 ? ` ${member.age}세` : ''} {member.gender !== '미상' ? ` ${member.gender}` : ''}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={`${resolveRiskChipClass(member.riskLabel)} min-w-[54px] justify-center px-2.5 py-1 text-[13px] font-bold shadow-[0_8px_18px_rgba(15,23,42,0.06)] min-[390px]:text-[14px]`}>
            {member.riskLabel}
          </span>
          <span className={`status-chip min-w-[54px] justify-center px-2.5 py-1 text-[13px] font-bold shadow-[0_8px_18px_rgba(15,23,42,0.06)] min-[390px]:text-[14px] ${member.isWear ? 'bg-sky-500 text-white' : 'bg-rose-500 text-white'}`}>
            {member.isWear ? '착용' : '미착용'}
          </span>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400 min-[390px]:text-[14px]">HR</div>
          <div className="mt-1 text-[22px] font-extrabold leading-none tracking-[-0.05em] text-slate-950 min-[390px]:text-[24px]">
            {formatMetric(member.heartRate)}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400 min-[390px]:text-[14px]">SPO</div>
          <div className="mt-1 text-[22px] font-extrabold leading-none tracking-[-0.05em] text-slate-950 min-[390px]:text-[24px]">
            {formatMetric(member.spo2)}
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * 상세 패널에 사용하는 생체 지표 타일을 렌더링합니다.
 */
function MetricTile({
  title,
  value,
  onClick,
}: {
  title: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[64px] rounded-[20px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-3 py-2.5 shadow-[0_12px_24px_rgba(15,23,42,0.05)] min-[360px]:min-h-[68px] ${onClick ? 'cursor-pointer transition-transform active:scale-[0.98]' : ''}`}
    >
      <div className="text-center text-[13px] font-semibold tracking-[0.08em] text-slate-400 min-[360px]:text-[14px]">{title}</div>
      <div className="mt-1 text-center text-[20px] font-extrabold tracking-[-0.03em] text-slate-900 min-[360px]:text-[22px]">{value}</div>
    </button>
  );
}

/**
 * 상세 설명 블록의 불릿 한 줄을 렌더링합니다.
 */
function DetailBullet({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5 break-words text-[14px] leading-6 text-slate-700 min-[360px]:text-[15px]">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
      <div className="min-w-0">
        <span className="font-extrabold text-slate-900">{label}</span>
        <span> {text}</span>
      </div>
    </div>
  );
}

/**
 * 선택된 회원의 상세 카드와 조치 버튼을 렌더링합니다.
 */
function MemberDetail({
  member,
  onBack,
  onOpenMap,
  onMetricSelect,
  showBackButton = true,
}: {
  member: MemberRow;
  onBack: () => void;
  onOpenMap: () => void;
  onMetricSelect: (key: WelfareMetricDetailKey) => void;
  showBackButton?: boolean;
}) {
  const isTabletSidePanel = !showBackButton;

  return (
    <section className="space-y-3">
      {showBackButton ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/80 bg-white/90 px-3.5 py-2.5 text-[14px] font-bold text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
        >
          <ChevronLeft size={15} />
          회원리스트로
        </button>
      ) : null}

      <div className="card rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] min-[360px]:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[17px] font-extrabold tracking-[-0.03em] text-slate-900 min-[360px]:text-[18px]">
              {resolveMemberDisplayName(member.name)} {member.age > 0 ? `${member.age}세` : ''} {member.gender !== '미상' ? member.gender : ''}
            </div>
            <div className="mt-1.5 break-words text-[14px] font-medium text-slate-500 min-[360px]:text-[15px]">
              위치: {member.locationAddress}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`status-chip min-w-[42px] justify-center px-2 py-1 text-[13px] shadow-[0_8px_18px_rgba(15,23,42,0.06)] min-[360px]:min-w-[46px] min-[360px]:text-[14px] ${member.isWear ? 'bg-sky-500 text-white' : 'bg-rose-500 text-white'}`}>
              {member.isWear ? '착용' : '미착용'}
            </span>
            <span className={`${resolveRiskChipClass(member.riskLabel)} min-w-[42px] justify-center px-2 py-1 text-[13px] shadow-[0_8px_18px_rgba(15,23,42,0.06)] min-[360px]:min-w-[46px] min-[360px]:text-[14px]`}>
              {member.riskLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1.5 min-[360px]:grid-cols-2">
        <MetricTile title="심박수" value={formatMetric(member.heartRate)} onClick={() => onMetricSelect('heartRate')} />
        <MetricTile title="산소포화도" value={formatMetric(member.spo2)} onClick={() => onMetricSelect('spo2')} />
        <MetricTile title="피부온도" value={formatMetric(member.bodyTemperature)} onClick={() => onMetricSelect('bodyTemperature')} />
        <MetricTile title="걸음수" value={formatMetric(member.steps)} onClick={() => onMetricSelect('steps')} />
        <MetricTile title="스트레스지수" value={formatMetric(member.stressLevel)} onClick={() => onMetricSelect('stressLevel')} />
        <MetricTile title="낙상점수" value={formatMetric(member.fallScore)} onClick={() => onMetricSelect('fallScore')} />
      </div>

      <div className="card rounded-[24px] border border-white/80 bg-white/92 px-3.5 py-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] min-[360px]:px-4">
        <div className="space-y-1.5">
          <DetailBullet label="현재 상태 :" text={member.llmAnalysis || '중증 응급 단계로 판단됩니다.'} />
          <DetailBullet label="착용 상태 :" text={member.isWear ? '워치 착용 중으로 판단됩니다.' : '워치 미착용 상태로 확인됩니다.'} />
          <DetailBullet
            label="현재 수치 :"
            text={`심박 ${formatMetric(member.heartRate)}bpm · SpO2 ${formatMetric(member.spo2)}% · 피부온도 ${formatMetric(member.bodyTemperature)}°C · 스트레스 ${formatMetric(member.stressLevel)} · 걸음수 ${formatMetric(member.steps)}보`}
          />
          <DetailBullet
            label="낙상 근거 :"
            text={`낙상점수 ${formatMetric(member.fallScore)} · 응급점수 ${formatMetric(member.emergencyScore)} · 최근 수집 ${formatDateTime(member.collectedAt)}`}
          />
          <DetailBullet
            label="보호자 정보 :"
            text={
              member.guardianName || member.guardianPhone || member.guardianRelationship
                ? [member.guardianRelationship, member.guardianName, member.guardianPhone].filter(Boolean).join(' / ')
                : '등록된 보호자 정보가 없습니다.'
            }
          />
          <DetailBullet label="관제 조치 :" text="사용자와 보호자 연락 및 후속 대응 여부를 즉시 확인합니다." />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
        <a
          href={buildTelHref(member.phone)}
          className="flex items-center justify-center gap-2 rounded-[18px] border border-amber-200 bg-[linear-gradient(180deg,#fff8eb_0%,#fffbf5_100%)] px-3 py-3 text-[14px] font-bold text-amber-700 shadow-[0_12px_24px_rgba(245,158,11,0.10)] min-[360px]:text-[15px]"
        >
          <Phone size={16} />
          회원
        </a>
        <a
          href={buildTelHref(member.guardianPhone)}
          className="flex items-center justify-center gap-2 rounded-[18px] border border-sky-200 bg-[linear-gradient(180deg,#f0f9ff_0%,#f8fcff_100%)] px-3 py-3 text-[14px] font-bold text-sky-700 shadow-[0_12px_24px_rgba(14,165,233,0.10)] min-[360px]:text-[15px]"
        >
          <Phone size={16} />
          보호자
        </a>
      </div>

      <LiveMapFrame
        lat={member.locationLat}
        lng={member.locationLng}
        address={member.locationAddress}
        memberName={resolveMemberDisplayName(member.name)}
        heightClassName={isTabletSidePanel ? 'h-60 xl:h-72 2xl:h-[24rem]' : 'h-26 min-[360px]:h-30'}
        interactive={false}
        onClick={onOpenMap}
      />

      <div className="card rounded-[24px] border border-white/80 bg-white/92 p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] min-[360px]:p-4">
        <div className="text-[15px] font-extrabold tracking-[-0.02em] text-slate-800">건강 메모</div>
        <div className="mt-3 grid grid-cols-[64px_minmax(0,1fr)] gap-y-2 text-[14px] text-slate-700 min-[360px]:grid-cols-[72px_minmax(0,1fr)] min-[360px]:text-[15px]">
          <div className="font-semibold text-slate-400">기저질환</div>
          <div className="min-w-0 break-words">{member.medicalConditions}</div>
          <div className="font-semibold text-slate-400">복용약물</div>
          <div className="min-w-0 break-words">{member.medications}</div>
          <div className="font-semibold text-slate-400">알레르기</div>
          <div className="min-w-0 break-words">{member.allergies}</div>
        </div>
      </div>
    </section>
  );
}

/**
 * 복지사 회원 상세에서 선택한 생체 항목의 그래프와 히스토리 화면을 렌더링합니다.
 */
function MemberMetricDetail({
  member,
  metricKey,
  onBack,
}: {
  member: MemberRow;
  metricKey: WelfareMetricDetailKey;
  onBack: () => void;
}) {
  const labels: Record<WelfareMetricDetailKey, string> = {
    heartRate: '심박수',
    spo2: '산소포화도',
    bodyTemperature: '피부온도',
    steps: '걸음수',
    stressLevel: '스트레스지수',
    fallScore: '낙상점수',
  };
  const chartColorMap: Record<WelfareMetricDetailKey, string> = {
    heartRate: '#ef4444',
    spo2: '#0ea5e9',
    bodyTemperature: '#f97316',
    steps: '#10b981',
    stressLevel: '#8b5cf6',
    fallScore: '#f59e0b',
  };
  const history = buildWelfareMetricHistory(member, metricKey);
  const chart = buildWelfareMetricChartPath(history);
  const currentValue = getWelfareMetricValue(member, metricKey);
  const chartColor = chartColorMap[metricKey];
  const chartGradientId = `welfare-metric-fill-${member.id}-${metricKey}`;

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/80 bg-white/90 px-3.5 py-2.5 text-[14px] font-bold text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
      >
        <ChevronLeft size={15} />
        회원 상세로
      </button>

      <div className="card rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-semibold tracking-[0.08em] text-slate-400">{labels[metricKey]}</div>
            <div className="mt-2 text-[30px] font-extrabold tracking-[-0.03em]" style={{ color: chartColor }}>
              {formatWelfareMetricDetailValue(metricKey, currentValue)}
            </div>
            <div className="mt-2 text-[14px] text-slate-500">{resolveMemberDisplayName(member.name)} · 최근 수집 {formatDateTime(member.collectedAt)}</div>
          </div>
          <span className={`${resolveRiskChipClass(member.riskLabel)} min-w-[54px] justify-center px-2.5 py-1 text-[13px] font-bold shadow-[0_8px_18px_rgba(15,23,42,0.06)]`}>
            {member.riskLabel}
          </span>
        </div>
      </div>

      <div className="card rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="mb-3 flex items-center justify-between text-[14px] font-semibold text-slate-500">
          <span>최근 추세</span>
          <span>최대 {formatWelfareMetricDetailValue(metricKey, chart.max)} · 최소 {formatWelfareMetricDetailValue(metricKey, chart.min)}</span>
        </div>
        <div className="rounded-[20px] bg-slate-50 p-3">
          <svg viewBox="0 0 300 120" className="h-32 w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id={chartGradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity="0.28" />
                <stop offset="100%" stopColor={chartColor} stopOpacity="0.03" />
              </linearGradient>
            </defs>
            <line x1="10" x2="290" y1="20" y2="20" stroke="#e2e8f0" strokeDasharray="4 4" />
            <line x1="10" x2="290" y1="60" y2="60" stroke="#e2e8f0" strokeDasharray="4 4" />
            <line x1="10" x2="290" y1="100" y2="100" stroke="#e2e8f0" strokeDasharray="4 4" />
            {chart.path ? (
              <>
                <path d={`${chart.path} L 290 110 L 10 110 Z`} fill={`url(#${chartGradientId})`} />
                <path d={chart.path} fill="none" stroke={chartColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : null}
          </svg>
          <div className="mt-2 flex items-center justify-between text-[13px] font-semibold text-slate-400">
            <span>{history[0] ? formatDateTime(history[0].collectedAt) : '-'}</span>
            <span>{history[Math.floor(history.length / 2)] ? formatDateTime(history[Math.floor(history.length / 2)].collectedAt) : '-'}</span>
            <span>{history[history.length - 1] ? formatDateTime(history[history.length - 1].collectedAt) : '-'}</span>
          </div>
        </div>
      </div>

      <div className="card rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="mb-3 text-[15px] font-extrabold tracking-[-0.02em] text-slate-800">히스토리 데이터</div>
        <div className="space-y-2">
          {[...history].reverse().map((item) => (
            <div key={`${metricKey}-${item.collectedAt}`} className="flex items-center justify-between rounded-[18px] border border-slate-100 bg-slate-50 px-3 py-3">
              <div className="text-[14px] font-medium text-slate-500">{formatDateTime(item.collectedAt)}</div>
              <div className="text-[16px] font-bold" style={{ color: chartColor }}>
                {formatWelfareMetricDetailValue(metricKey, item.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * 회원 위치를 크게 보여주는 전면 오버레이를 렌더링합니다.
 */
function MapOverlay({
  member,
  onClose,
}: {
  member: MemberRow | null;
  onClose: () => void;
}) {
  if (!member) return null;
  return (
    <div
      className="fixed inset-0 z-[5000] h-screen overflow-hidden bg-slate-950/82 backdrop-blur-sm supports-[height:100dvh]:h-[100dvh]"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-transparent">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 z-[1200] inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-950/20"
          aria-label="전체 지도 닫기"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <LiveMapFrame
              key={`detail-map-${member.id}`}
              lat={member.locationLat}
              lng={member.locationLng}
              address={member.locationAddress}
              memberName={resolveMemberDisplayName(member.name)}
              heightClassName="h-full min-h-[320px]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[700] h-28 bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.28)_100%)]" />
            <div className="absolute right-3 top-3 z-[920] flex items-center gap-2 min-[360px]:right-4 min-[360px]:top-4">
              <a
                href={buildTelHref(member.phone)}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-amber-500 bg-white/95 px-3.5 py-2.5 text-[15px] text-amber-700 shadow-[0_8px_20px_rgba(15,23,42,0.14)] backdrop-blur-sm"
              >
                <Phone size={17} />
                회원
              </a>
              <a
                href={buildTelHref(member.guardianPhone)}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-sky-300 bg-white/95 px-3.5 py-2.5 text-[15px] text-sky-700 shadow-[0_8px_20px_rgba(15,23,42,0.14)] backdrop-blur-sm"
              >
                <Phone size={17} />
                보호자
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 메뉴 오버레이를 설계서의 햄버거 메뉴 느낌으로 렌더링합니다.
 */
function MenuOverlay({
  open,
  activeTab,
  onClose,
  onSelect,
}: {
  open: boolean;
  activeTab: TabKey;
  onClose: () => void;
  onSelect: (tab: TabKey) => void;
}) {
  if (!open) return null;
  const items: { key: TabKey; label: string }[] = [
    { key: 'members', label: '회원관리' },
    { key: 'mypage', label: '마이페이지' },
    { key: 'policy', label: '개인정보및약관' },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40" onClick={onClose}>
      <div
        className="absolute left-3 top-6 w-[min(280px,calc(100vw-24px))] rounded-[26px] border border-white/80 bg-white/92 p-4 shadow-[0_24px_50px_rgba(15,23,42,0.16)] backdrop-blur-md md:left-4 md:w-[320px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-[18px] font-extrabold tracking-[-0.02em] text-slate-900">메뉴</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 space-y-2.5">
          {items.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              type="button"
              onClick={() => {
                onSelect(item.key);
                onClose();
              }}
              className={`flex w-full items-center rounded-lg px-4 py-3.5 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${activeTab === item.key ? 'bg-[linear-gradient(180deg,#ecfeff_0%,#f0fdfa_100%)] text-teal-700' : 'bg-slate-50/90 text-slate-700'}`}
            >
              <span className="text-[16px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 상단 검색 아이콘으로 여는 회원 검색 레이어를 렌더링합니다.
 */
function SearchOverlay({
  open,
  keyword,
  onChange,
  onClose,
}: {
  open: boolean;
  keyword: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/35 backdrop-blur-[2px]" onClick={onClose}>
      <div className="mx-auto w-full max-w-[440px] px-3 pt-20 min-[393px]:px-4 sm:max-w-[720px] sm:px-5 lg:max-w-[1180px] lg:px-6 2xl:max-w-[1360px]">
        <div
          className="card rounded-[28px] border border-white/80 bg-white/96 p-3 shadow-[0_24px_50px_rgba(15,23,42,0.12)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3.5">
            <Search size={18} className="shrink-0 text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => onChange(event.target.value)}
              placeholder="회원명을 입력하세요"
              className="w-full bg-transparent text-[16px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 복지사 모바일 메인 앱을 렌더링합니다.
 */
export default function App() {
  const [session, setSession] = useState<WelfareSession | null>(() => readStoredWelfareSession());
  const [authMode, setAuthMode] = useState<WelfareAuthMode>('login');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(() => {
    try {
      return localStorage.getItem(WELFARE_AUTO_LOGIN_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [rememberWelfareEmail, setRememberWelfareEmail] = useState(() => {
    try {
      return String(localStorage.getItem(WELFARE_LOGIN_ID_STORAGE_KEY) || '').trim().length > 0;
    } catch {
      return false;
    }
  });
  const [loginEmail, setLoginEmail] = useState(() => {
    try {
      return String(localStorage.getItem(WELFARE_LOGIN_ID_STORAGE_KEY) || '').trim().toLowerCase();
    } catch {
      return '';
    }
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [welfareTermsAgreed, setWelfareTermsAgreed] = useState(false);
  const [welfarePrivacyAgreed, setWelfarePrivacyAgreed] = useState(false);
  const [welfareLocationAgreed, setWelfareLocationAgreed] = useState(false);
  const [welfareBiometricAgreed, setWelfareBiometricAgreed] = useState(false);
  const [welfareThirdPartyAgreed, setWelfareThirdPartyAgreed] = useState(false);
  const [welfareWearableAgreed, setWelfareWearableAgreed] = useState(false);
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    city: '',
    district: '',
    dong: '',
  });
  const [activeTab, setActiveTab] = useState<TabKey>('members');
  const [membersView, setMembersView] = useState<'list' | 'detail'>('list');
  const [selectedMetricKey, setSelectedMetricKey] = useState<WelfareMetricDetailKey | null>(null);
  const [policyTab, setPolicyTab] = useState<'terms' | 'privacy' | 'location' | 'biometric' | 'thirdParty' | 'wearable'>('terms');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState('');
  const [myPageView, setMyPageView] = useState<'main' | 'edit' | 'password'>('main');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', nextPassword: '', confirmPassword: '' });
  const [profileForm, setProfileForm] = useState({
    email: '',
    phone: '',
    city: '',
    district: '',
    dong: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profilePhoneCode, setProfilePhoneCode] = useState('');
  const [profilePhoneVerificationToken, setProfilePhoneVerificationToken] = useState('');
  const [profilePhoneNotice, setProfilePhoneNotice] = useState('');
  const [profilePhoneSending, setProfilePhoneSending] = useState(false);
  const [profilePhoneVerifying, setProfilePhoneVerifying] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [showSignupPasswordText, setShowSignupPasswordText] = useState(false);
  const [showSignupPasswordConfirmText, setShowSignupPasswordConfirmText] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [staffs, setStaffs] = useState<WelfareStaff[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [systemOverview, setSystemOverview] = useState<WelfareSystemOverview | null>(null);
  const [shadowConsistency, setShadowConsistency] = useState<WelfareShadowConsistencyResponse | null>(null);
  const [monitoredUsers, setMonitoredUsers] = useState<MonitoredUser[]>([]);
  const [cases, setCases] = useState<EmergencyCaseRow[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [dashboardRefreshMode, setDashboardRefreshMode] = useState<DashboardRefreshMode>('auto');
  const [lastDashboardSyncedAt, setLastDashboardSyncedAt] = useState('');
  const dashboardSyncInFlightRef = useRef(false);
  const previousAlertSignatureRef = useRef('');

  /**
   * 복지사 로그인 비밀번호 입력 타입을 현재 보기 상태에 따라 계산합니다.
   */
  const passwordInputType = showPasswordText ? 'text' : 'password';
  const signupEmailLocalPart = useMemo(() => parseWelfareSignupEmailFields(signupForm.email).localPart, [signupForm.email]);
  const [signupDomainOption, setSignupDomainOption] = useState('');
  const [signupCustomDomain, setSignupCustomDomain] = useState('');
  const authTitleClass = 'text-[24px] font-semibold tracking-[-0.02em] text-slate-900';
  const authFieldLabelClass = 'mb-2 text-[14px] font-medium text-slate-600';
  const authInputShellClass = 'flex h-[44px] items-center gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white px-4';
  const authInputClass = 'h-full min-h-0 w-full appearance-none bg-transparent text-[16px] leading-none text-slate-900 outline-none';
  const authEmailGroupClass = 'mt-1 space-y-3';
  const authSelectClass =
    'h-11 rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none focus:border-teal-600';
  const authStaticDomainClass =
    'flex h-11 items-center rounded-lg border border-slate-100 bg-slate-50 px-4 text-[15px] text-slate-500';
  const authPrimaryButtonClass =
    'inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-[15px] font-semibold text-white shadow-sm disabled:opacity-50';
  const authSecondaryButtonClass =
    'inline-flex h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 text-[15px] font-semibold text-teal-700';
  const authCheckboxLabelClass =
    'inline-flex items-center gap-2 text-[14px] font-medium text-slate-600';
  const signupInputIconButtonClass =
    'inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-teal-50 hover:text-teal-600';

  // 아이디찾기 / 비밀번호찾기 상태
  const [welfareFindMode, setWelfareFindMode] = useState<'find-email' | 'find-password' | null>(null);
  const [welfareFindEmailName, setWelfareFindEmailName] = useState('');
  const [welfareFindEmailPhone, setWelfareFindEmailPhone] = useState('');
  const [welfareFindEmailResult, setWelfareFindEmailResult] = useState('');
  const [welfareFindEmailLoading, setWelfareFindEmailLoading] = useState(false);
  const [welfareFindPwEmail, setWelfareFindPwEmail] = useState('');
  const [welfareFindPwPhone, setWelfareFindPwPhone] = useState('');
  const [welfareFindPwNewPassword, setWelfareFindPwNewPassword] = useState('');
  const [welfareFindPwResult, setWelfareFindPwResult] = useState('');
  const [welfareFindPwLoading, setWelfareFindPwLoading] = useState(false);
  const [welfareTermsModal, setWelfareTermsModal] = useState<string | null>(null);
  const [welfareFindPwConfirmPassword, setWelfareFindPwConfirmPassword] = useState('');
  const [isWelfareFindPwVisible, setIsWelfareFindPwVisible] = useState(false);
  const [isWelfareFindPwConfirmVisible, setIsWelfareFindPwConfirmVisible] = useState(false);
  // SMS 인증 단계 상태
  const [welfareFindPwStep, setWelfareFindPwStep] = useState<'request' | 'verify'>('request');
  const [welfareFindPwCode, setWelfareFindPwCode] = useState('');
  const [welfareFindPwMaskedPhone, setWelfareFindPwMaskedPhone] = useState('');
  const [signupEmailCheckResult, setSignupEmailCheckResult] = useState<'available' | 'unavailable' | null>(null);
  const [signupEmailCheckMessage, setSignupEmailCheckMessage] = useState('');
  const [isSignupEmailChecking, setIsSignupEmailChecking] = useState(false);
  const [signupEmailVerified, setSignupEmailVerified] = useState(false);

  /**
   * 복지사 회원가입 이메일 아이디/도메인 입력 상태를 signupForm.email에 동기화합니다.
   */
  const syncSignupEmailValue = (params: {
    localPart?: string;
    domainOption?: string;
    customDomain?: string;
  }) => {
    const nextLocalPart = params.localPart ?? signupEmailLocalPart;
    const nextDomainOption = params.domainOption ?? signupDomainOption;
    const nextCustomDomain = params.customDomain ?? signupCustomDomain;
    if (params.domainOption !== undefined) setSignupDomainOption(params.domainOption);
    if (params.customDomain !== undefined) setSignupCustomDomain(params.customDomain);
    setSignupEmailCheckResult(null);
    setSignupEmailCheckMessage('');
    setSignupEmailVerified(false);
    const nextEmail = buildWelfareSignupEmailValue({
      localPart: nextLocalPart,
      domainOption: nextDomainOption,
      customDomain: nextCustomDomain,
    });
    setSignupForm((prev) => ({
      ...prev,
      email: nextEmail,
    }));
  };

  /** 복지사 회원가입 이메일 중복 확인 */
  const handleCheckSignupEmail = async () => {
    const emailValue = buildWelfareSignupEmailValue({
      localPart: signupEmailLocalPart,
      domainOption: signupDomainOption,
      customDomain: signupCustomDomain,
    });

    if (!emailValue || !emailValue.includes('@')) {
      setSignupEmailCheckResult('unavailable');
      setSignupEmailCheckMessage('완전한 이메일을 입력해주세요.');
      setSignupEmailVerified(false);
      return;
    }

    setIsSignupEmailChecking(true);
    setSignupEmailCheckResult(null);
    setSignupEmailCheckMessage('');
    setSignupEmailVerified(false);

    try {
      const res = await fetch(resolveWelfareApiUrl('/api/controllers/check-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue, role: 'medical' }),
      });
      const data = await res.json();

      if (data.available) {
        setSignupEmailCheckResult('available');
        setSignupEmailCheckMessage(data.message || '사용 가능한 이메일입니다.');
        setSignupEmailVerified(true);
      } else {
        setSignupEmailCheckResult('unavailable');
        setSignupEmailCheckMessage(data.message || '이미 가입된 이메일입니다.');
        setSignupEmailVerified(false);
      }
    } catch {
      setSignupEmailCheckResult('unavailable');
      setSignupEmailCheckMessage('서버 연결에 실패했습니다.');
      setSignupEmailVerified(false);
    } finally {
      setIsSignupEmailChecking(false);
    }
  };

  /**
   * 복지사 회원가입 시 선택된 시/도 기준 시군구 목록을 계산합니다.
   */
  const signupDistrictOptions = useMemo(
    () => getMemberDistrictOptions(signupForm.city),
    [signupForm.city],
  );

  /**
   * 복지사 회원가입 시 선택된 시/도와 시군구 기준 읍면동 목록을 계산합니다.
   */
  const signupAreaOptions = useMemo(
    () => getMemberAreaOptions(signupForm.city, signupForm.district),
    [signupForm.city, signupForm.district],
  );

  /**
   * 복지사 마이페이지 정보수정에서 선택된 시/도 기준 시군구 목록을 계산합니다.
   */
  const profileDistrictOptions = useMemo(
    () => getMemberDistrictOptions(profileForm.city),
    [profileForm.city],
  );

  /**
   * 복지사 마이페이지 정보수정에서 선택된 시/도와 시군구 기준 읍면동 목록을 계산합니다.
   */
  const profileAreaOptions = useMemo(
    () => getMemberAreaOptions(profileForm.city, profileForm.district),
    [profileForm.city, profileForm.district],
  );

  /**
   * 앱 재진입 시 저장된 복지사 세션을 다시 적용합니다.
   */
  useEffect(() => {
    const saved = readStoredWelfareSession();
    if (!saved?.token) {
      return;
    }
    setSession(saved);
    setLoginEmail(saved.email || '');
  }, []);

  /**
   * 복지사 모바일에 필요한 회원, 복지사, 응급 케이스 데이터를 함께 불러옵니다.
   */
  const loadDashboard = useCallback(async (options?: { silent?: boolean }) => {
    if (!session?.token) {
      setSystemOverview(null);
      setShadowConsistency(null);
      setLoading(false);
      return;
    }
    if (dashboardSyncInFlightRef.current) {
      return;
    }

    const silent = options?.silent === true;
    dashboardSyncInFlightRef.current = true;
    try {
      if (!silent) {
        setLoading(true);
      }
      setError('');
      const [staffJson, usersJson, monitoredJson, casesJson, overviewJson, consistencyJson] = await Promise.all([
        fetchJson<{ success: boolean; data: WelfareStaff[] }>('/api/controllers'),
        fetchJson<{ success: boolean; data: ApiUser[] }>('/api/users'),
        fetchJson<{ success: boolean; users: MonitoredUser[] }>('/api/controllers/medical/monitored-users'),
        fetchJson<{ success: boolean; cases: EmergencyCaseRow[] }>('/api/controllers/medical/emergency-cases'),
        fetchJson<{ success: boolean; data: WelfareSystemOverview }>('/api/system-monitoring/overview'),
        fetchJson<{ success: boolean; data: WelfareShadowConsistencyResponse }>('/api/system-monitoring/shadow-consistency').catch(() => null),
      ]);
      setStaffs(Array.isArray(staffJson.data) ? staffJson.data.filter((row) => row.role === 'medical') : []);
      setUsers(Array.isArray(usersJson.data) ? usersJson.data : []);
      setMonitoredUsers(Array.isArray(monitoredJson.users) ? monitoredJson.users : []);
      setCases(Array.isArray(casesJson.cases) ? casesJson.cases : []);
      setSystemOverview(overviewJson?.data || null);
      setShadowConsistency(consistencyJson?.data || null);
      setLastDashboardSyncedAt(new Date().toLocaleTimeString('ko-KR', { hour12: false }));
    } catch (loadError) {
      setError('복지사 모바일 데이터를 불러오지 못했습니다.');
    } finally {
      dashboardSyncInFlightRef.current = false;
      if (!silent) {
        setLoading(false);
      }
    }
  }, [session?.token]);

  useEffect(() => {
    if (!session?.token) {
      return;
    }
    void loadDashboard();
  }, [loadDashboard, session?.token]);

  /**
   * 복지사 모바일은 별도 로그인 소켓이 없으므로 짧은 주기 재동기화로 최신 생체 상태를 유지합니다.
   */
  useEffect(() => {
    if (!session?.token || dashboardRefreshMode !== 'auto') {
      return;
    }
    const refreshTimer = window.setInterval(() => {
      void loadDashboard({ silent: true });
    }, WELFARE_REALTIME_REFRESH_MS);

    return () => window.clearInterval(refreshTimer);
  }, [dashboardRefreshMode, loadDashboard, session?.token]);

  const currentWelfare = useMemo(() => pickCurrentWelfare(staffs, session?.email), [session?.email, staffs]);
  const memberRows = useMemo(() => buildMemberRows(users, monitoredUsers, currentWelfare), [users, monitoredUsers, currentWelfare]);
  const filteredMembers = useMemo(() => {
    const keyword = normalizeText(searchKeyword);
    if (!keyword) return memberRows;
    return memberRows.filter(
      (row) =>
        normalizeText(row.name).includes(keyword) ||
        normalizeText(row.guardianName).includes(keyword) ||
        normalizeText(row.affiliation.dong).includes(keyword),
    );
  }, [memberRows, searchKeyword]);
  const selectedMember = useMemo(
    () => filteredMembers.find((row) => row.id === selectedMemberId) || null,
    [filteredMembers, selectedMemberId],
  );
  const alertItems = useMemo(() => buildAlertItems(cases, memberRows), [cases, memberRows]);
  const shadowMonitoring = systemOverview?.shadowMonitoring;
  const shadowConsistencySummary = shadowConsistency?.summary;
  const shadowBannerToneClass = useMemo(
    () => resolveShadowBannerToneClass(shadowMonitoring?.bannerTone),
    [shadowMonitoring?.bannerTone],
  );

  /**
   * 신규 위험 알림이 들어오면 복지사앱 브라우저 알림으로 알려줍니다.
   */
  useEffect(() => {
    const nextSignature = alertItems.map((item) => `${item.id}:${item.status}`).join('|');
    if (previousAlertSignatureRef.current && nextSignature && previousAlertSignatureRef.current !== nextSignature) {
      notifyWelfare('복지사앱 알림', `관리 회원 알림 ${alertItems.length}건이 갱신되었습니다.`);
    }
    previousAlertSignatureRef.current = nextSignature;
  }, [alertItems]);

  useEffect(() => {
    if (filteredMembers.length === 0) {
      setSelectedMemberId('');
      setSelectedMetricKey(null);
      return;
    }
    if (selectedMemberId && !filteredMembers.some((row) => row.id === selectedMemberId)) {
      setSelectedMemberId('');
      setSelectedMetricKey(null);
    }
  }, [filteredMembers, selectedMemberId]);

  const topLocationLabel = buildAffiliationLabel(currentWelfare?.affiliation);
  const topNameLabel = currentWelfare?.name || '홍길동';
  const welfareTermsModalElement = welfareTermsModal ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setWelfareTermsModal(null)}>
      <div
        className="relative max-h-[80vh] w-full max-w-[480px] overflow-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-slate-900">{POLICY_CONTENT[welfareTermsModal]?.title}</h3>
          <button
            type="button"
            onClick={() => setWelfareTermsModal(null)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          {(POLICY_CONTENT[welfareTermsModal]?.sections || []).map((section) => (
            <div key={section.label}>
              <div className="mb-1 text-[13px] font-bold text-slate-500">[{section.label}]</div>
              <div className="text-[14px] leading-6 text-slate-700">{section.content}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setWelfareTermsModal(null)}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 text-[14px] font-semibold text-white shadow-sm transition hover:bg-teal-800 active:scale-[0.98]"
        >
          확인
        </button>
      </div>
    </div>
  ) : null;
  useEffect(() => {
    setProfileForm({
      email: currentWelfare?.email || '',
      phone: currentWelfare?.phone || '',
      city: currentWelfare?.pendingAffiliationChange?.city || currentWelfare?.affiliation?.city || '',
      district: currentWelfare?.pendingAffiliationChange?.district || currentWelfare?.affiliation?.district || '',
      dong: currentWelfare?.pendingAffiliationChange?.dong || currentWelfare?.affiliation?.dong || '',
    });
    setProfilePhoneCode('');
    setProfilePhoneVerificationToken('');
    setProfilePhoneNotice('');
  }, [currentWelfare]);

  /**
   * 복지사 로그인 요청을 처리하고 정상 계정이면 대시보드 세션을 저장합니다.
   */
  async function handleAuthLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = loginEmail.trim().toLowerCase();
    const isSharedAdminShortcut = normalizedEmail === 'admin' && loginPassword === '1';
    const resolvedLoginEmail = isSharedAdminShortcut ? 'admin.welfare@goldentime.local' : normalizedEmail;
    if (!normalizedEmail || !loginPassword.trim()) {
      setAuthNotice('');
      setAuthError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    if (!isSharedAdminShortcut && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setAuthNotice('');
      setAuthError('올바른 이메일 형식이 아닙니다.');
      return;
    }
    if (!isSharedAdminShortcut && loginPassword.trim().length < 6) {
      setAuthNotice('');
      setAuthError('비밀번호는 6자 이상 입력해주세요.');
      return;
    }

    try {
      setAuthSubmitting(true);
      setAuthNotice('');
      setAuthError('');
      const response = await fetch(resolveWelfareApiUrl('/api/controllers/login'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: resolvedLoginEmail,
          password: loginPassword,
        }),
      });
      const json = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            message?: string;
            token?: string;
            controller?: { name?: string; email?: string; role?: string };
          }
        | null;
      if (!response.ok || !json?.success || !json?.token) {
        setAuthError(json?.message || '로그인에 실패했습니다.');
        return;
      }
      if (json.controller?.role !== 'medical') {
        setAuthError('복지사 계정만 로그인할 수 있습니다.');
        return;
      }

      const nextSession: WelfareSession = {
        token: json.token,
        email: String(json.controller?.email || resolvedLoginEmail).trim().toLowerCase(),
        name: String(json.controller?.name || '').trim(),
        role: String(json.controller?.role || 'medical').trim(),
      };
      persistWelfareSession(nextSession, autoLoginEnabled);
      requestWelfareNotificationPermission();
      try {
        if (rememberWelfareEmail) {
          localStorage.setItem(WELFARE_LOGIN_ID_STORAGE_KEY, normalizedEmail);
        } else {
          localStorage.removeItem(WELFARE_LOGIN_ID_STORAGE_KEY);
        }
      } catch {
        // no-op
      }
      setSession(nextSession);
      setLoginPassword('');
    } catch {
      setAuthError('로그인 중 오류가 발생했습니다.');
    } finally {
      setAuthSubmitting(false);
    }
  }

  // 복지사 아이디(이메일) 찾기 API 호출
  async function handleWelfareFindEmail() {
    if (!welfareFindEmailName.trim() || !welfareFindEmailPhone.trim()) {
      setWelfareFindEmailResult('이름과 전화번호를 입력해주세요.');
      return;
    }
    setWelfareFindEmailLoading(true);
    setWelfareFindEmailResult('');
    try {
      const res = await fetch(resolveWelfareApiUrl('/api/controllers/find-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: welfareFindEmailName.trim(), phone: welfareFindEmailPhone.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setWelfareFindEmailResult(`가입된 이메일: ${data.email}`);
      } else {
        setWelfareFindEmailResult(data.message || '계정을 찾을 수 없습니다.');
      }
    } catch {
      setWelfareFindEmailResult('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setWelfareFindEmailLoading(false);
    }
  }

  // 복지사 비밀번호 재설정 - SMS 인증코드 요청 (1단계)
  async function handleWelfareResetRequestCode() {
    if (!welfareFindPwEmail.trim() || !welfareFindPwPhone.trim()) {
      setWelfareFindPwResult('이메일과 전화번호를 모두 입력해주세요.');
      return;
    }
    setWelfareFindPwLoading(true);
    setWelfareFindPwResult('');
    try {
      const res = await fetch(resolveWelfareApiUrl('/api/controllers/reset-password/send-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: welfareFindPwEmail.trim().toLowerCase(),
          phone: welfareFindPwPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWelfareFindPwResult(data.message || '');
        setWelfareFindPwMaskedPhone(data.maskedPhone || '');
        setWelfareFindPwStep('verify');
      } else {
        setWelfareFindPwResult(data.message || '인증코드 발송에 실패했습니다.');
      }
    } catch {
      setWelfareFindPwResult('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setWelfareFindPwLoading(false);
    }
  }

  // 복지사 비밀번호 재설정 - 인증코드 확인 후 비밀번호 변경 (2단계)
  async function handleWelfareFindPassword() {
    if (!welfareFindPwCode.trim() || !welfareFindPwNewPassword.trim()) {
      setWelfareFindPwResult('인증코드와 새 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (welfareFindPwNewPassword.length < 6) {
      setWelfareFindPwResult('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (welfareFindPwNewPassword !== welfareFindPwConfirmPassword) {
      setWelfareFindPwResult('비밀번호가 일치하지 않습니다.');
      return;
    }
    setWelfareFindPwLoading(true);
    setWelfareFindPwResult('');
    try {
      const res = await fetch(resolveWelfareApiUrl('/api/controllers/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: welfareFindPwEmail.trim().toLowerCase(),
          phone: welfareFindPwPhone.trim(),
          code: welfareFindPwCode.trim(),
          newPassword: welfareFindPwNewPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWelfareFindPwResult('비밀번호가 재설정되었습니다. 로그인 화면으로 돌아가서 새 비밀번호로 로그인해주세요.');
      } else {
        setWelfareFindPwResult(data.message || '비밀번호 재설정에 실패했습니다.');
      }
    } catch {
      setWelfareFindPwResult('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setWelfareFindPwLoading(false);
    }
  }

  /**
   * 복지사 회원가입 신청을 보내고 승인 대기 상태로 로그인 화면에 복귀시킵니다.
   */
  async function handleAuthSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = signupForm.email.trim().toLowerCase();
    if (
      !welfareTermsAgreed ||
      !welfarePrivacyAgreed ||
      !welfareLocationAgreed ||
      !welfareBiometricAgreed ||
      !welfareThirdPartyAgreed ||
      !welfareWearableAgreed
    ) {
      setAuthNotice('');
      setAuthError('필수 약관에 모두 동의해주세요.');
      return;
    }
    if (
      !signupForm.name.trim() ||
      !normalizedEmail ||
      !signupForm.password ||
      !signupForm.passwordConfirm ||
      !signupForm.city.trim() ||
      !signupForm.district.trim() ||
      !signupForm.dong.trim()
    ) {
      setAuthNotice('');
      setAuthError('필수 항목을 입력해주세요.');
      return;
    }
    if (signupForm.password !== signupForm.passwordConfirm) {
      setAuthNotice('');
      setAuthError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setAuthSubmitting(true);
      setAuthNotice('');
      setAuthError('');
      const response = await fetch(resolveWelfareApiUrl('/api/controllers/signup'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: signupForm.name.trim(),
          email: normalizedEmail,
          password: signupForm.password,
          phone: signupForm.phone.trim(),
          role: 'medical',
          affiliation: {
            city: signupForm.city.trim(),
            district: signupForm.district.trim(),
            dong: signupForm.dong.trim(),
          },
        }),
      });
      const json = (await response.json().catch(() => null)) as { success?: boolean; message?: string } | null;
      if (!response.ok || !json?.success) {
        setAuthError(json?.message || '회원가입에 실패했습니다.');
        return;
      }

      setAuthMode('login');
      setLoginEmail(normalizedEmail);
      setLoginPassword('');
      setSignupForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        passwordConfirm: '',
        city: '',
        district: '',
        dong: '',
      });
      setWelfareTermsAgreed(false);
      setWelfarePrivacyAgreed(false);
      setAuthNotice(json?.message || '가입 신청이 완료되었습니다.');
    } catch {
      setAuthError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setAuthSubmitting(false);
    }
  }

  /**
   * 복지사 저장 세션을 지우고 로그인 화면으로 되돌립니다.
   */
  function handleAuthLogout() {
    clearStoredWelfareSession();
    setSession(null);
    setStaffs([]);
    setUsers([]);
    setMonitoredUsers([]);
    setCases([]);
    setSelectedMemberId('');
    setAuthMode('login');
    setAuthError('');
    setAuthNotice('');
    setActiveTab('members');
    setMembersView('list');
    setMyPageView('main');
  }

  /**
   * 햄버거 메뉴 이동 시 서브 화면 상태를 함께 정리합니다.
   */
  function handleMenuSelect(tab: TabKey) {
    setActiveTab(tab);
    setMenuOpen(false);
    setSearchOpen(false);
    setSelectedMetricKey(null);
    if (tab === 'members') {
      setMembersView('list');
    }
    if (tab !== 'mypage') {
      setMyPageView('main');
    }
  }

  /**
   * 마이페이지에서 복지사 연락처와 소속 정보를 저장합니다.
   */
  async function handleProfileSave() {
    if (!currentWelfare?._id) return;
    try {
      setProfileSaving(true);
      setProfileMessage('');
      setProfilePhoneNotice('');
      const normalizedCurrentPhone = String(currentWelfare?.phone || '').replace(/\D/g, '');
      const normalizedNextPhone = String(profileForm.phone || '').replace(/\D/g, '');
      const response = await requestJson<{
        success: boolean;
        message?: string;
        data?: {
          id: string;
          email: string;
          phone?: string;
          affiliation?: Affiliation;
          pendingAffiliationChange?: (Affiliation & { requestedAt?: string | null }) | null;
        };
      }>(`/api/controllers/${currentWelfare._id}`, 'PATCH', {
        email: profileForm.email,
        phone: profileForm.phone,
        role: currentWelfare.role || 'medical',
        phoneVerificationToken:
          normalizedNextPhone && normalizedNextPhone !== normalizedCurrentPhone
            ? profilePhoneVerificationToken
            : '',
        affiliation: {
          city: profileForm.city,
          district: profileForm.district,
          dong: profileForm.dong,
        },
      });

      setStaffs((prev) =>
        prev.map((row) =>
          row._id === currentWelfare._id
            ? {
                ...row,
                email: response.data?.email || profileForm.email,
                phone: response.data?.phone || profileForm.phone,
                affiliation: normalizeAffiliation(response.data?.affiliation || profileForm),
                pendingAffiliationChange: response.data?.pendingAffiliationChange || null,
              }
            : row,
        ),
      );
      setProfileMessage(response.message || '마이페이지 정보가 수정되었습니다.');
      setProfilePhoneCode('');
      setProfilePhoneVerificationToken('');
      setProfilePhoneNotice('');
      setMyPageView('main');
    } catch (saveError) {
      setProfileMessage(saveError instanceof Error ? saveError.message : '마이페이지 수정 중 오류가 발생했습니다.');
    } finally {
      setProfileSaving(false);
    }
  }

  /**
   * 복지사 새 전화번호로 인증번호 발송을 요청합니다.
   */
  async function handleProfilePhoneVerificationRequest() {
    try {
      setProfilePhoneSending(true);
      setProfilePhoneNotice('');
      setProfilePhoneVerificationToken('');
      const response = await requestJson<{ success: boolean; message?: string }>(
        '/api/controllers/me/phone-verification/request',
        'POST',
        { phone: profileForm.phone },
      );
      setProfilePhoneNotice(response.message || '인증번호를 발송했습니다.');
    } catch (error) {
      setProfilePhoneNotice(error instanceof Error ? error.message : '인증번호 발송 중 오류가 발생했습니다.');
    } finally {
      setProfilePhoneSending(false);
    }
  }

  /**
   * 복지사 새 전화번호의 인증코드를 확인하고 임시 검증 토큰을 저장합니다.
   */
  async function handleProfilePhoneVerificationConfirm() {
    try {
      setProfilePhoneVerifying(true);
      const response = await requestJson<{
        success: boolean;
        message?: string;
        verificationToken?: string;
      }>('/api/controllers/me/phone-verification/verify', 'POST', {
        phone: profileForm.phone,
        code: profilePhoneCode,
      });
      setProfilePhoneVerificationToken(response.verificationToken || '');
      setProfilePhoneNotice(response.message || '휴대폰 인증이 완료되었습니다.');
    } catch (error) {
      setProfilePhoneVerificationToken('');
      setProfilePhoneNotice(error instanceof Error ? error.message : '휴대폰 인증 확인 중 오류가 발생했습니다.');
    } finally {
      setProfilePhoneVerifying(false);
    }
  }

  if (!session?.token) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-slate-50 px-5 py-8">
        {welfareTermsModalElement}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-center gap-3">
            <div className="rounded-lg bg-teal-50 p-2 text-teal-600">
              {authMode === 'signup' ? <UserPlus size={18} /> : <LogIn size={18} />}
            </div>
            <h1 className={authTitleClass}>복지사앱</h1>
          </div>

          {!welfareFindMode && (
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
                setAuthNotice('');
              }}
              className={`rounded-lg px-4 py-3 text-[14px] transition-colors ${
                authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setAuthError('');
                setAuthNotice('');
              }}
              className={`rounded-lg px-4 py-3 text-[14px] transition-colors ${
                authMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              회원가입
            </button>
          </div>
          )}

          {authNotice ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
              {authNotice}
            </div>
          ) : null}

          {authError ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">
              {authError}
            </div>
          ) : null}

          {welfareFindMode === 'find-email' ? (
            /* 복지사 아이디 찾기 화면 */
            <div className="mt-5 space-y-4">
              <button
                type="button"
                onClick={() => { setWelfareFindMode(null); setWelfareFindEmailResult(''); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-100 bg-white px-3 py-1.5 text-[13px] font-medium text-teal-600 shadow-sm transition hover:bg-teal-50"
            >
              <ChevronLeft size={14} /> 로그인으로 돌아가기
              </button>
              <h2 className="text-[16px] font-semibold text-slate-800">아이디(이메일) 찾기</h2>
              {welfareFindEmailResult ? (
                <div className={`rounded-lg px-4 py-3 text-[13px] ${welfareFindEmailResult.startsWith('가입된') ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>
                  {welfareFindEmailResult}
                </div>
              ) : null}
              <div>
                <label className={authFieldLabelClass}>이름</label>
                <div className={authInputShellClass}>
                  <UserRound size={16} className="text-slate-400" />
                  <input
                    type="text"
                    value={welfareFindEmailName}
                    onChange={(e) => setWelfareFindEmailName(e.target.value)}
                    placeholder="이름 입력"
                    className={authInputClass}
                  />
                </div>
              </div>
              <div>
                <label className={authFieldLabelClass}>전화번호</label>
                <div className={authInputShellClass}>
                  <Phone size={16} className="text-slate-400" />
                  <input
                    type="text"
                    value={welfareFindEmailPhone}
                    onChange={(e) => setWelfareFindEmailPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className={authInputClass}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleWelfareFindEmail}
                disabled={welfareFindEmailLoading}
                className={authPrimaryButtonClass}
              >
                {welfareFindEmailLoading ? <LoaderCircle size={16} className="animate-spin" /> : null}
                아이디 찾기
              </button>
            </div>
          ) : welfareFindMode === 'find-password' ? (
            /* 복지사 비밀번호 재설정 화면 */
            <div className="mt-5 space-y-4">
              <button
                type="button"
                onClick={() => { setWelfareFindMode(null); setWelfareFindPwResult(''); setWelfareFindPwStep('request'); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-100 bg-white px-3 py-1.5 text-[13px] font-medium text-teal-600 shadow-sm transition hover:bg-teal-50"
              >
                <ChevronLeft size={14} /> 로그인으로 돌아가기
              </button>
              <h2 className="text-[16px] font-semibold text-slate-800">비밀번호 재설정</h2>
              {welfareFindPwResult ? (
                <div className={`rounded-lg px-4 py-3 text-[13px] ${welfareFindPwResult.includes('재설정되었습니다') ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>
                  {welfareFindPwResult}
                </div>
              ) : null}
              {welfareFindPwStep === 'request' ? (
                <>
                  <div>
                    <label className={authFieldLabelClass}>이메일</label>
                    <div className={authInputShellClass}>
                      <Mail size={16} className="text-slate-400" />
                      <input
                        type="text"
                        value={welfareFindPwEmail}
                        onChange={(e) => setWelfareFindPwEmail(e.target.value.toLowerCase())}
                        placeholder="example@email.com"
                        className={authInputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={authFieldLabelClass}>전화번호</label>
                    <div className={authInputShellClass}>
                      <Phone size={16} className="text-slate-400" />
                      <input
                        type="text"
                        value={welfareFindPwPhone}
                        onChange={(e) => setWelfareFindPwPhone(e.target.value)}
                        placeholder="010-0000-0000"
                        className={authInputClass}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleWelfareResetRequestCode}
                    disabled={welfareFindPwLoading}
                    className={authPrimaryButtonClass}
                  >
                    {welfareFindPwLoading ? <LoaderCircle size={16} className="animate-spin" /> : null}
                    인증코드 발송
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[13px] text-slate-500">{welfareFindPwMaskedPhone}로 발송된 6자리 인증코드를 입력해주세요.</p>
                  <div>
                    <label className={authFieldLabelClass}>인증코드</label>
                    <div className={authInputShellClass}>
                      <KeyRound size={16} className="text-slate-400" />
                      <input
                        type="text"
                        value={welfareFindPwCode}
                        onChange={(e) => setWelfareFindPwCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                        placeholder="000000"
                        inputMode="numeric"
                        maxLength={6}
                        className={`${authInputClass} text-center text-lg tracking-[0.5em]`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={authFieldLabelClass}>새 비밀번호</label>
                    <div className={authInputShellClass}>
                      <LockKeyhole size={16} className="text-slate-400" />
                      <input
                        type={isWelfareFindPwVisible ? 'text' : 'password'}
                        value={welfareFindPwNewPassword}
                        onChange={(e) => setWelfareFindPwNewPassword(e.target.value)}
                        placeholder="새 비밀번호 (6자 이상)"
                        className={authInputClass}
                      />
                      {welfareFindPwNewPassword ? (
                        <button type="button" onClick={() => setWelfareFindPwNewPassword('')} className={signupInputIconButtonClass} aria-label="비밀번호 지우기">
                          <X size={14} />
                        </button>
                      ) : null}
                      <button type="button" onClick={() => setIsWelfareFindPwVisible((prev) => !prev)} className={signupInputIconButtonClass} aria-label="비밀번호 보기">
                        {isWelfareFindPwVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={authFieldLabelClass}>새 비밀번호 확인</label>
                    <div className={authInputShellClass}>
                      <LockKeyhole size={16} className="text-slate-400" />
                      <input
                        type={isWelfareFindPwConfirmVisible ? 'text' : 'password'}
                        value={welfareFindPwConfirmPassword}
                        onChange={(e) => setWelfareFindPwConfirmPassword(e.target.value)}
                        placeholder="비밀번호 재입력"
                        className={authInputClass}
                      />
                      {welfareFindPwConfirmPassword ? (
                        <button type="button" onClick={() => setWelfareFindPwConfirmPassword('')} className={signupInputIconButtonClass} aria-label="비밀번호 확인 지우기">
                          <X size={14} />
                        </button>
                      ) : null}
                      <button type="button" onClick={() => setIsWelfareFindPwConfirmVisible((prev) => !prev)} className={signupInputIconButtonClass} aria-label="비밀번호 확인 보기">
                        {isWelfareFindPwConfirmVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleWelfareFindPassword}
                    disabled={welfareFindPwLoading}
                    className={authPrimaryButtonClass}
                  >
                    {welfareFindPwLoading ? <LoaderCircle size={16} className="animate-spin" /> : null}
                    비밀번호 변경
                  </button>
                  <p className="text-center text-[12px] text-slate-400">
                    코드가 오지 않았나요?{' '}
                    <button onClick={handleWelfareResetRequestCode} className="text-teal-500 underline" disabled={welfareFindPwLoading}>
                      재발송
                    </button>
                  </p>
                </>
              )}
            </div>
          ) : authMode === 'login' ? (
            <form className="mt-5 space-y-4" onSubmit={handleAuthLogin}>
              <div>
                <label className={authFieldLabelClass}>이메일</label>
                <div className={authInputShellClass}>
                  <Mail size={16} className="text-slate-400" />
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    className={authInputClass}
                    placeholder="welfare@example.com"
                  />
                </div>
              </div>
              <div>
                <label className={authFieldLabelClass}>비밀번호</label>
                <div className={authInputShellClass}>
                  <LockKeyhole size={16} className="text-slate-400" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    className={authInputClass}
                    placeholder="비밀번호 입력"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className={authCheckboxLabelClass}>
                  <input
                    type="checkbox"
                    checked={rememberWelfareEmail}
                    onChange={(event) => setRememberWelfareEmail(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-teal-600 peer-checked:bg-teal-600 transition-colors">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span className="text-[13px] font-medium text-slate-600">ID 저장</span>
                </label>
                <label className={authCheckboxLabelClass}>
                  <input
                    type="checkbox"
                    checked={autoLoginEnabled}
                    onChange={(event) => setAutoLoginEnabled(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-teal-600 peer-checked:bg-teal-600 transition-colors">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span className="text-[13px] font-medium text-slate-600">자동 로그인</span>
                </label>
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className={`${authPrimaryButtonClass} mt-2`}
              >
                <LogIn size={16} />
                {authSubmitting ? '처리중...' : '로그인'}
              </button>
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setWelfareFindMode('find-email')} className="text-[13px] text-slate-400 hover:text-slate-600">
                  아이디 찾기
                </button>
                <span className="mx-2 text-slate-300">|</span>
                <button type="button" onClick={() => setWelfareFindMode('find-password')} className="text-[13px] text-slate-400 hover:text-slate-600">
                  비밀번호 찾기
                </button>
              </div>
            </form>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={handleAuthSignup}>
              <div>
                <label className="text-[13px] text-slate-600">이름 <span className="text-rose-400">*</span></label>
                <div className={authInputShellClass}>
                  <UserRound size={16} className="text-slate-400" />
                  <input
                    type="text"
                    value={signupForm.name}
                    onChange={(event) => setSignupForm((prev) => ({ ...prev, name: event.target.value }))}
                    className={authInputClass}
                    placeholder="이름 입력"
                  />
                </div>
              </div>
              <div>
                <label className="text-[13px] text-slate-600">이메일 <span className="text-rose-400">*</span></label>
                <div className={authEmailGroupClass}>
                  <div className="flex h-[44px] items-center gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white px-4">
                    <Mail size={16} className="text-slate-400" />
                    <input
                      type="text"
                      value={signupEmailLocalPart}
                      onChange={(event) => {
                        const nextValue = event.target.value.replace(/\s/g, '').toLowerCase();
                        syncSignupEmailValue({ localPart: nextValue });
                      }}
                      className={authInputClass}
                      placeholder="이메일 아이디"
                    />
                    <span className="text-sm font-semibold text-slate-400">@</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-11 flex-1 min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-white px-4">
                      <select
                        value={signupDomainOption}
                        onChange={(event) => {
                          const nextOption = event.target.value;
                          if (nextOption !== 'custom') {
                            syncSignupEmailValue({ domainOption: nextOption, customDomain: '' });
                            return;
                          }
                          syncSignupEmailValue({ domainOption: nextOption });
                        }}
                        className="flex-1 min-w-0 h-full bg-transparent text-sm text-slate-900 outline-none border-0"
                      >
                        <option value="">도메인 선택</option>
                        {WELFARE_EMAIL_DOMAIN_OPTIONS.map((domain) => (
                          <option key={domain} value={domain}>
                            {domain}
                          </option>
                        ))}
                        <option value="custom">직접 입력</option>
                      </select>
                      {signupDomainOption === 'custom' ? (
                        <input
                          type="text"
                          value={signupCustomDomain}
                          onChange={(event) => {
                            const nextValue = event.target.value.replace(/\s/g, '').toLowerCase();
                            syncSignupEmailValue({ customDomain: nextValue });
                          }}
                          className="flex-1 min-w-0 h-full bg-transparent text-sm text-slate-900 outline-none border-0"
                          placeholder="도메인 입력"
                        />
                      ) : (
                        <span className="flex-1 min-w-0 text-sm text-slate-400 truncate">
                          {signupDomainOption || '도메인'}
                        </span>
                      )}
                    </div>
                    {signupEmailVerified ? (
                      <span className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[13px] font-medium text-emerald-600">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        사용 가능
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCheckSignupEmail}
                        disabled={isSignupEmailChecking}
                        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 text-[13px] font-medium text-teal-600 transition hover:bg-teal-100 active:scale-95 disabled:opacity-50"
                      >
                        {isSignupEmailChecking ? <LoaderCircle size={14} className="animate-spin" /> : null}
                        중복확인
                      </button>
                    )}
                  </div>
                </div>
                {signupEmailCheckMessage ? (
                  <p className={`mt-1 text-[12px] ${signupEmailCheckResult === 'available' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {signupEmailCheckMessage}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-[13px] text-slate-600">전화번호 <span className="text-rose-400">*</span></label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex h-11 flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4">
                    <Phone size={16} className="text-slate-400" />
                    <input
                      type="text"
                      value={signupForm.phone}
                      onChange={(event) => setSignupForm((prev) => ({ ...prev, phone: event.target.value }))}
                      className={authInputClass}
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <button
                    type="button"
                    className={authSecondaryButtonClass}
                  >
                    <ShieldCheck size={16} />
                    휴대폰 본인인증
                  </button>
                </div>
              </div>
              <div className="space-y-3 rounded-lg border-2 border-teal-200 bg-teal-50/30 p-4">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-teal-700">
                  <MapPinned size={14} />
                  지역 소속
                </div>
                <div className="grid grid-cols-1 gap-3">
                <label className="block">
                  <span className="text-[13px] text-slate-600">시/도</span>
                  <select
                    value={signupForm.city}
                    onChange={(event) =>
                      setSignupForm((prev) => ({
                        ...prev,
                        city: event.target.value,
                        district: '',
                        dong: '',
                      }))
                    }
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-teal-600"
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  >
                    <option value="" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>시/도 선택</option>
                    {MEMBER_REGION_CATALOG.map((city) => (
                      <option key={city.name} value={city.name} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[13px] text-slate-600">시/군/구</span>
                  <select
                    value={signupForm.district}
                    onChange={(event) =>
                      setSignupForm((prev) => ({
                        ...prev,
                        district: event.target.value,
                        dong: '',
                      }))
                    }
                    disabled={!signupForm.city}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-teal-600 disabled:bg-slate-100 disabled:text-slate-400"
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  >
                    <option value="" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>시/군/구 선택</option>
                    {signupDistrictOptions.map((district) => (
                      <option key={district.name} value={district.name} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[13px] text-slate-600">읍/면/동</span>
                  <select
                    value={signupForm.dong}
                    onChange={(event) => setSignupForm((prev) => ({ ...prev, dong: event.target.value }))}
                    disabled={!signupForm.district}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-teal-600 disabled:bg-slate-100 disabled:text-slate-400"
                    style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                  >
                    <option value="" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>읍/면/동 선택</option>
                    {signupAreaOptions.map((area) => (
                      <option key={area} value={area} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                        {area}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              </div>
              {/* 비밀번호 영역 - 하나의 박스로 묶음 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div>
                <label className="text-[13px] text-slate-600">비밀번호 <span className="text-rose-400">*</span></label>
                <div className={authInputShellClass}>
                  <LockKeyhole size={16} className="text-slate-400" />
                  <input
                    type={showSignupPasswordText ? 'text' : 'password'}
                    value={signupForm.password}
                    onChange={(event) => setSignupForm((prev) => ({ ...prev, password: event.target.value }))}
                    className={authInputClass}
                    placeholder="비밀번호 입력"
                  />
                  {signupForm.password ? (
                    <button
                      type="button"
                      onClick={() => setSignupForm((prev) => ({ ...prev, password: '' }))}
                      className={signupInputIconButtonClass}
                      aria-label="복지사 회원가입 비밀번호 지우기"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowSignupPasswordText((prev) => !prev)}
                    className={signupInputIconButtonClass}
                    aria-label="복지사 회원가입 비밀번호 보기 전환"
                  >
                    {showSignupPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[13px] text-slate-600">비밀번호 확인 <span className="text-rose-400">*</span></label>
                <div className={authInputShellClass}>
                  <LockKeyhole size={16} className="text-slate-400" />
                  <input
                    type={showSignupPasswordConfirmText ? 'text' : 'password'}
                    value={signupForm.passwordConfirm}
                    onChange={(event) => setSignupForm((prev) => ({ ...prev, passwordConfirm: event.target.value }))}
                    className={authInputClass}
                    placeholder="비밀번호 다시 입력"
                  />
                  {signupForm.passwordConfirm ? (
                    <button
                      type="button"
                      onClick={() => setSignupForm((prev) => ({ ...prev, passwordConfirm: '' }))}
                      className={signupInputIconButtonClass}
                      aria-label="복지사 회원가입 비밀번호 확인 지우기"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowSignupPasswordConfirmText((prev) => !prev)}
                    className={signupInputIconButtonClass}
                    aria-label="복지사 회원가입 비밀번호 확인 보기 전환"
                  >
                    {showSignupPasswordConfirmText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2.5">
                {/* 필수 약관 모두 동의 */}
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <label className="flex flex-1 items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={welfareTermsAgreed && welfarePrivacyAgreed && welfareLocationAgreed && welfareBiometricAgreed && welfareThirdPartyAgreed && welfareWearableAgreed}
                      onChange={(e) => {
                        setWelfareTermsAgreed(e.target.checked);
                        setWelfarePrivacyAgreed(e.target.checked);
                        setWelfareLocationAgreed(e.target.checked);
                        setWelfareBiometricAgreed(e.target.checked);
                        setWelfareThirdPartyAgreed(e.target.checked);
                        setWelfareWearableAgreed(e.target.checked);
                      }}
                      className="peer sr-only"
                    />
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-teal-600 peer-checked:bg-teal-600 transition-colors">
                      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <span className="text-[13px] font-semibold text-slate-900">필수 약관 모두 동의</span>
                  </label>
                </div>
                {/* 서비스 이용약관 동의 */}
                <div className="flex items-center gap-2">
                  <label className="flex flex-1 items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={welfareTermsAgreed}
                      onChange={(event) => setWelfareTermsAgreed(event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-teal-600 peer-checked:bg-teal-600 transition-colors">
                      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <span className="text-[13px] text-slate-700">
                      {POLICY_CONTENT.terms.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setWelfareTermsModal('terms')}
                    className="shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  >
                    약관보기
                  </button>
                </div>
                {/* 개인정보 수집 및 이용 동의 */}
                <div className="flex items-center gap-2">
                  <label className="flex flex-1 items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={welfarePrivacyAgreed}
                      onChange={(event) => setWelfarePrivacyAgreed(event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-teal-600 peer-checked:bg-teal-600 transition-colors">
                      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <span className="text-[13px] text-slate-700">
                      {POLICY_CONTENT.privacy.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setWelfareTermsModal('privacy')}
                    className="shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  >
                    약관보기
                  </button>
                </div>
                {/* 위치정보 수집 및 이용 동의 */}
                <div className="flex items-center gap-2">
                  <label className="flex flex-1 items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={welfareLocationAgreed}
                      onChange={(event) => setWelfareLocationAgreed(event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-teal-600 peer-checked:bg-teal-600 transition-colors">
                      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <span className="text-[13px] text-slate-700">
                      {POLICY_CONTENT.location.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setWelfareTermsModal('location')}
                    className="shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  >
                    약관보기
                  </button>
                </div>
                {/* 생체데이터 수집 및 이용 동의 */}
                <div className="flex items-center gap-2">
                  <label className="flex flex-1 items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={welfareBiometricAgreed}
                      onChange={(event) => setWelfareBiometricAgreed(event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-teal-600 peer-checked:bg-teal-600 transition-colors">
                      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <span className="text-[13px] text-slate-700">
                      {POLICY_CONTENT.biometric.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setWelfareTermsModal('biometric')}
                    className="shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  >
                    약관보기
                  </button>
                </div>
                {/* 제3자 정보 제공 동의 */}
                <div className="flex items-center gap-2">
                  <label className="flex flex-1 items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={welfareThirdPartyAgreed}
                      onChange={(event) => setWelfareThirdPartyAgreed(event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-teal-600 peer-checked:bg-teal-600 transition-colors">
                      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <span className="text-[13px] text-slate-700">
                      {POLICY_CONTENT.thirdParty.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setWelfareTermsModal('thirdParty')}
                    className="shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  >
                    약관보기
                  </button>
                </div>
                {/* 웨어러블 기기 연동 서비스 이용약관 */}
                <div className="flex items-center gap-2">
                  <label className="flex flex-1 items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={welfareWearableAgreed}
                      onChange={(event) => setWelfareWearableAgreed(event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-teal-600 peer-checked:bg-teal-600 transition-colors">
                      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <span className="text-[13px] text-slate-700">
                      {POLICY_CONTENT.wearable.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setWelfareTermsModal('wearable')}
                    className="shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  >
                    약관보기
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className={`${authPrimaryButtonClass} mt-2`}
              >
                <UserPlus size={16} />
                {authSubmitting ? '처리중...' : '회원가입'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="safe-area-shell mx-auto min-h-screen w-full max-w-[440px] overflow-x-hidden px-3 min-[393px]:px-4 sm:max-w-[720px] sm:px-5 lg:max-w-[1180px] lg:px-6 2xl:max-w-[1360px]">
      <MenuOverlay
        open={menuOpen}
        activeTab={activeTab}
        onClose={() => setMenuOpen(false)}
        onSelect={handleMenuSelect}
      />
      <SearchOverlay
        open={searchOpen}
        keyword={searchKeyword}
        onChange={setSearchKeyword}
        onClose={() => setSearchOpen(false)}
      />
      <MapOverlay member={mapOpen ? selectedMember : null} onClose={() => setMapOpen(false)} />
      {welfareTermsModalElement}

      <main className="pb-10 pt-5">
        {loading ? (
          <div className="card flex items-center justify-center gap-3 p-10 text-slate-500">
            <LoaderCircle className="animate-spin" size={22} />
            데이터를 불러오는 중입니다.
          </div>
        ) : error ? (
          <div className="card p-5">
            <div className="flex items-center gap-2 text-[17px] font-bold text-red-600">
              <AlertTriangle size={18} />
              {error}
            </div>
            <button
              type="button"
              onClick={loadDashboard}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-3 font-bold text-red-700"
            >
              <RefreshCw size={18} />
              다시 불러오기
            </button>
          </div>
        ) : (
          <>
            <TopBar
              locationLabel={topLocationLabel}
              nameLabel={topNameLabel}
              alertCount={alertItems.length}
              onMenu={() => setMenuOpen(true)}
              onSearch={() => setSearchOpen(true)}
              onAlerts={() => {
                setSearchOpen(false);
                setExpandedAlertId(alertItems[0]?.id || '');
                setActiveTab('alerts');
              }}
              showSearchButton={activeTab === 'members'}
            refreshControls={
              activeTab === 'members' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDashboardRefreshMode('auto')}
                    className={`inline-flex h-10 items-center justify-center rounded-lg px-3.5 text-[14px] font-semibold ${
                      dashboardRefreshMode === 'auto'
                        ? 'bg-teal-700 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    자동
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardRefreshMode('manual')}
                    className={`inline-flex h-10 items-center justify-center rounded-lg px-3.5 text-[14px] font-semibold ${
                      dashboardRefreshMode === 'manual'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    수동
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadDashboard({ silent: true })}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3.5 text-[14px] font-semibold text-teal-700"
                  >
                    <RefreshCw size={16} />
                    새로고침
                  </button>
                </>
              ) : null
            }
            />

            {shadowMonitoring ? (
              <section className={`mt-3 rounded-[24px] border px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.08)] ${shadowBannerToneClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={18} className="shrink-0" />
                    <span className="text-[13px] font-extrabold tracking-[0.08em]">
                      SHADOW MONITORING
                    </span>
                  </div>
                  <div className="rounded-full bg-white/70 px-2.5 py-1 text-[12px] font-extrabold">
                    {shadowMonitoring.status === 'MISMATCH' ? '주의' : '정상'}
                  </div>
                </div>
                <p className="mt-2 text-[14px] font-bold leading-5">
                  {shadowMonitoring.summaryMessage}
                </p>
                <p className="mt-1 text-[13px] leading-5 opacity-90">
                  {shadowMonitoring.recommendedAction}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold opacity-90">
                  <span>전체 gap {shadowMonitoring.totalGap}</span>
                  <span>실시간 {shadowMonitoring.realtimeGap}</span>
                  <span>워크플로우 {shadowMonitoring.workflowGap}</span>
                </div>
                {shadowConsistencySummary ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-white/70 bg-white/65 px-3.5 py-3">
                      <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-500">
                        SHADOW CONSISTENCY
                      </div>
                      <p className="mt-1 text-[13px] font-bold leading-5 text-slate-800">
                        {shadowConsistencySummary.summaryMessage}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[12px] font-semibold text-slate-700">
                        <span>scope {shadowConsistencySummary.selectedScopes.join(', ')}</span>
                        <span>불일치 {shadowConsistencySummary.inconsistentScopes.length}개</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-[20px] border border-white/70 bg-white/65 px-3.5 py-3 text-slate-800">
                        <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-500">
                          REALTIME
                        </div>
                        <div className="mt-1 text-[15px] font-bold">
                          연속 {shadowConsistencySummary.realtimeTrend.consecutiveMismatchCount}
                        </div>
                        <div className="text-[12px] font-semibold text-slate-600">
                          누적 {shadowConsistencySummary.realtimeTrend.totalMismatchCount}
                        </div>
                      </div>
                      <div className="rounded-[20px] border border-white/70 bg-white/65 px-3.5 py-3 text-slate-800">
                        <div className="text-[11px] font-extrabold tracking-[0.08em] text-slate-500">
                          WORKFLOW
                        </div>
                        <div className="mt-1 text-[15px] font-bold">
                          연속 {shadowConsistencySummary.workflowTrend.consecutiveMismatchCount}
                        </div>
                        <div className="text-[12px] font-semibold text-slate-600">
                          누적 {shadowConsistencySummary.workflowTrend.totalMismatchCount}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {activeTab === 'members' && (
              <div className="mt-4 space-y-3">
                <div className="lg:hidden">
                  {membersView === 'list' ? (
                    <>
                      {searchKeyword ? (
                        <div className="flex items-center justify-between gap-3 rounded-[20px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.06)]">
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold tracking-[0.08em] text-slate-400">SEARCH RESULT</div>
                            <div className="mt-1 truncate text-[15px] font-semibold text-slate-600">
                              <span className="font-extrabold text-slate-900">{filteredMembers.length}명</span>
                              {' '}검색됨 ·
                              <span className="ml-1 font-extrabold text-slate-900">{searchKeyword}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchKeyword('');
                              setSearchOpen(false);
                              setSelectedMemberId('');
                            }}
                            className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-[14px] font-bold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                          >
                            회원리스트로
                          </button>
                        </div>
                      ) : null}
                      <section className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
                        {filteredMembers.map((member) => (
                          <MemberCard
                            key={member.id}
                            member={member}
                            onClick={() => {
                              setSearchOpen(false);
                              setSelectedMemberId(member.id);
                              setSelectedMetricKey(null);
                              setMembersView('detail');
                            }}
                          />
                        ))}
                        {filteredMembers.length === 0 && (
                          <div className="card border border-slate-300 p-8 text-center text-slate-500 min-[360px]:col-span-2">표시할 담당 회원이 없습니다.</div>
                        )}
                      </section>
                    </>
                  ) : (
                    selectedMember && (
                      selectedMetricKey ? (
                        <MemberMetricDetail
                          member={selectedMember}
                          metricKey={selectedMetricKey}
                          onBack={() => setSelectedMetricKey(null)}
                        />
                      ) : (
                        <MemberDetail
                          member={selectedMember}
                          onBack={() => {
                            setSelectedMetricKey(null);
                            setMembersView('list');
                          }}
                          onOpenMap={() => setMapOpen(true)}
                          onMetricSelect={setSelectedMetricKey}
                        />
                      )
                    )
                  )}
                </div>

                <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.9fr)] lg:items-start lg:gap-5 2xl:gap-6">
                  <section className="space-y-3">
                    {searchKeyword ? (
                      <div className="flex items-center justify-between gap-3 rounded-[20px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.06)]">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold tracking-[0.08em] text-slate-400">SEARCH RESULT</div>
                          <div className="mt-1 truncate text-[15px] font-semibold text-slate-600">
                            <span className="font-extrabold text-slate-900">{filteredMembers.length}명</span>
                            {' '}검색됨 ·
                            <span className="ml-1 font-extrabold text-slate-900">{searchKeyword}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchKeyword('');
                            setSearchOpen(false);
                            setSelectedMemberId('');
                          }}
                          className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-[14px] font-bold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                        >
                          회원리스트로
                        </button>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-4 gap-3">
                      {filteredMembers.map((member) => (
                        <MemberCard
                          key={member.id}
                          member={member}
                          onClick={() => {
                            setSearchOpen(false);
                            setSelectedMemberId(member.id);
                            setSelectedMetricKey(null);
                          }}
                        />
                      ))}
                      {filteredMembers.length === 0 && (
                        <div className="card border border-slate-300 p-8 text-center text-slate-500 col-span-4">표시할 담당 회원이 없습니다.</div>
                      )}
                    </div>
                  </section>

                  <section className="lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto lg:pr-1">
                    {selectedMember ? (
                      selectedMetricKey ? (
                        <MemberMetricDetail
                          member={selectedMember}
                          metricKey={selectedMetricKey}
                          onBack={() => setSelectedMetricKey(null)}
                        />
                      ) : (
                        <MemberDetail
                          member={selectedMember}
                          onBack={() => {
                            setSelectedMetricKey(null);
                            setMembersView('list');
                          }}
                          onOpenMap={() => setMapOpen(true)}
                          onMetricSelect={setSelectedMetricKey}
                          showBackButton={false}
                        />
                      )
                    ) : (
                      <div className="card border border-slate-300 p-10 text-center text-slate-500">회원 카드를 선택하면 상세 정보가 표시됩니다.</div>
                    )}
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <section className="mt-4 space-y-3">
                <div className="card border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="text-[19px] font-extrabold tracking-[-0.03em] text-slate-900">알림페이지</div>
                  <div className="mt-1.5 text-[14px] font-medium text-slate-500">공지 제목을 눌러 상세 내용을 확인합니다.</div>
                </div>
                {alertItems.map((alert) => {
                  const isOpen = expandedAlertId === alert.id;
                  return (
                    <article key={alert.id} className="card overflow-hidden border border-white/80 bg-white/94 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                      <button
                        type="button"
                        onClick={() => setExpandedAlertId(isOpen ? '' : alert.id)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-slate-900 min-[360px]:text-[16px]">{alert.title}</div>
                          <div className="mt-1 text-[14px] font-medium text-slate-400">{formatDateTime(alert.createdAt)}</div>
                        </div>
                        <span className={`${resolveRiskChipClass(alert.level)} min-w-[52px] justify-center px-2 py-1 text-[13px] shadow-[0_8px_18px_rgba(15,23,42,0.05)] min-[360px]:text-[14px]`}>
                          {alert.level}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-slate-100 px-4 py-4 text-[14px] leading-6 text-slate-700 min-[360px]:text-[15px]">
                          {alert.description}
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            )}

            {activeTab === 'mypage' && (
              <section className="mt-4 space-y-3">
                {myPageView === 'main' ? (
                  <>
                    <div className="card border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[19px] font-extrabold tracking-[-0.03em] text-slate-900">마이페이지</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileMessage('');
                            setMyPageView('edit');
                          }}
                          className="rounded-lg border border-slate-200 bg-slate-50/90 px-3.5 py-2 text-[14px] font-bold text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.04)]"
                        >
                          정보수정
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.9fr)] min-[1024px]:gap-4">
                      <div className="space-y-3">
                        <div className="card border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="text-[16px] font-extrabold tracking-[-0.02em] text-slate-900">기본 정보</div>
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-bold text-slate-500">복지사 계정</div>
                          </div>
                          <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2 min-[768px]:gap-3">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                              <div className="text-[13px] font-semibold text-slate-400">아이디</div>
                              <div className="mt-1 min-w-0 break-all text-[15px] font-semibold text-slate-900">{currentWelfare?.email || '-'}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                              <div className="text-[13px] font-semibold text-slate-400">비밀번호</div>
                              <div className="mt-1 min-w-0 break-all text-[15px] font-semibold text-slate-900">********</div>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                              <div className="text-[13px] font-semibold text-slate-400">이메일</div>
                              <div className="mt-1 min-w-0 break-all text-[15px] font-semibold text-slate-900">{currentWelfare?.email || '-'}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                              <div className="text-[13px] font-semibold text-slate-400">전화번호</div>
                              <div className="mt-1 min-w-0 break-all text-[15px] font-semibold text-slate-900">{currentWelfare?.phone || '-'}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 min-[640px]:col-span-2">
                              <div className="text-[13px] font-semibold text-slate-400">소속</div>
                              <div className="mt-1 min-w-0 break-words text-[15px] font-semibold text-slate-900">{[currentWelfare?.affiliation?.city, currentWelfare?.affiliation?.district, currentWelfare?.affiliation?.dong].filter(Boolean).join(' ') || '-'}</div>
                              {currentWelfare?.pendingAffiliationChange ? (
                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                                  <div className="text-[12px] font-bold text-amber-700">승인 대기 중인 소속 변경 요청</div>
                                  <div className="mt-1 text-[14px] font-semibold text-amber-900">
                                    {[currentWelfare.pendingAffiliationChange.city, currentWelfare.pendingAffiliationChange.district, currentWelfare.pendingAffiliationChange.dong].filter(Boolean).join(' ') || '-'}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                              <div className="text-[13px] font-semibold text-slate-400">담당자</div>
                              <div className="mt-1 min-w-0 break-words text-[15px] font-semibold text-slate-900">{currentWelfare?.name || '-'}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                              <div className="text-[13px] font-semibold text-slate-400">코드</div>
                              <div className="mt-1 min-w-0 break-all text-[15px] font-semibold text-slate-900">{currentWelfare?._id ? currentWelfare._id.slice(-6).toUpperCase() : '-'}</div>
                            </div>
                          </div>
                        </div>

                        {profileMessage ? (
                          <div className="rounded-[20px] border border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5_0%,#d1fae5_100%)] px-4 py-3.5 text-[14px] font-semibold text-emerald-700 shadow-[0_12px_24px_rgba(16,185,129,0.10)]">
                            {profileMessage}
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        <div className="card border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                          <div className="text-[16px] font-extrabold tracking-[-0.02em] text-slate-900">계정 설정</div>
                          <div className="mt-4 space-y-3">
                            <button
                              type="button"
                              onClick={() => setMyPageView('password')}
                              className="card flex w-full items-center justify-center gap-2 border border-white/80 bg-white px-4 py-4 text-[15px] font-bold text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.08)] min-[360px]:text-[16px]"
                            >
                              <LockKeyhole size={18} />
                              비밀번호변경
                            </button>

                            <button
                              type="button"
                              onClick={handleAuthLogout}
                              className="card flex w-full items-center justify-center gap-2 border border-rose-200 bg-rose-50 px-4 py-4 text-[15px] font-bold text-rose-700 shadow-[0_18px_40px_rgba(15,23,42,0.08)] min-[360px]:text-[16px]"
                            >
                              <LogOut size={18} />
                              로그아웃
                            </button>
                          </div>
                        </div>

                        <div className="card border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                          <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">App Info</div>
                          <div className="mt-2 text-[15px] font-bold text-slate-800">Version 0.1</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : myPageView === 'edit' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMessage('');
                        setMyPageView('main');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/80 bg-white/90 px-3.5 py-2.5 text-[14px] font-bold text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
                    >
                      <ChevronLeft size={15} />
                      마이페이지로
                    </button>

                    <div className="card border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                      <div className="text-[19px] font-extrabold tracking-[-0.03em] text-slate-900">정보수정</div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.9fr)] min-[1024px]:gap-4">
                      <div className="card space-y-3.5 border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                        <div className="text-[16px] font-extrabold tracking-[-0.02em] text-slate-900">입력 정보</div>
                        <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2">
                          <div className="space-y-1.5">
                            <div className="text-[14px] font-semibold text-slate-400">이메일</div>
                            <input
                              type="text"
                              value={profileForm.email}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <div className="text-[14px] font-semibold text-slate-400">전화번호</div>
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-col gap-2 min-[480px]:flex-row">
                                <input
                                  type="text"
                                  value={profileForm.phone}
                                  onChange={(event) => {
                                    setProfileForm((prev) => ({ ...prev, phone: event.target.value }));
                                    setProfilePhoneCode('');
                                    setProfilePhoneVerificationToken('');
                                    setProfilePhoneNotice('');
                                  }}
                                  placeholder="01012345678"
                                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
                                />
                                <button
                                  type="button"
                                  onClick={handleProfilePhoneVerificationRequest}
                                  disabled={profilePhoneSending}
                                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-700 disabled:opacity-60 min-[480px]:min-w-[140px]"
                                >
                                  <ShieldCheck size={16} />
                                  {profilePhoneSending ? '발송중...' : '인증번호 발송'}
                                </button>
                              </div>
                              <div className="flex flex-col gap-2 min-[480px]:flex-row">
                                <input
                                  type="text"
                                  value={profilePhoneCode}
                                  onChange={(event) => setProfilePhoneCode(event.target.value)}
                                  placeholder="인증번호 6자리"
                                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
                                />
                                <button
                                  type="button"
                                  onClick={handleProfilePhoneVerificationConfirm}
                                  disabled={profilePhoneVerifying}
                                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                                >
                                  {profilePhoneVerifying ? '확인중...' : '인증 확인'}
                                </button>
                              </div>
                            </div>
                            {profilePhoneNotice ? (
                              <div
                                className={`rounded-lg border px-3 py-2 text-[13px] ${
                                  profilePhoneVerificationToken
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                                }`}
                              >
                                {profilePhoneNotice}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-3">
                          <div className="space-y-1.5">
                            <div className="text-[14px] font-semibold text-slate-400">시</div>
                            <select
                              value={profileForm.city}
                              onChange={(event) =>
                                setProfileForm((prev) => ({
                                  ...prev,
                                  city: event.target.value,
                                  district: '',
                                  dong: '',
                                }))
                              }
                              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
                            >
                              <option value="">시/도 선택</option>
                              {MEMBER_REGION_CATALOG.map((city) => (
                                <option key={city.name} value={city.name}>
                                  {city.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <div className="text-[14px] font-semibold text-slate-400">구</div>
                            <select
                              value={profileForm.district}
                              onChange={(event) =>
                                setProfileForm((prev) => ({
                                  ...prev,
                                  district: event.target.value,
                                  dong: '',
                                }))
                              }
                              disabled={!profileForm.city}
                              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <option value="">시/군/구 선택</option>
                              {profileDistrictOptions.map((district) => (
                                <option key={district.name} value={district.name}>
                                  {district.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <div className="text-[14px] font-semibold text-slate-400">동</div>
                            <select
                              value={profileForm.dong}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, dong: event.target.value }))}
                              disabled={!profileForm.city || !profileForm.district}
                              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <option value="">읍/면/동 선택</option>
                              {profileAreaOptions.map((area) => (
                                <option key={area} value={area}>
                                  {area}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {profileMessage ? (
                          <div className="rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-4 py-3.5 text-[14px] font-medium text-slate-600">
                            {profileMessage}
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        {currentWelfare?.pendingAffiliationChange ? (
                          <div className="card border border-amber-200 bg-[linear-gradient(180deg,#fffaf0_0%,#fef3c7_100%)] px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                            <div className="text-[14px] font-bold text-amber-800">소속 변경 승인대기</div>
                            <div className="mt-2 text-[15px] font-semibold text-amber-950">
                              {[currentWelfare.pendingAffiliationChange.city, currentWelfare.pendingAffiliationChange.district, currentWelfare.pendingAffiliationChange.dong].filter(Boolean).join(' ') || '-'}
                            </div>
                          </div>
                        ) : null}

                        <div className="card space-y-3 border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                          <button
                            type="button"
                            onClick={() => {
                              setProfileMessage('');
                              setMyPageView('main');
                            }}
                            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            disabled={profileSaving}
                            onClick={handleProfileSave}
                            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0f766e_0%,#0f172a_100%)] px-4 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(15,23,42,0.18)] disabled:opacity-60"
                          >
                            {profileSaving ? '저장중...' : '저장하기'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setMyPageView('main')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/80 bg-white/90 px-3.5 py-2.5 text-[14px] font-bold text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
                    >
                      <ChevronLeft size={15} />
                      마이페이지로
                    </button>

                    <div className="card border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                      <div className="text-[19px] font-extrabold tracking-[-0.03em] text-slate-900">비밀번호변경</div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.95fr)] min-[1024px]:gap-4">
                      <div className="card space-y-3.5 border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[16px] font-extrabold tracking-[-0.02em] text-slate-900">비밀번호 입력</div>
                          <button
                            type="button"
                            onClick={() => setShowPasswordText((prev) => !prev)}
                            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-slate-50 px-4 text-sm font-semibold text-slate-500"
                          >
                            {showPasswordText ? <EyeOff size={15} /> : <Eye size={15} />}
                            {showPasswordText ? '숨기기' : '보기'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <input
                            type={passwordInputType}
                            value={passwordForm.currentPassword}
                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                            placeholder="현재 비밀번호를 입력해주세요"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
                          />
                          <input
                            type={passwordInputType}
                            value={passwordForm.nextPassword}
                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, nextPassword: event.target.value }))}
                            placeholder="변경할 비밀번호를 입력해주세요"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
                          />
                          <input
                            type={passwordInputType}
                            value={passwordForm.confirmPassword}
                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                            placeholder="변경할 비밀번호를 다시 입력해주세요"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="card border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                          <div className="text-[16px] font-extrabold tracking-[-0.02em] text-slate-900">변경 안내</div>
                          <div className="mt-2 space-y-2 text-[14px] leading-6 text-slate-500">
                            <p>현재 비밀번호를 먼저 입력한 뒤 새 비밀번호를 두 번 동일하게 입력해주세요.</p>
                            <p>태블릿 화면에서는 입력 영역과 안내 영역을 분리해 가독성을 높였습니다.</p>
                          </div>
                        </div>

                        <div className="card border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                          <button
                            type="button"
                            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0f766e_0%,#0f172a_100%)] px-4 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(15,23,42,0.18)]"
                          >
                            비밀번호 변경
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            {activeTab === 'policy' && (
              <section className="mt-4 space-y-3">
                <div className="card border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center gap-2 text-[19px] font-extrabold tracking-[-0.03em] text-slate-900">
                    <FileText size={18} className="text-slate-700" />
                    개인정보 및 약관
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3">
                  {(
                    [
                      { key: 'terms' as const, label: '서비스 이용약관' },
                      { key: 'privacy' as const, label: '개인정보취급방침' },
                      { key: 'location' as const, label: '위치정보' },
                      { key: 'biometric' as const, label: '생체데이터' },
                      { key: 'thirdParty' as const, label: '제3자 제공' },
                      { key: 'wearable' as const, label: '웨어러블' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setPolicyTab(tab.key)}
                      className={`inline-flex h-9 items-center justify-center rounded-lg border px-2 text-[12px] font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition ${policyTab === tab.key ? 'border-teal-200 bg-[linear-gradient(135deg,#0f766e_0%,#0f172a_100%)] text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="card border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="text-[14px] font-bold tracking-[0.08em] text-slate-400">
                    {POLICY_CONTENT[policyTab]?.title || '약관 내용'}
                  </div>
                  <div className="mt-3.5 whitespace-pre-line text-[14px] leading-6 text-slate-700 min-[360px]:text-[15px]">
                    {formatPolicyContent(policyTab)}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

    </div>
  );
}
