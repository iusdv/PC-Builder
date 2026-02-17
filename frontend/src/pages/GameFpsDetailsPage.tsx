import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { buildsApi, gamesApi } from '../api/client';
import type { Build } from '../types';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';
import { useAuth } from '../auth/AuthContext';
import { loadActiveBuildId, loadRecentBuildIds } from '../utils/buildStorage';
import { estimateGameInsights, type FpsPresetId, type GameCatalogItem } from '../utils/fpsEstimator';

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

function resolutionForPreset(preset: FpsPresetId): '1080p' | '1440p' | '4k' {
  if (preset === '1440p-high') return '1440p';
  if (preset === '4k-ultra') return '4k';
  return '1080p';
}

type SelectedPartRow = {
  key: string;
  label: string;
  icon: string;
  name: string;
  imageUrl?: string;
};

export default function GameFpsDetailsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { igdbId } = useParams();
  const gameId = Number(igdbId);
  const validGameId = Number.isFinite(gameId) && gameId > 0;

  const [searchParams] = useSearchParams();
  const requestedBuildId = Number(searchParams.get('buildId'));
  const requestedPreset = searchParams.get('preset');
  const requestedBackTo = searchParams.get('backTo');
  const backTo = useMemo(() => {
    if (!requestedBackTo) return '/check-fps';
    if (requestedBackTo.startsWith('/check-fps')) return requestedBackTo;
    return '/check-fps';
  }, [requestedBackTo]);
  const initialPreset: FpsPresetId =
    requestedPreset === '1440p-high' || requestedPreset === '4k-ultra' || requestedPreset === '1080p-high'
      ? requestedPreset
      : '1080p-high';

  const recentIds = useMemo(() => loadRecentBuildIds().slice(0, 10), []);
  const initialBuildId = useMemo(
    () => (Number.isFinite(requestedBuildId) && requestedBuildId > 0 ? requestedBuildId : loadActiveBuildId() ?? recentIds[0]),
    [requestedBuildId, recentIds],
  );
  const [buildId, setBuildId] = useState<number | undefined>(initialBuildId);
  const [presetId, setPresetId] = useState<FpsPresetId>(initialPreset);

  const recentBuildsQuery = useQuery({
    queryKey: ['fps-game-recent-builds', recentIds],
    queryFn: async () => {
      const results = await Promise.all(
        recentIds.map(async (id) => {
          try {
            return await buildsApi.getBuild(id).then((r) => r.data);
          } catch {
            return null;
          }
        }),
      );
      return results.filter((b): b is Build => !!b);
    },
    enabled: isAuthenticated && recentIds.length > 0,
    staleTime: 30000,
    retry: false,
  });

  const buildQuery = useQuery({
    queryKey: ['fps-game-build', buildId],
    queryFn: () => buildsApi.getBuild(buildId!).then((r) => r.data),
    enabled: isAuthenticated && !!buildId,
    retry: false,
  });

  const gameDetailsQuery = useQuery({
    queryKey: ['fps-game-details-page', gameId],
    queryFn: () => gamesApi.getById(gameId).then((r) => r.data),
    enabled: validGameId,
    staleTime: 300000,
    retry: false,
  });

  const selectedBuild = buildQuery.data;

  const gameForEstimator = useMemo<GameCatalogItem | null>(() => {
    const game = gameDetailsQuery.data;
    if (!game) return null;

    return {
      igdbId: game.igdbId,
      slug: game.slug,
      name: game.name,
      imagePath: game.imagePath ?? '',
      sourceUrl: game.sourceUrl ?? undefined,
      genres: game.genres ?? [],
      themes: game.themes ?? [],
      gameModes: game.gameModes ?? [],
      firstReleaseDate: game.releaseDate ?? null,
      totalRating: game.totalRating ?? null,
      totalRatingCount: game.totalRatingCount ?? null,
    };
  }, [gameDetailsQuery.data]);

  const gameInsights = useMemo(() => {
    if (!selectedBuild || !gameForEstimator) return null;
    return estimateGameInsights(selectedBuild, gameForEstimator);
  }, [selectedBuild, gameForEstimator]);

  const highlightedScenario = useMemo(() => {
    if (!gameInsights) return null;
    const resolution = resolutionForPreset(presetId);
    return gameInsights.scenarios.find((row) => row.resolution === resolution && row.quality === 'epic') ?? null;
  }, [gameInsights, presetId]);

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
      title="Game FPS Details"
      subtitle="Per-game FPS projections, CPU/GPU utilization estimates, and suggested minimum/recommended specs."
      right={
        <div className="flex items-center gap-2">
          <Link to={backTo} className="btn btn-secondary text-sm">
            Back to game list
          </Link>
        </div>
      }
    >
      {!validGameId && (
        <Card className="p-5">
          <div className="text-sm text-[var(--danger-text)]">Invalid game id.</div>
        </Card>
      )}

      {validGameId && (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
          <Card className="p-5 h-fit">
            <div className="text-sm font-semibold text-[var(--text)]">Estimator Controls</div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-[var(--muted)]">Build</div>
              {authLoading ? (
                <div className="mt-2 text-sm text-[var(--muted)]">Checking session...</div>
              ) : !isAuthenticated ? (
                <div className="mt-2 text-sm text-[var(--muted)]">
                  Sign in to load your saved builds.
                </div>
              ) : recentBuildsQuery.data && recentBuildsQuery.data.length > 0 ? (
                <select
                  className="mt-2 w-full app-input px-3 py-2 text-sm"
                  value={buildId ?? ''}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next) || next <= 0) return;
                    setBuildId(next);
                  }}
                >
                  {recentBuildsQuery.data.map((build) => (
                    <option key={build.id} value={build.id}>
                      #{build.id} - {build.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-2 text-sm text-[var(--muted)]">No recent builds found.</div>
              )}
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-[var(--muted)]">Highlight Preset</div>
              <select
                className="mt-2 w-full app-input px-3 py-2 text-sm"
                value={presetId}
                onChange={(event) => setPresetId(event.target.value as FpsPresetId)}
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
              {gameDetailsQuery.isLoading && <div className="text-sm text-[var(--muted)]">Loading game details...</div>}
              {!gameDetailsQuery.isLoading && !gameDetailsQuery.data && (
                <div className="text-sm text-[var(--danger-text)]">Game details could not be loaded from IGDB.</div>
              )}

              {gameDetailsQuery.data && (
                <>
                  <div className="flex flex-wrap lg:flex-nowrap items-start gap-4">
                    <img
                      src={gameDetailsQuery.data.imagePath ?? '/favicon.ico'}
                      alt={gameDetailsQuery.data.name}
                      className="w-[130px] h-[172px] object-cover rounded border border-[var(--border)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-xl font-semibold text-[var(--text)]">{gameDetailsQuery.data.name}</div>
                        {highlightedScenario && (
                          <div className={`text-sm font-semibold ${fpsToneClass(highlightedScenario.averageFps)}`}>
                            {highlightedScenario.averageFps} FPS ({presetId.replace('-', ' ')}, epic)
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-sm text-[var(--muted)]">
                        {gameDetailsQuery.data.summary ?? 'No summary returned by IGDB for this title.'}
                      </div>

                      <div className="mt-3 flex gap-2 flex-wrap">
                        {(gameDetailsQuery.data.genres ?? []).slice(0, 5).map((genre) => (
                          <span key={genre} className="text-[11px] px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                            {genre}
                          </span>
                        ))}
                        {(gameDetailsQuery.data.gameModes ?? []).slice(0, 3).map((mode) => (
                          <span key={mode} className="text-[11px] px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                            {mode}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </Card>

            {!selectedBuild && (
              <Card className="p-5">
                <div className="text-sm text-[var(--muted)]">Select a build from the left panel to calculate FPS and specs for this game.</div>
              </Card>
            )}

            {gameInsights && (
              <>
                <Card className="p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                      <div className="text-xs font-semibold text-[var(--muted)]">Estimated Minimum Specs</div>
                      <div className="mt-2 text-sm text-[var(--text)]">CPU: {gameInsights.specRecommendation.minimum.cpu}</div>
                      <div className="text-sm text-[var(--text)]">GPU: {gameInsights.specRecommendation.minimum.gpu}</div>
                      <div className="text-sm text-[var(--text)]">RAM: {gameInsights.specRecommendation.minimum.ramGb} GB</div>
                      <div className={`text-sm font-semibold ${fpsToneClass(gameInsights.specRecommendation.minimum.estimated1080pLowFps)}`}>
                        Estimated FPS (1080p low): {gameInsights.specRecommendation.minimum.estimated1080pLowFps}
                      </div>
                    </div>
                    <div className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                      <div className="text-xs font-semibold text-[var(--muted)]">Estimated Recommended Specs</div>
                      <div className="mt-2 text-sm text-[var(--text)]">CPU: {gameInsights.specRecommendation.recommended.cpu}</div>
                      <div className="text-sm text-[var(--text)]">GPU: {gameInsights.specRecommendation.recommended.gpu}</div>
                      <div className="text-sm text-[var(--text)]">RAM: {gameInsights.specRecommendation.recommended.ramGb} GB</div>
                      <div className={`text-sm font-semibold ${fpsToneClass(gameInsights.specRecommendation.recommended.estimated1080pLowFps)}`}>
                        Estimated FPS (1080p low): {gameInsights.specRecommendation.recommended.estimated1080pLowFps}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                          <th className="py-2 pr-3">Resolution</th>
                          <th className="py-2 pr-3">Preset</th>
                          <th className="py-2 pr-3">Avg FPS</th>
                          <th className="py-2 pr-3">1% Low</th>
                          <th className="py-2 pr-3">CPU Useage</th>
                          <th className="py-2 pr-3">GPU Useage</th>
                          <th className="py-2 pr-3">Run Quality</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gameInsights.scenarios.map((row) => (
                          <tr key={`${row.resolution}-${row.quality}`} className="border-b border-[var(--border)]">
                            <td className="py-2 pr-3 text-[var(--text)]">{row.resolution}</td>
                            <td className="py-2 pr-3 text-[var(--text)] capitalize">{row.quality}</td>
                            <td className={`py-2 pr-3 font-semibold ${fpsToneClass(row.averageFps)}`}>{row.averageFps}</td>
                            <td className="py-2 pr-3 text-[var(--muted)]">{row.low1PercentFps}</td>
                            <td className="py-2 pr-3 text-[var(--muted)]">{row.cpuUsagePercent}%</td>
                            <td className="py-2 pr-3 text-[var(--muted)]">{row.gpuUsagePercent}%</td>
                            <td className="py-2 pr-3 text-[var(--text)]">{row.playability}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
