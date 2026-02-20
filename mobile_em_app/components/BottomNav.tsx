import React from 'react';
import { Users, History, Settings } from 'lucide-react';
import { Page } from '../types';

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate }) => {
  const menuItems = [
    { id: Page.MEMBERS, label: '회원', icon: Users },
    { id: Page.HISTORY, label: '이력', icon: History },
    { id: Page.SETTINGS, label: '설정', icon: Settings },
  ];

  return (
    <div className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] shrink-0">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <Icon size={24} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};