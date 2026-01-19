
import React, { useEffect, useState } from 'react';
import { Camera, Radio, Maximize2, RefreshCw, AlertCircle } from 'lucide-react';

interface CCTVFeedProps {
  lat: number;
  lng: number;
  patientName: string;
}

const CCTVFeed: React.FC<CCTVFeedProps> = ({ lat, lng, patientName }) => {
  const [timestamp, setTimestamp] = useState(new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimestamp(new Date().toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${process.env.API_KEY}&location=${lat},${lng}&heading=210&pitch=10&fov=35`;

  return (
    <div className="relative group overflow-hidden rounded-2xl bg-black border border-zinc-800 shadow-2xl aspect-video">
      <div className="absolute inset-0 z-10 pointer-events-none border-[12px] border-black/10">
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-red-600 px-2 py-0.5 rounded text-[11px] font-normal text-white animate-pulse">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            REC
          </div>
          <span className="text-[12px] font-mono text-zinc-300 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10 uppercase">
            CAM-01 / SEC-ALPHA
          </span>
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2">
           <span className="text-[11px] font-mono text-white bg-black/60 px-2 py-1 rounded border border-white/5">
            {lat.toFixed(6)}N, {lng.toFixed(6)}E
           </span>
        </div>

        <div className="absolute bottom-4 left-4">
          <p className="text-[12px] font-mono text-zinc-400 bg-black/40 px-2 py-1 rounded">
            {timestamp}
          </p>
        </div>

        <div className="absolute bottom-4 right-4 flex items-center gap-2">
           <div className="flex items-center gap-1 bg-blue-600/20 px-2 py-1 rounded border border-blue-500/30">
              <Radio className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-normal text-blue-400 uppercase tracking-tighter">HD_LINK: ACTIVE</span>
           </div>
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] opacity-30"></div>
      </div>

      <iframe
        width="100%"
        height="100%"
        style={{ border: 0, filter: 'grayscale(0.3) contrast(1.1)' }}
        loading="lazy"
        allowFullScreen
        src={streetViewUrl}
        title="CCTV Feed"
      ></iframe>

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-20">
         <button className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/20 transition-all text-white">
            <Maximize2 className="w-6 h-6" />
         </button>
         <button className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/20 transition-all text-white">
            <RefreshCw className="w-6 h-6" />
         </button>
      </div>
      
      <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center -z-10">
         <AlertCircle className="w-9 h-9 text-zinc-700 mb-2" />
         <p className="text-[11px] text-zinc-600 font-normal uppercase tracking-widest">Searching Visual Signal...</p>
      </div>
    </div>
  );
};

export default CCTVFeed;
