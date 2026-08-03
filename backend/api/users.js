const express = require('express');
const validator = require('validator');
const User = require('../models/User');
const BiometricData = require('../models/BiometricData');
const EmergencyCase = require('../models/EmergencyCase');
const { signUserToken } = require('../services/jwtService');
const { assignUserToController } = require('../services/controllerAssignmentService');
const { authLimiter } = require('../middleware/rateLimiter');
const { authRequired: requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { sendSMS } = require('../services/notificationService');

/**
 * 사용자 계정 생성, 목록 조회, 로그인 관련 엔드포인트를 묶는 Express 라우터입니다.
 */
const router = express.Router();

/**
 * 계정 승인 상태에 맞는 로그인 차단 메시지를 반환합니다.
 */
function resolveUserApprovalMessage(accountStatus) {
  if (accountStatus === 'pending') return '어드민 승인 대기 중입니다.';
  if (accountStatus === 'rejected') return '가입 신청이 반려되었습니다. 관리자에게 문의해주세요.';
  if (accountStatus === 'suspended') return '이용이 정지된 계정입니다.';
  if (accountStatus === 'withdrawn') return '해지된 계정입니다.';
  return '로그인할 수 없는 계정 상태입니다.';
}

/**
 * 요청 본문의 시/구/동/복지사명 입력을 공통 affiliation 구조로 정규화합니다.
 */
function normalizeMemberAffiliationInput(rawAffiliation = {}, fallback = {}) {
  return {
    city: String(rawAffiliation.city || fallback.city || '').trim(),
    district: String(rawAffiliation.district || fallback.district || '').trim(),
    dong: String(rawAffiliation.dong || fallback.dong || '').trim(),
    welfareName: String(rawAffiliation.welfareName || fallback.welfareName || '').trim(),
  };
}

/**
 * 회원 소속 정보가 시/구/동/복지사명까지 모두 채워졌는지 확인합니다.
 */
function validateMemberAffiliation(affiliation) {
  if (!affiliation.city || !affiliation.district || !affiliation.dong || !affiliation.welfareName) {
    return '회원은 시/도, 구, 동, 복지사명을 모두 입력해야 합니다.';
  }

  return null;
}

/**
 * 보호자 인증용 연락처 비교 전에 숫자만 남깁니다.
 */
function normalizePhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

/**
 * 어드민/회원앱에서 보호자에게 전달할 6자리 인증코드를 생성합니다.
 */
function generateGuardianAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 활성 상태의 다른 보호자 인증코드와 겹치지 않는 6자리 코드를 발급합니다.
 */
async function generateUniqueGuardianAccessCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateGuardianAccessCode();
    const duplicated = await User.exists({
      isEmergencyAppUser: true,
      'emergencySettings.guardianAccess.code': code,
      'emergencySettings.guardianAccess.codeExpiresAt': { $gt: new Date() },
    });
    if (!duplicated) {
      return code;
    }
  }

  return generateGuardianAccessCode();
}

/**
 * 회원 문서에 보호자 초대용 6자리 인증코드와 만료시각을 저장합니다.
 */
async function issueGuardianInvite(user) {
  const guardianPhone = normalizePhoneDigits(user?.emergencyContact?.phone);
  if (!guardianPhone) {
    return null;
  }

  const code = await generateUniqueGuardianAccessCode();
  const issuedAt = new Date();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10);

  user.emergencySettings = {
    ...(user.emergencySettings || {}),
    guardianAccess: {
      ...(user?.emergencySettings?.guardianAccess || {}),
      code,
      codeIssuedAt: issuedAt,
      codeExpiresAt: expiresAt,
      verifiedAt: null,
      verifiedGuardianPhone: guardianPhone,
    },
  };
  await user.save();

  return {
    code,
    expiresAt,
    guardianPhone: user?.emergencyContact?.phone || '',
    guardianName: user?.emergencyContact?.name || '',
  };
}

