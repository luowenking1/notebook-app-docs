import express, { Express } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { notebooksRouter } from './modules/notebooks/notebooks.routes';
import { notesRouter } from './modules/notes/notes.routes';
import { tagsRouter, noteTagsRouter } from './modules/tags/tags.routes';
import { searchRouter } from './modules/search/search.routes';
import { errorHandler } from './middleware/error.middleware';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/notebooks', notebooksRouter);
  app.use('/api/v1/notes', notesRouter);
  app.use('/api/v1/tags', tagsRouter);
  app.use('/api/v1/notes', noteTagsRouter); // PUT /api/v1/notes/:noteId/tags
  app.use('/api/v1/search', searchRouter);

  app.use(errorHandler);
  return app;
}
