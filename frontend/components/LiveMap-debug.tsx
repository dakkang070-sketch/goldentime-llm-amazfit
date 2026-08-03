import React, { useEffect, useRef, useState } from 'react';
import { Patient, Hospital } from '../types';

declare var L: any;

/**
 * 디버그용 라이브 지도 컴포넌트가 받는 환자/병원 prop 구조입니다.
 */
interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
}

/**
 * 지도 표시 문제를 추적하기 위한 디버그 전용 라이브 지도 컴포넌트입니다.
 */
const LiveMapDebug: React.FC<LiveMapProps> = ({ patient, hospital }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);

  // 실제 API와 분리해 지도 마커 표시 여부만 빠르게 확인하는 고정 테스트 세트입니다.
  const testHospitals = [
    { id: '1', name: '서울대학교병원', lat: 37.5796, lng: 127.0007 },
    { id: '2', name: '삼성서울병원', lat: 37.4882, lng: 127.0851 },
    { id: '3', name: '세브란스병원', lat: 37.5623, lng: 126.9408 },
    { id: '4', name: '서울아산병원', lat: 37.5266, lng: 127.1082 },
    { id: '5', name: '고려대학교의료원', lat: 37.5902, lng: 127.0263 }
  ];

  // 지도 초기화
  useEffect(() => {
    // 디버그 지도도 한 번만 붙여야 하므로 컨테이너 없음/기존 map 존재 시 즉시 중단합니다.
    if (!mapContainerRef.current || mapRef.current) return;

    console.log('🚨 [DEBUG] 지도 초기화 시작');

    mapRef.current = L.map(mapContainerRef.current, {
      center: [36.3504, 127.3845],
      zoom: 11,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      subdomains: ['a', 'b', 'c']
    }).addTo(mapRef.current);

    console.log('✅ [DEBUG] 지도 초기화 완료');
    // 타일 레이어까지 붙은 뒤 준비 완료로 바꿔야 이후 마커 테스트가 빈 맵 상태와 섞이지 않습니다.
    setMapReady(true);
  }, []);

  // 병원 마커 생성
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    console.log('🚨 [DEBUG] 마커 생성 시작');

    // 여기서는 매칭/상태 색상 분기 없이 단일 스타일만 써서 순수 렌더링 성공 여부만 확인합니다.
    // 환자 1개와 테스트 병원 여러 개를 같은 화면에 바로 올려 기본 렌더링만 검증합니다.
    const patientMarker = L.circleMarker([patient.lat, patient.lng], {
      radius: 12,
      fillColor: '#ef4444',
      color: '#ffffff',
      weight: 3,
      opacity: 1,
      fillOpacity: 1
    }).addTo(mapRef.current);
    patientMarker.bindPopup(`환자: ${patient.name}`);

    // 병원 마커들
    testHospitals.forEach((h, index) => {
      // 병원도 동일 primitive로만 찍어 아이콘 자산/커스텀 마커 문제를 완전히 배제합니다.
      const marker = L.circleMarker([h.lat, h.lng], {
        radius: 10,
        fillColor: '#000000',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1
      }).addTo(mapRef.current);

      marker.bindPopup(`<strong>${h.name}</strong>`);
      console.log(`✅ [DEBUG] ${h.name} 마커 생성 완료`);
    });

    console.log(`🎯 [DEBUG] 총 ${testHospitals.length + 1}개 마커 생성 완료`);

    // 이 디버그 패스는 정리보다 "마커가 실제로 한 번이라도 보였는지" 확인이 우선이라 별도 cleanup을 두지 않습니다.
  }, [mapReady, patient]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0b]">
      {/* 디버그 패스는 지도 외 레이어 간섭을 줄이려고 Leaflet 컨테이너를 가장 단순한 절대 배치로 유지합니다. */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
      
      {/* 좌상단 패널은 지도/Leaflet 준비 여부를 코드 수정 없이 즉시 눈으로 확인하기 위한 상태 HUD입니다. */}
      {/* 디버그 정보 */}
      <div className="absolute top-4 left-4 z-20 bg-black/80 text-white p-4 rounded">
        <h3 className="font-bold mb-2">🚨 DEBUG MAP</h3>
        <p>지도 준비: {mapReady ? '✅' : '❌'}</p>
        <p>환자: {patient.name}</p>
        <p>병원 수: {testHospitals.length}개</p>
        <p>Leaflet: {typeof L !== 'undefined' ? '✅' : '❌'}</p>
      </div>
    </div>
  );
};

/**
 * 디버그용 라이브 지도 컴포넌트를 기본 export로 제공합니다.
 */
export default LiveMapDebug;
