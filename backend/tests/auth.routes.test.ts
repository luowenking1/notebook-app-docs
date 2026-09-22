import request from 'supertest';
import { createApp } from '../src/app';
import { store } from '../src/db/store';

const app = createApp();

describe('Auth 路由 (集成测试)', () => {
  beforeEach(() => store.reset());

  it('GET /health 返回服务状态', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/v1/auth/register 创建用户', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'x@test.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('x@test.com');
    expect(res.body.accessToken).toBeDefined();
  });

  it('重复邮箱注册返回 409', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'dup@test.com', password: 'password123' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dup@test.com', password: 'password456' });
    expect(res.status).toBe(409);
  });

  it('POST /api/v1/auth/login 正确凭证返回 token', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'y@test.com', password: 'password123' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'y@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('密码错误返回 401', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'z@test.com', password: 'password123' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'z@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});
