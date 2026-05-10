import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { SeoContent } from '../models/index.js';

const router = express.Router();

// Simple admin auth: header `x-admin-secret` matches env ADMIN_SECRET
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const requireAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
};

const slugify = (s) =>
  s
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/* ===========================================================
   Prompt templates
   =========================================================== */

const SYSTEM_BASE = `Tu rediges du contenu SEO pour DELIVERY Digital, agence de developpement informatique basee a Nice (France) qui intervient en remote pour des clients en France et a l'international.

Services : sites web sur mesure (SaaS, dashboards), applications mobiles iOS/Android, logiciels metier (CRM, ERP, plateformes B2B), Cloud / DevOps. Stack : React, Next.js, TypeScript, Node.js, PostgreSQL, React Native, AWS.

Differenciateur cle : un assistant IA conversationnel sur https://deliverydigital.fr/discutons qui qualifie le projet du prospect en 5 minutes (a la place d'un formulaire de devis classique).

Reperes : Credit Impot Innovation (CII) - jusqu'a 20% des depenses d'innovation remboursees pour les clients eligibles en France. SIRET 902 945 195 00029. RCS Nice.

Regles de redaction :
- Francais naturel, sans jargon excessif
- Tiret du 6 uniquement ("-"), JAMAIS le tiret long ("—")
- Pas d'emoji
- Tonalite professionnelle, axee benefice business
- Mentionne /discutons comme point d'entree quand c'est pertinent (CTA implicite)
- Pas de mention de la formation Qualiopi (focus 100% vente informatique)
- Pas de prix faux/invente : si tu cites une fourchette, reste vague ("a partir de quelques milliers d'euros", "sur devis personnalise")
- Pas de promesses irrealistes (delais magiques, garanties absolues)
- INTERDIT : ne JAMAIS argumenter "agence locale = mieux" ou "preferez une agence pres de chez vous". DELIVERY Digital intervient en remote dans le monde entier ; mentionner Nice/Cote d'Azur uniquement comme fait factuel (siege social) - jamais comme un avantage commercial de proximite. La proximite geographique n'est PAS un argument de vente.
- Pour les pages ciblant une ville : on intervient pour des clients de cette zone, point. Pas "vous etes a [ville], donc..." mais "nous accompagnons des entreprises de [ville] et au-dela, en remote".`;

const PROMPT_CITY_SERVICE = (city, service) => `Genere une page SEO programmatique ciblant le mot-cle "${service} ${city}".

RAPPEL CRITIQUE : ne JAMAIS argumenter que travailler avec une agence locale est mieux. DELIVERY Digital travaille en remote pour des clients partout (France + international). La page mentionne ${city} comme cible SEO et zone d'intervention naturelle, mais l'argument de vente est la qualite du code et l'approche conversationnelle IA, PAS la proximite.

Format de reponse JSON STRICT (rien d'autre, pas de markdown wrappers) :
{
  "title": "...",
  "metaTitle": "max 60 caracteres",
  "metaDescription": "max 155 caracteres",
  "targetKeyword": "${service} ${city}",
  "body": "... markdown ..."
}

Le champ "body" doit contenir 800-1200 mots en markdown :
- # H1 contenant la cible "${service} ${city}"
- Intro 2-3 phrases (probleme business + promesse de la solution)
- ## ${service} sur mesure : ce que nous livrons (decrit le service en detail, pas le local)
- ## Notre approche : qualifier votre projet en 5 minutes par chat IA (mettre en avant /discutons)
- ## Stack technique et methodologie (technos concretes : React, Next.js, TypeScript, Node.js, AWS, etc.)
- ## Comment nous travaillons avec des clients de ${city} et au-dela (remote-first : visios, slack, github, demos hebdo)
- ## Eligibilite Credit Impot Innovation pour les clients en France (informatif, pas vendeur)
- ## Discutons de votre projet (CTA vers /discutons)
- ## Questions frequentes (3-4 Q/R, exemples : delais typiques, mode de collaboration remote, propriete du code)

Inclure 1-2 fois dans le body un appel d'action vers https://deliverydigital.fr/discutons.`;

const PROMPT_ARTICLE = (keyword) => `Genere un article de blog SEO long-form ciblant "${keyword}".

RAPPEL CRITIQUE : ne JAMAIS argumenter que travailler avec une agence locale ou de proximite est mieux. DELIVERY Digital travaille en remote pour des clients partout dans le monde. L'article doit etre pertinent pour un lecteur situe n'importe ou (France ou international). Si la geographie est mentionnee, c'est uniquement comme fait factuel, jamais comme avantage commercial.

Format JSON STRICT :
{
  "title": "...",
  "metaTitle": "max 60 caracteres, accrocheur",
  "metaDescription": "max 155 caracteres",
  "targetKeyword": "${keyword}",
  "body": "... markdown 1200-1800 mots ..."
}

Structure body :
- # H1 percutant (peut etre une question ou un chiffre)
- Intro 3-4 phrases (hook + promesse de valeur)
- 4-6 sections ## avec sous-titres ###
- Listes a puces, exemples concrets, mini-cas si pertinent
- Conclusion + CTA vers /discutons (1-2 phrases naturelles)

Le contenu doit apporter une vraie valeur (pas du remplissage). Ecris pour un dirigeant TPE/PME ou tech lead qui veut comprendre, pour un public mondial francophone.`;

