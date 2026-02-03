import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent('/profile')}`} replace />;
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-600">Your account details.</p>
        </div>
      </div>

      <div className="mt-6 rounded border bg-white p-5">
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
  );
}
