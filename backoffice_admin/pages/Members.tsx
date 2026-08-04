import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Battery, Activity, X,
  Heart, Thermometer, Moon, Brain, Move, Droplets, Wind, ActivitySquare, Zap,
  User, Phone, Calendar, Ruler, Weight, Shield, Pill, AlertCircle, Watch, Wifi, CheckCircle2,
  BarChart2, TrendingUp, Sparkles, Flame, Save, Lock, Mail, Unlink, Link, Users, Plus, MapPin, Trash2,
  ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { ManualMemberRegistrationInput, Member, MemberSettings, PendingStaffApproval } from '../types';
import { adminService } from '../services/adminService';
import ReactMarkdown from 'react-markdown';
import { RegionSelectGroup } from '../components/RegionSelectGroup';

/**
 * 심박수 값이 정상 범위를 벗어나면 경고용 텍스트 색상을 반환합니다.
 */
const getHeartRateClass = (bpm: number) => {
  if (bpm < 60 || bpm > 100) return 'text-red-600';
  return 'text-black';
};

/**
 * 체온 값이 발열 임계치를 넘으면 경고 색상을 반환합니다.
 */
const getTempClass = (temp: number) => {
  if (temp > 37.5) return 'text-red-600';
  return 'text-black';
};

/**
 * 산소포화도 값이 낮을 때 경고 색상을 반환합니다.
 */
const getSpo2Class = (spo2: number) => {
  if (spo2 < 95) return 'text-red-600';
  return 'text-black';
};

/**
 * 스트레스 수치가 높을수록 경고 색상을 반환합니다.
 */
const getStressClass = (stress: number) => {
  if (stress >= 70) return 'text-red-600';
  if (stress >= 40) return 'text-amber-600';
  return 'text-black';
};

/**
 * 워치 배터리 잔량을 단계별 텍스트 색상으로 변환합니다.
 */
const getBatteryClass = (level: number) => {
  if (level <= 20) return 'text-red-600';
  if (level <= 50) return 'text-amber-600';
  return 'text-green-600';
};

/**
 * 숫자만 남긴 뒤 휴대전화 형식으로 하이픈을 삽입합니다.
 */
const formatPhoneNumber = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

/**
 * 회원 리스트의 소속은 구/동까지만 보여주도록 정리합니다.
 */
const getAffiliationAreaLabel = (affiliation: Member['affiliation']) => {
  const parts = [affiliation.district, affiliation.dong].filter(Boolean);
  if (parts.length > 0) return parts.join(' / ');
  return affiliation.city || '소속 미입력';
};

/**
 * 복지사 콤보 노출용으로 관리구역 전체 문구를 구성합니다.
 */
const getAffiliationFullLabel = (affiliation: Member['affiliation'] | PendingStaffApproval['affiliation']) =>
  [affiliation.city, affiliation.district, affiliation.dong].filter(Boolean).join(' / ') || '관리구역 미입력';

/**
 * 회원 상세 편집 폼의 인풋/콤보 박스 높이와 패딩을 동일하게 유지합니다.
 */
const memberDetailFieldClass =
  'mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500';

/**
 * 회원 상세 카드의 저장 버튼 스타일을 다른 관리 화면과 동일한 톤으로 맞춥니다.
 */
const memberSectionSaveButtonClass =
  'inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-[14px] text-white hover:bg-blue-700 disabled:opacity-50';

/**
 * 회원이 속한 지역과 가장 가까운 복지사 목록을 우선순위대로 정렬합니다.
 */
const getScopedWelfareStaffOptions = (
  welfareStaff: PendingStaffApproval[],
  affiliation: Partial<Member['affiliation']> | undefined,
  options?: {
    fallbackToAll?: boolean;
    requireFullRegion?: boolean;
  },
) => {
  const fallbackToAll = options?.fallbackToAll ?? true;
  const requireFullRegion = options?.requireFullRegion ?? false;
  const activeStaff = welfareStaff.filter((staff) => staff.accountStatus === 'active');

  if (
    requireFullRegion &&
    (!affiliation?.city || !affiliation?.district || !affiliation?.dong)
  ) {
    return [];
  }

  const exact = activeStaff.filter(
    (staff) =>
      staff.affiliation.city === affiliation?.city &&
      staff.affiliation.district === affiliation?.district &&
      staff.affiliation.dong === affiliation?.dong,
  );

  if (exact.length > 0) return exact;

  const districtMatched = activeStaff.filter(
    (staff) =>
      staff.affiliation.city === affiliation?.city &&
      staff.affiliation.district === affiliation?.district,
  );

  if (districtMatched.length > 0) return districtMatched;

  const cityMatched = activeStaff.filter((staff) => staff.affiliation.city === affiliation?.city);
  if (cityMatched.length > 0) return cityMatched;

  return fallbackToAll ? activeStaff : [];
};

/**
 * 회원 리스트 상태 배지는 승인 대기 폭 기준으로 모두 동일하게 맞춥니다.
 */
const MEMBER_STATUS_BADGE_CLASS = 'inline-flex w-[108px] shrink-0 items-center justify-center px-2.5 py-1 rounded-full text-[13px] border whitespace-nowrap';

/**
 * 낙상 지수를 단계별 강조 색상으로 변환합니다.
 */
const getFallScoreClass = (score: number) => {
  if (score >= 85) return 'text-red-600';
  if (score >= 70) return 'text-orange-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-black';
};

/**
 * 응급 지수를 단계별 강조 색상으로 변환합니다.
 */
const getEmergencyScoreClass = (score: number) => {
  if (score >= 85) return 'text-red-600';
  if (score >= 70) return 'text-orange-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-black';
};

/**
 * 응급 지수를 운영 배지 문구로 변환합니다.
 */
const getEmergencyScoreStatus = (score: number) => {
  if (score >= 85) return '중증 응급';
  if (score >= 70) return '고위험';
  if (score >= 50) return '주의';
  return '관찰';
};

/**
 * 낙상 지수를 운영 배지 문구로 변환합니다.
 */
const getFallScoreStatus = (score: number) => {
  if (score >= 85) return '즉시 대응';
  if (score >= 70) return '고위험';
  if (score >= 50) return '낙상 의심';
  return '관찰';
};

type BiometricMetricKey =
  | 'heartRate'
  | 'bloodOxygen'
  | 'temperature'
  | 'battery'
  | 'stress'
  | 'steps'
  | 'fallScore'
  | 'emergencyScore';

/**
 * 수치를 범위 안으로 보정해 차트용 이상값을 막습니다.
 */
const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * 기준값을 중심으로 최근 7개 시계열 샘플을 만듭니다.
 */
const buildRecentTrend = (
  baseValue: number,
  unitMin: number,
  unitMax: number,
  offsets: number[],
) => ['-60분', '-50분', '-40분', '-30분', '-20분', '-10분', '현재'].map((label, index) => ({
  name: label,
  value: clampValue(baseValue + (offsets[index] ?? 0), unitMin, unitMax),
}));

/**
 * 아코디언 내부의 최근 이력 문장을 시간순으로 구성합니다.
 */
const buildBiometricHistory = (label: string, values: Array<string>, notes: string[]) =>
  ['1시간 전', '30분 전', '10분 전'].map((time, index) => ({
    time,
    value: values[index] || '-',
    note: notes[index] || `${label} 값이 수집되었습니다.`,
  }));

/**
 * 선택된 회원과 카드 키를 받아 아코디언에 표시할 상세 데이터를 만듭니다.
 */
