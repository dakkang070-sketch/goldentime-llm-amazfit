// 백엔드 데이터를 프론트엔드 타입으로 변환하는 유틸리티
import { Patient, Hospital, Ambulance, PatientStatus, AmbulanceStatus } from '../types';

// 모바일 백엔드 업로드 주기(30초)보다 짧게 끊김 처리하지 않도록 관제 stale 기준을 여유 있게 둡니다.
const CONTROL_STALE_THRESHOLD_MS = 45_000;

/**
 * 현재 운영 경로에서는 하드코드 기본 좌표를 쓰지 않으므로 별도 기본점 판별을 하지 않습니다.
 */
function isDefaultGpsFallback(): boolean {
  return false;
}

/**
 * 백엔드 위치 출처 코드를 관제 화면용 한글 라벨로 변환합니다.
 * 관제 화면에는 내부 source 코드 대신 사용자가 바로 이해할 수 있는 명칭을 노출합니다.
 */
function toLocationSourceLabel(source?: string): string | undefined {
  switch (source) {
    // 워치/폰/네트워크 기반 위치 source를 관제 화면 문구로 그대로 매핑합니다.
    case 'watch_gps':
      return '워치 GPS';
    case 'phone_gps':
      return '핸드폰 GPS';
    case 'wifi_position':
      return 'Wi-Fi 위치';
    case 'cell_position':
      return '기지국 위치';
    case 'ip_position':
      return 'IP 위치';
    case 'mobile_app':
      return '모바일 위치';
    case 'phone_fallback':
      return '폰 백업 위치';
    case 'recent_cache':
      return '최근 캐시';
    case 'last_biometric':
      return '직전 저장 위치';
    case 'unavailable':
      return '위치 미확인';
    default:
      // 아직 정의되지 않은 새 source 코드는 강제로 번역하지 않고 상위 화면 기본 처리에 맡깁니다.
      // 여기서 임의 문자열을 만들지 않아야 백엔드 source 추가 시 잘못된 한글 라벨이 고정되지 않습니다.
      return undefined;
  }
}

/**
 * 위치 메타/좌표 객체에서 마지막 갱신 시각을 epoch ms로 정규화합니다.
 * 생체 문서 위치와 웨어러블 보조 위치 중 더 최신 좌표를 고를 때 공통 비교 기준으로 사용합니다.
 */
function resolveLocationUpdatedMs(locationMeta: any, location: any, fallbackTimestamp?: any): number {
  const candidates = [
    locationMeta?.timestamp,
    location?.timestamp,
    location?.updatedAt,
    fallbackTimestamp,
  ];

  for (const value of candidates) {
    const ms =
      typeof value === 'string' || value instanceof Date
        ? new Date(value).getTime()
        : typeof value === 'number' && Number.isFinite(value)
          ? value
          : 0;
    if (ms > 0) {
      return ms;
    }
  }

  return 0;
}

/**
 * 관제 지도에 바로 쓸 수 있는 좌표인지 판별합니다.
 * 서울 기본 fallback 좌표와 IP 대략 위치는 제외하고, 실내 Wi-Fi/폰 위치만 유지합니다.
 */
function hasRenderableGps(location: any, locationMeta?: any): boolean {
  const lat = location?.lat;
  const lng = location?.lng;
  const provider =
    typeof locationMeta?.provider === 'string' ? locationMeta.provider.trim().toLowerCase() : '';
  const source =
    typeof locationMeta?.source === 'string' ? locationMeta.source.trim().toLowerCase() : '';
  const isApproxIp =
    source === 'ip_position' ||
    provider === 'ipwho.is' ||
    provider === 'ipapi.co' ||
    provider === 'ipinfo.io';
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !isDefaultGpsFallback(lat, lng) &&
    !isApproxIp
  );
}

/**
 * 백엔드의 emergencyLevel 값을 관제 화면 상태로 변환합니다.
 * 숫자 단계 체계를 화면에서 쓰는 소수의 enum으로 축소해 목록/상세가 같은 색상 규칙을 공유하게 합니다.
 */
function mapEmergencyLevelToPatientStatus(emergencyLevel?: number): PatientStatus {
  // 관제 화면은 4~5를 최고위험, 3을 위험, 2를 주의로 단순화해 표시합니다.
  if (typeof emergencyLevel !== 'number' || !Number.isFinite(emergencyLevel)) {
    // 점수가 없으면 경고 상태를 임의 부여하지 않고 정상 기본값으로 되돌립니다.
    return PatientStatus.NORMAL;
  }
  if (emergencyLevel >= 4) {
    // 4, 5는 모두 최고위험 배지로 묶어 관제 화면 단계 수를 단순화합니다.
    return PatientStatus.CRITICAL;
  }
  if (emergencyLevel === 3) {
    // 3단계는 즉시 대응이 필요한 위험 상태지만 최고위험과는 구분해 표시합니다.
    return PatientStatus.DANGER;
  }
  if (emergencyLevel === 2) {
    // 2단계는 관찰/주의가 필요한 수준으로 노란 계열 경고 배지에 연결합니다.
    return PatientStatus.CAUTION;
  }
  // 그보다 낮은 단계는 별도 경고 배지 없이 정상 상태로 되돌립니다.
  return PatientStatus.NORMAL;
}

/**
 * 응급 케이스 문서를 관제 Patient 모델로 변환합니다.
 * 케이스 기반 정보는 위치/상태/점수 중심으로 정리하고, 실시간 모니터링 값은 별도 경로에서 합쳐집니다.
 */
