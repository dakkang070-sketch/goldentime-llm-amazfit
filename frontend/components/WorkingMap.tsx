import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
  YAxis,
  XAxis,
} from "recharts";
import {
  Patient,
  Hospital,
  Ambulance,
  AmbulanceStatus,
  PatientStatus,
} from "../types";
import { ALL_FIRE_STATIONS, SEOUL_MAP_HOSPITALS } from "../constants";
import { useResolvedAddress } from "../utils/addressResolver";
import { getPatientMonitoringVisualState } from "../utils/patientMonitoringState";
import { getGoldenTimeCaseLabel } from "../utils/showcaseSimulation";

declare var window: Window & typeof globalThis & { L: any };

import "leaflet/dist/leaflet.css";

/**
 * 대형 오버레이 팝업을 마커 중심 기준으로 배치합니다.
 */
function calculatePopupOverlayLayout(
  screenPos: { x: number; y: number },
  containerSize: { width: number; height: number },
) {
  const popupWidth = Math.min(880, Math.max(520, containerSize.width - 120));
  const popupHeight = 424;
  const edgePadding = 18;
  const markerGap = 44;
  let placement: "above" | "below" = "above";

  let left = screenPos.x - popupWidth / 2;
  let top = screenPos.y - popupHeight - markerGap;

  if (left < edgePadding) {
    left = edgePadding;
  }
  if (left + popupWidth > containerSize.width - edgePadding) {
    left = containerSize.width - popupWidth - edgePadding;
  }
  if (top < edgePadding) {
    placement = "below";
    top = Math.min(
      containerSize.height - popupHeight - edgePadding,
      screenPos.y + markerGap,
    );
  }
  if (top + popupHeight > containerSize.height - edgePadding) {
    top = containerSize.height - popupHeight - edgePadding;
  }

  return {
    left,
    top,
    width: popupWidth,
    placement,
  };
}

/**
 * 전화 연결에 사용할 번호에서 숫자와 `+`만 남겨 dial 문자열로 정리합니다.
 */
function normalizeDialNumber(rawPhone?: string) {
  const trimmed = String(rawPhone || "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/(?!^\+)[^\d]/g, "");
}

/**
 * 선택 경로 오버레이도 도로 궤적을 더 촘촘하게 따르도록 점을 보간합니다.
 */
function densifyPathPoints(points: { lat: number; lng: number }[]) {
  if (points.length <= 1) return points;

  const densified: { lat: number; lng: number }[] = [points[0]];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const straightDistance = Math.sqrt(
      (current.lat - previous.lat) * (current.lat - previous.lat) +
        (current.lng - previous.lng) * (current.lng - previous.lng),
    );
    const subdivisions = Math.max(1, Math.ceil(straightDistance / 0.00008));

    for (let step = 1; step <= subdivisions; step += 1) {
      const ratio = step / subdivisions;
      densified.push({
        lat: previous.lat + (current.lat - previous.lat) * ratio,
        lng: previous.lng + (current.lng - previous.lng) * ratio,
      });
    }
  }

  return densified;
}

/**
 * WorkingMap 내부에서도 경로 시작/종료점을 도로 위로 스냅합니다.
 */
async function snapPathPointToRoad(
  point: { lat: number; lng: number },
  servers: string[],
) {
  for (const server of servers) {
    try {
      // 여러 라우팅 서버를 순회하며 nearest 응답이 되는 첫 좌표를 채택합니다.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const nearestServer = server.replace("/route/v1/driving", "/nearest/v1/driving");
      const url = `${nearestServer}/${point.lng},${point.lat}?number=1`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const data = await res.json();
      const nearest = data.waypoints?.[0]?.location;
      if (Array.isArray(nearest) && nearest.length >= 2) {
        return { lat: nearest[1], lng: nearest[0] };
      }
    } catch {
      // 다음 서버 시도
    }
  }

  return point;
}

/**
 * 관제 지도 팝업에서 표시할 생체 데이터 수치 목록을 생성합니다.
 */
function buildPopupVitals(patient: Patient) {
  const rawHr = patient.vitals?.heartRate;
  const spo2 =
    typeof patient.vitals?.oxygenLevel === "number" &&
    Number.isFinite(patient.vitals.oxygenLevel) &&
    patient.vitals.oxygenLevel > 0
      ? patient.vitals.oxygenLevel
      : null;
  const stress = typeof patient.vitals?.stressLevel === "number" ? patient.vitals.stressLevel : null;
  const watchRemoved = patient.vitals?.isWear === false;
  const bodyTemp = typeof patient.vitals?.bodyTemp === "number" ? patient.vitals.bodyTemp : null;
  const steps = typeof patient.steps === "number" ? patient.steps : null;
  const fallScore = typeof patient.vitals?.fallScore === "number" ? patient.vitals.fallScore : null;
  const emergencyScore =
    typeof patient.vitals?.emergencyScore === "number" ? patient.vitals.emergencyScore : null;

  const tempText =
    typeof bodyTemp === "number" && Number.isFinite(bodyTemp) && bodyTemp > 0 ? `${bodyTemp.toFixed(1)}°C` : "미수집";
  const stressText =
    typeof stress === "number" && Number.isFinite(stress) ? String(stress) : "미수집";
  const stepsText = typeof steps === "number" && Number.isFinite(steps) ? `${steps}보` : "미수집";
  const fallText =
    typeof fallScore === "number" && Number.isFinite(fallScore) ? String(fallScore) : "미수집";
  const emergencyText =
    typeof emergencyScore === "number" && Number.isFinite(emergencyScore) ? String(emergencyScore) : "미수집";
  const hrText = watchRemoved
    ? "0 bpm"
    : typeof rawHr === "number" && Number.isFinite(rawHr) && rawHr > 0
      ? `${rawHr} bpm`
      : "미수집";
  const spo2Text = watchRemoved ? "0%" : typeof spo2 === "number" ? `${spo2}%` : "미수집";
  // 팝업 카드가 공통 렌더러를 쓰도록 label/value 목록 형태로 정리해 반환합니다.
  return [
    { label: "착용", value: watchRemoved ? "탈착 감지" : "착용 중", accent: "text-slate-100" },
    { label: "심박", value: hrText, accent: "text-red-300" },
    { label: "SpO2", value: spo2Text, accent: "text-sky-300" },
    { label: "피부온도", value: tempText, accent: "text-emerald-300" },
    { label: "스트레스", value: stressText, accent: "text-amber-300" },
    { label: "걸음", value: stepsText, accent: "text-slate-100" },
  ];
}

/**
 * 심박수 값을 기준으로 수술실 모니터 스타일의 파형 데이터를 생성합니다.
 * 실제 ECG가 아니라 현재 심박수 값 기반의 시각화용 파형입니다.
 */
function buildHrMonitorWaveform(
  signalData: Array<{ time: number | string; hrTrend: number | null }>,
  fallbackHr?: number | null,
  phaseOffsetMs = 0,
) {
  const validHr = signalData
    .map((point) =>
      typeof point?.hrTrend === "number" && Number.isFinite(point.hrTrend) && point.hrTrend > 0
        ? point.hrTrend
        : null,
    )
    .filter((value): value is number => value !== null);

  const recentHr = validHr.slice(-5);
  const averagedHr =
    recentHr.length > 0
      ? recentHr.reduce((sum, value) => sum + value, 0) / recentHr.length
      : typeof fallbackHr === "number" && Number.isFinite(fallbackHr) && fallbackHr > 0
        ? fallbackHr
        : null;

  if (averagedHr === null) {
    return [];
  }

  const bpm = Math.max(40, Math.min(180, averagedHr));
  const displayWindowMs = 8000;
  const sampleStepMs = 40;
  const beatIntervalMs = 60000 / bpm;
  const hrSpread =
    recentHr.length > 1 ? Math.max(...recentHr) - Math.min(...recentHr) : 0;
  // 최근 심박 변동폭이 클수록 박동 간격에 작은 흔들림을 줘 정지된 직선처럼 보이지 않게 합니다.
  const rhythmJitter = Math.min(0.012, hrSpread * 0.0012);
  const qrsGain = bpm >= 110 ? 1.12 : bpm <= 55 ? 0.92 : 1;

  /**
   * `getMonitorValue` 관련 데이터를 계산하거나 변환합니다.
   */
  const getMonitorValue = (phase: number) => {
    if (phase < 0.08) return 0.02 + Math.sin((phase / 0.08) * Math.PI) * 0.12;
    if (phase < 0.11) return 0.02 - ((phase - 0.08) / 0.03) * 0.22;
    if (phase < 0.135) return -0.2 + ((phase - 0.11) / 0.025) * 1.45 * qrsGain;
    if (phase < 0.16) return 1.25 * qrsGain - ((phase - 0.135) / 0.025) * 1.5 * qrsGain;
    if (phase < 0.22) return -0.25 + ((phase - 0.16) / 0.06) * 0.28;
    if (phase < 0.4) return 0.03 + Math.sin(((phase - 0.22) / 0.18) * Math.PI) * 0.18;
    return Math.sin(((phase - 0.4) / 0.6) * Math.PI * 6) * 0.015;
  };

  // 8초 표시 구간을 일정 샘플 간격으로 나눠 애니메이션용 파형 배열을 만듭니다.
  const waveform: Array<{ time: number; ecgValue: number }> = [];
  const sampleCount = Math.round(displayWindowMs / sampleStepMs);

  for (let step = 0; step <= sampleCount; step += 1) {
    const time = step * sampleStepMs;
    const jitter =
      Math.sin((time + phaseOffsetMs) / 1900) * beatIntervalMs * rhythmJitter;
    const phase = ((time + phaseOffsetMs + jitter) % beatIntervalMs) / beatIntervalMs;
    waveform.push({
      time,
      ecgValue: getMonitorValue(phase),
    });
  }

  return waveform;
}

/**
 * HR/SpO2 값을 기준으로 병원 모니터 스타일의 Pleth 파형 데이터를 생성합니다.
 * 실제 PPG/Pleth 원파형이 아니라 현재 수치 기반의 시각화용 파형입니다.
 */
