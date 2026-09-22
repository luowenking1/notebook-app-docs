import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../middleware/auth.middleware';
import { NotesService } from './notes.service';

const service = new NotesService();

export function create(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    const note = service.create(req.userId as string, req.body);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
}

export function get(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    res.json(service.getOwned(req.userId as string, req.params.id));
  } catch (err) {
    next(err);
  }
}

export function update(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    res.json(service.update(req.userId as string, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export function list(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    const { notebookId, tagId, includeDeleted, page, pageSize } = req.query;
    const notes = service.list(req.userId as string, {
      notebookId: notebookId as string | undefined,
      tagId: tagId as string | undefined,
      includeDeleted: includeDeleted === 'true',
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(notes);
  } catch (err) {
    next(err);
  }
}

export function softDelete(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    res.json(service.softDelete(req.userId as string, req.params.id));
  } catch (err) {
    next(err);
  }
}

export function restore(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    res.json(service.restore(req.userId as string, req.params.id));
  } catch (err) {
    next(err);
  }
}

export function permanentDelete(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    service.permanentDelete(req.userId as string, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export function pin(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    res.json(service.setPinned(req.userId as string, req.params.id, !!req.body.pinned));
  } catch (err) {
    next(err);
  }
}
