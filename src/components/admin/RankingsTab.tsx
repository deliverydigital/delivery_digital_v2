/**
 * Tracker de positions SERP - tableau dynamique.
 * Affiche pour chaque keyword : notre position, top 3 concurrents, historique.
 * Bouton refresh live par keyword + batch.
 *
 * @author Rabah Ziane - 2026-05-17
 */
import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Trash2, Sparkles, ExternalLink, AlertCircle } from 'lucide-react';

type SerpResult = { position: number; domain: string; url: string; title: string; snippet: string; isUs: boolean };
type HistoryPoint = { date: string; ourPosition: number | null };
type Ranking = {
  _id: string;
  keyword: string;
  market: string;
  ourPosition: number | null;
  bestPosition: number | null;
  worstPosition: number | null;
  lastChecked: string | null;
  top10: SerpResult[];
  history: HistoryPoint[];
  source: string;
};

const MARKETS: Record<string, string> = {
  fr: '🇫🇷 France', sa: '🇸🇦 Arabie Saoudite', qa: '🇶🇦 Qatar', ae: '🇦🇪 UAE',
  kw: '🇰🇼 Koweït', om: '🇴🇲 Oman', bh: '🇧🇭 Bahreïn', mc: '🇲🇨 Monaco',
  uk: '🇬🇧 UK', us: '🇺🇸 US',
};

function posClass(p: number | null) {
  if (p === null) return { bg: '#F5F5F7', color: '#86868B', label: 'Hors top 10' };
  if (p <= 3) return { bg: '#E7F8EE', color: '#1F7A4D', label: `#${p}` };
  if (p <= 10) return { bg: '#E8F5FB', color: '#1F5865', label: `#${p}` };
  return { bg: '#FFF4E0', color: '#B26A00', label: `#${p}` };
}

