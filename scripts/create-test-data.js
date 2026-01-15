require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../backend/models/User');
const Paramedic = require('../backend/models/Paramedic');
const Controller = require('../backend/models/Controller');
const Hospital = require('../backend/models/Hospital');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/goldentime';

async function createTestData() {
  try {
    console.log('🔌 MongoDB 연결 중...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');

    // 기존 테스트 데이터 삭제 (선택사항)
    const shouldClean = process.argv.includes('--clean');
    if (shouldClean) {
      console.log('🧹 기존 테스트 데이터 삭제 중...');
      await User.deleteMany({ email: /test/ });
      await Paramedic.deleteMany({ email: /test/ });
      await Controller.deleteMany({ email: /test/ });
      await Hospital.deleteMany({ name: /테스트/ });
    }

    // 테스트 병원 생성
    console.log('🏥 테스트 병원 생성 중...');
    const hospitals = await Hospital.insertMany([
      {
        name: '테스트 종합병원',
        location: {
          lat: 37.5665,
          lng: 126.9780,
          address: '서울특별시 중구 세종대로 110'
        },
        type: 'general',
        level: 'tertiary',
        emergencyRoom: {
          isAvailable: true,
          totalBeds: 20,
          availableBeds: 15,
          waitTime: 5
        },
        canAcceptTransfer: true,
        specialties: ['내과', '외과', '응급의학과'],
        contact: {
          phone: '02-1234-5678',
          emergencyPhone: '02-1234-5679'
        },
        status: 'active'
      },
      {
        name: '테스트 대학병원',
        location: {
          lat: 37.5015,
          lng: 127.0397,
          address: '서울특별시 강남구 테헤란로 152'
        },
        type: 'university',
        level: 'tertiary',
        emergencyRoom: {
          isAvailable: true,
          totalBeds: 30,
          availableBeds: 25,
          waitTime: 3
        },
        canAcceptTransfer: true,
        specialties: ['내과', '외과', '심장내과', '응급의학과'],
        contact: {
          phone: '02-2345-6789',
          emergencyPhone: '02-2345-6790'
        },
        status: 'active'
      }
    ]);
    console.log(`✅ ${hospitals.length}개 병원 생성 완료`);

    // 테스트 관제사 생성
    console.log('👮 테스트 관제사 생성 중...');
    const controllers = await Controller.insertMany([
      {
        name: '테스트 관제사',
        email: 'controller@test.com',
        password: 'test1234',
        phone: '010-1111-2222',
        role: 'controller',
        status: 'online',
        maxUsers: 50
      }
    ]);
    console.log(`✅ ${controllers.length}개 관제사 생성 완료`);

    // 테스트 응급구조사 생성
    console.log('🚑 테스트 응급구조사 생성 중...');
    const paramedics = await Paramedic.insertMany([
      {
        name: '테스트 응급구조사 1',
        email: 'paramedic1@test.com',
        password: 'test1234',
        phone: '010-3333-4444',
        licenseNumber: 'TEST-001',
        status: 'available',
        currentLocation: {
          lat: 37.5665,
          lng: 126.9780,
          updatedAt: new Date()
        },
        notificationSettings: {
          enablePush: true,
          enableSound: true,
          maxDistance: 10000
        }
      },
      {
        name: '테스트 응급구조사 2',
        email: 'paramedic2@test.com',
        password: 'test1234',
        phone: '010-5555-6666',
        licenseNumber: 'TEST-002',
        status: 'available',
        currentLocation: {
          lat: 37.5015,
          lng: 127.0397,
          updatedAt: new Date()
        },
        notificationSettings: {
          enablePush: true,
          enableSound: true,
          maxDistance: 10000
        }
      }
    ]);
    console.log(`✅ ${paramedics.length}개 응급구조사 생성 완료`);

    console.log('');
    console.log('📋 생성된 테스트 데이터:');
    console.log(`- 병원: ${hospitals.length}개`);
    console.log(`- 관제사: ${controllers.length}개`);
    console.log(`- 응급구조사: ${paramedics.length}개`);
    console.log('');
    console.log('테스트 계정 정보:');
    console.log('관제사: controller@test.com / test1234');
    console.log('응급구조사1: paramedic1@test.com / test1234');
    console.log('응급구조사2: paramedic2@test.com / test1234');

    await mongoose.disconnect();
    console.log('✅ 완료!');
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

createTestData();
