import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { memberBackendService } from './services/backendService';

type AuthMode = 'login' | 'signup' | 'reset-password';
type ProfileView = 'main' | 'edit';

interface UserProfile {
  id?: string;
  name: string;
  email: string;
  phone: string;
  dob?: string;
  age?: number;
  gender?: string;
  bloodType?: string;
  height?: number;
  weight?: number;
  status?: string;
  affiliation?: {
    city?: string;
    district?: string;
    dong?: string;
    welfareName?: string;
  };
  medicalHistory?: {
    medications?: Array<{ name?: string } | string>;
    allergies?: Array<{ substance?: string } | string>;
    chronicDiseases?: Array<{ disease?: string } | string>;
  };
  emergencyContacts?: Array<{
    name?: string;
    phone?: string;
    relationship?: string;
  }>;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  wearableDevice?: {
    deviceId?: string;
    deviceName?: string;
    deviceType?: string;
    firmwareVersion?: string;
  };
  pendingProfileChange?: {
    name?: string;
    email?: string;
    phone?: string;
    birthDate?: string;
    age?: number;
    gender?: string;
    bloodType?: string;
    height?: number;
    weight?: number;
    affiliation?: {
      city?: string;
      district?: string;
      dong?: string;
      welfareName?: string;
    };
    medicalHistory?: {
      medications?: Array<{ name?: string } | string>;
      allergies?: Array<{ substance?: string } | string>;
      chronicDiseases?: Array<{ disease?: string } | string>;
    };
    emergencyContact?: {
      name?: string;
      phone?: string;
      relationship?: string;
    };
    emergencyContacts?: Array<{
      name?: string;
      phone?: string;
      relationship?: string;
    }>;
    requestedAt?: string;
  } | null;
}

interface SignupFormData {
  emailLocal: string;
  emailDomain: string;
  emailDomainCustom: string;
  password: string;
  passwordConfirm: string;
  name: string;
  phone: string;
  dob: string;
  age: string;
  gender: string;
  bloodType: string;
  height: string;
  weight: string;
  city: string;
  district: string;
  dong: string;
  welfareName: string;
  medications: string;
  allergies: string;
  diseases: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
}

const inputBase =
  'w-full h-11 px-4 bg-white text-[17px] text-slate-900 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400 transition-all';
const labelBase =
  'text-[15px] font-medium text-slate-900 mb-1.5 flex items-center gap-1';
const requiredMark = <span className="text-red-500">*</span>;
const emailDomainOptions = ['naver.com', 'gmail.com', 'kakao.com', '직접입력'];

/**
 * 전화번호를 회원앱 포맷에 맞춰 정리합니다.
 */
function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/**
 * 회원앱에서 브라우저 알림 권한을 요청합니다.
 */
function requestMemberNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  if (window.Notification.permission === 'default') {
    window.Notification.requestPermission().catch(() => {});
  }
}

/**
 * 회원 상태 변경을 브라우저 알림으로 알려줍니다.
 */
function notifyMember(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  if (window.Notification.permission !== 'granted') {
    return;
  }
  new window.Notification(title, { body });
}

/**
 * 이메일 로컬/도메인 입력값을 하나의 이메일 문자열로 합칩니다.
 */
function buildEmail(local: string, domain: string, customDomain: string) {
  const finalDomain = domain === '직접입력' ? customDomain : domain;
  if (!local || !finalDomain) return '';
  return `${local}@${finalDomain}`;
}

/**
 * 날짜 문자열로부터 나이를 계산합니다.
 */
function calculateAge(dob: string) {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return String(age);
}

/**
 * 배열 기반 의료정보를 화면용 문자열로 바꿉니다.
 */
