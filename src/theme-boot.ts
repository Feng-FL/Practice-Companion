// Theme bootstrap. Loaded as a module script before main.tsx (module scripts
// execute in document order), so the correct colorway is applied to <html>
// before React renders the app and no flash of the wrong theme is visible.
//
// The storage key and the 'paper' / 'studio' values match src/lib/theme.ts.

import { applyTheme, resolveTheme } from './lib/theme';

applyTheme(resolveTheme());
