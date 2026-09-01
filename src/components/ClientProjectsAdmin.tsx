import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, Plus, FolderOpen, Copy, ExternalLink, Trash2, ArrowLeft, Check, Sparkles, Circle, Mail, Send, ChevronDown, Paperclip } from 'lucide-react';

/**
 * Admin DD - gestion des espaces client (suivi de projet). Crée des projets, importe/édite les
 * tâches, met à jour les statuts, partage le code + lien d'accès. @author Rabah Ziane - 2026-08-05
 */
type Proj = { id: string; name: string; slug: string; accessCode: string; contactEmail?: string; active: boolean; tasksCount: number; done: number; lastViewedAt?: string; createdAt: string; sends?: { email: string; at: string }[] };
type Task = { code: string; section: string; title: string; story: string; area: string; priority: number; category: string; status: string; estimate: string; dependsOn: string; note?: string; phase?: string };
type ReqComment = { author: string; text: string; image?: string; createdAt?: string };
type ClientRequest = { _id?: string; from?: string; title?: string; instruction: string; status: string; createdAt?: string; doneAt?: string | null; comments?: ReqComment[] };
type Full = { _id: string; name: string; slug: string; accessCode: string; summary?: string; unit?: string; active?: boolean; stagingUrl?: string; prodUrl?: string; contactEmail?: string; clientRequests?: ClientRequest[]; tasks: Task[] };

const STLABEL: Record<string, string> = { todo: 'À faire', in_progress: 'En cours', done: 'Fait', built: 'Construit' };
// Étapes d'avancement (barre client) - dans l'ordre. @Rabah 2026-08-10
const PHASES: [string, string][] = [['discussion', 'En discussion'], ['coding', 'Codage en cours'], ['testing', 'En test (client)'], ['ready', 'Prêt pour la prod']];
const STCOLOR: Record<string, string> = { todo: '#8A8A8E', in_progress: '#0066CC', done: '#1a8a3b', built: '#7c3aed' };
const PUBLIC_BASE = 'https://deliverydigital.fr';

