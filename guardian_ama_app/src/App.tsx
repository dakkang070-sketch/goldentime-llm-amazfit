import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  AlertTriangle,
  Battery,
  Brain,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Footprints,
  HeartPulse,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  LocateFixed,
  Mail,
  MapPin,
  Phone,
  Route,
  RefreshCw,
  ShieldCheck,
  Shield,
  Smartphone,
  Thermometer,
  X,
  User,
  UserPlus,
  Watch,
  Waves,
} from 'lucide-react';
import { backendService, resolveGuardianBackendBase } from './services/backendService';

type GuardianTab = 'overview' | 'history' | 'guardian';
type RefreshMode = 'manual' | 'auto';
type GuardianAuthMode = 'login' | 'signup';

interface GuardianSession {
  token: string;
  email: string;
  memberName: string;
  guardianEmail: string;
}

interface GuardianProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  birthDate?: string;
  height?: number;
  weight?: number;
  bloodType?: string;
  status?: string;
  wearableDevice?: any;
  medicalHistory?: {
    chronicDiseases?: Array<{ disease?: string } | string>;
    medications?: Array<{ name?: string } | string>;
    allergies?: Array<{ substance?: string } | string>;
  };
  guardian?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

interface GuardianBiometricPoint {
  id: string;
  collectedAt: string;
  heartRate: number;
  spO2: number;
  bodyTemperature: number;
  steps: number;
  stressLevel: number;
  batteryLevel: number;
  analysis?: {
    analysisResult?: string;
  };
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
}

interface GuardianEmergencyCase {
  id: string;
  emergencyLevel: number;
  status: string;
  detectedAt: string;
  detectedAnomalies?: Array<{ type?: string; description?: string }>;
  locations?: {
    detectedAt?: { address?: string };
    current?: { address?: string };
  };
}

interface GuardianEditableContact {
  name: string;
  relationship: string;
  phone: string;
}

interface GuardianInviteParams {
  accessCode: string;
}

interface GuardianMapLocation {
  lat?: number;
  lng?: number;
  address?: string;
}

type MetricAlertLevel = 'normal' | 'caution' | 'danger';
type MetricDetailKey = 'heartRate' | 'spO2' | 'bodyTemperature' | 'steps' | 'stressLevel' | 'batteryLevel';

interface MetricDetailConfig {
  key: MetricDetailKey;
  label: string;
  unit: string;
  icon: React.ElementType;
  toneClass: string;
  chartColor: string;
  historyDescription: string;
}

const SESSION_STORAGE_KEY = 'guardian_mobile_session_v1';
const GUARDIAN_AUTO_LOGIN_STORAGE_KEY = 'guardian_mobile_auto_login_v1';
const GUARDIAN_PROFILE_STORAGE_KEY = 'guardian_mobile_profile_v1';
const GUARDIAN_REALTIME_FALLBACK_MS = 30_000;
const GUARDIAN_EMAIL_DOMAIN_OPTIONS = ['gmail.com', 'naver.com', 'daum.net', 'hanmail.net', 'kakao.com', 'nate.com'] as const;

/**
 * 보호자앱 회원가입 약관 내용을 정의합니다.
 */
const GUARDIAN_SIGNUP_TERMS_CONTENT: Record<'service' | 'privacy' | 'location' | 'biometric' | 'thirdParty' | 'wearable', { title: string; sections: { heading: string; body: string[] }[] }> = {
  service: {
    title: '서비스 이용약관',
    sections: [
      {
        heading: '서비스 목적',
        body: [
          '보호자앱은 보호 중인 회원의 생체 데이터와 위치 정보를 실시간으로 모니터링하고, 응급 상황 발생 시 신속하게 알림을 받을 수 있는 서비스입니다.',
          '보호자는 본인 계정으로만 서비스를 이용해야 하며 타인의 정보를 무단으로 사용할 수 없습니다.',
        ],
      },
      {
        heading: '보호자 의무',
        body: [
          '회원가입 정보와 연락처는 실제 정보로 입력해야 합니다.',
          '보호자 정보 변경 시 직접 수정해야 하며, 부정확한 정보로 인한 불이익은 보호자 본인의 책임입니다.',
        ],
      },
      {
        heading: '서비스 제한',
        body: [
          '허위 신고, 타인 도용, 시스템 장애 유발 행위가 확인되면 서비스 이용이 제한될 수 있습니다.',
          '데이터 수집과 알림은 통신 환경, 기기 상태, 관리자 승인 상태에 따라 일부 제한될 수 있습니다.',
        ],
      },
    ],
  },
  privacy: {
    title: '개인정보 수집 및 이용 동의',
    sections: [
      {
        heading: '수집 항목',
        body: [
          '이름, 휴대전화번호, 이메일, 보호 중인 회원과의 관계 정보를 수집합니다.',
          '서비스 이용 과정에서 회원의 생체 데이터와 위치 정보가 수집될 수 있습니다.',
        ],
      },
      {
        heading: '이용 목적',
        body: [
          '보호 중인 회원의 응급 상황 감지, 보호자 알림, 관제 대응, 이력 관리에 사용합니다.',
          '가입 승인, 계정 보안, 서비스 운영, 고객 문의 대응을 위해 사용할 수 있습니다.',
        ],
      },
      {
        heading: '보관 및 권리',
        body: [
          '관련 법령 또는 서비스 운영 목적에 필요한 기간 동안 정보를 보관합니다.',
          '보호자는 언제든지 본인 정보 열람, 수정, 탈퇴를 요청할 수 있습니다.',
        ],
      },
    ],
  },
  location: {
    title: '위치정보 수집 및 이용 동의',
    sections: [
      {
        heading: '수집 목적',
        body: [
          '보호 중인 회원의 응급 상황 발생 시 현재 위치를 신속하게 파악하여 보호자에게 전달하기 위해 위치정보를 수집합니다.',
        ],
      },
      {
        heading: '수집 항목',
        body: [
          'GPS 좌표(위도/경도), 이동 경로, 위치 수집 시각',
        ],
      },
      {
        heading: '보관 및 제공',
        body: [
          '위치정보는 보호 중인 회원의 응급 상황 발생 시에만 보호자에게 제공되며, 관련 법령에 따라 일정 기간 보관 후 안전하게 파기됩니다.',
        ],
      },
    ],
  },
  biometric: {
    title: '생체데이터 수집 및 이용 동의',
    sections: [
      {
        heading: '수집 목적',
        body: [
          '보호 중인 회원의 워치 기기를 통해 수집된 생체 데이터를 보호자에게 실시간 제공하여 건강 이상 징후를 조기에 인지할 수 있도록 하기 위함입니다.',
        ],
      },
      {
        heading: '수집 항목',
        body: [
          '심박수(HR), 혈중산소포화도(SpO2), 체온, 걸음수, 스트레스 지수, 워치 배터리 상태',
        ],
      },
      {
        heading: '데이터 활용',
        body: [
          '보호자 화면에서 회원의 생체 데이터를 실시간으로 확인할 수 있으며, 이상 징후 발생 시 알림이 제공됩니다.',
        ],
      },
    ],
  },
  thirdParty: {
    title: '제3자 정보 제공 동의',
    sections: [
      {
        heading: '제공 목적',
        body: [
          '보호자 서비스 이용을 위해 회원의 보호자 정보가 관제센터 및 어드민 관리자에게 제공될 수 있습니다.',
        ],
      },
      {
        heading: '제공 항목',
        body: [
          '보호자 이름, 연락처, 회원과의 관계, 서비스 이용 이력',
        ],
      },
      {
        heading: '보호 조치',
        body: [
          '제공되는 정보는 서비스 운영에 필요한 최소한의 범위로 제한되며, 정보 제공 내역은 모두 기록·관리됩니다.',
        ],
      },
    ],
  },
  wearable: {
    title: '웨어러블 기기 연동 서비스 이용약관',
    sections: [
      {
        heading: '서비스 개요',
        body: [
          '본 서비스는 Amazfit 워치와 연동된 회원의 생체 데이터를 보호자 앱에서 실시간으로 모니터링할 수 있는 서비스입니다.',
        ],
      },
      {
        heading: '기기 연동',
        body: [
          '회원의 Amazfit 워치가 정상적으로 연동되어 있어야 보호자 화면에서 데이터를 확인할 수 있으며, 워치 미착용·Bluetooth 연결 끊김·배터리 방전 등의 사유로 데이터 수집이 중단될 수 있습니다.',
        ],
      },
      {
        heading: '데이터 정확성',
        body: [
          '워치 센서로 측정된 생체 데이터는 의료기기 수준의 정확성을 보장하지 않으며, 참고용 건강 모니터링 목적으로만 사용됩니다.',
        ],
      },
      {
        heading: '보안',
        body: [
          '모든 데이터는 암호화되어 전송 및 저장되며, 회원 탈퇴 시 관련 데이터는 파기됩니다.',
        ],
      },
    ],
  },
};

/**
 * 보호자 이메일 입력값을 아이디/도메인 분리 상태로 변환합니다.
 */
const parseGuardianEmailFields = (
  value: string,
): { localPart: string; domainOption: string; customDomain: string } => {
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
  const matchedDomain = GUARDIAN_EMAIL_DOMAIN_OPTIONS.find((option) => option === domain);

  return {
    localPart: localPart.trim(),
    domainOption: matchedDomain || (domain ? 'custom' : ''),
    customDomain: matchedDomain ? '' : domain,
  };
};

/**
 * 보호자 이메일 아이디/도메인 입력값을 실제 저장용 이메일 문자열로 합칩니다.
 */
const buildGuardianEmailValue = ({
  localPart,
  domainOption,
  customDomain,
}: {
  localPart: string;
  domainOption: string;
  customDomain: string;
}): string => {
  const normalizedLocalPart = String(localPart || '').replace(/\s/g, '').toLowerCase();
  const normalizedDomain =
    domainOption === 'custom'
      ? String(customDomain || '').replace(/\s/g, '').toLowerCase()
      : String(domainOption || '').replace(/\s/g, '').toLowerCase();

  if (!normalizedLocalPart) return '';
  if (!normalizedDomain) return normalizedLocalPart;
  return `${normalizedLocalPart}@${normalizedDomain}`;
};

/**
 * 보호자 회원가입 이메일이 기본 형식을 만족하는지 최소 범위로 확인합니다.
 */
const isGuardianEmailFormatValid = (value: string): boolean => {
  const normalized = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
};

/**
 * 보호자앱 저장 세션을 자동로그인(localStorage) 우선, 임시 세션(sessionStorage) 차선으로 읽어옵니다.
 */
const readStoredGuardianSession = (): GuardianSession | null => {
  try {
    const persisted = String(localStorage.getItem(SESSION_STORAGE_KEY) || '').trim();
    if (persisted) {
      return JSON.parse(persisted) as GuardianSession;
    }
  } catch {
    // no-op
  }

  try {
    const temporary = String(sessionStorage.getItem(SESSION_STORAGE_KEY) || '').trim();
    if (temporary) {
      return JSON.parse(temporary) as GuardianSession;
    }
  } catch {
    // no-op
  }

  return null;
};

/**
 * 보호자 세션을 자동로그인 여부에 따라 localStorage 또는 sessionStorage에 저장합니다.
 */
const persistGuardianSession = (session: GuardianSession, autoLogin: boolean): void => {
  try {
    if (autoLogin) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem(GUARDIAN_AUTO_LOGIN_STORAGE_KEY, '1');
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(GUARDIAN_AUTO_LOGIN_STORAGE_KEY);
  } catch {
    // no-op
  }
};

/**
 * 보호자 저장 세션과 자동로그인 설정을 모두 초기화합니다.
 */
const clearStoredGuardianSession = (): void => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(GUARDIAN_AUTO_LOGIN_STORAGE_KEY);
  } catch {
    // no-op
  }

  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // no-op
  }
};

/**
 * 현재 실행 환경에 맞는 보호자앱 실시간 소켓 서버 주소를 결정합니다.
 */
const resolveGuardianSocketBase = () => {
  try {
    const { hostname, origin, protocol } = window.location;
    if (hostname === 'appassets.androidplatform.net') {
      return 'https://app.goldentime.sbs';
    }
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0'
    ) {
      return 'http://localhost:4003';
    }
    if ((protocol === 'http:' || protocol === 'https:') && origin) {
      return origin;
    }
  } catch {}
  return 'https://app.goldentime.sbs';
};

