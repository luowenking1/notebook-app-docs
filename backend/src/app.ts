import path from 'path';
import express, { Express } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { notebooksRouter } from './modules/notebooks/notebooks.routes';
import { notesRouter } from './modules/notes/notes.routes';
import { tagsRouter, noteTagsRouter } from './modules/tags/tags.routes';
import { searchRouter } from './modules/search/search.routes';
import { noteAttachmentsRouter, attachmentsRouter } from './modules/attachments/attachments.routes';
import { errorHandler } from './middleware/error.middleware';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/notebooks', notebooksRouter);
  app.use('/api/v1/notes', notesRouter);
  app.use('/api/v1/tags', tagsRouter);
  app.use('/api/v1/notes', noteTagsRouter); // GET/PUT /api/v1/notes/:noteId/tags
  app.use('/api/v1/notes', noteAttachmentsRouter); // POST/GET /api/v1/notes/:noteId/attachments
  app.use('/api/v1/attachments', attachmentsRouter); // DELETE /api/v1/attachments/:id
  app.use('/api/v1/search', searchRouter);

  // Uploaded images (see modules/attachments) — served by file path, no auth
  // check on the static file itself since paths include an unguessable UUID.
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // Serve the small built-in web UI (backend/public) at the site root.
  // `../public` resolves correctly whether this runs from src (ts-node) or
  // dist (compiled build), since `public` sits alongside both as a sibling
  // directory under the backend/ folder.
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(errorHandler);
  return app;
}
