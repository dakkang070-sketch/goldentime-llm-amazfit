/**
 * 완전한 응급 대응 워크플로우 자동화 시스템
 * 골든타임 내 최적 대응을 위한 전체 프로세스 자동 관리
 */

const EmergencyCase = require("../models/EmergencyCase");
const { autoMatchParamedicForCase } = require("./matchingService");
const { autoMatchHospitalForCase } = require("./hospitalService");
const {
  emitEmergencyCaseCreated,
  emitStatusUpdate,
  emitEscalation,
} = require("./socketService");
const {
  notifyEmergencyToGuardian,
  notifyParamedic,
  notifyHospital,
} = require("./notificationService");
const { calculateOptimalRoute } = require("./routeService");
const medicalWeightingService = require("./medicalWeightingService");
const cron = require("node-cron");
const logger = require("../utils/logger");
const { setShadowState } = require("./shadowStateCacheService");

/**
 * 응급 케이스별 대응 상태 전이를 자동으로 관리하는 워크플로우 서비스 클래스입니다.
 */
class EmergencyWorkflowService {
  /**
   * 인스턴스를 초기화합니다.
   */
  constructor() {
    this.activeWorkflows = new Map(); // 진행 중인 워크플로우 추적
    this.slaTimeouts = new Map(); // SLA 타임아웃 관리
    this.escalationQueue = []; // 에스컬레이션 대기열

    // 워크플로우 SLA 시간 (분)
    this.SLA_TIMES = {
      PARAMEDIC_RESPONSE: 2, // 응급구조사 응답 2분
      PARAMEDIC_ARRIVAL: 8, // 현장 도착 8분 (골든타임)
      HOSPITAL_TRANSPORT: 15, // 병원 이송 15분
      HOSPITAL_ADMISSION: 30, // 병원 접수 30분
      TOTAL_RESPONSE: 45, // 전체 대응 45분
    };

    // 워크플로우 상태 정의
    this.WORKFLOW_STATES = {
      INITIATED: "initiated",
      PARAMEDIC_MATCHING: "paramedic_matching",
      PARAMEDIC_DISPATCHED: "paramedic_dispatched",
      PARAMEDIC_ENROUTE: "paramedic_enroute",
      PARAMEDIC_ARRIVED: "paramedic_arrived",
      PATIENT_STABILIZED: "patient_stabilized",
      HOSPITAL_MATCHING: "hospital_matching",
      HOSPITAL_NOTIFIED: "hospital_notified",
      TRANSPORT_STARTED: "transport_started",
      HOSPITAL_ARRIVED: "hospital_arrived",
      PATIENT_ADMITTED: "patient_admitted",
      COMPLETED: "completed",
      ESCALATED: "escalated",
      FAILED: "failed",
    };
  }

