import { store } from '../src/db/store';
import { NotebooksService } from '../src/modules/notebooks/notebooks.service';
import { NotesService } from '../src/modules/notes/notes.service';

describe('NotebooksService', () => {
  const service = new NotebooksService();
  const notesService = new NotesService();
  const userId = 'user-1';

  beforeEach(() => store.reset());

  it('创建笔记本', () => {
    const nb = service.create(userId, '工作');
    expect(nb.name).toBe('工作');
    expect(nb.userId).toBe(userId);
  });

  it('拒绝空名称', () => {
    expect(() => service.create(userId, '   ')).toThrow();
  });

  it('只能看到自己的笔记本', () => {
    service.create(userId, 'A');
    service.create('other-user', 'B');
    expect(service.list(userId)).toHaveLength(1);
  });

  it('重命名笔记本', () => {
    const nb = service.create(userId, 'A');
    const renamed = service.rename(userId, nb.id, 'B');
    expect(renamed.name).toBe('B');
  });

  it('不能操作别人的笔记本', () => {
    const nb = service.create('owner', 'A');
    expect(() => service.rename('intruder', nb.id, 'x')).toThrow();
    expect(() => service.remove('intruder', nb.id)).toThrow();
  });

  it('删除笔记本时，内部笔记被移入回收站而不是被永久删除', () => {
    const nb = service.create(userId, 'A');
    const note = notesService.create(userId, { title: 'n1', notebookId: nb.id });
    service.remove(userId, nb.id);

    const stored = store.notes.get(note.id);
    expect(stored).toBeDefined();
    expect(stored?.isDeleted).toBe(true);
    expect(service.list(userId)).toHaveLength(0);
  });
});
