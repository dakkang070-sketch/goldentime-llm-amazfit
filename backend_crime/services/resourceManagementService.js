/**
 * 자동 백업 매칭 및 리소스 관리 시스템
 * 1차 실패 시 자동 대체 매칭, 리소스 최적화
 */

const Paramedic = require('../models/Paramedic');
const Hospital = require('../models/Hospital');
const EmergencyCase = require('../models/EmergencyCase');
const { calculateDistance, haversineMeters } = require('./geoService');
const { emitResourceUpdate, emitEscalation } = require('./socketService');
const logger = require('../utils/logger');

class ResourceManagementService {
  
  constructor() {
    this.resourcePool = {
      paramedics: new Map(),    // 응급구조사 실시간 상태
      hospitals: new Map(),     // 병원 실시간 상태  
      ambulances: new Map(),    // 구급차 실시간 상태
      airUnits: new Map()       // 헬기 응급실 상태
    };

    this.backupQueue = [];      // 백업 대기열
    this.priorityQueue = [];    // 우선순위 대기열
  }

  /**
   * 시스템 시작 시 전체 리소스 상태 동기화
   */
  async initializeResourcePool() {
    logger.info('리소스 풀 초기화 시작');

    try {
      // 응급구조사 상태 동기화
      const paramedics = await Paramedic.find({ status: { $in: ['available', 'dispatched', 'busy'] } })
        .select('_id status currentLocation specialties capabilities lastLocationUpdate')
        .lean();

      paramedics.forEach(p => {
        this.resourcePool.paramedics.set(p._id.toString(), {
          id: p._id,
          status: p.status,
          location: p.currentLocation,
          specialties: p.specialties || [],
          capabilities: p.capabilities || [],
          lastUpdate: p.lastLocationUpdate,
          workload: 0
        });
      });

      // 병원 상태 동기화
      const hospitals = await Hospital.find({ status: 'active', canAcceptTransfer: true })
        .select('_id name location specialties emergencyRoom capacity')
        .lean();

      hospitals.forEach(h => {
        this.resourcePool.hospitals.set(h._id.toString(), {
          id: h._id,
          name: h.name,
          location: h.location,
          specialties: h.specialties || [],
          emergencyRoom: h.emergencyRoom,
          capacity: h.capacity,
          currentLoad: 0,
          averageWaitTime: 15
        });
      });

      logger.info(`리소스 풀 초기화 완료`, {
        paramedics: this.resourcePool.paramedics.size,
        hospitals: this.resourcePool.hospitals.size
      });

      // 실시간 상태 모니터링 시작
      this.startResourceMonitoring();

    } catch (error) {
      logger.error('리소스 풀 초기화 실패', error);
    }
  }

  /**
   * 지능형 응급구조사 매칭 (백업 포함)
   */
  async intelligentParamedicMatching(emergencyCaseId, options = {}) {
    try {
      const emergencyCase = await EmergencyCase.findById(emergencyCaseId)
        .populate('userId', 'age gender medicalHistory')
        .lean();

      if (!emergencyCase) {
        throw new Error('응급 케이스를 찾을 수 없습니다.');
      }

      const requiredSpecialties = this.determineRequiredSpecialties(emergencyCase);
      const location = emergencyCase.locations.current;

      logger.info(`지능형 응급구조사 매칭 시작: ${emergencyCaseId}`, {
        emergencyLevel: emergencyCase.emergencyLevel,
        requiredSpecialties,
        expandedSearch: options.expandRadius
      });

      // 1차 매칭: 최적 후보 검색
      let candidates = await this.findQualifiedParamedics({
        location,
        emergencyLevel: emergencyCase.emergencyLevel,
        requiredSpecialties,
        maxDistance: options.expandRadius ? 20000 : 10000
      });

      // 2차 매칭: 1차 실패 시 조건 완화
      if (candidates.length === 0 && !options.expandRadius) {
        logger.info(`1차 매칭 실패, 조건 완화하여 재시도: ${emergencyCaseId}`);
        
        candidates = await this.findQualifiedParamedics({
          location,
          emergencyLevel: emergencyCase.emergencyLevel,
          requiredSpecialties: [], // 전문성 조건 완화
          maxDistance: 20000        // 거리 확장
        });
      }

      // 3차 매칭: 다른 구역 응급구조사 동원
      if (candidates.length === 0) {
        logger.info(`2차 매칭도 실패, 광역 검색 실행: ${emergencyCaseId}`);
        
        candidates = await this.findQualifiedParamedics({
          location,
          emergencyLevel: emergencyCase.emergencyLevel,
          maxDistance: 50000,       // 50km까지 확장
          allowBusy: true          // 다른 업무 중인 구조사도 고려
        });
      }

      if (candidates.length > 0) {
        // 최적 후보 선택
        const bestCandidate = this.selectBestParamedic(candidates, emergencyCase);
        
        // 백업 후보들 대기열에 추가
        const backupCandidates = candidates
          .filter(c => c.id !== bestCandidate.id)
          .slice(0, 3); // 최대 3개 백업

        this.addToBackupQueue(emergencyCaseId, bestCandidate, backupCandidates);

        return {
          success: true,
          paramedic: bestCandidate,
          backupCount: backupCandidates.length,
          searchRadius: options.expandRadius ? '확장' : '기본'
        };

      } else {
        // 모든 매칭 실패 - 헬기 응급실 검토
        await this.considerAirAmbulance(emergencyCaseId);
        
        return {
          success: false,
          reason: 'no_available_paramedics',
          escalation: 'air_ambulance_considered'
        };
      }

    } catch (error) {
      logger.error('지능형 매칭 실패', error, { emergencyCaseId });
      throw error;
    }
  }