const PROMPT_FAQ_BATCH = (theme) => `Genere 5 questions-reponses SEO pour la thematique "${theme}".

Format JSON STRICT :
{
  "items": [
    { "question": "...", "answer": "..." },
    ...
  ],
  "title": "FAQ - ${theme}",
  "metaDescription": "max 155 caracteres"
}

Chaque reponse : 2-4 phrases, factuelle, naturelle. Une des reponses doit subtilement mentionner /discutons comme moyen d'aller plus loin.`;

/* ===========================================================
   Generation
   =========================================================== */

async function callClaude(userPrompt) {
  if (!anthropic) throw new Error('ANTHROPIC_API_KEY missing');
  const res = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4000,
    system: SYSTEM_BASE,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const text = res.content[0]?.text || '';
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('no JSON in response');
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
}

async function genCityService({ city, service }) {
  const data = await callClaude(PROMPT_CITY_SERVICE(city, service));
  const slug = slugify(`${service}-${city}`);
  return {
    type: 'city-service',
    slug,
    status: 'draft',
    title: data.title,
    metaTitle: data.metaTitle,
    metaDescription: data.metaDescription,
    targetKeyword: data.targetKeyword,
    body: data.body,
    city,
    service,
    generationPrompt: `city-service: ${service} ${city}`,
  };
}

async function genArticle({ keyword }) {
  const data = await callClaude(PROMPT_ARTICLE(keyword));
  const slug = slugify(data.title);
  return {
    type: 'article',
    slug,
    status: 'draft',
    title: data.title,
    metaTitle: data.metaTitle,
    metaDescription: data.metaDescription,
    targetKeyword: data.targetKeyword,
    body: data.body,
    generationPrompt: `article: ${keyword}`,
  };
}

async function genFaq({ theme }) {
  const data = await callClaude(PROMPT_FAQ_BATCH(theme));
  const slug = slugify(`faq-${theme}`);
  return {
    type: 'faq',
    slug,
    status: 'draft',
    title: data.title || `FAQ - ${theme}`,
    metaDescription: data.metaDescription,
    targetKeyword: theme,
    body: (data.items || []).map((it, i) => `### ${i + 1}. ${it.question}\n\n${it.answer}`).join('\n\n'),
    faqItems: data.items || [],
    generationPrompt: `faq: ${theme}`,
  };
}

/* ===========================================================
   Routes
   =========================================================== */

// Generate N items
router.post('/generate', requireAdmin, async (req, res) => {
  try {
    const { type, jobs } = req.body;
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ error: 'jobs[] required' });
    }
    const results = [];
    for (const job of jobs) {
      try {
        let item;
        if (type === 'city-service') item = await genCityService(job);
        else if (type === 'article') item = await genArticle(job);
        else if (type === 'faq') item = await genFaq(job);
        else throw new Error(`unknown type ${type}`);

        // Avoid slug collisions
        const existing = await SeoContent.findOne({ slug: item.slug });
        if (existing) item.slug = `${item.slug}-${Date.now().toString(36)}`;

        const saved = await SeoContent.create(item);
        results.push({ ok: true, id: saved._id, slug: saved.slug, title: saved.title });
      } catch (err) {
        results.push({ ok: false, job, error: err.message });
      }
    }
    res.json({ generated: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status, type, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const items = await SeoContent.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await SeoContent.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update (edit before publish)
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const allowed = ['title', 'metaTitle', 'metaDescription', 'body', 'targetKeyword', 'faqItems', 'jsonLd'];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
    const item = await SeoContent.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit (publish)
router.post('/:id/submit', requireAdmin, async (req, res) => {
  try {
    const item = await SeoContent.findByIdAndUpdate(
      req.params.id,
      { status: 'published', publishedAt: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject
router.post('/:id/reject', requireAdmin, async (req, res) => {
  try {
    const item = await SeoContent.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await SeoContent.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

// Public route helper: for serving published content by slug
export const publicSeoRouter = (() => {
  const r = express.Router();

  r.get('/:slug', async (req, res) => {
    try {
      const item = await SeoContent.findOne({ slug: req.params.slug, status: 'published' }).lean();
      if (!item) return res.status(404).json({ error: 'not found' });
      res.json({ item });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  r.get('/', async (req, res) => {
    try {
      const items = await SeoContent.find({ status: 'published' })
        .select('slug type title metaDescription publishedAt')
        .sort({ publishedAt: -1 })
        .lean();
      res.json({ items });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return r;
})();
