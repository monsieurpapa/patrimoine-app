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

export function currentStock(item, sales, stockIns = [], snapshotStock = null) {
  const base = snapshotStock !== null ? snapshotStock : (item.initialStock || 0);
  const sold = sales
    .filter(s => s.assetId === item.assetId)
    .flatMap(s => s.items || [])
    .filter(i => i.itemId === item.id)
    .reduce((sum, i) => sum + (i.quantity || 0), 0);
  const added = stockIns
    .filter(s => s.itemId === item.id)
    .reduce((sum, s) => sum + (s.quantity || 0), 0);
  return base + added - sold;
}
