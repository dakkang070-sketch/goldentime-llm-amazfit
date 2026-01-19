
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
    <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-48 p-2.5 bg-zinc-900/98 border border-zinc-700 text-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-[100] backdrop-blur-xl">
      <p className="text-[11px] leading-relaxed font-normal text-zinc-200">
        <span className="block font-normal mb-1 text-white uppercase tracking-widest text-[10px] border-b border-zinc-700 pb-1">{label} Info</span>
        {description}
      </p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-700"></div>
    </div>

    <div className="bg-black/40 py-1.5 px-2.5 rounded-xl border border-zinc-900/50 flex items-center justify-between group-hover:border-zinc-700 transition-colors cursor-help relative z-10">
       <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-3.5 h-3.5 ${color} opacity-80 shrink-0`} />
          <p className="text-[11px] text-zinc-400 font-normal uppercase tracking-tighter truncate">{label}</p>
       </div>
       <div className="flex items-baseline gap-0.5 ml-2">
          <span className="text-[14px] font-normal text-white font-mono">{value ?? '--'}</span>
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

  // 백엔드 데이터 로드
  const initializedRef = useRef(false);
  
  const fetchData = async () => {
    try {
      addLog('백엔드 데이터 로드 시도...');
      
      // 응급 케이스 조회
      const casesResponse = await apiService.getEmergencyCases({
        status: 'all',
      });
      
      if (casesResponse.success && casesResponse.data) {
        const casesList = casesResponse.data.cases || casesResponse.data || [];
        const transformedPatients = casesList.map(transformEmergencyCaseToPatient);
        addLog(`백엔드에서 환자 데이터 ${transformedPatients.length}개 로드`);
        
        // 생체 데이터 및 LLM 분석 추가
        const patientsWithData = await Promise.all(
          transformedPatients.map(async (patient) => {
            try {
              // 생체 데이터 가져오기
              const biometricResponse = await apiService.getBiometricData(patient.id);
              if (biometricResponse.success && biometricResponse.data) {
                const biometricData = biometricResponse.data;
                const history = biometricData.history || [];
                const latestBiometric = biometricData.latest || biometricData;
                
                const vitals = transformBiometricToVitals(latestBiometric, history);
                patient.vitals = {
                  ...patient.vitals,
                  ...vitals,
                  heartRate: latestBiometric?.heartRate || patient.vitals.heartRate,
                  oxygenLevel: Math.max(85, 100 - Math.floor((latestBiometric?.stressLevel || 0) / 2)) || patient.vitals.oxygenLevel,
                  bodyTemp: latestBiometric?.bodyTemperature || patient.vitals.bodyTemp,
                  lastUpdated: latestBiometric?.collectedAt || patient.vitals.lastUpdated,
                };
              }
              
              // LLM 분석 추가 (백엔드에 이미 있으면 사용, 없으면 새로 분석)
              if (patient.aiAnalysis && patient.llmModel) {
                // 백엔드에서 이미 분석된 데이터 사용
                return patient;
              } else {
                // 새로 분석 수행
                try {
                  const analysisResult = await analyzePatientData(patient);
                  return {
                    ...patient,
                    aiAnalysis: analysisResult.analysisSummary || patient.aiAnalysis,
                    severityScore: analysisResult.severityScore || patient.severityScore,
                    llmModel: 'gemini-3-flash-preview'
                  };
                } catch (error) {
                  console.error(`환자 ${patient.id} LLM 분석 실패:`, error);
                  return patient;
                }
              }
            } catch (error) {
              console.error(`환자 ${patient.id} 데이터 로드 실패:`, error);
              return patient;
            }
          })
        );
        
        setPatients(patientsWithData);
        if (patientsWithData.length > 0 && !selectedPatient) {
          setSelectedPatient(patientsWithData[0]);
        }
        addLog(`백엔드에서 환자 ${patientsWithData.length}명 로드 완료 (생체데이터 포함)`);
      }

      // 병원 조회
      const hospitalsResponse = await apiService.getHospitals();
      if (hospitalsResponse.success && hospitalsResponse.data) {
        const hospitalsList = hospitalsResponse.data.hospitals || hospitalsResponse.data || [];
        const transformedHospitals = hospitalsList.map(transformHospitalToFrontend);
        setHospitals(transformedHospitals);
        addLog(`백엔드에서 병원 ${transformedHospitals.length}개 로드 완료`);
      }

      // 응급구조사 조회
      const paramedicsResponse = await apiService.getParamedics();
      if (paramedicsResponse.success && paramedicsResponse.data) {
        const paramedicsList = paramedicsResponse.data.paramedics || paramedicsResponse.data || [];
        const transformedAmbulances = paramedicsList.map(transformParamedicToAmbulance);
        setAmbulances(transformedAmbulances);
        addLog(`백엔드에서 구급차 ${transformedAmbulances.length}대 로드 완료`);
      }
    } catch (error) {
      console.warn('백엔드 연결 실패 - 기본 데이터 사용:', error);
      addLog('백엔드 연결 실패 - 기본 데이터 사용');
    }
  };

  // 초기화
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    console.log('새로운 Google AI Studio Build 대시보드 초기화');
    addLog('Google AI Studio Build 대시보드 시작');
    addLog(`기본 데이터 로드: 환자 ${INITIAL_PATIENTS.length}명, 병원 ${INITIAL_HOSPITALS.length}개, 구급차 ${INITIAL_AMBULANCES.length}대`);
    
    // 백엔드 연결 시도
    const token = apiService.getToken();
    if (token) {
      socketService.connect(token);
      
      const socket = socketService.getSocket();
      if (socket) {
        socket.on('case_created', (newCase: any) => {
          const newPatient = transformEmergencyCaseToPatient(newCase);
          setPatients(prev => [newPatient, ...prev]);
          addLog(`새 응급 상황 감지: ${newPatient.name}`);
        });

        socket.on('case_updated', (updateData: any) => {
          setPatients(prev => prev.map(p => 
            p.id === updateData.caseId ? { ...p, ...updateData.updates } : p
          ));
          addLog(`케이스 업데이트: ${updateData.caseId}`);
        });
      }
    }
    
    // 백엔드 데이터 로드 시도 (실패해도 기본 데이터 사용)
    fetchData().catch(err => {
      console.warn('백엔드 연결 실패:', err);
      addLog('백엔드 연결 실패 - 기본 데이터로 시작');
    });

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('case_created');
        socket.off('case_updated');
      }
    };
  }, []);

  const toggleHospitalExpand = (id: string) => {
    setExpandedHospitalIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRematchHospital = async (patientId: string) => {
    if (rematchingIds.has(patientId)) return;
    setRematchingIds(prev => new Set(prev).add(patientId));
    addLog(`System: Requesting new hospital match for ${patientId}...`);

    await new Promise(resolve => setTimeout(resolve, 1500));

    setPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        const otherHospitals = hospitals.filter(h => h.id !== p.recommendedHospitalId && h.isEROpen && h.erBeds.available > 0);
        const newHospital = otherHospitals.length > 0 
          ? otherHospitals[Math.floor(Math.random() * otherHospitals.length)]
          : hospitals[Math.floor(Math.random() * hospitals.length)];
        
        addLog(`System: Re-matched to ${newHospital.name}`);
        return { ...p, recommendedHospitalId: newHospital.id };
      }
      return p;
    }));
    
    setRematchingIds(prev => {
      const next = new Set(prev);
      next.delete(patientId);
      return next;
    });
  };

  const generateNewEmergency = useCallback(() => {
    const names = ['최지우', '박준서', '정다은', '한상우', '강현우', '윤서아', '임재혁', '송미나', '조현진', '배수지'];
    const id = `p${Date.now()}`;
    const patientName = names[Math.floor(names.length * Math.random())];
    
    const locations = [
      { name: '강남구 강남대로 396', lat: 37.4979, lng: 127.0276 },
      { name: '종로구 종로 129', lat: 37.5704, lng: 126.9922 },
      { name: '마포구 양화로 160', lat: 37.5575, lng: 126.9245 },
      { name: '송파구 올림픽로 300', lat: 37.5126, lng: 127.1025 },
      { name: '서대문구 연세로 13', lat: 37.5585, lng: 126.9372 }
    ];
    
    const loc = locations[Math.floor(Math.random() * locations.length)];

    const newPatient: Patient = {
      id,
      name: patientName,
      age: 20 + Math.floor(Math.random() * 60),
      birthDate: '19XX-XX-XX',
      bloodType: ['A+', 'B+', 'O+', 'AB-'][Math.floor(Math.random() * 4)],
      imageUrl: `https://i.pravatar.cc/150?u=${id}`,
      gender: Math.random() > 0.5 ? 'M' : 'F',
      status: PatientStatus.CRITICAL,
      location: loc.name,
      lat: loc.lat + (Math.random() - 0.5) * 0.005,
      lng: loc.lng + (Math.random() - 0.5) * 0.005,
      symptoms: ['심박 변이 감지', '충격 감지'],
      vitals: {
        heartRate: 95 + Math.floor(Math.random() * 60),
        bloodPressure: '150/100',
        oxygenLevel: 85 + Math.floor(Math.random() * 15),
        bodyTemp: 36.5 + (Math.random() * 2.5),
        lastUpdated: new Date().toISOString(),
        history: Array.from({ length: 15 }, (_, i) => ({
          time: new Date(Date.now() - (15 - i) * 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          hr: 90 + Math.floor(Math.random() * 30),
          spo2: 90 + Math.floor(Math.random() * 5)
        })),
        ecgPattern: 'Normal',
        fallDetected: Math.random() > 0.8,
        activityContext: 'Walking',
        bloodGlucose: 100 + Math.floor(Math.random() * 80),
        hrv: 20 + Math.floor(Math.random() * 40),
        restingHR: 60 + Math.floor(Math.random() * 15),
        pai: Math.floor(Math.random() * 100),
        stressLevel: Math.floor(Math.random() * 100),
        calories: 100 + Math.floor(Math.random() * 200),
        steps: 1000 + Math.floor(Math.random() * 5000),
        acc: { x: Math.random(), y: Math.random(), z: Math.random() },
        gyro: { x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 10 },
        networkStatus: 'Connected',
        positioningStatus: 'Locked'
      }
    };

    setPatients(prev => [newPatient, ...prev]);
    addLog(`Emergency Triggered: ${patientName}`);
    setSelectedPatient(newPatient);
  }, []);

  useEffect(() => {
    const moveInterval = setInterval(() => {
      setAmbulances(currentAmbs => {
        let changed = false;
        const nextAmbs = currentAmbs.map(amb => {
          if (amb.path && amb.path.length > 0) {
            const currentIdx = amb.pathStep || 0;
            const nextIdx = currentIdx + 2; 
            
            if (nextIdx < amb.path.length) {
              changed = true;
              const newActivity = nextIdx > amb.path.length / 2 
                ? 'transporting_to_hospital' 
                : 'heading_to_patient';

              return {
                ...amb,
                lat: amb.path[nextIdx][0],
                lng: amb.path[nextIdx][1],
                pathStep: nextIdx,
                activity: newActivity as any
              };
            } else {
              if (amb.status === AmbulanceStatus.DISPATCHED) {
                 addLog(`Completed: ${amb.unitName} at ER.`);
                 return { ...amb, status: AmbulanceStatus.BUSY, path: undefined, pathStep: 0, activity: undefined };
              }
            }
          }
          return amb;
        });
        return changed ? nextAmbs : currentAmbs;
      });
    }, 400);
    return () => clearInterval(moveInterval);
  }, []);

  useEffect(() => {
    const vitalsInterval = setInterval(() => {
      setPatients(prev => prev.map(p => {
        const hrDelta = (Math.random() - 0.5) * 4;
        const spo2Delta = (Math.random() - 0.5) * 1;
        const newHr = Math.max(60, Math.min(180, p.vitals.heartRate + hrDelta));
        const newSpo2 = Math.max(85, Math.min(100, p.vitals.oxygenLevel + spo2Delta));
        return {
          ...p,
          vitals: {
            ...p.vitals,
            heartRate: Math.round(newHr),
            oxygenLevel: Math.round(newSpo2),
            bloodGlucose: p.vitals.bloodGlucose ? p.vitals.bloodGlucose + (Math.random() - 0.5) * 2 : 110,
            stressLevel: Math.max(0, Math.min(100, (p.vitals.stressLevel || 50) + (Math.random() - 0.5) * 5)),
            lastUpdated: new Date().toISOString(),
            acc: { x: Math.random(), y: Math.random(), z: Math.random() },
            gyro: { x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 10 },
            history: [...p.vitals.history, { 
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
              hr: Math.round(newHr), 
              spo2: Math.round(newSpo2) 
            }].slice(-30)
          }
        };
      }));
    }, 4000);
    return () => clearInterval(vitalsInterval);
  }, []);

  const processMatching = useCallback(async (patient: Patient) => {
    if (!isAiMatchingEnabled || processingIds.has(patient.id) || patient.aiAnalysis) return;
    setProcessingIds(prev => new Set(prev).add(patient.id));
    
    try {
      addLog(`AI Analysis Starting for: ${patient.name}`);
      const result: TriageResult = await analyzePatientData(patient);
      const availableHospitals = hospitals.filter(h => h.isEROpen && h.erBeds.available > 0);
      const recommendedHospital = availableHospitals.length > 0 
        ? availableHospitals[Math.floor(Math.random() * availableHospitals.length)]
        : hospitals[0];

      const availableAmbs = ambulances.filter(a => a.status === AmbulanceStatus.AVAILABLE);
      let matchedAmb = availableAmbs.length > 0 ? availableAmbs[0] : null;

      if (matchedAmb) {
        const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${matchedAmb.lng},${matchedAmb.lat};${patient.lng},${patient.lat};${recommendedHospital.lng},${recommendedHospital.lat}?overview=full&geometries=geojson`);
        const routeData = await routeRes.json();
        
        let pathCoords: [number, number][] = [];
        if (routeData.routes && routeData.routes[0]) {
          pathCoords = routeData.routes[0].geometry.coordinates.map((coord: any) => [coord[1], coord[0]]);
        }

        setPatients(prev => prev.map(p => p.id === patient.id ? {
          ...p,
          aiAnalysis: result.analysisSummary,
          severityScore: result.severityScore,
          recommendedHospitalId: recommendedHospital.id,
          matchedAmbulanceId: matchedAmb?.id
        } : p));

        setAmbulances(prev => prev.map(amb => amb.id === matchedAmb!.id ? { 
          ...amb, 
          status: AmbulanceStatus.DISPATCHED,
          path: pathCoords,
          pathStep: 0,
          activity: 'heading_to_patient',
          targetPatientId: patient.id,
          targetHospitalId: recommendedHospital.id
        } : amb));

        addLog(`AI Dispatch: ${matchedAmb.unitName} -> ${patient.name} -> ${recommendedHospital.name}`);
      }
    } catch (e) {
      addLog(`Match Error: Retrying AI Neural Link...`);
    } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(patient.id); return next; });
    }
  }, [hospitals, ambulances, processingIds, isAiMatchingEnabled]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
       const unassigned = patients.find(p => !p.aiAnalysis && !processingIds.has(p.id));
       if (unassigned) processMatching(unassigned);
    }
  }, [patients, processingIds, processMatching, activeTab]);

  useEffect(() => {
    if (selectedPatient && !selectedPatient.aiAnalysis && !processingIds.has(selectedPatient.id)) {
      processMatching(selectedPatient);
    }
  }, [selectedPatient?.id, processMatching]);

  const filteredPatients = useMemo(() => patients.filter(p => p.name.includes(searchTerm) || p.location.includes(searchTerm)), [patients, searchTerm]);
  
  const tabFilteredPatients = useMemo(() => {
    switch (patientListTab) {
      case 'matched': return filteredPatients.filter(p => !!p.matchedAmbulanceId);
      case 'unmatched': return filteredPatients.filter(p => !p.matchedAmbulanceId);
      default: return filteredPatients;
    }
  }, [filteredPatients, patientListTab]);

  const currentSelectedPatient = useMemo(() => patients.find(p => p.id === selectedPatient?.id) || selectedPatient, [patients, selectedPatient]);
  const currentAmbulance = useMemo(() => ambulances.find(a => a.id === currentSelectedPatient?.matchedAmbulanceId), [ambulances, currentSelectedPatient]);
  const matchedHospital = useMemo(() => hospitals.find(h => h.id === currentSelectedPatient?.recommendedHospitalId), [hospitals, currentSelectedPatient]);

  const renderDashboard = () => (
    <div className="h-full flex flex-col lg:flex-row gap-4 overflow-hidden">
      <div className="w-full lg:w-[13%] flex flex-col bg-zinc-950/40 rounded-2xl border border-zinc-900 overflow-hidden shadow-2xl shrink-0">
        <div className="p-1 border-b border-zinc-900 bg-zinc-900/10 shrink-0 flex flex-col">
          <div className="flex border-b border-zinc-900/50">
             {[
               { id: 'all', label: '전체', count: filteredPatients.length },
               { id: 'matched', label: '완료', count: filteredPatients.filter(p => !!p.matchedAmbulanceId).length },
               { id: 'unmatched', label: '대기', count: filteredPatients.filter(p => !p.matchedAmbulanceId).length }
             ].map(tab => (
               <button 
                key={tab.id}
                onClick={() => setPatientListTab(tab.id as any)}
                className={`flex-1 py-2 text-[12px] font-normal transition-all relative flex flex-col items-center gap-0.5 ${patientListTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
               >
                 <span>{tab.label}</span>
                 <span className={`text-[11px] font-mono leading-none px-1 rounded-sm ${patientListTab === tab.id ? 'text-red-500' : 'text-zinc-600'}`}>{tab.count}</span>
                 {patientListTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>}
               </button>
             ))}
          </div>
          <div className="flex items-center justify-between px-3 py-1.5">
            <h3 className="text-[11px] font-normal uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> FEED
            </h3>
            <button onClick={generateNewEmergency} className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-all group" title="새 응급 환자 생성">
               <Zap className="w-3.5 h-3.5 group-active:scale-90" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {tabFilteredPatients.length > 0 ? tabFilteredPatients.map(p => (
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
            <button onClick={generateNewEmergency} className="mt-6 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[14px] font-normal uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all">
              <Zap className="w-4.5 h-4.5" /> Simulate Emergency
            </button>
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
                       {currentSelectedPatient.vitals.fallDetected && (
                         <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center">
                           <AlertTriangle className="text-white w-4 h-4 animate-bounce" />
                         </div>
                       )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <h2 className="text-[17px] font-normal text-white tracking-tighter truncate leading-none">{currentSelectedPatient.name}</h2>
                          <div className="flex gap-1 shrink-0">
                            <div title="네트워크 상태" className={`p-1 rounded bg-black/40 border border-zinc-800/50 flex items-center justify-center ${currentSelectedPatient.vitals.networkStatus === 'Connected' ? 'text-green-500' : 'text-red-500'}`}>
                              <Wifi className="w-4 h-4" />
                            </div>
                            <div title="GPS 상태" className={`p-1 rounded bg-black/40 border border-zinc-800/50 flex items-center justify-center ${currentSelectedPatient.vitals.positioningStatus === 'Locked' ? 'text-blue-500' : 'text-orange-500'}`}>
                              <LocateFixed className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                        {/* 수동매칭 버튼 (빨간색 테마로 변경 및 로직 적용) */}
                        <button 
                          onClick={() => processMatching(currentSelectedPatient)}
                          disabled={!!currentSelectedPatient.matchedAmbulanceId || processingIds.has(currentSelectedPatient.id)}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-normal uppercase tracking-tight flex items-center gap-1.5 transition-all ${
                            currentSelectedPatient.matchedAmbulanceId 
                            ? 'bg-zinc-800/50 border-zinc-700 text-zinc-500 cursor-not-allowed opacity-50' 
                            : 'bg-red-600/20 border-red-500/40 text-red-400 hover:bg-red-600/30 active:scale-95 shadow-[0_4px_10px_rgba(220,38,38,0.15)]'
                          }`}
                        >
                          {processingIds.has(currentSelectedPatient.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                          수동매칭
                        </button>
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

              <div 
                className="bg-zinc-900/20 rounded-2xl border border-zinc-800/80 overflow-hidden shrink-0 transition-all duration-300 ease-in-out"
                onMouseEnter={() => setIsVitalsExpanded(true)}
                onMouseLeave={() => setIsVitalsExpanded(false)}
              >
                <div className="p-2 flex items-center justify-between">
                  <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-red-600" /> BIO STREAM
                  </h3>
                  <div className="p-1">
                    {isVitalsExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                  </div>
                </div>
                <div className="px-2 pb-2 grid grid-cols-2 gap-2">
                  <div className="bg-black/40 p-1.5 rounded-xl border border-zinc-900">
                    <p className="text-[11px] text-zinc-300 font-normal uppercase text-center">BPM</p>
                    <p className="text-[17px] font-normal text-red-600 font-mono text-center tracking-tighter">{currentSelectedPatient.vitals.heartRate}</p>
                  </div>
                  <div className="bg-black/40 p-1.5 rounded-xl border border-zinc-900">
                    <p className="text-[11px] text-zinc-300 font-normal uppercase text-center">SpO2</p>
                    <p className="text-[17px] font-normal text-blue-600 font-mono text-center tracking-tighter">{currentSelectedPatient.vitals.oxygenLevel}%</p>
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
                <div className="grid grid-cols-2 gap-1 overflow-visible">
                   <BioMetricCard label="BG" value={Math.round(currentSelectedPatient.vitals.bloodGlucose || 0)} icon={Droplets} color="text-yellow-500" description="혈당 수치 (mg/dL)" />
                   <BioMetricCard label="HRV" value={currentSelectedPatient.vitals.hrv} unit="ms" icon={Wind} color="text-teal-500" description="심박 변이도 (ms)" />
                   <BioMetricCard label="RHR" value={currentSelectedPatient.vitals.restingHR} icon={Activity} color="text-zinc-500" description="안정 시 심박수" />
                   <BioMetricCard label="Stress" value={Math.round(currentSelectedPatient.vitals.stressLevel || 0)} icon={Cpu} color="text-purple-500" description="스트레스 지수" />
                </div>
              </div>

              {/* Neural Diag */}
              <div className="bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/80 flex-1 flex flex-col min-h-0 mb-1">
                <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <BrainCircuit className="w-3.5 h-3.5 text-purple-600" /> NEURAL DIAG
                </h3>
                <div className="p-2 bg-black/40 rounded-xl border border-zinc-900 shadow-inner overflow-y-auto custom-scrollbar flex-1">
                   <p className="text-[13px] text-zinc-200 leading-normal font-diag-common">
                     {currentSelectedPatient.aiAnalysis ? `"${currentSelectedPatient.aiAnalysis}"` : "분석 대기 중..."}
                   </p>
                </div>
              </div>
            </div>

            {/* Facility Match (Bottom Fixed) */}
            <div className="p-2 pt-0 shrink-0 bg-transparent border-t border-zinc-900/50">
              <div className="bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/80">
                <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <HospitalIcon className="w-3.5 h-3.5 text-blue-400" /> FACILITY MATCH
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
                           <span className={`text-[13px] font-mono ${matchedHospital.erBeds.available > 0 ? 'text-green-500' : 'text-red-500'}`}>{matchedHospital.erBeds.available}/{matchedHospital.erBeds.total}</span>
                        </div>
                        <div className="bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-900 flex flex-col items-center">
                           <span className="text-[9px] text-zinc-500 uppercase font-normal tracking-widest">DIST</span>
                           <span className="text-[13px] font-mono text-zinc-200">{matchedHospital.distance}</span>
                        </div>
                     </div>
                     <button onClick={() => handleRematchHospital(currentSelectedPatient.id)} disabled={rematchingIds.has(currentSelectedPatient.id)} className="w-full py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[12px] font-normal uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                        {rematchingIds.has(currentSelectedPatient.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        {rematchingIds.has(currentSelectedPatient.id) ? '분석 중...' : '이송병원 분석요청'}
                     </button>
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

  const renderAdminView = () => (
    <div className="flex-1 overflow-y-auto p-7 space-y-7 custom-scrollbar max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {[
          { label: 'Total Cases', value: patients.length, icon: AlertTriangle, color: 'text-red-500' },
          { label: 'Active Dispatch', value: ambulances.filter(a => a.status === AmbulanceStatus.DISPATCHED).length, icon: Siren, color: 'text-blue-500' },
          { label: 'Hospital Load', value: `${Math.round(hospitals.reduce((acc, h) => acc + (h.erBeds.total - h.erBeds.available), 0) / hospitals.reduce((acc, h) => acc + h.erBeds.total, 0) * 100)}%`, icon: BarChart, color: 'text-orange-500' },
          { label: 'Neural Capacity', value: 'Optimal', icon: BrainCircuit, color: 'text-purple-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-2xl shadow-xl">
             <div className="flex items-center gap-3.5 mb-3.5">
                <stat.icon className={`w-5.5 h-5.5 ${stat.color}`} />
                <h4 className="text-[14px] font-normal text-zinc-300 uppercase tracking-widest">{stat.label}</h4>
             </div>
             <p className="text-[28px] font-normal text-white">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
           <div className="p-4.5 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-[14px] font-normal text-zinc-200 uppercase tracking-widest flex items-center gap-2.5">
                 <Terminal className="w-5.5 h-5.5 text-red-600" /> SYSTEM OPERATION LOG
              </h3>
              <button onClick={() => setSystemLogs([])} className="text-[13px] font-normal text-zinc-300 hover:text-white uppercase transition-colors">Clear Log</button>
           </div>
           <div className="p-4.5 h-96 overflow-y-auto custom-scrollbar font-mono text-[14px] space-y-2.5 bg-[#050505]">
              {systemLogs.length > 0 ? systemLogs.map(log => (
                <div key={log.id} className="flex gap-4.5 border-b border-zinc-900/30 pb-2 last:border-0">
                  <span className="text-zinc-500 shrink-0">[{log.time}]</span>
                  <span className="text-zinc-300 leading-tight">{log.text}</span>
                </div>
              )) : (
                <div className="h-full flex items-center justify-center text-zinc-600 font-normal uppercase tracking-widest italic">Terminal Standby...</div>
              )}
           </div>
        </div>
        <div className="space-y-5">
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl">
            <h4 className="text-[13px] font-normal text-zinc-300 uppercase tracking-widest mb-4.5">Quick Actions</h4>
            <div className="space-y-3.5">
              <button onClick={generateNewEmergency} className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[14px] font-normal uppercase tracking-widest flex items-center justify-center gap-3.5 transition-all active:scale-95">
                 <Zap className="w-5.5 h-5.5" /> Trigger New Alert
              </button>
              <button className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-[14px] font-normal uppercase tracking-widest flex items-center justify-center gap-3.5 transition-all">
                 <Server className="w-5.5 h-5.5" /> Reset Node Sync
              </button>
            </div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl">
            <h4 className="text-[13px] font-normal text-zinc-300 uppercase tracking-widest mb-4.5">Node Health</h4>
            <div className="space-y-2.5">
              {[
                { name: 'Seoul Center', status: 'Online', load: '12%' },
                { name: 'Emergency Dispatch', status: 'Online', load: '05%' },
                { name: 'Gemini Neural Link', status: 'Optimal', load: '02%' }
              ].map((node, i) => (
                <div key={i} className="flex items-center justify-between text-[14px] p-2.5 bg-black/20 rounded-lg">
                  <span className="text-zinc-300 font-normal">{node.name}</span>
                  <div className="flex items-center gap-3.5">
                    <span className="text-green-500 font-normal">{node.status}</span>
                    <span className="text-zinc-400">{node.load}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
              { id: 'hospitals', icon: HospitalIcon, label: '병원' }, 
              { id: 'admin', icon: ShieldAlert, label: '관리자' }
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
                  <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1 rounded">GN-01</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 font-normal tracking-widest uppercase mb-0.5">Duty Operator</span>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[13px] font-normal text-zinc-200">박지성 사원</span>
                  <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1 rounded">OP-77</span>
                </div>
              </div>
            </div>

            <div className="relative shrink-0 flex-1 max-w-[240px]">
              <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="회원명 검색" 
                className="bg-zinc-900/40 border-none rounded-xl pl-11 pr-5 py-2.5 text-[13px] w-full text-white outline-none focus:ring-1 ring-red-500 transition-all" 
              />
            </div>
          </div>

          <div className="flex items-center gap-6 overflow-hidden">
             <div className="hidden xl:flex items-center gap-6 border-l border-zinc-800 pl-6 shrink-0">
                <div className="flex flex-col items-center">
                   <span className="text-[10px] text-zinc-500 uppercase font-normal tracking-tighter mb-0.5">전체차량</span>
                   <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-zinc-400 opacity-60" />
                      <span className="text-[16px] text-zinc-300 font-mono font-normal leading-none">{ambulances.length}</span>
                   </div>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-[10px] text-red-500 uppercase font-normal tracking-tighter mb-0.5">이송중</span>
                   <div className="flex items-center gap-1.5">
                      <Siren className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                      <span className="text-[16px] text-red-500 font-mono font-normal leading-none">{ambulances.filter(a => a.status === AmbulanceStatus.DISPATCHED).length}</span>
                   </div>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-[10px] text-green-500 uppercase font-normal tracking-tighter mb-0.5">대기차량</span>
                   <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-green-500 opacity-80" />
                      <span className="text-[16px] text-green-500 font-mono font-normal leading-none">{ambulances.filter(a => a.status === AmbulanceStatus.AVAILABLE).length}</span>
                   </div>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-[10px] text-zinc-600 uppercase font-normal tracking-tighter mb-0.5">불가/정비</span>
                   <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-zinc-500 opacity-60" />
                      <span className="text-[16px] text-zinc-500 font-mono font-normal leading-none">{ambulances.filter(a => a.status === AmbulanceStatus.BUSY).length}</span>
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
           {activeTab === 'patients' && (
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                 {filteredPatients.map(p => (
                   <PatientCard key={p.id} patient={p} isSelected={currentSelectedPatient?.id === p.id} isMatching={processingIds.has(p.id)} onClick={setSelectedPatient} />
                 ))}
               </div>
             </div>
           )}
           {activeTab === 'hospitals' && (
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                   {hospitals.map(h => (
                     <div key={h.id} className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-2xl flex flex-col transition-all hover:border-zinc-600 cursor-pointer" onClick={() => toggleHospitalExpand(h.id)}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${h.isEROpen ? 'bg-green-600/10 text-green-500' : 'bg-red-600/10 text-red-500'}`}>
                              <HospitalIcon className="w-7.5 h-7.5" />
                            </div>
                            <div>
                              <h3 className="text-[18px] font-normal text-white">{h.name}</h3>
                              <p className="text-[14px] text-zinc-300 uppercase tracking-widest">{h.location}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                             <span className="text-[12px] font-normal text-zinc-300 uppercase mb-1">ER BEDS</span>
                             <span className={`text-[16px] font-normal ${h.erBeds.available > 5 ? 'text-green-500' : 'text-orange-500'}`}>{h.erBeds.available}/{h.erBeds.total}</span>
                          </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           )}
           {activeTab === 'admin' && renderAdminView()}
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
