import { useEffect, useRef, useState, useCallback } from 'react';
import { Video, Loader2, Upload, Download, CheckCircle2, Sparkles } from 'lucide-react';

/**
 * Générateur de vidéos "Hacœur" (admin) - GRATUIT par défaut.
 * Prompt -> script (Claude) + voix off Edge-TTS (gratuite, effet hacker) + sous-titres
 * synchronisés + montage FFmpeg (intro + capture optionnelle + outro) en MP4 1080p
 * 16:9 / 9:16. Contenu original (monétisable). @author Rabah Ziane - 2026-06-05
 */
type Output = { format: string; url: string };
type Job = { _id: string; metier?: string; formats?: string[]; engine?: string; status: string; step?: string; progress?: number; error?: string; audioDuration?: number; outputs?: Output[]; createdAt?: string };
type Cfg = { defaultEngine: string; edgeVoice: string; hasElevenKey: boolean; hasClaude: boolean; defaultVoiceId: string };

export default function VideoStudio({ secret }: { secret: string | null }) {
  const headers = useCallback(() => ({ 'x-admin-secret': secret || '' }), [secret]);
  const json = useCallback(() => ({ 'x-admin-secret': secret || '', 'Content-Type': 'application/json' }), [secret]);
  const [metier, setMetier] = useState('');
  const [promptIdea, setPromptIdea] = useState('');
  const [script, setScript] = useState('');
  const [engine, setEngine] = useState('edge');
  const [voiceId, setVoiceId] = useState('');
  const [formats, setFormats] = useState<string[]>(['16:9', '9:16']);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [genScript, setGenScript] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const loadJobs = useCallback(async () => {
    const j = await fetch('/api/admin/video-studio', { headers: headers() }).then((r) => r.json()).catch(() => ({}));
    if (j.ok) setJobs(j.jobs || []);
  }, [headers]);

  useEffect(() => { loadJobs(); fetch('/api/admin/video-studio/config', { headers: headers() }).then((r) => r.json()).then((j) => { if (j.ok) { setCfg(j); setEngine(j.defaultEngine || 'edge'); } }).catch(() => {}); }, [loadJobs, headers]);

  useEffect(() => {
    if (!activeId) return; let stop = false;
    const tick = async () => {
      const j = await fetch(`/api/admin/video-studio/${activeId}`, { headers: headers() }).then((r) => r.json()).catch(() => ({}));
      if (stop) return;
      if (j.ok) { setActive(j.job); if (j.job.status === 'done' || j.job.status === 'error') { loadJobs(); return; } }
      setTimeout(tick, 2500);
    };
    tick(); return () => { stop = true; };
  }, [activeId, headers, loadJobs]);

  function toggleFormat(f: string) { setFormats((p) => p.includes(f) ? p.filter((x) => x !== f) : [...p, f]); }

  async function generateScript() {
    if (!promptIdea.trim() && !metier.trim()) { alert('Donnez un prompt ou un métier/sujet.'); return; }
    setGenScript(true);
    try {
      const r = await fetch('/api/admin/video-studio/script', { method: 'POST', headers: json(), body: JSON.stringify({ prompt: promptIdea.trim(), metier: metier.trim() }) });
      const j = await r.json();
      if (j.ok) setScript(j.script || '');
      else alert('Erreur : ' + (j.error === 'claude_key_missing' ? 'clé Claude non configurée' : j.error));
    } finally { setGenScript(false); }
  }

  async function generate() {
    if (!script.trim()) { alert('Renseignez le script (ou générez-le depuis un prompt).'); return; }
    if (!formats.length) { alert('Choisissez au moins un format.'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append('video', file);
      fd.append('metier', metier.trim());
      fd.append('prompt', promptIdea.trim());
      fd.append('script', script.trim());
      fd.append('engine', engine);
      fd.append('voiceId', voiceId.trim());
      formats.forEach((f) => fd.append('formats', f));
      const r = await fetch('/api/admin/video-studio', { method: 'POST', headers: headers(), body: fd });
      const j = await r.json();
      if (j.ok) { setActiveId(j.jobId); setActive(null); }
      else alert('Erreur : ' + (j.error || 'génération impossible'));
    } finally { setBusy(false); }
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-[11px] uppercase tracking-wider font-bold text-[#86868B] mb-1.5">{label}</label>{children}</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2"><Video className="h-5 w-5 text-[#1D1D1F]" /><h2 className="text-xl font-bold text-[#1D1D1F]">Générateur de vidéos Hacœur</h2></div>
      <p className="text-[13px] text-[#86868B] -mt-3">Prompt → script + voix off gratuite (effet hacker) + sous-titres synchronisés + montage 1080p. Contenu original, prêt à publier (16:9 / 9:16).</p>

      <div className="rounded-2xl bg-white border border-black/10 p-5 space-y-4">
        {/* Prompt -> script */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Métier / sujet"><input value={metier} onChange={(e) => setMetier(e.target.value)} placeholder="Ex. coiffeur" className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" /></Field>
          <Field label="Prompt (idée de la vidéo)"><input value={promptIdea} onChange={(e) => setPromptIdea(e.target.value)} placeholder="Ex. 3 astuces business que personne ne dit aux coiffeurs" className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] focus:outline-none focus:border-black/30" /></Field>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] uppercase tracking-wider font-bold text-[#86868B]">Script (narration)</label>
            <button onClick={generateScript} disabled={genScript || !cfg?.hasClaude} title={cfg?.hasClaude ? '' : 'Clé Claude non configurée'} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0066CC]/10 text-[#0066CC] text-[11.5px] font-semibold hover:bg-[#0066CC]/15 disabled:opacity-50">{genScript ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Générer depuis le prompt</button>
          </div>
          <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={6} placeholder="Le texte lu en voix off (généré depuis le prompt, ou écrit à la main)…" className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] leading-relaxed focus:outline-none focus:border-black/30" />
        </div>

        {/* Voix + capture */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Voix off">
            <div className="flex gap-2">
              <button onClick={() => setEngine('edge')} className={`flex-1 px-3 py-2.5 rounded-lg border text-[12.5px] font-semibold ${engine === 'edge' ? 'border-[#00B576] bg-[#00B576] text-white' : 'border-black/10 hover:bg-black/[0.02]'}`}>Gratuite (hacker)</button>
              <button onClick={() => setEngine('elevenlabs')} disabled={!cfg?.hasElevenKey} title={cfg?.hasElevenKey ? '' : 'Clé ElevenLabs non configurée'} className={`flex-1 px-3 py-2.5 rounded-lg border text-[12.5px] font-semibold disabled:opacity-50 ${engine === 'elevenlabs' ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white' : 'border-black/10 hover:bg-black/[0.02]'}`}>ElevenLabs</button>
            </div>
            <input value={voiceId} onChange={(e) => setVoiceId(e.target.value)} placeholder={engine === 'edge' ? (cfg?.edgeVoice || 'fr-FR-HenriNeural') : (cfg?.defaultVoiceId || 'voice_id ElevenLabs')} className="mt-2 w-full px-3 py-2 rounded-lg border border-black/10 text-[12.5px] font-mono focus:outline-none focus:border-black/30" />
          </Field>
          <Field label="Capture vidéo (optionnel)">
            <input ref={fileRef} type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-black/20 text-[13px] hover:bg-black/[0.02]"><Upload className="h-4 w-4" /> {file ? file.name : 'Capture (sinon fond brandé)'}</button>
            <div className="flex gap-2 mt-2">
              {[{ k: '16:9', l: '16:9 · YouTube' }, { k: '9:16', l: '9:16 · Shorts' }].map((f) => (
                <button key={f.k} onClick={() => toggleFormat(f.k)} className={`flex-1 px-3 py-2 rounded-lg border text-[12px] font-semibold ${formats.includes(f.k) ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white' : 'border-black/10 hover:bg-black/[0.02]'}`}>{f.l}</button>
              ))}
            </div>
          </Field>
        </div>
        <button onClick={generate} disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00B576] text-white text-[13px] font-semibold hover:bg-[#00a06a] disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />} Générer la vidéo</button>
      </div>

      {active && (
        <div className="rounded-2xl bg-white border border-black/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-[14px]">{active.metier ? `Sujet : ${active.metier}` : 'Génération'} · <span className="text-[#86868B]">{active.step}</span></p>
            <span className={`text-[12px] font-semibold ${active.status === 'done' ? 'text-[#34C759]' : active.status === 'error' ? 'text-[#FF3B30]' : 'text-[#0A84FF]'}`}>{active.status === 'processing' || active.status === 'queued' ? `${active.progress || 0}%` : active.status}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-black/[0.06] overflow-hidden"><div className={`h-full transition-all ${active.status === 'error' ? 'bg-[#FF3B30]' : 'bg-[#00B576]'}`} style={{ width: `${active.status === 'error' ? 100 : (active.progress || 0)}%` }} /></div>
          {active.status === 'error' && <p className="mt-2 text-[12.5px] text-[#FF3B30]">Erreur : {active.error}</p>}
          {active.status === 'done' && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              {(active.outputs || []).map((o) => (
                <a key={o.format} href={o.url} download className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[12.5px] font-semibold hover:bg-black"><Download className="h-3.5 w-3.5" /> MP4 {o.format}</a>
              ))}
              {active.audioDuration ? <span className="text-[12px] text-[#86868B]">Durée : {active.audioDuration}s</span> : null}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-white border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10"><h3 className="font-semibold text-[14px]">Vidéos générées</h3></div>
        {jobs.length === 0 ? <p className="px-5 py-8 text-center text-[13px] text-[#86868B]">Aucune vidéo pour l'instant.</p> : (
          <table className="w-full text-[12.5px]">
            <thead className="text-[#86868B] text-[10px] uppercase tracking-wider"><tr className="border-b border-black/5"><th className="text-left px-5 py-2.5">Sujet</th><th className="text-left px-5 py-2.5">Voix</th><th className="text-left px-5 py-2.5">Statut</th><th className="text-right px-5 py-2.5">MP4</th></tr></thead>
            <tbody className="divide-y divide-black/5">
              {jobs.map((j) => (
                <tr key={j._id} className="hover:bg-black/[0.02]">
                  <td className="px-5 py-2.5 font-medium text-[#1D1D1F]">{j.metier || '—'}<p className="text-[#86868B] text-[11px]">{(j.formats || []).join(' · ')}{j.createdAt ? ` · ${new Date(j.createdAt).toLocaleDateString('fr-FR')}` : ''}</p></td>
                  <td className="px-5 py-2.5 text-[#86868B]">{j.engine === 'elevenlabs' ? 'ElevenLabs' : 'Gratuite'}</td>
                  <td className="px-5 py-2.5">{j.status === 'done' ? <span className="inline-flex items-center gap-1 text-[#34C759]"><CheckCircle2 className="h-3.5 w-3.5" /> Terminé</span> : j.status === 'error' ? <span className="text-[#FF3B30]" title={j.error}>Erreur</span> : <span className="text-[#0A84FF]">{j.step} · {j.progress || 0}%</span>}</td>
                  <td className="px-5 py-2.5 text-right">{(j.outputs || []).map((o) => <a key={o.format} href={o.url} download className="inline-block ml-2 text-[#0A84FF] underline">{o.format}</a>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
