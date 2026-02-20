import React, { useState, useEffect } from 'react';
import { 
  Heart, Activity, Thermometer, Droplets, 
  Footprints, Moon, Brain, Flame, 
  Siren, 
  AlertTriangle, BarChart2, Sparkles, TrendingUp
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { llmService, WeeklyHealthData } from '../services/llmService';

// Mock Data for Charts
const weeklyHeartRate = [
  { day: '월', min: 62, max: 110, avg: 72 },
  { day: '화', min: 60, max: 115, avg: 74 },
  { day: '수', min: 64, max: 108, avg: 71 },
  { day: '목', min: 61, max: 120, avg: 75 },
  { day: '금', min: 63, max: 112, avg: 73 },
  { day: '토', min: 58, max: 95, avg: 68 },
  { day: '일', min: 59, max: 98, avg: 69 },
];

const weeklySteps = [
  { day: '월', steps: 6500 },
  { day: '화', steps: 8200 },
  { day: '수', steps: 10500 },
  { day: '목', steps: 7800 },
  { day: '금', steps: 9200 },
  { day: '토', steps: 12000 },
  { day: '일', steps: 4500 },
];

const sleepDistribution = [
  { name: '깊은 수면', value: 25, color: '#6366f1' },
  { name: '얕은 수면', value: 55, color: '#a5b4fc' },
  { name: '렘 수면', value: 20, color: '#e0e7ff' },
];

const emergencyStats = [
  { type: '낙상 감지', count: 1 },
  { type: '심박 이상', count: 2 },
  { type: '산소 저하', count: 0 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur border border-slate-100 p-2.5 rounded-xl shadow-lg text-xs">
        <p className="font-normal text-slate-700 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-normal">
            {p.name === 'avg' ? '평균' : p.name === 'max' ? '최대' : p.name === 'min' ? '최소' : p.name}: 
            <span className="ml-1 text-slate-600">{p.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const StatsScreen = () => {
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        // Mock 데이터를 기반으로 분석 요청 데이터 구성
        const analysisData: WeeklyHealthData = {
          avgHeartRate: 72,
          minHeartRate: 58,
          maxHeartRate: 120,
          avgSteps: 8385, // 대략적인 평균
          avgSleep: 7.2,
          anomalies: ['화요일 심박수 일시적 상승', '주말 활동량 감소']
        };

        const report = await llmService.generateWeeklyAnalysis(analysisData);
        setAiReport(report);
      } catch (error) {
        console.error("AI Analysis Failed:", error);
        setAiReport("분석 데이터를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, []);

  return (
    <div className="px-4 pt-8 pb-24 space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-normal text-slate-900">건강 통계</h2>
          <p className="text-xs text-slate-500 mt-1 font-normal">지난 7일간의 건강 데이터 분석</p>
        </div>
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-full shadow-sm shadow-indigo-100">
           <BarChart2 size={22} />
        </div>
      </div>

      {/* AI Weekly Report Section */}
      <section className="space-y-4">
        <h3 className="text-sm font-normal text-slate-700 flex items-center gap-2">
          <Sparkles size={16} className="text-gold-500"/> AI 주간 건강 브리핑
        </h3>
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-gold-500 shadow-sm">
          {loading ? (
            <div className="flex items-center gap-3 py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gold-600"></div>
              <p className="text-sm text-slate-500">수석 의료 AI가 데이터를 정밀 분석 중입니다...</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-normal">
                {aiReport}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 1. 핵심 건강 지표 */}
      <section className="space-y-4">
        <h3 className="text-sm font-normal text-slate-700 flex items-center gap-2">
          <Heart size={16} className="text-red-500"/> 핵심 건강 지표
        </h3>
        
        {/* Heart Rate Card */}
        <div className="glass-panel p-5 rounded-2xl">
           <div className="flex justify-between items-end mb-2">
             <div>
               <p className="text-[10px] text-slate-400 font-normal uppercase tracking-wider mb-1">평균 심박수</p>
               <p className="text-2xl font-normal text-slate-800 leading-none">72 <span className="text-sm text-slate-400">BPM</span></p>
             </div>
             <div className="text-right">
                <p className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-md font-normal">최고 120 / 최저 58</p>
             </div>
           </div>
           {/* Height reduced from h-32 to h-24 */}
           <div className="h-24 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={weeklyHeartRate}>
                 <defs>
                   <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                     <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                 <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '4 4' }} />
                 <Area type="monotone" dataKey="avg" stroke="#ef4444" strokeWidth={2} fill="url(#colorHr)" activeDot={{r: 6, strokeWidth: 0}} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Vital Grid */}
        <div className="grid grid-cols-2 gap-3">
           <div className="glass-panel p-4 rounded-xl flex flex-col justify-between hover:border-indigo-100 transition-colors">
              <div className="flex items-start justify-between">
                 <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg"><Activity size={16}/></div>
                 <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-normal">정상</span>
              </div>
              <div className="mt-3">
                 <p className="text-[10px] text-slate-400 uppercase font-normal">평균 혈압</p>
                 <p className="text-lg font-normal text-slate-800">120/80</p>
              </div>
           </div>
           
           <div className="glass-panel p-4 rounded-xl flex flex-col justify-between hover:border-indigo-100 transition-colors">
              <div className="flex items-start justify-between">
                 <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg"><Droplets size={16}/></div>
                 <span className="text-[10px] text-slate-400 font-normal">최저 94%</span>
              </div>
              <div className="mt-3">
                 <p className="text-[10px] text-slate-400 uppercase font-normal">평균 SpO2</p>
                 <p className="text-lg font-normal text-slate-800">98%</p>
              </div>
           </div>

           <div className="glass-panel p-4 rounded-xl flex flex-col justify-between hover:border-indigo-100 transition-colors">
              <div className="flex items-start justify-between">
                 <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg"><Thermometer size={16}/></div>
                 <span className="text-[10px] text-slate-400 font-normal">발열 0회</span>
              </div>
              <div className="mt-3">
                 <p className="text-[10px] text-slate-400 uppercase font-normal">평균 체온</p>
                 <p className="text-lg font-normal text-slate-800">36.6°C</p>
              </div>
           </div>
           
           <div className="glass-panel p-4 rounded-xl flex flex-col justify-between hover:border-indigo-200 transition-colors bg-indigo-50 shadow-md shadow-indigo-100">
              <div className="flex items-start justify-between">
                 <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><TrendingUp size={16}/></div>
              </div>
              <div className="mt-3">
                 <p className="text-[11px] text-indigo-700 font-medium">건강 점수</p>
                 <p className="text-2xl font-semibold text-indigo-900">
                   88<span className="text-sm text-indigo-500 ml-0.5">점</span>
                 </p>
              </div>
           </div>
        </div>
      </section>

      {/* 2. 활동 & 수면 */}
      <section className="space-y-4">
        <h3 className="text-sm font-normal text-slate-700 flex items-center gap-2">
          <Footprints size={16} className="text-emerald-500"/> 활동 및 수면
        </h3>
        
        {/* Steps */}
        <div className="glass-panel p-5 rounded-2xl">
           <div className="flex justify-between items-end mb-2">
             <p className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">일일 걸음수</p>
             <p className="text-xs font-normal text-slate-800">목표 달성률 <span className="text-emerald-500 font-normal ml-1">85%</span></p>
           </div>
           <div className="h-32 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={weeklySteps}>
                 <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                 <Bar dataKey="steps" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20}>
                   {weeklySteps.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.steps >= 10000 ? '#10b981' : '#a7f3d0'} />
                   ))}
                 </Bar>
                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Sleep & Stress Row */}
        <div className="grid grid-cols-2 gap-3">
           {/* Sleep Donut */}
           <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
              <div className="w-28 h-28 relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sleepDistribution}
                        innerRadius={30}
                        outerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {sleepDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <Moon size={18} className="text-indigo-500 mb-0.5"/>
                    <span className="text-xs font-normal text-slate-700">7.2h</span>
                 </div>
              </div>
              <p className="text-[10px] font-normal text-slate-500 mt-[-5px]">수면 품질 양호</p>
           </div>

           <div className="flex flex-col gap-3">
              <div className="glass-panel p-4 rounded-xl flex-1 flex items-center justify-between hover:border-indigo-100 transition-colors">
                 <div>
                    <p className="text-[10px] text-slate-400 uppercase font-normal">스트레스</p>
                    <p className="text-lg font-normal text-slate-800">24 <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full ml-1 align-middle">낮음</span></p>
                 </div>
                 <Brain size={20} className="text-pink-400 opacity-80"/>
              </div>
              <div className="glass-panel p-4 rounded-xl flex-1 flex items-center justify-between hover:border-indigo-100 transition-colors">
                 <div>
                    <p className="text-[10px] text-slate-400 uppercase font-normal">소모 칼로리</p>
                    <p className="text-lg font-normal text-slate-800">450 <span className="text-[10px] text-slate-400 ml-0.5">kcal</span></p>
                 </div>
                 <Flame size={20} className="text-orange-400 opacity-80"/>
              </div>
           </div>
        </div>
      </section>

      {/* 3. 응급 상황 */}
      <section className="space-y-4">
        <h3 className="text-sm font-normal text-slate-700 flex items-center gap-2">
          <Siren size={16} className="text-red-500"/> 응급 상황 이력 (최근 30일)
        </h3>
        
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-red-500 relative overflow-hidden">
           <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-red-50 rounded-full z-0 opacity-50"></div>
           
           <div className="flex items-center justify-between mb-5 relative z-10">
              <div>
                 <p className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">총 발생 횟수</p>
                 <p className="text-3xl font-normal text-slate-900 leading-none mt-1">3 <span className="text-sm text-slate-500 font-normal">회</span></p>
              </div>
              <div className="w-10 h-10 bg-red-100/80 rounded-full flex items-center justify-center text-red-600 shadow-sm">
                 <AlertTriangle size={20}/>
              </div>
           </div>
           
           <div className="space-y-3 relative z-10">
              {emergencyStats.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                   <span className="text-slate-600 font-normal">{item.type}</span>
                   <div className="flex items-center gap-2">
                      <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                         <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{width: `${(item.count / 3) * 100}%`, backgroundColor: item.count > 0 ? '#f87171' : '#cbd5e1'}}
                         ></div>
                      </div>
                      <span className="font-normal w-3 text-right text-slate-500">{item.count}</span>
                   </div>
                </div>
              ))}
           </div>
           
           <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between text-[10px] text-slate-500 relative z-10">
              <span>평균 응답 시간</span>
              <span className="font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">45초 이내</span>
           </div>
        </div>
      </section>

      {/* 4. 종합 분석 (System & Data Quality moved to Profile) */}
      <section className="space-y-4">
         <h3 className="text-sm font-normal text-slate-700 flex items-center gap-2">
           <Sparkles size={16} className="text-amber-400"/> 주간 건강 예측
         </h3>
         
         <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg shadow-slate-200">
            <div className="flex items-start gap-3">
               <div className="p-1.5 bg-white/10 rounded-lg">
                 <Sparkles className="text-amber-400" size={18} />
               </div>
               <div>
                  <h4 className="font-normal text-sm mb-1 text-white">주간 AI 건강 예측</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                     현재 데이터 추세로 볼 때, 향후 7일간 심혈관 상태는 안정적일 것으로 예상됩니다. 수면 규칙성만 조금 더 개선하면 건강 점수가 90점대에 도달할 수 있습니다.
                  </p>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
};
