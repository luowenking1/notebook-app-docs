import fs from 'fs';
import path from 'path';
import os from 'os';
import request from 'supertest';
import { createApp } from '../src/app';
import { resetDb, closeDb } from './testDb';

const app = createApp();

// A minimal valid 1x1 PNG, so multer's real file-handling code runs end to end.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

async function registerAndSetup(email: string) {
  const reg = await request(app).post('/api/v1/auth/register').send({ email, password: 'password123' });
  const auth = { Authorization: `Bearer ${reg.body.accessToken}` };
  const nb = await request(app).post('/api/v1/notebooks').set(auth).send({ name: 'Photos' });
  const note = await request(app).post('/api/v1/notes').set(auth).send({ title: 'Trip', notebookId: nb.body.id });
  return { auth, noteId: note.body.id as string };
}

describe('Attachment routes (integration)', () => {
  beforeEach(async () => resetDb());
  afterAll(async () => closeDb());

  it('uploads an image and serves it back from /uploads', async () => {
    const { auth, noteId } = await registerAndSetup('img@test.com');

    const uploadRes = await request(app)
      .post(`/api/v1/notes/${noteId}/attachments`)
      .set(auth)
      .attach('file', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.noteId).toBe(noteId);
    expect(uploadRes.body.url).toMatch(/^\/uploads\/.+\.png$/);

    const fileRes = await request(app).get(uploadRes.body.url);
    expect(fileRes.status).toBe(200);
    expect(fileRes.headers['content-type']).toContain('image/png');
  });

  it('lists attachments for a note', async () => {
    const { auth, noteId } = await registerAndSetup('list@test.com');
    await request(app)
      .post(`/api/v1/notes/${noteId}/attachments`)
      .set(auth)
      .attach('file', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });

    const listRes = await request(app).get(`/api/v1/notes/${noteId}/attachments`).set(auth);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
  });

  it('rejects a non-image file', async () => {
    const { auth, noteId } = await registerAndSetup('badtype@test.com');
    const res = await request(app)
      .post(`/api/v1/notes/${noteId}/attachments`)
      .set(auth)
      .attach('file', Buffer.from('not an image'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  it('rejects uploads without a token', async () => {
    const { noteId } = await registerAndSetup('noauth@test.com');
    const res = await request(app)
      .post(`/api/v1/notes/${noteId}/attachments`)
      .attach('file', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('DELETE removes the attachment', async () => {
    const { auth, noteId } = await registerAndSetup('del@test.com');
    const uploadRes = await request(app)
      .post(`/api/v1/notes/${noteId}/attachments`)
      .set(auth)
      .attach('file', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });

    const delRes = await request(app).delete(`/api/v1/attachments/${uploadRes.body.id}`).set(auth);
    expect(delRes.status).toBe(204);

    const listRes = await request(app).get(`/api/v1/notes/${noteId}/attachments`).set(auth);
    expect(listRes.body).toHaveLength(0);
  });

  it('cannot upload to a note owned by someone else', async () => {
    const owner = await registerAndSetup('owner2@test.com');
    const intruderReg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'intruder2@test.com', password: 'password123' });
    const intruderAuth = { Authorization: `Bearer ${intruderReg.body.accessToken}` };

    const res = await request(app)
      .post(`/api/v1/notes/${owner.noteId}/attachments`)
      .set(intruderAuth)
      .attach('file', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });
    expect(res.status).toBe(404);
  });
});
