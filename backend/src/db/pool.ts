import { Pool } from 'pg';

/**
 * A single shared connection pool for the whole process.
 *
 * Database selection: NODE_ENV=test (set automatically by Jest) points at
 * `notebook_app_test` so the test suite never touches development data;
 * everything else defaults to `notebook_app`. DATABASE_URL, if set,
 * always wins outright (e.g. for a managed cloud Postgres in production).
 */
const isTest = process.env.NODE_ENV === 'test';
const defaultDatabase = isTest ? 'notebook_app_test' : 'notebook_app';

const connectionString =
  process.env.DATABASE_URL ||
  `postgres://${process.env.PGUSER || 'notebook_app'}:` +
    `${encodeURIComponent(process.env.PGPASSWORD || 'notebook_dev_password')}` +
    `@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}` +
    `/${process.env.PGDATABASE || defaultDatabase}`;

export const pool = new Pool({ connectionString });
