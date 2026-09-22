import { store } from '../src/db/store';
import { AuthService } from '../src/modules/auth/auth.service';

describe('AuthService', () => {
  const service = new AuthService();
  beforeEach(() => store.reset());

  it('registers a new user and returns a usable accessToken', async () => {
    const result = await service.register('a@test.com', 'password123', 'Alice');
    expect(result.user.email).toBe('a@test.com');
    expect(result.user.nickname).toBe('Alice');
    expect(result.accessToken).toEqual(expect.any(String));
    expect(store.users.size).toBe(1);
  });

  it('stores the password as a hash, not plaintext', async () => {
    await service.register('a@test.com', 'password123');
    const stored = [...store.users.values()][0];
    expect(stored.passwordHash).not.toBe('password123');
  });

  it('rejects registering a duplicate email', async () => {
    await service.register('a@test.com', 'password123');
    await expect(service.register('a@test.com', 'password456')).rejects.toMatchObject({ status: 409 });
  });

  it('rejects an overly short password', async () => {
    await expect(service.register('b@test.com', '123')).rejects.toMatchObject({ status: 400 });
  });

  it('logs in with the correct email and password', async () => {
    await service.register('c@test.com', 'password123');
    const result = await service.login('c@test.com', 'password123');
    expect(result.accessToken).toEqual(expect.any(String));
  });

  it('rejects login with the wrong password', async () => {
    await service.register('d@test.com', 'password123');
    await expect(service.login('d@test.com', 'wrongpass')).rejects.toMatchObject({ status: 401 });
  });

  it('rejects login for an email that does not exist', async () => {
    await expect(service.login('nobody@test.com', 'whatever')).rejects.toMatchObject({ status: 401 });
  });
});
