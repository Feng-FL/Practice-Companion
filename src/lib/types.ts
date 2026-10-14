// Shared between client and server (api/*) so they agree on the wire shape.

export interface CloudFileRef {
  key: string;         // R2 object key, e.g. "repertoire/1700000000000/audio.mp3"
  mime: string;        // e.g. "audio/mpeg"
  filename: string;    // original filename, e.g. "Autumn Leaves.mp3"
  size: number;        // bytes
}

export interface CloudItem {
  id: string;
  name: string;
  notes?: string;
  musicalKeys?: string[];
  updatedAt: number; // ms epoch; server enforces monotonic on writes
  audio?: CloudFileRef;
  sheet?: CloudFileRef;
}

export interface LoadedItem extends CloudItem {
  audioSignedUrl?: string; // 1h TTL, regenerated on every list/get
  sheetSignedUrl?: string;
}

// Backward-compat alias kept around because components import the old name.
export type RepertoireItem = LoadedItem;

export interface PendingFile {
  file: File;
  ref: CloudFileRef;
}
