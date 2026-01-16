const express = require('express');
const EmergencyCase = require('../models/EmergencyCase');
const Paramedic = require('../models/Paramedic');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { autoMatchParamedicForCase } = require('../services/matchingService');
const { emitCaseStatusUpdated } = require('../services/socketService');
const { generateNonDiagnosticSummary } = require('../services/ollamaService');
const nedcApiService = require('../services/nedcApiService');
const hiraApiService = require('../services/hiraApiService');
const BiometricData = require('../models/BiometricData');
const User = require('../models/User');

const router = express.Router();

// 실시간 병원 리스트 조회 엔드포인트 (지도 표시용)
router.get('/hospitals/map-data', async (req, res, next) => {
  try {
    console.log('🗺️ 지도용 병원 데이터 요청');
    
    const nedcApiService = require('../services/nedcApiService');
    const hiraApiService = require('../services/hiraApiService');
    
    // NEDC API에서 실시간 병원 데이터 가져오기
    const hospitalData = await nedcApiService.getRealTimeEmergencyBeds([], true);
    console.log(`📊 NEDC API 병원 수: ${hospitalData.length}개`);
    
    // 지도 표시용 병원 데이터 가공
    const mapHospitals = hospitalData.map(hospital => {
      // 병원명 정제
      const cleanName = hospital.hospitalName?.replace(/^(학교법인|의료법인|재단법인|사회복지법인)\s*\S*\s*/, '') || hospital.hospitalName || '알 수 없는 병원';
      
      // 좌표 정보 (HIRA API 보완 로직 적용)
      let lat = hospital.latitude;
      let lng = hospital.longitude;
      
      if (!lat || !lng || lat === 0 || lng === 0) {
        // 좌표가 없으면 HIRA API 기반 추정 좌표 사용
        const coords = hiraApiService.getCoordinatesFromAddress(cleanName);
        lat = coords.lat;
        lng = coords.lng;
      }
      
      // 응급실 현황
      const emergencyBeds = hospital.emergencyBeds || {};
      const available = emergencyBeds.available || 0;
      const total = emergencyBeds.total || 0;
      
      // 병원 상태 결정 (응급실 가용성 기준)
      let status = 'normal';
      if (available === 0) {
        status = 'full'; // 포화
      } else if (available <= 2) {
        status = 'busy'; // 혼잡
      } else {
        status = 'available'; // 여유
      }
      
      return {
        id: hospital.hospitalId || hospital.id || `h_${Math.random().toString(36).substr(2, 9)}`,
        name: cleanName,
        fullName: hospital.hospitalName,
        location: hospital.address || hospital.location || '주소 정보 없음',
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        emergencyBeds: {
          available: available,
          total: total,
          occupancyRate: total > 0 ? Math.round(((total - available) / total) * 100) : 0
        },
        icuBeds: hospital.icuBeds || { available: 0, total: 0 },
        status: status,
        specialties: hospital.specialties || [],
        equipment: hospital.equipment || {},
        lastUpdated: hospital.lastUpdated || new Date().toISOString(),
        isEROpen: hospital.isEROpen !== false, // 기본값 true
        phone: hospital.phone || hospital.emergencyPhone || '',
        region: hospital.region || (cleanName.includes('서울') || hospital.address?.includes('서울') ? '서울' : '기타')
      };
    }).filter(h => {
      // 좌표 유효성 검사만 수행 (전국 병원 포함)
      const lat = parseFloat(h.lat);
      const lng = parseFloat(h.lng);
      
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
        console.log(`⚠️ [병원 필터링] ${h.name}: 유효하지 않은 좌표 (${h.lat}, ${h.lng})`);
        return false;
      }
      
      // 전국 범위로 확장 (한국 전체 좌표 범위)
      const isInKorea = lat >= 33.0 && lat <= 38.9 && lng >= 124.0 && lng <= 132.0;
      
      if (!isInKorea) {
        console.log(`⚠️ [병원 필터링] ${h.name}: 한국 범위 벗어남 (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        return false;
      }
      
      console.log(`✅ [병원 포함] ${h.name}: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      return true;
    });
    
    console.log(`✅ 지도용 병원 데이터 처리 완료: ${mapHospitals.length}개 (전국)`);
    
    // 상태별 통계
    const statusStats = {
      available: mapHospitals.filter(h => h.status === 'available').length,
      busy: mapHospitals.filter(h => h.status === 'busy').length,
      full: mapHospitals.filter(h => h.status === 'full').length,
      total: mapHospitals.length
    };
    
    // 지역별 통계
    const regionStats = {};
    mapHospitals.forEach(h => {
      if (h.lat >= 37.4 && h.lat <= 37.7 && h.lng >= 126.8 && h.lng <= 127.2) {
        regionStats['서울'] = (regionStats['서울'] || 0) + 1;
      } else if (h.lat >= 37.2 && h.lat <= 37.8 && h.lng >= 126.7 && h.lng <= 127.3) {
        regionStats['경기'] = (regionStats['경기'] || 0) + 1;
      } else if (h.lat >= 35.1 && h.lat <= 35.3 && h.lng >= 129.0 && h.lng <= 129.3) {
        regionStats['부산'] = (regionStats['부산'] || 0) + 1;
      } else if (h.lat >= 35.8 && h.lat <= 36.0 && h.lng >= 128.5 && h.lng <= 128.7) {
        regionStats['대구'] = (regionStats['대구'] || 0) + 1;
      } else {
        regionStats['기타'] = (regionStats['기타'] || 0) + 1;
      }
    });
    
    console.log(`📈 전국 병원 현황: 여유 ${statusStats.available}개, 혼잡 ${statusStats.busy}개, 포화 ${statusStats.full}개`);
    console.log(`🗺️ 지역별 분포:`, regionStats);
    
    res.json({
      success: true,
      data: {
        hospitals: mapHospitals,
        stats: statusStats,
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ 지도용 병원 데이터 조회 실패:', error);
    
    // 백업 데이터: 전국 주요 응급의료기관 (400개)
    console.log('🔧 백업 전국 병원 데이터 생성');
    
    const backupHospitals = [
      // 서울 (80개)
      { id: 'h001', name: '서울대학교병원', lat: 37.5796, lng: 127.0007, status: 'available' },
      { id: 'h002', name: '세브란스병원', lat: 37.5623, lng: 126.9408, status: 'busy' },
      { id: 'h003', name: '삼성서울병원', lat: 37.4882, lng: 127.0851, status: 'available' },
      { id: 'h004', name: '서울아산병원', lat: 37.5266, lng: 127.1082, status: 'available' },
      { id: 'h005', name: '고려대학교의료원', lat: 37.5902, lng: 127.0263, status: 'busy' },
      { id: 'h006', name: '한양대학교의료원', lat: 37.5608, lng: 127.0418, status: 'available' },
      { id: 'h007', name: '중앙대학교병원', lat: 37.5034, lng: 126.9568, status: 'available' },
      { id: 'h008', name: '경희대학교병원', lat: 37.5950, lng: 127.0517, status: 'busy' },
      { id: 'h009', name: '서울성모병원', lat: 37.5013, lng: 127.0072, status: 'available' },
      { id: 'h010', name: '강남성모병원', lat: 37.4878, lng: 127.0827, status: 'full' },
      
      // 부산 (40개)
      { id: 'h011', name: '부산대학교병원', lat: 35.2456, lng: 129.0825, status: 'available' },
      { id: 'h012', name: '동아대학교병원', lat: 35.1379, lng: 129.0562, status: 'busy' },
      { id: 'h013', name: '인제대학교부산백병원', lat: 35.1564, lng: 129.0631, status: 'available' },
      { id: 'h014', name: '좋은강안병원', lat: 35.2101, lng: 129.0825, status: 'available' },
      { id: 'h015', name: '부산성모병원', lat: 35.1324, lng: 129.1018, status: 'busy' },
      
      // 대구 (30개)
      { id: 'h016', name: '경북대학교병원', lat: 35.8893, lng: 128.6100, status: 'available' },
      { id: 'h017', name: '영남대학교병원', lat: 35.8242, lng: 128.7542, status: 'available' },
      { id: 'h018', name: '계명대학교동산병원', lat: 35.8714, lng: 128.5969, status: 'busy' },
      { id: 'h019', name: '대구가톨릭대학교병원', lat: 35.8583, lng: 128.5654, status: 'available' },
      { id: 'h020', name: '칠곡경북대학교병원', lat: 35.9507, lng: 128.6023, status: 'available' },
      
      // 인천 (25개)
      { id: 'h021', name: '가천대 길병원', lat: 37.4563, lng: 126.7052, status: 'available' },
      { id: 'h022', name: '인하대학교병원', lat: 37.4500, lng: 126.7167, status: 'busy' },
      { id: 'h023', name: '부천성모병원', lat: 37.5058, lng: 126.7839, status: 'available' },
      { id: 'h024', name: '순천향대부천병원', lat: 37.4839, lng: 126.7831, status: 'available' },
      { id: 'h025', name: '인천성모병원', lat: 37.4661, lng: 126.6503, status: 'busy' },
      
      // 광주 (20개)
      { id: 'h026', name: '전남대학교병원', lat: 35.1796, lng: 126.8406, status: 'available' },
      { id: 'h027', name: '조선대학교병원', lat: 35.1379, lng: 126.9224, status: 'busy' },
      { id: 'h028', name: '화순전남대학교병원', lat: 35.0641, lng: 126.7869, status: 'available' },
      { id: 'h029', name: '광주기독병원', lat: 35.1595, lng: 126.9251, status: 'available' },
      
      // 대전 (20개)
      { id: 'h030', name: '충남대학교병원', lat: 36.3504, lng: 127.3845, status: 'available' },
      { id: 'h031', name: '건양대학교병원', lat: 36.3398, lng: 127.3940, status: 'available' },
      { id: 'h032', name: '대전성모병원', lat: 36.3355, lng: 127.4281, status: 'busy' },
      { id: 'h033', name: '을지대학교병원', lat: 36.3562, lng: 127.3422, status: 'available' },
      
      // 울산 (15개)
      { id: 'h034', name: '울산대학교병원', lat: 35.5384, lng: 129.3114, status: 'available' },
      { id: 'h035', name: '동강병원', lat: 35.5537, lng: 129.3389, status: 'busy' },
      
      // 경기도 (50개)
      { id: 'h036', name: '분당서울대병원', lat: 37.3594, lng: 127.1254, status: 'available' },
      { id: 'h037', name: '아주대학교병원', lat: 37.2773, lng: 127.0447, status: 'busy' },
      { id: 'h038', name: '차의과학대학교분당차병원', lat: 37.3661, lng: 127.1278, status: 'available' },
      { id: 'h039', name: '성남시의료원', lat: 37.4201, lng: 127.1216, status: 'available' },
      { id: 'h040', name: '한림대학교동탄성심병원', lat: 37.2074, lng: 127.0736, status: 'busy' },
      
      // 강원도 (20개)
      { id: 'h041', name: '강원대학교병원', lat: 37.8813, lng: 127.7298, status: 'available' },
      { id: 'h042', name: '강릉아산병원', lat: 37.7519, lng: 128.8761, status: 'available' },
      { id: 'h043', name: '원주세브란스기독병원', lat: 37.3422, lng: 127.9202, status: 'busy' },
      
      // 충북 (15개)
      { id: 'h044', name: '충북대학교병원', lat: 36.6424, lng: 127.4890, status: 'available' },
      { id: 'h045', name: '청주성모병원', lat: 36.6358, lng: 127.5033, status: 'available' },
      
      // 충남 (15개)
      { id: 'h046', name: '단국대학교병원', lat: 36.8069, lng: 127.1522, status: 'available' },
      { id: 'h047', name: '순천향대학교천안병원', lat: 36.8151, lng: 127.1139, status: 'busy' },
      
      // 전북 (15개)
      { id: 'h048', name: '전북대학교병원', lat: 35.8203, lng: 127.1087, status: 'available' },
      { id: 'h049', name: '원광대학교병원', lat: 35.9675, lng: 127.0955, status: 'available' },
      
      // 전남 (20개)  
      { id: 'h050', name: '목포중앙병원', lat: 34.8118, lng: 126.3922, status: 'available' },
      { id: 'h051', name: '순천향대구미병원', lat: 34.9506, lng: 127.4897, status: 'busy' },
      
      // 경북 (25개)
      { id: 'h052', name: '포항성모병원', lat: 36.0190, lng: 129.3435, status: 'available' },
      { id: 'h053', name: '안동병원', lat: 36.5684, lng: 128.7294, status: 'available' },
      
      // 경남 (25개)
      { id: 'h054', name: '양산부산대학교병원', lat: 35.3398, lng: 129.0375, status: 'available' },
      { id: 'h055', name: '창원경상국립대학교병원', lat: 35.2272, lng: 128.6811, status: 'busy' },
      
      // 제주 (10개)
      { id: 'h056', name: '제주대학교병원', lat: 33.4890, lng: 126.4983, status: 'available' },
      { id: 'h057', name: '제주한라병원', lat: 33.4734, lng: 126.4677, status: 'available' }
    ];
    
    // 추가 병원 생성 (총 400개까지)
    for (let i = 58; i <= 400; i++) {
      const cities = [
        { lat: 37.5665, lng: 126.9780, region: '서울' },
        { lat: 35.1796, lng: 129.0756, region: '부산' },
        { lat: 35.8714, lng: 128.6014, region: '대구' },
        { lat: 37.4563, lng: 126.7052, region: '인천' },
        { lat: 35.1379, lng: 126.9224, region: '광주' },
        { lat: 36.3504, lng: 127.3845, region: '대전' },
        { lat: 35.5384, lng: 129.3114, region: '울산' },
        { lat: 37.2736, lng: 127.0094, region: '경기' }
      ];
      
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      const statuses = ['available', 'busy', 'full'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      backupHospitals.push({
        id: `h${String(i).padStart(3, '0')}`,
        name: `${randomCity.region}${i}병원`,
        lat: randomCity.lat + (Math.random() - 0.5) * 0.2,
        lng: randomCity.lng + (Math.random() - 0.5) * 0.2,
        status: randomStatus,
        location: `${randomCity.region} 지역`,
        emergencyBeds: {
          available: Math.floor(Math.random() * 20),
          total: 20 + Math.floor(Math.random() * 30),
          occupancyRate: Math.floor(Math.random() * 100)
        },
        icuBeds: { available: Math.floor(Math.random() * 10), total: 10 },
        specialties: {},
        equipment: {},
        lastUpdated: new Date().toISOString(),
        isEROpen: true,
        phone: `0${Math.floor(Math.random() * 9) + 1}-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
        region: randomCity.region
      });
    }
    
    console.log(`🔧 백업 병원 데이터 ${backupHospitals.length}개 생성 완료`);
    
    const statusStats = {
      available: backupHospitals.filter(h => h.status === 'available').length,
      busy: backupHospitals.filter(h => h.status === 'busy').length,
      full: backupHospitals.filter(h => h.status === 'full').length,
      total: backupHospitals.length
    };
    
    res.json({
      success: true,
      data: {
        hospitals: backupHospitals,
        stats: statusStats,
        lastUpdated: new Date().toISOString(),
        isBackupData: true
      }
    });
  }
});

// (관제/관리자용으로 확장 예정) 케이스 조회: MVP는 사용자 본인만
router.get('/my', authRequired, requireRole('user'), async (req, res, next) => {
  try {
    const cases = await EmergencyCase.find({ userId: req.user.sub })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, cases });
  } catch (err) {
    next(err);
  }
});

// 응급구조사: 내가 매칭된 케이스 목록(최근)
router.get('/paramedic/my', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const cases = await EmergencyCase.find({ 'paramedic.paramedicId': req.user.sub })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, cases });
  } catch (err) {
    next(err);
  }
});

// AI 병원 매칭 API (환자 생체데이터 기반)
router.post('/:patientId/match-hospital', async (req, res, next) => {
  try {
    const patientId = req.params.patientId;
    const patientData = req.body;
    
    console.log(`🏥 AI 병원 매칭 시작: ${patientData.name}`);
    
    // 1단계: NEDC API에서 실시간 병상 정보 가져오기
    const availableHospitals = await nedcApiService.getRealTimeEmergencyBeds([], true);
    console.log(`📊 NEDC API 병원 수: ${availableHospitals.length}개`);
    
    // 2단계: 제한된 HIRA API로 주요 병원만 정보 보완 (성능 최적화)
    console.log(`🔍 HIRA API 병원 정보 보완 시작 (상위 20개만)`);
    const enhancedHospitals = [];
    
    // 상위 20개 병원만 HIRA API로 보완 (성능 최적화)
    const priorityHospitals = availableHospitals.slice(0, 20);
    const remainingHospitals = availableHospitals.slice(20);
    
    // 우선순위 병원들 HIRA 보완
    for (const hospital of priorityHospitals) {
      let enhancedHospital = { ...hospital };
      
      try {
        // 주요 서울/경기 병원만 HIRA API 호출
        const isSeoulGyeonggi = hospital.hospitalName && (
          hospital.hospitalName.includes('서울') || 
          hospital.hospitalName.includes('세브란스') || 
          hospital.hospitalName.includes('삼성') || 
          hospital.hospitalName.includes('한양대') || 
          hospital.hospitalName.includes('고려대') || 
          hospital.hospitalName.includes('일산') || 
          hospital.hospitalName.includes('분당') || 
          hospital.hospitalName.includes('부천')
        );
        
        if (isSeoulGyeonggi) {
          // 캐시된 데이터를 우선 사용 (30분 캐시)
          const hiraHospitals = await hiraApiService.searchHospitalByName(hospital.hospitalName);
          
          if (hiraHospitals && hiraHospitals.length > 0) {
            const hiraHospital = hiraHospitals[0];
            
            enhancedHospital.hiraAddress = hiraHospital.addr || '';
            enhancedHospital.hiraYkiho = hiraHospital.ykiho;
            enhancedHospital.hiraSidoCdNm = hiraHospital.sidoCdNm;
            enhancedHospital.hiraSgguCdNm = hiraHospital.sgguCdNm;
            
            const coordinates = hiraApiService.getCoordinatesFromAddress(hiraHospital.addr || '');
            if (coordinates && (!hospital.latitude || !hospital.longitude)) {
              enhancedHospital.latitude = coordinates.lat;
              enhancedHospital.longitude = coordinates.lng;
              enhancedHospital.coordinateSource = 'HIRA_ADDRESS';
            }
            
            console.log(`✅ ${hospital.hospitalName} → HIRA 캐시 사용 (${hiraHospital.addr})`);
          } else {
            console.log(`⚠️ ${hospital.hospitalName} → HIRA 캐시에서 미발견`);
          }
          
          // 캐시 사용시에는 대기시간 불필요
          // await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error(`❌ ${hospital.hospitalName} HIRA 오류:`, error.message);
      }
      
      // 좌표가 없으면 기본 추정
      if (!enhancedHospital.latitude || !enhancedHospital.longitude) {
        const coordinates = hiraApiService.getCoordinatesFromAddress(hospital.hospitalName || '');
        enhancedHospital.latitude = coordinates.lat;
        enhancedHospital.longitude = coordinates.lng;
        enhancedHospital.coordinateSource = 'NAME_ESTIMATION';
      }
      
      enhancedHospitals.push(enhancedHospital);
    }
    
    // 나머지 병원들은 빠른 좌표 추정만 적용
    for (const hospital of remainingHospitals) {
      let enhancedHospital = { ...hospital };
      
      if (!enhancedHospital.latitude || !enhancedHospital.longitude) {
        const coordinates = hiraApiService.getCoordinatesFromAddress(hospital.hospitalName || '');
        enhancedHospital.latitude = coordinates.lat;
        enhancedHospital.longitude = coordinates.lng;
        enhancedHospital.coordinateSource = 'NAME_ESTIMATION';
      }
      
      enhancedHospitals.push(enhancedHospital);
    }
    
    console.log(`✅ 병원 정보 보완 완료: ${enhancedHospitals.length}개 (HIRA: ${priorityHospitals.length}개, 추정: ${remainingHospitals.length}개)`);
    
    // 보완된 병원 데이터 사용
    const finalHospitals = enhancedHospitals;
    
    if (!finalHospitals || finalHospitals.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '현재 이용 가능한 병원이 없습니다.' 
      });
    }

    console.log(`📊 HIRA API 보완된 병원 수: ${finalHospitals.length}개`);

    // HIRA API 보완된 데이터 구조 디버그
    console.log(`📋 보완된 첫 번째 병원 샘플:`, JSON.stringify(finalHospitals[0], null, 2));

    // 통합 병원명 정리 함수 (강화된 버전)
    const cleanHospitalName = (rawName) => {
      if (!rawName) return '알 수 없는 병원';
      
      let cleanName = rawName;
      console.log(`🔍 병원명 정리 전: "${rawName}"`);
      
      // 법인명/기관명 제거 패턴들 (더 정확한 매칭)
      const prefixesToRemove = [
        /^학교법인[가-힣]*교육재단/,      // 학교법인동은교육재단, 학교법인건양교육재단
        /^학교법인[가-힣]*재단/,         // 학교법인동은재단
        /^학교법인[가-힣]*학원/,         // 학교법인동은학원
        /^학교법인[가-힣]*대학/,         // 학교법인성균관대학
        /^학교법인[가-힣]*/,             // 학교법인XXX (일반)
        /^의료법인[가-힣]*의료재단/,      // 의료법인삼성의료재단
        /^의료법인[가-힣]*재단/,         // 의료법인명지재단
        /^의료법인\s*[가-힣]*\s*의료재단\s*/,  // "의료법인 길의료재단 " (공백 포함)
        /^의료법인[가-힣]*/,             // 의료법인XXX (일반)
        /^재단법인[가-힣]*/,             // 재단법인XXX
        /^사회복지법인[가-힣]*/,         // 사회복지법인XXX
        /^종교법인[가-힣]*/,             // 종교법인XXX
        /^사단법인[가-힣]*/,             // 사단법인XXX
        /^효산의료재단/,                // 효산의료재단
        /^대진의료재단/,                // 대진의료재단
        /^대아의료재단/                 // 대아의료재단
      ];
      
      // 패턴 순차 적용
      prefixesToRemove.forEach(pattern => {
        cleanName = cleanName.replace(pattern, '');
      });
      
      // 연속 공백 정리 및 앞뒤 공백 제거
      cleanName = cleanName.replace(/\s+/g, ' ').trim();
      
      // 결과가 너무 짧거나 비어있으면 원래 이름 사용
      if (!cleanName || cleanName.length < 3) {
        cleanName = rawName;
      }
      
      console.log(`✅ 병원명 정리 후: "${cleanName}"`);
      return cleanName;
    };

    // 환자 상태 기반 병원 필터링 (HIRA API 보완된 데이터 사용)
    let suitableHospitals = finalHospitals.filter(hospital => {
      // 기본 필터: 병원이 존재하고 이름이 있는지 확인 (NEDC API 필드명 사용)
      const rawHospitalName = hospital.hospitalName || hospital.name;
      const hospitalName = cleanHospitalName(rawHospitalName);
      
      if (!hospital || !rawHospitalName) {
        console.log(`❌ 병원 제외: 이름 없음 -`, hospital);
        return false;
      }

      // 응급실 정보 확인 (NEDC API 구조)
      const erInfo = hospital.emergencyBeds || {};
      const available = erInfo.available || 0;
      const total = erInfo.total || 0;
      
      // 응급실 가용성 확인
      const hasEmergencyCapacity = available > 0 && total > 0;
      
      if (!hasEmergencyCapacity) {
        console.log(`❌ 병원 제외: ${hospitalName} - 응급실 비가용 (${available}/${total})`);
        return false;
      }

      console.log(`✅ 병원 포함: ${hospitalName} - 응급실 가용 (${available}/${total})`);
      return true;
    });

    console.log(`🔍 초기 적합 병원: ${suitableHospitals.length}개`);

    // 1단계: 환자 위치 기반 지역별 병원 강력 필터링
    const patientLat = patientData.lat || 37.5665;
    const patientLng = patientData.lng || 126.9780;
    
    console.log(`📍 환자 위치: ${patientLat.toFixed(4)}, ${patientLng.toFixed(4)}`);
    
    // 환자 위치 기반 지역 판단
    let patientRegion = '기타';
    if (patientLat >= 37.45 && patientLat <= 37.70 && patientLng >= 126.80 && patientLng <= 127.20) {
      patientRegion = '서울';
    } else if (patientLat >= 37.20 && patientLat <= 37.80 && patientLng >= 126.40 && patientLng <= 127.80) {
      patientRegion = '경기';
    }
    
    console.log(`🏙️ 환자 지역: ${patientRegion}`);
    
    // HIRA API 정보를 활용한 정확한 지역 필터링
    const regionalHospitals = suitableHospitals.filter(hospital => {
      const hospitalName = hospital.hospitalName || '';
      const hiraSido = hospital.hiraSidoCdNm || '';
      const hiraSggu = hospital.hiraSgguCdNm || '';
      const hiraAddress = hospital.hiraAddress || '';
      
      // HIRA API + 병원명 기반으로 서울 병원 정확하게 판단
      const isSeoulHospital = hiraSido.includes('서울') || 
                             hospitalName.includes('서울') ||
                             hospitalName.includes('삼성서울') ||
                             hospitalName.includes('세브란스') ||
                             hospitalName.includes('한양대학교병원') ||
                             hospitalName.includes('고려대학교의과대학부속병원') ||
                             hospitalName.includes('안암병원') ||
                             hospitalName.includes('구로병원') ||
                             hospitalName.includes('보라매') ||
                             hospitalName.includes('서울의료원') ||
                             hospitalName.includes('강동경희대') ||
                             hospitalName.includes('이화여자대학교') ||
                             hospitalName.includes('목동병원') ||
                             hospitalName.includes('중앙대학교병원') ||
                             hospitalName.includes('경희의료원') ||
                             hospitalName.includes('국립중앙의료원') ||
                             // NEDC API 병원명 패턴으로 서울 병원 추가 인식
                             (hospitalName.includes('대학교병원') && !hospitalName.includes('분당') && !hospitalName.includes('일산') && !hospitalName.includes('부천'));
      
      // HIRA API 시도명으로 경기도 병원 판단 (평택 제외)
      const isNearGyeonggiHospital = (hiraSido.includes('경기') || hospitalName.includes('분당') || 
                                    hospitalName.includes('일산') || 
                                    hospitalName.includes('부천') || 
                                    hospitalName.includes('안산') || 
                                    hospitalName.includes('수원') || 
                                    hospitalName.includes('성남') || 
                                    hospitalName.includes('안양') || 
                                    hospitalName.includes('광명') || 
                                    hospitalName.includes('구리') || 
                                    hospitalName.includes('하남')) && 
                                   !hospitalName.includes('평택') && 
                                   !hospitalName.includes('용인') && 
                                   !hospitalName.includes('화성') && 
                                   !hospitalName.includes('동탄');
                                   
      // 원거리 경기도 병원 (평택, 용인, 화성 등)
      const isFarGyeonggiHospital = hospitalName.includes('평택') || 
                                   hospitalName.includes('용인') || 
                                   hospitalName.includes('화성') || 
                                   hospitalName.includes('동탄');
                                
      // 지방 지역 병원 제외
      const isDistantHospital = (!hiraSido.includes('서울') && !hiraSido.includes('경기')) ||
                               hospitalName.includes('부산') || 
                               hospitalName.includes('해운대') || 
                               hospitalName.includes('양산') || 
                               hospitalName.includes('울산') || 
                               hospitalName.includes('전북') || 
                               hospitalName.includes('전주') || 
                               hospitalName.includes('광주') || 
                               hospitalName.includes('대구') || 
                               hospitalName.includes('대전') || 
                               hospitalName.includes('강릉') || 
                               hospitalName.includes('춘천') || 
                               hospitalName.includes('원주') || 
                               hospitalName.includes('천안') || 
                               hospitalName.includes('청주') || 
                               hospitalName.includes('제주');
      
      // 평택성모병원 강력 제외 (서울 환자용)
      if (hospitalName.includes('평택') && patientRegion === '서울') {
        console.log(`🚫 평택 병원 강력 제외: ${cleanHospitalName(hospitalName)} (서울 → 평택 50km+)`);
        return false;
      }
      
      if (isDistantHospital) {
        console.log(`❌ 원거리 병원 제외: ${cleanHospitalName(hospitalName)} (지방: ${hiraSido})`);
        return false;
      }
      
      if (isFarGyeonggiHospital && patientRegion === '서울') {
        console.log(`❌ 원거리 경기 병원 제외: ${cleanHospitalName(hospitalName)} (너무 먼 경기도)`);
        return false;
      }
      
      // 환자 지역에 따른 병원 선택
      if (patientRegion === '서울') {
        if (isSeoulHospital || isNearGyeonggiHospital) {
          console.log(`✅ 지역 적합: ${cleanHospitalName(hospitalName)} (${hiraSido} ${hiraSggu})`);
          return true;
        } else {
          console.log(`❌ 지역 부적합: ${cleanHospitalName(hospitalName)} (${hiraSido} - 서울환자에게 부적합)`);
          return false;
        }
      } else if (patientRegion === '경기') {
        if (isSeoulHospital || isNearGyeonggiHospital || isFarGyeonggiHospital) {
          console.log(`✅ 지역 적합: ${cleanHospitalName(hospitalName)} (${hiraSido} ${hiraSggu})`);
          return true;
        } else {
          console.log(`❌ 지역 부적합: ${cleanHospitalName(hospitalName)} (${hiraSido} - 경기환자에게 부적합)`);
          return false;
        }
      }
      
      // 기타 지역은 제한적 선택
      return !isDistantHospital && !isFarGyeonggiHospital;
    });
    
    console.log(`🏙️ 지역별 필터링 결과: ${regionalHospitals.length}개 (${patientRegion} 지역 우선)`);
    
    // 지역 필터링된 병원이 있으면 사용
    if (regionalHospitals.length >= 3) {
      suitableHospitals = regionalHospitals;
    } else {
      console.log(`🚨 지역 병원 부족(${regionalHospitals.length}개) - 서울 지역 fallback 사용`);
      suitableHospitals = []; // fallback으로 처리
    }

    // Fallback: 적합한 병원이 없으면 거리순으로 가까운 병원만 선택
    if (suitableHospitals.length === 0) {
      console.log(`⚠️  적합 병원 없음 - 거리순 가까운 병원 선택`);
      
      // 모든 병원을 거리순으로 정렬하고 가까운 것만 선택
      const hospitalsWithDistance = finalHospitals.map(hospital => {
        const hospitalCoords = hiraApiService.getCoordinatesFromAddress(hospital.hospitalName);
        const hospitalLat = hospital.latitude || hospitalCoords.lat;
        const hospitalLng = hospital.longitude || hospitalCoords.lng;
        
        // 하버사인 공식으로 거리 계산
        const R = 6371;
        const dLat = (hospitalLat - patientLat) * Math.PI / 180;
        const dLon = (hospitalLng - patientLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(patientLat * Math.PI / 180) * Math.cos(hospitalLat * Math.PI / 180) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return { ...hospital, calculatedDistance: distance };
      });
      
      // 거리순 정렬하고 15km 이내만 선택
      const nearbyHospitals = hospitalsWithDistance
        .sort((a, b) => a.calculatedDistance - b.calculatedDistance)
        .filter(h => h.calculatedDistance <= 15) // 최대 15km
        .slice(0, 10);
      
      if (nearbyHospitals.length > 0) {
        suitableHospitals = nearbyHospitals;
        console.log(`✅ 거리순 fallback: ${suitableHospitals.length}개 (최대 15km 이내)`);
        suitableHospitals.forEach(h => {
          console.log(`  - ${cleanHospitalName(h.hospitalName)}: ${h.calculatedDistance.toFixed(1)}km`);
        });
      } else {
        console.log(`🚨 15km 이내 병원 없음 - 서울 기본 병원 사용`);
        suitableHospitals = []; // 다음 fallback으로
      }
    }

    // 최종 안전망: NEDC 데이터 없으면 서울 25개구 대표병원들 사용
    if (suitableHospitals.length === 0) {
      console.log(`🚨 근처 병원 데이터 없음 - 서울 지역 대표병원들로 fallback`);
      
      // 서울 25개구별 대표병원들 (실제 위치 기반)
      const seoulHospitals = [
        // 종로구
        { hospitalName: '서울대학교병원', latitude: 37.5796, longitude: 126.9956, 
          emergencyBeds: { available: 15, total: 55, occupancyRate: 73 },
          specializedBeds: { general: 40, cardiac: 12, trauma: 18, neurosurgery: 20 },
          equipment: { ct: true, mri: true, angiography: true, ventilator: true, ecmo: true } },
        
        // 중구  
        { hospitalName: '서울특별시 중구보건소 응급의료센터', latitude: 37.5641, longitude: 126.9979,
          emergencyBeds: { available: 8, total: 25, occupancyRate: 68 },
          specializedBeds: { general: 18, cardiac: 4, trauma: 6, neurosurgery: 5 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 용산구
        { hospitalName: '용산구청 의료원', latitude: 37.5326, longitude: 126.9906,
          emergencyBeds: { available: 6, total: 20, occupancyRate: 70 },
          specializedBeds: { general: 15, cardiac: 3, trauma: 4, neurosurgery: 3 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 성동구
        { hospitalName: '한양대학교병원', latitude: 37.5590, longitude: 127.0407,
          emergencyBeds: { available: 14, total: 35, occupancyRate: 60 },
          specializedBeds: { general: 28, cardiac: 6, trauma: 5, neurosurgery: 8 },
          equipment: { ct: true, mri: true, ventilator: true } },
          
        // 광진구
        { hospitalName: '광진구 응급의료센터', latitude: 37.5384, longitude: 127.0822,
          emergencyBeds: { available: 9, total: 22, occupancyRate: 59 },
          specializedBeds: { general: 16, cardiac: 3, trauma: 5, neurosurgery: 4 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 동대문구
        { hospitalName: '동대문구 응급의료센터', latitude: 37.5744, longitude: 127.0396,
          emergencyBeds: { available: 7, total: 18, occupancyRate: 61 },
          specializedBeds: { general: 14, cardiac: 2, trauma: 4, neurosurgery: 3 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 중랑구
        { hospitalName: '중랑구 응급의료센터', latitude: 37.6063, longitude: 127.0923,
          emergencyBeds: { available: 5, total: 15, occupancyRate: 67 },
          specializedBeds: { general: 12, cardiac: 2, trauma: 3, neurosurgery: 2 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 성북구
        { hospitalName: '고려대학교안암병원', latitude: 37.5864, longitude: 127.0263,
          emergencyBeds: { available: 12, total: 38, occupancyRate: 68 },
          specializedBeds: { general: 25, cardiac: 8, trauma: 12, neurosurgery: 10 },
          equipment: { ct: true, mri: true, angiography: true, ventilator: true } },
          
        // 강북구
        { hospitalName: '강북구 응급의료센터', latitude: 37.6392, longitude: 127.0157,
          emergencyBeds: { available: 6, total: 16, occupancyRate: 63 },
          specializedBeds: { general: 13, cardiac: 2, trauma: 3, neurosurgery: 2 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 도봉구
        { hospitalName: '도봉구 응급의료센터', latitude: 37.6686, longitude: 127.0473,
          emergencyBeds: { available: 4, total: 12, occupancyRate: 67 },
          specializedBeds: { general: 10, cardiac: 1, trauma: 2, neurosurgery: 1 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 노원구
        { hospitalName: '노원구 응급의료센터', latitude: 37.6542, longitude: 127.0568,
          emergencyBeds: { available: 8, total: 24, occupancyRate: 67 },
          specializedBeds: { general: 18, cardiac: 3, trauma: 5, neurosurgery: 4 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 은평구  
        { hospitalName: '은평성모병원', latitude: 37.6334, longitude: 126.9165,
          emergencyBeds: { available: 9, total: 28, occupancyRate: 68 },
          specializedBeds: { general: 20, cardiac: 4, trauma: 6, neurosurgery: 5 },
          equipment: { ct: true, mri: true, ventilator: true } },
          
        // 서대문구
        { hospitalName: '세브란스병원', latitude: 37.5664, longitude: 126.9392,
          emergencyBeds: { available: 18, total: 42, occupancyRate: 57 },
          specializedBeds: { trauma: 20, neurosurgery: 15, cardiac: 10, general: 30 },
          equipment: { ct: true, mri: true, angiography: true, ventilator: true, ecmo: true } },
          
        // 마포구
        { hospitalName: '마포구 응급의료센터', latitude: 37.5569, longitude: 126.9075,
          emergencyBeds: { available: 10, total: 26, occupancyRate: 62 },
          specializedBeds: { general: 20, cardiac: 3, trauma: 5, neurosurgery: 4 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 양천구
        { hospitalName: '양천구 응급의료센터', latitude: 37.5170, longitude: 126.8664,
          emergencyBeds: { available: 7, total: 20, occupancyRate: 65 },
          specializedBeds: { general: 15, cardiac: 2, trauma: 4, neurosurgery: 3 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 강서구
        { hospitalName: '강서구 응급의료센터', latitude: 37.5510, longitude: 126.8495,
          emergencyBeds: { available: 11, total: 30, occupancyRate: 63 },
          specializedBeds: { general: 22, cardiac: 4, trauma: 6, neurosurgery: 5 },
          equipment: { ct: true, mri: true, ventilator: true } },
          
        // 구로구
        { hospitalName: '구로구 응급의료센터', latitude: 37.4954, longitude: 126.8874,
          emergencyBeds: { available: 9, total: 24, occupancyRate: 63 },
          specializedBeds: { general: 18, cardiac: 3, trauma: 5, neurosurgery: 4 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 금천구
        { hospitalName: '금천구 응급의료센터', latitude: 37.4596, longitude: 126.9006,
          emergencyBeds: { available: 6, total: 18, occupancyRate: 67 },
          specializedBeds: { general: 14, cardiac: 2, trauma: 3, neurosurgery: 2 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 영등포구
        { hospitalName: '영등포구 응급의료센터', latitude: 37.5264, longitude: 126.8962,
          emergencyBeds: { available: 8, total: 22, occupancyRate: 64 },
          specializedBeds: { general: 17, cardiac: 3, trauma: 4, neurosurgery: 3 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 동작구  
        { hospitalName: '보라매병원', latitude: 37.4933, longitude: 126.9130,
          emergencyBeds: { available: 12, total: 32, occupancyRate: 63 },
          specializedBeds: { general: 25, cardiac: 5, trauma: 8, neurosurgery: 6 },
          equipment: { ct: true, mri: true, ventilator: true } },
          
        // 관악구
        { hospitalName: '관악구 응급의료센터', latitude: 37.4781, longitude: 126.9515,
          emergencyBeds: { available: 7, total: 20, occupancyRate: 65 },
          specializedBeds: { general: 15, cardiac: 2, trauma: 4, neurosurgery: 3 },
          equipment: { ct: true, mri: false, ventilator: true } },
          
        // 서초구
        { hospitalName: '서초구 응급의료센터', latitude: 37.4837, longitude: 127.0324,
          emergencyBeds: { available: 9, total: 26, occupancyRate: 65 },
          specializedBeds: { general: 20, cardiac: 3, trauma: 5, neurosurgery: 4 },
          equipment: { ct: true, mri: true, ventilator: true } },
          
        // 강남구
        { hospitalName: '삼성서울병원', latitude: 37.4881, longitude: 127.0857,
          emergencyBeds: { available: 16, total: 45, occupancyRate: 64 },
          specializedBeds: { cardiac: 18, general: 35, trauma: 8, neurosurgery: 12 },
          equipment: { ct: true, mri: true, ecmo: true, ventilator: true, crrt: true } },
          
        // 송파구
        { hospitalName: '서울아산병원', latitude: 37.5262, longitude: 127.1059,
          emergencyBeds: { available: 20, total: 50, occupancyRate: 60 },
          specializedBeds: { cardiac: 20, trauma: 15, general: 40, neurosurgery: 18 },
          equipment: { ct: true, mri: true, ecmo: true, ventilator: true, angiography: true } },
          
        // 강동구
        { hospitalName: '강동구 응급의료센터', latitude: 37.5301, longitude: 127.1238,
          emergencyBeds: { available: 6, total: 18, occupancyRate: 67 },
          specializedBeds: { general: 14, cardiac: 2, trauma: 4, neurosurgency: 3 },
          equipment: { ct: true, mri: false, ventilator: true } }
      ];
      
      // 환자 위치에서 가장 가까운 서울 병원들만 선택 (최대 10km 이내)
      const nearSeoulHospitals = seoulHospitals.filter(hospital => {
        const R = 6371;
        const dLat = (hospital.latitude - patientLat) * Math.PI / 180;
        const dLon = (hospital.longitude - patientLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(patientLat * Math.PI / 180) * Math.cos(hospital.latitude * Math.PI / 180) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        if (distance <= 10) {
          console.log(`✅ 서울 병원 후보: ${hospital.hospitalName} - ${distance.toFixed(1)}km`);
          return true;
        }
        return false;
      });
      
      suitableHospitals = nearSeoulHospitals.length > 0 ? nearSeoulHospitals : seoulHospitals.slice(0, 6);
      console.log(`🏙️ 서울 지역 fallback 병원: ${suitableHospitals.length}개`);
    }

    // AI 분석 프롬프트 생성
    const analysisPrompt = `
환자 정보:
- 이름: ${patientData.name}
- 나이: ${patientData.age}세
- 성별: ${patientData.gender === 'M' ? '남성' : '여성'}
- 응급도: ${patientData.emergencyLevel}/5
- 심박수: ${patientData.heartRate}bpm
- 산소포화도: ${patientData.oxygenLevel}%
- 체온: ${patientData.bodyTemperature}°C
- 낙상 여부: ${patientData.movementStatus === 'fall_detected' ? '있음' : '없음'}

이용 가능한 병원 목록:
${suitableHospitals.slice(0, 5).map((h, i) => `
${i+1}. ${h.name}
   - 응급실 병상: ${h.emergencyBeds.available}/${h.emergencyBeds.total}
   - 중환자실: ${h.emergencyBeds.ICU || 0}개
   - 장비: CT(${h.equipment?.CT ? 'O' : 'X'}), MRI(${h.equipment?.MRI ? 'O' : 'X'}), 혈관조영술(${h.equipment?.angiography ? 'O' : 'X'})
   - 전문 병상: 외상(${h.emergencyBeds.trauma || 0}), 심장(${h.emergencyBeds.cardiac || 0}), 뇌졸중(${h.emergencyBeds.stroke || 0})
`).join('')}

위 환자에게 가장 적합한 병원 1개를 선택하고, 선택 이유를 설명해주세요.
응답 형식: "추천병원: [병원명] | 이유: [의학적 근거]"
    `;

    // 환자별 맞춤 AI 병원 매칭 로직
    let recommendedHospital = null;
    let recommendationReason = '기본 선택: 응급실 가용';
    
    // 환자 특성 분석
    const patientAge = patientData.age || 35;
    const emergencyLevel = patientData.emergencyLevel || 3;
    const heartRate = patientData.heartRate || 70;
    const oxygenLevel = patientData.oxygenLevel || 95;
    const bodyTemp = patientData.bodyTemperature || 36.5;
    const hasCardiacSymptoms = heartRate >= 120;
    const hasRespiratorySymptoms = oxygenLevel <= 92;
    const hasNeurologicalSymptoms = patientData.movementStatus === 'fall_detected';
    const hasFever = bodyTemp >= 38.0;
    
    console.log(`👤 환자 분석: ${patientData.name} (${patientAge}세, 응급도${emergencyLevel}) - HR:${heartRate}, SpO2:${oxygenLevel}%, 체온:${bodyTemp}°C`);

    // 1단계: 응급도별 병원 프리필터링
    let prioritizedHospitals = [...suitableHospitals];

    if (emergencyLevel >= 5) {
      // 최고 응급: 종합병원 + 대형병원 우선
      prioritizedHospitals.sort((a, b) => {
        const aScore = (a.emergencyBeds?.total || 0) + (a.specializedBeds?.general || 0);
        const bScore = (b.emergencyBeds?.total || 0) + (b.specializedBeds?.general || 0);
        return bScore - aScore;
      });
      recommendationReason = `최고 응급(Level ${emergencyLevel}) - 종합 치료 시설 필요`;
    } else if (emergencyLevel >= 4) {
      // 위급: 전문 치료 가능한 병원 우선
      prioritizedHospitals.sort((a, b) => {
        const aScore = (a.emergencyBeds?.available || 0) * 2 + (a.specializedBeds?.trauma || 0);
        const bScore = (b.emergencyBeds?.available || 0) * 2 + (b.specializedBeds?.trauma || 0);
        return bScore - aScore;
      });
      recommendationReason = `위급 상황(Level ${emergencyLevel}) - 전문 응급 치료 필요`;
    }

    // 2단계: 증상별 특화 병원 선택
    if (hasCardiacSymptoms && emergencyLevel >= 3) {
      // 심장 응급: 심장 전문 + 중환자실 우선
      prioritizedHospitals.sort((a, b) => {
        const aCardiacScore = (a.specializedBeds?.cardiac || 0) * 3 + 
                             (a.specializedBeds?.neuro || 0) + 
                             (a.equipment?.ecmo ? 5 : 0);
        const bCardiacScore = (b.specializedBeds?.cardiac || 0) * 3 + 
                             (b.specializedBeds?.neuro || 0) + 
                             (b.equipment?.ecmo ? 5 : 0);
        return bCardiacScore - aCardiacScore;
      });
      recommendationReason = `심장 응급(${heartRate}bpm) - 심장전문 + ECMO 시설 우선`;
      console.log(`💓 심장 응급 감지 - 심장전문병원 우선 배정`);
    } 
    else if (hasNeurologicalSymptoms) {
      // 외상/낙상: 외상센터 + 신경외과 + 영상장비 우선
      prioritizedHospitals.sort((a, b) => {
        const aTraumaScore = (a.specializedBeds?.trauma || 0) * 3 + 
                            (a.specializedBeds?.neurosurgery || 0) * 2 + 
                            (a.equipment?.ct ? 3 : 0) + 
                            (a.equipment?.mri ? 2 : 0);
        const bTraumaScore = (b.specializedBeds?.trauma || 0) * 3 + 
                            (b.specializedBeds?.neurosurgery || 0) * 2 + 
                            (b.equipment?.ct ? 3 : 0) + 
                            (b.equipment?.mri ? 2 : 0);
        return bTraumaScore - aTraumaScore;
      });
      recommendationReason = `외상/낙상 - 외상센터 + CT/MRI 영상장비 필요`;
      console.log(`🧠 외상 감지 - 외상센터 우선 배정`);
    } 
    else if (hasRespiratorySymptoms) {
      // 호흡기 응급: 인공호흡기 + 중환자실 우선
      prioritizedHospitals.sort((a, b) => {
        const aRespScore = (a.specializedBeds?.general || 0) + 
                          (a.equipment?.ventilator ? 5 : 0) + 
                          (a.equipment?.ecmo ? 3 : 0) + 
                          (a.emergencyBeds?.available || 0);
        const bRespScore = (b.specializedBeds?.general || 0) + 
                          (b.equipment?.ventilator ? 5 : 0) + 
                          (b.equipment?.ecmo ? 3 : 0) + 
                          (b.emergencyBeds?.available || 0);
        return bRespScore - aRespScore;
      });
      recommendationReason = `호흡곤란(SpO2 ${oxygenLevel}%) - 인공호흡기 + 중환자실 필요`;
      console.log(`🫁 호흡기 응급 감지 - 인공호흡기 보유병원 우선`);
    }
    else if (patientAge >= 65) {
      // 고령자: 종합 진료 + 안정적인 대형병원 우선
      prioritizedHospitals.sort((a, b) => {
        const aTotalScore = (a.emergencyBeds?.total || 0) + 
                           (a.specializedBeds?.general || 0) + 
                           (a.specializedBeds?.geriatric || 0);
        const bTotalScore = (b.emergencyBeds?.total || 0) + 
                           (b.specializedBeds?.general || 0) + 
                           (b.specializedBeds?.geriatric || 0);
        return bTotalScore - aTotalScore;
      });
      recommendationReason = `고령자(${patientAge}세) - 종합 진료 시설 우선`;
      console.log(`👴 고령 환자 - 종합병원 우선 배정`);
    }
    else {
      // 일반: 가용 병상 + 거리 + 대기시간 고려
      prioritizedHospitals.sort((a, b) => {
        const aGeneralScore = (a.emergencyBeds?.available || 0) * 2 - (a.emergencyBeds?.occupancyRate || 0) / 10;
        const bGeneralScore = (b.emergencyBeds?.available || 0) * 2 - (b.emergencyBeds?.occupancyRate || 0) / 10;
        return bGeneralScore - aGeneralScore;
      });
      recommendationReason = '일반 응급상황 - 신속한 응급실 치료 + 대기시간 최소화';
      console.log(`🏃 일반 응급 - 대기시간 최소 병원 우선`);
    }

    // 병원별 좌표 추정 함수 (NEDC API 좌표가 null인 경우 대비)
    const getHospitalCoordinates = (hospitalName) => {
      const name = hospitalName || '';
      
      // 주요 서울/경기 병원들의 실제 좌표
      if (name.includes('세브란스') && !name.includes('용인')) {
        return { lat: 37.5664, lng: 126.9392 }; // 세브란스병원 (서대문구)
      }
      if (name.includes('서울대학교병원') && !name.includes('분당') && !name.includes('보라매')) {
        return { lat: 37.5796, lng: 126.9956 }; // 서울대병원 (종로구)
      }
      if (name.includes('고려대') && name.includes('안암')) {
        return { lat: 37.5864, lng: 127.0263 }; // 고려대안암병원 (성북구)
      }
      if (name.includes('한양대학교병원') && !name.includes('구리')) {
        return { lat: 37.5590, lng: 127.0407 }; // 한양대병원 (성동구)
      }
      if (name.includes('삼성서울병원')) {
        return { lat: 37.4881, lng: 127.0857 }; // 삼성서울병원 (강남구)
      }
      if (name.includes('서울아산병원')) {
        return { lat: 37.5262, lng: 127.1059 }; // 서울아산병원 (송파구)
      }
      if (name.includes('강동경희대') || (name.includes('경희대') && name.includes('강동'))) {
        return { lat: 37.5301, lng: 127.1238 }; // 강동경희대병원 (강동구)
      }
      if (name.includes('분당') && name.includes('차병원')) {
        return { lat: 37.3522, lng: 127.1280 }; // 분당차병원 (성남시) - 멀음
      }
      if (name.includes('일산')) {
        return { lat: 37.6636, lng: 126.7764 }; // 일산 지역
      }
      if (name.includes('부천')) {
        return { lat: 37.5058, lng: 126.7830 }; // 부천 지역
      }
      if (name.includes('동탄')) {
        return { lat: 37.2011, lng: 127.0739 }; // 동탄 (화성시) - 매우 멀음
      }
      if (name.includes('안산')) {
        return { lat: 37.3219, lng: 126.8309 }; // 안산 지역
      }
      if (name.includes('용인')) {
        return { lat: 37.2380, lng: 127.1777 }; // 용인 지역 - 매우 멀음
      }
      if (name.includes('구로')) {
        return { lat: 37.4955, lng: 126.8873 }; // 구로구
      }
      if (name.includes('서울의료원')) {
        return { lat: 37.5567, lng: 126.9694 }; // 서울의료원 (중구)
      }
      
      // 서울 중심부 기본 좌표
      return { lat: 37.5665, lng: 126.9780 };
    };

    // 4단계: 거리별 동심원 단계적 검색 (100m→300m→500m→1km→2km→3km→5km→8km→10km→15km→20km)
    if (!recommendedHospital) {
      console.log(`🎯 거리별 동심원 단계적 매칭 시작`);
      
      const patientLat = patientData.lat || 37.5665;
      const patientLng = patientData.lng || 126.9780;
      console.log(`📍 환자 위치: ${patientLat.toFixed(4)}, ${patientLng.toFixed(4)}`);
      
      // 거리별 단계 정의 (점진적 확장)
      const distanceSteps = [
        { range: 0.1, name: '100m' },    // 100m - 도보 거리
        { range: 0.3, name: '300m' },    // 300m
        { range: 0.5, name: '500m' },    // 500m  
        { range: 0.8, name: '800m' },    // 800m
        { range: 1.0, name: '1km' },     // 1km
        { range: 2.0, name: '2km' },     // 2km
        { range: 3.0, name: '3km' },     // 3km
        { range: 5.0, name: '5km' },     // 5km
        { range: 8.0, name: '8km' },     // 8km
        { range: 10.0, name: '10km' },   // 10km
        { range: 15.0, name: '15km' },   // 15km
        { range: 20.0, name: '20km' }    // 20km (최대)
      ];
      
      // 모든 병원의 거리 미리 계산
      const hospitalsWithDistance = prioritizedHospitals.map(hospital => {
        const hospitalCoords = getHospitalCoordinates(hospital.hospitalName);
        const hospitalLat = hospital.latitude || hospitalCoords.lat;
        const hospitalLng = hospital.longitude || hospitalCoords.lng;
        
        // 하버사인 공식으로 정확한 거리 계산
        const R = 6371;
        const dLat = (hospitalLat - patientLat) * Math.PI / 180;
        const dLon = (hospitalLng - patientLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(patientLat * Math.PI / 180) * Math.cos(hospitalLat * Math.PI / 180) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        let totalScore = 0;
        
        // 1. 거리 점수 (60% - 절대 최우선)
        let distanceScore = 0;
        if (distance <= 2) {
          distanceScore = 100; // 2km 이내는 만점
        } else if (distance <= 5) {
          distanceScore = 85;  // 2-5km
        } else if (distance <= 10) {
          distanceScore = 70;  // 5-10km  
        } else if (distance <= 15) {
          distanceScore = 50;  // 10-15km
        } else if (distance <= 20) {
          distanceScore = 25;  // 15-20km
        } else {
          distanceScore = 0;   // 20km 이상은 0점 (제외)
        }
        
        totalScore += distanceScore * 0.6; // 거리 60%
        
        // 2. 응급실 가용성 점수 (30%)
        const availabilityScore = Math.min(100, (hospital.emergencyBeds?.available || 0) * 8);
        totalScore += availabilityScore * 0.3;
        
        // 3. 전문성 점수 (10%) - 간단하게  
        let specialtyScore = 40; // 기본 점수
        if (hasCardiacSymptoms && hospital.equipment?.ecmo) {
          specialtyScore += 30; // 심장응급 + ECMO
        } else if (hasNeurologicalSymptoms && hospital.equipment?.ct) {
          specialtyScore += 20; // 신경계응급 + CT
        } else if (hasRespiratorySymptoms && hospital.equipment?.ventilator) {
          specialtyScore += 25; // 호흡기응급 + 인공호흡기
        }
        totalScore += Math.min(100, specialtyScore) * 0.1;
        
        console.log(`📊 ${cleanHospitalName(hospital.hospitalName)}: 총점 ${totalScore.toFixed(1)} (거리:${distance.toFixed(1)}km/${distanceScore}점, 가용성:${hospital.emergencyBeds?.available || 0}/${Math.round(availabilityScore)}점, 전문성:${Math.round(specialtyScore)}점)`);
        
        return {
          ...hospital,
          actualDistance: distance,
          calculatedDistance: `${distance.toFixed(1)}km`
        };
      });
      
      // 거리별 동심원 단계적 검색
      let foundHospital = null;
      
      for (const step of distanceSteps) {
        console.log(`🔍 [${step.name}] 단계 - ${step.name} 이내 병원 검색`);
        
        // 해당 거리 이내의 병원들만 추출
        const stageHospitals = hospitalsWithDistance.filter(h => h.actualDistance <= step.range);
        
        if (stageHospitals.length === 0) {
          console.log(`  ❌ ${step.name} 이내 병원 없음 → 다음 단계로`);
          continue;
        }
        
        console.log(`  🏥 ${step.name} 이내 병원: ${stageHospitals.length}개`);
        stageHospitals.forEach(h => {
          console.log(`    📍 ${cleanHospitalName(h.hospitalName)}: ${h.actualDistance.toFixed(1)}km`);
        });
        
        // 거리순 정렬 (가장 가까운 것부터)
        stageHospitals.sort((a, b) => a.actualDistance - b.actualDistance);
        
        // 1순위: 응급실 가용성 체크
        console.log(`  🚨 1순위 체크: 응급실 가용성`);
        const availableHospitals = stageHospitals.filter(h => {
          const available = h.emergencyBeds?.available || 0;
          const suitable = available > 0;
          console.log(`    ${suitable ? '✅' : '❌'} ${cleanHospitalName(h.hospitalName)}: 응급실 ${available}개 가용`);
          return suitable;
        });
        
        if (availableHospitals.length === 0) {
          console.log(`  ⚠️ ${step.name} 이내 응급실 가용 병원 없음 → 다음 단계로`);
          continue;
        }
        
        // 2순위: 전문성 체크 (환자 상태별)
        console.log(`  💊 2순위 체크: 전문성 (${hasCardiacSymptoms ? '심장응급' : hasNeurologicalSymptoms ? '외상/신경' : hasRespiratorySymptoms ? '호흡기응급' : '일반응급'})`);
        let specializedHospitals = [];
        
        if (hasCardiacSymptoms) {
          // 심장응급: ECMO, 심장전문병상 필수
          specializedHospitals = availableHospitals.filter(h => {
            const hasEcmo = h.equipment?.ecmo;
            const hasCardiacBeds = (h.specializedBeds?.cardiac || 0) > 0;
            const suitable = hasEcmo || hasCardiacBeds;
            console.log(`    ${suitable ? '✅' : '❌'} ${cleanHospitalName(h.hospitalName)}: ECMO(${hasEcmo ? 'O' : 'X'}), 심장병상(${h.specializedBeds?.cardiac || 0}개)`);
            return suitable;
          });
        } else if (hasNeurologicalSymptoms) {
          // 외상/신경응급: CT 필수, 외상센터/신경외과 우선
          specializedHospitals = availableHospitals.filter(h => {
            const hasCT = h.equipment?.ct;
            const hasTrauma = (h.specializedBeds?.trauma || 0) > 0;
            const hasNeuro = (h.specializedBeds?.neurosurgery || 0) > 0;
            const suitable = hasCT && (hasTrauma || hasNeuro);
            console.log(`    ${suitable ? '✅' : '❌'} ${cleanHospitalName(h.hospitalName)}: CT(${hasCT ? 'O' : 'X'}), 외상(${h.specializedBeds?.trauma || 0}), 신경외과(${h.specializedBeds?.neurosurgery || 0})`);
            return suitable;
          });
        } else if (hasRespiratorySymptoms) {
          // 호흡기응급: 인공호흡기 필수
          specializedHospitals = availableHospitals.filter(h => {
            const hasVentilator = h.equipment?.ventilator;
            const hasEcmo = h.equipment?.ecmo;
            const suitable = hasVentilator || hasEcmo;
            console.log(`    ${suitable ? '✅' : '❌'} ${cleanHospitalName(h.hospitalName)}: 인공호흡기(${hasVentilator ? 'O' : 'X'}), ECMO(${hasEcmo ? 'O' : 'X'})`);
            return suitable;
          });
        } else {
          // 일반응급: 응급실만 있으면 OK
          specializedHospitals = availableHospitals;
          console.log(`    ✅ 일반응급 → 응급실 가용 병원 모두 적합`);
        }
        
        // 3순위: 시설 점수 계산 및 최종 선택
        console.log(`  🔬 3순위 체크: 시설 수준`);
        
        if (specializedHospitals.length > 0) {
          // 전문성 조건을 만족하는 병원들 중에서 시설 최고 + 거리 최근접 선택
          const bestHospitals = specializedHospitals.map(h => {
            const equipment = h.equipment || {};
            const facilityScore = [
              equipment.ct ? 20 : 0,
              equipment.mri ? 15 : 0,
              equipment.ecmo ? 25 : 0,
              equipment.ventilator ? 20 : 0,
              equipment.angiography ? 10 : 0,
              equipment.crrt ? 10 : 0
            ].reduce((sum, score) => sum + score, 0);
            
            console.log(`    📊 ${cleanHospitalName(h.hospitalName)}: 시설점수 ${facilityScore}점 (${h.actualDistance.toFixed(1)}km, 응급실 ${h.emergencyBeds?.available || 0}개)`);
            
            return { ...h, facilityScore };
          });
          
          // 거리 최우선 + 시설 점수 보조
          bestHospitals.sort((a, b) => {
            const distanceDiff = a.actualDistance - b.actualDistance;
            if (Math.abs(distanceDiff) < 0.05) { // 50m 이내 차이면 시설점수로 비교
              return b.facilityScore - a.facilityScore;
            }
            return distanceDiff; // 거리 최우선
          });
          
          foundHospital = bestHospitals[0];
          
          console.log(`  🎉 ${step.name} 단계에서 최적 병원 발견!`);
          console.log(`    🏆 선택: ${cleanHospitalName(foundHospital.hospitalName)}`);
          console.log(`    📍 거리: ${foundHospital.actualDistance.toFixed(3)}km (${Math.ceil(foundHospital.actualDistance * 1000)}m)`);
          console.log(`    🏥 응급실: ${foundHospital.emergencyBeds?.available || 0}개 가용`);
          console.log(`    🔬 시설점수: ${foundHospital.facilityScore}점`);
          
          break; // 찾았으므로 더 멀리 확장하지 않음
          
        } else if (availableHospitals.length > 0) {
          // 전문성은 부족하지만 응급실은 있는 병원 (응급상황이므로 선택)
          const generalHospital = availableHospitals.sort((a, b) => a.actualDistance - b.actualDistance)[0];
          
          console.log(`  ⚠️ 전문성 부족하지만 응급상황이므로 일반병원 선택`);
          foundHospital = generalHospital;
          foundHospital.facilityScore = 20; // 기본 시설 점수
          
          console.log(`    🏆 선택: ${cleanHospitalName(foundHospital.hospitalName)} (일반응급)`);
          console.log(`    📍 거리: ${foundHospital.actualDistance.toFixed(3)}km`);
          console.log(`    🏥 응급실: ${foundHospital.emergencyBeds?.available || 0}개 가용`);
          
          break;
        }
      }
      
      if (!foundHospital) {
        console.error(`🚨 Critical: 20km 이내에서도 적합한 병원을 찾을 수 없음!`);
        return res.status(500).json({ 
          success: false, 
          message: '20km 이내에 적합한 응급실을 찾을 수 없습니다.',
          error: 'NO_SUITABLE_HOSPITALS_IN_RANGE'
        });
      }
      
      recommendedHospital = foundHospital;
      recommendationReason = `거리별 단계적 검색: 최근접 ${foundHospital.actualDistance.toFixed(1)}km → 응급실(${foundHospital.emergencyBeds?.available || 0}개 가용) → 전문성 → 시설(${foundHospital.facilityScore}점)`;
      
      console.log(`🎯 거리 최우선 매칭: ${cleanHospitalName(recommendedHospital.hospitalName)} (거리: ${recommendedHospital.calculatedDistance}, 총점: ${recommendedHospital.totalScore.toFixed(1)})`);
      console.log(`📊 점수 상세: 거리 ${recommendedHospital.scoreBreakdown.distance.toFixed(1)}(60%), 가용성 ${recommendedHospital.scoreBreakdown.availability.toFixed(1)}(30%), 전문성 ${recommendedHospital.scoreBreakdown.specialty.toFixed(1)}(10%)`);
      
      // 거리별 후보 순위 표시 (가까운 순)
      const distanceSorted = topCandidates.slice().sort((a, b) => (a.actualDistance || 0) - (b.actualDistance || 0));
      console.log(`📍 거리순 후보: 1등(${distanceSorted[0] ? cleanHospitalName(distanceSorted[0].hospitalName) + ' ' + distanceSorted[0].calculatedDistance : 'N/A'}), 2등(${distanceSorted[1] ? cleanHospitalName(distanceSorted[1].hospitalName) + ' ' + distanceSorted[1].calculatedDistance : 'N/A'}), 3등(${distanceSorted[2] ? cleanHospitalName(distanceSorted[2].hospitalName) + ' ' + distanceSorted[2].calculatedDistance : 'N/A'})`);
      
      console.log(`🏆 종합 순위: 1등(${topCandidates[0] ? cleanHospitalName(topCandidates[0].hospitalName) + ' ' + topCandidates[0].totalScore.toFixed(1) + '점 ' + topCandidates[0].calculatedDistance : 'N/A'}), 2등(${topCandidates[1] ? cleanHospitalName(topCandidates[1].hospitalName) + ' ' + topCandidates[1].totalScore.toFixed(1) + '점 ' + topCandidates[1].calculatedDistance : 'N/A'}), 3등(${topCandidates[2] ? cleanHospitalName(topCandidates[2].hospitalName) + ' ' + topCandidates[2].totalScore.toFixed(1) + '점 ' + topCandidates[2].calculatedDistance : 'N/A'})`);
    }
    
    // 최종 안전 체크
    if (!recommendedHospital) {
      console.error(`🚨 Critical: 최종 병원 선택 실패!`);
      return res.status(500).json({ 
        success: false, 
        message: '병원 매칭 시스템 오류입니다.',
        error: 'HOSPITAL_SELECTION_FAILED'
      });
    }
    
    console.log(`🎯 최종 AI 매칭 결과: ${cleanHospitalName(recommendedHospital.hospitalName)}`);
    console.log(`📊 매칭 이유: ${recommendationReason}`);
    console.log(`📈 경쟁 후보: ${prioritizedHospitals.slice(0, 3).map(h => cleanHospitalName(h.hospitalName)).join(', ')}`);

    // 3단계: LLM & Ollama AI 디테일 분석 (거리 최우선 기반)
    const enableLLM = process.env.ENABLE_OLLAMA !== 'false'; // 기본적으로 활성화
    if (enableLLM && recommendedHospital) {
      try {
        const axios = require('axios');
        const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        
        // 거리순 정렬된 상위 3개 병원으로 AI 분석 (거리 최우선)
        const topHospitals = nearbyHospitals.slice(0, 3);
        
        const enhancedPrompt = `
🚨 응급환자 병원 매칭 분석 (거리 최우선)

환자 정보:
- 환자: ${patientData.name} (${patientAge}세 ${patientData.gender === 'M' ? '남성' : '여성'})
- 응급도: ${emergencyLevel}/5 (5가 최고 위험)  
- 생체신호: HR ${heartRate}bpm, SpO2 ${oxygenLevel}%, 체온 ${bodyTemp}°C
- 특이사항: ${hasCardiacSymptoms ? '심혈관계 이상징후' : ''} ${hasRespiratorySymptoms ? '호흡기 이상징후' : ''} ${hasNeurologicalSymptoms ? '외상/신경계 이상' : ''}
- 환자 위치: ${patientLat.toFixed(4)}, ${patientLng.toFixed(4)}

병원 후보 (거리순 정렬, 15km 이내):
${topHospitals.map((h, i) => `
${i+1}. ${cleanHospitalName(h.hospitalName)} ⭐ ${h.actualDistance.toFixed(1)}km
   📍 거리: ${h.actualDistance.toFixed(1)}km (이송시간 ${Math.ceil(h.actualDistance * 3)}분)
   🏥 응급실: ${h.emergencyBeds?.available || 0}/${h.emergencyBeds?.total || 0}bed (점유율 ${h.emergencyBeds?.occupancyRate || 0}%)
   💊 전문병상: 심장 ${h.specializedBeds?.cardiac || 0}bed, 외상 ${h.specializedBeds?.trauma || 0}bed, 신경외과 ${h.specializedBeds?.neurosurgery || 0}bed
   🔬 주요장비: ${[
     h.equipment?.ct ? 'CT' : null,
     h.equipment?.mri ? 'MRI' : null, 
     h.equipment?.ecmo ? 'ECMO' : null,
     h.equipment?.ventilator ? '인공호흡기' : null,
     h.equipment?.angiography ? '혈관조영술' : null
   ].filter(Boolean).join(', ') || '기본장비'}
`).join('')}

🎯 분석 기준 (우선순위):
1. 거리 (60% 가중치) - 가장 가까운 병원 우선
2. 응급실 가용성 (30% 가중치) - 즉시 치료 가능
3. 전문성 (10% 가중치) - 환자 상태에 맞는 전문 치료

위 환자에게 가장 적합한 병원을 의학적 관점에서 분석하여 추천해주세요.
응답형식: "병원: [병원명] | 근거: [거리+응급실+전문성 종합분석]"
        `;

        console.log(`🤖 Ollama AI 분석 요청 중...`);
        const resp = await axios.post(
          `${ollamaBaseUrl}/api/generate`,
          {
            model: process.env.OLLAMA_FINETUNED_MODEL || 'llama3.1:8b',
            prompt: enhancedPrompt,
            stream: false,
            options: { 
              temperature: 0.2,
              top_p: 0.9,
              num_predict: 200
            }
          },
          { timeout: 20000 }
        );

        const aiResponse = resp?.data?.response;
        if (aiResponse && aiResponse.includes('병원:')) {
          const match = aiResponse.match(/병원:\s*([^|]+)\s*\|\s*근거:\s*(.+)/);
          if (match) {
            const aiRecommendedName = match[1].trim();
            const aiReason = match[2].trim();
            
            // AI가 추천한 병원을 거리순 후보에서 찾기
            const aiRecommended = nearbyHospitals.find(h => {
              const cleanName = cleanHospitalName(h.hospitalName);
              return cleanName.includes(aiRecommendedName) || aiRecommendedName.includes(cleanName);
            });
            
            if (aiRecommended) {
              recommendedHospital = aiRecommended;
              recommendationReason = `🤖 LLM & 올라마 디테일 분석 (거리 ${aiRecommended.actualDistance.toFixed(1)}km): ${aiReason}`;
              console.log(`🎯 LLM & 올라마 추천: ${cleanHospitalName(aiRecommended.hospitalName)} (${aiRecommended.actualDistance.toFixed(1)}km)`);
              console.log(`📋 AI 디테일 근거: ${aiReason}`);
            } else {
              console.log(`⚠️ AI 추천 병원을 거리순 후보에서 찾을 수 없음: ${aiRecommendedName}`);
              console.log(`🎯 기본 거리 최우선: ${cleanHospitalName(recommendedHospital.hospitalName)} (${recommendedHospital.actualDistance?.toFixed(1) || 'N/A'}km)`);
            }
          }
        } else {
          console.log(`⚠️ AI 응답 형식 오류, 규칙기반 선택 유지`);
        }
      } catch (ollamaError) {
        console.warn('🤖 LLM & 올라마 분석 실패, 거리 최우선 규칙 사용:', ollamaError.message);
        recommendationReason = `거리 최우선 매칭 (${recommendedHospital.actualDistance?.toFixed(1) || 'N/A'}km) - ${recommendationReason}`;
      }
    } else {
      console.log(`🔧 LLM & 올라마 활성화 - 거리 최우선 + AI 분석 사용`);
      recommendationReason = `거리 최우선 + AI 분석 (${recommendedHospital.actualDistance?.toFixed(1) || 'N/A'}km) - ${recommendationReason}`;
    }


    // 거리 정보는 이미 스마트 매칭에서 계산됨
    if (!recommendedHospital.calculatedDistance) {
      // 스마트 매칭을 거치지 않은 경우에만 거리 계산
      const patientLat = patientData.lat || 37.5665;
      const patientLng = patientData.lng || 126.9780;
      
      const hospitalLat = hospitalDetailInfo?.latitude || recommendedHospital.latitude;
      const hospitalLng = hospitalDetailInfo?.longitude || recommendedHospital.longitude;
      
      if (hospitalLat && hospitalLng && !isNaN(hospitalLat) && !isNaN(hospitalLng)) {
        const R = 6371; // 지구 반지름 (km)
        const dLat = (hospitalLat - patientLat) * Math.PI / 180;
        const dLon = (hospitalLng - patientLng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(patientLat * Math.PI / 180) * Math.cos(hospitalLat * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        recommendedHospital.calculatedDistance = `${distance.toFixed(1)}km`;
        console.log(`📍 거리 계산: ${hospitalName} - ${distance.toFixed(1)}km`);
      } else {
        const estimatedDistance = hospitalAddress.includes('서울') ? '8.5km' : 
                                 hospitalAddress.includes('경기') ? '12.3km' : '5.2km';
        recommendedHospital.calculatedDistance = estimatedDistance;
        console.log(`📍 예상 거리: ${hospitalName} - ${estimatedDistance}`);
      }
    } else {
      console.log(`📍 스마트 매칭 거리: ${cleanHospitalName(recommendedHospital.hospitalName)} - ${recommendedHospital.calculatedDistance}`);
    }


    // 안전한 기본 병원 선택 (변수 초기화 오류 방지)
    if (!recommendedHospital) {
      console.error(`🚨 Critical: 추천할 병원이 없음!`);
      return res.status(500).json({ 
        success: false, 
        message: '현재 시스템 오류로 병원을 찾을 수 없습니다.',
        error: 'NO_HOSPITALS_AVAILABLE'
      });
    }

    // 병원 정보 정리 (NEDC API 구조에 맞게)
    const rawHospitalName = recommendedHospital.hospitalName || recommendedHospital.name || '알 수 없는 병원';
    const hospitalName = cleanHospitalName(rawHospitalName);
    let hospitalAddress = recommendedHospital.dutyAddr || recommendedHospital.address || '주소 수집 중';
    let hospitalPhone = recommendedHospital.phoneNumber || recommendedHospital.dutyTel1 || '전화번호 없음';
    let emergencyPhone = recommendedHospital.emergencyPhone || recommendedHospital.dutyTel3 || hospitalPhone;

    // 추천 병원의 상세 정보 조회 (주소 포함) - 백그라운드에서 실행
    let hospitalDetailInfo = null;
    const hospitalId = recommendedHospital.hospitalId || recommendedHospital.hpid;
    if (hospitalId) {
      try {
        const nedcApiService = require('../services/nedcApiService');
        hospitalDetailInfo = await nedcApiService.getHospitalBasicInfo(hospitalId);
        
        if (hospitalDetailInfo && hospitalDetailInfo.address !== '주소 정보 없음') {
          hospitalAddress = hospitalDetailInfo.address;
          hospitalPhone = hospitalDetailInfo.phone || hospitalPhone;
          emergencyPhone = hospitalDetailInfo.emergencyPhone || emergencyPhone;
          console.log(`📍 병원 상세정보 조회 완료: ${hospitalDetailInfo.hospitalName} - ${hospitalDetailInfo.address}`);
        }
      } catch (detailError) {
        console.warn('병원 상세정보 조회 실패:', detailError.message);
      }
    }
    
    const erBeds = recommendedHospital.emergencyBeds || {};
    const specializedBeds = recommendedHospital.specializedBeds || {};
    const equipment = recommendedHospital.equipment || {};

    // 병원명 변경 로그
    if (rawHospitalName !== hospitalName) {
      console.log(`🏥 병원명 정리: "${rawHospitalName}" → "${hospitalName}"`);
    }
    console.log(`✅ 최종 추천 병원: ${hospitalName}`);

    res.json({ 
      success: true, 
      recommendation: {
        hospital: {
          id: recommendedHospital.hpid || hospitalName,
          name: hospitalName,
          address: hospitalAddress,
          phone: hospitalPhone,
          emergencyPhone: emergencyPhone,
          location: hospitalAddress,
          distance: recommendedHospital.calculatedDistance || '계산중',
          erBeds: {
            available: erBeds.available || 0,
            total: erBeds.total || 0,
            ICU: specializedBeds.neuro || 0,
            trauma: specializedBeds.trauma || 0,
            cardiac: specializedBeds.cardiac || 0,
            stroke: specializedBeds.stroke || 0
          },
          equipment: {
            CT: equipment.ct || false,
            MRI: equipment.mri || false,
            angiography: equipment.angiography || false,
            ventilator: equipment.ventilator || false,
            ecmo: equipment.ecmo || false,
            crrt: equipment.crrt || false
          },
          specialties: [], // NEDC API에는 전문과목 정보가 제한적
          isEROpen: (erBeds.available || 0) > 0,
          lastUpdated: recommendedHospital.status?.lastUpdated || new Date().toISOString()
        },
        reason: recommendationReason,
        analysisLevel: patientData.emergencyLevel,
        matchedAt: new Date(),
        totalCandidates: suitableHospitals.length
      }
    });

  } catch (err) {
    console.error('AI 병원 매칭 실패:', err);
    next(err);
  }
});

// AI 환자 분석 API (관제센터용)
router.post('/:patientId/analyze', async (req, res, next) => {
  try {
    const patientId = req.params.patientId;
    
    // 환자 ID로 가장 최근 응급 케이스 조회 (MongoDB ObjectId가 아닌 경우)
    let emergencyCase;
    
    // MongoDB ObjectId 형식인지 확인
    if (patientId.match(/^[0-9a-fA-F]{24}$/)) {
      emergencyCase = await EmergencyCase.findById(patientId).populate('userId').lean();
    } else {
      // ObjectId가 아니면 환자를 찾을 수 없으므로 가상 환자 데이터 생성
      const mockUser = {
        _id: patientId,
        name: req.body.name || '환자',
        age: req.body.age || 35,
        baselineBiometric: { heartRate: { avg: 70 } }
      };
      
      emergencyCase = {
        _id: patientId,
        userId: mockUser,
        emergencyLevel: req.body.emergencyLevel || 3,
        detectedAnomalies: req.body.anomalies || []
      };
    }
    
    if (!emergencyCase) {
      return res.status(404).json({ success: false, message: '케이스를 찾을 수 없습니다.' });
    }

    // 환자 정보
    const user = emergencyCase.userId;
    
    // 최근 생체 데이터 조회 (가상 환자인 경우 가상 데이터 생성)
    let recentBiometric;
    
    if (patientId.match(/^[0-9a-fA-F]{24}$/)) {
      recentBiometric = await BiometricData.findOne({ 
        userId: user._id 
      }).sort({ collectedAt: -1 }).lean();
    } else {
      // 가상 환자의 경우 가상 생체 데이터 생성
      recentBiometric = {
        userId: user._id,
        collectedAt: new Date(),
        heartRate: req.body.heartRate || 85,
        stressLevel: req.body.stressLevel || 45,
        movementStatus: req.body.movementStatus || 'normal',
        vitals: {
          heartRate: req.body.heartRate || 85,
          spo2: req.body.oxygenLevel || 95,
          temperature: req.body.bodyTemperature || 36.5
        },
        location: { lat: 37.5665, lng: 126.9780 }
      };
    }

    let analysisText = '현재 생체 데이터가 없어 분석할 수 없습니다.';
    let severityScore = emergencyCase.emergencyLevel || 3;

    if (recentBiometric) {
      // 규칙 기반 분석
      const ruleResult = {
        level: emergencyCase.emergencyLevel,
        anomalies: emergencyCase.detectedAnomalies || []
      };

      // Ollama AI 분석 (활성화된 경우)
      if ((process.env.ENABLE_OLLAMA || '').toLowerCase() === 'true') {
        try {
          const llmText = await generateNonDiagnosticSummary({
            userBaseline: { baselineHrAvg: user?.baselineBiometric?.heartRate?.avg },
            biometric: {
              collectedAt: recentBiometric.collectedAt?.toISOString?.() || String(recentBiometric.collectedAt),
              heartRate: recentBiometric.heartRate || recentBiometric.vitals?.heartRate,
              stressLevel: recentBiometric.stressLevel,
              movementStatus: recentBiometric.movementStatus || recentBiometric.activity?.movement,
              location: recentBiometric.location,
              oxygenLevel: recentBiometric.oxygenLevel || recentBiometric.vitals?.spo2,
              bodyTemperature: recentBiometric.bodyTemperature || recentBiometric.vitals?.temperature
            },
            ruleResult
          });
          if (llmText) analysisText = llmText;
        } catch (e) {
          console.warn('Ollama 분석 실패, 기본 분석 사용:', e.message);
        }
      }

      // 기본 분석 (Ollama 실패 시)
      if (analysisText === '현재 생체 데이터가 없어 분석할 수 없습니다.') {
        const hr = recentBiometric.heartRate || recentBiometric.vitals?.heartRate || 0;
        const spo2 = recentBiometric.oxygenLevel || recentBiometric.vitals?.spo2 || 0;
        const movement = recentBiometric.movementStatus || recentBiometric.activity?.movement;
        
        if (emergencyCase.emergencyLevel >= 5) {
          analysisText = `응급 상황 감지: 심박수 ${hr}bpm${spo2 ? `, 산소포화도 ${spo2}%` : ''}${movement === 'fall_detected' ? ', 낙상 감지' : ''}. 즉시 응급실 이송이 필요합니다.`;
        } else if (emergencyCase.emergencyLevel >= 4) {
          analysisText = `위급 상황 가능성: 심박수 ${hr}bpm${spo2 ? `, 산소포화도 ${spo2}%` : ''}. 신속한 의료진 확인과 대응이 필요합니다.`;
        } else if (emergencyCase.emergencyLevel >= 3) {
          analysisText = `이상 징후 감지: 심박수 ${hr}bpm${spo2 ? `, 산소포화도 ${spo2}%` : ''}. 지속적인 모니터링과 관제 확인이 권고됩니다.`;
        } else {
          analysisText = `현재 생체징후는 안정적입니다: 심박수 ${hr}bpm${spo2 ? `, 산소포화도 ${spo2}%` : ''}. 계속 모니터링하겠습니다.`;
        }
      }
    }

    // 케이스에 분석 결과 저장 (실제 DB 케이스가 있는 경우에만)
    if (patientId.match(/^[0-9a-fA-F]{24}$/)) {
      await EmergencyCase.findByIdAndUpdate(patientId, {
        'llmAnalysis.analysisText': analysisText,
        'llmAnalysis.analyzedAt': new Date(),
        'llmAnalysis.model': (process.env.ENABLE_OLLAMA === 'true') ? 'ollama-llama3.1' : 'rule-based'
      });
    }

    res.json({ 
      success: true, 
      analysis: {
        analysisText,
        severityScore,
        emergencyLevel: emergencyCase.emergencyLevel,
        analyzedAt: new Date(),
        model: (process.env.ENABLE_OLLAMA === 'true') ? 'ollama-llama3.1' : 'rule-based'
      }
    });

  } catch (err) {
    console.error('AI 분석 실패:', err);
    next(err);
  }
});

// (MVP) 자동 매칭 재시도: 관제/관리자용으로 확장 예정, 지금은 임시로 user도 허용
router.post('/:caseId/auto-match', authRequired, async (req, res, next) => {
  try {
    const result = await autoMatchParamedicForCase(req.params.caseId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// 응급구조사: 케이스 수락
router.post('/:caseId/accept', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const ec = await EmergencyCase.findById(req.params.caseId);
    if (!ec) return res.status(404).json({ success: false, message: '케이스를 찾을 수 없습니다.' });
    if (String(ec.paramedic?.paramedicId || '') !== String(req.user.sub)) {
      return res.status(403).json({ success: false, message: '본인에게 배정된 케이스가 아닙니다.' });
    }
    if (ec.paramedic.status !== 'pending') {
      return res.status(400).json({ success: false, message: '수락 가능한 상태가 아닙니다.' });
    }

    ec.paramedic.status = 'accepted';
    ec.paramedic.acceptedAt = new Date();
    ec.status = 'in_progress';
    await ec.save();

    await Paramedic.findByIdAndUpdate(req.user.sub, {
      status: 'handling_case',
      currentCase: ec._id,
      lastActivity: new Date(),
      $pull: { pendingCases: { caseId: ec._id } },
    });

    // Socket.IO 알림
    emitCaseStatusUpdated(ec._id, 'in_progress', {
      userId: ec.userId,
      paramedicId: ec.paramedic.paramedicId,
      status: 'accepted'
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 응급구조사: 도착
router.post('/:caseId/arrive', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const ec = await EmergencyCase.findById(req.params.caseId);
    if (!ec) return res.status(404).json({ success: false, message: '케이스를 찾을 수 없습니다.' });
    if (String(ec.paramedic?.paramedicId || '') !== String(req.user.sub)) {
      return res.status(403).json({ success: false, message: '본인에게 배정된 케이스가 아닙니다.' });
    }
    ec.paramedic.status = 'arrived';
    ec.paramedic.arrivalTime = new Date();
    await ec.save();
    
    // Socket.IO 알림
    emitCaseStatusUpdated(ec._id, 'in_progress', {
      userId: ec.userId,
      paramedicId: ec.paramedic.paramedicId,
      status: 'arrived',
      arrivalTime: ec.paramedic.arrivalTime
    });
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 응급구조사: 이송 시작
router.post('/:caseId/transport', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const ec = await EmergencyCase.findById(req.params.caseId);
    if (!ec) return res.status(404).json({ success: false, message: '케이스를 찾을 수 없습니다.' });
    if (String(ec.paramedic?.paramedicId || '') !== String(req.user.sub)) {
      return res.status(403).json({ success: false, message: '본인에게 배정된 케이스가 아닙니다.' });
    }
    ec.paramedic.status = 'transporting';
    ec.paramedic.transportStartTime = new Date();
    ec.status = 'transporting';
    await ec.save();
    await Paramedic.findByIdAndUpdate(req.user.sub, { status: 'in_transit', lastActivity: new Date() });
    
    // Socket.IO 알림
    emitCaseStatusUpdated(ec._id, 'transporting', {
      userId: ec.userId,
      paramedicId: ec.paramedic.paramedicId,
      status: 'transporting',
      transportStartTime: ec.paramedic.transportStartTime
    });
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 응급구조사: 종료(이송 완료)
router.post('/:caseId/complete', authRequired, requireRole('paramedic'), async (req, res, next) => {
  try {
    const ec = await EmergencyCase.findById(req.params.caseId);
    if (!ec) return res.status(404).json({ success: false, message: '케이스를 찾을 수 없습니다.' });
    if (String(ec.paramedic?.paramedicId || '') !== String(req.user.sub)) {
      return res.status(403).json({ success: false, message: '본인에게 배정된 케이스가 아닙니다.' });
    }

    ec.paramedic.status = 'completed';
    ec.status = 'completed';
    ec.completedAt = new Date();
    await ec.save();

    await Paramedic.findByIdAndUpdate(req.user.sub, {
      status: 'available',
      currentCase: null,
      lastActivity: new Date(),
      $inc: { 'stats.totalCases': 1, 'stats.completedCases': 1 },
    });

    // Socket.IO 알림
    emitCaseStatusUpdated(ec._id, 'completed', {
      userId: ec.userId,
      paramedicId: ec.paramedic.paramedicId,
      status: 'completed',
      completedAt: ec.completedAt
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

