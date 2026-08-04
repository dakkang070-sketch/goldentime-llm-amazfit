require('dotenv').config({ path: './backend/.env' });

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../backend/models/User');
const Controller = require('../backend/models/Controller');
const BiometricData = require('../backend/models/BiometricData');
const EmergencyCase = require('../backend/models/EmergencyCase');
const Alert = require('../backend/models/Alert');

const SHARED_ADMIN = {
  backofficeEmail: 'admin.backoffice@goldentime.local',
  controllerEmail: 'admin.control@goldentime.local',
  welfareEmail: 'admin.welfare@goldentime.local',
  memberEmail: 'admin.member@goldentime.local',
  guardianEmail: 'admin.guardian@goldentime.local',
  password: '1',
};

const DEMO_REGIONS = [
  { city: '부산광역시', district: '강서구', dong: '대저1동', lat: 35.2111, lng: 128.9807 },
  { city: '부산광역시', district: '북구', dong: '구포1동', lat: 35.1973, lng: 128.9926 },
  { city: '부산광역시', district: '사상구', dong: '괘법동', lat: 35.1646, lng: 128.9845 },
  { city: '부산광역시', district: '사하구', dong: '하단1동', lat: 35.1062, lng: 128.9679 },
  { city: '부산광역시', district: '부산진구', dong: '전포1동', lat: 35.1565, lng: 129.0655 },
];

const CONTROLLER_DEFINITIONS = [
  {
    email: SHARED_ADMIN.controllerEmail,
    name: '공통관제사',
    phone: '01030003000',
    role: 'controller',
    status: 'online',
  },
  { email: 'demo.controller02@goldentime.local', name: '김민석', phone: '01030000002', role: 'controller', status: 'online' },
  { email: 'demo.controller03@goldentime.local', name: '이도현', phone: '01030000003', role: 'controller', status: 'online' },
  { email: 'demo.controller04@goldentime.local', name: '박지훈', phone: '01030000004', role: 'controller', status: 'busy' },
  { email: 'demo.controller05@goldentime.local', name: '최은우', phone: '01030000005', role: 'controller', status: 'offline' },
];

const WELFARE_DEFINITIONS = [
  {
    email: SHARED_ADMIN.welfareEmail,
    name: '공통복지사',
    phone: '01040004000',
    role: 'medical',
    status: 'offline',
  },
  { email: 'demo.welfare02@goldentime.local', name: '정미경', phone: '01040000002', role: 'medical', status: 'offline' },
  { email: 'demo.welfare03@goldentime.local', name: '한지숙', phone: '01040000003', role: 'medical', status: 'offline' },
  { email: 'demo.welfare04@goldentime.local', name: '김선희', phone: '01040000004', role: 'medical', status: 'offline' },
  { email: 'demo.welfare05@goldentime.local', name: '오수진', phone: '01040000005', role: 'medical', status: 'offline' },
];

