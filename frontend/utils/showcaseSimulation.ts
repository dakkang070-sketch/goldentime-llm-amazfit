import { Patient, PatientStatus } from "../types";

/**
 * 전시용 응급 상황 데모 데이터를 생성하는 시뮬레이션 유틸 모듈입니다.
 */
export interface ShowcaseEmergencyCaseGuide {
  id: string;
  title: string;
  level: PatientStatus.CRITICAL | PatientStatus.DANGER;
  triggerLabel: string;
  summary: string;
  speechBubble: string;
  symptoms: string[];
  heartRate: number;
  oxygenLevel: number;
  bodyTemp: number;
  stressLevel: number;
  fallScore: number;
  emergencyScore: number;
  responseState: "responsive" | "delayed" | "no_response";
}

interface ShowcaseMemberSeed {
  id: string;
  name: string;
  age: number;
  gender: "M" | "F";
  bloodType: string;
  location: string;
  lat: number;
  lng: number;
  avatarEmoji: string;
}

/**
 * 전시 모드 가상 회원의 기본 인적/위치 프로필 시드 목록입니다.
 */
const SHOWCASE_MEMBER_SEEDS: ShowcaseMemberSeed[] = [
  {
    id: "sim-1",
    name: "김하린",
    age: 29,
    gender: "F",
    bloodType: "A+",
    location: "서울 강남구 테헤란로",
    lat: 37.5018,
    lng: 127.0396,
    avatarEmoji: "🚶🏻‍♀️",
  },
  {
    id: "sim-2",
    name: "박도윤",
    age: 41,
    gender: "M",
    bloodType: "O+",
    location: "서울 마포구 양화로",
    lat: 37.5576,
    lng: 126.9248,
    avatarEmoji: "🚶🏻‍♂️",
  },
  {
    id: "sim-3",
    name: "이서윤",
    age: 36,
    gender: "F",
    bloodType: "B+",
    location: "서울 송파구 올림픽로",
    lat: 37.5127,
    lng: 127.1027,
    avatarEmoji: "🧍🏻‍♀️",
  },
  {
    id: "sim-4",
    name: "최준혁",
    age: 52,
    gender: "M",
    bloodType: "AB+",
    location: "서울 서초구 반포대로",
    lat: 37.5012,
    lng: 127.0058,
    avatarEmoji: "🧍🏻‍♂️",
  },
  {
    id: "sim-5",
    name: "정유진",
    age: 31,
    gender: "F",
    bloodType: "A-",
    location: "서울 양천구 목동동로",
    lat: 37.5289,
    lng: 126.8698,
    avatarEmoji: "🚶🏼‍♀️",
  },
  {
    id: "sim-6",
    name: "한지호",
    age: 47,
    gender: "M",
    bloodType: "B-",
    location: "서울 성동구 왕십리로",
    lat: 37.5616,
    lng: 127.0372,
    avatarEmoji: "🚶🏼‍♂️",
  },
  {
    id: "sim-7",
    name: "오나연",
    age: 26,
    gender: "F",
    bloodType: "O-",
    location: "서울 강서구 공항대로",
    lat: 37.5598,
    lng: 126.8406,
    avatarEmoji: "🧍🏼‍♀️",
  },
  {
    id: "sim-8",
    name: "임건우",
    age: 58,
    gender: "M",
    bloodType: "A+",
    location: "서울 중랑구 망우로",
    lat: 37.5964,
    lng: 127.0926,
    avatarEmoji: "🧍🏼‍♂️",
  },
];

/**
 * 전시용 위급상황 조건 목록을 반환합니다.
 */