export default function ClientProjectsAdmin({ secret }: { secret: string }) {
  const H = { 'x-admin-secret': secret, 'Content-Type': 'application/json' };
  const [projects, setProjects] = useState<Proj[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState<Full | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [nf, setNf] = useState({ name: '', summary: '', contactEmail: '' });
  const [copied, setCopied] = useState('');
  const [estEdit, setEstEdit] = useState<Record<string, string>>({}); // édition inline des estimations
  const [noteEdit, setNoteEdit] = useState<Record<string, string>>({}); // édition inline des notes internes
  const [addForm, setAddForm] = useState(false); // formulaire d'ajout de tâche
  const [nt, setNt] = useState({ title: '', section: '', estimate: '' });
  const [mailOpen, setMailOpen] = useState<string | null>(null);      // projet dont on saisit l'email
  const [mailVal, setMailVal] = useState('');
  // Formulaire « demander une action au client ». @Rabah 2026-08-10
  const [reqForm, setReqForm] = useState({ title: '', instruction: '', sendEmail: true, email: '' });
  const [reqMsg, setReqMsg] = useState('');
  // À l'ouverture d'un projet, on pré-remplit l'email d'envoi avec le contact du dossier.
  useEffect(() => { if (open) setReqForm((f) => ({ ...f, email: open.contactEmail || '' })); }, [open?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [mailMsg, setMailMsg] = useState('');
  const [histOpen, setHistOpen] = useState(false);                    // historique des envois déplié ?
  const sendLink = async (id: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailVal.trim())) { setMailMsg('Email invalide'); return; }
    setBusy('mail'); setMailMsg('');
    try {
      const d = await fetch(`/api/admin/client-projects/${id}/send-link`, { method: 'POST', headers: H, body: JSON.stringify({ email: mailVal.trim() }) }).then((r) => r.json());
      if (d.ok) { setMailMsg('✓ Lien envoyé à ' + d.sentTo); setHistOpen(true); await load(); setTimeout(() => setMailMsg(''), 3500); }
      else setMailMsg('Échec de l\'envoi');
    } catch { setMailMsg('Échec de l\'envoi'); } finally { setBusy(''); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await fetch('/api/admin/client-projects', { headers: H }).then((r) => r.json()); setProjects(d.projects || []); } catch {} finally { setLoading(false); }
  }, [secret]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const openProject = async (id: string) => {
    const d = await fetch(`/api/admin/client-projects/${id}`, { headers: H }).then((r) => r.json());
    if (d.ok) setOpen(d.project);
  };
  const seedHipe = async () => {
    setBusy('seed');
    try { const d = await fetch('/api/admin/client-projects/seed-hipekids', { method: 'POST', headers: H, body: '{}' }).then((r) => r.json()); if (d.ok) { await load(); } } finally { setBusy(''); }
  };
  const createProject = async () => {
    if (!nf.name.trim()) return; setBusy('new');
    try { const d = await fetch('/api/admin/client-projects', { method: 'POST', headers: H, body: JSON.stringify(nf) }).then((r) => r.json()); if (d.ok) { setShowNew(false); setNf({ name: '', summary: '', contactEmail: '' }); await load(); } } finally { setBusy(''); }
  };
  const del = async (id: string) => { if (!confirm('Supprimer cet espace client ?')) return; await fetch(`/api/admin/client-projects/${id}`, { method: 'DELETE', headers: H }); await load(); };
  const setTaskStatus = async (code: string, status: string) => {
    if (!open) return;
    setOpen({ ...open, tasks: open.tasks.map((t) => (t.code === code ? { ...t, status } : t)) }); // optimiste
    await fetch(`/api/admin/client-projects/${open._id}/tasks/${code}`, { method: 'PATCH', headers: H, body: JSON.stringify({ status }) });
  };
  // Étape d'avancement (barre côté client) : n'a de sens que pour une tâche « En cours ». @Rabah 2026-08-10
  const setTaskPhase = async (code: string, phase: string) => {
    if (!open) return;
    setOpen({ ...open, tasks: open.tasks.map((t) => (t.code === code ? { ...t, phase } : t)) });
    await fetch(`/api/admin/client-projects/${open._id}/tasks/${code}`, { method: 'PATCH', headers: H, body: JSON.stringify({ phase }) });
  };
  // Clic sur une carte (façon Pyemes) : bascule Fait <-> À faire (vert quand fait).
  const toggleDone = (code: string, cur: string) => setTaskStatus(code, cur === 'done' ? 'todo' : 'done');
  const daysNum = (e: string) => { const m = String(e || '').match(/([\d.,]+)\s*j/); return m ? m[1].replace(',', '.') : ''; };
  // Ajuste le temps d'estimation (jours) - si on a été plus/moins vite. Enregistré au blur.
  const saveEstimate = async (code: string, val: string) => {
    if (!open) return;
    const est = String(val).trim() === '' ? '' : `${String(val).replace(',', '.')} j`;
    setOpen((o) => (o ? { ...o, tasks: o.tasks.map((t) => (t.code === code ? { ...t, estimate: est } : t)) } : o));
    await fetch(`/api/admin/client-projects/${open._id}/tasks/${code}`, { method: 'PATCH', headers: H, body: JSON.stringify({ estimate: est }) });
  };
  // Note interne DDN (admin seulement, jamais affichée au client). Enregistrée au blur.
  const saveNote = async (code: string, val: string) => {
    if (!open) return;
    const note = String(val);
    setOpen((o) => (o ? { ...o, tasks: o.tasks.map((t) => (t.code === code ? { ...t, note } : t)) } : o));
    await fetch(`/api/admin/client-projects/${open._id}/tasks/${code}`, { method: 'PATCH', headers: H, body: JSON.stringify({ note }) });
  };
  const addTask = async () => {
    if (!open || !nt.title.trim()) return; setBusy('addtask');
    try {
      const body = { title: nt.title.trim(), section: nt.section.trim(), estimate: nt.estimate.trim() ? `${nt.estimate.trim().replace(',', '.')} j` : '' };
      const d = await fetch(`/api/admin/client-projects/${open._id}/tasks`, { method: 'POST', headers: H, body: JSON.stringify(body) }).then((r) => r.json());
      if (d.ok) { const dd = await fetch(`/api/admin/client-projects/${open._id}`, { headers: H }).then((r) => r.json()); if (dd.ok) setOpen(dd.project); setAddForm(false); setNt({ title: '', section: '', estimate: '' }); }
    } finally { setBusy(''); }
  };
  const saveMeta = async (field: 'stagingUrl' | 'prodUrl', val: string) => {
    if (!open) return;
    setOpen({ ...open, [field]: val });
    await fetch(`/api/admin/client-projects/${open._id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ [field]: val }) });
  };
  // Envoie une action à faire au client (affichée sur son tableau de bord, + email optionnel).
  const sendRequest = async () => {
    if (!open || !reqForm.instruction.trim()) return;
    setBusy('req'); setReqMsg('');
    try {
      const payload = { ...reqForm };
      const d = await fetch(`/api/admin/client-projects/${open._id}/requests`, { method: 'POST', headers: H, body: JSON.stringify(payload) }).then((r) => r.json());
      if (d.ok) {
        setOpen({ ...open, clientRequests: [...(open.clientRequests || []), { title: payload.title, instruction: payload.instruction, status: 'pending' }] });
        setReqForm((f) => ({ title: '', instruction: '', sendEmail: true, email: f.email }));
        setReqMsg(d.emailedTo ? `Envoyée + email à ${d.emailedTo}` : 'Envoyée sur le tableau de bord du client');
      } else setReqMsg('Échec : ' + (d.error || 'réessayez'));
    } finally { setBusy(''); }
  };
  // Réponses DD sur les échanges (marquer fait / commenter + capture). @Rabah 2026-08-10
  const [openReqA, setOpenReqA] = useState<string | null>(null);
  const [admCmt, setAdmCmt] = useState<Record<string, string>>({});
  const admFile = useRef<Record<string, File | null>>({});
  const reloadOpen = async () => { if (!open) return; const dd = await fetch(`/api/admin/client-projects/${open._id}`, { headers: H }).then((r) => r.json()); if (dd.ok) setOpen(dd.project); };
  const markReqDone = async (reqId: string) => {
    if (!open) return; setBusy('rd-' + reqId);
    try { await fetch(`/api/admin/client-projects/${open._id}/requests/${reqId}/done`, { method: 'POST', headers: H }); await reloadOpen(); } finally { setBusy(''); }
  };
  const admComment = async (reqId: string) => {
    if (!open) return;
    const text = (admCmt[reqId] || '').trim(); const file = admFile.current[reqId] || null;
    if (!text && !file) return; setBusy('ac-' + reqId);
    try {
      const fd = new FormData(); fd.append('text', text); if (file) fd.append('image', file);
      await fetch(`/api/admin/client-projects/${open._id}/requests/${reqId}/comment`, { method: 'POST', headers: { 'x-admin-secret': secret }, body: fd });
      setAdmCmt((s) => ({ ...s, [reqId]: '' })); admFile.current[reqId] = null; await reloadOpen();
    } finally { setBusy(''); }
  };
  const copy = (txt: string, key: string) => { navigator.clipboard.writeText(txt); setCopied(key); setTimeout(() => setCopied(''), 1500); };
  const link = (p: { slug: string; accessCode: string }) => `${PUBLIC_BASE}/espace-client/${p.slug}`;

  /* ---- Détail d'un projet (tâches) ---- */
  if (open) {
    const isDone = (t: Task) => t.status === 'done' || t.status === 'built';
    const done = open.tasks.filter(isDone).length;
    const pct = open.tasks.length ? Math.round((done / open.tasks.length) * 100) : 0;
    const consumed = Math.round(open.tasks.filter(isDone).reduce((s, t) => s + (parseFloat(daysNum(t.estimate)) || 0), 0) * 10) / 10;
    const totalDays = Math.round(open.tasks.reduce((s, t) => s + (parseFloat(daysNum(t.estimate)) || 0), 0) * 10) / 10;
    const sections = [...new Set(open.tasks.map((t) => t.section))];
    return (
      <div className="max-w-[980px] mx-auto">
        <button onClick={() => { setOpen(null); load(); }} className="inline-flex items-center gap-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] mb-4"><ArrowLeft className="h-4 w-4" /> Tous les espaces client</button>
        <div className="bg-white rounded-2xl border border-black/8 p-5 mb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-[20px] font-bold text-[#1D1D1F]">{open.name}</h2>
              <p className="text-[13px] text-[#6E6E73]">{open.tasks.length} tâches · {pct}% terminé · {consumed}/{totalDays} j</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#6E6E73]">Code :</span>
              <code className="text-[13px] font-mono bg-[#F0F0F2] px-2 py-1 rounded">{open.accessCode}</code>
              <button onClick={() => copy(open.accessCode, 'c-code')} className="p-1.5 rounded-lg hover:bg-[#F5F5F7]" title="Copier le code">{copied === 'c-code' ? <Check className="h-4 w-4 text-[#1a8a3b]" /> : <Copy className="h-4 w-4 text-[#6E6E73]" />}</button>
              <button onClick={() => copy(link(open), 'c-link')} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-black/10 text-[12.5px]">{copied === 'c-link' ? <Check className="h-3.5 w-3.5 text-[#1a8a3b]" /> : <ExternalLink className="h-3.5 w-3.5" />} Lien client</button>
            </div>
          </div>
          {/* URLs d'aperçu montrées au client (boutons Test/Prod + modal iPad). @Rabah 2026-08-07 */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-black/5">
            <span className="text-[12px] text-[#6E6E73] shrink-0">Aperçu client :</span>
            <input defaultValue={open.stagingUrl || ''} onBlur={(e) => saveMeta('stagingUrl', e.target.value.trim())} placeholder="URL test (staging)" className="flex-1 min-w-[180px] h-9 px-3 rounded-lg border border-black/12 text-[12.5px]" />
            <input defaultValue={open.prodUrl || ''} onBlur={(e) => saveMeta('prodUrl', e.target.value.trim())} placeholder="URL production" className="flex-1 min-w-[180px] h-9 px-3 rounded-lg border border-black/12 text-[12.5px]" />
          </div>
          {/* Demander une action au client : consigne affichée sur son tableau de bord + email optionnel.
              @Rabah 2026-08-10 */}
          <div className="mt-3 pt-3 border-t border-black/5">
            <div className="text-[12px] font-semibold text-[#1D1D1F] mb-1.5 inline-flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Demander une action au client</div>
            <input value={reqForm.title} onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })} placeholder="Titre (ex. Valider les textes de la page d'accueil)" className="w-full h-9 px-3 rounded-lg border border-black/12 text-[12.5px] mb-2" />
            <textarea value={reqForm.instruction} onChange={(e) => setReqForm({ ...reqForm, instruction: e.target.value })} placeholder="Instruction : ce que le client doit faire…" rows={3} className="w-full px-3 py-2 rounded-lg border border-black/12 text-[12.5px] resize-y" />
            {/* Email d'envoi choisi (éditable) + suggestion du vrai email client. @Rabah 2026-08-10 */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-2 text-[12px] text-[#3a3a3c] cursor-pointer shrink-0">
                <input type="checkbox" checked={reqForm.sendEmail} onChange={(e) => setReqForm({ ...reqForm, sendEmail: e.target.checked })} /> Envoyer aussi par email à :
              </label>
              <input value={reqForm.email} onChange={(e) => setReqForm({ ...reqForm, email: e.target.value })} placeholder="email du client" type="email" disabled={!reqForm.sendEmail}
                className="flex-1 min-w-[200px] h-9 px-3 rounded-lg border border-black/12 text-[12.5px] disabled:opacity-50" />
            </div>
            {reqForm.sendEmail && reqForm.email !== 'el-mehdi.benrahhalate@hipekids.com' && (
              <button onClick={() => setReqForm({ ...reqForm, email: 'el-mehdi.benrahhalate@hipekids.com' })} className="mt-1.5 text-[11.5px] text-[#0066CC] underline">Utiliser el-mehdi.benrahhalate@hipekids.com</button>
            )}
            <div className="flex items-center justify-end gap-2 mt-2 flex-wrap">
              {reqMsg && <span className="text-[12px] text-[#1a8a3b]">{reqMsg}</span>}
              <button onClick={sendRequest} disabled={busy === 'req' || !reqForm.instruction.trim()} className="h-9 px-4 rounded-full bg-[#0066CC] text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">{busy === 'req' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Envoyer la demande</button>
            </div>
            {/* Échanges : demandes DD -> client ET client -> DD, dépliables (commentaires + captures). */}
            {open.clientRequests && open.clientRequests.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="text-[11px] uppercase tracking-wide font-semibold text-[#8A8A8E]">Échanges</div>
                {open.clientRequests.slice().reverse().map((r) => {
                  const rid = r._id || '';
                  const isOpen = openReqA === rid;
                  return (
                    <div key={rid} className="rounded-lg border border-black/8">
                      <button onClick={() => setOpenReqA(isOpen ? null : rid)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px]">
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: r.from === 'client' ? 'rgba(255,102,52,0.14)' : 'rgba(0,102,204,0.12)', color: r.from === 'client' ? '#FF6634' : '#0066CC' }}>{r.from === 'client' ? 'Client' : 'DD'}</span>
                        <span className="truncate flex-1 text-[#3a3a3c]">{r.title || r.instruction}</span>
                        <span className="shrink-0 font-semibold" style={{ color: r.status === 'done' ? '#1a8a3b' : '#8A5A05' }}>{r.status === 'done' ? '✓ Fait' : 'En cours'}</span>
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-2.5 border-t border-black/5">
                          <div className="pt-2 text-[12px] text-[#3a3a3c] whitespace-pre-line">{r.instruction}</div>
                          {r.from === 'client' && r.status !== 'done' && (
                            <button onClick={() => markReqDone(rid)} disabled={busy === 'rd-' + rid} className="mt-2 h-8 px-3 rounded-full text-[11.5px] font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: '#1a8a3b' }}>{busy === 'rd-' + rid ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Marquer comme fait</button>
                          )}
                          <div className="mt-2 space-y-1.5">
                            {(r.comments || []).map((cc, j) => (
                              <div key={j} className={`flex ${cc.author === 'dd' ? 'flex-row-reverse' : ''}`}>
                                <div className="max-w-[85%] rounded-lg px-2.5 py-1.5" style={{ background: cc.author === 'dd' ? 'rgba(0,102,204,0.08)' : 'rgba(255,102,52,0.10)' }}>
                                  {cc.text && <div className="text-[12px] text-[#1D1D1F] whitespace-pre-line">{cc.text}</div>}
                                  {cc.image && <a href={cc.image} target="_blank" rel="noreferrer"><img src={cc.image} alt="" className="mt-1 rounded max-h-32 border border-black/10" /></a>}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <input value={admCmt[rid] || ''} onChange={(e) => setAdmCmt((s) => ({ ...s, [rid]: e.target.value }))} placeholder="Répondre…" className="flex-1 h-8 px-2.5 rounded-lg border border-black/12 text-[12px]" />
                            <label className="h-8 w-8 rounded-lg border border-black/10 inline-flex items-center justify-center cursor-pointer" title="Joindre une capture"><Paperclip className="h-3.5 w-3.5 text-[#6E6E73]" /><input type="file" accept="image/*" className="hidden" onChange={(e) => { admFile.current[rid] = e.target.files?.[0] || null; }} /></label>
                            <button onClick={() => admComment(rid)} disabled={busy === 'ac-' + rid} className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-white disabled:opacity-50" style={{ background: '#0066CC' }}>{busy === 'ac-' + rid ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Barre de progression - recalcul live selon les tâches marquées faites. @Rabah 2026-08-06 */}
        <div className="bg-white rounded-2xl border border-black/8 px-5 py-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-[#1D1D1F]">Avancement</span>
            <span className="text-[14px] font-bold tabular-nums text-[#1a8a3b]">{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-black/8 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#0066CC,#1a8a3b)' }} />
          </div>
          <div className="text-[11.5px] text-[#8A8A8E] mt-2">{done}/{open.tasks.length} tâches faites · {consumed}/{totalDays} j consommés · <b>cliquez une carte</b> pour la marquer faite (vert)</div>
        </div>

        {sections.map((sec) => (
          <div key={sec} className="mb-5">
            <div className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#8A8A8E] mb-2 px-1">{sec}</div>
            <div className="space-y-1.5">
              {open.tasks.filter((t) => t.section === sec).map((t) => {
                const d = isDone(t);
                return (
                  <div key={t.code} onClick={() => toggleDone(t.code, t.status)} title="Cliquer : marquer faite / à faire"
                    className="rounded-xl border px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors"
                    style={d ? { background: 'rgba(26,138,59,0.10)', borderColor: 'rgba(26,138,59,0.45)' } : { background: '#fff', borderColor: 'rgba(0,0,0,0.08)' }}>
                    {d ? <Check className="h-5 w-5 shrink-0" style={{ color: '#1a8a3b' }} /> : <Circle className="h-5 w-5 shrink-0" style={{ color: '#C4C4C9' }} />}
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono text-[#8A8A8E]">{t.code} · <span style={{ color: '#c9a227' }}>{'★'.repeat(t.priority)}</span></div>
                      <div className="text-[13.5px] font-medium text-[#1D1D1F] truncate">{t.title}</div>
                      <input value={noteEdit[t.code] ?? (t.note || '')} onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setNoteEdit((s) => ({ ...s, [t.code]: e.target.value }))}
                        onBlur={(e) => { saveNote(t.code, e.target.value); setNoteEdit((s) => { const n = { ...s }; delete n[t.code]; return n; }); }}
                        placeholder="+ note interne (admin, non visible client)"
                        className="mt-1 w-full max-w-[520px] h-7 text-[11.5px] px-2 rounded-md border border-transparent hover:border-black/10 focus:border-black/20 outline-none bg-transparent text-[#0f9d6e] placeholder:text-[#C0C0C6]" />
                    </div>
                    {/* Estimation éditable (jours) - si on a été plus/moins vite. Ne déclenche pas le toggle. */}
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 shrink-0" title="Temps estimé (jours)">
                      <input type="number" step="0.5" min="0" value={estEdit[t.code] ?? daysNum(t.estimate)}
                        onChange={(e) => setEstEdit((s) => ({ ...s, [t.code]: e.target.value }))}
                        onBlur={(e) => { saveEstimate(t.code, e.target.value); setEstEdit((s) => { const n = { ...s }; delete n[t.code]; return n; }); }}
                        className="w-14 h-9 rounded-lg border border-black/12 px-2 text-[12.5px] text-right tabular-nums" />
                      <span className="text-[11px] text-[#8A8A8E]">j</span>
                    </div>
                    {/* Statut fin (En cours / Construit) - ne déclenche pas le toggle. */}
                    <select onClick={(e) => e.stopPropagation()} value={t.status} onChange={(e) => setTaskStatus(t.code, e.target.value)}
                      className="h-9 px-2 rounded-lg border border-black/12 text-[12px] font-medium cursor-pointer shrink-0" style={{ color: STCOLOR[t.status] }}>
                      {Object.entries(STLABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    {/* Étape d'avancement : uniquement pour « En cours » (pilote la barre côté client). @Rabah 2026-08-10 */}
                    {t.status === 'in_progress' && (
                      <select onClick={(e) => e.stopPropagation()} value={t.phase || 'discussion'} onChange={(e) => setTaskPhase(t.code, e.target.value)}
                        title="Étape d'avancement (barre côté client)"
                        className="h-9 px-2 rounded-lg border border-black/12 text-[12px] font-medium cursor-pointer shrink-0 text-[#0066CC]">
                        {PHASES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Ajouter une tâche (+ enregistrer + estimation). @Rabah 2026-08-07 */}
        {addForm ? (
          <div className="bg-white rounded-2xl border border-black/8 p-4 space-y-2.5 mt-1">
            <input value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} placeholder="Titre de la tâche" autoFocus className="w-full h-10 px-3 rounded-lg border border-black/12 text-[13.5px]" />
            <div className="flex gap-2 flex-wrap">
              <input value={nt.section} onChange={(e) => setNt({ ...nt, section: e.target.value })} placeholder="Section (optionnel)" className="flex-1 min-w-[180px] h-10 px-3 rounded-lg border border-black/12 text-[13px]" />
              <div className="flex items-center gap-1"><input type="number" step="0.5" min="0" value={nt.estimate} onChange={(e) => setNt({ ...nt, estimate: e.target.value })} placeholder="Est." className="w-20 h-10 px-2 rounded-lg border border-black/12 text-[13px] text-right" /><span className="text-[12px] text-[#6E6E73]">j</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={addTask} disabled={busy === 'addtask' || !nt.title.trim()} className="h-10 px-4 rounded-full bg-[#0066CC] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">{busy === 'addtask' && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer</button>
              <button onClick={() => { setAddForm(false); setNt({ title: '', section: '', estimate: '' }); }} className="h-10 px-4 rounded-full border border-black/12 text-[13px]">Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddForm(true)} className="w-full h-11 rounded-2xl border border-dashed border-black/15 text-[13px] text-[#6E6E73] hover:bg-white inline-flex items-center justify-center gap-1.5 mt-1"><Plus className="h-4 w-4" /> Ajouter une tâche</button>
        )}
      </div>
    );
  }

  /* ---- Liste des espaces client ---- */
  return (
    <div className="max-w-[980px] mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[#1D1D1F]">Espaces client</h1>
          <p className="text-[13px] text-[#6E6E73]">Suivi de projet partagé avec chaque client (lecture seule via code).</p>
        </div>
        <div className="flex items-center gap-2">
          {!projects.some((p) => p.slug === 'hipekids') && (
            <button onClick={seedHipe} disabled={busy === 'seed'} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-black/12 bg-white text-[13px] font-medium disabled:opacity-50">{busy === 'seed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-[#7c3aed]" />} Créer l'espace HiPe Kids</button>
          )}
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#0066CC] text-white text-[13px] font-semibold"><Plus className="h-4 w-4" /> Nouveau</button>
        </div>
      </div>

      {showNew && (
        <div className="bg-white rounded-2xl border border-black/8 p-5 mb-5 space-y-3">
          <input value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="Nom du client (ex. HiPe Kids)" className="w-full h-11 px-3.5 rounded-xl border border-black/12 text-[14px]" />
          <input value={nf.summary} onChange={(e) => setNf({ ...nf, summary: e.target.value })} placeholder="Sous-titre / résumé du projet" className="w-full h-11 px-3.5 rounded-xl border border-black/12 text-[14px]" />
          <input value={nf.contactEmail} onChange={(e) => setNf({ ...nf, contactEmail: e.target.value })} placeholder="Email de contact (optionnel)" className="w-full h-11 px-3.5 rounded-xl border border-black/12 text-[14px]" />
          <div className="flex gap-2">
            <button onClick={createProject} disabled={busy === 'new' || !nf.name.trim()} className="h-10 px-4 rounded-full bg-[#0066CC] text-white text-[13px] font-semibold disabled:opacity-50 inline-flex items-center gap-1.5">{busy === 'new' && <Loader2 className="h-4 w-4 animate-spin" />} Créer</button>
            <button onClick={() => setShowNew(false)} className="h-10 px-4 rounded-full border border-black/12 text-[13px]">Annuler</button>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#8A8A8E]" /></div> : (
        <div className="space-y-2.5">
          {projects.map((p) => (
            <div key={p.id}>
            <div className="bg-white rounded-2xl border border-black/8 px-5 py-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-[#F0F0F2] flex items-center justify-center shrink-0"><FolderOpen className="h-5 w-5 text-[#6E6E73]" /></div>
              <button onClick={() => openProject(p.id)} className="min-w-0 flex-1 text-left">
                <div className="text-[15px] font-semibold text-[#1D1D1F]">{p.name}</div>
                <div className="text-[12px] text-[#8A8A8E]">{p.done}/{p.tasksCount} terminées · code {p.accessCode}{p.lastViewedAt ? ` · vu le ${new Date(p.lastViewedAt).toLocaleDateString('fr-FR')}` : ' · jamais consulté'}</div>
              </button>
              <button onClick={() => { setMailOpen(mailOpen === p.id ? null : p.id); setMailVal(p.contactEmail || ''); setMailMsg(''); }} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-black/10 text-[12.5px] shrink-0" title="Envoyer le lien par email"><Mail className="h-3.5 w-3.5" /> Email</button>
              <button onClick={() => copy(link(p), 'l-' + p.id)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-black/10 text-[12.5px] shrink-0">{copied === 'l-' + p.id ? <Check className="h-3.5 w-3.5 text-[#1a8a3b]" /> : <ExternalLink className="h-3.5 w-3.5" />} Lien</button>
              <button onClick={() => openProject(p.id)} className="h-9 px-3.5 rounded-lg bg-[#1D1D1F] text-white text-[12.5px] font-medium shrink-0">Gérer</button>
              <button onClick={() => del(p.id)} className="p-2 rounded-lg hover:bg-[#F5F5F7] shrink-0" title="Supprimer"><Trash2 className="h-4 w-4 text-[#c0392b]" /></button>
            </div>
            {mailOpen === p.id && (
              <div className="bg-white rounded-2xl border border-black/8 px-5 py-3 mt-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Mail className="h-4 w-4 text-[#6E6E73] shrink-0" />
                  <input type="email" value={mailVal} onChange={(e) => setMailVal(e.target.value)} placeholder="email@client.com" autoFocus className="flex-1 min-w-[200px] h-10 px-3 rounded-xl border border-black/12 text-[13px]" />
                  <button onClick={() => sendLink(p.id)} disabled={busy === 'mail'} className="h-10 px-4 rounded-full bg-[#0066CC] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">{busy === 'mail' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Envoyer le lien</button>
                  {mailMsg && <span className={`text-[12.5px] ${mailMsg.startsWith('✓') ? 'text-[#1a8a3b]' : 'text-[#c0392b]'}`}>{mailMsg}</span>}
                </div>
                {/* Historique des envois - flèche dépliable + chargement. @Rabah 2026-08-06 */}
                <button onClick={() => setHistOpen((o) => !o)} className="mt-2.5 inline-flex items-center gap-1 text-[12px] text-[#6E6E73] hover:text-[#1D1D1F]">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${histOpen ? 'rotate-180' : ''}`} /> Historique des envois ({(p.sends || []).length})
                </button>
                {histOpen && (
                  <div className="mt-1.5 pl-1 space-y-1">
                    {busy === 'mail' && <div className="flex items-center gap-1.5 text-[12px] text-[#0066CC]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi en cours…</div>}
                    {(p.sends || []).slice().reverse().map((s, i) => (
                      <div key={i} className="text-[12px] text-[#6E6E73]"><span className="text-[#8A8A8E] tabular-nums">{new Date(s.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> · {s.email}</div>
                    ))}
                    {!(p.sends || []).length && <div className="text-[12px] text-[#8A8A8E]">Aucun envoi pour l'instant.</div>}
                  </div>
                )}
              </div>
            )}
            </div>
          ))}
          {!projects.length && <div className="text-center text-[13px] text-[#8A8A8E] py-12">Aucun espace client. Créez celui de HiPe Kids pour commencer.</div>}
        </div>
      )}
    </div>
  );
}
