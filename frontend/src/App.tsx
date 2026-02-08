import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import BuilderPage from './pages/BuilderPage';
import LandingPage from './pages/LandingPage';
import SharePage from './pages/SharePage';
import PartsAdminPage from './pages/PartsAdminPage';
import PartFormPage from './pages/PartFormPage';
import SelectPartPage from './pages/SelectPartPage';
import PartDetailsPage from './pages/PartDetailsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyBuildsPage from './pages/MyBuildsPage';
import ProfilePage from './pages/ProfilePage';
import { useAuth } from './auth/AuthContext';
import RequireAdmin from './auth/RequireAdmin';
import PageTransition from './components/ui/PageTransition';
import { useTheme } from './theme/ThemeProvider';

const queryClient = new QueryClient();

function AnimatedRouteView() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/builder" element={<BuilderPage />} />
          <Route path="/my-builds" element={<MyBuildsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/select/:category" element={<SelectPartPage />} />
          <Route path="/parts/:category/:id" element={<PartDetailsPage />} />
          <Route path="/share/:shareCode" element={<SharePage />} />
          <Route path="/admin" element={<RequireAdmin><Navigate to="/admin/parts" replace /></RequireAdmin>} />
          <Route path="/admin/parts" element={<RequireAdmin><PartsAdminPage /></RequireAdmin>} />
          <Route path="/admin/parts/new" element={<RequireAdmin><PartFormPage /></RequireAdmin>} />
          <Route path="/admin/parts/:category/:id/edit" element={<RequireAdmin><PartFormPage /></RequireAdmin>} />
        </Routes>
      </PageTransition>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppHeader />
        <AnimatedRouteView />
      </Router>
    </QueryClientProvider>
  );
}

function AppHeader() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const { theme, toggleTheme, accentRgb, setAccentRgb } = useTheme();
  const [showThemePanel, setShowThemePanel] = useState(false);

  const themePanelRef = useRef<HTMLDivElement | null>(null);
  const themeButtonRef = useRef<HTMLButtonElement | null>(null);

  const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

  const rgbToHex = (rgb: { r: number; g: number; b: number }) =>
    `#${[rgb.r, rgb.g, rgb.b]
      .map((x) => clampByte(x).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`;

  const parseHexToRgb = (raw: string): { r: number; g: number; b: number } | null => {
    const s = raw.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(s)) {
      const r = parseInt(s[0] + s[0], 16);
      const g = parseInt(s[1] + s[1], 16);
      const b = parseInt(s[2] + s[2], 16);
      return { r, g, b };
    }
    if (/^[0-9a-fA-F]{6}$/.test(s)) {
      const r = parseInt(s.slice(0, 2), 16);
      const g = parseInt(s.slice(2, 4), 16);
      const b = parseInt(s.slice(4, 6), 16);
      return { r, g, b };
    }   
    return null;
  };

  const accentHex = useMemo(() => rgbToHex(accentRgb), [accentRgb]);

  useEffect(() => {
    if (!showThemePanel) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const panel = themePanelRef.current;
      const button = themeButtonRef.current;
      const clickedInside = (panel && panel.contains(target)) || (button && button.contains(target));
      if (!clickedInside) setShowThemePanel(false);
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, [showThemePanel]);

  const accentPreview = `rgb(${accentRgb.r} ${accentRgb.g} ${accentRgb.b})`;

  const themeIcon = theme === 'dark' ? '🌙' : '☀️';

  const isLanding = location.pathname === '/' || location.pathname === '/home';
  if (isLanding) {
    return null;
  }
  const initial = (user?.userName ?? user?.email ?? '?').trim().slice(0, 1).toUpperCase();
  const isAdmin = (user?.role ?? '').toLowerCase() === 'admin';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
      isActive
        ? 'bg-[var(--surface-2)] text-[var(--text)] shadow-[inset_0_0_0_1px_var(--border)]'
        : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--surface-2)_75%,transparent)]',
    ].join(' ');

  return (
    <nav className="app-header sticky top-0 z-40">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <Link
          to="/builder"
          className="flex items-center gap-2 font-semibold text-[var(--text)]"
        >
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-xl border"
            style={{
              borderColor: 'color-mix(in srgb, var(--primary) 40%, var(--border))',
              background: 'color-mix(in srgb, var(--primary) 14%, var(--surface))',
              color: 'var(--primary)',
            }}
          >
            <span className="text-sm">🖥</span>
          </span>
          PC Builder
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_75%,transparent)] p-1 shadow-[0_1px_0_rgba(15,23,42,0.2)]">
            <NavLink to="/builder" className={navLinkClass} end>
              Builder
            </NavLink>
            <NavLink to="/my-builds" className={navLinkClass}>
              My Builds
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin/parts" className={navLinkClass}>
                Admin
              </NavLink>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowThemePanel((v: boolean) => !v)}
              className="btn btn-ghost p-2"
              title={theme === 'dark' ? 'Theme (dark)' : 'Theme (light)'}
              aria-label="Theme"
              ref={themeButtonRef}
            >
              <span className="relative inline-flex items-center justify-center w-8 h-8">
                <span
                  className="absolute inset-0 rounded-full border border-[var(--border)]"
                  style={{ background: 'color-mix(in srgb, var(--surface) 70%, transparent)' }}
                  aria-hidden
                />
                <span className="relative text-base leading-none" aria-hidden>
                  {themeIcon}
                </span>
              </span>
            </button>

            {showThemePanel && (
              <div
                className="absolute right-0 mt-2 w-72 app-card p-3"
                role="dialog"
                aria-label="Theme controls"
                ref={themePanelRef}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[var(--muted)]">THEME</div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-[var(--text)]">Mode</div>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="btn btn-secondary text-sm px-3 py-2"
                    title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  >
                    <span className="mr-2" aria-hidden>
                      {themeIcon}
                    </span>
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-xs text-[var(--muted)]">Pick color</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentHex}
                      onChange={(e) => {
                        const parsed = parseHexToRgb(e.target.value);
                        if (parsed) setAccentRgb(parsed);
                      }}
                      aria-label="Accent color picker"
                      className="h-8 w-10 rounded-md border border-[var(--border)] bg-transparent p-0"
                      style={{ color: 'transparent' }}
                    />
                    <div className="text-xs font-semibold text-[var(--text)] tabular-nums">{accentHex}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="text-xs text-[var(--muted)]">Preview</div>
                  <div
                    className="h-2 flex-1 rounded-full"
                    style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${accentPreview} 20%, transparent), ${accentPreview})` }}
                  />
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-sm text-[var(--muted)]">Loading…</div>
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                title={user?.userName ?? user?.email ?? 'Profile'}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm font-semibold shadow-[0_1px_0_rgba(15,23,42,0.04)]"
              >
                {initial}
              </Link>
              <button onClick={() => void logout()} className="btn btn-secondary text-sm">
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn btn-primary text-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-secondary text-sm">
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default App;
