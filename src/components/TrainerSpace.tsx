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
  X, Download, FileText, Stamp, ShieldCheck, ChevronRight as ArrowRight,
  Video, Copy, MessageSquare,
} from 'lucide-react';

const TOKEN_KEY = 'dd_trainer_token';
const LOGO_URL = '/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png';
const BLUE = '#0066CC';
const DOTTED_BG: React.CSSProperties = { backgroundColor: '#0E0F13', backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' };

/**
 * Libellé de repli quand la fiche du cours n'a pas de pedagoName renseigné : c'est le
 * responsable pédagogique DD qui crée le groupe WhatsApp et y ajoute le formateur.
 * @author Rabah Ziane · 2026-07-20
 */
/**
 * Pays proposés pour l'adresse de l'entreprise et le pays du compte bancaire.
 * Forme [code, libellé] : le formulaire Informations enregistre le LIBELLÉ, celui du RIB le CODE.
 * @author Rabah Ziane · 2026-07-20
 */
const COUNTRIES: [string, string][] = [
  ['FR', 'France'], ['BE', 'Belgique'], ['CH', 'Suisse'], ['LU', 'Luxembourg'],
  ['DE', 'Allemagne'], ['ES', 'Espagne'], ['IT', 'Italie'], ['PT', 'Portugal'],
  ['NL', 'Pays-Bas'], ['GB', 'Royaume-Uni'], ['IE', 'Irlande'],
  ['US', 'États-Unis'], ['CA', 'Canada'],
  ['MA', 'Maroc'], ['DZ', 'Algérie'], ['TN', 'Tunisie'],
  ['AE', 'Émirats arabes unis'], ['SA', 'Arabie saoudite'], ['QA', 'Qatar'],
];

const PEDAGO_FALLBACK = 'Monsieur Ziane Rabah';
const PEDAGO_PHONE_FALLBACK = '+971 50 476 28 38';

type TabKey = 'cours' | 'dispo' | 'formations' | 'fonds' | 'salle' | 'profil';

type Trainer = {
  id: string; name: string; email: string; phone: string;
  hourlyRate: number; trainerSkills: string[];
  recurringAvailability?: { days: number[]; slots: { from: string; to: string }[] };
  reminderPrefs?: { course48: boolean; course24: boolean; course1: boolean; weeklyAvailability: boolean; weeklyDay?: number; weeklyHour?: number };
  iban: string; bic: string; accountHolder: string; bankCountry: string; bankData: any;
  ribPdfUrl: string; bankValidated: boolean;
  companyInfo: any;
  contract: { signed: boolean; signedBy: string; signedFunction: string; signedAt: string | null; validated: boolean };
  onboardingValidated: boolean;
  visio?: { slug: string; link: string; hostLink: string } | null;
};
type Formation = {
  _id: string; program_id: string; title: string; duration_hours: number; description?: string; category?: string;
  target_audience?: string; objectives?: string[]; training_modalities?: string[]; methods?: string[]; evaluation_methods?: string[];
  modules?: { title?: string; duration_hours?: number; topics?: string[] }[];
  prerequisites?: string; accessibility_info?: string; access_delay?: string;
  price?: number; max_participants?: number; level?: string; certification_type?: string; opco_eligible?: boolean;
  satisfaction_rate?: number; success_rate?: number; recommendation_rate?: number; attendance_rate?: number;
  documents?: { title?: string; file_path?: string; document_type?: string }[];
};
type Learner = { firstname?: string; lastname?: string; email?: string; phone?: string };
type Instruction = { id: string; title: string; body?: string; icon?: string; docs?: string[] };
type Session = {
  _id: string; source: 'opco' | 'manual'; formationTitle?: string; hours?: number;
  clientName?: string; clientEmail?: string; location?: string; addr?: string;
  sessionStart?: string; sessionEnd?: string; learners?: Learner[];
  days?: { date: string; from: string; to: string; mode?: string; exercises?: string }[]; scheduledHours?: number;
  meetingLink?: string; meetingProvider?: string; hostKey?: string;
  purchaseOrder?: { number?: string; issuedAt?: string };
  clientContactName?: string; clientPhone?: string;
  reschedules?: { at: string; by?: string; reason?: string }[];
  stepsDone?: { instructionId: string; at?: string }[];
  trainerCompletedAt?: string;
  selfAssessment?: { at?: string; objectivesMet?: string; groupLevel?: string; attendance?: string; difficulties?: string; improvements?: string; rating?: number };
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

  /**
   * Nombre de cours encore à mener (statut « planifié ») : sert de pastille rouge clignotante
   * sur l'onglet « Mes cours » tant que le formateur n'a pas terminé ses formations.
   * @author Rabah Ziane · 2026-07-20
   */
  const [pending, setPending] = useState(0);
  const loadPending = useCallback(async () => {
    try {
      const j = await fetch('/api/trainer/self/sessions', { headers: auth() }).then((r) => r.json());
      setPending((j.sessions || []).filter((x: Session) => x.status === 'scheduled').length);
    } catch { /* le badge est un confort, pas un bloquant */ }
  }, [auth]);
  useEffect(() => { loadPending(); }, [loadPending]);

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
        {!validated && <ActivationBanner trainer={trainer} active={tab === 'profil'} onGo={() => setTab(tab === 'profil' ? 'cours' : 'profil')} />}

        {/* KPIs */}
        <Kpis token={token} hourlyRate={trainer.hourlyRate} validated={validated} onNav={setTab} />

        {/* Tabs */}
        <nav className="flex gap-1.5 overflow-x-auto pb-1">
          {([
            ['cours', 'Mes cours', <ListChecks className="h-4 w-4" />],
            ['dispo', 'Disponibilités', <CalendarDays className="h-4 w-4" />],
            ['formations', 'Mes formations', <GraduationCap className="h-4 w-4" />],
            ['fonds', 'Fonds', <Wallet className="h-4 w-4" />],
            ['salle', 'Ma salle', <Video className="h-4 w-4" />],
            ['profil', 'Mon compte', <Building2 className="h-4 w-4" />],
          ] as [TabKey, string, React.ReactNode][]).map(([k, label, icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`relative shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-colors ${tab === k ? 'text-white' : 'text-white/55 hover:text-white bg-white/5'}`} style={tab === k ? { background: BLUE } : undefined}>
              {icon}{label}
              {k === 'cours' && pending > 0 && (
                <span className="relative flex h-5 min-w-5 ml-0.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF3B30] opacity-70 animate-ping" />
                  <span className="relative inline-flex h-5 min-w-5 px-1 rounded-full bg-[#FF3B30] text-white text-[11px] font-bold items-center justify-center">{pending}</span>
                </span>
              )}
            </button>
          ))}
        </nav>

        {tab === 'cours' && <SessionsTab token={token} auth={auth} authJson={authJson} trainer={trainer} trainerRate={trainer.hourlyRate || 0} onCountChanged={loadPending} />}
        {tab === 'dispo' && <DispoTab auth={auth} authJson={authJson} trainer={trainer} onChanged={loadProfile} />}
        {tab === 'formations' && <FormationsTab trainer={trainer} auth={auth} />}
        {tab === 'fonds' && <FondsTab trainer={trainer} auth={auth} authJson={authJson} validated={validated} />}
        {tab === 'salle' && <MyRoomTab trainer={trainer} />}
        {tab === 'profil' && <ProfilTab trainer={trainer} authJson={authJson} auth={auth} onChanged={loadProfile} />}
      </main>
    </div>
  );
}

/* ============================ KPIs ============================ */
function Kpis({ token, hourlyRate, validated, onNav }: { token: string; hourlyRate: number; validated: boolean; onNav: (t: TabKey) => void }) {
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
      <KpiCard icon={<BadgeEuro className="h-4 w-4" />} label="Taux horaire négocié" value={hourlyRate ? `${hourlyRate} €/h` : '-'} accent={BLUE} onClick={() => onNav('formations')} />
      <KpiCard icon={<Clock className="h-4 w-4" />} label="Cours à venir" value={data ? String(data.upcoming) : '…'} accent="#E5B567" onClick={() => onNav('cours')} />
      <KpiCard icon={<Wallet className="h-4 w-4" />} label="Fonds disponibles" value={data ? euro(data.available) : '…'} accent="#3DD68C" onClick={() => onNav('fonds')} />
    </div>
  );
}
function KpiCard({ icon, label, value, accent, onClick }: { icon: React.ReactNode; label: string; value: string; accent: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="text-left rounded-2xl bg-[#181A20] border border-white/10 p-4 transition-colors hover:border-white/25">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/45 font-semibold mb-2" style={{ color: accent }}>{icon}{label}</div>
      <div className="text-[24px] font-bold">{value}</div>
    </button>
  );
}

/* ============================ Activation ============================ */
function ActivationBanner({ trainer, active, onGo }: { trainer: Trainer; active: boolean; onGo: () => void }) {
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
          <p className="text-[13px] text-white/60 mt-0.5">Cliquez sur une étape pour l'ouvrir, recliquez pour la refermer. Votre compte sera activé après validation par Delivery Digital.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <StepCard n={1} done={hasCompany} active={active} title="Informations" icon={<Building2 className="h-4 w-4" />} onClick={onGo} />
        <StepCard n={2} done={hasRib} active={active} title="RIB (PDF obligatoire)" icon={<Upload className="h-4 w-4" />} onClick={onGo} />
        <StepCard n={3} done={hasContract} active={active} title="Contrat de prestation" icon={<FileSignature className="h-4 w-4" />} onClick={onGo} />
      </div>
    </section>
  );
}
function StepCard({ n, done, active, title, icon, onClick }: { n: number; done: boolean; active: boolean; title: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition-colors ${active ? 'border-[#0066CC] bg-[#0066CC]/10' : done ? 'border-[#3DD68C]/40 bg-[#3DD68C]/5 hover:border-white/30' : 'border-white/10 bg-[#0E0F13] hover:border-white/30'}`}>
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold shrink-0 ${done ? 'bg-[#3DD68C] text-black' : 'text-white'}`} style={done ? undefined : { background: BLUE }}>{done ? '✓' : n}</span>
      <div className="flex items-center gap-1.5 text-[13px] font-semibold flex-1">{icon}{title}</div>
      <ArrowRight className={`h-4 w-4 text-white/30 transition-transform ${active ? 'rotate-90' : ''}`} />
    </button>
  );
}

/* ============================ Mes cours ============================ */
function SessionsTab({ token, auth, authJson, trainer, trainerRate, onCountChanged }: { token: string; auth: () => any; authJson: () => any; trainer: Trainer; trainerRate: number; onCountChanged: () => void }) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  // Le déroulé est le même pour tous les cours : une seule requête, partagée aux fiches.
  const [steps, setSteps] = useState<Instruction[]>([]);
  useEffect(() => {
    fetch('/api/trainer/self/instructions', { headers: auth() }).then((r) => r.json())
      .then((j) => setSteps(j.instructions || [])).catch(() => setSteps([]));
  }, [auth]);
  const load = useCallback(async () => {
    const j = await fetch('/api/trainer/self/sessions', { headers: auth() }).then((r) => r.json());
    setSessions(j.sessions || []);
    onCountChanged();
  }, [auth, onCountChanged]);
  useEffect(() => { load(); }, [load]);
  if (!sessions) return <Loading />;
  if (!sessions.length) return <Empty icon={<ListChecks className="h-7 w-7" />} text="Aucun cours pour le moment. Vous serez notifié dès qu'un cours vous sera assigné." />;
  const now = new Date(new Date().toDateString());
  const upcoming = sessions.filter((s) => s.status !== 'paid' && s.status !== 'cancelled' && (!s.sessionStart || new Date(s.sessionStart) >= now));
  const past = sessions.filter((s) => !upcoming.includes(s));
  return (
    <div className="space-y-5">
      {upcoming.length > 0 && <div className="space-y-3">{upcoming.map((s) => <SessionCard key={s._id} s={s} steps={steps} auth={auth} authJson={authJson} onChanged={load} trainer={trainer} trainerRate={trainerRate} />)}</div>}
      {past.length > 0 && (
        <div>
          <h3 className="text-[12px] uppercase tracking-wide text-white/40 font-semibold mb-2 mt-2">Historique</h3>
          <div className="space-y-3">{past.map((s) => <SessionCard key={s._id} s={s} steps={steps} auth={auth} authJson={authJson} onChanged={load} trainer={trainer} trainerRate={trainerRate} />)}</div>
        </div>
      )}
    </div>
  );
}

