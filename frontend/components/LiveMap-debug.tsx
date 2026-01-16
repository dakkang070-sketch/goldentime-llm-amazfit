import React, { useEffect, useRef, useState } from 'react';
import { Patient, Hospital } from '../types';

declare var L: any;

interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
}

const LiveMapDebug: React.FC<LiveMapProps> = ({ patient, hospital }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);

  // 강제 테스트 병원 데이터
  const testHospitals = [
    { id: '1', name: '서울대학교병원', lat: 37.5796, lng: 127.0007 },
    { id: '2', name: '삼성서울병원', lat: 37.4882, lng: 127.0851 },
    { id: '3', name: '세브란스병원', lat: 37.5623, lng: 126.9408 },
    { id: '4', name: '서울아산병원', lat: 37.5266, lng: 127.1082 },
    { id: '5', name: '고려대학교의료원', lat: 37.5902, lng: 127.0263 }
  ];

  // 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    console.log('🚨 [DEBUG] 지도 초기화 시작');

    mapRef.current = L.map(mapContainerRef.current, {
      center: [37.5665, 126.9780],
      zoom: 11,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}').addTo(mapRef.current);

    console.log('✅ [DEBUG] 지도 초기화 완료');
    setMapReady(true);
  }, []);

  // 병원 마커 생성
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    console.log('🚨 [DEBUG] 마커 생성 시작');

    // 환자 마커
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

  }, [mapReady, patient]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0b]">
      <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
      
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

export default LiveMapDebug;