import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Plus, Send, Eye, X as XIcon, Trash2, FileText,
  CheckCircle2, Clock, AlertCircle, Search, Download, Copy, ExternalLink, RefreshCw,
} from 'lucide-react';

interface Line { _id?: string; description: string; details?: string; quantity: number; unit: string; unitPrice: number }
interface Client { name: string; email: string; company?: string; phone?: string; address?: string }
interface PaymentScheduleEntry { label: string; percent: number }
interface Quote {
  _id: string;
  ref: string;
  client: Client;
  title: string;
  intro?: string;
  lines: Line[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalTTC: number;
  currency: string;
  secondaryCurrency?: string;
  secondaryRate?: number;
  discountType?: 'none' | 'percent' | 'amount';
  discountValue?: number;
  discountAmount?: number;
  subtotalAfterDiscount?: number;
  language?: string;
  issuer?: 'fr' | 'ae'; // entite emettrice : fr = DELIVERY Digital Nice, ae = DELIVERY DIGITAL TECHNOLOGY FZCO
  paymentSchedule?: PaymentScheduleEntry[]; // [] = utilise le defaut 50/50 cote serveur
  ciiEligible: boolean;
  ciiAmount: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  validUntil?: string;
  notes?: string;
  publicToken?: string;
  createdAt: string;
  sentAt?: string;
  viewedAt?: string;
}

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'zh', label: '中文' },
];

const CURRENCIES = [
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'USD', label: 'USD ($)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'CHF', label: 'CHF' },
  { code: 'CAD', label: 'CAD' },
  { code: 'AED', label: 'AED (د.إ - Dubai)' },
  { code: 'MAD', label: 'MAD (Maroc)' },
  { code: 'TND', label: 'TND (Tunisie)' },
  { code: 'AUD', label: 'AUD' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'CNY', label: 'CNY (¥)' },
  { code: 'SGD', label: 'SGD' },
];

// Symbole compact a afficher a cote des inputs de prix (suit la devise du devis).
// @author Rabah Ziane - 2026-05-12
const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', CAD: 'CA$',
  AED: 'AED', MAD: 'DH', TND: 'DT', AUD: 'A$',
  JPY: '¥', CNY: '¥', SGD: 'S$',
};
function currencySymbol(code: string | undefined): string {
  return CURRENCY_SYMBOL[(code || 'EUR').toUpperCase()] || code || '€';
}

interface CatalogItem {
  id: string;
  category?: string;
  label: string;
  defaultPrice: number;
  unit: string;
  description: string;
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Brouillon', color: '#8E8E93' },
  sent:     { label: 'Envoye',    color: '#0066CC' },
  viewed:   { label: 'Lu',        color: '#5856D6' },
  accepted: { label: 'Accepte',   color: '#34C759' },
  rejected: { label: 'Refuse',    color: '#FF3B30' },
  expired:  { label: 'Expire',    color: '#C7C7CC' },
};

