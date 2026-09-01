/**
 * Facturation Stripe (superadmin) - MULTI-COMPTES. On peut connecter plusieurs
 * comptes Stripe (clés stockées en base, collection stripeaccounts) et basculer
 * entre eux. Débit off-session de clients ayant une carte enregistrée (mandat requis).
 * @author Rabah Ziane · 2026-07-09
 */
import express from 'express';
import Stripe from 'stripe';
import mongoose from 'mongoose';

const router = express.Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
router.use((req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
});

const ACC = () => mongoose.connection.db.collection('stripeaccounts');
const oid = (id) => new mongoose.Types.ObjectId(id);
const masked = (k) => k ? `${k.slice(0, 7)}…${k.slice(-4)}` : null;

// Liste "ne plus prélever" (opt-out) : clients à exclure des débits. @Rabah 2026-07-09
const OPTOUT = () => mongoose.connection.db.collection('stripe_optout');
async function optoutSet(accKey) {
  const docs = await OPTOUT().find({ account: accKey || 'default' }).project({ customer: 1 }).toArray();
  return new Set(docs.map(d => d.customer));
}
async function withOptout(accKey, data) {
  const oset = await optoutSet(accKey);
  return { ...data, customers: (data.customers || []).map(c => ({ ...c, optout: oset.has(c.id) })), optout_count: oset.size };
}

// Map email -> "Nom Prénom" depuis la base clients DeliveryEat (get_all_customer, caché
// côté mail-proxy). Sert à afficher les vrais noms dans les opérations. Cache 30 min.
let _deNameCache = null;
async function deNameMap() {
  if (_deNameCache && Date.now() - _deNameCache.at < 30 * 60 * 1000) return _deNameCache.map;
  try {
    const r = await fetch('https://admin23.deliverydigital.fr/mailproxy/customers-all', { headers: { Accept: 'application/json' } });
    const j = await r.json();
    const map = new Map();
    for (const c of (j.customers || [])) {
      const email = (((c.user && c.user.email) || c.email || '')).toLowerCase().trim();
      const name = [c.name, c.lastName].filter(Boolean).join(' ').trim();
      if (email && name) map.set(email, name);
    }
    _deNameCache = { at: Date.now(), map };
    return map;
  } catch { return _deNameCache ? _deNameCache.map : new Map(); }
}

// Migration : reprend l'ancienne clé unique (appconfig) comme 1er compte.
async function migrateLegacy() {
  if (await ACC().countDocuments() > 0) return;
  const legacy = await mongoose.connection.db.collection('appconfig').findOne({ _id: 'stripe' });
  if (legacy?.secret_key) await ACC().insertOne({ label: 'Compte principal', secret_key: legacy.secret_key, created_at: new Date() });
  else if (process.env.STRIPE_SECRET_KEY) await ACC().insertOne({ label: 'Compte (env)', secret_key: process.env.STRIPE_SECRET_KEY, created_at: new Date() });
}

async function stripeFor(accountId) {
  const doc = accountId ? await ACC().findOne({ _id: oid(accountId) }) : await ACC().findOne({});
  if (!doc?.secret_key) { const e = new Error('Aucun compte Stripe configuré'); e.noKey = true; throw e; }
  return new Stripe(doc.secret_key);
}
async function defaultCard(stripe, customer) {
  const dpm = customer.invoice_settings?.default_payment_method;
  if (dpm) { const pm = typeof dpm === 'string' ? await stripe.paymentMethods.retrieve(dpm) : dpm; if (pm?.card) return pm; }
  const pms = await stripe.paymentMethods.list({ customer: customer.id, type: 'card', limit: 1 });
  return pms.data[0] || null;
}

// Exécute fn sur items avec au plus `limit` en parallèle (respecte le rate-limit Stripe).
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; try { out[idx] = await fn(items[idx], idx); } catch { out[idx] = null; } }
  }));
  return out;
}

// Cache mémoire de la liste clients+cartes par compte (le scan des cartes ~2 min).
const custCache = new Map(); // accountKey -> { at, data }
const custScanning = new Set(); // accountKey en cours de scan (évite les scans concurrents)
const CUST_TTL = 60 * 60 * 1000; // 60 min

