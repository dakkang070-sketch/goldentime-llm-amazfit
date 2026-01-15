import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { INITIAL_HOSPITALS, INITIAL_PATIENTS, INITIAL_AMBULANCES } from './constants';
import { Patient, Hospital, PatientStatus, TriageResult, Ambulance, AmbulanceStatus } from './types';
import { analyzePatientData } from './services/geminiService';
import { apiService } from './services/apiService';
import { socketService } from './services/socketService';
import {
  transformEmergencyCaseToPatient,
  transformBiometricToVitals,
  transformHospitalToFrontend,
  transformParamedicToAmbulance,
} from './utils/dataTransform';
import PatientCard from './components/PatientCard';
import VitalsChart from './components/VitalsChart';
import LiveMap from './components/LiveMap';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  Search, 
  Activity, 
  Hospital as HospitalIcon, 
  Users, 
  BrainCircuit,
  Monitor,
  Siren,
  Loader2,
  Cpu,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
  Droplets,
  ShieldAlert,
  CheckCircle2,
  Clock,
  BarChart,
  Server,
  Terminal,
  Wifi,
  LocateFixed,
  Wind,
  Gauge,
  Truck,
  Filter,
  UserCheck,
  Building2,
  RefreshCw,
  UserPlus
} from 'lucide-react';

const Emblem119 = ({ color = "#ef4444", className = "w-6 h-6" }) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M50 5 L90 25 L90 55 C90 75 70 90 50 95 C30 90 10 75 10 55 L10 25 L50 5Z" fill="white" stroke={color} strokeWidth="6"/>
    <path d="M50 15 L82 31 L82 55 C82 71 66 84 50 88 C34 84 18 71 18 55 L18 31 L50 15Z" fill={color}/>
    <text x="50" y="65" fontFamily="Arial, sans-serif" fontSize="29" fill="white" textAnchor="middle" fontWeight="400">119</text>
    <path d="M50 25 L55 35 L65 35 L57 42 L60 52 L50 45 L40 52 L43 42 L35 35 L45 35 Z" fill="white"/>
  </svg>
);

