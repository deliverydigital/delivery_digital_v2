/**
 * Coffre-fort de fichiers admin (onglet "Fichiers").
 *
 * v2 (2026-07-14) : upload de DOSSIERS entiers. L'arborescence du Mac est
 * reproduite telle quelle sur le serveur, au lieu d'aplatir en liste.
 *
 * Comment le chemin relatif arrive ici : par le NOM DU CHAMP, encodé en
 * URI-component → `fd.append(encodeURIComponent('A/B/photo.png'), file)`.
 * On ne peut PAS passer par le filename (`fd.append('files', file, path)`) :
 * busboy, sous multer, retire délibérément les composants de chemin du
 * filename par sécurité, donc `originalname` ne contient jamais que le nom de
 * base — vérifié en prod le 2026-07-14, les fichiers atterrissaient à plat.
 * Un champ parallèle `paths[]` serait fragile (ordre des champs vs fichiers
 * non garanti). Le fieldname, lui, arrive intact.
 * ⚠️ Impose `limits.fieldNameSize` (défaut busboy = 100 octets, trop court).
 *
 * Pourquoi pas `uploads/` : ce dossier est servi en STATIQUE PUBLIC
 * (server/index.js, app.use('/uploads', express.static(...))). Y déposer des
 * documents perso les rendrait téléchargeables par quiconque devine l'URL.
 * On écrit donc hors de `uploads/` ET hors du dépôt git.
 *
 * Pourquoi pas de base de données : les métadonnées sont lues du filesystem.
 * Rien à migrer, rien à désynchroniser, et l'arborescence reste lisible en SSH.
 *
 * Le secret ne transite JAMAIS dans une URL (les autres modules acceptent
 * `?adminSecret=`, ce qui fuite dans les logs nginx / le Referer / l'historique).
 * Téléchargement = jeton à usage unique valable 60 s.
 *
 * @author Rabah Ziane · 2026-07-14
 */
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const router = express.Router();

const FILES_DIR = process.env.DD_FILES_DIR || path.join(os.homedir(), 'dd-files');
fs.mkdirSync(FILES_DIR, { recursive: true });

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';

// Comparaison à temps constant (les autres modules font un `!==` naïf).
function secretOk(given) {
  if (typeof given !== 'string' || given.length === 0) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(ADMIN_SECRET);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
const requireAdmin = (req, res, next) => {
  if (!secretOk(req.headers['x-admin-secret'])) return res.status(401).json({ error: 'unauthorized' });
  next();
};

/** Assainit un segment de chemin : neutralise `..`, `/`, `\` et le vide. */
function safeSeg(seg) {
  const s = seg.replace(/[/\\]/g, '_').replace(/^\.+$/, '_').trim();
  return s.length ? s.slice(0, 120) : '_';
}

/** 'A/../B/x.png' -> 'A/B/x.png', chaque segment assaini. */
function safeRelPath(rel) {
  return rel
    .split('/')
    .filter((s) => s && s !== '.' && s !== '..')
    .map(safeSeg)
    .join('/')
    .slice(0, 900);
}

const enc = (p) => Buffer.from(p, 'utf8').toString('base64url');
const dec = (id) => {
  try { return Buffer.from(id, 'base64url').toString('utf8'); } catch { return null; }
};

/** Résout un id vers un chemin réel, en refusant tout ce qui sort de FILES_DIR. */
function resolveById(id) {
  const rel = dec(id);
  if (!rel) return null;
  const full = path.resolve(FILES_DIR, rel);
  const root = path.resolve(FILES_DIR);
  // Garde-fou traversée de chemin (le `+ path.sep` évite qu'un dossier voisin
  // nommé `dd-files-autre` passe le test du startsWith).
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
  return { full, rel, name: path.basename(rel) };
}

/**
 * Chemin relatif d'un fichier reçu.
 * Le fieldname porte le chemin encodé ; on retombe sur originalname (nom de
 * base seul) si le champ s'appelle "files", cas de l'upload fichier par fichier.
 */
function relOf(file) {
  let raw;
  if (file.fieldname && file.fieldname !== 'files') {
    try { raw = decodeURIComponent(file.fieldname); } catch { raw = file.fieldname; }
  } else {
    // Multer décode l'en-tête en latin1 : sans cette conversion, les accents des
    // noms de fichiers macOS ressortent en mojibake ("Ã©" au lieu de "é").
    raw = Buffer.from(file.originalname, 'latin1').toString('utf8');
  }
  return safeRelPath(raw) || 'sans_nom';
}

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const dir = path.join(FILES_DIR, path.dirname(relOf(file)));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, safeSeg(path.basename(relOf(file)))),
});

