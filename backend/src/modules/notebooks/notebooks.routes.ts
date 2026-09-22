import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { create, list, rename, remove } from './notebooks.controller';

export const notebooksRouter = Router();
notebooksRouter.use(requireAuth);
notebooksRouter.get('/', list);
notebooksRouter.post('/', create);
notebooksRouter.patch('/:id', rename);
notebooksRouter.delete('/:id', remove);
