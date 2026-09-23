import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { Request } from 'express';
import { AuthedRequest } from '../../middleware/auth.middleware';
import { uploadsRoot } from './attachments.service';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

const storage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const userId = (req as AuthedRequest).userId as string;
    const dir = path.join(uploadsRoot(), userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error('Only PNG, JPEG, GIF, or WEBP images are allowed'));
    return;
  }
  cb(null, true);
}

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
}).single('file');
