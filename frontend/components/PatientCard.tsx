
import React, { memo } from 'react';
import { Patient, PatientStatus } from '../types';
import { Activity, MapPin, Siren, Loader2, Waves, ArrowRight } from 'lucide-react';

interface PatientCardProps {
  patient: Patient;
  onClick: (patient: Patient) => void;
  isSelected: boolean;
  isMatching?: boolean;
  ambulanceStatus?: 'heading_to_patient' | 'transporting_to_hospital' | 'returning';
}

const PatientCard: React.FC<PatientCardProps> = memo(({ patient, onClick, isSelected, isMatching, ambulanceStatus }) => {
  const getStatusDisplay = (status: PatientStatus) => {
    switch (status) {
      case PatientStatus.CRITICAL: return { label: '위중', classes: 'bg-red-950/40 text-red-500 border-red-900/50' };
      case PatientStatus.SERIOUS: return { label: '심각', classes: 'bg-orange-950/40 text-orange-500 border-orange-900/50' };
      case PatientStatus.STABLE: return { label: '안정', classes: 'bg-green-950/40 text-green-500 border-green-500/30' };
      default: return { label: '대기', classes: 'bg-zinc-900 text-zinc-300 border-zinc-800' };
    }
  };

  const formatAddress = (addr: string) => {
    return addr.replace(/^(서울특별시|경기도|.+?광역시)\s*/, '');
  };

  return (
    <div 
      onClick={() => onClick(patient)}
      className={`p-2 rounded-xl border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col gap-1.5 will-change-transform ${
        isSelected 
        ? 'bg-zinc-900 border-zinc-700 shadow-xl scale-[1.01] z-10' 
        : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800'
      }`}
      style={{ minHeight: '100px' }}
    >
      <div className="flex items-start gap-2.5">
        <div className="relative w-9 h-9 shrink-0">
          <div className="w-full h-full rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
            <img 
              src={patient.imageUrl} 
              alt={patient.name} 
              className="w-full h-full object-cover grayscale-[0.2]"
              loading="lazy" 
            />
          </div>
          {patient.matchedAmbulanceId && (
            <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center rounded-lg">
               <Siren className="w-5 h-5 text-white opacity-60" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center -mb-0.5">
            <h3 className="font-normal text-white text-[14px] tracking-tighter truncate">{patient.name}</h3>
            <span className="text-[14px] font-mono font-normal text-red-500/90 w-12 text-right">{patient.vitals.heartRate}</span>
          </div>
          
          <div className="flex flex-col gap-0">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="text-[13px] font-normal whitespace-nowrap">{patient.age}Y • {patient.gender}</span>
              <div className="flex items-center gap-1 text-blue-500/70">
                <Waves className="w-3 h-3" />
                <span className="text-[13px] font-normal">{patient.vitals.oxygenLevel}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 text-zinc-400 pl-0.5 -mt-0.5">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="text-[12px] font-normal truncate tracking-tighter">{formatAddress(patient.location)}</span>
      </div>
      
      <div className="mt-auto h-7 flex flex-col justify-end">
        {isMatching ? (
          <div className="bg-purple-600/5 px-2 py-0.5 rounded-lg border border-purple-500/10">
             <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-normal text-purple-400 uppercase tracking-widest animate-pulse">Matching</span>
                <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />
             </div>
             <div className="h-0.5 bg-zinc-950 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 animate-[card-progress_1.5s_linear_infinite]" style={{ width: '40%' }}></div>
             </div>
          </div>
        ) : patient.matchedAmbulanceId ? (
          <div className="space-y-0.5">
            <div className={`px-2 py-1 rounded-lg border flex flex-col justify-center transition-colors duration-500 ${ambulanceStatus === 'heading_to_patient' ? 'bg-orange-950/10 border-orange-900/30' : 'bg-red-950/10 border-red-900/30'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Siren className={`w-4 h-4 ${ambulanceStatus === 'heading_to_patient' ? 'text-orange-500' : 'text-red-500'}`} />
                  <span className={`text-[12px] font-normal uppercase tracking-wider ${ambulanceStatus === 'heading_to_patient' ? 'text-orange-500' : 'text-red-500'}`}>
                    {ambulanceStatus === 'heading_to_patient' ? 'To Patient' : 'To Hospital'}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-zinc-950/60 px-2 py-1 rounded-lg border border-zinc-800 border-dashed">
             <span className="text-[12px] text-zinc-400 font-normal uppercase tracking-widest">Awaiting Analysis</span>
             <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes card-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMatching === nextProps.isMatching &&
    prevProps.ambulanceStatus === nextProps.ambulanceStatus &&
    prevProps.patient.vitals.heartRate === nextProps.patient.vitals.heartRate &&
    prevProps.patient.status === nextProps.patient.status &&
    prevProps.patient.id === nextProps.patient.id
  );
});

export default PatientCard;
