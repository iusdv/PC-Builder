import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { buildsApi } from '../api/client';
import { formatEur } from '../utils/currency';

export default function SharePage() {
  const { shareCode } = useParams<{ shareCode: string }>();

  const priceText = (value: number | null | undefined) =>
    value == null ? '—' : formatEur(value);
  
  const { data: build, isLoading, error } = useQuery({
    queryKey: ['build', shareCode],
    queryFn: () => buildsApi.getBuildByShareCode(shareCode!).then(r => r.data),
    enabled: !!shareCode,
  });

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-[#37b48f]">Build not found</div>;
  if (!build) return null;

  return (
    <div className="min-h-screen">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-3xl font-bold">PC Build - {build.name}</h1>
        {build.description && <p className="text-blue-100">{build.description}</p>}
      </header>

      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-white rounded">
              <h3 className="font-semibold text-gray-600">Total Price</h3>
              <p className="text-3xl font-bold text-green-600">{priceText(build.totalPrice)}</p>
            </div>
            <div className="p-4 bg-white rounded">
              <h3 className="font-semibold text-gray-600">Total Wattage</h3>
              <p className="text-3xl font-bold text-blue-600">{build.totalWattage}W</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4">Parts List</h2>
          
          <div className="space-y-4">
            {build.cpu && (
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-700">CPU</h3>
                <p className="text-lg">{build.cpu.name}</p>
                <p className="text-sm text-gray-600">{build.cpu.manufacturer}</p>
                <p className="text-green-600 font-semibold">{priceText(build.cpu.price)}</p>
              </div>
            )}

            {build.motherboard && (
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-700">Motherboard</h3>
                <p className="text-lg">{build.motherboard.name}</p>
                <p className="text-sm text-gray-600">{build.motherboard.manufacturer}</p>
                <p className="text-green-600 font-semibold">{priceText(build.motherboard.price)}</p>
              </div>
            )}

            {build.ram && (
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-700">RAM</h3>
                <p className="text-lg">{build.ram.name}</p>
                <p className="text-sm text-gray-600">{build.ram.manufacturer}</p>
                <p className="text-green-600 font-semibold">{priceText(build.ram.price)}</p>
              </div>
            )}

            {build.gpu && (
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-700">GPU</h3>
                <p className="text-lg">{build.gpu.name}</p>
                <p className="text-sm text-gray-600">{build.gpu.manufacturer}</p>
                <p className="text-green-600 font-semibold">{priceText(build.gpu.price)}</p>
              </div>
            )}

            {build.storage && (
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-700">Storage</h3>
                <p className="text-lg">{build.storage.name}</p>
                <p className="text-sm text-gray-600">{build.storage.manufacturer}</p>
                <p className="text-green-600 font-semibold">{priceText(build.storage.price)}</p>
              </div>
            )}

            {build.psu && (
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-700">PSU</h3>
                <p className="text-lg">{build.psu.name}</p>
                <p className="text-sm text-gray-600">{build.psu.manufacturer}</p>
                <p className="text-green-600 font-semibold">{priceText(build.psu.price)}</p>
              </div>
            )}

            {build.case && (
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-700">Case</h3>
                <p className="text-lg">{build.case.name}</p>
                <p className="text-sm text-gray-600">{build.case.manufacturer}</p>
                <p className="text-green-600 font-semibold">{priceText(build.case.price)}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Print
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
