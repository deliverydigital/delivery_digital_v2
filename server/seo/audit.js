/**
 * Audit deterministe (zero LLM) des pages SEO publiees.
 * Produit une liste de "suggestions" stockee dans le document SeoContent
 * via le champ generationPrompt (append) - n'ecrase JAMAIS body/title/meta.
 *
 * Rules :
 *  - metaTitle entre 30 et 60 caracteres
 *  - metaDescription entre 120 et 160 caracteres
 *  - body >= 500 mots (seuil Gulf small-city)
 *  - body contient au moins 1 lien vers /discutons
 *  - body contient au moins 2 H2 (sections)
 *  - jsonLd present et bien forme (LocalBusiness ou Article)
 *
 * @author Rabah Ziane - 2026-05-13
 */

function wordCount(s) {
  return (s || '').trim().split(/\s+/).filter(Boolean).length;
}

export function auditPage(page) {
  const issues = [];
  const warnings = [];

  // metaTitle
  if (!page.metaTitle) issues.push('metaTitle missing');
  else if (page.metaTitle.length < 30) warnings.push(`metaTitle short (${page.metaTitle.length}c < 30)`);
  else if (page.metaTitle.length > 60) warnings.push(`metaTitle long (${page.metaTitle.length}c > 60)`);

  // metaDescription
  if (!page.metaDescription) issues.push('metaDescription missing');
  else if (page.metaDescription.length < 120) warnings.push(`metaDescription short (${page.metaDescription.length}c < 120)`);
  else if (page.metaDescription.length > 160) warnings.push(`metaDescription long (${page.metaDescription.length}c > 160)`);

  // body length
  const wc = wordCount(page.body);
  if (wc < 300) issues.push(`body too short (${wc} words < 300)`);
  else if (wc < 500) warnings.push(`body lean (${wc} words, target >= 500 for ranking)`);

  // CTA
  const hasCta = /\/discutons/i.test(page.body || '');
  if (!hasCta) issues.push('no /discutons CTA in body');
  else {
    const ctaCount = (page.body.match(/\/discutons/g) || []).length;
    if (ctaCount < 2) warnings.push(`only ${ctaCount} CTA(s) - aim for 3+`);
  }

  // Sections
  const h2Count = (page.body.match(/^## /gm) || []).length;
  if (h2Count < 2) warnings.push(`only ${h2Count} H2 section(s)`);

  // Schema.org
  if (!page.jsonLd || typeof page.jsonLd !== 'object') warnings.push('jsonLd missing');

  return {
    slug: page.slug,
    type: page.type,
    score: Math.max(0, 100 - issues.length * 20 - warnings.length * 5),
    issues,
    warnings,
    wordCount: wc,
    auditedAt: new Date().toISOString(),
  };
}

export async function auditAllPublished(SeoContent) {
  const pages = await SeoContent.find({ status: 'published' }).lean();
  const results = pages.map(auditPage);
  const summary = {
    total: results.length,
    avgScore: results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0,
    withIssues: results.filter((r) => r.issues.length > 0).length,
    withWarnings: results.filter((r) => r.warnings.length > 0).length,
  };
  return { summary, results };
}
