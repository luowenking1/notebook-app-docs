import { resetDb, closeDb } from './testDb';
import { NotebooksService } from '../src/modules/notebooks/notebooks.service';
import { NotesService } from '../src/modules/notes/notes.service';
import { TagsService } from '../src/modules/tags/tags.service';
import { AuthService } from '../src/modules/auth/auth.service';

describe('TagsService', () => {
  const notebooks = new NotebooksService();
  const notes = new NotesService();
  const service = new TagsService();
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

  it('creates a tag', async () => {
    const tag = await service.create(userId, 'Work');
    expect(tag.name).toBe('Work');
  });

  it('rejects a duplicate tag name for the same user', async () => {
    await service.create(userId, 'Work');
    await expect(service.create(userId, 'Work')).rejects.toMatchObject({ status: 409 });
  });

  it('allows different users to have the same tag name', async () => {
    const other = await auth.register('other@test.com', 'password123');
    await service.create(userId, 'Work');
    await expect(service.create(other.user.id, 'Work')).resolves.toBeDefined();
  });

  it('assigns tags to a note and reads them back', async () => {
    const tag1 = await service.create(userId, 'A');
    const tag2 = await service.create(userId, 'B');
    const note = await notes.create(userId, { title: 't', notebookId });

    await service.setNoteTags(userId, note.id, [tag1.id, tag2.id]);
    const tags = await service.getTagsForNote(userId, note.id);
    expect(tags.map((t) => t.name).sort()).toEqual(['A', 'B']);
  });

  it('re-setting tags overwrites the previous tag set', async () => {
    const tagA = await service.create(userId, 'A');
    const tagB = await service.create(userId, 'B');
    const note = await notes.create(userId, { title: 't', notebookId });

    await service.setNoteTags(userId, note.id, [tagA.id]);
    await service.setNoteTags(userId, note.id, [tagB.id]);

    const tags = await service.getTagsForNote(userId, note.id);
    expect(tags.map((t) => t.id)).toEqual([tagB.id]);
  });

  it('cannot assign a tag that does not belong to the current user', async () => {
    const other = await auth.register('other@test.com', 'password123');
    const otherTag = await service.create(other.user.id, 'X');
    const note = await notes.create(userId, { title: 't', notebookId });
    await expect(service.setNoteTags(userId, note.id, [otherTag.id])).rejects.toMatchObject({ status: 404 });
  });

  it('deleting a tag also removes it from any notes it was attached to', async () => {
    const tag = await service.create(userId, 'A');
    const note = await notes.create(userId, { title: 't', notebookId });
    await service.setNoteTags(userId, note.id, [tag.id]);

    await service.remove(userId, tag.id);
    expect(await service.getTagsForNote(userId, note.id)).toHaveLength(0);
  });

  it('cannot read tags for a note that does not exist', async () => {
    await expect(service.getTagsForNote(userId, '00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('cannot read tags for another user\'s note', async () => {
    const other = await auth.register('other@test.com', 'password123');
    const note = await notes.create(userId, { title: 't', notebookId });
    await expect(service.getTagsForNote(other.user.id, note.id)).rejects.toMatchObject({ status: 404 });
  });
});
