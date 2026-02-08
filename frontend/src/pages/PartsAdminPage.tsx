import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { partsApi } from '../api/client';
import type { Part, PartCategory } from '../types';
import { formatEur } from '../utils/currency';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const CATEGORY_BADGES: Record<PartCategory, string> = {
  CPU: 'bg-[color-mix(in_srgb,var(--primary)_16%,var(--surface))] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_42%,var(--border))]',
  Motherboard: 'bg-[color-mix(in_srgb,var(--primary)_16%,var(--surface))] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_42%,var(--border))]',
  RAM: 'bg-[color-mix(in_srgb,var(--accent-cyan)_16%,var(--surface))] text-[var(--accent-cyan)] border border-[color-mix(in_srgb,var(--accent-cyan)_42%,var(--border))]',
  GPU: 'bg-[color-mix(in_srgb,var(--primary)_16%,var(--surface))] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_42%,var(--border))]',
  Storage: 'bg-[color-mix(in_srgb,var(--accent-cyan)_16%,var(--surface))] text-[var(--accent-cyan)] border border-[color-mix(in_srgb,var(--accent-cyan)_42%,var(--border))]',
  PSU: 'bg-[color-mix(in_srgb,var(--accent-yellow)_18%,var(--surface))] text-[var(--accent-yellow)] border border-[color-mix(in_srgb,var(--accent-yellow)_42%,var(--border))]',
  Case: 'bg-[color-mix(in_srgb,var(--primary)_16%,var(--surface))] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_42%,var(--border))]',
  Cooler: 'bg-[color-mix(in_srgb,var(--accent-cyan)_16%,var(--surface))] text-[var(--accent-cyan)] border border-[color-mix(in_srgb,var(--accent-cyan)_42%,var(--border))]',
  CaseFan: 'bg-[color-mix(in_srgb,var(--accent-yellow)_18%,var(--surface))] text-[var(--accent-yellow)] border border-[color-mix(in_srgb,var(--accent-yellow)_42%,var(--border))]',
};

