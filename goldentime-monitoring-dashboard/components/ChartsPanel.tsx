
import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, Cell
} from 'recharts';
import { PerformanceMetrics, SystemOverview } from '../services/systemMonitoringService';

interface ChartsPanelProps {
  performance?: PerformanceMetrics | null;
  overview?: SystemOverview | null;
}

export const ChartsPanel: React.FC<ChartsPanelProps> = ({ performance, overview }) => {
  const [responseTimeData, setResponseTimeData] = useState([
    { time: '09:00', value: 180 },
    { time: '09:05', value: 195 },
    { time: '09:10', value: 172 },
    { time: '09:15', value: 205 },
    { time: '09:20', value: 188 },
    { time: '09:25', value: 192 },
  ]);

  const [caseLoadData, setCaseLoadData] = useState([
    { time: '00:00', cases: 12 },
    { time: '04:00', cases: 8 },
    { time: '08:00', cases: 25 },
    { time: '12:00', cases: 32 },
    { time: '16:00', cases: 40 },
    { time: '20:00', cases: 28 },
  ]);

  const [hospitalData, setHospitalData] = useState([
    { region: '서울', beds: 450 },
    { region: '부산', beds: 320 },
    { region: '인천', beds: 210 },
    { region: '대구', beds: 180 },
    { region: '대전', beds: 150 },
  ]);

  // 실시간 데이터 업데이트
  useEffect(() => {
    if (performance?.apiMetrics.responseTime) {
      const currentTime = new Date().toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const responseTimeValue = parseInt(performance.apiMetrics.responseTime.replace('ms', ''));
      
      setResponseTimeData(prev => {
        const newData = [...prev, { time: currentTime, value: responseTimeValue }];
        return newData.slice(-10); // 최근 10개 데이터만 유지
      });
    }
    
    if (overview?.emergencyCases) {
      const currentTime = new Date().toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      setCaseLoadData(prev => {
        const newData = [...prev, { 
          time: currentTime, 
          cases: overview.emergencyCases.active 
        }];
        return newData.slice(-8); // 최근 8개 데이터만 유지
      });
    }

    if (overview?.keyMetrics.availableBeds) {
      // 가상의 지역별 데이터 (실제로는 NEDC API에서 지역별 데이터를 가져와야 함)
      const totalBeds = overview.keyMetrics.availableBeds;
      setHospitalData([
        { region: '서울', beds: Math.floor(totalBeds * 0.35) },
        { region: '부산', beds: Math.floor(totalBeds * 0.20) },
        { region: '인천', beds: Math.floor(totalBeds * 0.15) },
        { region: '대구', beds: Math.floor(totalBeds * 0.15) },
        { region: '대전', beds: Math.floor(totalBeds * 0.15) },
      ]);
    }
  }, [performance, overview]);
  return (
    <div className="space-y-6">
      <div className="bg-[#121b2b] border border-[#1e293b] rounded-lg p-4">
        <h3 className="text-xs font-bold text-blue-400 mb-4 uppercase tracking-[0.2em]">API 평균 응답 속도 (ms)</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={responseTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={10} domain={[150, 220]} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#3b82f6' }}
              />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#121b2b] border border-[#1e293b] rounded-lg p-4">
        <h3 className="text-xs font-bold text-blue-400 mb-4 uppercase tracking-[0.2em]">응급 상황 발생 타임라인</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={caseLoadData}>
              <defs>
                <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#00ff88' }}
              />
              <Area type="monotone" dataKey="cases" stroke="#00ff88" fillOpacity={1} fill="url(#colorCases)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#121b2b] border border-[#1e293b] rounded-lg p-4">
        <h3 className="text-xs font-bold text-blue-400 mb-4 uppercase tracking-[0.2em]">지역별 가용 병상 현황</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hospitalData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#475569" fontSize={10} hide />
              <YAxis dataKey="region" type="category" stroke="#94a3b8" fontSize={10} width={60} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#1e293b' }}
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="beds" radius={[0, 4, 4, 0]}>
                {hospitalData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#1e293b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
