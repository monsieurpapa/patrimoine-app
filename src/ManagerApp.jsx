import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, authService } from './firebase';
import { fmtDate as fmtDateShort } from './utils';

const TODAY = () => new Date().toISOString().slice(0, 10);

const CURRENCY_SYMBOLS = { USD: '$', CDF: 'FC', EUR: '€' };

function amountFontSize(str) {
  const digits = str.replace(/\D/g, '').length;
  if (digits > 9) return '15px';
  if (digits > 6) return '20px';
  return '26px';
}

function fmt(n, cur) {
  const sym = CURRENCY_SYMBOLS[cur] || '$';
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat('fr-FR').format(abs);
  const sign = n >= 0 ? '+' : '−';
  return cur === 'CDF' ? `${sign} ${formatted} ${sym}` : `${sign} ${sym}${formatted}`;
}

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ---- Shared tokens ----
const T = {
  cream: '#F5EFE4',
  green: '#2D5043',
  greenLight: '#3D6B58',
  terracotta: '#C4702E',
  amber: '#B8720A',
  amberBg: '#FEF3C7',
  income: '#2A7A50',
  border: '#DDD5C8',
  muted: '#6B6B6B',
  text: '#1A1A1A',
  white: '#FFFFFF',
};

const S = {
  root: {
    minHeight: '100vh',
    background: T.cream,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    color: T.text,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: T.green,
    padding: '48px 20px 20px',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  headerName: {
    fontFamily: "'Fraunces', serif",
    fontSize: 22,
    fontWeight: 600,
    color: T.white,
    lineHeight: 1.2,
  },
  offlineBanner: {
    background: T.amberBg,
    borderBottom: `1px solid #FCD34D`,
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 500,
    color: T.amber,
  },
  body: {
    flex: 1,
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    maxWidth: 480,
    width: '100%',
    margin: '0 auto',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: T.muted,
    marginBottom: 6,
  },
  inputRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  card: {
    background: T.white,
    borderRadius: 12,
    padding: '14px 14px 12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: `1.5px solid ${T.border}`,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  currencyTag: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: T.muted,
    marginTop: 4,
  },
  netRow: {
    background: T.white,
    borderRadius: 8,
    padding: '12px 14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: `1px solid ${T.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  metaField: {
    background: T.white,
    borderRadius: 8,
    padding: '10px 12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: `1px solid ${T.border}`,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: T.muted,
    marginBottom: 4,
  },
  notesField: {
    background: T.white,
    borderRadius: 8,
    padding: '12px 14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: `1px solid ${T.border}`,
  },
  ctaBtn: {
    marginTop: 4,
    padding: '16px 24px',
    borderRadius: 12,
    fontFamily: "'Instrument Sans', sans-serif",
    fontSize: 16,
    fontWeight: 600,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    border: 'none',
    letterSpacing: '0.01em',
  },
};

// ---- Input component ----
function AmountInput({ label, value, onChange, color, borderColor }) {
  const fontSize = amountFontSize(value);
  return (
    <div style={{ ...S.card, borderTop: `3px solid ${borderColor}` }}>
      <div style={{ ...S.cardLabel, color }}>{label}</div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.]/g, '');
          onChange(v);
        }}
        placeholder="0"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize,
          fontWeight: 600,
          color: value ? T.text : T.border,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          width: '100%',
          padding: 0,
          lineHeight: 1,
          transition: 'font-size 0.1s',
        }}
        aria-label={label}
      />
      <div style={S.currencyTag}>{/* shown via meta field below */}</div>
    </div>
  );
}

