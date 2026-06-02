// Optim SEO : met a jour title + metaTitle des 20 pages strategiques
// pour inclure "agence" + "developpement" + ville. Capte 2 vocabulaires de recherche.
// @author Rabah Ziane - 2026-05-19

import mongoose from 'mongoose';
import SeoContent from '../models/SeoContent.js';

const CITIES = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Bordeaux', 'Nantes', 'Strasbourg'];

// Pour chaque slug pattern, le nouveau title qui combine 2 vocabulaires
function buildTitles(slug, city) {
  const C = city; // Capitalized city name
  if (slug.startsWith('agence-web-') || slug.startsWith('developpement-web-')) {
    return {
      title: `Agence digitale & développement web ${C} - DELIVERY Digital`,
      metaTitle: `Agence digitale ${C} - Développement web sur mesure`,
      metaDescription: `Agence digitale et développement web à ${C}. Sites, SaaS, applications mobiles sur mesure. Stack moderne, code maintenable, certifié CII (20 % remboursés).`,
    };
  }
  if (slug.startsWith('developpement-application-mobile-') || slug.startsWith('agence-mobile-')) {
    return {
      title: `Agence application mobile ${C} - Développement iOS Android sur mesure`,
      metaTitle: `Agence app mobile ${C} - Développement iOS Android`,
      metaDescription: `Agence application mobile à ${C}. Développement iOS, Android et React Native. Équipe senior, livraison rapide. Discutons de votre projet.`,
    };
  }
  if (slug.startsWith('intelligence-artificielle-') || slug.startsWith('developpement-ia-')) {
    return {
      title: `Agence IA ${C} - Intelligence artificielle pour entreprises`,
      metaTitle: `Agence IA ${C} - Intelligence artificielle entreprises`,
      metaDescription: `Agence IA à ${C} : intégration intelligence artificielle dans vos outils métier. Claude, GPT, RAG, automatisation. ROI mesurable.`,
    };
  }
  if (slug.startsWith('developpement-saas-') || slug.startsWith('agence-saas-')) {
    return {
      title: `Agence SaaS ${C} - Développement plateformes B2B sur mesure`,
      metaTitle: `Agence SaaS ${C} - Plateformes B2B sur mesure`,
      metaDescription: `Agence SaaS à ${C} : développement de plateformes B2B et B2C. Stack React, Next.js, Node, AWS. MVP en 8 semaines.`,
    };
  }
  if (slug.startsWith('logiciel-sur-mesure-') || slug.startsWith('developpement-erp-') || slug.startsWith('developpement-crm-')) {
    return {
      title: `Logiciel sur mesure ${C} - Agence ERP CRM B2B`,
      metaTitle: `Logiciel sur mesure ${C} - Agence ERP & CRM`,
      metaDescription: `Logiciel sur mesure à ${C} : ERP, CRM, plateformes B2B. Automatisation de vos process métier. Équipe senior.`,
    };
  }
  if (slug.startsWith('cloud-devops-')) {
    return {
      title: `Agence Cloud & DevOps ${C} - AWS infrastructure managée`,
      metaTitle: `Agence Cloud DevOps ${C} - AWS infrastructure`,
      metaDescription: `Agence Cloud et DevOps à ${C}. AWS, infrastructure as code, CI/CD, monitoring. Hébergement scalable pour vos applications.`,
    };
  }
  return null;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[opt] connected');

  const SLUG_PREFIXES = [
    'agence-web-', 'developpement-web-',
    'developpement-application-mobile-', 'agence-mobile-',
    'intelligence-artificielle-', 'developpement-ia-',
    'developpement-saas-', 'agence-saas-',
    'logiciel-sur-mesure-', 'developpement-erp-', 'developpement-crm-',
    'cloud-devops-',
  ];

  let updated = 0;
  for (const city of CITIES) {
    const cityKebab = city.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
    for (const prefix of SLUG_PREFIXES) {
      const slug = `${prefix}${cityKebab}`;
      const page = await SeoContent.findOne({ slug, status: 'published' });
      if (!page) continue;
      const newTitles = buildTitles(slug, city);
      if (!newTitles) continue;
      page.title = newTitles.title;
      page.metaTitle = newTitles.metaTitle;
      page.metaDescription = newTitles.metaDescription;
      await page.save();
      console.log(`  ✓ ${slug} -> "${newTitles.metaTitle}"`);
      updated++;
    }
  }

  console.log(`\n[opt] ${updated} pages mises a jour`);

  // Ping IndexNow batch
  const updatedSlugs = [];
  for (const city of CITIES) {
    const cityKebab = city.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
    for (const prefix of SLUG_PREFIXES) {
      const slug = `${prefix}${cityKebab}`;
      const exists = await SeoContent.findOne({ slug, status: 'published' }, { slug: 1 }).lean();
      if (exists) updatedSlugs.push(slug);
    }
  }
  console.log(`[ping] ${updatedSlugs.length} URLs a pinger`);
  if (updatedSlugs.length > 0 && process.env.INDEXNOW_KEY) {
    const urls = updatedSlugs.map((s) => `https://deliverydigital.fr/services/${s}`);
    try {
      const r = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: 'deliverydigital.fr',
          key: process.env.INDEXNOW_KEY,
          keyLocation: `https://deliverydigital.fr/${process.env.INDEXNOW_KEY}.txt`,
          urlList: urls,
        }),
      });
      console.log(`[ping] IndexNow status: ${r.status}`);
    } catch (e) {
      console.log(`[ping] IndexNow error: ${e.message}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
