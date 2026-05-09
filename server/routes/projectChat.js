import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import Anthropic from '@anthropic-ai/sdk';
import ProjectChat from '../models/ProjectChat.js';
import ChatUser from '../models/ChatUser.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const TOKEN_TTL = '90d';

const SYSTEM_PROMPT = `Tu es le conseiller projet de DELIVERY Digital, société française de développement web et mobile certifiée Crédit Impôt Innovation (CII).

# Langue
Tu détectes automatiquement la langue du premier message du prospect et tu réponds DANS CETTE LANGUE pendant toute la conversation (français, anglais, espagnol, italien, allemand, arabe, etc.). Si le prospect change de langue, tu t'adaptes. Toutes les règles ci-dessous s'appliquent dans la langue cible.

# Ton rôle
Mener une conversation pour cadrer le projet du prospect, puis lui sortir une ESTIMATION chiffrée en temps réel dès que tu as assez d'éléments. Jamais "devis ferme" - toujours "estimation indicative à confirmer avec un expert".

# Style
- Vouvoiement (ou équivalent formel) sauf si le prospect tutoie
- Phrases courtes, 2-3 max par réponse
- UNE question principale à la fois
- Tu reformules pour montrer que tu comprends
- Tu utilises des listes à puces "- " quand tu proposes des options/exemples au prospect (le frontend les rend cliquables)
- Utilise UNIQUEMENT le tiret du 6 ("-"), JAMAIS le tiret long
- Tu ne mentionnes le CII QUE si le prospect en parle d'abord OU si le projet est clairement innovant (voir règle dédiée plus bas - sois prudent)

# Phases

**Phase 1 - Cadrage (3-5 échanges)**
Si tu ne connais que l'email du prospect (pas de vrai prénom confirmé), commence ta première réponse par "Pour bien vous adresser, comment vous appelez-vous ?" puis enchaîne sur le projet. Si le prénom semble correct dans le contexte (extrait correctement de l'email), tutoie-le directement par son prénom.

Capte progressivement :
- Prénom (si pas confirmé)
- Type de projet (vitrine, e-commerce, app web/SaaS, mobile, CRM/ERP, marketplace, refonte, IA/chatbot)
- Contexte business (qui, pour qui, problème à résoudre)
- 3-5 features clés
- Délai souhaité
- Téléphone et nom de l'entreprise (en fin de conversation, naturellement)

**Phase 2 - Estimation**
Dès que tu as type + scope + 2-3 features, sors une ESTIMATION formatée comme ceci (markdown brut, pas de tableaux). NE METS PAS la ligne CII par défaut :

\`\`\`
ESTIMATION INDICATIVE
━━━━━━━━━━━━━━━━━━━━

Projet : [titre court]

Base [type]              [montant] €
+ [feature 1]            +[montant] €
+ [feature 2]            +[montant] €
+ [feature 3]            +[montant] €
─────────────────────────────────
Total HT                 [total] €
TVA 20%                  [tva] €
TTC                      [ttc] €

Délai estimé : [X-Y] semaines
\`\`\`

Termine TOUJOURS par : "Estimation indicative à confirmer avec un expert. Un expert revient vers vous sous 24h avec un devis détaillé."

**Phase 3**
Si pas déjà connu, demande téléphone et entreprise (le prénom et email sont déjà connus via le compte).

# Grille tarifaire (en EUR HT)

**BASE par type :**
- Site vitrine : 990 €
- Site e-commerce : 2 500 €
- App web / SaaS : 4 000 €
- App mobile native iOS+Android : 8 000 €
- CRM / ERP sur mesure : 8 000 €
- Marketplace multi-vendeurs : 15 000 €
- Refonte site existant : 1 500 €
- Intégration IA / chatbot : 3 000 €

**OPTIONS (à additionner) :**
- Auth + comptes utilisateurs : +600 €
- Paiement Stripe / abonnement : +800 €
- Multi-langue (par langue) : +600 €
- Dashboard admin sur mesure : +1 500 €
- Catalogue produits (jusqu'à 500) : +800 €
- Notifications email + SMS : +500 €
- IA conversationnelle : +2 500 €
- API tierce (1 intégration) : +600 €
- App mobile compagnon : +6 000 €
- SEO + analytics : +500 €
- UX/UI custom Figma : +1 200 €
- Hébergement infogéré 1 an : +480 €
- Maintenance corrective 1 an : +1 200 €
- Migration données legacy : +800 €
- Tests automatisés CI/CD : +1 200 €
- PWA / offline : +1 500 €
- Notifications push : +600 €
- Géolocalisation / cartographie : +800 €

**MULTIPLICATEURS DELAI :**
- Urgent (-30% délai) : +25% prix
- Normal : prix de base
- Flexible (+30% délai) : -10% prix

**DELAIS référence :**
- Vitrine : 2-4 sem | E-commerce : 3-8 | SaaS : 4-12 | Mobile : 6-16 | CRM : 8-20 | Marketplace : 12-24

# Règles
- Fourchette si scope flou ("entre X et Y €")
- Arrondis aux 100€
- Si prix demandé avant les bases, dis "j'ai besoin de 2-3 précisions de plus" et pose la question manquante
- 2 niveaux possibles ("MVP à X €" / "version complète à Y €")

# Règle CII (très important - sois prudent)
Le Crédit Impôt Innovation -20% est STRICTEMENT RÉSERVÉ aux entreprises françaises (SIRET) ET aux projets reconnus INNOVATION. Pas tous les projets web sont éligibles.

Conditions cumulatives :
1. Entreprise française (SIRET/SIREN)
2. Projet innovant (IA propriétaire, algorithme original, SaaS B2B nouvelle génération, logiciel métier complexe)
3. PAS éligibles : sites vitrines classiques, Shopify/Woo standard, refontes graphiques

Tu ne mentionnes pas le CII spontanément. Tu en parles UNIQUEMENT si le prospect évoque "innovation", "IA", "R&D", "CII", "crédit impôt", OU si son projet est manifestement innovant.

Si tu en parles : "Pour les entreprises françaises avec un projet reconnu innovant, le Crédit Impôt Innovation peut permettre une économie de 20% - à valider avec un expert-comptable, ce n'est pas automatique."

Ne mets JAMAIS la ligne "Avec le CII -20%" dans l'estimation par défaut.

# Devises
Zone euro/France : EUR (€). Hors zone euro : peux convertir USD/GBP/CHF mais facturation officielle en EUR HT.`;

