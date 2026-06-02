// Rewriting premium d'une page SEO pour viser le Top 1.
// Cible : 2800-3500 mots, structure H2 + H3, FAQ 6-8 Q/R, tableau de prix indicatif,
// process visualise, vraie expertise technique (frameworks, comparaisons).
//
// Usage : node server/scripts/seo-rewrite-premium.mjs --slug agence-web-paris [--publish]
// @author Rabah Ziane - 2026-05-19

import mongoose from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import SeoContent from '../models/SeoContent.js';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const SLUG = arg('slug', null);
const PUBLISH = argv.includes('--publish');
const MODEL = process.env.SEO_OPTIMIZER_MODEL || 'claude-opus-4-7';

if (!SLUG) { console.error('Missing --slug'); process.exit(1); }
if (!process.env.ANTHROPIC_API_KEY) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1); }

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT_TEMPLATE = (page, kw) => `Tu es un expert SEO + redacteur technique senior. Tu vas reecrire cette page pour qu'elle batte les 3 meilleurs concurrents francais sur le mot-cle "${kw}" et passe en position #1 sur Google.

## Page actuelle
**Title** : ${page.title}
**MetaTitle** : ${page.metaTitle}
**MetaDescription** : ${page.metaDescription}
**Body actuel (markdown, ${page.body.length} chars)** :
${page.body}

## OBJECTIF QUALITE (sans concession)
Le contenu doit etre **exceptionnellement utile** pour un dirigeant ou tech lead PME qui hesite a choisir une agence. Pas un texte marketing creux.

## STRUCTURE OBLIGATOIRE

1. **H1** : ${kw} en debut, USP punchy en fin (60-65 chars)
2. **Intro 2-3 phrases** : reformule l'intention de recherche + promesse de valeur unique
3. **CTA buttoned visible** : \`> **[Décrivez votre projet](https://deliverydigital.fr/discutons?from=seo&...)**.\` (juste le bouton, AUCUNE phrase apres type "echange structure" / "reponse sous 24h" / "ouvrees")
4. **8-10 sections H2** avec contenu substantiel (250-400 mots chacune)
5. **Au moins 4 sections H3** (sous-decoupage logique)
6. **1 tableau markdown** : comparaison de stack OU phases projet OU livrables (utiliser syntax \`| col |\`). PAS DE PRIX.
7. **1 process visualise** : 4-6 etapes numerotees clair
8. **FAQ section** \`## Questions frequentes\` avec 6-8 paires \`### Question ?\` + reponse paragraphe 60-100 mots
9. **CTA secondaire** en milieu de page
10. **Total : 2800-3500 mots**

## QUALITE ECRITURE

- Tonalite **expert + sobre** : pas de superlatifs ("incontournable", "leader", "unique"), pas de marketing creux
- Phrases courtes a moyennes, varier les longueurs
- Vocabulaire technique precis quand pertinent (mais expliquer si necessaire)
- Eviter le "nous" exagere : utiliser "vous", "le projet", "votre equipe"
- Donner des **exemples concrets** : "par exemple, pour un SaaS B2B...", "dans une refonte recente..."
- Inclure des **chiffres realistes** : delais (8 semaines), pourcentages CII (20 %), volumes (50+ projets livres). PAS DE PRIX, PAS DE TARIFS.

## INTERDICTIONS

- Pas de "agent IA" / "AI agent" / "notre agent IA"
- Pas de "en remote" / "remote-first" / "à distance"
- Pas de em-dash "—" (utiliser tiret court "-")
- Pas de claims inventes (clients fictifs, certifications absentes)
- Pas de promesses irrealistes (delais magiques, "100 % garanti")
- Pas de phrases comme "le meilleur", "incontournable", "rare sur le marche"
- Pas de "echange structure", "reponse sous 24 h", "heures ouvrees", "premier echange"

## ELEMENTS A CONSERVER

- Certifications reelles : Certifie CII (20 % rembourses, plafond 400 k€ depenses/an)
- Stack reel : React, Next.js, TypeScript, Node.js, PostgreSQL, AWS
- Tous les liens existants vers /discutons (avec leurs query params)
- La structure markdown deja existante en partie

## SORTIE

JSON strict, exactement 4 cles :
{
  "title": "..." (60-65 chars, contient "${kw}"),
  "metaTitle": "..." (55-60 chars, contient "${kw}"),
  "metaDescription": "..." (145-160 chars, contient "${kw}" + CTA implicit),
  "body": "..." (markdown complet, 2800-3500 mots, sans markdown wrapper triple-quote)
}

Sortie : SEULEMENT le JSON, sans rien autour. Pas de \`\`\`json wrapper.`;

async function rewrite(page, targetKw) {
  console.log(`[rewrite] ${page.slug} | kw="${targetKw}" | model=${MODEL}`);
  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages: [{ role: 'user', content: PROMPT_TEMPLATE(page, targetKw) }],
  });
  const text = resp.content?.[0]?.text || '';
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(clean);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const page = await SeoContent.findOne({ slug: SLUG, status: 'published' });
  if (!page) throw new Error(`Page ${SLUG} introuvable`);

  const kw = page.targetKeyword || page.metaTitle?.split(' - ')[0] || page.title;
  const parsed = await rewrite(page, kw);

  if (!parsed.title || !parsed.body) throw new Error('Incomplete response');

  console.log(`\n--- NEW TITLE ---\n${parsed.title}`);
  console.log(`\n--- NEW META TITLE ---\n${parsed.metaTitle}`);
  console.log(`\n--- NEW META DESC ---\n${parsed.metaDescription}`);
  console.log(`\n--- NEW BODY (${parsed.body.length} chars, ~${Math.round(parsed.body.split(/\s+/).length)} mots) ---`);
  console.log(parsed.body.slice(0, 800), '...\n[truncated]');

  if (PUBLISH) {
    page.title = parsed.title;
    page.metaTitle = parsed.metaTitle;
    page.metaDescription = parsed.metaDescription;
    page.body = parsed.body;
    page.status = 'published';
    await page.save();
    console.log(`\n✓ PUBLISHED ${page.slug}`);
    // ping IndexNow
    if (process.env.INDEXNOW_KEY) {
      const url = `https://deliverydigital.fr/services/${page.slug}`;
      const r = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: 'deliverydigital.fr', key: process.env.INDEXNOW_KEY, keyLocation: `https://deliverydigital.fr/${process.env.INDEXNOW_KEY}.txt`, urlList: [url] }),
      });
      console.log(`✓ IndexNow ping: ${r.status}`);
    }
  } else {
    console.log('\n(dry run - utiliser --publish pour appliquer)');
  }
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
