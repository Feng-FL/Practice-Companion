import { useCallback, useEffect, useState } from 'react';
import {
  Theme,
  applyTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  systemTheme,
} from '../lib/theme';

export interface ThemeControls {
  theme: Theme;
  /** True when the user has explicitly picked a theme in this browser. */
  isExplicit: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Follows the system theme until the user picks one; after that the stored
 * choice wins and system changes are ignored.
 */
export function useTheme(): ThemeControls {
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme());
  const [isExplicit, setIsExplicit] = useState<boolean>(() => readStoredTheme() !== null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (isExplicit) return;
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }
    const onChange = () => setThemeState(systemTheme());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [isExplicit]);

  const setTheme = useCallback((next: Theme) => {
    storeTheme(next);
    setIsExplicit(true);
    setThemeState(next);
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'studio' ? 'paper' : 'studio');
  }, [theme, setTheme]);

  return { theme, isExplicit, setTheme, toggleTheme };
}
