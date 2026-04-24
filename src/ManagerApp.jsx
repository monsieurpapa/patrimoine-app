import { useState, useEffect } from 'react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, authService } from './firebase';

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

// ---- Root ManagerApp ----
export default function ManagerApp({ user, onLogout }) {
  const [phase, setPhase] = useState('loading');
  const [roleAssets, setRoleAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastReport, setLastReport] = useState(null);

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

  // Replay queue when coming back online
  useEffect(() => {
    if (!isOnline) return;
    const queue = JSON.parse(localStorage.getItem('heritage_report_queue') || '[]');
    if (queue.length === 0) return;
    (async () => {
      const remaining = [];
      for (const report of queue) {
        try {
          const { _queued, submittedAt: _ts, ...data } = report;
          await addDoc(collection(db, 'reports'), { ...data, submittedAt: serverTimestamp() });
        } catch {
          remaining.push(report);
        }
      }
      localStorage.setItem('heritage_report_queue', JSON.stringify(remaining));
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
          const assets = snap.data().assets || [];
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

  if (phase === 'loading') return <Loading />;
  if (phase === 'no-assets') return <NoAssets onLogout={onLogout} />;
  if (phase === 'pick-asset') return <AssetPicker assets={roleAssets} onSelect={handleSelectAsset} onLogout={onLogout} />;
  if (phase === 'submitting') return <Submitting />;
  if (phase === 'success') return <SuccessScreen report={lastReport} asset={selectedAsset} onNewEntry={handleNewEntry} />;

  return (
    <EntryScreen
      asset={selectedAsset}
      isOnline={isOnline}
      onSubmit={handleSubmit}
      onLogout={onLogout}
    />
  );
}
