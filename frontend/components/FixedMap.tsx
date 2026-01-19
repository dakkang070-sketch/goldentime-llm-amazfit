import React from 'react';
import { Patient, Hospital } from '../types';

interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
}

const FixedMap: React.FC<LiveMapProps> = ({ patient, hospital }) => {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const [hospitals, setHospitals] = React.useState<any[]>([]);

  // 병원 데이터 가져오기
  React.useEffect(() => {
    const fetchHospitals = async () => {
      try {
        console.log('🏥 [FIXED] API에서 병원 데이터 가져오기');
        const response = await fetch('http://localhost:3000/api/emergency/hospitals/map-data');
        const data = await response.json();
        
        if (data.success && data.data?.hospitals) {
          const hospitalList = data.data.hospitals.slice(0, 20); // 20개만
          console.log(`✅ [FIXED] ${hospitalList.length}개 병원 데이터 수신`);
          setHospitals(hospitalList);
        } else {
          console.log('⚠️ [FIXED] API 데이터 없음, 테스트 데이터 사용');
          setHospitals([
            { id: '1', name: '서울대병원', lat: 37.5796, lng: 127.0007 },
            { id: '2', name: '삼성병원', lat: 37.4882, lng: 127.0851 },
            { id: '3', name: '세브란스', lat: 37.5623, lng: 126.9408 }
          ]);
        }
      } catch (error) {
        console.error('❌ [FIXED] API 실패:', error);
        setHospitals([
          { id: '1', name: '서울대병원', lat: 37.5796, lng: 127.0007 },
          { id: '2', name: '삼성병원', lat: 37.4882, lng: 127.0851 },
          { id: '3', name: '세브란스', lat: 37.5623, lng: 126.9408 }
        ]);
      }
    };

    fetchHospitals();
  }, []);

  // 지도 초기화 및 마커 추가
  React.useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    console.log('🗺️ [FIXED] 지도 초기화 시작');

    // 기존 지도 제거
    if (mapRef.current) {
      mapRef.current.remove();
    }

    // 지도 생성
    mapRef.current = window.L.map(mapContainerRef.current, {
      center: [patient.lat, patient.lng],
      zoom: 12,
      zoomControl: true
    });

    // Google Maps 타일
    window.L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}').addTo(mapRef.current);

    console.log('✅ [FIXED] 지도 생성 완료');

    // 환자 마커 (빨간색 원형)
    const patientMarker = window.L.circleMarker([patient.lat, patient.lng], {
      radius: 15,
      fillColor: '#ef4444',
      color: '#ffffff',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(mapRef.current);
    
    patientMarker.bindPopup(`<strong>환자: ${patient.name}</strong><br/>위치: ${patient.lat.toFixed(4)}, ${patient.lng.toFixed(4)}`);
    patientMarker.openPopup();

    console.log('✅ [FIXED] 환자 마커 생성');

    // 병원 마커들 (검은색)
    hospitals.forEach((h, index) => {
      if (h.lat && h.lng) {
        const hospitalMarker = window.L.circleMarker([h.lat, h.lng], {
          radius: 10,
          fillColor: '#000000',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(mapRef.current);

        hospitalMarker.bindPopup(`<strong>🏥 ${h.name}</strong>`);
        console.log(`✅ [FIXED] ${h.name} 마커 생성`);
      }
    });

    console.log(`🎯 [FIXED] 총 ${hospitals.length}개 병원 마커 + 1개 환자 마커 생성 완료`);

  }, [patient, hospitals]);

  return (
    <div className="relative w-full h-full">
      {/* 강력한 디버그 정보 */}
      <div className="absolute top-4 left-4 z-50 bg-blue-600 text-white p-3 rounded shadow-lg">
        <div className="font-bold">🗺️ FIXED MAP</div>
        <div>환자: {patient.name}</div>
        <div>좌표: {patient.lat.toFixed(4)}, {patient.lng.toFixed(4)}</div>
        <div>병원: {hospitals.length}개</div>
        <div>Leaflet: {typeof window.L !== 'undefined' ? 'OK' : 'FAIL'}</div>
      </div>

      {/* 지도 컨테이너 */}
      <div 
        ref={mapContainerRef}
        className="absolute inset-0"
        style={{ 
          height: '100%', 
          width: '100%'
        }}
      ></div>
    </div>
  );
};

export default FixedMap;