function stringifyMedical(items?: Array<{ name?: string; disease?: string; substance?: string } | string>) {
  if (!items || items.length === 0) return '';
  return items
    .map((item) => {
      if (typeof item === 'string') return item;
      return item.name || item.disease || item.substance || '';
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * 날짜 값을 회원앱 입력 폼에서 사용하는 YYYY-MM-DD 형식으로 맞춥니다.
 */
function formatDateForInput(value?: string | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

/**
 * 백엔드 성별 값을 회원앱 한글 라벨로 변환합니다.
 */
function normalizeGenderLabel(value?: string) {
  if (value === 'female' || value === '여성') return '여성';
  return '남성';
}

/**
 * 백엔드 응답의 회원 구조를 회원앱 화면용 구조로 정규화합니다.
 */
function normalizeUserProfile(rawUser: any): UserProfile {
  const emergencyContacts = Array.isArray(rawUser?.emergencyContacts)
    ? rawUser.emergencyContacts
    : rawUser?.emergencyContact
      ? [rawUser.emergencyContact]
      : [];
  const pendingEmergencyContacts = Array.isArray(rawUser?.pendingProfileChange?.emergencyContacts)
    ? rawUser.pendingProfileChange.emergencyContacts
    : rawUser?.pendingProfileChange?.emergencyContact
      ? [rawUser.pendingProfileChange.emergencyContact]
      : [];

  return {
    id: rawUser?.id || rawUser?._id,
    name: rawUser?.name || '',
    email: rawUser?.email || '',
    phone: formatPhoneNumber(rawUser?.phone || ''),
    dob: formatDateForInput(rawUser?.dob || rawUser?.birthDate),
    age: typeof rawUser?.age === 'number' ? rawUser.age : undefined,
    gender: normalizeGenderLabel(rawUser?.gender),
    bloodType: rawUser?.bloodType || '',
    height: typeof rawUser?.height === 'number' ? rawUser.height : undefined,
    weight: typeof rawUser?.weight === 'number' ? rawUser.weight : undefined,
    status: rawUser?.status || '',
    affiliation: rawUser?.affiliation || {},
    medicalHistory: rawUser?.medicalHistory || {},
    emergencyContact: rawUser?.emergencyContact || emergencyContacts[0],
    emergencyContacts,
    wearableDevice: rawUser?.wearableDevice || undefined,
    pendingProfileChange: rawUser?.pendingProfileChange
      ? {
          name: rawUser.pendingProfileChange.name || '',
          email: rawUser.pendingProfileChange.email || '',
          phone: formatPhoneNumber(rawUser.pendingProfileChange.phone || ''),
          birthDate: formatDateForInput(rawUser.pendingProfileChange.birthDate),
          age:
            typeof rawUser.pendingProfileChange.age === 'number'
              ? rawUser.pendingProfileChange.age
              : undefined,
          gender: normalizeGenderLabel(rawUser.pendingProfileChange.gender),
          bloodType: rawUser.pendingProfileChange.bloodType || '',
          height:
            typeof rawUser.pendingProfileChange.height === 'number'
              ? rawUser.pendingProfileChange.height
              : undefined,
          weight:
            typeof rawUser.pendingProfileChange.weight === 'number'
              ? rawUser.pendingProfileChange.weight
              : undefined,
          affiliation: rawUser.pendingProfileChange.affiliation || {},
          medicalHistory: rawUser.pendingProfileChange.medicalHistory || {},
          emergencyContact:
            rawUser.pendingProfileChange.emergencyContact || pendingEmergencyContacts[0],
          emergencyContacts: pendingEmergencyContacts,
          requestedAt: rawUser.pendingProfileChange.requestedAt
            ? new Date(rawUser.pendingProfileChange.requestedAt).toLocaleString()
            : '',
        }
      : null,
  };
}

/**
 * 회원앱 오전 버전 구조를 복구한 메인 컴포넌트입니다.
 */
export default function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [profileView, setProfileView] = useState<ProfileView>('main');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [savedId, setSavedId] = useState(true);
  const [autoLogin, setAutoLogin] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupStep, setSignupStep] = useState(1);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupPasswordConfirm, setShowSignupPasswordConfirm] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetNewPasswordConfirm, setResetNewPasswordConfirm] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false);
  const [resetMaskedPhone, setResetMaskedPhone] = useState('');
  const [resetError, setResetError] = useState('');
  const [editError, setEditError] = useState('');
  const [formData, setFormData] = useState<SignupFormData>({
    emailLocal: '',
    emailDomain: 'naver.com',
    emailDomainCustom: '',
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
  const [editForm, setEditForm] = useState<SignupFormData>(formData);
  const previousPendingRequestRef = useRef('');
  const previousMemberStatusRef = useRef('');

  /**
   * 최신 회원 프로필을 다시 조회해 승인 상태와 워치 정보를 동기화합니다.
   */
  const refreshProfile = useCallback(async () => {
    const response = await memberBackendService.getProfile();
    const nextUser = normalizeUserProfile((response as any).data?.user || (response as any).user);
    if (!response.success || !nextUser) {
      return null;
    }

    setUser(nextUser);
    syncEditForm(nextUser);
    localStorage.setItem(
      'member_last_login',
      JSON.stringify({
        ...(memberBackendService.getCachedLogin() || {}),
        email: nextUser.email,
        user: nextUser,
      }),
    );
    return nextUser;
  }, []);

  /**
   * 로그인 캐시와 저장된 아이디를 복구합니다.
   */
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('member_saved_email') || '';
      if (savedEmail) {
        setLoginEmail(savedEmail);
      }
    } catch {}

    const cached = memberBackendService.getCachedLogin();
    if (cached?.user) {
      const nextUser = normalizeUserProfile(cached.user);
      setUser(nextUser);
      syncEditForm(nextUser);
      refreshProfile().catch(() => {});
    }
  }, [refreshProfile]);

  /**
   * 회원 정보수정 승인 결과나 상태 변화가 확인되면 브라우저 알림으로 전달합니다.
   */
  useEffect(() => {
    if (!user) {
      previousPendingRequestRef.current = '';
      previousMemberStatusRef.current = '';
      return;
    }

    const currentPendingRequest = String(user.pendingProfileChange?.requestedAt || '');
    const currentStatus = String(user.status || '');
    if (previousPendingRequestRef.current && !currentPendingRequest) {
      notifyMember('회원앱 알림', '정보수정 요청 상태가 갱신되었습니다.');
    }
    if (
      previousMemberStatusRef.current &&
      currentStatus &&
      previousMemberStatusRef.current !== currentStatus
    ) {
      notifyMember('회원앱 알림', `회원 상태가 ${currentStatus}(으)로 변경되었습니다.`);
    }

    previousPendingRequestRef.current = currentPendingRequest;
    previousMemberStatusRef.current = currentStatus;
  }, [user]);

  /**
   * 회원 프로필 데이터를 편집 폼과 동기화합니다.
   */
  function syncEditForm(profile: UserProfile) {
    const sourceProfile: any = profile.pendingProfileChange || profile;
    const [emailLocal = '', emailDomain = ''] = String(sourceProfile.email || '').split('@');
    const emergency = sourceProfile.emergencyContacts?.[0] || sourceProfile.emergencyContact;
    setEditForm({
      emailLocal,
      emailDomain: emailDomain || 'naver.com',
      emailDomainCustom: '',
      password: '',
      passwordConfirm: '',
      name: sourceProfile.name || '',
      phone: sourceProfile.phone || '',
      dob: sourceProfile.birthDate || sourceProfile.dob || '',
      age: sourceProfile.age ? String(sourceProfile.age) : calculateAge(sourceProfile.birthDate || sourceProfile.dob || ''),
      gender: sourceProfile.gender || '남성',
      bloodType: sourceProfile.bloodType || 'A+',
      height: sourceProfile.height ? String(sourceProfile.height) : '170',
      weight: sourceProfile.weight ? String(sourceProfile.weight) : '60',
      city: sourceProfile.affiliation?.city || '',
      district: sourceProfile.affiliation?.district || '',
      dong: sourceProfile.affiliation?.dong || '',
      welfareName: sourceProfile.affiliation?.welfareName || '',
      medications: stringifyMedical(sourceProfile.medicalHistory?.medications),
      allergies: stringifyMedical(sourceProfile.medicalHistory?.allergies),
      diseases: stringifyMedical(sourceProfile.medicalHistory?.chronicDiseases),
      emergencyName: emergency?.name || '',
      emergencyRelation: emergency?.relationship || '',
      emergencyPhone: emergency?.phone || '',
    });
  }

  /**
   * 회원가입 입력값을 갱신합니다.
   */
  function updateSignupField(field: keyof SignupFormData, value: string) {
    const nextValue =
      field === 'phone' || field === 'emergencyPhone' ? formatPhoneNumber(value) : value;
    setFormData((prev) => {
      const next = { ...prev, [field]: nextValue };
      if (field === 'dob') {
        next.age = calculateAge(String(nextValue));
      }
      return next;
    });
  }

  /**
   * 프로필 편집 입력값을 갱신합니다.
   */
  function updateEditField(field: keyof SignupFormData, value: string) {
    const nextValue =
      field === 'phone' || field === 'emergencyPhone' ? formatPhoneNumber(value) : value;
    setEditForm((prev) => {
      const next = { ...prev, [field]: nextValue };
      if (field === 'dob') {
        next.age = calculateAge(String(nextValue));
      }
      return next;
    });
  }

  /**
   * 오전 회원앱 구조에 맞춰 회원가입 단계를 검증합니다.
   */
  function validateSignupStep(step: number, target: SignupFormData) {
    if (step === 1) {
      if (!buildEmail(target.emailLocal, target.emailDomain, target.emailDomainCustom) || !target.password || !target.passwordConfirm) {
        return '이메일과 비밀번호를 모두 입력해주세요.';
      }
      if (target.password.length < 6) {
        return '비밀번호는 6자 이상이어야 합니다.';
      }
      if (target.password !== target.passwordConfirm) {
        return '비밀번호가 일치하지 않습니다.';
      }
    }
    if (step === 2) {
      if (!target.name || !target.dob || !target.city || !target.district || !target.dong || !target.welfareName) {
        return '이름, 생년월일, 시/도, 시/군/구, 읍/면/동, 복지사명을 입력해주세요.';
      }
    }
    if (step === 3) {
      if (!target.height || !target.weight || !target.bloodType) {
        return '신장, 체중, 혈액형을 입력해주세요.';
      }
    }
    return '';
  }

  /**
   * 회원가입 다음 단계를 진행합니다.
   */
  function handleNextSignupStep() {
    const error = validateSignupStep(signupStep, formData);
    if (error) {
      setSignupError(error);
      return;
    }
    setSignupError('');
    if (signupStep < 4) {
      setSignupStep((prev) => prev + 1);
    }
  }

  /**
   * 로그인 요청과 아이디 저장 처리를 담당합니다.
   */
  const handleLogin = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!loginEmail || !loginPassword) {
        setLoginError('이메일과 비밀번호를 입력해주세요.');
        return;
      }

      setLoading(true);
      setLoginError('');
      try {
        const response = await memberBackendService.login(loginEmail, loginPassword, autoLogin);
        const nextUser = normalizeUserProfile((response as any).data?.user || (response as any).user);
        if (!response.success || !nextUser) {
          setLoginError(response.message || '로그인에 실패했습니다.');
          return;
        }

        if (savedId) {
          localStorage.setItem('member_saved_email', loginEmail);
        } else {
          localStorage.removeItem('member_saved_email');
        }

        setUser(nextUser);
        syncEditForm(nextUser);
        requestMemberNotificationPermission();
        refreshProfile().catch(() => {});
      } catch (error: any) {
        setLoginError(error.message || '서버 연결에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [autoLogin, loginEmail, loginPassword, refreshProfile, savedId],
  );

  /**
   * 오전 회원앱 기준의 가입 데이터를 서버 포맷으로 변환합니다.
   */
  function buildSignupPayload(target: SignupFormData) {
    return {
      name: target.name,
      phone: target.phone.replace(/\D/g, ''),
      email: buildEmail(target.emailLocal, target.emailDomain, target.emailDomainCustom),
      password: target.password,
      birthDate: target.dob,
      age: Number(target.age || 0),
      gender: target.gender,
      height: Number(target.height || 0),
      weight: Number(target.weight || 0),
      bloodType: target.bloodType,
      affiliation: {
        city: target.city,
        district: target.district,
        dong: target.dong,
        welfareName: target.welfareName,
      },
      emergencyContacts: target.emergencyName
        ? [
            {
              name: target.emergencyName,
              phone: target.emergencyPhone.replace(/\D/g, ''),
              relationship: target.emergencyRelation || '보호자',
            },
          ]
        : [],
      medicalHistory: {
        medications: target.medications ? [{ name: target.medications }] : [],
        allergies: target.allergies ? [{ substance: target.allergies }] : [],
        chronicDiseases: target.diseases ? [{ disease: target.diseases }] : [],
      },
    };
  }

  /**
   * 오전 회원앱의 4단계 회원가입을 완료합니다.
   */
  const handleSignupSubmit = useCallback(async () => {
    const error = validateSignupStep(1, formData) || validateSignupStep(2, formData) || validateSignupStep(3, formData);
    if (error) {
      setSignupError(error);
      return;
    }

    setLoading(true);
    setSignupError('');
    try {
      const response = await memberBackendService.signup(buildSignupPayload(formData));
      if (!response.success) {
        setSignupError(response.message || '회원가입에 실패했습니다.');
        return;
      }

      alert('회원가입 신청이 완료되었습니다. 승인 후 로그인할 수 있습니다.');
      setSignupStep(1);
      setAuthMode('login');
      setFormData({
        emailLocal: '',
        emailDomain: 'naver.com',
        emailDomainCustom: '',
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
    } catch (error: any) {
      setSignupError(error.message || '서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [formData]);

  /**
   * 비밀번호 재설정용 인증코드를 발송합니다.
   */
  const handleResetRequestCode = useCallback(async () => {
    if (!resetEmail || !resetPhone) {
      setResetError('이메일과 전화번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setResetError('');
    try {
      const response = await memberBackendService.sendResetCode(resetEmail, resetPhone.replace(/\D/g, ''));
      if (!response.success) {
        setResetError(response.message || '인증코드 발송에 실패했습니다.');
        return;
      }
      setResetMaskedPhone(formatPhoneNumber(resetPhone).replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3'));
      setResetStep('verify');
    } catch (error: any) {
      setResetError(error.message || '서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [resetEmail, resetPhone]);

  /**
   * 인증코드 검증 후 비밀번호를 변경합니다.
   */
  const handleResetPassword = useCallback(async () => {
    if (resetCode.length !== 6) {
      setResetError('6자리 인증코드를 입력해주세요.');
      return;
    }
    if (resetNewPassword.length < 6) {
      setResetError('새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (resetNewPassword !== resetNewPasswordConfirm) {
      setResetError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    setResetError('');
    try {
      const response = await memberBackendService.resetPassword(
        resetEmail,
        resetPhone.replace(/\D/g, ''),
        resetCode,
        resetNewPassword,
      );
      if (!response.success) {
        setResetError(response.message || '비밀번호 변경에 실패했습니다.');
        return;
      }
      alert('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.');
      setAuthMode('login');
      setResetStep('request');
      setResetEmail('');
      setResetPhone('');
      setResetCode('');
      setResetNewPassword('');
      setResetNewPasswordConfirm('');
      setResetMaskedPhone('');
    } catch (error: any) {
      setResetError(error.message || '서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [resetCode, resetEmail, resetNewPassword, resetNewPasswordConfirm, resetPhone]);

  /**
   * 회원 프로필 변경사항을 저장합니다.
   */
  const handleSaveProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setEditError('');
    try {
      const payload = buildSignupPayload(editForm);
      delete (payload as any).password;
      const response = await memberBackendService.updateProfile(payload);
      if (!response.success) {
        setEditError(response.message || '프로필 저장에 실패했습니다.');
        return;
      }

      const nextUser = normalizeUserProfile((response as any).data?.user || user);
      setUser(nextUser);
      syncEditForm(nextUser);
      localStorage.setItem(
        'member_last_login',
        JSON.stringify({
          ...(memberBackendService.getCachedLogin() || {}),
          email: nextUser.email,
          user: nextUser,
        }),
      );
      setProfileView('main');
      alert(response.message || '회원 정보 수정 요청이 접수되었습니다.');
    } catch (error: any) {
      setEditError(error.message || '서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [editForm, user]);

  /**
   * 회원 탈퇴를 처리하고 세션을 정리합니다.
   */
  const handleDeleteAccount = useCallback(async () => {
    if (!confirm('회원 탈퇴를 진행하시겠습니까? 탈퇴 후 복구할 수 없습니다.')) {
      return;
    }
    setLoading(true);
    try {
      const response = await memberBackendService.deleteAccount();
      if (!response.success) {
        alert(response.message || '회원 탈퇴에 실패했습니다.');
        return;
      }
      memberBackendService.logout();
      setUser(null);
      setProfileView('main');
      alert('회원 탈퇴가 완료되었습니다.');
    } catch (error: any) {
      alert(error.message || '서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 로그아웃 후 인증 화면으로 복귀합니다.
   */
  const handleLogout = useCallback(() => {
    memberBackendService.logout();
    setUser(null);
    setProfileView('main');
  }, []);

  /**
   * 로그인 화면을 렌더링합니다.
   */
  function renderLogin() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 shadow-xl shadow-indigo-900/10">
              <ShieldCheck className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">회원</h1>
            <p className="mt-2 text-[15px] text-slate-500">오전 회원앱 구조 복구본</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={labelBase}>이메일</label>
              <input
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="example@email.com"
                className={inputBase}
                autoFocus
              />
            </div>
            <div>
              <label className={labelBase}>비밀번호</label>
              <div className="flex h-11 items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4">
                <Lock size={16} className="shrink-0 text-slate-400" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="비밀번호 입력"
                  className="h-full min-h-0 w-full appearance-none bg-transparent text-[16px] leading-none text-slate-900 outline-none"
                />
                {loginPassword ? (
                  <button
                    type="button"
                    onClick={() => setLoginPassword('')}
                    className="p-0.5 text-slate-300 hover:text-slate-500"
                    aria-label="비밀번호 지우기"
                  >
                    <X size={14} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="p-0.5 text-slate-300 hover:text-slate-500"
                  aria-label="비밀번호 보기"
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px]">
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={savedId}
                  onChange={() => setSavedId((prev) => !prev)}
                  className="h-6 w-6 rounded border-slate-300"
                />
                아이디 저장
              </label>
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={autoLogin}
                  onChange={() => setAutoLogin((prev) => !prev)}
                  className="h-6 w-6 rounded border-slate-300"
                />
                자동 로그인
              </label>
            </div>

            {loginError ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[14px] text-rose-500">{loginError}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-900/10 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : null}
              <span>{loading ? '로그인 중...' : '로그인'}</span>
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <button onClick={() => setAuthMode('reset-password')} className="text-[15px] text-indigo-500">
              비밀번호 찾기
            </button>
            <div>
              <span className="text-[15px] text-slate-400">계정이 없으신가요? </span>
              <button onClick={() => setAuthMode('signup')} className="text-[15px] font-medium text-indigo-600">
                회원가입
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * 회원가입 1단계 계정 정보를 렌더링합니다.
   */
  function renderSignupStepOne() {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-2xl font-light text-slate-900">환영합니다</h3>
          <p className="mb-6 text-slate-500">서비스 이용을 위한 계정을 생성해주세요.</p>
        </div>

        <div>
          <label className={labelBase}>이메일 {requiredMark}</label>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2">
            <input
              value={formData.emailLocal}
              onChange={(event) => updateSignupField('emailLocal', event.target.value)}
              placeholder="아이디"
              className={inputBase}
            />
            <div className="flex items-center text-slate-400">@</div>
            <select
              value={formData.emailDomain}
              onChange={(event) => updateSignupField('emailDomain', event.target.value)}
              className={inputBase}
            >
              {emailDomainOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          {formData.emailDomain === '직접입력' ? (
            <input
              value={formData.emailDomainCustom}
              onChange={(event) => updateSignupField('emailDomainCustom', event.target.value)}
              placeholder="도메인 직접 입력"
              className={`${inputBase} mt-2`}
            />
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div>
            <label className={labelBase}>비밀번호 {requiredMark}</label>
            <div className="flex h-11 items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-4">
              <Lock size={16} className="shrink-0 text-slate-400" />
              <input
                type={showSignupPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(event) => updateSignupField('password', event.target.value)}
                placeholder="비밀번호 입력"
                className="h-full min-h-0 w-full appearance-none bg-transparent text-[14px] leading-none text-slate-900 outline-none"
              />
              {formData.password ? (
                <button type="button" onClick={() => updateSignupField('password', '')} className="p-0.5 text-slate-300 hover:text-slate-500">
                  <X size={14} />
                </button>
              ) : null}
              <button type="button" onClick={() => setShowSignupPassword((prev) => !prev)} className="p-0.5 text-slate-300 hover:text-slate-500">
                {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelBase}>비밀번호 확인 {requiredMark}</label>
            <div className="flex h-11 items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-4">
              <Lock size={16} className="shrink-0 text-slate-400" />
              <input
                type={showSignupPasswordConfirm ? 'text' : 'password'}
                value={formData.passwordConfirm}
                onChange={(event) => updateSignupField('passwordConfirm', event.target.value)}
                placeholder="비밀번호 재입력"
                className="h-full min-h-0 w-full appearance-none bg-transparent text-[14px] leading-none text-slate-900 outline-none"
              />
              {formData.passwordConfirm ? (
                <button type="button" onClick={() => updateSignupField('passwordConfirm', '')} className="p-0.5 text-slate-300 hover:text-slate-500">
                  <X size={14} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowSignupPasswordConfirm((prev) => !prev)}
                className="p-0.5 text-slate-300 hover:text-slate-500"
              >
                {showSignupPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * 회원가입 2단계 기본정보를 렌더링합니다.
   */
  function renderSignupStepTwo() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelBase}>이름 {requiredMark}</label>
            <input value={formData.name} onChange={(event) => updateSignupField('name', event.target.value)} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>생년월일 {requiredMark}</label>
            <input type="date" value={formData.dob} onChange={(event) => updateSignupField('dob', event.target.value)} className={inputBase} />
          </div>
        </div>
        <div>
          <label className={labelBase}>휴대폰 번호</label>
          <div className="flex gap-2">
            <input
              value={formData.phone}
              onChange={(event) => updateSignupField('phone', event.target.value)}
              placeholder="010-0000-0000"
              className={`${inputBase} flex-1`}
            />
            <button type="button" className="h-11 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-600">
              휴대폰 본인인증
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelBase}>시/도 {requiredMark}</label>
            <input value={formData.city} onChange={(event) => updateSignupField('city', event.target.value)} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>시/군/구 {requiredMark}</label>
            <input value={formData.district} onChange={(event) => updateSignupField('district', event.target.value)} className={inputBase} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelBase}>읍/면/동 {requiredMark}</label>
            <input value={formData.dong} onChange={(event) => updateSignupField('dong', event.target.value)} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>복지사명 {requiredMark}</label>
            <input value={formData.welfareName} onChange={(event) => updateSignupField('welfareName', event.target.value)} className={inputBase} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelBase}>나이</label>
            <input value={formData.age ? `${formData.age}세` : ''} className={`${inputBase} bg-slate-50 text-slate-500`} readOnly />
          </div>
          <div>
            <label className={labelBase}>성별</label>
            <select value={formData.gender} onChange={(event) => updateSignupField('gender', event.target.value)} className={inputBase}>
              <option value="남성">남성</option>
              <option value="여성">여성</option>
            </select>
          </div>
          <div>
            <label className={labelBase}>혈액형</label>
            <select value={formData.bloodType} onChange={(event) => updateSignupField('bloodType', event.target.value)} className={inputBase}>
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  /**
   * 회원가입 3단계 건강정보를 렌더링합니다.
   */
  function renderSignupStepThree() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelBase}>신장 (cm)</label>
            <select value={formData.height} onChange={(event) => updateSignupField('height', event.target.value)} className={inputBase}>
              {Array.from({ length: 121 }, (_, index) => index + 100).map((value) => (
                <option key={value} value={value}>
                  {value} cm
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelBase}>체중 (kg)</label>
            <select value={formData.weight} onChange={(event) => updateSignupField('weight', event.target.value)} className={inputBase}>
              {Array.from({ length: 121 }, (_, index) => index + 30).map((value) => (
                <option key={value} value={value}>
                  {value} kg
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelBase}>복용 중인 약물</label>
          <textarea value={formData.medications} onChange={(event) => updateSignupField('medications', event.target.value)} className={`${inputBase} h-24 py-3`} />
        </div>
        <div>
          <label className={labelBase}>알레르기</label>
          <input value={formData.allergies} onChange={(event) => updateSignupField('allergies', event.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>만성 질환</label>
          <input value={formData.diseases} onChange={(event) => updateSignupField('diseases', event.target.value)} className={inputBase} />
        </div>
      </div>
    );
  }

  /**
   * 회원가입 4단계 보호자 정보를 렌더링합니다.
   */
  function renderSignupStepFour() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelBase}>보호자 이름</label>
            <input value={formData.emergencyName} onChange={(event) => updateSignupField('emergencyName', event.target.value)} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>관계</label>
            <input value={formData.emergencyRelation} onChange={(event) => updateSignupField('emergencyRelation', event.target.value)} className={inputBase} />
          </div>
        </div>
        <div>
          <label className={labelBase}>보호자 연락처</label>
          <input value={formData.emergencyPhone} onChange={(event) => updateSignupField('emergencyPhone', event.target.value)} className={inputBase} />
        </div>
      </div>
    );
  }

  /**
   * 오전 회원앱의 4단계 회원가입 화면을 렌더링합니다.
   */
  function renderSignup() {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
          <div className="mb-4 flex items-center gap-4">
            <button onClick={() => (signupStep === 1 ? setAuthMode('login') : setSignupStep((prev) => prev - 1))} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
              <ChevronLeft size={22} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">회원가입</h2>
              <p className="mt-1 text-sm uppercase tracking-wider text-slate-500">
                {signupStep === 1 && '1. Account Details'}
                {signupStep === 2 && '2. Personal Information'}
                {signupStep === 3 && '3. Health Profile'}
                {signupStep === 4 && '4. Emergency Contacts'}
                <span className="ml-2 text-indigo-600">({signupStep}/4)</span>
              </p>
            </div>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${signupStep * 25}%` }} />
          </div>
        </div>

        <div className="mx-auto max-w-lg px-6 py-6 pb-28">
          {signupStep === 1 ? renderSignupStepOne() : null}
          {signupStep === 2 ? renderSignupStepTwo() : null}
          {signupStep === 3 ? renderSignupStepThree() : null}
          {signupStep === 4 ? renderSignupStepFour() : null}
          {signupError ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-[13px] text-rose-500">{signupError}</p>
          ) : null}
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-100 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-lg gap-3">
            {signupStep > 1 ? (
              <button onClick={() => setSignupStep((prev) => prev - 1)} className="flex-1 rounded-2xl bg-slate-100 py-4 text-slate-700">
                이전
              </button>
            ) : null}
            {signupStep < 4 ? (
              <button onClick={handleNextSignupStep} className="flex-[2] rounded-2xl bg-indigo-600 py-4 text-white">
                다음
              </button>
            ) : (
              <button onClick={handleSignupSubmit} disabled={loading} className="flex-[2] rounded-2xl bg-emerald-600 py-4 text-white disabled:opacity-50">
                {loading ? '처리 중...' : '가입 완료'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /**
   * 비밀번호 재설정 화면을 렌더링합니다.
   */
  function renderResetPassword() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm">
          <button onClick={() => setAuthMode('login')} className="mb-6 flex items-center gap-1 text-sm text-slate-400">
            <ChevronLeft size={16} />
            로그인으로 돌아가기
          </button>
          <h2 className="mb-6 text-2xl font-semibold text-slate-900">비밀번호 재설정</h2>
          {resetStep === 'request' ? (
            <div className="space-y-4">
              <div>
                <label className={labelBase}>이메일</label>
                <input value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} className={inputBase} />
              </div>
              <div>
                <label className={labelBase}>전화번호</label>
                <input value={resetPhone} onChange={(event) => setResetPhone(formatPhoneNumber(event.target.value))} className={inputBase} />
              </div>
              {resetError ? <p className="text-[13px] text-rose-500">{resetError}</p> : null}
              <button onClick={handleResetRequestCode} disabled={loading} className="h-11 w-full rounded-2xl bg-indigo-600 text-white disabled:opacity-50">
                {loading ? '발송 중...' : '인증코드 발송'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">{resetMaskedPhone}로 발송된 6자리 코드를 입력해주세요.</p>
              <div>
                <label className={labelBase}>인증코드</label>
                <input value={resetCode} onChange={(event) => setResetCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className={`${inputBase} text-center tracking-[0.4em]`} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div>
                  <label className={labelBase}>새 비밀번호</label>
                  <div className="flex h-11 items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-4">
                    <KeyRound size={16} className="shrink-0 text-slate-400" />
                    <input type={showResetPassword ? 'text' : 'password'} value={resetNewPassword} onChange={(event) => setResetNewPassword(event.target.value)} className="h-full min-h-0 w-full bg-transparent outline-none" />
                    <button type="button" onClick={() => setShowResetPassword((prev) => !prev)} className="p-0.5 text-slate-300 hover:text-slate-500">
                      {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelBase}>새 비밀번호 확인</label>
                  <div className="flex h-11 items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-4">
                    <KeyRound size={16} className="shrink-0 text-slate-400" />
                    <input
                      type={showResetPasswordConfirm ? 'text' : 'password'}
                      value={resetNewPasswordConfirm}
                      onChange={(event) => setResetNewPasswordConfirm(event.target.value)}
                      className="h-full min-h-0 w-full bg-transparent outline-none"
                    />
                    <button type="button" onClick={() => setShowResetPasswordConfirm((prev) => !prev)} className="p-0.5 text-slate-300 hover:text-slate-500">
                      {showResetPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              {resetError ? <p className="text-[13px] text-rose-500">{resetError}</p> : null}
              <button onClick={handleResetPassword} disabled={loading} className="h-11 w-full rounded-2xl bg-indigo-600 text-white disabled:opacity-50">
                {loading ? '처리 중...' : '비밀번호 변경'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /**
   * 오전 회원앱의 메인 프로필 화면을 렌더링합니다.
   */
  function renderProfileMain() {
    return (
      <div className="min-h-screen bg-slate-50 px-4 pt-12 pb-24">
        <div className="mx-auto max-w-lg">
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <User size={34} />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">{user?.name || '-'}</h2>
            <p className="mt-1 text-sm text-slate-500">{user?.email || '-'}</p>
          </div>

          <div className="mt-4 space-y-3">
            <button
              onClick={() => setProfileView('edit')}
              className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                <User size={18} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">개인 정보 설정</p>
                <p className="text-xs text-slate-400">회원가입 정보 수정</p>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>

            {user?.pendingProfileChange?.requestedAt ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm font-medium text-amber-900">승인 대기 중인 변경 요청</h3>
                  <p className="text-[12px] text-amber-700">{user.pendingProfileChange.requestedAt}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-amber-700">휴대폰 번호</p>
                    <p className="font-medium text-amber-950">{user.pendingProfileChange.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-amber-700">이메일</p>
                    <p className="font-medium text-amber-950">{user.pendingProfileChange.email || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-amber-700">소속</p>
                    <p className="font-medium text-amber-950">
                      {[
                        user.pendingProfileChange.affiliation?.city,
                        user.pendingProfileChange.affiliation?.district,
                        user.pendingProfileChange.affiliation?.dong,
                      ]
                        .filter(Boolean)
                        .join(' ') || '-'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-slate-700">현재 회원 정보</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">휴대폰 번호</p>
                  <p className="font-medium text-slate-900">{user?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400">생년월일</p>
                  <p className="font-medium text-slate-900">{user?.dob || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400">성별</p>
                  <p className="font-medium text-slate-900">{user?.gender || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400">혈액형</p>
                  <p className="font-medium text-slate-900">{user?.bloodType || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400">키</p>
                  <p className="font-medium text-slate-900">{user?.height ? `${user.height}cm` : '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400">몸무게</p>
                  <p className="font-medium text-slate-900">{user?.weight ? `${user.weight}kg` : '-'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-medium text-slate-700">등록 워치 정보</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">디바이스명</p>
                  <p className="font-medium text-slate-900">{user?.wearableDevice?.deviceName || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400">디바이스 종류</p>
                  <p className="font-medium text-slate-900">{user?.wearableDevice?.deviceType || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400">디바이스 ID</p>
                  <p className="font-medium text-slate-900 break-all">
                    {user?.wearableDevice?.deviceId || '-'}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-600">
                등록된 워치는 관리자 승인 없이 다른 기기로 변경할 수 없습니다.
              </div>
            </div>
          </div>

          <button onClick={handleLogout} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-4 text-slate-700">
            <LogOut size={18} />
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  /**
   * 오전 회원앱의 개인정보 수정 화면을 렌더링합니다.
   */
  function renderProfileEdit() {
    return (
      <div className="min-h-screen bg-slate-50 px-4 pt-6 pb-24">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center gap-4">
            <button onClick={() => setProfileView('main')} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
              <ChevronLeft size={22} />
            </button>
            <h2 className="text-xl font-semibold text-slate-900">개인 정보 설정</h2>
          </div>

          <div className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
            {user?.pendingProfileChange?.requestedAt ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
                승인 대기 중인 요청이 있습니다.
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>이름</label>
                <input value={editForm.name} readOnly className={`${inputBase} bg-slate-100 text-slate-500`} />
              </div>
              <div>
                <label className={labelBase}>생년월일</label>
                <input type="date" value={editForm.dob} onChange={(event) => updateEditField('dob', event.target.value)} className={inputBase} />
              </div>
            </div>
            <div>
              <label className={labelBase}>휴대폰 번호</label>
              <div className="flex gap-2">
                <input value={editForm.phone} readOnly className={`${inputBase} flex-1 bg-slate-100 text-slate-500`} />
                <button type="button" className="h-11 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-600">
                  변경
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>시/도</label>
                <input value={editForm.city} onChange={(event) => updateEditField('city', event.target.value)} className={inputBase} />
              </div>
              <div>
                <label className={labelBase}>시/군/구</label>
                <input value={editForm.district} onChange={(event) => updateEditField('district', event.target.value)} className={inputBase} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>읍/면/동</label>
                <input value={editForm.dong} onChange={(event) => updateEditField('dong', event.target.value)} className={inputBase} />
              </div>
              <div>
                <label className={labelBase}>복지사명</label>
                <input value={editForm.welfareName} onChange={(event) => updateEditField('welfareName', event.target.value)} className={inputBase} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelBase}>나이</label>
                <input value={editForm.age ? `${editForm.age}세` : ''} className={`${inputBase} bg-slate-100 text-slate-500`} readOnly />
              </div>
              <div>
                <label className={labelBase}>성별</label>
                <select value={editForm.gender} onChange={(event) => updateEditField('gender', event.target.value)} className={inputBase}>
                  <option value="남성">남성</option>
                  <option value="여성">여성</option>
                </select>
              </div>
              <div>
                <label className={labelBase}>혈액형</label>
                <select value={editForm.bloodType} onChange={(event) => updateEditField('bloodType', event.target.value)} className={inputBase}>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>복용 중인 약물</label>
                <textarea value={editForm.medications} onChange={(event) => updateEditField('medications', event.target.value)} className={`${inputBase} h-24 py-3`} />
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelBase}>알레르기</label>
                  <input value={editForm.allergies} onChange={(event) => updateEditField('allergies', event.target.value)} className={inputBase} />
                </div>
                <div>
                  <label className={labelBase}>만성 질환</label>
                  <input value={editForm.diseases} onChange={(event) => updateEditField('diseases', event.target.value)} className={inputBase} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>보호자 이름</label>
                <input value={editForm.emergencyName} onChange={(event) => updateEditField('emergencyName', event.target.value)} className={inputBase} />
              </div>
              <div>
                <label className={labelBase}>관계</label>
                <input value={editForm.emergencyRelation} onChange={(event) => updateEditField('emergencyRelation', event.target.value)} className={inputBase} />
              </div>
            </div>
            <div>
              <label className={labelBase}>보호자 연락처</label>
              <input value={editForm.emergencyPhone} onChange={(event) => updateEditField('emergencyPhone', event.target.value)} className={inputBase} />
            </div>

            {editError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[13px] text-rose-500">{editError}</p> : null}

            <button onClick={handleSaveProfile} disabled={loading} className="h-11 w-full rounded-2xl bg-slate-900 text-white disabled:opacity-50">
              {loading ? '저장 중...' : user?.pendingProfileChange?.requestedAt ? '변경 요청 다시 저장하기' : '변경사항 저장하기'}
            </button>
            <button onClick={handleDeleteAccount} disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 disabled:opacity-50">
              <Trash2 size={16} />
              회원 탈퇴
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authMode === 'signup') return renderSignup();
    if (authMode === 'reset-password') return renderResetPassword();
    return renderLogin();
  }

  if (profileView === 'edit') {
    return renderProfileEdit();
  }

  return renderProfileMain();
}
