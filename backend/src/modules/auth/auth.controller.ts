import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

const authService = new AuthService();

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, nickname } = req.body;
    const result = await authService.register(email, password, nickname);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
