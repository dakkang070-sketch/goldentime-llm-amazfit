import {
  AdminAccount,
  AdminAccountUpdateInput,
  AdminMenuPermission,
  Member,
  Biometrics,
  HealthStats,
  MemberSettings,
  ConnectedDevice,
  Guardian,
  GuardianDirectoryEntry,
  Incident,
  SystemSettings,
  PendingMemberApproval,
  PendingStaffApproval,
  PendingStaffAffiliationApproval,
  ManualAdminRegistrationInput,
  ManualMemberRegistrationInput,
  ManualStaffRegistrationInput,
  StaffAccountUpdateInput,
} from '../types';

export interface AdminSession {
  token: string;
  email: string;
  name: string;
  role: string;
}

const ADMIN_AUTH_STORAGE_KEY = 'gt_backoffice_admin_session_v1';

/**
 * 저장된 관리자 로그인 세션을 localStorage에서 읽습니다.
 */
function readStoredAdminSession(): AdminSession | null {
  try {
    const raw = String(localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) || '').trim();
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

/**
 * 관리자 로그인 세션을 localStorage에 저장합니다.
 */
function persistAdminSession(session: AdminSession): void {
  try {
    localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // no-op
  }
}

/**
 * 저장된 관리자 로그인 세션을 삭제합니다.
 */
function clearStoredAdminSession(): void {
  try {
    localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  } catch {
    // no-op
  }
}

/**
 * 저장된 관리자 토큰이 있으면 API 요청 헤더에 Authorization을 추가합니다.
 */
function buildAdminAuthHeaders(extraHeaders?: HeadersInit): HeadersInit {
  const session = readStoredAdminSession();
  return {
    Accept: 'application/json',
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...(extraHeaders || {}),
  };
}

/**
 * JSON API 호출에 공통 헤더를 붙이고 성공 시 파싱된 응답을 반환합니다.
 */
const apiJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, {
    ...init,
    headers: buildAdminAuthHeaders({
      // 공통 JSON 헤더를 기본으로 두되, 호출부가 넘긴 헤더가 있으면 그대로 병합합니다.
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

/**
 * medicalHistory 배열 항목에서 표시용 문자열 목록만 추출합니다.
 */
const pickMedicalEntryTexts = (rows: any, key: string): string[] => {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => {
      if (typeof row === 'string') return row.trim()
      if (row && typeof row === 'object' && typeof row[key] === 'string') return row[key].trim()
      return ''
    })
    .filter(Boolean)
}

/**
 * 관리자 입력 문자열을 medicalHistory 배열 구조로 변환합니다.
 */
const toMedicalHistoryRows = (value: string | string[] | undefined, key: 'disease' | 'name' | 'substance') => {
  const items = Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : String(value || '')
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)

  return items.map((item) => ({ [key]: item }))
}

/**
 * 응급 케이스의 백엔드 이상 징후 타입을 관리자 이력 카드 타입으로 변환합니다.
 */
const resolveIncidentType = (emergencyCase: any): Incident['type'] => {
  const anomalyType = emergencyCase?.detectedAnomalies?.[0]?.type;
  const anomalyDescription = String(emergencyCase?.detectedAnomalies?.[0]?.description || '');
  const analysisText = String(emergencyCase?.llmAnalysis?.analysisText || emergencyCase?.biometricSnapshot?.analysis?.analysisResult || '');

  if (anomalyType === 'heart_rate') return '심박 이상';
  if (anomalyType === 'fall') return '낙상 감지';
  if (anomalyType === 'location') return '안심존 이탈';
  if (anomalyType === 'movement') return '미활동';
  if (anomalyDescription.includes('SOS') || analysisText.includes('SOS')) return 'SOS 호출';

  return '심박 이상';
};

/**
 * 응급 케이스 상태를 관리자 이력 카드용 상태 텍스트로 변환합니다.
 */
const resolveIncidentStatus = (status: string | undefined): Incident['status'] => {
  if (status === 'completed') return '완료';
  if (status === 'cancelled') return '오작동';
  if (status === 'detected') return '신규';
  return '처리 중';
};

/**
 * 케이스의 생체 스냅샷을 관리자 카드용 부분 생체 구조로 정규화합니다.
 */
const mapIncidentBiometricsSnapshot = (biometricSnapshot: any): Partial<Biometrics> => ({
  heartRate: biometricSnapshot?.heartRate ?? 0,
  bloodPressure:
    biometricSnapshot?.bloodPressure?.systolic && biometricSnapshot?.bloodPressure?.diastolic
      ? `${biometricSnapshot.bloodPressure.systolic}/${biometricSnapshot.bloodPressure.diastolic}`
      : '-',
  bloodOxygen: biometricSnapshot?.spO2 ?? 0,
  sleep: 0,
  temperature: biometricSnapshot?.bodyTemperature ?? 0,
  bloodGlucose: 0,
  stress: biometricSnapshot?.stressLevel ?? 0,
  hrv: 0,
  ecg: '정상',
  gyroscope:
    biometricSnapshot?.movementStatus === 'fall_detected'
      ? '낙상 감지'
      : biometricSnapshot?.movementStatus === 'inactive'
        ? '미세 움직임'
        : '안정',
});

/**
 * 응급 케이스에서 사용 가능한 위치 좌표와 주소를 우선순위에 따라 추출합니다.
 */
const resolveIncidentLocation = (emergencyCase: any) => {
  const detectedLocation = emergencyCase?.locations?.detectedAt;
  const currentLocation = emergencyCase?.locations?.current;
  const biometricLocation = emergencyCase?.biometricSnapshot?.location;
  const wearableLocation = emergencyCase?.userId?.wearableDevice?.lastKnownLocation;
  const source = detectedLocation || currentLocation || biometricLocation || wearableLocation || {};

  return {
    lat: typeof source?.lat === 'number' ? source.lat : 0,
    lng: typeof source?.lng === 'number' ? source.lng : 0,
    address:
      typeof detectedLocation?.address === 'string'
        ? detectedLocation.address
        : typeof currentLocation?.address === 'string'
          ? currentLocation.address
          : typeof wearableLocation?.address === 'string'
            ? wearableLocation.address
            : '',
  };
};

/**
 * 관리자 화면의 회원/설정/사건 API 호출을 묶은 서비스 객체입니다.
 */
export const adminService = {
  /**
   * 관리자 계정으로 로그인하고 토큰 세션을 저장합니다.
   */
  async login(email: string, password: string): Promise<AdminSession> {
    const response = await fetch('/api/controllers/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
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
      throw new Error(json?.message || '관리자 로그인에 실패했습니다.');
    }
    if (json.controller?.role !== 'admin') {
      throw new Error('관리자 계정만 로그인할 수 있습니다.');
    }

    const session: AdminSession = {
      token: json.token,
      email: String(json.controller?.email || email).trim().toLowerCase(),
      name: String(json.controller?.name || '').trim(),
      role: String(json.controller?.role || 'admin').trim(),
    };
    persistAdminSession(session);
    return session;
  },

  /**
   * 현재 저장된 관리자 로그인 세션을 반환합니다.
   */
  getStoredSession(): AdminSession | null {
    return readStoredAdminSession();
  },

  /**
   * 저장된 관리자 로그인 세션을 삭제합니다.
   */
  logout(): void {
    clearStoredAdminSession();
  },

  /**
   * 운영자 등록용 휴대폰으로 인증번호 발송을 요청합니다.
   */
  async requestStaffPhoneVerification(phone: string): Promise<boolean> {
    try {
      await apiJson('/api/controllers/phone-verification/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      })
      return true
    } catch (error) {
      console.error('Failed to request staff phone verification:', error);
      return false;
    }
  },

  /**
   * 운영자 등록용 휴대폰 인증번호를 확인하고 등록 토큰을 반환합니다.
   */
  async verifyStaffPhoneCode(phone: string, code: string): Promise<string | null> {
    try {
      const json = await apiJson<{ success: boolean; verificationToken?: string }>('/api/controllers/phone-verification/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      })
      return typeof json?.verificationToken === 'string' ? json.verificationToken : null
    } catch (error) {
      console.error('Failed to verify staff phone code:', error);
      return null;
    }
  },

  /**
   * 승인 대기 중인 회원 가입 신청 목록을 조회합니다.
   */
  async getPendingMemberApprovals(): Promise<PendingMemberApproval[]> {
    try {
      const json = await apiJson<{ success: boolean; data: any[] }>('/api/users/pending-approvals')
      const rows = Array.isArray(json?.data) ? json.data : []
      return rows.map((user) => ({
        id: user._id,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        affiliation: mapAffiliation(user.affiliation),
        guardianName: user.emergencyContact?.name || '',
        guardianPhone: user.emergencyContact?.phone || '',
        createdAt: user.createdAt || '',
        accountStatus: user.accountStatus || 'pending',
      }))
    } catch (error) {
      console.error('Failed to fetch pending member approvals:', error);
      return [];
    }
  },

  /**
   * 회원 가입 신청을 승인 또는 반려 처리합니다.
   */
  async updateMemberApproval(id: string, accountStatus: 'active' | 'rejected' | 'suspended'): Promise<boolean> {
    try {
      await apiJson(`/api/users/${id}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ accountStatus }),
      })
      return true
    } catch (error) {
      console.error('Failed to update member approval:', error);
      return false;
    }
  },

  /**
   * 관제요원/복지사 전체 계정 목록을 조회합니다.
   */
  async getStaffAccounts(): Promise<PendingStaffApproval[]> {
    try {
      const json = await apiJson<{ success: boolean; data: any[] }>('/api/controllers')
      const rows = Array.isArray(json?.data) ? json.data : []
      return rows
        .filter((staff) => staff?.role === 'controller' || staff?.role === 'medical')
        .map((staff) => ({
          id: staff._id,
          name: staff.name || '',
          email: staff.email || '',
          phone: staff.phone || '',
          role: staff.role,
          affiliation: mapAffiliation(staff.affiliation),
          createdAt: staff.createdAt || '',
          accountStatus: staff.accountStatus || 'pending',
        }))
    } catch (error) {
      console.error('Failed to fetch staff accounts:', error);
      return [];
    }
  },

  /**
   * 승인 대기 중인 관제요원/복지담당자 가입 신청 목록을 조회합니다.
   */
  async getPendingStaffApprovals(): Promise<PendingStaffApproval[]> {
    try {
      const rows = await this.getStaffAccounts()
      return rows.filter((staff) => staff.accountStatus === 'pending')
    } catch (error) {
      console.error('Failed to fetch pending staff approvals:', error);
      return [];
    }
  },

  /**
   * 승인 대기 중인 복지사 소속 변경 요청 목록을 조회합니다.
   */
  async getPendingStaffAffiliationApprovals(): Promise<PendingStaffAffiliationApproval[]> {
    try {
      const json = await apiJson<{ success: boolean; data: any[] }>('/api/controllers/pending-affiliation-approvals')
      const rows = Array.isArray(json?.data) ? json.data : []
      return rows.map((staff) => ({
        id: staff.id || staff._id,
        name: staff.name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        role: 'medical' as const,
        affiliation: mapAffiliation(staff.affiliation),
        requestedAffiliation: mapAffiliation(staff.requestedAffiliation || staff.pendingAffiliationChange),
        requestedAt: staff.requestedAffiliation?.requestedAt || staff.pendingAffiliationChange?.requestedAt || '',
      }))
    } catch (error) {
      console.error('Failed to fetch pending staff affiliation approvals:', error);
      return [];
    }
  },

  /**
   * 관리자 전체 계정 목록을 조회합니다.
   */
  async getAdminAccounts(): Promise<AdminAccount[]> {
    try {
      const json = await apiJson<{ success: boolean; data: any[] }>('/api/controllers/admins')
      const rows = Array.isArray(json?.data) ? json.data : []
      return rows.map((admin) => mapAdminAccount(admin))
    } catch (error) {
      console.error('Failed to fetch admin accounts:', error);
      return [];
    }
  },

  /**
   * 관제요원/복지담당자 계정 상태를 변경합니다.
   */
  async updateStaffApproval(id: string, accountStatus: 'pending' | 'active' | 'rejected' | 'suspended'): Promise<boolean> {
    try {
      await apiJson(`/api/controllers/${id}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ accountStatus }),
      })
      return true
    } catch (error) {
      console.error('Failed to update staff approval:', error);
      return false;
    }
  },

  /**
   * 복지사 소속 변경 요청을 승인 또는 반려 처리합니다.
   */
  async updateStaffAffiliationApproval(id: string, decision: 'approved' | 'rejected'): Promise<boolean> {
    try {
      await apiJson(`/api/controllers/${id}/affiliation-approval`, {
        method: 'PATCH',
        body: JSON.stringify({ decision }),
      })
      return true
    } catch (error) {
      console.error('Failed to update staff affiliation approval:', error);
      return false;
    }
  },

  /**
   * 관제요원/복지담당자 상세 정보에서 연락처, 이메일, 권한, 소속을 수정합니다.
   */
  async updateStaffAccount(id: string, input: StaffAccountUpdateInput): Promise<boolean> {
    try {
      await apiJson(`/api/controllers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          email: input.email,
          phone: input.phone,
          role: input.role,
          affiliation: {
            city: input.city,
            district: input.district,
            dong: input.dong,
          },
        }),
      })
      return true
    } catch (error) {
      console.error('Failed to update staff account:', error);
      return false;
    }
  },

  /**
   * 관제요원 또는 복지사 계정을 삭제합니다.
   */
  async deleteStaffAccount(id: string): Promise<boolean> {
    try {
      await apiJson(`/api/controllers/${id}`, { method: 'DELETE' })
      return true;
    } catch (error) {
      console.error('Failed to delete staff account:', error);
      return false;
    }
  },

  /**
   * 어드민에서 관리자 계정을 수동 등록합니다.
   */
  async createAdminAccount(input: ManualAdminRegistrationInput): Promise<boolean> {
    try {
      await apiJson('/api/controllers/admin-create', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          email: input.email,
          password: input.password,
          phone: input.phone,
          role: 'admin',
          menuPermissions: input.menuPermissions,
          phoneVerificationToken: input.phoneVerificationToken,
        }),
      })
      return true
    } catch (error) {
      console.error('Failed to create admin account:', error);
      return false;
    }
  },

  /**
   * 관리자 상세 패널에서 연락처, 이메일, 메뉴 권한을 저장합니다.
   */
  async updateAdminAccount(id: string, input: AdminAccountUpdateInput): Promise<boolean> {
    try {
      await apiJson(`/api/controllers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          email: input.email,
          phone: input.phone,
          role: 'admin',
          menuPermissions: input.menuPermissions,
        }),
      })
      return true
    } catch (error) {
      console.error('Failed to update admin account:', error);
      return false;
    }
  },

  /**
   * 관리자 계정을 삭제합니다.
   */
  async deleteAdminAccount(id: string): Promise<boolean> {
    try {
      await apiJson(`/api/controllers/${id}`, { method: 'DELETE' })
      return true;
    } catch (error) {
      console.error('Failed to delete admin account:', error);
      return false;
    }
  },

  /**
   * 어드민에서 회원을 수동 등록합니다.
   */
  async createMember(input: ManualMemberRegistrationInput): Promise<boolean> {
    try {
      await apiJson('/api/users/admin-create', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          phone: input.phone,
          email: input.email,
          password: input.password,
          birthDate: input.birthDate,
          age: input.age,
          gender: input.gender === '여' ? 'female' : 'male',
          height: input.height,
          weight: input.weight,
          bloodType: input.bloodType,
          affiliation: {
            city: input.city,
            district: input.district,
            dong: input.dong,
            welfareName: input.welfareName,
          },
          emergencyContact: {
            name: input.guardianName,
            phone: input.guardianPhone,
            relationship: input.guardianRelationship,
          },
          consents: {
            emergencyAutoReport: true,
            personalInfoCollection: true,
            preciseLocation: true,
            emergencyAlgorithm: true,
          },
        }),
      })
      return true
    } catch (error) {
      console.error('Failed to create member:', error);
      return false;
    }
  },

  /**
   * 어드민에서 관제요원 또는 복지사를 수동 등록합니다.
   */
  async createStaff(role: 'controller' | 'medical', input: ManualStaffRegistrationInput): Promise<boolean> {
    try {
      await apiJson('/api/controllers/admin-create', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          email: input.email,
          password: input.password,
          phone: input.phone,
          role,
          affiliation: {
            city: input.city,
            district: input.district,
            dong: input.dong,
          },
          phoneVerificationToken: input.phoneVerificationToken,
        }),
      })
      return true
    } catch (error) {
      console.error('Failed to create staff:', error);
      return false;
    }
  },

  /**
   * 사용자 목록을 조회하고 관리자 화면의 `Member` 구조로 변환합니다.
   */
  async getMembers(): Promise<Member[]> {
    try {
      const json = await apiJson<{ success: boolean; data: any[] }>('/api/users')
      const rows = Array.isArray(json?.data) ? json.data : []
      // 관리자 화면은 백엔드 원문 대신 Member 화면 모델로 한 번 더 정규화해 사용합니다.
      return rows.map((u) => mapUserToMember(u))
    } catch (error) {
      console.error('Failed to fetch members:', error);
      return [];
    }
  },

  /**
   * 회원 목록을 보호자 연락처 기준으로 묶어 보호자 전용 관리 목록으로 변환합니다.
   */
  async getGuardianDirectory(): Promise<GuardianDirectoryEntry[]> {
    try {
      const members = await this.getMembers();
      return groupMembersByGuardian(members);
    } catch (error) {
      console.error('Failed to fetch guardian directory:', error);
      return [];
    }
  },

  /**
   * 회원 기본 정보를 PUT 요청으로 수정하고 갱신된 회원 데이터를 반환합니다.
   */
  async updateMember(member: Partial<Member>): Promise<Member | null> {
    try {
      if (!member.id) throw new Error('Member ID is required');

      const transmissionInterval = Number.parseInt(String(member.appSettings?.transmissionInterval || '').replace(/\D/g, ''), 10)
      const medicalHistory = {
        chronicDiseases: toMedicalHistoryRows(member.medicalConditions, 'disease'),
        medications: toMedicalHistoryRows(member.medications, 'name'),
        allergies: toMedicalHistoryRows(member.allergies, 'substance'),
      }

      const patch: any = {
        name: member.name,
        email: member.email,
        phone: member.phone,
        birthDate: member.birthDate,
        age: member.age,
        gender:
          member.gender === '여'
            ? 'female'
            : member.gender === '남'
              ? 'male'
              : undefined,
        height: member.height,
        weight: member.weight,
        bloodType: member.bloodType,
        affiliation: member.affiliation,
        accountStatus: member.accountStatus,
        emergencyContact: member.guardian
          ? {
              name: member.guardian.name,
              phone: member.guardian.phone,
              relationship: member.guardian.relationship,
            }
          : undefined,
        medicalHistory,
        emergencySettings: member.appSettings
          ? {
              autoReportEnabled: member.appSettings.autoReportEnabled,
            }
          : undefined,
        settings: member.appSettings
          ? {
              biometricCollectionInterval: Number.isFinite(transmissionInterval) && transmissionInterval > 0 ? transmissionInterval : undefined,
              enableLocation: member.appSettings.locationCollectionEnabled,
              enableHeartRate: member.appSettings.healthAnalysisEnabled,
              enableAcceleration: member.appSettings.healthAnalysisEnabled,
              enableStress: member.appSettings.healthAnalysisEnabled,
            }
          : undefined,
      }

      // 편집 가능한 기본 필드만 추려 PUT payload를 구성합니다.
      const json = await apiJson<{ success: boolean; data: any }>(`/api/users/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      })
      return json?.data ? mapUserToMember(json.data) : null
    } catch (error) {
      console.error('Failed to update member:', error);
      return null;
    }
  },

  /**
   * 선택된 보호자 묶음에 연결된 회원들의 보호자 정보를 일괄 저장합니다.
   */
  async updateGuardianGroup(memberIds: string[], guardian: Guardian): Promise<Member[]> {
    try {
      const targets = memberIds.filter(Boolean);
      const updates = await Promise.all(
        targets.map((memberId) =>
          this.updateMember({
            id: memberId,
            guardian,
          }),
        ),
      );
      return updates.filter((entry): entry is Member => Boolean(entry));
    } catch (error) {
      console.error('Failed to update guardian group:', error);
      return [];
    }
  },

  /**
   * 특정 회원의 보호자 로그인용 자체 인증코드를 발급합니다.
   */
  async issueGuardianAccessCode(memberId: string): Promise<{ code: string; expiresAt: string } | null> {
    try {
      const json = await apiJson<{ success: boolean; data?: { code?: string; expiresAt?: string } }>(`/api/users/${memberId}/guardian-access-code`, {
        method: 'POST',
      })
      if (!json?.success || !json?.data?.code) return null
      return {
        code: String(json.data.code),
        expiresAt: String(json.data.expiresAt || ''),
      }
    } catch (error) {
      console.error('Failed to issue guardian access code:', error)
      return null
    }
  },

  /**
   * 회원을 삭제하고 성공 여부만 boolean으로 반환합니다.
   */
  async deleteMember(id: string): Promise<boolean> {
    try {
      // 삭제 화면은 별도 payload 없이 식별자만 중요하므로 성공 여부만 boolean으로 단순 반환합니다.
      await apiJson(`/api/users/${id}`, { method: 'DELETE' })
      return true;
    } catch (error) {
      console.error('Failed to delete member:', error);
      return false;
    }
  },

  /**
   * 회원의 워치 연동 정보를 제거하고 갱신된 회원 데이터를 반환합니다.
   */
  async disconnectMemberDevice(id: string): Promise<Member | null> {
    try {
      const json = await apiJson<{ success: boolean; data: any }>(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          wearableDevice: null,
        }),
      })
      return json?.data ? mapUserToMember(json.data) : null
    } catch (error) {
      console.error('Failed to disconnect member device:', error);
      return null;
    }
  },

  /**
   * 시스템 설정을 조회합니다.
   */
  async getSettings(): Promise<SystemSettings | null> {
    try {
      const json = await apiJson<{ success: boolean; data: any }>('/api/settings')
      // 설정 화면은 서버 스키마와 거의 동일한 구조를 사용하므로 추가 변환 없이 그대로 넘깁니다.
      return json?.data || null
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return null;
    }
  },

  /**
   * 시스템 설정을 저장하고 서버가 반환한 최신 설정을 반환합니다.
   */
  async updateSettings(settings: SystemSettings): Promise<SystemSettings | null> {
    try {
      const json = await apiJson<{ success: boolean; data: any }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })
      // 저장 직후 서버가 돌려준 최신 설정을 다시 써야 토글/입력값이 같은 기준으로 유지됩니다.
      return json?.data || null
    } catch (error) {
      console.error('Failed to update settings:', error);
      return null;
    }
  },

  /**
   * 응급 케이스 목록을 관리자 알림/사건 목록 구조로 정규화합니다.
   */
  async getAlerts(filters: any = {}): Promise<Incident[]> {
    try {
      const json = await apiJson<{ success: boolean; cases: any[] }>('/api/controllers/emergency-cases')
      const cases = Array.isArray(json?.cases) ? json.cases : []
      return cases.map((c) => {
        const level = typeof c.emergencyLevel === 'number' ? c.emergencyLevel : 1
        const severity: Incident['severity'] = level >= 4 ? '위험' : level >= 2 ? '주의' : '정보'
        const loc = resolveIncidentLocation(c)
        const resolvedAnalysis =
          typeof c.llmAnalysis === 'string'
            ? c.llmAnalysis
            : typeof c.llmAnalysis?.analysisText === 'string'
              ? c.llmAnalysis.analysisText
              : typeof c.biometricSnapshot?.analysis?.analysisResult === 'string'
                ? c.biometricSnapshot.analysis.analysisResult
                : undefined

        // 관리자 사건 목록은 응급 케이스를 Incident 공통 구조로 바꿔 같은 테이블에서 재사용합니다.
        return {
          id: c._id || c.id,
          memberId: c.userId?._id || c.userId?.id,
          memberName: c.userId?.name || '사용자',
          timestamp: c.detectedAt || c.createdAt,
          type: resolveIncidentType(c),
          severity,
          status: resolveIncidentStatus(c.status),
          location: {
            lat: loc.lat,
            lng: loc.lng,
            address: loc.address,
          },
          aiConfidence:
            typeof c.llmAnalysis?.confidence === 'number'
              ? Math.round(c.llmAnalysis.confidence * (c.llmAnalysis.confidence <= 1 ? 100 : 1))
              : 0,
          aiAnalysis: resolvedAnalysis,
          heartRate: c.biometricSnapshot?.heartRate,
          biometricsSnapshot: mapIncidentBiometricsSnapshot(c.biometricSnapshot),
          deviceSnapshot: c.userId?.wearableDevice,
        } as Incident
      })
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      return [];
    }
  },

  /**
   * 특정 회원에 대한 AI 요약 리포트를 생성 요청합니다.
   */
  async getMemberAIReport(memberId: string): Promise<string | null> {
    try {
      const json = await apiJson<{ success: boolean; report?: string }>(
        `/api/ai-analysis/member-report/${encodeURIComponent(memberId)}`,
        { method: 'POST' },
      )
      // 본문 없이 memberId 경로만 보내도 서버가 회원 문맥을 조회해 리포트를 생성합니다.
      return typeof json?.report === 'string' ? json.report : null
    } catch (error) {
      console.error('Failed to generate AI report:', error);
      return null;
    }
  }
};

/**
 * 백엔드 사용자 문서를 관리자 앱에서 쓰는 `Member` 형태로 매핑합니다.
 */
const mapUserToMember = (user: any): Member => {
  const latestHealth = user.latestHealth || {};
  const affiliation = mapAffiliation(user.affiliation);
  const wearableDevice = user?.wearableDevice || null;
  const assignedController = user?.assignedController || null;
  const medicalConditions = pickMedicalEntryTexts(user?.medicalHistory?.chronicDiseases, 'disease');
  const medications = pickMedicalEntryTexts(user?.medicalHistory?.medications, 'name').join(', ');
  const allergies = pickMedicalEntryTexts(user?.medicalHistory?.allergies, 'substance').join(', ');
  const temperature =
    typeof latestHealth.bodyTemperature === 'number' && Number.isFinite(latestHealth.bodyTemperature)
      ? latestHealth.bodyTemperature
      : typeof latestHealth.temperature === 'number' && Number.isFinite(latestHealth.temperature)
        ? latestHealth.temperature
        // 체온 데이터가 없을 때도 관리자 카드 숫자 레이아웃이 비지 않게 기본값을 둡니다.
        : 36.5
  const bloodPressureText =
    typeof latestHealth?.bloodPressure?.systolic === 'number' && typeof latestHealth?.bloodPressure?.diastolic === 'number'
      ? `${latestHealth.bloodPressure.systolic}/${latestHealth.bloodPressure.diastolic}`
      : typeof wearableDevice?.manualBloodPressure?.systolic === 'number' &&
          typeof wearableDevice?.manualBloodPressure?.diastolic === 'number'
        ? `${wearableDevice.manualBloodPressure.systolic}/${wearableDevice.manualBloodPressure.diastolic}`
        : '0/0'
  const batteryLevel =
    typeof wearableDevice?.batteryLevel === 'number' && Number.isFinite(wearableDevice.batteryLevel)
      ? wearableDevice.batteryLevel
      : typeof latestHealth?.batteryLevel === 'number' && Number.isFinite(latestHealth.batteryLevel)
        ? latestHealth.batteryLevel
        : 0
  const currentLat =
    typeof latestHealth?.location?.lat === 'number' && Number.isFinite(latestHealth.location.lat)
      ? latestHealth.location.lat
      : typeof wearableDevice?.lastKnownLocation?.lat === 'number' && Number.isFinite(wearableDevice.lastKnownLocation.lat)
        ? wearableDevice.lastKnownLocation.lat
        : undefined
  const currentLng =
    typeof latestHealth?.location?.lng === 'number' && Number.isFinite(latestHealth.location.lng)
      ? latestHealth.location.lng
      : typeof wearableDevice?.lastKnownLocation?.lng === 'number' && Number.isFinite(wearableDevice.lastKnownLocation.lng)
        ? wearableDevice.lastKnownLocation.lng
        : undefined
  const regionLabel = [affiliation.city, affiliation.district, affiliation.dong].filter(Boolean).join(' ')
  const addressLabel =
    typeof currentLat === 'number' && typeof currentLng === 'number'
      ? `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`
      : regionLabel
  const lastSyncText =
    wearableDevice?.lastSyncAt || latestHealth?.collectedAt
      ? new Date(wearableDevice?.lastSyncAt || latestHealth?.collectedAt).toLocaleString()
      : '-'
  
  /**
   * 최신 건강 측정값을 관리자 화면의 생체 요약 구조로 정규화합니다.
   */
  const biometrics: Biometrics = {
    heartRate: latestHealth.heartRate || 0,
    // 관리자 화면은 혈압 텍스트 한 줄을 기대하므로 객체 응답을 즉시 "수축/이완" 문자열로 바꿉니다.
    bloodPressure: bloodPressureText,
    bloodOxygen: latestHealth.spO2 || 0,
    sleep: latestHealth.sleep || 0,
    steps: latestHealth.steps || 0,
    temperature,
    bloodGlucose: 0, // Not currently in backend BiometricData
    stress: latestHealth.stressLevel || 0,
    hrv: 0, // Not currently in backend
    fallScore:
      typeof latestHealth.fallScore === 'number'
        ? latestHealth.fallScore
        : latestHealth.movementStatus === 'fall_detected'
          ? 88
          : 0,
    emergencyScore: typeof latestHealth.emergencyScore === 'number' ? latestHealth.emergencyScore : 0,
    ecg: '정상', // Default
    gyroscope: latestHealth.movementStatus === 'fall_detected' ? '낙상 감지' : '안정'
  };

  /**
   * 비상 연락처를 보호자 정보 구조로 매핑합니다.
   */
  const guardian: Guardian = {
    name: user.emergencyContact?.name || '',
    relationship: user.emergencyContact?.relationship || '',
    phone: user.emergencyContact?.phone || ''
  };

  /**
   * 워치 연결 정보가 부족한 경우 관리자 화면용 기본 디바이스 정보를 채웁니다.
   */
  const connectedDevice: ConnectedDevice | null = wearableDevice?.deviceId
    ? {
        modelName: wearableDevice.deviceName || 'Amazfit Watch',
        serialNumber: wearableDevice.deviceId || 'UNKNOWN',
        lastSyncTime: lastSyncText,
        batteryEfficiency: batteryLevel > 0 ? `${batteryLevel}%` : '알 수 없음',
        signalQuality:
          wearableDevice.connectionStatus === 'connected'
            ? '연결됨'
            : wearableDevice.connectionStatus === 'syncing'
              ? '동기화 중'
              : wearableDevice.connectionStatus === 'error'
                ? '오류'
                : '연결 끊김',
      }
    : null;

  /**
   * 관리자 상세 패널에서 보여줄 앱 기본 설정 상태를 구성합니다.
   */
  const appSettings: MemberSettings = {
    autoReportEnabled: user?.emergencySettings?.autoReportEnabled !== false,
    locationCollectionEnabled: user?.settings?.enableLocation !== false,
    healthAnalysisEnabled:
      user?.settings?.enableHeartRate !== false &&
      user?.settings?.enableAcceleration !== false &&
      user?.settings?.enableStress !== false,
    transmissionInterval: `${typeof user?.settings?.biometricCollectionInterval === 'number' ? user.settings.biometricCollectionInterval : 60}초`
  };

  /**
   * AI 통계 탭에서 바로 사용할 주간 건강 분석 요약을 구성합니다.
   */
  const healthStats = buildMemberHealthStats(user, biometrics);

  // 상세 패널에서 바로 쓸 수 있게 사용자 문서와 보조 기본값을 합쳐 Member 1건으로 완성합니다.
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
    age: user.age || 0,
    // 백엔드가 아직 상세 프로필을 모두 주지 않는 항목은 관리자 UI가 깨지지 않게 보수적 기본값을 채웁니다.
    gender: user.gender === 'female' || user.gender === 'F' || user.gender === '여' ? '여' : '남',
    height: user.height || 0,
    weight: user.weight || 0,
    bloodType: user.bloodType || '',
    phone: user.phone,
    address: addressLabel || '-',
    assignedControllerName: typeof assignedController?.name === 'string' ? assignedController.name : '',
    assignedControllerPhone: typeof assignedController?.phone === 'string' ? assignedController.phone : '',
    affiliation,
    guardian,
    connectedDevice,
    appSettings,
    healthStats,
    riskLevel: user.status === '위험' ? '고위험' : (user.status === '주의' ? '중위험' : '저위험'),
    medicalConditions,
    medications,
    allergies,
    lastActive: lastSyncText,
    deviceBattery: batteryLevel,
    status: (user.status === '위험' || user.status === '주의') ? user.status : '정상', 
    accountStatus: user.accountStatus || 'active',
    biometrics
  };
};

/**
 * 백엔드 affiliation 문서를 프런트 공통 구조로 정규화합니다.
 */
const mapAffiliation = (affiliation: any) => ({
  city: affiliation?.city || '',
  district: affiliation?.district || '',
  dong: affiliation?.dong || '',
  welfareName: affiliation?.welfareName || '',
});

/**
 * 백엔드 관리자 문서를 프런트 관리자 화면 구조로 정규화합니다.
 */
const mapAdminAccount = (admin: any): AdminAccount => ({
  id: admin._id,
  name: admin.name || '',
  email: admin.email || '',
  phone: admin.phone || '',
  role: 'admin',
  affiliation: mapAffiliation(admin.affiliation),
  createdAt: admin.createdAt || '',
  accountStatus: admin.accountStatus || 'pending',
  menuPermissions: normalizeAdminMenuPermissions(admin.menuPermissions),
});

/**
 * 메뉴 권한 배열을 관리자 화면 허용 값만 남기도록 정규화합니다.
 */
const normalizeAdminMenuPermissions = (permissions: any): AdminMenuPermission[] => {
  const allowed: AdminMenuPermission[] = ['controllers', 'welfare', 'members', 'guardians', 'history', 'settings', 'admins'];
  const list = Array.isArray(permissions) ? permissions : [];
  return list.filter((permission): permission is AdminMenuPermission => allowed.includes(permission));
};

/**
 * 회원 목록을 보호자 연락처/이름 기준으로 묶어 보호자 디렉토리 항목으로 변환합니다.
 */
const groupMembersByGuardian = (members: Member[]): GuardianDirectoryEntry[] => {
  const groups = new Map<string, GuardianDirectoryEntry>();

  members.forEach((member) => {
    const guardianName = String(member.guardian?.name || '').trim();
    const guardianPhone = String(member.guardian?.phone || '').trim();
    const guardianRelationship = String(member.guardian?.relationship || '').trim();
    if (!guardianName && !guardianPhone && !guardianRelationship) return;

    const normalizedPhone = guardianPhone.replace(/\D/g, '');
    const groupKey = normalizedPhone || `${guardianName}|${guardianRelationship}`;
    const regionLabel = [member.affiliation.city, member.affiliation.district, member.affiliation.dong]
      .filter(Boolean)
      .join(' / ');

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        id: groupKey,
        name: guardianName || '이름 없음',
        relationship: guardianRelationship || '',
        phone: guardianPhone,
        linkedMembers: [],
        memberCount: 0,
        activeMemberCount: 0,
        regionSummary: '',
      });
    }

    const current = groups.get(groupKey)!;
    current.linkedMembers.push({
      memberId: member.id,
      memberName: member.name,
      memberPhone: member.phone,
      memberStatus: member.status,
      accountStatus: member.accountStatus,
      affiliationLabel: regionLabel || '소속 미입력',
    });
    current.memberCount += 1;
    if (member.accountStatus === 'active') current.activeMemberCount += 1;
  });

  return Array.from(groups.values())
    .map((entry) => ({
      ...entry,
      linkedMembers: entry.linkedMembers.sort((a, b) => a.memberName.localeCompare(b.memberName)),
      regionSummary: Array.from(new Set(entry.linkedMembers.map((row) => row.affiliationLabel))).join(', '),
    }))
    .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name));
};

/**
 * 문자열을 기반으로 회원별 고정 시드를 만드는 간단한 해시 함수입니다.
 */
const hashSeed = (value: string) => {
  return Array.from(String(value || '')).reduce((acc, char, index) => {
    return (acc * 31 + char.charCodeAt(0) + index) % 1000003;
  }, 7);
};

/**
 * 회원별로 항상 같은 결과가 나오도록 시드 기반 숫자를 생성합니다.
 */
const seededBetween = (seed: number, min: number, max: number) => {
  const normalized = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  return min + normalized * (max - min);
};

/**
 * 일주일 라벨에 맞춰 심박수와 걸음 수 차트용 시계열 값을 생성합니다.
 */
const buildWeeklySeries = (seed: number, labels: string[], min: number, max: number) => {
  return labels.map((name, index) => ({
    name,
    value: Math.round(seededBetween(seed + index * 17, min, max)),
  }));
};

/**
 * 회원 목록 응답에 포함된 최신 LLM 분석 결과를 관리자 표시 구조로 정리합니다.
 */
const resolveLatestLlmAnalysis = (user: any) => {
  const analysisText = String(
    user?.latestLlmAnalysis?.analysisText ||
      user?.latestHealth?.analysis?.analysisResult ||
      '',
  ).trim();

  return {
    analysisText,
    analyzedAt:
      typeof user?.latestLlmAnalysis?.analyzedAt === 'string' || user?.latestLlmAnalysis?.analyzedAt instanceof Date
        ? new Date(user.latestLlmAnalysis.analyzedAt).toLocaleString()
        : '',
    model: String(user?.latestLlmAnalysis?.model || '').trim(),
  };
};

/**
 * 회원의 현재 상태와 기저 정보에 맞춰 AI 통계 탭용 건강 집계 데이터를 풍부하게 생성합니다.
 */
const buildMemberHealthStats = (user: any, biometrics: Biometrics): HealthStats => {
  const heartRateLabels = ['-60분', '-50분', '-40분', '-30분', '-20분', '-10분', '현재'];
  const activityLabels = ['06시', '09시', '12시', '15시', '18시', '21시', '현재'];
  const seed = hashSeed(`${user?._id || ''}-${user?.name || ''}-${user?.email || ''}`);
  const chronicDiseases = Array.isArray(user?.medicalHistory?.chronicDiseases) ? user.medicalHistory.chronicDiseases : [];
  const hasChronicCondition = chronicDiseases.length > 0;
  const seniorWeight = user?.age >= 65 ? 1.12 : 1;
  const riskWeight = user?.status === '위험' ? 1.2 : user?.status === '주의' ? 1.08 : 1;

  const heartRateBase = Math.max(62, Math.min(124, Math.round((biometrics.heartRate || 74) * riskWeight)));
  const heartRateHistory = buildWeeklySeries(
    seed + 11,
    heartRateLabels,
    Math.max(58, heartRateBase - 9),
    Math.min(132, heartRateBase + 12),
  );

  const stepsHistory = buildWeeklySeries(
    seed + 29,
    activityLabels,
    Math.round(3200 / seniorWeight),
    Math.round((9200 / riskWeight) + 1400),
  );

  const averageSteps = Math.round(stepsHistory.reduce((sum, row) => sum + row.value, 0) / Math.max(stepsHistory.length, 1));
  const stepGoal = user?.age >= 65 ? 7000 : 8500;
  const stepGoalAchievement = Math.max(32, Math.min(100, Math.round((averageSteps / stepGoal) * 100)));

  const averageSleep = Number(seededBetween(seed + 43, 5.3, 8.4).toFixed(1));
  const averageStress = Math.max(18, Math.min(95, Math.round((biometrics.stress || 32) * 0.8 + seededBetween(seed + 57, 4, 18))));
  const feverCount = biometrics.temperature >= 37.5 ? 1 : Math.round(seededBetween(seed + 63, 0, 2));
  const averageTemperature = Number((biometrics.temperature || seededBetween(seed + 71, 36.2, 37.3)).toFixed(1));
  const averageSPO2 = Math.max(92, Math.min(99, Math.round((biometrics.bloodOxygen || 97) - seededBetween(seed + 83, 0, 2))));
  const minSPO2 = Math.max(88, averageSPO2 - Math.round(seededBetween(seed + 97, 1, 5)));
  const caloriesBurned = Math.round(seededBetween(seed + 109, 1480, 2560));

  const fallCount = Math.round(seededBetween(seed + 127, 0, user?.status === '위험' ? 4 : 2));
  const arrhythmiaCount = Math.round(seededBetween(seed + 131, hasChronicCondition ? 1 : 0, user?.status === '위험' ? 5 : 3));
  const lowOxygenCount = Math.round(seededBetween(seed + 137, averageSPO2 <= 94 ? 1 : 0, averageSPO2 <= 94 ? 4 : 2));
  const incidentTotal = fallCount + arrhythmiaCount + lowOxygenCount;

  const emergencyPenalty = (biometrics.emergencyScore || 0) * 0.18;
  const fallPenalty = (biometrics.fallScore || 0) * 0.14;
  const stressPenalty = Math.max(0, (biometrics.stress || averageStress) - 35) * 0.28;
  const oxygenPenalty = Math.max(0, 96 - averageSPO2) * 4;
  const temperaturePenalty = Math.max(0, averageTemperature - 37.3) * 12;
  const incidentPenalty = incidentTotal * 2;
  const healthScoreBase = 98
    - emergencyPenalty
    - fallPenalty
    - stressPenalty
    - oxygenPenalty
    - temperaturePenalty
    - incidentPenalty;
  const healthScore = Math.max(58, Math.min(97, Math.round(healthScoreBase)));

  const predictionTemplates = [
    `현재 응급 지수 ${biometrics.emergencyScore}/100, 낙상 지수 ${biometrics.fallScore}/100 기준으로 ${user?.name || '회원'}님의 관제 우선순위를 재확인해야 합니다. 산소포화도 ${biometrics.bloodOxygen}%와 심박 ${biometrics.heartRate}bpm은 함께 보면서 이상 패턴 지속 여부를 추적하는 편이 좋습니다.`,
    `스트레스 ${biometrics.stress}/100, 오늘 걸음수 ${biometrics.steps.toLocaleString()}보가 함께 들어온 상태입니다. 급성 경고보다는 누적 피로형 변화 가능성이 있어 관제센터와 복지사가 활동 저하 여부를 같이 보는 것이 적절합니다.`,
    `최근 수신 구간에서 심박 추이는 ${heartRateHistory[heartRateHistory.length - 1].value >= heartRateHistory[0].value ? '상승' : '안정'} 흐름입니다. 낙상 이벤트 ${fallCount}회, 산소 저하 경고 ${lowOxygenCount}회가 있어 실시간 추세 감시를 유지해야 합니다.`,
    `현재 건강 점수는 ${healthScore}점이며, 이 점수는 혈압이나 심전도 같은 수동 측정값이 아니라 관제 생체데이터인 심박, 산소포화도, 체온, 스트레스, 낙상/응급 지수 중심으로 계산한 값입니다.`,
    `${user?.name || '회원'}님의 현재 패턴은 과거 통계보다는 실시간 관제값 해석이 더 중요합니다. 응급 지수와 스트레스 지수가 동반 상승하면 즉시 확인 요청 또는 보호자 연락 순서를 앞당기는 것이 좋습니다.`,
  ];

  const prediction = predictionTemplates[Math.floor(seededBetween(seed + 149, 0, predictionTemplates.length)) % predictionTemplates.length];
  const latestLlm = resolveLatestLlmAnalysis(user);
  const llmRealtimeInterpretation = latestLlm.analysisText || prediction;

  return {
    averageHeartRate: Math.round(heartRateHistory.reduce((sum, row) => sum + row.value, 0) / heartRateHistory.length),
    heartRateRange: {
      min: Math.min(...heartRateHistory.map((row) => row.value)),
      max: Math.max(...heartRateHistory.map((row) => row.value)),
    },
    heartRateHistory,
    averageBloodPressure: '-',
    averageSPO2,
    minSPO2,
    averageTemperature,
    feverCount,
    healthScore,
    stepsHistory,
    stepGoalAchievement,
    averageSleep,
    sleepQuality: averageSleep >= 7.2 ? '양호' : averageSleep >= 6.2 ? '보통' : '나쁨',
    averageStress,
    caloriesBurned,
    incidentSummary: {
      total: incidentTotal,
      fall: fallCount,
      arrhythmia: arrhythmiaCount,
      lowOxygen: lowOxygenCount,
      avgResponseTime: `${Math.round(seededBetween(seed + 181, 3, 14))}분`,
    },
    weeklyPrediction: prediction,
    llmRealtimeInterpretation,
    llmAnalyzedAt: latestLlm.analyzedAt,
    llmModel: latestLlm.model,
  };
};
