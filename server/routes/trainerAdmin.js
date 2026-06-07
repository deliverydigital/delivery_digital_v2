/**
 * Gestion des comptes FORMATEUR (superadmin via x-admin-secret).
 *   GET  /api/admin/trainers                 - liste des formateurs
 *   POST /api/admin/trainers                 - crée un formateur { email, name, phone?, hourlyRate? }
 *   POST /api/admin/trainers/:id/rate        - fixe le taux horaire négocié
 *   POST /api/admin/trainers/:id/skills      - rattache des formations (program_id[])
 *   POST /api/admin/trainers/:id/validate-*  - valide RIB / onboarding
 *   GET/POST sessions, from-dossier, done, pay - cours + encaissement
 *   instructions CRUD                        - rubrique éditable côté formateur
 * Les formateurs se connectent via /api/auth/login (JWT) et accèdent à /formateur.
 * @author Rabah Ziane · 2026-06-06
 */
import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { User, TrainingProgram } from '../models/index.js';
import TrainerSession from '../models/TrainerSession.js';
import TrainerUnavailability from '../models/TrainerUnavailability.js';
import TrainerInstruction from '../models/TrainerInstruction.js';
import AgencyDossier from '../models/AgencyDossier.js';
import { encryptField, decryptField } from '../models/AccessRequest.js';

