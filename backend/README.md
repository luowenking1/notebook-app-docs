# Notebook App — Backend

Backend API implementation for the personal notebook app, corresponding to the Requirements and Technical Design docs in the repo root.

## Tech Stack (Current Implementation)

- Node.js + TypeScript + Express
- **PostgreSQL** via `pg`, with full-text search powered by Postgres's built-in `tsvector`/`tsquery` (matches the technical doc's design)
- JWT access tokens (short-lived) + rotating, revocable refresh tokens (long-lived, stored hashed)
- Passwords hashed with bcryptjs; refresh/reset tokens hashed with SHA-256 before storage
- Image attachment uploads via `multer`, stored on local disk under `uploads/` and served statically
- Tests: Jest + ts-jest + Supertest, run against a real local Postgres database (86 tests)

## Implemented Features

| Module | Description |
|---|---|
| Auth | Register / login / JWT issuing / refresh-token rotation / logout / password reset |
| Notebooks | Create / rename / delete (cascades to soft-delete the notes inside) |
| Notes | Create / update (auto-save) / paginated list / soft-delete / restore / permanent delete / pin / trash expiry cleanup |
| Tags | Create / rename / delete / attach to notes |
| Search | Full-text match on title + body (Postgres `tsvector`, ranked by relevance), highlighted snippets, filterable by notebook/tag |
| Attachments | Upload an image (PNG/JPEG/GIF/WEBP, 5MB max) to a note, list, delete |
| Web UI | A small vanilla HTML/CSS/JS frontend (`public/`) served at `/`, covering the full flow above |

Every endpoint is protected by the `requireAuth` middleware, and ownership is checked at the business layer (`userId` must match),
preventing cross-user unauthorized access — matching the multi-user data isolation requirement in the PRD.

## Prerequisites: PostgreSQL

You need a local PostgreSQL server (v13+; developed against v16) with one role and two databases —
one for normal use, one for the test suite so tests never touch your real data.

**macOS**: `brew install postgresql@16 && brew services start postgresql@16`
**Windows**: install from https://www.postgresql.org/download/windows/ (the installer starts the service automatically)
**Ubuntu/Debian**: `sudo apt-get install postgresql`, then `sudo systemctl start postgresql` (or `sudo pg_ctlcluster <version> main start`)

Once Postgres is running, create the role and databases (run as the `postgres` superuser —
e.g. `sudo -u postgres psql` on Linux, or `psql -U postgres` on Windows/macOS):

```sql
CREATE ROLE notebook_app WITH LOGIN PASSWORD 'notebook_dev_password';
CREATE DATABASE notebook_app OWNER notebook_app;
CREATE DATABASE notebook_app_test OWNER notebook_app;
```

That's it — no manual table creation needed. `npm run dev`, `npm start`, and `npm test` each
automatically apply `src/db/schema.sql` before running (via the `predev`/`prestart`/`pretest`
npm hooks), and every statement in it is idempotent, so it's always safe to re-run.

### Configuration

The defaults above (`notebook_app` / `notebook_dev_password` / `localhost:5432`) are baked into
`src/db/pool.ts` and need no extra configuration. To point at a different server (e.g. a managed
cloud Postgres in production), set `DATABASE_URL` — or the discrete `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`
variables — as environment variables before running. `NODE_ENV=test` (set automatically by Jest)
switches the target database to `notebook_app_test`; everything else uses `notebook_app`.

## Getting Started

```bash
npm install
npm run dev      # applies the schema, then starts the server at http://localhost:3000
npm test         # applies the schema to notebook_app_test, then runs all tests
npm run test:coverage   # same, with a coverage report
npm run build && npm start   # compile and run in production mode
```

## Web UI

A small built-in web UI lives in `public/` and is served by the same Express app at the
site root — open **http://localhost:3000** in a browser after `npm run dev` (or `npm start`)
to register/log in and click through notebooks, notes, tags, search, and the trash. It's a
plain HTML/CSS/JS page (no build step, no framework) that talks to the `/api/v1/*` endpoints
below over `fetch`, so there's nothing extra to install or configure for it.

## Password recovery in development

There's no email provider wired up in this project. `POST /auth/password/forgot` always logs
the reset token to the server console, and — **only when `NODE_ENV !== 'production'`** — also
returns it directly in the JSON response as `devResetToken`, so you can test the full
forgot/reset flow locally without needing real email. In production, wire up an email provider
and remove that response field; the token should only ever reach the user through the emailed link.

## Image attachments

`POST /api/v1/notes/:noteId/attachments` accepts a `multipart/form-data` body with a single
`file` field (PNG/JPEG/GIF/WEBP, 5MB max). Files are saved under `backend/uploads/<userId>/`
(gitignored) and served back at the `url` the response gives you, e.g. `/uploads/<userId>/<file>.png`.
`GET /api/v1/notes/:noteId/attachments` lists a note's attachments; `DELETE /api/v1/attachments/:id` removes one.

## API Overview

See Section 4 of the [Technical Design](../technical-design.md) doc for the original REST design.
Endpoints added since that doc was written: `POST /auth/refresh`, `POST /auth/logout`,
`POST /auth/password/forgot`, `POST /auth/password/reset`, and the attachment endpoints above.
All endpoints are prefixed with `/api/v1`.

## Tests

The `tests/` directory is organized by feature and runs against a real Postgres database
(`notebook_app_test`), truncated between tests via `tests/testDb.ts`:

- `auth.service.test.ts` / `auth.routes.test.ts`: register/login, password hashing, refresh-token rotation, logout, forgot/reset password flow
- `notebooks.service.test.ts`: notebook create/rename/delete, cascading soft-delete, sub-folders, ownership enforcement
- `notes.service.test.ts`: auto-save, soft-delete/restore/permanent-delete, pinned sort order, pagination, trash expiry cleanup
- `tags.service.test.ts`: tag name uniqueness, tagging notes, cascading cleanup on tag delete
- `search.service.test.ts`: title/body matching, highlighting, relevance ranking, filtering by notebook/tag, per-user isolation
- `notes.routes.test.ts`: end-to-end main flow (notebook → note → tag → search → trash) + cross-user access protection
- `attachments.service.test.ts` / `attachments.routes.test.ts`: real multipart image upload, type/size validation, ownership checks
- `static.test.ts`: the web UI's HTML/JS/CSS are served correctly at the site root

Currently 86 test cases in total, all passing.

## TODO

- Frontend React app (per the technical doc's stack) — the current `public/` UI is intentionally minimal (vanilla JS, no build step)
- Rich-text editor (currently the UI uses a plain textarea) and Markdown export
- Wire up a real email provider for password reset
- Attachment upload UI in `public/app.js` (the API exists and is tested; the vanilla frontend doesn't call it yet)
