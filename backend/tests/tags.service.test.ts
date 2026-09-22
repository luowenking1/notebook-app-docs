import { store } from '../src/db/store';
import { NotebooksService } from '../src/modules/notebooks/notebooks.service';
import { NotesService } from '../src/modules/notes/notes.service';
import { TagsService } from '../src/modules/tags/tags.service';

describe('TagsService', () => {
  const notebooks = new NotebooksService();
  const notes = new NotesService();
  const service = new TagsService();
  const userId = 'user-1';
  let notebookId: string;

  beforeEach(() => {
    store.reset();
    notebookId = notebooks.create(userId, 'Inbox').id;
  });

  it('creates a tag', () => {
    const tag = service.create(userId, 'Work');
    expect(tag.name).toBe('Work');
  });

  it('rejects a duplicate tag name for the same user', () => {
    service.create(userId, 'Work');
    expect(() => service.create(userId, 'Work')).toThrow();
  });

  it('allows different users to have the same tag name', () => {
    service.create(userId, 'Work');
    expect(() => service.create('other-user', 'Work')).not.toThrow();
  });

  it('assigns tags to a note and reads them back', () => {
    const tag1 = service.create(userId, 'A');
    const tag2 = service.create(userId, 'B');
    const note = notes.create(userId, { title: 't', notebookId });

    service.setNoteTags(userId, note.id, [tag1.id, tag2.id]);
    const tags = service.getTagsForNote(userId, note.id);
    expect(tags.map((t) => t.name).sort()).toEqual(['A', 'B']);
  });

  it('re-setting tags overwrites the previous tag set', () => {
    const tagA = service.create(userId, 'A');
    const tagB = service.create(userId, 'B');
    const note = notes.create(userId, { title: 't', notebookId });

    service.setNoteTags(userId, note.id, [tagA.id]);
    service.setNoteTags(userId, note.id, [tagB.id]);

    const tags = service.getTagsForNote(userId, note.id);
    expect(tags.map((t) => t.id)).toEqual([tagB.id]);
  });

  it('cannot assign a tag that does not belong to the current user', () => {
    const otherTag = service.create('other-user', 'X');
    const note = notes.create(userId, { title: 't', notebookId });
    expect(() => service.setNoteTags(userId, note.id, [otherTag.id])).toThrow();
  });

  it('deleting a tag also removes it from any notes it was attached to', () => {
    const tag = service.create(userId, 'A');
    const note = notes.create(userId, { title: 't', notebookId });
    service.setNoteTags(userId, note.id, [tag.id]);

    service.remove(userId, tag.id);
    expect(service.getTagsForNote(userId, note.id)).toHaveLength(0);
  });

  it('cannot read tags for a note that does not exist', () => {
    expect(() => service.getTagsForNote(userId, 'nonexistent-id')).toThrow();
  });

  it('cannot read tags for another user\'s note', () => {
    const note = notes.create(userId, { title: 't', notebookId });
    expect(() => service.getTagsForNote('intruder', note.id)).toThrow();
  });
});
