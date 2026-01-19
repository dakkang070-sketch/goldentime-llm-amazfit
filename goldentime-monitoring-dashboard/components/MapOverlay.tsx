
import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

export const MapOverlay: React.FC = () => {
  return (
    <div className="relative bg-[#0f172a] rounded-lg border border-[#1e293b] overflow-hidden group h-full">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-[0.05]" 
        style={{ 
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }} 
      />
      
      {/* Fake Map Content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-full h-full opacity-10">
           <div className="absolute top-1/4 left-1/4 w-32 h-40 bg-slate-700 rounded-[40%_60%_70%_30%]" />
           <div className="absolute bottom-1/4 right-1/4 w-48 h-32 bg-slate-700 rounded-[30%_70%_40%_60%]" />
           <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-slate-700 rounded-[60%_40%_30%_70%]" />
        </div>
      </div>

      {/* Markers */}
      <div className="absolute inset-0">
        {/* Hospital */}
        <div className="absolute top-[30%] left-[45%] group/marker cursor-pointer">
          <div className="bg-green-500/20 p-2 rounded-full animate-ping absolute -inset-2" />
          <div className="relative bg-green-500 text-white p-1 rounded shadow-lg">
             <div className="w-3 h-3 flex items-center justify-center text-[10px] font-bold">+</div>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap bg-[#0f172a] border border-[#1e293b] text-white text-[10px] font-bold p-1 px-2 rounded opacity-0 group-hover/marker:opacity-100 transition-opacity z-10">
            서울대학교 병원
          </div>
        </div>

        {/* Emergency Units */}
        <div className="absolute top-[55%] left-[60%] group/marker cursor-pointer">
          <Navigation className="w-4 h-4 text-blue-500 rotate-45" fill="currentColor" />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap bg-[#0f172a] border border-[#1e293b] text-white text-[10px] font-bold p-1 px-2 rounded opacity-0 group-hover/marker:opacity-100 transition-opacity z-10">
            구급차 B-22
          </div>
        </div>

        {/* Active Emergency */}
        <div className="absolute top-[42%] left-[30%] group/marker cursor-pointer">
          <div className="bg-red-500 p-1.5 rounded-full animate-pulse shadow-[0_0_10px_#ef4444]" />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap bg-red-600 text-white text-[10px] font-bold p-1 px-2 rounded opacity-0 group-hover/marker:opacity-100 transition-opacity z-10">
            응급 #E2024-0156
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 flex flex-col gap-1">
        <div className="bg-[#0f172a]/80 backdrop-blur-md p-2 border border-[#1e293b] rounded shadow-lg text-[9px] text-slate-400 font-bold">
           <div className="flex items-center gap-2 mb-1">
             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
             <span>응급: 3건</span>
           </div>
           <div className="flex items-center gap-2 mb-1">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
             <span>배정: 18대</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
             <span>가용: 414개</span>
           </div>
        </div>
      </div>
    </div>
  );
};
