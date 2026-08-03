import React, { useEffect, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { Patient, Hospital } from '../types';
import { apiService } from '../services/apiService';

declare var L: any;

/**
 * 안정화 버전 라이브 지도 컴포넌트가 받는 환자/병원 prop 구조입니다.
 */
interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
}

/**
 * 지도 초기화와 마커 표시를 안정적으로 유지하려는 실험용 안정화 지도 컴포넌트입니다.
 */
const LiveMapStable: React.FC<LiveMapProps> = ({ patient, hospital }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [currentZoom, setCurrentZoom] = useState(7);

  const patientCoords: [number, number] = [patient.lat, patient.lng];

  // Leaflet 라이브러리 로딩 및 지도 초기화
  useEffect(() => {
    /**
     * `initializeMap` 처리를 수행합니다.
     */
    const initializeMap = async () => {
      try {
        console.log('🗺️ 지도 시스템 초기화 시작');

        // 안정화 버전은 전역 L이 없을 때만 동적으로 로드해 초기화 실패 원인을 줄입니다.
        if (typeof (window as any).L === 'undefined') {
          console.log('📦 Leaflet 라이브러리 로딩');
          
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Leaflet 로딩 실패'));
            document.head.appendChild(script);
            
            setTimeout(() => reject(new Error('Leaflet 로딩 타임아웃')), 5000);
          });
        }

        const L = (window as any).L;
        if (!L || !mapContainerRef.current) {
          throw new Error('Leaflet 또는 지도 컨테이너 없음');
        }

        console.log('🗺️ 지도 객체 생성');
        
        // 지도 생성
        mapRef.current = L.map(mapContainerRef.current, {
          center: [36.3504, 127.3845],
          zoom: 7,
          zoomControl: true,
          attributionControl: false
        });

        // 응급 관제 프런트 공통 기준에 맞춰 OSM 타일을 사용합니다.
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          subdomains: ['a', 'b', 'c']
        }).addTo(mapRef.current);

        // 줌 이벤트 리스너
        mapRef.current.on('zoomend', () => {
          const zoom = mapRef.current.getZoom();
          setCurrentZoom(zoom);
          console.log(`🔍 줌 레벨 변경: ${zoom}`);
        });

        // 환자 마커 추가
        const patientMarker = L.circleMarker(patientCoords, {
          radius: 10,
          fillColor: '#ef4444',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(mapRef.current);

        patientMarker.bindPopup(`<strong>🚨 환자</strong><br/>${patient.name}`);
        markersRef.current.push(patientMarker);

        console.log('✅ 지도 초기화 완료');
        setIsReady(true);

      } catch (error) {
        console.error('❌ 지도 초기화 실패:', error);
        // 에러가 발생해도 기본 상태로 설정
        setIsReady(false);
      }
    };

    initializeMap();

    // 클린업
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.warn('지도 제거 중 오류:', error);
        }
      }
    };
  }, [patient.lat, patient.lng, patient.name]);

  // 병원 데이터 로딩
  useEffect(() => {
    /**
     * `loadHospitals` 관련 데이터를 계산하거나 변환합니다.
     */
    const loadHospitals = async () => {
      try {
        console.log('🏥 병원 데이터 로딩');
        const response = await apiService.getMapHospitals();
        
        if (response.success && response.data?.hospitals) {
          console.log(`✅ ${response.data.hospitals.length}개 병원 로딩 성공`);
          setHospitals(response.data.hospitals);
        } else {
          // 간단한 테스트 데이터
          const testHospitals = [
            { id: '1', name: '서울대학교병원', lat: 37.5796, lng: 127.0001, status: 'available' },
            { id: '2', name: '세브란스병원', lat: 37.5623, lng: 126.9408, status: 'busy' },
            { id: '3', name: '삼성서울병원', lat: 37.4882, lng: 127.0851, status: 'available' },
            { id: '4', name: '부산대학교병원', lat: 35.2456, lng: 129.0825, status: 'available' },
            { id: '5', name: '대구가톨릭대학교병원', lat: 35.8583, lng: 128.5654, status: 'busy' }
          ];
          console.log('🔧 테스트 병원 데이터 사용');
          setHospitals(testHospitals);
        }
      } catch (error) {
        console.error('❌ 병원 데이터 로딩 실패:', error);
        setHospitals([]);
      }
    };

    if (isReady) {
      loadHospitals();
    }
  }, [isReady]);

  // 병원 마커 추가 (줌 레벨 8 이상에서만)
  useEffect(() => {
    if (!isReady || !mapRef.current || currentZoom < 8) {
      return;
    }

    const L = (window as any).L;
    if (!L) return;

    try {
      console.log(`🏥 줌 레벨 ${currentZoom} - 병원 마커 ${hospitals.length}개 추가`);

      // 환자 마커는 남기고 병원 마커만 교체해 줌 변화 시 중복 누적을 막습니다.
      markersRef.current.slice(1).forEach(marker => {
        try {
          mapRef.current.removeLayer(marker);
        } catch (error) {
          console.warn('마커 제거 오류:', error);
        }
      });
      markersRef.current = markersRef.current.slice(0, 1); // 환자 마커만 유지

      // 병원 마커 추가
      hospitals.forEach((hospitalData, index) => {
        try {
          const lat = parseFloat(hospitalData.lat);
          const lng = parseFloat(hospitalData.lng);
          
          if (isNaN(lat) || isNaN(lng)) return;

          // 동일 좌표 병원이 겹쳐 안 보이지 않게 테스트용으로 소폭 분산 배치합니다.
          const offsetLat = lat + (index * 0.001);
          const offsetLng = lng + (index * 0.001);

          const isMatched = hospital && hospital.name === hospitalData.name;
          
          const hospitalMarker = L.circleMarker([offsetLat, offsetLng], {
            radius: 6,
            fillColor: isMatched ? '#ef4444' : '#000000',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          });

          hospitalMarker.addTo(mapRef.current);
          
          const popupContent = `
            <div style="font-size: 12px;">
              <strong>${hospitalData.name}</strong><br/>
              <span style="color: ${
                hospitalData.status === 'available' ? '#10b981' : 
                hospitalData.status === 'busy' ? '#f59e0b' : '#6b7280'
              };">
                ${hospitalData.status === 'available' ? '여유 🟢' : 
                  hospitalData.status === 'busy' ? '혼잡 🟡' : '정상 ⚪'}
              </span>
            </div>
          `;
          
          hospitalMarker.bindPopup(popupContent);
          markersRef.current.push(hospitalMarker);

        } catch (error) {
          console.warn(`병원 마커 생성 오류 (${hospitalData.name}):`, error);
        }
      });

      console.log(`✅ 병원 마커 추가 완료: ${markersRef.current.length - 1}개`);

    } catch (error) {
      console.error('❌ 병원 마커 추가 실패:', error);
    }
  }, [isReady, hospitals, currentZoom, hospital]);

  // 지도 컨트롤 함수들
  /**
   * 환자 위치로 즉시 이동해 상세 현장 상태를 살펴볼 때 사용합니다.
   */
  const flyToPatient = () => {
    if (mapRef.current) {
      mapRef.current.flyTo(patientCoords, 12, { duration: 1 });
    }
  };

  /**
   * 전국 시야로 복귀해 환자와 병원 분포를 전체적으로 다시 확인합니다.
   */
  const flyToNational = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([36.3504, 127.3845], 8, { duration: 1.5 });
    }
  };

  /**
   * 서울권으로 이동해 병원 밀집 구간을 빠르게 점검할 때 사용합니다.
   */
  const flyToSeoul = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([36.3504, 127.3845], 11, { duration: 1 });
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0a0a0b]">
      <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
      
      {/* 로딩 상태 */}
      {!isReady && (
        <div className="absolute inset-0 z-30 bg-[#0a0a0b]/90 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-zinc-900/90 border border-white/10 p-6 rounded-xl shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="text-zinc-300">
                <div className="font-medium">안정적인 지도 시스템 로딩 중...</div>
                <div className="text-sm text-zinc-400 mt-1">Leaflet 라이브러리 초기화</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 병원 현황 */}
      {isReady && hospitals.length > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-zinc-300 font-medium">🏥 전국 병원</span>
            <div className="flex gap-4">
              <span className="text-green-400">여유: {hospitals.filter(h => h.status === 'available').length}개</span>
              <span className="text-yellow-400">혼잡: {hospitals.filter(h => h.status === 'busy').length}개</span>
              <span className="text-zinc-400">총 {hospitals.length}개</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-zinc-400 text-center">
            {currentZoom >= 8 ? 
              `🔍 줌 레벨 ${currentZoom} - 병원 마커 표시 중` : 
              `🔍 줌 레벨 ${currentZoom} - 확대하면 병원이 표시됩니다 (줌 8+)`
            }
          </div>
        </div>
      )}
      
      {/* 컨트롤 버튼 */}
      <div className="absolute top-8 right-8 z-20 flex flex-col gap-3">
        <button 
          onClick={flyToPatient}
          disabled={!isReady}
          className="p-3.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl text-zinc-300 hover:text-white shadow-xl active:scale-95 transition-all disabled:opacity-50"
          title="환자 위치로 이동"
        >
          <Crosshair className="w-7 h-7" />
        </button>
        
        <button 
          onClick={flyToSeoul}
          disabled={!isReady}
          className="p-3.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl text-zinc-300 hover:text-white shadow-xl active:scale-95 transition-all disabled:opacity-50"
          title="서울 지역 보기"
        >
          <div className="w-7 h-7 flex items-center justify-center text-lg">🏙️</div>
        </button>
        
        <button 
          onClick={flyToNational}
          disabled={!isReady}
          className="p-3.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl text-zinc-300 hover:text-white shadow-xl active:scale-95 transition-all disabled:opacity-50"
          title="전국 지도 + 병원 보기"
        >
          <div className="w-7 h-7 flex items-center justify-center text-lg">🏥</div>
        </button>
      </div>
    </div>
  );
};

/**
 * 안정화 라이브 지도 컴포넌트를 기본 export로 제공합니다.
 */
export default LiveMapStable;
