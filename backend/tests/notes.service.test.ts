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

  it('创建笔记', () => {
    const note = service.create(userId, { title: '标题', content: '内容', notebookId });
    expect(note.title).toBe('标题');
    expect(note.isDeleted).toBe(false);
    expect(note.isPinned).toBe(false);
  });

  it('拒绝空标题', () => {
    expect(() => service.create(userId, { title: '  ', notebookId })).toThrow();
  });

  it('不能在别人的笔记本下创建笔记', () => {
    expect(() => service.create('intruder', { title: 't', notebookId })).toThrow();
  });

  it('自动保存：更新内容会刷新 updatedAt', async () => {
    const note = service.create(userId, { title: 't', notebookId });
    const before = note.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    const updated = service.update(userId, note.id, { content: '新内容' });
    expect(updated.content).toBe('新内容');
    expect(updated.updatedAt).not.toBe(before);
  });

  it('更新标题为空时抛错', () => {
    const note = service.create(userId, { title: 't', notebookId });
    expect(() => service.update(userId, note.id, { title: '  ' })).toThrow();
  });

  it('默认列表不包含软删除的笔记，includeDeleted=true 时可看到回收站内容', () => {
    const note = service.create(userId, { title: 't', notebookId });
    service.softDelete(userId, note.id);
    expect(service.list(userId)).toHaveLength(0);
    expect(service.list(userId, { includeDeleted: true })).toHaveLength(1);
  });

  it('可以从回收站恢复笔记', () => {
    const note = service.create(userId, { title: 't', notebookId });
    service.softDelete(userId, note.id);
    const restored = service.restore(userId, note.id);
    expect(restored.isDeleted).toBe(false);
    expect(restored.deletedAt).toBeNull();
  });

  it('未删除的笔记不能被恢复', () => {
    const note = service.create(userId, { title: 't', notebookId });
    expect(() => service.restore(userId, note.id)).toThrow();
  });

  it('彻底删除后笔记不再存在', () => {
    const note = service.create(userId, { title: 't', notebookId });
    service.permanentDelete(userId, note.id);
    expect(store.notes.has(note.id)).toBe(false);
  });

  it('置顶与取消置顶', () => {
    const note = service.create(userId, { title: 't', notebookId });
    expect(service.setPinned(userId, note.id, true).isPinned).toBe(true);
    expect(service.setPinned(userId, note.id, false).isPinned).toBe(false);
  });

  it('列表按置顶优先、其次按更新时间倒序排列', async () => {
    const n1 = service.create(userId, { title: 'n1', notebookId });
    await new Promise((r) => setTimeout(r, 5));
    const n2 = service.create(userId, { title: 'n2', notebookId });
    service.setPinned(userId, n1.id, true);

    const list = service.list(userId);
    expect(list[0].id).toBe(n1.id); // 置顶的排在最前
    expect(list[1].id).toBe(n2.id);
  });

  it('清理超过30天的回收站笔记', () => {
    const note = service.create(userId, { title: 't', notebookId });
    service.softDelete(userId, note.id);
    const stored = store.notes.get(note.id) as NonNullable<ReturnType<typeof store.notes.get>>;
    stored.deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();

    const purged = service.purgeExpired();
    expect(purged).toBe(1);
    expect(store.notes.has(note.id)).toBe(false);
  });

  it('不清理30天内删除的笔记', () => {
    const note = service.create(userId, { title: 't', notebookId });
    service.softDelete(userId, note.id);
    const purged = service.purgeExpired();
    expect(purged).toBe(0);
    expect(store.notes.has(note.id)).toBe(true);
  });
});
