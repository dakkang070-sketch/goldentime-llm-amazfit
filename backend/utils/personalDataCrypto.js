const crypto = require('crypto');
const { getJwtSecret } = require('./security');

const ENCRYPTED_PREFIX = 'enc::';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * Mongoose 서브문서/배열처럼 내부 순환 참조를 가질 수 있는 값을 평범한 JS 구조로 정규화합니다.
 */
function normalizeStructuredContainer(value) {
  if (!value || typeof value !== 'object' || value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return Array.from(value);
  }

  if (typeof value.toObject === 'function') {
    return value.toObject({
      depopulate: true,
      flattenMaps: true,
      getters: false,
      virtuals: false,
      versionKey: false,
      transform: false,
    });
  }

  return value;
}

/**
 * 개인 정보 암호화 키를 환경변수 우선, JWT 시크릿 차선으로 32바이트 길이에 맞춰 파생합니다.
 */
function getPersonalDataKey() {
  const source =
    String(process.env.PERSONAL_DATA_ENCRYPTION_KEY || '').trim() || getJwtSecret();
  return crypto.createHash('sha256').update(source).digest();
}

/**
 * 암호화 문자열 포맷인지 확인해 중복 암호화를 방지합니다.
 */
function isEncryptedString(value) {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * 단일 문자열을 AES-256-GCM으로 암호화합니다.
 */
function encryptString(value) {
  const normalized = String(value || '');
  if (!normalized) {
    return normalized;
  }
  if (isEncryptedString(normalized)) {
    return normalized;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getPersonalDataKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * 암호화 문자열을 복호화하고, 포맷이 아니면 원문 그대로 반환합니다.
 */
function decryptString(value) {
  if (!isEncryptedString(value)) {
    return value;
  }

  const payload = String(value).slice(ENCRYPTED_PREFIX.length);
  const [ivHex, tagHex, encryptedHex] = payload.split(':');
  if (!ivHex || !tagHex || !encryptedHex) {
    return value;
  }

  try {
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      getPersonalDataKey(),
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return value;
  }
}

/**
 * 문자열/배열/객체 내부의 민감 문자열을 재귀적으로 암호화합니다.
 */
function encryptStructuredValue(value) {
  if (typeof value === 'string') {
    return encryptString(value);
  }
  if (Array.isArray(value)) {
    return Array.from(value, (item) => encryptStructuredValue(item));
  }
  if (value instanceof Date) {
    return value;
  }
  const normalizedValue = normalizeStructuredContainer(value);
  if (normalizedValue && typeof normalizedValue === 'object') {
    return Object.entries(normalizedValue).reduce((acc, [key, entry]) => {
      acc[key] = encryptStructuredValue(entry);
      return acc;
    }, {});
  }
  return value;
}

/**
 * 문자열/배열/객체 내부의 암호화 문자열을 재귀적으로 복호화합니다.
 */
function decryptStructuredValue(value) {
  if (typeof value === 'string') {
    return decryptString(value);
  }
  if (Array.isArray(value)) {
    return Array.from(value, (item) => decryptStructuredValue(item));
  }
  if (value instanceof Date) {
    return value;
  }
  const normalizedValue = normalizeStructuredContainer(value);
  if (normalizedValue && typeof normalizedValue === 'object') {
    return Object.entries(normalizedValue).reduce((acc, [key, entry]) => {
      acc[key] = decryptStructuredValue(entry);
      return acc;
    }, {});
  }
  return value;
}

module.exports = {
  decryptStructuredValue,
  decryptString,
  encryptStructuredValue,
  encryptString,
  isEncryptedString,
};
