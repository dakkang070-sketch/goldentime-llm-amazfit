import React, { useState } from 'react';
import { 
  Clock, Heart, Thermometer, Shield, Smartphone, 
  ToggleLeft, ToggleRight, Save, Activity, MapPin, 
  FileText, Bell
} from 'lucide-react';

const Toggle: React.FC<{ checked: boolean; onClick: () => void }> = ({ checked, onClick }) => (
  <button 
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors duration-200 focus:outline-none ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}
  >
    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
  </button>
);

const SettingSection: React.FC<{ 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode; 
  className?: string;
}> = ({ title, icon: Icon, children, className = '' }) => (
  <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col ${className}`}>
    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0">
      <Icon size={18} className="text-black" />
      <h3 className="text-[15px] text-black font-light">{title}</h3>
    </div>
    <div className="p-6 space-y-6 flex-1">
      {children}
    </div>
  </div>
);

const InputWithTooltip: React.FC<{ 
  label: string; 
  children: React.ReactNode; 
  tooltip: string; 
}> = ({ label, children, tooltip }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative group h-full">
       <label className="block text-[13px] text-black mb-2 font-light">{label}</label>
       <div 
         onMouseEnter={() => setShowTooltip(true)}
         onMouseLeave={() => setShowTooltip(false)}
         className="relative"
       >
         {children}
         
         {/* Tooltip */}
         {showTooltip && (
           <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-800 text-white text-[12px] rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
             <div className="relative z-10 font-light leading-relaxed">
               {tooltip}
             </div>
             {/* Arrow */}
             <div className="absolute top-full left-6 -mt-1 w-2 h-2 bg-slate-800 rotate-45 transform"></div>
           </div>
         )}
       </div>
    </div>
  );
};

export const Settings: React.FC = () => {
  // State for toggles
  const [toggles, setToggles] = useState({
    locationCollection: true,
    dataAnalysis: true,
    autoReport: true
  });

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="h-full bg-slate-50 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-[21px] text-black font-light">시스템 설정</h2>
            <p className="text-[14px] text-black font-light">기기 정책, 임계치 및 개인정보 설정</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm text-[14px] font-light">
            <Save size={18} /> 설정 저장
          </button>
        </div>

        <div className="space-y-6">
            {/* 1. Device Data Policy */}
            <SettingSection title="데이터 전송 주기 설정 (기본 정책)" icon={Clock}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[13px] text-black mb-2 font-light">실시간 생체 신호 (심박, SPO2, 체온)</label>
                  <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[15px] text-black focus:outline-none focus:border-blue-500 font-light">
                    <option>권장 (10초)</option>
                    <option>고성능 (5초)</option>
                    <option>배터리 절약 (30초)</option>
                  </select>
                  <p className="text-[11px] text-black mt-2 font-light">* 실시간 주기가 짧을수록 사용자 기기의 배터리 소모량이 증가합니다.</p>
                </div>
                <div>
                  <label className="block text-[13px] text-black mb-2 font-light">일반 건강 지표 (스트레스, HRV, 활동량)</label>
                  <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[15px] text-black focus:outline-none focus:border-blue-500 font-light">
                    <option>1분</option>
                    <option>5분</option>
                    <option>10분</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-lg text-[13px] font-light mt-auto">
                 <Activity size={16} />
                 <span>응급 상황 감지 시 설정된 주기와 무관하게 즉시 데이터를 전송합니다.</span>
              </div>
            </SettingSection>

            {/* 2. Safety Thresholds */}
            <SettingSection title="위험 감지 임계치 설정" icon={Heart}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <InputWithTooltip 
                  label="고심박수 경고 (BPM)" 
                  tooltip="설정된 값(BPM) 이상으로 심박수가 상승하면 즉시 경고 알림이 전송됩니다. 고령자의 경우 120 이상은 위험할 수 있습니다."
                >
                   <div className="flex items-center gap-2">
                     <input type="number" defaultValue={120} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-[15px] text-black focus:outline-none focus:border-blue-500 font-light transition-colors" />
                     <span className="text-black text-[13px] font-light w-8">이상</span>
                   </div>
                </InputWithTooltip>

                <InputWithTooltip 
                  label="저심박수 경고 (BPM)" 
                  tooltip="심박수가 설정값 이하로 떨어지면 서맥 경고가 발생합니다. 수면 중이 아닐 때 45 미만은 위험 신호일 수 있습니다."
                >
                   <div className="flex items-center gap-2">
                     <input type="number" defaultValue={45} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-[15px] text-black focus:outline-none focus:border-blue-500 font-light transition-colors" />
                     <span className="text-black text-[13px] font-light w-8">이하</span>
                   </div>
                </InputWithTooltip>

                <InputWithTooltip 
                  label="저산소포화도 경고 (%)" 
                  tooltip="혈중 산소포화도(SpO2)가 설정값 밑으로 떨어지면 저산소증 위험 알림을 보냅니다. 일반적으로 95% 이상이 정상입니다."
                >
                   <div className="flex items-center gap-2">
                     <input type="number" defaultValue={90} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-[15px] text-black focus:outline-none focus:border-blue-500 font-light transition-colors" />
                     <span className="text-black text-[13px] font-light w-8">이하</span>
                   </div>
                </InputWithTooltip>

                <InputWithTooltip 
                  label="고체온 경고 (°C)" 
                  tooltip="체온이 설정값 이상으로 오르면 발열 감지 경고를 보냅니다. 감염이나 염증 반응을 조기에 발견하는 데 도움이 됩니다."
                >
                   <div className="flex items-center gap-2">
                     <input type="number" defaultValue={38.0} step="0.1" className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-[15px] text-black focus:outline-none focus:border-blue-500 font-light transition-colors" />
                     <span className="text-black text-[13px] font-light w-8">이상</span>
                   </div>
                </InputWithTooltip>

                <InputWithTooltip 
                  label="낙상 감지 민감도" 
                  tooltip="낙상 감지 알고리즘의 민감도를 조절합니다. '높음'은 작은 충격에도 반응하며, '낮음'은 확실한 낙상 충격에만 반응합니다."
                >
                   <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[15px] text-black focus:outline-none focus:border-blue-500 font-light transition-colors cursor-pointer">
                    <option>높음 (민감)</option>
                    <option defaultValue="default">보통 (권장)</option>
                    <option>낮음 (둔감)</option>
                  </select>
                </InputWithTooltip>
              </div>
            </SettingSection>

            {/* 3. Permissions & Privacy */}
            <SettingSection title="권한 및 개인정보 (시스템 기본값)" icon={Shield}>
               <div className="space-y-6">
                 <div className="flex justify-between items-center cursor-pointer" onClick={() => handleToggle('locationCollection')}>
                   <div className="flex gap-4">
                     <div className="p-2 bg-slate-100 rounded-lg h-fit text-black"><MapPin size={20} /></div>
                     <div>
                       <h4 className="text-[13px] text-black font-light">위치 정보 수집</h4>
                       <p className="text-[12px] text-black mt-1 font-light">응급 상황 발생 시 정확한 구조를 위해 위치를 전송합니다.</p>
                     </div>
                   </div>
                   <Toggle checked={toggles.locationCollection} onClick={() => handleToggle('locationCollection')} />
                 </div>

                 <div className="flex justify-between items-center cursor-pointer" onClick={() => handleToggle('dataAnalysis')}>
                   <div className="flex gap-4">
                     <div className="p-2 bg-slate-100 rounded-lg h-fit text-black"><FileText size={20} /></div>
                     <div>
                       <h4 className="text-[13px] text-black font-light">개인 건강 데이터 분석</h4>
                       <p className="text-[12px] text-black mt-1 font-light">AI 알고리즘 학습 및 맞춤형 건강 리포트 생성에 활용됩니다.</p>
                     </div>
                   </div>
                   <Toggle checked={toggles.dataAnalysis} onClick={() => handleToggle('dataAnalysis')} />
                 </div>

                 <div className="flex justify-between items-center cursor-pointer" onClick={() => handleToggle('autoReport')}>
                   <div className="flex gap-4">
                     <div className="p-2 bg-slate-100 rounded-lg h-fit text-black"><Bell size={20} /></div>
                     <div>
                       <h4 className="text-[13px] text-black font-light">자동 리포트 생성</h4>
                       <p className="text-[12px] text-black mt-1 font-light">매일 아침 지난 24시간의 데이터를 분석하여 리포트를 생성합니다.</p>
                     </div>
                   </div>
                   <Toggle checked={toggles.autoReport} onClick={() => handleToggle('autoReport')} />
                 </div>
               </div>
            </SettingSection>
        </div>

        {/* 4. Admin Info */}
        <div className="text-center pt-8 border-t border-slate-200 mt-8">
           <p className="text-[11px] text-black font-light">Prime Play Emergency Response System v0.1</p>
           <p className="text-[11px] text-black mt-1 font-light">System ID: PPY-KR-001 • Last Synced: 2026-02-11</p>
        </div>
      </div>
    </div>
  );
};