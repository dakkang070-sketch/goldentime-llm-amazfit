import React from 'react';
import { Patient, Hospital } from '../types';

interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
}

const ForceMap: React.FC<LiveMapProps> = ({ patient, hospital }) => {
  const mapId = 'force-map-' + Math.random().toString(36);

  React.useEffect(() => {
    // 실제 API에서 병원 데이터 가져오기
    const fetchRealHospitals = async () => {
      try {
        const response = await fetch('/api/emergency/hospitals/map-data');
        const data = await response.json();
        
        if (data.success && data.data?.hospitals) {
          console.log(`🏥 [FORCE] 실제 API에서 ${data.data.hospitals.length}개 병원 데이터 수신`);
          return data.data.hospitals.slice(0, 50); // 처음 50개만
        }
      } catch (error) {
        console.error('❌ [FORCE] API 요청 실패:', error);
      }
      return null;
    };

    const initMap = async () => {
      console.log('🚨 [FORCE] 강제 지도 초기화 시작');
      
      const container = document.getElementById(mapId);
      if (!container) {
        console.error('❌ [FORCE] 컨테이너 없음');
        return;
      }

      if (typeof window.L === 'undefined') {
        console.error('❌ [FORCE] Leaflet 없음');
        return;
      }

      const L = window.L;
      
      try {
        // 지도 생성
        const map = L.map(container, {
          center: [37.5665, 126.9780],
          zoom: 11,
          zoomControl: true
        });

        // Google Maps 타일 추가
        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          attribution: ''
        }).addTo(map);
        
        console.log('✅ [FORCE] 지도 생성 성공');

        // 실제 병원 데이터 가져오기
        const realHospitals = await fetchRealHospitals();
        
        setTimeout(() => {
          // 환자 마커
          const patientMarker = L.marker([patient.lat, patient.lng])
            .addTo(map)
            .bindPopup(`환자: ${patient.name}`)
            .openPopup();
          
          console.log('✅ [FORCE] 환자 마커 생성');

          // 실제 병원 데이터 또는 테스트 데이터 사용
          const hospitalsToShow = realHospitals || [
            { name: '서울대병원', lat: 37.5796, lng: 127.0007 },
            { name: '삼성병원', lat: 37.4882, lng: 127.0851 },
            { name: '세브란스', lat: 37.5623, lng: 126.9408 }
          ];

          hospitalsToShow.forEach((h, index) => {
            if (h.lat && h.lng) {
              L.marker([h.lat, h.lng])
                .addTo(map)
                .bindPopup(`🏥 ${h.name}`);
              console.log(`✅ [FORCE] ${h.name} 마커 생성`);
            }
          });

          console.log(`🎯 [FORCE] 총 ${hospitalsToShow.length}개 병원 마커 생성 완료`);

        }, 500);

      } catch (error) {
        console.error('❌ [FORCE] 지도 생성 실패:', error);
      }
    };

    // 지연 실행
    setTimeout(initMap, 100);
  }, [patient, mapId]);

  return (
    <div className="relative w-full h-full">
      {/* 강제 디버그 정보 */}
      <div className="absolute top-4 left-4 z-50 bg-red-600 text-white p-3 rounded shadow-lg">
        <div className="font-bold">🚨 FORCE MAP</div>
        <div>환자: {patient.name}</div>
        <div>Leaflet: {typeof window.L !== 'undefined' ? 'OK' : 'FAIL'}</div>
        <div>시간: {new Date().toLocaleTimeString()}</div>
      </div>

      {/* 지도 컨테이너 */}
      <div 
        id={mapId} 
        className="absolute inset-0"
        style={{ 
          height: '100%', 
          width: '100%', 
          backgroundColor: '#f0f0f0',
          border: '2px solid red' 
        }}
      ></div>
    </div>
  );
};

export default ForceMap;