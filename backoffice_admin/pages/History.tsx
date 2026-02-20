import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Clock, MapPin, AlertTriangle, CheckCircle2, XCircle, ChevronRight, FileText, Activity, AlertOctagon, User, Thermometer, Wind, Watch, Battery, X, RotateCcw, Moon, Brain, Droplets, Move, ActivitySquare, Zap, Plus, Minus, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Incident } from '../types';
import { adminService } from '../services/adminService';

// Helper to calculate age from birthDate
const calculateAge = (birthDate: string) => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors = {
    '위험': 'bg-red-50 text-red-600 border-red-200',
    '주의': 'bg-amber-50 text-amber-600 border-amber-200',
    '정보': 'bg-blue-50 text-blue-600 border-blue-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[13px] border whitespace-nowrap ${colors[severity as keyof typeof colors] || 'bg-slate-50 text-black border-slate-200'}`}>
      {severity}
    </span>
  );
};

const IncidentMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(prev => Math.max(prev - 0.5, 0.5));
  };

  return (
    <div className="mt-3 bg-slate-100 rounded-lg border border-slate-200 h-32 relative overflow-hidden group/map select-none">
        {/* Map Background Pattern - Simulated zoom by scaling the background size */}
        <div className="absolute inset-0 transition-all duration-300" style={{
            backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            opacity: 0.2
        }}></div>
        
        {/* Map Center Marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform -mt-4 transition-transform duration-300" style={{ transform: `translate(-50%, -50%) scale(${0.8 + (zoom * 0.1)})` }}>
            <div className="relative flex flex-col items-center">
                <MapPin size={32} className="text-blue-600 drop-shadow-md relative z-10" fill="currentColor" />
                <div className="w-3 h-1.5 bg-black/20 rounded-full blur-[1px] mt-[-2px]"></div>
                <div className="w-8 h-8 bg-blue-500/20 rounded-full animate-ping absolute top-2"></div>
            </div>
        </div>

        {/* Coordinates Label */}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[11px] text-slate-600 border border-slate-200 font-mono shadow-sm flex items-center gap-1.5 z-10">
            <MapPin size={10} />
            {lat.toFixed(5)}, {lng.toFixed(5)}
        </div>
        
        {/* Map Controls */}
        <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
            <button 
                onClick={handleZoomIn}
                className="w-6 h-6 bg-white rounded border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm cursor-pointer hover:bg-slate-50 hover:text-black active:bg-slate-100 transition-colors"
                title="Zoom In"
            >
                <Plus size={14} />
            </button>
            <button 
                onClick={handleZoomOut}
                className="w-6 h-6 bg-white rounded border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm cursor-pointer hover:bg-slate-50 hover:text-black active:bg-slate-100 transition-colors"
                title="Zoom Out"
            >
                <Minus size={14} />
            </button>
        </div>
    </div>
  );
};