// 2 Go/fichier. Volontairement large (68 Go libres) mais borné : sans limite,
// un upload qui dérape remplit le disque et fait tomber le site.
// 5000 fichiers : un gros dossier passe en une fois.
// fieldNameSize : le défaut busboy (100 o) tronquerait les chemins profonds.
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 5000, fieldNameSize: 1024 },
});

/** Parcours récursif — renvoie les chemins relatifs de tous les fichiers. */
function walk(dir, base = '') {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, rel));
    else if (e.isFile()) {
      try {
        const st = fs.statSync(full);
        out.push({ id: enc(rel), path: rel, name: e.name, size: st.size, mtime: st.mtimeMs });
      } catch { /* fichier disparu entre readdir et stat : on l'ignore */ }
    }
  }
  return out;
}

// GET /api/admin/files → tous les fichiers avec leur chemin relatif.
// On renvoie tout (et non page par page) : le front construit l'arbre et permet
// une recherche globale. À ~1000 fichiers c'est négligeable ; à revoir au-delà
// de ~20k. TODO(Rabah): paginer si le volume explose.
router.get('/', requireAdmin, (_req, res) => {
  try {
    const items = walk(FILES_DIR).sort((a, b) => b.mtime - a.mtime);
    res.json({ items, total: items.reduce((s, i) => s + i.size, 0), count: items.length });
  } catch (e) {
    console.error('[filesAdmin] list', e);
    res.status(500).json({ error: 'list_failed' });
  }
});

// POST /api/admin/files/upload (multipart, champ "files")
router.post('/upload', requireAdmin, (req, res) => {
  // .any() et non .array('files') : chaque fichier arrive dans un champ dont le
  // nom EST son chemin relatif encodé (voir relOf).
  upload.any()(req, res, (err) => {
    if (err) {
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      console.error('[filesAdmin] upload', err.code || err.message);
      return res.status(tooBig ? 413 : 400).json({
        error: tooBig ? 'file_too_large' : 'upload_failed',
        detail: tooBig ? 'Fichier > 2 Go' : String(err.message || err.code),
      });
    }
    res.json({ ok: true, uploaded: (req.files || []).length });
  });
});

// Jetons de téléchargement/aperçu (60 s), en mémoire.
// Un redémarrage pm2 les vide : sans conséquence, ils ne vivent qu'une minute.
// `once` : les jetons de download sont à usage unique ; ceux d'aperçu ne le sont
// pas, car un <img>/<iframe> peut légitimement refaire la requête (re-render,
// zoom, retry réseau). Ils restent inguessables et expirent en 60 s.
const dlTokens = new Map();
const gcTokens = () => { const n = Date.now(); for (const [t, v] of dlTokens) if (v.exp < n) dlTokens.delete(t); };

function issue(id, once) {
  gcTokens();
  const token = crypto.randomBytes(24).toString('hex');
  dlTokens.set(token, { id, once, exp: Date.now() + 60_000 });
  return token;
}

router.post('/:id/link', requireAdmin, (req, res) => {
  if (!resolveById(req.params.id)) return res.status(404).json({ error: 'not_found' });
  res.json({ token: issue(req.params.id, true) });
});

// Jeton d'aperçu (inline). Séparé du download pour que `once` diffère.
router.post('/:id/view', requireAdmin, (req, res) => {
  const f = resolveById(req.params.id);
  if (!f) return res.status(404).json({ error: 'not_found' });
  if (!previewKind(f.name)) return res.status(415).json({ error: 'not_previewable' });
  res.json({ token: issue(req.params.id, false) });
});

