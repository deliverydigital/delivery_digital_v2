/**
 * Module COMPTABILITÉ (superadmin, x-admin-secret) - tableau de bord style Indy.
 *  - Entreprises (régime IS/IR, TVA, exercice).
 *  - Connexion Qonto + synchro des transactions.
 *  - Catégorisation (catalogue PCG) + TVA automatique.
 *  - Dashboard (compte de résultat, TVA, checklist "reste à faire").
 *  - Liasse fiscale (agrégats IS / IR).
 * Page front : deliverydigital.fr/comptabilite
 *
 * @author Rabah Ziane · 2026-07-07
 */
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ComptaCompany from '../models/ComptaCompany.js';
import ComptaEntry from '../models/ComptaEntry.js';
import ComptaDeclaration from '../models/ComptaDeclaration.js';
import { COMPTA_GROUPS } from '../lib/comptaCatalog.js';
import { qontoVerify, qontoFetchTransactions, normalizeQontoTx, qontoAttachmentUrl, qontoTotalBalanceAt } from '../lib/qontoClient.js';
import { applyCategory, computeResultat, computeTva, buildChecklist, buildLiasse, categorizeQontoTx, computeCompteCourantAssocie } from '../lib/comptaEngine.js';
import { renderLiassePdf } from '../lib/comptaLiassePdf.js';
import { renderLiasse2033, computeBilan, computeCases2033 } from '../lib/liasse2033.js';
import { renderLiasse2065 } from '../lib/liasse2065.js';
import { renderLiasse2031 } from '../lib/liasse2031.js';
import { buildFEC, buildBalance, buildGrandLivre } from '../lib/comptaExports.js';
import { rechercheEntreprise } from '../lib/sireneLookup.js';

const router = express.Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const requireAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
};
router.use(requireAdmin);

// Bornes de l'exercice courant d'une entreprise (année civile par défaut).
function exerciceRange(company) {
  const y = company?.exercice?.annee_courante || new Date().getFullYear();
  const m = company?.exercice?.mois_cloture || 12;
  // Exercice se terminant le dernier jour du mois de clôture de l'année y.
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));
  const start = new Date(Date.UTC(y - (m === 12 ? 0 : 1), m % 12, 1));
  return { start, end };
}

// Filtre "écritures de l'exercice courant" : ne mélange pas les années quand
// plusieurs exercices ont été synchronisés (bilans par année).
function exerciceQuery(company) {
  const { start, end } = exerciceRange(company);
  return { company_id: company._id, date: { $gte: start, $lte: end } };
}

/* --------------------------------- Catalogue ------------------------------- */
router.get('/catalog', (req, res) => res.json({ groups: COMPTA_GROUPS }));

/* ------------------ Recherche entreprise (auto-remplissage) ---------------- */
// GET /entreprise-lookup?q=SIREN|SIRET|nom -> infos légales (API Sirene publique).
router.get('/entreprise-lookup', async (req, res) => {
  try {
    const results = await rechercheEntreprise(req.query.q);
    res.json({ results });
  } catch (e) {
    res.status(502).json({ error: 'sirene_indisponible', detail: e.message });
  }
});

/* -------------------------------- Entreprises ------------------------------ */
router.get('/companies', async (req, res) => {
  const list = await ComptaCompany.find({ active: true }).sort({ created_at: -1 });
  res.json({ companies: list.map(c => c.toSafeJSON()) });
});

