
import React from 'react';
import { StatusCardProps, SystemStatus } from '../types';
import { COLORS } from '../constants';
import { X, Server, Clock, Shield, BarChart3, TrendingUp } from 'lucide-react';

interface Props {
  card: StatusCardProps;
  onClose: () => void;
}

export const DetailModal: React.FC<Props> = ({ card, onClose }) => {
  const getStatusColor = () => {
    switch (card.status) {
      case SystemStatus.OPERATIONAL: return COLORS.green;
      case SystemStatus.WARNING: return COLORS.yellow;
      case SystemStatus.CRITICAL: return COLORS.red;
      case SystemStatus.PROCESSING: return COLORS.blue;
      default: return COLORS.muted;
    }
  };

  const statusColor = getStatusColor();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0a0f1c]/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Body */}
      <div className="relative w-full max-w-2xl bg-[#121b2b] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#1e293b] flex items-center justify-between bg-gradient-to-r from-[#121b2b] to-[#1a2436]">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[#1e293b] text-blue-400">
              {card.icon}
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{card.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div 
                  className="w-2 h-2 rounded-full animate-pulse" 
                  style={{ backgroundColor: statusColor, boxShadow: `0 0 10px ${statusColor}` }}
                />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{card.status}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#1e293b] text-slate-500 hover:text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Description & Overview */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Server className="w-3 h-3 text-blue-500" /> 시스템 개요
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  {card.details?.description || '이 시스템은 골든타임 AI 플랫폼의 핵심 구성 요소로, 실시간 데이터 처리와 응급 의료 최적화를 담당합니다.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#0a0f1c] border border-[#1e293b]">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">UPTIME</span>
                  <span className="text-lg font-mono font-bold text-green-400">{card.details?.uptime || '99.9%'}</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0a0f1c] border border-[#1e293b]">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">LAST SYNC</span>
                  <span className="text-lg font-mono font-bold text-blue-400">{card.details?.lastUpdate || '최근'}</span>
                </div>
              </div>
            </div>

            {/* Metrics & Performance */}
            <div>
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <BarChart3 className="w-3 h-3 text-blue-500" /> 실시간 성능 메트릭
              </h3>
              <div className="space-y-3">
                {(card.details?.metrics || [
                  { label: '데이터 무결성', value: '99.9%' },
                  { label: '네트워크 부하', value: '24%' },
                  { label: '처리 우선순위', value: 'HIGH' }
                ]).map((metric, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#1a2436]/50 border border-[#1e293b]">
                    <span className="text-[11px] font-bold text-slate-400">{metric.label}</span>
                    <span className="text-sm font-mono font-black text-white">{metric.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-4">
                 <div className="p-2 rounded-full bg-blue-500/20 text-blue-400">
                    <TrendingUp className="w-5 h-5" />
                 </div>
                 <div>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block">상태 분석 결과</span>
                    <span className="text-xs text-slate-300 font-medium">정상 범위 내에서 안정적으로 작동 중입니다.</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-[#1e293b] flex justify-end gap-3 bg-[#0a0f1c]/50">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest"
          >
            Close
          </button>
          <button className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-black text-white transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] uppercase tracking-widest">
            Detailed Log Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
