// 백엔드 데이터를 프론트엔드 타입으로 변환하는 유틸리티
import { Patient, Hospital, Ambulance, PatientStatus, AmbulanceStatus } from '../types';

export function transformEmergencyCaseToPatient(caseData: any): Patient {
  const user = caseData.userId || {};
  const loc = caseData.locations?.detectedAt || caseData.locations?.current || {};
  
  // 응급도에 따른 상태 매핑
  let status = PatientStatus.PENDING;
  if (caseData.emergencyLevel === 5) {
    status = PatientStatus.CRITICAL;
  } else if (caseData.emergencyLevel === 4) {
    status = PatientStatus.SERIOUS;
  } else if (caseData.emergencyLevel === 3) {
    status = PatientStatus.STABLE;
  }

  // 이상 징후에서 심박수 추출 시도
  const hrAnomaly = caseData.detectedAnomalies?.find((a: any) => a.type === 'heart_rate');
  const heartRateMatch = hrAnomaly?.description?.match(/\d+/);
  const defaultHeartRate = heartRateMatch ? parseInt(heartRateMatch[0]) : 80;

  // 기초선 심박수 사용 (있는 경우)
  const baselineHr = user?.baselineBiometric?.heartRate?.avg || defaultHeartRate;

  return {
    id: caseData._id || caseData.id,
    name: user.name || '알 수 없음',
    age: user.age || 0,
    birthDate: user.birthDate || '1900-01-01',
    bloodType: user.bloodType || 'O+',
    imageUrl: `https://i.pravatar.cc/150?u=${caseData._id || caseData.id}`,
    gender: user.gender === 'male' ? 'M' : user.gender === 'female' ? 'F' : 'M',
    status,
    location: loc.address || `${loc.lat?.toFixed(4)}, ${loc.lng?.toFixed(4)}`,
    lat: loc.lat || 37.5665,
    lng: loc.lng || 126.9780,
    vitals: {
      heartRate: baselineHr,
      bloodPressure: '120/80',
      oxygenLevel: 95,
      bodyTemp: 36.5,
      lastUpdated: new Date(caseData.detectedAt || caseData.createdAt).toISOString(),
      history: [],
      ecgPattern: 'Normal',
      fallDetected: caseData.detectedAnomalies?.some((a: any) => a.type === 'fall'),
      activityContext: caseData.detectedAnomalies?.find((a: any) => a.type === 'movement')?.description?.includes('낙상') ? 'Sudden Stop' : 'Resting',
    },
    symptoms: caseData.detectedAnomalies?.map((a: any) => a.description) || [],
    aiAnalysis: caseData.llmAnalysis?.analysisText || null,
    llmModel: caseData.llmAnalysis?.model || null,
    recommendedHospitalId: caseData.hospital?.hospitalId?._id || caseData.hospital?.hospitalId,
    matchedAmbulanceId: caseData.paramedic?.paramedicId?._id || caseData.paramedic?.paramedicId,
    severityScore: caseData.emergencyLevel,
  };
}

export function transformBiometricToVitals(biometric: any, history: any[]): any {
  return {
    heartRate: biometric?.heartRate || 80,
    bloodPressure: '120/80',
    oxygenLevel: Math.max(85, 100 - Math.floor((biometric?.stressLevel || 0) / 2)),
    bodyTemp: 36.5,
    lastUpdated: biometric?.collectedAt || new Date().toISOString(),
    history: history.map((h) => ({
      time: new Date(h.collectedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      hr: h.heartRate || 80,
      spo2: Math.max(85, 100 - Math.floor((h.stressLevel || 0) / 2)),
    })),
    ecgPattern: 'Normal',
    fallDetected: biometric?.movementStatus === 'fall_detected',
    activityContext: biometric?.movementStatus === 'walking' ? 'Walking' : 'Resting',
  };
}

export function transformHospitalToFrontend(hospital: any): Hospital {
  return {
    id: hospital._id || hospital.id,
    name: hospital.name || '알 수 없음',
    location: hospital.location?.address || `${hospital.location?.lat}, ${hospital.location?.lng}`,
    lat: hospital.location?.lat || 37.5665,
    lng: hospital.location?.lng || 126.9780,
    availableBeds: hospital.emergencyRoom?.availableBeds || 0,
    totalBeds: hospital.emergencyRoom?.totalBeds || 0,
    icuBeds: {
      available: hospital.emergencyRoom?.icuBeds?.available || 0,
      total: hospital.emergencyRoom?.icuBeds?.total || 0,
    },
    erBeds: {
      available: hospital.emergencyRoom?.availableBeds || 0,
      total: hospital.emergencyRoom?.totalBeds || 0,
    },
    operatingRooms: {
      available: hospital.emergencyRoom?.operatingRooms?.available || 0,
      total: hospital.emergencyRoom?.operatingRooms?.total || 0,
    },
    specialties: hospital.specialties || [],
    surgicalCapabilities: [],
    bloodSupply: 'Normal',
    distance: '0 km',
    isEROpen: hospital.emergencyRoom?.isOpen !== false,
    activeTraumaLevel: 1,
  };
}

export function transformParamedicToAmbulance(paramedic: any): Ambulance {
  const loc = paramedic.currentLocation || {};
  return {
    id: paramedic._id || paramedic.id,
    unitName: paramedic.name || '알 수 없음',
    lat: loc.lat || 37.5665,
    lng: loc.lng || 126.9780,
    status:
      paramedic.status === 'available'
        ? AmbulanceStatus.AVAILABLE
        : paramedic.status === 'busy'
        ? AmbulanceStatus.BUSY
        : AmbulanceStatus.DISPATCHED,
    type: paramedic.type === 'ALS' ? 'ALS' : 'BLS',
  };
}