const MEMBER_DEFINITIONS = [
  {
    email: SHARED_ADMIN.memberEmail,
    name: '공통회원',
    phone: '01011112222',
    guardianName: '공통보호자',
    guardianPhone: '01011112222',
    guardianEmail: SHARED_ADMIN.guardianEmail,
    birthDate: '1955-01-01',
    gender: 'male',
    height: 170,
    weight: 65,
    bloodType: 'A+',
    chronicDisease: '고혈압',
    medication: '혈압약',
    allergy: '해당 없음',
    heartRate: 78,
    spO2: 98,
    temperature: 36.5,
    stressLevel: 26,
    steps: 3120,
    batteryLevel: 82,
    fallScore: 8,
    emergencyScore: 12,
  },
  {
    email: 'demo.member02@goldentime.local',
    name: '김영수',
    phone: '01050000002',
    guardianName: '김정희',
    guardianPhone: '01060000002',
    guardianEmail: 'demo.guardian02@goldentime.local',
    birthDate: '1951-03-12',
    gender: 'male',
    height: 167,
    weight: 68,
    bloodType: 'O+',
    chronicDisease: '당뇨',
    medication: '혈당약',
    allergy: '갑각류',
    heartRate: 84,
    spO2: 97,
    temperature: 36.6,
    stressLevel: 31,
    steps: 4280,
    batteryLevel: 76,
    fallScore: 15,
    emergencyScore: 18,
  },
  {
    email: 'demo.member03@goldentime.local',
    name: '박순자',
    phone: '01050000003',
    guardianName: '박민호',
    guardianPhone: '01060000003',
    guardianEmail: 'demo.guardian03@goldentime.local',
    birthDate: '1949-08-21',
    gender: 'female',
    height: 158,
    weight: 56,
    bloodType: 'B+',
    chronicDisease: '심부전',
    medication: '심장약',
    allergy: '해당 없음',
    heartRate: 72,
    spO2: 96,
    temperature: 36.4,
    stressLevel: 29,
    steps: 2890,
    batteryLevel: 71,
    fallScore: 12,
    emergencyScore: 16,
  },
  {
    email: 'demo.member04@goldentime.local',
    name: '이정자',
    phone: '01050000004',
    guardianName: '이성훈',
    guardianPhone: '01060000004',
    guardianEmail: 'demo.guardian04@goldentime.local',
    birthDate: '1958-11-02',
    gender: 'female',
    height: 161,
    weight: 60,
    bloodType: 'AB+',
    chronicDisease: '관절염',
    medication: '소염진통제',
    allergy: '페니실린',
    heartRate: 81,
    spO2: 99,
    temperature: 36.7,
    stressLevel: 24,
    steps: 5010,
    batteryLevel: 88,
    fallScore: 6,
    emergencyScore: 10,
  },
  {
    email: 'demo.member05@goldentime.local',
    name: '최복남',
    phone: '01050000005',
    guardianName: '최지원',
    guardianPhone: '01060000005',
    guardianEmail: 'demo.guardian05@goldentime.local',
    birthDate: '1953-06-15',
    gender: 'male',
    height: 173,
    weight: 71,
    bloodType: 'A-',
    chronicDisease: '고지혈증',
    medication: '고지혈증약',
    allergy: '견과류',
    heartRate: 76,
    spO2: 97,
    temperature: 36.5,
    stressLevel: 27,
    steps: 3670,
    batteryLevel: 79,
    fallScore: 9,
    emergencyScore: 14,
  },
];

/**
 * 역할/지역 기준으로 운영자 계정을 생성하거나 갱신합니다.
 */
async function upsertStaffAccount(definition, affiliation) {
  let controller = await Controller.findOne({ email: definition.email });
  if (!controller) {
    controller = new Controller({
      email: definition.email,
      role: definition.role,
      name: definition.name,
      password: SHARED_ADMIN.password,
      phone: definition.phone,
    });
  }

  controller.name = definition.name;
  controller.email = definition.email;
  controller.role = definition.role;
  controller.password = SHARED_ADMIN.password;
  controller.phone = definition.phone;
  controller.accountStatus = 'active';
  controller.affiliation = {
    city: affiliation.city,
    district: affiliation.district,
    dong: affiliation.dong,
  };
  controller.pendingAffiliationChange = {
    city: '',
    district: '',
    dong: '',
    requestedAt: null,
  };
  controller.status = definition.status;
  controller.assignedUsers = [];
  controller.activeCases = [];
  controller.lastActivity = new Date();
  await controller.save();
  return controller;
}

/**
 * 회원 1건에 필요한 앱/보호자/워치 기본 필드를 생성합니다.
 */
