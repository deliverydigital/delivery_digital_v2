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
import { User } from '../models/index.js';
import AgencyDossier from '../models/AgencyDossier.js';

const router = express.Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const requireAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
};

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
      password_hash: password, apiKey,
      commissionFix: req.body.commissionFix != null ? Number(req.body.commissionFix) : 120,
      commissionPercent: req.body.commissionPercent != null ? Number(req.body.commissionPercent) : 15,
    });
    res.json({ agency: { id: user._id, email, name }, password, apiKey });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Dossiers OPCO transmis par les agences (recus cote DD) + commission a verser + RIB.
router.get('/dossiers', requireAdmin, async (req, res) => {
  const dossiers = await AgencyDossier.find({}).sort({ createdAt: -1 }).lean();
  const ids = [...new Set(dossiers.map((d) => String(d.agencyId)))];
  const agencies = await User.find({ _id: { $in: ids } }).select('name iban bic accountHolder commissionFix commissionPercent').lean();
  const am = {};
  agencies.forEach((a) => { am[String(a._id)] = a; });
  const out = dossiers.map((d) => {
    const a = am[String(d.agencyId)] || {};
    const fix = a.commissionFix != null ? a.commissionFix : 120;
    const pct = a.commissionPercent != null ? a.commissionPercent : 15;
    return { ...d, commission: Math.round(fix + (pct / 100) * (d.amountHT || 0)), agencyIban: a.iban || '', agencyBic: a.bic || '', agencyHolder: a.accountHolder || '' };
  });
  res.json({ ok: true, dossiers: out });
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
