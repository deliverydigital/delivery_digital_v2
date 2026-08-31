/**
 * Gestion des comptes AGENCE partenaire (superadmin via x-admin-secret).
 *   GET  /api/admin/agencies        - liste des agences
 *   POST /api/admin/agencies        - cree une agence { email, name, phone? }
 *                                     -> User role 'agence' + mot de passe + cle API
 *   POST /api/admin/agencies/:id/api-key - regenere la cle API
 * Les agences se connectent via /api/auth/login (JWT) et accedent a /agence.
 * @author Rabah Ziane - 2026-06-02
 */
import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import multer from 'multer';
import { User, TrainingProgram } from '../models/index.js';
import AgencyDossier from '../models/AgencyDossier.js';
import AgencyPaymentOrder from '../models/AgencyPaymentOrder.js';
import FormationCertificate from '../models/FormationCertificate.js';
import AgencyLead from '../models/AgencyLead.js';
import FormationUnavailability from '../models/FormationUnavailability.js';
import ConventionSignRequest from '../models/ConventionSignRequest.js';
import { encryptField, decryptField } from '../models/AccessRequest.js';
import { sendTaskNotif } from '../lib/taskNotif.js';

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
// En-tete commun des emails DD : logo original sur fond blanc + filet bleu de marque.
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
// Email de bienvenue agence : pour ACTIVER le compte, l'agence doit completer son profil
// (infos entreprise + RIB + signature du contrat), validé ensuite par Delivery Digital.
// Sert a la fois pour l'apercu (avant envoi) et l'envoi reel. @author Rabah Ziane - 2026-06-04
function welcomeEmail({ name, email, password, apiKey }) {
  const subject = 'Activez votre espace partenaire Delivery Digital';
  const step = (n, t) => `<tr><td style="vertical-align:top;padding:0 10px 10px 0"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:${DD_BLUE};color:#fff;border-radius:999px;font-size:12px;font-weight:700">${n}</span></td><td style="vertical-align:top;padding:0 0 10px;font-size:14px;color:#3a3a3c;line-height:1.5">${t}</td></tr>`;
  const inner = `
    <p style="font-size:15px;color:#1d1d1f;margin:0 0 14px">Bonjour ${esc(name)},</p>
    <p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 18px">Bienvenue parmi les partenaires Delivery Digital. Pour <strong>activer votre compte</strong> et commencer à monter les dossiers de formation financés par les OPCO de vos clients, connectez-vous à votre espace et complétez les 3 étapes suivantes :</p>
    <table style="border-collapse:collapse;margin:0 0 18px">
      ${step(1, "Renseignez les <strong>informations de votre entreprise</strong> (raison sociale, SIRET, adresse, représentant légal).")}
      ${step(2, "Ajoutez votre <strong>RIB</strong> (le justificatif PDF est obligatoire) pour le versement de vos commissions.")}
      ${step(3, "Lisez et <strong>signez le contrat de partenariat</strong> en ligne (votre tampon est généré automatiquement).")}
    </table>
    <p style="font-size:13px;color:#3a3a3c;line-height:1.6;margin:0 0 18px">Votre compte sera <strong>activé après validation</strong> de ces éléments par Delivery Digital.</p>
    <div style="background:#f5f5f7;border:1px solid #e5e5ea;border-radius:12px;padding:16px 18px;margin:0 0 18px">
      <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#86868b;font-weight:700">Vos identifiants de connexion</p>
      <p style="margin:0 0 4px;font-size:14px;color:#1d1d1f">Email : <strong>${esc(email)}</strong></p>
      ${password
        ? `<p style="margin:0 0 4px;font-size:14px;color:#1d1d1f">Mot de passe : <strong style="font-family:ui-monospace,monospace">${esc(password)}</strong></p>`
        : `<p style="margin:0 0 4px;font-size:13.5px;color:#3a3a3c">Connectez-vous avec le <strong>mot de passe qui vous a été communiqué</strong> (inchangé).</p>`}
      ${apiKey ? `<p style="margin:0;font-size:13px;color:#1d1d1f">Clé API : <span style="font-family:ui-monospace,monospace;font-size:12px">${esc(apiKey)}</span></p>` : ''}
    </div>
    <a href="${PUBLIC_BASE}/agence" style="display:inline-block;background:${DD_BLUE};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px">${password ? 'Activer mon compte' : 'Accéder à mon espace'}</a>
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
function genApiKey() {
  return 'dd_agc_' + crypto.randomBytes(24).toString('hex');
}

router.get('/', requireAdmin, async (req, res) => {
  try {
    const list = await User.find({ role: 'agence' })
      .select('email name phone status apiKey commissionFix commissionPercent createdAt last_login iban bic accountHolder bankCountry bankData ribPdfUrl bankValidated companyInfo contract onboardingValidated')
      .sort({ createdAt: -1 }).lean();
    res.json({ agencies: list });
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
    const apiKey = genApiKey();
    // password_hash recoit le plaintext : le pre-save du modele User le hash en bcrypt.
    const user = await User.create({
      email, name, phone: (req.body.phone || '').trim() || undefined,
      role: 'agence', status: 'active', email_verified: true,
      password_hash: password, agencyPwEnc: encryptField(password), apiKey,
      commissionFix: req.body.commissionFix != null ? Number(req.body.commissionFix) : 120,
      commissionPercent: req.body.commissionPercent != null ? Number(req.body.commissionPercent) : 15,
    });
    // Apercu de l'email de bienvenue (affiche cote admin pour validation avant envoi).
    const preview = welcomeEmail({ name, email, password, apiKey });
    res.json({ agency: { id: user._id, email, name }, password, apiKey, emailPreview: { to: email, subject: preview.subject, html: preview.html } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// RENVOYER LES ACCÈS (apercu) - NE CHANGE PAS le mot de passe. L'email rappelle l'identifiant
// + le lien de connexion ; l'agence garde son mot de passe actuel. @author Rabah Ziane - 2026-06-06
router.post('/:id/welcome-preview', requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'agence' }).select('email name apiKey agencyPwEnc').lean();
    if (!user) return res.status(404).json({ error: 'not_found' });
    // Mot de passe ACTUEL (déchiffré) si disponible -> affiché tel quel, SANS le changer.
    let current = '';
    try { if (user.agencyPwEnc) current = decryptField(user.agencyPwEnc); } catch { current = ''; }
    const preview = welcomeEmail({ name: user.name, email: user.email, password: current, apiKey: user.apiKey });
    res.json({ ok: true, agency: { id: user._id, email: user.email, name: user.name, apiKey: user.apiKey }, regenerated: false, hasPassword: !!current, emailPreview: { to: user.email, subject: preview.subject, html: preview.html } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// RÉGÉNÉRER LE MOT DE PASSE (apercu) - génère ET enregistre un nouveau mot de passe, et le
// montre/envoie. C'est la SEULE action qui change le mot de passe. @author Rabah Ziane - 2026-06-06
router.post('/:id/regenerate-preview', requireAdmin, async (req, res) => {
  try {
    const doc = await User.findOne({ _id: req.params.id, role: 'agence' });
    if (!doc) return res.status(404).json({ error: 'not_found' });
    const password = genPassword(12);
    doc.password_hash = password; // le pre-save hash en bcrypt
    doc.agencyPwEnc = encryptField(password); // copie chiffrée pour réaffichage ultérieur
    await doc.save();
    const preview = welcomeEmail({ name: doc.name, email: doc.email, password, apiKey: doc.apiKey });
    res.json({ ok: true, agency: { id: doc._id, email: doc.email, name: doc.name, apiKey: doc.apiKey }, regenerated: true, password, emailPreview: { to: doc.email, subject: preview.subject, html: preview.html } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Envoi (apres validation de l'apercu) de l'email. Avec mot de passe si régénération (password
// fourni), sinon simple renvoi des accès sans mot de passe. Ne modifie PAS la base. @Rabah 2026-06-06
router.post('/:id/send-welcome', requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'agence' }).select('email name apiKey agencyPwEnc').lean();
    if (!user) return res.status(404).json({ error: 'not_found' });
    // Régénération : password fourni. Sinon (renvoi) : on réaffiche le mot de passe actuel déchiffré.
    let password = (req.body.password || '').trim();
    if (!password && user.agencyPwEnc) { try { password = decryptField(user.agencyPwEnc); } catch { password = ''; } }
    const { subject, html } = welcomeEmail({ name: user.name, email: user.email, password, apiKey: user.apiKey });
    await getTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to: user.email, bcc: 'contact@deliverydigital.fr', subject, html });
    res.json({ ok: true, sentTo: user.email });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Dossiers OPCO transmis par les agences (recus cote DD) + commission a verser + RIB.
router.get('/dossiers', requireAdmin, async (req, res) => {
  const dossiers = await AgencyDossier.find({ hidden: { $ne: true } }).sort({ createdAt: -1 }).lean();
  // Tâches portées par le client (lead) : on les rattache au dossier pour l'affichage/édition admin. @Rabah 2026-07-02
  const leadIds = [...new Set(dossiers.map((d) => d.leadId && String(d.leadId)).filter(Boolean))];
  const leadDocs = await AgencyLead.find({ _id: { $in: leadIds } }).select('tasks').lean();
  const leadTasks = {}; leadDocs.forEach((l) => { leadTasks[String(l._id)] = l.tasks || []; });
  const ids = [...new Set(dossiers.map((d) => String(d.agencyId)))];
  const agencies = await User.find({ _id: { $in: ids } }).select('name iban bic accountHolder commissionFix commissionPercent').lean();
  const am = {};
  agencies.forEach((a) => { am[String(a._id)] = a; });
  // Le fixe (120 €) n'est du qu'UNE FOIS par client et par an (par agence) : il s'applique
  // au 1er dossier d'un client dans l'annee ; les suivants ne touchent que le %.
  // @author Rabah Ziane - 2026-06-02
  // Le fixe ne s'applique qu'aux dossiers rattachés à une agence (les dossiers DDN-direct n'ont pas de commission). @Rabah 2026-06-21
  const sortedAsc = [...dossiers].filter((d) => d.agencyId).sort((x, y) => new Date(x.createdAt || 0) - new Date(y.createdAt || 0));
  const seenClientYear = new Set();
  const fixDossierIds = new Set();
  sortedAsc.forEach((d) => {
    const year = new Date(d.createdAt || Date.now()).getFullYear();
    const key = `${String(d.agencyId)}_${String(d.leadId || d._id)}_${year}`;
    if (!seenClientYear.has(key)) { seenClientYear.add(key); fixDossierIds.add(String(d._id)); }
  });
  const out = dossiers.map((d) => {
    // Dossier monté en direct par DDN (sans agence) : aucune commission à verser.
    const dTasks = d.leadId ? (leadTasks[String(d.leadId)] || []) : (d.tasks || []);
    if (!d.agencyId) return { ...d, tasks: dTasks, commission: 0, commissionFixApplied: false, agencyIban: '', agencyBic: '', agencyHolder: '' };
    const a = am[String(d.agencyId)] || {};
    const fix = a.commissionFix != null ? a.commissionFix : 120;
    const pct = a.commissionPercent != null ? a.commissionPercent : 15;
    const appliedFix = fixDossierIds.has(String(d._id)) ? fix : 0;
    // Base du % : montant ATTRIBUÉ par l'OPCO s'il est saisi, sinon montant estimé. @Rabah 2026-07-29
    const base = d.amountOpco && d.amountOpco > 0 ? d.amountOpco : (d.amountHT || 0);
    const pctAmount = Math.round((pct / 100) * base);
    // On expose le détail fixe / % + montants estimé/OPCO pour la section "Ordres de paiement".
    return { ...d, tasks: dTasks, commission: Math.round(appliedFix + pctAmount), commissionFixApplied: appliedFix > 0, commissionFixAmount: appliedFix, commissionPctAmount: pctAmount, commissionBase: base, paymentOrders: d.paymentOrders || [], agencyIban: a.iban || '', agencyBic: a.bic || '', agencyHolder: a.accountHolder || '' };
  });
  res.json({ ok: true, dossiers: out });
});

// Chiffres globaux des agences (KPIs superadmin) : agences, commerciaux, clients, dossiers,
// volume facturé, stagiaires, commissions dues / versées. @author Rabah Ziane - 2026-06-06
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [agencies, commerciaux, clients] = await Promise.all([
      User.countDocuments({ role: 'agence' }),
      User.countDocuments({ role: 'agence_commercial' }),
      AgencyLead.countDocuments({}),
    ]);
    const dossiers = await AgencyDossier.find({ hidden: { $ne: true } }).select('status amountHT salaries createdAt agencyId leadId').lean();
    const ids = [...new Set(dossiers.map((d) => String(d.agencyId)))];
    const ags = await User.find({ _id: { $in: ids } }).select('commissionFix commissionPercent').lean();
    const am = {}; ags.forEach((a) => { am[String(a._id)] = a; });
    // Fixe (120 €) compté une seule fois par client et par an (cf GET /dossiers).
    const sortedAsc = [...dossiers].filter((d) => d.agencyId).sort((x, y) => new Date(x.createdAt || 0) - new Date(y.createdAt || 0));
    const seen = new Set(), fixIds = new Set();
    sortedAsc.forEach((d) => { const y = new Date(d.createdAt || Date.now()).getFullYear(); const k = `${d.agencyId}_${d.leadId || d._id}_${y}`; if (!seen.has(k)) { seen.add(k); fixIds.add(String(d._id)); } });
    let volumeHT = 0, stagiaires = 0, due = 0, paid = 0, transmitted = 0;
    for (const d of dossiers) {
      // Dossier DDN-direct (sans agence) : pas de commission. @Rabah 2026-06-21
      const a = d.agencyId ? (am[String(d.agencyId)] || {}) : null;
      const fix = a && a.commissionFix != null ? a.commissionFix : 120;
      const pct = a && a.commissionPercent != null ? a.commissionPercent : 15;
      const baseStat = d.amountOpco && d.amountOpco > 0 ? d.amountOpco : (d.amountHT || 0);
      const commission = !a ? 0 : Math.round((fixIds.has(String(d._id)) ? fix : 0) + (pct / 100) * baseStat);
      volumeHT += d.amountHT || 0;
      stagiaires += (d.salaries || []).length;
      if (d.status === 'paid') paid += commission; else due += commission;
      if (d.status === 'transmitted') transmitted++;
    }
    res.json({ ok: true, agencies, commerciaux, clients, dossiers: dossiers.length, transmitted, volumeHT, stagiaires, commissionsDue: due, commissionsPaid: paid });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Liste détaillée des commerciaux (sous-comptes) avec leur agence + nb de dossiers.
router.get('/commerciaux', requireAdmin, async (req, res) => {
  try {
    const us = await User.find({ role: 'agence_commercial' }).select('name email parentAgencyId status last_login createdAt').sort({ createdAt: -1 }).lean();
    const parents = await User.find({ _id: { $in: [...new Set(us.map((u) => String(u.parentAgencyId)).filter(Boolean))] } }).select('name').lean();
    const pm = {}; parents.forEach((p) => { pm[String(p._id)] = p.name; });
    const doss = await AgencyDossier.find({}).select('commercialId').lean();
    const cnt = {}; doss.forEach((d) => { if (d.commercialId) { const k = String(d.commercialId); cnt[k] = (cnt[k] || 0) + 1; } });
    res.json({ ok: true, commerciaux: us.map((u) => ({ id: u._id, name: u.name, email: u.email, agence: pm[String(u.parentAgencyId)] || '-', status: u.status, dossiers: cnt[String(u._id)] || 0, last_login: u.last_login })) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Liste détaillée des clients (leads) : agence, commercial, OPCO, statut.
router.get('/clients', requireAdmin, async (req, res) => {
  try {
    const leads = await AgencyLead.find({ hidden: { $ne: true } }).select('denom email accountantEmail managerEmail opco siret agencyId agencyName commercialName status createdAt formationDoneThisYear').sort({ createdAt: -1 }).limit(1000).lean();
    const ag = await User.find({ _id: { $in: [...new Set(leads.map((l) => String(l.agencyId)).filter(Boolean))] } }).select('name').lean();
    const am = {}; ag.forEach((a) => { am[String(a._id)] = a.name; });
    res.json({ ok: true, clients: leads.map((l) => ({ id: l._id, denom: l.denom, email: l.email, accountantEmail: l.accountantEmail || '', managerEmail: l.managerEmail || '', opco: l.opco, siret: l.siret, agence: am[String(l.agencyId)] || l.agencyName || '-', commercial: l.commercialName || '', status: l.status, createdAt: l.createdAt, formationDoneThisYear: !!l.formationDoneThisYear })) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Modification d'un client (lead) côté superadmin : nom + emails (principal/comptable/gérant)
// + SIRET + OPCO. Permet de corriger une adresse e-mail avant l'envoi de la convention.
// @author Rabah Ziane - 2026-06-18
router.patch('/clients/:id', requireAdmin, async (req, res) => {
  try {
    const lead = await AgencyLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ ok: false, error: 'not_found' });
    if (typeof req.body.denom === 'string' && req.body.denom.trim()) lead.denom = req.body.denom.trim();
    if (typeof req.body.email === 'string') lead.email = req.body.email.trim().toLowerCase() || undefined;
    if (typeof req.body.accountantEmail === 'string') lead.accountantEmail = req.body.accountantEmail.trim().toLowerCase() || undefined;
    if (typeof req.body.managerEmail === 'string') lead.managerEmail = req.body.managerEmail.trim().toLowerCase() || undefined;
    if (typeof req.body.siret === 'string') lead.siret = req.body.siret.replace(/\s/g, '').trim() || undefined;
    if (typeof req.body.opco === 'string') lead.opco = req.body.opco.trim() || undefined;
    // Toggle badge budget OPCO (1 clic) + masquage soft du client (jamais de suppression dure). @Rabah 2026-07-02
    if ('formationDoneThisYear' in req.body) lead.formationDoneThisYear = req.body.formationDoneThisYear === true || req.body.formationDoneThisYear === 'true';
    if (typeof req.body.hidden === 'boolean') lead.hidden = req.body.hidden;
    await lead.save();
    res.json({ ok: true, client: { id: lead._id, denom: lead.denom, email: lead.email, accountantEmail: lead.accountantEmail || '', managerEmail: lead.managerEmail || '', opco: lead.opco, siret: lead.siret, formationDoneThisYear: !!lead.formationDoneThisYear, hidden: !!lead.hidden } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Compteur d'actions en attente (pour la pastille du menu admin) : nouveaux dossiers a
// traiter (transmis) + ordres d'encaissement recus non payes. @author Rabah Ziane - 2026-06-04
router.get('/pending-count', requireAdmin, async (req, res) => {
  try {
    const dossiers = await AgencyDossier.find({ hidden: { $ne: true } }).select('status encashRequestedAt').lean();
    const newDossiers = dossiers.filter((d) => d.status === 'transmitted').length;
    const encash = dossiers.filter((d) => d.encashRequestedAt && d.status !== 'paid').length;
    // Dossiers montés par DDN en attente de validation client. @Rabah 2026-06-21
    const pendingValidation = await ConventionSignRequest.countDocuments({ mountedByAdmin: true, status: 'pending' });
    res.json({ ok: true, count: newDossiers + encash + pendingValidation, newDossiers, encash, pendingValidation });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// === Indisponibilités des sessions de formation (superadmin) ===
router.get('/unavailabilities', requireAdmin, async (req, res) => {
  const rows = await FormationUnavailability.find({}).sort({ day: 1 }).lean();
  res.json({ ok: true, days: rows.map((r) => ({ id: r._id, day: r.day, label: r.label || '' })) });
});
router.post('/unavailabilities', requireAdmin, async (req, res) => {
  const day = String(req.body.day || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ ok: false, error: 'invalid_day' });
  const row = await FormationUnavailability.findOneAndUpdate({ day }, { $set: { label: (req.body.label || '').trim() } }, { upsert: true, new: true });
  res.json({ ok: true, day: { id: row._id, day: row.day, label: row.label || '' } });
});
router.delete('/unavailabilities/:id', requireAdmin, async (req, res) => {
  await FormationUnavailability.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

// Marquer (ou annuler) qu'un dossier est REGLE PAR L'OPCO -> fonds disponibles pour l'agence.
router.post('/dossiers/:id/opco-paid', requireAdmin, async (req, res) => {
  const ok = req.body.opcoPaid === false ? false : true;
  const d = await AgencyDossier.findById(req.params.id);
  if (!d) return res.status(404).json({ error: 'not_found' });
  d.opcoPaid = ok;
  d.opcoPaidAt = ok ? new Date() : null;
  if (!ok) d.encashRequestedAt = null;
  await d.save();
  res.json({ ok: true, opcoPaid: d.opcoPaid });
});

// Ordres de paiement : enregistrer un versement/avance d'une part de commission (fixe et/ou %).
// Ne modifie PAS le contrat ni le calcul de commission : trace seulement ce qui a été versé.
// Corps : { parts: [{ part:'fixe'|'pourcentage', montant, note }] } ou { part, montant, note }.
// `avance` est déduit automatiquement (true si l'OPCO n'a pas encore payé). @Rabah 2026-07-29
router.post('/dossiers/:id/payment-order', requireAdmin, async (req, res) => {
  const d = await AgencyDossier.findById(req.params.id);
  if (!d) return res.status(404).json({ error: 'not_found' });
  const parts = Array.isArray(req.body.parts) ? req.body.parts : [req.body];
  const ajoutes = [];
  for (const p of parts) {
    if (!['fixe', 'pourcentage'].includes(p && p.part)) continue;
    const po = {
      part: p.part,
      montant: Math.max(0, Math.round(Number(p.montant) || 0)),
      avance: !d.opcoPaid,                 // versé avant le paiement OPCO = avance
      note: String(p.note || '').trim().slice(0, 300),
      createdBy: 'ddn',
    };
    d.paymentOrders.push(po);
    ajoutes.push(po);
  }
  if (!ajoutes.length) return res.status(400).json({ error: 'no_valid_part' });
  await d.save();
  res.json({ ok: true, paymentOrders: d.paymentOrders });
});

// Annuler un ordre de paiement.
router.delete('/dossiers/:id/payment-order/:poId', requireAdmin, async (req, res) => {
  const d = await AgencyDossier.findById(req.params.id);
  if (!d) return res.status(404).json({ error: 'not_found' });
  d.paymentOrders = (d.paymentOrders || []).filter((p) => String(p._id) !== req.params.poId);
  await d.save();
  res.json({ ok: true, paymentOrders: d.paymentOrders });
});

// ---- Ordres de paiement (ordre de virement) : montant OPCO + génération PDF + email ----
const __dirnameAA = path.dirname(fileURLToPath(import.meta.url));
const PO_DIR = path.join(__dirnameAA, '../../uploads/payment-orders');
function poTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({ host: process.env.SMTP_HOST || 'ssl0.ovh.net', port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}
const eurPO = (n) => (Math.round(n || 0)).toLocaleString('fr-FR') + ' €';
const MOIS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const moisLabel = (ym) => { const [y, m] = String(ym || '').split('-'); const i = parseInt(m, 10) - 1; return i >= 0 && i < 12 ? `${MOIS_FR[i]} ${y}` : (ym || '—'); };
const LOGO_DD = path.join(__dirnameAA, '../../public/logo-delivery-digital.png');
// Format € propre (évite l'espace fine insécable mal rendue par pdfkit : "1 575 €"). @Rabah 2026-07-29
const eur2 = (n) => (Math.round(n || 0)).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €';
function buildPaymentOrderPdf({ ref, agencyName, iban, lines, total }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = []; doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    const W = doc.page.width, L = 50, R = W - 50, cw = R - L;
    // En-tête : logo noir à gauche, titre bleu à droite, filet bleu.
    try { doc.image(LOGO_DD, L, 40, { height: 30 }); } catch (e) { doc.fillColor('#111').font('Helvetica-Bold').fontSize(15).text('DELIVERY DIGITAL', L, 44); }
    doc.fillColor('#0066CC').font('Helvetica-Bold').fontSize(18).text('ORDRE DE PAIEMENT', L, 40, { width: cw, align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor('#888').text(`Réf. ${ref}  ·  ${new Date().toLocaleDateString('fr-FR')}`, L, 62, { width: cw, align: 'right' });
    doc.save().moveTo(L, 88).lineTo(R, 88).lineWidth(1.5).strokeColor('#0066CC').stroke().restore();
    // Bénéficiaire
    let y = 112;
    doc.font('Helvetica').fontSize(8.5).fillColor('#999').text('BÉNÉFICIAIRE', L, y);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#111').text(agencyName || '', L, y + 12);
    if (iban) doc.font('Helvetica').fontSize(10).fillColor('#555').text(`IBAN ${iban}`, L, y + 31);
    doc.font('Helvetica').fontSize(8.5).fillColor('#aaa').text('Émis par Delivery Digital', L, y + (iban ? 47 : 33));
    y += iban ? 76 : 62;
    // Tableau par mois
    const byMonth = {}; lines.forEach((l) => { (byMonth[l.month] = byMonth[l.month] || []).push(l); });
    Object.keys(byMonth).sort().forEach((ym) => {
      doc.save().rect(L, y, cw, 20).fill('#F3F4F6').restore();
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#555555').text(moisLabel(ym), L + 8, y + 5.5);
      y += 26;
      byMonth[ym].forEach((l) => {
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#111').text(l.denom, L + 8, y, { width: 330 });
        const detail = `estimé ${eur2(l.amountEstimated)} - OPCO ${l.amountOpco ? eur2(l.amountOpco) : '-'} - fixe ${eur2(l.commissionFix)}${l.commissionPct ? ` + % ${eur2(l.commissionPct)}` : ''}`;
        doc.font('Helvetica').fontSize(8.5).fillColor('#888').text(detail, L + 8, y + 14, { width: 360 });
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#111111').text(eur2(l.total), R - 110, y + 4, { width: 110, align: 'right' });
        y += 32;
        doc.save().moveTo(L, y - 5).lineTo(R, y - 5).lineWidth(0.5).strokeColor('#eeeeee').stroke().restore();
      });
      y += 6;
    });
    // Total (encadré) + pied de page en flux juste dessous (évite toute page blanche).
    y += 8;
    doc.save().roundedRect(R - 250, y, 250, 42, 7).fill('#0066CC').restore();
    doc.font('Helvetica').fontSize(10).fillColor('#cfe0ff').text('TOTAL À VERSER', R - 236, y + 9);
    doc.font('Helvetica-Bold').fontSize(19).fillColor('#ffffff').text(eur2(total), R - 236, y + 6, { width: 224, align: 'right' });
    doc.font('Helvetica').fontSize(8).fillColor('#b0b0b0').text('Delivery Digital - Organisme de formation certifié QUALIOPI - contact@deliverydigital.fr', L, y + 60, { width: cw, align: 'center' });
    doc.end();
  });
}

// Montant ATTRIBUÉ par l'OPCO (recalcule la commission côté serveur au prochain chargement).
router.patch('/dossiers/:id/amount-opco', requireAdmin, async (req, res) => {
  const d = await AgencyDossier.findById(req.params.id);
  if (!d) return res.status(404).json({ error: 'not_found' });
  d.amountOpco = Math.max(0, Math.round(Number(req.body.amountOpco) || 0));
  await d.save();
  res.json({ ok: true, amountOpco: d.amountOpco });
});

// Générer un ordre de paiement pour 1..n dossiers d'une même agence : PDF stocké + email à
// Delivery Digital (copie agence en option). @Rabah 2026-07-29
router.post('/payment-orders/generate', requireAdmin, async (req, res) => {
  const ids = Array.isArray(req.body.dossierIds) ? req.body.dossierIds : [];
  const ccAgency = req.body.ccAgency === true;
  if (!ids.length) return res.status(400).json({ error: 'no_dossiers' });
  const dossiers = await AgencyDossier.find({ _id: { $in: ids }, agencyId: { $ne: null } }).lean();
  if (!dossiers.length) return res.status(400).json({ error: 'no_valid_dossiers' });
  const agencyId = String(dossiers[0].agencyId);
  if (dossiers.some((d) => String(d.agencyId) !== agencyId)) return res.status(400).json({ error: 'mixed_agencies' });
  const ag = await User.findById(agencyId).select('name email iban commissionFix commissionPercent').lean();
  const fix = ag && ag.commissionFix != null ? ag.commissionFix : 120;
  const pct = ag && ag.commissionPercent != null ? ag.commissionPercent : 15;
  // L'ordre de virement porte sur ce qui est RÉELLEMENT versé = la somme des avances/versements
  // enregistrés (paymentOrders) sur chaque dossier, pas la commission théorique. @Rabah 2026-07-29
  const lines = dossiers.map((d) => {
    const poFixe = (d.paymentOrders || []).filter((p) => p.part === 'fixe').reduce((a, p) => a + (p.montant || 0), 0);
    const poPct = (d.paymentOrders || []).filter((p) => p.part === 'pourcentage').reduce((a, p) => a + (p.montant || 0), 0);
    const month = new Date(d.sessionStart || d.createdAt || Date.now()).toISOString().slice(0, 7);
    return { dossierId: d._id, denom: d.denom || 'Client', month, amountEstimated: d.amountHT || 0, amountOpco: d.amountOpco || 0, commissionFix: poFixe, commissionPct: poPct, total: poFixe + poPct };
  }).filter((l) => l.total > 0);
  if (!lines.length) return res.status(400).json({ error: 'no_payments', message: "Aucun versement enregistré sur les dossiers sélectionnés. Enregistrez d'abord une avance (fixe / %) avant de générer l'ordre." });
  const total = lines.reduce((s, l) => s + l.total, 0);
  const year = new Date().getFullYear();
  const count = await AgencyPaymentOrder.countDocuments({ ref: new RegExp(`^OP-${year}-`) });
  const ref = `OP-${year}-${String(count + 1).padStart(4, '0')}`;
  fs.mkdirSync(PO_DIR, { recursive: true });
  const pdf = await buildPaymentOrderPdf({ ref, agencyName: ag ? ag.name : 'Agence', iban: ag && ag.iban, lines, total });
  const filename = `${ref}.pdf`;
  fs.writeFileSync(path.join(PO_DIR, filename), pdf);
  const pdfUrl = `/uploads/payment-orders/${filename}`;
  const order = await AgencyPaymentOrder.create({ ref, agencyId, agencyName: ag ? ag.name : '', agencyEmail: ag ? ag.email : '', lines, totalCommission: total, pdfPath: `uploads/payment-orders/${filename}`, pdfUrl, ccAgency });
  let sent = false;
  try {
    const to = process.env.SMTP_FROM || 'contact@deliverydigital.fr';
    const rows = lines.map((l) => `<tr><td style="padding:4px 8px">${moisLabel(l.month)}</td><td style="padding:4px 8px">${l.denom}</td><td style="padding:4px 8px;text-align:right">${eurPO(l.commissionFix)} + ${eurPO(l.commissionPct)} = <b>${eurPO(l.total)}</b></td></tr>`).join('');
    await poTransporter().sendMail({
      from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to,
      cc: ccAgency && ag && ag.email ? ag.email : undefined, replyTo: 'contact@deliverydigital.fr',
      subject: `Ordre de paiement ${ref} - ${ag ? ag.name : 'agence'} - ${eurPO(total)}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111"><h2 style="color:#0066CC">Ordre de paiement ${ref}</h2><p>Bénéficiaire : <b>${ag ? ag.name : ''}</b>${ag && ag.iban ? ` · IBAN ${ag.iban}` : ''}</p><table style="border-collapse:collapse;font-size:13px">${rows}</table><p style="font-size:16px"><b>Total à verser : ${eurPO(total)}</b></p><p style="color:#888;font-size:12px">PDF joint. Généré depuis l'espace admin Delivery Digital.</p></div>`,
      attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
    });
    sent = true; order.sentTo = to; order.sentAt = new Date(); await order.save();
  } catch (e) { /* email best-effort : l'ordre reste enregistré + PDF dispo */ }
  res.json({ ok: true, order, sent });
});

