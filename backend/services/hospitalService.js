const Hospital = require('../models/Hospital');
const { haversineMeters } = require('./geoService');
const nedcApiService = require('./nedcApiService');
const logger = require('../utils/logger');

const DEFAULT_MAX_DISTANCE_M = 50000; // 50km

/**
 * 국립중앙의료원 API에서 병원 데이터를 가져와서 DB에 동기화
 */
async function syncHospitalsFromMedicalCenter() {
  try {
    logger.info('국립중앙의료원 API 병원 데이터 동기화 시작');
    
    let totalSynced = 0;
    let page = 1;
    let hasMore = true;

    // 페이지네이션으로 전체 데이터 동기화
    while (hasMore) {
      const result = await nedcApiService.syncHospitalData(page, 100);
      
      if (!result.success) {
        logger.warn(`페이지 ${page} 동기화 실패`);
        break;
      }
      
      totalSynced += result.syncedCount;
      hasMore = result.hasMore;
      page++;
      
      // API 제한을 고려한 지연
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      }
    }

    logger.info(`국립중앙의료원 API 동기화 완료: 총 ${totalSynced}개 병원`);

    return {
      success: true,
      synced: totalSynced,
      message: `국립중앙의료원 API 동기화 완료: ${totalSynced}개 병원`
    };

  } catch (error) {
    logger.error('국립중앙의료원 API 동기화 실패', error);
    return {
      success: false,
      synced: 0,
      message: `동기화 실패: ${error.message}`
    };
  }
}

/**
 * 이송 가능한 병원 중 가장 가까운 병원 찾기
 */
async function findNearestAvailableHospital({ lat, lng, maxDistanceM = DEFAULT_MAX_DISTANCE_M, specialties = [] }) {
  const query = {
    status: 'active',
    canAcceptTransfer: true,
    'emergencyRoom.isAvailable': true
  };

  const candidates = await Hospital.find(query)
    .select('_id name location emergencyRoom specialties')
    .lean();

  let best = null;
  let bestDistance = Infinity;

  for (const hospital of candidates) {
    const hLoc = hospital.location;
    if (!hLoc || hLoc.lat === undefined || hLoc.lng === undefined) continue;

    const distance = haversineMeters({ lat, lng }, { lat: hLoc.lat, lng: hLoc.lng });
    
    if (distance > maxDistanceM) continue;

    // 전문 분야 필터링 (선택사항)
    if (specialties.length > 0) {
      const hasSpecialty = specialties.some(spec => hospital.specialties?.includes(spec));
      if (!hasSpecialty) continue;
    }

    // 거리와 응급실 대기 시간을 고려한 점수 계산
    const waitTime = hospital.emergencyRoom?.waitTime || 0;
    const score = distance + (waitTime * 100); // 대기 시간 1분 = 100m 추가

    if (score < bestDistance) {
      bestDistance = score;
      best = {
        hospitalId: hospital._id,
        distanceM: distance,
        waitTime: waitTime,
        name: hospital.name,
        location: hLoc
      };
    }
  }

  return best;
}

/**
 * 응급 케이스에 병원 자동 매칭
 */