// ---- Loading screen ----
function Loading() {
  return (
    <div style={{ ...S.root, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 16px' }} />
        <div style={{ color: T.muted, fontSize: 14 }}>Chargement...</div>
      </div>
    </div>
  );
}

// ---- No assets screen ----
function NoAssets({ onLogout }) {
  return (
    <div style={{ ...S.root, alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: T.green, marginBottom: 12 }}>
        Aucun actif assigné
      </div>
      <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, marginBottom: 32 }}>
        Le patriarche ne vous a pas encore assigné d'actif à gérer.
        Contactez-le pour recevoir votre invitation.
      </div>
      <button onClick={onLogout} style={{ fontSize: 14, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
        Se déconnecter
      </button>
    </div>
  );
}

// ---- Asset picker screen ----
function AssetPicker({ assets, onSelect, onLogout }) {
  return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={S.headerLabel}>Sélectionner un actif</div>
        <div style={S.headerName}>Quel rapport soumettez-vous ?</div>
      </div>
      <div style={S.body}>
        {assets.map((asset) => (
          <button
            key={asset.id}
            onClick={() => onSelect(asset)}
            style={{
              ...S.card,
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              borderLeft: `4px solid ${T.green}`,
              padding: '16px 14px',
            }}
          >
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 4 }}>
              {asset.name}
            </div>
            {asset.sector && (
              <div style={{ fontSize: 12, color: T.muted, textTransform: 'capitalize' }}>{asset.sector}</div>
            )}
          </button>
        ))}
        <button onClick={onLogout} style={{ fontSize: 13, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: 8 }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

// ---- Entry screen ----
function EntryScreen({ asset, isOnline, onSubmit, onLogout }) {
  const [revenue, setRevenue] = useState('');
  const [expenses, setExpenses] = useState('');
  const [date, setDate] = useState(TODAY());
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const net = (parseFloat(revenue) || 0) - (parseFloat(expenses) || 0);
  const netColor = net >= 0 ? T.income : T.terracotta;

  const handleSubmit = () => {
    onSubmit({ revenue, expenses, date, currency, notes });
  };

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={S.headerLabel}>Rapport mensuel</div>
        <div style={S.headerName}>{asset.name}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
          {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {!isOnline && (
        <div style={S.offlineBanner}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.amber, flexShrink: 0 }} />
          Hors ligne — votre rapport sera envoyé à la reconnexion
        </div>
      )}

      <div style={S.body}>
        <div>
          <div style={S.sectionLabel}>Montants</div>
          <div style={S.inputRow}>
            <AmountInput
              label="Recettes"
              value={revenue}
              onChange={setRevenue}
              color={T.income}
              borderColor={T.income}
            />
            <AmountInput
              label="Dépenses"
              value={expenses}
              onChange={setExpenses}
              color={T.terracotta}
              borderColor={T.terracotta}
            />
          </div>
        </div>

        <div style={S.netRow}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net</span>
          <span
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: netColor }}
            aria-label={`Net: ${fmt(net, currency)}`}
          >
            {fmt(net, currency)}
          </span>
        </div>

        <div>
          <div style={S.sectionLabel}>Période</div>
          <div style={S.metaRow}>
            <div style={S.metaField}>
              <div style={S.metaLabel}>Date</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: T.text,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  padding: 0,
                }}
                aria-label="Date du rapport"
              />
            </div>

            <div style={{ ...S.metaField, position: 'relative' }}>
              <div style={S.metaLabel}>Devise</div>
              <button
                onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                style={{
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: T.text,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
                aria-label="Changer la devise"
              >
                {currency} <span style={{ color: T.muted }}>›</span>
              </button>
              {showCurrencyPicker && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: T.white,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  zIndex: 10,
                  overflow: 'hidden',
                }}>
                  {Object.keys(CURRENCY_SYMBOLS).map((cur) => (
                    <button
                      key={cur}
                      onClick={() => { setCurrency(cur); setShowCurrencyPicker(false); }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        textAlign: 'left',
                        background: cur === currency ? T.cream : T.white,
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: 14,
                        fontWeight: cur === currency ? 600 : 400,
                        color: T.text,
                      }}
                    >
                      {cur} — {CURRENCY_SYMBOLS[cur]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={S.notesField}>
          <div style={{ ...S.sectionLabel, marginBottom: 8 }}>Notes (optionnel)</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observations, problèmes, contexte..."
            rows={2}
            style={{
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: 14,
              color: T.text,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              width: '100%',
              padding: 0,
              resize: 'none',
              lineHeight: 1.5,
            }}
          />
        </div>

        <button
          data-testid="submit-btn"
          onClick={handleSubmit}
          style={{
            ...S.ctaBtn,
            background: isOnline ? T.green : '#E8E0D4',
            color: isOnline ? T.white : T.muted,
            border: isOnline ? 'none' : `1.5px dashed ${T.border}`,
            boxShadow: isOnline ? '0 4px 14px rgba(45,80,67,0.35)' : 'none',
          }}
          aria-label={isOnline ? 'Envoyer le rapport' : 'Sauvegarder hors ligne'}
        >
          {isOnline ? '↑ Envoyer le rapport' : '⏳ Sauvegarder (hors ligne)'}
        </button>

        <button onClick={onLogout} style={{ fontSize: 13, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textAlign: 'center' }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

// ---- Submitting screen ----
function Submitting() {
  return (
    <div style={{ ...S.root, alignItems: 'center', justifyContent: 'center' }}>
      <div className="pulse-dot" style={{ margin: '0 auto 16px' }} />
      <div style={{ fontSize: 14, color: T.muted }}>Envoi en cours...</div>
    </div>
  );
}

// ---- Success screen ----
function SuccessScreen({ report, asset, onNewEntry }) {
  const queued = report._queued;
  return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={S.headerLabel}>Rapport mensuel</div>
        <div style={S.headerName}>{asset.name}</div>
      </div>
      <div style={{ ...S.body, alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', paddingTop: 40 }}>
        <div style={{
          width: 72, height: 72,
          borderRadius: '50%',
          background: queued ? T.amberBg : 'rgba(45,80,67,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 30,
          marginBottom: 8,
        }}>
          {queued ? '⏳' : '✓'}
        </div>

        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, color: queued ? T.amber : T.green }}>
          {queued ? 'Rapport en attente' : 'Rapport envoyé'}
        </div>
        <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, marginTop: 8 }}>
          {queued
            ? 'Votre rapport sera envoyé dès la reconnexion.'
            : 'Le patriarche a été notifié.\nVos données sont enregistrées.'}
        </div>

        <div style={{
          background: T.white,
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: `1px solid ${T.border}`,
          width: '100%',
          marginTop: 24,
        }}>
          {[
            { label: 'Recettes', value: fmt(report.revenue, report.currency), color: T.income },
            { label: 'Dépenses', value: fmt(-report.expenses, report.currency), color: T.terracotta },
            { label: 'Net', value: fmt(report.net, report.currency), color: report.net >= 0 ? T.income : T.terracotta, bold: true },
          ].map(({ label, value, color, bold }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: label !== 'Recettes' ? `1px solid #F0EAE0` : 'none' }}>
              <span style={{ fontSize: 13, color: T.muted }}>{label}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: bold ? 16 : 14, fontWeight: 600, color }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>
          {fmtDate(report.date)}
        </div>

        <button
          onClick={onNewEntry}
          style={{
            ...S.ctaBtn,
            background: 'transparent',
            color: T.green,
            border: `1.5px solid ${T.green}`,
            boxShadow: 'none',
            marginTop: 16,
            width: '100%',
          }}
        >
          + Nouvelle saisie
        </button>
      </div>
    </div>
  );
}

// ---- Numeric input modal ----
function QtyModal({ itemName, current, onConfirm, onCancel }) {
  const [val, setVal] = useState(current > 0 ? String(current) : '');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ ...S.card, maxWidth: 320, width: '100%', padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>{itemName}</div>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="0"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 32,
            fontWeight: 700,
            color: T.text,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            width: '100%',
            padding: '8px 0',
            borderBottom: `2px solid ${T.green}`,
            marginBottom: 16,
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: T.muted }}>
            Annuler
          </button>
          <button
            onClick={() => onConfirm(parseInt(val, 10) || 0)}
            style={{ flex: 2, padding: '12px', borderRadius: 8, border: 'none', background: T.green, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Sales Entry Screen ----
function SalesScreen({ asset, ownerId, user, onLogout }) {
  const [catalogItems, setCatalogItems] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedQueued, setSubmittedQueued] = useState(false);
  const [recentSales, setRecentSales] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!ownerId) { setCatalogItems([]); return; }
    try {
      const snap = await getDoc(doc(db, 'catalog', ownerId));
      const items = snap.exists() ? (snap.data()?.data || []) : [];
      setCatalogItems(Array.isArray(items) ? items.filter(i => i.assetId === asset.id) : []);
    } catch { setCatalogItems([]); }
  }, [ownerId, asset.id]);

  const loadHistory = useCallback(async () => {
    if (!ownerId) return;
    try {
      const since = new Date(); since.setDate(since.getDate() - 7);
      const q = query(
        collection(db, 'sales'),
        where('ownerId', '==', ownerId),
        where('assetId', '==', asset.id),
        where('submittedAt', '>=', Timestamp.fromDate(since)),
        orderBy('submittedAt', 'desc')
      );
      const snap = await getDocs(q);
      setRecentSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { setRecentSales([]); }
  }, [ownerId, asset.id]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const increment = (itemId) => setQuantities(q => ({ ...q, [itemId]: (q[itemId] || 0) + 1 }));
  const setQty = (itemId, n) => setQuantities(q => ({ ...q, [itemId]: n }));

  const itemsWithQty = (catalogItems || []).filter(i => (quantities[i.id] || 0) > 0);
  const total = itemsWithQty.reduce((s, i) => s + (quantities[i.id] * i.unitPrice), 0);
  const currency = (catalogItems || [])[0]?.currency || 'CDF';

  const handleSubmit = async () => {
    if (itemsWithQty.length === 0 || !ownerId) return;
    setSubmitting(true);
    const items = itemsWithQty.map(i => ({
      itemId: i.id,
      name: i.name,
      quantity: quantities[i.id],
      unitPrice: i.unitPrice,
      subtotal: quantities[i.id] * i.unitPrice,
    }));
    const saleData = {
      ownerId,
      assetId: asset.id,
      managerId: user.uid,
      date: TODAY(),
      items,
      total,
      currency,
      status: 'submitted',
    };
    try {
      await addDoc(collection(db, 'sales'), { ...saleData, submittedAt: serverTimestamp() });
      setQuantities({});
      setSubmittedQueued(false);
      setSubmitted(true);
      await loadHistory();
    } catch (e) {
      console.error('Sales submit error:', e);
      const queue = JSON.parse(localStorage.getItem('heritage_sales_queue') || '[]');
      if (queue.length < 50) {
        // Store a deterministic _id so replay can use setDoc (idempotent — no double-submit on network flap)
        queue.push({ ...saleData, submittedAt: new Date().toISOString(), _queued: true, _id: crypto.randomUUID() });
        localStorage.setItem('heritage_sales_queue', JSON.stringify(queue));
      }
      setQuantities({});
      setSubmittedQueued(true);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (catalogItems === null) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ fontSize: 14, color: T.muted }}>Chargement du catalogue...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ ...S.body, alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingTop: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: submittedQueued ? T.amberBg : 'rgba(45,80,67,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 12 }}>
          {submittedQueued ? '⏳' : '✓'}
        </div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: submittedQueued ? T.amber : T.green }}>
          {submittedQueued ? 'Vente en attente' : 'Ventes enregistrées'}
        </div>
        <div style={{ fontSize: 14, color: T.muted, marginTop: 6 }}>
          {submittedQueued
            ? 'Hors ligne — vos ventes seront envoyées à la reconnexion.'
            : `${new Intl.NumberFormat('fr-FR').format(total)} ${currency} · ${TODAY()}`}
        </div>
        <button onClick={() => { setSubmitted(false); setSubmittedQueued(false); setShowHistory(false); }} style={{ ...S.ctaBtn, background: 'transparent', color: T.green, border: `1.5px solid ${T.green}`, boxShadow: 'none', marginTop: 20 }}>
          + Nouvelle saisie
        </button>
        {!submittedQueued && (
          <button onClick={() => { setSubmitted(false); setSubmittedQueued(false); setShowHistory(true); loadHistory(); }} style={{ fontSize: 13, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: 12 }}>
            Voir mes ventes (7 derniers jours)
          </button>
        )}
      </div>
    );
  }

  if (showHistory) {
    return (
      <div style={S.body}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: T.text }}>7 derniers jours</div>
          <button onClick={() => setShowHistory(false)} style={{ fontSize: 13, color: T.green, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour</button>
        </div>
        {recentSales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted, fontSize: 14 }}>Aucune vente enregistrée.</div>
        ) : recentSales.map(sale => (
          <div key={sale.id} style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{fmtDateShort(sale.date)}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: T.green }}>
                {new Intl.NumberFormat('fr-FR').format(sale.total)} {sale.currency}
              </span>
            </div>
            {(sale.items || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.muted, padding: '2px 0' }}>
                <span>{item.name} ×{item.quantity}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{new Intl.NumberFormat('fr-FR').format(item.subtotal)} {sale.currency}</span>
              </div>
            ))}
          </div>
        ))}
        <button onClick={() => setShowHistory(false)} style={{ fontSize: 13, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textAlign: 'center' }}>
          ← Retour à la saisie
        </button>
      </div>
    );
  }

  if (catalogItems.length === 0) {
    return (
      <div style={{ ...S.body, alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingTop: 40 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🛒</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 8 }}>Aucun article</div>
        <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.6 }}>
          Demandez au propriétaire d'ajouter les articles du catalogue.
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...S.body, flex: 1, paddingBottom: 100 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}>
          {catalogItems.map(item => {
            const qty = quantities[item.id] || 0;
            const active = qty > 0;
            return (
              <button
                key={item.id}
                onClick={() => increment(item.id)}
                style={{
                  ...S.card,
                  cursor: 'pointer',
                  borderColor: active ? T.green : T.border,
                  background: active ? 'rgba(45,80,67,0.06)' : '#fff',
                  borderWidth: active ? 2 : 1.5,
                  padding: '14px 12px',
                  textAlign: 'left',
                  position: 'relative',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4, lineHeight: 1.3 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{new Intl.NumberFormat('fr-FR').format(item.unitPrice)} {item.currency}/pièce</div>
                {active && (
                  <button
                    onClick={e => { e.stopPropagation(); setModalItem(item); }}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: T.green,
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {qty}
                  </button>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        background: T.cream,
        borderTop: `1px solid ${T.border}`,
        padding: '12px 16px',
        maxWidth: 480,
        width: '100%',
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>Total</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: T.green }}>
            {new Intl.NumberFormat('fr-FR').format(total)} {currency}
          </span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={itemsWithQty.length === 0 || submitting}
          style={{
            ...S.ctaBtn,
            background: itemsWithQty.length > 0 ? T.green : '#E8E0D4',
            color: itemsWithQty.length > 0 ? '#fff' : T.muted,
            border: 'none',
            boxShadow: itemsWithQty.length > 0 ? '0 4px 14px rgba(45,80,67,0.35)' : 'none',
            marginTop: 0,
          }}
        >
          {submitting ? 'Envoi...' : '↑ Soumettre les ventes'}
        </button>
      </div>

      {modalItem && (
        <QtyModal
          itemName={modalItem.name}
          current={quantities[modalItem.id] || 0}
          onConfirm={(n) => { setQty(modalItem.id, n); setModalItem(null); }}
          onCancel={() => setModalItem(null)}
        />
      )}
    </div>
  );
}

// ---- Root ManagerApp ----
export default function ManagerApp({ user, onLogout }) {
  const [phase, setPhase] = useState('loading');
  const [roleAssets, setRoleAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastReport, setLastReport] = useState(null);
  const [ownerId, setOwnerId] = useState(null);
  const [managerTab, setManagerTab] = useState('rapport');

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Replay queued reports and sales when coming back online
  useEffect(() => {
    if (!isOnline) return;
    (async () => {
      // Reports queue
      const reportQueue = JSON.parse(localStorage.getItem('heritage_report_queue') || '[]');
      if (reportQueue.length > 0) {
        const remaining = [];
        for (const report of reportQueue) {
          try {
            const { _queued, submittedAt: _ts, ...data } = report;
            await addDoc(collection(db, 'reports'), { ...data, submittedAt: serverTimestamp() });
          } catch {
            remaining.push(report);
          }
        }
        localStorage.setItem('heritage_report_queue', JSON.stringify(remaining));
      }
      // Sales queue — uses setDoc with stored _id for idempotent replay (prevents double-submit on network flap)
      const salesQueue = JSON.parse(localStorage.getItem('heritage_sales_queue') || '[]');
      if (salesQueue.length > 0) {
        const remaining = [];
        for (const sale of salesQueue) {
          try {
            const { _queued, _id, submittedAt: _ts, ...data } = sale;
            await setDoc(doc(db, 'sales', _id), { ...data, submittedAt: serverTimestamp() });
          } catch {
            remaining.push(sale);
          }
        }
        localStorage.setItem('heritage_sales_queue', JSON.stringify(remaining));
      }
    })();
  }, [isOnline]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setPhase('no-assets');
    }, 10000);

    async function loadRole() {
      try {
        const snap = await getDoc(doc(db, 'roles', user.uid));
        if (cancelled) return;
        clearTimeout(timer);
        if (snap.exists()) {
          const roleData = snap.data();
          const assets = roleData.assets || [];
          // Store ownerId from roles doc; fallback to invite doc if missing
          if (roleData.ownerId) {
            setOwnerId(roleData.ownerId);
          } else if (user.email) {
            try {
              const inviteSnap = await getDoc(doc(db, 'invites', user.email));
              if (inviteSnap.exists()) setOwnerId(inviteSnap.data().ownerId || null);
            } catch { /* best effort */ }
          }
          setRoleAssets(assets);
          if (assets.length === 1) {
            setSelectedAsset(assets[0]);
            setPhase('entry');
          } else if (assets.length > 1) {
            setPhase('pick-asset');
          } else {
            setPhase('no-assets');
          }
        } else {
          setPhase('no-assets');
        }
      } catch {
        if (!cancelled) { clearTimeout(timer); setPhase('no-assets'); }
      }
    }
    loadRole();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [user.uid]);

  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset);
    setPhase('entry');
  };

  const handleSubmit = async ({ revenue, expenses, date, currency, notes }) => {
    setPhase('submitting');
    const report = {
      assetId: selectedAsset.id,
      assetName: selectedAsset.name,
      managerId: user.uid,
      managerEmail: user.email,
      revenue: parseFloat(revenue) || 0,
      expenses: parseFloat(expenses) || 0,
      net: (parseFloat(revenue) || 0) - (parseFloat(expenses) || 0),
      currency,
      date,
      notes: notes.trim(),
      status: 'pending',
    };
    try {
      await addDoc(collection(db, 'reports'), { ...report, submittedAt: serverTimestamp() });
      setLastReport(report);
      setPhase('success');
    } catch {
      const queue = JSON.parse(localStorage.getItem('heritage_report_queue') || '[]');
      if (queue.length < 50) {
        queue.push({ ...report, submittedAt: new Date().toISOString(), _queued: true });
        localStorage.setItem('heritage_report_queue', JSON.stringify(queue));
      }
      setLastReport({ ...report, _queued: true });
      setPhase('success');
    }
  };

  const handleNewEntry = () => {
    setPhase('entry');
    setLastReport(null);
  };

  const isRetail = selectedAsset?.sector === 'retail';

  if (phase === 'loading') return <Loading />;
  if (phase === 'no-assets') return <NoAssets onLogout={onLogout} />;
  if (phase === 'pick-asset') return <AssetPicker assets={roleAssets} onSelect={handleSelectAsset} onLogout={onLogout} />;
  if (phase === 'submitting') return <Submitting />;
  if (phase === 'success') return <SuccessScreen report={lastReport} asset={selectedAsset} onNewEntry={handleNewEntry} />;

  if (isRetail) {
    return (
      <div style={S.root}>
        <div style={S.header}>
          <div style={S.headerLabel}>{selectedAsset.name}</div>
          <div style={S.headerName}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        {!isOnline && (
          <div style={S.offlineBanner}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.amber, flexShrink: 0 }} />
            Hors ligne
          </div>
        )}
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, background: '#fff' }}>
          {[{ id: 'rapport', label: 'Rapport' }, { id: 'ventes', label: 'Ventes' }].map(t => (
            <button
              key={t.id}
              onClick={() => setManagerTab(t.id)}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Instrument Sans', sans-serif",
                color: managerTab === t.id ? T.green : T.muted,
                borderBottom: managerTab === t.id ? `2px solid ${T.green}` : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {managerTab === 'ventes' ? (
          <SalesScreen asset={selectedAsset} ownerId={ownerId} user={user} onLogout={onLogout} />
        ) : (
          <EntryScreen
            asset={selectedAsset}
            isOnline={isOnline}
            onSubmit={handleSubmit}
            onLogout={onLogout}
          />
        )}
      </div>
    );
  }

  return (
    <EntryScreen
      asset={selectedAsset}
      isOnline={isOnline}
      onSubmit={handleSubmit}
      onLogout={onLogout}
    />
  );
}
