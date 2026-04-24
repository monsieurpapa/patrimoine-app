import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Users, Briefcase, LogOut, RefreshCw, Shield, Trash2, ChevronDown, ChevronUp, AlertTriangle, X } from 'lucide-react';

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ managerEmail, onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div className="card" style={{ maxWidth: 380, width: '100%', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <AlertTriangle size={18} style={{ color: 'var(--negative)', flexShrink: 0 }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>Révoquer l'accès gestionnaire</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
          Le rôle de gestionnaire de <strong style={{ color: 'var(--ink)' }}>{managerEmail || 'cet utilisateur'}</strong> sera supprimé.
          Ils perdront l'accès à toutes les données jusqu'à une nouvelle invitation.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading} style={{ fontSize: 13 }}>
            Annuler
          </button>
          <button
            className="btn"
            style={{ fontSize: 13, background: 'var(--negative)', color: '#fff', border: 'none' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Révocation...' : 'Révoquer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OwnerRow({ owner, expanded, onToggle }) {
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!expanded || details) return;
    setLoadingDetails(true);
    Promise.all([
      getDoc(doc(db, 'assets', owner.uid)),
      getDocs(query(collection(db, 'invites'), where('ownerId', '==', owner.uid))),
    ]).then(([assetsDoc, invitesSnap]) => {
      const assets = assetsDoc.exists() ? (assetsDoc.data()?.data || []) : [];
      setDetails({ assets: Array.isArray(assets) ? assets : [], managerCount: invitesSnap.size });
    }).catch(() => {
      setDetails({ assets: [], managerCount: 0 });
    }).finally(() => setLoadingDetails(false));
  }, [expanded, owner.uid, details]);

  return (
    <div style={{ borderBottom: '1px solid var(--line-2)' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', gap: 12 }}
        onClick={onToggle}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {owner.email}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Dernière connexion : {fmtDate(owner.lastLoginAt)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {expanded ? <ChevronUp size={15} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={15} style={{ color: 'var(--muted)' }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--line-2)' }}>
          {loadingDetails ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', padding: '12px 0' }}>Chargement...</div>
          ) : details ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12, marginBottom: details.assets.length > 0 ? 12 : 0 }}>
                <div style={{ background: 'var(--surface-2, #F9F5EE)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 4 }}>Actifs</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{details.assets.length}</div>
                </div>
                <div style={{ background: 'var(--surface-2, #F9F5EE)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 4 }}>Gestionnaires</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{details.managerCount}</div>
                </div>
              </div>
              {details.assets.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {details.assets.map(a => (
                    <span key={a.id} style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                      {a.name}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function SuperadminDashboard({ user, onLogout }) {
  const [owners, setOwners] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('owners');
  const [expandedOwner, setExpandedOwner] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null); // { uid, email }
  const [revoking, setRevoking] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ownersSnap, rolesSnap] = await Promise.all([
        getDocs(collection(db, 'owners')),
        getDocs(collection(db, 'roles')),
      ]);
      setOwners(ownersSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setManagers(
        rolesSnap.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(r => r.role === 'manager')
      );
    } catch (e) {
      console.error('SuperadminDashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRevokeRole = async () => {
    if (!confirmRevoke) return;
    setRevoking(true);
    try {
      await deleteDoc(doc(db, 'roles', confirmRevoke.uid));
      setManagers(prev => prev.filter(m => m.uid !== confirmRevoke.uid));
    } catch (e) {
      console.error('Revoke role error:', e);
    } finally {
      setRevoking(false);
      setConfirmRevoke(null);
    }
  };

  const tabs = [
    { id: 'owners', label: 'Propriétaires', count: owners.length },
    { id: 'managers', label: 'Gestionnaires', count: managers.length },
  ];

  return (
    <div className="heritage-root" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--card)', borderBottom: '1px solid var(--line)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>Superadmin</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={loadData} disabled={loading} style={{ fontSize: 13 }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualiser
          </button>
          <button className="btn btn-ghost" onClick={onLogout} style={{ fontSize: 13 }}>
            <LogOut size={14} />
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <StatCard label="Propriétaires" value={owners.length} icon={Briefcase} color="var(--primary)" />
          <StatCard label="Gestionnaires actifs" value={managers.length} icon={Users} color="var(--accent)" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                fontSize: 13, fontWeight: 500, padding: '8px 14px', border: 'none',
                background: 'none', cursor: 'pointer',
                color: tab === t.id ? 'var(--forest, var(--primary))' : 'var(--muted)',
                borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                  background: tab === t.id ? 'var(--primary)' : 'var(--line-2)',
                  color: tab === t.id ? '#fff' : 'var(--muted)',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
            Chargement...
          </div>
        ) : (
          <>
            {/* Owners tab */}
            {tab === 'owners' && (
              owners.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
                  <div className="empty-state-title">Aucun propriétaire</div>
                  <div className="empty-state-desc">Les propriétaires apparaissent ici après leur première connexion.</div>
                </div>
              ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                  {owners.map(owner => (
                    <OwnerRow
                      key={owner.uid}
                      owner={owner}
                      expanded={expandedOwner === owner.uid}
                      onToggle={() => setExpandedOwner(expandedOwner === owner.uid ? null : owner.uid)}
                    />
                  ))}
                </div>
              )
            )}

            {/* Managers tab */}
            {tab === 'managers' && (
              managers.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                  <div className="empty-state-title">Aucun gestionnaire actif</div>
                  <div className="empty-state-desc">Les rôles gestionnaire apparaissent ici.</div>
                </div>
              ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                  {managers.map(m => (
                    <div
                      key={m.uid}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', borderBottom: '1px solid var(--line-2)', gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.uid}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {(m.assets || []).length} actif{(m.assets || []).length !== 1 ? 's' : ''} assigné{(m.assets || []).length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 12, color: 'var(--negative)', flexShrink: 0 }}
                        onClick={() => setConfirmRevoke({ uid: m.uid, email: null })}
                      >
                        <Trash2 size={13} />
                        Révoquer
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      {confirmRevoke && (
        <ConfirmDialog
          managerEmail={confirmRevoke.email}
          onConfirm={handleRevokeRole}
          onCancel={() => setConfirmRevoke(null)}
          loading={revoking}
        />
      )}
    </div>
  );
}