const getBiometricAccordionData = (member: Member, key: BiometricMetricKey) => {
  const heartHistory = member.healthStats?.heartRateHistory || [];
  const stepsHistory = member.healthStats?.stepsHistory || [];

  switch (key) {
    case 'heartRate':
      return {
        insight: `평균 ${member.healthStats.averageHeartRate}bpm 대비 현재 ${member.biometrics.heartRate}bpm 입니다.`,
        chartUnit: 'bpm',
        chartColor: '#ef4444',
        chartData: heartHistory.length > 0 ? heartHistory.map((item) => ({ name: item.name, value: item.value })) : buildRecentTrend(member.biometrics.heartRate, 45, 170, [-4, 3, -2, 5, -1, 2, 0]),
        history: buildBiometricHistory('심박수', [`${Math.max(member.biometrics.heartRate - 7, 40)} bpm`, `${Math.max(member.biometrics.heartRate - 3, 40)} bpm`, `${member.biometrics.heartRate} bpm`], ['안정 시 심박수 범위 유지', '짧은 상승 후 정상 범위 재진입', '현재 실시간 수신값']),
      };
    case 'bloodOxygen':
      return {
        insight: `평균 ${member.healthStats.averageSPO2}% 기준에서 현재 ${member.biometrics.bloodOxygen}% 입니다.`,
        chartUnit: '%',
        chartColor: '#06b6d4',
        chartData: buildRecentTrend(member.biometrics.bloodOxygen, 88, 100, [-1, 0, -1, 1, 0, 0, 0]),
        history: buildBiometricHistory('산소포화도', [`${Math.max(member.biometrics.bloodOxygen - 1, 88)}%`, `${member.biometrics.bloodOxygen}%`, `${member.biometrics.bloodOxygen}%`], ['가벼운 변동 범위', '호흡 안정', '현재 실시간 수신값']),
      };
    case 'temperature':
      return {
        insight: `평균 ${member.healthStats.averageTemperature}°C 대비 현재 ${member.biometrics.temperature}°C 입니다.`,
        chartUnit: '°C',
        chartColor: '#f97316',
        chartData: buildRecentTrend(member.biometrics.temperature, 35, 39.5, [-0.2, 0.1, 0, 0.1, -0.1, 0, 0]),
        history: buildBiometricHistory('체온', [`${Math.max(member.biometrics.temperature - 0.2, 35).toFixed(1)}°C`, `${Math.max(member.biometrics.temperature - 0.1, 35).toFixed(1)}°C`, `${member.biometrics.temperature.toFixed(1)}°C`], ['실내 체온 유지', '미세한 상승 관찰', '현재 실시간 수신값']),
      };
    case 'battery':
      return {
        insight: `현재 워치 배터리는 ${member.deviceBattery}%이며, 20% 미만이면 충전 우선 확인이 필요합니다.`,
        chartUnit: '%',
        chartColor: '#7c3aed',
        chartData: buildRecentTrend(member.deviceBattery || 0, 0, 100, [-6, -4, -3, -2, -1, 0, 0]),
        history: buildBiometricHistory('배터리', [`${Math.max((member.deviceBattery || 0) - 6, 0)}%`, `${Math.max((member.deviceBattery || 0) - 3, 0)}%`, `${member.deviceBattery || 0}%`], ['직전 동기화 시점 잔량', '백그라운드 수집 후 잔량', '현재 연결 기준 잔량']),
      };
    case 'steps':
      return {
        insight: `오늘 걸음수는 ${member.biometrics.steps.toLocaleString()}보이며, 주간 목표 달성률은 ${member.healthStats.stepGoalAchievement}% 입니다.`,
        chartUnit: '보',
        chartColor: '#4f46e5',
        chartData: stepsHistory.length > 0 ? stepsHistory.map((item) => ({ name: item.name, value: item.value })) : buildRecentTrend(member.biometrics.steps, 0, 20000, [-1200, -800, -600, -400, -200, -100, 0]),
        history: buildBiometricHistory('걸음수', [`${Math.max(member.biometrics.steps - 2400, 0).toLocaleString()} 보`, `${Math.max(member.biometrics.steps - 900, 0).toLocaleString()} 보`, `${member.biometrics.steps.toLocaleString()} 보`], ['오전 누적 활동량', '오후 누적 활동량', '현재 실시간 누적값']),
      };
    case 'stress':
      return {
        insight: `최근 평균 스트레스는 ${member.healthStats.averageStress}, 현재는 ${member.biometrics.stress}/100 입니다.`,
        chartUnit: '점',
        chartColor: '#a855f7',
        chartData: buildRecentTrend(member.biometrics.stress, 0, 100, [-8, 5, -4, 9, -3, 4, 0]),
        history: buildBiometricHistory('스트레스', [`${Math.max(member.biometrics.stress - 12, 0)}/100`, `${Math.max(member.biometrics.stress - 5, 0)}/100`, `${member.biometrics.stress}/100`], ['오전 안정 구간', '이동 중 일시 상승', '현재 실시간 수신값']),
      };
    case 'fallScore':
      return {
        insight: `현재 낙상 지수는 ${member.biometrics.fallScore}/100 이며, ${getFallScoreStatus(member.biometrics.fallScore)} 단계로 봅니다.`,
        chartUnit: '점',
        chartColor: '#f59e0b',
        chartData: buildRecentTrend(member.biometrics.fallScore, 0, 100, [-10, 6, -4, 8, -3, 2, 0]),
        history: buildBiometricHistory('낙상 지수', [`${Math.max(member.biometrics.fallScore - 11, 0)}점`, `${Math.max(member.biometrics.fallScore - 5, 0)}점`, `${member.biometrics.fallScore}점`], ['보행 안정 상태', '충격 이벤트 이후 재계산', '현재 위험 추정값']),
      };
    case 'emergencyScore':
    default:
      return {
        insight: `현재 응급 지수는 ${member.biometrics.emergencyScore}/100 이며, ${getEmergencyScoreStatus(member.biometrics.emergencyScore)} 대응 기준입니다.`,
        chartUnit: '점',
        chartColor: '#ef4444',
        chartData: buildRecentTrend(member.biometrics.emergencyScore, 0, 100, [-7, 4, -3, 6, -2, 2, 0]),
        history: buildBiometricHistory('응급 지수', [`${Math.max(member.biometrics.emergencyScore - 9, 0)}점`, `${Math.max(member.biometrics.emergencyScore - 4, 0)}점`, `${member.biometrics.emergencyScore}점`], ['관찰 단계 유지', '복합 신호 반영 후 상승', '현재 종합 응급 추정값']),
      };
  }
};

/**
 * 개별 생체 지표를 아이콘과 함께 렌더링하는 카드입니다.
 */
/**
 * 생체 카드 라벨, 값, 아이콘, 상태 문구를 전달받는 prop 구조입니다.
 */
const BiometricCard: React.FC<{ 
  label: string; 
  value: string | number; 
  unit?: string; 
  icon: React.ElementType; 
  color: string;
  status?: string;
  isExpanded?: boolean;
  insight?: string;
  chartUnit?: string;
  chartColor?: string;
  chartData?: Array<{ name: string; value: number }>;
  history?: Array<{ time: string; value: string; note: string }>;
  onToggle?: () => void;
}> = ({ label, value, unit, icon: Icon, color, status, isExpanded = false, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`bg-white p-3 rounded-lg border shadow-sm text-left transition-all duration-300 ${isExpanded ? 'border-blue-300 shadow-md' : 'border-slate-100 hover:shadow-md'}`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] text-black mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-[15px] text-black">{value}</span>
          {unit && <span className="text-[13px] text-black">{unit}</span>}
        </div>
        {status && <p className="text-[13px] text-black mt-1">{status}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className={`p-1.5 rounded-md ${color}`}>
          <Icon size={16} />
        </div>
        <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
      </div>
    </div>
  </button>
);

/**
 * 회원 상세 카드 안의 라벨/값 정보 행을 렌더링합니다.
 */
/**
 * 아이콘, 라벨, 단일 값을 한 줄로 표시하는 정보 행 prop 구조입니다.
 */
const InfoItem: React.FC<{ icon: React.ElementType; label: string; value: string | number }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
    <div className="text-black">
      <Icon size={16} />
    </div>
    <div>
      <p className="text-[13px] text-black">{label}</p>
      <p className="text-[15px] text-black">{value}</p>
    </div>
  </div>
);

/**
 * 앱 설정 토글 한 줄을 렌더링하고 클릭 시 상태 변경을 위임합니다.
 */
/**
 * 설정명, 현재 on/off 상태, 토글 핸들러를 전달받는 prop 구조입니다.
 */
const ToggleStatus: React.FC<{ label: string; checked: boolean; onToggle: () => void }> = ({ label, checked, onToggle }) => (
  <div 
    className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 cursor-pointer"
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
  >
    <span className="text-[15px] text-black">{label}</span>
    <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors duration-200 ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 shadow-sm ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
    </div>
  </div>
);

/**
 * 회원 통계 탭에서 핵심 지표를 간단히 보여주는 카드입니다.
 */
/**
 * 제목, 값, 보조값, 아이콘, 색상 클래스를 전달받는 통계 카드 prop 구조입니다.
 */
