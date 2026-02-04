import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { buildsApi } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { loadActiveBuildId, removeRecentBuildId, saveActiveBuildId } from '../utils/buildStorage';
import { formatEur } from '../utils/currency';
import type { Build } from '../types';

export default function MyBuildsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBuildId, setSelectedBuildId] = useState<number | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const partPlaceholderSrc = '/placeholder-part.svg';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-builds'],
    queryFn: async () => {
      const res = await buildsApi.getMyBuilds();
      return res.data;
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const deleteBuildMutation = useMutation({
    mutationFn: (id: number) => buildsApi.deleteBuild(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-builds'] });
    },
  });

  const message = useMemo(() => {
    if (!error) return null;
    if (!axios.isAxiosError(error)) return 'Failed to load your builds.';
    return (error.response?.data as any)?.message ?? 'Failed to load your builds.';
  }, [error]);

  const builds = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    if (!builds.length) {
      setSelectedBuildId(null);
      return;
    }

    setSelectedBuildId((prev) => {
      if (prev && builds.some((b) => b.id === prev)) return prev;
      return builds[0].id;
    });
  }, [builds]);

  const selectedBuild = useMemo(() => {
    if (!selectedBuildId) return null;
    return builds.find((b) => b.id === selectedBuildId) ?? null;
  }, [builds, selectedBuildId]);

  const shareUrl = useMemo(() => {
    if (!selectedBuild?.shareCode) return '';
    return `${window.location.origin}/share/${selectedBuild.shareCode}`;
  }, [selectedBuild?.shareCode]);

  const copyTextToClipboard = async (text: string) => {
    if (!text) return false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall back below.
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const priceText = (value: number | null | undefined) => (value == null ? '—' : formatEur(value));

  const renderPartRow = (
    label: string,
    part:
      | {
          name: string;
          manufacturer?: string;
          price?: number | null;
          imageUrl?: string;
          productUrl?: string;
        }
      | null
      | undefined,
  ) => {
    if (!part) return null;

    return (
      <div className="py-3 flex gap-4 items-start border-b last:border-b-0">
        <img
          src={part.imageUrl || partPlaceholderSrc}
          alt={part.name}
          className="w-12 h-12 object-contain"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.endsWith(partPlaceholderSrc)) return;
            img.src = partPlaceholderSrc;
          }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-500">{label.toUpperCase()}</div>
              <div className="text-sm font-semibold text-gray-900 truncate" title={part.name}>
                {part.name}
              </div>
              {part.manufacturer && <div className="text-xs text-gray-500">{part.manufacturer}</div>}
              <div className="mt-0.5 text-xs font-semibold text-gray-900">{priceText(part.price)}</div>
            </div>

            {part.productUrl && (
              <a
                href={part.productUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 bg-[#37b48f] text-white text-sm font-semibold px-4 py-2 rounded hover:bg-[#2ea37f]"
              >
                Buy
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!authLoading && !isAuthenticated) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent('/my-builds')}`} replace />;
  }

  return (
    <div className="min-h-screen bg-[#f4f4f3]">
      <div className="bg-[#545578]">
        <div className="container mx-auto px-6 py-6 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">My Builds</h1>
              <p className="mt-1 text-sm text-white/70">Builds saved to your account.</p>
            </div>
            <Link
              to="/"
              className="border border-white/30 bg-white text-gray-900 rounded px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Back to builder
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">

      {message && (
        <div className="mt-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center justify-between gap-3">
          <div>{message}</div>
          <button onClick={() => void refetch()} className="text-sm font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {isLoading && <div className="mt-6 text-sm text-gray-600">Loading…</div>}

      {!isLoading && !message && builds.length === 0 && (
        <div className="mt-6 rounded border bg-white p-5 text-sm text-gray-700">
          No saved builds yet. Open the builder and click “Save Build” to claim one.
        </div>
      )}

      {!!builds.length && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b text-xs font-semibold text-gray-500">SAVED BUILDS</div>
            <div className="max-h-[70vh] overflow-auto">
              {builds
                .slice()
                .sort((a: Build, b: Build) => b.id - a.id)
                .map((b: Build) => {
                  const isSelected = b.id === selectedBuildId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBuildId(b.id)}
                      className={`w-full text-left px-4 py-3 border-b last:border-b-0 ${
                        isSelected ? 'bg-[#0f172a] text-white hover:bg-[#111c33]' : 'text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                            {b.name}
                          </div>
                          <div className={`mt-0.5 text-xs ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                            {formatEur(Number(b.totalPrice ?? 0))} • {Number(b.totalWattage ?? 0)}W
                          </div>
                        </div>
                        <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>#{b.id}</div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            {!selectedBuild ? (
              <div className="p-6 text-sm text-gray-700">Select a build from the list.</div>
            ) : (
              <div>
                <div className="px-6 py-5 border-b">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xl font-semibold text-gray-900 truncate" title={selectedBuild.name}>
                        {selectedBuild.name}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">Build #{selectedBuild.id}</div>
                      {selectedBuild.description ? (
                        <div className="mt-2 text-sm text-gray-600">{selectedBuild.description}</div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/?buildId=${selectedBuild.id}`}
                        className="bg-[#37b48f] text-white text-sm font-semibold px-4 py-2 rounded hover:bg-[#2ea37f]"
                      >
                        Open in builder
                      </Link>

                      <button
                        type="button"
                        disabled={!shareUrl}
                        onClick={async () => {
                          const ok = await copyTextToClipboard(shareUrl);
                          setShareNotice(ok ? 'Share link copied.' : 'Could not copy share link.');
                          window.setTimeout(() => setShareNotice(null), 2500);
                        }}
                        className="border rounded px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:text-gray-400"
                      >
                        Share
                      </button>

                      <button
                        type="button"
                        disabled={deleteBuildMutation.isPending}
                        onClick={() => {
                          const ok = window.confirm('Delete this build? This cannot be undone.');
                          if (!ok) return;

                          const active = loadActiveBuildId();
                          if (active === selectedBuild.id) {
                            saveActiveBuildId(undefined);
                          }
                          removeRecentBuildId(selectedBuild.id);

                          deleteBuildMutation.mutate(selectedBuild.id);
                        }}
                        className="border rounded px-4 py-2 text-sm font-semibold hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:text-gray-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {shareNotice && <div className="mt-2 text-xs text-gray-600">{shareNotice}</div>}
                </div>

                <div className="px-6 py-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded bg-gray-50 border px-4 py-3">
                      <div className="text-xs text-gray-500">Total Price</div>
                      <div className="text-lg font-semibold text-gray-900">{formatEur(Number(selectedBuild.totalPrice ?? 0))}</div>
                    </div>
                    <div className="rounded bg-gray-50 border px-4 py-3">
                      <div className="text-xs text-gray-500">Estimated Wattage</div>
                      <div className="text-lg font-semibold text-gray-900">{Number(selectedBuild.totalWattage ?? 0)}W</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-sm font-semibold text-gray-900">Parts</div>
                    <div className="mt-2">
                      {renderPartRow('CPU', selectedBuild.cpu)}
                      {renderPartRow('CPU Cooler', selectedBuild.cooler)}
                      {renderPartRow('Motherboard', selectedBuild.motherboard)}
                      {renderPartRow('RAM', selectedBuild.ram)}
                      {renderPartRow('GPU', selectedBuild.gpu)}
                      {renderPartRow('Storage', selectedBuild.storage)}
                      {renderPartRow('Power Supply', selectedBuild.psu)}
                      {renderPartRow('Case', selectedBuild.case)}
                      {renderPartRow('Case Fan', selectedBuild.caseFan)}
                      {!selectedBuild.cpu &&
                        !selectedBuild.cooler &&
                        !selectedBuild.motherboard &&
                        !selectedBuild.ram &&
                        !selectedBuild.gpu &&
                        !selectedBuild.storage &&
                        !selectedBuild.psu &&
                        !selectedBuild.case &&
                        !selectedBuild.caseFan && (
                          <div className="text-sm text-gray-600">No parts selected.</div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
