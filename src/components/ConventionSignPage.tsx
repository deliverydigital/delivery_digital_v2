import { useEffect, useRef, useState } from 'react';
import { ConventionPreview } from './FormationWizardModal';

/**
 * Page publique : le client lit sa convention de formation et la signe au doigt
 * (lien envoye par l'agence / le commercial). A la signature, le dossier OPCO est
 * cree cote Delivery Digital. HTTPS + IP/date enregistrees. @author Rabah Ziane - 2026-06-04
 */
type Ctx = {
  agencyName?: string; denom?: string; siret?: string; addr?: string; opco?: string;
  formationTitle?: string; sessionName?: string; sessionStart?: string; sessionEnd?: string;
  salaries?: Array<{ firstname: string; lastname: string; type_contrat?: string }>; amountHT?: number;
};

export default function ConventionSignPage({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'signed' | 'cancelled' | 'expired' | 'notfound'>('pending');
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [signedBy, setSignedBy] = useState('');
  const [signedFunction, setSignedFunction] = useState('Gérant');
  const [accepted, setAccepted] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [drawn, setDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/convention-sign/${token}`);
        const j = await r.json();
        if (!j.ok) { setStatus('notfound'); return; }
        setCtx(j.context);
        setStatus(j.expired ? 'expired' : j.status);
      } catch { setStatus('notfound'); } finally { setLoading(false); }
    })();
  }, [token]);

  // Pad de signature (pointer = souris + doigt). On dimensionne le canvas AU MOMENT
  // du premier contact (et non au montage) : sur mobile le layout/clavier peut decaler
  // les dimensions, ce qui rendait le trait invisible. @author Rabah Ziane - 2026-06-04
  const sized = useRef(false);
  function ensureCtx(): CanvasRenderingContext2D | null {
    const c = canvasRef.current; if (!c) return null;
    const ctx2 = c.getContext('2d'); if (!ctx2) return null;
    const ratio = window.devicePixelRatio || 1;
    const w = Math.round(c.offsetWidth * ratio), h = Math.round(c.offsetHeight * ratio);
    if (!sized.current && w > 0 && h > 0) { c.width = w; c.height = h; sized.current = true; } // resize = clear : une seule fois
    ctx2.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx2.lineWidth = 2.2; ctx2.lineCap = 'round'; ctx2.lineJoin = 'round'; ctx2.strokeStyle = '#1D1D1F';
    return ctx2;
  }
  function pos(e: React.PointerEvent<HTMLCanvasElement>) { const c = canvasRef.current!; const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) { e.preventDefault(); const c = canvasRef.current; const ctx2 = ensureCtx(); if (!c || !ctx2) return; drawing.current = true; const p = pos(e); ctx2.beginPath(); ctx2.moveTo(p.x, p.y); ctx2.lineTo(p.x + 0.1, p.y + 0.1); ctx2.stroke(); setDrawn(true); try { c.setPointerCapture(e.pointerId); } catch { /* */ } }
  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; e.preventDefault(); const ctx2 = ensureCtx(); if (!ctx2) return; const p = pos(e); ctx2.lineTo(p.x, p.y); ctx2.stroke(); }
  function endDraw() { if (!drawing.current) return; drawing.current = false; const c = canvasRef.current; if (c) { try { setSignatureDataUrl(c.toDataURL('image/png')); } catch { /* */ } } }
  function clearSignature() { const c = canvasRef.current; if (!c) return; const ctx2 = c.getContext('2d'); if (ctx2) ctx2.clearRect(0, 0, c.width, c.height); setDrawn(false); setSignatureDataUrl(''); }

  async function submit() {
    setError(null);
    if (!signedBy.trim()) { setError('Indiquez le nom du signataire.'); return; }
    if (!drawn || !signatureDataUrl) { setError('Signez dans le cadre prévu.'); return; }
    if (!accepted) { setError('Veuillez accepter les termes de la convention.'); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/convention-sign/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signedBy: signedBy.trim(), signedFunction: signedFunction.trim(), signatureDataUrl }) });
      const j = await r.json();
      if (!r.ok || !j.ok) { setError(j.error === 'expired' ? 'Ce lien a expiré.' : j.error === 'already_signed' ? 'Cette convention a déjà été signée.' : 'Envoi impossible. Réessayez.'); return; }
      setDone(true);
    } catch { setError('Erreur réseau.'); } finally { setSubmitting(false); }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className="min-h-screen bg-[#F2EFE9] flex items-start justify-center px-4 py-8 sm:py-12"><div className="w-full max-w-2xl">{children}</div></main>
  );
  const Msg = ({ title, text, ok }: { title: string; text: string; ok?: boolean }) => (
    <div className={`rounded-2xl border p-8 text-center bg-white ${ok ? 'border-[#34C759]/40' : 'border-black/10'}`}><h1 className="text-xl font-bold text-[#1D1D1F]">{title}</h1><p className="text-[13px] text-[#86868B] mt-2">{text}</p></div>
  );

  if (loading) return <Shell><p className="text-center text-[#86868B] text-[13px]">Chargement…</p></Shell>;
  if (status === 'notfound') return <Shell><Msg title="Lien introuvable" text="Cette convention n'existe pas ou a été supprimée." /></Shell>;
  if (status === 'cancelled') return <Shell><Msg title="Demande annulée" text="Cette demande a été annulée. Contactez votre interlocuteur." /></Shell>;
  if (status === 'expired') return <Shell><Msg title="Lien expiré" text="Ce lien a expiré. Demandez-en un nouveau à votre conseiller." /></Shell>;
  if (done || status === 'signed') return <Shell><Msg ok title="Convention signée ✓" text="Merci, votre convention a bien été signée et transmise à Delivery Digital. Vous pouvez fermer cette page." /></Shell>;

  const start = ctx?.sessionStart ? new Date(ctx.sessionStart) : undefined;
  const end = ctx?.sessionEnd ? new Date(ctx.sessionEnd) : undefined;

  return (
    <Shell>
      <div className="bg-white rounded-2xl border border-black/10 p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#86868B]">Delivery Digital · Signature sécurisée</p>
        <h1 className="text-xl font-bold text-[#1D1D1F] mt-1">Votre convention de formation</h1>
        {ctx?.agencyName && <p className="text-[13px] text-[#86868B] mt-1">Préparée par {ctx.agencyName}. Lisez puis signez au doigt ci-dessous.</p>}

        <div className="mt-4">
          <ConventionPreview
            beneficiaire={ctx?.denom || 'Client'}
            beneficiaireSiret={ctx?.siret || ''}
            beneficiaireAddress={ctx?.addr || ''}
            formationTitle={ctx?.formationTitle || 'Formation'}
            selectedSalaries={ctx?.salaries || []}
            startDate={start}
            endDate={end}
            unitPriceHT={ctx?.amountHT && (ctx.salaries?.length || 0) > 0 ? Math.round(ctx.amountHT / (ctx.salaries!.length)) : 525}
            beneficiaireSignature={signatureDataUrl}
          />
        </div>

        <div className="rounded-xl bg-[#34C759]/5 border border-[#34C759]/30 p-3 text-[12px] text-[#1D1D1F] my-4">🔒 Connexion chiffrée (HTTPS). Signature électronique de même valeur juridique qu'une signature manuscrite (Code civil, art. 1367). IP et date enregistrées comme preuve.</div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10.5px] font-bold uppercase tracking-widest text-[#86868B]">Nom du signataire *</span>
            <input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Marie Dupont" className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-black/10 text-[14px] focus:outline-none focus:border-black/30" />
          </label>
          <label className="block">
            <span className="text-[10.5px] font-bold uppercase tracking-widest text-[#86868B]">Fonction</span>
            <select value={signedFunction} onChange={(e) => setSignedFunction(e.target.value)} className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-black/10 text-[14px] bg-white focus:outline-none focus:border-black/30">
              {['Gérant', 'Président', 'Directeur', 'DRH', 'Responsable formation'].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#86868B]">Votre signature</p>
            <button type="button" onClick={clearSignature} className="text-[11.5px] text-[#86868B] hover:text-[#1D1D1F] underline">Effacer</button>
          </div>
          <div className="relative rounded-2xl border-2 border-dashed border-black/15 bg-[#F2EFE9]/40 overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-44 cursor-crosshair touch-none" onPointerDown={startDraw} onPointerMove={moveDraw} onPointerUp={endDraw} onPointerLeave={endDraw} />
            {!drawn && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="text-[12px] text-[#86868B] italic">Signez ici avec votre doigt</p></div>}
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-black/10 p-4 mt-4">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="w-4 h-4 mt-0.5" />
          <span className="text-[12.5px] text-[#3a3a3c] leading-relaxed">Je certifie avoir lu la convention et j'en accepte les termes.</span>
        </label>

        {error && <p className="text-[12.5px] text-[#FF3B30] mt-3">{error}</p>}
        <button onClick={submit} disabled={submitting} className="mt-4 w-full px-4 py-3 rounded-full bg-[#0066CC] text-white text-[14px] font-semibold hover:bg-[#0077ED] disabled:opacity-60">{submitting ? 'Signature en cours…' : 'Signer ma convention'}</button>
      </div>
      <p className="text-center text-[11px] text-[#86868B] mt-4">© {new Date().getFullYear()} Delivery Digital</p>
    </Shell>
  );
}
