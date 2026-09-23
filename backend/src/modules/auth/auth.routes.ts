import { Router } from 'express';
import { register, login, refresh, logout, forgotPassword, resetPassword } from './auth.controller';

export const authRouter = Router();
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.post('/password/forgot', forgotPassword);
authRouter.post('/password/reset', resetPassword);