const router = express.Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const PUBLIC_BASE = 'https://deliverydigital.fr';
const requireAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
};
function getTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({ host: process.env.SMTP_HOST || 'ssl0.ovh.net', port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DD_LOGO_URL = PUBLIC_BASE + '/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png';
const DD_BLUE = '#0066CC';
function emailShell(innerHtml) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden">
    <div style="height:5px;background:${DD_BLUE}"></div>
    <div style="padding:22px 28px 6px;text-align:center;border-bottom:1px solid #f0f0f2"><img src="${DD_LOGO_URL}" alt="Delivery Digital" style="height:40px;width:auto" /></div>
    <div style="padding:26px 28px">${innerHtml}</div>
    <div style="padding:14px 28px;border-top:1px solid #f0f0f2;background:#fafafa"><p style="margin:0;font-size:11px;color:#86868b">Delivery Digital Nice · 470 promenade des Anglais, 06200 Nice · Organisme de formation certifié QUALIOPI</p></div>
  </div>
</div>`;
}
function welcomeEmail({ name, email, password }) {
  const subject = 'Activez votre espace formateur Delivery Digital';
  const step = (n, t) => `<tr><td style="vertical-align:top;padding:0 10px 10px 0"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:${DD_BLUE};color:#fff;border-radius:999px;font-size:12px;font-weight:700">${n}</span></td><td style="vertical-align:top;padding:0 0 10px;font-size:14px;color:#3a3a3c;line-height:1.5">${t}</td></tr>`;
  const inner = `
    <p style="font-size:15px;color:#1d1d1f;margin:0 0 14px">Bonjour ${esc(name)},</p>
    <p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 18px">Bienvenue parmi les formateurs Delivery Digital. Pour <strong>activer votre compte</strong> et commencer à animer nos formations, connectez-vous à votre espace et complétez les 3 étapes suivantes :</p>
    <table style="border-collapse:collapse;margin:0 0 18px">
      ${step(1, "Renseignez vos <strong>informations</strong> (raison sociale / statut, n° SIRET, adresse).")}
      ${step(2, "Ajoutez votre <strong>RIB</strong> (le justificatif PDF est obligatoire) pour le versement de vos prestations.")}
      ${step(3, "Lisez et <strong>signez le contrat de prestation</strong> en ligne.")}
    </table>
    <p style="font-size:13px;color:#3a3a3c;line-height:1.6;margin:0 0 18px">Votre compte sera <strong>activé après validation</strong> de ces éléments par Delivery Digital. Vous y retrouverez votre <strong>taux horaire négocié</strong>, vos <strong>disponibilités</strong>, vos <strong>formations rattachées</strong> et vos <strong>cours à venir</strong>.</p>
    <div style="background:#f5f5f7;border:1px solid #e5e5ea;border-radius:12px;padding:16px 18px;margin:0 0 18px">
      <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#86868b;font-weight:700">Vos identifiants de connexion</p>
      <p style="margin:0 0 4px;font-size:14px;color:#1d1d1f">Email : <strong>${esc(email)}</strong></p>
      ${password
        ? `<p style="margin:0 0 4px;font-size:14px;color:#1d1d1f">Mot de passe : <strong style="font-family:ui-monospace,monospace">${esc(password)}</strong></p>`
        : `<p style="margin:0 0 4px;font-size:13.5px;color:#3a3a3c">Connectez-vous avec le <strong>mot de passe qui vous a été communiqué</strong> (inchangé).</p>`}
    </div>
    <a href="${PUBLIC_BASE}/formateur" style="display:inline-block;background:${DD_BLUE};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px">${password ? 'Activer mon compte' : 'Accéder à mon espace'}</a>
    <p style="font-size:12.5px;color:#86868b;line-height:1.6;margin:20px 0 0">${password ? 'Pour votre sécurité, pensez à changer votre mot de passe après la première connexion. ' : ''}Cet accès est strictement personnel.</p>`;
  return { subject, html: emailShell(inner) };
}
function genPassword(len = 12) {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const b = crypto.randomBytes(len);
  let o = '';
  for (let i = 0; i < len; i++) o += alpha[b[i] % alpha.length];
  return o;
}

router.get('/', requireAdmin, async (req, res) => {
  try {
    const list = await User.find({ role: 'trainer' })
      .select('email name phone status hourlyRate trainerSkills createdAt last_login iban bic accountHolder bankCountry bankData ribPdfUrl bankValidated companyInfo contract onboardingValidated')
      .sort({ createdAt: -1 }).lean();
    res.json({ trainers: list });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const name = (req.body.name || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'invalid_email' });
    if (!name) return res.status(400).json({ error: 'name_required' });
    if (await User.findOne({ email })) return res.status(409).json({ error: 'email_exists' });
    const password = genPassword(12);
    const user = await User.create({
      email, name, phone: (req.body.phone || '').trim() || undefined,
      role: 'trainer', status: 'active', email_verified: true,
      password_hash: password, agencyPwEnc: encryptField(password),
      hourlyRate: req.body.hourlyRate != null ? Number(req.body.hourlyRate) : 0,
      trainerSkills: Array.isArray(req.body.trainerSkills) ? req.body.trainerSkills : [],
    });
    const preview = welcomeEmail({ name, email, password });
    res.json({ trainer: { id: user._id, email, name }, password, emailPreview: { to: email, subject: preview.subject, html: preview.html } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Renvoyer les accès (ne change PAS le mot de passe).
router.post('/:id/welcome-preview', requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'trainer' }).select('email name agencyPwEnc').lean();
    if (!user) return res.status(404).json({ error: 'not_found' });
    let current = '';
    try { if (user.agencyPwEnc) current = decryptField(user.agencyPwEnc); } catch { current = ''; }
    const preview = welcomeEmail({ name: user.name, email: user.email, password: current });
    res.json({ ok: true, trainer: { id: user._id, email: user.email, name: user.name }, regenerated: false, hasPassword: !!current, emailPreview: { to: user.email, subject: preview.subject, html: preview.html } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Régénérer le mot de passe (seule action qui le change).
router.post('/:id/regenerate-preview', requireAdmin, async (req, res) => {
  try {
    const doc = await User.findOne({ _id: req.params.id, role: 'trainer' });
    if (!doc) return res.status(404).json({ error: 'not_found' });
    const password = genPassword(12);
    doc.password_hash = password;
    doc.agencyPwEnc = encryptField(password);
    await doc.save();
    const preview = welcomeEmail({ name: doc.name, email: doc.email, password });
    res.json({ ok: true, trainer: { id: doc._id, email: doc.email, name: doc.name }, regenerated: true, password, emailPreview: { to: doc.email, subject: preview.subject, html: preview.html } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/:id/send-welcome', requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'trainer' }).select('email name agencyPwEnc').lean();
    if (!user) return res.status(404).json({ error: 'not_found' });
    let password = (req.body.password || '').trim();
    if (!password && user.agencyPwEnc) { try { password = decryptField(user.agencyPwEnc); } catch { password = ''; } }
    const { subject, html } = welcomeEmail({ name: user.name, email: user.email, password });
    await getTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to: user.email, bcc: 'contact@deliverydigital.fr', subject, html });
    res.json({ ok: true, sentTo: user.email });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Taux horaire négocié + rattachement de formations (compétences).
router.post('/:id/rate', requireAdmin, async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, role: 'trainer' });
  if (!u) return res.status(404).json({ error: 'not_found' });
  u.hourlyRate = Math.max(0, Number(req.body.hourlyRate) || 0);
  await u.save();
  res.json({ ok: true, hourlyRate: u.hourlyRate });
});
router.post('/:id/skills', requireAdmin, async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, role: 'trainer' });
  if (!u) return res.status(404).json({ error: 'not_found' });
  u.trainerSkills = Array.isArray(req.body.trainerSkills) ? req.body.trainerSkills.map(String) : [];
  await u.save();
  res.json({ ok: true, trainerSkills: u.trainerSkills });
});

router.post('/:id/validate-bank', requireAdmin, async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role !== 'trainer') return res.status(404).json({ error: 'not_found' });
  u.bankValidated = req.body.validated === false ? false : true;
  await u.save();
  res.json({ ok: true, bankValidated: u.bankValidated });
});
router.post('/:id/validate-onboarding', requireAdmin, async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role !== 'trainer') return res.status(404).json({ error: 'not_found' });
  const ok = req.body.validated === false ? false : true;
  u.onboardingValidated = ok;
  if (u.contract) u.contract.validated = ok;
  if (ok) u.bankValidated = true;
  await u.save();
  res.json({ ok: true, onboardingValidated: u.onboardingValidated, bankValidated: u.bankValidated });
});

