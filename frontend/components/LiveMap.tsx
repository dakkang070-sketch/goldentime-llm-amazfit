
import React, { useEffect, useRef, useState } from 'react';
import { 
  Crosshair, 
  Navigation,
  Siren,
  Zap,
  Activity,
  Loader2,
  Heart,
  Hospital as HospitalIcon,
  MapPin
} from 'lucide-react';
import { Patient, Hospital, Ambulance, AmbulanceStatus, PatientStatus } from '../types';

declare var L: any;

interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
  ambulances: Ambulance[];
  matchedAmbulance?: Ambulance;
}

const LiveMap: React.FC<LiveMapProps> = ({ patient, hospital, ambulances, matchedAmbulance }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ 
    patient?: any; 
    hospitals: Record<string, any>;
    ambulances: Record<string, any>;
    routeLines: Record<string, any>;
  }>({ hospitals: {}, ambulances: {}, routeLines: {} });

  const lastTargetIdRef = useRef<string | null>(null);

  const patientCoords: [number, number] = [patient.lat, patient.lng];

  useEffect(() => {
    if (typeof L === 'undefined') {
      const script = document.createElement('script');
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
      script.crossOrigin = "";
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapContainerRef.current || mapRef.current) return;
      mapRef.current = L.map(mapContainerRef.current, {
        center: [37.5665, 126.9780], // 서울 중심 고정
        zoom: 11, // 서울 전체를 볼 수 있는 줌 레벨
        zoomControl: false,
        attributionControl: false
      });
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}').addTo(mapRef.current);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    ambulances.forEach(amb => {
      let marker = markersRef.current.ambulances[amb.id];
      const isMatched = matchedAmbulance?.id === amb.id;
      const ambColor = amb.type === 'ALS' ? '#ef4444' : '#f59e0b';

      if (!marker) {
        const ambIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="relative amb-marker-${amb.id}">
                  <svg width="34" height="34" viewBox="0 0 100 100">
                    <path d="M50 5 L90 25 L90 55 C90 75 70 90 50 95 C30 90 10 75 10 55 L10 25 L50 5Z" fill="white" stroke="${ambColor}" stroke-width="8"/>
                    <path d="M50 15 L82 31 L82 55 C82 71 66 84 50 88 C34 84 18 71 18 55 L18 31 L50 15Z" fill="${ambColor}"/>
                    <text x="50" y="65" font-family="Arial" font-size="28" fill="white" text-anchor="middle" font-weight="400">119</text>
                  </svg>
                 </div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
        marker = L.marker([amb.lat, amb.lng], { icon: ambIcon }).addTo(mapRef.current);
        markersRef.current.ambulances[amb.id] = marker;
      } else {
        marker.setLatLng([amb.lat, amb.lng]);
      }

      // 경로 표시 완전 비활성화 (불안정한 경로 표시 방지)
      // 실제 응급 상황에서만 경로를 표시하도록 조건을 엄격하게 설정
      const shouldShowRoute = false; // 임시로 모든 경로 표시 비활성화
      
      if (shouldShowRoute && amb.path && amb.path.length > 1 && amb.status === AmbulanceStatus.DISPATCHED && isMatched) {
        if (markersRef.current.routeLines[amb.id]) {
          markersRef.current.routeLines[amb.id].setLatLngs(amb.path);
        } else {
          markersRef.current.routeLines[amb.id] = L.polyline(amb.path, {
            color: '#ef4444',
            weight: 6,
            opacity: 0.8,
            dashArray: ''
          }).addTo(mapRef.current);
        }
      } else {
        // 모든 경로 제거 (안정적인 지도 표시)
        if (markersRef.current.routeLines[amb.id]) {
          mapRef.current.removeLayer(markersRef.current.routeLines[amb.id]);
          delete markersRef.current.routeLines[amb.id];
        }
      }

      if (marker.getElement()) {
        marker.getElement().style.zIndex = isMatched ? 1000 : 10;
      }
    });
  }, [ambulances, matchedAmbulance?.id]);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;

    if (markersRef.current.patient) mapRef.current.removeLayer(markersRef.current.patient);
    const patientIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="relative flex items-center justify-center">
              <div class="absolute w-12 h-12 bg-red-600/30 rounded-full animate-ping"></div>
              <div class="w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center relative z-10">
                <div class="w-2 h-2 bg-white rounded-full"></div>
              </div>
             </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    markersRef.current.patient = L.marker(patientCoords, { icon: patientIcon }).addTo(mapRef.current);

    if (hospital) {
      const hCoords: [number, number] = [hospital.lat, hospital.lng];
      const hIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="bg-blue-600 p-2 rounded-lg border-2 border-white shadow-2xl flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M18 22V8a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14M18 14H6M10 18H14M10 22H14M22 22H2"></path></svg>
               </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      
      Object.values(markersRef.current.hospitals).forEach(m => mapRef.current.removeLayer(m));
      markersRef.current.hospitals[hospital.id] = L.marker(hCoords, { icon: hIcon }).addTo(mapRef.current);
      
      // 자동 지도 이동 비활성화 (사용자가 직접 조작할 수 있도록)
      const currentTargetKey = `${patient.id}-${hospital.id}`;
      if (lastTargetIdRef.current !== currentTargetKey) {
        lastTargetIdRef.current = currentTargetKey;
        // flyToBounds 비활성화 - 사용자가 지도를 직접 조작
        // mapRef.current.flyToBounds([patientCoords, hCoords], { 
        //   padding: [90, 90], 
        //   duration: 1.2,
        //   easeLinearity: 0.25
        // });
      }
    }
  }, [patient.id, hospital?.id]);

  const activityLabel = matchedAmbulance?.activity === 'heading_to_patient' 
    ? { text: '환자에게 이동 중', color: 'bg-orange-500', icon: MapPin }
    : matchedAmbulance?.activity === 'transporting_to_hospital' 
    ? { text: '병원으로 이송 중', color: 'bg-red-600', icon: HospitalIcon }
    : { text: '대기 중', color: 'bg-zinc-700', icon: Siren };

  return (
    <div className="relative w-full h-full bg-[#0a0a0b]">
      <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-xl">
        <div className="bg-zinc-950/95 backdrop-blur-3xl border border-white/5 p-4.5 rounded-2xl shadow-2xl flex items-center justify-between">
          <div className="flex gap-7 pl-5">
            <div className="flex flex-col">
              <span className="text-[10px] font-normal text-zinc-300 uppercase tracking-widest">CURRENT PHASE</span>
              <div className="flex items-center gap-2.5 mt-1">
                 <activityLabel.icon className={`w-4 h-4 ${activityLabel.color.replace('bg-', 'text-')}`} />
                 <span className={`text-[13px] font-normal uppercase ${activityLabel.color.replace('bg-', 'text-')}`}>
                   {activityLabel.text}
                 </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-normal text-zinc-300 uppercase tracking-widest">DESTINATION</span>
              <span className="text-[14px] font-normal text-white truncate max-w-[140px] mt-1">
                {matchedAmbulance?.activity === 'heading_to_patient' ? patient.name : hospital?.name || '---'}
              </span>
            </div>
          </div>

          <div>
            {matchedAmbulance ? (
              <div className={`${activityLabel.color} px-5 py-3 rounded-xl flex items-center gap-3.5 shadow-xl`}>
                <Siren className="w-5 h-5 text-white animate-pulse" />
                <div className="flex flex-col">
                  <p className="text-[14px] font-normal text-white leading-none">{matchedAmbulance.unitName}</p>
                  <p className="text-[10px] text-white/70 font-normal uppercase mt-1">Active Mission</p>
                </div>
              </div>
            ) : (
              <div className="px-6 py-3 flex items-center gap-3.5 bg-zinc-900 rounded-xl border border-white/5">
                <Loader2 className="w-4.5 h-4.5 animate-spin text-zinc-400" />
                <span className="text-[11px] font-normal uppercase text-zinc-400">Scanning Area...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute top-8 right-8 z-20 flex flex-col gap-3">
        <button onClick={() => mapRef.current?.flyTo(patientCoords, 15, { duration: 1 })} className="p-3.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl text-zinc-300 hover:text-white shadow-xl active:scale-95 transition-all">
          <Crosshair className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

export default LiveMap;
