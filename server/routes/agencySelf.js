/**
 * Espace agence (auth JWT). Roles : 'agence' (proprietaire) et 'agence_commercial'
 * (sous-compte). Le commercial monte des dossiers/clients mais ne voit PAS la
 * commission/gains de l'agence. L'agence voit tout son perimetre + les chiffres
 * par commercial. @author Rabah Ziane - 2026-06-02
 */
import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { authenticate } from '../middleware/auth.js';
import { User, TrainingProgram } from '../models/index.js';
import AccessRequest from '../models/AccessRequest.js';
import AgencyLead from '../models/AgencyLead.js';
import AgencyDossier from '../models/AgencyDossier.js';
import AgencyPaymentOrder from '../models/AgencyPaymentOrder.js';
import ConventionSignRequest from '../models/ConventionSignRequest.js';
import { autoAssignTrainerToDossier } from '../lib/trainerAssign.js';
import { sendTaskNotif } from '../lib/taskNotif.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
// pdf-parse est en CommonJS : on le charge a la demande (require) pour ne pas alourdir le boot.
const requireCjs = createRequire(import.meta.url);

const router = express.Router();
const PUBLIC_BASE = 'https://deliverydigital.fr';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
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

// Route PUBLIQUE (avant l'auth) : redirection du lien tracké envoyé aux clients. Marque la 1re
// ouverture (statut « lien ouvert ») puis renvoie vers la page d'inscription Pyemes de l'agence.
// Définie AVANT router.use(authenticate) pour rester accessible sans session. @Rabah 2026-08-01
router.get('/pyemes/track', async (req, res) => {
  const t = String(req.query.t || '');
  const code = String(req.query.ag || '');
  const dest = code ? `https://pyemes.com/inscription?ag=${encodeURIComponent(code)}` : 'https://pyemes.com/inscription';
  if (t) {
    // openedAt posé une seule fois (1re ouverture). Filtre openedAt:null évite d'écraser la date.
    try { await User.updateOne({ 'pyemesPitches.token': t, 'pyemesPitches.openedAt': null }, { $set: { 'pyemesPitches.$.openedAt': new Date() } }); } catch { /* la redirection prime */ }
  }
  res.redirect(302, dest);
});

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
  const dossiers = await AgencyDossier.find({ agencyId: c.agencyId }).select('commercialId leadId amountHT status createdAt').lean();
  const fix = c.me.commissionFix != null ? c.me.commissionFix : 120;
  const pct = c.me.commissionPercent != null ? c.me.commissionPercent : 15;
  // Fixe (120 €) du une seule fois par client et par an : applique au 1er dossier du client.
  const sortedAsc = [...dossiers].sort((x, y) => new Date(x.createdAt || 0) - new Date(y.createdAt || 0));
  const seen = new Set(); const fixIds = new Set();
  sortedAsc.forEach((d) => { const key = `${String(d.leadId || d._id)}_${new Date(d.createdAt || Date.now()).getFullYear()}`; if (!seen.has(key)) { seen.add(key); fixIds.add(String(d._id)); } });
  const earn = (d) => Math.round((fixIds.has(String(d._id)) ? fix : 0) + (pct / 100) * (d.amountHT || 0));
  const stats = list.map((co) => {
    const cid = String(co._id);
    const myLeads = leads.filter((l) => String(l.commercialId) === cid);
    const myDoss = dossiers.filter((d) => String(d.commercialId) === cid);
    const gains = myDoss.reduce((s, d) => s + earn(d), 0);
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
  const leads = await AgencyLead.find({ ...q, hidden: { $ne: true } }).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, leads });
});
function leadBase(c, r) {
  return {
    agencyId: c.agencyId, agencyName: c.isOwner ? c.name : undefined,
    commercialId: c.commercialId || undefined, commercialName: c.isOwner ? undefined : c.name,
    denom: (r.denom || '').trim(), email: (r.email || '').trim().toLowerCase() || undefined,
    accountantEmail: (r.accountantEmail || '').trim().toLowerCase() || undefined,
    managerEmail: (r.managerEmail || '').trim().toLowerCase() || undefined,
    siret: (r.siret || '').replace(/\s/g, '').trim() || undefined, opco: (r.opco || '').trim() || undefined,
    addr: (r.addr || '').trim() || undefined, status: 'new',
    formationDoneThisYear: r.formationDoneThisYear === true || r.formationDoneThisYear === 'true',
    companyEmployees: r.companyEmployees != null && r.companyEmployees !== '' ? Number(r.companyEmployees) : undefined,
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
  // Modification des infos client (nom + emails + SIRET + OPCO) après création. @author Rabah Ziane - 2026-06-18
  if (typeof req.body.denom === 'string' && req.body.denom.trim()) lead.denom = req.body.denom.trim();
  if (typeof req.body.email === 'string') lead.email = req.body.email.trim().toLowerCase() || undefined;
  if (typeof req.body.accountantEmail === 'string') lead.accountantEmail = req.body.accountantEmail.trim().toLowerCase() || undefined;
  if (typeof req.body.managerEmail === 'string') lead.managerEmail = req.body.managerEmail.trim().toLowerCase() || undefined;
  if (typeof req.body.siret === 'string') lead.siret = req.body.siret.replace(/\s/g, '').trim() || undefined;
  if (typeof req.body.opco === 'string') lead.opco = req.body.opco.trim() || undefined;
  if (typeof req.body.waitingNote === 'string') lead.waitingNote = req.body.waitingNote.trim() || undefined;
  if ('reminderAt' in req.body) lead.reminderAt = req.body.reminderAt ? new Date(req.body.reminderAt) : undefined;
  // Suivi annuel + effectif entreprise (cf AgencyLead). @author Rabah Ziane - 2026-06-18
  if ('formationDoneThisYear' in req.body) lead.formationDoneThisYear = req.body.formationDoneThisYear === true || req.body.formationDoneThisYear === 'true';
  if ('companyEmployees' in req.body) lead.companyEmployees = req.body.companyEmployees != null && req.body.companyEmployees !== '' ? Number(req.body.companyEmployees) : undefined;
  await lead.save();
  res.json({ ok: true, lead });
});

// Reaffectation d'un client (et de tous ses dossiers) a un autre commercial.
// commercialId vide => rattache au proprietaire de l'agence. Owner only. @author Rabah Ziane - 2026-06-04
router.patch('/leads/:id/assign', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  const lead = await AgencyLead.findOne({ _id: req.params.id, agencyId: c.agencyId });
  if (!lead) return res.status(404).json({ ok: false, error: 'not_found' });
  const commercialId = String(req.body.commercialId || '').trim();
  if (commercialId) {
    const u = await User.findOne({ _id: commercialId, role: 'agence_commercial', parentAgencyId: c.agencyId }).select('name').lean();
    if (!u) return res.status(400).json({ ok: false, error: 'invalid_commercial' });
    lead.commercialId = u._id; lead.commercialName = u.name;
  } else {
    lead.commercialId = undefined; lead.commercialName = undefined; // rattache au proprietaire
  }
  await lead.save();
  await AgencyDossier.updateMany({ agencyId: c.agencyId, leadId: lead._id }, { $set: { commercialId: lead.commercialId || undefined, commercialName: lead.commercialName || undefined } });
  res.json({ ok: true, lead });
});

/* === Dossiers OPCO === */
router.get('/dossiers', async (req, res) => {
  const c = await ctx(req);
  const q = c.isOwner ? { agencyId: c.agencyId } : { agencyId: c.agencyId, commercialId: c.commercialId };
  const dossiers = await AgencyDossier.find({ ...q, hidden: { $ne: true } }).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, dossiers });
});

// Ordres de virement reçus par l'agence (historique des paiements + PDF attaché). Réservé au
// propriétaire (le commercial ne voit pas la commission). @author Rabah Ziane - 2026-07-29
router.get('/payment-orders', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  const orders = await AgencyPaymentOrder.find({ agencyId: c.agencyId }).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ ok: true, orders });
});

