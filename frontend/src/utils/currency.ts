export function formatEur(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(n);
}