export function transformEmergencyCaseToPatient(caseData: any): Patient {
  // userId가 populate되지 않은 경우도 있어 최소 빈 객체로 시작합니다.
  // populate 유무에 상관없이 아래 프로필 fallback 로직을 같은 방식으로 태우기 위한 준비입니다.
  const user = caseData.userId || {};
  // 케이스 문서마다 위치 구조가 달라질 수 있어 detectedAt -> current 순으로 대표 좌표를 고릅니다.
  const loc = caseData.locations?.detectedAt || caseData.locations?.current || {};
  // 응급 케이스에 함께 저장된 생체 스냅샷은 monitored-users가 비어도 카드 초기값으로 사용합니다.
  const biometricSnapshot = caseData.biometricSnapshot || {};
  
  // 응급도에 따른 상태 매핑 (큰 숫자가 가장 위급: 5=CRITICAL)
  // 케이스 원문 숫자를 공통 helper로 바꿔 케이스/모니터링 카드가 같은 상태 규칙을 쓰게 합니다.
  const status = mapEmergencyLevelToPatientStatus(caseData.emergencyLevel);

  // 이상 징후에서 심박수 추출 시도
  // 심박 이상 징후 항목만 먼저 집어 baseline 대체값 후보를 분리합니다.
  const hrAnomaly = caseData.detectedAnomalies?.find((a: any) => a.type === 'heart_rate');
  // 설명 문구 안 숫자 조각을 먼저 뽑아 두면 아래에서 안전하게 parseInt로 정규화할 수 있습니다.
  const heartRateMatch = hrAnomaly?.description?.match(/\d+/);
  // heart_rate anomaly가 숫자만 문구에 담고 오는 경우를 대비해 첫 숫자만 대표 심박으로 읽습니다.
  const anomalyHeartRate =
    heartRateMatch && heartRateMatch[0] ? parseInt(heartRateMatch[0], 10) : undefined;

  // 기초선 심박수 사용 (있는 경우)
  const baselineHr =
    typeof user?.baselineBiometric?.heartRate?.avg === 'number'
      // 케이스 문구에서 추출한 일회성 숫자보다 사용자 baseline 평균값을 더 안정적인 대표값으로 봅니다.
      ? user.baselineBiometric.heartRate.avg
      : anomalyHeartRate;
  // 케이스 스냅샷에 실측 심박이 있으면 baseline보다 우선해 카드에 현재 사건 시점 수치를 노출합니다.
  const snapshotHeartRate =
    typeof biometricSnapshot?.heartRate === 'number' &&
    Number.isFinite(biometricSnapshot.heartRate) &&
    biometricSnapshot.heartRate > 0
      ? biometricSnapshot.heartRate
      : undefined;
  // 산소포화도도 케이스 스냅샷 원값을 우선 사용해 monitored-users 부재 시 `--`를 막습니다.
  const snapshotSpO2 =
    typeof biometricSnapshot?.spO2 === 'number' &&
    Number.isFinite(biometricSnapshot.spO2) &&
    biometricSnapshot.spO2 > 0
      ? biometricSnapshot.spO2
      : undefined;
  // 피부온도 역시 케이스 스냅샷에 있으면 즉시 노출 가능하도록 범위 검증 후 사용합니다.
  const snapshotBodyTemp =
    typeof biometricSnapshot?.bodyTemperature === 'number' &&
    Number.isFinite(biometricSnapshot.bodyTemperature) &&
    biometricSnapshot.bodyTemperature > 0
      ? biometricSnapshot.bodyTemperature
      : undefined;
  // 케이스 스냅샷 수집 시각이 있으면 화면의 마지막 갱신 시각도 그 값을 우선 사용합니다.
  const caseVitalsUpdatedAt =
    biometricSnapshot?.collectedAt || caseData.detectedAt || caseData.createdAt;
  // 케이스 문구에 탈착 감지가 있으면 케이스 기반 카드도 실시간 화면과 같은 0 처리 규칙을 따릅니다.
  const watchRemoved = (caseData.detectedAnomalies || []).some((a: any) =>
    // anomaly type보다 설명 문구를 직접 보는 이유는 탈착 문구가 description으로만 내려오는 경우를 함께 잡기 위해서입니다.
    String(a?.description || '').includes('워치 탈착 감지'),
  );

  // 케이스 문서를 관제 카드가 바로 쓰는 Patient 형태로 한 번에 평탄화합니다.
  return {
    // 케이스 id는 상세 모달 조회와 선택 상태 추적의 기본 키로 사용합니다.
    id: caseData._id || caseData.id,
    // 사용자 이름이 비어도 카드 제목이 공란이 되지 않도록 최소 표시명을 둡니다.
    name: user.name || '알 수 없음',
    // 사용자 프로필이 비어도 카드 수치 레이아웃은 유지하려고 숫자 기본값을 둡니다.
    // 나이는 목록 보조 정보라 0으로 내려도 정렬/렌더링 구조가 깨지지 않습니다.
    age: user.age || 0,
    // 생년월일이 비어도 프로필 섹션 날짜 포맷이 깨지지 않게 기본 문자열을 둡니다.
    birthDate: user.birthDate || '1900-01-01',
    // 혈액형과 성별도 케이스 카드 기본 프로필 칸을 비우지 않도록 최소 기본값을 둡니다.
    bloodType: user.bloodType || 'O+',
    // 회원/보호자 연락처는 관제 상세 우측 패널과 바로 연결할 수 있게 프로필 단계에서 평탄화합니다.
    phone: user.phone || '',
    guardianName: user.emergencyContact?.name || '',
    guardianPhone: user.emergencyContact?.phone || '',
    guardianRelationship: user.emergencyContact?.relationship || '',
    // 현재는 사용자 프로필 이미지가 없어서 id 기반 아바타 URL로 카드 식별성만 유지합니다.
    imageUrl: `https://i.pravatar.cc/150?u=${caseData._id || caseData.id}`,
    // 성별도 카드 프로필 배지 형식에 맞춰 M/F/O 코드로 정규화합니다.
    // 미확인 성별은 O로 유지해 실제 남성으로 오해되지 않게 합니다.
    gender: user.gender === 'male' ? 'M' : user.gender === 'female' ? 'F' : 'O',
    // 위에서 계산한 응급 단계 상태를 카드 상태 배지에 그대로 연결합니다.
    // 상태 배지는 목록 색상과 상세 헤더 강조에 같은 값을 재사용합니다.
    status,
    // 주소가 없을 때는 실제 숫자 좌표가 있는 경우에만 좌표 문자열을 보여 줍니다.
    location:
      loc.address ||
      (typeof loc.lat === 'number' && typeof loc.lng === 'number'
        ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`
        : '위치 미확인'),
    // 좌표가 비어 있으면 서울 기본점 대신 NaN으로 내려 지도에 가짜 위치가 생기지 않게 합니다.
    lat: typeof loc.lat === 'number' && Number.isFinite(loc.lat) ? loc.lat : Number.NaN,
    // 경도도 같은 기준으로 처리해 위도/경도가 동시에 유효할 때만 지도 마커가 생성되게 합니다.
    lng: typeof loc.lng === 'number' && Number.isFinite(loc.lng) ? loc.lng : Number.NaN,
    vitals: {
      // 탈착이 아니면 baseline 또는 anomaly 추출값을 카드 초기 심박으로 사용합니다.
      // 탈착이 감지되면 케이스 카드도 실시간 카드와 같은 0 처리 규칙으로 심박 잔상을 지웁니다.
      heartRate:
        watchRemoved
          ? 0
          : typeof snapshotHeartRate === 'number'
            ? snapshotHeartRate
            : typeof baselineHr === 'number'
              ? baselineHr
              : undefined,
      // 케이스 문서에는 표준 혈압 필드가 없어 카드 레이아웃 유지를 위해 placeholder를 둡니다.
      // 현재 케이스 경로는 혈압 비교보다 사건 요약이 우선이라 임시 고정값만 유지합니다.
      bloodPressure: '120/80',
      // 케이스 스냅샷 값이 있으면 monitored-users가 비어도 카드/상세가 즉시 실제 수치를 보여 줍니다.
      oxygenLevel: watchRemoved ? 0 : snapshotSpO2,
      // 체온도 같은 기준으로 케이스 스냅샷을 우선 노출합니다.
      bodyTemp: watchRemoved ? 0 : snapshotBodyTemp,
      // 케이스 문서에는 대개 발생 시각만 있으므로 바이탈 갱신 시각도 같은 detectedAt/createAt 축을 재사용합니다.
      lastUpdated: new Date(caseVitalsUpdatedAt).toISOString(),
      // 케이스 카드에는 과거 시계열이 없어 빈 배열로 두고, 차트는 별도 API에서 채웁니다.
      history: [],
      // ECG는 현재 실연동 전이라 카드 표현 일관성을 위해 기본 문자열만 유지합니다.
    // 화면 컴포넌트가 문자열 배지를 기대해 undefined 대신 placeholder를 유지합니다.
      ecgPattern: 'Normal',
      // 이상 징후 배열에서 fall type 유무만 빠르게 읽어 낙상 배지를 켭니다.
      fallDetected: caseData.detectedAnomalies?.some((a: any) => a.type === 'fall'),
      // movement 설명에 '낙상' 문구가 있으면 급정지 문맥으로, 아니면 일반 휴식 문맥으로 단순화합니다.
      activityContext: caseData.detectedAnomalies?.find((a: any) => a.type === 'movement')?.description?.includes('낙상') ? 'Sudden Stop' : 'Resting',
      // 낙상/응급 점수는 케이스 생성 시점 평가값을 상세 패널에서 그대로 보여 주기 위해 유지합니다.
      fallScore: typeof caseData.fallScore === 'number' ? caseData.fallScore : undefined,
      // 응급 점수도 케이스 우선순위 판단 근거를 잃지 않도록 원값 그대로 남깁니다.
      emergencyScore: typeof caseData.emergencyScore === 'number' ? caseData.emergencyScore : undefined,
      // 사용자 응답 여부와 낙상 feature 원문도 케이스 상세 근거 정보로 그대로 유지합니다.
      responseState: typeof caseData.responseState === 'string' ? caseData.responseState : 'unknown',
      // fallFeatures는 낙상 판단 세부 feature를 디버깅/상세 근거에 그대로 보여 주기 위해 보존합니다.
      fallFeatures: caseData.fallFeatures || undefined,
    },
    // 이상 징후 설명은 별도 가공 없이 그대로 넘겨 상세 카드의 증상 목록 근거로 재사용합니다.
    symptoms: caseData.detectedAnomalies?.map((a: any) => a.description) || [],
    // LLM 분석 본문과 모델명은 케이스 상세 패널에서 원문 근거를 보여 줄 때 그대로 사용합니다.
    // 분석 본문이 없으면 null을 유지해 상세 패널이 "분석 없음" 분기를 명확히 처리하게 합니다.
    aiAnalysis: caseData.llmAnalysis?.analysisText || null,
    // 케이스 분석 모델명도 남겨 두면 나중에 분석 결과 비교나 디버깅 근거로 활용할 수 있습니다.
    llmModel: caseData.llmAnalysis?.model || null,
    // 병원 객체가 populate 여부에 따라 id 객체/문자열이 달라질 수 있어 둘 다 수용합니다.
    // 추천 병원 상세 이동은 최종 id 하나만 필요하므로 여기서 미리 평탄화합니다.
    recommendedHospitalId: caseData.hospital?.hospitalId?._id || caseData.hospital?.hospitalId,
    // 케이스 문서 단계에는 아직 구조사 연결이 없을 수 있어 차량/대원 id는 비워 둡니다.
    // 실제 배차가 붙기 전까지는 undefined를 유지해 "미배정" 상태를 명확히 표현합니다.
    matchedAmbulanceId: undefined,
    // 케이스 응급도 원값은 목록 정렬과 우선순위 배지 계산에 그대로 재사용합니다.
    // 변환 단계에서 재매핑하지 않고 원숫자를 남겨 화면별 임계값 기준을 공통으로 쓰게 합니다.
    severityScore: caseData.emergencyLevel,
  };
}

/**
 * 모니터링 사용자 응답을 관제 화면의 Patient 모델로 정규화합니다.
 * 위치 출처, 착용 상태, 최신 생체값을 화면 표시 규칙에 맞게 한 번에 정리합니다.
 */
export function transformMonitoredUserToPatient(userData: any): Patient {
  // 모니터링 응답 전체가 비는 경우에도 카드 생성 로직이 깨지지 않게 기본 객체를 둡니다.
  // 이후 필드는 모두 이 축에서 읽어 optional chain 분기를 최소화합니다.
  const u = userData || {};
  // 최신 생체 1건은 카드의 현재 수치와 상태 계산의 기준 스냅샷으로 사용합니다.
  const latest = u.latestBiometric || {};
  // LLM/분석 결과가 아직 없을 수 있어 분석 객체는 빈 값으로 안전하게 시작합니다.
  const analysis = latest.analysis || {};
  // 최신 생체 좌표와 장비 마지막 좌표 중 실제로 더 최신인 쪽을 대표 위치로 선택합니다.
  // 생체 문서에 예전 좌표가 남아 있어도 폰 위치 업로드가 더 늦게 들어왔으면 그 좌표를 우선해야 현재 위치가 맞습니다.
  const latestLocation = latest.location || {};
  const latestLocationMeta = latest.rawData?.locationMeta || {};
  const wearableLastLocation = u?.wearableDevice?.lastKnownLocation || {};
  const latestLocationUpdatedMs = resolveLocationUpdatedMs(
    latestLocationMeta,
    latestLocation,
    latest.collectedAt,
  );
  const wearableLocationUpdatedMs = resolveLocationUpdatedMs(
    undefined,
    wearableLastLocation,
    wearableLastLocation?.updatedAt,
  );
  const wearableLocationMeta =
    wearableLastLocation && typeof wearableLastLocation === 'object'
      ? {
          source:
            typeof wearableLastLocation?.source === 'string'
              ? wearableLastLocation.source
              : undefined,
          provider:
            typeof wearableLastLocation?.provider === 'string'
              ? wearableLastLocation.provider
              : undefined,
          timestamp:
            wearableLastLocation?.updatedAt instanceof Date
              ? wearableLastLocation.updatedAt.toISOString()
              : typeof wearableLastLocation?.updatedAt === 'string'
                ? wearableLastLocation.updatedAt
                : undefined,
          ageMs:
            wearableLocationUpdatedMs > 0
              ? Math.max(0, Date.now() - wearableLocationUpdatedMs)
              : undefined,
        }
      : {};
  const useWearableLastLocation =
    hasRenderableGps(wearableLastLocation, wearableLocationMeta) &&
    (!hasRenderableGps(latestLocation, latestLocationMeta) || wearableLocationUpdatedMs > latestLocationUpdatedMs);
  const loc = useWearableLastLocation
    ? wearableLastLocation
    : latestLocation || wearableLastLocation || {};
  // rawData는 위치 메타, 거리, 혈압 원문 같은 부가 센서 필드를 읽기 위한 원본 컨테이너입니다.
  const raw = latest.rawData || {};
  // 위치 메타는 source/provider/age 같은 신뢰도 보조 정보를 꺼내기 위한 축약 참조입니다.
  const locationMeta = useWearableLastLocation ? wearableLocationMeta : raw?.locationMeta || {};

  // raw 착용 플래그와 심박 실측값을 함께 보고 화면용 착용 여부를 한 번 더 보정합니다.
  // raw 값이 boolean일 때만 인정해 문자열/숫자 오염값이 착용 판정에 섞이지 않게 합니다.
  const rawIsWear = typeof raw?.isWear === 'boolean' ? raw.isWear : undefined;
  // 심박도 숫자 형태일 때만 착용 보정 판단의 보조 근거로 사용합니다.
  const rawHr = typeof latest.heartRate === 'number' ? latest.heartRate : undefined;
  // 탈착 플래그가 내려오면 이전 심박 잔상보다 센서 상태를 우선해 그대로 반영합니다.
  const inferredIsWear = rawIsWear;
  // 서울 기본 좌표와 IP 대략 위치는 제외하고, 실내 Wi-Fi/폰 좌표만 지도 표시용으로 유지합니다.
  const hasValidGps =
    typeof loc.lat === 'number' &&
    typeof loc.lng === 'number' &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng) &&
    !isDefaultGpsFallback(loc.lat, loc.lng) &&
    !(
      (typeof locationMeta?.source === 'string' &&
        locationMeta.source.trim().toLowerCase() === 'ip_position') ||
      (typeof locationMeta?.provider === 'string' &&
        ['ipwho.is', 'ipapi.co', 'ipinfo.io'].includes(locationMeta.provider.trim().toLowerCase()))
    );
  // 유효 좌표일 때만 숫자를 유지하고, 아니면 NaN으로 내려 지도 레이어가 명확히 걸러내게 합니다.
  const lat = hasValidGps ? loc.lat : Number.NaN;
  // 경도도 같은 기준을 적용해 위도만 남는 반쪽 좌표 상태를 만들지 않습니다.
  const lng = hasValidGps ? loc.lng : Number.NaN;
  // 위치 출처는 백엔드 source 코드를 관제 화면용 한글 라벨로 변환합니다.
  const locationSource = toLocationSourceLabel(
    typeof locationMeta?.source === 'string'
      ? locationMeta.source
      : typeof u?.wearableDevice?.lastKnownLocation?.source === 'string'
        // 최신 생체 source가 비어도 장비 마지막 위치 출처는 화면 신뢰도 문구에 계속 활용합니다.
        ? u.wearableDevice.lastKnownLocation.source
        : undefined,
  );
  // provider는 공백 문자열을 제거한 뒤 값이 있을 때만 보조 출처 텍스트로 유지합니다.
  const locationProvider =
    typeof locationMeta?.provider === 'string' && locationMeta.provider.trim()
      ? locationMeta.provider.trim()
      : undefined;
  // source와 별개로 provider 문자열도 보존해 GPS/Wi-Fi/기지국 세부 출처를 상세 패널에 남깁니다.
  // timestamp는 locationMeta 우선, 없으면 실제 loc timestamp로 이어받아 위치 갱신 시각을 최대한 살립니다.
  const locationUpdatedAt =
    locationMeta?.timestamp instanceof Date
      ? locationMeta.timestamp.toISOString()
      : typeof locationMeta?.timestamp === 'string'
        ? locationMeta.timestamp
        : typeof loc?.timestamp === 'string'
          ? loc.timestamp
          : loc?.timestamp instanceof Date
            ? loc.timestamp.toISOString()
            : typeof loc?.updatedAt === 'string'
              ? loc.updatedAt
              : loc?.updatedAt instanceof Date
                ? loc.updatedAt.toISOString()
            : undefined;
  // 위치 메타 timestamp가 없으면 실제 위치 객체 timestamp라도 이어받아 관제 화면의 최신 시각 칸을 최대한 채웁니다.
  // ageMs는 숫자로 확정된 경우만 유지해 freshness 배지가 NaN/문자열에 흔들리지 않게 합니다.
  const locationAgeMs =
    typeof locationMeta?.ageMs === 'number' && Number.isFinite(locationMeta.ageMs)
      ? locationMeta.ageMs
      : undefined;
  // collectedAt은 문자열/Date 어느 형태로 와도 stale 판정에 쓰기 쉽게 epoch ms로 통일합니다.
  const collectedAtMs =
    typeof latest.collectedAt === 'string' || latest.collectedAt instanceof Date
      ? new Date(latest.collectedAt).getTime()
      : 0;
  // 마지막 sync 시각도 epoch ms로 맞춰 수집 시각과 같은 stale 비교식에 재사용합니다.
  const lastSyncAtMs =
    typeof u?.wearableDevice?.lastSyncAt === 'string' || u?.wearableDevice?.lastSyncAt instanceof Date
      ? new Date(u.wearableDevice.lastSyncAt).getTime()
      : 0;
  // 실제 생체 수집이 없을 때 현재 시각을 넣으면 미수집 사용자가 가장 최신처럼 정렬될 수 있습니다.
  // 따라서 마지막 갱신 시각은 수집 시각 우선, 없으면 장비 마지막 sync 시각으로만 보정합니다.
  const lastUpdatedMs = collectedAtMs > 0 ? collectedAtMs : lastSyncAtMs;
  const lastUpdated =
    lastUpdatedMs > 0
      ? new Date(lastUpdatedMs).toISOString()
      : new Date(0).toISOString();
  // 백엔드 장비 연결 상태 문자열도 소문자로 통일해 connected 비교를 단순화합니다.
  const connStatus = String(u?.wearableDevice?.connectionStatus || '').toLowerCase();
  // 비교 기준 시각은 한 번만 계산해 수집/동기화 stale 판정을 같은 기준으로 맞춥니다.
  const nowMs = Date.now();
  // 연결 상태 문자열과 최근 수집/동기화 시각을 함께 보고 사실상 끊긴 장비를 판별합니다.
  const isDisconnected =
    (connStatus && connStatus !== 'connected') ||
    // 모바일 업로드 간격보다 조금 넓게 잡아야 업로드 사이 구간에서 "미수집"으로 흔들리지 않습니다.
    (collectedAtMs > 0 && nowMs - collectedAtMs > CONTROL_STALE_THRESHOLD_MS) ||
    // 마지막 sync 시각도 오래됐으면 연결 상태 문자열이 살아 있어도 stale 장비로 봅니다.
    (lastSyncAtMs > 0 && nowMs - lastSyncAtMs > CONTROL_STALE_THRESHOLD_MS);

  // 화면용 탈착 판정은 보정된 inferredIsWear 결과를 최종 기준으로 사용합니다.
  // 최종 boolean 판정을 하나로 모아 아래 심박/SpO2/체온 0 처리 규칙을 공통 적용합니다.
  const watchRemoved = inferredIsWear === false;

  // 워치 탈착이 명확한 경우에는 이전 정상값 잔상을 남기지 않도록 핵심 생체값을 즉시 0으로 고정합니다.
  const hr =
    watchRemoved
      ? 0
      : typeof latest.heartRate === 'number' && Number.isFinite(latest.heartRate) && latest.heartRate > 0
        ? latest.heartRate
        : undefined;
  // 산소포화도도 동일 규칙을 써서 탈착 이후 오래된 측정치가 위험 신호처럼 남지 않게 합니다.
  const spo2 =
    watchRemoved
      ? 0
      : typeof latest.spO2 === 'number' && Number.isFinite(latest.spO2) && latest.spO2 > 0
        ? latest.spO2
        : undefined;
  // 체온 역시 탈착 시 0으로 정리해 손목 이탈 뒤 남아 있는 마지막 값을 숨깁니다.
  const temp =
    watchRemoved
      ? 0
      : typeof latest.bodyTemperature === 'number' &&
          Number.isFinite(latest.bodyTemperature) &&
          latest.bodyTemperature > 0
        ? latest.bodyTemperature
        : undefined;
  // 스트레스도 탈착이면 0으로 맞춰 마지막 측정 잔상이 남지 않게 합니다.
  const stressLevel = watchRemoved ? 0 : typeof latest.stressLevel === 'number' ? latest.stressLevel : undefined;
  // AI 분석 본문은 문자열 결과만 받아 상세 패널 요약 문구로 그대로 재사용합니다.
  // 분석 결과가 문자열이 아닐 때는 null로 비워 화면이 "분석 없음" 상태를 일관되게 처리하게 합니다.
  const aiText = typeof analysis.analysisResult === 'string' ? analysis.analysisResult : null;
  // 분석 응급도 원값도 따로 보존해 상태 변환과 우선순위 계산에 함께 씁니다.
  // 숫자 응급도는 status 배지와 별도로 정렬/임계값 계산에 다시 쓰기 위해 남겨 둡니다.
  const analysisEmergencyLevel =
    typeof analysis?.emergencyLevel === 'number' && Number.isFinite(analysis.emergencyLevel)
      ? analysis.emergencyLevel
      : undefined;
  // 응급도 숫자를 PatientStatus로 바꿔 목록/카드 색상 규칙과 재사용합니다.
  const analysisStatus = mapEmergencyLevelToPatientStatus(analysisEmergencyLevel);
  // 연결이 끊긴 센서는 오래된 값 오해를 막기 위해 일부 실시간 지표를 비워서 표시합니다.
  // 걸음 수는 stale 장비면 0으로 내려 활동량이 현재도 누적 중인 것처럼 보이지 않게 합니다.
  const steps = isDisconnected ? 0 : typeof latest.steps === 'number' ? latest.steps : undefined;
  // 이동거리는 raw distance를 그대로 쓰되 stale 시점에는 활동량 요약을 0으로 정리합니다.
  const distanceM = isDisconnected ? 0 : typeof raw.distance === 'number' ? raw.distance : undefined;
  // 배터리는 끊긴 장비의 마지막 잔량을 현재 값처럼 보이지 않게 하려고 undefined로 숨깁니다.
  const batteryLevel = isDisconnected ? undefined : typeof latest.batteryLevel === 'number' ? latest.batteryLevel : undefined;
  // 움직임 원시 센서도 stale 장비에서는 숨겨 마지막 순간 스냅샷이 실시간처럼 보이지 않게 합니다.
  const acceleration = isDisconnected ? undefined : latest.acceleration;
  // 자이로도 같은 기준을 적용해 회전/자세 변화 원시값이 stale 상태로 남지 않게 합니다.
  const gyroscope = isDisconnected ? undefined : latest.gyroscope;
  // 기압 센서값도 연결이 살아 있을 때만 유지해 오래된 환경값 오인을 줄입니다.
  // 현재 화면은 존재 여부만 참고하므로 stale 시에는 과감히 숨기는 편이 안전합니다.
  const barometer = isDisconnected ? undefined : latest.barometer;
  // 자동 혈압 수치는 수동 fallback보다 먼저 확인할 수 있게 상단에서 분리해 읽습니다.
  // 수축기 값이 숫자일 때만 혈압 문자열 조합의 첫 절반으로 인정합니다.
  const bpSys = typeof latest.bloodPressure?.systolic === 'number' ? latest.bloodPressure.systolic : undefined;
  // 이완기도 별도 숫자 검사를 거쳐 문자열 조합 전에 정상 혈압 쌍인지 판단합니다.
  const bpDia = typeof latest.bloodPressure?.diastolic === 'number' ? latest.bloodPressure.diastolic : undefined;
  // 자동 수집 혈압이 비어 있는 계열을 대비해 기기 설정의 수동 혈압 입력도 함께 읽어 둡니다.
  const manualBpSys =
    typeof u?.wearableDevice?.manualBloodPressure?.systolic === 'number'
      ? u.wearableDevice.manualBloodPressure.systolic
      : undefined;
  // 이완기 수치도 함께 읽어 수동 혈압 fallback을 완전한 "수축기/이완기" 쌍으로 표시합니다.
  const manualBpDia =
    typeof u?.wearableDevice?.manualBloodPressure?.diastolic === 'number'
      ? u.wearableDevice.manualBloodPressure.diastolic
      : undefined;
  // 혈압은 실측값이 없으면 raw 원문, 그다음 사용자 수동 입력 순서로 화면 표기를 보정합니다.
  const bpText =
    isDisconnected
      // 연결이 끊긴 뒤에는 마지막 자동 측정보다 사용자가 저장한 수동 혈압을 우선 보여 주고, 없으면 0/0으로 정리합니다.
      ? typeof manualBpSys === 'number' && typeof manualBpDia === 'number'
        ? `${manualBpSys}/${manualBpDia}`
        : '0/0'
      : typeof bpSys === 'number' && typeof bpDia === 'number'
      ? `${bpSys}/${bpDia}`
      : typeof raw.bloodPressureSys === 'number' && typeof raw.bloodPressureDia === 'number'
        ? `${raw.bloodPressureSys}/${raw.bloodPressureDia}`
        : typeof manualBpSys === 'number' && typeof manualBpDia === 'number'
          ? `${manualBpSys}/${manualBpDia}`
        : '0/0';
  // 최종 문자열 하나로 정리해 카드/상세/목록이 같은 혈압 포맷 함수를 재사용하게 합니다.

  // 모니터링 API 응답은 최신 생체 1건과 사용자 문서를 합쳐 화면용 Patient 모델로 정리합니다.
  return {
    // 케이스 문서 id와 충돌하지 않게 모니터링 사용자 카드는 user: 접두사를 붙여 구분합니다.
    // 모든 id가 비는 예외 응답에서도 리스트 key 충돌을 피하려고 마지막에는 랜덤 문자열을 사용합니다.
    id: `user:${u._id || u.id || u.wearableDevice?.deviceId || Math.random().toString(36).slice(2)}`,
    // 이름이 비어도 목록 카드 제목이 유지되도록 모니터링 전용 기본 표시명을 둡니다.
    name: u.name || '모니터링 사용자',
    // 프로필 정보가 비어도 카드 레이아웃이 흔들리지 않도록 기본값을 맞춰 둡니다.
    // 나이 칸은 숫자 렌더를 기대하므로 undefined 대신 0이 더 안정적입니다.
    age: u.age || 0,
    // 모니터링 카드도 동일한 날짜 포맷을 유지하려고 기본 생년월일 문자열을 둡니다.
    birthDate: u.birthDate || '1900-01-01',
    // 혈액형 미확인 상태도 문자열 기본값으로 맞춰 상세 프로필 행을 안정적으로 렌더합니다.
    bloodType: u.bloodType || 'Unknown',
    // 모니터링 사용자도 별도 프로필 이미지가 없으므로 id 기반 아바타를 공통 사용합니다.
    imageUrl: `https://i.pravatar.cc/150?u=${u._id || u.id || u.wearableDevice?.deviceId || Math.random()}`,
    // 상세 패널의 회원/보호자 연락 영역에서 바로 쓸 수 있게 연락처를 평탄화합니다.
    phone: u.phone || '',
    guardianName: u.emergencyContact?.name || '',
    guardianPhone: u.emergencyContact?.phone || '',
    guardianRelationship: u.emergencyContact?.relationship || '',
    // 성별도 카드의 기본 프로필 배지 형식(M/F/O)에 맞춰 단문 코드로 정리합니다.
    // 미확인 성별은 O로 보내 상세 프로필이 임의의 M/F로 오해되지 않게 합니다.
    gender: u.gender === 'male' ? 'M' : u.gender === 'female' ? 'F' : 'O',
    // 워치 탈착은 실제 응급과 분리해 주의 상태로 별도 표시하고, 그 외에는 AI 분석 상태를 그대로 따릅니다.
    status:
      watchRemoved
        // 탈착은 재착용 확인이 우선인 운영 상태라 응급 분류 대신 주의 단계에 매핑합니다.
        ? PatientStatus.CAUTION
        : analysisStatus !== PatientStatus.NORMAL
          // 분석 결과가 이미 경고 단계면 해당 상태를 그대로 배지에 반영합니다.
          ? analysisStatus
          : PatientStatus.NORMAL,
    // 실좌표가 확인되기 전에는 잘못된 기본점을 노출하지 않고 안내 문구만 보여 줍니다.
    // 좌표 문자열은 지도용 원값과 별개로 목록 카드의 간단한 위치 표시에만 사용합니다.
    location: hasValidGps ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'GPS 확인중',
    // 위치 출처/세부 공급자/시각은 관제 화면의 위치 신뢰도 문구에 그대로 연결됩니다.
    locationSource,
    // provider는 source보다 더 세밀한 출처 표시에만 쓰므로 값이 있을 때만 유지합니다.
    locationProvider,
    // 갱신 시각은 위치 출처 문구 옆의 freshness 판단 텍스트와 함께 표시됩니다.
    locationUpdatedAt,
    // ageMs는 위치 freshness 표시나 오래된 좌표 경고 배지 계산에 그대로 재사용합니다.
    locationAgeMs,
    // 실좌표가 없으면 NaN을 유지해 지도 쪽에서 유효 위치 여부를 명확히 판별하게 합니다.
    lat,
    // 경도도 NaN을 유지해 지도 로직이 기본 좌표 오인을 하지 않게 합니다.
    lng,
    // 걸음/이동거리는 목록 카드의 활동량 요약 수치로 바로 사용합니다.
    steps,
    // 이동거리는 걸음 수와 함께 활동 추세를 보는 보조 수치라 별도 가공 없이 전달합니다.
    distanceM,
    // 배터리는 관제 목록에서 기기 상태를 빠르게 파악하는 보조 지표라 원값을 그대로 둡니다.
    // 연결 중일 때만 남겨 현재 장비 상태 배지와 함께 해석되게 합니다.
    batteryLevel,
    // 고빈도 센서값은 연결이 살아 있을 때만 유지해 오래된 원시 센서 스냅샷 오해를 줄입니다.
    // 가속도/자이로는 실시간 움직임 보조 패널이나 디버깅 표시에서 원본 축 데이터를 그대로 사용합니다.
    acceleration,
    // 회전 변화도 별도 가공 없이 유지해 자세 변화 분석/디버깅에 같은 raw 축 구조를 씁니다.
    gyroscope,
    // 기압계도 고도/환경 변화 보조 판단용이라 연결 중일 때만 최신 raw 값을 노출합니다.
    barometer,
    vitals: {
      // 위에서 정리한 핵심 실시간 바이탈 값을 Patient.vitals 하위 구조로 다시 묶어 전달합니다.
      heartRate: hr,
      // 혈압도 문자열 형태로 맞춰 카드/상세가 같은 표시 포맷을 재사용하게 합니다.
      bloodPressure: bpText,
      // 산소포화도는 탈착/미측정 정리가 끝난 최종 값만 남겨 상세 패널이 그대로 표시하게 합니다.
      oxygenLevel: spo2,
      // 체온도 상단에서 정리한 0/undefined 규칙을 그대로 이어 받아 중복 판정을 줄입니다.
      bodyTemp: temp,
      // 마지막 갱신 시각은 카드와 상세 패널이 같은 상대시각 기준을 쓰도록 공통 전달합니다.
      lastUpdated,
      // 실시간 모니터링 카드에서는 별도 시계열 API를 쓰므로 여기 history는 비워 둡니다.
      history: [],
      // ECG 실측 연동 전이라 모니터링 카드도 동일한 placeholder를 유지합니다.
      ecgPattern: 'Normal',
      // 착용 판정 결과를 그대로 넘겨 카드/리스트에서 탈착 상태를 같은 기준으로 해석하게 합니다.
      // vitals 하위에도 남겨 두어 상세 패널이 상위 status와 별개로 착용 여부를 직접 읽을 수 있습니다.
      isWear: inferredIsWear,
      // 스트레스/낙상/응급 점수는 상세 패널의 보조 판단 지표로 원본 숫자를 그대로 유지합니다.
      stressLevel,
      // 현재 낙상 점수도 카드 우선순위나 상세 판단 보조치로 바로 재사용합니다.
      fallScore: typeof latest.fallScore === 'number' ? latest.fallScore : undefined,
      // recentFallPeakScore는 최근 구간 최대 낙상 점수를 상세 패널에서 별도 참고값으로 씁니다.
      recentFallPeakScore:
        typeof latest.recentFallPeakScore === 'number' ? latest.recentFallPeakScore : undefined,
      // 현재 응급 점수도 카드 정렬/경고 판단 보조값으로 그대로 전달합니다.
      emergencyScore: typeof latest.emergencyScore === 'number' ? latest.emergencyScore : undefined,
      // responseState는 사용자 응답 여부를 카드 상세 문맥과 후속 워크플로우 판단에 같이 씁니다.
      responseState: typeof latest.responseState === 'string' ? latest.responseState : 'unknown',
      // fallFeatures 원문은 낙상 판단 근거를 상세 패널/디버깅에서 그대로 보존하려고 전달합니다.
      fallFeatures: latest.fallFeatures || undefined,
    },
    // 모니터링 사용자 목록은 증상 문자열보다 실시간 수치 중심이라 기본 증상 배열은 비워 둡니다.
    // 경고 근거는 aiAnalysis와 vitals 수치에서 먼저 읽고, 텍스트 증상은 케이스 경로에 맡깁니다.
    symptoms: [],
    // 분석 요약 본문은 리스트/상세 패널의 AI 코멘트 영역에 그대로 표시합니다.
    aiAnalysis: aiText,
    // 모니터링 경로는 분석 텍스트만 쓰고 모델명은 현재 별도 표기하지 않습니다.
    // 모델명이 아직 없더라도 필드 형태를 유지해 상세 패널 조건 분기를 단순화합니다.
    // null을 고정해 두면 모니터링/케이스 상세가 같은 필드 존재 조건으로 렌더됩니다.
    llmModel: null,
    // 목록 우선순위 배지 계산을 위해 분석 응급도를 숫자 형태로 그대로 유지합니다.
    // 원본 응급도 숫자를 남겨 정렬/필터/색상 기준을 문자열 해석 없이 공통 사용하게 합니다.
    // 값이 없을 때 0으로 내려 우선순위 정렬에서 undefined 비교 예외를 줄입니다.
    severityScore: analysisEmergencyLevel || 0,
  };
}

/**
 * 최신 생체 1건과 히스토리 목록을 관제 Vitals 구조로 변환합니다.
 * 차트/상세 패널에서 바로 쓸 수 있도록 숫자형 생체값과 시계열 표시값을 함께 정리합니다.
 */
export function transformBiometricToVitals(biometric: any, history: any[]): any {
  // 단일 생체 스냅샷과 시계열 히스토리를 같은 vitals 구조로 묶어 상세 패널 연결 비용을 줄입니다.
  return {
    // 현재 카드에는 0/음수 같은 미측정값을 올리지 않고 실제 수집값만 노출합니다.
    // 심박도 양수 실측치만 남겨 센서 미수집/오류값이 정상값처럼 보이지 않게 합니다.
    heartRate: typeof biometric?.heartRate === 'number' && biometric.heartRate > 0 ? biometric.heartRate : undefined,
    // 혈압 실측 필드가 아직 정규화되지 않아 카드에는 고정 문자열 placeholder를 유지합니다.
    // 카드 레이아웃은 혈압 행을 기대하므로 값이 없더라도 문자열 슬롯은 비우지 않습니다.
    bloodPressure: '120/80',
    // 산소포화도도 0/음수는 미측정으로 보고 상세 패널에서 숨깁니다.
    oxygenLevel: typeof biometric?.spO2 === 'number' && biometric.spO2 > 0 ? biometric.spO2 : undefined,
    // 체온도 유효 양수만 남겨 센서 미수집값이 카드에 보이지 않게 합니다.
    bodyTemp:
      typeof biometric?.bodyTemperature === 'number' && biometric.bodyTemperature > 0
        ? biometric.bodyTemperature
        : undefined,
    // 스트레스는 0도 의미 있는 값일 수 있어 양수 제한 없이 숫자면 그대로 통과시킵니다.
    stressLevel: typeof biometric?.stressLevel === 'number' ? biometric.stressLevel : undefined,
    // 수집 시각이 없으면 현재 시각을 써 카드의 "방금 갱신" 표현이 비지 않게 유지합니다.
    // 문자열 원문을 그대로 쓰는 이유는 상위 포맷터가 ISO 시각을 공통 처리하기 때문입니다.
    lastUpdated: biometric?.collectedAt || new Date().toISOString(),
    // 히스토리 차트는 시각 문자열과 핵심 생체값만 추려 가볍게 전달합니다.
    history: history.map((h) => ({
      // 히스토리도 차트 전용 경량 객체로 바꿔 원본 응답의 불필요한 필드 전파를 줄입니다.
      // 차트 라벨은 초 단위까지 보여 줘 급격한 변화 시점을 빠르게 확인하게 합니다.
      time: new Date(h.collectedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      // 히스토리에서도 0/음수는 실제 측정치가 아니라고 보고 차트 포인트에서 제외합니다.
      hr: typeof h?.heartRate === 'number' && h.heartRate > 0 ? h.heartRate : undefined,
      // 산소포화도 차트도 동일하게 유효 양수만 남겨 빈 구간과 미측정을 구분합니다.
      spo2: typeof h?.spO2 === 'number' && h.spO2 > 0 ? h.spO2 : undefined,
    })),
    // 상세 패널도 같은 history 배열을 그대로 써 추가 가공 없이 차트 컴포넌트에 연결합니다.
    // ECG 파형은 아직 별도 분석 연동 전이라 상세 패널 placeholder 문구만 유지합니다.
    ecgPattern: 'Normal',
    // movementStatus는 상세 카드의 낙상/활동 배지 계산에 바로 쓰기 좋은 최소 텍스트로만 단순화합니다.
    // 낙상 여부는 별도 문자열 매핑 없이 boolean 배지 조건으로 바로 쓰려고 여기서 확정합니다.
    fallDetected: biometric?.movementStatus === 'fall_detected',
    // 활동 문맥은 현재 UI가 걷기/휴식 2단계만 쓰므로 복잡한 상태를 여기서 좁혀 둡니다.
    // walking 외의 상태는 일단 Resting으로 묶어 배지 종류가 과도하게 늘지 않게 합니다.
    activityContext: biometric?.movementStatus === 'walking' ? 'Walking' : 'Resting',
    // 낙상/응급 점수는 상세 패널과 우선순위 판단용 보조 수치로 원값을 유지합니다.
    fallScore: typeof biometric?.fallScore === 'number' ? biometric.fallScore : undefined,
    // 응급 점수도 별도 색상/정렬 계산의 입력으로 쓸 수 있게 숫자 원값을 남깁니다.
    emergencyScore: typeof biometric?.emergencyScore === 'number' ? biometric.emergencyScore : undefined,
    // 응답 상태와 낙상 feature 원문도 후속 판단 근거를 위해 가공 없이 넘깁니다.
    // 응답 상태가 없으면 unknown으로 맞춰 상세 패널의 후속 문구 분기를 단순화합니다.
    responseState: typeof biometric?.responseState === 'string' ? biometric.responseState : 'unknown',
    // fallFeatures는 상세 패널에서 낙상 근거를 그대로 읽을 수 있게 원문 구조를 유지합니다.
    fallFeatures: biometric?.fallFeatures || undefined,
  };
}

/**
 * 병원 API 응답을 관제 화면의 Hospital 모델로 변환합니다.
 * 응급실 병상과 위치 정보를 프론트 기본 필드 형태로 맞춰 지도/목록에서 공통 사용합니다.
 */
export function transformHospitalToFrontend(hospital: any): Hospital {
  // 병원 응답도 일부 필드가 비는 경우가 있어 화면이 기대하는 구조로 한 번 정규화합니다.
  // 지도/목록/매칭 패널이 같은 Hospital 타입을 쓰도록 필드를 표준화합니다.
  return {
    // 병원 id는 상세 조회, 매칭 선택, 지도 선택 상태의 공통 키로 사용합니다.
    // 백엔드가 `_id` 또는 `id` 중 어느 쪽을 주더라도 프론트 키는 한 필드로 고정합니다.
    id: hospital._id || hospital.id,
    // 병원명은 카드 제목과 지도 툴팁에 공통으로 쓰이는 대표 라벨입니다.
    // 이름이 비어도 병원 카드의 헤더와 선택 상태 라벨이 공란이 되지 않게 합니다.
    name: hospital.name || '알 수 없음',
    // 주소가 없으면 좌표 문자열이라도 남겨 목록/상세 패널의 위치 칸을 비우지 않게 합니다.
    location: hospital.location?.address || `${hospital.location?.lat}, ${hospital.location?.lng}`,
    // 좌표가 비어 있으면 가짜 중심 좌표 대신 NaN으로 내려 마커가 생성되지 않게 합니다.
    lat:
      typeof hospital.location?.lat === 'number' && Number.isFinite(hospital.location.lat)
        ? hospital.location.lat
        : Number.NaN,
    // 경도도 같은 기준으로 비워 실제 좌표가 있을 때만 병원 마커가 그려지게 맞춥니다.
    lng:
      typeof hospital.location?.lng === 'number' && Number.isFinite(hospital.location.lng)
        ? hospital.location.lng
        : Number.NaN,
    // 병상 수는 undefined 대신 0으로 정규화해 병원 목록 정렬/배지를 단순하게 유지합니다.
    // 상단 카드의 대표 가용 병상 수치도 이 값을 그대로 사용합니다.
    availableBeds: hospital.emergencyRoom?.availableBeds || 0,
    // 전체 병상 수도 함께 0 정규화해 가용/전체 비율 계산식이 단순해지게 합니다.
    // 상세 패널의 총 병상 수치도 동일 필드를 그대로 참조합니다.
    totalBeds: hospital.emergencyRoom?.totalBeds || 0,
    icuBeds: {
      // 병원 상세 패널은 중환자실 가용/전체 수를 항상 숫자로 기대합니다.
      available: hospital.emergencyRoom?.icuBeds?.available || 0,
      // total도 0 정규화해 병상 비율 계산 시 undefined 분기를 줄입니다.
      // ICU 섹션은 병원 비교표에서도 그대로 재사용하므로 중첩 객체 형태를 유지합니다.
      total: hospital.emergencyRoom?.icuBeds?.total || 0,
    },
    erBeds: {
      // 응급실 병상은 상단 요약 수치와 같은 소스를 재사용해 표시를 맞춥니다.
      available: hospital.emergencyRoom?.availableBeds || 0,
      // total도 같은 원본을 재사용해 가용/전체 표시 기준이 어긋나지 않게 합니다.
      // 현재 화면에서는 응급실 총 병상과 totalBeds를 사실상 같은 의미로 사용합니다.
      total: hospital.emergencyRoom?.totalBeds || 0,
    },
    operatingRooms: {
      // 수술실 정보도 비어 있으면 0으로 맞춰 병원 비교표의 빈칸을 없앱니다.
      available: hospital.emergencyRoom?.operatingRooms?.available || 0,
      // 전체 수술실 수도 같은 방식으로 숫자화해 표/배지 계산식을 단순화합니다.
      // 수술 가능 비율 계산도 이 total 값을 그대로 재사용합니다.
      total: hospital.emergencyRoom?.operatingRooms?.total || 0,
    },
    // 전문과가 비어도 배열 형태는 유지해 병원 상세 패널의 반복 렌더를 단순화합니다.
    // 배열 기본값을 유지하면 전문과 태그 목록이 null 체크 없이 바로 렌더됩니다.
    specialties: hospital.specialties || [],
    // 수술 가능 항목은 아직 백엔드 표준 필드가 없어 빈 배열 placeholder를 유지합니다.
    // 배열 형태를 미리 맞춰 두면 수술 가능 항목 UI가 null 체크 없이 반복 렌더를 유지할 수 있습니다.
    surgicalCapabilities: [],
    // 혈액 재고도 아직 실연동 전이라 카드 배지용 기본 문구만 유지합니다.
    // 추후 실데이터가 들어와도 동일 위치의 배지 텍스트만 교체하면 되도록 문자열 타입을 유지합니다.
    // 기본 문구를 남겨 두면 병원 상세 카드의 재고 배지 영역이 비지 않습니다.
    bloodSupply: 'Normal',
    // 거리 계산은 상위 지도/매칭 로직이 다시 채우므로 여기서는 타입용 기본 문자열만 둡니다.
    // 문자열 형태를 먼저 맞춰 두면 목록/카드가 공통 포맷터 없이 그대로 표시할 수 있습니다.
    // 초기 렌더 단계에서 공란 대신 기본 거리 문구를 보여 주려는 목적도 있습니다.
    distance: '0 km',
    // 응급실 상태는 명시적으로 false가 아닌 한 운영 중으로 간주해 기존 병원 데이터를 최대한 살립니다.
    // 운영 여부 기본값을 true 쪽으로 두어 기존 병원 데이터 누락 시 목록 탈락을 줄입니다.
    isEROpen: hospital.emergencyRoom?.isOpen !== false,
    // 외상센터 등급 필드가 없을 때도 지도 필터가 깨지지 않게 기본 단계를 둡니다.
    // 실제 등급 데이터가 아직 없어도 지도 필터/배지의 숫자 비교 로직은 유지하려고 1을 둡니다.
    // 기본 등급을 남겨 두면 trauma 필터 UI가 undefined 분기 없이 일관되게 동작합니다.
    // 현재는 실등급보다 "필터가 동작하는 구조 유지"를 우선하는 placeholder 성격입니다.
    activeTraumaLevel: 1,
  };
}

/**
 * 구급대원/출동 리소스 응답을 지도 마커용 Ambulance 모델로 변환합니다.
 * 백엔드 상태 문자열을 프론트 enum으로 맞추고 현재 좌표를 기본 구조에 채웁니다.
 */
export function transformParamedicToAmbulance(paramedic: any): Ambulance {
  // 현재 위치가 누락된 응답도 있어 먼저 빈 객체로 받아 좌표 기본값 처리와 결합합니다.
  // loc를 한 번 분리해 두면 아래 lat/lng 기본값 처리에서 optional chain을 반복하지 않아도 됩니다.
  const loc = paramedic.currentLocation || {};
  // 구조사/출동 리소스 응답을 프론트 지도 마커용 Ambulance 구조로 맞춥니다.
  return {
    // 대원/차량 응답 id는 지도 선택과 출동 대상 연결에 쓰이는 기본 키입니다.
    // 지도 마커 key와 선택 상태 비교도 이 id를 공통으로 사용합니다.
    // `_id`와 `id`를 함께 받아 응답 형태 차이에도 프론트 키를 한 필드로 통일합니다.
    id: paramedic._id || paramedic.id,
    // 지도 라벨은 차량번호보다 현장 식별이 쉬운 대원/유닛 이름을 우선 사용합니다.
    // 이름이 비어도 마커 라벨이 공란이 되지 않도록 기본 문자열을 둡니다.
    unitName: paramedic.name || '알 수 없음',
    // 현재 좌표가 비어 있으면 가짜 좌표 대신 NaN을 내려 마커가 생기지 않게 합니다.
    lat: typeof loc.lat === 'number' && Number.isFinite(loc.lat) ? loc.lat : Number.NaN,
    // 경도도 같은 기준으로 처리해 실좌표가 있는 리소스만 지도에 보이게 합니다.
    lng: typeof loc.lng === 'number' && Number.isFinite(loc.lng) ? loc.lng : Number.NaN,
    status:
      // 백엔드 상태 문자열을 프론트 지도 색상/배지 enum으로 바로 치환합니다.
      // available은 즉시 배차 가능한 리소스로 보고 초록 계열 상태에 연결합니다.
      paramedic.status === 'available'
        ? AmbulanceStatus.AVAILABLE
        : paramedic.status === 'busy'
        // busy는 이미 임무 중인 차량으로 보고 점유 상태 배지에 바로 연결합니다.
        ? AmbulanceStatus.BUSY
        // 그 외 상태는 출동/현장 대응 흐름으로 보고 일단 DISPATCHED로 묶어 지도 색상 규칙을 유지합니다.
        // 예외 문자열도 dispatch 계열로 묶어 마커 색상 체계를 무분별하게 늘리지 않습니다.
        // 프론트 enum 종류를 늘리지 않아야 지도 범례와 상태 필터가 단순하게 유지됩니다.
        : AmbulanceStatus.DISPATCHED,
    // 차량 타입도 화면 구분은 ALS/BLS 두 축만 쓰므로 나머지는 BLS로 단순화합니다.
    // 미정의 타입도 기본 BLS로 모아 마커 종류가 불필요하게 늘어나지 않게 합니다.
    // 이렇게 하면 지도 범례와 필터도 두 타입만 기준으로 유지할 수 있습니다.
    // 응답 스키마가 늘어나도 프론트 타입 체계는 두 분류만 유지하려는 목적입니다.
    type: paramedic.type === 'ALS' ? 'ALS' : 'BLS',
    // Ambulance 타입은 지도 마커, 범례, 필터가 공통 참조하므로 여기서 최종 두 분류로 고정합니다.
  };
}
