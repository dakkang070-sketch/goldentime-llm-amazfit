require('dotenv').config();
const mongoose = require('mongoose');
const Controller = require('../backend/models/Controller');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/goldentime';

async function createController() {
  try {
    console.log('🔌 MongoDB 연결 중...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');

    // 기존 컨트롤러 확인
    const existing = await Controller.findOne({ email: 'controller@test.com' });
    if (existing) {
      console.log('✅ 컨트롤러 계정이 이미 존재합니다.');
      console.log(`   이메일: ${existing.email}`);
      console.log(`   이름: ${existing.name}`);
      await mongoose.disconnect();
      return;
    }

    // 테스트 관제사 생성
    console.log('👮 테스트 관제사 생성 중...');
    const controller = await Controller.create({
      name: '테스트 관제사',
      email: 'controller@test.com',
      password: 'test1234',
      phone: '010-1111-2222',
      role: 'controller',
      status: 'online',
      maxUsers: 50
    });
    
    console.log('✅ 컨트롤러 계정 생성 완료!');
    console.log('');
    console.log('📋 로그인 정보:');
    console.log('   이메일: controller@test.com');
    console.log('   비밀번호: test1234');

    await mongoose.disconnect();
    console.log('✅ 완료!');
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

createController();
