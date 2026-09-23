import { pool } from '../../db/pool';

export interface SearchResultItem {
  noteId: string;
  title: string;
  snippet: string;
  notebookId: string | null;
  updatedAt: string;
}

export interface SearchOptions {
  notebookId?: string;
  tagId?: string;
}

interface SearchRow {
  id: string;
  notebook_id: string | null;
  updated_at: Date;
  title_headline: string;
  snippet_headline: string;
}

// StartSel/StopSel keep the highlighting markers identical to the previous
// in-memory implementation, so API consumers (including the built-in web UI)
// don't need to change.
const HEADLINE_OPTS = 'StartSel=<em>, StopSel=</em>, HighlightAll=true';
const SNIPPET_OPTS = 'StartSel=<em>, StopSel=</em>, MaxFragments=1, MaxWords=20, MinWords=5';

export class SearchService {
  /**
   * Full-text search over notes' title and body using PostgreSQL's built-in
   * text search (tsvector/tsquery), matching the design in the technical
   * doc. `plainto_tsquery` tokenizes and stems the user's input the same
   * way the indexed `search_vector` column was built, and `ts_rank` orders
   * results by relevance rather than just recency.
   */
  async search(userId: string, query: string, options: SearchOptions = {}): Promise<SearchResultItem[]> {
    if (!query || !query.trim()) return [];
    const q = query.trim();

    const conditions = ['user_id = $1', 'is_deleted = false', "search_vector @@ plainto_tsquery('english', $2)"];
    const values: unknown[] = [userId, q];
    let i = 3;

    if (options.notebookId) {
      conditions.push(`notebook_id = $${i++}`);
      values.push(options.notebookId);
    }
    if (options.tagId) {
      conditions.push(`EXISTS (SELECT 1 FROM note_tags nt WHERE nt.note_id = notes.id AND nt.tag_id = $${i++})`);
      values.push(options.tagId);
    }

    const result = await pool.query<SearchRow>(
      `SELECT
         id, notebook_id, updated_at,
         ts_headline('english', title, plainto_tsquery('english', $2), '${HEADLINE_OPTS}') AS title_headline,
         ts_headline('english', content, plainto_tsquery('english', $2), '${SNIPPET_OPTS}') AS snippet_headline
       FROM notes
       WHERE ${conditions.join(' AND ')}
       ORDER BY ts_rank(search_vector, plainto_tsquery('english', $2)) DESC
       LIMIT 50`,
      values
    );

    return result.rows.map((row) => ({
      noteId: row.id,
      title: row.title_headline,
      snippet: row.snippet_headline,
      notebookId: row.notebook_id,
      updatedAt: row.updated_at.toISOString(),
    }));
  }
}
