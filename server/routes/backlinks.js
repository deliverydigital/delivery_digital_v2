/**
 * Routes admin pour le link building :
 *   GET  /api/admin/backlinks            -> liste des backlinks trackés
 *   POST /api/admin/backlinks            -> ajoute un backlink
 *   PATCH /api/admin/backlinks/:id       -> update status / DA / notes
 *   DELETE /api/admin/backlinks/:id      -> retire
 *   GET  /api/admin/backlinks/directories -> liste des annuaires prioritaires (checklist)
 *   GET  /api/admin/backlinks/stats      -> stats agrégés (par type, status)
 *
 * @author Rabah Ziane - 2026-05-17
 */
import express from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Backlink from '../models/Backlink.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';

function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
}

const router = express.Router();
router.use(requireAdmin);

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

router.get('/', async (_req, res) => {
  try {
    const items = await Backlink.find({ active: true }).sort({ dateAcquired: -1, createdAt: -1 }).lean();
    res.json({ count: items.length, items });
  } catch (e) {
    res.status(500).json({ error: 'list_failed', message: String(e.message || e) });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const all = await Backlink.find({ active: true }).lean();
    const stats = {
      total: all.length,
      byStatus: {},
      byType: {},
      live: 0,
      planned: 0,
      avgDa: 0,
    };
    let daSum = 0, daCount = 0;
    for (const b of all) {
      stats.byStatus[b.status] = (stats.byStatus[b.status] || 0) + 1;
      stats.byType[b.type] = (stats.byType[b.type] || 0) + 1;
      if (b.status === 'live') stats.live++;
      if (b.status === 'planned') stats.planned++;
      if (b.da) { daSum += b.da; daCount++; }
    }
    stats.avgDa = daCount > 0 ? Math.round(daSum / daCount) : 0;
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: 'stats_failed', message: String(e.message || e) });
  }
});

router.get('/directories', async (_req, res) => {
  try {
    const raw = await readFile(resolve(__dirname, '../data/directories.json'), 'utf8');
    const data = JSON.parse(raw);
    // Cross-reference with existing backlinks to know which are done
    const existing = await Backlink.find({ active: true }).select('sourceDomain status').lean();
    const doneDomains = new Set(existing.filter((b) => b.status === 'live').map((b) => b.sourceDomain));
    const plannedDomains = new Set(existing.filter((b) => b.status === 'planned').map((b) => b.sourceDomain));
    const directories = data.directories.map((d) => {
      const dom = extractDomain(d.url);
      return {
        ...d,
        sourceDomain: dom,
        doneStatus: doneDomains.has(dom) ? 'live' : plannedDomains.has(dom) ? 'planned' : 'todo',
      };
    });
    res.json({ count: directories.length, directories });
  } catch (e) {
    res.status(500).json({ error: 'directories_failed', message: String(e.message || e) });
  }
});

router.post('/', async (req, res) => {
  const { sourceUrl, targetUrl, anchor, da, type, status, notes } = req.body || {};
  if (!sourceUrl) return res.status(400).json({ error: 'sourceUrl required' });
  try {
    const sourceDomain = extractDomain(sourceUrl);
    const doc = await Backlink.findOneAndUpdate(
      { sourceUrl },
      {
        $set: {
          sourceDomain,
          targetUrl: targetUrl || 'https://deliverydigital.fr/',
          anchor: anchor || '',
          da: da || null,
          type: type || 'other',
          status: status || 'planned',
          notes: notes || '',
          active: true,
          ...(status === 'live' ? { dateAcquired: new Date() } : {}),
        },
      },
      { upsert: true, new: true }
    );
    res.json({ item: doc });
  } catch (e) {
    res.status(500).json({ error: 'create_failed', message: String(e.message || e) });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.status === 'live' && !updates.dateAcquired) updates.dateAcquired = new Date();
    const doc = await Backlink.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json({ item: doc });
  } catch (e) {
    res.status(500).json({ error: 'update_failed', message: String(e.message || e) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Backlink.updateOne({ _id: req.params.id }, { $set: { active: false } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'delete_failed', message: String(e.message || e) });
  }
});

router.post('/discover', async (_req, res) => {
  try {
    const { scrapeGoogleSerp } = await import('../seo/googleScraper.js');
    const queries = [
      '"deliverydigital.fr" -site:deliverydigital.fr',
      '"delivery digital" nice agence -site:deliverydigital.fr',
      'link:deliverydigital.fr -site:deliverydigital.fr',
    ];
    const found = new Map();
    for (const q of queries) {
      const r = await scrapeGoogleSerp(q, 'fr', 20);
      if (!r.ok) continue;
      for (const item of r.results) {
        const domain = item.domain;
        if (!domain || domain === 'deliverydigital.fr' || domain.endsWith('.deliverydigital.fr')) continue;
        if (!found.has(item.url)) found.set(item.url, item);
      }
    }
    let created = 0;
    for (const [url, item] of found) {
      const existing = await Backlink.findOne({ sourceUrl: url });
      if (existing) continue;
      await Backlink.create({
        sourceUrl: url,
        sourceDomain: item.domain,
        anchor: (item.title || '').slice(0, 100),
        notes: 'Auto-decouvert: ' + (item.snippet || '').slice(0, 150),
        type: 'other',
        status: 'live',
        dateAcquired: new Date(),
      });
      created++;
    }
    res.json({ scanned: found.size, created });
  } catch (e) {
    res.status(500).json({ error: 'discover_failed', message: String(e.message || e) });
  }
});

// Quick add d'un annuaire en planned
router.post('/from-directory', async (req, res) => {
  const { directoryId } = req.body || {};
  if (!directoryId) return res.status(400).json({ error: 'directoryId required' });
  try {
    const raw = await readFile(resolve(__dirname, '../data/directories.json'), 'utf8');
    const dir = (JSON.parse(raw).directories || []).find((d) => d.id === directoryId);
    if (!dir) return res.status(404).json({ error: 'directory not found' });
    const sourceDomain = extractDomain(dir.url);
    const existing = await Backlink.findOne({ sourceDomain });
    if (existing) return res.json({ item: existing, existed: true });
    const doc = await Backlink.create({
      sourceUrl: dir.url,
      sourceDomain,
      type: 'directory',
      status: 'planned',
      da: dir.da || null,
      notes: dir.notes || dir.name,
    });
    res.json({ item: doc, created: true });
  } catch (e) {
    res.status(500).json({ error: 'from_directory_failed', message: String(e.message || e) });
  }
});

export default router;
