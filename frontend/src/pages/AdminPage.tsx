import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { partsApi } from '../api/client';
import { SocketType, RAMType, FormFactor } from '../types';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'cpu' | 'motherboard'>('cpu');
  const queryClient = useQueryClient();

  const [cpuForm, setCpuForm] = useState<{
    name: string;
    manufacturer: string;
    price: number;
    wattage: number;
    socket: SocketType;
    coreCount: number;
    threadCount: number;
    baseClock: number;
    boostClock: number;
    integratedGraphics: boolean;
  }>({
    name: '',
    manufacturer: '',
    price: 0,
    wattage: 0,
    socket: SocketType.AM5,
    coreCount: 0,
    threadCount: 0,
    baseClock: 0,
    boostClock: 0,
    integratedGraphics: false,
  });

  const [motherboardForm, setMotherboardForm] = useState<{
    name: string;
    manufacturer: string;
    price: number;
    wattage: number;
    socket: SocketType;
    chipset: string;
    formFactor: FormFactor;
    memoryType: RAMType;
    memorySlots: number;
    maxMemoryGB: number;
    pCIeSlots: number;
    m2Slots: number;
    sataSlots: number;
  }>({
    name: '',
    manufacturer: '',
    price: 0,
    wattage: 50,
    socket: SocketType.AM5,
    chipset: '',
    formFactor: FormFactor.ATX,
    memoryType: RAMType.DDR5,
    memorySlots: 4,
    maxMemoryGB: 128,
    pCIeSlots: 2,
    m2Slots: 2,
    sataSlots: 4,
  });

  const createCPUMutation = useMutation({
    mutationFn: (cpu: any) => partsApi.createCPU(cpu),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpus'] });
      alert('CPU added successfully!');
      setCpuForm({
        name: '',
        manufacturer: '',
        price: 0,
        wattage: 0,
        socket: SocketType.AM5,
        coreCount: 0,
        threadCount: 0,
        baseClock: 0,
        boostClock: 0,
        integratedGraphics: false,
      });
    },
  });

  const createMotherboardMutation = useMutation({
    mutationFn: (motherboard: any) => partsApi.createMotherboard(motherboard),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motherboards'] });
      alert('Motherboard added successfully!');
      setMotherboardForm({
        name: '',
        manufacturer: '',
        price: 0,
        wattage: 50,
        socket: SocketType.AM5,
        chipset: '',
        formFactor: FormFactor.ATX,
        memoryType: RAMType.DDR5,
        memorySlots: 4,
        maxMemoryGB: 128,
        pCIeSlots: 2,
        m2Slots: 2,
        sataSlots: 4,
      });
    },
  });

  const handleCreateCPU = (e: React.FormEvent) => {
    e.preventDefault();
    createCPUMutation.mutate(cpuForm);
  };

  const handleCreateMotherboard = (e: React.FormEvent) => {
    e.preventDefault();
    createMotherboardMutation.mutate(motherboardForm);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-purple-600 text-white p-4 shadow-md">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-purple-100">Manage PC parts inventory</p>
      </header>

      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('cpu')}
              className={`flex-1 p-4 font-semibold ${
                activeTab === 'cpu'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Add CPU
            </button>
            <button
              onClick={() => setActiveTab('motherboard')}
              className={`flex-1 p-4 font-semibold ${
                activeTab === 'motherboard'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Add Motherboard
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'cpu' ? (
              <form onSubmit={handleCreateCPU} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={cpuForm.name}
                    onChange={(e) => setCpuForm({ ...cpuForm, name: e.target.value })}
                    className="w-full border rounded p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={cpuForm.manufacturer}
                    onChange={(e) => setCpuForm({ ...cpuForm, manufacturer: e.target.value })}
                    className="w-full border rounded p-2"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cpuForm.price}
                      onChange={(e) => setCpuForm({ ...cpuForm, price: parseFloat(e.target.value) })}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Wattage (TDP)</label>
                    <input
                      type="number"
                      value={cpuForm.wattage}
                      onChange={(e) => setCpuForm({ ...cpuForm, wattage: parseInt(e.target.value) })}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Socket</label>
                  <select
                    value={cpuForm.socket}
                    onChange={(e) => setCpuForm({ ...cpuForm, socket: e.target.value as SocketType })}
                    className="w-full border rounded p-2"
                  >
                    {Object.values(SocketType).map(socket => (
                      <option key={socket} value={socket}>{socket}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Core Count</label>
                    <input
                      type="number"
                      value={cpuForm.coreCount}
                      onChange={(e) => setCpuForm({ ...cpuForm, coreCount: parseInt(e.target.value) })}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Thread Count</label>
                    <input
                      type="number"
                      value={cpuForm.threadCount}
                      onChange={(e) => setCpuForm({ ...cpuForm, threadCount: parseInt(e.target.value) })}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Base Clock (GHz)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cpuForm.baseClock}
                      onChange={(e) => setCpuForm({ ...cpuForm, baseClock: parseFloat(e.target.value) })}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Boost Clock (GHz)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cpuForm.boostClock}
                      onChange={(e) => setCpuForm({ ...cpuForm, boostClock: parseFloat(e.target.value) })}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={cpuForm.integratedGraphics}
                      onChange={(e) => setCpuForm({ ...cpuForm, integratedGraphics: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Has Integrated Graphics</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white p-3 rounded hover:bg-purple-700"
                >
                  Add CPU
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreateMotherboard} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={motherboardForm.name}
                    onChange={(e) => setMotherboardForm({ ...motherboardForm, name: e.target.value })}
                    className="w-full border rounded p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={motherboardForm.manufacturer}
                    onChange={(e) => setMotherboardForm({ ...motherboardForm, manufacturer: e.target.value })}
                    className="w-full border rounded p-2"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={motherboardForm.price}
                      onChange={(e) => setMotherboardForm({ ...motherboardForm, price: parseFloat(e.target.value) })}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Chipset</label>
                    <input
                      type="text"
                      value={motherboardForm.chipset}
                      onChange={(e) => setMotherboardForm({ ...motherboardForm, chipset: e.target.value })}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Socket</label>
                    <select
                      value={motherboardForm.socket}
                      onChange={(e) => setMotherboardForm({ ...motherboardForm, socket: e.target.value as SocketType })}
                      className="w-full border rounded p-2"
                    >
                      {Object.values(SocketType).map(socket => (
                        <option key={socket} value={socket}>{socket}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Form Factor</label>
                    <select
                      value={motherboardForm.formFactor}
                      onChange={(e) => setMotherboardForm({ ...motherboardForm, formFactor: e.target.value as FormFactor })}
                      className="w-full border rounded p-2"
                    >
                      {Object.values(FormFactor).map(ff => (
                        <option key={ff} value={ff}>{ff}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Memory Type</label>
                    <select
                      value={motherboardForm.memoryType}
                      onChange={(e) => setMotherboardForm({ ...motherboardForm, memoryType: e.target.value as RAMType })}
                      className="w-full border rounded p-2"
                    >
                      {Object.values(RAMType).map(ram => (
                        <option key={ram} value={ram}>{ram}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Memory Slots</label>
                    <input
                      type="number"
                      value={motherboardForm.memorySlots}
                      onChange={(e) => setMotherboardForm({ ...motherboardForm, memorySlots: parseInt(e.target.value) })}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white p-3 rounded hover:bg-purple-700"
                >
                  Add Motherboard
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
