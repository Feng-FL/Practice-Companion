// One-time banner: appears if we detect IDB items that haven't been
// migrated to the cloud yet. Provides Migrate / Skip / Run again actions.

import { useEffect, useState } from 'react';
import { Upload, X, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { maybeRunMigration, getMigrationFlag, clearMigrationFlag, MigrationProgress } from '../lib/migrate';
import { Store } from '../lib/store';
import Button from './ui/Button';
import IconButton from './ui/IconButton';

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
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3">
      <div className="flex shrink-0 items-center gap-2">
        <Upload className="h-4 w-4 text-app-accent" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text">
          Cloud Migration
        </span>
      </div>

      {phase === 'idle' && (
        <>
          <span className="text-sm text-app-muted">
            Found <strong className="text-app-text">{idbCount}</strong> score{idbCount === 1 ? '' : 's'} on this
            device. Upload {idbCount === 1 ? 'it' : 'them'} to the cloud so other devices can see{' '}
            {idbCount === 1 ? 'it' : 'them'}?
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => run(false)}>
              Migrate
            </Button>
            <Button variant="ghost" size="sm" onClick={skip}>
              Already on cloud
            </Button>
          </div>
        </>
      )}

      {isMigrating && (
        <>
          <div className="min-w-[200px] flex-1">
            <div className="mb-1 text-xs text-app-muted">
              Uploading {progress?.done ?? 0} of {progress?.total ?? idbCount}
              {progress?.currentName ? ` — ${progress.currentName}` : ''}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-app-sunken">
              <div
                className="h-full bg-app-accent transition-all"
                style={{ width: pct + '%' }}
              />
            </div>
          </div>
        </>
      )}

      {phase === 'finished' && summary && (
        <>
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm text-app-muted">
            Migrated {summary.migrated}, skipped {summary.skipped}
            {summary.failed > 0 ? `, ${summary.failed} failed` : ''}.
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setPhase('idle'); setSummary(null); }}
            >
              <RefreshCw className="h-3 w-3" />
              Run again
            </Button>
            <IconButton label="Dismiss" onClick={() => setDismissed(true)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </>
      )}

      {phase === 'error' && (
        <>
          <AlertTriangle className="h-4 w-4 text-app-danger" />
          <span className="text-sm text-app-muted">Migration failed. Check the console for details.</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => run(true)}>
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
            <IconButton label="Dismiss" onClick={() => setDismissed(true)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </>
      )}
    </div>
  );
}
