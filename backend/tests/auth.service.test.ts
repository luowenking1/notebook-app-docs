import { store } from '../src/db/store';
import { AuthService } from '../src/modules/auth/auth.service';

describe('AuthService', () => {
  const service = new AuthService();
  beforeEach(() => store.reset());

  it('注册新用户并返回可用的 accessToken', async () => {
    const result = await service.register('a@test.com', 'password123', 'Alice');
    expect(result.user.email).toBe('a@test.com');
    expect(result.user.nickname).toBe('Alice');
    expect(result.accessToken).toEqual(expect.any(String));
    expect(store.users.size).toBe(1);
  });

  it('密码在存储时会被哈希，而不是明文保存', async () => {
    await service.register('a@test.com', 'password123');
    const stored = [...store.users.values()][0];
    expect(stored.passwordHash).not.toBe('password123');
  });

  it('拒绝重复邮箱注册', async () => {
    await service.register('a@test.com', 'password123');
    await expect(service.register('a@test.com', 'password456')).rejects.toMatchObject({ status: 409 });
  });

  it('拒绝过短的密码', async () => {
    await expect(service.register('b@test.com', '123')).rejects.toMatchObject({ status: 400 });
  });

  it('使用正确的邮箱密码可以登录', async () => {
    await service.register('c@test.com', 'password123');
    const result = await service.login('c@test.com', 'password123');
    expect(result.accessToken).toEqual(expect.any(String));
  });

  it('密码错误时登录被拒绝', async () => {
    await service.register('d@test.com', 'password123');
    await expect(service.login('d@test.com', 'wrongpass')).rejects.toMatchObject({ status: 401 });
  });

  it('邮箱不存在时登录被拒绝', async () => {
    await expect(service.login('nobody@test.com', 'whatever')).rejects.toMatchObject({ status: 401 });
  });
});
