import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, FileText, Sparkles, Check, X as XIcon, Edit3, Trash2,
  ChevronRight, RefreshCw, Plus, Send, Globe, MapPin, FileQuestion, Copy, Zap, Eye,
} from 'lucide-react';
import AIOrb from './AIOrb';

type SeoType = 'city-service' | 'article' | 'faq';
type SeoStatus = 'draft' | 'published' | 'rejected';

interface SeoItem {
  _id: string;
  type: SeoType;
  slug: string;
  status: SeoStatus;
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  targetKeyword?: string;
  body: string;
  city?: string;
  service?: string;
  faqItems?: Array<{ question: string; answer: string }>;
  createdAt: string;
  publishedAt?: string;
}

const SECRET_KEY = 'dd_seo_admin_secret';

const SERVICES = [
  'agence web',
  'developpement web',
  'developpement application mobile',
  'developpement SaaS',
  'developpement CRM',
  'developpement ERP',
  'cloud devops',
];

const VILLES = [
  // Cote d'Azur
  'Nice', 'Cannes', 'Antibes', 'Monaco', 'Sophia Antipolis', 'Menton', 'Grasse',
  // Sud
  'Marseille', 'Aix-en-Provence', 'Toulon', 'Avignon', 'Montpellier', 'Perpignan', 'Nimes',
  // Grandes metropoles
  'Paris', 'Lyon', 'Toulouse', 'Bordeaux', 'Nantes', 'Strasbourg', 'Lille', 'Rennes',
  // Autres
  'Grenoble', 'Saint-Etienne', 'Tours', 'Angers', 'Le Mans', 'Reims', 'Le Havre',
  'Brest', 'Rouen', 'Dijon', 'Clermont-Ferrand', 'Metz', 'Nancy', 'Limoges',
  'Caen', 'Orleans', 'Mulhouse', 'Besancon', 'Annecy', 'Chambery',
];

const ARTICLE_KEYWORDS = [
  'comment choisir une agence web',
  'combien coute un site web sur mesure',
  'site vitrine ou SaaS pour une PME',
  'React Native vs Swift pour une application mobile',
  'CRM sur mesure ou off-the-shelf : quel choix',
  'Credit Impot Innovation : qui peut en beneficier',
  'differences entre site sur mesure et no-code',
  'combien de temps pour developper une application mobile',
];

const FAQ_THEMES = [
  'developpement web sur mesure',
  'application mobile iOS Android',
  'SaaS et logiciels metier',
  'Credit Impot Innovation',
];

type PageStat = { path: string; clicks: number; impressions: number; position: number; ctr: number; conversions: number };

