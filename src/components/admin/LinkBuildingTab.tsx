/**
 * Link Building hub admin :
 *  - Annuaires prioritaires (checklist directs)
 *  - Backlinks acquis (tracker DA + statut)
 *  - KPI : total, live, planned, avg DA
 *
 * @author Rabah Ziane - 2026-05-17
 */
import { useEffect, useState } from 'react';
import { Plus, ExternalLink, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';

type Backlink = {
  _id: string;
  sourceUrl: string;
  sourceDomain: string;
  targetUrl: string;
  anchor: string;
  da: number | null;
  type: string;
  status: string;
  dateAcquired: string | null;
  notes: string;
};

type Directory = {
  id: string;
  name: string;
  category: string;
  da: number;
  url: string;
  priority: string;
  free: boolean;
  notes: string;
  sourceDomain: string;
  doneStatus: 'live' | 'planned' | 'todo';
};

type Stats = {
  total: number;
  live: number;
  planned: number;
  avgDa: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
};

const TYPES: Record<string, string> = {
  directory: '📋 Annuaire',
  'guest-post': '✍️ Guest post',
  partner: '🤝 Partenaire',
  press: '📰 Presse',
  forum: '💬 Forum',
  social: '📱 Social',
  profile: '👤 Profil',
  review: '⭐ Avis',
  other: '🔗 Autre',
};

const STATUS_PILLS: Record<string, { bg: string; color: string; label: string; icon: any }> = {
  planned: { bg: '#FFF4E0', color: '#B26A00', label: 'À faire', icon: Circle },
  submitted: { bg: '#E8F5FB', color: '#1F5865', label: 'Soumis', icon: Clock },
  live: { bg: '#E7F8EE', color: '#1F7A4D', label: 'Live', icon: CheckCircle2 },
  lost: { bg: '#FFE5E5', color: '#A33', label: 'Perdu', icon: Circle },
  rejected: { bg: '#F5F5F7', color: '#86868B', label: 'Rejeté', icon: Circle },
};

const PRIO_COLOR: Record<string, string> = { P0: '#D32F2F', P1: '#B26A00', P2: '#1F5865', P3: '#86868B' };

export default function LinkBuildingTab({ secret }: { secret: string }) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<'directories' | 'acquired'>('directories');
  const [newUrl, setNewUrl] = useState('');
  const [newAnchor, setNewAnchor] = useState('');
  const [newType, setNewType] = useState('other');

  const load = async () => {
    const headers = { 'x-admin-secret': secret };
    const [bl, dirs, st] = await Promise.all([
      fetch('/api/admin/backlinks', { headers }).then((r) => r.json()),
      fetch('/api/admin/backlinks/directories', { headers }).then((r) => r.json()),
      fetch('/api/admin/backlinks/stats', { headers }).then((r) => r.json()),
    ]);
    setBacklinks(bl.items || []);
    setDirectories(dirs.directories || []);
    setStats(st);
  };

  useEffect(() => { if (secret) load(); }, [secret]);

  const addFromDirectory = async (id: string) => {
    await fetch('/api/admin/backlinks/from-directory', { method: 'POST', headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' }, body: JSON.stringify({ directoryId: id }) });
    load();
  };

  const markStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/backlinks/${id}`, { method: 'PATCH', headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    load();
  };

  const addBacklink = async () => {
    if (!newUrl.trim()) return;
    await fetch('/api/admin/backlinks', { method: 'POST', headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceUrl: newUrl.trim(), anchor: newAnchor, type: newType, status: 'live' }) });
    setNewUrl(''); setNewAnchor(''); setNewType('other');
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Retirer ce backlink du tracking ?')) return;
    await fetch(`/api/admin/backlinks/${id}`, { method: 'DELETE', headers: { 'x-admin-secret': secret } });
    load();
  };

  return (
    <div style={{ background: 'var(--bg-soft, #FBFBFD)', minHeight: '100vh' }} className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <p className="text-[10.5px] uppercase tracking-[0.22em] font-bold mb-1.5 text-[#1F5865]">SEO · Off-page authority</p>
          <h1 className="text-[32px] sm:text-[40px] text-[#1D1D1F] leading-[1.05]" style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}>
            Link Building
          </h1>
          <p className="text-[14px] text-[#86868B] mt-1.5">Construis l'autorité de ton domaine via backlinks externes. Plus tu en as de qualité, plus Google te ranke haut.</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-2xl p-4 bg-white ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-wider text-[#86868B] mb-1">Total backlinks</p>
              <p className="text-2xl font-bold text-[#1D1D1F]">{stats.total}</p>
            </div>
            <div className="rounded-2xl p-4 bg-white ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-wider text-[#86868B] mb-1">Live</p>
              <p className="text-2xl font-bold text-[#1F7A4D]">{stats.live}</p>
            </div>
            <div className="rounded-2xl p-4 bg-white ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-wider text-[#86868B] mb-1">À faire</p>
              <p className="text-2xl font-bold text-[#B26A00]">{stats.planned}</p>
            </div>
            <div className="rounded-2xl p-4 bg-white ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-wider text-[#86868B] mb-1">DA moyenne</p>
              <p className="text-2xl font-bold text-[#1F5865]">{stats.avgDa || '—'}</p>
            </div>
          </div>
        )}

        <div className="mb-4 flex gap-2 flex-wrap">
          <button onClick={() => setTab('directories')} className={`px-4 py-2 rounded-full text-[12.5px] font-semibold ${tab === 'directories' ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}>
            📋 Annuaires prioritaires ({directories.length})
          </button>
          <button onClick={() => setTab('acquired')} className={`px-4 py-2 rounded-full text-[12.5px] font-semibold ${tab === 'acquired' ? 'bg-[#1D1D1F] text-white' : 'bg-white ring-1 ring-black/8 text-[#1D1D1F]'}`}>
            🔗 Backlinks acquis ({backlinks.filter(b => b.status === 'live').length})
          </button>
        </div>

        {tab === 'directories' && (
          <div className="bg-white rounded-2xl ring-1 ring-black/5 overflow-hidden">
            <div className="p-3 border-b border-black/5 text-[12px] text-[#86868B]">
              Priorité : <span className="font-bold" style={{ color: PRIO_COLOR.P0 }}>P0 critique</span> · <span className="font-bold" style={{ color: PRIO_COLOR.P1 }}>P1 fort</span> · <span className="font-bold" style={{ color: PRIO_COLOR.P2 }}>P2 moyen</span> · <span className="font-bold" style={{ color: PRIO_COLOR.P3 }}>P3 bonus</span>
            </div>
            <table className="w-full text-[12.5px]">
              <thead className="bg-[#FAFAFC] text-[#86868B]">
                <tr>
                  <th className="text-left p-3 font-semibold">Annuaire</th>
                  <th className="text-left p-3 font-semibold">Catégorie</th>
                  <th className="text-center p-3 font-semibold whitespace-nowrap">DA</th>
                  <th className="text-center p-3 font-semibold whitespace-nowrap">Priorité</th>
                  <th className="text-center p-3 font-semibold whitespace-nowrap">Statut</th>
                  <th className="text-right p-3 font-semibold whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {directories.sort((a, b) => a.priority.localeCompare(b.priority)).map((d) => {
                  const StatusIcon = d.doneStatus === 'live' ? CheckCircle2 : d.doneStatus === 'planned' ? Clock : Circle;
                  return (
                    <tr key={d.id} className="hover:bg-[#FAFAFC]">
                      <td className="p-3">
                        <p className="font-semibold text-[#1D1D1F]">{d.name}</p>
                        <p className="text-[11px] text-[#86868B]">{d.notes}</p>
                      </td>
                      <td className="p-3 text-[#86868B]">{d.category}</td>
                      <td className="p-3 text-center font-bold tabular-nums">{d.da}</td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: PRIO_COLOR[d.priority] + '20', color: PRIO_COLOR[d.priority] }}>
                          {d.priority}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <StatusIcon className="inline h-4 w-4" style={{ color: d.doneStatus === 'live' ? '#1F7A4D' : d.doneStatus === 'planned' ? '#B26A00' : '#C7C7CC' }} />
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1D1D1F] text-white text-[11px] font-semibold hover:bg-[#3C3C43]">
                          S'inscrire <ExternalLink className="h-3 w-3" />
                        </a>
                        {d.doneStatus === 'todo' && (
                          <button onClick={() => addFromDirectory(d.id)} className="ml-1 inline-flex items-center px-2.5 py-1 rounded-full bg-white ring-1 ring-black/8 text-[#1D1D1F] text-[11px] font-semibold hover:ring-black/20">
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'acquired' && (
          <>
            <div className="rounded-2xl p-4 mb-4 bg-white ring-1 ring-black/5 flex gap-2 flex-wrap items-center">
              <input type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL où tu as un backlink (ex: https://www.kompass.com/fr/...)" className="flex-1 min-w-[260px] px-3 py-2 rounded-full bg-[#F5F5F7] text-[12.5px] outline-none focus:ring-1 focus:ring-[#1D1D1F]" />
              <input type="text" value={newAnchor} onChange={(e) => setNewAnchor(e.target.value)} placeholder="Texte du lien (optionnel)" className="w-48 px-3 py-2 rounded-full bg-[#F5F5F7] text-[12.5px] outline-none focus:ring-1 focus:ring-[#1D1D1F]" />
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className="px-3 py-2 rounded-full bg-[#F5F5F7] text-[12.5px] outline-none cursor-pointer">
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button onClick={addBacklink} className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[12.5px] font-semibold hover:bg-[#3C3C43]">
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            </div>

            {backlinks.length === 0 ? (
              <div className="rounded-2xl p-10 bg-white ring-1 ring-black/5 text-center">
                <p className="text-[#86868B] text-[14px]">Pas encore de backlinks. Commence par les annuaires P0 dans l'onglet précédent.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl ring-1 ring-black/5 overflow-hidden">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-[#FAFAFC] text-[#86868B]">
                    <tr>
                      <th className="text-left p-3 font-semibold">Source</th>
                      <th className="text-left p-3 font-semibold">Type</th>
                      <th className="text-center p-3 font-semibold whitespace-nowrap">DA</th>
                      <th className="text-left p-3 font-semibold">Statut</th>
                      <th className="text-left p-3 font-semibold whitespace-nowrap">Date</th>
                      <th className="text-right p-3 font-semibold whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {backlinks.map((b) => {
                      const pill = STATUS_PILLS[b.status] || STATUS_PILLS.planned;
                      return (
                        <tr key={b._id} className="hover:bg-[#FAFAFC]">
                          <td className="p-3 max-w-[300px]">
                            <a href={b.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#0066CC] hover:underline truncate block">
                              {b.sourceDomain}
                            </a>
                            <p className="text-[11px] text-[#86868B] truncate">{b.anchor || b.notes}</p>
                          </td>
                          <td className="p-3 text-[#86868B] whitespace-nowrap">{TYPES[b.type] || b.type}</td>
                          <td className="p-3 text-center font-bold tabular-nums">{b.da || '—'}</td>
                          <td className="p-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: pill.bg, color: pill.color }}>
                              {pill.label}
                            </span>
                          </td>
                          <td className="p-3 text-[#86868B] whitespace-nowrap text-[11.5px]">
                            {b.dateAcquired ? new Date(b.dateAcquired).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            {b.status !== 'live' && (
                              <button onClick={() => markStatus(b._id, 'live')} className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E7F8EE] text-[#1F7A4D] text-[11px] font-semibold hover:bg-[#D5F0E0]">
                                ✓ Live
                              </button>
                            )}
                            {b.status !== 'planned' && (
                              <button onClick={() => markStatus(b._id, 'planned')} className="ml-1 inline-flex items-center px-2.5 py-1 rounded-full bg-white ring-1 ring-black/8 text-[#86868B] text-[11px] font-semibold">
                                À faire
                              </button>
                            )}
                            <button onClick={() => remove(b._id)} className="ml-1 inline-flex items-center px-2.5 py-1 rounded-full bg-white ring-1 ring-black/8 text-[#FF3B30] text-[11px] font-semibold hover:ring-[#FF3B30]/30">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
