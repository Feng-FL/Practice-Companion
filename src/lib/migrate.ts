// One-time IDB → cloud migration. Runs on first load after deploy.
//
// Idempotency:
//   - Reads `localStorage.practice_companion_migrated_at` flag.
//   - For each IDB item, checks if cloud already has the same id with
//     `updatedAt >= item.updatedAt` — skip if so.

import { getToken } from './store';
import { Store } from './store';
import { makeClient } from './sync';
import type { LoadedItem } from './types';

const FLAG = 'practice_companion_migrated_at';

export interface MigrationProgress {
  total: number;
  done: number;
  currentId?: string;
  currentName?: string;
}

export interface MigrationResult {
  ran: boolean;
  migrated: number;
  skipped: number;
  failed: number;
}

export function clearMigrationFlag(): void {
  try { localStorage.removeItem(FLAG); } catch { /* ignore */ }
}

export function getMigrationFlag(): number | null {
  try {
    const v = localStorage.getItem(FLAG);
    return v ? Number(v) : null;
  } catch { return null; }
}

export async function maybeRunMigration(
  onProgress?: (p: MigrationProgress) => void,
  force = false,
): Promise<MigrationResult> {
  if (!force && getMigrationFlag() !== null) {
    return { ran: false, migrated: 0, skipped: 0, failed: 0 };
  }
  if (!getToken()) {
    return { ran: false, migrated: 0, skipped: 0, failed: 0 };
  }

  const idbItems = await Store.getMigrationCandidates();
  if (idbItems.length === 0) {
    try { localStorage.setItem(FLAG, String(Date.now())); } catch { /* ignore */ }
    return { ran: true, migrated: 0, skipped: 0, failed: 0 };
  }

  const c = makeClient(getToken());
  if (!c) return { ran: false, migrated: 0, skipped: 0, failed: 0 };

  // Fetch existing cloud items so we can skip already-migrated ones.
  let cloudById: Record<string, LoadedItem> = {};
  try {
    const { items } = await c.list();
    cloudById = Object.fromEntries(items.map((i) => [i.id, i]));
  } catch (e) {
    console.warn('[migrate] could not list cloud items; proceeding', e);
  }

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  onProgress?.({ total: idbItems.length, done: 0 });

  for (let i = 0; i < idbItems.length; i++) {
    const item = idbItems[i];
    const existing = cloudById[item.id];
    const alreadyUpToDate =
      existing && (existing.updatedAt ?? 0) >= (item.updatedAt ?? 0);

    onProgress?.({
      total: idbItems.length,
      done: i,
      currentId: item.id,
      currentName: item.name,
    });

    if (alreadyUpToDate) {
      skipped++;
      continue;
    }

    try {
      // IDB items from before the migration carry File blobs as audioFile/sheetFile.
      // The store's saveItem handles the upload; we call it with id so it uses PUT.
      const audioFile =
        (item as unknown as { audioFile?: File }).audioFile ?? undefined;
      const sheetFile =
        (item as unknown as { sheetFile?: File }).sheetFile ?? undefined;

      // Map old shape → new shape. The store accepts SaveInput directly.
      await Store.saveItem({
        id: item.id,
        name: item.name,
        notes: item.notes,
        musicalKeys: item.musicalKeys,
        audioFile,
        sheetFile,
      });
      migrated++;
    } catch (e) {
      console.error('[migrate] failed for', item.id, e);
      failed++;
    }
  }

  onProgress?.({ total: idbItems.length, done: idbItems.length });
  try { localStorage.setItem(FLAG, String(Date.now())); } catch { /* ignore */ }
  return { ran: true, migrated, skipped, failed };
}
