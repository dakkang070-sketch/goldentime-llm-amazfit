/**
 * 국립중앙의료원(NEDC) API 연동 서비스
 * 실시간 응급실 가용병상, 병원 정보, 수용 확약 시스템
 */

const axios = require('axios');
const cron = require('node-cron');
const logger = require('../utils/logger');

class NEDCApiService {
  
  constructor() {
    this.baseUrl = process.env.NEDC_API_BASE_URL || 'https://apis.data.go.kr/B552657';
    this.serviceKey = process.env.NEDC_API_SERVICE_KEY;
    
    // 실제 국립중앙의료원 API 엔드포인트 (이미지 기준)
    this.endpoints = {
      // 응급실 실시간 가용병상정보 조회 (핵심)
      emergencyBeds: '/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire',
      
      // 중증질환자 수용가능병원 조회  
      severeCareHospitals: '/ErmctInfoInqireService/getSrsillDisAccptncrRspblInfoInqire',
      
      // 응급의료기관 목록정보 조회
      hospitalList: '/ErmctInfoInqireService/getEgytListInfoInqire',
      
      // 응급의료기관 위치정보 조회
      hospitalLocation: '/ErmctInfoInqireService/getEgytLcinfoInqire',
      
      // 응급의료기관 기본정보 조회
      hospitalBasicInfo: '/ErmctInfoInqireService/getEgytBassinfoInqire',
      
      // 외상센터 목록정보 조회
      traumaCenterList: '/ErmctInfoInqireService/getStrmListInfoInqire',
      
      // 외상센터 위치정보 조회
      traumaCenterLocation: '/ErmctInfoInqireService/getStrmLcinfoInqire',
      
      // 외상센터 기본정보 조회
      traumaCenterBasic: '/ErmctInfoInqireService/getStrmBassinfoInqire',
      
      // 응급실 및 중증질환 메시지 조회
      emergencyMessages: '/ErmctInfoInqireService/getEmrrmSrsillDissMsgInqire'
    };
    
    // 캐시 설정 (API 호출 최적화)
    this.cache = {
      hospitals: new Map(),
      beds: new Map(),
      lastUpdate: new Map()
    };
    
    this.cacheTimeout = 2 * 60 * 1000; // 2분 캐시 (단축)
    this.schedulerActive = false;
  }

  /**
   * 자동 데이터 갱신 스케줄러 시작
   */
  startAutoRefreshScheduler() {
    if (this.schedulerActive) return;
    
    logger.info('🔄 국립중앙의료원 API 자동 갱신 스케줄러 시작');
    
    // 1. 통합 병상 현황 자동 갱신 (2분마다 - 응급상황 체크 포함)
    cron.schedule('*/2 * * * *', async () => {
      try {
        // 응급상황 체크
        const EmergencyCase = require('../models/EmergencyCase');
        const activeCases = await EmergencyCase.find({ 
          status: { $in: ['pending', 'paramedic_dispatched', 'paramedic_arrived', 'transport_started'] },
          emergencyLevel: { $gte: 4 }
        });
        
        if (activeCases.length > 0) {
          logger.info(`🔄 정기 병상 현황 갱신 시작 (🚨 극응급 ${activeCases.length}건 포함)`);
        } else {
          logger.info('🔄 정기 병상 현황 갱신 시작');
        }
        
        await this.getRealTimeEmergencyBeds([], true);
        logger.info('✅ 정기 병상 현황 갱신 완료');
      } catch (error) {
        logger.error('❌ 정기 병상 현황 갱신 실패', { error: error.message });
      }
    });

    // 2. 병원 기본정보 일일 동기화 (매일 오전 1시)
    cron.schedule('0 1 * * *', async () => {
      try {
        logger.info('🔄 일일 병원 데이터 동기화 시작');
        await this.syncHospitalData(1, 500); // 한 번에 500개씩
        logger.info('✅ 일일 병원 데이터 동기화 완료');
      } catch (error) {
        logger.error('❌ 일일 병원 데이터 동기화 실패', { error: error.message });
      }
    });

    this.schedulerActive = true;
    logger.info('✅ 국립중앙의료원 API 자동 갱신 스케줄러 활성화 완료');
  }

