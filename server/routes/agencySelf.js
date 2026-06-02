/**
 * Espace agence (auth JWT). Roles : 'agence' (proprietaire) et 'agence_commercial'
 * (sous-compte). Le commercial monte des dossiers/clients mais ne voit PAS la
 * commission/gains de l'agence. L'agence voit tout son perimetre + les chiffres
 * par commercial. @author Rabah Ziane - 2026-06-02
 */
import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { authenticate } from '../middleware/auth.js';
import { User, TrainingProgram } from '../models/index.js';
import AccessRequest from '../models/AccessRequest.js';
import AgencyLead from '../models/AgencyLead.js';
import AgencyDossier from '../models/AgencyDossier.js';

const router = express.Router();
const PUBLIC_BASE = 'https://deliverydigital.fr';
function getTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({ host: process.env.SMTP_HOST || 'ssl0.ovh.net', port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}
function genPassword(len = 12) {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const b = crypto.randomBytes(len); let o = '';
  for (let i = 0; i < len; i++) o += a[b[i] % a.length];
  return o;
}

router.use(authenticate, (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
  if (req.user.role !== 'agence' && req.user.role !== 'agence_commercial') return res.status(403).json({ error: 'not_agence' });
  next();
});

// Contexte : proprietaire d'agence ou sous-commercial.
async function ctx(req) {
  const me = await User.findById(req.user.id).lean();
  const isOwner = me.role === 'agence';
  const agencyId = isOwner ? String(me._id) : String(me.parentAgencyId || me._id);
  return { me, isOwner, agencyId, commercialId: isOwner ? null : String(me._id), name: me.name };
}
const ownerOnly = async (req, res) => { const c = await ctx(req); if (!c.isOwner) { res.status(403).json({ ok: false, error: 'owner_only' }); return null; } return c; };

router.get('/profile', async (req, res) => {
  const c = await ctx(req);
  const u = c.me;
  const base = { id: u._id, name: u.name, email: u.email, role: u.role, isOwner: c.isOwner };
  if (c.isOwner) {
    Object.assign(base, {
      apiKey: u.apiKey || null,
      commissionFix: u.commissionFix != null ? u.commissionFix : 120,
      commissionPercent: u.commissionPercent != null ? u.commissionPercent : 15,
      iban: u.iban || '', bic: u.bic || '', accountHolder: u.accountHolder || '',
      bankCountry: u.bankCountry || 'FR', bankData: u.bankData || {},
      ribPdfUrl: u.ribPdfUrl || '', bankValidated: !!u.bankValidated,
      companyInfo: u.companyInfo || {},
      contract: { signed: !!(u.contract && u.contract.signed), signedBy: u.contract?.signedBy || '', signedFunction: u.contract?.signedFunction || '', signedAt: u.contract?.signedAt || null, validated: !!(u.contract && u.contract.validated) },
      onboardingValidated: !!u.onboardingValidated,
    });
  }
  res.json({ ok: true, agency: base });
});

router.post('/bank', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  const u = await User.findById(req.user.id);
  u.bankCountry = (req.body.country || 'FR').toUpperCase().trim();
  // Champs RIB specifiques au pays (objet libre), nettoyes.
  const fields = (req.body.fields && typeof req.body.fields === 'object') ? req.body.fields : {};
  const clean = {};
  for (const k of Object.keys(fields)) clean[k] = String(fields[k] || '').trim();
  u.bankData = clean;
  // Mirroir IBAN/BIC pour compat (FR/SEPA).
  u.iban = (clean.iban || req.body.iban || '').replace(/\s+/g, '').toUpperCase().trim();
  u.bic = (clean.bic || clean.swift || req.body.bic || '').replace(/\s+/g, '').toUpperCase().trim();
  u.accountHolder = (req.body.accountHolder || clean.accountHolder || '').trim();
  u.bankValidated = false; // toute modif RIB repasse en attente de validation superadmin
  await u.save();
  res.json({ ok: true, bankCountry: u.bankCountry, bankData: u.bankData, iban: u.iban, bic: u.bic, accountHolder: u.accountHolder, bankValidated: u.bankValidated });
});

