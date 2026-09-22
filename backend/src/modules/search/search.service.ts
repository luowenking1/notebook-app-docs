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
  return (start > 0 ? '……' : '') + highlight(raw, query) + (end < content.length ? '……' : '');
}

export class SearchService {
  /**
   * 全文搜索：匹配标题或正文包含关键词的、未删除的笔记。
   * 当前用内存的字符串匹配实现，行为与技术文档中 PostgreSQL tsvector 方案
   * 对外暴露的 API 语义一致（大小写不敏感、返回高亮片段），
   * 后续替换为真实全文索引时上层调用方不需要改动。
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
