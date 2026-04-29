import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, BookOpen, Globe, LayoutDashboard, Target, Users, Package, Shield, WifiOff } from 'lucide-react';

const MANUAL_PAGES = [
  {
    id: 'intro',
    icon: BookOpen,
    fr: {
      title: '1. Introduction & Concepts',
      content: (
        <div className="space-y-4">
          <p>Bienvenue dans le gestionnaire de <strong>Patrimoine</strong>. Cette application est conçue pour consolider la gestion de tous vos actifs (entreprises, immobilier, boutiques) en un seul endroit sécurisé.</p>
          <div className="card bg-surface p-4 border border-line">
            <h4 className="font-semibold mb-2">Concepts Clés :</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted">
              <li><strong>Actif (Asset) :</strong> Une entité génératrice de revenus (ex: une ferme, une boutique, un immeuble).</li>
              <li><strong>Transaction :</strong> Un mouvement financier (entrée ou sortie) associé à un actif spécifique.</li>
              <li><strong>Personnel :</strong> Les employés liés à vos actifs.</li>
              <li><strong>Mode Hors-Ligne :</strong> L'application fonctionne sans connexion internet. Vos données sont synchronisées automatiquement lorsque la connexion est rétablie.</li>
            </ul>
          </div>
        </div>
      )
    },
    en: {
      title: '1. Introduction & Concepts',
      content: (
        <div className="space-y-4">
          <p>Welcome to the <strong>Heritage</strong> manager. This application is designed to consolidate the management of all your assets (businesses, real estate, retail) in one secure place.</p>
          <div className="card bg-surface p-4 border border-line">
            <h4 className="font-semibold mb-2">Key Concepts:</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted">
              <li><strong>Asset:</strong> An income-generating entity (e.g., a farm, a shop, a building).</li>
              <li><strong>Transaction:</strong> A financial movement (income or expense) associated with a specific asset.</li>
              <li><strong>Personnel:</strong> The employees linked to your assets.</li>
              <li><strong>Offline Mode:</strong> The app works without an internet connection. Your data syncs automatically when the connection is restored.</li>
            </ul>
          </div>
        </div>
      )
    }
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    fr: {
      title: '2. Tableau de Bord & Actifs',
      content: (
        <div className="space-y-4">
          <p>Le <strong>Tableau de Bord</strong> vous offre une vue globale de la santé financière de l'ensemble de votre portefeuille.</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Target className="text-primary mt-0.5 shrink-0" size={16} />
              <span><strong>Vue d'ensemble :</strong> Visualisez les revenus totaux, les dépenses et le solde net consolidé. Vous pouvez masquer les montants à tout moment via l'icône de l'œil en haut à droite.</span>
            </li>
            <li className="flex items-start gap-2">
              <Target className="text-primary mt-0.5 shrink-0" size={16} />
              <span><strong>Gestion des Actifs :</strong> Dans la section "Patrimoine", ajoutez vos actifs en spécifiant leur secteur (Immobilier, Agriculture, Retail, etc.). Chaque actif sert de pilier pour regrouper les transactions et le personnel.</span>
            </li>
          </ul>
        </div>
      )
    },
    en: {
      title: '2. Dashboard & Assets',
      content: (
        <div className="space-y-4">
          <p>The <strong>Dashboard</strong> provides a global view of the financial health of your entire portfolio.</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Target className="text-primary mt-0.5 shrink-0" size={16} />
              <span><strong>Overview:</strong> View total income, expenses, and consolidated net balance. You can hide amounts at any time using the eye icon in the top right.</span>
            </li>
            <li className="flex items-start gap-2">
              <Target className="text-primary mt-0.5 shrink-0" size={16} />
              <span><strong>Asset Management:</strong> In the "Portfolio" section, add your assets by specifying their sector (Real Estate, Agriculture, Retail, etc.). Each asset serves as a pillar for grouping transactions and personnel.</span>
            </li>
          </ul>
        </div>
      )
    }
  },
  {
    id: 'transactions',
    icon: Package,
    fr: {
      title: '3. Transactions & Multidevise',
      content: (
        <div className="space-y-4">
          <p>Toute activité financière doit être documentée sous la forme de <strong>Transactions</strong>.</p>
          <div className="card bg-surface p-4 border border-line">
            <h4 className="font-semibold mb-2">Fonctionnalités avancées :</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted">
              <li><strong>Multidevise :</strong> Enregistrez des transactions en CDF, USD ou EUR. Le système utilise des taux de conversion internes (configurables dans les paramètres) pour calculer le solde global dans votre devise de préférence.</li>
              <li><strong>Raccourci :</strong> Appuyez sur la touche <kbd className="bg-gray-200 px-1 rounded text-xs" style={{fontFamily: 'inherit'}}>N</kbd> sur votre clavier pour ouvrir rapidement la fenêtre d'ajout de transaction.</li>
              <li><strong>Catégories :</strong> Catégorisez vos mouvements (loyer, salaire, vente, maintenance) pour une analyse détaillée dans la section "Analyses".</li>
            </ul>
          </div>
        </div>
      )
    },
    en: {
      title: '3. Transactions & Multi-currency',
      content: (
        <div className="space-y-4">
          <p>Any financial activity must be documented in the form of <strong>Transactions</strong>.</p>
          <div className="card bg-surface p-4 border border-line">
            <h4 className="font-semibold mb-2">Advanced Features:</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted">
              <li><strong>Multi-currency:</strong> Record transactions in CDF, USD, or EUR. The system uses internal conversion rates (configurable in settings) to calculate the global balance in your preferred currency.</li>
              <li><strong>Shortcut:</strong> Press the <kbd className="bg-gray-200 px-1 rounded text-xs" style={{fontFamily: 'inherit'}}>N</kbd> key on your keyboard to quickly open the add transaction window.</li>
              <li><strong>Categories:</strong> Categorize your movements (rent, salary, sale, maintenance) for detailed analysis in the "Analytics" section.</li>
            </ul>
          </div>
        </div>
      )
    }
  },
  {
    id: 'security',
    icon: Shield,
    fr: {
      title: '4. Sécurité & Rôles',
      content: (
        <div className="space-y-4">
          <p>La plateforme utilise des règles de sécurité robustes basées sur le cloud pour protéger vos données.</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Users className="text-primary mt-0.5 shrink-0" size={16} />
              <div>
                <strong>Propriétaire (Vous) :</strong> Accès total et exclusif à vos propres données. Personne d'autre ne peut les lire.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Users className="text-primary mt-0.5 shrink-0" size={16} />
              <div>
                <strong>Gestionnaire :</strong> Vous pouvez générer un "Lien d'invitation" dans les paramètres. Un gestionnaire accède à une version restreinte de l'application (l'application "Manager") uniquement pour les actifs que vous lui assignez.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="text-primary mt-0.5 shrink-0" size={16} />
              <div>
                <strong>Isolation :</strong> Les données de chaque propriétaire sont cryptographiquement isolées sur le serveur.
              </div>
            </li>
          </ul>
        </div>
      )
    },
    en: {
      title: '4. Security & Roles',
      content: (
        <div className="space-y-4">
          <p>The platform uses robust cloud-based security rules to protect your data.</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Users className="text-primary mt-0.5 shrink-0" size={16} />
              <div>
                <strong>Owner (You):</strong> Full and exclusive access to your own data. No one else can read it.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Users className="text-primary mt-0.5 shrink-0" size={16} />
              <div>
                <strong>Manager:</strong> You can generate an "Invite link" in the settings. A manager accesses a restricted version of the app (the "Manager" app) only for the assets you assign to them.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="text-primary mt-0.5 shrink-0" size={16} />
              <div>
                <strong>Isolation:</strong> Each owner's data is cryptographically isolated on the server.
              </div>
            </li>
          </ul>
        </div>
      )
    }
  },
  {
    id: 'erp',
    icon: WifiOff,
    fr: {
      title: '5. Module Boutique & Rapports',
      content: (
        <div className="space-y-4">
          <p>Pour vos actifs de type "Boutique/Retail", un module ERP spécialisé est débloqué.</p>
          <div className="card bg-surface p-4 border border-line">
            <h4 className="font-semibold mb-2">Composants de l'ERP :</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted">
              <li><strong>Catalogue :</strong> Gérez vos articles de vente, définissez les prix de base et les seuils d'alerte pour réapprovisionnement.</li>
              <li><strong>Réapprovisionnement :</strong> Utilisez le bouton de réapprovisionnement sur chaque article pour ajouter du stock. L'historique garantit un audit parfait.</li>
              <li><strong>Application Gestionnaire :</strong> Vos gérants utilisent leur propre interface pour soumettre les ventes de la journée. S'ils perdent la connexion internet, l'application stocke les ventes localement (hors-ligne) et les transmet dès le retour du réseau.</li>
              <li><strong>Archivage (Snapshots) :</strong> L'application gère de gros volumes de données. Utilisez le bouton "Archiver les stocks" pour figer les calculs historiques et accélérer massivement le chargement.</li>
            </ul>
          </div>
        </div>
      )
    },
    en: {
      title: '5. Retail Module & Reports',
      content: (
        <div className="space-y-4">
          <p>For your "Retail/Shop" type assets, a specialized ERP module is unlocked.</p>
          <div className="card bg-surface p-4 border border-line">
            <h4 className="font-semibold mb-2">ERP Components:</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted">
              <li><strong>Catalog:</strong> Manage your sales items, set base prices and alert thresholds for restocking.</li>
              <li><strong>Restocking:</strong> Use the restock button on each item to add stock. The history guarantees a perfect audit trail.</li>
              <li><strong>Manager App:</strong> Your managers use their own interface to submit the day's sales. If they lose internet connection, the app stores the sales locally (offline) and transmits them as soon as the network returns.</li>
              <li><strong>Archiving (Snapshots):</strong> The app handles large volumes of data. Use the "Archive stocks" button to freeze historical calculations and massively speed up loading times.</li>
            </ul>
          </div>
        </div>
      )
    }
  }
];

