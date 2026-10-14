import { useState, useEffect, useCallback } from 'react';
import { getToken, setToken as persist } from '../lib/store';

export function useSyncToken() {
  const [token, setTokenState] = useState<string | null>(() => getToken());

  const setToken = useCallback((t: string | null) => {
    persist(t);
    setTokenState(t);
  }, []);

  // Storage event handler — keep token in sync across tabs.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'practice_companion_sync_token') {
        setTokenState(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return { token, setToken };
}
