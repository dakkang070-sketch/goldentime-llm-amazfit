
import React, { useEffect, useRef, useState } from 'react';
import { 
  Crosshair
} from 'lucide-react';
import { Patient, Hospital, Ambulance, AmbulanceStatus, PatientStatus } from '../types';
import { apiService } from '../services/apiService';

declare var L: any;

interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
  ambulances?: Ambulance[]; // 소방소/응급구조대 아이콘 제거로 선택적으로 변경
  matchedAmbulance?: Ambulance; // 소방소/응급구조대 아이콘 제거로 선택적으로 변경
}

const LiveMap: React.FC<LiveMapProps> = ({ patient, hospital, ambulances, matchedAmbulance }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ 
    patient?: any; 
    hospitals: Record<string, any>;
    allHospitals: Record<string, any>;
  }>({ hospitals: {}, allHospitals: {} });

  const lastTargetIdRef = useRef<string | null>(null);
  const [apiHospitals, setApiHospitals] = useState<any[]>([]);
  const [hospitalStats, setHospitalStats] = useState<any>(null);

  const patientCoords: [number, number] = [patient.lat, patient.lng];

  // 전국 병원용 까만색 아이콘 생성 함수
  const createHospitalIcon = (hospitalData: any, isMatched: boolean = false) => {
    // 매칭된 병원은 깜빡이는 애니메이션 추가
    const blinkAnimation = isMatched ? 
      `<style>
        @keyframes hospital-blink {
          0%, 50% { opacity: 1; transform: scale(1); }
          25% { opacity: 0.7; transform: scale(1.2); }
          75% { opacity: 1; transform: scale(1.15); }
        }
        .hospital-matched { animation: hospital-blink 1.2s infinite; }
      </style>` : '';
    
    const matchedClass = isMatched ? 'hospital-matched' : '';
    
    return L.divIcon({
      className: `hospital-black-icon ${matchedClass}`,
      html: `
        ${blinkAnimation}
        <div class="hospital-marker-container ${matchedClass}">
          <!-- 까만색 원형 배경 (더 진한 검정) -->
          <div class="hospital-circle"></div>
          
          <!-- 중앙 흰색 십자가 -->
          <div class="hospital-cross">
            <div class="cross-vertical"></div>
            <div class="cross-horizontal"></div>
          </div>
          
          ${isMatched ? `
          <!-- 매칭 표시 빨간 링 -->
          <div class="match-ring-outer"></div>
          <div class="match-ring-inner"></div>
          ` : ''}
        </div>
        
        <style>
          .hospital-marker-container {
            position: relative;
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .hospital-circle {
            position: absolute;
            width: 20px;
            height: 20px;
            background-color: #000000;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 3px 6px rgba(0,0,0,0.5);
          }
          
          .hospital-cross {
            position: relative;
            z-index: 10;
            width: 12px;
            height: 12px;
          }
          
          .cross-vertical {
            position: absolute;
            left: 50%;
            top: 2px;
            width: 3px;
            height: 8px;
            background-color: #ffffff;
            transform: translateX(-50%);
          }
          
          .cross-horizontal {
            position: absolute;
            top: 50%;
            left: 2px;
            width: 8px;
            height: 3px;
            background-color: #ffffff;
            transform: translateY(-50%);
          }
          
          .match-ring-outer {
            position: absolute;
            width: 32px;
            height: 32px;
            border: 2px solid #ef4444;
            border-radius: 50%;
            animation: ping 2s infinite;
          }
          
          .match-ring-inner {
            position: absolute;
            width: 28px;
            height: 28px;
            border: 2px solid #f87171;
            border-radius: 50%;
          }
          
          @keyframes ping {
            0% { opacity: 1; transform: scale(0.8); }
            75%, 100% { opacity: 0; transform: scale(1.2); }
          }
        </style>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -13]
    });
  };

  // API에서 병원 데이터 가져오기
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        console.log('🏥 [프론트엔드] API에서 병원 데이터 가져오기 시작');
        console.log('🔍 [프론트엔드] API URL:', 'http://localhost:3000/api/emergency/hospitals/map-data');
        
        const response = await apiService.getMapHospitals();
        
        console.log('🔍 [프론트엔드] API 응답 전체:', JSON.stringify(response, null, 2).substring(0, 1000));
        
        if (response.success && response.data) {
          const hospitals = response.data.hospitals || [];
          setApiHospitals(hospitals);
          setHospitalStats(response.data.stats || null);
          
          console.log(`✅ [프론트엔드] API 병원 데이터 로드 완료: ${hospitals.length}개`);
          console.log('📋 [프론트엔드] 병원 목록 샘플:', hospitals.slice(0, 5).map(h => ({ 
            id: h.id, 
            name: h.name, 
            lat: h.lat, 
            lng: h.lng, 
            status: h.status 
          })));
          
          if (hospitals.length === 0) {
            console.warn('⚠️ [프론트엔드] 병원 데이터가 비어있습니다!');
          }
          
          // 🔧 테스트용 더미 데이터도 추가
          const testHospitals = [
            { id: 'test_h1', name: '테스트병원1', lat: 37.5500, lng: 126.9500, status: 'available' },
            { id: 'test_h2', name: '테스트병원2', lat: 37.5600, lng: 126.9600, status: 'busy' },
            { id: 'test_h3', name: '테스트병원3', lat: 37.5800, lng: 127.0000, status: 'full' }
          ];
          
          console.log('🔧 [테스트] 더미 병원 데이터도 추가:', testHospitals);
          setApiHospitals([...hospitals, ...testHospitals]);
          
        } else {
          console.error('❌ [프론트엔드] 병원 데이터 로드 실패:', response.error);
          // 백엔드 연결 실패 시 더미 데이터로 테스트
          console.log('🔧 [프론트엔드] 백엔드 실패 - 더미 데이터만 사용');
          const fallbackHospitals = [
            { id: 'fallback1', name: '더미병원1', lat: 37.5665, lng: 126.9780, status: 'available' },
            { id: 'fallback2', name: '더미병원2', lat: 37.5700, lng: 126.9800, status: 'busy' },
            { id: 'fallback3', name: '더미병원3', lat: 37.5630, lng: 126.9750, status: 'full' }
          ];
          setApiHospitals(fallbackHospitals);
        }
      } catch (error) {
        console.error('❌ [프론트엔드] 병원 데이터 API 호출 실패:', error);
        console.log('🔧 [프론트엔드] 네트워크 오류 - 더미 데이터 사용');
        const errorFallbackHospitals = [
          { id: 'error1', name: '오류더미병원1', lat: 37.5665, lng: 126.9780, status: 'available' },
          { id: 'error2', name: '오류더미병원2', lat: 37.5700, lng: 126.9800, status: 'busy' }
        ];
        setApiHospitals(errorFallbackHospitals);
      }
    };

    fetchHospitals();
    
    // 15초마다 병원 데이터 갱신 (디버깅용)
    const interval = setInterval(fetchHospitals, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof L === 'undefined') {
      const script = document.createElement('script');
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
      script.crossOrigin = "";
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapContainerRef.current || mapRef.current) return;
      
      console.log('🗺️ [지도 초기화] Leaflet 지도 생성 시작');
      
      mapRef.current = L.map(mapContainerRef.current, {
        center: [36.3504, 127.3845], // 전국 중심 (대전)
        zoom: 8, // 전국을 볼 수 있는 줌 레벨
        minZoom: 6, // 전국 전체 보기 가능
        maxZoom: 18, // 최대 줌
        zoomControl: true, // 줌 컨트롤 활성화
        attributionControl: false,
        preferCanvas: false // SVG 렌더링으로 아이콘 품질 향상
      });
      
      // Google Maps 타일 레이어
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 18,
        attribution: ''
      }).addTo(mapRef.current);
      
      console.log('✅ [지도 초기화] Leaflet 지도 생성 완료');
      
      // 지도 이벤트 리스너
      mapRef.current.on('zoomend', () => {
        const zoom = mapRef.current.getZoom();
        console.log(`🔍 [지도 줌] 현재 줌 레벨: ${zoom}`);
      });
      
      mapRef.current.on('moveend', () => {
        const center = mapRef.current.getCenter();
        console.log(`📍 [지도 이동] 중심점: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`);
      });
    }
  }, []);

  // API에서 가져온 병원들을 지도에 표시
  useEffect(() => {
    console.log('🗺️ [지도 표시] useEffect 실행:', {
      mapExists: !!mapRef.current,
      leafletLoaded: typeof L !== 'undefined',
      hospitalCount: apiHospitals.length,
      hospitalsData: apiHospitals.slice(0, 2)
    });

    if (!mapRef.current || typeof L === 'undefined') {
      console.log('⚠️ [지도 표시] 지도 또는 Leaflet 미준비');
      return;
    }

    // 🚨 긴급 해결: 가장 간단한 방식으로 마커 추가
    console.log('🚨 [긴급] 간단한 HTML 마커 방식 사용');
    
    try {
      // 기존 마커들 모두 제거
      Object.values(markersRef.current.allHospitals).forEach(marker => {
        if (marker && mapRef.current) {
          mapRef.current.removeLayer(marker);
        }
      });
      markersRef.current.allHospitals = {};
      
      // 🚨 강제로 5개 테스트 마커 추가 (무조건 보이는 방식)
      const forceMarkers = [
        { name: '강제테스트1', lat: 37.5665, lng: 126.9780, color: 'red' },
        { name: '강제테스트2', lat: 37.5700, lng: 126.9800, color: 'blue' }, 
        { name: '강제테스트3', lat: 37.5630, lng: 126.9750, color: 'green' },
        { name: '강제테스트4', lat: 37.5600, lng: 126.9900, color: 'purple' },
        { name: '강제테스트5', lat: 37.5800, lng: 127.0000, color: 'orange' }
      ];
      
      forceMarkers.forEach((testData, index) => {
        console.log(`🚨 [강제] 테스트 마커 ${index + 1} 추가: ${testData.name}`);
        
        const forceMarker = L.marker([testData.lat, testData.lng], {
          icon: L.divIcon({
            html: `<div style="
              width: 20px; 
              height: 20px; 
              background-color: ${testData.color}; 
              border: 3px solid white; 
              border-radius: 50%;
              box-shadow: 0 0 10px rgba(0,0,0,0.5);
              position: relative;
              z-index: 10000;
            "></div>`,
            iconSize: [20, 20],
            className: `force-marker-${index}`
          })
        }).addTo(mapRef.current);
        
        forceMarker.bindPopup(`<b>${testData.name}</b><br/>강제 테스트 마커`);
        markersRef.current.allHospitals[`force_${index}`] = forceMarker;
        
        console.log(`✅ [강제] ${testData.name} 마커 추가 성공`);
      });
      
      console.log('🎯 [강제] 5개 강제 테스트 마커 모두 추가 완료');
      
    } catch (error) {
      console.error('❌ [강제] 강제 마커 추가도 실패:', error);
    }

    if (apiHospitals.length === 0) {
      console.log('⚠️ [지도 표시] 병원 데이터 없음 - 테스트 마커만 표시');
      return;
    }

    console.log(`🗺️ [지도 표시] ${apiHospitals.length}개 병원 표시 시작`);
    
    // 기존 병원 마커들 제거
    const existingMarkerCount = Object.keys(markersRef.current.allHospitals).length;
    console.log(`🧹 [지도 표시] 기존 마커 ${existingMarkerCount}개 제거 중`);
    
    Object.values(markersRef.current.allHospitals).forEach(marker => {
      if (marker && mapRef.current) {
        mapRef.current.removeLayer(marker);
      }
    });
    markersRef.current.allHospitals = {};

    let successCount = 0;
    let errorCount = 0;

    console.log(`🗺️ [지도 표시] ${apiHospitals.length}개 병원 마커 생성 시작`);
    
    // 🔧 간단한 방식으로 마커 생성 (복잡한 로직 제거)
    apiHospitals.forEach((hospitalData, index) => {
      try {
        console.log(`🏥 [${index + 1}/${apiHospitals.length}] 병원 처리:`, {
          name: hospitalData.name,
          lat: hospitalData.lat,
          lng: hospitalData.lng,
          status: hospitalData.status
        });

        if (!hospitalData.lat || !hospitalData.lng) {
          console.warn(`⚠️ [지도 표시] ${hospitalData.name}: 좌표 없음 (${hospitalData.lat}, ${hospitalData.lng})`);
          errorCount++;
          return;
        }

        // 전국 범위로 좌표 체크 (한국 전체)
        if (hospitalData.lat < 33.0 || hospitalData.lat > 38.9 || hospitalData.lng < 124.0 || hospitalData.lng > 132.0) {
          console.warn(`⚠️ [지도 표시] ${hospitalData.name}: 한국 범위 벗어남 (${hospitalData.lat}, ${hospitalData.lng})`);
          errorCount++;
          return;
        }

        // 🔧 간단한 좌표 조정 (같은 좌표 방지)
        const offsetLat = hospitalData.lat + (index * 0.003); // 간단한 오프셋
        const offsetLng = hospitalData.lng + ((index % 5) * 0.003); // 5개씩 그룹

        const isMatched = hospital && (
          hospital.id === hospitalData.id || 
          hospital.name?.includes(hospitalData.name) ||
          hospitalData.name?.includes(hospital.name)
        );
        
        console.log(`🏥 [${index + 1}] ${hospitalData.name}: (${offsetLat.toFixed(4)}, ${offsetLng.toFixed(4)})`);
        
        // 🔧 더 눈에 띄는 빨간색 원형 마커 (디버깅용)
        const simpleMarker = L.circleMarker([offsetLat, offsetLng], {
          radius: isMatched ? 15 : 10,
          fillColor: isMatched ? '#ff0000' : '#000000',
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          fillOpacity: 1
        }).addTo(mapRef.current);

        // 🔧 간단한 팝업
        const simplePopup = `
          <div>
            <strong>${hospitalData.name}</strong><br/>
            상태: ${hospitalData.status || 'normal'}<br/>
            좌표: ${offsetLat.toFixed(4)}, ${offsetLng.toFixed(4)}
            ${isMatched ? '<br/><span style="color: red;">🎯 매칭됨</span>' : ''}
          </div>
        `;

        simpleMarker.bindPopup(simplePopup);

        // 매칭된 병원은 자동으로 팝업 표시
        if (isMatched) {
          setTimeout(() => simpleMarker.openPopup(), 500);
        }

        markersRef.current.allHospitals[hospitalData.id] = simpleMarker;
        successCount++;
        
        console.log(`✅ [지도 표시] ${hospitalData.name}: 마커 생성 완료 (${hospitalData.lat.toFixed(4)}, ${hospitalData.lng.toFixed(4)})`);

      } catch (error) {
        console.error(`❌ [지도 표시] ${hospitalData.name}: 마커 생성 실패`, error);
        errorCount++;
      }
    });

    console.log(`🎯 [지도 표시] 완료: 성공 ${successCount}개, 실패 ${errorCount}개, 총 ${apiHospitals.length}개`);
    console.log(`📍 [지도 표시] 지도에 표시된 마커 수: ${Object.keys(markersRef.current.allHospitals).length}개`);
    
    // 🔧 지도에 마커가 표시되었는지 최종 확인
    setTimeout(() => {
      const totalMarkers = Object.keys(markersRef.current.allHospitals).length;
      console.log(`🔍 [최종 확인] 3초 후 지도 마커 수: ${totalMarkers}개`);
      if (totalMarkers === 0) {
        console.error('🚨 [최종 확인] 마커가 하나도 표시되지 않았습니다!');
      } else {
        console.log('✅ [최종 확인] 마커 표시 성공!');
      }
    }, 3000);
    
  }, [apiHospitals, hospital?.id, hospital?.name]);

  // 소방소/응급구조대 아이콘 표시 비활성화 (사용자 요청에 따라 제거됨)
  // useEffect(() => {
  //   // ambulances 관련 코드 제거됨
  // }, []);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;

    if (markersRef.current.patient) mapRef.current.removeLayer(markersRef.current.patient);
    const patientIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="relative flex items-center justify-center">
              <div class="absolute w-12 h-12 bg-red-600/30 rounded-full animate-ping"></div>
              <div class="w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center relative z-10">
                <div class="w-2 h-2 bg-white rounded-full"></div>
              </div>
             </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    markersRef.current.patient = L.marker(patientCoords, { icon: patientIcon }).addTo(mapRef.current);

    // 선택된 병원 처리는 위의 API 병원 표시에서 통합 처리됨
    // (이제 API에서 가져온 병원들에 매칭 정보가 포함되어 표시됨)
  }, [patient.id, hospital?.id]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0b]">
      {/* 전국 병원 아이콘 전용 CSS 스타일 */}
      <style jsx global>{`
        .hospital-black-icon {
          z-index: 1000 !important;
        }
        
        .hospital-black-icon .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .hospital-matched {
          z-index: 2000 !important;
        }
        
        /* 축척에 관계없이 병원 아이콘 크기 유지 */
        .leaflet-zoom-anim .hospital-black-icon {
          transition: none !important;
        }
        
        /* 지도 줌 시 아이콘 크기 고정 */
        .leaflet-marker-icon.hospital-black-icon {
          width: 26px !important;
          height: 26px !important;
          margin-left: -13px !important;
          margin-top: -13px !important;
        }
        
        /* 전국 지도를 위한 추가 스타일 */
        .leaflet-container {
          font-family: 'Helvetica Neue', Arial, sans-serif;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
      `}</style>
      
      <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-4xl">
        {/* 병원 현황 통계 */}
        {hospitalStats && (
          <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-4 rounded-xl shadow-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-300 font-medium">🏥 실시간 병원 현황</span>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-400 font-medium">여유 {hospitalStats.available}개</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-yellow-400 font-medium">혼잡 {hospitalStats.busy}개</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-red-400 font-medium">포화 {hospitalStats.full}개</span>
                </div>
                <span className="text-zinc-400 font-medium">전체 {hospitalStats.total}개</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-8 right-8 z-20 flex flex-col gap-3">
        <button 
          onClick={() => mapRef.current?.flyTo(patientCoords, 12, { duration: 1 })} 
          className="p-3.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl text-zinc-300 hover:text-white shadow-xl active:scale-95 transition-all"
          title="환자 위치로 이동"
        >
          <Crosshair className="w-7 h-7" />
        </button>
        <button 
          onClick={() => mapRef.current?.flyTo([37.5665, 126.9780], 11, { duration: 1 })} 
          className="p-3.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl text-zinc-300 hover:text-white shadow-xl active:scale-95 transition-all"
          title="서울 병원 집중 보기"
        >
          <div className="w-7 h-7 flex items-center justify-center text-lg">
            🏥
          </div>
        </button>
        <button 
          onClick={() => mapRef.current?.flyTo([36.3504, 127.3845], 7, { duration: 1.5 })} 
          className="p-3.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl text-zinc-300 hover:text-white shadow-xl active:scale-95 transition-all"
          title="전국 지도 보기"
        >
          <div className="w-7 h-7 flex items-center justify-center text-lg">
            🇰🇷
          </div>
        </button>
      </div>
    </div>
  );
};

export default LiveMap;