async function autoMatchHospitalForCase(caseId, options = {}) {
  try {
    const EmergencyCase = require('../models/EmergencyCase');
    const ec = await EmergencyCase.findById(caseId).populate('userId', 'age gender medicalHistory');
    
    if (!ec) {
      throw new Error('케이스를 찾을 수 없습니다.');
    }

    if (ec.hospital?.hospitalId && !options.forceRematch) {
      return { matched: false, reason: 'already_matched', caseId: ec._id };
    }

    const lat = ec.locations?.current?.lat ?? ec.locations?.detectedAt?.lat;
    const lng = ec.locations?.current?.lng ?? ec.locations?.detectedAt?.lng;
    if (lat === undefined || lng === undefined) {
      return { matched: false, reason: 'no_location', caseId: ec._id };
    }

    logger.info(`실시간 병원 매칭 시작: ${caseId}`);

    // 국립중앙의료원 API 기반 지능형 매칭
    const patientInfo = {
      emergencyLevel: ec.emergencyLevel,
      age: ec.userId?.age,
      gender: ec.userId?.gender,
      medicalHistory: ec.userId?.medicalHistory,
      symptoms: ec.detectedAnomalies?.map(a => a.type) || []
    };

    const optimalHospitals = await nedcApiService.findOptimalHospitals(ec, patientInfo, options);

    if (!optimalHospitals || optimalHospitals.length === 0) {
      return { matched: false, reason: 'no_available_hospital', caseId: ec._id };
    }

    const primaryHospital = optimalHospitals[0];
    const backupHospitals = optimalHospitals.slice(1, 3); // 상위 2개 백업

    // 1차 병원 수용 확약 시도
    const confirmation = await nedcApiService.requestAdmissionConfirmation(
      primaryHospital.hospitalId,
      ec,
      new Date(Date.now() + (primaryHospital.estimatedTravelTime || 20) * 60 * 1000)
    );

    let finalHospital = primaryHospital;
    let finalConfirmation = confirmation;

    // 1차 병원 확약 실패 시 백업 병원 시도
    if (!confirmation.confirmed && backupHospitals.length > 0) {
      logger.info(`1차 병원 확약 실패, 백업 병원 시도: ${caseId}`);
      
      for (const backup of backupHospitals) {
        const backupConfirmation = await nedcApiService.requestAdmissionConfirmation(
          backup.hospitalId,
          ec,
          new Date(Date.now() + (backup.estimatedTravelTime || 25) * 60 * 1000)
        );

        if (backupConfirmation.confirmed) {
          finalHospital = backup;
          finalConfirmation = backupConfirmation;
          break;
        }
      }
    }

    // 응급 케이스에 병원 정보 저장
    ec.hospital = {
      hospitalId: finalHospital.hospitalId,
      hospitalName: finalHospital.hospitalName,
      matchedAt: new Date(),
      status: finalConfirmation.confirmed ? 'confirmed' : 'pending',
      confirmationId: finalConfirmation.confirmationId,
      assignedBed: finalConfirmation.assignedBed,
      assignedDepartment: finalConfirmation.assignedDepartment,
      estimatedArrival: finalConfirmation.estimatedArrival,
      distance: finalHospital.distance,
      suitabilityScore: finalHospital.suitabilityScore,
      backupHospitals: backupHospitals.map(h => ({
        hospitalId: h.hospitalId,
        hospitalName: h.hospitalName,
        distance: h.distance,
        suitabilityScore: h.suitabilityScore
      }))
    };

    ec.locations.hospital = {
      lat: finalHospital.latitude,
      lng: finalHospital.longitude,
      address: finalHospital.address || ''
    };

    await ec.save();

    logger.info(`병원 매칭 완료: ${finalHospital.hospitalName} (확약: ${finalConfirmation.confirmed})`);

    return {
      matched: true,
      confirmed: finalConfirmation.confirmed,
      hospitalId: finalHospital.hospitalId,
      hospitalName: finalHospital.hospitalName,
      confirmationId: finalConfirmation.confirmationId,
      distance: finalHospital.distance,
      suitabilityScore: finalHospital.suitabilityScore,
      estimatedArrival: finalConfirmation.estimatedArrival,
      backupCount: backupHospitals.length,
      caseId: ec._id
    };

  } catch (error) {
    logger.error(`병원 자동 매칭 실패 [${caseId}]:`, error);
    return {
      matched: false,
      reason: 'matching_error',
      error: error.message,
      caseId
    };
  }
}

/**
 * 실시간 병원 재매칭 (상황 변화 시)
 */
