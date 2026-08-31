import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, LogOut, KeyRound, CheckCircle2, Clock, Circle, Sparkles, ChevronDown, Moon, Sun, GripVertical, ExternalLink, X, Smartphone, Tablet, Monitor, Paperclip, Send, Plus, Ban } from 'lucide-react';

/**
 * Espace client - suivi de projet (deliverydigital.fr/espace-client). Le client saisit son
 * code de suivi et voit l'avancement de son chantier (lecture seule). Même langage visuel
 * que l'espace agence : fond sombre à pois au login, cartes claires au dashboard.
 * @author Rabah Ziane - 2026-08-05
 */
const CODE_KEY = 'dd_client_code';
const LOGO_CACHE = 'dd_client_logo';
const LOGO_URL = '/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png';
const DOTTED_DARK: React.CSSProperties = { backgroundColor: '#0E0F13', backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' };
const DOTTED_LIGHT: React.CSSProperties = { background: '#F2EFE9', backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(29,29,31,0.08) 1px, transparent 0)', backgroundSize: '14px 14px' };
// Logo du client animé (« qui bouge ») : flottement doux + petit rebond pour les mini-logos. @Rabah 2026-08-05
const ANIM_CSS = `@keyframes hk-float{0%,100%{transform:translateY(0) rotate(-2.5deg)}50%{transform:translateY(-5px) rotate(2.5deg)}}@keyframes hk-pop{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.14) rotate(6deg)}}.hk-anim{animation:hk-float 2.4s ease-in-out infinite}.hk-anim-sm{animation:hk-pop 1.8s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.hk-anim,.hk-anim-sm{animation:none}}
@keyframes cs-phone-float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
.cs-phone{position:relative;width:78px;height:160px;border-radius:18px;background:#16171b;border:2px solid #34363d;padding:4px;box-shadow:0 10px 22px rgba(0,0,0,.3);animation:cs-phone-float 3s ease-in-out infinite;transition:box-shadow .2s}
.cs-phone-notch{position:absolute;top:7px;left:50%;transform:translateX(-50%);width:22px;height:4px;border-radius:4px;background:#000;z-index:2}
.cs-phone-screen{display:block;position:relative;width:100%;height:100%;border-radius:9px;overflow:hidden}
.cs-phone-btn:hover .cs-phone{box-shadow:0 12px 26px rgba(0,0,0,.4)}
.cs-phone-on{border-color:#8a8b93;box-shadow:0 0 0 2px rgba(255,255,255,.35),0 8px 18px rgba(0,0,0,.28)}
@media (prefers-reduced-motion:reduce){.cs-phone{animation:none}}
/* Police système Apple (SF Pro) façon Pyemes. @Rabah 2026-08-10 */
.cs-root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Inter",system-ui,sans-serif}
/* Marteau qui tape : « on travaille dessus ». Pivot en bas à gauche (bout du manche). @Rabah 2026-08-10 */
@keyframes hk-hammer{0%,50%,100%{transform:rotate(0deg)}68%{transform:rotate(34deg)}84%{transform:rotate(-6deg)}}
.hk-hammer{transform-origin:22% 82%;animation:hk-hammer 0.85s cubic-bezier(.5,0,.5,1) infinite}
/* Barre d'avancement des tâches « En cours » : 4 étapes (discussion -> codage -> test client ->
   prêt prod). Le remplissage donne l'étape atteinte ; le reflet blanc balaie de gauche à droite
   (« qui tape »). @Rabah 2026-08-10 */
.cs-prog-track{position:relative;height:5px;border-radius:99px;overflow:hidden}
.cs-prog-fill{position:relative;height:100%;border-radius:99px;overflow:hidden;transition:width .55s cubic-bezier(.4,0,.2,1)}
.cs-prog-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);animation:cs-prog-sweep 1.25s linear infinite}
@keyframes cs-prog-sweep{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
@media (prefers-reduced-motion:reduce){.cs-prog-fill::after{animation:none}}`;
const THEME_KEY = 'dd_client_theme';
// Mode nuit façon Pyemes : on surcharge les couleurs neutres (fonds/textes/bords) sous
// data-theme="dark", en gardant les couleurs d'accent (statuts, KPI). @Rabah 2026-08-06
const THEME_CSS = `
/* Cartes = verre dépoli macOS, valeurs EXACTES de Pyemes (.pyemes-glass). @Rabah 2026-08-10 */
.cs-root[data-theme="dark"] .bg-white{background:rgba(40,40,44,0.62) !important;-webkit-backdrop-filter:saturate(180%) blur(28px);backdrop-filter:saturate(180%) blur(28px);box-shadow:0 20px 56px -12px rgba(0,0,0,0.6) !important}
.cs-root[data-theme="dark"] .bg-white\\/90{background:rgba(28,28,30,.72) !important;-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px)}
.cs-root[data-theme="dark"] .text-\\[\\#1D1D1F\\]{color:#f2f2f5 !important}
.cs-root[data-theme="dark"] .text-\\[\\#6E6E73\\]{color:#a6a6ac !important}
.cs-root[data-theme="dark"] .text-\\[\\#3a3a3c\\]{color:#e5e5ea !important}
.cs-root[data-theme="dark"] .text-\\[\\#a1a1a6\\]{color:#7a7a80 !important}
.cs-root[data-theme="dark"] .border-black\\/8{border-color:rgba(255,255,255,.12) !important}
.cs-root[data-theme="dark"] .border-black\\/10{border-color:rgba(255,255,255,.12) !important}
.cs-root[data-theme="dark"] .bg-black\\/8{background:rgba(255,255,255,.12) !important}
.cs-root[data-theme="dark"] .bg-\\[\\#F0F0F2\\]{background:#2a2d34 !important}
.cs-root[data-theme="dark"] .bg-\\[\\#EEF2FF\\]{background:#26314f !important}
.cs-root[data-theme="dark"] .text-\\[\\#4b5bb8\\]{color:#9db2ff !important}
.cs-root[data-theme="dark"] .hover\\:bg-\\[\\#F5F5F7\\]:hover{background:#24262c !important}`;

type Task = { code: string; section: string; title: string; story: string; area: string; priority: number; category: string; status: string; estimate: string; dependsOn: string; phase?: string; ecartee?: boolean };
type Version = { label: string; current?: boolean };
// Travail fait en plus des taches demandees par le client. @Rabah 2026-08-31
type Extra = { date?: string; title: string; detail?: string; area?: string; kind?: string };
type ReqComment = { author: string; text: string; image?: string; createdAt?: string };
type ClientRequest = { id: string; from?: string; title: string; instruction: string; status: string; createdAt?: string; doneAt?: string | null; comments?: ReqComment[] };
type Project = { name: string; slug: string; summary: string; versions?: Version[]; clientRequests?: ClientRequest[]; unit: string; logoUrl?: string; availableDays?: number; forfaitStart?: string | null; clientOrder?: string[]; stagingUrl?: string; prodUrl?: string; updatedAt: string; tasks: Task[]; extras?: Extra[] };

const STATUS: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  todo: { label: 'À faire', color: '#8A8A8E', bg: 'rgba(138,138,142,0.12)', Icon: Circle },
  in_progress: { label: 'En cours', color: '#0066CC', bg: 'rgba(0,102,204,0.12)', Icon: Clock },
  done: { label: 'Fait', color: '#1a8a3b', bg: 'rgba(26,138,59,0.14)', Icon: CheckCircle2 },
  built: { label: 'Construit (client)', color: '#FF6634', bg: 'rgba(255,102,52,0.14)', Icon: Sparkles },
};
// Étapes d'avancement d'une tâche « En cours » (dans l'ordre). @Rabah 2026-08-10
const PHASES: { k: string; l: string }[] = [
  { k: 'discussion', l: 'En discussion' },
  { k: 'coding', l: 'Codage en cours' },
  { k: 'testing', l: 'En test (client)' },
  { k: 'ready', l: 'Prêt pour la prod' },
];
const phaseIndex = (p?: string) => { const i = PHASES.findIndex((x) => x.k === p); return i < 0 ? 0 : i; };
const daysOf = (e: string) => { const m = String(e || '').match(/([\d,.]+)\s*j/); return m ? parseFloat(m[1].replace(',', '.')) : 0; };
// Cadres d'appareil pour l'aperçu (Mobile / iPad / Mac). @Rabah 2026-08-07
// Petites illustrations colorees a la place des simples points (legende test / prod), meme
// esprit plat que la frise Pyemes. Test = fiole ambre, Production = fusee verte. @Rabah 2026-08-07
function IllVersionTest() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
      <path d="M9 3.6h6" stroke="#8a6d1f" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 4v5.6L5.6 17.4A1.8 1.8 0 0 0 7.2 20h9.6a1.8 1.8 0 0 0 1.6-2.6L14 9.6V4" fill="#FCEFC7" stroke="#C99A2E" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7.9 14.4h8.2l1.3 2.4A1.4 1.4 0 0 1 16.1 19H7.9a1.4 1.4 0 0 1-1.3-2.2z" fill="#C99A2E" />
      <circle cx="10.4" cy="16.6" r="0.9" fill="#FCEFC7" />
      <circle cx="13.6" cy="17.3" r="0.7" fill="#FCEFC7" />
    </svg>
  );
}
function IllVersionProd() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
      <path d="M12 2.6c3 1.6 4.8 4.7 4.8 8.3L12 14.6 7.2 10.9C7.2 7.3 9 4.2 12 2.6z" fill="#1a8a3b" />
      <circle cx="12" cy="9.2" r="1.7" fill="#DFF5E6" />
      <path d="M7.5 13l-2.1 2.5 2.9-.5M16.5 13l2.1 2.5-2.9-.5" stroke="#1a8a3b" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.4 15.4h3.2L12 18.8z" fill="#E03131" />
    </svg>
  );
}

