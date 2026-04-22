import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, Briefcase, ArrowLeftRight, Users, TrendingUp,
  Settings, Plus, Search, Store, Warehouse, Building2, Wrench, Sprout,
  MoreHorizontal, ArrowUpRight, ArrowDownRight, Calendar, Filter, X,
  Edit3, Trash2, MapPin, Check, Circle, AlertCircle, Eye, EyeOff,
  ChevronRight, Sparkles, ArrowRight, Coins, CircleDollarSign,
  FileText, TrendingDown, Activity, Package
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

// ==============================================================
// CONFIGURATION
// ==============================================================

const SECTORS = {
  retail: { label: 'Commerce de détail', labelEn: 'Retail', icon: Store, color: '#C4702E', tint: '#F5E6D3' },
  equipment: { label: "Fourniture d'équipement", labelEn: 'Equipment supply', icon: Wrench, color: '#5B7C99', tint: '#DDE7EF' },
  warehouse: { label: "Location d'entrepôts", labelEn: 'Warehouse rental', icon: Warehouse, color: '#7A6A8E', tint: '#E5DFEB' },
  apartment: { label: "Location d'appartements", labelEn: 'Apartment rental', icon: Building2, color: '#8E6A5A', tint: '#EADFD6' },
  agribusiness: { label: 'Agro-business', labelEn: 'Agribusiness', icon: Sprout, color: '#6B8E4E', tint: '#DCE8D0' },
  other: { label: 'Autres', labelEn: 'Other', icon: Package, color: '#6B6B6B', tint: '#DFDFDF' }
};

const INCOME_CATEGORIES = {
  retail: ['Ventes', 'Commissions', 'Autres revenus'],
  equipment: ['Ventes équipement', 'Maintenance', 'Location équipement'],
  warehouse: ['Loyers entrepôts', 'Services logistiques', 'Pénalités'],
  apartment: ['Loyers mensuels', 'Cautions', 'Charges récupérées'],
  agribusiness: ['Ventes récolte', 'Subventions', 'Export'],
  other: ['Revenus divers']
};

const EXPENSE_CATEGORIES = {
  retail: ['Achats marchandises', 'Loyer local', 'Électricité', 'Salaires', 'Transport', 'Taxes', 'Autres'],
  equipment: ['Achats stock', 'Transport', 'Maintenance', 'Salaires', 'Assurance', 'Autres'],
  warehouse: ['Entretien', 'Sécurité', 'Taxes foncières', 'Salaires', 'Assurance', 'Autres'],
  apartment: ['Entretien', 'Réparations', 'Taxes foncières', 'Gardiennage', 'Assurance', 'Autres'],
  agribusiness: ['Semences', 'Engrais', 'Main-d\'œuvre', 'Transport', 'Équipement', 'Autres'],
  other: ['Dépenses diverses']
};

const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  CDF: { symbol: 'FC', name: 'Franc congolais', locale: 'fr-CD' },
  EUR: { symbol: '€', name: 'Euro', locale: 'fr-FR' }
};

const STATUS_OPTIONS = {
  active: { label: 'Actif', color: '#4A7C59', bg: '#E5F0E8' },
  paused: { label: 'En pause', color: '#C89B3C', bg: '#F5EDD5' },
  divested: { label: 'Cédé', color: '#8B7E70', bg: '#EAE5DD' }
};

const DEFAULT_SETTINGS = {
  displayCurrency: 'USD',
  exchangeRates: { USD: 1, CDF: 2700, EUR: 0.92 },
  hideAmounts: false,
  ownerName: 'Investisseur',
  ownerLocation: 'Goma, RDC'
};

// ==============================================================
// HELPERS
// ==============================================================

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const convert = (amount, from, to, rates) => {
  if (from === to) return amount;
  const usd = amount / (rates[from] || 1);
  return usd * (rates[to] || 1);
};

const formatMoney = (amount, currency = 'USD', opts = {}) => {
  const { hide = false, compact = false, decimals = 0 } = opts;
  if (hide) return '•••••';
  const symbol = CURRENCIES[currency]?.symbol || '$';
  const abs = Math.abs(amount);
  let formatted;
  if (compact && abs >= 1000000) formatted = (amount / 1000000).toFixed(1) + 'M';
  else if (compact && abs >= 1000) formatted = (amount / 1000).toFixed(1) + 'k';
  else formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);
  return currency === 'CDF' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
};

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
};

const formatDateShort = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  } catch { return iso; }
};

const monthKey = (iso) => iso.slice(0, 7);

const monthLabel = (key) => {
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { month: 'short' });
};

import storage, { STORAGE_KEYS } from './storage';

// ==============================================================
// DEMO DATA (DRC / Kivu context)
// ==============================================================

function buildDemoData() {
  const today = new Date();
  const iso = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  const assets = [
    { id: 'a1', name: 'Boutique Kivu Central', sector: 'retail', location: 'Goma, Av. Kibali', status: 'active', acquisitionDate: '2021-03-15', acquisitionCost: 45000, currency: 'USD', notes: 'Commerce de produits alimentaires et ménagers' },
    { id: 'a2', name: 'Entrepôt Birere', sector: 'warehouse', location: 'Goma, Quartier Birere', status: 'active', acquisitionDate: '2020-08-01', acquisitionCost: 120000, currency: 'USD', notes: '600 m² loués à 2 entreprises logistiques' },
    { id: 'a3', name: 'Résidence Himbi', sector: 'apartment', location: 'Goma, Himbi', status: 'active', acquisitionDate: '2019-11-20', acquisitionCost: 180000, currency: 'USD', notes: '6 appartements, taux d\'occupation 92%' },
    { id: 'a4', name: 'Plantation de café Masisi', sector: 'agribusiness', location: 'Territoire de Masisi', status: 'active', acquisitionDate: '2022-01-10', acquisitionCost: 85000, currency: 'USD', notes: '12 hectares, arabica spécialité, certifié' },
    { id: 'a5', name: 'Kivu Equip Services', sector: 'equipment', location: 'Goma, Zone industrielle', status: 'active', acquisitionDate: '2023-05-01', acquisitionCost: 65000, currency: 'USD', notes: 'Fourniture et location d\'équipement de construction' },
  ];

  const personnel = [
    { id: 'p1', assetId: 'a1', name: 'Esperance M.', role: 'Gérante', salary: 450, currency: 'USD', contact: '+243 XXX XXX 101', startDate: '2021-04-01', status: 'active' },
    { id: 'p2', assetId: 'a1', name: 'Jean-Claude B.', role: 'Vendeur', salary: 280, currency: 'USD', contact: '+243 XXX XXX 102', startDate: '2022-06-15', status: 'active' },
    { id: 'p3', assetId: 'a1', name: 'Aline K.', role: 'Caissière', salary: 250, currency: 'USD', contact: '+243 XXX XXX 103', startDate: '2023-02-01', status: 'active' },
    { id: 'p4', assetId: 'a2', name: 'Patrick N.', role: 'Gardien-chef', salary: 320, currency: 'USD', contact: '+243 XXX XXX 201', startDate: '2020-09-01', status: 'active' },
    { id: 'p5', assetId: 'a2', name: 'Moïse T.', role: 'Gardien', salary: 220, currency: 'USD', contact: '+243 XXX XXX 202', startDate: '2021-01-15', status: 'active' },
    { id: 'p6', assetId: 'a3', name: 'Bernadette L.', role: 'Intendante', salary: 300, currency: 'USD', contact: '+243 XXX XXX 301', startDate: '2019-12-01', status: 'active' },
    { id: 'p7', assetId: 'a4', name: 'Mukamba P.', role: 'Chef de plantation', salary: 550, currency: 'USD', contact: '+243 XXX XXX 401', startDate: '2022-02-01', status: 'active' },
    { id: 'p8', assetId: 'a4', name: 'Équipe récolte', role: '12 ouvriers saisonniers', salary: 1800, currency: 'USD', contact: 'Via chef de plantation', startDate: '2022-03-01', status: 'active' },
    { id: 'p9', assetId: 'a5', name: 'Ir. Michel K.', role: 'Directeur technique', salary: 800, currency: 'USD', contact: '+243 XXX XXX 501', startDate: '2023-05-15', status: 'active' },
  ];

  const transactions = [];
  // Seed 6 months of realistic transactions
  for (let m = 5; m >= 0; m--) {
    const dayOffset = m * 30;
    // Retail
    transactions.push({ id: uid(), assetId: 'a1', type: 'income', category: 'Ventes', amount: 8500 + Math.random() * 2500, currency: 'USD', date: iso(dayOffset + 2), description: 'Chiffre d\'affaires mensuel', counterparty: '' });
    transactions.push({ id: uid(), assetId: 'a1', type: 'expense', category: 'Achats marchandises', amount: 4200 + Math.random() * 800, currency: 'USD', date: iso(dayOffset + 5), description: 'Réapprovisionnement stock', counterparty: 'Grossistes Kinshasa' });
    transactions.push({ id: uid(), assetId: 'a1', type: 'expense', category: 'Salaires', amount: 980, currency: 'USD', date: iso(dayOffset + 1), description: 'Paie mensuelle', counterparty: '' });
    transactions.push({ id: uid(), assetId: 'a1', type: 'expense', category: 'Loyer local', amount: 400, currency: 'USD', date: iso(dayOffset + 1), description: 'Loyer boutique', counterparty: 'Propriétaire' });
    // Warehouse
    transactions.push({ id: uid(), assetId: 'a2', type: 'income', category: 'Loyers entrepôts', amount: 2800, currency: 'USD', date: iso(dayOffset + 3), description: 'Loyer Société Trans-Kivu', counterparty: 'Trans-Kivu SARL' });
    transactions.push({ id: uid(), assetId: 'a2', type: 'income', category: 'Loyers entrepôts', amount: 1900, currency: 'USD', date: iso(dayOffset + 3), description: 'Loyer Import Plus', counterparty: 'Import Plus' });
    transactions.push({ id: uid(), assetId: 'a2', type: 'expense', category: 'Salaires', amount: 540, currency: 'USD', date: iso(dayOffset + 1), description: 'Gardiennage', counterparty: '' });
    // Apartment
    transactions.push({ id: uid(), assetId: 'a3', type: 'income', category: 'Loyers mensuels', amount: 3200, currency: 'USD', date: iso(dayOffset + 4), description: '5 appartements occupés', counterparty: 'Divers locataires' });
    transactions.push({ id: uid(), assetId: 'a3', type: 'expense', category: 'Entretien', amount: 180 + Math.random() * 120, currency: 'USD', date: iso(dayOffset + 8), description: 'Entretien général', counterparty: '' });
    transactions.push({ id: uid(), assetId: 'a3', type: 'expense', category: 'Salaires', amount: 300, currency: 'USD', date: iso(dayOffset + 1), description: 'Salaire intendante', counterparty: '' });
    // Agribusiness (seasonal)
    if (m <= 2) transactions.push({ id: uid(), assetId: 'a4', type: 'income', category: 'Ventes récolte', amount: 4500 + Math.random() * 2000, currency: 'USD', date: iso(dayOffset + 10), description: 'Livraison café vert', counterparty: 'Café Kivu Congo' });
    transactions.push({ id: uid(), assetId: 'a4', type: 'expense', category: 'Main-d\'œuvre', amount: 2350, currency: 'USD', date: iso(dayOffset + 1), description: 'Équipe plantation', counterparty: '' });
    // Equipment
    transactions.push({ id: uid(), assetId: 'a5', type: 'income', category: 'Location équipement', amount: 3400 + Math.random() * 1200, currency: 'USD', date: iso(dayOffset + 6), description: 'Location bétonnières et compresseurs', counterparty: 'Chantiers divers' });
    transactions.push({ id: uid(), assetId: 'a5', type: 'expense', category: 'Salaires', amount: 800, currency: 'USD', date: iso(dayOffset + 1), description: 'Salaire directeur', counterparty: '' });
    transactions.push({ id: uid(), assetId: 'a5', type: 'expense', category: 'Maintenance', amount: 420 + Math.random() * 200, currency: 'USD', date: iso(dayOffset + 12), description: 'Maintenance équipement', counterparty: '' });
  }

  return { assets, transactions, personnel };
}