router.post('/companies', async (req, res) => {
  try {
    const c = await ComptaCompany.create(req.body || {});
    res.status(201).json({ company: c.toSafeJSON() });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/companies/:id', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'introuvable' });
  res.json({ company: c.toSafeJSON() });
});

router.put('/companies/:id', async (req, res) => {
  try {
    const patch = { ...req.body };
    delete patch.qonto; // la connexion Qonto passe par sa route dédiée
    const c = await ComptaCompany.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!c) return res.status(404).json({ error: 'introuvable' });
    res.json({ company: c.toSafeJSON() });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* --------------------------- Report à nouveau N-1 -------------------------- */
router.post('/companies/:id/report', async (req, res) => {
  const { annee, comptes } = req.body || {};
  const c = await ComptaCompany.findByIdAndUpdate(
    req.params.id,
    { report_a_nouveau: { annee, comptes: comptes || [], saisi: true } },
    { new: true }
  );
  if (!c) return res.status(404).json({ error: 'introuvable' });
  res.json({ company: c.toSafeJSON() });
});

/* ------------------------------- Clôture ---------------------------------- */
// Attestation globale des justificatifs (option A) : marque l'étape "justificatifs"
// comme faite sans joindre chaque pièce. @author Rabah Ziane - 2026-07-16
router.post('/companies/:id/justificatifs-atteste', async (req, res) => {
  const c = await ComptaCompany.findByIdAndUpdate(
    req.params.id,
    { justificatifs_atteste: req.body?.atteste !== false },
    { new: true }
  );
  if (!c) return res.status(404).json({ error: 'introuvable' });
  res.json({ company: c.toSafeJSON() });
});

router.post('/companies/:id/cloture', async (req, res) => {
  const c = await ComptaCompany.findByIdAndUpdate(
    req.params.id,
    { cloture: { verrouille: !!req.body?.verrouille, date: new Date() } },
    { new: true }
  );
  if (!c) return res.status(404).json({ error: 'introuvable' });
  res.json({ company: c.toSafeJSON() });
});

/* --------------------------------- Qonto ---------------------------------- */
router.post('/companies/:id/qonto/connect', async (req, res) => {
  const { org_slug, secret_key, iban } = req.body || {};
  const check = await qontoVerify({ org_slug, secret_key });
  if (!check.ok) return res.status(400).json({ error: 'qonto_invalide', detail: check.error });
  const chosenIban = iban || check.ibans?.[0]?.iban;
  const c = await ComptaCompany.findByIdAndUpdate(
    req.params.id,
    { qonto: { connected: true, org_slug, secret_key, iban: chosenIban } },
    { new: true }
  );
  if (!c) return res.status(404).json({ error: 'introuvable' });
  res.json({ company: c.toSafeJSON(), ibans: check.ibans });
});

router.post('/companies/:id/qonto/sync', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id).select('+qonto.secret_key');
  if (!c) return res.status(404).json({ error: 'introuvable' });
  if (!c.qonto?.connected) return res.status(400).json({ error: 'qonto_non_connecte' });

  try {
    // Synchro sur une année précise si fournie (?year=2024), sinon l'exercice courant.
    const year = parseInt(req.query.year || (req.body && req.body.year), 10);
    let start, end;
    if (year && year > 2000 && year < 2100) {
      start = new Date(Date.UTC(year, 0, 1));
      end = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
      // Bascule l'exercice affiché sur l'année synchronisée (bilans par année).
      if (!c.exercice) c.exercice = {};
      c.exercice.annee_courante = year;
      c.markModified('exercice');
    } else {
      ({ start, end } = exerciceRange(c));
    }
    // Une entreprise a souvent PLUSIEURS comptes Qonto (principal, trésorerie, paiement...).
    // On synchronise TOUS les comptes de l'organisation, pas juste un seul.
    // @author Rabah Ziane - 2026-07-08
    const org = await qontoVerify({ org_slug: c.qonto.org_slug, secret_key: c.qonto.secret_key });
    if (!org.ok) return res.status(502).json({ error: 'qonto_sync_echec', detail: org.error });
    const comptes = org.ibans || [];

    let created = 0, imported = 0;
    for (const compte of comptes) {
      const txs = await qontoFetchTransactions({
        org_slug: c.qonto.org_slug,
        secret_key: c.qonto.secret_key,
        iban: compte.iban,
        from: start, to: end,
      });
      imported += txs.length;
      for (const tx of txs) {
        const n = normalizeQontoTx(tx);
        if (!n.external_id) continue;
        // Catégorisation automatique via les données Qonto (catégorie + TVA réelle).
        const cat = categorizeQontoTx(n, c.name);
        const r = await ComptaEntry.updateOne(
          { company_id: c._id, external_id: n.external_id },
          { $setOnInsert: { ...n, ...cat, iban: compte.iban, compte_nom: compte.name, company_id: c._id } },
          { upsert: true }
        );
        if (r.upsertedCount) created += 1;
      }
    }
    c.qonto.last_sync_at = new Date();
    await c.save();
    res.json({ ok: true, comptes: comptes.length, importes: imported, nouveaux: created });
  } catch (e) {
    res.status(502).json({ error: 'qonto_sync_echec', detail: e.message });
  }
});

// Ré-applique la catégorisation automatique (données Qonto) sur les écritures.
// scope=uncategorized -> seulement les non catégorisées ; sinon toutes.
router.post('/companies/:id/categorize-auto', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'introuvable' });
  const q = { company_id: c._id, source: 'qonto' };
  if (req.query.scope === 'uncategorized') q.status = 'a_categoriser';
  const entries = await ComptaEntry.find(q);
  let updated = 0;
  for (const e of entries) {
    const n = {
      side: e.side, counterparty: e.counterparty, amount: e.amount,
      qonto_category: e.qonto_category, operation_type: e.operation_type,
      qonto_vat_amount: null, qonto_vat_rate: null, is_external: e.is_external,
    };
    const cat = categorizeQontoTx(n, c.name);
    if (cat.category_key) { await ComptaEntry.updateOne({ _id: e._id }, { $set: { ...cat } }); updated += 1; }
  }
  res.json({ ok: true, total: entries.length, updated });
});

