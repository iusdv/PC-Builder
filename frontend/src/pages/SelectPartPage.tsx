import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  const [maxPrice, setMaxPrice] = useState<number | ''>(5000);
  const [compatibleOnly, setCompatibleOnly] = useState(true);

  const { data: items = [], isLoading, isError, error } = useQuery({
    queryKey: ['parts-select', category, buildId, search, brand, minPrice, maxPrice, compatibleOnly],
    queryFn: () =>
      partsApi
        .getSelection({
          category: category!,
          buildId,
          compatibleOnly: !!buildId && compatibleOnly,
          search: search || undefined,
          manufacturer: brand || undefined,
          minPrice: minPrice === '' ? undefined : minPrice,
          maxPrice: maxPrice === '' ? undefined : maxPrice,
          page: 1,
          pageSize: 200,
        })
        .then((r) => r.data),
    enabled: !!category,
  });

  const visibleItems = useMemo(() => items.filter((i) => !!i.imageUrl), [items]);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of visibleItems) set.add(item.manufacturer);
    return Array.from(set).sort();
  }, [visibleItems]);

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
                placeholder="5000"
                min={0}
              />
            </div>
          </div>
        </aside>

        <main className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
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
                    {Object.entries(item.specs || {}).map(([k, v]) => (
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
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