// ==============================================================
// STYLES (global CSS)
// ==============================================================

const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg: #F5EFE4;
  --surface: #FBF7EF;
  --card: #FFFFFF;
  --ink: #1A1410;
  --ink-2: #3E342C;
  --muted: #8B7E70;
  --muted-2: #B5AB9E;
  --line: #E5DDD0;
  --line-2: #EFE8DB;
  --primary: #2D5043;
  --primary-soft: #E0EAE2;
  --accent: #C4702E;
  --positive: #4A7C59;
  --positive-bg: #E5F0E8;
  --negative: #A94A3B;
  --negative-bg: #F5E3DF;
  --warn: #C89B3C;
}

* { box-sizing: border-box; }

.heritage-root {
  font-family: 'Instrument Sans', system-ui, sans-serif;
  background: var(--bg);
  color: var(--ink);
  min-height: 100vh;
  font-feature-settings: "ss01", "cv11";
  -webkit-font-smoothing: antialiased;
}

.font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; letter-spacing: -0.01em; }
.font-mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
.tnum { font-variant-numeric: tabular-nums; }

.label-caps {
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--muted);
}

.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 4px;
}

.card-soft {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 3px;
  font-weight: 500;
  font-size: 13.5px;
  transition: all 0.15s ease;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;
}

.btn-primary {
  background: var(--ink);
  color: var(--surface);
}
.btn-primary:hover { background: #2a231d; }

.btn-secondary {
  background: transparent;
  border-color: var(--line);
  color: var(--ink);
}
.btn-secondary:hover { background: var(--surface); border-color: var(--muted-2); }

.btn-ghost {
  background: transparent;
  color: var(--ink-2);
  padding: 7px 12px;
}
.btn-ghost:hover { background: var(--line-2); }

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
  border-radius: 3px;
  color: var(--ink-2);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
  position: relative;
}
.nav-item:hover { background: var(--line-2); }
.nav-item.active {
  background: var(--ink);
  color: var(--surface);
}

.input, .select, .textarea {
  width: 100%;
  padding: 10px 13px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 3px;
  font-family: inherit;
  font-size: 14px;
  color: var(--ink);
  transition: border 0.15s;
}
.input:focus, .select:focus, .textarea:focus {
  outline: none;
  border-color: var(--ink);
}
.select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238B7E70' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }

.divider-rule {
  height: 1px;
  background: var(--line);
}

.sector-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: 100px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.stat-hero {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 500;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
}

.row-hover:hover { background: var(--surface); }

.scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: var(--muted-2); border-radius: 3px; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.fade-in { animation: fadeIn 0.3s ease both; }

@keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.slide-up { animation: slideUp 0.35s ease both; }

@keyframes modalIn { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
.modal-in { animation: modalIn 0.2s ease both; }

@keyframes bgFade { from { opacity: 0; } to { opacity: 1; } }
.bg-fade { animation: bgFade 0.15s ease both; }

.monogram {
  width: 32px;
  height: 32px;
  border-radius: 3px;
  background: var(--ink);
  color: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: -0.02em;
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--ink);
  color: var(--surface);
  padding: 11px 20px;
  border-radius: 4px;
  font-size: 13.5px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 32px rgba(26,20,16,0.15);
  animation: toastIn 0.3s ease;
}
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }

