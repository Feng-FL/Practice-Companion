// One-time banner: appears if we detect IDB items that haven't been
// migrated to the cloud yet. Provides Migrate / Skip / Run again actions.

import { useEffect, useState } from 'react';
import { Upload, X, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { maybeRunMigration, getMigrationFlag, clearMigrationFlag, MigrationProgress } from '../lib/migrate';
import { Store } from '../lib/store';

interface Props {
  onDone: () => void;
}

type Phase = 'idle' | 'migrating' | 'finished' | 'error';

export default function MigrationBanner({ onDone }: Props) {
  const [idbCount, setIdbCount] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [summary, setSummary] = useState<{ migrated: number; skipped: number; failed: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Skip logic: if already migrated, do nothing.
    if (getMigrationFlag() !== null) return;
    let cancelled = false;
    Store.getMigrationCandidates().then((items) => {
      if (!cancelled) setIdbCount(items.length);
    });
    return () => { cancelled = true; };
  }, []);

  const run = async (force = false) => {
    setPhase('migrating');
    setSummary(null);
    try {
      const res = await maybeRunMigration((p) => setProgress(p), force);
      setSummary({ migrated: res.migrated, skipped: res.skipped, failed: res.failed });
      setPhase(res.failed > 0 && res.migrated === 0 ? 'error' : 'finished');
      if (res.migrated > 0 || res.skipped > 0) {
        // Refresh the parent list.
        onDone();
      }
    } catch (e) {
      console.error('[MigrationBanner] failed', e);
      setPhase('error');
    }
  };

  const skip = () => {
    clearMigrationFlag(); // no-op if not set
    // Actually we DO want to set the flag — this is "I've already migrated, don't ask"
    try { localStorage.setItem('practice_companion_migrated_at', String(Date.now())); } catch { /* */ }
    setDismissed(true);
  };

  if (dismissed) return null;
  if (idbCount === null) return null;
  if (idbCount === 0 && getMigrationFlag() !== null) return null; // already empty + migrated

  const isMigrating = phase === 'migrating';
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div className="rounded-xl border-2 border-[var(--color-retro-brown)] bg-black/20 px-4 py-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 shrink-0">
        <Upload className="w-4 h-4 text-[var(--color-retro-brown)]" />
        <span className="font-bold uppercase tracking-widest text-[10px]">
          Cloud Migration
        </span>
      </div>

      {phase === 'idle' && (
        <>
          <span className="text-sm opacity-90">
            Found <strong>{idbCount}</strong> score{idbCount === 1 ? '' : 's'} on this device. Upload {idbCount === 1 ? 'it' : 'them'} to the cloud so other devices can see {idbCount === 1 ? 'it' : 'them'}?
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => run(false)}
              className="px-4 py-1.5 rounded-full bg-[var(--color-retro-brown)] text-[var(--color-retro-text)] font-bold uppercase tracking-widest text-[10px] hover:brightness-110"
            >
              Migrate
            </button>
            <button
              type="button"
              onClick={skip}
              className="px-4 py-1.5 rounded-full hover:bg-white/5 text-[10px] uppercase tracking-widest opacity-70 hover:opacity-100"
            >
              Already on cloud
            </button>
          </div>
        </>
      )}

      {isMigrating && (
        <>
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs opacity-80 mb-1">
              Uploading {progress?.done ?? 0} of {progress?.total ?? idbCount}
              {progress?.currentName ? ` — ${progress.currentName}` : ''}
            </div>
            <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
              <div
                className="h-full bg-[var(--color-retro-teal)] transition-all"
                style={{ width: pct + '%' }}
              />
            </div>
          </div>
        </>
      )}

      {phase === 'finished' && summary && (
        <>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm opacity-90">
            Migrated {summary.migrated}, skipped {summary.skipped}
            {summary.failed > 0 ? `, ${summary.failed} failed` : ''}.
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setPhase('idle'); setSummary(null); }}
              className="px-3 py-1.5 rounded-full hover:bg-white/5 text-[10px] uppercase tracking-widest opacity-70 hover:opacity-100 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Run again
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="px-3 py-1.5 rounded-full hover:bg-white/5 text-[10px] uppercase tracking-widest opacity-70 hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </>
      )}

      {phase === 'error' && (
        <>
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span className="text-sm">Migration failed. Check the console for details.</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => run(true)}
              className="px-3 py-1.5 rounded-full hover:bg-white/5 text-[10px] uppercase tracking-widest opacity-70 hover:opacity-100 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="px-3 py-1.5 rounded-full hover:bg-white/5 text-[10px] uppercase tracking-widest opacity-70 hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
