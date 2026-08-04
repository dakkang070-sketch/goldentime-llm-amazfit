import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Search, Trash2, Users } from 'lucide-react';
import { GuardianDirectoryEntry } from '../types';
import { adminService } from '../services/adminService';

/**
 * 보호자 전화번호를 비교용 숫자 문자열로 정규화합니다.
 */
const normalizeGuardianPhone = (value: string) => String(value || '').replace(/\D/g, '');

/**
 * 보호자 디렉토리 항목의 고정 키를 계산합니다.
 */
const getGuardianEntryKey = (entry: Pick<GuardianDirectoryEntry, 'phone' | 'name' | 'relationship'>) =>
  normalizeGuardianPhone(entry.phone) || `${String(entry.name || '').trim()}|${String(entry.relationship || '').trim()}`;

/**
 * 보호자 관리 페이지에서 사용하는 배지 스타일을 상태별로 계산합니다.
 */
const getMemberStatusTone = (status: string) => {
  if (status === '위험') return 'bg-red-50 text-red-700 border-red-100';
  if (status === '주의') return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-emerald-50 text-emerald-700 border-emerald-100';
};

/**
 * 회원 계정 상태를 관리자 화면용 한글 라벨로 변환합니다.
 */
const getAccountStatusLabel = (status: string) => {
  if (status === 'pending') return '승인 대기';
  if (status === 'rejected') return '반려';
  if (status === 'suspended') return '정지';
  if (status === 'withdrawn') return '해지';
  return '사용중';
};

/**
 * 회원 계정 상태 배지의 색상을 계산합니다.
 */
