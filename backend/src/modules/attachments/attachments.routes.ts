import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import * as ctrl from './attachments.controller';

// Mounted under /notes: POST/GET /api/v1/notes/:noteId/attachments
export const noteAttachmentsRouter = Router();
noteAttachmentsRouter.use(requireAuth);
noteAttachmentsRouter.post('/:noteId/attachments', ctrl.upload);
noteAttachmentsRouter.get('/:noteId/attachments', ctrl.list);

// Mounted at /attachments: DELETE /api/v1/attachments/:id
export const attachmentsRouter = Router();
attachmentsRouter.use(requireAuth);
attachmentsRouter.delete('/:id', ctrl.remove);