// Catalogue des formations (pour rattacher des compétences / créer des sessions).
router.get('/catalog', requireAdmin, async (req, res) => {
  const formations = await TrainingProgram.find({}).select('program_id title duration_hours category').sort({ title: 1 }).lean().catch(() => []);
  res.json({ ok: true, formations });
});

// === Sessions / cours ===
router.get('/sessions', requireAdmin, async (req, res) => {
  const sessions = await TrainerSession.find({}).sort({ sessionStart: -1, createdAt: -1 }).lean();
  res.json({ ok: true, sessions });
});

// Détail complet d'une session : cours + formateur + (si OPCO) dossier + agence + apprenants.
router.get('/sessions/:id/detail', requireAdmin, async (req, res) => {
  const s = await TrainerSession.findById(req.params.id).lean();
  if (!s) return res.status(404).json({ ok: false, error: 'not_found' });
  const trainer = await User.findById(s.trainerId).select('name email phone hourlyRate companyInfo iban bic accountHolder onboardingValidated trainerSkills').lean();
  let dossier = null, agency = null;
  if (s.dossierId) {
    dossier = await AgencyDossier.findById(s.dossierId).lean();
    if (dossier?.agencyId) agency = await User.findById(dossier.agencyId).select('name email phone companyInfo commissionFix commissionPercent').lean();
  }
  res.json({ ok: true, session: s, trainer, dossier, agency });
});

// Dossiers OPCO assignables (pour rattacher un formateur à un cours déjà monté).
router.get('/dossiers', requireAdmin, async (req, res) => {
  const dossiers = await AgencyDossier.find({}).select('denom formationTitle sessionName sessionStart sessionEnd salaries clientEmail addr status').sort({ createdAt: -1 }).limit(500).lean();
  res.json({ ok: true, dossiers });
});

