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
} from 'lucide-react';

const PILL = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-semibold';
const euro = (n: number) => (n || 0).toLocaleString('fr-FR') + ' €';
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

type Trainer = {
  _id: string; name: string; email: string; phone?: string; status: string;
  hourlyRate?: number; trainerSkills?: string[]; last_login?: string;
  ribPdfUrl?: string; bankValidated?: boolean; onboardingValidated?: boolean;
  companyInfo?: any; contract?: any; iban?: string; bic?: string; accountHolder?: string;
};
type Formation = { _id: string; program_id: string; title: string; duration_hours: number };
type Dossier = { _id: string; denom?: string; formationTitle?: string; sessionStart?: string; salaries?: any[]; status?: string };
type Session = {
  _id: string; source: string; trainerName?: string; formationTitle?: string; clientName?: string;
  hours?: number; hourlyRate?: number; payAmount?: number; status: string; sessionStart?: string;
  doneAt?: string; invoiceNumber?: string; learners?: any[]; whatsappGroupCreated?: boolean;
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
      <button onClick={() => setAssign(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1F] text-white text-[14px] font-semibold"><Plus className="h-4 w-4" /> Assigner un cours</button>

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

      {sessions.length === 0 ? <Empty text="Aucun cours. Assignez un formateur à un dossier OPCO ou créez une session." /> : (
        <div className="space-y-2">{sessions.map((s) => <SessionAdminRow key={s._id} s={s} hdrJson={hdrJson} onChanged={load} onOpen={() => setDetailId(s._id)} />)}</div>
      )}

      {assign && <AssignModal trainers={trainers} dossiers={dossiers} formations={formations} hdrJson={hdrJson} onClose={() => setAssign(false)} onDone={() => { setAssign(false); load(); }} />}
      {detailId && <SessionDetailModal id={detailId} hdr={hdr} onClose={() => setDetailId(null)} />}
    </div>
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

function SessionAdminRow({ s, hdrJson, onChanged, onOpen }: { s: Session; hdrJson: any; onChanged: () => void; onOpen: () => void }) {
  const [busy, setBusy] = useState(false);
  const statusMeta: Record<string, { label: string; cls: string }> = {
    scheduled: { label: 'Planifié', cls: 'bg-[#0066CC]/10 text-[#0066CC]' },
    done: { label: 'Réalisé · encaissable', cls: 'bg-[#34C759]/12 text-[#1a8a3b]' },
    encashRequested: { label: 'Encaissement demandé', cls: 'bg-[#FF9F0A]/12 text-[#b5740a]' },
    paid: { label: 'Payé', cls: 'bg-black/5 text-[#86868B]' },
    cancelled: { label: 'Annulé', cls: 'bg-[#FF3B30]/10 text-[#FF3B30]' },
  };
  const sm = statusMeta[s.status] || statusMeta.scheduled;
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
        {s.status === 'scheduled' && <button onClick={() => markDone(true)} disabled={busy} className="px-4 py-1.5 rounded-full bg-[#34C759] text-white text-[12.5px] font-semibold disabled:opacity-60">Marquer réalisée</button>}
        {s.status === 'done' && <button onClick={() => markDone(false)} disabled={busy} className="px-4 py-1.5 rounded-full bg-black/5 text-[#86868B] text-[12.5px] font-semibold">Annuler « réalisée »</button>}
        {s.status === 'encashRequested' && <button onClick={async () => { setBusy(true); try { await fetch(`/api/admin/trainers/sessions/${s._id}/pay`, { method: 'POST', headers: hdrJson, body: '{}' }); onChanged(); } finally { setBusy(false); } }} className="px-4 py-1.5 rounded-full bg-[#34C759] text-white text-[12.5px] font-semibold">Marquer payé</button>}
      </div>
    </div>
  );
}

function AssignModal({ trainers, dossiers, formations, hdrJson, onClose, onDone }: { trainers: Trainer[]; dossiers: Dossier[]; formations: Formation[]; hdrJson: any; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'opco' | 'manual'>('opco');
  const [trainerId, setTrainerId] = useState('');
  const [dossierId, setDossierId] = useState('');
  const [pedagoName, setPedagoName] = useState(''); const [pedagoPhone, setPedagoPhone] = useState('');
  const [m, setM] = useState({ formationKey: '', formationTitle: '', hours: '', clientName: '', clientEmail: '', location: 'Présentiel', addr: '', startAt: '', endAt: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const inp = 'w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] text-[14px] text-[#1D1D1F] outline-none';
  const submit = async () => {
    if (!trainerId) { setErr('Choisissez un formateur.'); return; }
    setBusy(true); setErr('');
    try {
      if (mode === 'opco') {
        if (!dossierId) { setErr('Choisissez un dossier OPCO.'); setBusy(false); return; }
        await fetch('/api/admin/trainers/sessions/from-dossier', { method: 'POST', headers: hdrJson, body: JSON.stringify({ trainerId, dossierId, pedagoName, pedagoPhone }) });
      } else {
        const sel = formations.find((f) => f.program_id === m.formationKey);
        await fetch('/api/admin/trainers/sessions', { method: 'POST', headers: hdrJson, body: JSON.stringify({ trainerId, formationKey: m.formationKey, formationTitle: m.formationTitle || sel?.title, hours: m.hours ? Number(m.hours) : (sel?.duration_hours || 0), clientName: m.clientName, clientEmail: m.clientEmail, location: m.location, addr: m.addr, startAt: m.startAt || undefined, endAt: m.endAt || undefined, pedagoName, pedagoPhone }) });
      }
      onDone();
    } finally { setBusy(false); }
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
