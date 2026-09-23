import { randomUUID } from 'crypto';
import { pool } from '../../db/pool';
import { hashPassword, comparePassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import { randomToken, sha256Hex } from '../../utils/tokens';
import { Errors } from '../../utils/errors';
import { User } from '../../types';

const REFRESH_TOKEN_TTL_DAYS = 30;
const RESET_TOKEN_TTL_HOURS = 1;

export interface AuthResult {
  user: { id: string; email: string; nickname?: string };
  accessToken: string;
  refreshToken: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: Date;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    nickname: row.nickname ?? undefined,
    createdAt: row.created_at.toISOString(),
  };
}

export class AuthService {
  async register(email: string, password: string, nickname?: string): Promise<AuthResult> {
    if (!email || !password) throw Errors.BadRequest('Email and password are required');
    if (password.length < 6) throw Errors.BadRequest('Password must be at least 6 characters');

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if ((existing.rowCount ?? 0) > 0) throw Errors.Conflict('This email is already registered');

    const passwordHash = await hashPassword(password);
    const result = await pool.query<UserRow>(
      `INSERT INTO users (id, email, password_hash, nickname) VALUES ($1, $2, $3, $4) RETURNING *`,
      [randomUUID(), email, passwordHash, nickname ?? null]
    );
    const user = mapUser(result.rows[0]);
    return this.issueTokens(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) throw Errors.Unauthorized('Invalid email or password');
    const user = mapUser(result.rows[0]);

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw Errors.Unauthorized('Invalid email or password');

    return this.issueTokens(user);
  }

  /** Exchanges a still-valid refresh token for a new access token, rotating
   *  the refresh token itself (the old one is revoked so it can't be reused). */
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) throw Errors.Unauthorized('Refresh token is required');
    const tokenHash = sha256Hex(refreshToken);

    const result = await pool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
      [tokenHash]
    );
    if (result.rowCount === 0) throw Errors.Unauthorized('Refresh token is invalid or expired');
    const { id, user_id: userId } = result.rows[0];

    await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [id]);

    const newRefreshToken = await this.createRefreshToken(userId);
    return { accessToken: signToken(userId), refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = sha256Hex(refreshToken);
    await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [
      tokenHash,
    ]);
  }

  /**
   * Starts a password reset. To avoid leaking which emails are registered,
   * this always resolves successfully even if the email doesn't exist.
   *
   * There's no email provider wired up in this project, so instead of
   * actually sending mail, the raw reset token is returned directly in the
   * response — but ONLY when NODE_ENV !== 'production', as a development
   * convenience. In production this method returns nothing, and a real
   * implementation would email the link and stop there.
   */
  async forgotPassword(email: string): Promise<{ devResetToken?: string }> {
    const result = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) return {};
    const userId = result.rows[0].id;

    const token = randomToken();
    const tokenHash = sha256Hex(token);
    await pool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, now() + ($4 || ' hours')::interval)`,
      [randomUUID(), userId, tokenHash, RESET_TOKEN_TTL_HOURS]
    );

    // eslint-disable-next-line no-console
    console.log(`[password reset] token for ${email}: ${token} (expires in ${RESET_TOKEN_TTL_HOURS}h)`);

    if (process.env.NODE_ENV === 'production') return {};
    return { devResetToken: token };
  }

  /** Consumes a reset token, sets the new password, and — since a password
   *  change should invalidate any session issued under the old one —
   *  revokes every refresh token the user currently holds. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!token) throw Errors.BadRequest('Reset token is required');
    if (!newPassword || newPassword.length < 6) throw Errors.BadRequest('Password must be at least 6 characters');

    const tokenHash = sha256Hex(token);
    const result = await pool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
      [tokenHash]
    );
    if (result.rowCount === 0) throw Errors.BadRequest('Reset token is invalid or expired');
    const { id, user_id: userId } = result.rows[0];

    const passwordHash = await hashPassword(newPassword);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
      await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [id]);
      await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [
        userId,
      ]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const accessToken = signToken(user.id);
    const refreshToken = await this.createRefreshToken(user.id);
    return { user: { id: user.id, email: user.email, nickname: user.nickname }, accessToken, refreshToken };
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = randomToken();
    await pool.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, now() + ($4 || ' days')::interval)`,
      [randomUUID(), userId, sha256Hex(token), REFRESH_TOKEN_TTL_DAYS]
    );
    return token;
  }
}
