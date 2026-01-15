const validator = require('validator');

/**
 * 요청 데이터 검증 미들웨어
 */
function validateRequest(rules) {
  return (req, res, next) => {
    const errors = {};

    Object.keys(rules).forEach(field => {
      const rule = rules[field];
      const value = req.body[field] || req.query[field] || req.params[field];

      // 필수 체크
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors[field] = `${field}는 필수입니다.`;
        return;
      }

      // 값이 없으면 다음 규칙으로
      if (value === undefined || value === null || value === '') {
        return;
      }

      // 타입 체크
      if (rule.type) {
        if (rule.type === 'email' && !validator.isEmail(String(value))) {
          errors[field] = `${field}는 유효한 이메일 형식이어야 합니다.`;
          return;
        }
        if (rule.type === 'phone' && !/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(String(value))) {
          errors[field] = `${field}는 유효한 전화번호 형식이어야 합니다.`;
          return;
        }
        if (rule.type === 'number' && typeof value !== 'number' && isNaN(value)) {
          errors[field] = `${field}는 숫자여야 합니다.`;
          return;
        }
        if (rule.type === 'string' && typeof value !== 'string') {
          errors[field] = `${field}는 문자열이어야 합니다.`;
          return;
        }
        if (rule.type === 'boolean' && typeof value !== 'boolean') {
          errors[field] = `${field}는 불린 값이어야 합니다.`;
          return;
        }
      }

      // 길이 체크
      if (rule.minLength && String(value).length < rule.minLength) {
        errors[field] = `${field}는 최소 ${rule.minLength}자 이상이어야 합니다.`;
        return;
      }
      if (rule.maxLength && String(value).length > rule.maxLength) {
        errors[field] = `${field}는 최대 ${rule.maxLength}자 이하여야 합니다.`;
        return;
      }

      // 범위 체크
      if (rule.min !== undefined && Number(value) < rule.min) {
        errors[field] = `${field}는 ${rule.min} 이상이어야 합니다.`;
        return;
      }
      if (rule.max !== undefined && Number(value) > rule.max) {
        errors[field] = `${field}는 ${rule.max} 이하여야 합니다.`;
        return;
      }

      // 열거형 체크
      if (rule.enum && !rule.enum.includes(value)) {
        errors[field] = `${field}는 ${rule.enum.join(', ')} 중 하나여야 합니다.`;
        return;
      }
    });

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: '입력값 검증 실패',
        errors
      });
    }

    next();
  };
}

module.exports = { validateRequest };