router.get('/dl/:token', (req, res) => {
  gcTokens();
  const entry = dlTokens.get(req.params.token);
  if (!entry) return res.status(403).send('Lien expiré ou déjà utilisé.');
  if (entry.once) dlTokens.delete(req.params.token);
  const f = resolveById(entry.id);
  if (!f) return res.status(404).send('Fichier introuvable.');
  res.download(f.full, f.name);
});

/**
 * Types affichables *inline*. Liste blanche stricte et volontairement courte.
 *
 * ⚠️ Ne JAMAIS y ajouter html/svg/xml : servis inline sur deliverydigital.fr,
 * ils s'exécuteraient dans NOTRE origine (accès au localStorage, donc au secret
 * admin). Un SVG est un document capable de porter du <script>.
 */
const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', heic: 'image/heic', avif: 'image/avif',
  pdf: 'application/pdf',
  txt: 'text/plain; charset=utf-8', md: 'text/plain; charset=utf-8',
  csv: 'text/plain; charset=utf-8', log: 'text/plain; charset=utf-8',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};
function previewKind(name) {
  const ext = path.extname(name).slice(1).toLowerCase();
  const m = MIME[ext];
  if (!m) return null;
  if (m.startsWith('image/')) return { mime: m, kind: 'image' };
  if (m.startsWith('video/')) return { mime: m, kind: 'video' };
  if (m === 'application/pdf') return { mime: m, kind: 'pdf' };
  return { mime: m, kind: 'text' };
}

// GET /api/admin/files/view/:token → rendu inline (aperçu)
router.get('/view/:token', (req, res) => {
  gcTokens();
  const entry = dlTokens.get(req.params.token);
  if (!entry) return res.status(403).send('Lien expiré.');
  const f = resolveById(entry.id);
  if (!f) return res.status(404).send('Fichier introuvable.');
  const p = previewKind(f.name);
  if (!p) return res.status(415).send('Type non affichable.');
  res.setHeader('Content-Type', p.mime);
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`);
  // Défense en profondeur : pas de sniffing du type, et bac à sable au cas où
  // un type de la liste blanche serait un jour détourné.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'");
  res.sendFile(f.full);
});

router.delete('/:id', requireAdmin, (req, res) => {
  const f = resolveById(req.params.id);
  if (!f) return res.status(404).json({ error: 'not_found' });
  try {
    fs.unlinkSync(f.full);
    // Nettoie les dossiers devenus vides jusqu'à la racine du coffre.
    let dir = path.dirname(f.full);
    const root = path.resolve(FILES_DIR);
    while (dir !== root && dir.startsWith(root)) {
      try { if (fs.readdirSync(dir).length) break; fs.rmdirSync(dir); } catch { break; }
      dir = path.dirname(dir);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[filesAdmin] delete', e);
    res.status(500).json({ error: 'delete_failed' });
  }
});

// DELETE /api/admin/files/folder/:id → supprime un dossier et son contenu.
router.delete('/folder/:id', requireAdmin, (req, res) => {
  const rel = dec(req.params.id);
  if (!rel) return res.status(400).json({ error: 'bad_id' });
  const full = path.resolve(FILES_DIR, rel);
  const root = path.resolve(FILES_DIR);
  // Refuse la traversée ET la suppression de la racine entière.
  if (full === root || !full.startsWith(root + path.sep)) return res.status(400).json({ error: 'bad_path' });
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) return res.status(404).json({ error: 'not_found' });
  try {
    fs.rmSync(full, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (e) {
    console.error('[filesAdmin] delete folder', e);
    res.status(500).json({ error: 'delete_failed' });
  }
});

router.get('/disk', requireAdmin, (_req, res) => {
  try {
    const st = fs.statfsSync(FILES_DIR);
    res.json({ free: st.bsize * st.bavail, total: st.bsize * st.blocks });
  } catch { res.json({ free: null, total: null }); }
});

export default router;