// Upload du PDF du RIB (base64 data URL). Obligatoire pour valider le compte.
router.post('/rib-pdf', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  try {
    const dataUrl = String(req.body.dataUrl || '');
    const m = dataUrl.match(/^data:application\/pdf;base64,(.+)$/);
    if (!m) return res.status(400).json({ ok: false, error: 'pdf_only' });
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > 6 * 1024 * 1024) return res.status(400).json({ ok: false, error: 'too_large' });
    const fs = await import('fs'); const path = await import('path'); const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const dir = path.join(__dirname, '../../uploads/agency');
    fs.mkdirSync(dir, { recursive: true });
    const fname = `rib-${req.user.id}-${crypto.randomBytes(6).toString('hex')}.pdf`;
    fs.writeFileSync(path.join(dir, fname), buf);
    const u = await User.findById(req.user.id);
    u.ribPdfUrl = `/uploads/agency/${fname}`;
    u.bankValidated = false;
    await u.save();
    res.json({ ok: true, ribPdfUrl: u.ribPdfUrl });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Infos entreprise (bandeau) - repassent en attente de validation superadmin.
router.post('/company', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
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

// Signature du contrat de partenariat (acceptation electronique).
router.post('/contract/sign', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  const u = await User.findById(req.user.id);
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
  u.contract = {
    signed: true,
    signedBy: (req.body.signedBy || u.name || '').trim(),
    signedFunction: (req.body.signedFunction || '').trim(),
    signedIp: ip, signedAt: new Date(), validated: false,
  };
  u.onboardingValidated = false;
  await u.save();
  res.json({ ok: true, contract: u.contract });
});

router.post('/api-key', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  const u = await User.findById(req.user.id);
  u.apiKey = 'dd_agc_' + crypto.randomBytes(24).toString('hex');
  await u.save();
  res.json({ ok: true, apiKey: u.apiKey });
});

router.get('/catalog', async (req, res) => {
  const formations = await TrainingProgram.find({}).lean().catch(() => []);
  res.json({ ok: true, formations });
});

/* === Commerciaux (sous-comptes) - proprietaire d'agence uniquement === */
router.get('/commerciaux', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  const list = await User.find({ role: 'agence_commercial', parentAgencyId: c.agencyId }).select('name email status createdAt last_login').sort({ createdAt: -1 }).lean();
  // stats par commercial
  const leads = await AgencyLead.find({ agencyId: c.agencyId }).select('commercialId status').lean();
  const dossiers = await AgencyDossier.find({ agencyId: c.agencyId }).select('commercialId amountHT status').lean();
  const fix = c.me.commissionFix != null ? c.me.commissionFix : 120;
  const pct = c.me.commissionPercent != null ? c.me.commissionPercent : 15;
  const stats = list.map((co) => {
    const cid = String(co._id);
    const myLeads = leads.filter((l) => String(l.commercialId) === cid);
    const myDoss = dossiers.filter((d) => String(d.commercialId) === cid);
    const gains = myDoss.reduce((s, d) => s + Math.round(fix + (pct / 100) * (d.amountHT || 0)), 0);
    return { id: cid, name: co.name, email: co.email, status: co.status, lastLogin: co.last_login, clients: myLeads.length, dossiers: myDoss.length, gains };
  });
  res.json({ ok: true, commerciaux: stats });
});
router.post('/commerciaux', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  const email = (req.body.email || '').trim().toLowerCase();
  const name = (req.body.name || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'invalid_email' });
  if (!name) return res.status(400).json({ ok: false, error: 'name_required' });
  if (await User.findOne({ email })) return res.status(409).json({ ok: false, error: 'email_exists' });
  const password = genPassword(12);
  const u = await User.create({ email, name, role: 'agence_commercial', parentAgencyId: c.agencyId, status: 'active', email_verified: true, password_hash: password });
  res.json({ ok: true, commercial: { id: u._id, name, email }, password });
});

/* === Leads / clients === */
router.get('/leads', async (req, res) => {
  const c = await ctx(req);
  const q = c.isOwner ? { agencyId: c.agencyId } : { agencyId: c.agencyId, commercialId: c.commercialId };
  const leads = await AgencyLead.find(q).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, leads });
});
function leadBase(c, r) {
  return {
    agencyId: c.agencyId, agencyName: c.isOwner ? c.name : undefined,
    commercialId: c.commercialId || undefined, commercialName: c.isOwner ? undefined : c.name,
    denom: (r.denom || '').trim(), email: (r.email || '').trim().toLowerCase() || undefined,
    siret: (r.siret || '').replace(/\s/g, '').trim() || undefined, opco: (r.opco || '').trim() || undefined, status: 'new',
  };
}
router.post('/leads', async (req, res) => {
  const c = await ctx(req);
  const lead = await AgencyLead.create(leadBase(c, req.body));
  res.json({ ok: true, lead });
});
router.post('/leads/bulk', async (req, res) => {
  const c = await ctx(req);
  const rows = Array.isArray(req.body.leads) ? req.body.leads : [];
  const docs = rows.filter((r) => r && (r.denom || '').trim()).slice(0, 1000).map((r) => leadBase(c, r));
  if (!docs.length) return res.status(400).json({ ok: false, error: 'no_rows' });
  const created = await AgencyLead.insertMany(docs);
  res.json({ ok: true, created: created.length });
});
router.patch('/leads/:id', async (req, res) => {
  const c = await ctx(req);
  const q = c.isOwner ? { _id: req.params.id, agencyId: c.agencyId } : { _id: req.params.id, commercialId: c.commercialId };
  const lead = await AgencyLead.findOne(q);
  if (!lead) return res.status(404).json({ ok: false, error: 'not_found' });
  if (req.body.status) lead.status = req.body.status;
  if (typeof req.body.notes === 'string') lead.notes = req.body.notes;
  await lead.save();
  res.json({ ok: true, lead });
});

