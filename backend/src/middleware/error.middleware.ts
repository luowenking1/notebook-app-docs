import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  // 未预期的错误，记录日志并返回通用 500
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
}
