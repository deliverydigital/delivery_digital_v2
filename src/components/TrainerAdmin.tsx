/**
 * Admin FORMATEURS (superadmin, x-admin-secret). Onglets : Formateurs (création + accès +
 * taux horaire + rattachement formations + validation onboarding/RIB), Cours (assigner un
 * formateur à un dossier OPCO ou créer une session manuelle, marquer réalisée -> fonds,
 * ordres d'encaissement reçus -> marquer payé) et Instructions (rubrique éditable).
 * @author Rabah Ziane · 2026-06-06
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2, Plus, Mail, KeyRound, CheckCircle2, X, BadgeEuro, GraduationCap,
  Wallet, ListChecks, MessageCircle, Send, Trash2, Edit3, Users, CalendarDays, Building2,
  ChevronLeft, ChevronRight, Clock, CalendarClock, Ban, List,
} from 'lucide-react';

const PILL = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-semibold';
const euro = (n: number) => (n || 0).toLocaleString('fr-FR') + ' €';
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const fmtTime = (d?: string) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-';
// Statut de session partagé entre la liste et le calendrier.
const STATUS_META: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Planifié', cls: 'bg-[#0066CC]/10 text-[#0066CC]' },
  done: { label: 'Réalisé · encaissable', cls: 'bg-[#34C759]/12 text-[#1a8a3b]' },
  encashRequested: { label: 'Encaissement demandé', cls: 'bg-[#FF9F0A]/12 text-[#b5740a]' },
  paid: { label: 'Payé', cls: 'bg-black/5 text-[#86868B]' },
  cancelled: { label: 'Annulé', cls: 'bg-[#FF3B30]/10 text-[#FF3B30]' },
};

type Trainer = {
  _id: string; name: string; email: string; phone?: string; status: string;
  hourlyRate?: number; trainerSkills?: string[]; last_login?: string;
  ribPdfUrl?: string; bankValidated?: boolean; onboardingValidated?: boolean;
  companyInfo?: any; contract?: any; iban?: string; bic?: string; accountHolder?: string;
};
type Formation = { _id: string; program_id: string; title: string; duration_hours: number };
type Dossier = { _id: string; denom?: string; formationTitle?: string; sessionStart?: string; salaries?: any[]; status?: string };
type Session = {
  _id: string; source: string; trainerId?: string; trainerName?: string; formationTitle?: string; clientName?: string;
  hours?: number; hourlyRate?: number; payAmount?: number; status: string; sessionStart?: string; sessionEnd?: string;
  location?: string; addr?: string;
  doneAt?: string; invoiceNumber?: string; learners?: any[]; whatsappGroupCreated?: boolean;
  clientContactName?: string; clientPhone?: string; days?: { date: string; from: string; to: string; mode?: string }[];
};

export default function TrainerAdmin({ secret }: { secret: string }) {
  const [tab, setTab] = useState<'trainers' | 'sessions' | 'instructions'>('trainers');
  const hdr = useMemo(() => ({ 'x-admin-secret': secret }), [secret]);
  const hdrJson = useMemo(() => ({ 'x-admin-secret': secret, 'Content-Type': 'application/json' }), [secret]);
  return (
    <div>
      <h1 className="text-[28px] sm:text-[40px] text-[#1D1D1F] mb-1" style={{ fontFamily: '"Charter","Iowan Old Style",Georgia,serif', fontWeight: 700 }}>Formateurs.</h1>
      <p className="text-[14px] text-[#86868B] mb-6">Comptes, taux horaire, formations rattachées, cours et encaissements.</p>
      <div className="flex gap-1.5 mb-6">
        {([['trainers', 'Formateurs', <Users className="h-4 w-4" />], ['sessions', 'Cours & encaissements', <ListChecks className="h-4 w-4" />], ['instructions', 'Instructions', <MessageCircle className="h-4 w-4" />]] as [any, string, any][]).map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold ${tab === k ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#86868B] ring-1 ring-black/5'}`}>{ic}{l}</button>
        ))}
      </div>
      {tab === 'trainers' && <TrainersTab hdr={hdr} hdrJson={hdrJson} />}
      {tab === 'sessions' && <SessionsAdmin hdr={hdr} hdrJson={hdrJson} />}
      {tab === 'instructions' && <InstructionsAdmin hdr={hdr} hdrJson={hdrJson} />}
    </div>
  );
}

/* ===================== Formateurs ===================== */
function TrainersTab({ hdr, hdrJson }: { hdr: any; hdrJson: any }) {
  const [trainers, setTrainers] = useState<Trainer[] | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [creating, setCreating] = useState(false);
  const [emailModal, setEmailModal] = useState<{ to: string; subject: string; html: string; password?: string; trainerId: string } | null>(null);
  const load = useCallback(async () => {
    const [t, c] = await Promise.all([
      fetch('/api/admin/trainers', { headers: hdr }).then((r) => r.json()),
      fetch('/api/admin/trainers/catalog', { headers: hdr }).then((r) => r.json()),
    ]);
    setTrainers(t.trainers || []); setFormations(c.formations || []);
  }, [hdr]);
  useEffect(() => { load(); }, [load]);
  if (!trainers) return <Loading />;
  return (
    <div className="space-y-4">
      <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1F] text-white text-[14px] font-semibold"><Plus className="h-4 w-4" /> Nouveau formateur</button>
      {trainers.length === 0 ? <Empty text="Aucun formateur. Créez le premier compte." /> : (
        <div className="space-y-3">{trainers.map((t) => <TrainerRow key={t._id} t={t} formations={formations} hdr={hdr} hdrJson={hdrJson} onChanged={load} onEmail={setEmailModal} />)}</div>
      )}
      {creating && <CreateTrainer hdrJson={hdrJson} onClose={() => setCreating(false)} onCreated={(p) => { setCreating(false); load(); setEmailModal(p); }} />}
      {emailModal && <EmailPreviewModal data={emailModal} hdrJson={hdrJson} onClose={() => setEmailModal(null)} />}
    </div>
  );
}

