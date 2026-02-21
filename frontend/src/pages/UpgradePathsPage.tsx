import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import axios from 'axios';
import { buildsApi, upgradePathsApi } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { loadActiveBuildId, saveActiveBuildId } from '../utils/buildStorage';
import { orderBuildsForDisplay } from '../utils/buildOrdering';
import { formatEur } from '../utils/currency';
import type {
  BottleneckAnalysis,
  UpgradePath,
  UpgradeStep,
  UpgradePathResponse,
} from '../types';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';

const OBJECTIVES = [
  { value: 'all', label: 'Best Overall' },
  { value: 'fps-per-dollar', label: 'FPS Per Eur' },
  { value: 'min-wattage', label: 'Min Wattage' },
  { value: 'future-proof', label: 'Future-Proof' },
] as const;

const HORIZON_LABELS: Record<string, string> = {
  immediate: 'Step 1 (now)',
  'short-term': 'Step 2 (3–6 mo)',
  staged: 'Staged (6–12 mo)',
};

const UPGRADE_PATHS_STATE_KEY = 'pc-part-picker:upgrade-paths-state:v1';

type PersistedUpgradePathsState = {
  selectedBuildId: number | null;
  budgetNow: number | '';
  budgetLater: number | '';
  objective: string;
  filterHorizon: string;
  result: UpgradePathResponse | null;
};

function readPersistedUpgradePathsState(): PersistedUpgradePathsState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(UPGRADE_PATHS_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedUpgradePathsState> | null;
    if (!parsed || typeof parsed !== 'object') return null;

    const numericBuildId = Number(parsed.selectedBuildId);
    const selectedBuildId = Number.isFinite(numericBuildId) && numericBuildId > 0 ? numericBuildId : null;
    const budgetNow = parsed.budgetNow === '' ? '' : typeof parsed.budgetNow === 'number' ? parsed.budgetNow : 150;
    const budgetLater = parsed.budgetLater === '' ? '' : typeof parsed.budgetLater === 'number' ? parsed.budgetLater : 300;
    const objective = typeof parsed.objective === 'string' && parsed.objective ? parsed.objective : 'all';
    const filterHorizon = typeof parsed.filterHorizon === 'string' && parsed.filterHorizon ? parsed.filterHorizon : 'all';
    const result = parsed.result && typeof parsed.result === 'object' ? (parsed.result as UpgradePathResponse) : null;

    return {
      selectedBuildId,
      budgetNow,
      budgetLater,
      objective,
      filterHorizon,
      result,
    };
  } catch {
    return null;
  }
}

function BottleneckMeter({ analysis }: { analysis: BottleneckAnalysis }) {
  const color = analysis.bottleneck === 'Balanced'
    ? 'var(--ok)'
    : analysis.bottleneck === 'Unknown'
      ? 'var(--muted)'
      : 'var(--warning, var(--primary))';

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Bottleneck Analysis</div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ background: color }}
        />
        <span className="text-sm font-semibold text-[var(--text)]">{analysis.bottleneck}</span>
      </div>

      <div className="mt-1 text-xs text-[var(--muted)]">{analysis.summary}</div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {(['cpuScore', 'gpuScore', 'ramScore'] as const).map((k) => {
          const label = k.replace('Score', '').toUpperCase();
          const val = analysis[k];
          return (
            <div key={k}>
              <div className="text-[11px] text-[var(--muted)]">{label}</div>
              <div className="mt-1 h-2 w-full rounded-full bg-[color-mix(in_srgb,var(--surface-2)_65%,transparent)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(0, Math.min(100, val))}%`,
                    background: val > 70 ? 'var(--ok)' : val > 40 ? 'var(--primary)' : 'var(--danger-text)',
                  }}
                />
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-[var(--text)]">{val}/100</div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-[11px] text-[var(--muted)]">
        Balance ratio: {analysis.balanceRatio.toFixed(2)} (GPU/CPU)
      </div>
    </div>
  );
}

