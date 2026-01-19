
import React from 'react';
import { StatusCardProps, SystemStatus } from '../types';
import { COLORS } from '../constants';

interface ExtendedProps extends StatusCardProps {
  onClick?: () => void;
}

const VisualDecorator: React.FC<{ id: string; color: string }> = ({ id, color }) => {
  // 항목별 고유 시각화 로직
  switch (id) {
    case '1': // 생체 신호 (심박 파형)
      return (
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" preserveAspectRatio="none">
          <polyline
            points="0,50 10,50 15,30 20,70 25,50 40,50 45,10 50,90 55,50 70,50 75,40 80,60 85,50 100,50"
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            className="animate-[dash_2s_linear_infinite]"
            style={{ strokeDasharray: '100', strokeDashoffset: '100' }}
          />
          <style>{`
            @keyframes dash {
              to { stroke-dashoffset: -100; }
            }
          `}</style>
        </svg>
      );
    case '2': // 자율 학습 (회전하는 노드)
      return (
        <div className="absolute top-2 right-2 w-16 h-16 opacity-20 pointer-events-none">
          <div className="absolute inset-0 border-2 border-dashed rounded-full animate-spin-slow" style={{ borderColor: color }} />
          <div className="absolute inset-2 border-2 border-dotted rounded-full animate-reverse-spin" style={{ borderColor: color }} />
        </div>
      );
    case '9': // 실시간 위치 추적 (레이더)
      return (
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-conic-gradient animate-radar-spin" 
            style={{ background: `conic-gradient(from 0deg, ${color}33, transparent 90deg)` }} />
        </div>
      );
    case '11': // 경로 최적화 (흐르는 선)
      return (
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white to-transparent animate-flow-right" style={{ backgroundColor: color }} />
          <div className="absolute top-2/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white to-transparent animate-flow-left" style={{ backgroundColor: color }} />
          <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white to-transparent animate-flow-right" style={{ backgroundColor: color }} />
        </div>
      );
    default:
      return (
        <div className="absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] pointer-events-none">
           <div className="w-full h-full rounded-full blur-2xl" style={{ backgroundColor: color }} />
        </div>
      );
  }
};

export const StatusCard: React.FC<ExtendedProps> = ({ id, title, icon, value, subText, status, onClick }) => {
  const getStatusColor = () => {
    switch (status) {
      case SystemStatus.OPERATIONAL: return COLORS.green;
      case SystemStatus.WARNING: return COLORS.yellow;
      case SystemStatus.CRITICAL: return COLORS.red;
      case SystemStatus.PROCESSING: return COLORS.blue;
      default: return COLORS.muted;
    }
  };

  const statusColor = getStatusColor();

  return (
    <div 
      onClick={onClick}
      className="bg-[#121b2b] border border-[#1e293b] rounded-xl p-5 hover:bg-[#1a2436] transition-all cursor-pointer group relative overflow-hidden shadow-lg hover:shadow-blue-500/10 hover:border-blue-500/40"
    >
      {/* Background Visualization Decorator */}
      <VisualDecorator id={id} color={statusColor} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#1e293b] text-blue-400 group-hover:scale-110 transition-transform">
              {icon}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{title}</span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full animate-pulse" 
                  style={{ 
                    backgroundColor: statusColor,
                    boxShadow: `0 0 10px ${statusColor}`
                  }} 
                />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                  {status === SystemStatus.OPERATIONAL ? 'Operational' : 
                   status === SystemStatus.WARNING ? 'Warning' : 
                   status === SystemStatus.CRITICAL ? 'Critical' : 'Processing'}
                </span>
              </div>
            </div>
          </div>
          <div className="opacity-10 group-hover:opacity-30 transition-opacity">
            {icon}
          </div>
        </div>
        
        <div className="mt-6">
          <div className="text-3xl font-black text-white font-mono tracking-tighter group-hover:text-blue-400 transition-colors">
            {value}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-bold tracking-wide uppercase">
            {subText}
          </div>
        </div>
      </div>

      {/* Hover corner effect */}
      <div className="absolute top-0 right-0 w-0 h-0 border-t-[3px] border-r-[3px] border-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-300" />
      <div className="absolute bottom-0 left-0 w-0 h-0 border-b-[3px] border-l-[3px] border-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-300" />
    </div>
  );
};