/**
 * 회원 승인/수정 요청 비교에 사용할 이메일 값을 소문자 기준으로 정규화합니다.
 */
function normalizeMemberEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * 회원 승인/수정 요청 비교에 사용할 휴대폰 번호를 숫자 기준으로 정규화합니다.
 */
function normalizeMemberPhone(value) {
  const digits = normalizePhoneDigits(value);
  if (!digits) return '';
  if (digits.startsWith('82')) {
    const rest = digits.slice(2);
    return rest.startsWith('0') ? rest : `0${rest}`;
  }
  return digits;
}

/**
 * 회원 정보수정 승인 대기 문서의 보호자 정보를 문자열 기준으로 정리합니다.
 */
function normalizeMemberEmergencyContact(contact = {}) {
  return {
    name: String(contact?.name || '').trim(),
    phone: normalizeMemberPhone(contact?.phone || ''),
    relationship: String(contact?.relationship || '').trim(),
  };
}

/**
 * 회원 정보수정 승인 대기 문서의 건강 메모 배열을 비교 가능한 구조로 정규화합니다.
 */
function normalizeMemberMedicalHistory(medicalHistory = {}) {
  const normalizeRows = (rows, field) =>
    Array.isArray(rows)
      ? rows
          .map((row) => {
            if (typeof row === 'string') {
              const trimmed = row.trim();
              return trimmed ? { [field]: trimmed } : null;
            }
            if (row && typeof row === 'object') {
              const trimmed = String(row[field] || '').trim();
              return trimmed ? { [field]: trimmed } : null;
            }
            return null;
          })
          .filter(Boolean)
      : [];

  return {
    medications: normalizeRows(medicalHistory?.medications, 'name'),
    allergies: normalizeRows(medicalHistory?.allergies, 'substance'),
    chronicDiseases: normalizeRows(medicalHistory?.chronicDiseases, 'disease'),
  };
}

/**
 * 회원 정보수정 승인 대기 문서의 보호자 목록을 최대 3명 기준으로 정규화합니다.
 */
function normalizeMemberEmergencyContacts(contacts = []) {
  return Array.isArray(contacts)
    ? contacts
        .slice(0, 3)
        .map((contact, index) => ({
          ...normalizeMemberEmergencyContact(contact),
          priority: index + 1,
        }))
        .filter((contact) => contact.name || contact.phone || contact.relationship)
    : [];
}

/**
 * 회원 정보수정 승인 대기 문서를 관리자 승인 처리용 구조로 정규화합니다.
 */
function normalizePendingMemberProfileChange(rawPendingProfileChange = {}) {
  return {
    name: String(rawPendingProfileChange?.name || '').trim(),
    email: normalizeMemberEmail(rawPendingProfileChange?.email || ''),
    phone: normalizeMemberPhone(rawPendingProfileChange?.phone || ''),
    birthDate: rawPendingProfileChange?.birthDate ? new Date(rawPendingProfileChange.birthDate) : null,
    age: Number(rawPendingProfileChange?.age || 0) || null,
    gender: String(rawPendingProfileChange?.gender || '').trim(),
    height: Number(rawPendingProfileChange?.height || 0) || null,
    weight: Number(rawPendingProfileChange?.weight || 0) || null,
    bloodType: String(rawPendingProfileChange?.bloodType || '').trim(),
    medicalHistory: normalizeMemberMedicalHistory(rawPendingProfileChange?.medicalHistory),
    emergencyContact: normalizeMemberEmergencyContact(rawPendingProfileChange?.emergencyContact),
    emergencyContacts: normalizeMemberEmergencyContacts(rawPendingProfileChange?.emergencyContacts),
    affiliation: normalizeMemberAffiliationInput(rawPendingProfileChange?.affiliation),
    requestedAt: rawPendingProfileChange?.requestedAt ? new Date(rawPendingProfileChange.requestedAt) : null,
  };
}

/**
 * 회원 문서에 실제 승인 대기 중인 정보수정 요청이 있는지 확인합니다.
 */
