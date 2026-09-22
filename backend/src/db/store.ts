import { User, Notebook, Note, Tag, NoteTag } from '../types';

/**
 * 内存数据仓库（Repository）。
 *
 * 为了让本地开发和自动化测试无需安装/配置真实数据库，这一版用内存 Map
 * 模拟了技术文档中设计的数据表结构（users / notebooks / notes / tags / note_tags）。
 * 上层的 *Service 只依赖这里暴露的集合，不关心底层存储实现，
 * 后续接入 PostgreSQL 时只需要替换这个文件（或实现同样接口的 Repository 类），
 * 不需要改动任何业务逻辑代码。
 */
class InMemoryStore {
  users: Map<string, User> = new Map();
  notebooks: Map<string, Notebook> = new Map();
  notes: Map<string, Note> = new Map();
  tags: Map<string, Tag> = new Map();
  noteTags: NoteTag[] = [];

  reset(): void {
    this.users.clear();
    this.notebooks.clear();
    this.notes.clear();
    this.tags.clear();
    this.noteTags = [];
  }
}

export const store = new InMemoryStore();