const METRIC_DETAIL_CONFIGS: Record<MetricDetailKey, MetricDetailConfig> = {
  heartRate: {
    key: 'heartRate',
    label: '심박수',
    unit: 'bpm',
    icon: HeartPulse,
    toneClass: 'bg-rose-50 text-rose-600',
    chartColor: '#e11d48',
    historyDescription: '최근 심박 변화 흐름을 확인합니다.',
  },
  spO2: {
    key: 'spO2',
    label: 'SpO2',
    unit: '%',
    icon: Waves,
    toneClass: 'bg-sky-50 text-sky-600',
    chartColor: '#0284c7',
    historyDescription: '최근 산소포화도 흐름을 확인합니다.',
  },
  bodyTemperature: {
    key: 'bodyTemperature',
    label: '체온',
    unit: '°C',
    icon: Thermometer,
    toneClass: 'bg-orange-50 text-orange-600',
    chartColor: '#ea580c',
    historyDescription: '최근 체온 변화 흐름을 확인합니다.',
  },
  steps: {
    key: 'steps',
    label: '걸음수',
    unit: '보',
    icon: Footprints,
    toneClass: 'bg-emerald-50 text-emerald-600',
    chartColor: '#059669',
    historyDescription: '최근 걸음수 누적 흐름을 확인합니다.',
  },
  stressLevel: {
    key: 'stressLevel',
    label: '스트레스',
    unit: '',
    icon: Brain,
    toneClass: 'bg-violet-50 text-violet-600',
    chartColor: '#7c3aed',
    historyDescription: '최근 스트레스 지수 흐름을 확인합니다.',
  },
  batteryLevel: {
    key: 'batteryLevel',
    label: '워치 배터리',
    unit: '%',
    icon: Battery,
    toneClass: 'bg-amber-50 text-amber-600',
    chartColor: '#d97706',
    historyDescription: '최근 워치 배터리 잔량 변화를 확인합니다.',
  },
};

/**
 * 보호자앱 로그인 전 초기 세션 상태를 생성합니다.
 */
const createEmptySession = (): GuardianSession => ({
  token: '',
  email: '',
  memberName: '',
  guardianEmail: '',
});

/**
 * 보호자 정보 수정 폼에서 사용할 기본 연락처 값을 생성합니다.
 */
const createDefaultGuardianContact = (): GuardianEditableContact => ({
  name: '김보호',
  relationship: '자녀',
  phone: '010-1234-5678',
});

/**
 * 쿼리스트링에 인증코드가 있으면 보호자 회원가입 화면에서 바로 쓸 수 있게 읽어옵니다.
 */
const readGuardianInviteParams = (): GuardianInviteParams | null => {
  try {
    const params = new URLSearchParams(window.location.search);
    const accessCode = String(params.get('accessCode') || '').replace(/\D/g, '').slice(0, 6);
    if (!accessCode) return null;
    return { accessCode };
  } catch {
    return null;
  }
};

/**
 * 보호자 화면에서 비어 있는 프로필을 채울 기본 회원 데이터를 생성합니다.
 */
const createFallbackProfile = (session: GuardianSession | null, guardianPhone: string): GuardianProfile => ({
  id: 'guardian-demo-user',
  name: session?.memberName || '',
  email: session?.email || '',
  phone: '',
  age: undefined,
  birthDate: '',
  height: undefined,
  weight: undefined,
  bloodType: '',
  status: '',
  medicalHistory: {
    chronicDiseases: [],
    medications: [],
    allergies: [],
  },
  wearableDevice: {
    deviceName: '',
    deviceId: '',
    connectionStatus: '',
    lastSyncAt: '',
  },
  guardian: {
    name: '',
    phone: guardianPhone || '',
    relationship: '',
  },
});

/**
 * 저장된 보호자 연락처 정보를 읽어오고 없으면 기본값을 반환합니다.
 */
const getStoredGuardianContact = (): GuardianEditableContact => {
  try {
    const raw = localStorage.getItem(GUARDIAN_PROFILE_STORAGE_KEY);
    if (!raw) {
      return createDefaultGuardianContact();
    }

    const parsed = JSON.parse(raw) as Partial<GuardianEditableContact>;
    const fallback = createDefaultGuardianContact();
    return {
      name: String(parsed.name || fallback.name),
      relationship: String(parsed.relationship || fallback.relationship),
      phone: formatPhoneNumber(parsed.phone || fallback.phone),
    };
  } catch {
    return createDefaultGuardianContact();
  }
};

/**
 * 현재 프로필에 보호자 수정값을 병합해 화면 표시용 프로필을 반환합니다.
 */
const mergeGuardianContactIntoProfile = (
  sourceProfile: GuardianProfile | null,
  guardianContact: GuardianEditableContact,
): GuardianProfile | null => {
  if (!sourceProfile) {
    return null;
  }

  return {
    ...sourceProfile,
    guardian: {
      ...(sourceProfile.guardian || {}),
      name: guardianContact.name,
      relationship: guardianContact.relationship,
      phone: guardianContact.phone,
    },
  };
};

/**
 * 보호자 화면의 요약 카드가 비지 않도록 최근 생체 데이터 예시 목록을 생성합니다.
 */
const createFallbackBiometrics = (): GuardianBiometricPoint[] => [];

/**
 * 소켓으로 받은 생체 이벤트를 보호자 화면 공통 포인트 구조로 정규화합니다.
 */
const createRealtimeBiometricPoint = (
  memberId: string,
  biometricData: Record<string, any>,
): GuardianBiometricPoint => ({
  id: String(
    biometricData?._id ||
      biometricData?.id ||
      biometricData?.biometricId ||
      `${memberId}-${biometricData?.collectedAt || Date.now()}`,
  ),
  collectedAt:
    typeof biometricData?.collectedAt === 'string' && biometricData.collectedAt
      ? biometricData.collectedAt
      : new Date().toISOString(),
  heartRate: typeof biometricData?.heartRate === 'number' ? biometricData.heartRate : 0,
  spO2: typeof biometricData?.spO2 === 'number' ? biometricData.spO2 : 0,
  bodyTemperature: typeof biometricData?.bodyTemperature === 'number' ? biometricData.bodyTemperature : 0,
  steps: typeof biometricData?.steps === 'number' ? biometricData.steps : 0,
  stressLevel: typeof biometricData?.stressLevel === 'number' ? biometricData.stressLevel : 0,
  batteryLevel: typeof biometricData?.batteryLevel === 'number' ? biometricData.batteryLevel : 0,
  analysis:
    biometricData?.analysis && typeof biometricData.analysis === 'object'
      ? {
          analysisResult:
            typeof biometricData.analysis.analysisResult === 'string'
              ? biometricData.analysis.analysisResult
              : undefined,
        }
      : undefined,
  location:
    biometricData?.location && typeof biometricData.location === 'object'
      ? {
          lat: typeof biometricData.location.lat === 'number' ? biometricData.location.lat : undefined,
          lng: typeof biometricData.location.lng === 'number' ? biometricData.location.lng : undefined,
          address:
            typeof biometricData.location.address === 'string' ? biometricData.location.address : undefined,
        }
      : undefined,
});

/**
 * 실시간 생체 이벤트를 기존 목록 최상단에 병합하고 같은 시각 데이터는 중복 저장하지 않습니다.
 */
const mergeRealtimeBiometrics = (
  current: GuardianBiometricPoint[],
  nextPoint: GuardianBiometricPoint,
): GuardianBiometricPoint[] => {
  const deduped = current.filter(
    (point) => point.id !== nextPoint.id && point.collectedAt !== nextPoint.collectedAt,
  );
  return [nextPoint, ...deduped].slice(0, 24);
};

/**
 * 보호자 앱 응급 이력 화면에 표시할 기본 예시 데이터를 생성합니다.
 */
const createFallbackEmergencyHistory = (): GuardianEmergencyCase[] => [];

/**
 * 보호자 앱 탭 버튼을 렌더링합니다.
 */