function StepCard({ step, index }: { step: UpgradeStep; index: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm font-bold">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-[var(--muted)] uppercase">{step.category}</div>
        <div className="mt-0.5 text-sm font-semibold text-[var(--text)]">
          {step.proposedPart.name}
        </div>
        {step.currentPart && (
          <div className="text-xs text-[var(--muted)]">
            Replaces: {step.currentPart.name}
          </div>
        )}
        <div className="mt-1 text-xs text-[var(--muted)]">{step.reason}</div>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className={`font-semibold ${step.cost > 0 ? 'text-[var(--text)]' : 'text-[var(--ok)]'}`}>
            {step.cost > 0 ? `+${formatEur(step.cost)}` : step.cost < 0 ? formatEur(step.cost) : 'Free'}
          </span>
          {step.estimatedFpsGainPercent > 0 && (
            <span className="text-[var(--ok)] font-semibold">
              +{step.estimatedFpsGainPercent.toFixed(1)}% FPS
            </span>
          )}
          {step.wattageChange !== 0 && (
            <span className="text-[var(--muted)]">
              {step.wattageChange > 0 ? '+' : ''}{step.wattageChange}W
            </span>
          )}
        </div>
      </div>
      {step.proposedPart.imageUrl && (
        <div className="shrink-0 w-16 h-16 flex items-center justify-center">
          <img
            src={step.proposedPart.imageUrl}
            alt={step.proposedPart.name}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
}

function PathCard({ path, idx }: { path: UpgradePath; idx: number }) {
  const [expanded, setExpanded] = useState(idx === 0);
  const reduceMotion = useReducedMotion();

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-[var(--surface-2)] transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-[color-mix(in_srgb,var(--primary)_18%,var(--surface))] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]">
              {HORIZON_LABELS[path.horizon] ?? path.horizon}
            </span>
            <span className="text-sm font-semibold text-[var(--text)] truncate">{path.name}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted)]">
            <span className="font-semibold text-[var(--text)]">
              {formatEur(path.totalCost)}
            </span>
            {path.totalEstimatedFpsGainPercent > 0 && (
              <span className="text-[var(--ok)] font-semibold">
                +{path.totalEstimatedFpsGainPercent.toFixed(1)}% FPS
              </span>
            )}
            <span>{path.finalWattage}W</span>
            <span>{path.steps.length} step{path.steps.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <span className={`text-[var(--muted)] text-sm transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Steps */}
              {path.steps.map((step, i) => (
                <StepCard key={`${step.category}-${step.proposedPart.id}`} step={step} index={i} />
              ))}

              {/* Cost timeline */}
              {path.steps.length > 1 && (
                <div className="rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] p-3">
                  <div className="text-xs font-semibold text-[var(--muted)] uppercase">Cost Timeline</div>
                  <div className="mt-2 flex items-center gap-2">
                    {path.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {i > 0 && <span className="text-[var(--muted)]">→</span>}
                        <div className="text-center">
                          <div className="text-xs text-[var(--muted)]">
                            {path.horizon === 'staged' ? (i === 0 ? 'Now' : `Month ${i * 3}`) : `Step ${i + 1}`}
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {step.cost > 0 ? `+${formatEur(step.cost)}` : formatEur(Math.abs(step.cost))}
                          </div>
                        </div>
                      </div>
                    ))}
                    <span className="text-[var(--muted)]">=</span>
                    <div className="text-center">
                      <div className="text-xs text-[var(--muted)]">Total</div>
                      <div className="text-sm font-bold text-[var(--primary)]">{formatEur(path.totalCost)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Compatibility warnings */}
              {path.compatibilityWarnings.length > 0 && (
                <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3">
                  <div className="text-xs font-semibold text-[var(--danger-text)]">Compatibility Issues</div>
                  <ul className="mt-1 text-xs text-[var(--danger-text)] space-y-0.5">
                    {path.compatibilityWarnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Post-upgrade bottleneck */}
              {path.postUpgradeBottleneck && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="text-xs font-semibold text-[var(--muted)] uppercase mb-1">After Upgrade</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-[var(--text)]">Bottleneck: {path.postUpgradeBottleneck.bottleneck}</span>
                    <span className="text-[var(--muted)]">
                      CPU {path.postUpgradeBottleneck.cpuScore} · GPU {path.postUpgradeBottleneck.gpuScore} · RAM {path.postUpgradeBottleneck.ramScore}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function UpgradePathsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const reduceMotion = useReducedMotion();
  const persistedState = useMemo(() => readPersistedUpgradePathsState(), []);
  const [activeBuildId, setActiveBuildId] = useState<number | null>(() => loadActiveBuildId() ?? null);

  const buildIdParam = searchParams.get('buildId');
  const parsedBuildId = buildIdParam ? Number(buildIdParam) : null;

  const [selectedBuildId, setSelectedBuildId] = useState<number | null>(
    parsedBuildId && Number.isFinite(parsedBuildId)
      ? parsedBuildId
      : activeBuildId ?? persistedState?.selectedBuildId ?? null,
  );
  const [budgetNow, setBudgetNow] = useState<number | ''>(persistedState?.budgetNow ?? 150);
  const [budgetLater, setBudgetLater] = useState<number | ''>(persistedState?.budgetLater ?? 300);
  const [objective, setObjective] = useState<string>(persistedState?.objective ?? 'all');
  const [filterHorizon, setFilterHorizon] = useState<string>(persistedState?.filterHorizon ?? 'all');
  const [persistedResult, setPersistedResult] = useState<UpgradePathResponse | null>(persistedState?.result ?? null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Sync build selection to URL
  useEffect(() => {
    if (!selectedBuildId) return;
    if (activeBuildId !== selectedBuildId) {
      saveActiveBuildId(selectedBuildId);
      setActiveBuildId(selectedBuildId);
    }
    setSearchParams({ buildId: String(selectedBuildId) }, { replace: true });
  }, [selectedBuildId, setSearchParams, activeBuildId]);

  const { data: builds, isLoading: buildsLoading } = useQuery({
    queryKey: ['my-builds'],
    queryFn: async () => (await buildsApi.getMyBuilds()).data,
    enabled: isAuthenticated,
    retry: false,
  });

  const orderedBuilds = useMemo(() => orderBuildsForDisplay(builds ?? [], activeBuildId), [builds, activeBuildId]);

  // Keep selection valid and prefer the active build when possible.
  useEffect(() => {
    if (!orderedBuilds.length) return;
    if (selectedBuildId && orderedBuilds.some((b) => b.id === selectedBuildId)) return;

    const preferredBuildId =
      activeBuildId && orderedBuilds.some((b) => b.id === activeBuildId)
        ? activeBuildId
        : orderedBuilds[0].id;
    setSelectedBuildId(preferredBuildId);
  }, [orderedBuilds, selectedBuildId, activeBuildId]);

  const selectedBuild = useMemo(() => {
    if (!selectedBuildId || !orderedBuilds.length) return null;
    return orderedBuilds.find((b) => b.id === selectedBuildId) ?? null;
  }, [orderedBuilds, selectedBuildId]);

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBuildId) throw new Error('No build selected');
      const res = await upgradePathsApi.getUpgradePaths({
        buildId: selectedBuildId,
        budgetNow: typeof budgetNow === 'number' ? budgetNow : undefined,
        budgetLater: typeof budgetLater === 'number' ? budgetLater : undefined,
        objective,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setPersistedResult(data);
    },
  });

  const cachedResult: UpgradePathResponse | undefined = upgradeMutation.data ?? persistedResult ?? undefined;
  const result: UpgradePathResponse | undefined =
    selectedBuildId && cachedResult?.buildId === selectedBuildId ? cachedResult : undefined;

  const allPaths = useMemo(() => {
    if (!result) return [];
    return [
      ...result.immediatePaths.map((p) => ({ ...p, _section: 'immediate' as const })),
      ...result.shortTermPaths.map((p) => ({ ...p, _section: 'short-term' as const })),
      ...result.stagedPlans.map((p) => ({ ...p, _section: 'staged' as const })),
    ];
  }, [result]);

  const filteredPaths = useMemo(() => {
    if (filterHorizon === 'all') return allPaths;
    return allPaths.filter((p) => p.horizon === filterHorizon);
  }, [allPaths, filterHorizon]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const snapshot: PersistedUpgradePathsState = {
      selectedBuildId,
      budgetNow,
      budgetLater,
      objective,
      filterHorizon,
      result: result ?? null,
    };

    try {
      window.sessionStorage.setItem(UPGRADE_PATHS_STATE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage failures (private mode or quota limits).
    }
  }, [selectedBuildId, budgetNow, budgetLater, objective, filterHorizon, result]);

  const errorMessage = useMemo(() => {
    if (!upgradeMutation.error) return null;
    if (!axios.isAxiosError(upgradeMutation.error)) return 'Something went wrong.';
    return (upgradeMutation.error.response?.data as any)?.message ?? 'Failed to generate upgrade paths.';
  }, [upgradeMutation.error]);

  if (!authLoading && !isAuthenticated) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent('/upgrade-paths')}`} replace />;
  }

  const hasBuild = selectedBuild && (selectedBuild.cpu || selectedBuild.gpu);

  return (
    <PageShell
      title="Upgrade Paths"
      subtitle="Find the best upgrades for your build — from quick wins to long-term plans."
      right={
        <Link to="/my-builds" className="btn btn-secondary text-sm">
          Back to my builds
        </Link>
      }
    >
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* ── Left sidebar: build selector + budget ── */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] text-xs font-semibold text-[var(--muted)]">
              SELECT BUILD
            </div>

            {buildsLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="line" className="h-10 w-full border-0" />
                ))}
              </div>
            ) : !orderedBuilds.length ? (
              <div className="p-4 text-sm text-[var(--muted)]">
                No saved builds.{' '}
                <Link to="/builder" className="text-[var(--primary)] underline">
                  Create one
                </Link>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-auto">
                {orderedBuilds.map((b) => {
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
                      {isSelected && (
                        <motion.div
                          layoutId="upgrade-selected-rail"
                          className="absolute left-0 top-0 h-full w-1 bg-[var(--primary)]"
                          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 45 }}
                        />
                      )}
                      <div className="text-sm font-semibold truncate text-[var(--text)]">{b.name}</div>
                      <div className="mt-0.5 text-xs text-[var(--muted)]">
                        {formatEur(Number(b.totalPrice ?? 0))} · {Number(b.totalWattage ?? 0)}W
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Budget controls */}
          <Card className="p-4 space-y-3">
            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Budget</div>

            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                <span>Now</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={budgetNow}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBudgetNow(v === '' ? '' : Math.max(0, Number(v)));
                  }}
                  className="w-28 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[var(--text)] text-right"
                  placeholder="150"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                <span>Later </span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={budgetLater}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBudgetLater(v === '' ? '' : Math.max(0, Number(v)));
                  }}
                  className="w-28 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[var(--text)] text-right"
                  placeholder="300"
                />
              </label>
            </div>

            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide pt-1">Objective</div>
            <div className="grid grid-cols-2 gap-1.5">
              {OBJECTIVES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setObjective(o.value)}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                    objective === o.value
                      ? 'bg-[color-mix(in_srgb,var(--primary)_18%,var(--surface))] border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] text-[var(--primary)]'
                      : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="w-full btn btn-primary text-sm mt-2"
              disabled={!hasBuild || upgradeMutation.isPending}
              onClick={() => upgradeMutation.mutate()}
            >
              {upgradeMutation.isPending ? 'Analysing…' : 'Find Upgrade Paths'}
            </button>

            {!hasBuild && selectedBuild && (
              <div className="text-xs text-[var(--muted)]">Build needs at least a CPU or GPU.</div>
            )}
          </Card>

          {/* Current bottleneck */}
          {result?.currentBottleneck && <BottleneckMeter analysis={result.currentBottleneck} />}
        </div>

        {/* ── Main content ── */}
        <div>
          {!result && !upgradeMutation.isPending && !errorMessage && (
            <Card className="p-6 text-sm text-[var(--muted)]">
              Select a build and click "Find Upgrade Paths" to get started.
            </Card>
          )}

          {upgradeMutation.isPending && (
            <Card className="p-6 space-y-3">
              <div className="text-sm font-semibold text-[var(--text)]">Analysing build & finding upgrades…</div>
              <Skeleton variant="line" className="h-16 w-full border-0" />
              <Skeleton variant="line" className="h-16 w-full border-0" />
              <Skeleton variant="line" className="h-16 w-full border-0" />
            </Card>
          )}

          {errorMessage && (
            <div className="rounded border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
              {errorMessage}
            </div>
          )}

          {result && !upgradeMutation.isPending && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Horizon filter tabs */}
              <div className="flex items-center gap-2 mb-4">
                {[
                  { value: 'all', label: `All (${allPaths.length})` },
                  { value: 'immediate', label: `Immediate (${result.immediatePaths.length})` },
                  { value: 'short-term', label: `Short-term (${result.shortTermPaths.length})` },
                  { value: 'staged', label: `Staged (${result.stagedPlans.length})` },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFilterHorizon(tab.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                      filterHorizon === tab.value
                        ? 'bg-[color-mix(in_srgb,var(--primary)_18%,var(--surface))] border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] text-[var(--primary)]'
                        : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {filteredPaths.length === 0 ? (
                <Card className="p-6 text-sm text-[var(--muted)]">
                  No upgrade paths found for the selected criteria. Try increasing your budget or changing the objective.
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredPaths.map((path, i) => (
                    <PathCard key={`${path.name}-${i}`} path={path} idx={i} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
