import express from 'express';
import nodemailer from 'nodemailer';
import ChatUser from '../models/ChatUser.js';
import ProjectChat from '../models/ProjectChat.js';

const router = express.Router();

// Helper SMTP - meme conf que routes/contact.js. On duplique 5 lignes plutot
// que d'extraire dans un util commun, pour eviter de toucher contact.js qui
// marche en prod. A factoriser plus tard quand on aura plusieurs routes mail.
// @author Rabah Ziane - 2026-05-19
const createTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
};

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
        // Relance email tracking - badge "Deja relance" + count cote admin.
        // @author Rabah Ziane - 2026-05-19
        relancedAt: s.relancedAt || null,
        relanceCount: s.relanceCount || 0,
        category: s.category || null,
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
        // Relance email tracking @author Rabah Ziane - 2026-05-19
        relancedAt: session.relancedAt || null,
        relanceCount: session.relanceCount || 0,
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
   POST /:sessionId/relance
   Envoie un email de relance au prospect qui a commence a discuter puis a
   quitte. Personalise avec son prenom + dernier message qu'il a tape (pour
   ancrer le souvenir et augmenter le taux de retour).
   Marque la session avec relancedAt + incremente relanceCount.
   Body optionnel : { message: "texte custom admin" } - sinon template auto.
   @author Rabah Ziane - 2026-05-19
   =========================================================== */
router.post('/:sessionId/relance', requireAdmin, async (req, res) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ error: 'SMTP_USER/SMTP_PASS not configured' });
    }
    const session = await ProjectChat.findOne({ sessionId: req.params.sessionId });
    if (!session) return res.status(404).json({ error: 'session not found' });

    // Resolve user (chatUserId d'abord, legacy userId en fallback - meme logique
    // que GET / list. cf commentaire ligne 30 ci-dessus.)
    const uid = session.chatUserId || session.userId;
    if (!uid) return res.status(400).json({ error: 'no user linked to this session' });
    const user = await ChatUser.findById(uid).lean();
    if (!user || !user.email) return res.status(400).json({ error: 'user has no email' });

    const lastUserMsg = [...(session.messages || [])].reverse().find((m) => m.role === 'user');
    const userExcerpt = (lastUserMsg?.content || '').slice(0, 300);
    const firstName = (user.name || '').split(/\s+/)[0] || 'bonjour';
    const customBody = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    const subject = `${firstName}, on peut continuer la conversation ?`;
    const html = `
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"></head>
      <body style="margin:0;padding:0;background:#F4F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F4F5F7;padding:40px 16px;">
          <tr><td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:16px;box-shadow:0 2px 12px rgba(17,24,39,0.06);overflow:hidden;">
              <tr><td style="padding:32px 36px 8px;">
                <h1 style="margin:0 0 12px;color:#0B1220;font-size:22px;font-weight:700;letter-spacing:-0.01em;">Bonjour ${firstName},</h1>
                <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.6;">
                  ${customBody
                    ? customBody.replace(/\n/g, '<br/>')
                    : `Vous avez commenc&eacute; une conversation avec nous sur <strong>DELIVERY Digital</strong> mais nous n'avons pas pu finaliser ensemble. Je voulais juste m'assurer que vous aviez bien re&ccedil;u toutes les r&eacute;ponses dont vous aviez besoin.`}
                </p>
                ${userExcerpt ? `
                  <div style="background:#F4F5F7;border-left:3px solid #3B5BFF;border-radius:10px;padding:14px 16px;margin:18px 0;">
                    <p style="margin:0;color:#6B7280;font-size:12.5px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Votre dernier message</p>
                    <p style="margin:6px 0 0;color:#1F2937;font-size:14px;line-height:1.55;font-style:italic;">&laquo; ${userExcerpt.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))} &raquo;</p>
                  </div>
                ` : ''}
                <p style="margin:0 0 22px;color:#374151;font-size:15px;line-height:1.6;">
                  Si vous voulez en discuter, un simple clic suffit :
                </p>
                <p style="margin:0 0 26px;text-align:center;">
                  <a href="https://deliverydigital.fr/discutons" style="display:inline-block;background:#1D1D1F;color:#FFFFFF;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:600;">Reprendre la conversation</a>
                </p>
                <p style="margin:0 0 8px;color:#6B7280;font-size:13px;line-height:1.55;">
                  Ou r&eacute;pondez directement &agrave; cet email, je lis tout personnellement.
                </p>
              </td></tr>
              <tr><td style="padding:24px 36px 30px;border-top:1px solid #E5E7EB;">
                <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.5;">
                  DELIVERY Digital Nice &middot; <a href="https://deliverydigital.fr" style="color:#3B5BFF;text-decoration:none;">deliverydigital.fr</a>
                </p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body></html>`;

    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject,
      html,
      replyTo: process.env.SMTP_FROM || process.env.SMTP_USER,
    });

    session.relancedAt = new Date();
    session.relanceCount = (session.relanceCount || 0) + 1;
    await session.save();

    res.json({ ok: true, relancedAt: session.relancedAt, relanceCount: session.relanceCount, sentTo: user.email });
  } catch (e) {
    console.error('[relance] error', e);
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


/* POST /:sessionId/manual-message
   Envoi d'un message manuel par l'admin dans la conversation. Le message est
   ajoute comme provenant de "assistant" pour que le prospect le voie comme
   une reponse du conseiller. Active automatiquement humanTakeover.
   @author Rabah Ziane - 2026-05-21 */
router.post('/:sessionId/manual-message', requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body || {};
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'content required' });
    }
    const session = await ProjectChat.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'session not found' });

    session.messages.push({ role: 'assistant', content: content.trim() });
    session.humanTakeover = true;
    await session.save();
    res.json({ ok: true, messages: session.messages, humanTakeover: true });
  } catch (e) {
    console.error('[manual-message] error', e);
    res.status(500).json({ error: 'internal' });
  }
});