export const History: React.FC = () => {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Accordion State
  const [expandedIncidentIds, setExpandedIncidentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await adminService.getMembers();
        setMembers(data);
        if (data.length > 0 && !selectedMemberId) {
          setSelectedMemberId(data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch members", error);
      }
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    const fetchIncidents = async () => {
      if (!selectedMemberId) {
        setIncidents([]);
        return;
      }
      
      try {
        const data = await adminService.getAlerts({ 
          userId: selectedMemberId,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        });
        setIncidents(data);
      } catch (error) {
        console.error("Failed to fetch incidents", error);
      }
    };
    
    fetchIncidents();
  }, [selectedMemberId, startDate, endDate]);

  const toggleAnalysis = (id: string) => {
    const newSet = new Set(expandedIncidentIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIncidentIds(newSet);
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone.includes(searchTerm) ||
    (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedMember = members.find(m => m.id === selectedMemberId);

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setIsFilterOpen(false);
  };

  const isFilterActive = startDate !== '' || endDate !== '';

  // Helper to render biometric item
  const BiometricItem = ({ icon: Icon, color, label, value, unit }: { icon: any, color: string, label: string, value: string | number, unit?: string }) => (
    <div className="bg-slate-50 p-2 rounded-lg flex flex-col items-center justify-center h-[72px]">
      <div className={`flex items-center gap-1 ${color} mb-1`}>
        <Icon size={12} />
        <span className="text-[11px] text-slate-500 whitespace-nowrap">{label}</span>
      </div>
      <span className="text-[14px] text-black font-light whitespace-nowrap">
        {value} {unit && <span className="text-[11px] font-light text-slate-500">{unit}</span>}
      </span>
    </div>
  );

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Left Panel: Member List */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col z-10">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-[21px] text-black mb-1">AI 응급 이력</h2>
          <p className="text-[14px] text-black">회원별 응급 기록 조회</p>
          
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={16} />
            <input 
              type="text" 
              placeholder="이름, 이메일, 전화번호 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-black pl-9 pr-4 py-2 rounded-lg text-[14px] focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredMembers.map(member => (
            <div 
              key={member.id}
              onClick={() => setSelectedMemberId(member.id)}
              className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${
                selectedMemberId === member.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[15px] text-black">{member.name}</span>
                <span className="text-[13px] text-black">{member.lastActive || '-'}</span>
              </div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                 <span className="text-[13px] text-black">ID: {member.id.substring(0, 8)}...</span>
                 <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                 <span className="text-[13px] text-slate-500">{member.phone}</span>
                 <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                 <span className="text-[13px] text-black">{member.address}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[13px] px-2 py-0.5 rounded-full ${
                  member.riskLevel === '고위험' ? 'bg-red-50 text-red-600' : 
                  member.riskLevel === '중위험' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                }`}>
                  {member.riskLevel}
                </span>
                <span className="text-[13px] text-black flex items-center gap-1">
                  <AlertOctagon size={12} />
                  {member.healthStats?.incidentSummary?.total || 0}건
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Timeline */}
      <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden">
        {selectedMember ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 bg-white border-b border-slate-200 shadow-sm flex justify-between items-center relative z-20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-black">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-xl text-black">{selectedMember.name} 의 응급 이력</h2>
                  <p className="text-[15px] text-black">
                    {isFilterActive 
                      ? `선택된 기간 내 ${incidents.length}건의 기록이 있습니다.` 
                      : `총 ${incidents.length}건의 응급 기록이 있습니다.`}
                  </p>
                </div>
              </div>
              
              {/* Date Filter Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all text-[14px] ${
                    isFilterActive 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                      : 'bg-white border-slate-300 text-black hover:bg-slate-50'
                  }`}
                >
                  <Filter size={16} /> 
                  {isFilterActive ? '기간 필터 적용됨' : '기간 설정'}
                </button>

                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-5 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[15px] font-light text-black">조회 기간 설정</h3>
                        <button onClick={() => setIsFilterOpen(false)} className="text-slate-400 hover:text-black">
                          <X size={16} />
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-[13px] text-slate-500 mb-1.5 block">시작일</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="date" 
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-10 pr-3 text-[14px] text-black focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[13px] text-slate-500 mb-1.5 block">종료일</label>
                          <div className="relative">
                             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                             <input 
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-10 pr-3 text-[14px] text-black focus:outline-none focus:border-blue-500"
                              />
                          </div>
                        </div>
                        
                        <div className="pt-3 border-t border-slate-100 flex gap-2">
                           <button 
                             onClick={handleResetFilter}
                             className="flex-1 py-2 text-[14px] text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1 transition-colors"
                           >
                             <RotateCcw size={14} /> 초기화
                           </button>
                           <button 
                             onClick={() => setIsFilterOpen(false)}
                             className="flex-1 py-2 text-[14px] text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                           >
                             적용하기
                           </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Timeline Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-6xl mx-auto relative">
                {/* Vertical Line */}
                <div className="absolute left-32 top-0 bottom-0 w-px bg-slate-200"></div>

                <div className="space-y-8">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="relative flex gap-6 group">
                      {/* Date/Time Column */}
                      <div className="w-32 flex-shrink-0 text-right pt-4 pr-6">
                         <div className="text-[15px] text-black">{incident.timestamp.split(' ')[0]}</div>
                         <div className="text-[13px] text-black">{incident.timestamp.split(' ')[1]}</div>
                      </div>

                      {/* Timeline Dot */}
                      <div className="absolute left-32 -translate-x-1/2 top-5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 
                        bg-slate-400 group-hover:scale-110 transition-transform"></div>
                      
                      {/* Content Card (Horizontal Layout) */}
                      <div className="flex-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col xl:flex-row gap-6">
                          {/* LEFT COLUMN: Context & Analysis */}
                          <div className="flex-1 flex flex-col justify-between min-w-0">
                             <div>
                               <div className="flex justify-between items-start mb-3">
                                 <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                                    <div className={`p-2 rounded-lg shrink-0 ${
                                      incident.type === '낙상 감지' ? 'bg-red-50 text-red-500' :
                                      incident.type === '심박 이상' ? 'bg-pink-50 text-pink-500' :
                                      incident.type === 'SOS 호출' ? 'bg-orange-50 text-orange-500' :
                                      'bg-blue-50 text-blue-500'
                                    }`}>
                                      {incident.type === '심박 이상' ? <Activity size={20} /> : 
                                       incident.type === '낙상 감지' ? <AlertTriangle size={20} /> : <AlertOctagon size={20} />}
                                    </div>
                                    <div className="min-w-0">
                                      <h3 className="text-black text-[17px] font-medium whitespace-nowrap">{incident.type}</h3>
                                      <p className="text-[13px] text-slate-600 break-keep leading-snug">{incident.location.address}</p>
                                    </div>
                                 </div>
                                 <div className="shrink-0 mt-1">
                                   <SeverityBadge severity={incident.severity} />
                                 </div>
                               </div>

                               {/* Map Visualization */}
                               <IncidentMap lat={incident.location.lat} lng={incident.location.lng} />

                               {/* AI Analysis Accordion */}
                               {incident.aiAnalysis && (
                                  <div className="mt-4 border-t border-slate-100 pt-3">
                                    <button 
                                      onClick={() => toggleAnalysis(incident.id)}
                                      className="flex items-center justify-between w-full text-left group/btn hover:bg-slate-50 p-2 rounded-lg transition-colors"
                                    >
                                      <div className="flex items-center gap-2 text-[14px] font-medium text-slate-700">
                                         <Sparkles size={16} className="text-purple-500" />
                                         <span>AI 상황 분석 Report</span>
                                      </div>
                                      {expandedIncidentIds.has(incident.id) ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </button>

                                    {expandedIncidentIds.has(incident.id) && (
                                      <div className="mt-2 bg-slate-50 p-4 rounded-lg border border-slate-200 animate-in slide-in-from-top-2">
                                         <div className="flex gap-3">
                                           <div className="mt-0.5 text-slate-500"><FileText size={16} /></div>
                                           <div className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-line">
                                             {incident.aiAnalysis}
                                           </div>
                                         </div>
                                      </div>
                                    )}
                                  </div>
                               )}
                             </div>

                             <div className="mt-4 pt-3 flex items-center gap-6 text-[13px] border-t border-slate-50 xl:border-0 xl:mt-0 xl:pt-4">
                                <span className="flex items-center gap-1.5 text-black">
                                  <Activity size={14} className="text-slate-400" /> 신뢰도 {incident.aiConfidence}%
                                </span>
                                <span className="flex items-center gap-1.5 text-black">
                                  <CheckCircle2 size={14} className={incident.status === '완료' ? 'text-green-500' : 'text-slate-400'} /> 
                                  {incident.status}
                                </span>
                             </div>
                          </div>

                          {/* RIGHT COLUMN: Data Snapshot */}
                          <div className="xl:w-[520px] xl:border-l xl:border-slate-100 xl:pl-6 flex flex-col justify-center border-t border-slate-100 pt-5 xl:pt-0 xl:border-t-0">
                             <p className="text-[12px] text-slate-500 mb-2 font-light flex items-center gap-1">
                               <Clock size={12} /> 사고 시점 데이터 스냅샷
                             </p>
                             <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                                <BiometricItem icon={Activity} color="text-red-500" label="심박수" value={incident.biometricsSnapshot?.heartRate || incident.heartRate || '-'} unit="bpm" />
                                <BiometricItem icon={Activity} color="text-blue-500" label="혈압" value={incident.biometricsSnapshot?.bloodPressure || '-'} />
                                <BiometricItem icon={Wind} color="text-cyan-500" label="산소포화도" value={incident.biometricsSnapshot?.bloodOxygen || '-'} unit="%" />
                                <BiometricItem icon={Thermometer} color="text-orange-500" label="체온" value={incident.biometricsSnapshot?.temperature || '-'} unit="°C" />
                                <BiometricItem icon={Moon} color="text-indigo-500" label="수면" value={incident.biometricsSnapshot?.sleep || '-'} unit="시간" />
                                <BiometricItem icon={Droplets} color="text-pink-500" label="혈당" value={incident.biometricsSnapshot?.bloodGlucose || '-'} unit="mg/dL" />
                                <BiometricItem icon={Brain} color="text-purple-500" label="스트레스" value={incident.biometricsSnapshot?.stress || '-'} />
                                <BiometricItem icon={Zap} color="text-teal-500" label="심박변이도" value={incident.biometricsSnapshot?.hrv || '-'} unit="ms" />
                                <BiometricItem icon={ActivitySquare} color="text-emerald-500" label="심전도" value={incident.biometricsSnapshot?.ecg || '-'} />
                                <BiometricItem icon={Move} color="text-slate-500" label="자이로" value={incident.biometricsSnapshot?.gyroscope || '-'} />
                             </div>
                             
                             {/* Device Snapshot Info */}
                             {incident.deviceSnapshot && (
                               <div className="mt-3 bg-slate-50 px-4 py-3 rounded-lg border border-slate-100 flex items-center justify-between text-[13px]">
                                  <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2 text-black font-medium" title="Model Number">
                                       <Watch size={14} className="text-slate-400" />
                                       {incident.deviceSnapshot.modelNumber || 'SMX-UG1'}
                                    </div>
                                    <div className="text-slate-600" title="Manufacturer">
                                       {incident.deviceSnapshot.manufacturer || 'STARMAX'}
                                    </div>
                                    <div className="text-slate-500 font-mono text-[12px]" title="Firmware">
                                       v{incident.deviceSnapshot.firmwareVersion || '2.1.0'}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5">
                                     <Battery size={14} className={incident.deviceSnapshot.batteryLevel <= 20 ? 'text-red-500' : 'text-green-500'} />
                                     <span className={incident.deviceSnapshot.batteryLevel <= 20 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                                       {incident.deviceSnapshot.batteryLevel}%
                                     </span>
                                  </div>
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {incidents.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-lg border border-slate-100 mt-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-300">
                         <Filter size={20} />
                      </div>
                      <p className="text-black font-light">검색 결과가 없습니다.</p>
                      <p className="text-[13px] text-slate-500 mt-1">
                         {isFilterActive ? "선택하신 기간 내 사고 기록이 존재하지 않습니다." : "해당 회원의 사고 이력이 없습니다."}
                      </p>
                      {isFilterActive && (
                        <button onClick={handleResetFilter} className="mt-3 text-[13px] text-blue-600 hover:underline">
                          필터 초기화
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-black">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Search size={32} className="text-slate-300" />
            </div>
            <p className="text-lg text-black">회원을 선택해주세요</p>
            <p className="text-[15px]">좌측 목록에서 이력을 조회할 회원을 선택하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}