// L'agence envoie un ordre d'encaissement (sa facture de commission) une fois que
// l'OPCO a payé Delivery Digital (fonds disponibles). @author Rabah Ziane - 2026-06-02
router.post('/dossiers/:id/encash', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return; // commission = proprietaire uniquement
  const d = await AgencyDossier.findOne({ _id: req.params.id, agencyId: c.agencyId });
  if (!d) return res.status(404).json({ ok: false, error: 'not_found' });
  if (!d.opcoPaid) return res.status(400).json({ ok: false, error: 'not_available' });
  if (d.status === 'paid') return res.status(400).json({ ok: false, error: 'already_paid' });
  if (!d.invoiceNumber) d.invoiceNumber = 'AGC-' + new Date(d.createdAt || Date.now()).getFullYear() + '-' + String(d._id).slice(-5).toUpperCase();
  d.encashRequestedAt = new Date();
  await d.save();
  // Notifie le superadmin (best effort).
  try {
    const to = process.env.ADMIN_EMAIL || 'contact@deliverydigital.fr';
    const fix = c.me.commissionFix != null ? c.me.commissionFix : 120;
    const pct = c.me.commissionPercent != null ? c.me.commissionPercent : 15;
    const commission = Math.round(fix + (pct / 100) * (d.amountHT || 0));
    await getTransporter().sendMail({
      from: process.env.SMTP_USER, to,
      subject: `Ordre d'encaissement ${d.invoiceNumber} - ${c.me.name}`,
      text: `L'agence ${c.me.name} demande l'encaissement de sa commission.\n\nFacture : ${d.invoiceNumber}\nClient : ${d.denom || '-'}\nDossier : ${d.formationTitle || '-'}\nCommission : ${commission} € TTC\nRIB : ${c.me.iban || '(non renseigne)'} ${c.me.bic || ''}\nTitulaire : ${c.me.accountHolder || c.me.name}\n\nValidez le virement puis passez le dossier en "Payé" dans l'admin.`,
    });
  } catch (e) { /* email best effort */ }
  res.json({ ok: true, invoiceNumber: d.invoiceNumber, encashRequestedAt: d.encashRequestedAt });
});
router.post('/transmit-dossier', async (req, res) => {
  const c = await ctx(req);
  const b = req.body || {};
  if (!b.denom) return res.status(400).json({ ok: false, error: 'denom_required' });
  // Brouillon ("Enregistrer" côté agence) : on crée le dossier même incomplet (0 stagiaire toléré),
  // visible dans "Dossiers OPCO reçus" mais SANS notifier DD ni exiger la convention. @Rabah 2026-07-02
  const isDraft = !!b.draft;
  const salaries = Array.isArray(b.salaries) ? b.salaries.filter((s) => s && s.firstname && s.lastname) : [];
  if (!isDraft && salaries.length === 0) return res.status(400).json({ ok: false, error: 'salaries_required' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
  const dossier = await AgencyDossier.create({
    agencyId: c.agencyId, agencyName: c.isOwner ? c.name : undefined,
    commercialId: c.commercialId || undefined, commercialName: c.isOwner ? undefined : c.name,
    leadId: b.leadId || undefined, denom: b.denom, siret: b.siret, opco: b.opco, addr: b.addr, clientEmail: b.clientEmail,
    formationTitle: b.formationTitle, sessionName: b.sessionName, salaries,
    sessionStart: b.startAt ? new Date(b.startAt) : undefined, sessionEnd: b.endAt ? new Date(b.endAt) : undefined,
    signedBy: b.signedBy, signedFunction: b.signedFunction, signedIp: ip,
    signatureDataUrl: b.signatureDataUrl || undefined, signedRemote: false, signedAt: (isDraft && !b.signatureDataUrl) ? undefined : new Date(),
    amountHT: b.amountHT != null ? Math.round(Number(b.amountHT)) : 525 * salaries.length, status: 'transmitted', draft: isDraft,
  });
  // Brouillon : déjà visible côté DD, on n'active pas la conversion du lead / formateur / email. @Rabah 2026-07-02
  if (isDraft) return res.json({ ok: true, dossierId: dossier._id, draft: true });
  if (b.leadId) { try { await AgencyLead.updateOne({ _id: b.leadId, agencyId: c.agencyId }, { status: 'converted' }); } catch { /* */ } }
  // Auto-assignation du formateur dispo -> le cours apparaît dans son espace + superadmin. @Rabah 2026-06-19
  try { await autoAssignTrainerToDossier(dossier); } catch { /* best effort */ }
  // Notifie le superadmin DD : nouveau dossier OPCO recu (convention signee par le client).
  try {
    const to = process.env.ADMIN_EMAIL || 'contact@deliverydigital.fr';
    const stagiaires = salaries.map((s, i) => `${i + 1}. ${s.firstname} ${s.lastname}${s.email ? ' (' + s.email + ')' : ''}${s.type_contrat ? ' - ' + s.type_contrat : ''}`).join('\n');
    await getTransporter().sendMail({
      from: process.env.SMTP_USER, to,
      subject: `Nouveau dossier OPCO à monter - ${b.denom} (${c.name})`,
      text: `Convention signée par le client. Dossier à monter auprès de l'OPCO.\n\n`
        + `Agence : ${c.name}\nBénéficiaire : ${b.denom}\nSIRET : ${b.siret || '-'}\nOPCO : ${b.opco || '-'}\nFormation : ${b.formationTitle || '-'}\nSession : ${b.sessionName || '-'}\n`
        + `Signé par : ${b.signedBy || '-'}${b.signedFunction ? ' (' + b.signedFunction + ')' : ''}\nMontant : ${525 * salaries.length} € HT\n\nStagiaires (${salaries.length}) :\n${stagiaires}\n\n`
        + `Ouvrez le dossier dans l'admin (Agences partenaires → Dossiers OPCO) pour voir le détail et télécharger la convention + les stagiaires en PDF.`,
    });
  } catch (e) { /* email best effort */ }
  res.json({ ok: true, dossierId: dossier._id });
});

// Correction d'un dossier deja transmis : l'agence/le commercial modifie les infos
// (stagiaires, session, formation, signataire) et renvoie. Interdit si deja paye.
// @author Rabah Ziane - 2026-06-04
router.patch('/dossiers/:id', async (req, res) => {
  const c = await ctx(req);
  const q = c.isOwner ? { _id: req.params.id, agencyId: c.agencyId } : { _id: req.params.id, agencyId: c.agencyId, commercialId: c.commercialId };
  const d = await AgencyDossier.findOne(q);
  if (!d) return res.status(404).json({ ok: false, error: 'not_found' });
  if (d.status === 'paid' || d.status === 'invoiced') return res.status(400).json({ ok: false, error: 'locked' });
  const b = req.body || {};
  const salaries = Array.isArray(b.salaries) ? b.salaries.filter((s) => s && s.firstname && s.lastname) : [];
  // Sauvegarde silencieuse d'un brouillon : 0 stagiaire toléré (transmission réelle : toujours ≥1). @Rabah 2026-07-02
  if (!b.silent && salaries.length === 0) return res.status(400).json({ ok: false, error: 'salaries_required' });
  if (b.denom != null) d.denom = b.denom;
  if (b.siret != null) d.siret = b.siret;
  if (b.opco != null) d.opco = b.opco;
  if (b.formationTitle != null) d.formationTitle = b.formationTitle;
  if (b.sessionName != null) d.sessionName = b.sessionName;
  if (b.startAt) d.sessionStart = new Date(b.startAt);
  if (b.endAt) d.sessionEnd = new Date(b.endAt);
  if (b.signedBy != null) d.signedBy = b.signedBy;
  if (b.signedFunction != null) d.signedFunction = b.signedFunction;
  // Email éditable : conservé sur le dossier ET répercuté sur le lead lié (source d'affichage du
  // wizard) pour qu'il persiste à la réouverture. @author Rabah Ziane - 2026-06-24
  if (b.clientEmail != null) {
    const ce = String(b.clientEmail).trim().toLowerCase();
    if (ce) {
      d.clientEmail = ce;
      if (d.leadId) { try { await AgencyLead.updateOne({ _id: d.leadId, agencyId: c.agencyId }, { $set: { email: ce } }); } catch (e) { /* best effort */ } }
    }
  }
  if (b.signatureDataUrl) { d.signatureDataUrl = b.signatureDataUrl; d.signedRemote = false; d.signedAt = new Date(); }
  if (salaries.length > 0 || !b.silent) d.salaries = salaries; // brouillon sauvé à 0 stagiaire : on garde l'existant. @Rabah 2026-07-02
  d.amountHT = b.amountHT != null ? Math.round(Number(b.amountHT)) : (salaries.length ? 525 * salaries.length : (d.amountHT || 0));
  if (d.status === 'rejected' && !b.silent) d.status = 'transmitted'; // re-soumis pour instruction (sauf simple sauvegarde)
  if (!b.silent) d.draft = false; // transmission réelle -> le brouillon devient un vrai dossier (compté "à traiter"). @Rabah 2026-07-02
  await d.save();
  // Convention DÉJÀ SIGNÉE : on répercute les nouvelles infos (dates de session, formation,
  // stagiaires, montant, bénéficiaire) sur la/les demande(s) de signature liée(s) SANS toucher à
  // la signature ni au statut. Pourquoi : la convention signée est un snapshot séparé du dossier ;
  // sans ce sync, changer les dates ne se répercutait pas sur la convention signée (dates figées
  // à la signature). Résultat voulu : la convention reste "signée/enregistrée" mais avec les
  // bonnes dates -> le PDF téléchargé et la page de signature affichent la session à jour.
  // @author Rabah Ziane - 2026-07-17
  try {
    await ConventionSignRequest.updateMany(
      { $or: [{ dossierId: d._id }, { editDossierId: d._id }], status: 'signed' },
      { $set: {
        sessionStart: d.sessionStart, sessionEnd: d.sessionEnd, sessionName: d.sessionName,
        formationTitle: d.formationTitle, salaries: d.salaries, amountHT: d.amountHT,
        denom: d.denom, siret: d.siret, opco: d.opco, addr: d.addr,
      } },
    );
  } catch (e) { /* best effort : la source de vérité reste le dossier (lu par printConvention) */ }
  // silent: simple enregistrement (ex. email corrigé) -> on ne notifie PAS Delivery Digital. @Rabah 2026-06-24
  if (!b.silent) {
    try {
      const to = process.env.ADMIN_EMAIL || 'contact@deliverydigital.fr';
      const stagiaires = salaries.map((s, i) => `${i + 1}. ${s.firstname} ${s.lastname}${s.email ? ' (' + s.email + ')' : ''}${s.type_contrat ? ' - ' + s.type_contrat : ''}`).join('\n');
      await getTransporter().sendMail({
        from: process.env.SMTP_USER, to,
        subject: `Dossier OPCO corrigé - ${d.denom} (${c.name})`,
        text: `Le dossier a été corrigé et renvoyé par ${c.name}.\n\n`
          + `Bénéficiaire : ${d.denom}\nSIRET : ${d.siret || '-'}\nOPCO : ${d.opco || '-'}\nFormation : ${d.formationTitle || '-'}\nSession : ${d.sessionName || '-'}\n`
          + `Signé par : ${d.signedBy || '-'}${d.signedFunction ? ' (' + d.signedFunction + ')' : ''}\nMontant : ${d.amountHT} € HT\n\nStagiaires (${salaries.length}) :\n${stagiaires}\n\n`
          + `Rouvrez le dossier dans l'admin pour voir le détail à jour.`,
      });
    } catch (e) { /* email best effort */ }
  }
  res.json({ ok: true, dossier: d });
});

// Envoi au client du modele CSV des stagiaires (piece jointe) a remplir et renvoyer. @Rabah 2026-06-04
router.post('/send-csv-template', async (req, res) => {
  const c = await ctx(req);
  const clientEmail = String(req.body.clientEmail || '').trim();
  if (!clientEmail) return res.status(400).json({ ok: false, error: 'client_email_required' });
  const denom = (req.body.denom || '').trim();
  const csv = 'prenom;nom;poste;email;date_naissance;num_secu;contrat;telephone\n'
    + 'Jean;Dupont;Serveur;jean.dupont@email.fr;15/05/1990;185057511600142;CDI;0612345678\n';
  // Agence en copie cachée (BCC) ; réponses du client renvoyées à DDN/contact@deliverydigital.fr (replyTo). @Rabah 2026-06-25
  const owner = await User.findById(c.agencyId).select('email').lean();
  const agencyEmail = owner && owner.email ? owner.email.trim().toLowerCase() : '';
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to: clientEmail, bcc: ['contact@deliverydigital.fr', agencyEmail].filter(Boolean), replyTo: 'contact@deliverydigital.fr',
      subject: 'Liste de vos salariés à former - modèle à remplir',
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><div style="height:5px;background:#0066CC"></div><div style="padding:22px 26px 6px;text-align:center;border-bottom:1px solid #f0f0f2"><img src="${PUBLIC_BASE}/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png" alt="Delivery Digital" style="height:38px;width:auto" /></div><div style="padding:26px"><p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 14px">Bonjour,<br><br>Pour inscrire vos salariés à la formation, merci de compléter le <strong>modèle ci-joint</strong> (un salarié par ligne) puis de nous le renvoyer en répondant à cet email.</p><p style="font-size:13px;color:#3a3a3c;line-height:1.6;margin:0 0 8px">Colonnes : prénom, nom, poste, email, date de naissance, n° de sécurité sociale, type de contrat, téléphone. Vous pouvez l'ouvrir avec Excel, Numbers ou Google Sheets.</p><p style="font-size:12px;color:#86868b;margin:16px 0 0">Delivery Digital · Organisme de formation certifié QUALIOPI</p></div></div></div>`,
      attachments: [{ filename: 'modele-stagiaires.csv', content: '﻿' + csv, contentType: 'text/csv; charset=utf-8' }],
    });
    res.json({ ok: true, sentTo: clientEmail });
  } catch (e) { res.status(500).json({ ok: false, error: 'send_failed' }); }
});

// Email de confirmation de la demande de rattachement OPCO : prévient le CLIENT et l'AGENCE qu'un
// courrier d'activation va arriver à l'adresse de l'entreprise (à surveiller). Renvoyable.
// @author Rabah Ziane - 2026-06-24
router.post('/dossiers/:id/rattachement-email', async (req, res) => {
  const c = await ctx(req);
  const d = await AgencyDossier.findOne({ _id: req.params.id, agencyId: c.agencyId });
  if (!d) return res.status(404).json({ ok: false, error: 'not_found' });
  if (!d.aktoAttached) return res.status(400).json({ ok: false, error: 'rattachement_not_done' });
  // Destinataires : client + agence (compte propriétaire). bcc Delivery Digital pour traçabilité.
  const owner = await User.findById(c.agencyId).select('email name').lean();
  const to = [...new Set([d.clientEmail, owner && owner.email].map((x) => (x || '').trim().toLowerCase()).filter(Boolean))];
  if (!to.length) return res.status(400).json({ ok: false, error: 'no_recipient' });
  // Adresse du courrier : nettoyée (on retire les lignes purement numériques type code INSEE).
  const addrLines = String(d.addr || '').split(',').map((s) => s.trim()).filter((s) => s && !/^\d[\d\s]*$/.test(s));
  const addrHtml = [`<strong>${esc(d.denom || 'Votre entreprise')}</strong>`, ...addrLines.map(esc)].join('<br>');
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to: to.join(','), bcc: 'contact@deliverydigital.fr',
      subject: 'Demande de rattachement OPCO effectuée - courrier d\'activation en route',
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px"><div style="max-width:540px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><div style="height:5px;background:#3DD68C"></div><div style="padding:22px 26px 6px;text-align:center;border-bottom:1px solid #f0f0f2"><img src="${PUBLIC_BASE}/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png" alt="Delivery Digital" style="height:38px;width:auto" /></div><div style="padding:26px"><p style="font-size:18px;font-weight:800;color:#1d1d1f;margin:0 0 12px">Demande de rattachement effectuée ✓</p><p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 14px">Bonjour,<br><br>La <strong>demande de rattachement à votre OPCO a bien été effectuée</strong>. Un <strong>courrier d'activation</strong> va être envoyé par voie postale à l'adresse de l'entreprise (comptez quelques jours).</p><div style="background:#f5f5f7;border:1px solid #e5e5ea;border-radius:12px;padding:14px 16px;margin:0 0 16px"><p style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#86868b;font-weight:700;margin:0 0 6px">Adresse du courrier à surveiller</p><p style="font-size:14px;color:#1d1d1f;line-height:1.5;margin:0">${addrHtml}</p></div><p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 8px"><strong>Important :</strong> surveillez bien la boîte aux lettres de l'entreprise. Dès réception du courrier, transmettez le code d'activation à ${esc(owner && owner.name ? owner.name : 'votre interlocuteur')} (Delivery Digital) pour finaliser le rattachement et le dépôt du dossier.</p><p style="font-size:12px;color:#86868b;margin:18px 0 0">Delivery Digital · Organisme de formation certifié QUALIOPI</p></div></div></div>`,
    });
    d.rattachEmailSentAt = new Date();
    await d.save();
    res.json({ ok: true, sentTo: to, rattachEmailSentAt: d.rattachEmailSentAt });
  } catch (e) { res.status(500).json({ ok: false, error: 'send_failed' }); }
});