const BioMetricCard = memo(({ label, value, unit, icon: Icon, color = "text-zinc-400", description }: { label: string, value: string | number | undefined, unit?: string, icon: any, color?: string, description: string }) => (
  <div className="relative group">
    <div className="absolute bottom-[calc(100%+8px)] right-0 w-36 p-2 bg-zinc-900/98 border border-zinc-700 text-white rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-[100] backdrop-blur-xl">
      <p className="text-[10px] leading-relaxed font-normal text-zinc-200">
        <span className="block font-normal mb-1 text-white uppercase tracking-widest text-[9px] border-b border-zinc-700 pb-1">{label} Info</span>
        {description}
      </p>
      <div className="absolute top-full right-4 border-4 border-transparent border-t-zinc-700"></div>
    </div>

    <div className="bg-black/40 py-1.5 px-2.5 rounded-xl border border-zinc-900/50 flex items-center justify-between group-hover:border-zinc-700 transition-colors cursor-help relative z-10">
       <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-3.5 h-3.5 ${color} opacity-80 shrink-0`} />
          <p className="text-[11px] text-zinc-400 font-normal uppercase tracking-tighter truncate">{label}</p>
       </div>
       <div className="flex items-baseline gap-0.5 ml-2">
          <span className="text-[14px] font-normal text-white">{value ?? '--'}</span>
          {unit && <span className="text-[10px] text-zinc-500 font-normal uppercase">{unit}</span>}
       </div>
    </div>
  </div>
));

const App: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [hospitals, setHospitals] = useState<Hospital[]>(INITIAL_HOSPITALS);
  const [ambulances, setAmbulances] = useState<Ambulance[]>(INITIAL_AMBULANCES);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(INITIAL_PATIENTS.length > 0 ? INITIAL_PATIENTS[0] : null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [rematchingIds, setRematchingIds] = useState<Set<string>>(new Set());
  const [systemLogs, setSystemLogs] = useState<{id: string, text: string, time: string}[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'hospitals' | 'admin'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAiMatchingEnabled, setIsAiMatchingEnabled] = useState(true);
  const [expandedHospitalIds, setExpandedHospitalIds] = useState<Set<string>>(new Set());
  const [isVitalsExpanded, setIsVitalsExpanded] = useState(false);
  const [patientListTab, setPatientListTab] = useState<'all' | 'matched' | 'unmatched'>('all');

  const addLog = (text: string) => {
    setSystemLogs(prev => [{ id: Date.now().toString(), text, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 30));
  };

  // 환자 선택 시에는 분석하지 않고, 단순히 선택만 처리
  useEffect(() => {
    // AI 분석은 이미 완료된 상태여야 함
  }, [selectedPatient?.id]);

  const currentSelectedPatient = useMemo(() => patients.find(p => p.id === selectedPatient?.id) || selectedPatient, [patients, selectedPatient]);
  const currentAmbulance = useMemo(() => ambulances.find(a => a.id === currentSelectedPatient?.matchedAmbulanceId), [ambulances, currentSelectedPatient]);
  const matchedHospital = useMemo(() => hospitals.find(h => h.id === currentSelectedPatient?.recommendedHospitalId), [hospitals, currentSelectedPatient]);

  const renderDashboard = () => (
    <div className="h-full flex flex-col lg:flex-row gap-4 overflow-hidden">
      <div className="w-full lg:w-[13%] flex flex-col bg-zinc-950/40 rounded-2xl border border-zinc-900 overflow-hidden shadow-2xl shrink-0">
        <div className="p-1 border-b border-zinc-900 bg-zinc-900/10 shrink-0 flex flex-col">
          <div className="flex border-b border-zinc-900/50">
             {[
               { id: 'all', label: '전체', count: patients.length },
               { id: 'matched', label: '완료', count: patients.filter(p => !!p.matchedAmbulanceId).length },
               { id: 'unmatched', label: '대기', count: patients.filter(p => !p.matchedAmbulanceId).length }
             ].map(tab => (
               <button 
                key={tab.id}
                onClick={() => setPatientListTab(tab.id as any)}
                className={`flex-1 py-2 text-[12px] font-normal transition-all relative flex flex-col items-center gap-0.5 ${patientListTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
               >
                 <span>{tab.label}</span>
                 <span className={`text-[11px] font-normal leading-none px-1 rounded-sm ${patientListTab === tab.id ? 'text-red-500' : 'text-zinc-600'}`}>{tab.count}</span>
                 {patientListTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>}
               </button>
             ))}
          </div>
          <div className="flex items-center justify-between px-3 py-1.5">
            <h3 className="text-[11px] font-normal uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> FEED
            </h3>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {patients.length > 0 ? patients.map(p => (
               <PatientCard 
                key={p.id} 
                patient={p} 
                isSelected={currentSelectedPatient?.id === p.id} 
                isMatching={processingIds.has(p.id)} 
                onClick={setSelectedPatient} 
                ambulanceStatus={ambulances.find(a => a.id === p.matchedAmbulanceId)?.activity}
               />
          )) : (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center opacity-40">
              <CheckCircle2 className="w-4.5 h-4.5 text-zinc-700 mb-2" />
              <p className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest">Empty</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl min-w-0 z-0">
        {currentSelectedPatient ? (
          <LiveMap 
            patient={currentSelectedPatient} 
            hospital={hospitals.find(h => h.id === currentSelectedPatient.recommendedHospitalId)} 
            ambulances={ambulances} 
            matchedAmbulance={currentAmbulance} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#050505]">
            <Monitor className="w-14 h-14 text-zinc-700 opacity-30 animate-pulse" />
            <p className="mt-4 text-zinc-300 text-[14px] font-normal uppercase tracking-widest">Select Case</p>
          </div>
        )}
      </div>

      <div className="w-full lg:w-[17%] flex flex-col bg-zinc-950/40 rounded-2xl border border-zinc-900 shadow-2xl shrink-0 relative z-[30]">
        {currentSelectedPatient ? (
          <>
            <div className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar overflow-x-visible flex flex-col">
              <div className="bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-800/80 shadow-xl relative overflow-hidden shrink-0">
                 <div className="flex gap-2.5 items-start relative z-10">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 shrink-0 shadow-lg relative self-center">
                       <img src={currentSelectedPatient.imageUrl} alt={currentSelectedPatient.name} className="w-full h-full object-cover grayscale-[0.2]" />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <h2 className="text-[17px] font-normal text-white tracking-tighter truncate leading-none">{currentSelectedPatient.name}</h2>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] text-zinc-300 font-normal uppercase tracking-tight">{currentSelectedPatient.age}세 • {currentSelectedPatient.gender}</p>
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-normal border uppercase tracking-wider ${currentSelectedPatient.status === PatientStatus.CRITICAL ? 'bg-red-600/10 text-red-500 border-red-500/30' : 'bg-orange-500/10 text-orange-500 border-orange-900/40'}`}>
                          {currentSelectedPatient.status}
                        </span>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="bg-zinc-900/20 rounded-2xl border border-zinc-800/80 overflow-visible shrink-0 transition-all duration-300 ease-in-out">
                <div className="p-2 flex items-center justify-between">
                  <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-red-600" /> BIO STREAM
                  </h3>
                </div>
                <div className="px-2 pb-2 grid grid-cols-2 gap-2">
                  <div className="relative group cursor-help">
                    <div className="absolute bottom-[calc(100%+8px)] right-0 w-36 p-2 bg-zinc-900/98 border border-zinc-700 text-white rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-[100] backdrop-blur-xl">
                      <p className="text-[10px] leading-relaxed font-normal text-zinc-200">
                        <span className="block font-normal mb-1 text-white uppercase tracking-widest text-[9px] border-b border-zinc-700 pb-1">BPM Info</span>
                        실시간 심박수 (분당 박동 수)
                      </p>
                      <div className="absolute top-full right-4 border-4 border-transparent border-t-zinc-700"></div>
                    </div>
                    <div className="bg-black/40 p-1.5 rounded-xl border border-zinc-900 group-hover:border-zinc-700 transition-colors">
                      <p className="text-[11px] text-zinc-300 font-normal uppercase text-center">BPM</p>
                      <p className="text-[17px] font-normal text-red-600 text-center tracking-tighter">{currentSelectedPatient.vitals.heartRate}</p>
                    </div>
                  </div>
                  <div className="relative group cursor-help">
                    <div className="absolute bottom-[calc(100%+8px)] right-0 w-36 p-2 bg-zinc-900/98 border border-zinc-700 text-white rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-[100] backdrop-blur-xl">
                      <p className="text-[10px] leading-relaxed font-normal text-zinc-200">
                        <span className="block font-normal mb-1 text-white uppercase tracking-widest text-[9px] border-b border-zinc-700 pb-1">SPO2 Info</span>
                        혈중 산소포화도 (%)
                      </p>
                      <div className="absolute top-full right-4 border-4 border-transparent border-t-zinc-700"></div>
                    </div>
                    <div className="bg-black/40 p-1.5 rounded-xl border border-zinc-900 group-hover:border-zinc-700 transition-colors">
                      <p className="text-[11px] text-zinc-300 font-normal uppercase text-center">SpO2</p>
                      <p className="text-[17px] font-normal text-blue-600 text-center tracking-tighter">{currentSelectedPatient.vitals.oxygenLevel}%</p>
                    </div>
                  </div>
                </div>
                <div className={`px-2 pb-2 overflow-hidden transition-all duration-500 ease-in-out ${isVitalsExpanded ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <VitalsChart data={currentSelectedPatient.vitals.history} />
                </div>
              </div>

              {/* Telemetry */}
              <div className="bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/80 shrink-0 overflow-visible">
                <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-blue-500" /> TELEMETRY
                </h3>
                <div className="grid grid-cols-2 gap-1">
                   <BioMetricCard label="BG" value={Math.round(currentSelectedPatient.vitals.bloodGlucose || 0)} icon={Droplets} color="text-yellow-500" description="혈당 수치 (mg/dL)" />
                   <BioMetricCard label="HRV" value={currentSelectedPatient.vitals.hrv} unit="ms" icon={Wind} color="text-teal-500" description="심박 변이도 (ms)" />
                   <BioMetricCard label="RHR" value={currentSelectedPatient.vitals.restingHR} icon={Activity} color="text-zinc-500" description="안정 시 심박수" />
                   <BioMetricCard label="Stress" value={Math.round(currentSelectedPatient.vitals.stressLevel || 0)} icon={Cpu} color="text-purple-500" description="스트레스 지수" />
                </div>
              </div>

              {/* AI 분석 결과 */}
              <div className="bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/80 flex-1 flex flex-col min-h-0 mb-1">
                <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <BrainCircuit className="w-3.5 h-3.5 text-purple-600" /> AI분석 결과
                </h3>
                <div className="p-2 bg-black/40 rounded-xl border border-zinc-900 shadow-inner overflow-y-auto custom-scrollbar flex-1">
                   <div className="text-[12px] text-zinc-200 leading-relaxed font-normal whitespace-pre-line">
                     {currentSelectedPatient.aiAnalysis || "분석 대기 중..."}
                   </div>
                </div>
              </div>
            </div>

            {/* Facility Match (Bottom Fixed) */}
            <div className="p-2 pt-0 shrink-0 bg-transparent border-t border-zinc-900/50">
              <div className="bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/80">
                <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <HospitalIcon className="w-3.5 h-3.5 text-blue-400" /> 매칭의료센터
                </h3>
                {matchedHospital ? (
                  <div className="p-2 bg-black/40 rounded-xl border border-zinc-900 shadow-xl space-y-2">
                     <div className="flex flex-col gap-0.5">
                        <div className="flex items-start gap-2 pt-0.5">
                          <h4 className="text-[16px] font-normal text-white tracking-tight leading-none truncate flex-1">{matchedHospital.name}</h4>
                          {currentAmbulance && (
                            <div className="bg-red-600 px-3 py-1.5 rounded-full shadow-[0_4px_12px_rgba(239,68,68,0.4)] flex items-center shrink-0 border border-red-500/50 -mt-1">
                               <span className="text-[13px] font-normal text-white leading-none whitespace-nowrap tracking-tighter">{currentAmbulance.unitName}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[12px] text-zinc-400 font-normal uppercase truncate">{matchedHospital.location}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-900 flex flex-col items-center">
                           <span className="text-[9px] text-zinc-500 uppercase font-normal tracking-widest">ER BEDS</span>
                           <span className={`text-[13px] font-normal ${matchedHospital.erBeds.available > 0 ? 'text-green-500' : 'text-red-500'}`}>{matchedHospital.erBeds.available}/{matchedHospital.erBeds.total}</span>
                        </div>
                        <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-900 flex flex-col items-center">
                           <span className="text-[9px] text-zinc-500 uppercase font-normal tracking-widest">DIST</span>
                           <span className="text-[13px] font-normal text-zinc-200">{matchedHospital.distance}</span>
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="p-3 bg-black/20 rounded-xl border border-zinc-900 border-dashed flex flex-col items-center justify-center gap-1.5">
                     <Loader2 className="w-4 h-4 text-zinc-700 animate-spin" />
                     <p className="text-[11px] text-zinc-600 uppercase tracking-widest">Searching...</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-zinc-400 flex flex-col items-center justify-center h-full gap-5">
             <ShieldAlert className="w-10 h-10 opacity-30" />
             <p className="text-[12px] font-normal uppercase tracking-widest">Case Standby</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#020202] text-slate-100 font-sans">
      <aside className="w-16 lg:w-20 border-r border-zinc-800 flex flex-col bg-zinc-950/80 backdrop-blur-xl z-50 shrink-0">
        <div className="flex flex-col items-center py-6 h-full">
          <div className="mb-10 shrink-0">
            <div className="w-11 h-11 lg:w-12 lg:h-12 bg-white rounded-xl flex items-center justify-center shadow-2xl p-2 border-2 border-red-600 cursor-pointer hover:rotate-12 transition-transform" onClick={() => setActiveTab('dashboard')}>
              <Emblem119 className="w-full h-full" />
            </div>
          </div>
          <nav className="space-y-5 flex-1 w-full px-2">
            {[
              { id: 'dashboard', icon: Monitor, label: '관제' }, 
              { id: 'patients', icon: Users, label: '목록' }, 
              { id: 'hospitals', icon: HospitalIcon, label: '병원' }
            ].map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)} title={item.label} className={`w-full flex items-center justify-center p-3.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}>
                <item.icon className="w-6.5 h-6.5 shrink-0" />
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md z-40 shrink-0">
          <div className="flex items-center gap-9 min-w-0 flex-1 overflow-hidden">
            <h2 className="text-[14px] font-normal uppercase tracking-[0.4em] text-zinc-300 shrink-0">응급관제시스템 v1</h2>
            
            <div className="hidden lg:flex items-center gap-6 shrink-0 border-l border-zinc-800 pl-6 pr-6">
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 font-normal tracking-widest uppercase mb-0.5">Control Center</span>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[13px] font-normal text-zinc-200">강남 제1관제센터</span>
                  <span className="text-[10px] font-normal bg-zinc-800 text-zinc-400 px-1 rounded">GN-01</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 font-normal tracking-widest uppercase mb-0.5">Duty Operator</span>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[13px] font-normal text-zinc-200">박지성 사원</span>
                  <span className="text-[10px] font-normal bg-zinc-800 text-zinc-400 px-1 rounded">OP-77</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 overflow-hidden">
             <div className="hidden xl:flex items-center gap-6 border-l border-zinc-800 pl-6 shrink-0">
                <div className="flex flex-col items-center">
                   <span className="text-[10px] text-white uppercase font-normal tracking-tighter mb-0.5">전체차량</span>
                   <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-zinc-400 opacity-60" />
                      <span className="text-[16px] text-zinc-300 font-normal leading-none">{ambulances.length}</span>
                   </div>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-[10px] text-white uppercase font-normal tracking-tighter mb-0.5">이송중</span>
                   <div className="flex items-center gap-1.5">
                      <Siren className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                      <span className="text-[16px] text-red-500 font-normal leading-none">{ambulances.filter(a => a.status === AmbulanceStatus.DISPATCHED).length}</span>
                   </div>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-[10px] text-white uppercase font-normal tracking-tighter mb-0.5">대기차량</span>
                   <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-green-500 opacity-80" />
                      <span className="text-[16px] text-green-500 font-normal leading-none">{ambulances.filter(a => a.status === AmbulanceStatus.AVAILABLE).length}</span>
                   </div>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-[10px] text-white uppercase font-normal tracking-tighter mb-0.5">불가/정비</span>
                   <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-zinc-500 opacity-60" />
                      <span className="text-[16px] text-zinc-500 font-normal leading-none">{ambulances.filter(a => a.status === AmbulanceStatus.BUSY).length}</span>
                   </div>
                </div>
             </div>
             <div className="flex items-center gap-4 shrink-0 border-l border-zinc-800 pl-6">
                <div className={`flex px-3 py-1.5 rounded-lg border items-center gap-2.5 transition-all ${isAiMatchingEnabled ? 'bg-purple-600/10 border-purple-500/20 shadow-[0_0_10px_rgba(147,51,234,0.1)]' : 'bg-zinc-900/50 border-zinc-800'}`}>
                   <Cpu className={`w-5 h-5 ${isAiMatchingEnabled ? 'text-purple-500 animate-pulse' : 'text-zinc-600'}`} />
                   <span className={`text-[12px] font-normal uppercase ${isAiMatchingEnabled ? 'text-purple-500' : 'text-zinc-300'}`}>Neural Active</span>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] animate-pulse"></div>
             </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden p-4">
           {activeTab === 'dashboard' && renderDashboard()}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .font-diag-common { font-family: 'Inter', 'Malgun Gothic', sans-serif; font-size: 1.0rem; }
      `}</style>
    </div>
  );
};

export default App;