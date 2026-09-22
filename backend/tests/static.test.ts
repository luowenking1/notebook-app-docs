import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Static frontend', () => {
  it('serves the built-in web UI at the site root', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('<title>Notebook</title>');
  });

  it('serves app.js and style.css', async () => {
    const js = await request(app).get('/app.js');
    expect(js.status).toBe(200);
    const css = await request(app).get('/style.css');
    expect(css.status).toBe(200);
  });
});
