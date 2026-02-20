import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Helper to generate a simple sparkline SVG
const generateSparkline = (width: number, height: number, color: string, isCritical: boolean) => {
  const pointsCount = 20;
  const data: number[] = [];
  // Higher base for critical, lower for normal
  let current = isCritical ? 75 : 30;
  
  for (let i = 0; i < pointsCount; i++) {
    const change = (Math.random() - 0.5) * 2;
    current += change;
    current = Math.max(10, Math.min(95, current)); // Clamp 10-95
    data.push(current);
  }

  const stepX = width / (pointsCount - 1);
  const pathPoints = data.map((val, i) => {
    const x = i * stepX;
    const y = height - (val / 100) * height; // Invert Y
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polylinePoints = pathPoints.join(' ');
  const areaPoints = `0,${height} ${polylinePoints} ${width},${height}`;
  
  // Unique ID for gradient
  const gradientId = `grad-${Math.random().toString(36).substr(2, 9)}`;

  return `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow: visible;">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${areaPoints}" fill="url(#${gradientId})" />
      <polyline points="${polylinePoints}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      <circle cx="${width}" cy="${height - (data[data.length-1]/100)*height}" r="3" fill="${color}" stroke="#18181b" stroke-width="1" />
    </svg>
  `;
};

const createSparklineSvgFromData = (data: number[], width: number, height: number, color: string) => {
  const stepX = width / (data.length - 1);
  const pathPoints = data.map((val, i) => {
    const x = i * stepX;
    const y = height - (val / 100) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polylinePoints = pathPoints.join(" ");
  const areaPoints = `0,${height} ${polylinePoints} ${width},${height}`;
  const gradientId = `grad-${Math.random().toString(36).substr(2, 9)}`;
  return `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow: visible;">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${areaPoints}" fill="url(#${gradientId})" />
      <polyline points="${polylinePoints}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      <circle cx="${width}" cy="${height - (data[data.length-1]/100)*height}" r="3" fill="${color}" stroke="#18181b" stroke-width="1" />
    </svg>
  `;
};

interface PoliceStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  available: number;
}

interface Precinct {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface CrimeMapProps {
  cases: any[];
  selectedCase: any | null;
  onSelectCase: (c: any) => void;
  policeStations?: PoliceStation[];
  precincts?: Precinct[];
}

const CrimeMap: React.FC<CrimeMapProps> = ({
  cases,
  selectedCase,
  onSelectCase,
  policeStations = [],
  precincts = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const selectedCaseRef = useRef<any>(null); // Ref to track latest selectedCase
  const lastMarkerClickTimeRef = useRef(0); // Timestamp of last marker click
  const lastZoomedCaseIdRef = useRef<string | null>(null);
  const zoomStartLevelRef = useRef<number | null>(null);
  const addressCacheRef = useRef<Record<string, { road: string; detail: string }>>({});
  const addressRequestRef = useRef<Record<string, Promise<{ road: string; detail: string }> | null>>({});
  const mapClickHandlerRef = useRef<((e: any) => void) | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const sparklineTimersRef = useRef<Record<string, any>>({});
  const sparklineDataRef = useRef<Record<string, number[]>>({});
  const initialFitDoneRef = useRef(false);
  const prevSelectedCaseIdRef = useRef<string | null>(null);

  // Keep selectedCaseRef in sync
  useEffect(() => {
    selectedCaseRef.current = selectedCase;
  }, [selectedCase]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current as L.Map;

    const handleZoomStart = () => {
      zoomStartLevelRef.current = map.getZoom();
    };

    const handleZoomEnd = () => {
      const startZoom = zoomStartLevelRef.current;
      zoomStartLevelRef.current = null;

      if (startZoom === null) return;
      const endZoom = map.getZoom();
      if (endZoom >= startZoom) return;

      const current = selectedCaseRef.current;
      const id = current?.id || current?._id;
      if (!id) return;

      const marker = markersRef.current[id];
      if (!marker) return;

      const el = marker.getElement();
      if (!el) return;

      el.classList.remove("crime-selected-blink");
      void el.offsetWidth;
      el.classList.add("crime-selected-blink");
      setTimeout(() => {
        el.classList.remove("crime-selected-blink");
      }, 900);
    };

    map.on("zoomstart", handleZoomStart);
    map.on("zoomend", handleZoomEnd);

    return () => {
      map.off("zoomstart", handleZoomStart);
      map.off("zoomend", handleZoomEnd);
    };
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!selectedCase?.location) return;

    const id = selectedCase.id || selectedCase._id;
    if (!id) return;

    const isRecentMarkerClick = (Date.now() - lastMarkerClickTimeRef.current) <= 1000;
    if (isRecentMarkerClick) return;

    if (lastZoomedCaseIdRef.current === id) return;
    lastZoomedCaseIdRef.current = id;

    const lat = selectedCase.location.lat;
    const lng = selectedCase.location.lng;
    if (!lat || !lng) return;

    const map = mapRef.current;
    const targetZoom = 19;
    const fallback = String(selectedCase.location?.address || "");
    prefetchDetailedAddress(id, lat, lng, fallback);

    const point = map.project([lat, lng], targetZoom);
    const targetPoint = point.subtract([0, 150]);
    const targetLatLng = map.unproject(targetPoint, targetZoom);

    const openSelectedPopup = (retries: number) => {
      const marker = markersRef.current[id];
      if (!marker) {
        if (retries > 0) setTimeout(() => openSelectedPopup(retries - 1), 100);
        return;
      }

      if (marker.isPopupOpen()) return;

      const popup = marker.getPopup();
      if (popup) {
        const prevAutoPan = popup.options.autoPan;
        popup.options.autoPan = false;
        marker.openPopup();
        popup.options.autoPan = prevAutoPan;
      } else {
        marker.openPopup();
      }
    };

    map.once("moveend", () => openSelectedPopup(15));
    map.flyTo(targetLatLng, targetZoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
  }, [
    mapReady,
    selectedCase?.id,
    selectedCase?._id,
    selectedCase?.location?.lat,
    selectedCase?.location?.lng,
  ]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center (Seoul)
    const hasValidLocation =
      selectedCase?.location?.lat && selectedCase?.location?.lng;
    const center: L.LatLngExpression = hasValidLocation
      ? [selectedCase.location.lat, selectedCase.location.lng]
      : [37.5665, 126.978];

    mapRef.current = L.map(mapContainerRef.current, {
      center: center,
      zoom: 14,
      maxZoom: 22, // Allow high zoom for "20m view"
      attributionControl: false,
      zoomControl: false,
      closePopupOnClick: true
    });

    // Add Google Maps tile layer (Same as WorkingMap)
    L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      subdomains: ["0", "1", "2", "3"],
      maxZoom: 22,
      maxNativeZoom: 20,
    }).addTo(mapRef.current);

    // Add Zoom Control to top-right
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(mapRef.current);

    // Force map layout update
    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 100);

    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Helper to calculate distance
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Helper to generate a Manhattan-style route (L-shape) for fallback
  const generateManhattanRoute = (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
    // 50% chance to go Horizontal first, then Vertical
    // 50% chance to go Vertical first, then Horizontal
    const goHorizontalFirst = Math.random() > 0.5;
    
    const midPoint = goHorizontalFirst 
      ? [start.lat, end.lng] 
      : [end.lat, start.lng];

    return [
      [start.lat, start.lng],
      midPoint,
      [end.lat, end.lng]
    ];
  };

  // Helper to fetch route from OSRM with failover
  const fetchRoute = async (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
    // List of OSRM servers to try (Main + Backup)
    const servers = [
      "https://router.project-osrm.org/route/v1/driving",
      "https://routing.openstreetmap.de/routed-car/route/v1/driving" 
    ];

    for (const server of servers) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout to 8s

        const response = await fetch(
          `${server}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          return {
            coordinates: data.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]), // Convert back to lat,lon
            distance: data.routes[0].distance // meters
          };
        }
      } catch (error) {
        console.warn(`Route fetch failed from ${server}:`, error);
        // Continue to next server
      }
    }
    
    return null; // All servers failed
  };

  const prefetchDetailedAddress = (id: string, lat: number, lng: number, fallback: string) => {
    const cached = addressCacheRef.current[id];
    if (cached) return;

    const existing = addressRequestRef.current[id];
    if (existing) return;

    const req = (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          lat,
        )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=ko`;

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Reverse geocode failed: ${res.status}`);
        }

        const data = await res.json();
        const address = (data?.address || {}) as Record<string, any>;

        let detail: string = String(data?.display_name || "").trim();
        if (!detail) detail = fallback;
        detail = detail.replace(/^대한민국[, ]*/g, "").replace(/, 대한민국$/g, "");
        detail = detail || "위치 정보 없음";

        const roadParts: string[] = [];
        const road = String(address.road || address.pedestrian || address.footway || "").trim();
        const houseNumber = String(address.house_number || "").trim();
        const building = String(address.building || "").trim();
        if (road) roadParts.push(road);
        if (houseNumber) roadParts.push(houseNumber);
        if (!roadParts.length && building) roadParts.push(building);

        let roadLine = roadParts.join(" ").trim();
        if (!roadLine) roadLine = detail;

        let detailLine = detail;
        if (detailLine === roadLine) detailLine = "";

        const value = { road: roadLine, detail: detailLine };
        addressCacheRef.current[id] = value;
      } catch (e) {
        addressCacheRef.current[id] = { road: fallback || "위치 정보 없음", detail: "" };
      } finally {
        addressRequestRef.current[id] = null;
      }
    })();

    addressRequestRef.current[id] = req;
  };

  const ensureDetailedAddress = async (id: string, lat: number, lng: number, fallback: string) => {
    const setLine = (elementId: string, value: string) => {
      const el = document.getElementById(elementId);
      if (!el) return;
      const v = value.trim();
      if (el.textContent !== v) el.textContent = v;
      (el as HTMLElement).style.visibility = v ? "visible" : "hidden";
    };

    const setBoth = (road: string, detail: string) => {
      setLine(`address-road-${id}`, road);
      setLine(`address-detail-${id}`, detail);
      setLine(`address-right-road-${id}`, road);
      setLine(`address-right-detail-${id}`, detail);
    };

    const cached = addressCacheRef.current[id];
    if (cached) {
      setBoth(cached.road, cached.detail);
      return cached;
    }

    const existing = addressRequestRef.current[id];
    if (existing) {
      const value = await existing;
      setBoth(value.road, value.detail);
      return value;
    }

    const req = (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          lat,
        )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=ko`;

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Reverse geocode failed: ${res.status}`);
        }

        const data = await res.json();
        const address = (data?.address || {}) as Record<string, any>;

        let detail: string = String(data?.display_name || "").trim();
        if (!detail) detail = fallback;
        detail = detail.replace(/^대한민국[, ]*/g, "").replace(/, 대한민국$/g, "");
        detail = detail || "위치 정보 없음";

        const roadParts: string[] = [];
        const road = String(address.road || address.pedestrian || address.footway || "").trim();
        const houseNumber = String(address.house_number || "").trim();
        const building = String(address.building || "").trim();
        if (road) roadParts.push(road);
        if (houseNumber) roadParts.push(houseNumber);
        if (!roadParts.length && building) roadParts.push(building);

        let roadLine = roadParts.join(" ").trim();
        if (!roadLine) roadLine = detail;

        let detailLine = detail;
        if (detailLine === roadLine) detailLine = "";

        const value = { road: roadLine, detail: detailLine };
        addressCacheRef.current[id] = value;
        return value;
      } catch (e) {
        const value = { road: fallback || "위치 정보 없음", detail: "" };
        addressCacheRef.current[id] = value;
        return value;
      } finally {
        addressRequestRef.current[id] = null;
      }
    })();

    addressRequestRef.current[id] = req;
    const value = await req;
    setBoth(value.road, value.detail);
    return value;
  };

  // 2. Update Markers & Handle Map Interactions
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    
    let isMounted = true;

    // Filter cases: Show all cases on the map
    const visibleCases = cases;

    // Clear existing police markers and routes
    if (mapRef.current._policeMarkers) {
      mapRef.current._policeMarkers.forEach((m: L.Marker) => m.remove());
    }
    mapRef.current._policeMarkers = [];

    if (mapRef.current._precinctMarkers) {
      mapRef.current._precinctMarkers.forEach((m: L.Marker) => m.remove());
    }
    mapRef.current._precinctMarkers = [];

    if (mapRef.current._routeLayer) {
      mapRef.current._routeLayer.remove();
      mapRef.current._routeLayer = null;
    }

      // Render Police Stations
      console.log("Rendering police stations:", policeStations.length);
      policeStations.forEach((ps) => {
      const podoriIconUrl = "https://twemoji.maxcdn.com/v/latest/svg/1f46e.svg";
      const psIconHtml = `
        <div class="relative flex items-center justify-center w-10 h-10">
          <div class="absolute w-full h-full bg-blue-500/20 rounded-full animate-pulse"></div>
          <div class="relative w-9 h-9 rounded-full shadow-lg flex items-center justify-center border-2 border-white bg-white overflow-hidden">
            <img src="${podoriIconUrl}" alt="포돌이" style="width: 24px; height: 24px;" />
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-900/90 text-blue-100 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap border border-blue-500/50">
            ${ps.name}
          </div>
        </div>
      `;

      const psIcon = L.divIcon({
        className: "custom-ps-marker",
        html: psIconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([ps.lat, ps.lng], { icon: psIcon })
        .addTo(mapRef.current!)
        .bindPopup(
          `<div style="min-width: 150px; padding: 12px; color: black; font-family: sans-serif;">
             <div style="font-weight:bold; font-size: 14px; margin-bottom: 4px;">${ps.name}</div>
             <div style="color:gray; font-size:12px;">가용 인력: ${ps.available}명</div>
           </div>`
        );
      
      if (!mapRef.current._policeMarkers) mapRef.current._policeMarkers = [];
      mapRef.current._policeMarkers.push(marker);
    });

    console.log("Rendering precincts:", precincts.length);
    precincts.forEach((pc) => {
      const podoriIconUrl = "https://twemoji.maxcdn.com/v/latest/svg/1f46e.svg";
      const pcIconHtml = `
        <div class="relative flex items-center justify-center w-9 h-9">
          <div class="absolute w-full h-full bg-teal-500/20 rounded-full animate-pulse"></div>
          <div class="relative w-8 h-8 rounded-full shadow-lg flex items-center justify-center border-2 border-white bg-white overflow-hidden">
            <img src="${podoriIconUrl}" alt="포돌이" style="width: 22px; height: 22px;" />
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-teal-900/90 text-teal-100 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap border border-teal-500/50">
            ${pc.name}
          </div>
        </div>
      `;

      const pcIcon = L.divIcon({
        className: "custom-precinct-marker",
        html: pcIconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([pc.lat, pc.lng], { icon: pcIcon })
        .addTo(mapRef.current!)
        .bindPopup(
          `<div style="min-width: 150px; padding: 12px; color: black; font-family: sans-serif;">
             <div style="font-weight:bold; font-size: 14px; margin-bottom: 4px;">${pc.name}</div>
             <div style="color:gray; font-size:12px;">지구대</div>
           </div>`
        );
      
      if (!mapRef.current._precinctMarkers) mapRef.current._precinctMarkers = [];
      mapRef.current._precinctMarkers.push(marker);
    });

    const allMarkers = [
      ...(mapRef.current._policeMarkers || []),
      ...(mapRef.current._precinctMarkers || []),
    ];

    const currentSelectedCaseId = selectedCase?.id || selectedCase?._id || null;
    const prevSelectedCaseId = prevSelectedCaseIdRef.current;
    
    // Only fit bounds if:
    // 1. It's the first load with markers
    // 2. OR we just transitioned from having a selected case to none (deselection)
    const shouldFitBounds = !selectedCase && (
      (!initialFitDoneRef.current && allMarkers.length > 0) || 
      (prevSelectedCaseId && !currentSelectedCaseId)
    );

    if (shouldFitBounds) {
      const group = L.featureGroup(allMarkers);
      const bounds = group.getBounds();
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12, animate: true, duration: 1 });
      initialFitDoneRef.current = true;
    }

    // Update the previous ID ref for the next render
    prevSelectedCaseIdRef.current = currentSelectedCaseId;

    // Draw Route to Nearest Police Station if a case is selected
    if (selectedCase && selectedCase.location && policeStations.length > 0) {
      const drawRoute = async () => {
        let nearestPs = null;
        let minDirectDist = Infinity;

        // Find nearest station (using direct distance for initial selection)
        policeStations.forEach((ps) => {
          const dist = getDistance(
            selectedCase.location.lat,
            selectedCase.location.lng,
            ps.lat,
            ps.lng
          );
          if (dist < minDirectDist) {
            minDirectDist = dist;
            nearestPs = ps;
          }
        });

        if (nearestPs) {
          // Try to get road-based route
          const routeData = await fetchRoute(
            { lat: selectedCase.location.lat, lng: selectedCase.location.lng },
            { lat: nearestPs.lat, lng: nearestPs.lng }
          );

          if (!isMounted) return;

          // Clear again just in case another async call finished before this one
          if (mapRef.current._routeLayer) {
            mapRef.current._routeLayer.remove();
            mapRef.current._routeLayer = null;
          }

          let latlngs: L.LatLngExpression[];
          let displayDist = minDirectDist;

          if (routeData) {
            latlngs = routeData.coordinates as L.LatLngExpression[];
            displayDist = routeData.distance;
          } else {
            // Fallback to Manhattan route (simulated road)
            console.warn("OSRM Route fetch failed, falling back to Manhattan route.");
            latlngs = generateManhattanRoute(
              { lat: selectedCase.location.lat, lng: selectedCase.location.lng },
              { lat: nearestPs.lat, lng: nearestPs.lng }
            ) as L.LatLngExpression[];
          }

          const polyline = L.polyline(latlngs, {
            color: "#3b82f6", // Blue
            weight: 4,
            opacity: 0.7,
            dashArray: "10, 10",
            className: "animate-dash",
          }).addTo(mapRef.current);

          // Calculate center for tooltip (if road route, pick middle point of path)
          let centerLat, centerLng;
          if (routeData && routeData.coordinates.length > 0) {
            const midIndex = Math.floor(routeData.coordinates.length / 2);
            centerLat = routeData.coordinates[midIndex][0];
            centerLng = routeData.coordinates[midIndex][1];
          } else {
            centerLat = (selectedCase.location.lat + nearestPs.lat) / 2;
            centerLng = (selectedCase.location.lng + nearestPs.lng) / 2;
          }
          
          const distKm = (displayDist / 1000).toFixed(1);
          
          const tooltip = L.tooltip({
              permanent: true,
              direction: 'center',
              className: 'route-tooltip'
          })
          .setContent(`<div style="background: #1e3a8a; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; border: 1px solid #3b82f6;">🚔 ${distKm}km</div>`)
          .setLatLng([centerLat, centerLng])
          .addTo(mapRef.current);

          mapRef.current._routeLayer = L.layerGroup([polyline, tooltip]).addTo(mapRef.current);
        }
      };

      drawRoute();
    }

    const visibleIds = new Set(visibleCases.map((c) => c.id || c._id));

    // Handle map background click: close popup, keep selected marker
    if (mapClickHandlerRef.current) {
      mapRef.current.off("click", mapClickHandlerRef.current);
    }
    // const handleMapClick = (e: any) => {
    //   // Native closePopupOnClick handles this now
    // };
    // mapClickHandlerRef.current = handleMapClick;
    // mapRef.current.on("click", handleMapClick);

    // Add/Update markers
    visibleCases.forEach((c) => {
      const id = c.id || c._id;
      const isSelected =
        selectedCase && (selectedCase.id || selectedCase._id) === id;
      const category = c.analysisResult?.category || "";
      const severity = c.analysisResult?.severity || "Normal";
      
      // Determine severity based on both backend value and AI category
      const criticalCategories = ["금품 갈취", "신체 폭력", "협박 및 강요", "Extortion", "Violence", "Threat"];
      const cautionCategories = ["언어 폭력", "Verbal Abuse"];
      
      const isCritical = severity === "Critical" || criticalCategories.some(cat => category.includes(cat));
      const isCaution = ["Caution", "Warning", "Uncertain"].includes(severity) || cautionCategories.some(cat => category.includes(cat));
      
      const isResolved = ["Resolved", "False Alarm"].includes(c.status || "");

      if (!c.location) return;

      const lat = c.location.lat;
      const lng = c.location.lng;

      if (!lat || !lng) return;

      const markerColor = isCritical ? "#ef4444" : (isCaution ? "#f59e0b" : "#10b981"); // Red, Amber, or Green
      
      const cachedAddress = addressCacheRef.current[id];
      const addressRoad = cachedAddress?.road || c.location?.address || "위치 정보 없음";
      const addressDetail = cachedAddress?.detail || "";
      const sparklineSvg = "";

      const pulseAnimation = isCritical
          ? `<div class="absolute w-full h-full rounded-full bg-red-500 animate-ping opacity-75"></div>`
          : isCaution
            ? `<div class="absolute w-full h-full rounded-full bg-amber-500 animate-pulse opacity-50"></div>`
            : "";

      const iconHtml = `
        <div class="relative flex items-center justify-center w-12 h-12 group">
          ${pulseAnimation}
          <div class="relative w-6 h-6 rounded-full border-2 border-white shadow-lg transition-transform duration-200 group-hover:scale-125" style="background-color: ${markerColor}; transform: scale(${isSelected ? 1.5 : 1});"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-marker",
        html: iconHtml,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });
      
      let severityLabel = "정상 🟢";
      let severityColor = "#34d399";
      let severityBg = "rgba(16, 185, 129, 0.2)";
      let severityBorder = "rgba(16, 185, 129, 0.3)";
      
      if (isResolved) {
        severityLabel = "종결 ✅";
        severityColor = "#10b981";
        severityBg = "rgba(16, 185, 129, 0.1)";
        severityBorder = "rgba(16, 185, 129, 0.2)";
      } else if (isCritical) {
        severityLabel = "긴급 🚨";
        severityColor = "#f87171";
        severityBg = "rgba(239, 68, 68, 0.2)";
        severityBorder = "rgba(239, 68, 68, 0.3)";
      } else if (isCaution) {
        severityLabel = "주의 ⚠️";
        severityColor = "#fbbf24";
        severityBg = "rgba(245, 158, 11, 0.2)";
        severityBorder = "rgba(245, 158, 11, 0.3)";
      }

      // Format reasoning text for better readability with headers
      let reasoning: any = c.analysisResult?.reasoning || "실시간 상황 데이터를 분석하고 있습니다...";
      
      // Handle case where reasoning is an object (legacy data or direct API response)
      if (typeof reasoning === 'object' && reasoning !== null) {
        if (reasoning.situation || reasoning.psychology || reasoning.danger) {
          reasoning = `[상황 분석]: ${reasoning.situation || ''}\n[심리 분석]: ${reasoning.psychology || ''}\n[위험 요소]: ${reasoning.danger || ''}`;
        } else {
          reasoning = JSON.stringify(reasoning, null, 2);
        }
      }

      // Ensure reasoning is a string and clean technical tokens
      reasoning = String(reasoning).replace(/<\|.*?\|>/g, '').trim();
      
      // Clean up [keywords] or [키워드] and any other bracketed technical tags if they exist in the reasoning
      // But keep our structured headers like [상황 분석]
      reasoning = reasoning
        .replace(/\[keywords\]\s*:\s*.*$/gim, '')
        .replace(/\[키워드\]\s*:\s*.*$/gim, '')
        .replace(/<\|.*?\|>/g, '') // Redundant but safe
        .trim();

      // Ensure transcript is also cleaned for display
      let displayTranscript = String(c.transcript || "음성 인식 결과가 없습니다.")
        .replace(/<\|.*?\|>/g, '')
        .replace(/\[keywords\]\s*:\s*.*$/gim, '')
        .replace(/\[키워드\]\s*:\s*.*$/gim, '')
        .trim();

      // Headers to detect and highlight (supporting both with and without space)
      const headerPatterns = [
        { key: "[상황 분석]", alternatives: ["[상황 분석]", "[상황분석]"] },
        { key: "[심리 분석]", alternatives: ["[심리 분석]", "[심리분석]"] },
        { key: "[위험요소]", alternatives: ["[위험요소]", "[위험 요소]"] }
      ];
      
      let reasoningHtml = "";
      if (reasoning.includes('[') && reasoning.includes(']')) {
        // More robust parsing: find all positions of any potential headers
        const foundHeaders: { pos: number, key: string, length: number }[] = [];
        
        headerPatterns.forEach(pattern => {
          pattern.alternatives.forEach(alt => {
            let pos = reasoning.indexOf(alt);
            while (pos !== -1) {
              foundHeaders.push({ pos, key: pattern.key, length: alt.length });
              pos = reasoning.indexOf(alt, pos + 1);
            }
          });
        });
        
        // Sort headers by position
        foundHeaders.sort((a, b) => a.pos - b.pos);
        
        if (foundHeaders.length > 0) {
          // Add text before the first header if exists
          const firstHeader = foundHeaders[0];
          if (firstHeader.pos > 0) {
            const preText = reasoning.substring(0, firstHeader.pos).trim();
            if (preText) {
              reasoningHtml += `<div style="margin-bottom: 8px; font-size: 13px; color: #a1a1aa;">${preText}</div>`;
            }
          }
          
    // Add each header and its following content
      for (let i = 0; i < foundHeaders.length; i++) {
        const current = foundHeaders[i];
        const nextPos = (i + 1 < foundHeaders.length) ? foundHeaders[i + 1].pos : reasoning.length;
        const content = reasoning.substring(current.pos + current.length, nextPos).trim();
        
        reasoningHtml += `
          <div style="margin-bottom: 12px; border-left: 2px solid #6366f1; padding-left: 10px;">
            <div style="color: #818cf8; font-weight: normal; font-size: 12px; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #6366f1;"></span>
                ${current.key}
              </div>
            </div>
            <div style="color: #e4e4e7; line-height: 1.5;">${content}</div>
          </div>
        `;
      }
    } else {
      // If no headers were actually found despite having brackets
      reasoningHtml = `<div style="color: #e4e4e7; line-height: 1.5;">${reasoning.trim()}</div>`;
    }
  } else {
    // Fallback for old format or no headers
    reasoningHtml = reasoning.includes('\n') 
      ? reasoning.split('\n').filter(s => s.trim()).map(s => `<div style="margin-bottom: 6px; display: flex; gap: 6px;"><span style="color: #6366f1; font-weight: normal;">•</span><span>${s.trim()}</span></div>`).join('')
      : reasoning.split('. ').filter(s => s.trim()).map(s => `<div style="margin-bottom: 6px; display: flex; gap: 6px;"><span style="color: #6366f1; font-weight: normal;">•</span><span>${s.trim()}${s.endsWith('.') ? '' : '.'}</span></div>`).join('');
  }

      const popupContent = `
    <div style="width: 750px; background-color: #18181b; color: white; border-radius: 12px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <script>
        function closePopup() {
          const popup = document.querySelector('.custom-crime-popup');
          if (popup && popup._leaflet_id) {
            const map = document.querySelector('.leaflet-container');
            if (map && map.__leaflet_map) {
              map.__leaflet_map.closePopup(popup._leaflet_id);
            }
          }
        }
      </script>
      <!-- Main Horizontal Layout -->
      <div style="display: flex; flex-direction: row; min-height: 320px;">
        
        <!-- Left Panel: User Info & Status (approx 35%) -->
        <div style="width: 35%; border-right: 1px solid #27272a; display: flex; flex-direction: column; background-color: #1c1c1f;">
          <!-- Header with Close Button -->
          <div style="padding: 16px 20px; background-color: #27272a; border-bottom: 1px solid #3f3f46; position: relative;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${markerColor}; box-shadow: 0 0 10px ${markerColor};"></div>
                <span style="font-weight: normal; font-size: 18px; white-space: nowrap;">${c.name || "미확인"}</span>
                <span style="color: #a1a1aa; font-size: 14px;">(${c.age || "?"}세)</span>
              </div>
              <button onclick="closePopup()" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 16px; padding: 4px; border-radius: 4px; hover: background-color: #3f3f46;">✕</button>
            </div>
            <div style="display: flex; gap: 4px;">
              <span style="font-size: 11px; font-weight: normal; padding: 2px 10px; border-radius: 9999px; background-color: ${severityBg}; color: ${severityColor}; border: 1px solid ${severityBorder};">
                ${severityLabel}
              </span>
            </div>
          </div>

          <!-- Status Info -->
          <div style="padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; flex-grow: 1;">
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="color: #71717a; font-size: 11px; font-weight: normal;">감지된 유형</span>
              <span style="color: ${isCritical ? "#fca5a5" : "#e4e4e7"}; font-size: 15px; font-weight: normal;">
                ${category || "분석 중..."}
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="color: #71717a; font-size: 11px; font-weight: normal;">핵심 감지 정서</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 15px; font-weight: normal; color: #e4e4e7;">
                  ${c.analysisResult?.primaryEmotion || "분석 중..."}
                </span>
                ${c.analysisResult?.primaryEmotion === "격앙됨/흥분" || c.analysisResult?.primaryEmotion === "공포" ? 
                  `<span style="width: 6px; height: 6px; background-color: #ef4444; border-radius: 50%; display: inline-block;"></span>` : 
                  c.analysisResult?.primaryEmotion === "위축됨/불안" ?
                  `<span style="width: 6px; height: 6px; background-color: #f59e0b; border-radius: 50%; display: inline-block;"></span>` : 
                  `<span style="width: 6px; height: 6px; background-color: #10b981; border-radius: 50%; display: inline-block;"></span>`
                }
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="color: #71717a; font-size: 11px; font-weight: normal;">현장 주소</span>
              <div id="address-road-${id}" style="color: #e4e4e7; font-size: 13px; line-height: 1.35; white-space: normal; overflow-wrap: anywhere;">
                ${addressRoad}
              </div>
              <div id="address-detail-${id}" style="visibility: ${addressDetail ? "visible" : "hidden"}; min-height: 16px; margin-top: 6px; color: #a1a1aa; font-size: 12px; line-height: 1.35; white-space: normal; overflow-wrap: anywhere;">${addressDetail}</div>
            </div>

            <!-- Sparkline Graph -->
            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #27272a;">
               <span style="color: #71717a; font-size: 11px; font-weight: normal;">실시간 스트레스/감정 변화 (30초 간격)</span>
               <div id="sparkline-${id}" style="width: 200px; height: 50px;">
                 ${sparklineSvg}
               </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: AI Reasoning & Location (approx 65%) -->
        <div style="width: 65%; display: flex; flex-direction: column; background-color: #18181b;">
          <div style="padding: 16px 20px; flex-grow: 1; display: flex; flex-direction: column; gap: 12px;">
            
            <!-- STT Transcript Box (New) -->
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                <span style="color: #a1a1aa; font-size: 12px; font-weight: normal;">음성 인식 내용 (STT)</span>
              </div>
              <div style="font-size: 13px; color: #e4e4e7; line-height: 1.5; background-color: rgba(39, 39, 42, 0.5); padding: 10px 12px; border-radius: 8px; border: 1px solid #27272a; font-style: italic; max-height: 150px; overflow-y: auto;">
              "${displayTranscript}"
              </div>
            </div>

            <!-- AI Analysis Context -->
            <div style="display: flex; flex-direction: column; gap: 6px; flex-grow: 1;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span style="color: #a1a1aa; font-size: 12px; font-weight: normal;">AI 상황 맥락 분석</span>
              </div>
              <div style="margin: 0; font-size: 13.5px; color: #d4d4d8; line-height: 1.6; background-color: #27272a; padding: 12px 15px; border-radius: 8px; border: 1px solid #3f3f46; min-height: 200px; max-height: 350px; overflow-y: auto;">
                ${reasoningHtml}
                  </div>
                </div>


                <!-- Location -->
                <div style="display: flex; align-items: flex-start; gap: 8px; padding-top: 8px; border-top: 1px solid #27272a;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2" style="margin-top: 2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span style="color: #a1a1aa; font-size: 12px; line-height: 1.4;">
                    <span id="address-right-road-${id}" style="display: block; white-space: normal; overflow-wrap: anywhere;">${addressRoad}</span>
                    <span id="address-right-detail-${id}" style="display: block; visibility: ${addressDetail ? "visible" : "hidden"}; min-height: 14px; margin-top: 4px; white-space: normal; overflow-wrap: anywhere;">${addressDetail}</span>
                  </span>
                </div>
              </div>

              ${
                isCritical
                  ? `
                <div style="padding: 10px 20px; background-color: rgba(239, 68, 68, 0.15); border-top: 1px solid rgba(239, 68, 68, 0.3);">
                  <div style="display: flex; align-items: center; gap: 8px; color: #fca5a5; font-size: 12px; font-weight: 700;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    즉각적인 현장 개입이 필요합니다
                  </div>
                </div>
                `
                  : ""
              }
            </div>
          </div>
        </div>`;

      if (markersRef.current[id]) {
        // Update existing marker
        const marker = markersRef.current[id];
        marker.setLatLng([lat, lng]);
        marker.setIcon(customIcon);
        marker.setZIndexOffset(isSelected ? 1000 : 0);
        (marker as any).options.bubblingMouseEvents = false;
        if (!marker.isPopupOpen()) {
          marker.setPopupContent(popupContent);
        }
        
        // Removed unbindPopup/bindPopup to prevent flickering

        const onPopupOpen = function(this: L.Marker) {
          const el = document.getElementById(`sparkline-${id}`);
          if (el) {
            const base = isCritical ? 75 : (isCaution ? 55 : 30);
            // Preserve existing data if available to prevent jump, else init
            let data = sparklineDataRef.current[id];
            if (!data) {
                data = Array.from({ length: 20 }, () =>
                  Math.max(10, Math.min(95, base + (Math.random() - 0.5) * 6)),
                );
                sparklineDataRef.current[id] = data;
            }

            // Clear existing timer if any
            if (sparklineTimersRef.current[id]) clearInterval(sparklineTimersRef.current[id]);

            el.innerHTML = createSparklineSvgFromData(data, 200, 50, markerColor);
            
            const t = setInterval(() => {
              const arr = sparklineDataRef.current[id];
              if (!arr) return;
              const prev = arr[arr.length - 1] || base;
              const drift = (Math.random() - 0.5) * 1.5;
              const next = Math.max(10, Math.min(95, prev * 0.95 + (prev + drift) * 0.05));
              const nextArr = [...arr.slice(1), next];
              sparklineDataRef.current[id] = nextArr;
              el.innerHTML = createSparklineSvgFromData(nextArr, 200, 50, markerColor);
            }, 30000);
            sparklineTimersRef.current[id] = t;
          }
          
          // Removed manual panBy logic to prevent twitching
        };

        marker.off("popupopen");
        marker.off("popupclose");
        marker.off("click");
        marker.on("click", (e: any) => {
          const oe = e?.originalEvent || e;
          L.DomEvent.stopPropagation(oe);
          L.DomEvent.preventDefault(oe);
          
          if ((marker as any).togglePopup) {
            (marker as any).togglePopup();
          } else {
            if (marker.isPopupOpen()) marker.closePopup();
            else marker.openPopup();
          }
          onSelectCase(c);
        });
        marker.on("popupopen", onPopupOpen);
        marker.on("popupclose", () => {
          const t = sparklineTimersRef.current[id];
          if (t) {
            clearInterval(t);
            delete sparklineTimersRef.current[id];
          }
        });
        marker.on("popupopen", () => {
          const fallback = String(c.location?.address || "");
          ensureDetailedAddress(id, lat, lng, fallback);
        });

        // If popup is already open, re-init sparkline as content DOM is replaced
        if (marker.isPopupOpen()) {
            onPopupOpen.call(marker);
        }
        
      } else {
        // Create new marker
        const marker = L.marker([lat, lng], { icon: customIcon, bubblingMouseEvents: false }).addTo(mapRef.current!);

        marker.bindPopup(popupContent, {
          closeButton: true, // Enable close button
          offset: [0, -10],
          autoPan: true,
          autoPanPadding: [200, 200],
          autoPanPaddingTopLeft: [200, 200],
          autoPanPaddingBottomRight: [200, 200],
          className: "custom-crime-popup",
          closeOnClick: false
        });

        marker.off("click");
        marker.on("click", (e: any) => {
          const oe = e?.originalEvent || e;
          L.DomEvent.stopPropagation(oe);
          L.DomEvent.preventDefault(oe);
          
          if ((marker as any).togglePopup) {
            (marker as any).togglePopup();
          } else {
            if (marker.isPopupOpen()) marker.closePopup();
            else marker.openPopup();
          }
          onSelectCase(c);
        });

        marker
          .on("popupopen", function() {
            // When popup opens, set a reference to the marker for close functionality
            const popup = this.getPopup();
            if (popup) {
              (popup as any)._source = this;
            }
            const el = document.getElementById(`sparkline-${id}`);
            if (el) {
              const base = isCritical ? 75 : (isCaution ? 55 : 30);
              const init: number[] = Array.from({ length: 20 }, () =>
                Math.max(10, Math.min(95, base + (Math.random() - 0.5) * 6)),
              );
              sparklineDataRef.current[id] = init;
              el.innerHTML = createSparklineSvgFromData(init, 200, 50, markerColor);
              const t = setInterval(() => {
                const arr = sparklineDataRef.current[id] || init;
                const prev = arr[arr.length - 1] || base;
                const drift = (Math.random() - 0.5) * 1.5;
                const next = Math.max(10, Math.min(95, prev * 0.95 + (prev + drift) * 0.05));
                const nextArr = [...arr.slice(1), next];
                sparklineDataRef.current[id] = nextArr;
                el.innerHTML = createSparklineSvgFromData(nextArr, 200, 50, markerColor);
              }, 30000);
              sparklineTimersRef.current[id] = t;
            }
            // Removed manual panBy logic
            const fallback = String(c.location?.address || "");
            ensureDetailedAddress(id, lat, lng, fallback);
          })
          .on("popupclose", () => {
            const t = sparklineTimersRef.current[id];
            if (t) {
              clearInterval(t);
              delete sparklineTimersRef.current[id];
            }
          });

        markersRef.current[id] = marker;
      }
    });

    // Remove old markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!visibleIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Cleanup click handler on effect re-run or unmount
    return () => {
      isMounted = false;
      if (mapRef.current) {
        if (mapClickHandlerRef.current) {
          mapRef.current.off("click", mapClickHandlerRef.current);
        }
      }
    };
  }, [cases, selectedCase, mapReady, onSelectCase, policeStations, precincts]);

  // 3. Fly to Selected Case logic is now integrated into the main useEffect to avoid conflicts


  return (
    <>
      <style>{`
        .leaflet-popup-content-wrapper {
          background: #18181b !important;
          color: white !important;
          padding: 0 !important;
          border-radius: 12px !important;
          border: 1px solid #27272a !important;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.7) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .leaflet-popup-tip {
          background: #18181b !important;
          border: 1px solid #27272a !important;
        }
        /* Center the popup content exactly above the marker */
        .custom-crime-popup {
          transform: none;
          margin-left: 0;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-dash {
          animation: dash 1s linear infinite;
        }
        .route-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full bg-zinc-900" />
    </>
  );
};

export default CrimeMap;