// Liste des ordres de paiement générés (admin).
router.get('/payment-orders', requireAdmin, async (req, res) => {
  const orders = await AgencyPaymentOrder.find({}).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ ok: true, orders });
});

// L'admin confirme (ou annule) que le virement à l'agence a été effectué. @Rabah 2026-07-29
router.post('/payment-orders/:id/paid', requireAdmin, async (req, res) => {
  const o = await AgencyPaymentOrder.findById(req.params.id);
  if (!o) return res.status(404).json({ error: 'not_found' });
  o.paidAt = req.body.paid === false ? null : new Date();
  await o.save();
  res.json({ ok: true, paidAt: o.paidAt });
});

// Régénère le PDF d'un ordre existant avec le design courant (met à jour le fichier en place, même
// URL). Sans :id -> régénère TOUS les ordres. @Rabah 2026-07-30
router.post('/payment-orders/regenerate-pdf/:id?', requireAdmin, async (req, res) => {
  const q = req.params.id ? { _id: req.params.id } : {};
  const orders = await AgencyPaymentOrder.find(q);
  fs.mkdirSync(PO_DIR, { recursive: true });
  let n = 0;
  for (const o of orders) {
    const ag = await User.findById(o.agencyId).select('iban').lean();
    const pdf = await buildPaymentOrderPdf({ ref: o.ref, agencyName: o.agencyName, iban: (ag && ag.iban) || '', lines: o.lines, total: o.totalCommission });
    fs.writeFileSync(path.join(PO_DIR, `${o.ref}.pdf`), pdf);
    n++;
  }
  res.json({ ok: true, regenerated: n });
});

