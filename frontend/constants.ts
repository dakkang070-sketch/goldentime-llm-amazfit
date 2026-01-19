
import { Patient, Hospital, PatientStatus, Ambulance, AmbulanceStatus, FireStation } from './types';

// 서울 지역 소방서 위치
export const FIRE_STATIONS: FireStation[] = [
  { id: 'fs1', name: '서울종로소방서', location: '종로구', lat: 37.5735, lng: 126.9786 },
  { id: 'fs2', name: '서울중구소방서', location: '중구', lat: 37.5641, lng: 126.9979 },
  { id: 'fs3', name: '서울용산소방서', location: '용산구', lat: 37.5326, lng: 126.9906 },
  { id: 'fs4', name: '서울성동소방서', location: '성동구', lat: 37.5506, lng: 127.0409 },
  { id: 'fs5', name: '서울광진소방서', location: '광진구', lat: 37.5384, lng: 127.0822 },
  { id: 'fs6', name: '서울동대문소방서', location: '동대문구', lat: 37.5744, lng: 127.0396 },
  { id: 'fs7', name: '서울중랑소방서', location: '중랑구', lat: 37.6063, lng: 127.0923 },
  { id: 'fs8', name: '서울성북소방서', location: '성북구', lat: 37.6067, lng: 127.0181 },
  { id: 'fs9', name: '서울강북소방서', location: '강북구', lat: 37.6392, lng: 127.0157 },
  { id: 'fs10', name: '서울도봉소방서', location: '도봉구', lat: 37.6686, lng: 127.0473 }
];

// 서울 지역 랜덤 좌표 생성 함수
const generateRandomSeoulCoords = (): { lat: number; lng: number } => {
  // 서울 지역 경계: 위도 37.4 ~ 37.7, 경도 126.8 ~ 127.2
  const minLat = 37.4;
  const maxLat = 37.7;
  const minLng = 126.8;
  const maxLng = 127.2;
  
  const lat = minLat + Math.random() * (maxLat - minLat);
  const lng = minLng + Math.random() * (maxLng - minLng);
  
  return { lat, lng };
};

// 구급차를 랜덤 위치에 배치 (원래는 응급구조사 앱 위치 기반이어야 함)
// 서울시 119응급구조차 150대를 서울 전역에 랜덤 배치
export const INITIAL_AMBULANCES: Ambulance[] = Array.from({ length: 150 }, (_, i) => {
  // 서울시 25개 구 목록
  const districtNames = [
    '종로', '중구', '용산', '성동', '광진', '동대문', '중랑', '성북', '강북', '도봉',
    '노원', '은평', '서대문', '마포', '양천', '강서', '구로', '금천', '영등포', '동작',
    '관악', '서초', '강남', '송파', '강동'
  ];
  
  // 각 구별로 평균 6대씩 배치 (150대 / 25개 구 = 6대)
  const districtIndex = i % districtNames.length;
  const districtName = districtNames[districtIndex];
  const unitNumber = String(Math.floor(i / districtNames.length) + 1).padStart(2, '0');
  
  // ALS와 BLS를 적절히 배분 (약 30% ALS, 70% BLS)
  const type = i % 10 < 3 ? 'ALS' : 'BLS';
  
  return {
    id: `a${i + 1}`,
    unitName: `${districtName} 119-${unitNumber}`,
    ...generateRandomSeoulCoords(),
    status: AmbulanceStatus.AVAILABLE,
    type: type as 'ALS' | 'BLS'
  };
});

