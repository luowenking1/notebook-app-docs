import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { Errors } from '../utils/errors';

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(Errors.Unauthorized('缺少或无效的认证令牌'));
    return;
  }
  const token = header.slice('Bearer '.length);
  try {
    req.userId = verifyToken(token);
    next();
  } catch {
    next(Errors.Unauthorized('令牌无效或已过期'));
  }
}
