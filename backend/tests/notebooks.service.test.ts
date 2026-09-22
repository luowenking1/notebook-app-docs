import { store } from '../src/db/store';
import { NotebooksService } from '../src/modules/notebooks/notebooks.service';
import { NotesService } from '../src/modules/notes/notes.service';

describe('NotebooksService', () => {
  const service = new NotebooksService();
  const notesService = new NotesService();
  const userId = 'user-1';

  beforeEach(() => store.reset());

  it('creates a notebook', () => {
    const nb = service.create(userId, 'Work');
    expect(nb.name).toBe('Work');
    expect(nb.userId).toBe(userId);
  });

  it('rejects an empty name', () => {
    expect(() => service.create(userId, '   ')).toThrow();
  });

  it('only lists the owner\'s own notebooks', () => {
    service.create(userId, 'A');
    service.create('other-user', 'B');
    expect(service.list(userId)).toHaveLength(1);
  });

  it('renames a notebook', () => {
    const nb = service.create(userId, 'A');
    const renamed = service.rename(userId, nb.id, 'B');
    expect(renamed.name).toBe('B');
  });

  it('cannot act on another user\'s notebook', () => {
    const nb = service.create('owner', 'A');
    expect(() => service.rename('intruder', nb.id, 'x')).toThrow();
    expect(() => service.remove('intruder', nb.id)).toThrow();
  });

  it('deleting a notebook moves its notes to the trash instead of permanently deleting them', () => {
    const nb = service.create(userId, 'A');
    const note = notesService.create(userId, { title: 'n1', notebookId: nb.id });
    service.remove(userId, nb.id);

    const stored = store.notes.get(note.id);
    expect(stored).toBeDefined();
    expect(stored?.isDeleted).toBe(true);
    expect(service.list(userId)).toHaveLength(0);
  });
});
