import React, { useEffect, useRef } from 'react';
import { Patient, Hospital } from '../types';

declare var L: any;

interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
}

const SimpleMap: React.FC<LiveMapProps> = ({ patient, hospital }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    console.log('🚨 [SIMPLE] 지도 생성 시작');
    console.log('🚨 [SIMPLE] Leaflet 객체:', typeof L, L);

    try {
      // 기존 지도 제거
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // 새 지도 생성
      mapRef.current = L.map(mapContainerRef.current, {
        center: [37.5665, 126.9780],
        zoom: 12,
        zoomControl: true
      });

      // 타일 레이어 추가
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);

      console.log('✅ [SIMPLE] 지도 생성 완료');

      // 즉시 마커 추가
      setTimeout(() => {
        console.log('🚨 [SIMPLE] 마커 추가 시작');

        // 환자 마커 (빨간색)
        const patientMarker = L.marker([patient.lat, patient.lng]).addTo(mapRef.current);
        patientMarker.bindPopup(`환자: ${patient.name}`);
        console.log('✅ [SIMPLE] 환자 마커 생성');

        // 병원 마커들 (파란색)
        const hospitals = [
          { name: '서울대병원', lat: 37.5796, lng: 127.0007 },
          { name: '삼성병원', lat: 37.4882, lng: 127.0851 },
          { name: '세브란스', lat: 37.5623, lng: 126.9408 }
        ];

        hospitals.forEach(h => {
          const marker = L.marker([h.lat, h.lng]).addTo(mapRef.current);
          marker.bindPopup(`🏥 ${h.name}`);
          console.log(`✅ [SIMPLE] ${h.name} 마커 생성`);
        });

        console.log('🎯 [SIMPLE] 모든 마커 생성 완료');
      }, 1000);

    } catch (error) {
      console.error('❌ [SIMPLE] 지도 생성 실패:', error);
    }

  }, [patient]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0" style={{ height: '100%', width: '100%' }}></div>
      
      <div className="absolute top-4 left-4 z-50 bg-red-600 text-white p-2 rounded text-sm">
        <div>🚨 SIMPLE MAP TEST</div>
        <div>환자: {patient.name}</div>
        <div>Leaflet: {typeof L !== 'undefined' ? 'OK' : 'FAIL'}</div>
      </div>
    </div>
  );
};

export default SimpleMap;