import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partsApi } from '../api/client';
import type { Part, PartCategory } from '../types';

const CATEGORY_BADGES: Record<PartCategory, string> = {
  CPU: 'bg-red-100 text-red-700',
  Motherboard: 'bg-red-100 text-red-700',
  RAM: 'bg-red-100 text-red-700',
  GPU: 'bg-red-100 text-red-700',
  Storage: 'bg-red-100 text-red-700',
  PSU: 'bg-red-100 text-red-700',
  Case: 'bg-red-100 text-red-700',
  Cooler: 'bg-red-100 text-red-700',
};

export default function PartsAdminPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['admin-parts', search],
    queryFn: () => partsApi.getAllParts({ search: search || undefined, page: 1, pageSize: 200 }).then((r) => r.data),
  });

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
        default:
          throw new Error('Unsupported category');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-parts'] }),
  });

  const rows = useMemo(() => parts, [parts]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Parts Management</h1>
          </div>
          <button
            onClick={() => navigate('/admin/parts/new')}
            className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700"
          >
            + Add New Part
          </button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search parts..."
              className="w-80 rounded-md border bg-white px-3 py-2 text-sm"
            />
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">Back to Builder</Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr className="border-b">
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
                    <td colSpan={5} className="py-6 text-gray-600">Loading...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-gray-600">No parts found.</td>
                  </tr>
                ) : (
                  rows.map((p) => (
                    <tr key={`${p.category}-${p.id}`} className="border-b last:border-b-0">
                      <td className="py-3 font-semibold text-gray-900">{p.name}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${CATEGORY_BADGES[p.category]}`}>
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">{p.manufacturer}</td>
                      <td className="py-3 text-right font-semibold">${Number(p.price).toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-3">
                          <button
                            onClick={() => navigate(`/admin/parts/${p.category}/${p.id}/edit`)}
                            className="text-gray-700 hover:text-gray-900"
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${p.name}?`)) deleteMutation.mutate(p);
                            }}
                            className="text-red-600 hover:text-red-700"
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
        </div>
      </div>
    </div>
  );
}
