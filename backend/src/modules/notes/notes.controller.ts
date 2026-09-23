import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../middleware/auth.middleware';
import { NotesService } from './notes.service';

const service = new NotesService();

export async function create(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const note = await service.create(req.userId as string, req.body);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
}

export async function get(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.getOwned(req.userId as string, req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.update(req.userId as string, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function list(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { notebookId, tagId, includeDeleted, page, pageSize } = req.query;
    const notes = await service.list(req.userId as string, {
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

export async function softDelete(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.softDelete(req.userId as string, req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function restore(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.restore(req.userId as string, req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function permanentDelete(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.permanentDelete(req.userId as string, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function pin(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.setPinned(req.userId as string, req.params.id, !!req.body.pinned));
  } catch (err) {
    next(err);
  }
}
