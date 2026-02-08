import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

type Rgb = { r: number; g: number; b: number };

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;

  accentRgb: Rgb;
  setAccentRgb: (rgb: Rgb) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'pcpp-theme';
const ACCENT_KEY = 'pcpp-accent-rgb';

const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyThemeToDocument = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
};

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

const adjustRgb = (rgb: Rgb, factor: number): Rgb => {
  return {
    r: clampByte(rgb.r * factor),
    g: clampByte(rgb.g * factor),
    b: clampByte(rgb.b * factor),
  };
};

const rgbCss = (rgb: Rgb) => `rgb(${clampByte(rgb.r)} ${clampByte(rgb.g)} ${clampByte(rgb.b)})`;
const rgbaCss = (rgb: Rgb, a: number) => `rgba(${clampByte(rgb.r)}, ${clampByte(rgb.g)}, ${clampByte(rgb.b)}, ${a})`;

const applyAccentToDocument = (theme: Theme, accent: Rgb) => {
  if (typeof document === 'undefined') return;

  // Only touches accent variables used across buttons/rings.
  const primary = accent;
  const primary2 = theme === 'dark' ? adjustRgb(accent, 0.9) : adjustRgb(accent, 0.85);
  document.documentElement.style.setProperty('--primary', rgbCss(primary));
  document.documentElement.style.setProperty('--primary-2', rgbCss(primary2));
  document.documentElement.style.setProperty('--ring', rgbaCss(primary, theme === 'dark' ? 0.28 : 0.24));
};

const loadInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return getSystemTheme();
};

const loadInitialAccent = (): Rgb => {
  // Default matches current :root --primary (#7c3aed)
  const fallback: Rgb = { r: 124, g: 58, b: 237 };
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(ACCENT_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Rgb>;
    const r = Number(parsed.r);
    const g = Number(parsed.g);
    const b = Number(parsed.b);
    if (![r, g, b].every((x) => Number.isFinite(x))) return fallback;
    return { r: clampByte(r), g: clampByte(g), b: clampByte(b) };
  } catch {
    return fallback;
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => loadInitialTheme());
  const [accentRgb, setAccentRgbState] = useState<Rgb>(() => loadInitialAccent());

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      applyThemeToDocument(next);
      applyAccentToDocument(next, accentRgb);
    },
    [accentRgb],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  useEffect(() => {
    applyThemeToDocument(theme);
    applyAccentToDocument(theme, accentRgb);
  }, [theme, accentRgb]);

  const setAccentRgb = useCallback(
    (next: Rgb) => {
      const clamped = { r: clampByte(next.r), g: clampByte(next.g), b: clampByte(next.b) };
      setAccentRgbState(clamped);
      try {
        window.localStorage.setItem(ACCENT_KEY, JSON.stringify(clamped));
      } catch {
        // ignore
      }
      applyAccentToDocument(theme, clamped);
    },
    [theme],
  );

  // If no saved theme, follow OS changes.
  useEffect(() => {
    let mql: MediaQueryList | null = null;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return;

      if (!window.matchMedia) return;
      mql = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => setThemeState(mql!.matches ? 'dark' : 'light');
      if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
      else (mql as any).addListener(onChange);

      return () => {
        if (!mql) return;
        if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange);
        else (mql as any).removeListener(onChange);
      };
    } catch {
      return;
    }
  }, []);

  // Cross-tab sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue === 'light' || e.newValue === 'dark') {
        setThemeState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== ACCENT_KEY) return;
      if (!e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as Partial<Rgb>;
        const r = Number(parsed.r);
        const g = Number(parsed.g);
        const b = Number(parsed.b);
        if (![r, g, b].every((x) => Number.isFinite(x))) return;
        setAccentRgbState({ r: clampByte(r), g: clampByte(g), b: clampByte(b) });
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme, setTheme, accentRgb, setAccentRgb }),
    [theme, toggleTheme, setTheme, accentRgb, setAccentRgb],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
