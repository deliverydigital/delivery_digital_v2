import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Users, Upload, RefreshCw, Search, Filter, X as XIcon,
  Mail, Phone, Building2, MapPin, Calendar, Tag as TagIcon, TrendingUp,
  MessageSquare, FileText, Edit3, Trash2, Plus, Send, Download, Sparkles,
  ChevronRight, Settings,
} from 'lucide-react';
import AIOrb from './AIOrb';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:        { label: 'Nouveau',    color: '#8E8E93' },
  contacted:  { label: 'Contacte',   color: '#0066CC' },
  qualified:  { label: 'Qualifie',   color: '#5856D6' },
  meeting:    { label: 'Meeting',    color: '#AF52DE' },
  proposal:   { label: 'Devis',      color: '#FF9500' },
  won:        { label: 'Gagne',      color: '#34C759' },
  lost:       { label: 'Perdu',      color: '#FF3B30' },
  archived:   { label: 'Archive',    color: '#C7C7CC' },
};

const SOURCE_LABELS: Record<string, string> = {
  chat: 'Chat /discutons',
  manual: 'Manuel',
  'import-csv': 'Import CSV',
  osm: 'OSM',
  sirene: 'SIRENE',
  linkedin: 'LinkedIn',
  referral: 'Referral',
  website: 'Site web',
  other: 'Autre',
};

const SECRET_KEY = 'dd_seo_admin_secret';

type Status = keyof typeof STATUS_LABELS;

interface Prospect {
  _id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  role?: string;
  phone?: string;
  city?: string;
  industry?: string;
  source: string;
  status: Status;
  tags?: string[];
  score?: number;
  estimatedValueEur?: number;
  summary?: string;
  lastContactAt?: string;
  nextFollowUpAt?: string;
  chatSessionIds?: string[];
  timeline?: Array<{ _id?: string; kind: string; body: string; meta?: any; by: string; at: string }>;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  recent30d: number;
  pipelineValueEur: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

export default function ProspectAdmin() {
  const [secret, setSecret] = useState<string | null>(() => localStorage.getItem(SECRET_KEY));
  const [view, setView] = useState<'list' | 'import' | 'stats'>('list');
  const [items, setItems] = useState<Prospect[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openProspect, setOpenProspect] = useState<Prospect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const api = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          'Content-Type': 'application/json',
          'x-admin-secret': secret || '',
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [secret]
  );

