process.env.JWT_SECRET = 'test-jwt-secret-key-with-32-characters!!';

const mongoose = require('mongoose');

const {
  decryptStructuredValue,
  decryptString,
  encryptStructuredValue,
  encryptString,
  isEncryptedString,
} = require('../utils/personalDataCrypto');

describe('personalDataCrypto 단위 테스트', () => {
  /**
   * 단일 문자열이 암호화 후 복호화되는지 검증합니다.
   */
  test('문자열을 암호화한 뒤 원문으로 복호화한다', () => {
    const encrypted = encryptString('홍길동');

    expect(encrypted).not.toBe('홍길동');
    expect(isEncryptedString(encrypted)).toBe(true);
    expect(decryptString(encrypted)).toBe('홍길동');
  });

  /**
   * 중첩 객체/배열 내부 문자열도 모두 재귀적으로 암복호화하는지 확인합니다.
   */
  test('구조화된 민감정보를 재귀적으로 암복호화한다', () => {
    const original = {
      name: '김골든',
      emergencyContact: {
        relationship: '보호자',
        phone: '01012345678',
      },
      medicalHistory: {
        chronicDiseases: [{ disease: '고혈압' }],
        allergies: [{ substance: '땅콩' }],
      },
    };

    const encrypted = encryptStructuredValue(original);

    expect(encrypted).not.toEqual(original);
    expect(isEncryptedString(encrypted.name)).toBe(true);
    expect(isEncryptedString(encrypted.emergencyContact.relationship)).toBe(true);
    expect(isEncryptedString(encrypted.medicalHistory.chronicDiseases[0].disease)).toBe(true);

    expect(decryptStructuredValue(encrypted)).toEqual(original);
  });

  /**
   * 이미 암호화된 문자열은 다시 감싸지 않아 중복 암호화를 막는지 확인합니다.
   */
  test('이미 암호화된 문자열은 중복 암호화하지 않는다', () => {
    const encrypted = encryptString('서울특별시');

    expect(encryptString(encrypted)).toBe(encrypted);
  });

  /**
   * Mongoose 서브문서/배열을 그대로 넘겨도 내부 순환 참조 없이 안전하게 암복호화해야 합니다.
   */
  test('Mongoose 서브문서 배열도 스택 오버플로우 없이 암복호화한다', () => {
    const medicalHistorySchema = new mongoose.Schema(
      {
        medications: [
          new mongoose.Schema(
            {
              name: String,
            },
            { _id: false },
          ),
        ],
        allergies: [
          new mongoose.Schema(
            {
              substance: String,
            },
            { _id: false },
          ),
        ],
        chronicDiseases: [
          new mongoose.Schema(
            {
              disease: String,
            },
            { _id: false },
          ),
        ],
      },
      { _id: false },
    );
    const sampleSchema = new mongoose.Schema({
      medicalHistory: medicalHistorySchema,
    });
    const SampleModel =
      mongoose.models.PersonalDataCryptoSample ||
      mongoose.model('PersonalDataCryptoSample', sampleSchema);
    const doc = new SampleModel({
      medicalHistory: {
        medications: [{ name: '혈압약' }],
        allergies: [{ substance: '땅콩' }],
        chronicDiseases: [{ disease: '고혈압' }],
      },
    });

    const encrypted = encryptStructuredValue(doc.medicalHistory);

    expect(isEncryptedString(encrypted.medications[0].name)).toBe(true);
    expect(isEncryptedString(encrypted.allergies[0].substance)).toBe(true);
    expect(isEncryptedString(encrypted.chronicDiseases[0].disease)).toBe(true);
    expect(decryptStructuredValue(encrypted)).toEqual({
      medications: [{ name: '혈압약' }],
      allergies: [{ substance: '땅콩' }],
      chronicDiseases: [{ disease: '고혈압' }],
    });
  });
});
