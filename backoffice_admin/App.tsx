import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { AdminManagement } from './pages/AdminManagement';
import { ControllerManagement } from './pages/ControllerManagement';
import { Guardians } from './pages/Guardians';
import { Members } from './pages/Members';
import { Approvals } from './pages/Approvals';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { WelfareManagement } from './pages/WelfareManagement';
import { Page } from './types';
import { AdminSession, adminService } from './services/adminService';

/**
 * 관리자 앱의 현재 페이지와 사이드바 상태를 관리하는 최상위 컴포넌트입니다.
 */
const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.MEMBERS);
  // 사이드바 폭 전환에 맞춰 메인 패널 left margin도 같이 움직이게 합니다.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  /**
   * 저장된 관리자 로그인 세션이 있으면 앱 진입 시 복구합니다.
   */
  useEffect(() => {
    setAdminSession(adminService.getStoredSession());
  }, []);

  /**
   * 관리자 로그인 요청을 처리하고 세션을 저장합니다.
   */
  async function handleAdminLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      setIsLoggingIn(true);
      setLoginError('');
      const nextSession = await adminService.login(loginEmail, loginPassword);
      setAdminSession(nextSession);
      setLoginPassword('');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '관리자 로그인에 실패했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  }

  /**
   * 관리자 세션을 정리하고 로그인 화면으로 되돌립니다.
   */
  function handleAdminLogout() {
    adminService.logout();
    setAdminSession(null);
    setLoginPassword('');
  }

  /**
   * 관리자 인증 전용 로그인 화면을 렌더링합니다.
   */
  function renderLoginScreen() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <form
          onSubmit={handleAdminLogin}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">응급관리자 로그인</h1>
            <p className="text-sm text-slate-500">관리자 승인 및 설정 화면은 관리자 계정으로만 접근할 수 있습니다.</p>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">이메일</span>
              <input
                type="text"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm text-slate-900 outline-none focus:border-blue-600"
                placeholder="admin 또는 관리자 이메일"
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">비밀번호</span>
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm text-slate-900 outline-none focus:border-blue-600"
                placeholder="비밀번호를 입력해주세요"
                autoComplete="current-password"
              />
            </label>
          </div>

          {loginError ? <p className="mt-4 text-sm text-rose-600">{loginError}</p> : null}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isLoggingIn ? '로그인 중...' : '관리자 로그인'}
          </button>
        </form>
      </div>
    );
  }

  /**
   * 현재 선택된 메뉴에 맞는 관리자 페이지 컴포넌트를 렌더링합니다.
   */
  const renderContent = () => {
    switch (currentPage) {
      case Page.APPROVALS:
        return <Approvals />;
      case Page.ADMINS:
        return <AdminManagement />;
      case Page.CONTROLLERS:
        return <ControllerManagement />;
      case Page.WELFARE:
        return <WelfareManagement />;
      case Page.MEMBERS:
        return <Members />;
      case Page.GUARDIANS:
        return <Guardians />;
      case Page.HISTORY:
        return <History />;
      case Page.SETTINGS:
        return <Settings />;
      default:
        // 알 수 없는 값이 들어와도 회원 목록을 기본 화면으로 유지해 관리자 앱이 빈 화면으로 떨어지지 않게 합니다.
        return <Members />;
    }
  };

  if (!adminSession?.token) {
    return renderLoginScreen();
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        isOpen={isSidebarOpen}
        // 토글은 별도 상태 기계 없이 boolean 반전만으로 폭 전환과 레이아웃 애니메이션을 같이 맞춥니다.
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      {/* 메인 영역은 사이드바가 fixed여도 같은 폭만큼 margin을 줘 겹침 없이 한 화면 레이아웃을 유지합니다. */}
      <main 
        className={`flex h-screen flex-1 flex-col overflow-hidden bg-slate-100 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <div className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-right">
            <div className="text-sm font-medium text-slate-900">{adminSession.name || adminSession.email}</div>
            <div className="text-xs text-slate-500">{adminSession.email}</div>
          </div>
          <button
            type="button"
            onClick={handleAdminLogout}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            로그아웃
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

/**
 * 백오피스 관리자 앱 최상위 컴포넌트를 기본 export로 제공합니다.
 */
export default App;
