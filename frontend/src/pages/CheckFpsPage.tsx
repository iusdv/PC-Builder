import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { buildsApi, gamesApi } from '../api/client';
import type { Build } from '../types';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';
import { useAuth } from '../auth/AuthContext';
import { loadActiveBuildId, loadRecentBuildIds, saveActiveBuildId } from '../utils/buildStorage';
import { orderBuildsForDisplay } from '../utils/buildOrdering';
import { estimateBuildFpsFromCatalog, type FpsPresetId, type GameCatalogItem } from '../utils/fpsEstimator';
import { lookupBenchmark } from '../utils/gameBenchmarkData';

const FPS_PRESETS: Array<{ id: FpsPresetId; label: string }> = [
  { id: '1080p-high', label: '1080p High' },
  { id: '1440p-high', label: '1440p High' },
  { id: '4k-ultra', label: '4K Ultra' },
];

function fpsToneClass(fps: number): string {
  if (fps >= 120) return 'text-[var(--ok)]';
  if (fps >= 80) return 'text-[var(--accent-cyan)]';
  if (fps >= 60) return 'text-[var(--warn)]';
  return 'text-[var(--danger-text)]';
}

function fpsMeterFillColor(fps: number): string {
  if (fps >= 120) return 'var(--ok)';
  if (fps >= 80) return 'var(--accent-cyan)';
  if (fps >= 60) return 'var(--warn)';
  return 'var(--danger-text)';
}

type SelectedPartRow = {
  key: string;
  label: string;
  icon: string;
  name: string;
  imageUrl?: string;
};

type CheckFpsCardItem = {
  gameId: number;
  igdbId: number;
  name: string;
  imagePath: string;
  averageFps: number | null;
  low1PercentFps: number | null;
  bottleneck: 'cpu' | 'gpu' | 'balanced' | null;
};