/* === Dossiers OPCO === */
router.get('/dossiers', async (req, res) => {
  const c = await ctx(req);
  const q = c.isOwner ? { agencyId: c.agencyId } : { agencyId: c.agencyId, commercialId: c.commercialId };
  const dossiers = await AgencyDossier.find(q).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, dossiers });
});
router.post('/transmit-dossier', async (req, res) => {
  const c = await ctx(req);
  const b = req.body || {};
  if (!b.denom) return res.status(400).json({ ok: false, error: 'denom_required' });
  const salaries = Array.isArray(b.salaries) ? b.salaries.filter((s) => s && s.firstname && s.lastname) : [];
  if (salaries.length === 0) return res.status(400).json({ ok: false, error: 'salaries_required' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
  const dossier = await AgencyDossier.create({
    agencyId: c.agencyId, agencyName: c.isOwner ? c.name : undefined,
    commercialId: c.commercialId || undefined, commercialName: c.isOwner ? undefined : c.name,
    leadId: b.leadId || undefined, denom: b.denom, siret: b.siret, opco: b.opco, addr: b.addr, clientEmail: b.clientEmail,
    formationTitle: b.formationTitle, sessionName: b.sessionName, salaries,
    signedBy: b.signedBy, signedFunction: b.signedFunction, signedIp: ip,
    amountHT: 525 * salaries.length, status: 'transmitted',
  });
  if (b.leadId) { try { await AgencyLead.updateOne({ _id: b.leadId, agencyId: c.agencyId }, { status: 'converted' }); } catch { /* */ } }
  res.json({ ok: true, dossierId: dossier._id });
});

/* === Demandes d'acces client === */
router.get('/access-requests', async (req, res) => {
  const c = await ctx(req);
  const q = c.isOwner ? { agencyId: c.agencyId } : { agencyId: c.agencyId, commercialId: c.commercialId };
  const rows = await AccessRequest.find(q).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, requests: rows.map((r) => ({ id: r._id, clientEmail: r.clientEmail, label: r.label, status: r.status, createdAt: r.createdAt, receivedAt: r.receivedAt })) });
});
router.post('/access-requests', async (req, res) => {
  const c = await ctx(req);
  const clientEmail = (req.body.clientEmail || '').trim().toLowerCase();
  const label = (req.body.label || 'Accès à votre compte').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) return res.status(400).json({ ok: false, error: 'invalid_client_email' });
  const token = crypto.randomBytes(24).toString('base64url');
  const cr = await AccessRequest.create({ token, agencyId: c.agencyId, agencyName: c.name, commercialId: c.commercialId || undefined, clientEmail, label, status: 'pending', expiresAt: new Date(Date.now() + 30 * 86400000) });
  const url = `${PUBLIC_BASE}/acces/${token}`;
  let emailSent = false;
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to: clientEmail, bcc: 'contact@deliverydigital.fr',
      subject: 'Transmettez vos accès en toute sécurité',
      html: `<div style="font-family:-apple-system,Arial,sans-serif;max-width:520px;margin:auto;color:#1D1D1F"><p>Bonjour,</p><p>${c.name || 'Votre partenaire Delivery Digital'} a besoin de vos identifiants (<strong>${label}</strong>).</p><p>Saisissez-les sur cette page sécurisée (chiffrée AES-256). Ne transmettez jamais un mot de passe en clair par email.</p><p style="text-align:center;margin:24px 0"><a href="${url}" style="display:inline-block;padding:14px 30px;background:#1D1D1F;color:#fff;text-decoration:none;border-radius:999px;font-weight:600">Transmettre mes accès</a></p><p style="font-size:12px;color:#86868B">Ou : <a href="${url}">${url}</a></p></div>`,
      text: `Bonjour,\n\n${c.name || 'Delivery Digital'} a besoin de vos identifiants (${label}).\nPage sécurisée : ${url}`,
    });
    emailSent = true;
  } catch (e) { console.error('access-request mail failed:', e.message); }
  res.json({ ok: true, request: { id: cr._id, status: cr.status }, url, emailSent });
});

export default router;
