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
import ConventionSignRequest from '../models/ConventionSignRequest.js';

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
    siret: (r.siret || '').replace(/\s/g, '').trim() || undefined, opco: (r.opco || '').trim() || undefined,
    addr: (r.addr || '').trim() || undefined, status: 'new',
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
  if (typeof req.body.waitingNote === 'string') lead.waitingNote = req.body.waitingNote.trim() || undefined;
  if ('reminderAt' in req.body) lead.reminderAt = req.body.reminderAt ? new Date(req.body.reminderAt) : undefined;
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

// Suppression DOUCE d'un client : masque le lead + ses dossiers (hidden=true), pas de DELETE
// en base (réversible). @author Rabah Ziane - 2026-06-09
router.delete('/leads/:id', async (req, res) => {
  const c = await ctx(req);
  const q = c.isOwner ? { _id: req.params.id, agencyId: c.agencyId } : { _id: req.params.id, agencyId: c.agencyId, commercialId: c.commercialId };
  const lead = await AgencyLead.findOne(q);
  if (!lead) return res.status(404).json({ ok: false, error: 'not_found' });
  lead.hidden = true;
  await lead.save();
  await AgencyDossier.updateMany({ agencyId: c.agencyId, leadId: lead._id }, { $set: { hidden: true } });
  res.json({ ok: true });
});

/* === Dossiers OPCO === */
router.get('/dossiers', async (req, res) => {
  const c = await ctx(req);
  const q = c.isOwner ? { agencyId: c.agencyId } : { agencyId: c.agencyId, commercialId: c.commercialId };
  const dossiers = await AgencyDossier.find({ ...q, hidden: { $ne: true } }).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, dossiers });
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
  const salaries = Array.isArray(b.salaries) ? b.salaries.filter((s) => s && s.firstname && s.lastname) : [];
  if (salaries.length === 0) return res.status(400).json({ ok: false, error: 'salaries_required' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
  const dossier = await AgencyDossier.create({
    agencyId: c.agencyId, agencyName: c.isOwner ? c.name : undefined,
    commercialId: c.commercialId || undefined, commercialName: c.isOwner ? undefined : c.name,
    leadId: b.leadId || undefined, denom: b.denom, siret: b.siret, opco: b.opco, addr: b.addr, clientEmail: b.clientEmail,
    formationTitle: b.formationTitle, sessionName: b.sessionName, salaries,
    sessionStart: b.startAt ? new Date(b.startAt) : undefined, sessionEnd: b.endAt ? new Date(b.endAt) : undefined,
    signedBy: b.signedBy, signedFunction: b.signedFunction, signedIp: ip,
    signatureDataUrl: b.signatureDataUrl || undefined, signedRemote: false, signedAt: new Date(),
    amountHT: b.amountHT != null ? Math.round(Number(b.amountHT)) : 525 * salaries.length, status: 'transmitted',
  });
  if (b.leadId) { try { await AgencyLead.updateOne({ _id: b.leadId, agencyId: c.agencyId }, { status: 'converted' }); } catch { /* */ } }
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
  if (salaries.length === 0) return res.status(400).json({ ok: false, error: 'salaries_required' });
  if (b.denom != null) d.denom = b.denom;
  if (b.siret != null) d.siret = b.siret;
  if (b.opco != null) d.opco = b.opco;
  if (b.formationTitle != null) d.formationTitle = b.formationTitle;
  if (b.sessionName != null) d.sessionName = b.sessionName;
  if (b.startAt) d.sessionStart = new Date(b.startAt);
  if (b.endAt) d.sessionEnd = new Date(b.endAt);
  if (b.signedBy != null) d.signedBy = b.signedBy;
  if (b.signedFunction != null) d.signedFunction = b.signedFunction;
  if (b.signatureDataUrl) { d.signatureDataUrl = b.signatureDataUrl; d.signedRemote = false; d.signedAt = new Date(); }
  d.salaries = salaries;
  d.amountHT = b.amountHT != null ? Math.round(Number(b.amountHT)) : 525 * salaries.length;
  if (d.status === 'rejected') d.status = 'transmitted'; // re-soumis pour instruction
  await d.save();
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
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to: clientEmail, bcc: 'contact@deliverydigital.fr',
      subject: 'Liste de vos salariés à former - modèle à remplir',
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><div style="height:5px;background:#0066CC"></div><div style="padding:22px 26px 6px;text-align:center;border-bottom:1px solid #f0f0f2"><img src="${PUBLIC_BASE}/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png" alt="Delivery Digital" style="height:38px;width:auto" /></div><div style="padding:26px"><p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 14px">Bonjour,<br><br>Pour inscrire vos salariés à la formation, merci de compléter le <strong>modèle ci-joint</strong> (un salarié par ligne) puis de le renvoyer à ${esc(c.name)}.</p><p style="font-size:13px;color:#3a3a3c;line-height:1.6;margin:0 0 8px">Colonnes : prénom, nom, poste, email, date de naissance, n° de sécurité sociale, type de contrat, téléphone. Vous pouvez l'ouvrir avec Excel, Numbers ou Google Sheets.</p><p style="font-size:12px;color:#86868b;margin:16px 0 0">Delivery Digital · Organisme de formation certifié QUALIOPI</p></div></div></div>`,
      attachments: [{ filename: 'modele-stagiaires.csv', content: '﻿' + csv, contentType: 'text/csv; charset=utf-8' }],
    });
    res.json({ ok: true, sentTo: clientEmail });
  } catch (e) { res.status(500).json({ ok: false, error: 'send_failed' }); }
});

