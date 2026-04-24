import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const STATUS_LABELS = {
  pending: { label: 'En attente', color: '#B8720A', bg: '#FEF3C7' },
  accepted: { label: 'Acceptée', color: '#2A7A50', bg: '#D1FAE5' },
};

export default function InviteManager({ user, assets }) {
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [email, setEmail] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const loadInvites = async () => {
    try {
      const q = query(collection(db, 'invites'), where('ownerId', '==', user.uid));
      const snap = await getDocs(q);
      setInvites(snap.docs.map(d => ({ email: d.id, ...d.data() })));
    } catch {
      // Firebase not configured or no permission yet — show empty list
      setInvites([]);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => { loadInvites(); }, [user.uid]);

  const toggleAsset = (id) => {
    setSelectedAssetIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    setError('');
    setSuccess('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Adresse email invalide.');
      return;
    }
    if (selectedAssetIds.length === 0) {
      setError('Sélectionnez au moins un actif.');
      return;
    }
    setSending(true);
    try {
      const selectedAssets = assets
        .filter(a => selectedAssetIds.includes(a.id))
        .map(a => ({ id: a.id, name: a.name, sector: a.sector }));

      await setDoc(doc(db, 'invites', trimmed), {
        ownerId: user.uid,
        assets: selectedAssets,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setSuccess(`Invitation enregistrée pour ${trimmed}. Partagez ce lien avec le gestionnaire :`);
      setEmail('');
      setSelectedAssetIds([]);
      loadInvites();
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi.');
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (invite) => {
    if (!confirm(`Révoquer l'invitation de ${invite.email} ?`)) return;
    try {
      const ops = [deleteDoc(doc(db, 'invites', invite.email))];
      // If the manager already accepted, remove their role doc too (managerId stored at claim time)
      if (invite.managerId) {
        ops.push(deleteDoc(doc(db, 'roles', invite.managerId)));
      }
      await Promise.all(ops);
      setInvites(prev => prev.filter(i => i.email !== invite.email));
    } catch (err) {
      alert('Impossible de révoquer: ' + (err.message || err));
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      {/* Pending / accepted invites */}
      {loadingInvites ? (
        <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Chargement...</div>
      ) : invites.length > 0 ? (
        <div style={{ marginBottom: 20 }}>
          {invites.map(invite => {
            const st = STATUS_LABELS[invite.status] || STATUS_LABELS.pending;
            return (
              <div key={invite.email} style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--line-2)',
                gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {invite.email}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {(invite.assets || []).map(a => a.name).join(', ') || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: st.bg, color: st.color,
                  }}>
                    {st.label}
                  </span>
                  <button
                    onClick={() => handleRevoke(invite)}
                    style={{ fontSize: 11, color: 'var(--negative)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                  >
                    Révoquer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, fontStyle: 'italic' }}>
          Aucune invitation envoyée pour le moment.
        </div>
      )}

      {/* Send new invite form */}
      <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Nouvelle invitation
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="label-caps block" style={{ marginBottom: 6 }}>Email du gestionnaire</label>
          <input
            className="input"
            type="email"
            placeholder="gestionnaire@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
        </div>

        {assets.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label className="label-caps block" style={{ marginBottom: 8 }}>Actifs à partager</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {assets.map(asset => {
                const selected = selectedAssetIds.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    onClick={() => toggleAsset(asset.id)}
                    style={{
                      fontSize: 13,
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: `1.5px solid ${selected ? 'var(--forest)' : 'var(--line)'}`,
                      background: selected ? 'var(--forest)' : 'transparent',
                      color: selected ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: selected ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {asset.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <div style={{ fontSize: 13, color: 'var(--negative)', marginBottom: 10 }}>{error}</div>}
        {success && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--positive)', lineHeight: 1.5, marginBottom: 8 }}>{success}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                readOnly
                value={window.location.origin}
                style={{
                  flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 6,
                  border: '1px solid var(--line)', background: 'var(--surface-2)',
                  color: 'var(--text)', fontFamily: 'monospace', minWidth: 0,
                }}
                onFocus={e => e.target.select()}
              />
              <button
                onClick={handleCopyLink}
                style={{
                  fontSize: 12, padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                  background: copied ? 'var(--forest)' : 'var(--surface-2)',
                  color: copied ? '#fff' : 'var(--text)',
                  border: '1px solid var(--line)', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                {copied ? 'Copié ✓' : 'Copier'}
              </button>
            </div>
          </div>
        )}

        <button
          className="btn btn-primary py-2.5 px-5"
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? 'Envoi...' : 'Inviter ce gestionnaire'}
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14, lineHeight: 1.6 }}>
        Le gestionnaire ouvre le lien, crée un compte avec cette adresse email, et accède automatiquement à ses actifs — aucune configuration manuelle.
      </div>
    </div>
  );
}
