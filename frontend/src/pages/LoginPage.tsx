import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const returnToRaw = searchParams.get('returnTo');
  const returnTo =
    returnToRaw && returnToRaw.startsWith('/') && returnToRaw !== '/' && returnToRaw !== '/home'
      ? returnToRaw
      : '/builder';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(returnTo);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell title="Sign in" subtitle="Use your account to continue.">
      <div className="max-w-md mx-auto">
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted)]">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--muted)]">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>

            <p className="text-sm text-[var(--muted)]">
              No account?{' '}
              <Link to="/register" className="text-[var(--primary)] hover:underline">
                Create one
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}
