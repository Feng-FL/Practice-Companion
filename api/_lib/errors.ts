import type { VercelResponse } from '@vercel/node';

export function error(res: VercelResponse, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}
