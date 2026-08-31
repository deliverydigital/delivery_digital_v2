/**
 * Espace client - suivi de projet.
 *   Admin  (x-admin-secret) : /api/admin/client-projects   -> CRUD projets + tâches + seed HipeKids
 *   Client (code d'accès)   : /api/client-space/access      -> lecture seule de l'avancement
 * @author Rabah Ziane - 2026-08-05
 */
import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ClientProject from '../models/ClientProject.js';
import { HIPEKIDS_BACKLOG } from '../lib/hipekidsBacklog.js';

const PUBLIC_BASE = 'https://deliverydigital.fr';

// Upload des captures d'écran des commentaires -> uploads/client-space (servi sur /uploads).
// @Rabah 2026-08-10
const CS_UP_DIR = 'uploads/client-space';
const csStorage = multer.diskStorage({
  destination: (req, file, cb) => { fs.mkdirSync(CS_UP_DIR, { recursive: true }); cb(null, CS_UP_DIR); },
  filename: (req, file, cb) => cb(null, `${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname || '.png')}`),
});
const csUpload = multer({ storage: csStorage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)) });
function getTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({ host: process.env.SMTP_HOST || 'ssl0.ovh.net', port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const requireAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
};

const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const genCode = () => 'DD-' + crypto.randomBytes(3).toString('hex').toUpperCase();
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// Vue publique (client) : on masque les notes internes DD.
function publicView(p) {
  return {
    name: p.name, slug: p.slug, summary: p.summary || '', versions: p.versions || [],
    clientRequests: (p.clientRequests || []).map((r) => ({
      id: String(r._id), from: r.from || 'dd', title: r.title || '', instruction: r.instruction || '',
      status: r.status || 'pending', createdAt: r.createdAt, doneAt: r.doneAt || null,
      comments: (r.comments || []).map((c) => ({ author: c.author || 'dd', text: c.text || '', image: c.image || '', createdAt: c.createdAt })),
    })),
    unit: p.unit || 'j',
    logoUrl: p.logoUrl || '', availableDays: p.availableDays || 0, forfaitStart: p.forfaitStart || null,
    clientOrder: p.clientOrder || [], stagingUrl: p.stagingUrl || '', prodUrl: p.prodUrl || '', updatedAt: p.updatedAt,
    // Travaux faits en plus du plan : visibles du client (tracabilite). @Rabah 2026-08-31
    extras: (p.extras || []).map((x) => ({ date: x.date, title: x.title || '', detail: x.detail || '', area: x.area || '', kind: x.kind || 'extra' })),
    tasks: (p.tasks || []).map((t) => ({
      code: t.code, section: t.section, title: t.title, story: t.story, area: t.area,
      priority: t.priority, category: t.category, status: t.status, estimate: t.estimate, dependsOn: t.dependsOn,
      phase: t.phase || 'discussion',   // étape d'avancement (barre côté client). @Rabah 2026-08-10
      ecartee: !!t.ecartee,             // choix client « à ne pas faire ». @Rabah 2026-08-13
    })),
  };
}

/* ============================ ADMIN ============================ */
export const clientAdminRouter = express.Router();
clientAdminRouter.use(requireAdmin);

clientAdminRouter.get('/', async (req, res) => {
  const rows = await ClientProject.find({}).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, projects: rows.map((p) => ({
    id: p._id, name: p.name, slug: p.slug, accessCode: p.accessCode, contactEmail: p.contactEmail,
    active: p.active !== false, tasksCount: (p.tasks || []).length,
    done: (p.tasks || []).filter((t) => t.status === 'done' || t.status === 'built').length,
    lastViewedAt: p.lastViewedAt, createdAt: p.createdAt,
    sends: (p.linkSends || []).map((s) => ({ email: s.email, at: s.at })),
  })) });
});

clientAdminRouter.get('/:id', async (req, res) => {
  const p = await ClientProject.findById(req.params.id).lean();
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, project: p });
});

clientAdminRouter.post('/', async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (!name) return res.status(400).json({ ok: false, error: 'name_required' });
  let slug = slugify(b.slug || name);
  if (await ClientProject.findOne({ slug })) slug = slug + '-' + crypto.randomBytes(2).toString('hex');
  const p = await ClientProject.create({
    name, slug, accessCode: (b.accessCode || '').trim() || genCode(),
    contactEmail: (b.contactEmail || '').trim().toLowerCase(), summary: (b.summary || '').trim(),
    unit: b.unit || 'j', tasks: Array.isArray(b.tasks) ? b.tasks : [],
  });
  res.json({ ok: true, project: p });
});

