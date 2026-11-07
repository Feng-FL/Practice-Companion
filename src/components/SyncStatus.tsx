import { Cloud, CloudOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import type { SyncStatus as SyncStatusData, SyncState } from '../hooks/useSyncStatus';

interface Props {
  status: SyncStatusData;
  onClick?: () => void;
}

function dot(state: SyncState): string {
  switch (state) {
    case 'idle':            return 'bg-emerald-500';
    case 'syncing':         return 'bg-amber-400';
    case 'error':           return 'bg-rose-500';
    case 'offline':         return 'bg-zinc-500';
    case 'missing-token':   return 'bg-zinc-400';
  }
}

function Icon({ state, className }: { state: SyncState; className?: string }) {
  switch (state) {
    case 'idle':            return <Check className={className} />;
    case 'syncing':         return <RefreshCw className={`${className ?? ''} animate-spin`} />;
    case 'error':           return <AlertTriangle className={className} />;
    case 'offline':         return <CloudOff className={className} />;
    case 'missing-token':   return <Cloud className={className} />;
  }
}

export function syncLabel(
  state: SyncState,
  lastSuccessAt: number | null,
  itemCount: number,
): string {
  if (state === 'missing-token') return 'Not connected';
  if (state === 'syncing')       return 'Syncing…';
  if (state === 'error')         return 'Sync error';
  if (state === 'offline')       return 'Offline';
  if (!lastSuccessAt)            return 'Not yet synced';
  const ago = Math.max(0, Math.round((Date.now() - lastSuccessAt) / 60000));
  return `${itemCount} item${itemCount === 1 ? '' : 's'} · synced ${ago === 0 ? 'just now' : ago + 'm ago'}`;
}

export default function SyncStatus({ status, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={status.lastErrorMessage ?? 'Sync settings'}
      className="flex h-9 items-center gap-2 rounded-xl border border-app-border bg-app-raised px-3 text-app-muted transition-colors duration-150 hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot(status.state)}`} />
      <Icon state={status.state} className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] sm:inline">
        {syncLabel(status.state, status.lastSuccessAt, status.itemCount)}
      </span>
    </button>
  );
}
