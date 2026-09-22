import { store } from '../src/db/store';
import { NotebooksService } from '../src/modules/notebooks/notebooks.service';
import { NotesService } from '../src/modules/notes/notes.service';

describe('NotesService', () => {
  const notebooks = new NotebooksService();
  const service = new NotesService();
  const userId = 'user-1';
  let notebookId: string;

  beforeEach(() => {
    store.reset();
    notebookId = notebooks.create(userId, 'Inbox').id;
  });

  it('creates a note', () => {
    const note = service.create(userId, { title: 'Title', content: 'Content', notebookId });
    expect(note.title).toBe('Title');
    expect(note.isDeleted).toBe(false);
    expect(note.isPinned).toBe(false);
  });

  it('rejects an empty title', () => {
    expect(() => service.create(userId, { title: '  ', notebookId })).toThrow();
  });

  it('cannot create a note in another user\'s notebook', () => {
    expect(() => service.create('intruder', { title: 't', notebookId })).toThrow();
  });

  it('auto-save: updating content refreshes updatedAt', async () => {
    const note = service.create(userId, { title: 't', notebookId });
    const before = note.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    const updated = service.update(userId, note.id, { content: 'new content' });
    expect(updated.content).toBe('new content');
    expect(updated.updatedAt).not.toBe(before);
  });

  it('throws when updating the title to an empty string', () => {
    const note = service.create(userId, { title: 't', notebookId });
    expect(() => service.update(userId, note.id, { title: '  ' })).toThrow();
  });

  it('excludes soft-deleted notes from the default list, and includes them when includeDeleted=true', () => {
    const note = service.create(userId, { title: 't', notebookId });
    service.softDelete(userId, note.id);
    expect(service.list(userId)).toHaveLength(0);
    expect(service.list(userId, { includeDeleted: true })).toHaveLength(1);
  });

  it('restores a note from the trash', () => {
    const note = service.create(userId, { title: 't', notebookId });
    service.softDelete(userId, note.id);
    const restored = service.restore(userId, note.id);
    expect(restored.isDeleted).toBe(false);
    expect(restored.deletedAt).toBeNull();
  });

  it('cannot restore a note that is not deleted', () => {
    const note = service.create(userId, { title: 't', notebookId });
    expect(() => service.restore(userId, note.id)).toThrow();
  });

  it('permanently deletes a note', () => {
    const note = service.create(userId, { title: 't', notebookId });
    service.permanentDelete(userId, note.id);
    expect(store.notes.has(note.id)).toBe(false);
  });

  it('pins and unpins a note', () => {
    const note = service.create(userId, { title: 't', notebookId });
    expect(service.setPinned(userId, note.id, true).isPinned).toBe(true);
    expect(service.setPinned(userId, note.id, false).isPinned).toBe(false);
  });

  it('lists pinned notes first, then sorted by updated time descending', async () => {
    const n1 = service.create(userId, { title: 'n1', notebookId });
    await new Promise((r) => setTimeout(r, 5));
    const n2 = service.create(userId, { title: 'n2', notebookId });
    service.setPinned(userId, n1.id, true);

    const list = service.list(userId);
    expect(list[0].id).toBe(n1.id); // pinned note comes first
    expect(list[1].id).toBe(n2.id);
  });

  it('purges trashed notes older than 30 days', () => {
    const note = service.create(userId, { title: 't', notebookId });
    service.softDelete(userId, note.id);
    const stored = store.notes.get(note.id) as NonNullable<ReturnType<typeof store.notes.get>>;
    stored.deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();

    const purged = service.purgeExpired();
    expect(purged).toBe(1);
    expect(store.notes.has(note.id)).toBe(false);
  });

  it('does not purge notes deleted less than 30 days ago', () => {
    const note = service.create(userId, { title: 't', notebookId });
    service.softDelete(userId, note.id);
    const purged = service.purgeExpired();
    expect(purged).toBe(0);
    expect(store.notes.has(note.id)).toBe(true);
  });
});
