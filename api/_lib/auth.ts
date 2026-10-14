import type { VercelRequest, VercelResponse } from '@vercel/node';
import { error } from './errors';

export function requireAuth(req: VercelRequest, res: VercelResponse): boolean {
  const expected = process.env.SYNC_TOKEN;
  if (!expected) {
    error(res, 500, 'SERVER_MISCONFIGURED', 'SYNC_TOKEN env var is not set');
    return false;
  }
  const header = req.headers.authorization ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== expected) {
    error(res, 401, 'UNAUTHORIZED', 'Invalid or missing sync token');
    return false;
  }
  return true;
}