export default function RankingsTab({ secret }: { secret: string }) {
  const [items, setItems] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [batchRefreshing, setBatchRefreshing] = useState(false);
  const [newKw, setNewKw] = useState('');
  const [newMarket, setNewMarket] = useState('fr');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [packs, setPacks] = useState<any[]>([]);
  const [showPacks, setShowPacks] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/rankings', { headers: { 'x-admin-secret': secret } });
      const j = await r.json();
      setItems(j.items || []);
      setConfigured(j.configured);
      setProvider(j.provider);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (secret) load(); }, [secret]);
  useEffect(() => {
    if (!secret) return;
    fetch('/api/admin/rankings/packs', { headers: { 'x-admin-secret': secret } }).then((r) => r.json()).then((d) => setPacks(d.packs || [])).catch(() => {});
  }, [secret]);

  const importPack = async (packId: string) => {
    if (!confirm('Importer ce pack de mots-clés ?')) return;
    const r = await fetch('/api/admin/rankings/import-pack', { method: 'POST', headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' }, body: JSON.stringify({ packId }) });
    const j = await r.json();
    alert((j.created || 0) + ' nouveaux keywords importés (' + (j.skipped || 0) + ' déjà existants).');
    load();
  };

  const addKw = async () => {
    if (!newKw.trim()) return;
    await fetch('/api/admin/rankings', { method: 'POST', headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword: newKw, market: newMarket }) });
    setNewKw('');
    load();
  };

  const seedGsc = async () => {
    if (!confirm('Importer les mots-clés détectés par Google Search Console ?')) return;
    const r = await fetch('/api/admin/rankings/seed-gsc', { method: 'POST', headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' }, body: JSON.stringify({ market: 'fr' }) });
    const j = await r.json();
    alert(`${j.created || 0} nouveaux mots-clés importés (${j.skipped || 0} déjà existants).`);
    load();
  };

  const refresh = async (id: string) => {
    setRefreshing(id);
    try {
      await fetch(`/api/admin/rankings/${id}/refresh`, { method: 'POST', headers: { 'x-admin-secret': secret } });
      await load();
    } finally { setRefreshing(null); }
  };

  const refreshAll = async () => {
    if (!confirm(`Refresh live de ${items.length} mots-clés ? Consomme du quota SERP.`)) return;
    setBatchRefreshing(true);
    try {
      const r = await fetch('/api/admin/rankings/refresh-all', { method: 'POST', headers: { 'x-admin-secret': secret } });
      const j = await r.json();
      alert(`${j.refreshed || 0} keywords refresh, ${j.errors || 0} erreurs.`);
      await load();
    } finally { setBatchRefreshing(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Retirer ce keyword du tracking ?')) return;
    await fetch(`/api/admin/rankings/${id}`, { method: 'DELETE', headers: { 'x-admin-secret': secret } });
    load();
  };

  return (
    <div style={{ background: 'var(--bg-soft, #FBFBFD)', minHeight: '100vh' }} className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-end flex-wrap gap-4">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.22em] font-bold mb-1.5 text-[#1F5865]">SEO · Positions SERP</p>
            <h1 className="text-[32px] sm:text-[40px] text-[#1D1D1F] leading-[1.05]" style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}>
              Tracker de mots-clés
            </h1>
            <p className="text-[14px] text-[#86868B] mt-1.5">Position live sur Google + concurrents. Données vérifiables, mises à jour à la demande.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={seedGsc} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white ring-1 ring-black/8 text-[#1D1D1F] text-[12.5px] font-semibold hover:ring-black/20">
              <Sparkles className="h-3.5 w-3.5" />
              Importer depuis GSC
            </button>
            <button onClick={refreshAll} disabled={batchRefreshing || !configured} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1D1D1F] text-white text-[12.5px] font-semibold hover:bg-[#3C3C43] disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${batchRefreshing ? 'animate-spin' : ''}`} />
              Refresh tout
            </button>
          </div>
        </div>

        {!configured && (
          <div className="rounded-2xl p-4 mb-5 bg-[#FFF8E1] border border-[#F5D78E] text-[13px] text-[#7A4F00] flex gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <strong>Aucun provider SERP configuré.</strong>
              <p className="mt-1.5">Pour activer le tracking gratuit (100 requêtes/jour Google Custom Search) :</p>
              <ol className="mt-1.5 list-decimal pl-5 space-y-0.5 text-[12.5px]">
                <li>Crée un Programmable Search Engine sur <a className="underline" href="https://programmablesearchengine.google.com/" target="_blank" rel="noreferrer">programmablesearchengine.google.com</a> → "Rechercher l'intégralité du Web"</li>
                <li>Récupère l'<strong>ID du moteur (cx)</strong></li>
                <li>Active "Custom Search API" sur GCP et crée une clé API</li>
                <li>Ajoute dans <code>.env</code> : <code>GOOGLE_CSE_API_KEY=...</code> et <code>GOOGLE_CSE_ID=...</code></li>
                <li>Redémarre l'API : <code>pm2 restart deliverydigital-main-web-apis</code></li>
              </ol>
              <p className="mt-1.5 text-[12px]">Alternative payante (résultats plus fiables) : <a className="underline" href="https://serper.dev" target="_blank" rel="noreferrer">Serper.dev</a> → <code>SERPER_API_KEY</code> dans .env.</p>
            </div>
          </div>
        )}

        {configured && (
          <p className="text-[12px] text-[#86868B] mb-4">Provider actif : <strong>{provider}</strong>{provider === 'google-cse' && ' (limite 100 queries/jour)'}</p>
        )}

        {/* Add new keyword */}
        <div className="rounded-2xl p-4 mb-5 bg-white ring-1 ring-black/5 flex gap-2 flex-wrap items-center">
          <input
            type="text"
            value={newKw}
            onChange={(e) => setNewKw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKw()}
            placeholder="Ajouter un mot-clé à tracker (ex: agence web nice)"
            className="flex-1 min-w-[200px] px-4 py-2 rounded-full bg-[#F5F5F7] text-[13px] outline-none focus:ring-1 focus:ring-[#1D1D1F]"
          />
          <select value={newMarket} onChange={(e) => setNewMarket(e.target.value)} className="px-3 py-2 rounded-full bg-[#F5F5F7] text-[13px] outline-none cursor-pointer">
            {Object.entries(MARKETS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <button onClick={addKw} className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[13px] font-semibold hover:bg-[#3C3C43]">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>

                {loading && <p className="text-[#86868B] text-[13px]">Chargement...</p>}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl p-10 bg-white ring-1 ring-black/5 text-center">
            <p className="text-[#86868B] text-[14px]">Aucun keyword tracké. Ajoute un mot-clé ou importe depuis GSC.</p>
          </div>
        )}

        {items.length > 0 && (
          <div className="bg-white rounded-2xl ring-1 ring-black/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="bg-[#FAFAFC] text-[#86868B]">
                  <tr>
                    <th className="text-left p-3 font-semibold">Mot-clé</th>
                    <th className="text-left p-3 font-semibold">Marché</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Notre position</th>
                    <th className="text-center p-3 font-semibold whitespace-nowrap">Meilleure</th>
                    <th className="text-left p-3 font-semibold">Top 3 concurrents</th>
                    <th className="text-left p-3 font-semibold whitespace-nowrap">Dernier check</th>
                    <th className="text-right p-3 font-semibold whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {items.map((it) => {
                    const pos = posClass(it.ourPosition);
                    const top3 = (it.top10 || []).slice(0, 3);
                    const expanded = expandedId === it._id;
                    return (
                      <>
                        <tr key={it._id} className="hover:bg-[#FAFAFC] cursor-pointer" onClick={() => setExpandedId(expanded ? null : it._id)}>
                          <td className="p-3 font-semibold text-[#1D1D1F]">{it.keyword}</td>
                          <td className="p-3 text-[#86868B] whitespace-nowrap">{MARKETS[it.market] || it.market}</td>
                          <td className="p-3 text-center">
                            <span className="inline-block px-2.5 py-1 rounded-full font-bold" style={{ background: pos.bg, color: pos.color }}>
                              {pos.label}
                            </span>
                          </td>
                          <td className="p-3 text-center text-[#86868B]">
                            {it.bestPosition !== null && it.bestPosition !== undefined ? `#${it.bestPosition}` : '—'}
                          </td>
                          <td className="p-3 max-w-[260px]">
                            <div className="flex flex-col gap-0.5">
                              {top3.length === 0 ? <span className="text-[#C7C7CC]">—</span> : top3.map((r) => (
                                <span key={r.position} className={`text-[11.5px] truncate ${r.isUs ? 'font-bold text-[#1F7A4D]' : 'text-[#86868B]'}`}>
                                  #{r.position} {r.domain}{r.isUs ? ' (nous)' : ''}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-[#86868B] whitespace-nowrap text-[11.5px]">
                            {it.lastChecked ? new Date(it.lastChecked).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Jamais'}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <button onClick={(e) => { e.stopPropagation(); refresh(it._id); }} disabled={refreshing === it._id || !configured} className="inline-flex items-center px-2.5 py-1 rounded-full bg-white ring-1 ring-black/8 text-[#1D1D1F] text-[11px] font-semibold hover:ring-black/20 disabled:opacity-50">
                              <RefreshCw className={`h-3 w-3 ${refreshing === it._id ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); remove(it._id); }} className="ml-1 inline-flex items-center px-2.5 py-1 rounded-full bg-white ring-1 ring-black/8 text-[#FF3B30] text-[11px] font-semibold hover:ring-[#FF3B30]/30">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr key={it._id + '-x'}>
                            <td colSpan={7} className="p-4 bg-[#FAFAFC]">
                              <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[#86868B] mb-2">Top 10 Google · {MARKETS[it.market]}</p>
                              {it.top10.length === 0 ? <p className="text-[12.5px] text-[#86868B]">Pas encore de données — clique sur le bouton refresh ⟳ à droite.</p> : (
                                <ul className="space-y-1">
                                  {it.top10.map((r) => (
                                    <li key={r.position} className={`flex items-center gap-2 p-2 rounded ${r.isUs ? 'bg-[#E7F8EE]' : ''}`}>
                                      <span className="w-7 text-center font-bold text-[12px]" style={{ color: r.position <= 3 ? '#1F7A4D' : r.position <= 10 ? '#1F5865' : '#86868B' }}>#{r.position}</span>
                                      <a href={r.url} target="_blank" rel="noreferrer" className="text-[12.5px] flex-1 min-w-0 truncate hover:underline" style={{ color: r.isUs ? '#1F7A4D' : '#1D1D1F' }}>
                                        <strong>{r.domain}{r.isUs ? ' (nous)' : ''}</strong> · {r.title}
                                      </a>
                                      <ExternalLink className="h-3 w-3 text-[#86868B] flex-shrink-0" />
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
