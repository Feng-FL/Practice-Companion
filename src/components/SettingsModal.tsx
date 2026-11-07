import { useState, useRef, useEffect } from 'react';
import React from 'react';
import { X, Lock, Trash2, Download, Upload, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import { useSyncToken } from '../hooks/useSyncToken';
import type { SyncStatus as SyncStatusData } from '../hooks/useSyncStatus';
import { Store } from '../lib/store';
import { SyncClient, SyncError } from '../lib/sync';
import { triggerDownload, importZip } from '../lib/backup';
import Button from './ui/Button';
import IconButton from './ui/IconButton';

interface Props {
  onClose: () => void;
  onTokenChanged?: () => void;
  onLocalCleared?: () => void;
  /** Shared with the header pill so both read the same live poll. */
  status: SyncStatusData;
}

export default function SettingsModal({ onClose, onTokenChanged, onLocalCleared, status }: Props) {
  const { token, setToken } = useSyncToken();
  const [tokenInput, setTokenInput] = useState('');
  const [tokenStatus, setTokenStatus] = useState<{ kind: 'idle' | 'testing' | 'ok' | 'fail'; msg?: string }>({ kind: 'idle' });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<null | { idbCount: number; cloudCount: number }>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const testToken = async () => {
    setTokenStatus({ kind: 'testing' });
    try {
      const c = new SyncClient(tokenInput);
      const { items } = await c.list();
      setTokenStatus({ kind: 'ok', msg: `Connected — ${items.length} item${items.length === 1 ? '' : 's'} in cloud` });
    } catch (e) {
      if (e instanceof SyncError && e.status === 401) {
        setTokenStatus({ kind: 'fail', msg: 'Rejected — check the token.' });
      } else if (e instanceof SyncError) {
        setTokenStatus({ kind: 'fail', msg: `HTTP ${e.status}: ${e.message}` });
      } else if (e instanceof Error) {
        setTokenStatus({ kind: 'fail', msg: e.message });
      } else {
        setTokenStatus({ kind: 'fail', msg: String(e) });
      }
    }
  };

  const applyToken = async () => {
    setBusyKey('apply-token');
    await testToken();
    // Re-fetch after the test (state from testToken may not have settled yet in some browsers)
    try {
      const c = new SyncClient(tokenInput);
      await c.list();
      setToken(tokenInput);
      onTokenChanged?.();
    } catch {
      // already surfaced by testToken
    }
    setBusyKey(null);
  };

  const exportZip = async () => {
    setBusyKey('export');
    try {
      const blob = await Store.exportBackup();
      const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
      await triggerDownload(blob, `practice-companion-backup-${ts}.zip`);
      setFlash('Backup downloaded');
      setTimeout(() => setFlash(null), 3000);
    } catch (e) {
      setFlash('Export failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusyKey(null);
    }
  };

  const importZipClick = () => importFileRef.current?.click();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyKey('import');
    try {
      const res = await importZip(file);
      setFlash(`Imported ${res.imported} (skipped ${res.skipped}, failed ${res.failed})`);
      setTimeout(() => setFlash(null), 5000);
    } catch (err) {
      setFlash('Import failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusyKey(null);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const requestClearCache = async () => {
    setBusyKey('check-clear');
    try {
      const idb = await Store.getMigrationCandidates();
      const cloud = await Store.getAllItems();
      setConfirmClear({ idbCount: idb.length, cloudCount: cloud.length });
    } finally {
      setBusyKey(null);
    }
  };

  const confirmAndClear = async () => {
    if (!confirmClear) return;
    setBusyKey('clear');
    try {
      const removed = await (await import('../lib/store')).clearLocalCache();
      setConfirmClear(null);
      setFlash(`Cleared ${removed} local item${removed === 1 ? '' : 's'}`);
      setTimeout(() => setFlash(null), 3000);
      onLocalCleared?.();
    } finally {
      setBusyKey(null);
    }
  };

  const signOut = () => {
    setToken(null);
    setTokenInput('');
    onClose();
    // Reload so the app re-renders without a token (TokenGate takes over).
    setTimeout(() => window.location.reload(), 50);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[var(--app-shadow-lg)]"
      >
        <div className="flex items-center justify-between border-b border-app-border-soft px-6 py-4">
          <h2 className="text-lg font-semibold text-app-text">Settings</h2>
          <IconButton label="Close settings" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="pc-scroll flex-1 space-y-7 overflow-y-auto px-6 py-5">
          {/* Token */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-app-accent" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text">
                Sync token
              </h3>
            </div>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => { setTokenInput(e.target.value); setTokenStatus({ kind: 'idle' }); }}
              placeholder={token ? '•••••••• (set) — paste a new one to change' : 'Paste your sync token'}
              aria-label="Sync token"
              className="w-full rounded-xl border border-app-border bg-app-sunken px-4 py-2.5 font-mono text-sm text-app-text outline-none transition-colors placeholder:text-app-muted focus:border-app-accent focus:bg-app-raised"
            />
            {tokenStatus.kind !== 'idle' && tokenStatus.msg && (
              <div
                className={`mt-2 flex items-start gap-1.5 text-xs ${
                  tokenStatus.kind === 'ok'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : tokenStatus.kind === 'fail'
                      ? 'text-app-danger'
                      : 'text-app-muted'
                }`}
              >
                {tokenStatus.kind === 'testing' && <Loader2 className="mt-0.5 h-3 w-3 animate-spin" />}
                {tokenStatus.kind === 'ok' && <span>✓ {tokenStatus.msg}</span>}
                {tokenStatus.kind === 'fail' && <span>✗ {tokenStatus.msg}</span>}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={testToken}
                disabled={!tokenInput.trim() || tokenStatus.kind === 'testing'}
              >
                Test
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={applyToken}
                disabled={!tokenInput.trim() || busyKey === 'apply-token'}
              >
                {busyKey === 'apply-token' && <Loader2 className="h-3 w-3 animate-spin" />}
                Update
              </Button>
            </div>
          </section>

          {/* Status */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text">
              Cloud status
            </h3>
            <div className="rounded-xl border border-app-border bg-app-sunken px-4 py-3 font-mono text-xs text-app-muted">
              <div>State: <span className="text-app-text">{status.state}</span></div>
              <div>Items in cloud: <span className="text-app-text">{status.itemCount}</span></div>
              <div>
                Last synced:{' '}
                <span className="text-app-text">
                  {status.lastSuccessAt ? new Date(status.lastSuccessAt).toLocaleTimeString() : 'never'}
                </span>
              </div>
              {status.lastErrorMessage && (
                <div className="mt-1 text-app-danger">Last error: {status.lastErrorMessage}</div>
              )}
            </div>
          </section>

          {/* Backup */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text">
              Backup
            </h3>
            <p className="mb-3 text-xs leading-relaxed text-app-muted">
              Save a local .zip with every MP3, PDF, and notes. Independent of the cloud — use to
              migrate to a new machine or as paranoia.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={exportZip} disabled={busyKey === 'export'}>
                {busyKey === 'export' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                Export .zip
              </Button>
              <Button variant="secondary" size="sm" onClick={importZipClick} disabled={busyKey === 'import'}>
                {busyKey === 'import' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Import .zip
              </Button>
              <input
                ref={importFileRef}
                type="file"
                accept=".zip,application/zip"
                onChange={handleImport}
                className="hidden"
              />
            </div>
            {flash && (
              <div className="mt-3 rounded-lg bg-app-sunken px-3 py-2 text-xs text-app-text">{flash}</div>
            )}
          </section>

          {/* Local cache */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text">
              Local cache
            </h3>
            <p className="mb-3 text-xs leading-relaxed text-app-muted">
              The app mirrors cloud items to IndexedDB so it works offline. Clear only when you're
              sure the cloud has everything.
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={requestClearCache}
              disabled={busyKey === 'check-clear' || busyKey === 'clear'}
            >
              {busyKey === 'check-clear' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Free local cache
            </Button>
          </section>

          {/* Sign out */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text">
              Sign out
            </h3>
            <p className="mb-3 text-xs leading-relaxed text-app-muted">
              Removes the sync token from this browser. Cloud data is untouched.
            </p>
            <Button variant="secondary" size="sm" onClick={signOut}>
              <LogOut className="h-3 w-3" />
              Sign out
            </Button>
          </section>
        </div>
      </div>

      {/* Confirm-clear modal */}
      {confirmClear && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 p-4"
          onClick={() => setConfirmClear(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Free local cache?"
            className="w-full max-w-sm rounded-2xl border border-app-border bg-app-surface p-6 shadow-[var(--app-shadow-lg)]"
          >
            <div className="mb-3 flex items-start gap-2">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-app-danger" />
              <h3 className="text-lg font-semibold text-app-text">Free local cache?</h3>
            </div>
            <p className="mb-2 text-sm leading-relaxed text-app-muted">
              This deletes <strong className="text-app-text">{confirmClear.idbCount}</strong> IndexedDB
              item{confirmClear.idbCount === 1 ? '' : 's'}. The cloud currently holds{' '}
              <strong className="text-app-text">{confirmClear.cloudCount}</strong> item
              {confirmClear.cloudCount === 1 ? '' : 's'}.
            </p>
            {confirmClear.cloudCount < confirmClear.idbCount && (
              <p className="mb-3 text-sm text-app-danger">
                <strong>Warning:</strong> the cloud has fewer items than your local cache. Freeing will
                lose data. Migrate first (run migration again from the main view).
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={confirmAndClear} disabled={busyKey === 'clear'}>
                {busyKey === 'clear' && <Loader2 className="h-3 w-3 animate-spin" />}
                Free cache
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