async function scanCustomers(accountId, accKey) {
  if (custScanning.has(accKey)) return null;
  custScanning.add(accKey);
  try {
    const stripe = await stripeFor(accountId);
    let all = [], sa, g = 0;
    do { const p = await stripe.customers.list({ limit: 100, ...(sa ? { starting_after: sa } : {}) }); all.push(...p.data); sa = p.has_more ? p.data[p.data.length - 1].id : null; g += 1; } while (sa && g < 100);
    const cards = await mapLimit(all, 24, async (c) => {
      const pms = await stripe.paymentMethods.list({ customer: c.id, type: 'card', limit: 1 });
      const pm = pms.data[0];
      return pm ? { brand: pm.card.brand, last4: pm.card.last4, exp: `${String(pm.card.exp_month).padStart(2, '0')}/${pm.card.exp_year}`, fp: pm.card.fingerprint } : null;
    });
    // Détection des doublons : emails identiques + empreintes de carte partagées.
    const emailCount = {}, fpCount = {};
    all.forEach((c, i) => {
      const e = (c.email || '').toLowerCase().trim(); if (e) emailCount[e] = (emailCount[e] || 0) + 1;
      const fp = cards[i]?.fp; if (fp) fpCount[fp] = (fpCount[fp] || 0) + 1;
    });
    const data = {
      customers: all.map((c, i) => {
        const cd = cards[i]; const e = (c.email || '').toLowerCase().trim();
        return {
          id: c.id, name: c.name || '(sans nom)', email: c.email || '', country: c.address?.country || null, created: c.created,
          card: cd ? { brand: cd.brand, last4: cd.last4, exp: cd.exp } : null,
          dupEmail: !!(e && emailCount[e] > 1),
          sharedCard: !!(cd?.fp && fpCount[cd.fp] > 1),
        };
      }),
      count: all.length,
      dup: { emails: Object.values(emailCount).filter(n => n > 1).length, cards: Object.values(fpCount).filter(n => n > 1).length },
    };
    custCache.set(accKey, { at: Date.now(), data });
    return data;
  } finally { custScanning.delete(accKey); }
}

// --- Comptes Stripe ---
router.get('/accounts', async (req, res) => {
  await migrateLegacy();
  const docs = await ACC().find({}).sort({ created_at: 1 }).toArray();
  res.json({ accounts: docs.map(d => ({ id: String(d._id), label: d.label, masked: masked(d.secret_key) })) });
});
router.post('/accounts', async (req, res) => {
  const k = ((req.body || {}).secret_key || '').trim();
  const label = ((req.body || {}).label || '').trim();
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]+/.test(k)) return res.status(400).json({ error: 'cle_invalide', detail: 'Clé secrète Stripe attendue (sk_live_… / sk_test_…).' });
  let acctName = label;
  try { const acc = await new Stripe(k).accounts.retrieve().catch(() => null); if (acc && !acctName) acctName = acc.settings?.dashboard?.display_name || acc.business_profile?.name || ''; await new Stripe(k).balance.retrieve(); }
  catch (e) { return res.status(400).json({ error: 'cle_refusee', detail: 'Stripe refuse cette clé : ' + e.message }); }
  const r = await ACC().insertOne({ label: acctName || (k.includes('_test_') ? 'Compte test' : 'Compte Stripe'), secret_key: k, created_at: new Date() });
  res.json({ ok: true, id: String(r.insertedId) });
});
router.delete('/accounts/:id', async (req, res) => { await ACC().deleteOne({ _id: oid(req.params.id) }); res.json({ ok: true }); });

