import { useState, useRef, useEffect } from 'react';
import React from 'react';
import { X, Lock, Trash2, Download, Upload, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import { useSyncToken } from '../hooks/useSyncToken';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { Store } from '../lib/store';
import { SyncClient, SyncError } from '../lib/sync';
import { triggerDownload, importZip } from '../lib/backup';

interface Props {
  onClose: () => void;
  onTokenChanged?: () => void;
  onLocalCleared?: () => void;
}

export default function SettingsModal({ onClose, onTokenChanged, onLocalCleared }: Props) {
  const { token, setToken } = useSyncToken();
  const [status] = useSyncStatus();
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
    if (tokenStatus.kind === 'ok' || true) {
      // Re-fetch after the test (state from testToken may not have settled yet in some browsers)
      try {
        const c = new SyncClient(tokenInput);
        await c.list();
        setToken(tokenInput);
        onTokenChanged?.();
      } catch {
        // already surfaced by testToken
      }
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
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-[var(--color-retro-surface)] shadow-2xl border-l-[12px] border-[var(--color-retro-brown)] max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-2xl font-display tracking-wide">Settings</h2>
          <button onClick={onClose} className="opacity-60 hover:opacity-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {/* Token */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-[var(--color-retro-brown)]" />
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-retro-brown)]">
                Sync token
              </h3>
            </div>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => { setTokenInput(e.target.value); setTokenStatus({ kind: 'idle' }); }}
              placeholder={token ? '•••••••• (set) — paste a new one to change' : 'Paste your sync token'}
              className="w-full px-4 py-2.5 rounded-lg bg-black/20 border-2 border-transparent focus:border-[var(--color-retro-brown)] outline-none font-mono text-sm"
            />
            {tokenStatus.kind !== 'idle' && tokenStatus.msg && (
              <div
                className={`mt-2 text-xs flex items-start gap-1.5 ${
                  tokenStatus.kind === 'ok' ? 'text-emerald-400' :
                  tokenStatus.kind === 'fail' ? 'text-rose-400' :
                  'opacity-70'
                }`}
              >
                {tokenStatus.kind === 'testing' && <Loader2 className="w-3 h-3 mt-0.5 animate-spin" />}
                {tokenStatus.kind === 'ok' && <span>✓ {tokenStatus.msg}</span>}
                {tokenStatus.kind === 'fail' && <span>✗ {tokenStatus.msg}</span>}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={testToken}
                disabled={!tokenInput.trim() || tokenStatus.kind === 'testing'}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest font-bold disabled:opacity-40"
              >
                Test
              </button>
              <button
                onClick={applyToken}
                disabled={!tokenInput.trim() || busyKey === 'apply-token'}
                className="px-4 py-2 rounded-full bg-[var(--color-retro-brown)] text-[var(--color-retro-text)] font-bold uppercase tracking-widest text-[10px] hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
              >
                {busyKey === 'apply-token' && <Loader2 className="w-3 h-3 animate-spin" />}
                Update
              </button>
            </div>
          </section>

          {/* Status */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-retro-brown)] mb-2">
              Cloud status
            </h3>
            <div className="rounded-lg bg-black/20 px-4 py-3 text-sm font-mono">
              <div>State: <span className="opacity-80">{status.state}</span></div>
              <div>Items in cloud: <span className="opacity-80">{status.itemCount}</span></div>
              <div>Last synced: <span className="opacity-80">{status.lastSuccessAt ? new Date(status.lastSuccessAt).toLocaleTimeString() : 'never'}</span></div>
              {status.lastErrorMessage && (
                <div className="text-rose-400 mt-1">Last error: {status.lastErrorMessage}</div>
              )}
            </div>
          </section>

          {/* Backup */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-retro-brown)] mb-2">
              Backup
            </h3>
            <p className="text-xs opacity-70 mb-3">
              Save a local .zip with every MP3, PDF, and notes. Independent of the cloud — use to migrate to a new machine or as paranoia.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={exportZip}
                disabled={busyKey === 'export'}
                className="px-4 py-2 rounded-full bg-[var(--color-retro-teal)] text-[var(--color-retro-bg)] font-bold uppercase tracking-widest text-[10px] hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
              >
                {busyKey === 'export' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                Export .zip
              </button>
              <button
                onClick={importZipClick}
                disabled={busyKey === 'import'}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5"
              >
                {busyKey === 'import' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Import .zip
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept=".zip,application/zip"
                onChange={handleImport}
                className="hidden"
              />
            </div>
            {flash && (
              <div className="mt-3 text-xs px-3 py-2 rounded bg-black/30">{flash}</div>
            )}
          </section>

          {/* Local cache */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-retro-brown)] mb-2">
              Local cache
            </h3>
            <p className="text-xs opacity-70 mb-3">
              The app mirrors cloud items to IndexedDB so it works offline. Clear only when you're sure the cloud has everything.
            </p>
            <button
              onClick={requestClearCache}
              disabled={busyKey === 'check-clear' || busyKey === 'clear'}
              className="px-4 py-2 rounded-full bg-[var(--color-retro-red)] text-[var(--color-retro-text)] font-bold uppercase tracking-widest text-[10px] hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
            >
              {busyKey === 'check-clear' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Free local cache
            </button>
          </section>

          {/* Sign out */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-retro-brown)] mb-2">
              Sign out
            </h3>
            <p className="text-xs opacity-70 mb-3">
              Removes the sync token from this browser. Cloud data is untouched.
            </p>
            <button
              onClick={signOut}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5"
            >
              <LogOut className="w-3 h-3" />
              Sign out
            </button>
          </section>
        </div>
      </div>

      {/* Confirm-clear modal */}
      {confirmClear && (
        <div
          className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setConfirmClear(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[var(--color-retro-surface)] p-6 shadow-2xl border-l-[12px] border-[var(--color-retro-red)]"
          >
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-[var(--color-retro-red)] shrink-0 mt-1" />
              <h3 className="font-display text-xl">Free local cache?</h3>
            </div>
            <p className="text-sm opacity-90 mb-2">
              This deletes <strong>{confirmClear.idbCount}</strong> IndexedDB item{confirmClear.idbCount === 1 ? '' : 's'}.
              The cloud currently holds <strong>{confirmClear.cloudCount}</strong> item{confirmClear.cloudCount === 1 ? '' : 's'}.
            </p>
            {confirmClear.cloudCount < confirmClear.idbCount && (
              <p className="text-sm text-rose-400 mb-3">
                <strong>Warning:</strong> the cloud has fewer items than your local cache. Freeing will lose data.
                Migrate first (run migration again from the main view).
              </p>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setConfirmClear(null)}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest font-bold"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndClear}
                disabled={busyKey === 'clear'}
                className="px-4 py-2 rounded-full bg-[var(--color-retro-red)] text-[var(--color-retro-text)] font-bold uppercase tracking-widest text-[10px] hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
              >
                {busyKey === 'clear' && <Loader2 className="w-3 h-3 animate-spin" />}
                Free cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
