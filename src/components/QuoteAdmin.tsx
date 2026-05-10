import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Plus, Send, Eye, X as XIcon, Trash2, FileText,
  CheckCircle2, Clock, AlertCircle, Search, Download, Copy, ExternalLink,
} from 'lucide-react';

interface Line { _id?: string; description: string; details?: string; quantity: number; unit: string; unitPrice: number }
interface Client { name: string; email: string; company?: string; phone?: string; address?: string }
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

interface CatalogItem {
  id: string;
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

  // Recalcul totaux en local
  useEffect(() => {
    const subtotal = q.lines.reduce((s, l) => s + (l.quantity || 1) * (l.unitPrice || 0), 0);
    const taxAmount = Math.round(subtotal * (q.taxRate / 100) * 100) / 100;
    const totalTTC = Math.round((subtotal + taxAmount) * 100) / 100;
    const ciiAmount = q.ciiEligible ? Math.round(Math.min(subtotal, 400000) * 0.20 * 100) / 100 : 0;
    setQ((prev) => ({ ...prev, subtotal, taxAmount, totalTTC, ciiAmount }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.lines, q.taxRate, q.ciiEligible]);

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
    const newLine: Line = item
      ? { description: item.label, details: item.description, quantity: 1, unit: item.unit, unitPrice: item.defaultPrice }
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
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nom *" value={q.client.name} onChange={(v) => setQ({ ...q, client: { ...q.client, name: v } })} />
                <Input label="Email *" type="email" value={q.client.email} onChange={(v) => setQ({ ...q, client: { ...q.client, email: v } })} />
                <Input label="Entreprise" value={q.client.company} onChange={(v) => setQ({ ...q, client: { ...q.client, company: v } })} />
                <Input label="Téléphone" value={q.client.phone} onChange={(v) => setQ({ ...q, client: { ...q.client, phone: v } })} />
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

            {/* Catalogue */}
            <Section title="Ajouter depuis le catalogue">
              <div className="grid grid-cols-2 gap-2">
                {catalog.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => addLine(c)}
                    className="text-left p-3 rounded-[10px] bg-[#FAFAFA] hover:bg-[#F2EFE9] border border-black/5"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-semibold text-[#1D1D1F]">{c.label}</span>
                      <span className="text-[12px] text-[#86868B]">{fmtEur(c.defaultPrice)}</span>
                    </div>
                    <div className="text-[11.5px] text-[#86868B] line-clamp-2">{c.description}</div>
                  </button>
                ))}
              </div>
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
                            <span className="text-[#86868B] text-[12px]">€</span>
                            <span className="ml-auto font-semibold text-[13px]">{fmtEur((l.quantity || 1) * (l.unitPrice || 0))}</span>
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

            {/* Devises */}
            <Section title="Devise(s)">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">Devise principale</label>
                  <select
                    value={q.currency}
                    onChange={(e) => setQ({ ...q, currency: e.target.value })}
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
                  <input
                    type="number"
                    step="0.0001"
                    value={q.secondaryRate || 1}
                    onChange={(e) => setQ({ ...q, secondaryRate: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px]"
                    placeholder="Ex : 1.08 (1 EUR = 1.08 USD)"
                  />
                  <p className="text-[11px] text-[#86868B] mt-1">Le devis affiche le montant en {q.currency} et la conversion en {q.secondaryCurrency} entre parentheses.</p>
                </div>
              )}
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
              <div className="bg-[#F2EFE9] rounded-[12px] p-4 space-y-1.5 text-[14px]">
                <div className="flex justify-between"><span>Sous-total HT</span><strong>{fmtMain(q.subtotal)}</strong></div>
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

            <Section title="Notes (optionnel)">
              <textarea
                value={q.notes || ''}
                onChange={(e) => setQ({ ...q, notes: e.target.value })}
                rows={3}
                placeholder="Conditions de paiement, mentions, etc."
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
