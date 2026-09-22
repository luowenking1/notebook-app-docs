import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../middleware/auth.middleware';
import { NotebooksService } from './notebooks.service';

const service = new NotebooksService();

export function create(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    const { name, parentId } = req.body;
    const nb = service.create(req.userId as string, name, parentId ?? null);
    res.status(201).json(nb);
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
    const nb = service.rename(req.userId as string, req.params.id, req.body.name);
    res.json(nb);
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
