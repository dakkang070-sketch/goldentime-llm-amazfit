/**
 * API 응답 형식 통일 미들웨어
 */
function successResponse(data, message = '성공', statusCode = 200) {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

function errorResponse(message, statusCode = 400, errors = null) {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errors) {
    response.errors = errors;
  }

  return response;
}

/**
 * 응답 래퍼 미들웨어
 */
function wrapAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 성공 응답 헬퍼
 */
function sendSuccess(res, data, message, statusCode = 200) {
  res.status(statusCode).json(successResponse(data, message, statusCode));
}

/**
 * 에러 응답 헬퍼
 */
function sendError(res, message, statusCode = 400, errors = null) {
  res.status(statusCode).json(errorResponse(message, statusCode, errors));
}

module.exports = {
  successResponse,
  errorResponse,
  wrapAsync,
  sendSuccess,
  sendError
};
