// Genere 15 articles SEO informationnels sur les keywords FR a fort volume
// (intent commercial). Articles 2500-3500 mots, structure premium, FAQ, CTA.
//
// Usage : node server/scripts/seo-generate-articles.mjs [--limit 15] [--dry]
// @author Rabah Ziane - 2026-05-19

import mongoose from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import SeoContent from '../models/SeoContent.js';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const LIMIT = parseInt(arg('limit', '15'), 10);
const DRY = argv.includes('--dry');
const MODEL = process.env.SEO_OPTIMIZER_MODEL || 'claude-opus-4-7';

const TOPICS = [
  { kw: 'créer un site internet professionnel', slug: 'creer-site-internet-professionnel', angle: 'guide complet 2026, etapes, choix techno' },
  { kw: 'combien coûte un site internet', slug: 'combien-coute-site-internet', angle: 'fourchettes par type, ce qui influence le prix, sans donner de chiffre fixe' },
  { kw: 'développeur web freelance ou agence', slug: 'developpeur-web-freelance-ou-agence', angle: 'comparaison avantages risques selon projet' },
  { kw: 'comment choisir une agence web', slug: 'comment-choisir-agence-web', angle: 'checklist 12 criteres pour eviter les pieges' },
  { kw: 'créer une application mobile', slug: 'creer-application-mobile-guide', angle: 'etapes natif vs cross-platform, choix de stack' },
  { kw: 'combien coûte une application mobile', slug: 'combien-coute-application-mobile', angle: 'facteurs cout, fourchettes par complexite, sans chiffre fixe' },
  { kw: 'créer un SaaS', slug: 'creer-saas-guide-fondateur', angle: 'guide fondateur, etapes MVP, stack, scaling' },
  { kw: 'développer un MVP', slug: 'developper-mvp-startup', angle: 'methodologie lean, scope, delais, eviter pieges' },
  { kw: 'CRM sur mesure ou pret a l\'emploi', slug: 'crm-sur-mesure-vs-saas', angle: 'comparaison avantages, criteres choix selon entreprise' },
  { kw: 'ERP sur mesure pour PME', slug: 'erp-sur-mesure-pme', angle: 'guide ERP custom vs SAP, integrations, ROI' },
  { kw: 'intégrer ChatGPT dans son entreprise', slug: 'integrer-chatgpt-entreprise', angle: 'cas d\'usage, API Claude/GPT, securite donnees, ROI' },
  { kw: 'créer un agent IA pour son entreprise', slug: 'creer-agent-ia-entreprise', angle: 'types d\'agents, frameworks, integration outils existants' },
  { kw: 'automatisation IA des processus métier', slug: 'automatisation-ia-processus-metier', angle: 'workflows automatisables, ROI, outils, exemples' },
  { kw: 'migration cloud AWS pour PME', slug: 'migration-cloud-aws-pme', angle: 'etapes migration, couts, securite, IaC' },
  { kw: 'DevOps pour PME France', slug: 'devops-pme-france', angle: 'CI/CD, monitoring, infrastructure managee, equipe interne ou agence' },
];