  /**
   * 자동 갱신 스케줄러 중지
   */
  stopAutoRefreshScheduler() {
    this.schedulerActive = false;
    logger.info('🛑 국립중앙의료원 API 자동 갱신 스케줄러 중지');
  }

  /**
   * 전국 응급의료기관 목록 조회 및 동기화
   */
  async syncHospitalData(page = 1, numOfRows = 100) {
    try {
      logger.info(`국립중앙의료원 API: 병원 데이터 동기화 시작 (page: ${page})`);

      const params = {
        serviceKey: this.serviceKey,
        pageNo: page,
        numOfRows,
        _type: 'json'
      };

      const response = await axios.get(`${this.baseUrl}${this.endpoints.hospitalList}`, {
        params,
        timeout: 10000
      });

      const data = response.data;
      
      if (data.response?.header?.resultCode !== '00') {
        throw new Error(`API 오류: ${data.response?.header?.resultMsg || '알 수 없는 오류'}`);
      }

      const hospitals = data.response.body?.items?.item || [];
      const syncedCount = await this.updateHospitalDatabase(hospitals);

      logger.info(`병원 데이터 동기화 완료: ${syncedCount}개 병원`);

      return {
        success: true,
        syncedCount,
        totalCount: data.response.body?.totalCount || 0,
        hasMore: (page * numOfRows) < (data.response.body?.totalCount || 0)
      };

    } catch (error) {
      logger.error('병원 데이터 동기화 실패', error);
      throw error;
    }
  }

  /**
   * 실시간 응급실 가용병상 정보 조회
   */
  async getRealTimeEmergencyBeds(hospitalIds = [], forceRefresh = false) {
    try {
      const cacheKey = hospitalIds.join(',') || 'all';
      const cachedData = this.cache.beds.get(cacheKey);
      const lastUpdate = this.cache.lastUpdate.get(cacheKey);

      // 캐시 확인 (5분 이내면 캐시 사용)
      if (!forceRefresh && cachedData && lastUpdate && (Date.now() - lastUpdate) < this.cacheTimeout) {
        return cachedData;
      }

      logger.info('실시간 응급실 병상 정보 조회 시작');

      const params = {
        serviceKey: this.serviceKey,
        pageNo: 1,
        numOfRows: 100,
        _type: 'json'
      };

      // 특정 병원 ID 필터링 (API에서 지원하는 경우)
      if (hospitalIds.length > 0) {
        params.HPID = hospitalIds.join(',');
      }

      const response = await axios.get(`${this.baseUrl}${this.endpoints.emergencyBeds}`, {
        params,
        timeout: 15000
      });

      const data = response.data;
      
      if (data.response?.header?.resultCode !== '00') {
        throw new Error(`병상 조회 API 오류: ${data.response?.header?.resultMsg}`);
      }

      const bedInfo = data.response.body?.items?.item || [];
      
      // 데이터 표준화 및 분석
      const processedBedInfo = this.processBedInformation(bedInfo);

      // 캐시 저장
      this.cache.beds.set(cacheKey, processedBedInfo);
      this.cache.lastUpdate.set(cacheKey, Date.now());

      logger.info(`응급실 병상 정보 조회 완료: ${processedBedInfo.length}개 병원`);

      return processedBedInfo;

    } catch (error) {
      logger.error('응급실 병상 정보 조회 실패', error);
      throw error;
    }
  }

  /**
   * 병원별 상세 진료 가능 여부 확인
   */
  async getHospitalAvailability(hospitalId, patientInfo = {}) {
    try {
      logger.info(`병원 수용 가능성 확인: ${hospitalId}`);

      const params = {
        serviceKey: this.serviceKey,
        HPID: hospitalId,
        _type: 'json'
      };

      const [bedInfo, hospitalDetail, departments] = await Promise.all([
        this.getRealTimeEmergencyBeds([hospitalId]),
        this.getHospitalBasicInfo(hospitalId),
        this.getHospitalDepartments(hospitalId)
      ]);

      const hospital = bedInfo[0];
      if (!hospital) {
        return { available: false, reason: 'hospital_not_found' };
      }

      // 종합적인 수용 가능성 분석
      const availability = this.analyzeHospitalAvailability(hospital, hospitalDetail, departments, patientInfo);

      return availability;

    } catch (error) {
      logger.error(`병원 수용 가능성 확인 실패 [${hospitalId}]:`, error);
      return { available: false, reason: 'api_error', error: error.message };
    }
  }

