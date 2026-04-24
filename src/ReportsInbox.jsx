import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { CheckCircle, Clock, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const CURRENCY_SYMBOLS = { USD: '$', CDF: 'FC', EUR: '€' };

function fmt(n, cur) {
  const sym = CURRENCY_SYMBOLS[cur] || '$';
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat('fr-FR').format(abs);
  const sign = n >= 0 ? '+' : '−';
  return cur === 'CDF' ? `${sign} ${formatted} ${sym}` : `${sign} ${sym}${formatted}`;
}

function fmtDate(val) {
  if (!val) return '—';
  // Firestore Timestamp or ISO string
  const d = val?.toDate ? val.toDate() : new Date(val);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function StatusBadge({ status }) {
  const pending = status !== 'reviewed';
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 20,
      background: pending ? '#FEF3C7' : '#D1FAE5',
      color: pending ? '#B8720A' : '#2A7A50',
    }}>
      {pending ? 'En attente' : 'Examiné'}
    </span>
  );
}

function ReportCard({ report, onMarkReviewed, expanded, onToggle }) {
  const net = report.net ?? ((report.revenue ?? 0) - (report.expenses ?? 0));
  const netColor = net >= 0 ? '#2A7A50' : '#C4702E';
  const isPending = report.status !== 'reviewed';

  return (
    <div
      style={{
        borderBottom: '1px solid var(--line-2)',
        padding: '14px 0',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', cursor: 'pointer', gap: 12 }}
        onClick={onToggle}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{report.managerEmail || '—'}</span>
            <StatusBadge status={report.status} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {fmtDate(report.submittedAt)} · Période : {report.date || '—'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600, color: netColor }}>
            {fmt(net, report.currency || 'USD')}
          </span>
          {expanded ? <ChevronUp size={15} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={15} style={{ color: 'var(--muted)' }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Recettes', value: fmt(report.revenue ?? 0, report.currency || 'USD'), color: '#2A7A50' },
              { label: 'Dépenses', value: fmt(-(report.expenses ?? 0), report.currency || 'USD'), color: '#C4702E' },
              { label: 'Net', value: fmt(net, report.currency || 'USD'), color: netColor, bold: true },
            ].map(({ label, value, color, bold }) => (
              <div key={label} style={{ background: 'var(--surface-2, #F9F5EE)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: bold ? 14 : 13, fontWeight: 600, color }}>{value}</div>
              </div>
            ))}
          </div>

          {report.notes && (
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 12, padding: '8px 10px', background: 'var(--surface-2, #F9F5EE)', borderRadius: 8 }}>
              {report.notes}
            </div>
          )}

          {isPending && (
            <button
              className="btn btn-primary"
              style={{ fontSize: 13, padding: '7px 14px' }}
              onClick={(e) => { e.stopPropagation(); onMarkReviewed(report.id); }}
            >
              <CheckCircle size={14} />
              Marquer comme examiné
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AssetGroup({ assetName, reports, onMarkReviewed, expandedIds, onToggle }) {
  const pendingCount = reports.filter(r => r.status !== 'reviewed').length;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>{assetName}</div>
          {pendingCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#FEF3C7', color: '#B8720A', borderRadius: 20, padding: '2px 8px' }}>
              {pendingCount} en attente
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>
          {reports.length} rapport{reports.length > 1 ? 's' : ''}
        </div>
      </div>
      <div style={{ padding: '0 16px 8px' }}>
        {reports.map(r => (
          <ReportCard
            key={r.id}
            report={r}
            onMarkReviewed={onMarkReviewed}
            expanded={expandedIds.has(r.id)}
            onToggle={() => onToggle(r.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function ReportsInbox({ onUnreadCount }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [marking, setMarking] = useState(new Set());

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = query(collection(db, 'reports'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(data);
      onUnreadCount?.(data.filter(r => r.status !== 'reviewed').length);
    } catch (e) {
      setError('Impossible de charger les rapports. Vérifiez votre connexion.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [onUnreadCount]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleMarkReviewed = async (reportId) => {
    setMarking(prev => new Set(prev).add(reportId));
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'reviewed', reviewedAt: serverTimestamp() });
      setReports(prev => {
        const next = prev.map(r => r.id === reportId ? { ...r, status: 'reviewed' } : r);
        onUnreadCount?.(next.filter(r => r.status !== 'reviewed').length);
        return next;
      });
    } catch (e) {
      console.error('Mark reviewed failed:', e);
    } finally {
      setMarking(prev => { const s = new Set(prev); s.delete(reportId); return s; });
    }
  };

  const toggleExpanded = (id) => {
    setExpandedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const filtered = reports.filter(r => {
    if (filter === 'pending') return r.status !== 'reviewed';
    if (filter === 'reviewed') return r.status === 'reviewed';
    return true;
  });

  // Group by asset name
  const groups = filtered.reduce((acc, r) => {
    const key = r.assetName || 'Actif inconnu';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const pendingTotal = reports.filter(r => r.status !== 'reviewed').length;
  const tabs = [
    { id: 'pending', label: 'En attente', count: pendingTotal },
    { id: 'all', label: 'Tous', count: reports.length },
    { id: 'reviewed', label: 'Examinés', count: reports.filter(r => r.status === 'reviewed').length },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapports des gestionnaires</h1>
          <p className="page-subtitle">
            {pendingTotal > 0 ? `${pendingTotal} rapport${pendingTotal > 1 ? 's' : ''} en attente d'examen` : 'Tous les rapports ont été examinés'}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={loadReports} disabled={loading} title="Actualiser">
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: '8px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: filter === tab.id ? 'var(--forest)' : 'var(--muted)',
              borderBottom: filter === tab.id ? '2px solid var(--forest)' : '2px solid transparent',
              marginBottom: -1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 10,
                background: filter === tab.id ? 'var(--forest)' : 'var(--line-2)',
                color: filter === tab.id ? '#fff' : 'var(--muted)',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
          <div className="pulse-dot" style={{ margin: '0 auto 12px' }} />
          Chargement des rapports...
        </div>
      )}

      {error && !loading && (
        <div className="card" style={{ padding: '20px 24px', color: 'var(--negative)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          {error}
          <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={loadReports}>Réessayer</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>{filter === 'pending' ? '✓' : '📋'}</div>
          <div className="empty-state-title">
            {filter === 'pending' ? 'Aucun rapport en attente' : 'Aucun rapport'}
          </div>
          <div className="empty-state-desc">
            {filter === 'pending'
              ? 'Tous les rapports ont été examinés.'
              : 'Les gestionnaires n\'ont pas encore soumis de rapport.'}
          </div>
        </div>
      )}

      {!loading && !error && Object.entries(groups).map(([assetName, assetReports]) => (
        <AssetGroup
          key={assetName}
          assetName={assetName}
          reports={assetReports}
          onMarkReviewed={handleMarkReviewed}
          expandedIds={expandedIds}
          onToggle={toggleExpanded}
        />
      ))}
    </div>
  );
}