function buildMemberDocument(definition, affiliation, welfare, controller) {
  const birthDate = new Date(definition.birthDate);
  const now = new Date();

  return {
    name: definition.name,
    phone: definition.phone,
    email: definition.email,
    password: SHARED_ADMIN.password,
    birthDate,
    age: now.getFullYear() - birthDate.getFullYear(),
    gender: definition.gender,
    height: definition.height,
    weight: definition.weight,
    bloodType: definition.bloodType,
    medicalHistory: {
      medications: [
        {
          name: definition.medication,
          dosage: '1정',
          frequency: '1일 1회',
        },
      ],
      allergies: definition.allergy === '해당 없음'
        ? []
        : [
            {
              substance: definition.allergy,
              severity: '중간',
            },
          ],
      chronicDiseases: [
        {
          disease: definition.chronicDisease,
          diagnosisDate: new Date('2023-01-01'),
          notes: `${definition.chronicDisease} 정기 모니터링`,
        },
      ],
    },
    emergencyContact: {
      name: definition.guardianName,
      relationship: '보호자',
      phone: definition.guardianPhone,
    },
    affiliation: {
      city: affiliation.city,
      district: affiliation.district,
      dong: affiliation.dong,
      welfareName: welfare.name,
    },
    consents: {
      emergencyAutoReport: true,
      personalInfoCollection: true,
      preciseLocation: true,
      emergencyAlgorithm: true,
    },
    emergencySettings: {
      autoReportEnabled: true,
      emergencyContacts: [
        {
          name: definition.guardianName,
          phone: definition.guardianPhone,
          relationship: '보호자',
          priority: 1,
        },
      ],
      alertSensitivity: 2,
      guardianAccess: {},
    },
    wearableDevice: {
      deviceId: `AMZ-TRX3-${String(definition.phone).slice(-4)}`,
      deviceName: 'Amazfit T-Rex 3 Pro',
      deviceType: 'watch',
      connectedAt: new Date(Date.now() - 1000 * 60 * 45),
      lastSyncAt: new Date(Date.now() - 1000 * 60 * 2),
      connectionStatus: 'connected',
      manualBloodPressure: {
        systolic: 122,
        diastolic: 79,
        updatedAt: new Date(Date.now() - 1000 * 60 * 30),
      },
      batteryLevel: definition.batteryLevel,
      firmwareVersion: '3.2.1',
      lastKnownLocation: {
        lat: affiliation.lat,
        lng: affiliation.lng,
        accuracyM: 18,
        provider: 'watch',
        source: 'watch',
        updatedAt: new Date(Date.now() - 1000 * 60 * 3),
      },
    },
    settings: {
      biometricCollectionInterval: 60,
      enableHeartRate: true,
      enableAcceleration: true,
      enableStress: true,
      enableLocation: true,
    },
    isEmergencyAppUser: true,
    accountStatus: 'active',
    assignedController: controller._id,
    status: 'active',
    lastActivity: new Date(Date.now() - 1000 * 60 * 3),
    pendingProfileChange: {
      name: '',
      email: '',
      phone: '',
      birthDate: null,
      age: null,
      gender: '',
      height: null,
      weight: null,
      bloodType: '',
      medicalHistory: {
        medications: [],
        allergies: [],
        chronicDiseases: [],
      },
      emergencyContact: {
        name: '',
        phone: '',
        relationship: '',
      },
      affiliation: {
        city: '',
        district: '',
        dong: '',
        welfareName: '',
      },
      emergencyContacts: [],
      requestedAt: null,
    },
  };
}

/**
 * 회원 1건에 대해 최근 생체 원본 3개를 생성합니다.
 */
function buildBiometricDocuments(userId, definition, affiliation) {
  const baseDate = Date.now();
  return [0, 1, 2].map((index) => ({
    userId,
    collectedAt: new Date(baseDate - index * 1000 * 60 * 5),
    heartRate: definition.heartRate + (index === 0 ? 0 : index === 1 ? -3 : 2),
    stressLevel: definition.stressLevel + index,
    spO2: Math.max(94, definition.spO2 - (index === 2 ? 1 : 0)),
    bodyTemperature: Number((definition.temperature + (index === 2 ? 0.1 : 0)).toFixed(1)),
    batteryLevel: Math.max(40, definition.batteryLevel - index * 2),
    movementStatus: index === 0 ? 'walking' : 'stationary',
    steps: definition.steps - index * 220,
    fallScore: definition.fallScore,
    emergencyScore: definition.emergencyScore,
    responseState: 'responsive',
    ageRiskWeight: 1.4,
    bloodPressure: {
      systolic: 122 + index,
      diastolic: 79 + index,
    },
    location: {
      lat: affiliation.lat + index * 0.0003,
      lng: affiliation.lng + index * 0.0002,
      accuracy: 15,
      altitude: 24,
      timestamp: new Date(baseDate - index * 1000 * 60 * 5),
    },
    analysis: {
      isAnomaly: false,
      emergencyLevel: 1,
      analysisResult: '정상 범위 관측',
      llmModel: 'demo-seed',
      dataSufficiency: 'sufficient',
      analyzedAt: new Date(baseDate - index * 1000 * 60 * 4),
    },
    rawData: {
      source: 'demo-seed',
      memberEmail: definition.email,
    },
  }));
}

