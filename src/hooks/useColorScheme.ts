import { useCallback, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'alignment-studio-theme';

function storedPreference(): ThemeMode | null {
  try {
    const value = typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch { return null; }
}
function systemPreference(): ThemeMode {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useColorScheme = () => {
  const [preference, setPreference] = useState<ThemeMode | null>(storedPreference);
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(systemPreference);
  const theme = preference ?? systemTheme;

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.setProperty('color-scheme', theme);
    root.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: ThemeMode) => {
    setPreference(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); }
    catch { /* The current session still respects the user's choice. */ }
  }, []);
  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [setTheme, theme]);
  return useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
};
