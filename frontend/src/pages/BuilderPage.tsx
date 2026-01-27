import { useState } from 'react';
import { partsApi, buildsApi } from '../api/client';
import type { Build } from '../types';
import { PartCategory } from '../types';
import { useQuery, useMutation } from '@tanstack/react-query';

export default function BuilderPage() {
  const [build, setBuild] = useState<Partial<Build>>({
    name: 'My PC Build',
    totalPrice: 0,
    totalWattage: 0,
  });

  const [selectedCategory, setSelectedCategory] = useState<PartCategory>(PartCategory.CPU);

  // Fetch parts data
  const { data: cpus = [] } = useQuery({ queryKey: ['cpus'], queryFn: () => partsApi.getCPUs().then(r => r.data) });
  const { data: motherboards = [] } = useQuery({ queryKey: ['motherboards'], queryFn: () => partsApi.getMotherboards().then(r => r.data) });
  const { data: rams = [] } = useQuery({ queryKey: ['rams'], queryFn: () => partsApi.getRAMs().then(r => r.data) });
  const { data: gpus = [] } = useQuery({ queryKey: ['gpus'], queryFn: () => partsApi.getGPUs().then(r => r.data) });
  const { data: storages = [] } = useQuery({ queryKey: ['storages'], queryFn: () => partsApi.getStorages().then(r => r.data) });
  const { data: psus = [] } = useQuery({ queryKey: ['psus'], queryFn: () => partsApi.getPSUs().then(r => r.data) });
  const { data: cases = [] } = useQuery({ queryKey: ['cases'], queryFn: () => partsApi.getCases().then(r => r.data) });

  const saveBuildMutation = useMutation({
    mutationFn: (buildData: Partial<Build>) => buildsApi.createBuild(buildData),
    onSuccess: (response) => {
      alert(`Build saved! Share code: ${response.data.shareCode}`);
    },
  });

  const selectPart = (category: PartCategory, partId: number) => {
    setBuild(prev => {
      const updated = { ...prev };
      
      switch (category) {
        case PartCategory.CPU:
          updated.cpuId = partId;
          updated.cpu = cpus.find(c => c.id === partId);
          break;
        case PartCategory.Motherboard:
          updated.motherboardId = partId;
          updated.motherboard = motherboards.find(m => m.id === partId);
          break;
        case PartCategory.RAM:
          updated.ramId = partId;
          updated.ram = rams.find(r => r.id === partId);
          break;
        case PartCategory.GPU:
          updated.gpuId = partId;
          updated.gpu = gpus.find(g => g.id === partId);
          break;
        case PartCategory.Storage:
          updated.storageId = partId;
          updated.storage = storages.find(s => s.id === partId);
          break;
        case PartCategory.PSU:
          updated.psuId = partId;
          updated.psu = psus.find(p => p.id === partId);
          break;
        case PartCategory.Case:
          updated.caseId = partId;
          updated.case = cases.find(c => c.id === partId);
          break;
      }

      // Calculate totals
      updated.totalPrice = 
        (updated.cpu?.price || 0) +
        (updated.motherboard?.price || 0) +
        (updated.ram?.price || 0) +
        (updated.gpu?.price || 0) +
        (updated.storage?.price || 0) +
        (updated.psu?.price || 0) +
        (updated.case?.price || 0);

      updated.totalWattage =
        (updated.cpu?.wattage || 0) +
        (updated.motherboard?.wattage || 0) +
        (updated.ram?.wattage || 0) +
        (updated.gpu?.wattage || 0) +
        (updated.storage?.wattage || 0) + 50; // Base system

      return updated;
    });
  };

  const saveBuild = () => {
    saveBuildMutation.mutate(build);
  };

  const getCurrentParts = () => {
    switch (selectedCategory) {
      case PartCategory.CPU: return cpus;
      case PartCategory.Motherboard: return motherboards;
      case PartCategory.RAM: return rams;
      case PartCategory.GPU: return gpus;
      case PartCategory.Storage: return storages;
      case PartCategory.PSU: return psus;
      case PartCategory.Case: return cases;
      default: return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-3xl font-bold">PC Part Picker</h1>
        <p className="text-blue-100">Build your dream PC with compatibility checks</p>
      </header>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Category Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-bold mb-4">Categories</h2>
              <div className="space-y-2">
                {Object.values(PartCategory).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left p-3 rounded transition ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{category}</span>
                      {build[`${category.toLowerCase()}Id` as keyof Build] && (
                        <span className="text-xs">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Build Summary */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-bold text-lg mb-2">Build Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Price:</span>
                    <span className="font-bold">${build.totalPrice?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Wattage:</span>
                    <span className="font-bold">{build.totalWattage}W</span>
                  </div>
                  {build.psu && (
                    <div className="flex justify-between">
                      <span>PSU Headroom:</span>
                      <span className={`font-bold ${
                        (build.psu.wattageRating - (build.totalWattage || 0)) > 100
                          ? 'text-green-600'
                          : 'text-yellow-600'
                      }`}>
                        {build.psu.wattageRating - (build.totalWattage || 0)}W
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={saveBuild}
                  className="w-full mt-4 bg-green-600 text-white p-2 rounded hover:bg-green-700 transition"
                >
                  Save Build
                </button>
              </div>
            </div>
          </div>

          {/* Parts List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-bold mb-4">Select {selectedCategory}</h2>
              <div className="space-y-2">
                {getCurrentParts().length === 0 ? (
                  <p className="text-gray-500">No parts available. Add parts from the admin panel.</p>
                ) : (
                  getCurrentParts().map((part: any) => (
                    <div
                      key={part.id}
                      onClick={() => selectPart(selectedCategory, part.id)}
                      className={`p-4 border rounded cursor-pointer hover:bg-blue-50 transition ${
                        build[`${selectedCategory.toLowerCase()}Id` as keyof Build] === part.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{part.name}</h3>
                          <p className="text-sm text-gray-600">{part.manufacturer}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${part.price}</p>
                          <p className="text-xs text-gray-500">{part.wattage}W</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Compatibility Warnings - Hidden for now */}
            {/* Can be enabled when compatibility check is integrated */}
          </div>
        </div>
      </div>
    </div>
  );
}