  const load = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterSource) params.set('source', filterSource);
      if (search) params.set('q', search);
      params.set('limit', '200');
      const data = await api(`/api/admin/prospects?${params}`);
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message);
      if (/unauthorized/i.test(e.message)) {
        localStorage.removeItem(SECRET_KEY);
        setSecret(null);
      }
    } finally {
      setLoading(false);
    }
  }, [secret, filterStatus, filterSource, search, api]);

  const loadStats = useCallback(async () => {
    if (!secret) return;
    try {
      const data = await api('/api/admin/prospects/stats');
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    }
  }, [secret, api]);

  useEffect(() => {
    if (view === 'list') load();
    if (view === 'stats') loadStats();
  }, [view, load, loadStats]);

  const syncChats = async () => {
    if (!confirm('Importer tous les utilisateurs du chat /discutons en prospects ?')) return;
    setSyncing(true);
    try {
      const r = await api('/api/admin/prospects/sync-from-chats', { method: 'POST' });
      alert(`Sync OK : ${r.created} crees, ${r.updated} mis a jour, ${r.skipped} skipped.`);
      await load();
    } catch (e: any) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const bulkAction = async (action: string, value?: any) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      await api('/api/admin/prospects/bulk', { method: 'POST', body: JSON.stringify({ ids, action, value }) });
      setSelected(new Set());
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (!secret) {
    return <SecretGate onAuth={(s) => { localStorage.setItem(SECRET_KEY, s); setSecret(s); }} />;
  }

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: '#F2EFE9',
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(29,29,31,0.08) 1px, transparent 0)',
        backgroundSize: '14px 14px',
      }}
    >
      {/* Sidebar */}
      <aside className="w-[260px] flex-shrink-0 hidden md:flex flex-col bg-white border-r border-black/8 min-h-screen">
        <div className="px-5 pt-5 pb-4 border-b border-black/5">
          <div className="flex items-center gap-2.5 mb-2">
            <AIOrb size={28} innerColor="#FFFFFF" />
            <span
              className="text-[16px] text-[#1D1D1F]"
              style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
            >
              Prospects
            </span>
          </div>
          <p className="text-[11.5px] text-[#86868B]">Pipeline DELIVERY Digital</p>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          <NavBtn active={view === 'list'} icon={<Users className="h-4 w-4" />} label="Liste" onClick={() => setView('list')} />
          <NavBtn active={view === 'stats'} icon={<TrendingUp className="h-4 w-4" />} label="Stats" onClick={() => setView('stats')} />
          <NavBtn active={view === 'import'} icon={<Upload className="h-4 w-4" />} label="Import CSV" onClick={() => setView('import')} />
          <div className="h-px bg-black/5 my-3" />
          <button
            onClick={syncChats}
            disabled={syncing}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13.5px] text-[#86868B] hover:bg-[#F5F5F7] disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="text-left">Sync depuis chats</span>
          </button>
          <a
            href="/admin/seo"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13.5px] text-[#86868B] hover:bg-[#F5F5F7]"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-left">SEO Admin</span>
          </a>
        </nav>

        <div className="px-4 py-3 border-t border-black/5">
          <button
            onClick={() => { localStorage.removeItem(SECRET_KEY); setSecret(null); }}
            className="text-[11.5px] text-[#86868B] hover:text-[#1D1D1F]"
          >
            Se deconnecter
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 px-5 sm:px-8 pt-8 pb-20 max-w-[1200px]">
        {error && (
          <div className="mb-4 rounded-[14px] bg-[#FF3B30]/10 ring-1 ring-[#FF3B30]/20 px-4 py-3 text-[13px] text-[#FF3B30] flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><XIcon className="h-4 w-4" /></button>
          </div>
        )}

        {view === 'list' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1
                className="text-[28px] sm:text-[34px] text-[#1D1D1F]"
                style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
              >
                Prospects <span className="text-[#86868B] ml-2">{items.length}</span>
              </h1>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/admin/prospects/export.csv?adminSecret=${encodeURIComponent(secret || '')}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 ring-black/8 bg-white text-[12.5px] text-[#1D1D1F] hover:bg-[#F5F5F7]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </a>
                <button
                  onClick={() => setOpenProspect({ _id: 'new', source: 'manual', status: 'new', createdAt: '', updatedAt: '' } as any)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1D1D1F] text-white text-[12.5px] font-semibold hover:bg-[#3C3C43]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouveau
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <form
                onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }}
                className="relative flex-1 min-w-[220px]"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868B]" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Rechercher (nom, email, entreprise)..."
                  className="w-full pl-9 pr-3 py-2 rounded-full bg-white ring-1 ring-black/8 text-[13px] outline-none focus:ring-[#1D1D1F]"
                />
              </form>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-full bg-white ring-1 ring-black/8 text-[12.5px] outline-none cursor-pointer"
              >
                <option value="">Tous statuts</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="px-3 py-2 rounded-full bg-white ring-1 ring-black/8 text-[12.5px] outline-none cursor-pointer"
              >
                <option value="">Toutes sources</option>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button onClick={load} className="p-2 rounded-full bg-white ring-1 ring-black/8 text-[#86868B] hover:text-[#1D1D1F]">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Bulk actions */}
            {selected.size > 0 && (
              <div className="mb-3 flex items-center gap-2 bg-white ring-1 ring-black/8 rounded-full px-4 py-2">
                <span className="text-[12.5px] font-semibold text-[#1D1D1F]">{selected.size} selectionne{selected.size > 1 ? 's' : ''}</span>
                <select
                  onChange={(e) => { if (e.target.value) bulkAction('status', e.target.value); e.target.value = ''; }}
                  defaultValue=""
                  className="px-2 py-1 rounded-md bg-[#F5F5F7] text-[12px]"
                >
                  <option value="" disabled>Changer statut...</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const tag = prompt('Tag a ajouter ?');
                    if (tag) bulkAction('addTag', tag);
                  }}
                  className="px-2 py-1 rounded-md bg-[#F5F5F7] text-[12px] text-[#1D1D1F]"
                >
                  + tag
                </button>
                <button
                  onClick={() => { if (confirm(`Supprimer ${selected.size} prospects ?`)) bulkAction('delete'); }}
                  className="px-2 py-1 rounded-md bg-[#FF3B30]/10 text-[12px] text-[#FF3B30]"
                >
                  Supprimer
                </button>
                <button onClick={() => setSelected(new Set())} className="ml-auto text-[#86868B] hover:text-[#1D1D1F]">
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="flex items-center gap-2 text-[#86868B] text-[14px] py-10">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
              </div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-10 text-center">
                <p className="text-[#86868B] text-[14px]">Aucun prospect. Importe un CSV ou sync depuis les chats.</p>
              </div>
            ) : (
              <div className="bg-white rounded-[18px] ring-1 ring-black/5 overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-black/5 text-left text-[11.5px] uppercase tracking-wider text-[#86868B]">
                      <th className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={selected.size === items.length && items.length > 0}
                          onChange={(e) => setSelected(e.target.checked ? new Set(items.map((i) => i._id)) : new Set())}
                        />
                      </th>
                      <th className="px-3 py-3">Nom</th>
                      <th className="px-3 py-3">Entreprise</th>
                      <th className="px-3 py-3">Statut</th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-3 py-3">Score</th>
                      <th className="px-3 py-3 text-right">Cree</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr
                        key={p._id}
                        className="border-b border-black/5 last:border-0 hover:bg-[#FAFAFA] cursor-pointer"
                        onClick={() => setOpenProspect(p)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(p._id)}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(p._id); else next.delete(p._id);
                              setSelected(next);
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-[#1D1D1F]">{p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || '(sans nom)'}</div>
                          <div className="text-[11.5px] text-[#86868B] truncate max-w-[220px]">{p.email || '-'}</div>
                        </td>
                        <td className="px-3 py-3 text-[#1D1D1F]">
                          <div className="truncate max-w-[180px]">{p.company || '-'}</div>
                          {p.city && <div className="text-[11px] text-[#86868B]">{p.city}</div>}
                        </td>
                        <td className="px-3 py-3"><StatusPill status={p.status} /></td>
                        <td className="px-3 py-3 text-[#86868B] text-[12px]">{SOURCE_LABELS[p.source] || p.source}</td>
                        <td className="px-3 py-3">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[11px] font-semibold text-[#1D1D1F]">
                            {p.score || 0}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-[11.5px] text-[#86868B]">
                          {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {view === 'stats' && <StatsView stats={stats} onLoad={loadStats} />}
        {view === 'import' && <ImportView api={api} onDone={() => { setView('list'); load(); }} />}
      </main>

      <AnimatePresence>
        {openProspect && (
          <ProspectDrawer
            api={api}
            prospect={openProspect}
            onClose={() => setOpenProspect(null)}
            onSaved={async () => { await load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============== Helpers UI ============== */

function NavBtn({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13.5px] font-semibold transition-colors ${
        active ? 'bg-[#F2EFE9] text-[#1D1D1F]' : 'text-[#86868B] hover:bg-[#F5F5F7]'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] || { label: status, color: '#86868B' };
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

function SecretGate({ onAuth }: { onAuth: (secret: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{
        background: '#F2EFE9',
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(29,29,31,0.10) 1px, transparent 0)',
        backgroundSize: '14px 14px',
      }}
    >
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-7">
          <AIOrb size={56} innerColor="#F2EFE9" />
          <h1
            className="mt-5 text-[28px] sm:text-[34px] leading-[1.1] text-[#1D1D1F] text-center"
            style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
          >
            Prospects
          </h1>
          <p className="mt-2 text-[15px] text-[#86868B] text-center max-w-[360px]">
            Entrez votre cle d'acces administrateur.
          </p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (val.trim()) onAuth(val.trim()); }}
          className="bg-white rounded-[22px] ring-1 ring-black/5 p-5 sm:p-6 space-y-3"
          style={{ boxShadow: '0 12px 30px -12px rgba(0,0,0,0.10)' }}
        >
          <input
            type="password"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            autoFocus
            className="w-full px-4 py-3 rounded-[12px] bg-[#F5F5F7] outline-none text-[15px] text-[#1D1D1F]"
            placeholder="Admin secret"
          />
          <button
            type="submit"
            className="w-full px-5 py-3 rounded-full bg-[#1D1D1F] text-white text-[15px] font-semibold hover:bg-[#3C3C43] transition-colors"
          >
            Acceder
          </button>
        </form>
      </div>
    </div>
  );
}

/* ============== Stats View ============== */

function StatsView({ stats, onLoad }: { stats: Stats | null; onLoad: () => void }) {
  if (!stats) {
    return (
      <div className="flex items-center gap-2 text-[#86868B] text-[14px] py-10">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
      </div>
    );
  }
  return (
    <>
      <h1
        className="text-[28px] sm:text-[34px] text-[#1D1D1F] mb-6"
        style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
      >
        Pipeline
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total" value={stats.total.toString()} />
        <StatCard label="30 derniers jours" value={`+${stats.recent30d}`} />
        <StatCard label="Pipeline" value={`${(stats.pipelineValueEur || 0).toLocaleString('fr-FR')} EUR`} />
        <StatCard label="Gagnes" value={(stats.byStatus.won || 0).toString()} accent="#34C759" />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-5">
          <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">Par statut</h3>
          <div className="space-y-2">
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[13px]">
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: v.color }} />
                  {v.label}
                </span>
                <strong className="text-[#1D1D1F]">{stats.byStatus[k] || 0}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-5">
          <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">Par source</h3>
          <div className="space-y-2">
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[13px]">
                <span>{v}</span>
                <strong className="text-[#1D1D1F]">{stats.bySource[k] || 0}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-4">
      <div className="text-[11px] uppercase tracking-wider text-[#86868B] font-semibold mb-1">{label}</div>
      <div className="text-[24px] font-bold tracking-tight" style={{ color: accent || '#1D1D1F' }}>{value}</div>
    </div>
  );
}

/* ============== Import CSV ============== */

function ImportView({ api, onDone }: { api: any; onDone: () => void }) {
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCsv(reader.result as string);
    reader.readAsText(file);
  };

  const submit = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await api('/api/admin/prospects/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csv }),
      });
      setResult(r);
    } catch (e: any) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1
        className="text-[28px] sm:text-[34px] text-[#1D1D1F] mb-2"
        style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
      >
        Import CSV
      </h1>
      <p className="text-[14px] text-[#86868B] mb-6 max-w-[600px]">
        Colonnes attendues (header obligatoire, ordre libre) : <code className="bg-[#F5F5F7] px-1.5 py-0.5 rounded">email, firstName, lastName, company, phone, city, industry, role, website</code>. Upsert par email.
      </p>

      <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-5 mb-4">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="block mb-3 text-[12px]"
        />
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={12}
          placeholder="email,firstName,lastName,company,phone,city,industry,role,website&#10;jdoe@example.com,Jean,Doe,Acme,0600000000,Nice,Tech,CEO,https://acme.fr"
          className="w-full p-3 rounded-[10px] bg-[#F5F5F7] outline-none text-[12px] font-mono resize-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11.5px] text-[#86868B]">{csv.split('\n').filter(Boolean).length} lignes (header inclus)</span>
          <button
            onClick={submit}
            disabled={!csv.trim() || busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[13px] font-semibold disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importer
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-5">
          <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-2">Resultat</h3>
          <p className="text-[13px] text-[#1D1D1F]">
            <strong>{result.created}</strong> crees, <strong>{result.updated}</strong> mis a jour, <strong>{result.skipped}</strong> skipped.
          </p>
          {result.errors?.length > 0 && (
            <ul className="mt-3 text-[12px] text-[#FF3B30] space-y-1">
              {result.errors.map((e: string, i: number) => <li key={i}>- {e}</li>)}
            </ul>
          )}
          <button
            onClick={onDone}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[12.5px] font-semibold"
          >
            Voir la liste <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

/* ============== Drawer detail ============== */

function ProspectDrawer({
  api, prospect: initial, onClose, onSaved,
}: {
  api: any;
  prospect: Prospect;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [p, setP] = useState<Prospect>(initial);
  const [busy, setBusy] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteKind, setNoteKind] = useState<'note' | 'email' | 'call'>('note');

  const isNew = p._id === 'new';

  const save = async () => {
    setBusy(true);
    try {
      if (isNew) {
        const r = await api('/api/admin/prospects', { method: 'POST', body: JSON.stringify(p) });
        setP(r.item);
      } else {
        const r = await api(`/api/admin/prospects/${p._id}`, { method: 'PATCH', body: JSON.stringify(p) });
        setP(r.item);
      }
      await onSaved();
    } catch (e: any) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim() || isNew) return;
    setBusy(true);
    try {
      const r = await api(`/api/admin/prospects/${p._id}/timeline`, {
        method: 'POST',
        body: JSON.stringify({ kind: noteKind, body: noteText }),
      });
      setP(r.item);
      setNoteText('');
      await onSaved();
    } catch (e: any) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Supprimer ce prospect ?') || isNew) return;
    try {
      await api(`/api/admin/prospects/${p._id}`, { method: 'DELETE' });
      await onSaved();
      onClose();
    } catch (e: any) {
      alert(`Erreur : ${e.message}`);
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
        className="fixed inset-y-0 right-0 w-full sm:w-[640px] z-50 bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <div className="min-w-0">
            <h3
              className="text-[20px] text-[#1D1D1F] truncate"
              style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
            >
              {isNew ? 'Nouveau prospect' : (p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || '(sans nom)')}
            </h3>
            {!isNew && p.email && <p className="text-[12.5px] text-[#86868B] truncate">{p.email}</p>}
          </div>
          <button onClick={onClose} className="text-[#86868B] hover:text-[#1D1D1F]">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prenom"><Input value={p.firstName} onChange={(v) => setP({ ...p, firstName: v })} /></Field>
            <Field label="Nom"><Input value={p.lastName} onChange={(v) => setP({ ...p, lastName: v })} /></Field>
          </div>
          <Field label="Email"><Input value={p.email} type="email" onChange={(v) => setP({ ...p, email: v })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telephone"><Input value={p.phone} onChange={(v) => setP({ ...p, phone: v })} /></Field>
            <Field label="Entreprise"><Input value={p.company} onChange={(v) => setP({ ...p, company: v })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role"><Input value={p.role} onChange={(v) => setP({ ...p, role: v })} /></Field>
            <Field label="Ville"><Input value={p.city} onChange={(v) => setP({ ...p, city: v })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Statut">
              <select
                value={p.status}
                onChange={(e) => setP({ ...p, status: e.target.value as Status })}
                className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px]"
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Score (0-100)">
              <Input value={p.score?.toString()} onChange={(v) => setP({ ...p, score: parseInt(v, 10) || 0 })} />
            </Field>
          </div>
          <Field label="Valeur estimee (EUR)">
            <Input value={p.estimatedValueEur?.toString()} onChange={(v) => setP({ ...p, estimatedValueEur: parseInt(v, 10) || 0 })} />
          </Field>
          <Field label="Tags (separes par virgule)">
            <Input
              value={(p.tags || []).join(', ')}
              onChange={(v) => setP({ ...p, tags: v.split(',').map((t) => t.trim()).filter(Boolean) })}
            />
          </Field>
          <Field label="Resume / Note">
            <textarea
              value={p.summary || ''}
              onChange={(e) => setP({ ...p, summary: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] resize-none"
            />
          </Field>

          {!isNew && (
            <>
              <div className="h-px bg-black/5 my-2" />

              <div>
                <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#86868B] mb-3">Timeline</h4>

                <div className="bg-[#F5F5F7] rounded-[14px] p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {(['note', 'email', 'call'] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => setNoteKind(k)}
                        className={`px-3 py-1 rounded-full text-[11.5px] font-medium ${
                          noteKind === k ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'
                        }`}
                      >
                        {k === 'note' ? 'Note' : k === 'email' ? 'Email' : 'Appel'}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={2}
                    placeholder={noteKind === 'note' ? 'Ajouter une note...' : noteKind === 'email' ? 'Resume de l\'email envoye...' : 'Resume de l\'appel...'}
                    className="w-full p-2 rounded-[8px] bg-white outline-none text-[13px] resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={addNote}
                      disabled={!noteText.trim() || busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1D1D1F] text-white text-[12px] font-semibold disabled:opacity-40"
                    >
                      <Send className="h-3 w-3" />
                      Ajouter
                    </button>
                  </div>
                </div>

                <ul className="space-y-2">
                  {(p.timeline || []).slice().reverse().map((t, i) => (
                    <li key={t._id || i} className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#F2EFE9] flex items-center justify-center">
                        {t.kind === 'note' && <Edit3 className="h-3 w-3 text-[#1D1D1F]" />}
                        {t.kind === 'email' && <Mail className="h-3 w-3 text-[#1D1D1F]" />}
                        {t.kind === 'call' && <Phone className="h-3 w-3 text-[#1D1D1F]" />}
                        {t.kind === 'chat' && <MessageSquare className="h-3 w-3 text-[#1D1D1F]" />}
                        {!['note','email','call','chat'].includes(t.kind) && <FileText className="h-3 w-3 text-[#1D1D1F]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11.5px] text-[#86868B]">
                          {t.kind} - {new Date(t.at).toLocaleString('fr-FR')} - {t.by}
                        </div>
                        <div className="text-[13px] text-[#1D1D1F] whitespace-pre-wrap">{t.body || '(sans contenu)'}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-black/5 flex items-center gap-2">
          {!isNew && (
            <button onClick={remove} className="p-2 rounded-full text-[#86868B] hover:text-[#FF3B30]" title="Supprimer">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-white ring-1 ring-black/8 text-[13px] text-[#1D1D1F] ml-auto">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[13px] font-semibold hover:bg-[#3C3C43] disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {isNew ? 'Creer' : 'Enregistrer'}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text' }: { value?: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] text-[#1D1D1F]"
    />
  );
}
