import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { partsApi } from '../api/client';
import type { PartCategory } from '../types';
import { formatEur } from '../utils/currency';

const SLUG_TO_CATEGORY: Record<string, PartCategory> = {
  cpu: 'CPU',
  motherboard: 'Motherboard',
  ram: 'RAM',
  gpu: 'GPU',
  storage: 'Storage',
  psu: 'PSU',
  case: 'Case',
  cooler: 'Cooler',
};

const WATTAGE_CATEGORIES = new Set<PartCategory>(['CPU', 'GPU', 'Storage', 'Cooler']);

function formatKey(key: string) {
  // Prefer readable labels for common casing styles.
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

export default function PartDetailsPage() {
  const { category: categoryParam, id: idParam } = useParams<{ category: string; id: string }>();

  const category = categoryParam ? SLUG_TO_CATEGORY[categoryParam.toLowerCase()] : undefined;
  const id = idParam ? Number(idParam) : NaN;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['part-details', category, id],
    queryFn: async () => {
      if (!category || !Number.isFinite(id)) throw new Error('Invalid route params');

      switch (category) {
        case 'CPU':
          return (await partsApi.getCPU(id)).data;
        case 'Motherboard':
          return (await partsApi.getMotherboard(id)).data;
        case 'RAM':
          return (await partsApi.getRAM(id)).data;
        case 'GPU':
          return (await partsApi.getGPU(id)).data;
        case 'Storage':
          return (await partsApi.getStorage(id)).data;
        case 'PSU':
          return (await partsApi.getPSU(id)).data;
        case 'Case':
          return (await partsApi.getCase(id)).data;
        case 'Cooler':
          return (await partsApi.getCooler(id)).data;
        default:
          throw new Error('Unsupported category');
      }
    },
    enabled: !!category && Number.isFinite(id),
  });

  const rows = useMemo(() => {
    if (!data) return [] as Array<{ k: string; v: string }>;

    const ZERO_IS_UNKNOWN_KEYS = new Set([
      'wattage',
      'coreClock',
      'boostClock',
      'length',
      'heightMM',
      'maxMemoryGB',
      'memorySlots',
    ]);

    const entries = Object.entries(data as unknown as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .filter(([k]) => !['imageUrl'].includes(k));

    if (category && !WATTAGE_CATEGORIES.has(category)) {
      // For categories where wattage is not meaningful, don't show it at all.
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i][0] === 'wattage') entries.splice(i, 1);
      }
    }

    // Put core fields first if present.
    const priority = new Set(['name', 'manufacturer', 'category', 'price', ...(category && WATTAGE_CATEGORIES.has(category) ? ['wattage'] : []), 'productUrl']);

    entries.sort(([a], [b]) => {
      const ap = priority.has(a) ? 0 : 1;
      const bp = priority.has(b) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return a.localeCompare(b);
    });

    return entries.map(([k, v]) => ({
      k,
      v:
        k === 'price'
          ? formatEur(Number(v))
          : (() => {
              if (ZERO_IS_UNKNOWN_KEYS.has(k)) {
                const n = typeof v === 'number' ? v : Number(v);
                if (Number.isFinite(n) && n === 0) return 'Unknown';
              }
              return String(v);
            })(),
    }));
  }, [data]);

  if (!category || !Number.isFinite(id)) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-6 py-6">
          <div className="bg-white border rounded-lg p-6">
            <div className="text-sm text-gray-600">Invalid part link.</div>
            <div className="mt-3">
              <Link to="/" className="text-sm text-gray-700 underline">
                Back to Builder
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Part Details</h1>
              <div className="text-sm text-gray-500">
                {category} #{id}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading...</div>
          ) : isError ? (
            <div className="p-6 text-sm text-gray-600">
              <div className="font-semibold text-gray-900">Failed to load part.</div>
              <div className="mt-2 text-xs text-gray-500 break-words">{String((error as any)?.message ?? error ?? '')}</div>
            </div>
          ) : !data ? (
            <div className="p-6 text-sm text-gray-600">Not found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
              <div className="p-6 border-b md:border-b-0 md:border-r border-gray-200">
                {String((data as any).imageUrl || '').trim() ? (
                  <img
                    src={(data as any).imageUrl}
                    alt={String((data as any).name ?? 'Part')}
                    className="w-full h-auto rounded-lg border border-gray-200 bg-white object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                    No image
                  </div>
                )}

                {String((data as any).productUrl || '').trim() ? (
                  <a
                    href={String((data as any).productUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-[#37b48f] text-white px-4 py-2 text-sm font-semibold hover:bg-[#2ea37f]"
                  >
                    View on store
                  </a>
                ) : null}
              </div>

              <div className="p-6">
                <div className="text-2xl font-semibold text-gray-900">{String((data as any).name ?? '')}</div>
                <div className="mt-1 text-sm text-gray-500">{String((data as any).manufacturer ?? '')}</div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.k} className="border-b last:border-b-0">
                          <td className="py-3 pr-4 text-xs font-semibold text-gray-500 whitespace-nowrap">{formatKey(r.k).toUpperCase()}</td>
                          <td className="py-3 text-gray-900 break-words">{r.k === 'productUrl' ? (
                            <a className="text-gray-700 underline" href={r.v} target="_blank" rel="noreferrer">
                              {r.v}
                            </a>
                          ) : (
                            r.v
                          )}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
