import { useEffect, useState, useCallback } from 'react';
import { Building2, Loader2, LogOut, Copy, Eye, EyeOff, KeyRound, Plus, FileText, ShieldCheck, Users, FolderCheck, Search, Wallet } from 'lucide-react';
import FormationWizardModal from './FormationWizardModal';
import type { TransmitPayload, WizardEmployer } from './FormationWizardModal';

/**
 * Espace Agence partenaire (deliverydigital.fr/agence) - dashboard pro, organise
 * par client. 1 lead = 1 client -> montage dossier OPCO (wizard 6 onglets) +
 * demande identifiants OPCO (recus cote superadmin DD). @author Rabah Ziane - 2026-06-02
 */
const TOKEN_KEY = 'dd_agence_token';
const LOGO_URL = '/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png';
// Fond sombre a pois (comme l'admin Delivery Digital).
const DOTTED_BG: React.CSSProperties = { backgroundColor: '#0E0F13', backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' };
type CompanyInfo = { legalName?: string; regNumber?: string; vatNumber?: string; address?: string; city?: string; postalCode?: string; country?: string; repName?: string; repFunction?: string };
type Contract = { signed?: boolean; signedBy?: string; signedFunction?: string; signedAt?: string | null; validated?: boolean };
type Agency = { id: string; name: string; email: string; role?: string; isOwner?: boolean; apiKey?: string | null; commissionFix?: number; commissionPercent?: number; iban?: string; bic?: string; accountHolder?: string; bankCountry?: string; bankData?: Record<string, string>; ribPdfUrl?: string; bankValidated?: boolean; companyInfo?: CompanyInfo; contract?: Contract; onboardingValidated?: boolean };

// Champs RIB par pays (l'UI s'adapte au pays selectionne). accountHolder est toujours demande a part.
const COUNTRIES = [
  { code: 'FR', label: 'France' }, { code: 'BE', label: 'Belgique' }, { code: 'CH', label: 'Suisse' },
  { code: 'DE', label: 'Allemagne' }, { code: 'ES', label: 'Espagne' }, { code: 'IT', label: 'Italie' },
  { code: 'PT', label: 'Portugal' }, { code: 'NL', label: 'Pays-Bas' }, { code: 'LU', label: 'Luxembourg' },
  { code: 'GB', label: 'Royaume-Uni' }, { code: 'US', label: 'États-Unis' }, { code: 'CA', label: 'Canada' },
  { code: 'MA', label: 'Maroc' }, { code: 'DZ', label: 'Algérie' }, { code: 'TN', label: 'Tunisie' },
  { code: 'AE', label: 'Émirats arabes unis' }, { code: 'SA', label: 'Arabie saoudite' }, { code: 'QA', label: 'Qatar' },
];
const IBAN_FIELDS = [{ key: 'iban', label: 'IBAN', mono: true }, { key: 'bic', label: 'BIC / SWIFT', mono: true }];
const BANK_FIELDS_BY_COUNTRY: Record<string, { key: string; label: string; mono?: boolean }[]> = {
  FR: IBAN_FIELDS, BE: IBAN_FIELDS, CH: IBAN_FIELDS, DE: IBAN_FIELDS, ES: IBAN_FIELDS, IT: IBAN_FIELDS,
  PT: IBAN_FIELDS, NL: IBAN_FIELDS, LU: IBAN_FIELDS,
  GB: [{ key: 'sortCode', label: 'Sort code', mono: true }, { key: 'accountNumber', label: 'Account number', mono: true }, { key: 'iban', label: 'IBAN (optionnel)', mono: true }],
  US: [{ key: 'routingNumber', label: 'Routing number (ABA)', mono: true }, { key: 'accountNumber', label: 'Account number', mono: true }, { key: 'bankName', label: 'Nom de la banque' }],
  CA: [{ key: 'institution', label: 'Institution number', mono: true }, { key: 'transit', label: 'Transit number', mono: true }, { key: 'accountNumber', label: 'Account number', mono: true }],
  MA: [{ key: 'rib', label: 'RIB (24 chiffres)', mono: true }, { key: 'swift', label: 'SWIFT / BIC', mono: true }],
  DZ: [{ key: 'rib', label: 'RIB (20 chiffres)', mono: true }, { key: 'swift', label: 'SWIFT / BIC', mono: true }],
  TN: [{ key: 'rib', label: 'RIB (20 chiffres)', mono: true }, { key: 'swift', label: 'SWIFT / BIC', mono: true }],
  AE: [{ key: 'iban', label: 'IBAN', mono: true }, { key: 'swift', label: 'SWIFT / BIC', mono: true }],
  SA: [{ key: 'iban', label: 'IBAN', mono: true }, { key: 'swift', label: 'SWIFT / BIC', mono: true }],
  QA: [{ key: 'iban', label: 'IBAN', mono: true }, { key: 'swift', label: 'SWIFT / BIC', mono: true }],
};
function bankFieldsFor(country: string) { return BANK_FIELDS_BY_COUNTRY[country] || IBAN_FIELDS; }
type Commercial = { id: string; name: string; email: string; status?: string; clients: number; dossiers: number; gains: number };
type Lead = { _id: string; email?: string; denom?: string; siret?: string; opco?: string; status: string; createdAt?: string };
type Dossier = { _id: string; leadId?: string; denom?: string; formationTitle?: string; amountHT?: number; status: string; createdAt?: string; updatedAt?: string };
type Period = 'day' | 'week' | 'month' | 'all';
const PERIOD_MS: Record<Period, number> = { day: 86400000, week: 7 * 86400000, month: 30 * 86400000, all: Infinity };
const PERIOD_LABEL: Record<Period, string> = { day: 'Jour', week: 'Semaine', month: 'Mois', all: 'Tout' };

// Pipeline du dossier OPCO jusqu'au paiement.
const DOSSIER_META: Record<string, { label: string; cls: string; step: number }> = {
  transmitted: { label: 'Transmis', cls: 'bg-white/10 text-white/70 border-white/15', step: 1 },
  instruction: { label: 'En instruction OPCO', cls: 'bg-[#7C5CFC]/15 text-[#a78bfa] border-[#7C5CFC]/30', step: 2 },
  accepted: { label: 'Financement accepté', cls: 'bg-[#3DD68C]/15 text-[#3DD68C] border-[#3DD68C]/30', step: 3 },
  scheduled: { label: 'Programmé', cls: 'bg-[#3DD68C]/15 text-[#3DD68C] border-[#3DD68C]/30', step: 4 },
  completed: { label: 'Terminé', cls: 'bg-[#3DD68C]/15 text-[#3DD68C] border-[#3DD68C]/30', step: 5 },
  invoiced: { label: 'Facturé', cls: 'bg-[#FF9F0A]/15 text-[#FF9F0A] border-[#FF9F0A]/30', step: 6 },
  paid: { label: 'Payé ✓', cls: 'bg-[#3DD68C]/20 text-[#3DD68C] border-[#3DD68C]/40', step: 7 },
  rejected: { label: 'Refusé', cls: 'bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]/30', step: 0 },
};
const DOSSIER_TOTAL_STEPS = 7;

// Detection OPCO par code APE/NAF (heuristique, comme Pyemes).
function guessOpco(ape: string): string {
  const code = (ape || '').replace(/[^0-9]/g, '').slice(0, 2);
  if (['55', '56'].includes(code)) return 'AKTO';            // Hôtellerie-Café-Restauration
  if (['41', '42', '43'].includes(code)) return 'Constructys'; // Bâtiment / TP
  if (['45'].includes(code)) return 'ANFA';                  // Auto
  if (['86', '87', '88'].includes(code)) return 'OPCO Santé';
  if (['49', '50', '51', '52', '53'].includes(code)) return 'OPCO Mobilités';
  return 'OPCO EP';                                          // commerce de proximité / services par défaut
}

export default function AgenceSpace() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  if (!token) return <Login onAuth={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} />;
  return <Dashboard token={token} onLogout={() => { localStorage.removeItem(TOKEN_KEY); setToken(null); }} />;
}

