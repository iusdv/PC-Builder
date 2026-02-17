import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { buildsApi, partsApi } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Build, CompatibilityCheckResult, PartCategory, PartSelectionItem } from '../types';
import {
  addRecentBuildId,
  loadActiveBuildId,
  loadRecentBuildIds,
  touchBuildMeta,
  removeRecentBuildId,
  saveActiveBuildId,
} from '../utils/buildStorage';
import { formatEur } from '../utils/currency';
   import { useToast } from '../components/ui/Toast';
import useAnimatedNumber from '../hooks/useAnimatedNumber';

type Slot = {
  label: string;
  category: PartCategory;
  selectedId?: number | null;
  selectedName?: string;
  selectedImageUrl?: string;
  selectedPrice?: number | null;
};

function isBuildCompletelyEmpty(build: Build | null | undefined): boolean {
  if (!build) return true;
  return !build.cpuId
    && !build.coolerId
    && !build.motherboardId
    && !build.ramId
    && !build.gpuId
    && !build.storageId
    && !build.psuId
    && !build.caseId
    && !build.caseFanId;
}

export default function BuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('My Custom PC');
  const [compat, setCompat] = useState<CompatibilityCheckResult | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const partPlaceholderSrc = '/placeholder-part.svg';
  const casePlaceholderSrc = '/placeholder-case.svg';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const placeholderCategories: PartCategory[] = useMemo(
    () => ['CPU', 'Cooler', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU', 'Case', 'CaseFan'],
    [],
  );

  const [buildId, setBuildId] = useState<number | undefined>(() => loadActiveBuildId());
  const [recentBuildIds, setRecentBuildIds] = useState<number[]>(() => loadRecentBuildIds());

  useEffect(() => {
    const fromQuery = searchParams.get('buildId');
    if (!fromQuery) return;

    const parsed = Number(fromQuery);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    if (parsed !== buildId) {
      saveActiveBuildId(parsed);
      setRecentBuildIds(addRecentBuildId(parsed));
      setBuildId(parsed);
      queryClient.invalidateQueries({ queryKey: ['build'] });
      setCompat(null);
    }

    const next = new URLSearchParams(searchParams);
    next.delete('buildId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, buildId, queryClient]);

  useEffect(() => {
    if (!buildId) return;
    setRecentBuildIds(addRecentBuildId(buildId));
  }, [buildId]);

  const hasEnsuredBuildRef = useRef(false);

  const categoryToSlug = (category: PartCategory) => {
    switch (category) {
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
      case 'CaseFan':
        return 'casefan';
      case 'Cooler':
      default:
        return 'cooler';
    }
  };

  const createBuildMutation = useMutation({
    mutationFn: (payload?: Partial<Build>) =>
      buildsApi.createBuild(
        payload ?? {
          name: 'My Custom PC',
          totalPrice: 0,
          totalWattage: 0,
        },
      ),
    onSuccess: (r) => {
      saveActiveBuildId(r.data.id);
      setRecentBuildIds(addRecentBuildId(r.data.id));
      setBuildId(r.data.id);
      setNameDraft(r.data.name);
      setCompat(null);
      queryClient.invalidateQueries({ queryKey: ['build'] });
    },
  });

  const myBuildsRecoveryQuery = useQuery({
    queryKey: ['my-builds-recovery'],
    queryFn: () => buildsApi.getMyBuilds().then((r) => r.data),
    enabled: isAuthenticated && !buildId && recentBuildIds.length === 0,
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (buildId) return;
    if (hasEnsuredBuildRef.current) return;

    const firstRecent = recentBuildIds[0];
    if (firstRecent) {
      hasEnsuredBuildRef.current = true;
      saveActiveBuildId(firstRecent);
      setRecentBuildIds(addRecentBuildId(firstRecent));
      setBuildId(firstRecent);
      setCompat(null);
      queryClient.invalidateQueries({ queryKey: ['build'] });
      return;
    }

    if (isAuthenticated) {
      if (!myBuildsRecoveryQuery.isSuccess && !myBuildsRecoveryQuery.isError) return; 

      const existing = myBuildsRecoveryQuery.data ?? [];
      const firstMine = existing[0]?.id;
      hasEnsuredBuildRef.current = true;
      if (firstMine) {
        saveActiveBuildId(firstMine);
        setRecentBuildIds(addRecentBuildId(firstMine, 10, { saved: true }));
        setBuildId(firstMine);
        setCompat(null);
        queryClient.invalidateQueries({ queryKey: ['build'] });
      } else {
        createBuildMutation.mutate(undefined);
      }
      return;
    }

    hasEnsuredBuildRef.current = true;
    createBuildMutation.mutate(undefined);
  }, [
    buildId,
    recentBuildIds,
    isAuthenticated,
    myBuildsRecoveryQuery.isSuccess,
    myBuildsRecoveryQuery.isError,
    myBuildsRecoveryQuery.data,
    createBuildMutation,
    queryClient,
  ]);

  const { data: build, isLoading, error: buildError } = useQuery({
    queryKey: ['build', buildId],
    queryFn: () => buildsApi.getBuild(buildId!).then((r) => r.data),
    enabled: !!buildId,
  });

  useEffect(() => {
    if (!build?.id) return;
    touchBuildMeta(build.id, { saved: !!build.userId });
  }, [build?.id, build?.userId]);

  // if no build clear buildID
  useEffect(() => {
    if (!buildId) return;
    if (!axios.isAxiosError(buildError)) return;
    const status = buildError.response?.status;
    if (status !== 404 && status !== 401 && status !== 403) return;

    saveActiveBuildId(undefined);
    setBuildId(undefined);
    hasEnsuredBuildRef.current = false;
    if (status === 404) {
      setRecentBuildIds(removeRecentBuildId(buildId));
    }
  }, [buildId, buildError]);

  const { data: placeholderByCategory } = useQuery({
    queryKey: ['builder-placeholders'],
    queryFn: async () => {
      const results = await Promise.all(
        placeholderCategories.map(async (category) => {
          const items = await partsApi
            .getSelection({
              category,
              compatibleOnly: false,
              page: 1,
              pageSize: 25,
            })
            .then((r) => r.data);

          const firstWithImage = items.items.find((i) => !!i.imageUrl);
          return { category, item: firstWithImage } as { category: PartCategory; item?: PartSelectionItem };
        }),
      );

      return results.reduce((acc, cur) => {
        acc[cur.category] = cur.item;
        return acc;
      }, {} as Record<PartCategory, PartSelectionItem | undefined>);
    },
    retry: false,
  });

  const checkCompatMutation = useMutation({
    mutationFn: (id: number) => buildsApi.checkCompatibility(id).then((r) => r.data),
    onSuccess: (result) => setCompat(result),
  });

  useEffect(() => {
    if (!build?.id) return;
    checkCompatMutation.mutate(build.id);
  }, [
    build?.id,
    build?.cpuId,
    build?.caseFanId,
    build?.motherboardId,
    build?.ramId,
    build?.gpuId,
    build?.storageId,
    build?.psuId,
    build?.caseId,
  ]);

  useEffect(() => {
    if (build?.name) setNameDraft(build.name);
  }, [build?.name]);

  const updateBuildMutation = useMutation({
    mutationFn: (payload: Partial<Build>) => buildsApi.updateBuild(buildId!, payload).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['build', buildId], updated);

      // Keep build lists (dropdown, My Builds, etc.) in sync without a refresh.
      queryClient.setQueriesData<Build[]>({ queryKey: ['recent-builds'] }, (prev) => {
        if (!prev) return prev;
        return prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b));
      });

      queryClient.setQueriesData<Build[]>({ queryKey: ['my-builds'] }, (prev) => {
        if (!prev) return prev;
        return prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b));
      });

      setNameDraft(updated.name);
      setEditingName(false);
      setCompat(null);
    },
  });

  const buildUpdatePayload = (overrides: Partial<Build>): Partial<Build> | null => {
    if (!build) return null;
    return {
      name: overrides.name ?? build.name,
      description: overrides.description ?? build.description,
      cpuId: overrides.cpuId ?? build.cpuId,
      coolerId: overrides.coolerId ?? build.coolerId,
      motherboardId: overrides.motherboardId ?? build.motherboardId,
      ramId: overrides.ramId ?? build.ramId,
      gpuId: overrides.gpuId ?? build.gpuId,
      storageId: overrides.storageId ?? build.storageId,
      psuId: overrides.psuId ?? build.psuId,
      caseId: overrides.caseId ?? build.caseId,
      caseFanId: overrides.caseFanId ?? build.caseFanId,
    };
  };

  const saveToAccountMutation = useMutation({
    mutationFn: () => buildsApi.saveToAccount(buildId!).then((r) => r.data),
    onSuccess: (saved) => {
      queryClient.setQueryData(['build', buildId], saved);
      setRecentBuildIds(addRecentBuildId(saved.id, 10, { saved: true }));
      queryClient.setQueriesData<Build[]>({ queryKey: ['my-builds'] }, (prev) => {
        if (!prev) return prev;
        const exists = prev.some((b) => b.id === saved.id);
        const next = exists ? prev.map((b) => (b.id === saved.id ? { ...b, ...saved } : b)) : [saved, ...prev];
        return next;
      });

      queryClient.setQueriesData<Build[]>({ queryKey: ['recent-builds'] }, (prev) => {
        if (!prev) return prev;
        return prev.map((b) => (b.id === saved.id ? { ...b, ...saved } : b));
      });

      toast.success('Saved to My Builds.');
      setSaveNotice('Saved to My Builds.');
      window.setTimeout(() => setSaveNotice(null), 2500);
    },
  });

  const setPartMutation = useMutation({
    mutationFn: (req: { category: PartCategory; partId?: number | null }) => buildsApi.selectPart(buildId!, req).then((r) => r.data),
    onSuccess: () => {
      setCompat(null);
      queryClient.invalidateQueries({ queryKey: ['build', buildId] });
    },
  });

  const deleteBuildMutation = useMutation({
    mutationFn: (id: number) => buildsApi.deleteBuild(id),
    onSuccess: async (_data, deletedId) => {
      queryClient.setQueryData<Build[]>(['my-builds'], (prev) => {
        if (!prev) return prev;
        return prev.filter((b: Build) => b.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: ['my-builds'] });

      if (buildId) {
        setRecentBuildIds(removeRecentBuildId(buildId));
      }
      saveActiveBuildId(undefined);
      setBuildId(undefined);
      hasEnsuredBuildRef.current = false;
    },
  });

  const slots: Slot[] = useMemo(() => {
    if (!build) {
      return [
        { label: 'Case', category: 'Case' },
        { label: 'CPU', category: 'CPU' },
        { label: 'CPU Cooler', category: 'Cooler' },
        { label: 'Motherboard', category: 'Motherboard' },
        { label: 'RAM', category: 'RAM' },
        { label: 'GPU', category: 'GPU' },
        { label: 'Storage', category: 'Storage' },
        { label: 'Power Supply', category: 'PSU' },
        { label: 'Case Fan', category: 'CaseFan' },
      ];
    }

    return [
      { label: 'Case', category: 'Case', selectedId: build.case?.id, selectedName: build.case?.name, selectedImageUrl: build.case?.imageUrl, selectedPrice: build.case?.price },
      { label: 'CPU', category: 'CPU', selectedId: build.cpu?.id, selectedName: build.cpu?.name, selectedImageUrl: build.cpu?.imageUrl, selectedPrice: build.cpu?.price },
      { label: 'CPU Cooler', category: 'Cooler', selectedId: build.cooler?.id, selectedName: build.cooler?.name, selectedImageUrl: build.cooler?.imageUrl, selectedPrice: build.cooler?.price },
      { label: 'Motherboard', category: 'Motherboard', selectedId: build.motherboard?.id, selectedName: build.motherboard?.name, selectedImageUrl: build.motherboard?.imageUrl, selectedPrice: build.motherboard?.price },
      { label: 'RAM', category: 'RAM', selectedId: build.ram?.id, selectedName: build.ram?.name, selectedImageUrl: build.ram?.imageUrl, selectedPrice: build.ram?.price },
      { label: 'GPU', category: 'GPU', selectedId: build.gpu?.id, selectedName: build.gpu?.name, selectedImageUrl: build.gpu?.imageUrl, selectedPrice: build.gpu?.price },
      { label: 'Storage', category: 'Storage', selectedId: build.storage?.id, selectedName: build.storage?.name, selectedImageUrl: build.storage?.imageUrl, selectedPrice: build.storage?.price },
      { label: 'Power Supply', category: 'PSU', selectedId: build.psu?.id, selectedName: build.psu?.name, selectedImageUrl: build.psu?.imageUrl, selectedPrice: build.psu?.price },
      { label: 'Case Fan', category: 'CaseFan', selectedId: build.caseFan?.id, selectedName: build.caseFan?.name, selectedImageUrl: build.caseFan?.imageUrl, selectedPrice: build.caseFan?.price },
    ];
  }, [build]);

  const compatStatus = useMemo(() => {
    if (!compat) return { ok: true, text: 'Checking compatibility…' };
    const issues = compat.issues ?? [];
    const errorIssues = issues.filter((i) => String(i.severity).toLowerCase() === 'error');
    if (errorIssues.length > 0) return { ok: false, text: `${errorIssues.length} compatibility issue(s) found.` };

    if (!compat.isCompatible) return { ok: false, text: compat.errors[0] || 'Parts are not compatible.' };
    return { ok: true, text: 'All parts are compatible.' };
  }, [compat]);

  const shareLink = useMemo(() => {
    if (!build?.shareCode) return '';
    return `${window.location.origin}/share/${build.shareCode}`;
  }, [build?.shareCode]);

  const animatedTotalPrice = useAnimatedNumber(Number(build?.totalPrice ?? 0), { duration: 0.35 });
  const animatedTotalWattage = useAnimatedNumber(Number(build?.totalWattage ?? 0), { duration: 0.35 });

  const estimatedWattageRounded = Math.max(0, Math.round(animatedTotalWattage));
  const psuRating = build?.psu?.wattageRating ?? null;
  const hasPsuRating = typeof psuRating === 'number' && psuRating > 0;
  const psuUsage = hasPsuRating ? estimatedWattageRounded / psuRating : null;
  const psuUsageClamped = hasPsuRating && psuUsage !== null ? Math.min(1, Math.max(0, psuUsage)) : 0;
  const psuUsagePercent = hasPsuRating && psuUsage !== null ? Math.round(psuUsage * 100) : null;
  const psuHeadroomW = hasPsuRating ? Math.round(psuRating - estimatedWattageRounded) : null;
  const psuToneClass = !hasPsuRating
    ? 'text-[var(--muted)]'
    : psuUsage! <= 0.7
      ? 'text-[var(--ok)]'
      : psuUsage! <= 0.85
        ? 'text-[var(--warn)]'
        : 'text-[var(--danger-text)]';
  const psuFillColor = !hasPsuRating
    ? 'color-mix(in srgb, var(--primary) 45%, transparent)'
    : psuUsage! <= 0.7
      ? 'color-mix(in srgb, var(--accent-cyan) 72%, transparent)'
      : psuUsage! <= 0.85
        ? 'color-mix(in srgb, var(--accent-yellow) 78%, transparent)'
        : 'rgba(220, 38, 38, 0.85)';

  const copyTextToClipboard = async (text: string) => {
    if (!text) return false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      
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

  const recentBuildsQuery = useQuery({
    queryKey: ['recent-builds', recentBuildIds],
    queryFn: async () => {
      const ids = recentBuildIds.slice(0, 10);
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const b = await buildsApi.getBuild(id).then((r) => r.data);
            return { id, build: b as Build };
          } catch {
            return { id, build: null as Build | null };
          }
        }),
      );

      const missing = results.filter((r) => r.build === null).map((r) => r.id);
      if (missing.length) {
        let nextIds = loadRecentBuildIds();
        for (const id of missing) nextIds = removeRecentBuildId(id);
        setRecentBuildIds(nextIds);
      }

      return results.filter((r) => r.build !== null).map((r) => r.build!) as Build[];
    },
    enabled: recentBuildIds.length > 0,
    staleTime: 30_000,
    retry: false,
  });

  const myBuildsDropdownQuery = useQuery({
    queryKey: ['my-builds'],
    queryFn: () => buildsApi.getMyBuilds().then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 10_000,
    retry: false,
  });

  const handledAuthDraftHandoffRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated) {
      handledAuthDraftHandoffRef.current = false;
      return;
    }
    if (handledAuthDraftHandoffRef.current) return;
    if (!myBuildsDropdownQuery.isSuccess && !myBuildsDropdownQuery.isError) return;

    handledAuthDraftHandoffRef.current = true;

    if (!build?.id) return;
    if (!!build.userId) return;
    if (!isBuildCompletelyEmpty(build)) return;

    const mine = myBuildsDropdownQuery.data ?? [];
    if (mine.length === 0) return;
    const preferred = mine[0];
    if (!preferred?.id || preferred.id === build.id) return;

    removeRecentBuildId(build.id);
    saveActiveBuildId(preferred.id);
    setRecentBuildIds(addRecentBuildId(preferred.id, 10, { saved: true }));
    setBuildId(preferred.id);
    setCompat(null);
    queryClient.invalidateQueries({ queryKey: ['build'] });
  }, [
    isAuthenticated,
    myBuildsDropdownQuery.isSuccess,
    myBuildsDropdownQuery.isError,
    myBuildsDropdownQuery.data,
    build,
    queryClient,
  ]);

  const dropdownBuilds = useMemo(() => {
    const result: Build[] = [];
    const mine = myBuildsDropdownQuery.data ?? [];
    const mineIds = new Set(mine.map((b) => b.id));
    const includeUnsavedEmptyDrafts = !isAuthenticated || mine.length === 0;

    const canInclude = (candidate: Build | undefined | null) => {
      if (!candidate?.id) return false;
      if (includeUnsavedEmptyDrafts) return true;
      if (mineIds.has(candidate.id)) return true;
      if (!!candidate.userId) return true;
      return !isBuildCompletelyEmpty(candidate);
    };

    if (build && canInclude(build)) {
      result.push(build);
    }

    for (const b of mine) {
      if (!canInclude(b)) continue;
      if (result.some((x) => x.id === b.id)) continue;
      result.push(b);
    }

    const recent = recentBuildsQuery.data ?? [];
    for (const b of recent) {
      if (!canInclude(b)) continue;
      if (result.some((x) => x.id === b.id)) continue;
      result.push(b);
    }

    return result;
  }, [build, myBuildsDropdownQuery.data, recentBuildsQuery.data, isAuthenticated]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              {editingName ? (
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const payload = buildUpdatePayload({ name: nameDraft });
                      if (payload) updateBuildMutation.mutate(payload);
                    }

                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setNameDraft(build?.name ?? nameDraft);
                      setEditingName(false);
                    }
                  }}
                  className="text-3xl font-semibold app-input px-3 py-2"
                />
              ) : (
                <div>
                  <h1 className="text-3xl font-semibold text-[var(--text)]">{build?.name || nameDraft}</h1>
                </div>
              )}
              <button
                onClick={() => {
                  if (editingName) {
                    const payload = buildUpdatePayload({ name: nameDraft });
                    if (payload) updateBuildMutation.mutate(payload);
                  } else {
                    setEditingName(true);
                  }
                }}
                className="text-[var(--muted)] hover:text-[var(--text)]"
                title="Rename"
              >
                ✎
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!!dropdownBuilds.length && (
                <label className="text-sm text-[var(--muted)] inline-flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--muted)]">Active</span>
                  <select
                    value={buildId ?? ''}
                    onChange={(e) => {
                      const nextId = Number(e.target.value);
                      if (!Number.isFinite(nextId) || nextId <= 0) return;
                      saveActiveBuildId(nextId);
                      setRecentBuildIds(addRecentBuildId(nextId));
                      setBuildId(nextId);
                      setCompat(null);
                      queryClient.invalidateQueries({ queryKey: ['build'] });
                    }}
                    className="app-input px-3 py-2 text-sm"
                  >
                    {dropdownBuilds.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <button
                type="button"
                onClick={() => {
                  createBuildMutation.mutate({ name: 'My Custom PC' });
                }}
                disabled={createBuildMutation.isPending}
                className="btn btn-secondary text-sm"
              >
                New build
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!build) return;
                  createBuildMutation.mutate({
                    name: build.name ? `Copy of ${build.name}` : 'Copy of My Custom PC',
                    description: build.description,
                    cpuId: build.cpuId,
                    coolerId: build.coolerId,
                    motherboardId: build.motherboardId,
                    ramId: build.ramId,
                    gpuId: build.gpuId,
                    storageId: build.storageId,
                    psuId: build.psuId,
                    caseId: build.caseId,
                    caseFanId: build.caseFanId,
                  });
                }}
                disabled={!build || createBuildMutation.isPending}
                className="btn btn-secondary text-sm"
                title="Create a new build with the same selected parts"
              >
                Duplicate
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!buildId) return;
                  const ok = window.confirm('Delete this build? This cannot be undone.');
                  if (!ok) return;
                  deleteBuildMutation.mutate(buildId);
                }}
                disabled={!buildId || deleteBuildMutation.isPending}
                className="btn btn-danger text-sm"
                title="Delete build"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="app-card overflow-hidden">
            {slots.map((slot) => {
              const canRemove = !!slot.selectedName;
              const slotPlaceholderImageUrl = placeholderByCategory?.[slot.category]?.imageUrl;
              const slotImageSrc = slot.selectedImageUrl || slotPlaceholderImageUrl || partPlaceholderSrc;
              const detailsTo = slot.selectedId ? `/parts/${categoryToSlug(slot.category)}/${slot.selectedId}` : null;
              const returnTo = `${location.pathname}${location.search}`;

              return (
                <div key={slot.label} className="px-4 py-4 flex items-center justify-between border-b border-[var(--border)] last:border-b-0">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 flex items-center justify-center">
                      <AnimatePresence mode="wait" initial={false}>
                        {detailsTo ? (
                          <Link to={detailsTo} state={{ returnTo }} title="View details" className="block">
                            <motion.img
                              key={slotImageSrc}
                              src={slotImageSrc}
                              alt={slot.selectedName || slot.label}
                              className="w-16 h-16 object-contain"
                              loading="lazy"
                              initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
                              transition={{ duration: 0.16, ease: 'easeOut' }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = partPlaceholderSrc;
                              }}
                            />
                          </Link>
                        ) : (
                          <motion.img
                            key={slotImageSrc}
                            src={slotImageSrc}
                            alt={slot.selectedName || slot.label}
                            className="w-16 h-16 object-contain"
                            loading="lazy"
                            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = partPlaceholderSrc;
                            }}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--muted)]">{slot.label.toUpperCase()}</div>
                      {detailsTo ? (
                        <Link
                          to={detailsTo}
                          state={{ returnTo }}
                          title="View details"
                          className="text-sm text-[var(--muted)] italic truncate"
                        >
                          {slot.selectedName}
                        </Link>
                      ) : (
                        <div className="text-sm text-[var(--muted)] italic truncate" title={slot.selectedName || slot.label}>
                          {slot.selectedName ? slot.selectedName : 'No part selected'}
                        </div>
                      )}
                      {slot.selectedName && typeof slot.selectedPrice === 'number' && (
                        <div className="mt-0.5 text-xs font-semibold text-[var(--text)]">{formatEur(Number(slot.selectedPrice))}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canRemove && (
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => {
                          if (!build?.id) return;
                          setPartMutation.mutate({ category: slot.category, partId: null });
                        }}
                        className="w-9 h-9 inline-flex items-center justify-center rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--danger)] hover:border-[var(--danger-border)] hover:bg-[var(--danger-bg)] disabled:opacity-50"
                        disabled={!build?.id || setPartMutation.isPending}
                      >
                        −
                      </button>
                    )}
                    <Link
                      to={`/select/${categoryToSlug(slot.category)}`}
                      className="btn btn-primary text-sm"
                    >
                      <span className="text-base leading-none">+</span>
                      {canRemove ? 'Change' : 'Choose'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="app-card p-5 h-fit">
            <div className="text-sm font-semibold text-[var(--text)]">Build Summary</div>

            <div className="mt-4">
              <div className="w-full h-36 rounded-md">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.img
                    key={build?.case?.imageUrl || placeholderByCategory?.Case?.imageUrl || casePlaceholderSrc}
                    src={build?.case?.imageUrl || placeholderByCategory?.Case?.imageUrl || casePlaceholderSrc}
                    alt={build?.case?.name || 'PC case'}
                    className="w-full h-36 rounded-md object-contain"
                    loading="lazy"
                    initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = casePlaceholderSrc;
                    }}
                  />
                </AnimatePresence>
              </div>
              <div className="mt-2 text-xs text-[var(--muted)]">Case</div>
              <div className="text-sm text-[var(--muted)] italic">{build?.case?.name || 'No case selected'}</div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-[var(--muted)]">Total Price</div>
              <div className="text-3xl font-semibold">{formatEur(animatedTotalPrice)}</div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-[var(--muted)]">Estimated Wattage</div>
              <div className="text-xs text-[var(--muted)] text-right -mt-4">{estimatedWattageRounded}W</div>

              <div className="mt-3 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round(psuUsageClamped * 100)}%`, background: psuFillColor }}
                />
              </div>

              <div className={`mt-2 flex items-center justify-between text-xs ${psuToneClass}`}>
                {hasPsuRating ? (
                  <>
                    <span>PSU usage: {psuUsagePercent}%</span>
                    <span>
                      {psuHeadroomW !== null && psuHeadroomW >= 0
                        ? `${psuHeadroomW}W headroom`
                        : psuHeadroomW !== null
                          ? `${Math.abs(psuHeadroomW)}W over`
                          : ''}
                    </span>
                  </>
                ) : (
                  <span>Select a PSU to see headroom.</span>
                )}
              </div>
            </div>

            <div
              className={`mt-4 rounded-md p-3 text-sm flex items-center gap-2 ${
                (saveNotice || compatStatus.ok)
                  ? 'bg-[color-mix(in_srgb,var(--primary)_12%,var(--surface))] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]'
                  : 'bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger-border)]'
              }`}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border currentColor">
                {(saveNotice || compatStatus.ok) ? '✓' : '!'}
              </span>
              {saveNotice ?? compatStatus.text}
            </div>

            {!saveNotice && (compat?.issues?.length ?? 0) > 0 && (
              <div className="mt-3 text-xs">
                <div className="text-[var(--muted)] font-semibold">Details</div>
                <div className="mt-2 space-y-1">
                  {(compat?.issues ?? []).map((issue, idx) => {
                    const sev = String(issue.severity || '').toLowerCase();
                    const tone =
                      sev === 'error'
                        ? 'text-[var(--danger-text)]'
                        : sev === 'warning'
                          ? 'text-[var(--warn)]'
                          : 'text-[var(--muted)]';
                    const partLabel = (issue.partName || '').trim() || String(issue.partCategory);
                    const withLabel = (issue.withPartName || '').trim() || (issue.withCategory ? String(issue.withCategory) : 'the build');
                    const reason = (issue.reason || '').trim();

                    return (
                      <div key={idx} className={`flex gap-2 ${tone}`}>
                        <span className="shrink-0">•</span>
                        <div className="min-w-0">
                          <span className="font-semibold">{partLabel}</span>
                          <span className="text-[var(--muted-2)]"> vs </span>
                          <span className="font-semibold">{withLabel}</span>
                          {reason ? <span className="text-[var(--muted-2)]"> — {reason}</span> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              disabled={!build?.id || saveToAccountMutation.isPending || !!build?.userId}
              onClick={() => {
                if (!build?.id) return;
                if (!isAuthenticated) {
                  const returnTo = buildId ? `/builder?buildId=${buildId}` : '/builder';
                  navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
                  return;
                }
                saveToAccountMutation.mutate();
              }}
              className="w-full mt-4 btn btn-primary text-sm"
            >
              {!isAuthenticated
                ? 'Sign in to save'
                : build?.userId
                  ? 'Saved'
                  : saveToAccountMutation.isPending
                    ? 'Saving…'
                    : 'Save Build'}
            </button>

            {/** Save notice now temporarily shows in the compatibility panel */}

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                disabled={!shareLink}
                onClick={async () => {
                  if (!shareLink) return;
                  const ok = await copyTextToClipboard(shareLink);
                  if (ok) toast.success('Share link copied.');
                  else toast.error('Could not copy share link.');
                }}
                className="btn btn-secondary text-sm"
              >
                Share
              </button>
              <button
                disabled={!build}
                onClick={() => {
                  const blob = new Blob([JSON.stringify(build, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `build-${build?.id ?? 'export'}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="btn btn-secondary text-sm"
              >
                Export
              </button>
            </div>
            {isLoading && <div className="mt-3 text-sm text-[var(--muted)]">Loading build...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