// Construit l'email de confirmation de formation (déroulé + RDV + à préparer + convocations/
// questionnaires + message). Partagé entre la version dossier et la version lead. @Rabah 2026-06-25
function buildConfirmationEmail({ denom, formationTitle, rdvAt, message, prepText, agencyName, agencyEmail, ownerName }) {
  const rdvStr = rdvAt ? rdvAt.toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) : '';
  const msg = String(message || '').trim();
  const prepRaw = String(prepText || '').trim();
  const prepItems = (prepRaw ? prepRaw.split('\n') : [
    "Une pièce d'identité du dirigeant", 'Vos identifiants OPCO (ou le code reçu par courrier)',
    'La liste des salariés à former', 'Un ordinateur ou téléphone avec connexion internet pour la visioconférence',
  ]).map((s) => s.trim()).filter(Boolean);
  const li = prepItems.map((x) => `<li style="margin:0 0 4px">${esc(x)}</li>`).join('');
  const row = (k, v) => `<tr><td style="padding:6px 0;color:#86868b;font-size:13px;width:42%">${k}</td><td style="padding:6px 0;color:#1d1d1f;font-size:13px;font-weight:600">${esc(v)}</td></tr>`;
  const subject = `Informations sur votre formation${denom ? ' - ' + denom : ''}${rdvAt ? ' · RDV le ' + rdvAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', timeZone: 'Europe/Paris' }) : ''}`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><div style="height:5px;background:#0066CC"></div><div style="padding:22px 26px 6px;text-align:center;border-bottom:1px solid #f0f0f2"><img src="${PUBLIC_BASE}/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png" alt="Delivery Digital" style="height:38px;width:auto" /></div><div style="padding:26px">`
    + `<p style="font-size:18px;font-weight:800;color:#1d1d1f;margin:0 0 12px">Informations sur votre formation</p>`
    + `<p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 16px">Bonjour,<br><br>Voici les informations concernant votre formation ${formationTitle ? '<strong>' + esc(formationTitle) + '</strong> ' : ''}${denom ? 'pour <strong>' + esc(denom) + '</strong>' : ''}, ainsi que les prochaines étapes.</p>`
    + (rdvStr ? `<div style="background:#0066CC0d;border:1px solid #0066CC33;border-radius:12px;padding:14px 16px;margin:0 0 16px"><p style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#0066CC;font-weight:700;margin:0 0 4px">Rendez-vous de finalisation du dossier</p><p style="font-size:16px;color:#1d1d1f;font-weight:800;margin:0;text-transform:capitalize">${esc(rdvStr)}</p></div>` : '')
    + `<p style="font-size:13px;font-weight:700;color:#1d1d1f;margin:14px 0 6px">Déroulé de la formation</p><table style="width:100%;border-collapse:collapse;margin:0 0 8px">${row('Durée', '21 heures sur 3 jours')}${row('Chaque jour', '1 h en visioconférence avec le formateur + 6 h en situation de travail')}${row('Modalité', 'Visioconférence (créneau au choix) + mise en pratique dans votre établissement')}${row('Financement', "Pris en charge par votre OPCO - aucun reste à charge")}</table>`
    + `<p style="font-size:13px;font-weight:700;color:#1d1d1f;margin:14px 0 6px">À préparer pour le rendez-vous</p><ul style="font-size:13px;color:#3a3a3c;line-height:1.5;margin:0 0 8px;padding-left:18px">${li}</ul>`
    + `<div style="background:#0066CC0d;border:1px solid #0066CC22;border-radius:12px;padding:14px 16px;margin:14px 0 0"><p style="font-size:13px;font-weight:700;color:#1d1d1f;margin:0 0 6px">Avant le début de la formation</p><p style="font-size:13px;color:#3a3a3c;line-height:1.6;margin:0 0 6px">Vous recevrez par email vos <strong>convocations officielles</strong> ainsi que <strong>2 questionnaires à compléter</strong> avant le démarrage de la formation :</p><ul style="font-size:13px;color:#3a3a3c;line-height:1.5;margin:0;padding-left:18px"><li style="margin:0 0 4px">Questionnaire «&nbsp;Évaluation des attentes de l&apos;apprenant&nbsp;»</li><li style="margin:0 0 4px">Questionnaire «&nbsp;Évaluation du positionnement de l&apos;apprenant&nbsp;»</li></ul></div>`
    + (msg ? `<div style="background:#f5f5f7;border-radius:12px;padding:14px 16px;margin:14px 0 0"><p style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#86868b;font-weight:700;margin:0 0 6px">Message de votre conseiller</p><p style="font-size:13.5px;color:#1d1d1f;line-height:1.6;margin:0;white-space:pre-line">${esc(msg)}</p></div>` : '')
    + `<p style="font-size:13px;color:#3a3a3c;line-height:1.6;margin:16px 0 0">Une <strong>question</strong> ? Répondez simplement à cet email${agencyEmail ? ` (votre conseiller Delivery Digital est en copie)` : ''}, nous vous répondrons rapidement.</p>`
    + `<p style="font-size:12px;color:#86868b;margin:18px 0 0">Delivery Digital · Organisme de formation certifié QUALIOPI</p></div></div></div>`;
  return { subject, html };
}

// Email de CONFIRMATION de formation au CLIENT (copie à l'agence) : confirme la date du RDV de
// finalisation du dossier, explique le déroulé de la formation, ce qu'il doit préparer, et inclut
// un message / une question libre de l'agence. @author Rabah Ziane - 2026-06-24
router.post('/dossiers/:id/confirmation-email', async (req, res) => {
  const c = await ctx(req);
  const d = await AgencyDossier.findOne({ _id: req.params.id, agencyId: c.agencyId });
  if (!d) return res.status(404).json({ ok: false, error: 'not_found' });
  const b = req.body || {};
  const clientEmail = (d.clientEmail || '').trim().toLowerCase();
  if (!clientEmail) return res.status(400).json({ ok: false, error: 'no_client_email' });
  const owner = await User.findById(c.agencyId).select('email name').lean();
  const agencyEmail = owner && owner.email ? owner.email.trim().toLowerCase() : '';
  const rdvAt = b.rdvAt ? new Date(b.rdvAt) : null;
  if (rdvAt && isNaN(rdvAt.getTime())) return res.status(400).json({ ok: false, error: 'invalid_rdv' });
  try {
    const mail = buildConfirmationEmail({ denom: d.denom, formationTitle: d.formationTitle, rdvAt, message: b.message, prepText: b.prepText, agencyName: c.name, agencyEmail, ownerName: owner && owner.name });
    await getTransporter().sendMail({ from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to: clientEmail, bcc: ['contact@deliverydigital.fr', agencyEmail].filter(Boolean), replyTo: 'contact@deliverydigital.fr', subject: mail.subject, html: mail.html });
    if (rdvAt) d.rdvAt = rdvAt;
    d.confirmationEmailSentAt = new Date();
    await d.save();
    res.json({ ok: true, sentTo: [clientEmail, agencyEmail].filter(Boolean), confirmationEmailSentAt: d.confirmationEmailSentAt, rdvAt: d.rdvAt });
  } catch (e) { res.status(500).json({ ok: false, error: 'send_failed' }); }
});

// Même email de confirmation mais depuis un LEAD (client pas encore monté en dossier OPCO). Permet
// de confirmer le RDV + le déroulé avant d'avoir commencé le dossier. @author Rabah Ziane - 2026-06-25
router.post('/leads/:id/confirmation-email', async (req, res) => {
  const c = await ctx(req);
  const lead = await AgencyLead.findOne({ _id: req.params.id, agencyId: c.agencyId });
  if (!lead) return res.status(404).json({ ok: false, error: 'not_found' });
  const b = req.body || {};
  const clientEmail = (lead.email || '').trim().toLowerCase();
  if (!clientEmail) return res.status(400).json({ ok: false, error: 'no_client_email' });
  const owner = await User.findById(c.agencyId).select('email name').lean();
  const agencyEmail = owner && owner.email ? owner.email.trim().toLowerCase() : '';
  const rdvAt = b.rdvAt ? new Date(b.rdvAt) : null;
  if (rdvAt && isNaN(rdvAt.getTime())) return res.status(400).json({ ok: false, error: 'invalid_rdv' });
  try {
    const mail = buildConfirmationEmail({ denom: lead.denom, formationTitle: '', rdvAt, message: b.message, prepText: b.prepText, agencyName: c.name, agencyEmail, ownerName: owner && owner.name });
    await getTransporter().sendMail({ from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to: clientEmail, bcc: ['contact@deliverydigital.fr', agencyEmail].filter(Boolean), replyTo: 'contact@deliverydigital.fr', subject: mail.subject, html: mail.html });
    if (rdvAt) lead.rdvAt = rdvAt;
    lead.confirmationEmailSentAt = new Date();
    await lead.save();
    res.json({ ok: true, sentTo: [clientEmail, agencyEmail].filter(Boolean), confirmationEmailSentAt: lead.confirmationEmailSentAt, rdvAt: lead.rdvAt });
  } catch (e) { res.status(500).json({ ok: false, error: 'send_failed' }); }
});

