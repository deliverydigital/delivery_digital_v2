/**
 * Routes admin pour le tracker de positions SERP (mots-cles vs concurrents).
 *
 *   GET    /api/admin/rankings              -> liste tous les keywords trackes
 *   POST   /api/admin/rankings              -> ajoute un keyword { keyword, market }
 *   POST   /api/admin/rankings/:id/refresh  -> refresh live le ranking d'un keyword
 *   POST   /api/admin/rankings/refresh-all  -> refresh batch (dans la limite quota)
 *   DELETE /api/admin/rankings/:id          -> retire un keyword
 *   POST   /api/admin/rankings/seed-gsc     -> auto-ajoute les keywords detectes par GSC
 *   GET    /api/admin/rankings/provider     -> info provider configure
 *
 * @author Rabah Ziane - 2026-05-17
 */
import express from 'express';
import KeywordRanking from '../models/KeywordRanking.js';
import { querySerp, isSerpConfigured, getSerpProvider } from '../seo/serpClient.js';
import { querySearchAnalytics } from '../seo/gscClient.js';
import { sendRankingReport } from '../seo/rankingReport.js';
import { runOptimizerBatch, findMatchingPage, optimizePage } from '../seo/autoOptimizer.js';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const OUR_DOMAIN = 'deliverydigital.fr';

function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
}

const router = express.Router();
router.use(requireAdmin);

router.get('/provider', (_req, res) => {
  res.json({ configured: isSerpConfigured(), provider: getSerpProvider() });
});

router.get('/', async (_req, res) => {
  try {
    const items = await KeywordRanking.find({ active: true }).sort({ ourPosition: 1, keyword: 1 }).lean();
    res.json({ count: items.length, items, provider: getSerpProvider(), configured: isSerpConfigured() });
  } catch (e) {
    res.status(500).json({ error: 'list_failed', message: String(e.message || e) });
  }
});

router.post('/', async (req, res) => {
  const { keyword, market = 'fr', notes = '' } = req.body || {};
  if (!keyword || !keyword.trim()) return res.status(400).json({ error: 'keyword required' });
  try {
    const existing = await KeywordRanking.findOne({ keyword: keyword.trim().toLowerCase() });
    if (existing) {
      existing.active = true;
      existing.market = market;
      if (notes) existing.notes = notes;
      await existing.save();
      return res.json({ item: existing });
    }
    const item = await KeywordRanking.create({
      keyword: keyword.trim().toLowerCase(),
      market,
      notes,
      source: 'manual',
    });
    res.json({ item });
  } catch (e) {
    res.status(500).json({ error: 'create_failed', message: String(e.message || e) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await KeywordRanking.updateOne({ _id: req.params.id }, { $set: { active: false } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'delete_failed', message: String(e.message || e) });
  }
});

async function refreshOne(item) {
  const r = await querySerp(item.keyword, item.market, 10);
  if (!r.ok) return { ok: false, error: r.message || r.status };
  // Find our position in top 10
  let ourPos = null;
  const top10 = r.results.map((x) => {
    const isUs = x.domain === OUR_DOMAIN || x.domain === `www.${OUR_DOMAIN}`;
    if (isUs && ourPos === null) ourPos = x.position;
    return { ...x, isUs };
  });

  item.top10 = top10;
  item.ourPosition = ourPos;
  item.lastChecked = new Date();
  if (ourPos !== null) {
    item.bestPosition = item.bestPosition === null || item.bestPosition === undefined ? ourPos : Math.min(item.bestPosition, ourPos);
    item.worstPosition = item.worstPosition === null || item.worstPosition === undefined ? ourPos : Math.max(item.worstPosition, ourPos);
  }
  item.history = (item.history || []).concat([{ date: new Date(), ourPosition: ourPos, totalResults: r.totalResults }]);
  if (item.history.length > 365) item.history = item.history.slice(-365);
  await item.save();
  return { ok: true, item };
}

router.post('/:id/refresh', async (req, res) => {
  try {
    if (!isSerpConfigured()) return res.status(400).json({ error: 'no_provider', message: 'SERP provider not configured (set SERPER_API_KEY or GOOGLE_CSE_API_KEY+GOOGLE_CSE_ID in .env)' });
    const item = await KeywordRanking.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    const r = await refreshOne(item);
    if (!r.ok) return res.status(502).json({ error: 'serp_failed', message: r.error });
    res.json({ item: r.item });
  } catch (e) {
    res.status(500).json({ error: 'refresh_failed', message: String(e.message || e) });
  }
});

router.post('/refresh-all', async (_req, res) => {
  try {
    if (!isSerpConfigured()) return res.status(400).json({ error: 'no_provider' });
    const items = await KeywordRanking.find({ active: true }).sort({ lastChecked: 1 }).limit(80);
    let ok = 0, err = 0;
    for (const item of items) {
      const r = await refreshOne(item);
      if (r.ok) ok++; else err++;
      await new Promise((res) => setTimeout(res, 250)); // 4/s rate limit
    }
    res.json({ refreshed: ok, errors: err, total: items.length });
  } catch (e) {
    res.status(500).json({ error: 'batch_failed', message: String(e.message || e) });
  }
});

// Auto-seed depuis les queries GSC actuelles (utile pour amorcer le tracker)
router.post('/seed-gsc', async (req, res) => {
  const { market = 'fr' } = req.body || {};
  try {
    const gsc = await querySearchAnalytics({ days: 30, dimensions: ['query'], rowLimit: 200 });
    if (!gsc.ok) return res.status(502).json({ error: 'gsc_failed', message: gsc.message });
    let created = 0, skipped = 0;
    for (const row of gsc.rows) {
      const kw = (row.keys[0] || '').trim().toLowerCase();
      if (!kw) continue;
      const exists = await KeywordRanking.findOne({ keyword: kw });
      if (exists) { skipped++; continue; }
      await KeywordRanking.create({ keyword: kw, market, source: 'gsc' });
      created++;
    }
    res.json({ created, skipped, total: gsc.rows.length });
  } catch (e) {
    res.status(500).json({ error: 'seed_failed', message: String(e.message || e) });
  }
});


// Suggested packs (curated high-value keywords)
router.get("/packs", async (_req, res) => {
  try {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const raw = await readFile(resolve(__dirname, "../data/target-keywords.json"), "utf8");
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: "packs_failed", message: String(e.message || e) });
  }
});