/* ------------------------------- Écritures -------------------------------- */
router.get('/companies/:id/entries', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'introuvable' });
  const q = exerciceQuery(c);              // écritures de l'exercice courant uniquement
  if (req.query.status) q.status = req.query.status;
  const entries = await ComptaEntry.find(q).sort({ date: -1 }).limit(10000);
  res.json({ entries });
});

// Saisie manuelle d'une écriture.
router.post('/companies/:id/entries', async (req, res) => {
  try {
    const b = req.body || {};
    const side = (Number(b.amount) < 0) ? 'debit' : 'credit';
    const derived = b.category_key ? applyCategory(b.amount, b.category_key, b.tva_rate) : {};
    const e = await ComptaEntry.create({
      company_id: req.params.id, source: 'manuel',
      date: b.date || new Date(), label: b.label, counterparty: b.counterparty,
      amount: Number(b.amount) || 0, side, ...derived,
    });
    res.status(201).json({ entry: e });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Catégorisation / mise à jour d'une écriture.
router.patch('/entries/:eid', async (req, res) => {
  try {
    const e = await ComptaEntry.findById(req.params.eid);
    if (!e) return res.status(404).json({ error: 'introuvable' });
    const b = req.body || {};
    if (b.category_key) Object.assign(e, applyCategory(e.amount, b.category_key, b.tva_rate));
    if (b.justificatif !== undefined) e.justificatif = b.justificatif;
    if (b.notes !== undefined) e.notes = b.notes;
    if (b.status) e.status = b.status;
    if (b.reviewed !== undefined) e.reviewed = !!b.reviewed;
    await e.save();
    res.json({ entry: e });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Édition EN MASSE : applique une catégorie/TVA à plusieurs écritures d'un coup
// (par liste d'ids OU par contrepartie identique). @author Rabah Ziane 2026-07-08
router.post('/companies/:id/entries/bulk', async (req, res) => {
  try {
    const { ids, counterparty, category_key, tva_rate } = req.body || {};
    const hasTva = tva_rate !== undefined && tva_rate !== null && tva_rate !== '';
    // On accepte : une catégorie (avec TVA optionnelle) OU une TVA seule (garde la catégorie existante).
    if (!category_key && !hasTva) return res.status(400).json({ error: 'category_ou_tva_manquant' });
    const filter = { company_id: req.params.id };
    if (Array.isArray(ids) && ids.length) filter._id = { $in: ids };
    else if (counterparty) filter.counterparty = counterparty;
    else return res.status(400).json({ error: 'critere_manquant' });
    const entries = await ComptaEntry.find(filter);
    let n = 0;
    for (const e of entries) {
      const catKey = category_key || e.category_key; // TVA seule -> on garde la catégorie de l'écriture
      if (!catKey) continue; // rien à appliquer si aucune catégorie
      Object.assign(e, applyCategory(e.amount, catKey, tva_rate));
      await e.save(); n += 1;
    }
    res.json({ ok: true, modifiees: n });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Justificatif (facture) Qonto d'une écriture : renvoie l'URL téléchargeable.
router.get('/entries/:eid/justificatif', async (req, res) => {
  const e = await ComptaEntry.findById(req.params.eid);
  if (!e) return res.status(404).json({ error: 'introuvable' });
  if (!e.attachment_ids || !e.attachment_ids.length) return res.status(404).json({ error: 'aucun_justificatif' });
  const c = await ComptaCompany.findById(e.company_id).select('+qonto.secret_key');
  if (!c?.qonto?.secret_key) return res.status(400).json({ error: 'qonto_non_connecte' });
  const url = await qontoAttachmentUrl({ org_slug: c.qonto.org_slug, secret_key: c.qonto.secret_key }, e.attachment_ids[0]);
  if (!url) return res.status(502).json({ error: 'qonto_attachment_indisponible' });
  res.json({ url, count: e.attachment_ids.length });
});

/* ------------------------------- Dashboard -------------------------------- */
router.get('/companies/:id/dashboard', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'introuvable' });
  const entries = await ComptaEntry.find(exerciceQuery(c));
  res.json({
    company: c.toSafeJSON(),
    resultat: computeResultat(entries),
    tva: computeTva(entries, c.tva_credit_anterieur),
    checklist: buildChecklist(c, entries),
    counts: {
      total: entries.length,
      a_categoriser: entries.filter(e => e.status === 'a_categoriser').length,
    },
  });
});

// Marque "traité" (vert) plusieurs écritures d'un coup - clic/glisser dans la liste.
// @author Rabah Ziane - 2026-07-16
router.post('/companies/:id/entries/reviewed', async (req, res) => {
  const { ids, reviewed } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids_manquants' });
  const r = await ComptaEntry.updateMany(
    { _id: { $in: ids }, company_id: req.params.id },
    { $set: { reviewed: !!reviewed } }
  );
  res.json({ ok: true, modified: r.modifiedCount });
});

// Solde du compte courant d'associé par année (compte 455) = ce que la société
// doit au dirigeant. Multi-exercices : on lit TOUTES les écritures de la société
// (pas seulement l'exercice courant). @author Rabah Ziane - 2026-07-16
router.get('/companies/:id/compte-courant-associe', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'introuvable' });
  const entries = await ComptaEntry.find({ company_id: c._id, account: '455' });
  res.json(computeCompteCourantAssocie(entries));
});

/* -------------------------------- Liasse ---------------------------------- */
router.get('/companies/:id/liasse', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'introuvable' });
  const entries = await ComptaEntry.find(exerciceQuery(c));
  const checklist = buildChecklist(c, entries);
  res.json({ liasse: buildLiasse(c, entries), liasse_prete: checklist.liasse_prete, checklist });
});

