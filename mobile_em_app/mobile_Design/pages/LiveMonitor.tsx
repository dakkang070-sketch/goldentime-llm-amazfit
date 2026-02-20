import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, MapPin, Heart, Activity, 
  BrainCircuit, Phone, Video, Loader2, CheckCircle2,
  Navigation
} from 'lucide-react';
import { Incident, Member } from '../types';
import { generateIncidentReport } from '../services/geminiService';

// Mock Data
const MOCK_ALERTS: Incident[] = [
  {
    id: 'inc-001',
    memberId: 'm-105',
    memberName: '김철수',
    timestamp: '오전 10:42:15',
    type: '낙상 감지',
    severity: '위험',
    status: '신규',
    location: { lat: 37.5665, lng: 126.9780, address: '서울시 종로구 사직동 12-4' },
    aiConfidence: 96,
    heartRate: 115
  },
  {
    id: 'inc-002',
    memberId: 'm-202',
    memberName: '이영희',
    timestamp: '오전 10:38:00',
    type: '심박 이상',
    severity: '주의',
    status: '처리 중',
    location: { lat: 37.5005, lng: 127.0380, address: '서울시 강남구 역삼동 22-1' },
    aiConfidence: 88,
    heartRate: 145
  },
  {
    id: 'inc-003',
    memberId: 'm-309',
    memberName: '박지민',
    timestamp: '오전 10:15:22',
    type: 'SOS 호출',
    severity: '위험',
    status: '완료',
    location: { lat: 37.5512, lng: 126.9882, address: '서울시 중구 남산공원길' },
    aiConfidence: 100,
    heartRate: 98
  }
];

// Mock Member Profile for context
const MOCK_MEMBER: Member = {
  id: 'm-105',
  name: '김철수',
  email: 'kim.cs@example.com',
  birthDate: '1946-05-12',
  age: 78,
  gender: '남',
  height: 172,
  weight: 68,
  bloodType: 'A+',
  phone: '010-1234-5678',
  address: '서울시 종로구 사직동 12-4',
  guardian: {
    name: '김민수',
    relationship: '자녀',
    phone: '010-9999-8888'
  },
  connectedDevice: {
      modelName: 'STARMAX WATCH ULTRA G1',
      serialNumber: 'SMX-UG1-8823',
      lastSyncTime: '오전 10:19:35',
      batteryEfficiency: '48시간 예상',
      signalQuality: '양호 (98%)'
  },
  appSettings: {
      autoReportEnabled: true,
      locationCollectionEnabled: true,
      healthAnalysisEnabled: true,
      transmissionInterval: '10초'
  },
  healthStats: {
    averageHeartRate: 110,
    heartRateRange: { min: 60, max: 165 },
    heartRateHistory: [
      { name: '월', value: 95 }, { name: '화', value: 102 }, { name: '수', value: 98 }, { name: '목', value: 105 }, { name: '금', value: 108 }, { name: '토', value: 112 }, { name: '일', value: 115 }
    ],
    averageBloodPressure: '158/92',
    averageSPO2: 95,
    minSPO2: 91,
    averageTemperature: 37.1,
    feverCount: 1,
    healthScore: 52,
    stepsHistory: [
      { name: '월', value: 1500 }, { name: '화', value: 2000 }, { name: '수', value: 1800 }, { name: '목', value: 1200 }, { name: '금', value: 1000 }, { name: '토', value: 800 }, { name: '일', value: 500 }
    ],
    stepGoalAchievement: 25,
    averageSleep: 4.8,
    sleepQuality: '나쁨',
    averageStress: 88,
    caloriesBurned: 210,
    incidentSummary: {
      total: 8,
      fall: 3,
      arrhythmia: 4,
      lowOxygen: 1,
      avgResponseTime: '25초 이내'
    },
    weeklyPrediction: '심박수 불규칙 빈도가 증가하고 있습니다. 낙상 위험이 매우 높으므로 즉각적인 보호자 개입이 권장됩니다.'
  },
  riskLevel: '고위험',
  medicalConditions: ['고혈압', '골다공증', '뇌졸중 이력 (2022)'],
  medications: '아스피린, 혈압강하제',
  allergies: '페니실린',
  lastActive: '방금 전',
  deviceBattery: 45,
  status: '위험',
  biometrics: {
    heartRate: 115,
    bloodPressure: '160/95',
    bloodOxygen: 94,
    sleep: 4.5,
    temperature: 37.2,
    bloodGlucose: 150,
    stress: 85,
    hrv: 30,
    ecg: '비정상',
    gyroscope: '낙상 감지'
  }
};

