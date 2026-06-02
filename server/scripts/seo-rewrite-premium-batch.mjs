// Batch : reecrit en premium les 56 pages city-service deja optimisees en titre.
// Cities : Paris, Lyon, Marseille, Toulouse, Nice, Bordeaux, Nantes, Strasbourg.
// Services : agence-web, developpement-web, developpement-application-mobile,
// intelligence-artificielle, developpement-saas, logiciel-sur-mesure, cloud-devops.
//
// @author Rabah Ziane - 2026-05-19

import mongoose from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import SeoContent from '../models/SeoContent.js';

const MODEL = process.env.SEO_OPTIMIZER_MODEL || 'claude-opus-4-7';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CITIES = ['paris', 'lyon', 'marseille', 'toulouse', 'nice', 'bordeaux', 'nantes', 'strasbourg'];
const SERVICES = [
  'agence-web', 'developpement-web', 'developpement-application-mobile',
  'intelligence-artificielle', 'developpement-saas', 'logiciel-sur-mesure', 'cloud-devops',
];

const PROMPT = (page, kw) => `Tu es expert SEO + redacteur tech senior. Reecris cette page pour la placer #1 sur "${kw}".

## Page actuelle
**Title** : ${page.title}
**MetaTitle** : ${page.metaTitle}
**MetaDesc** : ${page.metaDescription}
**Body** :
${page.body}

## STRUCTURE
1. H1 60-65 chars avec "${kw}" en debut
2. Intro 2-3 phrases : intention de recherche + promesse de valeur
3. CTA blockquote : \`> **[Décrivez votre projet](https://deliverydigital.fr/discutons?from=seo&source=hero)**.\` (JUSTE le bouton, aucune phrase apres)
4. 8-10 H2 (250-400 mots chacune), 4+ H3
5. 1 tableau markdown (comparaison stack OU phases OU livrables). PAS DE PRIX.
6. 1 process numerote 4-6 etapes
7. ## Questions frequentes avec 6-8 \`### Q ?\` + reponse 60-100 mots
8. CTA secondaire en milieu
9. Total : 2800-3500 mots

## QUALITE
- Expert + sobre. Pas de superlatifs, pas de marketing creux
- Exemples concrets, chiffres realistes (8 sem MVP, 20 % CII)
- PAS DE PRIX, PAS DE TARIFS
- "vous" plus que "nous"

## INTERDITS
- "agent IA", "AI agent", "notre agent IA"
- "en remote", "remote-first", "a distance"
- em-dash "—" (utiliser tiret court)
- "echange structure", "reponse sous 24 h", "heures ouvrees"
- "garantie 100 %", "delais magiques", "le meilleur", "incontournable", "rare"
- claims inventes

## CONSERVER
- Certif CII (20 %, plafond 400 k€ depenses/an)
- Stack : React, Next.js, TS, Node, PostgreSQL, AWS
- Tous liens /discutons existants

## SORTIE JSON
{
  "title": "..." (60-65 chars),
  "metaTitle": "..." (55-60 chars),
  "metaDescription": "..." (145-160 chars),
  "body": "..." (markdown, 2800-3500 mots)
}

SEULEMENT le JSON, sans wrapper.`;

async function rewrite(page, kw) {
  const resp = await anthropic.messages.create({ model: MODEL, max_tokens: 16000, messages: [{ role: 'user', content: PROMPT(page, kw) }] });
  const text = resp.content?.[0]?.text || '';
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(clean);
}

async function pingIndexNowBatch(urls) {
  if (!process.env.INDEXNOW_KEY || urls.length === 0) return;
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: 'deliverydigital.fr', key: process.env.INDEXNOW_KEY, keyLocation: `https://deliverydigital.fr/${process.env.INDEXNOW_KEY}.txt`, urlList: urls }),
    });
    console.log(`[ping] IndexNow ${urls.length} URLs: ${r.status}`);
  } catch (e) { console.log(`[ping] ${e.message}`); }
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[batch] starting');

  const updated = [];
  let count = 0;
  for (const city of CITIES) {
    for (const service of SERVICES) {
      const slug = `${service}-${city}`;
      const page = await SeoContent.findOne({ slug, status: 'published' });
      if (!page) { console.log(`  ~ ${slug} (no page)`); continue; }
      if (page.body.length > 12000 && page.createdBy === 'seo-agent-rewrite-premium-batch') {
        console.log(`  ↻ ${slug} deja en premium, skip`);
        continue;
      }
      const kw = page.targetKeyword || page.metaTitle?.split(' - ')[0] || `${service.replace(/-/g, ' ')} ${city}`;
      count++;
      try {
        const parsed = await rewrite(page, kw);
        if (!parsed.title || !parsed.body) { console.log(`  ✗ ${slug}: incomplete`); continue; }
        page.title = parsed.title;
        page.metaTitle = parsed.metaTitle;
        page.metaDescription = parsed.metaDescription;
        page.body = parsed.body;
        page.targetKeyword = kw;
        page.status = 'published';
        page.createdBy = 'seo-agent-rewrite-premium-batch';
        page.generationModel = MODEL;
        await page.save();
        updated.push(`https://deliverydigital.fr/services/${slug}`);
        console.log(`  ✓ ${slug} (${parsed.body.length} chars, ~${Math.round(parsed.body.split(/\s+/).length)} mots)`);
        // ping by batch of 20
        if (updated.length % 20 === 0) await pingIndexNowBatch(updated.slice(-20));
        await new Promise((r) => setTimeout(r, 1200));
      } catch (e) {
        console.log(`  ✗ ${slug}: ${e.message.slice(0, 120)}`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
  // final ping pour les restants
  const remaining = updated.length % 20;
  if (remaining > 0) await pingIndexNowBatch(updated.slice(-remaining));
  console.log(`\n[done] ${updated.length}/${count} pages reecrites`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