/**
 * 공통 admin / 1 계정을 제외한 기존 테스트 계정과 연결 데이터를 정리합니다.
 */
async function clearExistingDemoData() {
  const removableUsers = await User.find(
    { email: { $ne: SHARED_ADMIN.memberEmail } },
    '_id',
  ).lean();
  const removableUserIds = removableUsers.map((entry) => entry._id);

  if (removableUserIds.length > 0) {
    await BiometricData.deleteMany({ userId: { $in: removableUserIds } });
    await EmergencyCase.deleteMany({ userId: { $in: removableUserIds } });
    await Alert.deleteMany({ userId: { $in: removableUserIds } });
    await User.deleteMany({ _id: { $in: removableUserIds } });
  }

  await Controller.deleteMany({
    email: {
      $nin: [
        SHARED_ADMIN.backofficeEmail,
        SHARED_ADMIN.controllerEmail,
        SHARED_ADMIN.welfareEmail,
      ],
    },
  });
}

/**
 * 관리자, 관제사, 복지사, 회원/보호자 더미 세트를 5개 기준으로 다시 구성합니다.
 */
async function resetAmazfitDemoData() {
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    await clearExistingDemoData();

    const sharedAdmin = await upsertStaffAccount(
      {
        email: SHARED_ADMIN.backofficeEmail,
        name: '공통관리자',
        phone: '01020002000',
        role: 'admin',
        status: 'offline',
      },
      DEMO_REGIONS[0],
    );

    const controllers = [];
    for (const [index, definition] of CONTROLLER_DEFINITIONS.entries()) {
      const account = await upsertStaffAccount(definition, DEMO_REGIONS[index]);
      controllers.push(account);
    }

    const welfareAccounts = [];
    for (const [index, definition] of WELFARE_DEFINITIONS.entries()) {
      const account = await upsertStaffAccount(definition, DEMO_REGIONS[index]);
      welfareAccounts.push(account);
    }

    let sharedMember = await User.findOne({ email: SHARED_ADMIN.memberEmail });
    const memberAccounts = [];

    for (const [index, definition] of MEMBER_DEFINITIONS.entries()) {
      const affiliation = DEMO_REGIONS[index];
      const assignedWelfare = welfareAccounts[index];
      const assignedController = controllers[index];
      const nextDocument = buildMemberDocument(definition, affiliation, assignedWelfare, assignedController);
      let user = definition.email === SHARED_ADMIN.memberEmail ? sharedMember : await User.findOne({ email: definition.email });

      if (!user) {
        user = new User(nextDocument);
      } else {
        Object.assign(user, nextDocument);
      }

      await user.save();

      user.emergencySettings = {
        ...(user.emergencySettings || {}),
        guardianAccess: {
          ...(user.emergencySettings?.guardianAccess || {}),
          guardianEmail: definition.guardianEmail,
          guardianPasswordHash: await bcrypt.hash(SHARED_ADMIN.password, 10),
          verifiedGuardianPhone: definition.guardianPhone,
          guardianRegisteredAt: user.emergencySettings?.guardianAccess?.guardianRegisteredAt || new Date(),
          guardianLastLoginAt: new Date(),
          verifiedAt: new Date(),
        },
      };
      user.markModified('emergencySettings');
      await user.save();

      await BiometricData.deleteMany({ userId: user._id });
      await EmergencyCase.deleteMany({ userId: user._id });
      await Alert.deleteMany({ userId: user._id });
      await BiometricData.insertMany(buildBiometricDocuments(user._id, definition, affiliation));

      assignedController.assignedUsers = [user._id];
      assignedController.activeCases = [];
      await assignedController.save();

      memberAccounts.push(user);
      if (definition.email === SHARED_ADMIN.memberEmail) {
        sharedMember = user;
      }
    }

    await sharedAdmin.save();

    console.log(
      JSON.stringify(
        {
          message: 'amazfit demo data reset complete',
          admin: 1,
          controllers: controllers.length,
          welfare: welfareAccounts.length,
          members: memberAccounts.length,
          guardians: memberAccounts.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
}

resetAmazfitDemoData().catch((error) => {
  console.error(error);
  process.exit(1);
});