// --- Clients (compte sélectionné via ?account=) ---
// Stratégie stale-while-revalidate : le cache est renvoyé instantanément ; s'il est
// périmé, un rescan tourne en arrière-plan. Le scan bloquant (~2 min) n'arrive
// qu'au tout 1er appel sans cache (pré-chauffé au déploiement).
router.get('/customers', async (req, res) => {
  try {
    const accKey = req.query.account || 'default';
    const cached = custCache.get(accKey);
    if (cached && req.query.refresh !== '1') {
      const stale = Date.now() - cached.at > CUST_TTL;
      if (stale) scanCustomers(req.query.account, accKey).catch(() => {}); // rafraîchit en fond
      return res.json({ ...(await withOptout(accKey, cached.data)), cached: true, stale });
    }
    if (req.query.refresh === '1' && cached) {
      // rafraîchissement demandé mais on a déjà du cache : relance en fond, renvoie l'ancien
      scanCustomers(req.query.account, accKey).catch(() => {});
      return res.json({ ...(await withOptout(accKey, cached.data)), cached: true, refreshing: true });
    }
    // Pas de cache : on lance le scan EN ARRIÈRE-PLAN (ne bloque pas la requête,
    // ~2 min) et on répond "en cours". Le front repollera jusqu'à obtenir les données.
    if (!custScanning.has(accKey)) scanCustomers(req.query.account, accKey).catch(() => {});
    res.json({ customers: [], count: 0, scanning: true });
  } catch (e) { res.status(e.noKey ? 400 : 500).json({ error: e.noKey ? 'cle_absente' : 'stripe_customers_echec', detail: e.message }); }
});
// Fiche détaillée : carte, nom, total dépensé, historique des paiements.
router.get('/customers/:id/detail', async (req, res) => {
  try {
    const stripe = await stripeFor(req.query.account);
    const customer = await stripe.customers.retrieve(req.params.id);
    const pm = await defaultCard(stripe, customer);
    // Charges du client (jusqu'à 100 récentes pour le total, 20 affichées).
    let charges = [], sa, g = 0;
    do { const p = await stripe.charges.list({ customer: req.params.id, limit: 100, ...(sa ? { starting_after: sa } : {}) }); charges.push(...p.data); sa = p.has_more ? p.data[p.data.length - 1].id : null; g += 1; } while (sa && g < 5);
    const paid = charges.filter(c => c.paid && c.status === 'succeeded');
    const total = paid.reduce((s, c) => s + (c.amount - (c.amount_refunded || 0)), 0) / 100;
    const name = customer.name || charges.find(c => c.billing_details?.name)?.billing_details?.name || null;
    res.json({
      name, email: customer.email,
      card: pm ? { brand: pm.card.brand, last4: pm.card.last4, exp: `${String(pm.card.exp_month).padStart(2, '0')}/${pm.card.exp_year}` } : null,
      total_spent: Math.round(total * 100) / 100, nb_paiements: paid.length, has_more: g >= 5,
      payments: charges.slice(0, 20).map(c => ({ date: c.created, amount: c.amount / 100, currency: (c.currency || 'eur').toUpperCase(), status: c.status, refunded: (c.amount_refunded || 0) / 100, desc: c.description || c.calculated_statement_descriptor || '' })),
    });
  } catch (e) { res.status(500).json({ error: 'detail_echec', detail: e.message }); }
});

// Débite un client (off-session) - utilisé par le débit unitaire ET le débit en masse.
async function chargeOne(stripe, customerId, cents, motif) {
  const customer = await stripe.customers.retrieve(customerId);
  const pm = await defaultCard(stripe, customer);
  if (!pm) return { ok: false, error: 'aucune_carte', email: customer.email };
  try {
    const pi = await stripe.paymentIntents.create({
      amount: cents, currency: 'eur', customer: customerId, payment_method: pm.id,
      off_session: true, confirm: true, description: motif || 'Débit Delivery Digital', metadata: { motif: motif || '', source: 'admin_dd' },
    });
    return { ok: pi.status === 'succeeded', status: pi.status, id: pi.id, email: customer.email, card: `${pm.card.brand} ••${pm.card.last4}` };
  } catch (e) { return { ok: false, error: e.code || e.message, decline_code: e.decline_code || null, email: customer.email }; }
}

// --- Débit off-session (unitaire) ---
router.post('/charge', async (req, res) => {
  const { account, customerId, amount, motif } = req.body || {};
  const cents = Math.round(Number(amount) * 100);
  if (!customerId || !cents || cents < 50) return res.status(400).json({ error: 'params_invalides', detail: 'Client + montant (min 0,50 €) requis.' });
  try {
    const oset = await optoutSet(account || 'default');
    if (oset.has(customerId)) return res.status(400).json({ error: 'optout', detail: 'Ce client a demandé à ne plus être prélevé.' });
    const stripe = await stripeFor(account);
    const r = await chargeOne(stripe, customerId, cents, motif);
    if (r.error === 'aucune_carte') return res.status(400).json({ error: 'aucune_carte', detail: "Ce client n'a pas de carte enregistrée." });
    res.json({ ok: r.ok, status: r.status, id: r.id, amount: cents / 100, card: r.card, code: r.error && !r.ok ? r.error : null, decline_code: r.decline_code, detail: !r.ok ? r.error : null });
  } catch (e) { res.status(400).json({ error: 'charge_echec', detail: e.message }); }
});

