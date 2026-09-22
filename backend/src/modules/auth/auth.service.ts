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
    if (!email || !password) throw Errors.BadRequest('邮箱和密码不能为空');
    if (password.length < 6) throw Errors.BadRequest('密码长度至少6位');

    const existing = [...store.users.values()].find((u) => u.email === email);
    if (existing) throw Errors.Conflict('该邮箱已被注册');

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
    if (!user) throw Errors.Unauthorized('邮箱或密码错误');

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw Errors.Unauthorized('邮箱或密码错误');

    const accessToken = signToken(user.id);
    return { user: { id: user.id, email: user.email, nickname: user.nickname }, accessToken };
  }
}