// Envoi au client d'un lien de signature de la convention a distance (signature au doigt).
// Cree une demande ConventionSignRequest + email avec le lien securise. @author Rabah Ziane - 2026-06-04
router.post('/sign-link', async (req, res) => {
  const c = await ctx(req);
  const b = req.body || {};
  const viaWhatsapp = b.noEmail || b.channel === 'whatsapp';
  // Destinataire de la convention : le gérant signataire en priorité, sinon l'email principal. @Rabah 2026-06-18
  const managerEmail = (b.managerEmail || '').trim().toLowerCase();
  const recipient = managerEmail || (b.clientEmail || '').trim().toLowerCase();
  if (!recipient && !viaWhatsapp) return res.status(400).json({ ok: false, error: 'client_email_required' });
  if (!b.denom) return res.status(400).json({ ok: false, error: 'denom_required' });
  const salaries = Array.isArray(b.salaries) ? b.salaries.filter((s) => s && s.firstname && s.lastname) : [];
  if (salaries.length === 0) return res.status(400).json({ ok: false, error: 'salaries_required' });
  const token = crypto.randomBytes(24).toString('hex');
  await ConventionSignRequest.create({
    token, agencyId: c.agencyId, agencyName: c.name,
    commercialId: c.commercialId || undefined, commercialName: c.isOwner ? undefined : c.name,
    leadId: b.leadId || undefined, editDossierId: b.dossierId || undefined,
    denom: b.denom, siret: b.siret, opco: b.opco, addr: b.addr, clientEmail: b.clientEmail, managerEmail: managerEmail || undefined,
    formationTitle: b.formationTitle, sessionName: b.sessionName,
    sessionStart: b.startAt ? new Date(b.startAt) : undefined, sessionEnd: b.endAt ? new Date(b.endAt) : undefined,
    salaries, amountHT: b.amountHT != null ? Math.round(Number(b.amountHT)) : 525 * salaries.length, status: 'pending',
    expiresAt: new Date(Date.now() + 30 * 86400000),
  });
  const link = `${PUBLIC_BASE}/signer/${token}`;
  // Agence en copie cachée (BCC) ; réponses du client renvoyées à DDN/contact@deliverydigital.fr (replyTo). @Rabah 2026-06-25
  const ownerC = await User.findById(c.agencyId).select('email').lean();
  const agencyEmailC = ownerC && ownerC.email ? ownerC.email.trim().toLowerCase() : '';
  // channel 'whatsapp' (ou noEmail) : on ne fait que créer + renvoyer le lien (envoi via WhatsApp côté agence).
  if (!b.noEmail && b.channel !== 'whatsapp' && recipient) {
    try {
      await getTransporter().sendMail({
        from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to: recipient, bcc: ['contact@deliverydigital.fr', agencyEmailC].filter(Boolean), replyTo: 'contact@deliverydigital.fr',
        subject: `Signature de votre convention de formation - ${b.denom}`,
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><div style="height:5px;background:#0066CC"></div><div style="padding:22px 26px 6px;text-align:center;border-bottom:1px solid #f0f0f2"><img src="${PUBLIC_BASE}/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png" alt="Delivery Digital" style="height:38px;width:auto" /></div><div style="padding:26px"><p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 16px">Bonjour,<br><br>Votre <strong>convention de formation professionnelle</strong> a été préparée. Vous pouvez la lire et la signer directement depuis votre téléphone, au doigt, en quelques secondes.</p><a href="${link}" style="display:inline-block;background:#0066CC;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:999px">Lire et signer ma convention</a><p style="font-size:12px;color:#86868b;margin:18px 0 0">Lien sécurisé, valable 30 jours. Signature électronique de même valeur juridique qu'une signature manuscrite (Code civil, art. 1367).</p></div><div style="padding:14px 26px;border-top:1px solid #f0f0f2;background:#fafafa"><p style="margin:0;font-size:11px;color:#86868b">Delivery Digital Nice · Organisme de formation certifié QUALIOPI</p></div></div></div>`,
      });
    } catch (e) { /* email best effort */ }
  }
  res.json({ ok: true, link });
});

/* === Demandes d'acces client === */
router.get('/access-requests', async (req, res) => {
  const c = await ctx(req);
  const q = c.isOwner ? { agencyId: c.agencyId } : { agencyId: c.agencyId, commercialId: c.commercialId };
  const rows = await AccessRequest.find(q).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, requests: rows.map((r) => ({ id: r._id, clientEmail: r.clientEmail, clientName: r.clientName, label: r.label, status: r.status, createdAt: r.createdAt, receivedAt: r.receivedAt })) });
});
router.post('/access-requests', async (req, res) => {
  const c = await ctx(req);
  const clientEmail = (req.body.clientEmail || '').trim().toLowerCase();
  const clientName = (req.body.clientName || '').trim();
  const label = (req.body.label || 'Accès à votre compte').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) return res.status(400).json({ ok: false, error: 'invalid_client_email' });
  const token = crypto.randomBytes(24).toString('base64url');
  const cr = await AccessRequest.create({ token, agencyId: c.agencyId, agencyName: c.name, commercialId: c.commercialId || undefined, clientEmail, clientName: clientName || undefined, label, status: 'pending', expiresAt: new Date(Date.now() + 30 * 86400000) });
  // Dossier « monté par DD » : le client ne transmet AUCUN identifiant, il valide la demande de
  // prise en charge sur SON PROPRE espace AKTO. Email dédié (aucune page /acces/). @Rabah 2026-07-10
  if (/validation dossier akto/i.test(label)) {
    let emailSent = false;
    try {
      await getTransporter().sendMail({
        from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to: clientEmail, bcc: 'contact@deliverydigital.fr', replyTo: 'contact@deliverydigital.fr',
        subject: 'Validez votre dossier de formation sur votre espace AKTO',
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px"><div style="max-width:540px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><div style="height:5px;background:#0066CC"></div><div style="padding:22px 26px 6px;text-align:center;border-bottom:1px solid #f0f0f2"><img src="${PUBLIC_BASE}/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png" alt="Delivery Digital" style="height:38px;width:auto" /></div><div style="padding:26px"><p style="font-size:18px;font-weight:800;color:#1d1d1f;margin:0 0 12px">Une dernière étape, depuis votre espace AKTO</p><p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 14px">Bonjour,<br><br>Delivery Digital a <strong>monté votre dossier de prise en charge</strong> auprès d'AKTO. Vous n'avez <strong>aucun code ni identifiant à nous transmettre</strong> : il vous suffit de valider la demande depuis <strong>votre propre espace AKTO</strong>.</p><ol style="font-size:14px;color:#3a3a3c;line-height:1.7;margin:0 0 16px;padding-left:20px"><li>Connectez-vous à votre espace employeur AKTO : <a href="https://monespace.akto.fr" style="color:#0066CC">monespace.akto.fr</a></li><li>Rubrique <strong>« Mes formations »</strong> / <strong>« Demandes de prise en charge »</strong></li><li>Retrouvez la demande préparée par Delivery Digital et cliquez sur <strong>« Valider »</strong>.</li></ol><p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 8px">La validation se fait <strong>chez vous, sur votre compte AKTO</strong> - vous restez seul détenteur de vos accès.</p><p style="font-size:13px;color:#3a3a3c;line-height:1.6;margin:14px 0 0">Une question ? Répondez simplement à cet email.</p><p style="font-size:12px;color:#86868b;margin:18px 0 0">Delivery Digital · Organisme de formation certifié QUALIOPI</p></div></div></div>`,
        text: `Bonjour,\n\nDelivery Digital a monté votre dossier de prise en charge auprès d'AKTO. Vous n'avez aucun code ni identifiant à nous transmettre : validez la demande depuis votre propre espace AKTO.\n\n1. Connectez-vous : https://monespace.akto.fr\n2. Rubrique \"Mes formations\" / \"Demandes de prise en charge\"\n3. Retrouvez la demande préparée par Delivery Digital et cliquez sur \"Valider\".\n\nLa validation se fait sur votre compte AKTO ; vous restez seul détenteur de vos accès.\n\nDelivery Digital - Organisme de formation certifié QUALIOPI`,
      });
      emailSent = true;
    } catch (e) { console.error('akto-validation mail failed:', e.message); }
    return res.json({ ok: true, request: { id: cr._id, status: cr.status }, emailSent });
  }
  const url = `${PUBLIC_BASE}/acces/${token}`;
  let emailSent = false;
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to: clientEmail, bcc: 'contact@deliverydigital.fr',
      subject: 'Transmettez vos accès en toute sécurité',
      html: `<div style="font-family:-apple-system,Arial,sans-serif;max-width:520px;margin:auto;color:#1D1D1F"><p>Bonjour,</p><p>Delivery Digital a besoin de vos identifiants (<strong>${label}</strong>).</p><p>Saisissez-les sur cette page sécurisée (chiffrée AES-256). Ne transmettez jamais un mot de passe en clair par email.</p><p style="text-align:center;margin:24px 0"><a href="${url}" style="display:inline-block;padding:14px 30px;background:#1D1D1F;color:#fff;text-decoration:none;border-radius:999px;font-weight:600">Transmettre mes accès</a></p><p style="font-size:12px;color:#86868B">Ou : <a href="${url}">${url}</a></p></div>`,
      text: `Bonjour,\n\nDelivery Digital a besoin de vos identifiants (${label}).\nPage sécurisée : ${url}`,
    });
    emailSent = true;
  } catch (e) { console.error('access-request mail failed:', e.message); }
  res.json({ ok: true, request: { id: cr._id, status: cr.status }, url, emailSent });
});

// ── Tâches collaboratives sur le suivi d'un dossier (agence <-> DDN) ──────────
// L'agence crée/coche/commente des tâches par étape ; DDN fait pareil côté admin.
// Les tâches sont stockées sur le dossier et visibles des deux côtés. @Rabah 2026-07-02
async function findOwnDossier(req) {
  const c = await ctx(req);
  const q = c.isOwner ? { _id: req.params.id, agencyId: c.agencyId } : { _id: req.params.id, agencyId: c.agencyId, commercialId: c.commercialId };
  return AgencyDossier.findOne(q);
}
router.post('/dossiers/:id/tasks', async (req, res) => {
  const d = await findOwnDossier(req);
  if (!d) return res.status(404).json({ ok: false, error: 'not_found' });
  const b = req.body || {};
  if (!b.label || !String(b.label).trim()) return res.status(400).json({ ok: false, error: 'label_required' });
  const ivName = (b.intervenantName || '').trim();
  const ivEmail = (b.intervenantEmail || '').trim().toLowerCase();
  d.tasks.push({ step: b.step || 'transmis', assignedTo: b.assignedTo === 'ddn' ? 'ddn' : 'agence', label: String(b.label).trim(), comment: (b.comment || '').trim(), createdBy: 'agence', done: false, intervenantName: ivName || undefined, intervenantEmail: ivEmail || undefined });
  await d.save();
  if (b.notify && ivEmail) { try { await sendTaskNotif({ to: ivEmail, name: ivName, denom: d.denom, label: String(b.label).trim(), step: b.step, comment: (b.comment || '').trim() }); } catch (e) { /* best effort */ } }
  res.json({ ok: true, tasks: d.tasks });
});
router.patch('/dossiers/:id/tasks/:taskId', async (req, res) => {
  const d = await findOwnDossier(req);
  if (!d) return res.status(404).json({ ok: false, error: 'not_found' });
  const t = d.tasks.id(req.params.taskId);
  if (!t) return res.status(404).json({ ok: false, error: 'task_not_found' });
  const b = req.body || {};
  if ('done' in b) { t.done = !!b.done; t.doneBy = b.done ? 'agence' : undefined; t.doneAt = b.done ? new Date() : undefined; }
  if (typeof b.comment === 'string') t.comment = b.comment.trim();
  if (typeof b.label === 'string' && b.label.trim()) t.label = b.label.trim();
  if (b.assignedTo) t.assignedTo = b.assignedTo === 'ddn' ? 'ddn' : 'agence';
  if (b.step) t.step = b.step;
  await d.save();
  res.json({ ok: true, tasks: d.tasks });
});
router.delete('/dossiers/:id/tasks/:taskId', async (req, res) => {
  const d = await findOwnDossier(req);
  if (!d) return res.status(404).json({ ok: false, error: 'not_found' });
  d.tasks.pull(req.params.taskId);
  await d.save();
  res.json({ ok: true, tasks: d.tasks });
});

