/**
 * Espace FORMATEUR (auth JWT, role 'trainer'). Même principe que l'espace agence :
 * onboarding (infos entreprise + RIB + contrat) validé par le superadmin, puis le
 * formateur gère ses disponibilités, voit son taux horaire négocié + ses formations
 * rattachées + ses cours, et encaisse ses fonds (heures × taux) via une facture +
 * un ordre d'encaissement envoyé au superadmin.
 * @author Rabah Ziane · 2026-06-06
 */
import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { authenticate } from '../middleware/auth.js';
import { User, TrainingProgram } from '../models/index.js';
import TrainerSession from '../models/TrainerSession.js';
import TrainerUnavailability from '../models/TrainerUnavailability.js';
import TrainerInstruction from '../models/TrainerInstruction.js';

const router = express.Router();
const PUBLIC_BASE = 'https://deliverydigital.fr';
function getTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({ host: process.env.SMTP_HOST || 'ssl0.ovh.net', port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}

router.use(authenticate, (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
  if (req.user.role !== 'trainer') return res.status(403).json({ error: 'not_trainer' });
  next();
});

router.get('/profile', async (req, res) => {
  const u = await User.findById(req.user.id).lean();
  if (!u) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({
    ok: true,
    trainer: {
      id: u._id, name: u.name, email: u.email, phone: u.phone || '',
      hourlyRate: u.hourlyRate || 0,
      trainerSkills: u.trainerSkills || [],
      recurringAvailability: { days: u.recurringAvailability?.days || [], slots: u.recurringAvailability?.slots || [] },
      reminderPrefs: {
        course48: u.reminderPrefs?.course48 !== false,
        course24: u.reminderPrefs?.course24 !== false,
        course1: u.reminderPrefs?.course1 !== false,
        weeklyAvailability: u.reminderPrefs?.weeklyAvailability !== false,
        weeklyDay: u.reminderPrefs?.weeklyDay != null ? u.reminderPrefs.weeklyDay : 5,
        weeklyHour: u.reminderPrefs?.weeklyHour != null ? u.reminderPrefs.weeklyHour : 10,
      },
      iban: u.iban || '', bic: u.bic || '', accountHolder: u.accountHolder || '',
      bankCountry: u.bankCountry || 'FR', bankData: u.bankData || {},
      ribPdfUrl: u.ribPdfUrl || '', bankValidated: !!u.bankValidated,
      companyInfo: u.companyInfo || {},
      contract: { signed: !!(u.contract && u.contract.signed), signedBy: u.contract?.signedBy || '', signedFunction: u.contract?.signedFunction || '', signedAt: u.contract?.signedAt || null, validated: !!(u.contract && u.contract.validated) },
      onboardingValidated: !!u.onboardingValidated,
    },
  });
});

// === Onboarding (identique agence) : RIB + infos entreprise + signature contrat ===
router.post('/bank', async (req, res) => {
  const u = await User.findById(req.user.id);
  u.bankCountry = (req.body.country || 'FR').toUpperCase().trim();
  const fields = (req.body.fields && typeof req.body.fields === 'object') ? req.body.fields : {};
  const clean = {};
  for (const k of Object.keys(fields)) clean[k] = String(fields[k] || '').trim();
  u.bankData = clean;
  u.iban = (clean.iban || req.body.iban || '').replace(/\s+/g, '').toUpperCase().trim();
  u.bic = (clean.bic || clean.swift || req.body.bic || '').replace(/\s+/g, '').toUpperCase().trim();
  u.accountHolder = (req.body.accountHolder || clean.accountHolder || '').trim();
  u.bankValidated = false;
  await u.save();
  res.json({ ok: true, bankCountry: u.bankCountry, bankData: u.bankData, iban: u.iban, bic: u.bic, accountHolder: u.accountHolder, bankValidated: u.bankValidated });
});

router.post('/rib-pdf', async (req, res) => {
  try {
    const dataUrl = String(req.body.dataUrl || '');
    const m = dataUrl.match(/^data:application\/pdf;base64,(.+)$/);
    if (!m) return res.status(400).json({ ok: false, error: 'pdf_only' });
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > 6 * 1024 * 1024) return res.status(400).json({ ok: false, error: 'too_large' });
    const fs = await import('fs'); const path = await import('path'); const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const dir = path.join(__dirname, '../../uploads/trainer');
    fs.mkdirSync(dir, { recursive: true });
    const fname = `rib-${req.user.id}-${crypto.randomBytes(6).toString('hex')}.pdf`;
    fs.writeFileSync(path.join(dir, fname), buf);
    const u = await User.findById(req.user.id);
    u.ribPdfUrl = `/uploads/trainer/${fname}`;
    u.bankValidated = false;
    await u.save();
    res.json({ ok: true, ribPdfUrl: u.ribPdfUrl });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/company', async (req, res) => {
  const u = await User.findById(req.user.id);
  const b = req.body || {};
  u.companyInfo = {
    legalName: (b.legalName || '').trim(), regNumber: (b.regNumber || '').trim(), vatNumber: (b.vatNumber || '').trim(),
    address: (b.address || '').trim(), city: (b.city || '').trim(), postalCode: (b.postalCode || '').trim(), country: (b.country || '').trim(),
    repName: (b.repName || '').trim(), repFunction: (b.repFunction || '').trim(),
  };
  u.onboardingValidated = false;
  await u.save();
  res.json({ ok: true, companyInfo: u.companyInfo, onboardingValidated: u.onboardingValidated });
});

router.post('/contract/sign', async (req, res) => {
  const u = await User.findById(req.user.id);
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
  u.contract = {
    signed: true,
    signedBy: (req.body.signedBy || u.name || '').trim(),
    signedFunction: (req.body.signedFunction || 'Formateur').trim(),
    signedIp: ip, signedAt: new Date(), validated: false,
  };
  u.onboardingValidated = false;
  await u.save();
  res.json({ ok: true, contract: u.contract });
});

// Préférences de rappel (le formateur active/désactive ses rappels).
router.post('/reminder-prefs', async (req, res) => {
  const u = await User.findById(req.user.id);
  const b = req.body || {};
  const prev = u.reminderPrefs || {};
  const day = Number.isFinite(+b.weeklyDay) ? Math.min(6, Math.max(0, Math.round(+b.weeklyDay))) : (prev.weeklyDay != null ? prev.weeklyDay : 5);
  const hour = Number.isFinite(+b.weeklyHour) ? Math.min(23, Math.max(0, Math.round(+b.weeklyHour))) : (prev.weeklyHour != null ? prev.weeklyHour : 10);
  u.reminderPrefs = {
    course48: b.course48 !== false,
    course24: b.course24 !== false,
    course1: b.course1 !== false,
    weeklyAvailability: b.weeklyAvailability !== false,
    weeklyDay: day,
    weeklyHour: hour,
    weeklyLastSent: prev.weeklyLastSent, // préservé
  };
  await u.save();
  res.json({ ok: true, reminderPrefs: { course48: u.reminderPrefs.course48, course24: u.reminderPrefs.course24, course1: u.reminderPrefs.course1, weeklyAvailability: u.reminderPrefs.weeklyAvailability, weeklyDay: u.reminderPrefs.weeklyDay, weeklyHour: u.reminderPrefs.weeklyHour } });
});

// === Catalogue + formations rattachées ===
router.get('/catalog', async (req, res) => {
  const formations = await TrainingProgram.find({}).lean().catch(() => []);
  res.json({ ok: true, formations });
});
router.get('/my-formations', async (req, res) => {
  const u = await User.findById(req.user.id).select('trainerSkills').lean();
  const keys = u?.trainerSkills || [];
  const formations = keys.length ? await TrainingProgram.find({ program_id: { $in: keys } }).lean().catch(() => []) : [];
  res.json({ ok: true, formations });
});

// === Disponibilités (jours bloqués personnels) ===
router.get('/availability', async (req, res) => {
  const rows = await TrainerUnavailability.find({ trainerId: req.user.id }).sort({ day: 1 }).lean();
  res.json({ ok: true, days: rows.map((r) => ({ id: r._id, day: r.day, kind: r.kind || 'full', hours: r.hours || [], label: r.label || '' })) });
});
router.post('/availability', async (req, res) => {
  const day = String(req.body.day || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ ok: false, error: 'invalid_day' });
  const kind = ['full', 'am', 'pm', 'hours'].includes(req.body.kind) ? req.body.kind : 'full';
  // Créneaux 'HH:MM'-'HH:MM' valides uniquement, max 6 par jour.
  let hours = [];
  if (kind === 'hours' && Array.isArray(req.body.hours)) {
    hours = req.body.hours
      .filter((h) => h && /^\d{2}:\d{2}$/.test(h.from) && /^\d{2}:\d{2}$/.test(h.to) && h.from < h.to)
      .map((h) => ({ from: h.from, to: h.to }))
      .slice(0, 6);
  }
  const row = await TrainerUnavailability.findOneAndUpdate(
    { trainerId: req.user.id, day },
    { $set: { kind, hours, label: (req.body.label || '').trim() } },
    { upsert: true, new: true },
  );
  res.json({ ok: true, day: { id: row._id, day: row.day, kind: row.kind, hours: row.hours, label: row.label || '' } });
});
router.delete('/availability/:id', async (req, res) => {
  await TrainerUnavailability.deleteOne({ _id: req.params.id, trainerId: req.user.id });
  res.json({ ok: true });
});

