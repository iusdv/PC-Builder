import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { buildsApi } from '../api/client';
import type { Build, CompatibilityCheckResult, PartCategory } from '../types';

type Slot = {
  label: string;
  category: PartCategory;
  selectedName?: string;
};

export default function BuilderPage() {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('My Custom PC');
  const [compat, setCompat] = useState<CompatibilityCheckResult | null>(null);

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

  const { data: build, isLoading } = useQuery({
    queryKey: ['build', buildId],
    queryFn: () => buildsApi.getBuild(buildId!).then((r) => r.data),
    enabled: !!buildId,
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
      ];
    }

    return [
      { label: 'CPU', category: 'CPU', selectedName: build.cpu?.name },
      { label: 'CPU Cooler', category: 'Cooler', selectedName: build.cooler?.name },
      { label: 'Motherboard', category: 'Motherboard', selectedName: build.motherboard?.name },
      { label: 'RAM', category: 'RAM', selectedName: build.ram?.name },
      { label: 'GPU', category: 'GPU', selectedName: build.gpu?.name },
      { label: 'Storage', category: 'Storage', selectedName: build.storage?.name },
      { label: 'Power Supply', category: 'PSU', selectedName: build.psu?.name },
      { label: 'Case', category: 'Case', selectedName: build.case?.name },
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
    <div className="min-h-screen bg-gray-100">
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
              return (
                <div key={slot.label} className="bg-white rounded-lg border p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-gray-50 border flex items-center justify-center text-gray-500">
                      ☐
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500">{slot.label.toUpperCase()}</div>
                      <div className="text-sm text-gray-700 italic">
                        {slot.selectedName ? slot.selectedName : 'No part selected'}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/select/${categoryToSlug(slot.category)}`}
                    className="px-4 py-2 rounded font-semibold text-sm inline-flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
                  >
                    <span className="text-base leading-none">+</span>
                    Choose
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-lg border p-5 h-fit shadow-sm">
            <div className="text-sm font-semibold text-gray-700">Build Summary</div>

            <div className="mt-4">
              <div className="text-xs text-gray-500">Total Price</div>
              <div className="text-3xl font-semibold">${Number(build?.totalPrice ?? 0).toFixed(2)}</div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-gray-500">Estimated Wattage</div>
              <div className="text-xs text-gray-500 text-right -mt-4">{Number(build?.totalWattage ?? 0)}W</div>
              <div className="mt-3 h-1 bg-gray-100 rounded" />
            </div>

            <div
              className={`mt-4 rounded-md p-3 text-sm flex items-center gap-2 ${
                compatStatus.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
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
              className="w-full mt-4 bg-red-600 text-white py-3 rounded font-semibold hover:bg-red-700 disabled:bg-red-300"
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
