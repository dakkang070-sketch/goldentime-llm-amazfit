import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck, UserCheck, XCircle } from 'lucide-react';
import {
  PendingMemberApproval,
  PendingMemberProfileApproval,
  PendingStaffAffiliationApproval,
  PendingStaffApproval,
} from '../types';
import { adminService } from '../services/adminService';

type ApprovalSectionKey =
  | 'member-signup'
  | 'member-profile'
  | 'staff-signup'
  | 'staff-affiliation';

/**
 * ISO 날짜 문자열을 관리자 화면에 읽기 쉬운 형식으로 변환합니다.
 */
const formatSubmittedAt = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

/**
 * 승인 관리 페이지에서 사용하는 상단 요약 카드를 렌더링합니다.
 */
const SummaryCard: React.FC<{
  title: string;
  value: number;
  icon: React.ElementType;
  tone: string;
  active: boolean;
  onClick: () => void;
}> = ({
  title,
  value,
  icon: Icon,
  tone,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-xl border p-5 text-left shadow-sm transition ${
      active
        ? 'border-slate-400 bg-slate-100 text-slate-900 shadow-md'
        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
    }`}
  >
    <div className="mb-3 flex items-center justify-between">
      <p className="text-[14px] text-slate-500">{title}</p>
      <div className={`p-2 rounded-lg ${tone}`}>
        <Icon size={18} />
      </div>
    </div>
    <p className="text-[26px] text-black">{value}</p>
  </button>
);

/**
 * 회원·관제요원·복지담당자 가입 신청을 승인하는 관리자 페이지입니다.
 */
export const Approvals: React.FC = () => {
  const [pendingMembers, setPendingMembers] = useState<PendingMemberApproval[]>([]);
  const [pendingMemberProfiles, setPendingMemberProfiles] = useState<PendingMemberProfileApproval[]>([]);
  const [pendingStaff, setPendingStaff] = useState<PendingStaffApproval[]>([]);
  const [pendingStaffAffiliations, setPendingStaffAffiliations] = useState<PendingStaffAffiliationApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ApprovalSectionKey>('member-signup');

  /**
   * 회원과 운영자 승인 대기 목록을 함께 불러옵니다.
   */
  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const [members, memberProfiles, staff, staffAffiliations] = await Promise.all([
        adminService.getPendingMemberApprovals(),
        adminService.getPendingMemberProfileApprovals(),
        adminService.getPendingStaffApprovals(),
        adminService.getPendingStaffAffiliationApprovals(),
      ]);
      setPendingMembers(members);
      setPendingMemberProfiles(memberProfiles);
      setPendingStaff(staff);
      setPendingStaffAffiliations(staffAffiliations);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  /**
   * 회원 가입 신청을 승인 또는 반려 처리하고 목록을 갱신합니다.
   */
  const handleMemberApproval = async (
    memberId: string,
    accountStatus: 'active' | 'rejected',
  ) => {
    setProcessingKey(`member:${memberId}:${accountStatus}`);
    const ok = await adminService.updateMemberApproval(memberId, accountStatus);
    setProcessingKey(null);
    if (!ok) {
      alert('회원 승인 처리에 실패했습니다.');
      return;
    }
    await fetchPendingApprovals();
  };

  /**
   * 회원 정보수정 요청을 승인 또는 반려 처리하고 목록을 갱신합니다.
   */
  const handleMemberProfileApproval = async (
    memberId: string,
    decision: 'approved' | 'rejected',
  ) => {
    setProcessingKey(`member-profile:${memberId}:${decision}`);
    const ok = await adminService.updateMemberProfileApproval(memberId, decision);
    setProcessingKey(null);
    if (!ok) {
      alert('회원 정보수정 승인 처리에 실패했습니다.');
      return;
    }
    await fetchPendingApprovals();
  };

  /**
   * 관제요원/복지담당자 가입 신청을 승인 또는 반려 처리하고 목록을 갱신합니다.
   */
  const handleStaffApproval = async (
    staffId: string,
    accountStatus: 'active' | 'rejected',
  ) => {
    setProcessingKey(`staff:${staffId}:${accountStatus}`);
    const ok = await adminService.updateStaffApproval(staffId, accountStatus);
    setProcessingKey(null);
    if (!ok) {
      alert('운영자 승인 처리에 실패했습니다.');
      return;
    }
    await fetchPendingApprovals();
  };

  /**
   * 복지사 소속 변경 요청을 승인 또는 반려 처리하고 목록을 갱신합니다.
   */
  const handleStaffAffiliationApproval = async (
    staffId: string,
    decision: 'approved' | 'rejected',
  ) => {
    setProcessingKey(`staff-affiliation:${staffId}:${decision}`);
    const ok = await adminService.updateStaffAffiliationApproval(staffId, decision);
    setProcessingKey(null);
    if (!ok) {
      alert('복지사 소속 변경 승인 처리에 실패했습니다.');
      return;
    }
    await fetchPendingApprovals();
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] text-black tracking-tight">가입 승인 관리</h2>
            <p className="text-[15px] text-slate-500 mt-2">
              회원, 관제요원, 복지담당자 가입 신청을 확인하고 승인 처리합니다.
            </p>
          </div>
          <button
            onClick={fetchPendingApprovals}
            type="button"
            title="새로고침"
            aria-label="새로고침"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-black hover:bg-slate-50"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard
            title="승인 대기 회원"
            value={pendingMembers.length}
            icon={UserCheck}
            tone="bg-blue-50 text-blue-600"
            active={activeSection === 'member-signup'}
            onClick={() => setActiveSection('member-signup')}
          />
          <SummaryCard
            title="회원 수정 요청"
            value={pendingMemberProfiles.length}
            icon={RefreshCw}
            tone="bg-amber-50 text-amber-600"
            active={activeSection === 'member-profile'}
            onClick={() => setActiveSection('member-profile')}
          />
          <SummaryCard
            title="승인 대기 운영자"
            value={pendingStaff.length}
            icon={ShieldCheck}
            tone="bg-purple-50 text-purple-600"
            active={activeSection === 'staff-signup'}
            onClick={() => setActiveSection('staff-signup')}
          />
          <SummaryCard
            title="복지사 소속 변경"
            value={pendingStaffAffiliations.length}
            icon={CheckCircle2}
            tone="bg-emerald-50 text-emerald-600"
            active={activeSection === 'staff-affiliation'}
            onClick={() => setActiveSection('staff-affiliation')}
          />
        </div>

        {activeSection === 'member-signup' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-[20px] text-black">회원 가입 신청</h3>
            <p className="text-[14px] text-slate-500 mt-1">디바이스 회원과 보호자 연락처를 함께 검토합니다.</p>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-[15px] text-slate-500">승인 대기 회원을 불러오는 중입니다.</div>
          ) : pendingMembers.length === 0 ? (
            <div className="px-6 py-10 text-[15px] text-slate-500">승인 대기 중인 회원 신청이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[13px] text-slate-500">
                    <th className="px-6 py-3 font-medium">회원명</th>
                    <th className="px-6 py-3 font-medium">연락처</th>
                    <th className="px-6 py-3 font-medium">보호자</th>
                    <th className="px-6 py-3 font-medium">신청일시</th>
                    <th className="px-6 py-3 font-medium">처리</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingMembers.map((member) => (
                    <tr key={member.id} className="border-t border-slate-100 text-[14px] text-black">
                      <td className="px-6 py-4">
                        <div>{member.name}</div>
                        <div className="text-[13px] text-slate-500 mt-1">{member.email}</div>
                      </td>
                      <td className="px-6 py-4">{member.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <div>{member.guardianName || '-'}</div>
                        <div className="text-[13px] text-slate-500 mt-1">{member.guardianPhone || '-'}</div>
                      </td>
                      <td className="px-6 py-4">{formatSubmittedAt(member.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleMemberApproval(member.id, 'active')}
                            disabled={processingKey !== null}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <CheckCircle2 size={15} />
                            승인
                          </button>
                          <button
                            onClick={() => handleMemberApproval(member.id, 'rejected')}
                            disabled={processingKey !== null}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                          >
                            <XCircle size={15} />
                            반려
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        )}

        {activeSection === 'member-profile' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-[20px] text-black">회원 정보수정 요청</h3>
            <p className="text-[14px] text-slate-500 mt-1">현재 등록 정보는 유지되고, 승인 후에만 변경됩니다.</p>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-[15px] text-slate-500">회원 정보수정 요청을 불러오는 중입니다.</div>
          ) : pendingMemberProfiles.length === 0 ? (
            <div className="px-6 py-10 text-[15px] text-slate-500">승인 대기 중인 회원 정보수정 요청이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[13px] text-slate-500">
                    <th className="px-6 py-3 font-medium">회원</th>
                    <th className="px-6 py-3 font-medium">현재 정보</th>
                    <th className="px-6 py-3 font-medium">요청 정보</th>
                    <th className="px-6 py-3 font-medium">등록 워치</th>
                    <th className="px-6 py-3 font-medium">요청일시</th>
                    <th className="px-6 py-3 font-medium">처리</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingMemberProfiles.map((member) => (
                    <tr key={member.id} className="border-t border-slate-100 text-[14px] text-black">
                      <td className="px-6 py-4">
                        <div>{member.name}</div>
                        <div className="text-[13px] text-slate-500 mt-1">{member.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{member.phone || '-'}</div>
                        <div className="text-[13px] text-slate-500 mt-1">
                          {[member.affiliation.city, member.affiliation.district, member.affiliation.dong].filter(Boolean).join(' ') || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{member.requestedProfile.phone || '-'}</div>
                        <div className="text-[13px] text-slate-500 mt-1">{member.requestedProfile.email || '-'}</div>
                        <div className="text-[13px] text-slate-500 mt-1">
                          {[member.requestedProfile.affiliation.city, member.requestedProfile.affiliation.district, member.requestedProfile.affiliation.dong].filter(Boolean).join(' ') || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{member.wearableDevice.deviceName || '-'}</div>
                        <div className="text-[13px] text-slate-500 mt-1">{member.wearableDevice.deviceId || '-'}</div>
                      </td>
                      <td className="px-6 py-4">{formatSubmittedAt(member.requestedAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleMemberProfileApproval(member.id, 'approved')}
                            disabled={processingKey !== null}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <CheckCircle2 size={15} />
                            승인
                          </button>
                          <button
                            onClick={() => handleMemberProfileApproval(member.id, 'rejected')}
                            disabled={processingKey !== null}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                          >
                            <XCircle size={15} />
                            반려
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        )}

        {activeSection === 'staff-signup' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-[20px] text-black">관제요원 / 복지담당자 신청</h3>
            <p className="text-[14px] text-slate-500 mt-1">운영 권한 계정은 승인 후에만 로그인할 수 있습니다.</p>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-[15px] text-slate-500">승인 대기 운영자를 불러오는 중입니다.</div>
          ) : pendingStaff.length === 0 ? (
            <div className="px-6 py-10 text-[15px] text-slate-500">승인 대기 중인 운영자 신청이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[13px] text-slate-500">
                    <th className="px-6 py-3 font-medium">이름</th>
                    <th className="px-6 py-3 font-medium">연락처</th>
                    <th className="px-6 py-3 font-medium">권한</th>
                    <th className="px-6 py-3 font-medium">신청일시</th>
                    <th className="px-6 py-3 font-medium">처리</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingStaff.map((staff) => (
                    <tr key={staff.id} className="border-t border-slate-100 text-[14px] text-black">
                      <td className="px-6 py-4">
                        <div>{staff.name}</div>
                        <div className="text-[13px] text-slate-500 mt-1">{staff.email}</div>
                      </td>
                      <td className="px-6 py-4">{staff.phone || '-'}</td>
                      <td className="px-6 py-4">
                        {staff.role === 'medical' ? '복지담당자' : '관제요원'}
                      </td>
                      <td className="px-6 py-4">{formatSubmittedAt(staff.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStaffApproval(staff.id, 'active')}
                            disabled={processingKey !== null}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <CheckCircle2 size={15} />
                            승인
                          </button>
                          <button
                            onClick={() => handleStaffApproval(staff.id, 'rejected')}
                            disabled={processingKey !== null}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                          >
                            <XCircle size={15} />
                            반려
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        )}

        {activeSection === 'staff-affiliation' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-[20px] text-black">복지사 소속 변경 요청</h3>
            <p className="text-[14px] text-slate-500 mt-1">현재 소속은 유지한 채, 관리자 승인 후에만 변경됩니다.</p>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-[15px] text-slate-500">복지사 소속 변경 요청을 불러오는 중입니다.</div>
          ) : pendingStaffAffiliations.length === 0 ? (
            <div className="px-6 py-10 text-[15px] text-slate-500">승인 대기 중인 복지사 소속 변경 요청이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[13px] text-slate-500">
                    <th className="px-6 py-3 font-medium">복지사</th>
                    <th className="px-6 py-3 font-medium">현재 소속</th>
                    <th className="px-6 py-3 font-medium">요청 소속</th>
                    <th className="px-6 py-3 font-medium">요청일시</th>
                    <th className="px-6 py-3 font-medium">처리</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingStaffAffiliations.map((staff) => (
                    <tr key={staff.id} className="border-t border-slate-100 text-[14px] text-black">
                      <td className="px-6 py-4">
                        <div>{staff.name}</div>
                        <div className="text-[13px] text-slate-500 mt-1">{staff.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        {[staff.affiliation.city, staff.affiliation.district, staff.affiliation.dong].filter(Boolean).join(' ') || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {[staff.requestedAffiliation.city, staff.requestedAffiliation.district, staff.requestedAffiliation.dong].filter(Boolean).join(' ') || '-'}
                      </td>
                      <td className="px-6 py-4">{formatSubmittedAt(staff.requestedAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStaffAffiliationApproval(staff.id, 'approved')}
                            disabled={processingKey !== null}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <CheckCircle2 size={15} />
                            승인
                          </button>
                          <button
                            onClick={() => handleStaffAffiliationApproval(staff.id, 'rejected')}
                            disabled={processingKey !== null}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                          >
                            <XCircle size={15} />
                            반려
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        )}
      </div>
    </div>
  );
};
