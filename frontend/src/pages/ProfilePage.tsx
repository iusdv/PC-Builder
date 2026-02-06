import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent('/profile')}`} replace />;
  }

  return (
    <PageShell title="Profile" subtitle="Your account details.">
      <div className="max-w-2xl">
        <Card className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[var(--muted)]">Username</div>
              <div className="text-sm font-semibold text-[var(--text)]">{user?.userName ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">Email</div>
              <div className="text-sm font-semibold text-[var(--text)]">{user?.email ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">Role</div>
              <div className="text-sm font-semibold text-[var(--text)]">{user?.role ?? 'user'}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">User Id</div>
              <div className="text-sm font-mono text-[var(--text)] break-all">{user?.id ?? '—'}</div>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
