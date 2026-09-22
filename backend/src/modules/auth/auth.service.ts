import { randomUUID } from 'crypto';
import { store } from '../../db/store';
import { hashPassword, comparePassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import { Errors } from '../../utils/errors';
import { User } from '../../types';

export interface AuthResult {
  user: { id: string; email: string; nickname?: string };
  accessToken: string;
}

export class AuthService {
  async register(email: string, password: string, nickname?: string): Promise<AuthResult> {
    if (!email || !password) throw Errors.BadRequest('Email and password are required');
    if (password.length < 6) throw Errors.BadRequest('Password must be at least 6 characters');

    const existing = [...store.users.values()].find((u) => u.email === email);
    if (existing) throw Errors.Conflict('This email is already registered');

    const passwordHash = await hashPassword(password);
    const user: User = {
      id: randomUUID(),
      email,
      passwordHash,
      nickname,
      createdAt: new Date().toISOString(),
    };
    store.users.set(user.id, user);

    const accessToken = signToken(user.id);
    return { user: { id: user.id, email: user.email, nickname: user.nickname }, accessToken };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = [...store.users.values()].find((u) => u.email === email);
    if (!user) throw Errors.Unauthorized('Invalid email or password');

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw Errors.Unauthorized('Invalid email or password');

    const accessToken = signToken(user.id);
    return { user: { id: user.id, email: user.email, nickname: user.nickname }, accessToken };
  }
}
