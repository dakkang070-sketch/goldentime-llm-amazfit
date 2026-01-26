const socketIO = require("socket.io");

let io = null;

/**
 * Socket.IO 서버 초기화
 */
function initializeSocket(server) {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`✅ 클라이언트 연결: ${socket.id}`);

    // 인증 처리
    socket.on("authenticate", async (data) => {
      try {
        const { token, role } = data;
        if (!token) {
          socket.emit("auth_error", { message: "토큰이 필요합니다." });
          return;
        }

        // JWT 검증 (간단한 예시, 실제로는 jwtService 사용)
        const jwtService = require("./jwtService");
        const decoded = jwtService.verifyToken(token);

        if (!decoded) {
          socket.emit("auth_error", { message: "유효하지 않은 토큰입니다." });
          return;
        }

        // 역할별 룸 가입
        socket.userId = decoded.userId || decoded.sub;
        socket.role = decoded.role;

        if (socket.role === "controller") {
          socket.join("controllers");
          console.log(`관제사 연결: ${socket.userId}`);
        } else if (socket.role === "paramedic") {
          socket.join("paramedics");
          socket.join(`paramedic:${socket.userId}`);
          console.log(`응급구조사 연결: ${socket.userId}`);
        } else if (socket.role === "user") {
          socket.join(`user:${socket.userId}`);
          console.log(`사용자 연결: ${socket.userId}`);
        }

        socket.emit("authenticated", { success: true, role: socket.role });
      } catch (error) {
        console.error("인증 오류:", error);
        socket.emit("auth_error", { message: "인증 실패" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ 클라이언트 연결 해제: ${socket.id}`);
    });
  });

  return io;
}

/**
 * 응급 케이스 생성 알림
 */
function emitEmergencyCaseCreated(caseData) {
  if (!io) return;

  // 관제사에게 알림
  io.to("controllers").emit("emergency_case_created", caseData);

  // 해당 사용자에게 알림
  if (caseData.userId) {
    io.to(`user:${caseData.userId}`).emit("emergency_detected", caseData);
  }
}

/**
 * 응급구조사 매칭 알림
 */
function emitParamedicMatched(caseId, paramedicId, caseData) {
  if (!io) return;

  // 해당 응급구조사에게 알림
  io.to(`paramedic:${paramedicId}`).emit("case_assigned", {
    caseId,
    ...caseData,
  });

  // 관제사에게 업데이트 알림
  io.to("controllers").emit("case_updated", {
    caseId,
    type: "paramedic_matched",
    paramedicId,
  });
}

/**
 * 학교 폭력 케이스 생성 알림
 */
function emitSchoolViolenceCaseCreated(caseData) {
  if (!io) return;

  // 모든 클라이언트에게 알림 (Broadcast)
  io.emit("school_violence_case_created", caseData);
}

/**
 * 케이스 상태 업데이트 알림
 */
function emitCaseStatusUpdated(caseId, status, updates) {
  if (!io) return;

  const updateData = {
    caseId,
    status,
    ...updates,
    timestamp: new Date().toISOString(),
  };

  // 모든 관제사에게 알림
  io.to("controllers").emit("case_updated", updateData);

  // 관련 응급구조사에게 알림
  if (updates.paramedicId) {
    io.to(`paramedic:${updates.paramedicId}`).emit("case_updated", updateData);
  }

  // 사용자에게 알림
  if (updates.userId) {
    io.to(`user:${updates.userId}`).emit("case_status_updated", updateData);
  }
}

/**
 * 응급구조사 위치 업데이트 알림
 */
function emitParamedicLocationUpdated(paramedicId, location, caseId) {
  if (!io) return;

  const updateData = {
    paramedicId,
    location,
    caseId,
    timestamp: new Date().toISOString(),
  };

  // 관제사에게 알림
  io.to("controllers").emit("paramedic_location_updated", updateData);

  // 해당 케이스의 사용자에게 알림
  if (caseId) {
    io.emit("paramedic_location", updateData);
  }
}

/**
 * 생체 데이터 업데이트 알림 (관제사용)
 */
function emitBiometricDataUpdated(userId, biometricData) {
  if (!io) return;

  io.to("controllers").emit("biometric_data_updated", {
    userId,
    biometricData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 병원 매칭 알림
 */
function emitHospitalMatched(caseId, hospitalId, hospitalData) {
  if (!io) return;

  io.to("controllers").emit("case_updated", {
    caseId,
    type: "hospital_matched",
    hospitalId,
    hospitalData,
  });
}

module.exports = {
  initializeSocket,
  emitEmergencyCaseCreated,
  emitParamedicMatched,
  emitCaseStatusUpdated,
  emitParamedicLocationUpdated,
  emitBiometricDataUpdated,
  emitHospitalMatched,
  emitSchoolViolenceCaseCreated,
  getIO: () => io,
};