function TrainerRow({ t, formations, hdr, hdrJson, onChanged, onEmail }: { t: Trainer; formations: Formation[]; hdr: any; hdrJson: any; onChanged: () => void; onEmail: (p: any) => void }) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(String(t.hourlyRate || 0));
  const [skills, setSkills] = useState<string[]>(t.trainerSkills || []);
  const [busy, setBusy] = useState('');
  const saveRate = async () => { setBusy('rate'); try { await fetch(`/api/admin/trainers/${t._id}/rate`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ hourlyRate: Number(rate) }) }); onChanged(); } finally { setBusy(''); } };
  const saveSkills = async (next: string[]) => { setSkills(next); await fetch(`/api/admin/trainers/${t._id}/skills`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ trainerSkills: next }) }); onChanged(); };
  const validateOnboarding = async () => { setBusy('val'); try { await fetch(`/api/admin/trainers/${t._id}/validate-onboarding`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ validated: !t.onboardingValidated }) }); onChanged(); } finally { setBusy(''); } };
  const resend = async (regen: boolean) => {
    setBusy('mail');
    try {
      const url = regen ? `/api/admin/trainers/${t._id}/regenerate-preview` : `/api/admin/trainers/${t._id}/welcome-preview`;
      const j = await fetch(url, { method: 'POST', headers: hdrJson, body: '{}' }).then((r) => r.json());
      if (j.ok) onEmail({ ...j.emailPreview, password: j.password, trainerId: t._id });
    } finally { setBusy(''); }
  };
  const ci = t.companyInfo || {};
  const onboardingComplete = !!(ci.legalName && t.ribPdfUrl && t.contract?.signed);
  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/5 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full p-4 flex items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-semibold text-[#1D1D1F]">{t.name}</span>
            {t.onboardingValidated ? <span className={`${PILL} bg-[#34C759]/12 text-[#1a8a3b]`}><CheckCircle2 className="h-3.5 w-3.5" /> Activé</span> : onboardingComplete ? <span className={`${PILL} bg-[#FF9F0A]/12 text-[#b5740a]`}>À valider</span> : <span className={`${PILL} bg-black/5 text-[#86868B]`}>Onboarding en cours</span>}
            {t.hourlyRate ? <span className={`${PILL} bg-[#0066CC]/10 text-[#0066CC]`}><BadgeEuro className="h-3.5 w-3.5" />{t.hourlyRate} €/h</span> : null}
          </div>
          <div className="text-[12.5px] text-[#86868B] mt-0.5">{t.email}{t.phone ? ' · ' + t.phone : ''} · {(t.trainerSkills || []).length} formation(s)</div>
        </div>
        <span className="text-[#86868B] text-[13px]">{open ? 'Fermer' : 'Gérer'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-black/5 pt-4 space-y-5">
          {/* Taux + accès */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[12px] font-semibold text-[#1D1D1F] mb-1.5">Taux horaire négocié (€/h)</div>
              <div className="flex gap-2">
                <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="w-32 px-3 py-2 rounded-xl bg-[#F5F5F7] text-[14px] text-[#1D1D1F] outline-none" />
                <button onClick={saveRate} disabled={busy === 'rate'} className="px-4 py-2 rounded-xl bg-[#1D1D1F] text-white text-[13px] font-semibold disabled:opacity-60">{busy === 'rate' ? '…' : 'Enregistrer'}</button>
              </div>
            </div>
            <div>
              <div className="text-[12px] font-semibold text-[#1D1D1F] mb-1.5">Accès</div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => resend(false)} disabled={busy === 'mail'} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-[13px] font-semibold"><Mail className="h-3.5 w-3.5" /> Renvoyer les accès</button>
                <button onClick={() => resend(true)} disabled={busy === 'mail'} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-[13px] font-semibold"><KeyRound className="h-3.5 w-3.5" /> Nouveau mot de passe</button>
              </div>
            </div>
          </div>

          {/* Formations rattachées */}
          <div>
            <div className="text-[12px] font-semibold text-[#1D1D1F] mb-2 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Formations rattachées (compétences)</div>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {formations.length === 0 ? <p className="text-[13px] text-[#86868B]">Aucune formation au catalogue.</p> : formations.map((f) => {
                const on = skills.includes(f.program_id);
                return (
                  <label key={f._id} className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-[13px] ${on ? 'bg-[#0066CC]/8 text-[#0066CC]' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}>
                    <input type="checkbox" checked={on} onChange={(e) => { const next = e.target.checked ? [...skills, f.program_id] : skills.filter((s) => s !== f.program_id); saveSkills(next); }} />
                    <span className="truncate">{f.title}</span>{f.duration_hours ? <span className="text-[11px] opacity-60">{f.duration_hours}h</span> : null}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Onboarding / validation */}
          <div className="bg-[#F5F5F7] rounded-xl p-3.5">
            <div className="text-[12px] font-semibold text-[#1D1D1F] mb-2">Activation du compte</div>
            <div className="grid sm:grid-cols-3 gap-2 text-[12.5px] mb-3">
              <ChkLine ok={!!ci.legalName} label={`Infos${ci.legalName ? ' · ' + ci.legalName : ''}`} />
              <ChkLine ok={!!t.ribPdfUrl} label="RIB (PDF)" extra={t.ribPdfUrl ? <a href={t.ribPdfUrl} target="_blank" rel="noreferrer" className="text-[#0066CC] underline ml-1">voir</a> : undefined} />
              <ChkLine ok={!!t.contract?.signed} label="Contrat signé" />
            </div>
            {t.iban && <div className="text-[12px] text-[#86868B] mb-3">IBAN {t.iban} {t.bic ? '· BIC ' + t.bic : ''} · {t.accountHolder || ''}</div>}
            <button onClick={validateOnboarding} disabled={busy === 'val'} className={`px-4 py-2 rounded-full text-[13px] font-semibold ${t.onboardingValidated ? 'bg-black/5 text-[#86868B]' : 'bg-[#34C759] text-white'}`}>{busy === 'val' ? '…' : t.onboardingValidated ? 'Désactiver le compte' : 'Valider et activer le compte'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
function ChkLine({ ok, label, extra }: { ok: boolean; label: string; extra?: React.ReactNode }) {
  return <div className={`flex items-center gap-1.5 ${ok ? 'text-[#1a8a3b]' : 'text-[#86868B]'}`}>{ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}<span>{label}</span>{extra}</div>;
}

function CreateTrainer({ hdrJson, onClose, onCreated }: { hdrJson: any; onClose: () => void; onCreated: (p: any) => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', hourlyRate: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async () => {
    if (!f.name.trim() || !f.email.trim()) { setErr('Nom et email requis.'); return; }
    setBusy(true); setErr('');
    try {
      const j = await fetch('/api/admin/trainers', { method: 'POST', headers: hdrJson, body: JSON.stringify({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), hourlyRate: f.hourlyRate ? Number(f.hourlyRate) : 0 }) }).then((r) => r.json());
      if (j.error) { setErr(j.error === 'email_exists' ? 'Cet email existe déjà.' : j.error); return; }
      onCreated({ ...j.emailPreview, password: j.password, trainerId: j.trainer.id });
    } finally { setBusy(false); }
  };
  const inp = 'w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] text-[14px] text-[#1D1D1F] outline-none';
  return (
    <Modal onClose={onClose} title="Nouveau formateur">
      <div className="space-y-3">
        <input className={inp} placeholder="Nom complet" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={inp} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input className={inp} placeholder="Téléphone (optionnel)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input className={inp} type="number" placeholder="Taux horaire €/h" value={f.hourlyRate} onChange={(e) => setF({ ...f, hourlyRate: e.target.value })} />
        </div>
        {err && <p className="text-[13px] text-[#FF3B30]">{err}</p>}
        <p className="text-[12px] text-[#86868B]">Un mot de passe sera généré automatiquement. Vous pourrez ensuite prévisualiser et envoyer l'email d'activation.</p>
        <button onClick={submit} disabled={busy} className="w-full px-5 py-3 rounded-full bg-[#1D1D1F] text-white text-[14px] font-semibold disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Créer le compte'}</button>
      </div>
    </Modal>
  );
}

function EmailPreviewModal({ data, hdrJson, onClose }: { data: any; hdrJson: any; onClose: () => void }) {
  const [sending, setSending] = useState(false); const [sent, setSent] = useState(false);
  const send = async () => {
    setSending(true);
    try { const j = await fetch(`/api/admin/trainers/${data.trainerId}/send-welcome`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ password: data.password || '' }) }).then((r) => r.json()); if (j.ok) setSent(true); } finally { setSending(false); }
  };
  return (
    <Modal onClose={onClose} title="Email d'activation" wide>
      {data.password && <div className="mb-3 bg-[#FFF7E6] border border-[#FFD699] rounded-xl px-4 py-3 text-[13px] text-[#7a5400]">Mot de passe généré : <strong className="font-mono">{data.password}</strong> (communiqué dans l'email)</div>}
      <div className="text-[12px] text-[#86868B] mb-1">À : {data.to}</div>
      <div className="text-[13px] font-semibold text-[#1D1D1F] mb-2">{data.subject}</div>
      <iframe title="preview" srcDoc={data.html} className="w-full h-[420px] rounded-xl border border-black/10 bg-white" />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-full text-[13px] text-[#86868B]">Fermer</button>
        <button onClick={send} disabled={sending || sent} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#1D1D1F] text-white text-[13px] font-semibold disabled:opacity-60">{sent ? <><CheckCircle2 className="h-4 w-4" /> Envoyé</> : sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Envoyer l'email</>}</button>
      </div>
    </Modal>
  );
}

/* ===================== Cours & encaissements ===================== */
function SessionsAdmin({ hdr, hdrJson }: { hdr: any; hdrJson: any }) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [assign, setAssign] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  const [manage, setManage] = useState<Session | null>(null);
  const load = useCallback(async () => {
    const [s, t, d, c] = await Promise.all([
      fetch('/api/admin/trainers/sessions', { headers: hdr }).then((r) => r.json()),
      fetch('/api/admin/trainers', { headers: hdr }).then((r) => r.json()),
      fetch('/api/admin/trainers/dossiers', { headers: hdr }).then((r) => r.json()),
      fetch('/api/admin/trainers/catalog', { headers: hdr }).then((r) => r.json()),
    ]);
    setSessions(s.sessions || []); setTrainers(t.trainers || []); setDossiers(d.dossiers || []); setFormations(c.formations || []);
  }, [hdr]);
  useEffect(() => { load(); }, [load]);
  if (!sessions) return <Loading />;
  const encashOrders = sessions.filter((s) => s.status === 'encashRequested');
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => setAssign(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1F] text-white text-[14px] font-semibold"><Plus className="h-4 w-4" /> Assigner un cours</button>
        <div className="inline-flex gap-1 bg-white rounded-full p-1 ring-1 ring-black/5">
          <button onClick={() => setView('calendar')} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold ${view === 'calendar' ? 'bg-[#1D1D1F] text-white' : 'text-[#86868B]'}`}><CalendarDays className="h-3.5 w-3.5" /> Calendrier</button>
          <button onClick={() => setView('list')} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold ${view === 'list' ? 'bg-[#1D1D1F] text-white' : 'text-[#86868B]'}`}><List className="h-3.5 w-3.5" /> Liste</button>
        </div>
      </div>

      {encashOrders.length > 0 && (
        <section className="bg-white rounded-2xl ring-1 ring-[#FF9F0A]/30 p-4">
          <h3 className="text-[14px] font-bold text-[#1D1D1F] mb-3 flex items-center gap-1.5"><Wallet className="h-4 w-4 text-[#FF9F0A]" /> Ordres d'encaissement reçus ({encashOrders.length})</h3>
          <div className="space-y-2">{encashOrders.map((s) => (
            <div key={s._id} className="flex items-center justify-between gap-3 bg-[#F5F5F7] rounded-xl px-4 py-3 text-[13px]">
              <div><span className="font-semibold">{s.trainerName}</span> · {s.formationTitle} · {s.clientName} · <span className="text-[#86868B]">{s.invoiceNumber}</span></div>
              <div className="flex items-center gap-3"><span className="font-bold">{euro(s.payAmount || 0)}</span>
                <button onClick={async () => { await fetch(`/api/admin/trainers/sessions/${s._id}/pay`, { method: 'POST', headers: hdrJson, body: '{}' }); load(); }} className="px-4 py-1.5 rounded-full bg-[#34C759] text-white text-[12.5px] font-semibold">Marquer payé</button>
              </div>
            </div>
          ))}</div>
        </section>
      )}

      {sessions.length === 0 ? <Empty text="Aucun cours. Assignez un formateur à un dossier OPCO ou créez une session." /> : view === 'calendar' ? (
        <SessionsCalendar sessions={sessions} onOpen={(s) => setDetailId(s._id)} onManage={(s) => setManage(s)} />
      ) : (
        <div className="space-y-2">{sessions.map((s) => <SessionAdminRow key={s._id} s={s} trainerPhone={trainers.find((t) => t._id === s.trainerId)?.phone} hdrJson={hdrJson} onChanged={load} onOpen={() => setDetailId(s._id)} onManage={() => setManage(s)} />)}</div>
      )}

      {assign && <AssignModal trainers={trainers} dossiers={dossiers} formations={formations} hdrJson={hdrJson} onClose={() => setAssign(false)} onDone={() => { setAssign(false); load(); }} />}
      {detailId && <SessionDetailModal id={detailId} hdr={hdr} onClose={() => setDetailId(null)} />}
      {manage && <ManageSessionModal s={manage} hdrJson={hdrJson} onClose={() => setManage(null)} onDone={() => { setManage(null); load(); }} />}
    </div>
  );
}

/* ===================== Calendrier des cours (mois) ===================== */
const SESSION_DOT: Record<string, string> = {
  scheduled: 'bg-[#0066CC]', done: 'bg-[#34C759]', encashRequested: 'bg-[#FF9F0A]', paid: 'bg-[#86868B]', cancelled: 'bg-[#FF3B30]',
};
function SessionsCalendar({ sessions, onOpen, onManage }: { sessions: Session[]; onOpen: (s: Session) => void; onManage: (s: Session) => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [daySel, setDaySel] = useState<string | null>(null);
  // Index des sessions par jour (YYYY-MM-DD) à partir de sessionStart.
  const byDay = useMemo(() => {
    const m: Record<string, Session[]> = {};
    sessions.forEach((s) => { if (!s.sessionStart) return; const k = new Date(s.sessionStart).toISOString().slice(0, 10); (m[k] ||= []).push(s); });
    return m;
  }, [sessions]);
  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = (first.getDay() + 6) % 7; // lundi=0
  const nbDays = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: nbDays }, (_, i) => i + 1)];
  const monthName = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const iso = (d: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayIso = new Date().toISOString().slice(0, 10);
  const selList = daySel ? (byDay[daySel] || []) : [];
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <section className="bg-white rounded-2xl ring-1 ring-black/5 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-[#1D1D1F] capitalize">{monthName}</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor((c) => { const m = c.m - 1; return m < 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m }; })} className="p-1.5 rounded-lg bg-[#F5F5F7] hover:bg-black/5 text-[#1D1D1F]"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); }} className="px-3 py-1.5 rounded-lg bg-[#F5F5F7] hover:bg-black/5 text-[12px] font-semibold text-[#1D1D1F]">Aujourd'hui</button>
            <button onClick={() => setCursor((c) => { const m = c.m + 1; return m > 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m }; })} className="p-1.5 rounded-lg bg-[#F5F5F7] hover:bg-black/5 text-[#1D1D1F]"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3 text-[11px] text-[#86868B] flex-wrap">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#0066CC]" /> Planifié</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" /> Réalisé</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#FF9F0A]" /> Encaissement</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]" /> Annulé</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-[11px] text-[#86868B] font-semibold py-1">{d}</div>)}
          {cells.map((c, i) => {
            if (c == null) return <div key={i} />;
            const dayIso = iso(c);
            const list = byDay[dayIso] || [];
            const isToday = dayIso === todayIso;
            const isSel = dayIso === daySel;
            return (
              <button key={i} onClick={() => setDaySel(list.length ? dayIso : null)} disabled={!list.length}
                className={`relative min-h-[58px] rounded-xl p-1.5 text-left transition-colors ${isSel ? 'ring-2 ring-[#0066CC] bg-[#0066CC]/5' : list.length ? 'bg-[#F5F5F7] hover:bg-black/5' : 'bg-[#FAFAFA] cursor-default'}`}>
                <span className={`text-[12px] font-semibold ${isToday ? 'text-[#0066CC]' : 'text-[#1D1D1F]'}`}>{c}</span>
                {isToday && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-[#0066CC] align-middle" />}
                <div className="mt-1 space-y-0.5">
                  {list.slice(0, 2).map((s) => (
                    <div key={s._id} className="flex items-center gap-1 text-[9.5px] text-[#1D1D1F] truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SESSION_DOT[s.status] || SESSION_DOT.scheduled}`} />
                      <span className="truncate">{s.trainerName || s.formationTitle || 'Cours'}</span>
                    </div>
                  ))}
                  {list.length > 2 && <div className="text-[9px] text-[#86868B]">+{list.length - 2} autre(s)</div>}
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <section className="bg-white rounded-2xl ring-1 ring-black/5 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 className="text-[14px] font-bold text-[#1D1D1F] mb-3">{daySel ? new Date(daySel + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Sélectionnez un jour'}</h3>
        {!daySel ? <p className="text-[13px] text-[#86868B]">Cliquez sur un jour du calendrier pour voir les cours et les reporter ou annuler.</p> : selList.length === 0 ? <p className="text-[13px] text-[#86868B]">Aucun cours ce jour.</p> : (
          <div className="space-y-2.5">
            {selList.map((s) => {
              const sm = STATUS_META[s.status] || STATUS_META.scheduled;
              const canManage = s.status === 'scheduled' || s.status === 'cancelled';
              return (
                <div key={s._id} className="bg-[#F5F5F7] rounded-xl p-3">
                  <button onClick={() => onOpen(s)} className="w-full text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-[#1D1D1F]">{s.formationTitle || 'Formation'}</span>
                      <span className={`${PILL} ${sm.cls}`}>{sm.label}</span>
                    </div>
                    <div className="text-[12px] text-[#86868B] mt-1 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{s.trainerName}</span>
                      {s.clientName && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{s.clientName}</span>}
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtTime(s.sessionStart)}</span>
                    </div>
                  </button>
                  {canManage && (
                    <div className="mt-2">
                      <button onClick={() => onManage(s)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1D1D1F] text-white text-[12px] font-semibold"><CalendarClock className="h-3.5 w-3.5" /> Reporter / Annuler</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ===================== Reporter / Annuler un cours (+ email formateur) ===================== */
function ManageSessionModal({ s, hdrJson, onClose, onDone }: { s: Session; hdrJson: any; onClose: () => void; onDone: () => void }) {
  const toLocalInput = (d?: string) => { if (!d) return ''; const dt = new Date(d); const off = dt.getTimezoneOffset(); return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 16); };
  const [tab, setTab] = useState<'reschedule' | 'cancel'>('reschedule');
  const [startAt, setStartAt] = useState(toLocalInput(s.sessionStart));
  const [endAt, setEndAt] = useState(toLocalInput(s.sessionEnd));
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const inp = 'w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] text-[14px] text-[#1D1D1F] outline-none';
  const reschedule = async () => {
    if (!startAt) { setErr('Choisissez une nouvelle date.'); return; }
    setBusy(true); setErr('');
    try {
      await fetch(`/api/admin/trainers/sessions/${s._id}`, { method: 'PATCH', headers: hdrJson, body: JSON.stringify({ startAt: new Date(startAt).toISOString(), endAt: endAt ? new Date(endAt).toISOString() : undefined, status: 'scheduled', notify }) });
      onDone();
    } finally { setBusy(false); }
  };
  const cancel = async () => {
    setBusy(true); setErr('');
    try {
      await fetch(`/api/admin/trainers/sessions/${s._id}`, { method: 'PATCH', headers: hdrJson, body: JSON.stringify({ status: 'cancelled', reason, notify }) });
      onDone();
    } finally { setBusy(false); }
  };
  const NotifyToggle = () => (
    <label className="flex items-center gap-2.5 mt-3 cursor-pointer select-none">
      <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="w-4 h-4 accent-[#0066CC]" />
      <span className="inline-flex items-center gap-1.5 text-[13px] text-[#1D1D1F]"><Mail className="h-3.5 w-3.5 text-[#86868B]" /> Envoyer un email au formateur {s.trainerName ? `(${s.trainerName})` : ''}</span>
    </label>
  );
  return (
    <Modal onClose={onClose} title={s.formationTitle || 'Gérer le cours'}>
      <div className="text-[12.5px] text-[#86868B] mb-4">{s.clientName ? s.clientName + ' · ' : ''}{fmtDate(s.sessionStart)}</div>
      <div className="flex gap-1.5 mb-4">
        <button onClick={() => setTab('reschedule')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold ${tab === 'reschedule' ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#86868B]'}`}><CalendarClock className="h-3.5 w-3.5" /> Reporter</button>
        <button onClick={() => setTab('cancel')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold ${tab === 'cancel' ? 'bg-[#FF3B30] text-white' : 'bg-[#F5F5F7] text-[#86868B]'}`}><Ban className="h-3.5 w-3.5" /> Annuler</button>
      </div>
      {tab === 'reschedule' ? (
        <div className="space-y-3">
          <label className="block"><span className="text-[12px] font-semibold text-[#1D1D1F]">Nouvelle date & heure de début</span><input className={inp} type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></label>
          <label className="block"><span className="text-[12px] font-semibold text-[#1D1D1F]">Fin (optionnel)</span><input className={inp} type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></label>
          <NotifyToggle />
          {err && <p className="text-[13px] text-[#FF3B30]">{err}</p>}
          <button onClick={reschedule} disabled={busy} className="w-full px-5 py-3 rounded-full bg-[#1D1D1F] text-white text-[14px] font-semibold disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Reporter le cours'}</button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] text-[#86868B]">Le cours passera au statut <strong className="text-[#FF3B30]">Annulé</strong>. Vous pourrez le reprogrammer ensuite si besoin.</p>
          <label className="block"><span className="text-[12px] font-semibold text-[#1D1D1F]">Motif (optionnel, inclus dans l'email)</span><textarea className={`${inp} min-h-[80px]`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex : report demandé par le client, effectif insuffisant…" /></label>
          <NotifyToggle />
          {err && <p className="text-[13px] text-[#FF3B30]">{err}</p>}
          <button onClick={cancel} disabled={busy} className="w-full px-5 py-3 rounded-full bg-[#FF3B30] text-white text-[14px] font-semibold disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Confirmer l\'annulation'}</button>
        </div>
      )}
    </Modal>
  );
}

function SessionDetailModal({ id, hdr, onClose }: { id: string; hdr: any; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { (async () => { const j = await fetch(`/api/admin/trainers/sessions/${id}/detail`, { headers: hdr }).then((r) => r.json()); setData(j); })(); }, [id, hdr]);
  const fmtDT = (d?: string) => d ? new Date(d).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const s = data?.session, t = data?.trainer, dos = data?.dossier, ag = data?.agency;
  const Row = ({ k, v }: { k: string; v: any }) => (v != null && v !== '') ? <div className="flex justify-between gap-3 py-1.5 text-[13px]"><span className="text-[#86868B]">{k}</span><span className="font-medium text-[#1D1D1F] text-right">{v}</span></div> : null;
  const Sec = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="bg-[#F5F5F7] rounded-xl p-4"><div className="flex items-center gap-1.5 text-[12px] font-bold text-[#1D1D1F] uppercase tracking-wide mb-2">{icon}{title}</div>{children}</div>
  );
  const learners = (s?.learners && s.learners.length ? s.learners : (dos?.salaries || [])) as any[];
  return (
    <Modal onClose={onClose} title="Détail du cours" wide>
      {!data ? <Loading /> : !s ? <Empty text="Introuvable." /> : (
        <div className="space-y-3 max-h-[70vh] overflow-auto">
          <Sec icon={<ListChecks className="h-3.5 w-3.5" />} title="Cours">
            <Row k="Formation" v={s.formationTitle} />
            <Row k="Statut" v={s.status} />
            <Row k="Origine" v={s.source === 'opco' ? 'Dossier OPCO' : 'Manuel'} />
            <Row k="Date" v={fmtDT(s.sessionStart)} />
            <Row k="Fin" v={s.sessionEnd ? fmtDT(s.sessionEnd) : null} />
            <Row k="Durée" v={s.hours ? `${s.hours} h` : null} />
            <Row k="Lieu" v={`${s.location || '-'}${s.addr ? ' · ' + s.addr : ''}`} />
            <Row k="Rémunération" v={s.payAmount ? `${euro(s.payAmount)} (${s.hours || 0}h × ${s.hourlyRate || 0}€)` : null} />
            <Row k="Facture" v={s.invoiceNumber} />
            <Row k="Groupe WhatsApp" v={s.whatsappGroupCreated ? 'Créé' + (s.whatsappGroupLink ? ' · ' + s.whatsappGroupLink : '') : 'Non créé'} />
            <Row k="Responsable pédago" v={s.pedagoName ? `${s.pedagoName}${s.pedagoPhone ? ' · ' + s.pedagoPhone : ''}` : null} />
            <Row k="Notes" v={s.notes} />
          </Sec>
          <Sec icon={<Users className="h-3.5 w-3.5" />} title="Formateur">
            <Row k="Nom" v={t?.name} />
            <Row k="Email" v={t?.email} />
            <Row k="Téléphone" v={t?.phone} />
            <Row k="Taux horaire" v={t?.hourlyRate ? `${t.hourlyRate} €/h` : null} />
            <Row k="Compte activé" v={t?.onboardingValidated ? 'Oui' : 'Non'} />
            <Row k="Société" v={t?.companyInfo?.legalName} />
            <Row k="RIB" v={t?.iban ? `${t.iban}${t.bic ? ' · ' + t.bic : ''}` : null} />
          </Sec>
          <Sec icon={<Building2 className="h-3.5 w-3.5" />} title="Client">
            <Row k="Bénéficiaire" v={s.clientName || dos?.denom} />
            <Row k="Email" v={s.clientEmail || dos?.clientEmail} />
            <Row k="SIRET" v={dos?.siret} />
            <Row k="Adresse" v={s.addr || dos?.addr} />
            <Row k="OPCO" v={dos?.opco} />
          </Sec>
          {ag && (
            <Sec icon={<Building2 className="h-3.5 w-3.5" />} title="Agence partenaire">
              <Row k="Agence" v={ag.name || dos?.agencyName} />
              <Row k="Email" v={ag.email} />
              <Row k="Téléphone" v={ag.phone} />
              <Row k="Société" v={ag.companyInfo?.legalName} />
              {dos?.commercialName && <Row k="Commercial" v={dos.commercialName} />}
              <Row k="Montant dossier" v={dos?.amountHT ? euro(dos.amountHT) + ' HT' : null} />
            </Sec>
          )}
          <Sec icon={<Users className="h-3.5 w-3.5" />} title={`Apprenants (${learners.length})`}>
            {learners.length === 0 ? <p className="text-[13px] text-[#86868B]">Aucun apprenant renseigné.</p> : (
              <div className="space-y-1">
                {learners.map((l, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] bg-white rounded-lg px-3 py-2">
                    <span className="font-medium text-[#1D1D1F]">{[l.firstname, l.lastname].filter(Boolean).join(' ') || 'Apprenant'}</span>
                    {l.poste && <span className="text-[#86868B]">{l.poste}</span>}
                    {(l.telephone || l.phone) && <span className="text-[#86868B]">{l.telephone || l.phone}</span>}
                    {l.email && <span className="text-[#86868B]">{l.email}</span>}
                  </div>
                ))}
              </div>
            )}
          </Sec>
        </div>
      )}
    </Modal>
  );
}

function SessionAdminRow({ s, trainerPhone, hdrJson, onChanged, onOpen, onManage }: { s: Session; trainerPhone?: string; hdrJson: any; onChanged: () => void; onOpen: () => void; onManage: () => void }) {
  const [busy, setBusy] = useState(false);
  const sm = STATUS_META[s.status] || STATUS_META.scheduled;
  const markDone = async (done: boolean) => { setBusy(true); try { await fetch(`/api/admin/trainers/sessions/${s._id}/done`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ done }) }); onChanged(); } finally { setBusy(false); } };
  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/5 p-4 flex items-center justify-between gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <button type="button" onClick={onOpen} className="min-w-0 text-left hover:opacity-80 transition-opacity">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-semibold text-[#1D1D1F]">{s.formationTitle || 'Formation'}</span>
          <span className={`${PILL} ${sm.cls}`}>{sm.label}</span>
          {s.source === 'opco' && <span className={`${PILL} bg-black/5 text-[#86868B]`}>OPCO</span>}
          {s.whatsappGroupCreated && <span className={`${PILL} bg-[#25D366]/12 text-[#128c3e]`}><MessageCircle className="h-3 w-3" /> WhatsApp</span>}
        </div>
        <div className="text-[12.5px] text-[#86868B] mt-0.5 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{s.trainerName}</span>
          {s.clientName && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{s.clientName}</span>}
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(s.sessionStart)}</span>
          <span>{s.hours || 0}h{s.payAmount ? ' · ' + euro(s.payAmount) : ''}</span>
        </div>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        {/* Le responsable pédagogique peut confirmer les dates au client lui-même. @Rabah 2026-07-20 */}
        {s.status === 'scheduled' && s.clientPhone && (
          <a href={`https://wa.me/${waDigits(s.clientPhone)}?text=${encodeURIComponent(clientConfirmMessage(s, trainerPhone))}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-black text-[12.5px] font-semibold" style={{ background: '#25D366' }}
            title={`Confirmer les dates à ${s.clientContactName || 'le client'} sur WhatsApp`}>
            <MessageCircle className="h-3.5 w-3.5" /> Confirmer au client
          </a>
        )}
        {(s.status === 'scheduled' || s.status === 'cancelled') && <button onClick={onManage} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F5F5F7] text-[#1D1D1F] text-[12.5px] font-semibold"><CalendarClock className="h-3.5 w-3.5" /> Reporter / Annuler</button>}
        {s.status === 'scheduled' && <button onClick={() => markDone(true)} disabled={busy} className="px-4 py-1.5 rounded-full bg-[#34C759] text-white text-[12.5px] font-semibold disabled:opacity-60">Marquer réalisée</button>}
        {s.status === 'done' && <button onClick={() => markDone(false)} disabled={busy} className="px-4 py-1.5 rounded-full bg-black/5 text-[#86868B] text-[12.5px] font-semibold">Annuler « réalisée »</button>}
        {s.status === 'encashRequested' && <button onClick={async () => { setBusy(true); try { await fetch(`/api/admin/trainers/sessions/${s._id}/pay`, { method: 'POST', headers: hdrJson, body: '{}' }); onChanged(); } finally { setBusy(false); } }} className="px-4 py-1.5 rounded-full bg-[#34C759] text-white text-[12.5px] font-semibold">Marquer payé</button>}
      </div>
    </div>
  );
}

/**
 * Message de confirmation des dates envoyé au client par le RESPONSABLE PÉDAGOGIQUE (nous),
 * en complément de l'appel du formateur : il annonce nommément le formateur qui interviendra,
 * pour que le client sache qui va le contacter et animer la session.
 * @author Rabah Ziane · 2026-07-20
 */
function clientConfirmMessage(s: Session, trainerPhone?: string) {
  const planning = (s.days || [])
    .map((d) => `- ${new Date(`${d.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} de ${d.from} à ${d.to}`)
    .join('\n');
  return [
    `Bonjour${s.clientContactName ? ` ${s.clientContactName}` : ''},`,
    ``,
    `Je suis Ziane Rabah, responsable pédagogique Delivery Digital pour « ${s.formationTitle || 'la formation'} ».`,
    s.trainerName ? `Votre formateur sera ${s.trainerName}.` : '',
    planning ? `Je vous confirme les dates prévues :\n${planning}` : `Je vous contacte pour confirmer les dates de la formation.`,
    ``,
    s.trainerName
      ? `Est-ce que ces créneaux vous conviennent ? Si besoin, vous pouvez les adapter directement avec ${s.trainerName}, en fonction de vos plannings respectifs${trainerPhone ? ` : ${trainerPhone}` : ''}.`
      : `Est-ce que ces créneaux vous conviennent ? Si besoin nous pouvons les adapter ensemble.`,
    ``,
    `À noter : tous les apprenants inscrits recevront par email, avant le démarrage, deux questionnaires à compléter (expression des attentes et évaluation du positionnement). À l'issue de la formation, chacun recevra un questionnaire de satisfaction et son attestation de fin de formation.`,
    ``,
    `Je reste disponible dans ce groupe tout au long de la formation, n'hésitez pas si vous avez la moindre question.`,
    ``,
    `Bien cordialement,`,
    `Ziane Rabah - Responsable pédagogique Delivery Digital`,
  ].filter((l) => l !== '').join('\n');
}

const waDigits = (phone?: string) => {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('33')) return d;
  if (d.startsWith('0')) return `33${d.slice(1)}`;
  return d;
};

/* ===================== Planification sur les dispos du formateur ===================== */

type PlanSlot = { date: string; from: string; to: string; mode: 'visio' | 'presentiel' | 'afest' };
type Availability = {
  recurring: { days: number[]; slots: { from: string; to: string }[] };
  blocked: { day: string; kind: string; hours: { from: string; to: string }[]; label: string }[];
  // Jours que le formateur a déclarés disponibles : hors de cette liste, on ne l'assigne pas.
  available: { day: string; kind: string; hours: { from: string; to: string }[] }[];
  busy: { day: string; from: string; to: string; label: string }[];
};
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MODE_LABEL: Record<PlanSlot['mode'], string> = { visio: 'Visioconférence', presentiel: 'Présentiel', afest: 'Situation de travail (AFEST)' };
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const addHours = (t: string, h: number) => { const m = Math.min(23 * 60 + 59, toMin(t) + Math.round(h * 60)); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDayLong = (day: string) => day ? new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';

/**
 * Vérifie un créneau contre les dispos du formateur : jour bloqué, hors créneaux récurrents,
 * ou chevauchement avec un autre cours déjà assigné. Renvoie null si tout va bien.
 * @author Rabah Ziane · 2026-07-20
 */
function slotIssue(s: PlanSlot, av: Availability | null): { level: 'error' | 'warn'; text: string } | null {
  if (!s.date) return { level: 'error', text: 'Date manquante' };
  if (toMin(s.from) >= toMin(s.to)) return { level: 'error', text: 'Fin avant début' };
  if (!av) return null;
  // Règle principale : le formateur n'intervient que sur les jours qu'il a déclarés.
  const avail = av.available.find((a) => a.day === s.date);
  if (!avail) return { level: 'error', text: 'Jour non déclaré disponible par le formateur' };
  if (avail.kind === 'am' && toMin(s.to) > 12 * 60) return { level: 'error', text: 'Disponible le matin uniquement' };
  if (avail.kind === 'pm' && toMin(s.from) < 12 * 60) return { level: 'error', text: 'Disponible l\'après-midi uniquement' };
  if (avail.kind === 'hours' && !avail.hours.some((h) => toMin(s.from) >= toMin(h.from) && toMin(s.to) <= toMin(h.to))) {
    return { level: 'error', text: `Hors créneaux déclarés (${avail.hours.map((h) => `${h.from}-${h.to}`).join(', ')})` };
  }
  const blk = av.blocked.find((b) => b.day === s.date);
  if (blk) {
    if (blk.kind === 'full') return { level: 'error', text: `Jour bloqué${blk.label ? ' - ' + blk.label : ''}` };
    if (blk.kind === 'am' && toMin(s.from) < 12 * 60) return { level: 'error', text: 'Matinée bloquée' };
    if (blk.kind === 'pm' && toMin(s.to) > 12 * 60) return { level: 'error', text: 'Après-midi bloqué' };
    if (blk.kind === 'hours' && blk.hours.some((h) => toMin(s.from) < toMin(h.to) && toMin(s.to) > toMin(h.from))) return { level: 'error', text: 'Créneau bloqué' };
  }
  const clash = av.busy.find((b) => b.day === s.date && toMin(s.from) < toMin(b.to) && toMin(s.to) > toMin(b.from));
  if (clash) return { level: 'error', text: `Déjà pris - ${clash.label}` };
  const wd = new Date(`${s.date}T12:00:00`).getDay();
  if (av.recurring.days.length && !av.recurring.days.includes(wd)) return { level: 'warn', text: `${DAY_NAMES[wd]} hors jours habituels` };
  if (av.recurring.slots.length && !av.recurring.slots.some((r) => toMin(s.from) >= toMin(r.from) && toMin(s.to) <= toMin(r.to))) return { level: 'warn', text: 'Hors créneaux habituels' };
  return null;
}

/**
 * Première date >= `after` qui tombe sur un jour habituel du formateur, non bloquée et
 * sans cours déjà posé : sert à pré-remplir les journées suivantes en un clic.
 */
function nextFreeDate(av: Availability | null, after: string, taken: string[]): string {
  const start = new Date(`${after || iso(new Date())}T12:00:00`);
  for (let i = 1; i <= 120; i++) {
    const d = new Date(start.getTime() + i * 864e5);
    const day = iso(d);
    if (taken.includes(day)) continue;
    if (!av) return day;
    if (!av.available.some((a) => a.day === day)) continue;   // uniquement les jours déclarés
    if (av.blocked.some((b) => b.day === day && b.kind === 'full')) continue;
    return day;
  }
  return iso(new Date(start.getTime() + 864e5));
}

/**
 * Calendrier mensuel des disponibilités du formateur, repris à l'identique de son espace
 * (journée / matin / après-midi / créneaux). Deux usages en un clic :
 *  - mode "Planifier" : on pose les journées du cours sur les jours réellement libres ;
 *  - mode "Bloquer"   : on pose une indisponibilité pour lui (accord pris au téléphone).
 * @author Rabah Ziane · 2026-07-20
 */
function AvailabilityCalendar({ av, slots, defaultFrom, onToggleDay, onBlock, onUnblock }: {
  av: Availability | null; slots: PlanSlot[]; defaultFrom: string;
  onToggleDay: (day: string) => void; onBlock: (day: string) => void; onUnblock: (day: string) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [mode, setMode] = useState<'plan' | 'block'>('plan');
  const todayIso = iso(today);
  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // Grille lundi -> dimanche, cases vides avant le 1er du mois.
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const shift = (first.getDay() + 6) % 7;
    const nb = new Date(cursor.y, cursor.m + 1, 0).getDate();
    return [...Array(shift).fill(null), ...Array.from({ length: nb }, (_, i) => i + 1)];
  }, [cursor]);

  const blockedBy = useMemo(() => Object.fromEntries((av?.blocked || []).map((b) => [b.day, b])), [av]);
  const availableBy = useMemo(() => Object.fromEntries((av?.available || []).map((a) => [a.day, a])), [av]);
  const busyBy = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const b of av?.busy || []) (m[b.day] ||= []).push(`${b.from}-${b.to} ${b.label}`);
    return m;
  }, [av]);
  const picked = useMemo(() => new Set(slots.map((s) => s.date)), [slots]);

  return (
    <div className="rounded-xl bg-white p-3">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex gap-1">
          <button type="button" onClick={() => setMode('plan')} className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${mode === 'plan' ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#86868B]'}`}>Planifier</button>
          <button type="button" onClick={() => setMode('block')} className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${mode === 'block' ? 'bg-[#FF3B30] text-white' : 'bg-[#F5F5F7] text-[#86868B]'}`}>Bloquer</button>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setCursor((c) => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })} className="p-1 rounded-lg bg-[#F5F5F7]"><ChevronLeft className="h-3.5 w-3.5" /></button>
          <span className="text-[12.5px] font-semibold capitalize w-[120px] text-center">{monthName}</span>
          <button type="button" onClick={() => setCursor((c) => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })} className="p-1 rounded-lg bg-[#F5F5F7]"><ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2 text-[10.5px] text-[#86868B] flex-wrap">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#0066CC]" /> Journée du cours</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#34C759]/40" /> Déclaré disponible</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FF3B30]" /> Indisponible</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#E5B567]" /> Créneaux bloqués</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#86868B]/40" /> Autre cours</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#F5F5F7] border border-black/10" /> Non déclaré</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-[10.5px] text-[#86868B] font-semibold py-0.5">{d}</div>)}
        {cells.map((c, i) => {
          if (c == null) return <div key={i} />;
          const day = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
          const blk = blockedBy[day];
          const avail = availableBy[day];
          const busy = busyBy[day];
          const isPicked = picked.has(day);
          const isPast = day < todayIso;

          // Non déclaré = non assignable : c'est l'état par défaut, volontairement effacé.
          let cls = 'bg-[#F5F5F7] text-[#C7C7CC]';
          if (avail) cls = 'bg-[#34C759]/20 text-[#1D1D1F] hover:bg-[#34C759]/30';
          if (busy) cls = 'bg-[#86868B]/20 text-[#1D1D1F]';
          if (blk?.kind === 'hours') cls = 'bg-[#E5B567]/25 text-[#1D1D1F]';
          else if (blk) cls = 'bg-[#FF3B30] text-white';
          if (isPicked) cls = 'bg-[#0066CC] text-white';

          const dispoLabel = avail ? ({ full: 'journée entière', am: 'matin', pm: 'après-midi', hours: (avail.hours || []).map((h) => `${h.from}-${h.to}`).join(', ') }[avail.kind] || avail.kind) : '';
          const title = [
            avail ? `Déclaré disponible : ${dispoLabel}` : 'Non déclaré disponible',
            blk ? `Indisponible (${{ full: 'journée', am: 'matin', pm: 'après-midi', hours: 'créneaux' }[blk.kind] || blk.kind})` : '',
            busy ? `Déjà pris : ${busy.join(', ')}` : '',
            mode === 'block' ? (blk ? 'Cliquer pour débloquer' : 'Cliquer pour bloquer la journée') : 'Cliquer pour ajouter au cours',
          ].filter(Boolean).join(' · ');

          return (
            <button key={i} type="button" title={title} disabled={isPast}
              onClick={() => { if (mode === 'block') { blk ? onUnblock(day) : onBlock(day); } else { onToggleDay(day); } }}
              className={`relative aspect-square rounded-lg text-[12px] font-medium overflow-hidden transition-colors ${isPast ? 'bg-[#F5F5F7] text-[#C7C7CC] cursor-not-allowed' : cls}`}>
              {blk?.kind === 'am' && <span className="absolute inset-x-0 top-0 h-1/2 bg-[#FF3B30]" />}
              {blk?.kind === 'pm' && <span className="absolute inset-x-0 bottom-0 h-1/2 bg-[#FF3B30]" />}
              <span className="relative z-10">{c}</span>
              {isPicked && <span className="absolute bottom-0.5 inset-x-0 text-[8px] leading-none font-bold z-10">{slots.find((s) => s.date === day)?.from || defaultFrom}</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[#86868B] mt-2">
        {mode === 'plan' ? 'Cliquez sur les jours à réserver, puis ajustez les horaires ci-dessous.' : 'Cliquez sur un jour pour le rendre indisponible (journée entière). Recliquez pour le libérer.'}
      </p>
    </div>
  );
}

function AssignModal({ trainers, dossiers, formations, hdrJson, onClose, onDone }: { trainers: Trainer[]; dossiers: Dossier[]; formations: Formation[]; hdrJson: any; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'opco' | 'manual'>('opco');
  const [trainerId, setTrainerId] = useState('');
  const [dossierId, setDossierId] = useState('');
  const [pedagoName, setPedagoName] = useState(''); const [pedagoPhone, setPedagoPhone] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [clientContactName, setClientContactName] = useState(''); const [clientPhone, setClientPhone] = useState('');
  const [m, setM] = useState({ formationKey: '', formationTitle: '', hours: '', clientName: '', clientEmail: '', location: 'Présentiel', addr: '', startAt: '', endAt: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const inp = 'w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] text-[14px] text-[#1D1D1F] outline-none';

  /* Dispos du formateur : chargées dès qu'il est choisi, pour caler les créneaux du cours. @Rabah 2026-07-20 */
  const [av, setAv] = useState<Availability | null>(null);
  const [avLoading, setAvLoading] = useState(false);
  const [slots, setSlots] = useState<PlanSlot[]>([]);
  useEffect(() => {
    if (!trainerId) { setAv(null); return; }
    let alive = true; setAvLoading(true);
    fetch(`/api/admin/trainers/${trainerId}/availability`, { headers: hdrJson })
      .then((r) => r.json()).then((j) => { if (alive && j.ok) setAv({ recurring: j.recurring, blocked: j.blocked || [], available: j.available || [], busy: j.busy || [] }); })
      .catch(() => { if (alive) setAv(null); })
      .finally(() => { if (alive) setAvLoading(false); });
    return () => { alive = false; };
  }, [trainerId, hdrJson]);

  // Date de référence : celle du dossier OPCO choisi, sinon le début saisi, sinon aujourd'hui.
  const refDate = useMemo(() => {
    const d = dossiers.find((x) => x._id === dossierId);
    if (mode === 'opco' && d?.sessionStart) return iso(new Date(d.sessionStart));
    return m.startAt || iso(new Date());
  }, [mode, dossierId, dossiers, m.startAt]);

  const defaultSlot = (date: string): PlanSlot => {
    const from = av?.recurring.slots[0]?.from || '09:00';
    return { date, from, to: addHours(from, 1), mode: 'visio' };
  };
  const addSlot = () => setSlots((prev) => {
    if (prev.length === 0) return [defaultSlot(refDate)];
    const last = prev[prev.length - 1];
    return [...prev, { date: nextFreeDate(av, last.date, prev.map((s) => s.date)), from: last.from, to: last.to, mode: last.mode }];
  });
  // Raccourci du cas courant : N journées disponibles, X h encadrées par jour.
  const fillDays = (n: number, hoursPerDay: number) => {
    const out: PlanSlot[] = [];
    let cursor = '';
    for (let i = 0; i < n; i++) {
      const date = i === 0 ? refDate : nextFreeDate(av, cursor, out.map((s) => s.date));
      cursor = date;
      const from = av?.recurring.slots[0]?.from || '09:00';
      out.push({ date, from, to: addHours(from, hoursPerDay), mode: 'visio' });
    }
    setSlots(out);
  };
  const setSlot = (i: number, patch: Partial<PlanSlot>) => setSlots((prev) => prev.map((s, k) => k === i ? { ...s, ...patch } : s));

  /* --- Calendrier : sélection des journées + blocage d'indisponibilités --- */
  const toggleDay = (day: string) => setSlots((prev) => {
    if (prev.some((s) => s.date === day)) return prev.filter((s) => s.date !== day);
    const last = prev[prev.length - 1];
    const from = last?.from || av?.recurring.slots[0]?.from || '09:00';
    const to = last?.to || addHours(from, 1);
    return [...prev, { date: day, from, to, mode: last?.mode || 'visio' }].sort((a, b) => a.date.localeCompare(b.date));
  });
  // Écriture immédiate côté serveur + mise à jour locale, pour que le calendrier reste juste.
  const blockDay = async (day: string) => {
    setAv((p) => p ? { ...p, blocked: [...p.blocked, { day, kind: 'full', hours: [], label: '' }] } : p);
    setSlots((prev) => prev.filter((s) => s.date !== day));
    await fetch(`/api/admin/trainers/${trainerId}/unavailability`, { method: 'POST', headers: hdrJson, body: JSON.stringify({ day, kind: 'full' }) }).catch(() => {});
  };
  const unblockDay = async (day: string) => {
    setAv((p) => p ? { ...p, blocked: p.blocked.filter((b) => b.day !== day) } : p);
    await fetch(`/api/admin/trainers/${trainerId}/unavailability/${day}`, { method: 'DELETE', headers: hdrJson }).catch(() => {});
  };
  const plannedHours = useMemo(() => Math.round(slots.reduce((n, s) => n + Math.max(0, toMin(s.to) - toMin(s.from)) / 60, 0) * 100) / 100, [slots]);
  const blockingIssue = slots.some((s) => slotIssue(s, av)?.level === 'error');
  /**
   * Le modal fermait même quand le serveur refusait la création (400 invalid_trainer,
   * 404 dossier_not_found, 401 session admin expirée...) : on croyait le cours assigné
   * alors que rien n'était créé et que l'espace formateur restait vide.
   * On vérifie donc la réponse et on affiche l'erreur au lieu de fermer.
   * @author Rabah Ziane · 2026-07-20
   */
  const post = async (url: string, payload: any) => {
    let r: Response;
    try { r = await fetch(url, { method: 'POST', headers: hdrJson, body: JSON.stringify(payload) }); }
    catch { throw new Error('Réseau indisponible - le cours n’a pas été créé.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.error === 'invalid_trainer' ? 'Formateur introuvable ou compte non formateur.' : j.error === 'dossier_not_found' ? 'Dossier OPCO introuvable.' : r.status === 401 || r.status === 403 ? 'Session admin expirée - reconnectez-vous.' : `Échec (${r.status}) : ${j.error || 'erreur serveur'}`);
    return j;
  };
  const submit = async () => {
    if (!trainerId) { setErr('Choisissez un formateur.'); return; }
    if (blockingIssue) { setErr('Un créneau est en conflit avec les disponibilités du formateur. Corrigez-le avant d’assigner.'); return; }
    setBusy(true); setErr('');
    try {
      if (mode === 'opco') {
        if (!dossierId) { setErr('Choisissez un dossier OPCO.'); return; }
        await post('/api/admin/trainers/sessions/from-dossier', { trainerId, dossierId, pedagoName, pedagoPhone, meetingLink, clientContactName, clientPhone, days: slots });
      } else {
        const sel = formations.find((f) => f.program_id === m.formationKey);
        if (!m.formationKey && !m.formationTitle.trim()) { setErr('Choisissez une formation ou saisissez un titre.'); return; }
        await post('/api/admin/trainers/sessions', { trainerId, formationKey: m.formationKey, formationTitle: m.formationTitle || sel?.title, hours: m.hours ? Number(m.hours) : (sel?.duration_hours || 0), clientName: m.clientName, clientEmail: m.clientEmail, location: m.location, addr: m.addr, startAt: m.startAt || undefined, endAt: m.endAt || undefined, pedagoName, pedagoPhone, meetingLink, clientContactName, clientPhone, days: slots });
      }
      onDone();
    } catch (e: any) { setErr(e?.message || 'Échec de l’assignation.'); }
    finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose} title="Assigner un cours" wide>
      <div className="flex gap-1.5 mb-4">
        <button onClick={() => setMode('opco')} className={`px-4 py-2 rounded-full text-[13px] font-semibold ${mode === 'opco' ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#86868B]'}`}>Depuis un dossier OPCO</button>
        <button onClick={() => setMode('manual')} className={`px-4 py-2 rounded-full text-[13px] font-semibold ${mode === 'manual' ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#86868B]'}`}>Session manuelle</button>
      </div>
      <div className="space-y-3">
        <label className="block"><span className="text-[12px] font-semibold text-[#1D1D1F]">Formateur</span>
          <select className={inp} value={trainerId} onChange={(e) => setTrainerId(e.target.value)}><option value="">Choisir…</option>{trainers.map((t) => <option key={t._id} value={t._id}>{t.name} {t.hourlyRate ? `(${t.hourlyRate}€/h)` : ''}</option>)}</select>
        </label>
        {mode === 'opco' ? (
          <label className="block"><span className="text-[12px] font-semibold text-[#1D1D1F]">Dossier OPCO</span>
            <select className={inp} value={dossierId} onChange={(e) => setDossierId(e.target.value)}><option value="">Choisir…</option>{dossiers.map((d) => <option key={d._id} value={d._id}>{d.denom} · {d.formationTitle} · {fmtDate(d.sessionStart)} · {(d.salaries || []).length} app.</option>)}</select>
            <span className="text-[11px] text-[#86868B] mt-1 block">Le cours réutilise automatiquement client, apprenants, dates et durée du dossier.</span>
          </label>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2"><span className="text-[12px] font-semibold text-[#1D1D1F]">Formation</span>
              <select className={inp} value={m.formationKey} onChange={(e) => { const sel = formations.find((f) => f.program_id === e.target.value); setM({ ...m, formationKey: e.target.value, formationTitle: sel?.title || '', hours: sel ? String(sel.duration_hours) : m.hours }); }}><option value="">Choisir ou saisir…</option>{formations.map((f) => <option key={f._id} value={f.program_id}>{f.title}</option>)}</select>
            </label>
            <input className={inp} placeholder="Titre (si hors catalogue)" value={m.formationTitle} onChange={(e) => setM({ ...m, formationTitle: e.target.value })} />
            <input className={inp} type="number" placeholder="Durée (heures)" value={m.hours} onChange={(e) => setM({ ...m, hours: e.target.value })} />
            <input className={inp} placeholder="Client" value={m.clientName} onChange={(e) => setM({ ...m, clientName: e.target.value })} />
            <input className={inp} placeholder="Email client" value={m.clientEmail} onChange={(e) => setM({ ...m, clientEmail: e.target.value })} />
            <input className={inp} placeholder="Lieu (présentiel / visio)" value={m.location} onChange={(e) => setM({ ...m, location: e.target.value })} />
            <input className={inp} placeholder="Adresse" value={m.addr} onChange={(e) => setM({ ...m, addr: e.target.value })} />
            <label className="block"><span className="text-[11px] text-[#86868B]">Début</span><input className={inp} type="date" value={m.startAt} onChange={(e) => setM({ ...m, startAt: e.target.value })} /></label>
            <label className="block"><span className="text-[11px] text-[#86868B]">Fin</span><input className={inp} type="date" value={m.endAt} onChange={(e) => setM({ ...m, endAt: e.target.value })} /></label>
          </div>
        )}
        {/* Planification sur les disponibilités réelles du formateur. @Rabah 2026-07-20 */}
        {trainerId && (
          <div className="rounded-2xl bg-[#F5F5F7] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[13px] font-semibold text-[#1D1D1F] inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> Créneaux du cours</span>
              {avLoading ? <span className="text-[12px] text-[#86868B] inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> dispos…</span>
                : av && <span className="text-[12px] text-[#86868B]">
                    {av.recurring.days.length ? av.recurring.days.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ') : 'Tous les jours'}
                    {av.recurring.slots.length ? ' · ' + av.recurring.slots.map((s) => `${s.from}-${s.to}`).join(', ') : ''}
                  </span>}
            </div>

            <AvailabilityCalendar av={av} slots={slots} defaultFrom={av?.recurring.slots[0]?.from || '09:00'}
              onToggleDay={toggleDay} onBlock={blockDay} onUnblock={unblockDay} />

            {slots.length === 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] text-[#86868B]">Modèle rapide :</span>
                <button type="button" onClick={() => fillDays(3, 1)} className="px-3 py-1.5 rounded-full bg-white text-[12.5px] font-semibold text-[#1D1D1F]">3 jours × 1 h</button>
                <button type="button" onClick={() => fillDays(3, 2)} className="px-3 py-1.5 rounded-full bg-white text-[12.5px] font-semibold text-[#1D1D1F]">3 jours × 2 h</button>
                <button type="button" onClick={() => fillDays(1, 7)} className="px-3 py-1.5 rounded-full bg-white text-[12.5px] font-semibold text-[#1D1D1F]">1 jour × 7 h</button>
              </div>
            )}

            {slots.map((s, i) => {
              const issue = slotIssue(s, av);
              return (
                <div key={i} className="rounded-xl bg-white p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-semibold text-[#86868B] w-14 shrink-0">Jour {i + 1}</span>
                    <input type="date" value={s.date} onChange={(e) => setSlot(i, { date: e.target.value })} className="px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] text-[13px] text-[#1D1D1F] outline-none" />
                    <input type="time" value={s.from} onChange={(e) => setSlot(i, { from: e.target.value, to: addHours(e.target.value, Math.max(0.25, (toMin(s.to) - toMin(s.from)) / 60)) })} className="px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] text-[13px] text-[#1D1D1F] outline-none" />
                    <span className="text-[12px] text-[#86868B]">→</span>
                    <input type="time" value={s.to} onChange={(e) => setSlot(i, { to: e.target.value })} className="px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] text-[13px] text-[#1D1D1F] outline-none" />
                    <select value={s.mode} onChange={(e) => setSlot(i, { mode: e.target.value as PlanSlot['mode'] })} className="px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] text-[13px] text-[#1D1D1F] outline-none">
                      {(Object.keys(MODE_LABEL) as PlanSlot['mode'][]).map((k) => <option key={k} value={k}>{MODE_LABEL[k]}</option>)}
                    </select>
                    <button type="button" onClick={() => setSlots(slots.filter((_, k) => k !== i))} className="ml-auto p-1.5 rounded-lg text-[#86868B] hover:bg-[#F5F5F7]"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="mt-1.5 text-[12px] pl-14">
                    {issue
                      ? <span className={issue.level === 'error' ? 'text-[#FF3B30] inline-flex items-center gap-1' : 'text-[#b5740a] inline-flex items-center gap-1'}><Ban className="h-3 w-3" /> {issue.text}</span>
                      : <span className="text-[#1a8a3b] inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {fmtDayLong(s.date)} - disponible</span>}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button type="button" onClick={addSlot} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-[13px] font-semibold text-[#1D1D1F]"><Plus className="h-3.5 w-3.5" /> Ajouter une journée</button>
              {slots.length > 0 && <span className="text-[12.5px] text-[#86868B]">{slots.length} journée{slots.length > 1 ? 's' : ''} · <strong className="text-[#1D1D1F]">{plannedHours} h</strong> encadrées{m.hours || dossierId ? ' (durée pédagogique totale inchangée)' : ''}</span>}
            </div>
            {slots.length === 0 && <p className="text-[12px] text-[#86868B]">Sans créneau, le cours reprend les dates brutes du dossier.</p>}
          </div>
        )}

        {/* Salle de visio partagée dans le groupe WhatsApp ; générée si laissée vide. @Rabah 2026-07-20 */}
        <label className="block">
          <span className="text-[12px] font-semibold text-[#1D1D1F]">Lien de visioconférence</span>
          <input className={inp} placeholder="Laisser vide = salle créée automatiquement (partage d'écran inclus)" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} />
          <span className="text-[11px] text-[#86868B] mt-1 block">Collez votre lien Meet / Zoom / Teams, ou laissez vide : le formateur recevra une salle dédiée à partager dans le groupe WhatsApp.</span>
        </label>

        {/* Interlocuteur client : le formateur l'appelle avant la formation pour caler les dates. @Rabah 2026-07-20 */}
        <div className="grid grid-cols-2 gap-3">
          <input className={inp} placeholder="Contact client (nom)" value={clientContactName} onChange={(e) => setClientContactName(e.target.value)} />
          <input className={inp} placeholder="Tél. contact client" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input className={inp} placeholder="Responsable pédagogique" value={pedagoName} onChange={(e) => setPedagoName(e.target.value)} />
          <input className={inp} placeholder="Tél. responsable pédago" value={pedagoPhone} onChange={(e) => setPedagoPhone(e.target.value)} />
        </div>
        {err && <p className="text-[13px] text-[#FF3B30]">{err}</p>}
        <button onClick={submit} disabled={busy} className="w-full px-5 py-3 rounded-full bg-[#1D1D1F] text-white text-[14px] font-semibold disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Assigner et notifier le formateur'}</button>
      </div>
    </Modal>
  );
}

/* ===================== Instructions ===================== */
function InstructionsAdmin({ hdr, hdrJson }: { hdr: any; hdrJson: any }) {
  const [items, setItems] = useState<any[] | null>(null);
  const load = useCallback(async () => { const j = await fetch('/api/admin/trainers/instructions', { headers: hdr }).then((r) => r.json()); setItems(j.instructions || []); }, [hdr]);
  useEffect(() => { load(); }, [load]);
  const add = async () => { await fetch('/api/admin/trainers/instructions', { method: 'POST', headers: hdrJson, body: JSON.stringify({ title: 'Nouvelle étape', body: '' }) }); load(); };
  if (!items) return <Loading />;
  return (
    <div className="space-y-3 max-w-[760px]">
      <p className="text-[13px] text-[#86868B]">Ce que le formateur doit faire quand un cours est prévu (visible dans son espace). Éditez librement pour ajouter d'autres actions.</p>
      <button onClick={add} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1F] text-white text-[14px] font-semibold"><Plus className="h-4 w-4" /> Ajouter une étape</button>
      {items.length === 0 ? <Empty text="Aucune instruction. Ajoutez la première étape (ex : créer le groupe WhatsApp)." /> : (
        <div className="space-y-3">{items.map((it) => <InstructionRow key={it._id} it={it} hdrJson={hdrJson} onChanged={load} />)}</div>
      )}
    </div>
  );
}
function InstructionRow({ it, hdrJson, onChanged }: { it: any; hdrJson: any; onChanged: () => void }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ title: it.title, body: it.body, order: it.order });
  const save = async () => { await fetch(`/api/admin/trainers/instructions/${it._id}`, { method: 'PUT', headers: hdrJson, body: JSON.stringify(f) }); setEdit(false); onChanged(); };
  const del = async () => { if (!confirm('Supprimer cette étape ?')) return; await fetch(`/api/admin/trainers/instructions/${it._id}`, { method: 'DELETE', headers: hdrJson }); onChanged(); };
  const inp = 'w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] text-[14px] text-[#1D1D1F] outline-none';
  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/5 p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {edit ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input className={`${inp} w-20`} type="number" value={f.order} onChange={(e) => setF({ ...f, order: Number(e.target.value) })} />
            <input className={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Titre" />
          </div>
          <textarea className={`${inp} min-h-[100px]`} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Description détaillée…" />
          <div className="flex gap-2"><button onClick={save} className="px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[13px] font-semibold">Enregistrer</button><button onClick={() => setEdit(false)} className="px-4 py-2 rounded-full text-[#86868B] text-[13px]">Annuler</button></div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-[#1D1D1F]">{it.order != null ? it.order + 1 + '. ' : ''}{it.title}</div>
            <p className="text-[13px] text-[#86868B] mt-1 whitespace-pre-wrap">{it.body || <span className="italic">(vide)</span>}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setEdit(true)} className="p-2 rounded-lg hover:bg-black/5 text-[#86868B]"><Edit3 className="h-4 w-4" /></button>
            <button onClick={del} className="p-2 rounded-lg hover:bg-[#FF3B30]/10 text-[#FF3B30]"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== helpers ===================== */
function Modal({ children, title, onClose, wide }: { children: React.ReactNode; title: string; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-auto" onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-[640px]' : 'max-w-[460px]'} my-8 p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-[18px] font-bold text-[#1D1D1F]">{title}</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 text-[#86868B]"><X className="h-4 w-4" /></button></div>
        {children}
      </div>
    </div>
  );
}
function Loading() { return <div className="flex items-center justify-center py-16 text-[#86868B]"><Loader2 className="h-6 w-6 animate-spin" /></div>; }
function Empty({ text }: { text: string }) { return <div className="bg-white rounded-2xl ring-1 ring-black/5 p-10 text-center text-[#86868B] text-[14px]">{text}</div>; }
