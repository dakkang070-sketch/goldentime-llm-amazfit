const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');
const INFO_LOG_FILE = path.join(LOG_DIR, 'info.log');

// 로그 디렉토리 생성
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * 로그 포맷팅
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}\n`;
}

/**
 * 에러 로그
 */
function error(message, error = null, meta = {}) {
  const logMessage = formatLog('ERROR', message, {
    ...meta,
    ...(error && {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    })
  });

  // 콘솔 출력
  console.error(logMessage.trim());

  // 파일 저장
  fs.appendFileSync(ERROR_LOG_FILE, logMessage, 'utf8');
}

/**
 * 정보 로그
 */
function info(message, meta = {}) {
  const logMessage = formatLog('INFO', message, meta);

  // 콘솔 출력
  console.log(logMessage.trim());

  // 파일 저장 (개발 환경에서는 선택적)
  if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
    fs.appendFileSync(INFO_LOG_FILE, logMessage, 'utf8');
  }
}

/**
 * 경고 로그
 */
function warn(message, meta = {}) {
  const logMessage = formatLog('WARN', message, meta);

  // 콘솔 출력
  console.warn(logMessage.trim());

  // 파일 저장
  fs.appendFileSync(ERROR_LOG_FILE, logMessage, 'utf8');
}

/**
 * 디버그 로그
 */
function debug(message, meta = {}) {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
    const logMessage = formatLog('DEBUG', message, meta);
    console.debug(logMessage.trim());
  }
}

module.exports = {
  error,
  info,
  warn,
  debug
};
