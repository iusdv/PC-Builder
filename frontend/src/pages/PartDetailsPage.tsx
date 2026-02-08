import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { buildsApi, partsApi } from '../api/client';
import type { PartCategory } from '../types';
import { formatEur } from '../utils/currency';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { addRecentBuildId, loadActiveBuildId, saveActiveBuildId } from '../utils/buildStorage';

const SLUG_TO_CATEGORY: Record<string, PartCategory> = {
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

const WATTAGE_CATEGORIES = new Set<PartCategory>(['CPU', 'GPU', 'Storage', 'Cooler']);

function formatKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

export default function PartDetailsPage() {
  const { category: categoryParam, id: idParam } = useParams<{ category: string; id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const category = categoryParam ? SLUG_TO_CATEGORY[categoryParam.toLowerCase()] : undefined;
  const id = idParam ? Number(idParam) : NaN;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [category, id]);

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
        case 'CaseFan':
          return (await partsApi.getCaseFan(id)).data;
        default:
          throw new Error('Unsupported category');
      }
    },
    enabled: !!category && Number.isFinite(id),
  });

  const addToBuildMutation = useMutation({
    mutationFn: async () => {
      if (!category || !Number.isFinite(id)) throw new Error('Invalid part');

      let buildId = loadActiveBuildId();
      if (!buildId) {
        const created = await buildsApi
          .createBuild({
            name: 'My Custom PC',
            totalPrice: 0,
            totalWattage: 0,
          })
          .then((r) => r.data);
        buildId = created.id;
        saveActiveBuildId(buildId);
        addRecentBuildId(buildId);
      }

      await buildsApi.selectPart(buildId, { category, partId: id });
      saveActiveBuildId(buildId);
      addRecentBuildId(buildId);
      return buildId;
    },
    onSuccess: (buildId) => {
      toast.success('Added to build.');
      navigate(`/builder?buildId=${buildId}`);
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        toast.error('Please sign in again and retry.');
        return;
      }
      toast.error('Could not add part to build.');
    },
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

    const hiddenKeys = new Set([
      'imageUrl',
      'createdAt',
      'createdAtUtc',
      'updatedAt',
      'updatedAtUtc',
    ]);

    const entries = Object.entries(data as unknown as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .filter(([k]) => !hiddenKeys.has(k));

    if (category === 'Cooler') {
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i][0] === 'socket') entries.splice(i, 1);
      }
    }

    if (category && !WATTAGE_CATEGORIES.has(category)) {
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
  }, [data, category]);

  const backTo =
    (location.state as any)?.returnTo ??
    (categoryParam ? `/select/${categoryParam.toLowerCase()}` : '/');

  const backLabels = {
  '/admin': 'Back to Admin',
  '/my-builds': 'Back to My Builds',
  '/builder': 'Back to Builder',
  '/share': 'Back to Shared Build',
};
const backLabel =
  Object.entries(backLabels).find(([path]) =>
    backTo.startsWith(path)
  )?.[1] ?? 'Back to Part List';

  
  if (!category || !Number.isFinite(id)) {
    return (
      <PageShell title="Part Details" subtitle="Invalid part link" backTo={backTo} backLabel={backLabel}>
        <Card className="p-6">
          <div className="text-sm text-[var(--muted)]">Invalid part link.</div>
          <div className="mt-4">
            <Link to={backTo} className="btn btn-primary text-sm">
              {backLabel}
            </Link>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Part Details" subtitle={`${category} #${id}`} backTo={backTo} backLabel={backLabel}>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-[var(--muted)]">Loading...</div>
        ) : isError ? (
          <div className="p-6 text-sm text-[var(--muted)]">
            <div className="font-semibold text-[var(--text)]">Failed to load part.</div>
            <div className="mt-2 text-xs text-[var(--muted-2)] break-words">{String((error as any)?.message ?? error ?? '')}</div>
          </div>
        ) : !data ? (
          <div className="p-6 text-sm text-[var(--muted)]">Not found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
            <div className="p-6 border-b md:border-b-0 md:border-r border-[var(--border)]">
              {String((data as any).imageUrl || '').trim() ? (
                <img
                  src={(data as any).imageUrl}
                  alt={String((data as any).name ?? 'Part')}
                  className="w-full h-auto rounded-lg object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-square rounded-lg border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center text-sm text-[var(--muted)]">
                  No image
                </div>
              )}

              {String((data as any).productUrl || '').trim() ? (
                <a
                  href={String((data as any).productUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 btn btn-primary w-full text-sm"
                >
                  View on store
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => addToBuildMutation.mutate()}
                disabled={addToBuildMutation.isPending || isLoading || isError || !data}
                className="mt-3 btn btn-secondary w-full text-sm"
              >
                {addToBuildMutation.isPending ? 'Adding…' : 'Add to build'}
              </button>
            </div>

            <div className="p-6">
              <div className="text-2xl font-semibold text-[var(--text)]">{String((data as any).name ?? '')}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">{String((data as any).manufacturer ?? '')}</div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.k} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="py-3 pr-4 text-xs font-semibold text-[var(--muted)] whitespace-nowrap">
                          {formatKey(r.k).toUpperCase()}
                        </td>
                        <td className="py-3 text-[var(--text)] break-words">
                          {r.k === 'productUrl' ? (
                            <a className="underline text-[var(--text)]" href={r.v} target="_blank" rel="noreferrer">
                              {r.v}
                            </a>
                          ) : (
                            r.v
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
