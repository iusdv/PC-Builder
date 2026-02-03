import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const returnTo = searchParams.get('returnTo') || '/';

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
    <div className="container mx-auto px-6 py-10 max-w-md">
      <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
      <p className="mt-1 text-sm text-gray-600">Use your account to continue.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#37b48f]"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#37b48f]"
            autoComplete="current-password"
            required
          />
        </div>

        {error && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-black disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-sm text-gray-600">
          No account?{' '}
          <Link to="/register" className="text-[#37b48f] hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
