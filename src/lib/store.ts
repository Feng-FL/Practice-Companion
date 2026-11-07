// Public API used by App.tsx + components.
// After the cloud migration, this is a thin wrapper over SyncClient.
// IndexedDB is retained as a write-through local cache (offline reads).
//
// Backward-compat note: the old shape used File objects inline. New shape uses
// CloudFileRef + (audio|sheet)SignedUrl. We re-export a RepertoireItem alias
// to types.ts so the rest of the app imports consistently.

import { get, set, keys, del } from 'idb-keyval';
import type { CloudItem, LoadedItem, CloudFileRef } from './types';
import { SyncClient, SyncError, makeClient } from './sync';

export type { CloudItem, LoadedItem, CloudFileRef, RepertoireItem } from './types';

const TOKEN_KEY = 'practice_companion_sync_token';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage may be unavailable (private mode, etc.)
  }
}

function clientOrThrow(): SyncClient {
  const c = makeClient(getToken());
  if (!c) throw new SyncError(0, 'NO_TOKEN', 'No sync token configured');
  return c;
}

// ---- IDB local cache ----
// We mirror cloud-loaded items here so the app can boot in offline mode.
// Keys starting with `_` are skipped by getAllItems() in the migration script.

// Entries written by the pre-cloud version carry the actual File blobs under
// `audioFile` / `sheetFile`. They are the user's only copy of that audio or
// sheet until it reaches R2, so they must survive any cache rewrite.
function hasLocalBlobs(item: unknown): boolean {
  const v = item as { audioFile?: unknown; sheetFile?: unknown } | null;
  if (!v) return false;
  return v.audioFile instanceof Blob || v.sheetFile instanceof Blob;
}

async function writeIdbCache(items: LoadedItem[]): Promise<void> {
  // Read all current keys, drop ones starting with `_`, replace.
  const allKeys: IDBValidKey[] = [];
  let cursor = 0;
  do {
    const next = await keys();
    allKeys.push(...next);
    cursor = 1; // idb-keyval's keys() returns a snapshot; one shot is enough
  } while (false && cursor !== 0); // unrolled for clarity
  const reservedKeys = allKeys.filter((k) => typeof k === 'string' && (k as string).startsWith('_'));
  const itemKeys = allKeys.filter((k) => typeof k === 'string' && !(k as string).startsWith('_'));
  // Drop reserved keys too — only used by the old code path. Keep for safety.
  void reservedKeys;

  // Entries that still carry pre-migration File blobs are the only copy of
  // that audio/sheet until it has been uploaded to R2. This function runs on
  // every successful cloud list, including the empty one that happens right
  // after the token is entered — so it must not delete them, or the local
  // library would be wiped before the migration banner ever runs.
  const pendingUpload = new Set<string>();
  for (const k of itemKeys) {
    const v = await get<unknown>(k);
    if (hasLocalBlobs(v)) {
      pendingUpload.add(k as string);
    }
  }

  await Promise.all(itemKeys.filter((k) => !pendingUpload.has(k as string)).map((k) => del(k)));
  // Don't let a cloud mirror overwrite an entry that still holds local blobs.
  await Promise.all(
    items.filter((it) => !pendingUpload.has(it.id)).map((it) => set(it.id, it)),
  );
}

