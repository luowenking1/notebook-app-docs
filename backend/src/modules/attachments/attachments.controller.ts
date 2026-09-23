import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../middleware/auth.middleware';
import { ApiError, Errors } from '../../utils/errors';
import { AttachmentsService } from './attachments.service';
import { uploadImage } from './upload.middleware';

const service = new AttachmentsService();

/** Turns multer's own errors (wrong file type, file too large) into our
 *  standard ApiError shape instead of letting them fall through as a 500. */
function mapUploadError(err: unknown): unknown {
  if (err instanceof ApiError) return err;
  if (err && typeof err === 'object' && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    return Errors.BadRequest('File is too large (max 5MB)');
  }
  if (err instanceof Error) return Errors.BadRequest(err.message);
  return err;
}

export async function upload(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      uploadImage(req, res, (err) => (err ? reject(err) : resolve()));
    });
    if (!req.file) throw Errors.BadRequest('No file uploaded (expected a multipart field named "file")');

    const attachment = await service.create(req.userId as string, req.params.noteId, {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      absolutePath: req.file.path,
    });
    res.status(201).json(attachment);
  } catch (err) {
    next(mapUploadError(err));
  }
}

export async function list(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.listForNote(req.userId as string, req.params.noteId));
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
