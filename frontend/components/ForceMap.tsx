import React from 'react';
import { Patient, Hospital } from '../types';
import { buildApiUrl } from '../services/runtimeConfig';

/**
 * 강제 렌더링 지도 테스트 컴포넌트가 받는 환자/병원 prop 구조입니다.
 */
interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
}

/**
 * 외부 API 병원 데이터를 포함해 강제로 지도 렌더링을 시도하는 테스트용 컴포넌트입니다.
 */
const ForceMap: React.FC<LiveMapProps> = ({ patient, hospital }) => {
  // 여러 디버그 지도가 동시에 떠도 이전 DOM id와 충돌하지 않게 랜덤 컨테이너 id를 씁니다.
  const mapId = 'force-map-' + Math.random().toString(36);

  React.useEffect(() => {
    // 실제 API에서 병원 데이터 가져오기
    const fetchRealHospitals = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/emergency/hospitals/map-data'));
        const data = await response.json();
        
        if (data.success && data.data?.hospitals) {
          // 디버그 맵에서는 전체를 다 그리지 않고 앞쪽 50개만 써서 렌더링 부담을 줄입니다.
          console.log(`🏥 [FORCE] 실제 API에서 ${data.data.hospitals.length}개 병원 데이터 수신`);
          return data.data.hospitals.slice(0, 50); // 처음 50개만
        }
      } catch (error) {
        console.error('❌ [FORCE] API 요청 실패:', error);
      }
      return null;
    };

    /**
     * `initMap` 처리를 수행합니다.
     */
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
          center: [36.3504, 127.3845],
          zoom: 11,
          zoomControl: true
        });

        // 응급 관제 프런트 공통 기준에 맞춰 OSM 타일을 사용합니다.
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          subdomains: ['a', 'b', 'c']
        }).addTo(map);
        
        console.log('✅ [FORCE] 지도 생성 성공');

        // 실제 병원 데이터 가져오기
        const realHospitals = await fetchRealHospitals();
        
        setTimeout(() => {
          // 강제 맵도 타일이 붙은 뒤 마커를 올려 초기 렌더 순서 문제를 따로 분리해 봅니다.
          // 환자 마커
          const patientMarker = L.marker([patient.lat, patient.lng])
            .addTo(map)
            .bindPopup(`환자: ${patient.name}`)
            .openPopup();
          
          console.log('✅ [FORCE] 환자 마커 생성');

          // 실제 병원 데이터 또는 테스트 데이터 사용
          // API가 비어도 최소 3개 병원으로 환자-병원-팝업 렌더 흐름 자체는 계속 검증할 수 있게 둡니다.
          const hospitalsToShow = realHospitals || [
            { name: '서울대병원', lat: 37.5796, lng: 127.0007 },
            { name: '삼성병원', lat: 37.4882, lng: 127.0851 },
            { name: '세브란스', lat: 37.5623, lng: 126.9408 }
          ];

          hospitalsToShow.forEach((h, index) => {
            if (h.lat && h.lng) {
              // 강제 렌더 맵은 병원별 상태색 대신 기본 마커만 올려 "마커가 찍히는가" 여부만 확인합니다.
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

    // 컨테이너가 실제 DOM에 붙은 뒤 초기화되도록 짧게 지연 실행합니다.
    setTimeout(initMap, 100);
  }, [patient, mapId]);

  return (
    <div className="relative w-full h-full">
      {/* 좌상단 패널은 강제 렌더 성공 여부를 시간과 Leaflet 로드 상태로 바로 확인하는 HUD입니다. */}
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
          // 연한 배경과 빨간 테두리를 둬 타일이 실패해도 컨테이너 자체는 즉시 눈에 띄게 합니다.
          height: '100%', 
          width: '100%', 
          backgroundColor: '#f0f0f0',
          border: '2px solid red' 
        }}
      ></div>
    </div>
  );
};

/**
 * 강제 렌더링 지도 컴포넌트를 기본 export로 제공합니다.
 */
export default ForceMap;
