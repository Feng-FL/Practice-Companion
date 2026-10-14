// Zip-based local backup/restore. Independent of the cloud — works even if
// the cloud is down. Mirrors the on-disk layout of the cloud (audio/, sheet/).

import JSZip from 'jszip';
import { Store } from './store';
import type { LoadedItem } from './types';

const MANIFEST_VERSION = 1;

interface ManifestItem {
  id: string;
  name: string;
  notes?: string;
  musicalKeys?: string[];
  updatedAt: number;
  audio?: { filename: string; mime: string; size: number };
  sheet?: { filename: string; mime: string; size: number };
}

interface Manifest {
  version: number;
  exportedAt: number;
  items: ManifestItem[];
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80);
}

export async function exportZip(): Promise<Blob> {
  const items = await Store.getAllItems();
  const zip = new JSZip();
  const manifest: Manifest = { version: MANIFEST_VERSION, exportedAt: Date.now(), items: [] };

  for (const it of items) {
    const manifestItem: ManifestItem = {
      id: it.id,
      name: it.name,
      notes: it.notes,
      musicalKeys: it.musicalKeys,
      updatedAt: it.updatedAt,
    };

    if (it.audioSignedUrl) {
      try {
        const res = await fetch(it.audioSignedUrl);
        if (res.ok) {
          const blob = await res.blob();
          const fname = sanitizeFilename(it.audio?.filename ?? `${it.id}.audio`);
          zip.file(`audio/${it.id}-${fname}`, blob);
          manifestItem.audio = {
            filename: fname,
            mime: it.audio?.mime ?? blob.type ?? 'application/octet-stream',
            size: blob.size,
          };
        }
      } catch (e) { console.warn('[backup] audio fetch failed for', it.id, e); }
    }

    if (it.sheetSignedUrl) {
      try {
        const res = await fetch(it.sheetSignedUrl);
        if (res.ok) {
          const blob = await res.blob();
          const fname = sanitizeFilename(it.sheet?.filename ?? `${it.id}.sheet`);
          zip.file(`sheet/${it.id}-${fname}`, blob);
          manifestItem.sheet = {
            filename: fname,
            mime: it.sheet?.mime ?? blob.type ?? 'application/octet-stream',
            size: blob.size,
          };
        }
      } catch (e) { console.warn('[backup] sheet fetch failed for', it.id, e); }
    }

    manifest.items.push(manifestItem);
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  return zip.generateAsync({ type: 'blob' });
}

export async function triggerDownload(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revocation so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importZip(
  file: File,
  onProgress?: (phase: string, msg: string) => void,
): Promise<{ imported: number; skipped: number; failed: number }> {
  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) throw new Error('manifest.json not found in zip');
  const manifest = JSON.parse(await manifestFile.async('string')) as Manifest;
  if (manifest.version !== MANIFEST_VERSION) {
    throw new Error(`Unsupported manifest version: ${manifest.version}`);
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const m of manifest.items) {
    onProgress?.('import', m.name);
    try {
      const audioPath = m.audio ? findFileInZip(zip, `audio/${m.id}-${sanitizeFilename(m.audio.filename)}`) : null;
      const sheetPath = m.sheet ? findFileInZip(zip, `sheet/${m.id}-${sanitizeFilename(m.sheet.filename)}`) : null;

      const audioFile = audioPath ? await zip.file(audioPath)!.async('blob').then((b) => new File([b], m.audio!.filename, { type: m.audio!.mime })) : undefined;
      const sheetFile = sheetPath ? await zip.file(sheetPath)!.async('blob').then((b) => new File([b], m.sheet!.filename, { type: m.sheet!.mime })) : undefined;

      // If item already exists in cloud and is newer, skip.
      let cloudItem: LoadedItem | undefined;
      try { cloudItem = await Store.getItem(m.id); } catch { /* not found */ }
      if (cloudItem && (cloudItem.updatedAt ?? 0) > (m.updatedAt ?? 0)) {
        skipped++;
        continue;
      }

      await Store.saveItem({
        id: m.id,
        name: m.name,
        notes: m.notes,
        musicalKeys: m.musicalKeys,
        audioFile,
        sheetFile,
      });
      imported++;
    } catch (e) {
      console.error('[import] failed for', m.id, e);
      failed++;
    }
  }

  return { imported, skipped, failed };
}

function findFileInZip(zip: JSZip, exactPath: string): string | null {
  const all = Object.keys(zip.files);
  if (zip.files[exactPath]) return exactPath;
  // Fall back to prefix match (someone may have changed sanitizer)
  const prefix = exactPath.split('/').slice(0, -1).join('/') + '/';
  for (const p of all) {
    if (p.startsWith(prefix)) return p;
  }
  return null;
}
