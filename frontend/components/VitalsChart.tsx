
import React, { memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VitalsChartProps {
  data: { time: string; hr: number; spo2: number }[];
}

const VitalsChart: React.FC<VitalsChartProps> = memo(({ data }) => {
  return (
    <div className="h-40 w-full bg-zinc-950/50 p-2.5 rounded-2xl border border-zinc-800/50 shadow-inner overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#52525b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            tick={{ fill: '#a1a1aa' }}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#52525b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            domain={[60, 180]}
            tick={{ fill: '#a1a1aa' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(8px)', color: '#fff' }}
            itemStyle={{ padding: '2px 0' }}
          />
          <Line 
            type="monotone" 
            dataKey="hr" 
            stroke="#ef4444" 
            strokeWidth={2.5} 
            dot={false} 
            name="HR"
            isAnimationActive={false}
          />
          <Line 
            type="monotone" 
            dataKey="spo2" 
            stroke="#3b82f6" 
            strokeWidth={2.5} 
            dot={false} 
            name="SpO2"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default VitalsChart;
