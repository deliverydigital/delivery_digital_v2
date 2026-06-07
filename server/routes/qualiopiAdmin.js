/**
 * Module QUALIOPI (superadmin, x-admin-secret) - périmètre "actions de formation".
 *  - Conformité : grille des 32 indicateurs (7 critères) + statut + notes + preuves.
 *  - Exécution : preuves d'exécution par session/apprenant (émargement, attestation, éval...).
 *  - Financement OPCO : suivi par dossier (montants, échéances, justificatifs).
 *  - Vue d'ensemble : taux de conformité + totaux financiers.
 * @author Rabah Ziane · 2026-06-07
 */
import express from 'express';
import crypto from 'crypto';
import QualiopiIndicator from '../models/QualiopiIndicator.js';
import SessionProof from '../models/SessionProof.js';
import OpcoFunding from '../models/OpcoFunding.js';
import TrainerSession from '../models/TrainerSession.js';
import AgencyDossier from '../models/AgencyDossier.js';

const router = express.Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const requireAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
};

// Sauvegarde d'un fichier (PDF ou image) depuis une data URL base64. Renvoie le chemin public.
async function saveUpload(dataUrl, sub) {
  const m = String(dataUrl || '').match(/^data:(application\/pdf|image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!m) return { error: 'type_non_supporte' };
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 12 * 1024 * 1024) return { error: 'too_large' };
  const ext = m[1] === 'application/pdf' ? 'pdf' : m[1].split('/')[1].replace('jpeg', 'jpg');
  const fs = await import('fs'); const path = await import('path'); const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dir = path.join(__dirname, '../../uploads/qualiopi', sub);
  fs.mkdirSync(dir, { recursive: true });
  const fname = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(dir, fname), buf);
  return { filePath: `/uploads/qualiopi/${sub}/${fname}`, size: buf.length };
}

// Catalogue des 32 indicateurs (actions de formation). N/A par défaut : 3,7,13,14,15.
const SEED = [
  [1, 1, "Information du public : objectifs, prérequis, durée, modalités, délais d'accès, tarifs, contacts, méthodes mobilisées et accessibilité handicap."],
  [2, 1, "Diffusion d'indicateurs de résultats adaptés à la nature des prestations et aux publics."],
  [3, 1, "Formations certifiantes : taux d'obtention, de poursuite, d'insertion et valeur ajoutée (N/A si non certifiante)."],
  [4, 2, "Analyse du besoin du bénéficiaire en lien avec l'entreprise et/ou le financeur."],
  [5, 2, "Objectifs de la prestation définis, opérationnels et évaluables."],
  [6, 2, "Contenus et modalités d'évaluation adaptés aux objectifs et aux publics."],
  [7, 2, "Formations certifiantes : contenus en adéquation avec le référentiel de la certification (N/A si non certifiante)."],
  [8, 2, "Procédures de positionnement et d'évaluation des acquis à l'entrée."],
  [9, 3, "Information du bénéficiaire sur les conditions de déroulement (contenu, méthodes, évaluation, accompagnement)."],
  [10, 3, "Adaptation de la prestation, de l'accompagnement et du rythme aux publics bénéficiaires."],
  [11, 3, "Évaluation de l'atteinte des objectifs par les bénéficiaires."],
  [12, 3, "Prise en compte de l'assiduité et de l'engagement des bénéficiaires (émargements)."],
  [13, 3, "Apprentissage : coordination avec l'entreprise et l'alternance (N/A en action de formation)."],
  [14, 3, "Apprentissage : exercice de la fonction tutorale et maître d'apprentissage (N/A)."],
  [15, 3, "Apprentissage : information sur les droits et devoirs de l'alternant (N/A)."],
  [16, 3, "Mesures de prévention et de gestion des abandons et des sorties (suivi)."],
  [17, 4, "Moyens humains et techniques adaptés et environnement d'apprentissage approprié."],
  [18, 4, "Coordination des moyens pédagogiques, techniques et d'encadrement."],
  [19, 4, "Ressources pédagogiques mobilisées et mises à disposition des bénéficiaires."],
  [20, 4, "Personnels dédiés et conditions d'accueil/accompagnement des personnes en situation de handicap."],
  [21, 5, "Compétences des intervenants déterminées, entretenues et actualisées."],
  [22, 5, "Gestion des compétences : qualification des formateurs et développement professionnel."],
  [23, 6, "Veille légale et réglementaire sur le champ de la formation et répercussion."],
  [24, 6, "Veille sur les évolutions des compétences, des métiers et des emplois des secteurs."],
  [25, 6, "Veille sur les innovations pédagogiques et technologiques et répercussion."],
  [26, 6, "Mobilisation et coordination d'un réseau de partenaires et sous-traitants."],
  [27, 6, "Handicap : mobilisation des expertises, ressources et réseaux spécialisés."],
  [28, 6, "Sous-traitance / portage salarial : définition des responsabilités et conformité (le cas échéant)."],
  [29, 6, "Inscription dans l'environnement professionnel : actions menées et déontologie."],
  [30, 7, "Recueil des appréciations des parties prenantes (bénéficiaires, financeurs, équipes, entreprises)."],
  [31, 7, "Traitement des réclamations, des difficultés et des aléas survenus."],
  [32, 7, "Mise en œuvre de mesures d'amélioration continue."],
];
const DEFAULT_NA = new Set([3, 7, 13, 14, 15]);

