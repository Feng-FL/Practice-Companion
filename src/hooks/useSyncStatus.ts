// Tracks the latest sync health: 'idle' | 'syncing' | 'error' | 'offline'.
// Used by the header SyncStatus dot.

import { useEffect, useRef, useState } from 'react';
import { Store } from '../lib/store';

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline' | 'missing-token';

export interface SyncStatus {
  state: SyncState;
  lastSuccessAt: number | null;
  lastErrorMessage: string | null;
  itemCount: number;
}

const POLL_MS = 60_000;

export function useSyncStatus(enabled = true): [SyncStatus, () => Promise<void>] {
  const [status, setStatus] = useState<SyncStatus>({
    state: 'idle',
    lastSuccessAt: null,
    lastErrorMessage: null,
    itemCount: 0,
  });
  const inFlight = useRef(false);

  const tick = async () => {
    if (inFlight.current) return;
    if (!Store.hasToken()) {
      setStatus({
        state: 'missing-token',
        lastSuccessAt: null,
        lastErrorMessage: null,
        itemCount: 0,
      });
      return;
    }
    inFlight.current = true;
    setStatus((s) => ({ ...s, state: 'syncing' }));
    try {
      const items = await Store.getAllItems();
      setStatus({
        state: navigator.onLine ? 'idle' : 'offline',
        lastSuccessAt: Date.now(),
        lastErrorMessage: null,
        itemCount: items.length,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus((s) => ({
        ...s,
        state: navigator.onLine ? 'error' : 'offline',
        lastErrorMessage: msg,
      }));
    } finally {
      inFlight.current = false;
    }
  };

  useEffect(() => {
    if (!enabled) return;
    tick();
    const id = setInterval(tick, POLL_MS);
    const onVis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return [status, tick];
}
