import React, { useState } from 'react';
import { 
  Search, Filter, Battery, Activity, X,
  Heart, Thermometer, Moon, Brain, Move, Droplets, Wind, ActivitySquare, Zap,
  User, Phone, Calendar, Ruler, Weight, Shield, Pill, AlertCircle, Watch, Wifi, CheckCircle2,
  BarChart2, TrendingUp, Sparkles, Flame, Pencil, Check, Save, Lock, Mail, Unlink, Link,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { Member, MemberSettings } from '../types';
import { analyzeMemberRisk } from '../services/geminiService';

// Mock Data
const MOCK_MEMBERS: Member[] = [
  { 
    id: 'm-101', name: '김철수', email: 'kim.cs@example.com', birthDate: '1946-05-12', age: 78, gender: '남', height: 172, weight: 68, bloodType: 'A+', phone: '010-1234-5678', address: '서울 종로구 사직동', 
    guardian: { name: '김민수', relationship: '자녀', phone: '010-9999-8888' },
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
      averageHeartRate: 82,
      heartRateRange: { min: 65, max: 145 },
      heartRateHistory: [
        { name: '월', value: 78 }, { name: '화', value: 82 }, { name: '수', value: 85 }, { name: '목', value: 79 }, { name: '금', value: 90 }, { name: '토', value: 88 }, { name: '일', value: 82 }
      ],
      averageBloodPressure: '150/95',
      averageSPO2: 96,
      minSPO2: 92,
      averageTemperature: 36.8,
      feverCount: 0,
      healthScore: 65,
      stepsHistory: [
        { name: '월', value: 2000 }, { name: '화', value: 3500 }, { name: '수', value: 4000 }, { name: '목', value: 1500 }, { name: '금', value: 3000 }, { name: '토', value: 5000 }, { name: '일', value: 2500 }
      ],
      stepGoalAchievement: 45,
      averageSleep: 5.2,
      sleepQuality: '나쁨',
      averageStress: 78,
      caloriesBurned: 320,
      incidentSummary: { total: 5, fall: 2, arrhythmia: 3, lowOxygen: 0, avgResponseTime: '30초 이내' },
      weeklyPrediction: '최근 심박수 변동폭이 커지고 있어 심혈관 모니터링 주의가 필요합니다. 수면 부족이 지속될 경우 낙상 위험이 15% 증가할 것으로 예측됩니다.'
    },
    riskLevel: '고위험', medicalConditions: ['고혈압'], medications: '아스피린, 혈압강하제', allergies: '페니실린',
    lastActive: '2분 전', deviceBattery: 45, status: '위험',
    biometrics: { heartRate: 102, bloodPressure: '150/95', bloodOxygen: 96, sleep: 5.2, temperature: 36.8, bloodGlucose: 140, stress: 78, hrv: 35, ecg: '비정상', gyroscope: '안정' }
  },
  { 
    id: 'm-105', name: '정우성', email: 'ws.jung@example.com', birthDate: '1954-03-30', age: 70, gender: '남', height: 178, weight: 72, bloodType: 'A-', phone: '010-3333-7777', address: '대구 수성구',
    guardian: { name: '정해인', relationship: '손자', phone: '010-0000-0000' },
    connectedDevice: {
      modelName: 'STARMAX WATCH ULTRA G1',
      serialNumber: 'SMX-UG1-7722',
      lastSyncTime: '오전 08:45:22',
      batteryEfficiency: '36시간 예상',
      signalQuality: '양호 (96%)'
    },
    appSettings: {
      autoReportEnabled: true,
      locationCollectionEnabled: true,
      healthAnalysisEnabled: true,
      transmissionInterval: '10초'
    },
    healthStats: {
      averageHeartRate: 72,
      heartRateRange: { min: 58, max: 120 },
      heartRateHistory: [
        { name: '월', value: 70 }, { name: '화', value: 72 }, { name: '수', value: 71 }, { name: '목', value: 73 }, { name: '금', value: 75 }, { name: '토', value: 72 }, { name: '일', value: 71 }
      ],
      averageBloodPressure: '120/80',
      averageSPO2: 98,
      minSPO2: 94,
      averageTemperature: 36.6,
      feverCount: 0,
      healthScore: 88,
      stepsHistory: [
        { name: '월', value: 5000 }, { name: '화', value: 6500 }, { name: '수', value: 8000 }, { name: '목', value: 6000 }, { name: '금', value: 7500 }, { name: '토', value: 9000 }, { name: '일', value: 4000 }
      ],
      stepGoalAchievement: 85,
      averageSleep: 7.2,
      sleepQuality: '양호',
      averageStress: 24,
      caloriesBurned: 450,
      incidentSummary: { total: 3, fall: 1, arrhythmia: 2, lowOxygen: 0, avgResponseTime: '45초 이내' },
      weeklyPrediction: '현재 데이터 추세로 볼 때, 향후 7일간 심혈관 상태는 안정적일 것으로 예상됩니다. 수면 규칙성만 조금 더 개선하면 건강 점수가 90점대에 도달할 수 있습니다.'
    },
    riskLevel: '중위험', medicalConditions: ['관절염'], medications: '진통소염제', allergies: '없음',
    lastActive: '30분 전', deviceBattery: 65, status: '정상',
    biometrics: { heartRate: 85, bloodPressure: '135/88', bloodOxygen: 97, sleep: 6.0, temperature: 37.1, bloodGlucose: 105, stress: 55, hrv: 48, ecg: '정상', gyroscope: '안정' }
  },
];

