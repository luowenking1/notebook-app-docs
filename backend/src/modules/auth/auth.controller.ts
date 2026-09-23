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

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    // Always a generic message, regardless of whether the email existed —
    // see AuthService.forgotPassword for why. devResetToken is only present
    // outside production, as a convenience since no email provider is wired up.
    res.status(200).json({ message: 'If that email is registered, a reset link has been sent.', ...result });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    res.status(200).json({ message: 'Password has been reset.' });
  } catch (err) {
    next(err);
  }
}
