import express from 'express';
import ChatUser from '../models/ChatUser.js';
import ProjectChat from '../models/ProjectChat.js';

const router = express.Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const requireAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
};

const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // 5 min

/* ===========================================================
   List all conversations with last message + activity status
   =========================================================== */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { active, q, limit = 100 } = req.query;
    const now = Date.now();

    const sessions = await ProjectChat.find({})
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    const userIds = [...new Set(sessions.map((s) => String(s.userId)))];
    const users = await ChatUser.find({ _id: { $in: userIds } }).lean();
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    let items = sessions.map((s) => {
      const user = userMap[String(s.userId)] || {};
      const messages = s.messages || [];
      const lastMsg = messages[messages.length - 1];
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
      const updatedAt = new Date(s.updatedAt).getTime();
      const isActive = now - updatedAt < ACTIVE_WINDOW_MS;
      return {
        sessionId: s.sessionId,
        userId: String(s.userId),
        title: s.title || (lastUserMsg?.content || '').slice(0, 60),
        status: s.status,
        messageCount: messages.length,
        lastMessage: lastMsg ? {
          role: lastMsg.role,
          content: (lastMsg.content || '').slice(0, 280),
          at: lastMsg.at || s.updatedAt,
        } : null,
        lastUserContent: (lastUserMsg?.content || '').slice(0, 200),
        lastAssistantContent: (lastAssistantMsg?.content || '').slice(0, 200),
        updatedAt: s.updatedAt,
        createdAt: s.createdAt,
        isActive,
        user: {
          email: user.email || '',
          name: user.name || '',
          phone: user.phone || '',
          company: user.company || '',
          country: user.country || '',
        },
      };
    });

    if (active === 'true') items = items.filter((i) => i.isActive);
    if (q) {
      const ql = String(q).toLowerCase();
      items = items.filter((i) =>
        i.user.email.toLowerCase().includes(ql) ||
        i.user.name.toLowerCase().includes(ql) ||
        (i.title || '').toLowerCase().includes(ql) ||
        i.lastUserContent.toLowerCase().includes(ql)
      );
    }

    const stats = {
      total: items.length,
      active: items.filter((i) => i.isActive).length,
    };

    res.json({ items, stats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   Get full conversation by sessionId (all messages)
   =========================================================== */
router.get('/:sessionId', requireAdmin, async (req, res) => {
  try {
    const session = await ProjectChat.findOne({ sessionId: req.params.sessionId }).lean();
    if (!session) return res.status(404).json({ error: 'not found' });

    const user = await ChatUser.findById(session.userId).lean();
    const updatedAt = new Date(session.updatedAt).getTime();
    const isActive = Date.now() - updatedAt < ACTIVE_WINDOW_MS;

    res.json({
      session: {
        sessionId: session.sessionId,
        userId: String(session.userId),
        title: session.title,
        status: session.status,
        messages: session.messages || [],
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isActive,
      },
      user: user ? {
        _id: String(user._id),
        email: user.email,
        name: user.name,
        phone: user.phone,
        company: user.company,
        country: user.country,
        createdAt: user.createdAt,
      } : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   Live tail: returns only messages since `since` ISO timestamp
   Used for polling pendant qu'une conv est ouverte cote admin
   =========================================================== */
router.get('/:sessionId/since', requireAdmin, async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const session = await ProjectChat.findOne({ sessionId: req.params.sessionId }).select('messages updatedAt').lean();
    if (!session) return res.status(404).json({ error: 'not found' });
    const messages = (session.messages || []).filter((m) => {
      const t = m.at ? new Date(m.at) : new Date(session.updatedAt);
      return t > since;
    });
    res.json({ messages, updatedAt: session.updatedAt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