const getAccountStatusTone = (status: string) => {
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-100';
  if (status === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-100';
  if (status === 'suspended') return 'bg-slate-100 text-slate-600 border-slate-200';
  if (status === 'withdrawn') return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-100';
};

/**
 * 관리자에서 보호자 목록과 연결 회원을 한 화면에서 관리하는 페이지입니다.
 */
export const Guardians: React.FC = () => {
  const [guardians, setGuardians] = useState<GuardianDirectoryEntry[]>([]);
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianDirectoryEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRelationship, setEditRelationship] = useState('');

  /**
   * 보호자 목록을 다시 읽고 선택 항목을 최대한 유지합니다.
   */
  const fetchGuardians = async (preferredKey?: string) => {
    setLoading(true);
    try {
      const data = await adminService.getGuardianDirectory();
      setGuardians(data);
      const fallbackKey = preferredKey || (selectedGuardian ? getGuardianEntryKey(selectedGuardian) : '');
      const nextSelected =
        data.find((entry) => getGuardianEntryKey(entry) === fallbackKey) ||
        data[0] ||
        null;
      setSelectedGuardian(nextSelected);
    } catch (error) {
      console.error('Failed to fetch guardian directory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardians();
  }, []);

  useEffect(() => {
    setEditName(selectedGuardian?.name || '');
    setEditPhone(selectedGuardian?.phone || '');
    setEditRelationship(selectedGuardian?.relationship || '');
  }, [selectedGuardian]);

  /**
   * 검색어에 따라 보호자 목록을 이름, 연락처, 연결 회원 기준으로 필터링합니다.
   */
  const filteredGuardians = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return guardians;
    return guardians.filter((entry) => {
      const memberText = entry.linkedMembers
        .map((member) => `${member.memberName} ${member.memberPhone} ${member.affiliationLabel}`.toLowerCase())
        .join(' ');
      const guardianText = `${entry.name} ${entry.phone} ${entry.relationship} ${entry.regionSummary}`.toLowerCase();
      return guardianText.includes(keyword) || memberText.includes(keyword);
    });
  }, [guardians, searchTerm]);

  /**
   * 현재 선택된 보호자 정보를 연결된 회원 전체에 일괄 저장합니다.
   */
  const handleSaveGuardian = async () => {
    if (!selectedGuardian) return;
    const confirmed = window.confirm('저장하시겠습니까?');
    if (!confirmed) return;

    setSaving(true);
    try {
      const updatedMembers = await adminService.updateGuardianGroup(
        selectedGuardian.linkedMembers.map((member) => member.memberId),
        {
          name: editName.trim(),
          phone: editPhone.trim(),
          relationship: editRelationship.trim(),
        },
      );
      if (updatedMembers.length === 0) {
        alert('보호자 정보 저장에 실패했습니다.');
        return;
      }
      const nextKey =
        normalizeGuardianPhone(editPhone.trim()) || `${editName.trim()}|${editRelationship.trim()}`;
      await fetchGuardians(nextKey);
      alert('보호자 정보가 연결된 회원 전체에 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save guardian group:', error);
      alert('오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 선택한 보호자 묶음의 정보를 연결 회원 전체에서 제거합니다.
   */
  const handleDeleteGuardian = async () => {
    if (!selectedGuardian) return;
    const confirmed = window.confirm(
      `삭제하시겠습니까?\n삭제된 보호자 정보는 복구할 수 없습니다.`,
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const updatedMembers = await adminService.updateGuardianGroup(
        selectedGuardian.linkedMembers.map((member) => member.memberId),
        {
          name: '',
          phone: '',
          relationship: '',
        },
      );
      if (updatedMembers.length === 0) {
        alert('보호자 삭제에 실패했습니다.');
        return;
      }
      await fetchGuardians();
      alert('선택한 보호자 정보가 연결 회원에서 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete guardian group:', error);
      alert('보호자 삭제 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const totalLinkedMembers = guardians.reduce((sum, entry) => sum + entry.memberCount, 0);
  const totalActiveMembers = guardians.reduce((sum, entry) => sum + entry.activeMemberCount, 0);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-slate-100">
      <div className={`flex min-w-0 flex-1 flex-col p-5 transition-all duration-300 ${selectedGuardian ? 'w-1/2' : 'w-full'}`}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[28px] leading-none text-black">보호자관리</h2>
            <p className="mt-1 text-[14px] text-black">회원에 연결된 보호자 정보를 연락처 기준으로 묶어 한 번에 관리합니다.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={() => fetchGuardians()}
              type="button"
              title="새로고침"
              aria-label="새로고침"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-black hover:bg-slate-50 shadow-sm"
            >
              <RefreshCw size={16} />
            </button>
            <div className="relative w-60 min-w-[220px] flex-1 sm:flex-none xl:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
              <input
                type="text"
                placeholder="보호자명, 연락처, 회원 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-[14px] text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md">
          <div className="flex-1 overflow-hidden">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr className="border-b border-slate-300">
                  <th className="w-[22%] px-2.5 py-3 text-[12px] uppercase whitespace-nowrap text-black">보호자명</th>
                  <th className="w-[18%] px-2.5 py-3 text-[12px] uppercase whitespace-nowrap text-black">전화번호</th>
                  <th className="w-[14%] px-2.5 py-3 text-[12px] uppercase whitespace-nowrap text-black">관계</th>
                  <th className="w-[16%] px-2.5 py-3 text-[12px] uppercase whitespace-nowrap text-black">연결회원</th>
                  <th className="w-[12%] px-2.5 py-3 text-[12px] uppercase whitespace-nowrap text-black">활성</th>
                  <th className="w-[18%] px-2.5 py-3 text-[12px] uppercase whitespace-nowrap text-black">지역 소속</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      데이터를 불러오는 중입니다...
                    </td>
                  </tr>
                ) : filteredGuardians.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredGuardians.map((entry) => {
                    const isActive = selectedGuardian?.id === entry.id;

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => setSelectedGuardian(entry)}
                        className={`group cursor-pointer transition-colors ${isActive ? 'bg-blue-100' : 'hover:bg-slate-100'}`}
                      >
                        <td className="px-2.5 py-2.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm text-black ${isActive ? 'bg-blue-200' : 'bg-slate-100'}`}>
                              {(entry.name || '보').slice(0, 1)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate whitespace-nowrap text-[14px] text-black">{entry.name || '이름 없음'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 whitespace-nowrap text-[12px] text-slate-700">
                          {entry.phone || '연락처 미입력'}
                        </td>
                        <td className="px-2.5 py-2.5 whitespace-nowrap text-[12px] text-black">
                          {entry.relationship || '-'}
                        </td>
                        <td className="px-2.5 py-2.5 whitespace-nowrap text-[12px] text-black">
                          {entry.memberCount}명
                        </td>
                        <td className="px-2.5 py-2.5 whitespace-nowrap text-[12px] text-black">
                          {entry.activeMemberCount}명
                        </td>
                        <td className="px-2.5 py-2.5 whitespace-nowrap text-[12px] text-black">
                          <span className="block truncate">{entry.regionSummary || '소속 미입력'}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-300 bg-slate-100 px-4 py-2 text-[13px] text-slate-600">
            총 <span className="text-black">{filteredGuardians.length}</span>명 · 연결 회원 <span className="text-black">{totalLinkedMembers}</span>명 · 활성 회원 <span className="text-black">{totalActiveMembers}</span>명
          </div>
        </div>
      </div>

      {selectedGuardian ? (
        <div className="flex w-[480px] min-w-[480px] min-h-0 flex-col border-l border-slate-300 bg-white shadow-[-8px_0_24px_rgba(15,23,42,0.08)]">
          <div className="flex-1 min-h-0 overflow-y-auto p-5 pb-8">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-[26px] text-black">{selectedGuardian.name || '이름 없음'}</h2>
                    <p className="mt-2 text-[14px] text-slate-500">
                      연결 회원 {selectedGuardian.memberCount}명 · 활성 {selectedGuardian.activeMemberCount}명
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeleteGuardian}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      삭제
                    </button>
                    <button
                      onClick={handleSaveGuardian}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[14px] text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save size={16} />
                      저장
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[12px] text-slate-500">보호자 연락처</div>
                    <div className="mt-1 text-[15px] text-black">{selectedGuardian.phone || '연락처 미입력'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[12px] text-slate-500">지역 소속</div>
                    <div className="mt-1 truncate text-[15px] text-black">{selectedGuardian.regionSummary || '소속 미입력'}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 text-[15px] text-black">보호자 기본 정보</div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block">
                  <span className="text-[13px] text-slate-500">보호자 이름</span>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[15px] text-black outline-none focus:border-blue-500"
                  />
                  </label>
                  <label className="block">
                  <span className="text-[13px] text-slate-500">보호자 연락처</span>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[15px] text-black outline-none focus:border-blue-500"
                  />
                  </label>
                  <label className="block md:col-span-2">
                  <span className="text-[13px] text-slate-500">관계</span>
                  <input
                    value={editRelationship}
                    onChange={(e) => setEditRelationship(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[15px] text-black outline-none focus:border-blue-500"
                  />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-500" />
                  <h3 className="text-[14px] text-black">연결 회원</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedGuardian.linkedMembers.map((member) => (
                    <div
                      key={member.memberId}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[16px] text-black">{member.memberName}</div>
                          <div className="mt-1 break-words text-[13px] text-slate-500">
                            {member.memberPhone || '회원 연락처 미입력'}
                          </div>
                          <div className="mt-1 break-words text-[13px] text-slate-500">
                            {member.affiliationLabel || '소속 미입력'}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-[12px] ${getMemberStatusTone(member.memberStatus)}`}>
                            {member.memberStatus}
                          </span>
                          <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-[12px] ${getAccountStatusTone(member.accountStatus)}`}>
                            {getAccountStatusLabel(member.accountStatus)}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3">
                        <div>
                          <div className="text-[11px] text-slate-500">상태</div>
                          <div className="mt-1 text-[13px] text-black">{member.memberStatus}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">계정 상태</div>
                          <div className="mt-1 text-[13px] text-black">{getAccountStatusLabel(member.accountStatus)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
