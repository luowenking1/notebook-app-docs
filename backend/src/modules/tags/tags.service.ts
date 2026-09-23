import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { Errors } from '../../utils/errors';
import { Tag } from '../../types';

const UNIQUE_VIOLATION = '23505';

interface TagRow {
  id: string;
  user_id: string;
  name: string;
}

function mapRow(row: TagRow): Tag {
  return { id: row.id, userId: row.user_id, name: row.name };
}

export class TagsService {
  async create(userId: string, name: string): Promise<Tag> {
    if (!name || !name.trim()) throw Errors.BadRequest('Tag name is required');
    try {
      const result = await pool.query<TagRow>(
        'INSERT INTO tags (id, user_id, name) VALUES ($1, $2, $3) RETURNING *',
        [randomUUID(), userId, name.trim()]
      );
      return mapRow(result.rows[0]);
    } catch (err) {
      if (isUniqueViolation(err)) throw Errors.Conflict('Tag already exists');
      throw err;
    }
  }

  async list(userId: string): Promise<Tag[]> {
    const result = await pool.query<TagRow>('SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC', [userId]);
    return result.rows.map(mapRow);
  }

  private async getOwned(userId: string, id: string): Promise<Tag> {
    const result = await pool.query<TagRow>('SELECT * FROM tags WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rowCount === 0) throw Errors.NotFound('Tag not found');
    return mapRow(result.rows[0]);
  }

  async rename(userId: string, id: string, name: string): Promise<Tag> {
    await this.getOwned(userId, id);
    if (!name || !name.trim()) throw Errors.BadRequest('Tag name is required');
    try {
      const result = await pool.query<TagRow>('UPDATE tags SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *', [
        name.trim(),
        id,
        userId,
      ]);
      return mapRow(result.rows[0]);
    } catch (err) {
      if (isUniqueViolation(err)) throw Errors.Conflict('Tag already exists');
      throw err;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id);
    await pool.query('DELETE FROM tags WHERE id = $1 AND user_id = $2', [id, userId]);
  }

  /** Overwrites a note's tag set. Corresponds to PUT /notes/:id/tags */
  async setNoteTags(userId: string, noteId: string, tagIds: string[]): Promise<void> {
    await assertNoteOwned(userId, noteId);

    if (tagIds.length > 0) {
      const owned = await pool.query<{ id: string }>(
        'SELECT id FROM tags WHERE user_id = $1 AND id = ANY($2::uuid[])',
        [userId, tagIds]
      );
      if (owned.rowCount !== tagIds.length) throw Errors.NotFound('One or more tags not found');
    }

    const client: PoolClient = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM note_tags WHERE note_id = $1', [noteId]);
      for (const tagId of tagIds) {
        await client.query('INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2)', [noteId, tagId]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getTagsForNote(userId: string, noteId: string): Promise<Tag[]> {
    await assertNoteOwned(userId, noteId);
    const result = await pool.query<TagRow>(
      `SELECT t.* FROM tags t
       JOIN note_tags nt ON nt.tag_id = t.id
       WHERE nt.note_id = $1 AND t.user_id = $2
       ORDER BY t.name ASC`,
      [noteId, userId]
    );
    return result.rows.map(mapRow);
  }
}

async function assertNoteOwned(userId: string, noteId: string): Promise<void> {
  const note = await pool.query('SELECT id FROM notes WHERE id = $1 AND user_id = $2', [noteId, userId]);
  if (note.rowCount === 0) throw Errors.NotFound('Note not found');
}

function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { code?: string }).code === UNIQUE_VIOLATION;
}
