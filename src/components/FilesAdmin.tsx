/**
 * Onglet "Fichiers" : coffre-fort de documents stocké sur le serveur DD.
 *
 * v2 (2026-07-14) : upload de DOSSIERS entiers + navigation en arborescence.
 * Le chemin relatif voyage comme 3e argument de `fd.append` (= le "filename"
 * du Content-Disposition), que multer relit dans `file.originalname`.
 *
 * `node_modules`, `.git` et consorts sont exclus côté client : ils représentent
 * l'essentiel des fichiers d'un projet, ne servent à rien sur le serveur, et
 * se régénèrent avec un `npm install`.
 *
 * Upload via XHR et non fetch, uniquement parce que fetch n'expose pas la
 * progression. Téléchargement en deux temps (POST /:id/link → GET /dl/:token)
 * pour ne jamais faire transiter le secret admin dans une URL.
 *
 * @author Rabah Ziane · 2026-07-14
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HardDrive, Upload, Trash2, Download, Loader2, Search, FileIcon, Folder, FolderUp, ChevronRight, Eye, X } from 'lucide-react';

type Item = { id: string; path: string; name: string; size: number; mtime: number };
type Preview = { item: Item; token: string; kind: 'image' | 'pdf' | 'video' | 'text' };

/**
 * Types prévisualisables. Doit rester aligné sur la liste blanche du serveur
 * (routes/filesAdmin.js). html/svg/xml en sont volontairement exclus : servis
 * inline, ils s'exécuteraient dans notre origine.
 */
function kindOf(name: string): Preview['kind'] | null {
  const e = name.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic', 'avif'].includes(e)) return 'image';
  if (e === 'pdf') return 'pdf';
  if (['mp4', 'mov', 'webm'].includes(e)) return 'video';
  if (['txt', 'md', 'csv', 'log'].includes(e)) return 'text';
  return null;
}

// Dossiers jamais envoyés : régénérables et énormes en nombre de fichiers.
const SKIP = /(^|\/)(node_modules|\.git|\.next|dist|build|\.DS_Store|__pycache__|\.venv|Pods)(\/|$)/i;

