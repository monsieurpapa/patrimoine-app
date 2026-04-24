export function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function fmtMoney(amount, currency) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + (currency || 'CDF');
}

// Stock is always derived — never stored as a mutable counter.
// Computed from initialStock minus the sum of all recorded sales quantities.
// Pass ALL sales (no date bound) so accuracy is maintained as history grows.
export function currentStock(item, sales) {
  const sold = sales
    .filter(s => s.assetId === item.assetId)
    .flatMap(s => s.items || [])
    .filter(i => i.itemId === item.id)
    .reduce((sum, i) => sum + (i.quantity || 0), 0);
  return item.initialStock - sold;
}
