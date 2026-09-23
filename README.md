# Notebook App

A personal notebook app: product docs, backend API, and frontend.

## Docs

- [Requirements (PRD)](./requirements.md)
- [Technical Design](./technical-design.md)

## Code

- [`backend/`](./backend) — Node.js + TypeScript + Express + PostgreSQL API, with a full unit/integration test suite (86 tests, all passing). See [backend/README.md](./backend/README.md).
- [`frontend/`](./frontend) — React + TypeScript + Vite frontend (21 tests, all passing). Served at `/` by the backend once built. See [frontend/README.md](./frontend/README.md).

## Quick start

```bash
cd backend && npm install && npm run dev    # http://localhost:3000 (needs PostgreSQL — see backend/README.md)
cd frontend && npm install && npm run build  # then restart the backend to serve it at /
```
