/**
 * API 기본 테스트
 * 실제 테스트는 jest로 실행: npm test
 */

const request = require('supertest');
const { app } = require('../server');

describe('API 기본 테스트', () => {
  test('Health check', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('404 핸들링', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
