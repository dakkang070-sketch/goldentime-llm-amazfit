import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface CrimeMapProps {
  cases: any[];
  selectedCase: any | null;
  onSelectCase: (c: any) => void;
}

const CrimeMap: React.FC<CrimeMapProps> = ({
  cases,
  selectedCase,
  onSelectCase,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const lastFlyToRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

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
      attributionControl: false,
      zoomControl: false,
    });

    // Add Google Maps tile layer (Same as WorkingMap)
    L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      subdomains: ["0", "1", "2", "3"],
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

  // 2. Update Markers & Handle Map Interactions
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // Filter cases: Show all cases on the map
    const visibleCases = cases;

    const visibleIds = new Set(visibleCases.map((c) => c.id || c._id));

    // Handle map background click to deselect (Show all markers)
    const handleMapClick = () => {
      onSelectCase(null);
    };

    mapRef.current.off("click", handleMapClick);
    mapRef.current.on("click", handleMapClick);

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
      <!-- Main Horizontal Layout -->
      <div style="display: flex; flex-direction: row; min-height: 320px;">
        
        <!-- Left Panel: User Info & Status (approx 30%) -->
        <div style="width: 30%; border-right: 1px solid #27272a; display: flex; flex-direction: column; background-color: #1c1c1f;">
          <!-- Header -->
          <div style="padding: 16px 20px; background-color: #27272a; border-bottom: 1px solid #3f3f46;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${markerColor}; box-shadow: 0 0 10px ${markerColor};"></div>
                <span style="font-weight: normal; font-size: 18px; white-space: nowrap;">${c.name || "미확인"}</span>
                <span style="color: #a1a1aa; font-size: 14px;">(${c.age || "?"}세)</span>
              </div>
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
              <span style="color: #71717a; font-size: 11px; font-weight: normal;">접수 상태</span>
              <span style="color: #e4e4e7; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #10b981;"></span>
                ${c.id?.includes('report') ? '전화접수' : '모바일 신고 자동접수'}
              </span>
            </div>
          </div>
        </div>

        <!-- Right Panel: AI Reasoning & Location (approx 70%) -->
        <div style="width: 70%; display: flex; flex-direction: column; background-color: #18181b;">
          <div style="padding: 16px 20px; flex-grow: 1; display: flex; flex-direction: column; gap: 12px;">
            
            <!-- STT Transcript Box (New) -->
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                <span style="color: #a1a1aa; font-size: 12px; font-weight: normal;">음성 인식 내용 (STT)</span>
              </div>
              <div style="font-size: 13px; color: #e4e4e7; line-height: 1.5; background-color: rgba(39, 39, 42, 0.5); padding: 10px 12px; border-radius: 8px; border: 1px solid #27272a; font-style: italic;">
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
                    ${c.location?.address || "위치 정보 없음"}
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
        marker.setPopupContent(popupContent);
      } else {
        // Create new marker
        const marker = L.marker([lat, lng], { icon: customIcon })
          .addTo(mapRef.current!)
          .bindPopup(popupContent, {
            closeButton: false,
            offset: [0, -10],
            autoPanPadding: [50, 100],
            className: "custom-crime-popup",
          })
          .on("click", (e) => {
            L.DomEvent.stopPropagation(e); // Stop map click event (deselect)
            onSelectCase(c);
          })
          .on("mouseover", function (this: L.Marker) {
            this.openPopup();
          })
          .on("mouseout", function (this: L.Marker) {
            // If this marker is the selected case, don't close the popup
            const id = c.id || c._id;
            const isSelected = selectedCase && (selectedCase.id || selectedCase._id) === id;
            if (isSelected) return;
            
            this.closePopup();
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
      if (mapRef.current) {
        mapRef.current.off("click", handleMapClick);
      }
    };
  }, [cases, selectedCase, mapReady, onSelectCase]);

  // 3. Fly to Selected Case
  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedCase) return;

    const lat = selectedCase.location.lat;
    const lng = selectedCase.location.lng;
    const id = selectedCase.id || selectedCase._id;

    // Skip if we already flew to this case to prevent shaking
    if (lastFlyToRef.current === id) return;

    let timeoutId: any;

    if (lat && lng) {
      lastFlyToRef.current = id;
      mapRef.current.setView([lat, lng], 15, {
        animate: true,
        duration: 0.5,
      });

      // Auto-open popup for the selected case after a short delay
      const marker = markersRef.current[id];
      if (marker) {
        timeoutId = setTimeout(() => {
          marker.openPopup();
        }, 800); // Wait for flyTo to progress
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [selectedCase, mapReady]);

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
          transform: translateX(-50%);
          margin-left: 16px; /* Offset for marker center */
        }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full bg-zinc-900" />
    </>
  );
};

export default CrimeMap;
