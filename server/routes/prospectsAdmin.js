import express from 'express';
import { Prospect } from '../models/index.js';

const router = express.Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const requireAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
};

/* ===========================================================
   Stats
   =========================================================== */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [total, byStatus, bySource] = await Promise.all([
      Prospect.countDocuments(),
      Prospect.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Prospect.aggregate([{ $group: { _id: '$source', count: { $sum: 1 } } }]),
    ]);

    const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const recent = await Prospect.countDocuments({ createdAt: { $gte: since30d } });

    const totalValue = await Prospect.aggregate([
      { $match: { status: { $in: ['qualified', 'meeting', 'proposal', 'won'] } } },
      { $group: { _id: null, sum: { $sum: '$estimatedValueEur' } } },
    ]);

    res.json({
      total,
      recent30d: recent,
      pipelineValueEur: totalValue[0]?.sum || 0,
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
      bySource: Object.fromEntries(bySource.map((s) => [s._id, s.count])),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   List
   =========================================================== */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status, source, q, tag, limit = 100, skip = 0, sort = '-createdAt' } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (tag) filter.tags = tag;
    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
      ];
    }
    const items = await Prospect.find(filter)
      .select('-timeline')
      .sort(sort)
      .skip(parseInt(skip, 10))
      .limit(Math.min(parseInt(limit, 10), 500))
      .lean();
    const total = await Prospect.countDocuments(filter);
    res.json({ items, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   Get one (with full timeline)
   =========================================================== */
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await Prospect.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json({ item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   Create
   =========================================================== */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.source) data.source = 'manual';
    const prospect = await Prospect.create(data);
    res.json({ item: prospect });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   Update
   =========================================================== */
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const allowed = [
      'email', 'firstName', 'lastName', 'fullName', 'company', 'role', 'phone', 'website',
      'city', 'country', 'industry', 'siret', 'status', 'tags', 'score', 'estimatedValueEur',
      'projectType', 'summary', 'lastContactAt', 'nextFollowUpAt', 'assignedTo',
    ];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
    const item = await Prospect.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json({ item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   Add timeline entry (note, email, call, ...)
   =========================================================== */
router.post('/:id/timeline', requireAdmin, async (req, res) => {
  try {
    const { kind, body, meta } = req.body;
    if (!kind) return res.status(400).json({ error: 'kind required' });
    const prospect = await Prospect.findById(req.params.id);
    if (!prospect) return res.status(404).json({ error: 'not found' });

    prospect.timeline.push({ kind, body: body || '', meta, by: 'admin', at: new Date() });
    if (kind === 'email' || kind === 'call' || kind === 'chat') {
      prospect.lastContactAt = new Date();
      if (prospect.status === 'new') prospect.status = 'contacted';
    }
    await prospect.save();
    res.json({ item: prospect });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   Delete
   =========================================================== */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await Prospect.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   Bulk delete / archive / tag
   =========================================================== */
router.post('/bulk', requireAdmin, async (req, res) => {
  try {
    const { ids = [], action, value } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });

    let result;
    if (action === 'delete') {
      result = await Prospect.deleteMany({ _id: { $in: ids } });
    } else if (action === 'status') {
      result = await Prospect.updateMany({ _id: { $in: ids } }, { status: value });
    } else if (action === 'addTag') {
      result = await Prospect.updateMany({ _id: { $in: ids } }, { $addToSet: { tags: value } });
    } else if (action === 'removeTag') {
      result = await Prospect.updateMany({ _id: { $in: ids } }, { $pull: { tags: value } });
    } else {
      return res.status(400).json({ error: 'unknown action' });
    }
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   Import CSV (upsert by email)
   Body: { csv: "email,firstName,lastName,company,phone,city,industry,role,website\n..." }
   =========================================================== */
router.post('/import-csv', requireAdmin, async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv body required' });

    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return res.status(400).json({ error: 'csv must have header + at least 1 row' });

    const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    const out = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const row = {};
      header.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); });

      if (!row.email) { out.skipped++; continue; }

      try {
        const existing = await Prospect.findOne({ email: row.email.toLowerCase() });
        const data = {
          email: row.email.toLowerCase(),
          firstName: row.firstname || row.first_name || '',
          lastName: row.lastname || row.last_name || '',
          company: row.company || '',
          phone: row.phone || '',
          city: row.city || row.ville || '',
          industry: row.industry || row.secteur || '',
          role: row.role || row.poste || '',
          website: row.website || row.site || '',
          source: 'import-csv',
        };
        if (existing) {
          Object.assign(existing, data);
          await existing.save();
          out.updated++;
        } else {
          await Prospect.create(data);
          out.created++;
        }
      } catch (err) {
        out.errors.push(`row ${i + 1}: ${err.message}`);
      }
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* Minimal CSV line parser (handles quoted commas) */
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

/* ===========================================================
   Export CSV
   =========================================================== */
router.get('/export.csv', requireAdmin, async (req, res) => {
  try {
    const items = await Prospect.find().select('-timeline').lean();
    const header = ['email', 'firstName', 'lastName', 'company', 'phone', 'city', 'industry', 'role', 'website', 'status', 'source', 'score', 'estimatedValueEur', 'tags', 'createdAt'];
    const lines = [header.join(',')];
    for (const p of items) {
      lines.push(
        header
          .map((h) => {
            let v = p[h];
            if (Array.isArray(v)) v = v.join('|');
            if (v == null) v = '';
            v = String(v).replace(/"/g, '""');
            return /[",\n]/.test(v) ? `"${v}"` : v;
          })
          .join(',')
      );
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="prospects-${Date.now()}.csv"`);
    res.send(lines.join('\n'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   Auto-import from /discutons chat sessions
   Sync les ChatUser/ProjectChat existants en Prospect (skip si deja existe par email).
   =========================================================== */
router.post('/sync-from-chats', requireAdmin, async (req, res) => {
  try {
    const ChatUser = (await import('../models/ChatUser.js')).default;
    const ProjectChat = (await import('../models/ProjectChat.js')).default;

    const out = { created: 0, updated: 0, skipped: 0 };
    const chatUsers = await ChatUser.find().lean();

    for (const cu of chatUsers) {
      const email = (cu.email || '').toLowerCase();
      if (!email) { out.skipped++; continue; }

      const sessions = await ProjectChat.find({ userId: cu._id }).select('sessionId messages updatedAt').lean();
      const allMessages = sessions.flatMap((s) => (s.messages || []).map((m) => ({ ...m, sessionId: s.sessionId })));
      const lastUserMsg = [...allMessages].reverse().find((m) => m.role === 'user');
      const lastUpdate = sessions.reduce((max, s) => (s.updatedAt > max ? s.updatedAt : max), new Date(0));

      // Build summary from last 4 user messages
      const userMsgs = allMessages.filter((m) => m.role === 'user').slice(-4).map((m) => m.content).join(' / ');

      const data = {
        email,
        firstName: cu.name?.split(' ')[0] || '',
        lastName: cu.name?.split(' ').slice(1).join(' ') || '',
        company: cu.company || '',
        phone: cu.phone || '',
        country: cu.country || '',
        source: 'chat',
        sourceRef: { chatUserId: String(cu._id), sessions: sessions.map((s) => s.sessionId) },
        chatSessionIds: sessions.map((s) => s.sessionId),
        summary: userMsgs.slice(0, 600),
        lastContactAt: lastUpdate,
      };

      const existing = await Prospect.findOne({ email });
      if (existing) {
        Object.assign(existing, {
          firstName: existing.firstName || data.firstName,
          lastName: existing.lastName || data.lastName,
          company: existing.company || data.company,
          phone: existing.phone || data.phone,
          chatSessionIds: Array.from(new Set([...(existing.chatSessionIds || []), ...data.chatSessionIds])),
          summary: data.summary || existing.summary,
          lastContactAt: data.lastContactAt > (existing.lastContactAt || new Date(0)) ? data.lastContactAt : existing.lastContactAt,
        });
        await existing.save();
        out.updated++;
      } else {
        const p = await Prospect.create({
          ...data,
          status: 'qualified',
          timeline: [{ kind: 'chat', body: lastUserMsg?.content || '', meta: { sessionCount: sessions.length }, by: 'system', at: lastUpdate }],
        });
        out.created++;
      }
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
