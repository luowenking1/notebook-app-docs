import { pool } from '../src/db/pool';
import { resetDb, closeDb } from './testDb';
import { NotebooksService } from '../src/modules/notebooks/notebooks.service';
import { NotesService } from '../src/modules/notes/notes.service';
import { AuthService } from '../src/modules/auth/auth.service';

describe('NotebooksService', () => {
  const service = new NotebooksService();
  const notesService = new NotesService();
  const auth = new AuthService();
  let userId: string;

  beforeEach(async () => {
    await resetDb();
    const registered = await auth.register('owner@test.com', 'password123');
    userId = registered.user.id;
  });
  afterAll(async () => closeDb());

  it('creates a notebook', async () => {
    const nb = await service.create(userId, 'Work');
    expect(nb.name).toBe('Work');
    expect(nb.userId).toBe(userId);
  });

  it('rejects an empty name', async () => {
    await expect(service.create(userId, '   ')).rejects.toMatchObject({ status: 400 });
  });

  it('only lists the owner\'s own notebooks', async () => {
    const other = await auth.register('other@test.com', 'password123');
    await service.create(userId, 'A');
    await service.create(other.user.id, 'B');
    expect(await service.list(userId)).toHaveLength(1);
  });

  it('renames a notebook', async () => {
    const nb = await service.create(userId, 'A');
    const renamed = await service.rename(userId, nb.id, 'B');
    expect(renamed.name).toBe('B');
  });

  it('cannot act on another user\'s notebook', async () => {
    const other = await auth.register('intruder@test.com', 'password123');
    const nb = await service.create(userId, 'A');
    await expect(service.rename(other.user.id, nb.id, 'x')).rejects.toMatchObject({ status: 404 });
    await expect(service.remove(other.user.id, nb.id)).rejects.toMatchObject({ status: 404 });
  });

  it('deleting a notebook moves its notes to the trash instead of permanently deleting them', async () => {
    const nb = await service.create(userId, 'A');
    const note = await notesService.create(userId, { title: 'n1', notebookId: nb.id });
    await service.remove(userId, nb.id);

    const row = await pool.query('SELECT * FROM notes WHERE id = $1', [note.id]);
    expect(row.rowCount).toBe(1);
    expect(row.rows[0].is_deleted).toBe(true);
    expect(await service.list(userId)).toHaveLength(0);
  });

  it('supports one level of sub-folders via parentId', async () => {
    const parent = await service.create(userId, 'Parent');
    const child = await service.create(userId, 'Child', parent.id);
    expect(child.parentId).toBe(parent.id);
  });

  it('rejects a parentId that does not belong to the user', async () => {
    const other = await auth.register('parent-owner@test.com', 'password123');
    const otherParent = await service.create(other.user.id, 'Not yours');
    await expect(service.create(userId, 'Child', otherParent.id)).rejects.toMatchObject({ status: 404 });
  });
});
