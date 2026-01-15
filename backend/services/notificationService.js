/**
 * 알림 서비스
 * 이메일/SMS 알림 구현
 */

const logger = require('../utils/logger');
const nodemailer = require('nodemailer');

// 이메일 전송기 초기화
let emailTransporter = null;

function getEmailTransporter() {
  if (emailTransporter) {
    return emailTransporter;
  }

  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  // SMTP 설정이 없으면 null 반환 (개발 모드에서만 로그 출력)
  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    return null;
  }

  emailTransporter = nodemailer.createTransport(smtpConfig);
  return emailTransporter;
}

/**
 * 이메일 알림
 */
async function sendEmail(to, subject, html, text) {
  try {
    const transporter = getEmailTransporter();
    
    // SMTP 설정이 없으면 개발 모드에서만 로그 출력
    if (!transporter) {
      logger.info('이메일 알림 (SMTP 미설정)', { to, subject });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 이메일 알림: ${to}`);
        console.log(`제목: ${subject}`);
        console.log(`내용: ${text || html}`);
      }
      
      return { success: true, message: '이메일 알림이 준비되었습니다. (SMTP 미설정)' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // HTML 태그 제거
      html: html || text
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('이메일 알림 전송 성공', { to, subject, messageId: info.messageId });
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('이메일 알림 전송 실패', error, { to, subject });
    return { success: false, error: error.message };
  }
}

/**
 * SMS 알림 (알리고 API 지원)
 */
async function sendSMS(to, message) {
  try {
    // 알리고 API 설정이 없으면 개발 모드에서만 로그 출력
    if (!process.env.ALIGO_API_KEY || !process.env.ALIGO_USER_ID) {
      logger.info('SMS 알림 (알리고 API 미설정)', { to });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 SMS 알림: ${to}`);
        console.log(`메시지: ${message}`);
      }
      
      return { success: true, message: 'SMS 알림이 준비되었습니다. (알리고 API 미설정)' };
    }

    const axios = require('axios');
    
    // 알리고 API 호출
    const response = await axios.post('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {
      key: process.env.ALIGO_API_KEY,
      user_id: process.env.ALIGO_USER_ID,
      sender: process.env.ALIGO_SENDER_PHONE,
      receiver: to.replace(/-/g, ''), // 하이픈 제거
      msg: message
    });

    if (response.data.code === 0) {
      logger.info('SMS 알림 전송 성공', { to, messageId: response.data.info?.msg_id });
      return { success: true, messageId: response.data.info?.msg_id };
    } else {
      throw new Error(response.data.message || 'SMS 전송 실패');
    }
  } catch (error) {
    logger.error('SMS 알림 전송 실패', error, { to });
    
    // 개발 환경에서는 에러가 나도 로그만 출력
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 SMS 알림 (에러): ${to}`);
      console.log(`메시지: ${message}`);
      console.log(`에러: ${error.message}`);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * 응급 상황 알림 (보호자에게)
 */
async function notifyEmergencyToGuardian(userId, emergencyCase) {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId).select('name emergencyContact').lean();
    
    if (!user || !user.emergencyContact?.phone) {
      logger.warn('보호자 연락처 없음', { userId });
      return { success: false, message: '보호자 연락처가 없습니다.' };
    }

    const message = `[골든타임 알림] ${user.name}님의 응급 상황이 감지되었습니다. 응급도: ${emergencyCase.emergencyLevel}단계`;
    
    // SMS 전송
    await sendSMS(user.emergencyContact.phone, message);
    
    logger.info('보호자 알림 전송', { userId, phone: user.emergencyContact.phone });
    
    return { success: true };
  } catch (error) {
    logger.error('보호자 알림 전송 실패', error, { userId });
    return { success: false, error: error.message };
  }
}

/**
 * 응급구조사 배정 알림
 */
async function notifyParamedicAssignment(paramedicId, caseId) {
  try {
    const Paramedic = require('../models/Paramedic');
    const EmergencyCase = require('../models/EmergencyCase');
    
    const [paramedic, emergencyCase] = await Promise.all([
      Paramedic.findById(paramedicId).select('name phone email').lean(),
      EmergencyCase.findById(caseId).populate('userId', 'name').lean()
    ]);

    if (!paramedic || !emergencyCase) {
      return { success: false, message: '데이터를 찾을 수 없습니다.' };
    }

    // 푸시 알림 (Socket.IO로 이미 전송됨)
    // 추가로 SMS나 이메일도 전송 가능
    const message = `[골든타임] 새로운 응급 상황이 배정되었습니다. 환자: ${emergencyCase.userId?.name || '알 수 없음'}, 응급도: ${emergencyCase.emergencyLevel}단계`;
    
    // SMS 전송 (선택사항)
    if (paramedic.phone) {
      await sendSMS(paramedic.phone, message);
    }

    logger.info('응급구조사 배정 알림 전송', { paramedicId, caseId });
    
    return { success: true };
  } catch (error) {
    logger.error('응급구조사 알림 전송 실패', error, { paramedicId, caseId });
    return { success: false, error: error.message };
  }
}

/**
 * 병원 도착 알림
 */
async function notifyHospitalArrival(userId, hospitalName) {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId).select('name emergencyContact').lean();
    
    if (!user || !user.emergencyContact?.phone) {
      return { success: false, message: '보호자 연락처가 없습니다.' };
    }

    const message = `[골든타임 알림] ${user.name}님이 ${hospitalName}에 도착했습니다.`;
    
    await sendSMS(user.emergencyContact.phone, message);
    
    logger.info('병원 도착 알림 전송', { userId, hospitalName });
    
    return { success: true };
  } catch (error) {
    logger.error('병원 도착 알림 전송 실패', error, { userId });
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmail,
  sendSMS,
  notifyEmergencyToGuardian,
  notifyParamedicAssignment,
  notifyHospitalArrival
};