// ---- Attestations de fin de formation (réussite + vitrophanie) avec QR de vérification ----
const ATT_DIR = path.join(__dirnameAA, '../../uploads/attestations');
const QUALIOPI_LOGO = path.join(__dirnameAA, '../../public/LogoQualiopi-300dpi-Avec Marianne (1).png');
const jourFr = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

function buildAttestationPdf({ denom, formationTitle, trainees, dates, city, qrBuffer, verifyUrl }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks = []; doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    doc.save().lineWidth(2).strokeColor('#0066CC').rect(28, 28, doc.page.width - 56, doc.page.height - 56).stroke().restore();
    doc.save().lineWidth(0.7).strokeColor('#C9A227').rect(36, 36, doc.page.width - 72, doc.page.height - 72).stroke().restore();
    try { doc.image(LOGO_DD, doc.page.width / 2 - 62, 60, { width: 124 }); } catch (e) { doc.font('Helvetica-Bold').fontSize(16).fillColor('#111').text('DELIVERY DIGITAL', 0, 70, { align: 'center' }); }
    doc.y = 118;
    doc.font('Helvetica').fontSize(9.5).fillColor('#C9A227').text('ORGANISME DE FORMATION CERTIFIÉ QUALIOPI', { align: 'center', characterSpacing: 1.2 });
    doc.moveDown(0.6).fontSize(26).fillColor('#111').font('Helvetica-Bold').text('ATTESTATION DE RÉUSSITE', { align: 'center' });
    doc.moveDown(1.5).font('Helvetica').fontSize(12).fillColor('#333').text('Delivery Digital atteste que les salariés de', { align: 'center' });
    doc.moveDown(0.3).fontSize(16).fillColor('#0066CC').font('Helvetica-Bold').text(denom || 'l’établissement', { align: 'center' });
    doc.moveDown(0.8).font('Helvetica').fontSize(12).fillColor('#333').text('ont suivi avec succès la formation :', { align: 'center' });
    doc.moveDown(0.3).fontSize(14).fillColor('#111').font('Helvetica-Bold').text(formationTitle || '', { align: 'center' });
    if (dates) doc.moveDown(0.4).font('Helvetica').fontSize(12).fillColor('#333').text(dates, { align: 'center' });
    doc.moveDown(1).fontSize(11).fillColor('#111').font('Helvetica-Bold').text('Salariés formés :', { align: 'center' });
    doc.font('Helvetica').fontSize(12).fillColor('#333');
    (trainees || []).forEach((t) => doc.text([t.firstname, t.lastname].filter(Boolean).join(' ') || 'Salarié', { align: 'center' }));
    doc.moveDown(1.5).fontSize(10).fillColor('#666').text(`Fait à ${city || 'Nice'}, le ${jourFr(new Date())}`, { align: 'center' });
    doc.moveDown(0.3).fontSize(9).fillColor('#888').text('Formation certifiée QUALIOPI · Millésime 2026', { align: 'center' });
    const qy = doc.page.height - 156;
    try { doc.image(QUALIOPI_LOGO, 78, qy + 2, { height: 66 }); } catch (e) { /* logo QUALIOPI absent */ }
    doc.image(qrBuffer, doc.page.width - 158, qy, { width: 76 });
    doc.fontSize(8).fillColor('#888').text('Vérifiez cette formation', doc.page.width - 200, qy + 80, { width: 160, align: 'center' });
    doc.fontSize(6.5).fillColor('#bbb').text(verifyUrl, doc.page.width - 220, qy + 92, { width: 200, align: 'center' });
    doc.end();
  });
}
function buildVitrophaniePdf({ denom, qrBuffer, verifyUrl }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const chunks = []; doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    doc.save().rect(0, 0, doc.page.width, doc.page.height).fill('#F3EBD8').restore();
    doc.fillColor('#1B5E20').font('Helvetica-Bold').fontSize(22).text('RESTAURANT', 0, 46, { align: 'center' });
    doc.fontSize(22).text('ENGAGÉ & FORMÉ', { align: 'center' });
    doc.moveDown(0.6).fillColor('#333').font('Helvetica-Bold').fontSize(12).text('HYGIÈNE · SÉCURITÉ · DÉVELOPPEMENT DURABLE', { align: 'center' });
    doc.moveDown(0.8).font('Helvetica').fontSize(10).fillColor('#444').text('Cet établissement a formé ses équipes aux bonnes pratiques en hygiène, sécurité alimentaire et développement durable.', { align: 'center' });
    if (denom) doc.moveDown(0.5).font('Helvetica-Bold').fontSize(11).fillColor('#1B5E20').text(denom, { align: 'center' });
    doc.moveDown(0.8).image(qrBuffer, doc.page.width / 2 - 42, doc.y, { width: 84 });
    doc.moveDown(6.2);
    try { doc.image(LOGO_DD, doc.page.width / 2 - 40, doc.y, { width: 80 }); doc.moveDown(2.1); } catch (e) { /* logo absent */ }
    doc.fontSize(9).fillColor('#555').text('Formation validée 2026 par Delivery Digital', { align: 'center' });
    doc.fontSize(6.5).fillColor('#999').text(verifyUrl, { align: 'center' });
    doc.end();
  });
}

