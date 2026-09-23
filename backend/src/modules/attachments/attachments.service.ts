import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { pool } from '../../db/pool';
import { Errors } from '../../utils/errors';
import { Attachment } from '../../types';

interface AttachmentRow {
  id: string;
  user_id: string;
  note_id: string;
  file_name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  created_at: Date;
}

function mapRow(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    userId: row.user_id,
    noteId: row.note_id,
    fileName: row.file_name,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    url: row.url,
    createdAt: row.created_at.toISOString(),
  };
}

export interface SavedFile {
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  absolutePath: string;
}

export class AttachmentsService {
  async create(userId: string, noteId: string, file: SavedFile): Promise<Attachment> {
    const note = await pool.query('SELECT id FROM notes WHERE id = $1 AND user_id = $2', [noteId, userId]);
    if (note.rowCount === 0) {
      // Clean up the file we already wrote to disk before rejecting.
      fs.unlink(file.absolutePath, () => undefined);
      throw Errors.NotFound('Note not found');
    }

    const url = `/uploads/${userId}/${file.fileName}`;
    const result = await pool.query<AttachmentRow>(
      `INSERT INTO attachments (id, user_id, note_id, file_name, original_name, mime_type, size_bytes, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [randomUUID(), userId, noteId, file.fileName, file.originalName, file.mimeType, file.sizeBytes, url]
    );
    return mapRow(result.rows[0]);
  }

  async listForNote(userId: string, noteId: string): Promise<Attachment[]> {
    const note = await pool.query('SELECT id FROM notes WHERE id = $1 AND user_id = $2', [noteId, userId]);
    if (note.rowCount === 0) throw Errors.NotFound('Note not found');

    const result = await pool.query<AttachmentRow>(
      'SELECT * FROM attachments WHERE note_id = $1 AND user_id = $2 ORDER BY created_at ASC',
      [noteId, userId]
    );
    return result.rows.map(mapRow);
  }

  async remove(userId: string, attachmentId: string): Promise<void> {
    const result = await pool.query<AttachmentRow>('SELECT * FROM attachments WHERE id = $1 AND user_id = $2', [
      attachmentId,
      userId,
    ]);
    if (result.rowCount === 0) throw Errors.NotFound('Attachment not found');
    const attachment = result.rows[0];

    await pool.query('DELETE FROM attachments WHERE id = $1', [attachmentId]);

    const absolutePath = path.join(uploadsRoot(), userId, attachment.file_name);
    fs.unlink(absolutePath, () => undefined); // best-effort; row is already gone either way
  }
}

export function uploadsRoot(): string {
  return path.join(__dirname, '..', '..', '..', 'uploads');
}
