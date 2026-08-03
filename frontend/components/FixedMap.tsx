import React from 'react';
import { Patient, Hospital } from '../types';
import { buildApiUrl } from '../services/runtimeConfig';

/**
 * 고정형 지도 테스트 컴포넌트가 받는 환자/병원 prop 구조입니다.
 */
interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
}

/**
 * 환자와 병원 위치를 단순 고정 지도에 표시하는 테스트용 지도 컴포넌트입니다.
 */
const FixedMap: React.FC<LiveMapProps> = ({ patient, hospital }) => {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const [hospitals, setHospitals] = React.useState<any[]>([]);

  // 병원 데이터 가져오기
  React.useEffect(() => {
    /**
     * `fetchHospitals` 관련 데이터를 계산하거나 변환합니다.
     */
    const fetchHospitals = async () => {
      try {
        console.log('🏥 [FIXED] API에서 병원 데이터 가져오기');
        const response = await fetch(buildApiUrl('/api/emergency/hospitals/map-data'));
        const data = await response.json();
        
        if (data.success && data.data?.hospitals) {
          // 테스트 맵에서는 상위 일부만 써서 환자/병원 마커 기본 렌더링만 확인합니다.
          const hospitalList = data.data.hospitals.slice(0, 20); // 20개만
          console.log(`✅ [FIXED] ${hospitalList.length}개 병원 데이터 수신`);
          setHospitals(hospitalList);
        } else {
          console.log('⚠️ [FIXED] API 데이터 없음, 테스트 데이터 사용');
          // API 응답이 비어도 최소 병원 세트는 남겨 환자-병원 동시 표시 여부를 계속 검증합니다.
          setHospitals([
            { id: '1', name: '서울대병원', lat: 37.5796, lng: 127.0007 },
            { id: '2', name: '삼성병원', lat: 37.4882, lng: 127.0851 },
            { id: '3', name: '세브란스', lat: 37.5623, lng: 126.9408 }
          ]);
        }
      } catch (error) {
        console.error('❌ [FIXED] API 실패:', error);
        // 예외가 나도 동일 fallback 세트를 써서 지도 자체가 비어 보이지 않게 유지합니다.
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
    // 고정형 테스트는 환자 좌표를 중심으로 시작해 첫 화면에서 환자 마커가 항상 보이게 합니다.
    mapRef.current = window.L.map(mapContainerRef.current, {
      center: [patient.lat, patient.lng],
      zoom: 12,
      zoomControl: true
    });

    // 응급 관제 프런트 공통 기준에 맞춰 OSM 타일을 사용합니다.
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      subdomains: ['a', 'b', 'c']
    }).addTo(mapRef.current);

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

    // 병원 마커들은 동일 스타일의 검은 원형으로만 그려 기본 겹침/표시 여부를 봅니다.
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
      {/* 좌상단 HUD는 좌표/병원 수/Leaflet 준비 상태를 화면에서 바로 확인하기 위한 디버그 오버레이입니다. */}
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

/**
 * 고정형 테스트 지도 컴포넌트를 기본 export로 제공합니다.
 */
export default FixedMap;
