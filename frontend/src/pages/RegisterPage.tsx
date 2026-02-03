import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();

  const returnTo = searchParams.get('returnTo') || '/';

  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(email, password, userName || undefined);
      navigate(returnTo);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Registration failed.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto px-6 py-10 max-w-md">
      <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
      <p className="mt-1 text-sm text-gray-600">Create an account to save builds later.</p>

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
          <label className="block text-sm font-medium text-gray-700">Username (optional)</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#37b48f]"
            autoComplete="username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#37b48f]"
            autoComplete="new-password"
            required
          />
          <p className="mt-1 text-xs text-gray-500">Minimum 8 chars, upper/lowercase + digit.</p>
        </div>

        {error && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-black disabled:opacity-60"
        >
          {isSubmitting ? 'Creating…' : 'Create account'}
        </button>

        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-[#37b48f] hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