async function ensureSeed() {
  const count = await QualiopiIndicator.countDocuments({});
  if (count >= 32) return;
  for (const [number, criterion, title] of SEED) {
    await QualiopiIndicator.updateOne(
      { number },
      { $setOnInsert: { number, criterion, title, status: DEFAULT_NA.has(number) ? 'non_applicable' : 'a_completer' } },
      { upsert: true },
    );
  }
}

/* ===================== Indicateurs (conformité) ===================== */
router.get('/indicators', requireAdmin, async (req, res) => {
  await ensureSeed();
  const rows = await QualiopiIndicator.find({}).sort({ number: 1 }).lean();
  res.json({ ok: true, indicators: rows });
});

router.patch('/indicators/:number', requireAdmin, async (req, res) => {
  const set = {};
  if (['a_completer', 'conforme', 'non_conforme', 'non_applicable'].includes(req.body.status)) set.status = req.body.status;
  if (typeof req.body.notes === 'string') set.notes = req.body.notes;
  if (typeof req.body.title === 'string' && req.body.title.trim()) set.title = req.body.title.trim();
  const row = await QualiopiIndicator.findOneAndUpdate({ number: Number(req.params.number) }, { $set: set }, { new: true });
  if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, indicator: row });
});

router.post('/indicators/:number/proof', requireAdmin, async (req, res) => {
  const up = await saveUpload(req.body.dataUrl, 'indicators');
  if (up.error) return res.status(400).json({ ok: false, error: up.error });
  const row = await QualiopiIndicator.findOneAndUpdate(
    { number: Number(req.params.number) },
    { $push: { proofs: { title: (req.body.title || 'Preuve').trim(), filePath: up.filePath, originalName: req.body.originalName, size: up.size } } },
    { new: true },
  );
  if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, indicator: row });
});

router.delete('/indicators/:number/proof/:proofId', requireAdmin, async (req, res) => {
  const row = await QualiopiIndicator.findOneAndUpdate(
    { number: Number(req.params.number) },
    { $pull: { proofs: { _id: req.params.proofId } } },
    { new: true },
  );
  res.json({ ok: true, indicator: row });
});

/* ===================== Exécution (preuves par session/apprenant) ===================== */
// Liste des sessions + leurs preuves + complétude (types présents).
router.get('/sessions', requireAdmin, async (req, res) => {
  const sessions = await TrainerSession.find({}).sort({ sessionStart: -1, createdAt: -1 }).lean();
  const proofs = await SessionProof.find({}).sort({ uploadedAt: -1 }).lean();
  const bySession = {};
  proofs.forEach((p) => { const k = String(p.sessionId); (bySession[k] = bySession[k] || []).push(p); });
  const out = sessions.map((s) => ({ ...s, proofs: bySession[String(s._id)] || [] }));
  res.json({ ok: true, sessions: out });
});

router.post('/sessions/:id/proof', requireAdmin, async (req, res) => {
  const s = await TrainerSession.findById(req.params.id).lean();
  if (!s) return res.status(404).json({ ok: false, error: 'session_not_found' });
  const up = await saveUpload(req.body.dataUrl, 'sessions');
  if (up.error) return res.status(400).json({ ok: false, error: up.error });
  const p = await SessionProof.create({
    sessionId: s._id, dossierId: s.dossierId || undefined,
    docType: (req.body.docType || 'autre').trim(),
    title: (req.body.title || '').trim(),
    learnerName: (req.body.learnerName || '').trim() || undefined,
    filePath: up.filePath, originalName: req.body.originalName, size: up.size,
  });
  res.json({ ok: true, proof: p });
});

