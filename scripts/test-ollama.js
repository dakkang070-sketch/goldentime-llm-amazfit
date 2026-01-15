require('dotenv').config();
const axios = require('axios');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

async function testOllama() {
  console.log('🤖 Ollama 연결 테스트 시작...');
  console.log(`서버: ${OLLAMA_BASE_URL}`);
  console.log(`모델: ${OLLAMA_MODEL}`);
  console.log('');

  try {
    // 1. Ollama 서버 상태 확인
    console.log('1️⃣ Ollama 서버 상태 확인...');
    const healthResponse = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    console.log('✅ Ollama 서버 연결 성공');
    console.log(`설치된 모델: ${healthResponse.data.models?.map(m => m.name).join(', ') || '없음'}`);
    console.log('');

    // 2. 모델 확인
    const hasModel = healthResponse.data.models?.some(m => m.name.includes('llama3.1:8b'));
    if (!hasModel) {
      console.log('⚠️ Llama 3.1 8B 모델이 설치되어 있지 않습니다.');
      console.log(`다운로드 명령: ollama pull ${OLLAMA_MODEL}`);
      console.log('');
    } else {
      console.log('✅ Llama 3.1 8B 모델 확인됨');
      console.log('');
    }

    // 3. 간단한 생성 테스트
    console.log('2️⃣ 간단한 텍스트 생성 테스트...');
    const testPrompt = '안녕하세요. 간단히 인사만 해주세요.';
    const generateResponse = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: testPrompt,
      stream: false,
    });

    console.log('✅ 텍스트 생성 성공');
    console.log(`응답: ${generateResponse.data.response}`);
    console.log('');

    // 4. 실제 분석 테스트 (의료 데이터 시뮬레이션)
    console.log('3️⃣ 생체 데이터 분석 테스트...');
    const analysisPrompt = `다음 생체 데이터를 분석해주세요. 진단이 아닌 이상 징후 가능성과 권고사항만 제시해주세요.

심박수: 45 bpm
스트레스 지수: 85
움직임 상태: 정지

이 데이터를 기반으로 응급도 판정(1-5단계)과 간단한 권고사항을 제시해주세요.`;

    const analysisResponse = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: analysisPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
      },
    });

    console.log('✅ 분석 테스트 성공');
    console.log(`응답:\n${analysisResponse.data.response}`);
    console.log('');

    console.log('✅ 모든 테스트 통과!');
    console.log('');
    console.log('Ollama가 정상적으로 작동하고 있습니다.');
    console.log('환경변수 ENABLE_OLLAMA=true로 설정하면 LLM 분석이 활성화됩니다.');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Ollama 서버에 연결할 수 없습니다.');
      console.error('Ollama가 실행 중인지 확인하세요: ollama serve');
    } else if (error.response?.status === 404) {
      console.error('❌ 모델을 찾을 수 없습니다.');
      console.error(`모델 다운로드: ollama pull ${OLLAMA_MODEL}`);
    } else {
      console.error('❌ 오류:', error.message);
      if (error.response) {
        console.error('응답:', error.response.data);
      }
    }
    process.exit(1);
  }
}

testOllama();
