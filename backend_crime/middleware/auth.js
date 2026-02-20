const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    // 개발 중에는 역할 검증을 건너뜀
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
    
    if (!req.user || !req.user.role) {
      return res.status(403).json({ 
        success: false, 
        message: '권한 정보가 없습니다.' 
      });
    }
    
    if (req.user.role !== role) {
      return res.status(403).json({ 
        success: false, 
        message: `${role} 권한이 필요합니다.` 
      });
    }
    
    next();
  };
}

module.exports = { 
  authRequired,
  authenticateToken: authRequired,  // 별칭 추가
  requireRole,                      // 역할 기반 인증
  requireAuth: authRequired         // 추가 별칭
};

