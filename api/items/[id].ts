import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '../_lib/kv';
import { requireAuth } from '../_lib/auth';
import { error } from '../_lib/errors';
import { presignGet, headObject, deleteObject } from '../_lib/r2';
import type { CloudItem, LoadedItem, CloudFileRef } from '../../src/lib/types';

const KEY_PREFIX = 'repertoire:';
type Patch = Partial<Omit<CloudItem, 'id'>>;

function extractId(url: string | undefined): string | null {
  if (!url) return null;
  // Vercel populates req.query with the dynamic segment as a single value or array.
  const m = url.match(/\/api\/items\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function decorate(item: CloudItem): Promise<LoadedItem> {
  const out: LoadedItem = { ...item };
  if (item.audio) out.audioSignedUrl = await presignGet(item.audio.key);
  if (item.sheet) out.sheetSignedUrl = await presignGet(item.sheet.key);
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

  // Resolve id from either req.query.id or a fallback URL parse (some
  // Vercel runtimes leave query empty for dynamic routes).
  const idFromQuery = typeof req.query.id === 'string'
    ? req.query.id
    : Array.isArray(req.query.id) ? req.query.id[0] : null;
  const id = idFromQuery ?? extractId(req.url);
  if (!id) return error(res, 400, 'BAD_REQUEST', 'Missing item id');
  const key = `${KEY_PREFIX}${id}`;

  try {
    if (req.method === 'GET') {
      const item = await kv.get<CloudItem>(key);
      if (!item) return error(res, 404, 'NOT_FOUND', `Item ${id} not found`);
      const decorated = await decorate(item);
      return res.status(200).json(decorated);
    }

    if (req.method === 'PUT') {
      const existing = await kv.get<CloudItem>(key);
      if (!existing) return error(res, 404, 'NOT_FOUND', `Item ${id} not found`);
      const patch = req.body as Patch | undefined;
      if (!patch || typeof patch !== 'object') {
        return error(res, 400, 'BAD_REQUEST', 'Body must be a partial CloudItem');
      }
      // Conflict check: client is updating an item that's already been updated
      // server-side with a newer timestamp.
      if (typeof patch.updatedAt === 'number' && patch.updatedAt < existing.updatedAt) {
        const decorated = await decorate(existing);
        return res.status(409).json({ error: { code: 'STALE_UPDATE', message: 'Server has a newer version' }, item: decorated });
      }
      // Confirm any new file refs actually exist in R2.
      const v = await verifyRefs([patch.audio, patch.sheet]);
      if (!v.ok) {
        return error(res, 422, 'MISSING_BLOB', `R2 object not found: ${v.missing}`);
      }
      const prevAudioKey = existing.audio?.key;
      const prevSheetKey = existing.sheet?.key;
      const next: CloudItem = {
        ...existing,
        ...patch,
        id: existing.id,
        updatedAt: Date.now(),
      };
      await kv.set(key, next);
      // Best-effort cleanup of replaced blobs.
      if (next.audio?.key && next.audio.key !== prevAudioKey) {
        await deleteObject(prevAudioKey ?? '');
      }
      if (next.sheet?.key && next.sheet.key !== prevSheetKey) {
        await deleteObject(prevSheetKey ?? '');
      }
      const decorated = await decorate(next);
      return res.status(200).json(decorated);
    }

    if (req.method === 'DELETE') {
      const existing = await kv.get<CloudItem>(key);
      await kv.del(key);
      if (existing) {
        await deleteObject(existing.audio?.key ?? '');
        await deleteObject(existing.sheet?.key ?? '');
      }
      return res.status(204).end();
    }

    return error(res, 405, 'METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[items/[id]] error', e);
    return error(res, 500, 'INTERNAL', msg);
  }
}
