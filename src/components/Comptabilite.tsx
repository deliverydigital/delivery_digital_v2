/**
 * Tableau de bord COMPTABILITÉ (style Indy / design Qonto pro).
 * Page deliverydigital.fr/comptabilite - superadmin (x-admin-secret).
 *  - Sélection / création d'entreprise (régime IS/IR, TVA, exercice).
 *  - Connexion Qonto + synchro des transactions.
 *  - Catégorisation inline (catalogue PCG) -> TVA automatique.
 *  - KPIs (CA, charges, résultat, TVA) + checklist "reste à faire" vers la liasse.
 * @author Rabah Ziane · 2026-07-07
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, Building2, Plus, RefreshCw, Link2, CheckCircle2, Circle, AlertTriangle,
  Wallet, TrendingUp, TrendingDown, Scale, FileText, X, Landmark, Download, Plus as PlusIcon, Trash2, History, Search, Paperclip, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown,
} from 'lucide-react';

const inp = 'w-full px-3 py-2 rounded-full border border-[#E4E4E7] bg-white text-[13px] bg-white focus:outline-none focus:border-black/30';
const euro = (n: number) => (n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
// Avatar Qonto : initiales du tiers + fond pastel déterministe.
const initials = (name) => { const p = String(name || '').trim().split(/\s+/).filter(Boolean); if (!p.length) return '—'; if (p.length === 1) return p[0].slice(0, 2).toUpperCase(); return (p[0][0] + p[p.length - 1][0]).toUpperCase(); };
const AVATAR_BG = ['#EDE9FE','#DCFCE7','#FEF3C7','#DBEAFE','#FCE7F3','#F1F5F9','#FFE4E6','#E0F2FE'];
const avatarBg = (name) => { let h = 0; const t = String(name || ''); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return AVATAR_BG[h % AVATAR_BG.length]; };
// Libellé du régime fiscal : "IS · réel simplifié", "IR · BIC · réel simplifié"…
const regimeBadge = (c: any) => {
  const impot = (c?.regime_fiscal || 'IS') === 'IR' ? `IR · ${c?.categorie_ir || 'BIC'}` : 'IS';
  const reel = c?.regime_tva === 'reel_normal' ? 'réel normal' : c?.regime_tva === 'franchise' ? 'franchise en base' : 'réel simplifié';
  return `${impot} · ${reel}`;
};

type Cat = { key: string; label: string; account: string; nature: string; tva: number };
type Group = { key: string; label: string; color: string; items: Cat[] };

export default function Comptabilite({ secret }: { secret: string }) {
  const hdr = useMemo(() => ({ 'x-admin-secret': secret }), [secret]);
  const hdrJson = useMemo(() => ({ 'x-admin-secret': secret, 'Content-Type': 'application/json' }), [secret]);

  const [companies, setCompanies] = useState<any[]>([]);
  const [sel, setSel] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [showNew, setShowNew] = useState(false);

  const loadCompanies = useCallback(async () => {
    const r = await fetch('/api/admin/comptabilite/companies', { headers: hdr }).then(r => r.json());
    setCompanies(r.companies || []);
    if (!sel && r.companies?.[0]) setSel(r.companies[0]._id);
  }, [hdr, sel]);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);
  useEffect(() => { (async () => {
    const r = await fetch('/api/admin/comptabilite/catalog', { headers: hdr }).then(r => r.json());
    setGroups(r.groups || []);
  })(); }, [hdr]);

  return (
    <div style={{ fontFamily: "'Sora','Inter',system-ui,sans-serif" }}>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-[28px] sm:text-[40px] text-[#1D1D1F] mb-1 flex items-center gap-2" style={{ fontFamily: "'Sora','Inter',system-ui,sans-serif", fontWeight: 700 }}>
            <Landmark className="h-8 w-8 text-[#1D1D1F]" /> Comptabilité.
          </h1>
          <p className="text-[14px] text-[#71717A]">Vos transactions Qonto catégorisées jusqu'à la liasse fiscale officielle.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={sel} onChange={e => setSel(e.target.value)} className="px-3.5 py-2 rounded-full text-[13px] font-semibold bg-white ring-1 ring-black/10 text-[#1D1D1F]">
            {companies.length === 0 && <option value="">Aucune entreprise</option>}
            {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-[#1D1D1F] text-white">
            <Plus className="h-4 w-4" /> Entreprise
          </button>
        </div>
      </div>

      {sel ? <CompanyDashboard key={sel} id={sel} hdr={hdr} hdrJson={hdrJson} groups={groups} onChanged={loadCompanies} />
           : <Empty onNew={() => setShowNew(true)} />}

      {showNew && <NewCompanyModal hdrJson={hdrJson} onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); loadCompanies(); setSel(id); }} />}
    </div>
  );
}

/* =============================== Dashboard =============================== */
function CompanyDashboard({ id, hdr, hdrJson, groups, onChanged }: any) {
  const [dash, setDash] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [tab, setTab] = useState<'transactions' | 'liasse' | 'documents'>('transactions');
  const [syncing, setSyncing] = useState(false);
  const [syncYear, setSyncYear] = useState<number>(0); // 0 = exercice courant
  const [switching, setSwitching] = useState(false);   // rechargement lors d'un changement d'année
  const [showQonto, setShowQonto] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // Charge dashboard + écritures. `year` (0 = exercice courant) visualise une autre
  // année en lecture seule sans re-synchroniser Qonto. @author Rabah Ziane - 2026-07-18
  const load = useCallback(async (year: number = syncYear) => {
    const q = year ? `?year=${year}` : '';
    const [d, e] = await Promise.all([
      fetch(`/api/admin/comptabilite/companies/${id}/dashboard${q}`, { headers: hdr }).then(r => r.json()),
      fetch(`/api/admin/comptabilite/companies/${id}/entries${q}`, { headers: hdr }).then(r => r.json()),
    ]);
    setDash(d); setEntries(e.entries || []);
  }, [id, hdr, syncYear]);
  useEffect(() => { load(); }, [load]);

  // Changement d'année : recharge la vue avec un indicateur de chargement (mode perf).
  const switchYear = async (year: number) => {
    setSyncYear(year);
    setSwitching(true);
    try { await load(year); } finally { setSwitching(false); }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const q = syncYear ? `?year=${syncYear}` : '';
      const r = await fetch(`/api/admin/comptabilite/companies/${id}/qonto/sync${q}`, { method: 'POST', headers: hdr }).then(r => r.json());
      if (r.error) alert('Synchro Qonto : ' + (r.detail || r.error));
      else alert(`Synchro ${syncYear || 'exercice'} : ${r.nouveaux || 0} nouvelle(s) transaction(s) sur ${r.importes || 0} récupérée(s).`);
      await load(); onChanged?.();
    } finally { setSyncing(false); }
  };

  if (!dash) return <Loading />;
  const c = dash.company || {}, res = dash.resultat || {}, tva = dash.tva || {}, chk = dash.checklist || {};
  const connected = c.qonto?.connected;

  return (
    <div className="space-y-5">
      {/* Régime fiscal de la société */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[15px] font-semibold text-[#1D1D1F]">{c.name}</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-[#1D1D1F] text-white">
          <Landmark className="h-3.5 w-3.5" />{regimeBadge(c)}
        </span>
        {c.exercice?.annee_courante && <span className="text-[12px] text-[#71717A]">Exercice {c.exercice.annee_courante}</span>}
      </div>
      {/* KPIs */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 transition-opacity ${switching ? 'opacity-40 pointer-events-none' : ''}`}>
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Chiffre d'affaires" value={euro(res.produits)} tone="pos" />
        <Kpi icon={<TrendingDown className="h-4 w-4" />} label="Charges" value={euro(res.charges)} tone="neg" />
        <Kpi icon={<Scale className="h-4 w-4" />} label="Résultat" value={euro(res.resultat)} tone={res.resultat >= 0 ? 'pos' : 'neg'} />
        <Kpi icon={<Wallet className="h-4 w-4" />} label={tva.sens === 'credit' ? 'Crédit de TVA' : 'TVA à payer'} value={euro(Math.abs(tva.solde))} tone="neutral" />
      </div>

      {/* Actions Qonto */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-2xl ring-1 ring-[#EAEAEA] p-4">
        <div className="flex items-center gap-2.5 text-[13px]">
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${connected ? 'bg-[#34C759]/12 text-[#1a8a3b]' : 'bg-black/5 text-[#71717A]'}`}><Link2 className="h-4 w-4" /></span>
          <div>
            <div className="font-semibold text-[#1D1D1F]">Compte bancaire Qonto</div>
            <div className="text-[#71717A]">{connected ? `Connecté · ${c.qonto?.iban || ''} · synchro ${fmtDate(c.qonto?.last_sync_at)}` : 'Non connecté'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowReport(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-white ring-1 ring-black/10 text-[#1D1D1F]"><History className="h-4 w-4" />Report N-1</button>
          <button onClick={() => setShowQonto(true)} className="px-4 py-2 rounded-full text-[13px] font-semibold bg-white ring-1 ring-black/10 text-[#1D1D1F]">{connected ? 'Gérer' : 'Connecter'}</button>
          {connected && (
            <div className="relative inline-flex items-center">
              <select value={syncYear} disabled={switching} onChange={e => switchYear(Number(e.target.value))} title="Année à visualiser / synchroniser" className="pl-3 pr-8 py-2 rounded-full text-[13px] font-semibold bg-white ring-1 ring-black/10 text-[#1D1D1F] disabled:opacity-60">
                <option value={0}>Exercice {c.exercice?.annee_courante || ''}</option>
                {[2026, 2025, 2024, 2023, 2022, 2021].map(yr => <option key={yr} value={yr}>Année {yr}</option>)}
              </select>
              {switching && <Loader2 className="absolute right-2.5 h-4 w-4 animate-spin text-[#71717A] pointer-events-none" />}
            </div>
          )}
          {connected && <button onClick={sync} disabled={syncing} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-[#1D1D1F] text-white disabled:opacity-50">{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Synchroniser</button>}
        </div>
      </div>

      {/* Checklist "reste à faire" -> la fonctionnalité clé Indy */}
      <Checklist chk={chk} id={id} hdrJson={hdrJson} atteste={!!c.justificatifs_atteste} onDone={load} />

      {/* Onglets */}
      <div className="flex gap-5 border-b border-[#EAEAEA]">
        {([['transactions', `Transactions${dash.counts?.a_categoriser ? ` · ${dash.counts.a_categoriser} à faire` : ''}`], ['liasse', 'Liasse fiscale'], ['documents', 'Documents']] as [any, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-1 pb-2.5 -mb-px text-[14px] font-semibold border-b-2 transition-colors ${tab === k ? 'border-[#1D1D1F] text-[#1D1D1F]' : 'border-transparent text-[#71717A] hover:text-[#1D1D1F]'}`}>{l}</button>
        ))}
      </div>

      <div className={`transition-opacity ${switching ? 'opacity-40 pointer-events-none' : ''}`}>
        {tab === 'transactions' && <Transactions id={id} entries={entries} groups={groups} hdrJson={hdrJson} onSaved={load} onManual={() => setShowManual(true)} />}
        {tab === 'liasse' && <Liasse id={id} hdr={hdr} onGoTransactions={() => setTab('transactions')} />}
        {tab === 'documents' && <Documents id={id} hdr={hdr} hdrJson={hdrJson} company={c} />}
      </div>

      {showQonto && <QontoModal id={id} hdrJson={hdrJson} onClose={() => setShowQonto(false)} onDone={() => { setShowQonto(false); load(); onChanged?.(); }} />}
      {showReport && <ReportModal id={id} company={c} hdrJson={hdrJson} onClose={() => setShowReport(false)} onDone={() => { setShowReport(false); load(); onChanged?.(); }} />}
      {showManual && <ManualEntryModal id={id} groups={groups} hdrJson={hdrJson} onClose={() => setShowManual(false)} onDone={() => { setShowManual(false); load(); }} />}
    </div>
  );
}

/* =============================== Transactions =============================== */
// Ligne de transaction MÉMOÏSÉE : ne re-render que si SON statut vert (reviewed), son solde,
// son entrée ou sa position changent. -> cliquer une ligne ne re-render plus toute la liste
// (2000+ lignes), donc plus de latence sur les clics suivants. @author Rabah Ziane - 2026-07-17
const RowItem = React.memo(function RowItem({ e, i, reviewed, solde, month, groups, onDown, onCategorize, onBulk, onFacture }: any) {
  return (
    <div data-eid={e._id} data-month={month}
      onMouseDown={ev => onDown(e, reviewed, ev)}
      className={`flex items-center gap-3 px-4 py-3 text-[13px] select-none cursor-pointer ${reviewed ? 'bg-[#e6f8ec]' : ''} ${i ? 'border-t border-black/5' : ''}`}>
      <div className="w-20 shrink-0 text-[#71717A]">{fmtDate(e.date)}</div>
      <div className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold text-[#3f3f46]" style={{ backgroundColor: avatarBg(e.counterparty) }}>{initials(e.counterparty)}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[#1D1D1F] truncate flex items-center gap-1.5">
          {e.label}
          {e.attachment_ids?.length ? <button onClick={() => onFacture(e._id)} title="Voir la facture" className="text-[#0066CC] shrink-0"><Paperclip className="h-3.5 w-3.5" /></button> : null}
        </div>
        <div className="text-[#71717A] truncate">
          <button onClick={() => onBulk(e.counterparty)} className="hover:text-[#1D1D1F] hover:underline" title="Éditer toutes les transactions de ce tiers">{e.counterparty || '(sans tiers)'}</button>
          {e.compte_nom ? ` · ${e.compte_nom}` : ''}
        </div>
      </div>
      <div className="w-28 shrink-0 text-right">
        <div className={`font-semibold tabular-nums ${e.amount < 0 ? 'text-[#1D1D1F]' : 'text-[#1a8a3b]'}`}>{euro(e.amount)}</div>
        <div className="text-[10px] text-[#71717A] tabular-nums">Solde {euro(solde)}</div>
      </div>
      <div className="w-32 text-right text-[11px] leading-tight">
        {e.category_key ? (
          e.tva_sens === 'aucune' || !e.tva_sens ? <span className="text-[#71717A]">hors TVA</span> : (
            <>
              <div className="text-[#71717A]">HT {euro(e.amount_ht)}</div>
              <div className={e.tva_sens === 'collectee' ? 'text-[#1a8a3b]' : 'text-[#0066CC]'}>TVA {e.tva_rate}% · {euro(e.tva_amount)}<span className="text-[#C7C7CC]"> {e.tva_sens === 'collectee' ? '↑coll.' : '↓déd.'}</span></div>
            </>
          )
        ) : <span className="text-[#C7C7CC]">—</span>}
      </div>
      <div className="w-52">
        <select value={e.category_key || ''} onChange={ev => onCategorize(e._id, ev.target.value)}
          className={`w-full px-3 py-1.5 rounded-full text-[12px] font-semibold ring-1 ${e.status === 'a_categoriser' ? 'bg-[#FF9F0A]/10 text-[#b5740a] ring-[#FF9F0A]/30' : 'bg-white text-[#1D1D1F] ring-black/10'}`}>
          <option value="">À catégoriser…</option>
          {groups.map((g: Group) => <optgroup key={g.key} label={g.label}>{g.items.map(it => <option key={it.key} value={it.key}>{it.label}</option>)}</optgroup>)}
        </select>
      </div>
    </div>
  );
}, (a: any, b: any) => a.e === b.e && a.reviewed === b.reviewed && a.solde === b.solde && a.i === b.i && a.month === b.month);

function Transactions({ id, entries, groups, hdrJson, onSaved, onManual }: any) {
  const [bulk, setBulk] = useState<string | null>(null); // contrepartie en édition de masse
  const [autoBusy, setAutoBusy] = useState(false);

  // ---- "Traité" : clic n'importe où sur la ligne (ou clic-glisser vertical) -> vert clair. ----
  // Persisté en base (champ reviewed). Les contrôles (menu catégorie, boutons) restent cliquables.
  // @author Rabah Ziane - 2026-07-16
  const [rev, setRev] = useState<Record<string, boolean>>({});
  const painting = useRef(false);
  const paintVal = useRef(false);
  const touched = useRef<Map<string, HTMLElement>>(new Map());
  const isRev = (e: any) => (e._id in rev ? rev[e._id] : !!e.reviewed);
  // PERF : pendant le glisser on peint DIRECTEMENT le DOM (aucun re-render React),
  // on ne met à jour l'état + la base qu'UNE fois au relâchement. -> vitesse native.
  const GREEN = '#e6f8ec';
  const paintDom = (eid?: string | null, el?: HTMLElement | null) => {
    if (!eid || !el || touched.current.has(eid)) return;
    touched.current.set(eid, el);
    el.style.backgroundColor = paintVal.current ? GREEN : '#ffffff';
  };
  const rowMouseDown = (e: any, reviewed: boolean, ev: React.MouseEvent) => {
    if ((ev.target as HTMLElement).closest('button,select,input,a,option')) return;
    ev.preventDefault();            // pas de sélection de texte
    painting.current = true;
    paintVal.current = !reviewed;    // 1er clic décide (statut passé en param, pas de re-lecture d'état)
    touched.current = new Map();
    paintDom(e._id, ev.currentTarget as HTMLElement);
  };
  // Drag-select : suivi du curseur en continu (elementFromPoint) -> ne saute jamais de ligne,
  // et comme on ne touche que le style DOM, c'est instantané même sur des milliers de lignes.
  useEffect(() => {
    const move = (ev: MouseEvent) => {
      if (!painting.current) return;
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const row = el?.closest('[data-eid]') as HTMLElement | null;
      if (row) paintDom(row.dataset.eid, row);
    };
    const up = () => {
      if (!painting.current) return;
      painting.current = false;
      const ids = [...touched.current.keys()]; const reviewed = paintVal.current;
      touched.current = new Map();
      if (!ids.length) return;
      // On garde le style inline posé pendant le clic/glisser comme feedback INSTANTANÉ : il reste
      // en place et l'état (setRev -> classe) le rejoint au re-render. Ne PAS nettoyer ici, sinon la
      // ligne redevient blanche le temps du re-render de la grosse liste ("clics en retard").
      // @author Rabah Ziane - 2026-07-17
      setRev(r => { const n = { ...r }; for (const eid of ids) n[eid] = reviewed; return n; });
      fetch(`/api/admin/comptabilite/companies/${id}/entries/reviewed`,
        { method: 'POST', headers: hdrJson, body: JSON.stringify({ ids, reviewed }) });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [id, hdrJson]);
  const categorize = async (eid: string, category_key: string) => {
    await fetch(`/api/admin/comptabilite/entries/${eid}`, { method: 'PATCH', headers: hdrJson, body: JSON.stringify({ category_key }) });
    onSaved();
  };
  // Clôture de l'exercice (proposée quand tout est pointé). Verrouille les écritures.
  const cloturer = async () => {
    if (!confirm("Clôturer l'exercice comptable ? Les écritures seront verrouillées.")) return;
    await fetch(`/api/admin/comptabilite/companies/${id}/cloture`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ verrouille: true }) });
    alert('Exercice clôturé ✅');
    onSaved();
  };
  // Ré-applique la catégorisation automatique (données Qonto) sur toutes les écritures.
  const autoCategorize = async () => {
    if (!confirm('Ré-appliquer la catégorisation automatique (Qonto) à toutes les transactions ?\nLes catégories modifiées à la main seront écrasées.')) return;
    setAutoBusy(true);
    try {
      const r = await fetch(`/api/admin/comptabilite/companies/${id}/categorize-auto`, { method: 'POST', headers: hdrJson }).then(r => r.json());
      alert(`Catégorisation automatique terminée : ${r.updated || 0} transaction(s) recatégorisée(s).`);
      onSaved();
    } finally { setAutoBusy(false); }
  };
  // Ouvre le justificatif (facture) Qonto dans un nouvel onglet.
  const openFacture = async (eid: string) => {
    try {
      const r = await fetch(`/api/admin/comptabilite/entries/${eid}/justificatif`, { headers: hdrJson }).then(r => r.json());
      if (r.url) window.open(r.url, '_blank'); else alert('Justificatif indisponible.');
    } catch { alert('Justificatif indisponible.'); }
  };
  // ---- Filtres ----
  const [q, setQ] = useState('');
  const [fCat, setFCat] = useState('');     // '' | '__todo__' | category_key
  const [fSens, setFSens] = useState('');   // '' | collectee | deductible | aucune
  const [fCompte, setFCompte] = useState('');
  const [minA, setMinA] = useState('');
  const [maxA, setMaxA] = useState('');
  const comptes = Array.from(new Set(entries.map((e: any) => e.compte_nom).filter(Boolean)));

  const filtered = useMemo(() => entries.filter((e: any) => {
    if (q) { const t = `${e.label} ${e.counterparty} ${e.compte_nom || ''}`.toLowerCase(); if (!t.includes(q.toLowerCase())) return false; }
    if (fCat === '__todo__') { if (e.status !== 'a_categoriser') return false; }
    else if (fCat && e.category_key !== fCat) return false;
    if (fSens && (e.tva_sens || 'aucune') !== fSens) return false;
    if (fCompte && e.compte_nom !== fCompte) return false;
    const abs = Math.abs(e.amount || 0);
    if (minA && abs < +minA) return false;
    if (maxA && abs > +maxA) return false;
    return true;
  }), [entries, q, fCat, fSens, fCompte, minA, maxA]);
  const tot = filtered.reduce((a: any, e: any) => {
    a.n++; a.sum += e.amount || 0;
    if (e.tva_sens === 'collectee') { a.coll += e.tva_amount || 0; a.ca += e.amount_ht || 0; }
    if (e.tva_sens === 'deductible') { a.ded += e.tva_amount || 0; a.ach += e.amount_ht || 0; }
    return a;
  }, { n: 0, sum: 0, coll: 0, ded: 0, ca: 0, ach: 0 });
  const reset = () => { setQ(''); setFCat(''); setFSens(''); setFCompte(''); setMinA(''); setMaxA(''); };
  const active = q || fCat || fSens || fCompte || minA || maxA;

  // Solde cumulé (running balance) à chaque date : on additionne les montants du plus
  // ancien au plus récent, indépendamment de l'ordre d'affichage. Cumul sur le jeu
  // filtré (année sélectionnée) - hors solde d'ouverture. @author Rabah Ziane - 2026-07-16
  const soldeById = useMemo(() => {
    const m: Record<string, number> = {};
    const ordered = [...filtered].sort((a: any, b: any) =>
      (new Date(a.date).getTime() - new Date(b.date).getTime()) || (String(a._id) < String(b._id) ? -1 : 1));
    let run = 0;
    for (const e of ordered) { run += (e.amount || 0); m[e._id] = Math.round(run * 100) / 100; }
    return m;
  }, [filtered]);

  // Progression du "pointage" : part des lignes marquées traité (vert) sur le jeu filtré.
  const revCount = filtered.reduce((n: number, e: any) => n + (isRev(e) ? 1 : 0), 0);
  const revDone = filtered.length > 0 && revCount === filtered.length; // 100% réel (toutes pointées)
  // Affichage : on n'arrondit PAS à 100 tant qu'il reste des lignes (floor) -> "99%" à 1221/1224.
  const revPct = filtered.length ? (revDone ? 100 : Math.min(99, Math.floor((revCount / filtered.length) * 100))) : 0;

  // Navigation dans la liste : tout en haut / bas + saut à un mois précis.
  const monthKeyOf = (d?: string) => { if (!d) return ''; const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };
  const months = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of filtered) { const k = monthKeyOf(e.date); if (k && !seen.has(k)) seen.set(k, new Date(e.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })); }
    return [...seen.entries()];
  }, [filtered]);
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  const goMonth = (mk: string) => { const el = document.querySelector(`[data-month="${mk}"]`) as HTMLElement | null; if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); };

  return (
    <div className="space-y-2">
      {/* Barre de filtres */}
      <div className="bg-white rounded-2xl ring-1 ring-[#EAEAEA] p-3 flex flex-wrap items-center gap-2 text-[12px]">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher (libellé, tiers, compte)…" className="w-full pl-8 pr-3 py-1.5 rounded-full border border-[#E4E4E7] bg-white text-[12px]" />
        </div>
        <select value={fCat} onChange={e => setFCat(e.target.value)} className="px-3 py-1.5 rounded-full bg-[#F4F4F5] text-[#1D1D1F] cursor-pointer">
          <option value="">Toutes catégories</option>
          <option value="__todo__">⚠ À catégoriser</option>
          {groups.map((g: Group) => <optgroup key={g.key} label={g.label}>{g.items.map(it => <option key={it.key} value={it.key}>{it.label}</option>)}</optgroup>)}
        </select>
        <select value={fSens} onChange={e => setFSens(e.target.value)} className="px-3 py-1.5 rounded-full bg-[#F4F4F5] text-[#1D1D1F] cursor-pointer">
          <option value="">TVA : toutes</option>
          <option value="collectee">TVA collectée</option>
          <option value="deductible">TVA déductible</option>
          <option value="aucune">Hors TVA</option>
        </select>
        {comptes.length > 1 && (
          <select value={fCompte} onChange={e => setFCompte(e.target.value)} className="px-3 py-1.5 rounded-full bg-[#F4F4F5] text-[#1D1D1F] cursor-pointer">
            <option value="">Tous comptes</option>
            {comptes.map((c: any) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {months.length > 1 && (
          <select onChange={e => { if (e.target.value) goMonth(e.target.value); e.currentTarget.selectedIndex = 0; }} className="px-3 py-1.5 rounded-full bg-[#F4F4F5] text-[#1D1D1F] cursor-pointer" title="Aller à un mois">
            <option value="">Aller au mois…</option>
            {months.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        )}
        <input value={minA} onChange={e => setMinA(e.target.value)} type="number" placeholder="€ min" className="w-20 px-3 py-1.5 rounded-full bg-[#F4F4F5] text-[#1D1D1F] cursor-pointer" />
        <input value={maxA} onChange={e => setMaxA(e.target.value)} type="number" placeholder="€ max" className="w-20 px-3 py-1.5 rounded-full bg-[#F4F4F5] text-[#1D1D1F] cursor-pointer" />
        {active ? <button onClick={reset} className="px-2.5 py-1.5 rounded-full bg-black/5 text-[#1D1D1F] font-semibold">Réinitialiser</button> : null}
        <button onClick={autoCategorize} disabled={autoBusy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white ring-1 ring-black/10 text-[#1D1D1F] font-semibold disabled:opacity-50">{autoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Catégorisation auto</button>
        <button onClick={onManual} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#1D1D1F] text-white font-semibold"><PlusIcon className="h-3.5 w-3.5" />Écriture</button>
      </div>

      {/* Totaux du filtre */}
      <div className="bg-white ring-1 ring-[#EAEAEA] rounded-2xl px-5 py-3.5 flex flex-wrap items-center gap-x-9 gap-y-3">
        {([['Transactions', String(tot.n)], ['Solde', euro(tot.sum)], ['CA HT filtré', euro(tot.ca)], ['TVA collectée', euro(tot.coll)], ['Achats HT', euro(tot.ach)], ['TVA déductible', euro(tot.ded)]] as [string, string][]).map(([label, val]) => (
          <div key={label}>
            <div className="text-[11px] text-[#71717A] mb-0.5">{label}</div>
            <div className="text-[15px] font-semibold text-[#1D1D1F] tabular-nums">{val}</div>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-[#71717A] px-1">Cliquez sur une ligne (ou cliquez-glissez) pour la marquer vérifiée. Quand toutes les lignes sont vérifiées, la TVA est validée et la clôture devient possible.</div>

      {!filtered.length ? <Info text={active ? 'Aucune transaction ne correspond au filtre.' : "Aucune transaction. Connectez Qonto puis synchronisez, ou ajoutez une écriture manuelle."} /> : (
      <div className="bg-white rounded-2xl ring-1 ring-[#EAEAEA] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 text-[11px] font-medium text-[#71717A] border-b border-[#EAEAEA]">
          <div className="w-20 shrink-0">Date</div>
          <div className="h-9 w-9 shrink-0" />
          <div className="flex-1 min-w-0">Tiers</div>
          <div className="w-28 text-right">Montant</div>
          <div className="w-32 text-right">TVA</div>
          <div className="w-52">Catégorie</div>
        </div>
        {filtered.slice(0, 5000).map((e: any, i: number) => (
          <RowItem key={e._id} e={e} i={i} reviewed={isRev(e)} solde={soldeById[e._id]} month={monthKeyOf(e.date)}
            groups={groups} onDown={rowMouseDown} onCategorize={categorize} onBulk={setBulk} onFacture={openFacture} />
        ))}
        {filtered.length > 5000 && <div className="px-4 py-2 text-[11px] text-[#71717A] border-t border-black/5">Affichage limité à 5000 lignes - affine le filtre pour voir le reste.</div>}
      </div>
      )}

      {/* Espace pour ne pas masquer les dernières lignes derrière la barre fixe */}
      <div className="h-14" />
      {/* Navigation rapide : tout en haut / tout en bas */}
      <div className="fixed right-4 bottom-20 z-40 flex flex-col gap-2">
        <button onClick={scrollTop} title="Tout en haut" className="h-9 w-9 rounded-full bg-white ring-1 ring-[#EAEAEA] shadow-sm flex items-center justify-center text-[#1D1D1F] hover:bg-[#F4F4F5]"><ChevronsUp className="h-4 w-4" /></button>
        <button onClick={scrollBottom} title="Tout en bas" className="h-9 w-9 rounded-full bg-white ring-1 ring-[#EAEAEA] shadow-sm flex items-center justify-center text-[#1D1D1F] hover:bg-[#F4F4F5]"><ChevronsDown className="h-4 w-4" /></button>
      </div>

      {/* Barre de progression du pointage (fixe en bas) - propose la clôture à 100% */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-black/10 px-4 py-2.5 flex items-center gap-3 text-[12px]">
        <span className="font-semibold tabular-nums text-[#1D1D1F] shrink-0">{revCount}/{filtered.length} pointée{revCount > 1 ? 's' : ''} · {revPct}%</span>
        <div className="flex-1 h-2.5 rounded-full bg-black/10 overflow-hidden">
          <div className="h-full bg-[#34C759] transition-all duration-300" style={{ width: `${revPct}%` }} />
        </div>
        {revDone
          ? <button onClick={cloturer} className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1D1D1F] text-white font-semibold">Clôturer l'exercice</button>
          : <span className="shrink-0 text-[#71717A]">{filtered.length - revCount} ligne{filtered.length - revCount > 1 ? 's' : ''} à pointer pour clôturer</span>}
      </div>

      {bulk !== null && <BulkModal id={id} counterparty={bulk} entries={entries.filter((e: any) => e.counterparty === bulk)} groups={groups} hdrJson={hdrJson} onClose={() => setBulk(null)} onDone={() => { setBulk(null); onSaved(); }} />}
    </div>
  );
}

// Édition en masse des transactions d'un même tiers.
function BulkModal({ id, counterparty, entries, groups, hdrJson, onClose, onDone }: any) {
  const [sel, setSel] = useState<Record<string, boolean>>(() => Object.fromEntries(entries.map((e: any) => [e._id, true])));
  const [cat, setCat] = useState('');
  const [tva, setTva] = useState('');   // '' = taux par défaut de la catégorie
  const [busy, setBusy] = useState(false);
  const ids = entries.filter((e: any) => sel[e._id]).map((e: any) => e._id);
  const allOn = ids.length === entries.length;
  const apply = async () => {
    if ((!cat && tva === '') || !ids.length) return;
    setBusy(true);
    try {
      const body: any = { ids };
      if (cat) body.category_key = cat;
      if (tva !== '') body.tva_rate = Number(tva);
      await fetch(`/api/admin/comptabilite/companies/${id}/entries/bulk`, { method: 'POST', headers: hdrJson, body: JSON.stringify(body) });
      onDone();
    } finally { setBusy(false); }
  };
  return (
    <Modal title={`Tiers : ${counterparty || '(sans tiers)'}`} onClose={onClose}>
      <p className="text-[12px] text-[#71717A] mb-2">{entries.length} transaction(s). Choisis une catégorie et/ou un taux de TVA, puis applique aux lignes cochées.</p>
      <div className="flex items-center gap-2 mb-2">
        <label className="flex items-center gap-1.5 text-[12px] font-semibold">
          <input type="checkbox" checked={allOn} onChange={e => setSel(Object.fromEntries(entries.map((x: any) => [x._id, e.target.checked])))} /> Tout sélectionner
        </label>
        <span className="text-[12px] text-[#71717A]">({ids.length} coché(s))</span>
      </div>
      <div className="max-h-52 overflow-auto rounded-xl ring-1 ring-black/10 mb-3">
        {entries.map((e: any, i: number) => (
          <label key={e._id} className={`flex items-center gap-2 px-3 py-1.5 text-[12px] ${i ? 'border-t border-black/5' : ''}`}>
            <input type="checkbox" checked={!!sel[e._id]} onChange={ev => setSel(s => ({ ...s, [e._id]: ev.target.checked }))} />
            <span className="w-20 shrink-0 text-[#71717A]">{fmtDate(e.date)}</span>
            <span className="flex-1 truncate">{e.label}</span>
            <span className={`tabular-nums font-semibold ${e.amount < 0 ? 'text-[#1D1D1F]' : 'text-[#1a8a3b]'}`}>{euro(e.amount)}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2 mb-2">
        <select value={cat} onChange={e => setCat(e.target.value)} className={inp + ' flex-1'}>
          <option value="">Catégorie à appliquer…</option>
          {groups.map((g: Group) => <optgroup key={g.key} label={g.label}>{g.items.map(it => <option key={it.key} value={it.key}>{it.label}</option>)}</optgroup>)}
        </select>
        <select value={tva} onChange={e => setTva(e.target.value)} className={inp + ' w-32'} title="Taux de TVA à forcer">
          <option value="">TVA : défaut</option>
          <option value="20">TVA 20 %</option>
          <option value="10">TVA 10 %</option>
          <option value="5.5">TVA 5,5 %</option>
          <option value="0">TVA 0 %</option>
        </select>
      </div>
      <button onClick={apply} disabled={busy || (!cat && tva === '') || !ids.length} className="w-full py-2.5 rounded-full text-[14px] font-semibold bg-[#1D1D1F] text-white disabled:opacity-50 inline-flex items-center justify-center gap-2">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}Appliquer à {ids.length} transaction(s)
      </button>
    </Modal>
  );
}

/* =============================== Liasse =============================== */
function Liasse({ id, hdr, onGoTransactions }: any) {
  const [d, setD] = useState<any>(null);
  const [dl, setDl] = useState(false);
  useEffect(() => { (async () => setD(await fetch(`/api/admin/comptabilite/companies/${id}/liasse`, { headers: hdr }).then(r => r.json())))(); }, [id, hdr]);

  // Le PDF exige l'en-tête x-admin-secret -> fetch en blob puis téléchargement.
  const dlPdf = async (endpoint: string, name: string) => {
    setDl(true);
    try {
      const res = await fetch(`/api/admin/comptabilite/companies/${id}/${endpoint}`, { headers: hdr });
      if (!res.ok) { alert('Génération PDF impossible.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } finally { setDl(false); }
  };

  if (!d) return <Loading />;
  const l = d.liasse || {};
  return (
    <div className="bg-white rounded-2xl ring-1 ring-[#EAEAEA] p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[15px] font-semibold text-[#1D1D1F]" style={{ fontFamily: "'Sora','Inter',system-ui,sans-serif" }}>Liasse fiscale {l.exercice}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => dlPdf(`liasse/2033-pdf`, `2033-SD-${l.exercice || ''}.pdf`)} disabled={dl} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-[#0066CC] text-white disabled:opacity-50">
            {dl ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} 2033-SD officiel rempli
          </button>
          <button onClick={() => dlPdf(`liasse/bilan-synthetique-pdf`, `bilan-${l.exercice || ''}.pdf`)} disabled={dl} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-white ring-1 ring-black/10 text-[#1D1D1F] disabled:opacity-50">
            <Download className="h-4 w-4" /> Bilan (synthèse)
          </button>
          <button onClick={() => dlPdf(`liasse/cr-synthetique-pdf`, `compte-resultat-${l.exercice || ''}.pdf`)} disabled={dl} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-white ring-1 ring-black/10 text-[#1D1D1F] disabled:opacity-50">
            <Download className="h-4 w-4" /> Compte de résultat (synthèse)
          </button>
          <button onClick={() => dlPdf(`liasse/pdf`, `liasse-synthese-${l.exercice || ''}.pdf`)} disabled={dl} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-white ring-1 ring-black/10 text-[#1D1D1F] disabled:opacity-50">
            <Download className="h-4 w-4" /> Synthèse
          </button>
        </div>
      </div>
      <div className="text-[12px] text-[#71717A] bg-[#0066CC]/5 rounded-xl px-3.5 py-2.5">
        📄 Le <b>2033-SD officiel</b> (bouton ci-dessus) contient le <b>bilan (page 1)</b> ET le <b>compte de résultat (page 2)</b>, pré-remplis et équilibrés à partir de tes écritures + du solde bancaire Qonto au 31/12.
      </div>
      {!d.liasse_prete && (() => {
        const blk = (d.checklist?.steps || []).filter((s: any) => s.blocking && !s.done);
        return (
          <div className="bg-[#FF9F0A]/10 rounded-xl px-3.5 py-3 text-[13px]">
            <div className="flex items-center gap-2 text-[#b5740a] font-semibold mb-2"><AlertTriangle className="h-4 w-4" /> Il reste {blk.length} étape{blk.length > 1 ? 's' : ''} avant de générer la liasse officielle :</div>
            <ul className="space-y-1.5 mb-3">
              {blk.map((s: any) => (
                <li key={s.key} className="flex items-start gap-2">
                  <Circle className="h-3.5 w-3.5 text-[#b5740a] mt-0.5 shrink-0" />
                  <span><b className="text-[#1D1D1F]">{s.label}</b>{s.detail ? <span className="text-[#71717A]"> — {s.detail}</span> : null}</span>
                </li>
              ))}
            </ul>
            <button onClick={onGoTransactions} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1F] text-white font-semibold text-[13px]">{blk[0]?.label || 'Voir les transactions'} →</button>
          </div>
        );
      })()}
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
        <Row k="Entreprise" v={l.entreprise} /><Row k="Régime" v={`${l.regime_fiscal}${l.categorie_ir ? ' / ' + l.categorie_ir : ''}`} />
        <Row k="Exercice" v={l.exercice} /><Row k="Formulaires" v={(l.formulaires || []).join(', ')} />
        <Row k="Chiffre d'affaires" v={euro(l.chiffre_affaires)} /><Row k="Charges" v={euro(l.charges)} />
        <Row k="Résultat comptable" v={euro(l.resultat_comptable)} />
        {l.resultat_fiscal != null && <Row k="Résultat fiscal" v={euro(l.resultat_fiscal)} />}
        {l.impot_estime != null && <Row k="IS estimé" v={euro(l.impot_estime)} />}
        {l.benefice_imposable != null && <Row k="Bénéfice imposable" v={euro(l.benefice_imposable)} />}
      </div>
      {l.note && <p className="text-[12px] text-[#71717A]">{l.note}</p>}
    </div>
  );
}

/* =============================== Documents (hub exports) =============================== */
/* Suivi des déclarations & dépôts : statut, échéance, accusé de réception attaché. */
function DeclarationsTracker({ id, hdr, hdrJson }: any) {
  const [decls, setDecls] = useState<any[]>([]);
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/comptabilite/companies/${id}/declarations`, { headers: hdr }).then(r => r.json());
    setDecls(r.declarations || []);
  }, [id, hdr]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (d: any) => {
    setBusy(d._id);
    try {
      await fetch(`/api/admin/comptabilite/companies/${id}/declarations/${d._id}`, { method: 'PATCH', headers: hdrJson, body: JSON.stringify({ status: d.status === 'depose' ? 'a_faire' : 'depose' }) });
      await load();
    } finally { setBusy(''); }
  };
  const attach = async (d: any, file: File) => {
    setBusy(d._id);
    try {
      const fd = new FormData(); fd.append('file', file);
      await fetch(`/api/admin/comptabilite/companies/${id}/declarations/${d._id}/document`, { method: 'POST', headers: hdr, body: fd });
      await load();
    } finally { setBusy(''); }
  };
  const dlDoc = async (d: any) => {
    const res = await fetch(`/api/admin/comptabilite/companies/${id}/declarations/${d._id}/document`, { headers: hdr });
    if (!res.ok) { alert('Aucun document.'); return; }
    const blob = await res.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = d.document?.filename || 'accuse.pdf';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  const fmtD = (s?: string) => s ? new Date(s).toLocaleDateString('fr-FR') : '';
  return (
    <div className="bg-white rounded-2xl ring-1 ring-[#EAEAEA] overflow-hidden">
      <div className="px-4 py-2.5 text-[13px] font-semibold text-[#1D1D1F] border-b border-black/5 bg-black/[0.02]">Suivi des déclarations & dépôts</div>
      {decls.map((d, i) => (
        <div key={d._id} className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-black/5' : ''}`}>
          {d.status === 'depose' ? <CheckCircle2 className="h-5 w-5 text-[#1a8a3b] shrink-0" /> : <Circle className="h-5 w-5 text-[#C7C7CC] shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[#1D1D1F]">{d.label}</div>
            <div className="text-[12px] text-[#71717A]">
              {d.status === 'depose'
                ? <>Déposé{d.depose_le ? ' le ' + fmtD(d.depose_le) : ''}{d.numero_depot ? ' · ' + d.numero_depot : ''}</>
                : <>À faire{d.echeance ? ' · échéance ' + fmtD(d.echeance) : ''}</>}
              {d.has_document && <span className="text-[#1a8a3b]"> · accusé joint ✓</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {d.has_document && (
              <button onClick={() => dlDoc(d)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-white ring-1 ring-black/10 text-[#1D1D1F]"><Download className="h-3.5 w-3.5" />Accusé</button>
            )}
            <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-white ring-1 ring-black/10 text-[#1D1D1F] cursor-pointer">
              <Paperclip className="h-3.5 w-3.5" />{d.has_document ? 'Remplacer' : 'Joindre accusé'}
              <input type="file" className="hidden" accept=".pdf,image/*" onChange={e => e.target.files?.[0] && attach(d, e.target.files[0])} />
            </label>
            <button onClick={() => toggle(d)} disabled={busy === d._id} className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold ${d.status === 'depose' ? 'bg-white ring-1 ring-black/10 text-[#71717A]' : 'bg-[#1D1D1F] text-white'} disabled:opacity-50`}>
              {busy === d._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : d.status === 'depose' ? 'Rouvrir' : 'Marquer déposé'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Documents({ id, hdr, hdrJson, company }: any) {
  const [dl, setDl] = useState('');
  const download = async (endpoint: string, name: string) => {
    setDl(name);
    try {
      const res = await fetch(`/api/admin/comptabilite/companies/${id}/${endpoint}`, { headers: hdr });
      if (!res.ok) { alert('Téléchargement impossible.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } finally { setDl(''); }
  };
  const y = company?.exercice?.annee_courante || 2025;
  const sections = [
    { title: 'Comptabilité', items: [
      { label: 'Grand Livre', desc: 'Toutes les écritures détaillées par compte (CSV)', ep: 'export/grand-livre', name: `grand-livre-${y}.csv` },
      { label: 'Balance', desc: 'Totaux débit / crédit et solde par compte (CSV)', ep: 'export/balance', name: `balance-${y}.csv` },
      { label: 'FEC', desc: 'Fichier des Écritures Comptables - format officiel DGFiP', ep: 'export/fec', name: `FEC-${y}.txt` },
    ]},
    { title: 'Déclarations fiscales', items: [
      { label: 'Liasse 2033-SD (officiel rempli)', desc: 'Bilan + compte de résultat sur le Cerfa officiel', ep: 'liasse/2033-pdf', name: `2033-SD-${y}.pdf` },
      (company?.regime_fiscal === 'IR'
        ? { label: 'Déclaration BIC 2031-SD (officiel rempli)', desc: 'Déclaration de résultat BIC (impôt sur le revenu)', ep: 'liasse/2031-pdf', name: `2031-SD-${y}.pdf` }
        : { label: 'Déclaration IS 2065-SD (officiel rempli)', desc: 'Déclaration de résultat impôt sur les sociétés', ep: 'liasse/2065-pdf', name: `2065-SD-${y}.pdf` }),
      { label: 'Bilan & Compte de résultat (synthèse)', desc: 'Synthèse PDF lisible', ep: 'liasse/pdf', name: `synthese-${y}.pdf` },
    ]},
  ];
  return (
    <div className="space-y-4">
      <DeclarationsTracker id={id} hdr={hdr} hdrJson={hdrJson} />
      {sections.map(sec => (
        <div key={sec.title} className="bg-white rounded-2xl ring-1 ring-[#EAEAEA] overflow-hidden">
          <div className="px-4 py-2.5 text-[13px] font-semibold text-[#1D1D1F] border-b border-black/5 bg-black/[0.02]">{sec.title}</div>
          {sec.items.map((it, i) => (
            <div key={it.label} className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-black/5' : ''}`}>
              <FileText className="h-5 w-5 text-[#71717A] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#1D1D1F]">{it.label}</div>
                <div className="text-[12px] text-[#71717A]">{it.desc}</div>
              </div>
              <button onClick={() => download(it.ep, it.name)} disabled={dl === it.name} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold bg-[#1D1D1F] text-white disabled:opacity-50">
                {dl === it.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Télécharger
              </button>
            </div>
          ))}
        </div>
      ))}
      <div className="text-[12px] text-[#71717A] bg-[#0066CC]/5 rounded-xl px-3.5 py-2.5">
        📁 Grand Livre, Balance et FEC sont générés automatiquement depuis tes écritures catégorisées (partie double). Le <b>FEC</b> respecte le format officiel DGFiP (art. A47 A-1).
      </div>
    </div>
  );
}

/* =============================== Checklist =============================== */
function Checklist({ chk, id, hdrJson, atteste, onDone }: any) {
  const steps = chk.steps || [];
  const [busy, setBusy] = useState(false);
  const attester = async () => {
    setBusy(true);
    try {
      await fetch(`/api/admin/comptabilite/companies/${id}/justificatifs-atteste`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ atteste: true }) });
      onDone?.();
    } finally { setBusy(false); }
  };
  return (
    <div className="bg-white rounded-2xl ring-1 ring-[#EAEAEA] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[15px] font-semibold text-[#1D1D1F] flex items-center gap-2"><FileText className="h-4 w-4" /> Route vers la liasse fiscale</div>
        <div className="text-[13px] text-[#71717A]">{chk.progress ?? 0}%</div>
      </div>
      <div className="h-1.5 rounded-full bg-black/5 mb-4 overflow-hidden"><div className="h-full bg-[#1D1D1F]" style={{ width: `${chk.progress ?? 0}%` }} /></div>
      <div className="space-y-1.5">
        {steps.map((s: any) => (
          <div key={s.key} className="flex items-center gap-2.5 text-[13px]">
            {s.done ? <CheckCircle2 className="h-4 w-4 text-[#1a8a3b] shrink-0" /> : <Circle className="h-4 w-4 text-[#C7C7CC] shrink-0" />}
            <span className={s.done ? 'text-[#71717A] line-through' : 'text-[#1D1D1F] font-medium'}>{s.label}</span>
            {!s.done && s.blocking && <span className="text-[10px] uppercase tracking-wide bg-[#FF3B30]/10 text-[#FF3B30] px-1.5 py-0.5 rounded-full">requis</span>}
            {s.key === 'justificatifs' && !s.done && id && <button onClick={attester} disabled={busy} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#1D1D1F] text-white disabled:opacity-50">{busy ? '…' : "J'atteste avoir tout"}</button>}
            <span className="text-[#71717A] ml-auto">{s.detail}</span>
          </div>
        ))}
      </div>
      {chk.liasse_prete && <div className="mt-4 text-[13px] text-[#1a8a3b] flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Prêt à générer la liasse officielle.</div>}

      {/* Après la clôture : dépôts officiels sur impots.gouv.fr (l'app ne dépose pas). */}
      {chk.post_cloture?.length > 0 && (
        <div className={`mt-4 pt-3 border-t border-black/5 ${chk.cloture_faite ? '' : 'opacity-55'}`}>
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <div className="text-[12px] font-semibold text-[#1D1D1F]">Après la clôture — à déposer sur le site des impôts</div>
            <a href={chk.impots_pro_url} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] font-semibold text-white bg-[#0066CC] px-2.5 py-1 rounded-full inline-flex items-center gap-1">impots.gouv.fr →</a>
          </div>
          {!chk.cloture_faite && <div className="text-[11px] text-[#71717A] mb-2">Clôturez d'abord l'exercice, puis déposez ces déclarations sur impots.gouv.fr.</div>}
          <div className="space-y-1.5">
            {chk.post_cloture.map((s: any) => (
              <div key={s.key} className="flex items-center gap-2.5 text-[13px]">
                {s.done ? <CheckCircle2 className="h-4 w-4 text-[#1a8a3b] shrink-0" /> : <Circle className="h-4 w-4 text-[#C7C7CC] shrink-0" />}
                <a href={s.link} target="_blank" rel="noreferrer" className={s.done ? 'text-[#71717A] line-through' : 'text-[#1D1D1F] font-medium hover:underline'}>{s.label}</a>
                <span className="text-[#71717A] ml-auto">{s.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================== Modales =============================== */
function NewCompanyModal({ hdrJson, onClose, onCreated }: any) {
  const [f, setF] = useState<any>({ name: '', forme: 'SAS', regime_fiscal: 'IS', regime_tva: 'reel_normal', exercice: { annee_courante: new Date().getFullYear(), mois_cloture: 12 } });
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [filled, setFilled] = useState(false);

  // Recherche Sirene officielle (SIREN, SIRET ou nom) -> auto-remplissage.
  const search = async () => {
    if (!q.trim()) return;
    setSearching(true); setResults(null);
    try {
      const r = await fetch(`/api/admin/comptabilite/entreprise-lookup?q=${encodeURIComponent(q.trim())}`, { headers: hdrJson }).then(r => r.json());
      setResults(r.results || []);
    } catch { setResults([]); } finally { setSearching(false); }
  };
  const pick = (r: any) => {
    setF((prev: any) => ({
      ...prev,
      name: r.name, siren: r.siren, siret: r.siret, tva_intra: r.tva_intra,
      code_ape: r.code_ape, libelle_ape: r.libelle_ape, adresse: r.adresse,
      code_postal: r.code_postal, ville: r.ville, date_creation: r.date_creation,
      forme: r.forme || prev.forme,
    }));
    setResults(null); setFilled(true);
  };

  const save = async () => {
    if (!f.name) return;
    const r = await fetch('/api/admin/comptabilite/companies', { method: 'POST', headers: hdrJson, body: JSON.stringify(f) }).then(r => r.json());
    if (r.company) onCreated(r.company._id);
  };
  return (
    <Modal title="Nouvelle entreprise" onClose={onClose}>
      {/* Recherche officielle par SIREN / SIRET / nom */}
      <div className="mb-3">
        <span className="block text-[12px] font-semibold text-[#71717A] mb-1">SIREN, SIRET ou nom</span>
        <div className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} className={inp} placeholder="ex. 552081317 ou « Ma Société »" />
          <button onClick={search} disabled={searching} className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#1D1D1F] text-white disabled:opacity-50">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Rechercher
          </button>
        </div>
        {results && results.length > 0 && (
          <div className="mt-2 rounded-xl ring-1 ring-black/10 overflow-hidden bg-white">
            {results.map((r, i) => (
              <button key={i} onClick={() => pick(r)} className={`w-full text-left px-3 py-2 hover:bg-black/5 ${i ? 'border-t border-black/5' : ''}`}>
                <div className="text-[13px] font-semibold text-[#1D1D1F]">{r.name} {r.etat === 'C' && <span className="text-[#FF3B30] text-[11px]">(cessée)</span>}</div>
                <div className="text-[11px] text-[#71717A]">SIREN {r.siren} · {r.forme} · {r.ville || ''} {r.code_ape ? '· APE ' + r.code_ape : ''}</div>
              </button>
            ))}
          </div>
        )}
        {results && results.length === 0 && <div className="mt-2 text-[12px] text-[#71717A]">Aucun résultat. Saisis les infos manuellement ci-dessous.</div>}
      </div>

      {filled && (
        <div className="mb-3 text-[12px] text-[#1a8a3b] bg-[#34C759]/10 rounded-xl px-3 py-2 flex items-start gap-1.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Infos officielles récupérées : SIRET {f.siret || '-'}, TVA {f.tva_intra || '-'}{f.adresse ? ', ' + f.adresse : ''}.</span>
        </div>
      )}

      <Field label="Nom"><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className={inp} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="SIREN"><input value={f.siren || ''} onChange={e => setF({ ...f, siren: e.target.value })} className={inp} /></Field>
        <Field label="N° TVA intra"><input value={f.tva_intra || ''} onChange={e => setF({ ...f, tva_intra: e.target.value })} className={inp} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Forme"><select value={f.forme} onChange={e => setF({ ...f, forme: e.target.value })} className={inp}>{['EI', 'EURL', 'SARL', 'SAS', 'SASU', 'SCI', 'autre'].map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Régime fiscal"><select value={f.regime_fiscal} onChange={e => setF({ ...f, regime_fiscal: e.target.value })} className={inp}><option value="IS">IS</option><option value="IR">IR</option></select></Field>
        <Field label="Régime TVA"><select value={f.regime_tva} onChange={e => setF({ ...f, regime_tva: e.target.value })} className={inp}><option value="franchise">Franchise</option><option value="reel_simplifie">Réel simplifié</option><option value="reel_normal">Réel normal</option></select></Field>
        <Field label="Année exercice"><input type="number" value={f.exercice.annee_courante} onChange={e => setF({ ...f, exercice: { ...f.exercice, annee_courante: +e.target.value } })} className={inp} /></Field>
      </div>
      <button onClick={save} className="mt-2 w-full py-2.5 rounded-full text-[14px] font-semibold bg-[#1D1D1F] text-white">Créer</button>
    </Modal>
  );
}

function QontoModal({ id, hdrJson, onClose, onDone }: any) {
  const [f, setF] = useState<any>({ org_slug: '', secret_key: '', iban: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const connect = async () => {
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/admin/comptabilite/companies/${id}/qonto/connect`, { method: 'POST', headers: hdrJson, body: JSON.stringify(f) }).then(r => r.json());
      if (r.error) setErr(r.detail || r.error); else onDone();
    } finally { setBusy(false); }
  };
  return (
    <Modal title="Connexion Qonto" onClose={onClose}>
      <p className="text-[12px] text-[#71717A] mb-1">Clé API Qonto (Paramètres → Intégrations → API) : identifiant d'organisation + clé secrète.</p>
      <Field label="Identifiant organisation (slug)"><input value={f.org_slug} onChange={e => setF({ ...f, org_slug: e.target.value })} className={inp} placeholder="mon-entreprise-1234" /></Field>
      <Field label="Clé secrète"><input value={f.secret_key} onChange={e => setF({ ...f, secret_key: e.target.value })} className={inp} type="password" /></Field>
      <Field label="IBAN (optionnel)"><input value={f.iban} onChange={e => setF({ ...f, iban: e.target.value })} className={inp} placeholder="laisser vide = compte principal" /></Field>
      {err && <div className="text-[12px] text-[#FF3B30]">{err}</div>}
      <button onClick={connect} disabled={busy} className="mt-2 w-full py-2.5 rounded-full text-[14px] font-semibold bg-[#1D1D1F] text-white disabled:opacity-50 inline-flex items-center justify-center gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Connecter</button>
    </Modal>
  );
}

// Report à nouveau = reprise de la compta de l'année précédente (bilan d'ouverture).
function ReportModal({ id, company, hdrJson, onClose, onDone }: any) {
  const [annee, setAnnee] = useState<number>((company?.exercice?.annee_courante || new Date().getFullYear()) - 1);
  const [comptes, setComptes] = useState<any[]>(company?.report_a_nouveau?.comptes?.length ? company.report_a_nouveau.comptes : [{ account: '', label: '', solde: 0 }]);
  const upd = (i: number, k: string, v: any) => setComptes(cs => cs.map((c, j) => j === i ? { ...c, [k]: v } : c));
  const save = async () => {
    const clean = comptes.filter(c => c.account || c.label);
    await fetch(`/api/admin/comptabilite/companies/${id}/report`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ annee, comptes: clean }) });
    onDone();
  };
  return (
    <Modal title="Report à nouveau (année précédente)" onClose={onClose}>
      <p className="text-[12px] text-[#71717A] mb-2">Soldes de clôture N-1 (bilan d'ouverture) : capital, report bénéficiaire, emprunts, immobilisations, trésorerie…</p>
      <Field label="Année reprise"><input type="number" value={annee} onChange={e => setAnnee(+e.target.value)} className={inp} /></Field>
      <div className="space-y-2 mb-2">
        {comptes.map((c, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={c.account} onChange={e => upd(i, 'account', e.target.value)} placeholder="Compte" className={`${inp} w-20`} />
            <input value={c.label} onChange={e => upd(i, 'label', e.target.value)} placeholder="Libellé" className={`${inp} flex-1`} />
            <input type="number" value={c.solde} onChange={e => upd(i, 'solde', +e.target.value)} placeholder="Solde" className={`${inp} w-28`} />
            <button onClick={() => setComptes(cs => cs.filter((_, j) => j !== i))} className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-full hover:bg-black/5 text-[#71717A]"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <button onClick={() => setComptes(cs => [...cs, { account: '', label: '', solde: 0 }])} className="text-[12px] font-semibold text-[#1D1D1F] inline-flex items-center gap-1 mb-3"><PlusIcon className="h-3.5 w-3.5" />Ajouter une ligne</button>
      <button onClick={save} className="w-full py-2.5 rounded-full text-[14px] font-semibold bg-[#1D1D1F] text-white">Enregistrer le report</button>
    </Modal>
  );
}

// Saisie manuelle d'une écriture (espèces, apport, écriture hors Qonto).
function ManualEntryModal({ id, groups, hdrJson, onClose, onDone }: any) {
  const [f, setF] = useState<any>({ date: new Date().toISOString().slice(0, 10), label: '', counterparty: '', amount: '', category_key: '' });
  const save = async () => {
    if (!f.label || !f.amount) return;
    await fetch(`/api/admin/comptabilite/companies/${id}/entries`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ ...f, amount: Number(f.amount) }) });
    onDone();
  };
  return (
    <Modal title="Écriture manuelle" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} className={inp} /></Field>
        <Field label="Montant (€, négatif = dépense)"><input type="number" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} className={inp} placeholder="-120.00" /></Field>
      </div>
      <Field label="Libellé"><input value={f.label} onChange={e => setF({ ...f, label: e.target.value })} className={inp} /></Field>
      <Field label="Tiers"><input value={f.counterparty} onChange={e => setF({ ...f, counterparty: e.target.value })} className={inp} /></Field>
      <Field label="Catégorie">
        <select value={f.category_key} onChange={e => setF({ ...f, category_key: e.target.value })} className={inp}>
          <option value="">À catégoriser…</option>
          {groups.map((g: Group) => <optgroup key={g.key} label={g.label}>{g.items.map(it => <option key={it.key} value={it.key}>{it.label}</option>)}</optgroup>)}
        </select>
      </Field>
      <button onClick={save} className="mt-2 w-full py-2.5 rounded-full text-[14px] font-semibold bg-[#1D1D1F] text-white">Ajouter</button>
    </Modal>
  );
}

/* =============================== Primitives =============================== */
function Kpi({ icon, label, value, tone }: any) {
  const t = tone === 'pos' ? 'text-[#1a8a3b]' : tone === 'neg' ? 'text-[#1D1D1F]' : 'text-[#1D1D1F]';
  return (
    <div className="bg-white rounded-2xl ring-1 ring-[#EAEAEA] p-4">
      <div className="flex items-center gap-1.5 text-[12px] text-[#71717A] mb-1.5">{icon}{label}</div>
      <div className={`text-[22px] font-semibold tabular-nums ${t}`} style={{ fontFamily: "'Sora','Inter',system-ui,sans-serif" }}>{value}</div>
    </div>
  );
}
const Row = ({ k, v }: any) => <div className="flex justify-between border-b border-black/5 py-1.5"><span className="text-[#71717A]">{k}</span><span className="font-semibold text-[#1D1D1F]">{v}</span></div>;
const Field = ({ label, children }: any) => <label className="block mb-2.5"><span className="block text-[12px] font-semibold text-[#71717A] mb-1">{label}</span>{children}</label>;
const Loading = () => <div className="flex items-center justify-center py-16 text-[#71717A]"><Loader2 className="h-5 w-5 animate-spin" /></div>;
const Info = ({ text }: any) => <div className="bg-white rounded-2xl ring-1 ring-[#EAEAEA] p-6 text-[13px] text-[#71717A] text-center">{text}</div>;
const Empty = ({ onNew }: any) => (
  <div className="bg-white rounded-2xl ring-1 ring-[#EAEAEA] p-12 text-center">
    <Building2 className="h-8 w-8 mx-auto text-[#C7C7CC] mb-3" />
    <p className="text-[14px] text-[#1D1D1F] font-semibold mb-1">Aucune entreprise</p>
    <p className="text-[13px] text-[#71717A] mb-4">Créez une entreprise pour démarrer sa comptabilité.</p>
    <button onClick={onNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-[#1D1D1F] text-white"><Plus className="h-4 w-4" /> Nouvelle entreprise</button>
  </div>
);
function Modal({ title, onClose, children }: any) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShow(true));
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onEsc);
    return () => { cancelAnimationFrame(r); window.removeEventListener('keydown', onEsc); };
  }, [onClose]);
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${show ? 'bg-black/50 backdrop-blur-[3px]' : 'bg-black/0'}`}
      onClick={onClose}
    >
      <div
        className={`bg-[#FBFBFD] rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-auto shadow-2xl transition-all duration-300 ease-out ${show ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-semibold text-[#1D1D1F]" style={{ fontFamily: "'Sora','Inter',system-ui,sans-serif" }}>{title}</h3>
          <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-black/5"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
