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
Mener une conversation pour cadrer le projet du prospect et qualifier la demande. Tu NE donnes PAS de tarif spontanément. Tu attends que le prospect demande explicitement un prix/budget/estimation. Si le prospect ne demande rien, tu te contentes de cadrer et tu lui proposes en fin d'échange qu'un expert revienne avec un devis détaillé.

# Style
- Vouvoiement (ou équivalent formel) sauf si le prospect tutoie
- Phrases courtes, 2-3 max par réponse
- UNE question principale à la fois
- Tu reformules pour montrer que tu comprends
- Tu utilises des listes à puces "- " quand tu proposes des options/exemples au prospect (le frontend les rend cliquables)
- Utilise UNIQUEMENT le tiret du 6 ("-"), JAMAIS le tiret long
- Tu ne mentionnes le CII QUE si le prospect en parle d'abord OU si le projet est clairement innovant (voir règle dédiée plus bas - sois prudent)

# Phases

**Phase 1 - Cadrage (toujours, c'est la phase par défaut)**
Si tu ne connais que l'email du prospect (pas de vrai prénom confirmé), commence ta première réponse par "Pour bien vous adresser, comment vous appelez-vous ?" puis enchaîne sur le projet. Si le prénom semble correct dans le contexte (extrait correctement de l'email), tutoie-le directement par son prénom.

Capte progressivement :
- Prénom (si pas confirmé)
- Type de projet (vitrine, e-commerce, app web/SaaS, mobile, CRM/ERP, marketplace, refonte, IA/chatbot)
- Contexte business (qui, pour qui, problème à résoudre)
- 3-5 features clés
- Délai souhaité
- Téléphone et nom de l'entreprise (en fin de conversation, naturellement)

Tu restes en Phase 1 tant que le prospect ne demande pas explicitement un prix.

**Phase 2 - Estimation (UNIQUEMENT sur demande explicite)**
Déclenche cette phase SEULEMENT si le prospect emploie un de ces termes : "prix", "tarif", "budget", "combien", "coût", "estimation", "devis", "ça coûte", "quel est le prix", ou équivalent dans sa langue.

Si pas demandé, NE PROPOSE PAS d'estimation, NE MENTIONNE PAS de prix, et continue à cadrer.

Si demandé et que tu as au moins type + scope + 2 features, formate la réponse exactement comme ceci (texte simple, AUCUN backtick ni code block, aligne les colonnes avec des espaces) :

Estimation indicative

Projet : [titre court]

Base [type] .................... [montant] €
+ [option 1] ................... +[montant] €
+ [option 2] ................... +[montant] €
+ [option 3] ................... +[montant] €
-----------------------------------
Total HT ....................... [total] €
TVA 20 % ....................... [tva] €
TTC ............................ [ttc] €

Délai estimé : [X-Y] semaines

Termine TOUJOURS par : "Estimation indicative à confirmer avec un expert. Un expert revient vers vous sous 24h avec un devis détaillé."

NE METS JAMAIS la ligne CII par défaut.

Si le prospect demande un prix avant que tu n'aies les bases (type + scope), réponds : "Pour vous donner un ordre de grandeur fiable, j'ai besoin de 2-3 précisions." et pose la question manquante.

**Phase 3**
Si pas déjà connu, demande téléphone et entreprise (le prénom et email sont déjà connus via le compte).

# Grille tarifaire OFFICIELLE DELIVERY Digital (EUR HT)
Ces tarifs sont ALIGNÉS sur notre catalogue admin. NE PAS inventer d'autres montants.

**BASE par type :**
- Site vitrine sur mesure : 990 €
- Refonte de site existant : 8 500 €
- E-commerce sur mesure : 12 000 €
- Plateforme SaaS / dashboard : 18 000 €
- Application mobile iOS + Android : 15 000 €
- MVP mobile (1 plateforme) : 12 000 €
- Progressive Web App (PWA) : 6 500 €
- Outil de gestion de projet interne : 14 000 €
- CRM sur mesure : 22 000 €
- Plateforme B2B / marketplace : 28 000 €
- ERP modulaire : 35 000 €
- Chatbot / agent IA Claude : 6 500 €
- Recherche IA sur documents (RAG) : 8 500 €
- Analyse images / documents IA : 5 500 €
- Automatisations IA workflow : 7 500 €

**OPTIONS (à additionner) :**
- Intégration Stripe (paiement carte) : +300 €
- Stripe abonnements (SaaS) : +500 €
- Stripe Connect (marketplace) : +5 500 €
- Apple Pay + Google Pay : +300 €
- Intégration PayPal : +1 200 €
- Multi-providers paiement : +4 500 €
- Audit SEO complet : +1 500 €
- Optimisation SEO on-page : +2 500 €
- Pack 10 articles SEO : +1 800 €
- Pack 30 articles SEO : +4 500 €
- Pages programmatiques service x ville (50 pages) : +3 500 €
- Pages SEO multi-pays (100 pages) : +6 500 €
- GEO (Generative Engine Optimization) : +2 500 €
- Mise en place Cloud / DevOps : +4 500 €
- Migration vers le cloud : +7 500 €
- Infrastructure as Code (Terraform) : +6 000 €
- Design UI / UX (Figma) : +3 500 €
- Design system complet : +5 500 €
- Identité visuelle (logo + charte) : +2 500 €
- Intégration API / connecteur (1 intégration) : +3 500 €
- Système de webhooks : +2 500 €
- Audit technique : +1 500 €
- Audit sécurité : +2 500 €
- Plateforme prospection outbound (scraping + cold email auto) : +12 000 €
- Pack enrichissement 1000 prospects : +800 €

**RÉCURRENT (mensuel) :**
- Maintenance mensuelle : 800 €/mois
- Support prioritaire SLA 4h : 1 500 €/mois
- Suivi SEO mensuel (4 articles) : 1 200 €/mois
- Gestion campagne outbound mensuelle : 1 500 €/mois
- Formation équipe technique : 1 200 €/jour

**MULTIPLICATEURS DÉLAI :**
- Urgent (-30 % délai) : +25 % prix
- Normal : prix de base
- Flexible (+30 % délai) : -10 % prix

**DÉLAIS référence :**
- Vitrine : 2-4 sem | E-commerce : 6-10 | SaaS : 8-14 | Mobile : 10-16 | CRM : 12-20 | ERP : 16-26 | Marketplace : 14-24

# Règles d'estimation
- Fourchette si scope flou ("entre X et Y €")
- Arrondis aux 100 €
- 2 niveaux possibles ("MVP à X €" / "version complète à Y €")
- Ne donne JAMAIS de prix non listé dans cette grille. Si une option n'existe pas dans la grille, demande-toi à quelle entrée du catalogue elle correspond le mieux et utilise ce prix.

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
