
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Crosshair
} from 'lucide-react';
import { Patient, Hospital, Ambulance, AmbulanceStatus, PatientStatus } from '../types';
import { apiService } from '../services/apiService';

declare var L: any;
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

/**
 * 라이브 지도 컴포넌트가 외부에서 전달받는 환자, 병원, 구급차 prop 구조입니다.
 */
interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
  ambulances?: Ambulance[]; // 소방소/응급구조대 아이콘 제거로 선택적으로 변경
  matchedAmbulance?: Ambulance; // 소방소/응급구조대 아이콘 제거로 선택적으로 변경
}

/**
 * 환자, 병원, 구급차 경로를 함께 표시하는 실시간 응급 지도 컴포넌트입니다.
 */
const LiveMap: React.FC<LiveMapProps> = ({ patient, hospital, ambulances, matchedAmbulance }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ 
    patient?: any; 
    hospitals: Record<string, any>;
    allHospitals: Record<string, any>;
  }>({ hospitals: {}, allHospitals: {} });
  const routeControlRef = useRef<any>(null); // Leaflet Routing Machine 컨트롤러를 위한 ref
  const routeControlRef = useRef<any>(null); // Leaflet Routing Machine 컨트롤러를 위한 ref

  const lastTargetIdRef = useRef<string | null>(null);
  const [apiHospitals, setApiHospitals] = useState<any[]>([]);
  const [hospitalStats, setHospitalStats] = useState<any>(null);

  const patientCoords: [number, number] = [patient.lat, patient.lng];

  /**
   * Leaflet 지도와 기본 타일 레이어를 한 번만 초기화합니다.
   */
  const initMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return; // 이미 지도 생성됨

    if (typeof L === 'undefined') {
      console.error('❌ Leaflet 라이브러리가 로드되지 않았습니다.');
      return;
    }
    if (typeof L.Routing === 'undefined') {
      console.error('❌ Leaflet Routing Machine 라이브러리가 로드되지 않았습니다.');
      return;
    }

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

    // 응급 관제 프런트 공통 기준에 맞춰 OSM 타일을 사용합니다.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      subdomains: ['a', 'b', 'c'],
      maxZoom: 18
    }).addTo(mapRef.current);

    console.log('✅ [지도 초기화] Leaflet 지도 생성 완료');

    // 디버깅 중인 지도라 줌/이동 로그를 남겨 현재 뷰 상태를 계속 추적합니다.
    mapRef.current.on('zoomend', () => {
      const zoom = mapRef.current.getZoom();
      console.log(`🔍 [지도 줌] 현재 줌 레벨: ${zoom}`);
    });

    mapRef.current.on('moveend', () => {
      const center = mapRef.current.getCenter();
      console.log(`📍 [지도 이동] 중심점: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`);
    });
  }, []);

  // 환자 클릭 시 경로 표시
  /**
   * 환자 마커 클릭 시 현재 매칭 병원까지의 경로를 지도에 그립니다.
   */
  const handlePatientClick = (p: Patient) => {
    if (!mapRef.current) return;

    // 기존 경로 제거
    if (routeControlRef.current) {
      mapRef.current.removeControl(routeControlRef.current);
      routeControlRef.current = null;
    }

    const matchedHosp = apiHospitals.find(h => h.id === p.matchedHospitalId);

    if (matchedHosp) {
      console.log(`🗺️ [경로 생성] 환자 ${p.name} (${p.lat}, ${p.lng}) -> 병원 ${matchedHosp.name} (${matchedHosp.lat}, ${matchedHosp.lng})`);
      routeControlRef.current = L.Routing.control({
        waypoints: [
          L.latLng(p.lat, p.lng),
          L.latLng(matchedHosp.lat, matchedHosp.lng)
        ],
        router: L.Routing.osrmv1({
          serviceUrl: `https://router.project-osrm.org/route/v1`,
          profile: 'driving'
        }),
        lineOptions: {
          styles: [
            { color: 'blue', weight: 6, opacity: 0.6, dashArray: '10, 10' }
          ]
        },
        altLineOptions: {
          styles: [
            { color: 'red', weight: 6, opacity: 0.6, dashArray: '10, 10' }
          ]
        },
        createMarker: function() { return null; }, // 기본 마커 사용 안 함
        show: false, // 경로 요약 정보 숨김
        addWaypoints: false, // 웨이포인트 추가 기능 비활성화
        fitSelectedRoutes: true, // 경로에 맞게 지도 줌
        routeWhileDragging: false // 드래그 중 경로 업데이트 비활성화
      }).addTo(mapRef.current);

      // 경로 탐색 성공 시에는 요약 로그만 남기고 UI는 기존 환자/병원 마커 팝업을 그대로 재사용합니다.
      routeControlRef.current.on('routesfound', function(e: any) {
        const routes = e.routes;
        const summary = routes[0].summary;
        console.log('🚗 [경로 탐색 완료]', {
          totalDistance: (summary.totalDistance / 1000).toFixed(1) + ' km',
          totalTime: (summary.totalTime / 60).toFixed(1) + ' min'
        });

        // 환자 마커 팝업을 다시 열어 경로 정보 표시 (선택 사항)
        // if (markersRef.current.patient) {
        //   markersRef.current.patient.setPopupContent(
        //     `<strong>환자: ${p.name}</strong><br/>` +
        //     `매칭 병원: ${matchedHosp.name}<br/>` +
        //     `거리: ${(summary.totalDistance / 1000).toFixed(1)} km<br/>` +
        //     `시간: ${(summary.totalTime / 60).toFixed(1)} min`
        //   ).openPopup();
        // }
      });

    } else {
      console.warn(`⚠️ 환자 ${p.name} 에 대해 매칭된 병원을 찾을 수 없습니다. 경로를 표시하지 않습니다.`);
    }
  };
  
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
    /**
     * `fetchHospitals` 관련 데이터를 계산하거나 변환합니다.
     */
    const fetchHospitals = async () => {
      console.log('🏥 [프론트엔드] 임시 병원 데이터 로드 중...');
      const fallbackHospitals = [
        { id: 'hosp-1', name: '서울삼성병원', lat: 37.4878, lng: 127.0505, status: 'available' },
        { id: 'hosp-2', name: '강남세브란스병원', lat: 37.5262, lng: 127.0425, status: 'busy' },
        { id: 'hosp-3', name: '서울아산병원', lat: 37.5266, lng: 127.1009, status: 'full' },
        { id: 'hosp-4', name: '세브란스병원', lat: 37.5792, lng: 126.9367, status: 'available' },
        { id: 'hosp-5', name: '고려대학교 안암병원', lat: 37.5878, lng: 127.0298, status: 'busy' },
      ];
      // 현재는 API 대신 임시 병원 세트를 계속 주입해 지도 마커 렌더링만 검증합니다.
      setApiHospitals(fallbackHospitals);
      setHospitalStats({ available: 2, busy: 2, full: 1, total: 5 });
      console.log('✅ [프론트엔드] 임시 병원 데이터 로드 완료:', fallbackHospitals);
    };

    fetchHospitals();
    
    // 디버깅 중인 임시 세트라 15초마다 다시 주입해 마커 갱신/정리 흐름만 반복 검증합니다.
    const interval = setInterval(fetchHospitals, 15000);
    return () => clearInterval(interval);
  }, []);

  // 초기 지도 로드 및 Leaflet 라이브러리 로드
  useEffect(() => {
    // Leaflet 및 Routing Machine CSS 로드
    // require('leaflet/dist/leaflet.css'); // 이미 전역에서 로드
    // require('leaflet-routing-machine/dist/leaflet-routing-machine.css'); // 이미 전역에서 로드
    
    // Leaflet 라이브러리 로드 확인 (외부 스크립트 로드 방식 대신)
    // L 객체가 전역에 정의되어 있다고 가정
    if (typeof L !== 'undefined') {
      initMap();
    } else {
      // 만약 L이 정의되지 않았다면, 스크립트 로딩 로직을 여기에 포함
      console.warn('⚠️ Leaflet 전역 객체 L이 정의되지 않았습니다. 수동 로드가 필요할 수 있습니다.');
      // 이 부분은 개발 환경에 따라 다를 수 있으므로 일단 경고만 표시
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initMap]);

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
        { name: '강제테스트1', lat: 36.3504, lng: 127.3845, color: 'red' },
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

        // 동일하거나 가까운 좌표가 겹치지 않게 임시 오프셋을 줘 디버그 마커가 전부 보이게 합니다.
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
    // 환자 마커는 최신 좌표/상태 기준으로 매번 다시 그려 클릭 시 경로 탐색 진입점으로 사용합니다.
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
    
    markersRef.current.patient.on('click', () => handlePatientClick(patient));

    // 선택된 병원 처리는 위의 API 병원 표시에서 통합 처리됨
    // (이제 API에서 가져온 병원들에 매칭 정보가 포함되어 표시됨)
  }, [patient.id, hospital?.id]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0b]">
      {/* 전국 병원 아이콘 전용 CSS 스타일 */}
      <style>{`
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
      
      {/* 환자 마커 */} 
      {patient && ( 
        <L.Marker position={[patient.lat, patient.lng]} icon={L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="relative flex items-center justify-center">
                  <div class="absolute w-12 h-12 bg-red-600/30 rounded-full animate-ping"></div>
                  <div class="w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center relative z-10">
                    <div class="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                 </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })} 
        eventHandlers={{
          click: () => handlePatientClick(patient),
        }}>
          <L.Popup>
            <strong>환자: {patient.name}</strong><br/>
            상태: {patient.status}<br/>
            위치: {patient.lat.toFixed(4)}, {patient.lng.toFixed(4)}
            {matchedHospital && (
              <> <br/>매칭 병원: {matchedHospital.name}</>
            )}
          </L.Popup>
        </L.Marker>
      )}

      {/* 매칭된 병원 마커 */} 
      {matchedHospital && ( 
        <L.Marker position={[matchedHospital.lat, matchedHospital.lng]} icon={createHospitalIcon(matchedHospital, true)}>
          <L.Popup>
            <strong>매칭 병원: {matchedHospital.name}</strong><br/>
            상태: {matchedHospital.status}<br/>
            위치: {matchedHospital.lat.toFixed(4)}, {matchedHospital.lng.toFixed(4)}
          </L.Popup>
        </L.Marker>
      )}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-4xl">
        {/* 병원 현황 통계 */}
        {hospitalStats && (
          // 하단 요약 패널은 현재 지도에 올린 병원 배열 기준으로 가용/혼잡/포화 분포를 한 번에 보여줍니다.
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
          // 첫 버튼은 언제든 환자 현재 좌표로 복귀해 추적 시작점을 다시 맞추는 용도입니다.
          onClick={() => mapRef.current?.flyTo(patientCoords, 12, { duration: 1 })} 
          className="p-3.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl text-zinc-300 hover:text-white shadow-xl active:scale-95 transition-all"
          title="환자 위치로 이동"
        >
          <Crosshair className="w-7 h-7" />
        </button>
        <button 
          // 두 번째 버튼은 서울 병원 밀집 구간으로 바로 점프해 병원 분포를 확인하게 합니다.
          onClick={() => mapRef.current?.flyTo([36.3504, 127.3845], 11, { duration: 1 })} 
          className="p-3.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl text-zinc-300 hover:text-white shadow-xl active:scale-95 transition-all"
          title="서울 병원 집중 보기"
        >
          <div className="w-7 h-7 flex items-center justify-center text-lg">
            🏥
          </div>
        </button>
        <button 
          // 마지막 버튼은 전국 스케일로 축소해 전체 병원 네트워크 분포를 빠르게 보는 용도입니다.
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

/**
 * 실시간 응급 지도 컴포넌트를 기본 export로 제공합니다.
 */
export default LiveMap;
