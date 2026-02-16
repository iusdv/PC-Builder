import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { buildsApi } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  loadActiveBuildId,
  removeRecentBuildId,
  saveActiveBuildId,
} from '../utils/buildStorage';
import { formatEur } from '../utils/currency';
import type { Build, PartCategory } from '../types';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

export default function MyBuildsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBuildId, setSelectedBuildId] = useState<number | null>(null);
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const location = useLocation();

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

  const categorySlug = (c: PartCategory) => {
    switch (c) {
      case 'CPU':
        return 'cpu';
      case 'Motherboard':
        return 'motherboard';
      case 'RAM':
        return 'ram';
      case 'GPU':
        return 'gpu';
      case 'Storage':
        return 'storage';
      case 'PSU':
        return 'psu';
      case 'Case':
        return 'case';
      case 'Cooler':
        return 'cooler';
      case 'CaseFan':
        return 'casefan';
      default:
        return 'cpu';
    }
  };

  const renderSkeleton = () => (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] text-xs font-semibold text-[var(--muted)]">SAVED BUILDS</div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] p-3">
              <Skeleton variant="line" className="h-4 w-10/12 border-0" />
              <Skeleton variant="line" className="mt-2 h-3 w-6/12 border-0" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-6 py-5 border-b border-[var(--border)]">
          <Skeleton variant="line" className="h-5 w-7/12 border-0" />
          <Skeleton variant="line" className="mt-2 h-3 w-4/12 border-0" />
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full border-0" />
            <Skeleton className="h-16 w-full border-0" />
          </div>
          <div className="mt-6">
            <Skeleton variant="line" className="h-4 w-20 border-0" />
            <div className="mt-3 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <Skeleton className="h-20 w-20 border-0" />
                  <div className="flex-1">
                    <Skeleton variant="line" className="h-3 w-3/12 border-0" />
                    <Skeleton variant="line" className="mt-2 h-4 w-10/12 border-0" />
                    <Skeleton variant="line" className="mt-2 h-3 w-5/12 border-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderPartRow = (
    label: string,
    part:
      | {
          id: number;
          category: PartCategory;
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

    const detailsTo = `/parts/${categorySlug(part.category)}/${part.id}`;
    const returnTo = `${location.pathname}${location.search}`;

    return (
      <div className="py-3 flex gap-4 items-start border-b last:border-b-0">
        <Link
          to={detailsTo}
          state={{ returnTo }}
          title="View details"
          className="shrink-0"
        >
          <img
            src={part.imageUrl || partPlaceholderSrc}
            alt={part.name}
            className="w-20 h-20 object-contain"
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src.endsWith(partPlaceholderSrc)) return;
              img.src = partPlaceholderSrc;
            }}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--muted)]">{label.toUpperCase()}</div>
              <Link
                to={detailsTo}
                state={{ returnTo }}
                className="text-sm font-semibold text-[var(--text)]"
                title="View details"
              >
                {part.name}
              </Link>
              {part.manufacturer && <div className="text-xs text-[var(--muted)]">{part.manufacturer}</div>}
              <div className="mt-0.5 text-xs font-semibold text-[var(--text)]">{priceText(part.price)}</div>
            </div>

            {part.productUrl && (
              <a
                href={part.productUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 btn btn-primary text-sm"
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
    <PageShell
      title="My Builds"
      subtitle="Builds saved to your account."
      right={
        <Link to="/builder" className="btn btn-secondary text-sm">
          Back to builder
        </Link>
      }
    >

      {message && (
        <div className="mt-5 rounded border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)] flex items-center justify-between gap-3">
          <div>{message}</div>
          <button onClick={() => void refetch()} className="text-sm font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {isLoading && builds.length === 0 && !message && renderSkeleton()}

      {!isLoading && !message && builds.length === 0 && (
        <Card className="mt-6 p-5 text-sm text-[var(--muted)]">
          No saved builds yet. Open the builder and click “Save Build” to claim one.
        </Card>
      )}

      {!!builds.length && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] text-xs font-semibold text-[var(--muted)]">SAVED BUILDS</div>
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
                      className={`relative w-full text-left px-4 py-3 border-b border-[var(--border)] last:border-b-0 transition-colors ${
                        isSelected ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      {isSelected ? (
                        <motion.div
                          layoutId="mybuilds-selected-rail"
                          className="absolute left-0 top-0 h-full w-1 bg-[var(--primary)]"
                          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 45 }}
                        />
                      ) : null}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate text-[var(--text)]">
                            {b.name}
                          </div>
                          <div className="mt-0.5 text-xs text-[var(--muted)]">
                            {formatEur(Number(b.totalPrice ?? 0))} • {Number(b.totalWattage ?? 0)}W
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </Card>

          <Card className="overflow-hidden">
            {!selectedBuild ? (
              <div className="p-6 text-sm text-[var(--muted)]">Select a build from the list.</div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={selectedBuild.id}
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                <div className="px-6 py-5 border-b border-[var(--border)]">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xl font-semibold text-[var(--text)] truncate" title={selectedBuild.name}>
                        {selectedBuild.name}
                      </div>
                      {selectedBuild.description ? (
                        <div className="mt-2 text-sm text-[var(--muted)]">{selectedBuild.description}</div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/builder?buildId=${selectedBuild.id}`}
                        className="btn btn-primary text-sm"
                      >
                        Open in builder
                      </Link>

                      <button
                        type="button"
                        disabled={!shareUrl}
                        onClick={async () => {
                          const ok = await copyTextToClipboard(shareUrl);
                          if (ok) toast.success('Share link copied.');
                          else toast.error('Could not copy share link.');
                        }}
                        className="btn btn-secondary text-sm disabled:opacity-55"
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
                        className="btn btn-danger text-sm disabled:opacity-55"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded bg-[var(--surface)] border border-[var(--border)] px-4 py-3">
                      <div className="text-xs text-[var(--muted)]">Total Price</div>
                      <div className="text-lg font-semibold text-[var(--text)]">{formatEur(Number(selectedBuild.totalPrice ?? 0))}</div>
                    </div>
                    <div className="rounded bg-[var(--surface)] border border-[var(--border)] px-4 py-3">
                      <div className="text-xs text-[var(--muted)]">Estimated Wattage</div>
                      <div className="text-lg font-semibold text-[var(--text)]">{Number(selectedBuild.totalWattage ?? 0)}W</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-sm font-semibold text-[var(--text)]">Parts</div>
                    
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
                          <div className="text-sm text-[var(--muted)]">No parts selected.</div>
                        )}
                    </div>
                  </div>
                </div>
              </motion.div>
              </AnimatePresence>
            )}
          </Card>
        </div>
      )}
    </PageShell>
  );
}
