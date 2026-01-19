/**
 * 환경변수 검증
 */
function validateEnv() {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ 필수 환경변수가 설정되지 않았습니다:');
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    console.error('\n.env 파일을 확인하거나 config/env.example을 참고하세요.');
    process.exit(1);
  }

  // 선택적 환경변수 경고
  const optional = {
    'OLLAMA_BASE_URL': 'Ollama LLM 분석이 비활성화됩니다.',
    'ZEPP_CLIENT_ID': 'Zepp API 연동이 불가능합니다.',
    'ZEPP_CLIENT_SECRET': 'Zepp API 연동이 불가능합니다.'
  };

  Object.entries(optional).forEach(([key, message]) => {
    if (!process.env[key]) {
      console.warn(`⚠️  ${key}가 설정되지 않았습니다. ${message}`);
    }
  });

  console.log('✅ 환경변수 검증 완료');
}

module.exports = { validateEnv };