.pulse-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--positive);
  box-shadow: 0 0 0 0 rgba(74,124,89,0.5);
  animation: pulseDot 2s infinite;
}
@keyframes pulseDot { 0% { box-shadow: 0 0 0 0 rgba(74,124,89,0.5); } 70% { box-shadow: 0 0 0 6px rgba(74,124,89,0); } 100% { box-shadow: 0 0 0 0 rgba(74,124,89,0); } }
`;

// ==============================================================
// REUSABLE COMPONENTS
// ==============================================================

function SectorChip({ sector, size = 'sm' }) {
  const s = SECTORS[sector] || SECTORS.other;
  const Icon = s.icon;
  return (
    <span className="sector-chip" style={{ background: s.tint, color: s.color }}>
      <Icon size={size === 'sm' ? 11 : 13} strokeWidth={2.2} />
      {s.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_OPTIONS[status] || STATUS_OPTIONS.active;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide" style={{ color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }}></span>
      {s.label}
    </span>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2400);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className="toast"><Check size={15} />{message}</div>;
}

function Modal({ open, onClose, title, children, maxWidth = 520 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fade" style={{ background: 'rgba(26,20,16,0.4)' }} onClick={onClose}>
      <div className="card modal-in w-full" style={{ maxWidth, maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--line)' }}>
          <h2 className="font-display text-[19px] font-medium">{title}</h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 6 }}><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--line-2)' }}>
        <Icon size={22} style={{ color: 'var(--muted)' }} strokeWidth={1.8} />
      </div>
      <h3 className="font-display text-[17px] font-medium mb-1.5">{title}</h3>
      <p className="text-[13.5px] mb-5 max-w-sm" style={{ color: 'var(--muted)' }}>{description}</p>
      {action}
    </div>
  );
}

// ==============================================================
// WELCOME SCREEN
// ==============================================================

function WelcomeScreen({ onStart }) {
  return (
    <div className="heritage-root min-h-screen flex items-center justify-center p-6">
      <div className="max-w-[560px] w-full fade-in">
        <div className="flex items-center gap-3 mb-10">
          <div className="monogram">H</div>
          <div>
            <div className="font-display text-[20px] font-medium leading-none">Héritage</div>
            <div className="label-caps mt-1.5">Gestion patrimoniale</div>
          </div>
        </div>

        <h1 className="font-display text-[42px] leading-[1.05] font-medium mb-5" style={{ letterSpacing: '-0.03em' }}>
          Suivez votre patrimoine<br />
          <span style={{ color: 'var(--accent)' }}>secteur par secteur.</span>
        </h1>
        <p className="text-[15px] leading-relaxed mb-10" style={{ color: 'var(--ink-2)', maxWidth: 460 }}>
          Un tableau de bord unique pour vos commerces, entrepôts, locations d'appartements, plantations et équipes. Revenus, dépenses, et performance — au même endroit.
        </p>

        <div className="space-y-3">
          <button className="btn btn-primary w-full justify-between" onClick={() => onStart('demo')} style={{ padding: '14px 18px', fontSize: 14 }}>
            <span className="flex items-center gap-2.5">
              <Sparkles size={15} />
              Explorer avec des données de démonstration
            </span>
            <ArrowRight size={16} />
          </button>
          <button className="btn btn-secondary w-full justify-between" onClick={() => onStart('fresh')} style={{ padding: '14px 18px', fontSize: 14 }}>
            <span>Commencer avec un patrimoine vide</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="divider-rule mt-10 mb-5"></div>
        <div className="grid grid-cols-3 gap-6 text-[12px]" style={{ color: 'var(--muted)' }}>
          <div>
            <div className="label-caps mb-1.5">Multi-devises</div>
            <div style={{ color: 'var(--ink-2)' }}>USD · CDF · EUR</div>
          </div>
          <div>
            <div className="label-caps mb-1.5">Secteurs</div>
            <div style={{ color: 'var(--ink-2)' }}>Illimités</div>
          </div>
          <div>
            <div className="label-caps mb-1.5">Sauvegarde</div>
            <div style={{ color: 'var(--ink-2)' }}>Automatique</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==============================================================
// SIDEBAR
// ==============================================================

function Sidebar({ page, setPage, settings, assets }) {
  const items = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Patrimoine', icon: Briefcase, count: assets.length },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'personnel', label: 'Personnel', icon: Users },
    { id: 'analytics', label: 'Analyses', icon: TrendingUp },
  ];

  return (
    <aside className="w-[240px] shrink-0 flex flex-col h-screen sticky top-0 border-r" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="monogram">H</div>
          <div>
            <div className="font-display text-[15px] font-semibold leading-none">Héritage</div>
            <div className="text-[10.5px] tracking-wider uppercase mt-1" style={{ color: 'var(--muted)' }}>Patrimoine</div>
          </div>
        </div>
      </div>

      <div className="divider-rule mx-5"></div>

      <nav className="px-3 py-4 flex-1">
        {items.map(item => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`nav-item w-full mb-0.5 ${active ? 'active' : ''}`}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count !== undefined && (
                <span className="text-[11px] tnum" style={{ color: active ? 'rgba(251,247,239,0.6)' : 'var(--muted)' }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="divider-rule mx-5"></div>

      <button
        onClick={() => setPage('settings')}
        className={`nav-item m-3 ${page === 'settings' ? 'active' : ''}`}
      >
        <Settings size={16} strokeWidth={page === 'settings' ? 2.2 : 1.8} />
        <span>Paramètres</span>
      </button>

      <div className="p-5 pt-2">
        <div className="flex items-center gap-2.5 p-2.5 rounded" style={{ background: 'var(--line-2)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-display font-semibold text-[13px]" style={{ background: 'var(--primary)', color: 'var(--surface)' }}>
            {settings.ownerName?.[0] || 'I'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium truncate">{settings.ownerName}</div>
            <div className="text-[10.5px] truncate" style={{ color: 'var(--muted)' }}>
              <MapPin size={9} className="inline mr-0.5" />{settings.ownerLocation}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ==============================================================
// TOP BAR
// ==============================================================

function TopBar({ title, subtitle, settings, setSettings, onQuickAdd, actions }) {
  return (
    <div className="px-10 pt-8 pb-6 border-b" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="label-caps mb-2">{subtitle}</div>
          <h1 className="font-display text-[30px] font-medium leading-none" style={{ letterSpacing: '-0.025em' }}>{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            className="btn btn-ghost"
            onClick={() => setSettings({ ...settings, hideAmounts: !settings.hideAmounts })}
            title={settings.hideAmounts ? 'Afficher les montants' : 'Masquer les montants'}
          >
            {settings.hideAmounts ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <div className="card-soft flex items-center px-2 py-1">
            {Object.keys(CURRENCIES).map(c => (
              <button
                key={c}
                onClick={() => setSettings({ ...settings, displayCurrency: c })}
                className="px-2.5 py-1 text-[11.5px] font-medium rounded-sm tracking-wide transition-all"
                style={{
                  background: settings.displayCurrency === c ? 'var(--ink)' : 'transparent',
                  color: settings.displayCurrency === c ? 'var(--surface)' : 'var(--ink-2)'
                }}
              >{c}</button>
            ))}
          </div>
          {onQuickAdd && (
            <button className="btn btn-primary" onClick={onQuickAdd}>
              <Plus size={15} strokeWidth={2.4} />
              Nouvelle transaction
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==============================================================
// DASHBOARD
// ==============================================================

function Dashboard({ assets, transactions, personnel, settings, setPage, setSelectedAssetId, openAddTxn }) {
  const currency = settings.displayCurrency;
  const rates = settings.exchangeRates;

  // Aggregate
  const totals = useMemo(() => {
    const assetValue = assets.reduce((sum, a) => sum + convert(a.acquisitionCost, a.currency, currency, rates), 0);
    const allInc = transactions.filter(t => t.type === 'income').reduce((s, t) => s + convert(t.amount, t.currency, currency, rates), 0);
    const allExp = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + convert(t.amount, t.currency, currency, rates), 0);

    const now = new Date();
    const mKey = now.toISOString().slice(0, 7);
    const monthlyInc = transactions.filter(t => t.type === 'income' && monthKey(t.date) === mKey).reduce((s, t) => s + convert(t.amount, t.currency, currency, rates), 0);
    const monthlyExp = transactions.filter(t => t.type === 'expense' && monthKey(t.date) === mKey).reduce((s, t) => s + convert(t.amount, t.currency, currency, rates), 0);

    return { assetValue, allInc, allExp, netFlow: allInc - allExp, monthlyInc, monthlyExp, monthlyNet: monthlyInc - monthlyExp };
  }, [assets, transactions, currency, rates]);

  // Monthly cash flow data (last 6 months)
  const cashflowData = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const k = d.toISOString().slice(0, 7);
      months[k] = { month: monthLabel(k), income: 0, expense: 0, net: 0 };
    }
    transactions.forEach(t => {
      const k = monthKey(t.date);
      if (months[k]) {
        const amt = convert(t.amount, t.currency, currency, rates);
        if (t.type === 'income') months[k].income += amt;
        else months[k].expense += amt;
      }
    });
    Object.values(months).forEach(m => { m.net = m.income - m.expense; });
    return Object.values(months);
  }, [transactions, currency, rates]);

  // Sector breakdown
  const sectorData = useMemo(() => {
    const breakdown = {};
    assets.forEach(a => {
      if (!breakdown[a.sector]) breakdown[a.sector] = { sector: a.sector, value: 0, count: 0, income: 0, expense: 0 };
      breakdown[a.sector].value += convert(a.acquisitionCost, a.currency, currency, rates);
      breakdown[a.sector].count += 1;
    });
    transactions.forEach(t => {
      const asset = assets.find(a => a.id === t.assetId);
      if (!asset || !breakdown[asset.sector]) return;
      const amt = convert(t.amount, t.currency, currency, rates);
      if (t.type === 'income') breakdown[asset.sector].income += amt;
      else breakdown[asset.sector].expense += amt;
    });
    return Object.values(breakdown).map(s => ({ ...s, net: s.income - s.expense, name: SECTORS[s.sector]?.label, color: SECTORS[s.sector]?.color }));
  }, [assets, transactions, currency, rates]);

  // Recent transactions
  const recentTxns = useMemo(() => {
    return [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [transactions]);

  // Top performing assets (by net this period)
  const assetPerf = useMemo(() => {
    return assets.map(a => {
      const inc = transactions.filter(t => t.assetId === a.id && t.type === 'income').reduce((s, t) => s + convert(t.amount, t.currency, currency, rates), 0);
      const exp = transactions.filter(t => t.assetId === a.id && t.type === 'expense').reduce((s, t) => s + convert(t.amount, t.currency, currency, rates), 0);
      return { ...a, income: inc, expense: exp, net: inc - exp };
    }).sort((a, b) => b.net - a.net);
  }, [assets, transactions, currency, rates]);

  const hide = settings.hideAmounts;

  return (
    <div className="px-10 py-8 space-y-8 slide-up">
      {/* Hero KPIs */}
      <div className="grid grid-cols-4 gap-px rounded" style={{ background: 'var(--line)' }}>
        <KpiCell
          label="Valeur du patrimoine"
          value={formatMoney(totals.assetValue, currency, { hide, compact: true })}
          sub={`${assets.length} actifs`}
          tone="primary"
        />
        <KpiCell
          label="Revenus — mois en cours"
          value={formatMoney(totals.monthlyInc, currency, { hide, compact: true })}
          sub={<span style={{ color: 'var(--positive)' }}><ArrowUpRight size={11} className="inline" /> Encaissé</span>}
        />
        <KpiCell
          label="Dépenses — mois en cours"
          value={formatMoney(totals.monthlyExp, currency, { hide, compact: true })}
          sub={<span style={{ color: 'var(--negative)' }}><ArrowDownRight size={11} className="inline" /> Décaissé</span>}
        />
        <KpiCell
          label="Flux net — mois en cours"
          value={formatMoney(totals.monthlyNet, currency, { hide, compact: true })}
          sub={<span style={{ color: totals.monthlyNet >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            {totals.monthlyNet >= 0 ? 'Positif' : 'Négatif'}
          </span>}
          highlight
        />
      </div>

      {/* Cash flow chart + Sector breakdown */}
      <div className="grid grid-cols-3 gap-5">
        <div className="card col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="label-caps mb-1">Flux de trésorerie · 6 mois</div>
              <h3 className="font-display text-[18px] font-medium">Revenus vs dépenses</h3>
            </div>
            <div className="flex items-center gap-3 text-[11.5px]" style={{ color: 'var(--muted)' }}>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--positive)' }}></span>Revenus</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--negative)' }}></span>Dépenses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cashflowData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: 11, fill: 'var(--muted)' }} />
              <YAxis axisLine={false} tickLine={false} style={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip
                cursor={{ fill: 'var(--line-2)' }}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 3, fontSize: 12, fontFamily: 'Instrument Sans' }}
                formatter={(v) => formatMoney(v, currency, { decimals: 0 })}
              />
              <Bar dataKey="income" fill="var(--positive)" radius={[2, 2, 0, 0]} maxBarSize={32} />
              <Bar dataKey="expense" fill="var(--negative)" radius={[2, 2, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <div className="label-caps mb-1">Répartition</div>
          <h3 className="font-display text-[18px] font-medium mb-5">Par secteur</h3>
          {sectorData.length === 0 ? (
            <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Aucun actif enregistré.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sectorData} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2}>
                    {sectorData.map((s, i) => <Cell key={i} fill={s.color} stroke="none" />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 3, fontSize: 12 }}
                    formatter={(v) => formatMoney(v, currency, { decimals: 0 })}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {sectorData.map(s => (
                  <div key={s.sector} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }}></span>
                      <span className="truncate" style={{ color: 'var(--ink-2)' }}>{s.name}</span>
                    </div>
                    <span className="tnum font-medium shrink-0 ml-2">{formatMoney(s.value, currency, { hide, compact: true })}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Asset performance + Recent activity */}
      <div className="grid grid-cols-3 gap-5">
        <div className="card col-span-2">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <div className="label-caps mb-1">Performance</div>
              <h3 className="font-display text-[18px] font-medium">Actifs par rentabilité</h3>
            </div>
            <button className="btn btn-ghost text-[12.5px]" onClick={() => setPage('portfolio')}>
              Voir tout <ChevronRight size={14} />
            </button>
          </div>
          <div className="divider-rule"></div>
          {assetPerf.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="Aucun actif"
              description="Commencez par ajouter votre premier actif au patrimoine."
              action={<button className="btn btn-primary" onClick={() => setPage('portfolio')}><Plus size={14} />Ajouter un actif</button>}
            />
          ) : (
            <div>
              {assetPerf.slice(0, 5).map((a, i) => {
                const S = SECTORS[a.sector] || SECTORS.other;
                const Icon = S.icon;
                return (
                  <div
                    key={a.id}
                    className="row-hover px-6 py-4 flex items-center gap-4 cursor-pointer"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line-2)' }}
                    onClick={() => { setSelectedAssetId(a.id); setPage('portfolio'); }}
                  >
                    <div className="w-9 h-9 rounded shrink-0 flex items-center justify-center" style={{ background: S.tint }}>
                      <Icon size={15} style={{ color: S.color }} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[14px] truncate">{a.name}</div>
                      <div className="text-[11.5px]" style={{ color: 'var(--muted)' }}>{a.location} · {S.label}</div>
                    </div>
                    <div className="text-right">
                      <div className="tnum text-[14px] font-medium" style={{ color: a.net >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                        {a.net >= 0 ? '+' : ''}{formatMoney(a.net, currency, { hide, compact: true })}
                      </div>
                      <div className="text-[11px] tnum" style={{ color: 'var(--muted)' }}>
                        {formatMoney(a.income, currency, { hide, compact: true })} / {formatMoney(a.expense, currency, { hide, compact: true })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between px-5 py-5">
            <div>
              <div className="label-caps mb-1">Activité</div>
              <h3 className="font-display text-[18px] font-medium">Récente</h3>
            </div>
            <button className="btn btn-ghost text-[12.5px]" onClick={() => setPage('transactions')}>
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="divider-rule"></div>
          {recentTxns.length === 0 ? (
            <div className="p-6 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
              Aucune transaction.
            </div>
          ) : (
            <div className="py-1">
              {recentTxns.map(t => {
                const asset = assets.find(a => a.id === t.assetId);
                const isIncome = t.type === 'income';
                return (
                  <div key={t.id} className="row-hover px-5 py-3 flex items-start gap-3">
                    <div className="w-7 h-7 rounded shrink-0 flex items-center justify-center mt-0.5" style={{ background: isIncome ? 'var(--positive-bg)' : 'var(--negative-bg)' }}>
                      {isIncome
                        ? <ArrowDownRight size={13} style={{ color: 'var(--positive)', transform: 'rotate(180deg)' }} strokeWidth={2.2} />
                        : <ArrowUpRight size={13} style={{ color: 'var(--negative)', transform: 'rotate(180deg)' }} strokeWidth={2.2} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium truncate">{t.description || t.category}</div>
                      <div className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>
                        {asset?.name || '—'} · {formatDateShort(t.date)}
                      </div>
                    </div>
                    <div className="tnum text-[13px] font-medium" style={{ color: isIncome ? 'var(--positive)' : 'var(--ink)' }}>
                      {isIncome ? '+' : '−'}{formatMoney(t.amount, t.currency, { hide, compact: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-4 gap-5">
        <MiniStat label="Personnel" value={personnel.filter(p => p.status === 'active').length} sub="employés actifs" icon={Users} />
        <MiniStat label="Transactions" value={transactions.length} sub="enregistrées" icon={Activity} />
        <MiniStat label="Masse salariale" value={formatMoney(personnel.filter(p=>p.status==='active').reduce((s,p)=>s+convert(p.salary, p.currency, currency, rates), 0), currency, { hide, compact: true })} sub="mensuelle" icon={Coins} />
        <MiniStat label="Secteurs" value={new Set(assets.map(a => a.sector)).size} sub="activité" icon={Briefcase} />
      </div>
    </div>
  );
}

function KpiCell({ label, value, sub, highlight, tone }) {
  return (
    <div className="p-6" style={{ background: highlight ? 'var(--ink)' : 'var(--card)', color: highlight ? 'var(--surface)' : 'var(--ink)' }}>
      <div className="label-caps mb-3" style={{ color: highlight ? 'rgba(251,247,239,0.55)' : 'var(--muted)' }}>{label}</div>
      <div className="stat-hero text-[30px] leading-none mb-2" style={{ color: highlight ? 'var(--surface)' : tone === 'primary' ? 'var(--ink)' : 'var(--ink)' }}>
        {value}
      </div>
      <div className="text-[12px]" style={{ color: highlight ? 'rgba(251,247,239,0.7)' : 'var(--muted)' }}>{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, sub, icon: Icon }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="label-caps">{label}</div>
        <Icon size={14} style={{ color: 'var(--muted)' }} strokeWidth={1.8} />
      </div>
      <div className="font-display text-[22px] font-medium tnum mb-1">{value}</div>
      <div className="text-[11.5px]" style={{ color: 'var(--muted)' }}>{sub}</div>
    </div>
  );
}

// ==============================================================
// PORTFOLIO
// ==============================================================

function Portfolio({ assets, transactions, personnel, settings, selectedAssetId, setSelectedAssetId, onAddAsset, onEditAsset, onDeleteAsset }) {
  const currency = settings.displayCurrency;
  const rates = settings.exchangeRates;
  const hide = settings.hideAmounts;
  const [filter, setFilter] = useState('all');

  const assetStats = useMemo(() => {
    return assets.map(a => {
      const txns = transactions.filter(t => t.assetId === a.id);
      const inc = txns.filter(t => t.type === 'income').reduce((s, t) => s + convert(t.amount, t.currency, currency, rates), 0);
      const exp = txns.filter(t => t.type === 'expense').reduce((s, t) => s + convert(t.amount, t.currency, currency, rates), 0);
      const staff = personnel.filter(p => p.assetId === a.id && p.status === 'active').length;
      return { ...a, income: inc, expense: exp, net: inc - exp, staffCount: staff, txnCount: txns.length };
    });
  }, [assets, transactions, personnel, currency, rates]);

  const filtered = filter === 'all' ? assetStats : assetStats.filter(a => a.sector === filter);

  if (selectedAssetId) {
    const asset = assetStats.find(a => a.id === selectedAssetId);
    if (asset) {
      return <AssetDetail
        asset={asset}
        transactions={transactions.filter(t => t.assetId === selectedAssetId)}
        personnel={personnel.filter(p => p.assetId === selectedAssetId)}
        settings={settings}
        onBack={() => setSelectedAssetId(null)}
        onEdit={() => onEditAsset(asset)}
        onDelete={() => { onDeleteAsset(asset.id); setSelectedAssetId(null); }}
      />;
    }
  }

  return (
    <div className="px-10 py-8 slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>Tous les secteurs</FilterChip>
          {Object.entries(SECTORS).map(([key, s]) => {
            const count = assets.filter(a => a.sector === key).length;
            if (count === 0) return null;
            return <FilterChip key={key} active={filter === key} onClick={() => setFilter(key)}>{s.label} · {count}</FilterChip>;
          })}
        </div>
        <button className="btn btn-primary" onClick={onAddAsset}>
          <Plus size={15} strokeWidth={2.4} />
          Nouvel actif
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Briefcase}
            title="Aucun actif dans cette catégorie"
            description="Ajoutez un commerce, un entrepôt, un bâtiment locatif, une exploitation agricole ou toute autre activité."
            action={<button className="btn btn-primary" onClick={onAddAsset}><Plus size={14} />Ajouter un actif</button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {filtered.map(a => {
            const S = SECTORS[a.sector] || SECTORS.other;
            const Icon = S.icon;
            return (
              <div
                key={a.id}
                className="card cursor-pointer transition-all hover:-translate-y-0.5"
                style={{ transition: 'transform 0.18s, box-shadow 0.18s' }}
                onClick={() => setSelectedAssetId(a.id)}
              >
                <div className="p-6 pb-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded flex items-center justify-center" style={{ background: S.tint }}>
                        <Icon size={18} style={{ color: S.color }} strokeWidth={2} />
                      </div>
                      <div>
                        <div className="font-display text-[17px] font-medium leading-tight">{a.name}</div>
                        <div className="text-[11.5px] mt-1" style={{ color: 'var(--muted)' }}>
                          <MapPin size={10} className="inline mr-0.5" />{a.location}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mb-4">
                    <SectorChip sector={a.sector} />
                  </div>
                  <div className="grid grid-cols-3 gap-0 pt-4 border-t" style={{ borderColor: 'var(--line-2)' }}>
                    <StatMini label="Revenus" value={formatMoney(a.income, currency, { hide, compact: true })} tone="positive" />
                    <StatMini label="Dépenses" value={formatMoney(a.expense, currency, { hide, compact: true })} tone="negative" />
                    <StatMini label="Net" value={formatMoney(a.net, currency, { hide, compact: true })} tone={a.net >= 0 ? 'positive' : 'negative'} bold />
                  </div>
                </div>
                <div className="px-6 py-3 border-t flex items-center justify-between text-[11.5px]" style={{ borderColor: 'var(--line-2)', background: 'var(--surface)', color: 'var(--muted)' }}>
                  <span><Users size={11} className="inline mr-1" />{a.staffCount} employé{a.staffCount !== 1 ? 's' : ''}</span>
                  <span><Activity size={11} className="inline mr-1" />{a.txnCount} transaction{a.txnCount !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1" style={{ color: 'var(--ink-2)' }}>Voir détails <ChevronRight size={11} /></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-all"
      style={{
        background: active ? 'var(--ink)' : 'var(--card)',
        color: active ? 'var(--surface)' : 'var(--ink-2)',
        border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`
      }}
    >
      {children}
    </button>
  );
}

