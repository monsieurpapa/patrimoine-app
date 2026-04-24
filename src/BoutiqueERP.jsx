import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { ShoppingCart, Package, AlertTriangle, Plus, Edit2, Trash2, ChevronDown, ChevronUp, X, Check } from 'lucide-react';

const CURRENCIES = ['CDF', 'USD', 'EUR'];

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

function fmtMoney(amount, currency) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + (currency || 'CDF');
}

function ItemForm({ item, assetId, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    unitPrice: item?.unitPrice ?? '',
    currency: item?.currency || 'CDF',
    initialStock: item?.initialStock ?? '',
    reorderThreshold: item?.reorderThreshold ?? '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.unitPrice === '' || form.initialStock === '') return;
    onSave({
      id: item?.id || ('i' + Date.now()),
      assetId,
      name: form.name.trim(),
      unit: 'pièce',
      unitPrice: Number(form.unitPrice),
      currency: form.currency,
      initialStock: Number(form.initialStock),
      reorderThreshold: Number(form.reorderThreshold) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Nom de l'article *</label>
        <input
          className="input"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="ex: Savon Omo 200g"
          required
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Prix unitaire *</label>
          <input
            className="input"
            type="number"
            min="0"
            value={form.unitPrice}
            onChange={e => set('unitPrice', e.target.value)}
            placeholder="500"
            required
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Devise</label>
          <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)} style={{ width: '100%' }}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Stock initial *</label>
          <input
            className="input"
            type="number"
            min="0"
            value={form.initialStock}
            onChange={e => set('initialStock', e.target.value)}
            placeholder="100"
            required
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Seuil de réapprovisionnement</label>
          <input
            className="input"
            type="number"
            min="0"
            value={form.reorderThreshold}
            onChange={e => set('reorderThreshold', e.target.value)}
            placeholder="20"
            style={{ width: '100%' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ fontSize: 13 }}>Annuler</button>
        <button type="submit" className="btn" style={{ fontSize: 13 }}>
          {item ? 'Enregistrer' : 'Ajouter l\'article'}
        </button>
      </div>
    </form>
  );
}

