import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Patient,
  Hospital,
  Ambulance,
  AmbulanceStatus,
  PatientStatus,
} from "../types";

declare var window: Window & typeof globalThis & { L: any };

import "leaflet/dist/leaflet.css";

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

  // 모든 환자의 애니메이션 위치를 관리하는 Ref
  const allPatientsAnimPosRef = useRef<
    Record<string, { lat: number; lng: number }>
  >({});
  // 현재 선택된 환자 애니메이션 위치
  const animPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const displayAmbulances = externalAmbulances || [];

  // 1. 레이어 및 마커 동기화 함수
  const syncLayers = useCallback(() => {
    if (!mapRef.current || !window.L || !mapReady) return;

    try {
      // 1-1. 경로선 레이어 관리 (깜빡임 최소화)
      if (!pathGroupRef.current) {
        pathGroupRef.current = window.L.layerGroup().addTo(mapRef.current);
      }

      const assignedAmb = displayAmbulances.find(
        (a) => a.id === currentPatient.matchedAmbulanceId,
      );

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
      const currentPatientIds = new Set(
        (allPatients || [])
          .filter((p) => p.status !== PatientStatus.TRANSPORTED)
          .map((p) => p.id),
      );

      (allPatients || []).forEach((p) => {
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
        } else {
          const pIcon = window.L.divIcon({
            className: "p-icon",
            html: pIconHtml,
            iconSize: [120, 60],
            iconAnchor: [60, 60],
          });
          const m = window.L.marker([displayLat, displayLng], { icon: pIcon })
            .addTo(mapRef.current)
            .bindPopup(pPopupContent, { closeButton: false, offset: [0, -30] });
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
        // 환자 자체가 바뀌면 전체 리셋
        setPhase(TransportPhase.WAITING);
        setMatchedAmbulance(null);
        setHospitalPath([]);
        animPosRef.current = null;

        if (mapRef.current && mapReady) {
          mapRef.current.flyTo([initialPatient.lat, initialPatient.lng], 16, {
            duration: 1.2,
          });
        }
      } else {
        // 같은 환자인데 구급차만 바뀐 경우 (재배정)
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
          "http://localhost:5000/api/emergency/hospitals/map-data",
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

  // 5. 도로 경로 Fetch
  const fetchPath = useCallback(
    async (
      s: { lat: number; lng: number },
      e: { lat: number; lng: number },
    ) => {
      try {
        const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        const points = data.routes?.[0]?.geometry?.coordinates?.map(
          (c: any) => ({ lat: c[1], lng: c[0] }),
        );

        if (points && points.length > 0) return points;
        throw new Error("No route points");
      } catch (err) {
        console.warn("Routing API failed, using straight line fallback:", err);
        // 직선 경로라도 반환하여 시스템이 멈추지 않게 함
        return [
          { lat: s.lat, lng: s.lng },
          { lat: e.lat, lng: e.lng },
        ];
      }
    },
    [],
  );

  // 6. 매칭 로직 (상위에서 배정된 구급차 확인)
  useEffect(() => {
    if (
      !currentPatient?.matchedAmbulanceId ||
      !externalAmbulances ||
      phase !== TransportPhase.WAITING
    )
      return;

    // 상위에서 배정된 구급차 찾기
    const assignedAmb = externalAmbulances.find(
      (a) => a.id === currentPatient.matchedAmbulanceId,
    );

    if (assignedAmb && !matchedAmbulance) {
      const startJourney = async () => {
        const p1 = await fetchPath(assignedAmb, currentPatient);
        if (p1) {
          setMatchedAmbulance({
            ...assignedAmb,
            path: p1,
            status: AmbulanceStatus.DISPATCHED,
          });
          setPhase(TransportPhase.TO_PATIENT);
        }
      };
      startJourney();
    }
  }, [
    currentPatient.matchedAmbulanceId,
    externalAmbulances,
    phase,
    matchedAmbulance,
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
