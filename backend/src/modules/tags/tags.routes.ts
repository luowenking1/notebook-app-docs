import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import * as ctrl from './tags.controller';

export const tagsRouter = Router();
tagsRouter.use(requireAuth);
tagsRouter.get('/', ctrl.list);
tagsRouter.post('/', ctrl.create);
tagsRouter.patch('/:id', ctrl.rename);
tagsRouter.delete('/:id', ctrl.remove);

// Mounted under the /notes prefix: PUT /api/v1/notes/:noteId/tags
export const noteTagsRouter = Router();
noteTagsRouter.use(requireAuth);
noteTagsRouter.get('/:noteId/tags', ctrl.getNoteTags);
noteTagsRouter.put('/:noteId/tags', ctrl.setNoteTags);