function buildSpo2PlethWaveform(
  signalData: Array<{ hrTrend: number | null; spo2Trend: number | null }>,
  fallbackHr?: number | null,
  fallbackSpo2?: number | null,
  phaseOffsetMs = 0,
) {
  const validHr = signalData
    .map((point) =>
      typeof point?.hrTrend === "number" && Number.isFinite(point.hrTrend) && point.hrTrend > 0
        ? point.hrTrend
        : null,
    )
    .filter((value): value is number => value !== null);
  const validSpo2 = signalData
    .map((point) =>
      typeof point?.spo2Trend === "number" && Number.isFinite(point.spo2Trend) && point.spo2Trend > 0
        ? point.spo2Trend
        : null,
    )
    .filter((value): value is number => value !== null);

  const averagedHr =
    validHr.length > 0
      ? validHr.slice(-5).reduce((sum, value) => sum + value, 0) / Math.min(5, validHr.length)
      : typeof fallbackHr === "number" && Number.isFinite(fallbackHr) && fallbackHr > 0
        ? fallbackHr
        : null;
  const averagedSpo2 =
    validSpo2.length > 0
      ? validSpo2.slice(-3).reduce((sum, value) => sum + value, 0) / Math.min(3, validSpo2.length)
      : typeof fallbackSpo2 === "number" && Number.isFinite(fallbackSpo2) && fallbackSpo2 > 0
        ? fallbackSpo2
        : null;

  if (averagedHr === null || averagedSpo2 === null) {
    return [];
  }

  const bpm = Math.max(40, Math.min(180, averagedHr));
  const displayWindowMs = 8000;
  const sampleStepMs = 40;
  const beatIntervalMs = 60000 / bpm;
  const normalizedSpo2 = Math.max(85, Math.min(100, averagedSpo2));
  const amplitude = 0.78 + (normalizedSpo2 - 85) * 0.01;
  const perfusionIndex = Math.max(0.72, Math.min(1.08, amplitude));

  /**
   * `getPlethValue` 관련 데이터를 계산하거나 변환합니다.
   */
  const getPlethValue = (phase: number) => {
    if (phase < 0.12) return 0.02 + (phase / 0.12) * 0.92 * perfusionIndex;
    if (phase < 0.2)
      return 0.94 * perfusionIndex - ((phase - 0.12) / 0.08) * 0.28 * perfusionIndex;
    if (phase < 0.3)
      return 0.66 * perfusionIndex - ((phase - 0.2) / 0.1) * 0.42 * perfusionIndex;
    if (phase < 0.38)
      return (
        0.24 * perfusionIndex +
        Math.sin(((phase - 0.3) / 0.08) * Math.PI) * 0.14 * perfusionIndex
      );
    if (phase < 0.52)
      return 0.3 * perfusionIndex - ((phase - 0.38) / 0.14) * 0.18 * perfusionIndex;
    return 0.12 * perfusionIndex - ((phase - 0.52) / 0.48) * 0.1 * perfusionIndex;
  };

  // 최근 HR/SpO2 평균값을 기준으로 8초 길이의 pleth 시각화 데이터를 만듭니다.
  const waveform: Array<{ time: number; plethValue: number }> = [];
  const sampleCount = Math.round(displayWindowMs / sampleStepMs);

  for (let step = 0; step <= sampleCount; step += 1) {
    const time = step * sampleStepMs;
    const phase = ((time + phaseOffsetMs) % beatIntervalMs) / beatIntervalMs;
    waveform.push({
      time,
      plethValue: getPlethValue(phase),
    });
  }

  return waveform;
}

/**
 * 실제 온도 변경 시점만 반영해 TEMP DELTA 파형을 생성합니다.
 */
function buildTempDeltaWaveform(
  signalData: Array<{ time: number | string; tempDeltaTrend: number | null }>,
) {
  const validPoints = signalData.filter(
    (point): point is { time: number; tempDeltaTrend: number } =>
      typeof point?.time === "number" &&
      Number.isFinite(point.time) &&
      typeof point?.tempDeltaTrend === "number" &&
      Number.isFinite(point.tempDeltaTrend),
  );

  const displayWindowMs = 8000;
  const sampleStepMs = 80;
  const sampleCount = Math.round(displayWindowMs / sampleStepMs);
  const waveform: Array<{ time: number; tempDeltaTrend: number }> = [];
  // 실측 이력이 없으면 0 기준선만 채워 빈 그래프 대신 안정된 기본 파형을 보여줍니다.
  if (validPoints.length === 0) {
    for (let step = 0; step <= sampleCount; step += 1) {
      waveform.push({ time: step * sampleStepMs, tempDeltaTrend: 0 });
    }
    return waveform;
  }

  const latestTime = validPoints[validPoints.length - 1].time;
  const startTime = latestTime - displayWindowMs;
  const anchors = validPoints
    .filter((point) => point.time >= startTime)
    .map((point) => ({
      time: point.time - startTime,
      value: point.tempDeltaTrend,
    }));

  const distinctAnchors = anchors.filter((anchor, index) => {
    if (index === 0) return true;
    const prev = anchors[index - 1];
    return Math.abs(anchor.value - prev.value) >= 0.01;
  });

  // 앵커가 1개뿐이면 같은 값을 유지해 평평한 추세선으로 표시합니다.
  if (distinctAnchors.length === 1) {
    for (let step = 0; step <= sampleCount; step += 1) {
      waveform.push({
        time: step * sampleStepMs,
        tempDeltaTrend: distinctAnchors[0].value,
      });
    }
    return waveform;
  }

  for (let step = 0; step <= sampleCount; step += 1) {
    const time = step * sampleStepMs;
    let activeAnchor = distinctAnchors[0];

    for (let index = 1; index < distinctAnchors.length; index += 1) {
      if (distinctAnchors[index].time > time) {
        break;
      }
      activeAnchor = distinctAnchors[index];
    }

    waveform.push({
      time,
      tempDeltaTrend: Number(activeAnchor.value.toFixed(2)),
    });
  }

  return waveform;
}

/**
 * 차트 영역의 실제 폭/높이가 잡힌 뒤에만 Recharts를 렌더링합니다.
 * 초기 레이아웃 계산 전 발생하는 `width/height = -1` 경고를 줄이기 위한 래퍼입니다.
 */
function SafeChartViewport({
  className,
  children,
}: {
  className?: string;
  children: (size: { width: number; height: number }) => React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    /**
     * 현재 차트 래퍼의 실제 렌더 크기를 확인해 차트 마운트 가능 여부를 갱신합니다.
     */
    const updateReadyState = () => {
      const nextWidth = containerRef.current?.clientWidth ?? 0;
      const nextHeight = containerRef.current?.clientHeight ?? 0;
      setSize((previous) => {
        if (previous.width === nextWidth && previous.height === nextHeight) {
          return previous;
        }
        return { width: nextWidth, height: nextHeight };
      });
    };

    updateReadyState();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateReadyState);
      return () => {
        window.removeEventListener("resize", updateReadyState);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateReadyState();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {size.width > 0 && size.height > 0 ? children(size) : <div className="h-full w-full" />}
    </div>
  );
}

/**
 * 우측 숫자 박스의 라이브/비정상 상태를 계산합니다.
 */
function getMetricBoxState(value: number | null | undefined, type: "hr" | "spo2", isWearing: boolean) {
  const isLive = isWearing && typeof value === "number" && Number.isFinite(value) && value > 0;
  const isAbnormal =
    type === "hr"
      ? typeof value === "number" && Number.isFinite(value) && (value < 45 || value > 130)
      : typeof value === "number" && Number.isFinite(value) && value < 90;

  // 박스 색상/점멸 여부는 live 여부와 임계치 초과 여부만으로 단순 판정합니다.
  return { isLive, isAbnormal };
}

/**
 * 병원 마커 하단에 표시할 병상 요약 문구를 생성합니다.
 */
function buildHospitalCapacityText(hospital: Hospital | any) {
  const erAvailable =
    typeof hospital?.erBeds?.available === "number"
      ? hospital.erBeds.available
      : typeof hospital?.availableBeds === "number"
        ? hospital.availableBeds
        : 0;
  const icuAvailable =
    typeof hospital?.icuBeds?.available === "number" ? hospital.icuBeds.available : 0;

  return `ER ${erAvailable} · ICU ${icuAvailable}`;
}

/**
 * 관제 지도에 표시할 병원 아이콘 HTML을 생성합니다.
 */
function buildHospitalMarkerHtml(hospital: Hospital | any, isMatchedHospital: boolean) {
  const markerColor = isMatchedHospital
    ? "#dc2626"
    : hospital?.category === "권역응급의료센터"
      ? "#b91c1c"
      : hospital?.category === "지역응급의료센터"
        ? "#1d4ed8"
        : "#047857";
  const markerGlow = isMatchedHospital ? "rgba(239, 68, 68, 0.38)" : "rgba(59, 130, 246, 0.28)";
  const capacityText = buildHospitalCapacityText(hospital);
  const hospitalName =
    typeof hospital?.name === "string" && hospital.name.trim().length > 0
      ? hospital.name
      : "의료센터";

  return `
    <div class="hospital-marker-wrap" style="display:flex;flex-direction:column;align-items:center;transform:translateY(-16px);">
      <div style="background:rgba(15,23,42,0.94);color:#fff;padding:2px 7px;border-radius:6px;font-size:10px;font-weight:800;white-space:nowrap;border:1px solid rgba(255,255,255,0.22);box-shadow:0 5px 14px rgba(0,0,0,0.38);margin-bottom:5px;">
        ${hospitalName}
      </div>
      <div style="background:rgba(15,23,42,0.9);color:#bfdbfe;padding:1px 6px;border-radius:999px;font-size:9px;font-weight:700;white-space:nowrap;border:1px solid rgba(191,219,254,0.18);margin-bottom:6px;">
        ${capacityText}
      </div>
      <div style="width:${isMatchedHospital ? "34px" : "30px"};height:${isMatchedHospital ? "34px" : "30px"};background:${markerColor};border:3px solid #fff;border-radius:999px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px ${markerGlow},0 8px 18px rgba(0,0,0,0.34);font-size:${isMatchedHospital ? "18px" : "16px"};${isMatchedHospital ? "animation:pulse 2s infinite;" : ""}">
        <span style="filter:grayscale(0);">🏥</span>
      </div>
    </div>
  `;
}

/**
 * 병원 마커의 변경 여부를 판별할 상태 키를 생성합니다.
 */
function buildHospitalMarkerStateKey(hospital: Hospital | any, isMatchedHospital: boolean) {
  // 병상 수나 매칭 상태가 바뀌면 키도 달라지게 만들어 마커 HTML 재생성 조건으로 사용합니다.
  return [
    hospital?.id ?? "",
    hospital?.name ?? "",
    hospital?.lat ?? "",
    hospital?.lng ?? "",
    hospital?.erBeds?.available ?? hospital?.availableBeds ?? 0,
    hospital?.icuBeds?.available ?? 0,
    hospital?.pediatricEmergencyCenter ? "pediatric" : "general",
    isMatchedHospital ? "matched" : "normal",
  ].join("|");
}

/**
 * 소방서 마커 HTML을 생성합니다.
 */
function buildFireStationMarkerHtml(name: string) {
  // 소방서는 병원보다 작은 보조 마커로 표시해 시각적 우선순위를 낮춥니다.
  return `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-8px);">
      <div style="background:rgba(15,23,42,0.82);color:#cbd5e1;padding:1px 5px;border-radius:999px;font-size:8px;font-weight:700;white-space:nowrap;border:1px solid rgba(255,255,255,0.14);margin-bottom:4px;">
        ${name}
      </div>
      <div style="width:14px;height:14px;background:#f59e0b;border:2px solid rgba(255,255,255,0.95);border-radius:999px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-size:8px;">
        🚒
      </div>
    </div>
  `;
}

