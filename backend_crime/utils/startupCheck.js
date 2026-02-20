/**
 * 서버 시작 시 초기화 체크
 */
const mongoose = require('mongoose');
const logger = require('./logger');

async function checkDatabase() {
  try {
    const state = mongoose.connection.readyState;
    if (state === 1) {
      logger.info('MongoDB 연결 확인됨');
      return true;
    }
    logger.warn('MongoDB 연결 상태 확인 필요', { state });
    return false;
  } catch (error) {
    logger.error('MongoDB 연결 체크 실패', error);
    return false;
  }
}

async function checkRequiredCollections() {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const required = ['users', 'biometricdatas', 'emergencycases', 'paramedics', 'hospitals', 'controllers'];
    const missing = required.filter(name => !collectionNames.includes(name));
    
    if (missing.length > 0) {
      logger.info('필수 컬렉션이 없습니다. 첫 실행 시 자동 생성됩니다.', { missing });
    } else {
      logger.info('필수 컬렉션 확인 완료');
    }
    
    return true;
  } catch (error) {
    logger.error('컬렉션 체크 실패', error);
    return false;
  }
}

async function checkEnvironmentVariables() {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error('필수 환경변수가 없습니다', { missing });
    return false;
  }
  
  logger.info('환경변수 확인 완료');
  return true;
}

async function checkOllama() {
  if (process.env.ENABLE_OLLAMA !== 'true') {
    logger.info('Ollama가 비활성화되어 있습니다.');
    return true;
  }

  try {
    const axios = require('axios');
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    await axios.get(`${ollamaUrl}/api/tags`, { timeout: 3000 });
    logger.info('Ollama 연결 확인됨');
    return true;
  } catch (error) {
    logger.warn('Ollama 연결 실패. LLM 분석이 비활성화됩니다.', { error: error.message });
    return false;
  }
}

async function performStartupChecks() {
  logger.info('서버 시작 체크 시작...');
  
  const checks = [
    { name: '환경변수', fn: checkEnvironmentVariables },
    { name: '데이터베이스', fn: checkDatabase },
    { name: '컬렉션', fn: checkRequiredCollections },
    { name: 'Ollama', fn: checkOllama }
  ];

  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, success: result });
    } catch (error) {
      logger.error(`체크 실패: ${check.name}`, error);
      results.push({ name: check.name, success: false, error: error.message });
    }
  }

  const failed = results.filter(r => !r.success);
  
  if (failed.length > 0) {
    logger.warn('일부 체크가 실패했습니다', { failed: failed.map(f => f.name) });
  } else {
    logger.info('모든 시작 체크 완료');
  }

  return results;
}

module.exports = {
  performStartupChecks,
  checkDatabase,
  checkRequiredCollections,
  checkEnvironmentVariables,
  checkOllama
};
