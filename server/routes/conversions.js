/**
 * Routes conversions :
 *   - POST /api/conversions             (publique - tracking)
 *   - GET  /api/admin/conversions/*     (admin - dashboard, header x-admin-secret)
 *
 * RGPD : IP hashee SHA-256 + salt server-side, jamais stockee en clair.
 *
 * @author Rabah Ziane - 2026-05-13
 */
import express from 'express';
import crypto from 'crypto';
import Conversion, { CONVERSION_TYPES } from '../models/Conversion.js';
import { isMongoAvailable } from '../config/mongodb.js';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const IP_SALT = process.env.DASHBOARD_IP_SALT || crypto.randomBytes(32).toString('hex');

function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function hashIp(ip) {
  if (!ip) return '';
  return crypto.createHash('sha256').update(ip + IP_SALT).digest('hex').slice(0, 16);
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || '';
}

function rangeStart(days) {
  const d = new Date();
  d.setDate(d.getDate() - Math.max(1, Math.min(365, parseInt(days, 10) || 30)));
  d.setHours(0, 0, 0, 0);
  return d;
}

const publicRouter = express.Router();
const adminRouter = express.Router();

/* ===== PUBLIC : POST /api/conversions ===== */
publicRouter.post('/', async (req, res) => {
  try {
    const { type, page, referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content, metadata } = req.body || {};
    if (!type || !CONVERSION_TYPES.includes(type)) {
      return res.status(400).json({ error: 'type invalide', expected: CONVERSION_TYPES });
    }
    if (!isMongoAvailable()) return res.json({ ok: true, persisted: false });

    const ua = String(req.headers['user-agent'] || '').slice(0, 100);
    const ipHash = hashIp(getClientIp(req));
    await Conversion.create({
      type,
      page: String(page || '').slice(0, 500),
      referrer: String(referrer || '').slice(0, 500),
      utm_source: String(utm_source || '').slice(0, 100),
      utm_medium: String(utm_medium || '').slice(0, 100),
      utm_campaign: String(utm_campaign || '').slice(0, 200),
      utm_term: String(utm_term || '').slice(0, 100),
      utm_content: String(utm_content || '').slice(0, 200),
      ipHash,
      ua,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
    return res.json({ ok: true, persisted: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/* ===== ADMIN : GET /api/admin/conversions/* ===== */
adminRouter.get('/stats', requireAdmin, async (req, res) => {
  try {
    if (!isMongoAvailable()) return res.json({ byType: {}, total: 0, daily: [], range: req.query.range || '30' });
    const range = String(req.query.range || '30');
    const start = rangeStart(range);

    const byTypeRaw = await Conversion.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const byType = CONVERSION_TYPES.reduce((acc, t) => { acc[t] = 0; return acc; }, {});
    byTypeRaw.forEach((r) => { byType[r._id] = r.count; });
    const total = Object.values(byType).reduce((s, n) => s + n, 0);

    const dailyRaw = await Conversion.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, byType: { $push: '$type' } } },
      { $sort: { _id: 1 } },
    ]);
    const daily = dailyRaw.map((d) => {
      const counts = CONVERSION_TYPES.reduce((acc, t) => { acc[t] = 0; return acc; }, {});
      d.byType.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
      return { date: d._id, count: d.count, ...counts };
    });

    return res.json({ byType, total, daily, range });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

adminRouter.get('/list', requireAdmin, async (req, res) => {
  try {
    if (!isMongoAvailable()) return res.json({ items: [], total: 0, page: 1 });
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.type && CONVERSION_TYPES.includes(req.query.type)) filter.type = req.query.type;
    if (req.query.range) filter.createdAt = { $gte: rangeStart(req.query.range) };

    const [items, total] = await Promise.all([
      Conversion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-ipHash -ua -__v').lean(),
      Conversion.countDocuments(filter),
    ]);
    return res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

adminRouter.get('/top-pages', requireAdmin, async (req, res) => {
  try {
    if (!isMongoAvailable()) return res.json({ pages: [] });
    const start = rangeStart(req.query.range || '30');
    const rows = await Conversion.aggregate([
      { $match: { createdAt: { $gte: start }, page: { $ne: '' } } },
      { $group: { _id: '$page', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 5 },
    ]);
    return res.json({ pages: rows.map((r) => ({ page: r._id, count: r.count })) });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

adminRouter.get('/sources', requireAdmin, async (req, res) => {
  try {
    if (!isMongoAvailable()) return res.json({ sources: [] });
    const start = rangeStart(req.query.range || '30');
    const rows = await Conversion.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: {
            $cond: [
              { $ne: ['$utm_source', ''] }, '$utm_source',
              { $cond: [
                { $regexMatch: { input: '$referrer', regex: 'google\\.' } }, 'google_organic',
                { $cond: [ { $eq: ['$referrer', ''] }, 'direct', 'referral' ] },
              ] },
            ],
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } }, { $limit: 10 },
    ]);
    return res.json({ sources: rows.map((r) => ({ source: r._id, count: r.count })) });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

export { publicRouter, adminRouter };