async function rematchHospitalIfNeeded(caseId, reason = 'condition_changed') {
  try {
    logger.info(`병원 재매칭 검토: ${caseId} (사유: ${reason})`);

    const EmergencyCase = require('../models/EmergencyCase');
    const ec = await EmergencyCase.findById(caseId);
    if (!ec || !ec.hospital?.hospitalId) {
      return { rematched: false, reason: 'no_existing_match' };
    }

    // 현재 병원 상태 재확인
    const currentHospitalAvailability = await nedcApiService.getHospitalAvailability(
      ec.hospital.hospitalId,
      {
        emergencyLevel: ec.emergencyLevel,
        age: ec.userId?.age,
        estimatedArrival: ec.hospital.estimatedArrival
      }
    );

    // 현재 병원이 여전히 적합한 경우
    if (currentHospitalAvailability.available && currentHospitalAvailability.confidence > 70) {
      return {
        rematched: false,
        reason: 'current_hospital_still_optimal',
        currentHospital: ec.hospital.hospitalName
      };
    }

    // 재매칭 실행
    const rematchResult = await autoMatchHospitalForCase(caseId, { 
      forceRematch: true,
      reason 
    });

    if (rematchResult.matched) {
      logger.info(`병원 재매칭 성공: ${ec.hospital.hospitalName} → ${rematchResult.hospitalName}`);
      
      return {
        rematched: true,
        previousHospital: ec.hospital.hospitalName,
        newHospital: rematchResult.hospitalName,
        reason,
        improvement: rematchResult.suitabilityScore - (ec.hospital.suitabilityScore || 0)
      };
    }

    return {
      rematched: false,
      reason: 'no_better_alternative',
      currentHospital: ec.hospital.hospitalName
    };

  } catch (error) {
    logger.error(`병원 재매칭 실패 [${caseId}]:`, error);
    return {
      rematched: false,
      reason: 'rematch_error',
      error: error.message
    };
  }
}

/**
 * 병원 수용 확약 상태 확인 및 갱신
 */
async function updateHospitalConfirmationStatus(caseId) {
  try {
    const EmergencyCase = require('../models/EmergencyCase');
    const ec = await EmergencyCase.findById(caseId);
    if (!ec || !ec.hospital?.confirmationId) {
      return { updated: false, reason: 'no_confirmation' };
    }

    // 실시간 병원 상태 재확인
    const availability = await nedcApiService.getHospitalAvailability(
      ec.hospital.hospitalId,
      {
        emergencyLevel: ec.emergencyLevel,
        confirmationId: ec.hospital.confirmationId
      }
    );

    const previousStatus = ec.hospital.status;
    let newStatus = previousStatus;

    if (availability.available) {
      newStatus = 'confirmed';
    } else if (availability.reason === 'capacity_full') {
      newStatus = 'capacity_exceeded';
    } else if (availability.reason === 'confirmation_expired') {
      newStatus = 'expired';
    }

    // 상태 변경 시 업데이트
    if (newStatus !== previousStatus) {
      ec.hospital.status = newStatus;
      ec.hospital.lastStatusUpdate = new Date();
      ec.hospital.statusReason = availability.reason;
      await ec.save();

      logger.info(`병원 확약 상태 변경: ${previousStatus} → ${newStatus}`);

      // 확약이 만료되거나 취소된 경우 재매칭 시도
      if (newStatus === 'expired' || newStatus === 'capacity_exceeded') {
        const rematchResult = await rematchHospitalIfNeeded(caseId, `confirmation_${newStatus}`);
        return {
          updated: true,
          statusChanged: true,
          previousStatus,
          newStatus,
          rematchAttempted: true,
          rematchResult
        };
      }
    }

    return {
      updated: true,
      statusChanged: newStatus !== previousStatus,
      previousStatus,
      newStatus,
      availability
    };

  } catch (error) {
    logger.error(`병원 확약 상태 확인 실패 [${caseId}]:`, error);
    return {
      updated: false,
      reason: 'status_check_error',
      error: error.message
    };
  }
}

/**
 * 실시간 응급실 가용 병상 현황 조회
 */
async function getRealTimeEmergencyRoomStatus(hospitalIds = []) {
  try {
    const bedInfo = await nedcApiService.getRealTimeEmergencyBeds(hospitalIds, true);
    
    return {
      success: true,
      data: bedInfo.map(hospital => ({
        hospitalId: hospital.hospitalId,
        hospitalName: hospital.hospitalName,
        emergencyBeds: hospital.emergencyBeds,
        icu: hospital.icu,
        operatingRooms: hospital.operatingRooms,
        specialties: hospital.specialties,
        status: hospital.status,
        lastUpdated: new Date()
      })),
      totalHospitals: bedInfo.length,
      lastUpdated: new Date()
    };

  } catch (error) {
    logger.error('실시간 응급실 현황 조회 실패', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

module.exports = {
  syncHospitalsFromMedicalCenter,
  findNearestAvailableHospital,
  autoMatchHospitalForCase,
  rematchHospitalIfNeeded,
  updateHospitalConfirmationStatus,
  getRealTimeEmergencyRoomStatus
};
