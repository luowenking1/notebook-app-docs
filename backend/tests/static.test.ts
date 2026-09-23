import request from 'supertest';
import { createApp } from '../src/app';
import { closeDb } from './testDb';

const app = createApp();

describe('Static frontend', () => {
  afterAll(async () => closeDb());

  it('serves a working UI at the site root (React build if present, else the vanilla UI)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('<title>Notebook</title>');
  });

  it('always serves the vanilla UI at /legacy, regardless of whether the React app is built', async () => {
    const res = await request(app).get('/legacy/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Notebook</title>');

    const js = await request(app).get('/legacy/app.js');
    expect(js.status).toBe(200);
    const css = await request(app).get('/legacy/style.css');
    expect(css.status).toBe(200);
  });
});