function hasPendingMemberProfileChange(rawPendingProfileChange = {}) {
  const normalized = normalizePendingMemberProfileChange(rawPendingProfileChange);
  return Boolean(normalized.requestedAt && !Number.isNaN(normalized.requestedAt.getTime()));
}

/**
 * 관리자 승인 화면에 표시할 회원 정보수정 요청 요약 구조를 생성합니다.
 */
function serializePendingMemberProfileApproval(user) {
  const pendingProfileChange = normalizePendingMemberProfileChange(user?.pendingProfileChange);
  return {
    id: String(user?._id || ''),
    name: String(user?.name || '').trim(),
    email: normalizeMemberEmail(user?.email || ''),
    phone: normalizeMemberPhone(user?.phone || ''),
    affiliation: normalizeMemberAffiliationInput(user?.affiliation),
    requestedProfile: {
      name: pendingProfileChange.name,
      email: pendingProfileChange.email,
      phone: pendingProfileChange.phone,
      birthDate: pendingProfileChange.birthDate,
      age: pendingProfileChange.age,
      gender: pendingProfileChange.gender,
      height: pendingProfileChange.height,
      weight: pendingProfileChange.weight,
      bloodType: pendingProfileChange.bloodType,
      affiliation: pendingProfileChange.affiliation,
    },
    requestedAt: pendingProfileChange.requestedAt,
    wearableDevice: {
      deviceId: String(user?.wearableDevice?.deviceId || '').trim(),
      deviceName: String(user?.wearableDevice?.deviceName || '').trim(),
    },
  };
}

/**
 * 승인된 회원 정보수정 요청을 실제 회원 문서에 반영합니다.
 */
function applyApprovedMemberProfileChange(user, rawPendingProfileChange = {}) {
  const pendingProfileChange = normalizePendingMemberProfileChange(rawPendingProfileChange);

  user.name = pendingProfileChange.name;
  user.email = pendingProfileChange.email;
  user.phone = pendingProfileChange.phone || undefined;
  user.birthDate = pendingProfileChange.birthDate;
  user.age = pendingProfileChange.age;
  user.gender = pendingProfileChange.gender || user.gender;
  user.height = pendingProfileChange.height;
  user.weight = pendingProfileChange.weight;
  user.bloodType = pendingProfileChange.bloodType;
  user.medicalHistory = pendingProfileChange.medicalHistory;
  user.affiliation = pendingProfileChange.affiliation;
  user.emergencyContact =
    pendingProfileChange.emergencyContact.name ||
    pendingProfileChange.emergencyContact.phone ||
    pendingProfileChange.emergencyContact.relationship
      ? pendingProfileChange.emergencyContact
      : undefined;
  user.emergencySettings = {
    ...(user.emergencySettings || {}),
    emergencyContacts: pendingProfileChange.emergencyContacts,
  };
}

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 전체 사용자 목록 조회 (관리자용)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: 사용자 목록 및 최신 상태
 */
/**
 * 전체 사용자와 각 사용자의 최신 생체 상태를 함께 조회합니다.
 */
