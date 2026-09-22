import { randomUUID } from 'crypto';
import { store } from '../../db/store';
import { Errors } from '../../utils/errors';
import { Tag } from '../../types';

export class TagsService {
  create(userId: string, name: string): Tag {
    if (!name || !name.trim()) throw Errors.BadRequest('标签名不能为空');
    const trimmed = name.trim();
    const existing = [...store.tags.values()].find((t) => t.userId === userId && t.name === trimmed);
    if (existing) throw Errors.Conflict('标签已存在');

    const tag: Tag = { id: randomUUID(), userId, name: trimmed };
    store.tags.set(tag.id, tag);
    return tag;
  }

  list(userId: string): Tag[] {
    return [...store.tags.values()].filter((t) => t.userId === userId);
  }

  private getOwned(userId: string, id: string): Tag {
    const tag = store.tags.get(id);
    if (!tag || tag.userId !== userId) throw Errors.NotFound('标签不存在');
    return tag;
  }

  rename(userId: string, id: string, name: string): Tag {
    const tag = this.getOwned(userId, id);
    if (!name || !name.trim()) throw Errors.BadRequest('标签名不能为空');
    tag.name = name.trim();
    return tag;
  }

  remove(userId: string, id: string): void {
    this.getOwned(userId, id);
    store.tags.delete(id);
    store.noteTags = store.noteTags.filter((nt) => nt.tagId !== id);
  }

  /** 覆盖式设置一篇笔记的标签集合，对应 PUT /notes/:id/tags */
  setNoteTags(userId: string, noteId: string, tagIds: string[]): void {
    const note = store.notes.get(noteId);
    if (!note || note.userId !== userId) throw Errors.NotFound('笔记不存在');
    for (const tagId of tagIds) {
      this.getOwned(userId, tagId); // 校验每个标签都属于当前用户
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
