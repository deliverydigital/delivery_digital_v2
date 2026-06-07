/**
 * Admin QUALIOPI (superadmin). 4 onglets : Vue d'ensemble, Conformité (32 indicateurs /
 * 7 critères + preuves), Exécution (preuves par session/apprenant) et Financement OPCO.
 * @author Rabah Ziane · 2026-06-07
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2, ShieldCheck, ListChecks, Wallet, BarChart3, Upload, FileText, Trash2,
  X, CheckCircle2, AlertTriangle, MinusCircle, Clock, ChevronRight, Users, Building2, Download,
} from 'lucide-react';

const euro = (n: number) => (n || 0).toLocaleString('fr-FR') + ' €';
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const CRITERIA: Record<number, string> = {
  1: 'Information du public',
  2: 'Identification des objectifs et adaptation',
  3: 'Adaptation aux publics : accueil, accompagnement, suivi, évaluation',
  4: 'Adéquation des moyens',
  5: 'Qualification et compétences des personnels',
  6: "Inscription dans l'environnement professionnel",
  7: 'Recueil et prise en compte des appréciations et réclamations',
};
const STATUS: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  conforme: { label: 'Conforme', cls: 'bg-[#34C759]/12 text-[#1a8a3b]', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  a_completer: { label: 'À compléter', cls: 'bg-[#FF9F0A]/12 text-[#b5740a]', icon: <Clock className="h-3.5 w-3.5" /> },
  non_conforme: { label: 'Non conforme', cls: 'bg-[#FF3B30]/12 text-[#FF3B30]', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  non_applicable: { label: 'Non applicable', cls: 'bg-black/5 text-[#86868B]', icon: <MinusCircle className="h-3.5 w-3.5" /> },
};
const DOC_TYPES: [string, string][] = [
  ['programme', 'Programme signé'], ['convention', 'Convention / contrat'], ['positionnement', 'Test de positionnement'],
  ['emargement', "Feuille d'émargement"], ['evaluation_chaud', 'Évaluation à chaud'], ['evaluation_froid', 'Évaluation à froid'],
  ['attestation', 'Attestation de fin'], ['certificat', 'Certificat / réussite'], ['reglement', 'Règlement intérieur'], ['autre', 'Autre'],
];
const docLabel = (t: string) => (DOC_TYPES.find(([k]) => k === t) || [t, t])[1];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file); });
}

export default function QualiopiAdmin({ secret }: { secret: string }) {
  const [tab, setTab] = useState<'overview' | 'conformite' | 'execution' | 'financement'>('overview');
  const hdr = useMemo(() => ({ 'x-admin-secret': secret }), [secret]);
  const hdrJson = useMemo(() => ({ 'x-admin-secret': secret, 'Content-Type': 'application/json' }), [secret]);
  return (
    <div>
      <h1 className="text-[28px] sm:text-[40px] text-[#1D1D1F] mb-1 flex items-center gap-2" style={{ fontFamily: '"Charter","Iowan Old Style",Georgia,serif', fontWeight: 700 }}><ShieldCheck className="h-8 w-8 text-[#0066CC]" /> Qualiopi.</h1>
      <p className="text-[14px] text-[#86868B] mb-6">Conformité aux 32 indicateurs, preuves d'exécution et suivi des financements OPCO.</p>
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {([['overview', "Vue d'ensemble", <BarChart3 className="h-4 w-4" />], ['conformite', 'Conformité (32 indicateurs)', <ListChecks className="h-4 w-4" />], ['execution', 'Exécution & preuves', <FileText className="h-4 w-4" />], ['financement', 'Financement OPCO', <Wallet className="h-4 w-4" />]] as [any, string, any][]).map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold ${tab === k ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#86868B] ring-1 ring-black/5'}`}>{ic}{l}</button>
        ))}
      </div>
      {tab === 'overview' && <Overview hdr={hdr} onGo={setTab} />}
      {tab === 'conformite' && <Conformite hdr={hdr} hdrJson={hdrJson} />}
      {tab === 'execution' && <Execution hdr={hdr} />}
      {tab === 'financement' && <Financement hdr={hdr} hdrJson={hdrJson} />}
    </div>
  );
}

/* ===================== Vue d'ensemble ===================== */
function Overview({ hdr, onGo }: { hdr: any; onGo: (t: any) => void }) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { (async () => { setD(await fetch('/api/admin/qualiopi/overview', { headers: hdr }).then((r) => r.json())); })(); }, [hdr]);
  if (!d) return <Loading />;
  const c = d.conformite || {}, p = d.proofs || {}, f = d.financing || {};
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Taux de conformité" value={`${c.rate || 0}%`} accent="#34C759" onClick={() => onGo('conformite')} />
        <Kpi label="À compléter" value={String(c.aCompleter || 0)} accent="#FF9F0A" onClick={() => onGo('conformite')} />
        <Kpi label="Non conformes" value={String(c.nonConforme || 0)} accent="#FF3B30" onClick={() => onGo('conformite')} />
        <Kpi label="Indicateurs applicables" value={String(c.applicable || 0)} accent="#1D1D1F" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Preuves (indicateurs)" value={String(p.indicators || 0)} accent="#0066CC" onClick={() => onGo('conformite')} />
        <Kpi label="Preuves (sessions)" value={String(p.sessions || 0)} accent="#0066CC" onClick={() => onGo('execution')} />
        <Kpi label="Financement reçu" value={euro(f.received || 0)} accent="#34C759" onClick={() => onGo('financement')} />
        <Kpi label="En attente OPCO" value={euro(f.pending || 0)} accent="#FF9F0A" onClick={() => onGo('financement')} />
      </div>
      <div className="bg-white rounded-2xl ring-1 ring-black/5 p-5 max-w-[680px]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <p className="text-[13px] text-[#1D1D1F] leading-relaxed">Préparez chaque audit en suivant la grille des <strong>32 indicateurs</strong>, en déposant les <strong>preuves d'exécution</strong> (émargements, attestations, évaluations) pour chaque session, et en gardant la trace du <strong>financement OPCO</strong> de chaque dossier. Cliquez sur un indicateur pour ajouter une preuve.</p>
      </div>
    </div>
  );
}
function Kpi({ label, value, accent, onClick }: { label: string; value: string; accent: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="text-left bg-white rounded-2xl ring-1 ring-black/5 p-4 hover:ring-black/15 transition" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="text-[11px] uppercase tracking-wide text-[#86868B] font-semibold mb-1.5">{label}</div>
      <div className="text-[24px] font-bold" style={{ color: accent }}>{value}</div>
    </button>
  );
}

