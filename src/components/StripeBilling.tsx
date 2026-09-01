/**
 * Facturation Stripe (admin) - MULTI-COMPTES. Sélecteur de compte, liste clients
 * façon dashboard Stripe (carte Visa/MC affichée), fiche client détaillée (nom,
 * total dépensé, historique paiements), et débit off-session (montant + motif).
 * @author Rabah Ziane · 2026-07-09
 */
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, CreditCard, Search, CheckCircle2, AlertTriangle, XCircle, KeyRound, RefreshCw, Plus } from 'lucide-react';

const inp = 'px-3 py-2 rounded-lg border border-black/10 text-[13px] bg-white focus:outline-none focus:border-black/30';
const fdate = (u: number) => new Date(u * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const money = (n: number, c = 'EUR') => (n || 0).toLocaleString('fr-FR', { style: 'currency', currency: c }).replace(/ | /g, ' ');
const BRAND: Record<string, string> = { visa: 'bg-[#1a1f71] text-white', mastercard: 'bg-[#eb001b] text-white', amex: 'bg-[#2e77bc] text-white', discover: 'bg-[#ff6000] text-white', diners: 'bg-[#0079be] text-white', jcb: 'bg-[#0b4ea2] text-white', unionpay: 'bg-[#e21836] text-white' };
function Card({ card }: { card: any }) {
  if (!card) return <span className="text-[12px] text-[#c0271d]">— aucune carte</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#1D1D1F]">
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide ${BRAND[card.brand] || 'bg-black/70 text-white'}`}>{(card.brand || 'CARD').toUpperCase()}</span>
      •• {card.last4}
    </span>
  );
}

export default function StripeBilling({ secret }: { secret: string }) {
  const hdr = { 'x-admin-secret': secret } as any;
  const hdrJson = { 'x-admin-secret': secret, 'Content-Type': 'application/json' } as any;

  const [accounts, setAccounts] = useState<any[]>([]);
  const [account, setAccount] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const accRef = useRef('');
  const [q, setQ] = useState('');
  const [withCard, setWithCard] = useState(false);
  const [sel, setSel] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [motif, setMotif] = useState('');
  const [charging, setCharging] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [showBulk, setShowBulk] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkMotif, setBulkMotif] = useState('');
  const [bulkExcludeShared, setBulkExcludeShared] = useState(true);
  const [bulkProgress, setBulkProgress] = useState<any>(null);
  const [bulkStarting, setBulkStarting] = useState(false);
  const [optOuting, setOptOuting] = useState(false);
  const [showOps, setShowOps] = useState(false);
  const [ops, setOps] = useState<any[]>([]);
  const [opsLoading, setOpsLoading] = useState(false);
  const [refundingId, setRefundingId] = useState('');
  const [refundingAll, setRefundingAll] = useState(false); // remboursement en masse en cours. @Rabah 2026-07-17
  const [opsHideFailed, setOpsHideFailed] = useState(true);
  const [opsDate, setOpsDate] = useState(''); // calendrier : jour sélectionné (YYYY-MM-DD). @Rabah 2026-07-17

  const loadAccounts = async () => {
    const r = await fetch('/api/admin/stripe/accounts', { headers: hdr }).then(r => r.json()).catch(() => null);
    const list = r?.accounts || []; setAccounts(list);
    if (list.length && !account) setAccount(list[0].id);
    return list;
  };
  const loadCustomers = async (acc: string, poll = false) => {
    if (!acc) return;
    if (!poll) { setLoading(true); setSel(null); setDetail(null); setResult(null); }
    const r = await fetch(`/api/admin/stripe/customers?account=${acc}`, { headers: hdr }).then(r => r.json()).catch(() => ({ error: 'reseau' }));
    if (accRef.current !== acc) return; // compte changé -> on abandonne ce chargement
    if (r.error) { alert('Stripe : ' + (r.detail || r.error)); setAll([]); setLoading(false); setScanning(false); return; }
    if (r.scanning) { setScanning(true); setLoading(false); setTimeout(() => { if (accRef.current === acc) loadCustomers(acc, true); }, 5000); return; }
    setScanning(false); setLoading(false); setAll(r.customers || []);
  };
  useEffect(() => { accRef.current = account; }, [account]);
  useEffect(() => { loadAccounts(); }, []); // eslint-disable-line
  useEffect(() => { if (account) loadCustomers(account); }, [account]); // eslint-disable-line

  const addAccount = async () => {
    if (!keyInput.trim()) return; setSaving(true);
    try {
      const r = await fetch('/api/admin/stripe/accounts', { method: 'POST', headers: hdrJson, body: JSON.stringify({ secret_key: keyInput.trim(), label: labelInput.trim() }) }).then(r => r.json());
      if (r.error) alert('Clé refusée : ' + (r.detail || r.error));
      else { setKeyInput(''); setLabelInput(''); setShowAdd(false); await loadAccounts(); setAccount(r.id); }
    } finally { setSaving(false); }
  };

  const select = async (c: any) => {
    setSel(c); setDetail(null); setResult(null); setDetailLoading(true);
    try {
      const r = await fetch(`/api/admin/stripe/customers/${c.id}/detail?account=${account}`, { headers: hdr }).then(r => r.json());
      setDetail(r.error ? null : r);
    } finally { setDetailLoading(false); }
  };

  const charge = async () => {
    if (!sel || !amount) return;
    const cardTxt = detail?.card ? ` (${detail.card.brand} ••${detail.card.last4})` : '';
    const warn = (sel.sharedCard || sel.dupEmail) ? '\n\n⚠️ ATTENTION : ' + [sel.sharedCard && 'cette carte est partagée avec un autre client', sel.dupEmail && 'cet email existe sur plusieurs comptes'].filter(Boolean).join(' ET ') + ' → risque de double débit.' : '';
    if (!window.confirm(`Débiter ${amount} € sur la carte de ${detail?.name || sel.email}${cardTxt} ?\nMotif : ${motif || '(aucun)'}${warn}`)) return;
    setCharging(true); setResult(null);
    try {
      const r = await fetch('/api/admin/stripe/charge', { method: 'POST', headers: hdrJson, body: JSON.stringify({ account, customerId: sel.id, amount: Number(amount), motif }) }).then(r => r.json());
      setResult(r); if (r.ok) { setAmount(''); setMotif(''); }
    } finally { setCharging(false); }
  };

  const pollBulk = async (jobId: string) => {
    const r = await fetch(`/api/admin/stripe/charge-bulk/${jobId}`, { headers: hdr }).then(r => r.json()).catch(() => null);
    if (r && !r.error) setBulkProgress(r);
    if (r && r.running) setTimeout(() => pollBulk(jobId), 2000);
  };
  const startBulk = async (targets: any[]) => {
    if (!targets.length || !bulkAmount) return;
    const accLabel = accounts.find((a: any) => a.id === account)?.label || '';
    const total = (targets.length * Number(bulkAmount)).toFixed(2);
    if (!window.confirm(`⚠️ DÉBIT EN MASSE\n\nDébiter ${targets.length} clients de ${bulkAmount} € chacun sur le compte « ${accLabel} ».\nTotal : ${total} €\nMotif : ${bulkMotif || '(aucun)'}\n\n⚠️ Tu dois avoir le MANDAT/accord de chaque client. Sinon = chargebacks massifs + blocage Stripe possible.\n\nContinuer ?`)) return;
    if (!window.confirm(`Dernière confirmation : débiter ${targets.length} cartes pour un TOTAL de ${total} € ?`)) return;
    setBulkStarting(true); setBulkProgress(null);
    try {
      const r = await fetch('/api/admin/stripe/charge-bulk', { method: 'POST', headers: hdrJson, body: JSON.stringify({ account, customerIds: targets.map((c: any) => c.id), amount: Number(bulkAmount), motif: bulkMotif }) }).then(r => r.json());
      if (r.error) { alert('Erreur : ' + (r.detail || r.error)); return; }
      pollBulk(r.jobId);
    } finally { setBulkStarting(false); }
  };

  // "Ne plus prélever" (opt-out)
  const setOptout = async (ids: string[], on: boolean) => {
    if (!ids.length) return;
    setOptOuting(true);
    try {
      await fetch('/api/admin/stripe/optout', { method: 'POST', headers: hdrJson, body: JSON.stringify({ account, customerIds: ids, optout: on }) });
      setAll(prev => prev.map((c: any) => ids.includes(c.id) ? { ...c, optout: on } : c));
      setSel((s: any) => s && ids.includes(s.id) ? { ...s, optout: on } : s);
    } finally { setOptOuting(false); }
  };

  // Opérations récentes + remboursement
  const loadOps = async () => {
    if (!account) return;
    setOpsLoading(true);
    try {
      const r = await fetch(`/api/admin/stripe/operations?account=${account}&limit=4000`, { headers: hdr }).then(r => r.json());
      setOps(r.operations || []);
    } finally { setOpsLoading(false); }
  };
  const refund = async (op: any) => {
    const motif = window.prompt(`Rembourser ${op.amount.toLocaleString('fr-FR')} ${op.currency} à ${op.email || op.id}.\n\nIndique le motif du remboursement :`, '');
    if (motif === null) return; // annulé
    setRefundingId(op.id);
    try {
      const r = await fetch('/api/admin/stripe/refund', { method: 'POST', headers: hdrJson, body: JSON.stringify({ account, chargeId: op.id, motif }) }).then(r => r.json());
      if (r.ok) setOps(prev => prev.map((o: any) => o.id === op.id ? { ...o, refunded: o.amount, fully_refunded: true, refund_motif: motif } : o));
      else alert('Échec remboursement : ' + (r.detail || r.error));
    } finally { setRefundingId(''); }
  };
  // Prélèvements remboursables (réussis, non déjà remboursés) d'un ensemble donné. @Rabah 2026-07-17
  const refundableOf = (arr: any[]) => arr.filter((o: any) => o.paid && o.status === 'succeeded' && !o.fully_refunded);
  // Remboursement en masse d'un lot (tous, ou un jour précis). Double garde : confirmation
  // (nombre + montant total) puis motif commun obligatoire, car c'est IRRÉVERSIBLE côté Stripe.
  // Séquentiel (1 charge à la fois) pour éviter le rate-limit Stripe et refléter l'avancement
  // ligne par ligne. @author Rabah Ziane - 2026-07-17
  const runRefundBatch = async (targets: any[], headline: string) => {
    if (!targets.length) { alert('Aucun prélèvement remboursable (déjà remboursés ou échoués).'); return; }
    const cur = targets[0].currency || 'EUR';
    const total = targets.reduce((s: number, o: any) => s + (o.amount - (o.refunded || 0)), 0);
    if (!window.confirm(`⚠️ ${headline}\n${targets.length} prélèvement(s) · ${total.toLocaleString('fr-FR')} ${cur}\n\nCette action est IRRÉVERSIBLE côté Stripe.`)) return;
    const motif = window.prompt('Motif commun du remboursement (obligatoire) :', 'Erreur de prélèvement');
    if (motif === null || !motif.trim()) return; // annulé ou motif vide
    setRefundingAll(true);
    let okCount = 0; const fails: string[] = [];
    try {
      for (const o of targets) {
        setRefundingId(o.id);
        try {
          const r = await fetch('/api/admin/stripe/refund', { method: 'POST', headers: hdrJson, body: JSON.stringify({ account, chargeId: o.id, motif }) }).then(r => r.json());
          if (r.ok) { okCount += 1; setOps(prev => prev.map((x: any) => x.id === o.id ? { ...x, refunded: x.amount, fully_refunded: true, refund_motif: motif } : x)); }
          else fails.push(`${o.email || o.id} : ${r.detail || r.error}`);
        } catch (e: any) { fails.push(`${o.email || o.id} : ${e?.message || 'réseau'}`); }
      }
    } finally { setRefundingId(''); setRefundingAll(false); }
    alert(`Remboursements : ${okCount}/${targets.length} réussis.` + (fails.length ? `\n\nÉchecs :\n${fails.slice(0, 10).join('\n')}` : ''));
  };
  const refundAll = () => runRefundBatch(refundableOf(ops), 'Rembourser TOUS les prélèvements réussis affichés');
  const refundDay = (dayOps: any[], day: string) => runRefundBatch(refundableOf(dayOps), `Rembourser les prélèvements du ${day}`);

  const ql = q.trim().toLowerCase();
  const withCardCount = all.filter((c: any) => c.card).length;
  let filtered = ql ? all.filter(c => (c.name + ' ' + c.email).toLowerCase().includes(ql)) : all;
  if (withCard) filtered = filtered.filter((c: any) => !!c.card);
  const cap = withCard ? 5000 : 500;
  const shown = filtered.slice(0, cap);
  const selIds = Object.keys(selected).filter(id => selected[id]);
  // Cible du débit en masse : la sélection (avec carte), sinon tous les affichés avec carte.
  const bulkBase = selIds.length ? all.filter((c: any) => selected[c.id]) : shown;
  const bulkTargets = bulkBase.filter((c: any) => c.card && !c.optout && (!bulkExcludeShared || !c.sharedCard));
  const shownWithCard = shown.filter((c: any) => c.card);
  const allShownSelected = shownWithCard.length > 0 && shownWithCard.every((c: any) => selected[c.id]);
  const toggleAll = () => { const on = !allShownSelected; setSelected(prev => { const n = { ...prev }; shownWithCard.forEach((c: any) => { n[c.id] = on; }); return n; }); };
  const noAccounts = accounts.length === 0;
  // Panneau opérations. @author Rabah Ziane - 2026-07-17
  const opsShown = opsHideFailed ? ops.filter((o: any) => o.status !== 'failed') : ops;
  const ymd = (unix: number) => unix ? new Date(unix * 1000).toLocaleDateString('en-CA') : ''; // YYYY-MM-DD (heure locale)
  const fmtDay = (s: string) => s ? s.split('-').reverse().join('/') : '';
  // Vue CALENDRIER : une date choisie -> les DÉBITS de ce jour + les REMBOURSEMENTS de ce jour
  // (séparés et clairs). Un débit ancien remboursé ce jour-là apparaît dans "Remboursements".
  const debitsOfDay = opsDate ? opsShown.filter((o: any) => ymd(o.date) === opsDate) : [];
  const refundsOfDay = opsDate ? ops.filter((o: any) => o.refunded_at && ymd(o.refunded_at) === opsDate).slice().sort((a: any, b: any) => (b.refunded_at || 0) - (a.refunded_at || 0)) : [];
  // Sans date : regroupement par date de débit.
  const opsGroups: [string, any[]][] = (() => {
    if (opsDate) return [];
    const m = new Map<string, any[]>();
    for (const o of opsShown) {
      const day = new Date(o.date * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
      if (!m.has(day)) m.set(day, []);
      (m.get(day) as any[]).push(o);
    }
    return [...m.entries()];
  })();
  // Ligne d'opération réutilisée dans les 2 vues. Affiche les 2 dates : débit + remboursement.
  const opRow = (o: any) => (
    <div key={o.id} className="grid grid-cols-[0.9fr_1.4fr_1fr_0.9fr_auto] gap-2 items-center px-4 py-2.5 text-[13px] border-b border-black/5">
      <div className="text-[#86868B] leading-tight">
        <div>Débit {new Date(o.date * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</div>
        {o.refunded_at ? <div className="text-[#c0271d] text-[11px] font-semibold">↩ Remb. {new Date(o.refunded_at * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</div> : null}
      </div>
      <div className="truncate" title={[o.name, o.email, o.motif].filter(Boolean).join(' · ')}>
        <span className="text-[#1D1D1F] font-medium">{o.name || o.email || o.motif || o.id}</span>
        {o.name && o.email && <span className="text-[11px] text-[#86868B] ml-1">· {o.email}</span>}
      </div>
      <div className="text-[#86868B] text-[12px]">{o.card || '—'}</div>
      <div className="font-semibold tabular-nums text-[#1D1D1F]">{o.amount.toLocaleString('fr-FR')} {o.currency}{o.refunded > 0 && <span className="ml-1 text-[11px] text-[#c0271d]">(remb. {o.refunded.toLocaleString('fr-FR')})</span>}</div>
      <div className="text-right flex items-center justify-end gap-2">
        {o.fully_refunded ? (
          <span className="text-[11px] font-semibold text-[#86868B] px-2 py-0.5 rounded-full bg-black/5 whitespace-nowrap">↩ Remboursé</span>
        ) : o.paid && o.status === 'succeeded' ? (
          <>
            <span className="text-[11px] font-semibold text-[#1a8a3b] px-2 py-0.5 rounded-full bg-[#34C759]/12 whitespace-nowrap">✓ Réussi</span>
            <button onClick={() => refund(o)} disabled={refundingId === o.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-[#FF3B30]/10 text-[#c0271d] disabled:opacity-50">{refundingId === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Rembourser</button>
          </>
        ) : (
          <span className="text-[11px] font-semibold text-[#c0271d] px-2 py-0.5 rounded-full bg-[#FF3B30]/10 whitespace-nowrap">Échoué</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl">
      <h1 className="text-[28px] sm:text-[36px] text-[#1D1D1F] mb-1 flex items-center gap-2" style={{ fontFamily: '"Charter","Iowan Old Style",Georgia,serif', fontWeight: 700 }}>
        <CreditCard className="h-7 w-7" /> Facturation Stripe.
      </h1>
      <p className="text-[14px] text-[#86868B] mb-5">Débiter à la demande la carte enregistrée d'un client (montant libre + motif).</p>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        {!noAccounts && (<>
          <span className="text-[12px] text-[#86868B]">Compte Stripe :</span>
          <select value={account} onChange={e => setAccount(e.target.value)} className="px-3 py-2 rounded-full text-[13px] font-semibold bg-white ring-1 ring-black/10 text-[#1D1D1F]">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.label} · {a.masked}</option>)}
          </select>
        </>)}
        <button onClick={() => setShowAdd(v => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-semibold bg-white ring-1 ring-black/10 text-[#1D1D1F]"><Plus className="h-4 w-4" />Ajouter un compte</button>
      </div>

      {(noAccounts || showAdd) && (
        <div className="bg-white rounded-2xl ring-1 ring-black/5 p-5 mb-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1D1D1F] mb-1"><KeyRound className="h-4 w-4" />{noAccounts ? 'Connecter ton compte Stripe' : 'Ajouter un compte Stripe'}</div>
          <p className="text-[12px] text-[#86868B] mb-3">Colle la <b>clé secrète</b> du compte. Stockée sur le serveur, jamais affichée.</p>
          <div className="flex flex-wrap gap-2">
            <input value={labelInput} onChange={e => setLabelInput(e.target.value)} placeholder="Nom (ex. Delivery Eat)" className={inp + ' w-44'} />
            <input value={keyInput} onChange={e => setKeyInput(e.target.value)} type="password" placeholder="sk_live_…" className={inp + ' flex-1 min-w-[220px] font-mono'} />
            <button onClick={addAccount} disabled={saving || !keyInput.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#1D1D1F] text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Enregistrer</button>
            {!noAccounts && <button onClick={() => { setShowAdd(false); setKeyInput(''); setLabelInput(''); }} className="px-3 py-2 rounded-lg text-[13px] font-semibold bg-black/5 text-[#1D1D1F]">Annuler</button>}
          </div>
        </div>
      )}

      {!noAccounts && (<>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3">
            <Search className="h-4 w-4 text-[#86868B]" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher par nom, e-mail…" className="flex-1 py-2 text-[13px] focus:outline-none" />
          </div>
          <button onClick={() => setWithCard(v => !v)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold ring-1 ${withCard ? 'bg-[#1D1D1F] text-white ring-transparent' : 'bg-white ring-black/10 text-[#1D1D1F]'}`}><CreditCard className="h-4 w-4" />Avec carte{withCardCount ? ` (${withCardCount})` : ''}</button>
          <button onClick={() => loadCustomers(account)} disabled={loading} title="Rafraîchir" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold bg-white ring-1 ring-black/10 text-[#1D1D1F] disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button>
        </div>

        {/* Actions */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowBulk(v => !v)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold ring-1 ${showBulk ? 'bg-[#FF3B30] text-white ring-transparent' : 'bg-white ring-black/10 text-[#1D1D1F]'}`}><CreditCard className="h-4 w-4" />Débit en masse…</button>
          <button onClick={() => { setShowOps(v => { if (!v && !ops.length) loadOps(); return !v; }); }} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold ring-1 ${showOps ? 'bg-[#1D1D1F] text-white ring-transparent' : 'bg-white ring-black/10 text-[#1D1D1F]'}`}><RefreshCw className="h-4 w-4" />Opérations récentes</button>
          {selIds.length > 0 && (
            <span className="inline-flex items-center gap-2 text-[12px] text-[#86868B]">
              {selIds.length} sélectionné(s)
              <button onClick={() => setOptout(selIds, true)} disabled={optOuting} className="px-2 py-1 rounded-md bg-[#FF9500]/15 text-[#b5740a] font-semibold disabled:opacity-50">🚫 Ne plus prélever ({selIds.length})</button>
              <button onClick={() => setOptout(selIds, false)} disabled={optOuting} className="px-2 py-1 rounded-md bg-black/5 text-[#1D1D1F] font-semibold disabled:opacity-50">Réautoriser</button>
              <button onClick={() => setSelected({})} className="underline">tout décocher</button>
            </span>
          )}
        </div>

        {/* Opérations récentes */}
        {showOps && (
          <div className="bg-white rounded-2xl ring-1 ring-black/5 overflow-hidden mb-5">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-black/5 flex-wrap">
              <span className="text-[13px] font-semibold text-[#1D1D1F]">{opsDate ? `Opérations du ${fmtDay(opsDate)}` : `Derniers débits · ${opsShown.length} affichés${opsHideFailed ? ` (${ops.length - opsShown.length} échecs masqués)` : ''}`}</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[12px] text-[#86868B]">📅 <input type="date" value={opsDate} onChange={e => setOpsDate(e.target.value)} className="text-[12px] border border-black/10 rounded-md px-2 py-1 text-[#1D1D1F]" title="Choisir un jour précis" /></label>
                {opsDate && <button onClick={() => setOpsDate('')} className="text-[12px] text-[#86868B] underline">Tout voir</button>}
                {!opsDate && <label className="flex items-center gap-1.5 text-[12px] text-[#86868B] cursor-pointer"><input type="checkbox" checked={opsHideFailed} onChange={e => setOpsHideFailed(e.target.checked)} />Masquer les échecs</label>}
                {ops.some((o: any) => o.paid && o.status === 'succeeded' && !o.fully_refunded) && (
                  <button onClick={refundAll} disabled={refundingAll || opsLoading} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-[#FF3B30] text-white disabled:opacity-50" title="Rembourser tous les prélèvements réussis (irréversible)">{refundingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Rembourser tous ({ops.filter((o: any) => o.paid && o.status === 'succeeded' && !o.fully_refunded).length})</button>
                )}
                <button onClick={loadOps} disabled={opsLoading} className="inline-flex items-center gap-1 text-[12px] text-[#86868B]">{opsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Actualiser</button>
              </div>
            </div>
            <div className="max-h-[360px] overflow-auto">
              {opsLoading && <div className="px-4 py-6 text-center text-[13px] text-[#86868B]"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Chargement…</div>}

              {/* VUE CALENDRIER : un jour choisi -> Débits de ce jour + Remboursements de ce jour. @Rabah 2026-07-17 */}
              {!opsLoading && opsDate && (
                <>
                  <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-[#F5F5F7] border-b border-black/5 sticky top-0 z-[1]">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#86868B]">Débits du {fmtDay(opsDate)} · {debitsOfDay.length} · <span className="normal-case font-semibold text-[#1D1D1F]">{debitsOfDay.reduce((s: number, o: any) => s + o.amount, 0).toLocaleString('fr-FR')} €</span></span>
                  </div>
                  {debitsOfDay.length === 0 && <div className="px-4 py-3 text-[12px] text-[#86868B]">Aucun débit ce jour.</div>}
                  {debitsOfDay.map(opRow)}
                  <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-[#FF3B30]/8 border-y border-black/5 sticky top-0 z-[1]">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#c0271d]">↩ Remboursements du {fmtDay(opsDate)} · {refundsOfDay.length} · <span className="normal-case font-semibold">{refundsOfDay.reduce((s: number, o: any) => s + (o.refunded || o.amount), 0).toLocaleString('fr-FR')} €</span></span>
                  </div>
                  {refundsOfDay.length === 0 && <div className="px-4 py-3 text-[12px] text-[#86868B]">Aucun remboursement ce jour.</div>}
                  {refundsOfDay.map(opRow)}
                </>
              )}

              {/* VUE PAR DÉFAUT : débits groupés par date de débit. */}
              {!opsLoading && !opsDate && opsShown.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-[#86868B]">Aucune opération{opsHideFailed ? ' (hors échecs)' : ''}.</div>}
              {!opsLoading && !opsDate && opsGroups.map(([day, items]) => {
                const dayRefundable = refundableOf(items);
                const dayTotal = items.reduce((s: number, o: any) => s + o.amount, 0);
                return (
                  <div key={day}>
                    <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-[#F5F5F7] border-b border-black/5 sticky top-0 z-[1]">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-[#86868B]">{day} · {items.length} op. · <span className="normal-case font-semibold text-[#1D1D1F]">{dayTotal.toLocaleString('fr-FR')} {items[0].currency}</span></span>
                      {dayRefundable.length > 0 && (
                        <button onClick={() => refundDay(items, day)} disabled={refundingAll} className="text-[11px] font-semibold text-[#c0271d] px-2 py-0.5 rounded bg-[#FF3B30]/10 disabled:opacity-50 whitespace-nowrap">Rembourser ce jour ({dayRefundable.length})</button>
                      )}
                    </div>
                    {items.map(opRow)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {showBulk && (
          <div className="bg-white rounded-2xl ring-1 ring-[#FF3B30]/25 p-5 mb-5">
            <div className="flex items-start gap-2 text-[12px] text-[#c0271d] bg-[#FF3B30]/8 rounded-xl px-3.5 py-2.5 mb-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /><span>Débite les <b>clients sélectionnés</b> (ou tous les affichés avec carte si aucune sélection). Assure-toi d'avoir le <b>mandat/accord</b> de chaque client - sinon chargebacks massifs et blocage Stripe possibles. Traité par lots.</span>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div><label className="block text-[11px] text-[#86868B] mb-1">Montant / client (€)</label><input value={bulkAmount} onChange={e => setBulkAmount(e.target.value)} type="number" step="0.01" min="0.5" placeholder="0,00" className={inp + ' w-32'} /></div>
              <div className="flex-1 min-w-[220px]"><label className="block text-[11px] text-[#86868B] mb-1">Motif</label><input value={bulkMotif} onChange={e => setBulkMotif(e.target.value)} placeholder="Ex. Abonnement mensuel" className={inp + ' w-full'} /></div>
            </div>
            <label className="flex items-center gap-1.5 text-[12px] text-[#86868B] mt-2 cursor-pointer"><input type="checkbox" checked={bulkExcludeShared} onChange={e => setBulkExcludeShared(e.target.checked)} />Exclure les cartes partagées (évite de débiter 2× la même carte)</label>
            <div className="mt-3">
              <button onClick={() => startBulk(bulkTargets)} disabled={bulkStarting || !bulkAmount || !bulkTargets.length || bulkProgress?.running} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[14px] font-semibold bg-[#FF3B30] text-white disabled:opacity-40">{bulkStarting || bulkProgress?.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}Débiter {bulkTargets.length} client(s){bulkAmount ? ` · ${(bulkTargets.length * Number(bulkAmount)).toLocaleString('fr-FR')} € total` : ''}</button>
              <span className="ml-2 text-[12px] text-[#86868B]">{selIds.length ? 'depuis ta sélection' : 'tous les affichés avec carte'}</span>
            </div>
            {bulkProgress && (
              <div className="mt-4">
                <div className="h-2 rounded-full bg-black/5 overflow-hidden"><div className="h-full bg-[#1a8a3b] transition-all" style={{ width: `${bulkProgress.total ? Math.round(bulkProgress.done / bulkProgress.total * 100) : 0}%` }} /></div>
                <div className="mt-1.5 text-[12px] text-[#86868B]">{bulkProgress.done}/{bulkProgress.total} traités · <span className="text-[#1a8a3b] font-semibold">{bulkProgress.ok} réussis</span> · <span className="text-[#c0271d] font-semibold">{bulkProgress.failed} échoués</span>{bulkProgress.running ? ' · en cours…' : ' · terminé ✓'}</div>
                {!bulkProgress.running && bulkProgress.failures?.length > 0 && <div className="mt-2 text-[11px] text-[#86868B]">Échecs (extrait) : {bulkProgress.failures.slice(0, 6).map((f: any) => `${f.email || f.id} (${f.error})`).join(' · ')}{bulkProgress.failures.length > 6 ? '…' : ''}</div>}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl ring-1 ring-black/5 overflow-hidden mb-5">
          <div className="grid grid-cols-[28px_1.2fr_1.6fr_1fr_0.8fr] gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#86868B] bg-black/[0.02] border-b border-black/5">
            <div><input type="checkbox" checked={allShownSelected} onChange={toggleAll} title="Tout sélectionner (avec carte)" /></div>
            <div>Client</div><div>E-mail</div><div>Carte</div><div>Créé</div>
          </div>
          <div className="max-h-[440px] overflow-auto">
            {(loading || scanning) && <div className="px-4 py-6 text-center text-[13px] text-[#86868B]"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />{scanning ? 'Analyse des cartes en cours… (jusqu\'à ~2 min la 1re fois, ensuite instantané)' : 'Chargement des clients…'}</div>}
            {!loading && !scanning && filtered.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-[#86868B]">Aucun client{ql ? ' pour « ' + q + ' »' : ''}.</div>}
            {!loading && !scanning && shown.map(c => (
              <div key={c.id} onClick={() => select(c)} className={`grid grid-cols-[28px_1.2fr_1.6fr_1fr_0.8fr] gap-2 items-center px-4 py-2.5 text-[13px] border-b border-black/5 last:border-0 cursor-pointer ${sel?.id === c.id ? 'bg-[#1D1D1F]/5' : 'hover:bg-black/[0.02]'}`}>
                <div onClick={e => e.stopPropagation()}><input type="checkbox" disabled={!c.card} checked={!!selected[c.id]} onChange={e => setSelected(prev => ({ ...prev, [c.id]: e.target.checked }))} /></div>
                <div className="font-semibold text-[#1D1D1F] truncate flex items-center gap-1">
                  <span className="truncate">{c.name && c.name !== '(sans nom)' ? c.name : <span className="text-[#c7c7cc]">—</span>}</span>
                  {c.optout && <span title="Ne plus prélever" className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-black/70 text-white font-semibold">🚫 ne pas prélever</span>}
                  {c.dupEmail && <span title="Email présent sur plusieurs comptes" className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-[#FF9500]/15 text-[#b5740a] font-semibold">⚠ email ×2</span>}
                </div>
                <div className="text-[#86868B] truncate">{c.email || '—'}</div>
                <div className="flex items-center gap-1"><Card card={c.card} />{c.sharedCard && <span title="Carte utilisée par plusieurs clients" className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-[#FF3B30]/12 text-[#c0271d] font-semibold">partagée</span>}</div>
                <div className="text-[#86868B]">{fdate(c.created)}</div>
              </div>
            ))}
          </div>
          {!loading && !scanning && <div className="px-4 py-2 text-[11px] text-[#86868B] border-t border-black/5">{filtered.length} client(s){ql || withCard ? ` sur ${all.length}` : ''} · {withCardCount} avec carte{selIds.length ? ` · ${selIds.length} sélectionné(s)` : ''}{filtered.length > cap ? ` · ${cap} affichés, affine la recherche` : ''}</div>}
        </div>

        {sel && (
          <div className="bg-white rounded-2xl ring-1 ring-black/5 p-5">
            {detailLoading ? <div className="text-[13px] text-[#86868B]"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Chargement de la fiche client…</div> : (<>
              {/* Fiche client */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-4 border-b border-black/5">
                <div>
                  <div className="text-[15px] font-semibold text-[#1D1D1F]">{detail?.name || sel.email}</div>
                  <div className="text-[12px] text-[#86868B]">{sel.email}</div>
                  <div className="mt-1"><Card card={detail?.card} /> {detail?.card && <span className="text-[11px] text-[#86868B]">exp. {detail.card.exp}</span>}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-[#86868B] uppercase tracking-wide">Total dépensé</div>
                  <div className="text-[20px] font-bold text-[#1D1D1F]">{money(detail?.total_spent || 0)}</div>
                  <div className="text-[11px] text-[#86868B]">{detail?.nb_paiements || 0} paiement(s){detail?.has_more ? '+' : ''}</div>
                </div>
              </div>

              {(sel.sharedCard || sel.dupEmail) && (
                <div className="flex items-start gap-2 text-[12px] text-[#c0271d] bg-[#FF3B30]/8 rounded-xl px-3.5 py-2.5 mb-4">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span><b>Doublon détecté</b> : {[sel.sharedCard && 'cette carte est utilisée par un autre client', sel.dupEmail && 'cet email existe sur plusieurs comptes'].filter(Boolean).join(' · ')}. Attention à ne pas débiter deux fois la même personne/carte.</span>
                </div>
              )}

              {/* Historique paiements */}
              {detail?.payments?.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#86868B] mb-1.5">Derniers paiements</div>
                  <div className="rounded-xl ring-1 ring-black/5 overflow-hidden max-h-52 overflow-auto">
                    {detail.payments.map((p: any, i: number) => (
                      <div key={i} className={`flex items-center gap-2 px-3 py-2 text-[12px] ${i ? 'border-t border-black/5' : ''}`}>
                        <span className="w-20 text-[#86868B]">{fdate(p.date)}</span>
                        <span className="flex-1 truncate text-[#1D1D1F]">{p.desc || '—'}</span>
                        {p.refunded > 0 && <span className="text-[11px] text-[#c0271d]">remb. {money(p.refunded, p.currency)}</span>}
                        <span className={`tabular-nums font-semibold ${p.status === 'succeeded' ? 'text-[#1a8a3b]' : 'text-[#86868B]'}`}>{money(p.amount, p.currency)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.status === 'succeeded' ? 'bg-[#34C759]/12 text-[#1a8a3b]' : 'bg-black/5 text-[#86868B]'}`}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ne plus prélever */}
              <div className="flex items-center justify-between gap-2 mb-4 pb-4 border-b border-black/5">
                <span className="text-[12px] text-[#86868B]">{sel.optout ? '🚫 Ce client est en « ne plus prélever » (exclu des débits).' : 'Ce client peut être prélevé.'}</span>
                <button onClick={() => setOptout([sel.id], !sel.optout)} disabled={optOuting} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-50 ${sel.optout ? 'bg-black/5 text-[#1D1D1F]' : 'bg-[#FF9500]/15 text-[#b5740a]'}`}>{sel.optout ? 'Réautoriser les prélèvements' : '🚫 Ne plus prélever'}</button>
              </div>

              {/* Débit */}
              <div className="text-[13px] font-semibold text-[#1D1D1F] mb-2">Débiter ce client</div>
              {sel.optout && <div className="text-[12px] text-[#c0271d] mb-2">⚠️ Client en « ne plus prélever » - le débit sera refusé.</div>}
              {!detail?.card && <div className="text-[12px] text-[#c0271d] mb-2">⚠️ aucune carte enregistrée réutilisable - non débitable.</div>}
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="block text-[11px] text-[#86868B] mb-1">Montant (€)</label>
                  <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" min="0.5" placeholder="0,00" className={inp + ' w-32'} />
                </div>
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-[11px] text-[#86868B] mb-1">Motif</label>
                  <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex. Abonnement Delivery Eat - juillet" className={inp + ' w-full'} />
                </div>
                <button onClick={charge} disabled={charging || !detail?.card || !amount || sel.optout} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-[14px] font-semibold bg-[#1D1D1F] text-white disabled:opacity-40">{charging ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}Débiter</button>
              </div>
              {result && (
                <div className={`mt-4 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13px] ${result.ok ? 'bg-[#34C759]/10 text-[#1a8a3b]' : 'bg-[#FF3B30]/10 text-[#c0271d]'}`}>
                  {result.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <div>{result.ok ? <><b>Débit réussi</b> : {result.amount} € sur {result.card} (réf. {result.id})</> : <><b>Échec</b>{result.code ? ` (${result.code}${result.decline_code ? ' / ' + result.decline_code : ''})` : ''} : {result.detail}</>}</div>
                </div>
              )}
            </>)}
          </div>
        )}
      </>)}
    </div>
  );
}
