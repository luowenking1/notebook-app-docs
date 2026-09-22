import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../middleware/auth.middleware';
import { SearchService } from './search.service';

const service = new SearchService();

export function search(req: AuthedRequest, res: Response, next: NextFunction): void {
  try {
    const { q, notebookId, tagId } = req.query;
    const results = service.search(req.userId as string, String(q || ''), {
      notebookId: notebookId as string | undefined,
      tagId: tagId as string | undefined,
    });
    res.json({ results, total: results.length });
  } catch (err) {
    next(err);
  }
}
