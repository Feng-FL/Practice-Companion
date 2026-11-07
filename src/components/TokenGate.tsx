// First-load card: appears if the user hasn't stored a sync token yet.

import { useState, FormEvent } from 'react';
import { Music, Loader2, AlertTriangle } from 'lucide-react';
import { SyncClient, SyncError } from '../lib/sync';
import { useSyncToken } from '../hooks/useSyncToken';
import Button from './ui/Button';

export default function TokenGate() {
  const { setToken } = useSyncToken();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!value.trim()) {
      setErr('Please paste your sync token.');
      return;
    }
    setBusy(true);
    try {
      const c = new SyncClient(value.trim());
      await c.list(); // cheap test call
      setToken(value.trim());
      // force a reload so App re-evaluates hasToken()
      window.location.reload();
    } catch (e) {
      if (e instanceof SyncError && e.status === 401) {
        setErr('Token rejected — check for typos.');
      } else if (e instanceof SyncError && e.status === 500) {
        setErr('Server error. The token was accepted, but the cloud store is not reachable — check the Vercel env vars (SYNC_TOKEN, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET).');
      } else if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr(String(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-8 shadow-[var(--app-shadow-lg)]"
      >
        <div className="mb-3 flex items-center gap-2">
          <Music className="h-4 w-4 text-app-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-text">
            Practice Companion
          </span>
        </div>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight text-app-text">
          Connect to the cloud
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-app-muted">
          Paste the <code className="rounded bg-app-sunken px-1.5 py-0.5 font-mono text-xs text-app-text">SYNC_TOKEN</code> you set
          in Vercel. It is stored in this browser's localStorage so future visits skip this step.
        </p>
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
          Sync token
        </label>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          placeholder="paste the token from your Vercel env"
          aria-label="Sync token"
          className="w-full rounded-xl border border-app-border bg-app-sunken px-4 py-3 font-mono text-sm text-app-text outline-none transition-colors placeholder:text-app-muted focus:border-app-accent focus:bg-app-raised"
        />
        {err && (
          <div className="mt-4 flex items-start gap-2 text-xs text-app-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{err}</span>
          </div>
        )}
        <Button type="submit" variant="primary" disabled={busy} className="mt-6 w-full" tracked={false}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting…
            </>
          ) : (
            'Connect'
          )}
        </Button>
      </form>
    </div>
  );
}