clientAdminRouter.patch('/:id', async (req, res) => {
  const p = await ClientProject.findById(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  const b = req.body || {};
  if (b.name != null) p.name = String(b.name).trim();
  if (b.summary != null) p.summary = String(b.summary).trim();
  if (b.contactEmail != null) p.contactEmail = String(b.contactEmail).trim().toLowerCase();
  if (b.accessCode != null && String(b.accessCode).trim()) p.accessCode = String(b.accessCode).trim();
  if (b.unit != null) p.unit = String(b.unit).trim() || 'j';
  if (b.availableDays != null) p.availableDays = Number(b.availableDays) || 0;
  if (b.stagingUrl != null) p.stagingUrl = String(b.stagingUrl).trim();
  if (b.prodUrl != null) p.prodUrl = String(b.prodUrl).trim();
  if (b.logoUrl != null) p.logoUrl = String(b.logoUrl).trim();
  if (typeof b.active === 'boolean') p.active = b.active;
  await p.save();
  res.json({ ok: true, project: p });
});

clientAdminRouter.delete('/:id', async (req, res) => {
  await ClientProject.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

// Remplace toute la liste de tâches (import).
clientAdminRouter.put('/:id/tasks', async (req, res) => {
  const p = await ClientProject.findById(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  p.tasks = Array.isArray(req.body.tasks) ? req.body.tasks : [];
  await p.save();
  res.json({ ok: true, tasksCount: p.tasks.length });
});

// Met à jour une tâche (statut, note, estimation…) par code.
clientAdminRouter.patch('/:id/tasks/:code', async (req, res) => {
  const p = await ClientProject.findById(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  const t = (p.tasks || []).find((x) => x.code === req.params.code);
  if (!t) return res.status(404).json({ ok: false, error: 'task_not_found' });
  const b = req.body || {};
  if (b.status && ['todo', 'in_progress', 'done', 'built'].includes(b.status)) t.status = b.status;
  if (b.phase && ['discussion', 'coding', 'testing', 'ready'].includes(b.phase)) t.phase = b.phase;   // étape d'avancement. @Rabah 2026-08-10
  if (b.estimate != null) t.estimate = String(b.estimate);
  if (b.note != null) t.note = String(b.note);
  if (b.priority != null) t.priority = Number(b.priority) || t.priority;
  await p.save();
  res.json({ ok: true, task: t });
});

// Ajoute une nouvelle tâche (bouton + côté admin). @Rabah 2026-08-07
clientAdminRouter.post('/:id/tasks', async (req, res) => {
  const p = await ClientProject.findById(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  const b = req.body || {};
  const title = String(b.title || '').trim();
  if (!title) return res.status(400).json({ ok: false, error: 'title_required' });
  const code = String(b.code || '').trim() || ('T-' + crypto.randomBytes(2).toString('hex').toUpperCase());
  const task = {
    code, section: String(b.section || '').trim() || 'Ajouts DDN', title,
    story: String(b.story || '').trim(), area: '',
    priority: Number(b.priority) || 3, category: String(b.category || '').trim() || 'Nouvelle fonctionnalité',
    status: 'todo', estimate: String(b.estimate || '').trim(), dependsOn: '', note: '',
  };
  p.tasks = [...(p.tasks || []), task];
  await p.save();
  res.json({ ok: true, task });
});

// Crée (ou réinitialise) le projet HipeKids avec le backlog v6 (1er espace client). Idempotent.
clientAdminRouter.post('/seed-hipekids', async (req, res) => {
  const HIPE_LOGO = '/client-logos/hipekids.png?v=2'; // v2 = fond transparent
  let p = await ClientProject.findOne({ slug: 'hipekids' });
  const tasks = HIPEKIDS_BACKLOG.map((t) => ({ ...t }));
  if (p) {
    p.logoUrl = HIPE_LOGO; // s'assure que le logo est posé même si le projet existe déjà
    if (!p.availableDays) p.availableDays = 27; // forfait client
    if (!p.forfaitStart) p.forfaitStart = new Date(); // démarrage « à partir de maintenant »
    if (!p.prodUrl) p.prodUrl = 'https://app.hipekids.com';
    if (!p.stagingUrl) p.stagingUrl = 'https://hipekids.deliverydigital.fr';
    if (req.body && req.body.resetTasks) p.tasks = tasks;
    await p.save();
    return res.json({ ok: true, created: false, project: { id: p._id, slug: p.slug, accessCode: p.accessCode, tasks: p.tasks.length } });
  }
  p = await ClientProject.create({
    name: 'HiPe Kids', slug: 'hipekids', accessCode: genCode(), logoUrl: HIPE_LOGO, availableDays: 27, forfaitStart: new Date(),
    prodUrl: 'https://app.hipekids.com', stagingUrl: 'https://hipekids.deliverydigital.fr',
    summary: 'Suivi du chantier v6.0.0 - refonte espace parent (backend + boutique + réservations + parrainage).',
    unit: 'j', tasks,
  });
  res.json({ ok: true, created: true, project: { id: p._id, slug: p.slug, accessCode: p.accessCode, tasks: p.tasks.length } });
});

// Envoie au client, par email, le lien de son espace de suivi + le code d'accès. @Rabah 2026-08-06
clientAdminRouter.post('/:id/send-link', async (req, res) => {
  const p = await ClientProject.findById(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  const to = String((req.body && req.body.email) || p.contactEmail || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(400).json({ ok: false, error: 'invalid_email' });
  const link = `${PUBLIC_BASE}/espace-client/${p.slug}`;
  const logo = `${PUBLIC_BASE}/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><div style="height:5px;background:#0066CC"></div><div style="padding:22px 26px 6px;text-align:center;border-bottom:1px solid #f0f0f2"><img src="${logo}" alt="Delivery Digital" style="height:38px;width:auto" /></div><div style="padding:26px"><p style="font-size:18px;font-weight:800;color:#1d1d1f;margin:0 0 12px">Votre espace de suivi de projet</p><p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 16px">Bonjour,<br><br>Suivez l'avancement de votre projet <strong>${esc(p.name)}</strong> en temps réel depuis votre espace client Delivery Digital.</p><a href="${link}" style="display:inline-block;background:#0066CC;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:999px">Accéder à mon suivi</a><div style="background:#f5f5f7;border:1px solid #e5e5ea;border-radius:12px;padding:14px 16px;margin:18px 0 0"><p style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#86868b;font-weight:700;margin:0 0 6px">Votre code de suivi</p><p style="font-size:22px;font-weight:800;color:#1d1d1f;letter-spacing:.08em;margin:0">${esc(p.accessCode)}</p></div><p style="font-size:12px;color:#86868b;margin:16px 0 0">Ou copiez ce lien : ${link}</p><p style="font-size:12px;color:#86868b;margin:14px 0 0">Delivery Digital · Suivi de projet</p></div></div></div>`;
  try {
    await getTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to, bcc: 'contact@deliverydigital.fr', replyTo: 'contact@deliverydigital.fr', subject: `Votre espace de suivi - ${p.name}`, html });
    p.linkSends = [...(p.linkSends || []), { email: to, at: new Date() }]; // historique
    if (!p.contactEmail) p.contactEmail = to;
    await p.save().catch(() => {});
    res.json({ ok: true, sentTo: to });
  } catch (e) { res.status(500).json({ ok: false, error: 'send_failed' }); }
});

// Demande une ACTION au client : consigne affichée sur son tableau de bord (option envoi email).
// @Rabah 2026-08-10
clientAdminRouter.post('/:id/requests', async (req, res) => {
  const p = await ClientProject.findById(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  const title = String((req.body && req.body.title) || '').trim();
  const instruction = String((req.body && req.body.instruction) || '').trim();
  if (!instruction) return res.status(400).json({ ok: false, error: 'instruction_required' });
  const doc = { title, instruction, status: 'pending', createdAt: new Date() };
  let emailedTo = null;
  if (req.body && req.body.sendEmail) {
    // Email choisi dans le formulaire (sinon email de contact du dossier). On mémorise le dernier
    // choisi comme contact du dossier. @Rabah 2026-08-10
    const to = String((req.body.email || p.contactEmail || '')).trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      if (to !== String(p.contactEmail || '').toLowerCase()) p.contactEmail = to;
      const link = `${PUBLIC_BASE}/espace-client/${p.slug}`;
      const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><div style="height:5px;background:#0066CC"></div><div style="padding:26px"><p style="font-size:18px;font-weight:800;color:#1d1d1f;margin:0 0 12px">Une action vous est demandée</p>${title ? `<p style="font-size:15px;font-weight:700;color:#1d1d1f;margin:0 0 6px">${esc(title)}</p>` : ''}<p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 16px">${esc(instruction).replace(/\n/g, '<br>')}</p><a href="${link}" style="display:inline-block;background:#0066CC;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:999px">Voir sur mon espace</a><p style="font-size:12px;color:#86868b;margin:16px 0 0">Une fois terminé, confirmez-le depuis votre espace de suivi.</p><p style="font-size:12px;color:#86868b;margin:14px 0 0">Delivery Digital · Suivi de projet</p></div></div></div>`;
      try { await getTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to, bcc: 'contact@deliverydigital.fr', replyTo: 'contact@deliverydigital.fr', subject: `Action à réaliser - ${p.name}`, html }); doc.emailedAt = new Date(); emailedTo = to; } catch (e) { /* email best-effort */ }
    }
  }
  p.clientRequests = [...(p.clientRequests || []), doc];
  await p.save();
  res.json({ ok: true, emailedTo, project: publicView(p) });
});

// DD marque une demande DU CLIENT comme faite. @Rabah 2026-08-10
clientAdminRouter.post('/:id/requests/:reqId/done', async (req, res) => {
  const p = await ClientProject.findById(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  const r = (p.clientRequests || []).id(req.params.reqId);
  if (!r) return res.status(404).json({ ok: false, error: 'request_not_found' });
  r.status = 'done'; r.doneAt = new Date();
  await p.save();
  res.json({ ok: true });
});

// DD ajoute un COMMENTAIRE (texte + capture) sous une tâche. @Rabah 2026-08-10
clientAdminRouter.post('/:id/requests/:reqId/comment', csUpload.single('image'), async (req, res) => {
  const p = await ClientProject.findById(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  const r = (p.clientRequests || []).id(req.params.reqId);
  if (!r) return res.status(404).json({ ok: false, error: 'request_not_found' });
  const text = String((req.body && req.body.text) || '').trim();
  const image = req.file ? `/uploads/client-space/${req.file.filename}` : '';
  if (!text && !image) return res.status(400).json({ ok: false, error: 'empty' });
  r.comments = [...(r.comments || []), { author: 'dd', text, image, createdAt: new Date() }];
  await p.save();
  res.json({ ok: true });
});

/* ============================ CLIENT (public) ============================ */
export const clientPublicRouter = express.Router();

clientPublicRouter.post('/access', async (req, res) => {
  const code = String((req.body && req.body.code) || '').trim();
  const slug = String((req.body && req.body.slug) || '').trim().toLowerCase();
  if (!code) return res.status(400).json({ ok: false, error: 'code_required' });
  const q = slug ? { slug, accessCode: code } : { accessCode: code };
  const p = await ClientProject.findOne(q);
  if (!p || p.active === false) return res.status(401).json({ ok: false, error: 'invalid_code' });
  p.lastViewedAt = new Date();
  await p.save().catch(() => {});
  res.json({ ok: true, project: publicView(p) });
});

// Le client CONFIRME qu'une action demandée est faite -> statut 'done' + notification à DD.
// @Rabah 2026-08-10
clientPublicRouter.post('/request-done', async (req, res) => {
  const code = String((req.body && req.body.code) || '').trim();
  const requestId = String((req.body && req.body.requestId) || '').trim();
  if (!code || !requestId) return res.status(400).json({ ok: false, error: 'params_required' });
  const p = await ClientProject.findOne({ accessCode: code });
  if (!p || p.active === false) return res.status(401).json({ ok: false, error: 'invalid_code' });
  const r = (p.clientRequests || []).id(requestId);
  if (!r) return res.status(404).json({ ok: false, error: 'request_not_found' });
  r.status = 'done'; r.doneAt = new Date();
  await p.save();
  try {
    const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif"><p>Le client <b>${esc(p.name)}</b> a marqué comme <b>FAIT</b> :</p><p style="background:#f5f5f7;border-radius:10px;padding:12px 14px">${r.title ? `<b>${esc(r.title)}</b><br>` : ''}${esc(r.instruction).replace(/\n/g, '<br>')}</p></div>`;
    await getTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to: 'contact@deliverydigital.fr', subject: `Client a confirmé une action - ${p.name}`, html });
  } catch (e) { /* notif best-effort */ }
  res.json({ ok: true, project: publicView(p) });
});

// Le client marque une tâche « à faire » / « à ne pas faire » (ecartee). Une tâche écartée
// sort du forfait et du décompte de jours, et s'affiche grisée. @author Rabah Ziane · 2026-08-13
clientPublicRouter.post('/task-choice', async (req, res) => {
  const code = String((req.body && req.body.code) || '').trim();
  const taskCode = String((req.body && req.body.taskCode) || '').trim();
  const ecartee = !!(req.body && req.body.ecartee);
  if (!code || !taskCode) return res.status(400).json({ ok: false, error: 'params_required' });
  const p = await ClientProject.findOne({ accessCode: code });
  if (!p || p.active === false) return res.status(401).json({ ok: false, error: 'invalid_code' });
  const t = (p.tasks || []).find((x) => x.code === taskCode);
  if (!t) return res.status(404).json({ ok: false, error: 'task_not_found' });
  t.ecartee = ecartee; p.markModified('tasks'); await p.save();
  res.json({ ok: true, project: publicView(p) });
});

// Le CLIENT demande une action à Delivery Digital (apparaît dans la même section). @Rabah 2026-08-10
clientPublicRouter.post('/request-create', async (req, res) => {
  const code = String((req.body && req.body.code) || '').trim();
  const title = String((req.body && req.body.title) || '').trim();
  const instruction = String((req.body && req.body.instruction) || '').trim();
  if (!code || !instruction) return res.status(400).json({ ok: false, error: 'params_required' });
  const p = await ClientProject.findOne({ accessCode: code });
  if (!p || p.active === false) return res.status(401).json({ ok: false, error: 'invalid_code' });
  p.clientRequests = [...(p.clientRequests || []), { from: 'client', title, instruction, status: 'pending', createdAt: new Date(), comments: [] }];
  await p.save();
  try {
    const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif"><p>Le client <b>${esc(p.name)}</b> vous demande une action :</p><p style="background:#f5f5f7;border-radius:10px;padding:12px 14px">${title ? `<b>${esc(title)}</b><br>` : ''}${esc(instruction).replace(/\n/g, '<br>')}</p></div>`;
    await getTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to: 'contact@deliverydigital.fr', subject: `Nouvelle demande du client - ${p.name}`, html });
  } catch (e) { /* notif best-effort */ }
  res.json({ ok: true, project: publicView(p) });
});

// Le client ajoute un COMMENTAIRE (texte + capture) sous une tâche. @Rabah 2026-08-10
clientPublicRouter.post('/request-comment', csUpload.single('image'), async (req, res) => {
  const code = String((req.body && req.body.code) || '').trim();
  const requestId = String((req.body && req.body.requestId) || '').trim();
  const text = String((req.body && req.body.text) || '').trim();
  if (!code || !requestId || (!text && !req.file)) return res.status(400).json({ ok: false, error: 'params_required' });
  const p = await ClientProject.findOne({ accessCode: code });
  if (!p || p.active === false) return res.status(401).json({ ok: false, error: 'invalid_code' });
  const r = (p.clientRequests || []).id(requestId);
  if (!r) return res.status(404).json({ ok: false, error: 'request_not_found' });
  const image = req.file ? `/uploads/client-space/${req.file.filename}` : '';
  r.comments = [...(r.comments || []), { author: 'client', text, image, createdAt: new Date() }];
  await p.save();
  res.json({ ok: true, project: publicView(p) });
});

// Le client réordonne ses tâches (glisser-déposer). On ne stocke que l'ordre (codes), pas le statut.
clientPublicRouter.post('/reorder', async (req, res) => {
  const code = String((req.body && req.body.code) || '').trim();
  const slug = String((req.body && req.body.slug) || '').trim().toLowerCase();
  const order = Array.isArray(req.body && req.body.order) ? req.body.order.map((x) => String(x)) : null;
  if (!code || !order) return res.status(400).json({ ok: false, error: 'bad_request' });
  const q = slug ? { slug, accessCode: code } : { accessCode: code };
  const p = await ClientProject.findOne(q);
  if (!p || p.active === false) return res.status(401).json({ ok: false, error: 'invalid_code' });
  const valid = new Set((p.tasks || []).map((t) => t.code));
  p.clientOrder = order.filter((c) => valid.has(c));
  await p.save();
  res.json({ ok: true });
});