// Génère (aperçu) et/ou envoie au client les attestations de fin de formation. Corps :
// { presentIdx?: number[], clientEmail?, send?: bool }. Absents exclus, aucune mention "modèle".
router.post('/dossiers/:id/attestations', requireAdmin, async (req, res) => {
  const d = await AgencyDossier.findById(req.params.id).lean();
  if (!d) return res.status(404).json({ error: 'not_found' });
  const all = d.salaries || [];
  const idx = Array.isArray(req.body.presentIdx) ? req.body.presentIdx : all.map((_, i) => i);
  const trainees = all.filter((_, i) => idx.includes(i)).map((s) => ({ firstname: s.firstname, lastname: s.lastname }));
  const send = req.body.send === true;
  const clientEmail = (req.body.clientEmail || d.clientEmail || '').trim();
  const city = (d.addr || '').split(',').pop().trim() || 'Nice';
  let cert = await FormationCertificate.findOne({ dossierId: d._id });
  if (!cert) cert = new FormationCertificate({ dossierId: d._id, token: crypto.randomBytes(9).toString('hex') });
  cert.denom = d.denom; cert.formationTitle = d.formationTitle; cert.sessionStart = d.sessionStart; cert.sessionEnd = d.sessionEnd;
  cert.city = city; cert.trainerName = d.trainerName || 'Delivery Digital'; cert.trainees = trainees; cert.clientEmail = clientEmail;
  const verifyUrl = `https://deliverydigital.fr/api/verify/${cert.token}`;
  const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 240, margin: 1 });
  const dates = d.sessionStart ? (d.sessionEnd && jourFr(d.sessionEnd) !== jourFr(d.sessionStart) ? `du ${jourFr(d.sessionStart)} au ${jourFr(d.sessionEnd)}` : `le ${jourFr(d.sessionStart)}`) : '';
  const attPdf = await buildAttestationPdf({ denom: d.denom, formationTitle: d.formationTitle, trainees, dates, city, qrBuffer, verifyUrl });
  const vitPdf = await buildVitrophaniePdf({ denom: d.denom, qrBuffer, verifyUrl });
  fs.mkdirSync(ATT_DIR, { recursive: true });
  const attFile = `attestation-${cert.token}.pdf`, vitFile = `vitrophanie-${cert.token}.pdf`;
  fs.writeFileSync(path.join(ATT_DIR, attFile), attPdf);
  fs.writeFileSync(path.join(ATT_DIR, vitFile), vitPdf);
  cert.attestationUrl = `/uploads/attestations/${attFile}`;
  cert.vitrophanieUrl = `/uploads/attestations/${vitFile}`;
  let sent = false;
  if (send && clientEmail) {
    try {
      await poTransporter().sendMail({
        from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to: clientEmail,
        bcc: 'contact@deliverydigital.fr', replyTo: 'contact@deliverydigital.fr',
        subject: `Vos attestations de formation - ${d.denom || ''}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111"><p>Bonjour,</p><p>Félicitations, votre formation <b>${d.formationTitle || ''}</b> ${dates} est terminée.</p><p>Vous trouverez en pièces jointes :</p><ul><li>votre <b>attestation de réussite</b> (à imprimer et afficher) ;</li><li>votre <b>vitrophanie « Restaurant engagé & formé »</b> à coller sur votre vitrine.</li></ul><p>Chaque document porte un <b>QR code de vérification</b> officiel : <a href="${verifyUrl}">${verifyUrl}</a></p><p>Bien cordialement,<br>Delivery Digital</p></div>`,
        attachments: [{ filename: 'Attestation-reussite.pdf', content: attPdf, contentType: 'application/pdf' }, { filename: 'Vitrophanie-restaurant-forme.pdf', content: vitPdf, contentType: 'application/pdf' }],
      });
      sent = true; cert.sentToClientAt = new Date();
    } catch (e) { /* email best-effort */ }
  }
  await cert.save();
  res.json({ ok: true, sent, token: cert.token, verifyUrl, attestationUrl: cert.attestationUrl, vitrophanieUrl: cert.vitrophanieUrl, sentToClientAt: cert.sentToClientAt });
});

