import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './_lib/auth.js';
import { error } from './_lib/errors.js';
import { presignPut, objectKey } from './_lib/r2.js';

interface RequestBody {
  itemId?: string;
  kind?: 'audio' | 'sheet';
  filename?: string;
  mime?: string;
  size?: number;
}

const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200MB per-file hard cap; R2 allows more but 200MB is plenty for an MP3 / PDF

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') return error(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST');

  try {
    const body = req.body as RequestBody | undefined;
    if (!body || typeof body.itemId !== 'string' || (body.kind !== 'audio' && body.kind !== 'sheet')) {
      return error(res, 400, 'BAD_REQUEST', 'itemId and kind (audio|sheet) are required');
    }
    if (typeof body.filename !== 'string' || body.filename.length === 0) {
      return error(res, 400, 'BAD_REQUEST', 'filename is required');
    }
    if (typeof body.size === 'number' && body.size > MAX_FILE_BYTES) {
      return error(res, 413, 'FILE_TOO_LARGE', `File exceeds ${MAX_FILE_BYTES} bytes`);
    }

    const key = objectKey(body.itemId, body.kind, body.filename);
    const uploadUrl = await presignPut(key, body.mime ?? 'application/octet-stream');
    return res.status(200).json({ uploadUrl, key, expiresIn: 600 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[upload-url] error', e);
    return error(res, 500, 'INTERNAL', msg);
  }
}
