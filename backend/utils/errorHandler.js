/**
 * 사용자 친화적 에러 메시지 변환
 */
const logger = require('./logger');

const errorMessages = {
  // 인증 관련
  'Unauthorized': '인증이 필요합니다. 로그인해주세요.',
  'Invalid token': '유효하지 않은 토큰입니다.',
  'Token expired': '토큰이 만료되었습니다. 다시 로그인해주세요.',
  
  // 권한 관련
  'Forbidden': '접근 권한이 없습니다.',
  'Permission denied': '권한이 없습니다.',
  
  // 데이터 관련
  'Not found': '요청한 데이터를 찾을 수 없습니다.',
  'Already exists': '이미 존재하는 데이터입니다.',
  'Validation failed': '입력값이 올바르지 않습니다.',
  'Invalid input': '잘못된 입력입니다.',
  
  // 서버 관련
  'Database error': '데이터베이스 오류가 발생했습니다.',
  'Internal server error': '서버 오류가 발생했습니다.',
  'Service unavailable': '서비스를 사용할 수 없습니다.',
};

/**
 * 에러를 사용자 친화적 메시지로 변환
 */
function getUserFriendlyMessage(error) {
  const errorMessage = error.message || error.toString();
  
  // 직접 매칭되는 메시지가 있으면 반환
  if (errorMessages[errorMessage]) {
    return errorMessages[errorMessage];
  }
  
  // 부분 매칭 시도
  for (const [key, value] of Object.entries(errorMessages)) {
    if (errorMessage.includes(key)) {
      return value;
    }
  }
  
  // MongoDB 에러 처리
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    if (error.code === 11000) {
      return '이미 존재하는 데이터입니다.';
    }
    return '데이터베이스 오류가 발생했습니다.';
  }
  
  // Mongoose 검증 에러
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(e => e.message);
    return `입력값 검증 실패: ${messages.join(', ')}`;
  }
  
  // 기본 메시지
  return errorMessage || '알 수 없는 오류가 발생했습니다.';
}

/**
 * 에러 응답 생성
 */
function createErrorResponse(error, req) {
  const statusCode = error.statusCode || error.status || 500;
  const message = getUserFriendlyMessage(error);
  
  // 개발 환경에서만 상세 정보 포함
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (process.env.NODE_ENV === 'development') {
    response.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  
  // 특정 에러 타입에 대한 추가 정보
  if (error.errors && Object.keys(error.errors).length > 0) {
    response.errors = error.errors;
  }
  
  return { statusCode, response };
}

module.exports = {
  getUserFriendlyMessage,
  createErrorResponse
};
