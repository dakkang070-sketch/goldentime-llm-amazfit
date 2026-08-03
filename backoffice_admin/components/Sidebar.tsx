import React from 'react';
import { Users, History, Settings, ShieldAlert, PanelLeftClose, PanelLeftOpen, UserCheck, ShieldCheck, ShieldEllipsis, Phone, CheckCircle2 } from 'lucide-react';
import { Page } from '../types';

/**
 * 사이드바 현재 페이지, 열림 상태, 이동 콜백을 전달받는 prop 구조입니다.
 */
interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * 관리자 앱의 좌측 네비게이션과 접기/펼치기 상태를 렌더링합니다.
 */
export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, onToggle }) => {
  /**
   * 사이드바에서 이동 가능한 관리자 주요 페이지 목록입니다.
   */
  const menuItems = [
    { id: Page.APPROVALS, label: '승인관리', icon: CheckCircle2 },
    { id: Page.CONTROLLERS, label: '관제요원관리', icon: ShieldCheck },
    { id: Page.WELFARE, label: '복지사관리', icon: UserCheck },
    { id: Page.MEMBERS, label: '회원 관리', icon: Users },
    { id: Page.GUARDIANS, label: '보호자관리', icon: Phone },
    { id: Page.HISTORY, label: 'AI 응급 이력', icon: History },
    { id: Page.ADMINS, label: '관리자관리', icon: ShieldEllipsis },
  ];

  return (
    <div 
      className={`bg-slate-50 border-r border-slate-300 h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Header */}
      <div className={`h-20 border-b border-slate-200 relative ${
        isOpen ? 'p-4 flex items-center justify-between' : 'px-3 flex items-center justify-center'
      }`}>
        <div className={`flex items-center gap-3 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
          {/* 접힌 상태에서는 브랜드 텍스트를 완전히 숨겨 아이콘 1열 레이아웃만 남깁니다. */}
          <div className="bg-blue-600 p-2 rounded-lg shadow-sm shrink-0">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div className="whitespace-nowrap overflow-hidden">
            <h1 className="text-lg text-black tracking-tight font-medium">응급관리자 사이트</h1>
            <p className="text-xs text-slate-600">(Backoffice)</p>
          </div>
        </div>
        
        {/* Toggle Button */}
        <button 
          onClick={onToggle}
          className={`p-2 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-200 transition-colors ${
            !isOpen ? 'flex h-10 w-10 items-center justify-center mx-auto' : ''
          }`}
          title={isOpen ? "메뉴 접기" : "메뉴 펼치기"}
        >
          {isOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={24} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-6 space-y-2 ${isOpen ? 'px-3' : 'px-2.5'}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200 shadow-sm' 
                  : 'text-slate-700 hover:bg-slate-200 hover:text-black'
              } ${!isOpen ? 'mx-auto h-12 w-12 justify-center px-0' : ''}`}
            >
              {/* 접힌 상태에서도 active 색은 유지해 아이콘만 보고 현재 페이지를 식별할 수 있게 합니다. */}
              <Icon size={22} className={`shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-500 group-hover:text-black'}`} />
              
              <span className={`text-[15px] whitespace-nowrap transition-all duration-200 ${
                isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden absolute'
              }`}>
                {item.label}
              </span>

              {/* Tooltip for collapsed state */}
              {!isOpen && (
                // 접힌 상태에서도 현재 메뉴 의미를 잃지 않도록 hover tooltip으로 라벨을 보완합니다.
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Profile */}
      <div className={`border-t border-slate-200 ${isOpen ? 'p-4' : 'px-3 py-4 flex justify-center'}`}>
        <div className={`bg-slate-100 rounded-lg border border-slate-200 transition-all duration-300 ${
          isOpen ? 'p-3' : 'flex h-[106px] w-16 flex-col items-center justify-center gap-2 p-0'
        }`}>
          {isOpen ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs text-white shadow-sm shrink-0">
                  AD
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-black truncate font-medium">관리자</p>
                  <p className="text-xs text-slate-600 truncate">시스템 운영팀</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate(Page.SETTINGS)}
                title="시스템 설정"
                aria-label="시스템 설정"
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  currentPage === Page.SETTINGS
                    ? 'border-blue-200 bg-blue-100 text-blue-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-200 hover:text-black'
                }`}
              >
                <Settings size={18} />
              </button>
            </div>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs text-white shadow-sm shrink-0">
                AD
              </div>
              <button
                onClick={() => onNavigate(Page.SETTINGS)}
                title="시스템 설정"
                aria-label="시스템 설정"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                  currentPage === Page.SETTINGS
                    ? 'border-blue-200 bg-blue-100 text-blue-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-200 hover:text-black'
                }`}
              >
                <Settings size={18} />
              </button>
              <div className="pointer-events-none absolute opacity-0" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