  /**
   * 지능형 병원 매칭 (국립중앙의료원 데이터 기반)
   */
  async findOptimalHospitals(emergencyCase, patientInfo, options = {}) {
    try {
      const { lat, lng } = emergencyCase.locations.current;
      const emergencyLevel = emergencyCase.emergencyLevel;
      const requiredSpecialties = options.requiredSpecialties || [];

      logger.info('지능형 병원 매칭 시작', {
        location: { lat, lng },
        emergencyLevel,
        requiredSpecialties
      });

      // 1. 근처 응급의료기관 조회 (반경 50km)
      const nearbyHospitals = await this.findNearbyHospitals(lat, lng, 50000);

      // 2. 실시간 병상 정보 조회
      const hospitalIds = nearbyHospitals.map(h => h.hospitalId);
      const bedInfo = await this.getRealTimeEmergencyBeds(hospitalIds, true);

      // 3. 각 병원의 수용 가능성 분석
      const candidateAnalyses = await Promise.all(
        bedInfo.map(async (hospital) => {
          const availability = await this.analyzeHospitalAvailability(
            hospital, 
            nearbyHospitals.find(h => h.hospitalId === hospital.hospitalId),
            null,
            { ...patientInfo, emergencyLevel }
          );

          return {
            ...hospital,
            ...availability,
            distance: this.calculateDistance(lat, lng, hospital.latitude, hospital.longitude),
            suitabilityScore: this.calculateHospitalSuitabilityScore(hospital, availability, emergencyLevel)
          };
        })
      );

      // 4. 수용 가능한 병원만 필터링
      const availableHospitals = candidateAnalyses
        .filter(h => h.available)
        .sort((a, b) => b.suitabilityScore - a.suitabilityScore);

      logger.info(`매칭 결과: 총 ${nearbyHospitals.length}개 중 ${availableHospitals.length}개 병원 수용 가능`);

      return availableHospitals;

    } catch (error) {
      logger.error('지능형 병원 매칭 실패', error);
      throw error;
    }
  }