// Téléchargement PDF de la liasse fiscale (synthèse officielle).
router.get('/companies/:id/liasse/pdf', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id).select('+qonto.secret_key');
  if (!c) return res.status(404).json({ error: 'introuvable' });
  const entries = await ComptaEntry.find(exerciceQuery(c));
  try {
    const liasse = buildLiasse(c, entries);
    const resultat = computeResultat(entries);
    // Bilan synthétique N + N-1 (pour la présentation officielle).
    let treso = 0;
    if (c.qonto?.connected && c.qonto?.secret_key) {
      const y = c.exercice?.annee_courante || new Date().getFullYear();
      treso = await qontoTotalBalanceAt({ org_slug: c.qonto.org_slug, secret_key: c.qonto.secret_key }, new Date(Date.UTC(y, 11, 31, 23, 59, 59)).toISOString());
    }
    const bilanN = computeBilan(c.toSafeJSON(), computeCases2033(entries), treso);
    const rn = (c.report_a_nouveau && c.report_a_nouveau.comptes) || [];
    const bal = (pre) => rn.filter(x => String(x.account || '').startsWith(pre)).reduce((s, x) => s + (x.solde || 0), 0);
    const bilanN1 = {
      creances: bal('46') + bal('41'), dispo: bal('5'), capital: bal('101'), report: bal('11'), resultat: 0,
      capitaux: bal('101') + bal('11'), emprunts: -bal('164'), fournisseurs: -bal('401'), autresDettes: -bal('455'),
      totalActif: bal('46') + bal('41') + bal('5'),
    };
    const pdf = await renderLiassePdf(c.toSafeJSON(), liasse, resultat, { N: bilanN, N1: bilanN1, annee: liasse.exercice, resultatN1: bal('12') });
    const slug = (c.name || 'entreprise').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="liasse-${slug}-${liasse.exercice || ''}.pdf"`);
    res.send(pdf);
  } catch (e) {
    res.status(500).json({ error: 'pdf_echec', detail: e.message });
  }
});

// Téléchargement du formulaire OFFICIEL 2033-SD pré-rempli (compte de résultat + identité).
router.get('/companies/:id/liasse/2033-pdf', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id).select('+qonto.secret_key');
  if (!c) return res.status(404).json({ error: 'introuvable' });
  const entries = await ComptaEntry.find(exerciceQuery(c));
  try {
    // Trésorerie au 31/12 de l'exercice (pour le bilan).
    let treso = 0;
    if (c.qonto?.connected && c.qonto?.secret_key) {
      const y = c.exercice?.annee_courante || new Date().getFullYear();
      const iso = new Date(Date.UTC(y, 11, 31, 23, 59, 59)).toISOString();
      treso = await qontoTotalBalanceAt({ org_slug: c.qonto.org_slug, secret_key: c.qonto.secret_key }, iso);
    }
    const pdf = await renderLiasse2033(c.toSafeJSON(), entries, treso);
    const slug = (c.name || 'entreprise').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="2033-SD-${slug}-${c.exercice?.annee_courante || ''}.pdf"`);
    res.send(pdf);
  } catch (e) {
    res.status(500).json({ error: 'pdf_2033_echec', detail: e.message });
  }
});