function SessionCard({ s, steps, auth, authJson, onChanged, trainer, trainerRate }: { s: Session; steps: Instruction[]; auth: () => any; authJson: () => any; onChanged: () => void; trainer: Trainer; trainerRate: number }) {
  const trainerName = trainer.name;
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState(s.whatsappGroupLink || '');
  const [poOpen, setPoOpen] = useState(false);
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
            {/* Un cours 100 % visio n'affiche pas l'adresse du client. @Rabah 2026-07-20 */}
            <Info icon={<MapPin className="h-3.5 w-3.5" />} label="Lieu" value={(() => {
              const modes = [...new Set((s.days || []).map((d) => d.mode || 'visio'))];
              const allVisio = modes.length === 1 && modes[0] === 'visio';
              const label = allVisio ? 'Visioconférence (distanciel)' : (s.location || '-');
              return allVisio ? label : `${label}${s.addr ? ' · ' + s.addr : ''}`;
            })()} />
            <Info icon={<Clock className="h-3.5 w-3.5" />} label="Durée" value={s.hours ? `${s.hours} h` : '-'} />
            {/* Repli sur le libellé générique si la fiche du cours ne précise pas le responsable. @author Rabah Ziane · 2026-07-20 */}
            <Info icon={<Users className="h-3.5 w-3.5" />} label="Responsable pédagogique & technique" value={`${s.pedagoName || PEDAGO_FALLBACK} · ${s.pedagoPhone || PEDAGO_PHONE_FALLBACK} · joignable sur WhatsApp`} />
            <Info icon={<BadgeEuro className="h-3.5 w-3.5" />} label="Rémunération" value={s.payAmount
              ? `${euro(s.payAmount)} (${s.scheduledHours || s.hours || 0} h encadrées × ${s.hourlyRate || 0} €)`
              : (s.scheduledHours && trainerRate ? `${euro(Math.round(s.scheduledHours * trainerRate))} estimé (${s.scheduledHours} h encadrées × ${trainerRate} €)` : 'À l\'issue du cours')} />
          </div>

          {/* Déroulé pas-à-pas, repris des Instructions. @Rabah 2026-07-20 */}
          {s.status === 'scheduled' && <StepsBlock s={s} steps={steps} trainerName={trainerName} trainerRate={trainerRate} auth={auth} authJson={authJson} onChanged={onChanged} />}

          {/* Contact client : à appeler avant la formation pour confirmer ou adapter les dates. @author Rabah Ziane · 2026-07-20 */}
          {(s.clientPhone || s.clientEmail || s.clientContactName) && (
            <div className="rounded-xl border border-white/10 bg-[#0E0F13] p-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold mb-1"><Building2 className="h-4 w-4" style={{ color: BLUE }} /> Contact client{s.clientContactName ? ` · ${s.clientContactName}` : ''}</div>
              <p className="text-[12.5px] text-white/55 mb-2">Appelez-le ou écrivez-lui sur WhatsApp avant la formation pour confirmer les dates ou les adapter. Si elles changent, modifiez vos créneaux ci-dessous : Delivery Digital en est informé automatiquement.</p>
              <div className="flex flex-wrap items-center gap-2">
                {s.clientPhone && <a href={`tel:${s.clientPhone.replace(/\s/g, '')}`} className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[13px] font-semibold inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {s.clientPhone}</a>}
                {/* Pas de contact par email avec le client : téléphone et WhatsApp uniquement. @Rabah 2026-07-20 */}
                {s.clientPhone && <a href={`https://wa.me/${waNumber(s.clientPhone)}`} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-lg text-black text-[13px] font-semibold inline-flex items-center gap-1.5" style={{ background: '#25D366' }}><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>}
              </div>
            </div>
          )}

          {/* Créneaux réservés sur les disponibilités du formateur. @author Rabah Ziane · 2026-07-20 */}
          {(s.days || []).length > 0 && (
            <div>
              <div className="text-[12px] uppercase tracking-wide text-white/40 font-semibold mb-2">Vos créneaux{s.scheduledHours ? ` · ${s.scheduledHours} h encadrées` : ''}</div>
              <div className="space-y-1.5">
                {(s.days || []).map((d, i) => (
                  <DayRow key={i} d={d} index={i} session={s} />
                ))}
              </div>
            </div>
          )}

          {/* Replanification après échange avec le client (notifie Delivery Digital). @author Rabah Ziane · 2026-07-20 */}
          {s.status === 'scheduled' && <RescheduleBlock s={s} authJson={authJson} onChanged={onChanged} />}

          {/* Supports pédagogiques du coffre-fort DD. @Rabah 2026-07-20 */}
          <MaterialsBlock s={s} auth={auth} />

          {/* Bon de commande émis par Delivery Digital à l'assignation. @Rabah 2026-07-20 */}
          {s.purchaseOrder?.number && (
            <div>
              <div className="text-[12px] uppercase tracking-wide text-white/40 font-semibold mb-2">Bon de commande</div>
              <button onClick={() => setPoOpen(true)} className="w-full flex items-center gap-3 text-[13px] bg-[#0E0F13] hover:bg-white/5 rounded-lg px-3 py-2 text-left">
                <FileText className="h-4 w-4 shrink-0" style={{ color: BLUE }} />
                <span className="font-medium">{s.purchaseOrder.number}</span>
                <span className="text-white/40 text-[12px] ml-auto">voir / télécharger</span>
              </button>
            </div>
          )}

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

          {/* Visioconférence + message d'accueil prêt à coller dans le groupe WhatsApp. @author Rabah Ziane · 2026-07-20 */}
          {s.meetingLink && <MeetingBlock s={s} trainerName={trainerName} />}

        </div>
      )}
      {poOpen && <PurchaseOrderModal s={s} trainer={trainer} trainerRate={trainerRate} onClose={() => setPoOpen(false)} />}
    </section>
  );
}
/**
 * Message d'accueil prêt à envoyer dans le groupe WhatsApp : présentation du formateur,
 * planning repris des créneaux réservés et lien de la salle. Partagé entre l'étape 3 du
 * déroulé et le bloc visioconférence, pour qu'il n'existe qu'une seule version du texte.
 * @author Rabah Ziane · 2026-07-20
 */
function buildWelcomeMessage(s: Session, trainerName: string) {
  const planning = (s.days || []).length
    ? (s.days || []).map((d) => `- ${new Date(`${d.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} de ${d.from} à ${d.to}`).join('\n')
    : (s.sessionStart ? `- ${fmtDate(s.sessionStart)}` : '');
  return [
    `Bonjour à toutes et à tous,`,
    ``,
    `Je suis ${trainerName}, votre formateur pour « ${s.formationTitle || 'la formation'} » avec Delivery Digital.`,
    ``,
    planning ? `Voici le planning :\n${planning}` : '',
    ``,
    `Nous nous retrouverons en visioconférence ici :`,
    s.meetingLink,
    ``,
    `Aucune installation n'est nécessaire, le lien s'ouvre directement dans votre navigateur.`,
    ``,
    // Envoyés automatiquement 6 jours avant la 1re séance : le message d'accueil sert de
    // rappel pour qu'ils soient effectivement remplis avant le démarrage (exigence Qualiopi).
    `IMPORTANT - à faire avant le début de la formation :`,
    `Vous recevez par email deux questionnaires à compléter impérativement AVANT notre première séance :`,
    `- Expression des attentes de l'apprenant concernant la formation`,
    `- Évaluation du positionnement de l'apprenant`,
    `Ils nous permettent d'adapter la formation à votre niveau et à vos besoins. Merci de les renvoyer avant le démarrage.`,
    ``,
    `N'hésitez pas à poser vos questions dans ce groupe avant la session. À très vite !`,
  ].filter(Boolean).join('\n');
}

/**
 * Supports rattachés à une étape : le formateur voit au bon moment le document à utiliser ou
 * à remettre aux apprenants, sans aller le chercher dans la liste complète.
 * @author Rabah Ziane · 2026-07-20
 */
function StepDocs({ s, docs, auth }: { s: Session; docs: string[]; auth: () => any }) {
  const [busy, setBusy] = useState('');
  const open = async (name: string) => {
    setBusy(name);
    try {
      const r = await fetch(`/api/trainer/self/sessions/${s._id}/materials/download?name=${encodeURIComponent(name)}`, { headers: auth() });
      if (!r.ok) return;
      const url = URL.createObjectURL(await r.blob());
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } finally { setBusy(''); }
  };
  if (!docs.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {docs.map((d) => (
        <button key={d} onClick={() => open(d)} disabled={!!busy}
          className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[12.5px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60">
          <FileText className="h-3.5 w-3.5" style={{ color: BLUE }} /> {busy === d ? 'ouverture…' : d.replace(/\.pdf$/i, '')}
        </button>
      ))}
    </div>
  );
}

/**
 * Numéro au format international pour WhatsApp (wa.me n'accepte que des chiffres, sans « + »).
 * Les numéros clients sont saisis à la française (06…) : on les préfixe alors en 33.
 * @author Rabah Ziane · 2026-07-20
 */
function waNumber(phone?: string) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('33')) return d;
  if (d.startsWith('0')) return `33${d.slice(1)}`;
  return d;
}

/**
 * Message des exercices à coller dans le groupe WhatsApp après la visio d'une journée.
 * Partagé entre l'étape « Envoyer les exercices » et le détail du créneau.
 * @author Rabah Ziane · 2026-07-20
 */
function buildExercisesMessage(exercises: string) {
  return [
    `Bravo pour la séance d'aujourd'hui !`,
    ``,
    `COMMENT ÇA MARCHE`,
    `Cette formation se déroule en situation de travail : après chaque heure de visioconférence, vous appliquez ce que nous avons vu directement sur votre poste, pendant votre service. Cela représente environ 6 h de travail d'ici notre prochaine séance.`,
    ``,
    `CE QUE VOUS DEVEZ FAIRE`,
    exercises,
    ``,
    `COMMENT NOUS RENDRE VOTRE TRAVAIL`,
    `Pour chaque exercice, envoyez directement dans ce groupe WhatsApp ce qui vous est demandé : une photo, un relevé, un tableau ou simplement ce que vous avez constaté. Vous pouvez les envoyer au fur et à mesure, pas besoin de tout faire d'un coup.`,
    ``,
    `À QUOI ÇA SERT`,
    `Ces envois constituent la preuve de votre formation : ils sont obligatoires pour la validation de votre parcours. Nous les reprendrons ensemble au début de la prochaine séance.`,
    ``,
    `Je reste disponible dans ce groupe si un exercice n'est pas clair.`,
  ].join('\n');
}

/**
 * Étapes générées à partir des journées réellement planifiées : la formation se déroule en
 * 3 jours identiques dans leur logique (on anime l'heure de visio, puis on envoie les
 * exercices des 6 h en situation de travail). Ces étapes suivent la préparation et rendent le
 * parcours explicite du premier au dernier jour.
 * Le diaporama accompagne chaque journée ; les documents HACCP n'apparaissent que le jour où
 * la méthode est traitée (jour 2).
 * @author Rabah Ziane · 2026-07-20
 */
const DIAPO_DOC = 'Diapos _Formation Hygiène, Sécurité et Développement Durable21h.pdf';
const HACCP_DOCS = ['CAS PRATIQUES HACCP.PDF', 'fiche_non_conformite_HACCP.pdf'];

function buildDaySteps(s: Session): Instruction[] {
  const out: Instruction[] = [];
  (s.days || []).forEach((d, i) => {
    const label = new Date(`${d.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    out.push({
      id: `day-${i}-anim`,
      title: `Jour ${i + 1} - Animer la séance (${label}, ${d.from}-${d.to})`,
      body: i === 1
        ? `Ouvrez votre salle quelques minutes avant, admettez les apprenants depuis la salle d'attente, puis partagez votre écran. C'est LE jour de la méthode HACCP : traitez les cas pratiques ci-dessous et montrez comment remplir une fiche de non-conformité, les apprenants la réutiliseront dans leurs exercices.`
        : `Ouvrez votre salle quelques minutes avant, admettez les apprenants depuis la salle d'attente, puis partagez votre écran et déroulez le diaporama.`,
      docs: i === 1 ? [DIAPO_DOC, ...HACCP_DOCS] : [DIAPO_DOC],
    });
    out.push({
      id: `day-${i}-exos`,
      title: `Jour ${i + 1} - Envoyer les exercices en situation de travail`,
      body: `Dès la fin de la visio, envoyez les exercices du jour ${i + 1} dans le groupe WhatsApp. Les apprenants les réalisent sur leur poste (6 h), avec un livrable par exercice.`,
      docs: [],
    });
  });
  // Clôture puis auto-évaluation : la dernière étape lui rappelle sa rémunération et le
  // circuit de facturation, pour qu'il n'ait pas à demander « et je suis payé quand ? ».
  // Clôture : le formateur annonce aux apprenants ce qu'ils reçoivent après la formation.
  if ((s.days || []).length) {
    out.push({
      id: 'closing',
      title: 'Clôturer la formation',
      body: `Envoyez le message de clôture aux apprenants : il annonce le questionnaire de satisfaction à chaud, l'attestation et le questionnaire à froid.`,
      docs: [],
    });
    out.push({
      id: 'autoeval',
      title: 'Remplir votre auto-évaluation et voir votre rémunération',
      body: `Vous recevez par email, le jour même de la dernière séance, le questionnaire « Auto-évaluation de la formation par le formateur ». Complétez-le, puis validez cette étape.`,
      docs: [],
    });
  }
  return out;
}

/**
 * Confirmation que le formateur est bien dans le groupe WhatsApp des apprenants, avec le lien
 * d'invitation s'il l'a. Rattachée à l'étape correspondante du déroulé plutôt qu'à un encart
 * séparé, pour qu'il n'y ait qu'un seul endroit où agir.
 * @author Rabah Ziane · 2026-07-20
 */
function GroupConfirm({ s, authJson, onChanged }: { s: Session; authJson: () => any; onChanged: () => void }) {
  const [link, setLink] = useState(s.whatsappGroupLink || '');
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await fetch(`/api/trainer/self/sessions/${s._id}/whatsapp`, { method: 'POST', headers: authJson(), body: JSON.stringify({ created: true, link }) });
      onChanged();
    } finally { setBusy(false); }
  };
  if (s.whatsappGroupCreated) {
    return (
      <p className="mt-2 text-[12.5px] text-[#3DD68C] inline-flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" /> Vous êtes dans le groupe
        {s.whatsappGroupLink && <a href={s.whatsappGroupLink} target="_blank" rel="noreferrer" className="underline text-white/60 ml-1">ouvrir le groupe</a>}
      </p>
    );
  }
  return (
    <div className="mt-2 space-y-2">
      <p className="text-[12px] text-white/50">
        Pas encore ajouté ? Contactez {s.pedagoName || PEDAGO_FALLBACK} au {s.pedagoPhone || PEDAGO_PHONE_FALLBACK} - il est <span className="text-white/75 font-semibold">joignable sur WhatsApp</span>, pour le pédagogique comme pour tout problème technique.
      </p>
      <a href={`https://wa.me/${waNumber(s.pedagoPhone || PEDAGO_PHONE_FALLBACK)}`} target="_blank" rel="noreferrer"
        className="px-3.5 py-2 rounded-lg text-black text-[12.5px] font-semibold inline-flex items-center gap-1.5" style={{ background: '#25D366' }}>
        <MessageCircle className="h-3.5 w-3.5" /> Écrire au responsable
      </a>
    <div className="flex flex-wrap gap-2">
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Lien d'invitation du groupe (facultatif)"
        className="flex-1 min-w-[220px] px-3 py-2 rounded-lg bg-[#0E0F13] border border-white/10 text-[13px] text-white placeholder-white/30 outline-none" />
      <button onClick={confirm} disabled={busy} className="px-3.5 py-2 rounded-lg text-white text-[12.5px] font-semibold disabled:opacity-60" style={{ background: BLUE }}>
        {busy ? '…' : 'Je suis dans le groupe'}
      </button>
    </div>
    </div>
  );
}