router.get('/', requireAuth, requireRole(['admin', 'medical']), async (req, res, next) => {
  try {
    // 1. 모든 사용자 조회
    const users = await User.find()
      .select('-password')
      .populate('assignedController', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    // 목록 API 한 번으로 관제 화면 카드가 뜨도록 최신 생체 상태를 사용자별로 덧붙입니다.
    // 2. 각 사용자의 최신 생체 데이터 조회
    const usersWithStatus = await Promise.all(users.map(async (user) => {
      const latestData = await BiometricData.findOne({ userId: user._id })
        .sort({ collectedAt: -1 })
        .lean();
      const latestEmergencyCase = await EmergencyCase.findOne({ userId: user._id })
        .sort({ detectedAt: -1, createdAt: -1 })
        .lean();

      // 간단한 위험도 분석 (예시)
      let healthStatus = '정상';
      if (latestData) {
        if (latestData.heartRate > 120 || latestData.heartRate < 40) healthStatus = '위험';
        else if (latestData.heartRate > 100) healthStatus = '주의';
      }

      // 계정 상태가 비활성이면 전체 상태도 비활성으로 표시할 수 있음
      // 하지만 프론트엔드에서 분리해서 처리하도록 데이터는 그대로 전달
      const accountStatus = user.accountStatus || 'active';
      const analysisText =
        latestEmergencyCase?.llmAnalysis?.analysisText ||
        latestEmergencyCase?.biometricSnapshot?.analysis?.analysisResult ||
        '';

      return {
        ...user,
        // 기존 프런트 호환을 위해 healthStatus를 status에도 중복으로 내려줍니다.
        status: healthStatus, // 기존 호환성을 위해 healthStatus를 status로 전달
        healthStatus,
        accountStatus,
        latestHealth: latestData || null,
        latestLlmAnalysis: analysisText
          ? {
              analysisText,
              analyzedAt:
                latestEmergencyCase?.llmAnalysis?.analyzedAt ||
                latestEmergencyCase?.biometricSnapshot?.analysis?.analyzedAt ||
                latestEmergencyCase?.detectedAt ||
                null,
              model:
                latestEmergencyCase?.llmAnalysis?.model ||
                latestEmergencyCase?.biometricSnapshot?.analysis?.llmModel ||
                '',
            }
          : null,
      };
    }));

    res.json({ success: true, data: usersWithStatus });
  } catch (err) {
    next(err);
  }
});

/**
 * 승인 대기 중인 사용자 가입 신청 목록을 조회합니다.
 */
router.get('/pending-approvals', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const pendingUsers = await User.find({ accountStatus: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: pendingUsers });
  } catch (err) {
    next(err);
  }
});

/**
 * 승인 대기 중인 회원 정보수정 요청 목록을 조회합니다.
 */
