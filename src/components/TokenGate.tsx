// First-load card: appears if the user hasn't stored a sync token yet.

import { useState, FormEvent } from 'react';
import { Music, Loader2, AlertTriangle } from 'lucide-react';
import { SyncClient, SyncError } from '../lib/sync';
import { useSyncToken } from '../hooks/useSyncToken';

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
        setErr('Server error. Make sure SYNC_TOKEN is set in your Vercel env vars.');
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
    <div className="min-h-screen bg-[var(--color-retro-bg)] text-[var(--color-retro-text)] font-sans flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-[var(--color-retro-surface)] p-8 shadow-xl border-l-[12px] border-[var(--color-retro-brown)]"
      >
        <div className="flex items-center gap-2 mb-2">
          <Music className="w-5 h-5 text-[var(--color-retro-brown)]" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--color-retro-brown)]">
            Practice Companion
          </span>
        </div>
        <h1 className="text-3xl font-display tracking-wide mb-3">
          Connect to the cloud
        </h1>
        <p className="text-sm opacity-80 mb-6 leading-relaxed">
          Paste the <code className="px-1.5 py-0.5 rounded bg-black/20 font-mono text-xs">SYNC_TOKEN</code> you set in Vercel.
          It is stored in this browser's localStorage so future visits skip this step.
        </p>
        <label className="block text-[10px] uppercase font-bold tracking-widest opacity-60 mb-2">
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
          className="w-full px-4 py-3 rounded-lg bg-black/20 border-2 border-transparent focus:border-[var(--color-retro-brown)] outline-none font-mono text-sm"
        />
        {err && (
          <div className="mt-4 flex items-start gap-2 text-[var(--color-retro-red)] text-xs">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{err}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full px-6 py-3 rounded-full bg-[var(--color-retro-brown)] text-[var(--color-retro-text)] font-bold uppercase tracking-widest text-sm shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting…
            </>
          ) : (
            'Connect'
          )}
        </button>
      </form>
    </div>
  );
}
