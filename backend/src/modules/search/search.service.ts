import { store } from '../../db/store';

export interface SearchResultItem {
  noteId: string;
  title: string;
  snippet: string;
  notebookId: string;
  updatedAt: string;
}

export interface SearchOptions {
  notebookId?: string;
  tagId?: string;
}

function highlight(text: string, query: string): string {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return text.slice(0, idx) + '<em>' + text.slice(idx, idx + query.length) + '</em>' + text.slice(idx + query.length);
}

function buildSnippet(content: string, query: string, radius = 20): string {
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(content.length, idx + query.length + radius);
  const raw = content.slice(start, end);
  return (start > 0 ? '...' : '') + highlight(raw, query) + (end < content.length ? '...' : '');
}

export class SearchService {
  /**
   * Full-text search: matches non-deleted notes whose title or body
   * contains the query. Currently implemented with in-memory string
   * matching; its externally-visible API semantics (case-insensitive,
   * returns highlighted snippets) match the PostgreSQL tsvector approach
   * described in the technical doc, so callers won't need to change when
   * this is swapped for a real full-text index later.
   */
  search(userId: string, query: string, options: SearchOptions = {}): SearchResultItem[] {
    if (!query || !query.trim()) return [];
    const q = query.trim();

    let notes = [...store.notes.values()].filter((n) => n.userId === userId && !n.isDeleted);
    if (options.notebookId) notes = notes.filter((n) => n.notebookId === options.notebookId);
    if (options.tagId) {
      const noteIdsWithTag = new Set(
        store.noteTags.filter((nt) => nt.tagId === options.tagId).map((nt) => nt.noteId)
      );
      notes = notes.filter((n) => noteIdsWithTag.has(n.id));
    }

    const matched = notes.filter(
      (n) => n.title.toLowerCase().includes(q.toLowerCase()) || n.content.toLowerCase().includes(q.toLowerCase())
    );

    return matched.map((n) => ({
      noteId: n.id,
      title: highlight(n.title, q),
      snippet: buildSnippet(n.content, q),
      notebookId: n.notebookId,
      updatedAt: n.updatedAt,
    }));
  }
}