// Prévisualiser l'espace agence en tant que super admin : émet un JWT agence court (2h) qui
// permet d'ouvrir /agence#preview=<token> et de voir le tableau de bord tel que l'agence le voit.
// Même payload { userId } que le login agence (vérifié par le middleware authenticate).
// @author Rabah Ziane - 2026-06-24
router.post('/:id/impersonate', requireAdmin, async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, role: 'agence' }).select('_id name email').lean();
  if (!u) return res.status(404).json({ error: 'not_found' });
  const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
  const token = jwt.sign({ userId: String(u._id) }, secret, { expiresIn: '12h' });
  res.json({ ok: true, token, agency: { id: u._id, name: u.name, email: u.email } });
});

// Étape "Montage OPCO" (super admin) : DD a fait le rattachement OPCO du client (ex. AKTO ->
// courrier d'activation envoyé) et/ou le dossier attend le CSV des salariés. L'agence le voit
// en lecture seule dans son suivi. @author Rabah Ziane - 2026-06-24
router.post('/dossiers/:id/montage', requireAdmin, async (req, res) => {
  const d = await AgencyDossier.findById(req.params.id);
  if (!d) return res.status(404).json({ error: 'not_found' });
  if (req.body.aktoAttached != null) {
    d.aktoAttached = !!req.body.aktoAttached;
    d.aktoAttachedAt = d.aktoAttached ? new Date() : null;
  }
  if (req.body.salariesPending != null) d.salariesPending = !!req.body.salariesPending;
  await d.save();
  res.json({ ok: true, aktoAttached: d.aktoAttached, aktoAttachedAt: d.aktoAttachedAt, salariesPending: d.salariesPending });
});

// Catalogue complet des formations (base TrainingProgram) pour le menu déroulant de la
// convention côté admin. @author Rabah Ziane - 2026-07-17
router.get('/formations', requireAdmin, async (req, res) => {
  try {
    const progs = await TrainingProgram.find({}).select('program_id title price duration_hours is_active').sort({ title: 1 }).lean();
    res.json({ formations: progs.map((p) => ({ id: p.program_id, title: p.title, price: p.price || 0, hours: p.duration_hours || 0, active: p.is_active !== false })) });
  } catch (e) { res.json({ formations: [] }); }
});

