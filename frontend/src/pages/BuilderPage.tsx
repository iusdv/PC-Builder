import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
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

type Slot = {
  label: string;
  category: PartCategory;
  selectedName?: string;
  selectedImageUrl?: string;
  selectedPrice?: number | null;
};

export default function BuilderPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('My Custom PC');
  const [compat, setCompat] = useState<CompatibilityCheckResult | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const partPlaceholderSrc = '/placeholder-part.svg';
  const casePlaceholderSrc = '/placeholder-case.svg';

  const placeholderCategories: PartCategory[] = useMemo(
    () => ['CPU', 'Cooler', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU', 'Case', 'CaseFan'],
    [],
  );

  const [buildId, setBuildId] = useState<number | undefined>(() => loadActiveBuildId());
  const [recentBuildIds, setRecentBuildIds] = useState<number[]>(() => loadRecentBuildIds());

  // Allow deep-linking into a specific build id.
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

    // Prefer re-using an existing build (local recent list, or saved builds when authenticated).
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
      if (!myBuildsRecoveryQuery.isSuccess && !myBuildsRecoveryQuery.isError) return; // wait for query

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

  // Keep draft builds alive for a short period after leaving the site.
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
    onSuccess: async () => {
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
        { label: 'CPU', category: 'CPU' },
        { label: 'CPU Cooler', category: 'Cooler' },
        { label: 'Motherboard', category: 'Motherboard' },
        { label: 'RAM', category: 'RAM' },
        { label: 'GPU', category: 'GPU' },
        { label: 'Storage', category: 'Storage' },
        { label: 'Power Supply', category: 'PSU' },
        { label: 'Case', category: 'Case' },
        { label: 'Case Fan', category: 'CaseFan' },
      ];
    }

    return [
      { label: 'CPU', category: 'CPU', selectedName: build.cpu?.name, selectedImageUrl: build.cpu?.imageUrl, selectedPrice: build.cpu?.price },
      { label: 'CPU Cooler', category: 'Cooler', selectedName: build.cooler?.name, selectedImageUrl: build.cooler?.imageUrl, selectedPrice: build.cooler?.price },
      { label: 'Motherboard', category: 'Motherboard', selectedName: build.motherboard?.name, selectedImageUrl: build.motherboard?.imageUrl, selectedPrice: build.motherboard?.price },
      { label: 'RAM', category: 'RAM', selectedName: build.ram?.name, selectedImageUrl: build.ram?.imageUrl, selectedPrice: build.ram?.price },
      { label: 'GPU', category: 'GPU', selectedName: build.gpu?.name, selectedImageUrl: build.gpu?.imageUrl, selectedPrice: build.gpu?.price },
      { label: 'Storage', category: 'Storage', selectedName: build.storage?.name, selectedImageUrl: build.storage?.imageUrl, selectedPrice: build.storage?.price },
      { label: 'Power Supply', category: 'PSU', selectedName: build.psu?.name, selectedImageUrl: build.psu?.imageUrl, selectedPrice: build.psu?.price },
      { label: 'Case', category: 'Case', selectedName: build.case?.name, selectedImageUrl: build.case?.imageUrl, selectedPrice: build.case?.price },
      { label: 'Case Fan', category: 'CaseFan', selectedName: build.caseFan?.name, selectedImageUrl: build.caseFan?.imageUrl, selectedPrice: build.caseFan?.price },
    ];
  }, [build]);

  const compatStatus = useMemo(() => {
    if (!compat) return { ok: true, text: 'Checking compatibility…' };
    if (!compat.isCompatible) return { ok: false, text: compat.errors[0] || 'Parts are not compatible.' };
    return { ok: true, text: 'All parts are compatible.' };
  }, [compat]);

  const shareLink = useMemo(() => {
    if (!build?.shareCode) return '';
    return `${window.location.origin}/share/${build.shareCode}`;
  }, [build?.shareCode]);

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

  return (
    <div className="min-h-screen bg-[#f4f4f3]">
      <div className="bg-[#545578]">
        <div className="container mx-auto px-6 py-6 text-white">
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
                  className="text-3xl font-semibold bg-white text-gray-900 border border-white/40 rounded px-3 py-2"
                />
              ) : (
                <div>
                  <h1 className="text-3xl font-semibold text-white">{build?.name || nameDraft}</h1>
                  {buildId ? <div className="mt-1 text-xs text-white/70">Build #{buildId}</div> : null}
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
                className="text-white/70 hover:text-white"
                title="Rename"
              >
                ✎
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!!(recentBuildsQuery.data?.length) && (
                <label className="text-sm text-white/80 inline-flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/70">Active</span>
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
                    className="border rounded px-3 py-2 text-sm bg-white text-gray-900"
                  >
                    {recentBuildsQuery.data.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (#{b.id})
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
                className="border border-white/30 bg-white text-gray-900 rounded px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:text-gray-400"
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
                className="border border-white/30 bg-white text-gray-900 rounded px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:text-gray-400"
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
                className="border border-white/30 bg-white text-gray-900 rounded px-4 py-2 text-sm font-semibold hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:text-gray-400"
                title="Delete build"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            {slots.map((slot) => {
              const canRemove = !!slot.selectedName;
              const slotPlaceholderImageUrl = placeholderByCategory?.[slot.category]?.imageUrl;
              const slotImageSrc = slot.selectedImageUrl || slotPlaceholderImageUrl || partPlaceholderSrc;

              return (
                <div key={slot.label} className="px-4 py-4 flex items-center justify-between border-b last:border-b-0">
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={slotImageSrc}
                      alt={slot.selectedName || slot.label}
                      className="w-12 h-12 object-contain"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = partPlaceholderSrc;
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-500">{slot.label.toUpperCase()}</div>
                      <div className="text-sm text-gray-700 italic truncate" title={slot.selectedName || slot.label}>
                        {slot.selectedName ? slot.selectedName : 'No part selected'}
                      </div>
                      {slot.selectedName && typeof slot.selectedPrice === 'number' && (
                        <div className="mt-0.5 text-xs font-semibold text-gray-900">{formatEur(Number(slot.selectedPrice))}</div>
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
                        className="w-9 h-9 inline-flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                        disabled={!build?.id || setPartMutation.isPending}
                      >
                        −
                      </button>
                    )}
                    <Link
                      to={`/select/${categoryToSlug(slot.category)}`}
                      className="px-4 py-2 rounded font-semibold text-sm inline-flex items-center gap-2 bg-[#37b48f] text-white hover:bg-[#2ea37f]"
                    >
                      <span className="text-base leading-none">+</span>
                      {canRemove ? 'Change' : 'Choose'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-lg border p-5 h-fit shadow-sm">
            <div className="text-sm font-semibold text-gray-700">Build Summary</div>

            <div className="mt-4">
              <img
                src={build?.case?.imageUrl || placeholderByCategory?.Case?.imageUrl || casePlaceholderSrc}
                alt={build?.case?.name || 'PC case'}
                className="w-full h-36 rounded-md object-contain"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = casePlaceholderSrc;
                }}
              />
              <div className="mt-2 text-xs text-gray-500">Case</div>
              <div className="text-sm text-gray-700 italic">{build?.case?.name || 'No case selected'}</div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-gray-500">Total Price</div>
              <div className="text-3xl font-semibold">{formatEur(Number(build?.totalPrice ?? 0))}</div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-gray-500">Estimated Wattage</div>
              <div className="text-xs text-gray-500 text-right -mt-4">{Number(build?.totalWattage ?? 0)}W</div>
              <div className="mt-3 h-1 bg-gray-100 rounded" />
            </div>

            <div
              className={`mt-4 rounded-md p-3 text-sm flex items-center gap-2 ${
                compatStatus.ok ? 'bg-green-50 text-green-700' : 'bg-[#37b48f]/15 text-[#2ea37f]'
              }`}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border currentColor">
                {compatStatus.ok ? '✓' : '!'}
              </span>
              {compatStatus.text}
            </div>

            <button
              disabled={!build?.id || saveToAccountMutation.isPending || !!build?.userId}
              onClick={() => {
                if (!build?.id) return;
                if (!isAuthenticated) {
                  navigate(`/login?returnTo=${encodeURIComponent('/')}`);
                  return;
                }
                saveToAccountMutation.mutate();
              }}
              className="w-full mt-4 bg-[#37b48f] text-white py-3 rounded font-semibold hover:bg-[#2ea37f] disabled:bg-[#37b48f]/50"
            >
              {!isAuthenticated
                ? 'Sign in to save'
                : build?.userId
                  ? 'Saved'
                  : saveToAccountMutation.isPending
                    ? 'Saving…'
                    : 'Save Build'}
            </button>

            {isAuthenticated && saveNotice && (
              <div className="mt-2 text-xs text-gray-600">{saveNotice}</div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                disabled={!shareLink}
                onClick={async () => {
                  if (!shareLink) return;
                  const ok = await copyTextToClipboard(shareLink);
                  setShareNotice(ok ? 'Share link copied.' : 'Could not copy share link.');
                  window.setTimeout(() => setShareNotice(null), 2500);
                }}
                className="border rounded py-2 text-sm font-semibold hover:bg-gray-50 disabled:text-gray-400"
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
                className="border rounded py-2 text-sm font-semibold hover:bg-gray-50 disabled:text-gray-400"
              >
                Export
              </button>
            </div>

            {shareNotice && <div className="mt-2 text-xs text-gray-600">{shareNotice}</div>}

            {isLoading && <div className="mt-3 text-sm text-gray-600">Loading build...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
