import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { buildsApi } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { formatEur } from '../utils/currency';

export default function MyBuildsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-builds'],
    queryFn: async () => {
      const res = await buildsApi.getMyBuilds();
      return res.data;
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const message = useMemo(() => {
    if (!error) return null;
    if (!axios.isAxiosError(error)) return 'Failed to load your builds.';
    return (error.response?.data as any)?.message ?? 'Failed to load your builds.';
  }, [error]);

  if (!authLoading && !isAuthenticated) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent('/my-builds')}`} replace />;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Builds</h1>
          <p className="mt-1 text-sm text-gray-600">Builds saved to your account.</p>
        </div>
        <Link to="/" className="border rounded px-4 py-2 text-sm font-semibold hover:bg-gray-50">
          Back to builder
        </Link>
      </div>

      {message && (
        <div className="mt-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center justify-between gap-3">
          <div>{message}</div>
          <button onClick={() => void refetch()} className="text-sm font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {isLoading && <div className="mt-6 text-sm text-gray-600">Loading…</div>}

      {!isLoading && !message && (!data || data.length === 0) && (
        <div className="mt-6 rounded border bg-white p-5 text-sm text-gray-700">
          No saved builds yet. Open the builder and click “Save Build” to claim one.
        </div>
      )}

      {!!data?.length && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((b) => {
            const shareUrl = b.shareCode ? `${window.location.origin}/share/${b.shareCode}` : '';
            return (
              <div key={b.id} className="rounded border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{b.name}</div>
                    <div className="mt-1 text-xs text-gray-500">Build #{b.id}</div>
                  </div>
                  <Link
                    to={`/?buildId=${b.id}`}
                    className="bg-[#37b48f] text-white text-sm font-semibold px-3 py-2 rounded hover:bg-[#2ea37f]"
                  >
                    Open
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded bg-gray-50 border px-3 py-2">
                    <div className="text-[11px] text-gray-500">Total Price</div>
                    <div className="text-sm font-semibold text-gray-900">{formatEur(Number(b.totalPrice ?? 0))}</div>
                  </div>
                  <div className="rounded bg-gray-50 border px-3 py-2">
                    <div className="text-[11px] text-gray-500">Wattage</div>
                    <div className="text-sm font-semibold text-gray-900">{Number(b.totalWattage ?? 0)}W</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!shareUrl}
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                    className="border rounded px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:text-gray-400"
                  >
                    Copy share link
                  </button>
                  {shareUrl && (
                    <Link
                      to={`/share/${b.shareCode}`}
                      className="border rounded px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
