
import React, { memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VitalsChartProps {
  data: { time: string; hr: number; stress: number }[];
}

const VitalsChart: React.FC<VitalsChartProps> = memo(({ data }) => {
  return (
    <div className="h-full w-full bg-zinc-950/50 p-2.5 rounded-2xl border border-zinc-800/50 shadow-inner overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
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
            yAxisId="left"
            stroke="#52525b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            domain={[40, 180]}
            tick={{ fill: '#a1a1aa' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#52525b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            domain={[0, 100]}
            tick={{ fill: '#a1a1aa' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(8px)', color: '#fff' }}
            itemStyle={{ padding: '2px 0' }}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="hr" 
            stroke="#ef4444" 
            strokeWidth={2.5} 
            dot={false} 
            name="심박수"
            isAnimationActive={true}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="stress" 
            stroke="#a855f7" 
            strokeWidth={2.5} 
            dot={false} 
            name="스트레스"
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default VitalsChart;
