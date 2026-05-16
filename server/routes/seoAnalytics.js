/**
 * Dashboard SEO + conversions agrege.
 *
 * Auth : header x-admin-secret (meme schema que /api/admin/conversions).
 *
 * Endpoints :
 *   GET /api/admin/seo-analytics/overview?range=30
 *   GET /api/admin/seo-analytics/timeseries?range=30
 *   GET /api/admin/seo-analytics/top-pages?range=30&limit=10
 *   GET /api/admin/seo-analytics/funnel?range=30
 *   GET /api/admin/seo-analytics/page-stats?range=30  (per-slug stats pour SeoAdmin)
 *
 * @author Rabah Ziane - 2026-05-17
 */
import express from 'express';
import Conversion from '../models/Conversion.js';
import SeoContent from '../models/SeoContent.js';
import { querySearchAnalytics } from '../seo/gscClient.js';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';

function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function clampRange(days) {
  const n = parseInt(days, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.max(1, Math.min(365, n));
}

function rangeStart(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

const router = express.Router();
router.use(requireAdmin);

/* ------------------------- OVERVIEW ------------------------- */
router.get('/overview', async (req, res) => {
  const days = clampRange(req.query.range);
  const since = rangeStart(days);

  try {
    const [pubCount, draftCount, rejCount, byType, byCountry, byLang] = await Promise.all([
      SeoContent.countDocuments({ status: 'published' }),
      SeoContent.countDocuments({ status: 'draft' }),
      SeoContent.countDocuments({ status: 'rejected' }),
      SeoContent.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
      SeoContent.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$country', count: { $sum: 1 } } }]),
      SeoContent.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$lang', count: { $sum: 1 } } }]),
    ]);

    const convAgg = await Conversion.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const conversionsByType = { contact_submit: 0, phone_click: 0, email_click: 0, quote_click: 0 };
    let totalConversions = 0;
    for (const r of convAgg) {
      if (conversionsByType[r._id] !== undefined) conversionsByType[r._id] = r.count;
      totalConversions += r.count;
    }

    const uniqueSessionsAgg = await Conversion.aggregate([
      { $match: { createdAt: { $gte: since }, ipHash: { $ne: '' } } },
      { $group: { _id: '$ipHash' } }, { $count: 'n' },
    ]);
    const uniqueSessions = uniqueSessionsAgg[0]?.n || 0;

    let seo = { gscStatus: 'unauthorized', clicks: 0, impressions: 0, ctr: 0, position: 0, indexedUrls: 0 };
    const gsc = await querySearchAnalytics({ days, dimensions: [], rowLimit: 1 });
    if (gsc.ok) {
      const r = gsc.rows[0] || {};
      seo = {
        gscStatus: 'ok',
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
        indexedUrls: 0,
      };
      const gscPages = await querySearchAnalytics({ days, dimensions: ['page'], rowLimit: 5000 });
      if (gscPages.ok) {
        seo.indexedUrls = gscPages.rows.filter((x) => (x.impressions || 0) > 0).length;
      }
    } else {
      seo.gscMessage = gsc.message;
    }

    const denominator = seo.gscStatus === 'ok' && seo.clicks > 0 ? seo.clicks : uniqueSessions;
    const conversionRate = denominator > 0 ? totalConversions / denominator : 0;

    res.json({
      range: days,
      pages: {
        published: pubCount,
        draft: draftCount,
        rejected: rejCount,
        byType: Object.fromEntries(byType.map((x) => [x._id || 'unknown', x.count])),
        byCountry: Object.fromEntries(byCountry.map((x) => [x._id || 'unknown', x.count])),
        byLang: Object.fromEntries(byLang.map((x) => [x._id || 'unknown', x.count])),
      },
      seo,
      conversions: {
        total: totalConversions,
        byType: conversionsByType,
        uniqueSessions,
        conversionRate,
        denominator,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'overview_failed', message: String(e.message || e) });
  }
});

/* ------------------------- TIMESERIES ------------------------- */
router.get('/timeseries', async (req, res) => {
  const days = clampRange(req.query.range);
  const since = rangeStart(days);

  try {
    const convDaily = await Conversion.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          conversions: { $sum: 1 },
          sessionsSet: { $addToSet: '$ipHash' },
        },
      },
      { $project: { _id: 1, conversions: 1, sessions: { $size: '$sessionsSet' } } },
      { $sort: { _id: 1 } },
    ]);
    const convMap = Object.fromEntries(convDaily.map((x) => [x._id, { conversions: x.conversions, sessions: x.sessions }]));

    const gsc = await querySearchAnalytics({ days, dimensions: ['date'], rowLimit: 1000 });
    const gscMap = {};
    if (gsc.ok) {
      for (const r of gsc.rows) {
        gscMap[r.keys[0]] = { clicks: r.clicks || 0, impressions: r.impressions || 0 };
      }
    }

    const series = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since); d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const c = convMap[key] || { conversions: 0, sessions: 0 };
      const g = gscMap[key] || {};
      series.push({
        date: key,
        conversions: c.conversions,
        sessions: c.sessions,
        clicks: g.clicks || 0,
        impressions: g.impressions || 0,
      });
    }

    res.json({ range: days, gscStatus: gsc.ok ? 'ok' : gsc.status, series });
  } catch (e) {
    res.status(500).json({ error: 'timeseries_failed', message: String(e.message || e) });
  }
});

