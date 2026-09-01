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
import TrainerAvailability from '../models/TrainerAvailability.js';
import TrainerInstruction from '../models/TrainerInstruction.js';
import { materialsFolderFor } from '../lib/exercisesCatalog.js';

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

/**
 * Salle permanente du formateur : slug lisible tiré de son nom (valorise l'intervenant) +
 * clé d'animateur privée. Créées à la première ouverture de l'espace, puis figées : le lien
 * partagé aux apprenants ne doit jamais changer.
 * @author Rabah Ziane · 2026-07-20
 */
async function ensureVisioRoom(userId) {
  const u = await User.findById(userId).select('name visioRoomSlug visioHostKey');
  if (!u) return null;
  if (u.visioRoomSlug && u.visioHostKey) return { slug: u.visioRoomSlug, hostKey: u.visioHostKey };
  const base = String(u.name || 'formateur').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'formateur';
  let slug = u.visioRoomSlug || base;
  // Le slug doit rester unique ET faire au moins 8 caractères (contrainte de la signalisation).
  if (slug.length < 8) slug = `${slug}-formation`;
  for (let i = 0; i < 40; i++) {
    const taken = await User.findOne({ visioRoomSlug: slug, _id: { $ne: u._id } }).select('_id').lean();
    if (!taken) break;
    slug = `${base}-${crypto.randomBytes(2).toString('hex')}`;
  }
  u.visioRoomSlug = slug;
  u.visioHostKey = u.visioHostKey || crypto.randomBytes(16).toString('base64url');
  await u.save();
  return { slug: u.visioRoomSlug, hostKey: u.visioHostKey };
}

