import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  memo,
  useCallback,
} from "react";
import {
  INITIAL_HOSPITALS,
  ALL_FIRE_STATIONS,
} from "./constants";
import {
  Patient,
  Hospital,
  PatientStatus,
  TriageResult,
  Ambulance,
  AmbulanceStatus,
} from "./types";
import { analyzePatientData } from "./services/aiAnalysisService";
import { apiService } from "./services/apiService";
import { socketService } from "./services/socketService";
import {
  transformEmergencyCaseToPatient,
  transformMonitoredUserToPatient,
  transformBiometricToVitals,
  transformHospitalToFrontend,
  transformParamedicToAmbulance,
} from "./utils/dataTransform";
import { getPatientMonitoringVisualState } from "./utils/patientMonitoringState";
import PatientCard from "./components/PatientCard";
import VitalsChart from "./components/VitalsChart";
import LiveMap from "./components/WorkingMap";
import ErrorBoundary from "./components/ErrorBoundary";
import CrimeDashboard from "./components/CrimeDashboard";
import {
  Search,
  Activity,
  Hospital as HospitalIcon,
  Users,
  BrainCircuit,
  Monitor,
  Siren,
  Loader2,
  Cpu,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
  Droplets,
  ShieldAlert,
  CheckCircle2,
  Clock,
  BarChart,
  Server,
  Terminal,
  Wifi,
  LocateFixed,
  Wind,
  Gauge,
  Truck,
  Filter,
  UserCheck,
  Building2,
  RefreshCw,
  UserPlus,
  List,
  UserMinus,
  Volume2,
  VolumeX,
} from "lucide-react";
import CrimeList from "./components/CrimeList";
import {
  SHOWCASE_EMERGENCY_CASE_GUIDES,
  applyShowcaseEmergencyCase,
  buildShowcaseMember,
  buildShowcaseMembers,
  driftShowcaseLiveMetrics,
  driftShowcaseScenarioVitals,
  getGoldenTimeCaseLabel,
  driftShowcaseSensors,
  pickShowcaseEmergencyCase,
  shouldStartGoldenTimeForPatient,
} from "./utils/showcaseSimulation";

/**
 * 응급 관제센터 메인 화면 상태, 실시간 동기화, 전시 시뮬레이션을 통합 관리하는 루트 모듈입니다.
 */
const OSRM_SERVERS = [
  "https://router.project-osrm.org/route/v1/driving",
  "https://routing.openstreetmap.de/routed-car/route/v1/driving",
];
/**
 * 외부 라우팅 서버가 일시적으로 실패했을 때 재시도 폭주를 막는 간단한 circuit-open 시각입니다.
 */
let osrmCircuitOpenUntilMs = 0;

/**
 * 브라우저가 오프라인이거나 라우팅 회로 차단 구간이면 외부 경로 요청을 건너뜁니다.
 */
const shouldSkipRemoteRouting = () =>
  (typeof navigator !== "undefined" &&
    typeof navigator.onLine === "boolean" &&
    navigator.onLine === false) ||
  Date.now() < osrmCircuitOpenUntilMs;

/**
 * OSRM route endpoint를 nearest endpoint로 변환합니다.
 */
const toNearestEndpoint = (routeEndpoint: string) =>
  routeEndpoint.replace("/route/v1/driving", "/nearest/v1/driving");

/**
 * 지정 좌표를 가장 가까운 도로 좌표로 스냅합니다.
 */
const snapPointToRoad = async (
  point: { lat: number; lng: number },
  retries = 3,
  signal?: AbortSignal,
): Promise<{ lat: number; lng: number }> => {
  if (
    typeof point?.lat !== "number" ||
    typeof point?.lng !== "number" ||
    !Number.isFinite(point.lat) ||
    !Number.isFinite(point.lng)
  ) {
    return getSafeRoadFallbackPoint(0);
  }
  if (shouldSkipRemoteRouting()) {
    return getNearestSafeRoadPoint(point.lat, point.lng);
  }
  for (let attempt = 0; attempt < retries; attempt++) {
    if (signal?.aborted) {
      throw new Error("snap aborted");
    }
    for (const server of OSRM_SERVERS) {
      const radiuses = signal ? [500, 1200, 2500] : [300, 800, 1500, 3000, 5000];
      for (const radius of radiuses) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            signal ? 1200 : 4000,
          );
          const activeSignal = signal || controller.signal;
          const url = `${toNearestEndpoint(server)}/${point.lng},${point.lat}?number=1&radiuses=${radius}`;
          const res = await fetch(url, { signal: activeSignal });
          clearTimeout(timeoutId);

          if (res.status === 429) continue; // Rate limit, try next radius/server
          if (!res.ok) continue;

          const data = await res.json();
          const nearest = data.waypoints?.[0]?.location;
          if (Array.isArray(nearest) && nearest.length >= 2) {
            return { lat: nearest[1], lng: nearest[0] };
          }
        } catch {
          // nearest 실패 시 다음 radius/server로 시도
        }
      }
    }
    // 모든 서버 실패 시 잠시 대기 후 재시도 (API Rate Limit 회피)
    if (attempt < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, signal ? 200 : 1500));
    }
  }

  // 3번 모두 실패하면 차라리 강제로 서울 중심부 도로 좌표(시청 근처 등)로 빼거나, 
  // 원본 좌표를 주지 말고 재귀적으로 조금씩 이동시켜보는 것이 안전함.
  // 여기서는 최후의 수단으로 원본 반환 대신 안전한 임의의 도로 위 좌표(종로구 부근)로 폴백 처리
  osrmCircuitOpenUntilMs = Date.now() + 30000;
  return getNearestSafeRoadPoint(point.lat, point.lng);
};

// --- 미리 수집해 둔 서울 주요 도로변 좌표 목록 (산/물 위 방지용) ---
const SEOUL_SAFE_ROAD_POINTS = [
  { lat: 37.5704, lng: 126.9922 }, // 종로3가
  { lat: 37.5756, lng: 126.9769 }, // 광화문
  { lat: 37.5800, lng: 126.9753 }, // 경복궁
  { lat: 37.5512, lng: 126.9882 }, // 명동
  { lat: 37.5559, lng: 126.9369 }, // 신촌
  { lat: 37.5563, lng: 126.9236 }, // 홍대입구
  { lat: 37.5477, lng: 126.9232 }, // 합정
  { lat: 37.5414, lng: 126.9509 }, // 공덕
  { lat: 37.5346, lng: 126.9946 }, // 이태원
  { lat: 37.5218, lng: 126.9247 }, // 여의도역 대로
  { lat: 37.5285, lng: 126.9177 }, // 여의나루대로
  { lat: 37.5173, lng: 126.9052 }, // 영등포
  { lat: 37.5079, lng: 126.9564 }, // 노량진
  { lat: 37.5133, lng: 126.9415 }, // 흑석
  { lat: 37.4999, lng: 126.9284 }, // 신림
  { lat: 37.4811, lng: 126.9525 }, // 서울대입구
  { lat: 37.4923, lng: 126.8249 }, // 화곡
  { lat: 37.5268, lng: 126.8645 }, // 목동역 대로
  { lat: 37.5480, lng: 126.8748 }, // 신정네거리
  { lat: 37.5585, lng: 126.8350 }, // 마곡나루
  { lat: 37.5619, lng: 126.8130 }, // 김포공항(서울권)
  { lat: 37.5862, lng: 127.0290 }, // 청량리
  { lat: 37.5949, lng: 127.0527 }, // 회기
  { lat: 37.6060, lng: 127.0448 }, // 월곡
  { lat: 37.6107, lng: 127.0070 }, // 미아사거리
  { lat: 37.6263, lng: 127.0286 }, // 수유
  { lat: 37.6540, lng: 127.0560 }, // 노원
  { lat: 37.6629, lng: 127.0614 }, // 중계
  { lat: 37.6440, lng: 127.0766 }, // 상계
  { lat: 37.6011, lng: 126.9288 }, // 은평구청
  { lat: 37.6115, lng: 126.9176 }, // 불광
  { lat: 37.5929, lng: 126.9122 }, // 홍제
  { lat: 37.5824, lng: 126.9356 }, // 연신내 방면
  { lat: 37.5738, lng: 127.0164 }, // 동대문
  { lat: 37.5657, lng: 127.0090 }, // 을지로4가
  { lat: 37.5612, lng: 127.0371 }, // 왕십리
  { lat: 37.5446, lng: 127.0566 }, // 성수
  { lat: 37.5399, lng: 127.0706 }, // 건대입구
  { lat: 37.5139, lng: 127.1028 }, // 잠실
  { lat: 37.5208, lng: 127.1123 }, // 올림픽공원
  { lat: 37.4979, lng: 127.0276 }, // 강남역
  { lat: 37.5045, lng: 127.0490 }, // 선릉
  { lat: 37.5143, lng: 127.0617 }, // 삼성
  { lat: 37.5172, lng: 127.0473 }, // 압구정로데오
  { lat: 37.5190, lng: 127.0287 }, // 신사
  { lat: 37.4936, lng: 127.1180 }, // 가락시장
  { lat: 37.4849, lng: 127.0347 }, // 양재
  { lat: 37.4765, lng: 127.0370 }, // 양재시민의숲
];

/**
 * 실패 시 사용할 서울 도로 안전 좌표를 반환합니다.
 */
const getSafeRoadFallbackPoint = (seed: number) =>
  SEOUL_SAFE_ROAD_POINTS[Math.abs(seed) % SEOUL_SAFE_ROAD_POINTS.length];

/**
 * 주어진 좌표에서 가장 가까운 서울 안전 도로 포인트를 찾습니다.
 * OSRM 스냅이 실패했을 때 도로 위 fallback 시작점/도착점을 고르는 기준으로 사용합니다.
 */
const getNearestSafeRoadPoint = (lat: number, lng: number) => {
  let best = SEOUL_SAFE_ROAD_POINTS[0] || { lat, lng };
  let bestDist = Number.POSITIVE_INFINITY;

  for (const point of SEOUL_SAFE_ROAD_POINTS) {
    const dist = getHaversineDistance(lat, lng, point.lat, point.lng);
    if (dist < bestDist) {
      bestDist = dist;
      best = point;
    }
  }

  return best;
};

/**
 * 제외 좌표를 빼고 가장 가까운 다른 안전 도로 포인트를 찾습니다.
 * 시작점과 끝점이 같은 fallback 포인트로 겹치지 않게 최소한의 분리 경로를 만들 때 사용합니다.
 */
const getNearestDistinctSafeRoadPoint = (
  lat: number,
  lng: number,
  exclude: { lat: number; lng: number },
) => {
  return (
    SEOUL_SAFE_ROAD_POINTS
      .filter((point) => !(point.lat === exclude.lat && point.lng === exclude.lng))
      .sort(
        (a, b) =>
          getHaversineDistance(lat, lng, a.lat, a.lng) -
          getHaversineDistance(lat, lng, b.lat, b.lng),
      )[0] || exclude
  );
};

/**
 * OSRM이 불가한 상황에서도 "도로 위 좌표(안전 포인트)"만 이용해
 * 최소한의 이동 경로(점선)를 생성합니다.
 */
const buildSafePointGraphRoute = (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
) => {
  const startSafe = getNearestSafeRoadPoint(start.lat, start.lng);
  let endSafe = getNearestSafeRoadPoint(end.lat, end.lng);
  if (
    startSafe.lat === endSafe.lat &&
    startSafe.lng === endSafe.lng
  ) {
    endSafe = getNearestDistinctSafeRoadPoint(end.lat, end.lng, startSafe);
    const shortFallback = normalizeRoadRoute([startSafe, endSafe]);
    return densifyRoadRoute(shortFallback.length >= 2 ? shortFallback : [startSafe, endSafe]);
  }

  const nodes = SEOUL_SAFE_ROAD_POINTS;
  const maxEdgeKm = 4.8;
  const n = nodes.length;
  const dist = new Array<number>(n).fill(Number.POSITIVE_INFINITY);
  const prev = new Array<number>(n).fill(-1);
  const visited = new Array<boolean>(n).fill(false);

  const startIndex = nodes.findIndex(
    (p) => p.lat === startSafe.lat && p.lng === startSafe.lng,
  );
  const endIndex = nodes.findIndex(
    (p) => p.lat === endSafe.lat && p.lng === endSafe.lng,
  );
  if (startIndex < 0 || endIndex < 0) {
    const shortFallback = normalizeRoadRoute([startSafe, endSafe]);
    return densifyRoadRoute(shortFallback.length >= 2 ? shortFallback : [startSafe, endSafe]);
  }

  dist[startIndex] = 0;
  for (let iter = 0; iter < n; iter += 1) {
    let u = -1;
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < n; i += 1) {
      if (!visited[i] && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u < 0) break;
    if (u === endIndex) break;
    visited[u] = true;

    for (let v = 0; v < n; v += 1) {
      if (visited[v]) continue;
      const edge = getHaversineDistance(nodes[u].lat, nodes[u].lng, nodes[v].lat, nodes[v].lng);
      if (edge <= 0 || edge > maxEdgeKm) continue;
      const cand = dist[u] + edge;
      if (cand < dist[v]) {
        dist[v] = cand;
        prev[v] = u;
      }
    }
  }

  if (!Number.isFinite(dist[endIndex]) || dist[endIndex] === Number.POSITIVE_INFINITY) {
    const fallbackMid = getNearestDistinctSafeRoadPoint(
      (start.lat + end.lat) / 2,
      (start.lng + end.lng) / 2,
      startSafe,
    );
    const shortFallback = normalizeRoadRoute([startSafe, fallbackMid, endSafe]);
    return densifyRoadRoute(shortFallback.length >= 2 ? shortFallback : [startSafe, endSafe]);
  }

  const pathIdx: number[] = [];
  let cur = endIndex;
  while (cur >= 0) {
    pathIdx.push(cur);
    if (cur === startIndex) break;
    cur = prev[cur];
  }
  pathIdx.reverse();
  const pathPoints = pathIdx.map((i) => nodes[i]);
  const normalizedPath = normalizeRoadRoute([startSafe, ...pathPoints, endSafe]);
  if (normalizedPath.length >= 2) {
    return densifyRoadRoute(normalizedPath);
  }
  const safeAlt = getNearestDistinctSafeRoadPoint(end.lat, end.lng, startSafe);
  return densifyRoadRoute([startSafe, safeAlt, endSafe]);
};

/**
 * 실제 출발/도착 좌표를 유지한 채 안전 도로 포인트를 섞어 fallback 경로를 구성합니다.
 * 라우팅 서버 장애 시에도 차량/환자 마커가 도로와 동떨어져 보이지 않게 하는 용도입니다.
 */
const buildFallbackRoadRoute = (s: { lat: number; lng: number }, e: { lat: number; lng: number }) => {
  const safeRoute = buildSafePointGraphRoute(s, e);
  const withRealEndpoints = normalizeRoadRoute([
    { lat: s.lat, lng: s.lng },
    ...safeRoute,
    { lat: e.lat, lng: e.lng },
  ]);
  return densifyRoadRoute(withRealEndpoints.length >= 2 ? withRealEndpoints : [s, e]);
};

/**
 * 라우팅 결과의 중복/초근접 점을 제거해 도로선 이탈처럼 보이는 흔들림을 줄입니다.
 */
const normalizeRoadRoute = (points: { lat: number; lng: number }[]) => {
  const normalized = points.filter(
    (point) =>
      Number.isFinite(point?.lat) &&
      Number.isFinite(point?.lng),
  );

  return normalized.filter((point, index, arr) => {
    if (index === 0) return true;
    const prev = arr[index - 1];
    return (
      Number.isFinite(prev?.lat) &&
      Number.isFinite(prev?.lng) &&
      getHaversineDistance(prev.lat, prev.lng, point.lat, point.lng) > 0.003
    );
  });
};

/**
 * 도로 경로 점 사이 간격을 촘촘하게 보간해 차량이 도로를 더 정확히 따라가도록 합니다.
 */
const densifyRoadRoute = (points: { lat: number; lng: number }[]) => {
  if (points.length <= 1) return points;

  const densified: { lat: number; lng: number }[] = [points[0]];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const segmentDistanceKm = getHaversineDistance(
      previous.lat,
      previous.lng,
      current.lat,
      current.lng,
    );
    const subdivisions = Math.max(1, Math.ceil(segmentDistanceKm / 0.008));

    for (let step = 1; step <= subdivisions; step += 1) {
      const ratio = step / subdivisions;
      densified.push({
        lat: previous.lat + (current.lat - previous.lat) * ratio,
        lng: previous.lng + (current.lng - previous.lng) * ratio,
      });
    }
  }

  return densified;
};

/**
 * 두 좌표를 도로에 스냅한 뒤 OSRM 서버 순서대로 실제 도로 경로를 조회합니다.
 * 서버가 느리거나 실패하면 빠르게 다음 후보를 시도하고, 끝까지 실패하면 빈 경로를 반환합니다.
 */
const fetchRoadRoute = async (
  s: { lat: number; lng: number },
  e: { lat: number; lng: number },
  signal?: AbortSignal
) => {
  if (
    typeof s?.lat !== "number" ||
    typeof s?.lng !== "number" ||
    typeof e?.lat !== "number" ||
    typeof e?.lng !== "number" ||
    !Number.isFinite(s.lat) ||
    !Number.isFinite(s.lng) ||
    !Number.isFinite(e.lat) ||
    !Number.isFinite(e.lng)
  ) {
    return [];
  }
  if (shouldSkipRemoteRouting()) {
    return buildFallbackRoadRoute(s, e);
  }
  const snappedStart = await snapPointToRoad(s, signal ? 1 : 3, signal);
  const snappedEnd = await snapPointToRoad(e, signal ? 1 : 3, signal);

  for (const server of OSRM_SERVERS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1초 내에 응답 없으면 포기
      const activeSignal = signal || controller.signal;
      
      const url = `${server}/${snappedStart.lng},${snappedStart.lat};${snappedEnd.lng},${snappedEnd.lat}?overview=full&geometries=geojson&steps=true&continue_straight=true`;
      const res = await fetch(url, { signal: activeSignal });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        // console.warn(`OSRM fetch failed: ${server} status ${res.status}`);
        continue;
      }
      
      const data = await res.json();
      if (data.code !== 'Ok') {
        // console.warn(`OSRM error: ${data.code}`);
        continue;
      }

      const pts =
        data.routes?.[0]?.geometry?.coordinates?.map((c: any) => ({
          lat: c[1],
          lng: c[0],
        }))?.filter(
          (point: any) =>
            Number.isFinite(point?.lat) && Number.isFinite(point?.lng),
        ) || [];
        
      if (pts.length > 0) {
        const normalized = normalizeRoadRoute([
          snappedStart,
          ...pts,
          snappedEnd,
        ]);
        const finalRoute = densifyRoadRoute(
          normalized.length > 1 ? normalized : pts,
        );
        return finalRoute.length > 1 ? finalRoute : pts;
      }
    } catch (err) {
      // console.warn(`OSRM connection error (${server}):`, err);
    }
  }
  
  osrmCircuitOpenUntilMs = Math.max(osrmCircuitOpenUntilMs, Date.now() + 15000);
  return buildFallbackRoadRoute(s, e);
};

/**
 * 이미 도로 위에 있는 좌표라고 가정하고 빠르게 도로 경로를 조회합니다.
 */
const fetchRoadRouteQuick = async (
  s: { lat: number; lng: number },
  e: { lat: number; lng: number },
  signal?: AbortSignal,
) => {
  if (
    typeof s?.lat !== "number" ||
    typeof s?.lng !== "number" ||
    typeof e?.lat !== "number" ||
    typeof e?.lng !== "number" ||
    !Number.isFinite(s.lat) ||
    !Number.isFinite(s.lng) ||
    !Number.isFinite(e.lat) ||
    !Number.isFinite(e.lng)
  ) {
    return [];
  }
  if (shouldSkipRemoteRouting()) {
    return buildFallbackRoadRoute(s, e);
  }
  for (const server of OSRM_SERVERS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        signal ? 900 : 1200,
      );
      const activeSignal = signal || controller.signal;
      const url = `${server}/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson&steps=true&continue_straight=true`;
      const res = await fetch(url, { signal: activeSignal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const data = await res.json();
      if (data.code !== "Ok") continue;

      const pts =
        data.routes?.[0]?.geometry?.coordinates?.map((c: any) => ({
          lat: c[1],
          lng: c[0],
        }))?.filter(
          (point: any) =>
            Number.isFinite(point?.lat) && Number.isFinite(point?.lng),
        ) || [];

      if (pts.length >= 2) {
        return densifyRoadRoute(normalizeRoadRoute(pts));
      }
    } catch {
      // 다음 서버로 시도
    }
  }

  osrmCircuitOpenUntilMs = Math.max(osrmCircuitOpenUntilMs, Date.now() + 15000);
  return buildFallbackRoadRoute(s, e);
};

/**
 * 대기 순찰 전용: 실제 OSRM 도로 경로가 생성된 경우에만 반환합니다.
 * fallback 경로는 사용하지 않아 대기 차량이 도로 밖으로 뜨는 것을 막습니다.
 */
const fetchPatrolRoadRoute = async (
  s: { lat: number; lng: number },
  e: { lat: number; lng: number },
) => {
  if (
    typeof s?.lat !== "number" ||
    typeof s?.lng !== "number" ||
    typeof e?.lat !== "number" ||
    typeof e?.lng !== "number" ||
    !Number.isFinite(s.lat) ||
    !Number.isFinite(s.lng) ||
    !Number.isFinite(e.lat) ||
    !Number.isFinite(e.lng)
  ) {
    return [];
  }

  if (shouldSkipRemoteRouting()) {
    return [];
  }

  const snappedStart = await snapPointToRoad(s, 2);
  const snappedEnd = await snapPointToRoad(e, 2);

  for (const server of OSRM_SERVERS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const url = `${server}/${snappedStart.lng},${snappedStart.lat};${snappedEnd.lng},${snappedEnd.lat}?overview=full&geometries=geojson&steps=true&continue_straight=true`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const data = await res.json();
      if (data.code !== "Ok") continue;

      const pts =
        data.routes?.[0]?.geometry?.coordinates?.map((c: any) => ({
          lat: c[1],
          lng: c[0],
        }))?.filter(
          (point: any) =>
            Number.isFinite(point?.lat) && Number.isFinite(point?.lng),
        ) || [];

      if (pts.length >= 2) {
        const normalized = normalizeRoadRoute([snappedStart, ...pts, snappedEnd]);
        const finalRoute = densifyRoadRoute(normalized.length > 1 ? normalized : pts);
        return finalRoute.length >= 2 ? finalRoute : [];
      }
    } catch {
      // 다음 서버 시도
    }
  }

  return [];
};

/**
 * 도로 경로 전체 길이를 km 단위로 계산합니다.
 */
const getRouteDistanceKm = (points: { lat: number; lng: number }[]) => {
  if (!Array.isArray(points) || points.length < 2) return 0;

  let totalDistanceKm = 0;
  for (let index = 1; index < points.length; index += 1) {
    totalDistanceKm += getHaversineDistance(
      points[index - 1].lat,
      points[index - 1].lng,
      points[index].lat,
      points[index].lng,
    );
  }

  return totalDistanceKm;
};

