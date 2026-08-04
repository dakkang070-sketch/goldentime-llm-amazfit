import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, KeyRound, Mail, Phone, Plus, RefreshCw, Search, Settings2, ShieldAlert, Trash2, UserCircle2, X } from 'lucide-react';
import { AdminAccount, AdminAccountUpdateInput, AdminMenuPermission, ManualAdminRegistrationInput, PendingStaffApproval } from '../types';
import { adminService } from '../services/adminService';
import { ADMIN_MENU_OPTIONS } from '../constants/adminMenus';
import { EMAIL_DOMAIN_DIRECT_VALUE, EMAIL_DOMAIN_OPTIONS } from '../constants/emailDomains';

/**
 * 제출 시각을 관리자 상세 패널 형식으로 변환합니다.
 */
const formatSubmittedAt = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

/**
 * 리스트 행에서는 날짜를 짧게 줄여 가로 폭을 절약합니다.
 */
const formatListSubmittedAt = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
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
 * 연락처 문자열을 앞자리와 나머지 8자리로 분리합니다.
 */
const splitPhoneInput = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  const prefix = digits.slice(0, 3) || '010';
  const rest = digits.slice(3, 11);
  return { prefix, rest };
};

/**
 * 이메일 문자열을 아이디, 도메인 선택값, 직접입력 도메인으로 분리합니다.
 */
const splitEmailInput = (value: string) => {
  const [emailId = '', ...domainParts] = String(value || '').trim().split('@');
  const domain = domainParts.join('@').trim();
  if (!domain) {
    return {
      emailId: emailId.trim(),
      emailDomain: '',
      emailCustomDomain: '',
    };
  }

  if (EMAIL_DOMAIN_OPTIONS.includes(domain)) {
    return {
      emailId: emailId.trim(),
      emailDomain: domain,
      emailCustomDomain: '',
    };
  }

  return {
    emailId: emailId.trim(),
    emailDomain: EMAIL_DOMAIN_DIRECT_VALUE,
    emailCustomDomain: domain,
  };
};

const adminFormSelectClass = 'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[15px] text-black outline-none focus:border-violet-500';
const adminEmailDomainGridClass = 'mt-2 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_20px_minmax(220px,240px)] md:items-center';

/**
 * 관리자 계정 상태를 고정 폭 배지 스타일로 렌더링합니다.
 */
const renderAccountStatusBadge = (
  accountStatus: AdminAccount['accountStatus'],
  variant: 'list' | 'detail' = 'list',
) => {
  const baseClass =
    variant === 'detail'
      ? 'inline-flex min-w-[82px] items-center justify-center rounded-full border px-2 py-0.5 text-[12px] whitespace-nowrap text-white shadow-sm'
      : 'inline-flex w-[104px] items-center justify-center rounded-full border px-2.5 py-1 text-[13px] whitespace-nowrap text-white shadow-sm';
  if (accountStatus === 'pending') {
    return <span className={`${baseClass} border-blue-700 bg-blue-600`}>승인 대기</span>;
  }
  if (accountStatus === 'rejected') {
    return <span className={`${baseClass} border-rose-700 bg-rose-600`}>반려</span>;
  }
  if (accountStatus === 'suspended') {
    return <span className={`${baseClass} border-amber-600 bg-amber-500`}>이용 정지</span>;
  }
  if (accountStatus === 'withdrawn') {
    return <span className={`${baseClass} border-slate-700 bg-slate-600`}>해지</span>;
  }
  return <span className={`${baseClass} border-emerald-700 bg-emerald-600`}>사용중</span>;
};

/**
 * 메뉴 권한 목록을 동일한 순서의 라벨 문자열로 변환합니다.
 */
const formatPermissionSummary = (permissions: AdminMenuPermission[]) => {
  const labels = ADMIN_MENU_OPTIONS.filter((option) => permissions.includes(option.id)).map((option) => option.label);
  return labels.length > 0 ? labels.join(', ') : '권한 미설정';
};

/**
 * 메뉴 권한 배열이 같은 구성을 갖는지 비교합니다.
 */
const hasSamePermissions = (left: AdminMenuPermission[], right: AdminMenuPermission[]) => {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
};

/**
 * 관리자 전체 계정 리스트와 메뉴 권한 설정을 제공하는 관리자 페이지입니다.
 */