/* ------------------------- TOP PAGES ------------------------- */
router.get('/top-pages', async (req, res) => {
  const days = clampRange(req.query.range);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
  const since = rangeStart(days);

  try {
    const topByConv = await Conversion.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$page', conversions: { $sum: 1 }, sessions: { $addToSet: '$ipHash' } } },
      { $project: { page: '$_id', conversions: 1, sessions: { $size: '$sessions' }, _id: 0 } },
      { $sort: { conversions: -1 } },
      { $limit: limit },
    ]);

    const gsc = await querySearchAnalytics({ days, dimensions: ['page'], rowLimit: 1000 });
    const gscMap = {};
    if (gsc.ok) {
      for (const r of gsc.rows) {
        try {
          const u = new URL(r.keys[0]);
          gscMap[u.pathname] = { clicks: r.clicks || 0, impressions: r.impressions || 0, position: r.position || 0, ctr: r.ctr || 0 };
        } catch { /* ignore */ }
      }
    }

    const merged = topByConv.map((p) => ({ ...p, ...(gscMap[p.page] || {}) }));
    res.json({ range: days, gscStatus: gsc.ok ? 'ok' : gsc.status, pages: merged });
  } catch (e) {
    res.status(500).json({ error: 'top_pages_failed', message: String(e.message || e) });
  }
});

/* ------------------------- FUNNEL ------------------------- */
router.get('/funnel', async (req, res) => {
  const days = clampRange(req.query.range);
  const since = rangeStart(days);

  try {
    const byType = await Conversion.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 }, uniqueIps: { $addToSet: '$ipHash' } } },
      { $project: { _id: 1, count: 1, uniques: { $size: '$uniqueIps' } } },
    ]);
    const tmap = Object.fromEntries(byType.map((x) => [x._id, x]));

    const sessionsAgg = await Conversion.aggregate([
      { $match: { createdAt: { $gte: since }, ipHash: { $ne: '' } } },
      { $group: { _id: '$ipHash' } }, { $count: 'n' },
    ]);
    const sessions = sessionsAgg[0]?.n || 0;

    const gsc = await querySearchAnalytics({ days, dimensions: [], rowLimit: 1 });
    const clicks = gsc.ok ? (gsc.rows[0]?.clicks || 0) : 0;

    const steps = [
      { key: 'gsc_clicks', label: 'Clics SEO (GSC)', value: clicks, available: gsc.ok },
      { key: 'sessions', label: 'Sessions trackees', value: sessions, available: true },
      { key: 'contact_submit', label: 'Formulaire envoye', value: tmap.contact_submit?.count || 0, available: true },
      { key: 'quote_click', label: 'CTA devis clique', value: tmap.quote_click?.count || 0, available: true },
      { key: 'phone_email', label: 'Tel/email clique', value: (tmap.phone_click?.count || 0) + (tmap.email_click?.count || 0), available: true },
    ];

    res.json({ range: days, gscStatus: gsc.ok ? 'ok' : gsc.status, steps });
  } catch (e) {
    res.status(500).json({ error: 'funnel_failed', message: String(e.message || e) });
  }
});

/* ------------------------- PAGE STATS (per slug, pour SeoAdmin) ------------------------- */
router.get('/page-stats', async (req, res) => {
  const days = clampRange(req.query.range);
  const since = rangeStart(days);

  try {
    const convByPage = await Conversion.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$page', conversions: { $sum: 1 } } },
    ]);
    const convMap = Object.fromEntries(convByPage.map((x) => [x._id, x.conversions]));

    const gsc = await querySearchAnalytics({ days, dimensions: ['page'], rowLimit: 5000 });
    const gscByPath = {};
    if (gsc.ok) {
      for (const r of gsc.rows) {
        try {
          const u = new URL(r.keys[0]);
          gscByPath[u.pathname] = { clicks: r.clicks || 0, impressions: r.impressions || 0, position: r.position || 0, ctr: r.ctr || 0 };
        } catch { /* ignore */ }
      }
    }

    const published = await SeoContent.find({ status: 'published' }, { slug: 1, type: 1, title: 1 }).lean();
    const stats = {};
    for (const p of published) {
      const path = p.type === 'article' ? `/blog/${p.slug}` : `/services/${p.slug}`;
      stats[p.slug] = {
        path,
        ...(gscByPath[path] || { clicks: 0, impressions: 0, position: 0, ctr: 0 }),
        conversions: convMap[path] || 0,
      };
    }

    res.json({ range: days, gscStatus: gsc.ok ? 'ok' : gsc.status, stats });
  } catch (e) {
    res.status(500).json({ error: 'page_stats_failed', message: String(e.message || e) });
  }
});

/* ------------------------- GSC PAGES RAW (toutes URLs GSC, pas filtre SeoContent) ------------------------- */
router.get('/gsc-pages', async (req, res) => {
  const days = clampRange(req.query.range);
  const limit = Math.max(1, Math.min(500, parseInt(req.query.limit, 10) || 100));
  const since = rangeStart(days);

  try {
    const gsc = await querySearchAnalytics({ days, dimensions: ['page'], rowLimit: 5000 });
    if (!gsc.ok) {
      return res.json({ range: days, gscStatus: gsc.status, pages: [], message: gsc.message });
    }

    const convAgg = await Conversion.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$page', conversions: { $sum: 1 } } },
    ]);
    const convMap = Object.fromEntries(convAgg.map((x) => [x._id, x.conversions]));

    const pages = gsc.rows.map((r) => {
      const url = r.keys[0];
      let pathname = url; let host = '';
      try {
        const u = new URL(url);
        pathname = u.pathname || '/';
        host = u.hostname || '';
      } catch { /* ignore */ }
      return {
        url,
        host,
        path: pathname,
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
        conversions: convMap[pathname] || 0,
      };
    });

    pages.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
    res.json({ range: days, gscStatus: 'ok', pages: pages.slice(0, limit), total: pages.length });
  } catch (e) {
    res.status(500).json({ error: 'gsc_pages_failed', message: String(e.message || e) });
  }
});

export default router;
