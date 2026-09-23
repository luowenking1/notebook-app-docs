# Notebook App — Frontend

A React + TypeScript + Vite frontend for the notebook app, talking to the [backend](../backend) API.

This is the primary UI (served at `/` once built and the backend is running — see below).
A small vanilla-JS UI also exists at `../backend/public` (served at `/legacy`), kept as a
minimal reference/fallback that needs no build step.

## Tech Stack

- React 19 + TypeScript, built with Vite
- Plain CSS (no Tailwind/component library — see "Deviations from the tech doc" below)
- `fetch`-based API client with automatic access-token refresh (`src/api/client.ts`)
- Tests: Vitest + React Testing Library (21 tests)

## Features

Register/login (with forgot/reset password), notebooks, notes with debounced auto-save,
tags, full-text search with highlighted results, pin, trash (soft-delete/restore/permanent
delete), and image attachments (upload/view/delete) — the full feature set the backend exposes.

## Getting Started

The backend must be running first (see [../backend/README.md](../backend/README.md) —
it needs PostgreSQL set up).

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173, proxying /api and /uploads to :3000
npm test           # run all tests
npm run build       # type-check + production build to dist/
```

After `npm run build`, restart the backend (`npm run dev` or `npm start` in `../backend`) —
it detects `frontend/dist` and serves this app at `/` instead of falling back to the vanilla UI.

## Project structure

```
src/
  api/client.ts         # typed fetch wrapper for every backend endpoint, with
                         # transparent access-token refresh-and-retry on 401
  context/AuthContext.tsx  # auth state (user, tokens via localStorage), login/register/logout
  components/
    AuthScreen.tsx       # login / sign-up / forgot / reset password
    AppShell.tsx          # top-level layout + state (notebooks, notes, search, selection)
    Sidebar.tsx            # notebooks, tags, trash link
    NoteListPane.tsx        # the middle column: note list for the current view
    Editor.tsx               # title/content/tags/pin/delete/attachments for the selected note
  types.ts               # mirrors backend/src/types.ts
  utils.ts                # formatDate, buildSnippet, escapeHtml, debounce
```

## Deviations from the technical doc

The [technical design doc](../technical-design.md) specifies Tailwind CSS, Zustand, React
Query, and a Tiptap rich-text editor. To keep this implementation's scope manageable, this
version instead uses plain CSS, React's built-in `useState`/`useContext` (no separate state
library), and a plain `<textarea>` instead of a rich-text editor. The data layer (API client,
types, component boundaries) is structured so swapping in React Query or Tiptap later wouldn't
require restructuring the app — but that swap hasn't been done here.

## TODO

- Rich-text editor (Tiptap, per the tech doc) instead of the plain textarea
- React Query for server-state caching/invalidation instead of manual refetch calls
- Tailwind CSS / a design system, if a closer match to the tech doc's stack is wanted
- Route-based navigation (currently everything is client-state-driven with no URL sync)
