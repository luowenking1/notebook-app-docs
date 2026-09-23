import { randomBytes, createHash } from 'crypto';

/** A random 32-byte token, hex-encoded (64 chars) — used for refresh and
 *  password-reset tokens. These are opaque, unguessable, and only ever
 *  stored server-side as a hash (see sha256Hex), never in plaintext. */
export function randomToken(): string {
  return randomBytes(32).toString('hex');
}

/** One-way hash for storing opaque tokens (refresh/reset) at rest, so a
 *  database read alone can never be replayed as a valid token. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