router.delete('/session-proof/:id', requireAdmin, async (req, res) => {
  await SessionProof.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

/* ===================== Financement OPCO (par dossier) ===================== */
router.get('/financing', requireAdmin, async (req, res) => {
  const dossiers = await AgencyDossier.find({}).select('denom siret opco formationTitle amountHT status agencyName createdAt salaries').sort({ createdAt: -1 }).limit(1000).lean();
  const fundings = await OpcoFunding.find({}).lean();
  const fm = {}; fundings.forEach((f) => { fm[String(f.dossierId)] = f; });
  const out = dossiers.map((d) => ({
    dossierId: d._id, denom: d.denom, siret: d.siret, opco: d.opco, formationTitle: d.formationTitle,
    amountHT: d.amountHT, dossierStatus: d.status, agencyName: d.agencyName, stagiaires: (d.salaries || []).length,
    funding: fm[String(d._id)] || null,
  }));
  res.json({ ok: true, rows: out });
});

router.patch('/financing/:dossierId', requireAdmin, async (req, res) => {
  const b = req.body || {};
  const set = {};
  for (const k of ['requestRef', 'notes', 'status']) if (b[k] != null) set[k] = b[k];
  for (const k of ['requestedAmount', 'grantedAmount', 'receivedAmount']) if (b[k] != null) set[k] = Math.round(Number(b[k]) || 0);
  for (const k of ['decisionDate', 'dueDate', 'paidDate']) if (b[k] != null) set[k] = b[k] ? new Date(b[k]) : null;
  const f = await OpcoFunding.findOneAndUpdate({ dossierId: req.params.dossierId }, { $set: set }, { upsert: true, new: true });
  res.json({ ok: true, funding: f });
});

router.post('/financing/:dossierId/proof', requireAdmin, async (req, res) => {
  const up = await saveUpload(req.body.dataUrl, 'financing');
  if (up.error) return res.status(400).json({ ok: false, error: up.error });
  const f = await OpcoFunding.findOneAndUpdate(
    { dossierId: req.params.dossierId },
    { $push: { proofs: { title: (req.body.title || 'Justificatif').trim(), filePath: up.filePath, originalName: req.body.originalName, size: up.size } } },
    { upsert: true, new: true },
  );
  res.json({ ok: true, funding: f });
});

router.delete('/financing/:dossierId/proof/:proofId', requireAdmin, async (req, res) => {
  const f = await OpcoFunding.findOneAndUpdate({ dossierId: req.params.dossierId }, { $pull: { proofs: { _id: req.params.proofId } } }, { new: true });
  res.json({ ok: true, funding: f });
});

/* ===================== Vue d'ensemble ===================== */
router.get('/overview', requireAdmin, async (req, res) => {
  await ensureSeed();
  const inds = await QualiopiIndicator.find({}).select('status proofs').lean();
  const applicable = inds.filter((i) => i.status !== 'non_applicable');
  const conforme = applicable.filter((i) => i.status === 'conforme').length;
  const nonConforme = applicable.filter((i) => i.status === 'non_conforme').length;
  const aCompleter = applicable.filter((i) => i.status === 'a_completer').length;
  const proofsTotal = inds.reduce((s, i) => s + (i.proofs || []).length, 0);
  const sessionsProofs = await SessionProof.countDocuments({});
  const fundings = await OpcoFunding.find({}).lean();
  const requested = fundings.reduce((s, f) => s + (f.requestedAmount || 0), 0);
  const received = fundings.reduce((s, f) => s + (f.receivedAmount || 0), 0);
  const pending = fundings.filter((f) => f.status !== 'paye' && f.status !== 'refuse').reduce((s, f) => s + ((f.grantedAmount || f.requestedAmount || 0) - (f.receivedAmount || 0)), 0);
  res.json({
    ok: true,
    conformite: { applicable: applicable.length, conforme, nonConforme, aCompleter, rate: applicable.length ? Math.round((conforme / applicable.length) * 100) : 0 },
    proofs: { indicators: proofsTotal, sessions: sessionsProofs },
    financing: { requested, received, pending, dossiers: fundings.length },
  });
});

export default router;
