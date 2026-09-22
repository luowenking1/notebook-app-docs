# Notebook App — Backend

Backend API implementation for the personal notebook app, corresponding to the Requirements and Technical Design docs in the repo root.

## Tech Stack (Current Implementation)

- Node.js + TypeScript + Express
- JWT authentication (passwords hashed with bcryptjs)
- **Data layer**: an in-memory repository (`src/db/store.ts`) used for local development and testing, with no database installation required.
  Its interface mirrors the PostgreSQL table design in the technical doc, so it can be swapped for a real database implementation later
  without changing any business logic under `modules/*`.
- Tests: Jest + ts-jest + Supertest (unit tests + route-level end-to-end integration tests)

## Implemented Features

| Module | Description |
|---|---|
| Auth | Register / login / JWT issuing and verification |
| Notebooks | Create / rename / delete (cascades to soft-delete the notes inside) |
| Notes | Create / update (auto-save) / paginated list / soft-delete / restore / permanent delete / pin / trash expiry cleanup |
| Tags | Create / rename / delete / attach to notes |
| Search | Full-text match on title + body, with highlighted snippets, filterable by notebook/tag |
| Web UI | A small vanilla HTML/CSS/JS frontend (`public/`) served at `/`, covering the full flow above |

Every endpoint is protected by the `requireAuth` middleware, and ownership is checked at the business layer (`userId` must match),
preventing cross-user unauthorized access — matching the multi-user data isolation requirement in the PRD.

## Getting Started

```bash
npm install
npm run dev      # local development, http://localhost:3000
npm test         # run all tests
npm run test:coverage   # run tests and generate a coverage report
npm run build && npm start   # compile and run in production mode
```

## Web UI

A small built-in web UI lives in `public/` and is served by the same Express app at the
site root — open **http://localhost:3000** in a browser after `npm run dev` (or `npm start`)
to register/log in and click through notebooks, notes, tags, search, and the trash. It's a
plain HTML/CSS/JS page (no build step, no framework) that talks to the `/api/v1/*` endpoints
below over `fetch`, so there's nothing extra to install or configure for it.

## API Overview

See Section 4 of the [Technical Design](../technical-design.md) doc. All endpoints are prefixed with `/api/v1`.

## Tests

The `tests/` directory is organized by feature:

- `auth.service.test.ts` / `auth.routes.test.ts`: register/login, password hashing, duplicate email, wrong password, etc.
- `notebooks.service.test.ts`: notebook create/rename/delete, cascading soft-delete, ownership enforcement
- `notes.service.test.ts`: auto-save, soft-delete/restore/permanent-delete, pinned sort order, trash expiry cleanup
- `tags.service.test.ts`: tag name uniqueness, tagging notes, cascading cleanup on tag delete
- `search.service.test.ts`: title/body matching, highlighting, filtering by notebook/tag, per-user isolation
- `notes.routes.test.ts`: end-to-end main flow (notebook → note → tag → search → trash) + cross-user access protection
- `static.test.ts`: the web UI's HTML/JS/CSS are served correctly at the site root

Currently 55 test cases in total, all passing.

## TODO

- Wire up a real PostgreSQL database (replace `src/db/store.ts`)
- Refresh token / password recovery endpoints
- Image attachment upload
- Rich-text editor (currently the UI uses a plain textarea) and Markdown export