router.get('/profile', async (req, res) => {
  const visio = await ensureVisioRoom(req.user.id).catch(() => null);
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
      // Salle permanente : le lien public se partage aux apprenants, hostLink reste privé.
      visio: visio ? { slug: visio.slug, link: `${PUBLIC_BASE}/visio/${visio.slug}`, hostLink: `${PUBLIC_BASE}/visio/${visio.slug}?h=${visio.hostKey}` } : null,
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

/**
 * Numéro WhatsApp du formateur. Le responsable pédagogique crée le groupe des apprenants
 * et y ajoute le formateur avec CE numéro : il doit donc pouvoir le tenir à jour lui-même.
 * Ne touche pas onboardingValidated (simple coordonnée, pas une info contractuelle).
 * @author Rabah Ziane · 2026-07-20
 */
router.post('/phone', async (req, res) => {
  const phone = String((req.body && req.body.phone) || '').trim();
  if (phone && !/^[+0-9 ().-]{6,25}$/.test(phone)) return res.status(400).json({ ok: false, error: 'invalid_phone' });
  const u = await User.findById(req.user.id);
  if (!u) return res.status(404).json({ ok: false, error: 'not_found' });
  u.phone = phone;
  await u.save();
  res.json({ ok: true, phone: u.phone });
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

  /**
   * Accusé de signature envoyé au formateur (copie à Delivery Digital) : il garde une trace
   * datée de son engagement, et nous une preuve horodatée côté organisme.
   * @author Rabah Ziane · 2026-07-20
   */
  try {
    const ci = u.companyInfo || {};
    const when = new Date(u.contract.signedAt).toLocaleString('fr-FR');
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr',
      to: u.email,
      bcc: process.env.TRAINER_NOTIFY_TO || 'contact@deliverydigital.fr',
      subject: 'Votre contrat de prestation Delivery Digital est signé',
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:#1d1d1f;line-height:1.6">
        <p style="margin:0 0 12px">Bonjour ${u.name || ''},</p>
        <p style="margin:0 0 12px">Nous confirmons la <strong>signature électronique</strong> de votre contrat de prestation de formation.</p>
        <div style="background:#f5f5f7;border:1px solid #e5e5ea;border-radius:12px;padding:14px 16px;margin:0 0 16px">
          <p style="margin:0 0 4px"><strong>Signataire :</strong> ${u.contract.signedBy} (${u.contract.signedFunction})</p>
          <p style="margin:0 0 4px"><strong>Date et heure :</strong> ${when}</p>
          ${ci.legalName ? `<p style="margin:0 0 4px"><strong>Prestataire :</strong> ${ci.legalName}${ci.regNumber ? ` - SIRET ${ci.regNumber}` : ''}</p>` : ''}
          <p style="margin:0;font-size:12px;color:#86868b">Signature horodatée et tracée (IP ${u.contract.signedIp || 'non relevée'}).</p>
        </div>
        <p style="margin:0 0 16px">Vous pouvez le relire et le télécharger à tout moment depuis votre espace, onglet « Mon compte » : ouvrez le contrat puis cliquez sur « Télécharger / Imprimer ».</p>
        <a href="${PUBLIC_BASE}/formateur" style="display:inline-block;background:#0066CC;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px">Accéder à mon espace</a>
        <p style="font-size:12px;color:#86868b;margin:18px 0 0">Votre compte sera activé après validation de vos informations, de votre RIB et de ce contrat par Delivery Digital.</p>
      </div>`,
    });
  } catch (e) { /* email best effort : la signature reste enregistrée */ }

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

/**
 * Disponibilités déclarées par le formateur : il pose les jours où il PEUT intervenir.
 * Sans déclaration, aucun cours ne peut lui être assigné. @author Rabah Ziane · 2026-07-20
 */
router.get('/available-days', async (req, res) => {
  const rows = await TrainerAvailability.find({ trainerId: req.user.id }).sort({ day: 1 }).lean();
  res.json({ ok: true, days: rows.map((r) => ({ id: r._id, day: r.day, kind: r.kind || 'full', hours: r.hours || [], label: r.label || '' })) });
});
router.post('/available-days', async (req, res) => {
  const day = String(req.body.day || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ ok: false, error: 'bad_day' });
  const kind = ['full', 'am', 'pm', 'hours'].includes(req.body.kind) ? req.body.kind : 'full';
  const hours = kind === 'hours' && Array.isArray(req.body.hours)
    ? req.body.hours.filter((h) => h && HHMM.test(h.from) && HHMM.test(h.to) && h.from < h.to).map((h) => ({ from: h.from, to: h.to })).slice(0, 8)
    : [];
  if (kind === 'hours' && !hours.length) return res.status(400).json({ ok: false, error: 'no_hours' });
  const row = await TrainerAvailability.findOneAndUpdate(
    { trainerId: req.user.id, day },
    { trainerId: req.user.id, day, kind, hours },
    { upsert: true, new: true },
  );
  res.json({ ok: true, day: { id: row._id, day: row.day, kind: row.kind, hours: row.hours } });
});
router.delete('/available-days/:id', async (req, res) => {
  await TrainerAvailability.deleteOne({ _id: req.params.id, trainerId: req.user.id });
  res.json({ ok: true });
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

/**
 * Replanification par le FORMATEUR après échange avec le client : il l'appelle avant la
 * formation pour confirmer ou adapter les dates, et reporte ici les créneaux retenus.
 * Delivery Digital est informé par email à chaque changement (avant / après + motif).
 * @author Rabah Ziane · 2026-07-20
 */
const HHMM = /^\d{2}:\d{2}$/;
const fmtSlot = (d) => `${new Date(`${d.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${d.from} - ${d.to}`;
router.post('/sessions/:id/reschedule', async (req, res) => {
  const s = await TrainerSession.findOne({ _id: req.params.id, trainerId: req.user.id });
  if (!s) return res.status(404).json({ ok: false, error: 'not_found' });
  if (['done', 'encashRequested', 'paid', 'cancelled'].includes(s.status)) return res.status(400).json({ ok: false, error: 'session_closed' });

  const days = (Array.isArray(req.body.days) ? req.body.days : [])
    .filter((d) => d && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && HHMM.test(d.from) && HHMM.test(d.to) && d.from < d.to)
    .map((d) => ({ date: d.date, from: d.from, to: d.to, mode: ['visio', 'presentiel', 'afest'].includes(d.mode) ? d.mode : 'visio' }))
    .sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from))
    .slice(0, 60);
  if (!days.length) return res.status(400).json({ ok: false, error: 'no_slots' });
  const reason = String(req.body.reason || '').trim().slice(0, 500);

  const before = (s.days || []).map((d) => ({ date: d.date, from: d.from, to: d.to, mode: d.mode }));
  const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  s.days = days;
  s.scheduledHours = Math.round(days.reduce((n, d) => n + (mins(d.to) - mins(d.from)) / 60, 0) * 100) / 100;
  s.sessionStart = new Date(`${days[0].date}T${days[0].from}:00`);
  s.sessionEnd = new Date(`${days[days.length - 1].date}T${days[days.length - 1].to}:00`);
  s.reschedules.push({ at: new Date(), by: req.user.name || '', reason, before, after: days });
  // Les rappels déjà envoyés portaient sur les anciennes dates : on les réarme.
  s.reminders = { h48: false, h24: false, h1: false };
  await s.save();

  // Information à Delivery Digital (best effort : la replanification reste enregistrée).
  try {
    const rows = (list) => list.length ? list.map((d) => `<li style="margin:0 0 3px">${fmtSlot(d)}</li>`).join('') : '<li style="margin:0;color:#86868b">aucun créneau</li>';
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr',
      to: process.env.TRAINER_NOTIFY_TO || 'contact@deliverydigital.fr',
      replyTo: req.user.email,
      subject: `Dates modifiées par le formateur - ${s.formationTitle || 'Formation'} (${s.clientName || 'client'})`,
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:#1d1d1f;line-height:1.6">
        <p style="margin:0 0 12px"><strong>${req.user.name || 'Un formateur'}</strong> a modifié les dates d'un cours après échange avec le client.</p>
        <p style="margin:0 0 4px"><strong>Formation :</strong> ${s.formationTitle || '-'}</p>
        <p style="margin:0 0 4px"><strong>Client :</strong> ${s.clientName || '-'}${s.clientContactName ? ` (${s.clientContactName})` : ''}</p>
        ${reason ? `<p style="margin:0 0 12px"><strong>Motif :</strong> ${reason}</p>` : ''}
        <p style="margin:12px 0 4px"><strong>Avant</strong></p><ul style="margin:0;padding-left:18px">${rows(before)}</ul>
        <p style="margin:12px 0 4px"><strong>Après</strong></p><ul style="margin:0;padding-left:18px">${rows(days)}</ul>
        <p style="margin:16px 0 0"><a href="${PUBLIC_BASE}/admin/trainers" style="color:#0066CC">Ouvrir l'admin formateurs</a></p>
      </div>`,
    });
  } catch (e) { /* email best effort */ }

  res.json({ ok: true, days: s.days, scheduledHours: s.scheduledHours });
});

/**
 * Supports pédagogiques du cours (diaporama, exercices, ressources) pris dans le coffre-fort
 * DD. On ne renvoie que des PDF du dossier de la formation, et on refuse toute sortie du
 * dossier : le nom demandé est comparé à la liste réellement présente, jamais concaténé
 * directement au chemin (pas de traversée de répertoire possible).
 * @author Rabah Ziane · 2026-07-20
 */
const VAULT = '/home/ubuntu/dd-files/02_Formation_OPCO';
async function materialsOf(session) {
  const folder = materialsFolderFor(session.formationKey, session.formationTitle);
  if (!folder) return { dir: null, files: [] };
  const fs = await import('fs');
  const path = await import('path');
  const dir = path.join(VAULT, folder);
  if (!fs.existsSync(dir)) return { dir: null, files: [] };
  // Les exercices sont déjà remis jour par jour dans la fiche du cours : les re-lister ici
  // ferait doublon et brouillerait le formateur. @Rabah 2026-07-20
  const files = fs.readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.pdf') && !f.includes('.bak-') && !/exercice/i.test(f))
    .map((f) => ({ name: f, size: fs.statSync(path.join(dir, f)).size }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { dir, files };
}

router.get('/sessions/:id/materials', async (req, res) => {
  const s = await TrainerSession.findOne({ _id: req.params.id, trainerId: req.user.id }).select('formationKey formationTitle').lean();
  if (!s) return res.status(404).json({ ok: false, error: 'not_found' });
  const { files } = await materialsOf(s);
  res.json({ ok: true, files: files.map((f) => ({ name: f.name, size: f.size })) });
});

router.get('/sessions/:id/materials/download', async (req, res) => {
  const s = await TrainerSession.findOne({ _id: req.params.id, trainerId: req.user.id }).select('formationKey formationTitle').lean();
  if (!s) return res.status(404).json({ ok: false, error: 'not_found' });
  const { dir, files } = await materialsOf(s);
  const wanted = String(req.query.name || '');
  // Le fichier doit figurer dans la liste autorisée : aucun chemin fourni par le client n'est utilisé.
  if (!dir || !files.some((f) => f.name === wanted)) return res.status(404).json({ ok: false, error: 'file_not_found' });
  const path = await import('path');
  res.sendFile(path.join(dir, wanted));
});

/**
 * Auto-évaluation de la formation par le formateur. Obligatoire pour clore le cours : tant
 * qu'elle n'est pas enregistrée, la dernière étape du déroulé ne peut pas être validée.
 * @author Rabah Ziane · 2026-07-20
 */
router.post('/sessions/:id/self-assessment', async (req, res) => {
  const s = await TrainerSession.findOne({ _id: req.params.id, trainerId: req.user.id });
  if (!s) return res.status(404).json({ ok: false, error: 'not_found' });
  const b = req.body || {};
  const pick = (v, allowed) => allowed.includes(v) ? v : allowed[0];
  const rating = Math.min(5, Math.max(1, Math.round(Number(b.rating) || 0)));
  if (!rating) return res.status(400).json({ ok: false, error: 'rating_required' });
  s.selfAssessment = {
    at: new Date(),
    objectivesMet: pick(b.objectivesMet, ['oui', 'partiellement', 'non']),
    groupLevel: pick(b.groupLevel, ['homogene', 'heterogene']),
    attendance: pick(b.attendance, ['complete', 'partielle']),
    difficulties: String(b.difficulties || '').slice(0, 2000),
    improvements: String(b.improvements || '').slice(0, 2000),
    rating,
  };
  await s.save();
  res.json({ ok: true, selfAssessment: s.selfAssessment });
});

/**
 * Le formateur coche (ou décoche) une étape du déroulé pour ce cours. L'avancement est
 * conservé par cours : il se remet à zéro pour chaque nouvelle session.
 * @author Rabah Ziane · 2026-07-20
 */
router.post('/sessions/:id/step', async (req, res) => {
  const s = await TrainerSession.findOne({ _id: req.params.id, trainerId: req.user.id });
  if (!s) return res.status(404).json({ ok: false, error: 'not_found' });
  const instructionId = String(req.body.instructionId || '').slice(0, 64);
  if (!instructionId) return res.status(400).json({ ok: false, error: 'bad_step' });
  const done = req.body.done !== false;
  // Dernière étape : impossible de clore sans avoir enregistré son auto-évaluation.
  if (done && instructionId === 'autoeval' && !s.selfAssessment?.at) {
    return res.status(400).json({ ok: false, error: 'self_assessment_required' });
  }
  const already = (s.stepsDone || []).some((x) => x.instructionId === instructionId);
  if (done && !already) s.stepsDone.push({ instructionId, at: new Date() });
  if (!done && already) s.stepsDone = s.stepsDone.filter((x) => x.instructionId !== instructionId);
  // Fin du déroulé : on horodate et on prévient Delivery Digital, qui marque le cours réalisé
  // (c'est ce passage en « réalisé » qui rend les fonds encaissables côté formateur).
  if (done && instructionId === 'autoeval' && !s.trainerCompletedAt) {
    s.trainerCompletedAt = new Date();
    const a = s.selfAssessment || {};
    try {
      await getTransporter().sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr',
        to: process.env.TRAINER_NOTIFY_TO || 'contact@deliverydigital.fr',
        replyTo: req.user.email,
        subject: `Formation terminée - ${s.formationTitle || 'Formation'} (${s.clientName || 'client'})`,
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:#1d1d1f;line-height:1.6">
          <p style="margin:0 0 12px"><strong>${req.user.name || 'Le formateur'}</strong> a terminé toutes les étapes de son cours.</p>
          <p style="margin:0 0 4px"><strong>Formation :</strong> ${s.formationTitle || '-'}</p>
          <p style="margin:0 0 4px"><strong>Client :</strong> ${s.clientName || '-'}</p>
          <p style="margin:0 0 12px"><strong>Heures encadrées :</strong> ${s.scheduledHours || s.hours || 0} h</p>
          <p style="margin:0 0 4px"><strong>Auto-évaluation :</strong> objectifs ${a.objectivesMet || '-'}, groupe ${a.groupLevel || '-'}, assiduité ${a.attendance || '-'}, note ${a.rating || '-'}/5</p>
          ${a.difficulties ? `<p style="margin:0 0 4px"><strong>Difficultés :</strong> ${a.difficulties}</p>` : ''}
          ${a.improvements ? `<p style="margin:0 0 4px"><strong>Améliorations :</strong> ${a.improvements}</p>` : ''}
          <p style="margin:16px 0 0">Marquez le cours <strong>réalisé</strong> dans l'admin pour libérer ses fonds : <a href="${PUBLIC_BASE}/admin/trainers" style="color:#0066CC">Admin formateurs</a></p>
        </div>`,
      });
    } catch (e) { /* email best effort */ }
  }
  await s.save();
  res.json({ ok: true, stepsDone: s.stepsDone, trainerCompletedAt: s.trainerCompletedAt });
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
  res.json({ ok: true, instructions: rows.map((r) => ({ id: r._id, title: r.title, body: r.body, icon: r.icon, docs: r.docs || [] })) });
});

export default router;