function humanSize(n: number) {
  if (n < 1024) return `${n} o`;
  const u = ['Ko', 'Mo', 'Go', 'To'];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${u[i]}`;
}
function humanDate(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Aplati une arborescence déposée en drag & drop (API webkitGetAsEntry). */
async function readEntry(entry: any, prefix = ''): Promise<{ file: File; path: string }[]> {
  if (SKIP.test(prefix + entry.name)) return [];
  if (entry.isFile) {
    return new Promise((resolve) =>
      entry.file((f: File) => resolve([{ file: f, path: prefix + entry.name }]), () => resolve([]))
    );
  }
  const reader = entry.createReader();
  const all: any[] = [];
  // readEntries ne renvoie que ~100 entrées par appel : il faut boucler.
  await new Promise<void>((resolve) => {
    const step = () => reader.readEntries((batch: any[]) => {
      if (!batch.length) return resolve();
      all.push(...batch);
      step();
    }, () => resolve());
    step();
  });
  const out: { file: File; path: string }[] = [];
  for (const e of all) out.push(...await readEntry(e, `${prefix}${entry.name}/`));
  return out;
}

export default function FilesAdmin({ secret }: { secret: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [free, setFree] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cwd, setCwd] = useState('');
  const [progress, setProgress] = useState<{ pct: number; n: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  // Échap ferme l'aperçu (réflexe attendu sur une modale plein écran).
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const H = useCallback(() => ({ 'x-admin-secret': secret }), [secret]);

  const load = useCallback(async () => {
    try {
      const [l, d] = await Promise.all([
        fetch('/api/admin/files', { headers: H() }).then((r) => r.json()),
        fetch('/api/admin/files/disk', { headers: H() }).then((r) => r.json()).catch(() => ({ free: null })),
      ]);
      setItems(l.items || []);
      setFree(d?.free ?? null);
    } catch { setErr('Chargement impossible.'); }
    finally { setLoading(false); }
  }, [H]);
  useEffect(() => { load(); }, [load]);

  const send = useCallback((entries: { file: File; path: string }[]) => {
    const keep = entries.filter((e) => !SKIP.test(e.path));
    const skipped = entries.length - keep.length;
    if (!keep.length) {
      setErr(skipped ? `${skipped} fichiers ignorés (node_modules, .git…). Rien à envoyer.` : 'Aucun fichier.');
      return;
    }
    setErr(null);
    const fd = new FormData();
    // Le chemin relatif voyage dans le NOM DU CHAMP, encodé. Impossible de le
    // mettre dans le filename : busboy (sous multer) retire les composants de
    // chemin par sécurité, et les fichiers atterrissent à plat.
    keep.forEach((e) => fd.append(encodeURIComponent(e.path), e.file));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/files/upload');
    xhr.setRequestHeader('x-admin-secret', secret);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress({ pct: Math.round((ev.loaded / ev.total) * 100), n: keep.length });
    };
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        if (skipped) setErr(`Envoyé. ${skipped} fichiers ignorés (node_modules, .git…).`);
        load();
        return;
      }
      if (xhr.status === 413) setErr('Refusé : trop volumineux (limite serveur).');
      else setErr(`Échec de l'envoi (HTTP ${xhr.status}).`);
    };
    xhr.onerror = () => { setProgress(null); setErr('Connexion interrompue pendant l\'envoi.'); };
    xhr.send(fd);
  }, [secret, load]);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const its = Array.from(e.dataTransfer.items);
    const roots = its.map((i) => (i as any).webkitGetAsEntry?.()).filter(Boolean);
    if (roots.length) {
      setProgress({ pct: 0, n: 0 }); // lecture de l'arbre : peut durer sur un gros dossier
      const all: { file: File; path: string }[] = [];
      for (const r of roots) all.push(...await readEntry(r));
      setProgress(null);
      send(all);
    } else {
      send(Array.from(e.dataTransfer.files).map((f) => ({ file: f, path: f.name })));
    }
  }, [send]);

  const download = useCallback(async (it: Item) => {
    try {
      const r = await fetch(`/api/admin/files/${it.id}/link`, { method: 'POST', headers: H() });
      if (!r.ok) throw new Error();
      const { token } = await r.json();
      // Navigation directe : le navigateur streame, rien n'est chargé en mémoire.
      window.location.href = `/api/admin/files/dl/${token}`;
    } catch { setErr('Lien de téléchargement impossible.'); }
  }, [H]);

  const openPreview = useCallback(async (it: Item) => {
    const kind = kindOf(it.name);
    if (!kind) return;
    try {
      const r = await fetch(`/api/admin/files/${it.id}/view`, { method: 'POST', headers: H() });
      if (!r.ok) throw new Error();
      const { token } = await r.json();
      setPreview({ item: it, token, kind });
    } catch { setErr('Aperçu impossible.'); }
  }, [H]);

  const remove = useCallback(async (it: Item) => {
    if (!confirm(`Supprimer définitivement « ${it.name} » ?\n\nCette action est irréversible.`)) return;
    try {
      await fetch(`/api/admin/files/${it.id}`, { method: 'DELETE', headers: H() });
      load();
    } catch { setErr('Suppression impossible.'); }
  }, [H, load]);

  const removeFolder = useCallback(async (name: string, full: string, n: number) => {
    if (!confirm(`Supprimer le dossier « ${name} » et ses ${n} fichiers ?\n\nCette action est irréversible.`)) return;
    try {
      const id = btoa(unescape(encodeURIComponent(full))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      await fetch(`/api/admin/files/folder/${id}`, { method: 'DELETE', headers: H() });
      load();
    } catch { setErr('Suppression impossible.'); }
  }, [H, load]);

  // Vue courante : dossiers + fichiers du répertoire `cwd`. En recherche, on
  // ignore l'arborescence et on cherche dans tout le coffre.
  const { folders, files } = useMemo(() => {
    if (q.trim()) {
      const s = q.toLowerCase();
      return { folders: [] as any[], files: items.filter((i) => i.path.toLowerCase().includes(s)) };
    }
    const pre = cwd ? cwd + '/' : '';
    const here = items.filter((i) => i.path.startsWith(pre));
    const fMap = new Map<string, { size: number; n: number }>();
    const fl: Item[] = [];
    for (const i of here) {
      const rest = i.path.slice(pre.length);
      const slash = rest.indexOf('/');
      if (slash === -1) fl.push(i);
      else {
        const d = rest.slice(0, slash);
        const cur = fMap.get(d) || { size: 0, n: 0 };
        fMap.set(d, { size: cur.size + i.size, n: cur.n + 1 });
      }
    }
    return {
      folders: [...fMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => a.name.localeCompare(b.name)),
      files: fl,
    };
  }, [items, cwd, q]);

  const totalAll = items.reduce((s, i) => s + i.size, 0);
  const crumbs = cwd ? cwd.split('/') : [];

  return (
    <>
      <h1 className="text-[28px] sm:text-[40px] text-[#1D1D1F] mb-1"
        style={{ fontFamily: '"Charter", "Iowan Old Style", Georgia, serif', fontWeight: 700 }}>
        Fichiers.
      </h1>
      <p className="text-[14px] text-[#86868B] mb-6">
        {items.length} fichier{items.length > 1 ? 's' : ''} · {humanSize(totalAll)} utilisés
        {free !== null && <> · {humanSize(free)} libres sur le serveur</>}
      </p>

      {/* Zone de dépôt */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-[18px] border-2 border-dashed p-7 mb-5 text-center transition-colors ${
          dragging ? 'border-[#1D1D1F] bg-white' : 'border-black/12 bg-white/50'
        }`}
      >
        <input ref={fileRef} type="file" multiple hidden
          onChange={(e) => { if (e.target.files) send(Array.from(e.target.files).map((f) => ({ file: f, path: f.name }))); e.target.value = ''; }} />
        {/* webkitdirectory : sélection d'un dossier entier. Chrome/Safari/Edge OK. */}
        <input ref={dirRef} type="file" hidden {...({ webkitdirectory: '', directory: '' } as any)}
          onChange={(e) => {
            const fs2 = Array.from(e.target.files || []);
            send(fs2.map((f) => ({ file: f, path: (f as any).webkitRelativePath || f.name })));
            e.target.value = '';
          }} />

        {progress !== null ? (
          <div className="max-w-[400px] mx-auto">
            <div className="flex items-center justify-center gap-2 text-[14px] text-[#1D1D1F] font-semibold mb-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress.n === 0 ? 'Lecture du dossier…' : `Envoi de ${progress.n} fichiers… ${progress.pct}%`}
            </div>
            <div className="h-1.5 rounded-full bg-black/8 overflow-hidden">
              <div className="h-full bg-[#1D1D1F] transition-all" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>
        ) : (
          <>
            <Upload className="h-6 w-6 mx-auto mb-2.5 text-[#86868B]" />
            <p className="text-[14px] text-[#1D1D1F] font-semibold">Glissez un dossier ou des fichiers ici</p>
            <p className="text-[12.5px] text-[#86868B] mt-1 mb-4">
              L'arborescence est conservée · node_modules et .git ignorés · 2 Go max par fichier
            </p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => dirRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1F] text-white text-[13px] font-semibold hover:bg-[#3C3C43]">
                <FolderUp className="h-3.5 w-3.5" /> Choisir un dossier
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white ring-1 ring-black/10 text-[#1D1D1F] text-[13px] font-semibold hover:bg-[#F5F5F7]">
                <FileIcon className="h-3.5 w-3.5" /> Choisir des fichiers
              </button>
            </div>
          </>
        )}
      </div>

      {err && (
        <div className="mb-4 px-4 py-3 rounded-[12px] bg-[#FFF9E6] text-[#8A6D00] text-[13px] flex items-center justify-between">
          <span>{err}</span>
          <button onClick={() => setErr(null)} className="font-semibold ml-4">Fermer</button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-[420px]">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans tout le coffre…"
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white ring-1 ring-black/8 outline-none text-[13.5px] text-[#1D1D1F]" />
        </div>
        {!q && (
          <div className="flex items-center gap-1 text-[13px] text-[#86868B] flex-wrap">
            <button onClick={() => setCwd('')} className={`font-semibold ${cwd ? 'text-[#1D1D1F] hover:underline' : ''}`}>Racine</button>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <button onClick={() => setCwd(crumbs.slice(0, i + 1).join('/'))}
                  className={i === crumbs.length - 1 ? 'text-[#1D1D1F] font-semibold' : 'hover:underline'}>{c}</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[#86868B] text-[14px]">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="bg-white rounded-[18px] ring-1 ring-black/5 p-8 text-center">
          <HardDrive className="h-7 w-7 mx-auto mb-3 text-[#86868B]" />
          <p className="text-[14px] text-[#86868B]">{items.length === 0 ? 'Aucun fichier pour le moment.' : 'Aucun résultat.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {folders.map((f) => (
            <div key={f.name} className="bg-white rounded-[14px] ring-1 ring-black/5 px-4 py-3 flex items-center gap-3"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <Folder className="h-4 w-4 text-[#1D1D1F] flex-shrink-0" />
              <button onClick={() => setCwd(cwd ? `${cwd}/${f.name}` : f.name)} className="flex-1 min-w-0 text-left">
                <p className="text-[13.5px] text-[#1D1D1F] font-semibold truncate">{f.name}</p>
                <p className="text-[11.5px] text-[#86868B]">{f.n} fichier{f.n > 1 ? 's' : ''} · {humanSize(f.size)}</p>
              </button>
              <button onClick={() => removeFolder(f.name, cwd ? `${cwd}/${f.name}` : f.name, f.n)} title="Supprimer le dossier"
                className="p-2 rounded-[10px] text-[#86868B] hover:bg-[#FFF1F0] hover:text-[#C7261B]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {files.map((it) => (
            <div key={it.id} className="bg-white rounded-[14px] ring-1 ring-black/5 px-4 py-3 flex items-center gap-3"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <FileIcon className="h-4 w-4 text-[#86868B] flex-shrink-0" />
              {/* Toute la ligne est cliquable pour l'aperçu : plus rapide que viser l'icône. */}
              <button onClick={() => openPreview(it)} disabled={!kindOf(it.name)}
                className={`flex-1 min-w-0 text-left ${kindOf(it.name) ? '' : 'cursor-default'}`}>
                <p className="text-[13.5px] text-[#1D1D1F] font-semibold truncate">{it.name}</p>
                <p className="text-[11.5px] text-[#86868B] truncate">
                  {q ? <span className="text-[#1D1D1F]/50">{it.path} · </span> : null}
                  {humanSize(it.size)} · {humanDate(it.mtime)}
                </p>
              </button>
              {kindOf(it.name) && (
                <button onClick={() => openPreview(it)} title="Aperçu"
                  className="p-2 rounded-[10px] text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]">
                  <Eye className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => download(it)} title="Télécharger"
                className="p-2 rounded-[10px] text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]">
                <Download className="h-4 w-4" />
              </button>
              <button onClick={() => remove(it)} title="Supprimer"
                className="p-2 rounded-[10px] text-[#86868B] hover:bg-[#FFF1F0] hover:text-[#C7261B]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modale d'aperçu. Le contenu est servi par /view/:token en inline, avec
          liste blanche + CSP sandbox côté serveur (cf. routes/filesAdmin.js). */}
      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm"
          onClick={() => setPreview(null)}>
          <div className="flex items-center gap-3 px-5 py-3 text-white flex-shrink-0"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold truncate">{preview.item.name}</p>
              <p className="text-[11.5px] text-white/60 truncate">
                {preview.item.path} · {humanSize(preview.item.size)}
              </p>
            </div>
            <button onClick={() => download(preview.item)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#1D1D1F] text-[13px] font-semibold hover:bg-white/90">
              <Download className="h-3.5 w-3.5" /> Télécharger
            </button>
            <button onClick={() => setPreview(null)} title="Fermer (Échap)"
              className="p-2 rounded-full text-white/70 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 px-5 pb-5" onClick={(e) => e.stopPropagation()}>
            {preview.kind === 'image' && (
              <img src={`/api/admin/files/view/${preview.token}`} alt={preview.item.name}
                className="w-full h-full object-contain" />
            )}
            {preview.kind === 'video' && (
              <video src={`/api/admin/files/view/${preview.token}`} controls autoPlay
                className="w-full h-full object-contain" />
            )}
            {(preview.kind === 'pdf' || preview.kind === 'text') && (
              <iframe src={`/api/admin/files/view/${preview.token}`} title={preview.item.name}
                className="w-full h-full rounded-[12px] bg-white" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