/* POST /:sessionId/takeover
   Toggle humanTakeover. Body : { active: true|false }.
   active=true : le bot IA ne repond plus, l'admin gere a la main.
   active=false : le bot IA reprend la main automatiquement.
   @author Rabah Ziane - 2026-05-21 */
router.post('/:sessionId/takeover', requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { active } = req.body || {};
    const session = await ProjectChat.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'session not found' });
    session.humanTakeover = !!active;
    await session.save();
    res.json({ ok: true, humanTakeover: session.humanTakeover });
  } catch (e) {
    console.error('[takeover] error', e);
    res.status(500).json({ error: 'internal' });
  }
});


/* PATCH /:sessionId/messages/:index
   Modifie le contenu d'un message existant (admin only). Index = position
   dans le tableau session.messages.
   @author Rabah Ziane - 2026-05-21 */
router.patch('/:sessionId/messages/:index', requireAdmin, async (req, res) => {
  try {
    const { sessionId, index } = req.params;
    const i = parseInt(index, 10);
    const { content } = req.body || {};
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'content required' });
    }
    const session = await ProjectChat.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (Number.isNaN(i) || i < 0 || i >= session.messages.length) {
      return res.status(400).json({ error: 'invalid index' });
    }
    session.messages[i].content = content.trim();
    session.markModified('messages');
    await session.save();
    res.json({ ok: true, messages: session.messages });
  } catch (e) {
    console.error('[edit-message] error', e);
    res.status(500).json({ error: 'internal' });
  }
});

/* DELETE /:sessionId/messages/:index
   Supprime un message a l'index donne (admin only).
   @author Rabah Ziane - 2026-05-21 */
router.delete('/:sessionId/messages/:index', requireAdmin, async (req, res) => {
  try {
    const { sessionId, index } = req.params;
    const i = parseInt(index, 10);
    const session = await ProjectChat.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (Number.isNaN(i) || i < 0 || i >= session.messages.length) {
      return res.status(400).json({ error: 'invalid index' });
    }
    session.messages.splice(i, 1);
    session.markModified('messages');
    await session.save();
    res.json({ ok: true, messages: session.messages });
  } catch (e) {
    console.error('[delete-message] error', e);
    res.status(500).json({ error: 'internal' });
  }
});


/* PATCH /:sessionId/category
   Tag admin pour qualifier le prospect : hot | serious | callback | cold | spam | null.
   @author Rabah Ziane - 2026-05-22 */
router.patch('/:sessionId/category', requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { category } = req.body || {};
    const allowed = ['hot', 'serious', 'callback', 'cold', 'spam', null];
    if (!allowed.includes(category)) {
      return res.status(400).json({ error: 'invalid category' });
    }
    const session = await ProjectChat.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'session not found' });
    session.category = category;
    await session.save();
    res.json({ ok: true, category: session.category });
  } catch (e) {
    console.error('[category] error', e);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