const StatCard: React.FC<{ title: string; value: string | number; subValue?: string; icon: React.ElementType; colorClass: string }> = ({ title, value, subValue, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
    <div className="flex items-start justify-between mb-2">
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
         <Icon size={18} className={colorClass.replace('bg-', 'text-')} />
      </div>
      {subValue && <span className="text-[12px] text-black">{subValue}</span>}
    </div>
    <h4 className="text-black text-[12px] mb-1">{title}</h4>
    <p className="text-[18px] text-black">{value}</p>
  </div>
);

/**
 * 회원 목록, 상세 패널, AI 건강 리포트를 함께 관리하는 관리자 페이지입니다.
 */
export const Members: React.FC = () => {
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [welfareStaffOptions, setWelfareStaffOptions] = useState<PendingStaffApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [expandedBiometricKey, setExpandedBiometricKey] = useState<BiometricMetricKey | null>(null);
  const [isBiometricChartReady, setIsBiometricChartReady] = useState(false);
  const [approvalProcessing, setApprovalProcessing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<ManualMemberRegistrationInput>({
    name: '',
    phone: '',
    email: '',
    password: '',
    birthDate: '',
    age: 65,
    gender: '남',
    height: 165,
    weight: 60,
    bloodType: 'A+',
    city: '',
    district: '',
    dong: '',
    welfareName: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: '보호자',
  });

  /**
   * 첫 렌더 시 관리자 회원 목록을 한 번 불러옵니다.
   */
  useEffect(() => {
    fetchMembers();
    fetchWelfareStaffOptions();
  }, []);

  /**
   * 회원 목록을 관리자 API에서 불러와 테이블 상태에 반영합니다.
   */
  const fetchMembers = async (selectedId?: string | null) => {
    try {
      const data = await adminService.getMembers();
      setMembersList(data);
      if (selectedId) {
        const nextSelected = data.find((member) => member.id === selectedId) || null;
        setSelectedMember(nextSelected);
        if (nextSelected) {
          setEditForm(nextSelected);
        }
      }
    } catch (error) {
      console.error("Failed to load members", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 회원 배정에 사용하는 활성 복지사 목록을 불러옵니다.
   */
  const fetchWelfareStaffOptions = async () => {
    try {
      const staff = await adminService.getStaffAccounts();
      setWelfareStaffOptions(staff.filter((entry) => entry.role === 'medical'));
    } catch (error) {
      console.error('Failed to fetch welfare staff options:', error);
      setWelfareStaffOptions([]);
    }
  };

  const [activeTab, setActiveTab] = useState<'realtime' | 'stats'>('realtime');
  const [riskAnalysis, setRiskAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /**
   * 좌측 회원 목록 페이지네이션 상태를 관리합니다.
   */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  /**
   * 우측 상세 패널의 회원 편집 임시값을 보관합니다.
   */
  const [editForm, setEditForm] = useState<Partial<Member>>({});
  const [newPassword, setNewPassword] = useState('');

  /**
   * 회원 리스트와 상세 공통 상태 배지 색상을 더 선명하게 반환합니다.
   */
  const getMemberStatusBadgeClass = (member: Member) => {
    if (member.accountStatus === 'pending') return 'bg-blue-600 text-white border-blue-700 shadow-sm';
    if (member.accountStatus === 'rejected') return 'bg-rose-600 text-white border-rose-700 shadow-sm';
    if (member.accountStatus === 'suspended') return 'bg-amber-500 text-white border-amber-600 shadow-sm';
    if (member.accountStatus === 'withdrawn') return 'bg-slate-600 text-white border-slate-700 shadow-sm';
    if (member.status === '위험') return 'bg-red-600 text-white border-red-700 shadow-sm';
    if (member.status === '주의') return 'bg-orange-500 text-white border-orange-600 shadow-sm';
    if (member.status === '비활성') return 'bg-slate-500 text-white border-slate-600 shadow-sm';
    return 'bg-emerald-600 text-white border-emerald-700 shadow-sm';
  };

  /**
   * 회원 계정 상태 코드를 관리자 화면 표시용 한글 라벨로 변환합니다.
   */
  const getMemberAccountStatusLabel = (accountStatus: Member['accountStatus']) => {
    if (accountStatus === 'pending') return '승인 대기';
    if (accountStatus === 'suspended') return '이용 정지';
    if (accountStatus === 'rejected') return '반려';
    if (accountStatus === 'withdrawn') return '해지';
    return '이용 중';
  };

  /**
   * 검색어를 기준으로 현재 회원 목록을 이름/이메일/전화번호로 필터링합니다.
   */
  const filteredMembers = membersList.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone.includes(searchTerm)
  );

  /**
   * 현재 페이지에 표시할 회원 슬라이스를 계산합니다.
   */
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const currentMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /**
   * 우측 상세 패널의 생체 카드 목록과 현재 펼친 카드의 상세 데이터를 계산합니다.
   */
  const selectedBiometricCards = selectedMember
    ? ([
        { key: 'heartRate', label: '심박수', value: selectedMember.biometrics.heartRate, unit: 'bpm', icon: Heart, color: 'bg-red-100 text-red-500' },
        { key: 'bloodOxygen', label: '혈중 산소', value: selectedMember.biometrics.bloodOxygen, unit: '%', icon: Wind, color: 'bg-cyan-100 text-cyan-500' },
        { key: 'temperature', label: '체온', value: selectedMember.biometrics.temperature, unit: '°C', icon: Thermometer, color: 'bg-orange-100 text-orange-500' },
        { key: 'battery', label: '배터리', value: selectedMember.deviceBattery, unit: '%', icon: Battery, color: 'bg-violet-100 text-violet-500' },
        { key: 'stress', label: '스트레스', value: selectedMember.biometrics.stress, unit: '/100', icon: Brain, color: 'bg-purple-100 text-purple-500' },
        { key: 'steps', label: '걸음수', value: selectedMember.biometrics.steps.toLocaleString(), unit: '보', icon: Activity, color: 'bg-indigo-100 text-indigo-500' },
        { key: 'fallScore', label: '낙상 지수', value: selectedMember.biometrics.fallScore, unit: '/100', icon: Move, color: 'bg-amber-100 text-amber-600' },
        { key: 'emergencyScore', label: '응급 지수', value: selectedMember.biometrics.emergencyScore, unit: '/100', icon: AlertCircle, color: 'bg-rose-100 text-rose-600' },
      ] as Array<{
        key: BiometricMetricKey;
        label: string;
        value: string | number;
        unit?: string;
        icon: React.ElementType;
        color: string;
      }>)
    : [];
  const expandedBiometricCard =
    selectedBiometricCards.find((card) => card.key === expandedBiometricKey) || null;
  const expandedBiometricDetail =
    selectedMember && expandedBiometricCard ? getBiometricAccordionData(selectedMember, expandedBiometricCard.key) : null;
  const editAffiliation = editForm.affiliation || { city: '', district: '', dong: '', welfareName: '' };
  const editWelfareOptionsBase = getScopedWelfareStaffOptions(welfareStaffOptions, editAffiliation);
  const editWelfareOptions =
    editAffiliation.welfareName && !editWelfareOptionsBase.some((staff) => staff.name === editAffiliation.welfareName)
      ? [
          {
            id: `custom-${editAffiliation.welfareName}`,
            name: editAffiliation.welfareName,
            email: '',
            phone: '',
            role: 'medical' as const,
            affiliation: {
              city: editAffiliation.city || '',
              district: editAffiliation.district || '',
              dong: editAffiliation.dong || '',
              welfareName: editAffiliation.welfareName,
            },
            createdAt: '',
            accountStatus: 'active' as const,
          },
          ...editWelfareOptionsBase,
        ]
      : editWelfareOptionsBase;
  const createWelfareOptions = getScopedWelfareStaffOptions(welfareStaffOptions, {
    city: createForm.city,
    district: createForm.district,
    dong: createForm.dong,
    welfareName: createForm.welfareName,
  }, {
    fallbackToAll: false,
    requireFullRegion: true,
  });
  const isCreateRegionSelected = Boolean(createForm.city && createForm.district && createForm.dong);

  /**
   * 아코디언 펼침 애니메이션이 끝난 뒤 차트를 다시 마운트해 Recharts의 0 크기 계산을 방지합니다.
   */
  useEffect(() => {
    if (!expandedBiometricCard || !expandedBiometricDetail) {
      setIsBiometricChartReady(false);
      return;
    }

    setIsBiometricChartReady(false);
    const timer = window.setTimeout(() => {
      setIsBiometricChartReady(true);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [expandedBiometricCard, expandedBiometricDetail]);

  /**
   * 페이지 범위를 벗어나지 않을 때만 현재 페이지를 갱신합니다.
   */
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  /**
   * 목록에서 회원을 선택하면 상세 패널 상태와 편집 폼을 초기화합니다.
   */
  const handleRowClick = (member: Member) => {
    // 새 회원을 선택할 때 편집 폼과 보조 패널 상태를 함께 초기화해 이전 대상 흔적이 남지 않게 합니다.
    setSelectedMember(member);
    setEditForm(member);
    setNewPassword('');
    setActiveTab('realtime');
    setRiskAnalysis(null);
    setExpandedBiometricKey(null);
  };

  /**
   * 특정 회원의 AI 건강 리포트를 생성 요청하고 우측 패널에 표시합니다.
   */
  const handleAnalyze = async (e: React.MouseEvent, member: Member) => {
    e.stopPropagation();
    setSelectedMember(member);
    setEditForm(member);
    setActiveTab('realtime');
    setIsAnalyzing(true);
    setRiskAnalysis(null);
    try {
      const result = await adminService.getMemberAIReport(member.id);
      setRiskAnalysis(result || "AI 분석 리포트를 생성할 수 없습니다.");
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setRiskAnalysis("오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * 연동 기기 해제를 로컬 상태에 반영해 상세 패널과 목록을 동기화합니다.
   */
  const handleDisconnectDevice = async () => {
    if (!selectedMember) return;
    if (window.confirm(`${selectedMember.name} 님의 기기(${selectedMember.connectedDevice?.modelName}) 연동을 해제하시겠습니까?`)) {
      try {
        const updatedMember = await adminService.disconnectMemberDevice(selectedMember.id);
        if (!updatedMember) {
          alert('기기 연동 해제에 실패했습니다.');
          return;
        }
        setMembersList(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
        setSelectedMember(updatedMember);
        setEditForm(updatedMember);
      } catch (error) {
        console.error('Failed to disconnect member device:', error);
        alert('오류가 발생했습니다.');
      }
    }
  };

  /**
   * 신상 정보 편집 결과를 서버에 저장하고 성공 시 목록/상세 상태를 갱신합니다.
   */
  const handlePersonalInfoSave = async () => {
    if (selectedMember && editForm) {
      const confirmed = window.confirm('저장하시겠습니까?');
      if (!confirmed) return;

      try {
        const updatedMember = await adminService.updateMember(editForm);
        if (updatedMember) {
          // 목록과 우측 상세 패널이 같은 데이터를 보도록 둘 다 같은 결과로 갱신합니다.
          setMembersList(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
          setSelectedMember(updatedMember);
          setEditForm(updatedMember);
          alert('저장되었습니다.');
        } else {
          alert('회원 정보 수정에 실패했습니다.');
        }
      } catch (error) {
        console.error('Failed to update member:', error);
        alert('오류가 발생했습니다.');
      }
    }
  };

  /**
   * 보호자 정보 편집 결과를 서버에 저장하고 성공 시 목록/상세 상태를 갱신합니다.
   */
  const handleGuardianInfoSave = async () => {
    if (selectedMember && editForm) {
      const confirmed = window.confirm('저장하시겠습니까?');
      if (!confirmed) return;

      try {
        const updatedMember = await adminService.updateMember(editForm);
        if (updatedMember) {
          setMembersList(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
          setSelectedMember(updatedMember);
          setEditForm(updatedMember);
          alert('저장되었습니다.');
        } else {
          alert('보호자 정보 수정에 실패했습니다.');
        }
      } catch (error) {
        console.error('Failed to update guardian info:', error);
        alert('오류가 발생했습니다.');
      }
    }
  };

  /**
   * 현재 선택된 회원의 보호자 로그인용 자체 인증코드를 발급합니다.
   */
  const handleIssueGuardianAccessCode = async () => {
    if (!selectedMember) return;
    const issued = await adminService.issueGuardianAccessCode(selectedMember.id);
    if (!issued) {
      alert('보호자 인증코드 발급에 실패했습니다.');
      return;
    }
    const issuedCode = String(issued.code || '').trim();
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(issuedCode);
    }
    const expiresAt = issued.expiresAt ? new Date(issued.expiresAt).toLocaleTimeString() : '';
    alert(`보호자 인증코드가 복사되었습니다.${expiresAt ? `\n만료 시각: ${expiresAt}` : ''}\n\n${issuedCode}`);
  };

  /**
   * 계정 상태 변경을 서버에 저장하고 성공 시 상세 패널 상태를 갱신합니다.
   */
  const handleAccountStatusSave = async () => {
    if (selectedMember && editForm) {
      const confirmed = window.confirm('저장하시겠습니까?');
      if (!confirmed) return;

      try {
        const updatedMember = await adminService.updateMember(editForm);
        if (updatedMember) {
          // 계정 상태 저장도 목록/상세를 동시에 갱신해 좌우 패널 불일치를 막습니다.
          setMembersList(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
          setSelectedMember(updatedMember);
          setEditForm(updatedMember);
          alert('저장되었습니다.');
        } else {
          alert('상태 수정에 실패했습니다.');
        }
      } catch (error) {
        console.error('Failed to update member status:', error);
        alert('오류가 발생했습니다.');
      }
    }
  };

  /**
   * 승인 대기 회원을 상세 패널 안에서 승인 또는 반려 처리합니다.
   */
  const handlePendingMemberApproval = async (accountStatus: 'active' | 'rejected') => {
    if (!selectedMember) return;

    try {
      setApprovalProcessing(true);
      const ok = await adminService.updateMemberApproval(selectedMember.id, accountStatus);
      if (!ok) {
        alert('회원 승인 처리에 실패했습니다.');
        return;
      }

      await fetchMembers(selectedMember.id);
    } catch (error) {
      console.error('Failed to update member approval:', error);
      alert('오류가 발생했습니다.');
    } finally {
      setApprovalProcessing(false);
    }
  };

  /**
   * 회원 수동 등록 폼 입력값을 갱신합니다.
   */
  const handleCreateFormChange = (key: keyof ManualMemberRegistrationInput, value: string | number) => {
    setCreateForm((prev) => ({
      ...prev,
      [key]:
        typeof value === 'string' && (key === 'phone' || key === 'guardianPhone')
          ? formatPhoneNumber(value)
          : value,
    }));
  };

  /**
   * 회원 상세 편집에서 지역 소속을 콤보박스로 갱신합니다.
   */
  const handleEditRegionChange = (next: { city: string; district: string; dong: string }) => {
    setEditForm((prev) => ({
      ...prev,
      affiliation: {
        city: next.city,
        district: next.district,
        dong: next.dong,
        welfareName: '',
      },
    }));
  };

  /**
   * 회원 등록 모달에서 지역 소속을 콤보박스로 갱신합니다.
   */
  const handleCreateRegionChange = (next: { city: string; district: string; dong: string }) => {
    setCreateForm((prev) => ({
      ...prev,
      city: next.city,
      district: next.district,
      dong: next.dong,
      welfareName: '',
    }));
  };

  /**
   * 어드민에서 회원을 직접 등록하고 목록을 새로고칩니다.
   */
  const handleCreateMember = async () => {
    if (!createForm.name || !createForm.phone || !createForm.email || !createForm.password || !createForm.city || !createForm.district || !createForm.dong || !createForm.welfareName || !createForm.guardianName || !createForm.guardianPhone) {
      alert('이름, 연락처, 이메일, 비밀번호, 시/도, 시/군/구, 읍/면/동, 담당 복지사, 보호자 이름, 보호자 연락처는 필수입니다.');
      return;
    }

    try {
      setCreateProcessing(true);
      const ok = await adminService.createMember(createForm);
      if (!ok) {
        alert('회원 등록에 실패했습니다.');
        return;
      }

      setCreateForm({
        name: '',
        phone: '',
        email: '',
        password: '',
        birthDate: '',
        age: 65,
        gender: '남',
        height: 165,
        weight: 60,
        bloodType: 'A+',
        city: '',
        district: '',
        dong: '',
        welfareName: '',
        guardianName: '',
        guardianPhone: '',
        guardianRelationship: '보호자',
      });
      setIsCreateOpen(false);
      await fetchMembers();
    } finally {
      setCreateProcessing(false);
    }
  };

  /**
   * 비밀번호 변경 UI 상태만 정리하고 현재는 안내 메시지로 대체합니다.
   */
  const handlePasswordSave = async () => {
    if (selectedMember && newPassword) {
      const confirmed = window.confirm('저장하시겠습니까?');
      if (!confirmed) return;

      // Password change logic is not fully implemented in backend yet
      alert('비밀번호가 변경되었습니다. (실제 반영은 백엔드 구현 필요)');
      setNewPassword('');
    }
  };

  /**
   * 센서 기반 정보가 아닌 건강 메모 편집값을 로컬 상태에 반영합니다.
   */
  const handleHealthSave = async () => {
    if (selectedMember && editForm) {
      const confirmed = window.confirm('저장하시겠습니까?');
      if (!confirmed) return;

      try {
        const updatedMember = await adminService.updateMember(editForm);
        if (updatedMember) {
          setMembersList(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
          setSelectedMember(updatedMember);
          setEditForm(updatedMember);
          alert('저장되었습니다.');
        } else {
          alert('건강 메모 저장에 실패했습니다.');
        }
      } catch (error) {
        console.error('Failed to update health memo:', error);
        alert('오류가 발생했습니다.');
      }
    }
  };

  /**
   * 선택된 회원과 연결된 센서/응급 이력을 함께 삭제합니다.
   */
  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    const confirmed = window.confirm(
      '삭제하시겠습니까?\n삭제된 회원 데이터는 복구할 수 없습니다.',
    );
    if (!confirmed) return;

    try {
      setDeletingMemberId(selectedMember.id);
      const ok = await adminService.deleteMember(selectedMember.id);
      if (!ok) {
        alert('회원 삭제에 실패했습니다.');
        return;
      }

      setSelectedMember(null);
      await fetchMembers();
    } finally {
      setDeletingMemberId(null);
    }
  };

  /**
   * 회원 앱 설정의 boolean 항목을 토글해 로컬 상세 상태에 반영합니다.
   */
  const handleSettingToggle = async (key: keyof MemberSettings) => {
    if (!selectedMember) return;
    
    // Only toggle boolean values
    const currentValue = selectedMember.appSettings[key];
    if (typeof currentValue === 'boolean') {
        // 토글 가능한 boolean 항목만 뒤집고, 전송 주기 같은 비boolean 값은 건드리지 않습니다.
        const nextMember = {
            ...selectedMember,
            appSettings: {
                ...selectedMember.appSettings,
                [key]: !currentValue
            }
        };
        try {
          const updatedMember = await adminService.updateMember(nextMember);
          if (!updatedMember) {
            alert('앱 설정 저장에 실패했습니다.');
            return;
          }
          setMembersList(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
          setSelectedMember(updatedMember);
          setEditForm(updatedMember);
        } catch (error) {
          console.error('Failed to update app settings:', error);
          alert('오류가 발생했습니다.');
        }
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-slate-50 overflow-hidden">
      {/* Left List Section */}
      <div className={`flex min-h-0 flex-1 flex-col p-8 transition-all duration-300 ${selectedMember ? 'w-1/2' : 'w-full'}`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl text-black">회원 관리</h2>
            <p className="text-black">등록된 회원 및 기기 상태 모니터링</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[14px] text-white hover:bg-blue-700 shadow-sm"
            >
              <Plus size={16} />
              등록
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
              <input 
                type="text" 
                placeholder="이름, 이메일, 전화번호 검색..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // 검색 조건이 바뀌면 현재 페이지가 비는 경우가 많아 항상 첫 페이지부터 다시 보여줍니다.
                  setCurrentPage(1); // Reset to page 1 on search
                }}
                className="bg-white border border-slate-300 text-black pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64 shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1 flex flex-col shadow-sm">
          <div className="overflow-auto flex-1">
            <table className="w-full table-fixed text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-200">
                  <th className="w-[15%] px-3 py-3 text-[12px] text-black uppercase whitespace-nowrap">이름</th>
                  <th className="w-[13%] px-3 py-3 text-[12px] text-black uppercase whitespace-nowrap">전화번호</th>
                  <th className="w-[12%] px-3 py-3 text-[12px] text-black uppercase whitespace-nowrap">소속</th>
                  <th className="w-[10%] px-3 py-3 text-[12px] text-black uppercase whitespace-nowrap">담당자</th>
                  <th className="w-[12%] px-3 py-3 text-[12px] text-black uppercase whitespace-nowrap">상태</th>
                  <th className="w-[8%] px-2.5 py-3 text-[12px] text-black uppercase whitespace-nowrap">심박</th>
                  <th className="w-[8%] px-2.5 py-3 text-[12px] text-black uppercase whitespace-nowrap">응급</th>
                  <th className="w-[7%] px-2.5 py-3 text-[12px] text-black uppercase whitespace-nowrap">체온</th>
                  <th className="w-[7%] px-2.5 py-3 text-[12px] text-black uppercase whitespace-nowrap">SpO2</th>
                  <th className="w-[8%] px-2.5 py-3 text-[12px] text-black uppercase whitespace-nowrap">스트/낙상</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      데이터를 불러오는 중입니다...
                    </td>
                  </tr>
                ) : currentMembers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  currentMembers.map((member) => (
                  <tr 
                    key={member.id} 
                    onClick={() => handleRowClick(member)}
                    className={`cursor-pointer transition-colors group ${
                      // 좌측 목록 선택 강조와 우측 상세 패널 대상이 항상 같도록 같은 id 기준으로 하이라이트합니다.
                      selectedMember?.id === member.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm text-black ${
                          selectedMember?.id === member.id ? 'bg-blue-200' : 'bg-slate-100'
                        }`}>
                          {member.name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="min-w-0 whitespace-nowrap text-[14px] text-black truncate">
                            {member.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[12px] text-slate-700">
                      {formatPhoneNumber(member.phone || '') || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[12px] text-slate-600">
                      <span className="block truncate">{getAffiliationAreaLabel(member.affiliation)}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[12px] text-slate-600">
                      <span className="block truncate">{member.affiliation.welfareName || '-'}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {(() => {
                        if (member.accountStatus === 'pending') {
                          return <span className={`${MEMBER_STATUS_BADGE_CLASS} ${getMemberStatusBadgeClass(member)}`}>승인 대기</span>;
                        }
                        if (member.accountStatus === 'rejected') {
                          return <span className={`${MEMBER_STATUS_BADGE_CLASS} ${getMemberStatusBadgeClass(member)}`}>반려</span>;
                        }
                        // 계정 정지/해지는 운영 상태 배지보다 우선 노출해 관리자에게 차단 상태를 먼저 보여줍니다.
                        if (member.accountStatus === 'suspended') {
                          return <span className={`${MEMBER_STATUS_BADGE_CLASS} ${getMemberStatusBadgeClass(member)}`}>이용 정지</span>;
                        }
                        if (member.accountStatus === 'withdrawn') {
                          return <span className={`${MEMBER_STATUS_BADGE_CLASS} ${getMemberStatusBadgeClass(member)}`}>해지</span>;
                        }
                        return (
                          <span className={`${MEMBER_STATUS_BADGE_CLASS} ${getMemberStatusBadgeClass(member)}`}>
                            {member.status}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-2.5 py-3 whitespace-nowrap">
                       <span className={`text-[13px] whitespace-nowrap ${getHeartRateClass(member.biometrics.heartRate)}`}>
                         {member.biometrics.heartRate > 0 ? `${member.biometrics.heartRate}bpm` : '-'}
                       </span>
                    </td>
                    <td className="px-2.5 py-3 whitespace-nowrap">
                       <span className={`text-[13px] whitespace-nowrap ${getEmergencyScoreClass(member.biometrics.emergencyScore)}`}>
                         {member.biometrics.emergencyScore}/100
                       </span>
                    </td>
                    <td className="px-2.5 py-3 whitespace-nowrap">
                       <span className={`text-[13px] whitespace-nowrap ${getTempClass(member.biometrics.temperature)}`}>
                         {member.biometrics.temperature}°
                       </span>
                    </td>
                    <td className="px-2.5 py-3 whitespace-nowrap">
                       <span className={`text-[13px] whitespace-nowrap ${getSpo2Class(member.biometrics.bloodOxygen)}`}>
                         {member.biometrics.bloodOxygen}%
                       </span>
                    </td>
                    <td className="px-2.5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className={`text-[13px] ${getStressClass(member.biometrics.stress)}`}>
                          {member.biometrics.stress}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className={`text-[13px] ${getFallScoreClass(member.biometrics.fallScore)}`}>
                          {member.biometrics.fallScore}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
             <div className="text-[13px] text-slate-500 font-light">
               총 <span className="text-black font-normal">{filteredMembers.length}</span>명 중 <span className="text-black font-normal">{filteredMembers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> - <span className="text-black font-normal">{Math.min(currentPage * itemsPerPage, filteredMembers.length)}</span>명 표시
             </div>
             <div className="flex items-center gap-1">
               <button 
                 onClick={() => handlePageChange(currentPage - 1)}
                 disabled={currentPage === 1}
                 className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
               >
                 <ChevronLeft size={14} />
               </button>
              {/* 페이지 버튼은 현재 검색 결과 길이만 기준으로 다시 계산해 필터 후에도 목록 범위를 맞춥니다. */}
               {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                 <button
                   key={page}
                   onClick={() => handlePageChange(page)}
                   className={`w-8 h-8 flex items-center justify-center rounded border text-[13px] transition-colors ${
                     currentPage === page 
                       ? 'bg-blue-600 border-blue-600 text-white' 
                       : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                   }`}
                 >
                   {page}
                 </button>
               ))}
               <button 
                 onClick={() => handlePageChange(currentPage + 1)}
                 disabled={currentPage === totalPages || totalPages === 0}
                 className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
               >
                 <ChevronRight size={14} />
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* Right Detail Panel */}
      {selectedMember && (
        <div className="z-20 flex h-full min-h-0 w-[580px] flex-col border-l border-slate-200 bg-white shadow-xl animate-slide-in-right">
          <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-20">
            <div>
              <h3 className="text-[21px] text-black flex items-center gap-2">
                {selectedMember.name}
              </h3>
              <p className="text-black text-[15px] mt-1">{selectedMember.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteMember}
                disabled={deletingMemberId === selectedMember.id}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[14px] text-rose-600 hover:bg-rose-100 disabled:opacity-50"
              >
                <Trash2 size={16} />
                삭제
              </button>
              <button 
                onClick={() => setSelectedMember(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-black hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
             <button 
               onClick={() => setActiveTab('realtime')}
               className={`flex-1 py-3 text-[15px] transition-colors ${activeTab === 'realtime' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-black hover:text-slate-700'}`}
             >
               실시간 정보
             </button>
             <button 
               onClick={() => setActiveTab('stats')}
               className={`flex-1 py-3 text-[15px] transition-colors ${activeTab === 'stats' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-black hover:text-slate-700'}`}
             >
               AI 통계
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {/* 우측 패널은 실시간 상세를 기본 탭으로 열고, 통계가 있을 때만 AI 요약 차트 뷰로 전환합니다. */}
            {activeTab === 'realtime' ? (
              <div className="space-y-6">
                
                {/* 1. Biometrics (Moved to Top) */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[15px] text-black uppercase tracking-wider">실시간 생체 데이터</h4>
                    <span className="text-[13px] text-green-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      수신 중
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedBiometricCards.map((card) => (
                      <BiometricCard
                        key={card.key}
                        label={card.label}
                        value={card.value}
                        unit={card.unit}
                        icon={card.icon}
                        color={card.color}
                        isExpanded={expandedBiometricKey === card.key}
                        onToggle={() => setExpandedBiometricKey((prev) => (prev === card.key ? null : card.key))}
                      />
                    ))}
                  </div>
                  <div className={`grid transition-all duration-300 ease-out ${expandedBiometricCard && expandedBiometricDetail ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                    <div className="overflow-hidden">
                      {expandedBiometricCard && expandedBiometricDetail && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <div className={`rounded-lg p-2 ${expandedBiometricCard.color}`}>
                                <expandedBiometricCard.icon size={16} />
                              </div>
                              <div>
                                <p className="text-[15px] text-black">{expandedBiometricCard.label} 상세</p>
                                <p className="text-[12px] text-slate-500">카드 아래 전체 폭으로 지난 데이터와 해석을 표시합니다.</p>
                              </div>
                            </div>
                            {expandedBiometricDetail.chartUnit && <span className="text-[12px] text-slate-500">{expandedBiometricDetail.chartUnit}</span>}
                          </div>
                          <div className="mt-4 grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-4">
                            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[12px] text-black">지난 데이터 그래프</span>
                                {expandedBiometricDetail.chartUnit && <span className="text-[12px] text-slate-500">{expandedBiometricDetail.chartUnit}</span>}
                              </div>
                              <div className="h-44">
                                {isBiometricChartReady ? (
                                  <ResponsiveContainer key={expandedBiometricCard.key} width="100%" height="100%">
                                    <LineChart data={expandedBiometricDetail.chartData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                                      <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                                      <RechartsTooltip />
                                      <Line type="monotone" dataKey="value" stroke={expandedBiometricDetail.chartColor} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-[12px] text-slate-500">
                                    그래프 준비 중...
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="rounded-lg bg-white border border-slate-200 p-3">
                                <p className="text-[12px] text-black mb-2">최근 히스토리</p>
                                <div className="space-y-2">
                                  {expandedBiometricDetail.history.map((item) => (
                                    <div key={`${expandedBiometricCard.key}-${item.time}`} className="flex items-start justify-between gap-3 rounded-md bg-slate-50 px-2.5 py-2">
                                      <div className="min-w-0">
                                        <p className="text-[12px] text-slate-500">{item.time}</p>
                                        <p className="text-[13px] text-black mt-0.5">{item.note}</p>
                                      </div>
                                      <span className="shrink-0 text-[13px] text-black">{item.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                                <p className="text-[12px] text-blue-700">상세 해석</p>
                                <p className="text-[13px] text-slate-700 mt-1">{expandedBiometricDetail.insight}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Connected Device Card */}
                <div
                  className={`relative overflow-hidden rounded-xl border ${
                    selectedMember.connectedDevice
                      ? 'border-slate-200 bg-slate-50 p-5'
                      : 'border-dashed border-slate-200 bg-white p-3'
                  }`}
                >
                   {selectedMember.connectedDevice ? (
                     <>
                       <div className="absolute right-0 top-0 p-4 opacity-5">
                          <Watch size={120} />
                       </div>
                       <div className="relative z-10">
                         <div className="flex justify-between items-start mb-2">
                           <div>
                             <h4 className="text-[13px] text-blue-600 uppercase tracking-wider mb-2">Connected Device</h4>
                             <h3 className="text-[19px] text-black mb-1">{selectedMember.connectedDevice.modelName}</h3>
                             <p className="text-[13px] text-black mb-4">Serial: {selectedMember.connectedDevice.serialNumber}</p>
                           </div>
                           <button 
                              onClick={handleDisconnectDevice}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-[13px] hover:bg-red-50 transition-colors shadow-sm z-20"
                            >
                              <Unlink size={14} />
                              <span className="font-light">연동 해제</span>
                           </button>
                         </div>
                         
                         <div className="flex gap-4">
                           <div className="bg-white/60 p-2 rounded-lg backdrop-blur-sm border border-slate-100">
                              <p className="text-[11px] text-black mb-0.5">Last Sync</p>
                              <p className="text-[13px] text-black">{selectedMember.connectedDevice.lastSyncTime}</p>
                           </div>
                           <div className="bg-white/60 p-2 rounded-lg backdrop-blur-sm border border-slate-100">
                              <p className="text-[11px] text-black mb-0.5">Signal</p>
                              <p className="text-[13px] text-green-600 flex items-center gap-1">
                                <Wifi size={10} /> {selectedMember.connectedDevice.signalQuality}
                              </p>
                           </div>
                           <div className="bg-white/60 p-2 rounded-lg backdrop-blur-sm border border-slate-100">
                              <p className="text-[11px] text-black mb-0.5">Battery</p>
                              <p className="text-[13px] text-black flex items-center gap-1">
                                <Battery size={10} /> {selectedMember.connectedDevice.batteryEfficiency}
                              </p>
                           </div>
                         </div>
                       </div>
                     </>
                   ) : (
                    // 빈 상태 카드는 안내형 패널처럼 간결하게 보여줍니다.
                    <div className="flex min-h-[88px] flex-col items-center justify-center py-2 text-slate-400">
                       <Watch size={30} className="mb-1.5 opacity-20" />
                        <p className="text-[14px] text-slate-500 font-light">연동된 기기가 없습니다.</p>
                       <button className="mt-1.5 flex items-center gap-1 text-[13px] text-blue-600 hover:underline font-light">
                          <Link size={14} /> 새 기기 등록
                        </button>
                     </div>
                   )}
                </div>

                {/* 3. Basic Info & App Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    {/* Editable Personal Info */}
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative">
                       <div className="flex justify-between items-start mb-3">
                         <h4 className="text-[13px] text-black uppercase tracking-wider flex items-center gap-1">
                           <User size={14} /> 신상 정보
                         </h4>
                         <button onClick={handlePersonalInfoSave} className={memberSectionSaveButtonClass}>
                           <Save size={14} />
                           저장
                         </button>
                       </div>
                       <div className="space-y-2">
                           <div>
                              <label className="text-[11px] text-black">이메일</label>
                              <input 
                                type="text" 
                                value={editForm.email} 
                                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                className={memberDetailFieldClass}
                              />
                           </div>
                           <div>
                              <label className="text-[11px] text-black">생년월일</label>
                              <input 
                                type="text" 
                                value={editForm.birthDate} 
                                onChange={(e) => setEditForm({...editForm, birthDate: e.target.value})}
                                className={memberDetailFieldClass}
                              />
                           </div>
                           <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-[11px] text-black">성별</label>
                                <select
                                  value={editForm.gender || '남'}
                                  onChange={(e) => setEditForm({...editForm, gender: e.target.value as Member['gender']})}
                                  className={memberDetailFieldClass}
                                >
                                  <option value="남">남</option>
                                  <option value="여">여</option>
                                </select>
                             </div>
                             <div className="flex-1">
                                 <label className="text-[11px] text-black">신장 (cm)</label>
                                 <input 
                                   type="number" 
                                   value={editForm.height} 
                                   onChange={(e) => setEditForm({...editForm, height: Number(e.target.value)})}
                                   className={memberDetailFieldClass}
                                 />
                              </div>
                           </div>
                           <div className="flex gap-2">
                             <div className="flex-1">
                                 <label className="text-[11px] text-black">체중 (kg)</label>
                                 <input 
                                   type="number" 
                                   value={editForm.weight} 
                                   onChange={(e) => setEditForm({...editForm, weight: Number(e.target.value)})}
                                   className={memberDetailFieldClass}
                                 />
                              </div>
                           </div>
                           <div>
                              <label className="text-[11px] text-black">혈액형</label>
                              <input 
                                type="text" 
                                value={editForm.bloodType} 
                                onChange={(e) => setEditForm({...editForm, bloodType: e.target.value})}
                                className={memberDetailFieldClass}
                              />
                           </div>
                           <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                             <p className="mb-2 text-[12px] text-black">지역 소속</p>
                             <RegionSelectGroup
                               value={{
                                 city: editAffiliation.city || '',
                                 district: editAffiliation.district || '',
                                 dong: editAffiliation.dong || '',
                               }}
                               onChange={handleEditRegionChange}
                               accentBorderClass="focus:border-blue-500"
                             />
                           </div>
                           <div>
                             <label className="text-[11px] text-black">담당 복지사</label>
                            <select
                               value={editAffiliation.welfareName || ''}
                               onChange={(e) =>
                                 setEditForm({
                                   ...editForm,
                                   affiliation: {
                                     city: editAffiliation.city || '',
                                     district: editAffiliation.district || '',
                                     dong: editAffiliation.dong || '',
                                     welfareName: e.target.value,
                                   },
                                 })
                               }
                              className={memberDetailFieldClass}
                             >
                               <option value="">담당 복지사 선택</option>
                               {editWelfareOptions.map((staff) => (
                                 <option key={staff.id} value={staff.name}>
                                   {staff.name} · {getAffiliationFullLabel(staff.affiliation)}
                                 </option>
                               ))}
                             </select>
                           </div>
                         </div>
                    </div>

                    {/* Editable Account Status */}
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative">
                       <div className="flex justify-between items-start mb-3">
                         <h4 className="text-[13px] text-black uppercase tracking-wider flex items-center gap-1">
                           <Shield size={14} /> 계정 상태
                         </h4>
                         {selectedMember.accountStatus === 'pending' ? null : (
                           <button onClick={handleAccountStatusSave} className={memberSectionSaveButtonClass}>
                             <Save size={14} />
                             저장
                           </button>
                         )}
                       </div>
                       
                       {selectedMember.accountStatus === 'pending' ? (
                         <div className="space-y-3">
                           <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
                             <div>
                               <p className="text-[13px] text-black">현재 상태</p>
                               <p className="mt-1 text-[12px] text-slate-500">회원 정보와 보호자 정보를 검토한 뒤 여기서 바로 처리합니다.</p>
                             </div>
                             <span className="px-2.5 py-1 rounded-full text-[12px] border bg-blue-600 text-white border-blue-700 whitespace-nowrap">
                               승인 대기
                             </span>
                           </div>
                           <div className="flex items-center gap-3">
                             <button
                               onClick={() => handlePendingMemberApproval('active')}
                               disabled={approvalProcessing}
                               className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                             >
                               <CheckCircle2 size={16} />
                               승인
                             </button>
                             <button
                               onClick={() => handlePendingMemberApproval('rejected')}
                               disabled={approvalProcessing}
                               className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                             >
                               <AlertCircle size={16} />
                               반려
                             </button>
                           </div>
                         </div>
                       ) : (
                         <div className="space-y-2">
                           <div>
                              <select
                                value={editForm.accountStatus || 'active'}
                                onChange={(e) => setEditForm({...editForm, accountStatus: e.target.value as any})}
                                className={memberDetailFieldClass}
                              >
                                <option value="pending">승인 대기 (Pending)</option>
                                <option value="active">이용 중 (Active)</option>
                                <option value="suspended">이용 정지 (Suspended)</option>
                                <option value="rejected">반려 (Rejected)</option>
                                <option value="withdrawn">해지 (Withdrawn)</option>
                              </select>
                           </div>
                         </div>
                       )}
                    </div>

                    {/* Editable Password */}
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative">
                       <div className="flex justify-between items-start mb-3">
                         <h4 className="text-[13px] text-black uppercase tracking-wider flex items-center gap-1">
                           <Lock size={14} /> 비밀번호
                         </h4>
                         <button onClick={handlePasswordSave} disabled={!newPassword} className={memberSectionSaveButtonClass}>
                           <Save size={14} />
                           저장
                         </button>
                       </div>
                       <div className="space-y-2">
                           <div>
                              <input 
                                type="password" 
                                placeholder="새 비밀번호 입력"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={memberDetailFieldClass}
                              />
                           </div>
                         </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm h-fit">
                      <div className="mb-3 flex items-start justify-between">
                        <h4 className="text-[13px] text-black uppercase tracking-wider flex items-center gap-1">
                          <Users size={14} /> 보호자 정보
                        </h4>
                        <button onClick={handleGuardianInfoSave} className={memberSectionSaveButtonClass}>
                          <Save size={14} />
                          저장
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] text-black">보호자 이름</label>
                          <input
                            type="text"
                            value={editForm.guardian?.name || ''}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              guardian: {
                                name: e.target.value,
                                phone: editForm.guardian?.phone || '',
                                relationship: editForm.guardian?.relationship || '',
                              },
                            })}
                            className={memberDetailFieldClass}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-black">보호자 연락처</label>
                          <input
                            type="text"
                            value={editForm.guardian?.phone || ''}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              guardian: {
                                name: editForm.guardian?.name || '',
                                phone: formatPhoneNumber(e.target.value),
                                relationship: editForm.guardian?.relationship || '',
                              },
                            })}
                            className={memberDetailFieldClass}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-black">관계</label>
                          <input
                            type="text"
                            value={editForm.guardian?.relationship || ''}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              guardian: {
                                name: editForm.guardian?.name || '',
                                phone: editForm.guardian?.phone || '',
                                relationship: e.target.value,
                              },
                            })}
                            className={memberDetailFieldClass}
                          />
                        </div>
                        <button
                          onClick={handleIssueGuardianAccessCode}
                          className="mt-3 inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] text-blue-700 hover:bg-blue-100"
                        >
                          인증코드 발급
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm h-fit">
                       <h4 className="text-[13px] text-black uppercase tracking-wider mb-3 flex items-center gap-1">
                         <Shield size={14} /> 앱 설정 상태
                       </h4>
                       <div className="space-y-0.5">
                         <ToggleStatus 
                           label="자동 리포트" 
                           checked={selectedMember.appSettings.autoReportEnabled} 
                           onToggle={() => handleSettingToggle('autoReportEnabled')}
                         />
                         <ToggleStatus 
                           label="위치 수집" 
                           checked={selectedMember.appSettings.locationCollectionEnabled} 
                           onToggle={() => handleSettingToggle('locationCollectionEnabled')}
                         />
                         <ToggleStatus 
                           label="건강 분석" 
                           checked={selectedMember.appSettings.healthAnalysisEnabled} 
                           onToggle={() => handleSettingToggle('healthAnalysisEnabled')}
                         />
                         <div className="flex justify-between items-center py-2">
                           <span className="text-[15px] text-black">전송 주기</span>
                           <span className="text-[13px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{selectedMember.appSettings.transmissionInterval}</span>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* 4. Medical Info */}
                <div>
                  <div className="mb-3 flex items-end justify-between">
                    <h4 className="text-[15px] text-black uppercase tracking-wider">건강 메모</h4>
                    <button onClick={handleHealthSave} className={memberSectionSaveButtonClass}>
                      <Save size={14} />
                      저장
                    </button>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                     <div>
                        <label className="text-[13px] text-black block mb-1">기저 질환 (쉼표로 구분)</label>
                        <textarea 
                          value={editForm.medicalConditions?.join(', ')} 
                          onChange={(e) => setEditForm({...editForm, medicalConditions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)})}
                          className="h-20 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] text-black outline-none focus:border-blue-500"
                        />
                     </div>
                     <div>
                        <label className="text-[13px] text-black block mb-1">복용 중인 약물</label>
                        <input 
                          type="text"
                          value={editForm.medications} 
                          onChange={(e) => setEditForm({...editForm, medications: e.target.value})}
                          className={memberDetailFieldClass}
                        />
                     </div>
                     <div>
                        <label className="text-[13px] text-black block mb-1">알레르기</label>
                        <input 
                          type="text"
                          value={editForm.allergies} 
                          onChange={(e) => setEditForm({...editForm, allergies: e.target.value})}
                          className={memberDetailFieldClass}
                        />
                     </div>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                   <div className="flex justify-between items-center mb-3">
                     <h4 className="text-[15px] text-black flex items-center gap-2">
                       <Zap size={16} className="text-yellow-500" />
                       AI 건강 리포트
                     </h4>
                     {!riskAnalysis && (
                       <button 
                         onClick={(e) => handleAnalyze(e, selectedMember)}
                         disabled={isAnalyzing}
                         className="text-[13px] bg-white border border-slate-200 px-3 py-1 rounded-md text-black hover:bg-slate-50 disabled:opacity-50"
                       >
                         {isAnalyzing ? '분석 중...' : '지금 분석하기'}
                       </button>
                     )}
                   </div>
                   {riskAnalysis ? (
                     <div className="text-[15px] text-black leading-relaxed prose prose-slate max-w-none">
                       {/* 마크다운 응답을 그대로 렌더링해 서버 리포트의 문단/목록 구조를 유지합니다. */}
                       <ReactMarkdown>{riskAnalysis}</ReactMarkdown>
                     </div>
                   ) : (
                     <p className="text-[13px] text-black text-center py-4">
                       '지금 분석하기'를 눌러 전체 데이터를 기반으로 한 AI 분석을 받아보세요.
                     </p>
                   )}
                </div>
              </div>
            ) : selectedMember.healthStats ? (
              <div className="space-y-6">
                
                {/* 1. LLM Real-time Metrics */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                       <h3 className="text-[18px] text-black">LLM 분석 지표</h3>
                       <p className="text-[12px] text-black">관제 생체데이터 기반 실시간 해석</p>
                    </div>
                    <div className="bg-blue-50 px-3 py-1 rounded-lg">
                       <span className="text-[12px] text-blue-600">현재 심박수 {selectedMember.biometrics.heartRate} BPM</span>
                    </div>
                  </div>

                  {/* Heart Rate Chart */}
                  <div className="h-48 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedMember.healthStats.heartRateHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#000000'}} axisLine={false} tickLine={false} />
                        <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          itemStyle={{ color: '#ef4444' }}
                        />
                        <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill:'#ef4444'}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Metric Cards Grid */}
                  <div className="grid grid-cols-2 gap-3">
                     <StatCard title="응급 지수" value={`${selectedMember.biometrics.emergencyScore}/100`} icon={AlertCircle} colorClass="bg-rose-500" subValue={getEmergencyScoreStatus(selectedMember.biometrics.emergencyScore)} />
                     <StatCard title="낙상 지수" value={`${selectedMember.biometrics.fallScore}/100`} icon={Move} colorClass="bg-amber-500" subValue={getFallScoreStatus(selectedMember.biometrics.fallScore)} />
                     <StatCard title="현재 SPO2" value={`${selectedMember.biometrics.bloodOxygen}%`} icon={Wind} colorClass="bg-blue-500" subValue={`최저 ${selectedMember.healthStats.minSPO2}%`} />
                     <StatCard title="현재 체온" value={`${selectedMember.biometrics.temperature}°C`} icon={Thermometer} colorClass="bg-orange-500" subValue={`발열 ${selectedMember.healthStats.feverCount}회`} />
                     {/* Health Score Card */}
                     <div className="col-span-2 bg-indigo-600 rounded-xl p-4 text-white shadow-md flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                           <TrendingUp size={18} className="text-indigo-200" />
                           <span className="text-[12px] text-indigo-200">건강 점수</span>
                        </div>
                        <div>
                           <span className="text-[30px]">{selectedMember.healthStats.healthScore}</span>
                           <span className="text-[14px] text-indigo-200 ml-1">점</span>
                        </div>
                     </div>
                  </div>
                </div>

                {/* 2. Current Control State */}
                <div className="grid grid-cols-1 gap-4">
                   <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                         <h4 className="text-[14px] text-black flex items-center gap-2">
                            <Move size={16} className="text-green-500" /> 관제 활동 및 상태
                         </h4>
                         <span className="text-[12px] text-green-600">현재 걸음수 {selectedMember.biometrics.steps.toLocaleString()}보</span>
                      </div>
                      <div className="h-32 w-full mb-4">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={selectedMember.healthStats.stepsHistory}>
                               <XAxis dataKey="name" tick={{fontSize: 10, fill: '#000000'}} axisLine={false} tickLine={false} />
                               <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px'}} />
                               <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                         <div className="bg-slate-50 p-2 rounded-lg text-center">
                            <p className="text-[12px] text-black">스트레스 지수</p>
                            <p className="text-[14px] text-black">{selectedMember.biometrics.stress}/100</p>
                            <span className="text-[10px] text-blue-500">평균 {selectedMember.healthStats.averageStress}</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded-lg text-center">
                            <p className="text-[12px] text-black">워치 배터리</p>
                            <p className="text-[14px] text-black">{selectedMember.deviceBattery}%</p>
                            <span className="text-[10px] text-green-500">수집 상태 확인</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded-lg text-center">
                            <p className="text-[12px] text-black">활동 목표</p>
                            <p className="text-[14px] text-black">{selectedMember.healthStats.stepGoalAchievement}%</p>
                            <span className="text-[10px] text-orange-500">달성률</span>
                         </div>
                      </div>
                   </div>
                </div>

                {/* 3. Incident History Summary */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                   <h4 className="text-[14px] text-black mb-4 flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-500" /> 응급 상황 이력 (최근 30일)
                   </h4>
                   <div className="flex items-end gap-2 mb-4">
                      <span className="text-[36px] text-black">{selectedMember.healthStats.incidentSummary.total}</span>
                      <span className="text-[14px] text-black mb-1.5">회 발생</span>
                   </div>
                   
                   <div className="space-y-3">
                      <div className="flex items-center justify-between text-[14px]">
                         <span className="text-black">낙상 감지</span>
                         <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400" style={{width: `${(selectedMember.healthStats.incidentSummary.fall / 5) * 100}%`}}></div>
                         </div>
                         <span className="text-black">{selectedMember.healthStats.incidentSummary.fall}</span>
                      </div>
                      <div className="flex items-center justify-between text-[14px]">
                         <span className="text-black">심박 이상</span>
                         <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400" style={{width: `${(selectedMember.healthStats.incidentSummary.arrhythmia / 5) * 100}%`}}></div>
                         </div>
                         <span className="text-black">{selectedMember.healthStats.incidentSummary.arrhythmia}</span>
                      </div>
                      <div className="flex items-center justify-between text-[14px]">
                         <span className="text-black">산소 저하</span>
                         <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400" style={{width: `${(selectedMember.healthStats.incidentSummary.lowOxygen / 5) * 100}%`}}></div>
                         </div>
                         <span className="text-black">{selectedMember.healthStats.incidentSummary.lowOxygen}</span>
                      </div>
                   </div>
                   <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                      <span className="text-[12px] text-black">평균 응답 시간</span>
                      <span className="text-[12px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{selectedMember.healthStats.incidentSummary.avgResponseTime}</span>
                   </div>
                </div>

                {/* 4. LLM Summary */}
                <div className="bg-slate-900 rounded-xl p-5 shadow-lg text-white">
                   <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                         <div className="p-1.5 bg-yellow-500/20 rounded-lg">
                            <Sparkles size={16} className="text-yellow-400" />
                         </div>
                         <div>
                            <h4 className="text-[14px]">LLM 실시간 해석</h4>
                            <p className="text-[12px] text-slate-400">최신 실제 LLM 분석 결과 기준</p>
                         </div>
                      </div>
                      {selectedMember.healthStats.llmAnalyzedAt ? (
                        <span className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                          {selectedMember.healthStats.llmAnalyzedAt}
                        </span>
                      ) : null}
                   </div>
                   <p className="text-[14px] text-slate-300 leading-relaxed whitespace-pre-line">
                      {selectedMember.healthStats.llmRealtimeInterpretation}
                   </p>
                   {selectedMember.healthStats.llmModel ? (
                     <div className="mt-3 text-[12px] text-slate-400">
                       모델: {selectedMember.healthStats.llmModel}
                     </div>
                   ) : null}
                </div>

              </div>
            ) : (
              // 통계 탭은 healthStats가 없는 회원이면 빈 차트 대신 명시적 안내문으로 마무리합니다.
              <div className="flex flex-col items-center justify-center h-40 text-black">
                <p>해당 회원의 건강 통계 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-6">
          <div className="absolute inset-0" onClick={() => setIsCreateOpen(false)}></div>
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[22px] text-black">회원 등록</h3>
                  <p className="text-[14px] text-slate-500 mt-1">어드민에서 회원과 보호자 정보를 직접 등록합니다.</p>
                </div>
                <button onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50">
                  닫기
                </button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-[15px] text-black mb-3">회원 기본 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[13px] text-slate-500">이름</span>
                    <input value={createForm.name} onChange={(e) => handleCreateFormChange('name', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500" />
                  </label>
                  <label className="block">
                    <span className="text-[13px] text-slate-500">연락처</span>
                    <input value={createForm.phone} onChange={(e) => handleCreateFormChange('phone', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-[13px] text-slate-500">이메일</span>
                    <input value={createForm.email} onChange={(e) => handleCreateFormChange('email', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-[13px] text-slate-500">비밀번호</span>
                    <input type="password" value={createForm.password} onChange={(e) => handleCreateFormChange('password', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500" />
                  </label>
                  <label className="block">
                    <span className="text-[13px] text-slate-500">생년월일</span>
                    <input type="date" value={createForm.birthDate} onChange={(e) => handleCreateFormChange('birthDate', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500" />
                  </label>
                  <label className="block">
                    <span className="text-[13px] text-slate-500">나이</span>
                    <input type="number" value={createForm.age} onChange={(e) => handleCreateFormChange('age', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500" />
                  </label>
                  <label className="block">
                    <span className="text-[13px] text-slate-500">성별</span>
                    <select value={createForm.gender} onChange={(e) => handleCreateFormChange('gender', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500 bg-white">
                      <option value="남">남</option>
                      <option value="여">여</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[13px] text-slate-500">키(cm)</span>
                    <input type="number" value={createForm.height} onChange={(e) => handleCreateFormChange('height', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500" />
                  </label>
                  <label className="block">
                    <span className="text-[13px] text-slate-500">몸무게(kg)</span>
                    <input type="number" value={createForm.weight} onChange={(e) => handleCreateFormChange('weight', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500" />
                  </label>
                  <label className="block">
                    <span className="text-[13px] text-slate-500">혈액형</span>
                    <select value={createForm.bloodType} onChange={(e) => handleCreateFormChange('bloodType', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500 bg-white">
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-[15px] text-black mb-3">지역 및 담당 복지사</h4>
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <RegionSelectGroup
                      value={{
                        city: createForm.city,
                        district: createForm.district,
                        dong: createForm.dong,
                      }}
                      onChange={handleCreateRegionChange}
                      accentBorderClass="focus:border-blue-500"
                    />
                  </div>
                  <label className="block">
                    <span className="text-[13px] text-slate-500">담당 복지사</span>
                    <select
                      value={createForm.welfareName}
                      onChange={(e) => handleCreateFormChange('welfareName', e.target.value)}
                      disabled={!isCreateRegionSelected || createWelfareOptions.length === 0}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="">
                        {!isCreateRegionSelected
                          ? '먼저 시/도, 시/군/구, 읍/면/동을 선택하세요'
                          : createWelfareOptions.length === 0
                            ? '해당 지역에 등록된 복지사가 없습니다'
                            : '담당 복지사 선택'}
                      </option>
                      {createWelfareOptions.map((staff) => (
                        <option key={staff.id} value={staff.name}>
                          {staff.name} · {getAffiliationFullLabel(staff.affiliation)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-[15px] text-black mb-3">보호자 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[13px] text-slate-500">보호자 이름</span>
                    <input value={createForm.guardianName} onChange={(e) => handleCreateFormChange('guardianName', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500" />
                  </label>
                  <label className="block">
                    <span className="text-[13px] text-slate-500">보호자 연락처</span>
                    <input value={createForm.guardianPhone} onChange={(e) => handleCreateFormChange('guardianPhone', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-[13px] text-slate-500">관계</span>
                    <input value={createForm.guardianRelationship} onChange={(e) => handleCreateFormChange('guardianRelationship', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-blue-500" />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50">
                취소
              </button>
              <button onClick={handleCreateMember} disabled={createProcessing} className="rounded-lg bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 disabled:opacity-50">
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
