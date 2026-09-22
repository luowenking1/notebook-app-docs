import { randomUUID } from 'crypto';
import { store } from '../../db/store';
import { Errors } from '../../utils/errors';
import { Tag } from '../../types';

export class TagsService {
  create(userId: string, name: string): Tag {
    if (!name || !name.trim()) throw Errors.BadRequest('Tag name is required');
    const trimmed = name.trim();
    const existing = [...store.tags.values()].find((t) => t.userId === userId && t.name === trimmed);
    if (existing) throw Errors.Conflict('Tag already exists');

    const tag: Tag = { id: randomUUID(), userId, name: trimmed };
    store.tags.set(tag.id, tag);
    return tag;
  }

  list(userId: string): Tag[] {
    return [...store.tags.values()].filter((t) => t.userId === userId);
  }

  private getOwned(userId: string, id: string): Tag {
    const tag = store.tags.get(id);
    if (!tag || tag.userId !== userId) throw Errors.NotFound('Tag not found');
    return tag;
  }

  rename(userId: string, id: string, name: string): Tag {
    const tag = this.getOwned(userId, id);
    if (!name || !name.trim()) throw Errors.BadRequest('Tag name is required');
    tag.name = name.trim();
    return tag;
  }

  remove(userId: string, id: string): void {
    this.getOwned(userId, id);
    store.tags.delete(id);
    store.noteTags = store.noteTags.filter((nt) => nt.tagId !== id);
  }

  /** Overwrites a note's tag set. Corresponds to PUT /notes/:id/tags */
  setNoteTags(userId: string, noteId: string, tagIds: string[]): void {
    const note = store.notes.get(noteId);
    if (!note || note.userId !== userId) throw Errors.NotFound('Note not found');
    for (const tagId of tagIds) {
      this.getOwned(userId, tagId); // verify each tag belongs to the current user
    }
    store.noteTags = store.noteTags.filter((nt) => nt.noteId !== noteId);
    for (const tagId of tagIds) {
      store.noteTags.push({ noteId, tagId });
    }
  }

  getTagsForNote(userId: string, noteId: string): Tag[] {
    const tagIds = new Set(store.noteTags.filter((nt) => nt.noteId === noteId).map((nt) => nt.tagId));
    return [...store.tags.values()].filter((t) => t.userId === userId && tagIds.has(t.id));
  }
}
