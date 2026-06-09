import { useEffect, useState, useCallback } from 'react';
import { Building2, Loader2, Plus, RefreshCw, Copy, KeyRound, Eye, EyeOff, X, Mail, Trash2 } from 'lucide-react';

/**
 * Admin - gestion des agences partenaires (deliverydigital.fr).
 * Cree des comptes role 'agence' (login JWT existant + cle API d'integration).
 * @author Rabah Ziane - 2026-06-02
 */
type CompanyInfo = { legalName?: string; regNumber?: string; vatNumber?: string; address?: string; city?: string; postalCode?: string; country?: string; repName?: string; repFunction?: string };
type Contract = { signed?: boolean; signedBy?: string; signedFunction?: string; signedAt?: string | null; validated?: boolean };
type Agency = { _id: string; email: string; name: string; phone?: string; status?: string; apiKey?: string; createdAt?: string; last_login?: string; iban?: string; bic?: string; accountHolder?: string; bankCountry?: string; bankData?: Record<string, string>; ribPdfUrl?: string; bankValidated?: boolean; companyInfo?: CompanyInfo; contract?: Contract; onboardingValidated?: boolean; commissionFix?: number; commissionPercent?: number };
type EmailPreview = { to: string; subject: string; html: string };
type Created = { id: string; email: string; name: string; password: string; apiKey: string; emailPreview?: EmailPreview };