export const AdminManagement: React.FC = () => {
  const [editEmailId, setEditEmailId] = useState('');
  const [editEmailDomain, setEditEmailDomain] = useState('');
  const [editEmailCustomDomain, setEditEmailCustomDomain] = useState('');
  const [editPhonePrefix, setEditPhonePrefix] = useState('010');
  const [editPhoneRest, setEditPhoneRest] = useState('');
  const [createEmailId, setCreateEmailId] = useState('');
  const [createEmailDomain, setCreateEmailDomain] = useState('');
  const [createEmailCustomDomain, setCreateEmailCustomDomain] = useState('');
  const [createPhonePrefix, setCreatePhonePrefix] = useState('010');
  const [createPhoneRest, setCreatePhoneRest] = useState('');
  const [createPasswordConfirm, setCreatePasswordConfirm] = useState('');
  const [createVerificationCode, setCreateVerificationCode] = useState('');
  const [createVerificationToken, setCreateVerificationToken] = useState('');
  const [isPhoneVerificationRequested, setIsPhoneVerificationRequested] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [verificationSending, setVerificationSending] = useState(false);
  const [verificationChecking, setVerificationChecking] = useState(false);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [accountStatusDraft, setAccountStatusDraft] = useState<PendingStaffApproval['accountStatus']>('active');
  const [editForm, setEditForm] = useState<AdminAccountUpdateInput>({
    email: '',
    phone: '',
    menuPermissions: ADMIN_MENU_OPTIONS.map((option) => option.id),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<ManualAdminRegistrationInput>({
    name: '',
    email: '',
    password: '',
    phone: '',
    menuPermissions: ADMIN_MENU_OPTIONS.map((option) => option.id),
  });
  const createNameValidationMessage =
    createForm.name.trim().length === 0
      ? ''
      : createForm.name.trim().length < 2
        ? '이름은 2자 이상 입력해주세요.'
        : '이름 형식이 올바릅니다.';
  const createPhoneValidationMessage =
    createPhoneRest.length === 0
      ? ''
      : createPhoneRest.length < 8
        ? '연락처는 숫자만 8자리 입력해주세요.'
        : '연락처 형식이 올바릅니다.';
  const createPhoneDisplayValue =
    createPhoneRest.length <= 4 ? createPhoneRest : `${createPhoneRest.slice(0, 4)}-${createPhoneRest.slice(4, 8)}`;
  const createResolvedEmailDomain =
    createEmailDomain === EMAIL_DOMAIN_DIRECT_VALUE ? createEmailCustomDomain.trim() : createEmailDomain;
  const createEmailValidationMessage =
    createEmailId.trim().length === 0 && createEmailDomain.length === 0 && createEmailCustomDomain.trim().length === 0
      ? ''
      : !createEmailId.trim()
        ? '이메일 아이디를 입력해주세요.'
        : !createEmailDomain
          ? '메일주소를 선택해주세요.'
          : createEmailDomain === EMAIL_DOMAIN_DIRECT_VALUE && !createEmailCustomDomain.trim()
            ? '직접 입력할 메일주소를 입력해주세요.'
            : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(`${createEmailId.trim()}@${createResolvedEmailDomain}`)
              ? '이메일 형식을 확인해주세요.'
              : '이메일 형식이 올바릅니다.';
  const createPasswordValidationMessage =
    createForm.password.length === 0
      ? ''
      : createForm.password.length < 8
        ? '비밀번호는 8자 이상 입력해주세요.'
        : '사용 가능한 비밀번호입니다.';
  const createPasswordConfirmValidationMessage =
    createPasswordConfirm.length === 0
      ? ''
      : createForm.password.length < 8
        ? '먼저 비밀번호를 8자 이상 입력해주세요.'
        : createForm.password === createPasswordConfirm
          ? '비밀번호가 일치합니다.'
          : '비밀번호가 일치하지 않습니다.';
  const isCreateAdminFormValid =
    createForm.name.trim().length >= 2 &&
    createPhoneRest.length === 8 &&
    createEmailValidationMessage === '이메일 형식이 올바릅니다.' &&
    createForm.password.length >= 8 &&
    createForm.password === createPasswordConfirm &&
    createForm.menuPermissions.length > 0 &&
    isPhoneVerified &&
    Boolean(createVerificationToken);

  /**
   * 관리자 전체 계정 목록을 불러옵니다.
   */
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const next = await adminService.getAdminAccounts();
      setAdmins(next);
      setSelectedAdminId((current) => {
        if (next.length === 0) return null;
        return current && next.some((entry) => entry.id === current) ? current : next[0].id;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  /**
   * 현재 선택된 관리자 상세 정보를 계산합니다.
   */
  const selectedAdmin = useMemo(
    () => admins.find((entry) => entry.id === selectedAdminId) || null,
    [admins, selectedAdminId],
  );

  /**
   * 선택된 관리자가 바뀌면 우측 상세 드래프트를 함께 동기화합니다.
   */
  useEffect(() => {
    if (!selectedAdmin) return;
    const nextPhone = splitPhoneInput(selectedAdmin.phone || '');
    const nextEmail = splitEmailInput(selectedAdmin.email || '');

    setEditPhonePrefix(nextPhone.prefix);
    setEditPhoneRest(nextPhone.rest);
    setEditEmailId(nextEmail.emailId);
    setEditEmailDomain(nextEmail.emailDomain);
    setEditEmailCustomDomain(nextEmail.emailCustomDomain);
    setAccountStatusDraft(selectedAdmin.accountStatus);
    setEditForm({
      email: selectedAdmin.email || '',
      phone: formatPhoneNumber(selectedAdmin.phone || ''),
      menuPermissions: selectedAdmin.menuPermissions,
    });
  }, [selectedAdmin]);
  const editPhoneDisplayValue =
    editPhoneRest.length <= 4 ? editPhoneRest : `${editPhoneRest.slice(0, 4)}-${editPhoneRest.slice(4, 8)}`;
  const normalizedEditEmail = editForm.email.trim();
  const normalizedSelectedAdminPhone = formatPhoneNumber(selectedAdmin?.phone || '');
  const normalizedEditPhone = formatPhoneNumber(editForm.phone);
  const editPhoneDigits = normalizedEditPhone.replace(/\D/g, '');
  const isEditEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEditEmail);
  const isEditPhoneValid = editPhoneDigits.length >= 10 && editPhoneDigits.length <= 11;
  const hasEditEmailChanged = Boolean(selectedAdmin) && normalizedEditEmail !== (selectedAdmin?.email || '');
  const hasEditPhoneChanged = Boolean(selectedAdmin) && normalizedEditPhone !== normalizedSelectedAdminPhone;
  const hasEditPermissionChanged = Boolean(selectedAdmin) && !hasSamePermissions(selectedAdmin.menuPermissions, editForm.menuPermissions);
  const editEmailValidationMessage =
    !selectedAdmin || (!hasEditEmailChanged && normalizedEditEmail.length > 0)
      ? ''
      : normalizedEditEmail.length === 0
        ? '이메일을 입력해주세요.'
        : !isEditEmailValid
          ? '이메일 형식을 확인해주세요.'
          : '이메일 형식이 올바릅니다.';
  const editPhoneValidationMessage =
    !selectedAdmin || (!hasEditPhoneChanged && normalizedEditPhone.length > 0)
      ? ''
      : normalizedEditPhone.length === 0
        ? '연락처를 입력해주세요.'
        : !isEditPhoneValid
          ? '연락처 형식을 확인해주세요.'
          : '연락처 형식이 올바릅니다.';
  const editPermissionValidationMessage =
    !selectedAdmin || (!hasEditPermissionChanged && editForm.menuPermissions.length > 0)
      ? ''
      : editForm.menuPermissions.length === 0
        ? '최소 1개 이상의 메뉴 권한을 선택해주세요.'
        : '메뉴 권한 설정이 올바릅니다.';
  const isProfileFormValid = isEditEmailValid && isEditPhoneValid && editForm.menuPermissions.length > 0;

  /**
   * 검색어를 기준으로 관리자 리스트를 이름, 이메일, 연락처, 메뉴 라벨로 필터링합니다.
   */
  const filteredAdmins = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return admins;

    return admins.filter((entry) => {
      const permissionText = formatPermissionSummary(entry.menuPermissions).toLowerCase();
      return (
        entry.name.toLowerCase().includes(keyword) ||
        entry.email.toLowerCase().includes(keyword) ||
        entry.phone.toLowerCase().includes(keyword) ||
        permissionText.includes(keyword)
      );
    });
  }, [admins, searchTerm]);

  /**
   * 상세 패널의 기본 입력값을 갱신합니다.
   */
  const handleEditFormChange = (key: keyof Omit<AdminAccountUpdateInput, 'menuPermissions'>, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [key]: key === 'phone' ? formatPhoneNumber(value) : value,
    }));
  };

  /**
   * 상세 패널의 연락처를 앞자리 선택값과 숫자 입력값으로 합쳐 저장합니다.
   */
  const syncEditPhone = (nextPrefix: string, nextRest: string) => {
    const normalizedRest = nextRest.replace(/\D/g, '').slice(0, 8);
    setEditPhonePrefix(nextPrefix);
    setEditPhoneRest(normalizedRest);
    setEditForm((prev) => ({
      ...prev,
      phone: formatPhoneNumber(`${nextPrefix}${normalizedRest}`),
    }));
  };

  /**
   * 상세 패널의 이메일 아이디/도메인 입력값을 합쳐 실제 이메일 문자열을 동기화합니다.
   */
  const syncEditEmail = (nextId: string, nextDomain: string, nextCustomDomain: string) => {
    const normalizedId = nextId.trim();
    const normalizedCustomDomain = nextCustomDomain.trim();
    const resolvedDomain = nextDomain === EMAIL_DOMAIN_DIRECT_VALUE ? normalizedCustomDomain : nextDomain;

    setEditEmailId(nextId);
    setEditEmailDomain(nextDomain);
    setEditEmailCustomDomain(nextCustomDomain);
    setEditForm((prev) => ({
      ...prev,
      email: normalizedId && resolvedDomain ? `${normalizedId}@${resolvedDomain}` : '',
    }));
  };

  /**
   * 등록 모달의 기본 입력값을 갱신합니다.
   */
  const handleCreateFormChange = (key: keyof Omit<ManualAdminRegistrationInput, 'menuPermissions'>, value: string) => {
    setCreateForm((prev) => ({
      ...prev,
      [key]: key === 'phone' ? formatPhoneNumber(value) : value,
    }));
  };

  /**
   * 등록 모달의 연락처 앞자리와 나머지 숫자를 합쳐 실제 연락처 값을 동기화합니다.
   */
  const syncCreatePhone = (nextPrefix: string, nextRest: string) => {
    const normalizedRest = nextRest.replace(/\D/g, '').slice(0, 8);
    const normalizedPhone = normalizedRest ? `${nextPrefix}-${normalizedRest.slice(0, 4)}-${normalizedRest.slice(4)}` : nextPrefix;

    setCreatePhonePrefix(nextPrefix);
    setCreatePhoneRest(normalizedRest);
    setCreateVerificationCode('');
    setCreateVerificationToken('');
    setIsPhoneVerificationRequested(false);
    setIsPhoneVerified(false);
    setCreateForm((prev) => ({
      ...prev,
      phone: normalizedPhone,
      phoneVerificationToken: '',
    }));
  };

  /**
   * 등록 모달의 이메일 아이디/도메인 입력값을 합쳐 실제 이메일 문자열을 동기화합니다.
   */
  const syncCreateEmail = (nextId: string, nextDomain: string, nextCustomDomain: string) => {
    const normalizedId = nextId.trim();
    const normalizedCustomDomain = nextCustomDomain.trim();
    const resolvedDomain = nextDomain === EMAIL_DOMAIN_DIRECT_VALUE ? normalizedCustomDomain : nextDomain;

    setCreateEmailId(nextId);
    setCreateEmailDomain(nextDomain);
    setCreateEmailCustomDomain(nextCustomDomain);
    setCreateForm((prev) => ({
      ...prev,
      email: normalizedId && resolvedDomain ? `${normalizedId}@${resolvedDomain}` : '',
    }));
  };

  /**
   * 관리자 등록용 휴대폰으로 인증번호 발송을 요청합니다.
   */
  const handleRequestPhoneVerification = async () => {
    if (createPhoneRest.length < 8) {
      alert('연락처는 숫자만 8자리 입력해주세요.');
      return;
    }

    try {
      setVerificationSending(true);
      const ok = await adminService.requestStaffPhoneVerification(createForm.phone);
      if (!ok) {
        alert('인증번호 발송에 실패했습니다.');
        return;
      }
      setIsPhoneVerificationRequested(true);
      setIsPhoneVerified(false);
      setCreateVerificationCode('');
      setCreateVerificationToken('');
      setCreateForm((prev) => ({
        ...prev,
        phoneVerificationToken: '',
      }));
      alert('인증번호를 발송했습니다.');
    } finally {
      setVerificationSending(false);
    }
  };

  /**
   * 입력한 인증번호를 확인하고 등록용 인증 토큰을 저장합니다.
   */
  const handleVerifyPhoneCode = async () => {
    if (!createForm.phone || !createVerificationCode) {
      alert('연락처와 인증번호를 확인해주세요.');
      return;
    }

    try {
      setVerificationChecking(true);
      const verificationToken = await adminService.verifyStaffPhoneCode(createForm.phone, createVerificationCode);
      if (!verificationToken) {
        alert('인증번호 확인에 실패했습니다.');
        return;
      }
      setCreateVerificationToken(verificationToken);
      setIsPhoneVerified(true);
      setCreateForm((prev) => ({
        ...prev,
        phoneVerificationToken: verificationToken,
      }));
      alert('휴대폰 인증이 완료되었습니다.');
    } finally {
      setVerificationChecking(false);
    }
  };

  /**
   * 상세 패널에서 메뉴 권한 체크 상태를 토글합니다.
   */
  const handleToggleEditPermission = (permission: AdminMenuPermission) => {
    setEditForm((prev) => ({
      ...prev,
      menuPermissions: prev.menuPermissions.includes(permission)
        ? prev.menuPermissions.filter((entry) => entry !== permission)
        : [...prev.menuPermissions, permission],
    }));
  };

  /**
   * 등록 모달에서 메뉴 권한 체크 상태를 토글합니다.
   */
  const handleToggleCreatePermission = (permission: AdminMenuPermission) => {
    setCreateForm((prev) => ({
      ...prev,
      menuPermissions: prev.menuPermissions.includes(permission)
        ? prev.menuPermissions.filter((entry) => entry !== permission)
        : [...prev.menuPermissions, permission],
    }));
  };

  /**
   * 좌측 리스트에서 선택한 관리자 계정을 우측 상세 패널에 반영합니다.
   */
  const handleRowClick = (admin: AdminAccount) => {
    setSelectedAdminId(admin.id);
  };

  /**
   * 관리자 기본 정보와 메뉴 권한을 저장합니다.
   */
  const handleProfileSave = async () => {
    if (!selectedAdmin) return;
    if (!normalizedEditEmail) {
      alert('이메일은 필수입니다.');
      return;
    }
    if (!isEditEmailValid) {
      alert('이메일 형식을 확인해주세요.');
      return;
    }
    if (!normalizedEditPhone) {
      alert('연락처는 필수입니다.');
      return;
    }
    if (!isEditPhoneValid) {
      alert('연락처 형식을 확인해주세요.');
      return;
    }
    if (editForm.menuPermissions.length === 0) {
      alert('최소 1개 이상의 메뉴 권한을 선택해주세요.');
      return;
    }

    const nextEditForm = {
      ...editForm,
      email: normalizedEditEmail,
      phone: normalizedEditPhone,
    };

    const confirmed = window.confirm('저장하시겠습니까?');
    if (!confirmed) return;

    try {
      setProcessingId(selectedAdmin.id);
      const ok = await adminService.updateAdminAccount(selectedAdmin.id, nextEditForm);
      if (!ok) {
        alert('관리자 정보 수정에 실패했습니다.');
        return;
      }
      await fetchAdmins();
      alert('저장되었습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * 관리자 계정 상태를 저장합니다.
   */
  const handleAccountStatusSave = async () => {
    if (!selectedAdmin) return;

    const confirmed = window.confirm('저장하시겠습니까?');
    if (!confirmed) return;

    try {
      setProcessingId(selectedAdmin.id);
      const ok = await adminService.updateStaffApproval(selectedAdmin.id, accountStatusDraft);
      if (!ok) {
        alert('관리자 계정 상태 변경에 실패했습니다.');
        return;
      }
      await fetchAdmins();
      alert('저장되었습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * 어드민에서 관리자 계정을 직접 등록합니다.
   */
  const handleCreateAdmin = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      alert('이름, 이메일, 비밀번호는 필수입니다.');
      return;
    }
    if (createForm.name.trim().length < 2) {
      alert('이름은 2자 이상 입력해주세요.');
      return;
    }
    if (createPhoneRest.length < 8) {
      alert('연락처는 숫자만 8자리 입력해주세요.');
      return;
    }
    if (!createEmailId.trim()) {
      alert('이메일 아이디를 입력해주세요.');
      return;
    }
    if (!createEmailDomain) {
      alert('이메일 주소를 선택해주세요.');
      return;
    }
    if (createEmailDomain === EMAIL_DOMAIN_DIRECT_VALUE && !createEmailCustomDomain.trim()) {
      alert('직접 입력할 메일주소를 입력해주세요.');
      return;
    }
    if (createForm.password.length < 8) {
      alert('비밀번호는 8자 이상 입력해주세요.');
      return;
    }
    if (createForm.password !== createPasswordConfirm) {
      alert('비밀번호와 비밀번호 재입력이 일치하지 않습니다.');
      return;
    }
    if (createForm.menuPermissions.length === 0) {
      alert('최소 1개 이상의 메뉴 권한을 선택해주세요.');
      return;
    }
    if (!isPhoneVerified || !createVerificationToken) {
      alert('휴대폰 인증을 완료한 뒤 등록해주세요.');
      return;
    }

    try {
      setCreateProcessing(true);
      const ok = await adminService.createAdminAccount(createForm);
      if (!ok) {
        alert('관리자 등록에 실패했습니다.');
        return;
      }

      setCreateForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        menuPermissions: ADMIN_MENU_OPTIONS.map((option) => option.id),
        phoneVerificationToken: '',
      });
      setCreateEmailId('');
      setCreateEmailDomain('');
      setCreateEmailCustomDomain('');
      setCreatePhonePrefix('010');
      setCreatePhoneRest('');
      setCreatePasswordConfirm('');
      setCreateVerificationCode('');
      setCreateVerificationToken('');
      setIsPhoneVerificationRequested(false);
      setIsPhoneVerified(false);
      setIsCreateOpen(false);
      await fetchAdmins();
    } finally {
      setCreateProcessing(false);
    }
  };

  /**
   * 선택된 관리자 계정을 삭제합니다.
   */
  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;
    const confirmed = window.confirm('삭제하시겠습니까?\n삭제된 관리자 계정은 복구할 수 없습니다.');
    if (!confirmed) return;

    try {
      setDeletingAdminId(selectedAdmin.id);
      const ok = await adminService.deleteAdminAccount(selectedAdmin.id);
      if (!ok) {
        alert('관리자 삭제에 실패했습니다.');
        return;
      }
      await fetchAdmins();
    } finally {
      setDeletingAdminId(null);
    }
  };

  /**
   * 상세 패널의 저장 버튼 활성화 여부를 계산합니다.
   */
  const isProfileChanged = selectedAdmin
    ? selectedAdmin.email !== normalizedEditEmail ||
      normalizedSelectedAdminPhone !== normalizedEditPhone ||
      !hasSamePermissions(selectedAdmin.menuPermissions, editForm.menuPermissions)
    : false;

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-slate-100">
      <div className={`flex min-w-0 flex-1 flex-col p-5 transition-all duration-300 ${selectedAdmin ? 'w-1/2' : 'w-full'}`}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[28px] leading-none text-black">관리자관리</h2>
            <p className="mt-1 text-[14px] text-black">백오피스 관리자 계정과 메뉴 접근 권한을 관리합니다.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex h-10 min-w-[88px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-violet-600 px-4 text-[14px] text-white shadow-sm hover:bg-violet-700"
              >
                <Plus size={16} />
                등록
              </button>
              <button
                onClick={fetchAdmins}
                type="button"
                title="새로고침"
                aria-label="새로고침"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-black shadow-sm hover:bg-slate-50"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <div className="relative w-60 min-w-[220px] flex-1 sm:flex-none xl:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
              <input
                type="text"
                placeholder="이름, 연락처, 권한 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-[14px] text-black shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md">
          <div className="flex-1 overflow-hidden">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr className="border-b border-slate-300">
                  <th className="w-[18%] px-2.5 py-3 text-[12px] uppercase whitespace-nowrap text-black">이름</th>
                  <th className="w-[16%] px-2.5 py-3 text-[12px] uppercase whitespace-nowrap text-black">전화번호</th>
                  <th className="w-[26%] px-2.5 py-3 text-[12px] uppercase whitespace-nowrap text-black">메뉴 권한</th>
                  <th className="w-[14%] px-2.5 py-3 text-[12px] uppercase whitespace-nowrap text-black">상태</th>
                  <th className="w-[26%] px-2.5 py-3 text-[12px] uppercase whitespace-nowrap text-black">등록일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">데이터를 불러오는 중입니다...</td>
                  </tr>
                ) : filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr
                      key={admin.id}
                      onClick={() => handleRowClick(admin)}
                      className={`group cursor-pointer transition-colors ${selectedAdmin?.id === admin.id ? 'bg-violet-100' : 'hover:bg-slate-100'}`}
                    >
                      <td className="px-2.5 py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm text-black ${selectedAdmin?.id === admin.id ? 'bg-violet-200' : 'bg-slate-100'}`}>
                            {admin.name[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate whitespace-nowrap text-[14px] text-black">{admin.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5 text-[12px] whitespace-nowrap text-slate-700">
                        {formatPhoneNumber(admin.phone || '') || '-'}
                      </td>
                      <td className="px-2.5 py-2.5 text-[12px] whitespace-nowrap text-black">
                        <span className="block truncate">{formatPermissionSummary(admin.menuPermissions)}</span>
                      </td>
                      <td className="px-2.5 py-2.5 whitespace-nowrap">{renderAccountStatusBadge(admin.accountStatus)}</td>
                      <td className="px-2.5 py-2.5 text-[12px] whitespace-nowrap text-black">
                        <span className="block truncate">{formatListSubmittedAt(admin.createdAt)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-300 bg-slate-100 px-4 py-2 text-[13px] text-slate-600">
            총 <span className="text-black">{filteredAdmins.length}</span>명
          </div>
        </div>
      </div>

      {selectedAdmin && (
        <div className="flex w-[440px] min-w-[440px] min-h-0 flex-col border-l border-slate-300 bg-white shadow-[-8px_0_24px_rgba(15,23,42,0.08)] xl:w-[460px] xl:min-w-[460px]">
          <div className="flex-1 min-h-0 overflow-y-auto p-5">
            <div className="mb-5 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                    <ShieldAlert size={24} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[22px] text-black">{selectedAdmin.name}</h3>
                      {renderAccountStatusBadge(selectedAdmin.accountStatus, 'detail')}
                    </div>
                    <p className="mt-1 text-[12px] text-slate-500">백오피스 시스템 관리자 계정</p>
                  </div>
                </div>
                <button
                  onClick={handleDeleteAdmin}
                  disabled={deletingAdminId === selectedAdmin.id || processingId !== null}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-[14px] text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  삭제
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-[12px] text-slate-500">현재 이메일</p>
                  <p className="mt-1 break-all text-[14px] text-black">{selectedAdmin.email || '이메일 미입력'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-[12px] text-slate-500">연락처</p>
                  <p className="mt-1 text-[14px] text-black">{formatPhoneNumber(selectedAdmin.phone || '') || '연락처 미입력'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:col-span-2">
                  <p className="text-[12px] text-slate-500">등록일시</p>
                  <p className="mt-1 text-[14px] text-black">{formatSubmittedAt(selectedAdmin.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
                <h4 className="mb-3 text-[16px] text-black">기본 정보</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <label className="block">
                      <span className="flex items-center gap-2 text-[13px] text-black">
                        <Mail size={16} className="text-black" />
                        이메일
                      </span>
                      <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-[13px] text-violet-700">
                        {editForm.email || '이메일을 입력해주세요.'}
                      </div>
                      <div className={adminEmailDomainGridClass}>
                        <input
                          value={editEmailId}
                          onChange={(e) => syncEditEmail(e.target.value, editEmailDomain, editEmailCustomDomain)}
                          placeholder="이메일 아이디"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] text-black outline-none focus:border-violet-500"
                        />
                        <div className="flex items-center justify-center text-[16px] leading-none text-slate-500">
                          @
                        </div>
                        <select
                          value={editEmailDomain}
                          onChange={(e) => syncEditEmail(editEmailId, e.target.value, editEmailCustomDomain)}
                          className={adminFormSelectClass}
                        >
                          <option value="">메일주소 선택</option>
                          {EMAIL_DOMAIN_OPTIONS.map((domain) => (
                            <option key={domain} value={domain}>
                              {domain}
                            </option>
                          ))}
                          <option value={EMAIL_DOMAIN_DIRECT_VALUE}>직접입력</option>
                        </select>
                      </div>
                      {editEmailDomain === EMAIL_DOMAIN_DIRECT_VALUE && (
                        <input
                          value={editEmailCustomDomain}
                          onChange={(e) => syncEditEmail(editEmailId, editEmailDomain, e.target.value)}
                          placeholder="메일주소 직접 입력"
                          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] text-black outline-none focus:border-violet-500"
                        />
                      )}
                      {editEmailValidationMessage && (
                        <p className={`mt-2 text-[12px] ${editEmailValidationMessage === '이메일 형식이 올바릅니다.' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {editEmailValidationMessage}
                        </p>
                      )}
                    </label>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <label className="block">
                      <span className="flex items-center gap-2 text-[13px] text-black">
                        <Phone size={16} className="text-black" />
                        연락처
                      </span>
                      <div className="mt-2 grid grid-cols-[96px_1fr] gap-2">
                        <select
                          value={editPhonePrefix}
                          onChange={(e) => syncEditPhone(e.target.value, editPhoneRest)}
                          className={adminFormSelectClass}
                        >
                          <option value="010">010</option>
                          <option value="011">011</option>
                          <option value="016">016</option>
                          <option value="017">017</option>
                          <option value="018">018</option>
                          <option value="019">019</option>
                        </select>
                        <input
                          value={editPhoneDisplayValue}
                          onChange={(e) => syncEditPhone(editPhonePrefix, e.target.value)}
                          inputMode="numeric"
                          placeholder="0000-0000"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] text-black outline-none focus:border-violet-500"
                        />
                      </div>
                      {editPhoneValidationMessage && (
                        <p className={`mt-2 text-[12px] ${editPhoneValidationMessage === '연락처 형식이 올바릅니다.' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {editPhoneValidationMessage}
                        </p>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
                <h4 className="mb-3 text-[16px] text-black">메뉴 권한 관리</h4>
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-3 flex items-center gap-2 text-[13px] text-black">
                      <KeyRound size={16} className="text-black" />
                      접근 가능 메뉴
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {ADMIN_MENU_OPTIONS.map((option) => {
                        const checked = editForm.menuPermissions.includes(option.id);
                        return (
                          <label
                            key={option.id}
                            className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 ${checked ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white'}`}
                          >
                            <span className="text-[14px] text-black">{option.label}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleEditPermission(option.id)}
                              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                            />
                          </label>
                        );
                      })}
                    </div>
                    {editPermissionValidationMessage && (
                      <p className={`mt-2 text-[12px] ${editPermissionValidationMessage === '메뉴 권한 설정이 올바릅니다.' ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {editPermissionValidationMessage}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleProfileSave}
                    disabled={processingId !== null || !isProfileChanged || !isProfileFormValid}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-4 text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    정보 저장
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
                <h4 className="mb-3 text-[16px] text-black">계정 상태 관리</h4>
                <div className="grid grid-cols-[auto_1fr_auto] items-end gap-3">
                  <div>
                    <p className="mb-2 text-[13px] text-black">현재 상태</p>
                    <div>{renderAccountStatusBadge(selectedAdmin.accountStatus, 'detail')}</div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] text-black">변경할 상태</label>
                    <select
                      value={accountStatusDraft}
                      onChange={(e) => setAccountStatusDraft(e.target.value as PendingStaffApproval['accountStatus'])}
                      className={adminFormSelectClass}
                    >
                      <option value="active">사용중</option>
                      <option value="pending">승인 대기</option>
                      <option value="suspended">이용 정지</option>
                      <option value="rejected">반려</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAccountStatusSave}
                    disabled={processingId !== null || selectedAdmin.accountStatus === accountStatusDraft}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    상태 저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 sm:p-6">
          <div className="absolute inset-0" onClick={() => setIsCreateOpen(false)}></div>
          <div className="relative flex max-h-[calc(100vh-32px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-[22px] text-black">관리자 등록</h3>
                <p className="mt-1 text-[14px] text-slate-500">어드민에서 백오피스 관리자 계정을 직접 생성합니다.</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-black"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.68fr)_minmax(0,1.32fr)]">
                <label className="block">
                  <span className="text-[13px] text-slate-500">이름</span>
                  <input
                    value={createForm.name}
                    onChange={(e) => handleCreateFormChange('name', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-violet-500"
                  />
                  {createNameValidationMessage && (
                    <p className={`mt-2 text-[12px] ${createForm.name.trim().length < 2 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {createNameValidationMessage}
                    </p>
                  )}
                </label>
                <div className="block">
                  <span className="text-[13px] text-slate-500">연락처</span>
                  <div className="mt-1 grid grid-cols-[96px_1fr_auto] gap-2">
                    <select
                      value={createPhonePrefix}
                      onChange={(e) => syncCreatePhone(e.target.value, createPhoneRest)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[15px] text-black outline-none focus:border-violet-500"
                    >
                      <option value="010">010</option>
                      <option value="011">011</option>
                      <option value="016">016</option>
                      <option value="017">017</option>
                      <option value="018">018</option>
                      <option value="019">019</option>
                    </select>
                    <input
                      value={createPhoneDisplayValue}
                      onChange={(e) => syncCreatePhone(createPhonePrefix, e.target.value)}
                      inputMode="numeric"
                      placeholder="0000-0000"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-violet-500"
                    />
                    <button
                      onClick={handleRequestPhoneVerification}
                      disabled={verificationSending || !createForm.phone || createPhoneRest.length < 8}
                      className="inline-flex h-[46px] items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 text-[14px] text-black hover:bg-slate-50 disabled:opacity-50"
                    >
                      {verificationSending ? '발송 중...' : '인증발송'}
                    </button>
                  </div>
                  {createPhoneValidationMessage && (
                    <p className={`mt-2 text-[12px] ${createPhoneRest.length < 8 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {createPhoneValidationMessage}
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] text-slate-700">문자 인증번호</p>
                    <p className="mt-1 text-[11px] text-slate-500">상대방에게 받은 6자리 번호를 입력해주세요.</p>
                  </div>
                  <span
                    className={`inline-flex min-w-[72px] items-center justify-center rounded-full px-2.5 py-1 text-[11px] ${
                      isPhoneVerified
                        ? 'bg-emerald-100 text-emerald-700'
                        : isPhoneVerificationRequested
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isPhoneVerified ? '인증완료' : isPhoneVerificationRequested ? '입력대기' : '발송필요'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_104px]">
                  <input
                    value={createVerificationCode}
                    onChange={(e) => setCreateVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="인증번호 6자리 입력"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-black outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={handleVerifyPhoneCode}
                    disabled={verificationChecking || !isPhoneVerificationRequested || !createVerificationCode}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-violet-600 px-3.5 text-[14px] text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {verificationChecking ? '확인 중...' : '인증 확인'}
                  </button>
                </div>
                <p className={`mt-2 text-[12px] ${isPhoneVerified ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {isPhoneVerified
                    ? '휴대폰 인증이 완료되었습니다.'
                    : isPhoneVerificationRequested
                      ? '상대방에게 전달된 인증번호를 확인해 입력해주세요.'
                      : '연락처 입력 후 인증번호를 발송해주세요.'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 flex items-center gap-2 text-[13px] text-slate-500">
                  <Mail size={16} />
                  이메일
                </p>
                <div className={adminEmailDomainGridClass}>
                  <input
                    value={createEmailId}
                    onChange={(e) => syncCreateEmail(e.target.value, createEmailDomain, createEmailCustomDomain)}
                    placeholder="이메일 아이디"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-violet-500"
                  />
                  <div className="flex items-center justify-center text-[18px] leading-none text-slate-500">
                    @
                  </div>
                  <select
                    value={createEmailDomain}
                    onChange={(e) => syncCreateEmail(createEmailId, e.target.value, createEmailCustomDomain)}
                    className={adminFormSelectClass}
                  >
                    <option value="">메일주소 선택</option>
                    {EMAIL_DOMAIN_OPTIONS.map((domain) => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                    <option value={EMAIL_DOMAIN_DIRECT_VALUE}>직접입력</option>
                  </select>
                </div>
                {createEmailDomain === EMAIL_DOMAIN_DIRECT_VALUE && (
                  <input
                    value={createEmailCustomDomain}
                    onChange={(e) => syncCreateEmail(createEmailId, createEmailDomain, e.target.value)}
                    placeholder="메일주소 직접 입력"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-violet-500"
                  />
                )}
                {createEmailValidationMessage && (
                  <p className={`mt-2 text-[12px] ${createEmailValidationMessage === '이메일 형식이 올바릅니다.' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {createEmailValidationMessage}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-[13px] text-slate-500">비밀번호</span>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => handleCreateFormChange('password', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-violet-500"
                  />
                  {createPasswordValidationMessage && (
                    <p className={`mt-2 text-[12px] ${createForm.password.length < 8 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {createPasswordValidationMessage}
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="text-[13px] text-slate-500">비밀번호 재입력</span>
                  <input
                    type="password"
                    value={createPasswordConfirm}
                    onChange={(e) => setCreatePasswordConfirm(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-black outline-none focus:border-violet-500"
                  />
                  {createPasswordConfirmValidationMessage && (
                    <p className={`mt-2 text-[12px] ${createForm.password === createPasswordConfirm && createForm.password.length >= 8 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {createPasswordConfirmValidationMessage}
                    </p>
                  )}
                </label>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 flex items-center gap-2 text-[13px] text-slate-500">
                  <Settings2 size={16} />
                  메뉴 권한 선택
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {ADMIN_MENU_OPTIONS.map((option) => {
                    const checked = createForm.menuPermissions.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 ${checked ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white'}`}
                      >
                        <span className="text-[14px] text-black">{option.label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleCreatePermission(option.id)}
                          className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleCreateAdmin}
                disabled={createProcessing || !isCreateAdminFormValid}
                className="rounded-lg bg-violet-600 px-4 py-2.5 text-white hover:bg-violet-700 disabled:opacity-50"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