// --- Débit en MASSE (job en arrière-plan, par lots) ---
const bulkJobs = new Map(); // jobId -> { total, done, ok, failed, amount, motif, running, results, at }
let bulkSeq = 0;
router.post('/charge-bulk', async (req, res) => {
  const { account, customerIds, amount, motif } = req.body || {};
  const cents = Math.round(Number(amount) * 100);
  let ids = Array.isArray(customerIds) ? [...new Set(customerIds)] : [];
  if (!ids.length || !cents || cents < 50) return res.status(400).json({ error: 'params_invalides', detail: 'Liste de clients + montant (min 0,50 €) requis.' });
  // Exclut les clients "ne plus prélever" (opt-out) même s'ils sont dans la liste.
  const oset = await optoutSet(account || 'default');
  const skippedOptout = ids.filter(id => oset.has(id)).length;
  ids = ids.filter(id => !oset.has(id));
  if (!ids.length) return res.status(400).json({ error: 'tous_optout', detail: 'Tous les clients sélectionnés sont en "ne plus prélever".' });
  if (ids.length > 5000) return res.status(400).json({ error: 'trop_de_clients', detail: 'Maximum 5000 clients par lot.' });
  const jobId = `bulk_${Date.now()}_${bulkSeq++}`;
  const job = { total: ids.length, done: 0, ok: 0, failed: 0, amount: cents / 100, motif: motif || '', running: true, results: [], at: Date.now(), skippedOptout };
  bulkJobs.set(jobId, job);
  // Traitement en arrière-plan, par lots (concurrence 5) pour ne pas surcharger ni dépasser le rate-limit Stripe.
  (async () => {
    try {
      const stripe = await stripeFor(account);
      await mapLimit(ids, 5, async (cid) => {
        const r = await chargeOne(stripe, cid, cents, motif).catch(e => ({ ok: false, error: e.message }));
        job.done += 1; if (r.ok) job.ok += 1; else job.failed += 1;
        job.results.push({ id: cid, ok: r.ok, email: r.email || '', error: r.ok ? null : r.error, card: r.card || null });
      });
    } catch (e) { job.error = e.message; }
    job.running = false; job.finishedAt = Date.now();
  })();
  res.json({ jobId, total: ids.length, skippedOptout });
});
router.get('/charge-bulk/:jobId', (req, res) => {
  const job = bulkJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'job_introuvable' });
  res.json({ total: job.total, done: job.done, ok: job.ok, failed: job.failed, running: job.running, amount: job.amount, motif: job.motif, skippedOptout: job.skippedOptout || 0, failures: job.results.filter(r => !r.ok).slice(0, 100) });
});

// --- "Ne plus prélever" (opt-out) ---
router.post('/optout', async (req, res) => {
  const accKey = (req.body && req.body.account) || 'default';
  const ids = Array.isArray(req.body && req.body.customerIds) ? req.body.customerIds : [];
  const on = !!(req.body && req.body.optout);
  if (!ids.length) return res.status(400).json({ error: 'params_invalides' });
  if (on) {
    await OPTOUT().bulkWrite(ids.map(id => ({ updateOne: { filter: { account: accKey, customer: id }, update: { $set: { account: accKey, customer: id, at: new Date() } }, upsert: true } })));
  } else {
    await OPTOUT().deleteMany({ account: accKey, customer: { $in: ids } });
  }
  res.json({ ok: true, count: ids.length, optout: on });
});

