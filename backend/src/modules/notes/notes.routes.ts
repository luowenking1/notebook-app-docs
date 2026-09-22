import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import * as ctrl from './notes.controller';

export const notesRouter = Router();
notesRouter.use(requireAuth);
notesRouter.get('/', ctrl.list);
notesRouter.post('/', ctrl.create);
notesRouter.get('/:id', ctrl.get);
notesRouter.patch('/:id', ctrl.update);
notesRouter.delete('/:id', ctrl.softDelete);
notesRouter.post('/:id/restore', ctrl.restore);
notesRouter.delete('/:id/permanent', ctrl.permanentDelete);
notesRouter.patch('/:id/pin', ctrl.pin);
