import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { Errors } from '../utils/errors';

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(Errors.Unauthorized('Missing or invalid auth token'));
    return;
  }
  const token = header.slice('Bearer '.length);
  try {
    req.userId = verifyToken(token);
    next();
  } catch {
    next(Errors.Unauthorized('Token is invalid or expired'));
  }
}
