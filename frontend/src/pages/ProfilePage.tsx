import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent('/profile')}`} replace />;
  }

  return (
    <div className="min-h-screen bg-[#f4f4f3]">
      <div className="bg-[#545578]">
        <div className="container mx-auto px-6 py-6 text-white">
          <h1 className="text-2xl font-semibold text-white">Profile</h1>
          <p className="mt-1 text-sm text-white/70">Your account details.</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 max-w-2xl">
        <div className="rounded border bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Username</div>
              <div className="text-sm font-semibold text-gray-900">{user?.userName ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Email</div>
              <div className="text-sm font-semibold text-gray-900">{user?.email ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Role</div>
              <div className="text-sm font-semibold text-gray-900">{user?.role ?? 'user'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">User Id</div>
              <div className="text-sm font-mono text-gray-900 break-all">{user?.id ?? '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