// Tâches portées par le CLIENT (lead) : disponibles sur TOUS les clients, sans dossier OPCO.
// Côté admin, un dossier lié (leadId) pointe sur ces mêmes tâches -> collaboration. @Rabah 2026-07-02
async function findOwnLead(req) {
  const c = await ctx(req);
  const q = c.isOwner ? { _id: req.params.id, agencyId: c.agencyId } : { _id: req.params.id, agencyId: c.agencyId, commercialId: c.commercialId };
  return AgencyLead.findOne(q);
}
router.post('/leads/:id/tasks', async (req, res) => {
  const l = await findOwnLead(req);
  if (!l) return res.status(404).json({ ok: false, error: 'not_found' });
  const b = req.body || {};
  if (!b.label || !String(b.label).trim()) return res.status(400).json({ ok: false, error: 'label_required' });
  const ivName = (b.intervenantName || '').trim();
  const ivEmail = (b.intervenantEmail || '').trim().toLowerCase();
  l.tasks.push({ step: b.step || 'transmis', assignedTo: b.assignedTo === 'ddn' ? 'ddn' : 'agence', label: String(b.label).trim(), comment: (b.comment || '').trim(), createdBy: 'agence', done: false, intervenantName: ivName || undefined, intervenantEmail: ivEmail || undefined });
  await l.save();
  if (b.notify && ivEmail) { try { await sendTaskNotif({ to: ivEmail, name: ivName, denom: l.denom, label: String(b.label).trim(), step: b.step, comment: (b.comment || '').trim() }); } catch (e) { /* best effort */ } }
  res.json({ ok: true, tasks: l.tasks });
});
router.patch('/leads/:id/tasks/:taskId', async (req, res) => {
  const l = await findOwnLead(req);
  if (!l) return res.status(404).json({ ok: false, error: 'not_found' });
  const t = l.tasks.id(req.params.taskId);
  if (!t) return res.status(404).json({ ok: false, error: 'task_not_found' });
  const b = req.body || {};
  if ('done' in b) { t.done = !!b.done; t.doneBy = b.done ? 'agence' : undefined; t.doneAt = b.done ? new Date() : undefined; }
  if (typeof b.comment === 'string') t.comment = b.comment.trim();
  if (typeof b.label === 'string' && b.label.trim()) t.label = b.label.trim();
  if (b.assignedTo) t.assignedTo = b.assignedTo === 'ddn' ? 'ddn' : 'agence';
  if (b.step) t.step = b.step;
  await l.save();
  res.json({ ok: true, tasks: l.tasks });
});
router.delete('/leads/:id/tasks/:taskId', async (req, res) => {
  const l = await findOwnLead(req);
  if (!l) return res.status(404).json({ ok: false, error: 'not_found' });
  l.tasks.pull(req.params.taskId);
  await l.save();
  res.json({ ok: true, tasks: l.tasks });
});

/* ----------------------------------- Revente Pyemes -----------------------------------
 * L'agence revend Pyemes. Ces routes appellent l'API Pyemes (serveur a serveur, x-admin-secret)
 * pour rapatrier ses ventes/commissions et gerer son onboarding Stripe Connect. Reserve au
 * proprietaire d'agence. @author Rabah Ziane - 2026-08-01 */
const PYEMES_API = process.env.PYEMES_API || 'https://pyemes.com/api/agence';
const PYEMES_SECRET = process.env.PYEMES_ADMIN_SECRET || '';

async function pyemes(path, { method = 'GET', body } = {}) {
  const r = await fetch(`${PYEMES_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': PYEMES_SECRET },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

// Recap des ventes + commissions Pyemes de l'agence (a venir / disponible / paye).
router.get('/pyemes', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  const code = c.me.pyemesCode;
  if (!code) return res.json({ ok: true, active: false }); // agence pas encore reliee a Pyemes
  const lien = `https://pyemes.com/inscription?ag=${encodeURIComponent(code)}`;
  const contract = { signed: Boolean(c.me.pyemesContract?.signed), signedAt: c.me.pyemesContract?.signedAt || null, signedBy: c.me.pyemesContract?.signedBy || null };
  // On ne renvoie jamais le `token` (secret du lien tracké) ; seulement l'état d'ouverture.
  const pitches = (c.me.pyemesPitches || []).slice(-30).reverse()
    .map((p) => ({ id: String(p._id), to: p.to, template: p.template, at: p.at, openedAt: p.openedAt || null, clientName: p.clientName || '', siret: p.siret || '' }));
  const { status, j } = await pyemes(`/agences/${encodeURIComponent(code)}/commissions`);
  if (status !== 200 || !j.ok) return res.json({ ok: true, active: true, code, lien, contract, pitches, erreur: j.error || 'pyemes_indisponible' });
  res.json({ ok: true, active: true, code, lien, contract, pitches, ...j });
});

// Détection auto d'une entreprise (nom ou SIRET) via l'annuaire officiel recherche-entreprises
// (data.gouv). Proxy serveur (pas de CORS, pas de clé). Renvoie nom + SIRET du siège pour
// pré-remplir le formulaire d'envoi. @author Rabah Ziane - 2026-08-01
router.get('/pyemes/recherche-entreprise', async (req, res) => {
  const q = String(req.query?.q || '').trim();
  if (q.length < 3) return res.json({ ok: true, resultats: [] });
  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&per_page=6&page=1`;
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (!r.ok) return res.json({ ok: true, resultats: [] });
    const j = await r.json();
    const resultats = (j?.results || []).map((e) => ({
      nom: e.nom_complet || e.nom_raison_sociale || '',
      siret: e.siege?.siret || '',
      siren: e.siren || '',
      ville: e.siege?.libelle_commune || e.siege?.commune || '',
      naf: e.activite_principale || '',
    })).filter((e) => e.nom);
    res.json({ ok: true, resultats });
  } catch { res.json({ ok: true, resultats: [] }); }
});

// Signature de l'avenant « Revente Pyemes » (30% TTC). Debloque le lien de vente + Stripe.
router.post('/pyemes/contract/sign', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  const signedBy = String(req.body?.signedBy || '').trim();
  const signedFunction = String(req.body?.signedFunction || '').trim();
  if (!signedBy || !signedFunction) return res.status(400).json({ ok: false, error: 'nom_fonction_requis' });
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
  await User.findByIdAndUpdate(c.me._id, { pyemesContract: { signed: true, signedBy, signedFunction, signedAt: new Date(), signedIp: ip } });
  res.json({ ok: true });
});

/* ─────────────────────────── FEUILLE DE ROUTE PYEMES ───────────────────────────
   Espace partage entre Delivery Digital et l'agence, AVANT la mise en ligne :
     - des taches que chacun peut demander a l'autre (DD -> agence, agence -> DD),
     - l'import d'une checklist existante (PDF, texte, CSV, Markdown),
     - un fil de messages pour en discuter au meme endroit.
   Les donnees vivent sur le document de l'agence (User.pyemesRoadmap / pyemesMessages) ; le cote
   Delivery Digital passe par agencyAdmin.js et ecrit dans les MEMES champs.
   @author Rabah Ziane - 2026-08-31 */

const upImport = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Captures jointes aux messages -> uploads/agency-chat (servi sur /uploads), meme mecanique que
// les commentaires de l'espace client (clientSpace.js). @Rabah 2026-08-31
const CHAT_UP_DIR = 'uploads/agency-chat';
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => { fs.mkdirSync(CHAT_UP_DIR, { recursive: true }); cb(null, CHAT_UP_DIR); },
  filename: (req, file, cb) => cb(null, `${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname || '.png')}`),
});
const chatUpload = multer({ storage: chatStorage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)) });

// Transforme un texte de checklist en taches : une ligne = une tache. On enleve les puces
// (-, *, •, 1., [ ], [x]) et on ignore les lignes vides ou trop courtes (titres de section).
export function lignesEnTaches(texte, source) {
  const lignes = String(texte || '').split(/\r?\n/);
  const taches = [];
  for (const brute of lignes) {
    let l = brute.replace(/\s+/g, ' ').trim();
    if (!l) continue;
    const coche = /^\[\s*[xX]\s*\]/.test(l);
    l = l.replace(/^[-*•▪·]\s*/, '').replace(/^\d+[.)]\s*/, '').replace(/^\[\s*[xX ]?\s*\]\s*/, '').trim();
    if (l.length < 3 || l.length > 200) continue;
    taches.push({ from: 'agence', titre: l, statut: coche ? 'fait' : 'a_faire', source, createdAt: new Date(), doneAt: coche ? new Date() : undefined });
  }
  return taches;
}

const vueRoadmap = (u) => ({
  taches: (u.pyemesRoadmap || []).map((t) => ({
    id: String(t._id), from: t.from || 'dd', titre: t.titre || '', detail: t.detail || '',
    statut: t.statut || 'a_faire', source: t.source || '', createdAt: t.createdAt, doneAt: t.doneAt || null,
    phase: t.phase || '', echeance: t.echeance || '', resp: t.resp || '', critere: t.critere || '', ref: t.ref || '', ordre: t.ordre ?? null,
  })),
  messages: (u.pyemesMessages || []).map((m) => ({
    id: String(m._id), from: m.from || 'dd', auteur: m.auteur || '', texte: m.texte || '', image: m.image || '', at: m.at,
  })),
});

router.get('/pyemes/roadmap', async (req, res) => {
  const c = await ctx(req);
  const u = await User.findById(c.agencyId, { pyemesRoadmap: 1, pyemesMessages: 1 }).lean();
  res.json({ ok: true, ...vueRoadmap(u || {}) });
});

// L'agence demande une tache a Delivery Digital (ou note une tache pour elle-meme).
router.post('/pyemes/roadmap', async (req, res) => {
  const c = await ctx(req);
  const titre = String(req.body?.titre || '').trim();
  if (!titre) return res.status(400).json({ ok: false, error: 'titre_requis' });
  const tache = { from: 'agence', titre: titre.slice(0, 200), detail: String(req.body?.detail || '').trim().slice(0, 2000), statut: 'a_faire', source: 'manuel', createdAt: new Date() };
  await User.updateOne({ _id: c.agencyId }, { $push: { pyemesRoadmap: tache } });
  const u = await User.findById(c.agencyId, { pyemesRoadmap: 1, pyemesMessages: 1 }).lean();
  res.json({ ok: true, ...vueRoadmap(u) });
});

// Avancement d'une tache : chacun peut cocher, la feuille de route est commune.
router.patch('/pyemes/roadmap/:id', async (req, res) => {
  const c = await ctx(req);
  const statut = String(req.body?.statut || '');
  if (!['a_faire', 'en_cours', 'fait', 'standby'].includes(statut)) return res.status(400).json({ ok: false, error: 'statut_invalide' });
  await User.updateOne(
    { _id: c.agencyId, 'pyemesRoadmap._id': req.params.id },
    { $set: { 'pyemesRoadmap.$.statut': statut, 'pyemesRoadmap.$.doneAt': statut === 'fait' ? new Date() : null } },
  );
  const u = await User.findById(c.agencyId, { pyemesRoadmap: 1, pyemesMessages: 1 }).lean();
  res.json({ ok: true, ...vueRoadmap(u) });
});

// L'agence ne retire que SES propres lignes (une demande de DD ne disparait pas de son cote).
router.delete('/pyemes/roadmap/:id', async (req, res) => {
  const c = await ctx(req);
  await User.updateOne({ _id: c.agencyId }, { $pull: { pyemesRoadmap: { _id: req.params.id, from: 'agence' } } });
  const u = await User.findById(c.agencyId, { pyemesRoadmap: 1, pyemesMessages: 1 }).lean();
  res.json({ ok: true, ...vueRoadmap(u) });
});

/* ── IDENTIFIANTS DES RESEAUX SOCIAUX (action #8) ───────────────────────────────────────────────
   Pyemes ouvre les comptes, Nova les anime. Les mots de passe sont CHIFFRES en base et ne sortent
   jamais avec la liste : il faut les demander un par un, ce qui laisse une trace d'intention et
   evite qu'un ecran partage expose tout d'un coup. @author Rabah Ziane - 2026-09-01 */
const cleReseaux = () => crypto.createHash('sha256').update(String(process.env.ADMIN_SECRET || 'pyemes')).digest();
export function chiffrerSecret(clair) {
  if (!clair) return '';
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', cleReseaux(), iv);
  const donnees = Buffer.concat([c.update(String(clair), 'utf8'), c.final()]);
  return `${iv.toString('hex')}:${c.getAuthTag().toString('hex')}:${donnees.toString('hex')}`;
}
export function dechiffrerSecret(chiffre) {
  try {
    const [iv, tag, donnees] = String(chiffre || '').split(':');
    if (!iv || !tag || !donnees) return '';
    const d = crypto.createDecipheriv('aes-256-gcm', cleReseaux(), Buffer.from(iv, 'hex'));
    d.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([d.update(Buffer.from(donnees, 'hex')), d.final()]).toString('utf8');
  } catch { return ''; }
}

// La liste ne porte JAMAIS le mot de passe, seulement le fait qu'il existe.
export const vueReseaux = (u) => ({
  reseaux: (u.pyemesReseaux || []).map((r) => ({
    id: String(r._id), reseau: r.reseau || 'autre', compte: r.compte || '',
    identifiant: r.identifiant || '', aSecret: !!r.secret, note: r.note || '',
    majPar: r.majPar || '', majLe: r.majLe,
  })),
});

router.get('/pyemes/reseaux', async (req, res) => {
  const c = await ctx(req);
  const u = await User.findById(c.agencyId, { pyemesReseaux: 1 }).lean();
  res.json({ ok: true, ...vueReseaux(u) });
});

router.post('/pyemes/reseaux', async (req, res) => {
  const c = await ctx(req);
  const reseau = String(req.body?.reseau || '').trim().toLowerCase().slice(0, 20);
  const identifiant = String(req.body?.identifiant || '').trim().slice(0, 160);
  if (!reseau || !identifiant) return res.status(400).json({ ok: false, error: 'champs_manquants' });
  await User.updateOne({ _id: c.agencyId }, { $push: { pyemesReseaux: {
    reseau, compte: String(req.body?.compte || '').trim().slice(0, 80), identifiant,
    secret: chiffrerSecret(req.body?.motDePasse), note: String(req.body?.note || '').trim().slice(0, 400),
    majPar: String(req.body?.auteur || c.name || '').slice(0, 80), majLe: new Date(),
  } } });
  const u = await User.findById(c.agencyId, { pyemesReseaux: 1 }).lean();
  res.json({ ok: true, ...vueReseaux(u) });
});

// Revelation d'UN mot de passe, a la demande.
router.get('/pyemes/reseaux/:id/secret', async (req, res) => {
  const c = await ctx(req);
  const u = await User.findById(c.agencyId, { pyemesReseaux: 1 }).lean();
  const r = (u?.pyemesReseaux || []).find((x) => String(x._id) === req.params.id);
  if (!r) return res.status(404).json({ ok: false, error: 'introuvable' });
  console.log(`[reseaux] mot de passe ${r.reseau} consulte par l'agence ${c.agencyId}`);
  res.json({ ok: true, motDePasse: dechiffrerSecret(r.secret) });
});

