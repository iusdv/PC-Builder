import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BuilderPage from './pages/BuilderPage';
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

const queryClient = new QueryClient();

function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const initial = (user?.userName ?? user?.email ?? '?').trim().slice(0, 1).toUpperCase();
  const isAdmin = (user?.role ?? '').toLowerCase() === 'admin';

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <nav className="bg-white border-b">
          <div className="container mx-auto px-6 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-[#37b48f]/15 border border-[#37b48f]/40 text-[#37b48f]">
                <span className="text-sm">🖥</span>
              </span>
              PC Builder
            </Link>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link to="/admin/parts" className="text-sm text-gray-600 hover:text-gray-900">
                  Parts Admin
                </Link>
              )}
              {isLoading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Link to="/my-builds" className="text-sm text-gray-600 hover:text-gray-900">
                    My Builds
                  </Link>
                  <Link
                    to="/profile"
                    title={user?.userName ?? user?.email ?? 'Profile'}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-900 text-white text-sm font-semibold"
                  >
                    {initial}
                  </Link>
                  <button
                    onClick={() => void logout()}
                    className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-black"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-black">
                    Sign In
                  </Link>
                  <Link to="/register" className="text-sm text-gray-600 hover:text-gray-900">
                    Create account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<BuilderPage />} />
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
      </Router>
    </QueryClientProvider>
  );
}

export default App;
