import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '../_lib/kv';
import { requireAuth } from '../_lib/auth';
import { error } from '../_lib/errors';
import { presignGet, headObject } from '../_lib/r2';
import type { CloudItem, LoadedItem, CloudFileRef } from '../../src/lib/types';

const KEY_PREFIX = 'repertoire:';
const MAX_LIST = 1000;

async function decorate(item: CloudItem): Promise<LoadedItem> {
  const out: LoadedItem = { ...item };
  if (item.audio) {
    out.audioSignedUrl = await presignGet(item.audio.key);
  }
  if (item.sheet) {
    out.sheetSignedUrl = await presignGet(item.sheet.key);
  }
  return out;
}

async function verifyRefs(refs: Array<CloudFileRef | undefined>): Promise<{ ok: boolean; missing?: string }> {
  for (const r of refs) {
    if (!r) continue;
    const exists = await headObject(r.key);
    if (!exists) return { ok: false, missing: r.key };
  }
  return { ok: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const keys: string[] = [];
      let cursor: string | number = '0';
      do {
        // The metadata store's scan returns [nextCursor, keys]
        const scan = await kv.scan(cursor as number, { match: `${KEY_PREFIX}*`, count: 100 });
        keys.push(...scan[1]);
        cursor = scan[0];
      } while (cursor !== 0 && cursor !== '0' && keys.length < MAX_LIST);

      const sl = keys.slice(0, MAX_LIST);
      const values = sl.length > 0 ? await kv.mget<CloudItem[]>(...sl) : [];
      const items = (values.filter(Boolean) as CloudItem[])
        .sort((a, b) => b.updatedAt - a.updatedAt);
      const decorated = await Promise.all(items.map(decorate));
      return res.status(200).json({ items: decorated });
    }

    if (req.method === 'POST') {
      const body = req.body as CloudItem | undefined;
      if (!body || typeof body.id !== 'string' || typeof body.name !== 'string') {
        return error(res, 400, 'BAD_REQUEST', 'Body must be a CloudItem with id and name');
      }
      const key = `${KEY_PREFIX}${body.id}`;
      const existing = await kv.get<CloudItem>(key);
      if (existing) {
        return error(res, 409, 'ALREADY_EXISTS', `Item ${body.id} already exists`);
      }
      const v = await verifyRefs([body.audio, body.sheet]);
      if (!v.ok) {
        return error(res, 422, 'MISSING_BLOB', `R2 object not found: ${v.missing}`);
      }
      const stored: CloudItem = { ...body, updatedAt: Date.now() };
      await kv.set(key, stored);
      const decorated = await decorate(stored);
      return res.status(201).json(decorated);
    }

    return error(res, 405, 'METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[items/index] error', e);
    return error(res, 500, 'INTERNAL', msg);
  }
}
