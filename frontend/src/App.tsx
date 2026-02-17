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
import CheckFpsPage from './pages/CheckFpsPage';
import GameFpsDetailsPage from './pages/GameFpsDetailsPage';
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
          <Route path="/check-fps" element={<CheckFpsPage />} />
          <Route path="/check-fps/game/:igdbId" element={<GameFpsDetailsPage />} />
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
  const { theme, toggleTheme } = useTheme();

  const themeIcon = theme === 'dark' ? '🌙' : '☀️';

  const isLanding = location.pathname === '/' || location.pathname === '/home';
  if (isLanding) {
    return null;
  }
  const initial = (user?.userName ?? user?.email ?? '?').trim().slice(0, 1).toUpperCase();
  const isAdmin = (user?.role ?? '').toLowerCase() === 'admin';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'h-full px-3 rounded-md text-sm font-medium transition-colors inline-flex items-center',
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
          <div className="flex items-center gap-1 h-10 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_75%,transparent)] p-0.5 shadow-[0_1px_0_rgba(15,23,42,0.2)]">
            <NavLink to="/builder" className={navLinkClass} end>
              Builder
            </NavLink>
            <NavLink to="/my-builds" className={navLinkClass}>
              My Builds
            </NavLink>
            <NavLink to="/check-fps" className={navLinkClass}>
              Check FPS
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
              onClick={toggleTheme}
              className="btn btn-ghost h-10 w-10 p-0"
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              <span className="relative inline-flex items-center justify-center w-8 h-8">
                <span
                  className="absolute inset-0 rounded-md border border-[var(--border)]"
                  style={{ background: 'color-mix(in srgb, var(--surface) 70%, transparent)' }}
                  aria-hidden
                />
                <span className="relative text-base leading-none" aria-hidden>
                  {themeIcon}
                </span>
              </span>
            </button>
          </div>

          {isLoading ? (
            <div className="text-sm text-[var(--muted)]">Loading…</div>
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                title={user?.userName ?? user?.email ?? 'Profile'}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm font-semibold shadow-[0_1px_0_rgba(15,23,42,0.04)]"
              >
                {initial}
              </Link>
              <button onClick={() => void logout()} className="btn btn-secondary text-sm h-10">
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn btn-primary text-sm h-10">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-secondary text-sm h-10">
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
