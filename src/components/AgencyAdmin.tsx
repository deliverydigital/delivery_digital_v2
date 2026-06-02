import { useEffect, useState, useCallback } from 'react';
import { Building2, Loader2, Plus, RefreshCw, Copy, KeyRound, Eye, EyeOff } from 'lucide-react';

/**
 * Admin - gestion des agences partenaires (deliverydigital.fr).
 * Cree des comptes role 'agence' (login JWT existant + cle API d'integration).
 * @author Rabah Ziane - 2026-06-02
 */
type CompanyInfo = { legalName?: string; regNumber?: string; vatNumber?: string; address?: string; city?: string; postalCode?: string; country?: string; repName?: string; repFunction?: string };
type Contract = { signed?: boolean; signedBy?: string; signedFunction?: string; signedAt?: string | null; validated?: boolean };
type Agency = { _id: string; email: string; name: string; phone?: string; status?: string; apiKey?: string; createdAt?: string; last_login?: string; iban?: string; bic?: string; accountHolder?: string; bankCountry?: string; bankData?: Record<string, string>; ribPdfUrl?: string; bankValidated?: boolean; companyInfo?: CompanyInfo; contract?: Contract; onboardingValidated?: boolean };
type Created = { email: string; name: string; password: string; apiKey: string };

export default function AgencyAdmin({ secret }: { secret: string | null }) {
  const [list, setList] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fix, setFix] = useState('120');
  const [pct, setPct] = useState('15');
  const [creating, setCreating] = useState(false);
  const [dossiers, setDossiers] = useState<{ _id: string; agencyName?: string; denom?: string; opco?: string; formationTitle?: string; amountHT?: number; status: string; createdAt?: string; commission?: number; agencyIban?: string; agencyBic?: string; agencyHolder?: string }[]>([]);
  const [selDoss, setSelDoss] = useState<Set<string>>(new Set());
  const DOSSIER_STATUSES = ['transmitted', 'instruction', 'accepted', 'scheduled', 'completed', 'invoiced', 'paid', 'rejected'];
  const DOSSIER_LABEL: Record<string, string> = { transmitted: 'Transmis', instruction: 'En instruction', accepted: 'Accepté', scheduled: 'Programmé', completed: 'Terminé', invoiced: 'Facturé', paid: 'Payé', rejected: 'Refusé' };
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [revealKey, setRevealKey] = useState<Record<string, boolean>>({});
  const [accessReqs, setAccessReqs] = useState<{ id: string; agencyName?: string; clientEmail: string; label: string; status: string; receivedAt?: string }[]>([]);
  const [revealed, setRevealed] = useState<Record<string, { login: string; password: string; note?: string }>>({});

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
    } finally { setLoading(false); }
  }, [secret]);

  async function setDossierStatus(id: string, status: string) {
    setDossiers((prev) => prev.map((d) => d._id === id ? { ...d, status } : d));
    await fetch(`/api/admin/agencies/dossiers/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ status }) });
  }
  function toggleSel(id: string) { setSelDoss((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
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
      setCreated({ email: j.agency.email, name: j.agency.name, password: j.password, apiKey: j.apiKey });
      setName(''); setEmail(''); setPhone('');
      load();
    } finally { setCreating(false); }
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
            <div className="flex gap-2 mt-2">
              <button onClick={() => navigator.clipboard?.writeText(`Login: ${created.email}\nMot de passe: ${created.password}\nClé API: ${created.apiKey}\nEspace: https://deliverydigital.fr/agence`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1D1D1F] text-white text-[11.5px]"><Copy className="h-3 w-3" /> Copier</button>
              <button onClick={() => setCreated(null)} className="px-3 py-1.5 rounded-full border border-black/10 text-[11.5px]">Fermer</button>
            </div>
          </div>
        )}
      </div>

      {/* Liste */}
      <div className="rounded-2xl bg-white border border-black/10 overflow-hidden">
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
                    <button onClick={() => regenKey(a._id)} title="Régénérer la clé API" className="inline-flex items-center gap-1 text-[11.5px] text-[#86868B] hover:text-[#1D1D1F]"><KeyRound className="h-3.5 w-3.5" /> Clé</button>
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
                        ? <p>Signé par <strong>{a.contract.signedBy}</strong>{a.contract.signedFunction ? ` (${a.contract.signedFunction})` : ''}{a.contract.signedAt ? `, le ${new Date(a.contract.signedAt).toLocaleDateString('fr-FR')}` : ''}</p>
                        : <p className="text-[#FF9F0A]">Non signé</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dossiers OPCO recus : statut jusqu'au paiement + versement commission (multi-select) */}
      <div className="rounded-2xl bg-white border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-semibold text-[14px]">Dossiers OPCO reçus</h3>
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
                        <thead className="text-[#86868B] text-[10px] uppercase tracking-wider"><tr className="border-b border-black/5"><th className="px-3 py-2"></th><th className="text-left px-3 py-2">Client</th><th className="text-left px-3 py-2">Montant</th><th className="text-left px-3 py-2">Commission</th><th className="text-left px-3 py-2">Statut</th></tr></thead>
                        <tbody className="divide-y divide-black/5">
                          {ds.map((d) => (
                            <tr key={d._id} className={`hover:bg-black/[0.02] ${selDoss.has(d._id) ? 'bg-[#34C759]/5' : ''}`}>
                              <td className="px-3 py-2.5"><input type="checkbox" checked={selDoss.has(d._id)} onChange={() => toggleSel(d._id)} /></td>
                              <td className="px-3 py-2.5"><p className="font-semibold text-[#1D1D1F]">{d.denom || 'Client'}</p><p className="text-[#86868B] text-[11px]">{d.formationTitle}</p></td>
                              <td className="px-3 py-2.5">{(d.amountHT || 0).toLocaleString('fr-FR')} €</td>
                              <td className="px-3 py-2.5 font-semibold text-[#1D1D1F]">{(d.commission || 0).toLocaleString('fr-FR')} €</td>
                              <td className="px-3 py-2.5">
                                <select value={d.status} onChange={(e) => setDossierStatus(d._id, e.target.value)} className={`px-2.5 py-1 rounded-md border text-[12px] focus:outline-none ${d.status === 'paid' ? 'border-[#34C759] text-[#34C759]' : 'border-black/10'} bg-white`}>
                                  {DOSSIER_STATUSES.map((s) => <option key={s} value={s}>{DOSSIER_LABEL[s]}</option>)}
                                </select>
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
                    <td className="px-5 py-2.5">{r.clientEmail}</td>
                    <td className="px-5 py-2.5 text-[#86868B]">{r.agencyName || '-'}</td>
                    <td className="px-5 py-2.5">{r.label} {r.status === 'received' ? <span className="ml-1 text-[#34C759]">· reçu</span> : <span className="ml-1 text-[#FF9F0A]">· en attente</span>}</td>
                    <td className="px-5 py-2.5">
                      {r.status !== 'received' ? <span className="text-[#86868B]">-</span>
                        : rv ? (
                          <div className="font-mono text-[11.5px] space-y-0.5">
                            <p><span className="text-[#86868B]">Login:</span> <strong className="select-all">{rv.login}</strong></p>
                            <p><span className="text-[#86868B]">MDP:</span> <strong className="select-all">{rv.password}</strong></p>
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
