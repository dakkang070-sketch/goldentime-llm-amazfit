/**
 * 국립중앙의료원 API 실제 연동 테스트 스크립트
 * 실제 API 키로 데이터 조회 테스트
 */

require('dotenv').config();
const axios = require('axios');

const NEDC_BASE_URL = 'https://apis.data.go.kr/B552657';
const SERVICE_KEY = process.env.NEDC_API_SERVICE_KEY;

// API 엔드포인트들 (이미지 기준 실제 경로)
const endpoints = {
  // 응급실 실시간 가용병상정보 조회 (핵심)
  emergencyBeds: '/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire',
  
  // 중증질환자 수용가능병원 조회  
  severeCareHospitals: '/ErmctInfoInqireService/getSrsillDisAccptncrRspblInfoInqire',
  
  // 응급의료기관 목록정보 조회
  hospitalList: '/ErmctInfoInqireService/getEgytListInfoInqire',
  
  // 응급의료기관 위치정보 조회
  hospitalLocation: '/ErmctInfoInqireService/getEgytLcinfoInqire',
  
  // 응급의료기관 기본정보 조회
  hospitalBasicInfo: '/ErmctInfoInqireService/getEgytBassinfoInqire'
};

async function testNEDCApi() {
  console.log('🏥 국립중앙의료원 API 연동 테스트 시작...');
  console.log(`📡 베이스 URL: ${NEDC_BASE_URL}`);
  console.log(`🔑 서비스 키: ${SERVICE_KEY ? SERVICE_KEY.substring(0, 20) + '...' : '없음'}`);
  
  if (!SERVICE_KEY) {
    console.error('❌ API 서비스 키가 설정되지 않았습니다.');
    console.log('   환경변수에 NEDC_API_SERVICE_KEY를 설정해주세요.');
    return;
  }

  const testResults = [];

  // 1. 응급실 실시간 가용병상정보 조회 테스트
  console.log('\n🔍 1. 응급실 실시간 가용병상정보 조회 테스트...');
  try {
    const response = await axios.get(`${NEDC_BASE_URL}${endpoints.emergencyBeds}`, {
      params: {
        serviceKey: SERVICE_KEY,
        pageNo: 1,
        numOfRows: 10,
        _type: 'json'
      },
      timeout: 10000
    });

    if (response.data.response?.header?.resultCode === '00') {
      const items = response.data.response.body?.items?.item || [];
      console.log(`✅ 성공! ${items.length}개 병원 데이터 수신`);
      
      if (items.length > 0) {
        const sample = items[0];
        console.log(`   🏥 샘플 병원: ${sample.dutyName}`);
        console.log(`   📍 위치: ${sample.wgs84Lat}, ${sample.wgs84Lon}`);
        console.log(`   🛏️  응급실 병상: 전체 ${sample.hvec}개, 가용 ${sample.hvoc}개`);
        console.log(`   📞 연락처: ${sample.dutyTel1}`);
      }
      
      testResults.push({ api: '응급실 병상 정보', success: true, count: items.length });
    } else {
      console.log(`❌ API 오류: ${response.data.response?.header?.resultMsg}`);
      testResults.push({ api: '응급실 병상 정보', success: false, error: response.data.response?.header?.resultMsg });
    }
  } catch (error) {
    console.log(`❌ 요청 실패: ${error.message}`);
    testResults.push({ api: '응급실 병상 정보', success: false, error: error.message });
  }

  // 2. 응급의료기관 목록정보 조회 테스트
  console.log('\n🔍 2. 응급의료기관 목록정보 조회 테스트...');
  try {
    const response = await axios.get(`${NEDC_BASE_URL}${endpoints.hospitalList}`, {
      params: {
        serviceKey: SERVICE_KEY,
        pageNo: 1,
        numOfRows: 10,
        _type: 'json'
      },
      timeout: 10000
    });

    if (response.data.response?.header?.resultCode === '00') {
      const items = response.data.response.body?.items?.item || [];
      console.log(`✅ 성공! ${items.length}개 응급의료기관 데이터 수신`);
      
      if (items.length > 0) {
        const sample = items[0];
        console.log(`   🏥 응급의료기관: ${sample.dutyName}`);
        console.log(`   🏷️  기관 ID: ${sample.hpid}`);
        console.log(`   📍 주소: ${sample.dutyAddr}`);
      }
      
      testResults.push({ api: '응급의료기관 목록', success: true, count: items.length });
    } else {
      console.log(`❌ API 오류: ${response.data.response?.header?.resultMsg}`);
      testResults.push({ api: '응급의료기관 목록', success: false, error: response.data.response?.header?.resultMsg });
    }
  } catch (error) {
    console.log(`❌ 요청 실패: ${error.message}`);
    testResults.push({ api: '응급의료기관 목록', success: false, error: error.message });
  }

  // 3. 중증질환자 수용가능병원 조회 테스트
  console.log('\n🔍 3. 중증질환자 수용가능병원 조회 테스트...');
  try {
    const response = await axios.get(`${NEDC_BASE_URL}${endpoints.severeCareHospitals}`, {
      params: {
        serviceKey: SERVICE_KEY,
        pageNo: 1,
        numOfRows: 10,
        _type: 'json'
      },
      timeout: 10000
    });

    if (response.data.response?.header?.resultCode === '00') {
      const items = response.data.response.body?.items?.item || [];
      console.log(`✅ 성공! ${items.length}개 중증 수용 가능 병원 데이터 수신`);
      
      if (items.length > 0) {
        const sample = items[0];
        console.log(`   🏥 중증 수용 병원: ${sample.dutyName}`);
        console.log(`   🚨 중증 수용 가능: ${sample.MKioskTy1 || '정보없음'}`);
      }
      
      testResults.push({ api: '중증질환자 수용가능병원', success: true, count: items.length });
    } else {
      console.log(`❌ API 오류: ${response.data.response?.header?.resultMsg}`);
      testResults.push({ api: '중증질환자 수용가능병원', success: false, error: response.data.response?.header?.resultMsg });
    }
  } catch (error) {
    console.log(`❌ 요청 실패: ${error.message}`);
    testResults.push({ api: '중증질환자 수용가능병원', success: false, error: error.message });
  }

  // 결과 요약
  console.log('\n📊 === API 테스트 결과 요약 ===');
  console.log(`🔑 사용 API 키: ${SERVICE_KEY ? '설정됨' : '미설정'}`);
  console.log(`📡 테스트한 API: ${testResults.length}개`);
  
  const successCount = testResults.filter(r => r.success).length;
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${testResults.length - successCount}개`);

  testResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${index + 1}. ${result.api}: ${result.success ? `${result.count}개 데이터` : result.error}`);
  });

  if (successCount === testResults.length) {
    console.log('\n🎉 모든 API 테스트 성공! 국립중앙의료원 API 연동 준비 완료!');
  } else {
    console.log('\n⚠️  일부 API 연동에 문제가 있습니다. API 키와 엔드포인트를 확인해주세요.');
  }

  return {
    totalTests: testResults.length,
    successCount,
    failureCount: testResults.length - successCount,
    results: testResults
  };
}

// 테스트 실행
if (require.main === module) {
  testNEDCApi().catch(error => {
    console.error('❌ API 테스트 중 치명적 오류 발생:', error.message);
  });
}

module.exports = { testNEDCApi };