async function readIdbAll(): Promise<LoadedItem[]> {
  const allKeys = await keys();
  const out: LoadedItem[] = [];
  for (const k of allKeys) {
    if (typeof k !== 'string' || k.startsWith('_')) continue;
    const v = await get<LoadedItem>(k);
    if (v) out.push(v);
  }
  return out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function clearLocalCache(): Promise<number> {
  const allKeys = await keys();
  let removed = 0;
  for (const k of allKeys) {
    if (typeof k !== 'string' || k.startsWith('_')) continue;
    await del(k);
    removed++;
  }
  return removed;
}

// ---- Public Store API ----

export interface SaveInput {
  id?: string;
  name: string;
  notes?: string;
  musicalKeys?: string[];
  audioFile?: File;
  sheetFile?: File;
}

export const Store = {
  /** Read all items from the cloud. Falls back to IDB cache if cloud unreachable. */
  async getAllItems(): Promise<LoadedItem[]> {
    const c = makeClient(getToken());
    if (!c) return readIdbAll();
    try {
      const { items } = await c.list();
      // Fire-and-forget local cache update.
      writeIdbCache(items).catch(() => {});
      // Items whose files still only exist on this device (not migrated yet)
      // belong in the list too — otherwise the library looks empty right
      // before the migration prompt appears.
      const cloudIds = new Set(items.map((i) => i.id));
      const localOnly = (await readIdbAll()).filter(
        (i) => !cloudIds.has(i.id) && hasLocalBlobs(i),
      );
      return [...items, ...localOnly].sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
      );
    } catch (e) {
      console.warn('[Store.getAllItems] cloud read failed, using IDB cache', e);
      return readIdbAll();
    }
  },

  async getItem(id: string): Promise<LoadedItem | undefined> {
    const c = makeClient(getToken());
    if (!c) {
      const all = await readIdbAll();
      return all.find((i) => i.id === id);
    }
    try {
      return await c.get(id);
    } catch (e) {
      if (e instanceof SyncError && e.status === 404) return undefined;
      console.warn('[Store.getItem] cloud read failed', e);
      const all = await readIdbAll();
      return all.find((i) => i.id === id);
    }
  },

  /**
   * Save (create or update) an item. Pending File uploads are streamed to R2
   * via the presigned-PUT route, then metadata is POSTed or PUT depending on
   * whether the id exists.
   */
  async saveItem(
    input: SaveInput,
    onProgress?: (phase: 'audio' | 'sheet', loaded: number, total: number) => void,
  ): Promise<LoadedItem> {
    const c = clientOrThrow();
    const id = input.id ?? (crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8));

    // 1) Upload any pending files (audio, sheet). Order doesn't matter; R2 keys
    //    are keyed by item id so we can do them in parallel.
    const [audioRef, sheetRef] = await Promise.all([
      input.audioFile
        ? c.uploadItemFile(id, 'audio', input.audioFile, onProgress
          ? (l, t) => onProgress('audio', l, t)
          : undefined)
        : Promise.resolve(undefined),
      input.sheetFile
        ? c.uploadItemFile(id, 'sheet', input.sheetFile, onProgress
          ? (l, t) => onProgress('sheet', l, t)
          : undefined)
        : Promise.resolve(undefined),
    ]);

    // 2) Build the metadata payload. If we're updating, only include refs the
    //    caller actually wants changed (so PUT semantics stay sparse).
    const isUpdate = Boolean(input.id);
    const patch: Partial<CloudItem> = {
      name: input.name,
      notes: input.notes,
      musicalKeys: input.musicalKeys,
      updatedAt: Date.now(),
    };
    if (audioRef) patch.audio = audioRef;
    if (sheetRef) patch.sheet = sheetRef;

    // 3) POST or PUT
    if (!isUpdate) {
      const created = await c.create({ ...patch, id } as CloudItem);
      writeIdbCache([created]).catch(() => {});
      return created;
    } else {
      const updated = await c.update(id, patch);
      writeIdbCache([updated]).catch(() => {});
      return updated;
    }
  },

  async deleteItem(id: string): Promise<void> {
    const c = makeClient(getToken());
    if (!c) {
      // No token = nothing to do; the cache is local-only.
      await del(id);
      return;
    }
    try {
      await c.delete(id);
    } finally {
      await del(id);
    }
  },

  /** Used by the migration script — reads raw IDB without filtering client-side state. */
  async getMigrationCandidates(): Promise<LoadedItem[]> {
    return readIdbAll();
  },

  async exportBackup(): Promise<Blob> {
    return (await import('./backup')).exportZip();
  },

  async importBackup(file: File): Promise<{ imported: number; skipped: number; failed: number }> {
    return (await import('./backup')).importZip(file);
  },

  hasToken(): boolean {
    return Boolean(getToken());
  },
};