let anthropicClient = null;
const getAnthropic = () => {
  if (!anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing in env');
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
};

/* Auth middleware (Bearer JWT scoped to chat users) */
const requireChatAuth = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
    const decoded = jwt.verify(h.slice(7), JWT_SECRET);
    if (!decoded?.chatUserId) return res.status(401).json({ error: 'invalid_token' });
    const user = await ChatUser.findById(decoded.chatUserId);
    if (!user) return res.status(401).json({ error: 'user_not_found' });
    req.chatUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
};

/* SMTP helper */
const createSmtpTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT || '587');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
};

const sendLeadEmail = async (chat, chatUser) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const transporter = createSmtpTransporter();
  const transcript = chat.messages
    .map((m) => `[${m.role === 'user' ? 'Prospect' : 'Assistant'}] ${m.content}`)
    .join('\n\n');

  const subject = `Nouveau lead - ${chatUser.name} (${chatUser.email})`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 640px;">
      <h2 style="color:#1D1D1F;">Nouveau prospect via /discutons</h2>
      <table style="border-collapse: collapse; width:100%; margin-bottom: 24px;">
        <tr><td style="padding:6px 12px;"><b>Nom</b></td><td>${chatUser.name}</td></tr>
        <tr><td style="padding:6px 12px;"><b>Email</b></td><td>${chatUser.email}</td></tr>
        <tr><td style="padding:6px 12px;"><b>Téléphone</b></td><td>${chatUser.phone || chat.leadInfo?.phone || '-'}</td></tr>
        <tr><td style="padding:6px 12px;"><b>Société</b></td><td>${chatUser.company || chat.leadInfo?.company || '-'}</td></tr>
        <tr><td style="padding:6px 12px;"><b>Pays</b></td><td>${chatUser.country || '-'}</td></tr>
        <tr><td style="padding:6px 12px;"><b>Conversation</b></td><td>${chat.title}</td></tr>
      </table>
      <h3 style="color:#1D1D1F;">Conversation complète</h3>
      <pre style="background:#F5F5F7; padding:16px; border-radius:12px; white-space:pre-wrap; font-size:13px; line-height:1.5;">${transcript}</pre>
      <p style="color:#86868B; font-size:12px; margin-top:24px;">Session: ${chat.sessionId} · ${new Date().toLocaleString('fr-FR')}</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: 'contact@deliverydigital.fr',
    subject,
    html
  });

  chat.notifiedAt = new Date();
  chat.status = 'notified';
  await chat.save();
};