  /**
   * 병원 수용 확약 요청
   */
  async requestAdmissionConfirmation(hospitalId, emergencyCase, estimatedArrival) {
    try {
      logger.info(`병원 수용 확약 요청: ${hospitalId}`);

      // 실제 구현에서는 병원 시스템과의 연동 API 필요
      // 여기서는 내부 로직으로 확약 시스템 구현

      const hospital = await this.getHospitalBasicInfo(hospitalId);
      const bedInfo = await this.getRealTimeEmergencyBeds([hospitalId], true);
      const patientInfo = {
        emergencyLevel: emergencyCase.emergencyLevel,
        age: emergencyCase.userId?.age,
        gender: emergencyCase.userId?.gender,
        symptoms: emergencyCase.detectedAnomalies?.map(a => a.type) || []
      };

      // 상세 수용 가능성 재확인
      const availability = await this.analyzeHospitalAvailability(
        bedInfo[0], 
        hospital, 
        null, 
        patientInfo
      );

      if (!availability.available) {
        return {
          confirmed: false,
          reason: availability.reason,
          message: '현재 수용이 어렵습니다.',
          alternativeRecommended: true
        };
      }

      // 수용 확약 처리
      const confirmation = {
        confirmed: true,
        hospitalId,
        hospitalName: hospital.hospitalName,
        confirmationId: `CONF_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        confirmedAt: new Date(),
        estimatedArrival,
        assignedBed: availability.assignedBed,
        assignedDepartment: availability.assignedDepartment,
        contactPerson: availability.contactPerson,
        specialInstructions: availability.specialInstructions,
        validUntil: new Date(Date.now() + 60 * 60 * 1000) // 1시간 유효
      };

      // 병원에 확약 정보 전송 (실제로는 병원 시스템 API 호출)
      await this.notifyHospitalOfConfirmation(confirmation, emergencyCase);

      logger.info(`병원 수용 확약 완료: ${confirmation.confirmationId}`);

      return confirmation;

    } catch (error) {
      logger.error(`병원 수용 확약 실패 [${hospitalId}]:`, error);
      return {
        confirmed: false,
        reason: 'system_error',
        message: '확약 처리 중 오류가 발생했습니다.',
        error: error.message
      };
    }
  }

  /**
   * 병상 정보 처리 및 표준화
   */
  processBedInformation(bedData) {
    return bedData.map(hospital => {
      return {
        hospitalId: hospital.hpid,
        hospitalName: hospital.dutyName,
        latitude: null, // 응급실 병상 API에는 위치 정보 없음
        longitude: null,
        phoneNumber: hospital.dutyTel1 || hospital.dutyTel3,
        emergencyPhone: hospital.dutyTel3, // 응급실 직통번호
        
        // 응급실 병상 정보 (실제 API 응답 기준)
        emergencyBeds: {
          total: parseInt(hospital.hvec) || 0,           // 응급실 병상 수
          available: parseInt(hospital.hvoc) || 0,       // 가용 병상 수
          occupied: Math.max(0, (parseInt(hospital.hvec) || 0) - (parseInt(hospital.hvoc) || 0)),
          occupancyRate: hospital.hvec > 0 ? 
            Math.round(((parseInt(hospital.hvec) - parseInt(hospital.hvoc)) / parseInt(hospital.hvec)) * 100) : 0
        },
        
        // 전문병상 정보 (실제 API 응답 기준)
        specializedBeds: {
          general: parseInt(hospital.hvgc) || 0,        // 일반병상
          neuro: parseInt(hospital.hvncc) || 0,         // 신경중환자실
          trauma: parseInt(hospital.hvs01) || 0,        // 외상소생실
          cardiac: parseInt(hospital.hvs02) || 0,       // 심장소생실
          stroke: parseInt(hospital.hvs03) || 0,        // 뇌졸중소생실
          burn: parseInt(hospital.hvs04) || 0,          // 화상소생실
          pediatric: parseInt(hospital.hvs05) || 0,     // 소아소생실
          isolation: parseInt(hospital.hvs06) || 0,     // 음압격리실
          psychiatry: parseInt(hospital.hvs07) || 0,    // 정신과적 응급
          neurosurgery: parseInt(hospital.hvs08) || 0   // 신경외과적 응급
        },
        
        // 의료장비 가용성
        equipment: {
          ct: hospital.hvctayn === 'Y',                 // CT 가능
          mri: hospital.hvmriayn === 'Y',               // MRI 가능
          angiography: hospital.hvangioayn === 'Y',     // 혈관조영술 가능
          ventilator: hospital.hvventiayn === 'Y',      // 인공호흡기 가능
          ecmo: hospital.hvecmoayn === 'Y',             // ECMO 가능
          crrt: hospital.hvcrrtayn === 'Y',             // 지속적신대체요법 가능
          incubator: hospital.hvincuayn === 'Y',        // 인큐베이터 가능
          hypothermia: hospital.hvhypoayn === 'Y'       // 저체온치료 가능
        },
        
        // 전문 진료 가능 여부
        specialties: {
          neurosurgery: hospital.hvctayn === 'Y',       // 뇌수술
          cardiothoracic: hospital.hvctsyn === 'Y',     // 흉부외과
          burn: hospital.hvmriayn === 'Y',              // 화상
          newborn: hospital.hvangioayn === 'Y',         // 신생아
          trauma: hospital.hvicc === 'Y'                // 외상
        },
        
        // 진료 상태
        status: {
          emergency: hospital.MKioskTy1 || '정상',      // 응급실 상태
          lastUpdated: hospital.hvidate,                // 최종 업데이트 시간
          isAvailable: hospital.hvoc > 0                // 수용 가능 여부
        },
        
        // 교통 정보
        distance: null, // 계산 필요
        estimatedTravelTime: null // 계산 필요
      };
    });
  }

  /**
   * 병원 수용 가능성 종합 분석
   */
  analyzeHospitalAvailability(bedInfo, hospitalDetail, departments, patientInfo) {
    const analysis = {
      available: false,
      confidence: 0,
      reasons: [],
      recommendations: []
    };

    try {
      const emergencyLevel = patientInfo.emergencyLevel || 3;
      const patientAge = patientInfo.age;

      // 1. 기본 병상 가용성 확인
      if (bedInfo.emergencyBeds.available <= 0) {
        analysis.reasons.push('응급실 병상 부족');
        return analysis;
      }

      // 2. 중증도별 시설 요구사항 확인
      if (emergencyLevel >= 4) {
        // 고위험 환자 - ICU 필요
        if (bedInfo.icu.general.available <= 0) {
          analysis.reasons.push('중환자실 병상 부족');
          analysis.recommendations.push('ICU 가용한 다른 병원 검토');
          return analysis;
        }
      }

      if (emergencyLevel === 5) {
        // 최고 위험 - 수술실도 필요
        if (bedInfo.operatingRooms.available <= 0) {
          analysis.reasons.push('수술실 부족');
          analysis.recommendations.push('수술 가능한 대형병원으로 이송');
          return analysis;
        }
      }

      // 3. 환자 특성별 전문성 확인
      const requiredSpecialties = this.determineRequiredSpecialtiesByPatient(patientInfo);
      const missingSpecialties = requiredSpecialties.filter(spec => 
        !bedInfo.specialties[spec]
      );

      if (missingSpecialties.length > 0) {
        analysis.reasons.push(`전문 진료과 부족: ${missingSpecialties.join(', ')}`);
        analysis.recommendations.push('전문 진료 가능한 병원으로 이송 고려');
        // 전문성이 부족해도 응급상황이면 일단 수용
        if (emergencyLevel < 4) {
          return analysis;
        }
      }

      // 4. 소아/노인 특별 고려사항
      if (patientAge < 18 && !bedInfo.specialties.pediatric) {
        analysis.recommendations.push('소아 전문 병원 이송 고려');
      }

      if (patientAge > 65 && bedInfo.emergencyBeds.occupancyRate > 80) {
        analysis.recommendations.push('노인 환자 집중 관리 필요');
      }

      // 5. 최종 수용 가능 판정
      analysis.available = true;
      analysis.confidence = this.calculateAvailabilityConfidence(bedInfo, patientInfo);
      
      // 배정 정보
      analysis.assignedBed = `ER-${String(bedInfo.emergencyBeds.occupied + 1).padStart(2, '0')}`;
      analysis.assignedDepartment = emergencyLevel >= 4 ? '중환자실 직통' : '응급의학과';
      analysis.contactPerson = '응급실 간호사';
      analysis.specialInstructions = this.generateSpecialInstructions(patientInfo, bedInfo);

      return analysis;

    } catch (error) {
      logger.error('병원 수용 가능성 분석 실패', error);
      analysis.reasons.push('시스템 오류로 분석 불가');
      return analysis;
    }
  }

  /**
   * 병원 적합성 점수 계산
   */
  calculateHospitalSuitabilityScore(hospital, availability, emergencyLevel) {
    let score = 50; // 기본 점수

    // 가용성 점수 (최대 30점)
    if (availability.available) {
      score += 20;
      score += availability.confidence / 100 * 10;
    }

    // 거리 점수 (최대 20점)
    if (hospital.distance) {
      const distanceKm = hospital.distance / 1000;
      score += Math.max(0, 20 - distanceKm); // 20km에서 0점
    }

    // 시설 점수 (최대 25점)
    const bedAvailabilityRatio = hospital.emergencyBeds.available / hospital.emergencyBeds.total;
    score += bedAvailabilityRatio * 15;

    if (hospital.icu.general.available > 0) score += 5;
    if (hospital.operatingRooms.available > 0) score += 5;

    // 전문성 점수 (최대 15점)
    const specialtyCount = Object.values(hospital.specialties).filter(Boolean).length;
    score += Math.min(15, specialtyCount * 3);

    // 응급도별 가중치
    if (emergencyLevel >= 4) {
      // 고위험: 시설과 전문성 중시
      if (hospital.icu.general.available > 0) score += 5;
      if (hospital.operatingRooms.available > 0) score += 5;
    } else {
      // 일반: 거리와 대기시간 중시
      if (hospital.emergencyBeds.occupancyRate < 70) score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 수용 가능성 신뢰도 계산
   */
  calculateAvailabilityConfidence(bedInfo, patientInfo) {
    let confidence = 70; // 기본 신뢰도

    // 병상 여유도
    const bedRatio = bedInfo.emergencyBeds.available / bedInfo.emergencyBeds.total;
    confidence += bedRatio * 20;

    // 중환자실 여유도 (고위험 환자의 경우)
    if (patientInfo.emergencyLevel >= 4) {
      const icuRatio = bedInfo.icu.general.available / (bedInfo.icu.general.total || 1);
      confidence += icuRatio * 10;
    }

    // 전문성 매칭도
    const requiredSpecialties = this.determineRequiredSpecialtiesByPatient(patientInfo);
    const matchedSpecialties = requiredSpecialties.filter(spec => 
      bedInfo.specialties[spec]
    );
    
    if (requiredSpecialties.length > 0) {
      confidence += (matchedSpecialties.length / requiredSpecialties.length) * 10;
    }

    return Math.min(95, Math.max(30, Math.round(confidence)));
  }

  /**
   * 헬퍼 메서드들
   */
  async updateHospitalDatabase(hospitals) {
    // 실제 구현에서는 Hospital 모델에 데이터 저장
    const Hospital = require('../models/Hospital');
    let syncedCount = 0;
    
    for (const hospitalData of hospitals) {
      try {
        await Hospital.findOneAndUpdate(
          { nedcId: hospitalData.hpid },
          {
            nedcId: hospitalData.hpid,
            name: hospitalData.dutyName,
            location: {
              lat: parseFloat(hospitalData.wgs84Lat),
              lng: parseFloat(hospitalData.wgs84Lon)
            },
            phone: hospitalData.dutyTel1,
            address: hospitalData.dutyAddr,
            lastSyncedAt: new Date()
          },
          { upsert: true }
        );
        syncedCount++;
      } catch (error) {
        logger.warn(`병원 데이터 저장 실패 [${hospitalData.hpid}]:`, error);
      }
    }
    
    return syncedCount;
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  determineRequiredSpecialtiesByPatient(patientInfo) {
    const specialties = [];
    
    if (patientInfo.emergencyLevel >= 4) {
      specialties.push('trauma');
    }
    
    if (patientInfo.age < 18) {
      specialties.push('pediatric');
    }
    
    if (patientInfo.symptoms?.includes('heart_rate')) {
      specialties.push('cardiothoracic');
    }
    
    if (patientInfo.symptoms?.includes('fall')) {
      specialties.push('neurosurgery', 'trauma');
    }
    
    return [...new Set(specialties)];
  }

  generateSpecialInstructions(patientInfo, bedInfo) {
    const instructions = [];
    
    if (patientInfo.emergencyLevel >= 4) {
      instructions.push('중환자실 준비 필요');
    }
    
    if (patientInfo.age > 65) {
      instructions.push('노인 환자 특별 주의');
    }
    
    if (bedInfo.emergencyBeds.occupancyRate > 80) {
      instructions.push('응급실 혼잡 - 신속 처리 필요');
    }
    
    return instructions.join('; ');
  }

  async notifyHospitalOfConfirmation(confirmation, emergencyCase) {
    // 실제 구현에서는 병원 시스템으로 확약 정보 전송
    logger.info('병원 확약 정보 전송', {
      hospitalId: confirmation.hospitalId,
      confirmationId: confirmation.confirmationId,
      patientInfo: {
        emergencyLevel: emergencyCase.emergencyLevel,
        estimatedArrival: confirmation.estimatedArrival
      }
    });
  }
}

// 싱글톤 인스턴스
const nedcApiService = new NEDCApiService();

module.exports = nedcApiService;