  /**
   * 워크플로우 메모리 상태를 공용 캐시에 남길 수 있는 직렬화 가능한 요약본으로 변환합니다.
   */
  async shadowWriteWorkflowState(emergencyCaseId, extra = {}) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);
    if (!workflow) return;

    const slaTimers = this.slaTimeouts.get(emergencyCaseId) || {};
    await setShadowState("emergency-workflow", emergencyCaseId, {
      caseId: emergencyCaseId,
      state: workflow.state,
      startTime: workflow.startTime instanceof Date ? workflow.startTime.toISOString() : workflow.startTime,
      endTime: workflow.endTime instanceof Date ? workflow.endTime.toISOString() : workflow.endTime,
      updatedAt: new Date().toISOString(),
      escalationLevel: workflow.escalationLevel,
      timelineLength: Array.isArray(workflow.timeline) ? workflow.timeline.length : 0,
      lastTimelineEvent: Array.isArray(workflow.timeline) && workflow.timeline.length > 0
        ? workflow.timeline[workflow.timeline.length - 1]
        : null,
      resources: {
        paramedic: workflow.resources?.paramedic || null,
        hospital: workflow.resources?.hospital || null,
        ambulance: workflow.resources?.ambulance || null,
        hasRoute: Boolean(workflow.resources?.route),
      },
      slaStatus: workflow.slaStatus,
      activeSlaTypes: Object.keys(slaTimers),
      ...extra,
    }, 6 * 60 * 60);
  }

  /**
   * 응급 대응 워크플로우를 초기화하고 첫 단계인 구조사 매칭으로 진입시킵니다.
   */
  async initiateEmergencyWorkflow(emergencyCaseId, options = {}) {
    try {
      logger.info(`응급 워크플로우 시작: ${emergencyCaseId}`);

      // 워크플로우 상태 초기화
      const workflow = {
        caseId: emergencyCaseId,
        state: this.WORKFLOW_STATES.INITIATED,
        startTime: new Date(),
        timeline: [],
        resources: {
          paramedic: null,
          hospital: null,
          ambulance: null,
          route: null,
        },
        slaStatus: {
          onTrack: true,
          violations: [],
        },
        escalationLevel: 0,
        options,
      };

      this.activeWorkflows.set(emergencyCaseId, workflow);
      await this.shadowWriteWorkflowState(emergencyCaseId, { phase: "initiated" });

      // 타임라인 기록
      this.addTimelineEvent(
        emergencyCaseId,
        "workflow_initiated",
        "응급 워크플로우 시작",
      );

      // 즉시 1단계: 응급구조사 매칭 시작
      await this.executeParamedicMatching(emergencyCaseId);

      return {
        success: true,
        workflowId: emergencyCaseId,
        message: "응급 워크플로우가 시작되었습니다.",
      };
    } catch (error) {
      logger.error("응급 워크플로우 시작 실패", error, { emergencyCaseId });
      await this.handleWorkflowFailure(
        emergencyCaseId,
        "initiation_failed",
        error.message,
      );
      throw error;
    }
  }

  /**
   * 응급구조사 자동 매칭을 실행하고 성공 시 출동 상태로 전환합니다.
   */
  async executeParamedicMatching(emergencyCaseId) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);
    workflow.state = this.WORKFLOW_STATES.PARAMEDIC_MATCHING;

    this.addTimelineEvent(
      emergencyCaseId,
      "paramedic_matching_started",
      "응급구조사 매칭 시작",
    );

    try {
      // SLA 타이머 시작 (2분 내 응답)
      this.startSLATimer(emergencyCaseId, "PARAMEDIC_RESPONSE", async () => {
        await this.escalateParamedicMatching(emergencyCaseId);
      });

      // 응급구조사 자동 매칭 실행
      const matchResult = await autoMatchParamedicForCase(emergencyCaseId);

      if (matchResult.matched) {
        workflow.resources.paramedic = matchResult.paramedicId;
        workflow.state = this.WORKFLOW_STATES.PARAMEDIC_DISPATCHED;

        this.clearSLATimer(emergencyCaseId, "PARAMEDIC_RESPONSE");
        this.addTimelineEvent(
          emergencyCaseId,
          "paramedic_matched",
          `응급구조사 매칭 완료: ${matchResult.paramedicId}`,
        );

        // 응급구조사에게 알림 발송
        await notifyParamedic(matchResult.paramedicId, emergencyCaseId);

        // Socket.IO로 실시간 업데이트
        emitStatusUpdate(emergencyCaseId, {
          state: workflow.state,
          paramedic: matchResult.paramedicId,
          message: "응급구조사가 출동 중입니다.",
        });

        // 구조사 출동 감시는 바로 시작하고,
        await this.monitorParamedicResponse(emergencyCaseId);

        // 병원 매칭은 별도 비동기로 병렬 시작해 현장 이동과 동시에 진행합니다.
        setImmediate(() => this.executeHospitalMatching(emergencyCaseId));
      } else {
        // 매칭 실패 시 즉시 에스컬레이션
        await this.escalateParamedicMatching(emergencyCaseId);
      }
    } catch (error) {
      logger.error("응급구조사 매칭 실패", error, { emergencyCaseId });
      await this.escalateParamedicMatching(emergencyCaseId);
    }
  }

  /**
   * 출동한 응급구조사의 현장 도착까지 위치 추적과 SLA 감시를 수행합니다.
   */
  async monitorParamedicResponse(emergencyCaseId) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);

    // 8분 내 현장 도착 SLA 타이머 (골든타임)
    this.startSLATimer(emergencyCaseId, "PARAMEDIC_ARRIVAL", async () => {
      await this.escalateResponse(emergencyCaseId, "paramedic_arrival_delayed");
    });

    this.addTimelineEvent(
      emergencyCaseId,
      "paramedic_enroute_monitoring",
      "현장 도착 모니터링 시작",
    );

    // 실시간 위치 추적 시작 (5초마다)
    const trackingInterval = setInterval(async () => {
      try {
        await this.updateParamedicLocation(emergencyCaseId);
      } catch (error) {
        logger.warn("응급구조사 위치 추적 실패", error);
      }
    }, 5000);

    // 워크플로우에 추적 인터벌 저장
    workflow.trackingInterval = trackingInterval;
  }

  /**
   * 환자 상태를 기준으로 병원을 매칭하고 사전 통보 및 경로 계산을 시작합니다.
   */
  async executeHospitalMatching(emergencyCaseId) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);
    workflow.state = this.WORKFLOW_STATES.HOSPITAL_MATCHING;

    this.addTimelineEvent(
      emergencyCaseId,
      "hospital_matching_started",
      "이송 병원 매칭 시작",
    );

    try {
      // 응급 케이스 정보 조회
      const emergencyCase = await EmergencyCase.findById(emergencyCaseId)
        .populate("userId", "age gender medicalHistory")
        .lean();

      // 환자 상태 기반 전문 병원 매칭
      const specialtyRequirements =
        this.determineSpecialtyRequirements(emergencyCase);

      // 의료 정보 기반 위험도 가중치 계산 (의료 데이터 연동 강화)
      let riskScore = { totalScore: 50 };
      try {
        riskScore = medicalWeightingService.calculateRiskScore(
          emergencyCase.userId, // populate된 사용자 정보
          emergencyCase.biometricData || {}, // 생체 데이터
          { emergencyLevel: emergencyCase.emergencyLevel }, // 컨텍스트
        );
        logger.info(
          `환자 위험도 스코어 계산 완료: ${riskScore.totalScore}점 (등급: ${riskScore.riskLevel})`,
          {
            caseId: emergencyCaseId,
            riskLevel: riskScore.riskLevel,
          },
        );
      } catch (err) {
        logger.warn("위험도 스코어 계산 실패, 기본값 사용", err);
      }

      const hospitalMatch = await autoMatchHospitalForCase(emergencyCaseId, {
        specialties: specialtyRequirements,
        // 중증도나 의료 위험 점수가 높으면 거리보다 빠른 수용 가능성을 더 우선합니다.
        prioritizeDistance:
          emergencyCase.emergencyLevel >= 4 || riskScore.totalScore >= 70,
        requireICU:
          emergencyCase.emergencyLevel === 5 || riskScore.totalScore >= 85,
      });

      if (hospitalMatch.matched) {
        workflow.resources.hospital = hospitalMatch.hospitalId;
        workflow.state = this.WORKFLOW_STATES.HOSPITAL_NOTIFIED;

        this.addTimelineEvent(
          emergencyCaseId,
          "hospital_matched",
          `이송 병원 확정: ${hospitalMatch.hospitalId}`,
        );

        // 병원에 사전 통보
        await notifyHospital(hospitalMatch.hospitalId, emergencyCase);

        // 최적 경로 계산
        await this.calculateTransportRoute(emergencyCaseId);

        // Socket.IO 업데이트
        emitStatusUpdate(emergencyCaseId, {
          state: workflow.state,
          hospital: hospitalMatch.hospitalId,
          message: "이송 병원이 확정되었습니다.",
        });
      } else {
        // 병원 매칭 실패 - 에스컬레이션
        await this.escalateHospitalMatching(emergencyCaseId);
      }
    } catch (error) {
      logger.error("병원 매칭 실패", error, { emergencyCaseId });
      await this.escalateHospitalMatching(emergencyCaseId);
    }
  }

  /**
   * 현재 환자 위치에서 병원까지의 최적 이송 경로를 계산합니다.
   */
  async calculateTransportRoute(emergencyCaseId) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);

    try {
      const emergencyCase =
        await EmergencyCase.findById(emergencyCaseId).lean();
      const route = await calculateOptimalRoute({
        origin: emergencyCase.locations.current,
        destination: workflow.resources.hospital,
        // 중증 환자는 최단거리보다 가장 빠른 ETA를 목표로 경로 옵션을 선택합니다.
        priority: emergencyCase.emergencyLevel >= 4 ? "fastest" : "balanced",
        avoidTraffic: true,
        emergencyMode: true,
      });

      workflow.resources.route = route;

      this.addTimelineEvent(
        emergencyCaseId,
        "route_calculated",
        `최적 경로 계산 완료: ${route.distance}km, ${route.duration}분 예상`,
      );

      // 실시간 경로 업데이트
      emitStatusUpdate(emergencyCaseId, {
        route: route,
        message: `병원까지 ${route.duration}분 소요 예정`,
      });
    } catch (error) {
      logger.warn("경로 계산 실패", error, { emergencyCaseId });
      // 경로 계산 실패는 치명적이지 않으므로 워크플로우 계속
    }
  }

  /**
   * 응급구조사 현장 도착 시 상태를 갱신하고 다음 SLA 단계를 시작합니다.
   */
  async handleParamedicArrival(emergencyCaseId, paramedicId) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);

    workflow.state = this.WORKFLOW_STATES.PARAMEDIC_ARRIVED;
    this.clearSLATimer(emergencyCaseId, "PARAMEDIC_ARRIVAL");

    // 위치 추적 중단
    if (workflow.trackingInterval) {
      clearInterval(workflow.trackingInterval);
    }

    this.addTimelineEvent(
      emergencyCaseId,
      "paramedic_arrived",
      "응급구조사 현장 도착",
    );

    // 이송 준비 타이머 시작 (15분 내 이송 시작)
    this.startSLATimer(emergencyCaseId, "HOSPITAL_TRANSPORT", async () => {
      await this.escalateResponse(emergencyCaseId, "transport_delayed");
    });

    // 보호자/관제센터에 알림
    emitStatusUpdate(emergencyCaseId, {
      state: workflow.state,
      message: "응급구조사가 현장에 도착했습니다.",
      arrivalTime: new Date(),
    });
  }

  /**
   * 환자 이송 시작 시 ETA 계산과 병원 통보를 함께 수행합니다.
   */
  async handleTransportStart(emergencyCaseId) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);

    workflow.state = this.WORKFLOW_STATES.TRANSPORT_STARTED;
    this.clearSLATimer(emergencyCaseId, "HOSPITAL_TRANSPORT");

    this.addTimelineEvent(
      emergencyCaseId,
      "transport_started",
      "병원으로 이송 시작",
    );

    // 병원 도착 예정 시간 계산 및 알림
    const route = workflow.resources.route;
    if (route) {
      const expectedArrival = new Date(Date.now() + route.duration * 60 * 1000);

      emitStatusUpdate(emergencyCaseId, {
        state: workflow.state,
        message: `병원으로 이송 중 (도착 예정: ${expectedArrival.toLocaleTimeString()})`,
        expectedArrival,
      });

      // 병원에 도착 시간 통보
      await this.notifyHospitalETA(emergencyCaseId, expectedArrival);
    }

    // 실시간 이송 추적 시작
    await this.startTransportTracking(emergencyCaseId);
  }

  /**
   * 병원 도착 시 인수인계 단계로 전환하고 접수 SLA를 감시합니다.
   */
  async handleHospitalArrival(emergencyCaseId) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);

    workflow.state = this.WORKFLOW_STATES.HOSPITAL_ARRIVED;
    this.addTimelineEvent(emergencyCaseId, "hospital_arrived", "병원 도착");

    // 30분 내 환자 접수 타이머
    this.startSLATimer(emergencyCaseId, "HOSPITAL_ADMISSION", async () => {
      await this.escalateResponse(emergencyCaseId, "admission_delayed");
    });

    emitStatusUpdate(emergencyCaseId, {
      state: workflow.state,
      message: "병원에 도착했습니다. 인수인계 진행 중입니다.",
      hospitalArrivalTime: new Date(),
    });
  }

  /**
   * 워크플로우를 종료 처리하고 완료 리포트를 생성합니다.
   */
  async completeWorkflow(emergencyCaseId) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);

    workflow.state = this.WORKFLOW_STATES.COMPLETED;
    workflow.endTime = new Date();
    workflow.totalDuration = workflow.endTime - workflow.startTime;

    this.addTimelineEvent(
      emergencyCaseId,
      "workflow_completed",
      "응급 대응 완료",
    );

    // 모든 SLA 타이머 정리
    this.clearAllSLATimers(emergencyCaseId);

    // 완료 리포트 생성
    const report = await this.generateCompletionReport(emergencyCaseId);

    // 최종 상태 업데이트
    emitStatusUpdate(emergencyCaseId, {
      state: workflow.state,
      message: "응급 대응이 완료되었습니다.",
      completionReport: report,
    });

    // 워크플로우 아카이브
    this.archiveWorkflow(emergencyCaseId);

    logger.info(`응급 워크플로우 완료: ${emergencyCaseId}`, {
      totalDuration: workflow.totalDuration,
      slaViolations: workflow.slaStatus.violations.length,
    });
  }

  /**
   * 구조사 매칭 실패 시 단계별 에스컬레이션 전략을 실행합니다.
   */
  async escalateParamedicMatching(emergencyCaseId) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);
    workflow.escalationLevel++;

    logger.warn(
      `응급구조사 매칭 에스컬레이션: ${emergencyCaseId} (Level ${workflow.escalationLevel})`,
    );

    this.addTimelineEvent(
      emergencyCaseId,
      "escalation_paramedic",
      `응급구조사 매칭 에스컬레이션 Level ${workflow.escalationLevel}`,
    );

    if (workflow.escalationLevel === 1) {
      // 1차 에스컬레이션은 같은 매칭 로직으로 반경만 넓혀 재시도합니다.
      const matchResult = await autoMatchParamedicForCase(emergencyCaseId, {
        expandRadius: true,
        maxDistance: 20000, // 20km로 확장
      });

      if (matchResult.matched) {
        workflow.resources.paramedic = matchResult.paramedicId;
        await this.monitorParamedicResponse(emergencyCaseId);
        return;
      }
    }

    if (workflow.escalationLevel === 2) {
      // 2차 에스컬레이션: 다른 구역 응급구조사 동원
      await this.requestCrossDistrictParamedic(emergencyCaseId);
      return;
    }

    if (workflow.escalationLevel >= 3) {
      // 3차 에스컬레이션: 헬기 응급실 요청
      await this.requestAirAmbulance(emergencyCaseId);
      return;
    }
  }

  /**
   * 최고 단계 에스컬레이션으로 헬기 응급 출동 가능 여부를 확인합니다.
   */
  async requestAirAmbulance(emergencyCaseId) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);

    this.addTimelineEvent(
      emergencyCaseId,
      "air_ambulance_requested",
      "헬기 응급실 요청",
    );

    // 헬기 가용성 확인
    const airAmbulanceAvailable = await this.checkAirAmbulanceAvailability();

    if (airAmbulanceAvailable) {
      workflow.resources.ambulance = "air_ambulance";

      emitEscalation(emergencyCaseId, {
        level: "critical",
        action: "air_ambulance_dispatched",
        message: "헬기 응급실이 출동합니다.",
        eta: "15-20분",
      });

      // 관제센터 및 병원에 긴급 통보
      await this.notifyCriticalEscalation(emergencyCaseId);
    } else {
      // 헬기도 불가능한 경우 최고 단계 에스컬레이션
      await this.handleCriticalFailure(emergencyCaseId);
    }
  }

  /**
   * SLA 종류별 타이머를 등록해 제한 시간을 감시합니다.
   */
  startSLATimer(emergencyCaseId, slaType, callback) {
    const timeoutMs = this.SLA_TIMES[slaType] * 60 * 1000; // 분을 밀리초로

    const timeout = setTimeout(callback, timeoutMs);

    if (!this.slaTimeouts.has(emergencyCaseId)) {
      this.slaTimeouts.set(emergencyCaseId, {});
    }

    this.slaTimeouts.get(emergencyCaseId)[slaType] = timeout;
    this.shadowWriteWorkflowState(emergencyCaseId, {
      phase: "sla_started",
      slaType,
    }).catch(() => {});
  }

  /**
   * 특정 SLA 타이머 하나를 해제합니다.
   */
  clearSLATimer(emergencyCaseId, slaType) {
    const timers = this.slaTimeouts.get(emergencyCaseId);
    if (timers && timers[slaType]) {
      clearTimeout(timers[slaType]);
      delete timers[slaType];
      this.shadowWriteWorkflowState(emergencyCaseId, {
        phase: "sla_cleared",
        slaType,
      }).catch(() => {});
    }
  }

  /**
   * 케이스에 연결된 모든 SLA 타이머를 한 번에 정리합니다.
   */
  clearAllSLATimers(emergencyCaseId) {
    const timers = this.slaTimeouts.get(emergencyCaseId);
    if (timers) {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
      this.slaTimeouts.delete(emergencyCaseId);
    }
    this.shadowWriteWorkflowState(emergencyCaseId, {
      phase: "sla_cleared_all",
    }).catch(() => {});
  }

  /**
   * 현재 워크플로우 타임라인에 상태 변경 이벤트를 기록합니다.
   */
  addTimelineEvent(emergencyCaseId, eventType, description) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);
    if (workflow) {
      workflow.timeline.push({
        timestamp: new Date(),
        eventType,
        description,
        state: workflow.state,
      });
      this.shadowWriteWorkflowState(emergencyCaseId, {
        phase: "timeline_event",
        eventType,
        description,
      }).catch(() => {});
    }
  }

  /**
   * 메모리에 보관 중인 워크플로우 상태를 조회합니다.
   */
  getWorkflowStatus(emergencyCaseId) {
    return this.activeWorkflows.get(emergencyCaseId);
  }

  /**
   * 완료된 워크플로우의 요약 리포트 객체를 생성합니다.
   */
  async generateCompletionReport(emergencyCaseId) {
    const workflow = this.activeWorkflows.get(emergencyCaseId);

    return {
      caseId: emergencyCaseId,
      totalDuration: workflow.totalDuration,
      timeline: workflow.timeline,
      resources: workflow.resources,
      slaStatus: workflow.slaStatus,
      escalationLevel: workflow.escalationLevel,
      completedAt: workflow.endTime,
    };
  }

  /**
   * 주기 감시 작업을 등록해 워크플로우 시스템 모니터링을 시작합니다.
   */
  startSystemMonitoring() {
    // 활성 워크플로우 감시는 촘촘한 SLA 타이머와 별개로 5분 주기 점검을 추가합니다.
    cron.schedule("*/5 * * * *", async () => {
      await this.monitorActiveWorkflows();
    });

    // 집계성 성능 리포트는 부담을 줄이기 위해 매시간만 생성합니다.
    cron.schedule("0 * * * *", async () => {
      await this.generatePerformanceReport();
    });

    logger.info("응급 워크플로우 시스템 모니터링 시작");
  }

  /**
   * 활성 워크플로우를 순회하며 장시간 지연 케이스를 감시합니다.
   */
  async monitorActiveWorkflows() {
    const activeCount = this.activeWorkflows.size;
    const escalatedCount = Array.from(this.activeWorkflows.values()).filter(
      (w) => w.escalationLevel > 0,
    ).length;

    logger.info(`활성 워크플로우 모니터링`, {
      totalActive: activeCount,
      escalated: escalatedCount,
      pendingSLA: this.slaTimeouts.size,
    });

    // 장시간 지연되는 워크플로우 감지
    const now = new Date();
    for (const [caseId, workflow] of this.activeWorkflows) {
      const elapsedMinutes = (now - workflow.startTime) / (1000 * 60);

      if (
        elapsedMinutes > this.SLA_TIMES.TOTAL_RESPONSE &&
        workflow.escalationLevel === 0
      ) {
        logger.warn(`장시간 지연 워크플로우 감지: ${caseId}`, {
          elapsedMinutes: Math.round(elapsedMinutes),
          currentState: workflow.state,
        });

        // 자동 에스컬레이션
        await this.escalateResponse(caseId, "timeout_exceeded");
      }
    }
  }
}

/**
 * 서버 전역에서 재사용하는 응급 워크플로우 싱글톤 인스턴스입니다.
 */
const emergencyWorkflowService = new EmergencyWorkflowService();

module.exports = emergencyWorkflowService;