// === Disponibilités RÉCURRENTES (jours de semaine + créneaux d'1h) === @author Rabah Ziane - 2026-06-19
// Sanitise des jours 0-6 (uniques) et des créneaux 'HH:MM'-'HH:MM' valides (from < to, max 8).
function sanitizeRecurring(body) {
  const days = Array.isArray(body.days)
    ? [...new Set(body.days.map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
    : [];
  const slots = Array.isArray(body.slots)
    ? body.slots
        .filter((s) => s && /^\d{2}:\d{2}$/.test(s.from) && /^\d{2}:\d{2}$/.test(s.to) && s.from < s.to)
        .map((s) => ({ from: s.from, to: s.to }))
        .slice(0, 8)
    : [];
  return { days, slots };
}
router.put('/recurring-availability', async (req, res) => {
  const recurringAvailability = sanitizeRecurring(req.body || {});
  await User.updateOne({ _id: req.user.id }, { $set: { recurringAvailability } });
  res.json({ ok: true, recurringAvailability });
});

// === Mes cours / sessions ===
router.get('/sessions', async (req, res) => {
  const sessions = await TrainerSession.find({ trainerId: req.user.id }).sort({ sessionStart: -1, createdAt: -1 }).lean();
  res.json({ ok: true, sessions });
});

// Le formateur déclare avoir créé le groupe WhatsApp (apprenants + responsable pédago).
router.post('/sessions/:id/whatsapp', async (req, res) => {
  const s = await TrainerSession.findOne({ _id: req.params.id, trainerId: req.user.id });
  if (!s) return res.status(404).json({ ok: false, error: 'not_found' });
  s.whatsappGroupCreated = req.body.created === false ? false : true;
  s.whatsappGroupLink = (req.body.link || '').trim() || s.whatsappGroupLink;
  if (s.whatsappGroupCreated && !s.whatsappCreatedAt) s.whatsappCreatedAt = new Date();
  await s.save();
  res.json({ ok: true, whatsappGroupCreated: s.whatsappGroupCreated, whatsappGroupLink: s.whatsappGroupLink });
});

// === Fonds : sessions réalisées (status='done') = encaissables ===
router.get('/funds', async (req, res) => {
  const sessions = await TrainerSession.find({ trainerId: req.user.id, status: { $in: ['done', 'encashRequested', 'paid'] } }).sort({ doneAt: -1 }).lean();
  const available = sessions.filter((s) => s.status === 'done').reduce((sum, s) => sum + (s.payAmount || 0), 0);
  const pending = sessions.filter((s) => s.status === 'encashRequested').reduce((sum, s) => sum + (s.payAmount || 0), 0);
  const paid = sessions.filter((s) => s.status === 'paid').reduce((sum, s) => sum + (s.payAmount || 0), 0);
  res.json({ ok: true, sessions, totals: { available, pending, paid } });
});

// Le formateur envoie un ordre d'encaissement (sa facture) pour une session réalisée.
router.post('/sessions/:id/encash', async (req, res) => {
  const me = await User.findById(req.user.id).lean();
  const s = await TrainerSession.findOne({ _id: req.params.id, trainerId: req.user.id });
  if (!s) return res.status(404).json({ ok: false, error: 'not_found' });
  if (s.status !== 'done') return res.status(400).json({ ok: false, error: 'not_available' });
  if (!s.invoiceNumber) s.invoiceNumber = 'TRF-' + new Date(s.doneAt || Date.now()).getFullYear() + '-' + String(s._id).slice(-5).toUpperCase();
  s.status = 'encashRequested';
  s.encashRequestedAt = new Date();
  await s.save();
  try {
    const to = process.env.ADMIN_EMAIL || 'contact@deliverydigital.fr';
    await getTransporter().sendMail({
      from: process.env.SMTP_USER, to,
      subject: `Ordre d'encaissement formateur ${s.invoiceNumber} - ${me.name}`,
      text: `Le formateur ${me.name} demande l'encaissement de sa prestation.\n\n`
        + `Facture : ${s.invoiceNumber}\nFormation : ${s.formationTitle || '-'}\nClient : ${s.clientName || '-'}\n`
        + `Heures : ${s.hours || 0} h × ${s.hourlyRate || 0} €/h = ${s.payAmount || 0} €\n`
        + `RIB : ${me.iban || '(non renseigné)'} ${me.bic || ''}\nTitulaire : ${me.accountHolder || me.name}\n\n`
        + `Validez le virement puis passez la session en "Payé" dans l'admin (Formateurs).`,
    });
  } catch (e) { /* email best effort */ }
  res.json({ ok: true, invoiceNumber: s.invoiceNumber, status: s.status });
});

// === Instructions (lecture) ===
router.get('/instructions', async (req, res) => {
  const rows = await TrainerInstruction.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean();
  res.json({ ok: true, instructions: rows.map((r) => ({ id: r._id, title: r.title, body: r.body, icon: r.icon })) });
});

export default router;
