import { store } from '../src/db/store';
import { NotebooksService } from '../src/modules/notebooks/notebooks.service';
import { NotesService } from '../src/modules/notes/notes.service';
import { TagsService } from '../src/modules/tags/tags.service';
import { SearchService } from '../src/modules/search/search.service';

describe('SearchService', () => {
  const notebooks = new NotebooksService();
  const notes = new NotesService();
  const tags = new TagsService();
  const service = new SearchService();
  const userId = 'user-1';
  let notebookId: string;

  beforeEach(() => {
    store.reset();
    notebookId = notebooks.create(userId, 'Inbox').id;
    notes.create(userId, { title: '项目启动会', content: '本次项目的关键里程碑', notebookId });
    notes.create(userId, { title: '购物清单', content: '牛奶 鸡蛋', notebookId });
  });

  it('能匹配标题中的关键词，并返回高亮片段', () => {
    const results = service.search(userId, '项目');
    expect(results).toHaveLength(1);
    expect(results[0].title).toContain('<em>项目</em>');
  });

  it('能匹配正文中的关键词', () => {
    const results = service.search(userId, '牛奶');
    expect(results).toHaveLength(1);
  });

  it('空关键词返回空结果', () => {
    expect(service.search(userId, '')).toHaveLength(0);
    expect(service.search(userId, '   ')).toHaveLength(0);
  });

  it('搜索结果只包含当前用户自己的笔记', () => {
    expect(service.search('other-user', '项目')).toHaveLength(0);
  });

  it('搜索结果不包含已被软删除的笔记', () => {
    const [note] = [...store.notes.values()];
    note.isDeleted = true;
    const results = service.search(userId, note.title);
    expect(results.find((r) => r.noteId === note.id)).toBeUndefined();
  });

  it('可以按 notebookId 过滤搜索结果', () => {
    const otherNotebook = notebooks.create(userId, '其他笔记本').id;
    notes.create(userId, { title: '项目复盘', content: '', notebookId: otherNotebook });

    const results = service.search(userId, '项目', { notebookId });
    expect(results).toHaveLength(1);
  });

  it('可以按 tagId 过滤搜索结果', () => {
    const tag = tags.create(userId, '重要');
    const [firstNote] = [...store.notes.values()].filter((n) => n.title.includes('项目'));
    tags.setNoteTags(userId, firstNote.id, [tag.id]);

    const results = service.search(userId, '项目', { tagId: tag.id });
    expect(results).toHaveLength(1);
    expect(results[0].noteId).toBe(firstNote.id);
  });
});
