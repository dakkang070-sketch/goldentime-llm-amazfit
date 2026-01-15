/**
 * 국립중앙의료원 API 응답 구조 상세 분석
 */

require('dotenv').config();
const axios = require('axios');

const NEDC_BASE_URL = 'https://apis.data.go.kr/B552657';
const SERVICE_KEY = process.env.NEDC_API_SERVICE_KEY || 'f77c4cc08ca51e363f167702969f0f94f2b8c27cfe9eeeea365caea7dfd37670';

async function analyzeResponseStructure() {
  console.log('🔍 국립중앙의료원 API 응답 구조 상세 분석...');

  try {
    // 응급실 실시간 가용병상정보 상세 분석
    console.log('\n📊 1. 응급실 실시간 가용병상정보 응답 구조 분석...');
    const bedResponse = await axios.get(`${NEDC_BASE_URL}/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire`, {
      params: {
        serviceKey: SERVICE_KEY,
        pageNo: 1,
        numOfRows: 3,
        _type: 'json'
      },
      timeout: 10000
    });

    if (bedResponse.data.response?.header?.resultCode === '00') {
      const items = bedResponse.data.response.body?.items?.item || [];
      console.log(`✅ 총 ${items.length}개 병원 데이터 수신`);
      
      if (items.length > 0) {
        console.log('\n🏥 첫 번째 병원 데이터 전체 구조:');
        console.log(JSON.stringify(items[0], null, 2));
        
        console.log('\n📋 사용 가능한 필드들:');
        Object.keys(items[0]).forEach(key => {
          const value = items[0][key];
          console.log(`   ${key}: ${value} (${typeof value})`);
        });
      }
    }

    // 응급의료기관 목록정보 상세 분석
    console.log('\n📊 2. 응급의료기관 목록정보 응답 구조 분석...');
    const hospitalResponse = await axios.get(`${NEDC_BASE_URL}/ErmctInfoInqireService/getEgytListInfoInqire`, {
      params: {
        serviceKey: SERVICE_KEY,
        pageNo: 1,
        numOfRows: 2,
        _type: 'json'
      },
      timeout: 10000
    });

    if (hospitalResponse.data.response?.header?.resultCode === '00') {
      const items = hospitalResponse.data.response.body?.items?.item || [];
      console.log(`✅ 총 ${items.length}개 응급의료기관 데이터 수신`);
      
      if (items.length > 0) {
        console.log('\n🏥 첫 번째 응급의료기관 데이터 전체 구조:');
        console.log(JSON.stringify(items[0], null, 2));
      }
    }

    // API 전체 응답 구조 분석
    console.log('\n📊 3. API 전체 응답 구조 분석...');
    console.log('응답 헤더 구조:');
    console.log(JSON.stringify(bedResponse.data.response.header, null, 2));
    
    console.log('\n응답 바디 구조:');
    console.log(`- totalCount: ${bedResponse.data.response.body.totalCount}`);
    console.log(`- pageNo: ${bedResponse.data.response.body.pageNo}`);
    console.log(`- numOfRows: ${bedResponse.data.response.body.numOfRows}`);
    console.log(`- items 타입: ${typeof bedResponse.data.response.body.items}`);

  } catch (error) {
    console.error('❌ API 분석 중 오류 발생:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 분석 실행
if (require.main === module) {
  analyzeResponseStructure().catch(console.error);
}

module.exports = { analyzeResponseStructure };