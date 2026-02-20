const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../utils/logger');

/**
 * 국립중앙의료원 전국 응급의료기관 정보 조회 서비스
 * 공공데이터포털 API 연동
 */
class EmergencyHospitalService {
  constructor() {
    // API 기본 URL (공공데이터포털)
    this.baseUrl = process.env.EMERGENCY_HOSPITAL_API_URL || 'https://apis.data.go.kr/B552657/ErmctInfoInqireService';
    this.serviceKey = process.env.EMERGENCY_HOSPITAL_API_KEY || 'f77c4cc08ca51e363f167702969f0f94f2b8c27cfe9eeeea365caea7dfd37670';
    
    // XML 파서 설정
    this.xmlParser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
      trim: true
    });
  }

  /**
   * 응급의료기관 목록 조회
   * @param {Object} params - 조회 파라미터
   * @param {string} params.sido - 시도명 (예: 서울특별시)
   * @param {string} params.sigungu - 시군구명 (예: 강남구)
   * @param {string} params.hname - 기관명
   * @param {number} params.pageNo - 페이지 번호 (기본값: 1)
   * @param {number} params.numOfRows - 한 페이지 결과 수 (기본값: 10)
   * @returns {Promise<Object>} 응급의료기관 목록
   */
  async getEmergencyHospitals(params = {}) {
    try {
      const {
        sido = '',
        sigungu = '',
        hname = '',
        pageNo = 1,
        numOfRows = 100
      } = params;

      if (!this.serviceKey) {
        logger.warn('응급의료기관 API 키가 설정되지 않았습니다.');
        return {
          success: false,
          message: 'API 키가 설정되지 않았습니다.',
          data: []
        };
      }

      // API 엔드포인트: getEgytListInfoInqire (응급의료기관 목록 조회)
      const url = `${this.baseUrl}/getEgytListInfoInqire`;
      
      // 공공데이터포털 API는 serviceKey를 URL 인코딩해야 함
      const encodedServiceKey = encodeURIComponent(this.serviceKey);
      
      const queryParams = new URLSearchParams({
        serviceKey: encodedServiceKey,
        pageNo: pageNo.toString(),
        numOfRows: numOfRows.toString(),
        ...(sido && { sido }),
        ...(sigungu && { sigungu }),
        ...(hname && { hname })
      });

      const fullUrl = `${url}?${queryParams.toString()}`;
      logger.info(`응급의료기관 API 호출: ${url} (파라미터: sido=${sido}, sigungu=${sigungu})`);

      const response = await axios.get(fullUrl, {
        timeout: 15000,
        headers: {
          'Accept': 'application/xml, text/xml'
        }
      });

      // XML 응답 파싱
      const result = await this.xmlParser.parseStringPromise(response.data);
      
      // 응답 구조 확인 및 데이터 추출
      const responseData = result?.response;
      
      if (!responseData) {
        logger.error('응급의료기관 API 응답 파싱 실패:', result);
        return {
          success: false,
          message: 'API 응답 파싱 실패',
          data: []
        };
      }

      // 에러 체크
      if (responseData.header?.resultCode !== '00') {
        const errorMsg = responseData.header?.resultMsg || '알 수 없는 오류';
        logger.error('응급의료기관 API 오류:', errorMsg);
        return {
          success: false,
          message: errorMsg,
          data: []
        };
      }

      // 데이터 추출
      const items = responseData.body?.items;
      let hospitals = [];
      
      if (items) {
        // items가 배열인지 객체인지 확인
        if (Array.isArray(items.item)) {
          hospitals = items.item;
        } else if (items.item) {
          hospitals = [items.item];
        }
      }

      return {
        success: true,
        message: '조회 성공',
        data: hospitals,
        totalCount: parseInt(responseData.body?.totalCount || 0),
        pageNo: parseInt(responseData.body?.pageNo || 1),
        numOfRows: parseInt(responseData.body?.numOfRows || 0)
      };

    } catch (error) {
      logger.error('응급의료기관 조회 오류:', error);
      return {
        success: false,
        message: error.message || '응급의료기관 조회 중 오류가 발생했습니다.',
        data: []
      };
    }
  }

  /**
   * 응급의료기관 기본 정보 조회
   * @param {string} hpid - 기관ID
   * @returns {Promise<Object>} 응급의료기관 기본 정보
   */
  async getEmergencyHospitalInfo(hpid) {
    try {
      if (!this.serviceKey) {
        return {
          success: false,
          message: 'API 키가 설정되지 않았습니다.',
          data: null
        };
      }

      if (!hpid) {
        return {
          success: false,
          message: '기관ID가 필요합니다.',
          data: null
        };
      }

      // API 엔드포인트: getEgytBassInfoInqire (응급의료기관 기본 정보 조회)
      const url = `${this.baseUrl}/getEgytBassInfoInqire`;
      
      const encodedServiceKey = encodeURIComponent(this.serviceKey);
      const queryParams = new URLSearchParams({
        serviceKey: encodedServiceKey,
        hpid: hpid
      });

      const response = await axios.get(`${url}?${queryParams.toString()}`, {
        timeout: 15000,
        headers: {
          'Accept': 'application/xml, text/xml'
        }
      });

      // XML 응답 파싱
      const result = await this.xmlParser.parseStringPromise(response.data);
      const responseData = result?.response;

      if (!responseData || responseData.header?.resultCode !== '00') {
        const errorMsg = responseData?.header?.resultMsg || 'API 응답 파싱 실패';
        return {
          success: false,
          message: errorMsg,
          data: null
        };
      }

      const hospital = responseData.body?.item;

      return {
        success: true,
        message: '조회 성공',
        data: hospital || null
      };

    } catch (error) {
      logger.error('응급의료기관 정보 조회 오류:', error);
      return {
        success: false,
        message: error.message || '응급의료기관 정보 조회 중 오류가 발생했습니다.',
        data: null
      };
    }
  }

  /**
   * 응급실 실시간 가용 병상 정보 조회
   * @param {string} hpid - 기관ID
   * @returns {Promise<Object>} 실시간 가용 병상 정보
   */
  async getEmergencyRoomStatus(hpid) {
    try {
      if (!this.serviceKey) {
        return {
          success: false,
          message: 'API 키가 설정되지 않았습니다.',
          data: null
        };
      }

      if (!hpid) {
        return {
          success: false,
          message: '기관ID가 필요합니다.',
          data: null
        };
      }

      // API 엔드포인트: getStrmListInfoInqire (응급실 실시간 가용 병상 정보 조회)
      const url = `${this.baseUrl}/getStrmListInfoInqire`;
      
      const encodedServiceKey = encodeURIComponent(this.serviceKey);
      const queryParams = new URLSearchParams({
        serviceKey: encodedServiceKey,
        hpid: hpid
      });

      const response = await axios.get(`${url}?${queryParams.toString()}`, {
        timeout: 15000,
        headers: {
          'Accept': 'application/xml, text/xml'
        }
      });

      // XML 응답 파싱
      const result = await this.xmlParser.parseStringPromise(response.data);
      const responseData = result?.response;

      if (!responseData || responseData.header?.resultCode !== '00') {
        const errorMsg = responseData?.header?.resultMsg || 'API 응답 파싱 실패';
        return {
          success: false,
          message: errorMsg,
          data: null
        };
      }

      const items = responseData.body?.items;
      let statusList = [];
      
      if (items) {
        if (Array.isArray(items.item)) {
          statusList = items.item;
        } else if (items.item) {
          statusList = [items.item];
        }
      }

      return {
        success: true,
        message: '조회 성공',
        data: statusList
      };

    } catch (error) {
      logger.error('응급실 실시간 가용 병상 정보 조회 오류:', error);
      return {
        success: false,
        message: error.message || '응급실 실시간 가용 병상 정보 조회 중 오류가 발생했습니다.',
        data: null
      };
    }
  }

  /**
   * 중증질환 수용 가능 정보 조회
   * @param {string} hpid - 기관ID
   * @returns {Promise<Object>} 중증질환 수용 가능 정보
   */
  async getSevereDiseaseAvailability(hpid) {
    try {
      if (!this.serviceKey) {
        return {
          success: false,
          message: 'API 키가 설정되지 않았습니다.',
          data: null
        };
      }

      if (!hpid) {
        return {
          success: false,
          message: '기관ID가 필요합니다.',
          data: null
        };
      }

      // API 엔드포인트: getSrsillDissAceptncPosblInfoInqire (중증질환 수용 가능 정보 조회)
      const url = `${this.baseUrl}/getSrsillDissAceptncPosblInfoInqire`;
      
      const encodedServiceKey = encodeURIComponent(this.serviceKey);
      const queryParams = new URLSearchParams({
        serviceKey: encodedServiceKey,
        hpid: hpid
      });

      const response = await axios.get(`${url}?${queryParams.toString()}`, {
        timeout: 15000,
        headers: {
          'Accept': 'application/xml, text/xml'
        }
      });

      // XML 응답 파싱
      const result = await this.xmlParser.parseStringPromise(response.data);
      const responseData = result?.response;

      if (!responseData || responseData.header?.resultCode !== '00') {
        const errorMsg = responseData?.header?.resultMsg || 'API 응답 파싱 실패';
        return {
          success: false,
          message: errorMsg,
          data: null
        };
      }

      const items = responseData.body?.items;
      let diseaseList = [];
      
      if (items) {
        if (Array.isArray(items.item)) {
          diseaseList = items.item;
        } else if (items.item) {
          diseaseList = [items.item];
        }
      }

      return {
        success: true,
        message: '조회 성공',
        data: diseaseList
      };

    } catch (error) {
      logger.error('중증질환 수용 가능 정보 조회 오류:', error);
      return {
        success: false,
        message: error.message || '중증질환 수용 가능 정보 조회 중 오류가 발생했습니다.',
        data: null
      };
    }
  }
}

module.exports = new EmergencyHospitalService();
