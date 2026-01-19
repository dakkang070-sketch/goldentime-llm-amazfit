const axios = require('axios');

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    const err = new Error(`환경변수 누락: ${name}`);
    err.statusCode = 500;
    throw err;
  }
  return v;
}

function getZeppConfig() {
  return {
    clientId: requireEnv('ZEPP_CLIENT_ID'),
    clientSecret: requireEnv('ZEPP_CLIENT_SECRET'),
    redirectUri: requireEnv('ZEPP_REDIRECT_URI'),
    baseUrl: requireEnv('ZEPP_API_BASE_URL'),
  };
}

/**
 * Zepp API 호출용 Axios 인스턴스 생성
 * - 실제 헤더/서명 방식은 문서 확정 후 반영
 */
function createZeppApi(accessToken) {
  const { baseUrl } = getZeppConfig();
  return axios.create({
    baseURL: baseUrl,
    timeout: 15000,
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
  });
}

/**
 * OAuth 토큰 교환/갱신 (엔드포인트/파라미터는 Zepp 문서 확정 후 수정)
 * 지금은 “골격”만 제공하고, 실제 URL/필드명은 TODO로 남깁니다.
 */
async function exchangeCodeForToken(code) {
  const { clientId, clientSecret, redirectUri, baseUrl } = getZeppConfig();
  // TODO: Zepp OAuth 토큰 엔드포인트로 수정
  const url = `${baseUrl}/oauth/token`;
  const resp = await axios.post(
    url,
    {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    },
    { timeout: 15000 }
  );
  return resp.data;
}

async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret, baseUrl } = getZeppConfig();
  // TODO: Zepp OAuth 토큰 엔드포인트로 수정
  const url = `${baseUrl}/oauth/token`;
  const resp = await axios.post(
    url,
    {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    },
    { timeout: 15000 }
  );
  return resp.data;
}

module.exports = {
  getZeppConfig,
  createZeppApi,
  exchangeCodeForToken,
  refreshAccessToken,
};