// Déclaration de résultat IS (formulaire officiel 2065-SD rempli).
router.get('/companies/:id/liasse/2065-pdf', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'introuvable' });
  const entries = await ComptaEntry.find(exerciceQuery(c));
  try {
    const pdf = await renderLiasse2065(c.toSafeJSON(), entries);
    const slug = (c.name || 'entreprise').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="2065-SD-${slug}-${c.exercice?.annee_courante || ''}.pdf"`);
    res.send(pdf);
  } catch (e) {
    res.status(500).json({ error: 'pdf_2065_echec', detail: e.message });
  }
});

// Déclaration de résultat BIC / IR (formulaire officiel 2031-SD rempli).
router.get('/companies/:id/liasse/2031-pdf', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'introuvable' });
  const entries = await ComptaEntry.find(exerciceQuery(c));
  try {
    const pdf = await renderLiasse2031(c.toSafeJSON(), entries);
    const slug = (c.name || 'entreprise').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="2031-SD-${slug}-${c.exercice?.annee_courante || ''}.pdf"`);
    res.send(pdf);
  } catch (e) {
    res.status(500).json({ error: 'pdf_2031_echec', detail: e.message });
  }
});

// Exports comptables : FEC, Grand Livre, Balance (générés depuis les écritures).
router.get('/companies/:id/export/:kind', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'introuvable' });
  const entries = await ComptaEntry.find(exerciceQuery(c));
  const y = c.exercice?.annee_courante || new Date().getFullYear();
  const siren = String(c.siren || '').replace(/\D/g, '');
  const slug = (c.name || 'entreprise').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let content, mime, filename;
  try {
    switch (req.params.kind) {
      case 'fec': content = buildFEC(c, entries); mime = 'text/plain; charset=utf-8'; filename = `${siren || slug}FEC${y}1231.txt`; break;
      case 'balance': content = buildBalance(c, entries); mime = 'text/csv; charset=utf-8'; filename = `balance-${slug}-${y}.csv`; break;
      case 'grand-livre': content = buildGrandLivre(c, entries); mime = 'text/csv; charset=utf-8'; filename = `grand-livre-${slug}-${y}.csv`; break;
      default: return res.status(400).json({ error: 'export_inconnu' });
    }
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (e) { res.status(500).json({ error: 'export_echec', detail: e.message }); }
});