export const SHOWCASE_EMERGENCY_CASE_GUIDES: ShowcaseEmergencyCaseGuide[] = [
  {
    id: "fall-unresponsive",
    title: "낙상 후 무응답",
    level: PatientStatus.CRITICAL,
    triggerLabel: "가속도 급변 + 무움직임 20초 이상 + 무응답",
    summary: "낙상 충격 이후 움직임이 멈추고 응답이 없어 즉시 출동이 필요한 상황",
    speechBubble: "살려주세요!",
    symptoms: ["낙상 감지", "무응답", "현장 출동 필요"],
    heartRate: 46,
    oxygenLevel: 88,
    bodyTemp: 34.6,
    stressLevel: 92,
    fallScore: 91,
    emergencyScore: 95,
    responseState: "no_response",
  },
  {
    id: "hypoxia-collapse",
    title: "저산소증 의심 실신",
    level: PatientStatus.CRITICAL,
    triggerLabel: "SpO2 90 미만 + 심박 급락 + 응답 없음",
    summary: "산소포화도 저하와 심박 저하가 함께 나타난 고위험 실신 상황",
    speechBubble: "숨쉬기 힘들어요!",
    symptoms: ["산소포화도 급락", "실신 의심", "긴급 이송 필요"],
    heartRate: 42,
    oxygenLevel: 84,
    bodyTemp: 35.1,
    stressLevel: 86,
    fallScore: 72,
    emergencyScore: 93,
    responseState: "no_response",
  },
  {
    id: "tachycardia-shock",
    title: "심박 급상승 쇼크 의심",
    level: PatientStatus.DANGER,
    triggerLabel: "심박 150 이상 + 스트레스 급등 + 응답 지연",
    summary: "극심한 빈맥과 불안정 징후로 구급차 선출동이 필요한 상황",
    speechBubble: "가슴이 너무 아파요!",
    symptoms: ["심박 급상승", "쇼크 의심", "즉시 확인 필요"],
    heartRate: 156,
    oxygenLevel: 91,
    bodyTemp: 37.9,
    stressLevel: 97,
    fallScore: 38,
    emergencyScore: 82,
    responseState: "delayed",
  },
  {
    id: "heatstroke",
    title: "고열 탈진 의심",
    level: PatientStatus.DANGER,
    triggerLabel: "체온 상승 + 보행 중지 + 응답 지연",
    summary: "고열과 탈진 패턴이 겹쳐 현장 조치 후 병원 이송이 필요한 상황",
    speechBubble: "너무 어지러워요!",
    symptoms: ["고열", "탈진", "현장 처치 필요"],
    heartRate: 138,
    oxygenLevel: 93,
    bodyTemp: 38.7,
    stressLevel: 81,
    fallScore: 44,
    emergencyScore: 76,
    responseState: "delayed",
  },
];

/**
 * 골든타임 타이머를 시작할 심폐성 위급 케이스 라벨을 계산합니다.
 */
export function getGoldenTimeCaseLabel(
  patient: Pick<Patient, "status" | "vitals">,
) {
  const heartRate =
    typeof patient.vitals?.heartRate === "number" && Number.isFinite(patient.vitals.heartRate)
      ? patient.vitals.heartRate
      : null;
  const oxygenLevel =
    typeof patient.vitals?.oxygenLevel === "number" &&
    Number.isFinite(patient.vitals.oxygenLevel)
      ? patient.vitals.oxygenLevel
      : null;
  const emergencyScore =
    typeof patient.vitals?.emergencyScore === "number" &&
    Number.isFinite(patient.vitals.emergencyScore)
      ? patient.vitals.emergencyScore
      : 0;
  const responseState = patient.vitals?.responseState;
  const isEmergency =
    patient.status === PatientStatus.CRITICAL || patient.status === PatientStatus.DANGER;

  if (!isEmergency) {
    return null;
  }

  // 골든타임 타이머는 심폐성 위급 시나리오만 대상으로 삼아 일반 응급 케이스까지 넓히지 않습니다.
  if (heartRate !== null && heartRate <= 50 && responseState === "no_response") {
    return "심박 급락·무응답";
  }

  if (oxygenLevel !== null && oxygenLevel <= 90 && responseState === "no_response") {
    return "저산소·무응답";
  }

  if (heartRate !== null && heartRate >= 150 && emergencyScore >= 80) {
    return "급성 심박 이상";
  }

  return null;
}