export const LiveMonitor: React.FC = () => {
  const [selectedIncident, setSelectedIncident] = useState<Incident>(MOCK_ALERTS[0]);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    // Simulate finding the correct member for the incident
    const member = selectedIncident.memberId === 'm-105' ? MOCK_MEMBER : undefined;
    const report = await generateIncidentReport(selectedIncident, member);
    setAiAnalysis(report);
    setIsGenerating(false);
  };

  useEffect(() => {
    setAiAnalysis(null); // Reset when switching incidents
  }, [selectedIncident]);

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-slate-900 text-slate-200 overflow-hidden">
      {/* Left Panel: Alert Feed */}
      <div className="w-full lg:w-1/3 border-r border-slate-800 flex flex-col h-full">
        <div className="p-4 border-b border-slate-800 bg-slate-900 z-10">
          <h2 className="text-xl text-white flex items-center gap-2">
            <Activity className="text-red-500" /> 실시간 상황판
          </h2>
          <p className="text-sm text-slate-500 mt-1">실시간 응급 신호 모니터링</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {MOCK_ALERTS.map((alert) => (
            <div
              key={alert.id}
              onClick={() => setSelectedIncident(alert)}
              className={`p-4 rounded-lg cursor-pointer transition-all border ${
                selectedIncident.id === alert.id
                  ? 'bg-slate-800 border-blue-500/50 shadow-lg'
                  : 'bg-slate-800/40 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-0.5 rounded text-xs uppercase tracking-wider ${
                  alert.severity === '위험' ? 'bg-red-50 text-white' : 'bg-amber-50 text-black'
                }`}>
                  {alert.severity}
                </span>
                <span className="text-xs text-slate-400">{alert.timestamp}</span>
              </div>
              <h3 className="text-white">{alert.type}</h3>
              <p className="text-sm text-slate-400">{alert.memberName}</p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                 <MapPin size={12} className="text-slate-500" />
                 <span className="truncate max-w-[200px]">{alert.location.address}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Incident Detail & AI Ops */}
      <div className="flex-1 flex flex-col h-full bg-slate-950">
        {/* Top Detail Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900 shadow-sm flex justify-between items-start">
          <div>
             <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl text-white">{selectedIncident.memberName}</h1>
                <span className="px-2 py-1 rounded bg-slate-700 text-xs text-slate-300">ID: {selectedIncident.memberId}</span>
             </div>
             <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1"><AlertOctagon size={16} className="text-red-500" /> {selectedIncident.type}</span>
                <span className="flex items-center gap-1"><MapPin size={16} /> {selectedIncident.location.address}</span>
             </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
              <Phone size={18} /> 전화 연결
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
              <Video size={18} /> 실시간 영상
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
             {/* Vitals Card */}
             <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                <h3 className="text-slate-400 text-sm mb-4 flex items-center gap-2">
                  <Heart size={16} className="text-pink-500" /> 실시간 바이탈
                </h3>
                <div className="flex items-end gap-2">
                   <span className="text-4xl text-white">{selectedIncident.heartRate}</span>
                   <span className="text-sm text-slate-400 mb-1">BPM</span>
                </div>
                <div className="h-1 w-full bg-slate-800 mt-4 rounded-full overflow-hidden">
                   <div className="h-full bg-pink-500 w-[70%] animate-pulse"></div>
                </div>
                <p className="mt-2 text-xs text-pink-400">불규칙한 리듬 감지됨</p>
             </div>

             {/* AI Confidence Card */}
             <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                <h3 className="text-slate-400 text-sm mb-4 flex items-center gap-2">
                  <BrainCircuit size={16} className="text-purple-500" /> AI 감지 분석
                </h3>
                <div className="flex items-end gap-2">
                   <span className="text-4xl text-white">{selectedIncident.aiConfidence}%</span>
                   <span className="text-sm text-slate-400 mb-1">신뢰도</span>
                </div>
                <div className="h-1 w-full bg-slate-800 mt-4 rounded-full overflow-hidden">
                   <div className="h-full bg-purple-500 w-[96%]"></div>
                </div>
                <p className="mt-2 text-xs text-purple-400">패턴 일치: 강한 충격 낙상</p>
             </div>

             {/* Action Status */}
             <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                <h3 className="text-slate-400 text-sm mb-4 flex items-center gap-2">
                  <Navigation size={16} className="text-blue-500" /> 출동 상태
                </h3>
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                     <CheckCircle2 size={20} />
                   </div>
                   <div>
                     <p className="text-white">자동 출동 요청됨</p>
                     <p className="text-xs text-slate-400">EMS 42호차 통보 완료</p>
                   </div>
                </div>
             </div>
          </div>

          {/* AI Analysis Section */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800">
              <h3 className="text-lg text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs">AI</span>
                사고 상황 분석
              </h3>
              {!aiAnalysis && (
                <button 
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                  리포트 생성
                </button>
              )}
            </div>
            
            <div className="p-6 min-h-[150px]">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-slate-500 space-y-3">
                  <Loader2 size={32} className="animate-spin text-indigo-500" />
                  <p>텔레메트리 및 환자 기록을 분석 중입니다...</p>
                </div>
              ) : aiAnalysis ? (
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-line text-slate-300 leading-relaxed text-sm">
                    {aiAnalysis}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
                    <button 
                       onClick={() => setAiAnalysis(null)}
                       className="text-xs text-slate-500 hover:text-white"
                    >
                      분석 내용 지우기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-slate-600">
                  <BrainCircuit size={40} className="mb-2 opacity-20" />
                  <p className="text-sm">'리포트 생성'을 클릭하여 AI 기반 사고 분석을 시작하세요.</p>
                </div>
              )}
            </div>
          </div>

          {/* Visual Map Placeholder */}
          <div className="mt-6 bg-slate-800 rounded-xl h-64 w-full relative overflow-hidden group">
            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                {/* Simulated Map Grid */}
                <div className="w-full h-full opacity-20" style={{
                    backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}></div>
                
                {/* Radar Effect */}
                <div className="absolute w-64 h-64 border border-blue-500/30 rounded-full flex items-center justify-center animate-ping opacity-20"></div>
                <div className="absolute w-32 h-32 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,1)] animate-pulse"></div>
                </div>
                
                <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-300 font-mono">위도: {selectedIncident.location.lat}</p>
                    <p className="text-xs text-slate-300 font-mono">경도: {selectedIncident.location.lng}</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};