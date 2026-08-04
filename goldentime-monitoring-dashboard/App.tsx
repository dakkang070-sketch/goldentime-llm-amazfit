
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Monitor,
  Heart,
  ChevronDown,
  AlertTriangle,
  Wifi,
  WifiOff,
  Brain,
  GitPullRequest,
  Hospital,
  Scale,
  Tag,
  ShieldCheck,
  MessageSquare,
  MapPin,
  Users,
  Navigation,
  Bell,
  Share2,
  Database
} from 'lucide-react';
import { INITIAL_SYSTEM_CARDS, INITIAL_KPIS } from './constants';
import { StatusCard } from './components/StatusCard';
import { ChartsPanel } from './components/ChartsPanel';
import { DetailModal } from './components/DetailModal';
import { StatusCardProps, SystemStatus } from './types';
import {
  useRealtimeMonitoring,
  SystemEngine,
  ShadowConsistencyResponse,
  systemMonitoringService,
} from './services/systemMonitoringService';

/**
 * App 관련 처리를 수행합니다.
 */
const App: React.FC = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('ko-KR'));
  const [selectedCard, setSelectedCard] = useState<StatusCardProps | null>(null);
  const [shadowConsistency, setShadowConsistency] = useState<ShadowConsistencyResponse | null>(null);
  
  // 실시간 데이터 모니터링
  const { 
    overview, 
    engines, 
    performance, 
    alerts, 
    loading, 
    error, 
    connectionStatus 
  } = useRealtimeMonitoring();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('ko-KR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 엔진 데이터를 StatusCard 형식으로 변환
  const convertEngineToStatusCard = (engine: SystemEngine): StatusCardProps => {
    // 상태 매핑
    let status: SystemStatus;
    switch (engine.status) {
      case 'ACTIVE':
      case 'CONNECTED':
      case 'MONITORING':
      case 'TRACKING':
        status = SystemStatus.OPERATIONAL;
        break;
      case 'DISABLED':
        status = SystemStatus.WARNING;
        break;
      case 'DISCONNECTED':
      case 'ERROR':
        status = SystemStatus.CRITICAL;
        break;
      default:
        status = SystemStatus.PROCESSING;
    }

    // 아이콘 매핑 (기존 INITIAL_SYSTEM_CARDS와 동일하게)
    const iconMap: Record<string, React.ReactNode> = {
      'biosignal_engine': <Activity className="w-5 h-5" />,
      'auto_learning': <Brain className="w-5 h-5" />,
      'emergency_workflow': <GitPullRequest className="w-5 h-5" />,
      'hospital_matching': <Hospital className="w-5 h-5" />,
      'medical_weighting': <Scale className="w-5 h-5" />,
      'data_labeling': <Tag className="w-5 h-5" />,
      'quality_management': <ShieldCheck className="w-5 h-5" />,
      'feedback_system': <MessageSquare className="w-5 h-5" />,
      'realtime_tracking': <MapPin className="w-5 h-5" />,
      'resource_management': <Users className="w-5 h-5" />,
      'route_optimization': <Navigation className="w-5 h-5" />,
      'notification_system': <Bell className="w-5 h-5" />,
      'socket_communication': <Share2 className="w-5 h-5" />,
      'cache_system': <Database className="w-5 h-5" />,
    };

    return {
      id: engine.id,
      title: engine.name,
      icon: iconMap[engine.id] || <Monitor className="w-5 h-5" />,
      value: getMainMetricValue(engine),
      subText: getMainMetricLabel(engine),
      status,
      details: {
        description: `${engine.name} 시스템의 실시간 상태입니다.`,
        metrics: Object.entries(engine.metrics).map(([key, value]) => ({
          label: key,
          value: String(value)
        })).slice(0, 3), // 처음 3개 메트릭만
        uptime: '실시간',
        lastUpdate: '실시간'
      }
    };
  };

  // 엔진별 주요 메트릭 추출
  const getMainMetricValue = (engine: SystemEngine): string | number => {
    const metrics = engine.metrics;
    
    // 엔진별 주요 지표 선택
    switch (engine.id) {
      case 'biosignal_engine':
        return metrics.activeStreams || '0';
      case 'auto_learning':
        return metrics.modelAccuracy || '0%';
      case 'emergency_workflow':
        return metrics.activeWorkflows || '0';
      case 'hospital_matching':
        return metrics.connectedHospitals || '0';
      case 'medical_weighting':
        return metrics.processedCases || '0';
      case 'data_labeling':
        return metrics.pendingQueue || '0';
      case 'quality_management':
        return metrics.systemUptime || '0%';
      case 'feedback_system':
        return metrics.todayFeedback || '0';
      case 'realtime_tracking':
        return metrics.trackedParamedics || '0';
      case 'resource_management':
        return metrics.capacityUtilization || '0%';
      case 'route_optimization':
        return metrics.calculationsPerMin || '0';
      case 'notification_system':
        return metrics.sentNotifications || '0';
      case 'socket_communication':
        return metrics.connectedClients || '0';
      case 'cache_system':
        return metrics.hitRate || '0%';
      default:
        return Object.values(metrics)[0] || '0';
    }
  };

  const getMainMetricLabel = (engine: SystemEngine): string => {
    switch (engine.id) {
      case 'biosignal_engine': return '활성 스트림 수';
      case 'auto_learning': return '모델 정확도';
      case 'emergency_workflow': return '활성 워크플로우';
      case 'hospital_matching': return '연결된 병원';
      case 'medical_weighting': return '처리된 케이스';
      case 'data_labeling': return '대기 중인 라벨';
      case 'quality_management': return '시스템 가동률';
      case 'feedback_system': return '일일 피드백';
      case 'realtime_tracking': return '추적 중인 구조사';
      case 'resource_management': return '리소스 사용률';
      case 'route_optimization': return '분당 계산 횟수';
      case 'notification_system': return '발송된 알림';
      case 'socket_communication': return '연결된 클라이언트';
      case 'cache_system': return '캐시 히트율';
      default: return '실시간 데이터';
    }
  };

  // 실시간 데이터가 있으면 사용, 없으면 기본값 사용
  const systemCards = engines?.engines 
    ? engines.engines.map(convertEngineToStatusCard)
    : INITIAL_SYSTEM_CARDS;

  // 실시간 KPI 데이터 생성
  const realTimeKPIs = overview ? [
    { 
      label: '평균 응답 시간', 
      value: overview.keyMetrics.apiResponseTime, 
      trend: '-5%', 
      isPositive: true 
    },
    { 
      label: '시스템 가동률', 
      value: overview.keyMetrics.systemUptime, 
      trend: '+0.1%', 
      isPositive: true 
    },
    { 
      label: '활성 응급 케이스', 
      value: overview.emergencyCases.active.toString(), 
      trend: overview.emergencyCases.level4Plus > 0 ? `+${overview.emergencyCases.level4Plus}` : '0', 
      isPositive: overview.emergencyCases.level4Plus === 0 
    },
    { 
      label: '가용 병상', 
      value: overview.keyMetrics.availableBeds.toString(), 
      trend: '+12', 
      isPositive: true 
    },
  ] : INITIAL_KPIS;

  // 시스템 상태 결정
  const getSystemStatus = () => {
    if (connectionStatus === 'disconnected') return 'DISCONNECTED';
    if (error) return 'ERROR';
    if (overview?.overallHealth.status === 'CRITICAL') return 'CRITICAL';
    if (overview?.overallHealth.status === 'WARNING') return 'WARNING';
    return 'OPERATIONAL';
  };

  const systemStatus = getSystemStatus();
  const systemUptime = overview ? 
    `${Math.floor(overview.uptime / 86400)}일 ${Math.floor((overview.uptime % 86400) / 3600)}시간 ${Math.floor((overview.uptime % 3600) / 60)}분` : 
    "연결 중...";
  const shadowMonitoring = overview?.shadowMonitoring;
  const shadowBannerToneClass =
    shadowMonitoring?.bannerTone === 'danger'
      ? 'border-red-500/40 bg-red-500/10 text-red-100'
      : shadowMonitoring?.bannerTone === 'warning'
        ? 'border-amber-400/40 bg-amber-400/10 text-amber-50'
        : 'border-slate-600/40 bg-slate-800/70 text-slate-100';
  const shadowPriorityLabel =
    shadowMonitoring?.actionPriority === 'high'
      ? '즉시 확인'
      : shadowMonitoring?.actionPriority === 'medium'
        ? '우선 점검'
        : '관찰 유지';
  const shadowConsistencySummary = shadowConsistency?.summary;

  useEffect(() => {
    let isMounted = true;

    const loadShadowConsistency = async () => {
      try {
        const consistency = await systemMonitoringService.getShadowConsistency();
        if (isMounted) {
          setShadowConsistency(consistency);
        }
      } catch {
        if (isMounted) {
          setShadowConsistency(null);
        }
      }
    };

    loadShadowConsistency();
    const intervalId = window.setInterval(loadShadowConsistency, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f1c] text-white overflow-hidden">
      {/* Detail Modal Overlay */}
      {selectedCard && (
        <DetailModal 
          card={selectedCard} 
          onClose={() => setSelectedCard(null)} 
        />
      )}

      {/* Header */}
      <header className="h-16 border-b border-[#1e293b] flex items-center justify-between px-8 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-5">
          <div className={`p-2.5 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] ${
            systemStatus === 'OPERATIONAL' ? 'bg-blue-600' : 
            systemStatus === 'WARNING' ? 'bg-yellow-600' : 
            systemStatus === 'CRITICAL' ? 'bg-red-600' : 'bg-gray-600'
          }`}>
            {connectionStatus === 'connected' ? (
              <Activity className="w-6 h-6 text-white" />
            ) : connectionStatus === 'disconnected' ? (
              <WifiOff className="w-6 h-6 text-white" />
            ) : (
              <Wifi className="w-6 h-6 text-white animate-pulse" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-3">
              GOLDENTIME <span className="text-blue-500 text-xs font-black border-2 border-blue-500/30 px-2 py-0.5 rounded-md bg-blue-500/5">AI COMMAND CENTER</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                systemStatus === 'OPERATIONAL' ? 'bg-green-500 shadow-[0_0_12px_#00ff88]' :
                systemStatus === 'WARNING' ? 'bg-yellow-500 shadow-[0_0_12px_#ffb800]' :
                systemStatus === 'CRITICAL' ? 'bg-red-500 shadow-[0_0_12px_#ff4757]' :
                'bg-gray-500 shadow-[0_0_12px_#94a3b8]'
              }`} />
              <span className="text-[10px] text-slate-500 font-mono tracking-[0.2em] font-bold uppercase">
                System Status: {systemStatus} // {
                  connectionStatus === 'connected' ? 'Real-time Connected' :
                  connectionStatus === 'disconnected' ? 'Connection Lost' :
                  'Connecting...'
                }
              </span>
              {loading && (
                <div className="ml-2 w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
              {error && (
                <AlertTriangle className="ml-2 w-3 h-3 text-red-500" />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <div className="flex flex-col items-end">
            <div className="text-2xl font-mono font-black text-blue-500 tracking-tighter leading-none">
              {time}
            </div>
            <div className="text-[10px] text-slate-500 font-mono font-bold mt-1 uppercase tracking-widest">HQ: SEOUL CENTRAL COMMAND</div>
          </div>
        </div>
      </header>

      {shadowMonitoring && (
        <div className="px-8 pt-4">
          <div className={`rounded-2xl border px-5 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.22)] ${shadowBannerToneClass}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-current/20 px-2.5 py-1 text-[11px] font-black tracking-[0.16em] uppercase">
                    Shadow {shadowMonitoring.summaryLevel}
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.16em] uppercase opacity-80">
                    {shadowPriorityLabel}
                  </span>
                </div>
                <p className="mt-2 text-[15px] font-semibold leading-6">
                  {shadowMonitoring.summaryMessage}
                </p>
                <p className="mt-1 text-[13px] leading-5 opacity-90">
                  {shadowMonitoring.recommendedAction}
                </p>
              </div>
              <div className="flex shrink-0 gap-2 text-[12px] font-semibold">
                <span className="rounded-full border border-current/20 px-3 py-1.5">
                  전체 gap {shadowMonitoring.totalGap}
                </span>
                <span className="rounded-full border border-current/20 px-3 py-1.5">
                  실시간 {shadowMonitoring.realtimeGap}
                </span>
                <span className="rounded-full border border-current/20 px-3 py-1.5">
                  워크플로우 {shadowMonitoring.workflowGap}
                </span>
              </div>
            </div>
            {shadowConsistencySummary && (
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <div className="rounded-2xl border border-current/10 bg-black/15 px-4 py-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] opacity-70">
                    Shadow Consistency
                  </div>
                  <p className="mt-2 text-[14px] font-semibold leading-5">
                    {shadowConsistencySummary.summaryMessage}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 opacity-85">
                    {shadowConsistencySummary.recommendedAction}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[12px] font-semibold">
                    <span className="rounded-full border border-current/15 px-2.5 py-1">
                      scope {shadowConsistencySummary.selectedScopes.join(', ')}
                    </span>
                    <span className="rounded-full border border-current/15 px-2.5 py-1">
                      불일치 {shadowConsistencySummary.inconsistentScopes.length}개
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-current/10 bg-black/15 px-4 py-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] opacity-70">
                      Realtime
                    </div>
                    <div className="mt-2 text-[18px] font-semibold">
                      연속 {shadowConsistencySummary.realtimeTrend.consecutiveMismatchCount}
                    </div>
                    <div className="mt-1 text-[12px] opacity-80">
                      누적 {shadowConsistencySummary.realtimeTrend.totalMismatchCount}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-current/10 bg-black/15 px-4 py-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] opacity-70">
                      Workflow
                    </div>
                    <div className="mt-2 text-[18px] font-semibold">
                      연속 {shadowConsistencySummary.workflowTrend.consecutiveMismatchCount}
                    </div>
                    <div className="mt-1 text-[12px] opacity-80">
                      누적 {shadowConsistencySummary.workflowTrend.totalMismatchCount}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-8 grid grid-cols-12 gap-8 overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.05)_0%,transparent_50%)]">
        
        {/* Left Column: Health & KPI (col-span-9) */}
        <div className="col-span-12 xl:col-span-9 flex flex-col gap-8 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {realTimeKPIs.map((kpi, idx) => (
              <div key={idx} className="bg-[#121b2b] border border-[#1e293b] rounded-xl p-5 flex flex-col justify-between hover:border-blue-500/30 transition-all cursor-default shadow-xl group relative overflow-hidden">
                <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-all" />
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{kpi.label}</span>
                  <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${kpi.isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {kpi.trend}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-4xl font-black font-mono text-white tracking-tighter">{kpi.value}</span>
                  <div className={`w-2 h-2 rounded-full ${kpi.isPositive ? 'bg-green-500 shadow-[0_0_10px_#00ff88]' : 'bg-red-500 shadow-[0_0_10px_#ff4757]'}`} />
                </div>
              </div>
            ))}
          </div>

          {/* System Health Grid */}
          <div className="bg-[#121b2b]/50 border border-[#1e293b] rounded-2xl p-8 flex flex-col shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-500/10">
                   <Monitor className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-base font-black uppercase tracking-[0.25em] text-blue-100">통합 네트워크 지능형 관제망</h3>
              </div>
              <div className="flex items-center gap-8 text-[11px] font-mono text-slate-500 font-black">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_5px_#00ff88]" /> OPERATIONAL</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_5px_#3742fa]" /> PROCESSING</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_5px_#ffb800]" /> WARNING</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {systemCards.map(card => (
                <StatusCard 
                  key={card.id} 
                  {...card} 
                  onClick={() => setSelectedCard(card)}
                />
              ))}
              <div className="bg-[#1e293b]/20 border-2 border-dashed border-[#334155] rounded-xl p-5 flex flex-col items-center justify-center group cursor-pointer hover:bg-[#1e293b]/40 hover:border-blue-500/50 transition-all shadow-inner">
                 <div className="text-slate-600 group-hover:text-blue-400 transition-all duration-300 transform group-hover:translate-y-1 mb-3">
                   <ChevronDown className="w-8 h-8" />
                 </div>
                 <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em]">
                   {loading ? '데이터 로딩 중...' : '확장 로그 네트워크'}
                 </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Charts (col-span-3) */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-8 overflow-y-auto pl-2">
          <ChartsPanel performance={performance} overview={overview} />
          
          <div className="mt-auto bg-[#121b2b] border border-[#1e293b] rounded-2xl p-6 bg-gradient-to-t from-[#121b2b] to-[#1a2436] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-rose-600 opacity-50" />
            <div className="flex items-center gap-4 mb-5">
               <div className="p-3 rounded-xl bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                 <Heart className="w-6 h-6 text-red-500 animate-pulse" />
               </div>
               <span className="text-base font-black text-slate-100 uppercase tracking-widest">AI INTERVENTION</span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 font-black tracking-widest">
                <span>AUTONOMOUS_OPTIMIZATION</span>
                <span className="text-blue-400">85.4%</span>
              </div>
              <div className="w-full bg-[#0a0f1c] rounded-full h-3 shadow-inner p-0.5">
                <div className="bg-gradient-to-r from-blue-700 to-blue-400 h-2 rounded-full w-[85.4%] shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-1000" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mt-4 italic font-medium">
                * Real-time routing and hospital matching algorithms are currently optimizing active cases with 98.2% efficiency.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 bg-[#0f172a] border-t border-[#1e293b] flex items-center justify-between px-8 text-[10px] text-slate-500 font-mono tracking-[0.1em] font-bold">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <span className="text-slate-700 uppercase tracking-widest">System Uptime:</span>
            <span className="text-blue-400 tracking-normal">{systemUptime}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-700 uppercase tracking-widest">API Response:</span>
            <span className="text-blue-400 tracking-normal">
              {overview?.keyMetrics.apiResponseTime || '측정 중...'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-700 uppercase tracking-widest">Active Engines:</span>
            <span className="text-blue-400 tracking-normal">
              {engines ? `${engines.activeEngines}/${engines.totalEngines}` : '확인 중...'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-700 uppercase tracking-widest">Hospital Network:</span>
            <span className="text-blue-400 tracking-normal">
              {overview?.keyMetrics.hospitalConnections || '0'} CONNECTED
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-slate-600 font-black tracking-[0.3em] uppercase">
            GoldenTime AI Command V3.2.1-Final {connectionStatus === 'connected' ? '// LIVE' : '// OFFLINE'}
          </span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_#00ff88]' : 'bg-red-500 shadow-[0_0_8px_#ff4757]'
            }`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${
              connectionStatus === 'connected' ? 'text-green-500/80' : 'text-red-500/80'
            }`}>
              {connectionStatus === 'connected' ? 'REAL_TIME' : 'DISCONNECTED'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
