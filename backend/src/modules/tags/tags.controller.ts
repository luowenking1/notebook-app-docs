import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../middleware/auth.middleware';
import { TagsService } from './tags.service';

const service = new TagsService();

export function create(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    res.status(201).json(service.create(req.userId as string, req.body.name));
  } catch (err) {
    next(err);
  }
}

export function list(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    res.json(service.list(req.userId as string));
  } catch (err) {
    next(err);
  }
}

export function rename(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    res.json(service.rename(req.userId as string, req.params.id, req.body.name));
  } catch (err) {
    next(err);
  }
}

export function remove(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    service.remove(req.userId as string, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export function setNoteTags(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    service.setNoteTags(req.userId as string, req.params.noteId, req.body.tagIds || []);
    res.json(service.getTagsForNote(req.userId as string, req.params.noteId));
  } catch (err) {
    next(err);
  }
}

export function getNoteTags(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    res.json(service.getTagsForNote(req.userId as string, req.params.noteId));
  } catch (err) {
    next(err);
  }
}
