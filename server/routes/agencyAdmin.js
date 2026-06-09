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
import nodemailer from 'nodemailer';
import { User } from '../models/index.js';
import AgencyDossier from '../models/AgencyDossier.js';
import AgencyLead from '../models/AgencyLead.js';
import FormationUnavailability from '../models/FormationUnavailability.js';
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
  const ids = [...new Set(dossiers.map((d) => String(d.agencyId)))];
  const agencies = await User.find({ _id: { $in: ids } }).select('name iban bic accountHolder commissionFix commissionPercent').lean();
  const am = {};
  agencies.forEach((a) => { am[String(a._id)] = a; });
  // Le fixe (120 €) n'est du qu'UNE FOIS par client et par an (par agence) : il s'applique
  // au 1er dossier d'un client dans l'annee ; les suivants ne touchent que le %.
  // @author Rabah Ziane - 2026-06-02
  const sortedAsc = [...dossiers].sort((x, y) => new Date(x.createdAt || 0) - new Date(y.createdAt || 0));
  const seenClientYear = new Set();
  const fixDossierIds = new Set();
  sortedAsc.forEach((d) => {
    const year = new Date(d.createdAt || Date.now()).getFullYear();
    const key = `${String(d.agencyId)}_${String(d.leadId || d._id)}_${year}`;
    if (!seenClientYear.has(key)) { seenClientYear.add(key); fixDossierIds.add(String(d._id)); }
  });
  const out = dossiers.map((d) => {
    const a = am[String(d.agencyId)] || {};
    const fix = a.commissionFix != null ? a.commissionFix : 120;
    const pct = a.commissionPercent != null ? a.commissionPercent : 15;
    const appliedFix = fixDossierIds.has(String(d._id)) ? fix : 0;
    return { ...d, commission: Math.round(appliedFix + (pct / 100) * (d.amountHT || 0)), commissionFixApplied: appliedFix > 0, agencyIban: a.iban || '', agencyBic: a.bic || '', agencyHolder: a.accountHolder || '' };
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
    const sortedAsc = [...dossiers].sort((x, y) => new Date(x.createdAt || 0) - new Date(y.createdAt || 0));
    const seen = new Set(), fixIds = new Set();
    sortedAsc.forEach((d) => { const y = new Date(d.createdAt || Date.now()).getFullYear(); const k = `${d.agencyId}_${d.leadId || d._id}_${y}`; if (!seen.has(k)) { seen.add(k); fixIds.add(String(d._id)); } });
    let volumeHT = 0, stagiaires = 0, due = 0, paid = 0, transmitted = 0;
    for (const d of dossiers) {
      const a = am[String(d.agencyId)] || {};
      const fix = a.commissionFix != null ? a.commissionFix : 120;
      const pct = a.commissionPercent != null ? a.commissionPercent : 15;
      const commission = Math.round((fixIds.has(String(d._id)) ? fix : 0) + (pct / 100) * (d.amountHT || 0));
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
    const leads = await AgencyLead.find({ hidden: { $ne: true } }).select('denom email opco siret agencyId agencyName commercialName status createdAt').sort({ createdAt: -1 }).limit(1000).lean();
    const ag = await User.find({ _id: { $in: [...new Set(leads.map((l) => String(l.agencyId)).filter(Boolean))] } }).select('name').lean();
    const am = {}; ag.forEach((a) => { am[String(a._id)] = a.name; });
    res.json({ ok: true, clients: leads.map((l) => ({ id: l._id, denom: l.denom, email: l.email, opco: l.opco, siret: l.siret, agence: am[String(l.agencyId)] || l.agencyName || '-', commercial: l.commercialName || '', status: l.status, createdAt: l.createdAt })) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Compteur d'actions en attente (pour la pastille du menu admin) : nouveaux dossiers a
// traiter (transmis) + ordres d'encaissement recus non payes. @author Rabah Ziane - 2026-06-04
router.get('/pending-count', requireAdmin, async (req, res) => {
  try {
    const dossiers = await AgencyDossier.find({ hidden: { $ne: true } }).select('status encashRequestedAt').lean();
    const newDossiers = dossiers.filter((d) => d.status === 'transmitted').length;
    const encash = dossiers.filter((d) => d.encashRequestedAt && d.status !== 'paid').length;
    res.json({ ok: true, count: newDossiers + encash, newDossiers, encash });
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

export default router;