  /**
   * 자격을 갖춘 응급구조사 검색
   */
  async findQualifiedParamedics(criteria) {
    const {
      location,
      emergencyLevel,
      requiredSpecialties = [],
      maxDistance = 10000,
      allowBusy = false
    } = criteria;

    const query = {
      status: allowBusy ? { $in: ['available', 'busy'] } : 'available'
    };

    // 전문성 요구사항 필터링
    if (requiredSpecialties.length > 0) {
      query.specialties = { $in: requiredSpecialties };
    }

    const paramedics = await Paramedic.find(query)
      .select('_id status currentLocation specialties capabilities workloadScore lastLocationUpdate')
      .lean();

    // 거리 및 적합성 스코어 계산
    const qualifiedCandidates = [];

    for (const paramedic of paramedics) {
      if (!paramedic.currentLocation) continue;

      const distance = haversineMeters(location, paramedic.currentLocation);
      if (distance > maxDistance) continue;

      // 적합성 스코어 계산 (0-100점)
      const suitabilityScore = this.calculateParamedicSuitability(paramedic, {
        distance,
        emergencyLevel,
        requiredSpecialties
      });

      qualifiedCandidates.push({
        id: paramedic._id,
        distance,
        suitabilityScore,
        eta: Math.round(distance / 1000 * 2), // 대략적인 도착 시간 (분)
        status: paramedic.status,
        specialties: paramedic.specialties,
        capabilities: paramedic.capabilities,
        workload: paramedic.workloadScore || 0
      });
    }

    // 적합성 점수 순으로 정렬
    return qualifiedCandidates.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  }

  /**
   * 응급구조사 적합성 점수 계산
   */
  calculateParamedicSuitability(paramedic, criteria) {
    let score = 50; // 기본 점수

    // 거리 점수 (가까울수록 높음, 최대 25점)
    const distanceKm = criteria.distance / 1000;
    const distanceScore = Math.max(0, 25 - (distanceKm * 2.5)); // 10km에서 0점
    score += distanceScore;

    // 전문성 점수 (최대 15점)
    const specialtyMatches = criteria.requiredSpecialties.filter(s => 
      paramedic.specialties?.includes(s)
    ).length;
    score += specialtyMatches * 5;

    // 워크로드 점수 (바쁘지 않을수록 높음, 최대 10점)
    const workloadScore = Math.max(0, 10 - (paramedic.workloadScore || 0));
    score += workloadScore;

    // 상태 보너스
    if (paramedic.status === 'available') score += 5;
    if (paramedic.capabilities?.includes('advanced_life_support')) score += 3;
    if (paramedic.capabilities?.includes('pediatric_specialist') && criteria.emergencyLevel >= 4) score += 3;

    return Math.min(100, score);
  }

  /**
   * 최적 응급구조사 선택
   */
  selectBestParamedic(candidates, emergencyCase) {
    // 응급도 5단계의 경우 전문성보다 거리 우선
    if (emergencyCase.emergencyLevel === 5) {
      return candidates.sort((a, b) => a.distance - b.distance)[0];
    }

    // 일반적인 경우 종합 점수 순
    return candidates.sort((a, b) => b.suitabilityScore - a.suitabilityScore)[0];
  }

