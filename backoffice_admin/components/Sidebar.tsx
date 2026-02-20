import React from 'react';
import { Users, History, Settings, ShieldAlert, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, onToggle }) => {
  const menuItems = [
    { id: Page.MEMBERS, label: '회원 관리', icon: Users },
    { id: Page.HISTORY, label: 'AI 응급 이력', icon: History },
    { id: Page.SETTINGS, label: '시스템 설정', icon: Settings },
  ];

  return (
    <div 
      className={`bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Header */}
      <div className="p-4 h-20 flex items-center justify-between border-b border-slate-100 relative">
        <div className={`flex items-center gap-3 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
          <div className="bg-blue-600 p-2 rounded-lg shadow-sm shrink-0">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div className="whitespace-nowrap overflow-hidden">
            <h1 className="text-lg text-black tracking-tight font-medium">응급관리자 사이트</h1>
            <p className="text-xs text-slate-500">(Backoffice)</p>
          </div>
        </div>
        
        {/* Toggle Button */}
        <button 
          onClick={onToggle}
          className={`p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors ${
            !isOpen ? 'w-full flex justify-center' : ''
          }`}
          title={isOpen ? "메뉴 접기" : "메뉴 펼치기"}
        >
          {isOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={24} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-black'
              } ${!isOpen ? 'justify-center' : ''}`}
            >
              <Icon size={22} className={`shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-black'}`} />
              
              <span className={`text-[15px] whitespace-nowrap transition-all duration-200 ${
                isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden absolute'
              }`}>
                {item.label}
              </span>

              {/* Tooltip for collapsed state */}
              {!isOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Profile */}
      <div className="p-4 border-t border-slate-100">
        <div className={`bg-slate-50 rounded-lg border border-slate-100 transition-all duration-300 ${
          isOpen ? 'p-3' : 'p-2 flex justify-center'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs text-white shadow-sm shrink-0">
              AD
            </div>
            <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
              <p className="text-sm text-black truncate font-medium">관리자</p>
              <p className="text-xs text-slate-500 truncate">시스템 운영팀</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};