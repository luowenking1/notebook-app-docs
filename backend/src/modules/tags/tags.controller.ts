import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../middleware/auth.middleware';
import { TagsService } from './tags.service';

const service = new TagsService();

export async function create(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json(await service.create(req.userId as string, req.body.name));
  } catch (err) {
    next(err);
  }
}

export async function list(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.list(req.userId as string));
  } catch (err) {
    next(err);
  }
}

export async function rename(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.rename(req.userId as string, req.params.id, req.body.name));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.remove(req.userId as string, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function setNoteTags(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.setNoteTags(req.userId as string, req.params.noteId, req.body.tagIds || []);
    res.json(await service.getTagsForNote(req.userId as string, req.params.noteId));
  } catch (err) {
    next(err);
  }
}

export async function getNoteTags(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.getTagsForNote(req.userId as string, req.params.noteId));
  } catch (err) {
    next(err);
  }
}