  /**
   * 백업 대기열에 추가
   */
  addToBackupQueue(emergencyCaseId, primary, backups) {
    this.backupQueue.push({
      caseId: emergencyCaseId,
      primary,
      backups,
      createdAt: new Date(),
      attempts: 0
    });

    logger.info(`백업 대기열 추가: ${emergencyCaseId}`, {
      primaryId: primary.id,
      backupCount: backups.length
    });
  }

  /**
   * 백업 매칭 실행
   */
  async executeBackupMatching(emergencyCaseId, reason = 'primary_failed') {
    const backupEntry = this.backupQueue.find(b => b.caseId === emergencyCaseId);
    if (!backupEntry) {
      logger.warn(`백업 정보 없음: ${emergencyCaseId}`);
      return { success: false, reason: 'no_backup_available' };
    }

    if (backupEntry.backups.length === 0) {
      logger.warn(`백업 응급구조사 소진: ${emergencyCaseId}`);
      return { success: false, reason: 'backup_exhausted' };
    }

    backupEntry.attempts++;
    const backupParamedic = backupEntry.backups.shift(); // 첫 번째 백업 사용

    logger.info(`백업 매칭 실행: ${emergencyCaseId}`, {
      reason,
      attempt: backupEntry.attempts,
      backupId: backupParamedic.id,
      remainingBackups: backupEntry.backups.length
    });

    try {
      // 백업 응급구조사에게 배정
      const matchResult = await this.assignParamedic(emergencyCaseId, backupParamedic.id);

      if (matchResult.success) {
        // 에스컬레이션 알림
        emitEscalation(emergencyCaseId, {
          level: 'backup_activated',
          message: `백업 응급구조사 배정 (${backupEntry.attempts}차 시도)`,
          paramedicId: backupParamedic.id,
          reason
        });

        return { success: true, paramedicId: backupParamedic.id };
      } else {
        // 백업도 실패 시 다음 백업 시도
        if (backupEntry.backups.length > 0) {
          return await this.executeBackupMatching(emergencyCaseId, 'backup_failed');
        } else {
          return { success: false, reason: 'all_backups_failed' };
        }
      }

    } catch (error) {
      logger.error('백업 매칭 실패', error, { emergencyCaseId });
      return { success: false, reason: 'backup_matching_error', error: error.message };
    }
  }

  /**
   * 응급구조사 배정 실행
   */
  async assignParamedic(emergencyCaseId, paramedicId) {
    try {
      // 응급구조사 상태 확인
      const paramedic = await Paramedic.findById(paramedicId);
      if (!paramedic || paramedic.status !== 'available') {
        return { success: false, reason: 'paramedic_not_available' };
      }

      // 응급 케이스 업데이트
      await EmergencyCase.findByIdAndUpdate(emergencyCaseId, {
        'paramedic.paramedicId': paramedicId,
        'paramedic.matchedAt': new Date(),
        'paramedic.status': 'dispatched'
      });

      // 응급구조사 상태 업데이트
      await Paramedic.findByIdAndUpdate(paramedicId, {
        status: 'dispatched',
        currentCase: emergencyCaseId,
        dispatchedAt: new Date()
      });

      // 리소스 풀 업데이트
      const resource = this.resourcePool.paramedics.get(paramedicId.toString());
      if (resource) {
        resource.status = 'dispatched';
        resource.currentCase = emergencyCaseId;
        resource.workload++;
      }

      logger.info(`응급구조사 배정 완료: ${paramedicId} → ${emergencyCaseId}`);

      return { success: true, paramedicId };

    } catch (error) {
      logger.error('응급구조사 배정 실패', error);
      return { success: false, reason: 'assignment_error', error: error.message };
    }
  }