/**
 * 관제 지도 팝업 콘텐츠 컴포넌트입니다.
 */
const PopupContent = ({
  patient,
  data,
  analysisTick,
  hospital,
  ambulance,
}: {
  patient: Patient;
  data: any[];
  analysisTick: number;
  hospital?: any | null;
  ambulance?: Ambulance | null;
}) => {
  const isEmergency =
    patient.status === PatientStatus.CRITICAL || patient.status === PatientStatus.DANGER;
  const isWarning =
    patient.status === PatientStatus.WARNING || patient.status === PatientStatus.CAUTION;
  const hr =
    patient.vitals?.isWear === false
      ? 0
      : typeof patient.vitals?.heartRate === "number" &&
          Number.isFinite(patient.vitals.heartRate) &&
          patient.vitals.heartRate > 0
        ? patient.vitals.heartRate
        : null;
  const spo2 =
    patient.vitals?.isWear === false
      ? 0
      : typeof patient.vitals?.oxygenLevel === "number" &&
          Number.isFinite(patient.vitals.oxygenLevel) &&
          patient.vitals.oxygenLevel > 0
        ? patient.vitals.oxygenLevel
        : null;
  const temp =
    patient.vitals?.isWear === false
      ? 0
      : typeof patient.vitals?.bodyTemp === "number" &&
          Number.isFinite(patient.vitals.bodyTemp) &&
          patient.vitals.bodyTemp > 0
      ? patient.vitals.bodyTemp
      : null;
  const stress =
    typeof patient.vitals?.stressLevel === "number" && Number.isFinite(patient.vitals.stressLevel)
      ? patient.vitals.stressLevel
      : 0;
  const steps = typeof patient.steps === "number" && Number.isFinite(patient.steps) ? patient.steps : 0;
  const goldenCaseLabel = getGoldenTimeCaseLabel(patient);
  const emergencyTriggeredMs = patient.emergencyTriggeredAt
    ? new Date(patient.emergencyTriggeredAt).getTime()
    : Number.NaN;
  const goldenElapsedMs =
    Number.isFinite(emergencyTriggeredMs) && emergencyTriggeredMs > 0
      ? Math.max(0, analysisTick - emergencyTriggeredMs)
      : null;
  const goldenMinutes =
    goldenElapsedMs === null ? null : Math.floor(goldenElapsedMs / 60000);
  const goldenSeconds =
    goldenElapsedMs === null ? null : Math.floor((goldenElapsedMs % 60000) / 1000);
  const goldenTimeText =
    goldenMinutes === null || goldenSeconds === null
      ? null
      : `${String(goldenMinutes).padStart(2, "0")}분 ${String(goldenSeconds).padStart(2, "0")}초`;
  /**
   * `signalData` 기능을 처리합니다.
   */
  const signalData = (() => {
    const source = Array.isArray(data) ? data : [];
    let lastAcceptedSpo2: number | null = null;
    let lastAcceptedSpo2Time = 0;
    const baselineTempPoint = source.find(
      (point) =>
        typeof point?.bodyTemperature === "number" &&
        Number.isFinite(point.bodyTemperature) &&
        point.bodyTemperature > 0,
    );
    const baselineTemp =
      typeof baselineTempPoint?.bodyTemperature === "number" &&
      Number.isFinite(baselineTempPoint.bodyTemperature) &&
      baselineTempPoint.bodyTemperature > 0
        ? baselineTempPoint.bodyTemperature
        : null;

    return source.map((point, index) => {
      const pointTime =
        typeof point?.time === "number" && Number.isFinite(point.time) ? point.time : index;
      const nextSpo2 =
        typeof point?.oxygenLevel === "number" && Number.isFinite(point.oxygenLevel) && point.oxygenLevel > 0
          ? point.oxygenLevel
          : null;
      const spo2Trend =
        nextSpo2 !== null &&
        (nextSpo2 !== lastAcceptedSpo2 || pointTime - lastAcceptedSpo2Time >= 15000)
          ? nextSpo2
          : null;

      if (spo2Trend !== null) {
        lastAcceptedSpo2 = spo2Trend;
        lastAcceptedSpo2Time = pointTime;
      }

      return {
        time: pointTime,
        hrTrend:
          typeof point?.heartRate === "number" && Number.isFinite(point.heartRate) && point.heartRate > 0
            ? point.heartRate
            : null,
        spo2Trend,
        tempTrend:
          typeof point?.bodyTemperature === "number" &&
          Number.isFinite(point.bodyTemperature) &&
          point.bodyTemperature > 0
            ? point.bodyTemperature
            : null,
        tempDeltaTrend:
          baselineTemp !== null &&
          typeof point?.bodyTemperature === "number" &&
          Number.isFinite(point.bodyTemperature) &&
          point.bodyTemperature > 0
            ? Number((point.bodyTemperature - baselineTemp).toFixed(2))
            : null,
      };
    });
  })();
  /**
   * `latestMeasured` 기능을 처리합니다.
   */
  const latestMeasured = (() => {
    let lastHr: number | null = null;
    let lastSpo2: number | null = null;
    let lastTemp: number | null = null;
    for (let i = signalData.length - 1; i >= 0; i -= 1) {
      const item = signalData[i];
      if (lastHr === null && typeof item?.hrTrend === "number" && Number.isFinite(item.hrTrend) && item.hrTrend > 0) {
        lastHr = item.hrTrend;
      }
      if (
        lastSpo2 === null &&
        typeof item?.spo2Trend === "number" &&
        Number.isFinite(item.spo2Trend) &&
        item.spo2Trend > 0
      ) {
        lastSpo2 = item.spo2Trend;
      }
      if (
        lastTemp === null &&
        typeof item?.tempTrend === "number" &&
        Number.isFinite(item.tempTrend) &&
        item.tempTrend > 0
      ) {
        lastTemp = item.tempTrend;
      }
      if (lastHr !== null && lastSpo2 !== null && lastTemp !== null) break;
    }
    return { lastHr, lastSpo2, lastTemp };
  })();
  const displayHr =
    hr === 0 ? 0 : typeof hr === "number" && hr > 0 ? hr : latestMeasured.lastHr;
  const displaySpo2 =
    spo2 === 0 ? 0 : typeof spo2 === "number" && spo2 > 0 ? spo2 : latestMeasured.lastSpo2;
  const displayTemp =
    temp === 0 ? 0 : typeof temp === "number" && temp > 0 ? temp : latestMeasured.lastTemp;
  const tempDisplayText =
    typeof displayTemp === "number" && displayTemp > 0
      ? displayTemp.toFixed(1)
      : temp === 0
        ? "0.0"
        : "--.-";
  const resolvedAddress = useResolvedAddress(
    patient.lat,
    patient.lng,
    patient.detailAddress || patient.location,
  );
  const locationMetaText = [patient.locationSource, patient.locationProvider]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .join(" · ");
  /**
   * `yDomain` 기능을 처리합니다.
   */
  const yDomain = (() => {
    const values = signalData
      .map((d) => (typeof d?.hrTrend === "number" ? d.hrTrend : null))
      .filter((v): v is number => v != null && Number.isFinite(v));
    if (values.length === 0 && typeof hr === "number" && hr > 0) values.push(hr);
    if (values.length === 0) return [40, 140] as const;
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max)) max = 200;
    if (min === max) {
      min -= 5;
      max += 5;
    }
    const span = Math.max(1, max - min);
    const pad = Math.max(3, Math.round(span * 0.35));
    let domainMin = Math.max(0, Math.floor(min - pad));
    let domainMax = Math.ceil(max + pad);
    const minSpan = 12;
    if (domainMax - domainMin < minSpan) {
      const mid = (domainMin + domainMax) / 2;
      domainMin = Math.max(0, Math.floor(mid - minSpan / 2));
      domainMax = Math.ceil(mid + minSpan / 2);
    }
    return [domainMin, domainMax] as const;
  })();
  /**
   * `spo2Domain` 기능을 처리합니다.
   */
  const spo2Domain = (() => {
    const values = signalData
      .map((d) => (typeof d?.spo2Trend === "number" ? d.spo2Trend : null))
      .filter((v): v is number => v != null && Number.isFinite(v));
    if (values.length === 0 && typeof spo2 === "number" && spo2 > 0) values.push(spo2);
    if (values.length === 0) return [90, 100] as const;
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = Math.max(1, Math.round((max - min) * 0.4));
    return [Math.max(0, Math.floor(min - pad)), Math.min(100, Math.ceil(max + pad))] as const;
  })();
  /**
   * `tempDomain` 기능을 처리합니다.
   */
  const tempDomain = (() => {
    const values = signalData
      .map((d) => (typeof d?.tempDeltaTrend === "number" ? d.tempDeltaTrend : null))
      .filter((v): v is number => v != null && Number.isFinite(v));
    if (values.length === 0) return [-0.6, 0.6] as const;
    const maxAbs = values.reduce((acc, value) => Math.max(acc, Math.abs(value)), 0);
    const paddedAbs = Math.max(0.08, Number((maxAbs + Math.max(0.03, maxAbs * 0.28)).toFixed(2)));
    return [Number((-paddedAbs).toFixed(2)), Number(paddedAbs.toFixed(2))] as const;
  })();
  /**
   * `updatedAtText` 처리를 수행합니다.
   */
  const updatedAtText = (() => {
    try {
      return new Date(analysisTick).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "";
    }
  })();
  const isWearing = patient.vitals?.isWear !== false;
  const hrMonitorData = isWearing ? buildHrMonitorWaveform(signalData, displayHr, analysisTick) : [];
  const spo2PlethData = isWearing
    ? buildSpo2PlethWaveform(
        signalData,
        displayHr,
        displaySpo2,
        analysisTick,
      )
    : [];
  const tempMonitorData = isWearing
    ? buildTempDeltaWaveform(signalData, analysisTick)
    : buildTempDeltaWaveform([{ time: analysisTick, tempDeltaTrend: 0 }]);
  const [callStatusText, setCallStatusText] = useState("통화 대기");
  useEffect(() => {
    setCallStatusText("통화 대기");
  }, [patient.id]);
  /**
   * 말풍선 하단 CALL 버튼 클릭 시 현재는 기본 통화 앱 연결만 시도합니다.
   */
  const requestPopupCall = useCallback((label: string, rawPhone?: string) => {
    const dialNumber = normalizeDialNumber(rawPhone);
    if (!dialNumber) {
      setCallStatusText(`${label} 연결 준비중...`);
      return;
    }
    setCallStatusText("전화 연결중...");
    if (typeof window !== "undefined") {
      window.location.href = `tel:${dialNumber}`;
    }
  }, []);
  const isCallDialing = callStatusText.includes("전화 연결중");
  const isCallPreparing = !isCallDialing && callStatusText.includes("준비중");
  const callStatusPanelClass = isCallDialing
    ? "border-emerald-400/45 bg-emerald-500/12"
    : isCallPreparing
      ? "border-amber-400/45 bg-amber-500/12"
      : "border-zinc-700/80 bg-zinc-900/75";
  const callStatusDotClass = isCallDialing
    ? "bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.95)]"
    : isCallPreparing
      ? "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.9)]"
      : "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.85)]";
  const callStatusTextClass = isCallDialing
    ? "text-emerald-300"
    : isCallPreparing
      ? "text-amber-200"
      : "text-white";
  const [tempIntegerPart, tempDecimalPart] = tempDisplayText.split(".");
  const { isLive: isHrLive, isAbnormal: isHrAbnormal } = getMetricBoxState(displayHr, "hr", isWearing);
  const { isLive: isSpo2Live, isAbnormal: isSpo2Abnormal } = getMetricBoxState(displaySpo2, "spo2", isWearing);
  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 font-sans text-white shadow-[0_24px_55px_rgba(0,0,0,0.55)] overflow-hidden">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
          ICU Monitor
        </div>
        <div className="text-white/85">{updatedAtText}</div>
      </div>

      <div className="grid grid-cols-[1.44fr_0.56fr] gap-1">
        <div className="grid grid-rows-3 gap-1.5">
          <div className="h-[108px] rounded-lg border border-zinc-700/90 bg-zinc-950/45 px-3 py-2">
            <div className="mb-0.5 flex items-center justify-between text-[10px]">
              <span className="font-semibold uppercase tracking-[0.18em] text-emerald-400">HR MONITOR</span>
              <span className="text-white/85">{patient.name} / {patient.age}세</span>
            </div>
            <SafeChartViewport className="h-[78px] w-full">
              {({ width, height }) => (
                <LineChart width={width} height={height} data={hrMonitorData}>
                  <CartesianGrid stroke="rgba(161,161,170,0.28)" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={[-0.35, 1.35] as any} />
                  <Line
                    type="linear"
                    dataKey="ecgValue"
                    stroke="#22c55e"
                    strokeWidth={2.2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              )}
            </SafeChartViewport>
          </div>

          <div className="h-[108px] rounded-lg border border-zinc-700/90 bg-zinc-950/45 px-3 py-2">
            <div className="mb-0.5 flex items-center justify-between text-[10px]">
              <span className="font-semibold uppercase tracking-[0.18em] text-yellow-300">SpO2 PLETH</span>
              <span className="text-white/85">monitor style</span>
            </div>
            <SafeChartViewport className="h-[78px] w-full">
              {({ width, height }) => (
                <LineChart width={width} height={height} data={spo2PlethData}>
                  <CartesianGrid stroke="rgba(161,161,170,0.28)" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={[0, 1.05] as any} />
                  <Line
                    type="linear"
                    dataKey="plethValue"
                    stroke="#fde047"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              )}
            </SafeChartViewport>
          </div>

          <div className="h-[108px] rounded-lg border border-zinc-700/90 bg-zinc-950/45 px-3 py-2">
            <div className="mb-0.5 flex items-center justify-between text-[10px]">
              <span className="font-semibold uppercase tracking-[0.18em] text-red-400">TEMP DELTA</span>
              <span className="text-white/85">baseline 기준</span>
            </div>
            <SafeChartViewport className="h-[78px] w-full">
              {({ width, height }) => (
                <LineChart width={width} height={height} data={tempMonitorData}>
                  <CartesianGrid stroke="rgba(161,161,170,0.28)" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={tempDomain as any} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" ifOverflow="extendDomain" />
                  <Line
                    type="stepAfter"
                    dataKey="tempDeltaTrend"
                    stroke="rgba(251,113,133,0.22)"
                    strokeWidth={6}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="tempDeltaTrend"
                    stroke="#fb7185"
                    strokeWidth={2.6}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              )}
            </SafeChartViewport>
          </div>
        </div>

        <div className="grid grid-cols-[110px_1fr] grid-rows-[108px_108px_108px] gap-x-2 gap-y-0 border-l border-zinc-700/90 pl-2">
          <div className="row-start-1 flex flex-col justify-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400">HR</div>
              <div
                className={`mt-1 flex min-h-[72px] items-center justify-center rounded-lg border px-2 ${
                  isHrLive
                    ? isHrAbnormal
                      ? "metric-live-box-danger border-red-400/90"
                      : "metric-live-box-normal border-emerald-400/80"
                    : "border-zinc-700/90 bg-transparent"
                }`}
              >
                <div
                  className={`text-[58px] font-semibold leading-none ${
                    isHrLive
                      ? isHrAbnormal
                        ? "metric-live-value-danger text-red-300"
                        : "metric-live-value-normal text-emerald-400"
                      : isHrAbnormal
                        ? "text-red-300"
                        : "text-emerald-400"
                  }`}
                >
                  {typeof displayHr === "number" && displayHr > 0 ? Math.round(displayHr) : hr === 0 ? 0 : "--"}
                </div>
              </div>
          </div>

          <div className="row-start-2 flex flex-col justify-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-yellow-300">SpO2</div>
              <div
                className={`mt-1 flex min-h-[72px] items-center justify-center rounded-lg border px-2 ${
                  isSpo2Live
                    ? isSpo2Abnormal
                      ? "metric-live-box-danger border-red-400/90"
                      : "metric-live-box-warning border-yellow-300/85"
                    : "border-zinc-700/90 bg-transparent"
                }`}
              >
                <div
                  className={`text-[58px] font-semibold leading-none ${
                    isSpo2Live
                      ? isSpo2Abnormal
                        ? "metric-live-value-danger text-red-200"
                        : "metric-live-value-warning text-yellow-300"
                      : isSpo2Abnormal
                        ? "text-red-200"
                        : "text-yellow-300"
                  }`}
                >
                  {typeof displaySpo2 === "number" && displaySpo2 > 0 ? Math.round(displaySpo2) : spo2 === 0 ? 0 : "--"}
                </div>
              </div>
          </div>

          <div className="row-start-3 flex flex-col justify-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-400">TEMP</div>
              <div className="flex items-end whitespace-nowrap text-[46px] font-semibold leading-none tracking-tight text-red-400">
                <span>{tempIntegerPart}</span>
                <span>.</span>
                <span className="text-[28px]">{tempDecimalPart ?? "-"}</span>
                <span className="ml-1 self-start pt-1 text-[18px] leading-[1]">°C</span>
              </div>
          </div>

          <div className="row-span-3 flex items-center">
            <div className="grid w-full grid-cols-1 gap-1.5">
              <div className="rounded-lg border border-white/80 bg-zinc-950 px-2.5 py-2">
                <div className="text-[9px] uppercase tracking-[0.16em] text-white/85">Location</div>
                <div className="mt-1 text-[10px] leading-4 text-white/90">
                  {resolvedAddress || patient.detailAddress || patient.location}
                </div>
                {locationMetaText ? (
                  <div className="mt-1 text-[9px] leading-4 text-white/65">
                    {locationMetaText}
                  </div>
                ) : null}
              </div>
              <div className="rounded-lg border border-white/80 bg-zinc-950 px-2.5 py-2">
                <div className="text-[9px] uppercase tracking-[0.16em] text-white/85">Steps</div>
                <div className="mt-1 text-[10px] leading-4 text-white/90">걸음 {steps.toLocaleString()}보</div>
              </div>
              <div className="rounded-lg border border-white/80 bg-zinc-950 px-2.5 py-2">
                <div className="text-[9px] uppercase tracking-[0.16em] text-white/85">Hospital</div>
                <div className="mt-1 text-[10px] leading-4 text-white/90">
                  {hospital ? `${hospital.name} · ${hospital.distance ?? "거리 미확인"}` : "매칭 의료센터 분석 중"}
                </div>
              </div>
              <div className="rounded-lg border border-white/80 bg-zinc-950 px-2.5 py-2">
                <div className="text-[9px] uppercase tracking-[0.16em] text-white/85">Golden Time</div>
                <div className="mt-1 text-[9px] leading-4 text-amber-300/90">
                  {goldenTimeText
                    ? `${goldenCaseLabel || "심폐성 위급상황"} 기준 ${goldenTimeText} 경과`
                    : ""}
                </div>
              </div>
              <div
                className={`rounded-lg border px-2.5 py-2 ${
                  isEmergency
                    ? "gt-emergency-invert-flash border-red-300/70 bg-zinc-950"
                    : "border-white/80 bg-zinc-950"
                }`}
              >
                <div className="text-[9px] uppercase tracking-[0.16em] text-white/85">Status</div>
                <div className={`mt-1 text-[10px] font-semibold leading-4 ${
                  isEmergency ? "text-red-400" : isWarning ? "text-yellow-300" : "text-emerald-400"
                }`}>
                  {isEmergency ? "위급 상태 모니터링" : isWarning ? "주의 상태 모니터링" : "정상 상태 모니터링"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 border-t border-zinc-800 pt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => requestPopupCall("회원", patient.phone)}
            disabled={!normalizeDialNumber(patient.phone)}
            className={`min-w-[112px] rounded-lg border px-3 py-2 text-[11px] font-semibold tracking-tight transition ${
              normalizeDialNumber(patient.phone)
                ? "border-blue-500/50 bg-blue-600 text-white hover:bg-blue-500"
                : "cursor-not-allowed border-zinc-800 bg-zinc-900/60 text-zinc-600"
            }`}
          >
            회원 CALL
          </button>
          <button
            type="button"
            onClick={() => requestPopupCall("보호자", patient.guardianPhone)}
            disabled={!normalizeDialNumber(patient.guardianPhone)}
            className={`min-w-[112px] rounded-lg border px-3 py-2 text-[11px] font-semibold tracking-tight transition ${
              normalizeDialNumber(patient.guardianPhone)
                ? "border-orange-400/60 bg-orange-500 text-white hover:bg-orange-400"
                : "cursor-not-allowed border-zinc-800 bg-zinc-900/60 text-zinc-600"
            }`}
          >
            보호자 CALL
          </button>
          <button
            type="button"
            onClick={() => requestPopupCall("복지사", undefined)}
            className="min-w-[112px] rounded-lg border border-amber-500/40 bg-amber-600 px-3 py-2 text-[11px] font-semibold text-white tracking-tight transition hover:bg-amber-500"
          >
            복지사 CALL
          </button>
          <button
            type="button"
            onClick={() => requestPopupCall("119", "119")}
            className="min-w-[112px] rounded-lg border border-rose-500/40 bg-rose-600 px-3 py-2 text-[11px] font-semibold text-white tracking-tight transition hover:bg-rose-500"
          >
            119 신고
          </button>
        </div>
        <div className={`shrink-0 min-w-[148px] rounded-xl border px-3 py-2 ${callStatusPanelClass}`}>
          <div className="mb-1 text-[9px] uppercase tracking-[0.18em] text-white/55">
            Call Status
          </div>
          <div className={`flex items-center justify-end gap-2 text-[12px] font-semibold tracking-tight ${callStatusTextClass}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${callStatusDotClass}`} />
            <span>{callStatusText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 메인 지도 컴포넌트가 외부에서 전달받는 환자, 병원, 구급차 prop 구조입니다.
 */
interface LiveMapProps {
  patient?: Patient | null;
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

const FALLBACK_MAP_CENTER: [number, number] = [36.3504, 127.3845];
const FALLBACK_MAP_ZOOM = 8;

const WorkingMap: React.FC<LiveMapProps> = ({
  patient: initialPatient,
  hospital,
  ambulances: externalAmbulances,
  patients: allPatients,
  onArrival,
}) => {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("gt-custom-popup-dark-style")) return;
    // Leaflet 기본 팝업 스킨을 제거해 지도 위 React 오버레이와 같은 다크 톤을 유지합니다.
    const style = document.createElement("style");
    style.id = "gt-custom-popup-dark-style";
    style.textContent = `
      .leaflet-popup.custom-popup-dark .leaflet-popup-content-wrapper {
        background: transparent;
        box-shadow: none;
        padding: 0;
        border-radius: 0;
      }
      .leaflet-popup.custom-popup-dark .leaflet-popup-content {
        margin: 0;
      }
      .leaflet-popup.custom-popup-dark .leaflet-popup-tip {
        background: #0f172a;
        box-shadow: none;
      }
      .leaflet-popup.custom-popup-dark .leaflet-popup-close-button {
        color: #cbd5e1;
        top: 6px;
        right: 8px;
      }
      .leaflet-popup.custom-popup-dark .leaflet-popup-close-button:hover {
        color: #ffffff;
      }
      .leaflet-popup.custom-popup-dark .recharts-wrapper,
      .leaflet-popup.custom-popup-dark .recharts-wrapper:focus,
      .leaflet-popup.custom-popup-dark .recharts-surface,
      .leaflet-popup.custom-popup-dark .recharts-surface:focus,
      .leaflet-popup.custom-popup-dark svg,
      .leaflet-popup.custom-popup-dark svg:focus {
        outline: none !important;
        box-shadow: none !important;
      }
      .leaflet-popup.custom-popup-dark .recharts-wrapper * {
        user-select: none;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const initMapRetryTimeoutRef = useRef<number | null>(null);
  const deferredSyncTimeoutRef = useRef<number | null>(null);

  const patientMarkerRef = useRef<any>(null);
  const ambulanceMarkerRef = useRef<any>(null);
  const staticGroupRef = useRef<any>(null);
  const pathGroupRef = useRef<any>(null);
  const MAP_LAYER_SYNC_INTERVAL_MS = 250;

  const [hospitalData, setHospitalData] = useState<any[]>([]);
  const [matchedAmbulance, setMatchedAmbulance] = useState<Ambulance | null>(
    null,
  );
  const [hospitalPath, setHospitalPath] = useState<any[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(initialPatient || null);
  const [phase, setPhase] = useState<TransportPhase>(TransportPhase.WAITING);
  const initialPatientId = initialPatient?.id ?? "";
  const currentPatientId = currentPatient?.id ?? "";
  const activePatientId = currentPatientId || initialPatientId;
  const trackedPatient = currentPatient || initialPatient || null;
  const hasTrackedPatientLocation =
    !!trackedPatient &&
    Number.isFinite(trackedPatient.lat) &&
    Number.isFinite(trackedPatient.lng);

  // 환자가 변경되면 상태 초기화
  useEffect(() => {
    setCurrentPatient(initialPatient || null);
    setMatchedAmbulance(null);
    setPhase(TransportPhase.WAITING);
  }, [initialPatientId]);

  /**
   * 같은 환자를 계속 보고 있을 때도 최신 생체값/상태가 팝업에 반영되도록 동기화합니다.
   */
  useEffect(() => {
    const latestPatient =
      (allPatients || []).find((patient) => patient.id === activePatientId) ||
      initialPatient ||
      null;
    if (!latestPatient) return;

    setCurrentPatient((prev) => {
      if (!prev || prev.id !== latestPatient.id) {
        return latestPatient;
      }

      if (
        prev.vitals?.heartRate === latestPatient.vitals?.heartRate &&
        prev.vitals?.oxygenLevel === latestPatient.vitals?.oxygenLevel &&
        prev.vitals?.bodyTemp === latestPatient.vitals?.bodyTemp &&
        prev.vitals?.stressLevel === latestPatient.vitals?.stressLevel &&
        prev.steps === latestPatient.steps &&
        prev.batteryLevel === latestPatient.batteryLevel &&
        prev.locationUpdatedAt === latestPatient.locationUpdatedAt &&
        prev.status === latestPatient.status &&
        prev.simulationState === latestPatient.simulationState
      ) {
        return prev;
      }

      return latestPatient;
    });
  }, [allPatients, activePatientId, initialPatient]);

  // 모든 환자의 애니메이션 위치를 관리하는 Ref
  const allPatientsAnimPosRef = useRef<
    Record<string, { lat: number; lng: number }>
  >({});
  // 현재 선택된 환자 애니메이션 위치
  const animPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const displayAmbulances = externalAmbulances || [];
  const getPopupHospital = useCallback((targetPatient: Patient | null | undefined) => {
    if (!targetPatient?.recommendedHospitalId) return null;
    if (hospital?.id === targetPatient.recommendedHospitalId) return hospital;
    return hospitalData.find((h) => h.id === targetPatient.recommendedHospitalId) || null;
  }, [hospital, hospitalData]);
  const getPopupAmbulance = useCallback((targetPatient: Patient | null | undefined) => {
    if (!targetPatient?.matchedAmbulanceId) return null;
    return displayAmbulances.find((a) => a.id === targetPatient.matchedAmbulanceId) || null;
  }, [displayAmbulances]);

  // 1. 레이어 및 마커 동기화 함수
  
  const vitalsRef = useRef<any[]>([]);
  const [vitals, setVitals] = useState<any[]>([]);
  const [analysisTick, setAnalysisTick] = useState<number>(() => Date.now());
  const lastMeasuredSampleKeyRef = useRef<string>("");
  const [openPopupPatientId, setOpenPopupPatientId] = useState<string | null>(null);
  const [openPopupAnchor, setOpenPopupAnchor] = useState<{ lat: number; lng: number } | null>(null);
  const [openPopupScreenPos, setOpenPopupScreenPos] = useState<{ x: number; y: number } | null>(null);
  const openPopupPatientKey = openPopupPatientId ?? "";

  /**
   * Leaflet 팝업 대신 지도 위 React 오버레이 팝업을 엽니다.
   */
  const openPatientPopup = useCallback(
    (targetPatient: Patient, lat: number, lng: number) => {
      if (!mapRef.current) return;
      setOpenPopupPatientId(targetPatient.id);
      setOpenPopupAnchor({ lat, lng });
    },
    [],
  );

  /**
   * 선택된 환자 오버레이 anchor를 최신 좌표에 계속 동기화합니다.
   * 지도 축척 변경 후에도 클릭 당시 좌표가 아니라 실제 현재 좌표에 고정되도록 합니다.
   */
  useEffect(() => {
    if (!openPopupPatientKey) return;

    const latestPatient =
      (allPatients || []).find((patient) => patient.id === openPopupPatientKey) ||
      (currentPatientId === openPopupPatientKey ? currentPatient : null) ||
      (initialPatientId === openPopupPatientKey ? initialPatient : null);

    if (!latestPatient) return;

    const matchedAmbulance =
      latestPatient.matchedAmbulanceId
        ? displayAmbulances.find((ambulance) => ambulance.id === latestPatient.matchedAmbulanceId)
        : null;
    const isBeingTransported =
      matchedAmbulance &&
      (matchedAmbulance.activity === "boarding" ||
        matchedAmbulance.activity === "transporting_to_hospital");

    const nextAnchor = isBeingTransported
      ? { lat: matchedAmbulance.lat, lng: matchedAmbulance.lng }
      : { lat: latestPatient.lat, lng: latestPatient.lng };

    // 팝업 anchor도 환자/차량 현재 좌표를 따라가야 확대·이동 뒤에도 말풍선이 떠 있는 지점이 어긋나지 않습니다.
    if (
      !Number.isFinite(nextAnchor.lat) ||
      !Number.isFinite(nextAnchor.lng)
    ) {
      return;
    }

    setOpenPopupAnchor((previous) => {
      if (
        previous &&
        Math.abs(previous.lat - nextAnchor.lat) < 0.0000001 &&
        Math.abs(previous.lng - nextAnchor.lng) < 0.0000001
      ) {
        return previous;
      }
      return nextAnchor;
    });
  }, [
    openPopupPatientKey,
    allPatients,
    currentPatient,
    currentPatientId,
    initialPatient,
    initialPatientId,
    displayAmbulances,
  ]);

  useEffect(() => {
    if (!openPopupPatientKey) {
      return;
    }

    /**
     * 환자 팝업이 열려 있을 때만 모니터 차트 기준 시각을 갱신합니다.
     */
    const syncAnalysisTick = () => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      setAnalysisTick(Date.now());
    };

    const handleVisibilityChange = () => {
      if (typeof document === "undefined" || document.hidden) {
        return;
      }
      syncAnalysisTick();
    };

    syncAnalysisTick();
    const interval = window.setInterval(syncAnalysisTick, 1200);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [openPopupPatientKey]);

  const patientHrRef = useRef<number>(initialPatient?.vitals?.heartRate ?? 0);
  const patientWearRef = useRef<boolean | undefined>(initialPatient?.vitals?.isWear);
  const patientTempRef = useRef<number>(
    typeof initialPatient?.vitals?.bodyTemp === "number" && initialPatient.vitals.bodyTemp > 0
      ? initialPatient.vitals.bodyTemp
      : 0,
  );
  const patientSpo2Ref = useRef<number>(
    typeof initialPatient?.vitals?.oxygenLevel === "number" && initialPatient.vitals.oxygenLevel > 0
      ? initialPatient.vitals.oxygenLevel
      : 0,
  );
  useEffect(() => {
    if (currentPatient?.vitals?.heartRate != null) {
      patientHrRef.current = currentPatient.vitals.heartRate;
    }
  }, [currentPatient?.vitals?.heartRate]);
  useEffect(() => {
    if (
      typeof currentPatient?.vitals?.oxygenLevel === "number" &&
      Number.isFinite(currentPatient.vitals.oxygenLevel) &&
      currentPatient.vitals.oxygenLevel > 0
    ) {
      patientSpo2Ref.current = currentPatient.vitals.oxygenLevel;
    }
  }, [currentPatient?.vitals?.oxygenLevel]);
  useEffect(() => {
    if (
      typeof currentPatient?.vitals?.bodyTemp === "number" &&
      Number.isFinite(currentPatient.vitals.bodyTemp) &&
      currentPatient.vitals.bodyTemp > 0
    ) {
      patientTempRef.current = currentPatient.vitals.bodyTemp;
    }
  }, [currentPatient?.vitals?.bodyTemp]);
  useEffect(() => {
    if (typeof currentPatient?.vitals?.isWear === "boolean") {
      patientWearRef.current = currentPatient.vitals.isWear;
    }
  }, [currentPatient?.vitals?.isWear]);
  useEffect(() => {
    const id = activePatientId;
    if (!id) return;
    /**
     * `latest` 기능을 처리합니다.
     */
    const latest = (allPatients || []).find((p) => p.id === id);
    if (!latest) return;
    if (typeof latest?.vitals?.heartRate === "number") patientHrRef.current = latest.vitals.heartRate;
    if (
      typeof latest?.vitals?.oxygenLevel === "number" &&
      Number.isFinite(latest.vitals.oxygenLevel) &&
      latest.vitals.oxygenLevel > 0
    ) {
      patientSpo2Ref.current = latest.vitals.oxygenLevel;
    }
    if (
      typeof latest?.vitals?.bodyTemp === "number" &&
      Number.isFinite(latest.vitals.bodyTemp) &&
      latest.vitals.bodyTemp > 0
    ) {
      patientTempRef.current = latest.vitals.bodyTemp;
    }
    if (typeof latest?.vitals?.isWear === "boolean") patientWearRef.current = latest.vitals.isWear;
  }, [allPatients, activePatientId]);

  // 환자 전환 시 이전 환자의 실측 샘플 이력을 초기화합니다.
  useEffect(() => {
    lastMeasuredSampleKeyRef.current = "";
    setVitals([]);
    vitalsRef.current = [];
  }, [activePatientId]);

  // 실제로 수신된 최신 생체 샘플만 말풍선 이력에 추가합니다.
  useEffect(() => {
    const targetPatient =
      (allPatients || []).find((p) => p.id === activePatientId) ||
      currentPatient ||
      initialPatient;
    if (!targetPatient) return;

    const measuredHr =
      typeof targetPatient.vitals?.heartRate === "number" &&
      Number.isFinite(targetPatient.vitals.heartRate) &&
      targetPatient.vitals.heartRate > 0
        ? Math.round(targetPatient.vitals.heartRate)
        : null;
    const measuredSpo2 =
      typeof targetPatient.vitals?.oxygenLevel === "number" &&
      Number.isFinite(targetPatient.vitals.oxygenLevel) &&
      targetPatient.vitals.oxygenLevel > 0
        ? Math.round(targetPatient.vitals.oxygenLevel)
        : null;
    const measuredTemp =
      typeof targetPatient.vitals?.bodyTemp === "number" &&
      Number.isFinite(targetPatient.vitals.bodyTemp) &&
      targetPatient.vitals.bodyTemp > 0
        ? Number(targetPatient.vitals.bodyTemp.toFixed(2))
        : null;

    if (measuredHr === null && measuredSpo2 === null && measuredTemp === null) return;

    const sampleKey = [
      targetPatient.id,
      measuredHr ?? "x",
      measuredSpo2 ?? "x",
      measuredTemp ?? "x",
      targetPatient.vitals?.isWear === false ? "off" : "on",
    ].join("|");
    if (lastMeasuredSampleKeyRef.current === sampleKey) return;
    lastMeasuredSampleKeyRef.current = sampleKey;

    const now = Date.now();
    setVitals((prev) => {
      const next = [
        ...prev.filter((item) => now - (item?.time ?? 0) <= 90000),
        {
          time: now,
          heartRate: measuredHr,
          oxygenLevel: measuredSpo2,
          bodyTemperature: measuredTemp,
        },
      ];
      vitalsRef.current = next;
      return next;
    });
  }, [
    allPatients,
    currentPatient,
    initialPatient,
    activePatientId,
    currentPatient?.vitals?.heartRate,
    currentPatient?.vitals?.oxygenLevel,
    currentPatient?.vitals?.bodyTemp,
    currentPatient?.vitals?.isWear,
    initialPatient?.vitals?.heartRate,
    initialPatient?.vitals?.oxygenLevel,
    initialPatient?.vitals?.bodyTemp,
    initialPatient?.vitals?.isWear,
  ]);

  useEffect(() => {
    if (!mapRef.current || !openPopupAnchor) {
      setOpenPopupScreenPos(null);
      return;
    }

    /**
     * `updatePopupPosition` 처리를 수행합니다.
     */
    const updatePopupPosition = () => {
      if (!mapRef.current || !openPopupAnchor) return;
      try {
        const point = mapRef.current.latLngToContainerPoint([openPopupAnchor.lat, openPopupAnchor.lng]);
        setOpenPopupScreenPos({ x: point.x, y: point.y });
      } catch {}
    };

    updatePopupPosition();
    mapRef.current.on("move", updatePopupPosition);
    mapRef.current.on("moveend", updatePopupPosition);
    mapRef.current.on("zoom", updatePopupPosition);
    mapRef.current.on("zoomend", updatePopupPosition);
    mapRef.current.on("viewreset", updatePopupPosition);
    mapRef.current.on("resize", updatePopupPosition);
    return () => {
      try {
        mapRef.current?.off("move", updatePopupPosition);
        mapRef.current?.off("moveend", updatePopupPosition);
        mapRef.current?.off("zoom", updatePopupPosition);
        mapRef.current?.off("zoomend", updatePopupPosition);
        mapRef.current?.off("viewreset", updatePopupPosition);
        mapRef.current?.off("resize", updatePopupPosition);
      } catch {}
    };
  }, [openPopupAnchor]);

  const syncLayers = useCallback(() => {
    if (!mapRef.current || !window.L || !mapReady) return;

    try {
      if (!hasTrackedPatientLocation) {
        if (pathGroupRef.current) {
          pathGroupRef.current.clearLayers();
        }
        if (!staticGroupRef.current) {
          staticGroupRef.current = window.L.layerGroup().addTo(mapRef.current);
        }
        staticGroupRef.current.clearLayers();
        if (!mapRef.current._patientMarkers) mapRef.current._patientMarkers = {};
        Object.keys(mapRef.current._patientMarkers).forEach((id) => {
          mapRef.current._patientMarkers[id].remove();
          delete mapRef.current._patientMarkers[id];
        });
        mapRef.current._hMarkers = {};
        mapRef.current._fireMarkers = {};
        mapRef.current._ambMarkers = {};
        setOpenPopupPatientId(null);
        setOpenPopupAnchor(null);
        setOpenPopupScreenPos(null);
        return;
      }

      // 1-1. 경로선 레이어 관리 (깜빡임 최소화)
      if (!pathGroupRef.current) {
        pathGroupRef.current = window.L.layerGroup().addTo(mapRef.current);
      }

      pathGroupRef.current.clearLayers();
      // 이송차량 제거 요청에 따라 차량 이동 경로는 그리지 않습니다.

      // 1-2. 정적 레이어 그룹
      if (!staticGroupRef.current) {
        staticGroupRef.current = window.L.layerGroup().addTo(mapRef.current);
      }

      // 1-3. 병원 마커
      if (!mapRef.current._hMarkers) mapRef.current._hMarkers = {};
      const currentHospitalIds = new Set(
        (hospitalData || [])
          .filter(
            (h) =>
              h &&
              Number.isFinite(h.lat) &&
              Number.isFinite(h.lng),
          )
          .map((h) => h.id),
      );

      if (hospitalData && hospitalData.length > 0) {
        hospitalData.forEach((h) => {
          if (!Number.isFinite(h?.lat) || !Number.isFinite(h?.lng)) return;

          const isMatchedHospital = !!hospital && h.id === hospital.id;
          const stateKey = buildHospitalMarkerStateKey(h, isMatchedHospital);
          const hospitalPopupHtml = `
            <div style="padding:10px;min-width:180px;">
              <div style="font-weight:800;font-size:14px;margin-bottom:6px;color:#0f172a;">${h.name || "의료센터"}</div>
              <div style="font-size:12px;color:#475569;margin-bottom:4px;">응급실 병상: ${typeof h?.erBeds?.available === "number" ? h.erBeds.available : h.availableBeds || 0} / ${typeof h?.erBeds?.total === "number" ? h.erBeds.total : h.totalBeds || 0}</div>
              <div style="font-size:12px;color:#475569;margin-bottom:4px;">중환자실: ${typeof h?.icuBeds?.available === "number" ? h.icuBeds.available : 0} / ${typeof h?.icuBeds?.total === "number" ? h.icuBeds.total : 0}</div>
              ${h?.pediatricEmergencyCenter ? '<div style="font-size:11px;color:#1d4ed8;margin-bottom:4px;font-weight:700;">소아전문응급의료센터</div>' : ""}
              <div style="font-size:11px;color:#64748b;">${h.location || "위치 정보 없음"}</div>
            </div>`;

          if (mapRef.current._hMarkers[h.id]) {
            const marker = mapRef.current._hMarkers[h.id];
            marker.setLatLng([h.lat, h.lng]);

            if (marker._lastStateKey !== stateKey) {
              marker.setIcon(
                window.L.divIcon({
                  className: "h-icon",
                  html: buildHospitalMarkerHtml(h, isMatchedHospital),
                  iconSize: [140, 74],
                  iconAnchor: [70, 74],
                }),
              );
              marker.setPopupContent(hospitalPopupHtml);
              marker._lastStateKey = stateKey;
              marker.setZIndexOffset(isMatchedHospital ? 900 : 40);
            }
          } else {
            const marker = window.L.marker([h.lat, h.lng], {
              icon: window.L.divIcon({
                className: "h-icon",
                html: buildHospitalMarkerHtml(h, isMatchedHospital),
                iconSize: [140, 74],
                iconAnchor: [70, 74],
              }),
            })
              .addTo(staticGroupRef.current)
              .bindPopup(hospitalPopupHtml, {
                closeButton: false,
                offset: [0, -8],
              });

            marker._lastStateKey = stateKey;
            marker.setZIndexOffset(isMatchedHospital ? 900 : 40);
            mapRef.current._hMarkers[h.id] = marker;
          }
        });
      }

      Object.keys(mapRef.current._hMarkers).forEach((id) => {
        if (!currentHospitalIds.has(id)) {
          mapRef.current._hMarkers[id].remove();
          delete mapRef.current._hMarkers[id];
        }
      });

      // 1-3-b. 소방서 마커
      if (!mapRef.current._fireMarkers) mapRef.current._fireMarkers = {};
      const currentFireStationIds = new Set(
        (ALL_FIRE_STATIONS || [])
          .filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng))
          .map((station) => station.id),
      );

      ALL_FIRE_STATIONS.forEach((station) => {
        if (!Number.isFinite(station.lat) || !Number.isFinite(station.lng)) return;

        const popupHtml = `
          <div style="padding:8px 10px;min-width:140px;">
            <div style="font-weight:800;font-size:13px;margin-bottom:4px;color:#0f172a;">${station.name}</div>
            <div style="font-size:11px;color:#475569;">${station.location}</div>
          </div>`;

        if (mapRef.current._fireMarkers[station.id]) {
          const marker = mapRef.current._fireMarkers[station.id];
          marker.setLatLng([station.lat, station.lng]);
        } else {
          const marker = window.L.marker([station.lat, station.lng], {
            icon: window.L.divIcon({
              className: "fire-icon",
              html: buildFireStationMarkerHtml(station.name),
              iconSize: [76, 28],
              iconAnchor: [38, 28],
            }),
          })
            .addTo(staticGroupRef.current)
            .bindPopup(popupHtml, {
              closeButton: false,
              offset: [0, -6],
            });

          marker.setZIndexOffset(10);
          mapRef.current._fireMarkers[station.id] = marker;
        }
      });

      Object.keys(mapRef.current._fireMarkers).forEach((id) => {
        if (!currentFireStationIds.has(id)) {
          mapRef.current._fireMarkers[id].remove();
          delete mapRef.current._fireMarkers[id];
        }
      });

      // 1-4. 이송차량 제거 요청에 따라 기존 차량 마커만 정리하고 새로 그리지 않습니다.
      if (!mapRef.current._ambMarkers) mapRef.current._ambMarkers = {};
      Object.keys(mapRef.current._ambMarkers).forEach((id) => {
        mapRef.current._ambMarkers[id].remove();
        delete mapRef.current._ambMarkers[id];
      });
      ambulanceMarkerRef.current = null;

      // 1-5. 환자 마커 통합 관리 (모든 환자 표시 및 구급차 밀착 동기화)
      if (!mapRef.current._patientMarkers) mapRef.current._patientMarkers = {};
      
      // allPatients가 비어있어도 currentPatient는 반드시 표시
      const patientsToRender = (allPatients && allPatients.length > 0) 
        ? allPatients 
        : (currentPatient ? [currentPatient] : []);

      const currentPatientIds = new Set(
        patientsToRender
          .filter((p) => {
            if (!p || p.status === PatientStatus.TRANSPORTED) return false;
            const matchedAmb = displayAmbulances?.find(
              (a) => a.id === p.matchedAmbulanceId,
            );
            const isBeingTransported =
              matchedAmb &&
              (matchedAmb.activity === "boarding" ||
                matchedAmb.activity === "transporting_to_hospital");
            return !isBeingTransported;
          })
          .map((p) => p.id),
      );

      patientsToRender.forEach((p) => {
        if (!p || p.status === PatientStatus.TRANSPORTED) return;

        const isSelected = currentPatient?.id === p.id;
        const matchedAmb = displayAmbulances?.find(
          (a) => a.id === p.matchedAmbulanceId,
        );
        const isBeingTransported =
          matchedAmb &&
          (matchedAmb.activity === "boarding" ||
            matchedAmb.activity === "transporting_to_hospital");

        if (isBeingTransported) {
          // 이송 단계에서는 환자 아이콘을 별도로 남기지 않고 차량 마커/팝업 쪽으로 시선을 모읍니다.
          if (mapRef.current._patientMarkers[p.id]) {
            mapRef.current._patientMarkers[p.id].remove();
            delete mapRef.current._patientMarkers[p.id];
          }
          return;
        }

        const displayLat = p.lat;
        const displayLng = p.lng;
        if (!Number.isFinite(displayLat) || !Number.isFinite(displayLng)) return;

        const visualState = getPatientMonitoringVisualState(p);
        const triageLevel = visualState.mapLabel;
        const statusColor =
          visualState.kind === "removed"
            ? "#d946ef"
            : visualState.kind === "stale"
              ? "#f59e0b"
              : triageLevel === "응급"
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
        const avatarEmoji = p.isSimulated
          ? p.status === PatientStatus.NORMAL
            ? p.avatarEmoji || "🙂"
            : "🤕"
          : "📍";
        let statusLabelText =
          visualState.kind === "pending"
            ? "매칭 대기"
            : visualState.kind === "removed" || visualState.kind === "stale"
              ? triageLevel
              : `${triageLevel}(${p.status})`;
        const isCriticalBubble = visualState.isActualEmergency;
        const patientBubble =
          isBeingTransported
            ? ""
            : p.speechBubble ||
              (visualState.kind === "removed"
                ? "워치 탈착"
                : visualState.kind === "stale"
                  ? "데이터 재수집중"
                  : isCriticalBubble
                    ? "살려주세요!"
                    : p.isSimulated
                      ? "산책중이에요"
                      : "");

        const avatarSize = isSelected ? 42 : 28;
        const patientIconAnchorY = 132 - 30 - avatarSize / 2;
        const pIconHtml = `
            <div style="position:relative;width:210px;height:132px;pointer-events:auto;">
              <div style="position:absolute;left:50%;top:32px;transform:translateX(-50%);background:rgba(15,23,42,0.95);color:white;padding:${isSelected ? "4px 10px" : "2px 6px"};border-radius:6px;font-size:${isSelected ? "11px" : "10px"};white-space:nowrap;border:1px solid rgba(255,255,255,0.3);box-shadow:0 4px 12px rgba(0,0,0,0.5);display:flex;align-items:center;gap:4px;z-index:2000;">
                <span style="font-weight:800;">${p.name}</span>
                <span style="opacity:0.7;">${p.age}세</span>
                <span style="background:${statusColor};color:white;padding:0 4px;border-radius:2px;font-size:9px;font-weight:900;">${statusLabelText}</span>
              </div>
              ${
                patientBubble
                  ? `<div style="position:absolute;left:50%;top:124px;transform:translateX(-50%);background:${isCriticalBubble ? "#fff1f2" : "#ecfeff"};color:${isCriticalBubble ? "#be123c" : "#0f766e"};padding:${isSelected ? "4px 10px" : "3px 8px"};border-radius:999px;font-size:${isSelected ? "11px" : "10px"};font-weight:900;white-space:nowrap;border:1px solid rgba(255,255,255,0.25);box-shadow:0 6px 18px rgba(0,0,0,0.18);">${patientBubble}</div>`
                  : ""
              }
              <div style="position:absolute;left:50%;bottom:30px;transform:translateX(-50%);width:${avatarSize}px;height:${avatarSize}px;border-radius:999px;background:${isCriticalBubble ? "#fee2e2" : "#dcfce7"};border:${isSelected ? "3px" : "2px"} solid ${statusColor};display:flex;align-items:center;justify-content:center;font-size:${isSelected ? "26px" : "18px"};box-shadow:${isSelected ? "0 0 0 8px rgba(59,130,246,0.18), 0 10px 20px rgba(0,0,0,0.24)" : "0 6px 14px rgba(0,0,0,0.18)"};z-index:2;">
                ${avatarEmoji}
              </div>
              ${
                isCriticalBubble || isSelected
                  ? `<div style="position:absolute;left:50%;bottom:${Math.max(30, avatarSize / 2 + 8)}px;transform:translateX(-50%);width:${isSelected ? "56px" : "42px"};height:${isSelected ? "56px" : "42px"};background:${isCriticalBubble ? "rgba(239,68,68,0.22)" : "rgba(59,130,246,0.18)"};border-radius:999px;animation:pulse 1.2s infinite;z-index:1;"></div>`
                  : ""
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

          const stateKey =
            p.status +
            isBeingTransported +
            isSelected +
            (p.speechBubble || "") +
            avatarEmoji;
          if (m._lastStateKey !== stateKey) {
            const pIcon = window.L.divIcon({
              className: "p-icon",
              html: pIconHtml,
              iconSize: [210, 164],
              iconAnchor: [95, patientIconAnchorY],
            });
            m.setIcon(pIcon);
            m._lastStateKey = stateKey;
            if (isSelected) m.setZIndexOffset(2000);
            else m.setZIndexOffset(100);
          }
          
          // 팝업 이벤트 핸들러 재등록 (클로저 갱신을 위해)
          m.off('click');
          m.on('click', (e: any) => {
             try { window.L.DomEvent.stopPropagation(e); } catch {}
             openPatientPopup(p, displayLat, displayLng);
          });

        } else {
          const pIcon = window.L.divIcon({
            className: "p-icon",
            html: pIconHtml,
            iconSize: [210, 164],
            iconAnchor: [95, patientIconAnchorY],
          });
          const m = window.L.marker([displayLat, displayLng], { icon: pIcon })
            .addTo(mapRef.current);
            
          m.on('click', (e: any) => {
             try { window.L.DomEvent.stopPropagation(e); } catch {}
             openPatientPopup(p, displayLat, displayLng);
          });

          m._lastStateKey =
            p.status +
            isBeingTransported +
            isSelected +
            (p.speechBubble || "") +
            avatarEmoji;
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
    hasTrackedPatientLocation,
    matchedAmbulance,
    hospital,
    hospitalData,
    displayAmbulances,
    allPatients,
    mapReady,
    hospitalPath,
    openPatientPopup,
  ]);

  // 2. 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    /**
     * `initMap` 처리를 수행합니다.
     */
    const initMap = () => {
      if (!window.L) {
        initMapRetryTimeoutRef.current = window.setTimeout(initMap, 100);
        return;
      }

      const centerLat =
        typeof initialPatient?.lat === "number" && Number.isFinite(initialPatient.lat)
          ? initialPatient.lat
          : FALLBACK_MAP_CENTER[0];
      const centerLng =
        typeof initialPatient?.lng === "number" && Number.isFinite(initialPatient.lng)
          ? initialPatient.lng
          : FALLBACK_MAP_CENTER[1];
      const initialZoom =
        typeof initialPatient?.lat === "number" &&
        Number.isFinite(initialPatient.lat) &&
        typeof initialPatient?.lng === "number" &&
        Number.isFinite(initialPatient.lng)
          ? 16
          : FALLBACK_MAP_ZOOM;

      mapRef.current = window.L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: initialZoom,
        attributionControl: false,
        zoomControl: true,
        updateWhenIdle: true,
        updateWhenZooming: false,
        preferCanvas: true,
      });
      mapRef.current.on("click", () => {
        setOpenPopupPatientId(null);
        setOpenPopupAnchor(null);
        setOpenPopupScreenPos(null);
      });

      window.L.tileLayer(
        "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        {
          maxZoom: 20,
          maxNativeZoom: 20,
          keepBuffer: 2,
          updateWhenIdle: true,
          updateWhenZooming: false,
        },
      ).addTo(mapRef.current);

      setMapReady(true);
    };

    initMap();

    return () => {
      if (initMapRetryTimeoutRef.current !== null) {
        window.clearTimeout(initMapRetryTimeoutRef.current);
        initMapRetryTimeoutRef.current = null;
      }
      if (deferredSyncTimeoutRef.current !== null) {
        window.clearTimeout(deferredSyncTimeoutRef.current);
        deferredSyncTimeoutRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 3. 환자 데이터 동기화 및 지도 이동
  useEffect(() => {
    if (!initialPatient) {
      setCurrentPatient(null);
      return;
    }

    // ID 또는 배정된 구급차가 바뀌면 상태 초기화
    if (
      !currentPatient ||
      (initialPatient && currentPatient.id !== initialPatient.id) ||
      (initialPatient && currentPatient.matchedAmbulanceId !== initialPatient.matchedAmbulanceId)
    ) {
      if (initialPatient && (!currentPatient || currentPatient.id !== initialPatient.id)) {
        setPhase(TransportPhase.WAITING);
        setMatchedAmbulance(null);
        setHospitalPath([]);
        animPosRef.current = null;

        if (
          !Number.isFinite(initialPatient.lat) ||
          !Number.isFinite(initialPatient.lng)
        ) {
          setOpenPopupPatientId(null);
          setOpenPopupAnchor(null);
          setOpenPopupScreenPos(null);
        }

        if (mapRef.current && mapReady && Number.isFinite(initialPatient.lat) && Number.isFinite(initialPatient.lng)) {
          try {
          } catch {}

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
          if (!Number.isFinite(displayLat) || !Number.isFinite(displayLng)) {
            return;
          }
          openPatientPopup(initialPatient, displayLat, displayLng);
        }
      } else {
        setMatchedAmbulance(null);
        setPhase(TransportPhase.WAITING);
      }
    }

    // 데이터 상시 동기화
    setCurrentPatient(initialPatient || null);

    if (mapReady) {
      if (deferredSyncTimeoutRef.current !== null) {
        window.clearTimeout(deferredSyncTimeoutRef.current);
      }
      deferredSyncTimeoutRef.current = window.setTimeout(() => {
        deferredSyncTimeoutRef.current = null;
        syncLayers();
      }, 120);
    }
    return () => {
      if (deferredSyncTimeoutRef.current !== null) {
        window.clearTimeout(deferredSyncTimeoutRef.current);
        deferredSyncTimeoutRef.current = null;
      }
    };
  }, [initialPatient, mapReady, openPatientPopup, syncLayers]);

  /**
   * 선택된 환자 좌표가 갱신되면 지도 중심도 같은 좌표로 따라가게 유지합니다.
   */
  useEffect(() => {
    if (!mapRef.current || !mapReady || !currentPatient) {
      return;
    }

    const nextLat = currentPatient.lat;
    const nextLng = currentPatient.lng;
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
      return;
    }

    const center = mapRef.current.getCenter();
    if (
      Math.abs(center.lat - nextLat) < 0.00005 &&
      Math.abs(center.lng - nextLng) < 0.00005
    ) {
      return;
    }

    mapRef.current.flyTo([nextLat, nextLng], Math.max(mapRef.current.getZoom(), 16), {
      duration: 0.8,
    });

    /**
     * 선택된 실제 회원 좌표가 갱신될 때 위치 팝업도 같이 다시 열어 현재 위치가 즉시 눈에 들어오게 유지합니다.
     */
    openPatientPopup(currentPatient, nextLat, nextLng);
  }, [currentPatient?.lat, currentPatient?.lng, currentPatient?.id, mapReady, openPatientPopup]);

  useEffect(() => {
    if (!mapRef.current || !mapReady || hasTrackedPatientLocation) {
      return;
    }

    const center = mapRef.current.getCenter();
    if (
      Math.abs(center.lat - FALLBACK_MAP_CENTER[0]) < 0.00005 &&
      Math.abs(center.lng - FALLBACK_MAP_CENTER[1]) < 0.00005 &&
      mapRef.current.getZoom() === FALLBACK_MAP_ZOOM
    ) {
      return;
    }

    mapRef.current.flyTo(FALLBACK_MAP_CENTER, FALLBACK_MAP_ZOOM, {
      duration: 0.6,
    });
  }, [hasTrackedPatientLocation, mapReady]);

  const openPopupPatientCandidate =
    openPopupPatientId == null
      ? null
      : (allPatients || []).find((p) => p.id === openPopupPatientId) ||
        (currentPatient?.id === openPopupPatientId ? currentPatient : null) ||
        (initialPatient?.id === openPopupPatientId ? initialPatient : null);
  const openPopupAmbulance = getPopupAmbulance(openPopupPatientCandidate);
  const shouldHideTransportPopup =
    !!openPopupPatientCandidate &&
    !!openPopupAmbulance &&
    (openPopupAmbulance.activity === "boarding" ||
      openPopupAmbulance.activity === "transporting_to_hospital" ||
      openPopupPatientCandidate.simulationState === "boarding" ||
      openPopupPatientCandidate.simulationState === "transporting");
  // 이송 중에는 대형 환자 팝업을 숨겨 차량 이동 경로와 배차 상태를 우선 보게 합니다.
  const openPopupPatient = shouldHideTransportPopup ? null : openPopupPatientCandidate;
  const openPopupLayout =
    openPopupScreenPos && mapContainerRef.current
      ? calculatePopupOverlayLayout(openPopupScreenPos, {
          width: mapContainerRef.current.clientWidth,
          height: mapContainerRef.current.clientHeight,
        })
      : null;

  // 4. 지도 병원 데이터는 서울 고정 병원 목록만 사용합니다.
  useEffect(() => {
    // 응급 지도는 운영 기준상 서울 고정 병원 세트만 렌더링해 외부 API 지연 없이 일관된 마커 구성을 유지합니다.
    setHospitalData(
      SEOUL_MAP_HOSPITALS.filter(
        (hospital) =>
          Number.isFinite(hospital.lat) &&
          Number.isFinite(hospital.lng),
      ),
    );
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
      const snappedStart = await snapPathPointToRoad(s, servers);
      const snappedEnd = await snapPathPointToRoad(e, servers);

      for (const server of servers) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

          const url = `${server}/${snappedStart.lng},${snappedStart.lat};${snappedEnd.lng},${snappedEnd.lat}?overview=full&geometries=geojson&steps=true&continue_straight=true`;
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!res.ok) continue;

          const data = await res.json();
          const points = data.routes?.[0]?.geometry?.coordinates?.map(
            (c: any) => ({ lat: c[1], lng: c[0] }),
          );

          if (points && points.length > 0) {
            return densifyPathPoints([snappedStart, ...points, snappedEnd]);
          }
        } catch (err) {
          // console.warn(`Route fetch failed from ${server}:`, err);
          // Continue to next server
        }
      }
      
      // All servers failed - use Manhattan route instead of straight line
      // 실서비스 이동은 상위 상태가 관리하므로 여기서는 빈 경로를 반환해 잘못된 임시 선을 그리지 않습니다.
      return [];
    },
    [],
  );

  // 6. 매칭 로직 (상위에서 배정된 구급차 확인)
  useEffect(() => {
    // 상위 App.tsx가 경로와 이동을 단일 소스로 관리하므로,
    // 지도 컴포넌트에서는 별도 경로 계산을 하지 않습니다.
    return;
  }, [
    currentPatient?.matchedAmbulanceId,
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
      if (document.hidden) return;
      if (mapReady) syncLayers();
    }, MAP_LAYER_SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [syncLayers, mapReady, MAP_LAYER_SYNC_INTERVAL_MS]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      {openPopupPatient && openPopupScreenPos && openPopupLayout && (
        <div className="pointer-events-none absolute inset-0 z-[500] overflow-visible">
          <div
            className="pointer-events-auto absolute"
            style={{
              left: `${openPopupLayout.left}px`,
              top: `${openPopupLayout.top}px`,
              width: `${openPopupLayout.width}px`,
            }}
          >
            <div className="relative">
              <PopupContent
                patient={openPopupPatient}
                data={vitals}
                analysisTick={analysisTick}
                hospital={getPopupHospital(openPopupPatient)}
                ambulance={getPopupAmbulance(openPopupPatient)}
              />
              <div
                className="absolute"
                style={
                  openPopupLayout.placement === "above"
                    ? {
                        left: "50%",
                        transform: "translateX(-50%)",
                        bottom: "-14px",
                        width: 0,
                        height: 0,
                        borderLeft: "14px solid transparent",
                        borderRight: "14px solid transparent",
                        borderTop: "14px solid rgba(5, 7, 12, 0.96)",
                        filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.28))",
                      }
                    : {
                        left: "50%",
                        transform: "translateX(-50%)",
                        top: "-14px",
                        width: 0,
                        height: 0,
                        borderLeft: "14px solid transparent",
                        borderRight: "14px solid transparent",
                        borderBottom: "14px solid rgba(5, 7, 12, 0.96)",
                        filter: "drop-shadow(0 -4px 10px rgba(0,0,0,0.28))",
                      }
                }
              />
            </div>
          </div>
        </div>
      )}
      <style>{`
        .leaflet-pane.leaflet-marker-pane {
          z-index: 650 !important;
        }
        .leaflet-pane.leaflet-popup-pane {
          z-index: 700 !important;
        }
        .leaflet-marker-icon {
          background: transparent !important;
          border: none !important;
        }
        .metric-live-box-normal {
          animation: metric-live-box-normal-blink 1.15s steps(1, end) infinite;
        }
        .metric-live-box-warning {
          animation: metric-live-box-warning-blink 1.15s steps(1, end) infinite;
        }
        .metric-live-box-danger {
          animation: metric-live-box-danger-blink 1.15s steps(1, end) infinite;
        }
        .metric-live-value-normal {
          animation: metric-live-value-normal-blink 1.15s steps(1, end) infinite;
        }
        .metric-live-value-warning {
          animation: metric-live-value-warning-blink 1.15s steps(1, end) infinite;
        }
        .metric-live-value-danger {
          animation: metric-live-value-danger-blink 1.15s steps(1, end) infinite;
        }
        @keyframes metric-live-box-normal-blink {
          0%, 49% {
            background: rgba(2, 6, 23, 0.92);
            box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0.18), 0 0 10px rgba(16, 185, 129, 0.12);
          }
          50%, 100% {
            background: rgba(16, 185, 129, 0.95);
            box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.98), 0 0 18px rgba(16, 185, 129, 0.3);
          }
        }
        @keyframes metric-live-box-warning-blink {
          0%, 49% {
            background: rgba(2, 6, 23, 0.92);
            box-shadow: inset 0 0 0 1px rgba(250, 204, 21, 0.16), 0 0 10px rgba(250, 204, 21, 0.1);
          }
          50%, 100% {
            background: rgba(234, 179, 8, 0.96);
            box-shadow: inset 0 0 0 1px rgba(250, 204, 21, 0.98), 0 0 18px rgba(250, 204, 21, 0.24);
          }
        }
        @keyframes metric-live-box-danger-blink {
          0%, 49% {
            background: rgba(2, 6, 23, 0.92);
            box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.18), 0 0 10px rgba(239, 68, 68, 0.14);
          }
          50%, 100% {
            background: rgba(220, 38, 38, 0.96);
            box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.98), 0 0 18px rgba(239, 68, 68, 0.3);
          }
        }
        @keyframes metric-live-value-normal-blink {
          0%, 49% {
            color: #2dd4bf;
          }
          50%, 100% {
            color: #020617;
          }
        }
        @keyframes metric-live-value-warning-blink {
          0%, 49% {
            color: #fde047;
          }
          50%, 100% {
            color: #1c1917;
          }
        }
        @keyframes metric-live-value-danger-blink {
          0%, 49% {
            color: #fca5a5;
          }
          50%, 100% {
            color: #fff7ed;
          }
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

/**
 * 응급 관제센터 메인 지도 컴포넌트를 기본 export로 노출합니다.
 */
export default WorkingMap;