/**
 * 골든타임 타이머 시작 대상인지 판별합니다.
 */
export function shouldStartGoldenTimeForPatient(
  patient: Pick<Patient, "status" | "vitals">,
) {
  return getGoldenTimeCaseLabel(patient) !== null;
}

/**
 * 전시용 회원 기본 생체값을 생성합니다.
 */
export function buildShowcaseNormalVitals() {
  const heartRate = 68 + Math.floor(Math.random() * 18);
  const oxygenLevel = 96 + Math.floor(Math.random() * 3);
  const bodyTemp = 36.3 + Math.random() * 0.5;
  const stressLevel = 18 + Math.floor(Math.random() * 18);

  return {
    heartRate,
    bloodPressure: "118/76",
    oxygenLevel,
    bodyTemp,
    lastUpdated: new Date().toISOString(),
    history: [],
    isWear: true,
    stressLevel,
    fallScore: 8,
    emergencyScore: 12,
    responseState: "responsive" as const,
    fallFeatures: {
      fallMagnitude: 0.2,
      postImpactImmobilitySec: 0,
      stepResumeWithin20s: true,
    },
  };
}

/**
 * 전시용 센서값 범위를 안전하게 제한합니다.
 */
function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * 전시용 드리프트 값이 이전 값과 완전히 동일할 때만 최소 변화량을 보장합니다.
 */
function nudgeIfUnchanged(
  currentValue: number,
  nextValue: number,
  options: {
    min: number;
    max: number;
    step: number;
    precision?: number;
  },
) {
  const precision = options.precision ?? 0;
  const normalizedCurrent =
    precision > 0 ? Number(currentValue.toFixed(precision)) : Math.round(currentValue);
  const normalizedNext =
    precision > 0 ? Number(nextValue.toFixed(precision)) : Math.round(nextValue);

  if (normalizedCurrent !== normalizedNext) {
    return normalizedNext;
  }

  const nudged = clampNumber(
    currentValue + (Math.random() > 0.5 ? options.step : -options.step),
    options.min,
    options.max,
  );
  return precision > 0 ? Number(nudged.toFixed(precision)) : Math.round(nudged);
}

/**
 * 전시용 정상 회원의 센서 스냅샷을 생성합니다.
 */
function buildShowcaseNormalSensors(options?: { walking?: boolean }) {
  const walking = options?.walking ?? true;

  return {
    barometer: {
      airPressure: Math.round(1011 + (Math.random() - 0.5) * 6),
      altitude: Math.round(22 + (Math.random() - 0.5) * (walking ? 18 : 10)),
    },
    acceleration: {
      x: Number(((Math.random() - 0.5) * (walking ? 1.6 : 0.6)).toFixed(1)),
      y: Number(((Math.random() - 0.5) * (walking ? 1.8 : 0.7)).toFixed(1)),
      z: Number((9.8 + (Math.random() - 0.5) * (walking ? 1.2 : 0.4)).toFixed(1)),
    },
    gyroscope: {
      x: Number(((Math.random() - 0.5) * (walking ? 18 : 6)).toFixed(1)),
      y: Number(((Math.random() - 0.5) * (walking ? 16 : 6)).toFixed(1)),
      z: Number(((Math.random() - 0.5) * (walking ? 22 : 8)).toFixed(1)),
    },
  };
}

/**
 * 전시용 응급 케이스에 맞는 센서 스냅샷을 생성합니다.
 */
