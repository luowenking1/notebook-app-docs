import { randomUUID } from 'crypto';
import { store } from '../../db/store';
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

export class NotesService {
  create(userId: string, input: CreateNoteInput): Note {
    if (!input.title || !input.title.trim()) throw Errors.BadRequest('Title is required');
    const notebook = store.notebooks.get(input.notebookId);
    if (!notebook || notebook.userId !== userId) throw Errors.NotFound('Notebook not found');

    const now = new Date().toISOString();
    const note: Note = {
      id: randomUUID(),
      userId,
      notebookId: input.notebookId,
      title: input.title.trim(),
      content: input.content ?? '',
      isPinned: false,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    store.notes.set(note.id, note);
    return note;
  }

  getOwned(userId: string, id: string): Note {
    const note = store.notes.get(id);
    if (!note || note.userId !== userId) throw Errors.NotFound('Note not found');
    return note;
  }

  /** Corresponds to PATCH /notes/:id — this is what the frontend's auto-save calls */
  update(userId: string, id: string, input: UpdateNoteInput): Note {
    const note = this.getOwned(userId, id);
    if (input.title !== undefined) {
      if (!input.title.trim()) throw Errors.BadRequest('Title is required');
      note.title = input.title.trim();
    }
    if (input.content !== undefined) {
      note.content = input.content;
    }
    if (input.notebookId !== undefined) {
      const nb = store.notebooks.get(input.notebookId);
      if (!nb || nb.userId !== userId) throw Errors.NotFound('Notebook not found');
      note.notebookId = input.notebookId;
    }
    note.updatedAt = new Date().toISOString();
    return note;
  }

  list(userId: string, options: ListNotesOptions = {}): Note[] {
    const { notebookId, tagId, includeDeleted = false, page = 1, pageSize = 20 } = options;

    let results = [...store.notes.values()].filter(
      (n) => n.userId === userId && (includeDeleted ? n.isDeleted : !n.isDeleted)
    );
    if (notebookId) results = results.filter((n) => n.notebookId === notebookId);
    if (tagId) {
      const noteIdsWithTag = new Set(
        store.noteTags.filter((nt) => nt.tagId === tagId).map((nt) => nt.noteId)
      );
      results = results.filter((n) => noteIdsWithTag.has(n.id));
    }

    // Pinned notes first, then sorted by updated time descending
    results.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return a.updatedAt < b.updatedAt ? 1 : -1;
    });

    const start = (page - 1) * pageSize;
    return results.slice(start, start + pageSize);
  }

  softDelete(userId: string, id: string): Note {
    const note = this.getOwned(userId, id);
    note.isDeleted = true;
    note.deletedAt = new Date().toISOString();
    return note;
  }

  restore(userId: string, id: string): Note {
    const note = this.getOwned(userId, id);
    if (!note.isDeleted) throw Errors.BadRequest('Note is not in the trash');
    note.isDeleted = false;
    note.deletedAt = null;
    return note;
  }

  permanentDelete(userId: string, id: string): void {
    this.getOwned(userId, id);
    store.notes.delete(id);
    store.noteTags = store.noteTags.filter((nt) => nt.noteId !== id);
  }

  setPinned(userId: string, id: string, pinned: boolean): Note {
    const note = this.getOwned(userId, id);
    note.isPinned = pinned;
    return note;
  }

  /**
   * Purge notes that have been in the trash for more than 30 days
   * (corresponds to PRD Section 3.6: trash is retained for 30 days and
   * cleaned up on a schedule). Returns the number of notes purged, which
   * is convenient for tests and logging.
   */
  purgeExpired(now: Date = new Date()): number {
    let count = 0;
    for (const note of [...store.notes.values()]) {
      if (note.isDeleted && note.deletedAt) {
        const deletedAt = new Date(note.deletedAt);
        const diffDays = (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > TRASH_RETENTION_DAYS) {
          store.notes.delete(note.id);
          store.noteTags = store.noteTags.filter((nt) => nt.noteId !== note.id);
          count += 1;
        }
      }
    }
    return count;
  }
}
