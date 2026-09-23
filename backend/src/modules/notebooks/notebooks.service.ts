import { randomUUID } from 'crypto';
import { pool } from '../../db/pool';
import { Errors } from '../../utils/errors';
import { Notebook } from '../../types';

interface NotebookRow {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: Date;
}

function mapRow(row: NotebookRow): Notebook {
  return {
    id: row.id,
    userId: row.user_id,
    parentId: row.parent_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
  };
}

export class NotebooksService {
  async create(userId: string, name: string, parentId: string | null = null): Promise<Notebook> {
    if (!name || !name.trim()) throw Errors.BadRequest('Notebook name is required');
    if (parentId) {
      const parent = await pool.query<NotebookRow>('SELECT * FROM notebooks WHERE id = $1 AND user_id = $2', [
        parentId,
        userId,
      ]);
      if (parent.rowCount === 0) throw Errors.NotFound('Parent notebook not found');
    }
    const result = await pool.query<NotebookRow>(
      `INSERT INTO notebooks (id, user_id, parent_id, name, sort_order)
       VALUES ($1, $2, $3, $4, 0) RETURNING *`,
      [randomUUID(), userId, parentId, name.trim()]
    );
    return mapRow(result.rows[0]);
  }

  async list(userId: string): Promise<Notebook[]> {
    const result = await pool.query<NotebookRow>(
      'SELECT * FROM notebooks WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    return result.rows.map(mapRow);
  }

  private async getOwned(userId: string, id: string): Promise<Notebook> {
    const result = await pool.query<NotebookRow>('SELECT * FROM notebooks WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
    if (result.rowCount === 0) throw Errors.NotFound('Notebook not found');
    return mapRow(result.rows[0]);
  }

  async rename(userId: string, id: string, name: string): Promise<Notebook> {
    await this.getOwned(userId, id);
    if (!name || !name.trim()) throw Errors.BadRequest('Notebook name is required');
    const result = await pool.query<NotebookRow>(
      'UPDATE notebooks SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [name.trim(), id, userId]
    );
    return mapRow(result.rows[0]);
  }

  /**
   * Delete a notebook. Per the PRD: notes inside the notebook are moved to
   * the trash (soft-deleted) rather than being permanently deleted outright.
   */
  async remove(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE notes SET is_deleted = true, deleted_at = now()
         WHERE notebook_id = $1 AND user_id = $2 AND is_deleted = false`,
        [id, userId]
      );
      await client.query('DELETE FROM notebooks WHERE id = $1 AND user_id = $2', [id, userId]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