/* ===================== Suivi des déclarations & dépôts ===================== */
// Stockage des accusés/justificatifs HORS dossier public (accès authentifié uniquement).
const DOCS_ROOT = path.join(process.cwd(), 'compta_docs');
const comptaStorage = multer.diskStorage({
  destination: (req, file, cb) => { const d = path.join(DOCS_ROOT, String(req.params.id)); fs.mkdirSync(d, { recursive: true }); cb(null, d); },
  filename: (req, file, cb) => { const ext = path.extname(file.originalname || '').slice(0, 8); cb(null, `${req.params.did}-${Date.now()}${ext}`); },
});
const comptaUpload = multer({ storage: comptaStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// Jeu de déclarations par défaut créé au premier accès, ADAPTÉ AU RÉGIME FISCAL.
//  - IS  : 2065 + 2033 (résultat), 2572 (solde IS), CA12 (TVA), CII.
//  - IR  : 2031/2035 (résultat BIC/BNC), report sur la 2042-C-PRO (revenus perso),
//          CA12 (TVA), CII - PAS de 2572 (la société ne paie pas d'IS).
function defaultDeclarations(company) {
  const y = company?.exercice?.annee_courante || new Date().getFullYear();
  const iso = (yy, m, d) => new Date(Date.UTC(yy, m - 1, d));
  const tva = { type: 'tva_ca12', label: `Déclaration de TVA ${y} (CA12 / 3517-S)`, annee: y, echeance: iso(y + 1, 5, 5), ordre: 3 };
  const cii = { type: 'cii', label: `Crédit d'Impôt Innovation ${y} (2069-RCI / 2069-A)`, annee: y, echeance: iso(y + 1, 5, 20), ordre: 4 };
  if ((company?.regime_fiscal || 'IS') === 'IR') {
    const bnc = (company?.categorie_ir || 'BIC') === 'BNC';
    return [
      bnc
        ? { type: 'liasse_ir', label: `Liasse fiscale ${y} (2035) - résultat BNC`, annee: y, echeance: iso(y + 1, 5, 20), ordre: 1 }
        : { type: 'liasse_ir', label: `Liasse fiscale ${y} (2031 + 2033-A/B) - résultat BIC`, annee: y, echeance: iso(y + 1, 5, 20), ordre: 1 },
      { type: 'ir_perso', label: `Report du résultat sur la déclaration de revenus (2042-C-PRO)`, annee: y, echeance: iso(y + 1, 6, 5), ordre: 2 },
      tva, cii,
    ];
  }
  return [
    { type: 'liasse_is', label: `Liasse fiscale ${y} (2065 + 2033-A/B) - résultat IS`, annee: y, echeance: iso(y + 1, 5, 20), ordre: 1 },
    { type: 'solde_is_2572', label: `Relevé de solde d'IS ${y} (2572)`, annee: y, echeance: iso(y + 1, 5, 15), ordre: 2 },
    tva, cii,
  ];
}

async function ensureDeclarations(company) {
  const n = await ComptaDeclaration.countDocuments({ company_id: company._id });
  if (n === 0) await ComptaDeclaration.insertMany(defaultDeclarations(company).map(d => ({ ...d, company_id: company._id })));
}

// Liste des déclarations (crée le jeu par défaut au 1er appel).
router.get('/companies/:id/declarations', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'introuvable' });
  await ensureDeclarations(c);
  // Filtre par exercice sélectionné : on ne montre que les déclarations de l'année
  // courante (les autres années restent en base mais masquées). @author Rabah Ziane - 2026-07-16
  const yr = c.exercice?.annee_courante;
  const q = { company_id: c._id };
  if (yr) q.annee = yr;
  const declarations = await ComptaDeclaration.find(q).sort({ ordre: 1, echeance: 1 }).lean();
  res.json({ declarations: declarations.map(d => ({ ...d, has_document: !!(d.document && d.document.stored) })) });
});