function StatMini({ label, value, tone, bold }) {
  const colors = { positive: 'var(--positive)', negative: 'var(--negative)', neutral: 'var(--ink)' };
  return (
    <div>
      <div className="label-caps text-[9.5px] mb-1">{label}</div>
      <div className={`tnum text-[14px] ${bold ? 'font-semibold' : 'font-medium'}`} style={{ color: colors[tone] || colors.neutral }}>
        {value}
      </div>
    </div>
  );
}

// ==============================================================
// ASSET DETAIL
// ==============================================================

function AssetDetail({ asset, transactions, personnel, settings, onBack, onEdit, onDelete }) {
  const S = SECTORS[asset.sector] || SECTORS.other;
  const Icon = S.icon;
  const currency = settings.displayCurrency;
  const rates = settings.exchangeRates;
  const hide = settings.hideAmounts;

  const monthly = useMemo(() => {
    const map = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i);
      const k = d.toISOString().slice(0, 7);
      map[k] = { month: monthLabel(k), income: 0, expense: 0 };
    }
    transactions.forEach(t => {
      const k = monthKey(t.date);
      if (map[k]) {
        const amt = convert(t.amount, t.currency, currency, rates);
        if (t.type === 'income') map[k].income += amt;
        else map[k].expense += amt;
      }
    });
    return Object.values(map);
  }, [transactions, currency, rates]);

  const totalStaffCost = personnel.filter(p => p.status === 'active').reduce((s, p) => s + convert(p.salary, p.currency, currency, rates), 0);

  return (
    <div className="px-10 py-8 slide-up">
      <button onClick={onBack} className="btn btn-ghost mb-6 -ml-3 text-[13px]">
        <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
        Retour au patrimoine
      </button>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded flex items-center justify-center shrink-0" style={{ background: S.tint }}>
            <Icon size={28} style={{ color: S.color }} strokeWidth={1.8} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <SectorChip sector={asset.sector} />
              <StatusBadge status={asset.status} />
            </div>
            <h1 className="font-display text-[32px] font-medium leading-none mb-2" style={{ letterSpacing: '-0.025em' }}>{asset.name}</h1>
            <div className="text-[13.5px]" style={{ color: 'var(--muted)' }}>
              <MapPin size={12} className="inline mr-1" />{asset.location} · Acquis le {formatDate(asset.acquisitionDate)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={onEdit}><Edit3 size={14} />Modifier</button>
          <button className="btn btn-secondary" onClick={() => { if (confirm(`Supprimer "${asset.name}" et toutes ses données associées ?`)) onDelete(); }} style={{ color: 'var(--negative)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px rounded mb-8" style={{ background: 'var(--line)' }}>
        <KpiCell label="Coût d'acquisition" value={formatMoney(asset.acquisitionCost, asset.currency, { hide, compact: true })} sub={`En ${asset.currency}`} />
        <KpiCell label="Revenus cumulés" value={formatMoney(asset.income, currency, { hide, compact: true })} sub={<span style={{ color: 'var(--positive)' }}>Tous exercices</span>} />
        <KpiCell label="Dépenses cumulées" value={formatMoney(asset.expense, currency, { hide, compact: true })} sub={<span style={{ color: 'var(--negative)' }}>Tous exercices</span>} />
        <KpiCell label="Résultat net" value={formatMoney(asset.net, currency, { hide, compact: true })} sub={asset.net >= 0 ? 'Excédent' : 'Déficit'} highlight />
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="card col-span-2 p-6">
          <div className="label-caps mb-1">Tendance</div>
          <h3 className="font-display text-[17px] font-medium mb-5">Cash flow · 6 derniers mois</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--positive)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--negative)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--negative)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: 11, fill: 'var(--muted)' }} />
              <YAxis axisLine={false} tickLine={false} style={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 3, fontSize: 12 }}
                formatter={(v) => formatMoney(v, currency, { decimals: 0 })}
              />
              <Area type="monotone" dataKey="income" stroke="var(--positive)" strokeWidth={2} fill="url(#incG)" />
              <Area type="monotone" dataKey="expense" stroke="var(--negative)" strokeWidth={2} fill="url(#expG)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="label-caps mb-2">Personnel</div>
            <div className="font-display text-[24px] font-medium leading-none mb-1">{personnel.filter(p => p.status === 'active').length}</div>
            <div className="text-[12px]" style={{ color: 'var(--muted)' }}>employés actifs</div>
            <div className="divider-rule my-4"></div>
            <div className="label-caps mb-2">Masse salariale mensuelle</div>
            <div className="font-display text-[18px] font-medium tnum">{formatMoney(totalStaffCost, currency, { hide, compact: true })}</div>
          </div>
          {asset.notes && (
            <div className="card p-5">
              <div className="label-caps mb-2">Notes</div>
              <div className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>{asset.notes}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="card">
          <div className="px-5 py-4 flex items-center justify-between">
            <h3 className="font-display text-[16px] font-medium">Transactions récentes</h3>
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{transactions.length} total</span>
          </div>
          <div className="divider-rule"></div>
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-[13px]" style={{ color: 'var(--muted)' }}>Aucune transaction.</div>
          ) : (
            <div>
              {[...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0, 6).map(t => (
                <div key={t.id} className="px-5 py-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--line-2)' }}>
                  <div className="w-7 h-7 rounded shrink-0 flex items-center justify-center" style={{ background: t.type === 'income' ? 'var(--positive-bg)' : 'var(--negative-bg)' }}>
                    <span style={{ color: t.type === 'income' ? 'var(--positive)' : 'var(--negative)', fontWeight: 600, fontSize: 12 }}>{t.type === 'income' ? '↓' : '↑'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium truncate">{t.description || t.category}</div>
                    <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{formatDate(t.date)} · {t.category}</div>
                  </div>
                  <div className="tnum text-[13px] font-medium" style={{ color: t.type === 'income' ? 'var(--positive)' : 'var(--ink)' }}>
                    {t.type === 'income' ? '+' : '−'}{formatMoney(t.amount, t.currency, { hide, compact: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="px-5 py-4 flex items-center justify-between">
            <h3 className="font-display text-[16px] font-medium">Équipe</h3>
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{personnel.length} personnes</span>
          </div>
          <div className="divider-rule"></div>
          {personnel.length === 0 ? (
            <div className="p-6 text-center text-[13px]" style={{ color: 'var(--muted)' }}>Aucun employé assigné.</div>
          ) : (
            <div>
              {personnel.map(p => (
                <div key={p.id} className="px-5 py-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--line-2)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-display font-semibold text-[12px]" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                    {p.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium truncate">{p.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{p.role}</div>
                  </div>
                  <div className="tnum text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
                    {formatMoney(p.salary, p.currency, { hide })} / mois
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==============================================================
// TRANSACTIONS PAGE
// ==============================================================

function Transactions({ transactions, assets, settings, onAddTxn, onEditTxn, onDeleteTxn }) {
  const [query, setQuery] = useState('');
  const [filterAsset, setFilterAsset] = useState('');
  const [filterType, setFilterType] = useState('');
  const hide = settings.hideAmounts;

  const filtered = useMemo(() => {
    return transactions
      .filter(t => !filterAsset || t.assetId === filterAsset)
      .filter(t => !filterType || t.type === filterType)
      .filter(t => {
        if (!query) return true;
        const q = query.toLowerCase();
        const asset = assets.find(a => a.id === t.assetId);
        return (t.description?.toLowerCase().includes(q) ||
                t.category?.toLowerCase().includes(q) ||
                t.counterparty?.toLowerCase().includes(q) ||
                asset?.name?.toLowerCase().includes(q));
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, query, filterAsset, filterType, assets]);

  // Group by date
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(t => {
      if (!g[t.date]) g[t.date] = [];
      g[t.date].push(t);
    });
    return g;
  }, [filtered]);

  return (
    <div className="px-10 py-8 slide-up">
      <div className="card mb-5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input
              className="input pl-10"
              placeholder="Rechercher par description, catégorie, contrepartie..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="select" style={{ width: 200 }} value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)}>
            <option value="">Tous les actifs</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="select" style={{ width: 150 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Tous types</option>
            <option value="income">Revenus</option>
            <option value="expense">Dépenses</option>
          </select>
          <button className="btn btn-primary" onClick={onAddTxn}>
            <Plus size={15} strokeWidth={2.4} />
            Ajouter
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ArrowLeftRight}
            title="Aucune transaction"
            description={query || filterAsset || filterType ? "Aucun résultat ne correspond aux filtres." : "Enregistrez vos premières entrées et sorties de fonds."}
            action={<button className="btn btn-primary" onClick={onAddTxn}><Plus size={14} />Nouvelle transaction</button>}
          />
        </div>
      ) : (
        <div className="card">
          {Object.entries(grouped).map(([date, items], gi) => {
            const dayTotal = items.reduce((s, t) => {
              const amt = convert(t.amount, t.currency, settings.displayCurrency, settings.exchangeRates);
              return s + (t.type === 'income' ? amt : -amt);
            }, 0);
            return (
              <div key={date}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'var(--surface)', borderTop: gi === 0 ? 'none' : '1px solid var(--line)', borderBottom: '1px solid var(--line-2)' }}>
                  <div className="label-caps">{formatDate(date)}</div>
                  <div className="tnum text-[12px]" style={{ color: dayTotal >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                    {dayTotal >= 0 ? '+' : '−'}{formatMoney(Math.abs(dayTotal), settings.displayCurrency, { hide, compact: true })}
                  </div>
                </div>
                {items.map((t, i) => {
                  const asset = assets.find(a => a.id === t.assetId);
                  const S = asset ? SECTORS[asset.sector] : SECTORS.other;
                  const Icon = S.icon;
                  return (
                    <div key={t.id} className="px-5 py-4 flex items-center gap-4 group row-hover" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line-2)' }}>
                      <div className="w-9 h-9 rounded shrink-0 flex items-center justify-center" style={{ background: S.tint }}>
                        <Icon size={15} style={{ color: S.color }} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-[14px] truncate">{t.description || t.category}</div>
                        </div>
                        <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
                          {asset?.name || '—'} · {t.category}{t.counterparty ? ` · ${t.counterparty}` : ''}
                        </div>
                      </div>
                      <div className="tnum text-[15px] font-medium text-right" style={{ color: t.type === 'income' ? 'var(--positive)' : 'var(--ink)', minWidth: 120 }}>
                        {t.type === 'income' ? '+' : '−'}{formatMoney(t.amount, t.currency, { hide })}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button className="btn-ghost" onClick={() => onEditTxn(t)} style={{ padding: 6 }}><Edit3 size={14} /></button>
                        <button className="btn-ghost" onClick={() => { if (confirm('Supprimer cette transaction ?')) onDeleteTxn(t.id); }} style={{ padding: 6, color: 'var(--negative)' }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==============================================================
// PERSONNEL
// ==============================================================

function Personnel({ personnel, assets, settings, onAdd, onEdit, onDelete }) {
  const [filterAsset, setFilterAsset] = useState('');
  const hide = settings.hideAmounts;

  const filtered = filterAsset ? personnel.filter(p => p.assetId === filterAsset) : personnel;

  const byAsset = useMemo(() => {
    const g = {};
    filtered.forEach(p => {
      if (!g[p.assetId]) g[p.assetId] = [];
      g[p.assetId].push(p);
    });
    return g;
  }, [filtered]);

  const totalSalary = personnel.filter(p => p.status === 'active').reduce((s, p) => s + convert(p.salary, p.currency, settings.displayCurrency, settings.exchangeRates), 0);

  return (
    <div className="px-10 py-8 slide-up">
      <div className="grid grid-cols-3 gap-px rounded mb-6" style={{ background: 'var(--line)' }}>
        <KpiCell label="Total employés" value={personnel.filter(p=>p.status==='active').length} sub="en activité" />
        <KpiCell label="Masse salariale" value={formatMoney(totalSalary, settings.displayCurrency, { hide, compact: true })} sub="par mois" />
        <KpiCell label="Facilités couvertes" value={new Set(personnel.map(p=>p.assetId)).size} sub="actifs avec personnel" />
      </div>

      <div className="flex items-center justify-between mb-5">
        <select className="select" style={{ width: 260 }} value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)}>
          <option value="">Tous les actifs</option>
          {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={onAdd}>
          <Plus size={15} strokeWidth={2.4} />
          Nouveau membre
        </button>
      </div>

      {Object.keys(byAsset).length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="Aucun employé enregistré"
            description="Gérez les équipes affectées à chacun de vos actifs (boutiques, entrepôts, plantations)."
            action={<button className="btn btn-primary" onClick={onAdd}><Plus size={14} />Ajouter un membre</button>}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(byAsset).map(([assetId, members]) => {
            const asset = assets.find(a => a.id === assetId);
            if (!asset) return null;
            const S = SECTORS[asset.sector] || SECTORS.other;
            const Icon = S.icon;
            const totalForAsset = members.filter(m=>m.status==='active').reduce((s,m)=>s+convert(m.salary, m.currency, settings.displayCurrency, settings.exchangeRates), 0);
            return (
              <div key={assetId} className="card">
                <div className="px-5 py-4 flex items-center gap-3 border-b" style={{ borderColor: 'var(--line-2)' }}>
                  <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: S.tint }}>
                    <Icon size={14} style={{ color: S.color }} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[14px]">{asset.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{members.length} membre{members.length>1?'s':''} · {formatMoney(totalForAsset, settings.displayCurrency, { hide })} / mois</div>
                  </div>
                </div>
                {members.map((p, i) => (
                  <div key={p.id} className="px-5 py-3.5 flex items-center gap-4 group row-hover" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line-2)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-display font-semibold text-[14px]" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                      {p.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[14px]">{p.name}</div>
                      <div className="text-[11.5px]" style={{ color: 'var(--muted)' }}>
                        {p.role} · Depuis {formatDate(p.startDate)}{p.contact ? ` · ${p.contact}` : ''}
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                    <div className="tnum text-[14px] font-medium" style={{ minWidth: 120, textAlign: 'right' }}>
                      {formatMoney(p.salary, p.currency, { hide })}
                      <div className="text-[10.5px] font-normal" style={{ color: 'var(--muted)' }}>/ mois</div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button className="btn-ghost" onClick={() => onEdit(p)} style={{ padding: 6 }}><Edit3 size={14} /></button>
                      <button className="btn-ghost" onClick={() => { if (confirm(`Retirer ${p.name} ?`)) onDelete(p.id); }} style={{ padding: 6, color: 'var(--negative)' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==============================================================
// ANALYTICS
// ==============================================================

function Analytics({ assets, transactions, personnel, settings }) {
  const currency = settings.displayCurrency;
  const rates = settings.exchangeRates;
  const hide = settings.hideAmounts;

  const sectorPerf = useMemo(() => {
    const data = {};
    Object.keys(SECTORS).forEach(key => {
      data[key] = { sector: key, name: SECTORS[key].label, income: 0, expense: 0, net: 0, count: 0, color: SECTORS[key].color };
    });
    assets.forEach(a => { if (data[a.sector]) data[a.sector].count += 1; });
    transactions.forEach(t => {
      const asset = assets.find(a => a.id === t.assetId);
      if (!asset || !data[asset.sector]) return;
      const amt = convert(t.amount, t.currency, currency, rates);
      if (t.type === 'income') data[asset.sector].income += amt;
      else data[asset.sector].expense += amt;
    });
    return Object.values(data).filter(d => d.count > 0).map(d => ({ ...d, net: d.income - d.expense }));
  }, [assets, transactions, currency, rates]);

  const monthly12 = useMemo(() => {
    const map = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i);
      const k = d.toISOString().slice(0, 7);
      map[k] = { month: monthLabel(k), income: 0, expense: 0, net: 0 };
    }
    transactions.forEach(t => {
      const k = monthKey(t.date);
      if (map[k]) {
        const amt = convert(t.amount, t.currency, currency, rates);
        if (t.type === 'income') map[k].income += amt;
        else map[k].expense += amt;
      }
    });
    Object.values(map).forEach(m => { m.net = m.income - m.expense; });
    return Object.values(map);
  }, [transactions, currency, rates]);

  const categoryBreakdown = useMemo(() => {
    const inc = {}, exp = {};
    transactions.forEach(t => {
      const amt = convert(t.amount, t.currency, currency, rates);
      const bucket = t.type === 'income' ? inc : exp;
      bucket[t.category] = (bucket[t.category] || 0) + amt;
    });
    const sortDesc = (o) => Object.entries(o).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value);
    return { income: sortDesc(inc).slice(0, 6), expense: sortDesc(exp).slice(0, 6) };
  }, [transactions, currency, rates]);

  const bestAsset = useMemo(() => {
    const perf = assets.map(a => {
      const inc = transactions.filter(t=>t.assetId===a.id && t.type==='income').reduce((s,t)=>s+convert(t.amount,t.currency,currency,rates),0);
      const exp = transactions.filter(t=>t.assetId===a.id && t.type==='expense').reduce((s,t)=>s+convert(t.amount,t.currency,currency,rates),0);
      return { ...a, net: inc - exp };
    });
    return perf.sort((a,b)=>b.net-a.net);
  }, [assets, transactions, currency, rates]);

  return (
    <div className="px-10 py-8 space-y-6 slide-up">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="label-caps mb-1">12 mois glissants</div>
            <h3 className="font-display text-[19px] font-medium">Flux de trésorerie consolidé</h3>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthly12}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: 11, fill: 'var(--muted)' }} />
            <YAxis axisLine={false} tickLine={false} style={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 3, fontSize: 12 }}
              formatter={(v) => formatMoney(v, currency, { decimals: 0 })}
            />
            <Line type="monotone" dataKey="income" stroke="var(--positive)" strokeWidth={2} dot={{ r: 3, fill: 'var(--positive)' }} />
            <Line type="monotone" dataKey="expense" stroke="var(--negative)" strokeWidth={2} dot={{ r: 3, fill: 'var(--negative)' }} />
            <Line type="monotone" dataKey="net" stroke="var(--ink)" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: 'var(--ink)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="label-caps mb-1">Performance sectorielle</div>
          <h3 className="font-display text-[17px] font-medium mb-5">Résultat net par secteur</h3>
          {sectorPerf.length === 0 ? (
            <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Pas encore assez de données.</div>
          ) : (
            <div className="space-y-4">
              {sectorPerf.map(s => {
                const maxNet = Math.max(...sectorPerf.map(x => Math.abs(x.net)), 1);
                const pct = Math.abs(s.net) / maxNet * 100;
                return (
                  <div key={s.sector}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }}></span>
                        <span className="text-[13px] font-medium">{s.name}</span>
                        <span className="text-[11px]" style={{ color: 'var(--muted)' }}>· {s.count} actif{s.count>1?'s':''}</span>
                      </div>
                      <span className="tnum text-[13px] font-medium" style={{ color: s.net >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                        {s.net >= 0 ? '+' : ''}{formatMoney(s.net, currency, { hide, compact: true })}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full relative" style={{ background: 'var(--line-2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.net >= 0 ? s.color : 'var(--negative)' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="label-caps mb-1">Classement</div>
          <h3 className="font-display text-[17px] font-medium mb-5">Actifs les plus rentables</h3>
          {bestAsset.length === 0 ? (
            <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Aucun actif.</div>
          ) : (
            <div className="space-y-3">
              {bestAsset.slice(0, 5).map((a, i) => {
                const S = SECTORS[a.sector] || SECTORS.other;
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center font-display font-semibold text-[12px]" style={{ background: i === 0 ? 'var(--ink)' : 'var(--line-2)', color: i === 0 ? 'var(--surface)' : 'var(--ink-2)' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{a.name}</div>
                      <div className="text-[11px]" style={{ color: S.color }}>{S.label}</div>
                    </div>
                    <div className="tnum text-[13.5px] font-medium" style={{ color: a.net >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                      {a.net >= 0 ? '+' : ''}{formatMoney(a.net, currency, { hide, compact: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="label-caps mb-1">Sources de revenus</div>
          <h3 className="font-display text-[17px] font-medium mb-5">Top catégories — Revenus</h3>
          {categoryBreakdown.income.length === 0 ? (
            <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Aucun revenu enregistré.</div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.income.map((c, i) => {
                const max = categoryBreakdown.income[0].value;
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-[13px] mb-1">
                      <span>{c.name}</span>
                      <span className="tnum font-medium" style={{ color: 'var(--positive)' }}>{formatMoney(c.value, currency, { hide, compact: true })}</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'var(--line-2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${c.value / max * 100}%`, background: 'var(--positive)' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="label-caps mb-1">Postes de coûts</div>
          <h3 className="font-display text-[17px] font-medium mb-5">Top catégories — Dépenses</h3>
          {categoryBreakdown.expense.length === 0 ? (
            <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Aucune dépense enregistrée.</div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.expense.map(c => {
                const max = categoryBreakdown.expense[0].value;
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-[13px] mb-1">
                      <span>{c.name}</span>
                      <span className="tnum font-medium" style={{ color: 'var(--negative)' }}>{formatMoney(c.value, currency, { hide, compact: true })}</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'var(--line-2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${c.value / max * 100}%`, background: 'var(--negative)' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==============================================================
// SETTINGS
// ==============================================================

function SettingsPage({ settings, setSettings, onResetData, onLoadDemo }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="px-10 py-8 max-w-[760px] slide-up">
      <div className="card p-6 mb-5">
        <h3 className="font-display text-[17px] font-medium mb-1">Profil</h3>
        <p className="text-[12.5px] mb-5" style={{ color: 'var(--muted)' }}>Informations affichées dans l'application.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-caps block mb-2">Nom</label>
            <input className="input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </div>
          <div>
            <label className="label-caps block mb-2">Localisation</label>
            <input className="input" value={form.ownerLocation} onChange={(e) => setForm({ ...form, ownerLocation: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card p-6 mb-5">
        <h3 className="font-display text-[17px] font-medium mb-1">Devises et taux</h3>
        <p className="text-[12.5px] mb-5" style={{ color: 'var(--muted)' }}>Utilisés pour la conversion des totaux affichés.</p>
        <div className="grid grid-cols-3 gap-4">
          {Object.keys(CURRENCIES).map(c => (
            <div key={c}>
              <label className="label-caps block mb-2">{c} → USD</label>
              <input
                className="input tnum"
                type="number"
                step="0.0001"
                value={form.exchangeRates[c]}
                onChange={(e) => setForm({ ...form, exchangeRates: { ...form.exchangeRates, [c]: parseFloat(e.target.value) || 0 } })}
                disabled={c === 'USD'}
              />
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--muted)' }}>
                1 USD = {form.exchangeRates[c]} {c}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6 mb-5">
        <h3 className="font-display text-[17px] font-medium mb-1">Affichage</h3>
        <div className="flex items-center justify-between py-3 border-t mt-4" style={{ borderColor: 'var(--line-2)' }}>
          <div>
            <div className="text-[13.5px] font-medium">Devise d'affichage par défaut</div>
            <div className="text-[11.5px]" style={{ color: 'var(--muted)' }}>Toutes les sommes seront converties dans cette devise.</div>
          </div>
          <select className="select" style={{ width: 140 }} value={form.displayCurrency} onChange={(e) => setForm({ ...form, displayCurrency: e.target.value })}>
            {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
          {saved && <span style={{ color: 'var(--positive)' }}><Check size={12} className="inline mr-1" />Paramètres sauvegardés</span>}
        </div>
        <button className="btn btn-primary" onClick={save}>Enregistrer les modifications</button>
      </div>

      <div className="divider-rule mb-6"></div>

      <div className="card p-6" style={{ borderColor: 'var(--line)' }}>
        <h3 className="font-display text-[16px] font-medium mb-1" style={{ color: 'var(--negative)' }}>Zone sensible</h3>
        <p className="text-[12.5px] mb-5" style={{ color: 'var(--muted)' }}>Actions irréversibles.</p>
        <div className="flex items-center justify-between py-3 border-t" style={{ borderColor: 'var(--line-2)' }}>
          <div>
            <div className="text-[13.5px] font-medium">Charger des données de démonstration</div>
            <div className="text-[11.5px]" style={{ color: 'var(--muted)' }}>Remplace vos données par un patrimoine-exemple de la région de Kivu.</div>
          </div>
          <button className="btn btn-secondary" onClick={() => { if (confirm('Remplacer toutes les données actuelles par des données de démo ?')) onLoadDemo(); }}>
            <Sparkles size={14} />
            Charger démo
          </button>
        </div>
        <div className="flex items-center justify-between py-3 border-t" style={{ borderColor: 'var(--line-2)' }}>
          <div>
            <div className="text-[13.5px] font-medium">Tout effacer</div>
            <div className="text-[11.5px]" style={{ color: 'var(--muted)' }}>Supprime tous les actifs, transactions et membres du personnel.</div>
          </div>
          <button className="btn btn-secondary" style={{ color: 'var(--negative)' }} onClick={() => { if (confirm('Êtes-vous sûr de vouloir TOUT supprimer ? Cette action est irréversible.')) onResetData(); }}>
            <Trash2 size={14} />
            Effacer
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================
// FORMS / MODALS
// ==============================================================

function AssetForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', sector: 'retail', location: '', status: 'active',
    acquisitionDate: new Date().toISOString().slice(0, 10),
    acquisitionCost: 0, currency: 'USD', notes: ''
  });

  const submit = () => {
    if (!form.name.trim()) return alert('Le nom est requis.');
    onSave(form);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label-caps block mb-2">Nom de l'actif *</label>
        <input className="input" placeholder="Ex. Boutique Kivu Central" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-caps block mb-2">Secteur</label>
          <select className="select" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}>
            {Object.entries(SECTORS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label-caps block mb-2">Statut</label>
          <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {Object.entries(STATUS_OPTIONS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label-caps block mb-2">Localisation</label>
        <input className="input" placeholder="Ex. Goma, Quartier Himbi" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label-caps block mb-2">Coût d'acquisition</label>
          <input className="input tnum" type="number" step="0.01" value={form.acquisitionCost} onChange={(e) => setForm({ ...form, acquisitionCost: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="label-caps block mb-2">Devise</label>
          <select className="select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label-caps block mb-2">Date d'acquisition</label>
        <input className="input" type="date" value={form.acquisitionDate} onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} />
      </div>
      <div>
        <label className="label-caps block mb-2">Notes</label>
        <textarea className="input textarea" rows={3} placeholder="Description, détails de l'actif..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button className="btn btn-secondary" onClick={onCancel}>Annuler</button>
        <button className="btn btn-primary" onClick={submit}>{initial ? 'Mettre à jour' : 'Créer l\'actif'}</button>
      </div>
    </div>
  );
}

function TransactionForm({ initial, assets, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    assetId: assets[0]?.id || '', type: 'income', category: '',
    amount: 0, currency: 'USD', date: new Date().toISOString().slice(0, 10),
    description: '', counterparty: ''
  });

  const asset = assets.find(a => a.id === form.assetId);
  const categories = form.type === 'income'
    ? (INCOME_CATEGORIES[asset?.sector] || INCOME_CATEGORIES.other)
    : (EXPENSE_CATEGORIES[asset?.sector] || EXPENSE_CATEGORIES.other);

  useEffect(() => {
    if (!categories.includes(form.category)) setForm(f => ({ ...f, category: categories[0] || '' }));
  }, [form.assetId, form.type]);

  const submit = () => {
    if (!form.assetId) return alert('Sélectionnez un actif.');
    if (!form.amount || form.amount <= 0) return alert('Le montant doit être supérieur à zéro.');
    onSave(form);
  };

  if (assets.length === 0) {
    return (
      <div>
        <EmptyState
          icon={Briefcase}
          title="Aucun actif disponible"
          description="Créez d'abord un actif avant d'enregistrer une transaction."
          action={<button className="btn btn-secondary" onClick={onCancel}>Fermer</button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 rounded" style={{ background: 'var(--line-2)' }}>
        <button
          onClick={() => setForm({ ...form, type: 'income' })}
          className="flex-1 py-2.5 rounded text-[13px] font-medium transition-all"
          style={{ background: form.type === 'income' ? 'var(--positive)' : 'transparent', color: form.type === 'income' ? '#fff' : 'var(--ink-2)' }}
        >
          <ArrowDownRight size={14} className="inline mr-1.5" style={{ transform: 'rotate(180deg)' }} />
          Revenu
        </button>
        <button
          onClick={() => setForm({ ...form, type: 'expense' })}
          className="flex-1 py-2.5 rounded text-[13px] font-medium transition-all"
          style={{ background: form.type === 'expense' ? 'var(--negative)' : 'transparent', color: form.type === 'expense' ? '#fff' : 'var(--ink-2)' }}
        >
          <ArrowUpRight size={14} className="inline mr-1.5" style={{ transform: 'rotate(180deg)' }} />
          Dépense
        </button>
      </div>

      <div>
        <label className="label-caps block mb-2">Actif concerné</label>
        <select className="select" value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
          {assets.map(a => <option key={a.id} value={a.id}>{a.name} — {SECTORS[a.sector]?.label}</option>)}
        </select>
      </div>

      <div>
        <label className="label-caps block mb-2">Catégorie</label>
        <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label-caps block mb-2">Montant</label>
          <input className="input tnum" type="number" step="0.01" autoFocus value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="label-caps block mb-2">Devise</label>
          <select className="select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label-caps block mb-2">Date</label>
        <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </div>

      <div>
        <label className="label-caps block mb-2">Description</label>
        <input className="input" placeholder="Ex. Loyer mars 2026" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>

      <div>
        <label className="label-caps block mb-2">Contrepartie (client, fournisseur...)</label>
        <input className="input" placeholder="Ex. Société XYZ" value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button className="btn btn-secondary" onClick={onCancel}>Annuler</button>
        <button className="btn btn-primary" onClick={submit}>{initial ? 'Mettre à jour' : 'Enregistrer'}</button>
      </div>
    </div>
  );
}

function PersonnelForm({ initial, assets, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    assetId: assets[0]?.id || '', name: '', role: '',
    salary: 0, currency: 'USD', contact: '',
    startDate: new Date().toISOString().slice(0, 10), status: 'active'
  });

  const submit = () => {
    if (!form.name.trim()) return alert('Le nom est requis.');
    if (!form.assetId) return alert('Affectez à un actif.');
    onSave(form);
  };

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Aucun actif disponible"
        description="Créez d'abord un actif avant d'ajouter du personnel."
        action={<button className="btn btn-secondary" onClick={onCancel}>Fermer</button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label-caps block mb-2">Nom complet *</label>
        <input className="input" placeholder="Ex. Esperance Mukumbi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-caps block mb-2">Rôle</label>
          <input className="input" placeholder="Ex. Gérante" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </div>
        <div>
          <label className="label-caps block mb-2">Statut</label>
          <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {Object.entries(STATUS_OPTIONS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label-caps block mb-2">Affecté à</label>
        <select className="select" value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
          {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label-caps block mb-2">Salaire mensuel</label>
          <input className="input tnum" type="number" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="label-caps block mb-2">Devise</label>
          <select className="select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-caps block mb-2">Contact</label>
          <input className="input" placeholder="Téléphone, email..." value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        </div>
        <div>
          <label className="label-caps block mb-2">Date d'embauche</label>
          <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button className="btn btn-secondary" onClick={onCancel}>Annuler</button>
        <button className="btn btn-primary" onClick={submit}>{initial ? 'Mettre à jour' : 'Ajouter'}</button>
      </div>
    </div>
  );
}

// ==============================================================
// ROOT APP
// ==============================================================

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [assets, setAssets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [page, setPage] = useState('dashboard');
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [toast, setToast] = useState('');

  const [txnModal, setTxnModal] = useState({ open: false, editing: null });
  const [assetModal, setAssetModal] = useState({ open: false, editing: null });
  const [personnelModal, setPersonnelModal] = useState({ open: false, editing: null });

  // Inject global styles
  useEffect(() => {
    const styleId = 'heritage-global-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = GLOBAL_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    (async () => {
      try {
        const init = storage.get(STORAGE_KEYS.initialized, false);
        if (init) {
          const [a, t, p, s] = [
            storage.get(STORAGE_KEYS.assets, []),
            storage.get(STORAGE_KEYS.transactions, []),
            storage.get(STORAGE_KEYS.personnel, []),
            storage.get(STORAGE_KEYS.settings, DEFAULT_SETTINGS),
          ];
          setAssets(a);
          setTransactions(t);
          setPersonnel(p);
          setSettings({ ...DEFAULT_SETTINGS, ...s });
          setInitialized(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist helpers
  useEffect(() => { if (initialized) storage.set(STORAGE_KEYS.assets, assets); }, [assets, initialized]);
  useEffect(() => { if (initialized) storage.set(STORAGE_KEYS.transactions, transactions); }, [transactions, initialized]);
  useEffect(() => { if (initialized) storage.set(STORAGE_KEYS.personnel, personnel); }, [personnel, initialized]);
  useEffect(() => { if (initialized) storage.set(STORAGE_KEYS.settings, settings); }, [settings, initialized]);

  // Keyboard shortcut
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'n' || e.key === 'N') { setTxnModal({ open: true, editing: null }); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showToast = (msg) => setToast(msg);

  const handleStart = async (mode) => {
    if (mode === 'demo') {
      const demo = buildDemoData();
      setAssets(demo.assets);
      setTransactions(demo.transactions);
      setPersonnel(demo.personnel);
      storage.set(STORAGE_KEYS.assets, demo.assets);
      storage.set(STORAGE_KEYS.transactions, demo.transactions);
      storage.set(STORAGE_KEYS.personnel, demo.personnel);
    }
    storage.set(STORAGE_KEYS.initialized, true);
    setInitialized(true);
  };

  const handleResetData = async () => {
    setAssets([]);
    setTransactions([]);
    setPersonnel([]);
    setSettings(DEFAULT_SETTINGS);
    storage.set(STORAGE_KEYS.assets, []);
    storage.set(STORAGE_KEYS.transactions, []);
    storage.set(STORAGE_KEYS.personnel, []);
    storage.set(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
    storage.set(STORAGE_KEYS.initialized, false);
    setInitialized(false);
    setPage('dashboard');
    showToast('Données effacées');
  };

  const handleLoadDemo = async () => {
    const demo = buildDemoData();
    setAssets(demo.assets);
    setTransactions(demo.transactions);
    setPersonnel(demo.personnel);
    storage.set(STORAGE_KEYS.assets, demo.assets);
    storage.set(STORAGE_KEYS.transactions, demo.transactions);
    storage.set(STORAGE_KEYS.personnel, demo.personnel);
    showToast('Données de démonstration chargées');
  };

  // CRUD handlers
  const handleAddAsset = (form) => {
    const newAsset = { ...form, id: uid() };
    setAssets([...assets, newAsset]);
    setAssetModal({ open: false, editing: null });
    showToast('Actif créé');
  };

  const handleEditAsset = (form) => {
    setAssets(assets.map(a => a.id === form.id ? form : a));
    setAssetModal({ open: false, editing: null });
    showToast('Actif mis à jour');
  };

  const handleDeleteAsset = (id) => {
    setAssets(assets.filter(a => a.id !== id));
    setTransactions(transactions.filter(t => t.assetId !== id));
    setPersonnel(personnel.filter(p => p.assetId !== id));
    showToast('Actif supprimé');
  };

  const handleAddTxn = (form) => {
    const newTxn = { ...form, id: uid() };
    setTransactions([...transactions, newTxn]);
    setTxnModal({ open: false, editing: null });
    showToast('Transaction enregistrée');
  };

  const handleEditTxn = (form) => {
    setTransactions(transactions.map(t => t.id === form.id ? form : t));
    setTxnModal({ open: false, editing: null });
    showToast('Transaction mise à jour');
  };

  const handleDeleteTxn = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
    showToast('Transaction supprimée');
  };

  const handleAddPersonnel = (form) => {
    const newPerson = { ...form, id: uid() };
    setPersonnel([...personnel, newPerson]);
    setPersonnelModal({ open: false, editing: null });
    showToast('Membre ajouté');
  };

  const handleEditPersonnel = (form) => {
    setPersonnel(personnel.map(p => p.id === form.id ? form : p));
    setPersonnelModal({ open: false, editing: null });
    showToast('Membre mis à jour');
  };

  const handleDeletePersonnel = (id) => {
    setPersonnel(personnel.filter(p => p.id !== id));
    showToast('Membre retiré');
  };

  if (loading) {
    return (
      <div className="heritage-root min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="pulse-dot mx-auto mb-4"></div>
          <div style={{ color: 'var(--muted)' }}>Chargement...</div>
        </div>
      </div>
    );
  }

  if (!initialized) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  const pageConfig = {
    dashboard: { title: 'Tableau de bord', subtitle: 'Aperçu' },
    portfolio: { title: 'Patrimoine', subtitle: 'Actifs' },
    transactions: { title: 'Transactions', subtitle: 'Mouvements' },
    personnel: { title: 'Personnel', subtitle: 'Équipes' },
    analytics: { title: 'Analyses', subtitle: 'Statistiques' },
    settings: { title: 'Paramètres', subtitle: 'Configuration' },
  };

  const { title, subtitle } = pageConfig[page] || { title: '', subtitle: '' };

  return (
    <div className="heritage-root flex">
      <Sidebar page={page} setPage={setPage} settings={settings} assets={assets} />
      <main className="flex-1 min-w-0">
        <TopBar
          title={title}
          subtitle={subtitle}
          settings={settings}
          setSettings={setSettings}
          onQuickAdd={page === 'dashboard' || page === 'transactions' ? () => setTxnModal({ open: true, editing: null }) : null}
        />
        {page === 'dashboard' && (
          <Dashboard
            assets={assets}
            transactions={transactions}
            personnel={personnel}
            settings={settings}
            setPage={setPage}
            setSelectedAssetId={setSelectedAssetId}
            openAddTxn={() => setTxnModal({ open: true, editing: null })}
          />
        )}
        {page === 'portfolio' && (
          <Portfolio
            assets={assets}
            transactions={transactions}
            personnel={personnel}
            settings={settings}
            selectedAssetId={selectedAssetId}
            setSelectedAssetId={setSelectedAssetId}
            onAddAsset={() => setAssetModal({ open: true, editing: null })}
            onEditAsset={(asset) => setAssetModal({ open: true, editing: asset })}
            onDeleteAsset={handleDeleteAsset}
          />
        )}
        {page === 'transactions' && (
          <Transactions
            transactions={transactions}
            assets={assets}
            settings={settings}
            onAddTxn={() => setTxnModal({ open: true, editing: null })}
            onEditTxn={(t) => setTxnModal({ open: true, editing: t })}
            onDeleteTxn={handleDeleteTxn}
          />
        )}
        {page === 'personnel' && (
          <Personnel
            personnel={personnel}
            assets={assets}
            settings={settings}
            onAdd={() => setPersonnelModal({ open: true, editing: null })}
            onEdit={(p) => setPersonnelModal({ open: true, editing: p })}
            onDelete={handleDeletePersonnel}
          />
        )}
        {page === 'analytics' && (
          <Analytics
            assets={assets}
            transactions={transactions}
            personnel={personnel}
            settings={settings}
          />
        )}
        {page === 'settings' && (
          <SettingsPage
            settings={settings}
            setSettings={setSettings}
            onResetData={handleResetData}
            onLoadDemo={handleLoadDemo}
          />
        )}
      </main>

      {/* Modals */}
      <Modal
        open={assetModal.open}
        onClose={() => setAssetModal({ open: false, editing: null })}
        title={assetModal.editing ? 'Modifier l\'actif' : 'Nouvel actif'}
      >
        <AssetForm
          initial={assetModal.editing}
          onSave={assetModal.editing ? handleEditAsset : handleAddAsset}
          onCancel={() => setAssetModal({ open: false, editing: null })}
        />
      </Modal>

      <Modal
        open={txnModal.open}
        onClose={() => setTxnModal({ open: false, editing: null })}
        title={txnModal.editing ? 'Modifier la transaction' : 'Nouvelle transaction'}
      >
        <TransactionForm
          initial={txnModal.editing}
          assets={assets}
          onSave={txnModal.editing ? handleEditTxn : handleAddTxn}
          onCancel={() => setTxnModal({ open: false, editing: null })}
        />
      </Modal>

      <Modal
        open={personnelModal.open}
        onClose={() => setPersonnelModal({ open: false, editing: null })}
        title={personnelModal.editing ? 'Modifier le membre' : 'Nouveau membre'}
      >
        <PersonnelForm
          initial={personnelModal.editing}
          assets={assets}
          onSave={personnelModal.editing ? handleEditPersonnel : handleAddPersonnel}
          onCancel={() => setPersonnelModal({ open: false, editing: null })}
        />
      </Modal>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}