// Notifie le formateur d'un nouveau cours (best effort).
async function notifyAssigned(trainer, s) {
  try {
    if (!trainer?.email) return;
    const when = s.sessionStart ? new Date(s.sessionStart).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'à planifier';
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to: trainer.email, bcc: 'contact@deliverydigital.fr',
      subject: `Nouveau cours assigné - ${s.formationTitle || 'Formation'}`,
      html: emailShell(`<p style="font-size:15px;color:#1d1d1f;margin:0 0 12px">Bonjour ${esc(trainer.name)},</p>
        <p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 14px">Un nouveau cours vous a été assigné :</p>
        <div style="background:#f5f5f7;border:1px solid #e5e5ea;border-radius:12px;padding:14px 16px;margin:0 0 16px;font-size:14px;color:#1d1d1f">
          <p style="margin:0 0 4px"><strong>Formation :</strong> ${esc(s.formationTitle || '-')}</p>
          <p style="margin:0 0 4px"><strong>Client :</strong> ${esc(s.clientName || '-')}</p>
          <p style="margin:0 0 4px"><strong>Date :</strong> ${esc(when)}</p>
          <p style="margin:0"><strong>Apprenants :</strong> ${(s.learners || []).length}</p>
        </div>
        <p style="font-size:13px;color:#3a3a3c;line-height:1.6;margin:0 0 16px">Connectez-vous à votre espace pour voir le détail, les apprenants et les <strong>instructions</strong> (notamment la création du groupe WhatsApp).</p>
        <a href="${PUBLIC_BASE}/formateur" style="display:inline-block;background:${DD_BLUE};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px">Voir mon cours</a>`),
    });
  } catch (e) { /* email best effort */ }
}

// Création d'une session manuelle.
router.post('/sessions', requireAdmin, async (req, res) => {
  const b = req.body || {};
  const trainer = await User.findOne({ _id: b.trainerId, role: 'trainer' }).lean();
  if (!trainer) return res.status(400).json({ ok: false, error: 'invalid_trainer' });
  const learners = Array.isArray(b.learners) ? b.learners.filter((l) => l && (l.firstname || l.lastname)) : [];
  const s = await TrainerSession.create({
    trainerId: trainer._id, trainerName: trainer.name, source: 'manual',
    formationKey: b.formationKey, formationTitle: b.formationTitle, hours: Number(b.hours) || 0,
    clientName: b.clientName, clientEmail: b.clientEmail, location: b.location, addr: b.addr,
    sessionStart: b.startAt ? new Date(b.startAt) : undefined, sessionEnd: b.endAt ? new Date(b.endAt) : undefined,
    learners, pedagoName: b.pedagoName, pedagoPhone: b.pedagoPhone, notes: b.notes,
    status: 'scheduled', assignedNotifiedAt: new Date(),
  });
  notifyAssigned(trainer, s);
  res.json({ ok: true, session: s });
});

// Rattacher un formateur à un dossier OPCO existant -> crée la session (réutilise tout).
router.post('/sessions/from-dossier', requireAdmin, async (req, res) => {
  const b = req.body || {};
  const trainer = await User.findOne({ _id: b.trainerId, role: 'trainer' }).lean();
  if (!trainer) return res.status(400).json({ ok: false, error: 'invalid_trainer' });
  const d = await AgencyDossier.findById(b.dossierId).lean();
  if (!d) return res.status(404).json({ ok: false, error: 'dossier_not_found' });
  // Heures : depuis le catalogue (par titre) sinon valeur fournie sinon 21h (formation OPCO standard).
  let hours = Number(b.hours) || 0;
  if (!hours && d.formationTitle) {
    const prog = await TrainingProgram.findOne({ title: d.formationTitle }).select('duration_hours program_id').lean().catch(() => null);
    if (prog) hours = prog.duration_hours || 0;
  }
  if (!hours) hours = 21;
  const learners = (d.salaries || []).map((sal) => ({ firstname: sal.firstname, lastname: sal.lastname, email: sal.email, phone: sal.telephone || sal.phone || '' }));
  const s = await TrainerSession.create({
    trainerId: trainer._id, trainerName: trainer.name, source: 'opco', dossierId: d._id,
    formationTitle: d.formationTitle, hours,
    clientName: d.denom, clientEmail: d.clientEmail, location: b.location || 'Présentiel', addr: d.addr,
    sessionStart: d.sessionStart, sessionEnd: d.sessionEnd,
    learners, pedagoName: b.pedagoName, pedagoPhone: b.pedagoPhone,
    status: 'scheduled', assignedNotifiedAt: new Date(),
  });
  notifyAssigned(trainer, s);
  res.json({ ok: true, session: s });
});