/**
 * 골든타임 4분 기준으로 환자 도착 목표 속도를 계산합니다.
 */
const getDispatchTargetSpeedKmh = (routeDistanceKm: number) => {
  if (!Number.isFinite(routeDistanceKm) || routeDistanceKm <= 0) {
    return 68;
  }

  const requiredSpeedKmh = (routeDistanceKm / 4) * 60;
  return Math.round(Math.max(64, Math.min(76, requiredSpeedKmh)));
};

/**
 * 서울 시뮬레이션용 정규 119 구급차 총 대수입니다.
 */
const SEOUL_REGULAR_AMBULANCE_TOTAL = 100;
const SEOUL_SIM_BOUNDS = {
  minLat: 37.46,
  maxLat: 37.62,
  minLng: 126.88,
  maxLng: 127.16,
};
const MIN_AMBULANCE_SPACING_METERS = 520;
const MIN_ROAD_AMBULANCE_SPACING_METERS = 560;
// 모바일 서버 업로드가 30초 주기라 관제 stale/탈착 필터는 그보다 여유 있게 유지합니다.
const CONTROL_STALE_THRESHOLD_MS = 45_000;
const SEOUL_PATROL_ZONES = [
  { minLat: 37.56, maxLat: 37.61, minLng: 126.88, maxLng: 126.96 },
  { minLat: 37.56, maxLat: 37.61, minLng: 126.96, maxLng: 127.03 },
  { minLat: 37.56, maxLat: 37.61, minLng: 127.03, maxLng: 127.10 },
  { minLat: 37.56, maxLat: 37.61, minLng: 127.10, maxLng: 127.16 },
  { minLat: 37.51, maxLat: 37.56, minLng: 126.88, maxLng: 126.96 },
  { minLat: 37.51, maxLat: 37.56, minLng: 126.96, maxLng: 127.03 },
  { minLat: 37.51, maxLat: 37.56, minLng: 127.03, maxLng: 127.10 },
  { minLat: 37.51, maxLat: 37.56, minLng: 127.10, maxLng: 127.16 },
  { minLat: 37.46, maxLat: 37.51, minLng: 126.90, maxLng: 126.98 },
  { minLat: 37.46, maxLat: 37.51, minLng: 126.98, maxLng: 127.06 },
  { minLat: 37.46, maxLat: 37.51, minLng: 127.06, maxLng: 127.14 },
];

/**
 * 시드 기반 난수 비율을 생성합니다.
 */
const getSeedRatio = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return (hash % 1000) / 1000;
};

/**
 * 미터 단위 오프셋을 위경도로 변환합니다.
 */
const offsetLatLngByMeters = (
  lat: number,
  lng: number,
  offsetXMeters: number,
  offsetYMeters: number,
) => {
  const latOffset = offsetYMeters / 111320;
  const lngOffset =
    offsetXMeters / (111320 * Math.max(0.35, Math.cos((lat * Math.PI) / 180)));

  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
  };
};

/**
 * 전시 배차 보정 시 환자와 너무 붙지 않도록 약간 떨어진 도로 좌표를 우선 찾습니다.
 */
const findShowcaseDispatchRepositionPoint = async (patient: Patient) => {
  const baseAngle = getSeedRatio(`showcase-dispatch-gap-${patient.id}`) * Math.PI * 2;
  const angleOffsets = [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3];
  const targetDistancesMeters = [450, 650, 850];

  for (const distanceMeters of targetDistancesMeters) {
    for (const angleOffset of angleOffsets) {
      const angle = baseAngle + angleOffset;
      const candidatePoint = offsetLatLngByMeters(
        patient.lat,
        patient.lng,
        Math.cos(angle) * distanceMeters,
        Math.sin(angle) * distanceMeters,
      );

      try {
        const snappedCandidate = await snapPointToRoad(candidatePoint, 2);
        const snappedDistanceKm = getHaversineDistance(
          patient.lat,
          patient.lng,
          snappedCandidate.lat,
          snappedCandidate.lng,
        );
        if (snappedDistanceKm >= 0.35 && snappedDistanceKm <= 1.2) {
          return snappedCandidate;
        }
      } catch {
        // 다음 후보를 시도합니다.
      }
    }
  }

  const nearestSafePoint = getNearestSafeRoadPoint(patient.lat, patient.lng);
  const safePointDistanceKm = getHaversineDistance(
    patient.lat,
    patient.lng,
    nearestSafePoint.lat,
    nearestSafePoint.lng,
  );
  if (safePointDistanceKm >= 0.25) {
    return nearestSafePoint;
  }

  return null;
};

/**
 * 두 좌표 사이의 대략적인 거리(m)를 계산합니다.
 */
const getApproxDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const avgLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const metersPerLat = 111320;
  const metersPerLng = 111320 * Math.max(0.35, Math.cos(avgLat));
  const dx = (lng1 - lng2) * metersPerLng;
  const dy = (lat1 - lat2) * metersPerLat;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * 서울 생활권 순찰 구역 안에서 랜덤 후보 좌표를 생성합니다.
 */
const sampleSeoulPatrolCandidate = (seedBase: string) => {
  const zoneIndex = Math.floor(getSeedRatio(`${seedBase}-zone`) * SEOUL_PATROL_ZONES.length);
  const zone = SEOUL_PATROL_ZONES[Math.min(zoneIndex, SEOUL_PATROL_ZONES.length - 1)];

  return {
    lat:
      zone.minLat +
      (zone.maxLat - zone.minLat) * getSeedRatio(`${seedBase}-lat`),
    lng:
      zone.minLng +
      (zone.maxLng - zone.minLng) * getSeedRatio(`${seedBase}-lng`),
  };
};

/**
 * 서울 운영권역 안에 초기 구급차를 랜덤 분산 배치합니다.
 */
const buildDistributedAmbulances = (): Ambulance[] => {
  const seoulStations = ALL_FIRE_STATIONS.filter(s => s.region === "서울");
  if (seoulStations.length === 0) return [];

  return Array.from({ length: SEOUL_REGULAR_AMBULANCE_TOTAL }, (_, index) => {
    const station = seoulStations[index % seoulStations.length];
    
    // 소방서 반경 5km 내에 흩뿌리되 뭉치지 않게 (원형 분포)
    const angle = getSeedRatio(`angle-${index}`) * Math.PI * 2;
    // sqrt를 적용하여 중심에 몰리지 않고 면적에 고르게 분포하도록 함
    const radiusMeters = Math.sqrt(getSeedRatio(`radius-${index}`)) * 5000; 
    
    const offsetXMeters = Math.cos(angle) * radiusMeters;
    const offsetYMeters = Math.sin(angle) * radiusMeters;
    
    const intendedPosition = offsetLatLngByMeters(
      station.lat,
      station.lng,
      offsetXMeters,
      offsetYMeters,
    );

    // 초기 렌더링은 무조건 도로 위(안전 도로 좌표)에서 시작하고,
    // 비동기 스냅이 끝나면 intendedPosition 기준으로 실제 도로 위치로 옮깁니다.
    const safePoint = getSafeRoadFallbackPoint(index + 1);
    const initialDisplayPosition = safePoint;

    return {
      id: `a${index + 1}`,
      unitName: `서울 119-${String(index + 1).padStart(3, "0")}`,
      lat: initialDisplayPosition.lat,
      lng: initialDisplayPosition.lng,
      baseLat: intendedPosition.lat,
      baseLng: intendedPosition.lng,
      baseStationName: station.name,
      status: AmbulanceStatus.AVAILABLE,
      type: index % 4 === 0 ? "ALS" : "BLS",
      currentSpeedKmh: 0,
      activity: undefined,
      speechBubble: null,
    };
  });
};

/**
 * 응급차 활동 상태를 전시용 현실 속도 값으로 변환합니다.
 */
const getAmbulanceSpeedKmh = (
  activity?: Ambulance["activity"],
  currentSpeedKmh?: number,
  targetSpeedKmh?: number,
) => {
  if (activity === "boarding" || !activity) {
    return 0;
  }

  /**
   * `profile` 기능을 처리합니다.
   */
  const profile = (() => {
    switch (activity) {
      case "heading_to_patient":
        return { min: 64, max: 76, drift: 4, base: 68 };
      case "transporting_to_hospital":
        return { min: 62, max: 74, drift: 4, base: 68 };
      case "returning":
        return { min: 35, max: 52, drift: 4, base: 42 };
      case "patrolling":
        return { min: 20, max: 32, drift: 3, base: 24 };
      default:
        return { min: 0, max: 0, drift: 0, base: 0 };
    }
  })();

  const target =
    typeof targetSpeedKmh === "number" && Number.isFinite(targetSpeedKmh)
      ? targetSpeedKmh
      : profile.base;
  const current =
    typeof currentSpeedKmh === "number" && Number.isFinite(currentSpeedKmh)
      ? currentSpeedKmh
      : target;
  const next =
    current + (target - current) * 0.42 + (Math.random() - 0.5) * profile.drift;
  return Math.round(Math.max(profile.min, Math.min(profile.max, next)));
};

/**
 * 현재 응급차 속도(km/h)를 100ms 이동 거리(km)로 변환합니다.
 */
const getAmbulanceDistancePerTickKm = (
  activity?: Ambulance["activity"],
  currentSpeedKmh?: number,
  targetSpeedKmh?: number,
  tickMs = 100,
) => {
  if (activity === "boarding" || !activity) {
    return 0;
  }

  const speedKmh = getAmbulanceSpeedKmh(activity, currentSpeedKmh, targetSpeedKmh);
  // 지도 표현 속도가 과도하게 빨라 보이지 않도록 전시 배속을 낮춥니다.
  const SIMULATION_SPEED_MULTIPLIER = 2.2;
  return (speedKmh * tickMs * SIMULATION_SPEED_MULTIPLIER) / 3_600_000;
};

/**
 * 관제 우측 패널용 상황 요약을 생성합니다.
 * 사용자 코칭 문구 대신 관제사의 확인 포인트와 조치 관점으로 정리합니다.
 */
const buildControlRoomSummary = (patient: Patient | null | undefined) => {
  if (!patient) return "관제 대상이 선택되지 않았습니다.";

  const isWear = patient.vitals?.isWear;
  const heartRate =
    isWear === false
      ? 0
      : typeof patient.vitals?.heartRate === "number" && patient.vitals.heartRate > 0
        ? patient.vitals.heartRate
        : null;
  const spo2 =
    typeof patient.vitals?.oxygenLevel === "number" && patient.vitals.oxygenLevel > 0
      ? patient.vitals.oxygenLevel
      : null;
  const bodyTemp =
    typeof patient.vitals?.bodyTemp === "number" && patient.vitals.bodyTemp > 0
      ? patient.vitals.bodyTemp
      : null;
  const stress =
    typeof patient.vitals?.stressLevel === "number" ? patient.vitals.stressLevel : null;
  const steps = typeof patient.steps === "number" ? patient.steps : null;
  const fallScore =
    typeof patient.vitals?.fallScore === "number" ? patient.vitals.fallScore : null;
  const recentFallPeakScore =
    typeof patient.vitals?.recentFallPeakScore === "number"
      ? patient.vitals.recentFallPeakScore
      : null;
  const emergencyScore =
    typeof patient.vitals?.emergencyScore === "number" ? patient.vitals.emergencyScore : null;
  const responseState = patient.vitals?.responseState || "unknown";
  const postImpactImmobilitySec =
    typeof patient.vitals?.fallFeatures?.postImpactImmobilitySec === "number"
      ? patient.vitals.fallFeatures.postImpactImmobilitySec
      : null;
  const fallMagnitude =
    typeof patient.vitals?.fallFeatures?.fallMagnitude === "number"
      ? patient.vitals.fallFeatures.fallMagnitude
      : null;
  const visualState = getPatientMonitoringVisualState(patient);

  const statusLine =
    visualState.kind === "removed"
      ? "● 현재 상태: 워치 탈착 상태입니다. 실제 응급과 분리해서 재착용 여부를 우선 확인합니다."
      : visualState.kind === "stale"
        ? "● 현재 상태: 생체 데이터 미수집 상태입니다. 센서 오류 또는 업로드 지연 여부를 우선 확인합니다."
      : emergencyScore !== null && emergencyScore >= 85
        ? "● 현재 상태: 중증 응급 단계. 즉시 반응 확인과 출동 진행 여부를 점검해야 합니다."
      : emergencyScore !== null && emergencyScore >= 70
        ? "● 현재 상태: 낙상 고위험 단계. 즉시 연락 시도와 현장 대응 준비가 필요합니다."
      : fallScore !== null && fallScore >= 50
        ? "● 현재 상태: 낙상 의심 단계. 무움직임과 반응 여부를 우선 확인합니다."
      : visualState.kind === "critical"
        ? "● 현재 상태: 응급 단계. 즉시 반응 확인과 출동 진행 여부를 점검해야 합니다."
      : visualState.kind === "danger"
        ? "● 현재 상태: 위험 단계. 사용자 상태 확인과 현장 대응 준비가 필요합니다."
        : visualState.kind === "warning"
          ? "● 현재 상태: 경고 단계. 관제 추적 관찰과 연락 확인이 필요합니다."
          : visualState.kind === "caution"
            ? "● 현재 상태: 주의 단계. 수치 추세와 사용자 반응을 계속 확인합니다."
            : "● 현재 상태: 정상 모니터링 단계입니다.";

  const wearLine =
    isWear === false
      ? "● 착용 상태: 워치 탈착 감지. 생체 수치 해석보다 재착용 여부 확인이 우선입니다."
      : "● 착용 상태: 워치 착용 중으로 판단됩니다.";

  const metricParts = [
    heartRate !== null ? `심박 ${heartRate}bpm` : "심박 미수집",
    spo2 !== null ? `SpO2 ${spo2}%` : "SpO2 미수집",
    bodyTemp !== null ? `피부온도 ${bodyTemp.toFixed(1)}°C` : "피부온도 미수집",
    stress !== null ? `스트레스 ${stress}` : "스트레스 미수집",
    steps !== null ? `걸음수 ${steps.toLocaleString()}보` : "걸음수 미수집",
    fallScore !== null
      ? `낙상점수 ${fallScore}${recentFallPeakScore !== null && recentFallPeakScore > fallScore ? ` (최근최대 ${recentFallPeakScore})` : ""}`
      : recentFallPeakScore !== null
        ? `낙상점수 0 (최근최대 ${recentFallPeakScore})`
        : "낙상점수 미수집",
    emergencyScore !== null ? `응급점수 ${emergencyScore}` : "응급점수 미수집",
  ];
  const metricLine = `● 현재 수치: ${metricParts.join(" · ")}.`;

  const actionLine =
    isWear === false
      ? "● 관제 조치: 재착용 요청 후 수치 재수집 여부를 확인합니다."
      : visualState.kind === "stale"
        ? "● 관제 조치: 데이터 업로드 재개 여부와 센서 연결 상태를 우선 점검합니다."
      : responseState === "no_response"
        ? "● 관제 조치: 사용자 무응답 상태입니다. 보호자/출동 자원 연결과 매칭 의료센터 진행 상황을 즉시 확인합니다."
        : (emergencyScore !== null && emergencyScore >= 70) || visualState.kind === "critical" || visualState.kind === "danger"
          ? "● 관제 조치: 사용자 반응 확인, 보호자/출동 자원 연결 상태, 매칭 의료센터 진행 상황을 우선 점검합니다."
        : visualState.kind === "warning" || visualState.kind === "caution"
          ? "● 관제 조치: 추세 악화 여부와 연락 가능 여부를 확인하면서 모니터링을 유지합니다."
          : "● 관제 조치: 정상 범위 유지 여부와 데이터 갱신 상태를 계속 모니터링합니다.";

  const fallLine =
    fallScore !== null || postImpactImmobilitySec !== null || fallMagnitude !== null
      ? `● 낙상 근거: ${fallMagnitude !== null ? `충격 ${fallMagnitude.toFixed(2)}g` : "충격 정보 없음"} · ${postImpactImmobilitySec !== null ? `무움직임 ${postImpactImmobilitySec}초` : "무움직임 정보 없음"} · ${
          responseState === "no_response"
            ? "무응답"
            : responseState === "delayed"
              ? "응답 지연"
              : responseState === "responsive"
                ? "응답 확인"
                : "응답 상태 미수집"
        }.`
      : null;

  return [statusLine, wearLine, metricLine, fallLine, actionLine].filter(Boolean).join("\n");
};

/**
 * 관제 우측 패널의 판정 한 줄 요약을 생성합니다.
 */
const buildJudgmentSummary = (patient: Patient | null | undefined) => {
  if (!patient) return "대상 없음";
  const visualState = getPatientMonitoringVisualState(patient);

  const baseLabel =
    visualState.kind === "removed"
      ? "워치 탈착"
      : visualState.kind === "stale"
        ? "미수집 상태"
      : visualState.kind === "critical" || visualState.kind === "danger"
        ? "위급상황"
      : visualState.kind === "warning" || visualState.kind === "caution"
        ? "주의 필요"
        : "정상 모니터링";

  const scoreParts: string[] = [];
  if (typeof patient.vitals?.fallScore === "number") {
    scoreParts.push(`FALL ${patient.vitals.fallScore}`);
  }
  if (typeof patient.vitals?.emergencyScore === "number") {
    scoreParts.push(`EMG ${patient.vitals.emergencyScore}`);
  }

  return scoreParts.length > 0 ? `${baseLabel} | ${scoreParts.join(" · ")}` : baseLabel;
};

/**
 * 우측 생체 데이터 카드에서 마우스오버 시 보여줄 기준 가이드를 반환합니다.
 */
const getVitalGuideText = (key: string) => {
  const guideMap: Record<string, string> = {
    heartRate:
      "정상 참고 60~100 bpm. 주의 구간 45 이하 또는 130 이상. 응급 가중 구간 35 이하 또는 160 이상.",
    oxygen:
      "정상 참고 95~100%. 주의 구간 90~94%. 응급 의심 구간 90% 미만.",
    skinTemp:
      "손목 피부온도 기준 30~35°C. 개인 baseline 대비 +1.0°C 이상 주의, +1.5°C 이상 이상 가능성. 단독 응급 판단은 금지.",
    battery:
      "운영 가이드 기준 20% 미만 주의, 10% 미만 충전 우선 확인.",
    stress:
      "참고 기준 0~39 안정, 40~69 보통, 70 이상 높음. 단독 응급 판단보다 다른 지표와 함께 봅니다.",
    steps:
      "절대 위험 기준은 아니며 활동량 추세 확인용입니다. 급감 또는 장시간 0보 상태는 다른 지표와 함께 확인합니다.",
    fall:
      "낙상점수 기준 0~49 관찰, 50~69 낙상 의심, 70~84 고위험, 85 이상 즉시 대응 권고.",
    emergency:
      "응급점수 기준 0~49 관찰, 50~69 주의, 70~84 고위험, 85 이상 중증 응급 대응 기준.",
  };

  return guideMap[key] || "관제 참고용 가이드입니다.";
};

/**
 * 우측 패널 생체 데이터 카드를 렌더링합니다.
 */
const VitalGuideCard = ({
  label,
  value,
  valueClassName,
  guideKey,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName: string;
  guideKey: string;
}) => {
  return (
    <div className="relative group overflow-visible bg-black/40 p-1.5 rounded-xl border border-zinc-900">
      <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-40 hidden w-52 rounded-lg border border-zinc-300 bg-white p-2 text-left shadow-[0_12px_28px_rgba(0,0,0,0.28)] group-hover:block">
        <div className="mb-1 text-[9px] uppercase tracking-widest text-zinc-500">{label} Guide</div>
        <div className="text-[10px] leading-4 text-zinc-900">{getVitalGuideText(guideKey)}</div>
      </div>
      <p className="text-[11px] text-zinc-300 font-normal text-center">{label}</p>
      <p className={valueClassName}>{value}</p>
    </div>
  );
};

/**
 * 관제 UI에서 119 상징 아이콘을 재사용하기 위한 SVG 컴포넌트입니다.
 */
const Emblem119 = ({ color = "#ef4444", className = "w-6 h-6" }) => (
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M50 5 L90 25 L90 55 C90 75 70 90 50 95 C30 90 10 75 10 55 L10 25 L50 5Z"
      fill="white"
      stroke={color}
      strokeWidth="6"
    />
    <path
      d="M50 15 L82 31 L82 55 C82 71 66 84 50 88 C34 84 18 71 18 55 L18 31 L50 15Z"
      fill={color}
    />
    <text
      x="50"
      y="65"
      fontFamily="Arial, sans-serif"
      fontSize="29"
      fill="white"
      textAnchor="middle"
      fontWeight="400"
    >
      119
    </text>
    <path
      d="M50 25 L55 35 L65 35 L57 42 L60 52 L50 45 L40 52 L43 42 L35 35 L45 35 Z"
      fill="white"
    />
  </svg>
);

/**
 * `BioMetricCard` 컴포넌트를 렌더링합니다.
 */