function DeleteConfirm({ itemName, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="card" style={{ maxWidth: 360, width: '100%', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <AlertTriangle size={18} style={{ color: 'var(--negative)', flexShrink: 0 }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>Supprimer l'article</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
          Supprimer <strong style={{ color: 'var(--ink)' }}>{itemName}</strong> du catalogue ? Cette action est irréversible.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel} style={{ fontSize: 13 }}>Annuler</button>
          <button className="btn" style={{ fontSize: 13, background: 'var(--negative)', color: '#fff', border: 'none' }} onClick={onConfirm}>Supprimer</button>
        </div>
      </div>
    </div>
  );
}

export default function BoutiqueERP({ user, assets }) {
  const retailAssets = (assets || []).filter(a => a.sector === 'retail');
  const [tab, setTab] = useState('catalogue');
  const [selectedAsset, setSelectedAsset] = useState(retailAssets[0]?.id || null);
  const [catalogItems, setCatalogItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [expandedSale, setExpandedSale] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [catalogDoc, salesSnap] = await Promise.all([
        getDoc(doc(db, 'catalog', user.uid)),
        getDocs(query(
          collection(db, 'sales'),
          where('ownerId', '==', user.uid),
          orderBy('submittedAt', 'desc')
        )),
      ]);
      const items = catalogDoc.exists() ? (catalogDoc.data()?.data || []) : [];
      setCatalogItems(Array.isArray(items) ? items : []);
      setSales(salesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('BoutiqueERP load error:', e);
      setCatalogItems([]);
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveCatalog = async (items) => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'catalog', user.uid), { data: items });
      setCatalogItems(items);
    } catch (e) {
      console.error('Save catalog error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (item) => {
    const updated = [...catalogItems, item];
    await saveCatalog(updated);
    setShowAddForm(false);
  };

  const handleEditItem = async (item) => {
    const updated = catalogItems.map(i => i.id === item.id ? item : i);
    await saveCatalog(updated);
    setEditingItem(null);
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    const updated = catalogItems.filter(i => i.id !== deletingItem.id);
    await saveCatalog(updated);
    setDeletingItem(null);
  };

  const currentStock = (item) => {
    const sold = sales
      .filter(s => s.assetId === item.assetId)
      .flatMap(s => s.items || [])
      .filter(i => i.itemId === item.id)
      .reduce((sum, i) => sum + (i.quantity || 0), 0);
    return item.initialStock - sold;
  };

  const assetItems = catalogItems.filter(i => !selectedAsset || i.assetId === selectedAsset);
  const assetSales = sales.filter(s => !selectedAsset || s.assetId === selectedAsset);
  const lowStockItems = catalogItems.filter(i => currentStock(i) <= i.reorderThreshold);

  const salesByDate = assetSales.reduce((acc, s) => {
    const date = s.date || (s.submittedAt?.toDate ? s.submittedAt.toDate().toISOString().slice(0, 10) : '');
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});

  const tabs = [
    { id: 'catalogue', label: 'Catalogue', icon: Package },
    { id: 'ventes', label: 'Ventes', icon: ShoppingCart },
    { id: 'alertes', label: 'Alertes', icon: AlertTriangle, badge: lowStockItems.length },
  ];

  if (retailAssets.length === 0) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
        <ShoppingCart size={32} style={{ color: 'var(--muted)', marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Aucun actif retail</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Ajoutez un actif avec le secteur "Boutique/Retail" pour accéder au module ERP.</div>
      </div>
    );
  }

  return (
    <div>
      {retailAssets.length > 1 && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {retailAssets.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedAsset(a.id)}
              className={selectedAsset === a.id ? 'btn' : 'btn btn-ghost'}
              style={{ fontSize: 12 }}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              fontSize: 13, fontWeight: 500, padding: '8px 14px', border: 'none',
              background: 'none', cursor: 'pointer',
              color: tab === t.id ? 'var(--primary)' : 'var(--muted)',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}
          >
            <t.icon size={14} />
            {t.label}
            {t.badge > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: 'var(--warning, #f59e0b)', color: '#fff' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>Chargement...</div>
      ) : (
        <>
          {/* CATALOGUE TAB */}
          {tab === 'catalogue' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{assetItems.length} article{assetItems.length !== 1 ? 's' : ''}</div>
                {!showAddForm && (
                  <button className="btn" style={{ fontSize: 12 }} onClick={() => setShowAddForm(true)}>
                    <Plus size={13} /> Ajouter un article
                  </button>
                )}
              </div>

              {showAddForm && (
                <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Nouvel article</div>
                  <ItemForm
                    assetId={selectedAsset || retailAssets[0]?.id}
                    onSave={handleAddItem}
                    onCancel={() => setShowAddForm(false)}
                  />
                </div>
              )}

              {assetItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                  <Package size={28} style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 14 }}>Catalogue vide. Ajoutez vos articles.</div>
                </div>
              ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                  {assetItems.map((item, idx) => {
                    const stock = currentStock(item);
                    const isLow = stock <= item.reorderThreshold;
                    const isEditing = editingItem?.id === item.id;
                    return (
                      <div key={item.id} style={{ borderBottom: idx < assetItems.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
                        {isEditing ? (
                          <div style={{ padding: '16px' }}>
                            <ItemForm item={item} assetId={item.assetId} onSave={handleEditItem} onCancel={() => setEditingItem(null)} />
                          </div>
                        ) : (
                          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</span>
                                {isLow && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'var(--warning, #f59e0b)22', color: 'var(--warning, #f59e0b)' }}>
                                    stock bas
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12 }}>
                                <span>{fmtMoney(item.unitPrice, item.currency)} / pièce</span>
                                <span>Stock: <strong style={{ color: isLow ? 'var(--warning, #f59e0b)' : 'var(--ink)' }}>{stock}</strong></span>
                                {item.reorderThreshold > 0 && <span>Seuil: {item.reorderThreshold}</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => setEditingItem(item)}>
                                <Edit2 size={12} />
                              </button>
                              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px', color: 'var(--negative)' }} onClick={() => setDeletingItem(item)}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VENTES TAB */}
          {tab === 'ventes' && (
            <div>
              {assetSales.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                  <ShoppingCart size={28} style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 14 }}>Aucune vente enregistrée.</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Le gestionnaire soumet les ventes depuis son application.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(salesByDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, daySales]) => {
                    const dayTotal = daySales.reduce((s, sale) => s + (sale.total || 0), 0);
                    const allItems = daySales.flatMap(s => s.items || []);
                    const topItems = Object.entries(
                      allItems.reduce((acc, i) => { acc[i.name] = (acc[i.name] || 0) + i.quantity; return acc; }, {})
                    ).sort(([, a], [, b]) => b - a).slice(0, 3);
                    const isExpanded = expandedSale === date;
                    return (
                      <div key={date} className="card" style={{ overflow: 'hidden' }}>
                        <div
                          style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                          onClick={() => setExpandedSale(isExpanded ? null : date)}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{fmtDate(date)}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                              {topItems.map(([n, q]) => `${n} ×${q}`).join(' · ')}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                              {fmtMoney(dayTotal, daySales[0]?.currency)}
                            </span>
                            {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--muted)' }} />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--line-2)', padding: '12px 16px' }}>
                            {daySales.map((sale, si) => (
                              <div key={sale.id} style={{ marginBottom: si < daySales.length - 1 ? 12 : 0 }}>
                                {daySales.length > 1 && (
                                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>
                                    Soumission {si + 1}
                                  </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {(sale.items || []).map((item, ii) => (
                                    <div key={ii} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                      <span>{item.name} <span style={{ color: 'var(--muted)' }}>×{item.quantity}</span></span>
                                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{fmtMoney(item.subtotal, sale.currency)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <div style={{ borderTop: '1px solid var(--line-2)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                              <span>Total du jour</span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtMoney(dayTotal, daySales[0]?.currency)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ALERTES TAB */}
          {tab === 'alertes' && (
            <div>
              {lowStockItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                  <Check size={28} style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 14 }}>Aucune alerte de stock.</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Tous les articles sont au-dessus du seuil de réapprovisionnement.</div>
                </div>
              ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-2)', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                    {lowStockItems.length} article{lowStockItems.length !== 1 ? 's' : ''} à réapprovisionner
                  </div>
                  {lowStockItems.map((item, idx) => {
                    const stock = currentStock(item);
                    const lastSale = sales
                      .filter(s => (s.items || []).some(i => i.itemId === item.id))
                      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
                    return (
                      <div key={item.id} style={{ padding: '14px 16px', borderBottom: idx < lowStockItems.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{item.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                              Seuil: {item.reorderThreshold} · Dernière vente: {lastSale ? fmtDate(lastSale.date) : '—'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--warning, #f59e0b)' }}>{stock}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>pièces restantes</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {deletingItem && (
        <DeleteConfirm
          itemName={deletingItem.name}
          onConfirm={handleDeleteItem}
          onCancel={() => setDeletingItem(null)}
        />
      )}
    </div>
  );
}
