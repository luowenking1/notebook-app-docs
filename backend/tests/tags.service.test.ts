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

  it('创建标签', () => {
    const tag = service.create(userId, '工作');
    expect(tag.name).toBe('工作');
  });

  it('同一用户下不能创建重复标签名', () => {
    service.create(userId, '工作');
    expect(() => service.create(userId, '工作')).toThrow();
  });

  it('不同用户可以有同名标签', () => {
    service.create(userId, '工作');
    expect(() => service.create('other-user', '工作')).not.toThrow();
  });

  it('给笔记设置标签并读取', () => {
    const tag1 = service.create(userId, 'A');
    const tag2 = service.create(userId, 'B');
    const note = notes.create(userId, { title: 't', notebookId });

    service.setNoteTags(userId, note.id, [tag1.id, tag2.id]);
    const tags = service.getTagsForNote(userId, note.id);
    expect(tags.map((t) => t.name).sort()).toEqual(['A', 'B']);
  });

  it('重新设置标签会覆盖旧的标签集合', () => {
    const tagA = service.create(userId, 'A');
    const tagB = service.create(userId, 'B');
    const note = notes.create(userId, { title: 't', notebookId });

    service.setNoteTags(userId, note.id, [tagA.id]);
    service.setNoteTags(userId, note.id, [tagB.id]);

    const tags = service.getTagsForNote(userId, note.id);
    expect(tags.map((t) => t.id)).toEqual([tagB.id]);
  });

  it('不能给笔记设置不属于自己的标签', () => {
    const otherTag = service.create('other-user', 'X');
    const note = notes.create(userId, { title: 't', notebookId });
    expect(() => service.setNoteTags(userId, note.id, [otherTag.id])).toThrow();
  });

  it('删除标签后，笔记上也不再关联该标签', () => {
    const tag = service.create(userId, 'A');
    const note = notes.create(userId, { title: 't', notebookId });
    service.setNoteTags(userId, note.id, [tag.id]);

    service.remove(userId, tag.id);
    expect(service.getTagsForNote(userId, note.id)).toHaveLength(0);
  });
});
