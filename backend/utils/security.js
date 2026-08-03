const cors = require("cors");
const helmet = require("helmet");

const DEFAULT_ALLOWED_ORIGINS = [
  "https://z-adm.goldentime.sbs",
  "https://z-con.goldentime.sbs",
  "https://control-ama.goldentime.sbs",
  "https://admin-ama.goldentime.sbs",
  "https://mobile-ama.goldentime.sbs",
  "https://appassets.androidplatform.net",
  "https://guardian-ama.goldentime.sbs",
  "https://welfare-ama.goldentime.sbs",
  "http://localhost:4001",
  "http://localhost:4002",
  "http://localhost:8010",
  "http://localhost:8030",
  "http://localhost:8040",
  "http://localhost:8050",
  "http://localhost:8063",
  "http://localhost:8060",
  "http://localhost:8070",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://127.0.0.1:4001",
  "http://127.0.0.1:4002",
  "http://127.0.0.1:8010",
  "http://127.0.0.1:8030",
  "http://127.0.0.1:8040",
  "http://127.0.0.1:8050",
  "http://127.0.0.1:8063",
  "http://127.0.0.1:8060",
  "http://127.0.0.1:8070",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
  "http://127.0.0.1:5177",
];

const WEAK_JWT_SECRETS = new Set([
  "",
  "change-me",
  "changeme",
  "secret",
  "jwt-secret",
  "default",
  "test",
]);

/**
 * 환경변수와 기본 도메인을 합쳐 중복 없는 허용 Origin 목록을 생성합니다.
 */
function getAllowedOrigins() {
  const envOrigins = String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]));
}

/**
 * 브라우저 요청 Origin이 현재 서비스에서 허용 가능한지 판별합니다.
 */
function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (origin === "null") {
    return process.env.ALLOW_NULL_ORIGIN !== "false";
  }

  return getAllowedOrigins().includes(origin);
}

/**
 * Express CORS 미들웨어에 사용할 동적 Origin 검사 옵션을 생성합니다.
 */
function createCorsMiddleware() {
  return cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  });
}

/**
 * Socket.IO에서 재사용할 수 있도록 CORS 옵션 객체를 생성합니다.
 */
function createSocketCorsOptions() {
  return {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("허용되지 않은 Socket Origin입니다."));
    },
    methods: ["GET", "POST"],
    credentials: false,
  };
}

/**
 * 서버 전반에 적용할 공통 보안 헤더 미들웨어를 등록합니다.
 */
function applySecurityHeaders(app) {
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      hsts: process.env.NODE_ENV === "production",
      referrerPolicy: { policy: "no-referrer" },
    }),
  );

  app.use((req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self), fullscreen=(self)");
    next();
  });
}

/**
 * 정적 파일 공개 시 캐시/스니핑 관련 기본 보안 헤더를 적용합니다.
 */
function createStaticOptions(overrides = {}) {
  return {
    dotfiles: "deny",
    etag: false,
    fallthrough: false,
    index: false,
    setHeaders(res) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
    ...overrides,
  };
}

/**
 * JWT 시크릿이 기본값이나 지나치게 짧은 값인지 점검합니다.
 */
function isWeakJwtSecret(secret) {
  const normalized = String(secret || "").trim();
  return normalized.length < 32 || WEAK_JWT_SECRETS.has(normalized.toLowerCase());
}

/**
 * 현재 환경에서 사용 가능한 JWT 시크릿을 반환하고, 위험한 설정은 즉시 차단합니다.
 */
function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (!secret) {
    throw new Error("JWT_SECRET 환경변수가 필요합니다.");
  }

  if (isWeakJwtSecret(secret)) {
    throw new Error("JWT_SECRET 값이 너무 약합니다. 32자 이상의 안전한 값으로 교체해주세요.");
  }

  return secret;
}

/**
 * 서버 시작 단계에서 JWT 시크릿 강도를 환경별 정책에 따라 검증합니다.
 */
function validateJwtSecretStrength() {
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (!secret) {
    return;
  }

  if (!isWeakJwtSecret(secret)) {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    console.error("❌ JWT_SECRET 값이 너무 약합니다. 32자 이상의 안전한 값으로 교체해주세요.");
    process.exit(1);
  }

  console.warn("⚠️ JWT_SECRET 값이 약합니다. 운영 배포 전 32자 이상의 안전한 값으로 교체하세요.");
}

module.exports = {
  applySecurityHeaders,
  createCorsMiddleware,
  createSocketCorsOptions,
  createStaticOptions,
  getAllowedOrigins,
  getJwtSecret,
  isAllowedOrigin,
  validateJwtSecretStrength,
};