export default function AgencyAdmin({ secret }: { secret: string | null }) {
  const [list, setList] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fix, setFix] = useState('120');
  const [pct, setPct] = useState('15');
  const [creating, setCreating] = useState(false);
  type AdminSalarie = { firstname?: string; lastname?: string; email?: string; poste?: string; type_contrat?: string; date_naissance?: string; num_secu?: string; telephone?: string };
  type AdminDossier = { _id: string; agencyName?: string; commercialName?: string; denom?: string; siret?: string; opco?: string; addr?: string; clientEmail?: string; formationTitle?: string; sessionName?: string; sessionStart?: string; sessionEnd?: string; salaries?: AdminSalarie[]; signedBy?: string; signedFunction?: string; signedIp?: string; signatureDataUrl?: string; signedRemote?: boolean; signedAt?: string; amountHT?: number; status: string; createdAt?: string; updatedAt?: string; commission?: number; agencyIban?: string; agencyBic?: string; agencyHolder?: string; opcoPaid?: boolean; encashRequestedAt?: string | null; invoiceNumber?: string };
  const [dossiers, setDossiers] = useState<AdminDossier[]>([]);
  const [factureDossier, setFactureDossier] = useState<AdminDossier | null>(null);
  const [viewDossier, setViewDossier] = useState<AdminDossier | null>(null);
  const [selDoss, setSelDoss] = useState<Set<string>>(new Set());
  const DOSSIER_STATUSES = ['transmitted', 'instruction', 'accepted', 'scheduled', 'completed', 'invoiced', 'paid', 'rejected'];
  const DOSSIER_LABEL: Record<string, string> = { transmitted: 'Transmis', instruction: 'En instruction', accepted: 'Accepté', scheduled: 'Programmé', completed: 'Terminé', invoiced: 'Facturé', paid: 'Payé', rejected: 'Refusé' };
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [sendEmail, setSendEmail] = useState(true);          // envoyer les accès par email à l'agence
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null); // aperçu avant envoi
  const [pendingSend, setPendingSend] = useState<{ agencyId: string; agencyName?: string; password: string; regenerate: boolean; hasPassword?: boolean } | null>(null);
  const [regenAgency, setRegenAgency] = useState<string | null>(null);
  const [sendingWelcome, setSendingWelcome] = useState(false);
  const [welcomeSent, setWelcomeSent] = useState(false);
  const [previewingAgency, setPreviewingAgency] = useState<string | null>(null); // chargement aperçu depuis la liste
  const [revealKey, setRevealKey] = useState<Record<string, boolean>>({});
  const [accessReqs, setAccessReqs] = useState<{ id: string; agencyName?: string; clientEmail: string; clientName?: string; label: string; status: string; receivedAt?: string }[]>([]);
  const [unavail, setUnavail] = useState<{ id: string; day: string; label: string }[]>([]);
  const [newUnavailDay, setNewUnavailDay] = useState('');
  const [newUnavailLabel, setNewUnavailLabel] = useState('');
  const [revealed, setRevealed] = useState<Record<string, { login: string; password?: string; note?: string }>>({});
  const [stats, setStats] = useState<{ agencies: number; commerciaux: number; clients: number; dossiers: number; transmitted: number; volumeHT: number; stagiaires: number; commissionsDue: number; commissionsPaid: number } | null>(null);
  const [showCommerciaux, setShowCommerciaux] = useState(false);
  const [commerciauxList, setCommerciauxList] = useState<{ id: string; name: string; email: string; agence: string; status: string; dossiers: number }[]>([]);
  const [showClients, setShowClients] = useState(false);
  const [clientsList, setClientsList] = useState<{ id: string; denom: string; email?: string; opco?: string; agence: string; commercial?: string; status: string }[]>([]);
  const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const headers = useCallback(() => ({ 'x-admin-secret': secret || '', 'Content-Type': 'application/json' }), [secret]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/agencies', { headers: { 'x-admin-secret': secret || '' } });
      const j = await r.json();
      setList(j.agencies || []);
      const ar = await fetch('/api/admin/access-requests', { headers: { 'x-admin-secret': secret || '' } }).then((x) => x.json()).catch(() => ({}));
      if (ar.ok) setAccessReqs(ar.requests || []);
      const dj = await fetch('/api/admin/agencies/dossiers', { headers: { 'x-admin-secret': secret || '' } }).then((x) => x.json()).catch(() => ({}));
      if (dj.ok) setDossiers(dj.dossiers || []);
      const uj = await fetch('/api/admin/agencies/unavailabilities', { headers: { 'x-admin-secret': secret || '' } }).then((x) => x.json()).catch(() => ({}));
      if (uj.ok) setUnavail(uj.days || []);
      const sj = await fetch('/api/admin/agencies/stats', { headers: { 'x-admin-secret': secret || '' } }).then((x) => x.json()).catch(() => ({}));
      if (sj.ok) setStats(sj);
    } finally { setLoading(false); }
  }, [secret]);

  async function addUnavail() {
    if (!newUnavailDay) return;
    const r = await fetch('/api/admin/agencies/unavailabilities', { method: 'POST', headers: headers(), body: JSON.stringify({ day: newUnavailDay, label: newUnavailLabel.trim() || undefined }) });
    const j = await r.json();
    if (j.ok) { setNewUnavailDay(''); setNewUnavailLabel(''); load(); }
    else alert('Erreur : ' + (j.error || 'jour invalide'));
  }
  async function removeUnavail(id: string) {
    await fetch(`/api/admin/agencies/unavailabilities/${id}`, { method: 'DELETE', headers: headers() });
    setUnavail((p) => p.filter((u) => u.id !== id));
  }

  async function setDossierStatus(id: string, status: string) {
    setDossiers((prev) => prev.map((d) => d._id === id ? { ...d, status } : d));
    await fetch(`/api/admin/agencies/dossiers/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ status }) });
  }
  function toggleSel(id: string) { setSelDoss((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  async function markOpcoPaid(id: string, opcoPaid: boolean) {
    setDossiers((prev) => prev.map((d) => d._id === id ? { ...d, opcoPaid } : d));
    await fetch(`/api/admin/agencies/dossiers/${id}/opco-paid`, { method: 'POST', headers: headers(), body: JSON.stringify({ opcoPaid }) });
  }
  // Suppression DOUCE d'un dossier (superadmin) : hidden=true, pas de DELETE en base (réversible).
  // @author Rabah Ziane · 2026-06-09
  async function deleteDossier(d: AdminDossier) {
    if (!confirm(`Supprimer le dossier de « ${d.denom || 'ce client'} » ?\n\nIl disparaît de la liste (suppression douce, réversible).`)) return;
    setDossiers((prev) => prev.filter((x) => x._id !== d._id));
    await fetch(`/api/admin/agencies/dossiers/${d._id}`, { method: 'DELETE', headers: headers() });
  }
  async function paySelected() {
    const ids = [...selDoss];
    if (!ids.length) return;
    const sel = dossiers.filter((d) => selDoss.has(d._id));
    const ibans = [...new Set(sel.map((d) => d.agencyIban).filter(Boolean))];
    const total = sel.reduce((s, d) => s + (d.commission || 0), 0);
    if (!confirm(`Marquer ${ids.length} dossier(s) comme PAYE(S) ?\n\nCommission totale a verser : ${total} EUR\nRIB : ${ibans.join(', ') || '(RIB non renseigne)'}`)) return;
    await fetch('/api/admin/agencies/dossiers/pay', { method: 'POST', headers: headers(), body: JSON.stringify({ ids }) });
    setSelDoss(new Set());
    load();
  }
  useEffect(() => { load(); }, [load]);

  async function validateBank(id: string, validated: boolean) {
    const r = await fetch(`/api/admin/agencies/${id}/validate-bank`, { method: 'POST', headers: headers(), body: JSON.stringify({ validated }) });
    const j = await r.json();
    if (j.ok) setList((prev) => prev.map((a) => a._id === id ? { ...a, bankValidated: j.bankValidated } : a));
  }
  async function validateOnboarding(id: string, validated: boolean) {
    const r = await fetch(`/api/admin/agencies/${id}/validate-onboarding`, { method: 'POST', headers: headers(), body: JSON.stringify({ validated }) });
    const j = await r.json();
    if (j.ok) setList((prev) => prev.map((a) => a._id === id ? { ...a, onboardingValidated: j.onboardingValidated, bankValidated: j.bankValidated, contract: a.contract ? { ...a.contract, validated: j.onboardingValidated } : a.contract } : a));
  }

  async function revealAccess(id: string) {
    const r = await fetch(`/api/admin/access-requests/${id}/reveal`, { method: 'POST', headers: headers() });
    const j = await r.json();
    if (j.ok) setRevealed((p) => ({ ...p, [id]: { login: j.login, password: j.password, note: j.note } }));
    else alert('Erreur : ' + (j.error || 'déchiffrement impossible'));
  }

  async function create() {
    setError(null);
    if (!name.trim() || !email.trim()) { setError('Nom + email requis'); return; }
    setCreating(true);
    try {
      const r = await fetch('/api/admin/agencies', { method: 'POST', headers: headers(), body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, commissionFix: Number(fix) || 0, commissionPercent: Number(pct) || 0 }) });
      const j = await r.json();
      if (!r.ok) { setError(j.error === 'email_exists' ? 'Cet email existe déjà' : (j.error || 'Erreur')); return; }
      setCreated({ id: j.agency.id, email: j.agency.email, name: j.agency.name, password: j.password, apiKey: j.apiKey, emailPreview: j.emailPreview });
      setWelcomeSent(false);
      // Si l'option "envoyer par email" est cochée : on ouvre d'abord l'aperçu pour validation.
      if (sendEmail && j.emailPreview) { setEmailPreview(j.emailPreview); setPendingSend({ agencyId: j.agency.id, agencyName: j.agency.name, password: j.password, regenerate: true }); }
      setName(''); setEmail(''); setPhone('');
      load();
    } finally { setCreating(false); }
  }

  // RENVOYER LES ACCÈS (depuis la liste) - NE change PAS le mot de passe. @author Rabah Ziane - 2026-06-06
  async function previewResend(id: string) {
    setPreviewingAgency(id);
    try {
      const r = await fetch(`/api/admin/agencies/${id}/welcome-preview`, { method: 'POST', headers: headers() });
      const j = await r.json();
      if (!j.ok) { alert('Aperçu impossible : ' + (j.error || 'erreur')); return; }
      setWelcomeSent(false);
      setEmailPreview(j.emailPreview);
      setPendingSend({ agencyId: j.agency.id, agencyName: j.agency.name, password: '', regenerate: false, hasPassword: j.hasPassword });
    } finally { setPreviewingAgency(null); }
  }

  // RÉGÉNÉRER LE MOT DE PASSE (seule action qui change le mot de passe). @author Rabah Ziane - 2026-06-06
  async function openCommerciaux() {
    setShowCommerciaux(true);
    const j = await fetch('/api/admin/agencies/commerciaux', { headers: headers() }).then((r) => r.json()).catch(() => ({}));
    if (j.ok) setCommerciauxList(j.commerciaux || []);
  }
  async function openClients() {
    setShowClients(true);
    const j = await fetch('/api/admin/agencies/clients', { headers: headers() }).then((r) => r.json()).catch(() => ({}));
    if (j.ok) setClientsList(j.clients || []);
  }

  async function regeneratePw(id: string) {
    if (!confirm("Régénérer le mot de passe de cette agence ? L'ancien ne fonctionnera plus (l'agence devra utiliser le nouveau, affiché ensuite).")) return;
    setRegenAgency(id);
    try {
      const r = await fetch(`/api/admin/agencies/${id}/regenerate-preview`, { method: 'POST', headers: headers() });
      const j = await r.json();
      if (!j.ok) { alert('Régénération impossible : ' + (j.error || 'erreur')); return; }
      setWelcomeSent(false);
      setEmailPreview(j.emailPreview);
      setPendingSend({ agencyId: j.agency.id, agencyName: j.agency.name, password: j.password, regenerate: true });
    } finally { setRegenAgency(null); }
  }

  // Envoi de l'email (après validation de l'aperçu). Inclut le mot de passe uniquement si régénération.
  async function sendWelcome() {
    if (!pendingSend) return;
    setSendingWelcome(true);
    try {
      const r = await fetch(`/api/admin/agencies/${pendingSend.agencyId}/send-welcome`, { method: 'POST', headers: headers(), body: JSON.stringify({ password: pendingSend.regenerate ? pendingSend.password : '' }) });
      const j = await r.json();
      if (j.ok) { setWelcomeSent(true); setEmailPreview(null); setPendingSend(null); alert(`✓ Email envoyé à ${j.sentTo}.`); }
      else alert('Envoi impossible : ' + (j.error || 'erreur'));
    } finally { setSendingWelcome(false); }
  }

  async function regenKey(id: string) {
    if (!confirm("Régénérer la clé API ? L'ancienne ne fonctionnera plus.")) return;
    const r = await fetch(`/api/admin/agencies/${id}/api-key`, { method: 'POST', headers: headers() });
    const j = await r.json();
    if (r.ok) { setList((prev) => prev.map((a) => a._id === id ? { ...a, apiKey: j.apiKey } : a)); setRevealKey((p) => ({ ...p, [id]: true })); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-[#1D1D1F]" />
        <h2 className="text-xl font-bold text-[#1D1D1F]">Agences partenaires</h2>
      </div>
      <p className="text-[13px] text-[#86868B] -mt-3">Comptes des agences qui revendent vos prestations. Connexion sur <span className="font-mono">/agence</span>, clé API pour intégrer leur système.</p>

      {/* Chiffres globaux des agences - chaque carte mène au détail */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {([
            ['Agences', stats.agencies.toLocaleString('fr-FR'), '#0066CC', () => scrollToId('sec-agencies')],
            ['Commerciaux', stats.commerciaux.toLocaleString('fr-FR'), '#0A84FF', openCommerciaux],
            ['Clients', stats.clients.toLocaleString('fr-FR'), '#1D1D1F', openClients],
            ['Dossiers OPCO', `${stats.dossiers.toLocaleString('fr-FR')}${stats.transmitted ? ` · ${stats.transmitted} à traiter` : ''}`, '#1D1D1F', () => scrollToId('sec-dossiers')],
            ['Volume facturé', `${stats.volumeHT.toLocaleString('fr-FR')} €`, '#1D1D1F', () => scrollToId('sec-dossiers')],
            ['Stagiaires', stats.stagiaires.toLocaleString('fr-FR'), '#1D1D1F', () => scrollToId('sec-dossiers')],
            ['Commissions à verser', `${stats.commissionsDue.toLocaleString('fr-FR')} €`, '#FF9F0A', () => scrollToId('sec-dossiers')],
            ['Commissions versées', `${stats.commissionsPaid.toLocaleString('fr-FR')} €`, '#34C759', () => scrollToId('sec-dossiers')],
          ] as Array<[string, string, string, () => void]>).map(([label, value, color, onClick]) => (
            <button key={label} onClick={onClick} className="text-left rounded-xl bg-white border border-black/10 p-3.5 hover:border-black/25 hover:shadow-sm transition group">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#86868B]">{label}</p>
              <p className="text-[18px] font-extrabold mt-1" style={{ color }}>{value}</p>
              <p className="text-[10px] text-[#86868B] mt-1 opacity-0 group-hover:opacity-100 transition">Voir le détail ›</p>
            </button>
          ))}
        </div>
      )}

      {/* Modal Commerciaux (détail) */}
      {showCommerciaux && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowCommerciaux(false)}>
          <div className="w-full max-w-2xl my-8 bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/10"><h3 className="text-[15px] font-bold">Commerciaux ({commerciauxList.length})</h3><button onClick={() => setShowCommerciaux(false)} className="h-8 w-8 rounded-full hover:bg-black/[0.05] inline-flex items-center justify-center"><X className="h-4 w-4" /></button></div>
            <div className="max-h-[64vh] overflow-y-auto">
              {commerciauxList.length === 0 ? <p className="px-5 py-8 text-center text-[13px] text-[#86868B]">Aucun commercial.</p> : (
                <table className="w-full text-[12.5px]"><thead className="text-[#86868B] text-[10px] uppercase tracking-wider"><tr className="border-b border-black/5"><th className="text-left px-5 py-2.5">Commercial</th><th className="text-left px-5 py-2.5">Agence</th><th className="text-left px-5 py-2.5">Dossiers</th><th className="text-left px-5 py-2.5">Statut</th></tr></thead>
                  <tbody className="divide-y divide-black/5">{commerciauxList.map((c) => (<tr key={c.id} className="hover:bg-black/[0.02]"><td className="px-5 py-2.5"><p className="font-medium text-[#1D1D1F]">{c.name}</p><p className="text-[#86868B] text-[11px]">{c.email}</p></td><td className="px-5 py-2.5 text-[#86868B]">{c.agence}</td><td className="px-5 py-2.5 font-semibold">{c.dossiers}</td><td className="px-5 py-2.5">{c.status === 'active' ? <span className="text-[#34C759]">actif</span> : c.status}</td></tr>))}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Clients (détail) */}
      {showClients && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowClients(false)}>
          <div className="w-full max-w-3xl my-8 bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/10"><h3 className="text-[15px] font-bold">Clients ({clientsList.length})</h3><button onClick={() => setShowClients(false)} className="h-8 w-8 rounded-full hover:bg-black/[0.05] inline-flex items-center justify-center"><X className="h-4 w-4" /></button></div>
            <div className="max-h-[64vh] overflow-y-auto">
              {clientsList.length === 0 ? <p className="px-5 py-8 text-center text-[13px] text-[#86868B]">Aucun client.</p> : (
                <table className="w-full text-[12.5px]"><thead className="text-[#86868B] text-[10px] uppercase tracking-wider"><tr className="border-b border-black/5"><th className="text-left px-5 py-2.5">Client</th><th className="text-left px-5 py-2.5">OPCO</th><th className="text-left px-5 py-2.5">Agence</th><th className="text-left px-5 py-2.5">Commercial</th><th className="text-left px-5 py-2.5">Statut</th></tr></thead>
                  <tbody className="divide-y divide-black/5">{clientsList.map((c) => (<tr key={c.id} className="hover:bg-black/[0.02]"><td className="px-5 py-2.5"><p className="font-medium text-[#1D1D1F]">{c.denom || '-'}</p><p className="text-[#86868B] text-[11px]">{c.email || c.siret || ''}</p></td><td className="px-5 py-2.5 text-[#86868B]">{c.opco || '-'}</td><td className="px-5 py-2.5 text-[#86868B]">{c.agence}</td><td className="px-5 py-2.5 text-[#86868B]">{c.commercial || '—'}</td><td className="px-5 py-2.5">{c.status}</td></tr>))}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Creation */}
      <div className="rounded-2xl bg-white border border-black/10 p-5">
        <h3 className="font-semibold text-[14px] mb-3">Ajouter une agence</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de l'agence *" className="px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" className="px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone (optionnel)" className="px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-1">Commission fixe (€ / dossier)</label>
            <input type="number" value={fix} onChange={(e) => setFix(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-1">Commission (% du montant HT)</label>
            <input type="number" value={pct} onChange={(e) => setPct(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" />
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="w-4 h-4" />
          <span className="text-[12.5px] text-[#3a3a3c]">Envoyer les accès par email à l'agence (un aperçu s'affiche pour validation avant l'envoi)</span>
        </label>
        {error && <p className="text-[12.5px] text-[#FF3B30] mt-2">{error}</p>}
        <button onClick={create} disabled={creating} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[12.5px] font-semibold hover:bg-black disabled:opacity-60">
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Créer l'agence
        </button>

        {created && (
          <div className="mt-4 rounded-xl border-2 border-[#34C759]/40 bg-[#34C759]/5 p-4 text-[13px]">
            <p className="font-semibold text-[#1D1D1F] mb-1">Agence créée : {created.name}</p>
            <p className="text-[#86868B]">Transmettez ces accès à l'agence (affiché une seule fois) :</p>
            <div className="mt-2 space-y-1 font-mono text-[12.5px]">
              <p>Login : <strong className="select-all">{created.email}</strong></p>
              <p>Mot de passe : <strong className="select-all">{created.password}</strong></p>
              <p className="break-all">Clé API : <strong className="select-all">{created.apiKey}</strong></p>
            </div>
            {welcomeSent && <p className="mt-2 text-[12px] text-[#34C759] font-semibold">✓ Email d'accès envoyé à {created.email}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              <button onClick={() => navigator.clipboard?.writeText(`Login: ${created.email}\nMot de passe: ${created.password}\nClé API: ${created.apiKey}\nEspace: https://deliverydigital.fr/agence`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1D1D1F] text-white text-[11.5px]"><Copy className="h-3 w-3" /> Copier</button>
              {created.emailPreview && !welcomeSent && <button onClick={() => { setEmailPreview(created.emailPreview!); setPendingSend({ agencyId: created.id, agencyName: created.name, password: created.password, regenerate: true }); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0066CC] text-white text-[11.5px]">Aperçu + envoyer l'email</button>}
              <button onClick={() => { setCreated(null); setEmailPreview(null); }} className="px-3 py-1.5 rounded-full border border-black/10 text-[11.5px]">Fermer</button>
            </div>
          </div>
        )}
      </div>

      {/* Aperçu de l'email de bienvenue avant envoi (validation par l'admin) */}
      {emailPreview && pendingSend && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={() => { setEmailPreview(null); setPendingSend(null); }}>
          <div className="w-full max-w-2xl my-6 bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/10">
              <div><p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#86868B]">Aperçu de l'email{pendingSend.agencyName ? ` · ${pendingSend.agencyName}` : ''}</p><h3 className="text-[15px] font-bold text-[#1D1D1F]">Validez avant l'envoi</h3></div>
              <button onClick={() => { setEmailPreview(null); setPendingSend(null); }} className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-black/5 hover:bg-black/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-5 py-3 border-b border-black/10 text-[12.5px] text-[#3a3a3c] space-y-0.5">
              <p><span className="text-[#86868B]">À :</span> <strong>{emailPreview.to}</strong></p>
              <p><span className="text-[#86868B]">Objet :</span> {emailPreview.subject}</p>
              {pendingSend.regenerate
                ? <p className="text-[#FF9F0A] text-[11.5px] mt-1">⚠️ Un nouveau mot de passe a été généré et <strong>appliqué</strong> (l'ancien ne fonctionne plus). Il figure dans cet email.</p>
                : pendingSend.hasPassword
                ? <p className="text-[#34C759] text-[11.5px] mt-1">✓ Mot de passe <strong>inchangé</strong> : c'est le mot de passe <strong>actuel</strong> qui est rappelé dans cet email.</p>
                : <p className="text-[#FF9F0A] text-[11.5px] mt-1">Aucun mot de passe enregistré pour ce compte (créé avant cette fonction). Cliquez <strong>« Régénérer mdp »</strong> pour en définir un visible.</p>}
            </div>
            <div className="max-h-[52vh] overflow-y-auto bg-[#f5f5f7]">
              <iframe title="Aperçu email" srcDoc={emailPreview.html} className="w-full h-[480px] border-0" />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-black/10">
              <button onClick={() => { setEmailPreview(null); setPendingSend(null); }} className="px-4 py-2 rounded-full border border-black/10 text-[12.5px]">Ne pas envoyer</button>
              <button onClick={sendWelcome} disabled={sendingWelcome} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED] disabled:opacity-60">{sendingWelcome ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Envoyer l'email</button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      <div id="sec-agencies" className="scroll-mt-4 rounded-2xl bg-white border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10 flex items-center justify-between">
          <h3 className="font-semibold text-[14px]">{list.length} agence{list.length > 1 ? 's' : ''}</h3>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-[12px] text-[#86868B] hover:text-[#1D1D1F]"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Rafraîchir</button>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-center text-[13px] text-[#86868B]">Chargement…</p>
        ) : list.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[#86868B]">Aucune agence pour l'instant.</p>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead className="text-[#86868B] text-[10px] uppercase tracking-wider">
              <tr className="border-b border-black/5">
                <th className="text-left px-5 py-2.5">Agence</th>
                <th className="text-left px-5 py-2.5">Clé API</th>
                <th className="text-left px-5 py-2.5">Dernière connexion</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {list.map((a) => (
                <tr key={a._id} className="hover:bg-black/[0.02]">
                  <td className="px-5 py-2.5"><p className="font-semibold text-[#1D1D1F]">{a.name}</p><p className="text-[#86868B]">{a.email}</p></td>
                  <td className="px-5 py-2.5">
                    {a.apiKey ? (
                      <span className="inline-flex items-center gap-1.5">
                        <code className="font-mono text-[11.5px]">{revealKey[a._id] ? a.apiKey : 'dd_agc_••••••••'}</code>
                        <button onClick={() => setRevealKey((p) => ({ ...p, [a._id]: !p[a._id] }))} className="text-[#86868B] hover:text-[#1D1D1F]">{revealKey[a._id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                        {revealKey[a._id] && <button onClick={() => navigator.clipboard?.writeText(a.apiKey || '')} className="text-[#86868B] hover:text-[#1D1D1F]"><Copy className="h-3.5 w-3.5" /></button>}
                      </span>
                    ) : <span className="text-[#86868B]">-</span>}
                  </td>
                  <td className="px-5 py-2.5 text-[#86868B]">{a.last_login ? new Date(a.last_login).toLocaleDateString('fr-FR') : <span className="italic">Jamais</span>}</td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="inline-flex items-center gap-3 justify-end">
                      <button onClick={() => previewResend(a._id)} disabled={previewingAgency === a._id} title="Renvoyer l'email d'accès SANS changer le mot de passe" className="inline-flex items-center gap-1 text-[11.5px] text-[#0066CC] hover:text-[#0077ED] disabled:opacity-50">{previewingAgency === a._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Renvoyer accès</button>
                      <button onClick={() => regeneratePw(a._id)} disabled={regenAgency === a._id} title="Générer un NOUVEAU mot de passe (l'ancien ne marchera plus)" className="inline-flex items-center gap-1 text-[11.5px] text-[#FF9F0A] hover:text-[#e08e00] disabled:opacity-50">{regenAgency === a._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Régénérer mdp</button>
                      <button onClick={() => regenKey(a._id)} title="Régénérer la clé API" className="inline-flex items-center gap-1 text-[11.5px] text-[#86868B] hover:text-[#1D1D1F]"><KeyRound className="h-3.5 w-3.5" /> Clé</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Validation des comptes partenaires : infos entreprise + RIB (PDF) + contrat signe */}
      <div className="rounded-2xl bg-white border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10"><h3 className="font-semibold text-[14px]">Validation des comptes partenaires</h3><p className="text-[12px] text-[#86868B] mt-0.5">Vérifiez les infos entreprise, le RIB (PDF) et le contrat signé, puis validez.</p></div>
        {list.filter((a) => a.companyInfo?.legalName || a.ribPdfUrl || a.contract?.signed).length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[#86868B]">Aucune demande d'activation pour l'instant.</p>
        ) : (
          <div className="divide-y divide-black/5">
            {list.filter((a) => a.companyInfo?.legalName || a.ribPdfUrl || a.contract?.signed).map((a) => {
              const ci = a.companyInfo || {};
              const bf = a.bankData && Object.keys(a.bankData).length ? a.bankData : { iban: a.iban || '', bic: a.bic || '' };
              return (
                <div key={a._id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-[#1D1D1F]">{ci.legalName || a.name} {a.onboardingValidated && <span className="ml-1 text-[11.5px] text-[#34C759]">· validé ✓</span>}</p>
                      <p className="text-[12px] text-[#86868B]">{a.name} · {a.email}</p>
                    </div>
                    <div className="flex gap-2">
                      {a.onboardingValidated
                        ? <button onClick={() => validateOnboarding(a._id, false)} className="px-3 py-1.5 rounded-full border border-black/10 text-[11.5px]">Annuler la validation</button>
                        : <button onClick={() => validateOnboarding(a._id, true)} className="px-3.5 py-1.5 rounded-full bg-[#34C759] text-white text-[11.5px] font-semibold">Valider le compte</button>}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-x-6 gap-y-1 mt-3 text-[12px]">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#86868B] mb-0.5">Entreprise</p>
                      <p>{ci.regNumber ? `N° ${ci.regNumber}` : <span className="text-[#FF9F0A]">infos manquantes</span>}</p>
                      <p className="text-[#86868B]">{[ci.address, ci.postalCode, ci.city, ci.country].filter(Boolean).join(', ')}</p>
                      <p className="text-[#86868B]">{[ci.repName, ci.repFunction].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#86868B] mb-0.5">RIB ({a.bankCountry || 'FR'})</p>
                      <p className="text-[#86868B]">{a.accountHolder || '-'}</p>
                      <p className="font-mono text-[11px] break-all">{Object.values(bf).filter(Boolean).join(' · ') || '-'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {a.ribPdfUrl ? <a href={a.ribPdfUrl} target="_blank" rel="noreferrer" className="text-[#0A84FF] underline text-[11.5px]">Voir le PDF</a> : <span className="text-[#FF9F0A] text-[11.5px]">PDF manquant</span>}
                        {a.bankValidated ? <span className="text-[#34C759] text-[11.5px]">· validé</span>
                          : <button onClick={() => validateBank(a._id, true)} disabled={!a.ribPdfUrl} className="text-[11.5px] text-[#0A84FF] underline disabled:opacity-40 disabled:no-underline">Valider le RIB</button>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#86868B] mb-0.5">Contrat</p>
                      {a.contract?.signed
                        ? <>
                            <p>Signé par <strong>{a.contract.signedBy}</strong>{a.contract.signedFunction ? ` (${a.contract.signedFunction})` : ''}{a.contract.signedAt ? `, le ${new Date(a.contract.signedAt).toLocaleDateString('fr-FR')}` : ''}</p>
                            <button onClick={() => printContract(a)} className="mt-1 text-[#0A84FF] underline text-[11.5px]">Voir le contrat signé</button>
                          </>
                        : <><p className="text-[#FF9F0A]">Non signé</p><button onClick={() => printContract(a)} className="mt-1 text-[#0A84FF] underline text-[11.5px]">Voir le contrat</button></>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ordres d'encaissement reçus : l'agence a demandé son versement (facture jointe) */}
      {dossiers.some((d) => d.encashRequestedAt && d.status !== 'paid') && (
        <div className="rounded-2xl bg-white border-2 border-[#FF9F0A]/40 overflow-hidden">
          <div className="px-5 py-3 border-b border-black/10"><h3 className="font-semibold text-[14px]">Ordres d'encaissement reçus</h3><p className="text-[12px] text-[#86868B] mt-0.5">Les agences demandent le versement de leur commission. Faites le virement sur le RIB puis marquez « Payé ».</p></div>
          <table className="w-full text-[12.5px]">
            <thead className="text-[#86868B] text-[10px] uppercase tracking-wider"><tr className="border-b border-black/5"><th className="text-left px-5 py-2.5">Agence</th><th className="text-left px-5 py-2.5">Client</th><th className="text-left px-5 py-2.5">Commission</th><th className="text-left px-5 py-2.5">RIB</th><th className="text-right px-5 py-2.5">Action</th></tr></thead>
            <tbody className="divide-y divide-black/5">
              {dossiers.filter((d) => d.encashRequestedAt && d.status !== 'paid').map((d) => (
                <tr key={d._id} className="hover:bg-black/[0.02] align-top">
                  <td className="px-5 py-3"><p className="font-semibold text-[#1D1D1F]">{d.agencyName || '-'}</p><p className="text-[#86868B] text-[11px] font-mono">{d.invoiceNumber || ''}</p></td>
                  <td className="px-5 py-3"><p>{d.denom || 'Client'}</p><p className="text-[#86868B] text-[11px]">{d.formationTitle}</p><p className="text-[#86868B] text-[11px]">Déposé le {d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '-'}</p></td>
                  <td className="px-5 py-3 font-semibold text-[#1D1D1F]">{(d.commission || 0).toLocaleString('fr-FR')} €</td>
                  <td className="px-5 py-3 font-mono text-[11px]">{d.agencyIban ? <span title={`${d.agencyHolder || ''} ${d.agencyBic || ''}`}>{d.agencyIban}</span> : <span className="text-[#FF9F0A]">non renseigné</span>}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setFactureDossier(d)} className="px-2.5 py-1 rounded-md border border-black/10 text-[11px] mr-1.5 hover:bg-black/[0.03]">Voir facture</button>
                    <button onClick={() => setDossierStatus(d._id, 'paid')} className="px-2.5 py-1 rounded-md bg-[#34C759] text-white text-[11px] font-semibold">Virement fait · Payé</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Facture de commission de l'agence (popup) */}
      {factureDossier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={() => setFactureDossier(null)}>
          <div className="w-full max-w-xl my-6 bg-white rounded-xl shadow-2xl px-8 py-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-black/10 pb-3">
              <div><p className="text-[10px] uppercase tracking-[0.2em] text-[#86868B] font-bold">Facture de commission</p><h3 className="text-[17px] font-extrabold mt-1">{factureDossier.invoiceNumber || '—'}</h3></div>
              <button onClick={() => setFactureDossier(null)} className="text-[#86868B] text-[13px]">Fermer</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4 text-[12px]">
              <div><p className="text-[10px] uppercase tracking-wider text-[#86868B] font-bold">Émetteur</p><p className="font-semibold mt-1">{factureDossier.agencyName}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-[#86868B] font-bold">Destinataire</p><p className="font-semibold mt-1">Delivery Digital Nice</p><p className="text-[#86868B]">SIRET 90294519500029</p></div>
            </div>
            <table className="w-full text-[12.5px] mt-4">
              <tbody>
                <tr className="border-b border-black/5"><td className="py-2.5">Commission apport d'affaires - {factureDossier.denom}<br /><span className="text-[#86868B] text-[11px]">{factureDossier.formationTitle}</span></td><td className="py-2.5 text-right font-semibold">{(factureDossier.commission || 0).toLocaleString('fr-FR')} €</td></tr>
                <tr><td className="py-2.5 font-bold">Total à virer</td><td className="py-2.5 text-right font-extrabold text-[16px]">{(factureDossier.commission || 0).toLocaleString('fr-FR')} €</td></tr>
              </tbody>
            </table>
            <div className="mt-3 rounded-lg bg-black/[0.03] border border-black/5 p-3 text-[12px]">
              <p className="text-[10px] uppercase tracking-wider text-[#86868B] font-bold">Virement vers</p>
              <p className="mt-1">{factureDossier.agencyHolder || factureDossier.agencyName}</p>
              <p className="font-mono">{factureDossier.agencyIban || '(IBAN non renseigné)'} {factureDossier.agencyBic ? `· ${factureDossier.agencyBic}` : ''}</p>
            </div>
            <button onClick={() => { setDossierStatus(factureDossier._id, 'paid'); setFactureDossier(null); }} className="mt-4 w-full px-4 py-2.5 rounded-full bg-[#34C759] text-white text-[13px] font-semibold">Virement effectué · marquer Payé</button>
          </div>
        </div>
      )}

      {/* Detail d'un dossier OPCO : toutes les infos + telechargement convention / stagiaires PDF */}
      {viewDossier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={() => setViewDossier(null)}>
          <div className="w-full max-w-3xl my-6 bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-black/10 flex items-start justify-between">
              <div><p className="text-[10px] uppercase tracking-[0.18em] text-[#86868B] font-bold">Dossier OPCO · {viewDossier.invoiceNumber || `DOS-${new Date(viewDossier.createdAt || Date.now()).getFullYear()}-${viewDossier._id.slice(-5).toUpperCase()}`}</p><h3 className="text-[18px] font-extrabold mt-0.5">{viewDossier.denom || 'Client'}</h3><p className="text-[12px] text-[#86868B]">{viewDossier.formationTitle}</p></div>
              <button onClick={() => setViewDossier(null)} className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-black/[0.05] text-[#86868B]"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-6 py-5 max-h-[64vh] overflow-y-auto">
              {/* Frise de suivi du dossier (Stripe-like) */}
              <AdminDossierTimeline d={viewDossier} />

              {/* Statut convention signée */}
              <div className={`mt-4 rounded-xl border p-3 flex items-start gap-3 ${viewDossier.signatureDataUrl || viewDossier.signedBy ? 'border-[#34C759]/40 bg-[#34C759]/5' : 'border-black/10 bg-black/[0.02]'}`}>
                <div className="flex-1">
                  <p className="text-[12px] font-bold text-[#1D1D1F]">{viewDossier.signatureDataUrl || viewDossier.signedBy ? '✓ Convention signée par le client' : 'Convention non signée'}</p>
                  <p className="text-[11.5px] text-[#86868B] mt-0.5">
                    {viewDossier.signedBy ? <>Par <strong className="text-[#1D1D1F]">{viewDossier.signedBy}</strong>{viewDossier.signedFunction ? ` (${viewDossier.signedFunction})` : ''}</> : '—'}
                    {viewDossier.signedAt ? ` · le ${new Date(viewDossier.signedAt).toLocaleDateString('fr-FR')}` : (viewDossier.createdAt ? ` · le ${new Date(viewDossier.createdAt).toLocaleDateString('fr-FR')}` : '')}
                    {viewDossier.signedRemote != null ? ` · ${viewDossier.signedRemote ? 'à distance (lien)' : 'en personne'}` : ''}
                    {viewDossier.signedIp ? ` · IP ${viewDossier.signedIp}` : ''}
                  </p>
                </div>
                {viewDossier.signatureDataUrl && <img src={viewDossier.signatureDataUrl} alt="Signature client" className="h-12 w-auto bg-white rounded border border-black/10" />}
              </div>

              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 text-[12.5px] mt-4">
                {([
                  ['Agence', viewDossier.agencyName],
                  ['Commercial', viewDossier.commercialName ? `${viewDossier.commercialName} (agence ${viewDossier.agencyName || '-'})` : 'Aucun (dossier de l\'agence)'],
                  ['Bénéficiaire', viewDossier.denom], ['SIRET', viewDossier.siret || '-'],
                  ['OPCO', viewDossier.opco || '-'], ['Adresse', viewDossier.addr || '-'],
                  ['Email client', viewDossier.clientEmail || '-'], ['Session', viewDossier.sessionName || '-'],
                  ['Déposé le', viewDossier.createdAt ? new Date(viewDossier.createdAt).toLocaleDateString('fr-FR') : '-'],
                  ['Montant HT', `${(viewDossier.amountHT || 0).toLocaleString('fr-FR')} €`], ['Commission agence', `${(viewDossier.commission || 0).toLocaleString('fr-FR')} €`],
                ] as Array<[string, string]>).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-black/[0.04] py-1.5"><span className="text-[#86868B]">{k}</span><span className="font-medium text-[#1D1D1F] text-right">{v}</span></div>
                ))}
              </div>
              <h4 className="text-[13px] font-bold mt-5 mb-2">Stagiaires inscrits ({(viewDossier.salaries || []).length})</h4>
              <div className="overflow-x-auto border border-black/10 rounded-lg">
                <table className="w-full text-[12px]">
                  <thead className="bg-black/[0.03] text-[#86868B] text-[10px] uppercase tracking-wider"><tr><th className="text-left px-3 py-2">Nom</th><th className="text-left px-3 py-2">Email</th><th className="text-left px-3 py-2">Contrat</th><th className="text-left px-3 py-2">Naissance</th><th className="text-left px-3 py-2">N° Sécu</th></tr></thead>
                  <tbody className="divide-y divide-black/5">
                    {(viewDossier.salaries || []).map((s, i) => (
                      <tr key={i}><td className="px-3 py-2 font-medium">{s.firstname} {s.lastname}</td><td className="px-3 py-2 text-[#6e6e73]">{s.email || '-'}</td><td className="px-3 py-2">{s.type_contrat || '-'}</td><td className="px-3 py-2">{s.date_naissance || '-'}</td><td className="px-3 py-2 font-mono text-[11px]">{s.num_secu || '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-black/10 flex flex-wrap items-center justify-end gap-2 bg-[#fafafa]">
              <button onClick={() => printStagiaires(viewDossier)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-black/10 text-[12.5px] font-semibold hover:bg-black/[0.03]">Stagiaires (PDF)</button>
              <button onClick={() => printConvention(viewDossier)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D1D1F] text-white text-[12.5px] font-semibold hover:bg-black">Convention (PDF)</button>
            </div>
          </div>
        </div>
      )}

      {/* Dossiers OPCO recus : statut jusqu'au paiement + versement commission (multi-select) */}
      <div className="rounded-2xl bg-white border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[14px]">Dossiers OPCO reçus</h3>
            {dossiers.filter((d) => d.status === 'transmitted').length > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#0066CC] text-white text-[11px] font-bold">{dossiers.filter((d) => d.status === 'transmitted').length} nouveau{dossiers.filter((d) => d.status === 'transmitted').length > 1 ? 'x' : ''} à traiter</span>}
          </div>
          {selDoss.size > 0 && (
            <button onClick={paySelected} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#34C759] text-white text-[12px] font-semibold">
              Marquer payé(s) · {selDoss.size} · {dossiers.filter((d) => selDoss.has(d._id)).reduce((s, d) => s + (d.commission || 0), 0)} €
            </button>
          )}
        </div>
        {dossiers.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[#86868B]">Aucun dossier transmis pour l'instant.</p>
        ) : (
          <div className="divide-y divide-black/10">
            {(() => {
              // Regroupement par agence : on voit tout par agence (totaux + RIB + dossiers).
              const groups = new Map<string, typeof dossiers>();
              dossiers.forEach((d) => { const k = d.agencyName || '—'; if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(d); });
              return [...groups.entries()].map(([agencyName, ds]) => {
                const total = ds.reduce((s, d) => s + (d.commission || 0), 0);
                const due = ds.filter((d) => d.status !== 'paid').reduce((s, d) => s + (d.commission || 0), 0);
                const iban = ds.find((d) => d.agencyIban)?.agencyIban;
                return (
                  <div key={agencyName}>
                    <div className="px-5 py-2.5 bg-black/[0.03] flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[#86868B]" /><span className="font-semibold text-[13px] text-[#1D1D1F]">{agencyName}</span><span className="text-[11.5px] text-[#86868B]">· {ds.length} dossier{ds.length > 1 ? 's' : ''}</span></div>
                      <div className="text-[11.5px] text-[#86868B]">À verser : <strong className="text-[#1D1D1F]">{due.toLocaleString('fr-FR')} €</strong> · Total : {total.toLocaleString('fr-FR')} €{iban ? <span className="font-mono ml-2">{iban}</span> : <span className="text-[#FF9F0A] ml-2">RIB non renseigné</span>}</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12.5px]">
                        <thead className="text-[#86868B] text-[10px] uppercase tracking-wider"><tr className="border-b border-black/5"><th className="px-3 py-2"></th><th className="text-left px-3 py-2">Client</th><th className="text-left px-3 py-2">Montant</th><th className="text-left px-3 py-2">Commission</th><th className="text-left px-3 py-2">Statut</th><th className="text-left px-3 py-2">Encaissement</th></tr></thead>
                        <tbody className="divide-y divide-black/5">
                          {ds.map((d) => (
                            <tr key={d._id} className={`hover:bg-black/[0.02] ${selDoss.has(d._id) ? 'bg-[#34C759]/5' : ''}`}>
                              <td className="px-3 py-2.5"><input type="checkbox" checked={selDoss.has(d._id)} onChange={() => toggleSel(d._id)} /></td>
                              <td className="px-3 py-2.5"><button onClick={() => setViewDossier(d)} className="text-left"><p className="font-semibold text-[#1D1D1F] underline decoration-dotted underline-offset-2 hover:text-[#0A84FF]">{d.denom || 'Client'}</p><p className="text-[#86868B] text-[11px]">{d.formationTitle} · {(d.salaries || []).length} stagiaire(s)</p></button></td>
                              <td className="px-3 py-2.5">{(d.amountHT || 0).toLocaleString('fr-FR')} €</td>
                              <td className="px-3 py-2.5 font-semibold text-[#1D1D1F]">{(d.commission || 0).toLocaleString('fr-FR')} €</td>
                              <td className="px-3 py-2.5">
                                <select value={d.status} onChange={(e) => setDossierStatus(d._id, e.target.value)} className={`px-2.5 py-1 rounded-md border text-[12px] focus:outline-none ${d.status === 'paid' ? 'border-[#34C759] text-[#34C759]' : 'border-black/10'} bg-white`}>
                                  {DOSSIER_STATUSES.map((s) => <option key={s} value={s}>{DOSSIER_LABEL[s]}</option>)}
                                </select>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  {d.status === 'paid' ? <span className="text-[#34C759] text-[11.5px]">Payé ✓</span>
                                    : d.encashRequestedAt ? <button onClick={() => setFactureDossier(d)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FF9F0A] text-white text-[11px] font-semibold">Ordre reçu · voir facture</button>
                                    : d.opcoPaid ? <span className="text-[11.5px] text-[#0A84FF]">Fonds dispo · attente agence</span>
                                    : <button onClick={() => markOpcoPaid(d._id, true)} className="px-2.5 py-1 rounded-md border border-black/10 text-[11px] hover:bg-black/[0.03]">Marquer OPCO payé</button>}
                                  <button onClick={() => deleteDossier(d)} title="Supprimer ce dossier (réversible)" className="ml-auto text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Indisponibilités des sessions de formation (superadmin) */}
      <div className="rounded-2xl bg-white border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10"><h3 className="font-semibold text-[14px]">Indisponibilités des sessions</h3><p className="text-[12px] text-[#86868B] mt-0.5">Bloquez un jour : toute session de 3 jours qui le contient disparaît du wizard (côté agence/commercial).</p></div>
        <div className="px-5 py-4">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-1">Jour à bloquer</label>
              <input type="date" value={newUnavailDay} onChange={(e) => setNewUnavailDay(e.target.value)} className="px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-1">Motif (optionnel)</label>
              <input value={newUnavailLabel} onChange={(e) => setNewUnavailLabel(e.target.value)} placeholder="Férié, congés…" className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" />
            </div>
            <button onClick={addUnavail} disabled={!newUnavailDay} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[12.5px] font-semibold hover:bg-black disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> Bloquer ce jour</button>
          </div>
          {unavail.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {unavail.map((u) => (
                <span key={u.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF3B30]/8 border border-[#FF3B30]/25 text-[12px] text-[#1D1D1F]">
                  <span className="font-semibold">{new Date(u.day + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  {u.label && <span className="text-[#86868B]">· {u.label}</span>}
                  <button onClick={() => removeUnavail(u.id)} title="Débloquer" className="text-[#86868B] hover:text-[#FF3B30]"><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
            </div>
          )}
          {unavail.length === 0 && <p className="text-[12.5px] text-[#86868B] mt-3">Aucun jour bloqué : toutes les sessions lun→sam sont proposées.</p>}
        </div>
      </div>

      {/* Acces clients recus (demandes envoyees par les agences) */}
      <div className="rounded-2xl bg-white border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10"><h3 className="font-semibold text-[14px]">Accès clients reçus</h3></div>
        {accessReqs.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[#86868B]">Aucune demande d'accès pour l'instant.</p>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead className="text-[#86868B] text-[10px] uppercase tracking-wider">
              <tr className="border-b border-black/5"><th className="text-left px-5 py-2.5">Client</th><th className="text-left px-5 py-2.5">Agence</th><th className="text-left px-5 py-2.5">Demande</th><th className="text-left px-5 py-2.5">Accès</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {accessReqs.map((r) => {
                const rv = revealed[r.id];
                return (
                  <tr key={r.id} className="hover:bg-black/[0.02] align-top">
                    <td className="px-5 py-2.5"><p className="font-semibold text-[#1D1D1F]">{r.clientName || '-'}</p><p className="text-[#86868B] text-[11px]">{r.clientEmail}</p></td>
                    <td className="px-5 py-2.5 text-[#86868B]">{r.agencyName || '-'}</td>
                    <td className="px-5 py-2.5">{r.label} {r.status === 'received' ? <span className="ml-1 text-[#34C759]">· reçu</span> : <span className="ml-1 text-[#FF9F0A]">· en attente</span>}</td>
                    <td className="px-5 py-2.5">
                      {r.status !== 'received' ? <span className="text-[#86868B]">-</span>
                        : rv ? (
                          <div className="font-mono text-[11.5px] space-y-0.5">
                            {/rattach|code/i.test(r.label) ? (
                              <p><span className="text-[#86868B]">Code de rattachement:</span> <strong className="select-all">{rv.login}</strong></p>
                            ) : (
                              <>
                                <p><span className="text-[#86868B]">Login:</span> <strong className="select-all">{rv.login}</strong></p>
                                {rv.password && <p><span className="text-[#86868B]">MDP:</span> <strong className="select-all">{rv.password}</strong></p>}
                              </>
                            )}
                            {rv.note && <p className="text-[#86868B]">Note: {rv.note}</p>}
                          </div>
                        ) : <button onClick={() => revealAccess(r.id)} className="px-2.5 py-1 rounded-md bg-[#1D1D1F] text-white text-[11px]">Révéler</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Frise de suivi du dossier (pipeline OPCO) cote superadmin - theme clair. @author Rabah Ziane - 2026-06-04
function AdminDossierTimeline({ d }: { d: { status: string; createdAt?: string; updatedAt?: string; sessionStart?: string; sessionEnd?: string; sessionName?: string; signedAt?: string } }) {
  const STEPS = [
    { key: 'transmitted', label: 'Transmis' },
    { key: 'instruction', label: 'En instruction' },
    { key: 'accepted', label: 'Accepté' },
    { key: 'scheduled', label: 'Programmé' },
    { key: 'completed', label: 'Terminé' },
    { key: 'invoiced', label: 'Facturé' },
    { key: 'paid', label: 'Payé' },
  ];
  const cur = Math.max(0, STEPS.findIndex((s) => s.key === d.status));
  const isRejected = d.status === 'rejected';
  const fmt = (s?: string) => s ? new Date(s).toLocaleDateString('fr-FR') : '';
  const subFor = (k: string) => k === 'transmitted' ? (d.signedAt ? 'Signé le ' + fmt(d.signedAt) : fmt(d.createdAt)) : k === 'scheduled' ? (d.sessionStart ? 'Début ' + fmt(d.sessionStart) : '') : k === 'completed' ? (d.sessionEnd ? 'Fin ' + fmt(d.sessionEnd) : '') : k === 'paid' && d.status === 'paid' ? fmt(d.updatedAt) : '';
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-[#86868B] mb-2">Suivi du dossier</p>
      {isRejected && <p className="text-[12px] text-[#FF3B30] font-semibold mb-2">Dossier refusé par l'OPCO.</p>}
      <div className="flex items-start gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const done = i < cur, active = i === cur && !isRejected;
          return (
            <div key={s.key} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center w-[78px] text-center">
                <span className={`h-3.5 w-3.5 rounded-full border-2 ${done ? 'bg-[#34C759] border-[#34C759]' : active ? 'bg-[#0066CC] border-[#0066CC]' : 'bg-white border-black/15'}`} />
                <span className={`text-[10px] mt-1 leading-tight ${done || active ? 'text-[#1D1D1F] font-semibold' : 'text-[#86868B]'}`}>{s.label}</span>
                {subFor(s.key) && <span className="text-[9px] text-[#86868B] mt-0.5">{subFor(s.key)}</span>}
              </div>
              {i < STEPS.length - 1 && <span className={`h-[2px] w-5 mt-[7px] ${i < cur ? 'bg-[#34C759]' : 'bg-black/10'}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Contrat de partenariat signé (vue admin, pour vérification avant validation du compte).
// Reprend à l'identique les 15 articles + tampon partenaire auto + signature DD. @Rabah 2026-06-05
type ContractAgency = { name: string; commissionFix?: number; commissionPercent?: number; companyInfo?: { legalName?: string; regNumber?: string; address?: string; city?: string; postalCode?: string; country?: string; repName?: string; repFunction?: string }; contract?: { signed?: boolean; signedBy?: string; signedFunction?: string; signedAt?: string | null } };
function printContract(a: ContractAgency) {
  const ci = a.companyInfo || {};
  const partner = ci.legalName || a.name;
  const addr = [ci.address, [ci.postalCode, ci.city].filter(Boolean).join(' '), ci.country].filter(Boolean).join(', ');
  const rep = [ci.repName, ci.repFunction].filter(Boolean).join(', ');
  const fix = (a.commissionFix != null ? a.commissionFix : 120).toLocaleString('fr-FR');
  const pct = a.commissionPercent != null ? a.commissionPercent : 15;
  const signDate = a.contract?.signedAt ? new Date(a.contract.signedAt).toLocaleDateString('fr-FR') : '';
  const stampLoc = [ci.postalCode, ci.city].filter(Boolean).join(' ');
  // Tampon (cachet) bleu du partenaire, identique à l'espace agence (PartnerStamp).
  const partnerStamp = `<div style="display:inline-block;transform:rotate(-7deg);color:#1d4ed8;margin:8px 0"><div style="border:2px solid #1d4ed8;border-radius:6px;padding:8px 16px;text-align:center;box-shadow:inset 0 0 0 1px rgba(29,78,216,0.25)"><p style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;opacity:.7;margin:0">Cachet de l'entreprise</p><p style="font-size:13px;font-weight:800;text-transform:uppercase;margin:2px 0 0;line-height:1.1">${esc(partner)}</p>${ci.regNumber ? `<p style="font-size:8px;font-weight:600;margin:2px 0 0">SIRET / N° ${esc(ci.regNumber)}</p>` : ''}${stampLoc ? `<p style="font-size:8px;margin:0">${esc(stampLoc)}${ci.country ? ' · ' + esc(ci.country) : ''}</p>` : ''}<p style="font-size:7.5px;font-weight:700;text-transform:uppercase;margin:4px 0 0;border-top:1px solid rgba(29,78,216,.4);padding-top:2px">${a.contract?.signed ? 'Signé électroniquement' + (signDate ? ' le ' + signDate : '') : 'Aperçu - non signé'}</p></div></div>`;
  const A = (n: number, t: string, body: string) => `<h2>Article ${n} : ${t}</h2><p>${body}</p>`;
  openPrint(`Contrat de partenariat - ${partner}`, `
    <p class="hdr">DELIVERY Digital Nice · SIRET 90294519500029 · NAF 6201Z · RCS 902 945 195 · 470 promenade des Anglais, 06200 Nice</p>
    <h1>Contrat de partenariat</h1>
    <p class="muted" style="text-align:center">Apporteur d'affaires - dispositifs de formation financés (OPCO)</p>
    <h2>Entre les soussignés</h2>
    <p><b>Delivery Digital</b>, ci-après « la Société », d'une part,</p>
    <p>Et <b>${esc(partner)}</b>${ci.regNumber ? ', immatriculée sous le n° ' + esc(ci.regNumber) : ''}${addr ? ", dont le siège est situé " + esc(addr) : ''}${rep ? ', représentée par ' + esc(rep) : ''}, ci-après « le Partenaire », d'autre part.</p>
    ${A(1, 'Objet', "Le présent contrat définit les conditions dans lesquelles le Partenaire présente à la Société des clients en vue du montage de dossiers de formation financés par les OPCO, et perçoit une commission en contrepartie.")}
    ${A(2, 'Rôle du Partenaire', "Le Partenaire identifie les clients, renseigne leurs informations et monte les dossiers OPCO via l'espace partenaire mis à sa disposition. Il s'engage à transmettre des informations exactes et à respecter la réglementation applicable à la formation professionnelle.")}
    ${A(3, 'Commission', `Le Partenaire perçoit une commission de <b>${fix} € TTC par client et par an</b> (comptée une seule fois, au 1er dossier du client dans l'année), majorée de <b>${pct} % TTC</b> du montant de chaque dossier. La commission est <b>versée à la réception effective du paiement OPCO</b> correspondant, sur le compte bancaire renseigné par le Partenaire. <b>En cas de volumes importants gérés par le Partenaire, une mise à jour du contrat en exclusivité lui sera proposée.</b>`)}
    ${A(4, 'Versement', "Les versements sont effectués par virement sur le RIB validé du Partenaire. La Société tient à jour, dans l'espace partenaire, l'état des dossiers et l'historique des paiements.")}
    ${A(5, 'Durée', "Le contrat prend effet à sa signature électronique pour une durée d'<b>un (1) an</b>, renouvelable par tacite reconduction par périodes successives d'un an. Chaque partie peut y mettre fin à l'échéance, ou à tout moment, moyennant un préavis écrit de <b>trente (30) jours</b>, sans incidence sur les commissions déjà acquises.")}
    ${A(6, 'Confidentialité et données', "Chaque partie s'engage à préserver la confidentialité des informations échangées et à traiter les données personnelles des clients conformément au RGPD.")}
    ${A(7, 'Non-concurrence et non-sollicitation', "Pendant la durée du contrat et <b>après son arrêt, quelle qu'en soit la cause (terme, résiliation, non-reconduction), sans limitation de durée</b>, le Partenaire n'a <b>pas le droit d'exercer ni d'orienter l'activité d'apport et de montage de dossiers de formation financés par les OPCO avec d'autres organismes ou centres de formation</b>. Il s'interdit notamment : (a) de démarcher, reprendre ou réorienter vers un autre centre de formation les <b>clients qu'il a apportés dans le cadre du présent contrat</b> ; (b) de poursuivre avec ces clients des prestations OPCO équivalentes par l'intermédiaire d'un tiers ; (c) de solliciter les clients, prospects, formateurs ou salariés de Delivery Digital, ni d'exploiter ses méthodes, contenus, outils, fichiers ou données. Les clients apportés demeurent la clientèle de Delivery Digital. Tout manquement entraîne la perte des commissions non encore versées.")}
    ${A(8, 'Indépendance', "Le Partenaire agit en toute indépendance. Le présent contrat ne crée aucun lien de subordination ni société de fait entre les parties.")}
    ${A(9, 'Validation', "La signature électronique du Partenaire est soumise à la validation de Delivery Digital, qui vérifie les informations de l'entreprise, le RIB et le présent contrat avant activation du compte.")}
    <div class="sign">
      <div><p class="muted">Pour Delivery Digital</p><img src="https://deliverydigital.fr/uploads/assets/signature-dd.png" alt="Signature" style="max-height:46px;margin:6px 0" onerror="this.style.display='none'" /><p><b>DELIVERY Digital Nice</b></p><p style="font-size:10px">470 promenade des Anglais · 06200 Nice · SIRET 90294519500029</p></div>
      <div><p class="muted">Pour le Partenaire</p><p><b>${esc(partner)}</b></p>${ci.regNumber ? `<p style="font-size:10px">N° ${esc(ci.regNumber)}</p>` : ''}${addr ? `<p style="font-size:10px">${esc(addr)}</p>` : ''}${partnerStamp}${a.contract?.signed ? `<p class="muted" style="font-size:10px">Signataire : ${esc(a.contract.signedBy || '')}${a.contract.signedFunction ? ' (' + esc(a.contract.signedFunction) + ')' : ''}${signDate ? ' · le ' + signDate : ''}</p>` : ''}</div>
    </div>`);
}

// === Impression PDF (document interne Delivery Digital) ===
type PrintSalarie = { firstname?: string; lastname?: string; email?: string; poste?: string; type_contrat?: string; date_naissance?: string; num_secu?: string; telephone?: string };
type PrintDossier = { _id: string; denom?: string; siret?: string; opco?: string; addr?: string; clientEmail?: string; formationTitle?: string; sessionName?: string; salaries?: PrintSalarie[]; signedBy?: string; signedFunction?: string; signedIp?: string; signatureDataUrl?: string; signedRemote?: boolean; signedAt?: string; amountHT?: number; createdAt?: string; invoiceNumber?: string };
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const A4_HEAD = `<style>@page{size:A4;margin:0}*{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1D1D1F;margin:0}.sheet{width:210mm;min-height:297mm;padding:18mm 16mm;margin:0 auto}h1{font-size:20px;text-align:center;margin:0}h2{font-size:13px;margin:18px 0 4px}.muted{color:#6e6e73}.hdr{font-size:10px;text-align:center;color:#6e6e73;border-bottom:1px solid #1D1D1F;padding-bottom:10px}p{font-size:12px;line-height:1.5;margin:4px 0}table{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:8px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f7;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em}.sign{display:flex;gap:24px;margin-top:28px}.sign>div{flex:1;border:1px solid #ddd;border-radius:6px;padding:10px;min-height:90px}</style>`;
function openPrint(title: string, inner: string) {
  const w = window.open('', '_blank'); if (!w) { alert('Autorisez les pop-up pour télécharger le PDF.'); return; }
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title>${A4_HEAD}</head><body><div class="sheet">${inner}</div><script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`);
  w.document.close();
}
function printStagiaires(d: PrintDossier) {
  const rows = (d.salaries || []).map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.firstname)} ${esc(s.lastname)}</td><td>${esc(s.email || '-')}</td><td>${esc(s.poste || '-')}</td><td>${esc(s.type_contrat || '-')}</td><td>${esc(s.date_naissance || '-')}</td><td>${esc(s.num_secu || '-')}</td><td>${esc(s.telephone || '-')}</td></tr>`).join('');
  openPrint(`Stagiaires - ${d.denom}`, `
    <p class="hdr">DELIVERY Digital Nice · SIRET 90294519500029 · 470 promenade des Anglais, 06200 Nice · Déclaration d'activité 93061064306</p>
    <h1>Liste des stagiaires</h1>
    <p class="muted" style="text-align:center">${esc(d.denom)}${d.siret ? ' · SIRET ' + esc(d.siret) : ''} · Formation : ${esc(d.formationTitle || '')}${d.sessionName ? ' · ' + esc(d.sessionName) : ''}</p>
    <table><thead><tr><th>#</th><th>Nom & prénom</th><th>Email</th><th>Poste</th><th>Contrat</th><th>Naissance</th><th>N° Sécurité sociale</th><th>Téléphone</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Aucun stagiaire</td></tr>'}</tbody></table>
    <p class="muted" style="margin-top:14px">Document généré le ${new Date().toLocaleDateString('fr-FR')} via l'espace partenaire Delivery Digital.</p>`);
}
function printConvention(d: PrintDossier) {
  const n = (d.salaries || []).length;
  const total = (d.amountHT || 0).toFixed(2);
  const stag = (d.salaries || []).map((s) => `<li>${esc(s.firstname)} ${esc(s.lastname)} (${esc(s.type_contrat === 'CDD' ? "Salarié d'employeurs privés (CDD)" : "Salarié d'employeurs privés hors apprentis")})</li>`).join('');
  const dateSign = d.signedAt ? new Date(d.signedAt).toLocaleDateString('fr-FR') : d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  const rep = d.signedBy || 'le représentant légal';
  // Signature manuscrite reelle du client (image) si disponible, sinon repli sur le nom.
  const clientSig = d.signatureDataUrl
    ? `<img src="${esc(d.signatureDataUrl)}" alt="Signature" style="max-height:48px;margin-top:6px" />`
    : `<p style="color:#1d4ed8;font-weight:700;font-family:cursive;font-size:16px;margin-top:8px">${esc(d.signedBy || d.denom)}</p>`;
  openPrint(`Convention - ${d.denom}`, `
    <p class="hdr">DELIVERY Digital Nice · SIRET 90294519500029 · NAF 6201Z · RCS 902 945 195 · 470 promenade des Anglais, 06200 Nice · Déclaration d'activité 93061064306 · Certificat QUALIOPI N°252411-3</p>
    <h1>Convention de formation professionnelle</h1>
    <p class="muted" style="text-align:center">(Articles R.6313-3 et R.6332-26 du Code du travail - Décret n°2018-1209 du 21 décembre 2018 - art. 1)</p>
    <h2>Entre les soussignés</h2>
    <p>L'organisme de formation <b>DELIVERY Digital Nice</b>, situé 470 promenade des Anglais - 06200 Nice - SIRET 90294519500029 - Déclaration d'activité enregistrée sous le N°93061064306 auprès du Préfet de Région Provence-Alpes-Côte d'Azur, ci-après dénommé « l'organisme de formation ». Cet enregistrement ne vaut pas agrément de l'État.</p>
    <p>Et la société <b>${esc(d.denom)}</b>${d.addr ? ' située ' + esc(d.addr) : ''}${d.siret ? ' - SIRET ' + esc(d.siret) : ''} - représentée par ${esc(rep)}, ci-après dénommé « le bénéficiaire ».</p>

    <h2>Article 1 : OBJET DE LA CONVENTION</h2>
    <p>L'action de formation entre dans la catégorie prévue à l'article L.6313-1 du Code du travail, à savoir les « actions de développement des compétences ».</p>
    <p><b>Intitulé de l'action de formation :</b> ${esc(d.formationTitle || '')}</p>
    <p><b>Objectif professionnel visé :</b> acquérir des compétences en bonnes pratiques d'hygiène et de sécurité, identifier et prévenir les risques, et intégrer des pratiques durables.</p>
    <p><b>Public visé :</b> professionnels du secteur alimentaire (cuisiniers, chefs et responsables de cuisine, restauration collective, gestionnaires d'établissements) et toute personne impliquée dans l'hygiène, la sécurité et le développement durable.</p>
    <p><b>Indicateurs de résultats :</b> taux de satisfaction 90 % · taux de recommandation 95 %.</p>

    <h2>Article 2 : NATURE ET LOGISTIQUE DE L'ACTION</h2>
    <p>Action réalisée en distanciel et en INTRA entreprise. Durée : 3 jours dissociés soit 21 heures. Séances de 10h00 à 17h00 en distanciel${d.sessionName ? ' (' + esc(d.sessionName) + ')' : ''}. Prérequis des apprenants : aucun.</p>

    <h2>Article 3 : LES FORMATEURS DE L'ACTION</h2>
    <p>La formation est assurée par <b>Asma SOUALMI</b> (dietlivry@gmail.com) : conception de ressources pédagogiques et animation en visioconférence (français/anglais), pédagogie interactive axée sur la mise en situation professionnelle.</p>

    <h2>Article 4 : ENGAGEMENTS DE PARTICIPATION</h2>
    <p>Le bénéficiaire s'engage à assurer la présence des participants désignés par la direction. Il s'agit de :</p>
    <ul style="font-size:12px">${stag || '<li>-</li>'}</ul>
    <p>Ils devront être déclarés par leurs noms, prénoms et fonctions avant la formation auprès de l'OPCO. Accessibilité : adaptations possibles pour les personnes en situation de handicap, nous contacter avant l'entrée en formation.</p>

    <h2>Article 5 : DISPOSITIONS FINANCIÈRES ET PRIX DE LA FORMATION</h2>
    <p>La formation « ${esc(d.formationTitle || '')} » est facturée 525,00 € TTC par apprenant (prix fixe). Coût total de la session : coût unitaire 525,00 € HT × ${n} stagiaire(s) = <b>${total} € HT (${total} € TTC)</b>. TVA non applicable - art. 261-4-4° du CGI. Facturation directe à l'OPCO (subrogation).</p>

    <h2>Article 6 : MOYENS PÉDAGOGIQUES ET TECHNIQUES</h2>
    <p>Séquences de travail en visioconférence encadrées par un formateur ; accès continu à la plateforme pédagogique (cours, quizz, exercices) 24h/24 et 7j/7 via l'Espace apprenant.</p>

    <h2>Article 7 : MOYENS PERMETTANT DE SUIVRE L'EXÉCUTION DE L'ACTION</h2>
    <p>Visioconférence avec un formateur, feedbacks réguliers, questionnaire individuel de satisfaction à chaud, certificat de réalisation individuel.</p>

    <h2>Article 8 : MOYENS PERMETTANT D'APPRÉCIER LES RÉSULTATS</h2>
    <p>Évaluations en ligne via la plateforme : QCM, exercices et projets quotidiens ; évaluation de début et de fin de formation.</p>

    <h2>Article 9 : SANCTION DE LA FORMATION</h2>
    <p>En application de l'article L.6313-1, un certificat de réalisation mentionnant les objectifs, la nature, la durée et les résultats de l'évaluation est remis à chaque apprenant et à l'employeur financeur.</p>

    <h2>Article 10 : APPLICATION DU RGPD</h2>
    <p>Les informations échangées sont utilisées uniquement dans le cadre de la relation commerciale, exclusivement par DELIVERY Digital Nice, le temps de la formation et de son traitement. Vous pouvez exercer vos droits RGPD à tout moment auprès du référent RGPD.</p>

    <h2>Article 11 : ENGAGEMENT QUALITÉ</h2>
    <p>L'organisme satisfait aux exigences du Décret n°2019-564 du 6 juin 2019 (certification QUALIOPI N°252411-3). Chaque action fait l'objet d'une convention signée des deux parties, accompagnée du parcours de formation et du règlement intérieur.</p>

    <h2>Article 12 : TRAITEMENT DES ÉVENTUELLES RÉCLAMATIONS</h2>
    <p>Une feuille d'appréciation individuelle est renseignée par chaque participant à l'issue de l'action. Toute réclamation est adressée par mail ; une réponse est apportée sous un mois maximum.</p>

    <h2>Article 13 : EN CAS DE NON RÉALISATION DE LA PRESTATION</h2>
    <p>En application de l'article L.6354-1, faute de réalisation totale ou partielle, l'organisme rembourse au co-contractant les sommes indûment perçues.</p>

    <h2>Article 14 : DÉDOMMAGEMENT, RÉPARATION OU DÉDIT</h2>
    <p>En cas de renoncement avant le début de la formation : plus de 2 mois avant 0 % · 2 semaines avant 50 % · moins d'1 semaine avant 100 % du coût. Ces montants ne sont pas imputables sur l'obligation des employeurs et ne sont pas pris en charge par un OPCO ou un FAF.</p>

    <h2>Article 15 : EN CAS DE DIFFÉRENDS POTENTIELS</h2>
    <p>À défaut de règlement amiable, le Tribunal de Commerce de Nice est seul compétent.</p>

    <p style="margin-top:18px"><b>Document réalisé et signé le ${dateSign} :</b></p>
    <div class="sign">
      <div><p class="muted">Pour le bénéficiaire</p><p><b>${esc(d.denom)}</b></p><p>${esc(d.signedBy || '')}${d.signedFunction ? ' (' + esc(d.signedFunction) + ')' : ''}</p>${clientSig}<p class="muted" style="font-size:10px">Signé électroniquement${d.signedRemote ? ' à distance' : ''}${d.signedIp ? ' · IP ' + esc(d.signedIp) : ''} · le ${dateSign}</p></div>
      <div><p class="muted">Pour l'organisme de formation</p><p><b>DELIVERY Digital Nice</b></p><img src="https://deliverydigital.fr/uploads/assets/signature-dd.png" alt="Signature" style="max-height:48px;margin-top:6px" onerror="this.style.display='none'" /><p class="muted" style="font-size:10px">Signé · le ${dateSign}</p></div>
    </div>`);
}
