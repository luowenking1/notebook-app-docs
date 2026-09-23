import { pool } from '../src/db/pool';

/** Wipes every table between tests so each test starts from a clean database.
 *  RESTART IDENTITY is harmless here (our PKs are UUIDs, not sequences) but
 *  costs nothing to include for safety if that ever changes. */
export async function resetDb(): Promise<void> {
  await pool.query(
    `TRUNCATE users, notebooks, notes, tags, note_tags, refresh_tokens, password_reset_tokens, attachments
     RESTART IDENTITY CASCADE`
  );
}

export async function closeDb(): Promise<void> {
  await pool.end();
}
