import React, { useState, useEffect, useRef, memo } from 'react';
import { 
  Heart, Activity, Thermometer, Wind, Footprints, 
  Moon, Droplets, Brain, Zap, ShieldAlert, Sparkles, X, ChevronRight,
  Home, BarChart2, FileText, User, LogIn, Bluetooth, Search, CheckCircle2,
  TrendingUp, Calendar, ArrowRight, LogOut, Siren, Lock, Mail, Clock, MessageSquare,
  ArrowLeft, Battery, Pill, Stethoscope, Phone, AlertOctagon, Settings, ToggleLeft, ToggleRight,
  RefreshCw, UserPlus, AlertCircle, Signal, Camera, Watch, Info, PhoneCall, MapPin, Ambulance, HelpCircle, Code2, ShieldCheck, ScrollText,
  Eye, EyeOff
} from 'lucide-react';
import { BiometricData, MetricConfig, HistoryPoint } from './types';
import { MetricCard, MetricStatus } from './components/MetricCard';
import { LiveChart } from './components/LiveChart';
import { llmService } from './services/llmService';
import { StatsScreen } from './components/StatsScreen';
import { Geolocation } from '@capacitor/geolocation';
import SimpleDatePicker from './components/SimpleDatePicker';
import NumberPicker from './components/NumberPicker';
import { starmaxService, StarmaxDevice } from './services/starmaxService';
import { backendService } from './services/backendService';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import jsQR from 'jsqr';

// --- Constants & Config ---
const METRICS: MetricConfig[] = [
  { id: 'heartRate', label: '심박수', unit: 'BPM', icon: Heart, color: '#ef4444', minSafe: 50, maxSafe: 120 },
  { id: 'bloodPressure', label: '혈압', unit: 'mmHg', icon: Activity, color: '#3b82f6', minSafe: 90, maxSafe: 140 },
  { id: 'spO2', label: '산소포화도', unit: '%', icon: Droplets, color: '#10b981', minSafe: 95, maxSafe: 100 },
  { id: 'temperature', label: '체온', unit: '°C', icon: Thermometer, color: '#f59e0b', minSafe: 36, maxSafe: 37.5 },
  { id: 'glucose', label: '혈당', unit: 'mg/dL', icon: Zap, color: '#8b5cf6', minSafe: 70, maxSafe: 140 },
  { id: 'steps', label: '걸음수', unit: '보', icon: Footprints, color: '#6366f1', minSafe: 0, maxSafe: 20000 },
  { id: 'sleep', label: '수면', unit: '시간', icon: Moon, color: '#4b5563', minSafe: 6, maxSafe: 12 },
  { id: 'stress', label: '스트레스', unit: '점', icon: Brain, color: '#ec4899', minSafe: 0, maxSafe: 70 },
  { id: 'respiratoryRate', label: '호흡수', unit: '회/분', icon: Wind, color: '#14b8a6', minSafe: 12, maxSafe: 20 },
  { id: 'hrv', label: '심박변이도', unit: 'ms', icon: Activity, color: '#f43f5e', minSafe: 20, maxSafe: 200 },
];

const INITIAL_DATA: BiometricData = {
  heartRate: 0,
  bloodPressureSys: 0,
  bloodPressureDia: 0,
  spO2: 0,
  temperature: 0,
  glucose: 0,
  steps: 0,
  sleep: 0,
  stress: 0,
  respiratoryRate: 0,
  hrv: 0,
  timestamp: Date.now()
};

// --- Types for Profile ---
interface UserProfile {
  name: string;
  phone: string;
  email: string;
  dob: string;
  age: number;
  height: number;
  weight: number;
  gender: string;
  bloodType: string;
  medications: string;
  allergies: string;
  diseases: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  accountStatus: '활성' | '비활성' | '입원중' | '정지';
}

interface DeviceSettings {
  consentAutoReport: boolean;
  consentPrivacy: boolean;
  consentLocation: boolean;
  consentAlgorithm: boolean;
  deviceId: string;
  deviceName: string;
  lastSync: number;
  initialSyncComplete: boolean;
  realtimeCollectionInterval: number;
  generalCollectionInterval: number;
  modelNumber?: string;
  manufacturer?: string;
  firmwareVersion?: string;
  batteryLevel?: number;
}

const INITIAL_PROFILE: UserProfile = {
  name: '김진',
  phone: '010-1234-5678',
  email: 'kimjin20252025@gmail.com',
  dob: '1990-01-01',
  age: 34,
  height: 175,
  weight: 70,
  gender: '남성',
  bloodType: 'A+',
  medications: '고혈압 약 (아침 식후 30분)',
  allergies: '페니실린, 땅콩',
  diseases: '경도 고혈압',
  emergencyName: '김철수',
  emergencyPhone: '010-9876-5432',
  emergencyRelation: '부친',
  accountStatus: '활성'
};

const INITIAL_DEVICE_SETTINGS: DeviceSettings = {
  consentAutoReport: false,
  consentPrivacy: false,
  consentLocation: false,
  consentAlgorithm: false,
  deviceId: '',
  deviceName: '',
  lastSync: 0,
  initialSyncComplete: false,
  realtimeCollectionInterval: 10,
  generalCollectionInterval: 60,
  modelNumber: '',
  manufacturer: '',
  firmwareVersion: '',
  batteryLevel: 0
};

interface ReportItem {
  id: string;
  timestamp: number;
  content: string;
  status: 'normal' | 'warning' | 'danger';
}

/**
 * formatPhoneNumber 관련 처리를 수행합니다.
 */
