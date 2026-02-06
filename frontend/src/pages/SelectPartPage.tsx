import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import axios from 'axios';
import { buildsApi, partsApi } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { PartCategory, PartSelectionItem } from '../types';
import { addRecentBuildId, loadActiveBuildId, loadRecentBuildIds, saveActiveBuildId } from '../utils/buildStorage';
import { formatEur } from '../utils/currency';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';

const CATEGORY_LABELS: Record<string, PartCategory> = {
  cpu: 'CPU',
  motherboard: 'Motherboard',
  ram: 'RAM',
  gpu: 'GPU',
  storage: 'Storage',
  psu: 'PSU',
  case: 'Case',
  cooler: 'Cooler',
  casefan: 'CaseFan',
};

export default function SelectPartPage() {
  const { category: categoryParam } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const category = categoryParam ? CATEGORY_LABELS[categoryParam.toLowerCase()] : undefined;
  const [buildId, setBuildId] = useState<number | undefined>(() => {
    return loadActiveBuildId();
  });

  const [buildMissingRecovered, setBuildMissingRecovered] = useState(false);

  const pendingAddRef = useRef<number | null>(null);

  const [loadingTooLong, setLoadingTooLong] = useState(false);

  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>(15000);
  const [compatibleOnly, setCompatibleOnly] = useState(true);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 50;

  // Category-specific filters
  const [specSelectFilters, setSpecSelectFilters] = useState<Record<string, string>>({});
  const [specMinFilters, setSpecMinFilters] = useState<Record<string, number | ''>>({});
  const [specMaxFilters, setSpecMaxFilters] = useState<Record<string, number | ''>>({});

  useEffect(() => {
    // Reset spec filters when switching category
    setSpecSelectFilters({});
    setSpecMinFilters({});
    setSpecMaxFilters({});
  }, [category]);

  useEffect(() => {
    
    setPage(1);
  }, [category, buildId, compatibleOnly, search, brand, minPrice, maxPrice]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [category, search, brand, minPrice, maxPrice, compatibleOnly, page]);

  const parseFirstNumber = (value: unknown): number | null => {
    if (typeof value !== 'string') return null;
    const s = value.trim();
    if (!s || s === '-' || s.toLowerCase() === 'n/a') return null;
    const m = s.match(/-?\d+(?:[\.,]\d+)?/);
    if (!m) return null;
    const n = Number(m[0].replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const isPlaceholderSpecValue = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    const s = String(value).trim();
    if (!s) return true;
    const lower = s.toLowerCase();
    return lower === '-' || lower === 'n/a' || lower === 'unknown' || lower === '0';
  };

  const specConfig = useMemo(() => {
    const common = {
      select: [] as Array<{ key: string; label: string }>,
      min: [] as Array<{ key: string; label: string }>,
      max: [] as Array<{ key: string; label: string }>,
    };

    switch (category) {
      case 'CPU':
        return {
          select: [{ key: 'socket', label: 'Socket' }],
          min: [{ key: 'cores', label: 'Min cores' }],
          max: [],
        };
      case 'Cooler':
        return {
          select: [
            { key: 'type', label: 'Cooler type' },
          ],
          min: [],
          max: [
            { key: 'height', label: 'Max height (mm)' },
            { key: 'radiator', label: 'Max radiator (mm)' },
          ],
        };
      case 'Motherboard':
        return {
          select: [
            { key: 'socket', label: 'Socket' },
            { key: 'form', label: 'Form factor' },
            { key: 'memory', label: 'Memory type' },
          ],
          min: [],
          max: [],
        };
      case 'RAM':
        return {
          select: [{ key: 'type', label: 'RAM type' }],
          min: [
            { key: 'capacity', label: 'Min capacity (GB)' },
            { key: 'speed', label: 'Min speed (MHz)' },
          ],
          max: [],
        };
      case 'GPU':
        return {
          select: [{ key: 'chipset', label: 'Chipset' }],
          min: [{ key: 'memory', label: 'Min VRAM (GB)' }],
          max: [{ key: 'length', label: 'Max length (mm)' }],
        };
      case 'Storage':
        return {
          select: [
            { key: 'type', label: 'Storage type' },
            { key: 'interface', label: 'Interface' },
          ],
          min: [{ key: 'capacity', label: 'Min capacity (GB)' }],
          max: [],
        };
      case 'PSU':
        return {
          select: [
            { key: 'efficiency', label: 'Efficiency' },
            { key: 'modular', label: 'Modular' },
          ],
          min: [{ key: 'rating', label: 'Min wattage (W)' }],
          max: [],
        };
      case 'Case':
        return {
          select: [
            { key: 'form', label: 'Form factor' },
            { key: 'color', label: 'Color' },
          ],
          min: [{ key: 'maxGpu', label: 'Min GPU clearance (mm)' }],
          max: [],
        };
      default:
        return common;
    }
  }, [category]);

  const {
    data: selection,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['parts-select', category, buildId, compatibleOnly, search, brand, minPrice, maxPrice, page, PAGE_SIZE],
    queryFn: async () => {
      const r = await partsApi.getSelection({
        category: category!,
        buildId,
        compatibleOnly: !!buildId && compatibleOnly,
        search: search || undefined,
        manufacturer: brand || undefined,
        minPrice: minPrice === '' ? undefined : minPrice,
        maxPrice: maxPrice === '' ? undefined : maxPrice,
        page,
        pageSize: PAGE_SIZE,
      });
      return r.data;
    },
    enabled: !!category,
    placeholderData: (prev) => prev,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading) {
      setLoadingTooLong(false);
      return;
    }
    const t = window.setTimeout(() => setLoadingTooLong(true), 4000);
    return () => window.clearTimeout(t);
  }, [isLoading]);

  
  useEffect(() => {
    if (!isError || !buildId) return;
    if (!axios.isAxiosError(error)) return;

    const status = error.response?.status;
    const msg = (error.response?.data as any)?.message;
    const isBuildNotFound = status === 404 && typeof msg === 'string' && msg.toLowerCase().includes('build not found');
    if (!isBuildNotFound) return;

    saveActiveBuildId(undefined);
    setBuildId(undefined);
    setBuildMissingRecovered(true);
  }, [isError, error, buildId]);

  const items = useMemo(() => selection?.items ?? [], [selection]);
  const totalCount = selection?.totalCount ?? 0;
  const totalPages = totalCount > 0 ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : 1;
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const baseItems = useMemo(() => items.filter((i) => !!i.imageUrl), [items]);

  const specOptions = useMemo(() => {
    const optionsByKey: Record<string, string[]> = {};
    const keys = [...specConfig.select.map((s) => s.key)];
    for (const key of keys) {
      const set = new Set<string>();
      for (const item of baseItems) {
        const v = (item.specs || {})[key];
        if (!v || v === '-' || v.toLowerCase() === 'n/a') continue;
        set.add(v);
      }
      optionsByKey[key] = Array.from(set).sort((a, b) => a.localeCompare(b));
    }
    return optionsByKey;
  }, [baseItems, specConfig.select]);

  const visibleItems = useMemo(() => {
    return baseItems.filter((item) => {
      for (const s of specConfig.select) {
        const selected = (specSelectFilters[s.key] ?? '').trim();
        if (!selected) continue;
        if (((item.specs || {})[s.key] ?? '') !== selected) return false;
      }

      for (const s of specConfig.min) {
        const min = specMinFilters[s.key];
        if (min === '' || min === undefined) continue;
        const n = parseFirstNumber((item.specs || {})[s.key]);
        if (n === null || n < Number(min)) return false;
      }

      for (const s of specConfig.max) {
        const max = specMaxFilters[s.key];
        if (max === '' || max === undefined) continue;
        const n = parseFirstNumber((item.specs || {})[s.key]);
        if (n === null || n > Number(max)) return false;
      }

      return true;
    });
  }, [baseItems, specConfig, specSelectFilters, specMinFilters, specMaxFilters]);

  const { data: selectionMeta } = useQuery({
    queryKey: ['parts-select-meta', category, search, minPrice, maxPrice],
    queryFn: async () => {
      const r = await partsApi.getSelectionMeta({
        category: category!,
        search: search || undefined,
        minPrice: minPrice === '' ? undefined : minPrice,
        maxPrice: maxPrice === '' ? undefined : maxPrice,
      });
      return r.data;
    },
    enabled: !!category,
    retry: false,
  });

  const brandOptions = useMemo(() => selectionMeta?.manufacturers ?? [], [selectionMeta]);

  const addPartMutation = useMutation({
    mutationFn: async (partId: number) => {
      if (!category) throw new Error('Unknown category');

      const tryUseBuild = async (id: number, opts?: { saved?: boolean }) => {
        await buildsApi.selectPart(id, { category, partId });
        saveActiveBuildId(id);
        addRecentBuildId(id, 10, opts);
        setBuildId(id);
        return id;
      };

      if (buildId) {
        return await tryUseBuild(buildId);
      }

      // Prefer re-using any recent build before creating a new one.
      const recent = loadRecentBuildIds();
      for (const candidateId of recent) {
        try {
          return await tryUseBuild(candidateId);
        } catch (e) {
          if (axios.isAxiosError(e)) {
            const status = e.response?.status;
            if (status === 404 || status === 401 || status === 403) {
              continue;
            }
          }
          throw e;
        }
      }

      if (isAuthenticated) {
        try {
          const mine = await buildsApi.getMyBuilds().then((r) => r.data);
          for (const b of mine) {
            if (!b?.id) continue;
            try {
              return await tryUseBuild(b.id, { saved: true });
            } catch (e) {
              if (axios.isAxiosError(e)) {
                const status = e.response?.status;
                if (status === 404 || status === 401 || status === 403) continue;
              }
              throw e;
            }
          }
        } catch {
          // Ignore (ownership disabled or not authorized) and fall back to create.
        }
      }

      // No reusable build exists → create one.
      pendingAddRef.current = partId;
      const created = await buildsApi.createBuild({ name: 'My Custom PC', totalPrice: 0, totalWattage: 0 }).then((r) => r.data);
      await buildsApi.selectPart(created.id, { category, partId });
      saveActiveBuildId(created.id);
      addRecentBuildId(created.id, 10, { saved: false });
      setBuildId(created.id);
      pendingAddRef.current = null;
      return created.id;
    },
    onSuccess: (usedBuildId) => {
      queryClient.invalidateQueries({ queryKey: ['build', usedBuildId] });
      navigate('/builder');
    },
  });

  const partPlaceholderSrc = '/placeholder-part.svg';
  const casePlaceholderSrc = '/placeholder-case.svg';
  const fallbackImg = category === 'Case' ? casePlaceholderSrc : partPlaceholderSrc;

  const shouldReduceMotion = useReducedMotion();

  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    setIntroDone(false);
  }, [category]);
  useEffect(() => {
    if (shouldReduceMotion) return;
    if (introDone) return;
    if (isLoading) return;
    if (visibleItems.length === 0) return;
    setIntroDone(true);
  }, [shouldReduceMotion, introDone, isLoading, visibleItems.length]);

  const runIntro = !shouldReduceMotion && !introDone;

  const galleryVariants = useMemo<Variants>(
    () => ({
      hidden: { opacity: 1 },
      show: {
        opacity: 1,
        transition: shouldReduceMotion
          ? { duration: 0 }
          : {
              staggerChildren: 0.035,
              delayChildren: 0.05,
            },
      },
    }),
    [shouldReduceMotion]
  );

  const cardVariants = useMemo<Variants>(
    () => ({
      hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
      show: {
        opacity: 1,
        y: 0,
        transition: shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
            },
      },
    }),
    [shouldReduceMotion]
  );

  const friendlyError = useMemo(() => {
    if (!isError) return null;

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const msg = (error.response?.data as any)?.message;

      if (status === 404 && typeof msg === 'string' && msg.toLowerCase().includes('build not found')) {
        return {
          title: 'Your saved build no longer exists.',
          detail: 'This usually happens after a database reset. The page will recover automatically.',
        };
      }

      if (!error.response) {
        return {
          title: 'Backend is offline or unreachable.',
          detail: 'Start the API and refresh the page.',
        };
      }

      if (status === 404) {
        return {
          title: 'API endpoint not found (404).',
          detail: 'Check VITE_API_BASE_URL / backend URL and try again.',
        };
      }

      return {
        title: 'Failed to load parts.',
        detail: `Request failed (${status ?? 'unknown'}).`,
      };
    }

    return {
      title: 'Failed to load parts.',
      detail: 'Unknown error.',
    };
  }, [isError, error]);

  if (!category) {
    return (
      <PageShell title="Select Part" subtitle="Unknown category" backTo="/builder" backLabel="Back to Builder">
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">Unknown category.</p>
          <div className="mt-3">
            <Link to="/builder" className="btn btn-primary text-sm">
              Back to Builder
            </Link>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`Select ${category}`}
      backTo="/builder"
      backLabel="Back to Builder"
      right={
        <div className="w-80">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${category}...`} className="w-full" />
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <Card className="p-4 h-fit">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>Filters</span>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-[var(--muted)] mb-2">Compatibility</div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={compatibleOnly}
                onChange={(e) => setCompatibleOnly(e.target.checked)}
                disabled={!buildId}
                className="accent-[var(--primary)]"
              />
              Show compatible only
            </label>
            {!buildId && (
              <div className="mt-2 text-xs text-[var(--muted)]">
                Tip: compatibility filtering requires an active build.
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-[var(--muted)] mb-2">Brand</div>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="app-input w-full px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-[var(--muted)] mb-2">Price Range</div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <Input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                min={0}
                className="w-full min-w-0"
              />
              <span className="text-[var(--muted-2)]">-</span>
              <Input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="15000"
                min={0}
                className="w-full min-w-0"
              />
            </div>
          </div>

          {(specConfig.select.length > 0 || specConfig.min.length > 0 || specConfig.max.length > 0) && (
            <div className="mt-6">
              <div className="text-xs font-semibold text-[var(--muted)] mb-2">Specifications</div>

              {specConfig.select.map((s) => (
                <div key={s.key} className="mb-3">
                  <div className="text-xs text-[var(--muted)] mb-1">{s.label}</div>
                  <select
                    value={specSelectFilters[s.key] ?? ''}
                    onChange={(e) =>
                      setSpecSelectFilters((prev) => ({
                        ...prev,
                        [s.key]: e.target.value,
                      }))
                    }
                    className="app-input w-full px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    {(specOptions[s.key] ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {specConfig.min.map((s) => (
                <div key={s.key} className="mb-3">
                  <div className="text-xs text-[var(--muted)] mb-1">{s.label}</div>
                  <Input
                    type="number"
                    value={specMinFilters[s.key] ?? ''}
                    onChange={(e) =>
                      setSpecMinFilters((prev) => ({
                        ...prev,
                        [s.key]: e.target.value === '' ? '' : Number(e.target.value),
                      }))
                    }
                    min={0}
                    placeholder="0"
                  />
                </div>
              ))}

              {specConfig.max.map((s) => (
                <div key={s.key} className="mb-3">
                  <div className="text-xs text-[var(--muted)] mb-1">{s.label}</div>
                  <Input
                    type="number"
                    value={specMaxFilters[s.key] ?? ''}
                    onChange={(e) =>
                      setSpecMaxFilters((prev) => ({
                        ...prev,
                        [s.key]: e.target.value === '' ? '' : Number(e.target.value),
                      }))
                    }
                    className="w-full"
                    min={0}
                    placeholder=""
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setBrand('');
                setMinPrice('');
                setMaxPrice(15000);
                setCompatibleOnly(true);
                setPage(1);
                setSpecSelectFilters({});
                setSpecMinFilters({});
                setSpecMaxFilters({});
              }}
              className="w-full btn btn-secondary text-sm"
            >
              Clear filters
            </button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          {buildMissingRecovered && (
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[rgba(55,180,143,0.12)] text-sm text-[var(--muted)]">
              Your previous build was cleared (DB reset). Compatibility filtering is disabled until you create/select a build again.
            </div>
          )}
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
            <div className="text-sm text-[var(--muted)]">
              {totalCount > 0 ? (
                <span>
                  Showing {items.length} of {totalCount} parts (page {page} of {totalPages})
                </span>
              ) : (
                <span>Showing {items.length} parts</span>
              )}
            </div>
            <div className="text-xs text-[var(--muted)]">
              After spec filters: {visibleItems.length}
            </div>
          </div>

          {isLoading ? (
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="app-card overflow-hidden">
                    <Skeleton className="h-44 w-full border-0" />
                    <div className="p-4">
                      <Skeleton variant="line" className="h-4 w-11/12 border-0" />
                      <Skeleton variant="line" className="mt-2 h-3 w-7/12 border-0" />
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Skeleton variant="line" className="h-8 w-full border-0" />
                        <Skeleton variant="line" className="h-8 w-full border-0" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {loadingTooLong && (
                <div className="mt-4 text-xs text-[var(--muted-2)]">
                  This is taking longer than usual — the backend may be offline.
                </div>
              )}
            </div>
          ) : isError ? (
            <div className="p-6 text-sm text-[var(--muted)]">
              <div className="font-semibold text-[var(--text)]">{friendlyError?.title ?? 'Failed to load parts.'}</div>
              <div className="mt-2 text-xs text-[var(--muted-2)] break-words">{friendlyError?.detail ?? ''}</div>
            </div>
          ) : isFetching && items.length === 0 ? (
            <div className="p-6 text-sm text-[var(--muted)]">Loading...</div>
          ) : visibleItems.length === 0 ? (
            <div className="p-6 text-sm text-[var(--muted)]">No parts found.</div>
          ) : (
            <div>
              <motion.div
                variants={galleryVariants}
                initial={runIntro ? 'hidden' : false}
                animate="show"
                className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {visibleItems.map((item: PartSelectionItem) => {
                  const specEntries = Object.entries(item.specs || {}).filter(([, v]) => !isPlaceholderSpecValue(v));
                  const shownSpecs = specEntries.slice(0, 6);
                  const moreCount = Math.max(0, specEntries.length - shownSpecs.length);

                  return (
                    <motion.div
                      key={item.id}
                      variants={cardVariants}
                      layout
                      whileHover={
                        shouldReduceMotion
                          ? undefined
                          : {
                              y: -3,
                              scale: 1.01,
                            }
                      }
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.995 }}
                      transition={shouldReduceMotion ? undefined : { type: 'spring', stiffness: 350, damping: 26 }}
                      className="group app-card overflow-hidden flex flex-col"
                    >
                      <Link
                        to={`/parts/${categoryParam?.toLowerCase()}/${item.id}`}
                        state={{ returnTo: `${location.pathname}${location.search}` }}
                        title="View details"
                        className="block h-44 p-3 bg-transparent focus:outline-none"
                      >
                        <div className="h-full flex items-center justify-center">
                          <img
                            src={item.imageUrl!}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = fallbackImg;
                            }}
                          />
                        </div>
                      </Link>

                      <div className="px-4 pb-4 flex flex-col flex-1">
                        <Link
                          to={`/parts/${categoryParam?.toLowerCase()}/${item.id}`}
                          state={{ returnTo: `${location.pathname}${location.search}` }}
                          className="mt-1 block font-semibold text-[var(--text)] leading-snug no-underline hover:no-underline"
                          title="View details"
                          style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {item.name}
                        </Link>
                        <div className="mt-1 text-sm text-[var(--muted)]">{item.manufacturer}</div>

                        <div className="mt-2 min-h-[1rem] text-xs text-[var(--danger-text)]">
                          {!item.isCompatible && item.incompatibilityReasons.length > 0 ? item.incompatibilityReasons[0] : ''}
                        </div>

                        {shownSpecs.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {shownSpecs.map(([k, v]) => (
                              <span key={k} className="text-[11px] bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text)]">
                                {k}: {v}
                              </span>
                            ))}
                            {moreCount > 0 && (
                              <span className="text-[11px] bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1 text-[var(--muted)]">
                                +{moreCount} more
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-auto pt-4">
                          <div className="flex items-center justify-between">
                            <div className="text-base font-semibold text-[var(--text)]">{formatEur(Number(item.price))}</div>
                            <div className="text-xs text-[var(--muted)]">{item.category}</div>
                          </div>

                          <button
                            disabled={!item.isCompatible || addPartMutation.isPending}
                            onClick={() => addPartMutation.mutate(item.id)}
                            className={`mt-4 w-full btn text-sm ${
                              item.isCompatible ? 'btn-primary' : 'btn-secondary cursor-not-allowed'
                            }`}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              <div className="px-4 py-4 flex items-center justify-between">
                <div className="text-xs text-[var(--muted)]">
                  {totalCount > 0 ? `Total: ${totalCount} part(s)` : `Showing ${items.length} part(s)`}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!canGoPrev}
                    className="btn btn-secondary text-sm"
                  >
                    Prev
                  </button>
                  <div className="text-sm text-[var(--muted)]">
                    Page {page} / {totalPages}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!canGoNext}
                    className="btn btn-secondary text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
