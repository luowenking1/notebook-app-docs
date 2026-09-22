import request from 'supertest';
import { createApp } from '../src/app';
import { store } from '../src/db/store';

const app = createApp();

async function registerAndLogin(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register').send({ email, password: 'password123' });
  return res.body.accessToken as string;
}

describe('笔记相关路由 (端到端集成测试)', () => {
  beforeEach(() => store.reset());

  it('未携带 token 访问受保护接口返回 401', async () => {
    const res = await request(app).get('/api/v1/notebooks');
    expect(res.status).toBe(401);
  });

  it('token 无效时返回 401', async () => {
    const res = await request(app).get('/api/v1/notebooks').set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('完整走通 笔记本 -> 笔记 -> 标签 -> 搜索 -> 回收站 的主流程', async () => {
    const token = await registerAndLogin('flow@test.com');
    const auth = { Authorization: `Bearer ${token}` };

    // 1. 创建笔记本
    const nbRes = await request(app).post('/api/v1/notebooks').set(auth).send({ name: '工作' });
    expect(nbRes.status).toBe(201);
    const notebookId = nbRes.body.id;

    // 2. 创建笔记
    const noteRes = await request(app)
      .post('/api/v1/notes')
      .set(auth)
      .send({ title: '周会纪要', content: '讨论了项目进度', notebookId });
    expect(noteRes.status).toBe(201);
    const noteId = noteRes.body.id;

    // 3. 自动保存（更新笔记内容）
    const updateRes = await request(app).patch(`/api/v1/notes/${noteId}`).set(auth).send({ content: '更新后的内容' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.content).toBe('更新后的内容');

    // 4. 创建标签并关联到笔记
    const tagRes = await request(app).post('/api/v1/tags').set(auth).send({ name: '重要' });
    expect(tagRes.status).toBe(201);
    const tagId = tagRes.body.id;

    const setTagsRes = await request(app).put(`/api/v1/notes/${noteId}/tags`).set(auth).send({ tagIds: [tagId] });
    expect(setTagsRes.status).toBe(200);
    expect(setTagsRes.body[0].name).toBe('重要');

    // 5. 全文搜索
    const searchRes = await request(app).get('/api/v1/search').set(auth).query({ q: '更新后' });
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.total).toBe(1);

    // 6. 置顶
    const pinRes = await request(app).patch(`/api/v1/notes/${noteId}/pin`).set(auth).send({ pinned: true });
    expect(pinRes.body.isPinned).toBe(true);

    // 7. 软删除进回收站
    const delRes = await request(app).delete(`/api/v1/notes/${noteId}`).set(auth);
    expect(delRes.status).toBe(200);
    expect(delRes.body.isDeleted).toBe(true);

    const listRes = await request(app).get('/api/v1/notes').set(auth).query({ notebookId });
    expect(listRes.body).toHaveLength(0);

    // 8. 从回收站恢复
    const restoreRes = await request(app).post(`/api/v1/notes/${noteId}/restore`).set(auth);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.isDeleted).toBe(false);

    // 9. 彻底删除
    const permanentRes = await request(app).delete(`/api/v1/notes/${noteId}/permanent`).set(auth);
    expect(permanentRes.status).toBe(204);
  });

  it('用户之间的数据严格隔离：无法访问/修改别人的笔记本', async () => {
    const tokenA = await registerAndLogin('a@test.com');
    const tokenB = await registerAndLogin('b@test.com');

    const nbRes = await request(app)
      .post('/api/v1/notebooks')
      .set({ Authorization: `Bearer ${tokenA}` })
      .send({ name: 'A的笔记本' });

    const res = await request(app)
      .patch(`/api/v1/notebooks/${nbRes.body.id}`)
      .set({ Authorization: `Bearer ${tokenB}` })
      .send({ name: 'hacked' });

    expect(res.status).toBe(404);
  });

  it('用户之间的数据严格隔离：无法访问别人的笔记', async () => {
    const tokenA = await registerAndLogin('c@test.com');
    const tokenB = await registerAndLogin('d@test.com');

    const nbRes = await request(app)
      .post('/api/v1/notebooks')
      .set({ Authorization: `Bearer ${tokenA}` })
      .send({ name: 'Inbox' });
    const noteRes = await request(app)
      .post('/api/v1/notes')
      .set({ Authorization: `Bearer ${tokenA}` })
      .send({ title: '私密笔记', notebookId: nbRes.body.id });

    const res = await request(app)
      .get(`/api/v1/notes/${noteRes.body.id}`)
      .set({ Authorization: `Bearer ${tokenB}` });

    expect(res.status).toBe(404);
  });

  it('创建笔记时标题为空返回 400', async () => {
    const token = await registerAndLogin('e@test.com');
    const auth = { Authorization: `Bearer ${token}` };
    const nbRes = await request(app).post('/api/v1/notebooks').set(auth).send({ name: 'Inbox' });

    const res = await request(app).post('/api/v1/notes').set(auth).send({ title: '  ', notebookId: nbRes.body.id });
    expect(res.status).toBe(400);
  });
});