router.delete('/pyemes/reseaux/:id', async (req, res) => {
  const c = await ctx(req);
  await User.updateOne({ _id: c.agencyId }, { $pull: { pyemesReseaux: { _id: req.params.id } } });
  const u = await User.findById(c.agencyId, { pyemesReseaux: 1 }).lean();
  res.json({ ok: true, ...vueReseaux(u) });
});

/* ── RETOURS CLIENTS (colonne partagee, action #4) ──────────────────────────────────────────────
   La meme liste des deux cotes : l'agence saisit ce que remontent les testeurs, Delivery Digital
   et Pyemes lisent, repondent et referment. @author Rabah Ziane - 2026-09-01 */
const vueRetours = (u) => ({
  retours: (u.pyemesRetours || []).map((r) => ({
    id: String(r._id), from: r.from || 'agence', auteur: r.auteur || '', client: r.client || '',
    texte: r.texte || '', gravite: r.gravite || 'genant', statut: r.statut || 'nouveau',
    reponse: r.reponse || '', createdAt: r.createdAt, traiteLe: r.traiteLe || null,
  })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
});

router.get('/pyemes/retours', async (req, res) => {
  const c = await ctx(req);
  const u = await User.findById(c.agencyId, { pyemesRetours: 1 }).lean();
  res.json({ ok: true, ...vueRetours(u) });
});

router.post('/pyemes/retours', async (req, res) => {
  const c = await ctx(req);
  const texte = String(req.body?.texte || '').trim();
  if (!texte) return res.status(400).json({ ok: false, error: 'retour_vide' });
  const gravite = ['bloquant', 'genant', 'idee'].includes(req.body?.gravite) ? req.body.gravite : 'genant';
  await User.updateOne({ _id: c.agencyId }, { $push: { pyemesRetours: {
    from: 'agence', auteur: String(req.body?.auteur || c.name || '').slice(0, 80),
    client: String(req.body?.client || '').trim().slice(0, 120),
    texte: texte.slice(0, 2000), gravite, statut: 'nouveau', createdAt: new Date(),
  } } });
  const u = await User.findById(c.agencyId, { pyemesRetours: 1 }).lean();
  res.json({ ok: true, ...vueRetours(u) });
});

router.patch('/pyemes/retours/:id', async (req, res) => {
  const c = await ctx(req);
  const statut = String(req.body?.statut || '');
  if (!['nouveau', 'en_cours', 'traite', 'ecarte'].includes(statut)) return res.status(400).json({ ok: false, error: 'statut_invalide' });
  const set = { 'pyemesRetours.$.statut': statut, 'pyemesRetours.$.traiteLe': ['traite', 'ecarte'].includes(statut) ? new Date() : null };
  if (typeof req.body?.reponse === 'string') set['pyemesRetours.$.reponse'] = req.body.reponse.trim().slice(0, 2000);
  await User.updateOne({ _id: c.agencyId, 'pyemesRetours._id': req.params.id }, { $set: set });
  const u = await User.findById(c.agencyId, { pyemesRetours: 1 }).lean();
  res.json({ ok: true, ...vueRetours(u) });
});

// Reordonnancement (glisser-deposer) : le front envoie les identifiants dans le NOUVEL ordre, on
// reecrit le champ `ordre` de chacun. On ne deplace que ce qui est envoye, le reste ne bouge pas.
// @author Rabah Ziane - 2026-09-01
router.patch('/pyemes/roadmap-ordre', async (req, res) => {
  const c = await ctx(req);
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 400) : [];
  if (!ids.length) return res.status(400).json({ ok: false, error: 'ordre_vide' });
  const ops = ids.map((id, i) => ({
    updateOne: { filter: { _id: c.agencyId, 'pyemesRoadmap._id': id }, update: { $set: { 'pyemesRoadmap.$.ordre': i + 1 } } },
  }));
  await User.bulkWrite(ops, { ordered: false });
  const u = await User.findById(c.agencyId, { pyemesRoadmap: 1, pyemesMessages: 1 }).lean();
  res.json({ ok: true, ...vueRoadmap(u) });
});

// Import d'une checklist existante : PDF, texte, CSV ou Markdown. Une ligne = une tache.
router.post('/pyemes/roadmap/import', upImport.single('fichier'), async (req, res) => {
  const c = await ctx(req);
  const f = req.file;
  if (!f) return res.status(400).json({ ok: false, error: 'fichier_requis' });
  let texte = '';
  try {
    if (/pdf/i.test(f.mimetype) || /\.pdf$/i.test(f.originalname)) {
      // On charge le module interne : `require('pdf-parse')` execute un bloc de debug qui lit un
      // PDF de test absent en production -> l'import echouait systematiquement. @Rabah 2026-08-31
      const pdfParse = requireCjs('pdf-parse/lib/pdf-parse.js');
      const data = await pdfParse(f.buffer);
      texte = data.text || '';
    } else {
      texte = f.buffer.toString('utf8');
    }
  } catch (e) {
    console.error('import checklist:', e?.message || e);
    return res.status(400).json({ ok: false, error: 'lecture_impossible', detail: String(e?.message || e).slice(0, 200) });
  }
  const taches = lignesEnTaches(texte, `import: ${f.originalname}`);
  if (!taches.length) return res.status(400).json({ ok: false, error: 'aucune_tache_trouvee' });
  await User.updateOne({ _id: c.agencyId }, { $push: { pyemesRoadmap: { $each: taches.slice(0, 200) } } });
  const u = await User.findById(c.agencyId, { pyemesRoadmap: 1, pyemesMessages: 1 }).lean();
  res.json({ ok: true, ajoutees: Math.min(taches.length, 200), ...vueRoadmap(u) });
});

/* ───────────── PUBLICATIONS RESEAUX SOCIAUX (validation avant publication) ─────────────
   L'agence depose sa video, indique OU elle sera publiee et le texte de la publication. Cote
   Pyemes on valide (ou on demande une modif) AVANT qu'elle parte. Une video deposee = l'agence la
   considere prete de son cote. @author Rabah Ziane - 2026-08-31 */

const SOCIAL_UP_DIR = 'uploads/agency-social';
const socialStorage = multer.diskStorage({
  destination: (req, file, cb) => { fs.mkdirSync(SOCIAL_UP_DIR, { recursive: true }); cb(null, SOCIAL_UP_DIR); },
  filename: (req, file, cb) => cb(null, `${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname || '.mp4')}`),
});
const socialUpload = multer({
  storage: socialStorage,
  limits: { fileSize: 300 * 1024 * 1024 },  // 300 Mo : une video verticale de 60 s passe large
  fileFilter: (req, file, cb) => cb(null, /^video\//.test(file.mimetype)),
});

const RESEAUX_OK = ['instagram', 'tiktok', 'linkedin', 'facebook', 'youtube', 'x'];

// Comptes de publication : on repere les identifiants au « @ » (dans le champ dedie ET dans le
// texte de la publication), on deduplique, on garde la casse d'origine. @Rabah 2026-08-31
const comptesDepuis = (...sources) => {
  const vus = new Map();
  for (const src of sources) {
    for (const m of String(src || '').matchAll(/@([A-Za-z0-9._-]{2,30})/g)) {
      const cle = m[1].toLowerCase();
      if (!vus.has(cle)) vus.set(cle, `@${m[1]}`);
    }
  }
  return [...vus.values()].slice(0, 10);
};

const vuePublications = (u) => (u?.pyemesSocials || []).map((p) => ({
  id: String(p._id), fichier: p.fichier || '', nomFichier: p.nomFichier || '', taille: p.taille || 0,
  reseaux: p.reseaux || [], comptes: p.comptes || [], datePrevue: p.datePrevue || null, texte: p.texte || '',
  statut: p.statut || 'a_valider', retour: p.retour || '', decidePar: p.decidePar || '',
  decideLe: p.decideLe || null, createdAt: p.createdAt,
})).reverse();

router.get('/pyemes/publications', async (req, res) => {
  const c = await ctx(req);
  const u = await User.findById(c.agencyId, { pyemesSocials: 1 }).lean();
  res.json({ ok: true, publications: vuePublications(u) });
});

router.post('/pyemes/publications', socialUpload.single('video'), async (req, res) => {
  const c = await ctx(req);
  if (!req.file) return res.status(400).json({ ok: false, error: 'video_requise' });
  const reseaux = String(req.body?.reseaux || '').split(',').map((r) => r.trim().toLowerCase()).filter((r) => RESEAUX_OK.includes(r));
  if (!reseaux.length) return res.status(400).json({ ok: false, error: 'reseau_requis' });
  const doc = {
    comptes: comptesDepuis(req.body?.comptes, req.body?.texte),
    fichier: `/uploads/agency-social/${req.file.filename}`,
    nomFichier: String(req.file.originalname || '').slice(0, 160),
    taille: req.file.size,
    reseaux,
    datePrevue: req.body?.datePrevue ? new Date(req.body.datePrevue) : null,
    texte: String(req.body?.texte || '').trim().slice(0, 4000),
    statut: 'a_valider',
    createdAt: new Date(),
  };
  await User.updateOne({ _id: c.agencyId }, { $push: { pyemesSocials: doc } });

  // On previent le cote Pyemes (boite « Agences ») + par email : c'est la que la validation se fait.
  try {
    if (c.me.pyemesCode) {
      const quand = doc.datePrevue ? new Date(doc.datePrevue).toLocaleDateString('fr-FR') : 'date non precisee';
      await pyemes('/messages', { method: 'POST', body: {
        code: c.me.pyemesCode, agence: c.name || '',
        texte: `[Publication a valider] ${reseaux.join(', ')}${doc.comptes.length ? ` (${doc.comptes.join(' ')})` : ''} - prevue le ${quand}\n\n${doc.texte}\n\nVideo : ${PUBLIC_BASE}${doc.fichier}`,
        lien: `${PUBLIC_BASE}/admin`,
      } });
    }
  } catch (e) { /* best-effort */ }
  try {
    const html = `<p><b>${esc(c.name || 'Une agence')}</b> propose une publication a valider (${esc(reseaux.join(', '))}).</p><p>${esc(doc.texte)}</p><p><a href="${PUBLIC_BASE}${doc.fichier}">Voir la video</a></p>`;
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr',
      to: process.env.PYEMES_ADMIN_EMAIL || 'contact@pyemes.com',
      cc: 'contact@deliverydigital.fr',
      subject: `Publication a valider - ${c.name || 'agence'}`,
      html,
    });
  } catch (e) { /* best-effort */ }

  const u = await User.findById(c.agencyId, { pyemesSocials: 1 }).lean();
  res.json({ ok: true, publications: vuePublications(u) });
});

