import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildsApi, partsApi } from '../api/client';
import type { PartCategory, PartSelectionItem } from '../types';
import { formatEur } from '../utils/currency';

const CATEGORY_LABELS: Record<string, PartCategory> = {
  cpu: 'CPU',
  motherboard: 'Motherboard',
  ram: 'RAM',
  gpu: 'GPU',
  storage: 'Storage',
  psu: 'PSU',
  case: 'Case',
  cooler: 'Cooler',
};

export default function SelectPartPage() {
  const { category: categoryParam } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const category = categoryParam ? CATEGORY_LABELS[categoryParam.toLowerCase()] : undefined;
  const [buildId, setBuildId] = useState<number | undefined>(() => {
    const raw = localStorage.getItem('pcpp.buildId');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  });

  const pendingAddRef = useRef<number | null>(null);

  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>(15000);
  const [compatibleOnly, setCompatibleOnly] = useState(true);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 50;

  // Category-specific filters (derived from PartSelectionItem.specs)
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
    // Reset paging whenever server-side filters change.
    setPage(1);
  }, [category, buildId, compatibleOnly, search, brand, minPrice, maxPrice]);

  useEffect(() => {
    // Keep UX consistent: whenever filters change or page changes, scroll to top.
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
  });

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
  });

  const brandOptions = useMemo(() => selectionMeta?.manufacturers ?? [], [selectionMeta]);

  const createBuildMutation = useMutation({
    mutationFn: () => buildsApi.createBuild({ name: 'My Custom PC', totalPrice: 0, totalWattage: 0 }),
    onSuccess: async (r) => {
      localStorage.setItem('pcpp.buildId', String(r.data.id));
      setBuildId(r.data.id);

      const pendingPartId = pendingAddRef.current;
      if (typeof pendingPartId === 'number' && category) {
        pendingAddRef.current = null;
        await buildsApi.selectPart(r.data.id, { category, partId: pendingPartId });
        queryClient.invalidateQueries({ queryKey: ['build', r.data.id] });
        navigate('/');
      }
    },
  });

  const addPartMutation = useMutation({
    mutationFn: async (partId: number) => {
      if (!category) throw new Error('Unknown category');
      if (buildId) {
        await buildsApi.selectPart(buildId, { category, partId });
        return;
      }
      pendingAddRef.current = partId;
      await createBuildMutation.mutateAsync();
    },
    onSuccess: () => {
      if (buildId) {
        queryClient.invalidateQueries({ queryKey: ['build', buildId] });
        navigate('/');
      }
    },
  });

  if (!category) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto p-6">
          <p className="text-[#37b48f]">Unknown category.</p>
          <Link to="/" className="text-blue-600 underline">Back to Builder</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">← Back to Builder</Link>
            <h1 className="text-xl font-semibold text-gray-900">Select {category}</h1>
          </div>
          <div className="relative w-80">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${category}...`}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#37b48f]/30 focus:border-[#37b48f]"
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <aside className="bg-white rounded-lg border border-gray-200 p-4 h-fit shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>Filters</span>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">Compatibility</div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={compatibleOnly}
                onChange={(e) => setCompatibleOnly(e.target.checked)}
                disabled={!buildId}
                className="accent-[#37b48f]"
              />
              Show compatible only
            </label>
            {!buildId && (
              <div className="mt-2 text-xs text-gray-500">
                Tip: compatibility filtering requires an active build.
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-gray-500 mb-2">Brand</div>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#37b48f]/30 focus:border-[#37b48f]"
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
            <div className="text-xs font-semibold text-gray-500 mb-2">Price Range</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#37b48f]/30 focus:border-[#37b48f]"
                placeholder="0"
                min={0}
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#37b48f]/30 focus:border-[#37b48f]"
                placeholder="15000"
                min={0}
              />
            </div>
          </div>

          {(specConfig.select.length > 0 || specConfig.min.length > 0 || specConfig.max.length > 0) && (
            <div className="mt-6">
              <div className="text-xs font-semibold text-gray-500 mb-2">Specifications</div>

              {specConfig.select.map((s) => (
                <div key={s.key} className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                  <select
                    value={specSelectFilters[s.key] ?? ''}
                    onChange={(e) =>
                      setSpecSelectFilters((prev) => ({
                        ...prev,
                        [s.key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#37b48f]/30 focus:border-[#37b48f]"
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
                  <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                  <input
                    type="number"
                    value={specMinFilters[s.key] ?? ''}
                    onChange={(e) =>
                      setSpecMinFilters((prev) => ({
                        ...prev,
                        [s.key]: e.target.value === '' ? '' : Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#37b48f]/30 focus:border-[#37b48f]"
                    min={0}
                    placeholder="0"
                  />
                </div>
              ))}

              {specConfig.max.map((s) => (
                <div key={s.key} className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                  <input
                    type="number"
                    value={specMaxFilters[s.key] ?? ''}
                    onChange={(e) =>
                      setSpecMaxFilters((prev) => ({
                        ...prev,
                        [s.key]: e.target.value === '' ? '' : Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-[#37b48f]/30 focus:border-[#37b48f]"
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
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear filters
            </button>
          </div>
        </aside>

        <main className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {totalCount > 0 ? (
                <span>
                  Showing {items.length} of {totalCount} parts (page {page} of {totalPages})
                </span>
              ) : (
                <span>Showing {items.length} parts</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              After spec filters: {visibleItems.length}
            </div>
          </div>

          <div className="grid grid-cols-[80px_1fr_1fr_120px_120px] gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500">
            <div>IMAGE</div>
            <div>PRODUCT</div>
            <div>SPECS</div>
            <div className="text-right">PRICE</div>
            <div className="text-right">ACTION</div>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading...</div>
          ) : isError ? (
            <div className="p-6 text-sm text-gray-600">
              <div className="font-semibold text-gray-900">Failed to load parts.</div>
              <div className="mt-2 text-xs text-gray-500 break-words">
                {String((error as any)?.message ?? error ?? 'Unknown error')}
              </div>
            </div>
          ) : isFetching && items.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">Loading...</div>
          ) : visibleItems.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">No parts found.</div>
          ) : (
            <div>
              {visibleItems.map((item: PartSelectionItem) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[80px_1fr_1fr_120px_120px] gap-4 px-4 py-4 border-b border-gray-100 items-center hover:bg-gray-50"
                >
                  <img
                    src={item.imageUrl!}
                    alt={item.name}
                    className="w-10 h-10 rounded bg-white border border-gray-200 object-cover"
                    loading="lazy"
                  />
                  <div>
                    <Link
                      to={`/parts/${categoryParam?.toLowerCase()}/${item.id}`}
                      state={{ returnTo: `${location.pathname}${location.search}` }}
                      className="font-semibold text-gray-900 hover:underline"
                      title="View details"
                    >
                      {item.name}
                    </Link>
                    <div className="text-sm text-gray-500">{item.manufacturer}</div>
                    {!item.isCompatible && item.incompatibilityReasons.length > 0 && (
                      <div className="mt-1 text-xs text-[#37b48f]">
                        {item.incompatibilityReasons[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(item.specs || {})
                      .filter(([, v]) => !isPlaceholderSpecValue(v))
                      .map(([k, v]) => (
                        <span key={k} className="text-xs bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700">
                          {k}: {v}
                        </span>
                      ))}
                  </div>
                  <div className="text-right font-semibold">{formatEur(Number(item.price))}</div>
                  <div className="text-right">
                    <button
                      disabled={!item.isCompatible || addPartMutation.isPending}
                      onClick={() => addPartMutation.mutate(item.id)}
                      className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                        item.isCompatible
                          ? 'bg-[#37b48f]/15 text-[#2ea37f] hover:bg-[#37b48f]/25'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}

              <div className="px-4 py-4 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {totalCount > 0 ? `Total: ${totalCount} part(s)` : `Showing ${items.length} part(s)`}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!canGoPrev}
                    className={`px-3 py-2 rounded-md border text-sm ${
                      canGoPrev
                        ? 'bg-white hover:bg-gray-50 text-gray-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Prev
                  </button>
                  <div className="text-sm text-gray-700">
                    Page {page} / {totalPages}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!canGoNext}
                    className={`px-3 py-2 rounded-md border text-sm ${
                      canGoNext
                        ? 'bg-white hover:bg-gray-50 text-gray-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