const formatPhoneNumber = (value: string) => {
    /**
   * numbers 관련 처리를 수행합니다.
   */
const numbers = value.replace(/[^\d]/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
};

const normalizeKoreanMobileDigits = (value: string) => {
  const digits = value.replace(/[^\d]/g, '');
  if (digits.startsWith('82')) {
    const rest = digits.slice(2);
    if (!rest) return '';
    if (rest.startsWith('0')) return rest;
    return `0${rest}`;
  }
  return digits;
};

const generateMockHistory = (): ReportItem[] => {
  const history: ReportItem[] = [];
  const now = Date.now();
  const scenarios = [
    { text: "심박수가 110bpm으로 다소 상승했으나 운동 중인 것으로 추정됩니다. 호흡수는 안정적입니다.", status: 'normal' as const },
    { text: "스트레스 지수가 45로 안정화되었습니다. 현재 휴식 상태로 보이며 심박변이도(HRV)도 양호합니다.", status: 'normal' as const },
    { text: "혈압이 125/82mmHg로 정상 범위 내에 있습니다. 수분 섭취를 조금 더 권장합니다.", status: 'normal' as const },
    { text: "체온이 36.5도로 일정하게 유지되고 있습니다. 수면 질 향상을 위해 카페인 섭취를 줄이세요.", status: 'normal' as const },
    { text: "기상 직후 심박수가 평소보다 5% 낮습니다. 매우 깊은 숙면을 취한 것으로 분석됩니다.", status: 'normal' as const }
  ];

  for (let i = 0; i < 5; i++) {
    history.push({
      id: `mock-${i}`,
      timestamp: now - (i * 30 * 60 * 1000), 
      content: scenarios[i].text,
      status: scenarios[i].status
    });
  }
  return history;
};

// --- Emergency Overlay Component ---
const EmergencyOverlay = ({ 
  stage, 
  timer, 
  onCancel, 
  profile,
  currentLocation
}: { 
  stage: number, 
  timer: number, 
    /**
   * onCancel 관련 처리를 수행합니다.
   */
onCancel: () => void, 
  profile: UserProfile,
  currentLocation: {lat: number, lng: number} | null
}) => {
  if (stage === 0) return null;

  return (
    // Z-index increased to 9999 to cover all app elements including bottom nav
    // Background changed to solid slate-900 to simulate a full-screen system alert
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-6 animate-fade-in-up">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Header Background based on stage */}
        <div className={`h-32 flex items-center justify-center transition-colors duration-500 ${stage === 4 ? 'bg-indigo-600' : 'bg-red-500'}`}>
           {stage < 4 && <div className="absolute inset-0 bg-red-600 animate-pulse opacity-50"></div>}
           <div className="relative z-10 text-white flex flex-col items-center">
              {stage === 1 && <Siren size={48} className="animate-bounce" />}
              {stage === 2 && <PhoneCall size={48} className="animate-pulse" />}
              {stage === 3 && <UserPlus size={48} className="animate-pulse" />}
              {stage === 4 && <Ambulance size={48} className="animate-bounce" />}
           </div>
        </div>

        <div className="p-6 text-center">
          {/* Stage 1: User Check */}
          {stage === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">비정상 신호 감지!</h2>
              <p className="text-slate-600 font-normal">
                심박수와 충격 감지 센서에서 이상 신호가 확인되었습니다.<br/>
                현재 안전하신가요?
              </p>
              <div className="py-4">
                <span className="text-5xl font-mono font-bold text-red-500">{timer}</span>
                <span className="text-sm text-slate-400 block mt-1">초 후 관제센터로 연결됩니다.</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-lg font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 cursor-pointer relative z-50"
              >
                네, 괜찮습니다 (확인)
              </button>
            </div>
          )}

          {/* Stage 2: Control Center */}
          {stage === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">관제센터 연결 중...</h2>
              <p className="text-slate-600 font-normal animate-pulse">
                사용자 응답이 없어<br/>
                24시간 의료 관제센터로 연결합니다.
              </p>
              <div className="py-6 flex justify-center gap-2">
                 <span className="w-3 h-3 bg-red-500 rounded-full animate-bounce"></span>
                 <span className="w-3 h-3 bg-red-500 rounded-full animate-bounce delay-100"></span>
                 <span className="w-3 h-3 bg-red-500 rounded-full animate-bounce delay-200"></span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-600 font-normal">📞 관제센터 연결 시도 중...</p>
                <p className="text-[12px] text-slate-400 mt-1">연결 실패 시 보호자에게 연락합니다</p>
              </div>
              <p className="text-xs text-slate-400">남은 시간: {timer}초</p>
            </div>
          )}

          {/* Stage 3: Guardian */}
          {stage === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">보호자 연락 시도</h2>
              <p className="text-slate-600 font-normal">
                관제센터 연결 지연.<br/>
                등록된 보호자에게 연락합니다.
              </p>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                    <User size={24} />
                 </div>
                 <div>
                    <p className="text-xs text-slate-400 uppercase">Guardian</p>
                    <p className="text-lg font-bold text-slate-900">{profile.emergencyName}</p>
                    <p className="text-sm text-slate-500">{profile.emergencyPhone}</p>
                 </div>
              </div>
              <p className="text-xs text-slate-400 mt-4">응답 없을 시 119 자동 신고 ({timer}초)</p>
            </div>
          )}

          {/* Stage 4: Dispatch (Final) */}
          {stage === 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 text-indigo-600">구조대 출동 요청 완료</h2>
              <p className="text-slate-600 font-normal">
                응급 상황이 접수되었습니다.<br/>
                가장 가까운 구조대가 배정되었습니다.
              </p>
              
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-left space-y-3">
                 <div className="flex items-center gap-3">
                    <MapPin className="text-indigo-600" size={20} />
                    <div>
                      <span className="text-sm text-slate-700 font-medium">현재 위치 전송 완료</span>
                      {currentLocation && (
                        <div className="text-xs text-slate-500 font-mono">
                          {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                        </div>
                      )}
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <FileText className="text-indigo-600" size={20} />
                    <span className="text-sm text-slate-700 font-medium">최근 생체 데이터 공유됨</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <Clock className="text-indigo-600" size={20} />
                    <span className="text-sm text-slate-700 font-medium">도착 예정: 7분</span>
                 </div>
              </div>

              <button 
                onClick={onCancel}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-lg font-normal shadow-lg shadow-slate-200 mt-2 cursor-pointer"
              >
                상황 종료 (오신고 취소)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SignupForm = memo(({ 
  onSignup, 
  onBack 
}: { 
    /**
   * onSignup 관련 처리를 수행합니다.
   */
onSignup: (data: any) => void, 
    /**
   * onBack 관련 처리를 수행합니다.
   */
onBack: () => void 
}) => {
  const [step, setStep] = useState(1);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupPasswordConfirm, setShowSignupPasswordConfirm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    dob: '',
    age: '',
    gender: '남성',
    bloodType: 'A+',
    height: '170',
    weight: '60',
    city: '',
    district: '',
    dong: '',
    welfareName: '',
    medications: '',
    allergies: '',
    diseases: '',
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
  });

    /**
   * generateRangeOptions 관련 처리를 수행합니다.
   */
const generateRangeOptions = (start: number, end: number, unit: string = '') => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(num => (
      <option key={num} value={num}>{num} {unit}</option>
    ));
  };

    /**
   * handleChange 관련 처리를 수행합니다.
   */
const handleChange = (field: string, value: string | number) => {
    let newValue = value;
    if ((field === 'phone' || field === 'emergencyPhone') && typeof value === 'string') {
      newValue = formatPhoneNumber(value);
    }
    
    // 생년월일 변경 시 나이 자동 계산
    if (field === 'dob' && typeof value === 'string') {
      const birthDate = new Date(value);
            /**
       * today 관련 처리를 수행합니다.
       */
const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        age: age.toString()
      }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [field]: newValue }));
  };

  const handleNext = () => {
    // Step 1: 계정 생성 (이메일, 비밀번호)
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.passwordConfirm) {
        alert("이메일과 비밀번호를 모두 입력해주세요.");
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        alert('올바른 이메일 형식을 입력해주세요.');
        return;
      }

      if (formData.password.length < 6) {
        alert('비밀번호는 6자 이상이어야 합니다.');
        return;
      }

      if (formData.password !== formData.passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }
    }
    
    // Step 2: 기본 정보 (이름, 생년월일, 전화번호)
    if (step === 2) {
      if (!formData.name || !formData.dob || !formData.city || !formData.district || !formData.dong || !formData.welfareName) {
        alert("이름, 생년월일, 시/도, 구, 동, 복지사명은 필수 입력 항목입니다.");
        return;
      }

      // 전화번호 형식 검증 (선택 입력)
      const phoneRegex = /^01[0-9]{8,9}$/;
      const cleanUserPhone = normalizeKoreanMobileDigits(formData.phone);
      
      if (cleanUserPhone && !phoneRegex.test(cleanUserPhone)) {
        alert('올바른 휴대폰 번호 형식을 입력해주세요. (예: 01012345678)');
        return;
      }
    }

    // Step 3: 건강 정보 (신장, 체중, 혈액형)
    if (step === 3) {
      if (!formData.height || !formData.weight || !formData.bloodType) {
         alert("신장, 체중, 혈액형을 입력해주세요.");
         return;
      }

            /**
       * height 관련 처리를 수행합니다.
       */
const height = parseInt(formData.height);
      const weight = parseInt(formData.weight);
      
      if (isNaN(height) || height < 50 || height > 250) {
        alert('올바른 신장을 입력해주세요. (50-250cm)');
        return;
      }
      if (isNaN(weight) || weight < 10 || weight > 300) {
        alert('올바른 체중을 입력해주세요. (10-300kg)');
        return;
      }
    }

    if (step < 4) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
    else onBack();
  };

    /**
   * handleSubmit 관련 처리를 수행합니다.
   */
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Step 4: 비상 연락망 검증 (선택사항이므로 이름만 입력시 전화번호 필수 체크 등)
    // 전화번호 형식 검증 (입력된 경우만)
    const phoneRegex = /^01[0-9]{8,9}$/;
    const cleanEmergencyPhone = formData.emergencyPhone ? normalizeKoreanMobileDigits(formData.emergencyPhone) : '';
    
    if (cleanEmergencyPhone && !phoneRegex.test(cleanEmergencyPhone)) {
      alert('비상연락망 전화번호 형식을 확인해주세요. (예: 01012345678)');
      return;
    }

    // 나이 자동 계산 및 검증
    const age = parseInt(formData.age);
    let calculatedAge = age;
    if (!calculatedAge && formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
    }
    
    try {
      // 백엔드 회원가입 API 호출
      const cleanUserPhone = normalizeKoreanMobileDigits(formData.phone);
      const height = parseInt(formData.height);
      const weight = parseInt(formData.weight);

      console.log('회원가입 요청 데이터:', {
        name: formData.name,
        phone: cleanUserPhone,
        email: formData.email,
        birthDate: formData.dob,
        age: calculatedAge,
        height: height,
        weight: weight,
        bloodType: formData.bloodType
      });
      
      const response = await backendService.signup({
        name: formData.name,
        phone: cleanUserPhone,
        email: formData.email,
        password: formData.password,
        birthDate: formData.dob,
        age: calculatedAge,
        height: height,
        weight: weight,
        bloodType: formData.bloodType,
        affiliation: {
          city: formData.city,
          district: formData.district,
          dong: formData.dong,
          welfareName: formData.welfareName,
        },
                /**
         * emergencyContacts 관련 처리를 수행합니다.
         */
emergencyContacts: (() => {
          const rawName = formData.emergencyName;
          const name = rawName ? rawName.trim() : '';
          const rawRelation = formData.emergencyRelation;
          const relationship = (rawRelation ? rawRelation : '보호자').trim();
          
          if (!name) return [];
          
          return [
            {
              name,
              phone: cleanEmergencyPhone,
              relationship
            }
          ];
        })(),
        medicalHistory: {
          medications: formData.medications ? [{ name: formData.medications }] : [],
          allergies: formData.allergies ? [{ substance: formData.allergies }] : [],
          chronicDiseases: formData.diseases ? [{ disease: formData.diseases }] : []
        }
      });
      
      console.log('회원가입 응답:', response);
      
      if (response.success) {
        alert("회원가입 신청이 완료되었습니다. 어드민 승인 후 로그인할 수 있습니다.");
        onSignup(formData);
      } else {
        // 구체적인 오류 메시지 표시
        const responseMessage = response.message;
        if (responseMessage && responseMessage.indexOf('이미 가입된') !== -1) {
          alert('이미 가입된 이메일 또는 전화번호입니다.');
        } else if (responseMessage && responseMessage.indexOf('필수') !== -1) {
          alert(`필수 정보가 누락되었습니다: ${responseMessage}`);
        } else {
          alert(`회원가입에 실패했습니다: ${responseMessage || response.error || '서버 오류가 발생했습니다.'}`);
        }
        console.error('회원가입 실패 상세:', response);
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      alert(`회원가입 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.'}`);
    }
  };

  const inputBase = "w-full px-4 py-3 bg-white text-[16px] text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400 font-normal transition-all shadow-sm";
  const labelBase = "text-[14px] font-medium text-slate-900 uppercase tracking-widest ml-1 mb-1.5 flex items-center gap-1";
  const requiredMark = <span className="text-red-500 font-normal">*</span>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative max-w-lg mx-auto">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
         <div className="flex items-center gap-4 mb-4">
            <button onClick={handlePrev} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-lg font-medium text-slate-900 leading-none">회원가입</h2>
              <p className="text-[14px] text-slate-500 mt-1.5 font-medium uppercase tracking-wider">
                {step === 1 && "1. Account Details"}
                {step === 2 && "2. Personal Information"}
                {step === 3 && "3. Health Profile"}
                {step === 4 && "4. Emergency Contacts"}
                <span className="ml-2 text-indigo-600">({step}/4)</span>
              </p>
            </div>
         </div>
         <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-500 h-full transition-all duration-500 ease-out rounded-full shadow-[0_0_8px_rgba(20,184,166,0.3)]" 
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
         </div>
      </div>

      <div className="flex-1 p-6 pb-32 overflow-y-auto">
        <form id="signup-form" onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="text-2xl font-light text-slate-900 mb-2">환영합니다! 👋</h3>
                <p className="text-slate-500 mb-6 font-light">서비스 이용을 위한 계정을 생성해주세요.</p>
                <div className="space-y-4">
                  <div>
                    <label className={labelBase}>이메일 {requiredMark}</label>
                    <input type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} placeholder="example@email.com" className={inputBase} autoFocus />
                  </div>
                  {/* 비밀번호 영역 - 하나의 박스로 묶음 */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div>
                      <label className={labelBase}>비밀번호 {requiredMark}</label>
                      <div className="flex h-[44px] items-center gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white px-4">
                        <Lock size={16} className="text-slate-400 shrink-0" />
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={e => handleChange('password', e.target.value)}
                          placeholder="비밀번호 입력"
                          className="h-full min-h-0 w-full appearance-none bg-transparent text-[14px] leading-none text-slate-900 outline-none"
                        />
                        {formData.password ? (
                          <button type="button" onClick={() => handleChange('password', '')} className="p-0.5 text-slate-300 hover:text-slate-500" aria-label="비밀번호 지우기">
                            <X size={14} />
                          </button>
                        ) : null}
                        <button type="button" onClick={() => setShowSignupPassword(prev => !prev)} className="p-0.5 text-slate-300 hover:text-slate-500" aria-label="비밀번호 보기">
                          {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelBase}>비밀번호 확인 {requiredMark}</label>
                      <div className="flex h-[44px] items-center gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white px-4">
                        <Lock size={16} className="text-slate-400 shrink-0" />
                        <input
                          type={showSignupPasswordConfirm ? 'text' : 'password'}
                          value={formData.passwordConfirm}
                          onChange={e => handleChange('passwordConfirm', e.target.value)}
                          placeholder="비밀번호 재입력"
                          className="h-full min-h-0 w-full appearance-none bg-transparent text-[14px] leading-none text-slate-900 outline-none"
                        />
                        {formData.passwordConfirm ? (
                          <button type="button" onClick={() => handleChange('passwordConfirm', '')} className="p-0.5 text-slate-300 hover:text-slate-500" aria-label="비밀번호 확인 지우기">
                            <X size={14} />
                          </button>
                        ) : null}
                        <button type="button" onClick={() => setShowSignupPasswordConfirm(prev => !prev)} className="p-0.5 text-slate-300 hover:text-slate-500" aria-label="비밀번호 확인 보기">
                          {showSignupPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="text-2xl font-light text-slate-900 mb-2">누구신가요? 🤔</h3>
                <p className="text-slate-500 mb-6 font-light">정확한 건강 분석을 위해 신상 정보를 입력해주세요.</p>
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                      <label className={labelBase}>이름 {requiredMark}</label>
                      <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="홍길동" className={inputBase} autoFocus />
                     </div>
                     <div>
                      <label className={labelBase}>생년월일 {requiredMark}</label>
                      <SimpleDatePicker
                        value={formData.dob}
                        onChange={(date) => handleChange('dob', date)}
                        maxDate={new Date().toISOString().split('T')[0]}
                        placeholder="생년월일 선택"
                      />
                     </div>
                   </div>
                   <div>
                    <label className={labelBase}>휴대폰 번호</label>
                    <input type="tel" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="010-0000-0000" maxLength={13} className={inputBase} />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                      <label className={labelBase}>시/도 {requiredMark}</label>
                      <input type="text" value={formData.city} onChange={e => handleChange('city', e.target.value)} placeholder="예: 서울시" className={inputBase} />
                     </div>
                     <div>
                      <label className={labelBase}>구 {requiredMark}</label>
                      <input type="text" value={formData.district} onChange={e => handleChange('district', e.target.value)} placeholder="예: 강남구" className={inputBase} />
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                      <label className={labelBase}>동 {requiredMark}</label>
                      <input type="text" value={formData.dong} onChange={e => handleChange('dong', e.target.value)} placeholder="예: 역삼1동" className={inputBase} />
                     </div>
                     <div>
                      <label className={labelBase}>복지사명 {requiredMark}</label>
                      <input type="text" value={formData.welfareName} onChange={e => handleChange('welfareName', e.target.value)} placeholder="예: 김복지" className={inputBase} />
                     </div>
                   </div>
                   <div className="grid grid-cols-3 gap-3">
                     <div>
                       <label className={labelBase}>나이 (자동 계산)</label>
                       <input 
                         type="text" 
                         value={formData.age ? `${formData.age}세` : ''} 
                         className={`${inputBase} bg-slate-50 text-slate-500 border-dashed`} 
                         disabled 
                         placeholder="자동 계산"
                       />
                     </div>
                     <div>
                       <label className={labelBase}>성별</label>
                       <select value={formData.gender} onChange={e => handleChange('gender', e.target.value)} className={inputBase}>
                         <option value="남성" className="bg-white">남성</option>
                         <option value="여성" className="bg-white">여성</option>
                       </select>
                     </div>
                     <div>
                       <label className={labelBase}>혈액형</label>
                       <select value={formData.bloodType} onChange={e => handleChange('bloodType', e.target.value)} className={inputBase}>
                         <option className="bg-white">A+</option><option className="bg-white">A-</option><option className="bg-white">B+</option><option className="bg-white">B-</option>
                         <option className="bg-white">O+</option><option className="bg-white">O-</option><option className="bg-white">AB+</option><option className="bg-white">AB-</option>
                       </select>
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className={labelBase}>신장 (cm)</label>
                      <NumberPicker
                        title="신장 선택"
                        value={formData.height}
                        onChange={(v) => handleChange('height', v)}
                        min={100}
                        max={220}
                        unit="cm"
                        triggerClassName={inputBase}
                      />
                     </div>
                     <div>
                       <label className={labelBase}>체중 (kg)</label>
                      <NumberPicker
                        title="체중 선택"
                        value={formData.weight}
                        onChange={(v) => handleChange('weight', v)}
                        min={30}
                        max={150}
                        unit="kg"
                        triggerClassName={inputBase}
                      />
                     </div>
                   </div>
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="text-2xl font-light text-slate-900 mb-2">건강 상태 🏥</h3>
                <p className="text-slate-500 mb-6 font-light">기저 질환이나 복용 약물이 있다면 알려주세요.</p>
                <div className="space-y-4">
                   <div>
                     <label className={labelBase}>복용 중인 약물</label>
                     <textarea value={formData.medications} onChange={e => handleChange('medications', e.target.value)} rows={3} className={inputBase} placeholder="없음" />
                   </div>
                   <div>
                     <label className={labelBase}>알레르기</label>
                     <input type="text" value={formData.allergies} onChange={e => handleChange('allergies', e.target.value)} className={inputBase} placeholder="없음" />
                   </div>
                   <div>
                     <label className={labelBase}>만성 질환</label>
                     <input type="text" value={formData.diseases} onChange={e => handleChange('diseases', e.target.value)} className={inputBase} placeholder="없음" />
                   </div>
                </div>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="text-2xl font-light text-slate-900 mb-2">비상 연락망 🚨</h3>
                <p className="text-slate-500 mb-6 font-light">응급 상황 발생 시 연락할 보호자를 등록합니다. (선택)</p>
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelBase}>보호자 이름</label>
                        <input type="text" value={formData.emergencyName} onChange={e => handleChange('emergencyName', e.target.value)} className={inputBase} />
                      </div>
                      <div>
                        <label className={labelBase}>관계</label>
                        <input type="text" value={formData.emergencyRelation} onChange={e => handleChange('emergencyRelation', e.target.value)} placeholder="예: 부모" className={inputBase} />
                      </div>
                    </div>
                    <div>
                       <label className={labelBase}>보호자 연락처</label>
                       <input type="tel" value={formData.emergencyPhone} onChange={e => handleChange('emergencyPhone', e.target.value)} placeholder="010-0000-0000" maxLength={13} className={inputBase} />
                    </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t border-slate-100 z-50 max-w-lg mx-auto">
        <div className="flex gap-3">
          {step > 1 && (
             <button type="button" onClick={handlePrev} className="flex-1 py-4 bg-slate-100 text-slate-600 font-medium rounded-2xl hover:bg-slate-200 transition-colors">이전</button>
          )}
          {step < 4 ? (
            <button type="button" onClick={handleNext} className="flex-[2] py-4 bg-indigo-600 text-white font-medium rounded-2xl shadow-lg shadow-indigo-900/10 hover:scale-[0.98] transition-transform flex justify-center items-center gap-2">다음 <ArrowRight size={20}/></button>
          ) : (
            <button type="button" onClick={handleSubmit} className="flex-[2] py-4 bg-emerald-600 text-white font-medium rounded-2xl shadow-lg shadow-emerald-900/10 hover:scale-[0.98] transition-transform flex justify-center items-center gap-2">가입 완료 <CheckCircle2 size={20}/></button>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * PersonalInfoEditor 관련 처리를 수행합니다.
 */
const PersonalInfoEditor = memo(({ 
  initialData, 
  initialDeviceSettings,
  onSave, 
  onCancel 
}: { 
  initialData: UserProfile, 
  initialDeviceSettings: DeviceSettings,
    /**
   * onSave 관련 처리를 수행합니다.
   */
onSave: (data: UserProfile, settings: DeviceSettings) => void, 
    /**
   * onCancel 관련 처리를 수행합니다.
   */
onCancel: () => void 
}) => {
  const [formData, setFormData] = useState<UserProfile>(initialData);
  const [settingsData, setSettingsData] = useState<DeviceSettings>(initialDeviceSettings);

  const handleChange = (field: keyof UserProfile, value: string | number) => {
    let newValue = value;
    if ((field === 'phone' || field === 'emergencyPhone') && typeof value === 'string') {
      newValue = formatPhoneNumber(value);
    }
    setFormData(prev => ({ ...prev, [field]: newValue }));
  };

  // Helper for generating number options
  const generateRangeOptions = (start: number, end: number, unit: string = '') => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(num => (
      <option key={num} value={num}>{num} {unit}</option>
    ));
  };

  const inputClass = "w-full px-4 py-3 bg-white text-[16px] text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400 font-normal shadow-sm transition-all";
  const readOnlyInputClass = "w-full px-4 py-3 bg-slate-100 text-[16px] text-slate-500 border border-slate-200 rounded-xl outline-none font-normal shadow-sm select-none pointer-events-none";
  const requiredMark = <span className="text-red-500 font-normal">*</span>;

  return (
    <div className="px-4 pt-8 pb-24 animate-fade-in-up bg-slate-50">
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-white/95 backdrop-blur z-20 py-2">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
             <ArrowLeft size={20} className="text-slate-600"/> 
          </button>
          <h2 className="text-xl font-normal text-slate-900">개인 정보 설정</h2>
        </div>
        <div className={`px-3 py-1 rounded-full text-[14px] font-normal border ${
          formData.accountStatus === '활성' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-slate-200 text-slate-500'
        }`}>
          {formData.accountStatus}
        </div>
      </div>
      
      <div className="space-y-8">
        <section className="glass-panel p-5 rounded-2xl">
          <h3 className="text-sm font-normal text-slate-800 mb-4 flex items-center gap-2">
            <User size={16} className="text-indigo-500"/> 기본 신상 정보
          </h3>
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                <label className="text-[14px] font-normal text-slate-400 uppercase ml-1">이름 {requiredMark}</label>
                <input type="text" value={formData.name} readOnly className={readOnlyInputClass} />
               </div>
               <div className="space-y-1">
                <label className="text-[14px] font-normal text-slate-400 uppercase ml-1">생년월일 {requiredMark}</label>
                <input 
                  type="date" 
                  value={formData.dob} 
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => handleChange('dob', e.target.value)} 
                  className={inputClass + " appearance-none"} 
                />
               </div>
             </div>
             <div className="space-y-1">
              <label className="text-[14px] font-normal text-slate-400 uppercase ml-1">휴대폰 번호 {requiredMark}</label>
              <div className="flex gap-2">
                <input type="tel" value={formData.phone} readOnly className={readOnlyInputClass} />
                <button 
                  type="button" 
                  onClick={() => alert("본인인증(PASS) 서비스를 통해 변경할 수 있습니다.")}
                  className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[15px] font-normal shadow-sm hover:bg-slate-50 active:scale-95 transition-all whitespace-nowrap"
                >
                  변경
                </button>
              </div>
             </div>
             <div className="grid grid-cols-3 gap-3">
               <div className="space-y-1">
                 <label className="text-[12px] font-normal text-slate-400 uppercase ml-1">나이</label>
                 <select value={formData.age} onChange={e => handleChange('age', Number(e.target.value))} className={inputClass}>
                    {generateRangeOptions(1, 100, '세')}
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-[12px] font-normal text-slate-400 uppercase ml-1">성별</label>
                 <select value={formData.gender} onChange={e => handleChange('gender', e.target.value)} className={inputClass}>
                   <option value="남성">남성</option>
                   <option value="여성">여성</option>
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-[12px] font-normal text-slate-400 uppercase ml-1">혈액형</label>
                 <select value={formData.bloodType} onChange={e => handleChange('bloodType', e.target.value)} className={inputClass}>
                   <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                   <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
                 </select>
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[12px] font-normal text-slate-400 uppercase ml-1">신장 (cm)</label>
                 <select value={formData.height} onChange={e => handleChange('height', Number(e.target.value))} className={inputClass}>
                    {generateRangeOptions(100, 220, 'cm')}
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-[12px] font-normal text-slate-400 uppercase ml-1">체중 (kg)</label>
                 <select value={formData.weight} onChange={e => handleChange('weight', Number(e.target.value))} className={inputClass}>
                    {generateRangeOptions(30, 150, 'kg')}
                 </select>
               </div>
             </div>
           </div>
         </section>

         <section className="glass-panel p-5 rounded-2xl">
           <h3 className="text-sm font-normal text-slate-800 mb-4 flex items-center gap-2">
             <Stethoscope size={16} className="text-red-500"/> 의료 및 건강 정보
           </h3>
           <div className="space-y-4">
             <div className="space-y-1">
               <label className="text-[12px] font-normal text-slate-400 uppercase ml-1"><Pill size={10}/> 복용 중인 약물</label>
               <textarea value={formData.medications} onChange={e => handleChange('medications', e.target.value)} rows={2} className={inputClass + " text-sm resize-none"} />
             </div>
             <div className="space-y-1">
               <label className="text-[12px] font-normal text-slate-400 uppercase ml-1">알레르기</label>
               <input type="text" value={formData.allergies} onChange={e => handleChange('allergies', e.target.value)} className={inputClass} />
             </div>
             <div className="space-y-1">
               <label className="text-[12px] font-normal text-slate-400 uppercase ml-1">만성 질환</label>
               <input type="text" value={formData.diseases} onChange={e => handleChange('diseases', e.target.value)} className={inputClass} />
             </div>
           </div>
         </section>

         <section className="glass-panel p-5 rounded-2xl">
           <h3 className="text-sm font-normal text-slate-800 mb-4 flex items-center gap-2">
             <Siren size={16} className="text-red-500"/> 비상 연락망
           </h3>
           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-normal text-slate-400 uppercase ml-1">보호자 이름 {requiredMark}</label>
                  <input type="text" value={formData.emergencyName} onChange={e => handleChange('emergencyName', e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-normal text-slate-400 uppercase ml-1">관계 {requiredMark}</label>
                  <input type="text" value={formData.emergencyRelation} onChange={e => handleChange('emergencyRelation', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="space-y-1">
                 <label className="text-[12px] font-normal text-slate-400 uppercase ml-1">보호자 연락처 {requiredMark}</label>
                 <input type="tel" value={formData.emergencyPhone} onChange={e => handleChange('emergencyPhone', e.target.value)} maxLength={13} className={inputClass} />
              </div>
           </div>
         </section>

         <section className="glass-panel p-5 rounded-2xl">
            <h3 className="text-sm font-normal text-slate-800 mb-4 flex items-center gap-2">
               <Clock size={16} className="text-indigo-500"/> 데이터 전송 주기 설정
            </h3>
            
            <div className="space-y-5">
               {/* Realtime Group */}
              <div className="space-y-1">
                <label className="text-[12px] font-normal text-slate-400 uppercase ml-1">
                     실시간 생체 신호 (심박, 혈압, SpO2, 체온, 심전도)
                 </label>
                 <select 
                     value={settingsData.realtimeCollectionInterval} 
                     onChange={e => setSettingsData(prev => ({ ...prev, realtimeCollectionInterval: Number(e.target.value) }))}
                     className={inputClass}
                 >
                     <option value={1}>초정밀 실시간 (1초)</option>
                     <option value={5}>빠름 (5초)</option>
                     <option value={10}>권장 (10초)</option>
                     <option value={30}>배터리 절약 (30초)</option>
                     <option value={60}>1분</option>
                 </select>
               </div>

               {/* General Group */}
              <div className="space-y-1">
                <label className="text-[12px] font-normal text-slate-400 uppercase ml-1">
                     일반 건강 지표 (스트레스, HRV, 혈당, 활동량)
                 </label>
                 <select 
                     value={settingsData.generalCollectionInterval} 
                     onChange={e => setSettingsData(prev => ({ ...prev, generalCollectionInterval: Number(e.target.value) }))}
                     className={inputClass}
                 >
                     <option value={60}>1분</option>
                     <option value={300}>5분</option>
                     <option value={600}>10분 (권장)</option>
                     <option value={1800}>30분</option>
                     <option value={3600}>1시간</option>
                 </select>
                <p className="text-[12px] text-slate-400 mt-3 pl-1 leading-relaxed">
                     * <strong>실시간 주기</strong>가 짧을수록 배터리 소모량이 급격히 증가합니다.<br/>
                     * <strong>응급 상황(낙상, 부정맥 등)</strong>은 설정과 무관하게 즉시 전송됩니다.
                 </p>
               </div>
            </div>
         </section>
      </div>

      <button onClick={() => onSave(formData, settingsData)} className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-normal shadow-lg shadow-slate-200 active:scale-[0.98] transition-transform">
        변경사항 저장하기
      </button>
    </div>
  );
});

/**
 * DeviceManager 관련 처리를 수행합니다.
 */
const DeviceManager = memo(({
  settings,
  onSave,
  onCancel,
  onDisconnect,
  isPaired,
  onStartPairing
}: {
  settings: DeviceSettings,
    /**
   * onSave 관련 처리를 수행합니다.
   */
onSave: (settings: DeviceSettings) => void,
    /**
   * onCancel 관련 처리를 수행합니다.
   */
onCancel: () => void,
    /**
   * onDisconnect 관련 처리를 수행합니다.
   */
onDisconnect: () => void,
  isPaired: boolean,
    /**
   * onStartPairing 관련 처리를 수행합니다.
   */
onStartPairing: () => void
}) => {
  const [currentSettings, setCurrentSettings] = useState<DeviceSettings>(settings);

  const toggleSetting = (key: keyof DeviceSettings) => {
    // Only boolean keys can be toggled
    if (typeof currentSettings[key] === 'boolean') {
        setCurrentSettings(prev => ({
            ...prev,
            [key]: !prev[key as keyof DeviceSettings]
        }));
    }
  };

  return (
    <div className="px-4 pt-8 pb-24 animate-fade-in-up bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-white/95 backdrop-blur z-20 py-2">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
             <ArrowLeft size={20} className="text-slate-600"/>
          </button>
          <h2 className="text-xl font-normal text-slate-900">기기 관리</h2>
        </div>
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isPaired ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
            <span className="text-xs text-slate-500 font-normal">{isPaired ? '연결됨' : '연결 안 됨'}</span>
        </div>
      </div>

            <div className="space-y-6">
        {/* Device Info Card */}
        {isPaired ? (
        <section className="glass-panel p-5 rounded-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-3 opacity-10">
              <Watch size={100} className="text-indigo-900"/>
           </div>
           <div className="relative z-10">
              <div className="flex justify-between items-start mb-1">
                <p className="text-xs text-indigo-500 font-normal uppercase tracking-wider">Connected Device</p>
                {currentSettings.batteryLevel !== undefined && (
                  <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full">
                    <Battery size={12} className={currentSettings.batteryLevel < 20 ? "text-red-500" : "text-green-500"} />
                    <span className="text-xs font-medium text-slate-600">{currentSettings.batteryLevel}%</span>
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-normal text-slate-900 mb-4">{currentSettings.deviceName}</h3>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <p className="text-[12px] text-slate-400 uppercase">Model</p>
                      <p className="text-sm text-slate-700 font-mono">{currentSettings.modelNumber || 'Unknown'}</p>
                  </div>
                  <div>
                      <p className="text-[12px] text-slate-400 uppercase">Manufacturer</p>
                      <p className="text-sm text-slate-700">{currentSettings.manufacturer || 'Starmax'}</p>
                  </div>
                  <div>
                      <p className="text-[12px] text-slate-400 uppercase">Serial Number</p>
                      <p className="text-sm text-slate-700 font-mono text-xs">{currentSettings.deviceId}</p>
                  </div>
                  <div>
                      <p className="text-[12px] text-slate-400 uppercase">Firmware</p>
                      <p className="text-sm text-slate-700">{currentSettings.firmwareVersion || '1.0.0'}</p>
                  </div>
              </div>
           </div>
        </section>
        ) : (
          <section className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-slate-200 bg-slate-50/50">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                <Watch size={32} />
             </div>
             <div>
               <h3 className="text-lg font-medium text-slate-900">연결된 기기 없음</h3>
               <p className="text-sm text-slate-500 mt-1">STARMAX 워치를 연결하여<br/>건강 데이터를 모니터링하세요.</p>
             </div>
             <button 
               onClick={onStartPairing}
               className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2"
             >
               <Bluetooth size={16} />
               기기 연결하기
             </button>
          </section>
        )}

        {/* Sync Settings - Only show when paired */}
        {isPaired && (
        <section className="glass-panel p-5 rounded-2xl">
           <h3 className="text-sm font-normal text-slate-800 mb-4 flex items-center gap-2">
             <RefreshCw size={16} className="text-indigo-500"/> 동기화 설정
           </h3>

           <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                 <div>
                    <p className="text-sm text-slate-700 font-normal">자동 리포트 생성</p>
                    <p className="text-[12px] text-slate-400">매일 아침 건강 리포트를 자동 생성합니다.</p>
                 </div>
                 <button onClick={() => toggleSetting('consentAutoReport')} className={`relative w-11 h-6 transition-colors rounded-full ${currentSettings.consentAutoReport ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${currentSettings.consentAutoReport ? 'translate-x-5' : 'translate-x-0'}`}/>
                 </button>
              </div>
           </div>
        </section>
        )}

        {/* Privacy Permissions */}
        <section className="glass-panel p-5 rounded-2xl">
           <h3 className="text-sm font-normal text-slate-800 mb-4 flex items-center gap-2">
             <ShieldAlert size={16} className="text-slate-500"/> 권한 및 개인정보
           </h3>

           <div className="space-y-4 divide-y divide-slate-100">
              <div className="flex items-center justify-between py-2">
                 <div>
                    <p className="text-sm text-slate-700 font-normal">위치 정보 수집</p>
                    <p className="text-[12px] text-slate-400">응급 상황 발생 시 위치 전송에 필요합니다.</p>
                 </div>
                 <button onClick={() => toggleSetting('consentLocation')} className={`relative w-11 h-6 transition-colors rounded-full ${currentSettings.consentLocation ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${currentSettings.consentLocation ? 'translate-x-5' : 'translate-x-0'}`}/>
                 </button>
              </div>

              <div className="flex items-center justify-between py-2 pt-4">
                 <div>
                    <p className="text-sm text-slate-700 font-normal">개인 건강 데이터 분석</p>
                    <p className="text-[12px] text-slate-400">AI 알고리즘 학습 및 맞춤 분석에 활용됩니다.</p>
                 </div>
                 <button onClick={() => toggleSetting('consentAlgorithm')} className={`relative w-11 h-6 transition-colors rounded-full ${currentSettings.consentAlgorithm ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${currentSettings.consentAlgorithm ? 'translate-x-5' : 'translate-x-0'}`}/>
                 </button>
              </div>
           </div>
        </section>

        <div className="pt-4 flex gap-3">
           {isPaired && (
             <button
               onClick={onDisconnect}
               className="flex-1 py-4 bg-red-50 text-red-500 font-normal rounded-2xl hover:bg-red-100 transition-colors border border-red-100"
             >
                연동 해제
             </button>
           )}
           <button onClick={() => onSave(currentSettings)} className="flex-1 py-4 bg-slate-900 text-white font-normal rounded-2xl shadow-lg shadow-slate-200 active:scale-[0.98] transition-transform">
              설정 저장
           </button>
        </div>
      </div>
    </div>
  );
});

// New Component for displaying policy text
const PolicyViewer = ({ title, content, onBack }: { title: string, content: React.ReactNode, onBack: () => void }) => (
  <div className="px-4 pt-8 pb-24 animate-fade-in-up bg-slate-50 min-h-screen absolute inset-0 z-50">
    <div className="flex items-center gap-4 mb-6 sticky top-0 bg-white/95 backdrop-blur z-20 py-2">
        <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
           <ArrowLeft size={20} className="text-slate-600"/>
        </button>
        <h2 className="text-xl font-normal text-slate-900">{title}</h2>
    </div>
    <div className="prose prose-slate prose-sm max-w-none text-slate-600 font-normal leading-relaxed whitespace-pre-line pb-10">
        {content}
    </div>
  </div>
);

// --- About Screen Component ---
const AboutScreen = memo(({ onBack }: { onBack: () => void }) => {
  const [activePolicy, setActivePolicy] = useState<'terms' | 'privacy' | 'license' | null>(null);

  if (activePolicy) {
      let title = "";
      let content: React.ReactNode = "";

      switch(activePolicy) {
          case 'terms':
              title = "이용약관";
              content = `제 1 조 (목적)
              본 약관은 (주)프라임플레이(이하 "회사")가 제공하는 "골든타임 헬스" 서비스(이하 "서비스")의 이용조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임사항 등을 규정함을 목적으로 합니다.

              제 2 조 (서비스의 성격)
              1. 본 서비스는 사용자의 생체 데이터를 모니터링하여 건강 관리에 도움을 주는 보조적인 수단입니다.
              2. 본 서비스에서 제공하는 모든 분석 결과, AI 리포트, 알림 등은 의학적 진단, 치료, 조언을 대체할 수 없습니다.
              3. 응급 상황 알림 기능은 기술적 한계로 인해 100% 정확성을 보장하지 않으며, 회사는 이에 대해 면책됩니다.

              제 3 조 (개인정보 보호)
              회사는 관련 법령에 따라 회원의 개인정보를 보호하기 위해 노력합니다.

              제 4 조 (책임의 한계)
              천재지변, 통신 장애, 기기 결함 등으로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다.

              제 5 조 (회원의 의무)
              회원은 본인의 건강 상태를 지속적으로 확인해야 하며, 이상 징후 발생 시 즉시 전문 의료기관의 도움을 받아야 합니다.

              부칙
              본 약관은 2025년 3월 1일부터 시행합니다.`;
              break;
          case 'privacy':
               title = "개인정보 처리방침";
               content = `1. 수집하는 개인정보 항목
               회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.
               - 필수항목: 이름, 이메일, 전화번호, 생년월일, 성별, 신장, 체중
               - 민감정보(건강정보): 심박수, 혈압, 산소포화도, 수면 데이터, 활동량 등 생체 데이터
               - 위치정보: 응급 상황 발생 시 구조 요청을 위한 실시간 위치 정보

               2. 개인정보의 수집 및 이용 목적
               - 회원 관리 및 서비스 제공
               - AI 건강 리포트 생성 및 분석 (Google Gemini API 활용)
               - 응급 상황 감지 및 보호자/구조대 알림 전송

               3. 개인정보의 보유 및 이용 기간
               회원은 탈퇴 요청 시까지 개인정보를 보유하며, 탈퇴 시 지체 없이 파기합니다. 단, 관계 법령에 의해 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.

               4. 제3자 제공
               회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않으나, 응급 상황 발생 시 등록된 보호자 및 119 구조대에는 위치 및 건강 정보를 제공할 수 있습니다.`;
               break;
          case 'license':
               title = "오픈소스 라이선스";
               content = `본 서비스는 다음의 오픈소스 라이브러리를 사용하고 있습니다.

               1. React (MIT License)
               Copyright (c) Meta Platforms, Inc. and affiliates.

               2. Lucide React (ISC License)
               Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

               3. Recharts (MIT License)
               Copyright (c) 2015-present Recharts Group

               4. Tailwind CSS (MIT License)
               Copyright (c) Tailwind Labs, Inc.

               5. Google Generative AI SDK (Apache-2.0)
               Copyright 2023 Google LLC.`;
               break;
      }
      return <PolicyViewer title={title} content={content} onBack={() => setActivePolicy(null)} />;
  }

  return (
    <div className="px-4 pt-8 pb-24 animate-fade-in-up bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 sticky top-0 bg-white/95 backdrop-blur z-20 py-2">
        <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
           <ArrowLeft size={20} className="text-slate-600"/>
        </button>
        <h2 className="text-xl font-normal text-slate-900">서비스 정보</h2>
      </div>

      <div className="flex flex-col items-center mb-10 mt-4">
         <div className="w-24 h-24 bg-red-500 rounded-3xl flex items-center justify-center shadow-xl shadow-red-200 mb-4 rotate-12">
            <Siren className="text-white" size={48} />
         </div>
         <h3 className="text-2xl font-normal text-slate-900">Goldentime Health</h3>
         <p className="text-sm text-slate-400 font-normal">Version 2.4.1</p>
      </div>

      <div className="space-y-6">
         <section className="glass-panel p-5 rounded-2xl">
           <h4 className="text-sm font-normal text-slate-800 mb-4 flex items-center gap-2">
             <User size={16} className="text-indigo-500"/> 개발사 정보
           </h4>
           <div className="space-y-1">
             <p className="text-[12px] text-slate-400 uppercase font-normal">Company Name</p>
             <p className="text-base font-normal text-slate-900">(주)프라임플레이</p>
             <p className="text-sm text-slate-500 font-normal">Prime Play Co., Ltd.</p>
           </div>
           <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
             <p className="text-[12px] text-slate-400 uppercase font-normal">Contact</p>
             <p className="text-sm text-slate-700 font-normal">support@primeplay.co.kr</p>
           </div>
         </section>

         <section className="glass-panel p-0 rounded-2xl overflow-hidden">
            <div onClick={() => setActivePolicy('terms')} className="p-4 flex justify-between items-center border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                     <ScrollText size={18} className="text-slate-400"/>
                     <span className="text-sm text-slate-700 font-normal">이용약관</span>
                  </div>
               <ChevronRight size={16} className="text-slate-300"/>
            </div>
            <div onClick={() => setActivePolicy('privacy')} className="p-4 flex justify-between items-center border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
               <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-slate-400"/>
                  <span className="text-sm text-slate-700 font-normal">개인정보 처리방침</span>
               </div>
               <ChevronRight size={16} className="text-slate-300"/>
            </div>
             <div onClick={() => setActivePolicy('license')} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
               <div className="flex items-center gap-3">
                  <Code2 size={18} className="text-slate-400"/>
                  <span className="text-sm text-slate-700 font-normal">오픈소스 라이선스</span>
               </div>
               <ChevronRight size={16} className="text-slate-300"/>
            </div>
         </section>
      </div>
      
      <div className="mt-10 text-center">
         <p className="text-[12px] text-slate-300">Copyright © 2025 Prime Play Co., Ltd. All rights reserved.</p>
      </div>
    </div>
  );
});

/**
 * App 관련 처리를 수행합니다.
 */
export default function App() {
  const [user, setUser] = useState<{ email: string; name?: string; id?: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset-password'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isAutoLogin, setIsAutoLogin] = useState(true); // 자동 로그인 상태 (기본값 true)
  // 비밀번호 재설정 상태
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetNewPasswordConfirm, setResetNewPasswordConfirm] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetMaskedPhone, setResetMaskedPhone] = useState('');
  const [isPaired, setIsPaired] = useState(false);
  const [forcePairing, setForcePairing] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [profileView, setProfileView] = useState<'main' | 'personal' | 'device' | 'about'>('main');
  const [data, setData] = useState<BiometricData>(INITIAL_DATA);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportItem[]>(generateMockHistory());
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings>(INITIAL_DEVICE_SETTINGS);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<StarmaxDevice[]>([]);
  const [profileImage, setProfileImage] = useState("https://picsum.photos/200/200");
  const [detectedQrMac, setDetectedQrMac] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPairingProcess, setIsPairingProcess] = useState(false); // 페어링/설정 진행 중 상태
  const [pairingStatus, setPairingStatus] = useState<string>(''); // 페어링 진행 상태 메시지
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [supportsZoom, setCameraSupportsZoom] = useState(false);
  const dataRef = useRef(data);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hadUserRef = useRef(false);
  const autoConnectAttemptedRef = useRef(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraFrameRef = useRef<number | null>(null);
  
  const isNative = Capacitor.isNativePlatform();

  // --- Emergency State ---
  const [emergencyStage, setEmergencyStage] = useState(0); // 0: None, 1: Check, 2: Control, 3: Guardian, 4: Dispatch
  const [emergencyTimer, setEmergencyTimer] = useState(0);
  const [contactAttempts, setContactAttempts] = useState<{controlCenter: boolean; guardian: boolean; dispatch: boolean}>({
    controlCenter: false,
    guardian: false,
    dispatch: false
  });
  
  // --- Location State ---
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number, address?: string} | null>(null);
  const [locationHistory, setLocationHistory] = useState<Array<{lat: number, lng: number, timestamp: number}>>([]);
  const lastSendTime = useRef(0);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => {
    if (!user) {
      autoConnectAttemptedRef.current = false;
    }
  }, [user]);

  // --- Emergency Protocol Timer Logic ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (emergencyStage > 0 && emergencyStage < 4 && emergencyTimer > 0) {
      interval = setInterval(() => {
        setEmergencyTimer(prev => prev - 1);
      }, 1000);
    } else if (emergencyStage > 0 && emergencyStage < 4 && emergencyTimer === 0) {
      // Advance stage when timer hits 0
      setEmergencyStage(prev => prev + 1);
      if (emergencyStage === 1) setEmergencyTimer(5); // Control Center Timer
      if (emergencyStage === 2) setEmergencyTimer(5); // Guardian Timer
      if (emergencyStage === 3) setEmergencyTimer(0); // Final Stage (Dispatch)
    }
    return () => clearInterval(interval);
  }, [emergencyStage, emergencyTimer]);

  // --- Location Tracking on Emergency ---
  useEffect(() => {
    if (emergencyStage > 0) {
      // 응급 상황 시작 시 즉시 위치 가져오기
      getCurrentLocation();
      
      // 위치 추적 시작
      const stopTracking = startLocationTracking();
      
      return () => {
        if (stopTracking) stopTracking();
      };
    }
  }, [emergencyStage]);

  // --- Enhanced Battery Optimization ---
  const getDataCollectionInterval = () => {
    // 응급 상황: 1초마다 데이터 수집
    if (emergencyStage > 0) return 1000;
    
    // AI 리포트 생성 중: 5초마다
    if (deviceSettings.realtimeCollectionInterval === 1) return 5000;
    
    // 일반 모드: 설정값에 따라
    return deviceSettings.realtimeCollectionInterval * 1000;
  };

    /**
   * stopCameraScan 관련 처리를 수행합니다.
   */
const stopCameraScan = async () => {
    if (cameraFrameRef.current != null) {
      cancelAnimationFrame(cameraFrameRef.current);
      cameraFrameRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    if (isNative) {
      try {
        await BarcodeScanner.stopScan();
        document.querySelector('body')?.classList.remove('barcode-scanner-active');
      } catch {}
    }
    setIsCameraScanning(false);
  };

    /**
   * toggleZoom 관련 처리를 수행합니다.
   */
const toggleZoom = async () => {
    if (!cameraStreamRef.current) return;
        /**
     * track 관련 처리를 수행합니다.
     */
const track = cameraStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = (track as any).getCapabilities?.() || {};
      if (capabilities.zoom) {
        const newZoom = cameraZoom === 1 ? Math.min(2, capabilities.zoom.max) : 1;
        await (track as any).applyConstraints({ advanced: [{ zoom: newZoom }] });
        setCameraZoom(newZoom);
      }
    } catch (e) {
      console.warn('Zoom 적용 실패:', e);
    }
  };

  const handleQrCodeDetected = (qrText: string) => {
    console.log('Scanned QR Content:', qrText);
    try {
      const mac = starmaxService.parseMacFromQr(qrText);
      if (mac) {
        setDetectedQrMac(mac);
      } else {
        let msg = `QR 코드를 인식했으나 유효한 기기 정보가 없습니다.\n\n[스캔된 내용]\n${qrText}`;
        
        if (qrText.includes('runmefit') && qrText.includes('download')) {
            msg += `\n\n⚠️ 주의: 앱 다운로드용 QR 코드를 스캔하신 것 같습니다.\n워치의 [설정] > [휴대폰 연결] 또는 [QR 코드] 메뉴에서 '기기 연동용' QR 코드를 찾아 스캔해주세요.`;
        } else {
            msg += `\n\n와치 설정의 QR 코드가 맞는지 확인해 주세요.`;
        }
        
        alert(msg);
      }
    } catch (e: any) {
      console.error('카메라 QR 처리 오류:', e);
      alert('QR 인식 중 오류가 발생했습니다: ' + (e.message || '알 수 없는 오류'));
    } finally {
      stopCameraScan();
      setIsScanning(false);
    }
  };

    /**
   * startCameraScan 관련 처리를 수행합니다.
   */
const startCameraScan = async () => {
    if (isNative) {
      try {
        setIsScanning(true);
        setIsCameraScanning(true);
        
        const { camera } = await BarcodeScanner.requestPermissions();
        if (camera === 'granted' || camera === 'limited') {
          document.querySelector('body')?.classList.add('barcode-scanner-active');
          const { barcodes } = await BarcodeScanner.scan();
          
          if (barcodes.length > 0) {
            const content = barcodes[0].rawValue;
            if (content) {
              handleQrCodeDetected(content);
            }
          }
        }
      } catch (e) {
        // 스캔 취소 또는 오류
        console.log('Scanner stopped or error:', e);
      } finally {
        stopCameraScan();
      }
      return;
    }

    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      alert('이 기기에서는 카메라 직접 인식을 지원하지 않습니다.\n하단의 QR 코드로 찾기 버튼을 사용해주세요.');
      return;
    }
    try {
      setIsScanning(true);
      setIsCameraScanning(true);
      setCameraZoom(1); // 초기화
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          focusMode: 'continuous'
        } as any
      });
      
      cameraStreamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      
      if (track) {
        try {
          const capabilities = (track as any).getCapabilities?.() || {};
          setCameraSupportsZoom(!!capabilities.zoom);
          
          const constraints: any = { advanced: [] };
          if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            constraints.advanced.push({ focusMode: 'continuous' });
          }
          if (constraints.advanced.length > 0) {
            await (track as any).applyConstraints(constraints);
          }
        } catch (e) {
          console.warn('고급 카메라 설정 적용 실패:', e);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
            /**
       * scanFrame 관련 처리를 수행합니다.
       */
const scanFrame = async () => {
        if (!isCameraScanning) return;
        const video = videoRef.current;
        const canvas = qrCanvasRef.current;
        if (!video || !canvas) {
          cameraFrameRef.current = requestAnimationFrame(scanFrame);
          return;
        }
        if (video.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
          const width = video.videoWidth;
          const height = video.videoHeight;
          if (width && height) {
            const minDim = Math.min(width, height);
            const regionSize = minDim * 0.7;
            const sx = (width - regionSize) / 2;
            const sy = (height - regionSize) / 2;
            const targetSize = 480;
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(
                video,
                sx,
                sy,
                regionSize,
                regionSize,
                0,
                0,
                targetSize,
                targetSize
              );
              const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
              let qrText = '';
              const code = jsQR(imageData.data, targetSize, targetSize, { inversionAttempts: 'attemptBoth' } as any);
              if (code && (code as any).data) {
                qrText = (code as any).data;
              }
              if (qrText) {
                try {
                  const mac = starmaxService.parseMacFromQr(qrText);
                  if (mac) {
                    setDetectedQrMac(mac);
                  } else {
                    alert('QR 코드를 인식했으나 유효한 기기 정보가 없습니다. 와치 설정의 QR 코드가 맞는지 확인해 주세요.');
                  }
                } catch (e: any) {
                  console.error('카메라 QR 처리 오류:', e);
                  alert('QR 인식 중 오류가 발생했습니다: ' + (e.message || '알 수 없는 오류'));
                } finally {
                  stopCameraScan();
                  setIsScanning(false);
                }
                return;
              }
            }
          }
        }
        cameraFrameRef.current = requestAnimationFrame(scanFrame);
      };
      cameraFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (e: any) {
      console.error('카메라 열기 실패:', e);
      alert('카메라를 열 수 없습니다: ' + (e.message || '알 수 없는 오류'));
      stopCameraScan();
      setIsScanning(false);
    }
  };

  useEffect(() => {
    console.log('Native platform:', Capacitor.isNativePlatform());
    starmaxService.initialize();

    return () => {
      stopCameraScan();
    };
  }, []);

  // --- Enhanced Emergency Detection Logic ---
  const detectEmergency = (currentData: BiometricData): { isEmergency: boolean; severity: 'low' | 'medium' | 'high'; reason: string } => {
    const reasons: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';
    
    // 심박수 체크 (0은 데이터 없음으로 간주하여 무시)
    // 데이터가 0이거나 유효하지 않은 경우 안전장치
    if (!currentData || (currentData.heartRate === 0 && currentData.spO2 === 0)) {
      return { isEmergency: false, severity: 'low', reason: '' };
    }

    if (currentData.heartRate > 0 && (currentData.heartRate < 40 || currentData.heartRate > 150)) {
      reasons.push(currentData.heartRate < 40 ? '심박수가 너무 낮습니다 (브라디카르디아)' : '심박수가 너무 높습니다 (타키카르디아)');
      severity = 'high';
    } else if (currentData.heartRate > 0 && currentData.heartRate > 120) {
      reasons.push('심박수가 높습니다');
      severity = 'medium';
    }
    
    // 산소포화도 체크 (0은 데이터 없음으로 간주하여 무시)
    if (currentData.spO2 > 0 && currentData.spO2 < 90) {
      reasons.push('산소포화도가 위험합니다');
      severity = 'high';
    } else if (currentData.spO2 > 0 && currentData.spO2 < 95) {
      reasons.push('산소포화도가 낮습니다');
      if (severity === 'low') severity = 'medium';
    }
    
    // 체온 체크 (0은 데이터 없음으로 간주하여 무시)
    if (currentData.temperature > 0 && (currentData.temperature < 35 || currentData.temperature > 39)) {
      reasons.push('체온이 비정상입니다');
      if (severity === 'low') severity = 'medium';
    }
    
    // 혈압 체크 (0은 데이터 없음으로 간주하여 무시)
    if (currentData.bloodPressureSys > 0 && (currentData.bloodPressureSys > 180 || currentData.bloodPressureDia > 110)) {
      reasons.push('혈압이 위험합니다');
      severity = 'high';
    }
    
    // 호흡수 체크 (0은 데이터 없음으로 간주하여 무시)
    if (currentData.respiratoryRate > 0 && (currentData.respiratoryRate < 8 || currentData.respiratoryRate > 30)) {
      reasons.push('호흡수가 비정상입니다');
      if (severity === 'low') severity = 'medium';
    }
    
    return {
      isEmergency: reasons.length > 0,
      severity,
      reason: reasons.join(', ')
    };
  };

  // STARMAX BLE 실시간 데이터 수신 처리
  useEffect(() => {
    // 연결이 끊어진 경우 데이터 업데이트 중단
    if (!isPaired) {
      // 데이터 수신 콜백 해제 (필요시)
      // starmaxService.onData(() => {}); // Optional: clear callback
      return;
    }

    const isNative = Capacitor.isNativePlatform();

    // STARMAX BLE 데이터 수신 콜백 설정
    starmaxService.onData(async (realTimeData) => {
      console.log('Received RealTime Data:', JSON.stringify(realTimeData));
      
      // 연결 상태 재확인 (비동기 콜백 실행 시점 방어)
      if (!isPaired) return;

      setData(prev => ({
        ...prev,
        heartRate: realTimeData.heartRate,
        bloodPressureSys: realTimeData.bloodPressureSys,
        bloodPressureDia: realTimeData.bloodPressureDia,
        spO2: realTimeData.spO2,
        temperature: realTimeData.temperature,
        glucose: realTimeData.glucose,
        steps: realTimeData.steps,
        sleep: realTimeData.sleep,
        stress: realTimeData.stress,
        respiratoryRate: realTimeData.respiratoryRate,
        hrv: realTimeData.hrv,
        timestamp: realTimeData.timestamp
      }));
      
      // 배터리 상태 업데이트
      setDeviceSettings(prev => ({ ...prev, lastSync: Date.now() }));

      // 응급 상황 감지 (즉시 전송 판단용)
      // realTimeData와 BiometricData 타입 호환성 활용
      const emergencyCheck = detectEmergency(realTimeData as unknown as BiometricData);
      
      // 전송 로직: 응급상황이거나, 설정된 전송 주기가 지났을 때 전송
      const now = Date.now();
      const sendInterval = deviceSettings.realtimeCollectionInterval * 1000;
      const shouldSend = emergencyCheck.isEmergency || (now - lastSendTime.current >= sendInterval);

      if (shouldSend && backendService.getToken()) {
        try {
          const response = await backendService.sendBiometricData({
            heartRate: realTimeData.heartRate,
            bloodPressureSys: realTimeData.bloodPressureSys,
            bloodPressureDia: realTimeData.bloodPressureDia,
            spO2: realTimeData.spO2,
            temperature: realTimeData.temperature,
            bloodSugar: realTimeData.glucose,
            steps: realTimeData.steps,
            sleep: realTimeData.sleep,
            stress: realTimeData.stress,
            respiratoryRate: realTimeData.respiratoryRate,
            hrv: realTimeData.hrv,
            timestamp: new Date(realTimeData.timestamp).toISOString()
          });
          
          if (response.success) {
             lastSendTime.current = now;
             if (emergencyCheck.isEmergency) {
                 console.log(`[EMERGENCY] Data sent immediately! Reason: ${emergencyCheck.reason}`);
             }
          } else {
            console.warn('백엔드 데이터 전송 실패:', response.error);
          }
        } catch (error) {
          console.error('백엔드 데이터 전송 오류:', error);
        }
      }
    });
    
    // 웹/비네이티브 환경에서만 시뮬레이션 가동
    if (!isNative) {
      starmaxService.startDataSimulation();
      return () => {
        starmaxService.stopDataSimulation();
      };
    }
  }, [isPaired, deviceSettings.realtimeCollectionInterval]); // interval 변경 시 재설정

  useEffect(() => {
    if (!isPaired) return;
    setHistory(prev => {
            /**
       * newPoint 관련 처리를 수행합니다.
       */
const newPoint = {
        time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
        heartRate: data.heartRate,
        stress: data.stress
      };
      const newHistory = [...prev, newPoint];
      if (newHistory.length > 20) newHistory.shift();
      return newHistory;
    });
  }, [data, isPaired]);



  useEffect(() => {
    if (!isPaired) return;
    
    const fetchReport = async () => {
      const emergencyCheck = detectEmergency(dataRef.current);
      const isLikelyEmpty =
        dataRef.current.heartRate === 0 &&
        dataRef.current.steps === 0 &&
        dataRef.current.spO2 === 0 &&
        dataRef.current.temperature === 0;
      if (isLikelyEmpty && !emergencyCheck.isEmergency) {
        return;
      }

      const reportText = await llmService.generateRealtimeComment(dataRef.current);
      const isDanger =
        emergencyCheck.isEmergency ||
        reportText.includes('위험') ||
        reportText.includes('응급');
      const bpText =
        dataRef.current.bloodPressureSys === 0
          ? '--/--'
          : `${dataRef.current.bloodPressureSys}/${dataRef.current.bloodPressureDia}`;
      const vitalsLine = `현재 심박수 ${dataRef.current.heartRate || 0}bpm, SpO2 ${dataRef.current.spO2 || 0}%, 혈압 ${bpText}`;
      
      const newReport: ReportItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        content: emergencyCheck.isEmergency
          ? `${emergencyCheck.reason}\n${vitalsLine}\n${reportText}`
          : `${vitalsLine}\n${reportText}`,
        status: emergencyCheck.isEmergency
          ? 'danger'
          : reportText.includes('주의') || reportText.includes('높음')
            ? 'warning'
            : 'normal'
      };
      setReportHistory(prev => [newReport, ...prev]);

      // Enhanced Emergency Protocol
      // AI 분석 결과만으로는 응급 상황을 트리거하지 않도록 변경 (오탐지 방지)
      // 오직 명시적인 센서 데이터 임계치 초과(emergencyCheck.isEmergency)일 때만 트리거
      if (emergencyCheck.isEmergency && emergencyStage === 0) {
        setEmergencyStage(1);
        // 심각도에 따라 타이머 조정
        setEmergencyTimer(emergencyCheck.severity === 'high' ? 10 : 15);
      } 
      // else if (isDanger && emergencyStage === 0) { ... } // AI 텍스트 기반 트리거 제거
    };
    fetchReport();
        /**
     * interval 관련 처리를 수행합니다.
     */
const interval = setInterval(fetchReport, 30000); 
    return () => clearInterval(interval);
  }, [isPaired, emergencyStage]);

  const [isLoading, setIsLoading] = useState(false);
  const [debugServerUrl, setDebugServerUrl] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  /**
   * 비밀번호 재설정 - SMS 인증코드 요청 (1단계)
   */
  const handleResetRequestCode = async () => {
    setResetError('');
    setResetMessage('');
    if (!resetEmail || !resetPhone) {
      setResetError('이메일과 전화번호를 모두 입력해주세요.');
      return;
    }
    setResetSending(true);
    try {
      const data = await backendService.apiRequest('/mobile/reset-password/send-code', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, phone: resetPhone }),
      });
      if (data.success) {
        setResetMessage(data.message || '');
        setResetMaskedPhone(data.maskedPhone || '');
        setResetStep('verify');
      } else {
        setResetError(data.message || '인증코드 발송에 실패했습니다.');
      }
    } catch {
      setResetError('서버 연결에 실패했습니다.');
    } finally {
      setResetSending(false);
    }
  };

  /**
   * 비밀번호 재설정 - 인증코드 확인 후 비밀번호 변경 (2단계)
   */
  const handleResetPassword = async () => {
    setResetError('');
    setResetMessage('');
    if (!resetCode || !resetNewPassword || !resetNewPasswordConfirm) {
      setResetError('모든 필드를 입력해주세요.');
      return;
    }
    if (resetNewPassword.length < 6) {
      setResetError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (resetNewPassword !== resetNewPasswordConfirm) {
      setResetError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setResetSending(true);
    try {
      const data = await backendService.apiRequest('/mobile/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: resetEmail,
          phone: resetPhone,
          code: resetCode,
          newPassword: resetNewPassword,
        }),
      });
      if (data.success) {
        setResetMessage(data.message || '');
        setTimeout(() => {
          resetResetForm();
          setAuthMode('login');
        }, 2000);
      } else {
        setResetError(data.message || '비밀번호 재설정에 실패했습니다.');
      }
    } catch {
      setResetError('서버 연결에 실패했습니다.');
    } finally {
      setResetSending(false);
    }
  };

  /** 비밀번호 재설정 폼 초기화 */
  const resetResetForm = () => {
    setResetStep('request');
    setResetEmail('');
    setResetPhone('');
    setResetCode('');
    setResetNewPassword('');
    setResetNewPasswordConfirm('');
    setResetMessage('');
    setResetError('');
    setResetMaskedPhone('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      alert("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    // 개발용 서버 URL 오버라이드
    if (debugServerUrl) {
      backendService.setBaseURL(debugServerUrl);
    }

    setIsLoading(true);
    try {
      // 백엔드 로그인 API 호출 (타임아웃 적용)
      const response = await Promise.race([
        backendService.login(loginEmail, loginPassword, isAutoLogin),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('서버 응답 시간 초과 (10초)')), 10000))
      ]);
      
      if (!response) {
        throw new Error('서버로부터 응답을 받을 수 없습니다.');
      }
      
      const responseData = (response as any).data || response;
      
      if (response.success && responseData.user) {
        const serverUser = responseData.user;
        setUser({
          email: serverUser.email,
          name: serverUser.name,
          id: serverUser.id
        });

        // ... (기존 로직 유지) ...
        const cached = await backendService.getCachedLoginAsync();
        const cachedUser = cached?.user;
        const linkedDevice = serverUser.starmaxDevice || cachedUser?.starmaxDevice;

        if (linkedDevice) {
          setForcePairing(false);
          setDeviceSettings(prev => ({
            ...prev,
            deviceName: linkedDevice.deviceName || linkedDevice.name || 'STARMAX Device',
            deviceId: linkedDevice.deviceId || prev.deviceId,
            modelNumber: linkedDevice.modelNumber || prev.modelNumber || 'Unknown Model',
            manufacturer: linkedDevice.manufacturer || prev.manufacturer || 'Starmax',
            firmwareVersion: linkedDevice.firmwareVersion || prev.firmwareVersion || '1.0.0',
            initialSyncComplete: true
          }));
          setData(INITIAL_DATA);
          setActiveTab('home');
        } else {
          setIsPaired(false);
          setForcePairing(true);
          setDeviceSettings(prev => ({
            ...prev,
            deviceId: '',
            deviceName: '',
            modelNumber: '',
            manufacturer: '',
            firmwareVersion: '',
            batteryLevel: 0,
            lastSync: 0,
            initialSyncComplete: false,
          }));
          setData(INITIAL_DATA);
          setActiveTab('home');
        }
      } else {
        alert((response as any).message || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      alert(`로그인 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

    /**
   * handleLogout 관련 처리를 수행합니다.
   */
const handleLogout = () => {
    backendService.logout();
    setUser(null);
    setIsPaired(false);
    setForcePairing(false);
    setScanResults([]);
    setDeviceSettings(INITIAL_DEVICE_SETTINGS);
    setActiveTab('home');
    setAuthMode('login');
  };

    /**
   * handleSignupFull 관련 처리를 수행합니다.
   */
const handleSignupFull = (formData: any) => {
    // 회원가입 후 자동 로그인 처리 시 세션 초기화 확실히 수행
    backendService.logout(); // 이전 세션 혹시 남아있다면 제거
    setIsPaired(false); // 새 계정이므로 기기 연동 상태 초기화
    setForcePairing(true);
    
    setUser({ 
      email: formData.email,
      name: formData.name || '사용자',
      id: 'new-user-' + Date.now()
    });
    setAuthMode('login');
    setActiveTab('home'); // isPaired가 false이므로 기기 연동 화면으로 이동됨
  };

  // 로그인 화면 진입 시 이전 세션 정리 (초기 마운트는 제외)
  useEffect(() => {
    if (user) {
      hadUserRef.current = true;
      return;
    }
    if (!hadUserRef.current) {
      return;
    }
    backendService.logout();
    setIsPaired(false);
    setDeviceSettings(INITIAL_DEVICE_SETTINGS);
    setScanResults([]);
    setData(INITIAL_DATA);
    starmaxService.disconnectDevice().catch(console.error);
  }, [user]);

  // 앱 시작 시 캐시된 로그인 및 기기 연동 상태 복원
  useEffect(() => {
    if (user) return;
    // 개발 디버깅: 웹에서는 로그인 캐시 초기화
    if (!Capacitor.isNativePlatform() && typeof localStorage !== 'undefined') {
      localStorage.removeItem('mobile_last_login');
    }
        /**
     * restore 관련 처리를 수행합니다.
     */
const restore = async () => {
      try {
        const cached = await backendService.getCachedLoginAsync();
        if (!cached || !cached.user) return;
        const cachedUser = cached.user;
        setUser({
          email: cachedUser.email,
          name: cachedUser.name,
          id: cachedUser.id
        });

        const linkedDevice = cachedUser.starmaxDevice;
        if (linkedDevice) {
          setForcePairing(false);
          setDeviceSettings(prev => ({
            ...prev,
            deviceName: linkedDevice.deviceName || linkedDevice.name || 'STARMAX Device',
            deviceId: linkedDevice.deviceId || prev.deviceId,
            modelNumber: linkedDevice.modelNumber || prev.modelNumber || 'Unknown Model',
            manufacturer: linkedDevice.manufacturer || prev.manufacturer || 'Starmax',
            firmwareVersion: linkedDevice.firmwareVersion || prev.firmwareVersion || '1.0.0',
            initialSyncComplete: true
          }));
        }
      } catch (e) {
        console.error('로그인 캐시 복원 실패', e);
      }
    };
    restore();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (isPaired) return;
    if (isConnecting) return;
    if (autoConnectAttemptedRef.current) return;
    if (!deviceSettings.deviceId && !deviceSettings.deviceName) return;
        /**
     * userAny 관련 처리를 수행합니다.
     */
const userAny = user as any;
    if (!userAny.starmaxDevice) {
      // 사용자 프로필에 기기 정보가 없다면, deviceSettings에 남아있더라도 무시 (캐시 불일치 방지)
      setDeviceSettings(INITIAL_DEVICE_SETTINGS);
      return;
    }
    autoConnectAttemptedRef.current = true;

    const attempt = async () => {
      try {
        setIsConnecting(true);
        const candidate: StarmaxDevice = {
          id: deviceSettings.deviceId || 'UNKNOWN',
          name: deviceSettings.deviceName || 'STARMAX Device',
          rssi: -50,
          isConnected: false,
          modelNumber: deviceSettings.modelNumber,
          manufacturer: deviceSettings.manufacturer,
          firmwareVersion: deviceSettings.firmwareVersion,
          batteryLevel: deviceSettings.batteryLevel
        };
        const response = await starmaxService.connectDevice(candidate);
        if (response.success && response.data) {
          const waitForPairing = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('PAIRING_TIMEOUT'));
            }, 15000);
            starmaxService.onPairingSuccess(() => {
              clearTimeout(timeout);
              resolve();
            });
          });
          try {
            await waitForPairing;
          } catch (e) {
            return;
          }
          const connectedDevice = response.data;
          let batteryLevel = connectedDevice.batteryLevel || deviceSettings.batteryLevel || 100;
          setIsPaired(true);
          setForcePairing(false);
          setDeviceSettings(prev => ({
            ...prev,
            deviceName: connectedDevice.name,
            deviceId: connectedDevice.id,
            modelNumber: connectedDevice.modelNumber || prev.modelNumber || 'Unknown Model',
            manufacturer: connectedDevice.manufacturer || prev.manufacturer || 'Starmax',
            firmwareVersion: connectedDevice.firmwareVersion || prev.firmwareVersion || '1.0.0',
            batteryLevel,
            initialSyncComplete: true
          }));
          setActiveTab('home');
          return;
        }
      } catch (e) {
        console.error('자동 재연결 실패:', e);
      } finally {
        setIsConnecting(false);
      }
    };
    attempt();
  }, [user, isPaired, isConnecting, deviceSettings.deviceId, deviceSettings.deviceName]);

    /**
   * startScan 관련 처리를 수행합니다.
   */
const startScan = async () => {
    setIsScanning(true);
    setScanResults([]);
    
    try {
      // STARMAX BLE 기기 스캐닝
      const devices = await starmaxService.scanForDevices();
      setScanResults(devices);
    } catch (error: any) {
      console.error('STARMAX BLE 스캐닝 오류:', error);
      // 백업: 시뮬레이션 데이터 제거 (실제 연동을 위해)
      setScanResults([]);
      // 사용자에게 구체적인 에러 알림
      const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
      alert(`기기 검색 중 오류: ${errorMessage}\n\n(웹 브라우저라면 블루투스가 켜져 있는지, 지원되는 브라우저인지 확인해주세요)`);
    } finally {
      setIsScanning(false);
    }
  };

  // --- Auto Connect on Pairing Screen (Native Only) ---
  // 로그인 직후 자동 연결 시도 시 권한 문제로 앱 크래시 발생 가능성 있어 비활성화
  // 사용자가 명시적으로 '기기 연결하기' 버튼을 눌렀을 때만 수행하도록 변경
  /*
  useEffect(() => {
    if (forcePairing && !isPaired && !isScanning && !isConnecting) {
      const attemptAutoConnect = async () => {
        // 네이티브 환경에서만 자동 연결 시도
        if (Capacitor.isNativePlatform()) {
          console.log('Native pairing screen active: attempting auto-connect...');
          setIsConnecting(true);
          
          try {
            // 1. 자동 연결 시도 (StarmaxSdkPlugin 내부 리스트 사용)
            const connectedDevice = await starmaxService.autoConnect();
            
            if (connectedDevice) {
              console.log('Auto-connect successful:', connectedDevice);
              setIsPaired(true);
              setForcePairing(false);
              
              // 연결된 기기 정보 업데이트 (UI 표시용)
              setDeviceSettings(prev => ({
                ...prev,
                deviceName: connectedDevice.name,
                deviceId: connectedDevice.id,
                manufacturer: connectedDevice.manufacturer || 'Starmax',
                modelNumber: connectedDevice.modelNumber || 'Unknown',
                firmwareVersion: connectedDevice.firmwareVersion || '1.0.0'
              }));
              
            } else {
              // 2. 실패 시 일반 스캔으로 전환
              console.log('Auto-connect failed, switching to manual scan...');
              setIsConnecting(false); // startScan에서 다시 true로 설정됨
              startScan();
            }
          } catch (e) {
            console.error('Auto connect process error:', e);
            setIsConnecting(false);
            startScan();
          } finally {
            if (!isPaired) {
               // 연결 실패 후 startScan 호출 전/후 상태 관리
            }
          }
        }
      };
      
      // 화면 전환 애니메이션 등을 고려하여 약간의 지연 후 실행
      const timer = setTimeout(attemptAutoConnect, 500);
      return () => clearTimeout(timer);
    }
  }, [forcePairing, isPaired]);
  */

  // QR 코드로 기기 찾기
  const startQrScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const files = target && target.files ? target.files : null;
        /**
     * file 관련 처리를 수행합니다.
     */
const file = files && files.length > 0 ? files[0] : null;
    if (!file) {
      console.log('파일이 선택되지 않았습니다.');
      return;
    }

    try {
      setIsScanning(true);
      // 즉각적인 반응을 위해 알림 표시 (디버깅 겸용)
      console.log('이미지 분석 시작...', file.name);
      
      // 1. 이미지를 캔버스에 그리기 위해 썸네일 형태로 압축 (성능 및 메모리 확보)
      const reader = new FileReader();
      const imageData: string = await new Promise((resolve, reject) => {
        reader.onload = (event) => {
                    /**
           * result 관련 처리를 수행합니다.
           */
const result = event && event.target ? event.target.result : null;
          resolve(result as string);
        };
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsDataURL(file);
      });

            /**
       * img 관련 처리를 수행합니다.
       */
const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = imageData;
      });

      // 2. 고해상도 이미지는 웹에서 느리므로 리사이징 (하지만 너무 작으면 인식률 저하)
      const MAX_SIZE = 1000;
      let width = img.width;
      let height = img.height;
      
      console.log('원본 이미지 크기:', width, 'x', height);

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      console.log('리사이징 크기:', width, 'x', height);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d'); // willReadFrequently 옵션 제거 (호환성)
      if (!context) throw new Error('Canvas 생성 실패');

      context.drawImage(img, 0, 0, width, height);
      const canvasImageData = context.getImageData(0, 0, width, height);
      
      let qrText = '';

      const code = jsQR(canvasImageData.data, width, height, { inversionAttempts: "attemptBoth" } as any);
      if (code && (code as any).data) {
        qrText = (code as any).data;
        console.log('jsQR 인식 성공:', qrText);
      } else {
        console.log('jsQR 인식 실패');
      }

      if (!qrText && 'BarcodeDetector' in window) {
        console.log('백업 엔진(BarcodeDetector) 가동...');
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(img);
          if (barcodes && barcodes.length > 0) qrText = barcodes[0].rawValue;
        } catch (err) {
          console.warn('백업 엔진 실패');
        }
      }

      // 4. 결과 도출
      if (qrText) {
        console.log('인식 성공:', qrText);
        const mac = starmaxService.parseMacFromQr(qrText);
        if (mac) {
          console.log('MAC 추출 성공:', mac);
          setDetectedQrMac(mac);
          
          // 네이티브 앱 환경이면 즉시 연결 시도
          if (Capacitor.isNativePlatform()) {
            console.log('[Native] Automatically starting connection for:', mac);
            setTimeout(async () => {
              try {
                setIsConnecting(true);
                const devices = await starmaxService.scanWithMacFilter(mac);
                if (devices.length > 0) {
                  setScanResults(devices);
                  setDetectedQrMac(null);
                  if (devices.length === 1) {
                    await connectDevice(devices[0]);
                  }
                } else {
                  console.log('MAC 기반 스캔 실패, 일반 검색으로 전환:', mac);
                  setIsScanning(false);
                  await startScan();
                }
              } catch (err) {
                console.error('자동 연결 오류:', err);
                alert('블루투스 연결 시도 중 오류가 발생했습니다.');
              } finally {
                setIsConnecting(false);
              }
            }, 100);
          }
          return;
        } else {
          console.log('MAC 추출 실패, 일반 검색으로 전환:', qrText);
          setIsScanning(false);
          await startScan();
          return;
        }
      }
      
      alert('QR 코드를 인식하지 못했습니다.\n\n팁:\n1. 와치 화면을 밝게 해주세요.\n2. 카메라를 QR 코드에 가까이 가져가 초점을 맞춰주세요.\n3. 빛 반사가 없는 곳에서 촬영해 주세요.');
    } catch (error: any) {
      console.error('QR 처리 오류:', error);
      alert('인식 과정에서 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsScanning(false);
      if (e.target) e.target.value = '';
    }
  };

  // 수동 입력 공통 함수
  const handleManualMacInput = (reason: string) => {
        /**
     * manualMac 관련 처리를 수행합니다.
     */
const manualMac = prompt(`${reason}\n\n와치 설정의 [기기 정보(About)]에 있는 MAC 주소를 입력해 주세요.\n(예: 71:F9:7A:...)`);
    if (manualMac) {
      const mac = starmaxService.parseMacFromQr(manualMac);
      if (mac) {
        starmaxService.scanWithMacFilter(mac).then(devices => {
          if (devices.length > 0) setScanResults(devices);
        });
      } else {
        alert('올바른 MAC 주소 형식이 아닙니다.');
      }
    }
  };

  const connectDevice = async (device: StarmaxDevice, skipPair = false) => {
    // 모든 검색된 기기에 대해 연결 시도 허용 (필터는 스캔 단계에서 이미 적용됨)
    try {
      setIsConnecting(true);
      setPairingStatus('기기 연결 중...');
      setIsPairingProcess(true);
      console.log('기기 연결 시도:', device.name, device.id, 'skipPair=', skipPair);
      
      // STARMAX BLE 기기 연결
      const response = skipPair
        ? await starmaxService.connectSkipPair(device)
        : await starmaxService.connectDevice(device);
        
      if (response.success && response.data) {
        setPairingStatus('기기 설정 및 페어링 확인 중...');
        
        // 페어링 완료 이벤트를 기다림 (최대 15초)
        const waitForPairing = new Promise<void>((resolve, reject) => {
          // 3초 후 일반 페어링 반응 없으면 GTS10 페어링 시도 (안정화 시간 확보)
          const gts10Timeout = setTimeout(async () => {
             console.log('General pairing timeout (3s), trying GTS10 pairing fallback...');
             try {
               const success = await starmaxService.tryPairGts10();
               if (success) {
                 console.log('GTS10 pairing success!');
                 // 성공 시 onPairingSuccess 콜백이 호출되어 resolve됨
               }
             } catch (e) {
               console.warn('GTS10 fallback failed', e);
             }
          }, 3000);

          const timeout = setTimeout(() => {
             console.warn('Pairing event timeout');
             reject(new Error('PAIRING_TIMEOUT'));
          }, 15000);
          
          starmaxService.onPairingSuccess(() => {
            console.log('Pairing success event received!');
            clearTimeout(timeout);
            clearTimeout(gts10Timeout);
            resolve();
          });
        });

        try {
          await waitForPairing;
        } catch (e) {
          setPairingStatus('워치에서 페어링 승인을 완료한 뒤 [설정 재시도]를 눌러주세요.');
          setIsConnecting(false);
          return;
        }
        setPairingStatus('설정 완료! 곧 시작합니다.');
        await new Promise(r => setTimeout(r, 1000));

        const connectedDevice = response.data;
        const starmaxDeviceInfo = {
          deviceId: connectedDevice.id,
          deviceName: connectedDevice.name || 'STARMAX Device',
          deviceType: 'watch' as const,
          firmwareVersion: connectedDevice.firmwareVersion || '1.0.0'
        };
        let batteryLevel = connectedDevice.batteryLevel || 100;
        if (Capacitor.isNativePlatform()) {
          try {
            const power = await starmaxService.getBatteryInfo();
            if (power != null) {
              batteryLevel = power;
            }
          } catch (e) {
            console.error('배터리 정보 조회 실패:', e);
          }
        }
        setIsPaired(true);
        setForcePairing(false);
        setIsPairingProcess(false);
        setDeviceSettings(prev => ({ 
          ...prev, 
          deviceName: connectedDevice.name,
          deviceId: connectedDevice.id,
          modelNumber: connectedDevice.modelNumber || 'Unknown Model',
          manufacturer: connectedDevice.manufacturer || 'Starmax',
          firmwareVersion: connectedDevice.firmwareVersion || '1.0.0',
          batteryLevel,
          initialSyncComplete: true,
          consentAutoReport: true,
          consentLocation: true,
          consentAlgorithm: true,
        }));
        if (user) {
          const updatedUser: any = { ...user, starmaxDevice: starmaxDeviceInfo };
          setUser(updatedUser);
        }
        await backendService.updateCachedStarmaxDeviceAsync(starmaxDeviceInfo);
        if (backendService.getToken()) {
          try {
            await backendService.connectStarmaxDevice({
              deviceId: starmaxDeviceInfo.deviceId,
              deviceName: starmaxDeviceInfo.deviceName,
              deviceType: starmaxDeviceInfo.deviceType,
              firmwareVersion: starmaxDeviceInfo.firmwareVersion
            });
          } catch (e) {
            console.error('백엔드 STARMAX 기기 등록 실패:', e);
          }
        }
        setActiveTab('home');
      } else {
        alert('기기 연결 실패: ' + (response.error || 'Unknown error'));
        setIsPairingProcess(false);
      }
    } catch (error) {
      console.error('STARMAX 기기 연결 오류:', error);
      alert('기기 연결 중 오류가 발생했습니다.');
      setIsPairingProcess(false);
    } finally {
      setIsConnecting(false);
    }
  };

    /**
   * skipPairing 관련 처리를 수행합니다.
   */
const skipPairing = () => { 
    // 건너뛰기 시 가짜 데이터 생성 안 함
    // setIsPaired(false); // 이미 false임
    setForcePairing(false);
    setActiveTab('home'); 
    // starmaxService.startDataSimulation(); // 시뮬레이션 제거
  };
  
    /**
   * handleProfileSave 관련 처리를 수행합니다.
   */
const handleProfileSave = (updatedProfile: UserProfile, updatedSettings?: DeviceSettings) => { 
    setUserProfile(updatedProfile); 
    if (updatedSettings) {
      setDeviceSettings(updatedSettings);
    }
    setProfileView('main'); 
  };
  
    /**
   * handleDeviceSettingsSave 관련 처리를 수행합니다.
   */
const handleDeviceSettingsSave = async (updatedSettings: DeviceSettings) => { 
    try {
      // STARMAX BLE 건강 제어 설정
      if (isPaired) {
        const response = await starmaxService.setHealthControl({
          heartRate: true,
          bloodPressure: true,
          bloodOxygen: true,
          temp: true,
          steps: true,
          bloodSugar: true
        });
        
        if (!response.success) {
          console.error('STARMAX 건강 제어 설정 실패:', response.error);
        }
      }
      
      setDeviceSettings(updatedSettings); 
      setProfileView('main'); 
    } catch (error) {
      console.error('기기 설정 저장 오류:', error);
      alert('기기 설정 저장 중 오류가 발생했습니다.');
    }
  };

    /**
   * handleDeviceDisconnect 관련 처리를 수행합니다.
   */
const handleDeviceDisconnect = async () => {
    try {
      // 1. UI 상태 즉시 초기화 (사용자 피드백 우선)
      setIsPaired(false);
      // 기기 정보만 초기화하고, 동의/주기 설정(consent*, interval)은 유지
      setDeviceSettings(prev => ({
        ...prev,
        deviceId: '',
        deviceName: '',
        modelNumber: '',
        manufacturer: '',
        firmwareVersion: '',
        batteryLevel: 0,
        lastSync: 0,
        initialSyncComplete: false,
      }));
      setScanResults([]);
      setForcePairing(false);
      
      // 생체 데이터 화면 초기화 (0으로 리셋)
      setData(INITIAL_DATA);
      
      // 사용자 객체에서 기기 정보 제거
      if (user) {
        const updatedUser = { ...user };
        // @ts-ignore: starmaxDevice property handling
        delete updatedUser.starmaxDevice;
        setUser(updatedUser);
      }

      // 2. 서비스 및 백엔드 연동 해제 (비동기 처리)
      // STARMAX BLE 기기 연결 해제
      await starmaxService.disconnectDevice();
      
      if (backendService.getToken()) {
        try {
          await backendService.disconnectStarmaxDevice();
        } catch (e) {
          console.error('백엔드 STARMAX 기기 연결 해제 실패:', e);
        }
      }
    } catch (error) {
      console.error('STARMAX 기기 연결 해제 오류:', error);
      alert('기기 연결 해제 중 오류가 발생했습니다.');
    } finally {
      // 기기 해제 이후에는 세션도 종료하여, 앱 재시작 시 로그인/연동 플로우가 다시 시작되도록 처리
      backendService.logout();
      setUser(null);
      setAuthMode('login');
      // setActiveTab('home')은 로그인 화면이 보여야 하므로 의미 없음. 
      // renderContent()에서 user가 null이면 자동으로 로그인/가입 화면을 보여주므로 별도 탭 이동 불필요
      setProfileView('main'); // 프로필 화면 뷰 초기화
      setForcePairing(false);
    }
  };

    /**
   * handleImageUpload 관련 처리를 수행합니다.
   */
const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        /**
     * target 관련 처리를 수행합니다.
     */
const target = e.target;
    const files = target && target.files ? target.files : null;
    const file = files && files.length > 0 ? files[0] : null;
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);
    }
  };

  // Manual Trigger for Demo Purposes
  const triggerManualEmergency = async () => {
    setEmergencyStage(1);
    setEmergencyTimer(15);
    // 연락 시도 상태 초기화
    setContactAttempts({ controlCenter: false, guardian: false, dispatch: false });
    
    // 백엔드로 응급 상황 신고
    if (backendService.getToken()) {
      try {
        const response = await backendService.reportEmergency({
          emergencyLevel: 3,
          description: '사용자 수동 응급 신고',
          location: currentLocation,
        });
        
        if (response.success) {
          console.log('응급 상황 신고 성공:', response.data);
          try {
            const reportText = await llmService.generateRealtimeComment(dataRef.current);
            const bpText =
              dataRef.current.bloodPressureSys === 0
                ? '--/--'
                : `${dataRef.current.bloodPressureSys}/${dataRef.current.bloodPressureDia}`;
            const vitalsLine = `현재 심박수 ${dataRef.current.heartRate || 0}bpm, SpO2 ${dataRef.current.spO2 || 0}%, 혈압 ${bpText}`;
            const newReport: ReportItem = {
              id: `${Date.now()}-manual-emergency`,
              timestamp: Date.now(),
              content: `사용자 수동 응급 신고\n${vitalsLine}\n${reportText}`,
              status: 'danger',
            };
            setReportHistory((prev) => [newReport, ...prev]);
          } catch {}
        } else {
          console.warn('응급 상황 신고 실패:', response.error);
        }
      } catch (error) {
        console.error('응급 상황 신고 오류:', error);
      }
    }
  };

  // --- Enhanced Contact Management ---
  const updateContactAttempt = (type: 'controlCenter' | 'guardian' | 'dispatch', success: boolean) => {
    setContactAttempts(prev => ({ ...prev, [type]: success }));
    
    if (!success) {
      // 연락 실패 시 다음 단계로 빠르게 진행
      if (type === 'controlCenter' && emergencyStage === 2) {
        setEmergencyTimer(Math.max(1, emergencyTimer - 2)); // 2초 단축
      } else if (type === 'guardian' && emergencyStage === 3) {
        setEmergencyTimer(Math.max(1, emergencyTimer - 2)); // 2초 단축
      }
    }
  };

  // --- Enhanced Location Tracking ---
  const getCurrentLocation = async () => {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      });
      
      const locationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: Date.now()
      };
      
      setCurrentLocation(locationData);
      
      // 위치 히스토리에 추가 (응급 상황 시 사용)
      if (emergencyStage > 0) {
        setLocationHistory(prev => [...prev, locationData].slice(-10)); // 최근 10개 위치만 저장
      }
      
      return locationData;
    } catch (error) {
      console.error('위치 정보를 가져올 수 없습니다:', error);
      return null;
    }
  };

    /**
   * startLocationTracking 관련 처리를 수행합니다.
   */
const startLocationTracking = () => {
    // 응급 상황 시에만 위치 추적 활성화
    if (emergencyStage > 0) {
            /**
       * interval 관련 처리를 수행합니다.
       */
const interval = setInterval(async () => {
        await getCurrentLocation();
      }, 30000); // 30초마다 위치 업데이트
      
      return () => clearInterval(interval);
    }
  };

  /** 비밀번호 재설정 화면 */
  const renderResetPasswordScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 bg-slate-50">
      <div className="w-full max-w-sm">
        <button
          onClick={() => { resetResetForm(); setAuthMode('login'); }}
          className="mb-6 text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1"
        >
          ← 로그인으로 돌아가기
        </button>
        <h2 className="text-2xl font-semibold text-slate-800 mb-6">비밀번호 재설정</h2>

        {resetStep === 'request' ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">가입 시 등록한 이메일과 전화번호를 입력해주세요.</p>
            <div>
              <label className="text-[12px] font-medium text-slate-500 uppercase tracking-widest ml-1">이메일</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="example@health.com"
                className="w-full px-5 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none mt-1"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-500 uppercase tracking-widest ml-1">전화번호</label>
              <input
                type="tel"
                value={resetPhone}
                onChange={(e) => setResetPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full px-5 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none mt-1"
              />
            </div>
            {resetError && <p className="text-[13px] text-rose-500">{resetError}</p>}
            <button
              onClick={handleResetRequestCode}
              disabled={resetSending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-medium shadow-lg shadow-indigo-900/10 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {resetSending ? '발송 중...' : '인증코드 발송'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {resetMessage && <p className="text-[13px] text-emerald-600 bg-emerald-50 p-3 rounded-xl">{resetMessage}</p>}
            <p className="text-sm text-slate-500">{resetMaskedPhone}로 발송된 6자리 인증코드를 입력해주세요.</p>
            <div>
              <label className="text-[12px] font-medium text-slate-500 uppercase tracking-widest ml-1">인증코드</label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                className="w-full px-5 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none mt-1 text-center text-xl tracking-[0.5em]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-500 uppercase tracking-widest ml-1">새 비밀번호</label>
              <input
                type="password"
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="6자 이상"
                className="w-full px-5 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none mt-1"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-500 uppercase tracking-widest ml-1">새 비밀번호 확인</label>
              <input
                type="password"
                value={resetNewPasswordConfirm}
                onChange={(e) => setResetNewPasswordConfirm(e.target.value)}
                placeholder="비밀번호 재입력"
                className="w-full px-5 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none mt-1"
              />
            </div>
            {resetError && <p className="text-[13px] text-rose-500">{resetError}</p>}
            <button
              onClick={handleResetPassword}
              disabled={resetSending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-medium shadow-lg shadow-indigo-900/10 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {resetSending ? '처리 중...' : '비밀번호 변경'}
            </button>
            <p className="text-center text-[12px] text-slate-400">
              코드가 오지 않았나요?{' '}
              <button onClick={handleResetRequestCode} className="text-indigo-500 underline" disabled={resetSending}>
                재발송
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAuthScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 bg-slate-50 transition-colors duration-500">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-900/10 rotate-12 transform hover:rotate-0 transition-transform duration-300">
          <Siren className="text-white" size={40} />
        </div>
        <h1 className="text-3xl font-light tracking-[0.2em] text-slate-900">GOLDENTIME</h1>
        <p className="text-slate-500 mt-2 font-light text-sm">내손안의 지킴이</p>
        <button 
          onClick={() => setShowDebug(!showDebug)} 
          className="mt-2 text-[12px] text-slate-300 hover:text-slate-500"
        >
          Server Settings
        </button>
      </div>

      {showDebug && (
        <div className="w-full max-w-sm mb-4 p-4 bg-slate-100 rounded-xl animate-fade-in-up">
          <label className="text-sm font-bold text-slate-500 mb-2 block">개발 서버 URL 설정</label>
          <div className="flex gap-2 mb-2">
            <input 
              type="text" 
              value={debugServerUrl} 
              onChange={(e) => setDebugServerUrl(e.target.value)} 
              placeholder="http://192.168.x.x:4003/api"
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() => setDebugServerUrl('http://192.168.45.74:4003/api')}
              className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium whitespace-nowrap"
            >
              내 IP 사용
            </button>
          </div>
          <p className="text-[12px] text-slate-400">
            * 실기기(WiFi): <strong>http://192.168.45.74:4003/api</strong><br/>
            * 에뮬레이터: http://10.0.2.2:4003/api<br/>
            * USB 연결: http://127.0.0.1:4003/api (adb reverse 필요)
          </p>
        </div>
      )}

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-5 animate-fade-in-up">
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
          <input 
            required 
            type="email" 
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="example@health.com" 
            className="w-full px-5 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 shadow-sm" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-slate-500 uppercase tracking-widest ml-1">Password</label>
          <input 
            required 
            type="password" 
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="••••••••" 
            className="w-full px-5 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 shadow-sm" 
          />
        </div>

        <div className="flex items-center gap-2 px-1">
          <div 
            className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${isAutoLogin ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}
            onClick={() => setIsAutoLogin(!isAutoLogin)}
          >
            {isAutoLogin && <CheckCircle2 size={14} className="text-white" />}
          </div>
          <label 
            className="text-sm text-slate-600 cursor-pointer select-none"
            onClick={() => setIsAutoLogin(!isAutoLogin)}
          >
            자동 로그인
          </label>
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-medium shadow-lg shadow-indigo-900/10 mt-4 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              <span>로그인 중...</span>
            </>
          ) : (
            '로그인하기'
          )}
        </button>
      </form>
      <div className="mt-10 flex flex-col items-center gap-4">
        <p className="text-sm text-slate-500">계정이 없으신가요?</p>
        <button 
          type="button" 
          onClick={() => setAuthMode('signup')} 
          className="px-8 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"
        >
          회원가입 하기
        </button>
        <button
          type="button"
          onClick={() => { resetResetForm(); setAuthMode('reset-password'); }}
          className="mt-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          비밀번호 찾기
        </button>
      </div>
    </div>
  );

    /**
   * renderPairingScreen 관련 처리를 수행합니다.
   */
const renderPairingScreen = () => {
    const isNative = Capacitor.isNativePlatform();

    return (
      <div className="flex flex-col min-h-screen p-8 bg-slate-50">
        <div className="mb-6">
          <h2 className="text-2xl font-normal text-slate-900">기기 연동</h2>
          <p className="text-slate-500 mt-1">
            {isNative ? '스마트워치를 찾아서 연결합니다.' : '보유하고 계신 스마트워치를 찾아보세요.'}
          </p>
        </div>
        
        <div className="glass-panel p-4 rounded-2xl mb-8 space-y-3">
          <h3 className="font-normal text-slate-800 flex items-center gap-2 text-sm">
            <AlertCircle size={16} className="text-indigo-500"/>연결 가이드
          </h3>
          <ul className="text-xs text-slate-500 space-y-2 leading-relaxed">
            <li className="flex gap-2"><span className="font-normal text-indigo-500">1.</span>스마트워치의 전원이 켜져 있는지 확인해주세요.</li>
            <li className="flex gap-2"><span className="font-normal text-indigo-500">2.</span>휴대폰의 블루투스 기능이 활성화되어 있어야 합니다.</li>
            <li className="flex gap-2"><span className="font-normal text-indigo-500">3.</span>기기를 휴대폰과 10cm 이내로 가까이 위치시켜주세요.</li>
          </ul>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className={`relative mb-12 ${isScanning || isConnecting ? 'animate-pulse' : ''}`}>
            <div className="w-48 h-48 rounded-full border-4 border-dashed border-indigo-200 flex items-center justify-center">
               <div className="w-32 h-32 rounded-full bg-indigo-50 flex items-center justify-center border-2 border-indigo-100">
                 {isConnecting ? (
                   <RefreshCw size={48} className="text-indigo-600 animate-spin" />
                 ) : (
                   <Bluetooth size={48} className="text-indigo-600" />
                 )}
               </div>
            </div>
            {(isScanning || isConnecting) && (
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-4 py-1 rounded-full shadow-sm border border-slate-100 flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin text-indigo-600" />
                <span className="text-[12px] font-medium text-slate-500">
                  {isScanning ? 'QR 분석 중...' : '기기 연결 중...'}
                </span>
              </div>
            )}
          </div>

          {!isScanning && !isConnecting && detectedQrMac && (
            <div className="w-full max-w-xs space-y-4 animate-fade-in-up">
              <div className="bg-white border-2 border-indigo-500 p-6 rounded-3xl text-center shadow-xl shadow-indigo-100">
                <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">와치를 찾았습니다!</h3>
                <p className="text-[11px] text-slate-400 mb-6 font-mono bg-slate-50 py-1 rounded-lg tracking-wider">{detectedQrMac}</p>
                
                <button 
                  disabled={isConnecting}
                  onClick={async () => {
                    try {
                      setIsConnecting(true);
                      console.log('연결 시도 중 (MAC):', detectedQrMac);
                      const devices = await starmaxService.scanWithMacFilter(detectedQrMac);
                      
                      if (devices.length > 0) {
                        setScanResults(devices);
                        setDetectedQrMac(null);
                        if (devices.length === 1) {
                          await connectDevice(devices[0]);
                        }
                      } else {
                        alert('주변에서 해당 와치를 찾을 수 없습니다.\n\n1. 와치 화면이 켜져 있는지 확인\n2. 블루투스가 켜져 있는지 확인\n3. 이미 다른 폰과 연결되어 있다면 해제해주세요.\n\n일반 검색으로 전환합니다.');
                        await startScan();
                      }
                    } catch (error: any) {
                      console.error('기기 검색 오류:', error);
                      alert('연결 준비 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
                    } finally {
                      setIsConnecting(false);
                    }
                  }}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Zap size={18} /> 지금 바로 연결
                </button>
                
                <button 
                  disabled={isConnecting}
                  onClick={() => setDetectedQrMac(null)}
                  className="w-full py-2 mt-4 text-slate-400 text-xs font-normal hover:text-slate-600"
                >
                  다른 QR 코드 찍기
                </button>
                <button
                  disabled={isConnecting}
                  onClick={skipPairing}
                  className="w-full py-2 mt-2 text-slate-500 text-xs font-normal hover:text-slate-700"
                >
                  와치 QR 화면은 그대로 두고 다음 단계로 이동
                </button>
              </div>
              {!isNative && (
                <p className="text-[12px] text-slate-400 text-center leading-relaxed">
                  [지금 바로 연결] 버튼을 누르면 브라우저의<br/>
                  블루투스 기기 선택 창이 나타납니다.
                </p>
              )}
            </div>
          )}

          {!isScanning && !isConnecting && !detectedQrMac && scanResults.length === 0 && (
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button 
                onClick={startScan}
                className="w-full px-8 py-3 bg-indigo-50 text-indigo-600 rounded-full font-normal flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform hover:bg-indigo-100"
              >
                <Search size={16} /> 기기 직접 검색 (블루투스)
              </button>
            </div>
          )}

          {!isScanning && !isConnecting && scanResults.length > 0 && (
            <div className="w-full space-y-3">
              <p className="text-xs font-normal text-slate-400 uppercase tracking-widest mb-2">검색된 기기</p>
              {scanResults.map((device, i) => (
                <div key={i} className="glass-panel p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <Activity size={20} className="text-slate-400" />
                    </div>
                    <span className="font-normal text-slate-700">{device.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => connectDevice(device)} 
                      className="text-sm bg-indigo-600 text-white px-4 py-1 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      연결
                    </button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={async () => {
                   try {
                     const ok = await starmaxService.tryPairGts10();
                     alert(ok ? 'GTS10 페어링 시작/응답 수신(OK)' : 'GTS10 페어링 응답 없음/실패');
                   } catch (e: any) {
                     alert('GTS10 페어링 호출 실패: ' + e.message);
                   }
                }}
                className="w-full py-3 mt-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs"
              >
                (디버그) GTS10 페어링 시작
              </button>

              {/* 디버깅용 강제 페어링 완료 버튼 (항상 표시) */}
              <button 
                onClick={async () => {
                   try {
                     await starmaxService.forcePairingReply();
                     alert('강제 페어링 완료 신호를 보냈습니다.');
                   } catch (e: any) {
                     alert('실패: ' + e.message);
                   }
                }}
                className="w-full py-3 mt-2 bg-red-50 text-red-600 font-bold rounded-xl text-xs"
              >
                (비상용) 강제 페어링 승인 보내기
              </button>

              <button 
                onClick={startScan}
                className="w-full py-3 mt-4 text-indigo-600 font-normal hover:bg-indigo-50 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> 다시 검색
              </button>
            </div>
          )}

          <button onClick={skipPairing} className="w-full py-4 mt-4 text-slate-400 font-normal hover:text-slate-600 transition-colors">
            나중에 연결하기
          </button>

          {/* Pairing Process Modal (Overlay in Pairing Screen) */}
          {isPairingProcess && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 animate-fade-in-up">
              <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto relative">
                   <RefreshCw size={32} className="text-indigo-600 animate-spin" />
                   <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping opacity-20"></div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">{pairingStatus || '기기 설정 중...'}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    워치 화면에 <strong>페어링 요청</strong>이 뜨면<br/>
                    <span className="text-indigo-600 font-bold">V (확인) 버튼</span>을 눌러주세요.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14} className="text-slate-400" />
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Troubleshooting</p>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
                    <li>워치 화면이 켜져 있는지 확인하세요.</li>
                    <li><strong>휴대폰에서 계속해 주세요</strong> 화면이 나오면 잠시 기다려주세요.</li>
                    <li>반응이 없으면 <strong>[설정 재시도]</strong>를 눌러주세요.</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={async () => {
                       // 워치 승인 후 폰에서 응답을 안 보낼 때 강제로 보냄
                       await starmaxService.forcePairingReply();
                       
                       // 수동 완료 처리 (화면 전환)
                       // @ts-ignore
                       if (typeof starmaxService.pairingCallback === 'function') {
                          // @ts-ignore
                          starmaxService.pairingCallback();
                       } else {
                          setIsPaired(true);
                          setForcePairing(false);
                          setIsPairingProcess(false);
                          setActiveTab('home');
                       }
                    }}
                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    강제 완료 (워치 승인 후)
                  </button>
                   <button 
                    onClick={async () => {
                       await starmaxService.retryHandshake();
                       alert('재시도 요청을 보냈습니다. 워치를 확인해주세요.');
                    }}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100"
                  >
                    설정 재시도
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pairing Process Modal */}
        {isPairingProcess && false && ( // Disabled here, moved to root
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 animate-fade-in-up">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto relative">
                 <RefreshCw size={32} className="text-indigo-600 animate-spin" />
                 <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping opacity-20"></div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">{pairingStatus || '기기 설정 중...'}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  워치 화면에 <strong>페어링 요청</strong>이 뜨면<br/>
                  <span className="text-indigo-600 font-bold">V (확인) 버튼</span>을 눌러주세요.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} className="text-slate-400" />
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Troubleshooting</p>
                </div>
                <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
                  <li>워치 화면이 켜져 있는지 확인하세요.</li>
                  <li><strong>휴대폰에서 계속해 주세요</strong> 화면이 나오면 잠시 기다려주세요.</li>
                  <li>반응이 없으면 <strong>[설정 재시도]</strong>를 눌러주세요.</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                     // 수동 완료 처리
                     // @ts-ignore
                     if (typeof starmaxService.pairingCallback === 'function') {
                        // @ts-ignore
                        starmaxService.pairingCallback();
                     } else {
                        // 콜백이 없으면 강제로 UI 상태 변경
                        setIsPaired(true);
                        setForcePairing(false);
                        setIsPairingProcess(false);
                        setActiveTab('home');
                     }
                  }}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all"
                >
                  수동 완료
                </button>
                 <button 
                  onClick={async () => {
                     await starmaxService.retryHandshake();
                     alert('재시도 요청을 보냈습니다. 워치를 확인해주세요.');
                  }}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100"
                >
                  설정 재시도
                </button>
              </div>
            </div>
          </div>
        )}

        {isCameraScanning && (
          <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${isNative ? 'bg-transparent' : 'bg-black/80'}`}>
            <div className={`relative w-72 h-72 rounded-2xl overflow-hidden ${isNative ? 'bg-transparent' : 'bg-black'}`}>
              {!isNative && (
                <>
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  <canvas ref={qrCanvasRef} className="hidden" />
                </>
              )}
              <div className="absolute inset-6 border-2 border-white/70 rounded-xl" />
            </div>
            <p className="mt-4 text-xs text-white/80 font-bold drop-shadow-md">
              와치의 QR 코드를 사각형 안에 맞춰주세요.
            </p>
            
            {!isNative && supportsZoom && (
              <button
                onClick={toggleZoom}
                className="mt-4 px-4 py-2 rounded-full bg-indigo-600/80 text-white text-xs font-medium backdrop-blur-sm border border-white/20 active:scale-95 transition-transform"
              >
                {cameraZoom === 1 ? '2배 확대' : '1배로 축소'}
              </button>
            )}

            <button
              onClick={() => {
                stopCameraScan();
                setIsScanning(false);
              }}
              className="mt-6 px-6 py-2 rounded-full bg-white text-slate-800 text-sm font-medium active:scale-95 transition-transform shadow-lg"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    );
  };

    /**
   * renderDashboardScreen 관련 처리를 수행합니다.
   */
