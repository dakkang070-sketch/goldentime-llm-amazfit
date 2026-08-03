import React, { useEffect, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { Patient, Hospital } from '../types';
import { apiService } from '../services/apiService';

declare var L: any;

/**
 * 단순화된 라이브 지도 컴포넌트가 받는 환자/병원 prop 구조입니다.
 */
interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
}

/**
 * 최소 기능만 남겨 지도 표시를 검증하기 위한 단순형 라이브 지도 컴포넌트입니다.
 */
const LiveMapSimple: React.FC<LiveMapProps> = ({ patient, hospital }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [apiHospitals, setApiHospitals] = useState<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(7);
  const [hospitalMarkersVisible, setHospitalMarkersVisible] = useState(false);

  const patientCoords: [number, number] = [patient.lat, patient.lng];

  /**
   * 외부 CDN에서 Leaflet 스크립트를 로드하고 준비 상태를 갱신합니다.
   */
  useEffect(() => {
    /**
     * `loadLeaflet` 관련 데이터를 계산하거나 변환합니다.
     */
    const loadLeaflet = () => {
      return new Promise<void>((resolve, reject) => {
        if (typeof window !== 'undefined' && (window as any).L) {
          console.log('✅ [Leaflet] 이미 로드됨');
          setLeafletLoaded(true);
          resolve();
          return;
        }

        console.log('📦 [Leaflet] 라이브러리 로딩 시작');
        
        const script = document.createElement('script');
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
        script.crossOrigin = "";
        script.async = true;
        
        script.onload = () => {
          console.log('✅ [Leaflet] 라이브러리 로드 완료');
          setLeafletLoaded(true);
          resolve();
        };
        
        script.onerror = (error) => {
          console.error('❌ [Leaflet] 라이브러리 로드 실패:', error);
          reject(error);
        };
        
        document.head.appendChild(script);
        
        // 외부 CDN 로딩이 끝없이 대기하지 않게 5초 후 타임아웃으로 실패 처리합니다.
        setTimeout(() => {
          if (!leafletLoaded) {
            reject(new Error('Leaflet 로딩 타임아웃'));
          }
        }, 5000);
      });
    };

    loadLeaflet().catch(error => {
      console.error('❌ [Leaflet] 최종 로딩 실패:', error);
    });
  }, []);

  /**
   * Leaflet이 준비되면 전국 뷰 기준의 단순 지도와 줌 이벤트를 초기화합니다.
   */
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapRef.current) return;

    try {
      console.log('🗺️ [지도 초기화] 시작');
      
      const L = (window as any).L;
      if (!L) {
        console.error('❌ [지도 초기화] L 객체 없음');
        return;
      }

      mapRef.current = L.map(mapContainerRef.current, {
        center: [36.3504, 127.3845], // 전국 중심 (대전)
        zoom: 7, // 전국이 보이는 줌 레벨
        minZoom: 6,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false
      });
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        subdomains: ['a', 'b', 'c']
      }).addTo(mapRef.current);
      
      // 줌 레벨 변경 이벤트 리스너 추가
      mapRef.current.on('zoomend', () => {
        const zoom = mapRef.current.getZoom();
        setCurrentZoom(zoom);
        
        // 줌 레벨 8 이상일 때만 병원 마커 표시 (조건 완화)
        const shouldShowHospitals = zoom >= 8;
        setHospitalMarkersVisible(shouldShowHospitals);
        
        console.log(`🔍 줌 레벨 변경: ${zoom} - 병원 마커 ${shouldShowHospitals ? '표시' : '숨김'}`);
      });
      
      // 초기 줌 레벨 설정
      const initialZoom = mapRef.current.getZoom();
      setCurrentZoom(initialZoom);
      setHospitalMarkersVisible(initialZoom >= 8);
      
      console.log(`🗺️ 지도 초기화 완료 - 초기 줌: ${initialZoom}, 병원 마커: ${initialZoom >= 8 ? '표시' : '숨김'}`);
      
      setMapReady(true);
      console.log('✅ [지도 초기화] 완료');
      
    } catch (error) {
      console.error('❌ [지도 초기화] 실패:', error);
    }
  }, [leafletLoaded]);

  /**
   * 병원 데이터를 주기적으로 불러오고 실패 시 전국 분포 확인용 fallback 데이터를 채웁니다.
   */
  useEffect(() => {
    /**
     * `fetchHospitals` 관련 데이터를 계산하거나 변환합니다.
     */
    const fetchHospitals = async () => {
      try {
        console.log('🏥 [전국 병원] API 데이터 요청');
        const response = await apiService.getMapHospitals();
        
        console.log('🔍 [전국 병원] API 응답 상태:', response.success);
        
        if (response.success && response.data?.hospitals) {
          let hospitals = response.data.hospitals;
          console.log(`✅ [전국 병원] ${hospitals.length}개 실제 병원 데이터 로드 성공`);
          
          // 지도 검증 단계라 같은 좌표 병원은 강제로 벌려 겹침 여부보다 표시 여부 확인을 우선합니다.
          const processedHospitals = hospitals.map((hospital, index) => ({
            ...hospital,
            lat: hospital.lat + (index * 0.01), // 강제 분산
            lng: hospital.lng + ((index % 20) * 0.01)
          }));
          
          console.log('📋 [전국 병원] 처리된 병원 샘플:', processedHospitals.slice(0, 10).map(h => ({
            name: h.name,
            lat: h.lat,
            lng: h.lng,
            status: h.status
          })));
          
          setApiHospitals(processedHospitals);
          
        } else {
          console.error('❌ [전국 병원] API 실패:', response.error);
          console.log('🔧 [전국 병원] 강화된 백업 데이터 생성');
          
          // API가 비어도 전국 분포 테스트가 가능하도록 넓게 퍼진 더미 병원을 생성합니다.
          const backupHospitals = [];
          const cities = [
            { name: '서울', lat: 36.3504, lng: 127.3845 },
            { name: '부산', lat: 35.1796, lng: 129.0756 },
            { name: '대구', lat: 35.8714, lng: 128.6014 },
            { name: '인천', lat: 37.4563, lng: 126.7052 },
            { name: '광주', lat: 35.1379, lng: 126.9224 },
            { name: '대전', lat: 36.3504, lng: 127.3845 },
            { name: '울산', lat: 35.5384, lng: 129.3114 },
            { name: '경기', lat: 37.2736, lng: 127.0094 },
            { name: '강원', lat: 37.8813, lng: 127.7298 },
            { name: '충북', lat: 36.6424, lng: 127.4890 }
          ];
          
          for (let i = 0; i < 100; i++) {
            const city = cities[i % cities.length];
            const statuses = ['available', 'busy', 'full'];
            
            backupHospitals.push({
              id: `backup_${i}`,
              name: `${city.name}${Math.floor(i/10) + 1}병원`,
              lat: city.lat + (i * 0.02) - 1.0, // 큰 분산
              lng: city.lng + ((i % 10) * 0.02) - 0.1,
              status: statuses[i % 3],
              location: `${city.name} 지역`,
              emergencyBeds: {
                available: Math.floor(Math.random() * 20),
                total: 20 + Math.floor(Math.random() * 30),
                occupancyRate: Math.floor(Math.random() * 100)
              },
              icuBeds: { available: Math.floor(Math.random() * 10), total: 10 },
              specialties: {},
              equipment: {},
              lastUpdated: new Date().toISOString(),
              isEROpen: true,
              phone: `0${Math.floor(Math.random() * 9) + 1}-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
              region: city.name
            });
          }
          
          setApiHospitals(backupHospitals);
          console.log(`🔧 강화된 백업 데이터 ${backupHospitals.length}개 생성 완료`);
        }
        
      } catch (error) {
        console.error('❌ [전국 병원] API 호출 실패:', error);
        // 최소한의 테스트 데이터라도 생성
        const testHospitals = Array.from({length: 50}, (_, i) => ({
          id: `test_${i}`,
          name: `테스트병원${i+1}`,
          lat: 37.5 + (i * 0.01),
          lng: 127.0 + (i * 0.01),
          status: ['available', 'busy', 'full'][i % 3]
        }));
        
        setApiHospitals(testHospitals);
        console.log(`🚨 테스트 데이터 ${testHospitals.length}개 생성`);
      }
    };

    fetchHospitals();
    
    // 운영 실시간성보다 디버그 가시성이 중요해 20초 간격으로 다시 불러 표시 상태를 검증합니다.
    const interval = setInterval(fetchHospitals, 20000);
    return () => clearInterval(interval);
  }, []);

  /**
   * 현재 줌 레벨과 데이터 상태에 맞춰 환자/병원 마커를 다시 그립니다.
   */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletLoaded || apiHospitals.length === 0) {
      console.log(`⚠️ 마커 표시 조건 확인: 지도준비=${mapReady}, 지도=${!!mapRef.current}, Leaflet=${leafletLoaded}, 병원수=${apiHospitals.length}`);
      return;
    }

    const L = (window as any).L;
    if (!L) {
      console.error('❌ [마커 생성] L 객체 없음');
      return;
    }

    console.log(`🎯 줌 레벨 ${currentZoom} - 병원 마커 ${hospitalMarkersVisible ? '표시' : '숨김'} (${apiHospitals.length}개)`);
    console.log('📊 병원 데이터 샘플:', apiHospitals.slice(0, 5).map(h => ({
      name: h.name,
      lat: h.lat,
      lng: h.lng,
      status: h.status
    })));

    // 기존 병원 마커만 제거 (환자 마커는 유지)
    Object.keys(markersRef.current).forEach(key => {
      if (key.startsWith('hospital_') && markersRef.current[key]) {
        mapRef.current.removeLayer(markersRef.current[key]);
        delete markersRef.current[key];
      }
    });

    // 환자 마커는 항상 표시
    if (!markersRef.current['patient']) {
      const patientMarker = L.circleMarker(patientCoords, {
        radius: 12,
        fillColor: '#ef4444',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(mapRef.current);
      
      patientMarker.bindPopup(`<div style="text-align: center;"><strong>🚨 환자</strong><br/>${patient.name}</div>`);
      markersRef.current['patient'] = patientMarker;
    }

    let successCount = 0;
    let skippedCount = 0;

    // 전국 뷰에서는 마커 과밀을 막기 위해 일정 줌 이상일 때만 병원 마커를 생성합니다.
    if (hospitalMarkersVisible) {
      console.log(`🏥 줌 레벨 ${currentZoom} ≥ 8 - 병원 마커 생성 시작`);
      
      // 실제 병원 표시 전 기준점 몇 개를 먼저 찍어 지도/아이콘 렌더 자체가 되는지 바로 구분합니다.
      // 테스트용 강제 마커 생성 (5개)
      console.log('🔧 [디버깅] 테스트 마커 5개 강제 생성');
      for (let i = 0; i < 5; i++) {
        try {
          const testLat = 36.3504 + (i * 0.01);
          const testLng = 127.3845 + (i * 0.01);
          
          const testMarker = L.circleMarker([testLat, testLng], {
            radius: 10,
            fillColor: '#ff0000', // 빨간색으로 눈에 띄게
            color: '#ffffff',
            weight: 3,
            opacity: 1,
            fillOpacity: 1
          });
          
          testMarker.addTo(mapRef.current);
          testMarker.bindPopup(`<strong>테스트 마커 ${i+1}</strong><br/>좌표: (${testLat.toFixed(4)}, ${testLng.toFixed(4)})`);
          
          markersRef.current[`test_${i}`] = testMarker;
          console.log(`✅ 테스트 마커 ${i+1} 생성 성공: (${testLat.toFixed(4)}, ${testLng.toFixed(4)})`);
        } catch (error) {
          console.error(`❌ 테스트 마커 ${i+1} 생성 실패:`, error);
        }
      }
      
      // 실제 병원 마커들
      apiHospitals.forEach((hospitalData, index) => {
        try {
          // 최소한의 유효성 검사만 수행
          const lat = parseFloat(hospitalData.lat);
          const lng = parseFloat(hospitalData.lng);
          
          if (isNaN(lat) || isNaN(lng)) {
            console.warn(`⚠️ [${index}] ${hospitalData.name}: NaN 좌표 (${hospitalData.lat}, ${hospitalData.lng})`);
            skippedCount++;
            return;
          }

          // 디버그 지도라 실제 위치 정밀도보다 "모든 마커가 보이는지" 확인을 우선해 강하게 분산합니다.
          const offsetLat = lat + ((index % 50) - 25) * 0.05; // 50개씩 그룹, ±1.25도 (약 125km)
          const offsetLng = lng + (Math.floor(index / 50) - 4) * 0.05;
          
          console.log(`🏥 [${index + 1}/${apiHospitals.length}] ${hospitalData.name}: (${offsetLat.toFixed(5)}, ${offsetLng.toFixed(5)})`);
          
          // 매칭된 병원인지 확인
          const isMatched = hospital && (
            hospital.id === hospitalData.id || 
            hospital.name?.includes(hospitalData.name) ||
            hospitalData.name?.includes(hospital.name)
          );
          
          // 간단한 원형 마커 (안정적)
          const hospitalMarker = L.circleMarker([offsetLat, offsetLng], {
            radius: 8,
            fillColor: isMatched ? '#ef4444' : '#000000', // 매칭된 병원은 빨간색
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          });
          
          // 지도에 추가
          hospitalMarker.addTo(mapRef.current);
          
          // 간단한 팝업
          const popupContent = `
            <div style="font-size: 12px; font-family: Arial, sans-serif;">
              <strong>${hospitalData.name || '병원명 없음'}</strong><br/>
              <span style="color: #666;">📍 ${hospitalData.location || hospitalData.address || '주소 정보 없음'}</span><br/>
              <span style="color: #2563eb;">🚑 응급실: ${hospitalData.emergencyBeds?.available || 0}/${hospitalData.emergencyBeds?.total || 0}개</span><br/>
              <span style="color: ${
                hospitalData.status === 'available' ? '#10b981' : 
                hospitalData.status === 'busy' ? '#f59e0b' : 
                hospitalData.status === 'full' ? '#ef4444' : '#6b7280'
              };">
                📊 ${
                  hospitalData.status === 'available' ? '여유 🟢' : 
                  hospitalData.status === 'busy' ? '혼잡 🟡' : 
                  hospitalData.status === 'full' ? '포화 🔴' : '정상 ⚪'
                }
              </span>
              ${hospitalData.phone ? `<br/><span style="color: #2563eb;">📞 ${hospitalData.phone}</span>` : ''}
            </div>
          `;
          
          hospitalMarker.bindPopup(popupContent);
          
          // 마우스 오버 이벤트
          hospitalMarker.on('mouseover', function(e) {
            this.openPopup();
          });
          
          hospitalMarker.on('mouseout', function(e) {
            if (!isMatched) {
              this.closePopup();
            }
          });
          
          // 매칭된 병원은 팝업을 항상 열어둠
          if (isMatched) {
            setTimeout(() => hospitalMarker.openPopup(), 500);
          }
          
          markersRef.current[`hospital_${index}`] = hospitalMarker;
          successCount++;
          
        } catch (error) {
          console.error(`❌ [${index}] ${hospitalData.name} 마커 생성 실패:`, error);
          skippedCount++;
        }
      });
    } else {
      console.log(`🔍 줌 레벨 ${currentZoom} < 9 - 병원 마커 숨김 (성능 최적화)`);
    }

    console.log(`✅ 전국 병원 마커 생성 완료: 성공 ${successCount}개 / 스킵 ${skippedCount}개 / 총 ${apiHospitals.length}개`);
    console.log(`📍 지도 마커 총 개수: ${Object.keys(markersRef.current).length}개 (환자 1개 + 병원 ${successCount}개)`);
    
    // 생성 성공 마커가 있으면 한 화면에 다시 맞춰 디버그 직후 바로 표시 여부를 확인합니다.
    if (successCount > 0) {
      setTimeout(() => {
        try {
          // 모든 마커 위치 수집
          const allMarkers = Object.values(markersRef.current).filter(marker => marker && marker.getLatLng);
          if (allMarkers.length > 0) {
            const group = new L.featureGroup(allMarkers);
            mapRef.current.fitBounds(group.getBounds(), { 
              padding: [50, 50],
              maxZoom: 12 
            });
            console.log(`🗺️ 지도 범위 조정 완료: ${allMarkers.length}개 마커`);
          }
        } catch (boundsError) {
          console.error('❌ 지도 범위 조정 실패:', boundsError);
          // 대체 방법: 한국 전체 범위로 설정
          mapRef.current.setView([36.3504, 127.3845], 7);
        }
      }, 1000);
    } else {
      console.warn('⚠️ 성공적으로 생성된 마커가 없습니다.');
    }
  }, [apiHospitals, patient, hospital, mapReady, leafletLoaded, hospitalMarkersVisible, currentZoom]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0b]">
      <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
      
      {/* 로딩 오버레이 */}
      {(!leafletLoaded || !mapReady) && (
        <div className="absolute inset-0 z-30 bg-[#0a0a0b]/90 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-zinc-900/90 border border-white/10 p-6 rounded-xl shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="text-zinc-300">
                <div className="font-medium">지도 시스템 초기화 중...</div>
                <div className="text-sm text-zinc-400 mt-1">
                  {!leafletLoaded ? '📦 Leaflet 라이브러리 로딩 중' : '🗺️ 지도 렌더링 중'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 전국 병원 현황 표시 */}
      {mapReady && apiHospitals.length > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-zinc-300 font-medium">🏥 전국 병원 현황</span>
            <div className="flex gap-4">
              <span className="text-green-400">여유: {apiHospitals.filter(h => h.status === 'available').length}개</span>
              <span className="text-yellow-400">혼잡: {apiHospitals.filter(h => h.status === 'busy').length}개</span>
              <span className="text-red-400">포화: {apiHospitals.filter(h => h.status === 'full').length}개</span>
              <span className="text-zinc-400">총 {apiHospitals.length}개</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-zinc-400 text-center">
            {hospitalMarkersVisible ? 
              `🔍 줌 레벨 ${currentZoom} - 병원 마커 표시 중` : 
              `🔍 줌 레벨 ${currentZoom} - 지도를 확대하면 병원이 표시됩니다 (줌 8+)`
            }
          </div>
        </div>
      )}
      
      <div className="absolute top-8 right-8 z-20 flex flex-col gap-3">
        <button 
          onClick={() => {
            if (mapReady && mapRef.current) {
              mapRef.current.flyTo(patientCoords, 12, { duration: 1 });
              console.log('🎯 [지도 이동] 환자 위치로');
            }
          }}
          disabled={!mapReady}
          className={`p-3.5 backdrop-blur-md border rounded-xl shadow-xl active:scale-95 transition-all ${
            mapReady 
              ? 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white' 
              : 'bg-zinc-700/50 border-zinc-600/20 text-zinc-500 cursor-not-allowed'
          }`}
          title="환자 위치로 이동"
        >
          <Crosshair className="w-7 h-7" />
        </button>
        
        <button 
          onClick={() => {
            if (mapReady && mapRef.current) {
              mapRef.current.flyTo([36.3504, 127.3845], 11, { duration: 1 });
              console.log('🏥 [지도 이동] 서울 병원 집중 보기');
            }
          }}
          disabled={!mapReady}
          className={`p-3.5 backdrop-blur-md border rounded-xl shadow-xl active:scale-95 transition-all ${
            mapReady 
              ? 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white' 
              : 'bg-zinc-700/50 border-zinc-600/20 text-zinc-500 cursor-not-allowed'
          }`}
          title="서울 병원 집중 보기 (줌 11)"
        >
          <div className="w-7 h-7 flex items-center justify-center text-lg">🏙️</div>
        </button>
        
        <button 
          onClick={() => {
            if (mapReady && mapRef.current) {
              mapRef.current.flyTo([36.3504, 127.3845], 8, { duration: 1.5 }); // 줌 8로 설정
              console.log('🇰🇷 [지도 이동] 전국 지도 + 병원 표시');
            }
          }}
          disabled={!mapReady}
          className={`p-3.5 backdrop-blur-md border rounded-xl shadow-xl active:scale-95 transition-all ${
            mapReady 
              ? 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white' 
              : 'bg-zinc-700/50 border-zinc-600/20 text-zinc-500 cursor-not-allowed'
          }`}
          title="전국 지도 + 병원 표시 (줌 8)"
        >
          <div className="w-7 h-7 flex items-center justify-center text-lg">🏥</div>
        </button>
        
        <button 
          onClick={() => {
            console.log('🔧 [디버깅] Leaflet 로드:', leafletLoaded);
            console.log('🔧 [디버깅] 지도 준비:', mapReady);
            console.log('🔧 [디버깅] 현재 마커:', Object.keys(markersRef.current));
            console.log('🔧 [디버깅] 병원 데이터:', apiHospitals.length);
            console.log('🔧 [디버깅] L 객체:', typeof (window as any).L);
          }} 
          // 마지막 버튼은 화면 상태를 바꾸지 않고 콘솔 확인용 디버그 정보만 출력합니다.
          className="p-2 bg-red-900/80 backdrop-blur-md border border-red-500/20 rounded-lg text-red-300 hover:text-red-100 shadow-xl active:scale-95 transition-all"
          title="디버깅 정보"
        >
          <div className="w-5 h-5 flex items-center justify-center text-xs">🔧</div>
        </button>
      </div>
    </div>
  );
};

/**
 * 단순형 라이브 지도 컴포넌트를 기본 export로 제공합니다.
 */
export default LiveMapSimple;
