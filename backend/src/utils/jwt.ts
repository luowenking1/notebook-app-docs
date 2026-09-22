import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: '30m' });
}

export function verifyToken(token: string): string {
  const payload = jwt.verify(token, SECRET) as { sub: string };
  return payload.sub;
}
