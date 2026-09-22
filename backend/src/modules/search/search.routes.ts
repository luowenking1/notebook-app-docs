import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { search } from './search.controller';

export const searchRouter = Router();
searchRouter.use(requireAuth);
searchRouter.get('/', search);
