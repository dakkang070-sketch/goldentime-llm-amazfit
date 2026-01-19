
import React from 'react';
import { ActivityEvent } from '../types';
import { AlertCircle, Info, Clock } from 'lucide-react';

interface Props {
  events: ActivityEvent[];
}

export const ActivityFeed: React.FC<Props> = ({ events }) => {
  return (
    <div className="bg-[#121b2b] border border-[#1e293b] rounded-lg flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-[#1e293b] flex justify-between items-center bg-[#0f172a]">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> 실시간 이벤트 로그
        </h3>
        <span className="text-[9px] text-blue-500 font-mono font-bold animate-pulse">LIVE SYNCING</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {events.map((event) => (
          <div 
            key={event.id} 
            className={`p-2.5 rounded-md text-[11px] border transition-all ${
              event.level === 'critical' 
                ? 'bg-red-500/10 border-red-500/30 text-red-200' 
                : 'bg-[#1a2436] border-[#1e293b] text-slate-300 hover:border-blue-500/50'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className={`font-mono text-[9px] font-bold ${event.level === 'critical' ? 'text-red-400' : 'text-blue-400'}`}>
                [{event.timestamp}]
              </span>
              {event.level === 'critical' ? (
                <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />
              ) : (
                <Info className="w-3 h-3 text-slate-500" />
              )}
            </div>
            <p className="leading-snug">{event.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
