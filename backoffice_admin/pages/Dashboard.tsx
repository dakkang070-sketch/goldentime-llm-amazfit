import React from 'react';
import { 
  Users, AlertTriangle, Activity, CheckCircle, 
  MoreHorizontal
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const data = [
  { name: '00:00', alerts: 2 },
  { name: '04:00', alerts: 1 },
  { name: '08:00', alerts: 5 },
  { name: '12:00', alerts: 8 },
  { name: '16:00', alerts: 12 },
  { name: '20:00', alerts: 6 },
  { name: '23:59', alerts: 4 },
];

const pieData = [
  { name: '낙상 감지', value: 45 },
  { name: '심박 이상', value: 25 },
  { name: 'SOS 호출', value: 20 },
  { name: '안심존 이탈', value: 10 },
];

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

export const Dashboard: React.FC = () => {
  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl text-white mb-2">시스템 현황</h2>
          <p className="text-slate-400">GuardianAI 네트워크의 실시간 상태입니다.</p>
        </div>
        <div className="flex gap-3">
          <span className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            시스템 정상 가동 중
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="총 회원 수" value="1,248" change="+12%" trend="up" icon={Users} color="blue" />
        <StatCard title="진행 중 알림" value="3" change="+1" trend="up" icon={AlertTriangle} color="red" />
        <StatCard title="AI 정확도" value="98.2%" change="+0.4%" trend="up" icon={Activity} color="amber" />
        <StatCard title="시스템 가동률" value="99.9%" icon={CheckCircle} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg text-white">사고 발생 추세 (24시간)</h3>
            <button className="text-slate-400 hover:text-white"><MoreHorizontal size={20} /></button>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#ef4444' }}
                />
                <Area type="monotone" dataKey="alerts" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorAlerts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg text-white mb-6">알림 유형 분포</h3>
          <div className="h-64 w-full relative">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <span className="text-3xl text-white block">84</span>
                    <span className="text-xs text-slate-400">총 알림</span>
                </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-slate-300">{entry.name}</span>
                </div>
                <span className="text-slate-400">{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};