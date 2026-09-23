import { pool } from '../src/db/pool';
import { resetDb, closeDb } from './testDb';
import { AuthService } from '../src/modules/auth/auth.service';
import { sha256Hex } from '../src/utils/tokens';

describe('AuthService', () => {
  const service = new AuthService();
  beforeEach(async () => resetDb());
  afterAll(async () => closeDb());

  it('registers a new user and returns a usable accessToken + refreshToken', async () => {
    const result = await service.register('a@test.com', 'password123', 'Alice');
    expect(result.user.email).toBe('a@test.com');
    expect(result.user.nickname).toBe('Alice');
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));

    const row = await pool.query('SELECT * FROM users WHERE email = $1', ['a@test.com']);
    expect(row.rowCount).toBe(1);
  });

  it('stores the password as a hash, not plaintext', async () => {
    await service.register('a@test.com', 'password123');
    const row = await pool.query('SELECT password_hash FROM users WHERE email = $1', ['a@test.com']);
    expect(row.rows[0].password_hash).not.toBe('password123');
  });

  it('stores the refresh token only as a hash, never in plaintext', async () => {
    const result = await service.register('a@test.com', 'password123');
    const row = await pool.query('SELECT token_hash FROM refresh_tokens');
    expect(row.rows[0].token_hash).toBe(sha256Hex(result.refreshToken));
    expect(row.rows[0].token_hash).not.toBe(result.refreshToken);
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

  describe('refresh tokens', () => {
    it('exchanges a valid refresh token for a new access token and rotates the refresh token', async () => {
      const registered = await service.register('e@test.com', 'password123');
      const refreshed = await service.refresh(registered.refreshToken);
      expect(refreshed.accessToken).toEqual(expect.any(String));
      expect(refreshed.refreshToken).not.toBe(registered.refreshToken);
    });

    it('rejects a refresh token that was already rotated (single use)', async () => {
      const registered = await service.register('f@test.com', 'password123');
      await service.refresh(registered.refreshToken);
      await expect(service.refresh(registered.refreshToken)).rejects.toMatchObject({ status: 401 });
    });

    it('rejects an unknown refresh token', async () => {
      await expect(service.refresh('not-a-real-token')).rejects.toMatchObject({ status: 401 });
    });

    it('logout revokes the refresh token', async () => {
      const registered = await service.register('g@test.com', 'password123');
      await service.logout(registered.refreshToken);
      await expect(service.refresh(registered.refreshToken)).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('password recovery', () => {
    it('forgotPassword returns a dev reset token outside production', async () => {
      await service.register('h@test.com', 'password123');
      const result = await service.forgotPassword('h@test.com');
      expect(result.devResetToken).toEqual(expect.any(String));
    });

    it('forgotPassword does not reveal whether the email exists', async () => {
      const result = await service.forgotPassword('nobody@test.com');
      expect(result.devResetToken).toBeUndefined();
    });

    it('resetPassword changes the password and invalidates the old one', async () => {
      await service.register('i@test.com', 'password123');
      const { devResetToken } = await service.forgotPassword('i@test.com');
      await service.resetPassword(devResetToken as string, 'newpassword456');

      await expect(service.login('i@test.com', 'password123')).rejects.toMatchObject({ status: 401 });
      const loggedIn = await service.login('i@test.com', 'newpassword456');
      expect(loggedIn.accessToken).toEqual(expect.any(String));
    });

    it('resetPassword revokes all existing refresh tokens (forces re-login everywhere)', async () => {
      const registered = await service.register('j@test.com', 'password123');
      const { devResetToken } = await service.forgotPassword('j@test.com');
      await service.resetPassword(devResetToken as string, 'newpassword456');

      await expect(service.refresh(registered.refreshToken)).rejects.toMatchObject({ status: 401 });
    });

    it('rejects an unknown or already-used reset token', async () => {
      await expect(service.resetPassword('not-a-real-token', 'newpassword456')).rejects.toMatchObject({
        status: 400,
      });
    });

    it('rejects a new password that is too short', async () => {
      await service.register('k@test.com', 'password123');
      const { devResetToken } = await service.forgotPassword('k@test.com');
      await expect(service.resetPassword(devResetToken as string, '123')).rejects.toMatchObject({ status: 400 });
    });
  });
});