// L'agence marque une publication comme PUBLIEE (apres validation) ou retire un brouillon a elle.
router.patch('/pyemes/publications/:pid', async (req, res) => {
  const c = await ctx(req);
  const statut = String(req.body?.statut || '');
  if (statut !== 'publiee') return res.status(400).json({ ok: false, error: 'statut_invalide' });
  await User.updateOne(
    { _id: c.agencyId, 'pyemesSocials._id': req.params.pid },
    { $set: { 'pyemesSocials.$.statut': 'publiee' } },
  );
  const u = await User.findById(c.agencyId, { pyemesSocials: 1 }).lean();
  res.json({ ok: true, publications: vuePublications(u) });
});

// Fil de discussion Delivery Digital <-> agence, au meme endroit que la feuille de route.
router.post('/pyemes/messages', chatUpload.single('image'), async (req, res) => {
  const c = await ctx(req);
  const texte = String(req.body?.texte || '').trim();
  const image = req.file ? `/uploads/agency-chat/${req.file.filename}` : '';
  if (!texte && !image) return res.status(400).json({ ok: false, error: 'message_vide' });
  await User.updateOne({ _id: c.agencyId }, { $push: { pyemesMessages: { from: 'agence', auteur: c.name || '', texte: texte.slice(0, 4000), image, at: new Date() } } });
  // Le message part AUSSI dans l'admin Pyemes (boite « Agences ») : c'est la qu'on suit ce chantier.
  // Serveur a serveur, best-effort. @author Rabah Ziane - 2026-08-31
  try {
    if (c.me.pyemesCode) {
      await pyemes('/messages', { method: 'POST', body: {
        code: c.me.pyemesCode, agence: c.name || '', texte,
        image: image ? `${PUBLIC_BASE}${image}` : '',
        lien: `${PUBLIC_BASE}/admin`,
      } });
    }
  } catch (e) { /* la boite Pyemes est un confort, elle ne bloque pas l'envoi */ }
  // Notification email, comme sur l'espace client : on ne decouvre pas le message trois jours plus
  // tard. Best-effort : un echec d'email ne bloque pas l'envoi. @Rabah 2026-08-31
  try {
    const html = `<p><b>${esc(c.name || 'Une agence')}</b> a écrit dans la feuille de route Pyemes :</p><p>${esc(texte) || '(capture jointe)'}</p>${image ? `<p><a href="${PUBLIC_BASE}${image}">Voir la capture</a></p>` : ''}<p><a href="${PUBLIC_BASE}/admin">Ouvrir l'admin</a></p>`;
    // Destinataire : l'admin PYEMES (c'est la qu'on suit ce chantier), avec DD en copie.
    // Reglable via PYEMES_ADMIN_EMAIL. @author Rabah Ziane - 2026-08-31
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@deliverydigital.fr',
      to: process.env.PYEMES_ADMIN_EMAIL || 'contact@pyemes.com',
      cc: 'contact@deliverydigital.fr',
      subject: `Feuille de route Pyemes - message de ${c.name || 'une agence'}`,
      html,
    });
  } catch (e) { /* notif best-effort */ }
  const u = await User.findById(c.agencyId, { pyemesRoadmap: 1, pyemesMessages: 1 }).lean();
  res.json({ ok: true, ...vueRoadmap(u) });
});

// Envoi de l'argumentaire Pyemes à un client (support de vente). L'email ne révèle jamais le nom
// de l'agence : il contient l'argumentaire + le lien de parrainage (attribution automatique).
// Argumentaires Pyemes selon le destinataire : indépendant / entreprise / comptable. @Rabah 2026-08-01
// @author Rabah Ziane - 2026-08-01 : ajout des `cartes` (grille tarifaire par audience,
// reprise à l'identique de la page publique Pyemes) affichées dans l'email sous le pitch.
const PYEMES_AUDIENCES = {
  independant: {
    label: 'Indépendant / auto-entrepreneur',
    subject: 'Pyemes pour les indépendants - votre comptabilité automatique',
    titre: 'Pour les indépendants',
    args: [
      'Connectez votre banque en 2 minutes (DSP2 sécurisé).',
      'Livre des recettes et suivi URSSAF automatiques.',
      'Aucune liasse ni TVA à gérer en franchise en base.',
      'À partir de 29 €/mois, données hébergées en France.',
    ],
    prix: '29 €/mois',
    cartes: [
      { nom: 'Micro', prix: '29 €', suffixe: '/mois TTC', note: 'Sans TVA ni liasse fiscale', hi: true,
        desc: 'Pour les auto-entrepreneurs.', cta: 'Démarrer', groupe: 'Tout compris :',
        points: ['Catégorisation automatique en continu', 'Livre des recettes', 'Suivi URSSAF automatique', 'Données hébergées en France'] },
    ],
  },
  entreprise: {
    label: 'Entreprise / société (TPE-PME)',
    subject: 'Pyemes pour votre société - comptabilité et liasses automatisées',
    titre: 'Pour les TPE & PME',
    args: [
      'Banque synchronisée, écritures catégorisées automatiquement.',
      'TVA et liasses fiscales officielles (2033, 2065) générées.',
      'Export FEC conforme, prêt en cas de contrôle.',
      'À partir de 49 €/mois - rattrapage des exercices en retard possible.',
    ],
    prix: '49 €/mois',
    cartes: [
      { nom: 'Standard', prix: '49 €', suffixe: '/mois TTC', note: '1 entreprise incluse',
        desc: 'Banque, TVA et liasses en automatique.', cta: 'Démarrer', groupe: 'Pour votre société :',
        points: ['Banque synchronisée', 'Catégorisation automatique', 'TVA et liasses (2033, 2065)', 'Export FEC conforme'] },
      { nom: 'Premium', prix: '79 €', suffixe: '/mois TTC', note: 'Rattrapage des exercices en retard', hi: true,
        desc: 'Tout Standard, plus le rattrapage.', cta: 'Démarrer', groupe: 'En plus :',
        points: ['Rattrapage des années en retard', 'Accompagnement prioritaire', 'Multi-exercices', 'Export FEC conforme'] },
    ],
  },
  comptable: {
    label: 'Comptable / cabinet',
    subject: 'Pyemes pour votre cabinet - pilotez tous vos dossiers',
    titre: 'Pour les cabinets comptables',
    args: [
      'Tableau de bord multi-clients : tous vos dossiers au même endroit.',
      'Catégorisation automatique en continu.',
      'TVA, liasses et export FEC par dossier.',
      'Tarif cabinet dégressif - 1 entreprise incluse par comptable.',
    ],
    prix: '39 €/mois',
    cartes: [
      { nom: 'Cabinet', prix: '39 €', suffixe: '/mois TTC', note: 'Par comptable · 1 entreprise incluse',
        desc: 'Tous vos dossiers clients, un seul tableau de bord.', cta: 'Démarrer', groupe: 'Pour votre cabinet :',
        points: ['Tableau de bord multi-clients', '1 entreprise incluse', 'Catégorisation automatique en continu', 'Collaborateurs illimités', 'Export FEC par dossier'] },
      { nom: 'Par entreprise', prix: '11,90 €', suffixe: '/entreprise TTC', note: 'Dégressif : 9,90 € dès 10 entreprises', hi: true,
        desc: 'Ajoutez des dossiers, le prix baisse au volume.', cta: 'Démarrer', groupe: 'Chaque entreprise supplémentaire :',
        points: ['Tarif dégressif : 9,90 € dès 10 entreprises', 'Synchronisation bancaire par dossier', 'TVA et liasses fiscales par dossier', "Révision et écritures d'OD"] },
      { nom: 'Sur mesure', prix: 'Sur mesure', suffixe: '', note: 'Sur devis', devis: true,
        desc: 'Marque blanche, API et gros volumes.', cta: 'Nous contacter', groupe: 'Pour aller plus loin :',
        points: ['Marque blanche à vos couleurs', 'API et intégrations cabinet', 'Volume négocié', 'Accompagnement dédié'] },
    ],
  },
};

/**
 * Grille tarifaire reprise À L'IDENTIQUE de la page publique Pyemes (« Des offres adaptées à votre
 * besoin ») : cartes empilées (rendu email fiable), chacune avec prix, description, bouton
 * « Démarrer », 1re fonctionnalité surlignée et carte « Populaire » violette. @Rabah 2026-08-01
 */
function cartesEmailHtml(aud, lien) {
  const cartes = aud.cartes || [];
  if (!cartes.length) return '';
  const carte = (c) => {
    const hi = !!c.hi;
    const cardBg = hi ? '#efeaff' : '#ffffff';
    const cardBd = hi ? '#c9bcff' : '#ececf0';
    const pts = (c.points || []).map((p, i) => {
      // 1re fonctionnalité surlignée (pastille violette) comme sur le site.
      if (i === 0) return `<div style="background:#eee9ff;border-radius:9px;padding:8px 10px;margin:0 0 8px;font-size:13px;color:#2c2c33;font-weight:600">${esc(p)}</div>`;
      return `<table cellpadding="0" cellspacing="0" role="presentation" style="width:100%"><tr><td style="vertical-align:top;padding:3px 8px 3px 2px"><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:#635BFF"></span></td><td style="font-size:13px;line-height:1.45;color:#3a3a42;padding:1px 0">${esc(p)}</td></tr></table>`;
    }).join('');
    const btnBg = c.devis ? '#ffffff' : '#0A0A0C';
    const btnFg = c.devis ? '#111114' : '#ffffff';
    const btnBd = c.devis ? '1px solid #d8d8de' : 'none';
    return `<div style="background:${cardBg};border:1px solid ${cardBd};border-radius:18px;padding:22px 22px;margin:0 0 14px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between">
        <span style="font-size:22px;font-weight:800;color:#111114;line-height:1.1">${esc(c.nom)}</span>
        ${hi ? '<span style="font-size:10px;font-weight:800;color:#111114;background:#ffffff;border:1px solid #e4dcff;border-radius:999px;padding:4px 10px">Populaire</span>' : ''}
      </div>
      <div style="margin:8px 0 2px"><span style="font-size:33px;font-weight:800;color:#111114">${esc(c.prix)}</span>${c.suffixe ? `<span style="font-size:14px;color:#6a6a72;font-weight:600"> ${esc(c.suffixe)}</span>` : ''}</div>
      <div style="font-size:12.5px;color:#7a7a82">${esc(c.note || '')}</div>
      <div style="font-size:13.5px;color:#3a3a42;line-height:1.5;margin:10px 0 14px">${esc(c.desc || '')}</div>
      <a href="${lien}" style="display:block;text-align:center;background:${btnBg};color:${btnFg};border:${btnBd};text-decoration:none;padding:12px;border-radius:999px;font-weight:800;font-size:13.5px">${esc(c.cta || 'Démarrer')}</a>
      <div style="font-size:10.5px;color:#9a9aa2;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin:16px 0 9px">${esc(c.groupe || '')}</div>
      ${pts}
    </div>`;
  };
  const trust = [
    ['Activation immédiate', 'En quelques minutes.'],
    ['Mensuel ou annuel', 'Engagement 12 mois sur le mensuel.'],
    ['Données en France', 'Hébergées et chiffrées.'],
  ].map(([t, s]) => `<td style="vertical-align:top;padding:0 8px 0 0;width:33%"><div style="font-size:12.5px;font-weight:800;color:#111114">${esc(t)}</div><div style="font-size:11px;color:#8a8a92;line-height:1.4">${esc(s)}</div></td>`).join('');
  return `<div style="margin-top:18px">
    <div style="font-size:20px;font-weight:800;color:#111114;margin-bottom:12px">Des offres adaptées à votre besoin</div>
    <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin-bottom:16px"><tr>${trust}</tr></table>
    ${cartes.map(carte).join('')}
    <div style="font-size:11.5px;color:#9a9aa2;text-align:center;margin-top:6px">Prix TTC. Offre mensuelle avec engagement 12 mois, ou annuelle prépayée.</div>
  </div>`;
}

