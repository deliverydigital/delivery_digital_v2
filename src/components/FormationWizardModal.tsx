"use client";
/**
 * Wizard "Nouvelle Action de formation" - version REUTILISABLE (espace commercial).
 *
 * Reprend a l'identique le wizard du dossier de formation (6 onglets : Introduction,
 * Employeur, Formation, Salariés, Synthèse, Convention) mais avec l'EMPLOYEUR
 * passe en prop (au lieu de la session du compte connecte). Cote commercial : le
 * commercial remplit le dossier en aidant le client (employeur pre-rempli depuis
 * le lead), les stagiaires sont saisis directement, et le client signe la
 * convention dans l'onglet Convention.
 *
 * NB : copie volontaire du wizard admin (src/app/admin/page.tsx) pour ne PAS
 * toucher au flux client existant (revenue critique). A unifier ulterieurement.
 *
 * @author Rabah Ziane - 2026-06-01
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Video, Check, Plus, ChevronRight, Trash2, X, Upload, Download, Mail } from "lucide-react";
import { FORMATION_TARIFS, BRANCHES_2026, getBranche, meilleurFinancement, type CompanySize } from "../lib/opcoRates";
import { FORMATIONS, getFormation } from "../lib/formationCatalog";

export type WizardSalarie = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  poste?: string;
  type_contrat?: string;
  date_naissance?: string;
  num_secu?: string;
  telephone?: string;
};
export type WizardEmployer = { siret: string; denom: string; opco: string; email?: string; address?: string };
export type TransmitPayload = {
  startAt: string; endAt: string; formatType: string; size: CompanySize;
  signedBy: string; signedFunction: string; salaries: WizardSalarie[]; formationTitle: string;
  signatureDataUrl?: string; // image PNG de la signature du client (au doigt) - persistée sur le dossier
  amountHT?: number;         // montant facturé = pris en charge OPCO (adapté à la branche), 0 reste à charge
};

type WizardTab = "intro" | "employer" | "formation" | "salaries" | "synth" | "docs";
// Session reelle ouverte par le superadmin (cf module formation-sessions).
type Slot = { id: string; title: string; startAt: string; endAt: string; startDate: Date; endDate: Date };

function fmtDtLong(iso?: string) { return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "-"; }
export function emptyWizardSalarie(): WizardSalarie {
  return { id: "s_" + Math.random().toString(36).slice(2, 9), firstname: "", lastname: "", email: "", poste: "", type_contrat: "CDI", date_naissance: "", num_secu: "", telephone: "" };
}

// Modele CSV propose au telechargement (en-tetes + 1 ligne d'exemple).
const SALARIES_CSV_TEMPLATE =
  "prenom;nom;poste;email;date_naissance;num_secu;contrat;telephone\n" +
  "Jean;Dupont;Serveur;jean.dupont@email.fr;15/05/1990;185057511600142;CDI;0612345678\n";

// Normalise une date (jj/mm/aaaa ou aaaa-mm-jj) vers le format input date yyyy-mm-dd.
function normalizeDate(v: string): string {
  const s = (v || "").trim();
  if (!s) return "";
  const fr = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (fr) { const [, d, m, y] = fr; const yyyy = y.length === 2 ? "20" + y : y; return `${yyyy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`; }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}
function normalizeContrat(v: string): string {
  const s = (v || "").trim().toLowerCase();
  if (s.startsWith("cdd")) return "CDD";
  if (s.startsWith("appr") || s.includes("altern")) return "Apprenti";
  if (s.startsWith("cdi")) return "CDI";
  return s ? "Autre" : "CDI";
}

// Parse un CSV de stagiaires. Delimiteur auto (; , ou tab). En-tetes facultatives :
// si la 1re ligne contient "prenom"/"nom"/"email", les colonnes sont mappees par nom ;
// sinon ordre attendu : prenom, nom, poste, email, date_naissance, num_secu, contrat, telephone.
// @author Rabah Ziane - 2026-06-04
export function parseSalariesCsv(text: string): WizardSalarie[] {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delim = (lines[0].match(/;/g)?.length || 0) >= (lines[0].match(/,/g)?.length || 0)
    ? (lines[0].includes(";") ? ";" : (lines[0].includes("\t") ? "\t" : ","))
    : ",";
  const split = (l: string) => l.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
  const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const first = split(lines[0]).map(strip);
  const hasHeader = first.some((c) => /prenom|nom|email|naissance|secu|contrat|poste|tel/.test(c));
  const idxOf = (...keys: string[]) => first.findIndex((c) => keys.some((k) => c.includes(k)));
  const map = hasHeader
    ? { fn: idxOf("prenom"), ln: first.findIndex((c) => c === "nom" || c.includes("nom de")), po: idxOf("poste", "fonction"), em: idxOf("email", "mail"), dn: idxOf("naissance"), ns: idxOf("secu", "nir"), ct: idxOf("contrat"), tel: idxOf("tel", "phone") }
    : { fn: 0, ln: 1, po: 2, em: 3, dn: 4, ns: 5, ct: 6, tel: 7 };
  if (map.ln < 0) map.ln = 1;
  const rows = hasHeader ? lines.slice(1) : lines;
  const out: WizardSalarie[] = [];
  for (const line of rows) {
    const c = split(line);
    const firstname = (map.fn >= 0 ? c[map.fn] : "") || "";
    const lastname = (map.ln >= 0 ? c[map.ln] : "") || "";
    if (!firstname.trim() || !lastname.trim()) continue;
    out.push({
      ...emptyWizardSalarie(),
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      poste: (map.po >= 0 ? c[map.po] : "") || "",
      email: (map.em >= 0 ? c[map.em] : "") || "",
      date_naissance: normalizeDate(map.dn >= 0 ? c[map.dn] : ""),
      num_secu: ((map.ns >= 0 ? c[map.ns] : "") || "").replace(/\D/g, "").slice(0, 15),
      type_contrat: normalizeContrat(map.ct >= 0 ? c[map.ct] : ""),
      telephone: (map.tel >= 0 ? c[map.tel] : "") || "",
    });
  }
  return out;
}

export default function FormationWizardModal({
  employer, onClose, onTransmit, submitting, secondaryAction, whatsappAction, initial, submitLabel, onSendCsvTemplate,
}: {
  employer: WizardEmployer;
  onClose: () => void;
  onTransmit: (p: TransmitPayload) => void;
  submitting: boolean;
  /** Action secondaire optionnelle (ex. "Envoyer le lien au client pour signer"). */
  secondaryAction?: { label: string; onClick: (p: Omit<TransmitPayload, "signedBy" | "signedFunction">) => void; busy?: boolean };
  /** Envoi du lien de signature via WhatsApp (optionnel). */
  whatsappAction?: { label: string; onClick: (p: Omit<TransmitPayload, "signedBy" | "signedFunction">) => void; busy?: boolean };
  /** Envoi du modèle CSV des stagiaires au client par email (optionnel). */
  onSendCsvTemplate?: () => void | Promise<void>;
  /** Valeurs initiales pour rouvrir/corriger un dossier déjà transmis. @Rabah 2026-06-04 */
  initial?: { salaries?: WizardSalarie[]; formationId?: string; signedBy?: string; signedFunction?: string; size?: CompanySize; session?: { startAt: string; endAt: string; title?: string } };
  /** Libellé du bouton principal (ex. "Renvoyer le dossier corrigé"). */
  submitLabel?: string;
}) {
  const [tab, setTab] = useState<WizardTab>("intro");
  const [introAck, setIntroAck] = useState(false);

  // Indisponibilites superadmin + formateurs actifs (nom + creneaux recurrents) + creneaux deja
  // reserves. Sert a nommer le formateur, exclure les creneaux complets. @Rabah 2026-06-04 / 2026-06-19
  const [blockedDays, setBlockedDays] = useState<Set<string>>(new Set());
  type WizTrainer = { id: string; name: string; email?: string; days: number[]; slots: { from: string; to: string }[] };
  const [trainers, setTrainers] = useState<WizTrainer[]>([]);
  const [bookedSlots, setBookedSlots] = useState<Record<string, Record<string, number>>>({});
  useEffect(() => {
    fetch('/api/formation-availability').then((r) => r.ok ? r.json() : {}).then((j) => {
      if (Array.isArray(j.days)) setBlockedDays(new Set(j.days));
      if (Array.isArray(j.trainers)) setTrainers(j.trainers);
      if (j.booked && typeof j.booked === 'object') setBookedSlots(j.booked);
    }).catch(() => {});
  }, []);

  // Creneaux : 3 jours CALENDAIRES consecutifs SANS aucun dimanche (personne ne travaille le
  // dimanche) -> departs lun→jeu, jamais a cheval sur un week-end. Des J+4 sur ~7 semaines.
  // On exclut aussi les jours indisponibles (superadmin). @author Rabah Ziane - 2026-06-04
  const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const sessionSlots = useMemo<Slot[]>(() => {
    const out: Slot[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cursor = new Date(today); cursor.setDate(cursor.getDate() + 4); // 1er départ possible J+4
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 4 + 7 * 7); // ~7 semaines
    let i = 0;
    while (cursor <= horizon && out.length < 60) {
      // 3 jours consécutifs à partir de ce jour
      const days: Date[] = [];
      for (let k = 0; k < 3; k++) { const d = new Date(cursor); d.setDate(cursor.getDate() + k); days.push(d); }
      const hasSunday = days.some((d) => d.getDay() === 0);     // aucun dimanche dans la session
      const blocked = days.some((d) => blockedDays.has(dayKey(d)));
      if (!hasSunday && !blocked) {
        const start = new Date(days[0]); start.setHours(9, 0, 0, 0);
        const end = new Date(days[2]); end.setHours(17, 0, 0, 0);
        out.push({ id: 's' + i, title: 'Formation - 21h', startAt: start.toISOString(), endAt: end.toISOString(), startDate: start, endDate: end });
      }
      cursor.setDate(cursor.getDate() + 1);
      i++;
    }
    // En mode correction : on prepend la session d'origine du dossier (peut etre passee/hors liste).
    if (initial?.session?.startAt && initial?.session?.endAt) {
      const sd = new Date(initial.session.startAt), ed = new Date(initial.session.endAt);
      out.unshift({ id: 'orig', title: initial.session.title || "Session d'origine", startAt: sd.toISOString(), endAt: ed.toISOString(), startDate: sd, endDate: ed });
    }
    return out;
  }, [initial, blockedDays]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>(initial?.session ? "orig" : "");
  const selectedSlot = sessionSlots.find((s) => s.id === selectedSlotId);
  // Créneau visio (1h/jour) choisi par le client : le formateur est dispo sur les 2. @Rabah 2026-06-19
  const VISIO_SLOTS = [{ key: 'a', startH: 16, endH: 17, label: '16h-17h' }, { key: 'b', startH: 17, endH: 18, label: '17h-18h' }] as const;
  const [visioSlot, setVisioSlot] = useState<'a' | 'b'>('a');
  const visio = VISIO_SLOTS.find((v) => v.key === visioSlot) || VISIO_SLOTS[0];
  const atHour = (d: Date, h: number) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x; };
  // L'horaire des sessions reflète le créneau visio choisi (1h/jour : 16h-17h ou 17h-18h).
  const startAt = selectedSlot ? atHour(selectedSlot.startDate, visio.startH).toISOString() : "";
  const endAt = selectedSlot ? atHour(selectedSlot.endDate, visio.endH).toISOString() : "";
  // Formateur(s) dispo + disponibilité réelle d'une fenêtre pour un créneau. @Rabah 2026-06-19
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const trainersForSlot = (startH: number) => trainers.filter((t) => t.slots.some((s) => s.from === `${pad2(startH)}:00`));
  // Formateur affiché (créneau choisi) ; fallback : 1er formateur actif.
  const slotTrainer = trainersForSlot(visio.startH)[0] || trainers[0] || null;
  const trainerName = slotTrainer?.name || '';
  const trainerEmail = slotTrainer?.email || '';
  // Formateur dispo sur LES DEUX créneaux (pour le texte d'aide de la case).
  const bothSlotTrainer = trainers.find((t) => VISIO_SLOTS.every((v) => t.slots.some((s) => s.from === `${pad2(v.startH)}:00`)));
  // Une fenêtre 3 jours est-elle dispo pour ce créneau ? (capacité formateurs - réservations). @Rabah 2026-06-19
  const windowAvailable = (start: Date, startH: number) => {
    if (!trainers.length) return true; // pas de données formateurs -> ne bloque pas
    const from = `${pad2(startH)}:00`;
    const wds = [0, 1, 2].map((k) => { const d = new Date(start); d.setDate(d.getDate() + k); return d.getDay(); });
    const capacity = trainers.filter((t) => t.slots.some((s) => s.from === from) && wds.every((wd) => t.days.includes(wd))).length;
    if (capacity === 0) return false;
    const dates = [0, 1, 2].map((k) => { const d = new Date(start); d.setDate(d.getDate() + k); return dayKey(d); });
    const maxBooked = Math.max(0, ...dates.map((dk) => bookedSlots[dk]?.[from] || 0));
    return capacity - maxBooked > 0;
  };
  // Si le créneau choisi rend la session sélectionnée complète, on la déselectionne. @Rabah 2026-06-19
  useEffect(() => {
    if (!selectedSlotId || selectedSlotId === 'orig') return;
    const s = sessionSlots.find((x) => x.id === selectedSlotId);
    if (s && !windowAvailable(s.startDate, visio.startH)) setSelectedSlotId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visioSlot, trainers, bookedSlots]);

  const [formatType] = useState("Visioconférence");
  const [size, setSize] = useState<CompanySize>(initial?.size || "tpe");
  // Formation choisie (catalogue) - le montage du dossier est par client. @Rabah 2026-06-02
  const [formationId, setFormationId] = useState<string>(initial?.formationId || FORMATIONS[0].id);
  const formation = getFormation(formationId) || FORMATIONS[0];

  const [signedBy, setSignedBy] = useState(initial?.signedBy || "");
  const [signedFunction, setSignedFunction] = useState(initial?.signedFunction || "Gérant");
  const [drawn, setDrawn] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [accepted, setAccepted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  // Cote commercial : les stagiaires sont saisis directement dans l'onglet Salariés.
  const [salaries, setSalaries] = useState<WizardSalarie[]>(
    initial?.salaries && initial.salaries.length
      ? initial.salaries.map((s) => ({ ...emptyWizardSalarie(), ...s, id: s.id || ("s_" + Math.random().toString(36).slice(2, 9)) }))
      : [emptyWizardSalarie()]
  );
  const filledSalaries = salaries.filter((s) => s.firstname.trim() && s.lastname.trim());
  const selectedCount = filledSalaries.length;

  const introOk = introAck;
  const employerOk = !!employer?.siret;
  const formationOk = !!startAt && !!endAt && new Date(endAt) > new Date(startAt);
  const salariesOk = selectedCount > 0;
  const synthOk = formationOk && salariesOk;
  const docsOk = signedBy.trim().length >= 3 && drawn && accepted;
  const allOk = introOk && employerOk && formationOk && salariesOk && synthOk && docsOk;

  const TABS: { key: WizardTab; label: string; ok: boolean }[] = [
    { key: "intro", label: "Introduction", ok: introOk },
    { key: "employer", label: "Employeur", ok: employerOk },
    { key: "formation", label: "Formation", ok: formationOk },
    { key: "salaries", label: "Salariés", ok: salariesOk },
    { key: "synth", label: "Synthèse", ok: synthOk },
    { key: "docs", label: "Convention", ok: docsOk },
  ];
  const idx = TABS.findIndex((t) => t.key === tab);
  const goNext = () => idx < TABS.length - 1 && setTab(TABS[idx + 1].key);
  const goPrev = () => idx > 0 && setTab(TABS[idx - 1].key);

  const tabsScrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scroller = tabsScrollerRef.current; if (!scroller) return;
    const activeBtn = scroller.querySelector<HTMLButtonElement>(`button[data-tab-key="${tab}"]`);
    if (!activeBtn) return;
    const target = activeBtn.offsetLeft - (scroller.clientWidth - activeBtn.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [tab]);

  // Prise en charge selon l'OPCO + la BRANCHE (IDCC) du client. On facture le montant
  // finançable -> 0 reste à charge. Branches filtrées sur l'OPCO du client. @Rabah 2026-06-05
  const opcoBranches = useMemo(() => {
    const m = BRANCHES_2026.filter((b) => b.opco === employer.opco);
    return m.length ? m : BRANCHES_2026;
  }, [employer.opco]);
  const [branchId, setBranchId] = useState<string>(opcoBranches[0]?.id || BRANCHES_2026[0].id);
  useEffect(() => { if (!opcoBranches.some((b) => b.id === branchId)) setBranchId(opcoBranches[0]?.id || BRANCHES_2026[0].id); }, [opcoBranches, branchId]);
  const branche = getBranche(branchId) || opcoBranches[0];
  const nbStag = Math.max(1, selectedCount);
  const perStagiaire = branche ? meilleurFinancement(branche, FORMATION_TARIFS.unitPriceHT, FORMATION_TARIFS.hours, 3) : 0;
  const billedTotal = perStagiaire * nbStag; // montant facturé = pris en charge OPCO (0 reste à charge)

  useEffect(() => {
    if (tab !== "docs") return;
    const c = canvasRef.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.scale(dpr, dpr); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 2.2; ctx.strokeStyle = "#0F172A";
  }, [tab]);
  function pos(e: React.PointerEvent<HTMLCanvasElement>) { const c = canvasRef.current!; const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) { const c = canvasRef.current; if (!c) return; const ctx = c.getContext("2d"); if (!ctx) return; drawing.current = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); c.setPointerCapture(e.pointerId); }
  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const c = canvasRef.current; if (!c) return; const ctx = c.getContext("2d"); if (!ctx) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setDrawn(true); }
  function endDraw() { drawing.current = false; const c = canvasRef.current; if (c && drawn) { try { setSignatureDataUrl(c.toDataURL("image/png")); } catch { /* */ } } }
  function clearSignature() { const c = canvasRef.current; if (!c) return; const ctx = c.getContext("2d"); if (!ctx) return; ctx.clearRect(0, 0, c.width, c.height); setDrawn(false); setSignatureDataUrl(""); }

  function updateSalarie(id: string, patch: Partial<WizardSalarie>) { setSalaries((cur) => cur.map((s) => s.id === id ? { ...s, ...patch } : s)); }
  function addSalarie() { setSalaries((cur) => [...cur, emptyWizardSalarie()]); }
  function removeSalarie(id: string) { setSalaries((cur) => cur.length <= 1 ? [emptyWizardSalarie()] : cur.filter((s) => s.id !== id)); }

  // Import CSV des stagiaires : on remplace les lignes vides, on conserve celles deja remplies. @Rabah 2026-06-04
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const [csvEmailing, setCsvEmailing] = useState(false);
  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ""; // permet de re-importer le meme fichier
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = parseSalariesCsv(String(reader.result || ""));
      if (!imported.length) { alert("Aucun stagiaire valide trouvé. Format attendu : prenom;nom;poste;email;date_naissance;num_secu;contrat;telephone (téléchargez le modèle)."); return; }
      setSalaries((cur) => { const kept = cur.filter((s) => s.firstname.trim() && s.lastname.trim()); return [...kept, ...imported]; });
      alert(`${imported.length} stagiaire${imported.length > 1 ? "s" : ""} importé${imported.length > 1 ? "s" : ""} depuis le CSV.`);
    };
    reader.readAsText(file, "utf-8");
  }
  function downloadCsvTemplate() {
    const blob = new Blob(["﻿" + SALARIES_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "modele-stagiaires.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function transmit() {
    if (!allOk) { const firstBad = TABS.find((t) => !t.ok); if (firstBad) setTab(firstBad.key); alert("Complétez tous les onglets (✓ vert) avant de transmettre."); return; }
    onTransmit({ startAt, endAt, formatType, size, signedBy: signedBy.trim(), signedFunction: signedFunction.trim(), salaries: filledSalaries, formationTitle: formation.title, signatureDataUrl, amountHT: billedTotal });
  }
  function runSecondary() {
    if (!secondaryAction) return;
    if (!formationOk || !salariesOk) { setTab(!formationOk ? "formation" : "salaries"); alert("Choisissez une session et ajoutez au moins un stagiaire."); return; }
    secondaryAction.onClick({ startAt, endAt, formatType, size, salaries: filledSalaries, formationTitle: formation.title, amountHT: billedTotal });
  }
  function runWhatsapp() {
    if (!whatsappAction) return;
    if (!formationOk || !salariesOk) { setTab(!formationOk ? "formation" : "salaries"); alert("Choisissez une session et ajoutez au moins un stagiaire."); return; }
    whatsappAction.onClick({ startAt, endAt, formatType, size, salaries: filledSalaries, formationTitle: formation.title, amountHT: billedTotal });
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/70 backdrop-blur-sm flex items-stretch lg:items-center justify-center p-0 lg:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full h-full lg:h-auto lg:max-w-[1100px] lg:rounded-[42px] lg:p-6 lg:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] lg:bg-gradient-to-br lg:from-[#1a1a1c] lg:to-[#0a0a0c]">
        <div className="bg-paper w-full lg:rounded-[28px] flex flex-col h-full lg:h-[88vh] overflow-hidden shadow-2xl">
          {/* HEADER */}
          <div className="bg-white text-ink-900 px-7 py-5 flex items-center justify-between gap-3 flex-shrink-0 border-b border-ink-100">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-ink-500 mb-1">Nouveau dossier de formation</p>
              <h2 className="h-display text-[22px] tracking-tight">Nouvelle Action de formation</h2>
              <p className="text-[12.5px] text-ink-700 mt-0.5">Pour <strong>{employer.denom}</strong> · transmis à <strong>Delivery Digital</strong> qui monte le dossier OPCO ({employer.opco}).</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-paper2 hover:bg-ink-100 text-ink-700 flex items-center justify-center transition flex-shrink-0"><X size={16} /></button>
          </div>

          {/* TABS */}
          <div ref={tabsScrollerRef} className="bg-white border-b border-ink-100 flex overflow-x-auto flex-shrink-0 touch-pan-x scroll-smooth sticky top-0 z-20 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => (
              <button key={t.key} data-tab-key={t.key} onClick={() => setTab(t.key)} className={`px-6 py-4 text-[14px] flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px transition ${tab === t.key ? "border-green text-ink-900 h-display bg-paper2/30" : "border-transparent text-ink-500 hover:text-ink-900"}`}>
                {t.label}
                {t.ok && <span className="inline-flex w-4 h-4 rounded-full bg-green text-paper items-center justify-center"><Check size={10} strokeWidth={3} /></span>}
              </button>
            ))}
          </div>

          {/* CONTENT */}
          <div className="bg-white flex-1 overflow-y-auto">
            <div className="p-7 lg:p-10">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h3 className="h-display text-[22px] text-green">{TABS[idx].label}</h3>
                <div className="flex items-center gap-4 text-[13px]">
                  <button onClick={goPrev} disabled={idx === 0} className="inline-flex items-center gap-1 text-ink-500 hover:text-ink-900 disabled:opacity-30">Précédent</button>
                  <button onClick={goNext} disabled={idx === TABS.length - 1} className="inline-flex items-center gap-1 text-ink-900 h-display hover:opacity-70 disabled:opacity-30">Suivant <ChevronRight size={14} /></button>
                </div>
              </div>

              {tab === "intro" && (
                <div className="max-w-3xl space-y-5 text-[14px] text-ink-700 leading-relaxed">
                  <div className="rounded-2xl bg-paper2 border border-ink-100 p-5">
                    <p className="h-display text-ink-900 mb-2">Comment ça marche</p>
                    <ol className="space-y-1.5 text-[13.5px] list-decimal pl-5">
                      <li>Vous remplissez ce dossier avec le client (formation, salariés, signature).</li>
                      <li>Le client signe la convention (onglet Convention).</li>
                      <li>Notre équipe traite la demande et monte le dossier auprès de l&apos;OPCO ({employer.opco}).</li>
                      <li>Le client reçoit la convention officielle et les convocations stagiaires.</li>
                      <li>La formation est dispensée. La facturation est faite directement à l&apos;OPCO (subrogation).</li>
                    </ol>
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer pt-3 mt-4 border-t border-ink-100">
                    <input type="checkbox" checked={introAck} onChange={(e) => setIntroAck(e.target.checked)} className="w-4 h-4 mt-1" />
                    <span className="pt-0.5">J&apos;ai pris connaissance de la <a className="text-green underline" href="/rgpd" target="_blank" rel="noopener">notice RGPD</a> relative au traitement des données.</span>
                  </label>
                </div>
              )}

              {tab === "employer" && (
                <div className="max-w-2xl space-y-5">
                  <p className="text-[14px] text-ink-700">Établissement bénéficiaire de la formation (pré-rempli depuis le lead vérifié).</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Raison sociale" value={employer.denom} />
                    <Field label="SIRET" value={(employer.siret || "").replace(/(\d{3})(\d{3})(\d{3})(\d{0,5})/, "$1 $2 $3 $4").trim()} mono />
                    <Field label="OPCO" value={employer.opco} />
                    <Field label="Email de contact" value={employer.email || "-"} />
                  </div>
                </div>
              )}

              {tab === "formation" && (
                <div className="max-w-4xl space-y-6">
                  <div>
                    <p className="text-[10.5px] uppercase tracking-widest font-bold text-ink-700 mb-2">Formation à inscrire (par client)</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {FORMATIONS.map((f) => {
                        const sel = f.id === formationId;
                        return (
                          <button key={f.id} type="button" onClick={() => setFormationId(f.id)} className={`text-left px-4 py-3.5 rounded-xl border-2 transition relative ${sel ? "border-green bg-green/5 shadow-sm" : "border-ink-100 bg-white hover:border-ink-300"}`}>
                            {sel && <span className="absolute top-2.5 right-2.5 inline-flex w-5 h-5 rounded-full bg-green text-paper items-center justify-center"><Check size={11} strokeWidth={3} /></span>}
                            <p className="text-[10px] uppercase tracking-widest font-bold text-ink-500">{f.category} · {f.hours}h</p>
                            <p className="h-display text-[14.5px] mt-1 pr-6 text-ink-900">{f.title}</p>
                            <p className="text-[12px] text-ink-700 mt-1 line-clamp-2">{f.summary}</p>
                            <p className="text-[11.5px] text-ink-500 mt-1.5">{f.priceHT} € HT · {f.level} · {f.funding}</p>
                          </button>
                        );
                      })}
                    </div>
                    <details className="mt-2 text-[12px] text-ink-700">
                      <summary className="cursor-pointer h-display">Voir le programme</summary>
                      <ul className="mt-2 space-y-1 list-disc pl-5 text-[12px] text-ink-700">
                        {formation.programme.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </details>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <p className="text-[10.5px] font-bold uppercase tracking-widest text-ink-700">Sessions disponibles</p>
                      <p className="text-[11.5px] text-ink-500">Du lundi au samedi · 3 jours consécutifs</p>
                    </div>
                    {sessionSlots.length === 0 ? (
                      <p className="text-[12.5px] text-amber bg-amber/10 border border-amber/30 rounded-lg px-3 py-2.5">Aucune session disponible sur la période (toutes indisponibles). Le superadmin gère les indisponibilités.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                        {sessionSlots.map((s) => {
                          const isSelected = s.id === selectedSlotId;
                          const dayRange = `${s.startDate.toLocaleDateString("fr-FR", { weekday: "short" })} → ${s.endDate.toLocaleDateString("fr-FR", { weekday: "short" })}`;
                          const dateRange = `${s.startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} → ${s.endDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;
                          // Dispo réelle pour le créneau choisi (capacité formateur - réservations). 'orig' = session déjà choisie (correction). @Rabah 2026-06-19
                          const avail = s.id === 'orig' ? true : windowAvailable(s.startDate, visio.startH);
                          return (
                            <button key={s.id} type="button" disabled={!avail} onClick={() => avail && setSelectedSlotId(s.id)} className={`text-left px-4 py-3.5 rounded-xl border-2 transition relative ${!avail ? "border-ink-100 bg-paper2/40 opacity-55 cursor-not-allowed" : isSelected ? "border-green bg-green/5 shadow-sm" : "border-ink-100 bg-white hover:border-ink-300"}`}>
                              {isSelected && avail && <span className="absolute top-2.5 right-2.5 inline-flex w-5 h-5 rounded-full bg-green text-paper items-center justify-center"><Check size={11} strokeWidth={3} /></span>}
                              <p className="text-[10.5px] uppercase tracking-widest font-bold text-ink-500">{dayRange}</p>
                              <p className="h-display text-[15px] mt-1 text-ink-900">{dateRange}</p>
                              <p className="text-[11.5px] text-ink-500 mt-0.5">1h visio ({visio.label}) + 6h en situation de travail/jour · 21h total</p>
                              <div className="mt-2">
                                {avail
                                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green/10 text-green border border-green/30 text-[10.5px] h-display"><span className="w-1.5 h-1.5 rounded-full bg-green" />Disponible</span>
                                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/30 text-[10.5px] h-display"><span className="w-1.5 h-1.5 rounded-full bg-amber" />Complet ({visio.label})</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Créneau visio (1h/jour) au choix : formateur dispo sur les 2. @Rabah 2026-06-19 */}
                    <div className="mt-3">
                      <p className="text-[10.5px] font-bold uppercase tracking-widest text-ink-700 mb-2">Créneau visio (1h/jour)</p>
                      <div className="inline-flex gap-2">
                        {VISIO_SLOTS.map((v) => (
                          <button key={v.key} type="button" onClick={() => setVisioSlot(v.key)} className={`px-3.5 py-2 rounded-xl border-2 text-[12.5px] h-display transition ${visioSlot === v.key ? "border-green bg-green/5 text-ink-900" : "border-ink-100 bg-white text-ink-700 hover:border-ink-300"}`}>{v.label}</button>
                        ))}
                      </div>
                      <p className="text-[11px] text-ink-500 mt-1.5">Le client choisit son créneau d&apos;1h - {(bothSlotTrainer?.name || trainerName) ? <strong className="text-ink-700">{bothSlotTrainer?.name || trainerName}</strong> : 'notre formateur'} {bothSlotTrainer ? 'est disponible sur les deux' : 'assure ce créneau'}.</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-ink-700 mb-2">Format</p>
                    <div className="rounded-xl border-2 border-ink-900 bg-ink-900 text-paper px-4 py-3 inline-flex items-center gap-2.5">
                      <Video size={18} className="text-paper" />
                      <div><p className="h-display text-[14px] leading-tight">Visioconférence</p><p className="text-[11px] text-paper/70 leading-tight">1h visio + 6h en situation de travail / jour</p></div>
                      <span className="ml-3 inline-flex w-4 h-4 rounded-full bg-green text-paper items-center justify-center"><Check size={11} strokeWidth={3} /></span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-ink-700 mb-2">Effectif de l&apos;entreprise</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <button onClick={() => setSize("tpe")} className={`px-4 py-2.5 rounded-xl border text-[12.5px] h-display ${size === "tpe" ? "border-ink-900 bg-ink-900 text-paper" : "border-ink-200 bg-white hover:bg-paper2"}`}>TPE - moins de 11 salariés</button>
                      <button onClick={() => setSize("pme")} className={`px-4 py-2.5 rounded-xl border text-[12.5px] h-display ${size === "pme" ? "border-ink-900 bg-ink-900 text-paper" : "border-ink-200 bg-white hover:bg-paper2"}`}>PME - 11 à 49 salariés</button>
                    </div>
                  </div>
                </div>
              )}

              {tab === "salaries" && (
                <div className="max-w-4xl">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                    <p className="text-[14px] text-ink-700 flex-1 min-w-[240px]">Saisissez les stagiaires à inscrire pour le client, ou importez-les en lot via un fichier CSV / Excel. Tous les stagiaires renseignés (prénom + nom) seront inclus au dossier.</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input ref={csvInputRef} type="file" accept=".csv,text/csv,.txt,application/vnd.ms-excel" onChange={handleCsvFile} className="hidden" />
                      <button onClick={downloadCsvTemplate} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-200 text-ink-700 text-[12px] font-semibold hover:bg-paper2"><Download size={14} /> Modèle CSV</button>
                      {onSendCsvTemplate && <button onClick={async () => { setCsvEmailing(true); try { await onSendCsvTemplate(); } finally { setCsvEmailing(false); } }} disabled={csvEmailing} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-200 text-ink-700 text-[12px] font-semibold hover:bg-paper2 disabled:opacity-60"><Mail size={14} /> {csvEmailing ? 'Envoi…' : 'Envoyer le modèle au client'}</button>}
                      <button onClick={() => csvInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-ink-900 text-paper text-[12px] font-semibold hover:bg-black"><Upload size={14} /> Importer un CSV</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {salaries.map((s) => (
                      <div key={s.id} className="rounded-xl border border-ink-100 bg-white p-3">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          <input value={s.firstname} onChange={(e) => updateSalarie(s.id, { firstname: e.target.value })} placeholder="Prénom *" className="px-3 py-2 rounded-lg border border-ink-200 text-ink-900 placeholder-ink-400 text-[13px] focus:outline-none focus:border-ink-900" />
                          <input value={s.lastname} onChange={(e) => updateSalarie(s.id, { lastname: e.target.value })} placeholder="Nom *" className="px-3 py-2 rounded-lg border border-ink-200 text-ink-900 placeholder-ink-400 text-[13px] focus:outline-none focus:border-ink-900" />
                          <input value={s.poste} onChange={(e) => updateSalarie(s.id, { poste: e.target.value })} placeholder="Poste" className="px-3 py-2 rounded-lg border border-ink-200 text-ink-900 placeholder-ink-400 text-[13px] focus:outline-none focus:border-ink-900" />
                          <input value={s.email} onChange={(e) => updateSalarie(s.id, { email: e.target.value })} placeholder="Email" className="px-3 py-2 rounded-lg border border-ink-200 text-ink-900 placeholder-ink-400 text-[13px] focus:outline-none focus:border-ink-900" />
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-ink-500">Date de naissance</span>
                            <input type="date" value={s.date_naissance} onChange={(e) => updateSalarie(s.id, { date_naissance: e.target.value })} className="mt-0.5 w-full px-3 py-2 rounded-lg border border-ink-200 text-ink-900 placeholder-ink-400 text-[13px] focus:outline-none focus:border-ink-900" />
                          </label>
                          {(() => {
                            const ssn = (s.num_secu || "").replace(/\D/g, "");
                            const ssnBad = ssn.length > 0 && ssn.length < 15;
                            return (
                              <label className="block">
                                <span className="text-[10px] uppercase tracking-widest font-bold text-ink-500">N° Sécurité sociale</span>
                                <input
                                  value={s.num_secu}
                                  onChange={(e) => updateSalarie(s.id, { num_secu: e.target.value.replace(/\D/g, "").slice(0, 15) })}
                                  inputMode="numeric"
                                  maxLength={15}
                                  placeholder="1 85 05 75 116 001 42"
                                  className={`mt-0.5 w-full px-3 py-2 rounded-lg border text-[13px] text-ink-900 placeholder-ink-400 font-mono focus:outline-none ${ssnBad ? "border-amber focus:border-amber" : "border-ink-200 focus:border-ink-900"}`}
                                />
                                {ssn.length > 0 && <span className={`text-[10px] mt-0.5 block ${ssnBad ? "text-amber" : "text-ink-400"}`}>{ssn.length}/15 chiffres</span>}
                              </label>
                            );
                          })()}
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-ink-500">Contrat</span>
                            <select value={s.type_contrat} onChange={(e) => updateSalarie(s.id, { type_contrat: e.target.value })} className="mt-0.5 w-full px-3 py-2 rounded-lg border border-ink-200 text-ink-900 placeholder-ink-400 text-[13px] bg-white focus:outline-none focus:border-ink-900">
                              {["CDI", "CDD", "Apprenti", "Autre"].map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-ink-500">Téléphone</span>
                            <input value={s.telephone} onChange={(e) => updateSalarie(s.id, { telephone: e.target.value })} placeholder="06 12 34 56 78" className="mt-0.5 w-full px-3 py-2 rounded-lg border border-ink-200 text-ink-900 placeholder-ink-400 text-[13px] focus:outline-none focus:border-ink-900" />
                          </label>
                        </div>
                        {salaries.length > 1 && (
                          <div className="flex justify-end mt-2">
                            <button onClick={() => removeSalarie(s.id)} className="inline-flex items-center gap-1 text-[11.5px] text-ink-400 hover:text-red-600"><Trash2 size={13} /> Retirer</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={addSalarie} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-ink-700 hover:text-ink-900"><Plus size={14} /> Ajouter un stagiaire</button>
                </div>
              )}

              {tab === "synth" && (
                <div className="max-w-3xl space-y-6">
                  <p className="text-[14px] text-ink-700">Récapitulatif. Vérifiez avant de transmettre à <strong>Delivery Digital</strong> qui monte le dossier auprès de {employer.opco}.</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Bénéficiaire" value={employer.denom} />
                    <Field label="Formation" value={formation.title} />
                    <Field label="Date de début" value={fmtDtLong(startAt)} />
                    <Field label="Date de fin" value={fmtDtLong(endAt)} />
                    <Field label="Stagiaires" value={`${selectedCount}`} />
                    <Field label="OPCO" value={employer.opco} />
                  </div>
                  <div className="rounded-2xl border border-ink-100 bg-paper2 p-6">
                    {/* Prise en charge selon l'OPCO + branche (IDCC) du client. On facture le montant pris en charge -> 0 reste à charge. @Rabah 2026-06-05 */}
                    <div className="mb-4">
                      <label className="block text-[10.5px] uppercase tracking-widest font-bold text-ink-500 mb-1">Branche du client ({employer.opco})</label>
                      <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-ink-900 text-[13px] bg-white focus:outline-none focus:border-ink-900">
                        {opcoBranches.map((b) => <option key={b.id} value={b.id}>{b.opco} · {b.label} (IDCC {b.idcc})</option>)}
                      </select>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4 text-[13px]">
                      <div><p className="text-[10.5px] uppercase tracking-widest font-bold text-ink-500">Montant facturé</p><p className="h-display text-[20px] mt-1 text-ink-900">{billedTotal} €</p><p className="text-[10px] text-ink-400 mt-0.5">adapté au budget OPCO</p></div>
                      <div><p className="text-[10.5px] uppercase tracking-widest font-bold text-ink-500">Pris en charge OPCO</p><p className="h-display text-[20px] mt-1 text-green">100 %</p><p className="text-[10px] text-ink-400 mt-0.5">{billedTotal} € financés</p></div>
                      <div><p className="text-[10.5px] uppercase tracking-widest font-bold text-ink-500">Reste à charge</p><p className="h-display text-[24px] mt-1 text-green">0 €</p></div>
                    </div>
                    <p className="mt-4 text-[12px] text-ink-700 bg-green/10 border border-green/30 rounded-lg px-3 py-2.5">Facturé au <strong>montant pris en charge par {branche?.opco || employer.opco}</strong> ({perStagiaire} € / stagiaire × {nbStag} = {billedTotal} €). <strong>Aucun reste à charge</strong> pour le client.</p>
                    {branche?.remarque && <details className="mt-3 text-[12px] text-ink-700"><summary className="cursor-pointer h-display text-ink-900">Détail de la prise en charge · IDCC {branche.idcc}</summary><p className="mt-2 text-[11.5px] leading-relaxed">{branche.remarque}</p><p className="mt-1 text-[10.5px] text-ink-400">Source : {branche.source}</p></details>}
                  </div>
                </div>
              )}

              {tab === "docs" && (
                <div className="max-w-3xl space-y-6">
                  <ConventionPreview
                    beneficiaire={employer.denom}
                    beneficiaireSiret={employer.siret}
                    beneficiaireAddress={employer.address || ""}
                    formationTitle={formation.title}
                    formationSummary={formation.summary}
                    selectedSalaries={filledSalaries}
                    startDate={selectedSlot ? atHour(selectedSlot.startDate, visio.startH) : undefined}
                    endDate={selectedSlot ? atHour(selectedSlot.endDate, visio.endH) : undefined}
                    unitPriceHT={perStagiaire || FORMATION_TARIFS.unitPriceHT}
                    beneficiaireSignature={signatureDataUrl}
                    trainerName={trainerName}
                    trainerEmail={trainerEmail}
                  />
                  <div className="rounded-xl bg-paper2/60 border border-ink-100 p-3 text-[12px] text-ink-600">
                    Le <strong>client (restaurateur)</strong> signe ci-dessous. Si le client n&apos;est pas avec vous, utilisez « Envoyer le lien au client » en bas.
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-widest text-ink-700">Nom du signataire (client)</span>
                      <input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Marie Dupont" className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-ink-200 text-ink-900 placeholder-ink-400 text-[14px] focus:outline-none focus:border-ink-900" />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-widest text-ink-700">Fonction</span>
                      <select value={signedFunction} onChange={(e) => setSignedFunction(e.target.value)} className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-ink-200 text-ink-900 placeholder-ink-400 text-[14px] focus:outline-none focus:border-ink-900 bg-white">
                        {["Gérant", "Président", "Directeur", "DRH", "Responsable formation"].map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </label>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10.5px] font-bold uppercase tracking-widest text-ink-700">Signature du client</p>
                      <button type="button" onClick={clearSignature} className="text-[11.5px] text-ink-500 hover:text-ink-900 underline">Effacer</button>
                    </div>
                    <div className="relative rounded-2xl border-2 border-dashed border-ink-200 bg-paper2/40 overflow-hidden">
                      <canvas ref={canvasRef} className="w-full h-44 cursor-crosshair touch-none" onPointerDown={startDraw} onPointerMove={moveDraw} onPointerUp={endDraw} onPointerLeave={endDraw} />
                      {!drawn && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="text-[12px] text-ink-400 italic">Signature ici</p></div>}
                    </div>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-ink-100 p-4">
                    <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="w-4 h-4 mt-0.5" />
                    <span className="text-[12.5px] text-ink-700 leading-relaxed">Le client certifie avoir lu la convention et en accepte les termes. Signature électronique de même valeur juridique qu&apos;une signature manuscrite (Code civil, art. 1367). IP et date enregistrées comme preuve.</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="bg-white border-t border-ink-100 px-7 py-5 flex items-center justify-between gap-3 flex-shrink-0 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {secondaryAction && (
                <button onClick={runSecondary} disabled={secondaryAction.busy} className="text-[12.5px] text-ink-700 hover:text-ink-900 underline inline-flex items-center gap-1.5 disabled:opacity-50">
                  {secondaryAction.busy ? "Envoi…" : secondaryAction.label}
                </button>
              )}
              {whatsappAction && (
                <button onClick={runWhatsapp} disabled={whatsappAction.busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-[12px] font-semibold hover:bg-[#1eb957] disabled:opacity-50">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.477-.91zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                  {whatsappAction.busy ? "WhatsApp…" : whatsappAction.label}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-ink-200 text-ink-900 placeholder-ink-400 hover:bg-paper2 text-ink-900 h-display text-[13.5px]">Annuler</button>
              <button onClick={transmit} disabled={!allOk || submitting} className="px-3.5 py-1.5 rounded-full bg-ink-900 text-paper/85 hover:text-paper text-[12px] font-medium hover:bg-black active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
                {submitting ? "Transmission…" : <>{submitLabel || "Transmettre"} <ChevronRight size={13} /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// === Field / Article / SignatureBox / ConventionPreview (copie du wizard admin) ===
function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-paper2/60 border border-ink-100 px-4 py-3">
      <p className="text-[10.5px] uppercase tracking-widest font-bold text-ink-500">{label}</p>
      <p className={`mt-1 text-[14px] text-ink-900 ${mono ? "font-mono" : "h-display"}`}>{value}</p>
    </div>
  );
}
function Article({ num, title, children, highlight }: { num: number; title: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <section className={highlight ? "rounded-lg bg-amber/5 border border-amber/30 p-4" : ""}>
      <h4 className="h-display text-[13.5px] text-ink-900 mb-1.5">Article {num} : {title}</h4>
      <div className="text-[12.5px] leading-relaxed">{children}</div>
    </section>
  );
}
// Bloc signature du bénéficiaire (client), même design que le bloc Delivery Digital :
// signature manuscrite à gauche + identité à droite (nom, adresse, SIRET). @Rabah 2026-06-05
function SignatureBox({ label, stampName, stampSiret, stampLine3, signatureDataUrl }: { label: string; stampName: string; stampSiret: string; stampLine3?: string; highlight?: boolean; preSigned?: boolean; signatureDataUrl?: string }) {
  const siretFmt = stampSiret.replace(/(\d{3})(\d{3})(\d{3})(\d{0,5})/, "$1 $2 $3 $4").trim();
  const isSigned = !!signatureDataUrl;
  return (
    <div className={`rounded-lg border p-3 ${isSigned ? "border-green/40 bg-green/5" : "border-amber/40 bg-amber/5"}`}>
      <p className="text-[11.5px] text-ink-700 mb-0.5">{label}</p>
      <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-ink-500 mb-2">Signature</p>
      <div className="flex items-center gap-3 min-h-[70px]">
        {isSigned
          ? <img src={signatureDataUrl} alt="Signature" className="h-[50px] w-auto max-w-[46%] object-contain mix-blend-multiply" />
          : <div className="h-[50px] w-[46%] rounded border border-dashed border-ink-300 bg-white grid place-items-center text-[9.5px] italic text-ink-400">Signature du client</div>}
        <div className="text-center leading-[1.25] text-[#1b1b1b] flex-1 min-w-0">
          <p className="text-[12px] font-extrabold truncate">{stampName}</p>
          {stampLine3 && <p className="text-[10px] font-bold leading-tight">{stampLine3}</p>}
          {siretFmt && <p className="text-[8.5px] mt-0.5 text-ink-500">SIRET {siretFmt}</p>}
        </div>
      </div>
      {isSigned
        ? <span className="mt-1 inline-flex items-center gap-1 text-[9.5px] text-green"><span className="w-1.5 h-1.5 rounded-full bg-green" />Signé</span>
        : <span className="mt-1 inline-flex items-center gap-1 text-[9.5px] text-amber"><span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />En attente</span>}
    </div>
  );
}
export function ConventionPreview({ beneficiaire, beneficiaireSiret, beneficiaireAddress, formationTitle, formationSummary, selectedSalaries, startDate, endDate, unitPriceHT, beneficiaireSignature, trainerName, trainerEmail }: {
  beneficiaire: string; beneficiaireSiret: string; beneficiaireAddress?: string; formationTitle: string; formationSummary?: string;
  selectedSalaries: Array<{ firstname: string; lastname: string; type_contrat?: string }>;
  startDate?: Date; endDate?: Date; unitPriceHT: number; beneficiaireSignature?: string; trainerName?: string; trainerEmail?: string;
}) {
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const nbStagiaires = selectedSalaries.length;
  const totalHT = unitPriceHT * Math.max(1, nbStagiaires);
  const dateRange = startDate && endDate ? `Du ${startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} au ${endDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}` : "(dates à confirmer)";
  // Créneau visio (1h/jour) dérivé de l'heure de début : 16h-17h ou 17h-18h. @Rabah 2026-06-19
  const vh = startDate ? startDate.getHours() : 16;
  const visioWindow = `${vh}h-${vh + 1}h`;
  const beneficiaireSiretFmt = (beneficiaireSiret || "").replace(/(\d{3})(\d{3})(\d{3})(\d{0,5})/, "$1 $2 $3 $4").trim();
  return (
    <div className="rounded-2xl bg-white border border-ink-100 overflow-hidden">
      <div className="bg-paper2 px-5 py-3 border-b border-ink-100 flex items-center justify-between">
        <p className="h-display text-[13px]">Convention de formation professionnelle</p>
        <p className="text-[11px] text-ink-500">Aperçu - mise à jour automatique</p>
      </div>
      <div className="p-6 max-h-[480px] overflow-y-auto text-[13px] text-ink-700 leading-relaxed space-y-4">
        <div className="text-center pb-3 border-b border-ink-100">
          <h3 className="h-display text-[16px] text-ink-900">Convention de formation professionnelle</h3>
          <p className="text-[11.5px] text-ink-500 mt-1">(Articles R.6313-3 et R.6332-26 du Code du travail)</p>
        </div>
        <section>
          <p className="h-display text-ink-900 mb-1">Entre les soussignés :</p>
          <p>L&apos;organisme de formation <strong>DELIVERY Digital Nice</strong>, 470 promenade des anglais - 06200 Nice - SIRET 90294519500029 - Déclaration d&apos;activité N°93061064306, ci-après « l&apos;organisme de formation ».</p>
        </section>
        <section>
          <p className="h-display text-ink-900 mb-1">Et :</p>
          <p>La société <strong>{beneficiaire}</strong>{beneficiaireAddress ? ` - ${beneficiaireAddress}` : ""} - SIRET <span className="font-mono">{beneficiaireSiretFmt}</span>, représentée par son représentant légal, ci-après « le bénéficiaire ».</p>
        </section>
        <Article num={1} title="OBJET DE LA CONVENTION">
          <p>L&apos;action de formation entre dans la catégorie prévue à l&apos;article L.6313-1 de la sixième partie du Code du travail, à savoir les « actions de développement des compétences ».</p>
          <p className="mt-2"><strong>Intitulé de l&apos;action de formation :</strong> {formationTitle}</p>
          {formationSummary && <p className="mt-2">{formationSummary}</p>}
          <p className="mt-2 h-display text-ink-900">Objectif professionnel visé à l&apos;issue de la formation :</p>
          <ul className="list-disc pl-5 space-y-0.5 mt-1">
            <li><strong>Hygiène :</strong> acquérir des compétences en bonnes pratiques d&apos;hygiène et de sécurité en cuisine.</li>
            <li><strong>Sécurité :</strong> identifier et prévenir les risques de sécurité au travail dans la restauration.</li>
            <li><strong>Développement durable :</strong> intégrer des pratiques durables pour réduire l&apos;empreinte environnementale.</li>
          </ul>
          <p className="mt-2 h-display text-ink-900">Public visé :</p>
          <p>Professionnels du secteur alimentaire (cuisiniers, chefs et responsables de cuisine, restauration collective, gestionnaires d&apos;établissements) et toute personne impliquée dans l&apos;hygiène, la sécurité et le développement durable.</p>
          <p className="mt-2 h-display text-ink-900">Indicateurs de résultats :</p>
          <p>Taux de satisfaction : 90 % · Taux de recommandation : 95 %</p>
          <p className="mt-2"><strong>Période prévisionnelle :</strong> {dateRange}</p>
        </Article>
        <Article num={2} title="NATURE ET LOGISTIQUE DE L'ACTION">
          <p>Action réalisée en distanciel et en INTRA entreprise. Durée : 3 jours dissociés soit 21h. Chaque jour : 1h de visioconférence (créneau {visioWindow}) + 6h en situation de travail (Développement durable, Hygiène en cuisine, Sécurité en cuisine).</p>
          <p className="mt-1"><strong>Prérequis des apprenants avant la formation :</strong> Aucun.</p>
        </Article>
        <Article num={3} title="LES FORMATEURS DE L'ACTION">
          <p>La formation sera assurée par <strong>{trainerName || 'Asma SOUALMI'}</strong>{(trainerEmail || (!trainerName)) ? ` (${trainerEmail || 'dietlivry@gmail.com'})` : ''} : conception de ressources pédagogiques (supports, questionnaires) et animation de formations en visioconférence, en français et en anglais. Pédagogie interactive, structurée et axée sur la mise en situation professionnelle.</p>
        </Article>
        <Article num={4} title="ENGAGEMENTS DE PARTICIPATION">
          <p>Le bénéficiaire s&apos;engage à assurer la présence des participants aux dates, lieux et heures prévues. Les participants sont désignés par la direction de la société. Il s&apos;agit de :</p>
          {nbStagiaires === 0 ? <p className="italic text-ink-500">(Aucun stagiaire - onglet Salariés)</p> : (
            <ul className="list-disc pl-5 space-y-0.5 mt-1">{selectedSalaries.map((s, i) => <li key={i}>{s.firstname} {s.lastname} ({s.type_contrat === "CDD" ? "Salarié d'employeurs privés (CDD)" : "Salarié d'employeurs privés hors apprentis"})</li>)}</ul>
          )}
          <p className="mt-2">Ils devront être déclarés par leurs noms, prénoms et fonctions avant la formation auprès de l&apos;OPCO.</p>
          <p className="mt-2 text-[11.5px] text-ink-500">Accessibilité : notre organisme propose des adaptations et/ou compensations spécifiques pour les personnes en situation de handicap, même temporaire. Merci de nous contacter avant l&apos;entrée en formation.</p>
        </Article>
        <Article num={5} title="DISPOSITIONS FINANCIÈRES ET PRIX DE LA FORMATION" highlight>
          <p>La formation « {formationTitle} » est facturée au prix fixe de {unitPriceHT.toFixed(2)} € TTC par stagiaire. Le coût total de la session est détaillé comme suit :</p>
          <div className="mt-3 rounded-xl bg-ink-900 text-paper p-4 text-[12.5px]">
            <p className="font-mono text-[13px]">coût unitaire H.T <strong>{unitPriceHT.toFixed(2)} €</strong> × <strong>{nbStagiaires || 1} stagiaire{(nbStagiaires || 1) > 1 ? "s" : ""}</strong> = <strong>{totalHT.toFixed(2)} € HT</strong></p>
            <p className="font-mono text-[14px] mt-2 pt-2 border-t border-paper/15"><span className="h-display">TOTAL</span> <strong>{totalHT.toFixed(2)} € TTC</strong> <span className="text-paper/60 text-[11px]">(TVA non applicable)</span></p>
          </div>
          <p className="text-[11.5px] text-ink-500 mt-2 italic">TVA non applicable - art. 261-4-4° du CGI.</p>
        </Article>
        <Article num={6} title="MOYENS PÉDAGOGIQUES ET TECHNIQUES MIS EN ŒUVRE">
          <p><strong>Séquences de travail en visioconférence :</strong> séances interactives en ligne, encadrées par un formateur, pour approfondir les concepts et les appliquer sur des exercices pratiques.</p>
          <p className="mt-1"><strong>Accès continu à la plateforme pédagogique :</strong> cours, quizz et exercices accessibles 24h/24 et 7j/7 via la plateforme DELIVERY Digital (Espace apprenant).</p>
        </Article>
        <Article num={7} title="MOYENS PERMETTANT DE SUIVRE L'EXÉCUTION DE L'ACTION">
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Visioconférence avec un formateur.</li>
            <li>Feedbacks réguliers du formateur.</li>
            <li>Questionnaire individuel de satisfaction à chaud rempli à l&apos;issue de la formation.</li>
            <li>Certificat de réalisation individuel produit.</li>
          </ul>
        </Article>
        <Article num={8} title="MOYENS PERMETTANT D'APPRÉCIER LES RÉSULTATS DE L'ACTION">
          <p>Les évaluations sont réalisées en ligne via la plateforme DELIVERY Digital :</p>
          <ul className="list-disc pl-5 space-y-0.5 mt-1">
            <li><strong>QCM, exercices et projets quotidiens</strong> disponibles chaque jour sur l&apos;Espace apprenant.</li>
            <li><strong>Évaluation de début et de fin de formation</strong> pour mesurer les compétences acquises.</li>
          </ul>
        </Article>
        <Article num={9} title="SANCTION DE LA FORMATION">
          <p>En application de l&apos;article L.6313-1 du Code du travail, un certificat de réalisation mentionnant les objectifs, la nature, la durée de l&apos;action et les résultats de l&apos;évaluation des acquis sera remis à chaque apprenant et à l&apos;employeur financeur à l&apos;issue de la formation.</p>
        </Article>
        <Article num={10} title="APPLICATION DU RGPD">
          <p>Les informations échangées entre les deux structures sont utilisées uniquement dans le cadre de la relation commerciale, exclusivement par DELIVERY Digital Nice, le temps de la formation et de son traitement. Vous pouvez exercer vos droits RGPD à tout moment auprès du référent RGPD.</p>
        </Article>
        <Article num={11} title="ENGAGEMENT QUALITÉ">
          <p>L&apos;organisme satisfait aux exigences du Décret n°2019-564 du 6 juin 2019 relatif à la qualité des actions de formation (certification QUALIOPI N°252411-3). Chaque action fait l&apos;objet d&apos;une convention signée des deux parties, accompagnée du parcours de formation et du règlement intérieur.</p>
        </Article>
        <Article num={12} title="TRAITEMENT DES ÉVENTUELLES RÉCLAMATIONS">
          <p>Une feuille d&apos;appréciation individuelle est renseignée par chaque participant à l&apos;issue de l&apos;action. Toute réclamation, indiquant le nom et l&apos;entreprise, doit être adressée par mail ; une réponse est apportée sous un mois maximum.</p>
        </Article>
        <Article num={13} title="EN CAS DE NON RÉALISATION DE LA PRESTATION DE FORMATION">
          <p>En application de l&apos;article L.6354-1 du Code du travail, faute de réalisation totale ou partielle de la prestation, l&apos;organisme prestataire rembourse au co-contractant les sommes indûment perçues.</p>
        </Article>
        <Article num={14} title="DÉDOMMAGEMENT, RÉPARATION OU DÉDIT">
          <p>En cas de renoncement par l&apos;entreprise bénéficiaire avant le début de la formation :</p>
          <ul className="list-disc pl-5 space-y-0.5 mt-1">
            <li>plus de 2 mois avant : <strong>0 %</strong> du coût dû ;</li>
            <li>2 semaines avant : <strong>50 %</strong> du coût dû ;</li>
            <li>moins d&apos;1 semaine avant : <strong>100 %</strong> du coût dû.</li>
          </ul>
          <p className="mt-1 text-[11.5px] text-ink-500 italic">Les montants versés à ce titre ne sont pas imputables sur l&apos;obligation des employeurs et ne peuvent faire l&apos;objet d&apos;une prise en charge par un OPCO ou un FAF.</p>
        </Article>
        <Article num={15} title="EN CAS DE DIFFÉRENDS POTENTIELS">
          <p>Si une contestation ou un différend ne peut être réglé à l&apos;amiable, le Tribunal de Commerce de Nice sera seul compétent pour régler ce litige commercial.</p>
        </Article>
        <p className="pt-3 border-t border-ink-100 text-[12.5px] text-ink-700">Document signé le <strong>{today}</strong> :</p>
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <SignatureBox label={`Pour ${beneficiaire.toUpperCase()}`} stampName={beneficiaire} stampSiret={beneficiaireSiret} stampLine3={beneficiaireAddress || "(adresse non renseignée)"} highlight={!beneficiaireSignature} signatureDataUrl={beneficiaireSignature} />
          <div className="rounded-lg border border-green/40 bg-green/5 p-3">
            <p className="text-[11.5px] text-ink-700 mb-0.5">Pour DELIVERY Digital Nice</p>
            <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-ink-500 mb-2">Signature</p>
            <div className="flex items-center gap-3 min-h-[70px]">
              <img src="/uploads/assets/signature-dd.png" alt="Signature" className="h-[50px] w-auto mix-blend-multiply" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="text-center leading-[1.25] text-[#1b1b1b]">
                <p className="text-[12px] font-extrabold">DELIVERY Digital Nice</p>
                <p className="text-[10px] font-bold">470 promenade des Anglais</p>
                <p className="text-[10px] font-bold">06200 Nice • France</p>
                <p className="text-[8.5px] mt-0.5 text-ink-500">SIRET 90294519500029 • APE 6201Z</p>
                <p className="text-[8.5px] text-ink-500">RCS 902 945 195</p>
              </div>
            </div>
            <span className="mt-1 inline-flex items-center gap-1 text-[9.5px] text-green"><span className="w-1.5 h-1.5 rounded-full bg-green" />Signé</span>
          </div>
        </div>
      </div>
    </div>
  );
}
