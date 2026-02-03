import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { buildsApi, partsApi } from '../api/client';
import type { Build, CompatibilityCheckResult, PartCategory, PartSelectionItem } from '../types';
import { formatEur } from '../utils/currency';

type Slot = {
  label: string;
  category: PartCategory;
  selectedName?: string;
  selectedImageUrl?: string;
  selectedPrice?: number | null;
};

export default function BuilderPage() {
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('My Custom PC');
  const [compat, setCompat] = useState<CompatibilityCheckResult | null>(null);

  const partPlaceholderSrc = '/placeholder-part.svg';
  const casePlaceholderSrc = '/placeholder-case.svg';

  const placeholderCategories: PartCategory[] = useMemo(
    () => ['CPU', 'Cooler', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU', 'Case', 'CaseFan'],
    [],
  );

  const [buildId, setBuildId] = useState<number | undefined>(() => {
    const raw = localStorage.getItem('pcpp.buildId');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  });

  const hasCreatedBuildRef = useRef(false);

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
    mutationFn: () => buildsApi.createBuild({ name: 'My Custom PC', totalPrice: 0, totalWattage: 0 }),
    onSuccess: (r) => {
      localStorage.setItem('pcpp.buildId', String(r.data.id));
      setBuildId(r.data.id);
      setNameDraft(r.data.name);
    },
  });

  useEffect(() => {
    if (buildId) return;
    if (hasCreatedBuildRef.current) return;
    hasCreatedBuildRef.current = true;
    createBuildMutation.mutate();
  }, [buildId, createBuildMutation]);

  const { data: build, isLoading, error: buildError } = useQuery({
    queryKey: ['build', buildId],
    queryFn: () => buildsApi.getBuild(buildId!).then((r) => r.data),
    enabled: !!buildId,
  });

  // if no build clear buildID
  useEffect(() => {
    if (!buildId) return;
    if (!axios.isAxiosError(buildError)) return;
    const status = buildError.response?.status;
    if (status !== 404) return;

    localStorage.removeItem('pcpp.buildId');
    setBuildId(undefined);
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
      setNameDraft(updated.name);
      setEditingName(false);
      setCompat(null);
    },
  });

  const setPartMutation = useMutation({
    mutationFn: (req: { category: PartCategory; partId?: number | null }) => buildsApi.selectPart(buildId!, req).then((r) => r.data),
    onSuccess: () => {
      setCompat(null);
      queryClient.invalidateQueries({ queryKey: ['build', buildId] });
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

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center gap-3">
          {editingName ? (
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="text-3xl font-semibold bg-white border rounded px-3 py-2"
            />
          ) : (
            <h1 className="text-3xl font-semibold">{build?.name || nameDraft}</h1>
          )}
          <button
            onClick={() => {
              if (editingName) {
                updateBuildMutation.mutate({ ...build, name: nameDraft });
              } else {
                setEditingName(true);
              }
            }}
            className="text-gray-500 hover:text-gray-900"
            title="Rename"
          >
            ✎
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-4">
            {slots.map((slot) => {
              const canRemove = !!slot.selectedName;
              const slotPlaceholderImageUrl = placeholderByCategory?.[slot.category]?.imageUrl;
              const slotImageSrc = slot.selectedImageUrl || slotPlaceholderImageUrl || partPlaceholderSrc;

              return (
                <div key={slot.label} className="bg-white rounded-lg border p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <img
                      src={slotImageSrc}
                      alt={slot.selectedName || slot.label}
                      className="w-12 h-12 rounded bg-white border border-gray-200 object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = partPlaceholderSrc;
                      }}
                    />
                    <div>
                      <div className="text-xs font-semibold text-gray-500">{slot.label.toUpperCase()}</div>
                      <div className="text-sm text-gray-700 italic">
                        {slot.selectedName ? slot.selectedName : 'No part selected'}
                      </div>
                      {slot.selectedName && typeof slot.selectedPrice === 'number' && (
                        <div className="mt-0.5 text-xs font-semibold text-gray-900">{formatEur(Number(slot.selectedPrice))}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                className="w-full h-36 rounded-md border border-gray-200 object-contain bg-white"
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
              disabled={!build?.id || updateBuildMutation.isPending}
              onClick={() => updateBuildMutation.mutate({ ...build, name: nameDraft })}
              className="w-full mt-4 bg-[#37b48f] text-white py-3 rounded font-semibold hover:bg-[#2ea37f] disabled:bg-[#37b48f]/50"
            >
              Save Build
            </button>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                disabled={!shareLink}
                onClick={() => navigator.clipboard.writeText(shareLink)}
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

            {isLoading && <div className="mt-3 text-sm text-gray-600">Loading build...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
