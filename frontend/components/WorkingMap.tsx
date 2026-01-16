import React, { useEffect, useRef, useState } from 'react';
import { Patient, Hospital } from '../types';

interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
}

const WorkingMap: React.FC<LiveMapProps> = ({ patient, hospital }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [hospitalData, setHospitalData] = useState<any[]>([]);

  // 병원 데이터 가져오기
  useEffect(() => {
    const getHospitals = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/emergency/hospitals/map-data');
        const data = await response.json();
        if (data.success && data.data?.hospitals) {
          console.log(`✅ ${data.data.hospitals.length}개 병원 데이터 로드`);
          setHospitalData(data.data.hospitals.slice(0, 30));
        } else {
          console.log('⚠️ 백업 병원 데이터 사용');
          setHospitalData([
            { id: '1', name: '서울대학교병원', lat: 37.5796, lng: 127.0007 },
            { id: '2', name: '삼성서울병원', lat: 37.4882, lng: 127.0851 },
            { id: '3', name: '세브란스병원', lat: 37.5623, lng: 126.9408 },
            { id: '4', name: '서울아산병원', lat: 37.5266, lng: 127.1082 },
            { id: '5', name: '고려대학교의료원', lat: 37.5902, lng: 127.0263 }
          ]);
        }
      } catch (error) {
        console.error('API 에러, 백업 데이터 사용:', error);
        setHospitalData([
          { id: '1', name: '서울대학교병원', lat: 37.5796, lng: 127.0007 },
          { id: '2', name: '삼성서울병원', lat: 37.4882, lng: 127.0851 },
          { id: '3', name: '세브란스병원', lat: 37.5623, lng: 126.9408 },
          { id: '4', name: '서울아산병원', lat: 37.5266, lng: 127.1082 },
          { id: '5', name: '고려대학교의료원', lat: 37.5902, lng: 127.0263 }
        ]);
      }
    };
    
    getHospitals();
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current || !window.L) {
      console.error('지도 컨테이너 또는 Leaflet 없음');
      return;
    }

    console.log('🗺️ 지도 초기화 시작');

    // 기존 지도 완전 제거
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // 기존 마커들 제거
    markersRef.current = [];

    try {
      // 새 지도 생성 (환자 위치 중심, 줌 레벨 18, 한국 경계 제한)
      mapRef.current = window.L.map(mapContainerRef.current, {
        center: [patient.lat, patient.lng],
        zoom: 18, // 줌 레벨 18로 설정
        minZoom: 7, // 최소 줌 (한국 전체가 보이는 레벨)
        maxZoom: 18, // 최대 줌 (약 20km 상공에서 보는 레벨)
        zoomControl: true,
        attributionControl: false,
        // 한국 경계 제한 (위도: 33.0~38.9, 경도: 124.0~132.0)
        maxBounds: [
          [33.0, 124.0], // 남서쪽 끝 (제주도 남단)
          [38.9, 132.0]  // 북동쪽 끝 (함경북도 동단)
        ],
        maxBoundsViscosity: 1.0 // 경계를 벗어날 수 없도록 강제
      });

      // 구글 지도 타일 레이어
      window.L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        attribution: ''
      }).addTo(mapRef.current);

      console.log('✅ 지도 생성 완료');

      // 1초 후 마커 추가 (지도 완전 로딩 대기)
      setTimeout(() => {
        addAllMarkers();
      }, 1000);

    } catch (error) {
      console.error('❌ 지도 생성 실패:', error);
    }
  }, [patient.id, patient.lat, patient.lng]); // patient.id 변경시에도 반응

  // 소방서 격자 코드 생성 (위도/경도를 기반으로)
  const generateGridCode = (lat: number, lng: number) => {
    const latGrid = Math.floor((lat - 33.0) * 1000).toString().padStart(4, '0');
    const lngGrid = Math.floor((lng - 124.0) * 1000).toString().padStart(4, '0');
    return `G${latGrid}${lngGrid}`;
  };

  // 소방서 구역 코드 생성
  const generateFireCode = (location: string) => {
    const districts = {
      '서울': 'SEL', '부산': 'PUS', '대구': 'DAE', '인천': 'ICN',
      '광주': 'GWJ', '대전': 'DAJ', '울산': 'ULS', '세종': 'SEJ',
      '경기': 'GYG', '강원': 'GWN', '충북': 'CHB', '충남': 'CHN',
      '전북': 'JNB', '전남': 'JNN', '경북': 'GYB', '경남': 'GYN',
      '제주': 'JEJ'
    };
    
    for (const [key, code] of Object.entries(districts)) {
      if (location.includes(key)) {
        const subCode = location.includes('구') ? location.match(/(\w+구)/)?.[1]?.substring(0, 2) || '01' : '01';
        return `${code}-${subCode}`;
      }
    }
    return 'UNK-01';
  };

  // 주변 랜드마크 생성
  const generateLandmark = (location: string) => {
    const landmarks = [
      '지하철역', '버스정류장', '편의점', '은행', '병원', '학교', 
      '공원', '아파트단지', '상가건물', '주유소', '마트'
    ];
    const randomLandmark = landmarks[Math.floor(Math.random() * landmarks.length)];
    return `${randomLandmark} 근처`;
  };

  // 건물 정보 생성
  const generateBuildingInfo = (location: string) => {
    const buildingTypes = [
      '아파트 102동 1501호', '상가건물 3층', '단독주택', 
      '오피스텔 B동 804호', '연립주택 2층', '상업건물 1층'
    ];
    const randomBuilding = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
    return randomBuilding;
  };

  // 마커 추가 함수
  const addAllMarkers = () => {
    if (!mapRef.current || !window.L) return;

    console.log('🎯 마커 추가 시작');

    try {
      // 1. 환자 마커 (빨간색, 중간 크기) - 상세한 정보 포함
      const patientMarker = window.L.circleMarker([patient.lat, patient.lng], {
        radius: 12, // 크기 축소 (20 → 12)
        fillColor: '#ff0000',
        color: '#ffffff',
        weight: 3, // 테두리도 살짝 축소
        opacity: 1,
        fillOpacity: 1
      }).addTo(mapRef.current);

      // 적당한 크기의 가독성 있는 환자 정보 팝업
      const patientPopupContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; width: 580px; background: #fff;">
          
          <!-- 환자 헤더 -->
          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 14px 16px; text-align: center; margin-bottom: 16px;">
            <h2 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 600;">${patient.name}</h2>
            <div style="font-size: 13px; opacity: 0.9;">${patient.age}세 • ${patient.gender === 'M' ? '남성' : patient.gender === 'F' ? '여성' : '기타'} • ${patient.bloodType}형</div>
          </div>

          <!-- 위치 정보 -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <div style="width: 24px; height: 24px; background: #4f46e5; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
                <span style="color: white; font-size: 12px;">📍</span>
              </div>
              <h3 style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 600;">위치 정보</h3>
            </div>
            <div style="font-size: 12px; color: #334155; margin-bottom: 8px;">${patient.detailAddress || patient.location}</div>
            <div style="display: flex; gap: 8px;">
              <div style="flex: 1; background: white; padding: 8px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: #6b7280;">GPS</div>
                <div style="font-size: 11px; color: #111827; font-weight: 600;">±${patient.locationData?.gpsLocation?.accuracy || '3.2'}m</div>
              </div>
              <div style="flex: 1; background: white; padding: 8px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: #6b7280;">셀룰러</div>
                <div style="font-size: 11px; color: #111827; font-weight: 600;">±${patient.locationData?.cellularLocation?.accuracy || '18.5'}m</div>
              </div>
              <div style="flex: 1; background: white; padding: 8px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: #6b7280;">WiFi</div>
                <div style="font-size: 11px; color: #111827; font-weight: 600;">±${patient.locationData?.wifiLocation?.accuracy || '9.7'}m</div>
              </div>
            </div>
          </div>

          <!-- 메인 3열 그리드 -->
          <div style="display: flex; gap: 12px;">
            
            <!-- 생체 데이터 (좌측) -->
            <div style="flex: 1;">
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                <h3 style="margin: 0 0 10px 0; font-size: 13px; color: #1e293b; font-weight: 600; display: flex; align-items: center;">
                  <span style="margin-right: 6px;">💓</span>생체 데이터
                </h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div style="text-align: center; padding: 10px; background: #fef2f2; border-radius: 6px;">
                    <div style="font-size: 10px; color: #991b1b;">심박수</div>
                    <div style="font-size: 20px; font-weight: 700; color: #dc2626;">${patient.vitals.heartRate}</div>
                    <div style="font-size: 9px; color: #6b7280;">BPM</div>
                  </div>
                  <div style="text-align: center; padding: 10px; background: #eff6ff; border-radius: 6px;">
                    <div style="font-size: 10px; color: #1d4ed8;">산소포화도</div>
                    <div style="font-size: 20px; font-weight: 700; color: #2563eb;">${patient.vitals.oxygenLevel}</div>
                    <div style="font-size: 9px; color: #6b7280;">%</div>
                  </div>
                  <div style="text-align: center; padding: 10px; background: #faf5ff; border-radius: 6px;">
                    <div style="font-size: 10px; color: #7c3aed;">혈압</div>
                    <div style="font-size: 16px; font-weight: 700; color: #8b5cf6;">${patient.vitals.bloodPressure}</div>
                    <div style="font-size: 9px; color: #6b7280;">mmHg</div>
                  </div>
                  <div style="text-align: center; padding: 10px; background: #fff7ed; border-radius: 6px;">
                    <div style="font-size: 10px; color: #ea580c;">체온</div>
                    <div style="font-size: 20px; font-weight: 700; color: #f97316;">${patient.vitals.bodyTemp}</div>
                    <div style="font-size: 9px; color: #6b7280;">°C</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 상태 분석 (중앙) -->
            <div style="flex: 1;">
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                <h3 style="margin: 0 0 10px 0; font-size: 13px; color: #1e293b; font-weight: 600; display: flex; align-items: center;">
                  <span style="margin-right: 6px;">⚡</span>상태 분석
                </h3>
                
                <div style="text-align: center; padding: 14px; background: ${patient.status === 'Critical' ? '#fef2f2' : patient.status === 'Serious' ? '#fff7ed' : '#f0fdf4'}; border-radius: 8px; margin-bottom: 10px;">
                  <div style="font-size: 24px; margin-bottom: 6px;">
                    ${patient.status === 'Critical' ? '🔴' : patient.status === 'Serious' ? '🟡' : '🟢'}
                  </div>
                  <div style="font-size: 14px; font-weight: 600; color: ${patient.status === 'Critical' ? '#dc2626' : patient.status === 'Serious' ? '#ea580c' : '#16a34a'};">
                    ${patient.status === 'Critical' ? '위급상태' : patient.status === 'Serious' ? '심각상태' : '안정상태'}
                  </div>
                </div>
                
                ${patient.severityScore ? `
                <div style="text-align: center; padding: 10px; background: #fffbeb; border-radius: 6px;">
                  <div style="font-size: 11px; color: #92400e;">위험도</div>
                  <div style="font-size: 24px; font-weight: 700; color: #d97706;">${patient.severityScore}<span style="font-size: 14px;">/10</span></div>
                </div>
                ` : ''}
              </div>
            </div>

            <!-- 증상 & AI 분석 (우측) -->
            <div style="flex: 1;">
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                <h3 style="margin: 0 0 10px 0; font-size: 13px; color: #1e293b; font-weight: 600; display: flex; align-items: center;">
                  <span style="margin-right: 6px;">🏥</span>증상 & AI
                </h3>
                
                ${patient.symptoms && patient.symptoms.length > 0 ? `
                <div style="margin-bottom: 10px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 11px; color: #374151; font-weight: 600;">증상</h4>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${patient.symptoms.map(symptom => `
                      <span style="display: inline-block; background: #fef2f2; color: #991b1b; padding: 3px 8px; border-radius: 12px; font-size: 10px; border: 1px solid #fecaca;">${symptom}</span>
                    `).join('')}
                  </div>
                </div>
                ` : ''}
                
                ${patient.aiAnalysis ? `
                <div>
                  <h4 style="margin: 0 0 6px 0; font-size: 11px; color: #374151; font-weight: 600;">AI 분석</h4>
                  <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px;">
                    <div style="font-size: 11px; color: #0c4a6e; line-height: 1.4;">
                      ${patient.aiAnalysis.substring(0, 120)}${patient.aiAnalysis.length > 120 ? '...' : ''}
                    </div>
                  </div>
                </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;

      // 클릭 시 팝업 제어
      patientMarker.bindPopup(patientPopupContent, {
        maxWidth: 600,
        minWidth: 580,
        autoPan: true,
        autoPanPadding: [15, 15],
        keepInView: true,
        closeButton: true,
        className: 'patient-popup-compact'
      });
      
      // 자동으로 팝업 열기 (환자 클릭 시 즉시 표시)
      patientMarker.openPopup();

      markersRef.current.push(patientMarker);
      console.log(`✅ 환자 마커 생성: ${patient.name}`);

      // 2. 병원 마커들 ('H' 글자 포함, 작은 크기)
      hospitalData.forEach((hosp, index) => {
        if (hosp.lat && hosp.lng && !isNaN(hosp.lat) && !isNaN(hosp.lng)) {
          
          // 'H' 글자가 들어간 작은 마커 아이콘 생성
          const hospitalIcon = window.L.divIcon({
            className: 'hospital-marker',
            html: `
              <div style="
                width: 20px;
                height: 20px;
                background-color: #000000;
                border: 2px solid #ffffff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: bold;
                color: #ffffff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              ">H</div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          const hospitalMarker = window.L.marker([hosp.lat, hosp.lng], {
            icon: hospitalIcon
          }).addTo(mapRef.current);

          // 클릭시 팝업 (병원 정보도 화면 안에 보이도록)
          hospitalMarker.bindPopup(`
            <div style="text-align: center; min-width: 180px; max-width: 220px;">
              <h4 style="margin: 0 0 8px 0; color: #333;">🏥 ${hosp.name}</h4>
              <p style="margin: 4px 0; font-size: 13px;">상태: ${hosp.status || '정상'}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">좌표: ${hosp.lat.toFixed(4)}, ${hosp.lng.toFixed(4)}</p>
              ${hosp.address ? `<p style="margin: 4px 0; font-size: 12px; color: #666;">주소: ${hosp.address}</p>` : ''}
            </div>
          `, {
            maxWidth: 250,
            autoPan: true,
            autoPanPadding: [10, 10],
            keepInView: true
          });

          // 마우스 오버 이벤트 - 툴팁 표시
          hospitalMarker.on('mouseover', function(e) {
            // 간단한 툴팁 생성
            const tooltip = window.L.tooltip({
              permanent: false,
              direction: 'top',
              className: 'hospital-tooltip'
            }).setContent(`
              <div style="
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 6px 10px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                border: none;
              ">
                🏥 ${hosp.name}
              </div>
            `);
            
            this.bindTooltip(tooltip).openTooltip();
          });

          // 마우스 아웃 이벤트 - 툴팁 제거
          hospitalMarker.on('mouseout', function(e) {
            this.closeTooltip();
          });

          markersRef.current.push(hospitalMarker);
          console.log(`✅ 병원 마커 ${index + 1}: ${hosp.name}`);
        }
      });

      console.log(`🎉 총 ${markersRef.current.length}개 마커 생성 완료!`);

      // 환자 마커 중심으로 줌 레벨 18 설정 (병원들은 범위 조정하지 않음)
      mapRef.current.setView([patient.lat, patient.lng], 18);

    } catch (error) {
      console.error('❌ 마커 생성 실패:', error);
    }
  };

  // 병원 데이터 변경시 마커 재생성
  useEffect(() => {
    if (hospitalData.length > 0 && mapRef.current) {
      console.log(`🔄 병원 데이터 변경: ${hospitalData.length}개`);
      // 기존 마커들 제거 후 재생성
      markersRef.current.forEach(marker => {
        mapRef.current.removeLayer(marker);
      });
      markersRef.current = [];
      
      setTimeout(() => {
        addAllMarkers();
      }, 500);
    }
  }, [hospitalData]);

  // 동 기준 축척으로 축소하는 함수
  const zoomToDistrict = () => {
    if (mapRef.current) {
      // 말풍선 닫기
      mapRef.current.closePopup();
      // 현재 환자 위치를 중심으로 동 레벨 (줌 레벨 15)로 축소
      mapRef.current.setView([patient.lat, patient.lng], 15);
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-100">
      {/* 지도 컨트롤 버튼 */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={zoomToDistrict}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 shadow-md transition-all duration-200 hover:shadow-lg text-sm font-medium text-gray-700 hover:text-gray-900"
          style={{ minWidth: '60px' }}
          title="동 단위로 축소"
        >
          📍 축소
        </button>
      </div>

      {/* 병원 마커 및 환자 팝업 스타일 */}
      <style jsx global>{`
        .hospital-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .hospital-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        .hospital-tooltip .leaflet-tooltip-content {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .patient-popup-compact .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
          width: 580px !important;
          max-width: 95vw !important;
          overflow: visible !important;
          font-size: 13px !important;
        }

        .patient-popup-compact .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
          border: 1px solid #e2e8f0 !important;
          background: #ffffff !important;
          padding: 0 !important;
        }

        .patient-popup-compact .leaflet-popup-tip {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
        }

        .patient-popup-compact .leaflet-popup-close-button {
          color: #64748b !important;
          font-size: 16px !important;
          font-weight: 400 !important;
          padding: 6px !important;
          width: 28px !important;
          height: 28px !important;
          margin: 8px !important;
          line-height: 1 !important;
          text-decoration: none !important;
          background: rgba(100, 116, 139, 0.1) !important;
          border-radius: 6px !important;
          transition: all 0.2s ease !important;
        }

        .patient-popup-compact .leaflet-popup-close-button:hover {
          background: rgba(100, 116, 139, 0.2) !important;
          color: #334155 !important;
        }
      `}</style>

      {/* 지도 컨테이너 */}
      <div 
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};

export default WorkingMap;