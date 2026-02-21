import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

type RegisterErrorPayload = {
  message?: string;
  errors?: Array<{ code?: string; description?: string }>;
};

function extractRegisterErrors(err: any): string[] {
  const payload = (err?.response?.data ?? null) as RegisterErrorPayload | null;
  if (!payload) return ['Registration failed.'];

  const detailed = Array.isArray(payload.errors)
    ? payload.errors
        .map((e) => (e?.description ?? '').trim())
        .filter((msg) => msg.length > 0)
    : [];

  if (detailed.length > 0) return detailed;
  if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return [payload.message.trim()];
  }
  return ['Registration failed.'];
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();

  const returnToRaw = searchParams.get('returnTo');
  const returnTo =
    returnToRaw && returnToRaw.startsWith('/') && returnToRaw !== '/' && returnToRaw !== '/home'
      ? returnToRaw
      : '/builder';

  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setIsSubmitting(true);

    try {
      await register(email, password, userName || undefined);
      navigate(returnTo);
    } catch (err: any) {
      setErrors(extractRegisterErrors(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell title="Create account" subtitle="Create an account to save builds later.">
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
              <label className="block text-sm font-medium text-[var(--muted)]">Username (optional)</label>
              <Input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="mt-1 w-full"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--muted)]">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full"
                autoComplete="new-password"
                required
              />
              <p className="mt-1 text-xs text-[var(--muted-2)]">Minimum 8 chars, upper/lowercase + digit.</p>
            </div>

            {errors.length > 0 && (
              <div className="rounded border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]">
                {errors.length === 1 ? (
                  <span>{errors[0]}</span>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {errors.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Creating…' : 'Create account'}
            </Button>

            <p className="text-sm text-[var(--muted)]">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--primary)] hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}
