import { randomUUID } from 'crypto';
import { store } from '../../db/store';
import { Errors } from '../../utils/errors';
import { Notebook } from '../../types';

export class NotebooksService {
  create(userId: string, name: string, parentId: string | null = null): Notebook {
    if (!name || !name.trim()) throw Errors.BadRequest('Notebook name is required');
    if (parentId) {
      const parent = store.notebooks.get(parentId);
      if (!parent || parent.userId !== userId) throw Errors.NotFound('Parent notebook not found');
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
    if (!nb || nb.userId !== userId) throw Errors.NotFound('Notebook not found');
    return nb;
  }

  rename(userId: string, id: string, name: string): Notebook {
    const nb = this.getOwned(userId, id);
    if (!name || !name.trim()) throw Errors.BadRequest('Notebook name is required');
    nb.name = name.trim();
    return nb;
  }

  /**
   * Delete a notebook. Per the PRD: notes inside the notebook are moved to
   * the trash (soft-deleted) rather than being permanently deleted outright.
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
