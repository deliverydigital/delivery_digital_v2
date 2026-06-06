/**
 * Signature de convention a distance (page publique client).
 *  GET  /api/convention-sign/:token  - contexte pour afficher la convention (lecture seule)
 *  POST /api/convention-sign/:token  - le client signe (nom + fonction + signature au doigt)
 *                                      -> cree le dossier OPCO (transmis a DD) avec la signature.
 * @author Rabah Ziane - 2026-06-04
 */
import express from 'express';
import nodemailer from 'nodemailer';
import ConventionSignRequest from '../models/ConventionSignRequest.js';
import AgencyDossier from '../models/AgencyDossier.js';
import AgencyLead from '../models/AgencyLead.js';

export const publicRouter = express.Router();

function getTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({ host: process.env.SMTP_HOST || 'ssl0.ovh.net', port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}
const isExpired = (r) => r.expiresAt && new Date(r.expiresAt).getTime() < Date.now();

publicRouter.get('/:token', async (req, res) => {
  const r = await ConventionSignRequest.findOne({ token: req.params.token }).lean();
  if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({
    ok: true, status: r.status, expired: isExpired(r),
    context: {
      agencyName: r.agencyName, denom: r.denom, siret: r.siret, addr: r.addr, opco: r.opco,
      formationTitle: r.formationTitle, sessionName: r.sessionName,
      sessionStart: r.sessionStart, sessionEnd: r.sessionEnd,
      salaries: (r.salaries || []).map((s) => ({ firstname: s.firstname, lastname: s.lastname, type_contrat: s.type_contrat })),
      amountHT: r.amountHT,
    },
  });
});

publicRouter.post('/:token', async (req, res) => {
  const r = await ConventionSignRequest.findOne({ token: req.params.token });
  if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
  if (r.status === 'cancelled') return res.status(410).json({ ok: false, error: 'cancelled' });
  if (r.status === 'signed') return res.status(409).json({ ok: false, error: 'already_signed' });
  if (isExpired(r)) return res.status(410).json({ ok: false, error: 'expired' });
  const signedBy = (req.body.signedBy || '').trim();
  const signedFunction = (req.body.signedFunction || '').trim();
  const signatureDataUrl = (req.body.signatureDataUrl || '').trim();
  if (!signedBy) return res.status(400).json({ ok: false, error: 'name_required' });
  if (!signatureDataUrl) return res.status(400).json({ ok: false, error: 'signature_required' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
  const amountHT = r.amountHT || (525 * (r.salaries || []).length);
  // Correction : si la demande cible un dossier existant, on le MET A JOUR (pas de doublon).
  let dossier = null;
  if (r.editDossierId) {
    dossier = await AgencyDossier.findById(r.editDossierId);
    if (dossier && dossier.status !== 'paid' && dossier.status !== 'invoiced') {
      dossier.denom = r.denom; dossier.siret = r.siret; dossier.opco = r.opco; dossier.addr = r.addr;
      dossier.formationTitle = r.formationTitle; dossier.sessionName = r.sessionName;
      dossier.sessionStart = r.sessionStart; dossier.sessionEnd = r.sessionEnd; dossier.salaries = r.salaries;
      dossier.signedBy = signedBy; dossier.signedFunction = signedFunction; dossier.signedIp = ip;
      dossier.signatureDataUrl = signatureDataUrl; dossier.signedRemote = true; dossier.signedAt = new Date();
      dossier.amountHT = amountHT;
      if (dossier.status === 'rejected') dossier.status = 'transmitted';
      await dossier.save();
    } else { dossier = null; } // dossier introuvable ou verrouille -> on cree
  }
  // Sinon : cree le dossier OPCO transmis a Delivery Digital, avec la signature du client.
  if (!dossier) {
    dossier = await AgencyDossier.create({
      agencyId: r.agencyId, agencyName: r.commercialName ? undefined : r.agencyName,
      commercialId: r.commercialId || undefined, commercialName: r.commercialName || undefined,
      leadId: r.leadId || undefined, denom: r.denom, siret: r.siret, opco: r.opco, addr: r.addr, clientEmail: r.clientEmail,
      formationTitle: r.formationTitle, sessionName: r.sessionName,
      sessionStart: r.sessionStart, sessionEnd: r.sessionEnd, salaries: r.salaries,
      signedBy, signedFunction, signedIp: ip,
      signatureDataUrl, signedRemote: true, signedAt: new Date(),
      amountHT, status: 'transmitted',
    });
  }
  r.status = 'signed'; r.signedBy = signedBy; r.signedFunction = signedFunction;
  r.signatureDataUrl = signatureDataUrl; r.signedIp = ip; r.signedAt = new Date(); r.dossierId = dossier._id;
  await r.save();
  if (r.leadId) { try { await AgencyLead.updateOne({ _id: r.leadId, agencyId: r.agencyId }, { status: 'converted' }); } catch { /* */ } }
  try {
    const to = process.env.ADMIN_EMAIL || 'contact@deliverydigital.fr';
    const stagiaires = (r.salaries || []).map((s, i) => `${i + 1}. ${s.firstname} ${s.lastname}${s.email ? ' (' + s.email + ')' : ''}${s.type_contrat ? ' - ' + s.type_contrat : ''}`).join('\n');
    await getTransporter().sendMail({
      from: process.env.SMTP_USER, to,
      subject: `Nouveau dossier OPCO a monter - ${r.denom} (${r.agencyName})`,
      text: `Convention signee a distance par le client. Dossier a monter aupres de l'OPCO.\n\n`
        + `Agence : ${r.agencyName}\nBeneficiaire : ${r.denom}\nSIRET : ${r.siret || '-'}\nOPCO : ${r.opco || '-'}\nFormation : ${r.formationTitle || '-'}\nSession : ${r.sessionName || '-'}\n`
        + `Signe par : ${signedBy}${signedFunction ? ' (' + signedFunction + ')' : ''}\nMontant : ${r.amountHT} EUR HT\n\nStagiaires (${(r.salaries || []).length}) :\n${stagiaires}\n\n`
        + `Ouvrez le dossier dans l'admin (Agences partenaires -> Dossiers OPCO).`,
    });
  } catch (e) { /* email best effort */ }
  res.json({ ok: true });
});

export default publicRouter;