router.post("/import-pack", async (req, res) => {
  const { packId } = req.body || {};
  if (!packId) return res.status(400).json({ error: "packId required" });
  try {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const raw = await readFile(resolve(__dirname, "../data/target-keywords.json"), "utf8");
    const packs = JSON.parse(raw).packs || [];
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return res.status(404).json({ error: "pack not found" });
    let created = 0, skipped = 0;
    for (const kw of pack.keywords) {
      const exists = await KeywordRanking.findOne({ keyword: kw.toLowerCase() });
      if (exists) { skipped++; continue; }
      await KeywordRanking.create({ keyword: kw.toLowerCase(), market: pack.market, source: "pack:" + pack.id });
      created++;
    }
    res.json({ pack: pack.name, created, skipped, total: pack.keywords.length });
  } catch (e) {
    res.status(500).json({ error: "import_failed", message: String(e.message || e) });
  }
});


router.post("/send-report", async (req, res) => {
  try {
    const { to, periodLabel } = req.body || {};
    const r = await sendRankingReport({ to, periodLabel: periodLabel || "manuel" });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: "send_report_failed", message: String(e.message || e) });
  }
});


router.post("/optimize-batch", async (req, res) => {
  const { limit = 10, dryRun = false } = req.body || {};
  try {
    const r = await runOptimizerBatch({ limit, dryRun });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: "optimize_failed", message: String(e.message || e) });
  }
});

router.post("/:id/optimize", async (req, res) => {
  try {
    const item = await KeywordRanking.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "not_found" });
    if (!item.top10 || item.top10.length === 0) return res.status(400).json({ error: "refresh_first" });
    const page = await findMatchingPage(item.keyword, item.market === "fr" || item.market === "mc" ? "fr" : "en");
    if (!page) return res.status(404).json({ error: "no_matching_page" });
    const r = await optimizePage({ keyword: item.keyword, market: item.market, page, competitorsTop3: item.top10.slice(0, 3) });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: "optimize_failed", message: String(e.message || e) });
  }
});

export default router;
