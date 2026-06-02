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
import { Video, Check, Plus, ChevronRight, Trash2, X } from "lucide-react";
import { computeReimbursement, FORMATION_TARIFS, type CompanySize } from "../lib/opcoRates";
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
};

type WizardTab = "intro" | "employer" | "formation" | "salaries" | "synth" | "docs";
// Session reelle ouverte par le superadmin (cf module formation-sessions).
type Slot = { id: string; title: string; startAt: string; endAt: string; startDate: Date; endDate: Date };

function fmtDtLong(iso?: string) { return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "-"; }
export function emptyWizardSalarie(): WizardSalarie {
  return { id: "s_" + Math.random().toString(36).slice(2, 9), firstname: "", lastname: "", email: "", poste: "", type_contrat: "CDI", date_naissance: "", num_secu: "", telephone: "" };
}

export default function FormationWizardModal({
  employer, onClose, onTransmit, submitting, secondaryAction,
}: {
  employer: WizardEmployer;
  onClose: () => void;
  onTransmit: (p: TransmitPayload) => void;
  submitting: boolean;
  /** Action secondaire optionnelle (ex. "Envoyer le lien au client pour signer"). */
  secondaryAction?: { label: string; onClick: (p: Omit<TransmitPayload, "signedBy" | "signedFunction">) => void; busy?: boolean };
}) {
  const [tab, setTab] = useState<WizardTab>("intro");
  const [introAck, setIntroAck] = useState(false);

  // Creneaux generes localement (Lun-Mer / Jeu-Sam, a partir de J+14).
  const sessionSlots = useMemo<Slot[]>(() => {
    const out: Slot[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cursor = new Date(today); cursor.setDate(cursor.getDate() + 14);
    while (cursor.getDay() !== 1) cursor.setDate(cursor.getDate() + 1);
    let i = 0;
    while (out.length < 8) {
      const offset = i % 2 === 0 ? 0 : 3;
      const start = new Date(cursor); start.setDate(cursor.getDate() + offset); start.setHours(9, 0, 0, 0);
      const end = new Date(start); end.setDate(start.getDate() + 2); end.setHours(17, 0, 0, 0);
      out.push({ id: "s" + i, title: "Formation HACCP - 21h", startAt: start.toISOString(), endAt: end.toISOString(), startDate: start, endDate: end });
      if (i % 2 === 1) cursor.setDate(cursor.getDate() + 7);
      i++;
    }
    return out;
  }, []);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const selectedSlot = sessionSlots.find((s) => s.id === selectedSlotId);
  const startAt = selectedSlot ? selectedSlot.startDate.toISOString() : "";
  const endAt = selectedSlot ? selectedSlot.endDate.toISOString() : "";

  const [formatType] = useState("Visioconférence");
  const [size, setSize] = useState<CompanySize>("tpe");
  // Formation choisie (catalogue) - le montage du dossier est par client. @Rabah 2026-06-02
  const [formationId, setFormationId] = useState<string>(FORMATIONS[0].id);
  const formation = getFormation(formationId) || FORMATIONS[0];

  const [signedBy, setSignedBy] = useState("");
  const [signedFunction, setSignedFunction] = useState("Gérant");
  const [drawn, setDrawn] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [accepted, setAccepted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  // Cote commercial : les stagiaires sont saisis directement dans l'onglet Salariés.
  const [salaries, setSalaries] = useState<WizardSalarie[]>([emptyWizardSalarie()]);
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

  const reimb = computeReimbursement({ opco: employer.opco, size, salariesCount: Math.max(1, selectedCount), hoursPerTrainee: FORMATION_TARIFS.hours, unitPriceHT: FORMATION_TARIFS.unitPriceHT });

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

  function transmit() {
    if (!allOk) { const firstBad = TABS.find((t) => !t.ok); if (firstBad) setTab(firstBad.key); alert("Complétez tous les onglets (✓ vert) avant de transmettre."); return; }
    onTransmit({ startAt, endAt, formatType, size, signedBy: signedBy.trim(), signedFunction: signedFunction.trim(), salaries: filledSalaries, formationTitle: formation.title });
  }
  function runSecondary() {
    if (!secondaryAction) return;
    if (!formationOk || !salariesOk) { setTab(!formationOk ? "formation" : "salaries"); alert("Choisissez une session et ajoutez au moins un stagiaire."); return; }
    secondaryAction.onClick({ startAt, endAt, formatType, size, salaries: filledSalaries, formationTitle: formation.title });
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
                            <p className="h-display text-[14.5px] mt-1 pr-6">{f.title}</p>
                            <p className="text-[11.5px] text-ink-500 mt-1">{f.priceHT} € HT · {f.level} · {f.funding}</p>
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
                      <p className="text-[11.5px] text-ink-500">Du lundi au samedi · 2 sessions / semaine</p>
                    </div>
                    {sessionSlots.length === 0 ? (
                      <p className="text-[12.5px] text-amber bg-amber/10 border border-amber/30 rounded-lg px-3 py-2.5">Aucune session ouverte pour l&apos;instant. Le superadmin doit en activer (Console → Sessions formation).</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {sessionSlots.map((s) => {
                          const isSelected = s.id === selectedSlotId;
                          const dayRange = `${s.startDate.toLocaleDateString("fr-FR", { weekday: "short" })} → ${s.endDate.toLocaleDateString("fr-FR", { weekday: "short" })}`;
                          const dateRange = `${s.startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} → ${s.endDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;
                          return (
                            <button key={s.id} type="button" onClick={() => setSelectedSlotId(s.id)} className={`text-left px-4 py-3.5 rounded-xl border-2 transition relative ${isSelected ? "border-green bg-green/5 shadow-sm" : "border-ink-100 bg-white hover:border-ink-300"}`}>
                              {isSelected && <span className="absolute top-2.5 right-2.5 inline-flex w-5 h-5 rounded-full bg-green text-paper items-center justify-center"><Check size={11} strokeWidth={3} /></span>}
                              <p className="text-[10.5px] uppercase tracking-widest font-bold text-ink-500">{dayRange}</p>
                              <p className="h-display text-[15px] mt-1">{dateRange}</p>
                              <p className="text-[11.5px] text-ink-500 mt-0.5">9h00 → 17h00 · 21h total</p>
                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green/10 text-green border border-green/30 text-[10.5px] h-display"><span className="w-1.5 h-1.5 rounded-full bg-green" />Disponible</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
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
                  <p className="text-[14px] text-ink-700 mb-4">Saisissez les stagiaires à inscrire pour le client. Tous les stagiaires renseignés (prénom + nom) seront inclus au dossier.</p>
                  <div className="space-y-2">
                    {salaries.map((s) => (
                      <div key={s.id} className="rounded-xl border border-ink-100 bg-white p-3">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          <input value={s.firstname} onChange={(e) => updateSalarie(s.id, { firstname: e.target.value })} placeholder="Prénom *" className="px-3 py-2 rounded-lg border border-ink-200 text-[13px] focus:outline-none focus:border-ink-900" />
                          <input value={s.lastname} onChange={(e) => updateSalarie(s.id, { lastname: e.target.value })} placeholder="Nom *" className="px-3 py-2 rounded-lg border border-ink-200 text-[13px] focus:outline-none focus:border-ink-900" />
                          <input value={s.poste} onChange={(e) => updateSalarie(s.id, { poste: e.target.value })} placeholder="Poste" className="px-3 py-2 rounded-lg border border-ink-200 text-[13px] focus:outline-none focus:border-ink-900" />
                          <input value={s.email} onChange={(e) => updateSalarie(s.id, { email: e.target.value })} placeholder="Email" className="px-3 py-2 rounded-lg border border-ink-200 text-[13px] focus:outline-none focus:border-ink-900" />
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-ink-500">Date de naissance</span>
                            <input type="date" value={s.date_naissance} onChange={(e) => updateSalarie(s.id, { date_naissance: e.target.value })} className="mt-0.5 w-full px-3 py-2 rounded-lg border border-ink-200 text-[13px] focus:outline-none focus:border-ink-900" />
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
                                  className={`mt-0.5 w-full px-3 py-2 rounded-lg border text-[13px] font-mono focus:outline-none ${ssnBad ? "border-amber focus:border-amber" : "border-ink-200 focus:border-ink-900"}`}
                                />
                                {ssn.length > 0 && <span className={`text-[10px] mt-0.5 block ${ssnBad ? "text-amber" : "text-ink-400"}`}>{ssn.length}/15 chiffres</span>}
                              </label>
                            );
                          })()}
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-ink-500">Contrat</span>
                            <select value={s.type_contrat} onChange={(e) => updateSalarie(s.id, { type_contrat: e.target.value })} className="mt-0.5 w-full px-3 py-2 rounded-lg border border-ink-200 text-[13px] bg-white focus:outline-none focus:border-ink-900">
                              {["CDI", "CDD", "Apprenti", "Autre"].map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-ink-500">Téléphone</span>
                            <input value={s.telephone} onChange={(e) => updateSalarie(s.id, { telephone: e.target.value })} placeholder="06 12 34 56 78" className="mt-0.5 w-full px-3 py-2 rounded-lg border border-ink-200 text-[13px] focus:outline-none focus:border-ink-900" />
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
                  <div className={`rounded-2xl border p-6 ${reimb.fullyCovered ? "bg-green/10 border-green/40" : "bg-amber/10 border-amber/40"}`}>
                    <div className="grid sm:grid-cols-3 gap-4 text-[13px]">
                      <div><p className="text-[10.5px] uppercase tracking-widest font-bold text-ink-500">Coût total</p><p className="h-display text-[20px] mt-1">{reimb.totalCostHT} € HT</p></div>
                      <div><p className="text-[10.5px] uppercase tracking-widest font-bold text-ink-500">Pris en charge</p><p className="h-display text-[20px] mt-1 text-green">- {reimb.totalCovered} €</p></div>
                      <div><p className="text-[10.5px] uppercase tracking-widest font-bold text-ink-500">Reste à charge</p><p className={`h-display text-[24px] mt-1 ${reimb.fullyCovered ? "text-green" : "text-amber"}`}>{reimb.remainder} €</p></div>
                    </div>
                    <details className="mt-4 text-[12px] text-ink-700">
                      <summary className="cursor-pointer h-display">Détail du calcul · {reimb.rule.label}</summary>
                      <ul className="mt-2 space-y-1 list-disc pl-4 text-[11.5px]">{reimb.detail.map((dd, i) => <li key={i}>{dd}</li>)}</ul>
                    </details>
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
                    selectedSalaries={filledSalaries}
                    startDate={selectedSlot?.startDate}
                    endDate={selectedSlot?.endDate}
                    unitPriceHT={FORMATION_TARIFS.unitPriceHT}
                    beneficiaireSignature={signatureDataUrl}
                  />
                  <div className="rounded-xl bg-paper2/60 border border-ink-100 p-3 text-[12px] text-ink-600">
                    Le <strong>client (restaurateur)</strong> signe ci-dessous. Si le client n&apos;est pas avec vous, utilisez « Envoyer le lien au client » en bas.
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-widest text-ink-700">Nom du signataire (client)</span>
                      <input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Marie Dupont" className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-ink-200 text-[14px] focus:outline-none focus:border-ink-900" />
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] font-bold uppercase tracking-widest text-ink-700">Fonction</span>
                      <select value={signedFunction} onChange={(e) => setSignedFunction(e.target.value)} className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-ink-200 text-[14px] focus:outline-none focus:border-ink-900 bg-white">
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
            <div>
              {secondaryAction && (
                <button onClick={runSecondary} disabled={secondaryAction.busy} className="text-[12.5px] text-ink-700 hover:text-ink-900 underline inline-flex items-center gap-1.5 disabled:opacity-50">
                  {secondaryAction.busy ? "Envoi…" : secondaryAction.label}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-ink-200 hover:bg-paper2 text-ink-900 h-display text-[13.5px]">Annuler</button>
              <button onClick={transmit} disabled={!allOk || submitting} className="px-3.5 py-1.5 rounded-full bg-ink-900 text-paper/85 hover:text-paper text-[12px] font-medium hover:bg-black active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
                {submitting ? "Transmission…" : <>Transmettre <ChevronRight size={13} /></>}
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
function SignatureBox({ label, stampName, stampSiret, stampLine3, highlight, preSigned, signatureDataUrl }: { label: string; stampName: string; stampSiret: string; stampLine3?: string; highlight?: boolean; preSigned?: boolean; signatureDataUrl?: string }) {
  const siretFmt = stampSiret.replace(/(\d{3})(\d{3})(\d{3})(\d{0,5})/, "$1 $2 $3 $4").trim();
  const isSigned = !!signatureDataUrl;
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-amber/40 bg-amber/5" : isSigned ? "border-green/40 bg-green/5" : "border-ink-200 bg-paper2/40"}`}>
      <p className="text-[11.5px] text-ink-700 mb-0.5">{label}</p>
      <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-ink-500 mb-2">Signature</p>
      <div className="relative aspect-[2/1] rounded bg-white border border-dashed border-ink-300 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center" style={{ transform: "rotate(-3deg)" }}>
          <div className="border-2 px-3 py-2 text-center" style={{ borderColor: preSigned ? "#1e3a8a" : "#475569", color: preSigned ? "#1e3a8a" : "#475569", fontFamily: "ui-monospace, monospace", opacity: 0.85 }}>
            <p className="text-[9.5px] font-bold uppercase tracking-wider">{stampName.length > 28 ? stampName.slice(0, 28) + "…" : stampName}</p>
            <p className="text-[9px] mt-0.5">{siretFmt}</p>
            {stampLine3 && <p className="text-[8.5px] mt-0.5 leading-tight">{stampLine3}</p>}
          </div>
        </div>
        {signatureDataUrl && /* eslint-disable-next-line @next/next/no-img-element */ (
          <img src={signatureDataUrl} alt="Signature" className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-multiply" />
        )}
        {(preSigned || isSigned) && <span className="absolute bottom-1.5 right-2 text-[9.5px] text-green h-display inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green" />Signé</span>}
        {highlight && !isSigned && <span className="absolute bottom-1.5 right-2 text-[9.5px] text-amber h-display inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />En attente</span>}
      </div>
    </div>
  );
}
function ConventionPreview({ beneficiaire, beneficiaireSiret, beneficiaireAddress, formationTitle, selectedSalaries, startDate, endDate, unitPriceHT, beneficiaireSignature }: {
  beneficiaire: string; beneficiaireSiret: string; beneficiaireAddress?: string; formationTitle: string;
  selectedSalaries: Array<{ firstname: string; lastname: string; type_contrat?: string }>;
  startDate?: Date; endDate?: Date; unitPriceHT: number; beneficiaireSignature?: string;
}) {
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const nbStagiaires = selectedSalaries.length;
  const totalHT = unitPriceHT * Math.max(1, nbStagiaires);
  const dateRange = startDate && endDate ? `Du ${startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} au ${endDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}` : "(dates à confirmer)";
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
          <p>Action de développement des compétences (art. L.6313-1 du Code du travail).</p>
          <p className="mt-2"><strong>Intitulé :</strong> {formationTitle}</p>
          <p className="mt-2"><strong>Période prévisionnelle :</strong> {dateRange}</p>
        </Article>
        <Article num={2} title="NATURE ET LOGISTIQUE">
          <p>Format mixte : 1h en visioconférence + 6h en situation de travail. Durée : 21h sur 3 jours consécutifs. Aucun prérequis.</p>
        </Article>
        <Article num={4} title="ENGAGEMENTS DE PARTICIPATION">
          <p>Le bénéficiaire s&apos;engage à assurer la présence des participants désignés :</p>
          {nbStagiaires === 0 ? <p className="italic text-ink-500">(Aucun stagiaire - onglet Salariés)</p> : (
            <ul className="list-disc pl-5 space-y-0.5 mt-1">{selectedSalaries.map((s, i) => <li key={i}>{s.firstname} {s.lastname} ({s.type_contrat === "CDD" ? "Salarié CDD" : "Salarié"})</li>)}</ul>
          )}
        </Article>
        <Article num={5} title="DISPOSITIONS FINANCIÈRES" highlight>
          <p>La formation est facturée comme suit :</p>
          <div className="mt-3 rounded-xl bg-ink-900 text-paper p-4 text-[12.5px]">
            <p className="font-mono text-[13px]">coût unitaire H.T <strong>{unitPriceHT.toFixed(2)} €</strong> × <strong>{nbStagiaires || 1} stagiaire{(nbStagiaires || 1) > 1 ? "s" : ""}</strong> = <strong>{totalHT.toFixed(2)} € HT</strong></p>
            <p className="font-mono text-[14px] mt-2 pt-2 border-t border-paper/15"><span className="h-display">TOTAL</span> <strong>{totalHT.toFixed(2)} € TTC</strong> <span className="text-paper/60 text-[11px]">(TVA non applicable)</span></p>
          </div>
          <p className="text-[11.5px] text-ink-500 mt-2 italic">TVA non applicable - art. 261-4-4° du CGI.</p>
        </Article>
        <Article num={9} title="SANCTION DE LA FORMATION">
          <p>Certificat de réalisation remis à chaque apprenant et à l&apos;employeur financeur (art. L.6313-1).</p>
        </Article>
        <Article num={14} title="DÉDIT">
          <p>Renoncement : &gt; 2 mois <strong>0 %</strong> · 2 semaines avant <strong>50 %</strong> · &lt; 1 semaine <strong>100 %</strong> du coût.</p>
        </Article>
        <p className="pt-3 border-t border-ink-100 text-[12.5px] text-ink-700">Document signé le <strong>{today}</strong> :</p>
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <SignatureBox label={`Pour ${beneficiaire.toUpperCase()}`} stampName={beneficiaire} stampSiret={beneficiaireSiret} stampLine3={beneficiaireAddress || "(adresse non renseignée)"} highlight={!beneficiaireSignature} signatureDataUrl={beneficiaireSignature} />
          <SignatureBox label="Pour DELIVERY Digital Nice" stampName="DELIVERY DIGITAL" stampSiret="90294519500029" stampLine3="470 PROMENADE DES ANGLAIS, 06200 NICE" preSigned />
        </div>
      </div>
    </div>
  );
}
