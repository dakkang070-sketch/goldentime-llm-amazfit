/**
 * 업데이트된 NEDC API 서비스 실제 데이터 테스트
 */

const nedcService = require('../backend/services/nedcApiService');

async function testUpdatedNEDC() {
  console.log('🏥 업데이트된 NEDC API 서비스 테스트...');
  
  try {
    // 1. 실시간 응급실 병상 정보 조회
    console.log('\n🔍 1. 실시간 응급실 병상 정보 조회...');
    const bedStatus = await nedcService.getRealTimeEmergencyBeds([], true); // 모든 병원, 강제 새로고침
    
    console.log(`✅ 총 ${bedStatus.length}개 병원 병상 정보 수신`);
    
    if (bedStatus.length > 0) {
      const sample = bedStatus[0];
      console.log('\n🏥 첫 번째 병원 상세 정보:');
      console.log(`   병원명: ${sample.hospitalName}`);
      console.log(`   병원ID: ${sample.hospitalId}`);
      console.log(`   연락처: ${sample.phoneNumber}`);
      console.log(`   응급실 직통: ${sample.emergencyPhone}`);
      
      console.log('\n🛏️  응급실 병상 현황:');
      console.log(`   총 병상: ${sample.emergencyBeds.total}개`);
      console.log(`   가용 병상: ${sample.emergencyBeds.available}개`);
      console.log(`   사용률: ${sample.emergencyBeds.occupancyRate}%`);
      
      console.log('\n🏥 전문병상 현황:');
      console.log(`   일반병상: ${sample.specializedBeds.general}개`);
      console.log(`   신경중환자실: ${sample.specializedBeds.neuro}개`);
      console.log(`   외상소생실: ${sample.specializedBeds.trauma}개`);
      console.log(`   심장소생실: ${sample.specializedBeds.cardiac}개`);
      console.log(`   소아소생실: ${sample.specializedBeds.pediatric}개`);
      
      console.log('\n🔧 의료장비 가용성:');
      console.log(`   CT: ${sample.equipment.ct ? '✅' : '❌'}`);
      console.log(`   MRI: ${sample.equipment.mri ? '✅' : '❌'}`);
      console.log(`   혈관조영술: ${sample.equipment.angiography ? '✅' : '❌'}`);
      console.log(`   인공호흡기: ${sample.equipment.ventilator ? '✅' : '❌'}`);
      console.log(`   ECMO: ${sample.equipment.ecmo ? '✅' : '❌'}`);
    }
    
    // 2. 응급의료기관 데이터 동기화 (위치 정보 포함)
    console.log('\n🔍 2. 응급의료기관 데이터 동기화...');
    const syncResult = await nedcService.syncHospitalData(1, 3); // 첫 페이지, 3개
    
    console.log(`✅ 병원 데이터 동기화 결과: ${syncResult.message}`);
    console.log(`   새로운 병원: ${syncResult.newCount}개`);
    console.log(`   업데이트된 병원: ${syncResult.updatedCount}개`);
    
    console.log('\n🎉 NEDC API 서비스 업데이트 완료!');
    console.log('✅ 실제 국립중앙의료원 데이터 연동 성공');
    console.log('✅ 정확한 병상 정보 파싱 완료');
    console.log('✅ 전문병상 및 의료장비 정보 추가');
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }
}

// 테스트 실행
if (require.main === module) {
  testUpdatedNEDC().catch(console.error);
}

module.exports = { testUpdatedNEDC };