// Édition des champs de convention par le superadmin : MONTANT HT (prix/stagiaire) + FORMATEUR.
// Le montant est répercuté sur la convention signée liée (sans toucher à la signature) pour que
// le PDF téléchargé reste cohérent. @author Rabah Ziane - 2026-07-17
router.post('/dossiers/:id/convention-fields', requireAdmin, async (req, res) => {
  const d = await AgencyDossier.findById(req.params.id);
  if (!d) return res.status(404).json({ error: 'not_found' });
  if (req.body.amountHT != null && !Number.isNaN(Number(req.body.amountHT))) d.amountHT = Math.max(0, Math.round(Number(req.body.amountHT)));
  if (req.body.trainerName != null) d.trainerName = String(req.body.trainerName).trim().slice(0, 120);
  if (req.body.trainerEmail != null) d.trainerEmail = String(req.body.trainerEmail).trim().slice(0, 160);
  if (req.body.formationTitle != null) d.formationTitle = String(req.body.formationTitle).trim().slice(0, 200);
  await d.save();
  try {
    await ConventionSignRequest.updateMany(
      { $or: [{ dossierId: d._id }, { editDossierId: d._id }], status: 'signed' },
      { $set: { amountHT: d.amountHT, formationTitle: d.formationTitle } },
    );
  } catch (e) { /* best effort : la source de vérité reste le dossier (lu par printConvention) */ }
  res.json({ ok: true, amountHT: d.amountHT, trainerName: d.trainerName || '', trainerEmail: d.trainerEmail || '', formationTitle: d.formationTitle || '' });
});

// Marquer un ou plusieurs dossiers comme PAYES (commission versee a l'agence).
router.post('/dossiers/pay', requireAdmin, async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (!ids.length) return res.status(400).json({ error: 'ids_required' });
  const r = await AgencyDossier.updateMany({ _id: { $in: ids } }, { status: 'paid' });
  res.json({ ok: true, updated: r.modifiedCount });
});
// MAJ du statut d'un dossier (pipeline jusqu'au paiement) cote admin DD.
router.patch('/dossiers/:id', requireAdmin, async (req, res) => {
  const allowed = ['transmitted', 'instruction', 'accepted', 'scheduled', 'completed', 'invoiced', 'paid', 'rejected'];
  const status = req.body.status;
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid_status' });
  const d = await AgencyDossier.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!d) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, dossier: d });
});

// Valider le compte bancaire d'une agence (RIB + PDF verifies par le superadmin).
router.post('/:id/validate-bank', requireAdmin, async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role !== 'agence') return res.status(404).json({ error: 'not_found' });
  u.bankValidated = req.body.validated === false ? false : true;
  await u.save();
  res.json({ ok: true, bankValidated: u.bankValidated });
});
// Valider l'onboarding complet (infos entreprise + contrat signe + RIB).
router.post('/:id/validate-onboarding', requireAdmin, async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role !== 'agence') return res.status(404).json({ error: 'not_found' });
  const ok = req.body.validated === false ? false : true;
  u.onboardingValidated = ok;
  if (u.contract) u.contract.validated = ok;
  if (ok) u.bankValidated = true;
  await u.save();
  res.json({ ok: true, onboardingValidated: u.onboardingValidated, bankValidated: u.bankValidated });
});

router.post('/:id/api-key', requireAdmin, async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u || u.role !== 'agence') return res.status(404).json({ error: 'not_found' });
    u.apiKey = genApiKey();
    await u.save();
    res.json({ apiKey: u.apiKey });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Suppression DOUCE d'un dossier (superadmin) : hidden=true, pas de DELETE en base (réversible).
