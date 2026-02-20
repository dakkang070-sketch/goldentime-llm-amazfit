import React, { useEffect, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  LineChart,
  Line,
  YAxis,
  XAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Patient,
  Hospital,
  Ambulance,
  AmbulanceStatus,
  PatientStatus,
} from "../types";

declare var window: Window & typeof globalThis & { L: any };

import "leaflet/dist/leaflet.css";

const PopupContent = ({ patient, data }: { patient: Patient; data: any[] }) => {
  return (
    <div className="w-[300px] bg-slate-900 text-white p-4 rounded-lg shadow-xl font-sans" style={{ margin: "-1px" }}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-white m-0 flex items-center gap-2">
            {patient.name} 
            <span className="text-sm font-normal text-slate-400">({patient.age}세)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">{patient.location}</p>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-bold ${
          patient.status === PatientStatus.CRITICAL ? 'bg-red-500' : 
          patient.status === PatientStatus.DANGER ? 'bg-orange-500' : 'bg-blue-500'
        }`}>
          {patient.status}
        </div>
      </div>
      
      <div className="mb-4 bg-slate-800/50 p-3 rounded border border-slate-700">
        <p className="text-xs text-slate-400 mb-1 font-semibold">AI 상황 파악 분석</p>
        <div className="text-xs text-slate-300 leading-relaxed">
           구조 요청 또는 위급 상황이 감지되었습니다.<br/>
           <span className="text-red-400 font-bold">즉각적인 현장 개입이 필요합니다.</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-slate-400">실시간 스트레스/감정 (최근 20초)</p>
          <span className="text-[10px] text-red-500 font-bold animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            LIVE
          </span>
        </div>
        <div className="h-32 bg-slate-950 rounded border border-slate-800 overflow-hidden relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="time" hide domain={['dataMin', 'dataMax']} />
              <YAxis domain={[0, 100]} hide />
              <Line 
                type="monotone" 
                dataKey="stress" 
                stroke="#ef4444" 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false} 
              />
              <Line 
                type="monotone" 
                dataKey="emotion" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false} 
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="absolute top-1 right-2 text-[9px] text-slate-500">20s window</div>
        </div>
        <div className="flex justify-between mt-1 px-1">
           <span className="text-[10px] text-red-400">● 스트레스</span>
           <span className="text-[10px] text-blue-400">● 감정변화</span>
        </div>
      </div>
    </div>
  );
};

interface LiveMapProps {
  patient: Patient;
  hospital?: Hospital;
  ambulances?: Ambulance[];
  patients?: Patient[];
  onArrival?: (patientId: string) => void;
}

enum TransportPhase {
  WAITING = "WAITING",
  TO_PATIENT = "TO_PATIENT",
  TO_HOSPITAL = "TO_HOSPITAL",
  ARRIVED = "ARRIVED",
}

const WorkingMap: React.FC<LiveMapProps> = ({
  patient: initialPatient,
  hospital,
  ambulances: externalAmbulances,
  patients: allPatients,
  onArrival,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const patientMarkerRef = useRef<any>(null);
  const ambulanceMarkerRef = useRef<any>(null);
  const staticGroupRef = useRef<any>(null);
  const pathGroupRef = useRef<any>(null);

  const [hospitalData, setHospitalData] = useState<any[]>([]);
  const [matchedAmbulance, setMatchedAmbulance] = useState<Ambulance | null>(
    null,
  );
  const [hospitalPath, setHospitalPath] = useState<any[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient>(initialPatient);
  const [phase, setPhase] = useState<TransportPhase>(TransportPhase.WAITING);

  // 환자가 변경되면 상태 초기화
  useEffect(() => {
    setCurrentPatient(initialPatient);
    setMatchedAmbulance(null);
    setPhase(TransportPhase.WAITING);
  }, [initialPatient.id]);

  // 모든 환자의 애니메이션 위치를 관리하는 Ref
  const allPatientsAnimPosRef = useRef<
    Record<string, { lat: number; lng: number }>
  >({});
  // 현재 선택된 환자 애니메이션 위치
  const animPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const displayAmbulances = externalAmbulances || [];

  // 1. 레이어 및 마커 동기화 함수
  
  // 팝업 업데이트를 위한 Ref
  const popupRef = useRef<{ root: any; patientId: string } | null>(null);
  const vitalsRef = useRef<any[]>([]);
  const [vitals, setVitals] = useState<any[]>([]);

  // 20초 간격 그래프 데이터 생성
  useEffect(() => {
    // 초기 데이터 채우기
    const initData = Array.from({ length: 20 }, (_, i) => ({
      time: Date.now() - (20 - i) * 1000,
      stress: 20 + Math.random() * 10,
      emotion: 40 + Math.random() * 10,
    }));
    setVitals(initData);
    vitalsRef.current = initData;

    const interval = setInterval(() => {
      setVitals((prev) => {
        const nextTime = Date.now();
        const newPoint = {
          time: nextTime,
          stress: Math.max(10, Math.min(90, (prev[prev.length - 1]?.stress || 30) + (Math.random() * 10 - 5))),
          emotion: Math.max(10, Math.min(90, (prev[prev.length - 1]?.emotion || 50) + (Math.random() * 10 - 5))),
        };
        const newData = [...prev.slice(1), newPoint];
        vitalsRef.current = newData;
        return newData;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 팝업 내용 실시간 업데이트
  useEffect(() => {
    if (popupRef.current && popupRef.current.root) {
      // 현재 열린 팝업의 환자 찾기
      const targetP = (allPatients || []).find(p => p.id === popupRef.current?.patientId) || currentPatient;
      if (targetP && targetP.id === popupRef.current.patientId) {
        popupRef.current.root.render(
          <PopupContent patient={targetP} data={vitals} />
        );
      }
    }
  }, [vitals, allPatients, currentPatient]);

  const syncLayers = useCallback(() => {
    if (!mapRef.current || !window.L || !mapReady) return;

    try {
      // 1-1. 경로선 레이어 관리 (깜빡임 최소화)
      if (!pathGroupRef.current) {
        pathGroupRef.current = window.L.layerGroup().addTo(mapRef.current);
      }

      let assignedAmb = displayAmbulances.find(
        (a) => a.id === currentPatient.matchedAmbulanceId,
      );

      // 로컬에서 계산된 경로가 있으면 병합 (백엔드 데이터보다 우선)
      if (assignedAmb && matchedAmbulance && assignedAmb.id === matchedAmbulance.id) {
        if (matchedAmbulance.patrolPath && matchedAmbulance.patrolPath.length > 0) {
          // 현재 위치와 가장 가까운 경로 상의 인덱스 계산
          const localPath = matchedAmbulance.patrolPath;
          let minDist = Infinity;
          let closestIdx = 0;
          
          // 단순 거리 비교로 근사 위치 찾기
          for(let i = 0; i < localPath.length; i++) {
            const d = Math.pow(localPath[i].lat - assignedAmb.lat, 2) + Math.pow(localPath[i].lng - assignedAmb.lng, 2);
            if(d < minDist) {
              minDist = d;
              closestIdx = i;
            }
          }

          assignedAmb = {
            ...assignedAmb,
            patrolPath: localPath,
            dispatchPathLen: matchedAmbulance.dispatchPathLen,
            patrolIndex: closestIdx
          };
        }
      }

      const pathKey =
        (assignedAmb?.id || "none") +
        assignedAmb?.activity +
        (assignedAmb?.patrolPath?.length || 0) +
        (assignedAmb?.patrolIndex || 0);

      if (pathGroupRef.current._lastPathKey !== pathKey) {
        pathGroupRef.current.clearLayers();

        // 1-1-1. 선택된 차량의 단계별 경로 표시
        if (
          assignedAmb?.patrolPath &&
          assignedAmb.dispatchPathLen !== undefined
        ) {
          const fullPath = assignedAmb.patrolPath;
          const splitIdx = assignedAmb.dispatchPathLen;
          const currentIdx = assignedAmb.patrolIndex || 0;

          if (assignedAmb.activity === "heading_to_patient") {
            // 출동 중: 구급차 위치부터 환자 위치까지만 파란색으로 표시
            const toPatientPath = fullPath.slice(currentIdx, splitIdx + 1);
            if (toPatientPath.length > 1) {
              window.L.polyline(
                toPatientPath.map((p: any) => [p.lat, p.lng]),
                {
                  color: "#3b82f6",
                  weight: 6,
                  opacity: 0.8,
                  dashArray: "10, 10",
                },
              ).addTo(pathGroupRef.current);
            }
          } else if (
            assignedAmb.activity === "boarding" ||
            assignedAmb.activity === "transporting_to_hospital"
          ) {
            // 이송 조치 중 또는 이송 중: 현재 위치부터 병원까지만 빨간색으로 표시
            const toHospitalPath = fullPath.slice(currentIdx);
            if (toHospitalPath.length > 1) {
              window.L.polyline(
                toHospitalPath.map((p: any) => [p.lat, p.lng]),
                {
                  color: "#ef4444",
                  weight: 6,
                  opacity: 0.8,
                  dashArray: "10, 10",
                },
              ).addTo(pathGroupRef.current);
            }
          }
        }

        // 1-1-2. 배경의 다른 차량 경로 표시 (현재 가야 할 구간만 표시)
        displayAmbulances.forEach((amb) => {
          if (assignedAmb && amb.id === assignedAmb.id) return;
          if (amb.patrolPath && amb.patrolIndex !== undefined) {
            const isHeading = amb.activity === "heading_to_patient";
            const isBoarding = amb.activity === "boarding";
            const isTransporting = amb.activity === "transporting_to_hospital";

            if (isHeading || isBoarding || isTransporting) {
              const currentIdx = amb.patrolIndex;
              const targetIdx = isHeading
                ? amb.dispatchPathLen || amb.patrolPath.length
                : amb.patrolPath.length;
              const remainingPath = amb.patrolPath.slice(currentIdx, targetIdx);

              if (remainingPath.length > 1) {
                window.L.polyline(
                  remainingPath.map((p: any) => [p.lat, p.lng]),
                  {
                    color: isHeading
                      ? "#3b82f6"
                      : isBoarding
                        ? "#f59e0b"
                        : "#ef4444",
                    weight: 2,
                    opacity: 0.2,
                    dashArray: "5, 5",
                  },
                ).addTo(pathGroupRef.current);
              }
            }
          }
        });

        pathGroupRef.current._lastPathKey = pathKey;
      }

      // 1-2. 정적 레이어 그룹
      if (!staticGroupRef.current) {
        staticGroupRef.current = window.L.layerGroup().addTo(mapRef.current);
      }

      // 1-3. 병원 마커
      if (!mapRef.current._hMarkers) {
        mapRef.current._hMarkers = {};
        if (hospitalData && hospitalData.length > 0) {
          hospitalData.forEach((h) => {
            if (!h.lat || !h.lng) return;
            const isM = hospital && h.id === hospital.id;
            const hIcon = window.L.divIcon({
              className: "h-icon",
              html: `<div style="width:22px;height:22px;background-color:${isM ? "#ef4444" : "#1e293b"};border:2px solid #fff;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;${isM ? "animation:pulse 2s infinite;" : ""}">H</div>`,
            });
            const m = window.L.marker([h.lat, h.lng], { icon: hIcon }).addTo(
              staticGroupRef.current,
            );
            mapRef.current._hMarkers[h.id] = m;
          });
        }
      }

      // 1-4. 구급차 마커 통합 관리 (깜빡임 방지)
      if (!mapRef.current._ambMarkers) mapRef.current._ambMarkers = {};
      const currentAmbIds = new Set((displayAmbulances || []).map((a) => a.id));

      if (displayAmbulances && displayAmbulances.length > 0) {
        displayAmbulances.forEach((amb) => {
          if (!amb.lat || !amb.lng) return;

          const isSelected = currentPatient.matchedAmbulanceId === amb.id;
          const patientBeingTransported = (allPatients || []).find(
            (p) =>
              p.matchedAmbulanceId === amb.id &&
              p.status !== PatientStatus.TRANSPORTED,
          );
          const isTransportingInBg = !!patientBeingTransported && !isSelected;

          // 전역 상태에서 직접 좌표 가져옴
          const targetLat = amb.lat;
          const targetLng = amb.lng;

          // 상태별 라벨 및 색상 정의
          let statusLabel = "대기";
          let statusColor = "#10b981";

          if (amb.activity === "transporting_to_hospital") {
            statusLabel = "이송중";
            statusColor = "#ef4444";
          } else if (amb.activity === "boarding") {
            statusLabel = "이송조치중";
            statusColor = "#f59e0b"; // 주황색으로 강조
          } else if (
            amb.activity === "heading_to_patient" ||
            amb.status === AmbulanceStatus.DISPATCHED
          ) {
            statusLabel = "출동중";
            statusColor = "#3b82f6";
          } else if (
            amb.activity === "patrolling" ||
            amb.activity === "returning"
          ) {
            statusLabel = "대기";
            statusColor = "#10b981";
          } else if (amb.status === AmbulanceStatus.BUSY) {
            statusLabel = "운행중";
            statusColor = "#f59e0b";
          }

          // 선택된 차량 특수 스타일
          const finalStatusLabel = isSelected
            ? assignedAmb?.activity === "transporting_to_hospital"
              ? "이송중"
              : assignedAmb?.activity === "boarding"
                ? "이송조치중"
                : assignedAmb?.activity === "heading_to_patient"
                  ? "출동중"
                  : statusLabel
            : statusLabel;
          const finalColor = isSelected
            ? assignedAmb?.activity === "transporting_to_hospital"
              ? "#ef4444"
              : assignedAmb?.activity === "boarding"
                ? "#f59e0b"
                : "#3b82f6"
            : statusColor;

          const iconHtml = `
            <div class="ambulance-marker-wrapper flex flex-col items-center justify-center" style="width: 48px; height: 48px;">
              <div class="ambulance-label" style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: ${finalColor}; color: white; padding: ${isSelected ? "2px 6px" : "1px 5px"}; border-radius: ${isSelected ? "4px" : "3px"}; font-size: ${isSelected ? "10px" : "9px"}; margin-bottom: 4px; white-space: nowrap; border: 1px solid rgba(255,255,255,${isSelected ? "0.2" : "0.1"}); font-weight: ${isSelected ? "700" : "400"}; z-index: 1001;">
                ${amb.unitName} (${finalStatusLabel})
              </div>
              <div style="width:${isSelected ? "34px" : "26px"}; height:${isSelected ? "34px" : "26px"}; background-color:${finalColor}; border:${isSelected ? "3px" : "2px"} solid #fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:${isSelected ? "20px" : "16px"}; box-shadow:0 2px 10px rgba(0,0,0,0.3); transition: all 0.2s; ${isSelected ? "animation:pulse 2s infinite;" : ""}">🚑</div>
            </div>`;

          const aPopupContent = `
            <div style="padding: 10px; min-width: 150px;">
              <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; color: #1e293b;">${amb.unitName}</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">상태: <span style="color: ${finalColor}; font-weight: 600;">${finalStatusLabel}</span></div>
              <div style="font-size: 11px; color: #64748b;">기종: ${amb.type}</div>
            </div>`;

          if (mapRef.current._ambMarkers[amb.id]) {
            const m = mapRef.current._ambMarkers[amb.id];
            m.setLatLng([amb.lat, amb.lng]);

            const stateKey = finalStatusLabel + finalColor + isSelected;
            if (m._lastStateKey !== stateKey) {
              const aIcon = window.L.divIcon({
                className: isSelected ? "a-icon-m-hover" : "a-icon-static",
                html: iconHtml,
                iconSize: [48, 48],
                iconAnchor: [24, 24], // 중심축을 정확히 중앙으로 고정 (도로 이탈 방지)
              });
              m.setIcon(aIcon);
              m.setPopupContent(aPopupContent);
              m._lastStateKey = stateKey;
              if (isSelected) m.setZIndexOffset(1000);
              else m.setZIndexOffset(0);
            }
          } else {
            const aIcon = window.L.divIcon({
              className: isSelected ? "a-icon-m-hover" : "a-icon-static",
              html: iconHtml,
              iconSize: [48, 48],
              iconAnchor: [24, 24], // 중심축을 정확히 중앙으로 고정
            });
            const m = window.L.marker([targetLat, targetLng], { icon: aIcon })
              .addTo(mapRef.current)
              .bindPopup(aPopupContent, {
                closeButton: false,
                offset: [0, -10],
              });
            m._lastStateKey = finalStatusLabel + finalColor + isSelected;
            if (isSelected) m.setZIndexOffset(1000);
            mapRef.current._ambMarkers[amb.id] = m;
          }

          if (isSelected) {
            ambulanceMarkerRef.current = mapRef.current._ambMarkers[amb.id];
          }
        });
      }

      // 없어진 구급차 마커 제거
      Object.keys(mapRef.current._ambMarkers).forEach((id) => {
        if (!currentAmbIds.has(id)) {
          mapRef.current._ambMarkers[id].remove();
          delete mapRef.current._ambMarkers[id];
        }
      });

      // 1-5. 환자 마커 통합 관리 (모든 환자 표시 및 구급차 밀착 동기화)
      if (!mapRef.current._patientMarkers) mapRef.current._patientMarkers = {};
      
      // allPatients가 비어있어도 currentPatient는 반드시 표시
      const patientsToRender = (allPatients && allPatients.length > 0) ? allPatients : [currentPatient];

      const currentPatientIds = new Set(
        patientsToRender
          .filter((p) => p.status !== PatientStatus.TRANSPORTED)
          .map((p) => p.id),
      );

      patientsToRender.forEach((p) => {
        if (p.status === PatientStatus.TRANSPORTED) return;

        const isSelected = currentPatient?.id === p.id;
        const matchedAmb = displayAmbulances?.find(
          (a) => a.id === p.matchedAmbulanceId,
        );
        const isBeingTransported =
          matchedAmb &&
          (matchedAmb.activity === "boarding" ||
            matchedAmb.activity === "transporting_to_hospital");

        // 이송 중이면 구급차 위치를 실시간으로 100% 동기화 (오차 0)
        const displayLat = isBeingTransported ? matchedAmb.lat : p.lat;
        const displayLng = isBeingTransported ? matchedAmb.lng : p.lng;

        const triageLevel =
          p.status === PatientStatus.CRITICAL
            ? "응급"
            : p.status === PatientStatus.DANGER
              ? "위험"
              : p.status === PatientStatus.WARNING
                ? "경고"
                : p.status === PatientStatus.CAUTION
                  ? "주의"
                  : p.status === PatientStatus.NORMAL
                    ? "정상"
                    : "매칭 대기";
        const statusColor =
          triageLevel === "응급"
            ? "#ef4444"
            : triageLevel === "위험"
              ? "#f97316"
              : triageLevel === "경고"
                ? "#eab308"
                : triageLevel === "주의"
                  ? "#3b82f6"
                  : triageLevel === "정상"
                    ? "#10b981"
                    : "#64748b";
        let statusLabelText =
          p.status === PatientStatus.PENDING
            ? "매칭 대기"
            : `${triageLevel}(${p.status})`;

        const pIconHtml = `
            <div class="flex flex-col items-center" style="transform: translateY(${isBeingTransported ? "-22px" : "-15px"}); transition: transform 0.1s;">
              <div style="background: rgba(15, 23, 42, 0.95); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-bottom: 4px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 4px; z-index: 2000;">
                <span style="font-weight: 800;">${p.name}</span>
                <span style="opacity: 0.7;">${p.age}세</span>
                <span style="background: ${statusColor}; color: white; padding: 0px 4px; border-radius: 2px; font-size: 9px; font-weight: 900;">${statusLabelText}</span>
              </div>
              ${
                isBeingTransported
                  ? ""
                  : `
              <div class="relative flex items-center justify-center">
                <div class="absolute w-12 h-12 bg-red-600/30 rounded-full animate-ping"></div>
                <div class="w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-xl"></div>
              </div>`
              }
            </div>`;

        const pPopupContent = `
          <div style="padding: 10px; min-width: 150px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; color: #1e293b;">${p.name} (${p.age}세)</div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">${p.location}</div>
          </div>`;

        if (mapRef.current._patientMarkers[p.id]) {
          const m = mapRef.current._patientMarkers[p.id];
          m.setLatLng([displayLat, displayLng]);

          const stateKey = p.status + isBeingTransported + isSelected;
          if (m._lastStateKey !== stateKey) {
            const pIcon = window.L.divIcon({
              className: "p-icon",
              html: pIconHtml,
              iconSize: [120, 60],
              iconAnchor: [60, 60],
            });
            m.setIcon(pIcon);
            m._lastStateKey = stateKey;
            if (isSelected) m.setZIndexOffset(2000);
            else m.setZIndexOffset(100);
          }
          
          // 팝업 이벤트 핸들러 재등록 (클로저 갱신을 위해)
          m.off('click');
          m.on('click', () => {
             const container = document.createElement('div');
             const root = createRoot(container);
             
             window.L.popup({
               minWidth: 320,
               maxWidth: 320,
               className: 'custom-popup-dark bg-slate-900 text-white border-0'
             })
             .setLatLng([displayLat, displayLng])
             .setContent(container)
             .openOn(mapRef.current);
             
             root.render(<PopupContent patient={p} data={vitalsRef.current} />);
             popupRef.current = { root, patientId: p.id };
          });

        } else {
          const pIcon = window.L.divIcon({
            className: "p-icon",
            html: pIconHtml,
            iconSize: [120, 60],
            iconAnchor: [60, 60],
          });
          const m = window.L.marker([displayLat, displayLng], { icon: pIcon })
            .addTo(mapRef.current);
            
          m.on('click', () => {
             const container = document.createElement('div');
             const root = createRoot(container);
             
             window.L.popup({
               minWidth: 320,
               maxWidth: 320,
               className: 'custom-popup-dark bg-slate-900 text-white border-0'
             })
             .setLatLng([displayLat, displayLng])
             .setContent(container)
             .openOn(mapRef.current);
             
             root.render(<PopupContent patient={p} data={vitalsRef.current} />);
             popupRef.current = { root, patientId: p.id };
          });

          m._lastStateKey = p.status + isBeingTransported + isSelected;
          if (isSelected) m.setZIndexOffset(2000);
          mapRef.current._patientMarkers[p.id] = m;
        }
      });

      // 없어진 환자 마커 제거
      Object.keys(mapRef.current._patientMarkers).forEach((id) => {
        if (!currentPatientIds.has(id)) {
          mapRef.current._patientMarkers[id].remove();
          delete mapRef.current._patientMarkers[id];
        }
      });
    } catch (e) {
      console.error("syncLayers error:", e);
    }
  }, [
    currentPatient,
    matchedAmbulance,
    hospital,
    hospitalData,
    displayAmbulances,
    allPatients,
    mapReady,
    hospitalPath,
  ]);

  // 2. 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initMap = () => {
      if (!window.L) {
        setTimeout(initMap, 100);
        return;
      }

      mapRef.current = window.L.map(mapContainerRef.current, {
        center: [initialPatient.lat, initialPatient.lng],
        zoom: 16,
        attributionControl: false,
      });

      window.L.tileLayer(
        "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        {
          subdomains: ["0", "1", "2", "3"],
        },
      ).addTo(mapRef.current);

      setMapReady(true);
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 3. 환자 데이터 동기화 및 지도 이동
  useEffect(() => {
    // ID 또는 배정된 구급차가 바뀌면 상태 초기화
    if (
      currentPatient.id !== initialPatient.id ||
      currentPatient.matchedAmbulanceId !== initialPatient.matchedAmbulanceId
    ) {
      if (currentPatient.id !== initialPatient.id) {
        setPhase(TransportPhase.WAITING);
        setMatchedAmbulance(null);
        setHospitalPath([]);
        animPosRef.current = null;

        if (mapRef.current && mapReady) {
          mapRef.current.flyTo([initialPatient.lat, initialPatient.lng], 16, {
            duration: 1.2,
          });
          const matchedAmb = displayAmbulances?.find(
            (a) => a.id === initialPatient.matchedAmbulanceId,
          );
          const isBeingTransported =
            matchedAmb &&
            (matchedAmb.activity === "boarding" ||
              matchedAmb.activity === "transporting_to_hospital");
          const displayLat = isBeingTransported
            ? matchedAmb.lat
            : initialPatient.lat;
          const displayLng = isBeingTransported
            ? matchedAmb.lng
            : initialPatient.lng;
          try {
            mapRef.current.closePopup();
          } catch {}
          const container = document.createElement("div");
          const root = createRoot(container);
          window.L.popup({
            minWidth: 320,
            maxWidth: 320,
            className: "custom-popup-dark bg-slate-900 text-white border-0",
          })
            .setLatLng([displayLat, displayLng])
            .setContent(container)
            .openOn(mapRef.current);
          root.render(
            <PopupContent patient={initialPatient} data={vitalsRef.current} />,
          );
          popupRef.current = { root, patientId: initialPatient.id };
        }
      } else {
        setMatchedAmbulance(null);
        setPhase(TransportPhase.WAITING);
      }
    }

    // 데이터 상시 동기화
    setCurrentPatient(initialPatient);

    if (mapReady) {
      setTimeout(syncLayers, 100);
    }
  }, [initialPatient, mapReady]);

  // 4. 데이터 로드 (병원)
  useEffect(() => {
    const loadHospitals = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "/api"}/emergency/hospitals/map-data`,
        );
        const data = await res.json();
        if (data.success && data.data?.hospitals) {
          setHospitalData(data.data.hospitals.slice(0, 30));
        } else {
          throw new Error("Fallback");
        }
      } catch (e) {
        setHospitalData([
          { id: "h1", name: "서울대학교병원", lat: 37.5796, lng: 127.0007 },
          { id: "h4", name: "삼성서울병원", lat: 37.4882, lng: 127.0851 },
          { id: "h2", name: "세브란스병원", lat: 37.5623, lng: 126.9408 },
          { id: "h3", name: "서울아산병원", lat: 37.5266, lng: 127.1082 },
        ]);
      }
    };
    loadHospitals();
  }, []);

  // Helper to generate a Manhattan-style route (L-shape) for fallback
  const generateManhattanRoute = (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
    // 50% chance to go Horizontal first, then Vertical
    // 50% chance to go Vertical first, then Horizontal
    const goHorizontalFirst = Math.random() > 0.5;
    
    const midPoint = goHorizontalFirst 
      ? [start.lat, end.lng] 
      : [end.lat, start.lng];

    return [
      { lat: start.lat, lng: start.lng },
      { lat: midPoint[0], lng: midPoint[1] },
      { lat: end.lat, lng: end.lng }
    ];
  };

  // 5. 도로 경로 Fetch (OSRM with failover)
  const fetchPath = useCallback(
    async (
      s: { lat: number; lng: number },
      e: { lat: number; lng: number },
    ) => {
      // List of OSRM servers to try (Main + Backup)
      const servers = [
        "https://routing.openstreetmap.de/routed-car/route/v1/driving",
        "https://router.project-osrm.org/route/v1/driving"
      ];

      for (const server of servers) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

          const url = `${server}/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson`;
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!res.ok) continue;

          const data = await res.json();
          const points = data.routes?.[0]?.geometry?.coordinates?.map(
            (c: any) => ({ lat: c[1], lng: c[0] }),
          );

          if (points && points.length > 0) return points;
        } catch (err) {
          console.warn(`Route fetch failed from ${server}:`, err);
          // Continue to next server
        }
      }
      
      // All servers failed - use Manhattan route instead of straight line
      console.warn("All OSRM servers failed, using Manhattan route fallback");
      return generateManhattanRoute(s, e);
    },
    [],
  );

  // 6. 매칭 로직 (상위에서 배정된 구급차 확인)
  useEffect(() => {
    if (
      !currentPatient?.matchedAmbulanceId ||
      !externalAmbulances
    )
      return;

    // 상위에서 배정된 구급차 찾기
    const assignedAmb = externalAmbulances.find(
      (a) => a.id === currentPatient.matchedAmbulanceId,
    );

    if (assignedAmb) {
      // 1. 출동 경로 (구급차 -> 환자)
      if (!matchedAmbulance && (assignedAmb.activity === "heading_to_patient" || assignedAmb.status === AmbulanceStatus.DISPATCHED)) {
        const startJourney = async () => {
          const p1 = await fetchPath(assignedAmb, currentPatient);
          if (p1) {
            setMatchedAmbulance({
              ...assignedAmb,
              path: p1,
              patrolPath: p1,
              dispatchPathLen: p1.length - 1,
              status: AmbulanceStatus.DISPATCHED,
            });
            setPhase(TransportPhase.TO_PATIENT);
          }
        };
        startJourney();
      }
      
      // 2. 이송 경로 (환자 -> 병원)
      if (hospital && (assignedAmb.activity === "transporting_to_hospital" || assignedAmb.activity === "boarding")) {
         // 이미 경로가 있거나 계산 중이면 스킵 (중복 방지)
         if (phase !== TransportPhase.TO_HOSPITAL) {
           const startTransport = async () => {
             const p2 = await fetchPath(currentPatient, hospital);
             if (p2) {
               setMatchedAmbulance(prev => ({
                 ...(prev || assignedAmb),
                 path: p2,
                 patrolPath: p2,
                 dispatchPathLen: p2.length - 1,
                 activity: "transporting_to_hospital"
               }));
               setPhase(TransportPhase.TO_HOSPITAL);
             }
           };
           startTransport();
         }
      }
    }
  }, [
    currentPatient.matchedAmbulanceId,
    externalAmbulances,
    phase,
    matchedAmbulance,
    hospital,
    currentPatient, // currentPatient 위치 변경 시 경로 재계산 필요 여부 고려
    fetchPath
  ]);

  const hospitalRef = useRef<Hospital | undefined>(hospital);
  useEffect(() => {
    hospitalRef.current = hospital;
  }, [hospital]);

  // 7. 애니메이션 루프 (전역 상태에 의한 이동으로 단순화)
  useEffect(() => {
    // 이제 개별 애니메이션 루프 대신 syncLayers만 호출하여 전역 좌표 동기화
    if (mapReady) syncLayers();
  }, [displayAmbulances, syncLayers, mapReady]);

  // 8. 정기적인 레이어 갱신
  useEffect(() => {
    if (mapReady) syncLayers();
  }, [mapReady, currentPatient, displayAmbulances, hospitalData, syncLayers]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (mapReady) syncLayers();
    }, 100); // 100ms 주기로 대폭 단축하여 건물 가로지름 방지 및 부드러운 이동 구현
    return () => clearInterval(timer);
  }, [syncLayers, mapReady]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      <style jsx global>{`
        .leaflet-marker-icon {
          background: transparent !important;
          border: none !important;
        }
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default WorkingMap;
