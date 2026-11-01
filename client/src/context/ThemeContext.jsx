import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// 'system' follows the device; index.html applies the saved choice before first paint
const STORAGE_KEY = 'codelings_theme';
const lightQuery = window.matchMedia('(prefers-color-scheme: light)');
const META_COLORS = { light: '#EEF1FF', dark: '#070A1A' };

const ThemeContext = createContext(null);

const resolve = (preference) => (preference === 'system' ? (lightQuery.matches ? 'light' : 'dark') : preference);

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => localStorage.getItem(STORAGE_KEY) ?? 'system');
  const [resolved, setResolved] = useState(() => resolve(preference));

  // Only save when the user picks, so loading the app never overwrites a saved choice
  const setPreference = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, next);
    setPreferenceState(next);
  }, []);

  // Keep other open tabs in sync
  useEffect(() => {
    const onStorage = (e) => e.key === STORAGE_KEY && setPreferenceState(e.newValue ?? 'system');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const apply = () => {
      const theme = resolve(preference);
      document.documentElement.classList.toggle('light', theme === 'light');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[theme]);
      setResolved(theme);
    };
    apply();
    if (preference !== 'system') return;
    lightQuery.addEventListener('change', apply);
    return () => lightQuery.removeEventListener('change', apply);
  }, [preference]);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