// @author Rabah Ziane - 2026-06-09
router.delete('/dossiers/:id', requireAdmin, async (req, res) => {
  const d = await AgencyDossier.findByIdAndUpdate(req.params.id, { hidden: true }, { new: true });
  if (!d) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

/* ===================== Dossiers montés par DDN (super admin) =====================
 * Certains clients ne veulent pas confier leurs accès OPCO. DDN monte alors le dossier
 * depuis l'admin et envoie au client un lien sécurisé pour qu'il VALIDE (lise + signe la
 * convention au doigt). À la signature, le dossier OPCO est créé (réutilise conventionSign).
 * Agence optionnelle : si fournie, la commission s'applique ; sinon dossier 100% DDN.
 * @author Rabah Ziane · 2026-06-21 */

// Envoi au client du lien de validation/signature d'un dossier monté par DDN.
function clientSignEmail({ recipient, link, denom }) {
  return {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to: recipient, bcc: 'contact@deliverydigital.fr',
    subject: `Validez votre convention de formation - ${denom}`,
    html: emailShell(`<p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 16px">Bonjour,<br><br>Delivery Digital a préparé votre <strong>convention de formation professionnelle</strong>. Pour finaliser votre dossier de financement, il vous suffit de la <strong>lire et de la valider</strong> en la signant au doigt depuis votre téléphone, en quelques secondes.</p>
      <a href="${link}" style="display:inline-block;background:${DD_BLUE};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:999px">Lire et valider ma convention</a>
      <p style="font-size:12px;color:#86868b;margin:18px 0 0">Lien sécurisé, valable 30 jours. Signature électronique de même valeur juridique qu'une signature manuscrite (Code civil, art. 1367).</p>`),
  };
}

router.post('/dossiers/mount', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const managerEmail = (b.managerEmail || '').trim().toLowerCase();
    const recipient = managerEmail || (b.clientEmail || '').trim().toLowerCase();
    if (!recipient) return res.status(400).json({ ok: false, error: 'client_email_required' });
    if (!b.denom) return res.status(400).json({ ok: false, error: 'denom_required' });
    const salaries = Array.isArray(b.salaries) ? b.salaries.filter((s) => s && s.firstname && s.lastname) : [];
    if (salaries.length === 0) return res.status(400).json({ ok: false, error: 'salaries_required' });
    // Agence optionnelle : si fournie, on récupère son nom pour l'affichage.
    let agencyId, agencyName;
    if (b.agencyId) {
      const ag = await User.findOne({ _id: b.agencyId, role: 'agence' }).select('name').lean();
      if (!ag) return res.status(400).json({ ok: false, error: 'invalid_agency' });
      agencyId = ag._id; agencyName = ag.name;
    }
    const token = crypto.randomBytes(24).toString('hex');
    await ConventionSignRequest.create({
      token, mountedByAdmin: true, agencyId, agencyName,
      leadId: b.leadId || undefined, editDossierId: b.dossierId || undefined,
      denom: b.denom, siret: b.siret, opco: b.opco, addr: b.addr,
      clientEmail: (b.clientEmail || '').trim().toLowerCase() || undefined, managerEmail: managerEmail || undefined,
      formationTitle: b.formationTitle, sessionName: b.sessionName,
      sessionStart: b.startAt ? new Date(b.startAt) : undefined, sessionEnd: b.endAt ? new Date(b.endAt) : undefined,
      salaries, amountHT: b.amountHT != null ? Math.round(Number(b.amountHT)) : 525 * salaries.length, status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });
    const link = `${PUBLIC_BASE}/signer/${token}`;
    let emailSent = false;
    if (!b.noEmail) { try { await getTransporter().sendMail(clientSignEmail({ recipient, link, denom: b.denom })); emailSent = true; } catch { /* best effort */ } }
    res.json({ ok: true, link, emailSent, recipient });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Demandes de validation client EN ATTENTE (montées par DDN, pas encore signées).
router.get('/sign-requests', requireAdmin, async (req, res) => {
  const rows = await ConventionSignRequest.find({ mountedByAdmin: true, status: 'pending' }).sort({ createdAt: -1 }).limit(500).lean();
  const out = rows.map((r) => ({
    id: r._id, token: r.token, denom: r.denom, siret: r.siret, opco: r.opco,
    clientEmail: r.clientEmail || '', managerEmail: r.managerEmail || '', recipient: r.managerEmail || r.clientEmail || '',
    agencyName: r.agencyName || '', formationTitle: r.formationTitle, sessionName: r.sessionName,
    salaries: (r.salaries || []).length, amountHT: r.amountHT,
    link: `${PUBLIC_BASE}/signer/${r.token}`, createdAt: r.createdAt, expiresAt: r.expiresAt,
    expired: r.expiresAt && new Date(r.expiresAt).getTime() < Date.now(),
  }));
  res.json({ ok: true, requests: out });
});

// Relancer (renvoyer) le lien de validation au client.
router.post('/sign-requests/:id/resend', requireAdmin, async (req, res) => {
  const r = await ConventionSignRequest.findById(req.params.id);
  if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
  if (r.status !== 'pending') return res.status(409).json({ ok: false, error: 'not_pending' });
  const recipient = r.managerEmail || r.clientEmail;
  if (!recipient) return res.status(400).json({ ok: false, error: 'no_recipient' });
  const link = `${PUBLIC_BASE}/signer/${r.token}`;
  try { await getTransporter().sendMail(clientSignEmail({ recipient, link, denom: r.denom })); } catch (e) { return res.status(500).json({ ok: false, error: 'send_failed' }); }
  res.json({ ok: true, sentTo: recipient });
});

// Annuler une demande de validation en attente.
router.post('/sign-requests/:id/cancel', requireAdmin, async (req, res) => {
  const r = await ConventionSignRequest.findById(req.params.id);
  if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
  r.status = 'cancelled';
  await r.save();
  res.json({ ok: true });
});

// ── Tâches collaboratives (côté DDN) : portées par le CLIENT (lead) si le dossier y est lié,
// sinon par le dossier lui-même (cas DDN-direct sans lead). Sync avec l'agence. @Rabah 2026-07-02
async function taskTarget(dossierId) {
  const d = await AgencyDossier.findById(dossierId);
  if (!d) return null;
  if (d.leadId) { const l = await AgencyLead.findById(d.leadId); if (l) return l; }
  return d;
}
router.post('/dossiers/:id/tasks', requireAdmin, async (req, res) => {
  const tgt = await taskTarget(req.params.id);
  if (!tgt) return res.status(404).json({ ok: false, error: 'not_found' });
  const b = req.body || {};
  if (!b.label || !String(b.label).trim()) return res.status(400).json({ ok: false, error: 'label_required' });
  const ivName = (b.intervenantName || '').trim();
  const ivEmail = (b.intervenantEmail || '').trim().toLowerCase();
  tgt.tasks.push({ step: b.step || 'transmis', assignedTo: b.assignedTo === 'ddn' ? 'ddn' : 'agence', label: String(b.label).trim(), comment: (b.comment || '').trim(), createdBy: 'ddn', done: false, intervenantName: ivName || undefined, intervenantEmail: ivEmail || undefined });
  await tgt.save();
  if (b.notify && ivEmail) { try { await sendTaskNotif({ to: ivEmail, name: ivName, denom: tgt.denom, label: String(b.label).trim(), step: b.step, comment: (b.comment || '').trim() }); } catch (e) { /* best effort */ } }
  res.json({ ok: true, tasks: tgt.tasks });
});
router.patch('/dossiers/:id/tasks/:taskId', requireAdmin, async (req, res) => {
  const tgt = await taskTarget(req.params.id);
  if (!tgt) return res.status(404).json({ ok: false, error: 'not_found' });
  const t = tgt.tasks.id(req.params.taskId);
  if (!t) return res.status(404).json({ ok: false, error: 'task_not_found' });
  const b = req.body || {};
  if ('done' in b) { t.done = !!b.done; t.doneBy = b.done ? 'ddn' : undefined; t.doneAt = b.done ? new Date() : undefined; }
  if (typeof b.comment === 'string') t.comment = b.comment.trim();
  if (typeof b.label === 'string' && b.label.trim()) t.label = b.label.trim();
  if (b.assignedTo) t.assignedTo = b.assignedTo === 'ddn' ? 'ddn' : 'agence';
  if (b.step) t.step = b.step;
  await tgt.save();
  res.json({ ok: true, tasks: tgt.tasks });
});
router.delete('/dossiers/:id/tasks/:taskId', requireAdmin, async (req, res) => {
  const tgt = await taskTarget(req.params.id);
  if (!tgt) return res.status(404).json({ ok: false, error: 'not_found' });
  tgt.tasks.pull(req.params.taskId);
  await tgt.save();
  res.json({ ok: true, tasks: tgt.tasks });
});

/* ----------------------------- Revente Pyemes (superadmin) -----------------------------
 * Relie une agence DD a son compte Pyemes (code + taux), reattribue un client, et donne la vue
 * globale des commissions. Appelle l'API Pyemes en serveur a serveur. @author Rabah Ziane - 2026-08-01 */
const PYEMES_API = process.env.PYEMES_API || 'https://pyemes.com/api/agence';
const PYEMES_SECRET = process.env.PYEMES_ADMIN_SECRET || '';
async function pyemes(pathUrl, { method = 'GET', body } = {}) {
  const r = await fetch(`${PYEMES_API}${pathUrl}`, {
    method, headers: { 'Content-Type': 'application/json', 'x-admin-secret': PYEMES_SECRET },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, j: await r.json().catch(() => ({})) };
}

// Relie une agence DD a Pyemes : cree/maj l'agence cote Pyemes (code + taux + nom) et enregistre
// le code sur le compte agence DD. { code, commission_percent }
router.post('/:id/pyemes', requireAdmin, async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role !== 'agence') return res.status(404).json({ error: 'agence_introuvable' });
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code_requis' });
  const percent = req.body?.commission_percent != null ? Number(req.body.commission_percent) : (u.commissionPercent || 15);
  const { status, j } = await pyemes('/agences', { method: 'POST', body: { code, nom: u.name, email: u.email, commission_percent: percent } });
  if (status !== 200 || !j.ok) return res.status(502).json({ error: 'pyemes_erreur', detail: j });
  u.pyemesCode = code;
  await u.save();
  res.json({ ok: true, pyemesCode: code, agence: j.agence });
});

// Vue globale : toutes les agences Pyemes + leurs taux.
router.get('/pyemes/agences', requireAdmin, async (_req, res) => {
  const { j } = await pyemes('/agences');
  res.json(j);
});

// Recap commissions d'une agence (par code).
router.get('/pyemes/agences/:code/commissions', requireAdmin, async (req, res) => {
  const { j } = await pyemes(`/agences/${encodeURIComponent(String(req.params.code).toUpperCase())}/commissions`);
  res.json(j);
});

// Reattribue un client Pyemes a une agence (cas inscrit par erreur). { cid, agence }
router.post('/pyemes/reassigner', requireAdmin, async (req, res) => {
  const cid = String(req.body?.cid || '').trim();
  const agence = String(req.body?.agence || '').trim().toUpperCase();
  if (!cid) return res.status(400).json({ error: 'cid_requis' });
  const { status, j } = await pyemes(`/comptes/${encodeURIComponent(cid)}/agence`, { method: 'POST', body: { agence } });
  if (status !== 200) return res.status(502).json({ error: 'pyemes_erreur', detail: j });
  res.json(j);
});

// Declenche le versement des commissions dues (sinon cron quotidien cote Pyemes).
router.post('/pyemes/verser', requireAdmin, async (req, res) => {
  const { j } = await pyemes('/verser-commissions', { method: 'POST', body: { code: req.body?.code } });
  res.json(j);
});

/* ─────────── FEUILLE DE ROUTE PYEMES - cote Delivery Digital ───────────
   Meme feuille de route que celle vue par l'agence (User.pyemesRoadmap / pyemesMessages) : ici DD
   ajoute ses demandes, coche l'avancement et repond dans le fil. Les routes cote agence sont dans
   agencySelf.js. @author Rabah Ziane - 2026-08-31 */

const vueRoadmapAdmin = (u) => ({
  taches: (u?.pyemesRoadmap || []).map((t) => ({
    id: String(t._id), from: t.from || 'dd', titre: t.titre || '', detail: t.detail || '',
    statut: t.statut || 'a_faire', source: t.source || '', createdAt: t.createdAt, doneAt: t.doneAt || null,
  })),
  messages: (u?.pyemesMessages || []).map((m) => ({
    id: String(m._id), from: m.from || 'dd', auteur: m.auteur || '', texte: m.texte || '', image: m.image || '', at: m.at,
  })),
});

router.get('/:id/pyemes/roadmap', requireAdmin, async (req, res) => {
  const u = await User.findById(req.params.id, { pyemesRoadmap: 1, pyemesMessages: 1 }).lean();
  if (!u) return res.status(404).json({ error: 'agence_introuvable' });
  res.json({ ok: true, ...vueRoadmapAdmin(u) });
});

router.post('/:id/pyemes/roadmap', requireAdmin, async (req, res) => {
  const titre = String(req.body?.titre || '').trim();
  if (!titre) return res.status(400).json({ error: 'titre_requis' });
  await User.updateOne({ _id: req.params.id }, { $push: { pyemesRoadmap: {
    from: 'dd', titre: titre.slice(0, 200), detail: String(req.body?.detail || '').trim().slice(0, 2000),
    statut: 'a_faire', source: 'manuel', createdAt: new Date(),
  } } });
  const u = await User.findById(req.params.id, { pyemesRoadmap: 1, pyemesMessages: 1 }).lean();
  res.json({ ok: true, ...vueRoadmapAdmin(u) });
});

router.patch('/:id/pyemes/roadmap/:tid', requireAdmin, async (req, res) => {
  const statut = String(req.body?.statut || '');
  if (!['a_faire', 'en_cours', 'fait'].includes(statut)) return res.status(400).json({ error: 'statut_invalide' });
  await User.updateOne(
    { _id: req.params.id, 'pyemesRoadmap._id': req.params.tid },
    { $set: { 'pyemesRoadmap.$.statut': statut, 'pyemesRoadmap.$.doneAt': statut === 'fait' ? new Date() : null } },
  );
  const u = await User.findById(req.params.id, { pyemesRoadmap: 1, pyemesMessages: 1 }).lean();
  res.json({ ok: true, ...vueRoadmapAdmin(u) });
});

// DD ne retire que SES lignes (une demande de l'agence reste visible des deux cotes).
router.delete('/:id/pyemes/roadmap/:tid', requireAdmin, async (req, res) => {
  await User.updateOne({ _id: req.params.id }, { $pull: { pyemesRoadmap: { _id: req.params.tid, from: 'dd' } } });
  const u = await User.findById(req.params.id, { pyemesRoadmap: 1, pyemesMessages: 1 }).lean();
  res.json({ ok: true, ...vueRoadmapAdmin(u) });
});

const chatUpDir = 'uploads/agency-chat';
const chatStorageAdmin = multer.diskStorage({
  destination: (req, file, cb) => { fs.mkdirSync(chatUpDir, { recursive: true }); cb(null, chatUpDir); },
  filename: (req, file, cb) => cb(null, `${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname || '.png')}`),
});
const chatUploadAdmin = multer({ storage: chatStorageAdmin, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)) });

