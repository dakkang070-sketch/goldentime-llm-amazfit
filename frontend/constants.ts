
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
    }
  }
];