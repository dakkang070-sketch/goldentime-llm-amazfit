import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { HistoryPoint } from '../types';

interface LiveChartProps {
  data: HistoryPoint[];
  color: string;
}

export const LiveChart: React.FC<LiveChartProps> = ({ data, color }) => {
  if (!data || data.length < 2) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-[11px] text-slate-400">실시간 데이터 수집 대기 중...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
          <Tooltip 
            contentStyle={{ 
                backgroundColor: 'rgba(255,255,255,0.8)', 
                backdropFilter: 'blur(4px)',
                border: 'none', 
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }} 
            labelStyle={{ display: 'none' }}
          />
          <Area 
            type="monotone" 
            dataKey="heartRate" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorHr)" 
            animationDuration={500}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