export const INITIAL_HOSPITALS: Hospital[] = [
  {
    id: 'h1',
    name: '서울대학교병원 (본원)',
    location: '서울 종로구',
    lat: 37.5796,
    lng: 127.0001,
    availableBeds: 5,
    totalBeds: 200,
    icuBeds: { available: 2, total: 30 },
    erBeds: { available: 3, total: 40 },
    operatingRooms: { available: 1, total: 15 },
    specialties: ['권역외상센터', '심장혈관', '신경외과'],
    surgicalCapabilities: [{ name: '개심술', isAvailable: true }, { name: '뇌혈관수술', isAvailable: true }],
    bloodSupply: 'Normal',
    distance: '2.4 km',
    isEROpen: true,
    activeTraumaLevel: 1
  },
  {
    id: 'h2',
    name: '세브란스병원',
    location: '서울 서대문구',
    lat: 37.5623,
    lng: 126.9408,
    availableBeds: 8,
    totalBeds: 180,
    icuBeds: { available: 4, total: 25 },
    erBeds: { available: 4, total: 35 },
    operatingRooms: { available: 2, total: 12 },
    specialties: ['심장혈관센터', '소아응급'],
    surgicalCapabilities: [{ name: '판막치환술', isAvailable: true }],
    bloodSupply: 'Normal',
    distance: '3.1 km',
    isEROpen: true,
    activeTraumaLevel: 1
  },
  {
    id: 'h3',
    name: '서울아산병원',
    location: '서울 송파구',
    lat: 37.5266,
    lng: 127.1082,
    availableBeds: 15,
    totalBeds: 350,
    icuBeds: { available: 6, total: 50 },
    erBeds: { available: 10, total: 60 },
    operatingRooms: { available: 4, total: 20 },
    specialties: ['장기이식', '응급센터'],
    surgicalCapabilities: [{ name: '간이식', isAvailable: true }],
    bloodSupply: 'Low',
    distance: '5.8 km',
    isEROpen: true,
    activeTraumaLevel: 1
  },
  {
    id: 'h4',
    name: '삼성서울병원',
    location: '서울 강남구',
    lat: 37.4882,
    lng: 127.0851,
    availableBeds: 4,
    totalBeds: 250,
    icuBeds: { available: 1, total: 40 },
    erBeds: { available: 2, total: 50 },
    operatingRooms: { available: 1, total: 18 },
    specialties: ['암센터', '뇌신경'],
    surgicalCapabilities: [{ name: '감마나이프', isAvailable: true }],
    bloodSupply: 'Normal',
    distance: '4.2 km',
    isEROpen: true,
    activeTraumaLevel: 1
  },
  {
    id: 'h5',
    name: '가톨릭대 서울성모병원',
    location: '서울 서초구',
    lat: 37.5029,
    lng: 127.0048,
    availableBeds: 7,
    totalBeds: 220,
    icuBeds: { available: 3, total: 35 },
    erBeds: { available: 5, total: 45 },
    operatingRooms: { available: 2, total: 14 },
    specialties: ['혈액종양', '안과'],
    surgicalCapabilities: [{ name: '골수이식', isAvailable: true }],
    bloodSupply: 'Normal',
    distance: '1.5 km',
    isEROpen: true,
    activeTraumaLevel: 1
  },
  {
    id: 'h6',
    name: '고려대 안암병원',
    location: '서울 성북구',
    lat: 37.5871,
    lng: 127.0264,
    availableBeds: 6,
    totalBeds: 190,
    icuBeds: { available: 2, total: 28 },
    erBeds: { available: 4, total: 38 },
    operatingRooms: { available: 1, total: 12 },
    specialties: ['로봇수술', '심혈관'],
    surgicalCapabilities: [{ name: '흉강경수술', isAvailable: true }],
    bloodSupply: 'Critical',
    distance: '6.5 km',
    isEROpen: true,
    activeTraumaLevel: 2
  },
  {
    id: 'h7',
    name: '한양대학교병원',
    location: '서울 성동구',
    lat: 37.5592,
    lng: 127.0445,
    availableBeds: 10,
    totalBeds: 160,
    icuBeds: { available: 5, total: 22 },
    erBeds: { available: 6, total: 32 },
    operatingRooms: { available: 3, total: 10 },
    specialties: ['류마티스', '소화기'],
    surgicalCapabilities: [{ name: '내시경수술', isAvailable: true }],
    bloodSupply: 'Normal',
    distance: '4.8 km',
    isEROpen: true,
    activeTraumaLevel: 2
  },
  {
    id: 'h8',
    name: '건국대학교병원',
    location: '서울 광진구',
    lat: 37.5408,
    lng: 127.0718,
    availableBeds: 3,
    totalBeds: 140,
    icuBeds: { available: 0, total: 18 },
    erBeds: { available: 2, total: 28 },
    operatingRooms: { available: 0, total: 9 },
    specialties: ['심장혈관', '유방암'],
    surgicalCapabilities: [{ name: '스텐트수술', isAvailable: true }],
    bloodSupply: 'Low',
    distance: '7.2 km',
    isEROpen: true,
    activeTraumaLevel: 2
  },
  {
    id: 'h9',
    name: '경희대학교병원',
    location: '서울 동대문구',
    lat: 37.5898,
    lng: 127.0519,
    availableBeds: 8,
    totalBeds: 180,
    icuBeds: { available: 3, total: 25 },
    erBeds: { available: 4, total: 35 },
    operatingRooms: { available: 2, total: 12 },
    specialties: ['심장내과', '신경외과', '구강악안면외과'],
    surgicalCapabilities: [{ name: '인공관절수술', isAvailable: true }, { name: '심장박동기', isAvailable: true }],
    bloodSupply: 'Normal',
    distance: '8.4 km',
    isEROpen: true,
    activeTraumaLevel: 2
  },
  {
    id: 'h10',
    name: '중앙대학교병원',
    location: '서울 동작구',
    lat: 37.5065,
    lng: 126.9575,
    availableBeds: 12,
    totalBeds: 170,
    icuBeds: { available: 4, total: 22 },
    erBeds: { available: 7, total: 30 },
    operatingRooms: { available: 3, total: 10 },
    specialties: ['순환기내과', '혈액종양내과'],
    surgicalCapabilities: [{ name: '혈관성형술', isAvailable: true }],
    bloodSupply: 'Normal',
    distance: '3.5 km',
    isEROpen: true,
    activeTraumaLevel: 2
  },
  {
    id: 'h11',
    name: '이대목동병원',
    location: '서울 양천구',
    lat: 37.5342,
    lng: 126.8858,
    availableBeds: 5,
    totalBeds: 160,
    icuBeds: { available: 1, total: 20 },
    erBeds: { available: 2, total: 32 },
    operatingRooms: { available: 1, total: 11 },
    specialties: ['산부인과', '소아청소년과', '응급의료'],
    surgicalCapabilities: [{ name: '고위험산모수술', isAvailable: true }],
    bloodSupply: 'Low',
    distance: '9.2 km',
    isEROpen: true,
    activeTraumaLevel: 1
  },
  {
    id: 'h12',
    name: '서울특별시 보라매병원',
    location: '서울 동작구',
    lat: 37.4925,
    lng: 126.9234,
    availableBeds: 20,
    totalBeds: 220,
    icuBeds: { available: 8, total: 30 },
    erBeds: { available: 12, total: 40 },
    operatingRooms: { available: 5, total: 14 },
    specialties: ['공공보건의료', '외과', '심혈관'],
    surgicalCapabilities: [{ name: '일반외과수술', isAvailable: true }],
    bloodSupply: 'Normal',
    distance: '4.1 km',
    isEROpen: true,
    activeTraumaLevel: 2
  },
  {
    id: 'h13',
    name: '강동성심병원',
    location: '서울 강동구',
    lat: 37.5340,
    lng: 127.1350,
    availableBeds: 6,
    totalBeds: 150,
    icuBeds: { available: 2, total: 18 },
    erBeds: { available: 3, total: 25 },
    operatingRooms: { available: 1, total: 8 },
    specialties: ['화상치료', '성형외과'],
    surgicalCapabilities: [{ name: '화상재건수술', isAvailable: true }],
    bloodSupply: 'Normal',
    distance: '11.2 km',
    isEROpen: true,
    activeTraumaLevel: 3
  },
  {
    id: 'h14',
    name: '은평성모병원',
    location: '서울 은평구',
    lat: 37.6334,
    lng: 126.9165,
    availableBeds: 9,
    totalBeds: 190,
    icuBeds: { available: 4, total: 28 },
    erBeds: { available: 6, total: 36 },
    operatingRooms: { available: 3, total: 13 },
    specialties: ['장기이식', '혈액질환'],
    surgicalCapabilities: [{ name: '신장이식', isAvailable: true }],
    bloodSupply: 'Normal',
    distance: '7.8 km',
    isEROpen: true,
    activeTraumaLevel: 2
  }
];

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'p1768471409791',
    name: '김민수',
    age: 34,
    birthDate: '1989-03-15',
    bloodType: 'A+',
    imageUrl: 'https://i.pravatar.cc/150?u=p1768471409791',
    gender: 'M',
    status: PatientStatus.CRITICAL,
    location: '강남구 강남대로 396',
    detailAddress: '강남구 강남대로 396 강남파이낸스센터 12층 1205호',
    lat: 37.4979 + (Math.random() - 0.5) * 0.01,
    lng: 127.0276 + (Math.random() - 0.5) * 0.01,
    symptoms: ['심박 변이 감지', '충격 감지'],
    severityScore: 5,
    aiAnalysis: `**🚨 응급상황**

📋 **주요 소견:**
• 심한 빈맥 163bpm (최대심박수 87%)
• 경계선 산소포화도 90%

🔍 **분석 결과:**
• 34세 남성 심혈관계 위험
• 폐렴, 천식악화, 심부전 의심

📌 **권고 사항:**
• 즉시 응급실 이송 및 중환자실 준비`,
    vitals: {
      heartRate: 163,
      bloodPressure: '150/100',
      oxygenLevel: 90,
      bodyTemp: 37.2,
      lastUpdated: new Date().toISOString(),
      history: Array.from({ length: 15 }, (_, i) => ({
        time: new Date(Date.now() - (15 - i) * 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hr: 150 + Math.floor(Math.random() * 20),
        spo2: 88 + Math.floor(Math.random() * 5)
      })),
      ecgPattern: 'Tachycardia',
      fallDetected: false,
      activityContext: 'Walking',
      bloodGlucose: 120,
      hrv: 15,
      restingHR: 75,
      pai: 85,
      stressLevel: 80,
      calories: 150,
      steps: 2500,
      acc: { x: 0.1, y: 0.2, z: 0.9 },
      gyro: { x: 2.1, y: 1.8, z: 0.5 },
      networkStatus: 'Connected',
      positioningStatus: 'Locked'
    },
    locationData: {
      gpsLocation: {
        lat: 37.4979,
        lng: 127.0276,
        accuracy: 3.2,
        timestamp: new Date(Date.now() - 2000).toISOString(),
        source: 'smartwatch'
      },
      cellularLocation: {
        lat: 37.4976,
        lng: 127.0279,
        accuracy: 15.7,
        timestamp: new Date(Date.now() - 1500).toISOString(),
        cellTowerId: 'KT-GN-001-4567',
        signalStrength: -68
      },
      wifiLocation: {
        lat: 37.4981,
        lng: 127.0274,
        accuracy: 8.3,
        timestamp: new Date(Date.now() - 1000).toISOString(),
        connectedBssid: '00:1B:2F:A2:BA:08',
        nearbyAPs: 12
      },
      fusedLocation: {
        lat: 37.4979,
        lng: 127.0276,
        accuracy: 2.8,
        confidence: 94,
        algorithm: 'multimodal_fusion',
        timestamp: new Date().toISOString()
      }
    }
  },
  {
    id: 'p1768471409792',
    name: '정다은',
    age: 28,
    birthDate: '1995-08-22',
    bloodType: 'B+',
    imageUrl: 'https://i.pravatar.cc/150?u=p1768471409792',
    gender: 'F',
    status: PatientStatus.STABLE,
    location: '마포구 양화로 160',
    detailAddress: '마포구 양화로 160 한화비즈메트로 8층 803호',
    lat: 37.5575 + (Math.random() - 0.5) * 0.01,
    lng: 126.9245 + (Math.random() - 0.5) * 0.01,
    symptoms: ['정상 모니터링'],
    severityScore: 2,
    aiAnalysis: `**✅ 안정적 상태**

📋 **주요 소견:**
• 28세 여성 정상범위

🔍 **분석 결과:**
• 심박수 60-100bpm, 산소포화도 >95%
• 연령대 기준 적절한 수준 유지

📌 **권고 사항:**
• 예방적 관찰 지속`,
    vitals: {
      heartRate: 78,
      bloodPressure: '110/70',
      oxygenLevel: 97,
      bodyTemp: 36.8,
      lastUpdated: new Date().toISOString(),
      history: Array.from({ length: 15 }, (_, i) => ({
        time: new Date(Date.now() - (15 - i) * 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hr: 75 + Math.floor(Math.random() * 10),
        spo2: 96 + Math.floor(Math.random() * 3)
      })),
      ecgPattern: 'Normal',
      fallDetected: false,
      activityContext: 'Resting',
      bloodGlucose: 95,
      hrv: 45,
      restingHR: 68,
      pai: 60,
      stressLevel: 25,
      calories: 80,
      steps: 1200,
      acc: { x: 0.02, y: 0.01, z: 0.98 },
      gyro: { x: 0.1, y: 0.1, z: 0.1 },
      networkStatus: 'Connected',
      positioningStatus: 'Locked'
    },
    locationData: {
      gpsLocation: {
        lat: 37.5575,
        lng: 126.9245,
        accuracy: 4.1,
        timestamp: new Date(Date.now() - 3000).toISOString(),
        source: 'smartwatch'
      },
      cellularLocation: {
        lat: 37.5572,
        lng: 126.9248,
        accuracy: 22.4,
        timestamp: new Date(Date.now() - 2500).toISOString(),
        cellTowerId: 'KT-MP-002-8901',
        signalStrength: -72
      },
      wifiLocation: {
        lat: 37.5577,
        lng: 126.9243,
        accuracy: 12.8,
        timestamp: new Date(Date.now() - 1800).toISOString(),
        connectedBssid: '00:2B:4F:C3:DA:12',
        nearbyAPs: 18
      },
      fusedLocation: {
        lat: 37.5575,
        lng: 126.9245,
        accuracy: 3.6,
        confidence: 91,
        algorithm: 'multimodal_fusion',
        timestamp: new Date().toISOString()
      }
    }
  },
  {
    id: 'p1768471409793',
    name: '박준서',
    age: 45,
    birthDate: '1978-12-03',
    bloodType: 'O+',
    imageUrl: 'https://i.pravatar.cc/150?u=p1768471409793',
    gender: 'M',
    status: PatientStatus.URGENT,
    location: '송파구 올림픽로 300',
    detailAddress: '송파구 올림픽로 300 롯데월드타워 오피스텔 42층 4205호',
    lat: 37.5126 + (Math.random() - 0.5) * 0.01,
    lng: 127.1025 + (Math.random() - 0.5) * 0.01,
    symptoms: ['경도 빈맥', '스트레스 반응'],
    severityScore: 3,
    aiAnalysis: `**💡 주의 징후**

📋 **주요 소견:**
• 경도 빈맥 112bpm (+37bpm)
• 중등도 스트레스 65

🔍 **분석 결과:**
• 탈수, 불안, 초기 감염 가능성
• 불안장애 또는 환경 스트레스

📌 **권고 사항:**
• 지속 모니터링 및 관제 확인`,
    vitals: {
      heartRate: 112,
      bloodPressure: '130/85',
      oxygenLevel: 94,
      bodyTemp: 37.0,
      lastUpdated: new Date().toISOString(),
      history: Array.from({ length: 15 }, (_, i) => ({
        time: new Date(Date.now() - (15 - i) * 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hr: 105 + Math.floor(Math.random() * 15),
        spo2: 92 + Math.floor(Math.random() * 4)
      })),
      ecgPattern: 'Mild Tachycardia',
      fallDetected: false,
      activityContext: 'Walking',
      bloodGlucose: 110,
      hrv: 28,
      restingHR: 75,
      pai: 70,
      stressLevel: 65,
      calories: 120,
      steps: 1800,
      acc: { x: 0.15, y: 0.1, z: 0.85 },
      gyro: { x: 1.2, y: 0.8, z: 0.3 },
      networkStatus: 'Connected',
      positioningStatus: 'Locked'
    },
    locationData: {
      gpsLocation: {
        lat: 37.5126,
        lng: 127.1025,
        accuracy: 2.9,
        timestamp: new Date(Date.now() - 1500).toISOString(),
        source: 'smartwatch'
      },
      cellularLocation: {
        lat: 37.5123,
        lng: 127.1028,
        accuracy: 18.6,
        timestamp: new Date(Date.now() - 2000).toISOString(),
        cellTowerId: 'SKT-SP-003-5432',
        signalStrength: -65
      },
      wifiLocation: {
        lat: 37.5128,
        lng: 127.1022,
        accuracy: 7.4,
        timestamp: new Date(Date.now() - 1200).toISOString(),
        connectedBssid: '00:4C:5E:F1:BB:20',
        nearbyAPs: 25
      },
      fusedLocation: {
        lat: 37.5126,
        lng: 127.1025,
        accuracy: 2.5,
        confidence: 96,
        algorithm: 'multimodal_fusion',
        timestamp: new Date().toISOString()
      }
    }
  },
  {
    id: 'p1768471409794',
    name: '최지우',
    age: 67,
    birthDate: '1956-06-18',
    bloodType: 'AB+',
    imageUrl: 'https://i.pravatar.cc/150?u=p1768471409794',
    gender: 'F',
    status: PatientStatus.CRITICAL,
    location: '서대문구 연세로 13',
    detailAddress: '서대문구 연세로 13 연세의료원 신촌세브란스병원 응급의학과',
    lat: 37.5585 + (Math.random() - 0.5) * 0.01,
    lng: 126.9372 + (Math.random() - 0.5) * 0.01,
    symptoms: ['낙상 감지', '의식저하 의심'],
    severityScore: 4,
    aiAnalysis: `**⚠️ 위급상황**

📋 **주요 소견:**
• 스트레스성 빈맥 127bpm (73%)
• 경증 저산소혈증 89%

🔍 **분석 결과:**
• 부정맥 또는 심부전 가능성
• 폐렴, 천식악화, 심부전 의심

📌 **권고 사항:**
• 신속한 의료진 평가 및 검사

🔴 **낙상 감지**

📋 **위험요소:**
• 고령자 고위험군

🔍 **검토사항:**
• 외상성 뇌손상 가능성
• 골절 및 내출혈 위험
• 의식수준 평가 필요

📌 **즉시 조치:**
• 경추고정 및 영상검사 시행`,
    vitals: {
      heartRate: 127,
      bloodPressure: '160/95',
      oxygenLevel: 89,
      bodyTemp: 37.8,
      lastUpdated: new Date().toISOString(),
      history: Array.from({ length: 15 }, (_, i) => ({
        time: new Date(Date.now() - (15 - i) * 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hr: 120 + Math.floor(Math.random() * 15),
        spo2: 87 + Math.floor(Math.random() * 5)
      })),
      ecgPattern: 'Irregular',
      fallDetected: true,
      activityContext: 'Fall Detected',
      bloodGlucose: 140,
      hrv: 18,
      restingHR: 70,
      pai: 35,
      stressLevel: 85,
      calories: 60,
      steps: 800,
      acc: { x: 2.5, y: 1.8, z: 0.2 },
      gyro: { x: 8.5, y: 6.2, z: 4.1 },
      networkStatus: 'Connected',
      positioningStatus: 'Locked'
    },
    locationData: {
      gpsLocation: {
        lat: 37.5585,
        lng: 126.9372,
        accuracy: 4.5,
        timestamp: new Date(Date.now() - 4000).toISOString(),
        source: 'smartwatch'
      },
      cellularLocation: {
        lat: 37.5582,
        lng: 126.9375,
        accuracy: 28.3,
        timestamp: new Date(Date.now() - 3500).toISOString(),
        cellTowerId: 'LG-SDM-001-7891',
        signalStrength: -75
      },
      wifiLocation: {
        lat: 37.5587,
        lng: 126.9369,
        accuracy: 15.2,
        timestamp: new Date(Date.now() - 2800).toISOString(),
        connectedBssid: '00:8A:7F:E4:CC:35',
        nearbyAPs: 8
      },
      fusedLocation: {
        lat: 37.5585,
        lng: 126.9372,
        accuracy: 3.8,
        confidence: 89,
        algorithm: 'multimodal_fusion',
        timestamp: new Date().toISOString()
      }
    }
  },
  {
    id: 'p1768471409795',
    name: '윤서아',
    age: 35,
    birthDate: '1988-11-09',
    bloodType: 'A-',
    imageUrl: 'https://i.pravatar.cc/150?u=p1768471409795',
    gender: 'F',
    status: PatientStatus.STABLE,
    location: '종로구 종로 129',
    detailAddress: '종로구 종로 129 교보빌딩 지하2층 교보문고 카페',
    lat: 37.5704 + (Math.random() - 0.5) * 0.01,
    lng: 126.9922 + (Math.random() - 0.5) * 0.01,
    symptoms: ['정상 모니터링'],
    severityScore: 2,
    aiAnalysis: `**✅ 안정적 상태**

📋 **주요 소견:**
• 35세 여성 정상범위

🔍 **분석 결과:**
• 심박수 60-100bpm, 산소포화도 >95%
• 연령대 기준 적절한 수준 유지

📌 **권고 사항:**
• 예방적 관찰 지속`,
    vitals: {
      heartRate: 82,
      bloodPressure: '115/75',
      oxygenLevel: 98,
      bodyTemp: 36.6,
      lastUpdated: new Date().toISOString(),
      history: Array.from({ length: 15 }, (_, i) => ({
        time: new Date(Date.now() - (15 - i) * 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hr: 78 + Math.floor(Math.random() * 8),
        spo2: 97 + Math.floor(Math.random() * 2)
      })),
      ecgPattern: 'Normal',
      fallDetected: false,
      activityContext: 'Walking',
      bloodGlucose: 92,
      hrv: 50,
      restingHR: 65,
      pai: 75,
      stressLevel: 30,
      calories: 95,
      steps: 1600,
      acc: { x: 0.05, y: 0.02, z: 0.95 },
      gyro: { x: 0.2, y: 0.1, z: 0.1 },
      networkStatus: 'Connected',
      positioningStatus: 'Locked'
    },
    locationData: {
      gpsLocation: {
        lat: 37.5704,
        lng: 126.9922,
        accuracy: 3.7,
        timestamp: new Date(Date.now() - 1800).toISOString(),
        source: 'smartwatch'
      },
      cellularLocation: {
        lat: 37.5701,
        lng: 126.9925,
        accuracy: 20.1,
        timestamp: new Date(Date.now() - 2200).toISOString(),
        cellTowerId: 'SKT-JNR-004-9876',
        signalStrength: -70
      },
      wifiLocation: {
        lat: 37.5706,
        lng: 126.9920,
        accuracy: 9.8,
        timestamp: new Date(Date.now() - 1600).toISOString(),
        connectedBssid: '00:9D:8B:A7:DE:45',
        nearbyAPs: 15
      },
      fusedLocation: {
        lat: 37.5704,
        lng: 126.9922,
        accuracy: 3.2,
        confidence: 92,
        algorithm: 'multimodal_fusion',
        timestamp: new Date().toISOString()
      }
    }
  },
  {
    id: 'p2901847329584',
    name: '최수진',
    age: 28,
    birthDate: '1995-08-22',
    bloodType: 'O-',
    imageUrl: 'https://i.pravatar.cc/150?u=p2901847329584',
    gender: 'F',
    status: PatientStatus.CRITICAL,
    location: '마포구 월드컵로 240',
    detailAddress: '마포구 월드컵로 240 월드컵파크 6단지 602동 1504호',
    lat: 37.5569 + (Math.random() - 0.5) * 0.01,
    lng: 126.9075 + (Math.random() - 0.5) * 0.01,
    symptoms: ['심한 호흡곤란', '천식 발작', '청색증'],
    severityScore: 4,
    aiAnalysis: `**🚨 호흡기 응급상황**

📋 **주요 소견:**
• 심한 저산소혈증 82%
• 빈호흡 및 호흡곤란
• 천식 급성악화 의심

🔍 **분석 결과:**
• 28세 여성 천식 발작
• 기관지 경련 및 기도 폐쇄
• 즉시 산소공급 및 기관지 확장제 필요

📌 **권고 사항:**
• 응급 기도확보 준비
• 인공호흡기 대기
• 중환자실 직행 필요`,
    vitals: {
      heartRate: 135,
      bloodPressure: '140/85',
      oxygenLevel: 82,
      bodyTemp: 37.1,
      lastUpdated: new Date().toISOString(),
      history: Array.from({ length: 15 }, (_, i) => ({
        time: new Date(Date.now() - (15 - i) * 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hr: 130 + Math.floor(Math.random() * 12),
        spo2: 80 + Math.floor(Math.random() * 5)
      })),
      ecgPattern: 'Sinus Tachycardia',
      fallDetected: false,
      activityContext: 'Emergency',
      bloodGlucose: 110,
      hrv: 12,
      restingHR: 68,
      pai: 95,
      stressLevel: 95,
      calories: 80,
      steps: 120,
      acc: { x: 0.2, y: 0.3, z: 0.8 },
      gyro: { x: 3.2, y: 2.8, z: 1.5 },
      networkStatus: 'Connected',
      positioningStatus: 'Locked'
    },
    locationData: {
      gpsLocation: {
        lat: 37.5569,
        lng: 126.9075,
        accuracy: 5.2,
        timestamp: new Date(Date.now() - 2500).toISOString(),
        source: 'smartwatch'
      },
      cellularLocation: {
        lat: 37.5566,
        lng: 126.9078,
        accuracy: 32.7,
        timestamp: new Date(Date.now() - 3000).toISOString(),
        cellTowerId: 'KT-MP-005-3456',
        signalStrength: -77
      },
      wifiLocation: {
        lat: 37.5571,
        lng: 126.9072,
        accuracy: 11.6,
        timestamp: new Date(Date.now() - 2100).toISOString(),
        connectedBssid: '00:6F:4A:B2:EF:58',
        nearbyAPs: 22
      },
      fusedLocation: {
        lat: 37.5569,
        lng: 126.9075,
        accuracy: 4.1,
        confidence: 88,
        algorithm: 'multimodal_fusion',
        timestamp: new Date().toISOString()
      }
    }
  },
  {
    id: 'p3492857394827',
    name: '박영호',
    age: 72,
    birthDate: '1951-11-03',
    bloodType: 'B+',
    imageUrl: 'https://i.pravatar.cc/150?u=p3492857394827',
    gender: 'M',
    status: PatientStatus.CRITICAL,
    location: '종로구 종로 1',
    detailAddress: '종로구 종로 1 종각역 지하상가 2번 출구 인근',
    lat: 37.5700 + (Math.random() - 0.5) * 0.01,
    lng: 126.9850 + (Math.random() - 0.5) * 0.01,
    symptoms: ['두부외상', '의식저하', '낙상사고'],
    severityScore: 5,
    aiAnalysis: `**🚨 외상 응급상황**

📋 **주요 소견:**
• 두부외상 및 의식저하
• 낙상으로 인한 다발성 외상
• 뇌압상승 가능성

🔍 **분석 결과:**
• 72세 고령 남성 중증외상
• 외상성 뇌출혈 의심
• 경추손상 위험도 높음

📌 **권고 사항:**
• 즉시 CT/MRI 촬영 필요
• 신경외과 응급수술 대기
• 외상센터 직행 필수

🔴 **낙상 감지**

📋 **위험요소:**
• 고령자 다발성 외상
• 뇌출혈 및 골절 동반 가능성

🔍 **검토사항:**
• 외상성 뇌손상 Grade III 이상
• 경추 안정화 필요
• 복강내 출혈 배제검사

📌 **즉시 조치:**
• 경추고정 유지
• 외상센터 응급수술실 준비`,
    vitals: {
      heartRate: 98,
      bloodPressure: '180/110',
      oxygenLevel: 88,
      bodyTemp: 36.8,
      lastUpdated: new Date().toISOString(),
      history: Array.from({ length: 15 }, (_, i) => ({
        time: new Date(Date.now() - (15 - i) * 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hr: 95 + Math.floor(Math.random() * 8),
        spo2: 85 + Math.floor(Math.random() * 6)
      })),
      ecgPattern: 'Normal',
      fallDetected: true,
      activityContext: 'Fall Detected',
      bloodGlucose: 160,
      hrv: 25,
      restingHR: 72,
      pai: 20,
      stressLevel: 70,
      calories: 45,
      steps: 80,
      acc: { x: 0.8, y: 0.6, z: 0.2 },
      gyro: { x: 5.2, y: 4.1, z: 3.8 },
      networkStatus: 'Connected',
      positioningStatus: 'Locked'
    },
    locationData: {
      gpsLocation: {
        lat: 37.5700,
        lng: 126.9850,
        accuracy: 6.8,
        timestamp: new Date(Date.now() - 5000).toISOString(),
        source: 'smartwatch'
      },
      cellularLocation: {
        lat: 37.5697,
        lng: 126.9853,
        accuracy: 45.2,
        timestamp: new Date(Date.now() - 4500).toISOString(),
        cellTowerId: 'LG-JNR-002-1234',
        signalStrength: -82
      },
      wifiLocation: {
        lat: 37.5702,
        lng: 126.9847,
        accuracy: 18.9,
        timestamp: new Date(Date.now() - 3800).toISOString(),
        connectedBssid: '00:3B:9C:F6:AB:71',
        nearbyAPs: 6
      },
      fusedLocation: {
        lat: 37.5700,
        lng: 126.9850,
        accuracy: 5.3,
        confidence: 85,
        algorithm: 'multimodal_fusion',
        timestamp: new Date().toISOString()
      }
    }
  },

  // 🍷 음주 환자 - 심박수 상승, 체온 상승, 스트레스 증가
  {
    id: 'p_alcohol_001',
    name: '이주현',
    age: 32,
    birthDate: '1991-04-15',
    bloodType: 'A+',
    imageUrl: 'https://i.pravatar.cc/150?u=p_alcohol_001',
    gender: 'M',
    status: PatientStatus.URGENT,
    location: '강남구 테헤란로 152',
    detailAddress: '강남구 테헤란로 152 강남파이낸스플라자 18층 회식장소',
    lat: 37.5040 + (Math.random() - 0.5) * 0.01,
    lng: 127.0395 + (Math.random() - 0.5) * 0.01,
    symptoms: ['음주 상태 감지', '심박수 증가', '체온 상승', '균형감각 저하'],
    severityScore: 3,
    aiAnalysis: `**🍷 음주 상태 감지**

📋 **주요 소견:**
• 심박수 95bpm (평상시 대비 +31.9%)
• 스트레스 지수 55/100 (+35 증가)
• 체온 37.3°C (+0.8°C 상승)
• HRV 30ms (33% 감소)

🔍 **음주 분석 결과:**
• 32세 남성 중등도 음주 상태
• 알코올로 인한 교감신경계 활성화
• 혈관 확장으로 인한 체온 상승
• 심박변이도 현저한 감소

📌 **권고 사항:**
• 운전 및 위험 활동 절대 금지
• 안전한 장소에서 휴식 필요
• 수분 섭취 및 지속 모니터링
• 추가 음주 절대 금지

🚨 **즉시 조치:**
• 보호자 연락 및 안전 확보
• 생체신호 지속 모니터링`,
    vitals: {
      heartRate: 95,
      bloodPressure: '135/88',
      oxygenLevel: 96,
      bodyTemp: 37.3,
      lastUpdated: new Date().toISOString(),
      history: Array.from({ length: 15 }, (_, i) => ({
        time: new Date(Date.now() - (15 - i) * 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hr: 90 + Math.floor(Math.random() * 12), // 변동성 있는 상승 패턴
        spo2: 95 + Math.floor(Math.random() * 3)
      })),
      ecgPattern: 'Mild Tachycardia',
      fallDetected: false,
      activityContext: 'Alcohol Influenced',
      bloodGlucose: 85, // 알코올로 인한 저혈당 경향
      hrv: 30, // 감소된 HRV
      restingHR: 72,
      pai: 45,
      stressLevel: 55, // 상승된 스트레스
      calories: 220, // 음주로 인한 칼로리
      steps: 3200,
      acc: { x: 0.3, y: 0.4, z: 0.7 }, // 불안정한 움직임
      gyro: { x: 2.8, y: 3.2, z: 2.1 },
      networkStatus: 'Connected',
      positioningStatus: 'Locked'
    },
    locationData: {
      gpsLocation: {
        lat: 37.5040,
        lng: 127.0395,
        accuracy: 4.2,
        timestamp: new Date(Date.now() - 1200).toISOString(),
        source: 'smartwatch'
      },
      cellularLocation: {
        lat: 37.5037,
        lng: 127.0398,
        accuracy: 18.3,
        timestamp: new Date(Date.now() - 1800).toISOString(),
        cellTowerId: 'SKT-GN-007-8899',
        signalStrength: -69
      },
      wifiLocation: {
        lat: 37.5042,
        lng: 127.0392,
        accuracy: 8.7,
        timestamp: new Date(Date.now() - 1000).toISOString(),
        connectedBssid: '00:7E:3A:C8:FF:92',
        nearbyAPs: 28
      },
      fusedLocation: {
        lat: 37.5040,
        lng: 127.0395,
        accuracy: 3.1,
        confidence: 93,
        algorithm: 'multimodal_fusion',
        timestamp: new Date().toISOString()
      }
    }
  },

  // 💊 마약 환자 (각성제) - 심박수 급상승, 극도의 불규칙성, 과다활동
  {
    id: 'p_drug_002',
    name: '김태민',
    age: 26,
    birthDate: '1997-09-08',
    bloodType: 'O+',
    imageUrl: 'https://i.pravatar.cc/150?u=p_drug_002',
    gender: 'M',
    status: PatientStatus.CRITICAL,
    location: '용산구 한강로3가 16-95',
    detailAddress: '용산구 한강로3가 16-95 용산역 화장실 근처',
    lat: 37.5299 + (Math.random() - 0.5) * 0.01,
    lng: 126.9649 + (Math.random() - 0.5) * 0.01,
    symptoms: ['각성제 사용 의심', '극심한 심박수 증가', '체온 급상승', '과다활동', '발한'],
    severityScore: 5,
    aiAnalysis: `**💊 각성제 사용 응급상황**

📋 **주요 소견:**
• 심박수 145bpm (극심한 빈맥)
• 체온 38.7°C (고열 상태)
• HRV 18ms (심각한 감소)
• 극도의 불규칙 패턴

🔍 **마약 분석 결과:**
• 26세 남성 각성제 사용 강력 의심
• 메스암페타민 또는 코카인 패턴
• 교감신경계 극도 활성화 상태
• 심혈관계 응급상황 위험

📌 **긴급 조치 필요:**
• 즉시 응급실 이송
• 심전도 및 체온 모니터링
• 수액공급 및 체온조절
• 중독 치료 전문의 상담

🚨 **위험 요소:**
• 심근경색 위험 극대화
• 뇌출혈 가능성
• 발작 위험 상존
• 탈수 및 전해질 불균형`,
    vitals: {
      heartRate: 145,
      bloodPressure: '165/105',
      oxygenLevel: 93,
      bodyTemp: 38.7,
      lastUpdated: new Date().toISOString(),
      history: Array.from({ length: 15 }, (_, i) => ({
        time: new Date(Date.now() - (15 - i) * 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        // 불규칙한 스파이크 패턴 시뮬레이션
        hr: 120 + Math.floor(Math.random() * 40) + (Math.random() > 0.7 ? 25 : 0), 
        spo2: 91 + Math.floor(Math.random() * 4)
      })),
      ecgPattern: 'Severe Tachycardia',
      fallDetected: false,
      activityContext: 'Hyperactive',
      bloodGlucose: 140, // 스트레스성 혈당 상승
      hrv: 18, // 매우 낮은 HRV
      restingHR: 75,
      pai: 98, // 극도로 높은 활동지수
      stressLevel: 95, // 최고 수준 스트레스
      calories: 450, // 과다활동으로 높은 칼로리 소모
      steps: 8500, // 과다활동
      acc: { x: 0.8, y: 1.2, z: 0.4 }, // 격렬한 움직임
      gyro: { x: 12.5, y: 8.7, z: 6.3 }, // 불규칙한 회전
      networkStatus: 'Connected',
      positioningStatus: 'Locked'
    },
    locationData: {
      gpsLocation: {
        lat: 37.5299,
        lng: 126.9649,
        accuracy: 8.5,
        timestamp: new Date(Date.now() - 800).toISOString(),
        source: 'smartwatch'
      },
      cellularLocation: {
        lat: 37.5296,
        lng: 126.9652,
        accuracy: 35.7,
        timestamp: new Date(Date.now() - 1200).toISOString(),
        cellTowerId: 'KT-YS-001-5566',
        signalStrength: -74
      },
      wifiLocation: {
        lat: 37.5301,
        lng: 126.9646,
        accuracy: 22.4,
        timestamp: new Date(Date.now() - 900).toISOString(),
        connectedBssid: '00:A4:2B:E9:CC:44',
        nearbyAPs: 12
      },
      fusedLocation: {
        lat: 37.5299,
        lng: 126.9649,
        accuracy: 6.8,
        confidence: 87,
        algorithm: 'multimodal_fusion',
        timestamp: new Date().toISOString()
      }
    }
  },

  // 🧠 향정신성약물 환자 (벤조디아제핀) - 심박수 감소, 각성도 저하, 움직임 억제
  {
    id: 'p_psychoactive_003',
    name: '한예린',
    age: 29,
    birthDate: '1994-02-20',
    bloodType: 'B-',
    imageUrl: 'https://i.pravatar.cc/150?u=p_psychoactive_003',
    gender: 'F',
    status: PatientStatus.URGENT,
    location: '서초구 반포대로 222',
    detailAddress: '서초구 반포대로 222 래미안퍼스티지 101동 2304호',
    lat: 37.5049 + (Math.random() - 0.5) * 0.01,
    lng: 127.0034 + (Math.random() - 0.5) * 0.01,
    symptoms: ['의식 저하', '각성도 감소', '호흡 억제', '움직임 둔화', '반응성 저하'],
    severityScore: 4,
    aiAnalysis: `**🧠 향정신성약물 사용 감지**

📋 **주요 소견:**
• 심박수 62bpm (점진적 감소)
• 각성도 12/100 (현저한 저하)
• 호흡수 11회/분 (호흡 억제)
• 움직임 활동 90% 감소

🔍 **CNS 억제 분석:**
• 29세 여성 벤조디아제핀계 약물 의심
• 중추신경계 억제 패턴 확인
• 점진적 CNS 기능 저하
• 호흡중추 억제 징후 관찰

📌 **의료 조치 권고:**
• 즉시 중독치료 전문의 상담
• 호흡 상태 지속 모니터링 필수
• 해독 치료 프로토콜 준비
• 갑작스러운 약물 중단 금지

🚨 **위험 요소:**
• 호흡 억제로 인한 저산소증 위험
• 의식수준 추가 저하 가능성
• 금단 증상 발생 위험`,
    vitals: {
      heartRate: 62,
      bloodPressure: '105/68',
      oxygenLevel: 94,
      bodyTemp: 36.2, // 약간 낮은 체온
      lastUpdated: new Date().toISOString(),
      history: Array.from({ length: 15 }, (_, i) => ({
        time: new Date(Date.now() - (15 - i) * 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        // 점진적 감소 패턴
        hr: Math.max(58, 72 - Math.floor(i * 0.8) + Math.floor(Math.random() * 4)),
        spo2: 94 + Math.floor(Math.random() * 3)
      })),
      ecgPattern: 'Mild Bradycardia',
      fallDetected: false,
      activityContext: 'Sedated', // 진정 상태
      bloodGlucose: 88,
      hrv: 38, // 약간 감소된 HRV
      restingHR: 72,
      pai: 15, // 매우 낮은 활동 지수
      stressLevel: 12, // 극도로 낮은 스트레스 (각성도 저하)
      calories: 45, // 낮은 활동으로 낮은 칼로리
      steps: 180, // 매우 적은 걸음수
      acc: { x: 0.01, y: 0.02, z: 0.99 }, // 거의 정적인 상태
      gyro: { x: 0.1, y: 0.1, z: 0.1 }, // 미미한 움직임
      networkStatus: 'Connected',
      positioningStatus: 'Locked'
    },
    locationData: {
      gpsLocation: {
        lat: 37.5049,
        lng: 127.0034,
        accuracy: 3.8,
        timestamp: new Date(Date.now() - 2000).toISOString(),
        source: 'smartwatch'
      },
      cellularLocation: {
        lat: 37.5046,
        lng: 127.0037,
        accuracy: 19.4,
        timestamp: new Date(Date.now() - 2500).toISOString(),
        cellTowerId: 'LG-SC-004-7788',
        signalStrength: -71
      },
      wifiLocation: {
        lat: 37.5051,
        lng: 127.0031,
        accuracy: 12.1,
        timestamp: new Date(Date.now() - 1500).toISOString(),
        connectedBssid: '00:5D:7C:A9:BB:63',
        nearbyAPs: 16
      },
      fusedLocation: {
        lat: 37.5049,
        lng: 127.0034,
        accuracy: 3.2,
        confidence: 89,
        algorithm: 'multimodal_fusion',
        timestamp: new Date().toISOString()
      }
    }
  }
];