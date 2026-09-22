import { randomUUID } from 'crypto';
import { store } from '../../db/store';
import { Errors } from '../../utils/errors';
import { Notebook } from '../../types';

export class NotebooksService {
  create(userId: string, name: string, parentId: string | null = null): Notebook {
    if (!name || !name.trim()) throw Errors.BadRequest('笔记本名称不能为空');
    if (parentId) {
      const parent = store.notebooks.get(parentId);
      if (!parent || parent.userId !== userId) throw Errors.NotFound('父级笔记本不存在');
    }
    const notebook: Notebook = {
      id: randomUUID(),
      userId,
      parentId,
      name: name.trim(),
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    };
    store.notebooks.set(notebook.id, notebook);
    return notebook;
  }

  list(userId: string): Notebook[] {
    return [...store.notebooks.values()].filter((n) => n.userId === userId);
  }

  private getOwned(userId: string, id: string): Notebook {
    const nb = store.notebooks.get(id);
    if (!nb || nb.userId !== userId) throw Errors.NotFound('笔记本不存在');
    return nb;
  }

  rename(userId: string, id: string, name: string): Notebook {
    const nb = this.getOwned(userId, id);
    if (!name || !name.trim()) throw Errors.BadRequest('笔记本名称不能为空');
    nb.name = name.trim();
    return nb;
  }

  /**
   * 删除笔记本。按需求文档设计：笔记本内的笔记会被移入回收站（软删除），
   * 而不是被直接永久删除。
   */
  remove(userId: string, id: string): void {
    this.getOwned(userId, id);
    const now = new Date().toISOString();
    for (const note of store.notes.values()) {
      if (note.notebookId === id && note.userId === userId && !note.isDeleted) {
        note.isDeleted = true;
        note.deletedAt = now;
      }
    }
    store.notebooks.delete(id);
  }
}