router.get('/pending-profile-approvals', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const users = await User.find({
      'pendingProfileChange.requestedAt': { $ne: null },
    })
      .select('-password')
      .sort({ 'pendingProfileChange.requestedAt': -1 })
      .lean();

    res.json({
      success: true,
      data: users
        .filter((user) => hasPendingMemberProfileChange(user.pendingProfileChange))
        .map((user) => serializePendingMemberProfileApproval(user)),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 사용자 가입 신청을 승인 또는 반려 처리합니다.
 */
router.patch('/:id/approval', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body || {};

    if (!['active', 'rejected', 'suspended'].includes(accountStatus)) {
      return res.status(400).json({ success: false, message: '허용되지 않은 승인 상태입니다.' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { accountStatus },
      { new: true },
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    if (accountStatus === 'active') {
      try {
        await assignUserToController(user._id);
      } catch (err) {
        console.warn('승인 후 관제사 배정 실패:', err.message);
      }

      try {
        const invite = await issueGuardianInvite(user);
        if (invite?.guardianPhone) {
          const expiresAtLabel = invite.expiresAt ? new Date(invite.expiresAt).toLocaleTimeString() : '';
          const smsMessage =
            `[골든타임] ${user.name || '회원'}님의 보호자 회원가입 인증코드입니다. ` +
            `보호자앱 회원가입 화면에서 아래 인증코드를 입력해주세요. ` +
            `${expiresAtLabel ? `만료 시각 ${expiresAtLabel}. ` : ''}` +
            `인증코드: ${invite.code}`;
          await sendSMS(invite.guardianPhone, smsMessage);
        }
      } catch (err) {
        console.warn('승인 후 보호자 초대 SMS 발송 실패:', err.message);
      }
    }

    res.json({
      success: true,
      message: accountStatus === 'active' ? '회원 가입이 승인되었습니다.' : '회원 가입 상태가 변경되었습니다.',
      data: user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 회원 정보수정 요청을 승인 또는 반려 처리합니다.
 */
router.patch('/:id/profile-approval', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision } = req.body || {};

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: '허용되지 않은 처리 값입니다.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    if (!hasPendingMemberProfileChange(user.pendingProfileChange)) {
      return res.status(400).json({ success: false, message: '승인 대기 중인 회원 정보수정 요청이 없습니다.' });
    }

    if (decision === 'approved') {
      const pendingProfileChange = normalizePendingMemberProfileChange(user.pendingProfileChange);

      const emailOwner = await User.findOne({
        _id: { $ne: user._id },
        email: pendingProfileChange.email,
      }).select('_id');
      if (emailOwner) {
        return res.status(409).json({ success: false, message: '이미 사용 중인 이메일이라 승인할 수 없습니다.' });
      }

      if (pendingProfileChange.phone) {
        const phoneOwner = await User.findOne({
          _id: { $ne: user._id },
          phone: pendingProfileChange.phone,
        }).select('_id');
        if (phoneOwner) {
          return res.status(409).json({ success: false, message: '이미 사용 중인 전화번호라 승인할 수 없습니다.' });
        }
      }

      applyApprovedMemberProfileChange(user, user.pendingProfileChange);
    }

    user.pendingProfileChange = undefined;
    await user.save();

    res.json({
      success: true,
      message:
        decision === 'approved'
          ? '회원 정보수정 요청이 승인되었습니다.'
          : '회원 정보수정 요청이 반려되었습니다.',
      data: user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 관리자 화면에서 특정 회원의 보호자 로그인용 자체 인증코드를 발급합니다.
 */
router.post('/:id/guardian-access-code', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    const guardianPhone = normalizePhoneDigits(user?.emergencyContact?.phone);
    if (!guardianPhone) {
      return res.status(400).json({ success: false, message: '먼저 보호자 연락처를 저장해주세요.' });
    }

    const invite = await issueGuardianInvite(user);
    if (!invite) {
      return res.status(400).json({ success: false, message: '먼저 보호자 연락처를 저장해주세요.' });
    }

    return res.json({
      success: true,
      message: '보호자 인증코드가 발급되었습니다.',
      data: {
        code: invite.code,
        expiresAt: invite.expiresAt,
        guardianPhone: invite.guardianPhone,
        guardianName: invite.guardianName,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: 사용자 정보 수정 (관리자용)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               birthDate:
 *                 type: string
 *               height:
 *                 type: number
 *               weight:
 *                 type: number
 *               bloodType:
 *                 type: string
 *     responses:
 *       200:
 *         description: 수정 성공
 */
/**
 * 관리자 화면에서 사용자 기본 정보를 수정합니다.
 */
router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // 비밀번호 수정은 별도 API로 분리하거나 여기서 처리하지 않음
    delete updateData.password;

    const user = await User.findByIdAndUpdate(id, updateData, { new: true })
      .select('-password')
      .populate('assignedController', 'name phone');
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: 사용자 삭제 (관리자용)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 삭제 성공
 */
/**
 * 사용자 계정과 연결된 생체 데이터를 함께 삭제합니다.
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    // 관련 생체 데이터도 함께 삭제 (선택 사항이나 데이터 무결성을 위해 권장)
    await BiometricData.deleteMany({ userId: id });
    await EmergencyCase.deleteMany({ userId: id });

    res.json({ success: true, message: '사용자가 삭제되었습니다.' });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/signup:
 *   post:
 *     summary: 사용자 회원가입
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 잘못된 요청
 */
/**
 * 신규 사용자를 생성하고 가능하면 관제사 자동 배정까지 시도합니다.
 */
router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      birthDate,
      age,
      gender,
      height,
      weight,
      bloodType,
      affiliation,
      city,
      district,
      dong,
      welfareName,
      medicalHistory,
      emergencyContact,
      consents,
    } = req.body || {};

    if (!name || !phone || !email || !password || !birthDate || !age || !height || !weight || !bloodType) {
      return res.status(400).json({ success: false, message: '필수 입력값이 누락되었습니다.' });
    }
    if (!validator.isEmail(String(email))) {
      return res.status(400).json({ success: false, message: '이메일 형식이 올바르지 않습니다.' });
    }

    const normalizedAffiliation = normalizeMemberAffiliationInput(affiliation, { city, district, dong, welfareName });
    const affiliationError = validateMemberAffiliation(normalizedAffiliation);
    if (affiliationError) {
      return res.status(400).json({ success: false, message: affiliationError });
    }

    const exists = await User.findOne({ $or: [{ email: String(email).toLowerCase() }, { phone: String(phone) }] })
      .select('_id')
      .lean();
    if (exists) {
      return res.status(409).json({ success: false, message: '이미 가입된 이메일 또는 전화번호입니다.' });
    }

    // 가입 payload는 스키마가 받는 최소 구조만 넣고 비어 있는 선택 필드는 생략합니다.
    const user = await User.create({
      name,
      phone,
      email,
      password,
      birthDate,
      age,
      gender: gender === 'female' ? 'female' : 'male',
      height,
      weight,
      bloodType,
      affiliation: normalizedAffiliation,
      medicalHistory: medicalHistory || undefined,
      emergencyContact: emergencyContact || undefined,
      consents: consents || undefined,
      accountStatus: 'pending',
    });

    res.status(201).json({
      success: true,
      userId: user._id,
      accountStatus: user.accountStatus,
      message: '회원가입 신청이 완료되었습니다. 어드민 승인 후 로그인할 수 있습니다.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 어드민에서 회원을 수동 등록합니다.
 */
router.post('/admin-create', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      birthDate,
      age,
      gender,
      height,
      weight,
      bloodType,
      affiliation,
      city,
      district,
      dong,
      welfareName,
      emergencyContact,
      medicalHistory,
      consents,
    } = req.body || {};

    if (!name || !phone || !email || !password || !birthDate || !age || !height || !weight || !bloodType) {
      return res.status(400).json({ success: false, message: '필수 입력값이 누락되었습니다.' });
    }

    if (!validator.isEmail(String(email))) {
      return res.status(400).json({ success: false, message: '이메일 형식이 올바르지 않습니다.' });
    }

    const normalizedAffiliation = normalizeMemberAffiliationInput(affiliation, { city, district, dong, welfareName });
    const affiliationError = validateMemberAffiliation(normalizedAffiliation);
    if (affiliationError) {
      return res.status(400).json({ success: false, message: affiliationError });
    }

    const exists = await User.findOne({ $or: [{ email: String(email).toLowerCase() }, { phone: String(phone) }] })
      .select('_id')
      .lean();

    if (exists) {
      return res.status(409).json({ success: false, message: '이미 가입된 이메일 또는 전화번호입니다.' });
    }

    const user = await User.create({
      name,
      phone,
      email,
      password,
      birthDate,
      age,
      gender: gender === 'female' ? 'female' : 'male',
      height,
      weight,
      bloodType,
      affiliation: normalizedAffiliation,
      medicalHistory: medicalHistory || undefined,
      emergencyContact: emergencyContact || undefined,
      consents: consents || undefined,
      accountStatus: 'active',
    });

    res.status(201).json({
      success: true,
      message: '회원이 등록되었습니다.',
      data: user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: 사용자 로그인
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       401:
 *         description: 인증 실패
 */
/**
 * 이메일과 비밀번호를 확인한 뒤 사용자용 JWT를 발급합니다.
 */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'email/password가 필요합니다.' });

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const ok = await user.comparePassword(String(password));
    if (!ok) return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        accountStatus: user.accountStatus,
        message: resolveUserApprovalMessage(user.accountStatus),
      });
    }

    const token = signUserToken(user);
    res.json({ success: true, userId: user._id, token });
  } catch (err) {
    next(err);
  }
});

/**
 * 사용자 API 라우터를 외부 앱 서버에 등록할 수 있도록 export 합니다.
 */
module.exports = router;