// --- Opérations récentes (débits) + remboursement ---
router.get('/operations', async (req, res) => {
  try {
    const stripe = await stripeFor(req.query.account);
    // 1) Charges récentes (paginées). 2) Remboursements récents (refunds.list, expand charge)
    // pour GARANTIR l'affichage des remboursés même si leur charge est ancienne (enterrée
    // sous des centaines d'échecs). On fusionne + dédoublonne par id de charge.
    // Plafond relevé : avec un fort taux d'échecs (ex. ~70%), 5 pages (500 charges) ne
    // remontaient que ~148 non-échoués alors que le compte a beaucoup plus de prélèvements
    // RÉUSSIS. On pagine désormais jusqu'à 40 pages (4000 charges) ou jusqu'à épuisement, pour
    // que "Rembourser tous" couvre bien l'intégralité des réussis. @author Rabah Ziane - 2026-07-17
    const maxPages = Math.min(Math.ceil((Number(req.query.limit) || 3000) / 100), 40);
    let list = [], sa, g = 0;
    do { const p = await stripe.charges.list({ limit: 100, expand: ['data.customer'], ...(sa ? { starting_after: sa } : {}) }); list.push(...p.data); sa = p.has_more ? p.data[p.data.length - 1].id : null; g += 1; } while (sa && g < maxPages);
    // Remboursements récents paginés (jusqu'à 5 pages) : garantit l'affichage des déjà-remboursés. @Rabah 2026-07-17
    let rfList = [], rsa, rg = 0;
    do { const rp = await stripe.refunds.list({ limit: 100, expand: ['data.charge.customer'], ...(rsa ? { starting_after: rsa } : {}) }); rfList.push(...rp.data); rsa = rp.has_more ? rp.data[rp.data.length - 1].id : null; rg += 1; } while (rsa && rg < 5);
    const rf = { data: rfList };
    const refCharges = rf.data.map(r => r.charge).filter(c => c && typeof c === 'object');
    const byId = new Map();
    for (const c of [...refCharges, ...list]) { if (c && c.id && !byId.has(c.id)) byId.set(c.id, c); }
    const merged = [...byId.values()].sort((a, b) => (b.created || 0) - (a.created || 0));
    // Date du dernier remboursement par charge -> permet d'afficher "remboursé le ..." et de
    // trier/voir les opérations par DATE DE REMBOURSEMENT (une charge ancienne remboursée
    // aujourd'hui doit apparaître sous aujourd'hui). @author Rabah Ziane - 2026-07-17
    const refundDateByCharge = new Map();
    for (const r of rfList) {
      const cid = r.charge && typeof r.charge === 'object' ? r.charge.id : r.charge;
      if (cid) refundDateByCharge.set(cid, Math.max(refundDateByCharge.get(cid) || 0, r.created || 0));
    }
    const operations = merged.map(c => {
      const cust = c.customer && typeof c.customer === 'object' ? c.customer : null;
      const bd = c.billing_details || {};
      return {
        id: c.id, amount: c.amount / 100, currency: (c.currency || 'eur').toUpperCase(), date: c.created,
        status: c.status, paid: c.paid, refunded: (c.amount_refunded || 0) / 100, fully_refunded: !!c.refunded,
        refunded_at: refundDateByCharge.get(c.id) || null,
        name: bd.name || (cust && cust.name) || '',
        email: bd.email || (cust && cust.email) || c.receipt_email || '',
        card: c.payment_method_details && c.payment_method_details.card ? `${c.payment_method_details.card.brand} ••${c.payment_method_details.card.last4}` : '',
        motif: (c.metadata && c.metadata.motif) || c.description || '',
      };
    });
    // Enrichit le nom depuis la base clients DeliveryEat (par email).
    const nameMap = await deNameMap();
    operations.forEach(o => { if (!o.name && o.email) { const n = nameMap.get(o.email.toLowerCase()); if (n) o.name = n; } });
    res.json({ operations });
  } catch (e) { res.status(500).json({ error: 'operations_echec', detail: e.message }); }
});
router.post('/refund', async (req, res) => {
  const { account, chargeId, motif } = req.body || {};
  if (!chargeId) return res.status(400).json({ error: 'params_invalides' });
  try {
    const stripe = await stripeFor(account);
    const refund = await stripe.refunds.create({ charge: chargeId, reason: 'requested_by_customer', metadata: { motif: (motif || '').toString().slice(0, 200), source: 'admin_dd' } });
    res.json({ ok: refund.status === 'succeeded' || refund.status === 'pending', status: refund.status, id: refund.id });
  } catch (e) { res.status(400).json({ error: 'refund_echec', detail: e.message }); }
});

export default router;
