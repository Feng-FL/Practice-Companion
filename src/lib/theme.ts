// Theme selection. Two visual variants of the same layout:
//   'paper'  — warm paper: ivory ground, charcoal text, sage-green accents
//   'studio' — dark studio: graphite ground, off-white text, soft-blue accents
//
// The user's explicit choice is kept in its own localStorage key (separate
// from the sync token / migration flag) so it never interferes with sync state.

export type Theme = 'paper' | 'studio';

export const THEME_STORAGE_KEY = 'practice_companion_theme';

export const THEME_LABELS: Record<Theme, string> = {
  paper: 'Warm paper',
  studio: 'Dark studio',
};

function isTheme(value: unknown): value is Theme {
  return value === 'paper' || value === 'studio';
}

/** The stored preference, or null when the user has never chosen. */
export function readStoredTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** What the operating system asks for. */
export function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'studio' : 'paper';
  } catch {
    return 'paper';
  }
}

/** Stored preference if there is one, otherwise the system preference. */
export function resolveTheme(): Theme {
  return readStoredTheme() ?? systemTheme();
}

/** Paint a theme. The attribute is what the CSS variables key off. */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage may be unavailable (private mode, etc.)
  }
}