export default function UserManualModal({ open, onClose }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [lang, setLang] = useState('fr');

  if (!open) return null;

  const page = MANUAL_PAGES[pageIndex];
  const Icon = page.icon;

  const next = () => setPageIndex(p => Math.min(p + 1, MANUAL_PAGES.length - 1));
  const prev = () => setPageIndex(p => Math.max(p - 1, 0));

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="bg-bg" style={{ width: '100%', maxWidth: '42rem', borderRadius: 12, display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid var(--line)', backgroundColor: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, backgroundColor: 'rgba(var(--primary-rgb), 0.1)', borderRadius: 8, color: 'var(--primary)' }}>
              <Icon size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 500, margin: 0 }}>
              {lang === 'fr' ? 'Manuel d\'Utilisation' : 'User Manual'}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Lang Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 4 }}>
              <button 
                onClick={() => setLang('fr')}
                style={{
                  padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer',
                  backgroundColor: lang === 'fr' ? '#fff' : 'transparent',
                  color: lang === 'fr' ? 'var(--ink)' : 'var(--muted)',
                  boxShadow: lang === 'fr' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                FR
              </button>
              <button 
                onClick={() => setLang('en')}
                style={{
                  padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer',
                  backgroundColor: lang === 'en' ? '#fff' : 'transparent',
                  color: lang === 'en' ? 'var(--ink)' : 'var(--muted)',
                  boxShadow: lang === 'en' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                EN
              </button>
            </div>
            <button onClick={onClose} style={{ padding: 8, color: 'var(--muted)', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '50%' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', fontSize: '15px', lineHeight: 1.6, color: 'var(--ink-2)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 24 }}>{page[lang].title}</h3>
          {page[lang].content}
        </div>

        {/* FOOTER */}
        <div style={{ borderTop: '1px solid var(--line)', padding: 20, backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button 
            onClick={prev}
            disabled={pageIndex === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, fontWeight: 500, border: 'none', cursor: pageIndex === 0 ? 'not-allowed' : 'pointer',
              backgroundColor: 'transparent',
              color: pageIndex === 0 ? 'var(--muted)' : 'var(--ink)',
              opacity: pageIndex === 0 ? 0.4 : 1
            }}
          >
            <ChevronLeft size={18} />
            {lang === 'fr' ? 'Précédent' : 'Previous'}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {MANUAL_PAGES.map((_, i) => (
              <div 
                key={i} 
                style={{
                  height: 8, borderRadius: 4, transition: 'all 0.2s',
                  width: i === pageIndex ? 24 : 8,
                  backgroundColor: i === pageIndex ? 'var(--primary)' : '#d1d5db'
                }}
              />
            ))}
          </div>

          <button 
            onClick={pageIndex === MANUAL_PAGES.length - 1 ? onClose : next}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, fontWeight: 500, border: 'none', cursor: 'pointer',
              backgroundColor: 'var(--primary)', color: '#fff'
            }}
          >
            {pageIndex === MANUAL_PAGES.length - 1 
              ? (lang === 'fr' ? 'Terminer' : 'Finish')
              : (lang === 'fr' ? 'Suivant' : 'Next')
            }
            {pageIndex !== MANUAL_PAGES.length - 1 && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
