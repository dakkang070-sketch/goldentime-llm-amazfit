
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from 'lucide-react';

// Default icon fix for Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom icons
const patientIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="red" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`),
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});

const hospitalIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="green" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hospital"><path d="M12 6v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2z"/><path d="M15 2H9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/><path d="M12 18h.01"/><path d="M12 14v4"/><path d="M12 22v-4"/><path d="M16 18h.01"/><path d="M16 14v4"/><path d="M16 22v-4"/><path d="M8 18h.01"/><path d="M8 14v4"/><path d="M8 22v-4"/></svg>`),
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});

interface Patient {
  id: string;
  position: [number, number];
  name: string;
  matchedHospitalId?: string;
}

interface Hospital {
  id: string;
  position: [number, number];
  name: string;
}

const initialPatients: Patient[] = [
  { id: 'patient-1', name: '환자 A', position: [37.5665, 126.9780], matchedHospitalId: 'hospital-1' }, // 서울
  { id: 'patient-2', name: '환자 B', position: [37.5000, 127.0363], matchedHospitalId: 'hospital-2' }, // 강남
];

const initialHospitals: Hospital[] = [
  { id: 'hospital-1', name: '서울대학교 병원', position: [37.5791, 127.0004] }, // 서울대병원
  { id: 'hospital-2', name: '세브란스 병원', position: [37.5792, 126.9367] }, // 신촌세브란스
];

export const MapOverlay: React.FC = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [route, setRoute] = useState<[number, number][] | null>(null);

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    if (patient.matchedHospitalId) {
      const hospital = initialHospitals.find(h => h.id === patient.matchedHospitalId);
      if (hospital) {
        setRoute([patient.position, hospital.position]);
      }
    } else {
      setRoute(null);
    }
  };

  return (
    <div className="relative bg-[#0f172a] rounded-lg border border-[#1e293b] overflow-hidden group h-full">
      <MapContainer center={[37.5665, 126.9780]} zoom={11} className="h-full z-0">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />

        {initialHospitals.map(hospital => (
          <Marker key={hospital.id} position={hospital.position} icon={hospitalIcon}>
            <Popup>{hospital.name}</Popup>
          </Marker>
        ))}

        {initialPatients.map(patient => (
          <Marker 
            key={patient.id} 
            position={patient.position} 
            icon={patientIcon}
            eventHandlers={{
              click: () => handlePatientClick(patient),
            }}
          >
            <Popup>
              {patient.name}
              {patient.matchedHospitalId && (
                <div>
                  매칭 병원: {initialHospitals.find(h => h.id === patient.matchedHospitalId)?.name}
                </div>
              )}
            </Popup>
          </Marker>
        ))}

        {route && (
          <Polyline positions={route} color="blue" weight={5} opacity={0.7} dashArray="10, 10" />
        )}
      </MapContainer>

      <div className="absolute bottom-3 left-3 flex flex-col gap-1 z-10">
        <div className="bg-[#0f172a]/80 backdrop-blur-md p-2 border border-[#1e293b] rounded shadow-lg text-[9px] text-slate-400 font-bold">
           <div className="flex items-center gap-2 mb-1">
             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
             <span>응급: {initialPatients.length}건</span>
           </div>
           <div className="flex items-center gap-2 mb-1">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
             <span>배정: 18대</span> {/* 이 값은 실제 데이터로 대체되어야 합니다. */}
           </div>
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
             <span>가용: {initialHospitals.length}개</span>
           </div>
        </div>
      </div>
    </div>
  );
};
