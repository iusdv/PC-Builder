import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import type { PartCategory, PartSelectionItem } from '../types';
import { partsApi } from '../api/client';
import { formatEur } from '../utils/currency';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';

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

const WATTAGE_RELEVANT_CATEGORIES = new Set<PartCategory>(['CPU', 'GPU', 'PSU', 'Cooler']);

const CATEGORY_SPEC_PRIORITY: Record<PartCategory, string[]> = {
  CPU: ['cores', 'threads', 'speed', 'boost', 'socket'],
  Motherboard: ['socket', 'chipset', 'memory', 'memoryslots', 'maxmemory', 'pcieslots', 'm2slots', 'sataslots', 'form'],
  RAM: ['capacity', 'speed', 'type', 'latency', 'modulecount'],
  GPU: ['chipset', 'memory', 'memorytype', 'boost', 'core', 'length', 'slots'],
  Storage: ['capacity', 'interface', 'read', 'write', 'type'],
  PSU: ['rating', 'efficiency', 'modular', 'form'],
  Case: ['form', 'maxgpu', 'maxcooler', 'color'],
  Cooler: ['type', 'radiator', 'height'],
  CaseFan: ['size', 'rpm', 'airflow'],
};

type PersistedCompareStateV1 = {
  v: 1;
  compareMode: boolean;
  compared: PartSelectionItem[];
  compareBudget: number | null;
};

function loadPersistedItems(key: string): PartSelectionItem[] {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<PersistedCompareStateV1> | null;
    if (!parsed || parsed.v !== 1) return [];
    return Array.isArray(parsed.compared) ? (parsed.compared as PartSelectionItem[]).slice(0, 3) : [];
  } catch {
    return [];
  }
}

function loadPersistedBudget(key: string): number | '' {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as Partial<PersistedCompareStateV1> | null;
    if (!parsed || parsed.v !== 1) return '';
    return typeof parsed.compareBudget === 'number' && Number.isFinite(parsed.compareBudget) && parsed.compareBudget >= 0
      ? parsed.compareBudget
      : '';
  } catch {
    return '';
  }
}

// Helper: derive a human label for a spec key (CamelCase → spaced)
function humanLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// Check if a spec value is a placeholder/empty
function isPlaceholderSpec(v: string | undefined | null): boolean {
  if (!v) return true;
  const l = v.toLowerCase();
  return l === '—' || l === '-' || l === 'n/a' || l === 'unknown' || l === '0' || l === '';
}

// Determine if a numeric spec is "higher is better"
function isHigherBetter(key: string): boolean {
  const lower = key.toLowerCase();
  const higherBetterKeys = [
    'core', 'thread', 'clock', 'speed', 'capacity', 'vram', 'memory',
    'wattage', 'rating', 'max', 'slots', 'boost', 'read', 'write',
  ];
  const lowerBetterKeys = ['latency', 'cas', 'price'];
  if (lowerBetterKeys.some((k) => lower.includes(k))) return false;
  return higherBetterKeys.some((k) => lower.includes(k));
}

function resolveWattage(item: PartSelectionItem): string {
  const specs = item.specs ?? {};

  const directCandidates = ['wattage', 'tdp', 'wattagerating', 'powerdraw', 'power'];
  for (const key of directCandidates) {
    const directValue = specs[key];
    if (typeof directValue === 'string' && !isPlaceholderSpec(directValue)) return directValue;
  }

  for (const [key, value] of Object.entries(specs)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedKey.includes('watt') || normalizedKey === 'tdp') {
      if (typeof value === 'string' && !isPlaceholderSpec(value)) return value;
    }
  }

  const rawItem = item as unknown as Record<string, unknown>;
  const topLevelCandidates = ['wattage', 'tdp', 'wattageRating', 'powerDraw'];
  for (const key of topLevelCandidates) {
    const raw = rawItem[key];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return String(raw);
    if (typeof raw === 'string' && !isPlaceholderSpec(raw)) return raw;
  }

  return '—';
}

