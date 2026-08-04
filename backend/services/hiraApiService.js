/**
 * 건강보험심사평가원(HIRA) 병원정보서비스 API 연동 서비스
 * End Point: https://apis.data.go.kr/B551182/hospInfoServicev2
 */

const axios = require('axios');
const cron = require('node-cron');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');
const { normalizeServiceKey, hasUsableServiceKey } = require('../utils/serviceKeyUtils');

/**
 * HIRA 병원 정보 API와 캐시/스케줄러를 함께 관리하는 서비스 클래스입니다.
 */
class HiraApiService {
  /**
   * HIRA 기본 URL, 인증키, 병원 캐시, 자동 갱신 상태를 초기화합니다.
   */
  constructor() {
    this.baseURL = 'https://apis.data.go.kr/B551182/hospInfoServicev2';
    this.serviceKey = normalizeServiceKey(process.env.HIRA_API_SERVICE_KEY);
    this.hospitalCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30분 캐시
    this.isSchedulerRunning = false;
    
    console.log('🏥 HIRA API 서비스 초기화 (30분 캐시)');
  }

  /**
   * HIRA 공용 캐시 키를 생성합니다.
   */
  buildSharedCacheKey(cacheKey) {
    return `external:hira:${cacheKey}`;
  }

  /**
   * 공용 캐시를 우선 조회하고 없으면 기존 메모리 캐시를 확인합니다.
   */
  async readHospitalCache(cacheKey, ttlMs = this.cacheExpiry) {
    const shared = await cacheService.get(this.buildSharedCacheKey(cacheKey));
    if (shared !== null) {
      this.hospitalCache.set(cacheKey, { data: shared, timestamp: Date.now() });
      return shared;
    }

    if (this.hospitalCache.has(cacheKey)) {
      const cached = this.hospitalCache.get(cacheKey);
      if (Date.now() - cached.timestamp < ttlMs) {
        return cached.data;
      }
    }

    return null;
  }

  /**
   * 메모리 캐시와 공용 캐시에 동시에 저장합니다.
   */
  async writeHospitalCache(cacheKey, data, ttlMs = this.cacheExpiry) {
    this.hospitalCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    await cacheService.set(this.buildSharedCacheKey(cacheKey), data, Math.max(1, Math.ceil(ttlMs / 1000)));
  }

  /**
   * 병원 기본 목록 조회
   * @param {Object} params - 조회 파라미터
   * @returns {Array} 병원 목록
   */
  async getHospitalBasicList(params = {}) {
    try {
      if (!hasUsableServiceKey(this.serviceKey)) {
        console.warn('⚠️ HIRA API 키가 설정되지 않았습니다.');
        return [];
      }

      const {
        numOfRows = 100,
        pageNo = 1,
        clCd = '', // 종별코드 (31: 병원, 32: 요양병원)
        sgguCd = '', // 시군구코드
        sidoCd = '', // 시도코드
        yadmNm = '' // 요양기관명
      } = params;

      const requestParams = {
        ServiceKey: this.serviceKey,
        numOfRows,
        pageNo,
        _type: 'json'
      };

      // 선택적 파라미터 추가
      if (clCd) requestParams.clCd = clCd;
      if (sgguCd) requestParams.sgguCd = sgguCd;
      if (sidoCd) requestParams.sidoCd = sidoCd;
      if (yadmNm) requestParams.yadmNm = yadmNm;

      console.log('🔍 HIRA API 병원 목록 조회 시작:', requestParams);

      const response = await axios.get(`${this.baseURL}/getHospBasisList`, {
        params: requestParams,
        timeout: 15000
      });

      if (response.data.response?.header?.resultCode === '00') {
        const hospitals = response.data.response.body?.items?.item || [];
        const hospitalArray = Array.isArray(hospitals) ? hospitals : [hospitals];
        
        console.log(`✅ HIRA API 병원 목록 조회 완료: ${hospitalArray.length}개`);
        return hospitalArray;
      } else {
        console.error('❌ HIRA API 응답 오류:', response.data.response?.header);
        return [];
      }
    } catch (error) {
      console.error('❌ HIRA API 병원 목록 조회 실패:', error.message);
      return [];
    }
  }

