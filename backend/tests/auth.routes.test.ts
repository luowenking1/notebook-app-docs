import request from 'supertest';
import { createApp } from '../src/app';
import { resetDb, closeDb } from './testDb';

const app = createApp();

describe('Auth routes (integration)', () => {
  beforeEach(async () => resetDb());
  afterAll(async () => closeDb());

  it('GET /health returns the service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/v1/auth/register creates a user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'x@test.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('x@test.com');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('registering a duplicate email returns 409', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'dup@test.com', password: 'password123' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dup@test.com', password: 'password456' });
    expect(res.status).toBe(409);
  });

  it('POST /api/v1/auth/login returns a token for valid credentials', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'y@test.com', password: 'password123' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'y@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('returns 401 for the wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'z@test.com', password: 'password123' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'z@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/refresh issues a new access token', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ email: 'r@test.com', password: 'password123' });
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: reg.body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(reg.body.refreshToken);
  });

  it('POST /api/v1/auth/logout revokes the refresh token', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ email: 's@test.com', password: 'password123' });
    const logoutRes = await request(app).post('/api/v1/auth/logout').send({ refreshToken: reg.body.refreshToken });
    expect(logoutRes.status).toBe(204);

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: reg.body.refreshToken });
    expect(refreshRes.status).toBe(401);
  });

  it('walks the full forgot -> reset -> login-with-new-password flow', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 't@test.com', password: 'password123' });

    const forgotRes = await request(app).post('/api/v1/auth/password/forgot').send({ email: 't@test.com' });
    expect(forgotRes.status).toBe(200);
    const resetToken = forgotRes.body.devResetToken;
    expect(resetToken).toEqual(expect.any(String));

    const resetRes = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: resetToken, password: 'newpassword456' });
    expect(resetRes.status).toBe(200);

    const oldLoginRes = await request(app).post('/api/v1/auth/login').send({ email: 't@test.com', password: 'password123' });
    expect(oldLoginRes.status).toBe(401);

    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 't@test.com', password: 'newpassword456' });
    expect(newLoginRes.status).toBe(200);
  });

  it('forgot-password does not reveal whether the email is registered', async () => {
    const res = await request(app).post('/api/v1/auth/password/forgot').send({ email: 'nobody@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.devResetToken).toBeUndefined();
  });
});