const renderDashboardScreen = () => {
        /**
     * heartRateMetric 관련 처리를 수행합니다.
     */
const heartRateMetric = METRICS.find(m => m.id === 'heartRate');
    const otherMetrics = METRICS.filter(m => m.id !== 'heartRate');
    
    const formatValue = (val: number) => val === 0 ? '--' : val;

    return (
      <div className="px-0 pt-3 pb-20 bg-slate-50 min-h-screen">
        <header className="bg-white px-6 py-7 rounded-b-[40px] shadow-lg shadow-slate-900/10 mb-8 text-left relative">
          <div className="flex flex-col items-start">
            <h1 className="text-xl font-semibold text-slate-900 tracking-[0.18em]">GOLDENTIME</h1>
            <p className="text-[13px] text-slate-500 mt-1">내손안의 지킴이</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-700">
              <div className={`w-2 h-2 rounded-full ${isPaired ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`}></div>
              <span className="text-[11px] font-medium">{isPaired ? '실시간 데이터 모니터링 중' : '기기 연결 대기 중'}</span>
            </div>
          </div>
          <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
            <button onClick={triggerManualEmergency} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-slate-600 hover:bg-white/30 active:scale-95 transition-all shadow-sm border border-slate-100">
               <AlertOctagon size={20} className="text-red-500" />
            </button>
            <div onClick={() => setActiveTab('profile')} className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/50 shadow-lg overflow-hidden ring-2 ring-white/20 cursor-pointer">
              <img src={profileImage} alt="User" className="h-full w-full object-cover" />
            </div>
          </div>
        </header>

        <div className="px-4">
          {/* Unified Dashboard Grid - Changed to 3 columns */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="col-span-1">
              {heartRateMetric && (
                <MetricCard 
                  config={heartRateMetric} 
                  value={formatValue(data.heartRate)} 
                  status={data.heartRate > 150 ? 'danger' : data.heartRate > 100 ? 'warning' : 'normal'} 
                  className="h-full" 
                />
              )}
            </div>
            <div className="col-span-2 glass-panel rounded-2xl flex flex-col relative overflow-hidden p-0 h-32">
              <div className="absolute top-3 left-4 z-10"><span className="text-[9px] font-normal text-slate-400 uppercase">Realtime Trends</span></div>
              <div className="absolute top-3 right-3 z-10"><TrendingUp size={16} className="text-slate-300" /></div>
              <div className="flex-1 pt-6"><LiveChart data={history} color="#0d9488" /></div>
            </div>
            {otherMetrics.map((m) => (
               <MetricCard 
                 key={m.id} 
                 config={m} 
                 value={
                   m.id === 'bloodPressure' 
                     ? (data.bloodPressureSys === 0 ? '--/--' : `${data.bloodPressureSys}/${data.bloodPressureDia}`)
                     : formatValue((data as any)[m.id])
                 } 
                 status="normal" 
                 className="h-full" 
               />
            ))}
          </div>

          <div className="glass-panel p-5 rounded-2xl border-l-4 border-indigo-500 shadow-sm">
            <h3 className="font-normal text-sm flex items-center gap-2 text-slate-700 mb-3">
              <Sparkles size={14} className="text-indigo-600" />
              LLM AI 최근분석
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-white/60 rounded-xl border border-slate-100 p-3 text-center">
                <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">심박수</div>
                <div className="text-[16px] font-normal text-slate-800">
                  {data.heartRate === 0 ? "--" : data.heartRate}
                  <span className="text-[10px] text-slate-400 ml-1">bpm</span>
                </div>
              </div>
              <div className="bg-white/60 rounded-xl border border-slate-100 p-3 text-center">
                <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">산소포화도</div>
                <div className="text-[16px] font-normal text-slate-800">
                  {data.spO2 === 0 ? "--" : data.spO2}
                  <span className="text-[10px] text-slate-400 ml-1">%</span>
                </div>
              </div>
              <div className="bg-white/60 rounded-xl border border-slate-100 p-3 text-center">
                <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">혈압</div>
                <div className="text-[16px] font-normal text-slate-800">
                  {data.bloodPressureSys === 0
                    ? "--/--"
                    : `${data.bloodPressureSys}/${data.bloodPressureDia}`}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-2 font-normal">
              {reportHistory.length > 0 && reportHistory[0].content
                ? reportHistory[0].content
                : "데이터 분석 대기 중..."}
            </p>
          </div>
        </div>
      </div>
    );
  };

    /**
   * renderReportsScreen 관련 처리를 수행합니다.
   */
const renderReportsScreen = () => (
    <div className="px-4 pt-8 pb-24 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div><h2 className="text-2xl font-normal text-slate-900">AI 분석 리포트</h2><p className="text-xs text-slate-500 mt-1 font-normal">30분 단위 정밀 분석 로그</p></div>
        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100"><MessageSquare size={20} /></div>
      </div>
      <div className="relative border-l-2 border-slate-200 ml-3 space-y-8">
        {reportHistory.map((report, index) => (
            <div key={report.id} className="relative pl-8">
              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${index === 0 ? 'bg-indigo-600 ring-4 ring-indigo-50' : 'bg-slate-300'}`}></div>
              <div className="flex items-center gap-2 mb-2"><span className={`text-xs font-normal ${index === 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{index === 0 && <span className="text-[12px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-normal animate-pulse">LIVE</span>}</div>
              <div className={`glass-panel p-4 rounded-xl border-l-4 transition-all duration-500 ${report.status === 'danger' ? 'border-l-red-500 bg-red-50/50' : report.status === 'warning' ? 'border-l-orange-400 bg-orange-50/50' : 'border-l-indigo-500'}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 min-w-[24px]">{report.status === 'danger' ? <Siren size={20} className="text-red-500" /> : report.status === 'warning' ? <ShieldAlert size={20} className="text-orange-500" /> : <Sparkles size={20} className="text-indigo-500" />}</div>
                  <div className="flex-1"><p className="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">{report.content}</p></div>
                </div>
              </div>
            </div>
        ))}
      </div>
      <div className="mt-8 text-center"><p className="text-xs text-slate-400 font-normal">이전 24시간의 기록이 보관됩니다.</p></div>
    </div>
  );

    /**
   * renderProfileScreen 관련 처리를 수행합니다.
   */
const renderProfileScreen = () => {
    if (profileView === 'personal') return <PersonalInfoEditor initialData={userProfile} initialDeviceSettings={deviceSettings} onSave={handleProfileSave} onCancel={() => setProfileView('main')} />;
    if (profileView === 'device') {
      return (
        <DeviceManager
          settings={deviceSettings}
          onSave={handleDeviceSettingsSave}
          onCancel={() => setProfileView('main')}
          onDisconnect={handleDeviceDisconnect}
          isPaired={isPaired}
          onStartPairing={() => {
            setForcePairing(true);
            setScanResults([]);
            setDetectedQrMac(null);
          }}
        />
      );
    }
    if (profileView === 'about') return <AboutScreen onBack={() => setProfileView('main')} />;
    return (
      <div className="px-4 pt-12 pb-24 text-center bg-slate-50 min-h-screen">
        <div className="relative w-24 h-24 mx-auto mb-4 group cursor-pointer">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            id="profile-upload"
            onChange={handleImageUpload}
          />
          <label htmlFor="profile-upload" className="block w-full h-full cursor-pointer relative">
            <div className="w-full h-full rounded-full bg-slate-200 border-4 border-white shadow-lg overflow-hidden ring-4 ring-indigo-50">
              <img src={profileImage} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            {/* Overlay for hover/indication */}
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
            {/* Always visible small icon */}
            <div className="absolute bottom-0 right-0 bg-indigo-600 p-1.5 rounded-full border-2 border-white shadow-sm z-10">
              <Camera size={12} className="text-white" />
            </div>
          </label>
        </div>
        <h2 className="text-2xl font-normal text-slate-900">{userProfile.name} 님</h2>
        <p className="text-slate-400 mb-8 font-normal">{userProfile.email}</p>
        <div className="space-y-3 text-left">
          <div onClick={() => setProfileView('personal')} className="glass-panel p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><User size={20} /></div>
            <div className="flex-1"><p className="font-normal text-slate-700">개인 정보 설정</p></div><ChevronRight size={18} className="text-slate-300" />
          </div>
          <div onClick={() => setProfileView('device')} className="glass-panel p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Bluetooth size={20} /></div>
            <div className="flex-1">
              <p className="font-normal text-slate-700">연동 기기 관리</p>
              <p className="text-[12px] text-indigo-500 font-normal uppercase">
                {isPaired ? deviceSettings.deviceName : '기기 없음'}
              </p>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </div>
           {/* New About Service Menu Item */}
          <div onClick={() => setProfileView('about')} className="glass-panel p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Info size={20} /></div>
            <div className="flex-1">
                <p className="font-normal text-slate-700">서비스 정보</p>
                <p className="text-[12px] text-slate-400 font-normal uppercase">Version 2.4.1</p>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </div>
        </div>
        
        {/* System & Data Quality Section Moved from StatsScreen */}
        <div className="mt-6 space-y-3 text-left animate-fade-in-up delay-100">
           <h3 className="text-sm font-normal text-slate-700 flex items-center gap-2 pl-1">
              <Zap size={16} className="text-indigo-500"/> 시스템 및 데이터 품질
           </h3>
           <div className="grid grid-cols-2 gap-3">
               <div className="glass-panel p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 text-slate-400">
                     <Signal size={14}/>
                     <span className="text-[12px] uppercase font-normal tracking-wider">신호 품질</span>
                  </div>
                  <p className="text-lg font-normal text-emerald-600">양호 (98%)</p>
               </div>
               <div className="glass-panel p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 text-slate-400">
                     <Battery size={14}/>
                     <span className="text-[12px] uppercase font-normal tracking-wider">배터리 효율</span>
                  </div>
                  <p className="text-lg font-normal text-slate-800">48시간 예상</p>
               </div>
            </div>
        </div>

        <button onClick={handleLogout} className="mt-12 text-red-500 font-normal flex items-center justify-center gap-2 mx-auto"><LogOut size={18} />로그아웃</button>
      </div>
    );
  };

  if (!user) { 
    if (authMode === 'signup') {
      return (
        <SignupForm 
          onSignup={handleSignupFull} 
          onBack={() => setAuthMode('login')} 
        />
      );
    }
    if (authMode === 'reset-password') {
      return renderResetPasswordScreen();
    }
    return renderAuthScreen(); 
  }
  
  // 로그인 되어 있는데 기기 연동이 안 된 경우 -> 강제 연동 화면 표시
  // 단, '건너뛰기'를 한 경우(forcePairing=false)는 제외
  if (isPaired === false && forcePairing) {
     return renderPairingScreen();
  }

    /**
   * renderContent 관련 처리를 수행합니다.
   */
const renderContent = () => {
    switch (activeTab) {
      case 'home': return renderDashboardScreen();
      case 'report': return renderReportsScreen();
      case 'stats': return <StatsScreen />; // <StatsScreen /> is not defined in this snippet but assumed to exist
      case 'profile': return renderProfileScreen();
      default: return renderDashboardScreen();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto relative overflow-x-hidden pb-24">
      {/* Emergency Overlay added at the root of the app */}
      <EmergencyOverlay 
        stage={emergencyStage} 
        timer={emergencyTimer} 
        onCancel={() => { setEmergencyStage(0); setEmergencyTimer(0); }} 
        profile={userProfile}
        currentLocation={currentLocation}
      />

        {/* Pairing Process Modal - Moved to Root Level */}
        {isPairingProcess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 animate-fade-in-up">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto relative">
                 <RefreshCw size={32} className="text-indigo-600 animate-spin" />
                 <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping opacity-20"></div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">{pairingStatus || '기기 설정 중...'}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  워치 화면에 <strong>페어링 요청</strong>이 뜨면<br/>
                  <span className="text-indigo-600 font-bold">V (확인) 버튼</span>을 눌러주세요.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} className="text-slate-400" />
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Troubleshooting</p>
                </div>
                <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
                  <li>워치 화면이 켜져 있는지 확인하세요.</li>
                  <li><strong>휴대폰에서 계속해 주세요</strong> 화면이 나오면 잠시 기다려주세요.</li>
                  <li>반응이 없으면 <strong>[설정 재시도]</strong>를 눌러주세요.</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                     // 수동 완료 처리
                     setIsPaired(true);
                     setForcePairing(false);
                     setIsPairingProcess(false);
                     setActiveTab('home');
                  }}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all"
                >
                  수동 완료
                </button>
                 <button 
                  onClick={async () => {
                     await starmaxService.retryHandshake();
                     alert('재시도 요청을 보냈습니다. 워치를 확인해주세요.');
                  }}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100"
                >
                  설정 재시도
                </button>
              </div>
            </div>
          </div>
        )}

      {renderContent()}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-lg bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-2 pt-2 px-6 flex justify-between items-center pointer-events-auto rounded-t-2xl">
          {[
            { id: 'home', icon: Home, label: '홈' },
            { id: 'report', icon: FileText, label: '리포트' },
            { id: 'stats', icon: BarChart2, label: '통계' },
            { id: 'profile', icon: User, label: '내 정보' },
          ].map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); if (item.id === 'profile') setProfileView('main'); }} className={`flex flex-col items-center gap-0.5 transition-all duration-300 ${activeTab === item.id ? 'text-indigo-600 -translate-y-0.5' : 'text-slate-400 hover:text-slate-600'}`}>
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${activeTab === item.id ? 'bg-indigo-50 shadow-sm shadow-indigo-100 ring-1 ring-indigo-100' : 'bg-transparent'}`}><item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} /></div>
              <span className={`text-[9px] font-bold ${activeTab === item.id ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
