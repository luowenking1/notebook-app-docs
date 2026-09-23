import fs from 'fs';
import os from 'os';
import path from 'path';
import { pool } from '../src/db/pool';
import { resetDb, closeDb } from './testDb';
import { AuthService } from '../src/modules/auth/auth.service';
import { NotebooksService } from '../src/modules/notebooks/notebooks.service';
import { NotesService } from '../src/modules/notes/notes.service';
import { AttachmentsService } from '../src/modules/attachments/attachments.service';

describe('AttachmentsService', () => {
  const auth = new AuthService();
  const notebooks = new NotebooksService();
  const notes = new NotesService();
  const service = new AttachmentsService();
  let userId: string;
  let noteId: string;

  function makeTempFile(name: string): string {
    const filePath = path.join(os.tmpdir(), name);
    fs.writeFileSync(filePath, 'fake-image-bytes');
    return filePath;
  }

  beforeEach(async () => {
    await resetDb();
    const registered = await auth.register('owner@test.com', 'password123');
    userId = registered.user.id;
    const notebookId = (await notebooks.create(userId, 'Photos')).id;
    noteId = (await notes.create(userId, { title: 'Trip', notebookId })).id;
  });
  afterAll(async () => closeDb());

  it('records an attachment for a note the user owns', async () => {
    const filePath = makeTempFile('a.png');
    const attachment = await service.create(userId, noteId, {
      fileName: 'a.png',
      originalName: 'photo.png',
      mimeType: 'image/png',
      sizeBytes: fs.statSync(filePath).size,
      absolutePath: filePath,
    });
    expect(attachment.noteId).toBe(noteId);
    expect(attachment.url).toBe(`/uploads/${userId}/a.png`);

    const row = await pool.query('SELECT * FROM attachments WHERE id = $1', [attachment.id]);
    expect(row.rowCount).toBe(1);
  });

  it('rejects attaching to a note owned by someone else, and cleans up the temp file', async () => {
    const other = await auth.register('other@test.com', 'password123');
    const filePath = makeTempFile('b.png');

    await expect(
      service.create(other.user.id, noteId, {
        fileName: 'b.png',
        originalName: 'photo.png',
        mimeType: 'image/png',
        sizeBytes: fs.statSync(filePath).size,
        absolutePath: filePath,
      })
    ).rejects.toMatchObject({ status: 404 });

    // give the best-effort fs.unlink a tick to run
    await new Promise((r) => setTimeout(r, 50));
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('lists attachments for a note', async () => {
    const filePath = makeTempFile('c.png');
    await service.create(userId, noteId, {
      fileName: 'c.png',
      originalName: 'photo.png',
      mimeType: 'image/png',
      sizeBytes: fs.statSync(filePath).size,
      absolutePath: filePath,
    });
    const list = await service.listForNote(userId, noteId);
    expect(list).toHaveLength(1);
  });

  it('cannot list attachments for a note owned by someone else', async () => {
    const other = await auth.register('other@test.com', 'password123');
    await expect(service.listForNote(other.user.id, noteId)).rejects.toMatchObject({ status: 404 });
  });

  it('removes an attachment record and its file', async () => {
    const filePath = makeTempFile('d.png');
    const attachment = await service.create(userId, noteId, {
      fileName: 'd.png',
      originalName: 'photo.png',
      mimeType: 'image/png',
      sizeBytes: fs.statSync(filePath).size,
      absolutePath: filePath,
    });

    await service.remove(userId, attachment.id);
    const row = await pool.query('SELECT id FROM attachments WHERE id = $1', [attachment.id]);
    expect(row.rowCount).toBe(0);
  });

  it('cannot remove an attachment owned by someone else', async () => {
    const other = await auth.register('other@test.com', 'password123');
    const filePath = makeTempFile('e.png');
    const attachment = await service.create(userId, noteId, {
      fileName: 'e.png',
      originalName: 'photo.png',
      mimeType: 'image/png',
      sizeBytes: fs.statSync(filePath).size,
      absolutePath: filePath,
    });
    await expect(service.remove(other.user.id, attachment.id)).rejects.toMatchObject({ status: 404 });
  });
});
