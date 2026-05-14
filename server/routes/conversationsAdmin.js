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

    // Filtrer les chatUserId null/undefined/string invalide pour eviter le crash Mongoose
    // ("Cast to ObjectId failed for value 'null'"). @author Rabah Ziane - 2026-05-11
    // FIX 2026-05-14 (Rabah) : le champ s'appelle chatUserId dans ProjectChat (pas userId qui
    // est un legacy ref 'User' rarement set). Avant on lisait s.userId -> undefined -> tous
    // les prospects affiches "(anonyme)" cote admin. Maintenant fallback : chatUserId d'abord,
    // userId si absent (compat data historique).
    const getUid = (s) => s.chatUserId || s.userId;
    const userIds = [...new Set(
      sessions
        .map(getUid)
        .filter((id) => id != null && String(id) !== 'null' && /^[a-f\d]{24}$/i.test(String(id)))
        .map((id) => String(id))
    )];
    const users = userIds.length > 0 ? await ChatUser.find({ _id: { $in: userIds } }).lean() : [];
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    let items = sessions.map((s) => {
      const user = userMap[String(getUid(s))] || {};
      const messages = s.messages || [];
      const lastMsg = messages[messages.length - 1];
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
      const updatedAt = new Date(s.updatedAt).getTime();
      const isActive = now - updatedAt < ACTIVE_WINDOW_MS;
      return {
        sessionId: s.sessionId,
        userId: String(getUid(s) || ''),
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

    // 2026-05-14 (Rabah) - Inclure aussi les ChatUsers qui se sont INSCRITS (login email)
    // mais n'ont pas encore lance de conversation. Pourquoi : user veut voir les prospects
    // des qu'ils se sont identifies, sans attendre qu'ils tapent le 1er message - permet
    // de relancer manuellement les leads "tiedes" qui sont arrives mais ont quitte.
    // sessionId virtuel "pending_<userId>" - reconnu par GET /:sessionId plus bas.
    const usersWithSession = new Set(items.map((i) => i.userId).filter(Boolean));
    const orphanUsers = await ChatUser.find({
      _id: { $nin: [...usersWithSession].filter((id) => /^[a-f\d]{24}$/i.test(id)) }
    })
      .sort({ lastActiveAt: -1, createdAt: -1 })
      .limit(200)
      .lean();

    const pendingItems = orphanUsers.map((u) => {
      const ts = u.lastActiveAt || u.createdAt;
      const updatedAt = new Date(ts).getTime();
      const isActive = now - updatedAt < ACTIVE_WINDOW_MS;
      return {
        sessionId: `pending_${String(u._id)}`,
        userId: String(u._id),
        title: 'Inscrit, pas encore de message',
        status: 'pending',
        messageCount: 0,
        lastMessage: null,
        lastUserContent: '',
        lastAssistantContent: '',
        updatedAt: ts,
        createdAt: u.createdAt,
        isActive,
        user: {
          email: u.email || '',
          name: u.name || '',
          phone: u.phone || '',
          company: u.company || '',
          country: u.country || '',
        },
      };
    });

    items = [...items, ...pendingItems].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

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
      pending: items.filter((i) => i.status === 'pending').length,
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
    // 2026-05-14 (Rabah) : preffixe "pending_<userId>" -> prospect inscrit sans conversation.
    // On retourne un payload vide avec juste les infos user pour que le drawer affiche
    // les coordonnees du prospect sans messages.
    if (req.params.sessionId.startsWith('pending_')) {
      const uid = req.params.sessionId.replace('pending_', '');
      if (!/^[a-f\d]{24}$/i.test(uid)) return res.status(404).json({ error: 'not found' });
      const user = await ChatUser.findById(uid).lean();
      if (!user) return res.status(404).json({ error: 'not found' });
      return res.json({
        session: {
          sessionId: req.params.sessionId,
          userId: String(user._id),
          title: 'Inscrit, pas encore de message',
          status: 'pending',
          messages: [],
          createdAt: user.createdAt,
          updatedAt: user.lastActiveAt || user.createdAt,
          isActive: false,
        },
        user: {
          _id: String(user._id),
          email: user.email,
          name: user.name,
          phone: user.phone,
          company: user.company,
          country: user.country,
          createdAt: user.createdAt,
        },
      });
    }
    const session = await ProjectChat.findOne({ sessionId: req.params.sessionId }).lean();
    if (!session) return res.status(404).json({ error: 'not found' });

    // FIX 2026-05-14 (Rabah) : utiliser chatUserId (champ reel) avec fallback userId.
    const uid = session.chatUserId || session.userId;
    const user = uid ? await ChatUser.findById(uid).lean() : null;
    const updatedAt = new Date(session.updatedAt).getTime();
    const isActive = Date.now() - updatedAt < ACTIVE_WINDOW_MS;

    res.json({
      session: {
        sessionId: session.sessionId,
        userId: String(uid || ''),
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