  /**
   * 병원 상세 정보 조회
   * @param {string} ykiho - 암호화된 요양기호
   * @returns {Object} 병원 상세 정보
   */
  async getHospitalDetail(ykiho) {
    try {
      if (!hasUsableServiceKey(this.serviceKey)) {
        console.error('❌ HIRA API 키가 없습니다');
        return null;
      }

      if (!ykiho) {
        console.error('❌ 요양기호가 없습니다');
        return null;
      }

      // 캐시 확인
      const cacheKey = `detail_${ykiho}`;
      const cachedDetail = await this.readHospitalCache(cacheKey);
      if (cachedDetail) {
        console.log('📋 HIRA API 병원 상세정보 캐시 사용');
        return cachedDetail;
      }

      console.log('🔍 HIRA API 병원 상세정보 조회 시작:', ykiho);

      const response = await axios.get(`${this.baseURL}/getHospDtlInfo`, {
        params: {
          ServiceKey: this.serviceKey,
          ykiho: ykiho,
          _type: 'json'
        },
        timeout: 15000
      });

      if (response.data.response?.header?.resultCode === '00') {
        const detail = response.data.response.body?.items?.item;
        
        // 캐시 저장
        await this.writeHospitalCache(cacheKey, detail);
        
        console.log('✅ HIRA API 병원 상세정보 조회 완료');
        return detail;
      } else {
        console.error('❌ HIRA API 상세정보 응답 오류:', response.data.response?.header);
        return null;
      }
    } catch (error) {
      console.error('❌ HIRA API 병원 상세정보 조회 실패:', error.message);
      return null;
    }
  }