  /**
   * 지능형 병원 매칭 (전문성 + 용량 고려)
   */
  async intelligentHospitalMatching(emergencyCaseId, options = {}) {
    try {
      const emergencyCase = await EmergencyCase.findById(emergencyCaseId)
        .populate('userId', 'age gender medicalHistory')
        .lean();

      const patient = emergencyCase.userId;
      const location = emergencyCase.locations.current;

      // 필요한 전문성 결정
      const requiredSpecialties = this.determineRequiredSpecialties(emergencyCase, patient);
      
      // 응급실 용량 고려 매칭
      const hospitalCandidates = await this.findOptimalHospitals({
        location,
        requiredSpecialties,
        emergencyLevel: emergencyCase.emergencyLevel,
        patientAge: patient.age,
        patientGender: patient.gender,
        medicalHistory: patient.medicalHistory
      });

      if (hospitalCandidates.length > 0) {
        const primaryHospital = hospitalCandidates[0];
        const backupHospitals = hospitalCandidates.slice(1, 4); // 최대 3개 백업

        // 1차 병원에 사전 통보
        await this.preNotifyHospital(primaryHospital.id, emergencyCase);

        // 백업 병원들에도 대기 알림
        for (const backup of backupHospitals) {
          await this.preNotifyHospital(backup.id, emergencyCase, { isBackup: true });
        }

        logger.info(`지능형 병원 매칭 완료: ${emergencyCaseId}`, {
          primaryHospital: primaryHospital.name,
          backupCount: backupHospitals.length
        });

        return {
          success: true,
          primary: primaryHospital,
          backups: backupHospitals,
          totalOptions: hospitalCandidates.length
        };

      } else {
        logger.warn(`병원 매칭 실패: ${emergencyCaseId} - 용량 부족 또는 전문성 미달`);
        
        // 에스컬레이션: 타 지역 대형병원 검토
        return await this.escalateHospitalSearch(emergencyCaseId);
      }

    } catch (error) {
      logger.error('지능형 병원 매칭 실패', error);
      throw error;
    }
  }

  /**
   * 최적 병원 검색
   */
  async findOptimalHospitals(criteria) {
    const hospitals = await Hospital.find({
      status: 'active',
      canAcceptTransfer: true,
      'emergencyRoom.isAvailable': true
    }).lean();

    const candidates = [];

    for (const hospital of hospitals) {
      // 거리 계산
      const distance = calculateDistance(criteria.location, hospital.location);
      if (distance > 50000) continue; // 50km 초과는 제외

      // 전문성 매칭
      const specialtyMatch = criteria.requiredSpecialties.every(s => 
        hospital.specialties?.includes(s)
      );

      // 용량 확인
      const currentLoad = this.resourcePool.hospitals.get(hospital._id.toString())?.currentLoad || 0;
      const capacity = hospital.capacity?.emergency || 10;
      const availableCapacity = capacity - currentLoad;

      // 대기 시간 예측
      const estimatedWaitTime = this.calculateWaitTime(hospital._id, criteria.emergencyLevel);

      // 종합 점수 계산
      const suitabilityScore = this.calculateHospitalSuitability({
        distance,
        specialtyMatch,
        availableCapacity,
        estimatedWaitTime,
        emergencyLevel: criteria.emergencyLevel,
        hospitalReputation: hospital.qualityScore || 80
      });

      candidates.push({
        id: hospital._id,
        name: hospital.name,
        location: hospital.location,
        distance,
        suitabilityScore,
        specialtyMatch,
        availableCapacity,
        estimatedWaitTime,
        specialties: hospital.specialties || []
      });
    }

    // 점수 순으로 정렬
    return candidates
      .sort((a, b) => b.suitabilityScore - a.suitabilityScore)
      .slice(0, 10); // 상위 10개만
  }

  /**
   * 병원 적합성 점수 계산
   */
  calculateHospitalSuitability(factors) {
    let score = 40; // 기본 점수

    // 거리 점수 (가까울수록 높음, 최대 25점)
    const distanceKm = factors.distance / 1000;
    score += Math.max(0, 25 - distanceKm); // 25km에서 0점

    // 전문성 점수 (최대 20점)
    if (factors.specialtyMatch) score += 20;

    // 용량 점수 (여유 있을수록 높음, 최대 15점)
    score += Math.min(15, factors.availableCapacity * 3);

    // 대기 시간 점수 (짧을수록 높음, 최대 10점)
    score += Math.max(0, 10 - (factors.estimatedWaitTime / 5));

    // 응급도별 가중치 조정
    if (factors.emergencyLevel >= 4) {
      // 고위험 환자: 거리보다 전문성 우선
      if (factors.specialtyMatch) score += 10;
      if (factors.estimatedWaitTime < 10) score += 5;
    }

    // 병원 평판 점수 (최대 5점)
    score += (factors.hospitalReputation - 80) / 4; // 80점 기준으로 보너스

    return Math.min(100, score);
  }