const BioMetricCard = memo(
  ({
    label,
    value,
    unit,
    icon: Icon,
    color = "text-zinc-400",
    description,
  }: {
    label: string;
    value: string | number | undefined;
    unit?: string;
    icon: any;
    color?: string;
    description: string;
  }) => (
    <div className="relative group">
      <div className="absolute bottom-[calc(100%+8px)] right-0 w-36 p-2 bg-zinc-900/98 border border-zinc-700 text-white rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-[100] backdrop-blur-xl">
        <p className="text-[10px] leading-relaxed font-normal text-zinc-200">
          <span className="block font-normal mb-1 text-white uppercase tracking-widest text-[9px] border-b border-zinc-700 pb-1">
            {label} Info
          </span>
          {description}
        </p>
        <div className="absolute top-full right-4 border-4 border-transparent border-t-zinc-700"></div>
      </div>

      <div className="bg-black/40 py-1.5 px-2.5 rounded-xl border border-zinc-900/50 flex items-center justify-between group-hover:border-zinc-700 transition-colors cursor-help relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-3.5 h-3.5 ${color} opacity-80 shrink-0`} />
          <p className="text-[11px] text-zinc-400 font-normal uppercase tracking-tighter truncate">
            {label}
          </p>
        </div>
        <div className="flex items-baseline gap-0.5 ml-2">
          <span className="text-[14px] font-normal text-white">
            {value ?? "--"}
          </span>
          {unit && (
            <span className="text-[10px] text-zinc-500 font-normal uppercase">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  ),
);

/**
 * 두 위경도 사이의 대권 거리를 km 단위로 계산합니다.
 */
const getHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const SHOWCASE_HOSPITAL_ZONE_RADIUS_KM = 0.9;

type ShowcaseMeasurementClock = {
  heartRate: number;
  oxygenLevel: number;
  bodyTemp: number;
  stressLevel: number;
  steps: number;
  battery: number;
  sensors: number;
  location: number;
};

/**
 * 전시용 시뮬레이션의 상태별 측정 주기를 실제 측정처럼 완만하게 반환합니다.
 */
const getShowcaseMeasurementIntervals = (patient: Patient) => {
  const isEmergency =
    patient.status === PatientStatus.CRITICAL || patient.status === PatientStatus.DANGER;

  if (isEmergency) {
    return {
      heartRate: 8_000,
      oxygenLevel: 10_000,
      bodyTemp: 14_000,
      stressLevel: 18_000,
      steps: 12_000,
      battery: 180_000,
      sensors: 14_000,
      location: 14_000,
    };
  }

  return {
    heartRate: 6_000,
    oxygenLevel: 12_000,
    bodyTemp: 18_000,
    stressLevel: 22_000,
    steps: 10_000,
    battery: 240_000,
    sensors: 16_000,
    location: 14_000,
  };
};

/**
 * 현재 관제는 IP 대략 위치를 제외하고, 실내 Wi-Fi/폰 위치만 실제 지도 표시 대상으로 유지합니다.
 */
const isApproxIpDisplayLocation = (locationSource?: string, locationProvider?: string) => {
  const source = String(locationSource || "").trim();
  const provider = String(locationProvider || "").trim().toLowerCase();
  return (
    source === "IP 위치" ||
    provider === "ipwho.is" ||
    provider === "ipapi.co" ||
    provider === "ipinfo.io"
  );
};

/**
 * 첫 진입 직후에도 정지처럼 보이지 않도록 항목별 다음 측정 시점을 분산 배치합니다.
 */
const createShowcaseMeasurementClock = (
  now: number,
  intervals: ReturnType<typeof getShowcaseMeasurementIntervals>,
): ShowcaseMeasurementClock => ({
  heartRate: now - Math.floor(intervals.heartRate * 0.72),
  oxygenLevel: now - Math.floor(intervals.oxygenLevel * 0.64),
  bodyTemp: now - Math.floor(intervals.bodyTemp * 0.82),
  stressLevel: now - Math.floor(intervals.stressLevel * 0.68),
  steps: now - Math.floor(intervals.steps * 0.78),
  battery: now - Math.floor(intervals.battery * 0.2),
  sensors: now - Math.floor(intervals.sensors * 0.7),
  location: now - Math.floor(intervals.location * 0.76),
});

/**
 * 시뮬레이션 환자인지 확인합니다.
 */
const isSimulationPatient = (patientId?: string) =>
  typeof patientId === "string" && patientId.startsWith("sim:");

/**
 * 구급차 활동 상태에 맞는 말풍선 문구를 반환합니다.
 */
const getAmbulanceBubbleText = (activity?: Ambulance["activity"]) => {
  switch (activity) {
    case "heading_to_patient":
      return "출동중입니다.";
    case "boarding":
      return "환자 조치중입니다.";
    case "transporting_to_hospital":
      return "긴급 이송처리중입니다.";
    case "patrolling":
      return "순찰중입니다.";
    case "returning":
      return "복귀중입니다.";
    default:
      return null;
  }
};

/**
 * 실제 워치 회원인지 확인합니다.
 */
const isPrimaryRealWatchPatient = (patient: Patient) =>
  !patient.isSimulated && String(patient.id).startsWith("user:");

/**
 * 좌측 패널 탭 분기용 완료 환자 여부를 일관되게 판별합니다.
 */
const isCompletedPatient = (patient: Patient) =>
  patient.status === PatientStatus.TRANSPORTED ||
  patient.simulationState === "completed" ||
  patient.speechBubble === "이송완료";

/**
 * 관제 브라우저가 확보한 현재 위치를 저장하는 구조입니다.
 */
type ControlBrowserLocation = {
  lat: number;
  lng: number;
  accuracyM?: number;
  updatedAt: string;
};

/**
 * 서버 위치가 IP fallback뿐일 때 관제 브라우저 위치로 화면 좌표를 보정합니다.
 */
function applyControlBrowserLocationOverride(
  patient: Patient,
  browserLocation: ControlBrowserLocation | null,
) {
  // 관제 브라우저 위치로 대상 위치를 덮어쓰면 접속 도메인/권한에 따라 서로 다른 좌표가 보여 혼란이 생깁니다.
  // 환자 위치는 서버가 보유한 워치/폰 위치만 사용하고, 관제 브라우저 위치는 표시 보정에 쓰지 않습니다.
  return {
    ...patient,
  };
}

/**
 * `App` 컴포넌트를 렌더링합니다.
 */
const App: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [simPatients, setSimPatients] = useState<Patient[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>(() => INITIAL_HOSPITALS.filter(h => h.location.includes("서울")));
  const [ambulances, setAmbulances] = useState<Ambulance[]>(() => buildDistributedAmbulances());
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());
  const assignedAmbulancesRef = useRef<Set<string>>(new Set());
  const arrivalProcessingRef = useRef<Set<string>>(new Set());
  const fetchDataRunningRef = useRef(false);
  const activeDeviceUserIdsRef = useRef<Set<string>>(new Set());
  const disconnectGateRef = useRef<Map<string, { disconnected: boolean; stableOk: number }>>(new Map());
  const didSnapInitialAmbulancesRef = useRef(false);
  const patrolPlannerRunningRef = useRef(false);
  const hospitalRouteRecoveryRunningRef = useRef(false);
  const dispatchRouteRecoveryRunningRef = useRef(false);
  const showcasePlannerRunningRef = useRef(false);
  const [rematchingIds, setRematchingIds] = useState<Set<string>>(new Set());
  const [systemLogs, setSystemLogs] = useState<
    { id: string; text: string; time: string }[]
  >([]);
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "patients"
    | "hospitals"
    | "admin"
  >("dashboard");
  const [selectedCrimeId, setSelectedCrimeId] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAiMatchingEnabled, setIsAiMatchingEnabled] = useState(false);
  const [expandedHospitalIds, setExpandedHospitalIds] = useState<Set<string>>(
    new Set(),
  );
  const [isVitalsExpanded, setIsVitalsExpanded] = useState(false);
  const [patientListTab, setPatientListTab] = useState<
    "waiting" | "transporting" | "completed"
  >("waiting");
  const [patientFilter, setPatientFilter] = useState<
    "all" | "critical" | "danger" | "transporting" | "transported"
  >("all");
  const [hospitalTab, setHospitalTab] = useState<
    "all" | "lv1" | "lv2" | "available"
  >("all");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAlertVoiceEnabled, setIsAlertVoiceEnabled] = useState(true);
  const [controlBrowserLocation, setControlBrowserLocation] =
    useState<ControlBrowserLocation | null>(null);
  const isAlertVoiceEnabledRef = useRef(true);
  const showcaseCaseCursorRef = useRef(0);
  const showcaseMemberCursorRef = useRef(simPatients.length);

  const spokenAlertsRef = useRef<Set<string>>(new Set());
  const wearFilterRef = useRef<
    Map<string, { displayed: boolean | undefined; candidate: boolean | undefined; candidateCount: number }>
  >(new Map());
  const hrFilterRef = useRef<
    Map<string, { displayed: number | null; candidate: number | null; candidateCount: number }>
  >(new Map());
  const hrSeenAtRef = useRef<Map<string, number>>(new Map());

  const applyWearFilter = useCallback((key: string, nextRaw?: boolean, nextHrRaw?: number) => {
    const prev =
      wearFilterRef.current.get(key) ||
      ({ displayed: undefined, candidate: undefined, candidateCount: 0 } as const);
    const lastPositiveAt = hrSeenAtRef.current.get(key) || 0;
    const recentPositiveHr =
      lastPositiveAt > 0 && Date.now() - lastPositiveAt < CONTROL_STALE_THRESHOLD_MS;

    if (typeof nextRaw !== "boolean") return prev.displayed;

    if (nextRaw === true && typeof nextHrRaw === "number" && Number.isFinite(nextHrRaw) && nextHrRaw > 0) {
      const updated = { displayed: true, candidate: undefined, candidateCount: 0 };
      wearFilterRef.current.set(key, updated);
      return true;
    }

    if (nextRaw === false && typeof nextHrRaw === "number" && Number.isFinite(nextHrRaw) && nextHrRaw > 0) {
      const updated = { displayed: true, candidate: undefined, candidateCount: 0 };
      wearFilterRef.current.set(key, updated);
      return true;
    }

    if (nextRaw === false && typeof nextHrRaw === "number" && Number.isFinite(nextHrRaw) && nextHrRaw === 0) {
      if (recentPositiveHr) {
        const updated = { displayed: true, candidate: undefined, candidateCount: 0 };
        wearFilterRef.current.set(key, updated);
        return true;
      }
    }

    if (nextRaw === false && prev.displayed === true && recentPositiveHr) {
      const updated = { displayed: true, candidate: undefined, candidateCount: 0 };
      wearFilterRef.current.set(key, updated);
      return true;
    }

    if (prev.displayed === undefined) {
      const updated = { displayed: nextRaw, candidate: undefined, candidateCount: 0 };
      wearFilterRef.current.set(key, updated);
      return nextRaw;
    }

    if (prev.displayed === nextRaw) {
      const updated = { displayed: prev.displayed, candidate: undefined, candidateCount: 0 };
      wearFilterRef.current.set(key, updated);
      return prev.displayed;
    }

    if (prev.candidate === nextRaw) {
      const nextCount = prev.candidateCount + 1;
      const threshold = nextRaw ? 2 : 5;
      if (nextCount >= threshold) {
        const updated = { displayed: nextRaw, candidate: undefined, candidateCount: 0 };
        wearFilterRef.current.set(key, updated);
        return nextRaw;
      }
      const updated = { displayed: prev.displayed, candidate: nextRaw, candidateCount: nextCount };
      wearFilterRef.current.set(key, updated);
      return prev.displayed;
    }

    const updated = { displayed: prev.displayed, candidate: nextRaw, candidateCount: 1 };
    wearFilterRef.current.set(key, updated);
    return prev.displayed;
  }, []);

  const applyHrFilter = useCallback((key: string, nextRaw: number, isWear?: boolean) => {
    if (isWear === false) {
      hrFilterRef.current.delete(key);
      return 0;
    }

    const next = typeof nextRaw === "number" && Number.isFinite(nextRaw) ? nextRaw : 0;
    if (next <= 0) {
      const prev = hrFilterRef.current.get(key);
      return prev?.displayed ?? 0;
    }

    const updated = { displayed: next, candidate: null, candidateCount: 0 };
    hrFilterRef.current.set(key, updated);
    return next;
  }, []);
  useEffect(() => {
    isAlertVoiceEnabledRef.current = isAlertVoiceEnabled;
    if (!isAlertVoiceEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [isAlertVoiceEnabled]);

  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(
    null,
  );
  const primaryRealWatchId = useMemo(
    () => patients.find((patient) => isPrimaryRealWatchPatient(patient))?.id ?? null,
    [patients],
  );
  const displayPatients = useMemo(() => {
    const realPatients = patients
      .filter((patient) => !patient.isSimulated)
      .map((patient) => applyControlBrowserLocationOverride(patient, controlBrowserLocation));

    return [...realPatients].sort((a, b) => {
      if (a.id === primaryRealWatchId) return -1;
      if (b.id === primaryRealWatchId) return 1;
      if (!!a.isSimulated !== !!b.isSimulated) return a.isSimulated ? 1 : -1;
      return 0;
    });
  }, [patients, simPatients, primaryRealWatchId, controlBrowserLocation]);
  /**
   * 실회원 중 가장 최근 생체 수집 시각을 가진 대상을 기본 선택 후보로 계산합니다.
   */
  const preferredRealPatient = useMemo(() => {
    const realPatients = patients.filter((patient) => !patient.isSimulated);
    if (realPatients.length === 0) {
      return null;
    }

    return [...realPatients].sort((a, b) => {
      const aTime = Date.parse(a.vitals?.lastUpdated || "");
      const bTime = Date.parse(b.vitals?.lastUpdated || "");
      const safeATime = Number.isFinite(aTime) ? aTime : 0;
      const safeBTime = Number.isFinite(bTime) ? bTime : 0;
      return safeBTime - safeATime;
    })[0] ?? null;
  }, [patients]);
  
  const isCrimeMode =
    window.location.port === "7001" ||
    window.location.hostname === "z-cri.goldentime.sbs" ||
    window.location.hostname === "crime.goldentime.sbs";

  /**
   * 관제 브라우저에서 직접 위치를 받아 IP fallback 화면 좌표를 즉시 보정합니다.
   */
  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextLat = position.coords?.latitude;
        const nextLng = position.coords?.longitude;
        if (
          typeof nextLat !== "number" ||
          typeof nextLng !== "number" ||
          !Number.isFinite(nextLat) ||
          !Number.isFinite(nextLng)
        ) {
          return;
        }

        setControlBrowserLocation({
          lat: nextLat,
          lng: nextLng,
          accuracyM:
            typeof position.coords?.accuracy === "number"
              ? position.coords.accuracy
              : undefined,
          updatedAt: new Date(
            typeof position.timestamp === "number"
              ? position.timestamp
              : Date.now(),
          ).toISOString(),
        });
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 12000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  /**
   * 실환자/시뮬레이션 환자를 구분해 동일한 방식으로 업데이트합니다.
   */
  const updatePatientById = useCallback(
    (patientId: string, updater: (patient: Patient) => Patient) => {
      /**
       * `apply` 기능을 처리합니다.
       */
      const apply = (list: Patient[]) =>
        list.map((patient) =>
          patient.id === patientId ? updater(patient) : patient,
        );

      if (isSimulationPatient(patientId)) {
        setSimPatients(apply);
      } else {
        setPatients(apply);
      }

      setSelectedPatient((prev) =>
        prev?.id === patientId ? updater(prev) : prev,
      );
    },
    [],
  );

  /**
   * 전시 시뮬레이션의 좌측 회원 목록이 끊기지 않도록 완료 시 신규 회원 1명을 보충합니다.
   */
  const appendShowcaseReplacementMember = useCallback(() => {
    const sequence = showcaseMemberCursorRef.current;
    showcaseMemberCursorRef.current += 1;
    const nextMember = buildShowcaseMember(sequence);
    setSimPatients((prev) => [...prev, nextMember]);
  }, []);


  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (fetchDataRunningRef.current) {
      return;
    }

    fetchDataRunningRef.current = true;
    try {
      const [caseResp, monitoredResp] = await Promise.all([
        apiService.getEmergencyCases(),
        apiService.getMonitoredUsers({ windowMinutes: 10 }),
      ]);

      const rawCases = caseResp.success ? (caseResp as any).data?.cases : [];
      const transformedCases = Array.isArray(rawCases) ? rawCases.map(transformEmergencyCaseToPatient) : [];

      const caseByUserId = new Map<
        string,
        { patient: Patient; detectedAtMs: number }
      >();
      rawCases.forEach((c: any, idx: number) => {
        if (c.userId?._id) {
          const detectedAtMs =
            typeof c?.detectedAt === "string" || c?.detectedAt instanceof Date
              ? new Date(c.detectedAt).getTime()
              : 0;
          const key = `user:${c.userId._id}`;
          const prevEntry = caseByUserId.get(key);

          // 사용자별로 가장 최근 응급 케이스만 유지합니다.
          if (!prevEntry || detectedAtMs > prevEntry.detectedAtMs) {
            caseByUserId.set(key, {
              patient: transformedCases[idx],
              detectedAtMs,
            });
          }
        }
      });

      const monitoredUsersRaw = monitoredResp.success
        ? (monitoredResp as any).data?.users || (monitoredResp as any).users || []
        : [];
      const transformedMonitored =
        Array.isArray(monitoredUsersRaw) ? monitoredUsersRaw.map(transformMonitoredUserToPatient) : [];
      
      activeDeviceUserIdsRef.current = new Set(
        Array.isArray(monitoredUsersRaw)
          ? monitoredUsersRaw.map((u: any) => String(u?._id || u?.id || '')).filter(Boolean)
          : [],
      );

      setPatients((prev) => {
        const prevById = new Map<string, Patient>(
          prev.map((p) => [String(p.id), p] as const),
        );
        const monitoredIds = new Set<string>(
          transformedMonitored.map((patient) => String(patient.id)),
        );
        
        const mergedMonitoredPatients = transformedMonitored.map((p) => {
          const prevP = prevById.get(String(p.id));
          const activeCaseEntry = caseByUserId.get(String(p.id));
          const activeCase = activeCaseEntry?.patient;
          const monitoredUpdatedMs = p.vitals?.lastUpdated
            ? new Date(p.vitals.lastUpdated).getTime()
            : 0;

          // 현재 모니터링 데이터보다 오래된 테스트/과거 응급 케이스는 화면 상태를 덮지 않게 막습니다.
          if (
            activeCase &&
            activeCase.status !== PatientStatus.NORMAL &&
            activeCase.status !== PatientStatus.PENDING &&
            p.vitals?.isWear !== false &&
            (monitoredUpdatedMs <= 0 || activeCaseEntry.detectedAtMs >= monitoredUpdatedMs)
          ) {
            return {
              ...p,
              status: activeCase.status,
              aiAnalysis: activeCase.aiAnalysis || p.aiAnalysis,
              vitals: { ...p.vitals, ...activeCase.vitals },
            };
          }
          
          // 서버 케이스가 없는데 프론트에서만 남아있는 응급 상태는 일정 시간 후 정상으로 복귀
          if (prevP && prevP.status !== PatientStatus.NORMAL) {
            return p;
          }

          const id = String(p.id);
          const gate = disconnectGateRef.current.get(id) || { disconnected: false, stableOk: 0 };
          const lastUpdatedMs = p.vitals?.lastUpdated ? new Date(p.vitals.lastUpdated).getTime() : 0;
          const candidateDisconnected =
            lastUpdatedMs <= 0 || Date.now() - lastUpdatedMs > CONTROL_STALE_THRESHOLD_MS;

          if (candidateDisconnected) {
            gate.disconnected = true;
            gate.stableOk = 0;
          } else if (gate.disconnected) {
            gate.stableOk += 1;
            if (gate.stableOk >= 2) {
              gate.disconnected = false;
              gate.stableOk = 0;
            }
          }
          disconnectGateRef.current.set(id, gate);

          if (gate.disconnected) {
            if (prevP) {
              const prevHasRenderableLocation =
                Number.isFinite(prevP.lat) &&
                Number.isFinite(prevP.lng) &&
                !isApproxIpDisplayLocation(prevP.locationSource, prevP.locationProvider);
              return {
                ...p,
                status: prevP.status,
                lat: prevHasRenderableLocation ? prevP.lat : p.lat,
                lng: prevHasRenderableLocation ? prevP.lng : p.lng,
                location: prevHasRenderableLocation ? prevP.location : p.location,
                locationSource: prevHasRenderableLocation ? prevP.locationSource : p.locationSource,
                locationProvider: prevHasRenderableLocation ? prevP.locationProvider : p.locationProvider,
                locationUpdatedAt: prevHasRenderableLocation ? prevP.locationUpdatedAt : p.locationUpdatedAt,
                locationAgeMs: prevHasRenderableLocation ? prevP.locationAgeMs : p.locationAgeMs,
                steps: prevP.steps,
                distanceM: prevP.distanceM,
                vitals: {
                  ...p.vitals,
                  ...prevP.vitals,
                },
                aiAnalysis: prevP.aiAnalysis || p.aiAnalysis,
              };
            }

            return {
              ...p,
              steps: 0,
              distanceM: 0,
            };
          }

          const nextHrRaw = typeof p?.vitals?.heartRate === "number" ? p.vitals.heartRate : undefined;
          if (typeof nextHrRaw === "number" && Number.isFinite(nextHrRaw) && nextHrRaw > 0) {
            hrSeenAtRef.current.set(String(p.id), Date.now());
          }
          const stableWear = applyWearFilter(String(p.id), p.vitals?.isWear, nextHrRaw);

          if (typeof nextHrRaw === "number") {
            const filtered = stableWear === false ? 0 : applyHrFilter(String(p.id), nextHrRaw, stableWear);
            p = {
              ...p,
              vitals: {
                ...p.vitals,
                heartRate: filtered,
                isWear: stableWear,
              },
            };
          } else {
            p = {
              ...p,
              vitals: {
                ...p.vitals,
                isWear: stableWear,
              },
            };
          }

          if (prevP && stableWear !== false) {
            const prevHasRenderableLocation =
              Number.isFinite(prevP.lat) &&
              Number.isFinite(prevP.lng) &&
              !isApproxIpDisplayLocation(prevP.locationSource, prevP.locationProvider);
            if (
              (!Number.isFinite(p.lat) || !Number.isFinite(p.lng) || p.location === "GPS 확인중") &&
              prevHasRenderableLocation
            ) {
              p = {
                ...p,
                lat: prevP.lat,
                lng: prevP.lng,
                location: prevP.location,
                locationSource: prevP.locationSource,
                locationProvider: prevP.locationProvider,
                locationUpdatedAt: prevP.locationUpdatedAt,
                locationAgeMs: prevP.locationAgeMs,
              };
            }
            if (
              (typeof p.vitals?.heartRate !== "number" || p.vitals.heartRate <= 0) &&
              typeof prevP.vitals?.heartRate === "number" &&
              prevP.vitals.heartRate > 0
            ) {
              p = { ...p, vitals: { ...p.vitals, heartRate: prevP.vitals.heartRate } };
            }
            if (
              (typeof p.vitals?.oxygenLevel !== "number" || p.vitals.oxygenLevel <= 0) &&
              typeof prevP.vitals?.oxygenLevel === "number" &&
              prevP.vitals.oxygenLevel > 0
            ) {
              p = { ...p, vitals: { ...p.vitals, oxygenLevel: prevP.vitals.oxygenLevel } };
            }
            if (
              (typeof p.vitals?.bodyTemp !== "number" || p.vitals.bodyTemp <= 0) &&
              typeof prevP.vitals?.bodyTemp === "number" &&
              prevP.vitals.bodyTemp > 0
            ) {
              p = { ...p, vitals: { ...p.vitals, bodyTemp: prevP.vitals.bodyTemp } };
            }
            if (typeof (p as any).batteryLevel !== "number" && typeof (prevP as any).batteryLevel === "number") {
              p = { ...(p as any), batteryLevel: (prevP as any).batteryLevel };
            }
            if (!(p as any).acceleration && (prevP as any).acceleration) {
              p = { ...(p as any), acceleration: (prevP as any).acceleration };
            }
            if (!(p as any).gyroscope && (prevP as any).gyroscope) {
              p = { ...(p as any), gyroscope: (prevP as any).gyroscope };
            }
            if (!(p as any).barometer && (prevP as any).barometer) {
              p = { ...(p as any), barometer: (prevP as any).barometer };
            }
          }

          if (prevP) {
            const prevUpdatedMs = prevP.vitals?.lastUpdated
              ? new Date(prevP.vitals.lastUpdated).getTime()
              : 0;
            const nextUpdatedMs = p.vitals?.lastUpdated
              ? new Date(p.vitals.lastUpdated).getTime()
              : 0;

            if (prevUpdatedMs > nextUpdatedMs) {
              const prevHasRenderableLocation =
                Number.isFinite(prevP.lat) &&
                Number.isFinite(prevP.lng) &&
                !isApproxIpDisplayLocation(prevP.locationSource, prevP.locationProvider);
              return {
                ...p,
                status: prevP.status,
                lat: prevHasRenderableLocation ? prevP.lat : p.lat,
                lng: prevHasRenderableLocation ? prevP.lng : p.lng,
                location: prevHasRenderableLocation ? prevP.location : p.location,
                locationSource: prevHasRenderableLocation ? prevP.locationSource : p.locationSource,
                locationProvider: prevHasRenderableLocation ? prevP.locationProvider : p.locationProvider,
                locationUpdatedAt: prevHasRenderableLocation ? prevP.locationUpdatedAt : p.locationUpdatedAt,
                locationAgeMs: prevHasRenderableLocation ? prevP.locationAgeMs : p.locationAgeMs,
                vitals: {
                  ...p.vitals,
                  ...prevP.vitals,
                },
                aiAnalysis: prevP.aiAnalysis || p.aiAnalysis,
              };
            }
          }

          return p;
        });

        /**
         * 최근 수집 목록에서 빠진 회원도 활성 응급 케이스가 있으면 관제 목록에 유지합니다.
         */
        const caseOnlyPatients = Array.from(caseByUserId.entries())
          .filter(([userKey]) => !monitoredIds.has(userKey))
          .map(([userKey, entry]) => {
            const prevPatient = prevById.get(userKey);
            const casePatient = {
              ...entry.patient,
              id: userKey,
            };

            if (!prevPatient) {
              return casePatient;
            }

            const prevHasRenderableLocation =
              Number.isFinite(prevPatient.lat) &&
              Number.isFinite(prevPatient.lng) &&
              !isApproxIpDisplayLocation(prevPatient.locationSource, prevPatient.locationProvider);

            return {
              ...prevPatient,
              ...casePatient,
              lat: Number.isFinite(casePatient.lat)
                ? casePatient.lat
                : prevHasRenderableLocation
                  ? prevPatient.lat
                  : casePatient.lat,
              lng: Number.isFinite(casePatient.lng)
                ? casePatient.lng
                : prevHasRenderableLocation
                  ? prevPatient.lng
                  : casePatient.lng,
              location:
                casePatient.location && casePatient.location !== "위치 미확인"
                  ? casePatient.location
                  : prevHasRenderableLocation
                    ? prevPatient.location
                    : casePatient.location,
              locationSource: casePatient.locationSource || prevPatient.locationSource,
              locationProvider: casePatient.locationProvider || prevPatient.locationProvider,
              locationUpdatedAt: casePatient.locationUpdatedAt || prevPatient.locationUpdatedAt,
              locationAgeMs:
                typeof casePatient.locationAgeMs === "number"
                  ? casePatient.locationAgeMs
                  : prevPatient.locationAgeMs,
              aiAnalysis: casePatient.aiAnalysis || prevPatient.aiAnalysis,
              vitals: {
                ...prevPatient.vitals,
                ...casePatient.vitals,
              },
            };
          });

        return [...mergedMonitoredPatients, ...caseOnlyPatients];
      });

    } catch (error) {
      console.error("❌ 데이터 로드 실패:", error);
    } finally {
      fetchDataRunningRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 관제 소켓으로 들어오는 최신 생체값을 현재 환자 목록에 즉시 덮어씌웁니다.
  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    if (!token) {
      socketService.disconnect();
      return undefined;
    }

    socketService.connect(token, "controller");

    const socket = socketService.getSocket();
    if (!socket) return;

    /**
     * `onBiometric` 동작을 처리합니다.
     */
    const onBiometric = (payload: any) => {
      const userId = String(payload?.userId || "");
      const b = payload?.biometricData || {};
      if (!userId) return;

      const incomingHr = typeof b?.heartRate === "number" ? b.heartRate : undefined;
      if (typeof incomingHr === "number" && Number.isFinite(incomingHr) && incomingHr > 0) {
        hrSeenAtRef.current.set(`user:${userId}`, Date.now());
      }
      const stableWear = applyWearFilter(
        `user:${userId}`,
        typeof b?.isWear === "boolean" ? b.isWear : undefined,
        incomingHr,
      );

      const collectedAtRaw = b?.collectedAt;
      const lastUpdated = collectedAtRaw
        ? new Date(collectedAtRaw).toISOString()
        : new Date().toISOString();
      const nextLocationMeta =
        b?.locationMeta && typeof b.locationMeta === "object" ? b.locationMeta : undefined;
      const nextLat = typeof b?.location?.lat === "number" ? b.location.lat : undefined;
      const nextLng = typeof b?.location?.lng === "number" ? b.location.lng : undefined;

      setPatients((prev) =>
        prev.map((p) => {
          if (String(p.id) !== `user:${userId}`) return p;

          const prevVitals = p.vitals || ({} as any);
          const incomingHr =
            typeof b?.heartRate === "number" && Number.isFinite(b.heartRate) && b.heartRate > 0
              ? b.heartRate
              : undefined;
          const nextHrRaw = typeof incomingHr === "number" ? incomingHr : prevVitals?.heartRate;
          const nextHr =
            stableWear === false
              ? 0
              : typeof nextHrRaw === "number" && Number.isFinite(nextHrRaw) && nextHrRaw > 0
                ? applyHrFilter(String(p.id), nextHrRaw, stableWear)
                : typeof prevVitals?.heartRate === "number" && prevVitals.heartRate > 0
                  ? prevVitals.heartRate
                  : undefined;
          const incomingSpO2 = typeof b?.spO2 === "number" ? b.spO2 : undefined;
          const nextSpO2 =
            stableWear === false
              ? 0
              : typeof incomingSpO2 === "number" && Number.isFinite(incomingSpO2) && incomingSpO2 >= 70 && incomingSpO2 <= 100
                ? incomingSpO2
                : typeof prevVitals?.oxygenLevel === "number" && prevVitals.oxygenLevel > 0
                  ? prevVitals.oxygenLevel
                  : undefined;
          const nextTemp =
            stableWear === false
              ? 0
              : typeof b?.bodyTemperature === "number" && Number.isFinite(b.bodyTemperature) && b.bodyTemperature >= 20 && b.bodyTemperature <= 45
                ? b.bodyTemperature
                : typeof prevVitals?.bodyTemp === "number" && prevVitals.bodyTemp > 0
                  ? prevVitals.bodyTemp
                  : undefined;
          const nextStress =
            typeof b?.stressLevel === "number" ? b.stressLevel : p.vitals?.stressLevel;
          const nextSteps = typeof b?.steps === "number" ? b.steps : (p as any).steps;
          const nextBattery =
            stableWear === false
              ? 0
              : typeof b?.batteryLevel === "number" && Number.isFinite(b.batteryLevel) && b.batteryLevel >= 1 && b.batteryLevel <= 100
                ? b.batteryLevel
                : typeof (p as any).batteryLevel === "number"
                  ? (p as any).batteryLevel
                  : undefined;
          const nextAcc = b?.acceleration && typeof b.acceleration === "object" ? b.acceleration : (p as any).acceleration;
          const nextGyro = b?.gyroscope && typeof b.gyroscope === "object" ? b.gyroscope : (p as any).gyroscope;
          const nextBaro = b?.barometer && typeof b.barometer === "object" ? b.barometer : (p as any).barometer;
          // 소켓 위치 갱신은 좌표가 숫자로 내려오면 지도 포지셔닝에 그대로 사용합니다.
          const nextLocationSourceCode =
            typeof nextLocationMeta?.source === "string" ? nextLocationMeta.source : undefined;
          const nextLocationProviderCode =
            typeof nextLocationMeta?.provider === "string" ? nextLocationMeta.provider.trim().toLowerCase() : "";
          const locationUnavailable =
            nextLocationSourceCode === "unavailable" ||
            nextLocationSourceCode === "ip_position" ||
            nextLocationProviderCode === "ipwho.is" ||
            nextLocationProviderCode === "ipapi.co" ||
            nextLocationProviderCode === "ipinfo.io";
          const hasPrevValidLocation = Number.isFinite(p.lat) && Number.isFinite(p.lng);
          const lat =
            locationUnavailable
              ? Number.NaN
              : typeof nextLat === "number"
                ? nextLat
                : p.lat;
          const lng =
            locationUnavailable
              ? Number.NaN
              : typeof nextLng === "number"
                ? nextLng
                : p.lng;
          // 실시간 소켓 갱신에서도 초기 로드와 같은 위치 출처 라벨을 유지합니다.
          const locationSourceMap: Record<string, string> = {
            watch_gps: "워치 GPS",
            phone_gps: "핸드폰 GPS",
            wifi_position: "Wi-Fi 위치",
            cell_position: "기지국 위치",
            ip_position: "IP 위치",
            mobile_app: "모바일 위치",
            phone_fallback: "폰 백업 위치",
            recent_cache: "최근 캐시",
            last_biometric: "직전 저장 위치",
            unavailable: "위치 미확인",
          };
          const nextLocationSource =
            typeof nextLocationMeta?.source === "string"
              ? locationSourceMap[nextLocationMeta.source] || p.locationSource
              : p.locationSource;
          const nextLocationProvider =
            typeof nextLocationMeta?.provider === "string"
              ? nextLocationMeta.provider
              : p.locationProvider;
          const nextLocationUpdatedAt =
            typeof nextLocationMeta?.timestamp === "string"
              ? nextLocationMeta.timestamp
              : p.locationUpdatedAt;
          const nextLocationAgeMs =
            typeof nextLocationMeta?.ageMs === "number"
              ? nextLocationMeta.ageMs
              : p.locationAgeMs;
          const nextLocationText =
            Number.isFinite(lat) && Number.isFinite(lng)
              ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
              : "GPS 확인중";

          const nextStatus =
            stableWear === false
              ? PatientStatus.CAUTION
              : p.status;

          return {
            ...p,
            status: nextStatus,
            lat,
            lng,
            location: nextLocationText,
            locationSource: nextLocationSource,
            locationProvider: nextLocationProvider,
            locationUpdatedAt: nextLocationUpdatedAt,
            locationAgeMs: nextLocationAgeMs,
            steps: typeof nextSteps === "number" ? nextSteps : (p as any).steps,
            batteryLevel: typeof nextBattery === "number" ? nextBattery : (p as any).batteryLevel,
            acceleration: nextAcc,
            gyroscope: nextGyro,
            barometer: nextBaro,
            vitals: {
              ...p.vitals,
              heartRate:
                stableWear === false
                  ? 0
                  : typeof nextHr === "number"
                    ? nextHr
                    : prevVitals?.heartRate,
              oxygenLevel:
                stableWear === false
                  ? 0
                  : typeof nextSpO2 === "number"
                    ? nextSpO2
                    : prevVitals?.oxygenLevel,
              bodyTemp:
                stableWear === false
                  ? 0
                  : typeof nextTemp === "number"
                    ? nextTemp
                    : prevVitals?.bodyTemp,
              stressLevel: stableWear === false ? 0 : typeof nextStress === "number" ? nextStress : p.vitals?.stressLevel,
              lastUpdated,
              isWear: stableWear,
            },
          };
        }),
      );
    };

    socket.on("biometric_data_updated", onBiometric);

    return () => {
      socket.off("biometric_data_updated", onBiometric);
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      // 숨김 탭에서는 소켓 최신값이 유지되므로 무거운 전체 동기화 폴링은 잠시 멈춥니다.
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      fetchData();
    }, 1500);

    return () => window.clearInterval(interval);
  }, [fetchData]);

  // 시뮬레이션 로직 제거됨 (실제 데이터 연동)
  /*
  useEffect(() => {
    // 10초마다 랜덤 환자 발생 로직 제거됨
  }, []);
  */

  const ambulancesRef = useRef(ambulances);
  const patientsRef = useRef(displayPatients);
  const simPatientsRef = useRef(simPatients);
  const showcaseMeasurementClockRef = useRef<Record<string, ShowcaseMeasurementClock>>({});
  const dispatchRouteRecoveryFailCountRef = useRef<Record<string, number>>({});

  /**
   * 초기 랜덤 배치 차량을 가장 가까운 도로 위로 이동시킵니다.
   */
  useEffect(() => {
    if (didSnapInitialAmbulancesRef.current) return;
    didSnapInitialAmbulancesRef.current = true;
    let cancelled = false;

    /**
     * `snapInitialAmbulancesToRoad` 기능을 처리합니다.
     */
    const snapInitialAmbulancesToRoad = async () => {
      const initialAmbulances = ambulancesRef.current;
      
      // OSRM 서버 과부하 및 타임아웃 방지를 위해 청크 단위로 나누어 스냅 처리
      const chunkSize = 10;
      const snappedAmbulances: Ambulance[] = [];
      
      for (let i = 0; i < initialAmbulances.length; i += chunkSize) {
        if (cancelled) break;
        const chunk = initialAmbulances.slice(i, i + chunkSize);
        const chunkSnapped = await Promise.all(
          chunk.map(async (ambulance) => {
            try {
              const sourcePoint =
                typeof ambulance.baseLat === "number" &&
                typeof ambulance.baseLng === "number"
                  ? { lat: ambulance.baseLat, lng: ambulance.baseLng }
                  : { lat: ambulance.lat, lng: ambulance.lng };
              const snappedCandidate = await snapPointToRoad(sourcePoint, 7);
              return {
                ...ambulance,
                lat: snappedCandidate.lat,
                lng: snappedCandidate.lng,
                baseLat: snappedCandidate.lat,
                baseLng: snappedCandidate.lng,
              };
            } catch (e) {
              const safePoint = getSafeRoadFallbackPoint(Number(ambulance.id.replace("a", "")) || 0);
              const nextBaseLat =
                typeof ambulance.baseLat === "number" && Number.isFinite(ambulance.baseLat)
                  ? ambulance.baseLat
                  : safePoint.lat;
              const nextBaseLng =
                typeof ambulance.baseLng === "number" && Number.isFinite(ambulance.baseLng)
                  ? ambulance.baseLng
                  : safePoint.lng;
              return {
                ...ambulance,
                lat: safePoint.lat,
                lng: safePoint.lng,
                baseLat: nextBaseLat,
                baseLng: nextBaseLng,
              };
            }
          })
        );
        snappedAmbulances.push(...chunkSnapped);
        
        setAmbulances([
          ...snappedAmbulances,
          ...initialAmbulances.slice(i + chunkSize).map((ambulance) => {
            const safePoint = getSafeRoadFallbackPoint(
              Number(ambulance.id.replace("a", "")) || 0,
            );
            return {
              ...ambulance,
              lat: safePoint.lat,
              lng: safePoint.lng,
              baseLat: ambulance.baseLat,
              baseLng: ambulance.baseLng,
            };
          }),
        ]);
        
        await new Promise(resolve => setTimeout(resolve, 120));
      }

      if (!cancelled) {
        setAmbulances(snappedAmbulances);
      }
    };

    snapInitialAmbulancesToRoad();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 전시용 시뮬레이션이 병원 바로 앞에서 발생하지 않도록 병원권역 여부를 판별합니다.
   */
  const getNearestShowcaseHospital = useCallback(
    (lat: number, lng: number) => {
      let nearestHospital: Hospital | null = null;
      let nearestDistanceKm = Number.POSITIVE_INFINITY;

      hospitals.forEach((hospital) => {
        if (!Number.isFinite(hospital.lat) || !Number.isFinite(hospital.lng)) return;
        const distanceKm = getHaversineDistance(lat, lng, hospital.lat, hospital.lng);
        if (distanceKm < nearestDistanceKm) {
          nearestHospital = hospital;
          nearestDistanceKm = distanceKm;
        }
      });

      return nearestHospital
        ? { hospital: nearestHospital, distanceKm: nearestDistanceKm }
        : null;
    },
    [hospitals],
  );

  /**
   * 전시용 시뮬레이션이 병원 바로 앞에서 발생하지 않도록 병원권역 여부를 판별합니다.
   */
  const isInsideShowcaseHospitalZone = useCallback(
    (lat: number, lng: number) =>
      (getNearestShowcaseHospital(lat, lng)?.distanceKm ?? Number.POSITIVE_INFINITY) <=
      SHOWCASE_HOSPITAL_ZONE_RADIUS_KM,
    [getNearestShowcaseHospital],
  );

  /**
   * 병원권역에 걸린 시뮬레이션 회원을 일반 도로/건물 방향의 안전 좌표로 재배치합니다.
   */
  const getShowcaseSafePoint = useCallback(
    (lat: number, lng: number) => {
      const nearest = getNearestShowcaseHospital(lat, lng);
      if (!nearest) {
        return null;
      }

      const hospitalLat = nearest.hospital.lat;
      const hospitalLng = nearest.hospital.lng;
      const rawVectorLat = lat - hospitalLat;
      const rawVectorLng = lng - hospitalLng;
      const vectorNorm =
        Math.hypot(rawVectorLat, rawVectorLng) > 0.000001
          ? Math.hypot(rawVectorLat, rawVectorLng)
          : 1;
      const unitLat = rawVectorLat / vectorNorm;
      const unitLng = rawVectorLng / vectorNorm;
      const lngScale = Math.max(0.2, Math.cos((hospitalLat * Math.PI) / 180));
      const rotationAngles = [0, 25, -25, 50, -50, 90, -90, 135, -135, 180];
      const candidateDistancesKm = [0.8, 1.0, 1.2, 1.5];

      for (const distanceKm of candidateDistancesKm) {
        for (const angle of rotationAngles) {
          const radians = (angle * Math.PI) / 180;
          const rotatedLat =
            unitLat * Math.cos(radians) - unitLng * Math.sin(radians);
          const rotatedLng =
            unitLat * Math.sin(radians) + unitLng * Math.cos(radians);
          const candidateLat = hospitalLat + (distanceKm / 111) * rotatedLat;
          const candidateLng =
            hospitalLng + (distanceKm / (111 * lngScale)) * rotatedLng;

          if (!isInsideShowcaseHospitalZone(candidateLat, candidateLng)) {
            return { lat: candidateLat, lng: candidateLng };
          }
        }
      }

      return null;
    },
    [getNearestShowcaseHospital, isInsideShowcaseHospitalZone],
  );

  /**
   * 환자 실제 좌표와 별개로 출동 중 재사용할 고정 목표 좌표를 계산합니다.
   */
  const getPatientDispatchTarget = useCallback(
    (patient: Patient) => {
      if (
        Number.isFinite(patient.dispatchTargetLat) &&
        Number.isFinite(patient.dispatchTargetLng)
      ) {
        return {
          lat: patient.dispatchTargetLat as number,
          lng: patient.dispatchTargetLng as number,
        };
      }

      if (
        patient.isSimulated &&
        isInsideShowcaseHospitalZone(patient.lat, patient.lng)
      ) {
        return (
          getShowcaseSafePoint(patient.lat, patient.lng) || {
            lat: patient.lat,
            lng: patient.lng,
          }
        );
      }

      return { lat: patient.lat, lng: patient.lng };
    },
    [getShowcaseSafePoint, isInsideShowcaseHospitalZone],
  );

  /**
   * 초기 시뮬레이션 회원이 병원권역 안에 있으면 응급 발생 전에 일반 도로 쪽으로 재배치합니다.
   */
  useEffect(() => {
    setSimPatients((prev) => {
      let hasChanges = false;

      const next = prev.map((patient) => {
        if (
          patient.simulationState !== "walking" ||
          patient.matchedAmbulanceId ||
          !isInsideShowcaseHospitalZone(patient.lat, patient.lng)
        ) {
          return patient;
        }

        const safePoint = getShowcaseSafePoint(patient.lat, patient.lng);
        if (!safePoint) {
          return patient;
        }

        hasChanges = true;
        return {
          ...patient,
          lat: safePoint.lat,
          lng: safePoint.lng,
          location: patient.location.includes("생활도로")
            ? patient.location
            : `${patient.location} 생활도로`,
          simPath: undefined,
          simPathIndex: undefined,
        };
      });

      return hasChanges ? next : prev;
    });
  }, [getShowcaseSafePoint, isInsideShowcaseHospitalZone]);

  // interval/비동기 콜백이 최신 상태를 읽을 수 있도록 ref를 계속 동기화합니다.
  useEffect(() => {
    ambulancesRef.current = ambulances;
    patientsRef.current = displayPatients;
    simPatientsRef.current = simPatients;
  }, [ambulances, displayPatients, simPatients]);

  /**
   * 환자 이송 완료 시 환자 상태와 차량 복귀 경로를 함께 정리합니다.
   */
  const handlePatientArrival = async (
    patientId: string,
    ambulanceId?: string,
    currentPosition?: { lat: number; lng: number },
  ) => {
    const arrivedPatient = patientsRef.current.find((p) => p.id === patientId);
    const shouldAppendShowcaseMember =
      arrivedPatient?.isSimulated === true &&
      arrivedPatient.simulationState !== "completed";
    const fallbackAmbulanceId =
      ambulanceId ||
      patientsRef.current.find((p) => p.id === patientId)?.matchedAmbulanceId;
    const ambulance = fallbackAmbulanceId
      ? ambulancesRef.current.find((amb) => amb.id === fallbackAmbulanceId)
      : undefined;
    const arrivalKey = `${patientId}:${fallbackAmbulanceId || "none"}`;
    // 동일 환자/차량 조합의 중복 완료 처리를 막기 위해 처리 중 키를 잠급니다.
    if (arrivalProcessingRef.current.has(arrivalKey)) {
      return;
    }
    arrivalProcessingRef.current.add(arrivalKey);

    const baseDestination =
      ambulance &&
      typeof ambulance.baseLat === "number" &&
      typeof ambulance.baseLng === "number"
        ? { lat: ambulance.baseLat, lng: ambulance.baseLng }
        : undefined;
    const returnStart =
      currentPosition ||
      (ambulance ? { lat: ambulance.lat, lng: ambulance.lng } : undefined);
    const returnPath =
      returnStart && baseDestination
        ? await fetchRoadRoute(returnStart, baseDestination)
        : undefined;

    try {
      if (fallbackAmbulanceId) {
        assignedAmbulancesRef.current.delete(fallbackAmbulanceId);
        setAmbulances((prevAmbs) =>
          prevAmbs.map((amb) =>
            amb.id === fallbackAmbulanceId
              ? {
                  ...amb,
                  lat: currentPosition?.lat ?? amb.lat,
                  lng: currentPosition?.lng ?? amb.lng,
                  status:
                    returnPath && returnPath.length > 1
                      ? AmbulanceStatus.BUSY
                      : AmbulanceStatus.AVAILABLE,
                  activity:
                    returnPath && returnPath.length > 1 ? "returning" : undefined,
                  patrolPath:
                    returnPath && returnPath.length > 1 ? returnPath : undefined,
                  patrolIndex: returnPath && returnPath.length > 1 ? 0 : undefined,
                  targetPatientId: undefined,
                  targetHospitalId: undefined,
                  boardingCountdown: undefined,
                  dispatchPathLen: undefined,
                  targetSpeedKmh: undefined,
                  speechBubble:
                    returnPath && returnPath.length > 1
                      ? getAmbulanceBubbleText("returning")
                      : null,
                  sirenEnabled: false,
                  currentSpeedKmh: 0,
                }
              : amb,
          ),
        );
      }

      updatePatientById(patientId, (patient) => ({
        ...patient,
        matchedAmbulanceId: undefined,
        status: PatientStatus.TRANSPORTED,
        speechBubble: "이송완료",
        simulationState: patient.isSimulated ? "completed" : patient.simulationState,
      }));
      if (shouldAppendShowcaseMember) {
        appendShowcaseReplacementMember();
      }
      addLog(`🏁 이송 완료: 환자가 병원에 안전하게 인계되었습니다.`);
    } finally {
      arrivalProcessingRef.current.delete(arrivalKey);
    }
  };

  const handlePatientArrivalRef = useRef(handlePatientArrival);
  // 패트롤 타이머 안에서도 최신 완료 핸들러를 읽도록 ref를 갱신합니다.
  useEffect(() => {
    handlePatientArrivalRef.current = handlePatientArrival;
  }, [handlePatientArrival]);

  useEffect(() => {
    // 6-1. 패트롤 경로 부여
    const patrolTimer = setInterval(async () => {
      if (patrolPlannerRunningRef.current) return;
      patrolPlannerRunningRef.current = true;
      try {
      if (processingRef.current.size > 0) return;
      if (Date.now() < osrmCircuitOpenUntilMs) return;
      const currentAmbs = ambulancesRef.current;
      const hasActiveEmergency = patientsRef.current.some(
        (patient) =>
          (patient.status === PatientStatus.CRITICAL ||
            patient.status === PatientStatus.DANGER) &&
          patient.status !== PatientStatus.TRANSPORTED,
      );
      if (hasActiveEmergency) return;
      const movingBackgroundCount = currentAmbs.filter(
        (amb) =>
          amb.activity === "patrolling" ||
          amb.activity === "returning" ||
          (amb.activity === "transporting_to_hospital" && !amb.targetPatientId),
      ).length;
      const idleAmbs = currentAmbs.filter(
        (a) => a.status === AmbulanceStatus.AVAILABLE && !a.patrolPath,
      );

      if (idleAmbs.length === 0) return;
      // 백그라운드 차량 일부만 움직이게 유지해 화면이 비어 보이지 않되 과밀 이동도 피합니다.
      const desiredMovingCount = Math.min(35, Math.max(20, Math.floor(currentAmbs.length * 0.25)));
      const neededCount = Math.max(0, desiredMovingCount - movingBackgroundCount);
      if (neededCount === 0) return;
      const targets = idleAmbs.sort(() => 0.5 - Math.random()).slice(0, neededCount);

      for (const amb of targets) {
        const baseLat = typeof amb.baseLat === "number" ? amb.baseLat : amb.lat;
        const baseLng = typeof amb.baseLng === "number" ? amb.baseLng : amb.lng;
        const intendedTarget = {
          lat: baseLat + (Math.random() - 0.5) * 0.012,
          lng: baseLng + (Math.random() - 0.5) * 0.012,
        };
        let patrolTarget = intendedTarget;
        try {
          patrolTarget = await snapPointToRoad(intendedTarget, 2);
        } catch {
          patrolTarget = intendedTarget;
        }

        const points = await fetchPatrolRoadRoute(
          { lat: amb.lat, lng: amb.lng },
          patrolTarget,
        );
        if (points && points.length >= 4) {
          setAmbulances((prev) =>
            prev.map((a) =>
              a.id === amb.id
                ? {
                    ...a,
                    lat: points[0].lat,
                    lng: points[0].lng,
                    patrolPath: points,
                    patrolIndex: 0,
                    activity: "patrolling",
                    targetSpeedKmh: undefined,
                    speechBubble: getAmbulanceBubbleText("patrolling"),
                    sirenEnabled: false,
                    currentSpeedKmh: getAmbulanceSpeedKmh("patrolling", a.currentSpeedKmh),
                  }
                : a,
            ),
          );
        }
      }
      } finally {
        patrolPlannerRunningRef.current = false;
      }
    }, 3000);

    // 6-1.5. 전시용 배경 이송 경로 부여
    const backgroundTransportTimer = setInterval(async () => {
      // 실제 환자 출동/이송 시뮬레이션과 충돌하므로 배경 이송은 중지합니다.
      return;
      if (processingRef.current.size > 0) return;
      const currentAmbs = ambulancesRef.current;
      const hasActiveEmergency = patientsRef.current.some(
        (patient) =>
          (patient.status === PatientStatus.CRITICAL ||
            patient.status === PatientStatus.DANGER) &&
          patient.status !== PatientStatus.TRANSPORTED,
      );
      if (hasActiveEmergency) return;
      const backgroundBusyCount = currentAmbs.filter(
        (amb) => amb.activity === "transporting_to_hospital" && !amb.targetPatientId,
      ).length;
      if (backgroundBusyCount >= 6) return; // 기존 4대에서 6대로 상향

      const availableAmbs = currentAmbs.filter(
        (amb) => amb.status === AmbulanceStatus.AVAILABLE && !amb.patrolPath,
      );
      if (availableAmbs.length === 0 || hospitals.length === 0) return;

      const targets = availableAmbs
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(3, 6 - backgroundBusyCount)); // 한 번에 최대 3대씩 배정

      for (const amb of targets) {
        const candidateHospitals = [...hospitals]
          .filter((hospital) => Number.isFinite(hospital.lat) && Number.isFinite(hospital.lng))
          .sort(
            (prev, curr) =>
              getHaversineDistance(amb.lat, amb.lng, prev.lat, prev.lng) -
              getHaversineDistance(amb.lat, amb.lng, curr.lat, curr.lng),
          )
          .slice(0, 5);
        const selectedHospital =
          candidateHospitals[Math.floor(Math.random() * candidateHospitals.length)] || null;
        if (!selectedHospital) continue;

        const route = await fetchRoadRoute(
          { lat: amb.lat, lng: amb.lng },
          { lat: selectedHospital.lat, lng: selectedHospital.lng },
        );
        if (route.length < 2) continue;

        setAmbulances((prev) =>
          prev.map((currentAmbulance) =>
            currentAmbulance.id === amb.id
              ? {
                  ...currentAmbulance,
                  lat: route[0].lat,
                  lng: route[0].lng,
                  status: AmbulanceStatus.BUSY,
                  patrolPath: route,
                  patrolIndex: 0,
                  activity: "transporting_to_hospital",
                  targetHospitalId: selectedHospital.id,
                  targetSpeedKmh: undefined,
                  speechBubble: "다른 환자 이송중입니다.",
                  sirenEnabled: false,
                  currentSpeedKmh: getAmbulanceSpeedKmh(
                    "transporting_to_hospital",
                    currentAmbulance.currentSpeedKmh,
                  ),
                }
              : currentAmbulance,
          ),
        );
      }
    }, 7000);

    /**
     * 탑승 완료 후 병원 경로가 비어 멈춘 차량의 병원 경로를 재생성합니다.
     */
    const hospitalRouteRecoveryTimer = setInterval(async () => {
      if (hospitalRouteRecoveryRunningRef.current) return;
      hospitalRouteRecoveryRunningRef.current = true;
      try {
      const recoveringAmb = ambulancesRef.current.find(
        (amb) =>
          amb.activity === "boarding" &&
          amb.boardingCountdown !== undefined &&
          amb.boardingCountdown <= 0 &&
          (!amb.hospitalPath || amb.hospitalPath.length < 2) &&
          !!amb.targetHospitalId,
      );

      if (!recoveringAmb) return;

      const targetHospital = hospitals.find(
        (hospital) => hospital.id === recoveringAmb.targetHospitalId,
      );
      if (!targetHospital) return;

      let recoveredHospitalRoute: { lat: number; lng: number }[] = [];
      try {
        const quickRouteController = new AbortController();
        const quickTimeoutId = setTimeout(
          () => quickRouteController.abort(),
          900,
        );
        const quickRoute = await fetchRoadRouteQuick(
          { lat: recoveringAmb.lat, lng: recoveringAmb.lng },
          { lat: targetHospital.lat, lng: targetHospital.lng },
          quickRouteController.signal,
        );
        clearTimeout(quickTimeoutId);
        recoveredHospitalRoute = quickRoute;
      } catch {
        recoveredHospitalRoute = [];
      }

      if (recoveredHospitalRoute.length < 2) {
        try {
          const fallbackRouteController = new AbortController();
          const fallbackTimeoutId = setTimeout(
            () => fallbackRouteController.abort(),
            3500,
          );
          recoveredHospitalRoute = await fetchRoadRoute(
            { lat: recoveringAmb.lat, lng: recoveringAmb.lng },
            { lat: targetHospital.lat, lng: targetHospital.lng },
            fallbackRouteController.signal,
          );
          clearTimeout(fallbackTimeoutId);
        } catch {
          recoveredHospitalRoute = [];
        }
      }

      if (recoveredHospitalRoute.length < 2) return;

      setAmbulances((prev) =>
        prev.map((amb) =>
          amb.id === recoveringAmb.id
            ? {
                ...amb,
                lat: recoveredHospitalRoute[0].lat,
                lng: recoveredHospitalRoute[0].lng,
                status: AmbulanceStatus.BUSY,
                patrolPath: recoveredHospitalRoute,
                hospitalPath: undefined,
                patrolIndex: 0,
                dispatchPathLen: undefined,
                activity: "transporting_to_hospital",
                boardingCountdown: undefined,
                targetSpeedKmh: undefined,
                speechBubble: getAmbulanceBubbleText("transporting_to_hospital"),
                sirenEnabled: true,
                currentSpeedKmh: getAmbulanceSpeedKmh(
                  "transporting_to_hospital",
                  amb.currentSpeedKmh,
                ),
              }
            : amb,
        ),
      );
      } finally {
        hospitalRouteRecoveryRunningRef.current = false;
      }
    }, 1500);

    /**
     * 임시 배정 후 출동 경로가 비어 멈춘 차량의 환자 경로를 재생성합니다.
     */
    const dispatchRouteRecoveryTimer = setInterval(async () => {
      if (dispatchRouteRecoveryRunningRef.current) return;
      dispatchRouteRecoveryRunningRef.current = true;
      try {
      const recoveringAmb = ambulancesRef.current.find(
        (amb) =>
          amb.activity === "heading_to_patient" &&
          amb.status === AmbulanceStatus.DISPATCHED &&
          (!amb.patrolPath || amb.patrolPath.length < 2) &&
          !!amb.targetPatientId,
      );

      if (!recoveringAmb) return;

      const targetPatient = patientsRef.current.find(
        (patient) => patient.id === recoveringAmb.targetPatientId,
      );
      if (!targetPatient) return;

      const dispatchTargetPointRaw = getPatientDispatchTarget(targetPatient);
      let dispatchTargetPoint = dispatchTargetPointRaw;
      try {
        const snappedTarget = await snapPointToRoad(dispatchTargetPointRaw, 2);
        if (snappedTarget && Number.isFinite(snappedTarget.lat) && Number.isFinite(snappedTarget.lng)) {
          dispatchTargetPoint = snappedTarget;
        }
      } catch {
        // 무시
      }

      let recoveredDispatchRoute: { lat: number; lng: number }[] = [];
      try {
        const quickRouteController = new AbortController();
        const quickTimeoutId = setTimeout(
          () => quickRouteController.abort(),
          900,
        );
        const quickRoute = await fetchRoadRouteQuick(
          { lat: recoveringAmb.lat, lng: recoveringAmb.lng },
          dispatchTargetPoint,
          quickRouteController.signal,
        );
        clearTimeout(quickTimeoutId);
        recoveredDispatchRoute = quickRoute;
      } catch {
        recoveredDispatchRoute = [];
      }

      if (recoveredDispatchRoute.length < 2) {
        try {
          const fallbackRouteController = new AbortController();
          const fallbackTimeoutId = setTimeout(
            () => fallbackRouteController.abort(),
            3500,
          );
          recoveredDispatchRoute = await fetchRoadRoute(
            { lat: recoveringAmb.lat, lng: recoveringAmb.lng },
            dispatchTargetPoint,
            fallbackRouteController.signal,
          );
          clearTimeout(fallbackTimeoutId);
        } catch {
          recoveredDispatchRoute = [];
        }
      }

      if (recoveredDispatchRoute.length < 2) {
        const currentFail = dispatchRouteRecoveryFailCountRef.current[recoveringAmb.id] || 0;
        const nextFail = currentFail + 1;
        dispatchRouteRecoveryFailCountRef.current[recoveringAmb.id] = nextFail;
        if (nextFail >= 8) {
          dispatchRouteRecoveryFailCountRef.current[recoveringAmb.id] = 0;
          const targetPatientId = recoveringAmb.targetPatientId;
          assignedAmbulancesRef.current.delete(recoveringAmb.id);
          setAmbulances((prev) =>
            prev.map((amb) =>
              amb.id === recoveringAmb.id
                ? {
                    ...amb,
                    status: AmbulanceStatus.AVAILABLE,
                    activity: undefined,
                    previewPath: undefined,
                    patrolPath: undefined,
                    hospitalPath: undefined,
                    patrolIndex: undefined,
                    targetPatientId: undefined,
                    targetHospitalId: undefined,
                    dispatchPathLen: undefined,
                    targetSpeedKmh: undefined,
                    speechBubble: null,
                    sirenEnabled: false,
                    currentSpeedKmh: 0,
                  }
                : amb,
            ),
          );
          if (targetPatientId) {
            updatePatientById(targetPatientId, (current) => ({
              ...current,
              matchedAmbulanceId: undefined,
              dispatchTargetLat: undefined,
              dispatchTargetLng: undefined,
              hospitalMatchReason: "도로 경로 서버 연결 실패 · 재매칭 중",
            }));
          }
          addLog(`⚠️ 도로 경로 생성 실패: ${targetPatient.name} (재매칭 중)`);
        } else {
          setAmbulances((prev) =>
            prev.map((amb) =>
              amb.id === recoveringAmb.id
                ? {
                    ...amb,
                    speechBubble: `출동 경로 재시도중(${nextFail}/8)`,
                    sirenEnabled: true,
                  }
                : amb,
            ),
          );
        }
        return;
      }
      dispatchRouteRecoveryFailCountRef.current[recoveringAmb.id] = 0;

      const dispatchTargetSpeedKmh = getDispatchTargetSpeedKmh(
        getRouteDistanceKm(recoveredDispatchRoute),
      );

      setAmbulances((prev) =>
        prev.map((amb) =>
          amb.id === recoveringAmb.id
            ? {
                ...amb,
                lat: recoveredDispatchRoute[0].lat,
                lng: recoveredDispatchRoute[0].lng,
                patrolPath: recoveredDispatchRoute,
                patrolIndex: 0,
                dispatchPathLen: recoveredDispatchRoute.length,
                targetSpeedKmh: dispatchTargetSpeedKmh,
                speechBubble: getAmbulanceBubbleText("heading_to_patient"),
                sirenEnabled: true,
                currentSpeedKmh: getAmbulanceSpeedKmh(
                  "heading_to_patient",
                  amb.currentSpeedKmh,
                  dispatchTargetSpeedKmh,
                ),
              }
            : amb,
        ),
      );
      } finally {
        dispatchRouteRecoveryRunningRef.current = false;
      }
    }, 1500);

    // 6-2. 실제 이동 처리 (0.1초마다 초고정밀 이동)
    const moveTimer = setInterval(() => {
      setAmbulances((prev) =>
        prev.map((amb) => {
          const isMatched = patientsRef.current.some(
            (p) =>
              p.matchedAmbulanceId === amb.id &&
              p.status !== PatientStatus.TRANSPORTED,
          );

          if (amb.patrolPath && amb.patrolIndex !== undefined) {
            // 이송 조치(탑승) 시뮬레이션
            if (
              amb.activity === "boarding" &&
              amb.boardingCountdown !== undefined
            ) {
              if (amb.boardingCountdown > 0) {
                return {
                  ...amb,
                  boardingCountdown: amb.boardingCountdown - 0.1,
                };
              } else {
                if (!amb.hospitalPath || amb.hospitalPath.length < 2) {
                  return {
                    ...amb,
                    boardingCountdown: 0,
                    speechBubble: "병원 경로 확인중",
                    sirenEnabled: false,
                    currentSpeedKmh: 0,
                  };
                }
                const hospitalRouteStart = Math.max(0, Math.max((amb.dispatchPathLen || 1) - 1, 0));
                const hospitalRoute =
                  amb.hospitalPath && amb.hospitalPath.length > 1
                    ? amb.hospitalPath
                    : amb.patrolPath.slice(hospitalRouteStart);
                return {
                  ...amb,
                  lat: hospitalRoute[0].lat,
                  lng: hospitalRoute[0].lng,
                  status: AmbulanceStatus.BUSY,
                  patrolPath: hospitalRoute.length > 1 ? hospitalRoute : amb.patrolPath,
                  hospitalPath: undefined,
                  patrolIndex: 0,
                  dispatchPathLen: undefined,
                  activity: "transporting_to_hospital",
                  boardingCountdown: undefined,
                  targetSpeedKmh: undefined,
                  speechBubble: getAmbulanceBubbleText("transporting_to_hospital"),
                  sirenEnabled: true,
                  currentSpeedKmh: getAmbulanceSpeedKmh(
                    "transporting_to_hospital",
                    amb.currentSpeedKmh,
                  ),
                };
              }
            }

            let currentIndex = amb.patrolIndex;
            let currentLat = amb.lat;
            let currentLng = amb.lng;
            const nextSpeedKmh = getAmbulanceSpeedKmh(
              amb.activity,
              amb.currentSpeedKmh,
              amb.targetSpeedKmh,
            );
            let distanceToMove = getAmbulanceDistancePerTickKm(
              amb.activity,
              nextSpeedKmh,
              amb.targetSpeedKmh,
            );

            while (
              distanceToMove > 0 &&
              currentIndex < amb.patrolPath.length - 1
            ) {
              const nextPoint = amb.patrolPath[currentIndex + 1];
              const distToNext = getHaversineDistance(
                currentLat,
                currentLng,
                nextPoint.lat,
                nextPoint.lng,
              );

              if (distanceToMove >= distToNext) {
                distanceToMove -= distToNext;
                currentLat = nextPoint.lat;
                currentLng = nextPoint.lng;
                currentIndex++;
              } else {
                const ratio = distanceToMove / (distToNext || 0.0001);
                currentLat = currentLat + (nextPoint.lat - currentLat) * ratio;
                currentLng = currentLng + (nextPoint.lng - currentLng) * ratio;
                distanceToMove = 0;
              }
            }

            if (
              amb.activity === "heading_to_patient" &&
              amb.dispatchPathLen &&
              currentIndex >= Math.max(amb.dispatchPathLen - 1, 0)
            ) {
              return {
                ...amb,
                lat: currentLat,
                lng: currentLng,
                patrolIndex: currentIndex,
                status: AmbulanceStatus.BUSY,
                activity: "boarding",
                boardingCountdown: 5,
                targetSpeedKmh: undefined,
                speechBubble: getAmbulanceBubbleText("boarding"),
                sirenEnabled: false,
                currentSpeedKmh: 0,
              };
            }

            if (currentIndex >= amb.patrolPath.length - 1) {
              if (
                amb.activity === "transporting_to_hospital" &&
                amb.targetPatientId
              ) {
                handlePatientArrivalRef.current(amb.targetPatientId, amb.id, {
                  lat: currentLat,
                  lng: currentLng,
                });
                return {
                  ...amb,
                  lat: currentLat,
                  lng: currentLng,
                };
              }
              return {
                ...amb,
                lat: currentLat,
                lng: currentLng,
                previewPath: undefined,
                patrolPath: undefined,
                hospitalPath: undefined,
                patrolIndex: undefined,
                activity: undefined,
                status: AmbulanceStatus.AVAILABLE,
                targetSpeedKmh: undefined,
                speechBubble: null,
                sirenEnabled: false,
              };
            }

            return {
              ...amb,
              lat: currentLat,
              lng: currentLng,
              patrolIndex: currentIndex,
              speechBubble: getAmbulanceBubbleText(amb.activity),
              sirenEnabled:
                amb.activity === "heading_to_patient" ||
                amb.activity === "transporting_to_hospital",
              currentSpeedKmh: nextSpeedKmh,
            };
          }

          if (!isMatched && amb.activity !== "returning") {
            return {
              ...amb,
              lat: amb.lat,
              lng: amb.lng,
            };
          }

          return amb;
        }),
      );
    }, 100);

    return () => {
      clearInterval(patrolTimer);
      clearInterval(backgroundTransportTimer);
      clearInterval(hospitalRouteRecoveryTimer);
      clearInterval(dispatchRouteRecoveryTimer);
      clearInterval(moveTimer);
    };
  }, [hospitals]);

  // 시스템 로그 패널은 최신 항목만 앞쪽 30개까지 유지합니다.
  const addLog = (text: string) => {
    setSystemLogs((prev) =>
      [
        {
          id: Date.now().toString(),
          text,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 30),
    );
  };

  /**
   * 전시용 정상 회원에게 보행 경로를 주기적으로 생성합니다.
   */
  useEffect(() => {
    const planner = window.setInterval(async () => {
      if (showcasePlannerRunningRef.current) return;
      showcasePlannerRunningRef.current = true;
      try {
      const candidates = simPatientsRef.current
        .filter(
          (patient) =>
            patient.simulationState === "walking" &&
            !patient.simPath &&
            !patient.matchedAmbulanceId &&
            !isInsideShowcaseHospitalZone(patient.lat, patient.lng),
        )
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);

      for (const patient of candidates) {
        let target: { lat: number; lng: number } | null = null;
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const candidateTarget = {
            lat: patient.lat + (Math.random() - 0.5) * 0.0045,
            lng: patient.lng + (Math.random() - 0.5) * 0.0045,
          };
          if (!isInsideShowcaseHospitalZone(candidateTarget.lat, candidateTarget.lng)) {
            target = candidateTarget;
            break;
          }
        }
        if (!target) continue;

        const route = await fetchRoadRoute(
          { lat: patient.lat, lng: patient.lng },
          target,
        );
        if (route.length > 1) {
          updatePatientById(patient.id, (current) => ({
            ...current,
            simPath: route,
            simPathIndex: 0,
          }));
        }
      }
      } finally {
        showcasePlannerRunningRef.current = false;
      }
    }, 9000);

    return () => window.clearInterval(planner);
  }, [isInsideShowcaseHospitalZone, updatePatientById]);

  /**
   * 전시용 정상 회원의 보행 이동을 부드럽게 갱신합니다.
   */
  useEffect(() => {
    const walker = window.setInterval(() => {
      setSimPatients((prev) =>
        prev.map((patient) => {
          if (
            patient.simulationState !== "walking" ||
            !patient.simPath ||
            patient.simPathIndex === undefined
          ) {
            return patient;
          }

          let currentIndex = patient.simPathIndex;
          let currentLat = patient.lat;
          let currentLng = patient.lng;
          let distanceToMove = 0.00032;

          while (
            distanceToMove > 0 &&
            currentIndex < patient.simPath.length - 1
          ) {
            const nextPoint = patient.simPath[currentIndex + 1];
            const distToNext = getHaversineDistance(
              currentLat,
              currentLng,
              nextPoint.lat,
              nextPoint.lng,
            );

            if (distanceToMove >= distToNext) {
              distanceToMove -= distToNext;
              currentLat = nextPoint.lat;
              currentLng = nextPoint.lng;
              currentIndex += 1;
            } else {
              const ratio = distanceToMove / (distToNext || 0.0001);
              currentLat = currentLat + (nextPoint.lat - currentLat) * ratio;
              currentLng = currentLng + (nextPoint.lng - currentLng) * ratio;
              distanceToMove = 0;
            }
          }

          if (currentIndex >= patient.simPath.length - 1) {
            const arrivedPatient = {
              ...patient,
              lat: currentLat,
              lng: currentLng,
              simPath: undefined,
              simPathIndex: undefined,
            };
            if (isInsideShowcaseHospitalZone(arrivedPatient.lat, arrivedPatient.lng)) {
              const safePoint = getShowcaseSafePoint(arrivedPatient.lat, arrivedPatient.lng);
              if (safePoint) {
                return {
                  ...arrivedPatient,
                  lat: safePoint.lat,
                  lng: safePoint.lng,
                  location: arrivedPatient.location.includes("생활도로")
                    ? arrivedPatient.location
                    : `${arrivedPatient.location} 생활도로`,
                };
              }
            }
            return arrivedPatient;
          }

          const movedPatient = {
            ...patient,
            lat: currentLat,
            lng: currentLng,
            simPathIndex: currentIndex,
          };
          if (isInsideShowcaseHospitalZone(movedPatient.lat, movedPatient.lng)) {
            const safePoint = getShowcaseSafePoint(movedPatient.lat, movedPatient.lng);
            if (safePoint) {
              return {
                ...movedPatient,
                lat: safePoint.lat,
                lng: safePoint.lng,
                simPath: undefined,
                simPathIndex: undefined,
                location: movedPatient.location.includes("생활도로")
                  ? movedPatient.location
                  : `${movedPatient.location} 생활도로`,
              };
            }
          }
          return movedPatient;
        }),
      );
    }, 250);

    return () => window.clearInterval(walker);
  }, [getShowcaseSafePoint, isInsideShowcaseHospitalZone]);

  /**
   * 전시용 회원 생체값은 이동과 분리해 천천히 갱신합니다.
   */
  useEffect(() => {
    const vitalsTimer = window.setInterval(() => {
      const now = Date.now();
      setSimPatients((prev) =>
        prev.map((patient) => {
          const measurementClock = showcaseMeasurementClockRef.current[patient.id];
          if (!measurementClock) {
            showcaseMeasurementClockRef.current[patient.id] =
              createShowcaseMeasurementClock(now, getShowcaseMeasurementIntervals(patient));
          }

          const intervals = getShowcaseMeasurementIntervals(patient);
          const activeClock =
            showcaseMeasurementClockRef.current[patient.id] ||
            createShowcaseMeasurementClock(now, intervals);
          const due = {
            heartRate: now - activeClock.heartRate >= intervals.heartRate,
            oxygenLevel: now - activeClock.oxygenLevel >= intervals.oxygenLevel,
            bodyTemp: now - activeClock.bodyTemp >= intervals.bodyTemp,
            stressLevel: now - activeClock.stressLevel >= intervals.stressLevel,
            steps: now - activeClock.steps >= intervals.steps,
            battery: now - activeClock.battery >= intervals.battery,
            sensors: now - activeClock.sensors >= intervals.sensors,
            location: now - activeClock.location >= intervals.location,
          };

          if (!Object.values(due).some(Boolean)) {
            return patient;
          }

          let nextPatient = patient;

          if (due.heartRate || due.oxygenLevel || due.bodyTemp || due.stressLevel) {
            const nextVitals = driftShowcaseScenarioVitals(nextPatient);
            nextPatient = {
              ...nextPatient,
              vitals: {
                ...nextPatient.vitals,
                heartRate: due.heartRate
                  ? nextVitals.heartRate
                  : nextPatient.vitals.heartRate,
                oxygenLevel: due.oxygenLevel
                  ? nextVitals.oxygenLevel
                  : nextPatient.vitals.oxygenLevel,
                bodyTemp: due.bodyTemp
                  ? nextVitals.bodyTemp
                  : nextPatient.vitals.bodyTemp,
                stressLevel: due.stressLevel
                  ? nextVitals.stressLevel
                  : nextPatient.vitals.stressLevel,
                lastUpdated: nextVitals.lastUpdated,
              },
            };

            if (due.heartRate) activeClock.heartRate = now;
            if (due.oxygenLevel) activeClock.oxygenLevel = now;
            if (due.bodyTemp) activeClock.bodyTemp = now;
            if (due.stressLevel) activeClock.stressLevel = now;
          }

          if (due.steps || due.battery || due.location) {
            const nextMetrics = driftShowcaseLiveMetrics(nextPatient);
            nextPatient = {
              ...nextPatient,
              steps: due.steps ? nextMetrics.steps : nextPatient.steps,
              distanceM: due.steps ? nextMetrics.distanceM : nextPatient.distanceM,
              batteryLevel: due.battery
                ? nextMetrics.batteryLevel
                : nextPatient.batteryLevel,
              locationUpdatedAt: due.location
                ? nextMetrics.locationUpdatedAt
                : nextPatient.locationUpdatedAt,
              locationAgeMs: due.location
                ? nextMetrics.locationAgeMs
                : nextPatient.locationAgeMs,
            };

            if (due.steps) activeClock.steps = now;
            if (due.battery) activeClock.battery = now;
            if (due.location) activeClock.location = now;
          }

          if (due.sensors) {
            nextPatient = {
              ...nextPatient,
              ...driftShowcaseSensors(nextPatient, {
                walking: nextPatient.simulationState === "walking",
              }),
            };
            activeClock.sensors = now;
          }

          return nextPatient;
        }),
      );
    }, 2000);

    return () => window.clearInterval(vitalsTimer);
  }, []);

  /**
   * 전시용 위급상황을 주기적으로 한 명씩 발생시킵니다.
   */
  const triggerShowcaseEmergency = useCallback(() => {
    const hasActiveEmergency = simPatientsRef.current.some(
      (patient) =>
        (patient.status === PatientStatus.CRITICAL ||
          patient.status === PatientStatus.DANGER) &&
        patient.status !== PatientStatus.TRANSPORTED,
    );
    if (hasActiveEmergency) return;

    const candidates = simPatientsRef.current.filter(
      (patient) =>
        patient.simulationState === "walking" &&
        !patient.matchedAmbulanceId &&
        !patient.recommendedHospitalId &&
        !isInsideShowcaseHospitalZone(patient.lat, patient.lng),
    );
    if (candidates.length === 0) return;

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const guide = pickShowcaseEmergencyCase(showcaseCaseCursorRef.current);
    showcaseCaseCursorRef.current += 1;
    const safePoint = getShowcaseSafePoint(target.lat, target.lng);
    const emergencyBasePatient =
      safePoint && isInsideShowcaseHospitalZone(target.lat, target.lng)
        ? { ...target, lat: safePoint.lat, lng: safePoint.lng }
        : target;
    const nextSelected = applyShowcaseEmergencyCase(emergencyBasePatient, guide);

    setSimPatients((prev) =>
      prev.map((patient) =>
        patient.id === target.id
          ? applyShowcaseEmergencyCase(
              emergencyBasePatient.id === patient.id
                ? { ...patient, lat: emergencyBasePatient.lat, lng: emergencyBasePatient.lng }
                : patient,
              guide,
            )
          : patient,
      ),
    );
    setSelectedPatient((prev) =>
      prev && !prev.isSimulated ? prev : nextSelected,
    );
    addLog(
      `🚨 전시 시뮬레이션: ${target.name} / ${guide.title} / 조건: ${getGoldenTimeCaseLabel(nextSelected) || guide.triggerLabel}`,
    );
  }, [getShowcaseSafePoint, getGoldenTimeCaseLabel, isInsideShowcaseHospitalZone]);

  /**
   * 전시용 위급상황을 자동 순환 시작합니다.
   */
  useEffect(() => {
    const bootTimer = window.setTimeout(() => {
      triggerShowcaseEmergency();
    }, 4000);
    const cycleTimer = window.setInterval(() => {
      triggerShowcaseEmergency();
    }, 32000);

    return () => {
      window.clearTimeout(bootTimer);
      window.clearInterval(cycleTimer);
    };
  }, [triggerShowcaseEmergency]);

  const matchHospitalForPatient = useCallback(
    async (patient: Patient, options?: { force?: boolean }) => {
      if (!isAiMatchingEnabled && !options?.force) return;
      if (
        patient.matchedAmbulanceId ||
        patient.recommendedHospitalId ||
        processingRef.current.has(patient.id)
      )
        return;

      processingRef.current.add(patient.id);
      setProcessingIds((prev) => new Set(prev).add(patient.id));
      let assignedAmbId: string | null = null;

      try {
        addLog(`🏥 AI 병원 매칭 시작: ${patient.name}`);
        const availableHospitals = hospitals.filter(
          (h) => h.isEROpen && h.erBeds.available > 0,
        );
        if (availableHospitals.length === 0)
          throw new Error("No Available Hospitals");
        let bestHospitalCandidate = patient.isSimulated
          ? (() => {
              const nearestHospital =
                [...availableHospitals].sort((a, b) => {
                  const distA = getHaversineDistance(
                    patient.lat,
                    patient.lng,
                    a.lat,
                    a.lng,
                  );
                  const distB = getHaversineDistance(
                    patient.lat,
                    patient.lng,
                    b.lat,
                    b.lng,
                  );
                  return distA - distB;
                })[0] || null;

              if (!nearestHospital) {
                return null;
              }

              return {
                hospital: nearestHospital,
                route: [] as { lat: number; lng: number }[],
                distanceKm: getHaversineDistance(
                  patient.lat,
                  patient.lng,
                  nearestHospital.lat,
                  nearestHospital.lng,
                ),
              };
            })()
          : await (async () => {
              const sortedHospitals = [...availableHospitals].sort((a, b) => {
                const distA = getHaversineDistance(
                  patient.lat,
                  patient.lng,
                  a.lat,
                  a.lng,
                );
                const distB = getHaversineDistance(
                  patient.lat,
                  patient.lng,
                  b.lat,
                  b.lng,
                );
                return distA - distB;
              });
              const hospitalRouteCandidates = await Promise.all(
                sortedHospitals.slice(0, 6).map(async (hospital) => {
                  try {
                    const routeController = new AbortController();
                    const timeoutId = setTimeout(() => routeController.abort(), 2000);
                    const route = await fetchRoadRoute(
                      { lat: patient.lat, lng: patient.lng },
                      { lat: hospital.lat, lng: hospital.lng },
                      routeController.signal
                    );
                    clearTimeout(timeoutId);

                    return {
                      hospital,
                      route: route.length >= 2 ? route : [],
                      distanceKm: route.length >= 2
                        ? getRouteDistanceKm(route)
                        : Number.POSITIVE_INFINITY,
                    };
                  } catch (e) {
                    return {
                      hospital,
                      route: [],
                      distanceKm: Number.POSITIVE_INFINITY,
                    };
                  }
                }),
              );

              const validCandidates = hospitalRouteCandidates.filter(
                (candidate) => candidate.route.length >= 2,
              );
              return validCandidates.sort((prev, curr) => prev.distanceKm - curr.distanceKm)[0] || null;
            })();

        let bestHospital = bestHospitalCandidate?.hospital || null;
        let hospitalRoadRoute = bestHospitalCandidate?.route || [];
        let hospDist =
          typeof bestHospitalCandidate?.distanceKm === "number"
            ? bestHospitalCandidate.distanceKm
            : Number.POSITIVE_INFINITY;

        if (!bestHospital) {
          bestHospital =
            [...availableHospitals].sort((a, b) => {
              const distA = getHaversineDistance(patient.lat, patient.lng, a.lat, a.lng);
              const distB = getHaversineDistance(patient.lat, patient.lng, b.lat, b.lng);
              return distA - distB;
            })[0] || null;
          if (!bestHospital) {
            throw new Error("No Available Hospitals");
          }
          hospitalRoadRoute = [];
          hospDist = getHaversineDistance(
            patient.lat,
            patient.lng,
            bestHospital.lat,
            bestHospital.lng,
          );
        }

        if (
          patient.isSimulated &&
          hospDist <= SHOWCASE_HOSPITAL_ZONE_RADIUS_KM
        ) {
          assignedAmbulancesRef.current.delete(assignedAmbId);
          updatePatientById(patient.id, (current) => ({
            ...current,
            recommendedHospitalId: bestHospital.id,
            hospitalMatchReason: `병원 인접권역(${hospDist.toFixed(2)}km) 도착 상태`,
            matchedAmbulanceId: undefined,
            dispatchTargetLat: undefined,
            dispatchTargetLng: undefined,
            status: PatientStatus.TRANSPORTED,
            speechBubble: "이송완료",
            simulationState: "completed",
          }));
          addLog(
            `🏁 전시 시뮬레이션 보정: ${patient.name} 은(는) ${bestHospital.name} 인접권역으로 완료 처리`,
          );
          return;
        }

        if (!Number.isFinite(patient.lat) || !Number.isFinite(patient.lng)) {
          addLog(`⚠️ 위치 미확인으로 배차 불가: ${patient.name}`);
          return;
        }

        const currentAmbs = ambulancesRef.current;
        const availableAmbs = currentAmbs.filter(
          (a) =>
            a.status === AmbulanceStatus.AVAILABLE &&
            !a.targetPatientId &&
            !a.targetHospitalId &&
            !assignedAmbulancesRef.current.has(a.id),
        );

        if (availableAmbs.length === 0) {
          addLog(`⚠️ 가용 구급차가 없습니다. 재시도 중...`);
          throw new Error("No Available Ambulance");
        }
        const sortedAvailableAmbs = [...availableAmbs].sort((prev, curr) => {
          const prevDist = getHaversineDistance(
            patient.lat,
            patient.lng,
            prev.lat,
            prev.lng,
          );
          const currDist = getHaversineDistance(
            patient.lat,
            patient.lng,
            curr.lat,
            curr.lng,
          );
          return prevDist - currDist;
        });
        const maxDispatchDistanceKm = 5.0;
        const nearbyAmbs = sortedAvailableAmbs.filter((amb) => {
          const distKm = getHaversineDistance(
            patient.lat,
            patient.lng,
            amb.lat,
            amb.lng,
          );
          return distKm <= maxDispatchDistanceKm;
        });

        let dispatchCandidatePool = nearbyAmbs.slice(0, 3);

        if (patient.isSimulated && nearbyAmbs.length === 0) {
          const closestAmb = sortedAvailableAmbs[0];
          if (closestAmb) {
            let repositionPoint: { lat: number; lng: number } | null = null;
            try {
              repositionPoint = await findShowcaseDispatchRepositionPoint(patient);
            } catch {
              repositionPoint = null;
            }

            if (!repositionPoint) {
              const nearestSafePoint =
                SEOUL_SAFE_ROAD_POINTS.slice().sort((a, b) => {
                  const distA = getHaversineDistance(
                    patient.lat,
                    patient.lng,
                    a.lat,
                    a.lng,
                  );
                  const distB = getHaversineDistance(
                    patient.lat,
                    patient.lng,
                    b.lat,
                    b.lng,
                  );
                  return distA - distB;
                })[0] || getSafeRoadFallbackPoint(0);

              repositionPoint = nearestSafePoint;
            }

            const finalRepositionPoint = repositionPoint;
            const repositionedCandidate: Ambulance = {
              ...closestAmb,
              lat: finalRepositionPoint.lat,
              lng: finalRepositionPoint.lng,
              baseLat: finalRepositionPoint.lat,
              baseLng: finalRepositionPoint.lng,
              currentSpeedKmh: 0,
            };
            setAmbulances((prevAmbs) =>
              prevAmbs.map((amb) =>
                amb.id === closestAmb.id
                  ? {
                      ...amb,
                      lat: finalRepositionPoint.lat,
                      lng: finalRepositionPoint.lng,
                      baseLat: finalRepositionPoint.lat,
                      baseLng: finalRepositionPoint.lng,
                      currentSpeedKmh: 0,
                    }
                  : amb,
              ),
            );

            addLog(
              `🚑 전시 배차 보정: 인근 가용 차량 없음 → ${closestAmb.unitName} 을(를) 근접 도로로 배치 후 출동`,
            );
            dispatchCandidatePool = [repositionedCandidate];
          }
        }
        
        if (!patient.isSimulated && dispatchCandidatePool.length === 0) {
          const fallbackClosest = sortedAvailableAmbs[0] || null;
          if (!fallbackClosest) {
            addLog(`⚠️ 가용 구급차가 없습니다. 재시도 중...`);
            return;
          }
          dispatchCandidatePool = [fallbackClosest];
          addLog(
            `⚠️ 인근(${maxDispatchDistanceKm.toFixed(1)}km) 가용 구급차 없음 → 최단거리 차량 우선 배정: ${fallbackClosest.unitName}`,
          );
        }

        if (dispatchCandidatePool.length === 0) {
          throw new Error("가용 구급차 없음");
        }

        const provisionalAmb = dispatchCandidatePool[0];
        assignedAmbId = provisionalAmb.id;
        assignedAmbulancesRef.current.add(assignedAmbId);

        const provisionalDispatchTarget = getPatientDispatchTarget(patient);
        updatePatientById(patient.id, (current) => ({
          ...current,
          recommendedHospitalId: bestHospital.id,
          hospitalMatchReason: "가장 가까운 구급차 우선 배정 · 도로 경로 생성 중",
          matchedAmbulanceId: assignedAmbId,
          dispatchTargetLat: provisionalDispatchTarget.lat,
          dispatchTargetLng: provisionalDispatchTarget.lng,
          emergencyTriggeredAt:
            current.emergencyTriggeredAt ||
            (shouldStartGoldenTimeForPatient(current)
              ? new Date().toISOString()
              : undefined),
          status:
            current.status === PatientStatus.PENDING
              ? current.severityScore && current.severityScore >= 4
                ? PatientStatus.CRITICAL
                : PatientStatus.DANGER
              : current.status,
          speechBubble: current.isSimulated ? "살려주세요!" : current.speechBubble,
          simulationState: current.isSimulated ? "assigned" : current.simulationState,
        }));

        setAmbulances((prevAmbs) =>
          prevAmbs.map((amb) =>
            amb.id === assignedAmbId
              ? {
                  ...amb,
                  status: AmbulanceStatus.DISPATCHED,
                  activity: "heading_to_patient",
                  patrolPath: undefined,
                  hospitalPath: undefined,
                  patrolIndex: undefined,
                  dispatchPathLen: undefined,
                  targetPatientId: patient.id,
                  targetHospitalId: bestHospital.id,
                  speechBubble: "출동 경로 생성중입니다.",
                  sirenEnabled: true,
                  targetSpeedKmh: 0,
                  currentSpeedKmh: 0,
                }
              : amb,
          ),
        );

        const dispatchTargetPointRaw = getPatientDispatchTarget(patient);
        let dispatchTargetPoint = dispatchTargetPointRaw;
        try {
          const snappedTarget = await snapPointToRoad(dispatchTargetPointRaw, 2);
          if (snappedTarget && Number.isFinite(snappedTarget.lat) && Number.isFinite(snappedTarget.lng)) {
            dispatchTargetPoint = snappedTarget;
          }
        } catch {
          // 무시
        }

        updatePatientById(patient.id, (current) => ({
          ...current,
          dispatchTargetLat: dispatchTargetPoint.lat,
          dispatchTargetLng: dispatchTargetPoint.lng,
        }));

        let bestDispatchCandidate: {
          ambulance: Ambulance;
          route: { lat: number; lng: number }[];
          distanceKm: number;
        } | null = null;

        for (const candidate of dispatchCandidatePool) {
          try {
            const quickRouteController = new AbortController();
            const quickTimeoutId = setTimeout(
              () => quickRouteController.abort(),
              900,
            );
            let route = await fetchRoadRouteQuick(
              { lat: candidate.lat, lng: candidate.lng },
              dispatchTargetPoint,
              quickRouteController.signal,
            );
            clearTimeout(quickTimeoutId);

            if (route.length < 2) {
              const fallbackRouteController = new AbortController();
              const fallbackTimeoutId = setTimeout(
                () => fallbackRouteController.abort(),
                3500,
              );
              route = await fetchRoadRoute(
                { lat: candidate.lat, lng: candidate.lng },
                dispatchTargetPoint,
                fallbackRouteController.signal,
              );
              clearTimeout(fallbackTimeoutId);
            }

            if (route.length >= 2) {
              bestDispatchCandidate = {
                ambulance: candidate,
                route,
                distanceKm: getRouteDistanceKm(route),
              };
              break;
            }
          } catch (e) {
            // 다음 후보를 순차적으로 시도합니다.
          }
        }

        if (!bestDispatchCandidate) {
          addLog(`⚠️ 출동 경로 재시도 중: ${patient.name}`);
          return;
        }

        const targetAmb = bestDispatchCandidate.ambulance;
        const targetAmbDispatchRoute = bestDispatchCandidate.route;

        if (assignedAmbId !== targetAmb.id) {
          const previousAssignedId = assignedAmbId;
          assignedAmbulancesRef.current.delete(previousAssignedId);
          assignedAmbId = targetAmb.id;
          assignedAmbulancesRef.current.add(assignedAmbId);

          setAmbulances((prevAmbs) =>
            prevAmbs.map((amb) => {
              if (amb.id === previousAssignedId) {
                return {
                  ...amb,
                  status: AmbulanceStatus.AVAILABLE,
                  activity: undefined,
                  patrolPath: undefined,
                  hospitalPath: undefined,
                  patrolIndex: undefined,
                  targetPatientId: undefined,
                  targetHospitalId: undefined,
                  dispatchPathLen: undefined,
                  targetSpeedKmh: undefined,
                  speechBubble: null,
                  sirenEnabled: false,
                  currentSpeedKmh: 0,
                };
              }

              if (amb.id === assignedAmbId) {
                return {
                  ...amb,
                  status: AmbulanceStatus.DISPATCHED,
                  activity: "heading_to_patient",
                  patrolPath: undefined,
                  hospitalPath: undefined,
                  patrolIndex: undefined,
                  dispatchPathLen: undefined,
                  targetPatientId: patient.id,
                  targetHospitalId: bestHospital.id,
                  speechBubble: "출동 경로 생성중입니다.",
                  sirenEnabled: true,
                  targetSpeedKmh: 0,
                  currentSpeedKmh: 0,
                };
              }

              return amb;
            }),
          );
        }

        addLog(
          `🚑 도로 경로 우선 배정: ${targetAmb.unitName} -> ${patient.name}`,
        );

        const dist = getHaversineDistance(
          patient.lat,
          patient.lng,
          targetAmb.lat,
          targetAmb.lng,
        );
        addLog(
          `📍 최단거리(${dist.toFixed(2)}km) 구급차 배정: ${targetAmb.unitName}`,
        );

        const updatedPatientFields = {
          recommendedHospitalId: bestHospital.id,
          hospitalMatchReason:
            patient.isSimulated && hospitalRoadRoute.length < 2
              ? `최단거리(${hospDist.toFixed(1)}km) 병원 우선 배정 · 도로 경로 확인 중`
              : `최단거리(${hospDist.toFixed(1)}km) 및 병상 가용성 분석 결과`,
          matchedAmbulanceId: assignedAmbId,
          dispatchTargetLat: dispatchTargetPoint.lat,
          dispatchTargetLng: dispatchTargetPoint.lng,
          emergencyTriggeredAt:
            patient.emergencyTriggeredAt ||
            (shouldStartGoldenTimeForPatient(patient) ? new Date().toISOString() : undefined),
          status:
            patient.status === PatientStatus.PENDING
              ? patient.severityScore && patient.severityScore >= 4
                ? PatientStatus.CRITICAL
                : PatientStatus.DANGER
              : patient.status,
          speechBubble: patient.isSimulated ? "살려주세요!" : patient.speechBubble,
          simulationState: patient.isSimulated ? "assigned" : patient.simulationState,
        };

        updatePatientById(patient.id, (current) => ({
          ...current,
          ...updatedPatientFields,
        }));

        const dispatchTargetSpeedKmh = getDispatchTargetSpeedKmh(
          getRouteDistanceKm(targetAmbDispatchRoute),
        );

        const p1 = targetAmbDispatchRoute;
        const dispatchPathLen = p1.length;

        setAmbulances((prevAmbs) =>
          prevAmbs.map((amb) =>
            amb.id === assignedAmbId
              ? {
                  ...amb,
                  lat: p1[0].lat,
                  lng: p1[0].lng,
                  status: AmbulanceStatus.DISPATCHED,
                  previewPath: undefined,
                  patrolPath: p1,
                  hospitalPath:
                    hospitalRoadRoute.length >= 2 ? hospitalRoadRoute : undefined,
                  patrolIndex: 0,
                  dispatchPathLen: dispatchPathLen,
                  activity: "heading_to_patient",
                  targetPatientId: patient.id,
                  targetHospitalId: bestHospital.id,
                  speechBubble: getAmbulanceBubbleText("heading_to_patient"),
                  sirenEnabled: true,
                  targetSpeedKmh: dispatchTargetSpeedKmh,
                  currentSpeedKmh: getAmbulanceSpeedKmh(
                    "heading_to_patient",
                    amb.currentSpeedKmh,
                    dispatchTargetSpeedKmh,
                  ),
                }
              : amb,
          ),
        );

        if (patient.isSimulated && hospitalRoadRoute.length < 2) {
          const hospitalRouteCandidates = await Promise.all(
            [...availableHospitals]
              .sort((a, b) => {
                const distA = getHaversineDistance(patient.lat, patient.lng, a.lat, a.lng);
                const distB = getHaversineDistance(patient.lat, patient.lng, b.lat, b.lng);
                return distA - distB;
              })
              .slice(0, 6)
              .map(async (hospital) => {
                const route = await fetchRoadRoute(
                  { lat: patient.lat, lng: patient.lng },
                  { lat: hospital.lat, lng: hospital.lng },
                );

                return {
                  hospital,
                  route,
                  distanceKm:
                    route.length >= 2
                      ? getRouteDistanceKm(route)
                      : getHaversineDistance(patient.lat, patient.lng, hospital.lat, hospital.lng),
                };
              }),
          );
          const bestHospitalRoadCandidate =
            hospitalRouteCandidates
              .filter((candidate) => candidate.route.length >= 2)
              .sort((prev, curr) => prev.distanceKm - curr.distanceKm)[0] || null;
          if (bestHospitalRoadCandidate) {
            bestHospital = bestHospitalRoadCandidate.hospital;
            hospitalRoadRoute = bestHospitalRoadCandidate.route;
            hospDist = bestHospitalRoadCandidate.distanceKm;
            updatePatientById(patient.id, (current) =>
              current.matchedAmbulanceId === assignedAmbId
                ? {
                    ...current,
                    recommendedHospitalId: bestHospital.id,
                    hospitalMatchReason: `최단거리(${hospDist.toFixed(1)}km) 및 병상 가용성 분석 결과`,
                  }
                : current,
            );
            setAmbulances((prevAmbs) =>
              prevAmbs.map((amb) =>
                amb.id === assignedAmbId
                  ? {
                      ...amb,
                      targetHospitalId: bestHospital.id,
                      hospitalPath: hospitalRoadRoute,
                    }
                  : amb,
              ),
            );
          } else {
            addLog(`⚠️ 병원 도로 경로 재탐색 중: ${patient.name}`);
          }
        }

        addLog(`✅ 매칭 완료: ${bestHospital.name} (${hospDist.toFixed(1)}km)`);
      } catch (error) {
        console.error("Match error:", error);
        if (assignedAmbId) {
          assignedAmbulancesRef.current.delete(assignedAmbId);
          setAmbulances((prevAmbs) =>
            prevAmbs.map((amb) =>
              amb.id === assignedAmbId
                ? {
                    ...amb,
                    status: AmbulanceStatus.AVAILABLE,
                    activity: undefined,
                    previewPath: undefined,
                    patrolPath: undefined,
                    hospitalPath: undefined,
                    patrolIndex: undefined,
                    targetPatientId: undefined,
                    targetHospitalId: undefined,
                    dispatchPathLen: undefined,
                    targetSpeedKmh: undefined,
                    speechBubble: null,
                    sirenEnabled: false,
                    currentSpeedKmh: 0,
                  }
                : amb,
            ),
          );
          updatePatientById(patient.id, (current) => ({
            ...current,
            matchedAmbulanceId: undefined,
            recommendedHospitalId: undefined,
            dispatchTargetLat: undefined,
            dispatchTargetLng: undefined,
            hospitalMatchReason: undefined,
            simulationState: current.isSimulated ? "waiting_dispatch" : current.simulationState,
          }));
        }
        addLog(
          `❌ 매칭 실패: ${error instanceof Error ? error.message : "시스템 재시도 중..."}`,
        );
      } finally {
        setTimeout(() => {
          processingRef.current.delete(patient.id);
          setProcessingIds((prev) => {
            const next = new Set(prev);
            next.delete(patient.id);
            return next;
          });
        }, 500);
      }
    },
    [getPatientDispatchTarget, hospitals, isAiMatchingEnabled, updatePatientById],
  );

  useEffect(() => {
    if (!isAiMatchingEnabled) return;
    if (selectedPatient && !selectedPatient.matchedAmbulanceId) {
      matchHospitalForPatient(selectedPatient);
    }
  }, [selectedPatient?.id, matchHospitalForPatient, isAiMatchingEnabled]);

  /**
   * 전시 시뮬레이션 응급환자는 생성 직후 즉시 최근접 구급차 매칭을 시도합니다.
   */
  useEffect(() => {
    const unmatchedPatient = simPatients.find(
      (patient) =>
        (patient.status === PatientStatus.CRITICAL ||
          patient.status === PatientStatus.DANGER) &&
        !patient.matchedAmbulanceId &&
        patient.status !== PatientStatus.TRANSPORTED &&
        !isInsideShowcaseHospitalZone(patient.lat, patient.lng) &&
        !processingRef.current.has(patient.id),
    );

    if (unmatchedPatient) {
      matchHospitalForPatient(unmatchedPatient, { force: true });
    }
  }, [simPatients, isInsideShowcaseHospitalZone, matchHospitalForPatient]);

  /**
   * 병원 인접권역의 시뮬레이션 환자는 출동 대상이 아니라 이미 인계 가능한 상태로 간주합니다.
   */
  useEffect(() => {
    const hospitalZonePatients = simPatients.filter(
      (patient) =>
        patient.isSimulated &&
        patient.status !== PatientStatus.TRANSPORTED &&
        patient.simulationState !== "completed" &&
        isInsideShowcaseHospitalZone(patient.lat, patient.lng),
    );

    if (hospitalZonePatients.length === 0) {
      return;
    }

    hospitalZonePatients.forEach((patient) => {
      const nearest = getNearestShowcaseHospital(patient.lat, patient.lng);
      if (!nearest) return;

      if (patient.matchedAmbulanceId) {
        handlePatientArrivalRef.current(patient.id, patient.matchedAmbulanceId);
      }

      updatePatientById(patient.id, (current) => ({
        ...current,
        recommendedHospitalId: nearest.hospital.id,
        hospitalMatchReason: `병원 인접권역(${nearest.distanceKm.toFixed(2)}km) 도착 상태`,
        matchedAmbulanceId: undefined,
        dispatchTargetLat: undefined,
        dispatchTargetLng: undefined,
        status: PatientStatus.TRANSPORTED,
        speechBubble: "이송완료",
        simulationState: "completed",
        simPath: undefined,
        simPathIndex: undefined,
      }));
      appendShowcaseReplacementMember();
      addLog(
        `🏁 전시 시뮬레이션 보정: ${patient.name} 은(는) ${nearest.hospital.name} 인접권역으로 완료 처리`,
      );
    });
  }, [
    getNearestShowcaseHospital,
    isInsideShowcaseHospitalZone,
    simPatients,
    appendShowcaseReplacementMember,
    updatePatientById,
  ]);

  useEffect(() => {
    const autoMatchInterval = setInterval(() => {
      const unmatchedPatient = simPatientsRef.current.find(
        (p) =>
          (p.status === PatientStatus.CRITICAL ||
            p.status === PatientStatus.DANGER) &&
          !p.matchedAmbulanceId &&
          p.status !== PatientStatus.TRANSPORTED &&
          !isInsideShowcaseHospitalZone(p.lat, p.lng) &&
          !processingRef.current.has(p.id),
      );
      if (unmatchedPatient) {
        matchHospitalForPatient(unmatchedPatient, { force: true });
      }
    }, 300);
    return () => clearInterval(autoMatchInterval);
  }, [isInsideShowcaseHospitalZone, matchHospitalForPatient]);

  const currentSelectedPatient = useMemo(() => {
    const selectedId = selectedPatient?.id;
    if (selectedId) {
      const selectedRealPatient = displayPatients.find((p) => p.id === selectedId);
      if (selectedRealPatient) {
        return selectedRealPatient;
      }
    }

    return preferredRealPatient || displayPatients[0] || null;
  }, [displayPatients, preferredRealPatient, selectedPatient?.id]);
  /**
   * 실시간 사용자 카드가 있으면 전시 시뮬레이션보다 우선 선택 상태를 유지합니다.
   */
  useEffect(() => {
    if (!preferredRealPatient) {
      return;
    }

    setSelectedPatient((prev) =>
      prev && !prev.isSimulated && prev.id === preferredRealPatient.id
        ? prev
        : preferredRealPatient,
    );
  }, [preferredRealPatient]);
  /**
   * `renderPatients` 관련 데이터를 계산하거나 변환합니다.
   */
  const renderPatients = () => {
    let filteredPatients = displayPatients
      .filter(
      (p) => p.name.includes(searchTerm) || p.location.includes(searchTerm),
    );
    if (patientFilter === "critical")
      filteredPatients = filteredPatients.filter(
        (p) => p.status === PatientStatus.CRITICAL,
      );
    if (patientFilter === "danger")
      filteredPatients = filteredPatients.filter(
        (p) => p.status === PatientStatus.DANGER,
      );
    if (patientFilter === "transported")
      filteredPatients = filteredPatients.filter(
        (p) => p.status === PatientStatus.TRANSPORTED,
      );
    if (patientFilter === "transporting")
      filteredPatients = filteredPatients.filter(
        (p) => p.matchedAmbulanceId && p.status !== PatientStatus.TRANSPORTED,
      );

    const stats = {
      total: displayPatients.length,
      critical: displayPatients.filter((p) => p.status === PatientStatus.CRITICAL)
        .length,
      danger: displayPatients.filter((p) => p.status === PatientStatus.DANGER).length,
      transported: displayPatients.filter(
        (p) => p.status === PatientStatus.TRANSPORTED,
      ).length,
    };

    return (
      <div className="h-full flex flex-col gap-6 overflow-hidden animate-in fade-in duration-500 relative">
        {isReportModalOpen && renderReportModal()}
        <div className="grid grid-cols-4 gap-4 shrink-0">
          {[
            {
              label: "전체 케이스",
              value: stats.total,
              icon: Users,
              color: "text-blue-500",
              bg: "bg-blue-500/10",
            },
            {
              label: "응급 1단계",
              value: stats.critical,
              icon: ShieldAlert,
              color: "text-red-500",
              bg: "bg-red-500/10",
            },
            {
              label: "응급 2단계",
              value: stats.danger,
              icon: AlertTriangle,
              color: "text-orange-500",
              bg: "bg-orange-500/10",
            },
            {
              label: "이송 완료",
              value: stats.transported,
              icon: CheckCircle2,
              color: "text-green-500",
              bg: "bg-green-500/10",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border border-zinc-800 ${stat.bg} flex items-center gap-4`}
            >
              <div className={`p-2.5 rounded-xl bg-black/40 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 uppercase tracking-widest mb-0.5">
                  {stat.label}
                </p>
                <p className="text-2xl font-normal text-white">
                  {stat.value}
                  <span className="text-sm text-zinc-500 ml-1">건</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 bg-zinc-900/40 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="환자 이름 또는 지역 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`px-4 py-2 ${isFilterOpen ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300"} hover:opacity-90 rounded-xl text-sm transition-all flex items-center gap-2`}
                >
                  <Filter className="w-4 h-4" /> 필터
                </button>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-colors flex items-center gap-2"
                >
                  <BarChart className="w-4 h-4" /> 리포트
                </button>
              </div>
            </div>
            {isFilterOpen && (
              <div className="flex items-center gap-2 p-1 animate-in slide-in-from-top-2 duration-300">
                {[
                  { id: "all", label: "전체" },
                  { id: "critical", label: "1단계(응급)" },
                  { id: "danger", label: "2단계(위험)" },
                  { id: "transporting", label: "이송 중" },
                  { id: "transported", label: "완료" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setPatientFilter(chip.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all border ${patientFilter === chip.id ? "bg-red-600/20 border-red-500 text-red-500" : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-zinc-900 z-10">
                <tr className="text-[11px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
                  <th className="px-6 py-4 font-normal">환자 정보</th>
                  <th className="px-6 py-4 font-normal">응급 단계</th>
                  <th className="px-6 py-4 font-normal">현재 상태</th>
                  <th className="px-6 py-4 font-normal">위치</th>
                  <th className="px-6 py-4 font-normal">매칭 병원</th>
                  <th className="px-6 py-4 font-normal">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center text-lg">
                            {p.isSimulated ? p.avatarEmoji || "🙂" : (
                              <img
                                src={p.imageUrl}
                                alt=""
                                className="w-full h-full object-cover grayscale"
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-normal text-white">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {p.age}세 • {p.gender}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] border ${
                            p.status === PatientStatus.CRITICAL
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : p.status === PatientStatus.DANGER
                                ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                : p.status === PatientStatus.WARNING
                                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                  : p.status === PatientStatus.CAUTION
                                    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    : "bg-green-500/10 text-green-500 border-green-500/20"
                          }`}
                        >
                          {p.status === PatientStatus.CRITICAL
                            ? "1단계(응급)"
                            : p.status === PatientStatus.DANGER
                              ? "2단계(위험)"
                              : p.status === PatientStatus.WARNING
                                ? "3단계(경고)"
                                : p.status === PatientStatus.CAUTION
                                  ? "4단계(주의)"
                                  : "5단계(정상)"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${p.status === PatientStatus.TRANSPORTED ? "bg-green-500" : p.matchedAmbulanceId ? "bg-blue-500 animate-pulse" : "bg-zinc-600"}`}
                          />
                          <span className="text-xs text-zinc-300">
                            {p.status === PatientStatus.TRANSPORTED
                              ? "이송 완료"
                              : p.matchedAmbulanceId
                                ? "이송 중"
                                : "매칭 대기"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-zinc-400 truncate max-w-[150px]">
                          {p.location}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-zinc-300">
                          {hospitals.find(
                            (h) => h.id === p.recommendedHospitalId,
                          )?.name || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedPatient(p);
                            setActiveTab("dashboard");
                          }}
                          className="p-2 hover:bg-red-500/10 hover:text-red-500 text-zinc-500 rounded-lg transition-all"
                        >
                          <LocateFixed className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-20 text-center text-zinc-500 text-sm"
                    >
                      조건에 맞는 환자가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /**
   * `renderReportModal` 관련 데이터를 계산하거나 변환합니다.
   */
  const renderReportModal = () => {
    const stats = {
      total: displayPatients.length,
      successRate: 98.5,
      avgResponse: "4분 12초",
      criticalCount: displayPatients.filter((p) => p.status === PatientStatus.CRITICAL)
        .length,
    };
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
            <div>
              <h2 className="text-2xl font-normal text-white">
                관제 성과 리포트
              </h2>
              <p className="text-sm text-zinc-500">
                실시간 데이터 기반 통합 분석 결과
              </p>
            </div>
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors"
            >
              <Users className="w-6 h-6 rotate-45" />
            </button>
          </div>
          <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-3 text-blue-500 mb-4">
                  <Activity className="w-5 h-5" />
                  <span className="text-[11px] uppercase tracking-widest">
                    이송 성공률
                  </span>
                </div>
                <p className="text-4xl font-normal text-white">
                  {stats.successRate}%
                </p>
              </div>
              <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-3 text-green-500 mb-4">
                  <Clock className="w-5 h-5" />
                  <span className="text-[11px] uppercase tracking-widest">
                    평균 대응 시간
                  </span>
                </div>
                <p className="text-4xl font-normal text-white">
                  {stats.avgResponse}
                </p>
              </div>
              <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-3 text-red-500 mb-4">
                  <ShieldAlert className="w-5 h-5" />
                  <span className="text-[11px] uppercase tracking-widest">
                    중증 환자 대응
                  </span>
                </div>
                <p className="text-4xl font-normal text-white">
                  {stats.criticalCount}건
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm transition-all font-normal"
            >
              분석 완료 및 닫기
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * `renderHospitalDetail` 관련 데이터를 계산하거나 변환합니다.
   */
  const renderHospitalDetail = (hospital: Hospital) => {
    return (
      <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden p-2">
        <div className="flex items-center justify-between shrink-0">
          <button
            onClick={() => setSelectedHospital(null)}
            className="group flex items-center gap-2 text-zinc-300 hover:text-white transition-colors"
          >
            <div className="p-1.5 rounded-lg bg-zinc-900 group-hover:bg-zinc-800 border border-zinc-800 shadow-lg">
              <ChevronDown className="w-4 h-4 rotate-90" />
            </div>
            <span className="text-xs uppercase tracking-widest font-bold">
              Back to List
            </span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden shadow-2xl">
            <div
              className={`absolute top-0 left-0 bottom-0 w-1.5 ${hospital.activeTraumaLevel === 1 ? "bg-red-600" : "bg-blue-600"} opacity-70`}
            />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider ${hospital.activeTraumaLevel === 1 ? "bg-red-500/20 text-red-500 border border-red-500/30" : "bg-blue-500/20 text-blue-500 border border-blue-500/30"}`}
                >
                  LV.{hospital.activeTraumaLevel} TRAUMA CENTER
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider ${hospital.isEROpen ? "bg-green-500/20 text-green-500 border border-green-500/30" : "bg-red-500/20 text-red-500 border border-red-500/30"}`}
                >
                  {hospital.isEROpen ? "OPEN" : "CLOSED"}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {hospital.name}
              </h1>
              <div className="flex items-center gap-4 text-xs text-zinc-200 uppercase tracking-widest font-semibold mt-1">
                <div className="flex items-center gap-1.5">
                  <LocateFixed className="w-3.5 h-3.5 text-blue-400" />{" "}
                  {hospital.location}
                </div>
                <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-4">
                  <Droplets className="w-3.5 h-3.5 text-red-500" /> BLOOD:{" "}
                  {hospital.bloodSupply || "Normal"}
                </div>
                <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-4">
                  <Clock className="w-3.5 h-3.5 text-blue-500" /> DISTANCE:{" "}
                  {hospital.distance}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: "ER BEDS",
                val: hospital.erBeds.available,
                total: hospital.erBeds.total,
                icon: Truck,
                color: "text-green-500",
                barColor: "bg-green-500",
              },
              {
                label: "ICU BEDS",
                val: hospital.icuBeds.available,
                total: hospital.icuBeds.total,
                icon: Activity,
                color: "text-purple-500",
                barColor: "bg-purple-500",
              },
              {
                label: "OPERATING",
                val: hospital.operatingRooms?.available || 0,
                total: hospital.operatingRooms?.total || 0,
                icon: ShieldAlert,
                color: "text-orange-500",
                barColor: "bg-orange-500",
              },
              {
                label: "SYSTEM STATUS",
                val: "NORMAL",
                isStatus: true,
                icon: Monitor,
                color: "text-blue-500",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-black/40 border border-zinc-800/50 rounded-2xl p-4 flex flex-col justify-between h-28 shadow-xl hover:border-zinc-700 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.2em]">
                    {stat.label}
                  </span>
                  <stat.icon
                    className={`w-4 h-4 ${stat.color} opacity-50 group-hover:opacity-100 transition-opacity`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-3xl font-bold text-white">
                    {stat.val}{" "}
                    {!stat.isStatus && (
                      <span className="text-sm text-zinc-400 font-medium">
                        / {stat.total}
                      </span>
                    )}
                  </span>
                  {stat.isStatus && (
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                      Neural System Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /**
   * `renderHospitals` 관련 데이터를 계산하거나 변환합니다.
   */
  const renderHospitals = () => {
    if (selectedHospital) return renderHospitalDetail(selectedHospital);
    let filteredHospitals = [...hospitals];
    if (hospitalTab === "lv1")
      filteredHospitals = hospitals.filter((h) => h.activeTraumaLevel === 1);
    if (hospitalTab === "lv2")
      filteredHospitals = hospitals.filter((h) => h.activeTraumaLevel >= 2);
    if (hospitalTab === "available")
      filteredHospitals = hospitals.filter((h) => h.erBeds.available > 5);

    return (
      <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-normal text-white flex items-center gap-3">
              <HospitalIcon className="w-6 h-6 text-blue-500" /> 의료센터 가용성
              현황
            </h2>
            <p className="text-xs text-zinc-200 ml-9">
              실시간 병상 가용 정보 및 외상센터 등급별 분류
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-2xl border border-zinc-800 w-fit shrink-0">
          {[
            { id: "all", label: "전체", count: hospitals.length },
            {
              id: "lv1",
              label: "중증외상 (Lv.1)",
              count: hospitals.filter((h) => h.activeTraumaLevel === 1).length,
            },
            {
              id: "lv2",
              label: "지역응급 (Lv.2+)",
              count: hospitals.filter((h) => h.activeTraumaLevel >= 2).length,
            },
            {
              id: "available",
              label: "병상 여유",
              count: hospitals.filter((h) => h.erBeds.available > 5).length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setHospitalTab(tab.id as any)}
              className={`px-6 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${hospitalTab === tab.id ? "bg-zinc-800 text-white shadow-lg border border-zinc-700" : "text-zinc-300 hover:text-white hover:bg-white/5"}`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${hospitalTab === tab.id ? "bg-blue-600 text-white" : "bg-zinc-700 text-white"}`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pr-2 pb-6">
          {filteredHospitals.map((h) => (
            <div
              key={h.id}
              onClick={() => setSelectedHospital(h)}
              className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-5 hover:border-blue-500/50 hover:bg-blue-500/[0.02] transition-all group relative overflow-hidden flex flex-col cursor-pointer shadow-lg hover:shadow-blue-500/10"
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${h.activeTraumaLevel === 1 ? "bg-red-600" : "bg-blue-600"} opacity-30 group-hover:opacity-100 transition-opacity`}
              />
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-normal text-white truncate group-hover:text-blue-400 transition-colors">
                    {h.name}
                  </h3>
                  <p className="text-xs text-zinc-200 truncate flex items-center gap-1.5">
                    <LocateFixed className="w-3 h-3" /> {h.location}
                  </p>
                </div>
                <div
                  className={`px-2.5 py-1 rounded-full text-[10px] font-normal border ${h.isEROpen ? "bg-green-500/5 text-green-400 border-green-500/20" : "bg-red-500/5 text-red-400 border-red-500/20"}`}
                >
                  {h.isEROpen ? "● 응급실 개방" : "○ 응급실 폐쇄"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/50 group-hover:border-zinc-700/50 transition-colors">
                  <div className="flex items-center justify-between mb-2 text-zinc-200">
                    <span className="text-[10px] uppercase tracking-widest">
                      일반 병상
                    </span>
                    <Truck className="w-3 h-3" />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl text-white font-normal tabular-nums">
                      {h.erBeds.available}
                    </span>
                    <span className="text-xs text-white mb-1">
                      / {h.erBeds.total}
                    </span>
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/50 group-hover:border-zinc-700/50 transition-colors">
                  <div className="flex items-center justify-between mb-2 text-zinc-200">
                    <span className="text-[10px] uppercase tracking-widest">
                      중환자 병상
                    </span>
                    <Activity className="w-3 h-3" />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl text-purple-400 font-normal tabular-nums">
                      {h.icuBeds.available}
                    </span>
                    <span className="text-xs text-white mb-1">
                      / {h.icuBeds.total}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * 좌측 패널 탭 상태에 맞는 회원 목록을 반환합니다.
   */
  const getDashboardPatientsByTab = useCallback(
    (list: Patient[]) =>
      list.filter((patient) => {
        if (patientListTab === "waiting") {
          if (isCompletedPatient(patient)) return false;
          if (!patient.matchedAmbulanceId) return true;
          const ambulance = ambulances.find(
            (item) => item.id === patient.matchedAmbulanceId,
          );
          return (
            !!ambulance &&
            (ambulance.activity === "heading_to_patient" ||
              ambulance.status === AmbulanceStatus.DISPATCHED)
          );
        }

        if (patientListTab === "transporting") {
          if (isCompletedPatient(patient)) return false;
          if (!patient.matchedAmbulanceId) return false;
          const ambulance = ambulances.find(
            (item) => item.id === patient.matchedAmbulanceId,
          );
          return (
            !!ambulance &&
            (ambulance.activity === "boarding" ||
              ambulance.activity === "transporting_to_hospital")
          );
        }

        if (patientListTab === "completed") {
          return isCompletedPatient(patient);
        }

        return true;
      }),
    [ambulances, patientListTab],
  );

  /**
   * `renderDashboard` 관련 데이터를 계산하거나 변환합니다.
   */
  const renderDashboard = () => (
    <div className="h-full flex flex-col lg:flex-row gap-4 overflow-hidden">
      <div className="w-full lg:w-[13%] flex flex-col bg-zinc-950/40 rounded-2xl border border-zinc-900 overflow-hidden shadow-2xl shrink-0">
        <div className="p-1 border-b border-zinc-900 bg-zinc-900/10 shrink-0 flex flex-col">
          <div className="flex border-b border-zinc-900/50">
            {[
              {
                id: "waiting",
                label: "대기",
                count: displayPatients.filter((patient) => {
                  if (isCompletedPatient(patient)) return false;
                  if (!patient.matchedAmbulanceId) return true;
                  const ambulance = ambulances.find(
                    (item) => item.id === patient.matchedAmbulanceId,
                  );
                  return (
                    !!ambulance &&
                    (ambulance.activity === "heading_to_patient" ||
                      ambulance.status === AmbulanceStatus.DISPATCHED)
                  );
                }).length,
              },
              {
                id: "transporting",
                label: "이송중",
                count: displayPatients.filter((patient) => {
                  if (isCompletedPatient(patient)) return false;
                  if (!patient.matchedAmbulanceId) return false;
                  const ambulance = ambulances.find(
                    (item) => item.id === patient.matchedAmbulanceId,
                  );
                  return (
                    !!ambulance &&
                    (ambulance.activity === "boarding" ||
                      ambulance.activity === "transporting_to_hospital")
                  );
                }).length,
              },
              {
                id: "completed",
                label: "완료",
                count: displayPatients.filter(
                  (patient) => isCompletedPatient(patient),
                ).length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPatientListTab(tab.id as any)}
                className={`flex-1 py-2 text-[12px] font-normal transition-all relative flex flex-col items-center gap-0.5 ${patientListTab === tab.id ? "text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] font-normal leading-none px-1 rounded-sm ${patientListTab === tab.id ? "text-red-500" : "text-zinc-600"}`}
                >
                  {tab.count}
                </span>
                {patientListTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-1.5">
            <h3 className="text-[11px] font-normal uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> 실시간 회원
            </h3>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {getDashboardPatientsByTab(displayPatients).length > 0 ? (
            getDashboardPatientsByTab(displayPatients)
              .map((p) => (
                <PatientCard
                  key={`${p.id}:${currentSelectedPatient?.id === p.id ? "selected" : "idle"}`}
                  patient={p}
                  isSelected={currentSelectedPatient?.id === p.id}
                  isMatching={processingIds.has(p.id)}
                  hospitalName={
                    hospitals.find((hospital) => hospital.id === p.recommendedHospitalId)
                      ?.name
                  }
                  onClick={setSelectedPatient}
                  ambulanceStatus={
                    ambulances.find((a) => a.id === p.matchedAmbulanceId)
                      ?.activity
                  }
                />
              ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center opacity-40">
              <CheckCircle2 className="w-4.5 h-4.5 text-zinc-700 mb-2" />
              <p className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest">
                Empty
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl min-w-0 z-0">
        <button
          type="button"
          onClick={() => setIsAlertVoiceEnabled((prev) => !prev)}
          className={`absolute top-3 right-3 z-[999] pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-full border text-[12px] transition-all backdrop-blur shadow-lg ${
            isAlertVoiceEnabled
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
              : "bg-zinc-900/90 border-zinc-700 text-zinc-200"
          }`}
        >
          {isAlertVoiceEnabled ? (
            <Volume2 className="w-3.5 h-3.5" />
          ) : (
            <VolumeX className="w-3.5 h-3.5" />
          )}
          <span>음성 알림</span>
        </button>
        <ErrorBoundary>
          <LiveMap
            key={currentSelectedPatient?.id || "no-patient"}
            patient={currentSelectedPatient}
            hospital={hospitals.find(
              (h) => h.id === currentSelectedPatient?.recommendedHospitalId,
            )}
            ambulances={ambulances}
            patients={displayPatients}
            onArrival={handlePatientArrival}
          />
        </ErrorBoundary>
      </div>

      <div className="w-full lg:w-[17%] flex flex-col bg-zinc-950/40 rounded-2xl border border-zinc-900 shadow-2xl shrink-0 relative z-[30]">
        {currentSelectedPatient ? (
          <>
            <div className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar overflow-x-visible flex flex-col">
              <div className="bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-800/80 shadow-xl relative overflow-hidden shrink-0">
                <div className="flex gap-2.5 items-start relative z-10">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 shrink-0 shadow-lg relative self-center bg-zinc-950 flex items-center justify-center text-2xl">
                    {currentSelectedPatient.isSimulated ? (
                      <span>{currentSelectedPatient.avatarEmoji || "🙂"}</span>
                    ) : (
                      <img
                        src={currentSelectedPatient.imageUrl}
                        alt={currentSelectedPatient.name}
                        className="w-full h-full object-cover grayscale-[0.2]"
                      />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h2 className="text-[17px] font-normal text-white tracking-tighter truncate leading-none">
                        {currentSelectedPatient.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                  {(() => {
                    const selectedVisualState = getPatientMonitoringVisualState(
                      currentSelectedPatient,
                    );
                    const selectedStatusClass =
                      selectedVisualState.kind === "removed"
                        ? "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30"
                        : selectedVisualState.kind === "stale"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : selectedVisualState.kind === "critical"
                            ? "gt-emergency-invert-flash bg-red-600/10 text-red-500 border-red-500/30"
                            : selectedVisualState.kind === "danger"
                              ? "gt-emergency-invert-flash bg-orange-500/10 text-orange-500 border-orange-900/40"
                              : selectedVisualState.kind === "warning"
                                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                                : selectedVisualState.kind === "caution"
                                  ? "bg-blue-500/10 text-blue-500 border-blue-900/40"
                                  : selectedVisualState.kind === "normal"
                                    ? "bg-green-500/10 text-green-500 border-green-900/40"
                                    : selectedVisualState.kind === "pending"
                                      ? "bg-zinc-500/10 text-zinc-300 border-zinc-700/40"
                                      : "bg-zinc-500/10 text-zinc-500 border-zinc-900/40";

                    return (
                      <>
                      <p className="text-[12px] text-zinc-300 font-normal uppercase tracking-tight">
                        {currentSelectedPatient.age}세 •{" "}
                        {currentSelectedPatient.gender}
                      </p>
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-normal border uppercase tracking-wider ${
                          currentSelectedPatient.vitals.isWear === false
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                        }`}
                      >
                        {currentSelectedPatient.vitals.isWear === false
                          ? "WEAR OFF"
                          : "WEAR ON"}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-normal border uppercase tracking-wider ${selectedStatusClass}`}
                      >
                        {selectedVisualState.badgeLabel}
                      </span>
                      </>
                    );
                  })()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/80 flex-1 flex flex-col min-h-0 mb-1">
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <div className="bg-black/40 rounded-xl border border-zinc-900 px-2.5 py-2">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest">회원 연락처</div>
                    <div className="mt-1 text-[12px] text-zinc-200 break-all">
                      {currentSelectedPatient.phone || "없음"}
                    </div>
                  </div>
                  <div className="bg-black/40 rounded-xl border border-zinc-900 px-2.5 py-2">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest">보호자 정보</div>
                    <div className="mt-1 text-[12px] text-zinc-200 break-all">
                      {currentSelectedPatient.guardianName || currentSelectedPatient.guardianPhone || currentSelectedPatient.guardianRelationship
                        ? [
                            currentSelectedPatient.guardianRelationship,
                            currentSelectedPatient.guardianName,
                            currentSelectedPatient.guardianPhone,
                          ]
                            .filter(Boolean)
                            .join(" / ")
                        : "없음"}
                    </div>
                  </div>
                </div>
                <h3 className="text-[12px] font-normal text-zinc-300 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-red-600" /> 생체 데이터
                </h3>
                <div className="p-2 bg-black/40 rounded-xl border border-zinc-900 shadow-inner overflow-y-auto overflow-x-visible custom-scrollbar flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <VitalGuideCard
                      label="심박(BPM)"
                      guideKey="heartRate"
                      valueClassName="text-[15px] font-normal text-red-600 text-center tracking-tight"
                      value={
                        currentSelectedPatient.vitals.isWear === false
                          ? 0
                          : typeof currentSelectedPatient.vitals.heartRate === "number" &&
                              currentSelectedPatient.vitals.heartRate > 0
                            ? currentSelectedPatient.vitals.heartRate
                            : "--"
                      }
                    />
                    <VitalGuideCard
                      label="산소포화도(SpO2)"
                      guideKey="oxygen"
                      valueClassName="text-[15px] font-normal text-blue-600 text-center tracking-tight"
                      value={
                        currentSelectedPatient.vitals.isWear === false
                          ? "0%"
                          : typeof currentSelectedPatient.vitals.oxygenLevel === "number" &&
                              currentSelectedPatient.vitals.oxygenLevel > 0
                            ? `${currentSelectedPatient.vitals.oxygenLevel}%`
                            : "--%"
                      }
                    />
                    <VitalGuideCard
                      label="피부온도(TEMP)"
                      guideKey="skinTemp"
                      valueClassName="text-[15px] font-normal text-emerald-400 text-center tracking-tight"
                      value={
                        currentSelectedPatient.vitals.isWear === false
                          ? "0°C"
                          : typeof currentSelectedPatient.vitals.bodyTemp === "number" &&
                              currentSelectedPatient.vitals.bodyTemp > 0
                          ? `${currentSelectedPatient.vitals.bodyTemp.toFixed(1)}°C`
                          : "--°C"
                      }
                    />
                    <VitalGuideCard
                      label="배터리(BATT)"
                      guideKey="battery"
                      valueClassName="text-[15px] font-normal text-purple-400 text-center tracking-tight"
                      value={
                        typeof (currentSelectedPatient as any).batteryLevel === "number"
                          ? `${(currentSelectedPatient as any).batteryLevel}%`
                          : "0%"
                      }
                    />
                    <VitalGuideCard
                      label="스트레스(STRESS)"
                      guideKey="stress"
                      valueClassName="text-[15px] font-normal text-orange-400 text-center tracking-tight"
                      value={
                        typeof currentSelectedPatient.vitals.stressLevel === "number"
                          ? currentSelectedPatient.vitals.stressLevel
                          : 0
                      }
                    />
                    <VitalGuideCard
                      label="걸음수(STEPS)"
                      guideKey="steps"
                      valueClassName="text-[15px] font-normal text-zinc-200 text-center tracking-tight"
                      value={
                        typeof (currentSelectedPatient as any).steps === "number"
                          ? (currentSelectedPatient as any).steps.toLocaleString()
                          : 0
                      }
                    />
                    <VitalGuideCard
                      label="낙상점수(FALL)"
                      guideKey="fall"
                      valueClassName="text-[15px] font-normal text-amber-400 text-center tracking-tight"
                      value={
                        typeof currentSelectedPatient.vitals.fallScore === "number" &&
                        typeof currentSelectedPatient.vitals.recentFallPeakScore === "number" &&
                        currentSelectedPatient.vitals.recentFallPeakScore >
                          currentSelectedPatient.vitals.fallScore
                          ? `${currentSelectedPatient.vitals.fallScore} / 최근 ${currentSelectedPatient.vitals.recentFallPeakScore}`
                          : typeof currentSelectedPatient.vitals.fallScore === "number"
                            ? currentSelectedPatient.vitals.fallScore
                            : typeof currentSelectedPatient.vitals.recentFallPeakScore === "number"
                              ? `0 / 최근 ${currentSelectedPatient.vitals.recentFallPeakScore}`
                              : 0
                      }
                    />
                    <VitalGuideCard
                      label="응급점수(EMG)"
                      guideKey="emergency"
                      valueClassName={`text-[15px] font-normal text-center tracking-tight ${
                        typeof currentSelectedPatient.vitals.emergencyScore === "number" &&
                        currentSelectedPatient.vitals.emergencyScore >= 85
                          ? "text-red-500"
                          : typeof currentSelectedPatient.vitals.emergencyScore === "number" &&
                              currentSelectedPatient.vitals.emergencyScore >= 70
                            ? "text-orange-400"
                            : "text-cyan-300"
                      }`}
                      value={
                        typeof currentSelectedPatient.vitals.emergencyScore === "number"
                          ? currentSelectedPatient.vitals.emergencyScore
                          : 0
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 px-0.5">
                    <span className="text-zinc-400 uppercase tracking-widest text-[10px]">판정</span>
                    <span className="font-mono text-[11px] text-zinc-200">
                      {buildJudgmentSummary(currentSelectedPatient)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-950/50 rounded-lg border border-zinc-900 p-2">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">기압/고도</div>
                      <div className="font-mono text-[13px] text-white">
                        {(currentSelectedPatient as any).barometer &&
                        (typeof (currentSelectedPatient as any).barometer.airPressure === "number" ||
                          typeof (currentSelectedPatient as any).barometer.altitude === "number")
                          ? `${typeof (currentSelectedPatient as any).barometer.airPressure === "number" ? (currentSelectedPatient as any).barometer.airPressure.toFixed(0) : "--"} hPa / ${typeof (currentSelectedPatient as any).barometer.altitude === "number" ? (currentSelectedPatient as any).barometer.altitude.toFixed(0) : "--"} m`
                          : "미수집"}
                      </div>
                    </div>
                    <div className="bg-zinc-950/50 rounded-lg border border-zinc-900 p-2">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">가속도</div>
                      <div className="font-mono text-[13px] text-white">
                        {(currentSelectedPatient as any).acceleration &&
                        typeof (currentSelectedPatient as any).acceleration.x === "number" &&
                        typeof (currentSelectedPatient as any).acceleration.y === "number" &&
                        typeof (currentSelectedPatient as any).acceleration.z === "number"
                          ? `${Math.round((currentSelectedPatient as any).acceleration.x)},${Math.round((currentSelectedPatient as any).acceleration.y)},${Math.round((currentSelectedPatient as any).acceleration.z)}`
                          : "미수집"}
                      </div>
                    </div>
                    <div className="bg-zinc-950/50 rounded-lg border border-zinc-900 p-2">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">자이로</div>
                      <div className="font-mono text-[13px] text-white">
                        {(currentSelectedPatient as any).gyroscope &&
                        typeof (currentSelectedPatient as any).gyroscope.x === "number" &&
                        typeof (currentSelectedPatient as any).gyroscope.y === "number" &&
                        typeof (currentSelectedPatient as any).gyroscope.z === "number"
                          ? `${Math.round((currentSelectedPatient as any).gyroscope.x)},${Math.round((currentSelectedPatient as any).gyroscope.y)},${Math.round((currentSelectedPatient as any).gyroscope.z)}`
                          : "미수집"}
                      </div>
                    </div>
                    <div className="bg-zinc-950/50 rounded-lg border border-zinc-900 p-2">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">GPS</div>
                      <div className="font-mono text-[12px] text-white leading-5">
                        {Number.isFinite(currentSelectedPatient.lat) &&
                        Number.isFinite(currentSelectedPatient.lng) ? (
                          <>
                            <div>lat {currentSelectedPatient.lat.toFixed(6)}</div>
                            <div>lng {currentSelectedPatient.lng.toFixed(6)}</div>
                          </>
                        ) : (
                          <div>GPS 확인중</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                    업데이트 {currentSelectedPatient.vitals.lastUpdated ? new Date(currentSelectedPatient.vitals.lastUpdated).toLocaleString("ko-KR") : "--"}
                  </div>

                  <div className="bg-zinc-950/50 rounded-lg border border-zinc-900 p-2 min-h-[260px]">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">설명</div>
                    <div className="text-[12px] text-zinc-200 leading-5 whitespace-pre-wrap break-words">
                      {buildControlRoomSummary(currentSelectedPatient)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-zinc-400 flex flex-col items-center justify-center h-full gap-5">
            <ShieldAlert className="w-10 h-10 opacity-30" />
            <p className="text-[12px] font-normal uppercase tracking-widest">
              Case Standby
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#020202] text-slate-100 font-sans">
      <style>{`
        @keyframes gt-emergency-invert-flash {
          0%, 100% {
            background: rgba(127, 29, 29, 0.14);
            color: rgb(248, 113, 113);
            border-color: rgba(248, 113, 113, 0.35);
            box-shadow: 0 0 0 rgba(239, 68, 68, 0);
          }
          50% {
            background: rgb(220, 38, 38);
            color: rgb(255, 255, 255);
            border-color: rgba(254, 242, 242, 0.92);
            box-shadow: 0 0 18px rgba(239, 68, 68, 0.45);
          }
        }

        .gt-emergency-invert-flash {
          animation: gt-emergency-invert-flash 0.9s ease-in-out infinite;
        }
      `}</style>
      <aside className="w-16 lg:w-20 border-r border-zinc-800 flex flex-col bg-zinc-950/80 backdrop-blur-xl z-50 shrink-0">
        <div className="flex flex-col items-center py-6 h-full">
          <div className="mb-10 shrink-0">
            <div
              className="w-11 h-11 lg:w-12 lg:h-12 bg-white rounded-xl flex items-center justify-center shadow-2xl p-2 border-2 border-red-600 cursor-pointer hover:rotate-12 transition-transform"
              onClick={() => setActiveTab("dashboard")}
            >
              <Emblem119 className="w-full h-full" />
            </div>
          </div>
          <nav className="space-y-5 flex-1 w-full px-2">
            {(isCrimeMode ? [
              { id: "dashboard", icon: Monitor, label: "범죄관제" },
              { id: "patients", icon: Users, label: "사건목록" },
            ] : [
              { id: "dashboard", icon: Monitor, label: "관제" },
              { id: "patients", icon: Users, label: "목록" },
              { id: "hospitals", icon: HospitalIcon, label: "병원" },
            ]).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                title={item.label}
                className={`w-full flex items-center justify-center p-3.5 rounded-xl transition-all ${
                  activeTab === item.id
                    ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                {/* @ts-ignore */}
                <item.icon className="w-6.5 h-6.5 shrink-0" />
              </button>
            ))}
          </nav>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md z-40 shrink-0">
          <div className="flex items-center gap-9 min-w-0 flex-1 overflow-hidden">
            <h2 className="text-[14px] font-normal uppercase tracking-[0.4em] text-zinc-300 shrink-0">
              {isCrimeMode ? "범죄예방관제센터" : "응급관제시스템"}
            </h2>
            <div className="hidden lg:flex items-center gap-6 shrink-0 border-l border-zinc-800 pl-6 pr-6">
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 font-normal tracking-widest uppercase mb-0.5">
                  Control Center
                </span>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[13px] font-normal text-zinc-200">
                    {isCrimeMode ? "서울 중앙범죄관제센터" : "강남 제1관제센터"}
                  </span>
                  <span className="text-[10px] font-normal bg-zinc-800 text-zinc-400 px-1 rounded">
                    {isCrimeMode ? "CC-01" : "GN-01"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 font-normal tracking-widest uppercase mb-0.5">
                  Duty Operator
                </span>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[13px] font-normal text-zinc-200">
                    박지성 사원
                  </span>
                  <span className="text-[10px] font-normal bg-zinc-800 text-zinc-400 px-1 rounded">
                    OP-77
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 overflow-hidden">
            <div className="flex items-center gap-4 shrink-0 border-l border-zinc-800 pl-6">
              <div
                className={`flex px-3 py-1.5 rounded-lg border items-center gap-2.5 transition-all ${isAiMatchingEnabled ? "bg-purple-600/10 border-purple-500/20 shadow-[0_0_10px_rgba(147,51,234,0.1)]" : "bg-zinc-900/50 border-zinc-800"}`}
              >
                <Cpu
                  className={`w-5 h-5 ${isAiMatchingEnabled ? "text-purple-500 animate-pulse" : "text-zinc-600"}`}
                />
                <span
                  className={`text-[12px] font-normal uppercase ${isAiMatchingEnabled ? "text-purple-500" : "text-zinc-300"}`}
                >
                  Neural Active
                </span>
              </div>
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] animate-pulse"></div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {activeTab === "dashboard" && (isCrimeMode ? <CrimeDashboard /> : renderDashboard())}
          {activeTab === "patients" && (isCrimeMode ? <CrimeList /> : renderPatients())}
          {activeTab === "hospitals" && !isCrimeMode && renderHospitals()}
        </div>
      </main>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 3px; }.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }.custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }.font-diag-common { font-family: 'SUITE', 'Malgun Gothic', sans-serif; font-size: 1.0rem; }`}</style>
    </div>
  );
};

export default App;