export default function PartsAdminPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PartCategory | ''>('');
  const [manufacturer, setManufacturer] = useState('');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [sort, setSort] = useState<string>('');
  const [includeNoImage, setIncludeNoImage] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [loadingTooLong, setLoadingTooLong] = useState(false);

  const { data: parts = [], isLoading, isError, error } = useQuery<Part[]>({
    queryKey: ['admin-parts', search, category, manufacturer, minPrice, maxPrice, sort, includeNoImage, page, pageSize],
    queryFn: () =>
      partsApi
        .getAllParts({
          search: search || undefined,
          category: category || undefined,
          manufacturer: manufacturer || undefined,
          minPrice: minPrice === '' ? undefined : minPrice,
          maxPrice: maxPrice === '' ? undefined : maxPrice,
          sort: sort || undefined,
          includeNoImage,
          page,
          pageSize,
        })
        .then((r) => r.data),
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

  const friendlyError = useMemo(() => {
    if (!isError) return null;
    if (!axios.isAxiosError(error)) return { title: 'Failed to load parts.', detail: 'Unknown error.' };

    if (!error.response) {
      // Network error / backend down.
      if (error.code === 'ECONNABORTED') {
        return { title: 'Backend did not respond.', detail: 'Timed out. Is the API running?' };
      }
      return { title: 'Backend is offline or unreachable.', detail: 'Start the API and refresh.' };
    }

    return { title: 'Failed to load parts.', detail: `Request failed (${error.response.status}).` };
  }, [isError, error]);

  const deleteMutation = useMutation({
    mutationFn: async (part: Part) => {
      switch (part.category) {
        case 'CPU':
          return partsApi.deleteCPU(part.id);
        case 'Cooler':
          return partsApi.deleteCooler(part.id);
        case 'Motherboard':
          return partsApi.deleteMotherboard(part.id);
        case 'RAM':
          return partsApi.deleteRAM(part.id);
        case 'GPU':
          return partsApi.deleteGPU(part.id);
        case 'Storage':
          return partsApi.deleteStorage(part.id);
        case 'PSU':
          return partsApi.deletePSU(part.id);
        case 'Case':
          return partsApi.deleteCase(part.id);
        case 'CaseFan':
          return partsApi.deleteCaseFan(part.id);
        default:
          throw new Error('Unsupported category');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-parts'] }),
  });

  const rows = useMemo(() => parts, [parts]);
  const canGoPrev = page > 1;
  const canGoNext = rows.length === pageSize;

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

  return (
    <PageShell
      title="Parts Management"
      subtitle="Search, filter, and manage parts."
      right={
        <Button variant="primary" onClick={() => navigate('/admin/parts/new')}>
          + Add New Part
        </Button>
      }
    >
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search parts..."
              className="w-80"
            />

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={includeNoImage}
                  onChange={(e) => {
                    setIncludeNoImage(e.target.checked);
                    setPage(1);
                  }}
                  className="accent-[var(--primary)]"
                />
                Include missing images
              </label>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="app-input px-3 py-2 text-sm"
              >
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <select
              value={category}
              onChange={(e) => {
                setCategory((e.target.value as PartCategory) || '');
                setPage(1);
              }}
              className="app-input px-3 py-2 text-sm"
            >
              <option value="">All categories</option>
              {(['CPU', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU', 'Case', 'Cooler', 'CaseFan'] as PartCategory[]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <Input
              value={manufacturer}
              onChange={(e) => {
                setManufacturer(e.target.value);
                setPage(1);
              }}
              placeholder="Brand"
            />

            <Input
              type="number"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value === '' ? '' : Number(e.target.value));
                setPage(1);
              }}
              placeholder="Min price"
              min={0}
            />

            <Input
              type="number"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value === '' ? '' : Number(e.target.value));
                setPage(1);
              }}
              placeholder="Max price"
              min={0}
            />

            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="app-input px-3 py-2 text-sm"
            >
              <option value="">Default</option>
              <option value="name">Name (A-Z)</option>
              <option value="-name">Name (Z-A)</option>
              <option value="price">Price (low-high)</option>
              <option value="-price">Price (high-low)</option>
            </select>

            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setManufacturer('');
                setMinPrice('');
                setMaxPrice('');
                setSort('');
                setIncludeNoImage(false);
                setPage(1);
                setPageSize(50);
              }}
              className="btn btn-secondary text-sm"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-[var(--muted)]">
              <tr className="border-b border-[var(--border)]">
                <th className="text-left font-semibold py-3">NAME</th>
                <th className="text-left font-semibold py-3">CATEGORY</th>
                <th className="text-left font-semibold py-3">BRAND</th>
                <th className="text-right font-semibold py-3">PRICE</th>
                <th className="text-right font-semibold py-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-[var(--muted)]">
                    <div>Loading...</div>
                    {loadingTooLong && (
                      <div className="mt-2 text-xs text-[var(--muted-2)]">This is taking longer than usual — the backend may be offline.</div>
                    )}
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="py-6 text-[var(--muted)]">
                    <div className="font-semibold text-[var(--text)]">{friendlyError?.title ?? 'Failed to load parts.'}</div>
                    <div className="mt-2 text-xs text-[var(--muted-2)] break-words">{friendlyError?.detail ?? ''}</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-[var(--muted)]">No parts found.</td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={`${p.category}-${p.id}`} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="py-3 font-semibold text-[var(--text)]">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden shrink-0">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" loading="lazy" />
                          ) : null}
                        </div>
                        <button
                          onClick={() =>
                            navigate(`/parts/${categorySlug(p.category)}/${p.id}`, {
                              state: { returnTo: `${location.pathname}${location.search}` },
                            })
                          }
                          className="text-left hover:underline"
                          title="View details"
                        >
                          {p.name}
                        </button>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${CATEGORY_BADGES[p.category]}`}>
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--muted)]">{p.manufacturer}</td>
                    <td className="py-3 text-right font-semibold text-[var(--text)]">{formatEur(Number(p.price))}</td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-3">
                        <button
                          onClick={() => navigate(`/admin/parts/${p.category}/${p.id}/edit`)}
                          className="text-[var(--muted)] hover:text-[var(--text)]"
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${p.name}?`)) deleteMutation.mutate(p);
                          }}
                          className="text-[var(--danger-text)] hover:text-[var(--danger)]"
                          title="Delete"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-[var(--muted)]">Showing {rows.length} result(s)</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canGoPrev}
              className="btn btn-secondary text-sm"
            >
              Prev
            </button>
            <div className="text-sm text-[var(--muted)]">Page {page}</div>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!canGoNext}
              className="btn btn-secondary text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