/**
 * Auto-évaluation du formateur + rappel de sa rémunération. La dernière étape du déroulé ne
 * se valide qu'une fois ce formulaire enregistré : c'est la preuve d'exécution attendue côté
 * Qualiopi, et ça évite de clore un cours sans retour du formateur.
 * @author Rabah Ziane · 2026-07-20
 */
function SelfAssessment({ s, trainerRate, authJson, onChanged }: { s: Session; trainerRate: number; authJson: () => any; onChanged: () => void }) {
  const saved = s.selfAssessment;
  const [f, setF] = useState({
    objectivesMet: saved?.objectivesMet || 'oui',
    groupLevel: saved?.groupLevel || 'homogene',
    attendance: saved?.attendance || 'complete',
    difficulties: saved?.difficulties || '',
    improvements: saved?.improvements || '',
    rating: saved?.rating || 0,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(!saved);

  const rate = s.hourlyRate || trainerRate || 0;
  const hours = s.scheduledHours || s.hours || 0;
  const amount = s.payAmount || Math.round(hours * rate);
  const settled = !!s.payAmount;

  const save = async () => {
    if (!f.rating) { setErr('Donnez une note globale à la session.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/trainer/self/sessions/${s._id}/self-assessment`, { method: 'POST', headers: authJson(), body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) { setErr("Échec de l'enregistrement."); return; }
      setEditing(false); onChanged();
    } catch { setErr('Réseau indisponible.'); }
    finally { setBusy(false); }
  };

  const sel = 'px-2.5 py-1.5 rounded-lg bg-[#0E0F13] border border-white/10 text-[13px] text-white outline-none';
  const area = 'w-full px-3 py-2 rounded-lg bg-[#0E0F13] border border-white/10 text-[13px] text-white placeholder-white/30 outline-none';

  return (
    <div className="mt-2 space-y-3">
      <div className="rounded-xl border border-white/10 bg-[#181A20] p-3">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <span className="text-[13px] font-semibold">Auto-évaluation de la formation par le formateur</span>
          {saved && !editing && <span className="text-[12px] text-[#3DD68C] inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Enregistrée</span>}
        </div>

        {!editing && saved ? (
          <div className="text-[12.5px] text-white/65 space-y-1">
            <p>Objectifs atteints : <span className="text-white/90">{saved.objectivesMet}</span> · Groupe : <span className="text-white/90">{saved.groupLevel === 'homogene' ? 'homogène' : 'hétérogène'}</span> · Assiduité : <span className="text-white/90">{saved.attendance === 'complete' ? 'complète' : 'partielle'}</span></p>
            <p>Note globale : <span className="text-white/90 font-semibold">{saved.rating}/5</span></p>
            {saved.difficulties && <p>Difficultés : {saved.difficulties}</p>}
            {saved.improvements && <p>Améliorations : {saved.improvements}</p>}
            <button onClick={() => setEditing(true)} className="mt-1 text-[12.5px] text-white/50 hover:text-white underline">Modifier</button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[12px] text-white/50">Ces réponses sont conservées comme preuve d'exécution de la formation.</p>
            <div className="flex flex-wrap gap-2">
              <label className="text-[12px] text-white/50">Objectifs atteints
                <select className={`${sel} ml-1.5`} value={f.objectivesMet} onChange={(e) => setF({ ...f, objectivesMet: e.target.value })}>
                  <option value="oui" className="bg-[#181A20]">Oui</option>
                  <option value="partiellement" className="bg-[#181A20]">Partiellement</option>
                  <option value="non" className="bg-[#181A20]">Non</option>
                </select>
              </label>
              <label className="text-[12px] text-white/50">Niveau du groupe
                <select className={`${sel} ml-1.5`} value={f.groupLevel} onChange={(e) => setF({ ...f, groupLevel: e.target.value })}>
                  <option value="homogene" className="bg-[#181A20]">Homogène</option>
                  <option value="heterogene" className="bg-[#181A20]">Hétérogène</option>
                </select>
              </label>
              <label className="text-[12px] text-white/50">Assiduité
                <select className={`${sel} ml-1.5`} value={f.attendance} onChange={(e) => setF({ ...f, attendance: e.target.value })}>
                  <option value="complete" className="bg-[#181A20]">Complète</option>
                  <option value="partielle" className="bg-[#181A20]">Partielle</option>
                </select>
              </label>
            </div>
            <textarea className={area} rows={2} placeholder="Difficultés rencontrées (facultatif)" value={f.difficulties} onChange={(e) => setF({ ...f, difficulties: e.target.value })} />
            <textarea className={area} rows={2} placeholder="Points à améliorer pour les prochaines sessions (facultatif)" value={f.improvements} onChange={(e) => setF({ ...f, improvements: e.target.value })} />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-white/50">Note globale</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setF({ ...f, rating: n })}
                  className={`h-8 w-8 rounded-lg text-[13px] font-semibold ${f.rating >= n ? 'text-white' : 'bg-white/8 text-white/50'}`}
                  style={f.rating >= n ? { background: BLUE } : undefined}>{n}</button>
              ))}
            </div>
            {err && <p className="text-[12.5px] text-[#FF6B6B]">{err}</p>}
            <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg text-white text-[13px] font-semibold disabled:opacity-60" style={{ background: BLUE }}>
              {busy ? '…' : "Enregistrer mon auto-évaluation"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#181A20] p-3">
        <div className="text-[12px] uppercase tracking-wide text-white/40 font-semibold mb-1">Votre rémunération pour cette formation</div>
        <div className="text-[20px] font-bold mb-1" style={{ color: BLUE }}>{euro(amount)}</div>
        <p className="text-[12.5px] text-white/55 mb-2">{hours} h encadrées × {rate} €/h{settled ? '' : ' (estimation, figée dès que Delivery Digital marque le cours réalisé)'}</p>
        <p className="text-[11.5px] text-white/35 mb-2">Les heures en situation de travail sont réalisées par les apprenants sur leur poste : elles ne sont pas des heures encadrées.</p>
        {/* Le formateur ne comprenait pas pourquoi ses fonds n'apparaissaient pas : on rend
            l'étape en cours explicite. @Rabah 2026-07-20 */}
        <div className={`rounded-lg px-3 py-2 mb-2 text-[12.5px] ${settled ? 'bg-[#3DD68C]/10 text-[#3DD68C]' : 'bg-[#E5B567]/10 text-[#E5B567]'}`}>
          {settled
            ? <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Montant validé : retrouvez-le dans l'onglet « Fonds » pour demander l'encaissement.</span>
            : <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Delivery Digital est prévenu de la fin de votre formation. Vos fonds apparaîtront dans l'onglet « Fonds » dès que le cours sera marqué réalisé.</span>}
        </div>
        <div className="text-[12.5px] text-white/65 space-y-1">
          <p>Votre facture est établie automatiquement à partir des informations de votre profil (raison sociale, SIRET, RIB) : vérifiez qu'elles sont à jour dans « Mon compte ».</p>
          <p>Vous la recevez <span className="text-white/90 font-semibold">en fin de mois</span>, sans démarche de votre part.</p>
          <p>Le règlement intervient <span className="text-white/90 font-semibold">à 30 jours</span>.</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Actions rattachées à une étape du déroulé : le formateur ne doit pas avoir à chercher
 * ailleurs ce dont l'étape a besoin (message à envoyer, dates à confirmer, lien à ouvrir).
 * Le rattachement se fait sur les mots-clés du libellé, car les instructions restent
 * librement éditables par le superadmin - une étape non reconnue s'affiche simplement sans
 * action, jamais en erreur.
 * @author Rabah Ziane · 2026-07-20
 */
function stepKind(title: string, body: string, id?: string): 'dates' | 'welcome' | 'room' | 'exos' | 'closing' | 'pay' | 'group' | null {
  // Étapes générées par jour : le type est porté par l'identifiant, aucun doute possible.
  if (id?.endsWith('-anim')) return 'room';
  if (id?.endsWith('-exos')) return 'exos';
  if (id === 'closing') return 'closing';
  if (id === 'autoeval') return 'pay';
  // On ne se fie qu'au TITRE : les textes explicatifs mentionnent souvent « les dates » ou
  // « le lien visio » sans que ce soit l'objet de l'étape (l'accueil parlait des dates et
  // affichait à tort les boutons de replanification).
  const t = title.toLowerCase();
  if (t.includes('accueil')) return 'welcome';
  if (t.includes('groupe')) return 'group';
  if (t.includes('date')) return 'dates';
  if (t.includes('visio') || t.includes('salle') || t.includes('séance')) return 'room';
  return null;
}

function StepAction({ kind, stepId, s, trainerName, trainerRate, authJson, onChanged }: { kind: 'dates' | 'welcome' | 'room' | 'exos' | 'closing' | 'pay' | 'group'; stepId: string; s: Session; trainerName: string; trainerRate: number; authJson: () => any; onChanged: () => void }) {
  const [copied, setCopied] = useState(false);
  const [reschedule, setReschedule] = useState(false);

  if (kind === 'dates') {
    // Message de confirmation pré-rédigé, repris quel que soit le canal choisi.
    const planning = (s.days || []).map((d) => `- ${new Date(`${d.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} de ${d.from} à ${d.to}`).join('\n');
    const clientMsg = [
      `Bonjour${s.clientContactName ? ` ${s.clientContactName}` : ''},`,
      ``,
      `Je suis ${trainerName}, formateur Delivery Digital pour « ${s.formationTitle || 'la formation'} ».`,
      planning ? `Je vous confirme les dates prévues :\n${planning}` : `Je vous contacte pour confirmer les dates de la formation.`,
      ``,
      `Est-ce que cela vous convient ? Si besoin nous pouvons les adapter ensemble.`,
      ``,
      `À noter : tous les apprenants inscrits recevront par email, avant le démarrage, deux questionnaires à compléter (expression des attentes et évaluation du positionnement). À l'issue de la formation, chacun recevra un questionnaire de satisfaction et son attestation de fin de formation.`,
    ].join('\n');
    return (
      <div className="mt-2 space-y-2">
        {/* Tous les canaux pour joindre le client : appel, WhatsApp, SMS, email. @Rabah 2026-07-20 */}
        <div className="flex flex-wrap gap-2">
          {s.clientPhone && <a href={`tel:${s.clientPhone.replace(/\s/g, '')}`} className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Appeler {s.clientContactName || 'le client'}</a>}
          {s.clientPhone && <a href={`https://wa.me/${waNumber(s.clientPhone)}?text=${encodeURIComponent(clientMsg)}`} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-lg text-black text-[12.5px] font-semibold inline-flex items-center gap-1.5" style={{ background: '#25D366' }}><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>}
          {s.clientPhone && <a href={`sms:${s.clientPhone.replace(/\s/g, '')}${/iPhone|iPad|Mac/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(clientMsg)}`} className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[12.5px] font-semibold inline-flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> SMS</a>}
          <button onClick={() => setReschedule((r) => !r)} className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[12.5px] font-semibold inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Modifier les dates</button>
        </div>
        {(s.days || []).length > 0 && (
          <p className="text-[12px] text-white/50">
            Dates prévues : {(s.days || []).map((d) => `${new Date(`${d.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${d.from}-${d.to}`).join(' · ')}
          </p>
        )}
        {reschedule && <RescheduleBlock s={s} authJson={authJson} onChanged={onChanged} startOpen />}
      </div>
    );
  }

  if (kind === 'room') {
    if (!s.meetingLink) return null;
    const hostLink = s.hostKey ? `${s.meetingLink}${s.meetingLink.includes('?') ? '&' : '?'}h=${s.hostKey}` : s.meetingLink;
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={hostLink} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-lg text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5" style={{ background: BLUE }}><Video className="h-3.5 w-3.5" /> Ouvrir ma salle</a>
      </div>
    );
  }

  if (kind === 'group') {
    // Confirmation d'appartenance au groupe : elle vit dans l'étape, plus dans un encart séparé.
    return <GroupConfirm s={s} authJson={authJson} onChanged={onChanged} />;
  }

  if (kind === 'pay') {
    return <SelfAssessment s={s} trainerRate={trainerRate} authJson={authJson} onChanged={onChanged} />;
  }

  if (kind === 'closing') {
    const msg = [
      `Merci à toutes et à tous pour votre participation et votre implication sur ces ${(s.days || []).length} journées !`,
      ``,
      `Vous recevez dès aujourd'hui par email le questionnaire « Évaluation de la satisfaction à chaud de l'apprenant ». Merci de le compléter rapidement : votre retour nous permet d'améliorer la formation.`,
      ``,
      `Vous recevrez également votre attestation de fin de formation, puis dans environ 3 mois un dernier questionnaire de satisfaction à froid, pour mesurer ce que vous avez pu mettre en pratique.`,
      ``,
      `Bonne continuation et n'hésitez pas à appliquer ce que nous avons vu ensemble !`,
    ].join('\n');
    return (
      <div className="mt-2">
        <pre className="text-[12.5px] text-white/80 whitespace-pre-wrap font-sans bg-[#181A20] rounded-lg p-2.5 mb-2 max-h-[220px] overflow-auto">{msg}</pre>
        <div className="flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-lg text-black text-[12.5px] font-semibold inline-flex items-center gap-1.5" style={{ background: '#25D366' }}>
            <MessageCircle className="h-3.5 w-3.5" /> Partager sur WhatsApp
          </a>
          <button onClick={async () => { try { await navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* refusé */ } }}
            className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[12.5px] font-semibold inline-flex items-center gap-1.5">
            <Copy className="h-3.5 w-3.5" /> {copied ? 'Message copié' : 'Copier le message'}
          </button>
        </div>
      </div>
    );
  }

  if (kind === 'exos') {
    // L'index du jour est dans l'identifiant de l'étape : on prend les exercices du bon jour.
    const idx = Number(stepId.split('-')[1] || 0);
    const day = (s.days || [])[idx];
    if (!day?.exercises) return null;
    const msg = buildExercisesMessage(day.exercises);
    return (
      <div className="mt-2">
        <pre className="text-[12.5px] text-white/80 whitespace-pre-wrap font-sans bg-[#181A20] rounded-lg p-2.5 mb-2 max-h-[220px] overflow-auto">{msg}</pre>
        <div className="flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-lg text-black text-[12.5px] font-semibold inline-flex items-center gap-1.5" style={{ background: '#25D366' }}>
            <MessageCircle className="h-3.5 w-3.5" /> Partager sur WhatsApp
          </a>
          <button onClick={async () => { try { await navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* refusé */ } }}
            className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[12.5px] font-semibold inline-flex items-center gap-1.5">
            <Copy className="h-3.5 w-3.5" /> {copied ? 'Message copié' : 'Copier le message'}
          </button>
        </div>
      </div>
    );
  }

  // Message d'accueil : texte visible tel qu'il partira, copie, et ouverture directe de WhatsApp.
  const message = buildWelcomeMessage(s, trainerName);
  const waHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* refusé */ }
  };
  return (
    <div className="mt-2">
      <pre className="text-[12.5px] text-white/80 whitespace-pre-wrap font-sans bg-[#181A20] rounded-lg p-2.5 mb-2 max-h-[220px] overflow-auto">{message}</pre>
      <div className="flex flex-wrap gap-2">
        <a href={waHref} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-lg text-black text-[12.5px] font-semibold inline-flex items-center gap-1.5" style={{ background: '#25D366' }}>
          <MessageCircle className="h-3.5 w-3.5" /> Partager sur WhatsApp
        </a>
        <button onClick={copy} className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[12.5px] font-semibold inline-flex items-center gap-1.5">
          <Copy className="h-3.5 w-3.5" /> {copied ? 'Message copié' : 'Copier le message'}
        </button>
      </div>
      <p className="text-[11.5px] text-white/35 mt-1.5">« Partager sur WhatsApp » ouvre l'application avec le message déjà écrit : il ne reste qu'à choisir le groupe de la formation.</p>
    </div>
  );
}

/**
 * Déroulé pas-à-pas du cours, repris de la rubrique Instructions : le formateur voit d'un
 * coup d'œil où il en est du début à la fin. Une seule étape est ouverte à la fois - celle en
 * cours - les précédentes sont cochées et repliées, les suivantes grisées et non cliquables,
 * pour qu'il n'y ait jamais d'ambiguïté sur ce qu'il reste à faire.
 * @author Rabah Ziane · 2026-07-20
 */
function StepsBlock({ s, steps, trainerName, trainerRate, auth, authJson, onChanged }: { s: Session; steps: Instruction[]; trainerName: string; trainerRate: number; auth: () => any; authJson: () => any; onChanged: () => void }) {
  const [done, setDone] = useState<string[]>(() => (s.stepsDone || []).map((x) => x.instructionId));
  const [busy, setBusy] = useState('');
  // Étape terminée que le formateur a rouverte pour la relire (sans la décocher).
  const [reopened, setReopened] = useState<string | null>(null);
  const [stepErr, setStepErr] = useState('');
  useEffect(() => { setDone((s.stepsDone || []).map((x) => x.instructionId)); }, [s.stepsDone]);
  // Préparation (rubrique Instructions) puis une paire d'étapes par journée planifiée.
  const allSteps = useMemo(() => [...steps, ...buildDaySteps(s)], [steps, s]);
  if (!allSteps.length) return null;

  const toggle = async (id: string, next: boolean) => {
    setBusy(id);
    setDone((d) => next ? [...d, id] : d.filter((x) => x !== id));  // retour visuel immédiat
    try {
      const r = await fetch(`/api/trainer/self/sessions/${s._id}/step`, { method: 'POST', headers: authJson(), body: JSON.stringify({ instructionId: id, done: next }) });
      const j = await r.json().catch(() => ({}));
      if (j.error === 'self_assessment_required') {
        setDone((d) => d.filter((x) => x !== id));   // on annule le retour visuel optimiste
        setStepErr("Enregistrez d'abord votre auto-évaluation ci-dessus.");
        setTimeout(() => setStepErr(''), 4000);
        return;
      }
      onChanged();
    } finally { setBusy(''); }
  };

  const doneCount = allSteps.filter((st) => done.includes(st.id)).length;
  const currentIndex = allSteps.findIndex((st) => !done.includes(st.id));   // -1 = tout est fait
  const finished = currentIndex === -1;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[12px] uppercase tracking-wide text-white/40 font-semibold">Déroulé du cours</div>
        <span className="text-[12px] font-semibold" style={{ color: finished ? '#3DD68C' : BLUE }} title="Cliquez sur une étape terminée pour la revoir">{doneCount}/{allSteps.length} {finished ? '· terminé' : ''}</span>
      </div>
      <div className="h-1 rounded-full bg-white/8 mb-3 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${(doneCount / allSteps.length) * 100}%`, background: finished ? '#3DD68C' : BLUE }} />
      </div>

      <div className="space-y-1.5">
        {allSteps.map((st, i) => {
          const isDone = done.includes(st.id);
          const isCurrent = i === currentIndex;
          const locked = !isDone && !isCurrent;   // étape future : on ne saute pas les étapes
          // Une étape faite peut être rouverte pour la relire, et décochée pour la refaire.
          const isOpen = isCurrent || reopened === st.id;
          return (
            <div key={st.id} className={`rounded-lg px-3 py-2.5 ${isCurrent ? 'bg-[#0E0F13] border' : 'bg-[#0E0F13]'} ${locked ? 'opacity-40' : ''}`}
              style={isCurrent ? { borderColor: BLUE } : undefined}>
              <div className="flex items-start gap-2.5">
                <button disabled={locked || busy === st.id} onClick={() => toggle(st.id, !isDone)}
                  title={isDone ? 'Décocher pour refaire cette étape' : undefined}
                  className={`mt-0.5 h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold ${isDone ? 'text-white' : 'border border-white/25 text-white/50'} ${locked ? 'cursor-not-allowed' : ''}`}
                  style={isDone ? { background: '#3DD68C' } : undefined}>
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </button>
                <div className="min-w-0 flex-1">
                  <button type="button" disabled={locked} onClick={() => { if (isDone) setReopened(reopened === st.id ? null : st.id); }}
                    className={`text-[13.5px] font-semibold text-left w-full ${isDone ? 'text-white/45 line-through hover:text-white/70' : ''} ${locked ? 'cursor-not-allowed' : isDone ? 'cursor-pointer' : ''}`}>
                    {st.title}
                  </button>
                  {/* Le détail n'est utile que sur l'étape en cours : le reste resterait du bruit. */}
                  {isOpen && st.body && <p className="text-[12.5px] text-white/60 mt-1 whitespace-pre-line">{st.body}</p>}
                  {/* Ce dont l'étape a besoin, directement sous elle. @Rabah 2026-07-20 */}
                  {isOpen && (() => { const k = stepKind(st.title, st.body || '', st.id); return k ? <StepAction kind={k} stepId={st.id} s={s} trainerName={trainerName} trainerRate={trainerRate} authJson={authJson} onChanged={onChanged} /> : null; })()}
                  {isOpen && <StepDocs s={s} docs={st.docs || []} auth={auth} />}
                  {isCurrent && <button onClick={() => toggle(st.id, true)} disabled={busy === st.id}
                    className="mt-2 px-3.5 py-1.5 rounded-lg text-white text-[12.5px] font-semibold disabled:opacity-60" style={{ background: BLUE }}>
                    {busy === st.id ? '…' : "C'est fait, étape suivante"}
                  </button>}
                  {isDone && reopened === st.id && <button onClick={() => { setReopened(null); toggle(st.id, false); }} disabled={busy === st.id}
                    className="mt-2 px-3.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-[12.5px] font-semibold">
                    Revenir à cette étape
                  </button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {stepErr && <p className="text-[12.5px] text-[#FF6B6B] mt-2">{stepErr}</p>}
      {finished && <p className="text-[12.5px] text-[#3DD68C] mt-2 inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Formation menée de bout en bout : toutes les étapes sont faites.</p>}
    </div>
  );
}

/**
 * Bon de commande émis par Delivery Digital vers le formateur pour une session : il matérialise
 * la commande de prestation en application du contrat-cadre signé, et sert de pièce justificative
 * de part et d'autre. Imprimable / téléchargeable en PDF via le navigateur.
 * @author Rabah Ziane · 2026-07-20
 */
function PurchaseOrderModal({ s, trainer, trainerRate, onClose }: { s: Session; trainer: Trainer; trainerRate: number; onClose: () => void }) {
  const print = () => window.print();
  const ci = trainer.companyInfo || {};
  const rate = s.hourlyRate || trainerRate || 0;
  const hours = s.scheduledHours || s.hours || 0;
  const amount = s.payAmount || Math.round(hours * rate);
  const issued = s.purchaseOrder?.issuedAt ? new Date(s.purchaseOrder.issuedAt) : new Date();
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex gap-3 py-1.5 border-b border-black/5 text-[12.5px]"><span className="w-[190px] shrink-0 text-[#86868B]">{k}</span><span className="text-[#1D1D1F]">{v}</span></div>
  );
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-3xl my-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end mb-2 no-print">
          <button onClick={onClose} className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="bg-white rounded-2xl overflow-hidden">
          <div id="bc-print" className="p-8 text-[#1D1D1F]">
            <div className="flex items-start justify-between gap-6 mb-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-[#86868B] font-bold">Bon de commande</p>
                <p className="text-[20px] font-extrabold">{s.purchaseOrder?.number || '-'}</p>
                <p className="text-[12px] text-[#86868B] mt-0.5">Émis le {issued.toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="text-right text-[11.5px] leading-relaxed">
                <p className="font-extrabold text-[13px]">DELIVERY Digital Nice</p>
                <p>470 promenade des Anglais</p>
                <p>06200 Nice · France</p>
                <p className="text-[10.5px] text-[#86868B] mt-1">SIRET 90294519500029 · APE 6201Z</p>
                <p className="text-[10.5px] text-[#86868B]">Organisme de formation certifié QUALIOPI</p>
              </div>
            </div>

            <div className="rounded-xl bg-[#F5F5F7] p-4 mb-5">
              <p className="text-[11px] uppercase tracking-wider text-[#86868B] font-bold mb-1">Prestataire</p>
              <p className="text-[13.5px] font-bold">{ci.legalName || trainer.name}</p>
              {ci.regNumber && <p className="text-[12px]">SIRET / N° {ci.regNumber}</p>}
              {(ci.address || ci.city) && <p className="text-[12px]">{[ci.address, ci.postalCode, ci.city, ci.country].filter(Boolean).join(', ')}</p>}
              <p className="text-[12px] text-[#86868B] mt-0.5">{trainer.email}{trainer.phone ? ` · ${trainer.phone}` : ''}</p>
            </div>

            <p className="text-[11px] uppercase tracking-wider text-[#86868B] font-bold mb-1">Objet de la commande</p>
            <div className="mb-5">
              {row('Formation', s.formationTitle || '-')}
              {row('Bénéficiaire', s.clientName || '-')}
              {row('Modalité', s.location || '-')}
              {row('Apprenants', String((s.learners || []).length))}
              {row('Durée pédagogique', `${s.hours || 0} h (dont formation en situation de travail réalisée par les apprenants)`)}
              {row('Créneaux animés', (s.days || []).length
                ? <span className="whitespace-pre-line">{(s.days || []).map((d) => `${new Date(`${d.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${d.from} - ${d.to}`).join('\n')}</span>
                : (s.sessionStart ? fmtDate(s.sessionStart) : 'à planifier'))}
            </div>

            <p className="text-[11px] uppercase tracking-wider text-[#86868B] font-bold mb-1">Rémunération</p>
            <table className="w-full text-[12.5px] mb-5">
              <thead><tr className="text-[#86868B] text-left"><th className="py-1.5 font-semibold">Désignation</th><th className="py-1.5 font-semibold text-right">Heures encadrées</th><th className="py-1.5 font-semibold text-right">Taux horaire</th><th className="py-1.5 font-semibold text-right">Total</th></tr></thead>
              <tbody>
                <tr className="border-t border-black/10">
                  <td className="py-2">Animation de la formation</td>
                  <td className="py-2 text-right">{hours} h</td>
                  <td className="py-2 text-right">{rate} €</td>
                  <td className="py-2 text-right font-bold">{euro(amount)}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[11px] text-[#86868B] mb-5">Seules les heures encadrées (animation) sont rémunérées. Les heures en situation de travail sont réalisées par les apprenants sur leur poste et ne donnent pas lieu à facturation.</p>

            <p className="text-[11px] uppercase tracking-wider text-[#86868B] font-bold mb-1">Conditions</p>
            <p className="text-[11.5px] text-[#3a3a3c] leading-relaxed mb-6">
              Prestation commandée en application du contrat de prestation signé entre les parties. La facture correspondante est établie automatiquement à partir des informations du prestataire et lui est adressée en fin de mois ; le règlement intervient à 30 jours par virement sur le compte bancaire renseigné. Le prestataire s'engage à respecter le programme pédagogique, le référentiel QUALIOPI et à transmettre les éléments d'évaluation des apprenants.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 border-t border-black/10 pt-5">
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-[#86868B] font-bold">Pour Delivery Digital</p>
                <p className="text-[11.5px] mt-1">Nice, le {issued.toLocaleDateString('fr-FR')}</p>
                <p className="text-[12.5px] font-bold mt-2">Ziane Rabah</p>
                <p className="text-[11px] text-[#86868B]">Responsable pédagogique</p>
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-[#86868B] font-bold">Le prestataire</p>
                <p className="text-[11.5px] mt-1">Bon pour accord</p>
                <p className="text-[12.5px] font-bold mt-2">{ci.legalName || trainer.name}</p>
                {trainer.contract?.signed && <p className="text-[11px] text-[#86868B]">Contrat de prestation signé électroniquement{trainer.contract?.signedAt ? ` le ${new Date(trainer.contract.signedAt).toLocaleDateString('fr-FR')}` : ''}</p>}
              </div>
            </div>
          </div>

          <div className="px-8 py-4 bg-[#F5F5F7] flex items-center justify-between gap-3 no-print">
            <button onClick={print} className="text-[13px] text-[#1D1D1F] font-semibold underline">Télécharger / Imprimer</button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#1D1D1F] text-white text-[13px] font-semibold">Fermer</button>
          </div>
        </div>
      </div>
      <style>{`@media print { body * { visibility: hidden; } #bc-print, #bc-print * { visibility: visible; } #bc-print { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none; } }`}</style>
    </div>
  );
}

/**
 * Supports pédagogiques du cours (diaporama, exercices, ressources) servis depuis le
 * coffre-fort DD. Le téléchargement passe par une route authentifiée : on récupère le PDF en
 * blob avec le jeton du formateur plutôt que par un lien direct, qui serait non authentifié.
 * @author Rabah Ziane · 2026-07-20
 */
function MaterialsBlock({ s, auth }: { s: Session; auth: () => any }) {
  const [files, setFiles] = useState<{ name: string; size: number }[] | null>(null);
  const [busy, setBusy] = useState('');
  useEffect(() => {
    fetch(`/api/trainer/self/sessions/${s._id}/materials`, { headers: auth() })
      .then((r) => r.json()).then((j) => setFiles(j.ok ? j.files : []))
      .catch(() => setFiles([]));
  }, [s._id, auth]);

  const openFile = async (name: string) => {
    setBusy(name);
    try {
      const r = await fetch(`/api/trainer/self/sessions/${s._id}/materials/download?name=${encodeURIComponent(name)}`, { headers: auth() });
      if (!r.ok) return;
      const url = URL.createObjectURL(await r.blob());
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } finally { setBusy(''); }
  };

  if (!files || files.length === 0) return null;
  const mo = (n: number) => n > 1e6 ? `${(n / 1e6).toFixed(1)} Mo` : `${Math.round(n / 1e3)} Ko`;
  return (
    <div>
      <div className="text-[12px] uppercase tracking-wide text-white/40 font-semibold mb-2">Supports de cours</div>
      <div className="space-y-1.5">
        {files.map((f) => (
          <button key={f.name} onClick={() => openFile(f.name)} disabled={!!busy}
            className="w-full flex items-center gap-3 text-[13px] bg-[#0E0F13] hover:bg-white/5 rounded-lg px-3 py-2 text-left disabled:opacity-60">
            <FileText className="h-4 w-4 shrink-0" style={{ color: BLUE }} />
            <span className="font-medium truncate">{f.name.replace(/\.pdf$/i, '')}</span>
            <span className="text-white/40 text-[12px] ml-auto shrink-0">{busy === f.name ? 'ouverture…' : mo(f.size)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Une journée du cours, avec les exercices en situation de travail à envoyer dans le groupe
 * WhatsApp juste APRÈS l'heure de visio : les apprenants les réalisent ensuite sur leur poste.
 * Le message est prêt à coller (intitulé du jour + consignes numérotées).
 * @author Rabah Ziane · 2026-07-20
 */
function DayRow({ d, index, session }: { d: NonNullable<Session['days']>[number]; index: number; session: Session }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dayLabel = new Date(`${d.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const message = d.exercises ? buildExercisesMessage(d.exercises) : '';
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* refusé */ }
  };
  return (
    <div className="bg-[#0E0F13] rounded-lg px-3 py-2">
      <div className="flex items-center gap-3 text-[13px] flex-wrap">
        <span className="font-medium capitalize">{dayLabel}</span>
        <span className="text-white/70 inline-flex items-center gap-1"><Clock className="h-3 w-3" />{d.from} - {d.to}</span>
        <span className="text-white/45">{{ visio: 'Visioconférence', presentiel: 'Présentiel', afest: 'En situation de travail' }[d.mode || 'visio'] || d.mode}</span>
        {d.exercises && (
          <button onClick={() => setOpen((o) => !o)} className="ml-auto text-[12px] font-semibold inline-flex items-center gap-1" style={{ color: BLUE }}>
            <ListChecks className="h-3.5 w-3.5" /> Exercices du jour {index + 1}
          </button>
        )}
      </div>
      {open && d.exercises && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-[12px] text-white/45 mb-1.5">À envoyer dans le groupe WhatsApp dès la fin de la visio - les apprenants les réalisent en situation de travail.</p>
          <pre className="text-[12.5px] text-white/80 whitespace-pre-wrap font-sans mb-2">{d.exercises}</pre>
          <div className="flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"
              className="px-3.5 py-2 rounded-lg text-black text-[12.5px] font-semibold inline-flex items-center gap-1.5" style={{ background: '#25D366' }}>
              <MessageCircle className="h-3.5 w-3.5" /> Partager sur WhatsApp
            </a>
            <button onClick={copy} className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[12.5px] font-semibold inline-flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5" /> {copied ? 'Message copié' : 'Copier le message'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Salle de visioconférence PERMANENTE du formateur : l'adresse porte son nom et ne change
 * jamais, il peut donc la diffuser une fois pour toutes. Deux liens bien distincts :
 *  - le lien public, à partager aux apprenants ;
 *  - son lien animateur (?h=...), strictement personnel, qui lui donne le droit d'admettre
 *    les participants depuis la salle d'attente. S'il diffuse celui-là, n'importe qui devient
 *    animateur : d'où l'avertissement explicite.
 * @author Rabah Ziane · 2026-07-20
 */
function MyRoomTab({ trainer }: { trainer: Trainer }) {
  const [copied, setCopied] = useState<'public' | 'host' | null>(null);
  const copy = async (what: 'public' | 'host', text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 2000); } catch { /* refusé */ }
  };
  if (!trainer.visio) return <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5"><p className="text-[13px] text-white/50">Salle en cours de création, rechargez la page.</p></section>;
  const { link, hostLink } = trainer.visio;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
        <h2 className="text-[15px] font-bold mb-1 flex items-center gap-2"><Video className="h-4 w-4" style={{ color: BLUE }} /> Ma salle permanente</h2>
        <p className="text-[12.5px] text-white/55 mb-4">Votre adresse de réunion à votre nom. Elle ne change jamais : partagez-la une fois dans le groupe WhatsApp, elle servira pour toutes vos sessions.</p>

        <div className="rounded-xl bg-[#0E0F13] border border-white/10 p-3 mb-3">
          <div className="text-[11px] uppercase tracking-wide text-white/40 font-semibold mb-1">Lien à partager aux apprenants</div>
          <div className="text-[14px] font-semibold break-all mb-2" style={{ color: BLUE }}>{link}</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => copy('public', link)} className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[13px] font-semibold inline-flex items-center gap-1.5"><Copy className="h-3.5 w-3.5" /> {copied === 'public' ? 'Copié' : 'Copier le lien'}</button>
          </div>
        </div>

        <div className="rounded-xl border border-[#E5B567]/30 bg-[#E5B567]/5 p-3">
          <div className="text-[11px] uppercase tracking-wide text-[#E5B567] font-semibold mb-1">Votre accès animateur - à ne jamais partager</div>
          <p className="text-[12.5px] text-white/55 mb-2">Ouvrez toujours vos sessions avec CE lien : il vous identifie comme formateur et vous permet d'accepter les apprenants qui patientent en salle d'attente.</p>
          <div className="flex flex-wrap gap-2">
            <a href={hostLink} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-lg text-white text-[13px] font-semibold inline-flex items-center gap-1.5" style={{ background: BLUE }}><Video className="h-3.5 w-3.5" /> Ouvrir ma salle</a>
            <button onClick={() => copy('host', hostLink)} className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[13px] font-semibold inline-flex items-center gap-1.5"><Copy className="h-3.5 w-3.5" /> {copied === 'host' ? 'Copié' : 'Copier mon accès'}</button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
        <h3 className="text-[14px] font-bold mb-2">Comment ça marche</h3>
        <ol className="space-y-2 text-[13px] text-white/65 list-decimal pl-4">
          <li>Vous ouvrez la salle avec votre accès animateur, quelques minutes avant le cours.</li>
          <li>Les apprenants cliquent sur le lien public : ils arrivent en <span className="text-white/90 font-semibold">salle d'attente</span>, personne n'entre sans vous.</li>
          <li>Vous voyez leur nom s'afficher en haut de la salle et vous cliquez sur <span className="text-white/90 font-semibold">Admettre</span>.</li>
          <li>Pendant la session, vous pouvez partager votre écran et échanger par messages.</li>
        </ol>
      </section>
    </div>
  );
}

/**
 * Le formateur appelle le client avant la formation : si les dates bougent, il les reporte ici.
 * L'enregistrement remplace ses créneaux, réarme les rappels et envoie un email à Delivery
 * Digital avec l'avant / après et le motif.
 * @author Rabah Ziane · 2026-07-20
 */
function RescheduleBlock({ s, authJson, onChanged, startOpen }: { s: Session; authJson: () => any; onChanged: () => void; startOpen?: boolean }) {
  type Slot = { date: string; from: string; to: string; mode: string };
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Slot[]>([]);
  // Ouvert d'emblée quand l'étape « Confirmer les dates » l'appelle.
  useEffect(() => { if (startOpen && !open) start(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [startOpen]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(false);
  const start = () => {
    const base = (s.days || []).map((d) => ({ date: d.date, from: d.from, to: d.to, mode: d.mode || 'visio' }));
    setRows(base.length ? base : [{ date: s.sessionStart ? s.sessionStart.slice(0, 10) : '', from: '09:00', to: '10:00', mode: 'visio' }]);
    setErr(''); setDone(false); setOpen(true);
  };
  const set = (i: number, patch: Partial<Slot>) => setRows((p) => p.map((r, k) => k === i ? { ...r, ...patch } : r));
  const save = async () => {
    if (rows.some((r) => !r.date || r.from >= r.to)) { setErr('Vérifiez les dates et horaires (fin après début).'); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/trainer/self/sessions/${s._id}/reschedule`, { method: 'POST', headers: authJson(), body: JSON.stringify({ days: rows, reason }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) { setErr(j.error === 'session_closed' ? 'Ce cours n’est plus modifiable.' : 'Échec de l’enregistrement.'); return; }
      setDone(true); setOpen(false); onChanged();
    } catch { setErr('Réseau indisponible.'); }
    finally { setBusy(false); }
  };
  const inp = 'px-2.5 py-1.5 rounded-lg bg-[#0E0F13] border border-white/10 text-[13px] text-white outline-none';
  if (!open) return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={start} className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[13px] font-semibold inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Modifier les dates avec le client</button>
      {done && <span className="text-[12.5px] text-[#3DD68C] inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Delivery Digital a été informé</span>}
      {(s.reschedules || []).length > 0 && <span className="text-[12px] text-white/40">{(s.reschedules || []).length} modification{(s.reschedules || []).length > 1 ? 's' : ''} enregistrée{(s.reschedules || []).length > 1 ? 's' : ''}</span>}
    </div>
  );
  return (
    <div className="rounded-xl border border-white/10 bg-[#0E0F13] p-3 space-y-2">
      <div className="text-[13px] font-semibold">Nouvelles dates convenues avec le client</div>
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input type="date" value={r.date} onChange={(e) => set(i, { date: e.target.value })} className={inp} />
          <input type="time" value={r.from} onChange={(e) => set(i, { from: e.target.value })} className={inp} />
          <span className="text-[12px] text-white/40">→</span>
          <input type="time" value={r.to} onChange={(e) => set(i, { to: e.target.value })} className={inp} />
          <select value={r.mode} onChange={(e) => set(i, { mode: e.target.value })} className={inp}>
            <option value="visio" className="bg-[#181A20]">Visioconférence</option>
            <option value="presentiel" className="bg-[#181A20]">Présentiel</option>
            <option value="afest" className="bg-[#181A20]">Situation de travail</option>
          </select>
          <button onClick={() => setRows(rows.filter((_, k) => k !== i))} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8"><X className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      <button onClick={() => setRows([...rows, { ...(rows[rows.length - 1] || { from: '09:00', to: '10:00', mode: 'visio' }), date: '' }])} className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-[12.5px] font-semibold">+ Ajouter une journée</button>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif (ex : indisponibilité du client la semaine du 10)" className="w-full px-3 py-2 rounded-lg bg-[#181A20] border border-white/10 text-[13px] text-white placeholder-white/30 outline-none" />
      {err && <p className="text-[12.5px] text-[#FF6B6B]">{err}</p>}
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg text-white text-[13px] font-semibold disabled:opacity-60" style={{ background: BLUE }}>{busy ? '…' : 'Enregistrer et informer Delivery Digital'}</button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg bg-white/8 text-[13px] font-semibold">Annuler</button>
      </div>
    </div>
  );
}

/**
 * Salle de visioconférence du cours + message d'accueil pré-rédigé : le formateur copie le
 * message (lien inclus) et le colle dans le groupe WhatsApp des apprenants. Le jour J il
 * ouvre la salle depuis ce même bloc et y partage son écran.
 * @author Rabah Ziane · 2026-07-20
 */
function MeetingBlock({ s, trainerName }: { s: Session; trainerName: string }) {
  const [copied, setCopied] = useState<'link' | 'msg' | null>(null);
  // Le formateur entre par son lien animateur (droit d'admettre) ; les apprenants par le lien nu.
  const hostLink = s.hostKey ? `${s.meetingLink}${s.meetingLink?.includes('?') ? '&' : '?'}h=${s.hostKey}` : s.meetingLink;
  const copy = async (what: 'link' | 'msg', text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 2000); } catch { /* clipboard refusé */ }
  };
  const message = buildWelcomeMessage(s, trainerName);
  return (
    <div className="rounded-xl border border-[#0066CC]/30 bg-[#0066CC]/5 p-3">
      <div className="flex items-center gap-2 text-[13px] font-semibold mb-2"><Video className="h-4 w-4" style={{ color: BLUE }} /> Salle de visioconférence</div>
      <p className="text-[12.5px] text-white/55 mb-2">Partagez ce lien dans le groupe WhatsApp avec votre message d'accueil. Les apprenants patientent en salle d'attente : vous les admettez un par un. Le jour J, ouvrez la salle et partagez votre écran.</p>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <a href={hostLink} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-lg text-white text-[13px] font-semibold inline-flex items-center gap-1.5" style={{ background: BLUE }}><Video className="h-3.5 w-3.5" /> Ouvrir la salle</a>
        <button onClick={() => copy('link', s.meetingLink || '')} className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-[13px] font-semibold inline-flex items-center gap-1.5"><Copy className="h-3.5 w-3.5" /> {copied === 'link' ? 'Lien copié' : 'Copier le lien'}</button>
        <button onClick={() => copy('msg', message)} className="px-3.5 py-2 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-[13px] font-semibold inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> {copied === 'msg' ? 'Message copié' : "Copier le message d'accueil"}</button>
      </div>
      <p className="text-[11.5px] text-white/40 break-all">{s.meetingLink}</p>
    </div>
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
type Slot = { from: string; to: string };
type Unav = { id: string; day: string; kind: 'full' | 'am' | 'pm' | 'hours'; hours: Slot[]; label?: string };
const KIND_LABEL: Record<string, string> = { full: 'Journée entière', am: 'Matin', pm: 'Après-midi', hours: 'Créneaux' };
// Dispos récurrentes : jours de semaine (0=dim ... 6=sam) + créneaux d'1h sélectionnables. @Rabah 2026-06-19
const REC_WEEKDAYS: { n: number; l: string }[] = [{ n: 1, l: 'Lun' }, { n: 2, l: 'Mar' }, { n: 3, l: 'Mer' }, { n: 4, l: 'Jeu' }, { n: 5, l: 'Ven' }, { n: 6, l: 'Sam' }, { n: 0, l: 'Dim' }];
const REC_HOUR_SLOTS: Slot[] = Array.from({ length: 13 }, (_, i) => { const h = 8 + i; return { from: `${String(h).padStart(2, '0')}:00`, to: `${String(h + 1).padStart(2, '0')}:00` }; }); // 8h-9h ... 20h-21h
const slotKey = (s: Slot) => `${s.from}-${s.to}`;
const slotShort = (s: Slot) => `${parseInt(s.from, 10)}h-${parseInt(s.to, 10)}h`;
function unavSummary(u: Unav) {
  if (u.kind === 'hours') return (u.hours || []).map((h) => `${h.from}-${h.to}`).join(', ') || 'Créneaux';
  return KIND_LABEL[u.kind] || 'Journée entière';
}

function DispoTab({ auth, authJson, trainer, onChanged }: { auth: () => any; authJson: () => any; trainer: Trainer; onChanged: () => void }) {
  const [days, setDays] = useState<Unav[]>([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [editDay, setEditDay] = useState<{ iso: string; current: Unav | null } | null>(null);
  // Dispos récurrentes (jours + créneaux d'1h). @Rabah 2026-06-19
  const [recDays, setRecDays] = useState<number[]>(trainer.recurringAvailability?.days || []);
  const [recSlots, setRecSlots] = useState<Slot[]>(trainer.recurringAvailability?.slots || []);
  const [savingRec, setSavingRec] = useState(false);
  const [recSaved, setRecSaved] = useState(false);
  const toggleRecDay = (n: number) => setRecDays((d) => d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort((a, b) => a - b));
  const toggleRecSlot = (s: Slot) => setRecSlots((arr) => arr.some((x) => slotKey(x) === slotKey(s)) ? arr.filter((x) => slotKey(x) !== slotKey(s)) : [...arr, s].sort((a, b) => a.from.localeCompare(b.from)));
  const saveRec = async () => {
    setSavingRec(true); setRecSaved(false);
    try {
      const r = await fetch('/api/trainer/self/recurring-availability', { method: 'PUT', headers: authJson(), body: JSON.stringify({ days: recDays, slots: recSlots }) });
      const j = await r.json();
      if (j.ok) { setRecSaved(true); onChanged(); } else alert('Erreur : ' + (j.error || 'enregistrement impossible'));
    } finally { setSavingRec(false); }
  };
  const load = useCallback(async () => {
    const j = await fetch('/api/trainer/self/available-days', { headers: auth() }).then((r) => r.json());
    setDays((j.days || []).map((d: any) => ({ ...d, kind: d.kind || 'full', hours: d.hours || [] })));
  }, [auth]);
  useEffect(() => { load(); }, [load]);
  const byDay = useMemo(() => { const m: Record<string, Unav> = {}; days.forEach((d) => { m[d.day] = d; }); return m; }, [days]);

  const save = async (iso: string, kind: Unav['kind'], hours: Slot[]) => {
    await fetch('/api/trainer/self/available-days', { method: 'POST', headers: authJson(), body: JSON.stringify({ day: iso, kind, hours }) });
    await load();
  };
  const remove = async (id: string) => { await fetch(`/api/trainer/self/available-days/${id}`, { method: 'DELETE', headers: auth() }); await load(); };

  // grille du mois
  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = (first.getDay() + 6) % 7; // lundi=0
  const nbDays = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: nbDays }, (_, i) => i + 1)];
  const monthName = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const iso = (d: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayIso = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      {/* Disponibilités récurrentes : jours de semaine + créneaux d'1h. @Rabah 2026-06-19 */}
      <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
        <h2 className="text-[15px] font-bold">Mes disponibilités récurrentes</h2>
        <p className="text-[12.5px] text-white/55 mt-1 mb-4">Indiquez les jours et les créneaux d'1h où vous pouvez animer une visioconférence. C'est sur cette base que les sessions vous sont proposées.</p>
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/45 mb-2">Jours</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {REC_WEEKDAYS.map((d) => (
            <button key={d.n} type="button" onClick={() => toggleRecDay(d.n)} className={`px-3 py-1.5 rounded-lg border text-[12.5px] font-semibold transition ${recDays.includes(d.n) ? 'border-[#3DD68C] bg-[#3DD68C]/15 text-[#3DD68C]' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'}`}>{d.l}</button>
          ))}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/45 mb-2">Créneaux d'1h</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {REC_HOUR_SLOTS.map((s) => (
            <button key={slotKey(s)} type="button" onClick={() => toggleRecSlot(s)} className={`px-3 py-1.5 rounded-lg border text-[12px] transition ${recSlots.some((x) => slotKey(x) === slotKey(s)) ? 'border-[#3DD68C] bg-[#3DD68C]/15 text-[#3DD68C]' : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'}`}>{slotShort(s)}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveRec} disabled={savingRec} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED] disabled:opacity-60">{savingRec ? 'Enregistrement…' : 'Enregistrer mes créneaux'}</button>
          {recSaved && !savingRec && <span className="text-[12px] text-[#3DD68C]">Créneaux enregistrés ✓</span>}
          <span className="text-[11.5px] text-white/40">{recDays.length} jour(s) · {recSlots.length} créneau(x)</span>
        </div>
      </section>
      <RemindersCard trainer={trainer} authJson={authJson} onChanged={onChanged} />
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
        <p className="text-[12.5px] text-white/55 mb-3">Cliquez sur un jour pour déclarer que vous êtes <span className="text-white/80 font-semibold">disponible</span> : journée entière, matin, après-midi ou créneaux horaires précis. <span className="text-white/80 font-semibold">On ne vous assigne des cours que sur les jours déclarés.</span></p>
        {/* légende */}
        <div className="flex items-center gap-3 mb-4 text-[11px] text-white/55 flex-wrap">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#3DD68C]" /> Journée entière</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-gradient-to-b from-[#3DD68C] from-50% to-[#0E0F13] to-50%" /> Matin</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-gradient-to-t from-[#3DD68C] from-50% to-[#0E0F13] to-50%" /> Après-midi</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#E5B567]" /> Créneaux horaires</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-[11px] text-white/40 font-semibold py-1">{d}</div>)}
          {cells.map((c, i) => {
            if (c == null) return <div key={i} />;
            const dayIso = iso(c);
            const u = byDay[dayIso];
            const isPast = dayIso < todayIso;
            let bg = 'bg-[#0E0F13] hover:bg-white/10 text-white/80';
            if (u?.kind === 'full') bg = 'bg-[#3DD68C] text-black font-semibold';
            else if (u?.kind === 'am') bg = 'text-white';
            else if (u?.kind === 'pm') bg = 'text-white';
            else if (u?.kind === 'hours') bg = 'bg-[#E5B567]/15 text-white border border-[#E5B567]/40';
            return (
              <button key={i} disabled={isPast} onClick={() => setEditDay({ iso: dayIso, current: u || null })}
                className={`relative aspect-square rounded-lg text-[13px] font-medium overflow-hidden transition-colors ${isPast ? 'text-white/20 cursor-not-allowed bg-[#0E0F13]' : bg}`}>
                {u?.kind === 'am' && <span className="absolute inset-x-0 top-0 h-1/2 bg-[#3DD68C]" />}
                {u?.kind === 'pm' && <span className="absolute inset-x-0 bottom-0 h-1/2 bg-[#3DD68C]" />}
                <span className="relative z-10">{c}</span>
                {u?.kind === 'hours' && <span className="absolute bottom-0.5 inset-x-0 text-[8px] leading-none text-[#E5B567] font-semibold z-10">{(u.hours || []).length}h</span>}
              </button>
            );
          })}
        </div>
      </section>
      <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
        <h3 className="text-[14px] font-bold mb-3">Mes jours déclarés</h3>
        {days.length === 0 ? <p className="text-[13px] text-[#E5B567]">Aucune disponibilité déclarée. Tant que votre calendrier est vide, aucun cours ne peut vous être assigné.</p> : (
          <div className="space-y-1.5 max-h-[420px] overflow-auto">
            {[...days].sort((a, b) => a.day.localeCompare(b.day)).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 text-[13px] bg-[#0E0F13] rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium">{fmtDay(d.day)}</div>
                  <div className="text-[11.5px] text-white/45">{unavSummary(d)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setEditDay({ iso: d.day, current: d })} className="text-white/50 text-[12px] hover:text-white">Modifier</button>
                  <button onClick={() => remove(d.id)} className="text-[#FF6B6B] text-[12px] hover:underline">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {editDay && <DayAvailabilityModal iso={editDay.iso} current={editDay.current} onClose={() => setEditDay(null)} onSave={async (k, h) => { await save(editDay.iso, k, h); setEditDay(null); }} onRemove={editDay.current ? async () => { await remove(editDay.current!.id); setEditDay(null); } : undefined} />}
      </div>
    </div>
  );
}

const WEEK_DAYS: [number, string][] = [[1, 'lundi'], [2, 'mardi'], [3, 'mercredi'], [4, 'jeudi'], [5, 'vendredi'], [6, 'samedi'], [0, 'dimanche']];
function RemindersCard({ trainer, authJson, onChanged }: { trainer: Trainer; authJson: () => any; onChanged: () => void }) {
  const rp = trainer.reminderPrefs || {};
  const [prefs, setPrefs] = useState({
    course48: rp.course48 !== false, course24: rp.course24 !== false, course1: rp.course1 !== false,
    weeklyAvailability: rp.weeklyAvailability !== false,
    weeklyDay: rp.weeklyDay != null ? rp.weeklyDay : 5,
    weeklyHour: rp.weeklyHour != null ? rp.weeklyHour : 10,
  });
  const [saving, setSaving] = useState(false);
  const update = async (next: typeof prefs) => {
    setPrefs(next); setSaving(true);
    try { await fetch('/api/trainer/self/reminder-prefs', { method: 'POST', headers: authJson(), body: JSON.stringify(next) }); onChanged(); } finally { setSaving(false); }
  };
  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-[#3DD68C]' : 'bg-white/15'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
  const Row = ({ k, title, desc }: { k: 'course48' | 'course24' | 'course1'; title: string; desc: string }) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0"><div className="text-[13.5px] font-medium">{title}</div><div className="text-[12px] text-white/45">{desc}</div></div>
      <Toggle on={prefs[k]} onClick={() => update({ ...prefs, [k]: !prefs[k] })} />
    </div>
  );
  const dayName = (WEEK_DAYS.find(([v]) => v === prefs.weeklyDay) || [5, 'vendredi'])[1];
  const sel = 'px-2.5 py-1.5 rounded-lg bg-[#0E0F13] border border-white/10 text-[13px] text-white outline-none';
  return (
    <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
      <div className="flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4" style={{ color: BLUE }} /><h2 className="text-[15px] font-bold">Mes rappels</h2>{saving && <span className="text-[11px] text-white/40">enregistrement…</span>}</div>
      <p className="text-[12.5px] text-white/55 mb-2">Choisissez les rappels que vous souhaitez recevoir par email.</p>
      <div className="divide-y divide-white/5">
        <Row k="course48" title="Rappel 48h avant un cours" desc="2 jours avant le début de la session" />
        <Row k="course24" title="Rappel 24h avant un cours" desc="La veille de la session" />
        <Row k="course1" title="Rappel 1h avant un cours" desc="Juste avant le début" />
        <div className="py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><div className="text-[13.5px] font-medium">Rappel des disponibilités</div><div className="text-[12px] text-white/45">Chaque {dayName} à {String(prefs.weeklyHour).padStart(2, '0')}h, pour la semaine suivante</div></div>
            <Toggle on={prefs.weeklyAvailability} onClick={() => update({ ...prefs, weeklyAvailability: !prefs.weeklyAvailability })} />
          </div>
          {prefs.weeklyAvailability && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-[12px] text-white/45">Quand :</span>
              <select className={sel} value={prefs.weeklyDay} onChange={(e) => update({ ...prefs, weeklyDay: Number(e.target.value) })}>
                {WEEK_DAYS.map(([v, n]) => <option key={v} value={v} className="bg-[#181A20] capitalize">{n}</option>)}
              </select>
              <span className="text-[12px] text-white/45">à</span>
              <select className={sel} value={prefs.weeklyHour} onChange={(e) => update({ ...prefs, weeklyHour: Number(e.target.value) })}>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h} className="bg-[#181A20]">{String(h).padStart(2, '0')}:00</option>)}
              </select>
              <span className="text-[11px] text-white/35">(heure de Paris)</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DayAvailabilityModal({ iso, current, onClose, onSave, onRemove }: { iso: string; current: Unav | null; onClose: () => void; onSave: (kind: Unav['kind'], hours: Slot[]) => void | Promise<void>; onRemove?: () => void | Promise<void> }) {
  const [kind, setKind] = useState<Unav['kind']>(current?.kind || 'full');
  const [hours, setHours] = useState<Slot[]>(current?.hours?.length ? current.hours : [{ from: '09:00', to: '12:00' }]);
  const [busy, setBusy] = useState(false);
  const label = new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const opts: { k: Unav['kind']; t: string; d: string }[] = [
    { k: 'full', t: 'Journée entière', d: 'Indisponible toute la journée' },
    { k: 'am', t: 'Matin', d: 'Indisponible le matin' },
    { k: 'pm', t: 'Après-midi', d: "Indisponible l'après-midi" },
    { k: 'hours', t: 'Créneaux horaires', d: 'Choisir des plages précises' },
  ];
  const save = async () => {
    setBusy(true);
    try {
      const h = kind === 'hours' ? hours.filter((s) => s.from && s.to && s.from < s.to) : [];
      await onSave(kind, h);
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#181A20] border border-white/10 rounded-2xl w-full max-w-[420px] p-5 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold capitalize">{label}</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white text-[18px] leading-none">×</button>
        </div>
        <div className="space-y-2 mb-4">
          {opts.map((o) => (
            <button key={o.k} onClick={() => setKind(o.k)} className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors ${kind === o.k ? 'border-[#0066CC] bg-[#0066CC]/10' : 'border-white/10 bg-[#0E0F13] hover:border-white/25'}`}>
              <div className="text-[14px] font-semibold flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full border-2 ${kind === o.k ? 'border-[#0066CC] bg-[#0066CC]' : 'border-white/30'}`} />
                {o.t}
              </div>
              <div className="text-[12px] text-white/45 ml-5.5">{o.d}</div>
            </button>
          ))}
        </div>
        {kind === 'hours' && (
          <div className="mb-4 space-y-2">
            {hours.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="time" value={s.from} onChange={(e) => setHours((hs) => hs.map((x, j) => j === i ? { ...x, from: e.target.value } : x))} className="flex-1 px-3 py-2 rounded-lg bg-[#0E0F13] border border-white/10 text-[14px] text-white outline-none" />
                <span className="text-white/40 text-[13px]">→</span>
                <input type="time" value={s.to} onChange={(e) => setHours((hs) => hs.map((x, j) => j === i ? { ...x, to: e.target.value } : x))} className="flex-1 px-3 py-2 rounded-lg bg-[#0E0F13] border border-white/10 text-[14px] text-white outline-none" />
                {hours.length > 1 && <button onClick={() => setHours((hs) => hs.filter((_, j) => j !== i))} className="text-[#FF6B6B] text-[13px] px-1">×</button>}
              </div>
            ))}
            {hours.length < 6 && <button onClick={() => setHours((hs) => [...hs, { from: '14:00', to: '17:00' }])} className="text-[12.5px] text-[#0066CC] hover:underline">+ Ajouter un créneau</button>}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          {onRemove ? <button onClick={onRemove} className="text-[13px] text-[#FF6B6B] hover:underline">Rendre disponible</button> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-full text-[13px] text-white/55">Annuler</button>
            <button onClick={save} disabled={busy} className="px-5 py-2 rounded-full text-white text-[13px] font-semibold disabled:opacity-60" style={{ background: BLUE }}>{busy ? '…' : 'Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ Mes formations ============================ */
function FormationsTab({ trainer, auth }: { trainer: Trainer; auth: () => any }) {
  const [formations, setFormations] = useState<Formation[] | null>(null);
  const [detail, setDetail] = useState<Formation | null>(null);
  useEffect(() => { (async () => { const j = await fetch('/api/trainer/self/my-formations', { headers: auth() }).then((r) => r.json()); setFormations(j.formations || []); })(); }, [auth]);
  if (!formations) return <Loading />;
  if (!formations.length) return <Empty icon={<GraduationCap className="h-7 w-7" />} text="Aucune formation rattachée pour l'instant. Delivery Digital vous rattachera aux formations correspondant à vos compétences." />;
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        {formations.map((f) => (
          <button key={f._id} onClick={() => setDetail(f)} className="text-left rounded-2xl bg-[#181A20] border border-white/10 p-5 hover:border-white/25 transition-colors">
            <div className="flex items-center gap-2 mb-2"><GraduationCap className="h-4 w-4" style={{ color: BLUE }} /><h3 className="text-[15px] font-semibold">{f.title}</h3></div>
            {f.description && <p className="text-[13px] text-white/55 leading-relaxed line-clamp-3">{f.description}</p>}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[12px] text-white/50">
                {f.duration_hours ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{f.duration_hours} h</span> : null}
                {trainer.hourlyRate ? <span className="inline-flex items-center gap-1"><BadgeEuro className="h-3.5 w-3.5" />{euro((f.duration_hours || 0) * trainer.hourlyRate)} / session</span> : null}
              </div>
              <span className="text-[12px] font-semibold inline-flex items-center gap-1" style={{ color: BLUE }}>Voir le détail <ArrowRight className="h-3.5 w-3.5" /></span>
            </div>
          </button>
        ))}
      </div>
      {detail && <FormationDetailModal f={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

function FormationDetailModal({ f, onClose }: { f: Formation; onClose: () => void }) {
  // PDF programme : document en base sinon mapping par mots-clés (seuls 2 PDF existent).
  const docPdf = (f.documents || []).find((d) => d.file_path && /\.pdf$/i.test(d.file_path));
  const t = `${f.title || ''} ${f.program_id || ''}`.toLowerCase();
  let pdfUrl: string | null = docPdf?.file_path || null;
  if (!pdfUrl) {
    if (/allerg|nutrition/.test(t)) pdfUrl = '/uploads/formations/programme-nutrition-allergenes.pdf';
    else if (/hygi|s[ée]cur/.test(t)) pdfUrl = '/uploads/formations/programme-hygiene-securite-dd.pdf';
  }
  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5"><h3 className="text-[14px] font-bold text-[#1D1D1F]">{title}</h3><div className="mt-2 text-[13px] text-[#3a3a3c] leading-relaxed">{children}</div></div>
  );
  const Bullets = ({ items }: { items: string[] }) => (
    <ul className="space-y-1.5">{items.map((it, i) => <li key={i} className="flex gap-2"><span className="text-[#86868B] mt-[1px]">•</span><span>{it}</span></li>)}</ul>
  );
  const meta: Array<[string, string]> = [
    ['Durée', `${f.duration_hours || 0}h`],
    ['Prix', f.price != null ? `${f.price} €` : '-'],
    ['Participants max', String(f.max_participants || 12)],
    ["Délai d'accès", f.access_delay || '1 semaine'],
    ['Certification', f.certification_type || 'Attestation de formation'],
  ];
  const ind: Array<[string, number]> = [
    ['Satisfaction', f.satisfaction_rate || 96],
    ['Réussite', f.success_rate || 100],
    ['Recommandation', f.recommendation_rate || 100],
    ['Présence', f.attendance_rate || 100],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-4xl my-6 bg-white text-[#1D1D1F] rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-black/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              {f.category && <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#86868B]">{f.category}</p>}
              <h2 className="text-[22px] sm:text-[26px] font-extrabold leading-tight mt-1.5 pr-6">{f.title}</h2>
              <div className="flex flex-wrap gap-2 mt-3">
                {f.level && <span className="px-3 py-1 rounded-full border border-black/10 text-[12px] capitalize">{f.level}</span>}
                {f.opco_eligible && <span className="px-3 py-1 rounded-full border border-black/10 text-[12px]">OPCO Éligible</span>}
              </div>
            </div>
            <button onClick={onClose} className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-black/[0.05] text-[#86868B]"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="px-6 sm:px-8 py-6 max-h-[72vh] overflow-y-auto grid lg:grid-cols-[1fr_300px] gap-6 bg-[#fbfbfd]">
          <div className="space-y-4 order-2 lg:order-1">
            {f.description && <Card title="Description"><p>{f.description}</p></Card>}
            {f.target_audience && <Card title="Public visé"><p>{f.target_audience}</p></Card>}
            {!!(f.objectives && f.objectives.length) && <Card title="Objectifs pédagogiques"><Bullets items={f.objectives} /></Card>}
            {!!(f.training_modalities && f.training_modalities.length) && <Card title="Modalités de la formation"><Bullets items={f.training_modalities} /></Card>}
            {!!(f.methods && f.methods.length) && <Card title="Méthodes mobilisées"><Bullets items={f.methods} /></Card>}
            {!!(f.evaluation_methods && f.evaluation_methods.length) && <Card title="Méthodes d'évaluation"><Bullets items={f.evaluation_methods} /></Card>}
            {!!(f.modules && f.modules.length) && (
              <Card title="Modules de formation">
                <div className="space-y-2.5">
                  {f.modules.map((m, i) => (
                    <div key={i} className="rounded-xl bg-black/[0.03] p-3.5">
                      <div className="flex items-center justify-between gap-2"><p className="font-semibold text-[13px] text-[#1D1D1F]">{m.title}</p>{m.duration_hours ? <span className="text-[12px] text-[#86868B] flex-shrink-0">{m.duration_hours}h</span> : null}</div>
                      {!!(m.topics && m.topics.length) && <ul className="mt-1.5 space-y-1">{m.topics.map((p, j) => <li key={j} className="flex gap-2 text-[12.5px]"><span className="text-[#86868B]">-</span><span>{p}</span></li>)}</ul>}
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {f.prerequisites && <Card title="Prérequis"><p>{f.prerequisites}</p></Card>}
            {f.accessibility_info && <Card title="Accessibilité"><p>{f.accessibility_info}</p></Card>}
            {pdfUrl && (
              <Card title="Documents">
                <a href={pdfUrl} target="_blank" rel="noreferrer" download className="flex items-center gap-3 rounded-xl border border-black/[0.08] px-3.5 py-3 hover:bg-black/[0.02] transition">
                  <span className="inline-flex h-9 w-9 rounded-lg bg-[#0066CC]/10 text-[#0066CC] items-center justify-center"><FileText className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold text-[13px] text-[#1D1D1F]">Programme détaillé</span><span className="block text-[11.5px] text-[#86868B]">PDF - Contenu complet</span></span>
                  <Download className="h-4 w-4 text-[#86868B]" />
                </a>
              </Card>
            )}
          </div>
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-0 rounded-2xl border border-black/[0.06] bg-white p-5">
              <div className="divide-y divide-black/[0.06]">
                {meta.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2 text-[12.5px]"><span className="text-[#86868B]">{k}</span><span className="font-semibold text-[#1D1D1F] text-right">{v}</span></div>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#86868B] mt-4 mb-2">Indicateurs</p>
              <div className="space-y-2.5">
                {ind.map(([k, v]) => (
                  <div key={k}>
                    <div className="flex items-center justify-between text-[12px]"><span className="text-[#3a3a3c]">{k}</span><span className="font-semibold">{v}%</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden"><div className="h-full bg-[#0066CC]" style={{ width: `${v}%` }} /></div>
                  </div>
                ))}
              </div>
              {pdfUrl && <a href={pdfUrl} target="_blank" rel="noreferrer" download className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1D1D1F] text-white text-[13px] font-semibold hover:bg-black"><Download className="h-4 w-4" /> Télécharger le programme</a>}
            </div>
          </div>
        </div>
      </div>
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
function ProfilTab({ trainer, authJson, auth, onChanged }: { trainer: Trainer; authJson: () => any; auth: () => any; onChanged: () => void }) {
  return (
    <div className="space-y-4">
      <PhoneForm trainer={trainer} authJson={authJson} onChanged={onChanged} />
      <CompanyForm trainer={trainer} authJson={authJson} onChanged={onChanged} />
      <RibForm trainer={trainer} authJson={authJson} onChanged={onChanged} />
      <ContractForm trainer={trainer} authJson={authJson} onChanged={onChanged} />
    </div>
  );
}

/**
 * Numéro WhatsApp du formateur dans son profil : c'est avec ce numéro que le responsable
 * pédagogique l'ajoute au groupe des apprenants, donc il doit pouvoir le corriger seul.
 * @author Rabah Ziane · 2026-07-20
 */
function PhoneForm({ trainer, authJson, onChanged }: { trainer: Trainer; authJson: () => any; onChanged: () => void }) {
  const [phone, setPhone] = useState(trainer.phone || '');
  const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  const save = async () => { setBusy(true); try { await fetch('/api/trainer/self/phone', { method: 'POST', headers: authJson(), body: JSON.stringify({ phone }) }); setSaved(true); onChanged(); setTimeout(() => setSaved(false), 2000); } finally { setBusy(false); } };
  const inp = 'w-full px-3 py-2.5 rounded-xl bg-[#0E0F13] border border-white/10 text-[14px] text-white placeholder-white/30 outline-none';
  return (
    <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
      <h2 className="text-[15px] font-bold mb-1 flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: BLUE }} /> Numéro WhatsApp</h2>
      <p className="text-[12.5px] text-white/55 mb-4">Le responsable pédagogique vous ajoute au groupe des apprenants avec ce numéro. Gardez-le à jour.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Téléphone / WhatsApp"><input className={inp} value={phone} placeholder="+33 6 12 34 56 78" onChange={(e) => setPhone(e.target.value)} /></Field>
      </div>
      <button onClick={save} disabled={busy} className="mt-4 px-5 py-2.5 rounded-full text-white text-[14px] font-semibold disabled:opacity-60" style={{ background: BLUE }}>{busy ? '…' : saved ? '✓ Enregistré' : 'Enregistrer'}</button>
    </section>
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
  const hasCompany = !!(trainer.companyInfo && trainer.companyInfo.legalName);
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
      <h2 className="text-[15px] font-bold mb-1 flex items-center gap-2"><FileSignature className="h-4 w-4" style={{ color: BLUE }} /> Contrat de prestation
        {signed && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#3DD68C]/15 text-[#3DD68C]">{trainer.contract?.validated ? 'Validé' : 'Signé'}</span>}</h2>
      {signed ? (
        <div className="mt-2">
          <p className="text-[13px] text-white/60 mb-3">Signé par {trainer.contract?.signedBy} ({trainer.contract?.signedFunction}) le {trainer.contract?.signedAt ? new Date(trainer.contract.signedAt).toLocaleDateString('fr-FR') : ''}.{trainer.contract?.validated ? ' Validé par Delivery Digital.' : ' En attente de validation Delivery Digital.'}</p>
          <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-full bg-white/8 hover:bg-white/12 text-[13px] font-semibold inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> Voir le contrat</button>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-[13px] text-white/55 mb-3">Lisez le contrat de prestation et signez-le en ligne (votre tampon est généré automatiquement depuis vos informations).</p>
          {!hasCompany && <p className="text-[12.5px] text-[#E5B567] mb-3 inline-flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> Renseignez d'abord vos informations pour générer le tampon.</p>}
          <button onClick={() => setOpen(true)} className="px-5 py-2.5 rounded-full text-white text-[14px] font-semibold" style={{ background: BLUE }}>Lire et signer le contrat</button>
        </div>
      )}
      {open && <TrainerContractModal trainer={trainer} authJson={authJson} onClose={() => setOpen(false)} onSigned={() => { setOpen(false); onChanged(); }} />}
    </section>
  );
}

function TrainerStamp({ trainer }: { trainer: Trainer }) {
  const ci = trainer.companyInfo || {};
  const name = ci.legalName || trainer.name;
  const loc = [ci.postalCode, ci.city].filter(Boolean).join(' ');
  const signedDate = trainer.contract?.signedAt ? new Date(trainer.contract.signedAt).toLocaleDateString('fr-FR') : null;
  return (
    <div className="inline-block -rotate-[7deg] select-none" style={{ color: '#1d4ed8' }}>
      <div className="rounded-md border-2 px-3 py-2 text-center" style={{ borderColor: '#1d4ed8', boxShadow: 'inset 0 0 0 1px rgba(29,78,216,0.25)' }}>
        <p className="text-[8px] font-bold uppercase tracking-[0.15em] opacity-70">Cachet du formateur</p>
        <p className="text-[12px] font-extrabold uppercase leading-tight mt-0.5">{name}</p>
        {ci.regNumber && <p className="text-[8px] font-semibold mt-0.5">SIRET / N° {ci.regNumber}</p>}
        {loc && <p className="text-[8px] font-medium">{loc}{ci.country ? ` · ${ci.country}` : ''}</p>}
        {trainer.contract?.signed
          ? <p className="text-[7.5px] font-bold uppercase tracking-wide mt-1 border-t border-[#1d4ed8]/40 pt-0.5">Signé électroniquement{signedDate ? ` le ${signedDate}` : ''}</p>
          : <p className="text-[7.5px] font-bold uppercase tracking-wide mt-1 border-t border-[#1d4ed8]/40 pt-0.5 opacity-60">Aperçu - non signé</p>}
      </div>
    </div>
  );
}

// Contrat de prestation formateur : feuille A4 complète + signature électronique + tampon auto.
// Même visuel/principe que le contrat agence, adapté au formateur. @author Rabah Ziane · 2026-06-07
function TrainerContractModal({ trainer, authJson, onClose, onSigned }: { trainer: Trainer; authJson: () => any; onClose: () => void; onSigned: () => void }) {
  const ci = trainer.companyInfo || {};
  const who = ci.legalName || trainer.name;
  const addr = [ci.address, [ci.postalCode, ci.city].filter(Boolean).join(' '), ci.country].filter(Boolean).join(', ');
  const rep = [ci.repName, ci.repFunction].filter(Boolean).join(', ');
  const signed = !!trainer.contract?.signed;
  const today = new Date().toLocaleDateString('fr-FR');
  const [signFunction, setSignFunction] = useState(trainer.contract?.signedFunction || 'Formateur');
  const [signing, setSigning] = useState(false);
  const rate = trainer.hourlyRate ? `${trainer.hourlyRate} €/h` : 'au taux horaire négocié';
  const sign = async () => {
    setSigning(true);
    try { await fetch('/api/trainer/self/contract/sign', { method: 'POST', headers: authJson(), body: JSON.stringify({ signedBy: ci.repName || trainer.name, signedFunction: signFunction }) }); onSigned(); }
    finally { setSigning(false); }
  };
  const C = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <div className="mt-4"><p className="font-bold text-[12.5px]">Article {n} - {title}</p><p className="text-[12px] leading-relaxed text-[#3a3a3c] mt-1">{children}</p></div>
  );
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-3xl my-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-white text-[13px] font-semibold inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> Contrat de prestation de formation</p>
          <div className="flex items-center gap-2 no-print">
            {/* Le contrat signé doit pouvoir être conservé par le formateur. @Rabah 2026-07-20 */}
            {signed && <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[12.5px] font-semibold"><Download className="h-3.5 w-3.5" /> Télécharger / Imprimer</button>}
            <button onClick={onClose} className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white"><X className="h-4 w-4" /></button>
          </div>
        </div>
        {/* Feuille du contrat (id ciblé par l'impression pour un PDF propre) */}
        <div id="contrat-print" className="bg-white text-[#1D1D1F] rounded-xl shadow-2xl px-8 py-8 sm:px-12 sm:py-10">
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[#86868B] font-bold">Delivery Digital</p><h1 className="text-[18px] font-extrabold mt-1">Contrat de prestation de formation</h1><p className="text-[11.5px] text-[#86868B]">Formateur indépendant - organisme certifié QUALIOPI</p></div>
            <img src={LOGO_URL} alt="Delivery Digital" className="h-9 w-auto" />
          </div>

          <div className="mt-5 text-[12px] leading-relaxed text-[#3a3a3c]">
            <p className="font-bold text-[12.5px] text-[#1D1D1F]">Entre les soussignés :</p>
            <p className="mt-1.5"><strong>Delivery Digital</strong>, organisme de formation, ci-après « la Société », d&apos;une part,</p>
            <p className="mt-1.5">Et <strong>{who}</strong>{ci.regNumber ? `, immatriculé(e) sous le n° ${ci.regNumber}` : ''}{addr ? `, dont le siège est situé ${addr}` : ''}{rep ? `, représenté(e) par ${rep}` : ''}, ci-après « le Formateur », d&apos;autre part.</p>
          </div>

          <C n={1} title="Objet">Le présent contrat définit les conditions dans lesquelles le Formateur anime, pour le compte de la Société, les sessions de formation qui lui sont confiées.</C>
          <C n={2} title="Mission du Formateur">Le Formateur anime les sessions qui lui sont assignées dans le respect des <strong>programmes pédagogiques</strong>, du <strong>référentiel QUALIOPI</strong> et des <strong>plannings communiqués</strong>. Il s&apos;engage à assurer la qualité pédagogique, à émarger les présences et à transmettre les éléments d&apos;évaluation des apprenants.</C>
          <C n={3} title="Rémunération">La rémunération du Formateur est fixée <strong>{rate}</strong>. Elle est <strong>versée après réalisation effective de chaque session</strong>, sur présentation de facture, par virement sur le compte bancaire renseigné par le Formateur.</C>
          <C n={4} title="Versement">Les versements sont effectués sur le RIB validé du Formateur. La Société tient à jour, dans l&apos;espace formateur, l&apos;état des sessions et l&apos;historique des paiements.</C>
          <C n={5} title="Durée">Le contrat prend effet à sa signature électronique pour une durée d&apos;<strong>un (1) an</strong>, renouvelable par tacite reconduction. Chaque partie peut y mettre fin moyennant un préavis écrit de <strong>trente (30) jours</strong>, sans incidence sur les prestations déjà réalisées.</C>
          <C n={6} title="Confidentialité et données">Le Formateur s&apos;engage à préserver la confidentialité des informations échangées et à traiter les données personnelles des apprenants conformément au RGPD.</C>
          <C n={7} title="Liberté d&apos;exercice et propriété de la clientèle">Le Formateur <strong>reste libre d&apos;exercer son activité pour d&apos;autres organismes de formation</strong> : le présent contrat n&apos;emporte aucune exclusivité d&apos;activité ni interdiction de concurrence. En revanche, les <strong>clients, prospects et apprenants de Delivery Digital sont et demeurent la clientèle exclusive de la Société</strong>. <strong>Sans limitation de durée</strong>, et en dehors des sessions qui lui sont confiées par la Société, le Formateur n&apos;est <strong>pas autorisé à les contacter, solliciter ou démarcher</strong>, à quelque titre et sous quelque forme que ce soit, ni directement ni par personne interposée. Lors de ses interventions, il se présente <strong>exclusivement au nom de Delivery Digital</strong>.</C>
          <C n={8} title="Supports, méthodes et propriété intellectuelle">L&apos;ensemble des <strong>supports pédagogiques</strong> (diaporamas, exercices, ressources, trames, fiches, évaluations) ainsi que les <strong>méthodes de travail</strong>, procédures, outils et savoir-faire de Delivery Digital demeurent sa <strong>propriété exclusive</strong>. Le Formateur s&apos;interdit, <strong>sans limitation de durée</strong> et sauf <strong>autorisation écrite préalable</strong> de Delivery Digital, de les reproduire, diffuser, partager, publier, adapter, commercialiser ou les utiliser <strong>en dehors des sessions confiées par la Société et en dehors de ses clients</strong>. Toute utilisation non autorisée engage sa responsabilité et pourra donner lieu à réparation.</C>
          <C n={9} title="Indépendance">Le Formateur agit en toute indépendance. Le présent contrat ne crée aucun lien de subordination ni société de fait entre les parties.</C>
          <C n={10} title="Validation">La signature électronique du Formateur est soumise à la validation de Delivery Digital, qui vérifie ses informations, son RIB et le présent contrat avant activation du compte.</C>

          {/* Blocs de signature */}
          <div className="mt-8 grid sm:grid-cols-2 gap-6 border-t border-black/10 pt-6">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#86868B] font-bold">Pour Delivery Digital</p>
              <p className="text-[12px] mt-1">Fait à distance, le {today}</p>
              <div className="mt-3 min-h-[92px] flex items-center gap-3">
                <img src="/uploads/assets/signature-dd.png" alt="Signature Delivery Digital" className="h-[58px] w-auto mix-blend-multiply" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                <div className="text-center leading-[1.25] text-[#1b1b1b] select-none">
                  <p className="text-[14px] font-extrabold">DELIVERY Digital Nice</p>
                  <p className="text-[11px] font-bold">470 promenade des Anglais</p>
                  <p className="text-[11px] font-bold">06200 Nice • France</p>
                  <p className="text-[9.5px] mt-1 text-[#3a3a3c]">SIRET 90294519500029 • APE 6201Z</p>
                  <p className="text-[9.5px] text-[#3a3a3c]">RCS 902 945 195</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#86868B] font-bold">Pour le Formateur</p>
              <p className="text-[12px] mt-1">{who}{rep ? ` - ${rep}` : ''}</p>
              <div className="mt-3 min-h-[88px] flex items-center">
                {ci.legalName ? <TrainerStamp trainer={trainer} /> : <span className="text-[11.5px] text-[#E5B567]">Renseignez vos informations pour générer le tampon.</span>}
              </div>
              {signed && trainer.contract?.signedBy && <p className="text-[11px] text-[#86868B] mt-1">Signataire : {trainer.contract.signedBy}{trainer.contract.signedFunction ? ` (${trainer.contract.signedFunction})` : ''}</p>}
            </div>
          </div>
        </div>

        {/* Barre d'action signature */}
        <div className="mt-3 bg-[#181A20] border border-white/10 rounded-xl p-4">
          {signed ? (
            <p className="text-[12.5px] text-[#3DD68C] inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Contrat signé{trainer.contract?.signedAt ? ` le ${new Date(trainer.contract.signedAt).toLocaleDateString('fr-FR')}` : ''}. {trainer.contract?.validated ? 'Validé par Delivery Digital.' : 'En attente de validation Delivery Digital.'}</p>
          ) : !ci.legalName ? (
            <p className="text-[12.5px] text-[#E5B567]">Renseignez d&apos;abord vos informations (plus haut) avant de signer.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider text-white/40 mb-1">Votre fonction</label>
                <input value={signFunction} onChange={(e) => setSignFunction(e.target.value)} placeholder="Formateur, gérant…" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#0066CC]" />
              </div>
              <button onClick={sign} disabled={signing} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#3DD68C] text-black text-[12.5px] font-semibold hover:brightness-110 disabled:opacity-60"><Stamp className="h-3.5 w-3.5" /> {signing ? 'Signature…' : 'Signer et apposer mon tampon'}</button>
              <p className="text-[11px] text-white/40 self-center">Votre tampon est généré automatiquement.</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@media print { body * { visibility: hidden; } #contrat-print, #contrat-print * { visibility: visible; } #contrat-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; } .no-print { display: none; } }`}</style>
    </div>
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
