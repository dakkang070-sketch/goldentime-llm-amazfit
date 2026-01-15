/**
 * 파인튜닝 데이터 준비 스크립트
 * 실제 운영 데이터를 기반으로 파인튜닝 데이터셋 생성
 */

// 프로젝트 루트로 경로 설정
const path = require('path');
const fs = require('fs');
const projectRoot = path.join(__dirname, '..');
process.chdir(projectRoot);

// mongoose를 optional로 로드
let mongoose, BiometricData, User, EmergencyCase;
try {
  mongoose = require('mongoose');
  BiometricData = require('./backend/models/BiometricData');
  User = require('./backend/models/User');
  EmergencyCase = require('./backend/models/EmergencyCase');
  require('dotenv').config({ path: path.join(projectRoot, '.env') });
} catch (e) {
  console.log('⚠️ mongoose 모듈을 찾을 수 없습니다. 기본 데이터셋만 사용합니다.');
}

async function prepareFineTuningData() {
  let mongoConnected = false;
  
  try {
    // MongoDB 연결 시도
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldentime', {
        serverSelectionTimeoutMS: 3000
      });
      console.log('✅ MongoDB 연결됨');
      mongoConnected = true;
    } catch (mongoError) {
      console.log('⚠️ MongoDB 연결 실패:', mongoError.message);
      console.log('📝 기본 샘플 데이터셋만 사용합니다.');
      mongoConnected = false;
    }

    const dataset = [];
    let emergencyCases = [];
    let biometricData = [];

    // MongoDB가 연결된 경우에만 데이터 수집
    if (mongoConnected) {
      // 방법 1: EmergencyCase에서 LLM 분석 결과가 있는 케이스 조회
      console.log('📊 EmergencyCase에서 학습 데이터 수집 중...');
      emergencyCases = await EmergencyCase.find({
        'llmAnalysis.analysisText': { $exists: true, $ne: null },
        emergencyLevel: { $gte: 3 }
      })
        .populate('userId', 'baselineBiometric name')
        .sort({ detectedAt: -1 })
        .limit(1000)
        .lean();

      console.log(`📊 응급 케이스 ${emergencyCases.length}개 발견`);

      // EmergencyCase 기반 데이터 수집
      for (const ec of emergencyCases) {
      if (!ec.llmAnalysis || !ec.llmAnalysis.analysisText) continue;

      // 해당 케이스의 생체 데이터 찾기
      const biometricData = await BiometricData.findOne({
        userId: ec.userId._id || ec.userId,
        'analysis.emergencyLevel': ec.emergencyLevel,
        collectedAt: {
          $gte: new Date(ec.detectedAt).getTime() - 60000,
          $lte: new Date(ec.detectedAt).getTime() + 60000
        }
      }).lean();

      const user = ec.userId;
      const baselineHr = user?.baselineBiometric?.heartRate?.avg || 'unknown';
      
      // 심박수 추출
      let hr = 'unknown';
      if (biometricData?.heartRate) {
        hr = biometricData.heartRate;
      } else if (ec.detectedAnomalies) {
        const hrAnomaly = ec.detectedAnomalies.find(a => a.type === 'heart_rate');
        if (hrAnomaly?.description) {
          const match = hrAnomaly.description.match(/\d+/);
          if (match) hr = match[0];
        }
      }
      
      const stress = biometricData?.stressLevel ?? 'unknown';
      const movement = biometricData?.movementStatus ?? (ec.detectedAnomalies?.find(a => a.type === 'fall') ? '낙상 감지' : 'unknown');
      const location = ec.locations?.detectedAt 
        ? `${ec.locations.detectedAt.lat}, ${ec.locations.detectedAt.lng}`
        : 'unknown';
      
      const input = `기초선 심박수: ${baselineHr} bpm, 현재 심박수: ${hr} bpm, 스트레스: ${stress}, 움직임: ${movement}, 위치: ${location}`;
      
      const output = ec.llmAnalysis.analysisText;

      dataset.push({
        instruction: "응급구조사가 참고할 상황 요약을 작성하세요. 의료적 진단은 하지 마세요.",
        input: input,
        output: output
      });
    }

    // 방법 2: BiometricData에서 직접 수집 (EmergencyCase가 없는 경우)
    console.log('📊 BiometricData에서 추가 학습 데이터 수집 중...');
    const biometricData = await BiometricData.find({
      'analysis.emergencyLevel': { $gte: 3 },
      'analysis.analysisResult': { $exists: true, $ne: null }
    })
      .populate('userId', 'baselineBiometric')
      .sort({ collectedAt: -1 })
      .limit(500)
      .lean();

    console.log(`📊 생체 데이터 ${biometricData.length}개 발견`);

    // 중복 제거를 위한 Set (이미 EmergencyCase에서 수집한 데이터 제외)
    const existingInputsFromCases = new Set(dataset.map(d => d.input));

    for (const data of biometricData) {
      const user = data.userId;
      const analysis = data.analysis;
      
      if (!analysis || !analysis.analysisResult) continue;

      const baselineHr = user?.baselineBiometric?.heartRate?.avg || 'unknown';
      
      const input = `기초선 심박수: ${baselineHr} bpm, 현재 심박수: ${data.heartRate ?? 'unknown'} bpm, 스트레스: ${data.stressLevel ?? 'unknown'}, 움직임: ${data.movementStatus ?? 'unknown'}, 위치: ${data.location?.address || `${data.location?.lat}, ${data.location?.lng}`}`;
      
      // 중복 제거
      if (existingInputsFromCases.has(input)) continue;
      
      const output = analysis.analysisResult;

      dataset.push({
        instruction: "응급구조사가 참고할 상황 요약을 작성하세요. 의료적 진단은 하지 마세요.",
        input: input,
        output: output
      });
      
      existingInputsFromCases.add(input);
      }
    } else {
      console.log('📝 MongoDB 미연결: 기본 샘플 데이터셋만 사용합니다.');
    }

    // 기본 데이터셋과 병합
    const baseDatasetPath = path.join(projectRoot, 'backend/data/fine-tuning-dataset.json');
    let baseDataset = [];
    
    if (fs.existsSync(baseDatasetPath)) {
      baseDataset = JSON.parse(fs.readFileSync(baseDatasetPath, 'utf8'));
    }

    // 중복 제거 (input 기준)
    const combinedDataset = [...baseDataset];
    const existingInputs = new Set(baseDataset.map(d => d.input));

    for (const item of dataset) {
      if (!existingInputs.has(item.input)) {
        combinedDataset.push(item);
        existingInputs.add(item.input);
      }
    }

    // 데이터셋 저장
    const outputPath = path.join(projectRoot, 'backend/data/fine-tuning-dataset-combined.json');
    fs.writeFileSync(
      outputPath,
      JSON.stringify(combinedDataset, null, 2),
      'utf8'
    );

    console.log(`✅ 파인튜닝 데이터셋 생성 완료: ${combinedDataset.length}개 항목`);
    console.log(`📁 저장 위치: ${outputPath}`);

    // 통계 출력
    const stats = {
      total: combinedDataset.length,
      fromCases: emergencyCases.length,
      fromBiometric: dataset.length - emergencyCases.length,
      level3: combinedDataset.filter(d => {
        // output에서 응급도 추론 또는 기본값
        return d.output.includes('3단계') || d.output.includes('관제 확인');
      }).length,
      level4: combinedDataset.filter(d => {
        return d.output.includes('4단계') || d.output.includes('위급') || d.output.includes('신속한');
      }).length,
      level5: combinedDataset.filter(d => {
        return d.output.includes('5단계') || d.output.includes('즉시') || d.output.includes('생명');
      }).length,
    };

    console.log('\n📊 데이터셋 통계:');
    console.log(`  전체: ${stats.total}개`);
    console.log(`  - EmergencyCase 기반: ${stats.fromCases}개`);
    console.log(`  - BiometricData 기반: ${stats.fromBiometric}개`);
    console.log(`  예상 3단계: ${stats.level3}개`);
    console.log(`  예상 4단계: ${stats.level4}개`);
    console.log(`  예상 5단계: ${stats.level5}개`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    // MongoDB가 연결된 경우에만 disconnect
    if (mongoConnected) {
      try {
        await mongoose.disconnect();
      } catch (e) {
        // 무시
      }
    }
    process.exit(1);
  } finally {
    if (mongoConnected) {
      try {
        await mongoose.disconnect();
      } catch (e) {
        // 무시
      }
    }
  }
}

// 실행
if (require.main === module) {
  prepareFineTuningData();
}

module.exports = { prepareFineTuningData };
