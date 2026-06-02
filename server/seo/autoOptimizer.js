/**
 * Agent auto-optimization SEO : pour chaque keyword cible, identifie la page
 * la mieux matchée et utilise Claude API pour la réécrire en visant le top 3.
 *
 * Stratégie :
 *  - Pour chaque KeywordRanking avec ourPosition > 3 ou null
 *  - Trouve la SeoContent la plus proche (overlap mots du keyword vs slug/title)
 *  - Appelle Claude avec : keyword cible + top 3 concurrents + body actuel
 *  - Récupère le nouveau body optimisé + nouveau title + meta
 *  - Sauvegarde + log
 *
 * Quota : limit 10-15 pages/run pour ne pas brûler API budget.
 *
 * @author Rabah Ziane - 2026-05-17
 */
import Anthropic from '@anthropic-ai/sdk';
import KeywordRanking from '../models/KeywordRanking.js';
import SeoContent from '../models/SeoContent.js';

const MODEL = process.env.SEO_OPTIMIZER_MODEL || 'claude-opus-4-7';

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function tokenize(s) {
  return String(s || '').toLowerCase().split(/[^a-z0-9àâäçéèêëîïôöùûüÿñæœ]+/i).filter((w) => w.length >= 3);
}

function jaccard(a, b) {
  const A = new Set(a); const B = new Set(b);
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter + 0.0001);
}

/**
 * Trouve la SeoContent la mieux matchée pour un keyword.
 * Stratégie : tokenize keyword, compare avec slug + title des SeoContent published.
 */
async function findMatchingPage(keyword, lang = 'fr') {
  const kwTokens = tokenize(keyword);
  if (kwTokens.length === 0) return null;
  const candidates = await SeoContent.find({ status: 'published', lang }, { _id: 1, slug: 1, title: 1, type: 1 }).lean();
  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    const slugTokens = tokenize(c.slug);
    const titleTokens = tokenize(c.title);
    const score = jaccard(kwTokens, [...slugTokens, ...titleTokens]);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  if (bestScore < 0.15) return null; // Pas assez proche
  return { ...best, score: bestScore };
}

/**
 * Optimize une page SEO pour un keyword précis via Claude.
 */
async function optimizePage({ keyword, market, page, competitorsTop3, dryRun = false }) {
  const anthropic = getAnthropic();
  if (!anthropic) return { ok: false, reason: 'no_api_key' };

  const fullPage = await SeoContent.findById(page._id);
  if (!fullPage) return { ok: false, reason: 'page_not_found' };

  const competitorsText = (competitorsTop3 || []).slice(0, 3).map((c, i) =>
    `${i + 1}. ${c.domain} — "${c.title}"\n   ${c.snippet || ''}`
  ).join('\n');

  const prompt = `Tu es un expert SEO français. Ta mission : réécrire cette page pour qu'elle passe devant les 3 concurrents sur Google pour le mot-clé "${keyword}" (marché : ${market}).

## Mot-clé cible
${keyword}

## Top 3 concurrents actuels sur ce mot-clé
${competitorsText || '(aucun concurrent identifié)'}

## Page actuelle
**Title actuel** : ${fullPage.metaTitle || fullPage.title}
**Meta description actuelle** : ${fullPage.metaDescription || '(vide)'}
**Body actuel (markdown)** :
${fullPage.body}

## Consignes strictes
- Renvoie UNIQUEMENT du JSON valide avec ces 4 clés : "title", "metaTitle", "metaDescription", "body"
- "title" : 60-70 chars max, contient "${keyword}" en début ou milieu naturel
- "metaTitle" : 55-60 chars max, ${keyword} + USP (ex: "sur mesure", "agréé", "expert local")
- "metaDescription" : 145-160 chars max, contient le keyword + call-to-action implicit
- "body" : conserver la structure markdown existante (#, ##, listes, blockquote CTA \`> **[...](url)**\`)
- Renforcer naturellement le keyword dans H1, H2 et 1er paragraphe
- AJOUTER 1-2 nouvelles sections H2 qui répondent aux intentions de recherche absentes (utilise les snippets concurrents pour t'inspirer)
- NE JAMAIS mentionner "agent IA", "réponse sous 24h", "en X minutes"
- Conserver les liens [text](/discutons?from=seo&...) en l'état
- Ne jamais inventer un client, un chiffre ou un témoignage faux
- Tonalité humaine, pro, sobre. Pas de superlatifs vendeurs ("le meilleur", "incontournable").

Renvoie SEULEMENT le JSON, sans markdown wrapper, sans texte avant/après.`;

  let resp;
  try {
    resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (e) {
    return { ok: false, reason: 'claude_failed', message: String(e.message || e) };
  }

  const text = resp.content?.[0]?.text || '';
  let parsed;
  try {
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = JSON.parse(clean);
  } catch (e) {
    return { ok: false, reason: 'parse_failed', message: String(e.message || e), raw: text.slice(0, 400) };
  }

  if (!parsed.title || !parsed.body) {
    return { ok: false, reason: 'incomplete_response', got: Object.keys(parsed) };
  }

  if (dryRun) return { ok: true, dryRun: true, parsed };

  // Apply changes
  fullPage.title = parsed.title;
  fullPage.metaTitle = parsed.metaTitle || fullPage.metaTitle;
  fullPage.metaDescription = parsed.metaDescription || fullPage.metaDescription;
  fullPage.body = parsed.body;
  if (!fullPage.targetKeyword) fullPage.targetKeyword = keyword;
  fullPage.status = 'draft'; // user doit reviewer avant republish
  await fullPage.save();

  return { ok: true, pageId: fullPage._id, slug: fullPage.slug, newTitle: parsed.title };
}

/**
 * Run l'optimizer pour les N keywords les plus prioritaires.
 * Priorité : keywords avec position 11-30 (quick wins) puis null (pas dans top 10).
 */
export async function runOptimizerBatch({ limit = 10, dryRun = false } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, reason: 'no_api_key' };

  // Quick wins d'abord (pos 11-30), puis page 3+ (pos > 30), puis pas dans top 10
  const prio = await KeywordRanking.aggregate([
    { $match: { active: true } },
    { $addFields: {
      prio: {
        $cond: [
          { $and: [{ $ne: ['$ourPosition', null] }, { $gt: ['$ourPosition', 10] }, { $lte: ['$ourPosition', 30] }] }, 1,
          { $cond: [{ $and: [{ $ne: ['$ourPosition', null] }, { $gt: ['$ourPosition', 30] }] }, 2,
            { $cond: [{ $eq: ['$ourPosition', null] }, 3, 4] }
          ] }
        ]
      }
    } },
    { $sort: { prio: 1, ourPosition: 1 } },
    { $limit: limit },
  ]);

  const results = [];
  for (const r of prio) {
    if (!r.top10 || r.top10.length === 0) {
      results.push({ keyword: r.keyword, ok: false, reason: 'no_serp_data' });
      continue;
    }
    const page = await findMatchingPage(r.keyword, r.market === 'fr' || r.market === 'mc' ? 'fr' : 'en');
    if (!page) {
      results.push({ keyword: r.keyword, ok: false, reason: 'no_matching_page' });
      continue;
    }
    const res = await optimizePage({
      keyword: r.keyword,
      market: r.market,
      page,
      competitorsTop3: r.top10.slice(0, 3),
      dryRun,
    });
    results.push({ keyword: r.keyword, page: page.slug, score: page.score, ...res });
  }

  return { ok: true, count: results.length, results };
}

export { findMatchingPage, optimizePage };
