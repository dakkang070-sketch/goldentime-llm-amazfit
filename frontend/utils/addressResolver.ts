import { useEffect, useMemo, useState } from "react";

/**
 * 지도 좌표를 사용자 표시용 주소 문자열로 변환하는 역지오코딩 유틸 모듈입니다.
 */
const addressCache = new Map<string, string>();
// 동일 좌표에 대한 동시 요청은 하나의 Promise를 공유해 외부 역지오코딩 호출을 줄입니다.
const pendingRequests = new Map<string, Promise<string>>();

/**
 * 좌표를 주소 캐시 키로 정규화합니다.
 * 너무 미세한 흔들림으로 캐시가 깨지지 않게 소수점 4자리까지만 사용합니다.
 */
function toAddressCacheKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * 역지오코딩 결과에서 사용자에게 보여줄 주소를 정리합니다.
 * 도로명, 동/구, 시/도 순으로 조합해 지도 우측 패널에 읽기 쉽게 보여줍니다.
 */
function normalizeResolvedAddress(payload: any) {
  const road = typeof payload?.address?.road === "string" ? payload.address.road.trim() : "";
  const houseNumber =
    typeof payload?.address?.house_number === "string"
      ? payload.address.house_number.trim()
      : "";
  const suburb =
    typeof payload?.address?.suburb === "string" ? payload.address.suburb.trim() : "";
  const neighbourhood =
    typeof payload?.address?.neighbourhood === "string"
      ? payload.address.neighbourhood.trim()
      : "";
  const cityDistrict =
    typeof payload?.address?.city_district === "string"
      ? payload.address.city_district.trim()
      : "";
  const quarter =
    typeof payload?.address?.quarter === "string" ? payload.address.quarter.trim() : "";
  const borough =
    typeof payload?.address?.borough === "string" ? payload.address.borough.trim() : "";
  const city =
    typeof payload?.address?.city === "string"
      ? payload.address.city.trim()
      : typeof payload?.address?.province === "string"
        ? payload.address.province.trim()
        : "";
  const state =
    typeof payload?.address?.state === "string" ? payload.address.state.trim() : "";

  const streetLine = [road, houseNumber].filter(Boolean).join(" ");
  const districtLine = [suburb || neighbourhood || quarter, cityDistrict || borough]
    .filter(Boolean)
    .join(" ");
  const regionLine = [city || state].filter(Boolean).join(" ");

  return [regionLine, districtLine, streetLine].filter(Boolean).join(" ");
}

/**
 * 좌표 기준 주소를 역지오코딩하고 캐시에 저장합니다.
 * 같은 좌표 요청은 캐시와 pending 요청을 재사용해 중복 네트워크 호출을 줄입니다.
 */
async function resolveAddress(lat: number, lng: number) {
  const cacheKey = toAddressCacheKey(lat, lng);
  const cached = addressCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = pendingRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=ko`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  )
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`reverse geocode failed: ${response.status}`);
      }
      const payload = await response.json();
      // 구조화 주소가 비어도 display_name까지 받아 카드/지도 주소칸이 완전히 비지 않게 합니다.
      const normalized =
        normalizeResolvedAddress(payload) ||
        (typeof payload?.display_name === "string" ? payload.display_name.trim() : "");
      if (normalized) {
        addressCache.set(cacheKey, normalized);
      }
      return normalized;
    })
    .catch(() => "")
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });

  pendingRequests.set(cacheKey, request);
  return request;
}

/**
 * 좌표를 기준으로 현재 표시용 주소를 반환합니다.
 * 좌표가 바뀌면 비동기 역지오코딩을 수행하고, 없으면 fallback 주소를 그대로 사용합니다.
 */
export function useResolvedAddress(
  lat?: number,
  lng?: number,
  fallbackAddress?: string,
  options?: { skipRemoteWhenFallbackPresent?: boolean },
) {
  const skipRemoteWhenFallbackPresent =
    options?.skipRemoteWhenFallbackPresent ?? true;
  // 동일 좌표일 때는 effect 재실행을 줄이도록 정규화 캐시 키를 먼저 메모이즈합니다.
  const cacheKey = useMemo(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
    return toAddressCacheKey(lat as number, lng as number);
  }, [lat, lng]);

  const [resolvedAddress, setResolvedAddress] = useState(() =>
    // 첫 렌더부터 캐시된 주소가 있으면 즉시 보여 줘 지도/카드 주소칸 깜빡임을 줄입니다.
    cacheKey ? addressCache.get(cacheKey) || "" : "",
  );

  useEffect(() => {
    if (!cacheKey || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      // 유효 좌표가 없을 때는 내부 state만 비우고, 최종 반환 단계에서 fallback 주소를 계속 사용할 수 있게 둡니다.
      setResolvedAddress("");
      return;
    }

    const cached = addressCache.get(cacheKey);
    if (cached) {
      setResolvedAddress(cached);
      return;
    }

    if (skipRemoteWhenFallbackPresent && typeof fallbackAddress === "string" && fallbackAddress.trim()) {
      setResolvedAddress("");
      return;
    }

    let cancelled = false;

    // 비동기 응답이 늦게 와도 최신 좌표가 아닌 결과로 state를 덮지 않게 방지합니다.
    resolveAddress(lat as number, lng as number).then((address) => {
      if (!cancelled) {
        setResolvedAddress(address || "");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, lat, lng, fallbackAddress, skipRemoteWhenFallbackPresent]);

  // 역지오코딩 성공 주소를 우선 쓰고, 없으면 서버/기존 모델에 있던 fallback 주소를 그대로 사용합니다.
  return resolvedAddress || fallbackAddress || "";
}
