const express = require('express');
const ZeppCredential = require('../models/ZeppCredential');
const { exchangeCodeForToken } = require('../services/zeppClient');

const router = express.Router();

/**
 * Zepp OAuth 시작 URL을 만들어주는 엔드포인트(개발 편의용)
 * - 실제 authorize URL, scope, state 규칙은 Zepp 문서/콘솔 기준으로 확정해야 합니다.
 */
router.get('/oauth/authorize-url', async (req, res) => {
  const { ZEPP_CLIENT_ID, ZEPP_REDIRECT_URI, ZEPP_API_BASE_URL } = process.env;
  if (!ZEPP_CLIENT_ID || !ZEPP_REDIRECT_URI || !ZEPP_API_BASE_URL) {
    return res.status(500).json({ success: false, message: 'ZEPP 환경변수가 설정되지 않았습니다.' });
  }

  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId 쿼리가 필요합니다.' });
  }

  // TODO: Zepp authorize 엔드포인트로 수정
  const authorizeUrl = `${ZEPP_API_BASE_URL}/oauth/authorize?response_type=code&client_id=${encodeURIComponent(
    ZEPP_CLIENT_ID
  )}&redirect_uri=${encodeURIComponent(ZEPP_REDIRECT_URI)}&state=${encodeURIComponent(String(userId))}`;

  res.json({ success: true, authorizeUrl });
});

/**
 * OAuth 콜백 (code → token 교환 후 DB 저장)
 * - state에 userId를 싣는 방식은 MVP 편의용입니다. 운영 시에는 CSRF 방지 state를 별도로 관리하세요.
 */
router.get('/oauth/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('code가 필요합니다.');
    if (!state) return res.status(400).send('state(userId)가 필요합니다.');

    const token = await exchangeCodeForToken(String(code));

    // 토큰 응답 필드명은 Zepp 문서 확정 후 조정
    const expiresIn = token.expires_in ? Number(token.expires_in) : undefined;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;

    await ZeppCredential.findOneAndUpdate(
      { userId: String(state) },
      {
        userId: String(state),
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenType: token.token_type,
        scope: token.scope,
        expiresAt,
        status: 'connected',
        lastError: undefined,
      },
      { upsert: true, new: true }
    );

    // MVP: 브라우저에서 바로 확인 가능하게 텍스트 응답
    res.send('Zepp 연결 완료. 이 창을 닫아도 됩니다.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