export default function QuoteAdmin({ secret }: { secret: string }) {
  const [items, setItems] = useState<Quote[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editing, setEditing] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), 'Content-Type': 'application/json', 'x-admin-secret': secret },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, [secret]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (search) params.set('q', search);
      const data = await api(`/api/admin/quotes-quick?${params}`);
      setItems(data.items || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api, filterStatus, search]);

  const loadCatalog = useCallback(async () => {
    try {
      const d = await api('/api/admin/quotes-quick/catalog');
      setCatalog(d.catalog || []);
    } catch {}
  }, [api]);

  useEffect(() => { load(); loadCatalog(); }, [load, loadCatalog]);

  const newQuote = () => {
    setEditing({
      _id: 'new',
      ref: '',
      client: { name: '', email: '', company: '' },
      title: 'Devis projet sur mesure',
      intro: '',
      lines: [],
      subtotal: 0,
      taxRate: 20,
      taxAmount: 0,
      totalTTC: 0,
      currency: 'EUR',
      secondaryCurrency: '',
      secondaryRate: 1,
      language: 'fr',
      issuer: 'fr',
      paymentSchedule: [],
      discountType: 'none',
      discountValue: 0,
      discountAmount: 0,
      subtotalAfterDiscount: 0,
      ciiEligible: false,
      ciiAmount: 0,
      status: 'draft',
      createdAt: new Date().toISOString(),
    });
  };

  const onDelete = async (id: string) => {
    if (!confirm('Supprimer ce devis ?')) return;
    try {
      await api(`/api/admin/quotes-quick/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[28px] sm:text-[34px] text-[#1D1D1F]"
          style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
        >
          Devis <span className="text-[#86868B] ml-2">{items.length}</span>
        </h1>
        <button
          onClick={newQuote}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[13px] font-semibold hover:bg-[#3C3C43]"
        >
          <Plus className="h-4 w-4" />
          Nouveau devis
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (client, ref, entreprise)..."
            className="w-full pl-9 pr-3 py-2 rounded-full bg-white ring-1 ring-black/8 text-[13px] outline-none focus:ring-[#1D1D1F]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-full bg-white ring-1 ring-black/8 text-[12.5px] outline-none cursor-pointer"
        >
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-[14px] bg-[#FF3B30]/10 ring-1 ring-[#FF3B30]/20 px-4 py-3 text-[13px] text-[#FF3B30]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#86868B] text-[14px] py-10">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-10 text-center">
          <p className="text-[#86868B] text-[14px]">Aucun devis. Cliquez sur "Nouveau devis".</p>
        </div>
      ) : (
        <div className="bg-white rounded-[18px] ring-1 ring-black/5 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-black/5 text-left text-[11.5px] uppercase tracking-wider text-[#86868B]">
                <th className="px-4 py-3">Réf</th>
                <th className="px-3 py-3">Client</th>
                <th className="px-3 py-3">Titre</th>
                <th className="px-3 py-3">Statut</th>
                <th className="px-3 py-3 text-right">Total TTC</th>
                <th className="px-3 py-3 text-right">Date</th>
                <th className="px-3 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q._id} className="border-b border-black/5 last:border-0 hover:bg-[#FAFAFA] cursor-pointer" onClick={() => setEditing(q)}>
                  <td className="px-4 py-3 font-mono text-[12px] text-[#1D1D1F]">{q.ref}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-[#1D1D1F]">{q.client.name}</div>
                    <div className="text-[11.5px] text-[#86868B]">{q.client.company || q.client.email}</div>
                  </td>
                  <td className="px-3 py-3 text-[#1D1D1F] truncate max-w-[200px]">{q.title}</td>
                  <td className="px-3 py-3"><StatusPill status={q.status} /></td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{fmtCurrency(q.totalTTC, q.currency)}</td>
                  <td className="px-3 py-3 text-right text-[11.5px] text-[#86868B]">{new Date(q.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onDelete(q._id)} className="p-1.5 text-[#86868B] hover:text-[#FF3B30]">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <QuoteEditor
            api={api}
            quote={editing}
            catalog={catalog}
            onClose={() => setEditing(null)}
            onSaved={async () => { await load(); }}
            secret={secret}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ============== Helpers ============== */

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || { label: status, color: '#86868B' };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.color + '15', color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function fmtCurrency(n: number, currency = 'EUR') {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}
const fmtEur = (n: number) => fmtCurrency(n, 'EUR');

/* ============== Editor / Drawer ============== */

function QuoteEditor({
  api, quote: initial, catalog, onClose, onSaved, secret,
}: {
  api: (url: string, options?: RequestInit) => Promise<any>;
  quote: Quote;
  catalog: CatalogItem[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  secret: string;
}) {
  const [q, setQ] = useState<Quote>(initial);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [busy, setBusy] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  const isNew = q._id === 'new';

  // Auto-fetch du taux quand on change de devise secondaire
  useEffect(() => {
    if (!q.secondaryCurrency || q.secondaryCurrency === q.currency) return;
    if (q.secondaryRate && q.secondaryRate !== 1) return; // l'user a deja un taux
    let cancelled = false;
    api(`/api/admin/quotes-quick/exchange-rate?from=${q.currency}&to=${q.secondaryCurrency}`)
      .then((r) => { if (!cancelled && r.rate) setQ((prev) => ({ ...prev, secondaryRate: r.rate })); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.secondaryCurrency, q.currency]);

  // Taux EUR -> devise du devis. Le catalogue est en EUR donc on convertit a l'ajout.
  // Reste a 1 si la devise du devis EST EUR. Fetch live via /exchange-rate sinon.
  // @author Rabah Ziane - 2026-05-11
  const [eurRate, setEurRate] = useState(1);
  useEffect(() => {
    const cur = (q.currency || 'EUR').toUpperCase();
    if (cur === 'EUR') { setEurRate(1); return; }
    let cancelled = false;
    api(`/api/admin/quotes-quick/exchange-rate?from=EUR&to=${cur}`)
      .then((r) => { if (!cancelled && r.rate) setEurRate(r.rate); })
      .catch(() => { if (!cancelled) setEurRate(1); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.currency]);

  // Autocomplete client depuis prospects
  const [prospectQuery, setProspectQuery] = useState('');
  const [prospectSuggestions, setProspectSuggestions] = useState<Array<any>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!prospectQuery || prospectQuery.length < 2) { setProspectSuggestions([]); return; }
    const timer = setTimeout(() => {
      api(`/api/admin/prospects?q=${encodeURIComponent(prospectQuery)}&limit=8`)
        .then((d) => setProspectSuggestions(d.items || []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [prospectQuery, api]);

  const selectProspect = (p: any) => {
    setQ({
      ...q,
      client: {
        name: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email,
        email: p.email || '',
        company: p.company || '',
        phone: p.phone || '',
      },
      prospectId: p._id,
    } as Quote);
    setShowSuggestions(false);
    setProspectQuery('');
  };

  // Autocomplete client depuis devis existants (clients deja devises)
  // @author Rabah Ziane - 2026-05-23
  const [clientSuggestions, setClientSuggestions] = useState<Array<any>>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  useEffect(() => {
    const name = q.client?.name || '';
    if (!showClientSuggestions || name.length < 2) { setClientSuggestions([]); return; }
    const timer = setTimeout(() => {
      api(`/api/admin/quotes-quick/clients/suggest?q=${encodeURIComponent(name)}`)
        .then((d) => setClientSuggestions(d.items || []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [q.client?.name, showClientSuggestions, api]);

  const selectExistingClient = (c: any) => {
    setQ({
      ...q,
      client: {
        name: c.name || '',
        email: c.email || '',
        company: c.company || '',
        phone: c.phone || '',
        address: c.address || '',
      },
    } as Quote);
    setShowClientSuggestions(false);
    setClientSuggestions([]);
  };

  // Recalcul totaux en local
  useEffect(() => {
    const round = (n: number) => Math.round(n * 100) / 100;
    const subtotal = round(q.lines.reduce((s, l) => s + (l.quantity || 1) * (l.unitPrice || 0), 0));
    let discountAmount = 0;
    if (q.discountType === 'percent' && (q.discountValue || 0) > 0) {
      discountAmount = round(subtotal * ((q.discountValue || 0) / 100));
    } else if (q.discountType === 'amount' && (q.discountValue || 0) > 0) {
      discountAmount = round(Math.min(q.discountValue || 0, subtotal));
    }
    const subtotalAfterDiscount = round(subtotal - discountAmount);
    const taxAmount = round(subtotalAfterDiscount * (q.taxRate / 100));
    const totalTTC = round(subtotalAfterDiscount + taxAmount);
    const ciiAmount = q.ciiEligible ? round(Math.min(subtotalAfterDiscount, 400000) * 0.20) : 0;
    setQ((prev) => ({ ...prev, subtotal, discountAmount, subtotalAfterDiscount, taxAmount, totalTTC, ciiAmount }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.lines, q.taxRate, q.ciiEligible, q.discountType, q.discountValue]);

  const cur = q.currency || 'EUR';
  const sec = q.secondaryCurrency || '';
  const fmtMain = (n: number) => fmtCurrency(n, cur);

  const save = async (): Promise<Quote | null> => {
    setBusy(true);
    try {
      const body = {
        client: q.client, title: q.title, intro: q.intro, lines: q.lines,
        taxRate: q.taxRate, ciiEligible: q.ciiEligible, validUntil: q.validUntil, notes: q.notes,
        currency: q.currency, secondaryCurrency: q.secondaryCurrency, secondaryRate: q.secondaryRate,
        discountType: q.discountType, discountValue: q.discountValue,
        language: q.language,
        issuer: q.issuer || 'fr',
        paymentSchedule: q.paymentSchedule || [],
        autoSendInvoice: (q as any).autoSendInvoice !== false,
      };
      const res = isNew
        ? await api('/api/admin/quotes-quick', { method: 'POST', body: JSON.stringify(body) })
        : await api(`/api/admin/quotes-quick/${q._id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setQ(res.item);
      await onSaved();
      return res.item;
    } catch (e: any) {
      alert(`Erreur : ${e.message}`);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const showPreview = async () => {
    let saved = q;
    if (isNew || hasChanges()) {
      const r = await save();
      if (!r) return;
      saved = r;
    }
    setBusy(true);
    try {
      const url = `/api/admin/quotes-quick/${saved._id}/preview.html?adminSecret=${encodeURIComponent(secret)}`;
      const res = await fetch(url, { headers: { 'x-admin-secret': secret } });
      const html = await res.text();
      setPreviewHtml(html);
      setTab('preview');
    } finally {
      setBusy(false);
    }
  };

  const hasChanges = () => {
    return JSON.stringify(q) !== JSON.stringify(initial);
  };

  const sendEmail = async () => {
    if (!q.client?.email) { alert('Email du client requis.'); return; }
    if (!confirm(`Envoyer ce devis à ${q.client.email} ?`)) return;
    let saved = q;
    if (isNew || hasChanges()) {
      const r = await save();
      if (!r) return;
      saved = r;
    }
    setBusy(true);
    try {
      const r = await api(`/api/admin/quotes-quick/${saved._id}/send`, { method: 'POST' });
      alert(`Devis envoyé à ${saved.client.email} !\nLien public : ${r.publicLink}`);
      await onSaved();
      onClose();
    } catch (e: any) {
      alert(`Erreur envoi : ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const addLine = (item?: CatalogItem) => {
    // Conversion EUR (devise du catalogue) -> devise du devis. Arrondi a 2 decimales.
    const convertedPrice = item ? Math.round(item.defaultPrice * eurRate * 100) / 100 : 0;
    const newLine: Line = item
      ? { description: item.label, details: item.description, quantity: 1, unit: item.unit, unitPrice: convertedPrice }
      : { description: '', details: '', quantity: 1, unit: 'forfait', unitPrice: 0 };
    setQ({ ...q, lines: [...q.lines, newLine] });
  };

  const updateLine = (idx: number, patch: Partial<Line>) => {
    const lines = [...q.lines];
    lines[idx] = { ...lines[idx], ...patch };
    setQ({ ...q, lines });
  };

  const removeLine = (idx: number) => {
    setQ({ ...q, lines: q.lines.filter((_, i) => i !== idx) });
  };

  const translate = async (target: string) => {
    if (target === q.language) return;
    if (q.lines.length === 0 && !q.title.trim()) {
      alert('Ajoutez au moins une ligne ou un titre avant de traduire.');
      return;
    }
    if (!confirm(`Traduire ce devis en ${LANGUAGES.find((l) => l.code === target)?.label} ? (Les champs FR seront remplaces par leur traduction)`)) return;
    let saved = q;
    if (isNew || hasChanges()) {
      const r = await save();
      if (!r) return;
      saved = r;
    }
    setBusy(true);
    try {
      const r = await api(`/api/admin/quotes-quick/${saved._id}/translate`, {
        method: 'POST',
        body: JSON.stringify({ target }),
      });
      setQ(r.item);
      await onSaved();
      alert('Traduction terminee.');
    } catch (e: any) {
      alert(`Erreur traduction : ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 right-0 w-full sm:w-[820px] z-50 bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('edit')}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium ${tab === 'edit' ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}
            >Editer</button>
            <button
              onClick={showPreview}
              disabled={busy}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium inline-flex items-center gap-1 ${tab === 'preview' ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}
            ><Eye className="h-3 w-3" />Prévisualiser</button>
          </div>
          <div className="flex-1 text-center">
            {!isNew && <span className="font-mono text-[12px] text-[#86868B]">{q.ref}</span>}
          </div>
          <button onClick={onClose} className="text-[#86868B] hover:text-[#1D1D1F]">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {tab === 'edit' ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Client */}
            <Section title="Client">
              {/* Recherche prospect existant */}
              <div className="relative mb-3">
                <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">Lier un prospect existant (optionnel)</label>
                <input
                  type="text"
                  value={prospectQuery}
                  onChange={(e) => { setProspectQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Rechercher (nom, email, entreprise)..."
                  className="w-full px-3 py-2 rounded-[10px] bg-[#F2EFE9] outline-none text-[14px] text-[#1D1D1F]"
                />
                {showSuggestions && prospectSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-[280px] overflow-y-auto bg-white rounded-[12px] ring-1 ring-black/8 shadow-2xl z-10">
                    {prospectSuggestions.map((p: any) => (
                      <button
                        key={p._id}
                        onMouseDown={(e) => { e.preventDefault(); selectProspect(p); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#FAFAFA] border-b border-black/5 last:border-0"
                      >
                        <div className="text-[13.5px] font-semibold text-[#1D1D1F]">{p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || '(sans nom)'}</div>
                        <div className="text-[11.5px] text-[#86868B]">
                          {p.email}{p.company ? ' · ' + p.company : ''}{p.status ? ' · ' + p.status : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {q.prospectId && (
                  <p className="text-[11px] text-[#34C759] mt-1">✓ Devis lie au prospect en base (le statut sera mis a jour automatiquement)</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Nom client avec autocomplete sur clients deja devises */}
                <div className="relative">
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">Nom *</label>
                  <input
                    type="text"
                    value={q.client.name}
                    onChange={(e) => { setQ({ ...q, client: { ...q.client, name: e.target.value } }); setShowClientSuggestions(true); }}
                    onFocus={() => { if ((q.client?.name || '').length >= 2) setShowClientSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                    className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] text-[#1D1D1F]"
                  />
                  {showClientSuggestions && clientSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-[240px] overflow-y-auto bg-white rounded-[12px] ring-1 ring-black/8 shadow-2xl z-20">
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#86868B] bg-[#FAFAFA] border-b border-black/5">Clients existants</div>
                      {clientSuggestions.map((c: any, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); selectExistingClient(c); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-[#FAFAFA] border-b border-black/5 last:border-0"
                        >
                          <div className="text-[13.5px] font-semibold text-[#1D1D1F]">{c.name || '(sans nom)'}</div>
                          <div className="text-[11.5px] text-[#86868B]">
                            {c.email}{c.company ? ' · ' + c.company : ''}{c.lastQuoteRef ? ' · ' + c.lastQuoteRef : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input label="Email *" type="email" value={q.client.email} onChange={(v) => setQ({ ...q, client: { ...q.client, email: v } })} />
                <Input label="Entreprise" value={q.client.company} onChange={(v) => setQ({ ...q, client: { ...q.client, company: v } })} />
                <PhoneInput label="Téléphone" value={q.client.phone} onChange={(v) => setQ({ ...q, client: { ...q.client, phone: v } })} />
              </div>
            </Section>

            {/* Title + intro */}
            <Section title="Devis">
              <Input label="Titre" value={q.title} onChange={(v) => setQ({ ...q, title: v })} />
              <div className="mt-3">
                <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">Introduction (optionnel)</label>
                <textarea
                  value={q.intro || ''}
                  onChange={(e) => setQ({ ...q, intro: e.target.value })}
                  rows={3}
                  placeholder="Ex: Suite à notre échange du..."
                  className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] resize-none"
                />
              </div>
            </Section>

            {/* Catalogue groupe par categorie */}
            <Section title={`Ajouter depuis le catalogue (${catalog.length} services)`}>
              {(() => {
                const byCat: Record<string, CatalogItem[]> = {};
                catalog.forEach((c) => {
                  const cat = c.category || 'Autres';
                  if (!byCat[cat]) byCat[cat] = [];
                  byCat[cat].push(c);
                });
                return (
                  <div className="space-y-4">
                    {Object.entries(byCat).map(([cat, items]) => (
                      <div key={cat}>
                        <h5 className="text-[11px] font-semibold uppercase tracking-wider text-[#1D1D1F] mb-2">{cat}</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {items.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => addLine(c)}
                              className="text-left p-3 rounded-[10px] bg-[#FAFAFA] hover:bg-[#F2EFE9] border border-black/5"
                            >
                              <div className="flex items-center justify-between mb-1 gap-2">
                                <span className="text-[13px] font-semibold text-[#1D1D1F]">{c.label}</span>
                                <span className="text-[12px] text-[#86868B] whitespace-nowrap">{fmtCurrency(Math.round(c.defaultPrice * eurRate * 100) / 100, q.currency)}/{c.unit}</span>
                              </div>
                              <div className="text-[11.5px] text-[#86868B] line-clamp-2">{c.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <button
                onClick={() => addLine()}
                className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-[#0066CC] font-semibold hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Ligne libre
              </button>
            </Section>

            {/* Lignes */}
            {q.lines.length > 0 && (
              <Section title={`Lignes (${q.lines.length})`}>
                <div className="space-y-2">
                  {q.lines.map((l, i) => (
                    <div key={i} className="bg-[#F5F5F7] rounded-[12px] p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <input
                            value={l.description}
                            onChange={(e) => updateLine(i, { description: e.target.value })}
                            placeholder="Prestation"
                            className="w-full px-2 py-1.5 rounded-[8px] bg-white outline-none text-[14px] font-semibold"
                          />
                          <input
                            value={l.details || ''}
                            onChange={(e) => updateLine(i, { details: e.target.value })}
                            placeholder="Détails (optionnel)"
                            className="w-full px-2 py-1.5 rounded-[8px] bg-white outline-none text-[12.5px] text-[#86868B]"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={l.quantity}
                              onChange={(e) => updateLine(i, { quantity: parseFloat(e.target.value) || 0 })}
                              className="w-16 px-2 py-1 rounded-[8px] bg-white outline-none text-[12.5px] text-right"
                            />
                            <input
                              value={l.unit}
                              onChange={(e) => updateLine(i, { unit: e.target.value })}
                              className="w-20 px-2 py-1 rounded-[8px] bg-white outline-none text-[12.5px]"
                              placeholder="forfait"
                            />
                            <span className="text-[#86868B] text-[12px]">×</span>
                            <input
                              type="number"
                              value={l.unitPrice}
                              onChange={(e) => updateLine(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                              className="w-24 px-2 py-1 rounded-[8px] bg-white outline-none text-[12.5px] text-right"
                            />
                            <span className="text-[#86868B] text-[12px]">{currencySymbol(q.currency)}</span>
                            <span className="ml-auto font-semibold text-[13px]">{fmtCurrency((l.quantity || 1) * (l.unitPrice || 0), q.currency)}</span>
                          </div>
                        </div>
                        <button onClick={() => removeLine(i)} className="text-[#86868B] hover:text-[#FF3B30] mt-1">
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Langue + traduction */}
            <Section title="Langue du devis">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={q.language || 'fr'}
                  onChange={(e) => setQ({ ...q, language: e.target.value })}
                  className="px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] cursor-pointer"
                >
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
                <span className="text-[12px] text-[#86868B]">|</span>
                <span className="text-[12px] text-[#86868B] mr-1">Traduire (IA Claude) :</span>
                {LANGUAGES.filter((l) => l.code !== (q.language || 'fr')).slice(0, 5).map((l) => (
                  <button
                    key={l.code}
                    onClick={() => translate(l.code)}
                    disabled={busy || isNew}
                    className="px-2.5 py-1 rounded-full bg-white ring-1 ring-black/8 text-[12px] text-[#1D1D1F] hover:ring-black/20 disabled:opacity-40"
                    title={isNew ? 'Enregistrez d\'abord le devis' : ''}
                  >
                    → {l.label}
                  </button>
                ))}
              </div>
              <p className="text-[11.5px] text-[#86868B] mt-2">La traduction remplace le contenu actuel (titre, intro, lignes, notes). Les libelles techniques (Sous-total, TVA, Total TTC...) s'adaptent automatiquement.</p>
            </Section>

            {/* Entite emettrice - bloc qui determine quelle societe edite le devis (Nice ou Dubai). Pilote la devise + la TVA par defaut. @author Rabah Ziane - 2026-05-10 */}
            <Section title="Entité émettrice">
              <div className="grid grid-cols-2 gap-3">
                {([
                  { v: 'fr', flag: '🇫🇷', name: 'DELIVERY Digital', sub: 'Nice, France · SIRET 902 945 195' },
                  { v: 'ae', flag: '🇦🇪', name: 'DELIVERY Digital Technology', sub: 'Dubai (FZCO) · IFZA 45734' },
                ] as const).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => {
                      // Bascule entite : on aligne devise + TVA par defaut.
                      const next = opt.v;
                      const nextCurrency = next === 'fr' ? 'EUR' : 'AED';
                      const nextTaxRate = next === 'fr' ? 20 : 0;
                      setQ({ ...q, issuer: next, currency: nextCurrency, taxRate: nextTaxRate });
                    }}
                    className={`text-left p-4 rounded-[14px] ring-1 transition ${
                      (q.issuer || 'fr') === opt.v
                        ? 'bg-[#1D1D1F] text-white ring-[#1D1D1F]'
                        : 'bg-white text-[#1D1D1F] ring-black/8 hover:ring-black/20'
                    }`}
                  >
                    <div className="text-[20px] mb-1">{opt.flag}</div>
                    <div className="text-[13.5px] font-semibold">{opt.name}</div>
                    <div className={`text-[11.5px] mt-0.5 ${(q.issuer || 'fr') === opt.v ? 'text-white/70' : 'text-[#86868B]'}`}>{opt.sub}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#86868B] mt-2">Determine le pied de page du devis (raison sociale, adresse, mentions legales) ainsi que la devise et la TVA par defaut.</p>
            </Section>

            {/* Devises */}
            <Section title="Devise(s)">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">Devise principale</label>
                  <select
                    value={q.currency}
                    onChange={(e) => {
                      const next = e.target.value;
                      // TVA auto : EUR uniquement si entite FR. Sinon (devise etrangere ou entite Dubai) -> 0 %.
                      const issuer = q.issuer || 'fr';
                      const autoRate = (issuer === 'fr' && next === 'EUR') ? 20 : 0;
                      setQ({ ...q, currency: next, taxRate: autoRate });
                    }}
                    className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] cursor-pointer"
                  >
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">Aussi afficher en (optionnel)</label>
                  <select
                    value={q.secondaryCurrency || ''}
                    onChange={(e) => setQ({ ...q, secondaryCurrency: e.target.value })}
                    className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] cursor-pointer"
                  >
                    <option value="">— Aucune —</option>
                    {CURRENCIES.filter((c) => c.code !== q.currency).map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              {q.secondaryCurrency && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">Taux de change : 1 {q.currency} = ? {q.secondaryCurrency}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.0001"
                      value={q.secondaryRate || 1}
                      onChange={(e) => setQ({ ...q, secondaryRate: parseFloat(e.target.value) || 1 })}
                      className="flex-1 px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px]"
                      placeholder="Ex : 1.08"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const r = await api(`/api/admin/quotes-quick/exchange-rate?from=${q.currency}&to=${q.secondaryCurrency}`);
                          if (r.rate) setQ({ ...q, secondaryRate: r.rate });
                        } catch (e: any) {
                          alert('Impossible de recuperer le taux : ' + e.message);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-[10px] bg-[#1D1D1F] text-white text-[12.5px] font-semibold hover:bg-[#3C3C43] whitespace-nowrap"
                      title="Recuperer le taux actuel via la BCE"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Auto
                    </button>
                  </div>
                  <p className="text-[11px] text-[#86868B] mt-1">Cliquer "Auto" pour recuperer le taux actuel (BCE / open.er-api). Modifiable a la main si tu veux figer un taux.</p>
                </div>
              )}
            </Section>

            {/* Reduction */}
            <Section title="Reduction (optionnel)">
              <div className="flex flex-wrap items-center gap-2">
                {([
                  { v: 'none', l: 'Aucune' },
                  { v: 'percent', l: 'Pourcentage' },
                  { v: 'amount', l: 'Montant fixe' },
                ] as const).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setQ({ ...q, discountType: opt.v, discountValue: opt.v === 'none' ? 0 : (q.discountValue || 0) })}
                    className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium ${q.discountType === opt.v ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}
                  >
                    {opt.l}
                  </button>
                ))}
                {q.discountType !== 'none' && (
                  <div className="flex items-center gap-1 ml-2">
                    <input
                      type="number"
                      step="0.01"
                      value={q.discountValue || 0}
                      onChange={(e) => setQ({ ...q, discountValue: parseFloat(e.target.value) || 0 })}
                      className="w-28 px-2 py-1.5 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] text-right"
                      placeholder={q.discountType === 'percent' ? 'ex: 10' : 'ex: 500'}
                    />
                    <span className="text-[13px] text-[#86868B]">{q.discountType === 'percent' ? '%' : q.currency}</span>
                  </div>
                )}
              </div>
            </Section>

            {/* TVA - bloc d'edition du taux applique au devis (presets + custom). Le defaut est ajuste auto selon la devise principale (cf. onChange ci-dessus). @author Rabah Ziane - 2026-05-10 */}
            <Section title="TVA">
              <div className="flex flex-wrap items-center gap-2">
                {([0, 5.5, 10, 20] as const).map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setQ({ ...q, taxRate: rate })}
                    className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium ${q.taxRate === rate ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}
                  >
                    {rate === 0 ? 'Aucune (0 %)' : `${String(rate).replace('.', ',')} %`}
                  </button>
                ))}
                {(() => {
                  const isCustom = ![0, 5.5, 10, 20].includes(q.taxRate);
                  return (
                    <>
                      <button
                        onClick={() => setQ({ ...q, taxRate: isCustom ? q.taxRate : 8.5 })}
                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium ${isCustom ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}
                      >
                        Personnalisé
                      </button>
                      {isCustom && (
                        <div className="flex items-center gap-1 ml-2">
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            max={100}
                            value={q.taxRate}
                            onChange={(e) => setQ({ ...q, taxRate: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
                            className="w-24 px-2 py-1.5 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] text-right"
                            placeholder="ex: 8.5"
                          />
                          <span className="text-[13px] text-[#86868B]">%</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <p className="text-[11px] text-[#86868B] mt-2">Defaut : 20 % en EUR, 0 % pour les autres devises (export hors UE). Ajustable a la main.</p>
            </Section>

            {/* CII + TVA + total */}
            <Section title="Total et options">
              <label className="flex items-center gap-2 mb-3 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={q.ciiEligible}
                  onChange={(e) => setQ({ ...q, ciiEligible: e.target.checked })}
                />
                <span><strong>Eligible Crédit Impôt Innovation (CII)</strong> - PME française, projet innovant</span>
              </label>
              <label className="flex items-center gap-2 mb-3 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={(q as any).autoSendInvoice !== false}
                  onChange={(e) => setQ({ ...q, autoSendInvoice: e.target.checked } as Quote)}
                />
                <span><strong>Envoyer la facture d'acompte automatiquement</strong> au client à l'acceptation du devis (décocher pour envoyer manuellement)</span>
              </label>
              <div className="bg-[#F2EFE9] rounded-[12px] p-4 space-y-1.5 text-[14px]">
                <div className="flex justify-between"><span>Sous-total HT</span><strong>{fmtMain(q.subtotal)}</strong></div>
                {(q.discountAmount || 0) > 0 && (
                  <>
                    <div className="flex justify-between text-[#FF9500]">
                      <span>Réduction{q.discountType === 'percent' ? ` (${q.discountValue}%)` : ''}</span>
                      <span>-{fmtMain(q.discountAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between"><span>Sous-total après remise</span><strong>{fmtMain(q.subtotalAfterDiscount || 0)}</strong></div>
                  </>
                )}
                <div className="flex justify-between text-[#86868B]"><span>TVA ({q.taxRate}%)</span><span>{fmtMain(q.taxAmount)}</span></div>
                <div className="flex justify-between text-[16px] pt-2 border-t border-black/10"><strong>Total TTC</strong><strong>{fmtMain(q.totalTTC)}</strong></div>
                {sec && q.secondaryRate && (
                  <div className="text-[11px] text-[#86868B] text-right">≈ {fmtCurrency(q.totalTTC * q.secondaryRate, sec)}</div>
                )}
                {q.ciiEligible && q.ciiAmount > 0 && (
                  <>
                    <div className="flex justify-between text-[#34C759]"><span>↓ CII (-20%)</span><span>-{fmtMain(q.ciiAmount)}</span></div>
                    <div className="flex justify-between text-[15px]"><strong>Coût net après CII</strong><strong>{fmtMain(q.totalTTC - q.ciiAmount)}</strong></div>
                  </>
                )}
              </div>
            </Section>

            {/* Conditions de paiement - defaut 50/50 (acompte/livraison) ou personnalise par devis. La somme doit faire 100. @author Rabah Ziane - 2026-05-10 */}
            <Section title="Conditions de paiement">
              {(() => {
                const isCustom = (q.paymentSchedule || []).length > 0;
                const sum = (q.paymentSchedule || []).reduce((s, p) => s + (Number(p.percent) || 0), 0);
                return (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <button
                        onClick={() => setQ({ ...q, paymentSchedule: [] })}
                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium ${!isCustom ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}
                      >
                        Defaut (50 % acompte / 50 % livraison)
                      </button>
                      <button
                        onClick={() => setQ({ ...q, paymentSchedule: q.paymentSchedule && q.paymentSchedule.length > 0 ? q.paymentSchedule : [
                          { label: 'Acompte a la signature', percent: 30 },
                          { label: 'Acompte intermediaire', percent: 40 },
                          { label: 'Solde a la livraison', percent: 30 },
                        ] })}
                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium ${isCustom ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}
                      >
                        Personnaliser
                      </button>
                    </div>
                    {isCustom && (
                      <div className="space-y-2">
                        {(q.paymentSchedule || []).map((p, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              value={p.label}
                              onChange={(e) => {
                                const next = [...(q.paymentSchedule || [])];
                                next[i] = { ...next[i], label: e.target.value };
                                setQ({ ...q, paymentSchedule: next });
                              }}
                              placeholder="Ex: Acompte a la signature"
                              className="flex-1 px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[13.5px]"
                            />
                            <input
                              type="number"
                              step="1"
                              min={0}
                              max={100}
                              value={p.percent}
                              onChange={(e) => {
                                const next = [...(q.paymentSchedule || [])];
                                next[i] = { ...next[i], percent: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) };
                                setQ({ ...q, paymentSchedule: next });
                              }}
                              className="w-20 px-2 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[13.5px] text-right"
                            />
                            <span className="text-[13px] text-[#86868B]">%</span>
                            <button
                              onClick={() => {
                                const next = [...(q.paymentSchedule || [])];
                                next.splice(i, 1);
                                setQ({ ...q, paymentSchedule: next });
                              }}
                              className="p-1.5 rounded-[8px] text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#FF3B30]"
                              title="Supprimer cette echeance"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setQ({ ...q, paymentSchedule: [...(q.paymentSchedule || []), { label: '', percent: 0 }] })}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12.5px] font-medium bg-white ring-1 ring-black/8 text-[#1D1D1F] hover:ring-black/20"
                        >
                          <Plus className="h-3.5 w-3.5" /> Ajouter une echeance
                        </button>
                        <p className={`text-[11px] mt-2 ${sum === 100 ? 'text-[#34C759]' : 'text-[#FF9500]'}`}>
                          Somme : {sum} % {sum !== 100 ? '— doit faire 100 % pour etre valide' : '✓'}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </Section>

            <Section title="Notes (optionnel)">
              <textarea
                value={q.notes || ''}
                onChange={(e) => setQ({ ...q, notes: e.target.value })}
                rows={3}
                placeholder="Conditions specifiques, mentions, etc."
                className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[13px] resize-none"
              />
            </Section>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-[#F2EFE9]">
            {previewHtml ? (
              <iframe srcDoc={previewHtml} className="w-full min-h-full border-0" style={{ height: '100%' }} title="Preview" />
            ) : (
              <div className="flex items-center gap-2 text-[#86868B] text-[14px] p-10">
                <Loader2 className="h-4 w-4 animate-spin" /> Generation de la preview...
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-black/5 flex items-center justify-end gap-2">
          {!isNew && q.publicToken && (
            <button
              onClick={() => {
                const url = `${window.location.origin}/devis/${q.publicToken}`;
                navigator.clipboard.writeText(url);
                alert('Lien public copie : ' + url);
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-white ring-1 ring-black/8 text-[12.5px] text-[#1D1D1F] hover:ring-black/20"
            >
              <Copy className="h-3.5 w-3.5" /> Lien client
            </button>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-2 rounded-full bg-white ring-1 ring-black/8 text-[13px] text-[#1D1D1F] hover:ring-black/20 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enregistrer'}
          </button>
          <button
            onClick={sendEmail}
            disabled={busy || !q.client?.email}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[13px] font-semibold disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" /> Envoyer au client
          </button>
        </div>
      </motion.div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#86868B] mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value?: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] text-[#1D1D1F]"
      />
    </div>
  );
}

// Champ telephone avec selecteur d'indicatif pays. Liste priorisee FR + Maghreb + Golfe + UE.
// Stocke en DB sous "+XX numero" pour rester compatible avec le champ string existant.
// @author Rabah Ziane - 2026-05-11
const PHONE_COUNTRIES = [
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: '+213', flag: '🇩🇿', name: 'Algerie' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisie' },
  { code: '+32', flag: '🇧🇪', name: 'Belgique' },
  { code: '+41', flag: '🇨🇭', name: 'Suisse' },
  { code: '+352', flag: '🇱🇺', name: 'Luxembourg' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+1', flag: '🇺🇸', name: 'US / Canada' },
  { code: '+34', flag: '🇪🇸', name: 'Espagne' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+39', flag: '🇮🇹', name: 'Italie' },
  { code: '+49', flag: '🇩🇪', name: 'Allemagne' },
  { code: '+31', flag: '🇳🇱', name: 'Pays-Bas' },
  { code: '+966', flag: '🇸🇦', name: 'Arabie Saoudite' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+965', flag: '🇰🇼', name: 'Koweit' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrein' },
  { code: '+968', flag: '🇴🇲', name: 'Oman' },
];
function parsePhone(full?: string): { code: string; number: string } {
  const v = (full || '').trim();
  if (!v) return { code: '+33', number: '' };
  // Trouve l'indicatif le plus long qui matche au debut, en triant par longueur decroissante
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (v.startsWith(c.code)) {
      return { code: c.code, number: v.slice(c.code.length).trim() };
    }
  }
  return { code: '+33', number: v };
}
function PhoneInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  // Etat local du code pour que la selection persiste meme quand le numero est vide
  // (sinon parsePhone('') retombe sur +33 et ecrase le choix de l'utilisateur).
  const initial = parsePhone(value);
  const [code, setCode] = useState(initial.code);
  const [number, setNumber] = useState(initial.number);
  // Resync si la prop value change depuis l'exterieur (chargement d'un devis existant)
  useEffect(() => {
    const p = parsePhone(value);
    setCode(p.code);
    setNumber(p.number);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const propagate = (c: string, n: string) => {
    const trimmed = n.trim();
    onChange(trimmed ? `${c} ${trimmed}` : '');
  };
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">{label}</label>
      <div className="flex gap-2">
        <select
          value={code}
          onChange={(e) => { setCode(e.target.value); propagate(e.target.value, number); }}
          className="px-2 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] text-[#1D1D1F] cursor-pointer"
          style={{ minWidth: 110 }}
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
          ))}
        </select>
        <input
          type="tel"
          value={number}
          onChange={(e) => { setNumber(e.target.value); propagate(code, e.target.value); }}
          placeholder="6 12 34 56 78"
          className="flex-1 min-w-0 px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] text-[#1D1D1F]"
        />
      </div>
    </div>
  );
}