// MAJ session (date, lieu, responsable pédago, notes...).
router.patch('/sessions/:id', requireAdmin, async (req, res) => {
  const s = await TrainerSession.findById(req.params.id);
  if (!s) return res.status(404).json({ ok: false, error: 'not_found' });
  const b = req.body || {};
  for (const k of ['formationTitle', 'clientName', 'clientEmail', 'location', 'addr', 'pedagoName', 'pedagoPhone', 'notes']) {
    if (b[k] != null) s[k] = b[k];
  }
  if (b.hours != null) s.hours = Number(b.hours) || 0;
  if (b.startAt) s.sessionStart = new Date(b.startAt);
  if (b.endAt) s.sessionEnd = new Date(b.endAt);
  if (b.status && ['scheduled', 'cancelled'].includes(b.status)) s.status = b.status;
  await s.save();
  res.json({ ok: true, session: s });
});

// Marquer une session RÉALISÉE -> fonds disponibles pour le formateur (heures × taux figé).
router.post('/sessions/:id/done', requireAdmin, async (req, res) => {
  const s = await TrainerSession.findById(req.params.id);
  if (!s) return res.status(404).json({ ok: false, error: 'not_found' });
  const trainer = await User.findById(s.trainerId).select('hourlyRate').lean();
  const undo = req.body.done === false;
  if (undo) {
    s.status = 'scheduled'; s.doneAt = null; s.payAmount = 0; s.encashRequestedAt = null;
  } else {
    const rate = req.body.hourlyRate != null ? Number(req.body.hourlyRate) : (trainer?.hourlyRate || 0);
    s.hourlyRate = rate;
    s.payAmount = req.body.payAmount != null ? Math.round(Number(req.body.payAmount)) : Math.round((s.hours || 0) * rate);
    s.status = 'done'; s.doneAt = new Date();
  }
  await s.save();
  res.json({ ok: true, session: s });
});

// Marquer payé (virement effectué).
router.post('/sessions/:id/pay', requireAdmin, async (req, res) => {
  const s = await TrainerSession.findById(req.params.id);
  if (!s) return res.status(404).json({ ok: false, error: 'not_found' });
  s.status = 'paid'; s.paidAt = new Date();
  await s.save();
  res.json({ ok: true, session: s });
});

// Pastille admin : sessions à valider (done sans encash) + ordres d'encaissement reçus.
router.get('/pending-count', requireAdmin, async (req, res) => {
  const sessions = await TrainerSession.find({}).select('status').lean();
  const encash = sessions.filter((s) => s.status === 'encashRequested').length;
  res.json({ ok: true, count: encash, encash });
});

// === Instructions (CRUD éditable) ===
router.get('/instructions', requireAdmin, async (req, res) => {
  const rows = await TrainerInstruction.find({}).sort({ order: 1, createdAt: 1 }).lean();
  res.json({ ok: true, instructions: rows });
});
router.post('/instructions', requireAdmin, async (req, res) => {
  const b = req.body || {};
  const count = await TrainerInstruction.countDocuments({});
  const row = await TrainerInstruction.create({ title: (b.title || 'Étape').trim(), body: (b.body || '').trim(), icon: b.icon || 'check', order: b.order != null ? Number(b.order) : count, active: b.active !== false });
  res.json({ ok: true, instruction: row });
});
router.put('/instructions/:id', requireAdmin, async (req, res) => {
  const b = req.body || {};
  const set = {};
  for (const k of ['title', 'body', 'icon']) if (b[k] != null) set[k] = String(b[k]);
  if (b.order != null) set.order = Number(b.order);
  if (b.active != null) set.active = !!b.active;
  const row = await TrainerInstruction.findByIdAndUpdate(req.params.id, { $set: set }, { new: true });
  if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, instruction: row });
});
router.delete('/instructions/:id', requireAdmin, async (req, res) => {
  await TrainerInstruction.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

export default router;
