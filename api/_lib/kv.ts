// Metadata store for the repertoire list.
//
// This used to be Vercel KV (@vercel/kv). Vercel retired first-party KV
// creation in 2026 — a new store now requires accepting Upstash marketplace
// terms in a browser — so the metadata map lives in the same Cloudflare R2
// bucket as the audio/sheet blobs, under the `meta/` prefix.
//
// The exported object keeps the KV-shaped API (get/set/del/scan/mget) so the
// route handlers in api/items/ need no changes. Values are plain JSON.
//
// Writes are read-modify-write with an ETag precondition so two devices
// updating the list at the same time can't silently clobber each other.

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3, BUCKET } from './r2.js';

const META_KEY = 'meta/repertoire.json';

type MetaMap = Record<string, unknown>;

function isNotFound(e: unknown): boolean {
  const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
  return err?.name === 'NoSuchKey' || err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404;
}

function isPreconditionFailed(e: unknown): boolean {
  const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
  return err?.name === 'PreconditionFailed' || err?.$metadata?.httpStatusCode === 412;
}

async function loadMap(): Promise<{ map: MetaMap; etag?: string }> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: META_KEY }));
    const body = await res.Body?.transformToString();
    const map = body ? (JSON.parse(body) as MetaMap) : {};
    return { map, etag: res.ETag };
  } catch (e) {
    if (isNotFound(e)) return { map: {} };
    throw e;
  }
}

async function writeMap(map: MetaMap, etag?: string): Promise<void> {
  const args: ConstructorParameters<typeof PutObjectCommand>[0] = {
    Bucket: BUCKET,
    Key: META_KEY,
    Body: JSON.stringify(map),
    ContentType: 'application/json',
  };
  // Only guard the write when we know the current ETag; a brand new object
  // has none and must be created unconditionally.
  if (etag) args.IfMatch = etag;
  await s3.send(new PutObjectCommand(args));
}

async function mutate(fn: (map: MetaMap) => void): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { map, etag } = await loadMap();
    const next: MetaMap = { ...map };
    fn(next);
    try {
      await writeMap(next, etag);
      return;
    } catch (e) {
      // Someone else wrote between our read and write — reload and retry.
      if (isPreconditionFailed(e) && attempt < 2) continue;
      throw e;
    }
  }
}

function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    const { map } = await loadMap();
    const value = map[key];
    return value === undefined ? null : (value as T);
  },

  async mget<T extends unknown[]>(...keys: string[]): Promise<T> {
    const { map } = await loadMap();
    return keys.map((k) => (map[k] === undefined ? null : map[k])) as unknown as T;
  },

  async set(key: string, value: unknown): Promise<void> {
    await mutate((map) => {
      map[key] = value;
    });
  },

  async del(key: string): Promise<void> {
    await mutate((map) => {
      delete map[key];
    });
  },

  // The map is small enough to return in one shot, so the cursor is always
  // '0' — callers stop iterating on the first pass.
  async scan(
    cursor: string | number,
    opts?: { match?: string; count?: number },
  ): Promise<[string | number, string[]]> {
    void cursor;
    const { map } = await loadMap();
    const re = opts?.match ? globToRegExp(opts.match) : null;
    let keys = Object.keys(map).filter((k) => !re || re.test(k));
    if (opts?.count) keys = keys.slice(0, opts.count);
    return ['0', keys];
  },
};