// --- Helper Functions for Color Coding ---

const getHeartRateClass = (bpm: number) => {
  if (bpm < 60 || bpm > 100) return 'text-red-600';
  return 'text-black';
};

const getBpClass = (bp: string) => {
  const [sys, dia] = bp.split('/').map(Number);
  if (sys >= 140 || dia >= 90) return 'text-red-600';
  return 'text-black';
};

const getTempClass = (temp: number) => {
  if (temp > 37.5) return 'text-red-600';
  return 'text-black';
};

const getSpo2Class = (spo2: number) => {
  if (spo2 < 95) return 'text-red-600';
  return 'text-black';
};

const getBatteryClass = (level: number) => {
  if (level <= 20) return 'text-red-600';
  if (level <= 50) return 'text-amber-600';
  return 'text-green-600';
};

const BiometricCard: React.FC<{ 
  label: string; 
  value: string | number; 
  unit?: string; 
  icon: React.ElementType; 
  color: string;
  status?: string; 
}> = ({ label, value, unit, icon: Icon, color, status }) => (
  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-[13px] text-black mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-[15px] text-black">{value}</span>
        {unit && <span className="text-[13px] text-black">{unit}</span>}
      </div>
      {status && <p className="text-[13px] text-black mt-1">{status}</p>}
    </div>
    <div className={`p-1.5 rounded-md ${color}`}>
      <Icon size={16} />
    </div>
  </div>
);

const InfoItem: React.FC<{ icon: React.ElementType; label: string; value: string | number }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
    <div className="text-black">
      <Icon size={16} />
    </div>
    <div>
      <p className="text-[13px] text-black">{label}</p>
      <p className="text-[15px] text-black">{value}</p>
    </div>
  </div>
);

const ToggleStatus: React.FC<{ label: string; checked: boolean; onToggle: () => void }> = ({ label, checked, onToggle }) => (
  <div 
    className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 cursor-pointer"
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
  >
    <span className="text-[15px] text-black">{label}</span>
    <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors duration-200 ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 shadow-sm ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
    </div>
  </div>
);