  /**
   * 필요한 전문성 결정
   */
  determineRequiredSpecialties(emergencyCase, patient = null) {
    const specialties = [];
    const emergencyLevel = emergencyCase.emergencyLevel;
    const anomalies = emergencyCase.detectedAnomalies || [];

    // 응급도 기반 전문성
    if (emergencyLevel === 5) {
      specialties.push('critical_care', 'advanced_life_support');
    }

    // 이상 징후 기반 전문성
    anomalies.forEach(anomaly => {
      switch (anomaly.type) {
        case 'heart_rate':
          specialties.push('cardiac_care');
          break;
        case 'fall':
          specialties.push('trauma_care');
          if (patient?.age > 65) specialties.push('geriatric_care');
          break;
        case 'respiratory':
          specialties.push('respiratory_care');
          break;
      }
    });

    // 환자 특성 기반 전문성
    if (patient) {
      if (patient.age < 18) specialties.push('pediatric_care');
      if (patient.age > 65) specialties.push('geriatric_care');
      
      if (patient.medicalHistory?.includes('diabetes')) {
        specialties.push('endocrinology');
      }
      if (patient.medicalHistory?.includes('heart_disease')) {
        specialties.push('cardiology');
      }
    }

    return [...new Set(specialties)]; // 중복 제거
  }

  /**
   * 대기 시간 예측
   */
  calculateWaitTime(hospitalId, emergencyLevel) {
    const hospital = this.resourcePool.hospitals.get(hospitalId.toString());
    if (!hospital) return 30; // 기본값

    let baseWaitTime = hospital.averageWaitTime || 15;

    // 응급도별 우선순위 조정
    switch (emergencyLevel) {
      case 5: return 0;        // 즉시 처리
      case 4: return 2;        // 2분 대기
      case 3: return 5;        // 5분 대기  
      case 2: return 15;       // 15분 대기
      default: return 30;      // 30분 대기
    }
  }

  /**
   * 실시간 리소스 상태 모니터링
   */
  startResourceMonitoring() {
    // 1분마다 리소스 상태 업데이트
    setInterval(async () => {
      await this.updateResourceStatus();
    }, 60000);

    // 30초마다 용량 모니터링
    setInterval(async () => {
      await this.monitorCapacity();
    }, 30000);

    logger.info('실시간 리소스 모니터링 시작');
  }

  /**
   * 리소스 상태 업데이트
   */
  async updateResourceStatus() {
    try {
      // 응급구조사 상태 동기화
      const paramedics = await Paramedic.find({})
        .select('_id status currentLocation workloadScore')
        .lean();

      paramedics.forEach(p => {
        const resource = this.resourcePool.paramedics.get(p._id.toString());
        if (resource) {
          resource.status = p.status;
          resource.location = p.currentLocation;
          resource.workload = p.workloadScore || 0;
          resource.lastUpdate = new Date();
        }
      });

      // 병원 용량 상태 동기화
      const activeCases = await EmergencyCase.countDocuments({
        status: { $in: ['detected', 'paramedic_dispatched', 'transport_started'] },
        'hospital.hospitalId': { $exists: true }
      });

      // 실시간 리소스 상태 브로드캐스트
      emitResourceUpdate({
        paramedicsAvailable: Array.from(this.resourcePool.paramedics.values())
          .filter(p => p.status === 'available').length,
        hospitalsAvailable: Array.from(this.resourcePool.hospitals.values())
          .filter(h => h.currentLoad < h.capacity?.emergency).length,
        activeCases,
        lastUpdate: new Date()
      });

    } catch (error) {
      logger.warn('리소스 상태 업데이트 실패', error);
    }
  }