function categorySpecsFromDetail(category: PartCategory, detail: Record<string, unknown> | null): Record<string, string> {
  if (!detail) return {};

  const numberValue = (...keys: string[]): number | null => {
    for (const key of keys) {
      const value = detail[key];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return null;
  };

  const textValue = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = detail[key];
      if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    }
    return null;
  };

  switch (category) {
    case 'CPU': {
      const cores = numberValue('coreCount');
      const threads = numberValue('threadCount');
      const baseClock = numberValue('baseClock');
      const boostClock = numberValue('boostClock');
      const socket = textValue('socket');
      return {
        ...(cores !== null ? { cores: String(cores) } : {}),
        ...(threads !== null ? { threads: String(threads) } : {}),
        ...(baseClock !== null ? { speed: `${baseClock} GHz` } : {}),
        ...(boostClock !== null ? { boost: `${boostClock} GHz` } : {}),
        ...(socket ? { socket } : {}),
      };
    }
    case 'Motherboard': {
      const socket = textValue('socket');
      const chipset = textValue('chipset');
      const form = textValue('formFactor');
      const memory = textValue('memoryType');
      const memorySlots = numberValue('memorySlots');
      const maxMemory = numberValue('maxMemoryGB');
      const pcieSlots = numberValue('pCIeSlots', 'pcIeSlots', 'pciESlots');
      const m2Slots = numberValue('m2Slots');
      const sataSlots = numberValue('sataSlots');
      return {
        ...(socket ? { socket } : {}),
        ...(chipset ? { chipset } : {}),
        ...(form ? { form } : {}),
        ...(memory ? { memory } : {}),
        ...(memorySlots !== null ? { memorySlots: String(memorySlots) } : {}),
        ...(maxMemory !== null ? { maxMemory: `${maxMemory} GB` } : {}),
        ...(pcieSlots !== null ? { pcieSlots: String(pcieSlots) } : {}),
        ...(m2Slots !== null ? { m2Slots: String(m2Slots) } : {}),
        ...(sataSlots !== null ? { sataSlots: String(sataSlots) } : {}),
      };
    }
    case 'RAM': {
      const type = textValue('type');
      const speed = numberValue('speedMHz');
      const capacity = numberValue('capacityGB');
      const moduleCount = numberValue('moduleCount');
      const casLatency = numberValue('cASLatency', 'casLatency');
      return {
        ...(type ? { type } : {}),
        ...(speed !== null ? { speed: `${speed} MHz` } : {}),
        ...(capacity !== null ? { capacity: `${capacity} GB` } : {}),
        ...(moduleCount !== null ? { moduleCount: String(moduleCount) } : {}),
        ...(casLatency !== null ? { latency: `CL${casLatency}` } : {}),
      };
    }
    case 'GPU': {
      const chipset = textValue('chipset');
      const memory = numberValue('memoryGB');
      const memoryType = textValue('memoryType');
      const core = numberValue('coreClock');
      const boost = numberValue('boostClock');
      const length = numberValue('length');
      const slots = numberValue('slots');
      return {
        ...(chipset ? { chipset } : {}),
        ...(memory !== null ? { memory: `${memory} GB` } : {}),
        ...(memoryType ? { memoryType } : {}),
        ...(core !== null ? { core: `${core} MHz` } : {}),
        ...(boost !== null ? { boost: `${boost} MHz` } : {}),
        ...(length !== null ? { length: `${length} mm` } : {}),
        ...(slots !== null ? { slots: String(slots) } : {}),
      };
    }
    case 'Storage': {
      const type = textValue('type');
      const capacity = numberValue('capacityGB');
      const iface = textValue('interface');
      const read = numberValue('readSpeedMBps');
      const write = numberValue('writeSpeedMBps');
      return {
        ...(type ? { type } : {}),
        ...(capacity !== null ? { capacity: `${capacity} GB` } : {}),
        ...(iface ? { interface: iface } : {}),
        ...(read !== null ? { read: `${read} MB/s` } : {}),
        ...(write !== null ? { write: `${write} MB/s` } : {}),
      };
    }
    case 'PSU': {
      const rating = numberValue('wattageRating');
      const efficiency = textValue('efficiency');
      const modular = detail.modular;
      const form = textValue('formFactor');
      return {
        ...(rating !== null ? { rating: `${rating} W` } : {}),
        ...(efficiency ? { efficiency } : {}),
        ...(typeof modular === 'boolean' ? { modular: modular ? 'Yes' : 'No' } : {}),
        ...(form ? { form } : {}),
      };
    }
    case 'Case': {
      const form = textValue('formFactor');
      const maxGpu = numberValue('maxGPULength');
      const maxCooler = numberValue('maxCoolerHeightMM');
      const color = textValue('color');
      return {
        ...(form ? { form } : {}),
        ...(maxGpu !== null ? { maxGpu: `${maxGpu} mm` } : {}),
        ...(maxCooler !== null ? { maxCooler: `${maxCooler} mm` } : {}),
        ...(color ? { color } : {}),
      };
    }
    case 'Cooler': {
      const type = textValue('coolerType');
      const height = numberValue('heightMM');
      const radiator = numberValue('radiatorSizeMM');
      return {
        ...(type ? { type } : {}),
        ...(height !== null ? { height: `${height} mm` } : {}),
        ...(radiator !== null ? { radiator: `${radiator} mm` } : {}),
      };
    }
    case 'CaseFan':
      return {};
    default:
      return {};
  }
}