function buildShowcaseEmergencySensors(guide: ShowcaseEmergencyCaseGuide) {
  switch (guide.id) {
    case "fall-unresponsive":
      return {
        barometer: { airPressure: 1008, altitude: 26 },
        acceleration: { x: 21.8, y: 8.4, z: 27.6 },
        gyroscope: { x: 182.4, y: 96.8, z: 143.2 },
      };
    case "hypoxia-collapse":
      return {
        barometer: { airPressure: 1010, altitude: 24 },
        acceleration: { x: 1.4, y: 0.8, z: 9.1 },
        gyroscope: { x: 4.2, y: 2.6, z: 5.8 },
      };
    case "tachycardia-shock":
      return {
        barometer: { airPressure: 1007, altitude: 31 },
        acceleration: { x: 4.6, y: 3.2, z: 11.7 },
        gyroscope: { x: 28.3, y: 19.6, z: 34.5 },
      };
    case "heatstroke":
      return {
        barometer: { airPressure: 1005, altitude: 18 },
        acceleration: { x: 2.3, y: 1.4, z: 10.2 },
        gyroscope: { x: 11.4, y: 8.1, z: 13.7 },
      };
    default:
      return buildShowcaseNormalSensors({ walking: false });
  }
}

/**
 * 전시용 정상 회원의 센서값을 완만하게 드리프트시킵니다.
 */
export function driftShowcaseSensors(
  patient: Patient,
  options?: { walking?: boolean },
) {
  const walking = options?.walking ?? patient.simulationState === "walking";
  const currentPressure =
    typeof patient.barometer?.airPressure === "number" ? patient.barometer.airPressure : 1011;
  const currentAltitude =
    typeof patient.barometer?.altitude === "number" ? patient.barometer.altitude : 22;
  const currentAcceleration = patient.acceleration ?? { x: 0, y: 0, z: 9.8 };
  const currentGyroscope = patient.gyroscope ?? { x: 0, y: 0, z: 0 };

  return {
    barometer: {
      airPressure: Math.round(clampNumber(currentPressure + (Math.random() - 0.5) * 2, 1002, 1018)),
      altitude: Math.round(
        clampNumber(currentAltitude + (Math.random() - 0.5) * (walking ? 3 : 1.5), 8, 58),
      ),
    },
    acceleration: {
      x: Number(
        clampNumber(
          currentAcceleration.x + (Math.random() - 0.5) * (walking ? 0.8 : 0.25),
          -1.8,
          1.8,
        ).toFixed(1),
      ),
      y: Number(
        clampNumber(
          currentAcceleration.y + (Math.random() - 0.5) * (walking ? 0.8 : 0.25),
          -1.8,
          1.8,
        ).toFixed(1),
      ),
      z: Number(
        clampNumber(
          currentAcceleration.z + (Math.random() - 0.5) * (walking ? 0.7 : 0.2),
          8.9,
          10.9,
        ).toFixed(1),
      ),
    },
    gyroscope: {
      x: Number(
        clampNumber(
          currentGyroscope.x + (Math.random() - 0.5) * (walking ? 7 : 2),
          -22,
          22,
        ).toFixed(1),
      ),
      y: Number(
        clampNumber(
          currentGyroscope.y + (Math.random() - 0.5) * (walking ? 7 : 2),
          -22,
          22,
        ).toFixed(1),
      ),
      z: Number(
        clampNumber(
          currentGyroscope.z + (Math.random() - 0.5) * (walking ? 9 : 3),
          -28,
          28,
        ).toFixed(1),
      ),
    },
  };
}

/**
 * 전시용 정상 회원의 생체값을 급격히 튀지 않도록 완만하게 드리프트시킵니다.
 */