const extractLeadInfo = (existing, latestUser) => {
  const next = { ...(existing || {}) };
  const text = latestUser || '';
  if (!next.email) {
    const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (m) next.email = m[0];
  }
  if (!next.phone) {
    const m = text.replace(/\s/g, '').match(/(\+?\d{8,15})/);
    if (m && m[0].length >= 9) next.phone = m[0];
  }
  return next;
};

const newSessionId = () => `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/* ============== AUTH ============== */

/* POST /api/project-chat/auth - light sign-in (email only, name optional) */
router.post('/auth', async (req, res) => {
  try {
    const { email, name, company, phone, country } = req.body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'email_invalid' });

    const cleanEmail = email.toLowerCase().trim();
    // Default name from email prefix if not provided (e.g. john.doe@x.com -> John)
    const fallbackName = (cleanEmail.split('@')[0] || 'Visiteur').split(/[._-]/)[0];
    const finalName = (name && name.trim().length >= 2)
      ? name.trim()
      : fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);

    let user = await ChatUser.findOne({ email: cleanEmail });
    if (!user) {
      user = await ChatUser.create({
        email: cleanEmail,
        name: finalName,
        company: company?.trim() || null,
        phone: phone?.trim() || null,
        country: country?.trim() || null,
      });
    } else {
      let dirty = false;
      if (name && user.name !== name.trim()) { user.name = name.trim(); dirty = true; }
      if (company && !user.company) { user.company = company.trim(); dirty = true; }
      if (phone && !user.phone) { user.phone = phone.trim(); dirty = true; }
      if (country && !user.country) { user.country = country.trim(); dirty = true; }
      user.lastActiveAt = new Date();
      await user.save();
    }

    const token = jwt.sign({ chatUserId: user._id.toString() }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    return res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, company: user.company, phone: user.phone, country: user.country }
    });
  } catch (err) {
    console.error('[chat-auth] error:', err);
    return res.status(500).json({ error: 'auth_failed' });
  }
});

/* GET /api/project-chat/me - return current user */
router.get('/me', requireChatAuth, (req, res) => {
  const u = req.chatUser;
  return res.json({ user: { id: u._id, email: u.email, name: u.name, company: u.company, phone: u.phone, country: u.country } });
});

/* ============== CONVERSATIONS ============== */

/* GET /api/project-chat/conversations - list user's conversations (newest first) */
router.get('/conversations', requireChatAuth, async (req, res) => {
  const items = await ProjectChat.find({ chatUserId: req.chatUser._id })
    .select('_id sessionId title status createdAt updatedAt messages')
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  const summary = items.map((c) => ({
    sessionId: c.sessionId,
    title: c.title,
    status: c.status,
    messageCount: (c.messages || []).length,
    lastUpdate: c.updatedAt,
    preview: (c.messages || []).slice(-1).map((m) => m.content).join('').slice(0, 90)
  }));
  return res.json({ conversations: summary });
});

/* POST /api/project-chat/new - create empty new conversation */
router.post('/new', requireChatAuth, async (req, res) => {
  const sessionId = newSessionId();
  const chat = await ProjectChat.create({
    sessionId,
    chatUserId: req.chatUser._id,
    title: 'Nouvelle conversation',
    messages: [],
  });
  await ChatUser.updateOne({ _id: req.chatUser._id }, { $inc: { conversationCount: 1 } });
  return res.json({ sessionId: chat.sessionId, title: chat.title });
});

/* GET /api/project-chat/:sessionId - load full conversation */
router.get('/:sessionId', requireChatAuth, async (req, res) => {
  const chat = await ProjectChat.findOne({ sessionId: req.params.sessionId, chatUserId: req.chatUser._id });
  if (!chat) return res.json({ messages: [], leadInfo: null, title: null });
  return res.json({
    messages: chat.messages,
    leadInfo: chat.leadInfo,
    status: chat.status,
    title: chat.title,
    sessionId: chat.sessionId,
  });
});

/* DELETE /api/project-chat/:sessionId */
router.delete('/:sessionId', requireChatAuth, async (req, res) => {
  await ProjectChat.deleteOne({ sessionId: req.params.sessionId, chatUserId: req.chatUser._id });
  return res.json({ ok: true });
});

/* ============== SEND MESSAGE ============== */

/* POST /api/project-chat - send a message in a conversation (creates if missing) */
router.post('/', requireChatAuth, async (req, res) => {
  try {
    const { sessionId: providedSessionId, message } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message required' });
    }
    if (message.length > 4000) return res.status(400).json({ error: 'message too long' });

    const sessionId = providedSessionId || newSessionId();

    let chat = await ProjectChat.findOne({ sessionId, chatUserId: req.chatUser._id });
    if (!chat) {
      chat = new ProjectChat({
        sessionId,
        chatUserId: req.chatUser._id,
        title: 'Nouvelle conversation',
        messages: [],
        userAgent: req.get('user-agent') || null,
        ip: req.ip || null,
        leadInfo: {
          name: req.chatUser.name,
          email: req.chatUser.email,
          phone: req.chatUser.phone,
          company: req.chatUser.company,
        },
      });
      await ChatUser.updateOne({ _id: req.chatUser._id }, { $inc: { conversationCount: 1 } });
    }

    chat.messages.push({ role: 'user', content: message });
    chat.leadInfo = extractLeadInfo(chat.leadInfo, message);

    // Auto-set title from first user message (up to 60 chars)
    if (chat.title === 'Nouvelle conversation') {
      chat.title = message.split('\n')[0].slice(0, 60).trim() || 'Nouvelle conversation';
    }

    // Build system prompt with user context
    const userContext = `
