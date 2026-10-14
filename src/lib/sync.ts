import type { CloudItem, LoadedItem, CloudFileRef } from './types';

export class SyncError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public serverItem?: LoadedItem,
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

interface UploadUrlResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

export class SyncClient {
  constructor(public token: string) {}

  private headers(extra: HeadersInit = {}): HeadersInit {
    return {
      ...extra,
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(path, { ...init, headers: this.headers(init.headers) });
    if (!res.ok) {
      let body:
        | { error?: { code: string; message: string }; item?: LoadedItem }
        | null = null;
      try {
        body = await res.json();
      } catch {
        // Non-JSON body
      }
      throw new SyncError(
        res.status,
        body?.error?.code ?? 'UNKNOWN',
        body?.error?.message ?? `HTTP ${res.status}`,
        body?.item,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  list(): Promise<{ items: LoadedItem[] }> {
    return this.req('/api/items');
  }

  get(id: string): Promise<LoadedItem> {
    return this.req('/api/items/' + encodeURIComponent(id));
  }

  create(item: CloudItem): Promise<LoadedItem> {
    return this.req('/api/items', { method: 'POST', body: JSON.stringify(item) });
  }

  update(id: string, patch: Partial<CloudItem>): Promise<LoadedItem> {
    return this.req('/api/items/' + encodeURIComponent(id), {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  }

  async delete(id: string): Promise<void> {
    await this.req('/api/items/' + encodeURIComponent(id), { method: 'DELETE' });
  }

  async getUploadUrl(
    itemId: string,
    kind: 'audio' | 'sheet',
    file: File,
  ): Promise<UploadUrlResponse> {
    return this.req('/api/upload-url', {
      method: 'POST',
      body: JSON.stringify({
        itemId,
        kind,
        filename: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
      }),
    });
  }

  /**
   * PUT a file directly to R2 via the presigned URL. Uses XHR so we can
   * surface upload progress (fetch doesn't expose it).
   */
  uploadFile(
    file: File,
    uploadUrl: string,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      if (file.type) xhr.setRequestHeader('Content-Type', file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else
          reject(
            new SyncError(xhr.status, 'UPLOAD_FAILED', 'PUT failed with HTTP ' + xhr.status),
          );
      };
      xhr.onerror = () =>
        reject(new SyncError(0, 'NETWORK', 'Network error during upload'));
      xhr.send(file);
    });
  }

  /**
   * End-to-end: get a presigned PUT URL, upload, return the resulting CloudFileRef.
   * Note: getUploadUrl is called twice (once to obtain the key, once for the URL).
   * This is intentional so callers can pre-register the key before uploading.
   */
  async uploadItemFile(
    itemId: string,
    kind: 'audio' | 'sheet',
    file: File,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<CloudFileRef> {
    const first = await this.getUploadUrl(itemId, kind, file);
    const url = (await this.getUploadUrl(itemId, kind, file)).uploadUrl;
    await this.uploadFile(file, url, onProgress);
    return {
      key: first.key,
      mime: file.type || 'application/octet-stream',
      filename: file.name,
      size: file.size,
    };
  }
}

export function makeClient(token: string | null): SyncClient | null {
  if (!token) return null;
  return new SyncClient(token);
}
