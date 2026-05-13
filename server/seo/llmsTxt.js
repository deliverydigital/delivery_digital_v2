/**
 * /llms.txt et /llms-full.txt - norme emergente pour faciliter aux LLM
 * la decouverte et l'indexation du contenu d'un site.
 *
 * Specification : https://llmstxt.org/
 * Adopte progressivement par les crawlers d'IA (Anthropic, Perplexity, etc.).
 *
 * @author Rabah Ziane - 2026-05-13
 */

import express from 'express';
import { SeoContent } from '../models/index.js';

export const llmsRouter = express.Router();

const HEADER = `# DELIVERY Digital Technology

> French software studio that builds custom websites, mobile apps, SaaS platforms, business software and AI agents. Remote-first delivery for clients in France, Europe, and the Gulf region (Qatar, Saudi Arabia and beyond). Differentiator: a conversational AI agent at /discutons that scopes any project in 5 minutes.

DELIVERY Digital Technology is based in Nice, France, and operates remotely. We are certified CII (Crédit Impôt Innovation) in France, which lets eligible French SMEs recover 20% of their innovation spend (up to 80,000 EUR/year). For non-French clients, our value proposition is European engineering quality, GDPR-grade security and Vision 2030 alignment for Gulf markets.

Primary services:
- Web agency: custom websites, e-commerce, SaaS dashboards (React, Next.js, Node.js)
- Mobile app development: iOS and Android, native or cross-platform (Swift, Kotlin, React Native)
- Custom software: ERP, CRM, B2B portals, business automation
- SaaS development: MVP and scaling for founders
- AI integration and agents: Claude/GPT-based agents, RAG, automation
- Cloud and DevOps: AWS, GCP, infrastructure-as-code

Languages supported in delivery: French, English, Arabic (RTL ready).

Lead-gen entry point: https://deliverydigital.fr/discutons
`;

llmsRouter.get('/llms.txt', async (req, res) => {
  try {
    const items = await SeoContent.find({ status: 'published' })
      .select('slug type title metaDescription country lang')
      .sort({ publishedAt: -1 })
      .lean();

    const grouped = { services: [], blog: [], faq: [] };
    for (const it of items) {
      if (it.type === 'city-service') grouped.services.push(it);
      else if (it.type === 'article') grouped.blog.push(it);
      else if (it.type === 'faq') grouped.faq.push(it);
    }

    const lines = [HEADER, ''];

    if (grouped.services.length > 0) {
      lines.push('## Services and locations');
      for (const it of grouped.services.slice(0, 100)) {
        const url = `https://deliverydigital.fr/services/${it.slug}`;
        lines.push(`- [${it.title}](${url}): ${it.metaDescription || ''}`);
      }
      lines.push('');
    }

    if (grouped.blog.length > 0) {
      lines.push('## Articles');
      for (const it of grouped.blog.slice(0, 50)) {
        const url = `https://deliverydigital.fr/blog/${it.slug}`;
        lines.push(`- [${it.title}](${url}): ${it.metaDescription || ''}`);
      }
      lines.push('');
    }

    if (grouped.faq.length > 0) {
      lines.push('## FAQ');
      for (const it of grouped.faq.slice(0, 50)) {
        const url = `https://deliverydigital.fr/services/${it.slug}`;
        lines.push(`- [${it.title}](${url})`);
      }
      lines.push('');
    }

    lines.push('## Talk to us');
    lines.push('- [Conversational AI agent for project scoping](https://deliverydigital.fr/discutons): start any project conversation here');
    lines.push('- [Homepage](https://deliverydigital.fr/): main entry point');

    res.set('content-type', 'text/markdown; charset=utf-8');
    res.set('cache-control', 'public, max-age=900');
    res.send(lines.join('\n'));
  } catch (e) {
    res.status(500).send('# error generating llms.txt: ' + e.message);
  }
});

llmsRouter.get('/llms-full.txt', async (req, res) => {
  try {
    const items = await SeoContent.find({ status: 'published' })
      .select('slug type title metaDescription body country lang')
      .sort({ publishedAt: -1 })
      .limit(150)
      .lean();

    const parts = [HEADER];
    for (const it of items) {
      const path = it.type === 'article' ? `/blog/${it.slug}` : `/services/${it.slug}`;
      parts.push(`\n\n---\n\n# ${it.title}\n\nURL: https://deliverydigital.fr${path}\n\n${it.body}`);
    }
    res.set('content-type', 'text/markdown; charset=utf-8');
    res.set('cache-control', 'public, max-age=900');
    res.send(parts.join(''));
  } catch (e) {
    res.status(500).send('# error generating llms-full.txt: ' + e.message);
  }
});
