import fs from 'fs';
import path from 'path';
import { pool } from './pool';

/**
 * Applies schema.sql (idempotent: CREATE TABLE/INDEX IF NOT EXISTS) to
 * whichever database `pool` currently points at. Run automatically before
 * `npm test` (via the `pretest` script) and before `npm run dev`/`npm start`
 * (via `predev`/`prestart`), so there's no manual migration step for a
 * normal workflow.
 */
export async function migrate(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(sql);
}

if (require.main === module) {
  migrate()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Database schema is up to date.');
      return pool.end();
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Migration failed:', err.message);
      process.exitCode = 1;
      return pool.end();
    });
}
