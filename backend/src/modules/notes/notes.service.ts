import { randomUUID } from 'crypto';
import { pool } from '../../db/pool';
import { Errors } from '../../utils/errors';
import { Note } from '../../types';

const TRASH_RETENTION_DAYS = 30;

export interface CreateNoteInput {
  title: string;
  content?: string;
  notebookId: string;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  notebookId?: string;
}

export interface ListNotesOptions {
  notebookId?: string;
  tagId?: string;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
}

interface NoteRow {
  id: string;
  user_id: string;
  notebook_id: string | null;
  title: string;
  content: string;
  is_pinned: boolean;
  is_deleted: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export function mapNoteRow(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    notebookId: row.notebook_id,
    title: row.title,
    content: row.content,
    isPinned: row.is_pinned,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class NotesService {
  async create(userId: string, input: CreateNoteInput): Promise<Note> {
    if (!input.title || !input.title.trim()) throw Errors.BadRequest('Title is required');
    const notebook = await pool.query('SELECT id FROM notebooks WHERE id = $1 AND user_id = $2', [
      input.notebookId,
      userId,
    ]);
    if (notebook.rowCount === 0) throw Errors.NotFound('Notebook not found');

    const result = await pool.query<NoteRow>(
      `INSERT INTO notes (id, user_id, notebook_id, title, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [randomUUID(), userId, input.notebookId, input.title.trim(), input.content ?? '']
    );
    return mapNoteRow(result.rows[0]);
  }

  async getOwned(userId: string, id: string): Promise<Note> {
    const result = await pool.query<NoteRow>('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rowCount === 0) throw Errors.NotFound('Note not found');
    return mapNoteRow(result.rows[0]);
  }

  /** Corresponds to PATCH /notes/:id — this is what the frontend's auto-save calls */
  async update(userId: string, id: string, input: UpdateNoteInput): Promise<Note> {
    await this.getOwned(userId, id);

    if (input.title !== undefined && !input.title.trim()) throw Errors.BadRequest('Title is required');
    if (input.notebookId !== undefined) {
      const nb = await pool.query('SELECT id FROM notebooks WHERE id = $1 AND user_id = $2', [
        input.notebookId,
        userId,
      ]);
      if (nb.rowCount === 0) throw Errors.NotFound('Notebook not found');
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (input.title !== undefined) {
      sets.push(`title = $${i++}`);
      values.push(input.title.trim());
    }
    if (input.content !== undefined) {
      sets.push(`content = $${i++}`);
      values.push(input.content);
    }
    if (input.notebookId !== undefined) {
      sets.push(`notebook_id = $${i++}`);
      values.push(input.notebookId);
    }
    sets.push('updated_at = now()');

    values.push(id, userId);
    const result = await pool.query<NoteRow>(
      `UPDATE notes SET ${sets.join(', ')} WHERE id = $${i++} AND user_id = $${i++} RETURNING *`,
      values
    );
    return mapNoteRow(result.rows[0]);
  }

  async list(userId: string, options: ListNotesOptions = {}): Promise<Note[]> {
    const { notebookId, tagId, includeDeleted = false, page = 1, pageSize = 20 } = options;

    const conditions = ['user_id = $1', 'is_deleted = $2'];
    const values: unknown[] = [userId, includeDeleted];
    let i = 3;

    if (notebookId) {
      conditions.push(`notebook_id = $${i++}`);
      values.push(notebookId);
    }
    if (tagId) {
      conditions.push(`EXISTS (SELECT 1 FROM note_tags nt WHERE nt.note_id = notes.id AND nt.tag_id = $${i++})`);
      values.push(tagId);
    }

    values.push(pageSize, (page - 1) * pageSize);
    const result = await pool.query<NoteRow>(
      `SELECT * FROM notes WHERE ${conditions.join(' AND ')}
       ORDER BY is_pinned DESC, updated_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      values
    );
    return result.rows.map(mapNoteRow);
  }

  async softDelete(userId: string, id: string): Promise<Note> {
    await this.getOwned(userId, id);
    const result = await pool.query<NoteRow>(
      `UPDATE notes SET is_deleted = true, deleted_at = now() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return mapNoteRow(result.rows[0]);
  }

  async restore(userId: string, id: string): Promise<Note> {
    const note = await this.getOwned(userId, id);
    if (!note.isDeleted) throw Errors.BadRequest('Note is not in the trash');
    const result = await pool.query<NoteRow>(
      `UPDATE notes SET is_deleted = false, deleted_at = null WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return mapNoteRow(result.rows[0]);
  }

  async permanentDelete(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id);
    await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [id, userId]);
  }

  async setPinned(userId: string, id: string, pinned: boolean): Promise<Note> {
    await this.getOwned(userId, id);
    const result = await pool.query<NoteRow>(
      'UPDATE notes SET is_pinned = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [pinned, id, userId]
    );
    return mapNoteRow(result.rows[0]);
  }

  /**
   * Purge notes that have been in the trash for more than 30 days
   * (corresponds to PRD Section 3.6: trash is retained for 30 days and
   * cleaned up on a schedule). Returns the number of notes purged, which
   * is convenient for tests and logging.
   */
  async purgeExpired(now: Date = new Date()): Promise<number> {
    const result = await pool.query(
      `DELETE FROM notes
       WHERE is_deleted = true
         AND deleted_at < ($1::timestamptz - ($2 || ' days')::interval)`,
      [now.toISOString(), TRASH_RETENTION_DAYS]
    );
    return result.rowCount ?? 0;
  }
}
