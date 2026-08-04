import { Patient, PatientStatus } from "../types";

export const PATIENT_MONITORING_STALE_THRESHOLD_MS = 45_000;

export type PatientMonitoringVisualKind =
  | "removed"
  | "stale"
  | "critical"
  | "danger"
  | "warning"
  | "caution"
  | "normal"
  | "pending"
  | "transported";

export interface PatientMonitoringVisualState {
  kind: PatientMonitoringVisualKind;
  badgeLabel: string;
  mapLabel: string;
  fallbackLabel: string;
  tone:
    | "removed"
    | "stale"
    | "critical"
    | "danger"
    | "warning"
    | "caution"
    | "normal"
    | "pending"
    | "transported";
  isActualEmergency: boolean;
}

/**
 * 환자 마지막 생체 수집 시각이 오래된 미수집 상태인지 판별합니다.
 */
export function isPatientDataStale(patient: Patient, nowMs = Date.now()) {
  const lastUpdatedMs = patient?.vitals?.lastUpdated
    ? new Date(patient.vitals.lastUpdated).getTime()
    : 0;
  return lastUpdatedMs <= 0 || nowMs - lastUpdatedMs > PATIENT_MONITORING_STALE_THRESHOLD_MS;
}

/**
 * 관제 UI가 공통으로 사용할 탈착/미수집/응급 시각 상태를 계산합니다.
 */
export function getPatientMonitoringVisualState(
  patient: Patient,
  nowMs = Date.now(),
): PatientMonitoringVisualState {
  if (patient.status === PatientStatus.TRANSPORTED) {
    return {
      kind: "transported",
      badgeLabel: "이송 완료",
      mapLabel: "이송 완료",
      fallbackLabel: "이송 완료",
      tone: "transported",
      isActualEmergency: false,
    };
  }

  if (patient.vitals?.isWear === false) {
    return {
      kind: "removed",
      badgeLabel: "탈착(Watch Off)",
      mapLabel: "탈착",
      fallbackLabel: "워치 재착용 확인",
      tone: "removed",
      isActualEmergency: false,
    };
  }

  if (isPatientDataStale(patient, nowMs)) {
    return {
      kind: "stale",
      badgeLabel: "미수집",
      mapLabel: "미수집",
      fallbackLabel: "데이터 재수집중",
      tone: "stale",
      isActualEmergency: false,
    };
  }

  if (patient.status === PatientStatus.CRITICAL) {
    return {
      kind: "critical",
      badgeLabel: "응급(Emergency)",
      mapLabel: "응급",
      fallbackLabel: "응급 상태 확인",
      tone: "critical",
      isActualEmergency: true,
    };
  }

  if (patient.status === PatientStatus.DANGER) {
    return {
      kind: "danger",
      badgeLabel: "위험(Danger)",
      mapLabel: "위험",
      fallbackLabel: "위험 상태 확인",
      tone: "danger",
      isActualEmergency: true,
    };
  }

  if (patient.status === PatientStatus.WARNING) {
    return {
      kind: "warning",
      badgeLabel: "경고(Warning)",
      mapLabel: "경고",
      fallbackLabel: "경고 상태 추적중",
      tone: "warning",
      isActualEmergency: false,
    };
  }

  if (patient.status === PatientStatus.CAUTION) {
    return {
      kind: "caution",
      badgeLabel: "주의(Caution)",
      mapLabel: "주의",
      fallbackLabel: "주의 상태 추적중",
      tone: "caution",
      isActualEmergency: false,
    };
  }

  if (patient.status === PatientStatus.PENDING) {
    return {
      kind: "pending",
      badgeLabel: "매칭 대기",
      mapLabel: "매칭 대기",
      fallbackLabel: "응급차량 매칭중",
      tone: "pending",
      isActualEmergency: false,
    };
  }

  return {
    kind: "normal",
    badgeLabel: "정상(Normal)",
    mapLabel: "정상",
    fallbackLabel: "정상 모니터링중",
    tone: "normal",
    isActualEmergency: false,
  };
}