export function driftShowcaseVitals(
  current: Patient["vitals"],
  options?: { walking?: boolean },
) {
  const walking = options?.walking ?? false;
  const nextHeartRateBase =
    typeof current?.heartRate === "number" && Number.isFinite(current.heartRate)
      ? current.heartRate
      : 76;
  const nextSpo2Base =
    typeof current?.oxygenLevel === "number" && Number.isFinite(current.oxygenLevel)
      ? current.oxygenLevel
      : 97;
  const nextTempBase =
    typeof current?.bodyTemp === "number" && Number.isFinite(current.bodyTemp)
      ? current.bodyTemp
      : 36.5;
  const nextStressBase =
    typeof current?.stressLevel === "number" && Number.isFinite(current.stressLevel)
      ? current.stressLevel
      : 28;

  const heartRate = nudgeIfUnchanged(
    nextHeartRateBase,
    clampNumber(
      nextHeartRateBase +
        (Math.random() < 0.22 ? 0 : (Math.random() - 0.5) * (walking ? 3.6 : 2.4)),
      walking ? 72 : 66,
      walking ? 98 : 88,
    ),
    {
      min: walking ? 72 : 66,
      max: walking ? 98 : 88,
      step: 1,
    },
  );
  const oxygenLevel = nudgeIfUnchanged(
    nextSpo2Base,
    clampNumber(
      nextSpo2Base + (Math.random() < 0.45 ? 0 : Math.random() > 0.5 ? 1 : -1),
      95,
      99,
    ),
    {
      min: 95,
      max: 99,
      step: 1,
    },
  );
  const bodyTemp = nudgeIfUnchanged(
    nextTempBase,
    clampNumber(
      nextTempBase + (Math.random() < 0.28 ? 0 : (Math.random() - 0.5) * 0.14),
      36.2,
      36.8,
    ),
    {
      min: 36.2,
      max: 36.8,
      step: 0.1,
      precision: 1,
    },
  );
  const stressLevel = nudgeIfUnchanged(
    nextStressBase,
    clampNumber(
      nextStressBase +
        (Math.random() < 0.22 ? 0 : (Math.random() - 0.5) * (walking ? 4.4 : 2.8)),
      16,
      walking ? 40 : 34,
    ),
    {
      min: 16,
      max: walking ? 40 : 34,
      step: 1,
    },
  );

  return {
    ...current,
    heartRate,
    oxygenLevel,
    bodyTemp,
    stressLevel,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 전시용 생체값 드리프트에 사용할 숫자 보정값을 계산합니다.
 */
function driftMetricValue(
  currentValue: number,
  options: {
    min: number;
    max: number;
    step: number;
    precision?: number;
    holdRate?: number;
  },
) {
  const precision = options.precision ?? 0;
  const holdRate = options.holdRate ?? 0.2;
  // holdRate를 두어 모든 틱마다 값이 바뀌지 않게 만들어 실제 센서처럼 보이게 합니다.
  const nextRaw =
    Math.random() < holdRate
      ? currentValue
      : currentValue + (Math.random() - 0.5) * options.step;
  const clamped = clampNumber(nextRaw, options.min, options.max);

  return nudgeIfUnchanged(currentValue, clamped, {
    min: options.min,
    max: options.max,
    step: precision > 0 ? Math.max(0.1, options.step / 2) : 1,
    precision,
  });
}

/**
 * 전시용 회원 상태에 맞춰 생체값이 계속 살아 움직이도록 드리프트시킵니다.
 */
export function driftShowcaseScenarioVitals(patient: Patient) {
  const current = patient.vitals;
  const simulationState = patient.simulationState;
  const isEmergency =
    patient.status === PatientStatus.CRITICAL || patient.status === PatientStatus.DANGER;

  // 이 함수는 응급 여부와 시뮬레이션 단계를 함께 보고 전시용 수치 변화를 분기합니다.
  // 정상 상태에서는 걷기/완료 상태에 맞는 완만한 드리프트만 적용합니다.
  if (!isEmergency) {
    if (simulationState === "completed") {
      return {
        ...current,
        heartRate: driftMetricValue(current?.heartRate ?? 78, {
          min: 70,
          max: 88,
          step: 1.6,
          holdRate: 0.35,
        }),
        oxygenLevel: driftMetricValue(current?.oxygenLevel ?? 97, {
          min: 96,
          max: 99,
          step: 1.2,
          holdRate: 0.45,
        }),
        bodyTemp: driftMetricValue(current?.bodyTemp ?? 36.5, {
          min: 36.3,
          max: 36.8,
          step: 0.08,
          precision: 1,
          holdRate: 0.3,
        }),
        stressLevel: driftMetricValue(current?.stressLevel ?? 26, {
          min: 16,
          max: 30,
          step: 2,
          holdRate: 0.3,
        }),
        lastUpdated: new Date().toISOString(),
      };
    }

    return driftShowcaseVitals(current, {
      walking: simulationState === "walking",
    });
  }

  // 출동 배정 이후에는 수치가 급격히 악화되기보다 서서히 안정화되는 방향으로 보정합니다.
  if (
    simulationState === "boarding" ||
    simulationState === "transporting" ||
    simulationState === "assigned"
  ) {
    // 이송 단계에서는 절대 0이나 급변으로 튀지 않게 현재 값 근처에서만 서서히 안정화시킵니다.
    const heartRateBase =
      typeof current?.heartRate === "number" && current.heartRate > 0
        ? current.heartRate
        : 92;
    const oxygenBase =
      typeof current?.oxygenLevel === "number" && current.oxygenLevel > 0
        ? current.oxygenLevel
        : 93;
    const tempBase =
      typeof current?.bodyTemp === "number" && current.bodyTemp > 0
        ? current.bodyTemp
        : 36.9;
    const stressBase =
      typeof current?.stressLevel === "number" ? current.stressLevel : 62;

    return {
      ...current,
      heartRate:
        heartRateBase >= 120
          ? driftMetricValue(heartRateBase - Math.random() * 2.5, {
              min: 104,
              max: 148,
              step: 4.5,
              holdRate: 0.2,
            })
          : driftMetricValue(heartRateBase + Math.random() * 1.2, {
              min: 54,
              max: 96,
              step: 3.2,
              holdRate: 0.25,
            }),
      oxygenLevel: driftMetricValue(oxygenBase + Math.random() * 0.8, {
        min: 90,
        max: 97,
        step: 1.8,
        holdRate: 0.25,
      }),
      bodyTemp:
        tempBase >= 37.5
          ? driftMetricValue(tempBase - Math.random() * 0.08, {
              min: 36.9,
              max: 38.4,
              step: 0.16,
              precision: 1,
              holdRate: 0.2,
            })
          : driftMetricValue(tempBase + (Math.random() - 0.5) * 0.04, {
              min: 34.8,
              max: 36.8,
              step: 0.12,
              precision: 1,
              holdRate: 0.25,
            }),
      stressLevel: driftMetricValue(stressBase - Math.random() * 2.2, {
        min: 38,
        max: 88,
        step: 5,
        holdRate: 0.2,
      }),
      lastUpdated: new Date().toISOString(),
    };
  }

  // 위급 대기 상태에서는 환자 유형별 위험 구간 안에서 수치가 계속 흔들리도록 유지합니다.
  const heartRateBase =
    typeof current?.heartRate === "number" && current.heartRate > 0 ? current.heartRate : 82;
  const oxygenBase =
    typeof current?.oxygenLevel === "number" && current.oxygenLevel > 0
      ? current.oxygenLevel
      : 92;
  const tempBase =
    typeof current?.bodyTemp === "number" && current.bodyTemp > 0 ? current.bodyTemp : 36.8;
  const stressBase =
    typeof current?.stressLevel === "number" ? current.stressLevel : 72;

  return {
    ...current,
    heartRate:
      heartRateBase >= 120
        ? driftMetricValue(heartRateBase, {
            min: 132,
            max: 164,
            step: 7,
            holdRate: 0.12,
          })
        : driftMetricValue(heartRateBase, {
            min: 38,
            max: 58,
            step: 4.5,
            holdRate: 0.12,
          }),
    oxygenLevel:
      oxygenBase <= 92
        ? driftMetricValue(oxygenBase, {
            min: 82,
            max: 94,
            step: 2.4,
            holdRate: 0.12,
          })
        : driftMetricValue(oxygenBase, {
            min: 90,
            max: 96,
            step: 1.8,
            holdRate: 0.14,
          }),
    bodyTemp:
      tempBase >= 37.5
        ? driftMetricValue(tempBase, {
            min: 37.7,
            max: 39.2,
            step: 0.22,
            precision: 1,
            holdRate: 0.12,
          })
        : tempBase <= 35.5
          ? driftMetricValue(tempBase, {
              min: 34.2,
              max: 35.4,
              step: 0.18,
              precision: 1,
              holdRate: 0.12,
            })
          : driftMetricValue(tempBase, {
              min: 36.5,
              max: 37.8,
              step: 0.16,
              precision: 1,
              holdRate: 0.14,
            }),
    stressLevel: driftMetricValue(stressBase, {
      min: 68,
      max: 99,
      step: 6,
      holdRate: 0.12,
    }),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 전시용 회원의 부가 센서/단말 상태를 살아있는 값처럼 함께 갱신합니다.
 */
export function driftShowcaseLiveMetrics(patient: Patient) {
  const walking = patient.simulationState === "walking";
  const transporting = patient.simulationState === "transporting";
  const currentSteps = typeof patient.steps === "number" ? patient.steps : 0;
  const currentDistance = typeof patient.distanceM === "number" ? patient.distanceM : 0;
  const currentBattery =
    typeof patient.batteryLevel === "number" && Number.isFinite(patient.batteryLevel)
      ? patient.batteryLevel
      : 70;

  const stepIncrement = walking ? 4 + Math.floor(Math.random() * 5) : 0;
  const distanceIncrement = walking ? 3 + Math.random() * 5 : 0;
  const batteryDropChance = walking || transporting ? 0.025 : 0.012;
  // 이동 중 배터리 소모를 조금 더 크게 잡아 전시 화면에서 단말 상태 변화도 함께 보이게 합니다.
  const nextBattery =
    Math.random() < batteryDropChance
      ? Number(clampNumber(currentBattery - 0.1, 18, 100).toFixed(1))
      : currentBattery;

  return {
    steps: currentSteps + stepIncrement,
    distanceM: Number((currentDistance + distanceIncrement).toFixed(1)),
    batteryLevel: nextBattery,
    locationUpdatedAt: new Date().toISOString(),
    locationAgeMs: Math.floor(Math.random() * 12000),
  };
}

/**
 * 전시용 회원 목록을 초기 생성합니다.
 */
export function buildShowcaseMembers(): Patient[] {
  return SHOWCASE_MEMBER_SEEDS.map((_, index) =>
    buildShowcaseMember(index, `sim:${SHOWCASE_MEMBER_SEEDS[index].id}`),
  );
}

/**
 * 전시용 회원 1명을 순환 생성합니다.
 */
export function buildShowcaseMember(sequence: number, id?: string): Patient {
  const seedIndex =
    ((sequence % SHOWCASE_MEMBER_SEEDS.length) + SHOWCASE_MEMBER_SEEDS.length) %
    SHOWCASE_MEMBER_SEEDS.length;
  // 회원 수가 시드 개수를 넘어가도 modulo로 프로필을 순환 재사용해 데모 인원을 쉽게 늘립니다.
  const seed = SHOWCASE_MEMBER_SEEDS[seedIndex];
  const vitals = buildShowcaseNormalVitals();
  const sensors = buildShowcaseNormalSensors({ walking: true });

  return {
    id: id || `sim:regen:${sequence}:${seed.id}`,
    name: seed.name,
    age: seed.age,
    birthDate: `199${seedIndex}-01-01`,
    bloodType: seed.bloodType,
    imageUrl: `https://i.pravatar.cc/150?u=${seed.id}-${sequence}`,
    gender: seed.gender,
    status: PatientStatus.NORMAL,
    location: seed.location,
    detailAddress: `${seed.location} 전시 시뮬레이션 구간`,
    lat: seed.lat,
    lng: seed.lng,
    steps: 1200 + seedIndex * 230,
    distanceM: 300 + seedIndex * 45,
    batteryLevel: 72 - seedIndex * 3,
    barometer: sensors.barometer,
    acceleration: sensors.acceleration,
    gyroscope: sensors.gyroscope,
    vitals,
    symptoms: ["정상 모니터링"],
    aiAnalysis: "정상 보행 중. 실시간 모니터링 유지.",
    isSimulated: true,
    avatarEmoji: seed.avatarEmoji,
    speechBubble: null,
    simulationState: "walking",
    simulationCaseType: "정상 보행",
    simulationCaseSummary: "전시장용 가상 회원이 정상 보행 중입니다.",
  };
}

/**
 * 전시용 위급상황 케이스를 순환 선택합니다.
 */
export function pickShowcaseEmergencyCase(index: number) {
  // 전시 반복 재생 시 index만 바꿔도 케이스가 순환되도록 고정 목록을 modulo로 선택합니다.
  return SHOWCASE_EMERGENCY_CASE_GUIDES[index % SHOWCASE_EMERGENCY_CASE_GUIDES.length];
}

/**
 * 선택된 회원에게 위급상황 케이스를 적용합니다.
 */
export function applyShowcaseEmergencyCase(
  patient: Patient,
  guide: ShowcaseEmergencyCaseGuide,
): Patient {
  const nowIso = new Date().toISOString();
  const sensors = buildShowcaseEmergencySensors(guide);
  // 기존 회원 프로필은 유지한 채 위급상황에 해당하는 수치와 문구만 한 번에 덮어씁니다.
  const nextPatient = {
    ...patient,
    status: guide.level,
    symptoms: guide.symptoms,
    severityScore: guide.level === PatientStatus.CRITICAL ? 5 : 4,
    aiAnalysis: [
      `위험도: ${guide.level === PatientStatus.CRITICAL ? "즉시 출동 필요" : "고위험 출동 권고"}`,
      `핵심근거: ${guide.triggerLabel}`,
      `복합상황: ${guide.summary}`,
      "권고: 가장 가까운 응급차량 자동 배정 후 현장 확인 및 병원 이송 진행",
    ].join("\n"),
    vitals: {
      ...patient.vitals,
      heartRate: guide.heartRate,
      oxygenLevel: guide.oxygenLevel,
      bodyTemp: guide.bodyTemp,
      stressLevel: guide.stressLevel,
      fallScore: guide.fallScore,
      emergencyScore: guide.emergencyScore,
      responseState: guide.responseState,
      lastUpdated: nowIso,
      fallFeatures: {
        fallMagnitude: guide.fallScore >= 70 ? 2.6 : 0.8,
        postImpactImmobilitySec: guide.responseState === "no_response" ? 28 : 8,
        stepResumeWithin20s: guide.responseState === "responsive",
      },
      history: patient.vitals.history,
    },
    speechBubble: guide.speechBubble,
    simulationState: "waiting_dispatch",
    simulationCaseType: guide.title,
    simulationCaseSummary: guide.summary,
    emergencyTriggeredAt: undefined,
    dispatchTargetLat: undefined,
    dispatchTargetLng: undefined,
    matchedAmbulanceId: undefined,
    recommendedHospitalId: undefined,
    hospitalMatchReason: undefined,
    barometer: sensors.barometer,
    acceleration: sensors.acceleration,
    gyroscope: sensors.gyroscope,
  };

  // 심폐성 골든타임 대상 조건에 맞는 케이스만 타이머 시작 시각을 기록합니다.
  return {
    ...nextPatient,
    emergencyTriggeredAt: shouldStartGoldenTimeForPatient(nextPatient) ? nowIso : undefined,
  };
}
