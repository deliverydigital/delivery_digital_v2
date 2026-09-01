import { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import { Building2, Loader2, Plus, RefreshCw, Copy, KeyRound, Eye, EyeOff, X, Mail, Trash2, FileSignature, Send, Check, Clock } from 'lucide-react';
import DossierTasks, { type DossierTask } from './DossierTasks';
import { FORMATIONS } from '../lib/formationCatalog';

/**
 * Admin - gestion des agences partenaires (deliverydigital.fr).
 * Cree des comptes role 'agence' (login JWT existant + cle API d'integration).
 * @author Rabah Ziane - 2026-06-02
 */
type CompanyInfo = { legalName?: string; regNumber?: string; vatNumber?: string; address?: string; city?: string; postalCode?: string; country?: string; repName?: string; repFunction?: string };
type Contract = { signed?: boolean; signedBy?: string; signedFunction?: string; signedAt?: string | null; validated?: boolean };
type Agency = { _id: string; email: string; name: string; phone?: string; status?: string; apiKey?: string; createdAt?: string; last_login?: string; iban?: string; bic?: string; accountHolder?: string; bankCountry?: string; bankData?: Record<string, string>; ribPdfUrl?: string; bankValidated?: boolean; companyInfo?: CompanyInfo; contract?: Contract; onboardingValidated?: boolean; commissionFix?: number; commissionPercent?: number; pyemesCode?: string };
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
  type AdminDossier = { _id: string; agencyName?: string; mountedByAdmin?: boolean; commercialName?: string; denom?: string; siret?: string; opco?: string; addr?: string; clientEmail?: string; formationTitle?: string; sessionName?: string; sessionStart?: string; sessionEnd?: string; salaries?: AdminSalarie[]; signedBy?: string; signedFunction?: string; signedIp?: string; signatureDataUrl?: string; signedRemote?: boolean; signedAt?: string; amountHT?: number; status: string; createdAt?: string; updatedAt?: string; commission?: number; agencyIban?: string; agencyBic?: string; agencyHolder?: string; opcoPaid?: boolean; encashRequestedAt?: string | null; invoiceNumber?: string; aktoAttached?: boolean; aktoAttachedAt?: string; salariesPending?: boolean; trainerName?: string; trainerEmail?: string; tasks?: DossierTask[]; amountOpco?: number; commissionFixAmount?: number; commissionPctAmount?: number; commissionBase?: number; paymentOrders?: PaymentOrder[] };
  type PaymentOrder = { _id: string; part: 'fixe' | 'pourcentage'; montant: number; avance?: boolean; note?: string; createdAt?: string };
  type GenOrder = { _id: string; ref: string; agencyName?: string; totalCommission?: number; pdfUrl?: string; sentAt?: string; paidAt?: string; ccAgency?: boolean; createdAt?: string; updatedAt?: string; lines?: { denom?: string; month?: string; total?: number }[] };
  const pdfHref = (o: { pdfUrl?: string; updatedAt?: string }) => `${o.pdfUrl || ''}?v=${o.updatedAt ? Date.parse(o.updatedAt) : ''}`;
  type SignRequest = { id: string; token: string; denom?: string; siret?: string; opco?: string; clientEmail?: string; managerEmail?: string; recipient?: string; agencyName?: string; formationTitle?: string; sessionName?: string; salaries?: number; amountHT?: number; link: string; createdAt?: string; expiresAt?: string; expired?: boolean };
  const [dossiers, setDossiers] = useState<AdminDossier[]>([]);
  const [signRequests, setSignRequests] = useState<SignRequest[]>([]);
  const [showMount, setShowMount] = useState(false);
  const [factureDossier, setFactureDossier] = useState<AdminDossier | null>(null);
  const [viewDossier, setViewDossier] = useState<AdminDossier | null>(null);
  // Édition convention (formation + prix/stagiaire + formateur) dans la fiche dossier. @Rabah 2026-07-17
  const [convFormation, setConvFormation] = useState('');
  const [convPrice, setConvPrice] = useState('');
  const [convTrainer, setConvTrainer] = useState('');
  const [convTrainerEmail, setConvTrainerEmail] = useState('');
  const [savingConv, setSavingConv] = useState(false);
  const [trainers, setTrainers] = useState<Array<{ name?: string; email?: string; status?: string }>>([]); // formateurs inscrits. @Rabah 2026-07-17
  const [catalog, setCatalog] = useState<Array<{ id: string; title: string; price: number; hours: number; active?: boolean }>>([]); // catalogue complet des formations. @Rabah 2026-07-17
  const [openDossier, setOpenDossier] = useState<string | null>(null); // ligne "Suivi & tâches" dépliée. @Rabah 2026-07-02
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
  const [previewingSpace, setPreviewingSpace] = useState<string | null>(null); // chargement prévisualisation espace agence
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
  const [clientsList, setClientsList] = useState<{ id: string; denom: string; email?: string; accountantEmail?: string; managerEmail?: string; siret?: string; opco?: string; agence: string; commercial?: string; status: string; createdAt?: string; formationDoneThisYear?: boolean }[]>([]);
  const [editClient, setEditClient] = useState<{ id: string; denom: string; email: string; accountantEmail: string; managerEmail: string; siret: string; opco: string } | null>(null); // édition client côté admin. @Rabah 2026-06-18
  const [savingClient, setSavingClient] = useState(false);
  // Réglage revente Pyemes d'une agence (code de parrainage + % de commission TTC). @Rabah 2026-08-01
  const [pyemesEdit, setPyemesEdit] = useState<{ id: string; name: string; code: string; pct: string } | null>(null);
  const [pyemesSaving, setPyemesSaving] = useState(false);
  // Feuille de route Pyemes partagee avec l'agence : DD ajoute ses demandes, coche l'avancement et
  // repond dans le fil. Meme donnee que celle affichee cote agence. @author Rabah Ziane - 2026-08-31
  type RoadTache = { id: string; from: 'dd' | 'agence'; titre: string; statut: 'a_faire' | 'en_cours' | 'fait' | 'standby'; source?: string; createdAt?: string; phase?: string; echeance?: string; resp?: 'PY' | 'NG' | 'MIX' | ''; critere?: string; ref?: string; ordre?: number | null };
  // Responsables de la check-list de lancement : PY = equipe Pyemes, NG = Nova Growth, MIX = les deux.
  const RESP_LIB: Record<string, string> = { PY: 'Pyemes', NG: 'Nova', MIX: 'Les deux' };
  const RESP_STYLE: Record<string, { background: string; color: string }> = {
    PY: { background: 'rgba(99,91,255,0.12)', color: '#4B45C6' },
    NG: { background: 'rgba(52,199,89,0.12)', color: '#248A3D' },
    MIX: { background: '#F0F0F2', color: '#6E6E73' },
  };
  type RoadMsg = { id: string; from: 'dd' | 'agence'; auteur?: string; texte: string; image?: string; at?: string };
  const [roadAgence, setRoadAgence] = useState<{ id: string; name: string } | null>(null);
  const [roadTaches, setRoadTaches] = useState<RoadTache[]>([]);
  const [phasesOuvertes, setPhasesOuvertes] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);

  // RETOURS CLIENTS : meme liste que celle de l'espace agence (action #4). @Rabah 2026-09-01
  type Retour = { id: string; from: 'dd' | 'agence'; auteur?: string; client?: string; texte: string;
    gravite: 'bloquant' | 'genant' | 'idee'; statut: 'nouveau' | 'en_cours' | 'traite' | 'ecarte';
    reponse?: string; createdAt?: string };
  const GRAVITE_LIB: Record<string, string> = { bloquant: 'Bloquant', genant: 'Gênant', idee: 'Idée' };
  const GRAVITE_STYLE: Record<string, { background: string; color: string }> = {
    bloquant: { background: '#FFE9E7', color: '#B3261E' },
    genant: { background: '#FFF4DC', color: '#9A6B00' },
    idee: { background: 'rgba(99,91,255,0.10)', color: '#4B45C6' },
  };
  const [retours, setRetours] = useState<Retour[]>([]);
  const [retourTexte, setRetourTexte] = useState('');
  const [retourClient, setRetourClient] = useState('');
  const [retourGravite, setRetourGravite] = useState<'bloquant' | 'genant' | 'idee'>('genant');

  async function chargerRetoursAdmin(id: string) {
    const j = await fetch(`/api/admin/agencies/${id}/pyemes/retours`, { headers: headers() }).then((r) => r.json()).catch(() => null);
    if (j?.ok) setRetours(j.retours || []);
  }
  async function ajouterRetourAdmin() {
    if (!roadAgence || !retourTexte.trim()) return;
    const j = await fetch(`/api/admin/agencies/${roadAgence.id}/pyemes/retours`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ texte: retourTexte.trim(), client: retourClient.trim(), gravite: retourGravite }),
    }).then((r) => r.json()).catch(() => null);
    if (j?.ok) { setRetours(j.retours || []); setRetourTexte(''); setRetourClient(''); }
  }
  async function statutRetourAdmin(rid: string, statut: string) {
    if (!roadAgence) return;
    const j = await fetch(`/api/admin/agencies/${roadAgence.id}/pyemes/retours/${rid}`, {
      method: 'PATCH', headers: headers(), body: JSON.stringify({ statut }),
    }).then((r) => r.json()).catch(() => null);
    if (j?.ok) setRetours(j.retours || []);
  }
  // Meme regroupement par phase que du cote agence : les deux ecrans lisent la MEME liste et
  // doivent la presenter pareil. @author Rabah Ziane - 2026-09-01
  const phasesRoadmap = useMemo(() => {
    const groupes = new Map<string, RoadTache[]>();
    for (const t of roadTaches) {
      const cle = t.phase || 'Autres demandes';
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle)!.push(t);
    }
    return Array.from(groupes.entries())
      .sort((a, b) => (a[0] === 'Autres demandes' ? 1 : b[0] === 'Autres demandes' ? -1 : a[0].localeCompare(b[0], 'fr')))
      .map(([phase, taches]) => ({
        phase,
        // Dans chaque categorie : ce qui reste a faire d'abord (dans l'ordre du plan), puis ce qui
        // est en attente, puis ce qui est FAIT, en bas. On garde ainsi sous les yeux ce qui reste.
        // @author Rabah Ziane - 2026-09-01
        taches: taches.slice().sort((a, b) => {
          const rang = (t: RoadTache) => (t.statut === 'fait' ? 2 : t.statut === 'standby' ? 1 : 0);
          return rang(a) - rang(b) || (a.ordre ?? 1e9) - (b.ordre ?? 1e9);
        }),
        faites: taches.filter((t) => t.statut === 'fait').length,
        actives: taches.filter((t) => t.statut !== 'standby').length,
      }));
  }, [roadTaches]);
  const [roadMsgs, setRoadMsgs] = useState<RoadMsg[]>([]);
  const [roadTitre, setRoadTitre] = useState('');
  const [roadMsg, setRoadMsg] = useState('');
  const [roadBusy, setRoadBusy] = useState(false);
  const [roadPiece, setRoadPiece] = useState<File | null>(null); // capture jointe au message

  const appliquerRoad = (j: any) => { if (j?.ok) { setRoadTaches(j.taches || []); setRoadMsgs(j.messages || []); } };
  // Tant que la fenetre est ouverte : taches ET messages se rafraichissent tout seuls (2 s), pour
  // voir arriver ce que l'agence ajoute sans recharger. @author Rabah Ziane - 2026-08-31
  useEffect(() => {
    if (!roadAgence) return;
    const t = setInterval(() => {
      fetch(`/api/admin/agencies/${roadAgence.id}/pyemes/roadmap`, { headers: headers() })
        .then((r) => r.json()).then(appliquerRoad).catch(() => {});
    }, 2000);
    return () => clearInterval(t);
  }, [roadAgence]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ouvrirRoadmap(id: string, name: string) {
    chargerRetoursAdmin(id);
    setRoadAgence({ id, name }); setRoadTaches([]); setRoadMsgs([]);
    const j = await fetch(`/api/admin/agencies/${id}/pyemes/roadmap`, { headers: headers() }).then((r) => r.json()).catch(() => null);
    appliquerRoad(j);
  }
  async function ajouterTacheAdmin() {
    if (!roadAgence || !roadTitre.trim() || roadBusy) return;
    setRoadBusy(true);
    const j = await fetch(`/api/admin/agencies/${roadAgence.id}/pyemes/roadmap`, { method: 'POST', headers: headers(), body: JSON.stringify({ titre: roadTitre.trim() }) }).then((r) => r.json()).catch(() => null);
    appliquerRoad(j); setRoadTitre(''); setRoadBusy(false);
  }
  async function statutTacheAdmin(tid: string, statut: string) {
    if (!roadAgence) return;
    const j = await fetch(`/api/admin/agencies/${roadAgence.id}/pyemes/roadmap/${tid}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ statut }) }).then((r) => r.json()).catch(() => null);
    appliquerRoad(j);
  }
  // Glisser-deposer : reordonne dans la phase, met a jour tout de suite, puis persiste.
  // @author Rabah Ziane - 2026-09-01
  async function deposerSurAdmin(cible: RoadTache, taches: RoadTache[]) {
    if (!roadAgence || !dragId || dragId === cible.id) { setDragId(null); return; }
    const src = taches.findIndex((t) => t.id === dragId);
    const dst = taches.findIndex((t) => t.id === cible.id);
    if (src < 0 || dst < 0) { setDragId(null); return; }
    const ordonnees = taches.slice();
    ordonnees.splice(dst, 0, ordonnees.splice(src, 1)[0]);
    setDragId(null);
    const ids = ordonnees.map((t) => t.id);
    setRoadTaches((prev) => {
      const rang = new Map(ids.map((id, i) => [id, i + 1]));
      return prev.map((t) => (rang.has(t.id) ? { ...t, ordre: rang.get(t.id)! } : t));
    });
    const j = await fetch(`/api/admin/agencies/${roadAgence.id}/pyemes/roadmap-ordre`, {
      method: 'PATCH', headers: headers(), body: JSON.stringify({ ids }),
    }).then((r) => r.json()).catch(() => null);
    appliquerRoad(j);
  }
  async function supprimerTacheAdmin(tid: string) {
    if (!roadAgence) return;
    const j = await fetch(`/api/admin/agencies/${roadAgence.id}/pyemes/roadmap/${tid}`, { method: 'DELETE', headers: headers() }).then((r) => r.json()).catch(() => null);
    appliquerRoad(j);
  }
  async function envoyerMessageAdmin() {
    if (!roadAgence || (!roadMsg.trim() && !roadPiece) || roadBusy) return;
    setRoadBusy(true);
    // Multipart (texte + capture) : `headers()` pose un Content-Type JSON, on ne le reutilise donc
    // pas ici - seul le jeton est necessaire. @author Rabah Ziane - 2026-08-31
    const h = headers() as Record<string, string>;
    const fd = new FormData();
    fd.append('texte', roadMsg.trim());
    if (roadPiece) fd.append('image', roadPiece);
    const j = await fetch(`/api/admin/agencies/${roadAgence.id}/pyemes/messages`, {
      method: 'POST',
      headers: Object.fromEntries(Object.entries(h).filter(([k]) => k.toLowerCase() !== 'content-type')),
      body: fd,
    }).then((r) => r.json()).catch(() => null);
    appliquerRoad(j); setRoadMsg(''); setRoadPiece(null); setRoadBusy(false);
  }

  async function savePyemes() {
    if (!pyemesEdit) return;
    const code = pyemesEdit.code.trim().toUpperCase();
    if (!code) { alert('Code requis.'); return; }
    setPyemesSaving(true);
    try {
      const r = await fetch(`/api/admin/agencies/${pyemesEdit.id}/pyemes`, { method: 'POST', headers: headers(), body: JSON.stringify({ code, commission_percent: Number(pyemesEdit.pct) || 0 }) });
      const j = await r.json();
      if (j.ok) { setList((prev) => prev.map((a) => a._id === pyemesEdit.id ? { ...a, pyemesCode: code } : a)); setPyemesEdit(null); }
      else alert('Erreur : ' + (j.error || j.detail || 'échec'));
    } catch { alert('Connexion impossible.'); } finally { setPyemesSaving(false); }
  }
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
      // Dossiers montés par DDN en attente de validation client. @Rabah 2026-06-21
      const sr = await fetch('/api/admin/agencies/sign-requests', { headers: { 'x-admin-secret': secret || '' } }).then((x) => x.json()).catch(() => ({}));
      if (sr.ok) setSignRequests(sr.requests || []);
      const uj = await fetch('/api/admin/agencies/unavailabilities', { headers: { 'x-admin-secret': secret || '' } }).then((x) => x.json()).catch(() => ({}));
      if (uj.ok) setUnavail(uj.days || []);
      const sj = await fetch('/api/admin/agencies/stats', { headers: { 'x-admin-secret': secret || '' } }).then((x) => x.json()).catch(() => ({}));
      if (sj.ok) setStats(sj);
      // Clients (leads) créés par les agences : affichés en section sur la page admin. @Rabah 2026-06-19
      const cj = await fetch('/api/admin/agencies/clients', { headers: { 'x-admin-secret': secret || '' } }).then((x) => x.json()).catch(() => ({}));
      if (cj.ok) setClientsList(cj.clients || []);
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
  // Ordres de paiement : enregistrer un versement/avance d'une ou plusieurs parts de commission
  // (fixe et/ou %). Ne touche pas au contrat. @author Rabah Ziane - 2026-07-29
  async function addPaymentOrder(id: string, parts: { part: 'fixe' | 'pourcentage'; montant: number }[]) {
    const r = await fetch(`/api/admin/agencies/dossiers/${id}/payment-order`, { method: 'POST', headers: headers(), body: JSON.stringify({ parts }) }).then((x) => x.json()).catch(() => null);
    if (r && r.ok) setDossiers((prev) => prev.map((d) => d._id === id ? { ...d, paymentOrders: r.paymentOrders } : d));
  }
  async function deletePaymentOrder(id: string, poId: string) {
    const r = await fetch(`/api/admin/agencies/dossiers/${id}/payment-order/${poId}`, { method: 'DELETE', headers: headers() }).then((x) => x.json()).catch(() => null);
    if (r && r.ok) setDossiers((prev) => prev.map((d) => d._id === id ? { ...d, paymentOrders: r.paymentOrders } : d));
  }
  // Génération d'ordres de paiement (ordre de virement) multi-dossiers + montant OPCO. @Rabah 2026-07-29
  const [poSel, setPoSel] = useState<Set<string>>(new Set());
  const [poCcAgency, setPoCcAgency] = useState(false);
  const [poPreview, setPoPreview] = useState<{ agencyName: string; ds: AdminDossier[] } | null>(null);
  const [genOrders, setGenOrders] = useState<GenOrder[]>([]);
  useEffect(() => { void loadGenOrders(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  function togglePoSel(id: string) { setPoSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  async function setAmountOpco(id: string, amountOpco: number) {
    const r = await fetch(`/api/admin/agencies/dossiers/${id}/amount-opco`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ amountOpco }) }).then((x) => x.json()).catch(() => null);
    if (r && r.ok) load();
  }
  async function loadGenOrders() { const r = await fetch('/api/admin/agencies/payment-orders', { headers: headers() }).then((x) => x.json()).catch(() => null); if (r && r.ok) setGenOrders(r.orders || []); }
  async function markOrderPaid(id: string, paid: boolean) {
    const r = await fetch(`/api/admin/agencies/payment-orders/${id}/paid`, { method: 'POST', headers: headers(), body: JSON.stringify({ paid }) }).then((x) => x.json()).catch(() => null);
    if (r && r.ok) setGenOrders((prev) => prev.map((o) => o._id === id ? { ...o, paidAt: r.paidAt } : o));
  }
  async function generateOrder(dossierIds: string[], ccAgency: boolean) {
    const r = await fetch('/api/admin/agencies/payment-orders/generate', { method: 'POST', headers: headers(), body: JSON.stringify({ dossierIds, ccAgency }) }).then((x) => x.json()).catch(() => null);
    if (r && r.ok) { setPoPreview(null); setPoSel(new Set()); loadGenOrders(); alert(`Ordre ${r.order.ref} généré${r.sent ? ' et envoyé à Delivery Digital' : ' (email non parti, PDF dispo)'}.`); }
    else alert((r && r.message) || 'Génération impossible.');
  }
  const moisLabelFr = (ym?: string) => { const M = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']; const [y, m] = String(ym || '').split('-'); const i = parseInt(m, 10) - 1; return i >= 0 && i < 12 ? `${M[i]} ${y}` : (ym || '—'); };
  const dossierMonth = (d: AdminDossier) => new Date(d.sessionStart || d.createdAt || Date.now()).toISOString().slice(0, 7);
  // Montant de l'ordre de virement = ce qui est réellement versé = somme des avances/versements
  // enregistrés sur le dossier (fixe et/ou %). @Rabah 2026-07-29
  const aVerser = (d: AdminDossier) => (d.paymentOrders || []).reduce((a, p) => a + p.montant, 0);
  // Attestations de fin de formation (réussite + vitrophanie QR) : désélection des absents + aperçu
  // + envoi au client. @Rabah 2026-07-29
  const [attModal, setAttModal] = useState<AdminDossier | null>(null);
  const [attPresent, setAttPresent] = useState<Set<number>>(new Set());
  const [attEmail, setAttEmail] = useState('');
  const [attResult, setAttResult] = useState<{ attestationUrl?: string; vitrophanieUrl?: string; verifyUrl?: string } | null>(null);
  const [attBusy, setAttBusy] = useState(false);
  function openAttestations(d: AdminDossier) { setAttModal(d); setAttPresent(new Set((d.salaries || []).map((_, i) => i))); setAttEmail(d.clientEmail || ''); setAttResult(null); }
  async function attGenerate(send: boolean) {
    if (!attModal) return; setAttBusy(true);
    const r = await fetch(`/api/admin/agencies/dossiers/${attModal._id}/attestations`, { method: 'POST', headers: headers(), body: JSON.stringify({ presentIdx: [...attPresent], clientEmail: attEmail.trim(), send }) }).then((x) => x.json()).catch(() => null);
    setAttBusy(false);
    if (r && r.ok) { setAttResult(r); if (send && r.sent) alert('Attestations envoyées au client.'); else if (send) alert("Généré, mais l'email n'est pas parti (vérifiez l'adresse)."); }
    else alert('Erreur lors de la génération des attestations.');
  }
  // Étape "Montage OPCO" : DD a fait le rattachement OPCO (courrier d'activation) et/ou le dossier
  // attend le CSV des salariés. Visible en lecture seule côté agence. @author Rabah Ziane - 2026-06-24
  async function setMontage(id: string, patch: { aktoAttached?: boolean; salariesPending?: boolean }) {
    const apply = (d: AdminDossier) => ({ ...d, ...patch, ...(patch.aktoAttached != null ? { aktoAttachedAt: patch.aktoAttached ? new Date().toISOString() : undefined } : {}) });
    setDossiers((prev) => prev.map((d) => d._id === id ? apply(d) : d));
    setViewDossier((v) => v && v._id === id ? apply(v) : v);
    await fetch(`/api/admin/agencies/dossiers/${id}/montage`, { method: 'POST', headers: headers(), body: JSON.stringify(patch) });
  }
  // Pré-remplit les champs éditables (prix/stagiaire + formateur) à l'ouverture d'un dossier. @Rabah 2026-07-17
  useEffect(() => {
    if (!viewDossier) return;
    const n = (viewDossier.salaries || []).length || 1;
    setConvFormation(viewDossier.formationTitle || '');
    setConvPrice(String(Math.round((viewDossier.amountHT || 0) / n)));
    setConvTrainer(viewDossier.trainerName || 'Ziane Rabah');
    setConvTrainerEmail(viewDossier.trainerEmail || 'contact@deliverydigital.fr');
  }, [viewDossier]);
  // Charge formateurs inscrits + catalogue complet des formations (menus de la convention). @Rabah 2026-07-17
  useEffect(() => {
    const h = { 'x-admin-secret': secret || '' };
    fetch('/api/admin/trainers', { headers: h })
      .then((r) => r.ok ? r.json() : { trainers: [] })
      .then((j) => setTrainers(Array.isArray(j.trainers) ? j.trainers : []))
      .catch(() => { /* pas bloquant */ });
    fetch('/api/admin/agencies/formations', { headers: h })
      .then((r) => r.ok ? r.json() : { formations: [] })
      .then((j) => setCatalog(Array.isArray(j.formations) ? j.formations : []))
      .catch(() => { /* pas bloquant */ });
  }, [secret]);
  // Enregistre prix/stagiaire (-> montant HT = prix × nb stagiaires) + formateur, et répercute
  // sur la convention (le PDF lit le dossier). @author Rabah Ziane - 2026-07-17
  async function saveConventionFields() {
    if (!viewDossier) return;
    const n = (viewDossier.salaries || []).length || 1;
    const price = Number(convPrice) || 0;
    const amountHT = Math.round(price * n);
    setSavingConv(true);
    try {
      const r = await fetch(`/api/admin/agencies/dossiers/${viewDossier._id}/convention-fields`, { method: 'POST', headers: headers(), body: JSON.stringify({ amountHT, trainerName: convTrainer.trim(), trainerEmail: convTrainerEmail.trim(), formationTitle: convFormation.trim() }) }).then((x) => x.json());
      if (r.ok) {
        const patch = { amountHT: r.amountHT, trainerName: r.trainerName, trainerEmail: r.trainerEmail, formationTitle: r.formationTitle };
        setViewDossier((v) => v ? { ...v, ...patch } : v);
        setDossiers((prev) => prev.map((d) => d._id === viewDossier._id ? { ...d, ...patch } : d));
      } else alert('Erreur : ' + (r.error || 'enregistrement impossible'));
    } finally { setSavingConv(false); }
  }
  // Liste des formations pour le menu : catalogue complet (base) si dispo, sinon repli sur les 2 codées. @Rabah 2026-07-17
  const formList = catalog.length ? catalog : FORMATIONS.map((f) => ({ id: f.id, title: f.title, price: f.priceHT, hours: f.hours, active: true }));
  // Suppression DOUCE d'un dossier (superadmin) : hidden=true, pas de DELETE en base (réversible).
  // @author Rabah Ziane · 2026-06-09
  async function deleteDossier(d: AdminDossier) {
    if (!confirm(`Supprimer le dossier de « ${d.denom || 'ce client'} » ?\n\nIl disparaît de la liste (suppression douce, réversible).`)) return;
    setDossiers((prev) => prev.filter((x) => x._id !== d._id));
    await fetch(`/api/admin/agencies/dossiers/${d._id}`, { method: 'DELETE', headers: headers() });
  }
  // Relancer / annuler une demande de validation client (dossier monté par DDN). @Rabah 2026-06-21
  async function resendSignRequest(id: string) {
    const r = await fetch(`/api/admin/agencies/sign-requests/${id}/resend`, { method: 'POST', headers: headers() });
    const j = await r.json();
    alert(j.ok ? `✓ Lien renvoyé à ${j.sentTo}.` : 'Erreur : ' + (j.error || 'envoi impossible'));
  }
  async function cancelSignRequest(id: string) {
    if (!confirm('Annuler cette demande de validation ? Le lien envoyé au client ne sera plus valable.')) return;
    setSignRequests((p) => p.filter((s) => s.id !== id));
    await fetch(`/api/admin/agencies/sign-requests/${id}/cancel`, { method: 'POST', headers: headers() });
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

  // Enregistre la modification d'un client (nom + emails + SIRET + OPCO) côté superadmin. @Rabah 2026-06-18
  async function saveClient() {
    if (!editClient) return;
    setSavingClient(true);
    try {
      const r = await fetch(`/api/admin/agencies/clients/${editClient.id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ denom: editClient.denom, email: editClient.email, accountantEmail: editClient.accountantEmail, managerEmail: editClient.managerEmail, siret: editClient.siret, opco: editClient.opco }) });
      const j = await r.json();
      if (j.ok) {
        setClientsList((list) => list.map((c) => c.id === editClient.id ? { ...c, denom: editClient.denom, email: editClient.email, accountantEmail: editClient.accountantEmail, managerEmail: editClient.managerEmail, siret: editClient.siret, opco: editClient.opco } : c));
        setEditClient(null);
      } else alert('Erreur : ' + (j.error || 'enregistrement impossible'));
    } finally { setSavingClient(false); }
  }

  // Prévisualiser le tableau de bord d'une agence : on récupère un JWT agence court (2h) côté
  // serveur puis on ouvre /agence#preview=<token> dans un nouvel onglet. Le token n'est pas
  // persisté côté navigateur agence. @author Rabah Ziane - 2026-06-24
  async function viewAgencySpace(id: string) {
    setPreviewingSpace(id);
    try {
      const r = await fetch(`/api/admin/agencies/${id}/impersonate`, { method: 'POST', headers: headers() });
      const j = await r.json();
      if (!j.ok || !j.token) { alert('Erreur : ' + (j.error || 'prévisualisation impossible')); return; }
      window.open(`/agence#preview=${encodeURIComponent(j.token)}`, '_blank', 'noopener');
    } catch { alert('Erreur réseau'); } finally { setPreviewingSpace(null); }
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
                <table className="w-full text-[12.5px]"><thead className="text-[#86868B] text-[10px] uppercase tracking-wider"><tr className="border-b border-black/5"><th className="text-left px-5 py-2.5">Client</th><th className="text-left px-5 py-2.5">Emails (compta / gérant)</th><th className="text-left px-5 py-2.5">OPCO</th><th className="text-left px-5 py-2.5">Agence</th><th className="text-left px-5 py-2.5">Commercial</th><th className="text-left px-5 py-2.5">Enregistré le</th><th className="text-left px-5 py-2.5">Statut</th><th className="text-right px-5 py-2.5">Action</th></tr></thead>
                  <tbody className="divide-y divide-black/5">{clientsList.map((c) => (<tr key={c.id} className="hover:bg-black/[0.02]"><td className="px-5 py-2.5"><p className="font-medium text-[#1D1D1F]">{c.denom || '-'}</p><p className="text-[#86868B] text-[11px]">{c.email || c.siret || ''}</p></td><td className="px-5 py-2.5 text-[#86868B] text-[11px]"><p>{c.accountantEmail ? `Compta : ${c.accountantEmail}` : '—'}</p><p>{c.managerEmail ? `Gérant : ${c.managerEmail}` : '—'}</p></td><td className="px-5 py-2.5 text-[#86868B]">{c.opco || '-'}</td><td className="px-5 py-2.5 text-[#86868B]">{c.agence}</td><td className="px-5 py-2.5 text-[#86868B]">{c.commercial || '—'}</td><td className="px-5 py-2.5">{c.status}</td><td className="px-5 py-2.5 text-right"><button onClick={() => setEditClient({ id: c.id, denom: c.denom || '', email: c.email || '', accountantEmail: c.accountantEmail || '', managerEmail: c.managerEmail || '', siret: c.siret || '', opco: c.opco || '' })} className="px-3 py-1 rounded-lg border border-black/10 text-[11.5px] font-medium hover:bg-black/[0.04]">Modifier</button></td></tr>))}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Édition d'un client (superadmin) : nom + emails + SIRET + OPCO. @Rabah 2026-06-18 */}
      {editClient && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={() => setEditClient(null)}>
          <div className="w-full max-w-md my-10 bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/10"><h3 className="text-[15px] font-bold">Modifier le client</h3><button onClick={() => setEditClient(null)} className="h-8 w-8 rounded-full hover:bg-black/[0.05] inline-flex items-center justify-center"><X className="h-4 w-4" /></button></div>
            <div className="px-5 py-5 space-y-3">
              <div><label className="block text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-1">Nom du client</label><input value={editClient.denom} onChange={(e) => setEditClient({ ...editClient, denom: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" /></div>
              <div><label className="block text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-1">Email principal</label><input type="email" value={editClient.email} onChange={(e) => setEditClient({ ...editClient, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" /></div>
              <div><label className="block text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-1">Email comptable</label><input type="email" value={editClient.accountantEmail} onChange={(e) => setEditClient({ ...editClient, accountantEmail: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" /></div>
              <div><label className="block text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-1">Email gérant (signature convention)</label><input type="email" value={editClient.managerEmail} onChange={(e) => setEditClient({ ...editClient, managerEmail: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" /><p className="text-[10.5px] text-[#86868B] mt-1">La convention est envoyée au gérant si renseigné, sinon à l&apos;email principal.</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-1">SIRET</label><input value={editClient.siret} onChange={(e) => setEditClient({ ...editClient, siret: e.target.value })} inputMode="numeric" className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] font-mono focus:outline-none focus:border-black/30" /></div>
                <div><label className="block text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-1">OPCO</label><input value={editClient.opco} onChange={(e) => setEditClient({ ...editClient, opco: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setEditClient(null)} className="px-4 py-2 rounded-lg border border-black/10 text-[12.5px]">Annuler</button>
                <button onClick={saveClient} disabled={savingClient} className="px-4 py-2 rounded-lg bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED] disabled:opacity-60">{savingClient ? 'Enregistrement…' : 'Enregistrer'}</button>
              </div>
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
                      <button onClick={() => viewAgencySpace(a._id)} disabled={previewingSpace === a._id} title="Ouvrir le tableau de bord de l'agence tel qu'elle le voit (prévisualisation)" className="inline-flex items-center gap-1 text-[11.5px] text-[#34C759] hover:text-[#2ba84a] disabled:opacity-50">{previewingSpace === a._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} Visualiser l'espace</button>
                      <button onClick={() => setPyemesEdit({ id: a._id, name: a.name, code: a.pyemesCode || a.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12), pct: '30' })} title="Revente Pyemes : code de parrainage + % de commission" className="inline-flex items-center gap-1 text-[11.5px] text-[#635BFF] hover:opacity-80">💜 Pyemes{a.pyemesCode ? ` · ${a.pyemesCode}` : ''}</button>
                      {a.pyemesCode && (
                        <button onClick={() => ouvrirRoadmap(a._id, a.name)} title="Feuille de route Pyemes (partagée avec l'agence)" className="inline-flex items-center gap-1 text-[11.5px] text-[#1D6ADE] hover:opacity-80 ml-2">🗺️ Feuille de route</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal réglage revente Pyemes (code + %). @Rabah 2026-08-01 */}
      {pyemesEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !pyemesSaving && setPyemesEdit(null)}>
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold text-[#1D1D1F]">Revente Pyemes · {pyemesEdit.name}</h3>
            <p className="text-[12.5px] text-[#86868B] mt-1">Relie cette agence à Pyemes et fixe sa commission (% de la vente TTC).</p>
            <label className="block mt-4 text-[12px] font-semibold text-[#1D1D1F]">Code de parrainage</label>
            <input value={pyemesEdit.code} onChange={(e) => setPyemesEdit({ ...pyemesEdit, code: e.target.value.toUpperCase() })} className="mt-1 w-full h-10 px-3 rounded-lg border border-black/15 text-[14px] font-mono uppercase" placeholder="NOVA" />
            <p className="text-[11.5px] text-[#86868B] mt-1">Lien de vente : <code>pyemes.com/inscription?ag={pyemesEdit.code || 'CODE'}</code></p>
            <label className="block mt-3 text-[12px] font-semibold text-[#1D1D1F]">Commission (% TTC)</label>
            <input type="number" value={pyemesEdit.pct} onChange={(e) => setPyemesEdit({ ...pyemesEdit, pct: e.target.value })} className="mt-1 w-32 h-10 px-3 rounded-lg border border-black/15 text-[14px]" min={0} max={100} />
            <div className="mt-5 flex gap-2 justify-end">
              <button onClick={() => setPyemesEdit(null)} disabled={pyemesSaving} className="px-4 h-10 rounded-lg border border-black/15 text-[13px]">Annuler</button>
              <button onClick={savePyemes} disabled={pyemesSaving} className="px-4 h-10 rounded-lg bg-[#635BFF] text-white text-[13px] font-semibold disabled:opacity-60">{pyemesSaving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Feuille de route Pyemes : la MEME liste que celle vue par l'agence (User.pyemesRoadmap).
          DD ajoute ses demandes, coche, et repond dans le fil. @author Rabah Ziane - 2026-08-31 */}
      {roadAgence && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setRoadAgence(null)}>
          <div className="w-full max-w-[620px] max-h-[86vh] overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-[#1D1D1F]">Feuille de route Pyemes · {roadAgence.name}</h3>
                <p className="text-[12.5px] text-[#86868B] mt-1">Ce qui reste avant la mise en ligne. L'agence voit la même liste et peut vous demander des tâches.</p>
              </div>
              <button onClick={() => setRoadAgence(null)} className="text-[#86868B] text-[18px] leading-none">✕</button>
            </div>

            <div className="mt-4 flex gap-2">
              <input value={roadTitre} onChange={(e) => setRoadTitre(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ajouterTacheAdmin(); }} placeholder="Demander une tâche à l'agence…" className="flex-1 h-10 px-3 rounded-lg border border-black/15 text-[13px]" />
              <button onClick={ajouterTacheAdmin} disabled={roadBusy || !roadTitre.trim()} className="px-4 h-10 rounded-lg bg-[#635BFF] text-white text-[13px] font-semibold disabled:opacity-50">Ajouter</button>
            </div>

            {/* RETOURS CLIENTS : la meme colonne que cote agence (action #4). @Rabah 2026-09-01 */}
            <div className="mt-4 pt-4 border-t border-black/8">
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-[13px] font-semibold text-[#1D1D1F]">Retours clients</p>
                <span className="text-[12px] text-[#86868B]">
                  {retours.filter((r) => r.statut === 'nouveau' || r.statut === 'en_cours').length} à traiter · {retours.length} au total
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <input value={retourClient} onChange={(e) => setRetourClient(e.target.value)} placeholder="Qui ?" className="sm:w-40 h-9 px-3 rounded-lg border border-black/15 text-[13px]" />
                <input value={retourTexte} onChange={(e) => setRetourTexte(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ajouterRetourAdmin(); }} placeholder="Ce qu'il a dit…" className="flex-1 h-9 px-3 rounded-lg border border-black/15 text-[13px]" />
                <select value={retourGravite} onChange={(e) => setRetourGravite(e.target.value as 'bloquant' | 'genant' | 'idee')} className="h-9 px-2 rounded-lg border border-black/15 text-[13px]">
                  <option value="bloquant">Bloquant</option>
                  <option value="genant">Gênant</option>
                  <option value="idee">Idée</option>
                </select>
                <button onClick={ajouterRetourAdmin} disabled={!retourTexte.trim()} className="px-4 h-9 rounded-lg bg-[#635BFF] text-white text-[13px] font-semibold disabled:opacity-50">Ajouter</button>
              </div>
              {retours.length === 0 ? (
                <p className="text-[13px] text-[#86868B] mt-3">Aucun retour pour l&apos;instant.</p>
              ) : (
                <ul className="mt-3 space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {retours.map((r) => {
                    const clos = r.statut === 'traite' || r.statut === 'ecarte';
                    return (
                      <li key={r.id} className="rounded-lg border border-black/8 px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-[1px] rounded" style={GRAVITE_STYLE[r.gravite]}>{GRAVITE_LIB[r.gravite]}</span>
                          {r.client && <span className="text-[11.5px] text-[#1D1D1F]">{r.client}</span>}
                          <span className="text-[11px] text-[#A1A1A6]">
                            {r.from === 'dd' ? 'Delivery Digital' : (r.auteur || "L'agence")}
                            {r.createdAt ? ` · ${new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}` : ''}
                          </span>
                          <span className="flex-1" />
                          <select value={r.statut} onChange={(e) => statutRetourAdmin(r.id, e.target.value)} className="h-6 px-1 rounded border border-black/10 text-[11px]">
                            <option value="nouveau">Nouveau</option>
                            <option value="en_cours">En cours</option>
                            <option value="traite">Traité</option>
                            <option value="ecarte">Écarté</option>
                          </select>
                        </div>
                        <p className={`text-[13px] mt-1 ${clos ? 'text-[#86868B]' : 'text-[#1D1D1F]'}`}>{r.texte}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {roadTaches.length === 0 ? (
              <p className="text-[13px] text-[#86868B] mt-4">Aucune tâche pour l'instant.</p>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="h-1.5 flex-1 rounded-full bg-black/8 overflow-hidden">
                    <span className="block h-full rounded-full" style={{ width: `${roadTaches.filter((t) => t.statut !== 'standby').length ? Math.round((roadTaches.filter((t) => t.statut === 'fait').length / roadTaches.filter((t) => t.statut !== 'standby').length) * 100) : 0}%`, background: '#635BFF' }} />
                  </span>
                  <span className="text-[12px] text-[#86868B] tabular-nums shrink-0">
                    {roadTaches.filter((t) => t.statut === 'fait').length}/{roadTaches.filter((t) => t.statut !== 'standby').length} fait
                  </span>
                </div>
                {phasesRoadmap.map(({ phase, taches, faites, actives }) => {
                  const ouverte = phasesOuvertes[phase] !== false;
                  const pct = actives ? Math.round((faites / actives) * 100) : 0;
                  return (
                    <div key={phase} className="rounded-lg border border-black/8 overflow-hidden">
                      <button onClick={() => setPhasesOuvertes((p) => ({ ...p, [phase]: !ouverte }))} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-black/[0.02]">
                        <span className={`text-[#C7C7CC] text-[10px] transition-transform ${ouverte ? 'rotate-90' : ''}`}>▶</span>
                        <span className="flex-1 min-w-0 text-[13px] font-semibold text-[#1D1D1F] truncate">{phase}</span>
                        <span className="h-1 w-20 rounded-full bg-black/8 overflow-hidden shrink-0">
                          <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? '#34C759' : '#635BFF' }} />
                        </span>
                        <span className="text-[11.5px] text-[#A1A1A6] tabular-nums shrink-0">{faites}/{actives}</span>
                      </button>
                      {ouverte && (
                        <ul className="px-2 pb-2 space-y-1">
                          {taches.map((t) => {
                            const fait = t.statut === 'fait';
                            const attente = t.statut === 'standby';
                            return (
                              <li
                                key={t.id}
                                draggable
                                onDragStart={() => setDragId(t.id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => deposerSurAdmin(t, taches)}
                                onDragEnd={() => setDragId(null)}
                                className={`flex items-start gap-2.5 rounded-lg border border-black/8 px-3 py-2 cursor-grab active:cursor-grabbing ${dragId === t.id ? 'opacity-40' : ''}`}
                                style={{ background: attente ? '#FAFAFB' : 'transparent' }}
                              >
                                <span className="mt-1 text-[#C7C7CC] text-[11px] leading-none select-none shrink-0" aria-hidden>⠿</span>
                                <input type="checkbox" checked={fait} onChange={() => statutTacheAdmin(t.id, fait ? 'a_faire' : 'fait')} className="mt-1" />
                                <span className="flex-1 min-w-0">
                                  <span className="flex items-center gap-2 flex-wrap">
                                    {t.ordre ? <span className="text-[10.5px] font-bold text-[#C7C7CC] tabular-nums">#{t.ordre}</span> : null}
                                    {t.echeance && <span className="text-[10.5px] font-semibold text-[#86868B] tabular-nums">{t.echeance}</span>}
                                    {t.resp && <span className="text-[10px] font-bold px-1.5 py-[1px] rounded" style={RESP_STYLE[t.resp]}>{RESP_LIB[t.resp]}</span>}
                                    {t.ref && <span className="text-[10px] text-[#C7C7CC]">{t.ref}</span>}
                                    {attente && <span className="text-[10px] font-bold px-1.5 py-[1px] rounded" style={{ background: '#FFF4DC', color: '#9A6B00' }}>En attente</span>}
                                  </span>
                                  <span className={`block text-[13px] mt-0.5 ${fait ? 'text-[#86868B] line-through' : attente ? 'text-[#86868B]' : 'text-[#1D1D1F]'}`}>{t.titre}</span>
                                  {t.critere
                                    ? <span className="block text-[11px] text-[#A1A1A6] mt-0.5">C'est fait quand : {t.critere}</span>
                                    : <span className="block text-[11px] text-[#A1A1A6] mt-0.5">{t.from === 'dd' ? 'Demandé par Delivery Digital' : "Demandé par l'agence"}</span>}
                                </span>
                                <button
                                  onClick={() => statutTacheAdmin(t.id, attente ? 'a_faire' : 'standby')}
                                  title={attente ? 'Remettre à faire' : 'Mettre en attente'}
                                  className="text-[12px] shrink-0 mt-0.5"
                                  style={{ color: attente ? '#9A6B00' : '#C7C7CC' }}
                                >
                                  {attente ? '▶' : '⏸'}
                                </button>
                                {t.from === 'dd' && !t.ordre && <button onClick={() => supprimerTacheAdmin(t.id)} className="text-[12px] text-[#A1A1A6] hover:text-[#FF3B30] mt-0.5">✕</button>}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-black/8">
              <p className="text-[13px] font-semibold text-[#1D1D1F] mb-2">Discussion avec l'agence</p>
              {roadMsgs.length === 0 ? (
                <p className="text-[12.5px] text-[#86868B]">Aucun message.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {roadMsgs.map((m) => (
                    <div key={m.id} className={`flex ${m.from === 'dd' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[80%] rounded-xl px-3 py-2" style={{ background: m.from === 'dd' ? 'rgba(99,91,255,0.10)' : '#F5F5F7' }}>
                        <p className="text-[11px] text-[#A1A1A6] mb-0.5">{m.from === 'dd' ? 'Delivery Digital' : (m.auteur || "L'agence")}{m.at ? ` · ${new Date(m.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}</p>
                        {m.texte && <p className="text-[13px] text-[#1D1D1F] whitespace-pre-line">{m.texte}</p>}
                        {m.image && <a href={m.image} target="_blank" rel="noreferrer"><img src={m.image} alt="" className="mt-1 rounded-lg max-h-40 border border-black/10" /></a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-2 items-center">
                <input value={roadMsg} onChange={(e) => setRoadMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') envoyerMessageAdmin(); }} placeholder="Écrire à l'agence…" className="flex-1 h-10 px-3 rounded-lg border border-black/15 text-[13px]" />
                <label className="h-10 w-10 rounded-lg border border-black/15 inline-flex items-center justify-center cursor-pointer" title="Joindre une capture">
                  📎<input type="file" accept="image/*" className="hidden" onChange={(e) => { setRoadPiece(e.target.files?.[0] || null); e.currentTarget.value = ''; }} />
                </label>
                <button onClick={envoyerMessageAdmin} disabled={roadBusy || (!roadMsg.trim() && !roadPiece)} className="px-4 h-10 rounded-lg bg-[#635BFF] text-white text-[13px] font-semibold disabled:opacity-50">{roadBusy ? 'Envoi…' : 'Envoyer'}</button>
              </div>
              {roadPiece && <p className="text-[11.5px] text-[#86868B] mt-1">Capture jointe : {roadPiece.name} <button onClick={() => setRoadPiece(null)} className="underline ml-1">retirer</button></p>}
            </div>
          </div>
        </div>
      )}

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

              {/* Étapes "Accès OPCO" (rattachement) + "Montage OPCO" : pilotées par le super admin,
                  visibles côté agence dans son suivi. Le rattachement déclenche la confirmation
                  "courrier d'activation envoyé" que l'agence peut consulter. @Rabah 2026-06-24 */}
              <div className="mt-4 rounded-xl border border-[#0066CC]/25 bg-[#0066CC]/[0.04] p-3.5">
                <p className="text-[12px] font-bold text-[#1D1D1F]">Accès &amp; montage OPCO <span className="font-normal text-[#86868B]">· piloté par Delivery Digital</span></p>
                <p className="text-[11px] text-[#86868B] mt-0.5 mb-2.5">Indiquez l'avancement. L'agence le voit dans son suivi (le rattachement affiche « courrier envoyé »).</p>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <button onClick={() => setMontage(viewDossier._id, { aktoAttached: !viewDossier.aktoAttached })} className={`flex items-start gap-2.5 text-left rounded-lg border p-2.5 transition ${viewDossier.aktoAttached ? 'border-[#34C759]/50 bg-[#34C759]/5' : 'border-black/10 hover:bg-black/[0.02]'}`}>
                    <span className={`mt-0.5 h-4 w-4 rounded-[5px] border-2 grid place-items-center flex-shrink-0 ${viewDossier.aktoAttached ? 'bg-[#34C759] border-[#34C759] text-white' : 'border-black/25'}`}>{viewDossier.aktoAttached && <Check className="h-3 w-3" />}</span>
                    <span>
                      <span className="block text-[12px] font-semibold text-[#1D1D1F]">Demande de rattachement faite</span>
                      <span className="block text-[10.5px] text-[#86868B]">Courrier d'activation envoyé au client{viewDossier.aktoAttached && viewDossier.aktoAttachedAt ? ` · le ${new Date(viewDossier.aktoAttachedAt).toLocaleDateString('fr-FR')}` : ''}</span>
                    </span>
                  </button>
                  <button onClick={() => setMontage(viewDossier._id, { salariesPending: !viewDossier.salariesPending })} className={`flex items-start gap-2.5 text-left rounded-lg border p-2.5 transition ${viewDossier.salariesPending ? 'border-[#E5A000]/50 bg-[#E5A000]/5' : 'border-black/10 hover:bg-black/[0.02]'}`}>
                    <span className={`mt-0.5 h-4 w-4 rounded-[5px] border-2 grid place-items-center flex-shrink-0 ${viewDossier.salariesPending ? 'bg-[#E5A000] border-[#E5A000] text-white' : 'border-black/25'}`}>{viewDossier.salariesPending && <Check className="h-3 w-3" />}</span>
                    <span>
                      <span className="block text-[12px] font-semibold text-[#1D1D1F]">En attente du CSV salariés</span>
                      <span className="block text-[10.5px] text-[#86868B]">Le dossier attend la liste des salariés pour être déposé</span>
                    </span>
                  </button>
                </div>
              </div>

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

              {/* Édition convention : prix/stagiaire + formateur -> se répercute sur la Convention (PDF). @Rabah 2026-07-17 */}
              <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.015] p-3.5">
                <p className="text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-2.5">Convention · modifier</p>
                <div className="mb-3">
                  <label className="block text-[11px] font-semibold text-[#86868B] mb-1">Formation</label>
                  <select value={(formList.find((f) => f.title === convFormation)?.id) || '__cur'} onChange={(e) => { if (e.target.value === '__cur') return; const f = formList.find((x) => x.id === e.target.value); if (f) { setConvFormation(f.title); setConvPrice(String(f.price)); } }} className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] bg-white focus:outline-none focus:border-black/30">
                    {!formList.some((f) => f.title === convFormation) && <option value="__cur">{convFormation || 'Formation actuelle'}</option>}
                    {formList.map((f) => <option key={f.id} value={f.id}>{f.title}{f.hours ? ` (${f.hours}h` : ''}{f.hours ? ` · ${f.price}€)` : ''}</option>)}
                  </select>
                  <p className="text-[10.5px] text-[#86868B] mt-1">{formList.length} formation(s) au catalogue · choisir met à jour le prix par défaut (modifiable).</p>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#86868B] mb-1">Prix par stagiaire (€)</label>
                    <input type="number" min="0" value={convPrice} onChange={(e) => setConvPrice(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" />
                    <p className="text-[10.5px] text-[#86868B] mt-1">{(viewDossier.salaries || []).length || 1} stagiaire(s) → HT = <strong>{((Number(convPrice) || 0) * ((viewDossier.salaries || []).length || 1)).toLocaleString('fr-FR')} €</strong></p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#86868B] mb-1">Formateur</label>
                    <select value={trainers.some((t) => t.email === convTrainerEmail) ? convTrainerEmail : '__cur'} onChange={(e) => { if (e.target.value === '__cur') return; const t = trainers.find((x) => x.email === e.target.value); if (t) { setConvTrainer(t.name || ''); setConvTrainerEmail(t.email || ''); } }} className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] bg-white focus:outline-none focus:border-black/30">
                      {!trainers.some((t) => t.email === convTrainerEmail) && <option value="__cur">{convTrainer || 'Formateur actuel'}{convTrainerEmail ? ` (${convTrainerEmail})` : ''}</option>}
                      {trainers.map((t) => <option key={t.email} value={t.email}>{t.name || 'Sans nom'} ({t.email})</option>)}
                    </select>
                    <p className="text-[10.5px] text-[#86868B] mt-1">{trainers.length ? `${trainers.length} formateur(s) inscrit(s)` : 'Aucun formateur inscrit trouvé'}</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#86868B] mb-1">Email formateur</label>
                    <input value={convTrainerEmail} onChange={(e) => setConvTrainerEmail(e.target.value)} placeholder="contact@deliverydigital.fr" className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={saveConventionFields} disabled={savingConv} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D1D1F] text-white text-[12.5px] font-semibold hover:bg-black disabled:opacity-50">{savingConv ? 'Enregistrement…' : 'Enregistrer'}</button>
                  <span className="text-[11px] text-[#86868B]">Puis « Convention (PDF) » pour vérifier.</span>
                </div>
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

      {/* Monter un dossier OPCO en interne (DDN) : le client valide depuis son côté via lien sécurisé.
          Pour les clients qui ne veulent pas confier leurs accès OPCO. @Rabah 2026-06-21 */}
      <div id="sec-mount" className="scroll-mt-4 rounded-2xl bg-white border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-[#0066CC]" />
            <h3 className="font-semibold text-[14px]">Monter un dossier (Delivery Digital)</h3>
            {signRequests.length > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FF9F0A] text-white text-[11px] font-bold">{signRequests.length} en attente de validation</span>}
          </div>
          <button onClick={() => setShowMount(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED]"><Plus className="h-3.5 w-3.5" /> Monter un dossier</button>
        </div>
        <div className="px-5 py-3 text-[12.5px] text-[#86868B] border-b border-black/5">Pour les clients qui ne veulent pas donner leurs accès OPCO : vous montez le dossier ici, le client reçoit un lien sécurisé et <strong>valide en signant</strong> sa convention. Le dossier apparaît ensuite dans « Dossiers OPCO reçus ».</div>
        {signRequests.length === 0 ? (
          <p className="px-5 py-6 text-center text-[13px] text-[#86868B]">Aucun dossier en attente de validation client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="text-[#86868B] text-[10px] uppercase tracking-wider"><tr className="border-b border-black/5"><th className="text-left px-5 py-2.5">Client</th><th className="text-left px-5 py-2.5">Formation</th><th className="text-left px-5 py-2.5">Destinataire</th><th className="text-left px-5 py-2.5">Agence</th><th className="text-left px-5 py-2.5">Envoyé le</th><th className="text-right px-5 py-2.5">Actions</th></tr></thead>
              <tbody className="divide-y divide-black/5">{signRequests.map((s) => (
                <tr key={s.id} className="hover:bg-black/[0.02] align-top">
                  <td className="px-5 py-2.5"><p className="font-medium text-[#1D1D1F]">{s.denom || '-'}</p><p className="text-[#86868B] text-[11px]">{(s.salaries || 0)} stagiaire(s) · {(s.amountHT || 0).toLocaleString('fr-FR')} € HT</p></td>
                  <td className="px-5 py-2.5 text-[#86868B]">{s.formationTitle || '-'}</td>
                  <td className="px-5 py-2.5 text-[#86868B] text-[11px]">{s.recipient || '-'}</td>
                  <td className="px-5 py-2.5 text-[#86868B]">{s.agencyName || <span className="text-[#0066CC]">DDN direct</span>}</td>
                  <td className="px-5 py-2.5 text-[#86868B] text-[11px]">{s.createdAt ? new Date(s.createdAt).toLocaleDateString('fr-FR') : '-'}{s.expired && <span className="block text-[#FF3B30]">expiré</span>}</td>
                  <td className="px-5 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => navigator.clipboard?.writeText(s.link)} title="Copier le lien" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-black/10 text-[11px] mr-1.5 hover:bg-black/[0.03]"><Copy className="h-3 w-3" /> Lien</button>
                    <button onClick={() => resendSignRequest(s.id)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0066CC] text-white text-[11px] font-semibold mr-1.5"><Send className="h-3 w-3" /> Relancer</button>
                    <button onClick={() => cancelSignRequest(s.id)} title="Annuler la demande" className="text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal : monter un dossier (DDN) */}
      {showMount && <MountDossierModal agencies={list} headers={headers} onClose={() => setShowMount(false)} onDone={() => { setShowMount(false); load(); }} />}

      {/* Ordres de paiement : montants estimé / attribué OPCO par mois, avances (fixe/%/les 2), et
          génération d'un ordre de virement (PDF) multi-dossiers envoyé à Delivery Digital (copie
          agence en option). Le contrat n'est pas modifié. @author Rabah Ziane - 2026-07-29 */}
      <div id="sec-paiements" className="scroll-mt-4 rounded-2xl bg-white border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10">
          <h3 className="font-semibold text-[14px]">Ordres de paiement</h3>
          <p className="text-[12px] text-[#86868B] mt-0.5">Montant <strong>estimé</strong> et <strong>attribué OPCO</strong> par mois. Le % se calcule sur le montant OPCO dès qu'il est saisi (sinon l'estimé). Avancez le fixe, le %, ou les deux ; ou générez un <strong>ordre de virement</strong> (PDF) pour plusieurs dossiers, envoyé à Delivery Digital.</p>
        </div>
        {genOrders.length > 0 && (
          <div className="px-5 py-3 border-b border-black/10 bg-black/[0.02]">
            <p className="text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-2">Ordres de virement générés</p>
            <div className="flex flex-wrap gap-2">
              {genOrders.map((o) => (
                <div key={o._id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-black/10 text-[11.5px]">
                  <a href={pdfHref(o)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline"><span className="font-semibold text-[#0066CC]">{o.ref}</span> · {o.agencyName} · {(o.totalCommission || 0).toLocaleString('fr-FR')} €</a>
                  {o.paidAt
                    ? <button onClick={() => markOrderPaid(o._id, false)} title="Payé à l'agence · cliquer pour annuler" className="text-[#34C759] font-semibold">✓ Payé</button>
                    : <button onClick={() => markOrderPaid(o._id, true)} className="px-2 py-0.5 rounded-full bg-[#34C759] text-white font-semibold">Marquer payé à l'agence</button>}
                </div>
              ))}
            </div>
          </div>
        )}
        {(() => {
          const withComm = dossiers.filter((d) => (d.commission || 0) > 0);
          if (!withComm.length) return <p className="px-5 py-8 text-center text-[13px] text-[#86868B]">Aucun dossier avec commission pour l'instant.</p>;
          const groups = new Map<string, typeof withComm>();
          withComm.forEach((d) => { const k = d.agencyName || 'Agence'; if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(d); });
          return <div className="divide-y divide-black/10">{[...groups.entries()].map(([agencyName, ds]) => {
            const selIds = ds.filter((d) => poSel.has(d._id)).map((d) => d._id);
            const selTotal = ds.filter((d) => poSel.has(d._id)).reduce((s, d) => s + aVerser(d), 0);
            const byMonth = new Map<string, typeof ds>();
            ds.forEach((d) => { const m = dossierMonth(d); if (!byMonth.has(m)) byMonth.set(m, [] as unknown as typeof ds); byMonth.get(m)!.push(d); });
            const months = [...byMonth.keys()].sort().reverse();
            return (
              <div key={agencyName}>
                <div className="px-5 py-2.5 bg-black/[0.03] flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[#86868B]" /><span className="font-semibold text-[13px] text-[#1D1D1F]">{agencyName}</span></div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="inline-flex items-center gap-1.5 text-[11.5px] text-[#86868B]"><input type="checkbox" checked={poCcAgency} onChange={(e) => setPoCcAgency(e.target.checked)} /> Copie à l'agence</label>
                    <button disabled={!selIds.length} onClick={() => setPoPreview({ agencyName, ds: ds.filter((d) => poSel.has(d._id)) })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold disabled:opacity-40 bg-[#0066CC] text-white">Générer un ordre de paiement · {selIds.length} · {selTotal.toLocaleString('fr-FR')} €</button>
                  </div>
                </div>
                {months.map((ym) => (
                  <div key={ym}>
                    <div className="px-5 pt-2 pb-1 text-[11px] uppercase tracking-wider font-bold text-[#0066CC]">{moisLabelFr(ym)}</div>
                    <div className="divide-y divide-black/5">
                      {byMonth.get(ym)!.map((d) => {
                        const poF = (d.paymentOrders || []).filter((p) => p.part === 'fixe').reduce((a, p) => a + p.montant, 0);
                        const poP = (d.paymentOrders || []).filter((p) => p.part === 'pourcentage').reduce((a, p) => a + p.montant, 0);
                        const fixeDu = d.commissionFixAmount || 0, pctDu = d.commissionPctAmount || 0;
                        const fixeReste = Math.max(0, fixeDu - poF), pctReste = Math.max(0, pctDu - poP);
                        const verbe = d.opcoPaid ? 'Verser' : 'Avancer';
                        return (
                          <div key={d._id} className="px-5 py-3">
                            <div className="flex items-start gap-3 flex-wrap">
                              <input type="checkbox" className="mt-1" checked={poSel.has(d._id)} onChange={() => togglePoSel(d._id)} />
                              <div className="flex-1 min-w-[220px]">
                                <p className="font-semibold text-[13px] text-[#1D1D1F]">{d.denom || 'Client'}</p>
                                <div className="mt-1 flex items-center gap-3 flex-wrap text-[11.5px] text-[#86868B]">
                                  <span>Estimé : <strong className="text-[#1D1D1F]">{(d.amountHT || 0).toLocaleString('fr-FR')} €</strong></span>
                                  <label className="inline-flex items-center gap-1">Attribué OPCO : <input type="number" defaultValue={d.amountOpco || 0} onBlur={(e) => { const v = Math.max(0, Math.round(Number(e.target.value) || 0)); if (v !== (d.amountOpco || 0)) setAmountOpco(d._id, v); }} className="w-24 px-2 py-0.5 rounded border border-black/15 text-[12px]" /> €</label>
                                  <span>Commission : <strong className="text-[#1D1D1F]">{(d.commission || 0).toLocaleString('fr-FR')} €</strong> (fixe {fixeDu.toLocaleString('fr-FR')} + % {pctDu.toLocaleString('fr-FR')})</span>
                                  <span>{d.opcoPaid ? <span className="text-[#0A84FF]">OPCO payé</span> : <span className="text-[#FF9F0A]">OPCO non payé</span>}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {fixeReste > 0 && <button onClick={() => addPaymentOrder(d._id, [{ part: 'fixe', montant: fixeReste }])} className="px-2.5 py-1 rounded-md border border-black/10 text-[11px] hover:bg-black/[0.03]">{verbe} fixe · {fixeReste.toLocaleString('fr-FR')} €</button>}
                                {pctReste > 0 && <button onClick={() => addPaymentOrder(d._id, [{ part: 'pourcentage', montant: pctReste }])} className="px-2.5 py-1 rounded-md border border-black/10 text-[11px] hover:bg-black/[0.03]">{verbe} % · {pctReste.toLocaleString('fr-FR')} €</button>}
                                {fixeReste > 0 && pctReste > 0 && <button onClick={() => addPaymentOrder(d._id, [{ part: 'fixe', montant: fixeReste }, { part: 'pourcentage', montant: pctReste }])} className="px-2.5 py-1 rounded-md bg-[#34C759] text-white text-[11px] font-semibold">{verbe} les 2</button>}
                                {fixeReste === 0 && pctReste === 0 && <span className="text-[11.5px] text-[#34C759] font-semibold">Soldé ✓</span>}
                              </div>
                            </div>
                            {(d.paymentOrders || []).length > 0 && (
                              <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
                                {(d.paymentOrders || []).map((p) => (
                                  <span key={p._id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/[0.04] text-[11px] text-[#1D1D1F]">{p.avance ? 'Avance' : 'Versement'} {p.part === 'fixe' ? 'fixe' : '%'} · {p.montant.toLocaleString('fr-FR')} €<button onClick={() => deletePaymentOrder(d._id, p._id)} className="text-[#FF3B30] hover:opacity-70" title="Annuler">×</button></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}</div>;
        })()}
      </div>

      {/* Aperçu / envoi d'un ordre de paiement (ordre de virement). @Rabah 2026-07-29 */}
      {poPreview && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setPoPreview(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const total = poPreview.ds.reduce((s, d) => s + aVerser(d), 0);
              const agencyEmail = list.find((a) => a.name === poPreview.agencyName)?.email || '';
              const iban = poPreview.ds.find((d) => d.agencyIban)?.agencyIban || '';
              return (<>
                <h3 className="text-[16px] font-bold">Aperçu de l'email · {poPreview.agencyName}</h3>
                <p className="text-[12px] text-[#86868B] mt-1">Voici l'email qui sera envoyé (avec le PDF de l'ordre de virement en pièce jointe).</p>
                {/* Prévisualisation façon email */}
                <div className="mt-3 rounded-xl border border-black/10 overflow-hidden">
                  <div className="px-4 py-2.5 bg-black/[0.03] text-[12px] space-y-0.5">
                    <div><span className="text-[#86868B]">À :</span> <span className="text-[#1D1D1F]">contact@deliverydigital.fr</span></div>
                    <div><span className="text-[#86868B]">Copie :</span> <span className="text-[#1D1D1F]">{poCcAgency ? (agencyEmail || "l'agence") : '—'}</span></div>
                    <div><span className="text-[#86868B]">Objet :</span> <span className="text-[#1D1D1F]">Ordre de paiement · {poPreview.agencyName} · {total.toLocaleString('fr-FR')} €</span></div>
                  </div>
                  <div className="px-4 py-3 text-[12.5px] text-[#1D1D1F]">
                    <p className="text-[14px] font-bold text-[#0066CC]">Ordre de paiement</p>
                    <p className="mt-1">Bénéficiaire : <b>{poPreview.agencyName}</b>{iban ? <> · IBAN <span className="font-mono text-[11.5px]">{iban}</span></> : ''}</p>
                    <table className="w-full mt-2 text-[12px]"><tbody>
                      {poPreview.ds.map((d) => { const poFixe = (d.paymentOrders || []).filter((p) => p.part === 'fixe').reduce((a, p) => a + p.montant, 0); const poPct = (d.paymentOrders || []).filter((p) => p.part === 'pourcentage').reduce((a, p) => a + p.montant, 0); return (
                        <tr key={d._id} className="border-b border-black/5"><td className="py-1.5">{moisLabelFr(dossierMonth(d))}</td><td className="py-1.5">{d.denom}</td><td className="py-1.5 text-right">{poFixe ? `fixe ${poFixe.toLocaleString('fr-FR')}` : ''}{poFixe && poPct ? ' + ' : ''}{poPct ? `% ${poPct.toLocaleString('fr-FR')}` : ''} = <b>{aVerser(d).toLocaleString('fr-FR')} €</b></td></tr>
                      ); })}
                    </tbody></table>
                    <p className="mt-2 text-[14px]"><b>Total à verser : {total.toLocaleString('fr-FR')} €</b></p>
                    <p className="mt-1 text-[11px] text-[#86868B]">PDF de l'ordre de virement joint. Généré depuis l'espace admin Delivery Digital.</p>
                  </div>
                </div>
              </>);
            })()}
            <label className="mt-3 flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={poCcAgency} onChange={(e) => setPoCcAgency(e.target.checked)} /> Mettre l'agence en copie de l'email</label>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setPoPreview(null)} className="px-4 py-2 rounded-full border border-black/10 text-[13px]">Annuler</button>
              <button onClick={() => generateOrder(poPreview.ds.map((d) => d._id), poCcAgency)} className="px-4 py-2 rounded-full bg-[#0066CC] text-white text-[13px] font-semibold">Générer &amp; envoyer</button>
            </div>
          </div>
        </div>
      )}

      {/* Attestations de fin de formation (réussite + vitrophanie QR) : désélection des absents +
          aperçu + envoi au client. @Rabah 2026-07-29 */}
      {attModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAttModal(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold">Attestations de fin de formation</h3>
            <p className="text-[12px] text-[#86868B] mt-1">{attModal.denom} · {attModal.formationTitle}. Décochez les apprenants <strong>absents</strong> avant l'envoi. Le QR renvoie à une page de vérification officielle (dates + apprenants).</p>
            <p className="text-[11px] uppercase tracking-wider font-bold text-[#86868B] mt-3 mb-1">Apprenants présents</p>
            <div className="space-y-1.5">
              {(attModal.salaries || []).map((s, i) => (
                <label key={i} className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={attPresent.has(i)} onChange={() => setAttPresent((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; })} /> {[s.firstname, s.lastname].filter(Boolean).join(' ') || `Salarié ${i + 1}`}</label>
              ))}
              {(!attModal.salaries || !attModal.salaries.length) && <p className="text-[12px] text-[#86868B]">Aucun salarié enregistré sur ce dossier.</p>}
            </div>
            <label className="mt-3 block"><span className="text-[11px] uppercase tracking-wider font-bold text-[#86868B]">Email du client</span><input value={attEmail} onChange={(e) => setAttEmail(e.target.value)} placeholder="client@exemple.fr" className="w-full mt-1 px-3 py-2 rounded-lg border border-black/10 text-[13px]" /></label>
            {attResult && (
              <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                <a href={attResult.attestationUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-full border border-black/10 hover:bg-black/[0.03]">Aperçu attestation (PDF)</a>
                <a href={attResult.vitrophanieUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-full border border-black/10 hover:bg-black/[0.03]">Aperçu vitrophanie (PDF)</a>
                <a href={attResult.verifyUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-full border border-black/10 hover:bg-black/[0.03]">Page de vérification (QR)</a>
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setAttModal(null)} className="px-4 py-2 rounded-full border border-black/10 text-[13px]">Fermer</button>
              <button disabled={attBusy} onClick={() => attGenerate(false)} className="px-4 py-2 rounded-full border border-black/10 text-[13px] disabled:opacity-40">Prévisualiser</button>
              <button disabled={attBusy || !attEmail.trim() || !attPresent.size} onClick={() => attGenerate(true)} className="px-4 py-2 rounded-full bg-[#0066CC] text-white text-[13px] font-semibold disabled:opacity-40">Envoyer au client</button>
            </div>
          </div>
        </div>
      )}

      {/* Dossiers OPCO recus : statut jusqu'au paiement + versement commission (multi-select) */}
      <div id="sec-dossiers" className="scroll-mt-4 rounded-2xl bg-white border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[14px]">Dossiers OPCO reçus</h3>
            {/* Compteur "à traiter" : brouillons exclus (pas encore finalisés). @Rabah 2026-07-02 */}
            {dossiers.filter((d) => d.status === 'transmitted' && !d.draft).length > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#0066CC] text-white text-[11px] font-bold">{dossiers.filter((d) => d.status === 'transmitted' && !d.draft).length} nouveau{dossiers.filter((d) => d.status === 'transmitted' && !d.draft).length > 1 ? 'x' : ''} à traiter</span>}
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
              dossiers.forEach((d) => { const k = d.agencyName || 'Delivery Digital (direct)'; if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(d); });
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
                            <Fragment key={d._id}>
                            <tr className={`hover:bg-black/[0.02] ${selDoss.has(d._id) ? 'bg-[#34C759]/5' : ''}`}>
                              <td className="px-3 py-2.5"><input type="checkbox" checked={selDoss.has(d._id)} onChange={() => toggleSel(d._id)} /></td>
                              <td className="px-3 py-2.5"><button onClick={() => setViewDossier(d)} className="text-left"><p className="font-semibold text-[#1D1D1F] underline decoration-dotted underline-offset-2 hover:text-[#0A84FF]">{d.denom || 'Client'}{d.mountedByAdmin && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#0066CC]/10 text-[#0066CC] text-[9.5px] font-bold align-middle">Monté DDN</span>}{d.draft && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A] text-[9.5px] font-bold align-middle" title="Brouillon enregistré par l'agence, pas encore finalisé/transmis">Brouillon</span>}</p><p className="text-[#86868B] text-[11px]">{d.formationTitle} · {(d.salaries || []).length} stagiaire(s)</p></button>
                                <span className="ml-2 align-middle"><SessionDatesBadge start={d.sessionStart} end={d.sessionEnd} name={d.sessionName} /></span>{/* Suivi & tâches dépliable (comme l'agence). @Rabah 2026-07-02 */}<button onClick={() => setOpenDossier((v) => v === d._id ? null : d._id)} className={`mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${openDossier === d._id ? 'bg-[#0066CC] text-white border-[#0066CC]' : 'bg-[#0066CC]/8 text-[#0066CC] border-[#0066CC]/30 hover:bg-[#0066CC]/15'}`}><Clock className="h-3.5 w-3.5" /> Suivi & tâches{d.tasks && d.tasks.length ? ` (${d.tasks.length})` : ''}{openDossier === d._id ? ' ▲' : ' ▼'}</button><button onClick={() => openAttestations(d)} title="Envoyer les attestations de fin de formation (réussite + vitrophanie)" className="mt-1.5 ml-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-[#C9A227]/50 bg-[#C9A227]/10 text-[#8a6d0f] hover:bg-[#C9A227]/20">📄 Attestations</button></td>
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
                            {/* Ligne dépliable : timeline + tâches collaboratives (côté DDN). @Rabah 2026-07-02 */}
                            {openDossier === d._id && (
                              <tr className="bg-[#EEF4FF]">
                                <td colSpan={6} className="px-4 pb-4 pt-2">
                                  {/* Carte encadrée bien visible (avant : fond quasi invisible). @Rabah 2026-07-02 */}
                                  <div className="rounded-xl border-2 border-[#0066CC]/30 bg-white shadow-md p-4">
                                  <p className="text-[12px] uppercase tracking-wider font-extrabold text-[#0066CC] mb-3 flex items-center gap-1.5"><Clock className="h-4 w-4" /> Suivi &amp; tâches · {d.denom || 'Client'}</p>
                                  <AdminDossierTimeline d={d} />
                                  <DossierTasks
                                    tasks={d.tasks || []}
                                    emailSuggestions={[list.find((a) => a.name === d.agencyName)?.email, 'contact@deliverydigital.fr', d.clientEmail].filter(Boolean) as string[]}
                                    onAdd={async (tk) => { const r = await fetch(`/api/admin/agencies/dossiers/${d._id}/tasks`, { method: 'POST', headers: headers(), body: JSON.stringify(tk) }); const j = await r.json(); if (j.ok) setDossiers((prev) => prev.map((x) => x._id === d._id ? { ...x, tasks: j.tasks } : x)); }}
                                    onToggle={async (taskId, done) => { const r = await fetch(`/api/admin/agencies/dossiers/${d._id}/tasks/${taskId}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ done }) }); const j = await r.json(); if (j.ok) setDossiers((prev) => prev.map((x) => x._id === d._id ? { ...x, tasks: j.tasks } : x)); }}
                                    onEditComment={async (taskId, comment) => { const r = await fetch(`/api/admin/agencies/dossiers/${d._id}/tasks/${taskId}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ comment }) }); const j = await r.json(); if (j.ok) setDossiers((prev) => prev.map((x) => x._id === d._id ? { ...x, tasks: j.tasks } : x)); }}
                                    onDelete={async (taskId) => { const r = await fetch(`/api/admin/agencies/dossiers/${d._id}/tasks/${taskId}`, { method: 'DELETE', headers: headers() }); const j = await r.json(); if (j.ok) setDossiers((prev) => prev.map((x) => x._id === d._id ? { ...x, tasks: j.tasks } : x)); }}
                                  />
                                  </div>
                                </td>
                              </tr>
                            )}
                            </Fragment>
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

      {/* Clients (leads) enregistres par les agences - affiches directement sur la page admin. @Rabah 2026-06-19 */}
      <div className="rounded-2xl bg-white border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10"><h3 className="font-semibold text-[14px]">Clients enregistrés par les agences ({clientsList.length})</h3><p className="text-[12px] text-[#86868B] mt-0.5">Tous les clients créés par les agences et commerciaux. Modifiez le nom ou les e-mails (comptable / gérant) si besoin.</p></div>
        {clientsList.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[#86868B]">Aucun client enregistré pour l'instant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="text-[#86868B] text-[10px] uppercase tracking-wider">
                <tr className="border-b border-black/5"><th className="text-left px-5 py-2.5">Client</th><th className="text-left px-5 py-2.5">Emails (compta / gérant)</th><th className="text-left px-5 py-2.5">OPCO</th><th className="text-left px-5 py-2.5">Agence</th><th className="text-left px-5 py-2.5">Commercial</th><th className="text-left px-5 py-2.5">Statut</th><th className="text-right px-5 py-2.5">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-black/5">{clientsList.map((c) => (
                <tr key={c.id} className="hover:bg-black/[0.02] align-top">
                  <td className="px-5 py-2.5"><p className="font-medium text-[#1D1D1F]">{c.denom || '-'}</p><p className="text-[#86868B] text-[11px]">{c.email || c.siret || ''}</p>{/* Badge budget OPCO basculable en 1 clic. @Rabah 2026-07-02 */}<button onClick={async () => { try { await fetch(`/api/admin/agencies/clients/${c.id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ formationDoneThisYear: !c.formationDoneThisYear }) }); setClientsList((prev) => prev.map((x) => x.id === c.id ? { ...x, formationDoneThisYear: !c.formationDoneThisYear } : x)); } catch { /* */ } }} title="Cliquer pour basculer : Budget OPCO 100% dispo ↔ Formation faite cette année" className={`mt-1 inline-flex px-1.5 py-0.5 rounded-full text-[10px] border transition hover:brightness-95 cursor-pointer ${c.formationDoneThisYear ? 'border-[#E5A000]/40 text-[#B87A00] bg-[#E5A000]/10' : 'border-[#34C759]/40 text-[#1a9d4b] bg-[#34C759]/10'}`}>{c.formationDoneThisYear ? 'Formation faite cette année' : 'Budget OPCO 100% dispo'}</button></td>
                  <td className="px-5 py-2.5 text-[#86868B] text-[11px]"><p>{c.accountantEmail ? `Compta : ${c.accountantEmail}` : '-'}</p><p>{c.managerEmail ? `Gérant : ${c.managerEmail}` : '-'}</p></td>
                  <td className="px-5 py-2.5 text-[#86868B]">{c.opco || '-'}</td>
                  <td className="px-5 py-2.5 text-[#86868B]">{c.agence}</td>
                  <td className="px-5 py-2.5 text-[#86868B]">{c.commercial || '-'}</td>
                  <td className="px-5 py-2.5">{c.createdAt ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#0066CC]/10 text-[#0066CC] font-semibold text-[11.5px] whitespace-nowrap"><Clock className="h-3.5 w-3.5" />{new Date(c.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> : <span className="text-[#86868B]">-</span>}</td>
                  <td className="px-5 py-2.5">{c.status}</td>
                  <td className="px-5 py-2.5 text-right"><div className="inline-flex items-center gap-2"><button onClick={() => setEditClient({ id: c.id, denom: c.denom || '', email: c.email || '', accountantEmail: c.accountantEmail || '', managerEmail: c.managerEmail || '', siret: c.siret || '', opco: c.opco || '' })} className="px-3 py-1 rounded-lg border border-black/10 text-[11.5px] font-medium hover:bg-black/[0.04]">Modifier</button>{/* Masquer le client (soft delete, jamais de suppression dure). @Rabah 2026-07-02 */}<button onClick={async () => { if (!confirm(`Masquer le client « ${c.denom || 'ce client'} » ? Il sera retiré de la liste (réversible en base).`)) return; try { await fetch(`/api/admin/agencies/clients/${c.id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ hidden: true }) }); setClientsList((prev) => prev.filter((x) => x.id !== c.id)); } catch { /* */ } }} title="Masquer ce client (réversible)" className="text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded p-1"><Trash2 className="h-3.5 w-3.5" /></button></div></td>
                </tr>
              ))}</tbody>
            </table>
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

/**
 * Encadré des dates de formation, affiché directement dans les listes de dossiers pour éviter
 * d'ouvrir la fiche juste pour savoir quand la session a lieu.
 * @author Rabah Ziane · 2026-07-20
 */
function SessionDatesBadge({ start, end, name }: { start?: string; end?: string; name?: string }) {
  if (!start) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-black/10 bg-black/[0.03] text-[10.5px] font-semibold text-[#86868B] align-middle">
        Dates à planifier{name ? ` · ${name}` : ''}
      </span>
    );
  }
  const d1 = new Date(start);
  const d2 = end ? new Date(end) : null;
  const dow = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').toUpperCase();
  const day = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const sameDay = d2 && d1.toDateString() === d2.toDateString();
  return (
    <span className="inline-flex flex-col px-2.5 py-1 rounded-lg border border-[#34C759]/40 bg-[#34C759]/8 align-middle leading-tight">
      <span className="text-[9px] font-extrabold tracking-wider text-[#1a9d4b]">
        {d2 && !sameDay ? `${dow(d1)} → ${dow(d2)}` : dow(d1)}
      </span>
      <span className="text-[11.5px] font-bold text-[#1D1D1F] whitespace-nowrap">
        {d2 && !sameDay ? `${day(d1)} → ${day(d2)} ${d2.getFullYear()}` : `${day(d1)} ${d1.getFullYear()}`}
      </span>
    </span>
  );
}

function AdminDossierTimeline({ d }: { d: { status: string; createdAt?: string; updatedAt?: string; sessionStart?: string; sessionEnd?: string; sessionName?: string; signedAt?: string; aktoAttached?: boolean; aktoAttachedAt?: string; salariesPending?: boolean } }) {
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
  // Étapes "Accès OPCO" (rattachement -> courrier d'activation) puis "Montage OPCO" (dossier monté
  // + attente CSV), intercalées entre Transmis et En instruction. Nœuds virtuels (pas des statuts).
  // @author Rabah Ziane - 2026-06-24
  const acces = {
    done: cur >= 1,
    active: cur < 1 && !isRejected && !!d.aktoAttached,
    sub: d.aktoAttached ? 'Rattachement demandé · courrier envoyé' + (d.aktoAttachedAt ? ' le ' + fmt(d.aktoAttachedAt) : '') : 'Accès client',
  };
  const montage = {
    done: cur >= 1,
    active: cur < 1 && !isRejected && !d.aktoAttached,
    sub: cur >= 1 ? 'Dossier monté' : d.salariesPending ? 'Attente CSV salariés' : 'À monter',
  };
  // Liste affichée : Transmis, [Accès OPCO], [Montage OPCO], puis le reste du pipeline.
  type Node = { key: string; label: string; done: boolean; active: boolean; sub: string };
  const nodes: Node[] = [
    { key: 'transmitted', label: 'Transmis', done: cur > 0, active: cur === 0 && !isRejected, sub: subFor('transmitted') },
    { key: 'acces', label: 'Accès OPCO', done: acces.done, active: acces.active, sub: acces.sub },
    { key: 'montage', label: 'Montage OPCO', done: montage.done, active: montage.active, sub: montage.sub },
    ...STEPS.slice(1).map((s, idx) => { const i = idx + 1; return { key: s.key, label: s.label, done: i < cur, active: i === cur && !isRejected, sub: subFor(s.key) }; }),
  ];
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-[#86868B] mb-2">Suivi du dossier</p>
      {isRejected && <p className="text-[12px] text-[#FF3B30] font-semibold mb-2">Dossier refusé par l'OPCO.</p>}
      <div className="flex items-start gap-1 overflow-x-auto pb-1">
        {nodes.map((n, i) => (
          <div key={n.key} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center w-[78px] text-center">
              <span className={`h-3.5 w-3.5 rounded-full border-2 ${n.done ? 'bg-[#34C759] border-[#34C759]' : n.active ? 'bg-[#0066CC] border-[#0066CC]' : 'bg-white border-black/15'}`} />
              <span className={`text-[10px] mt-1 leading-tight ${n.done || n.active ? 'text-[#1D1D1F] font-semibold' : 'text-[#86868B]'}`}>{n.label}</span>
              {n.sub && <span className="text-[9px] text-[#86868B] mt-0.5">{n.sub}</span>}
            </div>
            {i < nodes.length - 1 && <span className={`h-[2px] w-5 mt-[7px] ${n.done ? 'bg-[#34C759]' : 'bg-black/10'}`} />}
          </div>
        ))}
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
type PrintDossier = { _id: string; denom?: string; siret?: string; opco?: string; addr?: string; clientEmail?: string; formationTitle?: string; sessionName?: string; sessionStart?: string; sessionEnd?: string; salaries?: PrintSalarie[]; signedBy?: string; signedFunction?: string; signedIp?: string; signatureDataUrl?: string; signedRemote?: boolean; signedAt?: string; amountHT?: number; trainerName?: string; trainerEmail?: string; createdAt?: string; invoiceNumber?: string };
// Dates de session lisibles : "les 15, 16 et 17 juillet 2026" (3 jours), ou une date
// seule, ou "du X au Y". Repli sur sessionName. @Rabah 2026-07-10
function sessionDatesText(d: PrintDossier): string {
  if (!d.sessionStart) return d.sessionName ? esc(d.sessionName) : '';
  const start = new Date(d.sessionStart);
  const end = d.sessionEnd ? new Date(d.sessionEnd) : start;
  const full = (dt: Date) => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  if (start.toDateString() === end.toDateString()) return full(start);
  const days: Date[] = [];
  for (const dt = new Date(start); dt <= end && days.length < 15; dt.setDate(dt.getDate() + 1)) days.push(new Date(dt));
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth && days.length <= 6) {
    const nums = days.map(dt => dt.getDate());
    const last = nums.pop();
    return `les ${nums.join(', ')} et ${last} ${end.toLocaleDateString('fr-FR', { month: 'long' })} ${end.getFullYear()}`;
  }
  return `du ${full(start)} au ${full(end)}`;
}
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
// SIRET formaté sans regex (évite les soucis d'échappement) : 902 945 195 00029.
const fmtSiret = (s?: string) => { const x = String(s || '').split('').filter(ch => ch >= '0' && ch <= '9').join(''); return x ? [x.slice(0, 3), x.slice(3, 6), x.slice(6, 9), x.slice(9)].filter(Boolean).join(' ') : ''; };
// Cachet visuel (tampon incliné bordé) à placer À CÔTÉ de la signature.
const convStamp = (name: string, line2?: string, line3?: string) => `<div style="display:inline-block;transform:rotate(-6deg);color:#1b1b1b;flex:0 0 auto"><div style="border:2px solid #1b1b1b;border-radius:8px;padding:7px 14px;text-align:center;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.18)"><p style="font-size:12px;font-weight:800;text-transform:uppercase;margin:0;line-height:1.05">${esc(name)}</p>${line2 ? `<p style="font-size:7.5px;font-weight:600;margin:3px 0 0">${esc(line2)}</p>` : ''}${line3 ? `<p style="font-size:7.5px;margin:0">${esc(line3)}</p>` : ''}</div></div>`;
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
  const unitPrice = (n ? (d.amountHT || 0) / n : (d.amountHT || 0)).toFixed(2); // prix par stagiaire (dynamique)
  const trainerNom = esc(d.trainerName || 'Ziane Rabah');            // formateur modifiable. @Rabah 2026-07-17
  const trainerMail = esc(d.trainerEmail || 'contact@deliverydigital.fr');
  const stag = (d.salaries || []).map((s) => `<li>${esc(s.firstname)} ${esc(s.lastname)} (${esc(s.type_contrat === 'CDD' ? "Salarié d'employeurs privés (CDD)" : "Salarié d'employeurs privés hors apprentis")})</li>`).join('');
  const dateSign = d.signedAt ? new Date(d.signedAt).toLocaleDateString('fr-FR') : d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  const sessDates = sessionDatesText(d);
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
    <p>Action réalisée en distanciel et en INTRA entreprise. Durée : 3 jours dissociés soit 21 heures. Séances de 10h00 à 17h00 en distanciel${sessDates ? ' (Formation · ' + sessDates + ')' : ''}. Prérequis des apprenants : aucun.</p>

    <h2>Article 3 : LES FORMATEURS DE L'ACTION</h2>
    <p>La formation est assurée par <b>${trainerNom}</b> (${trainerMail}) : conception de ressources pédagogiques et animation en visioconférence (en français), pédagogie interactive axée sur la mise en situation professionnelle.</p>

    <h2>Article 4 : ENGAGEMENTS DE PARTICIPATION</h2>
    <p>Le bénéficiaire s'engage à assurer la présence des participants désignés par la direction. Il s'agit de :</p>
    <ul style="font-size:12px">${stag || '<li>-</li>'}</ul>
    <p>Ils devront être déclarés par leurs noms, prénoms et fonctions avant la formation auprès de l'OPCO. Accessibilité : adaptations possibles pour les personnes en situation de handicap, nous contacter avant l'entrée en formation.</p>

    <h2>Article 5 : DISPOSITIONS FINANCIÈRES ET PRIX DE LA FORMATION</h2>
    <p>La formation « ${esc(d.formationTitle || '')} » est facturée ${unitPrice} € TTC par apprenant (prix fixe). Coût total de la session : coût unitaire ${unitPrice} € HT × ${n} stagiaire(s) = <b>${total} € HT (${total} € TTC)</b>. TVA non applicable - art. 261-4-4° du CGI. Facturation directe à l'OPCO (subrogation).</p>

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
      <div><p class="muted">Pour le bénéficiaire</p><p><b>${esc(d.denom)}</b>${d.signedBy ? ' · ' + esc(d.signedBy) + (d.signedFunction ? ' (' + esc(d.signedFunction) + ')' : '') : ''}</p><div style="display:flex;align-items:center;gap:18px;margin-top:8px;flex-wrap:wrap">${clientSig}${convStamp(d.denom || '', d.addr || '', d.siret ? 'SIRET ' + fmtSiret(d.siret) : '')}</div><p class="muted" style="font-size:10px;margin-top:6px">Signé électroniquement${d.signedRemote ? ' à distance' : ''} · le ${dateSign}</p></div>
      <div><p class="muted">Pour l'organisme de formation</p><p><b>DELIVERY Digital Nice</b></p><div style="display:flex;align-items:center;gap:18px;margin-top:8px;flex-wrap:wrap"><img src="https://deliverydigital.fr/uploads/assets/signature-dd.png" alt="Signature" style="max-height:48px" onerror="this.style.display='none'" />${convStamp('DELIVERY Digital Nice', '470 promenade des Anglais · 06200 Nice', 'SIRET 902 945 195 00029 · RCS 902 945 195')}</div><p class="muted" style="font-size:10px;margin-top:6px">Signé · le ${dateSign}</p></div>
    </div>`);
}

/* ============================================================================
 * Monter un dossier OPCO depuis l'espace DDN (super admin).
 * Le client validera depuis son côté via le lien sécurisé /signer/{token}.
 * Agence optionnelle (commission si rattachée, sinon dossier 100% DDN).
 * @author Rabah Ziane · 2026-06-21
 * ========================================================================== */
type MountAgency = { _id: string; name: string };
type MountSalarie = { firstname: string; lastname: string; email: string; poste: string };
function MountDossierModal({ agencies, headers, onClose, onDone }: { agencies: MountAgency[]; headers: () => Record<string, string>; onClose: () => void; onDone: () => void }) {
  const [agencyId, setAgencyId] = useState('');
  const [denom, setDenom] = useState('');
  const [siret, setSiret] = useState('');
  const [opco, setOpco] = useState('');
  const [addr, setAddr] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [formationId, setFormationId] = useState('');
  const [formationTitle, setFormationTitle] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [salaries, setSalaries] = useState<MountSalarie[]>([{ firstname: '', lastname: '', email: '', poste: '' }]);
  const [amountHT, setAmountHT] = useState('');
  const [sendNow, setSendNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<{ link: string; emailSent: boolean; recipient: string } | null>(null);

  const nbSal = salaries.filter((s) => s.firstname && s.lastname).length;
  const selForm = FORMATIONS.find((f) => f.id === formationId);
  // Montant auto : prix HT de la formation × nb stagiaires (modifiable). 525 € par défaut.
  const autoAmount = (selForm?.priceHT || 525) * Math.max(1, nbSal);
  const effectiveAmount = amountHT !== '' ? Number(amountHT) : autoAmount;

  const onPickFormation = (id: string) => {
    setFormationId(id);
    const f = FORMATIONS.find((x) => x.id === id);
    if (f) { setFormationTitle(f.title); setAmountHT(''); }
  };
  const setSal = (i: number, k: keyof MountSalarie, v: string) => setSalaries((arr) => arr.map((s, j) => j === i ? { ...s, [k]: v } : s));
  const addSal = () => setSalaries((arr) => [...arr, { firstname: '', lastname: '', email: '', poste: '' }]);
  const rmSal = (i: number) => setSalaries((arr) => arr.length > 1 ? arr.filter((_, j) => j !== i) : arr);

  const inp = 'w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30';
  const lbl = 'block text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-1';

  const submit = async () => {
    setErr('');
    if (!denom.trim()) { setErr('Le nom du client est requis.'); return; }
    const recipient = (managerEmail || clientEmail).trim();
    if (!recipient) { setErr('Un email (gérant ou principal) est requis pour envoyer le lien de validation.'); return; }
    const sal = salaries.filter((s) => s.firstname.trim() && s.lastname.trim());
    if (sal.length === 0) { setErr('Ajoutez au moins un stagiaire (prénom + nom).'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/agencies/dossiers/mount', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          agencyId: agencyId || undefined, denom: denom.trim(), siret: siret.trim() || undefined, opco: opco.trim() || undefined, addr: addr.trim() || undefined,
          clientEmail: clientEmail.trim() || undefined, managerEmail: managerEmail.trim() || undefined,
          formationTitle: formationTitle.trim() || (selForm?.title) || undefined, sessionName: sessionName.trim() || undefined,
          startAt: startAt || undefined, endAt: endAt || undefined,
          salaries: sal, amountHT: effectiveAmount, noEmail: !sendNow,
        }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error === 'client_email_required' ? 'Email client requis.' : j.error === 'salaries_required' ? 'Au moins un stagiaire requis.' : (j.error || 'Erreur')); return; }
      setResult({ link: j.link, emailSent: j.emailSent, recipient: j.recipient });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-2xl my-8 bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/10">
          <div><p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#86868B]">Dossier monté par Delivery Digital</p><h3 className="text-[15px] font-bold text-[#1D1D1F]">Monter un dossier OPCO</h3></div>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-black/[0.05] inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        {result ? (
          <div className="px-5 py-6 space-y-4">
            <div className="rounded-xl border-2 border-[#34C759]/40 bg-[#34C759]/5 p-4 text-[13px]">
              <p className="font-semibold text-[#1D1D1F]">Dossier monté ✓</p>
              <p className="text-[#3a3a3c] mt-1">{result.emailSent ? <>Un email de validation a été envoyé à <strong>{result.recipient}</strong>. Le client valide en signant sa convention.</> : <>Lien de validation généré (email non envoyé). Transmettez-le au client :</>}</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 px-2 py-1.5 rounded-md bg-white border border-black/10 text-[11.5px] break-all">{result.link}</code>
                <button onClick={() => navigator.clipboard?.writeText(result.link)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#1D1D1F] text-white text-[11.5px]"><Copy className="h-3 w-3" /> Copier</button>
              </div>
            </div>
            <p className="text-[12px] text-[#86868B]">Tant que le client n'a pas validé, le dossier reste dans « En attente de validation client ». Après signature, il bascule dans « Dossiers OPCO reçus ».</p>
            <div className="flex justify-end"><button onClick={onDone} className="px-4 py-2 rounded-full bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED]">Terminé</button></div>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4 max-h-[68vh] overflow-y-auto">
            <div>
              <label className={lbl}>Agence rattachée (optionnel)</label>
              <select value={agencyId} onChange={(e) => setAgencyId(e.target.value)} className={inp}>
                <option value="">Aucune - dossier 100% Delivery Digital</option>
                {agencies.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
              <p className="text-[10.5px] text-[#86868B] mt-1">Si une agence est choisie, sa commission s'applique normalement. Sinon, dossier en direct (sans commission).</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={lbl}>Nom du client *</label><input value={denom} onChange={(e) => setDenom(e.target.value)} className={inp} placeholder="Raison sociale" /></div>
              <div><label className={lbl}>SIRET</label><input value={siret} onChange={(e) => setSiret(e.target.value)} inputMode="numeric" className={`${inp} font-mono`} /></div>
              <div><label className={lbl}>OPCO</label><input value={opco} onChange={(e) => setOpco(e.target.value)} className={inp} placeholder="AKTO, OPCO EP…" /></div>
              <div><label className={lbl}>Adresse</label><input value={addr} onChange={(e) => setAddr(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Email principal</label><input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Email gérant (signataire)</label><input type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} className={inp} /></div>
            </div>
            <p className="text-[10.5px] text-[#86868B] -mt-2">Le lien de validation est envoyé au gérant si renseigné, sinon à l'email principal.</p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={lbl}>Formation</label>
                <select value={formationId} onChange={(e) => onPickFormation(e.target.value)} className={inp}>
                  <option value="">Choisir au catalogue ou saisir un titre…</option>
                  {FORMATIONS.map((f) => <option key={f.id} value={f.id}>{f.title} ({f.hours}h · {f.priceHT}€)</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><label className={lbl}>Titre (si hors catalogue)</label><input value={formationTitle} onChange={(e) => setFormationTitle(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Nom de session</label><input value={sessionName} onChange={(e) => setSessionName(e.target.value)} className={inp} placeholder="Session 1…" /></div>
              <div><label className={lbl}>Montant HT (€)</label><input type="number" value={amountHT} onChange={(e) => setAmountHT(e.target.value)} placeholder={String(autoAmount)} className={inp} /><p className="text-[10.5px] text-[#86868B] mt-1">Auto : {autoAmount.toLocaleString('fr-FR')} € ({selForm?.priceHT || 525} € × {Math.max(1, nbSal)})</p></div>
              <div><label className={lbl}>Début</label><input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Fin</label><input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inp} /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2"><label className={lbl + ' mb-0'}>Stagiaires *</label><button onClick={addSal} className="inline-flex items-center gap-1 text-[11.5px] text-[#0066CC] font-semibold"><Plus className="h-3.5 w-3.5" /> Ajouter</button></div>
              <div className="space-y-2">
                {salaries.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                    <input value={s.firstname} onChange={(e) => setSal(i, 'firstname', e.target.value)} placeholder="Prénom" className={inp} />
                    <input value={s.lastname} onChange={(e) => setSal(i, 'lastname', e.target.value)} placeholder="Nom" className={inp} />
                    <input value={s.email} onChange={(e) => setSal(i, 'email', e.target.value)} placeholder="Email (optionnel)" className={inp} />
                    <button onClick={() => rmSal(i)} className="text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded p-1.5" title="Retirer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} className="w-4 h-4" />
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[#3a3a3c]"><Mail className="h-3.5 w-3.5 text-[#86868B]" /> Envoyer tout de suite le lien de validation au client</span>
            </label>

            {err && <p className="text-[12.5px] text-[#FF3B30]">{err}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="px-4 py-2 rounded-full border border-black/10 text-[12.5px]">Annuler</button>
              <button onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0066CC] text-white text-[12.5px] font-semibold hover:bg-[#0077ED] disabled:opacity-60">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5" />} Monter et envoyer au client</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