// Envoi au client d'un lien de signature de la convention a distance (signature au doigt).
// Cree une demande ConventionSignRequest + email avec le lien securise. @author Rabah Ziane - 2026-06-04
router.post('/sign-link', async (req, res) => {
  const c = await ctx(req);
  const b = req.body || {};
  const viaWhatsapp = b.noEmail || b.channel === 'whatsapp';
  if (!b.clientEmail && !viaWhatsapp) return res.status(400).json({ ok: false, error: 'client_email_required' });
  if (!b.denom) return res.status(400).json({ ok: false, error: 'denom_required' });
  const salaries = Array.isArray(b.salaries) ? b.salaries.filter((s) => s && s.firstname && s.lastname) : [];
  if (salaries.length === 0) return res.status(400).json({ ok: false, error: 'salaries_required' });
  const token = crypto.randomBytes(24).toString('hex');
  await ConventionSignRequest.create({
    token, agencyId: c.agencyId, agencyName: c.name,
    commercialId: c.commercialId || undefined, commercialName: c.isOwner ? undefined : c.name,
    leadId: b.leadId || undefined, editDossierId: b.dossierId || undefined,
    denom: b.denom, siret: b.siret, opco: b.opco, addr: b.addr, clientEmail: b.clientEmail,
    formationTitle: b.formationTitle, sessionName: b.sessionName,
    sessionStart: b.startAt ? new Date(b.startAt) : undefined, sessionEnd: b.endAt ? new Date(b.endAt) : undefined,
    salaries, amountHT: b.amountHT != null ? Math.round(Number(b.amountHT)) : 525 * salaries.length, status: 'pending',
    expiresAt: new Date(Date.now() + 30 * 86400000),
  });
  const link = `${PUBLIC_BASE}/signer/${token}`;
  // channel 'whatsapp' (ou noEmail) : on ne fait que créer + renvoyer le lien (envoi via WhatsApp côté agence).
  if (!b.noEmail && b.channel !== 'whatsapp' && b.clientEmail) {
    try {
      await getTransporter().sendMail({
        from: process.env.SMTP_FROM || 'contact@deliverydigital.fr', to: b.clientEmail, bcc: 'contact@deliverydigital.fr',
        subject: `Signature de votre convention de formation - ${b.denom}`,
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f7;padding:24px"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><div style="height:5px;background:#0066CC"></div><div style="padding:22px 26px 6px;text-align:center;border-bottom:1px solid #f0f0f2"><img src="${PUBLIC_BASE}/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png" alt="Delivery Digital" style="height:38px;width:auto" /></div><div style="padding:26px"><p style="font-size:14px;color:#3a3a3c;line-height:1.6;margin:0 0 16px">Bonjour,<br><br>${esc(c.name)} a préparé votre <strong>convention de formation professionnelle</strong>. Vous pouvez la lire et la signer directement depuis votre téléphone, au doigt, en quelques secondes.</p><a href="${link}" style="display:inline-block;background:#0066CC;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:999px">Lire et signer ma convention</a><p style="font-size:12px;color:#86868b;margin:18px 0 0">Lien sécurisé, valable 30 jours. Signature électronique de même valeur juridique qu'une signature manuscrite (Code civil, art. 1367).</p></div><div style="padding:14px 26px;border-top:1px solid #f0f0f2;background:#fafafa"><p style="margin:0;font-size:11px;color:#86868b">Delivery Digital Nice · Organisme de formation certifié QUALIOPI</p></div></div></div>`,
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