const DEVICES: Record<string, { label: string; aspect: string; maxW: number; radius: number; bezel: number; chrome?: boolean; Icon: any }> = {
  'iphone-se': { label: 'iPhone SE', aspect: '375 / 667', maxW: 300, radius: 20, bezel: 8, Icon: Smartphone },
  'iphone-15': { label: 'iPhone 15', aspect: '390 / 844', maxW: 300, radius: 34, bezel: 9, Icon: Smartphone },
  'iphone-15-plus': { label: 'iPhone 15 Plus', aspect: '430 / 932', maxW: 320, radius: 36, bezel: 9, Icon: Smartphone },
  'iphone-15-max': { label: 'iPhone 15 Pro Max', aspect: '430 / 932', maxW: 330, radius: 38, bezel: 10, Icon: Smartphone },
  ipad: { label: 'iPad', aspect: '3 / 4', maxW: 520, radius: 24, bezel: 12, Icon: Tablet },
  'ipad-pro': { label: 'iPad Pro 12.9"', aspect: '512 / 683', maxW: 560, radius: 20, bezel: 12, Icon: Tablet },
  mac: { label: 'Mac', aspect: '16 / 10', maxW: 1100, radius: 12, bezel: 10, chrome: true, Icon: Monitor },
};

export default function ClientSpace() {
  const slugFromUrl = (() => { const m = window.location.pathname.match(/\/espace-client\/([a-z0-9-]+)/i); return m ? m[1] : ''; })();
  const [code, setCode] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('custom'); // tri par défaut : Mon classement (glisser-déposer). @Rabah 2026-08-14
  const [order, setOrder] = useState<string[]>([]);        // classement personnalisé (glisser-déposer)
  const [dragCode, setDragCode] = useState<string | null>(null);
  const [panels, setPanels] = useState<string[]>([]); // aperçus ouverts ('staging'/'prod') - comparaison côte à côte
  const [device, setDevice] = useState<string>('ipad'); // cadre d'appareil de l'aperçu
  const [deviceMenu, setDeviceMenu] = useState(false);
  const [booting, setBooting] = useState(!!localStorage.getItem(CODE_KEY)); // reconnexion auto (code mémorisé)
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === 'dark'); // mode nuit
  const [versMenu, setVersMenu] = useState(false); // menu déroulant des versions du chantier
  const [extrasOpen, setExtrasOpen] = useState(false); // section « Travaux supplémentaires » dépliée. @Rabah 2026-08-31
  const toggleTheme = () => setDark((d) => { localStorage.setItem(THEME_KEY, d ? 'light' : 'dark'); return !d; });
  const cachedLogo = localStorage.getItem(LOGO_CACHE) || '';

  const login = useCallback(async (c: string) => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/client-space/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c, slug: slugFromUrl }) });
      const d = await r.json();
      if (!r.ok || !d.ok) { setError('Code de suivi invalide.'); localStorage.removeItem(CODE_KEY); return; }
      setProject(d.project); localStorage.setItem(CODE_KEY, c);
      setOrder(d.project.clientOrder && d.project.clientOrder.length ? d.project.clientOrder : d.project.tasks.map((t: Task) => t.code));
      if (d.project.logoUrl) localStorage.setItem(LOGO_CACHE, d.project.logoUrl); else localStorage.removeItem(LOGO_CACHE);
    } catch { setError('Connexion impossible, réessayez.'); } finally { setLoading(false); setBooting(false); }
  }, [slugFromUrl]);

  useEffect(() => { const saved = localStorage.getItem(CODE_KEY); if (saved) { setCode(saved); login(saved); } }, [login]);

  // Échanges DD <-> client : section dépliable, tâches dépliables (commentaires + captures).
  // @Rabah 2026-08-10
  const [reqBusy, setReqBusy] = useState('');
  const [secOpen, setSecOpen] = useState(false);          // section échanges ouverte
  const [secLoading, setSecLoading] = useState(false);    // chargement au dépli de la section
  const [openReq, setOpenReq] = useState<string | null>(null); // tâche dépliée (fil)
  const [reqLoading, setReqLoading] = useState('');        // chargement au dépli d'une tâche
  const [newReq, setNewReq] = useState({ title: '', instruction: '' }); // demande client -> DD
  const [showNewReq, setShowNewReq] = useState(false);
  const [cmt, setCmt] = useState<Record<string, string>>({});           // texte de commentaire par tâche
  const cmtFile = useRef<Record<string, File | null>>({});
  const code2 = () => localStorage.getItem(CODE_KEY) || code;
  const ouvrirSection = () => { if (secOpen) { setSecOpen(false); return; } setSecLoading(true); setSecOpen(true); setTimeout(() => setSecLoading(false), 350); };
  const ouvrirTache = (id: string) => { if (openReq === id) { setOpenReq(null); return; } setReqLoading(id); setOpenReq(id); setTimeout(() => setReqLoading(''), 300); };

  const confirmRequest = async (requestId: string) => {
    setReqBusy('done-' + requestId);
    try {
      const r = await fetch('/api/client-space/request-done', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code2(), requestId }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) setProject(d.project);
    } finally { setReqBusy(''); }
  };
  // Le client marque une tâche « à faire » / « à ne pas faire ». MàJ optimiste (grisé immédiat),
  // puis le serveur renvoie le projet à jour. @author Rabah Ziane · 2026-08-13
  const toggleChoice = async (t: Task) => {
    const next = !t.ecartee;
    setProject((p) => (p ? { ...p, tasks: p.tasks.map((x) => (x.code === t.code ? { ...x, ecartee: next } : x)) } : p));
    try {
      const r = await fetch('/api/client-space/task-choice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code2(), taskCode: t.code, ecartee: next }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) setProject(d.project);
    } catch { /* on garde l'état optimiste */ }
  };
  const createRequest = async () => {
    if (!newReq.instruction.trim()) return;
    setReqBusy('create');
    try {
      const r = await fetch('/api/client-space/request-create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code2(), ...newReq }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setProject(d.project); setNewReq({ title: '', instruction: '' }); setShowNewReq(false); }
    } finally { setReqBusy(''); }
  };
  const addComment = async (requestId: string) => {
    const text = (cmt[requestId] || '').trim();
    const file = cmtFile.current[requestId] || null;
    if (!text && !file) return;
    setReqBusy('cmt-' + requestId);
    try {
      const fd = new FormData();
      fd.append('code', code2()); fd.append('requestId', requestId); fd.append('text', text);
      if (file) fd.append('image', file);
      const r = await fetch('/api/client-space/request-comment', { method: 'POST', body: fd });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setProject(d.project); setCmt((s) => ({ ...s, [requestId]: '' })); cmtFile.current[requestId] = null; }
    } finally { setReqBusy(''); }
  };

  const logout = () => { localStorage.removeItem(CODE_KEY); localStorage.removeItem(LOGO_CACHE); setProject(null); setCode(''); };

  /* -------- Splash de reconnexion : logo du client qui bouge -------- */
  if (!project && booting) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={DOTTED_DARK}>
        <style>{ANIM_CSS}</style>
        {cachedLogo
          ? <img src={cachedLogo} alt="" className="hk-anim h-24 w-24 object-contain drop-shadow-xl" />
          : <Loader2 className="h-8 w-8 animate-spin text-white/80" />}
      </div>
    );
  }

  /* -------- Écran de connexion -------- */
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5" style={DOTTED_DARK}>
        <div className="w-full max-w-[420px] bg-white rounded-3xl border border-black/10 shadow-2xl overflow-hidden">
          <div className="h-1.5" style={{ background: '#0066CC' }} />
          <div className="px-8 pt-8 pb-7 text-center">
            <img src={LOGO_URL} alt="Delivery Digital" className="h-9 mx-auto mb-6" />
            <h1 className="text-[22px] font-bold text-[#1D1D1F] mb-1">Espace client</h1>
            <p className="text-[13.5px] text-[#6E6E73] mb-6">Suivez l'avancement de votre projet en temps réel.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) login(code.trim()); }} className="space-y-3 text-left">
              <label className="block text-[12px] font-semibold text-[#3a3a3c] mb-1">Votre code de suivi</label>
              <div className="relative">
                <KeyRound className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A8E]" />
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DD-XXXXXX" autoFocus
                  className="w-full pl-10 pr-3 h-12 rounded-xl border border-black/12 bg-[#FAFAFA] text-[15px] tracking-wide text-[#1D1D1F] outline-none focus:border-[#0066CC]" />
              </div>
              {error && <p className="text-[12.5px] text-[#c0392b]">{error}</p>}
              <button type="submit" disabled={loading || !code.trim()} className="w-full h-12 rounded-xl bg-[#0066CC] text-white font-semibold text-[14.5px] inline-flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accéder à mon suivi'}
              </button>
            </form>
          </div>
          <div className="px-8 py-3.5 border-t border-black/5 bg-[#FAFAFA] text-center">
            <p className="text-[11px] text-[#86868b]">Delivery Digital · Suivi de projet</p>
          </div>
        </div>
      </div>
    );
  }

  /* -------- Dashboard de suivi -------- */
  const tasks = project.tasks || [];
  const n = tasks.length;
  const done = tasks.filter((t) => t.status === 'done' || t.status === 'built').length;
  const inProg = tasks.filter((t) => t.status === 'in_progress').length;
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const pct = n ? Math.round((done / n) * 100) : 0;
  // Les tâches « à ne pas faire » (écartées par le client) sortent du décompte des jours. @Rabah 2026-08-13
  const daysLeft = tasks.filter((t) => (t.status === 'todo' || t.status === 'in_progress') && !t.ecartee).reduce((s, t) => s + daysOf(t.estimate), 0);
  // Forfait client : jours consommés = estimations des tâches terminées ; disponible = forfait - consommé.
  const consumed = tasks.filter((t) => t.status === 'done' || t.status === 'built').reduce((s, t) => s + daysOf(t.estimate), 0);
  const dispo = Math.max(0, (project.availableDays || 0) - consumed);
  const startStr = project.forfaitStart ? new Date(project.forfaitStart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
  // Aperçu : chaque bouton ouvre/ferme un panneau ; deux panneaux = comparaison côte à côte.
  // demo = écran affiché dans le mini-téléphone pour l'instant (le staging n'a pas encore de front).
  // On montrera les vraies URLs test/prod plus tard. @Rabah 2026-08-07
  const envInfo = (k: string) => (k === 'staging'
    ? { url: project.stagingUrl || '', demo: 'https://app.hipekids.com/parent/login', label: 'Version test', dot: '#C99A2E', Ill: IllVersionTest }
    : { url: project.prodUrl || '', demo: 'https://app.hipekids.com/teacher/login', label: 'Version production', dot: '#1a8a3b', Ill: IllVersionProd });
  const togglePanel = (k: string) => setPanels((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const shown = filter === 'all' ? tasks : tasks.filter((t) => (filter === 'done' ? (t.status === 'done' || t.status === 'built') : t.status === filter));
  const sections = [...new Set(shown.map((t) => t.section))];

  const KPI = ({ label, value, tint }: { label: string; value: string; tint?: string }) => (
    <div className="bg-white rounded-2xl border border-black/8 px-5 py-4">
      <div className="text-[11px] uppercase tracking-[0.05em] text-[#8A8A8E] mb-1">{label}</div>
      <div className="text-[24px] font-bold tabular-nums" style={{ color: dark ? '#f2f2f5' : (tint || '#1D1D1F') }}>{value}</div>
    </div>
  );

  // Tri de l'ordre d'affichage. « Ordre du plan » = groupé par section (défaut) ;
  // les autres modes aplatissent la liste et la classent. @Rabah 2026-08-06
  const STORD: Record<string, number> = { todo: 0, in_progress: 1, built: 2, done: 3 };
  const sortFns: Record<string, (a: Task, b: Task) => number> = {
    priority: (a, b) => (b.priority - a.priority) || a.code.localeCompare(b.code),
    estimate: (a, b) => (daysOf(b.estimate) - daysOf(a.estimate)) || (b.priority - a.priority),
    status: (a, b) => ((STORD[a.status] ?? 9) - (STORD[b.status] ?? 9)) || (b.priority - a.priority),
  };
  const orderIdx = (c: string) => { const i = order.indexOf(c); return i < 0 ? 9999 : i; };
  const flat = sortBy === 'section' ? shown
    : sortBy === 'custom' ? [...shown].sort((a, b) => orderIdx(a.code) - orderIdx(b.code))
    : [...shown].sort(sortFns[sortBy] || (() => 0));
  // Glisser-déposer : déplace `dragC` juste avant `dropC` et sauvegarde l'ordre côté serveur.
  const reorder = (dragC: string, dropC: string) => {
    if (dragC === dropC) return;
    const base = order.length ? [...order] : tasks.map((t) => t.code);
    const cur = base.filter((c) => c !== dragC);
    const idx = cur.indexOf(dropC);
    cur.splice(idx < 0 ? cur.length : idx, 0, dragC);
    setOrder(cur);
    const saved = localStorage.getItem(CODE_KEY) || '';
    fetch('/api/client-space/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: saved, slug: slugFromUrl, order: cur }) }).catch(() => {});
  };

  // Carte d'une tâche (réutilisée en vue groupée et en vue triée à plat).
  const TaskCard = (t: Task, showSection = false) => {
    const st = STATUS[t.status] || STATUS.todo; const SIcon = st.Icon;
    const drag = sortBy === 'custom';
    const off = !!t.ecartee; // tâche écartée par le client (« à ne pas faire ») @Rabah 2026-08-13
    return (
      <div key={t.code}
        draggable={drag}
        onDragStart={drag ? (e) => { setDragCode(t.code); e.dataTransfer.effectAllowed = 'move'; } : undefined}
        onDragOver={drag ? (e) => e.preventDefault() : undefined}
        onDrop={drag ? (e) => { e.preventDefault(); if (dragCode) reorder(dragCode, t.code); setDragCode(null); } : undefined}
        onDragEnd={drag ? () => setDragCode(null) : undefined}
        className={`bg-white rounded-2xl border border-black/8 px-4 py-3.5 flex items-start gap-3 ${drag ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ ...(off ? { opacity: 0.55 } : {}), ...(drag && dragCode === t.code ? { opacity: 0.45 } : {}) }}>
        {drag && <GripVertical className="shrink-0 mt-0.5 text-[#B8B8BE]" style={{ width: 18, height: 18 }} />}
        {/* Icône cliquable : bascule « à faire » / « à ne pas faire ». @Rabah 2026-08-13 */}
        <button type="button" onClick={() => toggleChoice(t)}
          title={off ? 'Tâche écartée - cliquer pour la remettre « à faire »' : 'Cliquer pour marquer « à ne pas faire »'}
          aria-label="Basculer à faire / à ne pas faire"
          className="shrink-0 mt-0.5 p-0 border-0 bg-transparent cursor-pointer inline-flex">
          {off
            ? <Ban style={{ color: '#c0392b', width: 18, height: 18 }} />
            : (t.status === 'built' || t.status === 'in_progress') && project.logoUrl
              ? <img src={project.logoUrl} alt="" className="hk-anim-sm object-contain" style={{ width: 30, height: 30 }} />
              : <SIcon style={{ color: st.color, width: 18, height: 18 }} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10.5px] font-mono text-[#8A8A8E]">{t.code}</span>
            <span className="text-[10.5px]" style={{ color: '#c9a227' }}>{'★'.repeat(t.priority)}</span>
            {t.category && <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-[#F0F0F2] text-[#6E6E73]">{t.category}</span>}
            {showSection && t.section && <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#4b5bb8] font-medium">{t.section.split(' · ')[0]}</span>}
          </div>
          <div className={`text-[14px] font-semibold mt-0.5 ${off ? 'line-through text-[#9A9A9E]' : 'text-[#1D1D1F]'}`}>{t.title}</div>
          {t.story && <div className="text-[12.5px] text-[#6E6E73] leading-[1.5] mt-0.5">{t.story}</div>}
          {t.dependsOn && <div className="text-[11px] text-[#8A8A8E] mt-1">Dépend de : <span className="font-mono">{t.dependsOn}</span></div>}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* « En cours » = marteau animé (comme la section échanges), pas une pastille bleue. @Rabah 2026-08-10 */}
          {off
            ? <button type="button" onClick={() => toggleChoice(t)} title="Cliquer pour remettre « à faire »" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium cursor-pointer border-0" style={{ color: '#c0392b', background: 'rgba(192,57,43,0.10)' }}><Ban style={{ width: 12, height: 12 }} /> À ne pas faire</button>
            : t.status === 'in_progress'
            ? (() => {
                const pi = phaseIndex(t.phase);
                const pct = ((pi + 1) / PHASES.length) * 100;
                return (
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: dark ? '#c7c7cc' : '#6E6E73' }} title="On travaille dessus">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 hk-hammer" fill="currentColor" aria-hidden><path d="M17.28 3.4a1 1 0 0 1 1.41 0l1.9 1.9a1 1 0 0 1 0 1.42l-2.3 2.3a1 1 0 0 1-1.42 0l-.3-.3-2.15 2.15.98.98a1 1 0 0 1 0 1.41l-.7.71a1 1 0 0 1-1.42 0l-.98-.98-6.06 6.06a1.6 1.6 0 1 1-2.26-2.26l6.06-6.06-.98-.98a1 1 0 0 1 0-1.42l.7-.7a1 1 0 0 1 1.42 0l.98.98 2.15-2.15-.3-.3a1 1 0 0 1 0-1.42l2.3-2.3z" /></svg>
                      En cours
                    </span>
                    {/* Barre d'avancement : étape atteinte + reflet blanc qui balaie. @Rabah 2026-08-10 */}
                    <div className="w-[136px]" title={`Étape : ${PHASES[pi].l} (${pi + 1}/${PHASES.length})`}>
                      <div className="cs-prog-track" style={{ background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)' }}>
                        <div className="cs-prog-fill" style={{ width: `${pct}%`, background: dark ? 'linear-gradient(90deg,rgba(255,255,255,.55),#ffffff)' : 'linear-gradient(90deg,#4a4a4e,#1D1D1F)' }} />
                      </div>
                      <div className="mt-1 text-[10px] font-semibold text-right" style={{ color: dark ? '#e9e9ee' : '#3a3a3c' }}>{PHASES[pi].l}</div>
                    </div>
                  </div>
                );
              })()
            : <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ color: st.color, background: st.bg }}>{st.label}</span>}
          {!off && /\d/.test(t.estimate) && <span className="text-[11px] text-[#8A8A8E] tabular-nums">{t.estimate}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen cs-root" data-theme={dark ? 'dark' : 'light'}
      style={dark ? { backgroundColor: '#101114', backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '14px 14px' } : DOTTED_LIGHT}>
      <style>{ANIM_CSS}{THEME_CSS}</style>
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-black/8">
        <div className="max-w-[1080px] mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {project.logoUrl
              ? <img src={project.logoUrl} alt={project.name} className="hk-anim h-10 w-10 object-contain shrink-0" />
              : <img src={LOGO_URL} alt="Delivery Digital" className="h-7 hidden sm:block" />}
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-[#1D1D1F] truncate">{project.name}</div>
              <div className="text-[11.5px] text-[#8A8A8E] truncate">Suivi de projet · Delivery Digital</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggleTheme} title={dark ? 'Mode jour' : 'Mode nuit'} className="h-9 w-9 rounded-full border border-black/10 bg-white text-[#3a3a3c] hover:bg-[#F5F5F7] inline-flex items-center justify-center">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
            <button onClick={logout} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-black/10 bg-white text-[13px] text-[#3a3a3c] hover:bg-[#F5F5F7]"><LogOut className="h-3.5 w-3.5" /> Quitter</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1080px] mx-auto px-5 py-7">
        {/* Aperçu de l'app (test / production) - ouvre un modal cadre iPad. @Rabah 2026-08-07 */}
        {(project.stagingUrl || project.prodUrl) && (
          <div className="mb-6">
            <div className="flex items-end gap-8">
              {['staging', 'prod'].filter((k) => (k === 'staging' ? project.stagingUrl : project.prodUrl)).map((k, i) => {
                const e = envInfo(k); const on = panels.includes(k);
                return (
                  <button key={k} onClick={() => togglePanel(k)} className="cs-phone-btn group flex flex-col items-center gap-2.5">
                    <span className={`cs-phone ${on ? 'cs-phone-on' : ''}`} style={{ animationDelay: `${i * 0.7}s` }}>
                      <span className="cs-phone-notch" />
                      {/* Aperçu vivant de l'app dans l'écran : iframe mise à l'échelle, non cliquable. @Rabah 2026-08-07 */}
                      {/* Vignette : visuel propre (logo de l'app sur fond dégradé de la charte de
                          l'environnement). Une iframe live d'app est illisible à 66px et rend
                          souvent en desktop -> on montre le vrai aperçu plein écran AU CLIC (modale).
                          @Rabah 2026-08-10 */}
                      <span className="cs-phone-screen flex items-center justify-center" style={{ background: '#0b0b0d' }}>
                        {/* Vignette d'aperçu : logo complet du client, centré sur fond noir. @Rabah 2026-08-10 */}
                        <img src="/logo-dd-mixte.svg" alt="" className="object-contain" style={{ width: 58, height: 58 }} />
                        <span className="absolute bottom-1.5 left-0 right-0 text-center text-[7px] font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.82)' }}>APERÇU</span>
                      </span>
                    </span>
                    <span className="text-[12.5px] font-medium text-[#3a3a3c] inline-flex items-center gap-1.5">{e.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* Titre = version courante ; menu déroulant des versions déjà terminées (même principe).
            Piloté par project.versions ; fallback sur le summary texte si pas de versions. @Rabah 2026-08-10 */}
        {project.versions && project.versions.length > 0 ? (
          <div className="relative mb-5 inline-block">
            <button onClick={() => setVersMenu((v) => !v)} className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#1D1D1F] rounded-xl px-3 py-2 border border-black/10 bg-white hover:bg-black/[0.03] transition-colors">
              {(project.versions.find((v) => v.current) || project.versions[0]).label}
              <ChevronDown className={`h-4 w-4 text-[#8A8A8E] transition-transform ${versMenu ? 'rotate-180' : ''}`} />
            </button>
            {versMenu && (
              <>
                <button className="fixed inset-0 z-40 cursor-default" aria-label="Fermer" onClick={() => setVersMenu(false)} />
                <div className="absolute left-0 top-full mt-1.5 z-50 w-[260px] max-h-[320px] overflow-auto rounded-2xl border border-black/10 bg-white shadow-xl py-1.5">
                  {project.versions.map((v, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 px-3.5 py-2 text-[13px]">
                      <span className={v.current ? 'font-semibold text-[#1D1D1F]' : 'text-[#3a3a3c]'}>{v.label}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={v.current ? { background: 'rgba(0,102,204,0.12)', color: '#0066CC' } : { background: 'rgba(26,138,59,0.12)', color: '#1a8a3b' }}>
                        {v.current ? 'En cours' : 'Terminée'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          project.summary && <p className="text-[14px] text-[#3a3a3c] leading-[1.6] mb-5 max-w-[760px]">{project.summary}</p>
        )}

        {/* Échanges DD <-> client : section dépliable, bidirectionnelle, fil de commentaires + captures
            par tâche, pastille rouge clignotante si en cours. @Rabah 2026-08-10 */}
        {(() => {
          const reqs = project.clientRequests || [];
          const pending = reqs.filter((r) => r.status !== 'done').length;
          // Émetteur : logo HipeKids (client) OU icône Delivery Digital (croix colorée). @Rabah 2026-08-10
          const badge = (from?: string) => (
            <span className="h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 overflow-hidden bg-white border border-black/10">
              {from === 'client'
                ? (project.logoUrl ? <img src={project.logoUrl} alt="" className="h-6 w-6 object-contain" /> : <span className="text-[10px] font-bold text-[#1D1D1F]">{project.name.slice(0, 2)}</span>)
                : <img src="/logo-dd-icon.png" alt="Delivery Digital" className="h-full w-full object-contain p-0.5" />}
            </span>
          );
          return (
            <div className="mb-5 rounded-2xl border border-black/8 bg-white overflow-hidden">
              <button onClick={ouvrirSection} className="w-full flex items-center gap-3 px-5 py-3.5 text-left">
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2.5">
                    {/* Logo/wordmark Delivery Digital en typo de marque (NeoSans), blanc en mode sombre. @Rabah 2026-08-10 */}
                    <span className="text-[20px] leading-none font-bold tracking-tight" style={{ fontFamily: "'NeoSansStd', -apple-system, sans-serif", color: dark ? '#ffffff' : '#1D1D1F' }}>Delivery Digital</span>
                    {pending > 0 && <span className="inline-block h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: '#e5484d' }} title={`${pending} en cours`} />}
                  </span>
                  <span className="block text-[11.5px] text-[#8A8A8E] mt-0.5">Échanges · {pending > 0 ? `${pending} action(s) en cours` : 'aucune en attente'}</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-[#8A8A8E] transition-transform ${secOpen ? 'rotate-180' : ''}`} />
              </button>

              {secOpen && (
                <div className="px-5 pb-4 border-t border-black/5">
                  {secLoading ? (
                    <div className="flex items-center gap-2 py-6 text-[13px] text-[#8A8A8E]"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
                  ) : (
                    <>
                      <div className="pt-3">
                        {showNewReq ? (
                          <div className="rounded-xl border border-black/10 p-3 mb-3">
                            <input value={newReq.title} onChange={(e) => setNewReq({ ...newReq, title: e.target.value })} placeholder="Titre (optionnel)" className="w-full h-9 px-3 rounded-lg border border-black/12 text-[12.5px] mb-2 text-[#1D1D1F] bg-white" />
                            <textarea value={newReq.instruction} onChange={(e) => setNewReq({ ...newReq, instruction: e.target.value })} rows={2} placeholder="Ce que vous demandez à Delivery Digital…" className="w-full px-3 py-2 rounded-lg border border-black/12 text-[12.5px] resize-y text-[#1D1D1F] bg-white" />
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={() => setShowNewReq(false)} className="h-8 px-3 rounded-full text-[12px] border border-black/10">Annuler</button>
                              <button onClick={createRequest} disabled={reqBusy === 'create' || !newReq.instruction.trim()} className="h-8 px-3.5 rounded-full text-[12px] font-semibold text-white disabled:opacity-50 inline-flex items-center gap-1.5" style={{ background: '#0066CC' }}>{reqBusy === 'create' && <Loader2 className="h-3 w-3 animate-spin" />} Envoyer à Delivery Digital</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setShowNewReq(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold border border-black/10 text-[#3a3a3c] mb-3"><Plus className="h-3.5 w-3.5" /> Demander une action à Delivery Digital</button>
                        )}
                      </div>

                      {reqs.length === 0 ? (
                        <p className="text-[12.5px] text-[#8A8A8E] pb-1">Aucun échange pour l&apos;instant.</p>
                      ) : (
                        <div className="space-y-2">
                          {reqs.slice().reverse().map((r) => {
                            const isOpen = openReq === r.id;
                            return (
                              <div key={r.id} className="rounded-xl border border-black/8">
                                <button onClick={() => ouvrirTache(r.id)} className="w-full flex items-start gap-3 px-3.5 py-3 text-left">
                                  {badge(r.from)}
                                  <span className="flex-1 min-w-0">
                                    <span className="text-[11px] font-semibold" style={{ color: r.from === 'client' ? '#FF6634' : '#0066CC' }}>{r.from === 'client' ? `${project.name} demande` : (<><span style={{ fontFamily: "'NeoSansStd', sans-serif" }}>Delivery Digital</span> demande</>)}</span>
                                    {r.title && <span className="block text-[13px] font-semibold text-[#1D1D1F]">{r.title}</span>}
                                    <span className="block text-[12.5px] text-[#3a3a3c] leading-[1.5] truncate">{r.instruction}</span>
                                  </span>
                                  <span className="shrink-0 flex items-center gap-2">
                                    {r.status === 'done'
                                      ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(26,138,59,0.14)', color: '#1a8a3b' }}>✓ Fait</span>
                                      : (
                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: dark ? '#c7c7cc' : '#6E6E73' }} title="On travaille dessus">
                                          {/* Marteau plein façon SF Symbols, neutre (pas d'orange), qui tape. @Rabah 2026-08-10 */}
                                          <svg viewBox="0 0 24 24" className="h-4 w-4 hk-hammer" fill="currentColor" aria-hidden><path d="M17.28 3.4a1 1 0 0 1 1.41 0l1.9 1.9a1 1 0 0 1 0 1.42l-2.3 2.3a1 1 0 0 1-1.42 0l-.3-.3-2.15 2.15.98.98a1 1 0 0 1 0 1.41l-.7.71a1 1 0 0 1-1.42 0l-.98-.98-6.06 6.06a1.6 1.6 0 1 1-2.26-2.26l6.06-6.06-.98-.98a1 1 0 0 1 0-1.42l.7-.7a1 1 0 0 1 1.42 0l.98.98 2.15-2.15-.3-.3a1 1 0 0 1 0-1.42l2.3-2.3z" /></svg>
                                          En cours
                                        </span>
                                      )}
                                    <ChevronDown className={`h-4 w-4 text-[#8A8A8E] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                  </span>
                                </button>
                                {isOpen && (
                                  <div className="px-3.5 pb-3 border-t border-black/5">
                                    {reqLoading === r.id ? (
                                      <div className="flex items-center gap-2 py-4 text-[12.5px] text-[#8A8A8E]"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
                                    ) : (
                                      <>
                                        <div className="pt-3 text-[12.5px] text-[#3a3a3c] whitespace-pre-line">{r.instruction}</div>
                                        <div className="mt-2 flex items-center gap-2">
                                          {r.status !== 'done' && r.from === 'dd' && <button onClick={() => confirmRequest(r.id)} disabled={reqBusy === 'done-' + r.id} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold text-white disabled:opacity-60" style={{ background: '#1a8a3b' }}>{reqBusy === 'done-' + r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} C&apos;est fait</button>}
                                          {r.status !== 'done' && r.from === 'client' && <span className="text-[11.5px] text-[#8A5A05]">En attente de Delivery Digital</span>}
                                        </div>
                                        <div className="mt-3 space-y-2">
                                          {(r.comments || []).map((cc, i) => (
                                            <div key={i} className={`flex items-start gap-2 ${cc.author === 'client' ? 'flex-row-reverse' : ''}`}>
                                              {/* Logo de l'auteur du commentaire (Delivery Digital ou HipeKids). @Rabah 2026-08-10 */}
                                              <span className="h-6 w-6 shrink-0 mt-0.5 rounded-full overflow-hidden bg-white border border-black/10 inline-flex items-center justify-center">
                                                {cc.author === 'client'
                                                  ? (project.logoUrl ? <img src={project.logoUrl} alt="" className="h-4 w-4 object-contain" /> : null)
                                                  : <img src="/logo-dd-icon.png" alt="DD" className="h-full w-full object-contain p-0.5" />}
                                              </span>
                                              <div className="max-w-[78%] rounded-xl px-3 py-2" style={{ background: cc.author === 'client' ? 'rgba(255,102,52,0.10)' : 'rgba(0,102,204,0.08)' }}>
                                                {cc.text && <div className="text-[12.5px] text-[#1D1D1F] whitespace-pre-line">{cc.text}</div>}
                                                {cc.image && <a href={cc.image} target="_blank" rel="noreferrer"><img src={cc.image} alt="" className="mt-1 rounded-lg max-h-40 border border-black/10" /></a>}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                          <input value={cmt[r.id] || ''} onChange={(e) => setCmt((s) => ({ ...s, [r.id]: e.target.value }))} placeholder="Ajouter un commentaire…" className="flex-1 h-9 px-3 rounded-lg border border-black/12 text-[12.5px] text-[#1D1D1F] bg-white" />
                                          <label className="h-9 w-9 rounded-lg border border-black/10 inline-flex items-center justify-center cursor-pointer" title="Joindre une capture"><Paperclip className="h-4 w-4 text-[#6E6E73]" /><input type="file" accept="image/*" className="hidden" onChange={(e) => { cmtFile.current[r.id] = e.target.files?.[0] || null; }} /></label>
                                          <button onClick={() => addComment(r.id)} disabled={reqBusy === 'cmt-' + r.id} className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-white disabled:opacity-50" style={{ background: '#0066CC' }}>{reqBusy === 'cmt-' + r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Travaux supplémentaires : tout ce qui a été fait EN PLUS des tâches demandées par le
            client (correctifs, incidents, finitions non prévues). Section dépliable, mise à jour
            à chaque intervention hors périmètre - ne consomme pas le forfait, sert à garder la
            trace du travail offert. @author Rabah Ziane · 2026-08-31 */}
        {(() => {
          const tous = project.extras || [];
          if (!tous.length) return null;
          const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

          // Une section repliable par famille : travail ponctuel hors demande vs exploitation
          // courante. Meme rendu, deux compteurs distincts. @Rabah 2026-08-31
          const Section = ({ titre, sous, items, ouvert, onToggle, teinte }: any) => (
            <div className="mb-5 rounded-2xl border border-black/8 bg-white overflow-hidden">
              <button onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-3.5 text-left">
                {/* Pas d'icone "etincelles" (lecture IA) : un simple liseré de couleur. @Rabah 2026-08-31 */}
                <span className="h-8 w-1 rounded-full shrink-0" style={{ background: teinte }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-[#1D1D1F]">{titre}</span>
                  <span className="block text-[11.5px] text-[#8A8A8E] mt-0.5">{items.length} {sous}</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-[#8A8A8E] transition-transform ${ouvert ? 'rotate-180' : ''}`} />
              </button>

              {ouvert && (
                <div className="px-5 pb-4 border-t border-black/5">
                  <ul className="pt-3 space-y-2.5">
                    {items.map((x: Extra, i: number) => (
                      <li key={i} className="rounded-xl border border-black/8 px-3.5 py-2.5">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-[13.5px] font-semibold text-[#1D1D1F]">{x.title}</span>
                          {x.area && <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-[#F0F0F2] text-[#6E6E73]">{x.area}</span>}
                          <span className="ml-auto text-[11px] text-[#8A8A8E]">{fmtDate(x.date)}</span>
                        </div>
                        {x.detail && <p className="text-[12.5px] text-[#3a3a3c] leading-[1.55] mt-1 whitespace-pre-line">{x.detail}</p>}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11.5px] text-[#8A8A8E] mt-3">Ce sont des choses faites en plus des tâches du plan, listées ici pour en garder la trace.</p>
                </div>
              )}
            </div>
          );

          // Une seule section : tout ce qui a ete fait hors des taches du plan (ponctuel ET
          // exploitation courante) est regroupe la. @Rabah 2026-08-31
          return (
            <Section
              titre="Traçabilité autres tâches"
              sous={`intervention${tous.length > 1 ? 's' : ''} en plus des tâches du plan`}
              items={tous} ouvert={extrasOpen} onToggle={() => setExtrasOpen((o) => !o)} teinte="#FF6634"
            />
          );
        })()}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <KPI label="Tâches" value={String(n)} />
          <KPI label="Terminées" value={`${done}`} tint="#1a8a3b" />
          <KPI label="En cours" value={String(inProg)} />
          <KPI label={`Jours disponibles (${project.unit})`} value={project.availableDays ? String(Math.round(dispo * 10) / 10) : '-'} />
        </div>

        {/* Barre d'avancement */}
        <div className="bg-white rounded-2xl border border-black/8 px-5 py-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-[#1D1D1F]">Avancement global</span>
            <span className="text-[14px] font-bold tabular-nums text-[#1a8a3b]">{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-black/8 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#0066CC,#1a8a3b)' }} />
          </div>
          <div className="text-[11.5px] text-[#8A8A8E] mt-2">{done} terminées · {inProg} en cours · {todo} à faire{daysLeft ? ` · reste ${Math.round(daysLeft * 10) / 10} ${project.unit} estimés` : ''}{project.availableDays ? ` · forfait ${project.availableDays} ${project.unit}${consumed ? ` (${Math.round(consumed * 10) / 10} consommés)` : ''}${startStr ? ` démarré le ${startStr}` : ''}` : ''}</div>
        </div>

        {/* Filtres (statut) + tri (ordre d'affichage) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {[['all', `Tout (${n})`], ['todo', `À faire (${todo})`], ['in_progress', `En cours (${inProg})`], ['done', `Terminées (${done})`]].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`h-9 px-3.5 rounded-full text-[12.5px] border transition-colors ${filter === k ? 'font-semibold' : 'text-[#3a3a3c] bg-white border-black/10'}`} style={filter === k ? { background: dark ? '#f2f2f5' : '#1D1D1F', color: dark ? '#101114' : '#fff', borderColor: dark ? '#f2f2f5' : '#1D1D1F' } : undefined}>{l}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#8A8A8E]">Trier :</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-9 pl-3 pr-8 rounded-full border border-black/10 bg-white text-[12.5px] text-[#1D1D1F] cursor-pointer outline-none">
              <option value="section">Ordre du plan (par section)</option>
              <option value="custom">Mon classement (glisser-déposer)</option>
              <option value="priority">Priorité (haute → basse)</option>
              <option value="estimate">Charge (longue → courte)</option>
              <option value="status">Statut</option>
            </select>
          </div>
        </div>

        {/* Vue groupée par section (défaut) OU liste triée à plat */}
        {sortBy === 'section'
          ? sections.map((sec) => (
              <div key={sec} className="mb-6">
                <div className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#6E6E73] mb-2.5 px-1">{sec}</div>
                <div className="space-y-2">{shown.filter((t) => t.section === sec).map((t) => TaskCard(t))}</div>
              </div>
            ))
          : <div className="space-y-2 mb-6">
              {sortBy === 'custom' && <div className="text-[12px] text-[#8A8A8E] mb-1 px-1">↕ Glissez-déposez les cartes pour les classer selon votre priorité - votre ordre est enregistré.</div>}
              {flat.map((t) => TaskCard(t, true))}
            </div>}
        {!shown.length && <div className="text-center text-[13px] text-[#8A8A8E] py-10">Aucune tâche dans ce filtre.</div>}
        <div className="text-center text-[11px] text-[#a1a1a6] py-6">Mis à jour le {new Date(project.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} · Delivery Digital</div>
      </main>

      {/* Modal d'aperçu : 1 ou 2 panneaux (comparaison), cadre d'appareil sélectionnable. @Rabah 2026-08-07 */}
      {panels.length > 0 && (
        <div className="fixed inset-0 z-[80] flex flex-col p-3 sm:p-6" style={{ background: 'rgba(10,10,12,0.86)' }} onClick={() => setPanels([])}>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="font-semibold text-[14px] text-white shrink-0">Aperçu :</span>
              {['staging', 'prod'].filter((k) => (k === 'staging' ? project.stagingUrl : project.prodUrl)).map((k) => {
                const e = envInfo(k); const on = panels.includes(k);
                return (
                  <button key={k} onClick={() => togglePanel(k)} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] transition-colors ${on ? 'bg-white text-[#1D1D1F] font-semibold' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.dot }} /> {e.label}{on ? '' : ' +'}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <button onClick={() => setDeviceMenu((m) => !m)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/15 text-white text-[12.5px] hover:bg-white/25">
                  {(() => { const I = DEVICES[device].Icon; return <I className="h-3.5 w-3.5" />; })()} {DEVICES[device].label} <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {deviceMenu && (
                  <div className="absolute right-0 mt-1 w-52 max-h-[320px] overflow-auto bg-white rounded-xl shadow-2xl border border-black/10 py-1">
                    {Object.entries(DEVICES).map(([k, d]) => { const I = d.Icon; return (
                      <button key={k} onClick={() => { setDevice(k); setDeviceMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left hover:bg-[#F5F5F7] ${device === k ? 'font-semibold text-[#1D1D1F]' : 'text-[#3a3a3c]'}`}><I className="h-4 w-4 shrink-0" /> {d.label}</button>
                    ); })}
                  </div>
                )}
              </div>
              <button onClick={() => setPanels([])} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/15 text-white text-[12.5px] hover:bg-white/25"><X className="h-4 w-4" /> Fermer</button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex gap-4 overflow-auto" onClick={(e) => e.stopPropagation()}>
            {panels.map((k) => { const e = envInfo(k); const d = DEVICES[device]; return (
              <div key={k} className="flex-1 min-w-[280px] flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 text-white/90">
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium"><span className="h-1.5 w-1.5 rounded-full" style={{ background: e.dot }} /> {e.label}</span>
                  <div className="flex items-center gap-1.5">
                    <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-white/15 text-[11.5px] hover:bg-white/25"><ExternalLink className="h-3 w-3" /> Ouvrir</a>
                    <button onClick={() => togglePanel(k)} className="h-7 w-7 rounded-full bg-white/15 inline-flex items-center justify-center hover:bg-white/25"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 flex items-start justify-center overflow-auto">
                  <div style={{ width: '100%', maxWidth: d.maxW }}>
                    <div className="bg-[#0b0b0d] shadow-2xl mx-auto" style={{ borderRadius: d.radius + d.bezel, padding: d.bezel }}>
                      {d.chrome && <div className="flex items-center gap-1.5 px-3 py-2"><span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" /></div>}
                      <div className="bg-white overflow-hidden" style={{ borderRadius: d.radius, aspectRatio: d.aspect }}>
                        <iframe src={e.url} title={e.label} className="w-full h-full border-0" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ); })}
          </div>
          <div className="text-white/55 text-[11px] mt-2 text-center" onClick={(e) => e.stopPropagation()}>Si un écran reste blanc, le site bloque l'affichage en cadre - cliquez « Ouvrir ».</div>
        </div>
      )}
    </div>
  );
}
