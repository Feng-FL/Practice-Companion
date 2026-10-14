import { Cloud, CloudOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { useSyncStatus, SyncState } from '../hooks/useSyncStatus';

interface Props {
  onClick?: () => void;
}

function color(state: SyncState): string {
  switch (state) {
    case 'idle':       return 'bg-emerald-500';
    case 'syncing':    return 'bg-amber-400';
    case 'error':      return 'bg-rose-500';
    case 'offline':    return 'bg-zinc-500';
    case 'missing-token': return 'bg-zinc-600';
  }
}

function Icon({ state, className }: { state: SyncState; className?: string }) {
  switch (state) {
    case 'idle':       return <Check className={className} />;
    case 'syncing':    return <RefreshCw className={`${className ?? ''} animate-spin`} />;
    case 'error':      return <AlertTriangle className={className} />;
    case 'offline':    return <CloudOff className={className} />;
    case 'missing-token': return <Cloud className={className} />;
  }
}

function label(state: SyncState, lastSuccessAt: number | null, itemCount: number): string {
  if (state === 'missing-token') return 'Not connected';
  if (state === 'syncing')       return 'Syncing…';
  if (state === 'error')         return 'Sync error';
  if (state === 'offline')       return 'Offline';
  if (!lastSuccessAt)            return 'Not yet synced';
  const ago = Math.max(0, Math.round((Date.now() - lastSuccessAt) / 60000));
  return `${itemCount} item${itemCount === 1 ? '' : 's'} · synced ${ago === 0 ? 'just now' : ago + 'm ago'}`;
}

export default function SyncStatus({ onClick }: Props) {
  const [status] = useSyncStatus();
  return (
    <button
      type="button"
      onClick={onClick}
      title={status.lastErrorMessage ?? 'Sync settings'}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/30 transition-colors text-xs opacity-80 hover:opacity-100"
    >
      <span className={`w-2 h-2 rounded-full ${color(status.state)}`} />
      <Icon state={status.state} className="w-3.5 h-3.5" />
      <span className="font-mono uppercase tracking-widest text-[10px]">
        {label(status.state, status.lastSuccessAt, status.itemCount)}
      </span>
    </button>
  );
}