function Login({ onAuth }: { onAuth: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }) });
      const j = await r.json();
      if (!r.ok || !j.token) { setError(j.error || j.message || 'Identifiants invalides'); return; }
      if (j.user?.role !== 'agence' && j.user?.role !== 'agence_commercial') { setError("Ce compte n'est pas un compte agence partenaire."); return; }
      onAuth(j.token);
    } catch { setError('Erreur réseau'); } finally { setLoading(false); }
  }
  return (
    <main className="min-h-screen flex items-center justify-center px-5" style={DOTTED_BG}>
      <form onSubmit={submit} className="w-full max-w-sm bg-[#181A20] rounded-2xl border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-1"><span className="inline-flex h-7 px-2 rounded-lg bg-white items-center"><img src={LOGO_URL} alt="Delivery Digital" className="h-4 w-auto" /></span><p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50">Espace Agence</p></div>
        <h1 className="text-xl font-bold text-white mb-4">Connexion partenaire</h1>
        <label className="block text-[12px] font-semibold text-white/80 mb-1">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-[14px] mb-3 focus:outline-none focus:border-[#7C5CFC]" />
        <label className="block text-[12px] font-semibold text-white/80 mb-1">Mot de passe</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-[14px] mb-4 focus:outline-none focus:border-[#7C5CFC]" />
        {error && <p className="text-[12.5px] text-[#FF6B6B] mb-3">{error}</p>}
        <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#7C5CFC] text-white text-[13px] font-semibold hover:bg-[#6a4cf0] disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Se connecter</button>
        <p className="text-[11.5px] text-white/40 mt-3 text-center">Vos accès vous sont fournis par Delivery Digital.</p>
      </form>
    </main>
  );
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dossierByLead, setDossierByLead] = useState<Record<string, Dossier>>({});
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [period, setPeriod] = useState<Period>('month');
  const [commerciaux, setCommerciaux] = useState<Commercial[]>([]);
  const [coName, setCoName] = useState('');
  const [coEmail, setCoEmail] = useState('');
  const [coBusy, setCoBusy] = useState(false);
  const [coCreated, setCoCreated] = useState<{ email: string; password: string } | null>(null);
  const [accessByEmail, setAccessByEmail] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [denom, setDenom] = useState('');
  const [email, setEmail] = useState('');
  const [siret, setSiret] = useState('');
  const [opco, setOpco] = useState('OPCO EP');
  const [creating, setCreating] = useState(false);
  const [detectMsg, setDetectMsg] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [bankCountry, setBankCountry] = useState('FR');
  const [bankFields, setBankFields] = useState<Record<string, string>>({});
  const [bankHolder, setBankHolder] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [uploadingRib, setUploadingRib] = useState(false);
  const [company, setCompany] = useState<CompanyInfo>({});
  const [savingCompany, setSavingCompany] = useState(false);
  const [showCompany, setShowCompany] = useState(false);
  const [signFunction, setSignFunction] = useState('');
  const [signing, setSigning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dossierLead, setDossierLead] = useState<Lead | null>(null);
  const [transmitting, setTransmitting] = useState(false);
  const [askingOpco, setAskingOpco] = useState<string | null>(null);

  const auth = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const authJson = useCallback(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetch('/api/agency/self/profile', { headers: auth() });
      if (p.status === 401 || p.status === 403) { onLogout(); return; }
      const pj = await p.json(); if (pj.ok) setAgency(pj.agency);
      const lj = await fetch('/api/agency/self/leads', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
      if (lj.ok) setLeads(lj.leads || []);
      const dj = await fetch('/api/agency/self/dossiers', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
      if (dj.ok) { const all: Dossier[] = dj.dossiers || []; setDossiers(all); const m: Record<string, Dossier> = {}; all.forEach((d) => { if (d.leadId && !m[d.leadId]) m[d.leadId] = d; }); setDossierByLead(m); }
      const aj = await fetch('/api/agency/self/access-requests', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
      if (aj.ok) { const m: Record<string, string> = {}; (aj.requests || []).forEach((r: { clientEmail: string; status: string }) => { m[r.clientEmail] = r.status; }); setAccessByEmail(m); }
      if (pj.ok && pj.agency?.isOwner) {
        const cj = await fetch('/api/agency/self/commerciaux', { headers: auth() }).then((r) => r.json()).catch(() => ({}));
        if (cj.ok) setCommerciaux(cj.commerciaux || []);
      }
    } finally { setLoading(false); }
  }, [auth, onLogout]);

  async function createCommercial() {
    if (!coName.trim() || !coEmail.trim()) { alert('Nom + email requis.'); return; }
    setCoBusy(true);
    try {
      const r = await fetch('/api/agency/self/commerciaux', { method: 'POST', headers: authJson(), body: JSON.stringify({ name: coName.trim(), email: coEmail.trim() }) });
      const j = await r.json();
      if (j.ok) { setCoCreated({ email: j.commercial.email, password: j.password }); setCoName(''); setCoEmail(''); load(); }
      else alert('Erreur : ' + (j.error === 'email_exists' ? 'email déjà utilisé' : j.error));
    } finally { setCoBusy(false); }
  }
  useEffect(() => { load(); }, [load]);

  // Detection auto OPCO + raison sociale a la saisie du SIRET (comme Pyemes).
  useEffect(() => {
    if (!showCreate) return;
    const raw = siret.replace(/\D/g, '');
    if (raw.length !== 14 && raw.length !== 9) { setDetectMsg(''); return; }
    const t = setTimeout(async () => {
      setDetecting(true);
      try {
        const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${raw}&limite=1`);
        const j = await r.json();
        const res = (j?.results || [])[0];
        if (!res) { setDetectMsg('SIRET introuvable'); return; }
        const m = (res.matching_etablissements || [])[0] || res.siege || {};
        const found = String(res.nom_complet || res.denomination || m.enseigne || '');
        const ape = String(res.activite_principale || m.activite_principale || '');
        const o = guessOpco(ape);
        setDenom((d) => d.trim() ? d : found);
        setOpco(o);
        setDetectMsg(`Détecté : ${found || 'établissement'} · OPCO ${o}`);
      } catch { setDetectMsg(''); } finally { setDetecting(false); }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siret, showCreate]);

  useEffect(() => {
    if (!agency) return;
    setBankCountry(agency.bankCountry || 'FR');
    setBankHolder(agency.accountHolder || '');
    const bd = agency.bankData && Object.keys(agency.bankData).length ? agency.bankData : { iban: agency.iban || '', bic: agency.bic || '' };
    setBankFields(bd);
    setCompany(agency.companyInfo || {});
    setSignFunction(agency.contract?.signedFunction || '');
  }, [agency]);

  async function saveBank() {
    setSavingBank(true);
    try {
      const r = await fetch('/api/agency/self/bank', { method: 'POST', headers: authJson(), body: JSON.stringify({ country: bankCountry, fields: bankFields, accountHolder: bankHolder }) });
      const j = await r.json();
      if (j.ok) { setAgency((a) => a ? { ...a, bankCountry: j.bankCountry, bankData: j.bankData, iban: j.iban, bic: j.bic, accountHolder: j.accountHolder, bankValidated: false } : a); alert('Coordonnées bancaires enregistrées. Elles seront validées par Delivery Digital.'); }
    } finally { setSavingBank(false); }
  }

  async function uploadRib(file: File) {
    if (file.type !== 'application/pdf') { alert('Le RIB doit être un fichier PDF.'); return; }
    if (file.size > 6 * 1024 * 1024) { alert('Fichier trop lourd (max 6 Mo).'); return; }
    setUploadingRib(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result)); fr.onerror = reject; fr.readAsDataURL(file); });
      const r = await fetch('/api/agency/self/rib-pdf', { method: 'POST', headers: authJson(), body: JSON.stringify({ dataUrl }) });
      const j = await r.json();
      if (j.ok) { setAgency((a) => a ? { ...a, ribPdfUrl: j.ribPdfUrl, bankValidated: false } : a); alert('PDF du RIB envoyé.'); }
      else alert('Erreur : ' + (j.error === 'pdf_only' ? 'PDF uniquement' : j.error === 'too_large' ? 'fichier trop lourd' : j.error));
    } finally { setUploadingRib(false); }
  }

  async function saveCompany() {
    if (!company.legalName?.trim()) { alert('Raison sociale requise.'); return; }
    setSavingCompany(true);
    try {
      const r = await fetch('/api/agency/self/company', { method: 'POST', headers: authJson(), body: JSON.stringify(company) });
      const j = await r.json();
      if (j.ok) { setAgency((a) => a ? { ...a, companyInfo: j.companyInfo, onboardingValidated: false } : a); setShowCompany(false); alert('Informations enregistrées. Elles seront validées par Delivery Digital.'); }
    } finally { setSavingCompany(false); }
  }

  async function signContract() {
    if (!signFunction.trim()) { alert('Indiquez votre fonction (gérant, président…).'); return; }
    if (!confirm('En signant, vous acceptez le contrat de partenariat Delivery Digital. Continuer ?')) return;
    setSigning(true);
    try {
      const r = await fetch('/api/agency/self/contract/sign', { method: 'POST', headers: authJson(), body: JSON.stringify({ signedFunction: signFunction.trim() }) });
      const j = await r.json();
      if (j.ok) { setAgency((a) => a ? { ...a, contract: j.contract, onboardingValidated: false } : a); alert('Contrat signé. Il sera validé par Delivery Digital.'); }
    } finally { setSigning(false); }
  }

  async function importCsv(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      // Detecte un eventuel header (contient "nom"/"denom"/"email")
      if (rows.length && /nom|denom|email|siret/i.test(rows[0]) && !/@/.test(rows[0])) rows.shift();
      const sep = (rows[0] || '').includes(';') ? ';' : ',';
      const leadsToCreate = rows.map((r) => {
        const [denom, email, siret, opco] = r.split(sep).map((c) => (c || '').trim().replace(/^"|"$/g, ''));
        return { denom, email, siret, opco };
      }).filter((l) => l.denom);
      if (leadsToCreate.length === 0) { alert('Aucune ligne valide (format attendu : Nom;Email;SIRET;OPCO).'); return; }
      const r = await fetch('/api/agency/self/leads/bulk', { method: 'POST', headers: authJson(), body: JSON.stringify({ leads: leadsToCreate }) });
      const j = await r.json();
      if (j.ok) { alert(`${j.created} client(s) importé(s).`); load(); }
      else alert('Erreur import : ' + (j.error || ''));
    } finally { setImporting(false); }
  }

  async function createLead() {
    if (!denom.trim()) { alert('Nom du client requis.'); return; }
    setCreating(true);
    try {
      const r = await fetch('/api/agency/self/leads', { method: 'POST', headers: authJson(), body: JSON.stringify({ denom: denom.trim(), email: email.trim(), siret: siret.trim(), opco: opco.trim() }) });
      const j = await r.json();
      if (j.ok) { setDenom(''); setEmail(''); setSiret(''); setShowCreate(false); load(); }
    } finally { setCreating(false); }
  }

  async function askOpco(lead: Lead) {
    if (!lead.email) { alert("Ce client n'a pas d'email."); return; }
    setAskingOpco(lead._id);
    try {
      const r = await fetch('/api/agency/self/access-requests', { method: 'POST', headers: authJson(), body: JSON.stringify({ clientEmail: lead.email, label: 'Identifiants OPCO' }) });
      const j = await r.json();
      if (j.ok) { alert(`Email envoyé à ${lead.email} : le client transmettra ses identifiants OPCO (reçus côté Delivery Digital).`); load(); }
      else alert('Erreur : ' + (j.error || 'envoi impossible'));
    } finally { setAskingOpco(null); }
  }

  async function regenKey() {
    if (!confirm("Régénérer la clé API ? L'ancienne ne fonctionnera plus.")) return;
    setBusy(true);
    try { const r = await fetch('/api/agency/self/api-key', { method: 'POST', headers: auth() }); const j = await r.json(); if (j.ok) { setAgency((a) => a ? { ...a, apiKey: j.apiKey } : a); setShowKey(true); } } finally { setBusy(false); }
  }

  const isOwner = !!agency?.isOwner;
  const fix = agency?.commissionFix != null ? agency.commissionFix : 120;
  const pct = agency?.commissionPercent != null ? agency.commissionPercent : 15;
  const earn = (d?: Dossier) => d ? Math.round(fix + (pct / 100) * (d.amountHT || 0)) : 0;
  const nowMs = Date.now();
  const inPeriod = (iso?: string) => period === 'all' || (!!iso && nowMs - new Date(iso).getTime() <= PERIOD_MS[period]);
  const periodDossiers = dossiers.filter((d) => inPeriod(d.createdAt));
  const paidDossiers = dossiers.filter((d) => d.status === 'paid').sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  const kpi = {
    clients: leads.length,
    dossiers: dossiers.length,
    gains: periodDossiers.reduce((s, d) => s + earn(d), 0),
    acquis: paidDossiers.filter((d) => inPeriod(d.updatedAt || d.createdAt)).reduce((s, d) => s + earn(d), 0),
  };
  const q = search.trim().toLowerCase();
  const filtered = q ? leads.filter((l) => `${l.denom || ''} ${l.email || ''} ${l.siret || ''}`.toLowerCase().includes(q)) : leads;

  if (loading) return <main className="min-h-screen bg-[#0E0F13] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></main>;

  return (
    <main className="min-h-screen text-white" style={DOTTED_BG}>
      {/* Topbar */}
      <header className="border-b border-black/10 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Delivery Digital" className="h-10 w-auto" />
            <span className="text-[15px] font-bold text-[#1D1D1F] leading-tight">{agency?.name || 'Agence'}</span>
          </div>
          <button onClick={onLogout} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] text-[11.5px] border border-black/10"><LogOut className="h-3.5 w-3.5" /> Déconnexion</button>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 py-7 space-y-7">
        {/* Bandeau infos entreprise + statut de validation superadmin (owner uniquement) */}
        {isOwner && (
          agency?.onboardingValidated ? (
            <div className="rounded-2xl border border-[#3DD68C]/30 bg-[#3DD68C]/[0.07] px-5 py-3.5 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#3DD68C] flex-shrink-0" />
              <div className="min-w-0"><p className="text-[13px] font-semibold text-[#3DD68C]">Compte partenaire validé par Delivery Digital</p><p className="text-[11.5px] text-white/50 truncate">{agency.companyInfo?.legalName || agency.name} · contrat signé · RIB validé.</p></div>
              <button onClick={() => setShowCompany((v) => !v)} className="ml-auto text-[11.5px] text-white/50 underline whitespace-nowrap">Modifier mes infos</button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#FF9F0A]/30 bg-[#FF9F0A]/[0.07] px-5 py-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-[#FF9F0A] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#FFb84d]">Activez votre compte partenaire</p>
                  <p className="text-[11.5px] text-white/55">Renseignez vos informations d&apos;entreprise, votre RIB et signez le contrat. Le tout sera validé par Delivery Digital.</p>
                </div>
                <button onClick={() => setShowCompany((v) => !v)} className="ml-auto px-3.5 py-1.5 rounded-lg bg-[#FF9F0A] text-black text-[12px] font-semibold whitespace-nowrap">{showCompany ? 'Masquer' : (agency?.companyInfo?.legalName ? 'Modifier mes infos' : 'Renseigner mes infos')}</button>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 pl-8 text-[11.5px]">
                <span className={agency?.companyInfo?.legalName ? 'text-[#3DD68C]' : 'text-white/40'}>{agency?.companyInfo?.legalName ? '✓' : '○'} Infos entreprise</span>
                <span className={agency?.ribPdfUrl ? 'text-[#3DD68C]' : 'text-white/40'}>{agency?.ribPdfUrl ? '✓' : '○'} RIB + PDF</span>
                <span className={agency?.contract?.signed ? 'text-[#3DD68C]' : 'text-white/40'}>{agency?.contract?.signed ? '✓' : '○'} Contrat signé</span>
                <span className="text-white/40">→ en attente de validation Delivery Digital</span>
              </div>
            </div>
          )
        )}
        {isOwner && showCompany && (
          <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
            <h2 className="text-[15px] font-bold">Informations de l&apos;entreprise</h2>
            <p className="text-[12.5px] text-white/50 mt-1">Ces informations figureront sur le contrat de partenariat et seront validées par Delivery Digital.</p>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <input value={company.legalName || ''} onChange={(e) => setCompany((c) => ({ ...c, legalName: e.target.value }))} placeholder="Raison sociale *" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
              <input value={company.regNumber || ''} onChange={(e) => setCompany((c) => ({ ...c, regNumber: e.target.value }))} placeholder="N° d'immatriculation (SIRET / registre)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
              <input value={company.vatNumber || ''} onChange={(e) => setCompany((c) => ({ ...c, vatNumber: e.target.value }))} placeholder="N° TVA (optionnel)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
              <input value={company.country || ''} onChange={(e) => setCompany((c) => ({ ...c, country: e.target.value }))} placeholder="Pays" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
              <input value={company.address || ''} onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))} placeholder="Adresse" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
              <div className="grid grid-cols-2 gap-3">
                <input value={company.postalCode || ''} onChange={(e) => setCompany((c) => ({ ...c, postalCode: e.target.value }))} placeholder="Code postal" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
                <input value={company.city || ''} onChange={(e) => setCompany((c) => ({ ...c, city: e.target.value }))} placeholder="Ville" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
              </div>
              <input value={company.repName || ''} onChange={(e) => setCompany((c) => ({ ...c, repName: e.target.value }))} placeholder="Représentant légal (nom)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
              <input value={company.repFunction || ''} onChange={(e) => setCompany((c) => ({ ...c, repFunction: e.target.value }))} placeholder="Fonction (gérant, président…)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
            </div>
            <button onClick={saveCompany} disabled={savingCompany} className="mt-3 px-4 py-2 rounded-lg bg-[#7C5CFC] text-white text-[12.5px] font-semibold hover:bg-[#6a4cf0] disabled:opacity-60">{savingCompany ? 'Enregistrement…' : 'Enregistrer mes informations'}</button>
          </section>
        )}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-bold">Tableau de bord</h1>
            <p className="text-[13px] text-white/50 mt-0.5">Gérez vos clients, montez leurs dossiers OPCO et demandez leurs identifiants.</p>
            {isOwner && <p className="text-[12px] text-[#3DD68C] mt-1">Votre commission : <strong>{fix.toLocaleString('fr-FR')} €</strong> + <strong>{pct}%</strong> du montant HT par dossier - <span className="text-white/60">versée à la réception du paiement OPCO</span>.</p>}
          </div>
          {/* Filtre periode */}
          {isOwner && <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            {(['day', 'week', 'month', 'all'] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-md text-[11.5px] font-medium transition ${period === p ? 'bg-[#7C5CFC] text-white' : 'text-white/60 hover:text-white'}`}>{PERIOD_LABEL[p]}</button>
            ))}
          </div>}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={<Users className="h-4 w-4" />} label="Clients" value={kpi.clients} accent="#7C5CFC" />
          <Kpi icon={<FolderCheck className="h-4 w-4" />} label="Dossiers" value={kpi.dossiers} accent="#7C5CFC" />
          {isOwner && <Kpi icon={<Wallet className="h-4 w-4" />} label={`Gains estimés · ${PERIOD_LABEL[period]}`} value={kpi.gains} suffix=" €" accent="#3DD68C" />}
          {isOwner && <Kpi icon={<ShieldCheck className="h-4 w-4" />} label={`Gains acquis · ${PERIOD_LABEL[period]}`} value={kpi.acquis} suffix=" €" accent="#3DD68C" />}
        </div>

        {/* Clients */}
        <section className="rounded-2xl bg-[#181A20] border border-white/10">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[15px] font-bold">Mes clients</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="pl-8 pr-3 py-1.5 w-44 rounded-lg bg-white/5 border border-white/10 text-[12.5px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
              </div>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12.5px] cursor-pointer" title="Format : Nom;Email;SIRET;OPCO (1 client par ligne)">
                {importing ? 'Import…' : 'Importer CSV'}
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.currentTarget.value = ''; }} />
              </label>
              <button onClick={() => setShowCreate((v) => !v)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#7C5CFC] text-white text-[12.5px] font-semibold hover:bg-[#6a4cf0]"><Plus className="h-3.5 w-3.5" /> Nouveau client</button>
            </div>
          </div>

          {showCreate && (
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="grid sm:grid-cols-4 gap-3">
                <input value={denom} onChange={(e) => setDenom(e.target.value)} placeholder="Nom du client *" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email client" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
                <input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="SIRET (détection auto OPCO)" inputMode="numeric" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 font-mono focus:outline-none focus:border-[#7C5CFC]" />
                <input value={opco} onChange={(e) => setOpco(e.target.value)} placeholder="OPCO" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
              </div>
              {(detecting || detectMsg) && <p className="text-[11.5px] text-[#3DD68C] mt-2">{detecting ? 'Détection en cours…' : detectMsg}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={createLead} disabled={creating} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7C5CFC] text-white text-[12.5px] font-semibold hover:bg-[#6a4cf0] disabled:opacity-60">{creating ? 'Ajout…' : 'Créer le client'}</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[12.5px]">Annuler</button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-white/40">{leads.length === 0 ? "Aucun client. Cliquez sur « Nouveau client » pour démarrer." : 'Aucun résultat.'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="text-white/40 text-[10px] uppercase tracking-wider">
                  <tr className="border-b border-white/5"><th className="text-left px-5 py-2.5">Client</th><th className="text-left px-5 py-2.5">Dossier OPCO</th>{isOwner && <th className="text-left px-5 py-2.5">Vous gagnez</th>}<th className="text-left px-5 py-2.5">Accès OPCO</th><th className="text-right px-5 py-2.5">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((l) => {
                    const acc = l.email ? accessByEmail[l.email] : undefined;
                    const initial = (l.denom || 'C').trim().charAt(0).toUpperCase();
                    const dos = dossierByLead[l._id];
                    const dm = dos ? (DOSSIER_META[dos.status] || DOSSIER_META.transmitted) : null;
                    return (
                      <tr key={l._id} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-8 w-8 rounded-full bg-gradient-to-br from-[#7C5CFC] to-[#3DD68C] items-center justify-center text-[12px] font-bold flex-shrink-0">{initial}</span>
                            <div className="min-w-0"><p className="font-semibold truncate">{l.denom || 'Client'}</p><p className="text-white/40 text-[11.5px] truncate">{[l.email, l.opco && `OPCO ${l.opco}`].filter(Boolean).join(' · ') || l.siret || '-'}</p></div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {dos && dm ? (
                            <div className="min-w-[140px]">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] border ${dm.cls}`}>{dm.label}</span>
                              <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#3DD68C]" style={{ width: `${Math.round((dm.step / DOSSIER_TOTAL_STEPS) * 100)}%` }} /></div>
                              <p className="text-white/40 text-[10.5px] mt-1">{(dos.amountHT || 0).toLocaleString('fr-FR')} € HT</p>
                            </div>
                          ) : <span className="text-white/30 text-[11.5px]">Non monté</span>}
                        </td>
                        {isOwner && (
                          <td className="px-5 py-3">
                            {dos ? (
                              <div>
                                <span className="font-semibold text-[#3DD68C]">{earn(dos).toLocaleString('fr-FR')} €</span>
                                <p className={`text-[10.5px] mt-0.5 ${dos.status === 'paid' ? 'text-[#3DD68C]' : 'text-white/40'}`}>{dos.status === 'paid' ? 'Acquis ✓ (OPCO payé)' : 'À la réception OPCO'}</p>
                              </div>
                            ) : <span className="text-white/30 text-[11.5px]">-</span>}
                          </td>
                        )}
                        <td className="px-5 py-3">
                          {acc === 'received' ? <span className="inline-flex items-center gap-1 text-[11.5px] text-[#3DD68C]"><ShieldCheck className="h-3.5 w-3.5" /> Reçus</span>
                            : acc === 'pending' ? <span className="text-[11.5px] text-[#FF9F0A]">Demandés…</span>
                            : <span className="text-white/30 text-[11.5px]">-</span>}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setDossierLead(l)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11.5px] whitespace-nowrap"><FileText className="h-3.5 w-3.5" /> {dos ? 'Nouveau dossier' : 'Dossier OPCO'}</button>
                            {acc !== 'received' && acc !== 'pending' && <button onClick={() => askOpco(l)} disabled={askingOpco === l._id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11.5px] whitespace-nowrap disabled:opacity-60"><KeyRound className="h-3.5 w-3.5" /> {askingOpco === l._id ? '…' : 'Accès OPCO'}</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Mes commerciaux (sous-comptes) - proprietaire d'agence uniquement */}
        {isOwner && (
          <section className="rounded-2xl bg-[#181A20] border border-white/10">
            <div className="px-5 py-4 border-b border-white/10"><h2 className="text-[15px] font-bold">Mes commerciaux</h2><p className="text-[12px] text-white/50 mt-0.5">Créez des comptes commerciaux : ils montent des dossiers pour vos clients (sans voir vos commissions).</p></div>
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={coName} onChange={(e) => setCoName(e.target.value)} placeholder="Nom du commercial" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
                <input type="email" value={coEmail} onChange={(e) => setCoEmail(e.target.value)} placeholder="Email du commercial" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
              </div>
              <button onClick={createCommercial} disabled={coBusy} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7C5CFC] text-white text-[12.5px] font-semibold hover:bg-[#6a4cf0] disabled:opacity-60"><Plus className="h-3.5 w-3.5" /> {coBusy ? 'Création…' : 'Créer un commercial'}</button>
              {coCreated && (
                <div className="mt-3 rounded-lg border border-[#3DD68C]/40 bg-[#3DD68C]/5 p-3 text-[12.5px]">
                  <p className="text-[#3DD68C] font-semibold">Commercial créé - transmettez-lui ses accès (login sur /agence) :</p>
                  <p className="font-mono mt-1">Login : <strong className="select-all">{coCreated.email}</strong> · Mot de passe : <strong className="select-all">{coCreated.password}</strong></p>
                  <button onClick={() => setCoCreated(null)} className="mt-1 text-white/50 underline text-[11.5px]">Fermer</button>
                </div>
              )}
            </div>
            {commerciaux.length > 0 && (
              <table className="w-full text-[12.5px]">
                <thead className="text-white/40 text-[10px] uppercase tracking-wider"><tr className="border-b border-white/5"><th className="text-left px-5 py-2.5">Commercial</th><th className="text-left px-5 py-2.5">Clients</th><th className="text-left px-5 py-2.5">Dossiers</th><th className="text-right px-5 py-2.5">Gains générés</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {commerciaux.map((co) => (
                    <tr key={co.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-2.5"><p className="font-semibold">{co.name}</p><p className="text-white/40 text-[11.5px]">{co.email}</p></td>
                      <td className="px-5 py-2.5 text-white/70">{co.clients}</td>
                      <td className="px-5 py-2.5 text-white/70">{co.dossiers}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-[#3DD68C]">{co.gains.toLocaleString('fr-FR')} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* Coordonnees bancaires (pour recevoir les commissions) - champs selon le pays */}
        {isOwner && (
        <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[15px] font-bold">Coordonnées bancaires</h2>
            {agency?.bankValidated ? <span className="inline-flex items-center gap-1 text-[11.5px] text-[#3DD68C]"><ShieldCheck className="h-3.5 w-3.5" /> Compte validé</span>
              : <span className="text-[11.5px] text-[#FF9F0A]">En attente de validation Delivery Digital</span>}
          </div>
          <p className="text-[12.5px] text-white/50 mt-1">Vos commissions sont versées sur ce compte à la réception du paiement OPCO. Le PDF du RIB est obligatoire pour valider le compte.</p>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-[10.5px] uppercase tracking-wider text-white/40 mb-1">Pays</label>
              <select value={bankCountry} onChange={(e) => { setBankCountry(e.target.value); setBankFields({}); }} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white focus:outline-none focus:border-[#7C5CFC]">
                {COUNTRIES.map((c) => <option key={c.code} value={c.code} className="bg-[#181A20]">{c.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10.5px] uppercase tracking-wider text-white/40 mb-1">Titulaire du compte</label>
              <input value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} placeholder="Titulaire du compte" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
            </div>
            {bankFieldsFor(bankCountry).map((f) => (
              <div key={f.key}>
                <label className="block text-[10.5px] uppercase tracking-wider text-white/40 mb-1">{f.label}</label>
                <input value={bankFields[f.key] || ''} onChange={(e) => setBankFields((b) => ({ ...b, [f.key]: e.target.value }))} placeholder={f.label} className={`w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC] ${f.mono ? 'font-mono' : ''}`} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button onClick={saveBank} disabled={savingBank} className="px-4 py-2 rounded-lg bg-[#7C5CFC] text-white text-[12.5px] font-semibold hover:bg-[#6a4cf0] disabled:opacity-60">{savingBank ? 'Enregistrement…' : 'Enregistrer mon RIB'}</button>
            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12.5px] cursor-pointer">
              <FileText className="h-3.5 w-3.5" /> {uploadingRib ? 'Envoi…' : (agency?.ribPdfUrl ? 'Remplacer le PDF du RIB' : 'Téléverser le PDF du RIB *')}
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadRib(f); e.currentTarget.value = ''; }} />
            </label>
            {agency?.ribPdfUrl && <a href={agency.ribPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11.5px] text-[#3DD68C] underline"><ShieldCheck className="h-3.5 w-3.5" /> PDF reçu</a>}
          </div>
          {!agency?.ribPdfUrl && <p className="text-[11.5px] text-[#FF9F0A] mt-2">Le PDF du RIB est obligatoire pour que Delivery Digital valide votre compte bancaire.</p>}
        </section>
        )}

        {/* Contrat de partenariat (signature electronique, validee cote superadmin) */}
        {isOwner && (
        <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[15px] font-bold">Contrat de partenariat</h2>
            {agency?.contract?.validated ? <span className="inline-flex items-center gap-1 text-[11.5px] text-[#3DD68C]"><ShieldCheck className="h-3.5 w-3.5" /> Validé par Delivery Digital</span>
              : agency?.contract?.signed ? <span className="text-[11.5px] text-[#FF9F0A]">Signé - en attente de validation</span>
              : <span className="text-[11.5px] text-white/40">Non signé</span>}
          </div>
          <p className="text-[12.5px] text-white/50 mt-1">En signant, vous acceptez les conditions du partenariat (commission {fix.toLocaleString('fr-FR')} € + {pct}% versée à la réception du paiement OPCO). La signature sera validée par Delivery Digital.</p>
          {agency?.contract?.signed ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[12.5px]">
              <p>Signé par <strong>{agency.contract.signedBy}</strong>{agency.contract.signedFunction ? ` (${agency.contract.signedFunction})` : ''}{agency.contract.signedAt ? ` le ${new Date(agency.contract.signedAt).toLocaleDateString('fr-FR')}` : ''}.</p>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider text-white/40 mb-1">Votre fonction</label>
                <input value={signFunction} onChange={(e) => setSignFunction(e.target.value)} placeholder="Gérant, président…" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C5CFC]" />
              </div>
              <button onClick={signContract} disabled={signing} className="px-4 py-2 rounded-lg bg-[#3DD68C] text-black text-[12.5px] font-semibold hover:brightness-110 disabled:opacity-60">{signing ? 'Signature…' : 'Signer le contrat'}</button>
            </div>
          )}
        </section>
        )}

        {/* Historique des paiements (owner uniquement) */}
        {isOwner && (
        <section className="rounded-2xl bg-[#181A20] border border-white/10">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-[15px] font-bold">Historique des paiements</h2>
            <span className="text-[12px] text-white/50">Total acquis : <strong className="text-[#3DD68C]">{paidDossiers.reduce((s, d) => s + earn(d), 0).toLocaleString('fr-FR')} €</strong></span>
          </div>
          {paidDossiers.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-white/40">Aucun paiement OPCO reçu pour l&apos;instant. La commission est versée dès que le dossier passe au statut « Payé ».</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="text-white/40 text-[10px] uppercase tracking-wider"><tr className="border-b border-white/5"><th className="text-left px-5 py-2.5">Date</th><th className="text-left px-5 py-2.5">Client</th><th className="text-left px-5 py-2.5">Montant HT</th><th className="text-right px-5 py-2.5">Votre commission</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {paidDossiers.map((d) => (
                    <tr key={d._id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-white/60">{new Date(d.updatedAt || d.createdAt || Date.now()).toLocaleDateString('fr-FR')}</td>
                      <td className="px-5 py-3"><p className="font-semibold">{d.denom || 'Client'}</p><p className="text-white/40 text-[11.5px]">{d.formationTitle}</p></td>
                      <td className="px-5 py-3 text-white/70">{(d.amountHT || 0).toLocaleString('fr-FR')} €</td>
                      <td className="px-5 py-3 text-right font-semibold text-[#3DD68C]">+ {earn(d).toLocaleString('fr-FR')} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        )}

        {/* API (owner uniquement) */}
        {isOwner && (
        <section className="rounded-2xl bg-[#181A20] border border-white/10 p-5">
          <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#7C5CFC]" /><h2 className="text-[15px] font-bold">API d&apos;intégration</h2></div>
          <p className="text-[12.5px] text-white/50 mt-1">Branchez votre système (lecture seule) : <code className="font-mono text-white/70">/api/agency/v1</code> · auth <code className="font-mono text-white/70">Bearer</code>. Endpoints : /me · /catalog · /devis.</p>
          <div className="mt-3">
            {agency?.apiKey ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-[12.5px] font-mono break-all">{showKey ? agency.apiKey : 'dd_agc_' + '•'.repeat(18)}</code>
                <button onClick={() => setShowKey((v) => !v)} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">{showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                <button onClick={() => navigator.clipboard?.writeText(agency.apiKey || '')} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"><Copy className="h-3.5 w-3.5" /></button>
                <button onClick={regenKey} disabled={busy} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12px] disabled:opacity-60">{busy ? '…' : 'Régénérer'}</button>
              </div>
            ) : (
              <button onClick={regenKey} disabled={busy} className="px-4 py-2 rounded-lg bg-[#7C5CFC] text-white text-[12.5px] font-semibold disabled:opacity-60">{busy ? 'Génération…' : 'Générer ma clé API'}</button>
            )}
          </div>
        </section>
        )}

        <p className="text-center text-[11px] text-white/30">© {new Date().getFullYear()} Delivery Digital · Espace Agence partenaire</p>
      </div>

      {dossierLead && (
        <FormationWizardModal
          employer={{ siret: dossierLead.siret || '', denom: dossierLead.denom || 'Client', opco: dossierLead.opco || 'OPCO EP', email: dossierLead.email } as WizardEmployer}
          submitting={transmitting}
          onClose={() => setDossierLead(null)}
          onTransmit={async (p: TransmitPayload) => {
            if (!dossierLead) return;
            setTransmitting(true);
            try {
              const sessionName = `Formation · ${p.startAt ? new Date(p.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'à confirmer'}`;
              const r = await fetch('/api/agency/self/transmit-dossier', { method: 'POST', headers: authJson(), body: JSON.stringify({ leadId: dossierLead._id, denom: dossierLead.denom, siret: dossierLead.siret, opco: dossierLead.opco, clientEmail: dossierLead.email, sessionName, formationTitle: p.formationTitle, salaries: p.salaries, signedBy: p.signedBy, signedFunction: p.signedFunction }) });
              const j = await r.json();
              if (j.ok) { setDossierLead(null); load(); alert('✓ Dossier transmis à Delivery Digital (convention signée par le client).'); }
              else alert('Erreur : ' + (j.error || 'transmission impossible'));
            } finally { setTransmitting(false); }
          }}
        />
      )}
    </main>
  );
}

function Kpi({ icon, label, value, accent, suffix }: { icon: React.ReactNode; label: string; value: number; accent: string; suffix?: string }) {
  return (
    <div className="rounded-2xl bg-[#181A20] border border-white/10 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider font-bold text-white/40">{label}</p>
        <span className="inline-flex h-8 w-8 rounded-lg items-center justify-center" style={{ background: `${accent}22`, color: accent }}>{icon}</span>
      </div>
      <p className="text-[28px] font-bold leading-none mt-2">{value.toLocaleString('fr-FR')}{suffix || ''}</p>
    </div>
  );
}
