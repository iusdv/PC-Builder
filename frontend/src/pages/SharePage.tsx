import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { buildsApi } from '../api/client';
import { formatEur } from '../utils/currency';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';

export default function SharePage() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const toast = useToast();

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
      <div className="border-b border-[var(--border)] pb-4 flex gap-4 items-start">
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
              <h3 className="font-semibold text-[var(--muted)]">{label}</h3>
              <p className="text-lg truncate" title={part.name}>
                {part.name}
              </p>
              {part.manufacturer && <p className="text-sm text-[var(--muted)]">{part.manufacturer}</p>}
              <p className="text-[var(--text)] font-semibold">{priceText(part.price)}</p>
            </div>

            {part.productUrl && (
              <a
                href={part.productUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 btn btn-primary text-sm"
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

  if (isLoading) return <div className="app-shell p-8 text-sm text-[var(--muted)]">Loading...</div>;
  if (error) return <div className="app-shell p-8 text-sm text-[var(--muted)]">Build not found</div>;
  if (!build) return null;

  return (
    <PageShell
      title={build.name}
      subtitle={build.description ?? 'Shared build'}
      right={
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn btn-secondary text-sm">
            Print
          </button>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied.');
              } catch {
                toast.error('Could not copy link.');
              }
            }}
            className="btn btn-secondary text-sm"
          >
            Copy Link
          </button>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded bg-[var(--surface-2)] border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--muted)]">Total Price</h3>
              <p className="text-3xl font-bold text-[var(--text)]">{priceText(build.totalPrice)}</p>
            </div>
            <div className="p-4 rounded bg-[var(--surface-2)] border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--muted)]">Estimated Wattage</h3>
              <p className="text-3xl font-bold text-[var(--text)]">{build.totalWattage}W</p>
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
        </Card>
      </div>
    </PageShell>
  );
}