const GuardianTabButton: React.FC<{
  active: boolean;
  label: string;
  onClick: () => void;
}> = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 rounded-lg px-4 py-3 text-[14px] transition-colors ${
      active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border border-slate-200 bg-white text-slate-500'
    }`}
  >
    {label}
  </button>
);

/**
 * 지도 좌표가 실제 지도 표시 가능한 값인지 확인합니다.
 */
const hasValidCoordinates = (lat?: number, lng?: number) =>
  typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng);

/**
 * 최근 생체 데이터와 응급 이력에서 보호자용 현재 위치 정보를 정리합니다.
 */
const resolveGuardianMapLocation = (
  biometric: GuardianBiometricPoint | null,
  emergency: GuardianEmergencyCase | null,
): GuardianMapLocation => {
  if (hasValidCoordinates(biometric?.location?.lat, biometric?.location?.lng)) {
    return {
      lat: biometric?.location?.lat,
      lng: biometric?.location?.lng,
      address: biometric?.location?.address || emergency?.locations?.current?.address || emergency?.locations?.detectedAt?.address,
    };
  }

  return {
    address:
      emergency?.locations?.current?.address ||
      emergency?.locations?.detectedAt?.address ||
      biometric?.location?.address ||
      '위치 정보 없음',
  };
};

/**
 * 보호자앱 지도 미리보기와 확대 화면에 공통으로 사용할 지도 프레임을 렌더링합니다.
 */
const GuardianLiveMapFrame: React.FC<{
  lat?: number;
  lng?: number;
  address?: string;
  memberName?: string;
  heightClassName: string;
  interactive?: boolean;
  onClick?: () => void;
}> = ({ lat, lng, address, memberName, heightClassName, interactive = true, onClick }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const validCoordinates = hasValidCoordinates(lat, lng);
  const [isLocatingCurrentPosition, setIsLocatingCurrentPosition] = useState(false);
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isTrackingRoute, setIsTrackingRoute] = useState(false);
  const [routeSummary, setRouteSummary] = useState<{ distanceText: string; durationText: string } | null>(null);

  /**
   * 현재 지도에 그려진 경로선을 제거합니다.
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
  const drawRouteToMember = useCallback(async (startLat: number, startLng: number, fitToBounds: boolean = true) => {
    if (!mapRef.current || !leafletRef.current || !hasValidCoordinates(startLat, startLng) || !hasValidCoordinates(lat, lng)) {
      return;
    }

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${lng},${lat}?overview=full&geometries=geojson`,
      );
      const payload = await response.json();
      const route = payload?.routes?.[0];
      const coordinates = payload?.routes?.[0]?.geometry?.coordinates;
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
  }, [clearRouteLine, lat, lng]);

  /**
   * 지도 위에 현재 기기 위치 마커를 배치하고 해당 위치로 화면을 이동합니다.
   */
  const focusCurrentPosition = useCallback((nextLat: number, nextLng: number) => {
    if (!mapRef.current || !leafletRef.current || !hasValidCoordinates(nextLat, nextLng)) {
      return;
    }

    const L = leafletRef.current;
    if (!currentMarkerRef.current) {
      currentMarkerRef.current = L.marker([nextLat, nextLng], {
        icon: L.divIcon({
          className: 'guardian-current-map-marker',
          html: '<div class="guardian-current-map-marker__pin"><span class="guardian-current-map-marker__pulse"></span><span class="guardian-current-map-marker__dot"></span></div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      }).addTo(mapRef.current);
    } else {
      currentMarkerRef.current.setLatLng([nextLat, nextLng]);
    }

    setCurrentPosition({ lat: nextLat, lng: nextLng });
    mapRef.current.invalidateSize(false);
    mapRef.current.flyTo([nextLat, nextLng], 17, { animate: true, duration: 0.8 });
    if (isRouteActive) {
      void drawRouteToMember(nextLat, nextLng, false);
    }
  }, [drawRouteToMember, isRouteActive]);

  /**
   * 브라우저에서 현재 기기 위치를 읽어 지도 중심과 마커를 갱신합니다.
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
      if (mapRef.current && hasValidCoordinates(lat, lng)) {
        mapRef.current.setView([lat as number, lng as number], 16, { animate: true });
      }
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
  }, [clearRouteLine, focusCurrentPosition, interactive, isRouteActive, isTrackingRoute, lat, lng]);

  useEffect(() => {
    if (!validCoordinates || !containerRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;

    /**
     * Leaflet 지도를 초기화하고 현재 위치 마커를 배치합니다.
     */
    async function initGuardianMap() {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current || !hasValidCoordinates(lat, lng)) {
        return;
      }
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
      }).setView([lat as number, lng as number], interactive ? 16 : 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat as number, lng as number], {
        icon: L.divIcon({
          className: 'guardian-map-marker',
          html: `<div class="guardian-map-marker__wrap"><div class="guardian-map-marker__pin"><span class="guardian-map-marker__dot"></span></div><div class="guardian-map-marker__label">${memberName || '회원'}</div></div>`,
          iconSize: [112, 64],
          iconAnchor: [56, 18],
        }),
      }).addTo(map);

      mapRef.current = map;
      markerRef.current = marker;

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

    void initGuardianMap();

    return () => {
      cancelled = true;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (mapRef.current) {
        if (typeof mapRef.current.stop === 'function') {
          mapRef.current.stop();
        }
        mapRef.current.off();
      }
      clearRouteLine();
      setRouteSummary(null);
      if (currentMarkerRef.current) {
        currentMarkerRef.current = null;
      }
    };
  }, [clearRouteLine, interactive, lat, lng, memberName, validCoordinates]);

  useEffect(() => {
    if (!mapRef.current || !validCoordinates) {
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([lat as number, lng as number]);
    }
    if (currentPosition && isRouteActive) {
      void drawRouteToMember(currentPosition.lat, currentPosition.lng);
    }
  }, [currentPosition, drawRouteToMember, interactive, isRouteActive, lat, lng, validCoordinates]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        if (typeof mapRef.current.stop === 'function') {
          mapRef.current.stop();
        }
        mapRef.current.off();
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
      <div className={`relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 ${heightClassName}`}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg">
            <MapPin size={18} />
          </div>
          <div className="mt-3 text-[13px] font-semibold text-slate-700">위치 정보를 불러오는 중입니다.</div>
          <div className="mt-1 text-[12px] text-slate-500">{address || '주소 정보 없음'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 ${heightClassName}`}>
      <div ref={containerRef} className="h-full w-full" />
      {interactive ? (
        <div className="absolute bottom-3 right-3 z-[650] flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleRoute}
            disabled={isTrackingRoute}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold shadow-lg shadow-slate-900/10 transition-colors disabled:opacity-70 ${
              isRouteActive ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            aria-label="경로 보기"
          >
            {isTrackingRoute ? <Loader2 size={16} className="animate-spin" /> : <Route size={16} />}
            <span>경로</span>
          </button>
          {isRouteActive && routeSummary ? (
            <div className="inline-flex h-10 items-center rounded-full bg-slate-900/82 px-3 text-[11px] font-semibold text-white shadow-lg shadow-slate-900/10">
              <span>{routeSummary.distanceText}</span>
              <span className="mx-1.5 h-1 w-1 rounded-full bg-white/60" />
              <span>{routeSummary.durationText}</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleLocateCurrentPosition}
            disabled={isLocatingCurrentPosition}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/10 transition-colors hover:bg-slate-50 disabled:opacity-70"
            aria-label="내 위치로 이동"
          >
            {isLocatingCurrentPosition ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
          </button>
        </div>
      ) : null}
      {!interactive && onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="absolute inset-0 z-[600]"
          aria-label="전체 지도 보기"
        />
      ) : null}
    </div>
  );
};

/**
 * 보호자앱에서 현재 위치를 전체 화면 지도로 보여주는 오버레이를 렌더링합니다.
 */
const GuardianMapOverlay: React.FC<{
  open: boolean;
  memberName: string;
  location: GuardianMapLocation;
  onClose: () => void;
}> = ({ open, memberName, location, onClose }) => {
  if (!open) {
    return null;
  }

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
          <div className="min-h-0 flex-1 overflow-hidden">
            <GuardianLiveMapFrame
              lat={location.lat}
              lng={location.lng}
              address={location.address}
              memberName={memberName}
              heightClassName="h-full min-h-[320px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 보호자 생체 수치용 공통 경고 스타일을 반환합니다.
 */
const resolveMetricAlertVisual = (level: MetricAlertLevel, toneClass: string) => {
  if (level === 'danger') {
    return {
      cardClass: 'border-rose-400 bg-rose-100 shadow-[0_14px_30px_rgba(225,29,72,0.18)]',
      iconClass: 'bg-rose-600 text-white',
      valueClass: 'text-rose-800',
      badgeClass: 'bg-rose-700 text-white',
      badgeLabel: '응급',
    };
  }

  if (level === 'caution') {
    return {
      cardClass: 'border-amber-400 bg-amber-100 shadow-[0_14px_30px_rgba(245,158,11,0.16)]',
      iconClass: 'bg-amber-500 text-white',
      valueClass: 'text-amber-800',
      badgeClass: 'bg-amber-600 text-white',
      badgeLabel: '주의',
    };
  }

  return {
    cardClass: 'border-slate-200 bg-white',
    iconClass: toneClass,
    valueClass: 'text-slate-900',
    badgeClass: '',
    badgeLabel: '',
  };
};

/**
 * 심박수 수치가 정상/주의/응급 중 어디에 해당하는지 판단합니다.
 */
const resolveHeartRateAlertLevel = (value?: number): MetricAlertLevel => {
  if (typeof value !== 'number') return 'normal';
  if (value <= 45 || value >= 120) return 'danger';
  if (value <= 55 || value >= 100) return 'caution';
  return 'normal';
};

/**
 * 산소포화도 수치가 정상/주의/응급 중 어디에 해당하는지 판단합니다.
 */
const resolveSpO2AlertLevel = (value?: number): MetricAlertLevel => {
  if (typeof value !== 'number') return 'normal';
  if (value < 90) return 'danger';
  if (value < 95) return 'caution';
  return 'normal';
};

/**
 * 체온 수치가 정상/주의/응급 중 어디에 해당하는지 판단합니다.
 */
const resolveBodyTemperatureAlertLevel = (value?: number): MetricAlertLevel => {
  if (typeof value !== 'number') return 'normal';
  if (value <= 35 || value >= 38) return 'danger';
  if (value < 36 || value >= 37.5) return 'caution';
  return 'normal';
};

/**
 * 스트레스 지수가 정상/주의/응급 중 어디에 해당하는지 판단합니다.
 */
const resolveStressAlertLevel = (value?: number): MetricAlertLevel => {
  if (typeof value !== 'number') return 'normal';
  if (value >= 80) return 'danger';
  if (value >= 60) return 'caution';
  return 'normal';
};

/**
 * 워치 배터리 잔량이 정상/주의/응급 중 어디에 해당하는지 판단합니다.
 */
const resolveBatteryAlertLevel = (value?: number): MetricAlertLevel => {
  if (typeof value !== 'number') return 'normal';
  if (value <= 15) return 'danger';
  if (value <= 30) return 'caution';
  return 'normal';
};

/**
 * 생체 데이터 포인트에서 선택한 항목의 숫자 값을 추출합니다.
 */
const getMetricValueFromPoint = (point: GuardianBiometricPoint, key: MetricDetailKey): number => {
  if (key === 'heartRate') return point.heartRate || 0;
  if (key === 'spO2') return point.spO2 || 0;
  if (key === 'bodyTemperature') return point.bodyTemperature || 0;
  if (key === 'steps') return point.steps || 0;
  if (key === 'stressLevel') return point.stressLevel || 0;
  return point.batteryLevel || 0;
};

/**
 * 선택한 항목의 숫자 값을 화면 표시용 문자열로 변환합니다.
 */
const formatMetricDetailValue = (key: MetricDetailKey, value?: number) => {
  if (typeof value !== 'number') {
    return '-';
  }

  if (key === 'heartRate') return `${value} bpm`;
  if (key === 'spO2') return `${value}%`;
  if (key === 'bodyTemperature') return `${value.toFixed(1)}°C`;
  if (key === 'steps') return `${value}보`;
  if (key === 'batteryLevel') return `${value}%`;
  return String(value);
};

/**
 * 선택한 항목의 경고 단계를 판정합니다.
 */
const resolveMetricDetailAlertLevel = (key: MetricDetailKey, value?: number): MetricAlertLevel => {
  if (key === 'heartRate') return resolveHeartRateAlertLevel(value);
  if (key === 'spO2') return resolveSpO2AlertLevel(value);
  if (key === 'bodyTemperature') return resolveBodyTemperatureAlertLevel(value);
  if (key === 'stressLevel') return resolveStressAlertLevel(value);
  if (key === 'batteryLevel') return resolveBatteryAlertLevel(value);
  return 'normal';
};

/**
 * 최근 히스토리 값으로 간단한 SVG 선 그래프 경로를 생성합니다.
 */
const buildMetricChartPath = (points: GuardianBiometricPoint[], key: MetricDetailKey) => {
  const ordered = [...points].reverse();
  const values = ordered.map((point) => getMetricValueFromPoint(point, key));

  if (values.length === 0) {
    return {
      path: '',
      min: 0,
      max: 0,
      ordered,
    };
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

  return {
    path,
    min,
    max,
    ordered,
  };
};

/**
 * 보호자 앱의 새로고침 방식을 자동/수동으로 전환하는 토글 버튼을 렌더링합니다.
 */
const RefreshModeToggle: React.FC<{
  mode: RefreshMode;
  onChange: (mode: RefreshMode) => void;
}> = ({ mode, onChange }) => (
  <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1">
    <button
      type="button"
      onClick={() => onChange('manual')}
      className={`text-[12px] font-medium transition-colors ${
        mode === 'manual' ? 'text-slate-900' : 'text-slate-400'
      }`}
    >
      수동
    </button>
    <button
      type="button"
      role="switch"
      aria-checked={mode === 'auto'}
      aria-label={mode === 'auto' ? '자동 새로고침 켜짐' : '자동 새로고침 꺼짐'}
      onClick={() => onChange(mode === 'manual' ? 'auto' : 'manual')}
      className={`relative inline-flex h-7 w-[50px] shrink-0 items-center rounded-full border-2 shadow-sm transition-colors duration-200 ${
        mode === 'auto'
          ? 'border-indigo-500 bg-indigo-600'
          : 'border-slate-400 bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-md transition-transform duration-200 ${
          mode === 'auto' ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
    <button
      type="button"
      onClick={() => onChange('auto')}
      className={`text-[12px] font-medium transition-colors ${
        mode === 'auto' ? 'text-indigo-600' : 'text-slate-400'
      }`}
    >
      자동
    </button>
  </div>
);

/**
 * 보호자 앱 수치 카드를 렌더링합니다.
 */
const MetricCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  toneClass: string;
  alertLevel?: MetricAlertLevel;
  onClick?: () => void;
}> = ({ icon: Icon, label, value, toneClass, alertLevel = 'normal', onClick }) => {
  const visual = resolveMetricAlertVisual(alertLevel, toneClass);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[148px] flex-col justify-between rounded-lg border p-4 text-left shadow-sm transition-colors ${visual.cardClass} ${onClick ? 'hover:-translate-y-0.5' : ''}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-h-[20px] items-center gap-1.5">
            {alertLevel === 'danger' ? (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-600 shadow-[0_0_0_4px_rgba(225,29,72,0.14)]"
                aria-hidden="true"
              />
            ) : null}
            <p className="break-keep text-[13px] leading-5 text-slate-500">{label}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className={`rounded-lg p-2 ${visual.iconClass}`}>
            <Icon size={16} />
          </div>
          {visual.badgeLabel ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold leading-none ${visual.badgeClass}`}>
              <AlertTriangle size={11} />
              {visual.badgeLabel}
            </span>
          ) : null}
        </div>
      </div>
      <p className={`break-keep text-[20px] font-semibold leading-tight ${visual.valueClass}`}>{value}</p>
    </button>
  );
};

/**
 * 보호자 연락처 입력을 휴대전화 형식으로 정리합니다.
 */
const formatPhoneNumber = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

/**
 * 보호자앱 건강메모 데이터를 화면 표시용 문자열로 정리합니다.
 */
const formatGuardianMedicalEntries = (
  entries: Array<{ disease?: string; name?: string; substance?: string } | string> | undefined,
  objectKey: 'disease' | 'name' | 'substance',
) => {
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
};

/**
 * 보호자 앱의 메인 화면을 렌더링합니다.
 */
export default function App() {
  const [activeTab, setActiveTab] = useState<GuardianTab>('overview');
  const [authMode, setAuthMode] = useState<GuardianAuthMode>('login');
  const [refreshMode, setRefreshMode] = useState<RefreshMode>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(() => {
    try {
      return localStorage.getItem(GUARDIAN_AUTO_LOGIN_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedMetricKey, setSelectedMetricKey] = useState<MetricDetailKey | null>(null);
  const [session, setSession] = useState<GuardianSession>(createEmptySession);
  const [profile, setProfile] = useState<GuardianProfile | null>(null);
  const [recentBiometrics, setRecentBiometrics] = useState<GuardianBiometricPoint[]>([]);
  const [sharedWatchBiometric, setSharedWatchBiometric] = useState<GuardianBiometricPoint | null>(null);
  const [emergencyHistory, setEmergencyHistory] = useState<GuardianEmergencyCase[]>([]);
  const [authError, setAuthError] = useState('');
  const [guardianLoginEmail, setGuardianLoginEmail] = useState(() => {
    try {
      return String(localStorage.getItem('gt_guardian_login_email') || '').trim().toLowerCase();
    } catch {
      return '';
    }
  });
  const [guardianLoginPassword, setGuardianLoginPassword] = useState('');
  const [rememberGuardianEmail, setRememberGuardianEmail] = useState(() => {
    try {
      return String(localStorage.getItem('gt_guardian_login_email') || '').trim().length > 0;
    } catch {
      return false;
    }
  });
  const [guardianSignupAccessCode, setGuardianSignupAccessCode] = useState('');
  const [guardianSignupEmail, setGuardianSignupEmail] = useState('');
  const initialGuardianEmailFields = parseGuardianEmailFields('');
  const [guardianEmailLocalPart, setGuardianEmailLocalPart] = useState(initialGuardianEmailFields.localPart);
  const [guardianEmailDomainOption, setGuardianEmailDomainOption] = useState(initialGuardianEmailFields.domainOption);
  const [guardianCustomEmailDomain, setGuardianCustomEmailDomain] = useState(initialGuardianEmailFields.customDomain);
  const [guardianSignupPhone, setGuardianSignupPhone] = useState('');
  const [guardianSignupPassword, setGuardianSignupPassword] = useState('');
  const [guardianSignupPasswordConfirm, setGuardianSignupPasswordConfirm] = useState('');
  const [guardianTermsAgreed, setGuardianTermsAgreed] = useState(false);
  const [guardianPrivacyAgreed, setGuardianPrivacyAgreed] = useState(false);
  const [guardianLocationAgreed, setGuardianLocationAgreed] = useState(false);
  const [guardianBiometricAgreed, setGuardianBiometricAgreed] = useState(false);
  const [guardianThirdPartyAgreed, setGuardianThirdPartyAgreed] = useState(false);
  const [guardianWearableAgreed, setGuardianWearableAgreed] = useState(false);
  const [guardianOpenTermsType, setGuardianOpenTermsType] = useState<'service' | 'privacy' | 'location' | 'biometric' | 'thirdParty' | 'wearable' | null>(null);
  const [isGuardianLoginPasswordVisible, setIsGuardianLoginPasswordVisible] = useState(false);
  const [isGuardianSignupPasswordVisible, setIsGuardianSignupPasswordVisible] = useState(false);
  const [isGuardianSignupPasswordConfirmVisible, setIsGuardianSignupPasswordConfirmVisible] = useState(false);
  const [guardianSignupEmailCheckResult, setGuardianSignupEmailCheckResult] = useState<'available' | 'unavailable' | null>(null);
  const [guardianSignupEmailCheckMessage, setGuardianSignupEmailCheckMessage] = useState('');
  const [guardianSignupEmailVerified, setGuardianSignupEmailVerified] = useState(false);
  const [isGuardianSignupEmailChecking, setIsGuardianSignupEmailChecking] = useState(false);
  const [guardianForm, setGuardianForm] = useState<GuardianEditableContact>(createDefaultGuardianContact);
  const [isGuardianEditing, setIsGuardianEditing] = useState(false);
  const inviteParamsRef = useRef<GuardianInviteParams | null>(null);
  const realtimeSocketRef = useRef<Socket | null>(null);
  const authTitleClass = 'text-[24px] font-semibold tracking-[-0.02em] text-slate-900';
  const authFieldLabelClass = 'mb-2 text-[13px] font-medium text-slate-600';
  const authInputShellClass = 'flex h-[44px] flex-1 items-center gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white px-4';
  const authInputClass = 'h-full min-h-0 w-full appearance-none bg-transparent text-[14px] leading-none text-slate-900 outline-none';
  const authStandaloneInputClass =
    'mt-1 h-[44px] w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-none text-slate-900 outline-none focus:border-indigo-500';
  const authEmailGroupClass = 'mt-1 space-y-3';
  const authSelectClass =
    'h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-indigo-500';
  const authStaticDomainClass =
    'flex h-11 items-center rounded-lg border border-slate-100 bg-slate-50 px-4 text-sm text-slate-500';
  const authPrimaryButtonClass =
    'inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50';
  const authSecondaryButtonClass =
    'inline-flex h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 text-[14px] font-semibold text-indigo-700';
  const authCheckboxLabelClass =
    'inline-flex items-center gap-2 text-[13px] font-medium text-slate-600';
  const authIconButtonClass =
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600';

  // 아이디찾기 / 비밀번호찾기 상태
  const [guardianFindMode, setGuardianFindMode] = useState<'find-email' | 'find-password' | null>(null);
  const [guardianFindEmailName, setGuardianFindEmailName] = useState('');
  const [guardianFindEmailPhone, setGuardianFindEmailPhone] = useState('');
  const [guardianFindEmailResult, setGuardianFindEmailResult] = useState('');
  const [guardianFindEmailLoading, setGuardianFindEmailLoading] = useState(false);
  const [guardianFindPwEmail, setGuardianFindPwEmail] = useState('');
  const [guardianFindPwPhone, setGuardianFindPwPhone] = useState('');
  const [guardianFindPwNewPassword, setGuardianFindPwNewPassword] = useState('');
  const [guardianFindPwResult, setGuardianFindPwResult] = useState('');
  const [guardianFindPwLoading, setGuardianFindPwLoading] = useState(false);
  const [guardianFindPwConfirmPassword, setGuardianFindPwConfirmPassword] = useState('');
  const [isGuardianFindPwVisible, setIsGuardianFindPwVisible] = useState(false);
  const [isGuardianFindPwConfirmVisible, setIsGuardianFindPwConfirmVisible] = useState(false);
  // SMS 인증 단계 상태
  const [guardianFindPwStep, setGuardianFindPwStep] = useState<'request' | 'verify'>('request');
  const [guardianFindPwCode, setGuardianFindPwCode] = useState('');
  const [guardianFindPwMaskedPhone, setGuardianFindPwMaskedPhone] = useState('');

  /**
   * 앱 진입 시 저장된 보호자 세션과 초대 링크 값을 복원하고 인증 화면 초기 상태를 맞춥니다.
   */
  useEffect(() => {
    const defaultSession = createEmptySession();
    const storedGuardianContact = getStoredGuardianContact();
    const inviteParams = readGuardianInviteParams();
    inviteParamsRef.current = inviteParams;
    let nextSession: GuardianSession = {
      ...defaultSession,
    };

    setGuardianForm(storedGuardianContact);
    setProfile(null);
    setRecentBiometrics([]);
    setEmergencyHistory([]);
    setAuthMode(inviteParams?.accessCode ? 'signup' : 'login');
    setGuardianSignupAccessCode(inviteParams?.accessCode || '');
    setAuthError('');

    if (inviteParams) {
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {}
    }

    try {
      const saved = readStoredGuardianSession();
      if (!saved?.email) return;
      if (saved.token) {
        backendService.setToken(saved.token);
      } else {
        backendService.clearToken();
      }
      nextSession = {
        ...nextSession,
        ...saved,
        memberName: saved.memberName || '',
        email: saved.email || '',
        guardianEmail: saved.guardianEmail || '',
      };
      setSession(nextSession);
      setGuardianLoginEmail(saved.guardianEmail || '');
    } catch {
      clearStoredGuardianSession();
      backendService.clearToken();
    }
    setSession(nextSession);
  }, []);

  /**
   * 프로필이 바뀌면 수정 폼도 현재 보호자 정보 기준으로 동기화합니다.
   */
  useEffect(() => {
    if (!profile?.guardian) {
      return;
    }

    setGuardianForm({
      name: profile.guardian.name || '',
      relationship: profile.guardian.relationship || '',
      phone: formatPhoneNumber(profile.guardian.phone || ''),
    });
  }, [profile?.guardian?.name, profile?.guardian?.phone, profile?.guardian?.relationship]);

  /**
   * 최신 생체 데이터 1건을 요약 카드 기준 데이터로 사용합니다.
   */
  const displayBiometrics = useMemo(
    () => (sharedWatchBiometric ? mergeRealtimeBiometrics(recentBiometrics, sharedWatchBiometric) : recentBiometrics),
    [recentBiometrics, sharedWatchBiometric],
  );

  const latestBiometric = useMemo(() => displayBiometrics[0] || null, [displayBiometrics]);

  /**
   * 지도 카드와 전체 지도 화면에 표시할 현재 위치 정보를 계산합니다.
   */
  const currentMapLocation = useMemo(
    () => resolveGuardianMapLocation(latestBiometric, emergencyHistory[0] || null),
    [emergencyHistory, latestBiometric],
  );

  /**
   * 선택된 생체 카드의 상세 설정 정보를 계산합니다.
   */
  const selectedMetricConfig = useMemo(
    () => (selectedMetricKey ? METRIC_DETAIL_CONFIGS[selectedMetricKey] : null),
    [selectedMetricKey],
  );

  /**
   * 선택된 카드에 맞는 최근 히스토리 목록을 최신순으로 정리합니다.
   */
  const selectedMetricHistory = useMemo(() => {
    if (!selectedMetricKey) {
      return [];
    }

    return displayBiometrics.slice(0, 10).map((point) => ({
      id: point.id,
      collectedAt: point.collectedAt,
      value: getMetricValueFromPoint(point, selectedMetricKey),
      alertLevel: resolveMetricDetailAlertLevel(selectedMetricKey, getMetricValueFromPoint(point, selectedMetricKey)),
    }));
  }, [displayBiometrics, selectedMetricKey]);

  /**
   * 응급 단계 숫자를 보호자용 라벨로 변환합니다.
   */
  const formatEmergencyLevel = (level: number) => {
    if (level >= 5) return '매우 위험';
    if (level >= 4) return '위험';
    if (level >= 3) return '주의';
    return '관찰';
  };

  /**
   * 응급 상태값을 보호자 화면용 한글 라벨로 변환합니다.
   */
  const formatEmergencyStatus = (status: string) => {
    if (status === 'completed') return '완료';
    if (status === 'cancelled') return '오작동';
    if (status === 'detected') return '신규';
    if (status === 'in_progress') return '처리 중';
    if (status === 'transporting') return '이송 중';
    if (status === 'matched') return '배정 완료';
    return status || '-';
  };

  /**
   * 응급 이력의 대표 주소를 우선순위에 따라 추출합니다.
   */
  const resolveEmergencyAddress = (item: GuardianEmergencyCase) =>
    item.locations?.detectedAt?.address || item.locations?.current?.address || '위치 정보 없음';

  /**
   * 응급 이력의 감지 요약을 한 줄 문장으로 합칩니다.
   */
  const resolveEmergencySummary = (item: GuardianEmergencyCase) => {
    const descriptions = Array.isArray(item.detectedAnomalies)
      ? item.detectedAnomalies.map((entry) => entry.description || entry.type || '').filter(Boolean)
      : [];
    return descriptions.length > 0 ? descriptions.join(', ') : '감지 상세 없음';
  };

  /**
   * 보호자 전용 조회 데이터를 한 번에 다시 불러옵니다.
   */
  const fetchGuardianData = useCallback(async () => {
    if (!session?.token) {
      setIsLoading(false);
      setIsRefreshing(false);
      setProfile(null);
      setSharedWatchBiometric(null);
      setRecentBiometrics([]);
      setEmergencyHistory([]);
      return;
    }

    setIsRefreshing(true);
    setIsLoading(!profile && recentBiometrics.length === 0 && emergencyHistory.length === 0);
    try {
      const currentWatchResponse = await backendService.getCurrentWatch(10);
      const currentWatchOwnerId = String(
        currentWatchResponse?.data?._id || currentWatchResponse?.data?.userId || '',
      ).trim();
      const currentWatchBiometric =
        currentWatchResponse?.data?.latestBiometric &&
        typeof currentWatchResponse.data.latestBiometric === 'object'
          ? createRealtimeBiometricPoint(
              String(currentWatchOwnerId || 'control-watch'),
              currentWatchResponse.data.latestBiometric,
            )
          : null;

      const [profileResponse, biometricResponse, historyResponse] = await Promise.all([
        backendService.getProfile(),
        backendService.getRecentBiometricData(24, 24),
        backendService.getEmergencyHistory(20),
      ]);

      const profileUser = profileResponse?.data?.user || {};
      const profileUserId = String(profileUser.id || '').trim();
      const fallbackProfile = createFallbackProfile(session, guardianForm.phone || '010-1234-5678');
      const nextProfile: GuardianProfile = {
        ...fallbackProfile,
        id: profileUser.id || fallbackProfile.id,
        name: profileUser.name || fallbackProfile.name,
        email: profileUser.email || fallbackProfile.email,
        phone: profileUser.phone || fallbackProfile.phone,
        age: profileUser.age || fallbackProfile.age,
        birthDate: profileUser.birthDate || fallbackProfile.birthDate,
        height: profileUser.height || fallbackProfile.height,
        weight: profileUser.weight || fallbackProfile.weight,
        bloodType: profileUser.bloodType || fallbackProfile.bloodType,
        status: profileUser.status || fallbackProfile.status,
        medicalHistory: profileUser.medicalHistory || fallbackProfile.medicalHistory,
        wearableDevice: profileUser.wearableDevice || fallbackProfile.wearableDevice,
        guardian:
          profileUser.emergencyContact || profileUser.emergencySettings?.emergencyContacts?.[0] || fallbackProfile.guardian,
      };
      const nextBiometrics = Array.isArray(biometricResponse?.data?.biometricData) && biometricResponse.data.biometricData.length > 0
        ? biometricResponse.data.biometricData
        : createFallbackBiometrics();
      const nextHistory = Array.isArray(historyResponse?.data?.emergencyCases) && historyResponse.data.emergencyCases.length > 0
        ? historyResponse.data.emergencyCases
        : createFallbackEmergencyHistory();

      setProfile(mergeGuardianContactIntoProfile(nextProfile, guardianForm));
      setRecentBiometrics(nextBiometrics);
      setSharedWatchBiometric(
        profileUserId && currentWatchOwnerId && profileUserId === currentWatchOwnerId
          ? currentWatchBiometric
          : null,
      );
      setEmergencyHistory(nextHistory);
      setSession((current) => {
        const nextSession = {
          ...current,
          email: nextProfile.email || current.email,
          memberName: nextProfile.name || current.memberName,
          guardianEmail: current.guardianEmail || guardianLoginEmail,
        };
        persistGuardianSession(nextSession, autoLoginEnabled);
        return nextSession;
      });
    } catch (error) {
      console.error('보호자 데이터 조회 실패:', error);
      setSharedWatchBiometric(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [autoLoginEnabled, emergencyHistory.length, guardianForm, guardianLoginEmail, profile, recentBiometrics.length, session]);

  /**
   * 보호자앱이 열리면 관제 공유 워치 기준 데이터를 먼저 불러옵니다.
   */
  useEffect(() => {
    void fetchGuardianData();
  }, [fetchGuardianData]);

  /**
   * 보호자 이메일 아이디/도메인 입력 상태를 실제 회원가입 이메일 값에 동기화합니다.
   */
  const syncGuardianSignupEmail = useCallback((params: {
    localPart?: string;
    domainOption?: string;
    customDomain?: string;
  }) => {
    const nextLocalPart = params.localPart ?? guardianEmailLocalPart;
    const nextDomainOption = params.domainOption ?? guardianEmailDomainOption;
    const nextCustomDomain = params.customDomain ?? guardianCustomEmailDomain;
    setGuardianSignupEmail(
      buildGuardianEmailValue({
        localPart: nextLocalPart,
        domainOption: nextDomainOption,
        customDomain: nextCustomDomain,
      }),
    );
    setGuardianSignupEmailCheckResult(null);
    setGuardianSignupEmailCheckMessage('');
    setGuardianSignupEmailVerified(false);
  }, [guardianCustomEmailDomain, guardianEmailDomainOption, guardianEmailLocalPart]);

  /** 보호자 회원가입 이메일 중복 확인 */
  const handleCheckGuardianSignupEmail = async () => {
    const emailValue = guardianSignupEmail.trim();
    if (!emailValue || !emailValue.includes('@')) {
      setGuardianSignupEmailCheckResult('unavailable');
      setGuardianSignupEmailCheckMessage('완전한 이메일을 입력해주세요.');
      setGuardianSignupEmailVerified(false);
      return;
    }
    setIsGuardianSignupEmailChecking(true);
    setGuardianSignupEmailCheckResult(null);
    setGuardianSignupEmailCheckMessage('');
    setGuardianSignupEmailVerified(false);
    try {
      const baseURL = resolveGuardianBackendBase();
      const res = await fetch(`${baseURL}/mobile/guardian/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardianEmail: emailValue }),
      });
      const data = await res.json();
      if (data.available) {
        setGuardianSignupEmailCheckResult('available');
        setGuardianSignupEmailCheckMessage(data.message || '사용 가능한 이메일입니다.');
        setGuardianSignupEmailVerified(true);
      } else {
        setGuardianSignupEmailCheckResult('unavailable');
        setGuardianSignupEmailCheckMessage(data.message || '이미 가입된 이메일입니다.');
        setGuardianSignupEmailVerified(false);
      }
    } catch {
      setGuardianSignupEmailCheckResult('unavailable');
      setGuardianSignupEmailCheckMessage('서버 연결에 실패했습니다.');
      setGuardianSignupEmailVerified(false);
    } finally {
      setIsGuardianSignupEmailChecking(false);
    }
  };

  /**
   * 보호자 이메일/비밀번호 로그인 폼을 제출합니다.
   */
  const handleGuardianAccountLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');

    const normalizedGuardianEmail = guardianLoginEmail.trim().toLowerCase();
    if (!normalizedGuardianEmail || !guardianLoginPassword) {
      setAuthError('보호자 이메일과 비밀번호를 입력해주세요.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedGuardianEmail)) {
      setAuthError('올바른 이메일 형식이 아닙니다.');
      return;
    }
    if (guardianLoginPassword.length < 6) {
      setAuthError('비밀번호는 6자 이상 입력해주세요.');
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const response = await backendService.guardianAccountLogin(normalizedGuardianEmail, guardianLoginPassword);
      const token = response.data?.token;
      const user = response.data?.user || {};
      if (!response.success || typeof token !== 'string') {
        setAuthError(response.message || '보호자 로그인에 실패했습니다.');
        return;
      }

      const nextSession: GuardianSession = {
        token,
        email: String(user?.email || '').trim().toLowerCase(),
        memberName: String(user?.name || '').trim(),
        guardianEmail: normalizedGuardianEmail,
      };
      persistGuardianSession(nextSession, autoLoginEnabled);
      if (rememberGuardianEmail) {
        localStorage.setItem('gt_guardian_login_email', normalizedGuardianEmail);
      } else {
        localStorage.removeItem('gt_guardian_login_email');
      }
      setSession(nextSession);
      setGuardianLoginPassword('');
      setIsLoading(true);
      setActiveTab('overview');
      setSelectedMetricKey(null);
    } catch {
      setAuthError('보호자 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // 보호자 아이디(이메일) 찾기 API 호출
  const handleGuardianFindEmail = async () => {
    if (!guardianFindEmailName.trim() || !guardianFindEmailPhone.trim()) {
      setGuardianFindEmailResult('이름과 전화번호를 입력해주세요.');
      return;
    }
    setGuardianFindEmailLoading(true);
    setGuardianFindEmailResult('');
    try {
      const baseURL = resolveGuardianBackendBase();
      const res = await fetch(`${baseURL}/mobile/guardian/find-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: guardianFindEmailName.trim(), phone: guardianFindEmailPhone.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setGuardianFindEmailResult(`가입된 이메일: ${data.email}`);
      } else {
        setGuardianFindEmailResult(data.message || '계정을 찾을 수 없습니다.');
      }
    } catch {
      setGuardianFindEmailResult('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setGuardianFindEmailLoading(false);
    }
  };

  // 보호자 비밀번호 재설정 - SMS 인증코드 요청 (1단계)
  const handleGuardianResetRequestCode = async () => {
    if (!guardianFindPwEmail.trim() || !guardianFindPwPhone.trim()) {
      setGuardianFindPwResult('이메일과 전화번호를 모두 입력해주세요.');
      return;
    }
    setGuardianFindPwLoading(true);
    setGuardianFindPwResult('');
    try {
      const baseURL = resolveGuardianBackendBase();
      const res = await fetch(`${baseURL}/mobile/guardian/reset-password/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardianEmail: guardianFindPwEmail.trim().toLowerCase(),
          guardianPhone: guardianFindPwPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGuardianFindPwResult(data.message || '');
        setGuardianFindPwMaskedPhone(data.maskedPhone || '');
        setGuardianFindPwStep('verify');
      } else {
        setGuardianFindPwResult(data.message || '인증코드 발송에 실패했습니다.');
      }
    } catch {
      setGuardianFindPwResult('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setGuardianFindPwLoading(false);
    }
  };

  // 보호자 비밀번호 재설정 - 인증코드 확인 후 비밀번호 변경 (2단계)
  const handleGuardianFindPassword = async () => {
    if (!guardianFindPwCode.trim() || !guardianFindPwNewPassword.trim()) {
      setGuardianFindPwResult('인증코드와 새 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (guardianFindPwNewPassword.length < 6) {
      setGuardianFindPwResult('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (guardianFindPwNewPassword !== guardianFindPwConfirmPassword) {
      setGuardianFindPwResult('비밀번호가 일치하지 않습니다.');
      return;
    }
    setGuardianFindPwLoading(true);
    setGuardianFindPwResult('');
    try {
      const baseURL = resolveGuardianBackendBase();
      const res = await fetch(`${baseURL}/mobile/guardian/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardianEmail: guardianFindPwEmail.trim().toLowerCase(),
          guardianPhone: guardianFindPwPhone.trim(),
          code: guardianFindPwCode.trim(),
          newPassword: guardianFindPwNewPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGuardianFindPwResult('비밀번호가 재설정되었습니다. 로그인 화면으로 돌아가서 새 비밀번호로 로그인해주세요.');
      } else {
        setGuardianFindPwResult(data.message || '비밀번호 재설정에 실패했습니다.');
      }
    } catch {
      setGuardianFindPwResult('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setGuardianFindPwLoading(false);
    }
  };

  /**
   * 보호자 인증코드 기준으로 보호자 회원가입을 완료하고 바로 로그인 상태로 전환합니다.
   */
  const handleGuardianSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');

    if (!guardianTermsAgreed || !guardianPrivacyAgreed || !guardianLocationAgreed || !guardianBiometricAgreed || !guardianThirdPartyAgreed || !guardianWearableAgreed) {
      setAuthError('필수 약관에 모두 동의해주세요.');
      return;
    }

    const normalizedGuardianEmail = guardianSignupEmail.trim().toLowerCase();
    const normalizedAccessCode = guardianSignupAccessCode.replace(/\D/g, '').slice(0, 6);

    if (!normalizedAccessCode) {
      setAuthError('인증코드를 입력해주세요.');
      return;
    }

    if (normalizedAccessCode.length !== 6) {
      setAuthError('인증코드는 6자리 숫자로 입력해주세요.');
      return;
    }

    if (!normalizedGuardianEmail || !guardianSignupPassword || !guardianSignupPasswordConfirm) {
      setAuthError('보호자 이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    if (!isGuardianEmailFormatValid(normalizedGuardianEmail)) {
      setAuthError('보호자 이메일 형식을 확인해주세요.');
      return;
    }

    if (guardianSignupPassword !== guardianSignupPasswordConfirm) {
      setAuthError('보호자 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const response = await backendService.guardianSignup(
        normalizedAccessCode,
        normalizedGuardianEmail,
        guardianSignupPassword,
      );
      const token = response.data?.token;
      const user = response.data?.user || {};
      if (!response.success || typeof token !== 'string') {
        setAuthError(response.message || '보호자 회원가입에 실패했습니다.');
        return;
      }

      const nextSession: GuardianSession = {
        token,
        email: String(user?.email || '').trim().toLowerCase(),
        memberName: String(user?.name || '').trim(),
        guardianEmail: normalizedGuardianEmail,
      };
      persistGuardianSession(nextSession, true);
      setSession(nextSession);
      setAutoLoginEnabled(true);
      setGuardianLoginEmail(normalizedGuardianEmail);
      setGuardianLoginPassword('');
      setGuardianSignupPassword('');
      setGuardianSignupPasswordConfirm('');
      setGuardianSignupPhone('');
      setGuardianTermsAgreed(false);
      setGuardianPrivacyAgreed(false);
      setGuardianLocationAgreed(false);
      setGuardianBiometricAgreed(false);
      setGuardianThirdPartyAgreed(false);
      setGuardianWearableAgreed(false);
      setIsLoading(true);
      setActiveTab('overview');
      setSelectedMetricKey(null);
    } catch {
      setAuthError('보호자 회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  /**
   * 보호자 로그아웃 시 저장 세션과 현재 화면 상태를 함께 초기화합니다.
   */
  const handleGuardianLogout = () => {
    clearStoredGuardianSession();
    backendService.clearToken();
    realtimeSocketRef.current?.disconnect();
    realtimeSocketRef.current = null;
    setSession(createEmptySession());
    setProfile(null);
    setSharedWatchBiometric(null);
    setRecentBiometrics([]);
    setEmergencyHistory([]);
    setGuardianLoginPassword('');
    setAuthError('');
    setAuthMode('login');
  };

  /**
   * 자동 새로고침이 선택되면 30초 간격으로 보호자 데이터를 다시 불러옵니다.
   */
  useEffect(() => {
    if (refreshMode !== 'auto') {
      return undefined;
    }

    const refreshTimer = window.setInterval(() => {
      void fetchGuardianData();
    }, GUARDIAN_REALTIME_FALLBACK_MS);

    return () => window.clearInterval(refreshTimer);
  }, [fetchGuardianData, refreshMode]);

  /**
   * 보호자 세션이 있으면 회원 개인 룸에 소켓으로 연결해 생체/응급 이벤트를 즉시 반영합니다.
   */
  useEffect(() => {
    if (!session?.token) {
      realtimeSocketRef.current?.disconnect();
      realtimeSocketRef.current = null;
      return undefined;
    }

    const socket = io(resolveGuardianSocketBase(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    realtimeSocketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('authenticate', {
        token: session.token,
        role: 'guardian',
      });
    });

    socket.on('biometric_data_updated', (payload) => {
      if (!payload?.biometricData) {
        return;
      }

      const memberId = String(payload.userId || profile?.id || session.email || 'guardian-member');
      const realtimePoint = createRealtimeBiometricPoint(memberId, payload.biometricData);

      setRecentBiometrics((current) => mergeRealtimeBiometrics(current, realtimePoint));
      setProfile((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          wearableDevice: {
            ...(current.wearableDevice || {}),
            batteryLevel:
              typeof payload.biometricData?.batteryLevel === 'number'
                ? payload.biometricData.batteryLevel
                : current.wearableDevice?.batteryLevel,
            lastSyncAt: realtimePoint.collectedAt,
            connectionStatus: 'connected',
          },
        };
      });
    });

    socket.on('emergency_detected', () => {
      void fetchGuardianData();
    });

    socket.on('case_status_updated', () => {
      void fetchGuardianData();
    });

    socket.on('disconnect', () => {
      // 소켓이 잠시 끊겨도 기존 자동 새로고침이 fallback으로 최신값을 다시 맞춥니다.
    });

    return () => {
      socket.disconnect();
      if (realtimeSocketRef.current === socket) {
        realtimeSocketRef.current = null;
      }
    };
  }, [fetchGuardianData, profile?.id, session?.email, session?.token]);

  /**
   * 생체 카드 클릭 시 해당 항목의 상세 화면을 엽니다.
   */
  const handleMetricCardOpen = (key: MetricDetailKey) => {
    setSelectedMetricKey(key);
  };

  /**
   * 선택한 생체 카드 상세 화면을 닫고 회원 현황 목록으로 돌아갑니다.
   */
  const handleMetricDetailClose = () => {
    setSelectedMetricKey(null);
  };

  /**
   * 상단 탭을 전환할 때 이전 상세 선택 상태를 함께 정리합니다.
   */
  const handleTabChange = (tab: GuardianTab) => {
    setActiveTab(tab);
    if (tab !== 'overview') {
      setSelectedMetricKey(null);
    }
  };

  /**
   * 보호자 수정 폼 입력값을 즉시 상태에 반영합니다.
   */
  const handleGuardianFormChange = (field: keyof GuardianEditableContact, value: string) => {
    setGuardianForm((current) => ({
      ...current,
      [field]: field === 'phone' ? formatPhoneNumber(value) : value,
    }));
  };

  /**
   * 보호자 정보 수정값을 로컬에 저장하고 화면 프로필에도 즉시 반영합니다.
   */
  const handleGuardianProfileSave = () => {
    const nextGuardian = {
      name: guardianForm.name.trim() || createDefaultGuardianContact().name,
      relationship: guardianForm.relationship.trim() || createDefaultGuardianContact().relationship,
      phone: formatPhoneNumber(guardianForm.phone || createDefaultGuardianContact().phone),
    };

    localStorage.setItem(GUARDIAN_PROFILE_STORAGE_KEY, JSON.stringify(nextGuardian));
    setGuardianForm(nextGuardian);
    setProfile((current) => mergeGuardianContactIntoProfile(current, nextGuardian));
    setIsGuardianEditing(false);
  };

  /**
   * 보호자 정보 수정 취소 시 현재 저장된 값으로 폼을 되돌리고 편집 모드를 닫습니다.
   */
  const handleGuardianEditCancel = () => {
    const nextGuardian = {
      name: profile?.guardian?.name || createDefaultGuardianContact().name,
      relationship: profile?.guardian?.relationship || createDefaultGuardianContact().relationship,
      phone: formatPhoneNumber(profile?.guardian?.phone || createDefaultGuardianContact().phone),
    };

    setGuardianForm(nextGuardian);
    setIsGuardianEditing(false);
  };

  /**
   * 회원 현황 탭을 렌더링합니다.
   */
  const renderMetricDetailView = () => {
    if (!selectedMetricConfig) {
      return null;
    }

    const latestValue = selectedMetricHistory[0]?.value;
    const latestAlertLevel = selectedMetricHistory[0]?.alertLevel || 'normal';
    const chartData = buildMetricChartPath(displayBiometrics.slice(0, 12), selectedMetricConfig.key);
    const latestVisual = resolveMetricAlertVisual(latestAlertLevel, selectedMetricConfig.toneClass);
    const Icon = selectedMetricConfig.icon;
    const chartGradientId = `metric-chart-fill-${selectedMetricConfig.key}`;
    const detailIconStyle = {
      backgroundColor: selectedMetricConfig.chartColor,
      color: '#ffffff',
    };
    const detailValueStyle = {
      color: selectedMetricConfig.chartColor,
    };
    const chartTimeLabels = chartData.ordered.length > 0
      ? [
          chartData.ordered[0],
          chartData.ordered[Math.max(Math.floor((chartData.ordered.length - 1) / 2), 0)],
          chartData.ordered[chartData.ordered.length - 1],
        ]
      : [];

    return (
      <div className="space-y-4 px-4 pb-28 pt-6">
        <button
          type="button"
          onClick={handleMetricDetailClose}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 shadow-sm"
        >
          <ChevronLeft size={16} />
          회원 현황으로
        </button>

        <div className={`rounded-lg border p-4 shadow-sm ${latestVisual.cardClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] text-slate-500">{selectedMetricConfig.label}</p>
              <h3 className="mt-2 text-[28px] font-semibold" style={detailValueStyle}>
                {formatMetricDetailValue(selectedMetricConfig.key, latestValue)}
              </h3>
              <p className="mt-2 text-[13px] text-slate-600">
                {latestBiometric?.collectedAt ? `최근 수집 ${new Date(latestBiometric.collectedAt).toLocaleString()}` : '최근 데이터가 없습니다.'}
              </p>
            </div>
            <div className="rounded-lg p-3 shadow-sm" style={detailIconStyle}>
              <Icon size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-[16px] text-slate-900">그래프</h3>
            <span className="text-[12px] text-slate-500">최근 {Math.min(displayBiometrics.length, 12)}건</span>
          </div>
          <p className="text-[13px] text-slate-600">{selectedMetricConfig.historyDescription}</p>
          <div className="mt-4 overflow-hidden rounded-lg bg-slate-50 p-3">
            {chartData.path ? (
              <div>
                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>최대 {formatMetricDetailValue(selectedMetricConfig.key, chartData.max)}</span>
                  <span>최소 {formatMetricDetailValue(selectedMetricConfig.key, chartData.min)}</span>
                </div>
                <svg viewBox="0 0 300 120" className="h-36 w-full">
                  <line x1="10" y1="20" x2="290" y2="20" stroke="currentColor" strokeWidth="1" className="text-slate-200" />
                  <line x1="10" y1="60" x2="290" y2="60" stroke="currentColor" strokeWidth="1" className="text-slate-200" />
                  <line x1="10" y1="100" x2="290" y2="100" stroke="currentColor" strokeWidth="1" className="text-slate-200" />
                  <path d={chartData.path} fill="none" stroke={selectedMetricConfig.chartColor} strokeWidth="3" strokeLinecap="round" />
                  <path d={`${chartData.path} L 290 110 L 10 110 Z`} fill={`url(#${chartGradientId})`} opacity="0.18" />
                  <defs>
                    <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={selectedMetricConfig.chartColor} />
                      <stop offset="100%" stopColor={selectedMetricConfig.chartColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="mt-2 grid grid-cols-3 text-[11px] text-slate-400">
                  {chartTimeLabels.map((point, index) => (
                    <span
                      key={`${point.id}-${index}`}
                      className={index === 1 ? 'text-center' : index === 2 ? 'text-right' : 'text-left'}
                    >
                      {new Date(point.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-36 items-center justify-center text-[13px] text-slate-500">그래프 데이터가 없습니다.</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 size={16} className="text-slate-400" />
            <h3 className="text-[16px] text-slate-900">히스토리</h3>
          </div>
          <div className="space-y-3">
            {selectedMetricHistory.length === 0 ? (
              <div className="rounded-lg bg-slate-50 px-4 py-6 text-center text-[13px] text-slate-500">
                표시할 히스토리 데이터가 없습니다.
              </div>
            ) : (
              selectedMetricHistory.map((item) => {
                const historyVisual = resolveMetricAlertVisual(item.alertLevel, selectedMetricConfig.toneClass);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[13px] text-slate-900">{formatMetricDetailValue(selectedMetricConfig.key, item.value)}</p>
                      <p className="mt-1 text-[12px] text-slate-500">{new Date(item.collectedAt).toLocaleString()}</p>
                    </div>
                    {historyVisual.badgeLabel ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${historyVisual.badgeClass}`}>
                        <AlertTriangle size={11} />
                        {historyVisual.badgeLabel}
                      </span>
                    ) : (
                      <span className="text-[12px] text-emerald-600">정상</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderOverviewTab = () => (
    <div className="space-y-4 px-4 pb-28 pt-6">
      <div
        className="rounded-lg bg-indigo-600 px-4 py-3 text-white shadow-lg shadow-indigo-200"
        style={{ backgroundColor: '#4f46e5', backgroundImage: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)' }}
      >
        <div className="flex items-center gap-2 overflow-hidden text-[13px]">
          <span className="shrink-0 rounded-full bg-white/12 px-2.5 py-1 text-[11px] text-indigo-50">연결된 회원</span>
          <span className="truncate text-[17px] text-white">{profile?.name || session?.memberName || '회원'}</span>
          <span className="ml-auto shrink-0 text-indigo-100">{profile?.status || '정상'}</span>
          <span className="shrink-0 text-indigo-100">{profile?.age ? `${profile.age}세` : '-'}</span>
          <span className="shrink-0 text-indigo-100">{profile?.bloodType || '-'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          icon={HeartPulse}
          label="심박수"
          value={latestBiometric ? `${latestBiometric.heartRate || 0} bpm` : '-'}
          toneClass="bg-rose-50 text-rose-600"
          alertLevel={resolveHeartRateAlertLevel(latestBiometric?.heartRate)}
          onClick={() => handleMetricCardOpen('heartRate')}
        />
        <MetricCard
          icon={Waves}
          label="SpO2"
          value={latestBiometric ? `${latestBiometric.spO2 || 0}%` : '-'}
          toneClass="bg-sky-50 text-sky-600"
          alertLevel={resolveSpO2AlertLevel(latestBiometric?.spO2)}
          onClick={() => handleMetricCardOpen('spO2')}
        />
        <MetricCard
          icon={Thermometer}
          label="체온"
          value={latestBiometric ? `${latestBiometric.bodyTemperature || 0}°C` : '-'}
          toneClass="bg-orange-50 text-orange-600"
          alertLevel={resolveBodyTemperatureAlertLevel(latestBiometric?.bodyTemperature)}
          onClick={() => handleMetricCardOpen('bodyTemperature')}
        />
        <MetricCard
          icon={Footprints}
          label="걸음수"
          value={latestBiometric ? `${latestBiometric.steps || 0}보` : '-'}
          toneClass="bg-emerald-50 text-emerald-600"
          onClick={() => handleMetricCardOpen('steps')}
        />
        <MetricCard
          icon={Brain}
          label="스트레스"
          value={latestBiometric ? `${latestBiometric.stressLevel || 0}` : '-'}
          toneClass="bg-violet-50 text-violet-600"
          alertLevel={resolveStressAlertLevel(latestBiometric?.stressLevel)}
          onClick={() => handleMetricCardOpen('stressLevel')}
        />
        <MetricCard
          icon={Battery}
          label="워치 배터리"
          value={latestBiometric ? `${latestBiometric.batteryLevel || 0}%` : '-'}
          toneClass="bg-amber-50 text-amber-600"
          alertLevel={resolveBatteryAlertLevel(latestBiometric?.batteryLevel)}
          onClick={() => handleMetricCardOpen('batteryLevel')}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <MapPin size={16} className="text-slate-400" />
          <h3 className="text-[16px] text-slate-900">현재 위치</h3>
        </div>
        <GuardianLiveMapFrame
          lat={currentMapLocation.lat}
          lng={currentMapLocation.lng}
          address={currentMapLocation.address}
          heightClassName="h-36"
          interactive={false}
          onClick={() => setIsMapOpen(true)}
        />
        <p className="mt-3 text-[14px] leading-6 text-slate-600">{currentMapLocation.address || '주소 정보 없음'}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Clock3 size={16} className="text-slate-400" />
          <h3 className="text-[16px] text-slate-900">최근 수집 시각</h3>
        </div>
        <p className="text-[14px] text-slate-600">
          {latestBiometric?.collectedAt ? new Date(latestBiometric.collectedAt).toLocaleString() : '최근 데이터가 없습니다.'}
        </p>
        {latestBiometric?.analysis?.analysisResult && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[14px] leading-6 text-slate-700">
            {latestBiometric.analysis.analysisResult}
          </div>
        )}
      </div>

    </div>
  );

  /**
   * 응급 이력 탭을 렌더링합니다.
   */
  const renderHistoryTab = () => (
    <div className="space-y-3 px-4 pb-28 pt-6">
      {emergencyHistory.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-[14px] text-slate-500 shadow-sm">
          표시할 응급 이력이 없습니다.
        </div>
      ) : (
        emergencyHistory.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] text-slate-500">{new Date(item.detectedAt).toLocaleString()}</p>
                <h3 className="mt-1 text-[17px] text-slate-900">{formatEmergencyLevel(item.emergencyLevel)}</h3>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[12px] text-amber-700">
                {formatEmergencyStatus(item.status)}
              </span>
            </div>
            <div className="mt-3 space-y-2 text-[14px] text-slate-600">
              <p className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" />
                <span>{resolveEmergencySummary(item)}</span>
              </p>
              <p className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                <span>{resolveEmergencyAddress(item)}</span>
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  /**
   * 보호자 정보 탭을 렌더링합니다.
   */
  const renderGuardianTab = () => (
    <div className="space-y-4 px-4 pb-28 pt-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <User size={16} className="text-slate-400" />
            <h3 className="text-[16px] text-slate-900">보호자 정보</h3>
          </div>
          {!isGuardianEditing && (
            <button
              onClick={() => setIsGuardianEditing(true)}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              수정
            </button>
          )}
        </div>
        {!isGuardianEditing && (
          <div className="space-y-2 text-[14px] text-slate-600">
            <p>이름: {profile?.guardian?.name || '-'}</p>
            <p>관계: {profile?.guardian?.relationship || '-'}</p>
            <p>연락처: {profile?.guardian?.phone || '-'}</p>
          </div>
        )}
        {isGuardianEditing && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center gap-2">
              <Shield size={16} className="text-slate-400" />
              <h4 className="text-[14px] text-slate-900">보호자 정보 수정</h4>
            </div>
            <div className="space-y-3">
              <input
                value={guardianForm.name}
                onChange={(e) => handleGuardianFormChange('name', e.target.value)}
                placeholder="보호자 이름"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <input
                value={guardianForm.relationship}
                onChange={(e) => handleGuardianFormChange('relationship', e.target.value)}
                placeholder="관계"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <input
                value={guardianForm.phone}
                onChange={(e) => handleGuardianFormChange('phone', e.target.value)}
                placeholder="연락처"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleGuardianEditCancel}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  취소
                </button>
                <button
                  onClick={handleGuardianProfileSave}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-100"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Smartphone size={16} className="text-slate-400" />
          <h3 className="text-[16px] text-slate-900">연결된 회원</h3>
        </div>
        <div className="space-y-2 text-[14px] text-slate-600">
          <p>이름: {profile?.name || session?.memberName || '-'}</p>
          <p>이메일: {profile?.email || session?.email || '-'}</p>
          <p>전화번호: {profile?.phone || '-'}</p>
          <p>혈액형: {profile?.bloodType || '-'}</p>
          <p>신장 / 체중: {profile?.height ? `${profile.height}cm` : '-'} / {profile?.weight ? `${profile.weight}kg` : '-'}</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <HeartPulse size={16} className="text-slate-400" />
          <h3 className="text-[16px] text-slate-900">건강 메모</h3>
        </div>
        <div className="space-y-3 text-[14px] text-slate-600">
          <div>
            <p className="text-[13px] text-slate-400">기저 질환</p>
            <p>{formatGuardianMedicalEntries(profile?.medicalHistory?.chronicDiseases, 'disease')}</p>
          </div>
          <div>
            <p className="text-[13px] text-slate-400">복용 중인 약물</p>
            <p>{formatGuardianMedicalEntries(profile?.medicalHistory?.medications, 'name')}</p>
          </div>
          <div>
            <p className="text-[13px] text-slate-400">알레르기</p>
            <p>{formatGuardianMedicalEntries(profile?.medicalHistory?.allergies, 'substance')}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Watch size={16} className="text-slate-400" />
          <h3 className="text-[16px] text-slate-900">연결 워치</h3>
        </div>
        <div className="space-y-2 text-[14px] text-slate-600">
          <p>기기명: {profile?.wearableDevice?.deviceName || '-'}</p>
          <p>기기 ID: {profile?.wearableDevice?.deviceId || '-'}</p>
          <p>연결 상태: {profile?.wearableDevice?.connectionStatus || '-'}</p>
          <p>마지막 동기화: {profile?.wearableDevice?.lastSyncAt ? new Date(profile.wearableDevice.lastSyncAt).toLocaleString() : '-'}</p>
        </div>
      </div>

      <button
        onClick={handleGuardianLogout}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600"
      >
        <LogOut size={18} />
        보호자 로그아웃
      </button>
    </div>
  );

  /**
   * 현재 탭에 맞는 보호자 화면 본문을 렌더링합니다.
   */
  const renderContent = () => {
    if (activeTab === 'overview' && selectedMetricKey) return renderMetricDetailView();
    if (activeTab === 'history') return renderHistoryTab();
    if (activeTab === 'guardian') return renderGuardianTab();
    return renderOverviewTab();
  };

  /**
   * 보호자 세션이 없을 때 회원가입/로그인 인증 화면을 렌더링합니다.
   */
  const renderAuthScreen = () => (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-slate-50 px-5 py-8">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            {authMode === 'signup' ? <UserPlus size={18} /> : <LogIn size={18} />}
          </div>
          <h1 className={authTitleClass}>보호자앱</h1>
        </div>

        {!guardianFindMode && (
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setAuthError('');
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
            }}
            className={`rounded-lg px-4 py-3 text-[14px] transition-colors ${
              authMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            회원가입
          </button>
        </div>
        )}

        {!guardianFindMode && authError ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">
            {authError}
          </div>
        ) : null}

        {guardianFindMode === 'find-email' ? (
          /* 보호자 아이디 찾기 화면 */
          <div className="mt-5 space-y-4">
            <button
              type="button"
              onClick={() => { setGuardianFindMode(null); setGuardianFindEmailResult(''); setAuthError(''); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-[13px] font-medium text-indigo-600 shadow-sm transition hover:bg-indigo-50"
            >
              <ChevronLeft size={14} /> 로그인으로 돌아가기
            </button>
            <h2 className="text-[16px] font-semibold text-slate-800">아이디(이메일) 찾기</h2>
            {guardianFindEmailResult ? (
              <div className={`rounded-lg px-4 py-3 text-[13px] ${guardianFindEmailResult.startsWith('가입된') ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>
                {guardianFindEmailResult}
              </div>
            ) : null}
            <div>
              <label className={authFieldLabelClass}>이름</label>
              <div className={authInputShellClass}>
                <User size={16} className="text-indigo-500" />
                <input
                  type="text"
                  value={guardianFindEmailName}
                  onChange={(e) => setGuardianFindEmailName(e.target.value)}
                  placeholder="이름 입력"
                  className={authInputClass}
                />
              </div>
            </div>
            <div>
              <label className={authFieldLabelClass}>전화번호</label>
              <div className={authInputShellClass}>
                <Phone size={16} className="text-indigo-500" />
                <input
                  type="text"
                  value={guardianFindEmailPhone}
                  onChange={(e) => setGuardianFindEmailPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className={authInputClass}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleGuardianFindEmail}
              disabled={guardianFindEmailLoading}
              className={authPrimaryButtonClass}
            >
              {guardianFindEmailLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              아이디 찾기
            </button>
          </div>
        ) : guardianFindMode === 'find-password' ? (
          /* 보호자 비밀번호 재설정 화면 */
          <div className="mt-5 space-y-4">
            <button
              type="button"
              onClick={() => { setGuardianFindMode(null); setGuardianFindPwResult(''); setGuardianFindPwStep('request'); setAuthError(''); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-[13px] font-medium text-indigo-600 shadow-sm transition hover:bg-indigo-50"
            >
              <ChevronLeft size={14} /> 로그인으로 돌아가기
            </button>
            <h2 className="text-[16px] font-semibold text-slate-800">비밀번호 재설정</h2>
            {guardianFindPwResult ? (
              <div className={`rounded-lg px-4 py-3 text-[13px] ${guardianFindPwResult.includes('재설정되었습니다') ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>
                {guardianFindPwResult}
              </div>
            ) : null}
            {guardianFindPwStep === 'request' ? (
              <>
                <div>
                  <label className={authFieldLabelClass}>이메일</label>
                  <div className={authInputShellClass}>
                    <Mail size={16} className="text-indigo-500" />
                    <input
                      type="text"
                      value={guardianFindPwEmail}
                      onChange={(e) => setGuardianFindPwEmail(e.target.value.toLowerCase())}
                      placeholder="example@email.com"
                      className={authInputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={authFieldLabelClass}>전화번호</label>
                  <div className={authInputShellClass}>
                    <Phone size={16} className="text-indigo-500" />
                    <input
                      type="text"
                      value={guardianFindPwPhone}
                      onChange={(e) => setGuardianFindPwPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      className={authInputClass}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGuardianResetRequestCode}
                  disabled={guardianFindPwLoading}
                  className={authPrimaryButtonClass}
                >
                  {guardianFindPwLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  인증코드 발송
                </button>
              </>
            ) : (
              <>
                <p className="text-[13px] text-slate-500">{guardianFindPwMaskedPhone}로 발송된 6자리 인증코드를 입력해주세요.</p>
                <div>
                  <label className={authFieldLabelClass}>인증코드</label>
                  <div className={authInputShellClass}>
                    <KeyRound size={16} className="text-indigo-500" />
                    <input
                      type="text"
                      value={guardianFindPwCode}
                      onChange={(e) => setGuardianFindPwCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
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
                    <Lock size={16} className="text-indigo-500" />
                    <input
                      type={isGuardianFindPwVisible ? 'text' : 'password'}
                      value={guardianFindPwNewPassword}
                      onChange={(e) => setGuardianFindPwNewPassword(e.target.value)}
                      placeholder="새 비밀번호 (6자 이상)"
                      className={authInputClass}
                    />
                    {guardianFindPwNewPassword ? (
                      <button type="button" onClick={() => setGuardianFindPwNewPassword('')} className={authIconButtonClass} aria-label="비밀번호 지우기">
                        <X size={14} />
                      </button>
                    ) : null}
                    <button type="button" onClick={() => setIsGuardianFindPwVisible((prev) => !prev)} className={authIconButtonClass} aria-label="비밀번호 보기">
                      {isGuardianFindPwVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={authFieldLabelClass}>새 비밀번호 확인</label>
                  <div className={authInputShellClass}>
                    <Lock size={16} className="text-indigo-500" />
                    <input
                      type={isGuardianFindPwConfirmVisible ? 'text' : 'password'}
                      value={guardianFindPwConfirmPassword}
                      onChange={(e) => setGuardianFindPwConfirmPassword(e.target.value)}
                      placeholder="비밀번호 재입력"
                      className={authInputClass}
                    />
                    {guardianFindPwConfirmPassword ? (
                      <button type="button" onClick={() => setGuardianFindPwConfirmPassword('')} className={authIconButtonClass} aria-label="비밀번호 확인 지우기">
                        <X size={14} />
                      </button>
                    ) : null}
                    <button type="button" onClick={() => setIsGuardianFindPwConfirmVisible((prev) => !prev)} className={authIconButtonClass} aria-label="비밀번호 확인 보기">
                      {isGuardianFindPwConfirmVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGuardianFindPassword}
                  disabled={guardianFindPwLoading}
                  className={authPrimaryButtonClass}
                >
                  {guardianFindPwLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  비밀번호 변경
                </button>
                <p className="text-center text-[12px] text-slate-400">
                  코드가 오지 않았나요?{' '}
                  <button onClick={handleGuardianResetRequestCode} className="text-indigo-500 underline" disabled={guardianFindPwLoading}>
                    재발송
                  </button>
                </p>
              </>
            )}
          </div>
        ) : authMode === 'login' ? (
          <form className="mt-5 space-y-4" onSubmit={handleGuardianAccountLogin}>
            <div>
              <label className={authFieldLabelClass}>보호자 이메일</label>
              <div className={authInputShellClass}>
                <Mail size={16} className="text-indigo-500" />
                <input
                  type="text"
                  value={guardianLoginEmail}
                  onChange={(event) => setGuardianLoginEmail(event.target.value)}
                  className={authInputClass}
                  placeholder="guardian@example.com"
                />
              </div>
            </div>
            <div>
              <label className={authFieldLabelClass}>비밀번호</label>
              <div className={authInputShellClass}>
                <Lock size={16} className="text-indigo-500" />
                <input
                  type={isGuardianLoginPasswordVisible ? 'text' : 'password'}
                  value={guardianLoginPassword}
                  onChange={(event) => setGuardianLoginPassword(event.target.value)}
                  className={authInputClass}
                  placeholder="비밀번호 입력"
                />
                {guardianLoginPassword ? (
                  <button
                    type="button"
                    onClick={() => setGuardianLoginPassword('')}
                    className={authIconButtonClass}
                    aria-label="로그인 비밀번호 지우기"
                  >
                    <X size={16} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsGuardianLoginPasswordVisible((prev) => !prev)}
                  className={authIconButtonClass}
                  aria-label="로그인 비밀번호 보기 전환"
                >
                  {isGuardianLoginPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className={authCheckboxLabelClass}>
                <input
                  type="checkbox"
                  checked={rememberGuardianEmail}
                  onChange={(event) => setRememberGuardianEmail(event.target.checked)}
                  className="peer sr-only"
                />
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-colors">
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
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-colors">
                  <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                <span className="text-[13px] font-medium text-slate-600">자동 로그인</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={isAuthSubmitting}
              className={`${authPrimaryButtonClass} mt-2`}
            >
              {isAuthSubmitting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              로그인
            </button>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => { setGuardianFindMode('find-email'); setAuthError(''); }} className="text-[13px] text-slate-400 hover:text-slate-600">
                아이디 찾기
              </button>
              <span className="mx-2 text-slate-300">|</span>
              <button type="button" onClick={() => { setGuardianFindMode('find-password'); setAuthError(''); }} className="text-[13px] text-slate-400 hover:text-slate-600">
                비밀번호 찾기
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleGuardianSignup}>
            <div>
              <label className={authFieldLabelClass}>휴대폰 본인인증 <span className="text-rose-400">*</span></label>
              <div className="mt-1 flex items-center gap-2">
                <div className={authInputShellClass}>
                  <Phone size={16} className="text-indigo-500" />
                  <input
                    type="tel"
                    value={guardianSignupPhone}
                    onChange={(event) =>
                      setGuardianSignupPhone(formatPhoneNumber(event.target.value))
                    }
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
            <div>
              <label className="text-[13px] text-slate-600">인증코드</label>
              <input
                type="text"
                value={guardianSignupAccessCode}
                onChange={(event) => setGuardianSignupAccessCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
                placeholder="6자리 인증코드"
              />
            </div>
            <div>
              <label className={authFieldLabelClass}>보호자 이메일 <span className="text-rose-400">*</span></label>
              <div className={authEmailGroupClass}>
                <div className="flex h-[44px] items-center gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white px-4">
                  <Mail size={16} className="text-indigo-500" />
                  <input
                    type="text"
                    value={guardianEmailLocalPart}
                    onChange={(event) => {
                      const nextValue = event.target.value.replace(/\s/g, '').toLowerCase();
                      setGuardianEmailLocalPart(nextValue);
                      syncGuardianSignupEmail({ localPart: nextValue });
                    }}
                    className={authInputClass}
                    placeholder="이메일 아이디"
                  />
                  <span className="text-sm font-semibold text-slate-400">@</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-11 flex-1 min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-white px-4">
                    <select
                      value={guardianEmailDomainOption}
                      onChange={(event) => {
                        const nextOption = event.target.value;
                        setGuardianEmailDomainOption(nextOption);
                        if (nextOption !== 'custom') {
                          setGuardianCustomEmailDomain('');
                          syncGuardianSignupEmail({ domainOption: nextOption, customDomain: '' });
                          return;
                        }
                        syncGuardianSignupEmail({ domainOption: nextOption });
                      }}
                      className="flex-1 min-w-0 h-full bg-transparent text-sm text-slate-900 outline-none border-0"
                    >
                      <option value="">도메인 선택</option>
                      {GUARDIAN_EMAIL_DOMAIN_OPTIONS.map((domain) => (
                        <option key={domain} value={domain}>
                          {domain}
                        </option>
                      ))}
                      <option value="custom">직접 입력</option>
                    </select>
                    {guardianEmailDomainOption === 'custom' ? (
                      <input
                        type="text"
                        value={guardianCustomEmailDomain}
                        onChange={(event) => {
                          const nextValue = event.target.value.replace(/\s/g, '').toLowerCase();
                          setGuardianCustomEmailDomain(nextValue);
                          syncGuardianSignupEmail({ customDomain: nextValue });
                        }}
                        className="flex-1 min-w-0 h-full bg-transparent text-sm text-slate-900 outline-none border-0"
                        placeholder="도메인 입력"
                      />
                    ) : (
                      <span className="flex-1 min-w-0 text-sm text-slate-400 truncate">
                        {guardianEmailDomainOption || '도메인'}
                      </span>
                    )}
                  </div>
                  {guardianSignupEmailVerified ? (
                    <span className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[13px] font-medium text-emerald-600">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      사용 가능
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCheckGuardianSignupEmail}
                      disabled={isGuardianSignupEmailChecking}
                      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-[13px] font-medium text-indigo-600 transition hover:bg-indigo-100 active:scale-95 disabled:opacity-50"
                    >
                      {isGuardianSignupEmailChecking ? <Loader2 size={14} className="animate-spin" /> : null}
                      중복확인
                    </button>
                  )}
                </div>
              </div>
              {guardianSignupEmailCheckMessage ? (
                <p className={`mt-1 text-[12px] ${guardianSignupEmailCheckResult === 'available' ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {guardianSignupEmailCheckMessage}
                </p>
              ) : null}
            </div>
            {/* 비밀번호 영역 - 하나의 박스로 묶음 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div>
              <label className="text-[13px] text-slate-600">비밀번호 <span className="text-rose-400">*</span></label>
              <div className={authInputShellClass}>
                <Lock size={16} className="text-indigo-500" />
                <input
                  type={isGuardianSignupPasswordVisible ? 'text' : 'password'}
                  value={guardianSignupPassword}
                  onChange={(event) => setGuardianSignupPassword(event.target.value)}
                  className={authInputClass}
                  placeholder="비밀번호 입력"
                />
                {guardianSignupPassword ? (
                  <button
                    type="button"
                    onClick={() => setGuardianSignupPassword('')}
                    className={authIconButtonClass}
                    aria-label="회원가입 비밀번호 지우기"
                  >
                    <X size={16} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsGuardianSignupPasswordVisible((prev) => !prev)}
                  className={authIconButtonClass}
                  aria-label="회원가입 비밀번호 보기 전환"
                >
                  {isGuardianSignupPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[13px] text-slate-600">비밀번호 확인 <span className="text-rose-400">*</span></label>
              <div className={authInputShellClass}>
                <Lock size={16} className="text-indigo-500" />
                <input
                  type={isGuardianSignupPasswordConfirmVisible ? 'text' : 'password'}
                  value={guardianSignupPasswordConfirm}
                  onChange={(event) => setGuardianSignupPasswordConfirm(event.target.value)}
                  className={authInputClass}
                  placeholder="비밀번호 다시 입력"
                />
                {guardianSignupPasswordConfirm ? (
                  <button
                    type="button"
                    onClick={() => setGuardianSignupPasswordConfirm('')}
                    className={authIconButtonClass}
                    aria-label="회원가입 비밀번호 확인 지우기"
                  >
                    <X size={16} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsGuardianSignupPasswordConfirmVisible((prev) => !prev)}
                  className={authIconButtonClass}
                  aria-label="회원가입 비밀번호 확인 보기 전환"
                >
                  {isGuardianSignupPasswordConfirmVisible ? <EyeOff size={16} /> : <Eye size={16} />}
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
                    checked={guardianTermsAgreed && guardianPrivacyAgreed && guardianLocationAgreed && guardianBiometricAgreed && guardianThirdPartyAgreed && guardianWearableAgreed}
                    onChange={(e) => {
                      setGuardianTermsAgreed(e.target.checked);
                      setGuardianPrivacyAgreed(e.target.checked);
                      setGuardianLocationAgreed(e.target.checked);
                      setGuardianBiometricAgreed(e.target.checked);
                      setGuardianThirdPartyAgreed(e.target.checked);
                      setGuardianWearableAgreed(e.target.checked);
                    }}
                    className="peer sr-only"
                  />
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-colors">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span className="text-[13px] font-semibold text-slate-900">필수 약관 모두 동의</span>
                </label>
              </div>
              {/* 서비스 이용약관 */}
              <div className="flex items-center gap-2">
                <label className="flex flex-1 items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guardianTermsAgreed}
                    onChange={(event) => setGuardianTermsAgreed(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-colors">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span className="text-[13px] text-slate-700">{GUARDIAN_SIGNUP_TERMS_CONTENT.service.title}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setGuardianOpenTermsType('service')}
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
                    checked={guardianPrivacyAgreed}
                    onChange={(event) => setGuardianPrivacyAgreed(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-colors">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span className="text-[13px] text-slate-700">{GUARDIAN_SIGNUP_TERMS_CONTENT.privacy.title}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setGuardianOpenTermsType('privacy')}
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
                    checked={guardianLocationAgreed}
                    onChange={(event) => setGuardianLocationAgreed(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-colors">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span className="text-[13px] text-slate-700">{GUARDIAN_SIGNUP_TERMS_CONTENT.location.title}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setGuardianOpenTermsType('location')}
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
                    checked={guardianBiometricAgreed}
                    onChange={(event) => setGuardianBiometricAgreed(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-colors">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span className="text-[13px] text-slate-700">{GUARDIAN_SIGNUP_TERMS_CONTENT.biometric.title}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setGuardianOpenTermsType('biometric')}
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
                    checked={guardianThirdPartyAgreed}
                    onChange={(event) => setGuardianThirdPartyAgreed(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-colors">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span className="text-[13px] text-slate-700">{GUARDIAN_SIGNUP_TERMS_CONTENT.thirdParty.title}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setGuardianOpenTermsType('thirdParty')}
                  className="shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                >
                  약관보기
                </button>
              </div>
              {/* 웨어러블 기기 연동 및 실시간 모니터링 동의 */}
              <div className="flex items-center gap-2">
                <label className="flex flex-1 items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guardianWearableAgreed}
                    onChange={(event) => setGuardianWearableAgreed(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-colors">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span className="text-[13px] text-slate-700">{GUARDIAN_SIGNUP_TERMS_CONTENT.wearable.title}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setGuardianOpenTermsType('wearable')}
                  className="shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                >
                  약관보기
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isAuthSubmitting}
              className={`${authPrimaryButtonClass} mt-2`}
            >
              {isAuthSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              회원가입
            </button>
          </form>
        )}
      </div>

      {/* 약관보기 모달 */}
      {guardianOpenTermsType && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/45"
            onClick={() => setGuardianOpenTermsType(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[78vh] overflow-hidden rounded-t-[28px] border border-indigo-100 bg-white px-5 pb-6 pt-5 shadow-[0_-10px_40px_rgba(15,23,42,0.16)]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-indigo-100" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">{GUARDIAN_SIGNUP_TERMS_CONTENT[guardianOpenTermsType].title}</div>
                <div className="mt-1 text-xs text-slate-500">회원가입 전에 반드시 내용을 확인해주세요.</div>
              </div>
              <button
                type="button"
                onClick={() => setGuardianOpenTermsType(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-slate-500"
                aria-label="약관 닫기"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 max-h-[58vh] space-y-4 overflow-y-auto pr-1">
              {GUARDIAN_SIGNUP_TERMS_CONTENT[guardianOpenTermsType].sections.map((section) => (
                <div key={section.heading} className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">{section.heading}</div>
                  <div className="mt-2 space-y-2">
                    {section.body.map((line) => (
                      <p key={line} className="text-sm leading-6 text-slate-600">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const showBlockingLoader =
    isLoading && !profile && recentBiometrics.length === 0 && emergencyHistory.length === 0;

  if (!session.token) {
    return renderAuthScreen();
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg overflow-x-hidden bg-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 pb-4 pt-6 backdrop-blur">
        <div className="flex items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-[20px] font-semibold tracking-[-0.02em] text-slate-900">보호자앱</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100/80 p-1">
            <RefreshModeToggle
              mode={refreshMode}
              onChange={(nextMode) => setRefreshMode(nextMode)}
            />
            <button
              onClick={() => void fetchGuardianData()}
              aria-label="지금 새로고침"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <GuardianTabButton active={activeTab === 'overview'} label="회원 현황" onClick={() => handleTabChange('overview')} />
          <GuardianTabButton active={activeTab === 'history'} label="응급 이력" onClick={() => handleTabChange('history')} />
          <GuardianTabButton active={activeTab === 'guardian'} label="보호자 정보" onClick={() => handleTabChange('guardian')} />
        </div>

      </div>

      {showBlockingLoader ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-[14px]">보호자 데이터를 불러오는 중입니다.</p>
        </div>
      ) : (
        renderContent()
      )}
      <GuardianMapOverlay
        open={isMapOpen}
        memberName={profile?.name || session.memberName || '회원'}
        location={currentMapLocation}
        onClose={() => setIsMapOpen(false)}
      />
    </div>
  );
}