router.post('/:id/pyemes/messages', requireAdmin, chatUploadAdmin.single('image'), async (req, res) => {
  const texte = String(req.body?.texte || '').trim();
  const image = req.file ? `/uploads/agency-chat/${req.file.filename}` : '';
  if (!texte && !image) return res.status(400).json({ error: 'message_vide' });
  await User.updateOne({ _id: req.params.id }, { $push: { pyemesMessages: {
    from: 'dd', auteur: 'Delivery Digital', texte: texte.slice(0, 4000), image, at: new Date(),
  } } });
  // On previent l'agence par email, comme sur l'espace client. Best-effort. @Rabah 2026-08-31
  try {
    const ag = await User.findById(req.params.id, { email: 1, name: 1 }).lean();
    if (ag?.email) {
      const html = `<p>Delivery Digital a écrit dans la feuille de route Pyemes :</p><p>${String(texte || '(capture jointe)').replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]))}</p><p><a href="https://deliverydigital.fr/agence">Ouvrir mon espace agence</a></p>`;
      await getTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to: ag.email, bcc: 'contact@deliverydigital.fr', subject: 'Feuille de route Pyemes - nouveau message', html });
    }
  } catch (e) { /* notif best-effort */ }
  const u = await User.findById(req.params.id, { pyemesRoadmap: 1, pyemesMessages: 1 }).lean();
  res.json({ ok: true, ...vueRoadmapAdmin(u) });
});

/* ── Validation des publications reseaux sociaux proposees par une agence ──
   L'agence depose la video + le texte ; ici on valide ou on demande une modif. La decision peut
   aussi venir de l'admin PYEMES en serveur a serveur (voir la route x-admin-secret plus bas).
   @author Rabah Ziane - 2026-08-31 */

const vuePubsAdmin = (u) => (u?.pyemesSocials || []).map((p) => ({
  id: String(p._id), fichier: p.fichier || '', nomFichier: p.nomFichier || '', taille: p.taille || 0,
  reseaux: p.reseaux || [], comptes: p.comptes || [], datePrevue: p.datePrevue || null, texte: p.texte || '',
  statut: p.statut || 'a_valider', retour: p.retour || '', decidePar: p.decidePar || '',
  decideLe: p.decideLe || null, createdAt: p.createdAt,
})).reverse();

router.get('/:id/pyemes/publications', requireAdmin, async (req, res) => {
  const u = await User.findById(req.params.id, { pyemesSocials: 1 }).lean();
  if (!u) return res.status(404).json({ error: 'agence_introuvable' });
  res.json({ ok: true, publications: vuePubsAdmin(u) });
});

async function deciderPublication({ agencyId, pid, statut, retour, par }) {
  if (!['validee', 'a_revoir'].includes(statut)) return { erreur: 'statut_invalide' };
  await User.updateOne(
    { _id: agencyId, 'pyemesSocials._id': pid },
    { $set: {
      'pyemesSocials.$.statut': statut,
      'pyemesSocials.$.retour': String(retour || '').slice(0, 2000),
      'pyemesSocials.$.decidePar': par,
      'pyemesSocials.$.decideLe': new Date(),
    } },
  );
  // On previent l'agence : sans ca elle attend sans savoir. Best-effort.
  try {
    const ag = await User.findById(agencyId, { email: 1, name: 1 }).lean();
    if (ag?.email) {
      const html = statut === 'validee'
        ? `<p>Votre publication est <b>validée</b> : vous pouvez la publier.</p><p><a href="https://deliverydigital.fr/agence">Voir dans mon espace</a></p>`
        : `<p>Votre publication demande une <b>modification</b> :</p><p>${String(retour || '').replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]))}</p><p><a href="https://deliverydigital.fr/agence">Voir dans mon espace</a></p>`;
      await getTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to: ag.email, bcc: 'contact@deliverydigital.fr', subject: statut === 'validee' ? 'Publication validée' : 'Publication à revoir', html });
    }
  } catch (e) { /* best-effort */ }
  return { ok: true };
}

router.patch('/:id/pyemes/publications/:pid', requireAdmin, async (req, res) => {
  const r = await deciderPublication({ agencyId: req.params.id, pid: req.params.pid, statut: String(req.body?.statut || ''), retour: req.body?.retour, par: 'Delivery Digital' });
  if (r.erreur) return res.status(400).json({ error: r.erreur });
  const u = await User.findById(req.params.id, { pyemesSocials: 1 }).lean();
  res.json({ ok: true, publications: vuePubsAdmin(u) });
});

/* Decision prise depuis l'ADMIN PYEMES (serveur a serveur, x-admin-secret) : { code, pid, statut,
   retour }. `code` = code Pyemes de l'agence, celui du lien de parrainage. */
router.post('/pyemes/publications/decision', async (req, res) => {
  const secret = req.headers['x-admin-secret'] || '';
  if (!secret || secret !== (process.env.ADMIN_SECRET || '')) return res.status(401).json({ error: 'unauthorized' });
  const code = String(req.body?.code || '').trim().toUpperCase();
  const ag = await User.findOne({ role: 'agence', pyemesCode: code }, { _id: 1 }).lean();
  if (!ag) return res.status(404).json({ error: 'agence_introuvable' });
  const r = await deciderPublication({ agencyId: ag._id, pid: String(req.body?.pid || ''), statut: String(req.body?.statut || ''), retour: req.body?.retour, par: 'Pyemes' });
  if (r.erreur) return res.status(400).json({ error: r.erreur });
  res.json({ ok: true });
});

/* Message ecrit depuis l'ADMIN PYEMES (serveur a serveur, x-admin-secret) : il rejoint le fil de la
   feuille de route cote agence, comme si DD avait repondu depuis son propre admin.
   { code, texte, auteur } @author Rabah Ziane - 2026-08-31 */
router.post('/pyemes/messages/incoming', async (req, res) => {
  const secret = req.headers['x-admin-secret'] || '';
  if (!secret || secret !== (process.env.ADMIN_SECRET || '')) return res.status(401).json({ error: 'unauthorized' });
  const code = String(req.body?.code || '').trim().toUpperCase();
  const texte = String(req.body?.texte || '').trim();
  if (!texte) return res.status(400).json({ error: 'message_vide' });
  const ag = await User.findOne({ role: 'agence', pyemesCode: code }, { _id: 1, email: 1, name: 1 }).lean();
  if (!ag) return res.status(404).json({ error: 'agence_introuvable' });
  await User.updateOne({ _id: ag._id }, { $push: { pyemesMessages: {
    from: 'dd', auteur: String(req.body?.auteur || 'Pyemes').slice(0, 80), texte: texte.slice(0, 4000), at: new Date(),
  } } });
  // L'agence est prevenue par email, comme pour un message envoye depuis l'admin DD.
  try {
    if (ag.email) {
      const html = `<p>Nouveau message dans la feuille de route Pyemes :</p><p>${texte.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]))}</p><p><a href="https://deliverydigital.fr/agence">Ouvrir mon espace agence</a></p>`;
      await getTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr', to: ag.email, bcc: 'contact@deliverydigital.fr', subject: 'Feuille de route Pyemes - nouveau message', html });
    }
  } catch (e) { /* best-effort */ }
  res.json({ ok: true });
});

/* Liste des publications d'une agence pour l'admin PYEMES (serveur a serveur). */
router.get('/pyemes/publications/:code', async (req, res) => {
  const secret = req.headers['x-admin-secret'] || '';
  if (!secret || secret !== (process.env.ADMIN_SECRET || '')) return res.status(401).json({ error: 'unauthorized' });
  const ag = await User.findOne({ role: 'agence', pyemesCode: String(req.params.code || '').toUpperCase() }, { pyemesSocials: 1, name: 1 }).lean();
  if (!ag) return res.status(404).json({ error: 'agence_introuvable' });
  res.json({ ok: true, agence: ag.name, publications: vuePubsAdmin(ag) });
});

export default router;
