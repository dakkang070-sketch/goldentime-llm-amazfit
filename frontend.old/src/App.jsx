import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { connectSocket, disconnectSocket, onSocketEvent, offSocketEvent } from './socket';

// Leaflet 아이콘 설정
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('controller_token'));
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    level5: 0,
    level4: 0,
    level3: 0,
    inProgress: 0,
    transporting: 0
  });
  const [paramedics, setParamedics] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchType, setMatchType] = useState(null); // 'paramedic' or 'hospital'
  const [isMatching, setIsMatching] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'detected', 'matched', 'in_progress', 'transporting', 'completed'
    emergencyLevel: 'all', // 'all', 3, 4, 5
    search: ''
  });
  const [sortBy, setSortBy] = useState('createdAt'); // 'createdAt', 'emergencyLevel', 'status'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [toast, setToast] = useState(null);
  const [biometricData, setBiometricData] = useState(null);
  const [biometricHistory, setBiometricHistory] = useState([]);
  const [baselineBiometric, setBaselineBiometric] = useState(null);

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      fetchCases();
      fetchParamedics();
      fetchHospitals();
      
      // Socket.IO 연결 및 실시간 업데이트
      const socket = connectSocket(token, 'controller');
      
      // 실시간 이벤트 리스너
      const handleCaseCreated = (caseData) => {
        console.log('새 응급 케이스 생성:', caseData);
        fetchCases(); // 목록 갱신
      };
      
      const handleCaseUpdated = (updateData) => {
        console.log('케이스 업데이트:', updateData);
        setCases(prevCases => {
          const updated = prevCases.map(c => 
            c._id === updateData.caseId ? { ...c, ...updateData } : c
          );
          // 새 케이스인 경우 추가
          if (!prevCases.find(c => c._id === updateData.caseId)) {
            fetchCases(); // 전체 갱신
            return prevCases;
          }
          // 선택된 케이스도 업데이트
          if (selectedCase && selectedCase._id === updateData.caseId) {
            setSelectedCase(prev => ({ ...prev, ...updateData }));
          }
          return updated;
        });
      };
      
      const handleParamedicLocationUpdated = (locationData) => {
        console.log('응급구조사 위치 업데이트:', locationData);
        // 케이스 목록에서 해당 응급구조사의 위치 업데이트
        setCases(prevCases => {
          return prevCases.map(c => {
            if (c._id === locationData.caseId && c.paramedic?.paramedicId?._id === locationData.paramedicId) {
              return {
                ...c,
                paramedic: {
                  ...c.paramedic,
                  paramedicId: {
                    ...c.paramedic.paramedicId,
                    currentLocation: locationData.location
                  }
                }
              };
            }
            return c;
          });
        });
        // 선택된 케이스도 업데이트
        if (selectedCase && selectedCase._id === locationData.caseId) {
          setSelectedCase(prev => ({
            ...prev,
            paramedic: {
              ...prev.paramedic,
              paramedicId: {
                ...prev.paramedic.paramedicId,
                currentLocation: locationData.location
              }
            }
          }));
        }
      };
      
      onSocketEvent('emergency_case_created', handleCaseCreated);
      onSocketEvent('case_updated', handleCaseUpdated);
      onSocketEvent('paramedic_location_updated', handleParamedicLocationUpdated);
      
      // 폴링도 유지 (백업용)
      const interval = setInterval(fetchCases, 10000); // 10초마다 갱신
      
      return () => {
        clearInterval(interval);
        offSocketEvent('emergency_case_created', handleCaseCreated);
        offSocketEvent('case_updated', handleCaseUpdated);
        offSocketEvent('paramedic_location_updated', handleParamedicLocationUpdated);
        disconnectSocket();
      };
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/controllers/login`, {
        email,
        password,
      });

      if (response.data.success) {
        setToken(response.data.token);
        localStorage.setItem('controller_token', response.data.token);
        setIsLoggedIn(true);
        setLoginError('');
      }
    } catch (error) {
      setLoginError(error.response?.data?.message || '로그인 실패');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCases = async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.emergencyLevel !== 'all') {
        params.emergencyLevel = filters.emergencyLevel;
      }

      const response = await axios.get(`${API_BASE_URL}/api/controllers/emergency-cases`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      if (response.data.success) {
        let casesData = response.data.cases || [];
        
        // 검색 필터 적용
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          casesData = casesData.filter(c => 
            c.userId?.name?.toLowerCase().includes(searchLower) ||
            c.userId?.phone?.includes(searchLower) ||
            c.paramedic?.paramedicId?.name?.toLowerCase().includes(searchLower) ||
            c.hospital?.hospitalId?.name?.toLowerCase().includes(searchLower)
          );
        }

        // 정렬 적용
        casesData.sort((a, b) => {
          let aValue, bValue;
          
          switch (sortBy) {
            case 'emergencyLevel':
              aValue = a.emergencyLevel || 0;
              bValue = b.emergencyLevel || 0;
              break;
            case 'status':
              aValue = a.status || '';
              bValue = b.status || '';
              break;
            case 'createdAt':
            default:
              aValue = new Date(a.createdAt || a.detectedAt || 0).getTime();
              bValue = new Date(b.createdAt || b.detectedAt || 0).getTime();
              break;
          }
          
          if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          } else {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
          }
        });

        setCases(casesData);
        
        // 통계 계산 (필터링 전 전체 데이터 기준)
        const allCases = response.data.cases || [];
        setStats({
          total: allCases.length,
          level5: allCases.filter(c => c.emergencyLevel === 5).length,
          level4: allCases.filter(c => c.emergencyLevel === 4).length,
          level3: allCases.filter(c => c.emergencyLevel === 3).length,
          inProgress: allCases.filter(c => c.status === 'in_progress').length,
          transporting: allCases.filter(c => c.status === 'transporting').length
        });
      }
    } catch (error) {
      console.error('케이스 조회 실패:', error);
      showToast('케이스 조회 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCases();
    }
  }, [filters.status, filters.emergencyLevel]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleLogout = () => {
    disconnectSocket();
    setToken(null);
    localStorage.removeItem('controller_token');
    setIsLoggedIn(false);
    setCases([]);
    setSelectedCase(null);
  };

  const closeModal = () => {
    setSelectedCase(null);
    setShowMatchModal(false);
    setMatchType(null);
    setBiometricData(null);
    setBiometricHistory([]);
    setBaselineBiometric(null);
  };

  // 선택된 케이스의 생체 데이터 가져오기
  const fetchBiometricData = async (caseId) => {
    if (!caseId) return;
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/controllers/emergency-cases/${caseId}/biometric`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setBiometricData(response.data.biometric);
        setBiometricHistory(response.data.history || []);
        setBaselineBiometric(response.data.baseline);
      }
    } catch (error) {
      console.error('생체 데이터 조회 실패:', error);
      setBiometricData(null);
      setBiometricHistory([]);
    }
  };

  // 선택된 케이스가 변경되면 생체 데이터 가져오기
  useEffect(() => {
    if (selectedCase?._id) {
      fetchBiometricData(selectedCase._id);
    }
  }, [selectedCase?._id]);

  const fetchParamedics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/controllers/paramedics/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setParamedics(response.data.paramedics || []);
      }
    } catch (error) {
      console.error('응급구조사 목록 조회 실패:', error);
    }
  };

  const fetchHospitals = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/controllers/hospitals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setHospitals(response.data.hospitals || []);
      }
    } catch (error) {
      console.error('병원 목록 조회 실패:', error);
    }
  };

  const handleManualMatch = async (id) => {
    if (!selectedCase || !matchType) return;

    try {
      setIsMatching(true);
      const endpoint = matchType === 'paramedic' 
        ? `/api/controllers/emergency-cases/${selectedCase._id}/match-paramedic`
        : `/api/controllers/emergency-cases/${selectedCase._id}/match-hospital`;
      
      const response = await axios.post(
        `${API_BASE_URL}${endpoint}`,
        { [matchType === 'paramedic' ? 'paramedicId' : 'hospitalId']: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast(response.data.message, 'success');
        fetchCases(); // 케이스 목록 갱신
        setShowMatchModal(false);
        setMatchType(null);
        // 선택된 케이스도 업데이트
        if (response.data.case) {
          setSelectedCase(response.data.case);
        }
      }
    } catch (error) {
      showToast(error.response?.data?.message || '매칭 실패', 'error');
    } finally {
      setIsMatching(false);
    }
  };

  const handleAutoMatch = async () => {
    if (!selectedCase || !matchType) return;

    try {
      setIsMatching(true);
      const endpoint = matchType === 'paramedic' 
        ? `/api/controllers/emergency-cases/${selectedCase._id}/match-paramedic`
        : `/api/controllers/emergency-cases/${selectedCase._id}/match-hospital`;
      
      const response = await axios.post(
        `${API_BASE_URL}${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast(response.data.message, 'success');
        fetchCases();
        setShowMatchModal(false);
        setMatchType(null);
        if (response.data.case || response.data.result) {
          fetchCases(); // 전체 갱신
        }
      }
    } catch (error) {
      showToast(error.response?.data?.message || '자동 매칭 실패', 'error');
    } finally {
      setIsMatching(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0b]">
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 w-full max-w-md shadow-2xl">
          <h2 className="text-2xl font-semibold text-[#e2e8f0] mb-6 text-center">LifeSync AI - 응급 관제 시스템</h2>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#a1a1aa] mb-2">이메일</label>
              <input 
                type="email" 
                name="email" 
                required 
                defaultValue="controller@test.com"
                className="w-full px-4 py-3 bg-[#27272a] border border-[#3f3f46] rounded-lg text-[#e2e8f0] focus:outline-none focus:border-[#71717a] focus:ring-2 focus:ring-[#3f3f46] transition"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#a1a1aa] mb-2">비밀번호</label>
              <input 
                type="password" 
                name="password" 
                required 
                defaultValue="test1234"
                className="w-full px-4 py-3 bg-[#27272a] border border-[#3f3f46] rounded-lg text-[#e2e8f0] focus:outline-none focus:border-[#71717a] focus:ring-2 focus:ring-[#3f3f46] transition"
              />
            </div>
            {loginError && <div className="mb-4 p-3 bg-[#7f1d1d] border border-[#991b1b] rounded-lg text-[#fca5a5] text-sm">{loginError}</div>}
            <button type="submit" className="w-full py-3 bg-[#3f3f46] hover:bg-[#52525b] text-[#e2e8f0] font-medium rounded-lg transition">로그인</button>
          </form>
        </div>
      </div>
    );
  }

  // 지도 중심점 및 줌 계산
  const getMapCenterAndBounds = () => {
    if (cases.length === 0) {
      return { center: [37.5665, 126.9780], zoom: 13 };
    }

    const locations = [];
    cases.forEach(c => {
      if (c.locations?.detectedAt) {
        locations.push([c.locations.detectedAt.lat, c.locations.detectedAt.lng]);
      }
      if (c.locations?.current) {
        locations.push([c.locations.current.lat, c.locations.current.lng]);
      }
      if (c.paramedic?.paramedicId?.currentLocation) {
        locations.push([
          c.paramedic.paramedicId.currentLocation.lat,
          c.paramedic.paramedicId.currentLocation.lng
        ]);
      }
      if (c.hospital?.hospitalId?.location) {
        locations.push([
          c.hospital.hospitalId.location.lat,
          c.hospital.hospitalId.location.lng
        ]);
      }
    });

    if (locations.length === 0) {
      return { center: [37.5665, 126.9780], zoom: 13 };
    }

    // 모든 위치의 중심점 계산
    const avgLat = locations.reduce((sum, [lat]) => sum + lat, 0) / locations.length;
    const avgLng = locations.reduce((sum, [, lng]) => sum + lng, 0) / locations.length;

    // 선택된 케이스가 있으면 그 위치로, 없으면 평균 위치로
    const center = selectedCase?.locations?.detectedAt || selectedCase?.locations?.current
      ? [selectedCase.locations.detectedAt?.lat || selectedCase.locations.current.lat,
         selectedCase.locations.detectedAt?.lng || selectedCase.locations.current.lng]
      : [avgLat, avgLng];

    return { center, zoom: locations.length > 1 ? 12 : 13 };
  };

  const { center, zoom } = getMapCenterAndBounds();

  return (
    <div id="app" className="flex flex-col h-screen bg-[#0a0a0b]">
      <div className="bg-[#18181b] border-b border-[#27272a] px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-[#ef4444] rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">+</span>
          </div>
          <h1 className="text-sm font-semibold text-[#e2e8f0]">DASHBOARD VIEW</h1>
        </div>
        <div className="flex-1 flex justify-center">
          <input
            type="text"
            placeholder="Q Case Search..."
            className="w-64 px-4 py-2 bg-[#27272a] border border-[#3f3f46] rounded-lg text-[#e2e8f0] placeholder-[#71717a] text-sm focus:outline-none focus:border-[#71717a] focus:ring-1 focus:ring-[#3f3f46] transition"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#a855f7] rounded"></div>
            <span className="text-xs text-[#e2e8f0]">AI NEURAL MATCHING ACTIVE</span>
          </div>
          <button onClick={handleLogout} className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#e2e8f0] text-xs font-medium rounded transition">
            로그아웃
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽: 환자 리스트 */}
        <div className="w-80 bg-[#18181b] border-r border-[#27272a] overflow-y-auto">
          <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#e2e8f0] flex items-center gap-2">
              <span className="text-[#ef4444]">🔥</span>
              QUEUE
            </h3>
            <button onClick={fetchCases} className="text-[#a1a1aa] hover:text-[#e2e8f0] transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          {/* 검색 */}
          <div className="p-4 border-b border-[#27272a]">
            <input
              type="text"
              placeholder="Q Case Search..."
              className="w-full px-3 py-2 bg-[#27272a] border border-[#3f3f46] rounded-lg text-[#e2e8f0] placeholder-[#71717a] text-sm focus:outline-none focus:border-[#71717a] focus:ring-1 focus:ring-[#3f3f46] transition"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          {/* 환자 리스트 */}
          <div className="p-2">

          {isLoading ? (
            <div className="text-center py-8 text-[#a1a1aa]">데이터 로딩 중...</div>
          ) : cases.length === 0 ? (
            <div className="text-center py-8 text-[#71717a]">
              현재 활성 응급 상황이 없습니다.
            </div>
          ) : (
            cases.map((c) => {
              const isSelected = selectedCase?._id === c._id;
              const loc = c.locations?.detectedAt || c.locations?.current;
              const age = c.userId?.age || '?';
              const gender = c.userId?.gender === 'male' ? 'M' : c.userId?.gender === 'female' ? 'F' : '?';
              
              return (
                <div
                  key={c._id}
                  className={`mb-2 p-3 bg-[#27272a] border ${
                    isSelected ? 'border-[#ef4444] bg-[#3f1f1f]' : 'border-[#3f3f46]'
                  } rounded-lg cursor-pointer hover:bg-[#3f3f46] transition`}
                  onClick={() => setSelectedCase(c)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-[#e2e8f0] font-semibold text-sm mb-1">
                        {c.userId?.name || '알 수 없음'}
                      </div>
                      <div className="text-xs text-[#a1a1aa] mb-1">
                        {age}Y {gender}
                      </div>
                      {isSelected && (
                        <div className="text-xs text-[#71717a] mb-1">
                          {biometricData?.heartRate || selectedCase.detectedAnomalies?.find(a => a.type === 'heart_rate')?.description?.match(/\d+/)?.[0] || '--'} BPM
                        </div>
                      )}
                      {loc && (
                        <div className="text-xs text-[#71717a] flex items-center gap-1">
                          <span>📍</span>
                          {loc.address || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button className="px-2 py-1 bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-medium rounded transition">
                        TO HOSPITAL →
                      </button>
                      <div className="text-xs text-[#71717a]">
                        {c._id.toString().slice(-2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
        
        {/* 가운데: 지도 */}
        <div className="flex-1 relative bg-black">
          <MapContainer 
            key={`${center[0]}-${center[1]}-${selectedCase?._id || 'none'}`}
            center={center} 
            zoom={zoom} 
            style={{ height: '100%', width: '100%' }}
            whenCreated={(mapInstance) => {
              // 선택된 케이스가 변경되면 지도 중심 이동
              if (selectedCase) {
                const loc = selectedCase.locations?.detectedAt || selectedCase.locations?.current;
                if (loc) {
                  mapInstance.setView([loc.lat, loc.lng], 15);
                }
              }
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {cases.map((c) => {
              const loc = c.locations?.detectedAt || c.locations?.current;
              if (!loc || !loc.lat || !loc.lng) return null;

              const getColor = (level) => {
                if (level === 5) return '#f44336';
                if (level === 4) return '#ff9800';
                return '#ffc107';
              };

              return (
                <React.Fragment key={c._id}>
                  {/* 환자 위치 마커 - "119" 형식 */}
                  <Marker
                    position={[loc.lat, loc.lng]}
                    eventHandlers={{
                      click: () => setSelectedCase(c),
                    }}
                    icon={L.divIcon({
                      className: 'custom-marker',
                      html: `
                        <div style="
                          width: 40px;
                          height: 40px;
                          background: #ef4444;
                          border: 2px solid white;
                          border-radius: 50%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          color: white;
                          font-weight: bold;
                          font-size: 12px;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        ">
                          119
                        </div>
                      `,
                      iconSize: [40, 40],
                      iconAnchor: [20, 20]
                    })}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>{c.userId?.name || '알 수 없음'}</strong>
                        <br />
                        <span className="text-xs text-[#71717a]">
                          {c.locations?.detectedAt?.address?.split(' ')[0] || '강남'} {c._id.toString().slice(-2)}
                        </span>
                        <br />
                        응급도: {c.emergencyLevel}단계
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* 응급구조사 위치 마커 */}
                  {c.paramedic?.paramedicId?.currentLocation && 
                   c.paramedic.status !== 'completed' && (
                    <Marker
                      position={[
                        c.paramedic.paramedicId.currentLocation.lat,
                        c.paramedic.paramedicId.currentLocation.lng
                      ]}
                      icon={L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                      })}
                    >
                      <Popup>
                        <div>
                          <strong>응급구조사: {c.paramedic.paramedicId.name || '알 수 없음'}</strong>
                          <br />
                          상태: {c.paramedic.status}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  
                  {/* 병원 위치 마커 */}
                  {c.hospital?.hospitalId?.location && (
                    <Marker
                      position={[
                        c.hospital.hospitalId.location.lat,
                        c.hospital.hospitalId.location.lng
                      ]}
                      icon={L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                      })}
                    >
                      <Popup>
                        <div>
                          <strong>병원: {c.hospital.hospitalId.name || '알 수 없음'}</strong>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </React.Fragment>
              );
            })}
            {selectedCase?.route?.toPatient && (() => {
              const route = selectedCase.route.toPatient;
              // GeoJSON 형식 지원
              let positions = [];
              if (route.geometry && route.geometry.coordinates) {
                positions = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // [lat, lng]
              } else if (route.waypoints) {
                positions = route.waypoints.map(w => [w.lat, w.lng]);
              }
              return positions.length > 0 ? (
                <Polyline
                  positions={positions}
                  color="#4fc3f7"
                  weight={4}
                  opacity={0.7}
                />
              ) : null;
            })()}
            {selectedCase?.route?.toHospital && (() => {
              const route = selectedCase.route.toHospital;
              // GeoJSON 형식 지원
              let positions = [];
              if (route.geometry && route.geometry.coordinates) {
                positions = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // [lat, lng]
              } else if (route.waypoints) {
                positions = route.waypoints.map(w => [w.lat, w.lng]);
              }
              return positions.length > 0 ? (
                <Polyline
                  positions={positions}
                  color="#ff9800"
                  weight={4}
                  opacity={0.7}
                />
              ) : null;
            })()}
          </MapContainer>
          
          {/* 지도 하단 상태 바 */}
          {selectedCase && (
            <div className="absolute bottom-0 left-0 right-0 bg-[#18181b] border-t border-[#27272a] p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-xs text-[#a1a1aa] mb-1">MISSION STATUS</div>
                    <div className="text-sm text-[#e2e8f0]">주변 상황 관제 중</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a1a1aa] mb-1">TARGET DESTINATION</div>
                    <div className="text-sm text-[#e2e8f0]">
                      {selectedCase.hospital?.hospitalId?.name || '미배정'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 bg-[#ef4444] text-white text-xs font-semibold rounded-full mb-1">
                    {selectedCase.locations?.detectedAt?.address?.split(' ')[0] || '강남'} {selectedCase._id.toString().slice(-2)}
                  </div>
                  <div className="text-xs text-[#a1a1aa]">REAL-TIME GPS TRACKING</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 오른쪽: 선택된 환자 상세 정보 */}
        {selectedCase ? (
          <div className="w-96 bg-[#18181b] border-l border-[#27272a] overflow-y-auto">
            {/* 환자 헤더 */}
            <div className="p-4 border-b border-[#27272a]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[#27272a] rounded-full flex items-center justify-center text-[#e2e8f0] font-semibold">
                  {selectedCase.userId?.name?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-[#e2e8f0]">
                    {selectedCase.userId?.name || '알 수 없음'}
                  </div>
                  <div className="text-sm text-[#a1a1aa]">
                    {selectedCase.userId?.age || '?'}Y {selectedCase.userId?.gender === 'male' ? 'M' : selectedCase.userId?.gender === 'female' ? 'F' : '?'}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="px-2 py-1 bg-[#ef4444] text-white text-xs font-semibold rounded">
                    CRITICAL
                  </span>
                  <button className="px-2 py-1 bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-medium rounded transition">
                    TO HOSPITAL
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs text-[#71717a]">
                  {selectedCase.locations?.detectedAt?.address?.split(' ')[0] || '강남'} {selectedCase._id.toString().slice(-2)}
                </div>
                <button className="px-2 py-1 bg-[#27272a] hover:bg-[#3f3f46] text-[#e2e8f0] text-xs font-medium rounded transition">
                  EMERGENCY OVERRIDE
                </button>
              </div>
            </div>

            {/* BIO-DATA 섹션 */}
            <div className="p-4 border-b border-[#27272a]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#e2e8f0] flex items-center gap-2">
                  <span>⚡</span>
                  BIO-DATA
                </h3>
              </div>
              
              {/* BPM, SPO2 표시 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-[#27272a] border border-[#3f3f46] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-[#ef4444] mb-1">
                    {biometricData?.heartRate || selectedCase.detectedAnomalies?.find(a => a.type === 'heart_rate')?.description?.match(/\d+/)?.[0] || '--'}
                  </div>
                  <div className="text-xs text-[#a1a1aa]">BPM</div>
                  <div className="w-3 h-3 bg-[#ef4444] rounded-full mx-auto mt-2"></div>
                </div>
                <div className="bg-[#27272a] border border-[#3f3f46] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-[#3b82f6] mb-1">
                    {biometricData?.heartRate ? Math.max(85, 100 - Math.floor((biometricData.stressLevel || 0) / 2)) : '91'}%
                  </div>
                  <div className="text-xs text-[#a1a1aa]">SPO2</div>
                  <div className="w-3 h-3 bg-[#3b82f6] rounded-full mx-auto mt-2"></div>
                </div>
              </div>

              {/* 생체 데이터 그래프 */}
              <div className="bg-[#27272a] border border-[#3f3f46] rounded-lg p-4">
                <div className="h-32 relative">
                  <svg width="100%" height="100%" className="overflow-visible" style={{ position: 'absolute', top: 0, left: 0 }}>
                    {/* 그리드 라인 */}
                    {[0, 25, 50, 75, 100].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={`${100 - y}%`}
                        x2="100%"
                        y2={`${100 - y}%`}
                        stroke="#3f3f46"
                        strokeWidth="1"
                      />
                    ))}
                    
                    {/* 심박수 라인 (빨간색) */}
                    {biometricHistory.length > 1 ? (
                      <polyline
                        points={biometricHistory.map((d, i) => {
                          const x = (i / (biometricHistory.length - 1)) * 100;
                          const hr = d.heartRate || (baselineBiometric?.heartRate?.avg || 70);
                          const y = 100 - ((Math.min(200, Math.max(0, hr)) / 200) * 100); // 0-200 bpm 범위
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                      />
                    ) : (
                      // 기본 라인 (데이터가 없을 때)
                      <line
                        x1="0"
                        y1="50%"
                        x2="100%"
                        y2="50%"
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        opacity="0.5"
                      />
                    )}
                    
                    {/* SPO2 라인 (파란색) */}
                    {biometricHistory.length > 1 ? (
                      <polyline
                        points={biometricHistory.map((d, i) => {
                          const x = (i / (biometricHistory.length - 1)) * 100;
                          const spo2 = Math.max(85, 100 - Math.floor((d.stressLevel || 0) / 2));
                          const y = 100 - (((spo2 - 85) / 15) * 100); // 85-100% 범위를 0-100%로 매핑
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                    ) : (
                      // 기본 라인 (데이터가 없을 때)
                      <line
                        x1="0"
                        y1="30%"
                        x2="100%"
                        y2="30%"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        opacity="0.5"
                      />
                    )}
                  </svg>
                  
                  {/* 시간 축 레이블 */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-[#71717a] px-2">
                    {biometricHistory.length > 0 ? (
                      <>
                        <span>
                          {new Date(biometricHistory[0]?.collectedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span>
                          {new Date(biometricHistory[biometricHistory.length - 1]?.collectedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>오후 04:27:16</span>
                        <span>오후 04:29:15</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* NEURAL DIAGNOSIS 섹션 */}
            {selectedCase.llmAnalysis && (
              <div className="p-4 border-b border-[#27272a]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#e2e8f0] flex items-center gap-2">
                    <span>🧠</span>
                    NEURAL DIAGNOSIS
                  </h3>
                  <button onClick={() => fetchBiometricData(selectedCase._id)} className="text-[#a1a1aa] hover:text-[#e2e8f0] transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <div className="bg-[#27272a] border border-[#3f3f46] rounded-lg p-3 text-sm text-[#e2e8f0] leading-relaxed">
                  {selectedCase.llmAnalysis.analysisText || '웨어러블 데이터 연동 일시적 지연. 현장 수동 확인 및 생체 신호 재스캔이 필요합니다.'}
                </div>
                {selectedCase.llmAnalysis.model && (
                  <div className="mt-2 text-xs text-[#71717a]">
                    모델: {selectedCase.llmAnalysis.model}
                  </div>
                )}
              </div>
            )}

            {/* 추가 정보 */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">추가 정보</h3>
              
              {selectedCase.detectedAnomalies && selectedCase.detectedAnomalies.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-[#a1a1aa] mb-2">감지된 이상 징후</div>
                  <div className="space-y-1">
                    {selectedCase.detectedAnomalies.map((anomaly, idx) => (
                      <div key={idx} className="p-2 bg-[#27272a] border-l-2 rounded text-xs" style={{
                        borderLeftColor: anomaly.severity === 'critical' ? '#ef4444' :
                                        anomaly.severity === 'high' ? '#f59e0b' :
                                        '#eab308'
                      }}>
                        <div className="text-[#e2e8f0] font-medium">{anomaly.type}</div>
                        <div className="text-[#a1a1aa]">{anomaly.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCase.paramedic?.paramedicId && (
                <div className="mb-3">
                  <div className="text-xs text-[#a1a1aa] mb-1">응급구조사</div>
                  <div className="text-sm text-[#e2e8f0]">
                    {selectedCase.paramedic.paramedicId.name}
                  </div>
                </div>
              )}

              {selectedCase.hospital?.hospitalId && (
                <div className="mb-3">
                  <div className="text-xs text-[#a1a1aa] mb-1">목적지 병원</div>
                  <div className="text-sm text-[#e2e8f0]">
                    {selectedCase.hospital.hospitalId.name}
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {(!selectedCase.paramedic || selectedCase.paramedic.status === 'pending') && (
                  <button 
                    className="flex-1 px-3 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#e2e8f0] text-xs font-medium rounded transition"
                    onClick={() => {
                      setMatchType('paramedic');
                      setShowMatchModal(true);
                    }}
                  >
                    응급구조사 매칭
                  </button>
                )}
                {(!selectedCase.hospital || selectedCase.hospital.status === 'pending') && (
                  <button 
                    className="flex-1 px-3 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#e2e8f0] text-xs font-medium rounded transition"
                    onClick={() => {
                      setMatchType('hospital');
                      setShowMatchModal(true);
                    }}
                  >
                    병원 매칭
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-96 bg-[#18181b] border-l border-[#27272a] flex items-center justify-center">
            <div className="text-center text-[#71717a]">
              <div className="text-4xl mb-4">👤</div>
              <div className="text-sm">환자를 선택하면 상세 정보가 표시됩니다</div>
            </div>
          </div>
        )}
      </div>

      {/* 매칭 모달 */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowMatchModal(false); setMatchType(null); }}>
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl w-[90%] max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#27272a] flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#e2e8f0]">{matchType === 'paramedic' ? '응급구조사 매칭' : '병원 매칭'}</h2>
              <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#e2e8f0] transition" onClick={() => { setShowMatchModal(false); setMatchType(null); }}>×</button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <button 
                  className="w-full py-3 bg-[#22c55e] hover:bg-[#16a34a] disabled:bg-[#71717a] disabled:cursor-not-allowed text-white font-medium rounded-lg transition mb-4"
                  onClick={handleAutoMatch}
                  disabled={isMatching}
                >
                  {isMatching ? '매칭 중...' : '자동 매칭'}
                </button>
                <div className="text-center text-[#71717a] mb-4">또는</div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <h3 className="mb-4 text-[#60a5fa] font-semibold">
                  {matchType === 'paramedic' ? '사용 가능한 응급구조사' : '병원 목록'}
                </h3>
                {matchType === 'paramedic' ? (
                  paramedics.length === 0 ? (
                    <div className="text-center py-8 text-[#71717a]">
                      사용 가능한 응급구조사가 없습니다.
                    </div>
                  ) : (
                    paramedics.map((p) => (
                      <div 
                        key={p._id} 
                        className="p-4 mb-3 bg-[#27272a] border border-[#3f3f46] rounded-lg cursor-pointer hover:bg-[#3f3f46] transition"
                        onClick={() => handleManualMatch(p._id)}
                        style={{ cursor: isMatching ? 'not-allowed' : 'pointer', opacity: isMatching ? 0.6 : 1 }}
                      >
                        <div>
                          <strong className="text-[#e2e8f0]">{p.name}</strong>
                          <div className="text-sm text-[#a1a1aa] mt-1">
                            {p.phone} • {p.status === 'available' ? '대기 중' : '근무 중'}
                          </div>
                          {p.currentLocation && (
                            <div className="text-xs text-[#71717a] mt-1">
                              위치: {p.currentLocation.lat.toFixed(4)}, {p.currentLocation.lng.toFixed(4)}
                            </div>
                          )}
                        </div>
                        <button 
                          className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] disabled:bg-[#71717a] disabled:cursor-not-allowed text-[#e2e8f0] text-sm font-medium rounded-lg transition"
                          disabled={isMatching}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManualMatch(p._id);
                          }}
                        >
                          선택
                        </button>
                      </div>
                    ))
                  )
                ) : (
                  hospitals.length === 0 ? (
                    <div className="text-center py-8 text-[#71717a]">
                      등록된 병원이 없습니다.
                    </div>
                  ) : (
                    hospitals.map((h) => (
                      <div 
                        key={h._id} 
                        className="p-4 mb-3 bg-[#27272a] border border-[#3f3f46] rounded-lg cursor-pointer hover:bg-[#3f3f46] transition"
                        onClick={() => handleManualMatch(h._id)}
                        style={{ cursor: isMatching ? 'not-allowed' : 'pointer', opacity: isMatching ? 0.6 : 1 }}
                      >
                        <div>
                          <strong className="text-[#e2e8f0]">{h.name}</strong>
                          <div className="text-sm text-[#a1a1aa] mt-1">
                            {h.location?.address || '주소 정보 없음'}
                          </div>
                          {h.emergencyRoom && (
                            <div className="text-xs text-[#71717a] mt-1">
                              응급실: {h.emergencyRoom.available ? '가용' : '만원'} ({h.emergencyRoom.waitTime || 0}분 대기)
                            </div>
                          )}
                        </div>
                        <button 
                          className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] disabled:bg-[#71717a] disabled:cursor-not-allowed text-[#e2e8f0] text-sm font-medium rounded-lg transition"
                          disabled={isMatching}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManualMatch(h._id);
                          }}
                        >
                          선택
                        </button>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 알림 */}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-lg text-white font-medium z-50 shadow-lg ${
          toast.type === 'success' ? 'bg-[#22c55e]' :
          toast.type === 'error' ? 'bg-[#ef4444]' :
          'bg-[#3b82f6]'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
