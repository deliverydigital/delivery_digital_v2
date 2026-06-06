/**
 * Espace FORMATEUR (deliverydigital.fr/formateur). Même principe que l'espace agence :
 * connexion par mot de passe généré, activation du compte (infos + RIB + contrat) validée
 * par le superadmin, puis gestion des disponibilités, taux horaire négocié (lecture seule),
 * formations rattachées, cours à venir (+ rappels), fonds disponibles avec bouton Encaisser
 * (facture + ordre d'encaissement), et rubrique Instructions (groupe WhatsApp, etc.).
 * @author Rabah Ziane · 2026-06-06
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LogOut, Loader2, CheckCircle2, Clock, CalendarDays, GraduationCap, Wallet,
  ListChecks, Building2, FileSignature, BadgeEuro, MessageCircle, Users, AlertCircle,
  Upload, Send, ChevronLeft, ChevronRight, MapPin, Phone, Mail,
} from 'lucide-react';

const TOKEN_KEY = 'dd_trainer_token';
const LOGO_URL = '/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png';
const BLUE = '#0066CC';
const DOTTED_BG: React.CSSProperties = { backgroundColor: '#0E0F13', backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' };

type TabKey = 'cours' | 'dispo' | 'formations' | 'fonds' | 'instructions' | 'profil';

type Trainer = {
  id: string; name: string; email: string; phone: string;
  hourlyRate: number; trainerSkills: string[];
  iban: string; bic: string; accountHolder: string; bankCountry: string; bankData: any;
  ribPdfUrl: string; bankValidated: boolean;
  companyInfo: any;
  contract: { signed: boolean; signedBy: string; signedFunction: string; signedAt: string | null; validated: boolean };
  onboardingValidated: boolean;
};
type Formation = { _id: string; program_id: string; title: string; duration_hours: number; description?: string; category?: string };
type Learner = { firstname?: string; lastname?: string; email?: string; phone?: string };
type Session = {
  _id: string; source: 'opco' | 'manual'; formationTitle?: string; hours?: number;
  clientName?: string; clientEmail?: string; location?: string; addr?: string;
  sessionStart?: string; sessionEnd?: string; learners?: Learner[];
  pedagoName?: string; pedagoPhone?: string;
  whatsappGroupCreated?: boolean; whatsappGroupLink?: string;
  hourlyRate?: number; payAmount?: number; status: string; doneAt?: string; invoiceNumber?: string;
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtDay = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
const euro = (n: number) => (n || 0).toLocaleString('fr-FR') + ' €';

export default function TrainerSpace() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  if (!token) return <Login onAuth={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} />;
  return <Dashboard token={token} onLogout={() => { localStorage.removeItem(TOKEN_KEY); setToken(null); }} />;
}

function Login({ onAuth }: { onAuth: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }) });
      const j = await r.json();
      if (!r.ok || !j.token) { setError(/invalid email or password/i.test(j.error || j.message || '') ? 'Email ou mot de passe incorrect.' : (j.error || j.message || 'Identifiants invalides')); return; }
      onAuth(j.token);
    } catch { setError('Erreur réseau. Réessayez.'); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 text-white" style={DOTTED_BG}>
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-7">
          <img src={LOGO_URL} alt="Delivery Digital" className="h-10 w-auto mb-5 invert" />
          <h1 className="text-[28px] sm:text-[32px] font-bold text-center">Espace formateur</h1>
          <p className="mt-2 text-[14px] text-white/55 text-center max-w-[340px]">Connectez-vous avec les identifiants communiqués par Delivery Digital.</p>
        </div>
        <form onSubmit={submit} className="rounded-2xl bg-[#181A20] border border-white/10 p-5 sm:p-6 space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus placeholder="Email" className="w-full px-4 py-3 rounded-xl bg-[#0E0F13] border border-white/10 outline-none text-[15px] text-white placeholder-white/35" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full px-4 py-3 rounded-xl bg-[#0E0F13] border border-white/10 outline-none text-[15px] text-white placeholder-white/35" />
          {error && <p className="text-[13px] text-[#FF6B6B]">{error}</p>}
          <button type="submit" disabled={busy} className="w-full px-5 py-3 rounded-full text-white text-[15px] font-semibold transition-opacity disabled:opacity-60" style={{ background: BLUE }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const auth = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const authJson = useCallback(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [tab, setTab] = useState<TabKey>('cours');
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const r = await fetch('/api/trainer/self/profile', { headers: auth() });
      if (r.status === 401 || r.status === 403) { onLogout(); return; }
      const j = await r.json();
      if (j.ok) setTrainer(j.trainer);
    } finally { setLoading(false); }
  }, [auth, onLogout]);
  useEffect(() => { loadProfile(); }, [loadProfile]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white" style={DOTTED_BG}><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!trainer) return <div className="min-h-screen flex items-center justify-center text-white" style={DOTTED_BG}>Erreur de chargement. <button onClick={onLogout} className="underline ml-2">Se reconnecter</button></div>;

  const validated = trainer.onboardingValidated;

  return (
    <div className="min-h-screen text-white" style={DOTTED_BG}>
      <header className="border-b border-white/10 sticky top-0 z-30 backdrop-blur" style={{ background: 'rgba(14,15,19,0.85)' }}>
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="DD" className="h-7 w-auto invert" />
            <span className="text-white/30">|</span>
            <span className="text-[14px] font-semibold">Espace formateur</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[13px] font-semibold leading-tight">{trainer.name}</div>
              <div className="text-[11px] text-white/45">{trainer.email}</div>
            </div>
            <button onClick={onLogout} className="inline-flex items-center gap-1.5 text-[12px] text-white/55 hover:text-white"><LogOut className="h-3.5 w-3.5" /> Quitter</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1080px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {!validated && <ActivationBanner trainer={trainer} authJson={authJson} auth={auth} onChanged={loadProfile} />}

        {/* KPIs */}
        <Kpis token={token} hourlyRate={trainer.hourlyRate} validated={validated} />

        {/* Tabs */}
        <nav className="flex gap-1.5 overflow-x-auto pb-1">
          {([
            ['cours', 'Mes cours', <ListChecks className="h-4 w-4" />],
            ['dispo', 'Disponibilités', <CalendarDays className="h-4 w-4" />],
            ['formations', 'Mes formations', <GraduationCap className="h-4 w-4" />],
            ['fonds', 'Fonds', <Wallet className="h-4 w-4" />],
            ['instructions', 'Instructions', <MessageCircle className="h-4 w-4" />],
            ['profil', 'Mon compte', <Building2 className="h-4 w-4" />],
          ] as [TabKey, string, React.ReactNode][]).map(([k, label, icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-colors ${tab === k ? 'text-white' : 'text-white/55 hover:text-white bg-white/5'}`} style={tab === k ? { background: BLUE } : undefined}>
              {icon}{label}
            </button>
          ))}
        </nav>

        {tab === 'cours' && <SessionsTab token={token} auth={auth} authJson={authJson} />}
        {tab === 'dispo' && <DispoTab auth={auth} authJson={authJson} />}
        {tab === 'formations' && <FormationsTab trainer={trainer} auth={auth} />}
        {tab === 'fonds' && <FondsTab trainer={trainer} auth={auth} authJson={authJson} validated={validated} />}
        {tab === 'instructions' && <InstructionsTab auth={auth} />}
        {tab === 'profil' && <ProfilTab trainer={trainer} authJson={authJson} auth={auth} onChanged={loadProfile} />}
      </main>
    </div>
  );
}

/* ============================ KPIs ============================ */
function Kpis({ token, hourlyRate, validated }: { token: string; hourlyRate: number; validated: boolean }) {
  const [data, setData] = useState<{ upcoming: number; available: number } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const auth = { Authorization: `Bearer ${token}` };
        const [sRes, fRes] = await Promise.all([
          fetch('/api/trainer/self/sessions', { headers: auth }).then((r) => r.json()),
          fetch('/api/trainer/self/funds', { headers: auth }).then((r) => r.json()),
        ]);
        const upcoming = (sRes.sessions || []).filter((s: Session) => s.status === 'scheduled' && s.sessionStart && new Date(s.sessionStart) >= new Date(new Date().toDateString())).length;
        setData({ upcoming, available: fRes.totals?.available || 0 });
      } catch { /* */ }
    })();
  }, [token]);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <KpiCard icon={<BadgeEuro className="h-4 w-4" />} label="Taux horaire négocié" value={hourlyRate ? `${hourlyRate} €/h` : '-'} accent={BLUE} />
      <KpiCard icon={<Clock className="h-4 w-4" />} label="Cours à venir" value={data ? String(data.upcoming) : '…'} accent="#E5B567" />
      <KpiCard icon={<Wallet className="h-4 w-4" />} label="Fonds disponibles" value={data ? euro(data.available) : '…'} accent="#3DD68C" />
    </div>
  );
}
function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-[#181A20] border border-white/10 p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/45 font-semibold mb-2" style={{ color: accent }}>{icon}{label}</div>
      <div className="text-[24px] font-bold">{value}</div>
    </div>
  );
}

/* ============================ Activation ============================ */
function ActivationBanner({ trainer, authJson, auth, onChanged }: { trainer: Trainer; authJson: () => any; auth: () => any; onChanged: () => void }) {
  const ci = trainer.companyInfo || {};
  const hasCompany = !!(ci.legalName && ci.address);
  const hasRib = !!(trainer.ribPdfUrl && (trainer.iban || (trainer.bankData && Object.keys(trainer.bankData).length)));
  const hasContract = !!(trainer.contract && trainer.contract.signed);
  return (
    <section className="rounded-2xl bg-[#181A20] border border-[#E5B567]/40 p-5">
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="h-5 w-5 text-[#E5B567] shrink-0 mt-0.5" />
        <div>
          <h2 className="text-[15px] font-bold">Activez votre compte</h2>
          <p className="text-[13px] text-white/60 mt-0.5">Complétez ces 3 étapes. Votre compte sera activé après validation par Delivery Digital.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <StepCard n={1} done={hasCompany} title="Informations" icon={<Building2 className="h-4 w-4" />} />
        <StepCard n={2} done={hasRib} title="RIB (PDF obligatoire)" icon={<Upload className="h-4 w-4" />} />
        <StepCard n={3} done={hasContract} title="Contrat de prestation" icon={<FileSignature className="h-4 w-4" />} />
      </div>
      <p className="text-[12px] text-white/45 mt-4">Rendez-vous dans l'onglet <strong className="text-white/70">Mon compte</strong> pour renseigner ces éléments.</p>
    </section>
  );
}
function StepCard({ n, done, title, icon }: { n: number; done: boolean; title: string; icon: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${done ? 'border-[#3DD68C]/40 bg-[#3DD68C]/5' : 'border-white/10 bg-[#0E0F13]'}`}>
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold ${done ? 'bg-[#3DD68C] text-black' : 'text-white'}`} style={done ? undefined : { background: BLUE }}>{done ? '✓' : n}</span>
      <div className="flex items-center gap-1.5 text-[13px] font-semibold">{icon}{title}</div>
    </div>
  );
}

/* ============================ Mes cours ============================ */
function SessionsTab({ token, auth, authJson }: { token: string; auth: () => any; authJson: () => any }) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const load = useCallback(async () => {
    const j = await fetch('/api/trainer/self/sessions', { headers: auth() }).then((r) => r.json());
    setSessions(j.sessions || []);
  }, [auth]);
  useEffect(() => { load(); }, [load]);
  if (!sessions) return <Loading />;
  if (!sessions.length) return <Empty icon={<ListChecks className="h-7 w-7" />} text="Aucun cours pour le moment. Vous serez notifié dès qu'un cours vous sera assigné." />;
  const now = new Date(new Date().toDateString());
  const upcoming = sessions.filter((s) => s.status !== 'paid' && s.status !== 'cancelled' && (!s.sessionStart || new Date(s.sessionStart) >= now));
  const past = sessions.filter((s) => !upcoming.includes(s));
  return (
    <div className="space-y-5">
      {upcoming.length > 0 && <div className="space-y-3">{upcoming.map((s) => <SessionCard key={s._id} s={s} authJson={authJson} onChanged={load} />)}</div>}
      {past.length > 0 && (
        <div>
          <h3 className="text-[12px] uppercase tracking-wide text-white/40 font-semibold mb-2 mt-2">Historique</h3>
          <div className="space-y-3">{past.map((s) => <SessionCard key={s._id} s={s} authJson={authJson} onChanged={load} />)}</div>
        </div>
      )}
    </div>
  );
}

function SessionCard({ s, authJson, onChanged }: { s: Session; authJson: () => any; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState(s.whatsappGroupLink || '');
  const [busy, setBusy] = useState(false);
  const daysTo = s.sessionStart ? Math.ceil((new Date(s.sessionStart).getTime() - Date.now()) / 86400000) : null;
  const soon = daysTo != null && daysTo >= 0 && daysTo <= 3;
  const statusMeta: Record<string, { label: string; cls: string }> = {
    scheduled: { label: 'Planifié', cls: 'bg-[#0066CC]/15 text-[#7FB3FF]' },
    done: { label: 'Réalisé - encaissable', cls: 'bg-[#3DD68C]/15 text-[#3DD68C]' },
    encashRequested: { label: 'Encaissement demandé', cls: 'bg-[#E5B567]/15 text-[#E5B567]' },
    paid: { label: 'Payé', cls: 'bg-white/10 text-white/60' },
    cancelled: { label: 'Annulé', cls: 'bg-[#FF6B6B]/15 text-[#FF6B6B]' },
  };
  const sm = statusMeta[s.status] || statusMeta.scheduled;
  const markWhatsapp = async () => {
    setBusy(true);
    try {
      await fetch(`/api/trainer/self/sessions/${s._id}/whatsapp`, { method: 'POST', headers: authJson(), body: JSON.stringify({ created: true, link }) });
      onChanged();
    } finally { setBusy(false); }
  };
  return (
    <section className="rounded-2xl bg-[#181A20] border border-white/10 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-semibold truncate">{s.formationTitle || 'Formation'}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
            {s.source === 'opco' && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/8 text-white/55">OPCO</span>}
          </div>
          <div className="text-[12.5px] text-white/55 mt-1 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(s.sessionStart)}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{(s.learners || []).length} apprenant(s)</span>
            {s.clientName && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{s.clientName}</span>}
          </div>
          {soon && s.status === 'scheduled' && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#E5B567]"><Clock className="h-3.5 w-3.5" /> Cours dans {daysTo === 0 ? "aujourd'hui" : daysTo + ' jour' + (daysTo > 1 ? 's' : '')} - pensez au groupe WhatsApp</div>
          )}
        </div>
        <ChevronRight className={`h-4 w-4 text-white/40 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3 text-[13px]">
            <Info icon={<MapPin className="h-3.5 w-3.5" />} label="Lieu" value={`${s.location || '-'}${s.addr ? ' · ' + s.addr : ''}`} />
            <Info icon={<Clock className="h-3.5 w-3.5" />} label="Durée" value={s.hours ? `${s.hours} h` : '-'} />
            <Info icon={<Users className="h-3.5 w-3.5" />} label="Responsable pédagogique" value={s.pedagoName ? `${s.pedagoName}${s.pedagoPhone ? ' · ' + s.pedagoPhone : ''}` : '-'} />
            <Info icon={<BadgeEuro className="h-3.5 w-3.5" />} label="Rémunération" value={s.payAmount ? `${euro(s.payAmount)} (${s.hours || 0}h × ${s.hourlyRate || 0}€)` : 'À l\'issue du cours'} />
          </div>

          {/* Apprenants */}
          <div>
            <div className="text-[12px] uppercase tracking-wide text-white/40 font-semibold mb-2">Apprenants</div>
            {(s.learners || []).length === 0 ? <p className="text-[13px] text-white/45">Aucun apprenant renseigné.</p> : (
              <div className="space-y-1.5">
                {(s.learners || []).map((l, i) => (
                  <div key={i} className="flex items-center gap-3 text-[13px] bg-[#0E0F13] rounded-lg px-3 py-2">
                    <span className="font-medium">{[l.firstname, l.lastname].filter(Boolean).join(' ') || 'Apprenant'}</span>
                    {l.phone && <span className="text-white/50 inline-flex items-center gap-1"><Phone className="h-3 w-3" />{l.phone}</span>}
                    {l.email && <span className="text-white/50 inline-flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{l.email}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WhatsApp */}
          <div className="rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 p-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold mb-2"><MessageCircle className="h-4 w-4 text-[#25D366]" /> Groupe WhatsApp des apprenants</div>
            {s.whatsappGroupCreated ? (
              <div className="text-[13px] text-[#3DD68C] inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Groupe créé{s.whatsappGroupLink ? <a href={s.whatsappGroupLink} target="_blank" rel="noreferrer" className="underline text-white/70 ml-1">ouvrir</a> : ''}</div>
            ) : (
              <div className="space-y-2">
                <p className="text-[12.5px] text-white/55">Créez le groupe avec les apprenants ci-dessus + le responsable pédagogique, puis confirmez ici (collez le lien d'invitation si vous l'avez).</p>
                <div className="flex gap-2">
                  <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Lien d'invitation (optionnel)" className="flex-1 px-3 py-2 rounded-lg bg-[#0E0F13] border border-white/10 text-[13px] text-white placeholder-white/30 outline-none" />
                  <button onClick={markWhatsapp} disabled={busy} className="px-3.5 py-2 rounded-lg bg-[#25D366] text-black text-[13px] font-semibold disabled:opacity-60">{busy ? '…' : "J'ai créé le groupe"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#0E0F13] rounded-lg px-3 py-2">
      <div className="text-[11px] text-white/40 font-semibold uppercase tracking-wide flex items-center gap-1 mb-0.5">{icon}{label}</div>
      <div className="text-[13px] text-white/85">{value}</div>
    </div>
  );
}

/* ============================ Disponibilités ============================ */
function DispoTab({ auth, authJson }: { auth: () => any; authJson: () => any }) {
  const [days, setDays] = useState<{ id: string; day: string; label: string }[]>([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const j = await fetch('/api/trainer/self/availability', { headers: auth() }).then((r) => r.json());
    setDays(j.days || []);
  }, [auth]);
  useEffect(() => { load(); }, [load]);
  const blocked = useMemo(() => new Set(days.map((d) => d.day)), [days]);
  const toggle = async (iso: string) => {
    if (busy) return; setBusy(true);
    try {
      const existing = days.find((d) => d.day === iso);
      if (existing) { await fetch(`/api/trainer/self/availability/${existing.id}`, { method: 'DELETE', headers: auth() }); }
      else { await fetch('/api/trainer/self/availability', { method: 'POST', headers: authJson(), body: JSON.stringify({ day: iso }) }); }
      await load();
    } finally { setBusy(false); }
  };
  // grille du mois
  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = (first.getDay() + 6) % 7; // lundi=0
  const nbDays = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: nbDays }, (_, i) => i + 1)];
  const monthName = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const iso = (d: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayIso = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-4">
      <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold">Mes disponibilités</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor((c) => { const m = c.m - 1; return m < 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m }; })} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-[13px] font-semibold capitalize w-[140px] text-center">{monthName}</span>
            <button onClick={() => setCursor((c) => { const m = c.m + 1; return m > 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m }; })} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <p className="text-[12.5px] text-white/55 mb-4">Cliquez sur un jour pour le marquer <span className="text-[#FF6B6B] font-semibold">indisponible</span>. On ne vous assignera pas de cours ces jours-là.</p>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-[11px] text-white/40 font-semibold py-1">{d}</div>)}
          {cells.map((c, i) => {
            if (c == null) return <div key={i} />;
            const dayIso = iso(c);
            const isBlocked = blocked.has(dayIso);
            const isPast = dayIso < todayIso;
            return (
              <button key={i} disabled={isPast} onClick={() => toggle(dayIso)}
                className={`aspect-square rounded-lg text-[13px] font-medium transition-colors ${isPast ? 'text-white/20 cursor-not-allowed' : isBlocked ? 'bg-[#FF6B6B] text-white' : 'bg-[#0E0F13] hover:bg-white/10 text-white/80'}`}>
                {c}
              </button>
            );
          })}
        </div>
      </section>
      <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
        <h3 className="text-[14px] font-bold mb-3">Jours bloqués</h3>
        {days.length === 0 ? <p className="text-[13px] text-white/45">Aucun jour bloqué. Vous êtes disponible par défaut.</p> : (
          <div className="space-y-1.5 max-h-[360px] overflow-auto">
            {[...days].sort((a, b) => a.day.localeCompare(b.day)).map((d) => (
              <div key={d.id} className="flex items-center justify-between text-[13px] bg-[#0E0F13] rounded-lg px-3 py-2">
                <span>{fmtDay(d.day)}</span>
                <button onClick={() => toggle(d.day)} className="text-[#FF6B6B] text-[12px] hover:underline">Retirer</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ============================ Mes formations ============================ */
function FormationsTab({ trainer, auth }: { trainer: Trainer; auth: () => any }) {
  const [formations, setFormations] = useState<Formation[] | null>(null);
  useEffect(() => { (async () => { const j = await fetch('/api/trainer/self/my-formations', { headers: auth() }).then((r) => r.json()); setFormations(j.formations || []); })(); }, [auth]);
  if (!formations) return <Loading />;
  if (!formations.length) return <Empty icon={<GraduationCap className="h-7 w-7" />} text="Aucune formation rattachée pour l'instant. Delivery Digital vous rattachera aux formations correspondant à vos compétences." />;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {formations.map((f) => (
        <section key={f._id} className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-2"><GraduationCap className="h-4 w-4" style={{ color: BLUE }} /><h3 className="text-[15px] font-semibold">{f.title}</h3></div>
          {f.description && <p className="text-[13px] text-white/55 leading-relaxed line-clamp-3">{f.description}</p>}
          <div className="mt-3 flex items-center gap-3 text-[12px] text-white/50">
            {f.duration_hours ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{f.duration_hours} h</span> : null}
            {trainer.hourlyRate ? <span className="inline-flex items-center gap-1"><BadgeEuro className="h-3.5 w-3.5" />{euro((f.duration_hours || 0) * trainer.hourlyRate)} / session</span> : null}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ============================ Fonds ============================ */
function FondsTab({ trainer, auth, authJson, validated }: { trainer: Trainer; auth: () => any; authJson: () => any; validated: boolean }) {
  const [data, setData] = useState<{ sessions: Session[]; totals: { available: number; pending: number; paid: number } } | null>(null);
  const [facture, setFacture] = useState<Session | null>(null);
  const load = useCallback(async () => { const j = await fetch('/api/trainer/self/funds', { headers: auth() }).then((r) => r.json()); setData({ sessions: j.sessions || [], totals: j.totals || { available: 0, pending: 0, paid: 0 } }); }, [auth]);
  useEffect(() => { load(); }, [load]);
  if (!data) return <Loading />;
  const available = data.sessions.filter((s) => s.status === 'done');
  const others = data.sessions.filter((s) => s.status !== 'done');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard icon={<Wallet className="h-4 w-4" />} label="Disponible" value={euro(data.totals.available)} accent="#3DD68C" />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="En attente virement" value={euro(data.totals.pending)} accent="#E5B567" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Déjà versé" value={euro(data.totals.paid)} accent="#7FB3FF" />
      </div>

      <section className="rounded-2xl bg-[#181A20] border border-[#3DD68C]/30 p-5">
        <h2 className="text-[15px] font-bold mb-1">Fonds disponibles à encaisser</h2>
        <p className="text-[12.5px] text-white/55 mb-4">Une session réalisée devient encaissable. Cliquez sur <strong>Encaisser</strong> pour générer votre facture et envoyer l'ordre d'encaissement à Delivery Digital.</p>
        {!validated && <p className="text-[13px] text-[#E5B567] mb-3 inline-flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> Activez d'abord votre compte (RIB validé) pour encaisser.</p>}
        {available.length === 0 ? <p className="text-[13px] text-white/45">Aucun fonds disponible pour le moment.</p> : (
          <div className="space-y-2">
            {available.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-3 bg-[#0E0F13] rounded-xl px-4 py-3">
                <div>
                  <div className="text-[14px] font-semibold">{s.formationTitle} <span className="text-white/45 font-normal">· {s.clientName}</span></div>
                  <div className="text-[12px] text-white/50">{fmtDate(s.doneAt)} · {s.hours || 0}h × {s.hourlyRate || 0}€</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[16px] font-bold text-[#3DD68C]">{euro(s.payAmount || 0)}</span>
                  <button onClick={() => setFacture(s)} disabled={!validated} className="px-4 py-2 rounded-full text-black text-[13px] font-semibold bg-[#3DD68C] disabled:opacity-50">Encaisser</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <h3 className="text-[14px] font-bold mb-3">Historique des encaissements</h3>
          <div className="space-y-2">
            {others.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-3 text-[13px] bg-[#0E0F13] rounded-lg px-4 py-2.5">
                <div><span className="font-medium">{s.formationTitle}</span> <span className="text-white/45">· {s.clientName} · {s.invoiceNumber || ''}</span></div>
                <div className="flex items-center gap-3">
                  <span className="text-white/70 font-semibold">{euro(s.payAmount || 0)}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.status === 'paid' ? 'bg-white/10 text-white/60' : 'bg-[#E5B567]/15 text-[#E5B567]'}`}>{s.status === 'paid' ? 'Versé' : 'En attente'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {facture && <FactureModal trainer={trainer} session={facture} authJson={authJson} onDone={() => { setFacture(null); load(); }} onClose={() => setFacture(null)} />}
    </div>
  );
}

function FactureModal({ trainer, session, authJson, onDone, onClose }: { trainer: Trainer; session: Session; authJson: () => any; onDone: () => void; onClose: () => void }) {
  const [sending, setSending] = useState(false);
  const ci = trainer.companyInfo || {};
  const invoiceNo = session.invoiceNumber || ('TRF-' + new Date().getFullYear() + '-' + session._id.slice(-5).toUpperCase());
  const send = async () => {
    setSending(true);
    try { await fetch(`/api/trainer/self/sessions/${session._id}/encash`, { method: 'POST', headers: authJson() }); onDone(); }
    finally { setSending(false); }
  };
  const print = () => window.print();
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto" onClick={onClose}>
      <div className="bg-white text-[#1D1D1F] rounded-2xl max-w-[640px] w-full my-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div id="facture-print" className="p-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <img src={LOGO_URL} alt="DD" className="h-9 mb-2" />
              <div className="text-[11px] text-[#86868B] leading-relaxed">{ci.legalName || trainer.name}<br />{ci.address || ''} {ci.postalCode || ''} {ci.city || ''}<br />{ci.regNumber ? 'SIRET ' + ci.regNumber : ''}</div>
            </div>
            <div className="text-right">
              <div className="text-[20px] font-bold">FACTURE</div>
              <div className="text-[12px] text-[#86868B]">{invoiceNo}</div>
              <div className="text-[12px] text-[#86868B]">{new Date().toLocaleDateString('fr-FR')}</div>
            </div>
          </div>
          <div className="text-[12px] text-[#86868B] mb-1">Facturé à</div>
          <div className="text-[14px] font-semibold mb-6">Delivery Digital Nice<br /><span className="font-normal text-[12px] text-[#86868B]">470 promenade des Anglais, 06200 Nice</span></div>
          <table className="w-full text-[13px] mb-6">
            <thead><tr className="border-b border-[#E5E5EA] text-[#86868B] text-left"><th className="py-2">Prestation</th><th className="py-2 text-center">Heures</th><th className="py-2 text-right">Taux</th><th className="py-2 text-right">Total</th></tr></thead>
            <tbody>
              <tr className="border-b border-[#F0F0F2]">
                <td className="py-3">Animation formation : {session.formationTitle}<br /><span className="text-[11px] text-[#86868B]">{session.clientName} · {fmtDate(session.doneAt)}</span></td>
                <td className="py-3 text-center">{session.hours || 0}</td>
                <td className="py-3 text-right">{session.hourlyRate || 0} €</td>
                <td className="py-3 text-right font-semibold">{euro(session.payAmount || 0)}</td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end mb-6"><div className="text-right"><div className="text-[12px] text-[#86868B]">Total à payer</div><div className="text-[22px] font-bold">{euro(session.payAmount || 0)}</div><div className="text-[10px] text-[#86868B]">TVA non applicable, art. 293 B du CGI (si applicable)</div></div></div>
          <div className="text-[11px] text-[#86868B] border-t border-[#E5E5EA] pt-3">Règlement par virement · {trainer.accountHolder || trainer.name} · IBAN {trainer.iban || '-'} {trainer.bic ? '· BIC ' + trainer.bic : ''}</div>
        </div>
        <div className="px-8 py-4 bg-[#F5F5F7] flex items-center justify-between gap-3 no-print">
          <button onClick={print} className="text-[13px] text-[#1D1D1F] font-semibold underline">Télécharger / Imprimer</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-full text-[13px] text-[#86868B]">Annuler</button>
            <button onClick={send} disabled={sending} className="px-5 py-2 rounded-full text-white text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60" style={{ background: BLUE }}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer l'ordre d'encaissement</button>
          </div>
        </div>
      </div>
      <style>{`@media print { body * { visibility: hidden; } #facture-print, #facture-print * { visibility: visible; } #facture-print { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none; } }`}</style>
    </div>
  );
}

/* ============================ Instructions ============================ */
function InstructionsTab({ auth }: { auth: () => any }) {
  const [items, setItems] = useState<{ id: string; title: string; body: string; icon: string }[] | null>(null);
  useEffect(() => { (async () => { const j = await fetch('/api/trainer/self/instructions', { headers: auth() }).then((r) => r.json()); setItems(j.instructions || []); })(); }, [auth]);
  if (!items) return <Loading />;
  if (!items.length) return <Empty icon={<MessageCircle className="h-7 w-7" />} text="Les instructions seront publiées prochainement." />;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-[#0066CC]/10 border border-[#0066CC]/30 p-5">
        <h2 className="text-[15px] font-bold mb-1">À faire quand un cours est prévu</h2>
        <p className="text-[13px] text-white/60">Suivez ces étapes pour chaque formation avec les apprenants d'un client.</p>
      </div>
      {items.map((it, i) => (
        <section key={it.id} className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-[13px] font-bold shrink-0" style={{ background: BLUE }}>{i + 1}</span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold mb-1">{it.title}</h3>
              <p className="text-[13.5px] text-white/65 leading-relaxed whitespace-pre-wrap">{it.body}</p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

/* ============================ Mon compte (onboarding) ============================ */
const COUNTRIES = [['FR', 'France'], ['BE', 'Belgique'], ['LU', 'Luxembourg'], ['CH', 'Suisse'], ['MA', 'Maroc'], ['DZ', 'Algérie'], ['TN', 'Tunisie'], ['QA', 'Qatar'], ['SA', 'Arabie Saoudite'], ['AE', 'Émirats']];

function ProfilTab({ trainer, authJson, auth, onChanged }: { trainer: Trainer; authJson: () => any; auth: () => any; onChanged: () => void }) {
  return (
    <div className="space-y-4">
      <CompanyForm trainer={trainer} authJson={authJson} onChanged={onChanged} />
      <RibForm trainer={trainer} authJson={authJson} onChanged={onChanged} />
      <ContractForm trainer={trainer} authJson={authJson} onChanged={onChanged} />
    </div>
  );
}

function CompanyForm({ trainer, authJson, onChanged }: { trainer: Trainer; authJson: () => any; onChanged: () => void }) {
  const ci = trainer.companyInfo || {};
  const [f, setF] = useState({ legalName: ci.legalName || '', regNumber: ci.regNumber || '', vatNumber: ci.vatNumber || '', address: ci.address || '', postalCode: ci.postalCode || '', city: ci.city || '', country: ci.country || 'France', repName: ci.repName || trainer.name, repFunction: ci.repFunction || 'Formateur' });
  const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  const save = async () => { setBusy(true); try { await fetch('/api/trainer/self/company', { method: 'POST', headers: authJson(), body: JSON.stringify(f) }); setSaved(true); onChanged(); setTimeout(() => setSaved(false), 2000); } finally { setBusy(false); } };
  const inp = 'w-full px-3 py-2.5 rounded-xl bg-[#0E0F13] border border-white/10 text-[14px] text-white placeholder-white/30 outline-none';
  return (
    <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
      <h2 className="text-[15px] font-bold mb-4 flex items-center gap-2"><Building2 className="h-4 w-4" style={{ color: BLUE }} /> Informations</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Raison sociale / Nom"><input className={inp} value={f.legalName} onChange={(e) => setF({ ...f, legalName: e.target.value })} /></Field>
        <Field label="SIRET / N° d'enregistrement"><input className={inp} value={f.regNumber} onChange={(e) => setF({ ...f, regNumber: e.target.value })} /></Field>
        <Field label="N° TVA (optionnel)"><input className={inp} value={f.vatNumber} onChange={(e) => setF({ ...f, vatNumber: e.target.value })} /></Field>
        <Field label="Pays"><select className={inp} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>{COUNTRIES.map(([c, n]) => <option key={c} value={n} className="bg-[#181A20]">{n}</option>)}</select></Field>
        <Field label="Adresse"><input className={inp} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code postal"><input className={inp} value={f.postalCode} onChange={(e) => setF({ ...f, postalCode: e.target.value })} /></Field>
          <Field label="Ville"><input className={inp} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
        </div>
        <Field label="Représentant"><input className={inp} value={f.repName} onChange={(e) => setF({ ...f, repName: e.target.value })} /></Field>
        <Field label="Fonction"><input className={inp} value={f.repFunction} onChange={(e) => setF({ ...f, repFunction: e.target.value })} /></Field>
      </div>
      <button onClick={save} disabled={busy} className="mt-4 px-5 py-2.5 rounded-full text-white text-[14px] font-semibold disabled:opacity-60" style={{ background: BLUE }}>{busy ? '…' : saved ? '✓ Enregistré' : 'Enregistrer'}</button>
    </section>
  );
}

function RibForm({ trainer, authJson, onChanged }: { trainer: Trainer; authJson: () => any; onChanged: () => void }) {
  const [f, setF] = useState({ country: trainer.bankCountry || 'FR', iban: trainer.iban || '', bic: trainer.bic || '', accountHolder: trainer.accountHolder || trainer.name });
  const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false); const [pdfBusy, setPdfBusy] = useState(false);
  const save = async () => { setBusy(true); try { await fetch('/api/trainer/self/bank', { method: 'POST', headers: authJson(), body: JSON.stringify({ country: f.country, fields: { iban: f.iban, bic: f.bic, accountHolder: f.accountHolder }, iban: f.iban, bic: f.bic, accountHolder: f.accountHolder }) }); setSaved(true); onChanged(); setTimeout(() => setSaved(false), 2000); } finally { setBusy(false); } };
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.type !== 'application/pdf') { alert('PDF uniquement'); return; }
    setPdfBusy(true);
    const reader = new FileReader();
    reader.onload = async () => { try { await fetch('/api/trainer/self/rib-pdf', { method: 'POST', headers: authJson(), body: JSON.stringify({ dataUrl: reader.result }) }); onChanged(); } finally { setPdfBusy(false); } };
    reader.readAsDataURL(file);
  };
  const inp = 'w-full px-3 py-2.5 rounded-xl bg-[#0E0F13] border border-white/10 text-[14px] text-white placeholder-white/30 outline-none';
  return (
    <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
      <h2 className="text-[15px] font-bold mb-1 flex items-center gap-2"><Wallet className="h-4 w-4" style={{ color: BLUE }} /> Coordonnées bancaires (RIB)
        {trainer.bankValidated && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#3DD68C]/15 text-[#3DD68C]">Validé</span>}</h2>
      <p className="text-[12.5px] text-white/55 mb-4">Pour le versement de vos prestations. Le justificatif PDF est obligatoire.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Pays du compte"><select className={inp} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>{COUNTRIES.map(([c, n]) => <option key={c} value={c} className="bg-[#181A20]">{n}</option>)}</select></Field>
        <Field label="Titulaire du compte"><input className={inp} value={f.accountHolder} onChange={(e) => setF({ ...f, accountHolder: e.target.value })} /></Field>
        <Field label="IBAN"><input className={`${inp} font-mono`} value={f.iban} onChange={(e) => setF({ ...f, iban: e.target.value })} /></Field>
        <Field label="BIC / SWIFT"><input className={`${inp} font-mono`} value={f.bic} onChange={(e) => setF({ ...f, bic: e.target.value })} /></Field>
      </div>
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <button onClick={save} disabled={busy} className="px-5 py-2.5 rounded-full text-white text-[14px] font-semibold disabled:opacity-60" style={{ background: BLUE }}>{busy ? '…' : saved ? '✓ Enregistré' : 'Enregistrer le RIB'}</button>
        <label className="px-5 py-2.5 rounded-full bg-white/8 hover:bg-white/12 text-[14px] font-semibold cursor-pointer inline-flex items-center gap-1.5"><Upload className="h-4 w-4" />{pdfBusy ? 'Envoi…' : 'Justificatif PDF'}<input type="file" accept="application/pdf" className="hidden" onChange={upload} /></label>
        {trainer.ribPdfUrl && <a href={trainer.ribPdfUrl} target="_blank" rel="noreferrer" className="text-[13px] text-[#3DD68C] inline-flex items-center gap-1 underline"><CheckCircle2 className="h-4 w-4" /> PDF déposé</a>}
      </div>
    </section>
  );
}

function ContractForm({ trainer, authJson, onChanged }: { trainer: Trainer; authJson: () => any; onChanged: () => void }) {
  const signed = !!(trainer.contract && trainer.contract.signed);
  const [signedBy, setSignedBy] = useState(trainer.contract?.signedBy || trainer.name);
  const [func, setFunc] = useState(trainer.contract?.signedFunction || 'Formateur');
  const [accept, setAccept] = useState(false); const [busy, setBusy] = useState(false);
  const sign = async () => { setBusy(true); try { await fetch('/api/trainer/self/contract/sign', { method: 'POST', headers: authJson(), body: JSON.stringify({ signedBy, signedFunction: func }) }); onChanged(); } finally { setBusy(false); } };
  const inp = 'w-full px-3 py-2.5 rounded-xl bg-[#0E0F13] border border-white/10 text-[14px] text-white placeholder-white/30 outline-none';
  return (
    <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
      <h2 className="text-[15px] font-bold mb-1 flex items-center gap-2"><FileSignature className="h-4 w-4" style={{ color: BLUE }} /> Contrat de prestation
        {signed && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#3DD68C]/15 text-[#3DD68C]">{trainer.contract?.validated ? 'Validé' : 'Signé'}</span>}</h2>
      {signed ? (
        <p className="text-[13px] text-white/60 mt-2">Signé par {trainer.contract?.signedBy} ({trainer.contract?.signedFunction}) le {trainer.contract?.signedAt ? new Date(trainer.contract.signedAt).toLocaleDateString('fr-FR') : ''}.</p>
      ) : (
        <div className="mt-3">
          <div className="bg-[#0E0F13] border border-white/10 rounded-xl p-4 text-[12.5px] text-white/60 leading-relaxed max-h-[200px] overflow-auto mb-4">
            <p className="font-semibold text-white/80 mb-2">Contrat de prestation de formation - Delivery Digital</p>
            <p>Le formateur s'engage à animer les sessions de formation qui lui sont confiées par Delivery Digital, dans le respect des programmes, du référentiel QUALIOPI et des plannings communiqués. La rémunération est fixée au taux horaire négocié, versée après réalisation de chaque session sur présentation de facture. Le formateur s'engage à la confidentialité et à une clause de non-sollicitation directe des clients de Delivery Digital pendant 12 mois. La signature électronique a la même valeur juridique qu'une signature manuscrite (Code civil, art. 1367).</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <Field label="Signataire"><input className={inp} value={signedBy} onChange={(e) => setSignedBy(e.target.value)} /></Field>
            <Field label="Fonction"><input className={inp} value={func} onChange={(e) => setFunc(e.target.value)} /></Field>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-white/70 mb-3 cursor-pointer"><input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} /> J'ai lu et j'accepte le contrat de prestation.</label>
          <button onClick={sign} disabled={!accept || busy} className="px-5 py-2.5 rounded-full text-white text-[14px] font-semibold disabled:opacity-50" style={{ background: BLUE }}>{busy ? '…' : 'Signer le contrat'}</button>
        </div>
      )}
    </section>
  );
}

/* ============================ helpers UI ============================ */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-[11px] text-white/45 font-semibold uppercase tracking-wide mb-1">{label}</span>{children}</label>;
}
function Loading() { return <div className="flex items-center justify-center py-16 text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>; }
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="rounded-2xl bg-[#181A20] border border-white/10 p-10 text-center text-white/50"><div className="flex justify-center mb-3 text-white/30">{icon}</div><p className="text-[14px] max-w-[420px] mx-auto">{text}</p></div>;
}
