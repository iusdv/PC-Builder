import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { buildsApi } from '../api/client';
import { formatEur } from '../utils/currency';

export default function SharePage() {
  const { shareCode } = useParams<{ shareCode: string }>();

  const partPlaceholderSrc = '/placeholder-part.svg';

  const priceText = (value: number | null | undefined) =>
    value == null ? '—' : formatEur(value);

  const renderPartRow = (
    label: string,
    part:
      | {
          name: string;
          manufacturer?: string;
          price?: number | null;
          imageUrl?: string;
          productUrl?: string;
        }
      | null
      | undefined,
  ) => {
    if (!part) return null;

    return (
      <div className="border-b pb-4 flex gap-4 items-start">
        <img
          src={part.imageUrl || partPlaceholderSrc}
          alt={part.name}
          className="w-20 h-20 object-contain"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.endsWith(partPlaceholderSrc)) return;
            img.src = partPlaceholderSrc;
          }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-700">{label}</h3>
              <p className="text-lg truncate" title={part.name}>
                {part.name}
              </p>
              {part.manufacturer && <p className="text-sm text-gray-600">{part.manufacturer}</p>}
              <p className="text-green-600 font-semibold">{priceText(part.price)}</p>
            </div>

            {part.productUrl && (
              <a
                href={part.productUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 bg-[#37b48f] text-white px-4 py-2 rounded text-sm font-semibold hover:bg-[#2ea37f]"
              >
                Buy
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const { data: build, isLoading, error } = useQuery({
    queryKey: ['build', shareCode],
    queryFn: () => buildsApi.getBuildByShareCode(shareCode!).then(r => r.data),
    enabled: !!shareCode,
  });

  if (isLoading) return <div className="min-h-screen bg-[#f4f4f3] p-8">Loading...</div>;
  if (error) return <div className="min-h-screen bg-[#f4f4f3] p-8 text-[#37b48f]">Build not found</div>;
  if (!build) return null;

  return (
    <div className="min-h-screen bg-[#f4f4f3]">
      <header className="bg-[#545578]">
        <div className="container mx-auto max-w-4xl px-4 py-6 text-center text-white">
          <h1 className="text-3xl font-bold text-white">{build.name}</h1>
          {build.description && <p className="mt-2 text-white/80">{build.description}</p>}
        </div>
      </header>

      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-white rounded">
              <h3 className="font-semibold text-gray-600">Total Price</h3>
              <p className="text-3xl font-bold text-green-600">{priceText(build.totalPrice)}</p>
            </div>
            <div className="p-4 bg-white rounded">
              <h3 className="font-semibold text-gray-600">Estimated Wattage</h3>
              <p className="text-3xl font-bold text-blue-600">{build.totalWattage}W</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4">Parts List</h2>
          
          <div className="space-y-4">
            {renderPartRow('CPU', build.cpu)}
            {renderPartRow('CPU Cooler', build.cooler)}
            {renderPartRow('Motherboard', build.motherboard)}
            {renderPartRow('RAM', build.ram)}
            {renderPartRow('GPU', build.gpu)}
            {renderPartRow('Storage', build.storage)}
            {renderPartRow('Power Supply', build.psu)}
            {renderPartRow('Case', build.case)}
            {renderPartRow('Case Fan', build.caseFan)}
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