/* ===================== Conformité (32 indicateurs) ===================== */
function Conformite({ hdr, hdrJson }: { hdr: any; hdrJson: any }) {
  const [inds, setInds] = useState<any[] | null>(null);
  const load = useCallback(async () => { const j = await fetch('/api/admin/qualiopi/indicators', { headers: hdr }).then((r) => r.json()); setInds(j.indicators || []); }, [hdr]);
  useEffect(() => { load(); }, [load]);
  if (!inds) return <Loading />;
  const byCrit: Record<number, any[]> = {};
  inds.forEach((i) => { (byCrit[i.criterion] = byCrit[i.criterion] || []).push(i); });
  return (
    <div className="space-y-6">
      {Object.keys(CRITERIA).map((ck) => {
        const c = Number(ck);
        const list = byCrit[c] || [];
        return (
          <div key={c}>
            <h3 className="text-[13px] font-bold text-[#1D1D1F] mb-2">Critère {c} - {CRITERIA[c]}</h3>
            <div className="space-y-2">{list.map((ind) => <IndicatorRow key={ind.number} ind={ind} hdr={hdr} hdrJson={hdrJson} onChanged={load} />)}</div>
          </div>
        );
      })}
    </div>
  );
}
function IndicatorRow({ ind, hdr, hdrJson, onChanged }: { ind: any; hdr: any; hdrJson: any; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(ind.notes || '');
  const [busy, setBusy] = useState(false);
  const sm = STATUS[ind.status] || STATUS.a_completer;
  const setStatus = async (status: string) => { await fetch(`/api/admin/qualiopi/indicators/${ind.number}`, { method: 'PATCH', headers: hdrJson, body: JSON.stringify({ status }) }); onChanged(); };
  const saveNotes = async () => { setBusy(true); try { await fetch(`/api/admin/qualiopi/indicators/${ind.number}`, { method: 'PATCH', headers: hdrJson, body: JSON.stringify({ notes }) }); onChanged(); } finally { setBusy(false); } };
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setBusy(true);
    try { const dataUrl = await fileToDataUrl(file); await fetch(`/api/admin/qualiopi/indicators/${ind.number}/proof`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ dataUrl, title: file.name, originalName: file.name }) }); onChanged(); } finally { setBusy(false); }
  };
  const delProof = async (id: string) => { await fetch(`/api/admin/qualiopi/indicators/${ind.number}/proof/${id}`, { method: 'DELETE', headers: hdr }); onChanged(); };
  return (
    <div className="bg-white rounded-xl ring-1 ring-black/5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-3.5 flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#0066CC]/10 text-[#0066CC] text-[12px] font-bold shrink-0">{ind.number}</span>
        <span className="flex-1 min-w-0">
          <span className="text-[13px] text-[#1D1D1F] leading-snug block">{ind.title}</span>
          <span className="inline-flex items-center gap-1.5 mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${sm.cls}`}>{sm.icon}{sm.label}</span>
            {ind.proofs?.length > 0 && <span className="text-[11px] text-[#86868B]">{ind.proofs.length} preuve(s)</span>}
          </span>
        </span>
        <ChevronRight className={`h-4 w-4 text-[#86868B] shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 border-t border-black/5 pt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(STATUS).map((k) => (
              <button key={k} onClick={() => setStatus(k)} className={`px-3 py-1.5 rounded-full text-[12px] font-semibold ${ind.status === k ? STATUS[k].cls + ' ring-1 ring-current' : 'bg-[#F5F5F7] text-[#86868B]'}`}>{STATUS[k].label}</button>
            ))}
          </div>
          <div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} placeholder="Notes / comment cet indicateur est couvert…" className="w-full px-3 py-2 rounded-lg bg-[#F5F5F7] text-[13px] text-[#1D1D1F] outline-none min-h-[64px]" />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[#1D1D1F] mb-1.5">Preuves</div>
            <div className="space-y-1.5 mb-2">
              {(ind.proofs || []).map((p: any) => (
                <div key={p._id} className="flex items-center gap-2 bg-[#F5F5F7] rounded-lg px-3 py-2 text-[12.5px]">
                  <FileText className="h-4 w-4 text-[#0066CC] shrink-0" />
                  <a href={p.filePath} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-[#1D1D1F] hover:underline">{p.title || p.originalName || 'Preuve'}</a>
                  <a href={p.filePath} target="_blank" rel="noreferrer" download className="text-[#86868B] hover:text-[#1D1D1F]"><Download className="h-3.5 w-3.5" /></a>
                  <button onClick={() => delProof(p._id)} className="text-[#FF3B30]"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1D1D1F] text-white text-[12.5px] font-semibold cursor-pointer"><Upload className="h-3.5 w-3.5" />{busy ? 'Envoi…' : 'Ajouter une preuve'}<input type="file" accept="application/pdf,image/*" className="hidden" onChange={upload} /></label>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Exécution (preuves par session) ===================== */
function Execution({ hdr }: { hdr: any }) {
  const [sessions, setSessions] = useState<any[] | null>(null);
  const load = useCallback(async () => { const j = await fetch('/api/admin/qualiopi/sessions', { headers: hdr }).then((r) => r.json()); setSessions(j.sessions || []); }, [hdr]);
  useEffect(() => { load(); }, [load]);
  if (!sessions) return <Loading />;
  if (!sessions.length) return <Empty text="Aucune session. Les cours assignés aux formateurs apparaîtront ici pour y déposer les preuves d'exécution." />;
  return <div className="space-y-2">{sessions.map((s) => <SessionProofRow key={s._id} s={s} hdr={hdr} onChanged={load} />)}</div>;
}
function SessionProofRow({ s, hdr, onChanged }: { s: any; hdr: any; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState('emargement');
  const [learner, setLearner] = useState('');
  const [busy, setBusy] = useState(false);
  const hdrJson = { ...hdr, 'Content-Type': 'application/json' };
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setBusy(true);
    try { const dataUrl = await fileToDataUrl(file); await fetch(`/api/admin/qualiopi/sessions/${s._id}/proof`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ dataUrl, docType, title: file.name, learnerName: learner, originalName: file.name }) }); setLearner(''); onChanged(); } finally { setBusy(false); }
  };
  const delProof = async (id: string) => { await fetch(`/api/admin/qualiopi/session-proof/${id}`, { method: 'DELETE', headers: hdr }); onChanged(); };
  const present = new Set((s.proofs || []).map((p: any) => p.docType));
  return (
    <div className="bg-white rounded-xl ring-1 ring-black/5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[#1D1D1F]">{s.formationTitle || 'Formation'} <span className="font-normal text-[#86868B]">· {s.clientName || '-'}</span></div>
          <div className="text-[12.5px] text-[#86868B] mt-0.5 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{s.trainerName || '-'}</span>
            <span>{fmtDate(s.sessionStart)}</span>
            <span>{(s.proofs || []).length} preuve(s)</span>
          </div>
        </div>
        <ChevronRight className={`h-4 w-4 text-[#86868B] shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-black/5 pt-3 space-y-3">
          {/* checklist des types attendus */}
          <div className="flex flex-wrap gap-1.5">
            {DOC_TYPES.filter(([k]) => k !== 'autre').map(([k, l]) => (
              <span key={k} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${present.has(k) ? 'bg-[#34C759]/12 text-[#1a8a3b]' : 'bg-[#F5F5F7] text-[#86868B]'}`}>{present.has(k) ? <CheckCircle2 className="h-3 w-3" /> : <MinusCircle className="h-3 w-3" />}{l}</span>
            ))}
          </div>
          {/* preuves déposées */}
          <div className="space-y-1.5">
            {(s.proofs || []).map((p: any) => (
              <div key={p._id} className="flex items-center gap-2 bg-[#F5F5F7] rounded-lg px-3 py-2 text-[12.5px]">
                <FileText className="h-4 w-4 text-[#0066CC] shrink-0" />
                <span className="px-1.5 py-0.5 rounded bg-white text-[11px] font-semibold text-[#1D1D1F]">{docLabel(p.docType)}</span>
                <a href={p.filePath} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-[#1D1D1F] hover:underline">{p.learnerName ? p.learnerName + ' · ' : ''}{p.title || p.originalName}</a>
                <button onClick={() => delProof(p._id)} className="text-[#FF3B30]"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
          {/* ajout */}
          <div className="flex flex-wrap items-center gap-2 bg-[#F5F5F7] rounded-lg p-2.5">
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-white text-[12.5px] text-[#1D1D1F] outline-none">
              {DOC_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input value={learner} onChange={(e) => setLearner(e.target.value)} placeholder="Apprenant (optionnel)" className="px-2.5 py-1.5 rounded-lg bg-white text-[12.5px] text-[#1D1D1F] outline-none flex-1 min-w-[140px]" />
            <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D1D1F] text-white text-[12.5px] font-semibold cursor-pointer"><Upload className="h-3.5 w-3.5" />{busy ? 'Envoi…' : 'Déposer'}<input type="file" accept="application/pdf,image/*" className="hidden" onChange={upload} /></label>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Financement OPCO ===================== */
function Financement({ hdr, hdrJson }: { hdr: any; hdrJson: any }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = useCallback(async () => { const j = await fetch('/api/admin/qualiopi/financing', { headers: hdr }).then((r) => r.json()); setRows(j.rows || []); }, [hdr]);
  useEffect(() => { load(); }, [load]);
  if (!rows) return <Loading />;
  if (!rows.length) return <Empty text="Aucun dossier OPCO. Les dossiers montés par les agences apparaîtront ici pour le suivi financier." />;
  return <div className="space-y-2">{rows.map((r) => <FinancingRow key={r.dossierId} r={r} hdr={hdr} hdrJson={hdrJson} onChanged={load} />)}</div>;
}
const FIN_STATUS: Record<string, { label: string; cls: string }> = {
  a_demander: { label: 'À demander', cls: 'bg-black/5 text-[#86868B]' },
  demande: { label: 'Demandé', cls: 'bg-[#0066CC]/10 text-[#0066CC]' },
  accepte: { label: 'Accepté', cls: 'bg-[#FF9F0A]/12 text-[#b5740a]' },
  paye: { label: 'Payé', cls: 'bg-[#34C759]/12 text-[#1a8a3b]' },
  refuse: { label: 'Refusé', cls: 'bg-[#FF3B30]/12 text-[#FF3B30]' },
};
function FinancingRow({ r, hdr, hdrJson, onChanged }: { r: any; hdr: any; hdrJson: any; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const f = r.funding || {};
  const [form, setForm] = useState({
    status: f.status || 'a_demander', requestRef: f.requestRef || '',
    requestedAmount: f.requestedAmount || r.amountHT || 0, grantedAmount: f.grantedAmount || 0, receivedAmount: f.receivedAmount || 0,
    decisionDate: f.decisionDate ? f.decisionDate.slice(0, 10) : '', dueDate: f.dueDate ? f.dueDate.slice(0, 10) : '', paidDate: f.paidDate ? f.paidDate.slice(0, 10) : '',
    notes: f.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await fetch(`/api/admin/qualiopi/financing/${r.dossierId}`, { method: 'PATCH', headers: hdrJson, body: JSON.stringify(form) }); onChanged(); } finally { setBusy(false); } };
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { const dataUrl = await fileToDataUrl(file); await fetch(`/api/admin/qualiopi/financing/${r.dossierId}/proof`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ dataUrl, title: file.name, originalName: file.name }) }); onChanged(); } finally { setBusy(false); } };
  const delProof = async (id: string) => { await fetch(`/api/admin/qualiopi/financing/${r.dossierId}/proof/${id}`, { method: 'DELETE', headers: hdr }); onChanged(); };
  const sm = FIN_STATUS[form.status] || FIN_STATUS.a_demander;
  const inp = 'w-full px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] text-[13px] text-[#1D1D1F] outline-none';
  return (
    <div className="bg-white rounded-xl ring-1 ring-black/5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[#1D1D1F] flex items-center gap-2"><Building2 className="h-4 w-4 text-[#86868B]" />{r.denom || '-'} <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${sm.cls}`}>{sm.label}</span></div>
          <div className="text-[12.5px] text-[#86868B] mt-0.5">{r.formationTitle || '-'} · {r.opco || 'OPCO ?'} · {euro(r.amountHT || 0)} HT · {r.stagiaires} stagiaire(s){r.agencyName ? ' · ' + r.agencyName : ''}</div>
        </div>
        <ChevronRight className={`h-4 w-4 text-[#86868B] shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-black/5 pt-3 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Statut"><select className={inp} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.keys(FIN_STATUS).map((k) => <option key={k} value={k}>{FIN_STATUS[k].label}</option>)}</select></Field>
            <Field label="Réf. accord OPCO"><input className={inp} value={form.requestRef} onChange={(e) => setForm({ ...form, requestRef: e.target.value })} /></Field>
            <Field label="Montant demandé (€)"><input type="number" className={inp} value={form.requestedAmount} onChange={(e) => setForm({ ...form, requestedAmount: Number(e.target.value) })} /></Field>
            <Field label="Montant accordé (€)"><input type="number" className={inp} value={form.grantedAmount} onChange={(e) => setForm({ ...form, grantedAmount: Number(e.target.value) })} /></Field>
            <Field label="Montant reçu (€)"><input type="number" className={inp} value={form.receivedAmount} onChange={(e) => setForm({ ...form, receivedAmount: Number(e.target.value) })} /></Field>
            <Field label="Date d'accord"><input type="date" className={inp} value={form.decisionDate} onChange={(e) => setForm({ ...form, decisionDate: e.target.value })} /></Field>
            <Field label="Échéance"><input type="date" className={inp} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
            <Field label="Date de versement"><input type="date" className={inp} value={form.paidDate} onChange={(e) => setForm({ ...form, paidDate: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><input className={inp} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={save} disabled={busy} className="px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[13px] font-semibold disabled:opacity-60">{busy ? '…' : 'Enregistrer'}</button>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#F5F5F7] text-[#1D1D1F] text-[13px] font-semibold cursor-pointer"><Upload className="h-3.5 w-3.5" /> Justificatif<input type="file" accept="application/pdf,image/*" className="hidden" onChange={upload} /></label>
          </div>
          {(f.proofs || []).length > 0 && (
            <div className="space-y-1.5">
              {f.proofs.map((p: any) => (
                <div key={p._id} className="flex items-center gap-2 bg-[#F5F5F7] rounded-lg px-3 py-2 text-[12.5px]">
                  <FileText className="h-4 w-4 text-[#0066CC] shrink-0" />
                  <a href={p.filePath} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-[#1D1D1F] hover:underline">{p.title || p.originalName}</a>
                  <button onClick={() => delProof(p._id)} className="text-[#FF3B30]"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ===================== helpers ===================== */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-[11px] text-[#86868B] font-semibold uppercase tracking-wide mb-1">{label}</span>{children}</label>;
}
function Loading() { return <div className="flex items-center justify-center py-16 text-[#86868B]"><Loader2 className="h-6 w-6 animate-spin" /></div>; }
function Empty({ text }: { text: string }) { return <div className="bg-white rounded-2xl ring-1 ring-black/5 p-10 text-center text-[#86868B] text-[14px]">{text}</div>; }