# Contexte du prospect (déjà connu)
- Prénom : ${req.chatUser.name}
- Email : ${req.chatUser.email}
${req.chatUser.company ? `- Entreprise : ${req.chatUser.company}\n` : ''}${req.chatUser.phone ? `- Téléphone : ${req.chatUser.phone}\n` : ''}${req.chatUser.country ? `- Pays : ${req.chatUser.country}\n` : ''}
Tu peux t'adresser à ${req.chatUser.name} par son prénom dès le début.`;

    const history = chat.messages.map((m) => ({ role: m.role, content: m.content }));

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: SYSTEM_PROMPT + userContext,
      messages: history
    });

    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    chat.messages.push({ role: 'assistant', content: reply });
    await chat.save();

    // Trigger lead email if criteria met (3+ user turns, not yet notified)
    const userTurns = chat.messages.filter((m) => m.role === 'user').length;
    if (!chat.notifiedAt && userTurns >= 3) {
      sendLeadEmail(chat, req.chatUser).catch((err) => console.error('[lead email] failed:', err?.message));
    }

    await ChatUser.updateOne({ _id: req.chatUser._id }, { lastActiveAt: new Date() });

    return res.json({
      reply,
      sessionId: chat.sessionId,
      title: chat.title,
      leadInfo: chat.leadInfo,
      messageCount: chat.messages.length
    });
  } catch (err) {
    console.error('[project-chat send] error:', err);
    return res.status(500).json({ error: 'chat_failed', message: err?.message });
  }
});

export default router;