export default function SeoAdmin({ embedded = false, sharedSecret }: { embedded?: boolean; sharedSecret?: string } = {}) {
  const [secret, setSecret] = useState<string | null>(() => sharedSecret || localStorage.getItem(SECRET_KEY));
  const [items, setItems] = useState<SeoItem[]>([]);
  const [pageStats, setPageStats] = useState<Record<string, PageStat>>({});
  const [gscStatus, setGscStatus] = useState<'ok' | 'unauthorized' | 'error' | null>(null);
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>(() => (localStorage.getItem('dd_seo_display_mode') as 'cards' | 'table') || 'cards');
  const [filterStatus, setFilterStatus] = useState<SeoStatus>('draft');
  const [filterType, setFilterType] = useState<SeoType | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<SeoItem | null>(null);
  const [view, setView] = useState<'list' | 'generate'>('list');
  const [error, setError] = useState<string | null>(null);

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
      params.set('status', filterStatus);
      params.set('limit', '2000');
      if (filterType !== 'all') params.set('type', filterType);
      const data = await api(`/api/admin/seo?${params}`);
      setItems(data.items || []);
      if (filterStatus === 'published') {
        try {
          const ps = await api(`/api/admin/seo-analytics/page-stats?range=30`);
          setPageStats(ps.stats || {});
          setGscStatus(ps.gscStatus || null);
        } catch { /* non-blocking */ }
      } else {
        setPageStats({});
        setGscStatus(null);
      }
    } catch (e: any) {
      setError(e.message || 'erreur de chargement');
      if (/unauthorized/i.test(e.message)) {
        localStorage.removeItem(SECRET_KEY);
        setSecret(null);
      }
    } finally {
      setLoading(false);
    }
  }, [secret, filterStatus, filterType, api]);

  useEffect(() => {
    if (view === 'list') load();
  }, [view, load]);

  const submitItem = async (id: string) => {
    try {
      await api(`/api/admin/seo/${id}/submit`, { method: 'POST' });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const bulkSubmitDrafts = async () => {
    if (filterStatus !== 'draft') return;
    if (items.length === 0) return;
    if (!confirm(`Publier les ${items.length} drafts visibles maintenant ?`)) return;
    try {
      const ids = items.map((i) => i._id);
      const r = await api('/api/admin/seo/bulk-submit', { method: 'POST', body: JSON.stringify({ ids }) });
      alert(`${r.published} pages publiees + IndexNow/Google pinged.`);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const pingAllPublished = async () => {
    try {
      const r = await api('/api/admin/seo/ping-all-published', { method: 'POST' });
      alert(`${r.count} URLs envoyees a IndexNow (Bing/Yandex) + Google sitemap pinged.`);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copyBatchForGSC = (count = 10) => {
    const urls = items
      .slice(0, count)
      .map((i) => `https://deliverydigital.fr${i.type === 'article' ? '/blog/' : '/services/'}${i.slug}`);
    navigator.clipboard.writeText(urls.join('\n'));
    alert(`${urls.length} URLs copiees !\n\nColle-les une par une dans GSC > Inspection de l'URL > Demander indexation (max 10/jour).`);
  };

  const rejectItem = async (id: string) => {
    try {
      await api(`/api/admin/seo/${id}/reject`, { method: 'POST' });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Supprimer definitivement cet item ?')) return;
    try {
      await api(`/api/admin/seo/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await api(`/api/admin/seo/${editing._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editing.title,
          metaTitle: editing.metaTitle,
          metaDescription: editing.metaDescription,
          body: editing.body,
          targetKeyword: editing.targetKeyword,
        }),
      });
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  /* ===== AUTH GATE ===== */
  if (!secret && !embedded) {
    return <SecretGate onAuth={(s) => { localStorage.setItem(SECRET_KEY, s); setSecret(s); }} />;
  }
  if (!secret) return null;

  const main = (
    <main className="flex-1 min-w-0 px-5 sm:px-8 pt-8 pb-20 max-w-[1100px]">
        {error && (
          <div className="mb-4 rounded-[14px] bg-[#FF3B30]/10 ring-1 ring-[#FF3B30]/20 px-4 py-3 text-[13px] text-[#FF3B30] flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><XIcon className="h-4 w-4" /></button>
          </div>
        )}

        {view === 'list' && (
          <ListView
            items={items}
            pageStats={pageStats}
            gscStatus={gscStatus}
            displayMode={displayMode}
            setDisplayMode={(m) => { setDisplayMode(m); localStorage.setItem('dd_seo_display_mode', m); }}
            loading={loading}
            filterStatus={filterStatus}
            filterType={filterType}
            setFilterType={setFilterType}
            onEdit={setEditing}
            onSubmit={submitItem}
            onReject={rejectItem}
            onDelete={deleteItem}
            onRefresh={load}
            onBulkSubmit={bulkSubmitDrafts}
            onPingAll={pingAllPublished}
            onCopyBatch={copyBatchForGSC}
          />
        )}

        {view === 'generate' && (
          <GenerateView
            api={api}
            onDone={() => { setView('list'); setFilterStatus('draft'); }}
            generating={generating}
            setGenerating={setGenerating}
          />
        )}
      </main>
  );

  const editModal = (
    <AnimatePresence>
      {editing && (
        <EditModal
          item={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
          onSubmit={async () => { await saveEdit(); await submitItem(editing._id); }}
        />
      )}
    </AnimatePresence>
  );

  if (embedded) {
    return (
      <>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => { setView('list'); setFilterStatus('draft'); }}
            className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium ${view === 'list' && filterStatus === 'draft' ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}
          >Drafts</button>
          <button
            onClick={() => { setView('list'); setFilterStatus('published'); }}
            className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium ${view === 'list' && filterStatus === 'published' ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}
          >Published</button>
          <button
            onClick={() => { setView('list'); setFilterStatus('rejected'); }}
            className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium ${view === 'list' && filterStatus === 'rejected' ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}
          >Rejected</button>
          <button
            onClick={() => setView('generate')}
            className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium ${view === 'generate' ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}
          >Generer</button>
        </div>
        {main}
        {editModal}
      </>
    );
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
          <div className="flex items-center gap-2.5 mb-4">
            <AIOrb size={28} innerColor="#FFFFFF" />
            <span
              className="text-[16px] text-[#1D1D1F]"
              style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
            >
              SEO Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          <NavBtn active={view === 'list' && filterStatus === 'draft'} icon={<FileText className="h-4 w-4" />} onClick={() => { setView('list'); setFilterStatus('draft'); }} label="Drafts" />
          <NavBtn active={view === 'list' && filterStatus === 'published'} icon={<Check className="h-4 w-4" />} onClick={() => { setView('list'); setFilterStatus('published'); }} label="Published" />
          <NavBtn active={view === 'list' && filterStatus === 'rejected'} icon={<XIcon className="h-4 w-4" />} onClick={() => { setView('list'); setFilterStatus('rejected'); }} label="Rejected" />
          <div className="h-px bg-black/5 my-3" />
          <NavBtn active={view === 'generate'} icon={<Sparkles className="h-4 w-4" />} onClick={() => setView('generate')} label="Generer" />
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
      <main className="flex-1 min-w-0 px-5 sm:px-8 pt-8 pb-20 max-w-[1100px]">
        {error && (
          <div className="mb-4 rounded-[14px] bg-[#FF3B30]/10 ring-1 ring-[#FF3B30]/20 px-4 py-3 text-[13px] text-[#FF3B30] flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><XIcon className="h-4 w-4" /></button>
          </div>
        )}

        {view === 'list' && (
          <ListView
            items={items}
            pageStats={pageStats}
            gscStatus={gscStatus}
            displayMode={displayMode}
            setDisplayMode={(m) => { setDisplayMode(m); localStorage.setItem('dd_seo_display_mode', m); }}
            loading={loading}
            filterStatus={filterStatus}
            filterType={filterType}
            setFilterType={setFilterType}
            onEdit={setEditing}
            onSubmit={submitItem}
            onReject={rejectItem}
            onDelete={deleteItem}
            onRefresh={load}
            onBulkSubmit={bulkSubmitDrafts}
            onPingAll={pingAllPublished}
            onCopyBatch={copyBatchForGSC}
          />
        )}

        {view === 'generate' && (
          <GenerateView
            api={api}
            onDone={() => { setView('list'); setFilterStatus('draft'); }}
            generating={generating}
            setGenerating={setGenerating}
          />
        )}
      </main>

      <AnimatePresence>
        {editing && (
          <EditModal
            item={editing}
            onChange={setEditing}
            onClose={() => setEditing(null)}
            onSave={saveEdit}
            onSubmit={async () => { await saveEdit(); await submitItem(editing._id); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============== AUTH GATE ============== */

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
            SEO Admin
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
            className="w-full px-4 py-3 rounded-[12px] bg-[#F5F5F7] ring-1 ring-transparent focus:ring-[#1D1D1F] outline-none text-[15px] text-[#1D1D1F]"
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

/* ============== NAV BUTTON ============== */

function NavBtn({ active, icon, onClick, label }: { active: boolean; icon: React.ReactNode; onClick: () => void; label: string }) {
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

/* ============== LIST VIEW ============== */

function ListView({
  items, pageStats, gscStatus, displayMode, setDisplayMode, loading, filterStatus, filterType, setFilterType,
  onEdit, onSubmit, onReject, onDelete, onRefresh,
  onBulkSubmit, onPingAll, onCopyBatch,
}: {
  items: SeoItem[];
  pageStats: Record<string, PageStat>;
  gscStatus: 'ok' | 'unauthorized' | 'error' | null;
  displayMode: 'cards' | 'table';
  setDisplayMode: (m: 'cards' | 'table') => void;
  loading: boolean;
  filterStatus: SeoStatus;
  filterType: SeoType | 'all';
  setFilterType: (t: SeoType | 'all') => void;
  onEdit: (item: SeoItem) => void;
  onSubmit: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onBulkSubmit: () => void;
  onPingAll: () => void;
  onCopyBatch: (count?: number) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[28px] sm:text-[34px] text-[#1D1D1F]"
          style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
        >
          {filterStatus === 'draft' ? 'A reviewer' : filterStatus === 'published' ? 'Publie' : 'Rejete'}
          <span className="text-[#86868B] ml-2">{items.length}</span>
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {filterStatus === 'draft' && items.length > 0 && (
            <button
              onClick={onBulkSubmit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#34C759] text-white text-[12.5px] font-semibold hover:bg-[#28A745]"
            >
              <Send className="h-3.5 w-3.5" />
              Publier les {items.length}
            </button>
          )}
          {filterStatus === 'published' && items.length > 0 && (
            <>
              <button
                onClick={() => onCopyBatch(10)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1D1D1F] text-white text-[12.5px] font-semibold hover:bg-[#3C3C43]"
                title="Copie 10 URLs pour Google Search Console (Inspection URL > Demander indexation)"
              >
                <Copy className="h-3.5 w-3.5" />
                Copier 10 URLs (GSC)
              </button>
              <button
                onClick={onPingAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED]"
                title="Ping IndexNow (Bing/Yandex) + Google sitemap"
              >
                <Zap className="h-3.5 w-3.5" />
                Pinger Bing+Google
              </button>
            </>
          )}
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 ring-black/8 bg-white text-[12.5px] text-[#1D1D1F] hover:bg-[#F5F5F7]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {(['all', 'city-service', 'article', 'faq'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-colors ${
              filterType === t
                ? 'bg-[#1D1D1F] text-white'
                : 'bg-white ring-1 ring-black/8 text-[#1D1D1F] hover:ring-black/20'
            }`}
          >
            {t === 'city-service' && <MapPin className="h-3 w-3" />}
            {t === 'article' && <FileText className="h-3 w-3" />}
            {t === 'faq' && <FileQuestion className="h-3 w-3" />}
            {t === 'all' ? 'Tous' : t === 'city-service' ? 'Ville x service' : t === 'article' ? 'Articles' : 'FAQ'}
          </button>
        ))}
      </div>

      {filterStatus === 'published' && gscStatus && gscStatus !== 'ok' && (
        <div className="mb-4 rounded-[14px] bg-[#FFF8E1] border border-[#F5D78E] p-3 text-[12.5px] text-[#7A4F00]">
          ⚠ <strong>Google Search Console non connecté</strong> — clics &amp; impressions par page indisponibles. Connecte Google dans l'onglet <em>Dashboard</em>.
        </div>
      )}

      {filterStatus === 'published' && items.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[12px] text-[#86868B] mr-1">Affichage :</span>
          <button
            onClick={() => setDisplayMode('cards')}
            className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-colors ${displayMode === 'cards' ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F] hover:ring-black/20'}`}
          >Cartes</button>
          <button
            onClick={() => setDisplayMode('table')}
            className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-colors ${displayMode === 'table' ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F] hover:ring-black/20'}`}
          >Tableau triable ({items.length})</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#86868B] text-[14px]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-10 text-center">
          <p className="text-[#86868B] text-[14px]">Rien a afficher pour ce filtre.</p>
        </div>
      ) : filterStatus === 'published' && displayMode === 'table' ? (
        <PublishedTable items={items} pageStats={pageStats} onEdit={onEdit} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemCard
              key={item._id}
              item={item}
              stats={filterStatus === 'published' ? pageStats[item.slug] : undefined}
              onEdit={onEdit}
              onSubmit={onSubmit}
              onReject={onReject}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ============== PUBLISHED TABLE (sortable) ============== */
type SortKey = 'title' | 'clicks' | 'impressions' | 'position' | 'ctr' | 'conversions';
type SortDir = 'asc' | 'desc';

function PublishedTable({ items, pageStats, onEdit }: {
  items: SeoItem[];
  pageStats: Record<string, PageStat>;
  onEdit: (item: SeoItem) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('clicks');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

  const rows = items
    .map((it) => ({ item: it, stats: pageStats[it.slug] || { path: '', clicks: 0, impressions: 0, position: 0, ctr: 0, conversions: 0 } }))
    .filter((r) => !search.trim() || r.item.title.toLowerCase().includes(search.toLowerCase()) || r.item.slug.toLowerCase().includes(search.toLowerCase()));

  rows.sort((a, b) => {
    let av: number | string = 0; let bv: number | string = 0;
    if (sortKey === 'title') { av = a.item.title.toLowerCase(); bv = b.item.title.toLowerCase(); }
    else if (sortKey === 'position') {
      av = a.stats.position > 0 ? a.stats.position : 999;
      bv = b.stats.position > 0 ? b.stats.position : 999;
    } else {
      av = (a.stats as any)[sortKey] || 0;
      bv = (b.stats as any)[sortKey] || 0;
    }
    if (av === bv) return 0;
    const cmp = av > bv ? 1 : -1;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const setSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir(k === 'position' || k === 'title' ? 'asc' : 'desc'); }
  };

  const arrow = (k: SortKey) => sortKey !== k ? '' : sortDir === 'asc' ? ' ↑' : ' ↓';
  const totalClicks = rows.reduce((s, r) => s + r.stats.clicks, 0);
  const totalImp = rows.reduce((s, r) => s + r.stats.impressions, 0);
  const totalConv = rows.reduce((s, r) => s + r.stats.conversions, 0);

  return (
    <div className="bg-white rounded-[18px] ring-1 ring-black/5 overflow-hidden">
      <div className="p-3 border-b border-black/5 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher titre / slug..."
          className="px-3 py-1.5 rounded-full bg-[#F5F5F7] text-[12.5px] outline-none focus:ring-1 focus:ring-[#1D1D1F] flex-1 min-w-[200px]"
        />
        <span className="text-[12px] text-[#86868B]">
          {rows.length} pages · {totalClicks} clics · {totalImp} imp. · {totalConv} conv.
        </span>
      </div>
      {totalImp > 0 && totalClicks === 0 && (
        <div className="px-3 py-2 text-[11.5px] text-[#7A4F00] bg-[#FFF8E1] border-b border-[#F5D78E]">
          ℹ Les pages city-service commencent à apparaître dans Google ({totalImp} impressions) mais n'ont pas encore généré de clics. Trie par <strong>Imp.</strong> pour voir celles qui se positionnent.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-[#FAFAFC] text-[#86868B]">
            <tr>
              <th onClick={() => setSort('title')} className="text-left p-3 font-semibold cursor-pointer hover:text-[#1D1D1F]">Page{arrow('title')}</th>
              <th onClick={() => setSort('clicks')} className="text-right p-3 font-semibold cursor-pointer hover:text-[#1D1D1F] whitespace-nowrap">Clics{arrow('clicks')}</th>
              <th onClick={() => setSort('impressions')} className="text-right p-3 font-semibold cursor-pointer hover:text-[#1D1D1F] whitespace-nowrap">Imp.{arrow('impressions')}</th>
              <th onClick={() => setSort('ctr')} className="text-right p-3 font-semibold cursor-pointer hover:text-[#1D1D1F] whitespace-nowrap">CTR{arrow('ctr')}</th>
              <th onClick={() => setSort('position')} className="text-right p-3 font-semibold cursor-pointer hover:text-[#1D1D1F] whitespace-nowrap">Pos.{arrow('position')}</th>
              <th onClick={() => setSort('conversions')} className="text-right p-3 font-semibold cursor-pointer hover:text-[#1D1D1F] whitespace-nowrap">Conv.{arrow('conversions')}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((r) => (
              <tr key={r.item._id} className="hover:bg-[#FAFAFC]">
                <td className="p-3 max-w-[420px]">
                  <div className="font-semibold text-[#1D1D1F] truncate">{r.item.title}</div>
                  <div className="text-[11px] text-[#86868B] font-mono truncate">{r.stats.path || `/services/${r.item.slug}`}</div>
                </td>
                <td className="p-3 text-right tabular-nums font-semibold" style={{ color: r.stats.clicks > 0 ? '#1D1D1F' : '#C7C7CC' }}>{r.stats.clicks}</td>
                <td className="p-3 text-right tabular-nums" style={{ color: r.stats.impressions > 0 ? '#1D1D1F' : '#C7C7CC' }}>{r.stats.impressions}</td>
                <td className="p-3 text-right tabular-nums" style={{ color: r.stats.ctr > 0 ? '#1D1D1F' : '#C7C7CC' }}>{r.stats.ctr > 0 ? `${(r.stats.ctr * 100).toFixed(1)}%` : '—'}</td>
                <td className="p-3 text-right tabular-nums" style={{ color: r.stats.position > 0 ? '#1D1D1F' : '#C7C7CC' }}>{r.stats.position > 0 ? `#${r.stats.position.toFixed(1)}` : '—'}</td>
                <td className="p-3 text-right tabular-nums font-semibold" style={{ color: r.stats.conversions > 0 ? '#1F7A4D' : '#C7C7CC' }}>{r.stats.conversions}</td>
                <td className="p-3 whitespace-nowrap">
                  <button onClick={() => onEdit(r.item)} title="Editer" className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white ring-1 ring-black/8 text-[11px] text-[#1D1D1F] hover:ring-black/20">
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <a
                    href={r.item.type === 'article' ? `/blog/${r.item.slug}` : `/services/${r.item.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Voir la page"
                    className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white ring-1 ring-black/8 text-[11px] text-[#1D1D1F] hover:ring-black/20"
                  >
                    <Eye className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemCard({
  item, stats, onEdit, onSubmit, onReject, onDelete,
}: {
  item: SeoItem;
  stats?: PageStat;
  onEdit: (item: SeoItem) => void;
  onSubmit: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const typeLabel = item.type === 'city-service' ? 'Ville x service' : item.type === 'article' ? 'Article' : 'FAQ';
  const typeIcon = item.type === 'city-service' ? <MapPin className="h-3 w-3" /> : item.type === 'article' ? <FileText className="h-3 w-3" /> : <FileQuestion className="h-3 w-3" />;

  return (
    <div
      className="bg-white rounded-[18px] ring-1 ring-black/5 p-5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start gap-3 mb-3 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2EFE9] text-[10.5px] font-semibold text-[#1D1D1F]">
          {typeIcon}
          {typeLabel}
        </span>
        {item.targetKeyword && (
          <span className="text-[11.5px] text-[#86868B] truncate">cible : <strong className="text-[#1D1D1F]">{item.targetKeyword}</strong></span>
        )}
        {stats && (
          <span className="ml-auto inline-flex items-center gap-2 text-[11px] text-[#1D1D1F]">
            <span title="Clics GSC 30j" className="px-2 py-0.5 rounded-full bg-[#E8F5FB] font-semibold">{stats.clicks}<span className="ml-1 font-normal text-[#86868B]">clics</span></span>
            <span title="Impressions GSC 30j" className="px-2 py-0.5 rounded-full bg-[#F2EFE9] font-semibold">{stats.impressions}<span className="ml-1 font-normal text-[#86868B]">imp.</span></span>
            <span title="Position moyenne" className="px-2 py-0.5 rounded-full bg-[#F2EFE9] font-semibold">{stats.position > 0 ? `#${stats.position.toFixed(1)}` : '—'}<span className="ml-1 font-normal text-[#86868B]">pos.</span></span>
            <span title="Conversions 30j" className="px-2 py-0.5 rounded-full bg-[#E7F8EE] font-semibold text-[#1F7A4D]">{stats.conversions}<span className="ml-1 font-normal text-[#1F7A4D]/70">conv.</span></span>
          </span>
        )}
      </div>

      <h3
        className="text-[18px] text-[#1D1D1F] leading-tight mb-1"
        style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
      >
        {item.title}
      </h3>
      <p className="text-[12.5px] text-[#86868B] mb-2">/{item.slug}</p>
      {item.metaDescription && (
        <p className="text-[13px] text-[#1D1D1F]/75 mb-3 leading-relaxed">{item.metaDescription}</p>
      )}

      <details className="mb-3">
        <summary className="text-[12px] text-[#86868B] cursor-pointer hover:text-[#1D1D1F] inline-flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          Voir le contenu
        </summary>
        <pre className="mt-2 text-[12px] text-[#1D1D1F]/80 bg-[#F5F5F7] rounded-[10px] p-3 max-h-[300px] overflow-auto whitespace-pre-wrap font-mono">{item.body}</pre>
      </details>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onEdit(item)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white ring-1 ring-black/8 text-[12.5px] text-[#1D1D1F] hover:ring-black/20"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Editer
        </button>
        <button
          onClick={() => {
            const path = item.type === 'article' ? `/blog/${item.slug}` : `/services/${item.slug}`;
            const url = item.status === 'published' ? path : `${path}?preview=${item._id}`;
            window.open(url, '_blank', 'noopener');
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white ring-1 ring-black/8 text-[12.5px] text-[#1D1D1F] hover:ring-black/20"
          title="Voir la page comme un visiteur"
        >
          <Eye className="h-3.5 w-3.5" />
          Voir comme client
        </button>
        {item.status === 'draft' && (
          <>
            <button
              onClick={() => onSubmit(item._id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1D1D1F] text-white text-[12.5px] font-semibold hover:bg-[#3C3C43]"
            >
              <Send className="h-3.5 w-3.5" />
              Submit
            </button>
            <button
              onClick={() => onReject(item._id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white ring-1 ring-black/8 text-[12.5px] text-[#86868B] hover:text-[#FF3B30]"
            >
              <XIcon className="h-3.5 w-3.5" />
              Rejeter
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(item._id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] text-[#86868B] hover:text-[#FF3B30] ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ============== GENERATE VIEW ============== */

function GenerateView({
  api, onDone, generating, setGenerating,
}: {
  api: (url: string, options?: RequestInit) => Promise<any>;
  onDone: () => void;
  generating: boolean;
  setGenerating: (b: boolean) => void;
}) {
  const [type, setType] = useState<SeoType>('city-service');
  const [selectedServices, setSelectedServices] = useState<string[]>(['agence web', 'developpement application mobile']);
  const [selectedVilles, setSelectedVilles] = useState<string[]>(['Nice', 'Cannes', 'Marseille']);
  const [articleKeywords, setArticleKeywords] = useState<string[]>([ARTICLE_KEYWORDS[0]]);
  const [faqThemes, setFaqThemes] = useState<string[]>([FAQ_THEMES[0]]);
  const [result, setResult] = useState<any>(null);

  const toggle = <T extends string>(arr: T[], setter: (v: T[]) => void, val: T) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      let jobs: any[] = [];
      if (type === 'city-service') {
        jobs = selectedServices.flatMap((s) => selectedVilles.map((c) => ({ service: s, city: c })));
      } else if (type === 'article') {
        jobs = articleKeywords.map((kw) => ({ keyword: kw }));
      } else {
        jobs = faqThemes.map((theme) => ({ theme }));
      }

      if (jobs.length === 0) {
        alert('Selectionnez au moins un job.');
        setGenerating(false);
        return;
      }

      const data = await api('/api/admin/seo/generate', {
        method: 'POST',
        body: JSON.stringify({ type, jobs }),
      });
      setResult(data);
    } catch (e: any) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const totalJobs = type === 'city-service'
    ? selectedServices.length * selectedVilles.length
    : type === 'article'
      ? articleKeywords.length
      : faqThemes.length;

  return (
    <>
      <h1
        className="text-[28px] sm:text-[34px] text-[#1D1D1F] mb-6"
        style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
      >
        Generer du contenu
      </h1>

      <div className="bg-white rounded-[22px] ring-1 ring-black/5 p-5 sm:p-7 mb-5" style={{ boxShadow: '0 12px 30px -16px rgba(0,0,0,0.10)' }}>
        <label className="block text-[12px] font-semibold text-[#1D1D1F] uppercase tracking-wider mb-2">Type</label>
        <div className="flex flex-wrap gap-2 mb-6">
          {(['city-service', 'article', 'faq'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium ${
                type === t ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#EDEDED]'
              }`}
            >
              {t === 'city-service' && <MapPin className="h-3 w-3" />}
              {t === 'article' && <FileText className="h-3 w-3" />}
              {t === 'faq' && <FileQuestion className="h-3 w-3" />}
              {t === 'city-service' ? 'Ville x service' : t === 'article' ? 'Articles blog' : 'FAQ'}
            </button>
          ))}
        </div>

        {type === 'city-service' && (
          <>
            <Section title="Services">
              <ChipGroup options={SERVICES} selected={selectedServices} onToggle={(v) => toggle(selectedServices, setSelectedServices, v)} onSelectAll={setSelectedServices} />
            </Section>
            <Section title="Villes">
              <ChipGroup options={VILLES} selected={selectedVilles} onToggle={(v) => toggle(selectedVilles, setSelectedVilles, v)} onSelectAll={setSelectedVilles} />
            </Section>
          </>
        )}

        {type === 'article' && (
          <Section title="Mots-cles">
            <ChipGroup options={ARTICLE_KEYWORDS} selected={articleKeywords} onToggle={(v) => toggle(articleKeywords, setArticleKeywords, v)} onSelectAll={setArticleKeywords} />
          </Section>
        )}

        {type === 'faq' && (
          <Section title="Thematiques">
            <ChipGroup options={FAQ_THEMES} selected={faqThemes} onToggle={(v) => toggle(faqThemes, setFaqThemes, v)} onSelectAll={setFaqThemes} />
          </Section>
        )}

        <div className="flex items-center justify-between mt-7 pt-5 border-t border-black/5">
          <span className="text-[13px] text-[#86868B]">
            <strong className="text-[#1D1D1F]">{totalJobs}</strong> item{totalJobs > 1 ? 's' : ''} a generer
          </span>
          <button
            onClick={generate}
            disabled={generating || totalJobs === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1F] text-white text-[13.5px] font-semibold hover:bg-[#3C3C43] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generation en cours ({totalJobs})...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generer
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-5">
          <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">Resultats</h3>
          <ul className="space-y-1.5 text-[12.5px]">
            {result.generated.map((r: any, i: number) => (
              <li key={i} className={`flex items-center gap-2 ${r.ok ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                {r.ok ? <Check className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
                <span className="text-[#1D1D1F]">{r.ok ? r.title : `${JSON.stringify(r.job)} - ${r.error}`}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={onDone}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[12.5px] font-semibold"
          >
            Voir les drafts
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="block text-[12px] font-semibold text-[#1D1D1F] uppercase tracking-wider mb-2">{title}</label>
      {children}
    </div>
  );
}

function ChipGroup({ options, selected, onToggle, onSelectAll }: { options: string[]; selected: string[]; onToggle: (v: string) => void; onSelectAll?: (vals: string[]) => void }) {
  const allSelected = options.every((o) => selected.includes(o));
  return (
    <div>
      {onSelectAll && (
        <button
          onClick={() => onSelectAll(allSelected ? [] : options)}
          className="text-[11.5px] text-[#0066CC] font-semibold mb-2 hover:underline"
        >
          {allSelected ? 'Tout decocher' : `Tout selectionner (${options.length})`}
        </button>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              onClick={() => onToggle(o)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                on
                  ? 'bg-[#1D1D1F] text-white'
                  : 'bg-white ring-1 ring-black/8 text-[#1D1D1F] hover:ring-black/20'
              }`}
            >
              {on && <Check className="h-3 w-3" />}
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============== EDIT MODAL ============== */

function EditModal({
  item, onChange, onClose, onSave, onSubmit,
}: {
  item: SeoItem;
  onChange: (i: SeoItem) => void;
  onClose: () => void;
  onSave: () => void;
  onSubmit: () => void;
}) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="fixed inset-x-4 top-8 bottom-8 sm:inset-x-auto sm:right-8 sm:left-auto sm:w-[640px] z-50 bg-white rounded-[22px] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('edit')}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium ${tab === 'edit' ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}
            >Editer</button>
            <button
              onClick={() => setTab('preview')}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium ${tab === 'preview' ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}
            >Previsualisation client</button>
          </div>
          <h3
            className="text-[16px] text-[#1D1D1F] truncate hidden md:block"
            style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}
          >
            Editer
          </h3>
          <button onClick={onClose} className="text-[#86868B] hover:text-[#1D1D1F]">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {tab === 'edit' ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <Field label="Titre">
              <input
                value={item.title}
                onChange={(e) => onChange({ ...item, title: e.target.value })}
                className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px]"
              />
            </Field>
            <Field label="Meta title (max 60)">
              <input
                value={item.metaTitle || ''}
                onChange={(e) => onChange({ ...item, metaTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px]"
              />
            </Field>
            <Field label="Meta description (max 155)">
              <textarea
                value={item.metaDescription || ''}
                onChange={(e) => onChange({ ...item, metaDescription: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px] resize-none"
              />
            </Field>
            <Field label="Mot-cle cible">
              <input
                value={item.targetKeyword || ''}
                onChange={(e) => onChange({ ...item, targetKeyword: e.target.value })}
                className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[14px]"
              />
            </Field>
            <Field label="Body (markdown)">
              <textarea
                value={item.body}
                onChange={(e) => onChange({ ...item, body: e.target.value })}
                rows={20}
                className="w-full px-3 py-2 rounded-[10px] bg-[#F5F5F7] outline-none text-[12.5px] font-mono resize-none"
              />
            </Field>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-white">
            <article className="max-w-[680px] mx-auto px-5 sm:px-8 pt-8 pb-12">
              {item.metaDescription && (
                <p className="text-[12px] text-[#86868B] italic mb-3">SERP : {item.metaDescription}</p>
              )}
              <PreviewMarkdown body={item.body} />
              <div className="mt-10 pt-8 border-t border-black/8 text-center">
                <p className="text-[14px] text-[#86868B] mb-4">Discutons de votre projet en 5 minutes</p>
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1F] text-white text-[13px] font-semibold">
                  Demarrer la conversation
                </span>
              </div>
            </article>
          </div>
        )}

        <div className="px-5 py-4 border-t border-black/5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-white ring-1 ring-black/8 text-[13px] text-[#1D1D1F]"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 rounded-full bg-white ring-1 ring-black/8 text-[13px] text-[#1D1D1F] hover:ring-black/20"
          >
            Enregistrer
          </button>
          {item.status === 'draft' && (
            <button
              onClick={onSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[13px] font-semibold"
            >
              <Send className="h-3.5 w-3.5" />
              Enregistrer + Submit
            </button>
          )}
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

/* ============== Markdown preview (rendu client) ============== */

function PreviewMarkdown({ body }: { body: string }) {
  const lines = body.split('\n');
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let key = 0;

  const flushList = () => {
    if (!listBuf.length) return;
    out.push(
      <ul key={key++} className="list-disc pl-6 my-3 space-y-1.5 text-[16px] text-[#1D1D1F]/85">
        {listBuf.map((li, i) => <li key={i}>{renderInlineMd(li)}</li>)}
      </ul>
    );
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) { flushList(); continue; }
    if (line.startsWith('# ')) {
      flushList();
      out.push(
        <h1 key={key++} className="text-[34px] sm:text-[44px] text-[#1D1D1F] leading-[1.1] mt-2 mb-5"
          style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}>
          {renderInlineMd(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      out.push(
        <h2 key={key++} className="text-[22px] sm:text-[28px] text-[#1D1D1F] leading-tight mt-8 mb-3"
          style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}>
          {renderInlineMd(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      out.push(<h3 key={key++} className="text-[18px] font-semibold text-[#1D1D1F] mt-5 mb-2">{renderInlineMd(line.slice(4))}</h3>);
    } else if (/^[-*]\s+/.test(line)) {
      listBuf.push(line.replace(/^[-*]\s+/, ''));
    } else if (/^\d+\.\s+/.test(line)) {
      listBuf.push(line.replace(/^\d+\.\s+/, ''));
    } else {
      flushList();
      out.push(<p key={key++} className="text-[16px] text-[#1D1D1F]/85 leading-relaxed my-3">{renderInlineMd(line)}</p>);
    }
  }
  flushList();
  return <>{out}</>;
}

function renderInlineMd(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let i = 0, buf = '', key = 0;
  const flushBuf = () => { if (buf) { parts.push(buf); buf = ''; } };

  while (i < text.length) {
    if (text.slice(i, i + 2) === '**') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flushBuf();
        parts.push(<strong key={key++} className="font-semibold text-[#1D1D1F]">{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    const m = text.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (m) {
      flushBuf();
      parts.push(
        <a key={key++} href={m[2]} className="text-[#0066CC] hover:underline"
          target={m[2].startsWith('http') ? '_blank' : undefined}
          rel={m[2].startsWith('http') ? 'noopener noreferrer' : undefined}>
          {m[1]}
        </a>
      );
      i += m[0].length;
      continue;
    }
    buf += text[i++];
  }
  flushBuf();
  return <>{parts}</>;
}
