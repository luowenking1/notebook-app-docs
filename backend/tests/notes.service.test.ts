import { pool } from '../src/db/pool';
import { resetDb, closeDb } from './testDb';
import { NotebooksService } from '../src/modules/notebooks/notebooks.service';
import { NotesService } from '../src/modules/notes/notes.service';
import { AuthService } from '../src/modules/auth/auth.service';

describe('NotesService', () => {
  const notebooks = new NotebooksService();
  const service = new NotesService();
  const auth = new AuthService();
  let userId: string;
  let notebookId: string;

  beforeEach(async () => {
    await resetDb();
    const registered = await auth.register('owner@test.com', 'password123');
    userId = registered.user.id;
    notebookId = (await notebooks.create(userId, 'Inbox')).id;
  });
  afterAll(async () => closeDb());

  it('creates a note', async () => {
    const note = await service.create(userId, { title: 'Title', content: 'Content', notebookId });
    expect(note.title).toBe('Title');
    expect(note.isDeleted).toBe(false);
    expect(note.isPinned).toBe(false);
  });

  it('rejects an empty title', async () => {
    await expect(service.create(userId, { title: '  ', notebookId })).rejects.toMatchObject({ status: 400 });
  });

  it('cannot create a note in another user\'s notebook', async () => {
    const intruder = await auth.register('intruder@test.com', 'password123');
    await expect(service.create(intruder.user.id, { title: 't', notebookId })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('auto-save: updating content refreshes updatedAt', async () => {
    const note = await service.create(userId, { title: 't', notebookId });
    const before = note.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    const updated = await service.update(userId, note.id, { content: 'new content' });
    expect(updated.content).toBe('new content');
    expect(updated.updatedAt).not.toBe(before);
  });

  it('throws when updating the title to an empty string', async () => {
    const note = await service.create(userId, { title: 't', notebookId });
    await expect(service.update(userId, note.id, { title: '  ' })).rejects.toMatchObject({ status: 400 });
  });

  it('excludes soft-deleted notes from the default list, and includes them when includeDeleted=true', async () => {
    const note = await service.create(userId, { title: 't', notebookId });
    await service.softDelete(userId, note.id);
    expect(await service.list(userId)).toHaveLength(0);
    expect(await service.list(userId, { includeDeleted: true })).toHaveLength(1);
  });

  it('restores a note from the trash', async () => {
    const note = await service.create(userId, { title: 't', notebookId });
    await service.softDelete(userId, note.id);
    const restored = await service.restore(userId, note.id);
    expect(restored.isDeleted).toBe(false);
    expect(restored.deletedAt).toBeNull();
  });

  it('cannot restore a note that is not deleted', async () => {
    const note = await service.create(userId, { title: 't', notebookId });
    await expect(service.restore(userId, note.id)).rejects.toMatchObject({ status: 400 });
  });

  it('permanently deletes a note', async () => {
    const note = await service.create(userId, { title: 't', notebookId });
    await service.permanentDelete(userId, note.id);
    const row = await pool.query('SELECT id FROM notes WHERE id = $1', [note.id]);
    expect(row.rowCount).toBe(0);
  });

  it('pins and unpins a note', async () => {
    const note = await service.create(userId, { title: 't', notebookId });
    expect((await service.setPinned(userId, note.id, true)).isPinned).toBe(true);
    expect((await service.setPinned(userId, note.id, false)).isPinned).toBe(false);
  });

  it('lists pinned notes first, then sorted by updated time descending', async () => {
    const n1 = await service.create(userId, { title: 'n1', notebookId });
    await new Promise((r) => setTimeout(r, 5));
    const n2 = await service.create(userId, { title: 'n2', notebookId });
    await service.setPinned(userId, n1.id, true);

    const list = await service.list(userId);
    expect(list[0].id).toBe(n1.id); // pinned note comes first
    expect(list[1].id).toBe(n2.id);
  });

  it('paginates results using page and pageSize', async () => {
    for (let i = 0; i < 5; i++) {
      await service.create(userId, { title: `note-${i}`, notebookId });
    }
    const page1 = await service.list(userId, { pageSize: 2, page: 1 });
    const page2 = await service.list(userId, { pageSize: 2, page: 2 });
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it('purges trashed notes older than 30 days', async () => {
    const note = await service.create(userId, { title: 't', notebookId });
    await service.softDelete(userId, note.id);
    await pool.query(
      `UPDATE notes SET deleted_at = now() - interval '31 days' WHERE id = $1`,
      [note.id]
    );

    const purged = await service.purgeExpired();
    expect(purged).toBe(1);
    const row = await pool.query('SELECT id FROM notes WHERE id = $1', [note.id]);
    expect(row.rowCount).toBe(0);
  });

  it('does not purge notes deleted less than 30 days ago', async () => {
    const note = await service.create(userId, { title: 't', notebookId });
    await service.softDelete(userId, note.id);
    const purged = await service.purgeExpired();
    expect(purged).toBe(0);
    const row = await pool.query('SELECT id FROM notes WHERE id = $1', [note.id]);
    expect(row.rowCount).toBe(1);
  });
});