/** Brochure PDF Pyemes (1 page SOMBRE façon page d'accueil : dashboard dessiné + arguments +
 *  lien). Net, à la marque, sans capture d'écran. @author Rabah Ziane - 2026-08-01 */
function brochurePdfPyemes(aud, lien) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const bufs = []; doc.on('data', (b) => bufs.push(b)); doc.on('end', () => resolve(Buffer.concat(bufs)));
    const W = doc.page.width, H = doc.page.height, PAD = 46;
    const VERT = '#5FA88C', VIOLET = '#635BFF';
    doc.rect(0, 0, W, H).fill('#0A0A0C'); // fond sombre

    // En-tête : le VRAI logo Pyemes (croix à points, dessiné en blanc) + wordmark
    const mx = PAD + 9, my = 51, rr = 9;
    doc.strokeColor('#ffffff').lineWidth(2.2)
      .moveTo(mx - rr, my).lineTo(mx + rr, my).stroke()
      .moveTo(mx, my - rr).lineTo(mx, my + rr).stroke();
    doc.fill('#ffffff');
    doc.circle(mx, my, 3.2).fill('#ffffff');
    [[mx - rr, my], [mx + rr, my], [mx, my - rr], [mx, my + rr]].forEach(([dx, dy]) => doc.circle(dx, dy, 2.6).fill('#ffffff'));
    doc.fill('#ffffff').font('Helvetica-Bold').fontSize(19).text('Pyemes', PAD + 26, 41);
    doc.fill('#8A8A94').font('Helvetica').fontSize(9.5).text('Votre comptabilité, en pilote automatique', W - PAD - 240, 46, { width: 240, align: 'right' });

    // Titre
    doc.fill('#ffffff').font('Helvetica-Bold').fontSize(25).text(aud.titre, PAD, 92, { width: W - 2 * PAD });
    let y = 150;

    // Panneau dashboard (dessiné)
    const px = PAD, pw = W - 2 * PAD, ph = 236;
    doc.roundedRect(px, y, pw, ph, 16).fill('#15161B');
    // KPI en haut
    const kpis = [['Chiffre d’affaires', '94 200 €'], ['Charges', '31 700 €'], ['Résultat', '62 500 €']];
    kpis.forEach((k, i) => {
      const kx = px + 22 + i * ((pw - 44) / 3);
      doc.fill('#7C7C88').font('Helvetica').fontSize(8.5).text(k[0], kx, y + 18);
      doc.fill(i === 2 ? VERT : '#ffffff').font('Helvetica-Bold').fontSize(15).text(k[1], kx, y + 30);
    });
    // Graphe en barres
    const bars = [6200, 5800, 7100, 6900, 8200, 9100, 12400, 7800, 8600, 9200, 6900, 6000];
    const maxB = Math.max(...bars);
    const cX = px + 24, cY = y + 66, cW = pw - 48, cH = ph - 92, bw = cW / bars.length;
    doc.strokeColor('#26272E').lineWidth(0.5).moveTo(cX, cY + cH).lineTo(cX + cW, cY + cH).stroke();
    bars.forEach((b, i) => {
      const bh = (b / maxB) * (cH - 10);
      doc.roundedRect(cX + i * bw + bw * 0.28, cY + cH - bh, bw * 0.44, bh, 2).fill(VERT);
    });

    y += ph + 26;
    // Arguments
    for (const a of aud.args) {
      doc.save();
      doc.circle(px + 5, y + 6.5, 3).fill(VERT);
      doc.restore();
      doc.fill('#D6D6DE').font('Helvetica').fontSize(11.5).text(a, px + 18, y, { width: pw - 24 });
      y = doc.y + 11;
    }

    y += 10;
    // Tarif (pilule violette)
    const tw = 210;
    doc.roundedRect(px, y, tw, 34, 17).fill(VIOLET);
    doc.fill('#ffffff').font('Helvetica-Bold').fontSize(12).text('Tarif : ' + aud.prix, px, y + 10, { width: tw, align: 'center' });
    y += 52;

    // CTA lien
    doc.fill('#ffffff').font('Helvetica-Bold').fontSize(12.5).text('Créez votre compte :', px, y);
    doc.fill('#8B85FF').font('Helvetica').fontSize(11).text(lien, px, doc.y + 3);

    // Pied de page
    doc.fill('#5A5A64').font('Helvetica').fontSize(9).text('Données hébergées et chiffrées en France - à partir de 29 €/mois.', PAD, H - 44, { width: W - 2 * PAD });
    doc.end();
  });
}

router.post('/pyemes/send-pitch', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  if (!c.me.pyemesCode) return res.status(400).json({ ok: false, error: 'agence_non_reliee' });
  const clientEmail = String(req.body?.clientEmail || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) return res.status(400).json({ ok: false, error: 'email_invalide' });
  const key = ['independant', 'entreprise', 'comptable'].includes(req.body?.audience) ? req.body.audience : 'independant';
  // Identification du client : nom d'entreprise + SIRET (14 chiffres) pour fiabiliser l'attribution.
  const clientName = String(req.body?.clientName || '').trim().slice(0, 160);
  const siretRaw = String(req.body?.siret || '').replace(/\s/g, '');
  const siret = /^\d{14}$/.test(siretRaw) ? siretRaw : '';
  const aud = PYEMES_AUDIENCES[key];
  const lien = `https://pyemes.com/inscription?ag=${encodeURIComponent(c.me.pyemesCode)}`;
  // Jeton opaque : le bouton de l'email passe par /pyemes/track pour dater l'ouverture, puis
  // redirige vers `lien`. Le lien « à copier » reste propre (une copie n'est pas traçable). @Rabah
  const token = crypto.randomBytes(12).toString('hex');
  const lienTrack = `${PUBLIC_BASE}/api/agency/self/pyemes/track?t=${token}&ag=${encodeURIComponent(c.me.pyemesCode)}`;
  // Email ORIGINAL (image validée) : carte blanche, logo Pyemes qui tourne, pitch + puces + bouton
  // noir + encart tarif (PDF joint), PUIS la grille tarifaire du site reprise à l'identique juste
  // en dessous. On ne réinvente pas le design. @author Rabah Ziane - 2026-08-01
  const html = `<style>@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');@keyframes pyspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}</style>
  <div style="font-family:'Manrope',Arial,Helvetica,sans-serif;background:#f4f4f6;padding:24px 16px">
    <div style="max-width:600px;margin:0 auto">
      <div style="background:#ffffff;border:1px solid #ececf0;border-radius:20px;overflow:hidden">
        <div style="padding:24px 30px;border-bottom:1px solid #f0f0f2">
          <img src="https://pyemes.com/icon-192.png" width="34" height="34" style="border-radius:50%;vertical-align:middle;animation:pyspin 5s linear infinite" alt="" />
          <span style="font-size:22px;font-weight:800;color:#111114;vertical-align:middle;margin-left:11px">Pyemes</span>
        </div>
        <div style="padding:26px 30px 28px">
          <h1 style="font-size:27px;font-weight:800;color:#111114;margin:0 0 16px">${esc(aud.titre)}</h1>
          <p style="font-size:15px;color:#3a3a42;margin:0 0 4px">Bonjour,</p>
          <p style="font-size:15px;color:#3a3a42;line-height:1.5;margin:0 0 16px">Suite à notre appel téléphonique, voici comment <strong style="color:#111114">Pyemes</strong> peut vous aider :</p>
          <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 22px">${aud.args.map((a) => `<tr><td style="vertical-align:top;padding:6px 12px 6px 4px;color:#111114;font-size:15px;line-height:1.5">•</td><td style="font-size:15px;line-height:1.5;color:#3a3a42;padding:4px 0">${esc(a)}</td></tr>`).join('')}</table>
          <p style="text-align:center;margin:0 0 22px"><a href="${lienTrack}" style="display:inline-block;background:#0A0A0C;color:#ffffff;text-decoration:none;padding:15px 40px;border-radius:999px;font-weight:800;font-size:15px">Créer mon compte Pyemes</a></p>
          <div style="background:#efeaff;border-radius:14px;padding:16px 18px">
            <div style="font-size:14px;font-weight:800;color:#111114;margin-bottom:4px">Tarif : ${esc(aud.prix)}</div>
            <div style="font-size:13px;color:#5a5a64;line-height:1.5">Données hébergées et chiffrées en France. Une présentation complète est jointe en PDF.</div>
          </div>
          <p style="font-size:12.5px;color:#8a8a92;margin:16px 0 0">Ou copiez ce lien : <a href="${lien}" style="color:#635BFF">${lien}</a></p>
        </div>
      </div>
      <div style="background:#ffffff;border:1px solid #ececf0;border-radius:20px;padding:24px 26px;margin-top:16px">
        ${cartesEmailHtml(aud, lienTrack)}
      </div>
    </div>
  </div>`;
  try {
    const pdf = await brochurePdfPyemes(aud, lien).catch(() => null);
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER, to: clientEmail, subject: aud.subject, html,
      attachments: pdf ? [{ filename: 'Pyemes-presentation.pdf', content: pdf }] : [],
    });
    await User.updateOne({ _id: c.me._id }, { $push: { pyemesPitches: { to: clientEmail, template: key, at: new Date(), token, openedAt: null, clientName, siret } } });
    res.json({ ok: true });
  } catch (e) { res.status(502).json({ ok: false, error: 'envoi_impossible', message: e.message }); }
});

// Suppression d'un envoi de l'historique (l'agence a la main sur ses propres envois). @Rabah 2026-08-01
router.delete('/pyemes/pitch/:id', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  await User.updateOne({ _id: c.me._id }, { $pull: { pyemesPitches: { _id: req.params.id } } });
  res.json({ ok: true });
});

// Vider tout l'historique des envois (ex. supprimer les tests). @Rabah 2026-08-01
router.delete('/pyemes/pitches', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  await User.updateOne({ _id: c.me._id }, { $set: { pyemesPitches: [] } });
  res.json({ ok: true });
});

// Statut d'onboarding Stripe Connect de l'agence cote Pyemes.
router.get('/pyemes/connect/status', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  if (!c.me.pyemesCode) return res.json({ ok: true, onboarde: false, demarre: false });
  const { j } = await pyemes(`/agences/${encodeURIComponent(c.me.pyemesCode)}/connect/status`);
  res.json(j);
});

// Demarre (ou reprend) l'onboarding Stripe Connect ; renvoie l'URL a ouvrir.
router.post('/pyemes/connect', async (req, res) => {
  const c = await ownerOnly(req, res); if (!c) return;
  if (!c.me.pyemesCode) return res.status(400).json({ ok: false, error: 'agence_non_reliee' });
  const { status, j } = await pyemes(`/agences/${encodeURIComponent(c.me.pyemesCode)}/connect`, {
    method: 'POST',
    body: { return_url: `${PUBLIC_BASE}/agence?pyemes=done`, refresh_url: `${PUBLIC_BASE}/agence?pyemes=refresh` },
  });
  if (status !== 200 || !j.ok) return res.status(502).json({ ok: false, error: j.error || 'stripe_erreur', message: j.message });
  res.json({ ok: true, url: j.url });
});

export default router;