if (!process.env.ANTHROPIC_API_KEY) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1); }
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = (t) => `Tu es un redacteur tech senior + expert SEO. Tu vas ecrire un article informationnel premium en francais sur "${t.kw}".

## Contexte
Angle : ${t.angle}
Audience : dirigeants TPE/PME, CTOs, startup founders en France et francophone
But : etre l'article reference #1 sur Google pour ce mot-cle. Apporter une VRAIE valeur (pas un texte SEO creux).
Editeur : DELIVERY Digital - agence de developpement web/mobile/IA basee a Nice, certifiee CII (20 % rembourses).

## STRUCTURE
1. H1 60-65 chars contenant "${t.kw}" en debut
2. Intro 3-4 phrases : hook + promesse de valeur + qui devrait lire
3. CTA blockquote : \`> **[Décrivez votre projet à notre équipe](https://deliverydigital.fr/discutons?from=seo&source=article&topic=${t.slug})**.\`
4. 8-12 sections H2 avec sous-decoupage H3 quand utile
5. 1 tableau markdown (comparaison ou checklist)
6. 1 process numerote (4-6 etapes)
7. FAQ \`## Questions frequentes\` : 6-8 paires \`### Question ?\` + reponse 60-100 mots
8. Conclusion + CTA final vers /discutons
9. Total : 2800-3500 mots

## QUALITE
- Tonalite expert + sobre. Pas de superlatifs ("incontournable", "le meilleur", "rare")
- Donner des exemples concrets, scenarios, frameworks
- Inclure pourcentages/delais realistes (ex: "8 semaines pour un MVP", "20 % de remboursement via CII")
- PAS DE PRIX, PAS DE TARIFS, PAS DE CHIFFRES MONETAIRES
- Phrases varies, vocabulaire technique precis avec explications
- Ecrire pour quelqu'un qui veut comprendre, pas qu'on lui vende

## INTERDICTIONS
- Pas de "agent IA", "AI agent", "notre agent IA"
- Pas de "en remote", "remote-first", "a distance"
- Pas de em-dash "—" (utiliser tiret court)
- Pas de claims inventes (clients fictifs, certifications absentes)
- Pas de "garantie 100 %", "delais magiques", "ROI immediat"

## SORTIE JSON STRICT (sans wrapper markdown) :
{
  "title": "..." (60-65 chars),
  "metaTitle": "..." (55-60 chars contient "${t.kw}"),
  "metaDescription": "..." (145-160 chars),
  "body": "..." (markdown complet, 2800-3500 mots)
}

Sortie : SEULEMENT le JSON. Pas de \`\`\`json wrapper.`;

async function generateArticle(topic) {
  console.log(`[gen] "${topic.kw}" -> ${topic.slug}`);
  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages: [{ role: 'user', content: PROMPT(topic) }],
  });
  const text = resp.content?.[0]?.text || '';
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(clean);
}

async function pingIndexNow(urls) {
  if (!process.env.INDEXNOW_KEY || urls.length === 0) return;
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: 'deliverydigital.fr', key: process.env.INDEXNOW_KEY, keyLocation: `https://deliverydigital.fr/${process.env.INDEXNOW_KEY}.txt`, urlList: urls }),
    });
    console.log(`  IndexNow ${urls.length} URLs: ${r.status}`);
  } catch (e) { console.log(`  IndexNow err: ${e.message}`); }
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const toProcess = TOPICS.slice(0, LIMIT);
  const created = [];
  for (const topic of toProcess) {
    const existing = await SeoContent.findOne({ slug: topic.slug });
    if (existing && existing.status === 'published' && existing.body.length > 5000) {
      console.log(`  ↻ deja en place, skip ${topic.slug}`);
      continue;
    }
    try {
      const parsed = await generateArticle(topic);
      if (!parsed.title || !parsed.body) { console.log(`  ✗ incomplete: ${topic.slug}`); continue; }
      console.log(`  ${parsed.body.length} chars (~${Math.round(parsed.body.split(/\s+/).length)} mots)`);
      if (DRY) { console.log('  (dry)'); continue; }
      const doc = existing || new SeoContent({ slug: topic.slug, type: 'article', status: 'published', lang: 'fr', country: 'FR' });
      doc.title = parsed.title;
      doc.metaTitle = parsed.metaTitle;
      doc.metaDescription = parsed.metaDescription;
      doc.body = parsed.body;
      doc.targetKeyword = topic.kw;
      doc.status = 'published';
      doc.publishedAt = doc.publishedAt || new Date();
      doc.generationModel = MODEL;
      doc.createdBy = 'seo-agent-articles-batch';
      await doc.save();
      console.log(`  ✓ saved ${topic.slug}`);
      created.push(`https://deliverydigital.fr/blog/${topic.slug}`);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.log(`  ✗ ${topic.slug}: ${e.message.slice(0, 100)}`);
    }
  }
  await pingIndexNow(created);
  console.log(`\n[done] ${created.length} articles publies + IndexNow ping`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
