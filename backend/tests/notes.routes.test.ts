import request from 'supertest';
import { createApp } from '../src/app';
import { store } from '../src/db/store';

const app = createApp();

async function registerAndLogin(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register').send({ email, password: 'password123' });
  return res.body.accessToken as string;
}

describe('Note-related routes (end-to-end integration)', () => {
  beforeEach(() => store.reset());

  it('accessing a protected endpoint without a token returns 401', async () => {
    const res = await request(app).get('/api/v1/notebooks');
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is invalid', async () => {
    const res = await request(app).get('/api/v1/notebooks').set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('walks the full notebook -> note -> tag -> search -> trash flow', async () => {
    const token = await registerAndLogin('flow@test.com');
    const auth = { Authorization: `Bearer ${token}` };

    // 1. Create a notebook
    const nbRes = await request(app).post('/api/v1/notebooks').set(auth).send({ name: 'Work' });
    expect(nbRes.status).toBe(201);
    const notebookId = nbRes.body.id;

    // 2. Create a note
    const noteRes = await request(app)
      .post('/api/v1/notes')
      .set(auth)
      .send({ title: 'Weekly meeting notes', content: 'Discussed project progress', notebookId });
    expect(noteRes.status).toBe(201);
    const noteId = noteRes.body.id;

    // 3. Auto-save (update note content)
    const updateRes = await request(app).patch(`/api/v1/notes/${noteId}`).set(auth).send({ content: 'Updated content' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.content).toBe('Updated content');

    // 4. Create a tag and attach it to the note
    const tagRes = await request(app).post('/api/v1/tags').set(auth).send({ name: 'Important' });
    expect(tagRes.status).toBe(201);
    const tagId = tagRes.body.id;

    const setTagsRes = await request(app).put(`/api/v1/notes/${noteId}/tags`).set(auth).send({ tagIds: [tagId] });
    expect(setTagsRes.status).toBe(200);
    expect(setTagsRes.body[0].name).toBe('Important');

    const getTagsRes = await request(app).get(`/api/v1/notes/${noteId}/tags`).set(auth);
    expect(getTagsRes.status).toBe(200);
    expect(getTagsRes.body[0].name).toBe('Important');

    // 5. Full-text search
    const searchRes = await request(app).get('/api/v1/search').set(auth).query({ q: 'Updated' });
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.total).toBe(1);

    // 6. Pin
    const pinRes = await request(app).patch(`/api/v1/notes/${noteId}/pin`).set(auth).send({ pinned: true });
    expect(pinRes.body.isPinned).toBe(true);

    // 7. Soft-delete into the trash
    const delRes = await request(app).delete(`/api/v1/notes/${noteId}`).set(auth);
    expect(delRes.status).toBe(200);
    expect(delRes.body.isDeleted).toBe(true);

    const listRes = await request(app).get('/api/v1/notes').set(auth).query({ notebookId });
    expect(listRes.body).toHaveLength(0);

    // 8. Restore from the trash
    const restoreRes = await request(app).post(`/api/v1/notes/${noteId}/restore`).set(auth);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.isDeleted).toBe(false);

    // 9. Permanently delete
    const permanentRes = await request(app).delete(`/api/v1/notes/${noteId}/permanent`).set(auth);
    expect(permanentRes.status).toBe(204);
  });

  it('strictly isolates user data: cannot access/modify another user\'s notebook', async () => {
    const tokenA = await registerAndLogin('a@test.com');
    const tokenB = await registerAndLogin('b@test.com');

    const nbRes = await request(app)
      .post('/api/v1/notebooks')
      .set({ Authorization: `Bearer ${tokenA}` })
      .send({ name: 'A\'s notebook' });

    const res = await request(app)
      .patch(`/api/v1/notebooks/${nbRes.body.id}`)
      .set({ Authorization: `Bearer ${tokenB}` })
      .send({ name: 'hacked' });

    expect(res.status).toBe(404);
  });

  it('strictly isolates user data: cannot access another user\'s note', async () => {
    const tokenA = await registerAndLogin('c@test.com');
    const tokenB = await registerAndLogin('d@test.com');

    const nbRes = await request(app)
      .post('/api/v1/notebooks')
      .set({ Authorization: `Bearer ${tokenA}` })
      .send({ name: 'Inbox' });
    const noteRes = await request(app)
      .post('/api/v1/notes')
      .set({ Authorization: `Bearer ${tokenA}` })
      .send({ title: 'Private note', notebookId: nbRes.body.id });

    const res = await request(app)
      .get(`/api/v1/notes/${noteRes.body.id}`)
      .set({ Authorization: `Bearer ${tokenB}` });

    expect(res.status).toBe(404);
  });

  it('creating a note with an empty title returns 400', async () => {
    const token = await registerAndLogin('e@test.com');
    const auth = { Authorization: `Bearer ${token}` };
    const nbRes = await request(app).post('/api/v1/notebooks').set(auth).send({ name: 'Inbox' });

    const res = await request(app).post('/api/v1/notes').set(auth).send({ title: '  ', notebookId: nbRes.body.id });
    expect(res.status).toBe(400);
  });
});