export default function CheckFpsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const recentIds = useMemo(() => loadRecentBuildIds().slice(0, 10), []);
  const initialBuildId = useMemo(() => {
    const fromQuery = Number(urlSearchParams.get('buildId'));
    if (Number.isFinite(fromQuery) && fromQuery > 0) {
      return fromQuery;
    }

    return loadActiveBuildId() ?? recentIds[0];
  }, [urlSearchParams, recentIds]);
  const initialPreset = useMemo<FpsPresetId>(() => {
    const fromQuery = urlSearchParams.get('preset');
    if (fromQuery === '1080p-high' || fromQuery === '1440p-high' || fromQuery === '4k-ultra') {
      return fromQuery;
    }
    return '1080p-high';
  }, [urlSearchParams]);
  const initialSearchTerm = useMemo(() => urlSearchParams.get('search') ?? '', [urlSearchParams]);
  const initialPage = useMemo(() => {
    const raw = Number(urlSearchParams.get('page'));
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  }, [urlSearchParams]);

  const [buildId, setBuildId] = useState<number | undefined>(initialBuildId);
  const [activeBuildId, setActiveBuildId] = useState<number | undefined>(() => {
    if (typeof initialBuildId === 'number' && Number.isFinite(initialBuildId) && initialBuildId > 0) return initialBuildId;
    return undefined;
  });
  const [presetId, setPresetId] = useState<FpsPresetId>(initialPreset);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [page, setPage] = useState(initialPage);
  const pageSize = 50; // 10 rows x 5 cards on xl screens
  const catalogBatchSize = 250;
  const catalogMaxGames = 750;
  const catalogMaxPages = Math.ceil(catalogMaxGames / catalogBatchSize);

  const myBuildsQuery = useQuery({
    queryKey: ['fps-my-builds'],
    queryFn: () => buildsApi.getMyBuilds().then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 30000,
    retry: false,
  });

  const availableBuilds = useMemo(() => {
    if (!isAuthenticated) return [] as Build[];
    return orderBuildsForDisplay(myBuildsQuery.data ?? [], activeBuildId);
  }, [isAuthenticated, myBuildsQuery.data, activeBuildId]);

  const availableBuildIds = useMemo(() => new Set(availableBuilds.map((b) => b.id)), [availableBuilds]);

  const effectiveBuildId = useMemo(() => {
    if (!isAuthenticated || !buildId) return undefined;
    return availableBuildIds.has(buildId) ? buildId : undefined;
  }, [isAuthenticated, buildId, availableBuildIds]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!availableBuilds.length) return;
    if (effectiveBuildId) return;
    setBuildId(availableBuilds[0].id);
    setPage(1);
  }, [isAuthenticated, availableBuilds, effectiveBuildId]);

  useEffect(() => {
    if (!isAuthenticated || !buildId) return;
    if (!availableBuildIds.has(buildId)) return;
    if (activeBuildId === buildId) return;
    saveActiveBuildId(buildId);
    setActiveBuildId(buildId);
  }, [isAuthenticated, buildId, availableBuildIds, activeBuildId]);

  const buildQuery = useQuery({
    queryKey: ['fps-build', effectiveBuildId],
    queryFn: () => buildsApi.getBuild(effectiveBuildId!).then((r) => r.data),
    enabled: isAuthenticated && !!effectiveBuildId,
    retry: false,
  });

  const catalogQuery = useInfiniteQuery({
    queryKey: ['fps-games-catalog'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      gamesApi.getCatalog({ limit: catalogBatchSize, offset: pageParam }).then((r) =>
        r.data
          .map<GameCatalogItem>((g) => ({
            igdbId: g.igdbId,
            slug: g.slug,
            name: g.name,
            imagePath: g.imagePath,
            sourceUrl: g.sourceUrl ?? undefined,
            genres: g.genres ?? [],
            themes: g.themes ?? [],
            gameModes: g.gameModes ?? [],
            firstReleaseDate: g.firstReleaseDate ?? null,
            totalRating: g.totalRating ?? null,
            totalRatingCount: g.totalRatingCount ?? null,
          }))
          .filter((g) => !!g.igdbId && !!g.slug && !!g.name && !!g.imagePath),
      ),
    getNextPageParam: (lastPage, allPages, lastOffset) => {
      const loaded = allPages.reduce((sum, batch) => sum + batch.length, 0);
      if (lastPage.length < catalogBatchSize || loaded >= catalogMaxGames) {
        return undefined;
      }

      return lastOffset + catalogBatchSize;
    },
    staleTime: 300000,
    retry: false,
  });

  useEffect(() => {
    if (!catalogQuery.hasNextPage || catalogQuery.isFetchingNextPage) {
      return;
    }

    if ((catalogQuery.data?.pages.length ?? 0) >= catalogMaxPages) {
      return;
    }

    void catalogQuery.fetchNextPage();
  }, [
    catalogQuery.hasNextPage,
    catalogQuery.isFetchingNextPage,
    catalogQuery.data?.pages.length,
    catalogQuery.fetchNextPage,
    catalogMaxPages,
  ]);

  const catalogItems = useMemo(() => {
    const pages = catalogQuery.data?.pages ?? [];
    if (!pages.length) return [];

    const seen = new Set<number>();
    const merged: GameCatalogItem[] = [];
    for (const batch of pages) {
      for (const game of batch) {
        if (!game.igdbId || seen.has(game.igdbId)) continue;
        seen.add(game.igdbId);
        merged.push(game);
      }
    }

    const scoreForGame = (game: GameCatalogItem) => {
      const ratingCount = Math.max(0, game.totalRatingCount ?? 0);
      const rating = Math.max(0, Math.min(100, game.totalRating ?? 0));
      const date = game.firstReleaseDate ? new Date(game.firstReleaseDate) : null;
      const year = date && !Number.isNaN(date.getTime()) ? date.getUTCFullYear() : 0;
      const recencyBoost = year > 0 ? Math.max(0, year - 2000) * 1.2 : 0;
      const popularity = Math.log10(ratingCount + 1) * 140;
      return popularity + rating + recencyBoost;
    };

    return [...merged].sort((a, b) => scoreForGame(b) - scoreForGame(a));
  }, [catalogQuery.data]);

  const selectedBuild = buildQuery.data;
  const canEstimateFps = !!selectedBuild;

  const estimatesModel = useMemo(() => {
    if (!selectedBuild) return null;
    if (!catalogItems.length) return null;
    return estimateBuildFpsFromCatalog(selectedBuild, presetId, catalogItems);
  }, [selectedBuild, presetId, catalogItems]);

  const allCardItems = useMemo<CheckFpsCardItem[]>(() => {
    if (estimatesModel) {
      return estimatesModel.items.map((item) => ({
        gameId: item.gameId,
        igdbId: item.igdbId ?? item.gameId,
        name: item.name,
        imagePath: item.imagePath,
        averageFps: item.averageFps,
        low1PercentFps: item.low1PercentFps,
        bottleneck: item.bottleneck,
      }));
    }

    return catalogItems.map((game) => ({
      gameId: game.igdbId ?? 0,
      igdbId: game.igdbId ?? 0,
      name: game.name,
      imagePath: game.imagePath,
      averageFps: null,
      low1PercentFps: null,
      bottleneck: null,
    }));
  }, [estimatesModel, catalogItems]);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return allCardItems;
    return allCardItems.filter((item) => item.name.toLowerCase().includes(query));
  }, [allCardItems, searchTerm]);

  const totalCount = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage]);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (buildId && Number.isFinite(buildId) && buildId > 0) {
      nextParams.set('buildId', String(buildId));
    }
    nextParams.set('preset', presetId);
    if (searchTerm.trim()) {
      nextParams.set('search', searchTerm.trim());
    }
    nextParams.set('page', String(safePage));

    const next = nextParams.toString();
    const current = urlSearchParams.toString();
    if (next !== current) {
      setUrlSearchParams(nextParams, { replace: true });
    }
  }, [buildId, presetId, safePage, searchTerm, setUrlSearchParams, urlSearchParams]);

  const overall = useMemo(() => {
    if (!estimatesModel) return null;
    const avg = Math.round(
      estimatesModel.items.reduce((sum, game) => sum + game.averageFps, 0) / Math.max(1, estimatesModel.items.length),
    );
    const gamesAt60 = estimatesModel.items.filter((game) => game.averageFps >= 60).length;
    const gamesAt120 = estimatesModel.items.filter((game) => game.averageFps >= 120).length;
    return { avg, gamesAt60, gamesAt120 };
  }, [estimatesModel]);

  const estimateDataSummary = useMemo(() => {
    if (!selectedBuild) return 'Sign in and select a saved build to unlock FPS estimates.';
    if (!catalogItems.length) return 'Loading game data...';

    const benchmarkMatches = catalogItems.reduce((count, game) => count + (lookupBenchmark(game.slug) ? 1 : 0), 0);
    const totalGames = catalogItems.length;

    if (benchmarkMatches <= 0) {
      return `Using inferred profiles for ${totalGames.toLocaleString()} loaded games.`;
    }

    if (benchmarkMatches >= totalGames) {
      return `Using curated benchmark profiles for all ${totalGames.toLocaleString()} loaded games.`;
    }

    const coveragePercent = Math.round((benchmarkMatches / totalGames) * 100);
    return `Curated benchmarks for ${benchmarkMatches.toLocaleString()}/${totalGames.toLocaleString()} loaded games (${coveragePercent}%); the remaining titles are slightly less accurate.`;
  }, [selectedBuild, catalogItems]);

  const selectedPartRows: SelectedPartRow[] = useMemo(() => {
    if (!selectedBuild) return [];
    return [
      { key: 'cpu', label: 'CPU', icon: 'C', name: selectedBuild.cpu?.name ?? 'Missing', imageUrl: selectedBuild.cpu?.imageUrl },
      { key: 'gpu', label: 'GPU', icon: 'G', name: selectedBuild.gpu?.name ?? 'Missing', imageUrl: selectedBuild.gpu?.imageUrl },
      {
        key: 'ram',
        label: 'RAM',
        icon: 'R',
        name: selectedBuild.ram ? `${selectedBuild.ram.capacityGB}GB ${selectedBuild.ram.speedMHz}MHz` : 'Missing',
        imageUrl: selectedBuild.ram?.imageUrl,
      },
      { key: 'mb', label: 'Motherboard', icon: 'M', name: selectedBuild.motherboard?.name ?? 'Missing', imageUrl: selectedBuild.motherboard?.imageUrl },
    ];
  }, [selectedBuild]);

  return (
    <PageShell
      title="Check FPS"
      subtitle="Estimated average FPS for popular games based on your current build."
      right={
        <div className="flex items-center gap-2">
          <Link to="/builder" className="btn btn-secondary text-sm">
            Back to builder
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <Card className="p-5 h-fit xl:sticky xl:top-16 self-start xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto">
          <div className="text-sm font-semibold text-[var(--text)]">Estimator Controls</div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-[var(--muted)]">Build</div>
            {authLoading ? (
              <div className="mt-2 text-sm text-[var(--muted)]">Checking session...</div>
            ) : !isAuthenticated ? (
              <div className="mt-2 text-sm text-[var(--muted)]">
                Sign in to load your saved builds.
              </div>
            ) : myBuildsQuery.isLoading ? (
              <div className="mt-2 text-sm text-[var(--muted)]">Loading your saved builds...</div>
            ) : availableBuilds.length > 0 ? (
              <select
                className="mt-2 w-full app-input px-3 py-2 text-sm"
                value={effectiveBuildId ?? ''}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next) || next <= 0) return;
                  saveActiveBuildId(next);
                  setActiveBuildId(next);
                  setBuildId(next);
                  setPage(1);
                }}
              >
                {availableBuilds.map((build) => (
                  <option key={build.id} value={build.id}>
                    #{build.id} - {build.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-2 text-sm text-[var(--muted)]">No saved builds found.</div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-[var(--muted)]">Resolution Preset</div>
            <select
              className="mt-2 w-full app-input px-3 py-2 text-sm"
              value={presetId}
              onChange={(event) => {
                setPresetId(event.target.value as FpsPresetId);
                setPage(1);
              }}
            >
              {FPS_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {!!selectedBuild && (
            <div className="mt-5 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[var(--muted)]">Selected Build</div>
                <Link to="/builder" className="btn btn-secondary text-[11px] px-2 py-1">
                  Edit
                </Link>
              </div>
              <div className="mt-2 text-sm text-[var(--text)]">{selectedBuild.name}</div>
              <div className="mt-3 space-y-2">
                {selectedPartRows.map((part) => (
                  <div key={part.key} className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                    <div className="w-8 h-8 rounded overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] shrink-0 flex items-center justify-center">
                      {part.imageUrl ? (
                        <img
                          src={part.imageUrl}
                          alt={part.label}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-xs font-semibold text-[var(--muted)]">{part.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide">{part.label}</div>
                      <div className="text-xs text-[var(--text)] truncate" title={part.name}>
                        {part.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">Estimated Performance</div>
                <div className="text-xs text-[var(--muted)]">{estimateDataSummary}</div>
              </div>
              <input
                className="app-input px-3 py-2 text-sm w-full sm:w-[320px]"
                placeholder="Search games..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            {buildQuery.isLoading && <div className="mt-4 text-sm text-[var(--muted)]">Loading build...</div>}
            {catalogQuery.isLoading && <div className="mt-4 text-sm text-[var(--muted)]">Loading games catalog...</div>}
            {!catalogQuery.isLoading && (catalogQuery.isFetchingNextPage || catalogQuery.hasNextPage) && (
              <div className="mt-4 text-sm text-[var(--muted)]">
                Loading more games... {catalogItems.length.toLocaleString()} loaded
              </div>
            )}

            {!catalogQuery.isLoading && !catalogItems.length && (
              <div className="mt-4 rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
                No IGDB games returned. Verify backend IGDB credentials and try again.
              </div>
            )}

            {overall && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-xs text-[var(--muted)]">Average FPS</div>
                  <div className={`text-xl font-semibold ${fpsToneClass(overall.avg)}`}>{overall.avg}</div>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-xs text-[var(--muted)]">Games &gt;= 60 FPS</div>
                  <div className="text-xl font-semibold text-[var(--text)]">{overall.gamesAt60}</div>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-xs text-[var(--muted)]">Games &gt;= 120 FPS</div>
                  <div className="text-xl font-semibold text-[var(--text)]">{overall.gamesAt120}</div>
                </div>
              </div>
            )}

            {!canEstimateFps && (
              <div className="mt-4 rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
                Sign in and select a saved build to unlock FPS estimates.
              </div>
            )}
          </Card>

          {pageItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {pageItems.map((game) => {
                const hasEstimate = typeof game.averageFps === 'number' && typeof game.low1PercentFps === 'number';
                const meter = hasEstimate ? Math.max(0, Math.min(100, Math.round((game.averageFps! / 180) * 100))) : 0;
                const backParams = new URLSearchParams();
                if (buildId && Number.isFinite(buildId) && buildId > 0) {
                  backParams.set('buildId', String(buildId));
                }
                backParams.set('preset', presetId);
                if (searchTerm.trim()) {
                  backParams.set('search', searchTerm.trim());
                }
                backParams.set('page', String(safePage));
                const backTo = `/check-fps?${backParams.toString()}`;

                const detailHref = game.igdbId
                  ? `/check-fps/game/${game.igdbId}?buildId=${buildId ?? ''}&preset=${presetId}&backTo=${encodeURIComponent(backTo)}`
                  : undefined;

                return (
                  <Card key={game.gameId} className="overflow-hidden transition">
                    {detailHref ? (
                      <Link to={detailHref} className="block w-full text-left">
                        <img
                          src={game.imagePath}
                          alt={game.name}
                          className="w-full aspect-[3/4] object-cover"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="p-3">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-[var(--text)] min-h-[2.6rem] overflow-hidden" title={game.name}>
                              {game.name}
                            </div>
                            {hasEstimate ? (
                              <div className={`text-base font-semibold ${fpsToneClass(game.averageFps!)}`}>{game.averageFps} FPS</div>
                            ) : (
                              <div className="text-xs font-semibold text-[var(--muted)]">FPS unavailable</div>
                            )}
                          </div>

                          {hasEstimate ? (
                            <>
                              <div className="mt-3 h-2 rounded-full bg-[var(--meter-track)] overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${meter}%`,
                                    background: fpsMeterFillColor(game.averageFps!),
                                  }}
                                />
                              </div>

                              <div className="mt-2 text-[11px] text-[var(--muted)]">1% low: {game.low1PercentFps}</div>
                              <div className="text-[11px] text-[var(--muted)]">
                                {game.bottleneck === 'cpu' ? 'CPU bound' : game.bottleneck === 'gpu' ? 'GPU bound' : 'Balanced'}
                              </div>
                            </>
                          ) : (
                            <div className="mt-2 text-[11px] text-[var(--muted)]">Sign in and pick a saved build to estimate FPS.</div>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="p-3 text-sm text-[var(--muted)]">Missing game id</div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {!catalogQuery.isLoading && totalCount === 0 && (
            <Card className="p-4">
              <div className="text-sm text-[var(--muted)]">No games match your search.</div>
            </Card>
          )}

          {totalCount > pageSize && (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-[var(--muted)]">
                  Showing {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, totalCount)} of {totalCount}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn btn-secondary text-sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </button>
                  <button type="button" className="btn btn-secondary text-sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