export default function ComparePage() {
  const { category: categoryParam } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const category = categoryParam ? CATEGORY_LABELS[categoryParam.toLowerCase()] : undefined;
  const compareStorageKey = categoryParam ? `pcpp:select-compare:v1:${categoryParam.toLowerCase()}` : null;
  const compareReturnTo = categoryParam ? `/compare/${categoryParam.toLowerCase()}` : '/compare';

  const [items, setItems] = useState<PartSelectionItem[]>(() => {
    if (!compareStorageKey) return [];
    return loadPersistedItems(compareStorageKey);
  });

  const [budget] = useState<number | ''>(() => {
    if (!compareStorageKey) return '';
    return loadPersistedBudget(compareStorageKey);
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const partDetailsQuery = useQuery({
    queryKey: ['compare-part-details', category, items.map((item) => item.id).sort((a, b) => a - b).join(',')],
    queryFn: async () => {
      if (!category) return new Map<number, Record<string, unknown> | null>();
      const rows = await Promise.all(
        items.map(async (item) => {
          try {
            const part =
              category === 'CPU'
                ? await partsApi.getCPU(item.id).then((r) => r.data)
                : category === 'Motherboard'
                  ? await partsApi.getMotherboard(item.id).then((r) => r.data)
                  : category === 'RAM'
                    ? await partsApi.getRAM(item.id).then((r) => r.data)
                    : category === 'GPU'
                      ? await partsApi.getGPU(item.id).then((r) => r.data)
                      : category === 'Storage'
                        ? await partsApi.getStorage(item.id).then((r) => r.data)
                        : category === 'PSU'
                          ? await partsApi.getPSU(item.id).then((r) => r.data)
                          : category === 'Case'
                            ? await partsApi.getCase(item.id).then((r) => r.data)
                            : category === 'Cooler'
                              ? await partsApi.getCooler(item.id).then((r) => r.data)
                              : await partsApi.getCaseFan(item.id).then((r) => r.data);
            return [item.id, part] as const;
          } catch {
            return [item.id, null] as const;
          }
        }),
      );
      return new Map(rows);
    },
    enabled: !!category && items.length > 0,
    retry: false,
    staleTime: 300000,
  });

  const specsByItemId = useMemo(() => {
    const map = new Map<number, Record<string, string>>();
    for (const item of items) {
      const detailRaw = partDetailsQuery.data?.get(item.id) ?? null;
      const detail = detailRaw ? (detailRaw as unknown as Record<string, unknown>) : null;
      const detailSpecs = category ? categorySpecsFromDetail(category, detail) : {};
      map.set(item.id, { ...(item.specs ?? {}), ...detailSpecs });
    }
    return map;
  }, [items, partDetailsQuery.data, category]);

  const resolveItemWattage = (item: PartSelectionItem): string => {
    const fromSpecs = resolveWattage({ ...item, specs: specsByItemId.get(item.id) ?? item.specs });
    if (!isPlaceholderSpec(fromSpecs)) return fromSpecs;

    const part = partDetailsQuery.data?.get(item.id);
    if (part && typeof part.wattage === 'number' && Number.isFinite(part.wattage) && part.wattage > 0) {
      return `${part.wattage} W`;
    }

    return '—';
  };

  // All unique spec keys across items
  const specKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of items) {
      const specs = specsByItemId.get(item.id) ?? {};
      for (const k of Object.keys(specs)) {
        keys.add(k);
      }
    }
    return Array.from(keys);
  }, [items, specsByItemId]);

  const orderedSpecKeys = useMemo(() => {
    if (!category) return specKeys;

    const priority = CATEGORY_SPEC_PRIORITY[category] ?? [];
    const priorityIndex = new Map(priority.map((key, idx) => [key, idx]));

    return [...specKeys].sort((a, b) => {
      const aKey = a.toLowerCase().replace(/[^a-z0-9]/g, '');
      const bKey = b.toLowerCase().replace(/[^a-z0-9]/g, '');
      const aPriority = priorityIndex.get(aKey);
      const bPriority = priorityIndex.get(bKey);

      if (aPriority !== undefined && bPriority !== undefined) return aPriority - bPriority;
      if (aPriority !== undefined) return -1;
      if (bPriority !== undefined) return 1;
      return humanLabel(a).localeCompare(humanLabel(b));
    });
  }, [specKeys, category]);

  const removeItem = (id: number) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      // Also update sessionStorage
      if (compareStorageKey) {
        try {
          const raw = sessionStorage.getItem(compareStorageKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.compared = next;
            sessionStorage.setItem(compareStorageKey, JSON.stringify(parsed));
          }
        } catch {}
      }
      return next;
    });
  };

  if (!category) {
    return (
      <PageShell title="Compare" subtitle="Invalid category.">
        <Card className="mt-6 p-6 text-sm text-[var(--muted)]">Unknown category.</Card>
      </PageShell>
    );
  }

  if (items.length === 0) {
    return (
      <PageShell
        title={`Compare ${category}`}
        subtitle="Select parts to compare from the parts picker."
        right={
          <button onClick={() => navigate(-1)} className="btn btn-secondary text-sm">
            Back
          </button>
        }
      >
        <Card className="mt-6 p-6 text-sm text-[var(--muted)]">
          No parts selected for comparison. Go to the{' '}
          <Link to={`/select/${categoryParam}`} className="text-[var(--primary)] underline">
            parts picker
          </Link>{' '}
          and add parts to compare.
        </Card>
      </PageShell>
    );
  }

  // Find best value for numeric specs to highlight
  const parsedSpecs: Record<string, (number | null)[]> = {};
  for (const key of orderedSpecKeys) {
    parsedSpecs[key] = items.map((item) => {
      const raw = specsByItemId.get(item.id)?.[key];
      if (!raw || isPlaceholderSpec(raw)) return null;
      const n = parseFloat(raw.replace(/[^0-9.\-]/g, ''));
      return Number.isFinite(n) ? n : null;
    });
  }

  const bestIndex = (key: string): number | null => {
    const vals = parsedSpecs[key];
    if (!vals) return null;
    const numVals = vals.filter((v) => v !== null) as number[];
    if (numVals.length < 2) return null;
    const higher = isHigherBetter(key);
    const target = higher ? Math.max(...numVals) : Math.min(...numVals);
    const idx = vals.findIndex((v) => v === target);
    return idx >= 0 ? idx : null;
  };

  const lowestPriceIdx = (() => {
    if (items.length < 2) return null;
    let min = Infinity;
    let idx = 0;
    items.forEach((item, i) => {
      if (item.price < min) {
        min = item.price;
        idx = i;
      }
    });
    return idx;
  })();

  const colWidth = items.length === 2 ? 'w-1/2' : items.length === 3 ? 'w-1/3' : 'w-full';

  return (
    <PageShell
      title={`Compare ${category}`}
      subtitle={`Side-by-side comparison of ${items.length} products`}
      right={
        <div className="flex gap-2">
          <Link to={`/select/${categoryParam}`} className="btn btn-secondary text-sm">
            Back to selection
          </Link>
        </div>
      }
    >
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-6"
      >
        <Card className="overflow-x-auto">
          {/* Header row: images + names */}
          <div className="flex border-b border-[var(--border)]">
            {items.map((item, idx) => (
              <div key={item.id} className={`${colWidth} p-4 flex flex-col items-center text-center ${idx > 0 ? 'border-l border-[var(--border)]' : ''}`}>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="self-end btn btn-ghost text-xs px-2 py-1 mb-2"
                  title="Remove from comparison"
                >
                  x
                </button>
                <div className="h-32 flex items-center justify-center">
                  <img
                    src={item.imageUrl || '/placeholder-part.svg'}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/placeholder-part.svg';
                    }}
                  />
                </div>
                <Link
                  to={`/parts/${categoryParam?.toLowerCase()}/${item.id}`}
                  state={{ returnTo: compareReturnTo }}
                  className="mt-2 text-sm font-semibold text-[var(--text)] no-underline hover:no-underline text-center leading-snug"
                  title={item.name}
                >
                  {item.name}
                </Link>
                <div className="text-xs text-[var(--muted)]">{item.manufacturer}</div>
              </div>
            ))}
          </div>

          {/* Price row */}
          <div className="flex border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)]">
            <div className="w-0 min-w-0" />
            {items.map((item, idx) => {
              const isBest = idx === lowestPriceIdx;
              const budgetNum = typeof budget === 'number' ? budget : 0;
              const budgetPct = budgetNum > 0 ? Math.round((item.price / budgetNum) * 100) : null;
              return (
                <div key={item.id} className={`${colWidth} px-4 py-3 text-center ${idx > 0 ? 'border-l border-[var(--border)]' : ''}`}>
                  <div className="text-xs text-[var(--muted)] font-semibold uppercase tracking-wide">Price</div>
                  <div className={`mt-1 text-lg font-bold ${isBest ? 'text-[var(--ok)]' : 'text-[var(--text)]'}`}>
                    {formatEur(item.price)}
                    {isBest && items.length > 1 && <span className="ml-1 text-xs font-normal">(lowest)</span>}
                  </div>
                  {budgetPct !== null && (
                    <div className="mt-1 text-[11px] text-[var(--muted)]">
                      {budgetPct}% of budget
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Compatibility row */}
          <div className="flex border-b border-[var(--border)]">
            {items.map((item, idx) => (
              <div key={item.id} className={`${colWidth} px-4 py-2 text-center ${idx > 0 ? 'border-l border-[var(--border)]' : ''}`}>
                <div className="text-xs text-[var(--muted)] font-semibold uppercase tracking-wide">Compatibility</div>
                <div className={`mt-1 text-sm font-semibold ${item.isCompatible ? 'text-[var(--ok)]' : 'text-[var(--danger-text)]'}`}>
                  {item.isCompatible ? 'Compatible' : 'Incompatible'}
                </div>
                {!item.isCompatible && item.incompatibilityReasons?.length > 0 && (
                  <div className="mt-1 text-[11px] text-[var(--danger-text)]">
                    {item.incompatibilityReasons[0]}
                  </div>
                )}
              </div>
            ))}
          </div>

          {category && WATTAGE_RELEVANT_CATEGORIES.has(category) && (
            <div className="flex border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)]">
              {items.map((item, idx) => (
                <div key={item.id} className={`${colWidth} px-4 py-2 text-center ${idx > 0 ? 'border-l border-[var(--border)]' : ''}`}>
                  <div className="text-xs text-[var(--muted)] font-semibold uppercase tracking-wide">Wattage</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {resolveItemWattage(item)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Spec rows ── */}
          {orderedSpecKeys.map((key, rowIdx) => {
            const best = bestIndex(key);
            const isAlt = rowIdx % 2 === 0;

            return (
              <div
                key={key}
                className={`flex border-b border-[var(--border)] last:border-b-0 ${
                  isAlt ? 'bg-[color-mix(in_srgb,var(--surface)_90%,transparent)]' : ''
                }`}
              >
                {items.map((item, idx) => {
                  const val = specsByItemId.get(item.id)?.[key];
                  const isEmpty = isPlaceholderSpec(val);
                  const isBest = best === idx && !isEmpty;

                  return (
                    <div
                      key={item.id}
                      className={`${colWidth} px-4 py-2.5 text-center ${idx > 0 ? 'border-l border-[var(--border)]' : ''}`}
                    >
                      {idx === 0 && (
                        <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wide mb-0.5 sm:hidden">
                          {humanLabel(key)}
                        </div>
                      )}
                      <div className="text-xs text-[var(--muted)] font-semibold uppercase tracking-wide mb-0.5 hidden sm:block">
                        {humanLabel(key)}
                      </div>
                      <div
                        className={`text-sm ${
                          isBest
                            ? 'font-bold text-[var(--ok)]'
                            : isEmpty
                              ? 'text-[var(--muted-2)]'
                              : 'text-[var(--text)]'
                        }`}
                      >
                        {isEmpty ? '—' : val}
                        {isBest && items.length > 1 && <span className="ml-1 text-[10px] font-normal text-[var(--ok)]">★</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {orderedSpecKeys.length === 0 && (
            <div className="p-6 text-sm text-[var(--muted)] text-center">
              No specification data available for these products.
            </div>
          )}
        </Card>

        {/* ── Summary verdicts ── */}
        {items.length >= 2 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const nonEmptySpecs = orderedSpecKeys.filter((k) => !isPlaceholderSpec(specsByItemId.get(item.id)?.[k]));
              const winsCount = orderedSpecKeys.filter((k) => bestIndex(k) === items.indexOf(item)).length;
              return (
                <Card key={item.id} className="p-4">
                  <div className="text-sm font-semibold text-[var(--text)] truncate" title={item.name}>{item.name}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[var(--muted)]">Price</span>
                      <div className="font-semibold text-[var(--text)]">{formatEur(item.price)}</div>
                    </div>
                    <div>
                      <span className="text-[var(--muted)]">Spec wins</span>
                      <div className="font-semibold text-[var(--primary)]">{winsCount} / {nonEmptySpecs.length}</div>
                    </div>
                    <div>
                      <span className="text-[var(--muted)]">Compatible</span>
                      <div className={`font-semibold ${item.isCompatible ? 'text-[var(--ok)]' : 'text-[var(--danger-text)]'}`}>
                        {item.isCompatible ? 'Yes' : 'No'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--muted)]">Wattage</span>
                      <div className="font-semibold text-[var(--text)]">
                        {category && WATTAGE_RELEVANT_CATEGORIES.has(category) ? resolveItemWattage(item) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </PageShell>
  );
}


