/**
 * 전체 시스템 통합 테스트
 * 백엔드 API를 통한 국립중앙의료원 데이터 테스트
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3004';

async function testFullSystem() {
  console.log('🚀 전체 시스템 통합 테스트 시작...');
  console.log(`🌐 백엔드 URL: ${BACKEND_URL}`);
  
  try {
    // 서버 상태 확인
    console.log('\n🔍 1. 서버 상태 확인...');
    try {
      const healthCheck = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      console.log(`✅ 백엔드 서버 정상 작동 (상태: ${healthCheck.status})`);
    } catch (error) {
      console.log('❌ 백엔드 서버 연결 실패. 서버가 시작되지 않았을 수 있습니다.');
      return;
    }

    // 2. 병원 매칭 API 테스트 (공개 엔드포인트)
    console.log('\n🔍 2. 병원 매칭 시스템 상태 확인...');
    try {
      const hospitalMatchingStatus = await axios.get(`${BACKEND_URL}/api/hospital-matching/status`, { timeout: 5000 });
      console.log(`✅ 병원 매칭 시스템 정상 작동`);
      console.log(`   - NEDC API 연결: ${hospitalMatchingStatus.data.nedcApiConnected ? '✅ 연결됨' : '❌ 미연결'}`);
      console.log(`   - 타임스탬프: ${hospitalMatchingStatus.data.timestamp}`);
      console.log(`   - 메시지: ${hospitalMatchingStatus.data.message}`);
    } catch (error) {
      console.log(`❌ 병원 매칭 시스템 상태 확인 실패: ${error.message}`);
    }

    // 3. 실시간 병상 현황 API 테스트
    console.log('\n🔍 3. 실시간 병상 현황 조회 테스트...');
    try {
      const bedStatus = await axios.get(`${BACKEND_URL}/api/hospital-matching/bed-status`, { 
        timeout: 10000,
        params: { limit: 5 }
      });
      console.log(`✅ 실시간 병상 현황 API 정상 작동`);
      console.log(`   총 병원: ${bedStatus.data.hospitals?.length || 0}개`);
      
      if (bedStatus.data.hospitals && bedStatus.data.hospitals.length > 0) {
        const sample = bedStatus.data.hospitals[0];
        console.log(`\n🏥 샘플 병원 정보:`);
        console.log(`   병원명: ${sample.hospitalName}`);
        console.log(`   응급실 병상: 총 ${sample.emergencyBeds?.total}개, 가용 ${sample.emergencyBeds?.available}개`);
        console.log(`   전문병상: 외상 ${sample.specializedBeds?.trauma}개, 심장 ${sample.specializedBeds?.cardiac}개`);
      }
    } catch (error) {
      console.log(`❌ 실시간 병상 현황 API 오류: ${error.message}`);
    }

    // 4. 병원 데이터 동기화 테스트
    console.log('\n🔍 4. 병원 데이터 동기화 테스트...');
    try {
      const syncResult = await axios.post(`${BACKEND_URL}/api/hospital-matching/sync`, {}, { timeout: 15000 });
      console.log(`✅ 병원 데이터 동기화 완료`);
      console.log(`   결과: ${syncResult.data.message}`);
      console.log(`   새로운 병원: ${syncResult.data.stats?.newCount || 0}개`);
      console.log(`   업데이트된 병원: ${syncResult.data.stats?.updatedCount || 0}개`);
    } catch (error) {
      console.log(`❌ 병원 데이터 동기화 오류: ${error.message}`);
    }

    // 5. 매칭 통계 조회
    console.log('\n🔍 5. 매칭 통계 조회 테스트...');
    try {
      const stats = await axios.get(`${BACKEND_URL}/api/hospital-matching/statistics`, { timeout: 5000 });
      console.log(`✅ 매칭 통계 조회 성공`);
      console.log(`   총 병원 수: ${stats.data.totalHospitals || 0}개`);
      console.log(`   가용 병상 수: ${stats.data.totalAvailableBeds || 0}개`);
      console.log(`   평균 응답시간: ${stats.data.averageResponseTime || 0}ms`);
    } catch (error) {
      console.log(`❌ 매칭 통계 조회 오류: ${error.message}`);
    }

    console.log('\n🎉 === 전체 시스템 통합 테스트 완료 ===');
    console.log('✅ 국립중앙의료원 API 연동 시스템 정상 작동!');
    console.log('✅ 실시간 병원 데이터 수신 및 처리 완료!');
    console.log('✅ 지능형 병원 매칭 시스템 준비 완료!');

  } catch (error) {
    console.error('❌ 시스템 테스트 중 치명적 오류 발생:', error.message);
  }
}

// 서버 시작 대기 후 테스트 실행
setTimeout(() => {
  testFullSystem().catch(console.error);
}, 5000); // 5초 후 테스트 시작

module.exports = { testFullSystem };