const StatCard: React.FC<{ title: string; value: string | number; subValue?: string; icon: React.ElementType; colorClass: string }> = ({ title, value, subValue, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
    <div className="flex items-start justify-between mb-2">
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
         <Icon size={18} className={colorClass.replace('bg-', 'text-')} />
      </div>
      {subValue && <span className="text-[12px] text-black">{subValue}</span>}
    </div>
    <h4 className="text-black text-[12px] mb-1">{title}</h4>
    <p className="text-[18px] text-black">{value}</p>
  </div>
);

export const Members: React.FC = () => {
  const [membersList, setMembersList] = useState<Member[]>(MOCK_MEMBERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'realtime' | 'stats'>('realtime');
  const [riskAnalysis, setRiskAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Editing State
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Member>>({});
  const [newPassword, setNewPassword] = useState('');

  const filteredMembers = membersList.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone.includes(searchTerm)
  );

  // Calculate Pagination
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const currentMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleRowClick = (member: Member) => {
    setSelectedMember(member);
    setEditForm(member);
    setIsEditingInfo(false);
    setIsEditingHealth(false);
    setNewPassword('');
    setActiveTab('realtime');
    setRiskAnalysis(null);
  };

  const handleAnalyze = async (e: React.MouseEvent, member: Member) => {
    e.stopPropagation();
    setSelectedMember(member);
    setEditForm(member);
    setActiveTab('realtime');
    setIsAnalyzing(true);
    setRiskAnalysis(null);
    const result = await analyzeMemberRisk(member);
    setRiskAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleDisconnectDevice = () => {
    if (!selectedMember) return;
    if (window.confirm(`${selectedMember.name} 님의 기기(${selectedMember.connectedDevice?.modelName}) 연동을 해제하시겠습니까?`)) {
      const updatedMember: Member = { 
        ...selectedMember, 
        connectedDevice: null, 
        deviceBattery: 0,
        status: '비활성' // Assuming disconnecting device might set status to inactive or just remove device
      };
      
      setMembersList(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
      setSelectedMember(updatedMember);
    }
  };

  const handleInfoSave = () => {
    if (selectedMember && editForm) {
       const updated = { ...selectedMember, ...editForm } as Member;
       setMembersList(prev => prev.map(m => m.id === updated.id ? updated : m));
       setSelectedMember(updated);
       setIsEditingInfo(false);
       setNewPassword(''); // Reset password field after save
    }
  };

  const handleHealthSave = () => {
    if (selectedMember && editForm) {
       const updated = { ...selectedMember, ...editForm } as Member;
       setMembersList(prev => prev.map(m => m.id === updated.id ? updated : m));
       setSelectedMember(updated);
       setIsEditingHealth(false);
    }
  };

  const handleSettingToggle = (key: keyof MemberSettings) => {
    if (!selectedMember) return;
    
    // Only toggle boolean values
    const currentValue = selectedMember.appSettings[key];
    if (typeof currentValue === 'boolean') {
        const updatedMember = {
            ...selectedMember,
            appSettings: {
                ...selectedMember.appSettings,
                [key]: !currentValue
            }
        };
        setMembersList(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
        setSelectedMember(updatedMember);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Left List Section */}
      <div className={`flex-1 flex flex-col p-8 transition-all duration-300 ${selectedMember ? 'w-1/2' : 'w-full'}`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl text-black">회원 관리</h2>
            <p className="text-black">등록된 회원 및 기기 상태 모니터링</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
              <input 
                type="text" 
                placeholder="이름, 이메일, 전화번호 검색..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to page 1 on search
                }}
                className="bg-white border border-slate-300 text-black pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-72 shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1 flex flex-col shadow-sm">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-200">
                  <th className="p-4 text-[13px] text-black uppercase whitespace-nowrap">이름 / 연락처</th>
                  <th className="p-4 text-[13px] text-black uppercase whitespace-nowrap">상태</th>
                  <th className="p-4 text-[13px] text-black uppercase whitespace-nowrap">심박수</th>
                  <th className="p-4 text-[13px] text-black uppercase whitespace-nowrap">혈압</th>
                  <th className="p-4 text-[13px] text-black uppercase whitespace-nowrap">체온</th>
                  <th className="p-4 text-[13px] text-black uppercase whitespace-nowrap">산소포화도</th>
                  <th className="p-4 text-[13px] text-black uppercase whitespace-nowrap">배터리</th>
                  <th className="p-4 text-[13px] text-black uppercase text-right whitespace-nowrap">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentMembers.map((member) => (
                  <tr 
                    key={member.id} 
                    onClick={() => handleRowClick(member)}
                    className={`cursor-pointer transition-colors group ${
                      selectedMember?.id === member.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm text-black ${
                          selectedMember?.id === member.id ? 'bg-blue-200' : 'bg-slate-100'
                        }`}>
                          {member.name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <span className="text-[15px] text-black whitespace-nowrap">{member.name}</span>
                             <span className="text-[13px] text-slate-500">{member.phone}</span>
                          </div>
                          <p className="text-[13px] text-slate-400 mt-0.5">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[13px] border whitespace-nowrap ${
                        member.status === '위험' ? 'bg-red-50 text-red-600 border-red-200' :
                        member.status === '비활성' ? 'bg-slate-100 text-black border-slate-200' :
                        'bg-green-50 text-green-600 border-green-200'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="p-4">
                       <span className={`text-[15px] ${getHeartRateClass(member.biometrics.heartRate)}`}>
                         {member.biometrics.heartRate > 0 ? `${member.biometrics.heartRate} bpm` : '-'}
                       </span>
                    </td>
                    <td className="p-4">
                       <span className={`text-[15px] ${getBpClass(member.biometrics.bloodPressure)}`}>
                         {member.biometrics.bloodPressure}
                       </span>
                    </td>
                    <td className="p-4">
                       <span className={`text-[15px] ${getTempClass(member.biometrics.temperature)}`}>
                         {member.biometrics.temperature}°C
                       </span>
                    </td>
                    <td className="p-4">
                       <span className={`text-[15px] ${getSpo2Class(member.biometrics.bloodOxygen)}`}>
                         {member.biometrics.bloodOxygen}%
                       </span>
                    </td>
                    <td className="p-4">
                      {member.connectedDevice ? (
                        <div className={`flex items-center gap-2 text-[15px] ${getBatteryClass(member.deviceBattery)}`}>
                          <Battery size={18} className={getBatteryClass(member.deviceBattery)} />
                          {member.deviceBattery}%
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[13px]">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={(e) => handleAnalyze(e, member)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                        title="AI 분석">
                        <Activity size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
                {currentMembers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-light text-[14px]">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
             <div className="text-[13px] text-slate-500 font-light">
               총 <span className="text-black font-normal">{filteredMembers.length}</span>명 중 <span className="text-black font-normal">{filteredMembers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> - <span className="text-black font-normal">{Math.min(currentPage * itemsPerPage, filteredMembers.length)}</span>명 표시
             </div>
             <div className="flex items-center gap-1">
               <button 
                 onClick={() => handlePageChange(currentPage - 1)}
                 disabled={currentPage === 1}
                 className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
               >
                 <ChevronLeft size={14} />
               </button>
               {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                 <button
                   key={page}
                   onClick={() => handlePageChange(page)}
                   className={`w-8 h-8 flex items-center justify-center rounded border text-[13px] transition-colors ${
                     currentPage === page 
                       ? 'bg-blue-600 border-blue-600 text-white' 
                       : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                   }`}
                 >
                   {page}
                 </button>
               ))}
               <button 
                 onClick={() => handlePageChange(currentPage + 1)}
                 disabled={currentPage === totalPages || totalPages === 0}
                 className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
               >
                 <ChevronRight size={14} />
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* Right Detail Panel */}
      {selectedMember && (
        <div className="w-[580px] bg-white border-l border-slate-200 h-full flex flex-col shadow-xl animate-slide-in-right z-20">
          <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-20">
            <div>
              <h3 className="text-[21px] text-black flex items-center gap-2">
                {selectedMember.name}
              </h3>
              <p className="text-black text-[15px] mt-1">{selectedMember.email}</p>
            </div>
            <button 
              onClick={() => setSelectedMember(null)}
              className="p-1 hover:bg-slate-100 rounded-full text-black hover:text-slate-600"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
             <button 
               onClick={() => setActiveTab('realtime')}
               className={`flex-1 py-3 text-[15px] transition-colors ${activeTab === 'realtime' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-black hover:text-slate-700'}`}
             >
               실시간 정보
             </button>
             <button 
               onClick={() => setActiveTab('stats')}
               className={`flex-1 py-3 text-[15px] transition-colors ${activeTab === 'stats' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-black hover:text-slate-700'}`}
             >
               AI 통계
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {activeTab === 'realtime' ? (
              <div className="space-y-6">
                
                {/* 1. Biometrics (Moved to Top) */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[15px] text-black uppercase tracking-wider">실시간 생체 데이터</h4>
                    <span className="text-[13px] text-green-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      수신 중
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <BiometricCard label="심박수" value={selectedMember.biometrics.heartRate} unit="bpm" icon={Heart} color="bg-red-100 text-red-500" />
                    <BiometricCard label="혈압" value={selectedMember.biometrics.bloodPressure} unit="mmHg" icon={ActivitySquare} color="bg-blue-100 text-blue-500" />
                    <BiometricCard label="혈중 산소" value={selectedMember.biometrics.bloodOxygen} unit="%" icon={Wind} color="bg-cyan-100 text-cyan-500" />
                    <BiometricCard label="체온" value={selectedMember.biometrics.temperature} unit="°C" icon={Thermometer} color="bg-orange-100 text-orange-500" />
                    <BiometricCard label="수면" value={selectedMember.biometrics.sleep} unit="시간" icon={Moon} color="bg-indigo-100 text-indigo-500" />
                    <BiometricCard label="혈당" value={selectedMember.biometrics.bloodGlucose} unit="mg/dL" icon={Droplets} color="bg-pink-100 text-pink-500" />
                    <BiometricCard label="스트레스" value={selectedMember.biometrics.stress} unit="/100" icon={Brain} color="bg-purple-100 text-purple-500" />
                    <BiometricCard label="심박변이도" value={selectedMember.biometrics.hrv} unit="ms" icon={Activity} color="bg-teal-100 text-teal-500" />
                    <BiometricCard label="심전도" value={selectedMember.biometrics.ecg} icon={ActivitySquare} color="bg-emerald-100 text-emerald-500" />
                    <BiometricCard label="자이로" value={selectedMember.biometrics.gyroscope} icon={Move} color="bg-slate-100 text-black" />
                  </div>
                </div>

                {/* 2. Connected Device Card */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 relative overflow-hidden">
                   {selectedMember.connectedDevice ? (
                     <>
                       <div className="absolute right-0 top-0 p-4 opacity-5">
                          <Watch size={120} />
                       </div>
                       <div className="relative z-10">
                         <div className="flex justify-between items-start mb-2">
                           <div>
                             <h4 className="text-[13px] text-blue-600 uppercase tracking-wider mb-2">Connected Device</h4>
                             <h3 className="text-[19px] text-black mb-1">{selectedMember.connectedDevice.modelName}</h3>
                             <p className="text-[13px] text-black mb-4">Serial: {selectedMember.connectedDevice.serialNumber}</p>
                           </div>
                           <button 
                              onClick={handleDisconnectDevice}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-[13px] hover:bg-red-50 transition-colors shadow-sm z-20"
                            >
                              <Unlink size={14} />
                              <span className="font-light">연동 해제</span>
                           </button>
                         </div>
                         
                         <div className="flex gap-4">
                           <div className="bg-white/60 p-2 rounded-lg backdrop-blur-sm border border-slate-100">
                              <p className="text-[11px] text-black mb-0.5">Last Sync</p>
                              <p className="text-[13px] text-black">{selectedMember.connectedDevice.lastSyncTime}</p>
                           </div>
                           <div className="bg-white/60 p-2 rounded-lg backdrop-blur-sm border border-slate-100">
                              <p className="text-[11px] text-black mb-0.5">Signal</p>
                              <p className="text-[13px] text-green-600 flex items-center gap-1">
                                <Wifi size={10} /> {selectedMember.connectedDevice.signalQuality}
                              </p>
                           </div>
                           <div className="bg-white/60 p-2 rounded-lg backdrop-blur-sm border border-slate-100">
                              <p className="text-[11px] text-black mb-0.5">Battery</p>
                              <p className="text-[13px] text-black flex items-center gap-1">
                                <Battery size={10} /> {selectedMember.connectedDevice.batteryEfficiency}
                              </p>
                           </div>
                         </div>
                       </div>
                     </>
                   ) : (
                     <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <Watch size={48} className="mb-3 opacity-20" />
                        <p className="text-[15px] text-slate-500 font-light">연동된 기기가 없습니다.</p>
                        <button className="mt-3 text-[13px] text-blue-600 hover:underline flex items-center gap-1 font-light">
                          <Link size={14} /> 새 기기 등록
                        </button>
                     </div>
                   )}
                </div>

                {/* 3. Basic Info & App Settings */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Editable Personal Info */}
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative">
                     <div className="flex justify-between items-start mb-3">
                       <h4 className="text-[13px] text-black uppercase tracking-wider flex items-center gap-1">
                         <User size={14} /> 신상 정보
                       </h4>
                       {!isEditingInfo ? (
                         <button onClick={() => setIsEditingInfo(true)} className="p-1 text-black hover:text-blue-600 transition-colors">
                           <Pencil size={12} />
                         </button>
                       ) : (
                         <div className="flex gap-1">
                           <button onClick={handleInfoSave} className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100">
                             <Check size={12} />
                           </button>
                           <button onClick={() => setIsEditingInfo(false)} className="p-1 bg-red-50 text-red-500 rounded hover:bg-red-100">
                             <X size={12} />
                           </button>
                         </div>
                       )}
                     </div>
                     
                     {isEditingInfo ? (
                       <div className="space-y-2">
                         <div>
                            <label className="text-[11px] text-black">이메일</label>
                            <input 
                              type="text" 
                              value={editForm.email} 
                              onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                              className="w-full border border-slate-300 rounded px-2 py-1 text-[15px] focus:border-blue-500 outline-none bg-white text-black" 
                            />
                         </div>
                         <div>
                            <label className="text-[11px] text-black">생년월일</label>
                            <input 
                              type="text" 
                              value={editForm.birthDate} 
                              onChange={(e) => setEditForm({...editForm, birthDate: e.target.value})}
                              className="w-full border border-slate-300 rounded px-2 py-1 text-[15px] focus:border-blue-500 outline-none bg-white text-black" 
                            />
                         </div>
                         <div className="flex gap-2">
                            <div className="flex-1">
                               <label className="text-[11px] text-black">신장 (cm)</label>
                               <input 
                                 type="number" 
                                 value={editForm.height} 
                                 onChange={(e) => setEditForm({...editForm, height: Number(e.target.value)})}
                                 className="w-full border border-slate-300 rounded px-2 py-1 text-[15px] focus:border-blue-500 outline-none bg-white text-black" 
                               />
                            </div>
                            <div className="flex-1">
                               <label className="text-[11px] text-black">체중 (kg)</label>
                               <input 
                                 type="number" 
                                 value={editForm.weight} 
                                 onChange={(e) => setEditForm({...editForm, weight: Number(e.target.value)})}
                                 className="w-full border border-slate-300 rounded px-2 py-1 text-[15px] focus:border-blue-500 outline-none bg-white text-black" 
                               />
                            </div>
                         </div>
                         <div>
                            <label className="text-[11px] text-black">혈액형</label>
                            <input 
                              type="text" 
                              value={editForm.bloodType} 
                              onChange={(e) => setEditForm({...editForm, bloodType: e.target.value})}
                              className="w-full border border-slate-300 rounded px-2 py-1 text-[15px] focus:border-blue-500 outline-none bg-white text-black" 
                            />
                         </div>
                         <div className="pt-3 border-t border-slate-100 mt-2">
                            <label className="text-[13px] text-black flex items-center gap-1 mb-1">
                              <Lock size={12} /> 비밀번호 변경
                            </label>
                            <input 
                              type="password" 
                              placeholder="새 비밀번호 입력"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full border border-slate-300 rounded px-2 py-1.5 text-[15px] focus:border-blue-500 outline-none bg-white text-black" 
                            />
                         </div>
                       </div>
                     ) : (
                       <div className="space-y-1">
                         <InfoItem icon={Mail} label="이메일" value={selectedMember.email} />
                         <InfoItem icon={Calendar} label="생년월일" value={selectedMember.birthDate} />
                         <InfoItem icon={Ruler} label="신장" value={`${selectedMember.height}cm`} />
                         <InfoItem icon={Weight} label="체중" value={`${selectedMember.weight}kg`} />
                         <InfoItem icon={Droplets} label="혈액형" value={selectedMember.bloodType} />
                         <InfoItem icon={Lock} label="비밀번호" value="••••••••" />
                       </div>
                     )}
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                     <h4 className="text-[13px] text-black uppercase tracking-wider mb-3 flex items-center gap-1">
                       <Shield size={14} /> 앱 설정 상태
                     </h4>
                     <div className="space-y-0.5">
                       <ToggleStatus 
                         label="자동 리포트" 
                         checked={selectedMember.appSettings.autoReportEnabled} 
                         onToggle={() => handleSettingToggle('autoReportEnabled')}
                       />
                       <ToggleStatus 
                         label="위치 수집" 
                         checked={selectedMember.appSettings.locationCollectionEnabled} 
                         onToggle={() => handleSettingToggle('locationCollectionEnabled')}
                       />
                       <ToggleStatus 
                         label="건강 분석" 
                         checked={selectedMember.appSettings.healthAnalysisEnabled} 
                         onToggle={() => handleSettingToggle('healthAnalysisEnabled')}
                       />
                       <div className="flex justify-between items-center py-2">
                         <span className="text-[15px] text-black">전송 주기</span>
                         <span className="text-[13px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{selectedMember.appSettings.transmissionInterval}</span>
                       </div>
                     </div>
                  </div>
                </div>

                {/* 4. Medical Info */}
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <h4 className="text-[15px] text-black uppercase tracking-wider">건강 메모</h4>
                    {!isEditingHealth ? (
                       <button onClick={() => setIsEditingHealth(true)} className="text-[13px] text-black hover:text-blue-600 flex items-center gap-1">
                         <Pencil size={12} /> 수정
                       </button>
                    ) : (
                       <div className="flex gap-2">
                         <button onClick={handleHealthSave} className="text-[13px] bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 flex items-center gap-1">
                           <Save size={12} /> 저장
                         </button>
                         <button onClick={() => setIsEditingHealth(false)} className="text-[13px] bg-slate-200 text-black px-2 py-1 rounded hover:bg-slate-300">
                           취소
                         </button>
                       </div>
                    )}
                  </div>
                  
                  {isEditingHealth ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                       <div>
                          <label className="text-[13px] text-black block mb-1">기저 질환 (쉼표로 구분)</label>
                          <textarea 
                            value={editForm.medicalConditions?.join(', ')} 
                            onChange={(e) => setEditForm({...editForm, medicalConditions: e.target.value.split(',').map(s => s.trim())})}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[15px] focus:border-blue-500 outline-none resize-none h-20 bg-white text-black"
                          />
                       </div>
                       <div>
                          <label className="text-[13px] text-black block mb-1">복용 중인 약물</label>
                          <input 
                            type="text"
                            value={editForm.medications} 
                            onChange={(e) => setEditForm({...editForm, medications: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[15px] focus:border-blue-500 outline-none bg-white text-black"
                          />
                       </div>
                       <div>
                          <label className="text-[13px] text-black block mb-1">알레르기</label>
                          <input 
                            type="text"
                            value={editForm.allergies} 
                            onChange={(e) => setEditForm({...editForm, allergies: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[15px] focus:border-blue-500 outline-none bg-white text-black"
                          />
                       </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                       <div className="p-3 flex items-start gap-3">
                          <Activity className="text-blue-500 mt-0.5" size={16} />
                          <div>
                            <span className="text-[13px] text-black block">기저 질환</span>
                            <span className="text-[15px] text-black">
                              {selectedMember.medicalConditions.length > 0 ? selectedMember.medicalConditions.join(', ') : '없음'}
                            </span>
                          </div>
                       </div>
                       <div className="p-3 flex items-start gap-3">
                          <Pill className="text-green-500 mt-0.5" size={16} />
                          <div>
                            <span className="text-[13px] text-black block">복용 중인 약물</span>
                            <span className="text-[15px] text-black">{selectedMember.medications}</span>
                          </div>
                       </div>
                       <div className="p-3 flex items-start gap-3">
                          <AlertCircle className="text-amber-500 mt-0.5" size={16} />
                          <div>
                            <span className="text-[13px] text-black block">알레르기</span>
                            <span className="text-[15px] text-black">{selectedMember.allergies}</span>
                          </div>
                       </div>
                    </div>
                  )}
                </div>

                {/* AI Analysis */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                   <div className="flex justify-between items-center mb-3">
                     <h4 className="text-[15px] text-black flex items-center gap-2">
                       <Zap size={16} className="text-yellow-500" />
                       AI 건강 리포트
                     </h4>
                     {!riskAnalysis && (
                       <button 
                         onClick={(e) => handleAnalyze(e, selectedMember)}
                         disabled={isAnalyzing}
                         className="text-[13px] bg-white border border-slate-200 px-3 py-1 rounded-md text-black hover:bg-slate-50 disabled:opacity-50"
                       >
                         {isAnalyzing ? '분석 중...' : '지금 분석하기'}
                       </button>
                     )}
                   </div>
                   {riskAnalysis ? (
                     <div className="text-[15px] text-black whitespace-pre-line leading-relaxed">
                       {riskAnalysis}
                     </div>
                   ) : (
                     <p className="text-[13px] text-black text-center py-4">
                       '지금 분석하기'를 눌러 전체 데이터를 기반으로 한 AI 분석을 받아보세요.
                     </p>
                   )}
                </div>
              </div>
            ) : selectedMember.healthStats ? (
              <div className="space-y-6">
                
                {/* 1. Core Health Metrics (Chart + Cards) */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                       <h3 className="text-[18px] text-black">AI 분석 지표</h3>
                       <p className="text-[12px] text-black">지난 7일간의 건강 데이터 분석</p>
                    </div>
                    <div className="bg-blue-50 px-3 py-1 rounded-lg">
                       <span className="text-[12px] text-blue-600">평균 심박수 {selectedMember.healthStats.averageHeartRate} BPM</span>
                    </div>
                  </div>

                  {/* Heart Rate Chart */}
                  <div className="h-48 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedMember.healthStats.heartRateHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#000000'}} axisLine={false} tickLine={false} />
                        <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          itemStyle={{ color: '#ef4444' }}
                        />
                        <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill:'#ef4444'}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Metric Cards Grid */}
                  <div className="grid grid-cols-2 gap-3">
                     <StatCard title="평균 혈압" value={selectedMember.healthStats.averageBloodPressure} icon={Activity} colorClass="bg-red-500" subValue="정상" />
                     <StatCard title="평균 SPO2" value={`${selectedMember.healthStats.averageSPO2}%`} icon={Wind} colorClass="bg-blue-500" subValue={`최저 ${selectedMember.healthStats.minSPO2}%`} />
                     <StatCard title="평균 체온" value={`${selectedMember.healthStats.averageTemperature}°C`} icon={Thermometer} colorClass="bg-orange-500" subValue="발열 0회" />
                     {/* Health Score Card */}
                     <div className="bg-indigo-600 rounded-xl p-4 text-white shadow-md flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                           <TrendingUp size={18} className="text-indigo-200" />
                           <span className="text-[12px] text-indigo-200">건강 점수</span>
                        </div>
                        <div>
                           <span className="text-[30px]">{selectedMember.healthStats.healthScore}</span>
                           <span className="text-[14px] text-indigo-200 ml-1">점</span>
                        </div>
                     </div>
                  </div>
                </div>

                {/* 2. Activity & Sleep */}
                <div className="grid grid-cols-1 gap-4">
                   {/* Steps Chart */}
                   <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                         <h4 className="text-[14px] text-black flex items-center gap-2">
                            <Move size={16} className="text-green-500" /> 활동 및 수면
                         </h4>
                         <span className="text-[12px] text-green-600">목표 달성률 {selectedMember.healthStats.stepGoalAchievement}%</span>
                      </div>
                      <div className="h-32 w-full mb-4">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={selectedMember.healthStats.stepsHistory}>
                               <XAxis dataKey="name" tick={{fontSize: 10, fill: '#000000'}} axisLine={false} tickLine={false} />
                               <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px'}} />
                               <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                         <div className="bg-slate-50 p-2 rounded-lg text-center">
                            <p className="text-[12px] text-black">수면</p>
                            <p className="text-[14px] text-black">{selectedMember.healthStats.averageSleep}h</p>
                            <span className="text-[10px] text-blue-500">{selectedMember.healthStats.sleepQuality}</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded-lg text-center">
                            <p className="text-[12px] text-black">스트레스</p>
                            <p className="text-[14px] text-black">{selectedMember.healthStats.averageStress}</p>
                            <span className="text-[10px] text-green-500">낮음</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded-lg text-center">
                            <p className="text-[12px] text-black">소모 칼로리</p>
                            <p className="text-[14px] text-black">{selectedMember.healthStats.caloriesBurned}</p>
                            <span className="text-[10px] text-orange-500">kcal</span>
                         </div>
                      </div>
                   </div>
                </div>

                {/* 3. Incident History Summary */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                   <h4 className="text-[14px] text-black mb-4 flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-500" /> 응급 상황 이력 (최근 30일)
                   </h4>
                   <div className="flex items-end gap-2 mb-4">
                      <span className="text-[36px] text-black">{selectedMember.healthStats.incidentSummary.total}</span>
                      <span className="text-[14px] text-black mb-1.5">회 발생</span>
                   </div>
                   
                   <div className="space-y-3">
                      <div className="flex items-center justify-between text-[14px]">
                         <span className="text-black">낙상 감지</span>
                         <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400" style={{width: `${(selectedMember.healthStats.incidentSummary.fall / 5) * 100}%`}}></div>
                         </div>
                         <span className="text-black">{selectedMember.healthStats.incidentSummary.fall}</span>
                      </div>
                      <div className="flex items-center justify-between text-[14px]">
                         <span className="text-black">심박 이상</span>
                         <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400" style={{width: `${(selectedMember.healthStats.incidentSummary.arrhythmia / 5) * 100}%`}}></div>
                         </div>
                         <span className="text-black">{selectedMember.healthStats.incidentSummary.arrhythmia}</span>
                      </div>
                      <div className="flex items-center justify-between text-[14px]">
                         <span className="text-black">산소 저하</span>
                         <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400" style={{width: `${(selectedMember.healthStats.incidentSummary.lowOxygen / 5) * 100}%`}}></div>
                         </div>
                         <span className="text-black">{selectedMember.healthStats.incidentSummary.lowOxygen}</span>
                      </div>
                   </div>
                   <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                      <span className="text-[12px] text-black">평균 응답 시간</span>
                      <span className="text-[12px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{selectedMember.healthStats.incidentSummary.avgResponseTime}</span>
                   </div>
                </div>

                {/* 4. Weekly Prediction */}
                <div className="bg-slate-900 rounded-xl p-5 shadow-lg text-white">
                   <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-yellow-500/20 rounded-lg">
                         <Sparkles size={16} className="text-yellow-400" />
                      </div>
                      <h4 className="text-[14px]">주간 AI 건강 예측</h4>
                   </div>
                   <p className="text-[14px] text-slate-300 leading-relaxed">
                      {selectedMember.healthStats.weeklyPrediction}
                   </p>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-black">
                <p>해당 회원의 건강 통계 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};