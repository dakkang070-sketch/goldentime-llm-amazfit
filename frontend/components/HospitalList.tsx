import React, { useEffect, useState } from 'react';
import { Crosshair, MapPin, Phone, Clock, Activity } from 'lucide-react';
import { Patient, Hospital } from '../types';
import { apiService } from '../services/apiService';

interface HospitalListProps {
  patient: Patient;
  hospital?: Hospital;
}

const HospitalList: React.FC<HospitalListProps> = ({ patient, hospital }) => {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState<any>(null);

  // 병원 데이터 로딩
  useEffect(() => {
    const loadHospitals = async () => {
      try {
        console.log('🏥 병원 데이터 로딩');
        const response = await apiService.getMapHospitals();
        
        if (response.success && response.data?.hospitals) {
          console.log(`✅ ${response.data.hospitals.length}개 병원 로딩 성공`);
          
          // 거리 계산해서 가까운 순으로 정렬
          const hospitalsWithDistance = response.data.hospitals.map((h: any) => {
            const distance = calculateDistance(patient.lat, patient.lng, h.lat, h.lng);
            return { ...h, distance: distance.toFixed(1) };
          }).sort((a: any, b: any) => parseFloat(a.distance) - parseFloat(b.distance));
          
          setHospitals(hospitalsWithDistance.slice(0, 50)); // 상위 50개만
        } else {
          // 테스트 데이터
          const testHospitals = [
            { 
              id: '1', name: '서울대학교병원', lat: 37.5796, lng: 127.0001, 
              status: 'available', distance: '2.3',
              location: '서울특별시 종로구 대학로 101',
              phone: '02-2072-2114',
              emergencyBeds: { available: 15, total: 25 }
            },
            { 
              id: '2', name: '세브란스병원', lat: 37.5623, lng: 126.9408, 
              status: 'busy', distance: '3.1',
              location: '서울특별시 서대문구 연세로 50-1',
              phone: '02-2228-5800',
              emergencyBeds: { available: 3, total: 20 }
            },
            { 
              id: '3', name: '삼성서울병원', lat: 37.4882, lng: 127.0851, 
              status: 'available', distance: '4.7',
              location: '서울특별시 강남구 일원로 81',
              phone: '02-3410-2114',
              emergencyBeds: { available: 8, total: 30 }
            },
            { 
              id: '4', name: '서울아산병원', lat: 37.5266, lng: 127.1082, 
              status: 'available', distance: '5.2',
              location: '서울특별시 송파구 올림픽로43길 88',
              phone: '02-3010-3114',
              emergencyBeds: { available: 12, total: 35 }
            },
            { 
              id: '5', name: '고려대학교안암병원', lat: 37.5902, lng: 127.0263, 
              status: 'busy', distance: '6.1',
              location: '서울특별시 성북구 고려대로 73',
              phone: '02-920-5000',
              emergencyBeds: { available: 2, total: 18 }
            }
          ];
          
          console.log('🔧 테스트 병원 데이터 사용');
          setHospitals(testHospitals);
        }
      } catch (error) {
        console.error('❌ 병원 데이터 로딩 실패:', error);
        setHospitals([]);
      } finally {
        setLoading(false);
      }
    };

    loadHospitals();
  }, [patient.lat, patient.lng]);

  // 거리 계산 함수 (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-400 bg-green-400/10';
      case 'busy': return 'text-yellow-400 bg-yellow-400/10';
      case 'full': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return '여유 🟢';
      case 'busy': return '혼잡 🟡';
      case 'full': return '포화 🔴';
      default: return '정상 ⚪';
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-[#0a0a0b] flex items-center justify-center">
        <div className="bg-zinc-900/90 border border-white/10 p-6 rounded-xl shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="text-zinc-300">
              <div className="font-medium">병원 정보 로딩 중...</div>
              <div className="text-sm text-zinc-400 mt-1">가까운 병원 검색</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0a0a0b] flex flex-col">
      {/* 헤더 */}
      <div className="bg-zinc-900/90 border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-white font-semibold">가까운 응급의료기관</h2>
              <p className="text-zinc-400 text-sm">환자: {patient.name} 기준</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-zinc-300 font-medium">{hospitals.length}개 병원</div>
            <div className="text-zinc-400 text-sm">거리순 정렬</div>
          </div>
        </div>
      </div>

      {/* 병원 리스트 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {hospitals.map((hospitalData, index) => {
          const isMatched = hospital && hospital.name === hospitalData.name;
          const isSelected = selectedHospital?.id === hospitalData.id;
          
          return (
            <div
              key={hospitalData.id}
              onClick={() => setSelectedHospital(hospitalData)}
              className={`bg-zinc-900/60 border rounded-xl p-4 transition-all cursor-pointer hover:bg-zinc-800/60 ${
                isMatched 
                  ? 'border-red-500/50 bg-red-900/20' 
                  : isSelected
                  ? 'border-blue-500/50 bg-blue-900/20'
                  : 'border-white/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-medium">{hospitalData.name}</h3>
                    {isMatched && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                        🎯 매칭됨
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(hospitalData.status)}`}>
                      {getStatusText(hospitalData.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <MapPin className="w-4 h-4 text-zinc-500" />
                      <span>{hospitalData.location || '주소 정보 없음'}</span>
                    </div>
                    
                    {hospitalData.phone && (
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Phone className="w-4 h-4 text-zinc-500" />
                        <span>{hospitalData.phone}</span>
                      </div>
                    )}
                    
                    {hospitalData.emergencyBeds && (
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Activity className="w-4 h-4 text-zinc-500" />
                        <span>
                          응급실: {hospitalData.emergencyBeds.available}/{hospitalData.emergencyBeds.total}개 가용
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-white font-semibold text-lg">{hospitalData.distance}km</div>
                  <div className="text-zinc-400 text-xs">거리</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 상태바 */}
      <div className="bg-zinc-900/90 border-t border-white/10 p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-4">
            <span className="text-green-400">
              여유: {hospitals.filter(h => h.status === 'available').length}개
            </span>
            <span className="text-yellow-400">
              혼잡: {hospitals.filter(h => h.status === 'busy').length}개
            </span>
            <span className="text-red-400">
              포화: {hospitals.filter(h => h.status === 'full').length}개
            </span>
          </div>
          <div className="text-zinc-400">
            📍 환자 위치: {patient.lat.toFixed(4)}, {patient.lng.toFixed(4)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalList;