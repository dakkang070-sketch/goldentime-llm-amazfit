import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin } from 'lucide-react';
import { Patient, Hospital } from '../types';
import { apiService } from '../services/apiService';

/**
 * 고정 좌표 보정형 라이브 지도 컴포넌트가 받는 환자/병원 prop 구조입니다.
 */
interface LiveMapFixedProps {
  patient: Patient;
  hospital?: Hospital;
}

/**
 * 병원 마커와 환자 위치를 비교적 안정적으로 표시하기 위한 보정형 지도 컴포넌트입니다.
 */
const LiveMapFixed: React.FC<LiveMapFixedProps> = ({ patient, hospital }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [showHospitals, setShowHospitals] = useState(true);

  const patientCoords: [number, number] = [patient.lat, patient.lng];

  // 지도 초기화 (Leaflet이 이미 로드되어 있다고 가정)
  useEffect(() => {
    /**
     * `initMap` 처리를 수행합니다.
     */
    const initMap = () => {
      try {
        console.log('🗺️ 지도 초기화 시작');
        
        if (!mapContainerRef.current || mapRef.current) {
          return;
        }

        // Leaflet 라이브러리 확인
        const L = (window as any).L;
        if (!L) {
          console.error('❌ Leaflet 라이브러리 없음');
          return;
        }

        // 지도 생성
        mapRef.current = L.map(mapContainerRef.current, {
          center: patientCoords,
          zoom: 11,
          zoomControl: true,
          attributionControl: false
        });

        // 응급 관제 프런트 공통 기준에 맞춰 OSM 타일을 사용합니다.
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          subdomains: ['a', 'b', 'c']
        }).addTo(mapRef.current);

        // 환자 마커 추가 (빨간색)
        const patientMarker = L.marker(patientCoords, {
          icon: L.divIcon({
            html: `<div style="
              width: 20px; 
              height: 20px; 
              background-color: #ef4444; 
              border: 3px solid #ffffff; 
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(239,68,68,0.4);
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(mapRef.current);

        patientMarker.bindPopup(`<strong>🚨 환자</strong><br/>${patient.name}`);
        markersRef.current = [patientMarker];

        console.log('✅ 지도 초기화 완료');
        // 환자 기준 마커까지 만든 뒤 준비 완료로 넘겨야 병원 마커 패스가 첫 요소를 안전하게 재사용할 수 있습니다.
        setIsReady(true);

      } catch (error) {
        console.error('❌ 지도 초기화 실패:', error);
      }
    };

    // 번들 시점에 전역 L이 없을 수 있어 짧은 polling으로 로드 완료를 기다립니다.
    if ((window as any).L) {
      initMap();
    } else {
      const checkLeaflet = setInterval(() => {
        if ((window as any).L) {
          clearInterval(checkLeaflet);
          initMap();
        }
      }, 100);
      
      // 5초 후 타임아웃
      setTimeout(() => {
        clearInterval(checkLeaflet);
        console.error('❌ Leaflet 로딩 타임아웃');
      }, 5000);
    }

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
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
          const hospitalList = response.data.hospitals.slice(0, 100); // 최대 100개
          console.log(`✅ ${hospitalList.length}개 병원 로딩 성공`);
          setHospitals(hospitalList);
        } else {
          // API가 비어도 병원 현황 패널과 마커 토글 흐름은 검증할 수 있게 샘플 병원을 채웁니다.
          const testHospitals = [
            { id: '1', name: '서울대학교병원', lat: 37.5796, lng: 127.0001, status: 'available' },
            { id: '2', name: '세브란스병원', lat: 37.5623, lng: 126.9408, status: 'busy' },
            { id: '3', name: '삼성서울병원', lat: 37.4882, lng: 127.0851, status: 'available' },
            { id: '4', name: '서울아산병원', lat: 37.5266, lng: 127.1082, status: 'available' },
            { id: '5', name: '고려대학교안암병원', lat: 37.5902, lng: 127.0263, status: 'busy' },
            { id: '6', name: '부산대학교병원', lat: 35.2456, lng: 129.0825, status: 'available' },
            { id: '7', name: '경북대학교병원', lat: 35.8893, lng: 128.6100, status: 'available' },
            { id: '8', name: '전남대학교병원', lat: 35.1796, lng: 126.8406, status: 'available' },
            { id: '9', name: '충남대학교병원', lat: 36.3504, lng: 127.3845, status: 'available' },
            { id: '10', name: '강원대학교병원', lat: 37.8813, lng: 127.7298, status: 'available' }
          ];
          
          console.log('🔧 테스트 병원 데이터 사용');
          setHospitals(testHospitals);
        }
      } catch (error) {
        console.error('❌ 병원 데이터 로딩 실패:', error);
        // 보정형 지도도 실패 시 빈 배열로 초기화해 직전 병원 결과가 남아 있는 오해를 막습니다.
        setHospitals([]);
      }
    };

    if (isReady) {
      loadHospitals();
    }
  }, [isReady]);

  // 병원 마커 추가
  useEffect(() => {
    if (!isReady || !mapRef.current || !showHospitals || hospitals.length === 0) {
      return;
    }

    const L = (window as any).L;
    if (!L) return;

    try {
      console.log(`🏥 병원 마커 ${hospitals.length}개 추가 시작`);

      // 기존 병원 마커 제거 (환자 마커 제외)
      markersRef.current.slice(1).forEach(marker => {
        try {
          if (marker && mapRef.current) {
            mapRef.current.removeLayer(marker);
          }
        } catch (error) {
          console.warn('마커 제거 오류:', error);
        }
      });
      
      // 환자 마커는 유지하고 병원 마커만 갈아끼워 토글/재조회 시 중복 누적을 막습니다.
      markersRef.current = markersRef.current.slice(0, 1);

      let successCount = 0;

      // 병원 마커 추가
      hospitals.forEach((hospitalData, index) => {
        try {
          const lat = parseFloat(hospitalData.lat);
          const lng = parseFloat(hospitalData.lng);
          
          if (isNaN(lat) || isNaN(lng)) {
            console.warn(`⚠️ ${hospitalData.name}: 잘못된 좌표`);
            return;
          }

          // 같은 지역 병원이 겹쳐 보이지 않도록 소폭 좌표를 벌려 테스트 표시성을 높입니다.
          const offsetLat = lat + ((index % 10) * 0.002);
          const offsetLng = lng + (Math.floor(index / 10) * 0.002);

          const isMatched = hospital && (
            hospital.id === hospitalData.id || 
            hospital.name?.includes(hospitalData.name)
          );

          // 병원 마커 (검은색 H 아이콘)
          const hospitalMarker = L.marker([offsetLat, offsetLng], {
            icon: L.divIcon({
              html: `<div style="
                width: 18px; 
                height: 18px; 
                background-color: ${isMatched ? '#ef4444' : '#000000'}; 
                border: 2px solid #ffffff; 
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                ${isMatched ? 'animation: blink 1s infinite;' : ''}
              ">
                <span style="
                  color: white; 
                  font-size: 12px; 
                  font-weight: bold;
                  font-family: Arial;
                ">H</span>
              </div>
              <style>
                @keyframes blink {
                  0%, 50% { opacity: 1; }
                  25% { opacity: 0.7; }
                }
              </style>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9]
            })
          }).addTo(mapRef.current);

          // 팝업 내용
          const popupContent = `
            <div style="font-size: 12px; min-width: 150px;">
              <strong>${hospitalData.name}</strong><br/>
              <span style="color: ${
                hospitalData.status === 'available' ? '#10b981' : 
                hospitalData.status === 'busy' ? '#f59e0b' : '#6b7280'
              };">
                ${hospitalData.status === 'available' ? '여유 🟢' : 
                  hospitalData.status === 'busy' ? '혼잡 🟡' : '정상 ⚪'}
              </span>
              ${isMatched ? '<br/><strong style="color: #ef4444;">🎯 매칭됨</strong>' : ''}
            </div>
          `;

          hospitalMarker.bindPopup(popupContent);
          
          // 마우스 오버 이벤트
          hospitalMarker.on('mouseover', function() {
            this.openPopup();
          });

          hospitalMarker.on('mouseout', function() {
            if (!isMatched) {
              this.closePopup();
            }
          });

          markersRef.current.push(hospitalMarker);
          successCount++;

        } catch (error) {
          console.error(`❌ 병원 마커 생성 실패 (${hospitalData.name}):`, error);
        }
      });

      console.log(`✅ 병원 마커 추가 완료: ${successCount}개`);

    } catch (error) {
      console.error('❌ 병원 마커 추가 실패:', error);
    }
  }, [isReady, hospitals, showHospitals, hospital]);

  // 지도 컨트롤 함수들
  /**
   * 현재 선택 환자 좌표로 빠르게 이동해 현장 주변 상황을 확대합니다.
   */
  const flyToPatient = () => {
    if (mapRef.current) {
      mapRef.current.flyTo(patientCoords, 12, { duration: 1 });
    }
  };

  /**
   * 전국 뷰로 돌아가 전체 병원 분포와 환자 위치를 함께 다시 봅니다.
   */
  const flyToNational = () => {
    if (mapRef.current) {
      // 환자 추적 후 전체 분포 확인으로 돌아갈 수 있게 전국 중심/줌을 고정 프리셋으로 둡니다.
      mapRef.current.flyTo([36.3504, 127.3845], 8, { duration: 1.5 });
    }
  };

  /**
   * 테스트용 병원 마커 표시 여부를 토글해 지도 가독성과 성능을 번갈아 확인합니다.
   */
  const toggleHospitals = () => {
    setShowHospitals(!showHospitals);
  };

  if (!isReady) {
    return (
      <div className="w-full h-full bg-[#0a0a0b] flex items-center justify-center">
        <div className="bg-zinc-900/90 border border-white/10 p-6 rounded-xl shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="text-zinc-300">
              <div className="font-medium">지도 시스템 로딩 중...</div>
              <div className="text-sm text-zinc-400 mt-1">Leaflet 지도 초기화</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#0a0a0b]">
      <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
      
      {/* 병원 현황 */}
      {hospitals.length > 0 && (
        // 하단 패널은 지도 마커를 직접 세지 않고 현재 hospitals 배열 기준으로 상태 분포를 즉시 요약합니다.
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
            🗺️ 지도에 {showHospitals ? '병원 마커 표시 중' : '병원 마커 숨김'}
          </div>
        </div>
      )}
      
      {/* 컨트롤 버튼 */}
      <div className="absolute top-8 right-8 z-20 flex flex-col gap-3">
        <button 
          onClick={flyToPatient}
          className="p-3.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl text-zinc-300 hover:text-white shadow-xl active:scale-95 transition-all"
          title="환자 위치로 이동"
        >
          <Crosshair className="w-7 h-7" />
        </button>
        
        <button 
          onClick={flyToNational}
          className="p-3.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl text-zinc-300 hover:text-white shadow-xl active:scale-95 transition-all"
          title="전국 지도 보기"
        >
          <div className="w-7 h-7 flex items-center justify-center text-lg">🇰🇷</div>
        </button>
        
        <button 
          onClick={toggleHospitals}
          className={`p-3.5 backdrop-blur-md border rounded-xl shadow-xl active:scale-95 transition-all ${
            showHospitals 
              ? 'bg-blue-900/80 border-blue-500/30 text-blue-300' 
              : 'bg-zinc-900/80 border-white/10 text-zinc-300'
          } hover:text-white`}
          title="병원 마커 표시/숨김"
        >
          <MapPin className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

/**
 * 보정형 라이브 지도 컴포넌트를 기본 export로 제공합니다.
 */
export default LiveMapFixed;