// Créer une déclaration (obligation) manuellement.
router.post('/companies/:id/declarations', async (req, res) => {
  const c = await ComptaCompany.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'introuvable' });
  const d = await ComptaDeclaration.create({ ...req.body, company_id: c._id });
  res.status(201).json({ declaration: d });
});

// Mettre à jour le statut / infos de dépôt (marquer déposé, numéro, date, montant…).
router.patch('/companies/:id/declarations/:did', async (req, res) => {
  const patch = { ...req.body }; delete patch.company_id; delete patch.document;
  if (patch.status === 'depose' && !patch.depose_le) patch.depose_le = new Date();
  const d = await ComptaDeclaration.findOneAndUpdate({ _id: req.params.did, company_id: req.params.id }, patch, { new: true });
  if (!d) return res.status(404).json({ error: 'introuvable' });
  res.json({ declaration: d });
});

router.delete('/companies/:id/declarations/:did', async (req, res) => {
  const d = await ComptaDeclaration.findOneAndDelete({ _id: req.params.did, company_id: req.params.id });
  if (d?.document?.stored) { try { fs.unlinkSync(path.join(DOCS_ROOT, path.basename(path.dirname(d.document.stored)), path.basename(d.document.stored))); } catch { /* ignore */ } }
  res.json({ ok: true });
});

// Joindre l'accusé de réception / justificatif (upload) et marquer déposé.
router.post('/companies/:id/declarations/:did/document', comptaUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'fichier_manquant' });
  const rel = path.join(String(req.params.id), req.file.filename);
  const set = {
    document: { filename: req.file.originalname, stored: rel, mime: req.file.mimetype, size: req.file.size, uploaded_at: new Date() },
  };
  if (req.body.markDepose !== 'false') { set.status = 'depose'; }
  const d = await ComptaDeclaration.findOneAndUpdate({ _id: req.params.did, company_id: req.params.id }, { $set: set }, { new: true });
  if (!d) return res.status(404).json({ error: 'introuvable' });
  res.json({ declaration: d, has_document: true });
});

// Télécharger l'accusé attaché (accès authentifié).
router.get('/companies/:id/declarations/:did/document', async (req, res) => {
  const d = await ComptaDeclaration.findOne({ _id: req.params.did, company_id: req.params.id });
  if (!d?.document?.stored) return res.status(404).json({ error: 'aucun_document' });
  const abs = path.join(DOCS_ROOT, d.document.stored);
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'fichier_introuvable' });
  res.download(abs, d.document.filename || 'document.pdf');
});

export default router;