  /**
   * 서울/경기 지역 병원 목록 조회
   * @returns {Array} 서울/경기 병원 목록
   */
  async getSeoulGyeonggiHospitals() {
    try {
      console.log('🏙️ 서울/경기 지역 병원 목록 조회 시작');
      
      const hospitals = [];
      
      // 서울특별시 (11000)
      const seoulHospitals = await this.getHospitalBasicList({
        sidoCd: '11000', // 서울특별시
        clCd: '31', // 병원
        numOfRows: 500
      });
      hospitals.push(...seoulHospitals);
      
      // 경기도 주요 지역
      const gyeonggiCodes = [
        '41130', // 수원시
        '41110', // 성남시  
        '41150', // 안양시
        '41170', // 부천시
        '41190', // 안산시
        '41210', // 고양시
        '41220', // 과천시
        '41280', // 남양주시
        '41290', // 오산시
        '41310', // 시흥시
        '41360', // 용인시
        '41370', // 파주시
        '41390', // 화성시
      ];
      
      // 서울 다음에 경기 주요 시군구를 순차 조회해 너무 큰 단일 요청을 피합니다.
      for (const sgguCd of gyeonggiCodes) {
        const gyeonggiHospitals = await this.getHospitalBasicList({
          sgguCd: sgguCd,
          clCd: '31', // 병원
          numOfRows: 100
        });
        hospitals.push(...gyeonggiHospitals);
        
        // API 제한을 위한 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log(`✅ 서울/경기 병원 목록 조회 완료: 총 ${hospitals.length}개`);
      return hospitals;
    } catch (error) {
      console.error('❌ 서울/경기 병원 목록 조회 실패:', error.message);
      return [];
    }
  }

  /**
   * 병원명으로 검색
   * @param {string} hospitalName - 병원명
   * @returns {Array} 검색된 병원 목록
   */
  async searchHospitalByName(hospitalName) {
    try {
      if (!hospitalName || hospitalName.length < 2) {
        return [];
      }

      console.log(`🔍 병원명 검색: "${hospitalName}"`);

      // 캐시 확인
      const cacheKey = `search_${hospitalName}`;
      const cachedHospitals = await this.readHospitalCache(cacheKey);
      if (cachedHospitals) {
        console.log('📋 병원명 검색 캐시 사용');
        return cachedHospitals;
      }

      const hospitals = await this.getHospitalBasicList({
        yadmNm: hospitalName,
        numOfRows: 50
      });

      // 캐시 저장
      await this.writeHospitalCache(cacheKey, hospitals);

      console.log(`✅ 병원명 검색 완료: "${hospitalName}" -> ${hospitals.length}개`);
      return hospitals;
    } catch (error) {
      console.error(`❌ 병원명 검색 실패: "${hospitalName}"`, error.message);
      return [];
    }
  }

  /**
   * 주소에서 좌표 추출 (간단한 매핑)
   * @param {string} address - 주소
   * @returns {Object} 좌표 {lat, lng}
   */
  getCoordinatesFromAddress(address) {
    if (!address) return { lat: undefined, lng: undefined };

    // 서울 구별 대표 좌표
    const seoulDistrictCoords = {
      '종로구': { lat: 37.5735, lng: 126.9788 },
      '중구': { lat: 37.5641, lng: 126.9979 },
      '용산구': { lat: 37.5326, lng: 126.9906 },
      '성동구': { lat: 37.5636, lng: 127.0365 },
      '광진구': { lat: 37.5384, lng: 127.0822 },
      '동대문구': { lat: 37.5744, lng: 127.0396 },
      '중랑구': { lat: 37.6063, lng: 127.0923 },
      '성북구': { lat: 37.5894, lng: 127.0167 },
      '강북구': { lat: 37.6392, lng: 127.0157 },
      '도봉구': { lat: 37.6686, lng: 127.0473 },
      '노원구': { lat: 37.6542, lng: 127.0568 },
      '은평구': { lat: 37.6176, lng: 126.9279 },
      '서대문구': { lat: 37.5794, lng: 126.9368 },
      '마포구': { lat: 37.5663, lng: 126.9019 },
      '양천구': { lat: 37.5170, lng: 126.8664 },
      '강서구': { lat: 37.5510, lng: 126.8495 },
      '구로구': { lat: 37.4955, lng: 126.8873 },
      '금천구': { lat: 37.4596, lng: 126.9006 },
      '영등포구': { lat: 37.5264, lng: 126.8962 },
      '동작구': { lat: 37.5124, lng: 126.9393 },
      '관악구': { lat: 37.4781, lng: 126.9515 },
      '서초구': { lat: 37.4837, lng: 127.0324 },
      '강남구': { lat: 37.5172, lng: 127.0473 },
      '송파구': { lat: 37.5145, lng: 127.1059 },
      '강동구': { lat: 37.5301, lng: 127.1238 }
    };

    // 경기도 주요 지역 좌표
    const gyeonggiCoords = {
      '수원': { lat: 37.2636, lng: 127.0286 },
      '성남': { lat: 37.4201, lng: 127.1262 },
      '안양': { lat: 37.3943, lng: 126.9568 },
      '부천': { lat: 37.5058, lng: 126.7830 },
      '안산': { lat: 37.3219, lng: 126.8309 },
      '고양': { lat: 37.6584, lng: 126.8320 },
      '일산': { lat: 37.6636, lng: 126.7764 },
      '용인': { lat: 37.2380, lng: 127.1777 },
      '화성': { lat: 37.1998, lng: 126.8312 },
      '평택': { lat: 36.9921, lng: 127.1129 }, // 평택 - 매우 먼 거리
      '분당': { lat: 37.3838, lng: 127.1230 },
      '동탄': { lat: 37.2011, lng: 127.0739 }
    };

    // 정밀 지오코딩이 없으므로 관제 지도 초기 표시용 대표 좌표만 빠르게 매핑합니다.
    // 주소에서 구/시 추출해서 매칭
    for (const [district, coord] of Object.entries(seoulDistrictCoords)) {
      if (address.includes(district)) {
        return coord;
      }
    }

    for (const [city, coord] of Object.entries(gyeonggiCoords)) {
      if (address.includes(city)) {
        return coord;
      }
    }

    // 대표 좌표를 찾지 못하면 빈 좌표를 반환해 가짜 중심점이 생기지 않게 합니다.
    return { lat: undefined, lng: undefined };
  }

  /**
   * 전국 모든 병원 데이터 로딩 (시도별)
   */
  async loadAllNationalHospitals() {
    try {
      console.log('🔄 HIRA API 전국 병원 정보 로딩 시작');
      
      // 전국 시도코드 (17개 광역자치단체) - 올바른 6자리 코드
      const sidoCodes = [
        { code: '110000', name: '서울특별시' },
        { code: '260000', name: '부산광역시' },
        { code: '270000', name: '대구광역시' },
        { code: '280000', name: '인천광역시' },
        { code: '290000', name: '광주광역시' },
        { code: '300000', name: '대전광역시' },
        { code: '310000', name: '울산광역시' },
        { code: '360000', name: '세종특별자치시' },
        { code: '410000', name: '경기도' },
        { code: '420000', name: '강원특별자치도' },
        { code: '430000', name: '충청북도' },
        { code: '440000', name: '충청남도' },
        { code: '450000', name: '전북특별자치도' },
        { code: '460000', name: '전라남도' },
        { code: '470000', name: '경상북도' },
        { code: '480000', name: '경상남도' },
        { code: '500000', name: '제주특별자치도' }
      ];
      
      let totalHospitals = 0;
      let cachedCount = 0;
      
      // 전국 병원 로딩은 시도별로 나눠 실패 범위를 작게 유지하고 부분 성공을 허용합니다.
      for (const sido of sidoCodes) {
        try {
          console.log(`🔍 ${sido.name} 병원 데이터 로딩 중...`);
          
          let pageNo = 1;
          let hasMoreData = true;
          
          while (hasMoreData) {
            const hospitals = await this.getHospitalBasicList({
              sidoCd: sido.code,
              numOfRows: 100, // 한 번에 100개씩
              pageNo: pageNo
              // clCd 제거: 모든 의료기관 조회 (상급종합병원, 종합병원, 병원, 의원, 치과 등)
            });
            
            if (hospitals && hospitals.length > 0) {
              // 검색/매칭에서 즉시 꺼내 쓸 수 있도록 병원 단건 단위로 캐시에 쪼개 저장합니다.
              // 각 병원을 개별 캐시에 저장
              for (const hospital of hospitals) {
                const cacheKey = `hospital_${hospital.ykiho}`;
                await this.writeHospitalCache(cacheKey, hospital);
                cachedCount++;
              }
              
              totalHospitals += hospitals.length;
              console.log(`📍 ${sido.name} 페이지 ${pageNo}: ${hospitals.length}개 병원 로딩`);
              
              // 다음 페이지로
              pageNo++;
              
              // 100개 미만이면 마지막 페이지
              if (hospitals.length < 100) {
                hasMoreData = false;
              }
            } else {
              hasMoreData = false;
            }
            
            // API 부하 방지 (100ms 대기)
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          console.log(`✅ ${sido.name} 완료: ${pageNo - 1}페이지, 총 병원 수 확인 중...`);
          
        } catch (error) {
          console.error(`❌ ${sido.name} 로딩 실패:`, error.message);
        }
      }
      
      console.log(`🎉 HIRA API 전국 병원 로딩 완료!`);
      console.log(`📊 총 병원 수: ${totalHospitals}개`);
      console.log(`📋 캐시 저장: ${cachedCount}개`);
      console.log(`💾 전체 캐시 항목: ${this.hospitalCache.size}개`);
      
    } catch (error) {
      console.error('❌ HIRA API 전국 병원 로딩 실패:', error.message);
    }
  }

  /**
   * HIRA API 자동 갱신 스케줄러 시작
   */
  startAutoRefreshScheduler() {
    if (!hasUsableServiceKey(this.serviceKey)) {
      console.warn('⚠️ HIRA API 키가 없어 자동 갱신 스케줄러를 시작하지 않습니다');
      return;
    }

    if (this.isSchedulerRunning) {
      console.log('⚠️ HIRA API 스케줄러가 이미 실행 중입니다');
      return;
    }

    // 30분마다 실행 (0분, 30분)
    cron.schedule('0,30 * * * *', async () => {
      console.log('🔄 [HIRA API 스케줄러] 30분 주기 전국 병원 정보 갱신 시작');
      await this.loadAllNationalHospitals();
    });

    // 서버 시작시 즉시 1회 실행
    setTimeout(async () => {
      console.log('🚀 [HIRA API 스케줄러] 초기 전국 병원 정보 로딩 시작');
      await this.loadAllNationalHospitals();
    }, 5000); // 서버 완전 시작 후 5초 대기

    this.isSchedulerRunning = true;
    console.log('✅ HIRA API 자동 갱신 스케줄러 시작 (30분 주기)');
  }

  /**
   * 스케줄러 중지
   */
  stopAutoRefreshScheduler() {
    // node-cron은 개별 태스크 중지가 복잡하므로 플래그만 변경
    this.isSchedulerRunning = false;
    console.log('⏸️ HIRA API 자동 갱신 스케줄러 중지');
  }

  /**
   * 캐시 정리
   */
  clearCache() {
    this.hospitalCache.clear();
    console.log('🧹 HIRA API 캐시 정리 완료');
  }

  /**
   * 캐시에서 전국 병원 리스트 조회
   */
  getAllCachedHospitals() {
    const hospitals = [];
    const now = Date.now();
    
    for (const [key, cached] of this.hospitalCache.entries()) {
      // hospital_ 키로 시작하는 것만 (개별 병원 데이터)
      if (key.startsWith('hospital_') && cached.data) {
        // 캐시가 유효한지 확인
        if (now - cached.timestamp <= this.cacheExpiry) {
          hospitals.push(cached.data);
        }
      }
    }
    
    console.log(`📋 HIRA 캐시에서 ${hospitals.length}개 병원 데이터 조회`);
    return hospitals;
  }

  /**
   * 캐시 상태 조회
   */
  getCacheStatus() {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;
    
    for (const [key, cached] of this.hospitalCache.entries()) {
      if (now - cached.timestamp <= this.cacheExpiry) {
        validCount++;
      } else {
        expiredCount++;
      }
    }
    
    return {
      total: this.hospitalCache.size,
      valid: validCount,
      expired: expiredCount,
      cacheExpiry: this.cacheExpiry,
      schedulerRunning: this.isSchedulerRunning
    };
  }
}

/**
 * 서버 전역에서 재사용하는 HIRA API 싱글톤 인스턴스입니다.
 */
module.exports = new HiraApiService();
