import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { partsApi } from '../api/client';
import type { PartCategory } from '../types';

type Mode = 'create' | 'edit';

const CATEGORIES: PartCategory[] = ['CPU', 'Cooler', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU', 'Case'];

const WATTAGE_CATEGORIES = new Set<PartCategory>(['CPU', 'GPU', 'Storage', 'Cooler']);

function extractSpecs(category: PartCategory, entity: any): Record<string, unknown> {
  const common = new Set([
    'id',
    'name',
    'manufacturer',
    'price',
    'imageUrl',
    'category',
    'productUrl',
  ]);

  if (WATTAGE_CATEGORIES.has(category)) common.add('wattage');

  if (category === 'PSU') common.add('wattageRating');

  const specs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entity || {})) {
    if (!common.has(k)) specs[k] = v;
  }
  return specs;
}

export default function PartFormPage() {
  const navigate = useNavigate();
  const params = useParams<{ category?: string; id?: string }>();

  const mode: Mode = params.id ? 'edit' : 'create';

  const initialCategory = useMemo<PartCategory>(() => {
    const raw = params.category as PartCategory | undefined;
    return raw && CATEGORIES.includes(raw) ? raw : 'CPU';
  }, [params.category]);

  const [category, setCategory] = useState<PartCategory>(initialCategory);
  const [manufacturer, setManufacturer] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [wattage, setWattage] = useState<number>(0);
  const [providedWatts, setProvidedWatts] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [specsJson, setSpecsJson] = useState('{}');
  const [compatJson, setCompatJson] = useState('{}');

  const id = params.id ? Number(params.id) : undefined;

  const { data: existing, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['part-edit', category, id],
    queryFn: async () => {
      switch (category) {
        case 'CPU':
          return partsApi.getCPU(id!).then((r) => r.data);
        case 'Cooler':
          return partsApi.getCooler(id!).then((r) => r.data);
        case 'Motherboard':
          return partsApi.getMotherboard(id!).then((r) => r.data);
        case 'RAM':
          return partsApi.getRAM(id!).then((r) => r.data);
        case 'GPU':
          return partsApi.getGPU(id!).then((r) => r.data);
        case 'Storage':
          return partsApi.getStorage(id!).then((r) => r.data);
        case 'PSU':
          return partsApi.getPSU(id!).then((r) => r.data);
        case 'Case':
          return partsApi.getCase(id!).then((r) => r.data);
        default:
          throw new Error('Unsupported category');
      }
    },
    enabled: mode === 'edit' && !!id,
  });

  useEffect(() => {
    if (mode !== 'edit' || !existing) return;

    setName(existing.name ?? '');
    setManufacturer(existing.manufacturer ?? '');
    setPrice(Number(existing.price ?? 0));
    setWattage(Number(existing.wattage ?? 0));
    setImageUrl(existing.imageUrl ?? '');
    setProductUrl(existing.productUrl ?? '');

    if (category === 'PSU') setProvidedWatts(Number((existing as any).wattageRating ?? 0));

    const specs = extractSpecs(category, existing);
    setSpecsJson(JSON.stringify(specs, null, 2));
  }, [mode, existing, category]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let specs: Record<string, unknown> = {};
      try {
        specs = JSON.parse(specsJson || '{}');
      } catch {
        throw new Error('Specs JSON is invalid');
      }

      const payload: any = {
        name,
        manufacturer,
        price,
        imageUrl: imageUrl || undefined,
        productUrl: productUrl || undefined,
        ...specs,
      };

      if (WATTAGE_CATEGORIES.has(category)) payload.wattage = wattage;

      if (category === 'PSU') payload.wattageRating = providedWatts;

      if (mode === 'create') {
        switch (category) {
          case 'CPU':
            return partsApi.createCPU(payload);
          case 'Cooler':
            return partsApi.createCooler(payload);
          case 'Motherboard':
            return partsApi.createMotherboard(payload);
          case 'RAM':
            return partsApi.createRAM(payload);
          case 'GPU':
            return partsApi.createGPU(payload);
          case 'Storage':
            return partsApi.createStorage(payload);
          case 'PSU':
            return partsApi.createPSU(payload);
          case 'Case':
            return partsApi.createCase(payload);
          default:
            throw new Error('Unsupported category');
        }
      }

      switch (category) {
        case 'CPU':
          return partsApi.updateCPU(id!, payload);
        case 'Cooler':
          return partsApi.updateCooler(id!, payload);
        case 'Motherboard':
          return partsApi.updateMotherboard(id!, payload);
        case 'RAM':
          return partsApi.updateRAM(id!, payload);
        case 'GPU':
          return partsApi.updateGPU(id!, payload);
        case 'Storage':
          return partsApi.updateStorage(id!, payload);
        case 'PSU':
          return partsApi.updatePSU(id!, payload);
        case 'Case':
          return partsApi.updateCase(id!, payload);
        default:
          throw new Error('Unsupported category');
      }
    },
    onSuccess: () => navigate('/admin/parts'),
  });

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 bg-black/30" />
      <div className="relative container mx-auto px-6 py-10">
        <div className="mx-auto max-w-2xl bg-white rounded-lg border shadow">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h1 className="text-lg font-semibold">{mode === 'create' ? 'New Part' : 'Edit Part'}</h1>
            <Link to="/admin/parts" className="text-gray-500 hover:text-gray-900">✕</Link>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                <select
                  value={category}
                  disabled={mode === 'edit'}
                  onChange={(e) => setCategory(e.target.value as PartCategory)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Brand</label>
                <input
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              {WATTAGE_CATEGORIES.has(category) ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Wattage</label>
                  <input
                    type="number"
                    value={wattage}
                    onChange={(e) => setWattage(Number(e.target.value))}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <div />
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Provided Watts (PSU)</label>
                <input
                  type="number"
                  value={providedWatts}
                  onChange={(e) => setProvidedWatts(Number(e.target.value))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  disabled={category !== 'PSU'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Image URL</label>
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Product URL</label>
                <input value={productUrl} onChange={(e) => setProductUrl(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Specs (JSON)</label>
              <textarea
                value={specsJson}
                onChange={(e) => setSpecsJson(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                rows={7}
              />
              <div className="mt-1 text-xs text-gray-400">
                Example: <span className="font-mono">{'{"socket":"AM5","coreCount":8}'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Compatibility (JSON)</label>
              <textarea
                value={compatJson}
                onChange={(e) => setCompatJson(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link to="/admin/parts" className="px-4 py-2 rounded border text-sm font-semibold">
                Cancel
              </Link>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || (mode === 'edit' && isLoadingExisting)}
                className="px-4 py-2 rounded bg-[#37b48f] text-white text-sm font-semibold hover:bg-[#2ea37f] disabled:bg-[#37b48f]/50"
              >
                Save Part
              </button>
            </div>

            {saveMutation.isError && (
              <div className="text-sm text-[#37b48f]">{(saveMutation.error as Error).message}</div>
            )}
            {mode === 'edit' && isLoadingExisting && <div className="text-sm text-gray-600">Loading part...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
