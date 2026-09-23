import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../middleware/auth.middleware';
import { NotebooksService } from './notebooks.service';

const service = new NotebooksService();

export async function create(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, parentId } = req.body;
    const nb = await service.create(req.userId as string, name, parentId ?? null);
    res.status(201).json(nb);
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
    const nb = await service.rename(req.userId as string, req.params.id, req.body.name);
    res.json(nb);
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