  /**
   * 용량 한계 모니터링 및 자동 조치
   */
  async monitorCapacity() {
    try {
      // 리소스 풀이 비어있으면(초기화 안됨/개발 모드) 모니터링 스킵
      if (this.resourcePool.paramedics.size === 0 && this.resourcePool.hospitals.size === 0) {
        return;
      }

      const paramedicsAvailable = Array.from(this.resourcePool.paramedics.values())
        .filter(p => p.status === 'available').length;

      const hospitalsWithCapacity = Array.from(this.resourcePool.hospitals.values())
        .filter(h => h.currentLoad < (h.capacity?.emergency || 10)).length;

      // 용량 부족 경고 (응급구조사 5명 미만)
      if (paramedicsAvailable < 5) {
        logger.warn('응급구조사 용량 부족', {
          available: paramedicsAvailable,
          threshold: 5
        });

        emitResourceUpdate({
          type: 'capacity_warning',
          resource: 'paramedics',
          available: paramedicsAvailable,
          message: '응급구조사 용량이 부족합니다.',
          recommendedAction: '인근 지역 응급구조사 대기 요청'
        });
      }

      // 병원 용량 부족 경고
      if (hospitalsWithCapacity < 3) {
        logger.warn('병원 용량 부족', {
          available: hospitalsWithCapacity,
          threshold: 3
        });

        emitResourceUpdate({
          type: 'capacity_warning',
          resource: 'hospitals',
          available: hospitalsWithCapacity,
          message: '병원 응급실 용량이 부족합니다.',
          recommendedAction: '타 지역 병원 확인 또는 응급실 확장'
        });
      }

      // 극심한 용량 부족 시 자동 광역 지원 요청
      if (paramedicsAvailable < 2 || hospitalsWithCapacity < 1) {
        await this.requestRegionalSupport();
      }

    } catch (error) {
      logger.warn('용량 모니터링 실패', error);
    }
  }

  /**
   * 광역 지원 요청
   */
  async requestRegionalSupport() {
    logger.warn('광역 응급 지원 요청');

    try {
      // 인근 지역 리소스 조회
      const nearbyRegions = ['seoul', 'incheon', 'gyeonggi'];
      
      for (const region of nearbyRegions) {
        const supportRequest = await this.requestCrossRegionalSupport(region);
        
        if (supportRequest.available > 0) {
          emitResourceUpdate({
            type: 'regional_support',
            region,
            supportParamedics: supportRequest.available,
            eta: supportRequest.eta,
            message: `${region} 지역에서 응급구조사 ${supportRequest.available}명 지원 가능`
          });
        }
      }

    } catch (error) {
      logger.error('광역 지원 요청 실패', error);
    }
  }

  /**
   * 워크플로우 성능 분석
   */
  async generatePerformanceReport() {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 완료된 케이스들 분석
      const completedCases = await EmergencyCase.find({
        status: 'completed',
        detectedAt: { $gte: last24Hours }
      }).lean();

      const performanceMetrics = {
        totalCases: completedCases.length,
        averageResponseTime: 0,
        slaCompliance: {
          paramedicResponse: 0,
          paramedicArrival: 0,
          hospitalTransport: 0,
          totalResponse: 0
        },
        escalationRate: 0,
        backupUsageRate: 0,
        successRate: 0
      };

      // 응답 시간 분석
      let totalResponseTime = 0;
      let slaViolations = { response: 0, arrival: 0, transport: 0, total: 0 };
      let escalationCount = 0;
      let backupUsageCount = 0;

      completedCases.forEach(case_ => {
        const responseTime = case_.paramedic?.arrivedAt - case_.detectedAt;
        if (responseTime) {
          totalResponseTime += responseTime;
          
          const responseMinutes = responseTime / (1000 * 60);
          if (responseMinutes > 2) slaViolations.response++;
          if (responseMinutes > 8) slaViolations.arrival++;
          if (responseMinutes > 45) slaViolations.total++;
        }

        if (case_.escalationLevel > 0) escalationCount++;
        if (case_.usedBackup) backupUsageCount++;
      });

      performanceMetrics.averageResponseTime = completedCases.length > 0 
        ? Math.round(totalResponseTime / completedCases.length / (1000 * 60))
        : 0;

      performanceMetrics.slaCompliance = {
        paramedicResponse: Math.round((1 - slaViolations.response / completedCases.length) * 100),
        paramedicArrival: Math.round((1 - slaViolations.arrival / completedCases.length) * 100),
        totalResponse: Math.round((1 - slaViolations.total / completedCases.length) * 100)
      };

      performanceMetrics.escalationRate = Math.round(escalationCount / completedCases.length * 100);
      performanceMetrics.backupUsageRate = Math.round(backupUsageCount / completedCases.length * 100);
      performanceMetrics.successRate = Math.round((completedCases.length / (completedCases.length + escalationCount)) * 100);

      logger.info('응급 대응 성능 리포트', performanceMetrics);

      return performanceMetrics;

    } catch (error) {
      logger.error('성능 리포트 생성 실패', error);
      return null;
    }
  }
}

// 싱글톤 인스턴스
const resourceManagementService = new ResourceManagementService();

module.exports = resourceManagementService;